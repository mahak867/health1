import { query } from '../../config/db.js';

export function auditLog(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    if (!req.user?.sub) return;

    const action = `${req.method} ${req.baseUrl || ''}${req.path}`.trim();
    const metadata = {
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null
    };

    query(
      `INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [req.user.sub, action, 'http_request', null, JSON.stringify(metadata)]
    ).catch(() => {});
  });

  next();
}
