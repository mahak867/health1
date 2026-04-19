import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

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

    return res.status(201).json({ exercise: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

fitnessRouter.get('/ranking', (_req, res) => {
  res.json({ module: 'fitness', message: 'Use /api/v1/ranking/muscle for ranking details.' });
});

fitnessRouter.get('/trainer/messages', (_req, res) => {
  res.json({ module: 'fitness', message: 'Trainer communication scaffold endpoint ready.' });
});
