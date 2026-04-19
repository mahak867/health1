// ─── Recovery Science ────────────────────────────────────────────────────────
// Based on Foster's Training Load model (TSS), Uth-Sørensen VO2Max proxy, and
// published HRV-readiness guidelines (Buchheit 2014).

const SLEEP_OPTIMAL_LOW = 7;
const SLEEP_OPTIMAL_HIGH = 9;
const RHR_AMBER_DELTA = 5;
const RHR_RED_DELTA = 10;

/**
 * Classify sleep deficit and return a 0-100 sleep quality score.
 * Optimal band 7-9 h scores 100; each hour short/over deducts proportionally.
 */
function sleepScore(sleepHours) {
  if (sleepHours >= SLEEP_OPTIMAL_LOW && sleepHours <= SLEEP_OPTIMAL_HIGH) return 100;
  if (sleepHours < SLEEP_OPTIMAL_LOW) {
    const deficit = SLEEP_OPTIMAL_LOW - sleepHours;
    return Math.max(0, Math.round(100 - deficit * 18));   // ~18 pts/h short
  }
  // oversleeping (>9 h) mildly penalises (often signals fatigue accumulation)
  const excess = sleepHours - SLEEP_OPTIMAL_HIGH;
  return Math.max(60, Math.round(100 - excess * 8));
}

/**
 * Resting-HR elevation score (0-100).
 * RHR delta >5 bpm suggests incomplete recovery; >10 bpm is a red-flag signal.
 * Reference: Plews et al. (2013) HRV and recovery tracking.
 */
function rhrScore(restingHeartRateDelta) {
  if (restingHeartRateDelta <= 0) return 100;
  if (restingHeartRateDelta < RHR_AMBER_DELTA) return 100;
  if (restingHeartRateDelta < RHR_RED_DELTA) {
    const excess = restingHeartRateDelta - RHR_AMBER_DELTA;
    return Math.round(100 - excess * 10);
  }
  const excess = restingHeartRateDelta - RHR_RED_DELTA;
  return Math.max(0, Math.round(50 - excess * 6));
}

/**
 * Acute:Chronic Workload Ratio (ACWR) load score (0-100).
 * ACWR in 0.8-1.3 is the "sweet spot" (Gabbett 2016); >1.5 doubles injury risk.
 * workoutLoad is treated here as the acute load expressed as fraction of the
 * chronic baseline, i.e. workoutLoad ≈ ACWR (0 = no training, 1 = baseline,
 * 1.5 = 50% above baseline).
 */
function loadScore(workoutLoad) {
  if (workoutLoad <= 0) return 90;
  if (workoutLoad <= 1.3) return 100;
  if (workoutLoad <= 1.5) return Math.round(100 - (workoutLoad - 1.3) * 100);
  return Math.max(0, Math.round(80 - (workoutLoad - 1.5) * 60));
}

