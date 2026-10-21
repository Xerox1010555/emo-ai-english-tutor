/**
 * Weekly challenges and the weekly league.
 *
 * Duolingo's streak is the hook; this is the depth behind it. A learner gets
 * three challenges a week, each tied to a different habit (lessons, quests,
 * reviews, vocabulary), and a league tier that reflects the XP they earned
 * this week.
 *
 * Everything is computed from the learner's own data, so nothing here needs a
 * server round-trip beyond reading the XP events.
 */

export type ChallengeKind = 'lessons' | 'quests' | 'reviews' | 'vocabulary' | 'streak';

export interface ChallengeDefinition {
  kind: ChallengeKind;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  icon: 'book' | 'target' | 'refresh' | 'cards' | 'flame';
}

export const CHALLENGES: ChallengeDefinition[] = [
  {
    kind: 'lessons',
    title: 'Complete 3 lessons',
    description: 'Read a lesson and mark it as done.',
    target: 3,
    rewardXp: 60,
    icon: 'book',
  },
  {
    kind: 'quests',
    title: 'Finish 5 quests',
    description: 'The daily quests are where the reps live.',
    target: 5,
    rewardXp: 50,
    icon: 'target',
  },
  {
    kind: 'reviews',
    title: 'Run 2 review sessions',
    description: 'Revise what you actually got wrong.',
    target: 2,
    rewardXp: 45,
    icon: 'refresh',
  },
  {
    kind: 'vocabulary',
    title: 'Master 5 new words',
    description: 'Move five cards to the mastered box.',
    target: 5,
    rewardXp: 40,
    icon: 'cards',
  },
];

export interface ChallengeProgress {
  definition: ChallengeDefinition;
  progress: number;
  complete: boolean;
  claimed: boolean;
}

export interface WeeklyInputs {
  lessonsCompleted: number;
  questsCompleted: number;
  reviewSessions: number;
  wordsMastered: number;
  xpEarned: number;
  streak: number;
  claimedKinds: ChallengeKind[];
}

/** Builds this week's challenges from the learner's activity. */
export function buildChallenges(inputs: WeeklyInputs): ChallengeProgress[] {
  const counters: Record<ChallengeKind, number> = {
    lessons: inputs.lessonsCompleted,
    quests: inputs.questsCompleted,
    reviews: inputs.reviewSessions,
    vocabulary: inputs.wordsMastered,
    streak: inputs.streak,
  };

  return CHALLENGES.map((definition) => {
    const progress = Math.min(definition.target, counters[definition.kind] ?? 0);
    return {
      definition,
      progress,
      complete: progress >= definition.target,
      claimed: inputs.claimedKinds.includes(definition.kind),
    };
  });
}

/** The XP a learner can still earn from challenges this week. */
export function availableChallengeXp(challenges: ChallengeProgress[]): number {
  return challenges
    .filter((c) => c.complete && !c.claimed)
    .reduce((sum, c) => sum + c.definition.rewardXp, 0);
}

export interface LeagueTier {
  name: string;
  minXp: number;
  next: string | null;
  toNext: number;
  progress: number;
}

/**
 * The weekly league tier.
 *
 * The thresholds are what a consistent learner reaches, not what a lucky one
 * does: a week of real practice is a few hundred XP.
 */
export const LEAGUE_TIERS: { name: string; minXp: number }[] = [
  { name: 'Bronze', minXp: 0 },
  { name: 'Silver', minXp: 150 },
  { name: 'Gold', minXp: 350 },
  { name: 'Platinum', minXp: 600 },
  { name: 'Diamond', minXp: 900 },
];

export function leagueForXp(weeklyXp: number): LeagueTier {
  const safe = Math.max(0, Math.round(weeklyXp));
  let current = LEAGUE_TIERS[0];
  for (const tier of LEAGUE_TIERS) {
    if (safe >= tier.minXp) current = tier;
  }
  const index = LEAGUE_TIERS.findIndex((t) => t.name === current.name);
  const next = index >= 0 && index < LEAGUE_TIERS.length - 1 ? LEAGUE_TIERS[index + 1] : null;

  if (!next) {
    return { name: current.name, minXp: current.minXp, next: null, toNext: 0, progress: 100 };
  }

  const span = next.minXp - current.minXp;
  const progress = span > 0 ? Math.min(100, ((safe - current.minXp) / span) * 100) : 100;
  return {
    name: current.name,
    minXp: current.minXp,
    next: next.name,
    toNext: Math.max(0, next.minXp - safe),
    progress,
  };
}

/**
 * Whether a streak is still alive, and whether it can be protected.
 *
 * A freeze costs XP: it is a deliberate, paid rescue rather than a silent
 * "we forgave you" that teaches the learner nothing.
 */
export function streakState(
  lastActiveDate: string | null,
  today: string,
  freezes: number,
): { alive: boolean; broken: boolean; canFreeze: boolean } {
  if (!lastActiveDate) {
    return { alive: false, broken: false, canFreeze: false };
  }
  if (lastActiveDate === today) {
    return { alive: true, broken: false, canFreeze: false };
  }

  // Yesterday: the streak is alive but at risk.
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (lastActiveDate === yesterdayKey) {
    return { alive: true, broken: false, canFreeze: false };
  }

  return { alive: false, broken: true, canFreeze: freezes > 0 };
}

/** The XP a streak freeze costs. */
export const STREAK_FREEZE_COST = 100;
