import test from 'node:test';
import assert from 'node:assert/strict';

// ─── Ranking service tests ────────────────────────────────────────────────────
import { epley1RM, strengthScore, consistencyMultiplier, rankForScore } from './modules/ranking/service.js';

test('epley1RM: single-rep lift equals the lifted weight', () => {
  assert.equal(epley1RM(100, 1), 100);
});

test('epley1RM: estimated 1RM is greater than lifted weight for multiple reps', () => {
  const est = epley1RM(80, 8);
  assert.ok(est > 80, `expected ${est} > 80`);
});

test('epley1RM: zero weight returns 0', () => {
  assert.equal(epley1RM(0, 5), 0);
});

test('epley1RM: zero reps returns 0', () => {
  assert.equal(epley1RM(100, 0), 0);
});

test('consistencyMultiplier: optimal inputs yield maximum multiplier', () => {
  const m = consistencyMultiplier({ workoutsPerWeek: 4.5, streakDays: 30, volumeProgression: 0.10 });
  // max = 0.90 + 0.12 + 0.05 + 0.03 = 1.10
  assert.ok(m >= 1.09 && m <= 1.10, `expected ~1.10, got ${m}`);
});

test('consistencyMultiplier: zero training yields minimum multiplier (0.90)', () => {
  const m = consistencyMultiplier({ workoutsPerWeek: 0, streakDays: 0, volumeProgression: 0 });
  assert.equal(m, 0.90);
});

test('consistencyMultiplier: never exceeds 1.20', () => {
  const m = consistencyMultiplier({ workoutsPerWeek: 100, streakDays: 9999, volumeProgression: 1 });
  assert.ok(m <= 1.20, `multiplier ${m} exceeded cap`);
});

test('strengthScore: heavier lift at same reps gives higher score', () => {
  const params = { reps: 5, bodyWeightKg: 80, workoutsPerWeek: 4, streakDays: 20, volumeProgression: 0.05 };
  const lower = strengthScore({ weightKg: 60, ...params });
  const higher = strengthScore({ weightKg: 100, ...params });
  assert.ok(higher > lower, `expected ${higher} > ${lower}`);
});

test('strengthScore: heavier body weight lowers relative score for same lift', () => {
  const params = { weightKg: 100, reps: 5, workoutsPerWeek: 4, streakDays: 20, volumeProgression: 0.05 };
  const light = strengthScore({ bodyWeightKg: 60, ...params });
  const heavy = strengthScore({ bodyWeightKg: 120, ...params });
  assert.ok(light > heavy, `lighter bw should yield higher relative score: ${light} vs ${heavy}`);
});

test('rankForScore: score 0 yields wood tier', () => {
  const { current } = rankForScore(0);
  assert.equal(current.name, 'wood');
});

test('rankForScore: high score (11) yields olympian tier', () => {
  const { current } = rankForScore(11);
  assert.equal(current.name, 'olympian');
});

test('rankForScore: olympian tier has 100% progress (no next tier)', () => {
  const { progress, next } = rankForScore(99);
  assert.equal(next, null);
  assert.equal(progress, 100);
});

test('rankForScore: progress between tiers is between 0 and 100', () => {
  const { progress } = rankForScore(2.0);  // between bronze (1.5) and silver (2.5)
  assert.ok(progress >= 0 && progress <= 100, `progress ${progress} out of range`);
});

// ─── AI service tests ─────────────────────────────────────────────────────────
import {
  detectRecoveryNeed,
  nutritionInsight,
  fitnessProgressInsight,
  estimateVO2Max
} from './modules/ai/service.js';

test('detectRecoveryNeed: optimal inputs score >= 80 with positive readiness', () => {
  const { recoveryScore, readiness } = detectRecoveryNeed({ sleepHours: 8, restingHeartRateDelta: 0, workoutLoad: 1.0 });
  assert.ok(recoveryScore >= 80, `expected >= 80, got ${recoveryScore}`);
  assert.equal(readiness, 'high');
});

test('detectRecoveryNeed: extreme sleep deprivation reduces score significantly', () => {
  const { recoveryScore } = detectRecoveryNeed({ sleepHours: 3, restingHeartRateDelta: 0, workoutLoad: 0.6 });
  const { recoveryScore: optimal } = detectRecoveryNeed({ sleepHours: 8, restingHeartRateDelta: 0, workoutLoad: 0.6 });
  assert.ok(recoveryScore < optimal, `deprived (${recoveryScore}) should be lower than optimal (${optimal})`);
});

