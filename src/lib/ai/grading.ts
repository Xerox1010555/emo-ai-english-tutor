import { supabase } from '@/lib/supabase';
import { askTutor } from './client';
import { emptyProfileSnapshot, type AssistantMode } from './types';
import type { WritingTask } from '@/lib/learning/exams';

/**
 * Band grading for a written answer.
 *
 * The tutor model grades against the same descriptors the real exam uses. When
 * no model is connected the caller falls back to a local checklist — and says
 * so, because a self-check is not a band.
 */

export interface WritingGrade {
  band: string;
  percentage: number;
  feedback: string;
  corrections: { original: string; corrected: string; explanation: string }[];
  /** True when the grade came from the model, false for the local checklist. */
  fromModel: boolean;
}

const BAND_DESCRIPTORS = `
You are an IELTS/TOEFL writing examiner. You mark one essay against the public
band descriptors and you are strict but fair.

Respond ONLY with a JSON object:
{
  "band": "number between 0 and 9 with one decimal (5.0, 6.5 …)",
  "percentage": "integer 0-100",
  "feedback": "3-5 sentences: what the answer does well, the single biggest weakness, and the one change that would raise the band",
  "corrections": [
    { "original": "the exact phrase from the essay", "corrected": "the improved version", "explanation": "one sentence on why" }
  ]
}

Mark against these criteria:
- Task response: answers every part of the prompt, develops the idea with examples.
- Coherence: paragraphs have one clear idea each, ideas are linked.
- Lexical resource: range, precision, avoids repetition.
- Grammatical range: variety of structures, accuracy.
- The band must be honest. A competent B2 essay is not a 7.5.
`.trim();

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* fall through */
    }
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export async function gradeWriting(
  essay: string,
  task: WritingTask,
  level: string,
  mode: AssistantMode = 'coach',
): Promise<WritingGrade | null> {
  const userMessage = [
    `Task: ${task.prompt}`,
    `Required length: at least ${task.minWords} words.`,
    `What a strong answer contains: ${task.successCriteria.join('; ')}.`,
    '',
    'Essay:',
    essay,
  ].join('\n');

  try {
    const { reply } = await askTutor(
      {
        message: userMessage,
        history: [],
        profile: emptyProfileSnapshot(),
        mode,
        focus: { skill: 'Writing', title: task.prompt.slice(0, 60) },
      },
      { skipCache: true, systemPrompt: BAND_DESCRIPTORS },
    );

    const parsed = extractJson(reply.reply);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const data = parsed as Record<string, unknown>;

    const band = typeof data.band === 'number' ? data.band : Number(data.band);
    if (!Number.isFinite(band)) return null;

    const corrections = Array.isArray(data.corrections)
      ? data.corrections
          .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
          .slice(0, 6)
          .map((c) => ({
            original: String(c.original ?? ''),
            corrected: String(c.corrected ?? ''),
            explanation: String(c.explanation ?? ''),
          }))
          .filter((c) => c.original && c.corrected)
      : [];

    return {
      band: band.toFixed(1),
      percentage:
        typeof data.percentage === 'number' ? data.percentage : Math.round((band / 9) * 100),
      feedback: String(data.feedback ?? '').trim(),
      corrections,
      fromModel: true,
    };
  } catch {
    return null;
  }
}

/** Saves a finished mock so the learner can look back at it. */
export async function saveExamResult(result: {
  examId: string;
  examTitle: string;
  mode: string;
  total: string;
  maxScore: number;
  sections: unknown[];
  durationSeconds: number;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  await supabase.from('exam_results').insert({
    user_id: userId,
    exam_id: result.examId,
    exam_title: result.examTitle,
    mode: result.mode,
    total_score: Number(result.total) || 0,
    max_score: result.maxScore,
    band: String(result.total),
    sections: result.sections,
    duration_seconds: result.durationSeconds,
  });
}
