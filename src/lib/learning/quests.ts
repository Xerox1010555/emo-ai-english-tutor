import type { CEFRLevel, Skill } from '@/lib/types';
import { CEFR_ORDER, levelIndex, SKILLS } from './constants';
import type { TutorProfileSnapshot } from '@/lib/ai/types';

export type QuestKind = 'grammar' | 'vocabulary' | 'speaking' | 'translation' | 'reading' | 'listening';

export interface DailyQuest {
  id: string;
  date: string;
  kind: QuestKind;
  skill: Skill;
  title: string;
  prompt: string;
  hint: string;
  xpReward: number;
  completed: boolean;
  /** Free-text answer for written quests; null for tap-to-reveal ones. */
  answer: string | null;
  goal_skill: Skill | null;
  goalLevel: CEFRLevel;
  created_at: string;
}

interface QuestTemplate {
  kind: QuestKind;
  skill: Skill;
  minLevelIndex: number;
  title: string;
  build: (seed: number, level: CEFRLevel) => { prompt: string; hint: string; answer: string | null };
}

/**
 * Quest content is generated from a deterministic seed derived from the user
 * and the date. Same day, same user, same quests — so quests never flicker or
 * duplicate on re-render, and no LLM call is needed just to fill a list.
 */
const TEMPLATES: QuestTemplate[] = [
  {
    kind: 'grammar',
    skill: 'Grammar',
    minLevelIndex: 0,
    title: 'Fix the mistake',
    build: (_s, level) => {
      const pool = GRAMMAR_DRILLS.filter((d) => d.min <= levelIndex(level));
      const drill = pool[pool.length - 1] ?? GRAMMAR_DRILLS[0];
      return {
        prompt: `Correct this sentence:\n\n"${drill.wrong}"`,
        hint: drill.hint,
        answer: drill.right,
      };
    },
  },
  {
    kind: 'vocabulary',
    skill: 'Vocabulary',
    minLevelIndex: 0,
    title: 'Use these three words',
    build: (seed) => {
      const set = VOCAB_SETS[seed % VOCAB_SETS.length];
      return {
        prompt: `Write one sentence that uses all three of these words:\n\n${set.words.map((w) => `• ${w}`).join('\n')}`,
        hint: set.hint,
        answer: null,
      };
    },
  },
  {
    kind: 'speaking',
    skill: 'Speaking',
    minLevelIndex: 0,
    title: 'Say it out loud',
    build: (seed) => {
      const line = SPEAKING_LINES[seed % SPEAKING_LINES.length];
      return {
        prompt: `Record yourself saying:\n\n"${line}"\n\nThen say one extra sentence of your own about it.`,
        hint: 'Use the microphone in Chat. Aim for natural rhythm, not word-by-word spelling.',
        answer: null,
      };
    },
  },
  {
    kind: 'translation',
    skill: 'Writing',
    minLevelIndex: 0,
    title: 'Translate this situation',
    build: (seed) => {
      const item = TRANSLATIONS[seed % TRANSLATIONS.length];
      return { prompt: item.ar, hint: item.hint, answer: item.en };
    },
  },
  {
    kind: 'reading',
    skill: 'Reading',
    minLevelIndex: 0,
    title: 'Read and answer',
    build: (seed) => {
      const item = READINGS[seed % READINGS.length];
      return { prompt: `${item.passage}\n\n${item.question}`, hint: item.hint, answer: item.answer };
    },
  },
  {
    kind: 'listening',
    skill: 'Listening',
    minLevelIndex: 1,
    title: 'Listen and identify',
    build: (seed) => {
      const item = LISTENINGS[seed % LISTENINGS.length];
      return { prompt: `${item.spoken}\n\n${item.question}`, hint: item.hint, answer: item.answer };
    },
  },
];

interface GrammarDrill {
  wrong: string;
  right: string;
  hint: string;
  min: number;
}

