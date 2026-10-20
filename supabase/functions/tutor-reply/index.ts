/**
 * Emo — tutor-reply edge function
 *
 * Owns the LLM credential. The browser never receives an API key: it calls this
 * function with the learner's Supabase JWT, and the key stays in edge env vars.
 *
 * Required secrets (set with `supabase secrets set`):
 *   OPENAI_API_KEY   (or GEMINI_API_KEY, or GROQ_API_KEY)
 *
 * Optional configuration:
 *   LLM_PROVIDER            openai | gemini | groq  (default: auto-detect)
 *   OPENAI_MODEL            default: gpt-4o-mini
 *   GEMINI_MODEL            default: gemini-2.0-flash
 *   GROQ_MODEL              default: llama-3.3-70b-versatile
 *   LLM_TEMPERATURE         default: 0.7
 *   LLM_MAX_TOKENS          default: 500
 *   TUTOR_RATE_LIMIT         default: 40 (calls per user per hour)
 *
 * Security model:
 *   - Requires a VALID Supabase JWT. A token is verified against Supabase Auth
 *     before any model call, so a made-up bearer string cannot spend the
 *     owner's credit.
 *   - Per-user rate limit on top of that.
 *   - Accepts ONLY a messages array and a mode. It performs no database writes,
 *     reads the user's learning data, or touches application state. Those stay
 *     in the authenticated client, which owns the RLS-protected database.
 *   - The model output is parsed, validated against the expected schema, and
 *     rejected if it does not conform. Nothing model-generated is executed.
 */

import { requireUser } from '../_shared/auth.ts';
import {
  callModel,
  createRateLimiter,
  extractJson,
  resolveProvider,
  type ChatMessage,
} from '../_shared/llm.ts';

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 6000;
const MAX_USER_CHARS = 8000;
const REQUEST_TIMEOUT_MS = 25_000;
const ALLOWED_MODES = new Set(['friendly', 'coach', 'strict']);
const RATE_LIMIT = Number(Deno.env.get('TUTOR_RATE_LIMIT') ?? '40');
const RATE_WINDOW_MS = 60 * 60 * 1000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ErrorBody {
  error: string;
  code: string;
}

