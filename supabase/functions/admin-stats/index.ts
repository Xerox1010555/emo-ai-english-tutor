/**
 * Emo — admin-stats edge function
 *
 * The only endpoint that looks at every learner at once. It is protected
 * twice: the caller's token must be valid AND their profile must carry
 * `is_admin = true`. It reads with the service role key because an admin
 * dashboard is, by definition, cross-user.
 *
 * It returns AGGREGATES plus a per-learner list. No secrets, no message
 * contents, no API keys.
 */
import { createClient } from 'npm:@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface LearnerRow {
  id: string;
  email: string;
  current_level: string;
  target_level: string;
  streak: number;
  xp: number;
  placement_done: boolean;
  created_at: string;
  last_active_date: string | null;
  ui_language: string | null;
  lessons: number;
  quests: number;
  chats: number;
  quizzes: number;
  quiz_average: number | null;
  vocab: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Use POST.' }, 405);
  }

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return json({ error: 'Missing bearer token.' }, 401);
  }
  const token = auth.slice(7).trim();

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    return json({ error: 'Supabase credentials are missing.' }, 500);
  }

  // 1. Verify the caller and check the admin flag.
  const caller = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: authData, error: authError } = await caller.auth.getUser(token);
  if (authError || !authData?.user) {
    return json({ error: 'Invalid or expired session.' }, 401);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return json({ error: 'This account is not an administrator.' }, 403);
  }

  // 2. Gather the data. Each count is a cheap aggregate query.
  const [profilesRes, lessonsRes, questsRes, chatsRes, quizzesRes, vocabRes, mistakesRes, examsRes] =
    await Promise.all([
      admin
        .from('profiles')
        .select(
          'id, current_level, target_level, streak, xp, placement_done, created_at, last_active_date, ui_language',
        ),
      admin.from('daily_lessons').select('user_id, completed'),
      admin.from('daily_quests').select('user_id, completed'),
      admin.from('conversation_logs').select('user_id, role, created_at'),
      admin.from('quiz_results').select('user_id, score, total, taken_at'),
      admin.from('vocabulary').select('user_id, mastered'),
      admin.from('recurring_mistakes').select('label, category, occurrences'),
      admin.from('exam_results').select('user_id, exam_id, total_score, created_at'),
    ]);

  const profiles = profilesRes.data ?? [];
  const lessons = lessonsRes.data ?? [];
  const quests = questsRes.data ?? [];
  const chats = chatsRes.data ?? [];
  const quizzes = quizzesRes.data ?? [];
  const vocab = vocabRes.data ?? [];
  const mistakes = mistakesRes.data ?? [];
  const exams = examsRes.data ?? [];

  // 3. Per-learner roll-up.
  const byUser = new Map<string, LearnerRow>();
  const emails = new Map<string, string>();

  // The learner list lives in auth.users, which the service role can read.
  const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of authUsers?.users ?? []) {
    emails.set(user.id, user.email ?? '');
  }

  for (const row of profiles) {
    byUser.set(row.id, {
      id: row.id,
      email: emails.get(row.id) ?? '',
      current_level: row.current_level,
      target_level: row.target_level,
      streak: row.streak ?? 0,
      xp: row.xp ?? 0,
      placement_done: row.placement_done ?? false,
      created_at: row.created_at,
      last_active_date: row.last_active_date,
      ui_language: row.ui_language,
      lessons: 0,
      quests: 0,
      chats: 0,
      quizzes: 0,
      quiz_average: null,
      vocab: 0,
    });
  }

  const quizTotals = new Map<string, { score: number; total: number }>();

  for (const lesson of lessons) {
    const entry = byUser.get(lesson.user_id);
    if (entry && lesson.completed) entry.lessons += 1;
  }
  for (const quest of quests) {
    const entry = byUser.get(quest.user_id);
    if (entry && quest.completed) entry.quests += 1;
  }
  for (const chat of chats) {
    const entry = byUser.get(chat.user_id);
    if (entry && chat.role === 'user') entry.chats += 1;
  }
  for (const quiz of quizzes) {
    const entry = byUser.get(quiz.user_id);
    if (!entry) continue;
    entry.quizzes += 1;
    const current = quizTotals.get(quiz.user_id) ?? { score: 0, total: 0 };
    current.score += Number(quiz.score) || 0;
    current.total += Number(quiz.total) || 0;
    quizTotals.set(quiz.user_id, current);
  }
  for (const card of vocab) {
    const entry = byUser.get(card.user_id);
    if (entry && card.mastered) entry.vocab += 1;
  }

  for (const [userId, totals] of quizTotals) {
    const entry = byUser.get(userId);
    if (entry && totals.total > 0) {
      entry.quiz_average = Math.round((totals.score / totals.total) * 100);
    }
  }

  const learners = Array.from(byUser.values()).sort((a, b) => b.xp - a.xp);

  // 4. Aggregates.
  const totalLearners = learners.length;
  const activeLearners = learners.filter((l) => l.last_active_date).length;
  const placedLearners = learners.filter((l) => l.placement_done).length;
  const totalXp = learners.reduce((sum, l) => sum + l.xp, 0);
  const totalChats = chats.filter((c) => c.role === 'user').length;
  const totalLessons = learners.reduce((sum, l) => sum + l.lessons, 0);
  const totalQuests = learners.reduce((sum, l) => sum + l.quests, 0);

  // Daily activity for the last 14 days.
  const days: { date: string; lessons: number; chats: number; quizzes: number }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: key, lessons: 0, chats: 0, quizzes: 0 });
  }
  const dayIndex = new Map(days.map((d, i) => [d.date, i]));
  for (const lesson of lessons) {
    if (!lesson.completed) continue;
    const key = String(lesson.date).slice(0, 10);
    const index = dayIndex.get(key);
    if (index !== undefined) days[index].lessons += 1;
  }
  for (const chat of chats) {
    if (chat.role !== 'user') continue;
    const key = String(chat.created_at).slice(0, 10);
    const index = dayIndex.get(key);
    if (index !== undefined) days[index].chats += 1;
  }
  for (const quiz of quizzes) {
    const key = String(quiz.taken_at).slice(0, 10);
    const index = dayIndex.get(key);
    if (index !== undefined) days[index].quizzes += 1;
  }

  // 5. Cost estimate.
  // Every tutor turn is one model call, an AI lesson is one more, and a weekly
  // report is one per week. The unit prices are the public list prices of the
  // small models the app uses, so the number is an ESTIMATE, clearly labelled.
  const PRICE_PER_CALL_USD = 0.0004;
  const calls = totalChats + totalLessons * 0.2 + learners.length * 0.15;
  const estimatedCostUsd = Math.round(calls * PRICE_PER_CALL_USD * 100) / 100;

  // 6. The mistakes that repeat across the whole cohort.
  const mistakeMap = new Map<string, { label: string; category: string; total: number; learners: number }>();
  for (const mistake of mistakes) {
    const key = String(mistake.label).toLowerCase();
    const entry = mistakeMap.get(key) ?? {
      label: String(mistake.label),
      category: String(mistake.category ?? 'other'),
      total: 0,
      learners: 0,
    };
    entry.total += Number(mistake.occurrences) || 0;
    entry.learners += 1;
    mistakeMap.set(key, entry);
  }
  const topMistakes = Array.from(mistakeMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  // 7. Level distribution.
  const levelDistribution = new Map<string, number>();
  for (const learner of learners) {
    levelDistribution.set(
      learner.current_level,
      (levelDistribution.get(learner.current_level) ?? 0) + 1,
    );
  }

  return json({
    generatedAt: new Date().toISOString(),
    totals: {
      learners: totalLearners,
      activeLearners,
      placedLearners,
      totalXp,
      totalLessons,
      totalQuests,
      totalChats,
      exams: exams.length,
      avgXpPerLearner: totalLearners > 0 ? Math.round(totalXp / totalLearners) : 0,
    },
    cost: {
      estimatedCalls: Math.round(calls),
      estimatedUsd: estimatedCostUsd,
      pricePerCall: PRICE_PER_CALL_USD,
      note: 'Estimate from public list prices; the real figure depends on the model in use.',
    },
    activity: days,
    levelDistribution: Array.from(levelDistribution.entries()).map(([level, count]) => ({
      level,
      count,
    })),
    topMistakes,
    learners: learners.slice(0, 200),
  });
});
