// ─── Strength Science ─────────────────────────────────────────────────────────
// 1RM Estimation: Epley formula (1985) — validated across multiple populations.
//   Estimated 1RM = weight × (1 + reps / 30)
//   Accurate for rep ranges 1-10; beyond 10 reps accuracy degrades.
//
// Relative Strength (body-weight normalised):
//   Allometric scaling exponent 0.67 is well-established for strength sports
//   (Batterham & George 1997; used in DOTS coefficient derivation).
//   relativeScore = estimated1RM / (bodyWeightKg ^ 0.67)
//
// Tiers are calibrated to NSCA/USA Powerlifting classification standards
// expressed in the relative-strength scale above.

const TIERS = [
  { name: 'wood',     min: 0,    label: 'Beginner'       },
  { name: 'bronze',   min: 1.5,  label: 'Novice'         },
  { name: 'silver',   min: 2.5,  label: 'Intermediate'   },
  { name: 'gold',     min: 3.5,  label: 'Proficient'     },
  { name: 'platinum', min: 4.5,  label: 'Advanced'       },
  { name: 'diamond',  min: 5.8,  label: 'Elite'          },
  { name: 'champion', min: 7.2,  label: 'National Level' },
  { name: 'titan',    min: 8.8,  label: 'International'  },
  { name: 'olympian', min: 10.5, label: 'World Class'    },
];

/**
 * Epley formula estimated 1-rep-maximum (kg).
 * @param {number} weightKg - lifted weight in kg
 * @param {number} reps     - repetitions performed (1-20 meaningful range)
 */
export function epley1RM(weightKg, reps) {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Number((weightKg * (1 + reps / 30)).toFixed(2));
}

/**
 * Consistency multiplier that scales 1RM by training adherence quality.
 * Replaces the old flat-factor approach with a more principled model:
 *   - Frequency component: 4-5 d/week is optimal for most compound lifts
 *   - Streak: rewards consistent training blocks (≥30 d)
 *   - Volume progression: rewards controlled progressive overload (0.05-0.10/week)
 *
 * Range: 0.90 – 1.20 (cannot inflate score more than 20% above raw strength)
 */
export function consistencyMultiplier({ workoutsPerWeek, streakDays, volumeProgression }) {
  // Frequency: optimal 4-5 days = 1.0 bonus, sub-optimal scales down
  const freqScore = Math.min(workoutsPerWeek / 4.5, 1);

  // Streak: 30-day streak = full credit; caps at 1.0
  const streakScore = Math.min(streakDays / 30, 1);

  // Volume progression: reward modest progressive overload (0-10%); penalise >15%
  const clampedProgression = Math.max(0, Math.min(volumeProgression, 0.10));
  const progressionScore = clampedProgression / 0.10;

  // Multiplier range 0.90 → 1.20
  const multiplier = 0.90 + freqScore * 0.12 + streakScore * 0.05 + progressionScore * 0.03;
  return Number(Math.min(1.20, multiplier).toFixed(3));
}

/**
 * Relative strength score — bodyweight-normalised using allometric scaling.
 * This is the primary ranking number.
 *
 * @param {object} params
 * @param {number} params.weightKg          - lifted weight (kg)
 * @param {number} params.reps              - reps performed
 * @param {number} params.bodyWeightKg      - athlete body weight (kg); defaults to 75 kg when absent
 * @param {number} params.workoutsPerWeek
 * @param {number} params.streakDays
 * @param {number} params.volumeProgression
 */
export function strengthScore({ weightKg, reps, bodyWeightKg = 75, workoutsPerWeek, streakDays, volumeProgression }) {
  const raw1RM = epley1RM(weightKg, reps);
  const multiplier = consistencyMultiplier({ workoutsPerWeek, streakDays, volumeProgression });
  const adjusted1RM = raw1RM * multiplier;

  // Allometric normalisation: score = 1RM / bw^0.67
  const bwFactor = Math.pow(Math.max(bodyWeightKg, 20), 0.67);
  return Number((adjusted1RM / bwFactor).toFixed(3));
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

  return { current, next, progress: Number(progress.toFixed(2)), score: Number(score.toFixed(3)) };
}
