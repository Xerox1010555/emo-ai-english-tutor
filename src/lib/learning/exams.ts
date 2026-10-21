import type { CEFRLevel, Skill } from '@/lib/types';

/**
 * The exam simulator.
 *
 * A mock is described as data: sections, a time budget, and a question bank.
 * The runner (ExamScreen) only knows how to walk that description, so adding
 * an exam means adding data, not code.
 *
 * Two modes:
 *  - 'full'  the real timings (IELTS Listening 30 min, Reading 60 min …)
 *  - 'quick' scaled down for a phone session; the score is reported as a
 *    practice score, never as an official band.
 */

export type ExamId = 'ielts' | 'toefl';
export type ExamMode = 'quick' | 'full';
export type SectionId = 'listening' | 'reading' | 'writing' | 'speaking';

export interface ExamQuestion {
  id: string;
  /** The passage or audio script the question refers to. */
  passage?: string;
  /** What the app speaks for a listening item. */
  spoken?: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  /** The skill this item measures. */
  skill: Skill;
}

export interface WritingTask {
  id: string;
  prompt: string;
  /** Minimum words the examiner expects. */
  minWords: number;
  /** What a strong answer contains — shown after submitting. */
  successCriteria: string[];
  /** A model answer outline, not a full essay. */
  outline: string;
}

export interface SpeakingTask {
  id: string;
  prompt: string;
  /** Key phrases a strong answer would use. */
  keyPhrases: string[];
  /** A sentence the learner can practise saying. */
  modelAnswer: string;
  /** Seconds the learner should aim to speak. */
  seconds: number;
}

export interface ExamSection {
  id: SectionId;
  title: string;
  skill: Skill;
  /** Minutes in full mode / quick mode. */
  minutes: { full: number; quick: number };
  questions?: ExamQuestion[];
  writing?: WritingTask[];
  speaking?: SpeakingTask[];
  /** How this section is scored, and what it means. */
  scoring: string;
}

export interface ExamDefinition {
  id: ExamId;
  title: string;
  subtitle: string;
  /** The scale: IELTS band 0–9, TOEFL score 0–120. */
  scale: 'band' | 'score';
  /** Which section weights count most towards the total. */
  weights: Record<SectionId, number>;
  /** Maps a raw section percentage to the exam scale. */
  bandFor: (percentage: number) => string;
  sections: ExamSection[];
  /** What the learner should expect. */
  overview: string;
}

