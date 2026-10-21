-- Emo — exam simulator, scenarios and admin analytics
--
-- 1. exam_results        — a completed mock exam (band/score + section breakdown)
-- 2. profiles.is_admin   — the flag that gates the admin dashboard
-- 3. exam_attempts       — per-section answers, so a result can be reviewed later
-- 4. scenarios           — the roleplay catalogue (content, not secrets)

-- ---------------------------------------------------------------------------
-- 1. Exam results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  exam_id text NOT NULL,                 -- 'ielts' | 'toefl'
  exam_title text NOT NULL,
  mode text NOT NULL DEFAULT 'quick',    -- 'quick' | 'full'
  total_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  band text,                            -- 'B2', '7.5', ...
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_exam_results" ON exam_results;
CREATE POLICY "select_own_exam_results" ON exam_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_exam_results" ON exam_results;
CREATE POLICY "insert_own_exam_results" ON exam_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_exam_results" ON exam_results;
CREATE POLICY "delete_own_exam_results" ON exam_results FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exam_results_user ON exam_results(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Admin flag
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 3. Per-section answers (for reviewing a mock after the fact)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid REFERENCES exam_results(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  section text NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_exam_attempts" ON exam_attempts;
CREATE POLICY "select_own_exam_attempts" ON exam_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_exam_attempts" ON exam_attempts;
CREATE POLICY "insert_own_exam_attempts" ON exam_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_result ON exam_attempts(result_id);
