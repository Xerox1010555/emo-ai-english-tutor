/*
# Emo — AI Tutor upgrade migration

Extends the existing schema (20260830044010_emo_schema.sql) without altering or
dropping any existing table, column, or policy. All additions are additive and
guarded with IF NOT EXISTS, so this is safe to re-run.

1. profiles gains tutor settings: assistant_mode, notifications_enabled,
   reminder_frequency, learning_goals, xp
2. daily_quests: the per-day generated quest set
3. recurring_mistakes: mistake patterns observed in chat, used to steer the tutor
4. skill_progress: a durable per-skill score so the tutor does not recompute
   the full history on every message

The app degrades gracefully if this migration has not been applied yet: every
read of these relations is individually guarded and falls back to computed
values.
*/

-- ---------------------------------------------------------------------------
-- profiles: tutor settings
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assistant_mode text NOT NULL DEFAULT 'friendly';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_frequency text NOT NULL DEFAULT 'daily';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learning_goals text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp int NOT NULL DEFAULT 0;

-- Keep the new columns honest if someone writes a bad value.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_assistant_mode_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_assistant_mode_check
      CHECK (assistant_mode IN ('friendly', 'coach', 'strict'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_reminder_frequency_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_reminder_frequency_check
      CHECK (reminder_frequency IN ('daily', 'weekdays', 'off'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- daily_quests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  quest_key text NOT NULL,
  date date NOT NULL,
  kind text NOT NULL,
  skill text NOT NULL,
  title text NOT NULL,
  prompt text NOT NULL,
  hint text NOT NULL DEFAULT '',
  xp_reward int NOT NULL DEFAULT 20,
  goal_skill text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_quests" ON daily_quests;
CREATE POLICY "select_own_quests" ON daily_quests FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_quests" ON daily_quests;
CREATE POLICY "insert_own_quests" ON daily_quests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_quests" ON daily_quests;
CREATE POLICY "update_own_quests" ON daily_quests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_quests" ON daily_quests;
CREATE POLICY "delete_own_quests" ON daily_quests FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- One quest per key per day, per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_quests_unique
  ON daily_quests(user_id, date, quest_key);
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, date);

-- ---------------------------------------------------------------------------
-- recurring_mistakes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  occurrences int NOT NULL DEFAULT 1,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE recurring_mistakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_mistakes" ON recurring_mistakes;
CREATE POLICY "select_own_mistakes" ON recurring_mistakes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_mistakes" ON recurring_mistakes;
CREATE POLICY "insert_own_mistakes" ON recurring_mistakes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_mistakes" ON recurring_mistakes;
CREATE POLICY "update_own_mistakes" ON recurring_mistakes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_mistakes" ON recurring_mistakes;
CREATE POLICY "delete_own_mistakes" ON recurring_mistakes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_mistakes_unique
  ON recurring_mistakes(user_id, lower(label));
CREATE INDEX IF NOT EXISTS idx_recurring_mistakes_user ON recurring_mistakes(user_id, occurrences);

-- ---------------------------------------------------------------------------
-- skill_progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  skill text NOT NULL,
  score int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE skill_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_skill_progress" ON skill_progress;
CREATE POLICY "select_own_skill_progress" ON skill_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_skill_progress" ON skill_progress;
CREATE POLICY "insert_own_skill_progress" ON skill_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_skill_progress" ON skill_progress;
CREATE POLICY "update_own_skill_progress" ON skill_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_progress_unique ON skill_progress(user_id, skill);