const GRAMMAR_DRILLS: GrammarDrill[] = [
  { wrong: 'She dont like coffee in the morning.', right: "She doesn't like coffee in the morning.", hint: 'Third person singular takes -s even in negatives, as "doesn\'t".', min: 0 },
  { wrong: 'I have went to the market yesterday.', right: 'I went to the market yesterday.', hint: '"Yesterday" is finished time — use Past Simple, not Present Perfect.', min: 0 },
  { wrong: 'I am agree with your idea.', right: 'I agree with your idea.', hint: '"Agree" is a verb, so it does not take "am".', min: 0 },
  { wrong: 'He is more taller than his brother.', right: 'He is taller than his brother.', hint: '"Taller" is already comparative — drop "more".', min: 0 },
  { wrong: 'I have been living here since three years.', right: 'I have been living here for three years.', hint: '"For" takes a duration; "since" takes a starting point.', min: 1 },
  { wrong: 'Despite of the rain, we went out.', right: 'Despite the rain, we went out.', hint: '"Despite" is not followed by "of".', min: 1 },
  { wrong: 'I would have went there if I knew.', right: 'I would have gone there if I had known.', hint: 'Third conditional pairs "would have" + past participle with "if" + past perfect.', min: 2 },
  { wrong: 'Rarely I have seen such commitment.', right: 'Rarely have I seen such commitment.', hint: 'A negative adverbial at the start triggers subject-auxiliary inversion.', min: 3 },
];

interface VocabSet {
  words: [string, string, string];
  hint: string;
}

const VOCAB_SETS: VocabSet[] = [
  { words: ['achieve', 'struggle', 'eventually'], hint: 'One habit is better: keep the sentence to a single past tense.' },
  { words: ['suggest', 'recommend', 'consider'], hint: 'All three take a gerund after them, never an infinitive.' },
  { words: ['reliable', 'maintain', 'guarantee'], hint: 'Try chaining them: "She is reliable, which does not guarantee that she will maintain it."' },
  { words: ['impact', 'affect', 'influence'], hint: '"Impact" is a noun; "affect" is the verb. Keep them straight.' },
  { words: ['despite', 'although', 'whereas'], hint: 'Use all three across two sentences to practise contrast.' },
];

const SPEAKING_LINES = [
  'If I could change one thing about my week, it would be the mornings.',
  'The best advice I have ever received arrived at the worst possible time.',
  'I would rather learn something badly for a year than never start at all.',
  'Nothing prepares you for a first day the way everyone claims it does.',
  'The habit that stuck was the smallest one I was willing to repeat.',
];

interface Translation {
  ar: string;
  en: string;
  hint: string;
}

const TRANSLATIONS: Translation[] = [
  { ar: 'لو كنت عندك وقت إضافي، كنت هتعلم لغة جديدة.', en: 'If I had more time, I would learn another language.', hint: 'Second conditional: if + past, would + base.' },
  { ar: 'قال لي إن راح يتأخر على الاجتماع.', en: 'He told me he would be late for the meeting.', hint: 'Reported speech: "will" becomes "would" and the pronoun shifts.' },
  { ar: 'اتنين من الأخطاء اللي بتعملها كتير هي المقارنة.', en: 'Two of the mistakes you make often are comparatives.', hint: 'Try a shorter alternative: "You often make comparative errors."' },
  { ar: 'أنا عارف إن ده هياخد وقت، بس مستاهل.', en: 'I know this will take time, but it is worth it.', hint: '"Be worth it" — the "it" stands in for the effort.' },
];

interface Reading {
  passage: string;
  question: string;
  hint: string;
  answer: string;
}

const READINGS: Reading[] = [
  {
    passage:
      'Many people assume that fluency arrives after vocabulary. In practice the reverse is often true: learners who stop pausing mid-sentence sound more confident, and that confidence makes them risk new words.',
    question: 'What is the author\'s main claim?',
    hint: 'Identify the point the whole paragraph supports, not a detail inside it.',
    answer:
      'Fluency and confidence come first and actually make vocabulary growth easier, not the other way around.',
  },
  {
    passage:
      'The committee postponed the decision, citing insufficient data. Whether that was prudence or delay depends on who is asked.',
    question: 'What does this suggest about the committee\'s motive?',
    hint: 'The author states two possibilities and refuses to choose — what does that say about them?',
    answer:
      'The author is deliberately neutral, implying the motive is genuinely ambiguous and inviting the reader to distrust an official account.',
  },
  {
    passage:
      'Remote work removed the commute and, with it, the low-stakes conversations where most workplace information is actually exchanged.',
    question: 'What is implied but not stated?',
    hint: 'The stated fact is about the commute. What follows for how people learn things?',
    answer:
      'People now learn how work is done far less incidentally, so teams have to explain things that used to be absorbed just by being present.',
  },
];

interface Listening {
  spoken: string;
  question: string;
  hint: string;
  answer: string;
}