const rateLimiter = createRateLimiter();

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function fail(code: string, message: string, status: number): Response {
  return json({ error: message, code } satisfies ErrorBody, status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return fail('method_not_allowed', 'Use POST.', 405);
  }

  // --- Auth gate -----------------------------------------------------------
  // A bearer token is verified, not just parsed.
  const user = await requireUser(req);
  if (!user) {
    return fail('unauthorized', 'Invalid or expired session.', 401);
  }

  // --- Rate limit ----------------------------------------------------------
  const limit = rateLimiter.check(`tutor:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error: `Too many requests. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).`,
        code: 'rate-limit',
      } satisfies ErrorBody),
      {
        status: 429,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Retry-After': String(limit.retryAfter) },
      },
    );
  }

  const provider = resolveProvider();
  if (!provider) {
    return fail(
      'provider_not_configured',
      'No LLM provider is configured. Set OPENAI_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY as an edge secret.',
      503,
    );
  }

  // --- Input validation ----------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('invalid_json', 'Request body must be JSON.', 400);
  }

  const parsed = validateRequest(body);
  if ('error' in parsed) {
    return fail('invalid_request', parsed.error, 400);
  }

  const temperature = Number(Deno.env.get('LLM_TEMPERATURE') ?? '0.7');
  const maxTokens = Number(Deno.env.get('LLM_MAX_TOKENS') ?? '500');

  // --- Model call ----------------------------------------------------------
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { text, model } = await callModel(provider, parsed.messages, {
      temperature: Number.isFinite(temperature) ? temperature : 0.7,
      maxTokens: Number.isFinite(maxTokens) ? maxTokens : 500,
      signal: controller.signal,
    });

    const payload = extractJson(text);
    const validated = validateModelOutput(payload);

    if (!validated) {
      return fail('invalid_model_output', 'The model returned an unusable response.', 502);
    }

    return json({ ...validated, model }, 200);
  } catch (err) {
    if (err instanceof Deno.errors.DOMException && err.name === 'AbortError') {
      return fail('timeout', 'The model took too long to respond.', 504);
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = /429|rate/i.test(message) ? 429 : 502;
    return fail('upstream_error', `Model provider error: ${message}`, status);
  } finally {
    clearTimeout(timer);
  }
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type Validated =
  | { messages: ChatMessage[] }
  | { error: string };

function validateRequest(body: unknown): Validated {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object.' };
  }
  const record = body as Record<string, unknown>;

  if (record.mode !== undefined && !ALLOWED_MODES.has(String(record.mode))) {
    return { error: 'Unknown assistant mode.' };
  }
  if (!Array.isArray(record.messages) || record.messages.length === 0) {
    return { error: 'messages must be a non-empty array.' };
  }
  if (record.messages.length > MAX_MESSAGES) {
    return { error: `messages may contain at most ${MAX_MESSAGES} entries.` };
  }

  const messages: ChatMessage[] = [];
  for (const entry of record.messages) {
    if (typeof entry !== 'object' || entry === null) {
      return { error: 'Each message must be an object.' };
    }
    const { role, content } = entry as Record<string, unknown>;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') {
      return { error: 'Invalid message role.' };
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
      return { error: 'Message content must be a non-empty string.' };
    }

    const limit = role === 'user' ? MAX_USER_CHARS : MAX_MESSAGE_CHARS;
    if (content.length > limit) {
      return { error: `Message content exceeds ${limit} characters.` };
    }
    messages.push({ role, content });
  }

  if (messages[0].role !== 'system') {
    return { error: 'The first message must be the system prompt.' };
  }
  if (messages[messages.length - 1].role !== 'user') {
    return { error: 'The last message must be from the user.' };
  }

  return { messages };
}

const SKILLS = ['Grammar', 'Vocabulary', 'Listening', 'Speaking', 'Writing', 'Reading'];
const MOODS = ['confident', 'unsure', 'frustrated', 'curious', 'neutral'];
const CATEGORIES = [
  'grammar', 'tense', 'vocabulary', 'spelling', 'articles',
  'prepositions', 'punctuation', 'word-order', 'register', 'other',
];
const LANGUAGE_MIXES = ['en', 'ar-mix', 'ar'];

interface ValidatedOutput {
  reply: string;
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
    category: string;
  }>;
  followUpQuestion: string | null;
  mood: string;
  targetSkill: string;
  languageMix: string;
}

/**
 * The model is untrusted input. Nothing reaches the app unless it satisfies
 * this contract exactly.
 */
function validateModelOutput(raw: unknown): ValidatedOutput | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;

  const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
  if (!reply || reply.length > 4000) return null;

  const corrections: ValidatedOutput['corrections'] = [];
  if (Array.isArray(data.corrections)) {
    for (const item of data.corrections.slice(0, 4)) {
      if (typeof item !== 'object' || item === null) continue;
      const c = item as Record<string, unknown>;
      const original = typeof c.original === 'string' ? c.original.trim() : '';
      const corrected = typeof c.corrected === 'string' ? c.corrected.trim() : '';
      const explanation = typeof c.explanation === 'string' ? c.explanation.trim() : '';
      if (!original || !corrected || !explanation) continue;
      if (original.length > 300 || corrected.length > 300 || explanation.length > 600) continue;
      corrections.push({
        original,
        corrected,
        explanation,
        category: CATEGORIES.includes(String(c.category)) ? String(c.category) : 'other',
      });
    }
  }

  const followUp = typeof data.followUpQuestion === 'string' && data.followUpQuestion.trim().length > 0
    ? data.followUpQuestion.trim().slice(0, 400)
    : null;

  return {
    reply,
    corrections,
    followUpQuestion: followUp,
    mood: MOODS.includes(String(data.mood)) ? String(data.mood) : 'neutral',
    targetSkill: SKILLS.includes(String(data.targetSkill)) ? String(data.targetSkill) : 'Grammar',
    languageMix: LANGUAGE_MIXES.includes(String(data.languageMix)) ? String(data.languageMix) : 'en',
  };
}
