import type { CEFRLevel } from '@/lib/types';

/**
 * Speech.
 *
 * The browser can speak, but out of the box it sounds robotic: it picks
 * whatever voice the OS registered first, and it reads punctuation with no
 * pauses. This module makes the voice consistent and teaches at the right
 * speed for the learner's level.
 */

const VOICE_KEY = 'emo:voice';
const SPEED_KEY = 'emo:speech-speed';

/** Voices we know sound good, best first. */
const PREFERRED_VOICE_PATTERNS = [
  /google uk english female/i,
  /google us english/i,
  /microsoft (aria|jenny|sonia|samantha)/i,
  /samantha/i,
  /karen|daniel|serena/i,
  /en[-_]GB/i,
  /en[-_]US/i,
];

export interface SpeechSettings {
  /** The voice name, or 'auto' to let the app choose. */
  voice: string;
  /** A speed multiplier applied on top of the level's pace. */
  speed: number;
}

const DEFAULT_SETTINGS: SpeechSettings = { voice: 'auto', speed: 1 };

export function loadSpeechSettings(): SpeechSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const voice = window.localStorage.getItem(VOICE_KEY) ?? 'auto';
    const speed = Number(window.localStorage.getItem(SPEED_KEY) ?? '1');
    return {
      voice,
      speed: Number.isFinite(speed) && speed > 0.4 && speed <= 2 ? speed : 1,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSpeechSettings(settings: SpeechSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOICE_KEY, settings.voice);
    window.localStorage.setItem(SPEED_KEY, String(settings.speed));
  } catch {
    // Not fatal: the settings still apply for this session.
  }
}

/** The English voices the device offers, for the picker in Settings. */
export function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'));
}

/**
 * The voice the app uses: the one the learner picked, or the best available
 * English voice.
 */
export function bestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = englishVoices();
  if (voices.length === 0) return null;

  const settings = loadSpeechSettings();
  if (settings.voice !== 'auto') {
    const chosen = voices.find((voice) => voice.name === settings.voice);
    if (chosen) return chosen;
  }

  for (const pattern of PREFERRED_VOICE_PATTERNS) {
    const match = voices.find((voice) => pattern.test(voice.name));
    if (match) return match;
  }
  return voices[0] ?? null;
}

/**
 * The pace for a level.
 *
 * A beginner needs the words separated; an advanced learner needs the natural
 * rhythm. These numbers are the difference between "I can hear every word" and
 * "this sounds like a person".
 */
export function rateForLevel(level: CEFRLevel, speed = 1): number {
  const base: Record<CEFRLevel, number> = {
    A1: 0.78,
    A2: 0.85,
    B1: 0.95,
    B2: 1,
    C1: 1.05,
    C2: 1.08,
  };
  const rate = (base[level] ?? 0.95) * speed;
  return Math.max(0.5, Math.min(1.6, rate));
}

/**
 * Speaks a line with the right voice, pace and pauses.
 *
 * The pauses matter as much as the pace: without them the learner cannot
 * hear where one clause ends and the next begins.
 */
export function speak(
  text: string,
  options: { level?: CEFRLevel; speed?: number; onEnd?: () => void } = {},
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onEnd?.();
    return;
  }
  const clean = text.trim();
  if (!clean) {
    options.onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = bestVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = 'en-US';
  }
  utterance.rate = rateForLevel(options.level ?? 'B1', options.speed ?? loadSpeechSettings().speed);
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onEnd?.();

  window.speechSynthesis.speak(utterance);
}

/** Speaks a list of lines with a pause between them. */
export function speakSequence(
  lines: string[],
  options: { level?: CEFRLevel; speed?: number; gapMs?: number } = {},
): void {
  if (lines.length === 0) return;
  const gap = options.gapMs ?? 350;
  lines.forEach((line, index) => {
    window.setTimeout(() => speak(line, options), index * gap);
  });
}

/** Stops any speech in progress. */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
