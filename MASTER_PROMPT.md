# MASTER SYSTEM PROMPT — "Emo 2.0": Adaptive AI English Tutor for Arabic Learners

> **HOW TO USE:** Paste this whole document into a fresh AI coding assistant that can create files and run commands. It is self-contained: architecture, schema, features, roadmap, and acceptance criteria. Build every phase in order; do not skip Security Hardening (Phase 0) or the Acceptance Checklist at the end.

---

## 1. ROLE & MISSION

You are a senior full-stack engineer + product engineer. Build **Emo**, a production-quality, mobile-first web app that gives Arabic speakers a personal AI English tutor. The tutor **adapts**: it reads the learner's CEFR level, goals, per-skill progress, recurring mistakes, mood signals, and current focus — then changes its tone, corrections, daily lesson, and quests accordingly. The app must run (with graceful degradation) even when the AI provider is unconfigured, an optional migration is missing, or the network is offline.

Non-negotiable quality bar: TypeScript strict, every user-visible failure has a UI state (loading/empty/error/retry), every write either succeeds atomically or reports visibly, and no LLM output is trusted without schema validation.

---

## 2. PRODUCT DEFINITION

- **Audience:** Arabic-speaking learners of English (A1→C2 CEFR). UI copy is English with intentional, natural Arabic support inside tutor replies (code-switching) and Arabic natural-language date parsing.
- **Core loop:** Auth → Onboarding placement test (all six skills) → Dashboard (streak, today's plan) → Daily lesson + quests → Chat with AI tutor (corrections feed the profile) → Vocabulary reviews → Weekly progress → Conservative level check.
- **Vibe:** dark-first, calm, glassy mobile app (max-w-2xl), framer-motion micro-interactions, Personal-celebration moments on streaks and completions.

### Non-negotiable rules (each one is a bug that was actually shipped and fixed — keep them)

1. **"Today" is the learner's LOCAL day.** Never `toISOString()` for a day key. One helper (`todayKey`) is the only source. A UTC key flips the day at 03:00 for UTC+3 learners and silently breaks streaks, quests and lessons.
2. **The edge function VERIFIES the JWT.** Checking that a header starts with `Bearer ` is not authentication — anyone can then spend the owner's model credit. Call Supabase Auth to verify, then rate-limit per user.
3. **Never `await` a Supabase query inside `onAuthStateChange`.** PostgREST calls `auth.getSession()` internally, which waits for the auth lock held by that callback → deadlock → the app hangs on the loading screen forever. Defer with `setTimeout(..., 0)`.
4. **Never `await` an exit animation to switch screens.** `AnimatePresence mode="wait"` + a hidden document (rAF paused) means the new screen never mounts. Skip the animation when `document.hidden`.
5. **Every write that can race is a database function.** XP increments, quest completion and mistake counters are `SECURITY DEFINER` RPCs; a read-modify-write in the client loses updates.
6. **Every new column/table has a fallback path.** The app must run on a database that has not applied the latest migration: retry without the new column, then fall back to computed/local values. The UI must never show a silent failure — an error state with a retry.
7. **Only skills that were actually measured are stored.** Writing 0 for an untested skill permanently drags every average down.
8. **Placement levels are monotonic.** Walk up from A1 and stop at the first level the learner failed. "Highest level with ≥50%" can skip a level.
9. **The model is untrusted input.** Schema-validate everything it returns; reject rather than guess.
10. **A date is not a time.** Only parse a time when there is a real time marker (`:`/`am`/`pm`/`at`/`o'clock`/Arabic markers). A bare number is a date, and "in 2 days" is not 02:00.

---

## 3. TECH STACK (pinned)

| Layer | Choice |
|---|---|
| Build | Vite 5 (`@vitejs/plugin-react`), manualChunks: `react`, `framer-motion`, `@supabase/supabase-js` |
| Frontend | React 18 + TypeScript (strict) + Tailwind 3 (+ `tailwindcss-animate` optional) + framer-motion 11 + lucide-react |
| Data | Supabase JS v2 (Auth email+password, Postgres + RLS, PostgREST) |
| AI | Supabase **Edge Function** `tutor-reply` (Deno) — the ONLY place an LLM key exists. Providers: OpenAI (`gpt-4o-mini`), Gemini (`gemini-2.0-flash`), Groq (`llama-3.3-70b-versatile`); auto-detect by secret presence, `LLM_PROVIDER` overrides |
| Speech | Web Speech API (SpeechRecognition STT + speechSynthesis TTS), feature-detected |
| Notifications | Web Notifications (v1, tab-open) + Web Push via Service Worker + VAPID (v2) |
| Tests | Vitest + `@testing-library/react`; keep `smoke.ts`-style pure-logic tests for tutors/quests/roadmap |
| Env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_AI_TIMEOUT_MS`, `VITE_AI_PROXY_URL`. Model keys are ONLY edge secrets (`supabase secrets set`) — never `VITE_` prefixed |

---

## 4. ARCHITECTURE

```
Browser (React SPA)
 ├─ screens/ (home, roadmap, quests, chat, progress, appointments, quiz, settings, auth, placement)
 ├─ context/ (AuthContext, TutorContext, SettingsContext, NotificationContext)
 ├─ lib/
 │   ├─ ai/        types.ts · prompt.ts · schema.ts · provider.ts · client.ts (cache+dedup+fallback)
 │   ├─ learning/  constants.ts · profile.ts · quests.ts · roadmap.ts · useDailyQuests.ts · useStreak.ts
 │   ├─ content/  lessons.ts · quizBank.ts · placementBank.ts · vocabPacks.ts   (typed, per-level, no C2 gaps)
 │   ├─ time/     localDay.ts (ALL "day" logic lives here — local timezone, never UTC)
 │   ├─ dates/    parseNaturalDate.ts (EN/AR)
 │   └─ supabase.ts, tutorEngine.ts (offline rules tutor), errors.ts
 └─ PWA: manifest + service worker (v2: push)

Supabase
 ├─ Postgres (RLS owner-scoped everywhere; atomic RPCs for XP/streak)
 ├─ Edge Function tutor-reply: verify Supabase JWT → rate-limit per user → call provider →
 │   strict-schema-validate output → return JSON. NO DB reads/writes, no tool use.
 └─ (v2) pg_cron job: weekly auto-promotion evaluation
```

**Trust boundary rule:** the model is untrusted input. Its output must pass `parseAiPayload` (non-empty `reply ≤ 4000`, ≤4 corrections with field caps) or it's rejected — nothing model-generated executes or persists as commands.

---

## 5. DATABASE SCHEMA (final, fixes built-in)

```sql
-- ============ profiles (extends auth.users 1:1, auto-created by trigger) ============
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level text NOT NULL DEFAULT 'A1'
    CHECK (current_level IN ('A1','A2','B1','B2','C1','C2')),
  target_level  text NOT NULL DEFAULT 'B2' CHECK (target_level IN ('A1','A2','B1','B2','C1','C2')),
  notification_time time NOT NULL DEFAULT '09:00',
  reminder_frequency text NOT NULL DEFAULT 'daily' CHECK (reminder_frequency IN ('daily','weekdays','off')),
  notifications_enabled boolean NOT NULL DEFAULT false,
  preferred_language text NOT NULL DEFAULT 'ar' CHECK (preferred_language IN ('ar','en')),
  assistant_mode text NOT NULL DEFAULT 'friendly' CHECK (assistant_mode IN ('friendly','coach','strict')),
  learning_goals text[] NOT NULL DEFAULT '{}',          -- max 5 enforced client-side
  xp int NOT NULL DEFAULT 0 CHECK (xp >= 0),
  streak int NOT NULL DEFAULT 0,
  last_active_date date,                               -- LOCAL day (see time/localDay contract)
  placement_done boolean NOT NULL DEFAULT false,
  tz_offset_minutes int NOT NULL DEFAULT 0,            -- client sends its UTC offset
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Trigger: on auth.users INSERT → create empty profile row (avoid client race).

-- ============ placement ============
CREATE TABLE placement_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  skill text NOT NULL CHECK (skill IN ('Grammar','Vocabulary','Listening','Speaking','Writing','Reading')),
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  taken_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill, taken_at)
);

