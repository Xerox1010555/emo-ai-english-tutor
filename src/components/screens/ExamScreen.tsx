import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  ChevronRight,
  Clock,
  Headphones,
  Mic,
  PenLine,
  RotateCcw,
  Timer,
  Volume2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  EXAMS,
  cefrForBand,
  localWritingCheck,
  scoreExam,
  type ExamDefinition,
  type ExamId,
  type ExamMode,
  type ExamSection,
  type SectionId,
  type SectionOutcome,
} from '@/lib/learning/exams';
import { gradeWriting, saveExamResult } from '@/lib/ai/grading';
import { speakingAttemptPassed } from '@/lib/learning/speech';
import { speak as speakText } from '@/lib/speech';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, Pill, SectionHeader } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EASE } from '@/components/ui/motionTokens';

type Phase = 'intro' | 'running' | 'review' | 'results';

const sectionIcons: Record<SectionId, LucideIcon> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

export function ExamScreen() {
  const { profile } = useAuth();
  const [examId, setExamId] = useState<ExamId>('ielts');
  const [mode, setMode] = useState<ExamMode>('quick');
  const [phase, setPhase] = useState<Phase>('intro');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [outcomes, setOutcomes] = useState<SectionOutcome[]>([]);
  const [essay, setEssay] = useState('');
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState(false);
  const [grade, setGrade] = useState<{ band: string; feedback: string; fromModel: boolean } | null>(null);
  const startedAt = useRef(Date.now());
  const timerRef = useRef<number | null>(null);

  const exam: ExamDefinition = EXAMS[examId];
  const section: ExamSection | undefined = exam.sections[sectionIndex];
  const sectionMinutes = section ? section.minutes[mode] : 0;

  const finishExam = useCallback(
    async (finalOutcomes: SectionOutcome[]) => {
      const result = scoreExam(exam, finalOutcomes);
      setOutcomes(finalOutcomes);
      setPhase('results');
      await saveExamResult({
        examId: exam.id,
        examTitle: exam.title,
        mode,
        total: result.total,
        maxScore: exam.scale === 'band' ? 9 : 120,
        sections: finalOutcomes,
        durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      });
    },
    [exam, mode],
  );

  const completeSection = useCallback(
    async (outcome: SectionOutcome) => {
      const next = [...outcomes, outcome];
      setOutcomes(next);
      setSelected(null);
      setShowExplanation(false);

      if (sectionIndex + 1 < exam.sections.length) {
        setSectionIndex((i) => i + 1);
        setQuestionIndex(0);
        setEssay('');
        setTranscript('');
        setGrade(null);
        return;
      }
      await finishExam(next);
    },
    [outcomes, sectionIndex, exam.sections.length, finishExam],
  );

  // Section timer.
  useEffect(() => {
    if (phase !== 'running' || !section) return;
    setSecondsLeft(sectionMinutes * 60);
    const tick = () => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Time is up: the section is submitted as it stands.
          void timeoutSubmit();
          return 0;
        }
        return s - 1;
      });
    };
    timerRef.current = window.setInterval(tick, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sectionIndex, sectionMinutes]);

  const timeoutSubmit = async () => {
    if (!section) return;
    if (section.questions) {
      await completeSection({
        section: section.id,
        title: section.title,
        skill: section.skill,
        correct: countCorrect(section.questions, answers),
        total: section.questions.length,
        percentage: percentage(countCorrect(section.questions, answers), section.questions.length),
        notes: ['Time expired — the section was submitted automatically.'],
      });
    }
  };

  const start = () => {
    setPhase('running');
    setSectionIndex(0);
    setQuestionIndex(0);
    setAnswers({});
    setOutcomes([]);
    setSelected(null);
    setShowExplanation(false);
    setEssay('');
    setTranscript('');
    setGrade(null);
    startedAt.current = Date.now();
  };

  const question = section?.questions?.[questionIndex];
  const writing = section?.writing?.[0];
  const speaking = section?.speaking?.[0];

  const answeredCount = section?.questions
    ? section.questions.filter((q) => answers[q.id] !== undefined).length
    : 0;

  const sectionProgress = useMemo(() => {
    if (!section) return 0;
    if (section.questions) {
      return percentage(answeredCount, section.questions.length);
    }
    return 0;
  }, [section, answeredCount]);

  if (phase === 'intro') {
    return (
      <div className="px-5 py-6 space-y-6">
        <PageHeader title="Exam simulator" subtitle="Timed mock tests with a real scoring logic" />

        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(EXAMS) as ExamId[]).map((id) => {
            const definition = EXAMS[id];
            const active = examId === id;
            return (
              <Card
                key={id}
                hairline={active}
                depth={active ? 3 : 2}
                tilt
                onClick={() => setExamId(id)}
                className={`space-y-2 ${active ? '' : 'opacity-80'}`}
              >
                <div className="flex items-center gap-2">
                  <Award className={`w-4 h-4 ${active ? 'text-primary-300' : 'text-gray-500'}`} />
                  <span className="text-sm font-bold text-white">{definition.title}</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {definition.subtitle}
                </p>
              </Card>
            );
          })}
        </div>

        <Card className="space-y-3">
          <SectionHeader title="Mode" />
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'quick', label: 'Quick', hint: 'Shorter sections' },
                { id: 'full', label: 'Full', hint: 'Real timings' },
              ] as const
            ).map((option) => {
              const active = mode === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setMode(option.id)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-primary-500/15 text-primary-300 border border-primary-500/25'
                      : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]'
                  }`}
                >
                  <span className="block">{option.label}</span>
                  <span className="text-[10px] text-gray-500">{option.hint}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {exam.overview}
          </p>
        </Card>

        <Card className="space-y-2.5">
          <SectionHeader title="Sections" />
          {exam.sections.map((s) => {
            const Icon = sectionIcons[s.id];
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 font-medium">{s.title}</p>
                    <p className="text-[10px] text-gray-500 truncate">{s.scoring}</p>
                  </div>
                </div>
                <span className="text-[11px] text-gray-500 tabular-nums flex-shrink-0">
                  {s.minutes[mode]} min
                </span>
              </div>
            );
          })}
        </Card>

        <Button fullWidth size="lg" onClick={start}>
          <Timer className="w-4 h-4" /> Start the {mode === 'quick' ? 'quick' : 'full'} mock
        </Button>
        <p className="text-[11px] text-gray-600 text-center leading-relaxed">
          A mock is a practice score, not an official result — but the timing,
          the questions and the scoring logic are the real ones.
        </p>
      </div>
    );
  }

  if (phase === 'results') {
    const result = scoreExam(exam, outcomes);
    const cefr = cefrForBand(result.total, exam.scale);
    return (
      <div className="px-5 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <Card hairline depth={3} tilt className="relative overflow-hidden text-center py-10 space-y-3">
            <div className="aurora opacity-80" />
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center mx-auto shadow-glow-primary">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold text-white font-sans text-3d mt-4">
                {result.total}
                <span className="text-sm font-semibold text-gray-400 ml-1.5">
                  {exam.scale === 'band' ? 'band' : 'points'}
                </span>
              </h2>
              <p className="text-sm text-gray-400">
                {result.percentage}% overall · around <span className="text-primary-300 font-semibold">{cefr}</span>
              </p>
            </div>
          </Card>
        </motion.div>

        <div>
          <SectionHeader title="Section by section" />
          <div className="space-y-2.5">
            {outcomes.map((outcome) => (
              <Card key={outcome.section} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{outcome.title}</span>
                  <span className="text-sm font-bold text-primary-300 tabular-nums">
                    {outcome.band ?? `${outcome.percentage}%`}
                  </span>
                </div>
                <ProgressBar
                  progress={outcome.percentage}
                  height="sm"
                  label={`${outcome.title} score`}
                />
                {outcome.notes.map((note, i) => (
                  <p key={i} className="text-[11px] text-gray-500 leading-relaxed">
                    {note}
                  </p>
                ))}
              </Card>
            ))}
          </div>
        </div>

        <Button fullWidth variant="secondary" onClick={() => setPhase('intro')}>
          <RotateCcw className="w-4 h-4" /> Back to the exams
        </Button>
      </div>
    );
  }

  if (!section) return null;

  return (
    <div className="px-5 py-6 space-y-5">
      {/* Exam header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500">
            {exam.title} · section {sectionIndex + 1} of {exam.sections.length}
          </p>
          <h2 className="text-lg font-bold text-white font-sans">{section.title}</h2>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums ${
            secondsLeft < 60
              ? 'bg-red-500/15 text-red-300 border border-red-500/25 animate-pulse'
              : 'bg-white/[0.06] text-gray-200 border border-white/[0.08]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
        </div>
      </div>

      <ProgressBar progress={sectionProgress} label="Section progress" />

      {/* Multiple choice sections */}
      {question && (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="space-y-4"
        >
          {question.spoken && (
            <button
              onClick={() =>
                speakText(question.spoken!, { level: profile?.current_level })
              }
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-primary-500/12 border border-primary-500/25 text-primary-300 text-sm font-semibold hover:bg-primary-500/20 transition-colors"
            >
              <Volume2 className="w-4 h-4" /> Play the audio
            </button>
          )}

          {question.passage && (
            <div className="glass-panel depth-1 rounded-xl p-4 max-h-56 overflow-y-auto scrollbar-thin text-sm text-gray-300 leading-relaxed">
              {question.passage}
            </div>
          )}

          <h3 className="text-base font-bold text-white leading-snug">{question.prompt}</h3>

          <div className="space-y-2">
            {question.options.map((option, i) => {
              const isCorrect = i === question.correct;
              const isSelected = answers[question.id] === i;
              let cls = 'glass border-white/[0.06] text-gray-300';
              if (showExplanation) {
                if (isCorrect) cls = 'bg-success-500/15 border-success-500/40 text-white';
                else if (isSelected) cls = 'bg-red-500/15 border-red-500/40 text-white';
                else cls = 'glass border-white/[0.04] text-gray-600';
              } else if (isSelected) {
                cls = 'bg-primary-500/15 border-primary-500/50 text-white';
              }
              return (
                <button
                  key={i}
                  disabled={showExplanation}
                  onClick={() => {
                    setSelected(i);
                    setAnswers((prev) => ({ ...prev, [question.id]: i }));
                  }}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all ${cls}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="glass-panel depth-1 rounded-xl p-4 space-y-2"
            >
              <p className="text-[11px] font-bold text-primary-300 uppercase tracking-wider">
                Why
              </p>
              <p className="text-sm text-gray-200 leading-relaxed">{question.explanation}</p>
            </motion.div>
          )}

          <div className="flex gap-2">
            {!showExplanation ? (
              <Button
                fullWidth
                disabled={selected === null}
                onClick={() => setShowExplanation(true)}
              >
                Check answer
              </Button>
            ) : (
              <Button
                fullWidth
                onClick={async () => {
                  if (questionIndex + 1 < (section.questions?.length ?? 0)) {
                    setQuestionIndex((i) => i + 1);
                    setSelected(null);
                    setShowExplanation(false);
                    return;
                  }
                  const correct = countCorrect(section.questions ?? [], answers);
                  await completeSection({
                    section: section.id,
                    title: section.title,
                    skill: section.skill,
                    correct,
                    total: section.questions?.length ?? 0,
                    percentage: percentage(correct, section.questions?.length ?? 0),
                    notes: [],
                  });
                }}
              >
                {questionIndex + 1 < (section.questions?.length ?? 0)
                  ? 'Next question'
                  : 'Finish section'}
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Writing section */}
      {writing && (
        <div className="space-y-4">
          <Card className="space-y-2">
            <Pill tone="primary">Writing task</Pill>
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {writing.prompt}
            </p>
            <p className="text-[11px] text-gray-500">At least {writing.minWords} words.</p>
          </Card>

          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            rows={8}
            placeholder="Write your answer here…"
            className="w-full px-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm leading-relaxed placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40 transition-colors resize-none"
          />
          <p className="text-[11px] text-gray-600">
            {essay.trim() ? essay.trim().split(/\s+/).length : 0} / {writing.minWords} words
          </p>

          {grade && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel depth-2 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Estimated band</span>
                <span className="text-xl font-extrabold text-primary-300">{grade.band}</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{grade.feedback}</p>
              {!grade.fromModel && (
                <p className="text-[11px] text-gray-500">
                  Scored by the local checklist — connect a model for an examiner-style grade.
                </p>
              )}
            </motion.div>
          )}

          <Button
            fullWidth
            loading={busy}
            disabled={essay.trim().split(/\s+/).filter(Boolean).length < 20}
            onClick={async () => {
              setBusy(true);
              const modelGrade = await gradeWriting(essay, writing, profile?.current_level ?? 'B1');
              const local = localWritingCheck(essay, writing);
              const band = modelGrade?.band ?? bandForPercentage(local.percentage);
              setGrade({
                band,
                feedback: modelGrade?.feedback ?? local.notes.join(' '),
                fromModel: Boolean(modelGrade?.fromModel),
              });
              await completeSection({
                section: section.id,
                title: section.title,
                skill: section.skill,
                correct: 0,
                total: 0,
                percentage: modelGrade?.percentage ?? local.percentage,
                band,
                notes: modelGrade
                  ? []
                  : local.notes,
              });
              setBusy(false);
            }}
          >
            <PenLine className="w-4 h-4" /> Submit and score
          </Button>
        </div>
      )}

      {/* Speaking section */}
      {speaking && (
        <div className="space-y-4">
          <Card className="space-y-2">
            <Pill tone="accent">Speaking task</Pill>
            <p className="text-sm text-gray-200 leading-relaxed">{speaking.prompt}</p>
            <p className="text-[11px] text-gray-500">
              Aim for about {speaking.seconds} seconds of speech.
            </p>
          </Card>

          <SpeakingRecorder onTranscript={setTranscript} />

          {transcript && (
            <div className="glass-panel depth-1 rounded-xl p-4 space-y-2">
              <p className="text-[11px] font-bold text-primary-300 uppercase tracking-wider">
                We heard
              </p>
              <p className="text-sm text-gray-200 leading-relaxed">{transcript}</p>
              <p className="text-[11px] text-gray-500">
                {speakingAttemptPassed(speaking.modelAnswer, transcript)
                  ? 'You covered the key ideas — well done.'
                  : 'Try to include more of the key phrases.'}
              </p>
            </div>
          )}

          <div className="glass-panel depth-1 rounded-xl p-4 space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Key phrases to use
            </p>
            <ul className="space-y-1">
              {speaking.keyPhrases.map((phrase) => (
                <li key={phrase} className="text-xs text-gray-300">
                  • {phrase}
                </li>
              ))}
            </ul>
          </div>

          <Button
            fullWidth
            onClick={async () => {
              const used = speaking.keyPhrases.filter((p) =>
                transcript.toLowerCase().includes(p.toLowerCase().replace(/…$/, '').trim().split(/\s+/)[0]),
              ).length;
              const coverage = Math.round((used / speaking.keyPhrases.length) * 100);
              await completeSection({
                section: section.id,
                title: section.title,
                skill: section.skill,
                correct: used,
                total: speaking.keyPhrases.length,
                percentage: coverage,
                band: bandForPercentage(coverage),
                notes: transcript
                  ? [`You used ${used} of ${speaking.keyPhrases.length} key phrases.`]
                  : ['No speech was recorded for this task.'],
              });
            }}
          >
            <Mic className="w-4 h-4" /> Submit and score
          </Button>
        </div>
      )}

      {section.questions && (
        <div className="flex items-center justify-between text-[11px] text-gray-600">
          <span>
            Question {questionIndex + 1} of {section.questions.length}
          </span>
          <span>
            {answeredCount} answered · {section.questions.length - answeredCount} left
          </span>
        </div>
      )}
    </div>
  );
}

function countCorrect(
  questions: { id: string; correct: number }[],
  answers: Record<string, number>,
): number {
  return questions.filter((q) => answers[q.id] === q.correct).length;
}

function percentage(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

function bandForPercentage(percentage: number): string {
  if (percentage >= 90) return '9';
  if (percentage >= 80) return '8';
  if (percentage >= 70) return '7';
  if (percentage >= 60) return '6';
  if (percentage >= 50) return '5';
  if (percentage >= 40) return '4';
  if (percentage >= 30) return '3';
  if (percentage >= 20) return '2';
  return '1';
}

/** A microphone button that reports the recognised speech. */
function SpeakingRecorder({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        Boolean(
          (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ??
            (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
        ),
    );
  }, []);

  function start() {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => RecognitionLike })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => RecognitionLike })
        .webkitSpeechRecognition;
    if (!SR) {
      setError('Voice input is not available in this browser.');
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
        onTranscript(text);
        setRecording(false);
      };
      recognition.onerror = () => {
        setRecording(false);
        setError('Could not hear you. Try again.');
      };
      recognition.onend = () => setRecording(false);
      recognition.start();
      setRecording(true);
      setError(null);
    } catch {
      setRecording(false);
      setError('Could not start the microphone.');
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-gray-500 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3.5 py-3">
        Your browser does not support voice input, so this task is skipped.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button fullWidth variant="secondary" onClick={start} disabled={recording}>
        <Mic className="w-4 h-4" /> {recording ? 'Listening…' : 'Record your answer'}
      </Button>
      {error && <p className="text-[11px] text-warning-400">{error}</p>}
    </div>
  );
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: {
    results: { length: number; [index: number]: { 0: { transcript: string } } };
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}
