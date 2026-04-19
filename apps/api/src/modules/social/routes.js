import { Router } from 'express';

export const socialRouter = Router();

socialRouter.get('/leaderboard', (_req, res) => {
  res.json({ module: 'social', message: 'Competition leaderboard endpoint ready.' });
});
