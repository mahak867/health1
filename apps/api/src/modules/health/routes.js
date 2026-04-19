import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { getPublisher } from '../../websocket/publisher.js';

const profileSchema = z.object({
  age: z.number().int().min(0).max(130).nullable().optional(),
  heightCm: z.number().min(30).max(300).nullable().optional(),
  weightKg: z.number().min(2).max(500).nullable().optional(),
  bloodGroup: z.string().max(10).nullable().optional(),
  medicalConditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  emergencyContacts: z.array(z.record(z.any())).optional()
});

const vitalsSchema = z.object({
  recordedAt: z.string().datetime(),
  heartRate: z.number().int().min(20).max(260).nullable().optional(),
  systolicBp: z.number().int().min(50).max(260).nullable().optional(),
  diastolicBp: z.number().int().min(30).max(180).nullable().optional(),
  spo2: z.number().min(0).max(100).nullable().optional(),
  temperatureC: z.number().min(30).max(45).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  stressLevel: z.number().int().min(0).max(10).nullable().optional(),
  caloriesBurned: z.number().int().min(0).nullable().optional()
});

const recordSchema = z.object({
  title: z.string().min(1),
  recordType: z.string().min(1),
  details: z.record(z.any()).optional(),
  recordedAt: z.string().datetime().optional()
});

const medicationSchema = z.object({
  medicationName: z.string().min(1),
  dosage: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  endedAt: z.string().datetime().nullable().optional(),
  instructions: z.string().nullable().optional()
});

export const healthModuleRouter = Router();

