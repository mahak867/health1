import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { getPublisher } from '../../websocket/publisher.js';
import { awardXP, awardBadge, checkAndAwardBadges, incrementChallenge } from '../gamification/routes.js';
import { XP_EVENTS } from '../gamification/service.js';
import { epley1RM } from '../ranking/service.js';

const workoutSchema = z.object({
  title: z.string().min(1),
  durationSeconds: z.number().int().min(0).optional(),
  caloriesBurned: z.number().int().min(0).optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional()
});

const exerciseSchema = z.object({
  muscleGroup: z.string().min(1),
  exerciseName: z.string().min(1),
  sets: z.number().int().min(1).max(100).default(1),
  reps: z.number().int().min(1).max(500).default(1),
  weightKg: z.number().min(0).max(1000).default(0),
  restSeconds: z.number().int().min(0).max(3600).default(0)
});

export const fitnessRouter = Router();

fitnessRouter.get('/workouts', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM workouts WHERE user_id = $1 ORDER BY COALESCE(completed_at, started_at) DESC NULLS LAST LIMIT 100', [req.user.sub]);
    return res.json({ workouts: result.rows });
  } catch (error) {
    return next(error);
  }
});

fitnessRouter.post('/workouts', async (req, res, next) => {
  try {
    const input = workoutSchema.parse(req.body);
    const created = await query(
      `INSERT INTO workouts (user_id, title, duration_seconds, calories_burned, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.sub,
        input.title,
        input.durationSeconds ?? null,
        input.caloriesBurned ?? null,
        input.startedAt ?? null,
        input.completedAt ?? null
      ]
    );

    getPublisher()('fitness', { event: 'workout_created', userId: req.user.sub, workout: created.rows[0] });

    // Award XP for logging a workout + increment challenges (non-blocking)
    Promise.all([
      awardXP(req.user.sub, 'workout_logged', XP_EVENTS.workout_logged),
      incrementChallenge(req.user.sub, 'daily_workout'),
      incrementChallenge(req.user.sub, 'weekly_workouts_3'),
      incrementChallenge(req.user.sub, 'weekly_workouts_5'),
      checkAndAwardBadges(req.user.sub),
    ]).catch(() => {});

    return res.status(201).json({ workout: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

fitnessRouter.get('/workouts/:workoutId/exercises', async (req, res, next) => {
  try {
    const { workoutId } = req.params;
    const ownership = await query('SELECT id FROM workouts WHERE id = $1 AND user_id = $2', [workoutId, req.user.sub]);
    if (ownership.rowCount === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const result = await query('SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY id ASC', [workoutId]);
    return res.json({ exercises: result.rows });
  } catch (error) {
    return next(error);
  }
});

fitnessRouter.post('/workouts/:workoutId/exercises', async (req, res, next) => {
  try {
    const { workoutId } = req.params;
    const input = exerciseSchema.parse(req.body);
    const ownership = await query('SELECT id FROM workouts WHERE id = $1 AND user_id = $2', [workoutId, req.user.sub]);
    if (ownership.rowCount === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const created = await query(
      `INSERT INTO workout_exercises (workout_id, muscle_group, exercise_name, sets, reps, weight_kg, rest_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        workoutId,
        input.muscleGroup,
        input.exerciseName,
        input.sets,
        input.reps,
        input.weightKg,
        input.restSeconds
      ]
    );

    const exercise = created.rows[0];

    // Auto-detect Personal Record (non-blocking)
    let newPR = null;
    if (input.weightKg > 0) {
      const estimated1RM = epley1RM(input.weightKg, input.reps);
      try {
        const prResult = await query(
          `INSERT INTO personal_records
             (user_id, exercise_name, muscle_group, weight_kg, reps, estimated_1rm, achieved_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (user_id, exercise_name)
           DO UPDATE SET
             weight_kg     = EXCLUDED.weight_kg,
             reps          = EXCLUDED.reps,
             estimated_1rm = EXCLUDED.estimated_1rm,
             achieved_at   = NOW()
           WHERE EXCLUDED.estimated_1rm > personal_records.estimated_1rm
           RETURNING *`,
          [req.user.sub, input.exerciseName, input.muscleGroup, input.weightKg, input.reps, estimated1RM]
        );
        if (prResult.rowCount > 0) {
          newPR = prResult.rows[0];
          await awardXP(req.user.sub, 'pr_set', XP_EVENTS.pr_set);
          // Award lift-specific badges
          const name = input.exerciseName.toLowerCase();
          if (input.weightKg >= 100) {
            if (name.includes('bench')) await awardBadge(req.user.sub, 'bench_100kg');
            if (name.includes('squat')) await awardBadge(req.user.sub, 'squat_100kg');
            if (name.includes('deadlift')) await awardBadge(req.user.sub, 'deadlift_100kg');
          }
        }
      } catch (_) { /* PR detection is best-effort */ }
    }

    // Award XP for workout + check challenges (non-blocking, once per workout POST—fire on first exercise)
    Promise.all([
      checkAndAwardBadges(req.user.sub),
    ]).catch(() => {});

    return res.status(201).json({ exercise, newPR });
  } catch (error) {
    return next(error);
  }
});

