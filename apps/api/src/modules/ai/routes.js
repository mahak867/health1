import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { detectRecoveryNeed, nutritionInsight, fitnessProgressInsight, estimateVO2Max } from './service.js';

const recommendationSchema = z.object({
  sleepHours: z.number().min(0).max(24).default(6.5),
  restingHeartRateDelta: z.number().default(2),
  workoutLoad: z.number().min(0).default(0.6),
  calorieDeficit: z.number().default(0),
  proteinG: z.number().min(0).default(120),
  weightKg: z.number().min(20).max(500).default(75),
  weeklyVolumeChange: z.number().default(0.1),
  injuryRisk: z.number().min(0).max(1).default(0.2)
});

export const aiRouter = Router();

aiRouter.post('/recommendations', async (req, res, next) => {
  try {
    const input = recommendationSchema.parse(req.body);

    const recovery = detectRecoveryNeed(input);
    const nutrition = nutritionInsight(input);
    const fitness = fitnessProgressInsight(input);

    const result = {
      recovery,
      nutrition,
      fitness,
      allRecommendations: [
        ...recovery.recommendations,
        ...nutrition.recommendations,
        ...fitness.recommendations
      ]
    };

    await query(
      `INSERT INTO recommendation_events (user_id, inputs, result)
       VALUES ($1, $2::jsonb, $3::jsonb)`,
      [req.user.sub, JSON.stringify(input), JSON.stringify(result)]
    ).catch(() => {});

    return res.json({ module: 'ai', insight: result });
  } catch (error) {
    return next(error);
  }
});

aiRouter.get('/vo2max', (req, res, next) => {
  try {
    const schema = z.object({
      maxHeartRate: z.coerce.number().int().min(100).max(250),
      restingHeartRate: z.coerce.number().int().min(30).max(120)
    });

    const input = schema.parse(req.query);
    const estimate = estimateVO2Max(input);

    return res.json({ module: 'ai', vo2max: estimate });
  } catch (error) {
    return next(error);
  }
});

aiRouter.get('/history', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM recommendation_events WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 50',
      [req.user.sub]
    );
    return res.json({ history: result.rows });
  } catch (error) {
    return next(error);
  }
});

