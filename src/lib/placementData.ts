import type { CEFRLevel, Skill } from './types';

export type PlacementItemType = 'mcq' | 'listening' | 'speaking' | 'writing';

/**
 * Decides the CEFR level from per-level results.
 *
 * The rule is MONOTONIC: walk up from A1 and stop at the first level the
 * learner failed. The old rule ("highest level with >= 50%") could place
 * someone at B1 while they had failed A2, skipping a level.
 */
export function determinePlacementLevel(
  performance: Partial<Record<CEFRLevel, { correct: number; total: number }>>,
): CEFRLevel {
  const order: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  let determined: CEFRLevel = 'A1';

  for (const level of order) {
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

export interface PlacementQuestion {
  id: string;
  skill: Skill;
  level: CEFRLevel;
  question: string;
  options: string[];
  correct: number;
  /**
   * How the item is answered. Defaults to 'mcq'.
   *  - listening: the sentence is spoken aloud (TTS) and the learner picks
   *  - speaking:  the learner says the target sentence (STT is compared)
   *  - writing:  the learner types a short answer (length/content is checked)
   */
  type?: PlacementItemType;
  /** The sentence to speak for a listening item. */
  spoken?: string;
  /** The sentence the learner must say for a speaking item. */
  target?: string;
  /** A word that must appear in a written answer. */
  keyword?: string;
  /** Minimum number of words a written answer needs. */
  minWords?: number;
}

export const placementQuestions: PlacementQuestion[] = [
  // A1 - Grammar
  {
    id: 'q1',
    skill: 'Grammar',
    level: 'A1',
    question: 'She ___ to school every day.',
    options: ['go', 'goes', 'going', 'went'],
    correct: 1,
  },
  {
    id: 'q2',
    skill: 'Vocabulary',
    level: 'A1',
    question: 'What is the opposite of "hot"?',
    options: ['warm', 'cold', 'cool', 'freezing'],
    correct: 1,
  },
  {
    id: 'q3',
    skill: 'Grammar',
    level: 'A1',
    question: 'I ___ a student.',
    options: ['am', 'is', 'are', 'be'],
    correct: 0,
  },
  {
    id: 'q4',
    skill: 'Vocabulary',
    level: 'A1',
    question: 'Which word means "a place where you buy food"?',
    options: ['library', 'bakery', 'school', 'park'],
    correct: 1,
  },
  // A2 - Grammar
  {
    id: 'q5',
    skill: 'Grammar',
    level: 'A2',
    question: 'They ___ dinner when the phone rang.',
    options: ['have', 'had', 'were having', 'are having'],
    correct: 2,
  },
  {
    id: 'q6',
    skill: 'Vocabulary',
    level: 'A2',
    question: 'Choose the correct meaning of "reliable":',
    options: ['someone who is often late', 'someone you can trust', 'someone who talks a lot', 'someone who is funny'],
    correct: 1,
  },
  {
    id: 'q7',
    skill: 'Grammar',
    level: 'A2',
    question: 'I haven\'t seen him ___ last week.',
    options: ['for', 'since', 'from', 'ago'],
    correct: 1,
  },
  {
    id: 'q8',
    skill: 'Reading',
    level: 'A2',
    question: '"The meeting was called off." What does "called off" mean?',
    options: ['started', 'cancelled', 'delayed', 'extended'],
    correct: 1,
  },
  // B1 - Grammar
  {
    id: 'q9',
    skill: 'Grammar',
    level: 'B1',
    question: 'If I ___ more time, I would learn another language.',
    options: ['have', 'had', 'will have', 'would have'],
    correct: 1,
  },
  {
    id: 'q10',
    skill: 'Vocabulary',
    level: 'B1',
    question: 'Choose the best synonym for "significant":',
    options: ['small', 'important', 'simple', 'cheap'],
    correct: 1,
  },
  {
    id: 'q11',
    skill: 'Grammar',
    level: 'B1',
    question: 'The report ___ by the team before the deadline.',
    options: ['was finished', 'is finishing', 'finishes', 'finished'],
    correct: 0,
  },
  {
    id: 'q12',
    skill: 'Reading',
    level: 'B1',
    question: '"Despite the rain, we went hiking." This means:',
    options: ['Because of the rain, we went hiking', 'We didn\'t go hiking because of the rain', 'The rain didn\'t stop us from hiking', 'We went hiking before the rain'],
    correct: 2,
  },
  // B2 - Grammar
  {
    id: 'q13',
    skill: 'Grammar',
    level: 'B2',
    question: 'Hardly ___ when the bell rang.',
    options: ['I had arrived', 'had I arrived', 'I arrived', 'did I arrive'],
    correct: 1,
  },
  {
    id: 'q14',
    skill: 'Vocabulary',
    level: 'B2',
    question: 'Choose the best meaning of "ubiquitous":',
    options: ['rare and unusual', 'present everywhere', 'extremely large', 'very old'],
    correct: 1,
  },
  {
    id: 'q15',
    skill: 'Grammar',
    level: 'B2',
    question: 'She suggested that he ___ a doctor.',
    options: ['sees', 'see', 'saw', 'seeing'],
    correct: 1,
  },
  {
    id: 'q16',
    skill: 'Reading',
    level: 'B2',
    question: '"The findings are consistent with previous research." This means the findings:',
    options: ['contradict earlier studies', 'agree with earlier studies', 'are better than earlier studies', 'ignore earlier studies'],
    correct: 1,
  },
  // C1 - Grammar
  {
    id: 'q17',
    skill: 'Grammar',
    level: 'C1',
    question: 'Not until the final hour ___ a breakthrough.',
    options: ['the researchers made', 'did the researchers make', 'the researchers did make', 'made the researchers'],
    correct: 1,
  },
  {
    id: 'q18',
    skill: 'Vocabulary',
    level: 'C1',
    question: 'Choose the best meaning of "mitigate":',
    options: ['eliminate completely', 'make less severe', 'increase rapidly', 'postpone indefinitely'],
    correct: 1,
  },
  {
    id: 'q19',
    skill: 'Reading',
    level: 'C1',
    question: '"The argument, while compelling, rests on a dubious premise." The author thinks the argument is:',
    options: ['completely sound', 'persuasive but flawed at its base', 'irrelevant', 'unconvincing overall'],
    correct: 1,
  },
  {
    id: 'q20',
    skill: 'Grammar',
    level: 'C1',
    question: 'Were it not for your help, I ___ the project.',
    options: ['wouldn\'t have completed', 'won\'t complete', 'haven\'t completed', 'don\'t complete'],
    correct: 0,
  },
  // C2 - Grammar
  {
    id: 'q21',
    skill: 'Grammar',
    level: 'C2',
    question: 'Had the warning arrived a day earlier, the damage ___ .',
    options: [
      'would have been avoided',
      'would be avoided',
      'had been avoided',
      'will have been avoided',
    ],
    correct: 0,
  },
  {
    id: 'q22',
    skill: 'Vocabulary',
    level: 'C2',
    question: 'Choose the closest meaning of "to obviate":',
    options: [
      'to make unnecessary',
      'to make more likely',
      'to postpone for later',
      'to challenge openly',
    ],
    correct: 0,
  },
  {
    id: 'q23',
    skill: 'Reading',
    level: 'C2',
    question: '"The reforms were, at best, a partial answer to a structural problem." The writer thinks the reforms are:',
    options: [
      'inadequate in principle',
      'radical and complete',
      'unnecessary but harmless',
      'likely to fail entirely',
    ],
    correct: 0,
  },

  // ------------------------------------------------------------------
  // Listening — the sentence is spoken aloud with the browser's speech
  // synthesis, so no audio assets are needed.
  // ------------------------------------------------------------------
  {
    id: 'l1',
    skill: 'Listening',
    level: 'A2',
    type: 'listening',
    spoken: 'The meeting has been moved to Thursday at ten.',
    question: 'What did you hear?',
    options: [
      'The meeting is on Thursday at ten.',
      'The meeting is on Tuesday at four.',
      'The meeting was cancelled.',
      'The meeting starts at ten past four.',
    ],
    correct: 0,
  },
  {
    id: 'l2',
    skill: 'Listening',
    level: 'B1',
    type: 'listening',
    spoken: 'We decided to postpone the launch until the following quarter.',
    question: 'What are they going to do?',
    options: [
      'Delay the launch to the next quarter',
      'Cancel the launch completely',
      'Launch the product next week',
      'Move the launch to a different company',
    ],
    correct: 0,
  },
  {
    id: 'l3',
    skill: 'Listening',
    level: 'C1',
    type: 'listening',
    spoken: 'Although the proposal was well received, the committee deferred the decision.',
    question: 'What happened to the proposal?',
    options: [
      'It was praised but postponed',
      'It was rejected outright',
      'It was approved immediately',
      'It was sent to the public for a vote',
    ],
    correct: 0,
  },

  // ------------------------------------------------------------------
  // Speaking — the learner says the target sentence; the transcript is
  // compared with it.
  // ------------------------------------------------------------------
  {
    id: 's1',
    skill: 'Speaking',
    level: 'A1',
    type: 'speaking',
    target: 'My name is Sara and I live in Cairo.',
    question: 'Say this sentence out loud',
    options: ['My name is Sara and I live in Cairo.'],
    correct: 0,
  },
  {
    id: 's2',
    skill: 'Speaking',
    level: 'B1',
    type: 'speaking',
    target: 'I usually work in the morning and study English in the evening.',
    question: 'Say this sentence out loud',
    options: ['I usually work in the morning and study English in the evening.'],
    correct: 0,
  },
  {
    id: 's3',
    skill: 'Speaking',
    level: 'C1',
    type: 'speaking',
    target: 'If I had known the consequences, I would have taken a different approach.',
    question: 'Say this sentence out loud',
    options: ['If I had known the consequences, I would have taken a different approach.'],
    correct: 0,
  },

  // ------------------------------------------------------------------
  // Writing — the learner types a short answer that is checked for
  // substance (length, and a required word where it matters).
  // ------------------------------------------------------------------
  {
    id: 'w1',
    skill: 'Writing',
    level: 'A2',
    type: 'writing',
    question: 'Write one sentence about what you did last weekend.',
    options: ['Your answer'],
    correct: 0,
    minWords: 5,
  },
  {
    id: 'w2',
    skill: 'Writing',
    level: 'B2',
    type: 'writing',
    question: 'Describe a decision you made recently, and say why you made it. Use the word "because".',
    options: ['Your answer'],
    correct: 0,
    keyword: 'because',
    minWords: 8,
  },
  {
    id: 'w3',
    skill: 'Writing',
    level: 'C1',
    type: 'writing',
    question: 'Explain a decision you would defend to someone who disagrees with you.',
    options: ['Your answer'],
    correct: 0,
    keyword: 'I',
    minWords: 12,
  },
];