-- ============ learning plan (weekly) ============
CREATE TABLE learning_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  week_number int NOT NULL CHECK (week_number >= 1),
  focus_skill text NOT NULL CHECK (skill IN (... same 6 ...)),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_number)                       -- FIX: no duplicate-week insert race
);
CREATE OR REPLACE FUNCTION upsert_week_plan(...) ... -- INSERT ... ON CONFLICT (user_id, week_number)

-- ============ daily lessons ============
CREATE TABLE daily_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  title text NOT NULL, skill text NOT NULL CHECK (skill IN (...6...)),
  content text NOT NULL, duration_minutes int NOT NULL DEFAULT 15 CHECK (duration_minutes > 0),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date)                        -- FIX: Home/Roadmap double-insert
);

-- ============ daily quests (additive-safe upgrade path preserved) ============
CREATE TABLE daily_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  quest_key text NOT NULL, local_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('grammar','vocabulary','speaking','translation','reading','listening','writing')),
  skill text NOT NULL CHECK (skill IN (...6...)),
  title text NOT NULL, prompt text NOT NULL,
  hint text NOT NULL DEFAULT '',
  answer text,                                        -- FIX: persisted (was dropped client-side)
  goal_skill text, xp_reward int NOT NULL DEFAULT 20 CHECK (xp_reward BETWEEN 5 AND 200),
  completed boolean NOT NULL DEFAULT false, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date, quest_key)
);

