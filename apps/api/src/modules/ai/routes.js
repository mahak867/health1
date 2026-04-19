import { Router } from 'express';
import { detectRecoveryNeed } from './service.js';

export const aiRouter = Router();

aiRouter.post('/recommendations', (req, res) => {
  const sleepHours = Number(req.body.sleepHours ?? 6.5);
  const restingHeartRateDelta = Number(req.body.restingHeartRateDelta ?? 2);
  const workoutLoad = Number(req.body.workoutLoad ?? 0.6);

  const insight = detectRecoveryNeed({ sleepHours, restingHeartRateDelta, workoutLoad });

  res.json({
    module: 'ai',
    insight
  });
});
