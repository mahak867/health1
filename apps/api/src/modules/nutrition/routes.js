import { Router } from 'express';

export const nutritionRouter = Router();

nutritionRouter.get('/meals', (_req, res) => {
  res.json({ module: 'nutrition', message: 'Meal tracking endpoint ready.' });
});

nutritionRouter.get('/calculators', (_req, res) => {
  res.json({ module: 'nutrition', message: 'Nutrition calculators endpoint ready.' });
});
