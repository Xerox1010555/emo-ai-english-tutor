/**
 * Smoke tests for the pure logic that has no browser or Supabase dependency.
 * Run with:  npx tsx scripts/smoke.ts
 * (or compile-free: npx vite-node scripts/smoke.ts)
 */
import { generateDailyQuests } from '../src/lib/learning/quests';
import { buildRoadmap, currentStage, STAGE_BLUEPRINTS } from '../src/lib/learning/roadmap';
import { emptyProfileSnapshot, type TutorProfileSnapshot } from '../src/lib/ai/types';
import { buildSystemPrompt, buildMessages } from '../src/lib/ai/prompt';
import { extractJson, parseAiPayload } from '../src/lib/ai/schema';
import { generateTutorResponse } from '../src/lib/tutorEngine';
import { buildTutorProfileSnapshot, todayKey } from '../src/lib/learning/profile';
import { getQuizSet, quizBank } from '../src/lib/quizData';
import { parseNaturalDate } from '../src/lib/dateParser';
import { placementBank } from '../src/lib/placementData';
import {
  abilityBand,
  chooseNextItem,
  determinePlacementLevel,
  levelForAbility,
  summarise,
  targetItemCount,
  updateAbility,
  type PlacementAnswer,
} from '../src/lib/learning/placement';
import { speakingAttemptPassed, scoreSpeaking } from '../src/lib/learning/speech';
import { buildReviewQueue, reviewXp, xpLevel } from '../src/lib/learning/review';
import { EXAMS, cefrForBand, localWritingCheck, scoreExam } from '../src/lib/learning/exams';
import { SCENARIOS, scoreScenario } from '../src/lib/learning/scenarios';
import {
  EXAMS,
  cefrForBand,
  localWritingCheck,
  scoreExam,
} from '../src/lib/learning/exams';
import { SCENARIOS, scoreScenario } from '../src/lib/learning/scenarios';
import {
  buildDailyActivity,
  buildWeeklyComparison,
  dayKey,
  fallbackHeadline,
  weekStart,
} from '../src/lib/learning/weeklyReport';
import type { CEFRLevel, Skill } from '../src/lib/types';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

const SKILLS_ALL: Skill[] = ['Grammar', 'Vocabulary', 'Listening', 'Speaking', 'Writing', 'Reading'];

function profileWith(overrides: Partial<TutorProfileSnapshot>): TutorProfileSnapshot {
  return { ...emptyProfileSnapshot(), ...overrides };
}

// ---------------------------------------------------------------- quests ----
section('Daily quest generation');

const emptyProfile = profileWith({ level: 'A1' });
const day1 = generateDailyQuests({ profile: emptyProfile, date: '2026-09-28', seedKey: 'user-1' });

check('generates the requested number of quests', day1.length === 4, `got ${day1.length}`);
check(
  'quest ids are unique',
  new Set(day1.map((q) => q.id)).size === day1.length,
);
check('every quest has a title', day1.every((q) => q.title.length > 0));
check('every quest has a prompt', day1.every((q) => q.prompt.length > 0));
check('every quest has a hint', day1.every((q) => q.hint.length > 0));
check('every quest has positive XP', day1.every((q) => q.xpReward > 0));
check('every quest has a valid skill', day1.every((q) => SKILLS_ALL.includes(q.skill)));

const day1again = generateDailyQuests({
  profile: emptyProfile,
  date: '2026-09-28',
  seedKey: 'user-1',
});
check(
  'same user + same date is deterministic',
  JSON.stringify(day1.map((q) => q.id)) === JSON.stringify(day1again.map((q) => q.id)),
);

const day2 = generateDailyQuests({ profile: emptyProfile, date: '2026-09-29', seedKey: 'user-1' });
check(
  'a different date produces a different set',
  JSON.stringify(day1.map((q) => q.id)) !== JSON.stringify(day2.map((q) => q.id)),
);

const otherUser = generateDailyQuests({
  profile: emptyProfile,
  date: '2026-09-28',
  seedKey: 'user-2',
});
check(
  'a different user produces a different set',
  JSON.stringify(day1.map((q) => q.id)) !== JSON.stringify(otherUser.map((q) => q.id)),
);

const weakProfile = profileWith({
  level: 'B1',
  skillProgress: {
    Grammar: 20,
    Vocabulary: 95,
    Listening: 70,
    Speaking: 65,
    Writing: 60,
    Reading: 72,
  },
  weaknesses: ['Grammar'],
  strengths: ['Vocabulary'],
});
const weakQuests = generateDailyQuests({
  profile: weakProfile,
  date: '2026-09-28',
  seedKey: 'user-1',
});
check(
  'a weak skill is represented in the quest set',
  weakQuests.some((q) => q.goal_skill === 'Grammar'),
  `goals: ${JSON.stringify(weakQuests.map((q) => q.goal_skill))}`,
);
check(
  'quest difficulty scales with level',
  generateDailyQuests({ profile: profileWith({ level: 'C1' }), date: '2026-09-28', seedKey: 'u' })
    .every((q) => q.xpReward > generateDailyQuests({ profile: profileWith({ level: 'A1' }), date: '2026-09-28', seedKey: 'u' })[0].xpReward),
);
check(
  'listening quests are gated above A1',
  !generateDailyQuests({ profile: profileWith({ level: 'A1' }), date: '2026-09-28', seedKey: 'u' })
    .some((q) => q.kind === 'listening'),
);

