import { useEffect, useMemo, useRef, useState } from 'react';
import {
  determinePlacementLevel,
  placementQuestions,
  type PlacementQuestion,
} from '@/lib/placementData';
import { speakingAttemptPassed } from '@/lib/learning/speech';
import type { CEFRLevel, Skill } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Check, GraduationCap, ChevronRight, Mic, Play, PenLine, Volume2 } from 'lucide-react';

interface PlacementTestProps {
  onComplete: (results: {
    level: CEFRLevel;
    /** Only the skills that were actually measured. */
    skillScores: Partial<Record<Skill, number>>;
  }) => void;
}

const levelOrder: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function PlacementTest({ onComplete }: PlacementTestProps) {
  const questions: PlacementQuestion[] = placementQuestions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<{ correct: boolean }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [written, setWritten] = useState('');
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const currentQuestion = questions[currentIndex];
  const type = currentQuestion.type ?? 'mcq';

  const capabilities = useMemo(
    () => ({
      tts: typeof window !== 'undefined' && 'speechSynthesis' in window,
      stt:
        typeof window !== 'undefined' &&
        Boolean(
          (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ??
            (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
        ),
    }),
    [],
  );

  // A listening item needs speech synthesis; a speaking item needs recognition.
  // When the browser cannot do it, the item is skipped instead of counted wrong.
  const isSkippable =
    (type === 'listening' && !capabilities.tts) || (type === 'speaking' && !capabilities.stt);

  useEffect(() => {
    setSelected(null);
    setWritten('');
    setTranscript('');
    setVoiceError(null);
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  const progress = (currentIndex / questions.length) * 100;

  function playSentence(text: string) {
    if (!capabilities.tts) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    utterance.onstart = () => setListening(true);
    utterance.onend = () => setListening(false);
    utterance.onerror = () => setListening(false);
    window.speechSynthesis.speak(utterance);
  }

  function startRecording() {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    if (!SR) {
      setVoiceError('Voice input is not available in this browser.');
      return;
    }
    try {
      const recognition = new SR();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
        setRecording(false);
      };
      recognition.onerror = () => {
        setRecording(false);
        setVoiceError('Could not hear you. Try again, or skip this one.');
      };
      recognition.onend = () => setRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
      setVoiceError(null);
    } catch {
      setRecording(false);
      setVoiceError('Could not start the microphone.');
    }
  }

  function evaluateCurrent(): boolean {
    if (isSkippable) return false;

    if (type === 'writing') {
      const words = written.trim().split(/\s+/).filter(Boolean);
      const minWords = currentQuestion.minWords ?? 5;
      const hasKeyword = currentQuestion.keyword
        ? written.toLowerCase().includes(currentQuestion.keyword.toLowerCase())
        : true;
      return words.length >= minWords && hasKeyword;
    }

    if (type === 'speaking') {
      if (!transcript.trim()) return false;
      const target = currentQuestion.target ?? '';
      return speakingAttemptPassed(target, transcript);
    }

    // MCQ and listening
    if (selected === null) return false;
    return selected === currentQuestion.correct;
  }

  function handleNext() {
    const needsAnswer =
      !isSkippable && (type === 'writing' || type === 'speaking' || selected !== null);
    if (needsAnswer && !isSkippable && type === 'mcq' && selected === null) return;
    if (needsAnswer && type === 'writing' && written.trim().length === 0) return;
    if (needsAnswer && type === 'speaking' && transcript.trim().length === 0) return;

    const correct = evaluateCurrent();
    const nextOutcomes = [...outcomes, { correct }];
    setOutcomes(nextOutcomes);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      return;
    }

    // ---- Results --------------------------------------------------------
    const skillCorrect: Record<string, number> = {};
    const skillTotal: Record<string, number> = {};
    const levelCorrect: Record<string, number> = {};
    const levelTotal: Record<string, number> = {};

    nextOutcomes.forEach((outcome, i) => {
      const q = questions[i];
      if (isSkippableItem(q)) return;
      skillCorrect[q.skill] = (skillCorrect[q.skill] ?? 0) + (outcome.correct ? 1 : 0);
      skillTotal[q.skill] = (skillTotal[q.skill] ?? 0) + 1;
      levelCorrect[q.level] = (levelCorrect[q.level] ?? 0) + (outcome.correct ? 1 : 0);
      levelTotal[q.level] = (levelTotal[q.level] ?? 0) + 1;
    });

    // Monotonic level: walk up from A1 and stop at the first level the learner
    // fails. The old rule let a learner who passed B1 but failed A2 be placed
    // at B1, skipping a level.
    const levelPerformance: Partial<
      Record<CEFRLevel, { correct: number; total: number }>
    > = {};
    for (const level of levelOrder) {
      const total = levelTotal[level] ?? 0;
      if (total === 0) continue;
      levelPerformance[level] = { correct: levelCorrect[level] ?? 0, total };
    }
    const determinedLevel = determinePlacementLevel(levelPerformance);

    const skillScores: Partial<Record<Skill, number>> = {};
    for (const skill of Object.keys(skillTotal) as Skill[]) {
      skillScores[skill] = Math.round(((skillCorrect[skill] ?? 0) / skillTotal[skill]) * 100);
    }

    onComplete({ level: determinedLevel, skillScores });
  }

  const canContinue =
    isSkippable ||
    (type === 'writing'
      ? written.trim().length > 0
      : type === 'speaking'
        ? transcript.trim().length > 0
        : selected !== null);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 animate-fade-down">
          <div className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Placement Test</h1>
            <p className="text-xs text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div key={currentIndex} className="flex-1 animate-fade-up">
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <span className="inline-block px-2.5 py-1 rounded-md bg-white/[0.05] text-xs font-medium text-gray-400">
              {currentQuestion.skill} · {currentQuestion.level}
            </span>
            {type !== 'mcq' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-500/10 text-[11px] font-medium text-primary-400">
                {type === 'listening' ? (
                  <>
                    <Volume2 className="w-3 h-3" /> Listening
                  </>
                ) : type === 'speaking' ? (
                  <>
                    <Mic className="w-3 h-3" /> Speaking
                  </>
                ) : (
                  <>
                    <PenLine className="w-3 h-3" /> Writing
                  </>
                )}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-6 leading-snug font-sans">
            {currentQuestion.question}
          </h2>

          {/* Listening: play the sentence first */}
          {type === 'listening' && (
            <div className="mb-6">
              {isSkippable ? (
                <p className="text-xs text-gray-500 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3.5 py-3">
                  Your browser cannot play speech, so this item is skipped.
                </p>
              ) : (
                <button
                  onClick={() => playSentence(currentQuestion.spoken ?? '')}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-primary-500/10 border border-primary-500/25 text-primary-400 text-sm font-semibold hover:bg-primary-500/15 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  {listening ? 'Playing…' : 'Play the sentence'}
                </button>
              )}
            </div>
          )}

          {/* Speaking: record and compare */}
          {type === 'speaking' && (
            <div className="mb-6 space-y-3">
              {isSkippable ? (
                <p className="text-xs text-gray-500 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3.5 py-3">
                  Your browser does not support voice input, so this item is skipped.
                </p>
              ) : (
                <>
                  <div className="text-sm text-gray-200 bg-black/25 border border-white/[0.05] rounded-xl p-4 leading-relaxed">
                    &ldquo;{currentQuestion.target}&rdquo;
                  </div>
                  <Button variant="secondary" onClick={startRecording} disabled={recording}>
                    <Mic className="w-4 h-4" /> {recording ? 'Listening…' : 'Record your voice'}
                  </Button>
                  {transcript && (
                    <p className="text-xs text-gray-400 bg-black/25 border border-white/[0.05] rounded-xl p-3">
                      We heard: &ldquo;{transcript}&rdquo;
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Writing: type an answer */}
          {type === 'writing' && (
            <div className="mb-6">
              <textarea
                value={written}
                onChange={(e) => setWritten(e.target.value)}
                rows={4}
                placeholder="Write your answer in English…"
                className="w-full px-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40 transition-colors resize-none"
              />
              <p className="text-[11px] text-gray-600 mt-1.5">
                At least {currentQuestion.minWords ?? 5} words
                {currentQuestion.keyword ? `, and use the word "${currentQuestion.keyword}"` : ''}.
              </p>
            </div>
          )}

          {voiceError && (
            <p className="text-xs text-warning-400 bg-warning-500/5 border border-warning-500/10 rounded-xl px-3.5 py-2.5 mb-4">
              {voiceError}
            </p>
          )}

          {(type === 'mcq' || type === 'listening') && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 ${
                    selected === i
                      ? 'bg-primary-500/15 border-primary-500/50 text-white scale-[1.01]'
                      : 'glass border-white/[0.06] text-gray-300 hover:border-white/[0.12] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{option}</span>
                    {selected === i && (
                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center animate-scale-in">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Next button */}
        <div className="pt-6">
          <Button onClick={handleNext} size="lg" fullWidth disabled={!canContinue}>
            {currentIndex + 1 < questions.length ? 'Next' : 'See Results'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Minimal shape of the Web Speech recognition API used here. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: {
    results: { length: number; [index: number]: { 0: { transcript: string } } };
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/** True for items the browser could not run (no TTS / no STT). */
function isSkippableItem(question: PlacementQuestion): boolean {
  if (question.type === 'listening') {
    return typeof window !== 'undefined' && !('speechSynthesis' in window);
  }
  if (question.type === 'speaking') {
    return (
      typeof window !== 'undefined' &&
      !(
        (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
      )
    );
  }
  return false;
}
