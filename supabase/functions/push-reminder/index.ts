/**
 * Emo — push-reminder edge function
 *
 * Sends the daily study reminder to devices that are subscribed to Web Push,
 * so a nudge arrives even when the app is closed.
 *
 * This function is the one place that reads the database for other users, and
 * it does so with the SERVICE ROLE key — deliberately, because the scheduler
 * runs on a timer with nobody signed in. It never accepts a user id from the
 * request: it works out who is due from the database itself.
 *
 * Secrets:
 *   VAPID_PRIVATE_KEY  (base64url, the private key of the key pair)
 *   VAPID_PUBLIC_KEY   (optional, for diagnostics)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_URL, SUPABASE_ANON_KEY (provided by the platform)
 *
 * Optional:
 *   PUSH_SUBJECT       mailto:you@example.com
 *   PUSH_TTL           default 3600
 */

import { createClient } from 'npm:@supabase/supabase-js';
import webpush from 'npm:web-push';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DueRow {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  reminder_time: string;
  ui_language: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function copyFor(language: string, incompleteQuests: number, streak: number): {
  title: string;
  body: string;
} {
  if (language === 'ar') {
    if (streak > 0) {
      return {
        title: 'وقت الإنجليزي',
        body: `عندك ${incompleteQuests} مهمة اليوم. الـ streak بتاعك (${streak} يوم) مستنيك.`,
      };
    }
    return {
      title: 'وقت الإنجليزي',
      body: '15 دقيقة بس وابدأ. درس واحد يكفي.',
    };
  }

  if (incompleteQuests > 0) {
    return {
      title: 'Your English practice is ready',
      body: `${incompleteQuests} short quest${incompleteQuests > 1 ? 's' : ''} left today — ten focused minutes.`,
    };
  }
  return {
    title: 'Your English practice is ready',
    body: 'A few minutes today keeps your streak going.',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Use POST.' }, 405);
  }

  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const subject = Deno.env.get('PUSH_SUBJECT') ?? 'mailto:support@example.com';
  const ttl = Number(Deno.env.get('PUSH_TTL') ?? '3600');

  if (!privateKey || !publicKey) {
    return json(
      { error: 'Push is not configured. Set VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY.' },
      503,
    );
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return json({ error: 'Supabase credentials are missing.' }, 500);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc('due_push_subscriptions');
  if (error) {
    return json({ error: `Could not read due subscriptions: ${error.message}` }, 500);
  }

  const due = (data ?? []) as DueRow[];
  if (due.length === 0) {
    return json({ sent: 0, skipped: 0, message: 'Nobody is due right now.' });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const row of due) {
    // How much is waiting for this learner, so the copy can be specific.
    const { count } = await admin
      .from('daily_quests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', row.user_id)
      .eq('completed', false);

    const { data: profile } = await admin
      .from('profiles')
      .select('streak')
      .eq('id', row.user_id)
      .maybeSingle();

    const copy = copyFor(row.ui_language, count ?? 0, profile?.streak ?? 0);

    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        JSON.stringify({
          title: copy.title,
          body: copy.body,
          tag: 'emo-daily-reminder',
          url: '/',
        }),
        { TTL: ttl },
      );
      sent += 1;
      await admin
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('endpoint', row.endpoint);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      // 404/410 mean the browser dropped the subscription — clean it up.
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
        skipped += 1;
      } else {
        failures.push(`${row.user_id}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }
  }

  return json({ sent, skipped, failures: failures.slice(0, 5) });
});
