import { generateTutorResponse } from '@/lib/tutorEngine';
import { resolveProvider } from './provider';
import {
  AiRequestError,
  emptyProfileSnapshot,
  type AiFailureReason,
  type AiReply,
  type AiRequest,
  type TutorTurn,
} from './types';

const CACHE_TTL_MS = 90_000;
const CACHE_MAX_ENTRIES = 40;
const HISTORY_TURNS = 10;

interface CacheEntry {
  at: number;
  value: AiReply;
}

/**
 * Short-lived in-memory cache. Its purpose is correctness, not speed: it stops
 * double-sends, StrictMode re-effects, and retries from burning LLM calls on an
 * identical conversation state.
 */
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<AiReply>>();

export interface AskResult {
  reply: AiReply;
  /** True when the reply came from the LLM path. */
  live: boolean;
}

export async function askTutor(
  request: AiRequest,
  options: { skipCache?: boolean; systemPrompt?: string } = {},
): Promise<AskResult> {
  // A custom system prompt changes the answer entirely, so it must not share
  // a cache entry with the normal tutor conversation.
  const effective: AiRequest = options.systemPrompt
    ? { ...request, systemPrompt: options.systemPrompt }
    : request;

  const key = buildCacheKey(effective);
  const now = Date.now();

  if (!options.skipCache) {
    const hit = cache.get(key);
    if (hit && now - hit.at < CACHE_TTL_MS) {
      // Refresh LRU position.
      cache.delete(key);
      cache.set(key, hit);
      return { reply: hit.value, live: hit.value.source === 'llm' };
    }
  }

  const existing = inFlight.get(key);
  if (existing) return { reply: await existing, live: true };

  const promise = runProvider(effective)
    .then((reply) => {
      storeInCache(key, reply);
      return reply;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return { reply: await promise, live: true };
}

async function runProvider(request: AiRequest): Promise<AiReply> {
  const provider = resolveProvider();

  try {
    const result = await provider.complete({ options: request });
    return {
      reply: result.reply,
      corrections: result.corrections,
      followUpQuestion: result.followUpQuestion,
      mood: result.mood,
      targetSkill: result.targetSkill,
      languageMix: result.languageMix,
      source: 'llm',
      provider: provider.id,
      model: result.model,
    };
  } catch (err) {
    const reason = err instanceof AiRequestError ? err.reason : 'unknown';
    // "not-configured" and "unauthorized" are deterministic — retrying wastes
    // a round trip and the offline engine is the honest answer there.
    return offlineFallback(request, reason);
  }
}

/**
 * The existing rule-based engine, explicitly labelled as a fallback. This is
 * not presented to the user as an AI response.
 */
function offlineFallback(request: AiRequest, reason: AiFailureReason): AiReply {
  const profile = request.profile ?? emptyProfileSnapshot();
  const local = generateTutorResponse(request.message, {
    level: profile.level,
    language: profile.preferredLanguage,
    mode: request.mode,
  });

  return {
    reply: local.reply,
    // The rule-based engine reports its findings as a single formatted
    // string, so normalise it into the structured shape the UI expects.
    corrections: local.corrections.map((c) => ({
      original: c.original,
      corrected: c.corrected,
      explanation: c.explanation,
      category: 'grammar' as const,
    })),
    followUpQuestion: null,
    mood: 'neutral',
    targetSkill: request.focus?.skill ?? 'Grammar',
    languageMix: profile.preferredLanguage === 'ar' ? 'ar-mix' : 'en',
    source: 'offline-engine',
    provider: 'offline-engine',
    fallbackReason: reason,
  };
}

function buildCacheKey(request: AiRequest): string {
  const recent = request.history.slice(-HISTORY_TURNS).map((t) => `${t.role}:${t.content}`).join('|');
  const profile = request.profile ?? emptyProfileSnapshot();
  return [
    request.message.trim(),
    request.mode,
    request.focus?.skill ?? '-',
    request.systemPrompt ? request.systemPrompt.slice(0, 40) : '-',
    profile.level,
    profile.preferredLanguage,
    profile.weaknesses.join(','),
    profile.strengths.join(','),
    recent,
  ].join('::');
}

function storeInCache(key: string, value: AiReply): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

export function clearTutorCache(): void {
  cache.clear();
  inFlight.clear();
}

/** Converts a chat history into the provider's turn shape. */
export function toTutorTurns(messages: { role: string; content: string }[]): TutorTurn[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'emo')
    .slice(-HISTORY_TURNS * 2)
    .map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));
}

export { HISTORY_TURNS };
