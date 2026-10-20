/*
# Emo - AI English Learning Assistant: Core Schema

1. Overview
   Multi-user app (sign-in required). Each user has a profile with their CEFR level,
   learning plan, daily lessons, conversation logs, appointments, quiz results,
   vocabulary, and level history — all owner-scoped.

2. New Tables
   - profiles: user settings (current_level, target_level, notification_time, language, streak, last_active_date, placement_done)
   - placement_results: per-skill scores from the placement test
   - learning_plan: weekly roadmap entries
   - daily_lessons: generated daily lesson content + completion status
   - appointments: user appointments with reminder settings
   - conversation_logs: chat messages between user and Emo
   - quiz_results: quiz attempt scores
   - vocabulary: spaced repetition vocabulary items
   - level_history: CEFR level estimates over time

3. Security
   - RLS enabled on all tables.
   - Owner-scoped CRUD policies (auth.uid() = user_id) on every table.
   - user_id columns default to auth.uid() so inserts work without explicitly passing the owner.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level text NOT NULL DEFAULT 'A1',
  target_level text NOT NULL DEFAULT 'B2',
  notification_time time NOT NULL DEFAULT '09:00',
  preferred_language text NOT NULL DEFAULT 'ar',
  streak int NOT NULL DEFAULT 0,
  last_active_date date,
  placement_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- placement_results
CREATE TABLE IF NOT EXISTS placement_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  skill text NOT NULL,
  score numeric NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE placement_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_placement" ON placement_results;
CREATE POLICY "select_own_placement" ON placement_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_placement" ON placement_results;
CREATE POLICY "insert_own_placement" ON placement_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_placement" ON placement_results;
CREATE POLICY "update_own_placement" ON placement_results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_placement" ON placement_results;
CREATE POLICY "delete_own_placement" ON placement_results FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- learning_plan
CREATE TABLE IF NOT EXISTS learning_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  focus_skill text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE learning_plan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_plan" ON learning_plan;
CREATE POLICY "select_own_plan" ON learning_plan FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_plan" ON learning_plan;
CREATE POLICY "insert_own_plan" ON learning_plan FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_plan" ON learning_plan;
CREATE POLICY "update_own_plan" ON learning_plan FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_plan" ON learning_plan;
CREATE POLICY "delete_own_plan" ON learning_plan FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- daily_lessons
CREATE TABLE IF NOT EXISTS daily_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL,
  skill text NOT NULL,
  content text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 15,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE daily_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_lessons" ON daily_lessons;
CREATE POLICY "select_own_lessons" ON daily_lessons FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_lessons" ON daily_lessons;
CREATE POLICY "insert_own_lessons" ON daily_lessons FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_lessons" ON daily_lessons;
CREATE POLICY "update_own_lessons" ON daily_lessons FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_lessons" ON daily_lessons;
CREATE POLICY "delete_own_lessons" ON daily_lessons FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- appointments
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  appointment_at timestamptz NOT NULL,
  remind_before_hours int NOT NULL DEFAULT 24,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_appts" ON appointments;
CREATE POLICY "select_own_appts" ON appointments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_appts" ON appointments;
CREATE POLICY "insert_own_appts" ON appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_appts" ON appointments;
CREATE POLICY "update_own_appts" ON appointments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_appts" ON appointments;
CREATE POLICY "delete_own_appts" ON appointments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- conversation_logs
CREATE TABLE IF NOT EXISTS conversation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  correction text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_convos" ON conversation_logs;
CREATE POLICY "select_own_convos" ON conversation_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_convos" ON conversation_logs;
CREATE POLICY "insert_own_convos" ON conversation_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_convos" ON conversation_logs;
CREATE POLICY "update_own_convos" ON conversation_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_convos" ON conversation_logs;
CREATE POLICY "delete_own_convos" ON conversation_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- quiz_results
CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_type text NOT NULL,
  score numeric NOT NULL,
  total numeric NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_quizzes" ON quiz_results;
CREATE POLICY "select_own_quizzes" ON quiz_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_quizzes" ON quiz_results;
CREATE POLICY "insert_own_quizzes" ON quiz_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_quizzes" ON quiz_results;
CREATE POLICY "update_own_quizzes" ON quiz_results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_quizzes" ON quiz_results;
CREATE POLICY "delete_own_quizzes" ON quiz_results FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- vocabulary
CREATE TABLE IF NOT EXISTS vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  word text NOT NULL,
  definition text NOT NULL,
  example text NOT NULL,
  box int NOT NULL DEFAULT 0,
  next_review date NOT NULL DEFAULT CURRENT_DATE,
  mastered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_vocab" ON vocabulary;
CREATE POLICY "select_own_vocab" ON vocabulary FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_vocab" ON vocabulary;
CREATE POLICY "insert_own_vocab" ON vocabulary FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_vocab" ON vocabulary;
CREATE POLICY "update_own_vocab" ON vocabulary FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_vocab" ON vocabulary;
CREATE POLICY "delete_own_vocab" ON vocabulary FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- level_history
CREATE TABLE IF NOT EXISTS level_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  level text NOT NULL,
  score numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE level_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_level_history" ON level_history;
CREATE POLICY "select_own_level_history" ON level_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_level_history" ON level_history;
CREATE POLICY "insert_own_level_history" ON level_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_level_history" ON level_history;
CREATE POLICY "update_own_level_history" ON level_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_level_history" ON level_history;
CREATE POLICY "delete_own_level_history" ON level_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_daily_lessons_user_date ON daily_lessons(user_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id, appointment_at);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_user ON conversation_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_user_review ON vocabulary(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id, taken_at);
CREATE INDEX IF NOT EXISTS idx_level_history_user ON level_history(user_id, recorded_at);
