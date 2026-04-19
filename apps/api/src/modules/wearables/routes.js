import { Router } from 'express';

export const wearablesRouter = Router();

wearablesRouter.post('/sync', (_req, res) => {
  res.json({ module: 'wearables', message: 'Device sync endpoint ready.' });
});
