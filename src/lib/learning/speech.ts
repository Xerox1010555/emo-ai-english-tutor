/**
 * Speech helpers for the placement test.
 *
 * Kept out of the component so the comparison can be tested without a
 * browser: the learner's spoken transcript is compared against the target
 * sentence with a token-overlap score.
 */

/** Word-level overlap between a target sentence and a spoken transcript. */
export function transcriptSimilarity(target: string, spoken: string): number {
  const tokens = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const targetTokens = tokens(target);
  if (targetTokens.length === 0) return 0;

  const pool = tokens(spoken);
  let hits = 0;
  for (const token of targetTokens) {
    const index = pool.indexOf(token);
    if (index !== -1) {
      hits += 1;
      pool.splice(index, 1);
    }
  }
  return hits / targetTokens.length;
}

/** A spoken attempt counts as correct at 60% word recall. */
export const SPEAKING_PASS_THRESHOLD = 0.6;

export function speakingAttemptPassed(target: string, spoken: string): boolean {
  return transcriptSimilarity(target, spoken) >= SPEAKING_PASS_THRESHOLD;
}