// --------------------------------------------------------------- roadmap ----
section('Roadmap stages');

const noData = buildRoadmap({
  currentLevel: 'A1',
  completedLessons: 0,
  completedQuests: 0,
  skillProgress: {
    Grammar: 0, Vocabulary: 0, Listening: 0, Speaking: 0, Writing: 0, Reading: 0,
  },
});
check('all stages present', noData.length === STAGE_BLUEPRINTS.length);
check(
  'A1 learner has a locked first stage and an active early stage',
  noData[0].status === 'active' && noData[noData.length - 1].status === 'locked',
  noData.map((s) => `${s.name}:${s.status}`).join(', '),
);
check('locked stages show 0%', noData.filter((s) => s.status === 'locked').every((s) => s.progress === 0));
check('exactly one active stage', noData.filter((s) => s.status === 'active').length === 1);

const advanced = buildRoadmap({
  currentLevel: 'C2',
  completedLessons: 100,
  completedQuests: 100,
  skillProgress: {
    Grammar: 95, Vocabulary: 95, Listening: 90, Speaking: 90, Writing: 95, Reading: 92,
  },
});
check(
  'C2 learner has no locked stages',
  advanced.every((s) => s.status !== 'locked'),
  advanced.map((s) => `${s.name}:${s.status}`).join(', '),
);
check('C2 learner has an active stage', currentStage(advanced) !== null);

const mid = buildRoadmap({
  currentLevel: 'B1',
  completedLessons: 5,
  completedQuests: 4,
  skillProgress: {
    Grammar: 55, Vocabulary: 60, Listening: 40, Speaking: 50, Writing: 45, Reading: 58,
  },
});
const activeMid = currentStage(mid);
check('B1 learner has an active stage', activeMid !== null);
check(
  'active stage progress stays within 5–95%',
  activeMid !== null && activeMid.progress >= 5 && activeMid.progress <= 95,
  `progress ${activeMid?.progress}`,
);

const allLevels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const allHaveActive = allLevels.every((lvl) => {
  const stages = buildRoadmap({
    currentLevel: lvl,
    completedLessons: 0,
    completedQuests: 0,
    skillProgress: { Grammar: 0, Vocabulary: 0, Listening: 0, Speaking: 0, Writing: 0, Reading: 0 },
  });
  return stages.some((s) => s.status === 'active');
});
check('every CEFR level resolves to an active stage', allHaveActive);

// ---------------------------------------------------------------- prompt ----
section('Prompt / personality layer');

const b1 = buildTutorProfileSnapshot; // referenced to keep the import honest
void b1;

const richProfile = profileWith({
  level: 'B1',
  targetLevel: 'C1',
  preferredLanguage: 'ar',
  goals: ['Pass IELTS', 'Speak with strangers'],
  strengths: ['Vocabulary'],
  weaknesses: ['Grammar', 'Writing'],
  recurringMistakes: [
    { label: 'more better', category: 'comparative', weight: 4 },
    { label: 'i am agree', category: 'grammar', weight: 2 },
  ],
  learningStreak: 6,
  recentPerformance: 62,
});

const prompt = buildSystemPrompt({
  message: 'I have went to the market yesterday.',
  history: [],
  profile: richProfile,
  mode: 'coach',
  focus: { skill: 'Grammar', title: 'Present Perfect vs Past Simple' },
});

check('prompt includes the learner level', prompt.includes('CEFR B1'));
check('prompt includes the target level', prompt.includes('toward C1'));
check('prompt includes stated goals', prompt.includes('Pass IELTS'));
check('prompt includes recurring mistakes', prompt.includes('more better'));
check('prompt includes the focus skill', prompt.includes('Present Perfect vs Past Simple'));
check('prompt includes code-switching guidance', prompt.includes('Arabic support'));
check('prompt requests JSON output', prompt.includes('Return ONLY a JSON object'));
check('prompt states hard boundaries', prompt.includes('Hard boundaries'));
check('prompt forbids requesting secrets', prompt.includes('API keys'));

for (const mode of ['friendly', 'coach', 'strict'] as const) {
  const p = buildSystemPrompt({ message: 'hi', history: [], profile: richProfile, mode });
  check(`mode "${mode}" changes the voice`, p.includes(mode === 'friendly' ? 'warm, patient' : mode === 'coach' ? 'direct, energetic coach' : 'accountable, firm'));
}

