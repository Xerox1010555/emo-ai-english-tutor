import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import {
  Braces,
  BookA,
  Headphones,
  Mic,
  PenLine,
  BookOpenText,
  Check,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTutor } from '@/context/TutorContext';
import { useDailyQuests } from '@/lib/learning/useDailyQuests';
import { notifyMilestone } from '@/lib/notifications/service';
import type { DailyQuest, QuestKind } from '@/lib/learning/quests';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CelebrationOverlay, StaggerItem, StaggerList } from '@/components/ui/motion';
import { EASE, springSoft } from '@/components/ui/motionTokens';
import { EmptyState, PageHeader, Pill, SectionHeader, SkeletonList } from '@/components/ui/primitives';
import type { TabId } from '@/components/Layout';

const kindIcon: Record<QuestKind, LucideIcon> = {
  grammar: Braces,
  vocabulary: BookA,
  speaking: Mic,
  translation: PenLine,
  reading: BookOpenText,
  listening: Headphones,
};

interface QuestsScreenProps {
  onNavigate: (tab: TabId) => void;
}

export function QuestsScreen({ onNavigate }: QuestsScreenProps) {
  const { user } = useAuth();
  const { profileSnapshot, refreshSnapshot } = useTutor();
  const { t } = useI18n();
  const { quests, loading, completedCount, earnedXp, totalXp, allDone, completeQuest } =
    useDailyQuests(user?.id ?? null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [wasAllDone, setWasAllDone] = useState(false);

  useEffect(() => {
    if (allDone && !wasAllDone && quests.length > 0) {
      setCelebrate(true);
      setWasAllDone(true);
      notifyMilestone('All quests complete', `${earnedXp} XP earned today. Streak secured.`);
    }
  }, [allDone, wasAllDone, quests.length, earnedXp]);

  const active = quests.find((q) => q.id === activeId) ?? null;
  const targeted = quests.filter((q) => q.goal_skill).map((q) => q.goal_skill);
  const uniqueTargeted = Array.from(new Set(targeted));

  async function handleComplete(id: string) {
    await completeQuest(id);
    await refreshSnapshot();
    setActiveId(null);
    setShowAnswer(false);
  }

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-4">
        <SkeletonList count={4} height="h-24" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader
        title={t('quests.title')}
        subtitle={t('quests.subtitle')}
      />

      {/* Progress summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: EASE }}
      >
        <Card className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-semibold text-white">
                {completedCount} of {quests.length} complete
              </span>
            </div>
            <span className="text-sm font-bold text-primary-400 tabular-nums">
              {earnedXp}/{totalXp} XP
            </span>
          </div>
          <ProgressBar
            progress={quests.length > 0 ? (completedCount / quests.length) * 100 : 0}
            label="Daily quest progress"
          />
          {uniqueTargeted.length > 0 && (
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Targeting <span className="text-primary-400 font-medium">{uniqueTargeted.join(', ')}</span>
              {profileSnapshot.weaknesses.length > 0 &&
                ` — your weakest ${profileSnapshot.weaknesses.length === 1 ? 'area' : 'areas'} right now.`}
            </p>
          )}
        </Card>
      </motion.div>

      {/* Quest list */}
      {quests.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title={t('quests.empty.title')}
            body={t('quests.empty.body')}
            action={
              <Button size="sm"               onClick={() => onNavigate('roadmap')}>
                {t('roadmap.lesson')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div>
          <SectionHeader title="Today's set" />
          <StaggerList className="space-y-3" gap={0.06}>
            {quests.map((quest) => (
              <StaggerItem key={quest.id}>
                <QuestCard
                  quest={quest}
                  onOpen={() => {
                    setActiveId(quest.id);
                    setShowAnswer(false);
                  }}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      )}

      {/* Active quest detail */}
      <AnimatePresence>
        {active && (
          <QuestDetail
            key={active.id}
            quest={active}
            showAnswer={showAnswer}
            setShowAnswer={setShowAnswer}
            onClose={() => {
              setActiveId(null);
              setShowAnswer(false);
            }}
            onComplete={() => handleComplete(active.id)}
            onChat={() => {
              setActiveId(null);
              onNavigate('chat');
            }}
          />
        )}
      </AnimatePresence>

      <CelebrationOverlay
        open={celebrate}
        emoji="🏆"
        title="Every quest cleared"
        subtitle={`${earnedXp} XP earned. That's the whole day done.`}
        onDone={() => setCelebrate(false)}
      />
    </div>
  );
}

function QuestCard({ quest, onOpen }: { quest: DailyQuest; onOpen: () => void }) {
  const Icon = kindIcon[quest.kind];

  return (
    <Card hover onClick={onOpen} className={quest.completed ? 'opacity-70' : ''}>
      <div className="flex items-start gap-3.5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            quest.completed ? 'bg-success-500/10' : 'bg-primary-500/10'
          }`}
        >
          {quest.completed ? (
            <CheckCircle2 className="w-5 h-5 text-success-400" />
          ) : (
            <Icon className="w-[18px] h-[18px] text-primary-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Pill tone={quest.completed ? 'success' : 'primary'}>
              {quest.completed ? 'Done' : quest.title}
            </Pill>
            {quest.goal_skill && !quest.completed && (
              <Pill tone="warning">
                <Target className="w-2.5 h-2.5" /> Focus
              </Pill>
            )}
            <span className="text-[11px] text-gray-600 ml-auto tabular-nums">+{quest.xpReward} XP</span>
          </div>
          <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{quest.prompt}</p>
        </div>
      </div>
    </Card>
  );
}

interface QuestDetailProps {
  quest: DailyQuest;
  showAnswer: boolean;
  setShowAnswer: (v: boolean) => void;
  onClose: () => void;
  onComplete: () => void;
  onChat: () => void;
}

function QuestDetail({
  quest,
  showAnswer,
  setShowAnswer,
  onClose,
  onComplete,
  onChat,
}: QuestDetailProps) {
  const Icon = kindIcon[quest.kind];
  const isSpeaking = quest.kind === 'speaking';

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 glass-strong rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto scrollbar-thin shadow-lift sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:rounded-3xl"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={springSoft}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-[18px] h-[18px] text-primary-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{quest.title}</p>
      <span className="text-[11px] text-gray-500">
        {quest.skill} · +{quest.xpReward} XP
      </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close quest"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap bg-black/25 border border-white/[0.05] rounded-xl p-4">
          {quest.prompt}
        </div>

        {isSpeaking && (
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            Use the microphone in Chat to record yourself, then paste the transcript here. The tutor
            will correct it in context.
          </p>
        )}

        <div className="mt-4 space-y-2.5">
          <AnimatePresence initial={false}>
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: EASE }}
                className="overflow-hidden space-y-2"
              >
                <div className="text-xs bg-warning-500/5 border border-warning-500/10 text-warning-400 rounded-xl px-3.5 py-2.5 leading-relaxed">
                  <span className="font-semibold">Hint: </span>
                  {quest.hint}
                </div>
                {quest.answer && (
                  <div className="text-xs bg-success-500/5 border border-success-500/15 text-success-400 rounded-xl px-3.5 py-2.5 leading-relaxed">
                    <span className="font-semibold">Answer: </span>
                    {quest.answer}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!showAnswer && (
            <Button fullWidth variant="secondary" onClick={() => setShowAnswer(true)}>
              <Lightbulb className="w-4 h-4 text-warning-400" /> Show hint
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2.5 mt-5">
          {quest.completed ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-success-400 py-2">
              <Check className="w-4 h-4" /> Quest complete
            </div>
          ) : (
            <>
              {isSpeaking && (
                <Button fullWidth variant="secondary" onClick={onChat}>
                  <Mic className="w-4 h-4" /> Record in Chat
                </Button>
              )}
              <Button fullWidth onClick={onComplete}>
                <CheckCircle2 className="w-4 h-4" /> Mark complete
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}
