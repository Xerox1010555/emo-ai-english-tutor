import { SKILLS } from '@/lib/learning/constants';
import type { Skill } from '@/lib/types';
import type { AiCorrection, AiResponsePayload, DetectedMood, MistakeCategory } from './types';

const MOODS: DetectedMood[] = ['confident', 'unsure', 'frustrated', 'curious', 'neutral'];
const CATEGORIES: MistakeCategory[] = [
  'grammar',
  'tense',
  'vocabulary',
  'spelling',
  'articles',
  'prepositions',
  'punctuation',
  'word-order',
  'register',
  'other',
];
const LANGUAGE_MIXES: AiResponsePayload['languageMix'][] = ['en', 'ar-mix', 'ar'];

const MAX_REPLY_CHARS = 4000;
const MAX_CORRECTIONS = 4;

function asString(value: unknown, max = MAX_REPLY_CHARS): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function isOneOf<T extends string>(value: unknown, allowed: T[]): value is T {
  return typeof value === 'string' && (allowed as string[]).includes(value);
}

/**
 * Tolerant but strict-enough parser. Anything that does not satisfy the
 * contract is rejected rather than trusted, so a malformed LLM response can
 * never reach the UI or the database.
 */
export function parseAiPayload(raw: unknown): AiResponsePayload | null {
  const data = coerceObject(raw);
  if (!data) return null;

  const reply = asString(data.reply);
  if (!reply) return null;

  const corrections: AiCorrection[] = [];
  if (Array.isArray(data.corrections)) {
    for (const item of data.corrections.slice(0, MAX_CORRECTIONS)) {
      const entry = coerceObject(item);
      if (!entry) continue;
      const original = asString(entry.original, 300);
      const corrected = asString(entry.corrected, 300);
      const explanation = asString(entry.explanation, 600);
      if (!original || !corrected || !explanation) continue;
      corrections.push({
        original,
        corrected,
        explanation,
        category: isOneOf(entry.category, CATEGORIES) ? entry.category : 'other',
      });
    }
  }

  return {
    reply,
    corrections,
    followUpQuestion: asString(data.followUpQuestion, 400),
    mood: isOneOf(data.mood, MOODS) ? data.mood : 'neutral',
    targetSkill: isOneOf(data.targetSkill, SKILLS) ? (data.targetSkill as Skill) : 'Grammar',
    languageMix: isOneOf(data.languageMix, LANGUAGE_MIXES) ? data.languageMix : 'en',
  };
}

/** Providers that wrap JSON in a ```json fence still parse cleanly. */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to fenced / embedded extraction
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
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

function coerceObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
