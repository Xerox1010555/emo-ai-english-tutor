/*
# Emo — scheduled push reminders

Paste this into the Supabase SQL editor (Dashboard → SQL Editor → New query)
and run it once. It creates the pg_cron job that calls the `push-reminder`
edge function every half hour.

The function itself works out who is due: it reads each learner's local
reminder time and timezone offset, so a learner in Cairo and a learner in
London are each reminded at 09:00 THEIR time.

Requirements:
  - the `cron` and `net` extensions (pg_cron + pg_net)
  - the `push-reminder` edge function deployed
  - the `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` secrets set
*/

-- The extensions are usually already enabled on Supabase; this is a no-op
-- when they are.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove an older schedule if one exists, so this script can be re-run.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'emo-push-reminders') then
    perform cron.unschedule('emo-push-reminders');
  end if;
end $$;

select cron.schedule(
  'emo-push-reminders',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://eaddiwghkxsewueioqoy.supabase.co/functions/v1/push-reminder',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- Confirm it is registered.
select jobid, jobname, schedule, active from cron.job where jobname = 'emo-push-reminders';
