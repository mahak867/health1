import { Router } from 'express';
import { detectRecoveryNeed } from './service.js';

export const aiRouter = Router();

aiRouter.get('/recommendations', (req, res) => {
  const sleepHours = Number(req.query.sleepHours ?? 6.5);
  const restingHeartRateDelta = Number(req.query.restingHeartRateDelta ?? 2);
  const workoutLoad = Number(req.query.workoutLoad ?? 0.6);

  const insight = detectRecoveryNeed({ sleepHours, restingHeartRateDelta, workoutLoad });

  res.json({
    module: 'ai',
    insight
  });
});