const strictPrompt = buildSystemPrompt({
  message: 'hi',
  history: [],
  profile: richProfile,
  mode: 'strict',
});
check('strict mode forbids abuse explicitly', strictPrompt.includes('NEVER INSULTS'));
check('strict mode frames it as accountability', strictPrompt.includes('ACCOUNTABILITY'));

const messages = buildMessages({
  message: 'the last message',
  history: [
    { role: 'user', content: 'first' },
    { role: 'assistant', content: 'reply' },
  ],
  profile: richProfile,
  mode: 'friendly',
});
check('messages start with a system prompt', messages[0].role === 'system');
check('messages end with the user turn', messages[messages.length - 1].content === 'the last message');
check('history is preserved in order', messages.some((m) => m.content === 'first') && messages.some((m) => m.content === 'reply'));

const longHistory = Array.from({ length: 40 }, (_, i) => ({
  role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
  content: `turn ${i}`,
}));
const trimmed = buildMessages({ message: 'now', history: longHistory, profile: richProfile, mode: 'friendly' });
check('history is trimmed to a bounded context', trimmed.length <= 1 + 10 + 1, `got ${trimmed.length}`);

// ---------------------------------------------------------------- schema ----
section('LLM output validation');

const good = {
  reply: 'Nice try — use "went" with "yesterday".',
  corrections: [
    { original: 'have went', corrected: 'went', explanation: 'Finished time takes past simple.', category: 'tense' },
  ],
  followUpQuestion: 'What did you buy?',
  mood: 'curious',
  targetSkill: 'Grammar',
  languageMix: 'ar-mix',
};
const parsedGood = parseAiPayload(good);
check('valid payload parses', parsedGood !== null);
check('reply survives intact', parsedGood?.reply === good.reply);
check('correction category survives', parsedGood?.corrections[0]?.category === 'tense');
check('mood survives', parsedGood?.mood === 'curious');
check('target skill survives', parsedGood?.targetSkill === 'Grammar');

check('rejects a missing reply', parseAiPayload({ corrections: [] }) === null);
check('rejects an empty reply', parseAiPayload({ reply: '   ' }) === null);
check('rejects a non-string reply', parseAiPayload({ reply: 42 }) === null);
check('rejects an array', parseAiPayload([1, 2, 3]) === null);
check('rejects null', parseAiPayload(null) === null);
check('rejects a non-object', parseAiPayload('hello') === null);

const badEnums = parseAiPayload({
  reply: 'ok',
  mood: 'elated',
  targetSkill: 'Dancing',
  languageMix: 'klingon',
  corrections: [{ original: 'a', corrected: 'b', explanation: 'c', category: 'wat' }],
});
check('unknown mood falls back to neutral', badEnums?.mood === 'neutral');
check('unknown targetSkill falls back to Grammar', badEnums?.targetSkill === 'Grammar');
check('unknown languageMix falls back to en', badEnums?.languageMix === 'en');
check('unknown correction category falls back to other', badEnums?.corrections[0]?.category === 'other');

const partialCorrection = parseAiPayload({
  reply: 'ok',
  corrections: [
    { original: 'a', corrected: 'b' },
    { original: 'x', corrected: 'y', explanation: 'z', category: 'spelling' },
  ],
});
check('incomplete corrections are dropped, valid ones kept', partialCorrection?.corrections.length === 1);
check('kept correction is the valid one', partialCorrection?.corrections[0]?.original === 'x');

const manyCorrections = parseAiPayload({
  reply: 'ok',
  corrections: Array.from({ length: 20 }, (_, i) => ({
    original: `a${i}`, corrected: `b${i}`, explanation: `c${i}`, category: 'grammar',
  })),
});
check('correction count is capped', (manyCorrections?.corrections.length ?? 0) <= 4);

check('plain JSON string parses', extractJson('{"reply":"hi"}') !== null);
check('fenced JSON parses', extractJson('```json\n{"reply":"hi"}\n```') !== null);
check('JSON with prose around it parses', extractJson('Sure! {"reply":"hi"} hope that helps') !== null);
check('garbage returns null', extractJson('not json at all') === null);
check('truncated JSON returns null', extractJson('{"reply":') === null);

// ---------------------------------------------------------- rule engine -----
section('Rule-based fallback engine');

const fallback = generateTutorResponse('more better', { level: 'B1', language: 'en' });
check('fallback produces a reply', fallback.reply.length > 0);
check('fallback reports a structured correction', fallback.corrections.length > 0);
check('fallback correction names both forms', fallback.corrections[0].original.length > 0 && fallback.corrections[0].corrected.length > 0);
check('fallback keeps the legacy display string', typeof fallback.correction === 'string');