const LISTENINGS: Listening[] = [
  {
    spoken: 'We are going to wrap up the third quarter and look at the pipeline.',
    question: 'What are they doing?',
    hint: '"Wrap up" means finish, and "look at" means review.',
    answer: 'They are finishing the third quarter and reviewing the sales pipeline.',
  },
  {
    spoken: 'I would hold off on that decision until the audit comes back.',
    question: 'What is the speaker advising?',
    hint: '"Hold off on" means delay. "Comes back" refers to a result arriving.',
    answer: 'Delay the decision until the audit results are available.',
  },
  {
    spoken: 'The deadline got pushed back by a fortnight, which gives us some breathing room.',
    question: 'What is the consequence?',
    hint: '"Pushed back" = delayed. "Breathing room" = extra time.',
    answer: 'The deadline is two weeks later, so there is extra time to finish.',
  },
];

export interface QuestSetOptions {
  profile: TutorProfileSnapshot;
  date: string;
  seedKey: string;
  count?: number;
}

/**
 * Builds the day's quests. Skill selection is weighted toward the learner's
 * weakest skills, with a guaranteed mix so one weak area cannot dominate the
 * whole day and strengths still get maintained.
 */
export function generateDailyQuests(options: QuestSetOptions): DailyQuest[] {
  const { profile, date, seedKey } = options;
  const count = options.count ?? 4;
  const seed = hashString(`${seedKey}:${date}`);
  const levelIdx = levelIndex(profile.level);
  const level = CEFR_ORDER[levelIdx];

  const weights = buildSkillWeights(profile);
  const ranked = SKILLS
    .map((skill) => ({ skill, weight: weights[skill] }))
    .sort((a, b) => b.weight - a.weight);

  // Target up to two quest types aimed at weak skills, the rest maintenance.
  const focusSkills: Skill[] = ranked
    .filter((r) => r.weight > 0.5)
    .slice(0, 2)
    .map((r) => r.skill);

  const eligible = TEMPLATES.filter((t) => t.minLevelIndex <= levelIdx);
  const chosen: QuestTemplate[] = [];
  const usedSkills = new Set<Skill>();

  // Pass 1: one quest per focus skill.
  for (const skill of focusSkills) {
    const candidate = eligible.find((t) => t.skill === skill && !chosen.includes(t));
    if (candidate) {
      chosen.push(candidate);
      usedSkills.add(candidate.skill);
    }
  }

  // Pass 2: fill remaining slots with varied skills.
  let cursor = seed;
  while (chosen.length < Math.min(count, eligible.length)) {
    const candidate = eligible[cursor % eligible.length];
    cursor += 1;
    if (usedSkills.has(candidate.skill) && cursor % (eligible.length * 2) !== 0) continue;
    if (chosen.includes(candidate)) continue;
    chosen.push(candidate);
    usedSkills.add(candidate.skill);
  }

  const now = new Date().toISOString();

  return chosen.map((template, index) => {
    const built = template.build((seed + index * 7) % 1000, level);
    return {
      id: `${date}_${template.kind}_${template.skill}`,
      date,
      kind: template.kind,
      skill: template.skill,
      title: template.title,
      prompt: built.prompt,
      hint: built.hint,
      xpReward: xpFor(template.kind, levelIdx),
      completed: false,
      answer: built.answer,
      goal_skill: focusSkills.includes(template.skill) ? template.skill : null,
      goalLevel: level,
      created_at: now,
    };
  });
}

function buildSkillWeights(profile: TutorProfileSnapshot): Record<Skill, number> {
  const weights = {} as Record<Skill, number>;
  const hasData = SKILLS.some((s) => profile.skillProgress[s] > 0);

  for (const skill of SKILLS) {
    if (!hasData) {
      weights[skill] = 1;
      continue;
    }
    const progress = profile.skillProgress[skill];
    // Lower progress => higher weight, with a floor so nothing hits zero.
    weights[skill] = 1 + (100 - progress) / 100;
    if (profile.strengths.includes(skill)) weights[skill] *= 0.5;
  }
  return weights;
}

function xpFor(kind: QuestKind, levelIdx: number): number {
  const base: Record<QuestKind, number> = {
    grammar: 20,
    vocabulary: 15,
    speaking: 25,
    translation: 20,
    reading: 15,
    listening: 20,
  };
  return base[kind] + levelIdx * 5;
}

/** Stable, dependency-free string hash. */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}
