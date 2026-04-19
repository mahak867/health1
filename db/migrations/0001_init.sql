CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('user', 'doctor', 'trainer', 'nutritionist', 'admin');
CREATE TYPE plan_mode AS ENUM ('cut', 'bulk', 'maintenance', 'recomposition');
CREATE TYPE rank_tier AS ENUM ('beginner', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'elite');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  profile_picture_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE health_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER,
  height_cm NUMERIC(6,2),
  weight_kg NUMERIC(6,2),
  blood_group TEXT,
  medical_conditions TEXT[],
  allergies TEXT[],
  emergency_contacts JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL,
  heart_rate INTEGER,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  spo2 NUMERIC(5,2),
  temperature_c NUMERIC(4,2),
  sleep_hours NUMERIC(4,2),
  stress_level INTEGER,
  calories_burned INTEGER
);

CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_seconds INTEGER,
  calories_burned INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  muscle_group TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 1,
  reps INTEGER NOT NULL DEFAULT 1,
  weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0,
  rest_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE nutrition_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL,
  meal_name TEXT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL,
  calories INTEGER,
  protein_g NUMERIC(8,2),
  carbs_g NUMERIC(8,2),
  fat_g NUMERIC(8,2),
  fiber_g NUMERIC(8,2),
  sugar_g NUMERIC(8,2),
  sodium_mg NUMERIC(10,2),
  micronutrients JSONB
);

CREATE TABLE hydration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consumed_at TIMESTAMPTZ NOT NULL,
  milliliters INTEGER NOT NULL
);

CREATE TABLE wearables_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  meeting_url TEXT
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  channel TEXT NOT NULL,
  payload JSONB NOT NULL,
  scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE TABLE muscle_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muscle_group TEXT NOT NULL,
  score NUMERIC(12,2) NOT NULL,
  tier rank_tier NOT NULL,
  consistency_factor NUMERIC(6,2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, muscle_group)
);

CREATE TABLE user_modes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode plan_mode NOT NULL,
  targets JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
