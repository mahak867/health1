import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

const prefsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  categories: z.record(z.boolean()).optional()
});

export const notificationsRouter = Router();

notificationsRouter.get('/preferences', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM notification_preferences WHERE user_id = $1', [req.user.sub]);
    return res.json({ preferences: result.rows[0] ?? null });
  } catch (error) {
    return next(error);
  }
});

notificationsRouter.put('/preferences', async (req, res, next) => {
  try {
    const input = prefsSchema.parse(req.body);
    const updated = await query(
      `INSERT INTO notification_preferences (user_id, email_enabled, push_enabled, sms_enabled, categories, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         email_enabled = COALESCE($2, notification_preferences.email_enabled),
         push_enabled  = COALESCE($3, notification_preferences.push_enabled),
         sms_enabled   = COALESCE($4, notification_preferences.sms_enabled),
         categories    = CASE WHEN $5::jsonb IS NOT NULL
                           THEN notification_preferences.categories || $5::jsonb
                           ELSE notification_preferences.categories END,
         updated_at    = NOW()
       RETURNING *`,
      [
        req.user.sub,
        input.emailEnabled ?? null,
        input.pushEnabled ?? null,
        input.smsEnabled ?? null,
        input.categories ? JSON.stringify(input.categories) : null
      ]
    );

    return res.json({ preferences: updated.rows[0] });
  } catch (error) {
    return next(error);
  }
});

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY COALESCE(scheduled_at, NOW()) DESC LIMIT 100',
      [req.user.sub]
    );
    return res.json({ notifications: result.rows });
  } catch (error) {
    return next(error);
  }
});

notificationsRouter.post('/schedule', async (req, res, next) => {
  try {
    const schema = z.object({
      category: z.string().min(1),
      channel: z.enum(['email', 'push', 'sms']),
      payload: z.record(z.any()),
      scheduledAt: z.string().datetime().optional()
    });

    const input = schema.parse(req.body);
    const created = await query(
      `INSERT INTO notifications (user_id, category, channel, payload, scheduled_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING *`,
      [
        req.user.sub,
        input.category,
        input.channel,
        JSON.stringify(input.payload),
        input.scheduledAt ?? null
      ]
    );

    return res.status(201).json({ notification: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});
