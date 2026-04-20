import { Router } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
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

// ─── Fetch data for a report ──────────────────────────────────────────────────
async function fetchReportData(userId, reportType) {
  const data = {};

  if (reportType === 'health' || reportType === 'combined') {
    const [vitals, labs, body, meds] = await Promise.all([
      query('SELECT recorded_at, heart_rate, systolic_bp, diastolic_bp, spo2, temperature_c, sleep_hours, stress_level, calories_burned FROM vitals WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 500', [userId]),
      query('SELECT recorded_at, cholesterol_total, cholesterol_ldl, cholesterol_hdl, triglycerides, glucose_fasting, hba1c FROM lab_results WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 200', [userId]),
      query('SELECT recorded_at, weight_kg, body_fat_pct, muscle_mass_kg, bmi FROM body_measurements WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 200', [userId]),
      query('SELECT medication_name, dosage, frequency, started_at, ended_at FROM medications WHERE user_id = $1 ORDER BY created_at DESC', [userId])
    ]);
    data.vitals = vitals.rows;
    data.labResults = labs.rows;
    data.bodyMeasurements = body.rows;
    data.medications = meds.rows;
  }

  if (reportType === 'fitness' || reportType === 'combined') {
    const [workouts, prs] = await Promise.all([
      query(`SELECT w.title, w.duration_seconds, w.calories_burned, w.started_at, w.completed_at,
                    json_agg(json_build_object('exercise', we.exercise_name, 'muscle', we.muscle_group,
                      'sets', we.sets, 'reps', we.reps, 'weight_kg', we.weight_kg) ORDER BY we.id) AS exercises
             FROM workouts w
             LEFT JOIN workout_exercises we ON we.workout_id = w.id
             WHERE w.user_id = $1
             GROUP BY w.id ORDER BY COALESCE(w.completed_at, w.started_at) DESC NULLS LAST LIMIT 200`, [userId]),
      query('SELECT exercise_name, muscle_group, weight_kg, reps, estimated_1rm, achieved_at FROM personal_records WHERE user_id = $1 ORDER BY achieved_at DESC', [userId])
    ]);
    data.workouts = workouts.rows;
    data.personalRecords = prs.rows;
  }

  if (reportType === 'nutrition' || reportType === 'combined') {
    const meals = await query(
      'SELECT meal_type, meal_name, consumed_at, calories, protein_g, carbs_g, fat_g, fiber_g FROM nutrition_logs WHERE user_id = $1 ORDER BY consumed_at DESC LIMIT 500',
      [userId]
    );
    data.nutritionLogs = meals.rows;
  }

  return data;
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────
function toCsvRow(obj) {
  return Object.values(obj).map(v => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  }).join(',');
}

function datasetToCsv(label, rows) {
  if (!rows || rows.length === 0) return `\n## ${label}\n(no data)\n`;
  const header = Object.keys(rows[0]).join(',');
  const body = rows.map(toCsvRow).join('\n');
  return `\n## ${label}\n${header}\n${body}\n`;
}