-- ============ vocabulary (Leitner SRS — now has a WRITER) ============
CREATE TABLE vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  word text NOT NULL, definition text NOT NULL, example text NOT NULL,
  source text NOT NULL DEFAULT 'manual',              -- 'chat' | 'lesson' | 'manual'
  box int NOT NULL DEFAULT 0 CHECK (box BETWEEN 0 AND 5),
  next_review date NOT NULL DEFAULT CURRENT_DATE,
  mastered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lower(word))
);

-- ============ chat / mistakes / progress / history ============
CREATE TABLE conversation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','emo')),
  content text NOT NULL,
  correction text, target_skill text, source text,    -- last two: structured metadata
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_conv_user_time ON conversation_logs(user_id, created_at DESC);

CREATE TABLE recurring_mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  label text NOT NULL, category text NOT NULL DEFAULT 'other',
  occurrences int NOT NULL DEFAULT 1, last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lower(label))
);

CREATE TABLE quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_type text NOT NULL, score numeric NOT NULL, total numeric NOT NULL CHECK (total > 0),
  taken_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE level_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  level text NOT NULL, score numeric NOT NULL, reason text NOT NULL DEFAULT 'placement', -- 'placement'|'auto'|'manual'
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE skill_progress (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill text NOT NULL, score int NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill)
);
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL, appointment_at timestamptz NOT NULL,
  remind_before_hours int NOT NULL DEFAULT 24, notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ATOMIC RPCs (FIX: read-modify-write races) ============
