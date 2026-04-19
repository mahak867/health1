-- Migration 0007: mood tracking, activity comments, sleep stage detail
-- ─────────────────────────────────────────────────────────────────────────────

-- Mood logs (Daylio-style 1-5 scale + optional journal note)
CREATE TABLE IF NOT EXISTS mood_logs (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score      SMALLINT    NOT NULL CHECK (score BETWEEN 1 AND 5),
  notes      TEXT,
  logged_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_at ON mood_logs(user_id, logged_at DESC);

-- Activity comments (Strava-style thread per activity)
CREATE TABLE IF NOT EXISTS activity_comments (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID        NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id, created_at);

-- Sleep stage columns on vitals (Oura/Garmin/WHOOP style)
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS sleep_rem_h   NUMERIC(4,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS sleep_deep_h  NUMERIC(4,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS sleep_light_h NUMERIC(4,2);

-- HR zones per-activity summary (stored denormalised for fast reads)
-- Each activity can optionally store time-in-zone in seconds (Z1-Z5)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_zone1_s INT DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_zone2_s INT DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_zone3_s INT DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_zone4_s INT DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_zone5_s INT DEFAULT 0;
