# content-gen

Writes **today's lesson** for one learner: at their CEFR level, weighted toward
the skills they are weakest at, and connected to the goals they set. Used by
`src/lib/learning/dailyLesson.ts`.

If this function is not deployed, or the provider is not configured, or the
model returns something that does not validate, the app falls back to the
curated lesson bank automatically. The learner never sees an error for it.

## Deploy

```bash
supabase functions deploy content-gen
supabase secrets set OPENAI_API_KEY=sk-...        # or GEMINI_API_KEY / GROQ_API_KEY
```

| Secret | Default | Purpose |
| --- | --- | --- |
| `LLM_PROVIDER` | auto-detect | Force `openai`, `gemini`, or `groq` |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model id |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Model id |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Model id |
| `LLM_TEMPERATURE` | `0.6` | Sampling temperature |
| `LLM_MAX_TOKENS` | `1200` | Completion cap |
| `CONTENT_RATE_LIMIT` | `10` | Calls per user per hour |

## Contract

`POST` with:

```json
{
  "level": "B1",
  "skill": "Grammar",
  "weakSkills": ["Listening"],
  "strengths": ["Vocabulary"],
  "goals": ["Get a job interview"],
  "language": "ar"
}
```

Returns:

```json
{
  "lesson": {
    "title": "Talking about future plans",
    "skill": "Grammar",
    "durationMinutes": 15,
    "content": "…",
    "vocab": [{ "word": "", "definition": "", "example": "" }],
    "note": "optional one-line note"
  },
  "model": "gpt-4o-mini"
}
```

Anything that does not satisfy this shape is rejected with `502` and never
reaches the client.

## Security

- Requires a **valid** Supabase JWT (verified against Supabase Auth, not just
  parsed), so a made-up bearer string cannot spend the owner's credit.
- Per-user rate limit (`CONTENT_RATE_LIMIT`).
- No database reads or writes, no state changes: the client supplies the
  already-scoped learning profile and persists the result behind RLS.

## What this function deliberately does not do

It does not read the learner's data, does not write anything, and does not
decide what the learner studies. It only writes one lesson, in plain text.