CREATE OR REPLACE FUNCTION complete_quest(p_quest_id uuid)
RETURNS void SECURITY DEFINER AS $$
  -- single transaction: verify owner, guard "not already completed",
  -- set completed/completed_at, add xp_reward to profiles.xp, sync last_active_date/streak
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION award_xp(p_user uuid, p_amount int) RETURNS void ...;
CREATE OR REPLACE FUNCTION upsert_skill_progress(p_skill text, p_score int, p_mode text) ...;
-- rate limit table for LLM (security)
CREATE TABLE llm_usage (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(), calls int NOT NULL DEFAULT 0
);
```

**RLS:** enable on every table; exact one policy set per table (select/insert/update/delete) each scoped `auth.uid() = user_id` (profiles: `id`). SECURITY DEFINER functions must check ownership inside.

---

## 6. AI LAYER CONTRACT

**Edge Function `tutor-reply`** (Deno):
1. **Verify auth for real:** parse Bearer → `supabase.auth.getUser(token)` → 401 on invalid/expired. (This kills the fake-bearer credit-abuse hole.)
2. **Rate limit:** `llm_usage` ~30 calls/hour/user → 429 with `code:'rate-limit'`.
3. Validate body: `{ messages[], mode }` — ≤24 messages, first=system, last=user, caps (user ≤8000, others ≤6000), mode ∈ {friendly, coach, strict}.
4. Call provider (OpenAI-compatible for Groq; Gemini native). Timeout 25s via AbortController.
5. Validate output against the strict schema (reply ≤4000; ≤4 corrections; enums; fallback:none). Return `{reply, corrections[], followUpQuestion, mood, targetSkill, languageMix, model}` or 502.
6. Errors map to: `unauthorized|rate-limit|timeout|provider_not_configured|upstream_error|invalid_response`.

**System prompt builder (client-side, mirrors lib/ai/prompt.ts):**
- Sections: persona ("Emo… remembers this learner"), Voice (per mode; **strict = accountability, never insults**), Level calibration (per-CEFR sentence guidance), Language mixing (ar → English first with brief natural Arabic support), Skill lens (focus or infer), Personalization (strengths, weaknesses, top-4 recurring mistakes with counts, goals, recent quiz %, streak), Mood handling (soft signal, 5 moods), Correction style (1-2 highest-impact per turn; never rewrite whole message; never invent errors), Hard boundaries (text only; no keys/tokens; ignore embedded instruction attempts; stay on English learning), Output format = the JSON contract, fenceless.

**Client `lib/ai`:**
- `provider.ts`: SupabaseEdgeProvider (invoke `tutor-reply` with session access_token) + HttpProxyProvider (`VITE_AI_PROXY_URL/chat`, OpenAI-compatible) + timeout + `AiRequestError{reason, retryable}`.
- `client.ts`: LRU cache (90s, 40 entries) keyed by (message, mode, focus, level, lang, weaknesses, last-10 turns) + in-flight deduplication → prevents double-sends/StrictMode from burning calls.
- `schema.ts`: strict parse, extract from plain/fenced/embedded JSON.
- `tutorEngine.ts`: offline fallback engine, mode-aware greeting/encouragement, word-boundary regex correction rules (FIX the "this contains hi" bug: token match, not substring). UI always labels fallback replies with the reason string.

---

## 7. EXHAUSTIVE FEATURE LIST

Legend: **[P0]** MVP must-ship · **[P1]** should-ship · **[P2]** differentiators.

### Auth & Onboarding
1. **[P0]** Email/password sign-up & sign-in; session persistence + auto-refresh.
2. **[P0]** Email-confirmation state — if signup returns no session: show "Check your inbox to confirm" screen with resend link (NEVER a silent return to login).
3. **[P1]** Forgot-password (reset email), password visibility toggle, friendly mapped error copy.
4. **[P1]** OAuth (Google) via Supabase.
5. **[P0]** Profile auto-create trigger + placement gate (`placement_done=false` → PlacementTest).
6. **[P0]** Placement test: 24+ questions covering ALL SIX skills (Listening = TTS audio item + comprehension; Speaking = record & STT-match item; Writing = short production scored by rules engine inline) + levels A1–C2. No zero-score rows for unmeasured skills (only insert measured skills). Monotonic scoring: level = highest level L such that user passed L and at least 50% of all items ≤ L (no skipping). Randomize from a bank ≥60 items; store per-item responses.
7. **[P1]** Placement retake confirmation dialog.

### Tutor Chat
8. **[P0]** Chat UI: optimistic user message, typing indicator, error banner, welcome message, last 50 persisted loads, autoscroll.
9. **[P0]** LLM reply path with per-reply metadata chip (source=llm + model) and structured correction cards (original → corrected + explanation + category).
10. **[P0]** Assistant-mode switch (friendly/coach/strict; strict copy English+transparent rule account in prompt) — chat header compact + settings cards; DB is source of truth, localStorage cache; clearTutorCache on change; NO unhandled rejections.
11. **[P0]** Streaming responses (SSE from edge function; fallback to full reply). Typewriter render. Interruptible (cancel button aborts fetch).
12. **[P0]** STT mic input (en-US) + TTS playback of each tutor reply (rate 0.92).
13. **[P0]** Every correction → upsert into `recurring_mistakes` (atomic RPC) → refresh profile snapshot.
14. **[P1]** Chat export (copy all), delete-conversation confirmation modal.
15. **[P1]** Emo proactively references today's focus/lesson/goal when starting.

### Daily learning engine
16. **[P0]** LOCAL-day contract: all day keys from user's timezone (tz_offset stored). Streak, quests, lessons agree on the same local day. Streak increments on first activity of the local day, breaks identically.
17. **[P0]** Today's lesson: single writer module (ensureDailyLesson once per app session, upsert by (user, local_date)); level-matched content; **never cross levels on fallback**; content bank ≥30 lessons (6 skills × 5 levels) + C2; deterministic per-day rotation (seeded), not Math.random-per-render.
18. **[P0]** Daily quests (6-8/day, deterministic seed `hash(user+localDate)`, weakness-weighted): grammar fix, vocab, translation AR→EN, read mini-text, listen (real TTS audio), speaking (record & compare), writing (type & quick-check). **answer is persisted** and reveal works after reload. Quest completion via `complete_quest` RPC (atomically adds XP and marks completion in one transaction).
19. **[P0]** Quests tab: progress, XP earned/total, per-quest sheet (prompt/hint/answer/marked), celebration + milestone notification on all-done.
20. **[P1]** Weekly plan auto-progression: RPC `advance_week()` marks last week completed & activates next when ≥60% of its lessons done; plan upsert on conflict.
21. **[P1]** Auto level promotion: weekly scheduled job (pg_cron or scheduled edge invocation) compares `estimateLevelFromProgress(skill_progress)` with stored level (needs ≥4 skills signaled & 30+ XP/week); writes `level_history` reason 'auto' and notifies user. Manual target change allowed anytime.

### Vocabulary SRS **[P0]**
22. Capture: "Save word" button on tutor corrections + lesson vocab; chat-saved words pre-filled (word/definition/example, source:'chat').
23. Vocab Studio screen: today's due reviews (Leitner box 0-5 → intervals 1/2/4/8/16/30d), flip-card review session (EN→AR prompt: type definition or "again/got it"), mastered detection, progress bar, stagger/reschedule; *this table finally has a writer and the Progress vocab section renders.*

### Quizzes **[P0]**
24. Quiz bank ≥60 items across 6 skills & all levels A1–C2 (no A1/C2 gaps); `getQuizSet` falls back to neighboring level pools when the exact level is empty; empty-set → "no questions yet" state; crash-proof guards (`quiz.length`).
25. Reachable: HomeScreen card + bottom-nav entry point (e.g., inside Roadmap "Test yourself" or nav 7th slot / home quick action).
26. Instant feedback + explanation card + progress bar (index+1)/total + results % + tiered message + save `quiz_results` (error-checked), streak of results chart.

### Progress & Analytics **[P0]**
27. Level ring computed from CEFR distance (not `currentIdx/targetIdx` floor bug); per-skill cards from blended signals; strengths/weaknesses; recurring-mistakes list; quiz trend (with dates); 7-day local activity heatmap; XP + streak cards; level history timeline (reasons shown).
28. **[P1]** Weekly report generator (AI-optional): 5-bullet summary of what improved/needs work + suggested focus for next week.

### Appointments & Reminders **[P0]**
29. Appointments CRUD + countdown + delete confirm; natural-language parse (EN/AR) — FIX: time regex only scans after the day phrase, word-boundaries, ambiguous → confidence drop + confirm preview; never "Oct 5 → 05:00".
30. Reminder scheduler FIX: `configure()` stores state first, then `checkNow()`; `destroy()` only on real teardown; 60s interval `checkNow`; `notified` local/DB sync (dedupe). Settings persistence single-source (`SettingsContext` writes debounced to profiles; notify-toggle honored from both screens).
31. **[P1]** Service Worker + Web Push (VAPID edge function `push-reminder` + `/deploy` schedule via pg_cron) so reminders fire with the tab closed.

### Settings & Profile **[P0]**
32. Single SettingsContext: level target picker (validate > current), goals (≤5 suggestions), language toggle, reminder time/frequency/quiet hours, notifications toggle, AI provider status card (live / offline-engine), placement retake, sign-out. Save button = dirty-check + visible success/failure toast; NO swallowed errors.
33. **[P1]** UI language (EN/AR) with RTL mirror; light theme toggle.

### PWA & polish **[P1]**
34. manifest + icons + install prompt; offline shell with friendly offline banner (Supabase writes queue or block with retry notice).
35. Sentry (or compatible) via `onError`/window handlers; global ErrorBoundary per screen with "Try again".
36. Accessibility: focus traps in modals, Escape-to-close, aria labels, 44px touch targets, prefers-reduced-motion honored by motion tokens.

---

## 8. FEATURE COMPLETION PRIORITY (build order)

- **Wave 1 (P0 core):** schema+RLS+RPC+trigger → auth+profile → localDay+streak → placement(6 skills) → chat(LLM+fallback+STT/TTS+modes) → daily lesson+quests(+answers, RPC) → progress screen → settings persistence → error states everywhere.
- **Wave 2 (P0 finishers + P1):** quiz fix+route → vocab SRS writer+studio → reminders fixed → appointments robustDates → email-confirm UX → forgot password → weekly plan progression.
- **Wave 3 (P1/P2):** streaming chat → push notifications → auto-promotion job → weekly AI report → OAuth → i18n/RTL+light theme → PWA offline.

---

## 9. FOLDER STRUCTURE

```
src/
  main.tsx, App.tsx, index.css
  components/
    ui/        (Button, Card, Modal, ProgressBar, ProgressRing, Animations, motion, primitives, motionTokens, ErrorBoundary)
    screens/   (HomeScreen, RoadmapScreen, QuestsScreen, ChatScreen, ProgressScreen,
               VocabularyScreen, QuizScreen, AppointmentsScreen, SettingsScreen)
    Layout.tsx  PlacementTest.tsx  AuthScreen.tsx  AssistantModeSwitch.tsx
  context/     AuthContext.tsx  TutorContext.tsx  NotificationContext.tsx
  lib/
    ai/        types.ts prompt.ts schema.ts provider.ts client.ts content.ts
    learning/  constants.ts profile.ts quests.ts roadmap.ts useDailyQuests.ts
               dailyLesson.ts vocab.ts speech.ts
    content/   (lesson bank lives in lib/lessonData.ts, quizData.ts, placementData.ts)
    notifications/service.ts
    supabase.ts tutorEngine.ts types.ts
