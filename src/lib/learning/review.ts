import type { Skill } from '@/lib/types';
import type { VocabItem } from '@/lib/types';
import { quizBank, type QuizQuestion } from '@/lib/quizData';
import { levelIndex } from './constants';

/**
 * The review queue — the part that makes this more than a streak app.
 *
 * Duolingo repeats what it already taught you. This mixes three sources of
 * evidence about THIS learner:
 *   1. the mistakes the tutor keeps flagging (weighted by how often);
 *   2. the vocabulary cards that are due for a spaced-repetition review;
 *   3. a fresh question from the weakest skill.
 *
 * The three are interleaved so the session never becomes a grammar drill.
 */

export type ReviewItem =
  | {
      kind: 'mistake';
      id: string;
      label: string;
      category: string;
      occurrences: number;
      prompt: string;
      answer: string;
    }
  | {
      kind: 'vocabulary';
      id: string;
      word: string;
      definition: string;
      example: string;
      box: number;
    }
  | {
      kind: 'question';
      id: string;
      question: string;
      options: string[];
      correct: number;
      explanation: string;
      skill: Skill;
    };

export interface ReviewInput {
  mistakes: { label: string; category: string; occurrences: number }[];
  vocabulary: VocabItem[];
  weakSkills: Skill[];
  /** The learner's level — questions are picked around it. */
  level: string;
  limit?: number;
}

/** A mistake becomes a review item: fix it again, in context. */
function mistakeItem(mistake: ReviewInput['mistakes'][number]): ReviewItem {
  return {
    kind: 'mistake',
    id: `mistake:${mistake.label.toLowerCase()}`,
    label: mistake.label,
    category: mistake.category,
    occurrences: mistake.occurrences,
    prompt: `You wrote "${mistake.label}" before. What is the correct form?`,
    answer: 'Type the corrected version — the tutor will judge it.',
  };
}

function vocabularyItem(card: VocabItem): ReviewItem {
  return {
    kind: 'vocabulary',
    id: `vocab:${card.id}`,
    word: card.word,
    definition: card.definition,
    example: card.example,
    box: card.box,
  };
}

function questionItem(question: QuizQuestion, skill: Skill): ReviewItem {
  return {
    kind: 'question',
    id: `question:${question.id}`,
    question: question.question,
    options: question.options,
    correct: question.correct,
    explanation: question.explanation,
    skill,
  };
}

/**
 * Picks a question for a weak skill, as close to the learner's level as
 * possible, preferring one they have not been asked before.
 */
function pickQuestion(weakSkills: Skill[], level: string, used: Set<string>): QuizQuestion | null {
  const target = levelIndex(level as never);
  const candidates = quizBank.filter((q) => !used.has(q.id));

  for (const skill of weakSkills) {
    const pool = candidates.filter((q) => q.skill === skill);
    if (pool.length === 0) continue;
    // Closest level first.
    pool.sort(
      (a, b) => Math.abs(levelIndex(a.level) - target) - Math.abs(levelIndex(b.level) - target),
    );
    return pool[0];
  }

  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) => Math.abs(levelIndex(a.level) - target) - Math.abs(levelIndex(b.level) - target),
  );
  return candidates[0];
}

/**
 * Builds today's review session.
 *
 * Priority: the mistakes the tutor keeps repeating (they are the biggest
 * blocker), then vocabulary that is due, then a question from a weak skill.
 * The result is interleaved so consecutive items are not all the same kind.
 */
export function buildReviewQueue(input: ReviewInput): ReviewItem[] {
  const limit = input.limit ?? 10;
  const usedQuestionIds = new Set<string>();
  const buckets: ReviewItem[][] = [];

  // 1. Mistakes, most frequent first.
  const mistakes = [...input.mistakes]
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, Math.ceil(limit * 0.4))
    .map(mistakeItem);
  if (mistakes.length > 0) buckets.push(mistakes);

  // 2. Vocabulary that is due (the caller filters by next_review).
  const vocab = input.vocabulary.slice(0, Math.ceil(limit * 0.4)).map(vocabularyItem);
  if (vocab.length > 0) buckets.push(vocab);

  // 3. Questions from the weak skills.
  const questions: ReviewItem[] = [];
  for (const skill of input.weakSkills) {
    if (questions.length >= Math.ceil(limit * 0.4)) break;
    const question = pickQuestion([skill], input.level, usedQuestionIds);
    if (!question) continue;
    usedQuestionIds.add(question.id);
    questions.push(questionItem(question, skill));
  }
  if (questions.length > 0) buckets.push(questions);

  // Interleave the buckets, so the session mixes the three kinds.
  const queue: ReviewItem[] = [];
  let index = 0;
  while (queue.length < limit) {
    let added = false;
    for (const bucket of buckets) {
      if (index < bucket.length) {
        queue.push(bucket[index]);
        added = true;
        if (queue.length >= limit) break;
      }
    }
    if (!added) break;
    index += 1;
  }

  return queue;
}

/** XP awarded for a review item, by how hard it was. */
export function reviewXp(item: ReviewItem, correct: boolean): number {
  if (!correct) return 0;
  switch (item.kind) {
    case 'mistake':
      return 15;
    case 'vocabulary':
      return 10;
    case 'question':
      return 12;
    default:
      return 10;
  }
}

export interface LevelDefinition {
  level: number;
  title: string;
  minXp: number;
}

/** Gamification levels — visible progress, not a number that jumps around. */
export const XP_LEVELS: LevelDefinition[] = [
  { level: 1, title: 'Newcomer', minXp: 0 },
  { level: 2, title: 'Apprentice', minXp: 100 },
  { level: 3, title: 'Explorer', minXp: 250 },
  { level: 4, title: 'Achiever', minXp: 500 },
  { level: 5, title: 'Champion', minXp: 900 },
  { level: 6, title: 'Scholar', minXp: 1500 },
  { level: 7, title: 'Virtuoso', minXp: 2400 },
  { level: 8, title: 'Fluent', minXp: 3600 },
  { level: 9, title: 'Master', minXp: 5200 },
  { level: 10, title: 'Native-like', minXp: 7500 },
];

/** The level the learner has reached, and the progress towards the next one. */
export function xpLevel(xp: number): {
  current: LevelDefinition;
  next: LevelDefinition | null;
  progress: number;
  toNext: number;
} {
  const safeXp = Math.max(0, Number(xp) || 0);
  let current = XP_LEVELS[0];
  for (const definition of XP_LEVELS) {
    if (safeXp >= definition.minXp) current = definition;
  }
  const index = XP_LEVELS.findIndex((d) => d.level === current.level);
  const next = index >= 0 && index < XP_LEVELS.length - 1 ? XP_LEVELS[index + 1] : null;

  if (!next) {
    return { current, next: null, progress: 100, toNext: 0 };
  }

  const span = next.minXp - current.minXp;
  const progress = span > 0 ? Math.min(100, ((safeXp - current.minXp) / span) * 100) : 100;
  return { current, next, progress, toNext: Math.max(0, next.minXp - safeXp) };
}
