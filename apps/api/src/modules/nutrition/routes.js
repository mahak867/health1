import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

const mealSchema = z.object({
  mealType: z.string().min(1),
  mealName: z.string().min(1),
  consumedAt: z.string().datetime(),
  calories: z.number().int().min(0).optional(),
  proteinG: z.number().min(0).optional(),
  carbsG: z.number().min(0).optional(),
  fatG: z.number().min(0).optional(),
  fiberG: z.number().min(0).optional(),
  sugarG: z.number().min(0).optional(),
  sodiumMg: z.number().min(0).optional(),
  micronutrients: z.record(z.any()).optional()
});

const hydrationSchema = z.object({
  consumedAt: z.string().datetime(),
  milliliters: z.number().int().min(1).max(10000)
});

function calculateNutritionTargets({ weightKg, heightCm, age, sex, activityFactor, goalMultiplier = 1 }) {
  const s = sex === 'male' ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + s;
  const tdee = bmr * activityFactor;
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(tdee * goalMultiplier)
  };
}

export const nutritionRouter = Router();

nutritionRouter.get('/meals', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM nutrition_logs WHERE user_id = $1 ORDER BY consumed_at DESC LIMIT 200', [req.user.sub]);
    return res.json({ meals: result.rows });
  } catch (error) {
    return next(error);
  }
});

nutritionRouter.post('/meals', async (req, res, next) => {
  try {
    const input = mealSchema.parse(req.body);
    const created = await query(
      `INSERT INTO nutrition_logs (
         user_id, meal_type, meal_name, consumed_at, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, micronutrients
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
       RETURNING *`,
      [
        req.user.sub,
        input.mealType,
        input.mealName,
        input.consumedAt,
        input.calories ?? null,
        input.proteinG ?? null,
        input.carbsG ?? null,
        input.fatG ?? null,
        input.fiberG ?? null,
        input.sugarG ?? null,
        input.sodiumMg ?? null,
        JSON.stringify(input.micronutrients ?? {})
      ]
    );

    return res.status(201).json({ meal: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

nutritionRouter.get('/hydration', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM hydration_logs WHERE user_id = $1 ORDER BY consumed_at DESC LIMIT 200', [req.user.sub]);
    return res.json({ hydration: result.rows });
  } catch (error) {
    return next(error);
  }
});

nutritionRouter.post('/hydration', async (req, res, next) => {
  try {
    const input = hydrationSchema.parse(req.body);
    const created = await query(
      `INSERT INTO hydration_logs (user_id, consumed_at, milliliters)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.sub, input.consumedAt, input.milliliters]
    );

    return res.status(201).json({ hydration: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

nutritionRouter.get('/calculators', (req, res, next) => {
  try {
    const schema = z.object({
      weightKg: z.coerce.number().min(20).max(500),
      heightCm: z.coerce.number().min(100).max(260),
      age: z.coerce.number().int().min(10).max(120),
      sex: z.enum(['male', 'female']),
      activityFactor: z.coerce.number().min(1.2).max(2.5),
      goalMultiplier: z.coerce.number().min(0.5).max(1.5).default(1)
    });

    const input = schema.parse(req.query);
    const targets = calculateNutritionTargets(input);

    return res.json({ targets });
  } catch (error) {
    return next(error);
  }
});
