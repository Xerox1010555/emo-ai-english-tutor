import type { CEFRLevel } from './types';
import type { AssistantMode } from './ai/types';

export interface StructuredCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface TutorResponse {
  reply: string;
  /** Retained as a display string for backwards compatibility. */
  correction: string | null;
  /** Structured form, used by the AI layer to feed the learning profile. */
  corrections: StructuredCorrection[];
}

interface GrammarRule {
  pattern: RegExp;
  correction: string;
  explanation: string;
}

const grammarRules: GrammarRule[] = [
  {
    pattern: /\bi am agree\b/gi,
    correction: 'I agree',
    explanation: '"Agree" is a verb, not an adjective. Say "I agree" — no "am" needed.',
  },
  {
    pattern: /\bmore better\b/gi,
    correction: 'better',
    explanation: '"Better" is already comparative. Don\'t add "more".',
  },
  {
    pattern: /\bmore easier\b/gi,
    correction: 'easier',
    explanation: '"Easier" is already comparative. Don\'t add "more".',
  },
  {
    pattern: /\bi have 20 years\b/gi,
    correction: 'I am 20 years old',
    explanation: 'In English we say "I am [age] years old", not "I have [age] years".',
  },
  {
    pattern: /\bchilds\b/gi,
    correction: 'children',
    explanation: 'The plural of "child" is "children", not "childs".',
  },
  {
    pattern: /\bpeoples\b/gi,
    correction: 'people',
    explanation: '"People" is already plural. The plural of "person" is "people".',
  },
  {
    pattern: /\bin the morning of\b/gi,
    correction: 'on the morning of',
    explanation: 'Use "on" with specific mornings (on Monday morning), "in" with mornings in general.',
  },
  {
    pattern: /\bdiscuss about\b/gi,
    correction: 'discuss',
    explanation: '"Discuss" doesn\'t take "about". Say "discuss something" or "talk about something".',
  },
  {
    pattern: /\brepeat again\b/gi,
    correction: 'repeat',
    explanation: '"Repeat" already means "say again", so "repeat again" is redundant.',
  },
  {
    pattern: /\bi want that you\b/gi,
    correction: 'I want you to',
    explanation: 'Use "I want you to + verb", not "I want that you + verb".',
  },
  {
    pattern: /\bsince long time\b/gi,
    correction: 'for a long time',
    explanation: 'Use "for" with a duration (for a long time) and "since" with a point in time.',
  },
  {
    pattern: /\bdepend of\b/gi,
    correction: 'depend on',
    explanation: 'The correct preposition is "depend on", not "depend of".',
  },
  {
    pattern: /\blisten music\b/gi,
    correction: 'listen to music',
    explanation: '"Listen" requires "to" before the object: listen to music.',
  },
  {
    pattern: /\bborrow me\b/gi,
    correction: 'lend me',
    explanation: '"Borrow" means to take; "lend" means to give. "Lend me" is correct when someone gives you something.',
  },
  {
    pattern: /\bmake a photo\b/gi,
    correction: 'take a photo',
    explanation: 'In English we "take" photos, not "make" photos.',
  },
  {
    pattern: /\bi am boring\b/gi,
    correction: 'I am bored',
    explanation: '"Boring" describes something that causes boredom. "Bored" describes how you feel.',
  },
  {
    pattern: /\bi have visited london last year\b/gi,
    correction: 'I visited London last year',
    explanation: 'Use Past Simple (not Present Perfect) with finished time references like "last year".',
  },
];

function findCorrections(text: string): { original: string; corrected: string; explanation: string }[] {
  const corrections: { original: string; corrected: string; explanation: string }[] = [];
  for (const rule of grammarRules) {
    const match = text.match(rule.pattern);
    if (match) {
      corrections.push({
        original: match[0],
        corrected: rule.correction,
        explanation: rule.explanation,
      });
    }
  }
  return corrections;
}

function correctText(text: string): string {
  let result = text;
  for (const rule of grammarRules) {
    result = result.replace(rule.pattern, rule.correction);
  }
  return result;
}

