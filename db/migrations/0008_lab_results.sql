-- ─── Migration 0008: Lab Results, VO2Max History ───────────────────────────────
-- Lab results / blood panel (Apple Health, Oura, general health apps)
CREATE TABLE IF NOT EXISTS lab_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_date   TIMESTAMPTZ NOT NULL,
  test_name   TEXT NOT NULL,            -- e.g. "Annual Blood Panel", "Lipid Panel"
  -- Lipid panel
  total_cholesterol_mgdl  NUMERIC(6,1),
  hdl_mgdl                NUMERIC(6,1),
  ldl_mgdl                NUMERIC(6,1),
  triglycerides_mgdl      NUMERIC(6,1),
  -- Blood glucose
  fasting_glucose_mgdl    NUMERIC(6,1),
  hba1c_pct               NUMERIC(5,2),
  -- CBC
  hemoglobin_gdl          NUMERIC(5,2),
  hematocrit_pct          NUMERIC(5,2),
  -- Thyroid
  tsh_miul                NUMERIC(7,3),
  -- Vitamins
  vitamin_d_ngml          NUMERIC(6,1),
  vitamin_b12_pgml        NUMERIC(8,1),
  ferritin_ngml           NUMERIC(8,1),
  -- VO2Max history
  vo2max_mlkgmin          NUMERIC(6,2),
  -- Notes
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lab_results_user_date ON lab_results(user_id, test_date DESC);
