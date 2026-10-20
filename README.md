# Emo — AI English Tutor

A personalized English learning app. The tutor reads your level, your goals,
your recent mistakes, and your performance per skill, then adapts its tone, its
corrections, and your daily work to that profile.

## Stack

Vite · React 18 · TypeScript (strict) · Tailwind 3 · Supabase (Auth + Postgres +
Edge Functions) · framer-motion · lucide-react

## Getting started

```bash
npm install
cp .env.example .env      # fill in Supabase URL and anon key
npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm run lint` | ESLint |
| `npm test` | Smoke tests for the tutor, quest, roadmap, date, quiz and placement logic |

## Database

Three migrations, applied in order:

1. `supabase/migrations/20260830044010_emo_schema.sql` — original schema
   (profiles, lessons, plans, chat, quizzes, vocabulary, level history)
2. `supabase/migrations/20260928090000_emo_ai_upgrade.sql` — additive upgrade:
   `profiles.assistant_mode`, `notifications_enabled`, `reminder_frequency`,
   `learning_goals`, `xp`; new tables `daily_quests`, `recurring_mistakes`,
   `skill_progress`
3. `supabase/migrations/20261020000000_emo_atomic_upgrade.sql` — atomic writes
   and persistence fixes:
   - `daily_quests.answer` and `daily_quests.goal_level` (the model answer
     used to be dropped, so "reveal answer" died after a reload)
   - `daily_lessons.vocab`, `.level`, `.source` (a lesson can seed the
     vocabulary deck and be labelled honestly)
   - `vocabulary.source` (where a word came from)
   - `UNIQUE` constraints that stop duplicate rows: `daily_lessons(user_id,date)`,
     `learning_plan(user_id,week_number)`, `vocabulary(user_id,lower(word))`
   - atomic RPCs: `complete_quest(quest_key)`, `award_xp(amount)`,
     `bump_recurring_mistake(label, category)`

**The app runs without the third migration.** Every new relation is read
defensively and falls back to a computed value; the new RPCs are wrapped in
fallbacks that do the same work client-side. Quest completion falls back to
local storage. Apply it for the full behaviour:

```bash
supabase db push          # or paste the file into the SQL editor
```

## Connecting the AI tutor

The model credential is **never** in the frontend. It lives in edge
functions:

```bash
supabase functions deploy tutor-reply
supabase functions deploy content-gen
supabase secrets set OPENAI_API_KEY=sk-...
```

Supported providers: OpenAI, Google Gemini, and Groq. Auto-detected from which
secret is present, or forced with `LLM_PROVIDER`. See
`supabase/functions/tutor-reply/README.md` for the full contract and options.

Until a provider is connected, the tutor falls back to a built-in rules engine
and **says so in the chat UI** rather than pretending to be a model. Settings
shows live connection status.

### Alternative: your own gateway

Set `VITE_AI_PROXY_URL` to a service that exposes
`POST <url>/chat` speaking the OpenAI-compatible contract, holding the
credential itself and validating the Supabase bearer token.

## What the two edge functions do

| Function | Purpose | Database access |
| --- | --- | --- |
| `tutor-reply` | The conversational tutor: corrections, follow-ups, mood, target skill | none |
| `content-gen` | Writes today's lesson at the learner's level, weighted to their weak skills and goals | none |

Both verify the caller's Supabase JWT (a bearer token is *verified*, not just
parsed), rate-limit per user, and return schema-validated JSON only. The
browser owns all state and writes it behind RLS.

## Assistant modes

| Mode | Behaviour |
| --- | --- |
| **Friendly** | Warm, gentle corrections, low pressure |
| **Coach** | Direct, concise, pushes for more output |
| **Strict** | Holds you to your stated commitments |

Strict means **accountability, not abuse**. The prompt explicitly forbids
insults, shaming, and personal attacks, and the system prompt states this.
The mode also changes reminder wording.

## Features