const IELTS_SECTIONS: ExamSection[] = [
  {
    id: 'listening',
    title: 'Listening',
    skill: 'Listening',
    minutes: { full: 30, quick: 12 },
    scoring: 'Four sections, 40 marks in the real exam. Here: 10 marks.',
    questions: [
      {
        id: 'iel_l1',
        spoken:
          'Good morning. I\'d like to confirm your booking for the workshop on Thursday the fourteenth, at ten in the morning, in room twelve.',
        prompt: 'What day is the workshop on?',
        options: ['Tuesday the 10th', 'Thursday the 14th', 'Friday the 17th', 'Thursday the 21st'],
        correct: 1,
        explanation:
          'The speaker says "Thursday the fourteenth". Listening questions often test whether you can hold a specific detail while the conversation continues.',
        skill: 'Listening',
      },
      {
        id: 'iel_l2',
        spoken:
          'The library is closing at six this week because of the public holiday, but the reading room stays open until nine.',
        prompt: 'Until what time is the reading room open?',
        options: ['Six', 'Nine', 'Ten', 'It is closed'],
        correct: 1,
        explanation:
          'Note the contrast: the LIBRARY closes at six, but the READING ROOM stays open until nine. Questions are often built on this kind of contrast.',
        skill: 'Listening',
      },
      {
        id: 'iel_l3',
        spoken:
          'I applied for the scholarship two months ago, and although I hadn\'t heard anything, the result was published last Friday.',
        prompt: 'When was the result published?',
        options: ['Two months ago', 'Last Friday', 'Last Monday', 'Yesterday'],
        correct: 1,
        explanation: '"Two months ago" is when the application was submitted, not when the result came out.',
        skill: 'Listening',
      },
      {
        id: 'iel_l4',
        spoken:
          'We\'d normally deliver within three working days, but since the warehouse move we\'ve been running at five.',
        prompt: 'What is the current delivery time?',
        options: ['Three working days', 'Five working days', 'Two working days', 'Five days including weekends'],
        correct: 1,
        explanation:
          'The speaker corrects the usual figure: "we\'ve been running at five" — and the exams never say "working days" unless the speaker does.',
        skill: 'Listening',
      },
      {
        id: 'iel_l5',
        spoken:
          'The price includes the tour itself, but meals and entry to the museum are not covered, so you might want to bring some cash.',
        prompt: 'What is NOT included in the price?',
        options: ['The tour', 'Meals', 'The guide', 'Transport'],
        correct: 1,
        explanation: '"Meals and entry to the museum are not covered" — a classic NOT-included question.',
        skill: 'Listening',
      },
      {
        id: 'iel_l6',
        spoken:
          'It was the second design they proposed, not the first, that the committee finally approved.',
        prompt: 'Which design was approved?',
        options: ['The first', 'The second', 'Both', 'Neither'],
        correct: 1,
        explanation: 'The phrase "not the first" makes the second design the approved one.',
        skill: 'Listening',
      },
      {
        id: 'iel_l7',
        spoken:
          'I should point out that parking on the north side has been restricted since the building work began.',
        prompt: 'What has changed about parking?',
        options: [
          'It is free now',
          'It has been restricted',
          'It moved to the south',
          'It is closed at weekends',
        ],
        correct: 1,
        explanation: 'The word "restricted" means limited or partly banned.',
        skill: 'Listening',
      },
      {
        id: 'iel_l8',
        spoken:
          'The tickets are refundable up to forty-eight hours before the performance, after which the full amount is charged.',
        prompt: 'When can a ticket no longer be refunded?',
        options: [
          '48 hours before',
          'Less than 48 hours before',
          'On the day only',
          'It can always be refunded',
        ],
        correct: 1,
        explanation: '"Up to 48 hours before" means after that point it is too late.',
        skill: 'Listening',
      },
      {
        id: 'iel_l9',
        spoken:
          'Although the report was supposed to be finished in June, it was eventually submitted at the end of August.',
        prompt: 'When was the report actually submitted?',
        options: ['June', 'July', 'The end of August', 'It was never submitted'],
        correct: 2,
        explanation: '"Eventually" signals the real answer after the expectation.',
        skill: 'Listening',
      },
      {
        id: 'iel_l10',
        spoken:
          'Members can take up to four books at a time, though students preparing for exams are allowed a slightly higher limit.',
        prompt: 'What is the limit for students?',
        options: ['Four', 'Slightly higher than four', 'Two', 'There is no limit'],
        correct: 1,
        explanation: 'Students get "a slightly higher limit" than the standard four.',
        skill: 'Listening',
      },
    ],
  },
  {
    id: 'reading',
    title: 'Reading',
    skill: 'Reading',
    minutes: { full: 60, quick: 15 },
    scoring: 'Three passages, 40 marks in the real exam. Here: 8 marks.',
    questions: [
      {
        id: 'iel_r1',
        passage:
          'Urban planners have long argued that widening roads reduces congestion. The reasoning sounds plausible: more lanes mean more capacity, and more capacity means fewer delays. Yet the data from the last three decades points the other way. In cities that added road capacity, travel times rose faster than before the change.',
        prompt: 'What is the main claim of the passage?',
        options: [
          'Widening roads increases capacity.',
          'Adding road capacity has not reduced congestion.',
          'Planners disagree about city design.',
          'Travel times are impossible to measure.',
        ],
        correct: 1,
        explanation:
          'The passage opens with the argument and then contradicts it: "the data … points the other way". The main claim is the second one.',
        skill: 'Reading',
      },
      {
        id: 'iel_r2',
        passage:
          'Urban planners have long argued that widening roads reduces congestion. The reasoning sounds plausible: more lanes mean more capacity, and more capacity means fewer delays. Yet the data from the last three decades points the other way.',
        prompt: 'Why does the author mention "more lanes mean more capacity"?',
        options: [
          'To prove the planners are right',
          'To show the argument is reasonable but wrong',
          'To explain how roads are built',
          'To show planners are careless',
        ],
        correct: 1,
        explanation:
          '"The reasoning sounds plausible" marks it as the view the author then dismantles. A common trap is to read the quoted reasoning as the author\'s own position.',
        skill: 'Reading',
      },
      {
        id: 'iel_r3',
        passage:
          'For decades the museum\'s collection was displayed in a single sequence, ordered by the date each work was made. Visitors followed this order without complaint, largely because no alternative had ever been offered.',
        prompt: 'How were the works originally displayed?',
        options: [
          'By subject',
          'By the artist',
          'In order of the date they were made',
          'Randomly',
        ],
        correct: 2,
        explanation: 'The first sentence states the ordering explicitly.',
        skill: 'Reading',
      },
      {
        id: 'iel_r4',
        passage:
          'For decades the museum\'s collection was displayed in a single sequence, ordered by the date each work was made. Visitors followed this order without complaint, largely because no alternative had ever been offered.',
        prompt: 'Why did visitors not complain?',
        options: [
          'They preferred it',
          'They had never seen an alternative',
          'They did not notice',
          'Guides explained it',
        ],
        correct: 1,
        explanation: '"largely because no alternative had ever been offered" — cause and effect.',
        skill: 'Reading',
      },
      {
        id: 'iel_r5',
        passage:
          'Recent research into sleep has complicated the familiar picture of a fixed eight-hour requirement. While most adults still report needing between seven and nine hours, the amount that is genuinely restorative appears to depend less on duration than on continuity — whether the night is broken by long periods of waking.',
        prompt: 'What does the passage suggest determines how restorative sleep is?',
        options: [
          'Its length above seven hours',
          'The time of day it starts',
          'How uninterrupted it is',
          'The person\'s age',
        ],
        correct: 2,
        explanation: '"depends less on duration than on continuity" — the author explicitly contrasts the two.',
        skill: 'Reading',
      },
      {
        id: 'iel_r6',
        passage:
          'Recent research into sleep has complicated the familiar picture of a fixed eight-hour requirement. While most adults still report needing between seven and nine hours, the amount that is genuinely restorative appears to depend less on duration than on continuity.',
        prompt: 'What is the word closest in meaning to "complicated"?',
        options: ['Simplified', 'Made more complex', 'Proved', 'Questioned'],
        correct: 1,
        explanation: '"Complicated" = made more complex. In a passage, look for the nearest synonym, not the opposite.',
        skill: 'Reading',
      },
      {
        id: 'iel_r7',
        passage:
          'The company was founded on a simple promise: that every product would be repairable by its owner. Two decades later, the promise is still printed on the box, yet fewer than a fifth of the devices are ever opened by anyone other than an authorised technician.',
        prompt: 'What contrast does the writer draw?',
        options: [
          'Between the founding promise and the reality',
          'Between old and new products',
          'Between technicians and owners',
          'Between prices and quality',
        ],
        correct: 0,
        explanation: '"The promise … yet fewer than a fifth" — the structure is promise versus reality.',
        skill: 'Reading',
      },
      {
        id: 'iel_r8',
        passage:
          'The company was founded on a simple promise: that every product would be repairable by its owner. Two decades later, the promise is still printed on the box, yet fewer than a fifth of the devices are ever opened by anyone other than an authorised technician.',
        prompt: 'What does "a fifth" refer to?',
        options: ['The company\'s staff', 'The devices', 'The boxes', 'The technicians'],
        correct: 1,
        explanation: 'Follow the reference: "fewer than a fifth of the devices are ever opened".',
        skill: 'Reading',
      },
    ],
  },
  {
    id: 'writing',
    title: 'Writing',
    skill: 'Writing',
    minutes: { full: 60, quick: 20 },
    scoring: 'Two tasks in the real exam. Here: one task, graded with the band descriptors.',
    writing: [
      {
        id: 'iel_w1',
        prompt:
          'Some people believe that learning a language online is better than learning in a classroom. To what extent do you agree or disagree?',
        minWords: 120,
        successCriteria: [
          'States a clear position in the introduction',
          'Gives at least one developed reason with an example',
          'Addresses the opposite view ("although", "while", "admittedly")',
          'Ends with a conclusion that restates the position',
        ],
        outline:
          'Position (online works for motivated adults, but a classroom is better for structure) → reason 1: immediate feedback and correction → reason 2: accountability and speaking practice → acknowledge the cost of a course → conclusion.',
      },
    ],
  },
  {
    id: 'speaking',
    title: 'Speaking',
    skill: 'Speaking',
    minutes: { full: 14, quick: 5 },
    scoring: 'Three parts in the real exam. Here: two prompts, scored on what you actually said.',
    speaking: [
      {
        id: 'iel_s1',
        prompt: 'Describe a place you often visit and explain why you go there.',
        keyPhrases: ['I usually go to…', 'What I enjoy most is…', 'It helps me to…', 'I find it relaxing because…'],
        modelAnswer:
          'I usually go to a small library about ten minutes from my flat. What I enjoy most is the quiet, because it helps me to focus for a long time. I find it relaxing since there is always someone reading beside me.',
        seconds: 45,
      },
      {
        id: 'iel_s2',
        prompt: 'Do you prefer learning English from an app or from a teacher? Explain your choice.',
        keyPhrases: ['On balance, I prefer…', 'The main advantage is that…', 'Having said that, …', 'That is why I…'],
        modelAnswer:
          'On balance, I prefer learning with a teacher. The main advantage is that she corrects my mistakes straight away. Having said that, an app is more convenient when I travel. That is why I use both.',
        seconds: 45,
      },
    ],
  },
];

