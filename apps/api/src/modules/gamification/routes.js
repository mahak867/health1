import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { BADGES, XP_EVENTS, levelFromXP } from './service.js';

export const gamificationRouter = Router();

// ─── XP & Level ───────────────────────────────────────────────────────────────
gamificationRouter.get('/xp', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT COALESCE(SUM(xp), 0)::int AS total FROM user_xp WHERE user_id = $1',
      [req.user.sub]
    );
    const totalXP = result.rows[0].total;
    return res.json({ totalXP, ...levelFromXP(totalXP) });
  } catch (error) {
    return next(error);
  }
});

// Internal helper — award XP and return the inserted row
export async function awardXP(userId, source, xp) {
  const result = await query(
    'INSERT INTO user_xp (user_id, source, xp) VALUES ($1, $2, $3) RETURNING *',
    [userId, source, xp]
  );
  return result.rows[0];
}

// ─── Badges ───────────────────────────────────────────────────────────────────
gamificationRouter.get('/badges', async (req, res, next) => {
  try {
    const earned = await query(
      'SELECT badge_key, earned_at FROM user_badges WHERE user_id = $1 ORDER BY earned_at DESC',
      [req.user.sub]
    );
    const earnedKeys = new Set(earned.rows.map((r) => r.badge_key));
    const badgesWithStatus = BADGES.map((b) => ({
      ...b,
      earned: earnedKeys.has(b.key),
      earnedAt: earned.rows.find((r) => r.badge_key === b.key)?.earned_at ?? null
    }));
    return res.json({ badges: badgesWithStatus });
  } catch (error) {
    return next(error);
  }
});

// Internal helper — award a badge (idempotent) and grant its XP bonus
export async function awardBadge(userId, badgeKey) {
  const result = await query(
    `INSERT INTO user_badges (user_id, badge_key) VALUES ($1, $2)
     ON CONFLICT (user_id, badge_key) DO NOTHING
     RETURNING badge_key`,
    [userId, badgeKey]
  );
  if (result.rowCount > 0) {
    // New badge — grant XP bonus
    await awardXP(userId, `badge_${badgeKey}`, XP_EVENTS.badge_earned);
  }
  return result.rowCount > 0;
}

// ─── Check & award badges based on current user stats ────────────────────────
export async function checkAndAwardBadges(userId) {
  const [workoutCount, mealCount, activityCount, rankingRows, completedChallenges, existingBadges] =
    await Promise.all([
      query('SELECT COUNT(*)::int AS n FROM workouts WHERE user_id = $1', [userId]),
      query('SELECT COUNT(*)::int AS n FROM nutrition_logs WHERE user_id = $1', [userId]),
      query('SELECT COUNT(*)::int AS n, COALESCE(MAX(distance_m), 0) AS max_dist FROM activities WHERE user_id = $1', [userId]),
      query("SELECT tier FROM muscle_rankings WHERE user_id = $1", [userId]),
      query('SELECT COUNT(*)::int AS n FROM user_challenges WHERE user_id = $1 AND completed_at IS NOT NULL', [userId]),
      query('SELECT badge_key FROM user_badges WHERE user_id = $1', [userId]),
    ]);

  const already = new Set(existingBadges.rows.map((r) => r.badge_key));
  const wc = workoutCount.rows[0].n;
  const mc = mealCount.rows[0].n;
  const ac = activityCount.rows[0].n;
  const maxDist = Number(activityCount.rows[0].max_dist);
  const tiers = rankingRows.rows.map((r) => r.tier);
  const cc = completedChallenges.rows[0].n;

  const toAward = [];
  if (!already.has('first_workout')   && wc >= 1)    toAward.push('first_workout');
  if (!already.has('workout_10')      && wc >= 10)   toAward.push('workout_10');
  if (!already.has('workout_50')      && wc >= 50)   toAward.push('workout_50');
  if (!already.has('workout_100')     && wc >= 100)  toAward.push('workout_100');
  if (!already.has('first_meal')      && mc >= 1)    toAward.push('first_meal');
  if (!already.has('first_activity')  && ac >= 1)    toAward.push('first_activity');
  if (!already.has('activity_5k')     && maxDist >= 5000)  toAward.push('activity_5k');
  if (!already.has('activity_10k')    && maxDist >= 10000) toAward.push('activity_10k');
  if (!already.has('challenge_first') && cc >= 1)   toAward.push('challenge_first');
  if (!already.has('challenge_10')    && cc >= 10)  toAward.push('challenge_10');

  const ADVANCED_TIERS = new Set(['gold', 'platinum', 'diamond', 'champion', 'titan', 'olympian']);
  if (!already.has('gold_rank')    && tiers.some((t) => ADVANCED_TIERS.has(t))) toAward.push('gold_rank');
  if (!already.has('diamond_rank') && tiers.some((t) => ['diamond','champion','titan','olympian'].includes(t))) toAward.push('diamond_rank');

  await Promise.all(toAward.map((key) => awardBadge(userId, key)));
  return toAward;
}

