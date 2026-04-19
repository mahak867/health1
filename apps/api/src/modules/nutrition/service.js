// ─── Nutrition Calculator Service ────────────────────────────────────────────
// Mifflin-St Jeor BMR (1990) — most accurate of the widely-validated equations
// for general populations (Frankenfield et al. 2005 systematic review).
//
// BMR (male)   = 10·W + 6.25·H - 5·A + 5
// BMR (female) = 10·W + 6.25·H - 5·A - 161
//
// Activity factors (Ainsworth et al. 2011 Compendium):
//   1.2  = sedentary (desk job, little exercise)
//   1.375 = lightly active (1-3 d/wk light exercise)
//   1.55  = moderately active (3-5 d/wk moderate exercise)
//   1.725 = very active (6-7 d/wk hard exercise)
//   1.9   = extremely active (2× daily or physical job + training)
//
// Macro split uses NSCA evidence-based ranges:
//   Protein: 1.62 g/kg (minimum MPS maintenance — Morton et al. 2018)
//   Fat: 25% of TDEE (minimum for hormonal health)
//   Carbs: remainder

/**
 * @param {object} params
 * @param {number} params.weightKg
 * @param {number} params.heightCm
 * @param {number} params.age
 * @param {'male'|'female'} params.sex
 * @param {number} params.activityFactor - 1.2 to 2.5
 * @param {number} [params.goalMultiplier=1] - e.g. 0.8 for aggressive cut, 1.1 for lean bulk
 */
export function calculateNutritionTargets({ weightKg, heightCm, age, sex, activityFactor, goalMultiplier = 1 }) {
  const s = sex === 'male' ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + s;
  const tdee = bmr * activityFactor;
  const targetCalories = tdee * goalMultiplier;

  // Evidence-based macro split
  const proteinG = Math.round(weightKg * 1.62);         // Morton et al. 2018 minimum
  const fatCalories = targetCalories * 0.25;
  const fatG = Math.round(fatCalories / 9);
  const proteinCalories = proteinG * 4;
  const carbCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
  const carbG = Math.round(carbCalories / 4);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    macros: { proteinG, fatG, carbG }
  };
}
