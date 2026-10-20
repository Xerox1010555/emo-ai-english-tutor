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
  {
    id: 'quiz1',
    type: 'multiple_choice',
    level: 'A2',
    question: 'I\'m looking forward ___ you next week.',
    options: ['to see', 'to seeing', 'seeing', 'see'],
    correct: 1,
    explanation: '"look forward to" is always followed by a gerund (-ing). "to seeing" is correct.',
  },
  {
    id: 'quiz2',
    type: 'multiple_choice',
    level: 'B1',
    question: 'The weather was terrible, ___ we decided to stay home.',
    options: ['so', 'because', 'although', 'despite'],
    correct: 0,
    explanation: '"so" shows result. The terrible weather caused the decision to stay home.',
  },
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
];

export function getQuizSet(count: number = 5, level?: CEFRLevel): QuizQuestion[] {
  const pool = level ? quizBank.filter((q) => q.level === level) : quizBank;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
