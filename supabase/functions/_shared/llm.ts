/**
 * Shared LLM plumbing for Emo's edge functions.
 *
 * Owns: provider resolution, the provider call itself, JSON extraction, and a
 * per-user rate limiter. It never touches the database — the authenticated
 * client owns all state, and the model only ever produces text.
 */

export type Provider = 'openai' | 'gemini' | 'groq';

const PROVIDER_DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function resolveProvider(): Provider | null {
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
    provider === 'openai'
      ? 'OPENAI_API_KEY'
      : provider === 'gemini'
        ? 'GEMINI_API_KEY'
        : 'GROQ_API_KEY',
  );
  return Boolean(env && env.trim().length > 0);
}

function modelFor(provider: Provider): string {
  const key =
    provider === 'openai'
      ? 'OPENAI_MODEL'
      : provider === 'gemini'
        ? 'GEMINI_MODEL'
        : 'GROQ_MODEL';
  return Deno.env.get(key)?.trim() || PROVIDER_DEFAULT_MODEL[provider];
}

export async function callModel(
  provider: Provider,
  messages: ChatMessage[],
  options: { temperature: number; maxTokens: number; signal: AbortSignal },
): Promise<{ text: string; model: string }> {
  switch (provider) {
    case 'openai':
      return callOpenAiCompatible(
        'https://api.openai.com/v1/chat/completions',
        Deno.env.get('OPENAI_API_KEY')!.trim(),
        messages,
        options,
      );
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

async function callOpenAiCompatible(
  url: string,
  apiKey: string,
  messages: ChatMessage[],
  options: { temperature: number; maxTokens: number; signal: AbortSignal },
): Promise<{ text: string; model: string }> {
  const isGroq = url.includes('groq');
  const model = modelFor(isGroq ? 'groq' : 'openai');
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

  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
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
  const text = json?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('');
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Empty completion.');
  }
  return { text, model };
}

/** Extracts a JSON object from raw model output (plain, fenced, or embedded). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* fall through */
    }
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

/**
 * In-memory per-user rate limiter.
 *
 * Scope note: edge instances are ephemeral and scale out, so this bounds a
 * single abuse burst per instance — not a strict global quota. A hard global
 * cap belongs in a database-backed counter.
 */
export interface RateLimiter {
  check: (key: string, limit: number, windowMs: number) => { allowed: boolean; retryAfter: number };
}

export function createRateLimiter(): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key, limit, windowMs) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || now > entry.resetAt) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfter: 0 };
      }
      entry.count += 1;
      if (entry.count > limit) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
      }
      return { allowed: true, retryAfter: 0 };
    },
  };
}