function buildCsv(reportType, data) {
  let csv = `HealthSphere Export – ${reportType} – ${new Date().toISOString()}\n`;
  if (data.vitals)           csv += datasetToCsv('Vitals', data.vitals);
  if (data.labResults)       csv += datasetToCsv('Lab Results', data.labResults);
  if (data.bodyMeasurements) csv += datasetToCsv('Body Measurements', data.bodyMeasurements);
  if (data.medications)      csv += datasetToCsv('Medications', data.medications);
  if (data.workouts)         csv += datasetToCsv('Workouts', data.workouts);
  if (data.personalRecords)  csv += datasetToCsv('Personal Records', data.personalRecords);
  if (data.nutritionLogs)    csv += datasetToCsv('Nutrition Logs', data.nutritionLogs);
  return csv;
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────
function addSection(doc, title, rows, columns) {
  doc.addPage();
  doc.fontSize(14).font('Helvetica-Bold').text(title, { underline: true });
  doc.moveDown(0.5);

  if (!rows || rows.length === 0) {
    doc.fontSize(10).font('Helvetica').text('No data available.');
    return;
  }

  const colWidth = Math.floor((doc.page.width - 72) / columns.length);
  const startX = 36;

  // Header row
  doc.fontSize(8).font('Helvetica-Bold');
  let x = startX;
  for (const col of columns) {
    doc.text(col, x, doc.y, { width: colWidth, lineBreak: false });
    x += colWidth;
  }
  doc.moveDown(0.4);
  doc.moveTo(startX, doc.y).lineTo(doc.page.width - 36, doc.y).stroke();
  doc.moveDown(0.2);

  // Data rows
  doc.font('Helvetica').fontSize(7);
  for (const row of rows.slice(0, 300)) {
    if (doc.y > doc.page.height - 80) doc.addPage();
    x = startX;
    const y = doc.y;
    for (const col of columns) {
      const val = row[col] ?? '';
      const s = typeof val === 'object' ? JSON.stringify(val) : String(val);
      doc.text(s.slice(0, 40), x, y, { width: colWidth, lineBreak: false });
      x += colWidth;
    }
    doc.moveDown(0.35);
  }
}

function buildPdf(reportType, data, res) {
  const doc = new PDFDocument({ margin: 36, size: 'A4' });
  doc.pipe(res);

  // Cover page
  doc.fontSize(22).font('Helvetica-Bold').text('HealthSphere', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica').text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).text(`Generated: ${new Date().toUTCString()}`, { align: 'center' });

  if (data.vitals?.length)           addSection(doc, 'Vitals', data.vitals, ['recorded_at', 'heart_rate', 'systolic_bp', 'diastolic_bp', 'spo2', 'temperature_c', 'sleep_hours']);
  if (data.labResults?.length)       addSection(doc, 'Lab Results', data.labResults, ['recorded_at', 'cholesterol_total', 'cholesterol_ldl', 'cholesterol_hdl', 'glucose_fasting', 'hba1c']);
  if (data.bodyMeasurements?.length) addSection(doc, 'Body Measurements', data.bodyMeasurements, ['recorded_at', 'weight_kg', 'body_fat_pct', 'muscle_mass_kg', 'bmi']);
  if (data.medications?.length)      addSection(doc, 'Medications', data.medications, ['medication_name', 'dosage', 'frequency', 'started_at', 'ended_at']);
  if (data.workouts?.length)         addSection(doc, 'Workouts', data.workouts, ['title', 'duration_seconds', 'calories_burned', 'started_at', 'completed_at']);
  if (data.personalRecords?.length)  addSection(doc, 'Personal Records', data.personalRecords, ['exercise_name', 'muscle_group', 'weight_kg', 'reps', 'estimated_1rm', 'achieved_at']);
  if (data.nutritionLogs?.length)    addSection(doc, 'Nutrition Logs', data.nutritionLogs, ['consumed_at', 'meal_type', 'meal_name', 'calories', 'protein_g', 'carbs_g', 'fat_g']);

  doc.end();
}

// ─── Download endpoint ────────────────────────────────────────────────────────
exportsRouter.get('/reports/:reportId/download', async (req, res, next) => {
  try {
    const reportResult = await query(
      'SELECT * FROM reports WHERE id = $1 AND user_id = $2',
      [req.params.reportId, req.user.sub]
    );

    if (reportResult.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const report = reportResult.rows[0];
    const data = await fetchReportData(req.user.sub, report.report_type);

    // Mark report as completed
    await query(
      "UPDATE reports SET status = 'completed', completed_at = NOW() WHERE id = $1",
      [report.id]
    );

    if (report.format === 'csv') {
      const csv = buildCsv(report.report_type, data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="healthsphere-${report.report_type}-${report.id}.csv"`);
      return res.send(csv);
    }

    // PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="healthsphere-${report.report_type}-${report.id}.pdf"`);
    buildPdf(report.report_type, data, res);
    return;
  } catch (error) {
    return next(error);
  }
});
