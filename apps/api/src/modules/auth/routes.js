import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { hashText, compareHash } from '../../core/utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../core/utils/jwt.js';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['user', 'doctor', 'trainer', 'nutritionist', 'admin']).default('user')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export const authRouter = Router();

authRouter.post('/signup', async (req, res, next) => {
  try {
    const input = signupSchema.parse(req.body);
    const hashedPassword = await hashText(input.password);
    const created = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, full_name, role`,
      [input.email, hashedPassword, input.name, input.role]
    );

    if (created.rowCount === 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const user = created.rows[0];
    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role, email: user.email });

    return res.status(201).json({ user, accessToken, refreshToken });
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const found = await query('SELECT id, email, full_name, role, password_hash FROM users WHERE email = $1', [input.email]);

    if (found.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = found.rows[0];
    const valid = await compareHash(input.password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role, email: user.email });

    return res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      accessToken,
      refreshToken
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const input = refreshSchema.parse(req.body);
    const payload = verifyRefreshToken(input.refreshToken);
    const accessToken = signAccessToken({ sub: payload.sub, role: payload.role, email: payload.email });
    return res.json({ accessToken });
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/google', async (_req, res) => {
  return res.status(501).json({
    error: 'Google OAuth token verification endpoint scaffolded; integrate provider verification before production use.'
  });
});