const topicResponses: { keywords: string[]; response: string }[] = [
  {
    keywords: ['help', 'stuck', 'difficult', 'hard', 'struggle'],
    response: 'Let\'s break it down. Tell me specifically what you find challenging — a grammar point, a word, or a whole sentence. We\'ll take it one piece at a time.',
  },
  {
    keywords: ['grammar', 'tense', 'verb', 'sentence'],
    response: 'Grammar is about patterns. Pick a structure you want to master — present perfect, conditionals, articles — and I\'ll give you a focused exercise with examples.',
  },
  {
    keywords: ['vocab', 'word', 'vocabulary', 'phrase'],
    response: 'Vocabulary sticks when you use it. Tell me a topic that interests you, and I\'ll give you five words with examples you can start using today.',
  },
  {
    keywords: ['speaking', 'speak', 'talk', 'conversation', 'pronunciation'],
    response: 'Speaking improves with practice. Try describing what you see around you right now in English. Use the voice button — I\'ll listen and give you feedback.',
  },
  {
    keywords: ['listening', 'listen', 'understand', 'accent'],
    response: 'Listening sharpens with exposure. Try this: I\'ll say a sentence, and you repeat it. We\'ll start simple and build up. Ready?',
  },
  {
    keywords: ['writing', 'write', 'email', 'essay'],
    response: 'Writing is thinking on paper. Try writing three sentences about something you did today. I\'ll review them for clarity and correctness.',
  },
  {
    keywords: ['test', 'exam', 'ielts', 'toefl', 'prepare'],
    response: 'Exam preparation needs strategy. Tell me which exam and your target score. I\'ll map the skills you need to strengthen and we\'ll work through them systematically.',
  },
  {
    keywords: ['level', 'progress', 'improve', 'better'],
    response: 'Progress compounds with consistency. Your plan adjusts based on daily performance. Keep completing lessons and quizzes — the data tells us where to focus next.',
  },
  {
    keywords: ['plan', 'schedule', 'study', 'routine'],
    response: 'A good study routine has three parts: review (spaced repetition), new input (a lesson), and output (writing or speaking). Your daily lesson covers all three. Consistency matters more than intensity.',
  },
  {
    keywords: ['hello', 'hi', 'hey', 'salam', 'salaam'],
    response: '__GREETING__',
  },
  {
    keywords: ['thank', 'thanks', 'shukran'],
    response: 'You\'re welcome. Ready for the next step?',
  },
];

/**
 * Matches a topic by whole word only.
 *
 * A plain `includes` made "this", "think" and "which" trigger the greeting
 * bucket, because they all contain "hi". Short keywords are matched as whole
 * words; longer ones are matched as whole words too, so "plan" does not fire on
 * "planning" but "planning" does fire on "planning".
 */
function matchTopic(text: string): string | null {
  const lower = text.toLowerCase();
  for (const topic of topicResponses) {
    if (topic.keywords.some((k) => containsWord(lower, k))) {
      return topic.response;
    }
  }
  return null;
}

