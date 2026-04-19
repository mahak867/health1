-- ─── Migration 0009: Body Measurements ─────────────────────────────────────────
-- Track body composition measurements (MyFitnessPal/Apple Health style)
CREATE TABLE IF NOT EXISTS body_measurements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  waist_cm    NUMERIC(6,1),
  hips_cm     NUMERIC(6,1),
  chest_cm    NUMERIC(6,1),
  neck_cm     NUMERIC(6,1),
  left_arm_cm NUMERIC(6,1),
  right_arm_cm NUMERIC(6,1),
  left_thigh_cm NUMERIC(6,1),
  right_thigh_cm NUMERIC(6,1),
  left_calf_cm NUMERIC(6,1),
  right_calf_cm NUMERIC(6,1),
  shoulders_cm NUMERIC(6,1),
  notes        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS body_measurements_user_date ON body_measurements(user_id, measured_at DESC);