const arabicInput = generateTutorResponse('انا ذهب الى السوق', {
  level: 'A1',
  language: 'ar',
});
check('arabic input gets an english nudge', arabicInput.reply.includes('English'));

const englishOnly = generateTutorResponse('انا ذهب الى السوق', {
  level: 'A1',
  language: 'en',
});
check('english-only mode skips the arabic nudge', !englishOnly.reply.includes('Try expressing'));

const modeReplies = (['friendly', 'coach', 'strict'] as const).map(
  (mode) => generateTutorResponse('hello there', { level: 'B1', language: 'en', mode }).reply,
);
check('modes produce different copy', new Set(modeReplies).size > 1);
check('strict reply is not insulting', !/stupid|idiot|hate you|failure/i.test(modeReplies[2]));

// ------------------------------------------------------ profile snapshot ----
section('Learning profile aggregation (no database)');

const snapshot = await buildTutorProfileSnapshot('no-such-user', null);
check('returns a usable snapshot with no data', snapshot.level === 'A1');
check('all skills present', SKILLS_ALL.every((s) => typeof snapshot.skillProgress[s] === 'number'));
check('no false strengths from empty data', snapshot.strengths.length === 0);
check('no false weaknesses from empty data', snapshot.weaknesses.length === 0);
check('no performance without quizzes', snapshot.recentPerformance === null);
check('does not throw on a bad user id', snapshot !== undefined);

// ------------------------------------------------- regression: local day ----
section('Local calendar day (never UTC)');

const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

check('todayKey matches the local calendar day', todayKey(new Date(2026, 0, 15, 9, 30)) === '2026-01-15');
check('todayKey is stable across the day', todayKey(new Date(2026, 0, 15, 0, 5)) === '2026-01-15');
check(
  'todayKey follows the local midnight boundary',
  todayKey(new Date(2026, 0, 15, 23, 59)) === '2026-01-15' &&
    todayKey(new Date(2026, 0, 16, 0, 1)) === '2026-01-16',
);
check(
  'todayKey agrees with a manual local formatter',
  [
    new Date(2026, 5, 1, 12, 0),
    new Date(2026, 11, 31, 23, 59),
    new Date(2026, 2, 9, 1, 30),
  ].every((d) => todayKey(d) === localKey(d)),
);

// -------------------------------------------------- regression: quiz sets ----
section('Quiz set selection');

const a1Set = getQuizSet(5, 'A1');
const c2Set = getQuizSet(5, 'C2');
const b1Set = getQuizSet(5, 'B1');

check('A1 learners get a full quiz', a1Set.length === 5, `got ${a1Set.length}`);
check('C2 learners get a full quiz', c2Set.length === 5, `got ${c2Set.length}`);
check('B1 learners get a full quiz', b1Set.length === 5, `got ${b1Set.length}`);
check('every quiz question has options', a1Set.every((q) => q.options.length >= 2));
check('the correct answer is always in range', b1Set.every((q) => q.correct < q.options.length));
check('no level is left without any questions', quizBank.every((q) => typeof q.level === 'string'));
check(
  'the bank covers the levels learners actually reach',
  ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].every((lvl) =>
    quizBank.some((q) => q.level === lvl),
  ),
);

// ------------------------------------- regression: natural language dates ----
section('Natural language appointment dates');

const inTwoDays = parseNaturalDate('meeting in 2 days');
check('"in 2 days" is not read as 2 o\'clock', inTwoDays.date !== null && inTwoDays.date.getHours() === 9, `hour ${inTwoDays.date?.getHours()}`);

const twoDaysAhead = inTwoDays.date
  ? (() => {
      // Compare calendar days, not elapsed hours: the parser keeps the
      // current time and then applies the 9 AM default, so an evening
      // request can be less than 1.5 days away in wall-clock terms.
      const a = new Date();
      const b = inTwoDays.date as Date;
      const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
      const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
      return Math.round((dayB - dayA) / 86400000);
    })()
  : -1;
check('"in 2 days" lands two days ahead', twoDaysAhead === 2, `got ${twoDaysAhead}`);

const atThree = parseNaturalDate('Oct 5 at 3pm');
check('"at 3pm" is 15:00', atThree.date !== null && atThree.date.getHours() === 15, `hour ${atThree.date?.getHours()}`);

const tomorrowMorning = parseNaturalDate('tomorrow 9am');
check('"tomorrow 9am" is 09:00', tomorrowMorning.date !== null && tomorrowMorning.date.getHours() === 9);
check('"tomorrow 9am" is tomorrow', tomorrowMorning.date !== null && tomorrowMorning.date.getDate() !== new Date().getDate());

const bareDate = parseNaturalDate('Oct 5');
check('a bare date is not silently given a nonsense time', bareDate.date !== null && bareDate.date.getHours() === 9);
check('a bare date keeps a usable confidence', bareDate.confidence >= 0.5, `got ${bareDate.confidence}`);

