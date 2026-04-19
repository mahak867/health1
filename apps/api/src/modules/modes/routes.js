import { Router } from 'express';
import { modeTarget } from './service.js';

export const modesRouter = Router();

modesRouter.get('/plans', (req, res, next) => {
  try {
    const mode = String(req.query.mode ?? 'maintenance');
    const tdee = Number(req.query.tdee ?? 2200);
    const weightKg = Number(req.query.weightKg ?? 70);

    const targets = modeTarget({ mode, tdee, weightKg });
    res.json({ targets });
  } catch (error) {
    next(error);
  }
});
