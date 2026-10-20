# tutor-reply

The only place the LLM credential exists. The React app calls this function via
`supabase.functions.invoke('tutor-reply', ...)` and never sees a key.

## Deploy

```bash
supabase functions deploy tutor-reply
supabase secrets set OPENAI_API_KEY=sk-...        # or GEMINI_API_KEY / GROQ_API_KEY
```

Optional secrets:

| Secret | Default | Purpose |
| --- | --- | --- |
| `LLM_PROVIDER` | auto-detect | Force `openai`, `gemini`, or `groq` |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model id |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Model id |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Model id |
| `LLM_TEMPERATURE` | `0.7` | Sampling temperature |
| `LLM_MAX_TOKENS` | `500` | Completion cap |
| `TUTOR_RATE_LIMIT` | `40` | Calls per user per hour |

## Authentication

The caller's Supabase access token is **verified** against Supabase Auth
before any model call. A request with a missing, malformed, or invalid token
gets `401 unauthorized` and costs nothing.

This matters: checking only that the header starts with `Bearer ` would let
anyone burn the owner's model credit with a made-up string.

A per-user rate limit is applied on top of the verification. The limiter is
in-memory, so it bounds abuse per edge instance — a global quota would need a
database counter.

## Contract

`POST` with `{ messages: ChatMessage[], mode: 'friendly' | 'coach' | 'strict' }`

Returns the validated object:

```json
{
  "reply": "string",
  "corrections": [{ "original": "", "corrected": "", "explanation": "", "category": "tense" }],
  "followUpQuestion": "string | null",
  "mood": "confident | unsure | frustrated | curious | neutral",
  "targetSkill": "Grammar",
  "languageMix": "en | ar-mix | ar",
  "model": "gpt-4o-mini"
}
```

Anything that does not satisfy this shape is rejected with `502` and never
reaches the client.

## What this function deliberately does not do

It performs no database reads or writes, no profile lookups, and no state
changes. The authenticated client owns the RLS-protected database and sends
already-scoped, validated context in the system prompt. The model only ever
produces conversation text.

Shared code lives in `supabase/functions/_shared/` (JWT verification, provider
calls, rate limiter) and is used by `content-gen` as well.
