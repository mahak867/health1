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
