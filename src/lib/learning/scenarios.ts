import type { CEFRLevel, Skill } from '@/lib/types';

/**
 * Roleplay scenarios.
 *
 * The tutor stops being a tutor and becomes a character: an interviewer, a
 * waiter, a landlord. The learner's job is to keep the conversation going in
 * English, and the debrief afterwards shows what a stronger answer would have
 * contained.
 */

export interface Scenario {
  id: string;
  title: string;
  icon: 'briefcase' | 'utensils' | 'plane' | 'stethoscope' | 'chat' | 'shop';
  /** The level band this scenario suits. */
  level: 'A2' | 'B1' | 'B2';
  /** One line describing the situation. */
  setup: string;
  /** The character the AI plays. */
  role: string;
  /** The first thing the character says. */
  opening: string;
  /** What the learner should try to cover. */
  objectives: string[];
  /** Phrases that make the answer sound like a native speaker's. */
  keyPhrases: string[];
  /** Typical mistakes a learner makes here. */
  pitfalls: string[];
  /** The system prompt that turns the tutor into the character. */
  systemPrompt: string;
}

const BASE_RULES = `
You are playing a role in a spoken English practice session. Stay in character
at all times and speak only as the character would.

Rules:
- Reply in ENGLISH, in 1–3 short sentences, exactly like a real person speaking.
- Never break character, never explain the exercise, never give corrections.
- If the learner struggles, make it easier by rephrasing or asking a simpler
  question. Do not correct their grammar.
- If the learner says something that does not fit the situation, stay in the
  scene and gently steer back into it.
- After each reply, add nothing else. No stage directions, no translation.
`.trim();

export const SCENARIOS: Scenario[] = [
  {
    id: 'job-interview',
    title: 'Job interview',
    icon: 'briefcase',
    level: 'B2',
    setup: 'You are interviewing for a customer-support role at a software company.',
    role: 'the hiring manager',
    opening: 'Thanks for coming in. Could you start by telling me a little about yourself?',
    objectives: [
      'Give a short introduction (name, background, one relevant strength)',
      'Answer why you want the role',
      'Ask at least one question about the team',
    ],
    keyPhrases: [
      'I have X years of experience in…',
      'What drew me to this role was…',
      'One thing I\'m proud of is…',
      'Could you tell me how the team…',
    ],
    pitfalls: [
      'Giving your life story instead of a 30-second pitch',
      'Saying "I am very good at everything" without an example',
      'Never asking a question back',
    ],
    systemPrompt: `${BASE_RULES}

You are the hiring manager for a customer-support role. You are friendly but
you are assessing the candidate. Ask one question at a time, and follow up on
what they say. The session lasts about five exchanges.`,
  },
  {
    id: 'restaurant',
    title: 'Ordering at a restaurant',
    icon: 'utensils',
    level: 'A2',
    setup: 'You are at a small Italian restaurant in a busy city.',
    role: 'the waiter',
    opening: 'Good evening. Do you have a reservation?',
    objectives: [
      'Say you have no reservation (or give the time)',
      'Order a starter, a main and a drink',
      'Ask about a dish and say if you have an allergy',
    ],
    keyPhrases: [
      'I don\'t have a reservation, but is there a table?',
      'Could I have… , please?',
      'Does it contain…?',
      'I\'m allergic to…',
    ],
    pitfalls: [
      'Saying "I want" instead of "could I have"',
      'Ordering everything at once without asking',
      'Forgetting to say "please" and "thank you"',
    ],
    systemPrompt: `${BASE_RULES}

You are the waiter in a small Italian restaurant. Take the order naturally:
ask about starters, mains and drinks, mention the daily special, and confirm
the order. If the customer asks about ingredients, answer honestly.`,
  },
  {
    id: 'airport',
    title: 'Airport check-in',
    icon: 'plane',
    level: 'B1',
    setup: 'You are flying home and the airline desk needs to check your bag.',
    role: 'the check-in agent',
    opening: 'Good morning. May I see your passport and booking reference?',
    objectives: [
      'Answer the agent\'s questions',
      'Ask about baggage allowance',
      'Say your bag is overweight and ask what to do',
    ],
    keyPhrases: [
      'Here you are.',
      'How many bags am I allowed?',
      'It\'s a little over the limit — is there a fee?',
      'Could I move some of this to my hand luggage?',
    ],
    pitfalls: [
      'Not understanding weight units (kg vs lb)',
      'Saying "no" when you mean "not really"',
      'Getting annoyed instead of asking politely',
    ],
    systemPrompt: `${BASE_RULES}

You are the check-in agent. Check the booking, ask about the number of bags,
mention the allowance and the excess fee, and offer a solution.`,
  },
  {
    id: 'doctor',
    title: 'At the doctor\'s',
    icon: 'stethoscope',
    level: 'B1',
    setup: 'You have had a headache and sore throat for three days.',
    role: 'the doctor',
    opening: 'Come in and sit down. What seems to be the problem?',
    objectives: [
      'Describe your symptoms and when they started',
      'Say what you have already taken',
      'Ask what you should do next',
    ],
    keyPhrases: [
      'I\'ve had a headache since…',
      'It gets worse in the evening.',
      'I\'ve been taking…',
      'Should I be worried about…?',
    ],
    pitfalls: [
      'Saying "I am ill" and nothing more',
      'Confusing "since" and "for"',
      'Not saying how long the symptoms last',
    ],
    systemPrompt: `${BASE_RULES}

You are a doctor. Ask about the symptoms, how long they have lasted, and
whether the patient has taken anything. Give simple advice at the end.`,
  },
  {
    id: 'smalltalk',
    title: 'Small talk',
    icon: 'chat',
    level: 'A2',
    setup: 'You have just met a neighbour at a lift in your new apartment building.',
    role: 'your new neighbour',
    opening: 'Hi — is this your first time in the building?',
    objectives: [
      'Start the conversation and keep it going',
      'Ask two questions about them',
      'Say something about yourself',
    ],
    keyPhrases: [
      'Nice to meet you.',
      'How long have you lived here?',
      'What do you usually do at the weekends?',
      'I\'m new here too, actually.',
    ],
    pitfalls: [
      'One-word answers that kill the conversation',
      'Asking a question and not listening to the answer',
      'Talking only about yourself',
    ],
    systemPrompt: `${BASE_RULES}

You are a friendly neighbour. Small talk, easy questions, and you share a
little about yourself when asked. Keep the conversation going naturally.`,
  },
  {
    id: 'shop',
    title: 'Returning a purchase',
    icon: 'shop',
    level: 'B1',
    setup: 'You bought headphones last week, but they are not working properly.',
    role: 'the shop assistant',
    opening: 'Hello. Can I help you with something?',
    objectives: [
      'Explain the problem with the product',
      'Ask about the return policy',
      'Ask for a refund or a replacement',
    ],
    keyPhrases: [
      'I bought these… and they…',
      'They stopped working after…',
      'What is your returns policy?',
      'Could I exchange them for a new pair?',
    ],
    pitfalls: [
      'Not saying when you bought it',
      'Confusing "refund" and "exchange"',
      'Being vague about the fault',
    ],
    systemPrompt: `${BASE_RULES}

You are a shop assistant. Ask for the receipt, explain the return policy
(14 days, item must be in its original packaging), and offer a replacement or
a refund depending on what the customer asks for.`,
  },
];