test('detectRecoveryNeed: high RHR delta flags red-level recommendation', () => {
  const { recommendations } = detectRecoveryNeed({ sleepHours: 8, restingHeartRateDelta: 15, workoutLoad: 0.6 });
  assert.ok(recommendations.some(r => r.includes('autonomic fatigue')), 'expected autonomic fatigue mention');
});

test('detectRecoveryNeed: ACWR > 1.5 adds overtraining recommendation', () => {
  const { recommendations } = detectRecoveryNeed({ sleepHours: 8, restingHeartRateDelta: 0, workoutLoad: 1.8 });
  assert.ok(recommendations.some(r => r.includes('ACWR')), 'expected ACWR mention');
});

test('detectRecoveryNeed: score is between 0 and 100', () => {
  const cases = [
    { sleepHours: 0, restingHeartRateDelta: 30, workoutLoad: 3 },
    { sleepHours: 8, restingHeartRateDelta: 0, workoutLoad: 1 },
    { sleepHours: 10, restingHeartRateDelta: 2, workoutLoad: 0 },
  ];
  for (const c of cases) {
    const { recoveryScore } = detectRecoveryNeed(c);
    assert.ok(recoveryScore >= 0 && recoveryScore <= 100, `score ${recoveryScore} out of [0,100]`);
  }
});

test('nutritionInsight: adequate protein at minimum threshold returns proteinAdequate true', () => {
  // 75 kg × 1.62 = 121.5 g
  const { proteinAdequate } = nutritionInsight({ calorieDeficit: 200, proteinG: 122, weightKg: 75 });
  assert.equal(proteinAdequate, true);
});

test('nutritionInsight: insufficient protein returns proteinAdequate false with recommendation', () => {
  const { proteinAdequate, recommendations } = nutritionInsight({ calorieDeficit: 200, proteinG: 50, weightKg: 75 });
  assert.equal(proteinAdequate, false);
  assert.ok(recommendations.length > 0);
});

test('nutritionInsight: extreme deficit flags diet-break recommendation', () => {
  const { recommendations } = nutritionInsight({ calorieDeficit: 1000, proteinG: 200, weightKg: 80 });
  assert.ok(recommendations.some(r => r.includes('diet break') || r.includes('extreme')), 'expected extreme deficit message');
});

test('nutritionInsight: surplus detected correctly', () => {
  const { deficitSeverity } = nutritionInsight({ calorieDeficit: -200, proteinG: 180, weightKg: 80 });
  assert.equal(deficitSeverity, 'surplus');
});

test('fitnessProgressInsight: volume within 10% is not overload risk', () => {
  const { overloadRisk } = fitnessProgressInsight({ weeklyVolumeChange: 0.08, injuryRisk: 0.2 });
  assert.equal(overloadRisk, false);
});

test('fitnessProgressInsight: volume spike >10% is overload risk', () => {
  const { overloadRisk } = fitnessProgressInsight({ weeklyVolumeChange: 0.20, injuryRisk: 0.2 });
  assert.equal(overloadRisk, true);
});

test('fitnessProgressInsight: high injury risk produces deload recommendation', () => {
  const { recommendations } = fitnessProgressInsight({ weeklyVolumeChange: 0.05, injuryRisk: 0.75 });
  assert.ok(recommendations.some(r => r.toLowerCase().includes('deload')));
});

test('fitnessProgressInsight: critical injury risk produces critical recommendation', () => {
  const { injuryRiskLevel } = fitnessProgressInsight({ weeklyVolumeChange: 0.05, injuryRisk: 0.90 });
  assert.equal(injuryRiskLevel, 'critical');
});

test('estimateVO2Max: known values produce correct result', () => {
  // HR max 190, HR rest 50 → VO2Max ≈ 15 × (190/50) = 57
  const { vo2max } = estimateVO2Max({ maxHeartRate: 190, restingHeartRate: 50 });
  assert.equal(vo2max, 57.0);
});

test('estimateVO2Max: superior classification for VO2Max >= 55', () => {
  const { category } = estimateVO2Max({ maxHeartRate: 190, restingHeartRate: 50 });
  assert.equal(category, 'superior');
});

test('estimateVO2Max: poor classification for low VO2Max', () => {
  // HR max 170, HR rest 75 → VO2Max ≈ 34 → poor
  const { category } = estimateVO2Max({ maxHeartRate: 170, restingHeartRate: 75 });
  assert.equal(category, 'poor');
});

// ─── Modes service tests ──────────────────────────────────────────────────────
import { modeTarget } from './modules/modes/service.js';

test('modeTarget: cut reduces calories below TDEE', () => {
  const { targetCalories } = modeTarget({ mode: 'cut', tdee: 2500, weightKg: 80 });
  assert.ok(targetCalories < 2500, `cut should be below TDEE: ${targetCalories}`);
});