fitnessRouter.delete('/workouts/:workoutId', async (req, res, next) => {
  try {
    const { workoutId } = req.params;
    const deleted = await query(
      'DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING id',
      [workoutId, req.user.sub]
    );

    if (deleted.rowCount === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

fitnessRouter.get('/ranking', (_req, res) => {
  res.json({ module: 'fitness', message: 'Use /api/v1/ranking/muscle for ranking details.' });
});

// ─── Personal Records ─────────────────────────────────────────────────────────
fitnessRouter.get('/personal-records', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM personal_records WHERE user_id = $1 ORDER BY achieved_at DESC',
      [req.user.sub]
    );
    return res.json({ personalRecords: result.rows });
  } catch (error) {
    return next(error);
  }
});

// ─── Workout Templates ────────────────────────────────────────────────────────
fitnessRouter.get('/templates', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM workout_templates WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.sub]
    );
    return res.json({ templates: result.rows });
  } catch (error) {
    return next(error);
  }
});

fitnessRouter.post('/templates', async (req, res, next) => {
  try {
    const schema = z.object({
      title:     z.string().min(1),
      exercises: z.array(z.object({
        muscleGroup:  z.string().min(1),
        exerciseName: z.string().min(1),
        sets:         z.number().int().min(1).default(3),
        reps:         z.number().int().min(1).default(10),
        weightKg:     z.number().min(0).default(0),
        restSeconds:  z.number().int().min(0).default(60)
      })).default([])
    });
    const input = schema.parse(req.body);
    const created = await query(
      'INSERT INTO workout_templates (user_id, title, exercises) VALUES ($1, $2, $3::jsonb) RETURNING *',
      [req.user.sub, input.title, JSON.stringify(input.exercises)]
    );
    return res.status(201).json({ template: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

fitnessRouter.delete('/templates/:templateId', async (req, res, next) => {
  try {
    const deleted = await query(
      'DELETE FROM workout_templates WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.templateId, req.user.sub]
    );
    if (deleted.rowCount === 0) return res.status(404).json({ error: 'Template not found' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

fitnessRouter.get('/trainer/messages', async (req, res, next) => {
  try {
    // Returns the list of trainers the current user follows, so the client can
    // open a direct channel to each.
    const result = await query(
      `SELECT u.id, u.full_name, u.role, sf.created_at AS followed_at
       FROM social_follows sf
       JOIN users u ON u.id = sf.following_id
       WHERE sf.follower_id = $1 AND u.role = 'trainer'`,
      [req.user.sub]
    );

    return res.json({
      trainers: result.rows,
      note: 'Subscribe to WebSocket channel "trainer_chat:{sorted-pair-key}" and send type:"chat_message" messages.'
    });
  } catch (error) {
    return next(error);
  }
});

fitnessRouter.get('/trainer/messages/:trainerId', async (req, res, next) => {
  try {
    const { trainerId } = req.params;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const before = req.query.before ?? null;

    const result = await query(
      `SELECT id, sender_id, recipient_id, body, sent_at, read_at
       FROM trainer_chat_messages
       WHERE (
         (sender_id = $1 AND recipient_id = $2)
         OR
         (sender_id = $2 AND recipient_id = $1)
       )
       ${before ? 'AND sent_at < $4' : ''}
       ORDER BY sent_at DESC
       LIMIT $3`,
      before
        ? [req.user.sub, trainerId, limit, before]
        : [req.user.sub, trainerId, limit]
    );

    // Mark incoming messages as read
    await query(
      `UPDATE trainer_chat_messages
       SET read_at = NOW()
       WHERE sender_id = $2 AND recipient_id = $1 AND read_at IS NULL`,
      [req.user.sub, trainerId]
    );

    return res.json({ messages: result.rows.reverse() });
  } catch (error) {
    return next(error);
  }
});

// ─── Workout Heatmap ─────────────────────────────────────────────────────────
// Returns daily workout counts for the last 365 days (for calendar heatmap)
fitnessRouter.get('/workouts/heatmap', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         DATE(COALESCE(completed_at, started_at)) AS day,
         COUNT(*) AS count
       FROM workouts
       WHERE user_id = $1
         AND COALESCE(completed_at, started_at) >= NOW() - INTERVAL '365 days'
       GROUP BY day
       ORDER BY day ASC`,
      [req.user.sub]
    );
    return res.json({ heatmap: result.rows });
  } catch (error) {
    return next(error);
  }
});

// ─── Exercise History (for progressive overload hints) ────────────────────────
fitnessRouter.get('/exercises/:exerciseName/history', async (req, res, next) => {
  try {
    const { exerciseName } = req.params;
    const result = await query(
      `SELECT we.exercise_name, we.sets, we.reps, we.weight_kg, we.rest_seconds,
              w.completed_at AS workout_date
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = $1
         AND LOWER(we.exercise_name) = LOWER($2)
       ORDER BY w.completed_at DESC NULLS LAST
       LIMIT 20`,
      [req.user.sub, exerciseName]
    );
    return res.json({ history: result.rows });
  } catch (error) {
    return next(error);
  }
});

// ─── Volume per muscle group (last N weeks) ───────────────────────────────────
fitnessRouter.get('/workouts/volume', async (req, res, next) => {
  try {
    const weeks = Math.min(Number(req.query.weeks ?? 8), 26);
    const result = await query(
      `SELECT
         LOWER(we.muscle_group) AS muscle_group,
         DATE_TRUNC('week', COALESCE(w.completed_at, w.started_at)::timestamptz) AS week_start,
         SUM(we.sets)::int AS total_sets,
         SUM(we.sets * we.reps)::int AS total_reps,
         SUM(we.sets * we.reps * we.weight_kg)::numeric AS total_volume_kg
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = $1
         AND COALESCE(w.completed_at, w.started_at) >= NOW() - ($2 || ' weeks')::interval
       GROUP BY muscle_group, week_start
       ORDER BY week_start, total_sets DESC`,
      [req.user.sub, weeks]
    );
    return res.json({ volume: result.rows });
  } catch (error) {
    return next(error);
  }
});

// ─── Heart Rate Zones ─────────────────────────────────────────────────────────
// Karvonen method: zones based on % of HRR (Heart Rate Reserve)
// Z1 50-60%, Z2 60-70%, Z3 70-80%, Z4 80-90%, Z5 90-100%
fitnessRouter.get('/hr-zones', async (req, res, next) => {
  try {
    const schema = z.object({
      maxHr:     z.coerce.number().int().min(100).max(220).optional(),
      restingHr: z.coerce.number().int().min(20).max(120).optional()
    });
    const { maxHr, restingHr } = schema.parse(req.query);

    // Fall back to age-predicted max HR if not provided (220 - age)
    let maxHrFinal = maxHr;
    if (!maxHrFinal) {
      const profileResult = await query('SELECT age FROM health_profiles WHERE user_id = $1', [req.user.sub]);
      const age = profileResult.rows[0]?.age ?? null;
      maxHrFinal = age ? Math.round(220 - age) : 185; // default for unknown age
    }

    // Get actual resting HR from last 7 days if not provided
    let restingHrFinal = restingHr;
    if (!restingHrFinal) {
      const rhrResult = await query(
        `SELECT MIN(heart_rate) AS min_hr
         FROM vitals
         WHERE user_id = $1 AND heart_rate IS NOT NULL AND recorded_at >= NOW() - INTERVAL '7 days'`,
        [req.user.sub]
      );
      restingHrFinal = rhrResult.rows[0]?.min_hr ?? 60;
    }

    const hrr = maxHrFinal - restingHrFinal; // Heart Rate Reserve

    // Zones using Karvonen HRR method (% HRR + resting HR)
    const zones = [
      { zone: 1, name: 'Recovery',      color: '#94a3b8', low: Math.round(restingHrFinal + hrr * 0.50), high: Math.round(restingHrFinal + hrr * 0.60), description: 'Active recovery, very light' },
      { zone: 2, name: 'Aerobic Base',  color: '#22c55e', low: Math.round(restingHrFinal + hrr * 0.60), high: Math.round(restingHrFinal + hrr * 0.70), description: 'Fat burning, endurance building' },
      { zone: 3, name: 'Tempo',         color: '#f59e0b', low: Math.round(restingHrFinal + hrr * 0.70), high: Math.round(restingHrFinal + hrr * 0.80), description: 'Aerobic capacity, marathon pace' },
      { zone: 4, name: 'Threshold',     color: '#f97316', low: Math.round(restingHrFinal + hrr * 0.80), high: Math.round(restingHrFinal + hrr * 0.90), description: 'Lactate threshold, high intensity' },
      { zone: 5, name: 'VO2Max',        color: '#ef4444', low: Math.round(restingHrFinal + hrr * 0.90), high: maxHrFinal,                               description: 'Maximum effort, sprint' },
    ];

    return res.json({ zones, maxHr: maxHrFinal, restingHr: restingHrFinal, hrr });
  } catch (error) {
    return next(error);
  }
});
