import { Router } from 'express';

export const fitnessRouter = Router();

fitnessRouter.get('/workouts', (_req, res) => {
  res.json({ module: 'fitness', message: 'Workout tracking endpoint ready.' });
});

fitnessRouter.get('/ranking', (_req, res) => {
  res.json({ module: 'fitness', message: 'Muscle ranking endpoint ready.' });
});
