import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { hashText, compareHash } from '../../core/utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../core/utils/jwt.js';
import { hashToken } from '../../core/utils/token.js';

const roleEnum = z.enum(['user', 'doctor', 'trainer', 'nutritionist', 'admin']);

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: roleEnum.default('user')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

async function persistRefreshToken(userId, refreshToken) {
  const payload = verifyRefreshToken(refreshToken);
  const expiresAt = payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(refreshToken), expiresAt.toISOString()]
  );
}

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
    await persistRefreshToken(user.id, refreshToken);

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
    await persistRefreshToken(user.id, refreshToken);

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
    const tokenHash = hashToken(input.refreshToken);

    const active = await query(
      `SELECT id FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );

    if (active.rowCount === 0) {
      return res.status(401).json({ error: 'Refresh token is invalid or expired' });
    }

    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [active.rows[0].id]);

    const accessToken = signAccessToken({ sub: payload.sub, role: payload.role, email: payload.email });
    const refreshToken = signRefreshToken({ sub: payload.sub, role: payload.role, email: payload.email });
    await persistRefreshToken(payload.sub, refreshToken);

    return res.json({ accessToken, refreshToken });
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const input = refreshSchema.parse(req.body);
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [
      hashToken(input.refreshToken)
    ]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/google', async (_req, res) => {
  return res.status(501).json({
    error: 'Google OAuth token verification endpoint scaffolded; integrate provider verification before production use.'
  });
});
