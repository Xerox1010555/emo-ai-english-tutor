import type { Skill } from '@/lib/types';

/**
 * Weekly report computation.
 *
 * Everything here is pure: the screen and the model both feed from the same
 * summary, so the numbers in the AI narrative can never disagree with the
 * numbers on screen.
 */

export interface WeekStats {
  lessons: number;
  quests: number;
  xp: number;
  quizzes: number;
  quizAccuracy: number | null;
  chatTurns: number;
  wordsReviewed: number;
  activeDays: number;
}

export interface WeeklyComparison {
  thisWeek: WeekStats;
  lastWeek: WeekStats;
  deltas: {
    lessons: number;
    quests: number;
    xp: number;
    quizAccuracy: number | null;
    chatTurns: number;
    wordsReviewed: number;
  };
  /** The single most improved skill, if the data supports one. */
  bestSkill: { skill: Skill; from: number; to: number } | null;
  /** The skill that needs attention next. */
  focusSkill: { skill: Skill; score: number } | null;
}

export interface DailyActivity {
  date: string;
  lessons: number;
  quests: number;
  minutes: number;
}

/** Local calendar day, matching the app's `todayKey`. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The Monday of the week containing `date`. */
export function weekStart(date: Date): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return dayKey(d);
}

function emptyStats(): WeekStats {
  return {
    lessons: 0,
    quests: 0,
    xp: 0,
    quizzes: 0,
    quizAccuracy: null,
    chatTurns: 0,
    wordsReviewed: 0,
    activeDays: 0,
  };
}

export interface RawWeekData {
  /** lesson rows: date, completed, duration_minutes */
  lessons: { date: string; completed: boolean; duration_minutes: number }[];
  /** quest rows: date, completed, xp_reward */
  quests: { date: string; completed: boolean; xp_reward: number }[];
  /** quiz rows: taken_at, score, total */
  quizzes: { taken_at: string; score: number; total: number }[];
  /** chat rows: created_at, role */
  chat: { created_at: string; role: string }[];
  /** vocabulary rows: created_at, mastered, box */
  vocabulary: { created_at: string; mastered: boolean; box: number }[];
  /** per-skill progress snapshots: { skill, score, at } */
  skillProgress: { skill: Skill; score: number; at: string }[];
}

function statsFor(data: RawWeekData, from: string, to: string): WeekStats {
  const stats = emptyStats();
  const days = new Set<string>();

  for (const lesson of data.lessons) {
    if (lesson.date < from || lesson.date > to) continue;
    if (!lesson.completed) continue;
    stats.lessons += 1;
    stats.xp += 15; // lesson XP
    stats.activeDays += 0;
    days.add(lesson.date);
  }

  for (const quest of data.quests) {
    if (quest.date < from || quest.date > to) continue;
    if (!quest.completed) continue;
    stats.quests += 1;
    stats.xp += quest.xp_reward;
    days.add(quest.date);
  }

  const quizRatios: number[] = [];
  for (const quiz of data.quizzes) {
    const date = dayKey(new Date(quiz.taken_at));
    if (date < from || date > to) continue;
    if (quiz.total <= 0) continue;
    stats.quizzes += 1;
    quizRatios.push(quiz.score / quiz.total);
    days.add(date);
  }
  if (quizRatios.length > 0) {
    stats.quizAccuracy = Math.round(
      (quizRatios.reduce((sum, r) => sum + r, 0) / quizRatios.length) * 100,
    );
  }

  for (const turn of data.chat) {
    const date = dayKey(new Date(turn.created_at));
    if (date < from || date > to) continue;
    if (turn.role === 'user') stats.chatTurns += 1;
    days.add(date);
  }

  for (const item of data.vocabulary) {
    const date = dayKey(new Date(item.created_at));
    if (date < from || date > to) continue;
    if (item.mastered) stats.wordsReviewed += 1;
    days.add(date);
  }

  stats.activeDays = days.size;
  return stats;
}

/**
 * The score of a skill at a given day, or null when there is no snapshot.
 *
 * The null matters: a skill with no earlier snapshot must not be treated as
 * "improved from zero" — that would invent a gain that never happened.
 */
