import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { getPublisher } from '../../websocket/publisher.js';
import { calculateNutritionTargets } from './service.js';

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

    getPublisher()('nutrition', { event: 'meal_logged', userId: req.user.sub, meal: created.rows[0] });

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

nutritionRouter.get('/daily-summary', async (req, res, next) => {
  try {
    const schema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    });

    const { date } = schema.parse(req.query);
    const targetDate = date ?? new Date().toISOString().slice(0, 10);

    const [meals, hydration] = await Promise.all([
      query(
        `SELECT
           COUNT(*)               AS meal_count,
           COALESCE(SUM(calories),   0) AS total_calories,
           COALESCE(SUM(protein_g),  0) AS total_protein_g,
           COALESCE(SUM(carbs_g),    0) AS total_carbs_g,
           COALESCE(SUM(fat_g),      0) AS total_fat_g,
           COALESCE(SUM(fiber_g),    0) AS total_fiber_g,
           COALESCE(SUM(sugar_g),    0) AS total_sugar_g,
           COALESCE(SUM(sodium_mg),  0) AS total_sodium_mg
         FROM nutrition_logs
         WHERE user_id = $1
           AND consumed_at::date = $2::date`,
        [req.user.sub, targetDate]
      ),
      query(
        `SELECT COALESCE(SUM(milliliters), 0) AS total_ml, COUNT(*) AS entries
         FROM hydration_logs
         WHERE user_id = $1 AND consumed_at::date = $2::date`,
        [req.user.sub, targetDate]
      )
    ]);

    return res.json({
      date: targetDate,
      nutrition: meals.rows[0],
      hydration: hydration.rows[0]
    });
  } catch (error) {
    return next(error);
  }
});
