import { Router } from 'express';

export const healthModuleRouter = Router();

healthModuleRouter.get('/profile', (_req, res) => {
  res.json({ module: 'health', message: 'Health profile endpoint ready.' });
});

healthModuleRouter.get('/vitals', (_req, res) => {
  res.json({ module: 'health', message: 'Vital tracking endpoint ready.' });
});
