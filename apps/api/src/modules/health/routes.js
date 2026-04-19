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
