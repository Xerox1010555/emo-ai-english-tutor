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
import { buildTutorProfileSnapshot } from '../src/lib/learning/profile';
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

// --------------------------------------------------------------- summary ----
console.log(`\n${'-'.repeat(46)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(46)}\n`);

if (failed > 0) process.exit(1);
