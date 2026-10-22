import { supabase } from '@/lib/supabase';
import { generateLesson } from '@/lib/ai/content';
import { composeLesson, dayOfYear } from '@/lib/content/composer';
import type { CEFRLevel, DailyLesson, Skill } from '@/lib/types';

/**
 * The single owner of "today's lesson".
 *
 * Home and Roadmap both need today's lesson. Before this module existed, each
 * screen inserted its own row, which could produce two lessons for one day.
 * Now there is one write path: read → (AI) → (curated fallback) → upsert.
 */

export interface EnsureLessonParams {
  userId: string;
  /** The learner's LOCAL day (YYYY-MM-DD). */
  date: string;
  level: CEFRLevel;
  skill?: Skill | null;
  weakSkills?: string[];
  goals?: string[];
  language?: 'ar' | 'en';
  /** The hourly slot: 'YYYY-MM-DDTHH'. Lessons rotate every hour. */
  slot?: string;
}

/**
 * In-flight lessons, keyed by learner + slot.
 *
 * Home and Roadmap both ask for the current lesson. Without this, the first
 * visit of the hour could trigger two model calls and two inserts for the
 * same lesson. Concurrent callers share one promise instead.
 */
const inFlight = new Map<string, Promise<DailyLesson | null>>();

export async function ensureDailyLesson(params: EnsureLessonParams): Promise<DailyLesson | null> {
  const key = `${params.userId}:${params.slot ?? params.date}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = createLesson(params).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

async function createLesson(params: EnsureLessonParams): Promise<DailyLesson | null> {
  const { userId, date, level } = params;
  const slot = params.slot ?? date;

  const { data: existing } = await supabase
    .from('daily_lessons')
    .select('*')
    .eq('user_id', userId)
    .eq('hourly_slot', slot)
    .order('created_at', { ascending: true })
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0] as DailyLesson;
  }

  // Try the model first — a lesson written for this learner beats a generic one.
  const generated = await generateLesson({
    level,
    skill: params.skill ?? null,
    weakSkills: params.weakSkills ?? [],
    goals: params.goals ?? [],
    language: params.language ?? 'ar',
  });

  let title: string;
  let skill: Skill;
  let content: string;
  let durationMinutes: number;
  let vocab: { word: string; definition: string; example: string }[];
  let source: 'ai' | 'bank';

  if (generated) {
    title = generated.title;
    skill = generated.skill;
    content = generated.content;
    durationMinutes = generated.durationMinutes;
    vocab = generated.vocab;
    source = 'ai';
  } else {
    // Curated fallback, built by the composer from the year-long content
    // bank: one lesson per skill per day of the year, written for this
    // learner's level.
    const composed = composeLesson(
      params.skill ?? 'Grammar',
      dayOfYear(),
      level,
      userId,
    );
    title = composed.title;
    skill = composed.skill;
    content = composed.content;
    durationMinutes = composed.durationMinutes;
    vocab = composed.vocab;
    source = 'bank';
  }

  const row = {
    user_id: userId,
    date,
    title,
    skill,
    content,
    duration_minutes: durationMinutes,
    vocab,
    level,
    source,
    hourly_slot: slot,
  };

  // Upsert needs migration 3's UNIQUE(user_id, date); fall back to a plain
  // insert on an un-migrated database.
  const { data: upserted, error: upsertError } = await supabase
    .from('daily_lessons')
    .upsert(row, { onConflict: 'user_id,date' })
    .select();

  if (!upsertError && upserted && upserted.length > 0) {
    return upserted[0] as DailyLesson;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('daily_lessons')
    .insert(row)
    .select();

  if (!insertError && inserted && inserted.length > 0) {
    return inserted[0] as DailyLesson;
  }

  // The lesson columns (vocab / level / source) come from migration 3. On a
  // database without it, the insert fails on the unknown column — retry with
  // the original columns so the learner still gets today's lesson.
  const legacyRow = {
    user_id: userId,
    date,
    title,
    skill,
    content,
    duration_minutes: durationMinutes,
  };

  const { data: legacyInserted } = await supabase
    .from('daily_lessons')
    .insert(legacyRow)
    .select();

  return (legacyInserted?.[0] as DailyLesson) ?? null;
}

/**
 * Prepares the NEXT hour's lesson in the background.
 *
 * The learner never waits: they get the composed lesson for the current hour
 * straight away, and the model-written lesson for the next hour is generated
 * quietly in the background, ready when the hour turns.
 */
export async function prepareNextHour(
  params: Omit<EnsureLessonParams, 'slot'>,
): Promise<void> {
  const next = new Date();
  next.setHours(next.getHours() + 1, 0, 0, 0);

  const slot = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(
    next.getDate(),
  ).padStart(2, '0')}T${String(next.getHours()).padStart(2, '0')}`;

  // Already prepared? Then there is nothing to do.
  const { data: existing } = await supabase
    .from('daily_lessons')
    .select('id')
    .eq('user_id', params.userId)
    .eq('hourly_slot', slot)
    .limit(1);
  if (existing && existing.length > 0) return;

  const generated = await generateLesson({
    level: params.level,
    skill: params.skill ?? null,
    weakSkills: params.weakSkills ?? [],
    goals: params.goals ?? [],
    language: params.language ?? 'ar',
  });
  if (!generated) return;

  await supabase.from('daily_lessons').insert({
    user_id: params.userId,
    date: params.date,
    title: generated.title,
    skill: generated.skill,
    content: generated.content,
    duration_minutes: generated.durationMinutes,
    vocab: generated.vocab,
    level: params.level,
    source: 'ai',
    hourly_slot: slot,
  });
}
