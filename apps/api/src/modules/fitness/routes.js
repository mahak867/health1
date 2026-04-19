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
    // open a direct channel to each. Full in-app messaging is a future module.
    const result = await query(
      `SELECT u.id, u.full_name, u.role, sf.created_at AS followed_at
       FROM social_follows sf
       JOIN users u ON u.id = sf.following_id
       WHERE sf.follower_id = $1 AND u.role = 'trainer'`,
      [req.user.sub]
    );

    return res.json({
      trainers: result.rows,
      note: 'Real-time trainer messaging is delivered over WebSocket channel "trainer_chat".'
    });
  } catch (error) {
    return next(error);
  }
});