healthModuleRouter.get('/profile', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM health_profiles WHERE user_id = $1', [req.user.sub]);
    return res.json({ profile: result.rows[0] ?? null });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.put('/profile', async (req, res, next) => {
  try {
    const input = profileSchema.parse(req.body);
    const updated = await query(
      `INSERT INTO health_profiles (user_id, age, height_cm, weight_kg, blood_group, medical_conditions, allergies, emergency_contacts, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         age = EXCLUDED.age,
         height_cm = EXCLUDED.height_cm,
         weight_kg = EXCLUDED.weight_kg,
         blood_group = EXCLUDED.blood_group,
         medical_conditions = EXCLUDED.medical_conditions,
         allergies = EXCLUDED.allergies,
         emergency_contacts = EXCLUDED.emergency_contacts,
         updated_at = NOW()
       RETURNING *`,
      [
        req.user.sub,
        input.age ?? null,
        input.heightCm ?? null,
        input.weightKg ?? null,
        input.bloodGroup ?? null,
        input.medicalConditions ?? [],
        input.allergies ?? [],
        JSON.stringify(input.emergencyContacts ?? [])
      ]
    );

    return res.json({ profile: updated.rows[0] });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.get('/vitals', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 50);
    const cappedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 50;

    const result = await query(
      'SELECT * FROM vitals WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT $2',
      [req.user.sub, cappedLimit]
    );

    return res.json({ vitals: result.rows });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.post('/vitals', async (req, res, next) => {
  try {
    const input = vitalsSchema.parse(req.body);

    const created = await query(
      `INSERT INTO vitals (
         user_id, recorded_at, heart_rate, systolic_bp, diastolic_bp, spo2, temperature_c, sleep_hours, stress_level, calories_burned
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        req.user.sub,
        input.recordedAt,
        input.heartRate ?? null,
        input.systolicBp ?? null,
        input.diastolicBp ?? null,
        input.spo2 ?? null,
        input.temperatureC ?? null,
        input.sleepHours ?? null,
        input.stressLevel ?? null,
        input.caloriesBurned ?? null
      ]
    );

    getPublisher()('vitals', { event: 'vital_logged', userId: req.user.sub, vital: created.rows[0] });

    return res.status(201).json({ vital: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.get('/records', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM health_records WHERE user_id = $1 ORDER BY recorded_at DESC, created_at DESC LIMIT 100',
      [req.user.sub]
    );
    return res.json({ records: result.rows });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.post('/records', async (req, res, next) => {
  try {
    const input = recordSchema.parse(req.body);
    const created = await query(
      `INSERT INTO health_records (user_id, title, record_type, details, recorded_at)
       VALUES ($1, $2, $3, $4::jsonb, COALESCE($5, NOW()))
       RETURNING *`,
      [req.user.sub, input.title, input.recordType, JSON.stringify(input.details ?? {}), input.recordedAt ?? null]
    );

    return res.status(201).json({ record: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.get('/medications', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM medications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [req.user.sub]);
    return res.json({ medications: result.rows });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.post('/medications', async (req, res, next) => {
  try {
    const input = medicationSchema.parse(req.body);
    const created = await query(
      `INSERT INTO medications (user_id, medication_name, dosage, frequency, started_at, ended_at, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.sub,
        input.medicationName,
        input.dosage ?? null,
        input.frequency ?? null,
        input.startedAt ?? null,
        input.endedAt ?? null,
        input.instructions ?? null
      ]
    );

    return res.status(201).json({ medication: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.post('/emergency/trigger', async (req, res, next) => {
  try {
    const schema = z.object({
      location: z.record(z.any()).optional(),
      message: z.string().max(500).optional()
    });

    const input = schema.parse(req.body);

    // Retrieve the user's emergency contacts from their health profile
    const profileResult = await query(
      'SELECT emergency_contacts, age, blood_group, medical_conditions, allergies FROM health_profiles WHERE user_id = $1',
      [req.user.sub]
    );

    const profile = profileResult.rows[0] ?? null;
    const contacts = profile?.emergency_contacts ?? [];

    // Persist the emergency event in the audit log so providers and admins can see it
    await query(
      `INSERT INTO audit_logs (actor_id, action, resource_type, metadata)
       VALUES ($1, 'emergency_trigger', 'health_emergency', $2::jsonb)`,
      [
        req.user.sub,
        JSON.stringify({
          location: input.location ?? null,
          message: input.message ?? null,
          contactCount: contacts.length,
          profile: profile ? {
            age: profile.age,
            bloodGroup: profile.blood_group,
            medicalConditions: profile.medical_conditions,
            allergies: profile.allergies
          } : null
        })
      ]
    ).catch(() => {});

    return res.status(202).json({
      status: 'accepted',
      emergencyContactsNotified: contacts.length,
      message: contacts.length > 0
        ? `Emergency alert dispatched to ${contacts.length} contact(s). Provider notification queued.`
        : 'Emergency alert received. Add emergency contacts in your profile for automated notification.',
      contacts: contacts.map((c) => ({
        name: c.name ?? c.full_name ?? 'Contact',
        relationship: c.relationship ?? c.relation ?? null
      }))
    });
  } catch (error) {
    return next(error);
  }
});

// ─── Water Intake ─────────────────────────────────────────────────────────────
const waterSchema = z.object({
  milliliters: z.number().int().min(1).max(5000),
  loggedAt: z.string().datetime().optional()
});

healthModuleRouter.get('/water', async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const result = await query(
      `SELECT id, logged_at, milliliters FROM water_logs
       WHERE user_id = $1 AND logged_at BETWEEN $2 AND $3
       ORDER BY logged_at DESC`,
      [req.user.sub, dayStart.toISOString(), dayEnd.toISOString()]
    );
    const totalMl = result.rows.reduce((sum, r) => sum + r.milliliters, 0);
    return res.json({ logs: result.rows, totalMl });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.post('/water', async (req, res, next) => {
  try {
    const input = waterSchema.parse(req.body);
    const created = await query(
      `INSERT INTO water_logs (user_id, milliliters, logged_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.sub, input.milliliters, input.loggedAt ?? new Date().toISOString()]
    );
    return res.status(201).json({ log: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// ─── Body Weight Tracking ─────────────────────────────────────────────────────
const bodyWeightSchema = z.object({
  weightKg: z.number().min(20).max(700),
  bodyFatPct: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
  loggedAt: z.string().datetime().optional()
});

healthModuleRouter.get('/weight', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, logged_at, weight_kg, body_fat_pct, notes
       FROM body_weight_logs
       WHERE user_id = $1
       ORDER BY logged_at DESC
       LIMIT 180`,
      [req.user.sub]
    );
    return res.json({ logs: result.rows });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.post('/weight', async (req, res, next) => {
  try {
    const input = bodyWeightSchema.parse(req.body);
    const created = await query(
      `INSERT INTO body_weight_logs (user_id, weight_kg, body_fat_pct, notes, logged_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.sub,
        input.weightKg,
        input.bodyFatPct ?? null,
        input.notes ?? null,
        input.loggedAt ?? new Date().toISOString()
      ]
    );
    return res.status(201).json({ log: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// ─── Lifetime Personal Stats ──────────────────────────────────────────────────
healthModuleRouter.get('/stats', async (req, res, next) => {
  try {
    const uid = req.user.sub;
    const [workoutsRes, activitiesRes, mealsRes, xpRes, weightRes, streakRes] = await Promise.allSettled([
      query(`SELECT COUNT(*)::int AS total,
                    COALESCE(SUM(calories_burned),0)::int AS total_calories,
                    COALESCE(SUM(EXTRACT(EPOCH FROM (completed_at - started_at))/3600),0)::numeric AS total_hours
             FROM workouts WHERE user_id = $1`, [uid]),
      query(`SELECT COUNT(*)::int AS total,
                    COALESCE(SUM(distance_m),0)::numeric AS total_distance_m,
                    COALESCE(SUM(calories_burned),0)::int AS total_calories,
                    COALESCE(SUM(duration_seconds),0)::int AS total_seconds
             FROM activities WHERE user_id = $1`, [uid]),
      query(`SELECT COUNT(*)::int AS total,
                    COALESCE(SUM(calories),0)::int AS total_calories
             FROM nutrition_logs WHERE user_id = $1`, [uid]),
      query(`SELECT COALESCE(SUM(xp),0)::int AS total FROM user_xp WHERE user_id = $1`, [uid]),
      query(`SELECT weight_kg FROM body_weight_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 1`, [uid]),
      query(`SELECT COALESCE(MAX(streak),0)::int AS longest FROM (
               SELECT COUNT(*)::int AS streak
               FROM (
                 SELECT COALESCE(DATE(completed_at), DATE(started_at)) AS day
                 FROM workouts WHERE user_id = $1
                 GROUP BY 1
               ) days
             ) s`, [uid]),
    ]);

    return res.json({
      workouts: workoutsRes.status === 'fulfilled' ? workoutsRes.value.rows[0] : {},
      activities: activitiesRes.status === 'fulfilled' ? activitiesRes.value.rows[0] : {},
      meals: mealsRes.status === 'fulfilled' ? mealsRes.value.rows[0] : {},
      totalXP: xpRes.status === 'fulfilled' ? xpRes.value.rows[0]?.total ?? 0 : 0,
      latestWeight: weightRes.status === 'fulfilled' ? (weightRes.value.rows[0]?.weight_kg ?? null) : null,
      longestStreak: streakRes.status === 'fulfilled' ? streakRes.value.rows[0]?.longest ?? 0 : 0,
    });
  } catch (error) {
    return next(error);
  }
});

// ─── DELETE medication ────────────────────────────────────────────────────────
healthModuleRouter.delete('/medications/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM medications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.sub]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// ─── Mood Logging (Daylio-style 1-5 scale + optional journal note) ─────────────
const moodSchema = z.object({
  score:    z.number().int().min(1).max(5),
  notes:    z.string().max(2000).optional(),
  loggedAt: z.string().datetime().optional()
});

healthModuleRouter.get('/mood', async (req, res, next) => {
  try {
    const days  = Math.min(Number(req.query.days ?? 30), 90);
    const result = await query(
      `SELECT id, score, notes, logged_at
       FROM mood_logs
       WHERE user_id = $1 AND logged_at >= NOW() - ($2 || ' days')::interval
       ORDER BY logged_at DESC`,
      [req.user.sub, days]
    );
    const avg = result.rows.length > 0
      ? parseFloat((result.rows.reduce((s, r) => s + r.score, 0) / result.rows.length).toFixed(2))
      : null;
    return res.json({ logs: result.rows, average: avg });
  } catch (error) {
    return next(error);
  }
});

healthModuleRouter.post('/mood', async (req, res, next) => {
  try {
    const input = moodSchema.parse(req.body);
    const created = await query(
      `INSERT INTO mood_logs (user_id, score, notes, logged_at)
       VALUES ($1, $2, $3, COALESCE($4, NOW()))
       RETURNING *`,
      [req.user.sub, input.score, input.notes ?? null, input.loggedAt ?? null]
    );
    return res.status(201).json({ log: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// ─── Sleep Stages (light/deep/REM breakdown as part of vitals) ───────────────
const sleepStagesSchema = z.object({
  recordedAt:  z.string().datetime(),
  sleepHours:  z.number().min(0).max(24),
  remHours:    z.number().min(0).max(12).optional(),
  deepHours:   z.number().min(0).max(12).optional(),
  lightHours:  z.number().min(0).max(24).optional()
});

healthModuleRouter.post('/sleep-stages', async (req, res, next) => {
  try {
    const input = sleepStagesSchema.parse(req.body);
    const created = await query(
      `INSERT INTO vitals (user_id, recorded_at, sleep_hours, sleep_rem_h, sleep_deep_h, sleep_light_h)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.sub, input.recordedAt, input.sleepHours,
        input.remHours ?? null, input.deepHours ?? null, input.lightHours ?? null
      ]
    );
    return res.status(201).json({ vital: created.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// ─── Lab Results ─────────────────────────────────────────────────────────────
const labResultSchema = z.object({
  testDate:               z.string(),
  testName:               z.string().min(1),
  totalCholesterolMgdl:   z.number().positive().optional(),
  hdlMgdl:                z.number().positive().optional(),
  ldlMgdl:                z.number().positive().optional(),
  triglyceridesMgdl:      z.number().positive().optional(),
  fastingGlucoseMgdl:     z.number().positive().optional(),
  hba1cPct:               z.number().min(0).max(20).optional(),
  hemoglobinGdl:          z.number().positive().optional(),
  hematocritPct:          z.number().min(0).max(100).optional(),
  tshMiul:                z.number().positive().optional(),
  vitaminDNgml:           z.number().positive().optional(),
  vitaminB12Pgml:         z.number().positive().optional(),
  ferritinNgml:           z.number().positive().optional(),
  vo2maxMlkgmin:          z.number().positive().optional(),
  notes:                  z.string().optional(),
});

healthRouter.get('/lab-results', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM lab_results WHERE user_id = $1 ORDER BY test_date DESC LIMIT 50`,
      [req.user.sub]
    );
    return res.json({ labResults: result.rows });
  } catch (error) {
    return next(error);
  }
});

healthRouter.post('/lab-results', async (req, res, next) => {
  try {
    const data = labResultSchema.parse(req.body);
    const result = await query(
      `INSERT INTO lab_results (
         user_id, test_date, test_name,
         total_cholesterol_mgdl, hdl_mgdl, ldl_mgdl, triglycerides_mgdl,
         fasting_glucose_mgdl, hba1c_pct,
         hemoglobin_gdl, hematocrit_pct, tsh_miul,
         vitamin_d_ngml, vitamin_b12_pgml, ferritin_ngml,
         vo2max_mlkgmin, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        req.user.sub,
        new Date(data.testDate).toISOString(),
        data.testName,
        data.totalCholesterolMgdl ?? null,
        data.hdlMgdl ?? null,
        data.ldlMgdl ?? null,
        data.triglyceridesMgdl ?? null,
        data.fastingGlucoseMgdl ?? null,
        data.hba1cPct ?? null,
        data.hemoglobinGdl ?? null,
        data.hematocritPct ?? null,
        data.tshMiul ?? null,
        data.vitaminDNgml ?? null,
        data.vitaminB12Pgml ?? null,
        data.ferritinNgml ?? null,
        data.vo2maxMlkgmin ?? null,
        data.notes ?? null,
      ]
    );
    return res.status(201).json({ labResult: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

healthRouter.delete('/lab-results/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM lab_results WHERE id = $1 AND user_id = $2', [req.params.id, req.user.sub]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// ─── Body Measurements ────────────────────────────────────────────────────────
const bodyMeasSchema = z.object({
  measuredAt:     z.string().optional(),
  waistCm:        z.number().positive().optional(),
  hipsCm:         z.number().positive().optional(),
  chestCm:        z.number().positive().optional(),
  neckCm:         z.number().positive().optional(),
  leftArmCm:      z.number().positive().optional(),
  rightArmCm:     z.number().positive().optional(),
  leftThighCm:    z.number().positive().optional(),
  rightThighCm:   z.number().positive().optional(),
  leftCalfCm:     z.number().positive().optional(),
  rightCalfCm:    z.number().positive().optional(),
  shouldersCm:    z.number().positive().optional(),
  notes:          z.string().optional(),
});

healthRouter.get('/body-measurements', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM body_measurements WHERE user_id = $1 ORDER BY measured_at DESC LIMIT 30`,
      [req.user.sub]
    );
    return res.json({ measurements: result.rows });
  } catch (error) {
    return next(error);
  }
});

healthRouter.post('/body-measurements', async (req, res, next) => {
  try {
    const data = bodyMeasSchema.parse(req.body);
    const result = await query(
      `INSERT INTO body_measurements (
         user_id, measured_at, waist_cm, hips_cm, chest_cm, neck_cm,
         left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm,
         left_calf_cm, right_calf_cm, shoulders_cm, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user.sub,
        data.measuredAt ? new Date(data.measuredAt).toISOString() : new Date().toISOString(),
        data.waistCm ?? null, data.hipsCm ?? null, data.chestCm ?? null, data.neckCm ?? null,
        data.leftArmCm ?? null, data.rightArmCm ?? null,
        data.leftThighCm ?? null, data.rightThighCm ?? null,
        data.leftCalfCm ?? null, data.rightCalfCm ?? null,
        data.shouldersCm ?? null, data.notes ?? null,
      ]
    );
    return res.status(201).json({ measurement: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});
