/**
 * Emo — content-gen edge function
 *
 * Generates one piece of learning content (today's lesson) at the learner's
 * exact level, weighted toward their weak skills and goals.
 *
 * Like `tutor-reply`, it owns the LLM credential, verifies the caller's JWT,
 * rate-limits per user, and returns validated JSON only. It performs no
 * database reads or writes: the client supplies the (already scoped) learning
 * profile and persists the result behind RLS.
 *
 * Secrets: OPENAI_API_KEY | GEMINI_API_KEY | GROQ_API_KEY
 * Optional: LLM_PROVIDER, OPENAI_MODEL, GEMINI_MODEL, GROQ_MODEL,
 *           LLM_TEMPERATURE (default 0.6), LLM_MAX_TOKENS (default 1200),
 *           CONTENT_RATE_LIMIT (default 10 per user per hour)
 */

import { requireUser } from '../_shared/auth.ts';
import {
  callModel,
  createRateLimiter,
  extractJson,
  resolveProvider,
} from '../_shared/llm.ts';

const REQUEST_TIMEOUT_MS = 40_000;
const RATE_LIMIT = Number(Deno.env.get('CONTENT_RATE_LIMIT') ?? '10');
const RATE_WINDOW_MS = 60 * 60 * 1000;

const SKILLS = ['Grammar', 'Vocabulary', 'Listening', 'Speaking', 'Writing', 'Reading'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const rateLimiter = createRateLimiter();

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function fail(code: string, message: string, status: number): Response {
  return json({ error: message, code }, status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return fail('method_not_allowed', 'Use POST.', 405);
  }

  const user = await requireUser(req);
  if (!user) {
    return fail('unauthorized', 'Invalid or expired session.', 401);
  }

  const limit = rateLimiter.check(`content:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return fail('rate-limit', 'Lesson generation limit reached. Try again later.', 429);
  }

  const provider = resolveProvider();
  if (!provider) {
    return fail('provider_not_configured', 'No LLM provider is configured.', 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('invalid_json', 'Request body must be JSON.', 400);
  }

  const input = validateRequest(body);
  if ('error' in input) {
    return fail('invalid_request', input.error, 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const temperature = Number(Deno.env.get('LLM_TEMPERATURE') ?? '0.6');
    const maxTokens = Number(Deno.env.get('LLM_MAX_TOKENS') ?? '1200');

    const { text, model } = await callModel(
      provider,
      [
        { role: 'system', content: buildSystemPrompt(input) },
        { role: 'user', content: input.skill
          ? `Write today's ${input.skill} lesson.`
          : "Write today's lesson." },
      ],
      {
        temperature: Number.isFinite(temperature) ? temperature : 0.6,
        maxTokens: Number.isFinite(maxTokens) ? maxTokens : 1200,
        signal: controller.signal,
      },
    );

    const lesson = validateLesson(extractJson(text));
    if (!lesson) {
      return fail('invalid_model_output', 'The model returned an unusable lesson.', 502);
    }

    return json({ lesson, model }, 200);
  } catch (err) {
    if (err instanceof Deno.errors.DOMException && err.name === 'AbortError') {
      return fail('timeout', 'Generation took too long.', 504);
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = /429|rate/i.test(message) ? 429 : 502;
    return fail('upstream_error', `Model provider error: ${message}`, status);
  } finally {
    clearTimeout(timer);
  }
});

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

interface ContentRequest {
  level: string;
  skill: string | null;
  weakSkills: string[];
  strengths: string[];
  goals: string[];
  language: string;
}

function validateRequest(body: unknown): ContentRequest | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object.' };
  const raw = body as Record<string, unknown>;

  const level = String(raw.level ?? '').toUpperCase();
  if (!LEVELS.includes(level)) return { error: 'level must be one of A1..C2.' };

  const skill = raw.skill === undefined || raw.skill === null ? null : String(raw.skill);
  if (skill !== null && !SKILLS.includes(skill)) return { error: 'Unknown skill.' };

  const list = (value: unknown, max: number): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string').slice(0, max)
      : [];

  return {
    level,
    skill,
    weakSkills: list(raw.weakSkills, 4),
    strengths: list(raw.strengths, 3),
    goals: list(raw.goals, 5),
    language: raw.language === 'en' ? 'en' : 'ar',
  };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const levelGuidance: Record<string, string> = {
  A1: 'Very simple sentences, present simple, everyday nouns, one idea at a time.',
  A2: 'Simple past and present simple with confidence, basic connectors.',
  B1: 'A range of tenses, conditionals, opinion phrases, everyday topics.',
  B2: 'Nuance: hedging, phrasal verbs, subordinate clauses, register awareness.',
  C1: 'Near-native precision: abstract topics, idiom, implicit meaning.',
  C2: 'Full fluency: style, register, connotation, alternative phrasings.',
};