const TOEFL_SECTIONS: ExamSection[] = [
  {
    id: 'listening',
    title: 'Listening',
    skill: 'Listening',
    minutes: { full: 54, quick: 12 },
    scoring: 'Four sections, 30 marks in the real exam. Here: 6 marks.',
    questions: [
      {
        id: 'toefl_l1',
        spoken:
          'Attention, students. The deadline for the research proposal has been moved from the fifteenth to the twentieth of November.',
        prompt: 'What is the new deadline?',
        options: ['15 November', '20 November', 'The 15th of December', 'The 20th of January'],
        correct: 1,
        explanation: 'Campus announcements are full of corrections — always listen for the replacement figure.',
        skill: 'Listening',
      },
      {
        id: 'toefl_l2',
        spoken:
          'The campus shuttle will run every twenty minutes during the day, and hourly in the evening after eight.',
        prompt: 'How often does the shuttle run in the evening?',
        options: ['Every 20 minutes', 'Every hour', 'Every 2 hours', 'Only at 8 pm'],
        correct: 1,
        explanation: '"Hourly in the evening after eight" — the time qualifier changes the answer.',
        skill: 'Listening',
      },
      {
        id: 'toefl_l3',
        spoken:
          'Although the museum is free for students, you will need to book a time slot online before you arrive.',
        prompt: 'What do students have to do before visiting?',
        options: [
          'Pay a small fee',
          'Book a time slot online',
          'Bring their student card',
          'Join a guided tour',
        ],
        correct: 1,
        explanation: '"You will need to" states the requirement, even though the visit itself is free.',
        skill: 'Listening',
      },
      {
        id: 'toefl_l4',
        spoken:
          'Our team had originally planned to launch in March, but after the supplier change we moved it to June.',
        prompt: 'When was the product launched?',
        options: ['March', 'April', 'June', 'It was cancelled'],
        correct: 2,
        explanation: '"Originally planned" is not what happened; the launch is in June.',
        skill: 'Listening',
      },
      {
        id: 'toefl_l5',
        spoken:
          'The workshop is aimed at people who have used the software before, so no basic training is provided.',
        prompt: 'Who is the workshop for?',
        options: [
          'Complete beginners',
          'People who already use the software',
          'Managers only',
          'Students only',
        ],
        correct: 1,
        explanation: '"Aimed at people who have used the software before" is the definition of the target audience.',
        skill: 'Listening',
      },
      {
        id: 'toefl_l6',
        spoken:
          'Rather than sending the report by email, the committee decided to publish it on the website.',
        prompt: 'What did the committee decide?',
        options: [
          'To publish the report online',
          'To email the report',
          'To delay the report',
          'To shorten the report',
        ],
        correct: 0,
        explanation: '"Rather than … decided to …" — the second option is the decision.',
        skill: 'Listening',
      },
    ],
  },
  {
    id: 'reading',
    title: 'Reading',
    skill: 'Reading',
    minutes: { full: 60, quick: 15 },
    scoring: 'Three passages, 30 marks in the real exam. Here: 6 marks.',
    questions: [
      {
        id: 'toefl_r1',
        passage:
          'A number of cities have introduced congestion charges, requiring drivers to pay a fee for entering the busiest areas at peak times. Supporters argue that the charges reduce both emissions and delays. Critics counter that the money raised is often spent on unrelated projects, and that drivers simply move their journeys to less congested roads instead of avoiding them.',
        prompt: 'What is the main purpose of the passage?',
        options: [
          'To compare two sides of a debate',
          'To explain how to avoid congestion',
          'To argue against congestion charges',
          'To describe a successful policy',
        ],
        correct: 0,
        explanation: 'The passage sets out "supporters" and "critics" in turn — a balanced comparison.',
        skill: 'Reading',
      },
      {
        id: 'toefl_r2',
        passage:
          'A number of cities have introduced congestion charges. Supporters argue that the charges reduce both emissions and delays. Critics counter that the money raised is often spent on unrelated projects.',
        prompt: 'What do critics say about the revenue?',
        options: [
          'It is too small',
          'It is spent on unrelated projects',
          'It is not collected fairly',
          'It reduces traffic',
        ],
        correct: 1,
        explanation: 'The critics\' point about the money is explicit in the second sentence.',
        skill: 'Reading',
      },
      {
        id: 'toefl_r3',
        passage:
          'What researchers once described as a natural monopoly in water distribution has been quietly broken by a wave of small private operators. Their argument is simple: fixed costs, not variable ones, are what make water networks expensive to run.',
        prompt: 'What do small operators argue?',
        options: [
          'Water should be free',
          'Fixed costs are what make networks expensive',
          'Networks need more regulation',
          'Customers prefer local suppliers',
        ],
        correct: 1,
        explanation: '"Their argument is simple:" introduces the argument directly.',
        skill: 'Reading',
      },
      {
        id: 'toefl_r4',
        passage:
          'What researchers once described as a natural monopoly has been quietly broken by a wave of small private operators.',
        prompt: 'What is meant by "quietly"?',
        options: [
          'It happened secretly and illegally',
          'It happened without much attention',
          'It happened slowly over decades',
          'It is still ongoing',
        ],
        correct: 1,
        explanation: '"Quietly" = without much attention or notice.',
        skill: 'Reading',
      },
      {
        id: 'toefl_r5',
        passage:
          'A single explanation cannot account for the collapse of the company. Revenue had been stable for years, and the product was consistently rated highly by independent reviewers. What changed was the market around it.',
        prompt: 'Why did the company collapse?',
        options: [
          'Its product was poorly rated',
          'Revenue had been falling for years',
          'The market around it changed',
          'It lost all its staff',
        ],
        correct: 2,
        explanation:
          'The passage rules out the two obvious causes and ends with the real one: "What changed was the market around it."',
        skill: 'Reading',
      },
      {
        id: 'toefl_r6',
        passage:
          'A single explanation cannot account for the collapse of the company. Revenue had been stable for years, and the product was consistently rated highly by independent reviewers.',
        prompt: 'What does "account for" mean here?',
        options: ['Explain', 'Pay for', 'Record', 'Predict'],
        correct: 0,
        explanation: '"Cannot account for" = cannot explain.',
        skill: 'Reading',
      },
    ],
  },
  {
    id: 'speaking',
    title: 'Speaking',
    skill: 'Speaking',
    minutes: { full: 20, quick: 5 },
    scoring: 'Four tasks in the real exam. Here: one prompt, scored on what you said.',
    speaking: [
      {
        id: 'toefl_s1',
        prompt: 'Why do people learn English even when it is not required for their job?',
        keyPhrases: [
          'In my experience…',
          'One reason that stands out is…',
          'It gives people access to…',
          'Personally, I think…',
        ],
        modelAnswer:
          'In my experience, people learn English mostly for the freedom it gives them. One reason that stands out is access: they can read original books and follow conversations without subtitles. Personally, I think that is worth the effort even when it is not required.',
        seconds: 45,
      },
    ],
  },
  {
    id: 'writing',
    title: 'Writing',
    skill: 'Writing',
    minutes: { full: 50, quick: 20 },
    scoring: 'One integrated task in the real exam. Here: one task, graded with the band descriptors.',
    writing: [
      {
        id: 'toefl_w1',
        prompt:
          'Some people think that a university degree is no longer necessary to get a good job. Do you agree or disagree? Use the three points below to support your answer.\n\n• Work experience\n• What you can do\n• How you learned it',
        minWords: 120,
        successCriteria: [
          'States a clear position in the first paragraph',
          'Uses all three given points',
          'Explains rather than lists',
          'Has a short conclusion',
        ],
        outline:
          'Position (a degree helps at the start, but what you can do matters more) → point 1: experience → point 2: skills → point 3: how you learned them (self-taught) → conclusion.',
      },
    ],
  },
];