// ─── Smart AI Chat ─────────────────────────────────────────────────────────
// Context-aware chat that pulls the user's recent data and generates insights.
aiRouter.post('/chat', async (req, res, next) => {
  try {
    const { message } = z.object({ message: z.string().min(1).max(1000) }).parse(req.body);

    // Gather user context (non-blocking, best-effort)
    const [vitalsRes, workoutsRes, mealsRes, xpRes] = await Promise.allSettled([
      query('SELECT heart_rate, spo2, sleep_hours, stress_level, calories_burned, recorded_at FROM health_vitals WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 3', [req.user.sub]),
      query('SELECT title, calories_burned, duration_seconds FROM workouts WHERE user_id = $1 ORDER BY COALESCE(completed_at, started_at) DESC NULLS LAST LIMIT 3', [req.user.sub]),
      query('SELECT meal_name, calories, protein_g FROM nutrition_logs WHERE user_id = $1 ORDER BY consumed_at DESC LIMIT 5', [req.user.sub]),
      query('SELECT COALESCE(SUM(xp),0)::int AS total FROM user_xp WHERE user_id = $1', [req.user.sub]),
    ]);

    const vitals   = vitalsRes.status   === 'fulfilled' ? vitalsRes.value.rows : [];
    const workouts = workoutsRes.status === 'fulfilled' ? workoutsRes.value.rows : [];
    const meals    = mealsRes.status    === 'fulfilled' ? mealsRes.value.rows : [];
    const totalXP  = xpRes.status       === 'fulfilled' ? xpRes.value.rows[0]?.total ?? 0 : 0;

    const lowerMsg = message.toLowerCase();

    // ─── Recovery / readiness query ──────────────────────────────────────
    if (lowerMsg.includes('recover') || lowerMsg.includes('tired') || lowerMsg.includes('rest') || lowerMsg.includes('ready')) {
      const latest = vitals[0];
      if (!latest) {
        return res.json({ reply: "I don't have any vital data for you yet. Log your heart rate, sleep hours, and stress level in Vitals so I can assess your recovery readiness." });
      }
      const hrDelta = latest.heart_rate ? Math.max(0, latest.heart_rate - 65) : 0;
      const insight = detectRecoveryNeed({
        sleepHours: latest.sleep_hours ?? 7,
        restingHeartRateDelta: hrDelta,
        workoutLoad: workouts.length >= 3 ? 1.1 : 0.8,
      });
      const readinessBadge = { high: '✅', moderate: '⚠️', low: '🛑' }[insight.readiness];
      return res.json({
        reply: `${readinessBadge} **Recovery Score: ${insight.recoveryScore}/100** (${insight.readiness} readiness)\n\n` +
          insight.recommendations.map((r) => `• ${r}`).join('\n') +
          (latest.sleep_hours ? `\n\n_Based on ${latest.sleep_hours}h sleep and HR data from ${new Date(latest.recorded_at).toLocaleDateString()}._` : '')
      });
    }

    // ─── Nutrition / protein / macro query ───────────────────────────────
    if (lowerMsg.includes('protein') || lowerMsg.includes('macro') || lowerMsg.includes('diet') || lowerMsg.includes('eat') || lowerMsg.includes('calor') || lowerMsg.includes('nutri')) {
      const todayMeals = meals.filter((m) => new Date(m.consumed_at ?? Date.now()).toDateString() === new Date().toDateString()).length
        ? meals.filter((m) => new Date(m.consumed_at ?? Date.now()).toDateString() === new Date().toDateString())
        : meals.slice(0, 5);
      const totalPro = todayMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0);
      const totalCal = todayMeals.reduce((s, m) => s + (m.calories ?? 0), 0);
      const insight = nutritionInsight({ calorieDeficit: 2000 - totalCal, proteinG: totalPro, weightKg: 75 });
      return res.json({
        reply: `🥗 **Nutrition Check** — ${totalCal} kcal | ${totalPro.toFixed(0)}g protein logged today.\n\n` +
          `Protein per kg: **${insight.proteinPerKg}g/kg** (target 1.62–2.2g/kg)\n\n` +
          insight.recommendations.map((r) => `• ${r}`).join('\n')
      });
    }

    // ─── Workout / training / volume query ───────────────────────────────
    if (lowerMsg.includes('workout') || lowerMsg.includes('train') || lowerMsg.includes('lift') || lowerMsg.includes('progress') || lowerMsg.includes('volume')) {
      if (workouts.length === 0) {
        return res.json({ reply: "You haven't logged any workouts yet! Head to the Workouts page to log your first session and I'll start tracking your progress." });
      }
      const recent = workouts.slice(0, 3);
      return res.json({
        reply: `🏋️ **Recent Training** — ${workouts.length} workouts in history.\n\n` +
          recent.map((w) => `• **${w.title}** — ${w.calories_burned ? `${w.calories_burned} kcal` : 'no calories logged'}${w.duration_seconds ? `, ${Math.round(w.duration_seconds / 60)} min` : ''}`).join('\n') +
          `\n\nYou have **${totalXP} total XP**. Keep logging to unlock more badges and level up! 🎮`
      });
    }

    // ─── VO2Max / cardio query ────────────────────────────────────────────
    if (lowerMsg.includes('vo2') || lowerMsg.includes('cardio') || lowerMsg.includes('endurance') || lowerMsg.includes('heart rate max')) {
      const latest = vitals[0];
      if (latest?.heart_rate) {
        const estimate = estimateVO2Max({ maxHeartRate: 220 - 30, restingHeartRate: latest.heart_rate });
        return res.json({
          reply: `❤️ **VO2Max Estimate: ${estimate?.vo2max} mL/kg/min** (${estimate?.category})\n\nBased on Uth-Sørensen formula using your resting HR of ${latest.heart_rate} bpm. This estimate assumes age 30 — for a more accurate result, use the dedicated VO2Max tool in the AI Engine.\n\n_Improve VO2Max with Zone-2 cardio 3-4×/week (60-70% max HR)._`
        });
      }
      return res.json({ reply: "Log your resting heart rate in Vitals and I'll estimate your VO2Max using the Uth-Sørensen formula. Also try the dedicated VO2Max calculator in the AI Engine!" });
    }

    // ─── XP / level / gamification query ─────────────────────────────────
    if (lowerMsg.includes('xp') || lowerMsg.includes('level') || lowerMsg.includes('badge') || lowerMsg.includes('challenge')) {
      return res.json({
        reply: `🎮 **Gamification Status**\n\nYou have **${totalXP} XP** total. Check the Gamification page to see:\n• Your current level and XP progress ring\n• Daily & weekly challenge progress\n• Your earned badges (20 types available)\n• The Global Leaderboard ranking\n\nKeep logging workouts, meals and activities to earn XP and unlock badges!`
      });
    }

    // ─── Default: general health summary ─────────────────────────────────
    const latest = vitals[0];
    const summaryParts = [];
    if (workouts.length > 0) summaryParts.push(`${workouts.length} workouts tracked`);
    if (meals.length > 0) summaryParts.push(`${meals.length} recent meals`);
    if (latest?.sleep_hours) summaryParts.push(`${latest.sleep_hours}h sleep last logged`);

    return res.json({
      reply: `👋 I'm your AI Health Coach! I can help with:\n\n` +
        `• **Recovery & readiness** — ask "Am I ready to train?"\n` +
        `• **Nutrition advice** — ask "How's my protein intake?"\n` +
        `• **Training progress** — ask "How are my workouts?"\n` +
        `• **VO2Max & cardio** — ask "What's my VO2Max?"\n` +
        `• **Gamification** — ask "How many XP do I have?"\n\n` +
        (summaryParts.length ? `_Your data: ${summaryParts.join(' · ')}_` : '_Start logging data to get personalized insights!_')
    });
  } catch (error) {
    return next(error);
  }
});
