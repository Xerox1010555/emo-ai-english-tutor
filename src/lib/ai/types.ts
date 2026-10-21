import type { CEFRLevel, Skill } from '@/lib/types';

export type AssistantMode = 'friendly' | 'coach' | 'strict';

export const ASSISTANT_MODES: AssistantMode[] = ['friendly', 'coach', 'strict'];

export type AiProviderId = 'supabase-edge' | 'http-proxy' | 'offline-engine';

export type ReplySource = 'llm' | 'offline-engine';

export interface TutorTurn {
  role: 'user' | 'assistant';
  content: string;
}

export type MistakeCategory =
  | 'grammar'
  | 'tense'
  | 'vocabulary'
  | 'spelling'
  | 'articles'
  | 'prepositions'
  | 'punctuation'
  | 'word-order'
  | 'register'
  | 'other';

export interface AiCorrection {
  original: string;
  corrected: string;
  explanation: string;
  category: MistakeCategory;
}

/**
 * Mood is a *hint* derived from surface cues in the learner's message, never a
 * psychological claim. The prompt layer is told to treat it as advisory only.
 */
export type DetectedMood = 'confident' | 'unsure' | 'frustrated' | 'curious' | 'neutral';

export interface AiReply {
  reply: string;
  corrections: AiCorrection[];
  followUpQuestion: string | null;
  mood: DetectedMood;
  targetSkill: Skill;
  languageMix: 'en' | 'ar-mix' | 'ar';
  source: ReplySource;
  provider: AiProviderId;
  model?: string;
  /** Set when the LLM path failed and the offline engine produced the reply. */
  fallbackReason?: AiFailureReason;
}

export type AiFailureReason =
  | 'not-configured'
  | 'network'
  | 'timeout'
  | 'rate-limit'
  | 'unauthorized'
  | 'server'
  | 'invalid-response'
  | 'empty-response'
  | 'cancelled'
  | 'unknown';

export class AiRequestError extends Error {
  readonly reason: AiFailureReason;
  readonly retryable: boolean;

  constructor(reason: AiFailureReason, message: string, retryable = true) {
    super(message);
    this.name = 'AiRequestError';
    this.reason = reason;
    this.retryable = retryable;
  }
}

export interface AiRequest {
  message: string;
  history: TutorTurn[];
  profile: TutorProfileSnapshot;
  mode: AssistantMode;
  /** Current lesson / quest context, when the learner is inside one. */
  focus?: { skill: Skill; title: string } | null;
  /**
   * Replaces the default personality prompt. Used by the exam grader and the
   * roleplay scenarios, which need a different system role from the tutor.
   */
  systemPrompt?: string;
}

export interface AiResponsePayload {
  reply: string;
  corrections: AiCorrection[];
  followUpQuestion: string | null;
  mood: DetectedMood;
  targetSkill: Skill;
  languageMix: 'en' | 'ar-mix' | 'ar';
}

export interface LearningSignal {
  label: string;
  category: string;
  weight: number;
}

/** Everything the prompt layer is allowed to know about the learner. */
export interface TutorProfileSnapshot {
  level: CEFRLevel;
  targetLevel: CEFRLevel;
  preferredLanguage: 'ar' | 'en';
  goals: string[];
  strengths: Skill[];
  weaknesses: Skill[];
  skillProgress: Record<Skill, number>;
  recurringMistakes: LearningSignal[];
  learningStreak: number;
  completedLessons: number;
  completedQuests: number;
  recentPerformance: number | null;
  xp: number;
}

export const emptyProfileSnapshot = (): TutorProfileSnapshot => ({
  level: 'A1',
  targetLevel: 'B2',
  preferredLanguage: 'ar',
  goals: [],
  strengths: [],
  weaknesses: [],
  skillProgress: {
    Grammar: 0,
    Vocabulary: 0,
    Listening: 0,
    Speaking: 0,
    Writing: 0,
    Reading: 0,
  },
  recurringMistakes: [],
  learningStreak: 0,
  completedLessons: 0,
  completedQuests: 0,
  recentPerformance: null,
  xp: 0,
});