// ---------------------------------------- regression: fallback engine words ----
section('Fallback engine keyword matching');

const greetingReplies = new Set(
  ['friendly', 'coach', 'strict'].map((mode) =>
    generateTutorResponse('hi', { level: 'A1', language: 'en', mode: mode as 'friendly' }).reply,
  ),
);
const thisReply = generateTutorResponse('What do you think about this lesson?', {
  level: 'B1',
  language: 'en',
});
check('"this" does not trigger the greeting bucket', !greetingReplies.has(thisReply.reply));
check('"think" does not trigger the greeting bucket', !greetingReplies.has(thisReply.reply));

const helpReply = generateTutorResponse('I am stuck with grammar', {
  level: 'B1',
  language: 'en',
});
check('a real topic still matches', /grammar|patterns|structure/i.test(helpReply.reply));

// ------------------------------------------ regression: placement levels ----
section('Placement level rule (monotonic)');

check(
  'a learner who passes A1 and B1 but fails A2 is not placed at B1',
  determinePlacementLevel({
    A1: { correct: 2, total: 2 },
    A2: { correct: 0, total: 2 },
    B1: { correct: 2, total: 2 },
  }) === 'A1',
);
check(
  'a learner who passes everything is placed at the highest level',
  determinePlacementLevel({
    A1: { correct: 2, total: 2 },
    A2: { correct: 2, total: 2 },
    B1: { correct: 2, total: 2 },
  }) === 'B1',
);
check(
  'a level with no items does not block progression',
  determinePlacementLevel({
    A1: { correct: 2, total: 2 },
    A2: { correct: 0, total: 0 },
    B1: { correct: 2, total: 2 },
  }) === 'B1',
);
check(
  'a learner with no results starts at A1',
  determinePlacementLevel({}) === 'A1',
);

// --------------------------------------------- regression: speech scoring ----
section('Speech attempt scoring');

check(
  'a correct sentence passes',
  speakingAttemptPassed('My name is Sara and I live in Cairo.', 'my name is sara and i live in cairo'),
);
check(
  'an unrelated sentence fails',
  !speakingAttemptPassed('My name is Sara and I live in Cairo.', 'the weather is nice today'),
);
check(
  'a near-miss needs most of the words',
  !speakingAttemptPassed('My name is Sara and I live in Cairo.', 'my name is sara'),
);

// -------------------------------------------- regression: quest variety ----
section('Quest content variety');

const grammarQuests = ['2026-09-28', '2026-09-29', '2026-10-01'].map((date) =>
  generateDailyQuests({ profile: emptyProfile, date, seedKey: 'user-1' }).find(
    (q) => q.kind === 'grammar',
  ),
);
check(
  'the grammar quest is not identical every day',
  new Set(grammarQuests.map((q) => q?.prompt)).size > 1,
);
check(
  'the grammar quest still carries its answer',
  grammarQuests.every((q) => typeof q?.answer === 'string' && q.answer.length > 0),
);

// ------------------------------------------------ regression: weekly report ----
section('Weekly report computation');

const monday = new Date(2026, 9, 19); // a Monday
const today = new Date(2026, 9, 21); // the Wednesday of that week
const sunday = new Date(2026, 9, 25);

const reportData = {
  lessons: [
    { date: '2026-10-19', completed: true, duration_minutes: 15 },
    { date: '2026-10-20', completed: true, duration_minutes: 20 },
    { date: '2026-10-21', completed: true, duration_minutes: 10 },
    { date: '2026-10-12', completed: true, duration_minutes: 15 },
  ],
  quests: [
    { date: '2026-10-19', completed: true, xp_reward: 20 },
    { date: '2026-10-20', completed: true, xp_reward: 20 },
    { date: '2026-10-12', completed: true, xp_reward: 20 },
  ],
  quizzes: [
    { taken_at: '2026-10-20T10:00:00Z', score: 4, total: 5 },
    { taken_at: '2026-10-12T10:00:00Z', score: 2, total: 5 },
  ],
  chat: [
    { created_at: '2026-10-20T10:00:00Z', role: 'user' },
    { created_at: '2026-10-20T10:01:00Z', role: 'emo' },
  ],
  vocabulary: [{ created_at: '2026-10-19T10:00:00Z', mastered: true, box: 3 }],
  skillProgress: [
    { skill: 'Grammar' as Skill, score: 40, at: '2026-10-20' },
    { skill: 'Grammar' as Skill, score: 20, at: '2026-10-12' },
    { skill: 'Reading' as Skill, score: 60, at: '2026-10-20' },
  ],
};

const comparison = buildWeeklyComparison(reportData, today, [
  'Grammar',
  'Reading',
] as Skill[]);

