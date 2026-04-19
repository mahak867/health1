import { Router } from 'express';

export const notificationsRouter = Router();

notificationsRouter.get('/preferences', (_req, res) => {
  res.json({ module: 'notifications', message: 'Notification preferences endpoint ready.' });
});
