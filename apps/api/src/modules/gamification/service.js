// ─── Badge definitions ────────────────────────────────────────────────────────
// Each badge has a key, display info, and a check(stats) → boolean function.
// `stats` is built in checkAndAwardBadges below.

export const BADGES = [
  { key: 'first_workout',    icon: '🏋️',  name: 'First Rep',         desc: 'Log your very first workout' },
  { key: 'workout_10',       icon: '🔟',  name: '10 Workouts',       desc: 'Complete 10 workouts' },
  { key: 'workout_50',       icon: '🔥',  name: '50 Workouts',       desc: 'Complete 50 workouts' },
  { key: 'workout_100',      icon: '💯',  name: 'Century',           desc: 'Complete 100 workouts' },
  { key: 'streak_7',         icon: '📅',  name: 'Week Warrior',      desc: '7-day workout streak' },
  { key: 'streak_30',        icon: '🗓️',  name: 'Monthly Grind',     desc: '30-day workout streak' },
  { key: 'bench_100kg',      icon: '🏅',  name: 'Ton Bench',         desc: 'Log a 100 kg bench press' },
  { key: 'squat_100kg',      icon: '🦵',  name: 'Century Squat',     desc: 'Log a 100 kg squat' },
  { key: 'deadlift_100kg',   icon: '⚡',  name: 'Triple Digits DL',  desc: 'Log a 100 kg deadlift' },
  { key: 'first_meal',       icon: '🥗',  name: 'First Bite',        desc: 'Log your first meal' },
  { key: 'meal_7days',       icon: '🍱',  name: 'Meal Planner',      desc: 'Log meals 7 days in a row' },
  { key: 'protein_150g',     icon: '💪',  name: 'Protein Champion',  desc: 'Hit 150g protein in a day' },
  { key: 'first_activity',   icon: '🏃',  name: 'On The Move',       desc: 'Log your first cardio activity' },
  { key: 'activity_5k',      icon: '🎽',  name: '5K Club',           desc: 'Log a 5 km run/walk' },
  { key: 'activity_10k',     icon: '🏅',  name: '10K Club',          desc: 'Log a 10 km run/walk' },
  { key: 'gold_rank',        icon: '🥇',  name: 'Gold Standard',     desc: 'Reach Gold tier in any muscle group' },
  { key: 'diamond_rank',     icon: '💎',  name: 'Diamond Athlete',   desc: 'Reach Diamond tier in any muscle group' },
  { key: 'social_follow',    icon: '🤝',  name: 'Connected',         desc: 'Follow another athlete' },
  { key: 'challenge_first',  icon: '🎯',  name: 'Challenge Accepted', desc: 'Complete your first challenge' },
  { key: 'challenge_10',     icon: '🏆',  name: 'Challenge Master',  desc: 'Complete 10 challenges' },
];

// ─── XP awards ────────────────────────────────────────────────────────────────
export const XP_EVENTS = {
  workout_logged:    30,
  meal_logged:       10,
  hydration_logged:   5,
  activity_logged:   25,
  pr_set:            50,
  badge_earned:      20,
};

// XP → level. Level n starts at cumulative (n-1)*n/2 * 100 XP.
export function levelFromXP(totalXP) {
  const xp = Math.max(0, totalXP);
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level++;
  const currentThreshold = levelThreshold(level);
  const nextThreshold    = levelThreshold(level + 1);
  const span = nextThreshold - currentThreshold;
  const progress = span > 0 ? Math.min(((xp - currentThreshold) / span) * 100, 100) : 100;
  return {
    level,
    currentLevelXP: xp - currentThreshold,
    nextLevelXP:    span,
    progress: Number(progress.toFixed(1))
  };
}

function levelThreshold(level) {
  return (level - 1) * level / 2 * 100;
}
