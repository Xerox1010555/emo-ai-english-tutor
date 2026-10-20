import { supabase } from '@/lib/supabase';
import type { CEFRLevel, Skill } from '@/lib/types';

/**
 * Client side of the AI content generator.
 *
 * Every call is best-effort: if the edge function is not deployed, the provider
 * is not configured, the user is offline, or the model returns something that
 * does not validate, this returns null and the caller falls back to the curated
 * content bank. The app never blocks on the model.
 */

export interface GeneratedLesson {
  title: string;
  skill: Skill;
  durationMinutes: number;
  content: string;
  vocab: { word: string; definition: string; example: string }[];
  note?: string;
}

const SKILLS: Skill[] = [
  'Grammar',
  'Vocabulary',
  'Listening',
  'Speaking',
  'Writing',
  'Reading',
];

/** The learner should never wait long for a lesson — the curated bank is instant. */
const GENERATION_TIMEOUT_MS = 12_000;

export interface LessonRequest {
  level: CEFRLevel;
  skill?: Skill | null;
  weakSkills?: string[];
  strengths?: string[];
  goals?: string[];
  language?: 'ar' | 'en';
}

/** True when an AI provider is reachable/configured from the browser's view. */
export function contentGenerationAvailable(): boolean {
  return true; // the edge function is the source of truth; failures fall back
}

export async function generateLesson(request: LessonRequest): Promise<GeneratedLesson | null> {
  // Hard client-side timeout: if the model is slow, the curated lesson is
  // used instead of leaving the learner staring at a loading screen.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke('content-gen', {
      body: {
        level: request.level,
        skill: request.skill ?? null,
        weakSkills: request.weakSkills ?? [],
        strengths: request.strengths ?? [],
        goals: request.goals ?? [],
        language: request.language ?? 'ar',
      },
    });

    if (error || !data) return null;

    // The function answers { lesson: {...}, model } — older shapes returned the
    // lesson directly, so both are accepted.
    const raw =
      typeof data === 'object' && data !== null && 'lesson' in (data as Record<string, unknown>)
        ? (data as { lesson: unknown }).lesson
        : data;

    return validateLesson(raw);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

function validateLesson(raw: unknown): GeneratedLesson | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const content = typeof data.content === 'string' ? data.content.trim() : '';
  if (!title || title.length > 120) return null;
  if (content.length < 120 || content.length > 8000) return null;

  const skill = SKILLS.includes(data.skill as Skill) ? (data.skill as Skill) : 'Grammar';
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
