import { Router } from 'express';

export const exportsRouter = Router();

exportsRouter.get('/reports', (_req, res) => {
  res.json({ module: 'exports', message: 'Report export endpoint ready.' });
});