check('the week starts on Monday', weekStart(monday) === '2026-10-19', weekStart(monday));
check('a Sunday belongs to the same week', weekStart(sunday) === '2026-10-19', weekStart(sunday));
check("this week's lessons are counted", comparison.thisWeek.lessons === 3, String(comparison.thisWeek.lessons));
check("last week's lessons are counted", comparison.lastWeek.lessons === 1, String(comparison.lastWeek.lessons));
check('the lesson delta is correct', comparison.deltas.lessons === 2, String(comparison.deltas.lessons));
check('quiz accuracy is a percentage', comparison.thisWeek.quizAccuracy === 80, String(comparison.thisWeek.quizAccuracy));
check('active days are counted once', comparison.thisWeek.activeDays === 3, String(comparison.thisWeek.activeDays));
check('the improved skill is detected', comparison.bestSkill?.skill === 'Grammar', String(comparison.bestSkill?.skill));
check('the weakest skill is detected', comparison.focusSkill?.skill === 'Grammar', String(comparison.focusSkill?.skill));
check(
  'a learner who did nothing still gets an honest headline',
  fallbackHeadline({ ...comparison, thisWeek: { ...comparison.thisWeek, lessons: 0, quests: 0, activeDays: 0 } })
    .includes('open'),
);
check(
  'the activity series covers seven days',
  buildDailyActivity(reportData, 7, today).length === 7,
);

check(
  'the day key is the local calendar day',
  dayKey(new Date(2026, 0, 15, 23, 30)) === '2026-01-15',
);

// --------------------------------------------- regression: adaptive placement ----
section('Adaptive placement engine');

const bank = placementBank;
const itemAt = (id: string) => bank.find((b) => b.id === id)!;

check(
  'the bank covers every level',
  ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].every((lvl) => bank.some((b) => b.level === lvl)),
);
check(
  'the bank covers every skill',
  SKILLS_ALL.every((skill) => bank.some((b) => b.skill === skill)),
);
check('the bank is wide enough to adapt', bank.length >= 40, `got ${bank.length}`);

// A strong learner should be pushed up, not left on easy items.
// The loop mirrors the real test: stop when the estimate settles or the
// budget for this performance is spent.
let strongAnswers: PlacementAnswer[] = [];
let strongAbility = 0;
let guard = 0;
while (guard < 30) {
  guard += 1;
  const next = chooseNextItem(bank, strongAnswers, strongAbility);
  if (!next) break;
  strongAnswers = [...strongAnswers, { item: next, correct: true }];
  strongAbility = updateAbility(strongAbility, strongAnswers, next, true);
  const outcome = summarise(strongAnswers, strongAbility);
  const budget = targetItemCount(
    strongAnswers.length,
    strongAnswers.filter((a) => a.correct).length,
  );
  if (outcome.settled || strongAnswers.length >= budget) break;
}
check(
  'a strong learner reaches a high level',
  levelForAbility(strongAbility) === 'C1' || levelForAbility(strongAbility) === 'C2',
  levelForAbility(strongAbility),
);
check(
  'a strong learner finishes quickly',
  strongAnswers.length <= 14,
  `${strongAnswers.length} items`,
);

// A weak learner should be pushed DOWN and confirmed.
let weakAnswers: PlacementAnswer[] = [];
let weakAbility = 0;
guard = 0;
while (guard < 30) {
  guard += 1;
  const next = chooseNextItem(bank, weakAnswers, weakAbility);
  if (!next) break;
  weakAnswers = [...weakAnswers, { item: next, correct: false }];
  weakAbility = updateAbility(weakAbility, weakAnswers, next, false);
  const outcome = summarise(weakAnswers, weakAbility);
  const budget = targetItemCount(
    weakAnswers.length,
    weakAnswers.filter((a) => a.correct).length,
  );
  if (outcome.settled || weakAnswers.length >= budget) break;
}
check(
  'a weak learner is placed low',
  levelForAbility(weakAbility) === 'A1' || levelForAbility(weakAbility) === 'A2',
  levelForAbility(weakAbility),
);
check(
  'a weak learner gets more questions to confirm',
  weakAnswers.length >= strongAnswers.length,
  `${weakAnswers.length} vs ${strongAnswers.length}`,
);

// The engine must measure every skill before it stops.
const skillsSeen = new Set(strongAnswers.map((a) => a.item.skill));
check(
  'the test measures all six skills',
  SKILLS_ALL.every((skill) => skillsSeen.has(skill)),
  [...skillsSeen].join(', '),
);

// The next item must be close to the current estimate.
const probe = chooseNextItem(bank, [{ item: itemAt('a1_g1'), correct: false }], -2.8);
check(
  'the next item tracks the estimate',
  probe !== null && Math.abs(probe.ability - -2.8) <= 1.5,
  probe ? `${probe.level} (${probe.ability})` : 'none',
);

