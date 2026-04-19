import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { getPublisher } from '../../websocket/publisher.js';
import { calculateNutritionTargets } from './service.js';
import { awardXP, checkAndAwardBadges, incrementChallenge } from '../gamification/routes.js';
import { XP_EVENTS } from '../gamification/service.js';

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

    // Award XP + challenges (non-blocking)
    Promise.all([
      awardXP(req.user.sub, 'meal_logged', XP_EVENTS.meal_logged),
      incrementChallenge(req.user.sub, 'daily_meal'),
      checkAndAwardBadges(req.user.sub),
    ]).catch(() => {});

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

// ─── Food Database (Open Food Facts) ─────────────────────────────────────────
// Proxies to Open Food Facts so the browser never touches a third-party origin.

nutritionRouter.get('/food/search', async (req, res, next) => {
  try {
    const schema = z.object({
      q:        z.string().min(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(10)
    });
    const { q, pageSize } = schema.parse(req.query);

    const url = `https://world.openfoodfacts.org/cgi/search.pl?` +
      `search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=${pageSize}&fields=product_name,brands,nutriments,serving_size,code`;

    const resp = await fetch(url, { headers: { 'User-Agent': 'HealthSphere/1.0' }, signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return res.status(502).json({ error: 'Food database unavailable' });

    const data = await resp.json();
    const products = (data.products ?? []).map(mapProduct);
    return res.json({ products });
  } catch (error) {
    return next(error);
  }
});

nutritionRouter.get('/food/barcode/:barcode', async (req, res, next) => {
  try {
    const { barcode } = req.params;
    if (!/^\d{4,14}$/.test(barcode)) return res.status(400).json({ error: 'Invalid barcode' });

    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=product_name,brands,nutriments,serving_size,code`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'HealthSphere/1.0' }, signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return res.status(502).json({ error: 'Food database unavailable' });

    const data = await resp.json();
    if (data.status === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json({ product: mapProduct(data.product) });
  } catch (error) {
    return next(error);
  }
});

function mapProduct(p) {
  const n = p.nutriments ?? {};
  const per100 = (key) => Number(n[`${key}_100g`] ?? n[key] ?? 0);
  return {
    barcode:     p.code ?? null,
    name:        p.product_name ?? 'Unknown',
    brand:       p.brands ?? null,
    servingSize: p.serving_size ?? '100g',
    per100g: {
      calories:  Math.round(per100('energy-kcal')),
      proteinG:  Number(per100('proteins').toFixed(2)),
      carbsG:    Number(per100('carbohydrates').toFixed(2)),
      fatG:      Number(per100('fat').toFixed(2)),
      fiberG:    Number(per100('fiber').toFixed(2)),
      sugarG:    Number(per100('sugars').toFixed(2)),
      sodiumMg:  Number((per100('sodium') * 1000).toFixed(1))
    }
  };
}

// ─── Recipes ──────────────────────────────────────────────────────────────────
const ingredientSchema = z.object({
  name:        z.string().min(1),
  quantityG:   z.number().min(0),
  calories:    z.number().min(0).default(0),
  proteinG:    z.number().min(0).default(0),
  carbsG:      z.number().min(0).default(0),
  fatG:        z.number().min(0).default(0)
});

const recipeSchema = z.object({
  name:        z.string().min(1),
  ingredients: z.array(ingredientSchema).min(1)
});

nutritionRouter.get('/recipes', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM recipes WHERE user_id = $1 ORDER BY created_at DESC', [req.user.sub]);
    return res.json({ recipes: result.rows });
  } catch (error) {
    return next(error);
  }
});

nutritionRouter.post('/recipes', async (req, res, next) => {
  try {
    const input = recipeSchema.parse(req.body);
    const totals = input.ingredients.reduce((acc, i) => ({
      calories: acc.calories + i.calories,
      proteinG: acc.proteinG + i.proteinG,
      carbsG:   acc.carbsG   + i.carbsG,
      fatG:     acc.fatG     + i.fatG
    }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });

    const created = await query(
      `INSERT INTO recipes (user_id, name, ingredients, total_calories, total_protein_g, total_carbs_g, total_fat_g)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.sub, input.name, JSON.stringify(input.ingredients),
       totals.calories, totals.proteinG, totals.carbsG, totals.fatG]
    );
    return res.status(201).json({ recipe: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

nutritionRouter.delete('/recipes/:recipeId', async (req, res, next) => {
  try {
    const deleted = await query(
      'DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.recipeId, req.user.sub]
    );
    if (deleted.rowCount === 0) return res.status(404).json({ error: 'Recipe not found' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
