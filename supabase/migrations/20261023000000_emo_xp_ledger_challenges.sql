/*
# Emo — XP ledger, weekly challenges, hourly drills, streak freezes

The XP ledger is the foundation: every point of XP is written as an event with
a source, so weekly XP, league tiers and challenge progress are all derived
from the same truthful data instead of a counter that can drift.

1. xp_events        — the ledger (user_id, amount, source, created_at)
2. challenges       — this week's challenges and whether they were claimed
3. profiles.streak_freezes — how many streak rescues the learner owns
4. daily_lessons.hourly_slot — the hourly drill slot for a learner
5. award_xp()      — redefined to also write a ledger row
6. complete_quest() — redefined to also write a ledger row
*/

-- ---------------------------------------------------------------------------
-- 1. The XP ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  amount int NOT NULL,
  source text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_xp_events" ON xp_events;
CREATE POLICY "select_own_xp_events" ON xp_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_xp_events" ON xp_events;
CREATE POLICY "insert_own_xp_events" ON xp_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_time ON xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_source ON xp_events(user_id, source, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Weekly challenges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  kind text NOT NULL,
  target int NOT NULL DEFAULT 1,
  reward_xp int NOT NULL DEFAULT 20,
  progress int NOT NULL DEFAULT 0,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start, kind)
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_challenges" ON challenges;
CREATE POLICY "select_own_challenges" ON challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_challenges" ON challenges;
CREATE POLICY "insert_own_challenges" ON challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_challenges" ON challenges;
CREATE POLICY "update_own_challenges" ON challenges FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Streak freezes
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_freezes int NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 4. The hourly lesson slot
-- ---------------------------------------------------------------------------
-- A learner gets one lesson per hour; the slot is the local day and hour, so
-- the lesson changes every hour and is stable within it.
ALTER TABLE daily_lessons ADD COLUMN IF NOT EXISTS hourly_slot text;

CREATE INDEX IF NOT EXISTS idx_daily_lessons_slot ON daily_lessons(user_id, hourly_slot);

-- ---------------------------------------------------------------------------
-- 5. award_xp with a ledger row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION award_xp(p_amount int, p_source text DEFAULT 'general')
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_new_xp int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 OR p_amount > 500 THEN
    RAISE EXCEPTION 'invalid xp amount' USING ERRCODE = '22023';
  END IF;

  UPDATE profiles
     SET xp = COALESCE(xp, 0) + p_amount
   WHERE id = v_user
   RETURNING xp INTO v_new_xp;

  IF p_amount > 0 THEN
    INSERT INTO xp_events (user_id, amount, source)
    VALUES (v_user, p_amount, COALESCE(p_source, 'general'));
  END IF;

  RETURN v_new_xp;
END;
$$;

GRANT EXECUTE ON FUNCTION award_xp(int, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. complete_quest with a ledger row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_quest(p_quest_key text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_xp_reward int;
  v_new_xp int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'P0001';
  END IF;

  UPDATE daily_quests
     SET completed = true,
         completed_at = COALESCE(completed_at, now())
   WHERE user_id = v_user
     AND quest_key = p_quest_key
     AND completed = false
   RETURNING xp_reward INTO v_xp_reward;

  -- Idempotent: completing an already-completed quest adds no XP.
  IF v_xp_reward IS NULL THEN
    RETURN (SELECT xp FROM profiles WHERE id = v_user);
  END IF;

  UPDATE profiles
     SET xp = COALESCE(xp, 0) + v_xp_reward
   WHERE id = v_user
   RETURNING xp INTO v_new_xp;

  INSERT INTO xp_events (user_id, amount, source)
  VALUES (v_user, v_xp_reward, 'quest');

  RETURN v_new_xp;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_quest(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Claiming a challenge reward (atomic, once per week)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_challenge(p_kind text, p_week_start date)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_reward int;
  v_new_xp int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'P0001';
  END IF;

  UPDATE challenges
     SET claimed_at = now()
   WHERE user_id = v_user
     AND week_start = p_week_start
     AND kind = p_kind
     AND claimed_at IS NULL
     AND progress >= target
   RETURNING reward_xp INTO v_reward;

  IF v_reward IS NULL THEN
    RETURN (SELECT xp FROM profiles WHERE id = v_user);
  END IF;

  UPDATE profiles
     SET xp = COALESCE(xp, 0) + v_reward
   WHERE id = v_user
   RETURNING xp INTO v_new_xp;

  INSERT INTO xp_events (user_id, amount, source)
  VALUES (v_user, v_reward, 'challenge');

  RETURN v_new_xp;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_challenge(text, date) TO authenticated;
