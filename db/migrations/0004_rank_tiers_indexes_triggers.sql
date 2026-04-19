-- Migration 0004: Fix rank_tier enum, add performance indexes, add updated_at triggers
-- Run after 0003_notifications_preferences.sql

-- ─── Extend rank_tier enum with new tier names ────────────────────────────────
-- The ranking service now uses a 9-tier allometric system.
-- PostgreSQL allows adding enum values but not removing them; we add the 4 new
-- names (wood, champion, titan, olympian) and keep legacy values harmless.
ALTER TYPE rank_tier ADD VALUE IF NOT EXISTS 'wood'     BEFORE 'bronze';
ALTER TYPE rank_tier ADD VALUE IF NOT EXISTS 'champion' AFTER  'diamond';
ALTER TYPE rank_tier ADD VALUE IF NOT EXISTS 'titan'    AFTER  'champion';
ALTER TYPE rank_tier ADD VALUE IF NOT EXISTS 'olympian' AFTER  'titan';

-- ─── Performance indexes ──────────────────────────────────────────────────────
-- Vitals: time-series queries are hot path for dashboard + AI
CREATE INDEX IF NOT EXISTS idx_vitals_user_recorded  ON vitals(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded       ON vitals(recorded_at DESC);

-- Workouts: user lookup + time ordering
CREATE INDEX IF NOT EXISTS idx_workouts_user_completed
  ON workouts(user_id, COALESCE(completed_at, started_at) DESC NULLS LAST);

-- Workout exercises: inner join lookup
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id
  ON workout_exercises(workout_id);

-- Nutrition: daily summary queries (date-bucketed)
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_consumed
  ON nutrition_logs(user_id, consumed_at DESC);

-- Hydration: same pattern
CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_consumed
  ON hydration_logs(user_id, consumed_at DESC);

-- Wearables: provider + metric_type filter
CREATE INDEX IF NOT EXISTS idx_wearables_data_user_measured
  ON wearables_data(user_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_wearables_data_type
  ON wearables_data(user_id, provider, metric_type);

-- Appointments: both user and provider lookup
CREATE INDEX IF NOT EXISTS idx_appointments_user
  ON appointments(user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_provider
  ON appointments(provider_user_id, starts_at DESC);

-- Audit logs: actor + time range for admin UI
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time
  ON audit_logs(actor_id, created_at DESC);

-- Muscle rankings: leaderboard sort
CREATE INDEX IF NOT EXISTS idx_muscle_rankings_score
  ON muscle_rankings(score DESC);

-- Notifications: unread + scheduled queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_scheduled
  ON notifications(user_id, COALESCE(scheduled_at, NOW()) DESC);

-- Recommendation events: user history
CREATE INDEX IF NOT EXISTS idx_recommendation_events_user_time
  ON recommendation_events(user_id, generated_at DESC);

-- ─── updated_at auto-update trigger function ──────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_health_profiles_updated_at
  BEFORE UPDATE ON health_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_muscle_rankings_updated_at
  BEFORE UPDATE ON muscle_rankings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_modes_updated_at
  BEFORE UPDATE ON user_modes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
