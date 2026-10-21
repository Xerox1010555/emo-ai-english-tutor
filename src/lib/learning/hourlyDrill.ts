import type { Skill } from '@/lib/types';

/**
 * The hourly drill.
 *
 * The daily lesson is the long piece of work. This is the five-minute one: a
 * micro-point that rotates every hour, so the app always has something fresh
 * and the learner never has to choose what to do next.
 *
 * The drill is deterministic: the same learner gets the same drill in the same
 * hour, and it changes when the hour changes. No model call, no waiting.
 */

export interface HourlyDrill {
  id: string;
  skill: Skill;
  kind: 'grammar' | 'vocabulary' | 'phrase' | 'listening' | 'writing';
  title: string;
  prompt: string;
  /** For a listening drill: the line to speak. */
  spoken?: string;
  options?: string[];
  correct?: number;
  answer?: string;
  hint: string;
  /** Why the answer is what it is. */
  explanation: string;
  xp: number;
}

export const DRILL_BANK: HourlyDrill[] = [
  {
    id: 'd_g1',
    skill: 'Grammar',
    kind: 'grammar',
    title: 'Third person -s',
    prompt: 'Choose the correct form: "My brother ___ football every Saturday."',
    options: ['play', 'plays', 'playing', 'is play'],
    correct: 1,
    hint: 'He / she / it + verb + s',
    explanation: 'Third person singular takes -s in the present simple: "My brother plays".',
    xp: 10,
  },
  {
    id: 'd_g2',
    skill: 'Grammar',
    kind: 'grammar',
    title: 'Present perfect',
    prompt: 'Choose the correct form: "I ___ in Cairo for three years."',
    options: ['live', 'lived', 'have lived', 'am living'],
    correct: 2,
    hint: '"for three years" + present perfect',
    explanation: 'A duration that started in the past and continues now: "I have lived … for three years".',
    xp: 10,
  },
  {
    id: 'd_g3',
    skill: 'Grammar',
    kind: 'grammar',
    title: 'Second conditional',
    prompt: 'Choose the correct form: "If I ___ more time, I would learn another language."',
    options: ['have', 'had', 'will have', 'would have'],
    correct: 1,
    hint: 'if + past simple, would + base verb',
    explanation: 'Second conditional: "If I had more time, I would learn …".',
    xp: 10,
  },
  {
    id: 'd_g4',
    skill: 'Grammar',
    kind: 'grammar',
    title: 'For or since',
    prompt: 'Choose the correct word: "I have been learning English ___ 2024."',
    options: ['for', 'since', 'during', 'from'],
    correct: 1,
    hint: 'A starting point takes "since".',
    explanation: '"Since 2024" names the starting point; "for" needs a duration.',
    xp: 10,
  },
  {
    id: 'd_g5',
    skill: 'Grammar',
    kind: 'grammar',
    title: 'Comparatives',
    prompt: 'Choose the correct form: "This road is ___ than the one through the city."',
    options: ['more faster', 'faster', 'fastest', 'the fastest'],
    correct: 1,
    hint: 'Long adjectives do not take "more".',
    explanation: '"Faster" is already comparative: "faster than".',
    xp: 10,
  },
  {
    id: 'd_g6',
    skill: 'Grammar',
    kind: 'grammar',
    title: 'Passive voice',
    prompt: 'Choose the correct form: "The results ___ announced yesterday."',
    options: ['was', 'were', 'have been', 'are'],
    correct: 1,
    hint: '"Results" is plural.',
    explanation: 'Passive + plural subject: "were announced".',
    xp: 10,
  },
  {
    id: 'd_v1',
    skill: 'Vocabulary',
    kind: 'vocabulary',
    title: 'A word for the workplace',
    prompt: 'Complete the sentence: "We need to ___ the deadline to next Friday."',
    options: ['extend', 'expend', 'expose', 'explore'],
    correct: 0,
    hint: 'You move a deadline further away.',
    explanation: '"Extend" = make something longer in time; the others are unrelated.',
    xp: 10,
  },
  {
    id: 'd_v2',
    skill: 'Vocabulary',
    kind: 'vocabulary',
    title: 'A word for an opinion',
    prompt: 'Complete the sentence: "The evidence is ___ to support that claim."',
    options: ['weak', 'week', 'weigh', 'weary'],
    correct: 0,
    hint: 'Not strong enough.',
    explanation: '"Weak evidence" = evidence that is not convincing.',
    xp: 10,
  },
  {
    id: 'd_v3',
    skill: 'Vocabulary',
    kind: 'vocabulary',
    title: 'A word for a person',
    prompt: 'Complete the sentence: "She is a very ___ manager; her team loves working with her."',
    options: ['supportive', 'supportive of', 'support', 'supported'],
    correct: 0,
    hint: 'An adjective before a noun.',
    explanation: '"Supportive" is the adjective; "support" is the noun or verb.',
    xp: 10,
  },
  {
    id: 'd_p1',
    skill: 'Speaking',
    kind: 'phrase',
    title: 'A natural phrase',
    prompt: 'Which phrase sounds most natural in a meeting?',
    options: [
      'I would like to raise a point about the schedule.',
      'I would like raise point schedule.',
      'I want to raise a point of schedule.',
      'I would like raising a point about schedule.',
    ],
    correct: 0,
    hint: 'A preposition is needed before "schedule".',
    explanation: '"Raise a point about …" is the natural collocation in professional English.',
    xp: 10,
  },
  {
    id: 'd_p2',
    skill: 'Speaking',
    kind: 'phrase',
    title: 'Softening an opinion',
    prompt: 'Which sentence is the most natural way to disagree politely?',
    options: [
      'I see your point, but I would look at it slightly differently.',
      'You are wrong about that.',
      'That is not true at all.',
      'No, I do not agree.',
    ],
    correct: 0,
    hint: 'Acknowledge, then differ.',
    explanation: 'The professional pattern is "I see your point, but …" — it keeps the conversation open.',
    xp: 10,
  },
  {
    id: 'd_l1',
    skill: 'Listening',
    kind: 'listening',
    title: 'Listen and pick',
    spoken: 'The meeting has been moved from Tuesday to Thursday at ten.',
    prompt: 'What did you hear?',
    options: [
      'The meeting is on Thursday at ten.',
      'The meeting is on Tuesday at ten.',
      'The meeting is on Thursday at four.',
      'The meeting was cancelled.',
    ],
    correct: 0,
    hint: 'Listen for the correction.',
    explanation: '"moved from Tuesday to Thursday at ten" — the new time is Thursday at ten.',
    xp: 10,
  },
  {
    id: 'd_l2',
    skill: 'Listening',
    kind: 'listening',
    title: 'Listen for the number',
    spoken: 'The fee is thirty-five pounds for the first hour and fifty after that.',
    prompt: 'What is the cost of the first hour?',
    options: ['Fifty pounds', 'Thirty-five pounds', 'Thirty pounds', 'Fifteen pounds'],
    correct: 1,
    hint: 'The first figure is the first hour.',
    explanation: 'Two prices, two different periods: the first hour is thirty-five pounds.',
    xp: 10,
  },
  {
    id: 'd_w1',
    skill: 'Writing',
    kind: 'writing',
    title: 'One good sentence',
    prompt: 'Rewrite this to be more natural: "I am agree with you about this."',
    options: [
      'I agree with you about this.',
      'I am agree with you on this.',
      'I do agree you about this.',
      'I am agreed with you this.',
    ],
    correct: 0,
    hint: '"Agree" is a verb, not an adjective.',
    explanation: '"I agree with you" — drop the "am".',
    xp: 10,
  },
  {
    id: 'd_w2',
    skill: 'Writing',
    kind: 'writing',
    title: 'A better opener',
    prompt: 'Which sentence is the better way to start an email to a client?',
    options: [
      'I hope you are well. I am writing about the project timeline.',
      'Hello you I write you about project time.',
      'Dear I want to talk about the project timeline please.',
      'Project timeline is the thing I write.',
    ],
    correct: 0,
    hint: 'A greeting, then the reason for writing.',
    explanation: 'A professional opener states the purpose clearly in the second sentence.',
    xp: 10,
  },
];

/** The slot key: the local day and hour, e.g. "2026-10-21T14". */
export function hourSlot(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}`;
}

/**
 * The drill for this hour. Deterministic per learner and hour: the same
 * learner sees the same drill for the whole hour, and a new one next hour.
 */
export function drillForSlot(seed: string, date: Date = new Date()): HourlyDrill {
  const slot = hourSlot(date);
  let hash = 2166136261;
  const value = `${seed}:${slot}`;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return DRILL_BANK[Math.abs(hash) % DRILL_BANK.length];
}

/** The skill this drill trains, for the skill profile. */
export function drillSkill(drill: HourlyDrill): Skill {
  return drill.skill;
}