function skillScoreAt(
  progress: RawWeekData['skillProgress'],
  skill: Skill,
  at: string,
): number | null {
  let best: { score: number; at: string } | null = null;
  for (const entry of progress) {
    if (entry.skill !== skill) continue;
    if (entry.at > at) continue;
    if (!best || entry.at > best.at) best = entry;
  }
  return best ? best.score : null;
}

export function buildWeeklyComparison(
  data: RawWeekData,
  today: Date = new Date(),
  skills: Skill[] = [],
): WeeklyComparison {
  const thisStart = weekStart(today);
  const lastStartDate = new Date(today);
  lastStartDate.setDate(lastStartDate.getDate() - 7);
  const lastStart = weekStart(lastStartDate);

  // "This week" runs from Monday to today; "last week" is the full previous
  // week, so the comparison is like-for-like only up to yesterday.
  const thisWeek = statsFor(data, thisStart, dayKey(today));

  // The previous week ends on the Sunday BEFORE this week's Monday — not six
  // days before today, which would overlap this week.
  const lastStartLocal = new Date(`${lastStart}T00:00:00`);
  const lastWeekEnd = dayKey(new Date(lastStartLocal.getTime() + 6 * 86400000));
  const lastWeek = statsFor(data, lastStart, lastWeekEnd);

  const deltas = {
    lessons: thisWeek.lessons - lastWeek.lessons,
    quests: thisWeek.quests - lastWeek.quests,
    xp: thisWeek.xp - lastWeek.xp,
    quizAccuracy:
      thisWeek.quizAccuracy !== null && lastWeek.quizAccuracy !== null
        ? thisWeek.quizAccuracy - lastWeek.quizAccuracy
        : null,
    chatTurns: thisWeek.chatTurns - lastWeek.chatTurns,
    wordsReviewed: thisWeek.wordsReviewed - lastWeek.wordsReviewed,
  };

  let bestSkill: WeeklyComparison['bestSkill'] = null;
  let focusSkill: WeeklyComparison['focusSkill'] = null;

  if (skills.length > 0) {
    const gains = skills.map((skill) => {
      const from = skillScoreAt(data.skillProgress, skill, lastStart);
      const to = skillScoreAt(data.skillProgress, skill, dayKey(today));
      return { skill, from, to, gain: from !== null && to !== null ? to - from : 0 };
    });

    // A skill counts as improved only when it has both a baseline and a
    // current score.
    const improved = gains.filter((g) => g.from !== null && g.to !== null && g.gain > 0);
    if (improved.length > 0) {
      const best = improved.reduce((a, b) => (b.gain > a.gain ? b : a));
      bestSkill = { skill: best.skill, from: best.from as number, to: best.to as number };
    }

    const active = gains.filter((g) => g.to !== null && g.to > 0);
    if (active.length > 0) {
      const weakest = active.reduce((a, b) => ((b.to as number) < (a.to as number) ? b : a));
      focusSkill = { skill: weakest.skill, score: weakest.to as number };
    }
  }

  return { thisWeek, lastWeek, deltas, bestSkill, focusSkill };
}

/** Per-day activity for the last `days` days, oldest first. */
export function buildDailyActivity(
  data: RawWeekData,
  days = 7,
  today: Date = new Date(),
): DailyActivity[] {
  const result: DailyActivity[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = dayKey(date);

    let lessons = 0;
    let minutes = 0;
    for (const lesson of data.lessons) {
      if (lesson.date !== key || !lesson.completed) continue;
      lessons += 1;
      minutes += Number(lesson.duration_minutes) || 0;
    }

    let quests = 0;
    for (const quest of data.quests) {
      if (quest.date === key && quest.completed) quests += 1;
    }

    result.push({ date: key, lessons, quests, minutes });
  }

  return result;
}

/** A short, honest headline when no model is available. */
export function fallbackHeadline(comparison: WeeklyComparison): string {
  const { thisWeek, deltas } = comparison;
  if (thisWeek.lessons === 0 && thisWeek.quests === 0) {
    return 'Your week is still open — one lesson is enough to start it.';
  }
  if (deltas.lessons > 0) {
    return `You studied ${deltas.lessons} more lesson${deltas.lessons > 1 ? 's' : ''} than last week.`;
  }
  if (thisWeek.activeDays >= 5) {
    return `Consistency: you showed up on ${thisWeek.activeDays} days this week.`;
  }
  return `You kept a ${thisWeek.activeDays}-day rhythm this week.`;
}