test('modeTarget: bulk increases calories above TDEE', () => {
  const { targetCalories } = modeTarget({ mode: 'bulk', tdee: 2500, weightKg: 80 });
  assert.ok(targetCalories > 2500, `bulk should be above TDEE: ${targetCalories}`);
});

test('modeTarget: maintenance matches TDEE exactly', () => {
  const { targetCalories } = modeTarget({ mode: 'maintenance', tdee: 2500, weightKg: 80 });
  assert.equal(targetCalories, 2500);
});

test('modeTarget: protein is positive and based on body weight', () => {
  const { proteinGrams } = modeTarget({ mode: 'recomposition', tdee: 2200, weightKg: 80 });
  assert.ok(proteinGrams > 0);
  assert.ok(proteinGrams > 80, 'protein should exceed 1 g/kg minimum');
});

test('modeTarget: unsupported mode throws', () => {
  assert.throws(() => modeTarget({ mode: 'unsupported', tdee: 2200, weightKg: 75 }));
});

// ─── Nutrition calculator service tests ──────────────────────────────────────
import { calculateNutritionTargets } from './modules/nutrition/service.js';

test('calculateNutritionTargets: male BMR matches Mifflin-St Jeor formula', () => {
  // male: 10·80 + 6.25·175 - 5·30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75 ≈ 1749
  const { bmr } = calculateNutritionTargets({ weightKg: 80, heightCm: 175, age: 30, sex: 'male', activityFactor: 1.2 });
  assert.ok(Math.abs(bmr - 1749) <= 1, `expected ~1749, got ${bmr}`);
});

test('calculateNutritionTargets: female BMR matches Mifflin-St Jeor formula', () => {
  // female: 10·60 + 6.25·165 - 5·25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 ≈ 1345
  const { bmr } = calculateNutritionTargets({ weightKg: 60, heightCm: 165, age: 25, sex: 'female', activityFactor: 1.375 });
  assert.ok(Math.abs(bmr - 1345) <= 1, `expected ~1345, got ${bmr}`);
});

test('calculateNutritionTargets: TDEE > BMR for any activity factor > 1', () => {
  const { bmr, tdee } = calculateNutritionTargets({ weightKg: 75, heightCm: 175, age: 30, sex: 'male', activityFactor: 1.55 });
  assert.ok(tdee > bmr, `TDEE (${tdee}) should exceed BMR (${bmr})`);
});

test('calculateNutritionTargets: goalMultiplier scales target calories correctly', () => {
  const base = calculateNutritionTargets({ weightKg: 75, heightCm: 175, age: 30, sex: 'male', activityFactor: 1.55 });
  const deficit = calculateNutritionTargets({ weightKg: 75, heightCm: 175, age: 30, sex: 'male', activityFactor: 1.55, goalMultiplier: 0.8 });
  assert.ok(deficit.targetCalories < base.targetCalories);
  assert.ok(Math.abs(deficit.targetCalories - Math.round(base.tdee * 0.8)) <= 1);
});

test('calculateNutritionTargets: macros include proteinG, fatG, carbG', () => {
  const { macros } = calculateNutritionTargets({ weightKg: 75, heightCm: 175, age: 28, sex: 'male', activityFactor: 1.55 });
  assert.ok(macros.proteinG > 0, 'protein must be positive');
  assert.ok(macros.fatG > 0, 'fat must be positive');
  assert.ok(macros.carbG >= 0, 'carbs must be non-negative');
});

test('calculateNutritionTargets: protein follows 1.62g/kg floor', () => {
  const weightKg = 80;
  const { macros } = calculateNutritionTargets({ weightKg, heightCm: 180, age: 30, sex: 'male', activityFactor: 1.55 });
  assert.ok(macros.proteinG >= Math.round(weightKg * 1.62) - 1, `protein ${macros.proteinG} should be ≥ ${Math.round(weightKg * 1.62)}`);
});

// ─── Token utility tests ──────────────────────────────────────────────────────
import { hashToken } from './core/utils/token.js';

test('hashToken: deterministic and non-empty', () => {
  const one = hashToken('sample-refresh-token');
  const two = hashToken('sample-refresh-token');
  const three = hashToken('different-token');

  assert.equal(one, two);
  assert.notEqual(one, three);
  assert.equal(one.length, 64);
});

test('hashToken: different inputs always produce different hashes', () => {
  const tokens = ['tokenA', 'tokenB', 'tokenC', 'tokenD', 'tokenE'];
  const hashes = tokens.map(hashToken);
  const unique = new Set(hashes);
  assert.equal(unique.size, tokens.length);
});

