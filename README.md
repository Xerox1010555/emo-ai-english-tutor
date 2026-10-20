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
| `npm test` | Smoke tests for the tutor, quest, and roadmap logic |

## Database

Two migrations, applied in order:

1. `supabase/migrations/20260830044010_emo_schema.sql` — original schema
   (profiles, lessons, plans, chat, quizzes, vocabulary, level history)
2. `supabase/migrations/20260928090000_emo_ai_upgrade.sql` — additive upgrade:
   `profiles.assistant_mode`, `notifications_enabled`, `reminder_frequency`,
   `learning_goals`, `xp`; new tables `daily_quests`, `recurring_mistakes`,
   `skill_progress`

**The app runs without the second migration.** Every read of the new relations
is individually guarded and falls back to a computed value, so an un-migrated
database degrades the experience instead of breaking it. Quest completion falls
back to local storage. You will see quests and modes; XP and mistake tracking
just won't persist yet.

## Connecting the AI tutor

The model credential is **never** in the frontend. It lives in an edge
function:

```bash
supabase functions deploy tutor-reply
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

## Assistant modes

| Mode | Behaviour |
| --- | --- |
| **Friendly** | Warm, gentle corrections, low pressure |
| **Coach** | Direct, concise, pushes for more output |
| **Strict** | Holds you to your stated commitments |

Strict means **accountability, not abuse**. The prompt explicitly forbids
insults, shaming, and personal attacks, and the system prompt states this.
The mode also changes reminder wording.

## Architecture

```
src/
  lib/ai/          LLM integration
    types.ts         Contracts, failure taxonomy, error class
    prompt.ts        Personality + adaptation + safety system prompt
    schema.ts        Runtime validation of untrusted model output
    provider.ts      Pluggable providers (edge function / HTTP gateway)
    client.ts        Caching, request dedup, error mapping, fallback
  lib/learning/
    constants.ts     Skills, CEFR order, shared helpers
    profile.ts       Learning-profile aggregation (degrades gracefully)
    quests.ts        Deterministic, weakness-weighted quest generation
    roadmap.ts       Stage model derived from level and evidence
    useDailyQuests.ts Persistence + local fallback
  lib/notifications/ Reminder scheduling and permission handling
  context/           Auth, Tutor (mode + snapshot), Notification
  components/ui/     Design system and motion primitives
supabase/functions/tutor-reply/  The only place the model key exists
```

### Safety model

The edge function performs **no** database reads or writes, no permission
checks, and no state changes. It receives pre-validated context and returns
conversation text only. Its output is schema-validated and rejected if it does
not conform — nothing model-generated is ever executed or persisted as a command.
Database access stays in the authenticated client behind RLS.

## Known limitations

- **Background notifications.** Reminders use the Web Notification API and fire
  while a tab is open. Delivering them with the app closed needs a service
  worker with Web Push and a VAPID backend, which is not implemented.
- **Level changes are manual.** The app computes a CEFR estimate from skill
  progress but does not auto-promote anyone; the target level is user-set.
- **Listening quests** present a written transcript to read, not generated
  audio. Real audio needs text-to-speech assets per level.
- **No conversation interruption/streaming.** Replies arrive complete.
