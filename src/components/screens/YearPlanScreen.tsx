import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CalendarDays, Headphones, Mic, PenLine, Sparkles, Type } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { composeLesson, dayOfYear, LESSONS_PER_YEAR, type ComposedLesson } from '@/lib/content/composer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, Pill, SectionHeader } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EASE } from '@/components/ui/motionTokens';

const skillIcons = {
  Grammar: Type,
  Vocabulary: BookOpen,
  Listening: Headphones,
  Speaking: Mic,
  Writing: PenLine,
  Reading: BookOpen,
} as const;

const skillTone = {
  Grammar: 'text-primary-300 border-primary-500/25 bg-primary-500/12',
  Vocabulary: 'text-accent-300 border-accent-500/25 bg-accent-500/12',
  Listening: 'text-success-300 border-success-500/25 bg-success-500/12',
  Speaking: 'text-warning-300 border-warning-500/25 bg-warning-500/12',
  Writing: 'text-primary-300 border-primary-500/25 bg-primary-500/12',
  Reading: 'text-accent-300 border-accent-500/25 bg-accent-500/12',
} as const;

/**
 * The year plan.
 *
 * 365 lessons for every skill, laid out as a year. The learner sees where
 * they are ("day 214 of 365") and what each skill is about today, so the
 * curriculum feels like a journey rather than a random daily task.
 */
export function YearPlanScreen() {
  const { profile, user } = useAuth();
  const level = profile?.current_level ?? 'B1';
  const seed = user?.id ?? 'anonymous';

  const today = useMemo(() => dayOfYear(), []);

  const lessons = useMemo<ComposedLesson[]>(
    () =>
      (['Grammar', 'Vocabulary', 'Listening', 'Speaking', 'Writing', 'Reading'] as const).map(
        (skill) => composeLesson(skill, today, level, seed),
      ),
    [today, level, seed],
  );

  const progress = (today / LESSONS_PER_YEAR) * 100;

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader
        title="Your year"
        subtitle={`${LESSONS_PER_YEAR} lessons for every skill, one for every day`}
      />

      {/* Where the learner is in the year */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE }}
      >
        <Card hairline depth={3} className="relative overflow-hidden space-y-3">
          <div className="aurora opacity-70" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                  Your position
                </p>
                <p className="text-2xl font-extrabold text-white font-sans text-3d mt-0.5">
                  Day {today} <span className="text-base text-gray-500">of {LESSONS_PER_YEAR}</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-500/30 to-accent-500/5 border border-accent-500/25 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-accent-300" />
              </div>
            </div>
            <ProgressBar progress={progress} height="md" label="Year progress" tone="accent" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Every day has a lesson for all six skills. The content follows your level, and
              the topics rotate so nothing repeats twice in a row.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Today's lessons, one per skill */}
      <div>
        <SectionHeader title="Today's lessons" />
        <div className="space-y-2.5">
          {lessons.map((lesson, index) => {
            const Icon = skillIcons[lesson.skill];
            return (
              <motion.div
                key={lesson.skill}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04, ease: EASE }}
              >
                <Card className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${skillTone[lesson.skill]}`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">
                          {lesson.title}
                        </p>
                        <Pill tone="neutral">{lesson.skill}</Pill>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {lesson.durationMinutes} min · lesson {lesson.index + 1} of {LESSONS_PER_YEAR}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {lesson.content}
                  </p>

                  {lesson.vocab.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {lesson.vocab.map((entry) => (
                        <span
                          key={entry.word}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-white/[0.05] border border-white/[0.07] text-gray-400"
                          title={entry.definition}
                        >
                          {entry.word}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-start gap-2 pt-1 border-t border-white/[0.05]">
                    <Sparkles className="w-3.5 h-3.5 text-primary-400/80 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      {lesson.drill.prompt}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Button fullWidth variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        Back to the top
      </Button>
    </div>
  );
}