// ─── Challenges ───────────────────────────────────────────────────────────────
gamificationRouter.get('/challenges', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = getWeekStart();

    // Get all challenges
    const challenges = await query('SELECT * FROM challenges ORDER BY cadence, title');

    // Get user progress for current period
    const progress = await query(
      `SELECT uc.challenge_id, uc.progress, uc.completed_at
       FROM user_challenges uc
       JOIN challenges c ON c.id = uc.challenge_id
       WHERE uc.user_id = $1
         AND (
           (c.cadence = 'daily'  AND uc.period_start = $2) OR
           (c.cadence = 'weekly' AND uc.period_start = $3)
         )`,
      [req.user.sub, today, weekStart]
    );

    const progressMap = new Map(progress.rows.map((r) => [r.challenge_id, r]));

    const result = challenges.rows.map((c) => {
      const p = progressMap.get(c.id);
      return {
        ...c,
        userProgress: p?.progress ?? 0,
        completed: p?.completed_at != null,
        completedAt: p?.completed_at ?? null
      };
    });

    return res.json({ challenges: result });
  } catch (error) {
    return next(error);
  }
});

// Internal helper — increment challenge progress for a user
export async function incrementChallenge(userId, challengeKey, amount = 1) {
  const cRow = await query('SELECT * FROM challenges WHERE key = $1', [challengeKey]);
  if (cRow.rowCount === 0) return;
  const challenge = cRow.rows[0];

  const periodStart = challenge.cadence === 'daily' ? new Date().toISOString().slice(0, 10) : getWeekStart();

  // Upsert user_challenges row
  const upserted = await query(
    `INSERT INTO user_challenges (user_id, challenge_id, period_start, progress)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, challenge_id, period_start)
     DO UPDATE SET progress = LEAST(user_challenges.progress + $4, challenges.goal)
     FROM challenges WHERE challenges.id = user_challenges.challenge_id
     RETURNING user_challenges.*`,
    [userId, challenge.id, periodStart, amount]
  );

  if (upserted.rowCount === 0) return;
  const row = upserted.rows[0];

  // Mark complete and award XP if goal reached for first time
  if (row.progress >= challenge.goal && row.completed_at == null) {
    await query(
      'UPDATE user_challenges SET completed_at = NOW() WHERE id = $1',
      [row.id]
    );
    await awardXP(userId, `challenge_${challengeKey}`, challenge.xp_reward);
    await checkAndAwardBadges(userId);
  }
}

// ─── Streak calculation ───────────────────────────────────────────────────────
export async function computeWorkoutStreak(userId) {
  const result = await query(
    `SELECT DISTINCT DATE(COALESCE(completed_at, started_at))::date AS day
     FROM workouts
     WHERE user_id = $1 AND COALESCE(completed_at, started_at) IS NOT NULL
     ORDER BY day DESC`,
    [userId]
  );

  const days = result.rows.map((r) => r.day);
  if (days.length === 0) return 0;

  let streak = 0;
  let expected = new Date();
  expected.setHours(0, 0, 0, 0);

  for (const day of days) {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((expected - d) / 86400000);
    if (diff === 0 || diff === 1) {
      streak++;
      expected = d;
    } else {
      break;
    }
  }

  // Award streak badges
  if (streak >= 7)  await awardBadge(userId, 'streak_7');
  if (streak >= 30) await awardBadge(userId, 'streak_30');

  return streak;
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().slice(0, 10);
}

// ─── Weekly Summary ───────────────────────────────────────────────────────────
gamificationRouter.get('/weekly-summary', async (req, res, next) => {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const [workoutsRes, mealsRes, xpRes, activitiesRes] = await Promise.all([
      query(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(calories_burned), 0)::int AS total_calories,
                COALESCE(SUM(duration_seconds), 0)::int AS total_seconds
         FROM workouts
         WHERE user_id = $1 AND COALESCE(completed_at, started_at) >= $2`,
        [req.user.sub, weekStart.toISOString()]
      ),
      query(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(calories), 0)::int AS total_calories,
                COALESCE(SUM(protein_g), 0)::numeric AS total_protein
         FROM nutrition_logs
         WHERE user_id = $1 AND consumed_at >= $2`,
        [req.user.sub, weekStart.toISOString()]
      ),
      query(
        `SELECT COALESCE(SUM(xp), 0)::int AS total_xp
         FROM user_xp
         WHERE user_id = $1 AND created_at >= $2`,
        [req.user.sub, weekStart.toISOString()]
      ),
      query(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(distance_km), 0)::numeric AS total_km
         FROM activities
         WHERE user_id = $1 AND started_at >= $2`,
        [req.user.sub, weekStart.toISOString()]
      ),
    ]);

    return res.json({
      weekStart: weekStart.toISOString(),
      workouts: {
        count: Number(workoutsRes.rows[0].count),
        caloriesBurned: workoutsRes.rows[0].total_calories,
        totalSeconds: workoutsRes.rows[0].total_seconds,
      },
      meals: {
        count: Number(mealsRes.rows[0].count),
        totalCalories: mealsRes.rows[0].total_calories,
        totalProteinG: Number(mealsRes.rows[0].total_protein),
      },
      activities: {
        count: Number(activitiesRes.rows[0].count),
        totalKm: Number(activitiesRes.rows[0].total_km),
      },
      xpGained: xpRes.rows[0].total_xp,
    });
  } catch (error) {
    return next(error);
  }
});
