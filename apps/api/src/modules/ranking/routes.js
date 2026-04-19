import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { strengthScore, rankForScore } from './service.js';

export const rankingRouter = Router();

rankingRouter.get('/muscle', async (req, res, next) => {
  try {
    const schema = z.object({
      muscleGroup: z.string().default('chest'),
      weightKg: z.coerce.number().min(0).max(1000).default(80),
      reps: z.coerce.number().int().min(1).max(100).default(8),
      workoutsPerWeek: z.coerce.number().min(0).max(14).default(4),
      streakDays: z.coerce.number().int().min(0).default(10),
      volumeProgression: z.coerce.number().min(0).max(1).default(0.5)
    });

    const input = schema.parse(req.query);
    const score = strengthScore(input);
    const rank = rankForScore(score);

    return res.json({
      muscleGroup: input.muscleGroup,
      score,
      rank
    });
  } catch (error) {
    return next(error);
  }
});

rankingRouter.get('/my', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM muscle_rankings WHERE user_id = $1 ORDER BY score DESC',
      [req.user.sub]
    );

    return res.json({ rankings: result.rows });
  } catch (error) {
    return next(error);
  }
});

rankingRouter.post('/my', async (req, res, next) => {
  try {
    const schema = z.object({
      muscleGroup: z.string().min(1),
      weightKg: z.number().min(0),
      reps: z.number().int().min(1),
      workoutsPerWeek: z.number().min(0),
      streakDays: z.number().int().min(0),
      volumeProgression: z.number().min(0).max(1)
    });

    const input = schema.parse(req.body);
    const score = strengthScore(input);
    const rank = rankForScore(score);

    const upserted = await query(
      `INSERT INTO muscle_rankings (user_id, muscle_group, score, tier, consistency_factor, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, muscle_group)
       DO UPDATE SET score = $3, tier = $4, consistency_factor = $5, updated_at = NOW()
       RETURNING *`,
      [req.user.sub, input.muscleGroup, score, rank.current.name, rank.progress / 100]
    );

    return res.json({ ranking: upserted.rows[0], rank });
  } catch (error) {
    return next(error);
  }
});
