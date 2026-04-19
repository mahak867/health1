const MODE_PRESETS = {
  cut: { calorieDelta: -400, proteinMultiplier: 2.2, cardioDaysPerWeek: 4, strengthDaysPerWeek: 3 },
  bulk: { calorieDelta: 350, proteinMultiplier: 1.9, cardioDaysPerWeek: 2, strengthDaysPerWeek: 5 },
  maintenance: { calorieDelta: 0, proteinMultiplier: 1.8, cardioDaysPerWeek: 3, strengthDaysPerWeek: 3 },
  recomposition: { calorieDelta: -100, proteinMultiplier: 2.1, cardioDaysPerWeek: 3, strengthDaysPerWeek: 4 }
};

export function modeTarget({ mode, tdee, weightKg }) {
  const preset = MODE_PRESETS[mode];
  if (!preset) throw new Error('Unsupported mode');

  return {
    mode,
    targetCalories: Math.round(tdee + preset.calorieDelta),
    proteinGrams: Math.round(weightKg * preset.proteinMultiplier),
    cardioDaysPerWeek: preset.cardioDaysPerWeek,
    strengthDaysPerWeek: preset.strengthDaysPerWeek
  };
}
