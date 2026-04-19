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
    // Parse route_geojson → route_points array for web minimap rendering
    const activities = result.rows.map((row) => {
      let routePoints = null;
      if (row.route_geojson) {
        try {
          const geo = typeof row.route_geojson === 'string'
            ? JSON.parse(row.route_geojson)
            : row.route_geojson;
          // Support both GeoJSON LineString and our custom [{lat,lon}] format
          if (geo.type === 'LineString' && Array.isArray(geo.coordinates)) {
            routePoints = geo.coordinates.map(([lon, lat]) => ({ lat, lon }));
          } else if (Array.isArray(geo)) {
            routePoints = geo.filter((p) => p.lat != null && p.lon != null);
          }
        } catch (_) {}
      }
      return { ...row, route_points: routePoints };
    });
    return res.json({ activities });
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

// ─── Activity Comments ────────────────────────────────────────────────────────
const commentSchema = z.object({ body: z.string().min(1).max(1000) });

activitiesRouter.get('/:activityId/comments', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ac.id, ac.body, ac.created_at, u.full_name, u.id AS author_id
       FROM activity_comments ac
       JOIN users u ON u.id = ac.user_id
       WHERE ac.activity_id = $1
       ORDER BY ac.created_at ASC
       LIMIT 200`,
      [req.params.activityId]
    );
    return res.json({ comments: result.rows });
  } catch (error) {
    return next(error);
  }
});

activitiesRouter.post('/:activityId/comments', async (req, res, next) => {
  try {
    const { body } = commentSchema.parse(req.body);
    // Verify the activity is visible (public or owned by requester)
    const access = await query(
      'SELECT id FROM activities WHERE id = $1',
      [req.params.activityId]
    );
    if (access.rowCount === 0) return res.status(404).json({ error: 'Activity not found' });

    const created = await query(
      `INSERT INTO activity_comments (activity_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [req.params.activityId, req.user.sub, body]
    );
    return res.status(201).json({ comment: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

activitiesRouter.delete('/:activityId/comments/:commentId', async (req, res, next) => {
  try {
    await query(
      'DELETE FROM activity_comments WHERE id = $1 AND user_id = $2',
      [req.params.commentId, req.user.sub]
    );
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// ─── Distance Personal Bests (5K / 10K / Half-Marathon / Marathon) ────────────
activitiesRouter.get('/personal-bests', async (req, res, next) => {
  try {
    // Find the fastest time (shortest duration) for each distance bucket
    // Tolerance: 5K = 4.5-5.5 km, 10K = 9-11 km, HM = 19-22 km, Full = 40-43 km
    const buckets = [
      { label: '5K',             minM: 4500,  maxM: 5500 },
      { label: '10K',            minM: 9000,  maxM: 11000 },
      { label: 'Half Marathon',  minM: 19000, maxM: 22000 },
      { label: 'Marathon',       minM: 40000, maxM: 43000 },
    ];

    const results = await Promise.all(buckets.map(async (b) => {
      const r = await query(
        `SELECT id, title, distance_m, duration_seconds, completed_at, activity_type
         FROM activities
         WHERE user_id = $1
           AND distance_m BETWEEN $2 AND $3
           AND duration_seconds IS NOT NULL AND duration_seconds > 0
         ORDER BY duration_seconds ASC
         LIMIT 1`,
        [req.user.sub, b.minM, b.maxM]
      );
      if (r.rowCount === 0) return { label: b.label, pb: null };
      const a = r.rows[0];
      const pace = a.duration_seconds / 60 / (a.distance_m / 1000); // min/km
      const paceM = Math.floor(pace);
      const paceS = Math.round((pace - paceM) * 60);
      return {
        label: b.label,
        pb: {
          activityId: a.id,
          title:         a.title,
          distanceM:     a.distance_m,
          durationSec:   a.duration_seconds,
          completedAt:   a.completed_at,
          paceMinKm:     `${paceM}:${String(paceS).padStart(2,'0')}`,
          activityType:  a.activity_type,
        }
      };
    }));

    return res.json({ personalBests: results });
  } catch (error) {
    return next(error);
  }
});
