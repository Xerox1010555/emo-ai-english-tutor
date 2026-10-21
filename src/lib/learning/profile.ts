import { supabase } from '@/lib/supabase';
import { emptyProfileSnapshot, type LearningSignal, type TutorProfileSnapshot } from '@/lib/ai/types';
import { CEFR_ORDER, clampPercent, levelIndex, SKILLS } from './constants';
import type { CEFRLevel, Profile, Skill } from '@/lib/types';

/** Shape of the extended profile columns added by the upgrade migration. */
export interface ExtendedProfile extends Profile {
  assistant_mode?: 'friendly' | 'coach' | 'strict';
  notifications_enabled?: boolean;
  reminder_frequency?: 'daily' | 'weekdays' | 'off';
  learning_goals?: string[] | null;
  xp?: number | null;
  /** Grants access to the cohort analytics dashboard. */
  is_admin?: boolean | null;
  /** Minutes ahead of UTC — the server needs it to time the reminders. */
  tz_offset_minutes?: number | null;
  /** The interface language (en | ar). */
  ui_language?: 'en' | 'ar' | null;
  /** How many streak rescues the learner owns. */
  streak_freezes?: number | null;
}

/**
 * The LOCAL calendar day as YYYY-MM-DD.
 *
 * This must never be `toISOString()` — that is UTC, which flips the day at
 * 03:00 for UTC+3 learners (streak, quests, and "today's lesson" would all
 * follow a day that is not the user's).
 */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Aggregates everything the tutor is allowed to reason about into a single
 * snapshot. Every read is independently guarded so a missing table (migration
 * not applied yet) degrades the snapshot instead of breaking the tutor.
 */
export async function buildTutorProfileSnapshot(
  userId: string,
  profile: ExtendedProfile | null,
): Promise<TutorProfileSnapshot> {
  const snapshot = emptyProfileSnapshot();

  snapshot.level = (profile?.current_level ?? 'A1') as CEFRLevel;
  snapshot.targetLevel = (profile?.target_level ?? 'B2') as CEFRLevel;
  snapshot.preferredLanguage = profile?.preferred_language === 'en' ? 'en' : 'ar';
  snapshot.learningStreak = profile?.streak ?? 0;
  snapshot.goals = normalizeGoals(profile?.learning_goals);
  snapshot.xp = profile?.xp ?? 0;

  const [placementRes, quizRes, lessonRes, questRes, mistakeRes, vocabRes] = await Promise.all([
    safeFetch(() => supabase.from('placement_results').select('skill, score').eq('user_id', userId)),
    safeFetch(() => supabase.from('quiz_results').select('score, total, taken_at, quiz_type, skill').eq('user_id', userId)),
    safeFetch(() => supabase.from('daily_lessons').select('skill, completed, duration_minutes').eq('user_id', userId)),
    safeFetch(() => supabase.from('daily_quests').select('xp_reward, completed_at').eq('user_id', userId)),
    safeFetch(() => supabase.from('recurring_mistakes').select('label, category, occurrences, last_seen').eq('user_id', userId).order('occurrences', { ascending: false }).limit(6)),
    safeFetch(() => supabase.from('vocabulary').select('mastered').eq('user_id', userId)),
  ]);

  snapshot.skillProgress = computeSkillProgress(placementRes, quizRes, lessonRes);

  const { strengths, weaknesses } = rankSkills(snapshot.skillProgress);
  snapshot.strengths = strengths;
  snapshot.weaknesses = weaknesses;

  snapshot.recentPerformance = computeRecentPerformance(quizRes);
  snapshot.completedLessons = countCompletedLessons(lessonRes);
  snapshot.completedQuests = Array.isArray(questRes) ? questRes.length : 0;
  snapshot.recurringMistakes = computeRecurringMistakes(mistakeRes);

  // Vocabulary mastery nudges the vocabulary score without letting it run away.
  if (Array.isArray(vocabRes) && vocabRes.length >= 3) {
    const masteredRatio = vocabRes.filter((v) => Boolean(v.mastered)).length / vocabRes.length;
    const blended = snapshot.skillProgress.Vocabulary * 0.7 + masteredRatio * 100 * 0.3;
    snapshot.skillProgress.Vocabulary = clampPercent(blended);
  }

  return snapshot;
}

type Row = Record<string, unknown>;