/**
 * IELTS band from a raw percentage.
 *
 * The table is the widely used Academic conversion: 90% is a band 9, 70% is a
 * band 7, 50% is a band 5. Rounding is band-by-band, never "the nearest
 * whole number".
 */
function ieltsBand(percentage: number): string {
  const table: [number, string][] = [
    [90, '9'],
    [85, '8.5'],
    [80, '8'],
    [75, '7.5'],
    [70, '7'],
    [65, '6.5'],
    [60, '6'],
    [55, '5.5'],
    [50, '5'],
    [45, '4.5'],
    [40, '4'],
    [35, '3.5'],
    [30, '3'],
    [25, '2.5'],
    [20, '2'],
    [15, '1.5'],
    [10, '1'],
    [0, '0'],
  ];
  for (const [threshold, band] of table) {
    if (percentage >= threshold) return band;
  }
  return '0';
}

/** TOEFL score (0–120) from a raw percentage. */
function toeflScore(percentage: number): string {
  return String(Math.round((percentage / 100) * 120));
}

export const EXAMS: Record<ExamId, ExamDefinition> = {
  ielts: {
    id: 'ielts',
    title: 'IELTS Academic',
    subtitle: 'Mock test · Listening, Reading, Writing, Speaking',
    scale: 'band',
    weights: { listening: 0.25, reading: 0.25, writing: 0.25, speaking: 0.25 },
    bandFor: ieltsBand,
    overview:
      'Four timed sections, the same order and the same scoring logic as the real thing. Writing and Speaking are scored against the band descriptors — with the tutor when a model is connected, and against the checklist when it is not.',
    sections: IELTS_SECTIONS,
  },
  toefl: {
    id: 'toefl',
    title: 'TOEFL iBT',
    subtitle: 'Mock test · Listening, Reading, Speaking, Writing',
    scale: 'score',
    weights: { listening: 0.3, reading: 0.3, speaking: 0.2, writing: 0.2 },
    bandFor: toeflScore,
    overview:
      'The new TOEFL scoring (0–120) with the same section order. The writing task is the integrated one, using the three given points.',
    sections: TOEFL_SECTIONS,
  },
};

