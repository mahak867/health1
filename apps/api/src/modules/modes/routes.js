import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { modeTarget } from './service.js';

const modeSchema = z.object({
  mode: z.enum(['cut', 'bulk', 'maintenance', 'recomposition']),
  tdee: z.number().min(500).max(10000),
  weightKg: z.number().min(20).max(500)
});

export const modesRouter = Router();

modesRouter.get('/plans', (req, res, next) => {
  try {
    const schema = z.object({
      mode: z.string().default('maintenance'),
      tdee: z.coerce.number().default(2200),
      weightKg: z.coerce.number().default(70)
    });

    const input = schema.parse(req.query);
    const targets = modeTarget(input);
    return res.json({ targets });
  } catch (error) {
    return next(error);
  }
});

modesRouter.get('/my', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM user_modes WHERE user_id = $1', [req.user.sub]);
    return res.json({ mode: result.rows[0] ?? null });
  } catch (error) {
    return next(error);
  }
});

modesRouter.put('/my', async (req, res, next) => {
  try {
    const input = modeSchema.parse(req.body);
    const targets = modeTarget(input);

    const upserted = await query(
      `INSERT INTO user_modes (user_id, mode, targets, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET mode = $2, targets = $3::jsonb, updated_at = NOW()
       RETURNING *`,
      [req.user.sub, input.mode, JSON.stringify(targets)]
    );

    return res.json({ mode: upserted.rows[0] });
  } catch (error) {
    return next(error);
  }
});
