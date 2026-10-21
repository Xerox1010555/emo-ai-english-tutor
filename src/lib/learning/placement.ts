import type { CEFRLevel, Skill } from '@/lib/types';
import { CEFR_ORDER } from './constants';

/**
 * Adaptive placement (a CAT-style test).
 *
 * The old test walked a fixed list of questions and read the level off the
 * percentage. That wastes the learner's time: a strong learner answers a
 * dozen easy items before reaching their level, and a weak learner gets
 * buried in questions they cannot answer.
 *
 * This engine does three things:
 *  1. picks the NEXT item from the ability estimate, not from a fixed order;
 *  2. stops as soon as the estimate is stable (or the item budget is spent);
 *  3. reports a per-skill breakdown so the tutor can target the weak parts.
 */

export type Ability = number; // -3 (A1) … +3 (C2)

export interface PlacementItem {
  id: string;
  skill: Skill;
  level: CEFRLevel;
  /** Where this item sits on the ability scale. */
  ability: Ability;
  kind: 'mcq' | 'listening' | 'speaking' | 'writing';
  question: string;
  options: string[];
  correct: number;
  spoken?: string;
  target?: string;
  keyword?: string;
  minWords?: number;
  /** Skill weight: a grammar answer says more about grammar than about reading. */
  weight: number;
}

export interface PlacementAnswer {
  item: PlacementItem;
  correct: boolean;
}

export interface PlacementOutcome {
  level: CEFRLevel;
  /** Continuous estimate, useful for "you are between B1 and B2". */
  ability: Ability;
  confidence: number;
  skillScores: Partial<Record<Skill, number>>;
  answered: number;
  /** True when the test stopped because the estimate had settled. */
  settled: boolean;
}

/** Ability score that corresponds to each CEFR level. */
const LEVEL_ABILITY: Record<CEFRLevel, Ability> = {
  A1: -3,
  A2: -2,
  B1: -1,
  B2: 0,
  C1: 1,
  C2: 2,
};

export function abilityForLevel(level: CEFRLevel): Ability {
  return LEVEL_ABILITY[level];
}

/** The CEFR level an ability score maps to. */
export function levelForAbility(ability: Ability): CEFRLevel {
  if (ability <= -2.5) return 'A1';
  if (ability <= -1.5) return 'A2';
  if (ability <= -0.5) return 'B1';
  if (ability <= 0.5) return 'B2';
  if (ability <= 1.5) return 'C1';
  return 'C2';
}

/**
 * How many items to ask for, based on the ability so far.
 *
 * The rule is simple and defensible: a learner who answers everything right
 * is done quickly (nothing left to learn), and one who struggles gets more
 * items at a lower level to be sure.
 */
export function targetItemCount(answered: number, correct: number): number {
  const ratio = answered === 0 ? 0 : correct / answered;
  if (answered < 6) return 12;
  if (ratio >= 0.85) return 12; // ceiling: clearly advanced
  if (ratio >= 0.6) return 14;
  return 16; // struggling: confirm with more, easier items
}

/**
 * Chooses the next item.
 *
 * Preference order:
 *  1. the item whose ability is closest to the current estimate (the most
 *     informative one);
 *  2. untried skills first, so all six skills get measured;
 *  3. a lighter "skill weight" wins a tie — a listening item is worth more
 *     evidence than a grammar one.
 */