// ─── WebSocket gateway tests ──────────────────────────────────────────────────
import { getPublisher } from './websocket/publisher.js';

test('getPublisher: returns a no-op function before attachWebSocket is called', () => {
  // Before any server is attached the publisher is a no-op; calling it must not throw
  assert.doesNotThrow(() => getPublisher()('vitals', { test: true }));
});

// ─── Ranking service — extended edge cases ────────────────────────────────────

test('rankForScore: score exactly at tier boundary is classified in that tier', () => {
  // bronze.min = 1.5
  const { current } = rankForScore(1.5);
  assert.equal(current.name, 'bronze');
});

test('rankForScore: progress is 0 at tier lower bound', () => {
  // bronze starts at 1.5, silver starts at 2.5 → 0% progress at exactly 1.5
  const { progress } = rankForScore(1.5);
  assert.equal(progress, 0);
});

test('epley1RM: 10 reps at 100 kg ≈ 133 kg (well-established training reference)', () => {
  // 100 × (1 + 10/30) = 100 × 1.333 = 133.33
  const est = epley1RM(100, 10);
  assert.ok(Math.abs(est - 133.33) < 0.1, `expected 133.33, got ${est}`);
});

// ─── AI service — boundary tests ──────────────────────────────────────────────

test('detectRecoveryNeed: 0 sleep hours produces minimum-side score', () => {
  const { recoveryScore } = detectRecoveryNeed({ sleepHours: 0, restingHeartRateDelta: 0, workoutLoad: 0 });
  // 0 sleep: sleepScore = max(0, 100 - 7×18) = max(0, -26) = 0; rhrScore=100; loadScore=90
  // weighted = 0×0.40 + 100×0.35 + 90×0.25 = 0 + 35 + 22.5 = 57 or 58
  assert.ok(recoveryScore <= 60, `expected low score for 0 sleep, got ${recoveryScore}`);
});

test('detectRecoveryNeed: readiness low when score < 55', () => {
  const { readiness } = detectRecoveryNeed({ sleepHours: 3, restingHeartRateDelta: 15, workoutLoad: 2.0 });
  assert.equal(readiness, 'low');
});

test('nutritionInsight: optimal scenario returns all-positive flags', () => {
  // 80 kg person, 200g protein (>2.2×80=176), no deficit
  const { proteinAdequate, proteinOptimal, leucineAdequate, deficitSeverity } = nutritionInsight({
    calorieDeficit: 0, proteinG: 200, weightKg: 80
  });
  assert.equal(proteinAdequate, true);
  assert.equal(proteinOptimal, true);
  assert.equal(leucineAdequate, true);
  assert.equal(deficitSeverity, 'surplus');
});

test('fitnessProgressInsight: sudden 20%+ volume drop flags undertraining', () => {
  const { undertrainingRisk } = fitnessProgressInsight({ weeklyVolumeChange: -0.25, injuryRisk: 0.1 });
  assert.equal(undertrainingRisk, true);
});

test('estimateVO2Max: invalid (zero resting HR) returns null', () => {
  const result = estimateVO2Max({ maxHeartRate: 190, restingHeartRate: 0 });
  assert.equal(result, null);
});

// ─── Gamification service tests ───────────────────────────────────────────────
import { levelFromXP } from './modules/gamification/service.js';

test('levelFromXP: zero XP is level 1 at 0% progress', () => {
  const { level, progress } = levelFromXP(0);
  assert.equal(level, 1);
  assert.equal(progress, 0);
});

test('levelFromXP: negative XP treated as 0', () => {
  const { level } = levelFromXP(-100);
  assert.equal(level, 1);
});

test('levelFromXP: exactly at level 2 threshold (100 XP)', () => {
  const { level } = levelFromXP(100);
  assert.equal(level, 2);
});

test('levelFromXP: progress is between 0 and 100', () => {
  for (const xp of [0, 50, 100, 350, 1000]) {
    const { progress } = levelFromXP(xp);
    assert.ok(progress >= 0 && progress <= 100, `progress ${progress} out of range for ${xp} XP`);
  }
});

test('levelFromXP: higher XP gives higher level', () => {
  const { level: l1 } = levelFromXP(100);
  const { level: l2 } = levelFromXP(1000);
  assert.ok(l2 > l1, `expected ${l2} > ${l1}`);
});

test('levelFromXP: nextLevelXP is positive', () => {
  const { nextLevelXP } = levelFromXP(50);
  assert.ok(nextLevelXP > 0);
});
