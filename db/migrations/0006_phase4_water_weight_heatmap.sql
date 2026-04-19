-- ─── Phase 4: Water Intake, Body Weight Tracking ────────────────────────────

-- Daily water intake logs (track hydration per entry)
CREATE TABLE IF NOT EXISTS water_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  milliliters INT NOT NULL CHECK (milliliters > 0 AND milliliters <= 5000)
);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs (user_id, logged_at DESC);

-- Body weight logs (supports body fat % for body composition tracking)
CREATE TABLE IF NOT EXISTS body_weight_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weight_kg       NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 700),
  body_fat_pct    NUMERIC(5,2) CHECK (body_fat_pct >= 0 AND body_fat_pct <= 100),
  notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_body_weight_logs_user_date ON body_weight_logs (user_id, logged_at DESC);

-- Index to speed up workout heatmap queries (counts per day)
CREATE INDEX IF NOT EXISTS idx_workouts_user_completed ON workouts (user_id, completed_at DESC NULLS LAST)
  WHERE completed_at IS NOT NULL OR started_at IS NOT NULL;
