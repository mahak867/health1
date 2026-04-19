import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { awardXP, checkAndAwardBadges, incrementChallenge } from '../gamification/routes.js';
import { XP_EVENTS } from '../gamification/service.js';

const activitySchema = z.object({
  activityType:    z.enum(['run','ride','walk','swim','hike','row','other']).default('other'),
  title:           z.string().min(1),
  distanceM:       z.number().min(0).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  caloriesBurned:  z.number().int().min(0).optional(),
  avgHeartRate:    z.number().int().min(0).optional(),
  elevationM:      z.number().optional(),
  routeGeojson:    z.record(z.any()).optional(),
  notes:           z.string().optional(),
  startedAt:       z.string().datetime().nullable().optional(),
  completedAt:     z.string().datetime().optional()
});

export const activitiesRouter = Router();

activitiesRouter.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM activities WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 100',
      [req.user.sub]
    );
    return res.json({ activities: result.rows });
  } catch (error) {
    return next(error);
  }
});

activitiesRouter.post('/', async (req, res, next) => {
  try {
    const input = activitySchema.parse(req.body);
    const created = await query(
      `INSERT INTO activities
         (user_id, activity_type, title, distance_m, duration_seconds, calories_burned,
          avg_heart_rate, elevation_m, route_geojson, notes, started_at, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)
       RETURNING *`,
      [
        req.user.sub,
        input.activityType,
        input.title,
        input.distanceM ?? null,
        input.durationSeconds ?? null,
        input.caloriesBurned ?? null,
        input.avgHeartRate ?? null,
        input.elevationM ?? null,
        input.routeGeojson ? JSON.stringify(input.routeGeojson) : null,
        input.notes ?? null,
        input.startedAt ?? null,
        input.completedAt ?? new Date().toISOString()
      ]
    );

    const activity = created.rows[0];

    // Award XP + badges + challenges (non-blocking)
    Promise.all([
      awardXP(req.user.sub, 'activity_logged', XP_EVENTS.activity_logged),
      checkAndAwardBadges(req.user.sub),
      incrementChallenge(req.user.sub, 'weekly_cardio'),
    ]).catch(() => {});

    return res.status(201).json({ activity });
  } catch (error) {
    return next(error);
  }
});

activitiesRouter.get('/:activityId', async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const result = await query(
      'SELECT * FROM activities WHERE id = $1 AND user_id = $2',
      [activityId, req.user.sub]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Activity not found' });
    return res.json({ activity: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

activitiesRouter.delete('/:activityId', async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const deleted = await query(
      'DELETE FROM activities WHERE id = $1 AND user_id = $2 RETURNING id',
      [activityId, req.user.sub]
    );
    if (deleted.rowCount === 0) return res.status(404).json({ error: 'Activity not found' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// ─── Kudos / reactions ────────────────────────────────────────────────────────
activitiesRouter.post('/:activityId/kudos', async (req, res, next) => {
  try {
    const { activityId } = req.params;
    // Ensure activity exists (public — can react to any user's activity)
    const owns = await query('SELECT user_id FROM activities WHERE id = $1', [activityId]);
    if (owns.rowCount === 0) return res.status(404).json({ error: 'Activity not found' });

    await query(
      `INSERT INTO activity_reactions (activity_id, user_id, reaction)
       VALUES ($1, $2, 'kudos')
       ON CONFLICT (activity_id, user_id) DO NOTHING`,
      [activityId, req.user.sub]
    );

    const countResult = await query(
      "SELECT COUNT(*)::int AS kudos FROM activity_reactions WHERE activity_id = $1 AND reaction = 'kudos'",
      [activityId]
    );
    return res.json({ kudos: countResult.rows[0].kudos });
  } catch (error) {
    return next(error);
  }
});

activitiesRouter.delete('/:activityId/kudos', async (req, res, next) => {
  try {
    const { activityId } = req.params;
    await query(
      'DELETE FROM activity_reactions WHERE activity_id = $1 AND user_id = $2',
      [activityId, req.user.sub]
    );
    const countResult = await query(
      "SELECT COUNT(*)::int AS kudos FROM activity_reactions WHERE activity_id = $1 AND reaction = 'kudos'",
      [activityId]
    );
    return res.json({ kudos: countResult.rows[0].kudos });
  } catch (error) {
    return next(error);
  }
});

// ─── Social feed — workouts + activities from followed users ──────────────────
activitiesRouter.get('/feed/following', async (req, res, next) => {
  try {
    const schema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) });
    const { limit } = schema.parse(req.query);

    // Activities from followed users
    const activitiesResult = await query(
      `SELECT a.*, u.full_name, u.id AS author_id,
              COALESCE(r.kudos, 0) AS kudos_count,
              EXISTS(
                SELECT 1 FROM activity_reactions ar2
                WHERE ar2.activity_id = a.id AND ar2.user_id = $1
              ) AS viewer_gave_kudos,
              'activity' AS feed_type
       FROM activities a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN (
         SELECT activity_id, COUNT(*)::int AS kudos
         FROM activity_reactions WHERE reaction = 'kudos'
         GROUP BY activity_id
       ) r ON r.activity_id = a.id
       WHERE a.user_id IN (
         SELECT following_id FROM social_follows WHERE follower_id = $1
       )
       ORDER BY a.completed_at DESC
       LIMIT $2`,
      [req.user.sub, limit]
    );

    // Workouts from followed users
    const workoutsResult = await query(
      `SELECT w.id, w.title, w.duration_seconds, w.calories_burned,
              w.started_at, w.completed_at,
              u.full_name, u.id AS author_id,
              'workout' AS feed_type
       FROM workouts w
       JOIN users u ON u.id = w.user_id
       WHERE w.user_id IN (
         SELECT following_id FROM social_follows WHERE follower_id = $1
       )
       ORDER BY COALESCE(w.completed_at, w.started_at) DESC
       LIMIT $2`,
      [req.user.sub, limit]
    );

    // Merge and sort by time
    const items = [
      ...activitiesResult.rows.map((r) => ({ ...r, timestamp: r.completed_at })),
      ...workoutsResult.rows.map((r) => ({ ...r, timestamp: r.completed_at ?? r.started_at }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    return res.json({ feed: items });
  } catch (error) {
    return next(error);
  }
});
