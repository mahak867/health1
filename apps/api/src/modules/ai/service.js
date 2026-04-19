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

export function nutritionInsight({ calorieDeficit, proteinG, weightKg }) {
  const requiredProtein = weightKg * 1.8;
  const proteinAdequate = proteinG >= requiredProtein;
  const recommendations = [];

  if (!proteinAdequate) {
    recommendations.push(`Increase protein by ${Math.ceil(requiredProtein - proteinG)}g to support muscle retention.`);
  }

  if (calorieDeficit > 600) {
    recommendations.push('Large calorie deficit detected — consider a partial diet break.');
  }

  return {
    proteinAdequate,
    recommendations
  };
}

export function fitnessProgressInsight({ weeklyVolumeChange, injuryRisk }) {
  const recommendations = [];

  if (weeklyVolumeChange > 0.15) {
    recommendations.push('Volume increased >15% this week — increase by max 10% per week to prevent injury.');
  }

  if (injuryRisk > 0.7) {
    recommendations.push('High injury risk signal detected — consider a deload or technique review.');
  }

  return {
    overloadRisk: weeklyVolumeChange > 0.15,
    recommendations
  };
}
