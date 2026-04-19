import { Router } from 'express';
import { rankForScore, strengthScore } from './service.js';

export const rankingRouter = Router();

rankingRouter.get('/muscle', (req, res) => {
  const weightKg = Number(req.query.weightKg ?? 80);
  const reps = Number(req.query.reps ?? 8);
  const workoutsPerWeek = Number(req.query.workoutsPerWeek ?? 4);
  const streakDays = Number(req.query.streakDays ?? 10);
  const volumeProgression = Number(req.query.volumeProgression ?? 0.5);

  const score = strengthScore({ weightKg, reps, workoutsPerWeek, streakDays, volumeProgression });
  const rank = rankForScore(score);

  res.json({
    muscleGroup: String(req.query.muscleGroup ?? 'chest'),
    score,
    rank
  });
});
