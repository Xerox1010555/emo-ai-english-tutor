import type { CEFRLevel } from './types';
import type { PlacementItem } from './learning/placement';

/**
 * The placement bank.
 *
 * Every item carries an `ability` value (the CEFR level it discriminates)
 * and a `weight` (how much evidence one answer gives). The adaptive engine
 * uses those to pick the next question, so the bank is deliberately wide:
 * two or three items per level per skill, so a test can always find an item
 * close to the learner's true level.
 */
export const placementBank: PlacementItem[] = [
  // ------------------------------------------------------------------ A1
  {
    id: 'a1_g1', skill: 'Grammar', level: 'A1', ability: -3, kind: 'mcq', weight: 1,
    question: 'She ___ to school every day.',
    options: ['go', 'goes', 'going', 'went'], correct: 1,
  },
  {
    id: 'a1_g2', skill: 'Grammar', level: 'A1', ability: -3, kind: 'mcq', weight: 1,
    question: 'I ___ a student.',
    options: ['am', 'is', 'are', 'be'], correct: 0,
  },
  {
    id: 'a1_g3', skill: 'Grammar', level: 'A1', ability: -3, kind: 'mcq', weight: 1,
    question: 'Choose the correct word: "She ___ coffee every morning."',
    options: ['drink', 'drinks', 'drinking', 'is drink'], correct: 1,
  },
  {
    id: 'a1_v1', skill: 'Vocabulary', level: 'A1', ability: -3, kind: 'mcq', weight: 1,
    question: 'What is the opposite of "hot"?',
    options: ['warm', 'cold', 'cool', 'freezing'], correct: 1,
  },
  {
    id: 'a1_v2', skill: 'Vocabulary', level: 'A1', ability: -3, kind: 'mcq', weight: 1,
    question: 'Which word means "a place where you buy food"?',
    options: ['library', 'bakery', 'school', 'park'], correct: 1,
  },
  {
    id: 'a1_r1', skill: 'Reading', level: 'A1', ability: -3, kind: 'mcq', weight: 1,
    question: 'Read: "My name is Sara. I live in Cairo. I am ten." What is the name?',
    options: ['Sara', 'Cairo', 'Ten', 'No name'], correct: 0,
  },
  {
    id: 'a1_l1', skill: 'Listening', level: 'A1', ability: -3, kind: 'listening', weight: 1.2,
    spoken: 'My name is Omar. I am from Egypt.',
    question: 'What country is he from?',
    options: ['Egypt', 'Spain', 'Japan', 'Canada'], correct: 0,
  },
  {
    id: 'a1_s1', skill: 'Speaking', level: 'A1', ability: -3, kind: 'speaking', weight: 1.2,
    target: 'My name is Sara and I live in Cairo.',
    question: 'Say this sentence out loud',
    options: ['My name is Sara and I live in Cairo.'], correct: 0,
  },
  {
    id: 'a1_w1', skill: 'Writing', level: 'A1', ability: -3, kind: 'writing', weight: 1,
    question: 'Write one sentence about your name.',
    options: ['Your answer'], correct: 0, minWords: 4,
  },

  // ------------------------------------------------------------------ A2
  {
    id: 'a2_g1', skill: 'Grammar', level: 'A2', ability: -2, kind: 'mcq', weight: 1,
    question: 'They ___ dinner when the phone rang.',
    options: ['have', 'had', 'were having', 'are having'], correct: 2,
  },
  {
    id: 'a2_g2', skill: 'Grammar', level: 'A2', ability: -2, kind: 'mcq', weight: 1,
    question: 'I haven\'t seen him ___ last week.',
    options: ['for', 'since', 'from', 'ago'], correct: 1,
  },
  {
    id: 'a2_g3', skill: 'Grammar', level: 'A2', ability: -2, kind: 'mcq', weight: 1,
    question: '"She don\'t like it" — what is wrong?',
    options: [
      'don\'t should be doesn\'t',
      'like should be likes',
      'it should be them',
      'nothing is wrong',
    ],
    correct: 0,
  },
  {
    id: 'a2_v1', skill: 'Vocabulary', level: 'A2', ability: -2, kind: 'mcq', weight: 1,
    question: 'Choose the correct meaning of "reliable":',
    options: [
      'someone who is often late',
      'someone you can trust',
      'someone who talks a lot',
      'someone who is funny',
    ],
    correct: 1,
  },
  {
    id: 'a2_r1', skill: 'Reading', level: 'A2', ability: -2, kind: 'mcq', weight: 1,
    question: '"The meeting was called off." What does "called off" mean?',
    options: ['started', 'cancelled', 'delayed', 'extended'], correct: 1,
  },
  {
    id: 'a2_r2', skill: 'Reading', level: 'A2', ability: -2, kind: 'mcq', weight: 1,
    question: 'Read: "The shop opens at nine and closes at six. It is closed on Sunday." When can you buy something there?',
    options: [
      'On Sunday morning',
      'At five on Monday',
      'At eight on Monday',
      'Never',
    ],
    correct: 1,
  },
  {
    id: 'a2_l1', skill: 'Listening', level: 'A2', ability: -2, kind: 'listening', weight: 1.2,
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
    id: 'a2_s1', skill: 'Speaking', level: 'A2', ability: -2, kind: 'speaking', weight: 1.2,
    target: 'I usually work in the morning and study English in the evening.',
    question: 'Say this sentence out loud',
    options: ['I usually work in the morning and study English in the evening.'], correct: 0,
  },
  {
    id: 'a2_w1', skill: 'Writing', level: 'A2', ability: -2, kind: 'writing', weight: 1,
    question: 'Write one sentence about what you did last weekend.',
    options: ['Your answer'], correct: 0, minWords: 5,
  },

  // ------------------------------------------------------------------ B1
  {
    id: 'b1_g1', skill: 'Grammar', level: 'B1', ability: -1, kind: 'mcq', weight: 1,
    question: 'If I ___ more time, I would learn another language.',
    options: ['have', 'had', 'will have', 'would have'], correct: 1,
  },
  {
    id: 'b1_g2', skill: 'Grammar', level: 'B1', ability: -1, kind: 'mcq', weight: 1,
    question: 'The report ___ by the team before the deadline.',
    options: ['was finished', 'is finishing', 'finishes', 'finished'], correct: 0,
  },
  {
    id: 'b1_g3', skill: 'Grammar', level: 'B1', ability: -1, kind: 'mcq', weight: 1,
    question: 'Choose the correct form: "I ___ here since 2019."',
    options: ['live', 'lived', 'have lived', 'am living'], correct: 2,
  },
  {
    id: 'b1_v1', skill: 'Vocabulary', level: 'B1', ability: -1, kind: 'mcq', weight: 1,
    question: 'Choose the best synonym for "significant":',
    options: ['small', 'important', 'simple', 'cheap'], correct: 1,
  },
  {
    id: 'b1_v2', skill: 'Vocabulary', level: 'B1', ability: -1, kind: 'mcq', weight: 1,
    question: 'Which word completes the sentence: "The results were ___ — they changed everything."?',
    options: ['dramatic', 'dramatist', 'dramatically', 'drama'], correct: 0,
  },
  {
    id: 'b1_r1', skill: 'Reading', level: 'B1', ability: -1, kind: 'mcq', weight: 1,
    question: '"Despite the rain, we went hiking." This means:',
    options: [
      'Because of the rain, we went hiking',
      'We didn\'t go hiking because of the rain',
      'The rain didn\'t stop us from hiking',
      'We went hiking before the rain',
    ],
    correct: 2,
  },
  {
    id: 'b1_r2', skill: 'Reading', level: 'B1', ability: -1, kind: 'mcq', weight: 1,
    question: '"Many people assume fluency arrives after vocabulary. In practice the reverse is often true." The author argues that:',
    options: [
      'Vocabulary is the hardest part of learning English',
      'Speaking early helps learners risk new words',
      'Fluency can only be reached through books',
      'Most learners never reach fluency',
    ],
    correct: 1,
  },
  {
    id: 'b1_l1', skill: 'Listening', level: 'B1', ability: -1, kind: 'listening', weight: 1.2,
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
    id: 'b1_s1', skill: 'Speaking', level: 'B1', ability: -1, kind: 'speaking', weight: 1.2,
    target: 'If I had known the consequences, I would have taken a different approach.',
    question: 'Say this sentence out loud',
    options: ['If I had known the consequences, I would have taken a different approach.'],
    correct: 0,
  },
  {
    id: 'b1_w1', skill: 'Writing', level: 'B1', ability: -1, kind: 'writing', weight: 1,
    question: 'Describe a decision you made recently, and say why you made it. Use the word "because".',
    options: ['Your answer'], correct: 0, keyword: 'because', minWords: 8,
  },

  // ------------------------------------------------------------------ B2
  {
    id: 'b2_g1', skill: 'Grammar', level: 'B2', ability: 0, kind: 'mcq', weight: 1,
    question: 'Hardly ___ when the bell rang.',
    options: ['I had arrived', 'had I arrived', 'I arrived', 'did I arrive'], correct: 1,
  },
  {
    id: 'b2_g2', skill: 'Grammar', level: 'B2', ability: 0, kind: 'mcq', weight: 1,
    question: 'She suggested that he ___ a doctor.',
    options: ['sees', 'see', 'saw', 'seeing'], correct: 1,
  },
  {
    id: 'b2_g3', skill: 'Grammar', level: 'B2', ability: 0, kind: 'mcq', weight: 1,
    question: 'Choose the correct form: "By the time we arrived, the concert ___."',
    options: ['started', 'had started', 'has started', 'was starting'], correct: 1,
  },
  {
    id: 'b2_v1', skill: 'Vocabulary', level: 'B2', ability: 0, kind: 'mcq', weight: 1,
    question: 'Choose the best meaning of "ubiquitous":',
    options: ['rare and unusual', 'present everywhere', 'extremely large', 'very old'], correct: 1,
  },
  {
    id: 'b2_v2', skill: 'Vocabulary', level: 'B2', ability: 0, kind: 'mcq', weight: 1,
    question: 'Which collocation is correct?',
    options: [
      'make a decision',
      'do a decision',
      'take a decision',
      'both make and take are wrong',
    ],
    correct: 0,
  },
  {
    id: 'b2_r1', skill: 'Reading', level: 'B2', ability: 0, kind: 'mcq', weight: 1,
    question: '"The findings are consistent with previous research." This means the findings:',
    options: [
      'contradict earlier studies',
      'agree with earlier studies',
      'are better than earlier studies',
      'ignore earlier studies',
    ],
    correct: 1,
  },
  {
    id: 'b2_r2', skill: 'Reading', level: 'B2', ability: 0, kind: 'mcq', weight: 1,
    question: '"Remote work removed the commute and, with it, the low-stakes conversations where most workplace information is exchanged." What is implied?',
    options: [
      'People now learn how work is done far less incidentally',
      'Remote workers talk more than office workers',
      'The commute was the only way to exchange information',
      'Information exchange has improved',
    ],
    correct: 0,
  },
  {
    id: 'b2_l1', skill: 'Listening', level: 'B2', ability: 0, kind: 'listening', weight: 1.2,
    spoken: 'The deadline got pushed back by a fortnight, which gives us some breathing room.',
    question: 'What is the consequence?',
    options: [
      'The deadline is two weeks later, so there is extra time to finish.',
      'The deadline is two weeks earlier.',
      'There is no deadline any more.',
      'The team has to work faster.',
    ],
    correct: 0,
  },
  {
    id: 'b2_s1', skill: 'Speaking', level: 'B2', ability: 0, kind: 'speaking', weight: 1.2,
    target: 'The report was well received, although the deadline proved rather tight.',
    question: 'Say this sentence out loud',
    options: ['The report was well received, although the deadline proved rather tight.'],
    correct: 0,
  },
  {
    id: 'b2_w1', skill: 'Writing', level: 'B2', ability: 0, kind: 'writing', weight: 1,
    question: 'Write a short paragraph comparing two ways of working. Use "whereas".',
    options: ['Your answer'], correct: 0, keyword: 'whereas', minWords: 10,
  },

  // ------------------------------------------------------------------ C1
  {
    id: 'c1_g1', skill: 'Grammar', level: 'C1', ability: 1, kind: 'mcq', weight: 1,
    question: 'Not until the final hour ___ a breakthrough.',
    options: [
      'the researchers made',
      'did the researchers make',
      'the researchers did make',
      'made the researchers',
    ],
    correct: 1,
  },
  {
    id: 'c1_g2', skill: 'Grammar', level: 'C1', ability: 1, kind: 'mcq', weight: 1,
    question: 'Choose the correct form: "___ the committee approved it, the project would have failed."',
    options: ['Had', 'If had', 'Should', 'Would have'], correct: 0,
  },
  {
    id: 'c1_v1', skill: 'Vocabulary', level: 'C1', ability: 1, kind: 'mcq', weight: 1,
    question: 'Choose the best meaning of "mitigate":',
    options: [
      'eliminate completely',
      'make less severe',
      'increase rapidly',
      'postpone indefinitely',
    ],
    correct: 1,
  },
  {
    id: 'c1_v2', skill: 'Vocabulary', level: 'C1', ability: 1, kind: 'mcq', weight: 1,
    question: 'Which word best completes: "Her argument was ___ enough to change the committee\'s mind."?',
    options: ['compelling', 'compulsory', 'complicit', 'complacent'], correct: 0,
  },
  {
    id: 'c1_r1', skill: 'Reading', level: 'C1', ability: 1, kind: 'mcq', weight: 1,
    question: '"The argument, while compelling, rests on a dubious premise." The writer thinks the argument is:',
    options: [
      'completely sound',
      'persuasive but flawed at its base',
      'irrelevant',
      'unconvincing overall',
    ],
    correct: 1,
  },
  {
    id: 'c1_r2', skill: 'Reading', level: 'C1', ability: 1, kind: 'mcq', weight: 1,
    question: '"The committee postponed the decision, citing insufficient data. Whether that was prudence or delay depends on who is asked." The writer suggests:',
    options: [
      'The committee acted prudently',
      'The committee was delaying',
      'The motive is deliberately ambiguous',
      'More data would have changed nothing',
    ],
    correct: 2,
  },
  {
    id: 'c1_l1', skill: 'Listening', level: 'C1', ability: 1, kind: 'listening', weight: 1.2,
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
  {
    id: 'c1_s1', skill: 'Speaking', level: 'C1', ability: 1, kind: 'speaking', weight: 1.2,
    target: 'Had the warning arrived a day earlier, the damage would have been avoided.',
    question: 'Say this sentence out loud',
    options: ['Had the warning arrived a day earlier, the damage would have been avoided.'],
    correct: 0,
  },
  {
    id: 'c1_w1', skill: 'Writing', level: 'C1', ability: 1, kind: 'writing', weight: 1,
    question: 'Explain a decision you would defend to someone who disagrees with you.',
    options: ['Your answer'], correct: 0, keyword: 'I', minWords: 14,
  },

  // ------------------------------------------------------------------ C2
  {
    id: 'c2_g1', skill: 'Grammar', level: 'C2', ability: 2, kind: 'mcq', weight: 1,
    question: 'Choose the sentence where the modal expresses deduction about a past event:',
    options: [
      'She must have left already.',
      'She must leave now.',
      'She should have left already.',
      'She may leave already.',
    ],
    correct: 0,
  },
  {
    id: 'c2_g2', skill: 'Grammar', level: 'C2', ability: 2, kind: 'mcq', weight: 1,
    question: 'Far from being ___ by the criticism, the team worked harder.',
    options: ['deterred', 'determined', 'deterring', 'deterrence'], correct: 0,
  },
  {
    id: 'c2_v1', skill: 'Vocabulary', level: 'C2', ability: 2, kind: 'mcq', weight: 1,
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
    id: 'c2_v2', skill: 'Vocabulary', level: 'C2', ability: 2, kind: 'mcq', weight: 1,
    question: 'Which phrase means "to speak in a way that avoids the main point"?',
    options: [
      'to beat about the bush',
      'to put your foot down',
      'to call it a day',
      'to bite the bullet',
    ],
    correct: 0,
  },
  {
    id: 'c2_r1', skill: 'Reading', level: 'C2', ability: 2, kind: 'mcq', weight: 1,
    question: '"The reforms were, at best, a partial answer to a structural problem." The writer thinks the reforms are:',
    options: [
      'inadequate in principle',
      'radical and complete',
      'unnecessary but harmless',
      'likely to fail entirely',
    ],
    correct: 0,
  },
  {
    id: 'c2_r2', skill: 'Reading', level: 'C2', ability: 2, kind: 'mcq', weight: 1,
    question: '"His argument, while superficially sound, depends on a premise the evidence cannot support." The tone is:',
    options: [
      'enthusiastic',
      'measured but critical',
      'indifferent',
      'openly hostile',
    ],
    correct: 1,
  },
  {
    id: 'c2_l1', skill: 'Listening', level: 'C2', ability: 2, kind: 'listening', weight: 1.2,
    spoken: 'Had the figures been revised, the conclusion would have been entirely different.',
    question: 'What does the speaker imply?',
    options: [
      'The figures should be revised now',
      'The conclusion depends entirely on the figures',
      'The figures were correct',
      'The conclusion was never in doubt',
    ],
    correct: 1,
  },
  {
    id: 'c2_s1', skill: 'Speaking', level: 'C2', ability: 2, kind: 'speaking', weight: 1.2,
    target: 'Notwithstanding the apparent consensus, the underlying assumptions remained contested.',
    question: 'Say this sentence out loud',
    options: ['Notwithstanding the apparent consensus, the underlying assumptions remained contested.'],
    correct: 0,
  },
  {
    id: 'c2_w1', skill: 'Writing', level: 'C2', ability: 2, kind: 'writing', weight: 1,
    question: 'Write a paragraph that concedes an opposing view before dismantling it. Use "while".',
    options: ['Your answer'], correct: 0, keyword: 'while', minWords: 16,
  },
];

/**
 * The old fixed bank is kept for the smoke tests and for the level-by-level
 * fallback, but the adaptive test works from `placementBank`.
 */
export const placementQuestions = placementBank.map((item) => ({
  id: item.id,
  skill: item.skill,
  level: item.level as CEFRLevel,
  question: item.question,
  options: item.options,
  correct: item.correct,
  type: item.kind === 'mcq' ? undefined : item.kind,
  spoken: item.spoken,
  target: item.target,
  keyword: item.keyword,
  minWords: item.minWords,
}));
