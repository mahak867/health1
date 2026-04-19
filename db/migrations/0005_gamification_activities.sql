-- ─── Phase 1: Personal Records ───────────────────────────────────────────────
CREATE TABLE personal_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  muscle_group  TEXT NOT NULL,
  weight_kg     NUMERIC(6,2) NOT NULL,
  reps          INTEGER NOT NULL,
  estimated_1rm NUMERIC(8,2) NOT NULL,
  achieved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, exercise_name)
);
CREATE INDEX idx_personal_records_user_id ON personal_records(user_id);

-- ─── Phase 1: Workout Templates ───────────────────────────────────────────────
CREATE TABLE workout_templates (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  exercises  JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);

-- ─── Phase 1: Badges / Achievements ──────────────────────────────────────────
CREATE TABLE user_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key   TEXT NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_key)
);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);

-- ─── Phase 1: XP ledger ───────────────────────────────────────────────────────
CREATE TABLE user_xp (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,
  xp          INTEGER NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_xp_user_id ON user_xp(user_id);

-- ─── Phase 1: Challenges ─────────────────────────────────────────────────────
CREATE TABLE challenges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  cadence     TEXT NOT NULL,   -- 'daily' | 'weekly'
  goal        INTEGER NOT NULL,
  xp_reward   INTEGER NOT NULL DEFAULT 50,
  icon        TEXT NOT NULL DEFAULT '🎯'
);

CREATE TABLE user_challenges (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  progress     INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, challenge_id, period_start)
);
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);

-- Seed predefined challenges
INSERT INTO challenges (key, title, description, cadence, goal, xp_reward, icon) VALUES
  ('daily_workout',       'Daily Grind',          'Log 1 workout today',               'daily',  1,   25,  '🏋️'),
  ('daily_meal',          'Clean Eating',          'Log 3 meals today',                 'daily',  3,   20,  '🥗'),
  ('daily_water',         'Stay Hydrated',         'Log 2000ml water today',            'daily',  2000, 15, '💧'),
  ('weekly_workouts_3',   'Consistent 3',          'Log 3 workouts this week',          'weekly', 3,   75,  '🔥'),
  ('weekly_workouts_5',   'Five Star Week',        'Log 5 workouts this week',          'weekly', 5,   150, '⭐'),
  ('weekly_new_exercise', 'Try Something New',     'Add a new exercise you haven''t logged before', 'weekly', 1, 50, '🆕'),
  ('weekly_protein',      'Protein King',          'Hit your protein goal 5 days this week', 'weekly', 5, 100, '💪'),
  ('weekly_cardio',       'Cardio Week',           'Log 3 cardio activities this week', 'weekly', 3,   80,  '🏃');

-- ─── Phase 3: Activities (Strava replacement) ─────────────────────────────────
CREATE TYPE activity_type AS ENUM ('run','ride','walk','swim','hike','row','other');

CREATE TABLE activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type   activity_type NOT NULL DEFAULT 'other',
  title           TEXT NOT NULL,
  distance_m      NUMERIC(10,2),
  duration_seconds INTEGER,
  calories_burned INTEGER,
  avg_heart_rate  INTEGER,
  elevation_m     NUMERIC(8,2),
  route_geojson   JSONB,
  notes           TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_completed_at ON activities(completed_at DESC);

CREATE TABLE activity_reactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id  UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction     TEXT NOT NULL DEFAULT 'kudos',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, user_id)
);
CREATE INDEX idx_activity_reactions_activity_id ON activity_reactions(activity_id);

-- ─── Phase 2: Recipes ─────────────────────────────────────────────────────────
CREATE TABLE recipes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]',
  total_calories  NUMERIC(8,2),
  total_protein_g NUMERIC(8,2),
  total_carbs_g   NUMERIC(8,2),
  total_fat_g     NUMERIC(8,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
