/*
# Emo — atomic writes + quest answers + persistence hardening

Additive and idempotent, in the spirit of the previous migration. Applies cleanly
to any database that already has 20260830044010_emo_schema.sql and (ideally but
not necessarily) 20260928090000_emo_ai_upgrade.sql.

1. daily_quests.answer — the model answer for written quests must persist.
2. Atomic RPCs (replace client-side read-modify-write races):
   - complete_quest(quest_id): mark done + add XP in ONE statement
   - award_xp(amount): atomic XP increment (lessons, bonuses)
   - bump_recurring_mistake(label, category): upsert-with-increment in one call
3. UNIQUE constraints where the client can otherwise create duplicates:
   - daily_lessons(user_id, date) — two screens both "ensure today's lesson"
   - learning_plan(user_id, week_number) — first-visit double-insert
   - vocabulary(user_id, lower(word)) — saving the same word from chat twice
   Pre-existing duplicates are collapsed before each UNIQUE index is created.
*/

-- ---------------------------------------------------------------------------
-- 1. daily_quests.answer
-- ---------------------------------------------------------------------------
ALTER TABLE daily_quests ADD COLUMN IF NOT EXISTS answer text;
ALTER TABLE daily_quests ADD COLUMN IF NOT EXISTS goal_level text;

-- daily_lessons: keep the lesson's vocabulary, its CEFR level, and whether it
-- was written by the model or taken from the curated bank, so the lesson can
-- seed the learner's vocabulary deck and be labelled honestly.
ALTER TABLE daily_lessons ADD COLUMN IF NOT EXISTS vocab jsonb;
ALTER TABLE daily_lessons ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE daily_lessons ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'bank';

-- vocabulary: where a word came from ('lesson' | 'chat' | 'manual'), so the
-- deck can show provenance and the tutor can prioritise saved words.
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- ---------------------------------------------------------------------------
-- 2. Atomic RPCs
-- ---------------------------------------------------------------------------

-- Mark one of the user's quests complete and add its XP atomically.
-- Returns the new XP total so the client can display it confidently.
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

  RETURN v_new_xp;
END;
$$;

ALTER FUNCTION complete_quest(text) ENABLE ROW LEVEL SECURITY;
GRANT EXECUTE ON FUNCTION complete_quest(text) TO authenticated;

-- Atomic XP increment for lesson completion and future bonuses.
CREATE OR REPLACE FUNCTION award_xp(p_amount int)
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

  RETURN v_new_xp;
END;
$$;

ALTER FUNCTION award_xp(int) ENABLE ROW LEVEL SECURITY;
GRANT EXECUTE ON FUNCTION award_xp(int) TO authenticated;

-- One-shot mistake recorder: insert or increment occurrences atomically.
CREATE OR REPLACE FUNCTION bump_recurring_mistake(p_label text, p_category text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_safe_label text := left(btrim(coalesce(p_label, '')), 120);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF v_safe_label = '' THEN
    RETURN;
  END IF;

  INSERT INTO recurring_mistakes (user_id, label, category, occurrences, last_seen)
  VALUES (v_user, v_safe_label, COALESCE(left(p_category, 40), 'other'), 1, now())
  ON CONFLICT (user_id, lower(label))
  DO UPDATE SET occurrences = recurring_mistakes.occurrences + 1,
                last_seen = now(),
                category = EXCLUDED.category;
END;
$$;

ALTER FUNCTION bump_recurring_mistake(text, text) ENABLE ROW LEVEL SECURITY;
GRANT EXECUTE ON FUNCTION bump_recurring_mistake(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. De-duplicate then constrain
-- ---------------------------------------------------------------------------

-- daily_lessons: keep the earliest row per (user, date).
DO $$
BEGIN
  DELETE FROM daily_lessons a
   USING daily_lessons b
   WHERE a.user_id = b.user_id
     AND a.date = b.date
     AND a.created_at > b.created_at;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_lessons_user_date_unique
    ON daily_lessons(user_id, date);
END $$;

-- learning_plan: keep the earliest row per (user, week).
DO $$
BEGIN
  DELETE FROM learning_plan a
   USING learning_plan b
   WHERE a.user_id = b.user_id
     AND a.week_number = b.week_number
     AND a.created_at > b.created_at;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_plan_user_week_unique
    ON learning_plan(user_id, week_number);
END $$;

-- vocabulary: no duplicate words per user (case-insensitive).
DO $$
BEGIN
  DELETE FROM vocabulary a
   USING vocabulary b
   WHERE a.user_id = b.user_id
     AND lower(a.word) = lower(b.word)
     AND a.created_at >= b.created_at
     AND (a.created_at > b.created_at OR a.id > b.id);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_user_word_unique
    ON vocabulary(user_id, lower(word));
END $$;
