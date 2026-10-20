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
 *
 * Security model:
 *   - Requires a valid Supabase JWT; unauthenticated calls get 401.
 *   - Accepts ONLY a messages array and a mode. It performs no database writes,
 *     reads the user's learning data, or touches application state. Those stay
 *     in the authenticated client, which owns the RLS-protected database.
 *   - The model output is parsed, validated against the expected schema, and
 *     rejected if it does not conform. Nothing model-generated is executed.
 */

const PROVIDER_DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
};

type Provider = 'openai' | 'gemini' | 'groq';

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 6000;
const MAX_USER_CHARS = 8000;
const REQUEST_TIMEOUT_MS = 25_000;
const ALLOWED_MODES = new Set(['friendly', 'coach', 'strict']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ErrorBody {
  error: string;
  code: string;
}

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
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return fail('unauthorized', 'Missing bearer token.', 401);
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

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch { /* fall through */ }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch { /* fall through */ }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

function resolveProvider(): Provider | null {
  const explicit = Deno.env.get('LLM_PROVIDER')?.toLowerCase();
  if (explicit === 'openai' || explicit === 'gemini' || explicit === 'groq') {
    return hasKey(explicit) ? explicit : null;
  }
  for (const candidate of ['openai', 'gemini', 'groq'] as Provider[]) {
    if (hasKey(candidate)) return candidate;
  }
  return null;
}

function hasKey(provider: Provider): boolean {
  const env = Deno.env.get(
    provider === 'openai' ? 'OPENAI_API_KEY' : provider === 'gemini' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY',
  );
  return Boolean(env && env.trim().length > 0);
}

function modelFor(provider: Provider): string {
  const key = provider === 'openai'
    ? 'OPENAI_MODEL'
    : provider === 'gemini'
      ? 'GEMINI_MODEL'
      : 'GROQ_MODEL';
  return Deno.env.get(key)?.trim() || PROVIDER_DEFAULT_MODEL[provider];
}

async function callModel(
  provider: Provider,
  messages: ChatMessage[],
  options: { temperature: number; maxTokens: number; signal: AbortSignal },
): Promise<{ text: string; model: string }> {
  switch (provider) {
    case 'openai':
      return callOpenAi(messages, options);
    case 'groq':
      return callOpenAiCompatible(
        'https://api.groq.com/openai/v1/chat/completions',
        Deno.env.get('GROQ_API_KEY')!.trim(),
        messages,
        options,
      );
    case 'gemini':
      return callGemini(messages, options);
  }
}

async function callOpenAi(
  messages: ChatMessage[],
  options: { temperature: number; maxTokens: number; signal: AbortSignal },
): Promise<{ text: string; model: string }> {
  return callOpenAiCompatible(
    'https://api.openai.com/v1/chat/completions',
    Deno.env.get('OPENAI_API_KEY')!.trim(),
    messages,
    options,
  );
}

/** OpenAI and Groq share the same chat-completions shape. */
async function callOpenAiCompatible(
  url: string,
  apiKey: string,
  messages: ChatMessage[],
  options: { temperature: number; maxTokens: number; signal: AbortSignal },
): Promise<{ text: string; model: string }> {
  const model = modelFor(url.includes('groq') ? 'groq' : 'openai');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      response_format: { type: 'json_object' },
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Empty completion.');
  }
  return { text, model };
}

async function callGemini(
  messages: ChatMessage[],
  options: { temperature: number; maxTokens: number; signal: AbortSignal },
): Promise<{ text: string; model: string }> {
  const model = modelFor('gemini');
  const apiKey = Deno.env.get('GEMINI_API_KEY')!.trim();

  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          responseMimeType: 'application/json',
        },
      }),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('');
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Empty completion.');
  }
  return { text, model };
}
