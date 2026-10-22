import type { CEFRLevel, Skill } from '@/lib/types';
import {
  GRAMMAR_POINTS,
  LESSON_SKILLS,
  VOCAB_THEMES,
  type GrammarPoint,
  type VocabTheme,
} from './bank';
import { levelIndex } from '../learning/constants';

/**
 * The lesson composer.
 *
 * "365 lessons for every skill" is delivered as: a deep bank of real teaching
 * material per skill, and a deterministic composer that turns
 * (learner, day of the year, skill) into a unique lesson.
 *
 * Why not 2,190 stored lessons? Because they would be dead weight nobody
 * could maintain, and because this way the learner gets a lesson that fits
 * THEIR level on the day they open the app.
 */

export interface ComposedLesson {
  title: string;
  skill: Skill;
  level: CEFRLevel;
  durationMinutes: number;
  /** The lesson body, as plain text (the app renders it line by line). */
  content: string;
  vocab: { word: string; definition: string; example: string }[];
  /** A one-line drill the learner can answer immediately. */
  drill: { prompt: string; answer: string };
  /** Which item of the bank this lesson came from (for "lesson 12 of 365"). */
  index: number;
  /** The learner's position in the year-long cycle. */
  dayOfYear: number;
}

export const LESSONS_PER_YEAR = 365;

/** The learner's position in the year, 1–365. */
export function dayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return ((day - 1) % LESSONS_PER_YEAR) + 1;
}

/** A stable hash, so the same learner gets the same lesson on the same day. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Picks the grammar point that suits the learner's level. */
function grammarForLevel(day: number, level: CEFRLevel, seed: string): GrammarPoint {
  const target = levelIndex(level);
  const candidates = GRAMMAR_POINTS.filter(
    (point) => Math.abs(levelIndex(point.level) - target) <= 1,
  );
  const pool = candidates.length > 0 ? candidates : GRAMMAR_POINTS;
  return pool[(day + hash(seed)) % pool.length];
}

/** Picks a vocabulary theme for the day. */
function vocabForLevel(day: number, level: CEFRLevel, seed: string): VocabTheme {
  return VOCAB_THEMES[(day * 3 + hash(seed)) % VOCAB_THEMES.length];
}

/** The listening drill that belongs to a grammar point. */
function listeningFor(point: GrammarPoint): { spoken: string; question: string; answer: string } {
  const example = point.examples[0] ?? 'This is an example sentence.';
  return {
    spoken: example,
    question: 'Listen and repeat the sentence exactly.',
    answer: example,
  };
}

/** The speaking task that belongs to a grammar point. */
function speakingFor(point: GrammarPoint): { prompt: string; answer: string } {
  return {
    prompt: `Say the sentence with the correct form: "${point.examples[0] ?? point.title}"`,
    answer: point.examples[0] ?? point.title,
  };
}

/** The writing task that belongs to a grammar point. */
function writingFor(point: GrammarPoint): { prompt: string; answer: string } {
  return {
    prompt: `Write two sentences using the rule "${point.title}" — and one sentence that shows the mistake it prevents.`,
    answer: point.rule,
  };
}

/**
 * Composes today's lesson for one skill.
 *
 * The result is deterministic: the same learner, the same day and the same
 * skill always produce the same lesson, and every day of the year is a
 * different one.
 */
