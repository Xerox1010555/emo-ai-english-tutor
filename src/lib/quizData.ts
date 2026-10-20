import type { CEFRLevel } from './types';

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'listening';
  level: CEFRLevel;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const quizBank: QuizQuestion[] = [
  // ---------------------------------------------------------------- A1
  {
    id: 'quizA1_1',
    type: 'multiple_choice',
    level: 'A1',
    question: 'I ___ a student.',
    options: ['am', 'is', 'are', 'be'],
    correct: 0,
    explanation: 'With "I", the verb "be" is always "am".',
  },
  {
    id: 'quizA1_2',
    type: 'fill_blank',
    level: 'A1',
    question: 'She ___ to school every day.',
    options: ['go', 'goes', 'going', 'went'],
    correct: 1,
    explanation: 'Third person singular takes -s: "she goes".',
  },
  {
    id: 'quizA1_3',
    type: 'multiple_choice',
    level: 'A1',
    question: 'Choose the correct word: "She ___ coffee every morning."',
    options: ['drink', 'drinks', 'drinking', 'is drink'],
    correct: 1,
    explanation: 'With "she", the present simple verb gets -s: "she drinks".',
  },
  {
    id: 'quizA1_4',
    type: 'fill_blank',
    level: 'A1',
    question: 'This is my ___ . Her name is Sara.',
    options: ['friend', 'friends', 'a friend', 'friend of'],
    correct: 0,
    explanation: 'We say "my friend" and use the plural only for more than one.',
  },
  // ---------------------------------------------------------------- A2
  {
    id: 'quiz2',
    type: 'multiple_choice',
    level: 'A2',
    question: 'I\'m looking forward ___ you next week.',
    options: ['to see', 'to seeing', 'seeing', 'see'],
    correct: 1,
    explanation: '"look forward to" is always followed by a gerund (-ing). "to seeing" is correct.',
  },
  {
    id: 'quiz9',
    type: 'multiple_choice',
    level: 'A2',
    question: 'Could you ___ me the salt, please?',
    options: ['give', 'to give', 'giving', 'given'],
    correct: 0,
    explanation: 'After a modal verb (could), use the base form of the verb.',
  },
  {
    id: 'quiz10',
    type: 'fill_blank',
    level: 'A2',
    question: 'There aren\'t ___ apples left in the fridge.',
    options: ['some', 'any', 'much', 'a lot'],
    correct: 1,
    explanation: 'Use "any" in negative sentences with countable nouns.',
  },
  {
    id: 'quizA2_4',
    type: 'fill_blank',
    level: 'A2',
    question: 'I ___ to Cairo last year.',
    options: ['am travel', 'travelled', 'travel', 'was travelled'],
    correct: 1,
    explanation: '"Last year" is finished time, so use the past simple: "travelled".',
  },
  // ---------------------------------------------------------------- B1
  {
    id: 'quiz3',
    type: 'fill_blank',
    level: 'B1',
    question: 'She has been working here ___ five years.',
    options: ['for', 'since', 'from', 'ago'],
    correct: 0,
    explanation: 'Use "for" with a duration of time (five years). Use "since" with a point in time.',
  },
  {
    id: 'quiz2b',
    type: 'multiple_choice',
    level: 'B1',
    question: 'The weather was terrible, ___ we decided to stay home.',
    options: ['so', 'because', 'although', 'despite'],
    correct: 0,
    explanation: '"so" shows result. The terrible weather caused the decision to stay home.',
  },
  {
    id: 'quizB1_3',
    type: 'fill_blank',
    level: 'B1',
    question: 'If I ___ more time, I would learn another language.',
    options: ['have', 'had', 'will have', 'would have'],
    correct: 1,
    explanation: 'Second conditional: if + past simple, would + base verb.',
  },
  {
    id: 'quizB1_4',
    type: 'multiple_choice',
    level: 'B1',
    question: 'Choose the best synonym for "significant":',
    options: ['small', 'important', 'simple', 'cheap'],
    correct: 1,
    explanation: '"Significant" means important or considerable in effect.',
  },
  // ---------------------------------------------------------------- B2
  {
    id: 'quiz4',
    type: 'multiple_choice',
    level: 'B2',
    question: 'By the time we arrived, the concert ___.',
    options: ['started', 'had started', 'has started', 'was starting'],
    correct: 1,
    explanation: 'Past perfect (had started) shows an action completed before another past action (arrived).',
  },
  {
    id: 'quiz5',
    type: 'fill_blank',
    level: 'B2',
    question: 'I wish I ___ more languages.',
    options: ['speak', 'spoke', 'had spoken', 'would speak'],
    correct: 1,
    explanation: '"I wish" + past simple expresses a desire about the present. "spoke" is correct.',
  },
  {
    id: 'quiz6',
    type: 'multiple_choice',
    level: 'B2',
    question: 'The new policy will take ___ next month.',
    options: ['place', 'effect', 'part', 'off'],
    correct: 1,
    explanation: '"take effect" means to become active or start applying. "take place" means to happen.',
  },
  {
    id: 'quizB2_4',
    type: 'fill_blank',
    level: 'B2',
    question: 'She suggested that he ___ a doctor.',
    options: ['sees', 'see', 'saw', 'seeing'],
    correct: 1,
    explanation: 'After "suggest", "that", or a similar verb, use the base form: "suggest that he see".',
  },
  {
    id: 'quizB2_5',
    type: 'multiple_choice',
    level: 'B2',
    question: 'The report ___ by the team before the deadline.',
    options: ['was finished', 'is finishing', 'finishes', 'finished'],
    correct: 0,
    explanation: 'Passive voice for a completed action: "was finished".',
  },
  // ---------------------------------------------------------------- C1
  {
    id: 'quiz7',
    type: 'fill_blank',
    level: 'C1',
    question: 'The implications of this study are far-___.',
    options: ['reaching', 'reached', 'reach', 'reachingly'],
    correct: 0,
    explanation: '"far-reaching" is a compound adjective meaning having a wide range or effect.',
  },
  {
    id: 'quiz8',
    type: 'multiple_choice',
    level: 'C1',
    question: 'The committee was divided ___ the proposal was financially viable.',
    options: ['as to whether', 'about that', 'on if', 'whether or'],
    correct: 0,
    explanation: '"as to whether" is the formal construction used to introduce a question or doubt.',
  },
  {
    id: 'quizC1_3',
    type: 'multiple_choice',
    level: 'C1',
    question: 'Choose the best meaning of "mitigate":',
    options: ['eliminate completely', 'make less severe', 'increase rapidly', 'postpone indefinitely'],
    correct: 1,
    explanation: '"Mitigate" means to make something less severe or painful, not to remove it.',
  },
  {
    id: 'quizC1_4',
    type: 'fill_blank',
    level: 'C1',
    question: 'Not until the final hour ___ a breakthrough.',
    options: ['the researchers made', 'did the researchers make', 'the researchers did make', 'made the researchers'],
    correct: 1,
    explanation: 'With a negative fronted adverbial, subject and auxiliary invert: "did the researchers make".',
  },
  // ---------------------------------------------------------------- C2
  {
    id: 'quizC2_1',
    type: 'multiple_choice',
    level: 'C2',
    question: 'His argument is compelling, ___ it rests on a premise that has never been tested.',
    options: ['even so', 'even though', 'in spite of', 'whereas'],
    correct: 0,
    explanation: '"Even so" (= nonetheless) concedes a point and then adds a reservation. "Even though" would contradict the concession.',
  },
  {
    id: 'quizC2_2',
    type: 'fill_blank',
    level: 'C2',
    question: 'The policy was quietly ___ and never subjected to public scrutiny.',
    options: ['rolled out', 'rolled on', 'rolled in', 'rolled by'],
    correct: 0,
    explanation: '"Rolled out" is the idiom for implementing something gradually, often without publicity.',
  },
  {
    id: 'quizC2_3',
    type: 'multiple_choice',
    level: 'C2',
    question: 'Choose the sentence in which the modal expresses deduction about a past event:',
    options: [
      'She must have left already.',
      'She must leave now.',
      'She should have left already.',
      'She may leave already.',
    ],
    correct: 0,
    explanation: '"Must have + past participle" expresses a deduction about the past; "should have" is regret or advice.',
  },
  {
    id: 'quizC2_4',
    type: 'fill_blank',
    level: 'C2',
    question: 'Far from being ___ by the criticism, the team worked harder.',
    options: ['deterred', 'determined', 'deterring', 'deterrence'],
    correct: 0,
    explanation: '"Far from being deterred" = not discouraged. "Determined" would not fit the idiom.',
  },
];

const LEVEL_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function levelDistance(a: CEFRLevel, b: CEFRLevel): number {
  return Math.abs(LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));
}

/**
 * Builds a quiz set for the learner's level.
 *
 * The exact level is used first; if it does not have enough questions, the
 * nearest levels fill the rest (closest first, and easier levels before
 * harder ones). This is what stops an A1 or C2 learner from receiving an
 * empty quiz.
 */
export function getQuizSet(count: number = 5, level?: CEFRLevel): QuizQuestion[] {
  if (!level) return shuffle(quizBank).slice(0, count);

  const exact = quizBank.filter((q) => q.level === level);
  const pool = [...exact];

  if (pool.length < count) {
    const others = quizBank
      .filter((q) => q.level !== level)
      .sort((a, b) => levelDistance(a.level, level) - levelDistance(b.level, level));

    for (const question of others) {
      if (pool.length >= count) break;
      pool.push(question);
    }
  }

  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

/** Fisher–Yates — the `sort(() => Math.random() - 0.5)` idiom is not uniform. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
