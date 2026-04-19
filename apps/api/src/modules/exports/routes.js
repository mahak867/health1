import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

const reportSchema = z.object({
  reportType: z.enum(['health', 'fitness', 'nutrition', 'combined']),
  format: z.enum(['pdf', 'csv']).default('pdf'),
  filters: z.record(z.any()).optional()
});

export const exportsRouter = Router();

exportsRouter.get('/reports', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const result = isAdmin
      ? await query('SELECT * FROM reports ORDER BY requested_at DESC LIMIT 200')
      : await query('SELECT * FROM reports WHERE user_id = $1 ORDER BY requested_at DESC LIMIT 200', [req.user.sub]);

    return res.json({ reports: result.rows });
  } catch (error) {
    return next(error);
  }
});

exportsRouter.post('/reports', async (req, res, next) => {
  try {
    const input = reportSchema.parse(req.body);
    const created = await query(
      `INSERT INTO reports (user_id, report_type, format, status, filters)
       VALUES ($1, $2, $3, 'queued', $4::jsonb)
       RETURNING *`,
      [req.user.sub, input.reportType, input.format, JSON.stringify(input.filters ?? {})]
    );

    return res.status(202).json({ report: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});
