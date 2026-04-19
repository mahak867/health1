const TIERS = [
  { name: 'beginner', min: 0 },
  { name: 'bronze', min: 400 },
  { name: 'silver', min: 900 },
  { name: 'gold', min: 1600 },
  { name: 'platinum', min: 2500 },
  { name: 'diamond', min: 3600 },
  { name: 'elite', min: 5000 }
];

export function consistencyFactor({ workoutsPerWeek, streakDays, volumeProgression }) {
  const workoutScore = Math.min(workoutsPerWeek / 6, 1);
  const streakScore = Math.min(streakDays / 30, 1);
  const progressionScore = Math.max(0, Math.min(volumeProgression, 1));
  return Number((0.45 + workoutScore * 0.25 + streakScore * 0.2 + progressionScore * 0.1).toFixed(2));
}

export function strengthScore({ weightKg, reps, workoutsPerWeek, streakDays, volumeProgression }) {
  const factor = consistencyFactor({ workoutsPerWeek, streakDays, volumeProgression });
  return Number((weightKg * reps * factor).toFixed(2));
}

export function rankForScore(score) {
  let current = TIERS[0];
  let next = null;

  for (let i = 0; i < TIERS.length; i += 1) {
    if (score >= TIERS[i].min) {
      current = TIERS[i];
      next = TIERS[i + 1] ?? null;
    }
  }

  const progress = next
    ? Math.max(0, Math.min(((score - current.min) / (next.min - current.min)) * 100, 100))
    : 100;

  return { current, next, progress: Number(progress.toFixed(2)) };
}
