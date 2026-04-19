export function detectRecoveryNeed({ sleepHours, restingHeartRateDelta, workoutLoad }) {
  const flags = [];
  if (sleepHours < 6) flags.push('low_sleep');
  if (restingHeartRateDelta > 8) flags.push('elevated_rhr');
  if (workoutLoad > 0.85) flags.push('high_load');

  return {
    recoveryScore: Math.max(0, 100 - flags.length * 20),
    recommendations: [
      flags.includes('low_sleep') ? 'Prioritize 7-9h sleep tonight.' : null,
      flags.includes('elevated_rhr') ? 'Add light recovery day.' : null,
      flags.includes('high_load') ? 'Reduce training intensity by 20% for 24h.' : null
    ].filter(Boolean)
  };
}