function buildSystemPrompt(input: ContentRequest): string {
  const lines: string[] = [];

  lines.push(
    'You write short daily English lessons inside a learning app. You are not a textbook: you write for one specific learner, for one 10–15 minute session today.',
  );

  lines.push(`## Learner\nCEFR ${input.level}. ${levelGuidance[input.level] ?? ''}`);

  if (input.skill) {
    lines.push(`## Focus skill\n${input.skill}. The lesson must train that skill.`);
  }
  if (input.weakSkills.length > 0) {
    lines.push(
      `## Needs work\n${input.weakSkills.join(', ')}. Work these in without announcing them as weaknesses.`,
    );
  }
  if (input.strengths.length > 0) {
    lines.push(
      `## Already strong\n${input.strengths.join(', ')}. Stretch, do not re-teach the basics.`,
    );
  }
  if (input.goals.length > 0) {
    lines.push(`## Goals\n${input.goals.join('; ')}. Connect the exercises to these where natural.`);
  }
  if (input.language === 'ar') {
    lines.push(
      '## Language\nThe learner prefers Arabic support. Write the lesson in English, but add one short Arabic clarification line in the "note" field where it genuinely helps.',
    );
  }

  lines.push(
    '## Rules\n- No emoji, no markdown headings inside the content, no filler motivational text.\n- The content must be teachable in 10–15 minutes: explain, model, then practise.\n- Include 2–4 real example sentences at the learner\'s level.\n- Include exactly 2 vocabulary entries with a short definition and a natural example.\n- Everything you output is shown to a learner, so it must be correct and self-contained.',
  );

  lines.push(
    '## Output format\nReturn ONLY a JSON object:\n{"title": "string (max 70 chars)", "skill": "Grammar|Vocabulary|Listening|Speaking|Writing|Reading", "durationMinutes": 15, "content": "string (400–1800 chars, plain text, use blank lines between sections)", "vocab": [{"word": "string", "definition": "string (max 120 chars)", "example": "string (max 160 chars)"}], "note": "string (optional, one short line)"}',
  );

  return lines.join('\n\n');
}

// ---------------------------------------------------------------------------
// Output validation
// ---------------------------------------------------------------------------

interface GeneratedLesson {
  title: string;
  skill: string;
  durationMinutes: number;
  content: string;
  vocab: { word: string; definition: string; example: string }[];
  note?: string;
}

function validateLesson(raw: unknown): GeneratedLesson | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title || title.length > 120) return null;

  const content = typeof data.content === 'string' ? data.content.trim() : '';
  if (content.length < 120 || content.length > 8000) return null;

  const skill = SKILLS.includes(String(data.skill)) ? String(data.skill) : 'Grammar';

  const duration = Number(data.durationMinutes);
  const durationMinutes =
    Number.isFinite(duration) && duration >= 5 && duration <= 45 ? Math.round(duration) : 15;

  const vocab: GeneratedLesson['vocab'] = [];
  if (Array.isArray(data.vocab)) {
    for (const item of data.vocab.slice(0, 4)) {
      if (typeof item !== 'object' || item === null) continue;
      const v = item as Record<string, unknown>;
      const word = typeof v.word === 'string' ? v.word.trim() : '';
      const definition = typeof v.definition === 'string' ? v.definition.trim() : '';
      const example = typeof v.example === 'string' ? v.example.trim() : '';
      if (!word || !definition || !example) continue;
      vocab.push({
        word: word.slice(0, 80),
        definition: definition.slice(0, 200),
        example: example.slice(0, 240),
      });
    }
  }

  const note = typeof data.note === 'string' ? data.note.trim().slice(0, 240) : undefined;

  return { title, skill, durationMinutes, content, vocab, note };
}
