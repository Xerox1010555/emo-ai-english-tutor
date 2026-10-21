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
      {
        id: 'iel_l11',
        spoken:
          'We can offer you the standard package for forty pounds a month, although the premium one, at sixty, includes unlimited support.',
        prompt: 'How much is the premium package?',
        options: ['Forty pounds', 'Sixty pounds', 'Forty pounds a year', 'It is not stated'],
        correct: 1,
        explanation:
          'Two prices are mentioned and the question asks about the second one. Mark the price you hear, not the number you think of.',
        skill: 'Listening',
      },
      {
        id: 'iel_l12',
        spoken:
          'The train to Manchester leaves from platform nine, not platform four as announced this morning.',
        prompt: 'Which platform does the train leave from?',
        options: ['Platform nine', 'Platform four', 'Both platforms', 'Not announced'],
        correct: 0,
        explanation: '"not platform four as announced" — the correction names the real one first.',
        skill: 'Listening',
      },
      {
        id: 'iel_l13',
        spoken:
          'I would like to reschedule my appointment, but I understand it has to be at least two days in advance.',
        prompt: 'When can the appointment be changed?',
        options: [
          'At least two days before',
          'Any time on the day',
          'Only by phone',
          'It cannot be changed',
        ],
        correct: 0,
        explanation: '"At least two days in advance" is the condition, and the speaker accepts it.',
        skill: 'Listening',
      },
      {
        id: 'iel_l14',
        spoken:
          'We were going to open the new centre last spring, but the planning permission took much longer than expected.',
        prompt: 'When was the new centre supposed to open?',
        options: ['Last spring', 'This summer', 'Next spring', 'It never opened'],
        correct: 0,
        explanation: '"We were going to open ... last spring" is the original plan, not what happened.',
        skill: 'Listening',
      },
      {
        id: 'iel_l15',
        spoken:
          'The application form must be submitted online; a printed copy will not be accepted, though we can post one to you.',
        prompt: 'What can applicants do if they have no internet access?',
        options: [
          'Ask for a printed copy to be posted',
          'Hand in a printed copy at the office',
          'Use the old paper form',
          'Nothing — online is the only option',
        ],
        correct: 0,
        explanation:
          '"A printed copy will not be accepted, though we can post one to you" — the option is help, not submission.',
        skill: 'Listening',
      },
      {
        id: 'iel_l16',
        spoken:
          'Payment is by bank transfer only, and the account details are printed on page four of the form.',
        prompt: 'Where are the payment details?',
        options: [
          'On page four of the form',
          'On the website',
          'In the covering letter',
          'At the office',
        ],
        correct: 0,
        explanation: 'The speaker gives an exact location: "printed on page four".',
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
      {
        id: 'iel_r9',
        passage:
          'The quiet rise of the four-day week is often told as a story about productivity: employers who gave staff a day off, and who found that the work still got done. That story is only half right. The organisations that made the change work tend to share three habits — they cut the number of meetings, they stopped measuring hours at desks, and they gave teams more control over how the work was organised. Where those habits were absent, the same policy produced something closer to five-and-a-half days of work compressed into four.',
        prompt: 'What does the author suggest about the four-day week?',
        options: [
          'It works only where working habits also change',
          'It always reduces productivity',
          'It is mainly a story about employers',
          'It has nothing to do with meetings',
        ],
        correct: 0,
        explanation:
          'The author says the outcome depends on three habits: "Where those habits were absent, the same policy produced something closer to five-and-a-half days".',
        skill: 'Reading',
      },
      {
        id: 'iel_r10',
        passage:
          'The quiet rise of the four-day week is often told as a story about productivity. That story is only half right. The organisations that made the change work tend to share three habits — they cut the number of meetings, they stopped measuring hours at desks, and they gave teams more control.',
        prompt: 'Why does the author call the productivity story "only half right"?',
        options: [
          'Because the changes that work are about habits, not output alone',
          'Because productivity actually fell',
          'Because employers tell it badly',
          'Because the four-day week is disappearing',
        ],
        correct: 0,
        explanation:
          '"Only half right" is followed by what the author thinks the other half is: the working habits.',
        skill: 'Reading',
      },
      {
        id: 'iel_r11',
        passage:
          'Many schools have replaced the traditional written exam with a portfolio of work collected over a year. Supporters argue that this measures learning more fairly: a student who understands the material can show it in a project, a performance or an explanation, however they happen to express it. Critics respond that portfolios reward the students with the most support at home, and that a quiet student with a good idea may never produce a polished piece of evidence.',
        prompt: 'What is the main criticism of portfolios?',
        options: [
          'They favour learners with more support at home',
          'They take too much of the teacher\'s time',
          'They cannot measure real understanding',
          'They are too expensive for schools',
        ],
        correct: 0,
        explanation:
          'The critics\' point is in the second sentence of that clause: "reward the students with the most support at home".',
        skill: 'Reading',
      },
      {
        id: 'iel_r12',
        passage:
          'Many schools have replaced the traditional written exam with a portfolio of work collected over a year. Supporters argue that this measures learning more fairly. Critics respond that portfolios reward the students with the most support at home.',
        prompt: 'What is the writer\'s own view of the two sides?',
        options: [
          'Neither side is proved either way',
          'The supporters are right and the critics are wrong',
          'The critics are right and the supporters are wrong',
          'The writer supports portfolios over exams',
        ],
        correct: 0,
        explanation:
          'The writer reports both sides without taking a side — no evaluative language appears. Do not import a preference that is not there.',
        skill: 'Reading',
      },
      {
        id: 'iel_r13',
        passage:
          'The idea that attention is a scarce resource, borrowed from economics, has shaped decades of advice about focus. It explains why a task feels harder when interrupted, and why people check their phone when they are anxious. But the metaphor misleads in one important way: attention does not dwindle like a bank balance, and it is not consumed by being spent. What actually happens is closer to a muscle that fatigues with use and recovers with rest.',
        prompt: 'What does the author say the "scarce resource" metaphor gets wrong?',
        options: [
          'That attention behaves more like a muscle than a balance',
          'That interruptions do not make tasks harder',
          'That people check their phones when anxious',
          'That advice about focus has been shaped by economics',
        ],
        correct: 0,
        explanation:
          '"But the metaphor misleads in one important way" leads directly to the muscle comparison.',
        skill: 'Reading',
      },
      {
        id: 'iel_r14',
        passage:
          'The idea that attention is a scarce resource has shaped decades of advice about focus. It explains why a task feels harder when interrupted. But the metaphor misleads: attention does not dwindle like a bank balance, and it is not consumed by being spent.',
        prompt: 'What is the closest meaning of "dwindle"?',
        options: ['Grow', 'Diminish', 'Fluctuate', 'Recover'],
        correct: 1,
        explanation: '"Dwindle" = become gradually smaller or weaker — the opposite of "recover".',
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
      {
        id: 'toefl_l7',
        spoken:
          'Our records show the payment was received on the third, which is two days after the invoice date.',
        prompt: 'What is the invoice date?',
        options: ['The 1st', 'The 3rd', 'The 2nd', 'The 5th'],
        correct: 0,
        explanation: 'Two days before the third is the first. Dates are the favourite trap in TOEFL listening.',
        skill: 'Listening',
      },
      {
        id: 'toefl_l8',
        spoken:
          'The seminar is normally on Tuesdays, but this week it has been moved to Thursday because of the public holiday.',
        prompt: 'When is the seminar this week?',
        options: ['Tuesday', 'Thursday', 'Both days', 'It is cancelled'],
        correct: 1,
        explanation: '"Normally on Tuesdays, but this week … moved to Thursday" — the exception wins.',
        skill: 'Listening',
      },
      {
        id: 'toefl_l9',
        spoken:
          'You may park in the blue bays for two hours, provided you display a valid permit on the dashboard.',
        prompt: 'What must drivers do?',
        options: [
          'Display a valid permit',
          'Pay at the machine',
          'Use the underground car park',
          'Arrive before nine',
        ],
        correct: 0,
        explanation: '"Provided you display a valid permit" is the condition attached to parking.',
        skill: 'Listening',
      },
      {
        id: 'toefl_l10',
        spoken:
          'The library extended its opening hours in September, and attendance has risen by nearly a third since then.',
        prompt: 'By how much has attendance risen?',
        options: ['By about 33%', 'By about 3%', 'It has fallen', 'It has not changed'],
        correct: 0,
        explanation: '"A third" = about 33%. Beware "nearly" — it means slightly less than a third.',
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
      {
        id: 'toefl_r7',
        passage:
          'For a century, economists treated air as a free good: it was everywhere, cost nothing to use, and disappeared the moment you opened a window. The arrival of air conditioning changed that arithmetic. In hot climates, cooling became a purchasable service, and once a service can be bought, it can be taxed, rationed or regulated. Several governments now treat the right to cool as part of basic public health, which is a considerable change from treating heat as a private inconvenience.',
        prompt: 'What is the main idea of the passage?',
        options: [
          'Cooling became a service, and therefore something governments regulate',
          'Air conditioning is a luxury good',
          'Hot climates are becoming cooler',
          'Economists used to think air was expensive',
        ],
        correct: 0,
        explanation:
          'The second sentence sets it up and the third draws the consequence — the last sentence is the example of that consequence.',
        skill: 'Reading',
      },
      {
        id: 'toefl_r8',
        passage:
          'For a century, economists treated air as a free good. The arrival of air conditioning changed that arithmetic. In hot climates, cooling became a purchasable service, and once a service can be bought, it can be taxed, rationed or regulated.',
        prompt: 'What does "arithmetic" refer to in the passage?',
        options: ['The cost calculation', 'A mathematical error', 'The history of economics', 'The weather'],
        correct: 0,
        explanation:
          '"That arithmetic" = the way the costs and benefits were counted. TOEFL loves figurative words.',
        skill: 'Reading',
      },
      {
        id: 'toefl_r9',
        passage:
          'The decision to publish a study is rarely a single moment. It begins with a manuscript, passes through review, and then meets a journal whose commercial priorities may not match the author\'s. Editors, not researchers, hold most of the power in this process, and they exercise it under conditions that reward novelty: a paper that confirms what everyone already believes is less likely to be published than one that is surprising.',
        prompt: 'According to the passage, what do editors tend to reward?',
        options: ['Novelty', 'Replication', 'Length', 'Practical impact'],
        correct: 0,
        explanation: '"They exercise it under conditions that reward novelty."',
        skill: 'Reading',
      },
      {
        id: 'toefl_r10',
        passage:
          'The decision to publish a study is rarely a single moment. It begins with a manuscript, passes through review, and then meets a journal whose commercial priorities may not match the author\'s.',
        prompt: 'What does the passage contrast with the author\'s priorities?',
        options: [
          "The journal's commercial priorities",
          'The peer reviewers',
          'The research methodology',
          'The funding body',
        ],
        correct: 0,
        explanation: '"Commercial priorities may not match the author\'s" — the contrast is stated directly.',
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