export interface SectionOutcome {
  section: SectionId;
  title: string;
  skill: Skill;
  correct: number;
  total: number;
  percentage: number;
  /** Written/spoken sections are scored out of a rubric, so they carry a band too. */
  band?: string;
  notes: string[];
}

/** Turns the section outcomes into the exam's total. */
export function scoreExam(
  exam: ExamDefinition,
  outcomes: SectionOutcome[],
): { total: string; percentage: number } {
  let weighted = 0;
  let weightSum = 0;

  for (const outcome of outcomes) {
    const weight = exam.weights[outcome.section] ?? 0;
    if (weight === 0) continue;
    weighted += outcome.percentage * weight;
    weightSum += weight;
  }

  const percentage = weightSum > 0 ? weighted / weightSum : 0;
  return { total: exam.bandFor(percentage), percentage: Math.round(percentage) };
}

/** The CEFR band a mock result corresponds to, for the learner's profile. */
export function cefrForBand(band: string, scale: 'band' | 'score'): CEFRLevel {
  const value = Number(band);
  if (Number.isNaN(value)) return 'A1';
  if (scale === 'score') {
    if (value >= 105) return 'C2';
    if (value >= 90) return 'C1';
    if (value >= 75) return 'B2';
    if (value >= 60) return 'B1';
    if (value >= 45) return 'A2';
    return 'A1';
  }
  if (value >= 8) return 'C2';
  if (value >= 7) return 'C1';
  if (value >= 6) return 'B2';
  if (value >= 5) return 'B1';
  if (value >= 4) return 'A2';
  return 'A1';
}

