/**
 * Speech scoring.
 *
 * The browser's speech recognition gives us words, not pronunciation. To make
 * speaking practice useful we compare the transcript with the target at word
 * level, so the learner sees exactly WHICH word was dropped, added or
 * mangled — and how close they got overall.
 */

export interface WordScore {
  word: string;
  /** 'hit' = said correctly, 'close' = recognised but different, 'missed' = not said. */
  status: 'hit' | 'close' | 'missed' | 'extra';
  /** The word the recogniser heard, when it differs. */
  heard?: string;
}

export interface SpeakingScore {
  /** 0–100. */
  score: number;
  words: WordScore[];
  /** The words worth practising again. */
  missed: string[];
  /** 0–1 — how close the whole attempt was. */
  similarity: number;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Two words are "close" when they share a prefix of at least two letters. */
function isClose(target: string, heard: string): boolean {
  if (target === heard) return false;
  const min = Math.min(target.length, heard.length);
  if (min < 3) return false;
  let shared = 0;
  while (shared < min && target[shared] === heard[shared]) shared += 1;
  return shared >= Math.max(2, Math.floor(min * 0.6));
}

/**
 * Scores a spoken attempt against the target sentence.
 *
 * The score is recall-weighted (how much of the target was said) with a
 * penalty for extra words, so rambling does not raise the score.
 */
export function scoreSpeaking(target: string, spoken: string): SpeakingScore {
  const targetWords = tokenize(target);
  const spokenWords = tokenize(spoken);

  if (targetWords.length === 0) {
    return { score: 0, words: [], missed: [], similarity: 0 };
  }
  if (spokenWords.length === 0) {
    return {
      score: 0,
      words: targetWords.map((word) => ({ word, status: 'missed' as const })),
      missed: targetWords,
      similarity: 0,
    };
  }

  const pool = [...spokenWords];
  const words: WordScore[] = [];
  let hits = 0;

  for (const targetWord of targetWords) {
    const exactIndex = pool.indexOf(targetWord);
    if (exactIndex !== -1) {
      pool.splice(exactIndex, 1);
      words.push({ word: targetWord, status: 'hit' });
      hits += 1;
      continue;
    }

    const closeIndex = pool.findIndex((heard) => isClose(targetWord, heard));
    if (closeIndex !== -1) {
      const heard = pool[closeIndex];
      pool.splice(closeIndex, 1);
      words.push({ word: targetWord, status: 'close', heard });
      continue;
    }

    words.push({ word: targetWord, status: 'missed' });
  }

  for (const extra of pool) {
    words.push({ word: extra, status: 'extra' });
  }

  const extraPenalty = Math.min(0.2, (pool.length / targetWords.length) * 0.2);
  const similarity = Math.max(0, hits / targetWords.length - extraPenalty);
  const score = Math.round(similarity * 100);

  return {
    score,
    words,
    missed: words.filter((w) => w.status !== 'hit').map((w) => w.word),
    similarity,
  };
}

/** A spoken attempt counts as correct at 60% word recall. */
export const SPEAKING_PASS_THRESHOLD = 0.6;

export function speakingAttemptPassed(target: string, spoken: string): boolean {
  return scoreSpeaking(target, spoken).similarity >= SPEAKING_PASS_THRESHOLD;
}

/** A short, human verdict for the score. */
export function speakingVerdict(score: number): {
  label: string;
  tone: 'success' | 'warning' | 'primary';
} {
  if (score >= 85) return { label: 'Excellent — that was clear.', tone: 'success' };
  if (score >= 65) return { label: 'Good. A few words need another try.', tone: 'success' };
  if (score >= 40) return { label: 'Close. Slow down and hit every word.', tone: 'warning' };
  return { label: 'Say it again, one phrase at a time.', tone: 'primary' };
}