export function scenariosForLevel(level: CEFRLevel): Scenario[] {
  const index = levelIndexFor(level);
  return SCENARIOS.filter((s) => Math.abs(scenarioIndex(s.level) - index) <= 1);
}

function scenarioIndex(level: 'A2' | 'B1' | 'B2'): number {
  return level === 'A2' ? 0 : level === 'B1' ? 1 : 2;
}

function levelIndexFor(level: CEFRLevel): number {
  switch (level) {
    case 'A1':
      return 0;
    case 'A2':
      return 0;
    case 'B1':
      return 1;
    case 'B2':
      return 2;
    case 'C1':
      return 3;
    default:
      return 3;
  }
}

/** How well the learner covered the scenario's objectives. */
export function scoreScenario(
  scenario: Scenario,
  transcript: string,
): { percentage: number; covered: string[]; missing: string[]; words: number } {
  const lower = transcript.toLowerCase();
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;

  const covered: string[] = [];
  const missing: string[] = [];

  for (const phrase of scenario.keyPhrases) {
    // Match on the first meaningful word of the phrase, so small differences
    // in wording still count.
    const stem = phrase
      .toLowerCase()
      .replace(/[…']/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)[0];
    if (!stem) continue;
    if (lower.includes(stem)) covered.push(phrase);
    else missing.push(phrase);
  }

  const phraseScore = scenario.keyPhrases.length
    ? (covered.length / scenario.keyPhrases.length) * 100
    : 0;
  // Speaking for a very short time is not a complete attempt.
  const lengthScore = Math.min(100, (words / 60) * 100);
  const percentage = Math.round(phraseScore * 0.75 + lengthScore * 0.25);

  return { percentage, covered, missing, words };
}

/**
 * A local character reply, used when no model is connected.
 *
 * It keeps the conversation moving with natural prompts instead of falling
 * back to the general rules engine, which has no idea it is playing a role.
 */
const OFFLINE_LINES = [
  'That sounds good. Could you tell me a little more about that?',
  'I see. How would that work in practice, day to day?',
  'Good point. What would you suggest we do next?',
  'Right. Let me check that for you — anything else I should know?',
  'Understood. And how would you feel about that?',
];

export function localCharacterReply(turnIndex: number): string {
  return OFFLINE_LINES[turnIndex % OFFLINE_LINES.length];
}

/** The skill a scenario mainly trains. */
export function scenarioSkill(scenario: Scenario): Skill {
  switch (scenario.icon) {
    case 'utensils':
    case 'shop':
      return 'Speaking';
    case 'briefcase':
      return 'Speaking';
    default:
      return 'Speaking';
  }
}