export function composeLesson(
  skill: Skill,
  day: number,
  level: CEFRLevel,
  seed: string,
): ComposedLesson {
  const point = grammarForLevel(day, level, seed);
  const theme = vocabForLevel(day, level, seed);
  const index = (day - 1) % LESSONS_PER_YEAR;

  switch (skill) {
    case 'Grammar': {
      const content = [
        `${point.title}`,
        '',
        point.rule,
        '',
        'Examples:',
        ...point.examples.map((example) => `• ${example}`),
        '',
        `Common mistake: ${point.mistake}`,
        `Correct: ${point.fix}`,
        '',
        'Your turn:',
        point.drill,
      ].join('\n');

      return {
        title: point.title,
        skill,
        level,
        durationMinutes: 12,
        content,
        vocab: theme.words.slice(0, 2),
        drill: { prompt: point.drill, answer: point.answer },
        index,
        dayOfYear: day,
      };
    }

    case 'Vocabulary': {
      const content = [
        `Vocabulary: ${theme.title}`,
        '',
        theme.note,
        '',
        ...theme.words.map(
          (entry) => `${entry.word} — ${entry.definition}\n  e.g. ${entry.example}`,
        ),
        '',
        'Your turn:',
        `Write one sentence of your own using "${theme.words[0].word}".`,
      ].join('\n');

      return {
        title: `Vocabulary: ${theme.title}`,
        skill,
        level,
        durationMinutes: 10,
        content,
        vocab: theme.words.slice(0, 4),
        drill: {
          prompt: `Use "${theme.words[0].word}" in a sentence of your own.`,
          answer: theme.words[0].example,
        },
        index,
        dayOfYear: day,
      };
    }

    case 'Listening': {
      const drill = listeningFor(point);
      const content = [
        `Listening: ${point.title}`,
        '',
        'Listen to the sentence, then repeat it back exactly.',
        '',
        'What you will hear:',
        `• ${drill.spoken}`,
        '',
        'Watch for:',
        point.rule,
        '',
        'Your turn:',
        drill.question,
      ].join('\n');

      return {
        title: `Listening: ${point.title}`,
        skill,
        level,
        durationMinutes: 8,
        content,
        vocab: theme.words.slice(0, 2),
        drill: { prompt: drill.question, answer: drill.answer },
        index,
        dayOfYear: day,
      };
    }

    case 'Speaking': {
      const drill = speakingFor(point);
      const content = [
        `Speaking: ${point.title}`,
        '',
        point.rule,
        '',
        'Model sentences:',
        ...point.examples.map((example) => `• ${example}`),
        '',
        'Your turn:',
        drill.prompt,
        '',
        'Then say one sentence of your own about your day.',
      ].join('\n');

      return {
        title: `Speaking: ${point.title}`,
        skill,
        level,
        durationMinutes: 10,
        content,
        vocab: theme.words.slice(0, 2),
        drill: { prompt: drill.prompt, answer: drill.answer },
        index,
        dayOfYear: day,
      };
    }

    case 'Writing': {
      const drill = writingFor(point);
      const content = [
        `Writing: ${point.title}`,
        '',
        point.rule,
        '',
        'Plan before you write:',
        '1. State the point in one sentence.',
        '2. Support it with one example.',
        '3. Add a linking word ("because", "although", "so that").',
        '',
        'Your turn:',
        drill.prompt,
      ].join('\n');

      return {
        title: `Writing: ${point.title}`,
        skill,
        level,
        durationMinutes: 15,
        content,
        vocab: theme.words.slice(0, 2),
        drill: { prompt: drill.prompt, answer: drill.answer },
        index,
        dayOfYear: day,
      };
    }

    case 'Reading':
    default: {
      const content = [
        `Reading: ${point.title}`,
        '',
        'Read this, then answer the question in your own words.',
        '',
        point.rule,
        '',
        `Read this: "${point.examples[0] ?? point.mistake}"`,
        '',
        'Your turn:',
        `In one sentence, what does this show about "${point.title}"?`,
      ].join('\n');

      return {
        title: `Reading: ${point.title}`,
        skill,
        level,
        durationMinutes: 12,
        content,
        vocab: theme.words.slice(0, 3),
        drill: {
          prompt: `Explain in your own words: "${point.examples[0] ?? point.rule}"`,
          answer: point.rule,
        },
        index,
        dayOfYear: day,
      };
    }
  }
}

/**
 * The year-long plan: what each skill is about on each day of the year.
 * Used by the progress screen to show "you are on day 214 of 365".
 */
export function yearPlan(level: CEFRLevel, seed: string): { day: number; skills: ComposedLesson[] } {
  const today = dayOfYear();
  return {
    day: today,
    skills: LESSON_SKILLS.map((skill) => composeLesson(skill, today, level, seed)),
  };
}
