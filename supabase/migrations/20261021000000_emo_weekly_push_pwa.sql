/*
# Emo — weekly report, push notifications, PWA/i18n support

Additive and idempotent.

1. profiles.ui_language        — the app interface language (en | ar), separate
                                 from preferred_language (Arabic support inside
                                 the tutor's replies).
2. push_subscriptions          — one Web Push subscription per device, so a
                                 reminder can arrive even when the app is
                                 closed.
3. weekly_reports              — the cached AI weekly report, one row per
                                 learner per week, so the model is not called
                                 again for a report that already exists.
4. send_due_push_reminders()   — finds the subscriptions whose learner's local
                                 reminder time is now due and hands them to the
                                 push edge function.
*/

-- ---------------------------------------------------------------------------
-- 1. UI language and timezone
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_language text NOT NULL DEFAULT 'en';

-- A quiz measures one skill; recording which one keeps the skill profile
-- honest (before this, every quiz counted towards every skill).
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS skill text;

-- Minutes AHEAD of UTC (180 for UTC+3). The client sends it so the database
-- can work out each learner's LOCAL time without any client running — the
-- reminder time is stored in the learner's own clock, so comparing it with
-- UTC directly would fire the reminder at the wrong hour for everyone.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tz_offset_minutes int NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_ui_language_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_ui_language_check
      CHECK (ui_language IN ('en', 'ar'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_tz_offset_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_tz_offset_check
      CHECK (tz_offset_minutes BETWEEN -720 AND 840);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Push subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_push" ON push_subscriptions;
CREATE POLICY "select_own_push" ON push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_push" ON push_subscriptions;
CREATE POLICY "insert_own_push" ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_push" ON push_subscriptions;
CREATE POLICY "update_own_push" ON push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_push" ON push_subscriptions;
CREATE POLICY "delete_own_push" ON push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- One subscription per endpoint, whatever device it came from.
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ---------------------------------------------------------------------------
-- 3. Cached weekly reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  headline text NOT NULL,
  wins jsonb NOT NULL DEFAULT '[]'::jsonb,
  focus jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggestion text NOT NULL DEFAULT '',
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_weekly_reports" ON weekly_reports;
CREATE POLICY "select_own_weekly_reports" ON weekly_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_weekly_reports" ON weekly_reports;
CREATE POLICY "insert_own_weekly_reports" ON weekly_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_weekly_reports" ON weekly_reports;
CREATE POLICY "update_own_weekly_reports" ON weekly_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Which subscriptions are due right now
-- ---------------------------------------------------------------------------
-- A learner's reminder time is stored in their own local clock, and
-- `tz_offset_minutes` says how far that clock is from UTC. The local time is
-- therefore (UTC now) - offset.
CREATE OR REPLACE FUNCTION due_push_subscriptions(p_now timestamptz DEFAULT now())
RETURNS TABLE (
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  reminder_time time,
  ui_language text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id,
         s.endpoint,
         s.p256dh,
         s.auth,
         p.notification_time,
         COALESCE(p.ui_language, 'en')
    FROM push_subscriptions s
    JOIN profiles p ON p.id = s.user_id
   WHERE p.notifications_enabled = true
     AND p.reminder_frequency <> 'off'
     AND (
       -- Inside the learner's own reminder hour.
       (p_now AT TIME ZONE 'UTC' - (p.tz_offset_minutes || ' minutes')::interval)::time
         >= p.notification_time
       AND (p_now AT TIME ZONE 'UTC' - (p.tz_offset_minutes || ' minutes')::interval)::time
         < (p.notification_time + INTERVAL '1 hour')::time
     )
     AND (
       p.reminder_frequency <> 'weekdays'
       OR EXTRACT(
            ISODOW FROM (p_now AT TIME ZONE 'UTC' - (p.tz_offset_minutes || ' minutes')::interval)
          ) < 6
     );
$$;

GRANT EXECUTE ON FUNCTION due_push_subscriptions(timestamptz) TO service_role;
