import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

export const adminRouter = Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

adminRouter.use(requireAdmin);

adminRouter.get('/users', async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100)
    });

    const { role, limit } = schema.parse(req.query);

    const roles = role ? role.split(',').map((r) => r.trim()) : [];
    if (roles.length > 0) {
      const result = await query(
        `SELECT id, email, full_name, role, created_at FROM users WHERE role = ANY($1::user_role[]) ORDER BY created_at DESC LIMIT $2`,
        [roles, limit]
      );
      return res.json({ users: result.rows });
    }

    const result = await query(
      'SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return res.json({ users: result.rows });
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await query('SELECT id, email, full_name, role, created_at FROM users WHERE id = $1', [userId]);
    if (user.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    const profile = await query('SELECT * FROM health_profiles WHERE user_id = $1', [userId]);
    return res.json({ user: user.rows[0], profile: profile.rows[0] ?? null });
  } catch (error) {
    return next(error);
  }
});

adminRouter.patch('/users/:userId', async (req, res, next) => {
  try {
    const schema = z.object({ role: z.enum(['user', 'doctor', 'trainer', 'nutritionist', 'admin']).optional() });
    const input = schema.parse(req.body);

    if (!input.role) return res.status(400).json({ error: 'Nothing to update' });

    const updated = await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role',
      [input.role, req.params.userId]
    );

    if (updated.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: updated.rows[0] });
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/audit', async (req, res, next) => {
  try {
    const schema = z.object({ limit: z.coerce.number().int().min(1).max(1000).default(200) });
    const { limit } = schema.parse(req.query);
    const result = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.json({ logs: result.rows });
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [
      users,
      vitals,
      workouts,
      meals,
      appointments,
      appointmentsToday,
      reportsQueued,
      rankings,
      recommendations,
      auditLast24h
    ] = await Promise.all([
      query(`SELECT
               COUNT(*)                                         AS total,
               COUNT(*) FILTER (WHERE role = 'user')           AS users,
               COUNT(*) FILTER (WHERE role = 'doctor')         AS doctors,
               COUNT(*) FILTER (WHERE role = 'trainer')        AS trainers,
               COUNT(*) FILTER (WHERE role = 'nutritionist')   AS nutritionists,
               COUNT(*) FILTER (WHERE role = 'admin')          AS admins,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_last_30d
             FROM users`),
      query(`SELECT
               COUNT(*)                                                        AS total,
               COUNT(*) FILTER (WHERE recorded_at >= NOW() - INTERVAL '7 days') AS last_7d
             FROM vitals`),
      query(`SELECT COUNT(*) AS total FROM workouts`),
      query(`SELECT COUNT(*) AS total FROM nutrition_logs`),
      query(`SELECT
               COUNT(*)                                                         AS total,
               COUNT(*) FILTER (WHERE status = 'scheduled')                    AS scheduled,
               COUNT(*) FILTER (WHERE starts_at >= NOW())                      AS upcoming
             FROM appointments`),
      query(`SELECT COUNT(*)::int AS today FROM appointments WHERE starts_at::date = CURRENT_DATE`),
      query(`SELECT COUNT(*)::int AS queued FROM reports WHERE status = 'queued'`),
      query(`SELECT COUNT(*) AS total FROM muscle_rankings`),
      query(`SELECT COUNT(*) AS total FROM recommendation_events
             WHERE generated_at >= NOW() - INTERVAL '30 days'`),
      query(`SELECT COUNT(*)::int AS count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours'`)
    ]);

    return res.json({
      stats: {
        users: users.rows[0],
        vitals: vitals.rows[0],
        workouts: { total: workouts.rows[0].total },
        meals: { total: meals.rows[0].total },
        appointments: {
          ...appointments.rows[0],
          today: appointmentsToday.rows[0].today
        },
        reports_queued: reportsQueued.rows[0].queued,
        rankings: { total: rankings.rows[0].total },
        ai_recommendations_last_30d: recommendations.rows[0].total,
        audit_events_last_24h: auditLast24h.rows[0].count
      }
    });
  } catch (error) {
    return next(error);
  }
});

// ─── Platform Analytics ───────────────────────────────────────────────────────
adminRouter.get('/analytics', async (_req, res, next) => {
  try {
    const [
      vitalsTrends,
      workoutVolume,
      nutritionCompliance,
      appointmentUtilization
    ] = await Promise.all([
      // Vitals Trends: weekly platform averages for last 8 weeks
      query(`
        SELECT
          DATE_TRUNC('week', recorded_at)::date AS week_start,
          ROUND(AVG(heart_rate))::int           AS avg_heart_rate,
          ROUND(AVG(systolic_bp))::int          AS avg_systolic_bp,
          ROUND(AVG(diastolic_bp))::int         AS avg_diastolic_bp,
          ROUND(AVG(spo2)::numeric, 1)          AS avg_spo2,
          COUNT(*)::int                         AS readings
        FROM vitals
        WHERE recorded_at >= NOW() - INTERVAL '8 weeks'
          AND (heart_rate IS NOT NULL OR systolic_bp IS NOT NULL OR spo2 IS NOT NULL)
        GROUP BY week_start
        ORDER BY week_start ASC`),

      // Workout Volume: per-muscle-group total sets in last 4 weeks
      query(`
        SELECT
          LOWER(we.muscle_group)          AS muscle_group,
          SUM(we.sets)::int               AS total_sets,
          COUNT(DISTINCT w.id)::int       AS workouts,
          COUNT(DISTINCT w.user_id)::int  AS active_users
        FROM workout_exercises we
        JOIN workouts w ON w.id = we.workout_id
        WHERE COALESCE(w.completed_at, w.started_at) >= NOW() - INTERVAL '4 weeks'
        GROUP BY muscle_group
        ORDER BY total_sets DESC
        LIMIT 15`),

      // Nutrition Compliance: daily avg calories & macros vs logged entries in last 30 days
      query(`
        SELECT
          DATE(consumed_at)                      AS day,
          COUNT(DISTINCT user_id)::int           AS users_logged,
          ROUND(AVG(calories))::int              AS avg_calories,
          ROUND(AVG(protein_g)::numeric, 1)      AS avg_protein_g,
          ROUND(AVG(carbs_g)::numeric, 1)        AS avg_carbs_g,
          ROUND(AVG(fat_g)::numeric, 1)          AS avg_fat_g
        FROM nutrition_logs
        WHERE consumed_at >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day DESC
        LIMIT 30`),

      // Appointment Utilization: by provider role for all time
      query(`
        SELECT
          u.role                                                          AS provider_role,
          COUNT(*)::int                                                   AS total,
          COUNT(*) FILTER (WHERE a.status = 'completed')::int            AS completed,
          COUNT(*) FILTER (WHERE a.status = 'cancelled')::int            AS cancelled,
          COUNT(*) FILTER (WHERE a.status = 'no_show')::int              AS no_show,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE a.status = 'completed')
            / NULLIF(COUNT(*), 0), 1
          )::numeric                                                      AS completion_rate_pct
        FROM appointments a
        JOIN users u ON u.id = a.provider_user_id
        GROUP BY u.role
        ORDER BY total DESC`)
    ]);

    return res.json({
      analytics: {
        vitalsTrends:          vitalsTrends.rows,
        workoutVolume:         workoutVolume.rows,
        nutritionCompliance:   nutritionCompliance.rows,
        appointmentUtilization: appointmentUtilization.rows
      }
    });
  } catch (error) {
    return next(error);
  }
});
