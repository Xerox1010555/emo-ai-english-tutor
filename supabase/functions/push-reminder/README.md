# push-reminder

Sends the daily study reminder to devices subscribed to **Web Push**, so the
nudge arrives even when the app is closed.

Unlike `tutor-reply` and `content-gen`, this function is the one place that
reads the database on behalf of other users: it uses the **service role** key
because it runs on a timer with nobody signed in. It never accepts a user id
from the request — it works out who is due from the database itself.

## Deploy

```bash
supabase functions deploy push-reminder
```

## Secrets

| Secret | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Reads the subscriptions and profiles (provided to the platform, but set it explicitly if needed) |
| `VAPID_PRIVATE_KEY` | yes | The private half of the VAPID key pair (base64url) |
| `VAPID_PUBLIC_KEY` | yes | The public half — the same value as `VITE_VAPID_PUBLIC_KEY` in the app |
| `PUSH_SUBJECT` | no | `mailto:you@example.com` — how push services reach you |
| `PUSH_TTL` | no | Seconds a message may be retried (default 3600) |

Generate a VAPID key pair:

```bash
npx web-push generate-vapid-keys
```

Put the public key in the app's `.env`:

```
VITE_VAPID_PUBLIC_KEY=<public key>
```

## Schedule it

The function is designed to be called on a timer. In the Supabase SQL editor:

```sql
select cron.schedule(
  'emo-push-reminders',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/push-reminder',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

Every half hour it looks for learners whose local reminder hour is now due
(`profiles.notification_time`), and sends one push per subscribed device. It
cleans up subscriptions the browser has discarded (HTTP 404/410).

## What it sends

The copy follows the learner's interface language (`profiles.ui_language`) and
mentions how many quests are still open, so the nudge is specific rather than
generic.
