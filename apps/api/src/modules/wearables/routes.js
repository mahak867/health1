import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

const syncSchema = z.object({
  provider: z.string().min(1),
  readings: z.array(
    z.object({
      metricType: z.string().min(1),
      metricValue: z.record(z.any()),
      measuredAt: z.string().datetime()
    })
  ).min(1).max(500)
});

export const wearablesRouter = Router();

wearablesRouter.post('/sync', async (req, res, next) => {
  try {
    const input = syncSchema.parse(req.body);
    const inserts = input.readings.map((r) =>
      query(
        `INSERT INTO wearables_data (user_id, provider, metric_type, metric_value, measured_at)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [req.user.sub, input.provider, r.metricType, JSON.stringify(r.metricValue), r.measuredAt]
      )
    );

    await Promise.all(inserts);
    return res.status(201).json({ synced: input.readings.length });
  } catch (error) {
    return next(error);
  }
});

wearablesRouter.get('/data', async (req, res, next) => {
  try {
    const schema = z.object({
      provider: z.string().optional(),
      metricType: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100)
    });

    const { provider, metricType, limit } = schema.parse(req.query);

    const conditions = ['user_id = $1'];
    const params = [req.user.sub];
    if (provider) { params.push(provider); conditions.push(`provider = $${params.length}`); }
    if (metricType) { params.push(metricType); conditions.push(`metric_type = $${params.length}`); }
    params.push(limit);

    const result = await query(
      `SELECT * FROM wearables_data WHERE ${conditions.join(' AND ')} ORDER BY measured_at DESC LIMIT $${params.length}`,
      params
    );

    return res.json({ data: result.rows });
  } catch (error) {
    return next(error);
  }
});
