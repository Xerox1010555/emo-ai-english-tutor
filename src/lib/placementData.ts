import type { CEFRLevel, Skill } from './types';

export interface PlacementQuestion {
  id: string;
  skill: Skill;
  level: CEFRLevel;
  question: string;
  options: string[];
  correct: number;
  audio?: string;
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
];