async function safeFetch(
  query: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<Row[]> {
  try {
    const { data, error } = await query();
    if (error) {
      // A missing relation or an invalid id is expected while the upgrade
      // migration is un-applied, or for a user with no data yet. Both degrade
      // the snapshot instead of breaking the tutor, so this is not a warning.
      if (!isExpectedReadError(error.message)) {
        console.warn('[learningProfile] query failed:', error.message);
      }
      return [];
    }
    return Array.isArray(data) ? (data as Row[]) : [];
  } catch (err) {
    console.warn('[learningProfile] query threw:', err);
    return [];
  }
}

function isExpectedReadError(message: string): boolean {
  return (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('invalid input syntax for type uuid')
  );
}

function computeSkillProgress(
  placement: Row[],
  quizzes: Row[],
  lessons: Row[],
): Record<Skill, number> {
  const totals: Record<string, { earned: number; possible: number }> = {};

  const add = (skill: string, earned: number, possible: number) => {
    const entry = totals[skill] ?? { earned: 0, possible: 0 };
    entry.earned += earned;
    entry.possible += possible;
    totals[skill] = entry;
  };

  for (const row of placement) {
    const skill = String(row.skill) as Skill;
    if (!SKILLS.includes(skill)) continue;
    add(skill, Number(row.score) || 0, 100);
  }

  for (const row of quizzes) {
    const total = Number(row.total) || 0;
    const score = Number(row.score) || 0;
    if (total <= 0) continue;
    // A quiz measures ONE skill. Spreading the score across every skill
    // made every learner's profile look flat and hid real strengths.
    const skill = typeof row.skill === 'string' ? (row.skill as Skill) : null;
    if (skill && SKILLS.includes(skill)) {
      add(skill, (score / total) * 100, 100);
    } else {
      // Older rows have no skill: fall back to a mixed measurement.
      for (const s of SKILLS) add(s, (score / total) * 100, 100);
    }
  }

  for (const row of lessons) {
    const skill = String(row.skill) as Skill;
    if (!SKILLS.includes(skill)) continue;
    if (row.completed) add(skill, 100, 100);
    else add(skill, 0, 100);
  }

  const progress = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    const entry = totals[skill];
    progress[skill] = entry && entry.possible > 0 ? clampPercent((entry.earned / entry.possible) * 100) : 0;
  }

  return progress;
}

function rankSkills(progress: Record<Skill, number>): { strengths: Skill[]; weaknesses: Skill[] } {
  const entries = SKILLS.map((skill) => ({ skill, value: progress[skill] })).sort(
    (a, b) => b.value - a.value,
  );
  // A zero score across the board means "no signal yet", not "bad at everything".
  if (entries.every((e) => e.value === 0)) return { strengths: [], weaknesses: [] };
  return {
    strengths: entries.slice(0, 2).map((e) => e.skill),
    weaknesses: entries.slice(-2).reverse().map((e) => e.skill),
  };
}

function computeRecentPerformance(quizzes: Row[]): number | null {
  if (quizzes.length === 0) return null;
  const ratios = quizzes
    .map((q) => {
      const total = Number(q.total) || 0;
      return total > 0 ? (Number(q.score) || 0) / total : null;
    })
    .filter((r): r is number => r !== null);
  if (ratios.length === 0) return null;
  const avg = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  return clampPercent(avg * 100);
}

function countCompletedLessons(lessons: Row[]): number {
  return lessons.filter((l) => Boolean(l.completed)).length;
}

function computeRecurringMistakes(rows: Row[]): LearningSignal[] {
  return rows
    .map((row) => ({
      label: String(row.label ?? '').trim(),
      category: String(row.category ?? 'other'),
      weight: Number(row.occurrences) || 1,
    }))
    .filter((m) => m.label.length > 0);
}

function normalizeGoals(goals: string[] | null | undefined): string[] {
  if (!Array.isArray(goals)) return [];
  return goals
    .filter((g): g is string => typeof g === 'string')
    .map((g) => g.trim())
    .filter((g) => g.length > 0)
    .slice(0, 5);
}

/**
 * Converts the snapshot into an estimated CEFR position, used to sanity-check
 * the stored level. Kept conservative: it never raises a level on thin data.
 */
export function estimateLevelFromProgress(progress: Record<Skill, number>): CEFRLevel | null {
  const values = SKILLS.map((s) => progress[s]);
  const active = values.filter((v) => v > 0);
  if (active.length < 3) return null;
  const avg = active.reduce((sum, v) => sum + v, 0) / active.length;
  const threshold = (level: CEFRLevel) => {
    const idx = levelIndex(level);
    return (idx / (CEFR_ORDER.length - 1)) * 100;
  };
  if (avg >= threshold('C2')) return 'C2';
  if (avg >= threshold('C1')) return 'C1';
  if (avg >= threshold('B2')) return 'B2';
  if (avg >= threshold('B1')) return 'B1';
  if (avg >= threshold('A2')) return 'A2';
  return 'A1';
}