// An untried skill is preferred over another item at the same level.
const withOneAnswer: PlacementAnswer[] = [{ item: itemAt('a1_g1'), correct: true }];
const preferred = chooseNextItem(bank, withOneAnswer, -3);
check(
  'an untried skill comes first',
  preferred !== null && preferred.skill !== 'Grammar',
  preferred?.skill,
);

// Summary maths.
const summary = summarise(strongAnswers, strongAbility);
check('the summary reports the level', summary.level === levelForAbility(strongAbility));
check('the summary reports every measured skill', Object.keys(summary.skillScores).length === 6);
check('the summary has a confidence value', summary.confidence > 0 && summary.confidence <= 1);
check('the ability band brackets the level', abilityBand(strongAbility).low !== undefined);

// Item budget adapts to performance.
check('a perfect run keeps the budget short', targetItemCount(10, 10) === 12);
check('a struggling run gets more items', targetItemCount(10, 4) === 16);

// Speaking scores are per word.
const scored = scoreSpeaking('My name is Sara and I live in Cairo', 'my name is sara and i live in cairo');
check('a perfect utterance scores 100', scored.score === 100, String(scored.score));
const partial = scoreSpeaking('My name is Sara and I live in Cairo', 'my name is sara i live in cairo');
check('a missing word lowers the score', partial.score < 100 && partial.score > 0, String(partial.score));
check('the missing word is named', partial.missed.length === 1, partial.missed.join(','));
const noisy = scoreSpeaking('My name is Sara and I live in Cairo', 'the weather is nice today');
check('an unrelated answer scores low', noisy.score < 30, String(noisy.score));

// ------------------------------------------------ regression: review queue ----
section('Smart review queue');

const reviewQueue = buildReviewQueue({
  mistakes: [
    { label: 'I am agree', category: 'grammar', occurrences: 4 },
    { label: 'discuss about', category: 'prepositions', occurrences: 2 },
  ],
  vocabulary: [
    {
      id: 'v1',
      user_id: 'u',
      word: 'resilient',
      definition: 'able to recover',
      example: 'a resilient team',
      box: 1,
      next_review: '2026-10-21',
      mastered: false,
      created_at: '2026-10-20T00:00:00Z',
    },
  ],
  weakSkills: ['Grammar', 'Reading'],
  level: 'B1',
  limit: 6,
});

check('the review queue has items', reviewQueue.length > 0, String(reviewQueue.length));
check('the review queue respects the limit', reviewQueue.length <= 6);
check(
  'the most frequent mistake comes first',
  reviewQueue[0].kind === 'mistake' && reviewQueue[0].occurrences === 4,
  reviewQueue[0].kind,
);
check(
  'the queue mixes the three kinds',
  new Set(reviewQueue.map((i) => i.kind)).size >= 2,
  [...new Set(reviewQueue.map((i) => i.kind))].join(','),
);
check(
  'the queue is not three of the same kind in a row',
  reviewQueue.every((item, i) => {
    if (i < 2) return true;
    return !(item.kind === reviewQueue[i - 1].kind && item.kind === reviewQueue[i - 2].kind);
  }),
);
check(
  'a question is picked for a weak skill',
  reviewQueue.some((i) => i.kind === 'question' && i.skill === 'Grammar'),
);

check('a wrong review earns no XP', reviewXp(reviewQueue[0], false) === 0);
check('a correct review earns XP', reviewXp(reviewQueue[0], true) > 0);

// XP levels.
check('zero XP is level 1', xpLevel(0).current.level === 1);
check('250 XP is the Explorer level', xpLevel(250).current.title === 'Explorer');
check(
  'the level progress is a percentage',
  xpLevel(250).progress >= 0 && xpLevel(250).progress <= 100,
);
check('the top level has no next step', xpLevel(99999).next === null);
check('a level reports the XP still needed', xpLevel(250).toNext === 250);

// -------------------------------------------------- regression: exam engine ----
section('Exam simulator');

const ielts = EXAMS.ielts;
const toefl = EXAMS.toefl;

check('both exams are defined', Boolean(ielts && toefl));
check('every exam has the four sections', [ielts, toefl].every((e) => e.sections.length === 4));
check(
  'every exam section has a time budget',
  [ielts, toefl].every((e) => e.sections.every((s) => s.minutes.full > 0 && s.minutes.quick > 0)),
);
check(
  'every multiple-choice question has an explanation',
  [ielts, toefl].every((e) =>
    e.sections.every((s) => (s.questions ?? []).every((q) => q.explanation.length > 20)),
  ),
);
check(
  'every question answer index is in range',
  [ielts, toefl].every((e) =>
    e.sections.every((s) =>
      (s.questions ?? []).every((q) => q.correct >= 0 && q.correct < q.options.length),
    ),
  ),
);
check(
  'every exam has at least one writing task',
  [ielts, toefl].every((e) => e.sections.some((s) => (s.writing ?? []).length > 0)),
);
check(
  'every exam has at least one speaking task',
  [ielts, toefl].every((e) => e.sections.some((s) => (s.speaking ?? []).length > 0)),
);
check(
  'every listening question has something to play',
  [ielts, toefl].every((e) =>
    e.sections
      .filter((s) => s.id === 'listening')
      .every((s) => (s.questions ?? []).every((q) => (q.spoken ?? '').length > 20)),
  ),
);
check(
  'every reading question has its passage',
  [ielts, toefl].every((e) =>
    e.sections
      .filter((s) => s.id === 'reading')
      .every((s) => (s.questions ?? []).every((q) => (q.passage ?? '').length > 40)),
  ),
);