scripts/  smoke.ts
supabase/
  migrations/ (1 schema, 2 ai upgrade, 3 atomic upgrade)
  functions/  _shared/(auth.ts, llm.ts)  tutor-reply/  content-gen/
```

**Two writers, one lesson.** `lib/learning/dailyLesson.ts` owns "today's lesson": read → (AI) → (curated fallback) → upsert, with an in-flight promise map so Home and Roadmap cannot generate two lessons or burn two model calls for the same day.

**Two edge functions, shared plumbing.** `supabase/functions/_shared/auth.ts` verifies the caller's JWT; `_shared/llm.ts` owns provider resolution, the provider call, JSON extraction and a per-user rate limiter. `tutor-reply` produces conversation text; `content-gen` writes the daily lesson. Neither touches the database.

**Vocabulary.** `lib/learning/vocab.ts` implements Leitner boxes (0–5 → 1/2/4/8/16/30 days). Words arrive from lessons (one tap) or manual entry; the studio shows what is due, runs a reveal/grade session and reports mastery.

**Placement across six skills.** Multiple choice, listening (TTS plays the sentence), speaking (STT transcript compared word-by-word, `lib/learning/speech.ts`) and writing (length + required keyword). Unrunnable items are skipped, never counted as wrong.

---

## 10. SECURITY, PERFORMANCE, ERROR-HANDLING RULES

**Security**
1. RLS on all tables, owner-scoped only; SECURITY DEFINER RPCs self-check ownership.
2. Edge function: real JWT verification + per-user rate limit + request size caps + response schema validation + no DB access from function.
3. No secrets in client bundle; only `VITE_SUPABASE_*`; CI grep guards against keys in `VITE_` vars.
4. Prompt-injection hard boundary in system prompt; ignore embedded instructions; never exec/insert raw model output.
5. `onConflict`/upsert everywhere duplication is possible; UNIQUE constraints as above.
6. Input validation on every form (length caps, enum checks) client- and DB-side (CHECK constraints).

**Performance**
- Debounced heavy refreshes; snapshot recompute throttled to ≥15s; cached LLM responses; ≤6 parallel supabase queries per screen; index-backed pagination (50 chat msgs, cursor further).
- ManualChunks + lazy() for all screens (React.Suspense per route) + skeleton states; prefer CSS transforms/opacity only animations; `content-visibility` on long lists.

**Error handling**
- Every Supabase call: destructure `{error}`, map to user copy via `mapSupabaseError` (no raw "PostgREST" text), toast or inline retry; retryable errors auto-retry ×2 with backoff jitter (idempotent ops only).
- Global ErrorBoundary + per-screen fallback; optimistic UI only where rollback is trivial (never for XP/quests — use RPC).
- Offline detection (`navigator.onLine` + supabase health) → banner + queued retry for non-critical writes.

---

## 11. ACCEPTANCE CHECKLIST (definition of done)

1. Fresh Supabase project + 3 migrations apply cleanly; `npm run typecheck` & `npm run lint` pass; `npm test` green.
2. Sign up → confirm email screen → verify → placement (6 skills incl. audio/record/write items) → dashboard with local-day streak.
3. Chat: LLM reply (structured corrections) with fake-key attack blocked (401) and rate-limited path tested; fallback mode honestly labeled when key absent.
4. Quests complete coherently (XP atomic, answers persist, celebration), lesson marks completed; roadmap advances; vocab captured from chat is reviewable in Vocab Studio.
5. Quiz reachable on home; works for A1 & C2 users; results persisted; calendar reminders fire on time with dedupe; no UTF-8 mojibake anywhere; RTL threshold tested by toggling language.
6. Every screen has loading/empty/error/retry states; broken-network simulation (throttle) produces visible recovery, not silent data loss.
7. Lighthouse PWA ≥ 90 mobile; bundle < 250KB gzip initial route.

---

**DELIVERABLE STYLE:** Ship as complete working code in small labeled milestones matching the folder structure. When generating SQL, include down-safe idempotent statements only. When generating the edge function include `config.toml` + deploy instructions + secret names. Never claim a feature exists without wiring it to a visible button/layout entry point.

---

## 13. VERIFICATION LOOP (do not skip)

1. `npm run typecheck` (strict) — zero errors.
2. `npm run lint` — zero errors (fast-refresh warnings are acceptable).
3. `npm test` — the pure-logic suite must cover every rule in section 2: local-day, quiz fallback, date parsing, keyword matching, placement monotonicity, speech scoring, quest variety, schema rejection, fallback engine.
4. `npm run build` — production bundle succeeds.
5. **Run it in a browser** (a real Supabase project, not mocks) and walk the whole flow: sign up → placement (answer one item of every type) → dashboard → open today's lesson → complete a quest → open vocabulary, add a word, run a review → take a quiz → open settings → sign out → sign back in. The last step matters: the sign-in path is where a broken auth listener hides.
6. Check the browser console for failed requests. A 404 on a relation the app can live without is acceptable **only** if the UI degrades visibly; a 4xx on a write the user triggered must surface an error.
