import { supabase } from '@/lib/supabase';
import type { VocabItem } from '@/lib/types';

/**
 * Leitner boxes 0–5 map to review intervals (in days). A wrong answer drops the
 * card back to box 0; every successful recall promotes it one box.
 */
const BOX_INTERVALS_DAYS = [1, 2, 4, 8, 16, 30];

export function intervalForBox(box: number): number {
  return BOX_INTERVALS_DAYS[Math.max(0, Math.min(BOX_INTERVALS_DAYS.length - 1, box))];
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type SaveWordResult = 'saved' | 'duplicate' | 'error';

/**
 * Adds a word to the learner's deck. Needs migration 3's
 * UNIQUE(user_id, lower(word)); a duplicate insert is treated as success-no-op
 * ('duplicate') so callers can show friendly feedback.
 */
export async function saveVocab(
  userId: string,
  input: { word: string; definition: string; example: string; source?: string },
): Promise<SaveWordResult> {
  const word = input.word.trim().slice(0, 120);
  if (!word) return 'error';

  const { data: existing } = await supabase
    .from('vocabulary')
    .select('id')
    .eq('user_id', userId)
    .ilike('word', word)
    .maybeSingle();

  if (existing) return 'duplicate';

  const { error } = await supabase.from('vocabulary').insert({
    user_id: userId,
    word,
    definition: input.definition.trim().slice(0, 500) || '—',
    example: input.example.trim().slice(0, 500) || '—',
    source: input.source ?? 'manual',
    box: 0,
    // A brand-new word is reviewable today; the box system spaces out the
    // reviews after that.
    next_review: addDays(new Date(), 0),
  });

  if (!error) return 'saved';

  // The unique index (migration 3) turns a concurrent duplicate insert into an
  // error with code 23505 — treat that as a friendly duplicate.
  const code = (error as { code?: string }).code;
  if (code === '23505') return 'duplicate';

  // The `source` column comes from migration 3. Without it, retry with the
  // original columns so the word is still saved.
  if (code === '42703' || /source/i.test(error.message)) {
    const { error: legacyError } = await supabase.from('vocabulary').insert({
      user_id: userId,
      word,
      definition: input.definition.trim().slice(0, 500) || '—',
      example: input.example.trim().slice(0, 500) || '—',
      box: 0,
      next_review: addDays(new Date(), 0),
    });
    if (!legacyError) return 'saved';
    const legacyCode = (legacyError as { code?: string }).code;
    if (legacyCode === '23505') return 'duplicate';
  }

  return 'error';
}

const DUE_LIMIT = 20;

/** Cards due for review today, or unstarted cards; oldest/promoted first. */
export async function loadDueVocab(userId: string): Promise<VocabItem[]> {
  const today = addDays(new Date(), 0);
  const { data, error } = await supabase
    .from('vocabulary')
    .select('*')
    .eq('user_id', userId)
    .eq('mastered', false)
    .lte('next_review', today)
    .order('next_review', { ascending: true })
    .limit(DUE_LIMIT);

  if (error) return [];
  return (data ?? []) as VocabItem[];
}

export async function loadVocabDeck(userId: string): Promise<VocabItem[]> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []) as VocabItem[];
}

export type GradeResult = 'promoted' | 'demoted' | 'mastered' | 'saved-locally' | 'error';

/**
 * Records the outcome of a review attempt:
 *  - pass:  box + 1; a pass from the last box marks the card mastered
 *  - fail:  back to box 0, review tomorrow ( Leitner )
 */
export async function gradeVocab(
  userId: string,
  item: VocabItem,
  passed: boolean,
): Promise<GradeResult> {
  const nextBox = passed ? item.box + 1 : 0;
  const mastered = passed && item.box >= BOX_INTERVALS_DAYS.length - 1;
  const nextReview = addDays(new Date(), intervalForBox(Math.min(nextBox, 5)));

  const { error } = await supabase
    .from('vocabulary')
    .update({ box: Math.min(nextBox, 5), next_review: nextReview, mastered })
    .eq('id', item.id)
    .eq('user_id', userId);

  if (error) {
    const code = (error as { code?: string }).code;
    // Missing table / un-migrated DB → the session still completed locally.
    if (code === 'PGRST201' || code === '42P01') return 'saved-locally';
    return 'error';
  }
  return mastered ? 'mastered' : passed ? 'promoted' : 'demoted';
}