/** A local, honest rubric for a written answer when no model is available. */
export function localWritingCheck(
  text: string,
  task: WritingTask,
): { percentage: number; notes: string[] } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const notes: string[] = [];
  let score = 0;

  if (words.length >= task.minWords) {
    score += 40;
    notes.push(`Length is fine: ${words.length} words.`);
  } else {
    score += Math.round((words.length / Math.max(task.minWords, 1)) * 40);
    notes.push(`Short: ${words.length} of ${task.minWords} words.`);
  }

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const averageLength = sentences.length ? words.length / sentences.length : 0;
  if (averageLength >= 8) {
    score += 20;
    notes.push('Sentences are long enough to develop an idea.');
  } else {
    notes.push('Many very short sentences — join ideas with connectors.');
  }

  const connectors = [
    'however', 'although', 'because', 'therefore', 'while', 'whereas',
    'in addition', 'moreover', 'on the other hand', 'firstly', 'finally',
  ];
  const used = connectors.filter((c) => text.toLowerCase().includes(c));
  if (used.length >= 2) {
    score += 20;
    notes.push(`Linking language: ${used.slice(0, 3).join(', ')}.`);
  } else {
    notes.push('Add linking words to connect your ideas.');
  }

  const opinionWords = ['i believe', 'i think', 'in my opinion', 'i would argue', 'i agree'];
  if (opinionWords.some((w) => text.toLowerCase().includes(w))) {
    score += 20;
    notes.push('Your position is clearly stated.');
  } else {
    notes.push('State your position explicitly in the introduction.');
  }

  return { percentage: Math.min(100, score), notes };
}