- **Onboarding** — a placement test that measures all six skills: grammar,
  vocabulary, reading (multiple choice), listening (the app speaks the
  sentence), speaking (the app listens and compares your transcript), and
  writing (your answer is checked). The level rule is monotonic: a learner
  cannot be placed above a level they failed.
- **Daily lesson** — written for the learner's level and weak skills. With
  `content-gen` deployed it is generated per learner; otherwise it comes from
  the curated bank, deterministically per day, and never from a level the
  learner cannot use.
- **Daily quests** — deterministic, weakness-weighted, with XP. Completion is
  atomic, so XP cannot be lost or double-counted.
- **Chat** — the tutor, with live corrections, speaking/listening in the
  browser, and a mode-aware personality. Every flagged mistake is recorded and
  fed back into the next prompt.
- **Vocabulary studio** — Leitner spaced repetition (boxes 0–5, 1→30 day
  intervals). Words come from lessons, or you add them yourself.
- **Quizzes** — level-appropriate multiple choice and fill-in-the-blank, with
  a neighbouring-level fallback so no learner ever gets an empty quiz.
- **Progress** — per-skill breakdown, recurring mistakes, quiz trend, weekly
  activity, XP, level history, and a conservative level check that never
  promotes anyone silently.
- **Schedule** — appointments with natural-language dates (English and
  Arabic) and reminders that actually fire.
- **Reminders** — a scheduler that runs on an interval, respects quiet hours
  and the weekly frequency, and never repeats a notification.

## Architecture

```
src/
  lib/ai/          LLM integration
    types.ts         Contracts, failure taxonomy, error class
    prompt.ts        Personality + adaptation + safety system prompt
    schema.ts        Runtime validation of untrusted model output
    provider.ts      Pluggable providers (edge function / HTTP gateway)
    client.ts        Caching, request dedup, error mapping, fallback
    content.ts       AI lesson generation (curated fallback when unavailable)
  lib/learning/
    constants.ts     Skills, CEFR order, shared helpers
    profile.ts       Learning-profile aggregation (degrades gracefully)
    quests.ts        Deterministic, weakness-weighted quest generation
    roadmap.ts       Stage model derived from level and evidence
    useDailyQuests.ts Persistence + local fallback
    dailyLesson.ts   The single writer for "today's lesson"
    vocab.ts         Leitner scheduling and the vocabulary deck
    speech.ts        Transcript comparison for the speaking test
  lib/notifications/ Reminder scheduling and permission handling
  lib/placementData.ts Placement bank (all six skills) + level rule
  context/           Auth, Tutor (mode + snapshot), Notification
  components/ui/     Design system and motion primitives
supabase/functions/
  _shared/           auth (JWT verification) + llm (providers, limiter)
  tutor-reply/       The conversational tutor
  content-gen/       Daily lesson generation
```

### Safety model

The edge functions perform **no** database reads or writes, no permission
checks beyond verifying the caller's JWT, and no state changes. They receive
pre-validated context and return conversation text or lesson JSON only. Their
output is schema-validated and rejected if it does not conform — nothing
model-generated is ever executed or persisted as a command. Database access
stays in the authenticated client behind RLS.

### One definition of "today"

Every day-based rule (streak, quests, lessons, weekly activity) uses the
learner's **local** calendar day, never UTC. Using `toISOString()` flipped the
day at 03:00 for UTC+3 learners and quietly broke streaks and quests.

## Known limitations

- **Background notifications.** Reminders use the Web Notification API and fire
  while a tab is open. Delivering them with the app closed needs a service
  worker with Web Push and a VAPID backend, which is not implemented.
- **Rate limiting is per edge instance.** The in-memory limiter bounds a
  single abuse burst per instance; a global quota needs a database counter.
- **Level changes are conservative.** The app estimates a CEFR position from
  skill progress and offers it, but never promotes anyone silently.
- **Listening quests** use browser speech synthesis rather than recorded
  audio, so the voice is the device's, not a level-appropriate speaker.
- **No conversation streaming.** Replies arrive complete.
