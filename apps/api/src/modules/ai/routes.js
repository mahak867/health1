import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { detectRecoveryNeed, nutritionInsight, fitnessProgressInsight } from './service.js';

const recommendationSchema = z.object({
  sleepHours: z.number().min(0).max(24).default(6.5),
  restingHeartRateDelta: z.number().default(2),
  workoutLoad: z.number().min(0).max(1).default(0.6),
  calorieDeficit: z.number().default(0),
  proteinG: z.number().min(0).default(120),
  weightKg: z.number().min(20).max(500).default(75),
  weeklyVolumeChange: z.number().min(0).default(0.1),
  injuryRisk: z.number().min(0).max(1).default(0.2)
});

export const aiRouter = Router();

aiRouter.post('/recommendations', async (req, res, next) => {
  try {
    const input = recommendationSchema.parse(req.body);

    const recovery = detectRecoveryNeed(input);
    const nutrition = nutritionInsight(input);
    const fitness = fitnessProgressInsight(input);

    const result = {
      recovery,
      nutrition,
      fitness,
      allRecommendations: [
        ...recovery.recommendations,
        ...nutrition.recommendations,
        ...fitness.recommendations
      ]
    };

    await query(
      `INSERT INTO recommendation_events (user_id, inputs, result)
       VALUES ($1, $2::jsonb, $3::jsonb)`,
      [req.user.sub, JSON.stringify(input), JSON.stringify(result)]
    ).catch(() => {});

    return res.json({ module: 'ai', insight: result });
  } catch (error) {
    return next(error);
  }
});

aiRouter.get('/history', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM recommendation_events WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 50',
      [req.user.sub]
    );
    return res.json({ history: result.rows });
  } catch (error) {
    return next(error);
  }
});