export function detectRecoveryNeed({ sleepHours, restingHeartRateDelta, workoutLoad }) {
  const sScore = sleepScore(sleepHours);
  const rScore = rhrScore(restingHeartRateDelta);
  const lScore = loadScore(workoutLoad);

  // Weighted composite: sleep 40%, RHR 35%, load 25%
  const recoveryScore = Math.round(sScore * 0.4 + rScore * 0.35 + lScore * 0.25);

  const recommendations = [];

  // Sleep recommendations
  if (sleepHours < SLEEP_OPTIMAL_LOW) {
    const debtH = (SLEEP_OPTIMAL_LOW - sleepHours).toFixed(1);
    recommendations.push(`Sleep debt of ${debtH}h detected — target 7-9h tonight to restore glycogen resynthesis and GH secretion.`);
  } else if (sleepHours > SLEEP_OPTIMAL_HIGH + 1) {
    recommendations.push('Excessive sleep duration may indicate accumulated fatigue — consider a deload day.');
  }

  // RHR recommendations
  if (restingHeartRateDelta >= RHR_RED_DELTA) {
    recommendations.push(`RHR elevated by ${restingHeartRateDelta} bpm — high autonomic fatigue signal. Replace training with Zone-1 active recovery or full rest.`);
  } else if (restingHeartRateDelta >= RHR_AMBER_DELTA) {
    recommendations.push(`RHR up ${restingHeartRateDelta} bpm above baseline — reduce session intensity by 20-30% and avoid PR attempts today.`);
  }

  // ACWR / load recommendations
  if (workoutLoad > 1.5) {
    recommendations.push(`ACWR of ${workoutLoad.toFixed(2)} exceeds safe threshold (1.5) — injury risk is elevated. Schedule a mandatory rest day or deload week.`);
  } else if (workoutLoad > 1.3) {
    recommendations.push(`ACWR of ${workoutLoad.toFixed(2)} is in the caution zone (1.3-1.5) — cap this week's volume at current levels.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Recovery markers are optimal — you are cleared for high-intensity training today.');
  }

  return {
    recoveryScore,
    sleepScore: sScore,
    rhrScore: rScore,
    loadScore: lScore,
    readiness: recoveryScore >= 80 ? 'high' : recoveryScore >= 55 ? 'moderate' : 'low',
    recommendations
  };
}

// ─── Nutrition Science ────────────────────────────────────────────────────────
// Based on: Morton et al. (2018) protein meta-analysis, Helms et al. cutting
// guidelines, leucine threshold for MPS (Norton & Layman 2006).

const LEUCINE_THRESHOLD_G = 2.5;   // ~30 g whey or 40 g chicken per meal
const ESTIMATED_LEUCINE_FRACTION = 0.08;  // ~8% of dietary protein is leucine

/**
 * Classify calorie deficit severity using Helms et al. evidence-based ranges.
 */
function deficitSeverity(calorieDeficit) {
  if (calorieDeficit <= 0) return 'surplus';
  if (calorieDeficit <= 300) return 'mild';
  if (calorieDeficit <= 500) return 'moderate';
  if (calorieDeficit <= 750) return 'aggressive';
  return 'extreme';
}

export function nutritionInsight({ calorieDeficit, proteinG, weightKg }) {
  // Evidence-based protein targets (Morton et al. 2018 meta-analysis):
  // Minimum: 1.62 g/kg; Optimum for body recomp: 2.2 g/kg
  const minProtein = weightKg * 1.62;
  const optimalProtein = weightKg * 2.2;
  const proteinAdequate = proteinG >= minProtein;
  const proteinOptimal = proteinG >= optimalProtein;

  // Leucine adequacy for maximal MPS stimulation (Norton & Layman 2006)
  const leucineG = proteinG * ESTIMATED_LEUCINE_FRACTION;
  const leucineAdequate = leucineG >= LEUCINE_THRESHOLD_G;

  const severity = deficitSeverity(calorieDeficit);
  const recommendations = [];

  // Protein recommendations
  if (!proteinAdequate) {
    const gap = Math.ceil(minProtein - proteinG);
    recommendations.push(`Protein intake is ${gap}g below the evidence-based minimum of ${Math.round(minProtein)}g (1.62 g/kg) — muscle catabolism risk is elevated under this deficit.`);
  } else if (!proteinOptimal) {
    const gap = Math.ceil(optimalProtein - proteinG);
    recommendations.push(`Add ${gap}g protein to reach the optimal 2.2 g/kg target for maximal muscle retention during caloric restriction.`);
  }

  // Leucine / MPS threshold
  if (!leucineAdequate) {
    recommendations.push(`Leucine intake (~${leucineG.toFixed(1)}g estimated) is below the 2.5g MPS threshold — consider distributing protein across 4-5 meals of ≥30g each.`);
  }

  // Deficit severity recommendations
  if (severity === 'extreme') {
    recommendations.push(`${calorieDeficit} kcal deficit is extreme (>750 kcal) — metabolic adaptation and muscle loss risk are high. A 1-2 week diet break at maintenance is strongly advised.`);
  } else if (severity === 'aggressive') {
    recommendations.push(`Aggressive deficit (${calorieDeficit} kcal) — monitor performance weekly. If lifts decline >10%, reduce deficit to 400-500 kcal.`);
  } else if (severity === 'moderate' && !proteinOptimal) {
    recommendations.push('Moderate deficit with sub-optimal protein is a risky combination — protein is the higher priority lever.');
  }

  if (severity === 'surplus') {
    recommendations.push('Caloric surplus detected — ensure progressive overload is in place to maximise lean mass accrual vs. fat gain.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Nutrition markers are on point — protein intake, leucine distribution, and caloric strategy are all optimal.');
  }

  return {
    proteinAdequate,
    proteinOptimal,
    leucineAdequate,
    deficitSeverity: severity,
    proteinPerKg: Number((proteinG / weightKg).toFixed(2)),
    recommendations
  };
}

// ─── Fitness Progress Science ─────────────────────────────────────────────────
// Based on: Gabbett (2016) ACWR injury model, Haff & Triplett periodisation
// principles, and Borg RPE progressive overload guidelines.

const SAFE_WEEKLY_VOLUME_INCREASE = 0.10;   // 10% rule (Haff & Triplett)
const ACWR_CAUTION = 0.8;                    // Below this = detraining risk
const INJURY_RISK_HIGH = 0.65;
const INJURY_RISK_CRITICAL = 0.80;

export function fitnessProgressInsight({ weeklyVolumeChange, injuryRisk }) {
  const overloadRisk = weeklyVolumeChange > SAFE_WEEKLY_VOLUME_INCREASE;
  const undertrainingRisk = weeklyVolumeChange < -0.20;  // sudden 20% volume drop

  const recommendations = [];

  // Volume progression recommendations
  if (weeklyVolumeChange > 0.25) {
    const pct = Math.round(weeklyVolumeChange * 100);
    recommendations.push(`Volume spiked ${pct}% this week — this is 2.5× the safe 10% ceiling. Risk of connective tissue overuse injury (tendinopathy, stress fracture) is significantly elevated.`);
  } else if (overloadRisk) {
    const pct = Math.round(weeklyVolumeChange * 100);
    const safe = Math.round(SAFE_WEEKLY_VOLUME_INCREASE * 100);
    recommendations.push(`Volume increased ${pct}% vs. last week (safe ceiling is ${safe}%) — reduce next session volume by ${pct - safe}% to stay within progressive overload guidelines.`);
  } else if (undertrainingRisk) {
    recommendations.push('Volume dropped >20% — unless programmed as a deload, this may cause loss of adaptation. Aim to restore training frequency within 1-2 weeks.');
  }

  // Injury risk recommendations
  if (injuryRisk >= INJURY_RISK_CRITICAL) {
    recommendations.push(`Injury risk score is critical (${(injuryRisk * 100).toFixed(0)}%) — mandatory technique review and sports-medicine assessment recommended before next training block.`);
  } else if (injuryRisk >= INJURY_RISK_HIGH) {
    recommendations.push(`Injury risk score is elevated (${(injuryRisk * 100).toFixed(0)}%) — deload week is recommended: reduce volume 40-50%, maintain intensity.`);
  }

  // Positive feedback
  if (!overloadRisk && injuryRisk < INJURY_RISK_HIGH && weeklyVolumeChange >= 0) {
    const pct = Math.round(weeklyVolumeChange * 100);
    recommendations.push(`Progressive overload is on track (+${pct}% volume, injury risk ${(injuryRisk * 100).toFixed(0)}%) — continue current periodisation plan.`);
  }

  return {
    overloadRisk,
    undertrainingRisk,
    weeklyVolumeChangePct: Math.round(weeklyVolumeChange * 100),
    injuryRiskLevel: injuryRisk >= INJURY_RISK_CRITICAL ? 'critical' : injuryRisk >= INJURY_RISK_HIGH ? 'high' : injuryRisk >= 0.4 ? 'moderate' : 'low',
    recommendations
  };
}

// ─── VO2Max Estimation ────────────────────────────────────────────────────────
// Uth-Sørensen-Overgaard-Pedersen formula (2004):
// VO2Max ≈ 15 × (HRmax / HRrest)
// Validated against direct VO2Max measurement (r = 0.82).

export function estimateVO2Max({ maxHeartRate, restingHeartRate }) {
  if (!maxHeartRate || !restingHeartRate || restingHeartRate <= 0) return null;
  const vo2max = Number((15 * (maxHeartRate / restingHeartRate)).toFixed(1));

  // Fitness classification (ACSM norms for 30-39 year old reference population)
  let category;
  if (vo2max >= 55) category = 'superior';
  else if (vo2max >= 48) category = 'excellent';
  else if (vo2max >= 42) category = 'good';
  else if (vo2max >= 36) category = 'fair';
  else category = 'poor';

  return { vo2max, category, unit: 'mL/kg/min' };
}