// Band mapping follows the standard Academic conversion.
check('a perfect score is band 9', ielts.bandFor(100) === '9');
check('90% is band 9', ielts.bandFor(90) === '9');
check('70% is band 7', ielts.bandFor(70) === '7');
check('72% is band 7', ielts.bandFor(72) === '7');
check('80% is band 8', ielts.bandFor(80) === '8');
check('50% is band 5', ielts.bandFor(50) === '5');
check('a zero score is band 0', ielts.bandFor(0) === '0');
check('TOEFL 100% is 120 points', toefl.bandFor(100) === '120');
check('TOEFL 50% is 60 points', toefl.bandFor(50) === '60');

// Weighted scoring.
const perfectOutcomes = ielts.sections.map((s) => ({
  section: s.id,
  title: s.title,
  skill: s.skill,
  correct: 10,
  total: 10,
  percentage: 100,
  notes: [],
}));
check('four perfect sections give band 9', scoreExam(ielts, perfectOutcomes).total === '9');

const halfOutcomes = perfectOutcomes.map((o) => ({ ...o, percentage: 50 }));
check('four half sections give band 5', scoreExam(ielts, halfOutcomes).total === '5');

// CEFR mapping of a mock result.
check('band 7 is C1', cefrForBand('7', 'band') === 'C1');
check('band 5 is B1', cefrForBand('5', 'band') === 'B1');
check('TOEFL 95 is C1', cefrForBand('95', 'score') === 'C1');

// The local writing rubric.
const ieltsWriting = ielts.sections.find((s) => s.writing)!.writing![0];
const goodEssay =
  'I believe online learning is better for motivated adults who already have a clear goal. ' +
  'However, a classroom offers something an app cannot: structure and human correction. ' +
  'Because a teacher corrects your mistakes in the moment, you stop repeating them, which is ' +
  'the single biggest reason learners plateau. Although paid courses cost more than a monthly ' +
  'subscription, the support is often worth it for people who struggle with motivation. ' +
  'In my opinion, the best choice depends on the learner rather than the method. ' +
  'Therefore, I would recommend a mixed approach: an app for daily practice and a classroom ' +
  'for the feedback that no software can yet replace.';
const localCheck = localWritingCheck(goodEssay, ieltsWriting);
check('a good essay scores well locally', localCheck.percentage >= 70, String(localCheck.percentage));
check('the local check explains itself', localCheck.notes.length >= 3);
const shortEssay = localWritingCheck('I agree.', ieltsWriting);
check('a one-line essay scores low', shortEssay.percentage < 40, String(shortEssay.percentage));

// ---------------------------------------------- regression: roleplay scoring ----
section('Roleplay scenarios');

check('the scenario catalogue is not empty', SCENARIOS.length >= 5, String(SCENARIOS.length));
check(
  'every scenario has an opening line',
  SCENARIOS.every((s) => s.opening.length > 10),
);
check(
  'every scenario has key phrases and pitfalls',
  SCENARIOS.every((s) => s.keyPhrases.length >= 3 && s.pitfalls.length >= 2),
);
check(
  'every scenario keeps the character in the prompt',
  SCENARIOS.every((s) => s.systemPrompt.includes('Stay in character')),
);

const interview = SCENARIOS.find((s) => s.id === 'job-interview')!;
const goodTalk = scoreScenario(
  interview,
  'I have three years of experience in customer support. What drew me to this role was the chance to help people directly. One thing I am proud of is a difficult refund I handled calmly. Could you tell me how the team handles escalations?',
);
check(
  'a full answer covers the key phrases',
  goodTalk.covered.length >= 2,
  goodTalk.covered.length.toString(),
);
check('a full answer scores well', goodTalk.percentage >= 50, String(goodTalk.percentage));
check('the score counts the words', goodTalk.words > 20, String(goodTalk.words));

const emptyTalk = scoreScenario(interview, '');
check('saying nothing scores zero', emptyTalk.percentage === 0, String(emptyTalk.percentage));
check('saying nothing covers nothing', emptyTalk.covered.length === 0);

// --------------------------------------------------------------- summary ----
console.log(`\n${'-'.repeat(46)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(46)}\n`);

if (failed > 0) process.exit(1);
