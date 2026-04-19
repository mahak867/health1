import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

export const socialRouter = Router();

socialRouter.get('/leaderboard', async (req, res, next) => {
  try {
    const schema = z.object({
      muscleGroup: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20)
    });

    const { muscleGroup, limit } = schema.parse(req.query);

    const params = [limit];
    const muscleFilter = muscleGroup ? `AND mr.muscle_group = $2` : '';
    if (muscleGroup) params.unshift(muscleGroup);

    const result = await query(
      `SELECT u.id, u.full_name, mr.muscle_group, mr.score, mr.tier
       FROM muscle_rankings mr
       JOIN users u ON u.id = mr.user_id
       WHERE 1=1 ${muscleFilter}
       ORDER BY mr.score DESC
       LIMIT $${params.length}`,
      muscleGroup ? [muscleGroup, limit] : [limit]
    );

    return res.json({ leaderboard: result.rows });
  } catch (error) {
    return next(error);
  }
});

socialRouter.post('/follow', async (req, res, next) => {
  try {
    const schema = z.object({ followingId: z.string().uuid() });
    const { followingId } = schema.parse(req.body);

    if (followingId === req.user.sub) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    await query(
      `INSERT INTO social_follows (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.user.sub, followingId]
    );

    return res.status(201).json({ followed: followingId });
  } catch (error) {
    return next(error);
  }
});

socialRouter.delete('/follow', async (req, res, next) => {
  try {
    const schema = z.object({ followingId: z.string().uuid() });
    const { followingId } = schema.parse(req.body);

    await query(
      'DELETE FROM social_follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.sub, followingId]
    );

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

socialRouter.get('/following', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name, u.role
       FROM social_follows sf
       JOIN users u ON u.id = sf.following_id
       WHERE sf.follower_id = $1`,
      [req.user.sub]
    );
    return res.json({ following: result.rows });
  } catch (error) {
    return next(error);
  }
});

socialRouter.get('/followers', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name, u.role
       FROM social_follows sf
       JOIN users u ON u.id = sf.follower_id
       WHERE sf.following_id = $1`,
      [req.user.sub]
    );
    return res.json({ followers: result.rows });
  } catch (error) {
    return next(error);
  }
});