/** Whole-word containment, tolerant of plurals and simple verb endings. */
function containsWord(haystack: string, needle: string): boolean {
  const n = needle.toLowerCase();
  if (n.length <= 2) {
    // Very short keywords ("hi") still need a word boundary, otherwise they
    // match inside unrelated words.
    return new RegExp(`\\b${escapeRegExp(n)}\\b`, 'i').test(haystack);
  }
  const escaped = escapeRegExp(n);
  const pattern = new RegExp(`\\b${escaped}(?:s|es|d|ed|ing)?\\b`, 'i');
  return pattern.test(haystack);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Greetings are mode-aware so the assistant's tone is consistent from the
 * first message, not just from the second one.
 */
const modeGreetings: Record<AssistantMode, string[]> = {
  friendly: [
    "I'm here. What would you like to work on?",
    "Ready when you are. What's on your mind?",
    "Let's begin. Tell me about your day in English.",
  ],
  coach: [
    "Good. Let's get straight into it — what's your weakest area right now?",
    "Ready. Give me a sentence in English and I'll work with it.",
    "Let's not waste the session. Pick a topic and start talking.",
  ],
  strict: [
    "Good. No warm-up — send me a sentence and we'll work on it.",
    "You're here. That counts. Now send me something to correct.",
    "Let's use the time you came for. What are we practising today?",
  ],
};

/**
 * Deterministic pick from a list, seeded by the user's own text. This keeps
 * the fallback engine stable for a given input (no flicker, testable) while
 * still varying between different messages.
 */
function seededPick<T>(items: T[], seed: string): T {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = Math.abs(hash) % items.length;
  return items[index];
}

const modeEncouragement: Record<AssistantMode, string[]> = {
  friendly: [
    'You\'re on the right track.',
    'That\'s a step forward.',
    'Good — keep going.',
    'Noted. Let\'s build on that.',
  ],
  coach: [
    'That works. Now do it again, faster.',
    'Correct. Don\'t coast — next one.',
    'Good. Push it one step harder.',
    'Right. Keep the standard up.',
  ],
  strict: [
    'Noted. Now do the next item — no stopping yet.',
    'Correct, but this only counts if you repeat it tomorrow.',
    'Fine. Your streak is on the line, so keep moving.',
    'Marked. I\'ll be checking whether you actually practise this.',
  ],
};

const modePrompts: Record<AssistantMode, string[]> = {
  friendly: [
    'Tell me more — in English, as best you can. I\'m listening.',
    'Say that again in one full English sentence, whenever you\'re ready.',
    'Good. Now try the same idea a different way.',
    'I understand. Let\'s practise it — rephrase that with a different structure.',
  ],
  coach: [
    'Say it again, but add a reason. One extra clause.',
    'Don\'t stop there. What happened next?',
    'Now upgrade that: use a connector like "because" or "although".',
    'Good. Now the harder version — make it a question.',
  ],
  strict: [
    'That was short. Give me three more sentences on the same topic.',
    'Answer, then justify it. "Because" is required.',
    'You stopped. Finish the thought.',
    'Now prove it with an example from your own week.',
  ],
};

export function generateTutorResponse(
  userText: string,
  context: { level: CEFRLevel; language: string; mode?: AssistantMode }
): TutorResponse {
  const mode: AssistantMode = context.mode ?? 'friendly';
  const corrections = findCorrections(userText);
  const correctionNote = corrections.length > 0
    ? `One thing to adjust: "${corrections[0].original}" → "${corrections[0].corrected}". ${corrections[0].explanation}`
    : null;

  const topicResponse = matchTopic(userText);
  const seed = `${mode}:${userText.trim()}`;
  const encourage = seededPick(modeEncouragement[mode], seed);

  let reply: string;

  if (topicResponse === '__GREETING__') {
    const greeting = seededPick(modeGreetings[mode], seed);
    reply = correctionNote ? `${correctionNote}\n\n${greeting}` : greeting;
  } else if (topicResponse) {
    reply = correctionNote ? `${correctionNote}\n\n${topicResponse}` : topicResponse;
  } else if (corrections.length > 0) {
    // User wrote a sentence with errors — correct gently and encourage
    const corrected = correctText(userText);
    reply = `${correctionNote}\n\nCorrected: "${corrected}"\n\n${encourage}`;
  } else {
    // No errors detected and no specific topic — reflective prompt
    const reflective = seededPick(modePrompts[mode], seed);
    reply = correctionNote ? `${correctionNote}\n\n${reflective}` : `${reflective} ${encourage}`;
  }

  // If user writes in Arabic and preferred language is ar, add a brief Arabic note
  if (context.language === 'ar' && /[\u0600-\u06FF]/.test(userText)) {
    reply = `Try expressing that in English — even a simple version. I'm here to help you find the words.\n\n${reply}`;
  }

  return {
    reply,
    correction: correctionNote,
    corrections: corrections.map((c) => ({
      original: c.original,
      corrected: c.corrected,
      explanation: c.explanation,
    })),
  };
}

export function getLessonIntro(level: CEFRLevel, skill: string): string {
  return `Today we're working on ${skill} at the ${level} level. Read through the material, then try using what you learn in a sentence. If something isn't clear, ask me about it in the chat.`;
}