export function chooseNextItem(
  items: PlacementItem[],
  answers: PlacementAnswer[],
  ability: Ability,
): PlacementItem | null {
  const usedIds = new Set(answers.map((a) => a.item.id));
  const remaining = items.filter((item) => !usedIds.has(item.id));
  if (remaining.length === 0) return null;

  const triedSkills = new Set(answers.map((a) => a.item.skill));
  const untried = remaining.filter((item) => !triedSkills.has(item.skill));

  const pool = untried.length > 0 ? untried : remaining;

  let best: PlacementItem | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const item of pool) {
    const distance = Math.abs(item.ability - ability);
    // A skill that has not been tested yet is worth more than the distance
    // penalty of a single level.
    const score = distance - (triedSkills.has(item.skill) ? 0 : 0.35) + item.weight * 0.05;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

/**
 * Updates the ability estimate.
 *
 * A simple Elo-style update: a correct answer raises the estimate towards
 * the item's difficulty, a wrong one lowers it. The K factor shrinks as the
 * test goes on, so the estimate settles instead of jumping around.
 */
export function updateAbility(
  ability: Ability,
  answers: PlacementAnswer[],
  item: PlacementItem,
  correct: boolean,
): Ability {
  const k = Math.max(0.35, 1.6 - answers.length * 0.11);
  const expected = 1 / (1 + Math.exp(-(item.ability - ability)));
  const observed = correct ? 1 : 0;
  const next = ability + k * (observed - expected);
  return Math.max(-3, Math.min(3, next));
}

/** How settled the estimate is: 0 (one answer) … 1 (confident). */
export function estimateConfidence(answers: PlacementAnswer[]): number {
  if (answers.length === 0) return 0;
  const recent = answers.slice(-6);
  const correctness = recent.filter((a) => a.correct).length / recent.length;
  const volume = Math.min(1, answers.length / 12);
  // A streak of identical answers is a weaker signal than a mixed set that
  // still lands on a stable estimate.
  const mixedness = 1 - Math.abs(correctness - 0.5) * 0.5;
  return Math.max(0, Math.min(1, volume * (0.55 + 0.45 * mixedness)));
}

/**
 * Finishes the test: the level, a continuous ability, a confidence figure
 * and the per-skill breakdown.
 */
export function summarise(
  answers: PlacementAnswer[],
  ability: Ability,
): PlacementOutcome {
  const skillCorrect: Record<string, number> = {};
  const skillTotal: Record<string, number> = {};

  for (const answer of answers) {
    skillCorrect[answer.item.skill] = (skillCorrect[answer.item.skill] ?? 0) + (answer.correct ? 1 : 0);
    skillTotal[answer.item.skill] = (skillTotal[answer.item.skill] ?? 0) + 1;
  }

  const skillScores: Partial<Record<Skill, number>> = {};
  for (const skill of Object.keys(skillTotal) as Skill[]) {
    skillScores[skill] = Math.round((skillCorrect[skill] / skillTotal[skill]) * 100);
  }

  return {
    level: levelForAbility(ability),
    ability,
    confidence: estimateConfidence(answers),
    skillScores,
    answered: answers.length,
    settled: answers.length >= 8 && estimateConfidence(answers) >= 0.55,
  };
}

/**
 * The monotonic level rule for a fixed, non-adaptive set of results.
 *
 * Walk up from A1 and stop at the first level the learner failed: a learner
 * who passed B1 but failed A2 is placed at A1, not at B1. The old rule
 * ("the highest level with >= 50%") could skip a level.
 */
export function determinePlacementLevel(
  performance: Partial<Record<CEFRLevel, { correct: number; total: number }>>,
): CEFRLevel {
  let determined: CEFRLevel = 'A1';

  for (const level of CEFR_ORDER) {
    const entry = performance[level];
    if (!entry || entry.total === 0) continue; // no data here — skip it
    if (entry.correct / entry.total >= 0.5) {
      determined = level;
    } else {
      break; // failed here — the learner cannot be placed above it
    }
  }

  return determined;
}

/** Human-readable band around the estimate, e.g. "between B1 and B2". */
export function abilityBand(ability: Ability): { low: CEFRLevel; high: CEFRLevel } {
  const low = levelForAbility(ability - 0.5);
  const high = levelForAbility(ability + 0.5);
  return { low, high };
}

/** Ordered list of the CEFR levels, for the engine's own bookkeeping. */
export const PLACEMENT_LEVELS = CEFR_ORDER;
