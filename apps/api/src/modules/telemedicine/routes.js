import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

const appointmentSchema = z.object({
  providerUserId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.string().default('scheduled'),
  meetingUrl: z.string().url().nullable().optional()
});

const consultationSchema = z.object({
  notes: z.string().nullable().optional(),
  summary: z.string().nullable().optional()
});

export const telemedicineRouter = Router();

telemedicineRouter.get('/appointments', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM appointments
       WHERE user_id = $1 OR provider_user_id = $1
       ORDER BY starts_at DESC
       LIMIT 100`,
      [req.user.sub]
    );
    return res.json({ appointments: result.rows });
  } catch (error) {
    return next(error);
  }
});

telemedicineRouter.post('/appointments', async (req, res, next) => {
  try {
    const input = appointmentSchema.parse(req.body);
    const created = await query(
      `INSERT INTO appointments (user_id, provider_user_id, starts_at, ends_at, status, meeting_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.sub, input.providerUserId, input.startsAt, input.endsAt, input.status, input.meetingUrl ?? null]
    );

    return res.status(201).json({ appointment: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

telemedicineRouter.post('/sessions/list', async (req, res, next) => {
  try {
    const schema = z.object({ appointmentId: z.string().uuid() });
    const { appointmentId } = schema.parse(req.body);

    const access = await query(
      'SELECT id FROM appointments WHERE id = $1 AND (user_id = $2 OR provider_user_id = $2)',
      [appointmentId, req.user.sub]
    );

    if (access.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const sessions = await query('SELECT * FROM consultation_sessions WHERE appointment_id = $1 ORDER BY created_at DESC', [appointmentId]);
    return res.json({ sessions: sessions.rows });
  } catch (error) {
    return next(error);
  }
});

telemedicineRouter.post('/appointments/:appointmentId/sessions', async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const input = consultationSchema.parse(req.body);

    const access = await query(
      'SELECT id FROM appointments WHERE id = $1 AND (user_id = $2 OR provider_user_id = $2)',
      [appointmentId, req.user.sub]
    );

    if (access.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const created = await query(
      `INSERT INTO consultation_sessions (appointment_id, notes, summary, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [appointmentId, input.notes ?? null, input.summary ?? null, req.user.sub]
    );

    return res.status(201).json({ session: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

telemedicineRouter.patch('/appointments/:appointmentId', async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const schema = z.object({
      status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
      meetingUrl: z.string().url().nullable().optional()
    });

    const input = schema.parse(req.body);

    if (!input.status && input.meetingUrl === undefined) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const access = await query(
      'SELECT id FROM appointments WHERE id = $1 AND (user_id = $2 OR provider_user_id = $2)',
      [appointmentId, req.user.sub]
    );

    if (access.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const setClauses = [];
    const params = [];

    if (input.status !== undefined) { params.push(input.status); setClauses.push(`status = $${params.length}`); }
    if (input.meetingUrl !== undefined) { params.push(input.meetingUrl); setClauses.push(`meeting_url = $${params.length}`); }

    params.push(appointmentId);
    const updated = await query(
      `UPDATE appointments SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    return res.json({ appointment: updated.rows[0] });
  } catch (error) {
    return next(error);
  }
});
