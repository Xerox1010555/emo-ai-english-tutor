import type { CEFRLevel, Skill } from '@/lib/types';
import { CEFR_ORDER, levelIndex, SKILLS } from './constants';

export type StageStatus = 'completed' | 'active' | 'locked';

export interface RoadmapStage {
  id: string;
  order: number;
  name: string;
  summary: string;
  levelRange: [CEFRLevel, CEFRLevel];
  skills: Skill[];
  /** Progress within this stage, 0–100. */
  progress: number;
  status: StageStatus;
  lessonsTarget: number;
  questsTarget: number;
}

export const STAGE_BLUEPRINTS: Omit<RoadmapStage, 'progress' | 'status'>[] = [
  {
    id: 'start',
    order: 0,
    name: 'Start',
    summary: 'Meet the tutor, set your target, and learn how the app works.',
    levelRange: ['A1', 'A1'],
    skills: ['Vocabulary', 'Grammar'],
    lessonsTarget: 3,
    questsTarget: 3,
  },
  {
    id: 'foundation',
    order: 1,
    name: 'Foundation',
    summary: 'Core grammar and the words you cannot avoid in daily life.',
    levelRange: ['A1', 'A2'],
    skills: ['Grammar', 'Vocabulary'],
    lessonsTarget: 8,
    questsTarget: 10,
  },
  {
    id: 'everyday',
    order: 2,
    name: 'Everyday English',
    summary: 'Describe your day, your job, and your plans without stopping.',
    levelRange: ['A2', 'B1'],
    skills: ['Speaking', 'Listening', 'Vocabulary'],
    lessonsTarget: 10,
    questsTarget: 12,
  },
  {
    id: 'conversation',
    order: 3,
    name: 'Conversation',
    summary: 'Keep a conversation going: opinions, follow-ups, and turn-taking.',
    levelRange: ['B1', 'B2'],
    skills: ['Speaking', 'Listening', 'Reading'],
    lessonsTarget: 10,
    questsTarget: 12,
  },
  {
    id: 'grammar-upgrade',
    order: 4,
    name: 'Grammar Upgrade',
    summary: 'Precision structures — conditionals, inversion, and nuance.',
    levelRange: ['B2', 'C1'],
    skills: ['Grammar', 'Writing'],
    lessonsTarget: 10,
    questsTarget: 12,
  },
  {
    id: 'advanced',
    order: 5,
    name: 'Advanced Communication',
    summary: 'Abstract topics, register control, and writing that reads naturally.',
    levelRange: ['C1', 'C1'],
    skills: ['Writing', 'Reading', 'Speaking'],
    lessonsTarget: 8,
    questsTarget: 10,
  },
  {
    id: 'fluent',
    order: 6,
    name: 'Fluent English',
    summary: 'Style, subtlety, and precision in everything you write and say.',
    levelRange: ['C1', 'C2'],
    skills: ['Writing', 'Speaking', 'Vocabulary'],
    lessonsTarget: 8,
    questsTarget: 10,
  },
];

export interface RoadmapInput {
  currentLevel: CEFRLevel;
  completedLessons: number;
  completedQuests: number;
  skillProgress: Record<Skill, number>;
}

/**
 * Derives the roadmap from where the learner actually is. Stage status comes
 * from CEFR position; stage progress blends the stage's skill scores with the
 * volume of work logged, so it never shows 0% for a stage the learner is
 * already partway through.
 */
export function buildRoadmap(input: RoadmapInput): RoadmapStage[] {
  const currentIdx = levelIndex(input.currentLevel);

  const stages = STAGE_BLUEPRINTS.map((blueprint) => {
    const stageLow = levelIndex(blueprint.levelRange[0]);
    const stageHigh = levelIndex(blueprint.levelRange[1]);

    const skillScores = blueprint.skills.map((skill) => input.skillProgress[skill]);
    const observedSkill = average(skillScores);

    // Level-based component: how far the learner sits into this stage.
    const levelComponent = clamp(((currentIdx - stageLow + 1) / (stageHigh - stageLow + 1)) * 70, 0, 70);
    // Skill-based component: up to 30 points from measured ability.
    const skillComponent = observedSkill * 0.3;

    // Never let a locked stage look partially complete purely from skill data.
    const status: StageStatus =
      currentIdx > stageHigh ? 'completed' : currentIdx >= stageLow ? 'active' : 'locked';

    const progress =
      status === 'locked'
        ? 0
        : status === 'completed'
          ? 100
          : clamp(levelComponent + skillComponent, 5, 95);

    return { ...blueprint, progress: Math.round(progress), status };
  });

  return normalizeActiveStage(stages);
}

/**
 * Stage ranges deliberately overlap (Start is A1, Foundation is A1–A2) so that
 * a learner never sits in a gap. The journey must still show exactly one active
 * stage, so the earliest stage containing their level wins: someone at A1 is
 * starting "Start", not already past it. Everything before it is completed;
 * everything after it is locked.
 */
function normalizeActiveStage(stages: RoadmapStage[]): RoadmapStage[] {
  const activeIndex = stages.findIndex((stage) => stage.status === 'active');

  if (activeIndex === -1) {
    // Level is beyond the last stage (C2+). Keep the final stage active.
    const last = stages.length - 1;
    return stages.map((stage, index) =>
      index === last ? { ...stage, status: 'active', progress: Math.max(stage.progress, 90) } : stage,
    );
  }

  return stages.map((stage, index) => {
    if (index === activeIndex) return stage;
    if (index < activeIndex) return { ...stage, status: 'completed', progress: 100 };
    // A later stage that also contains this level is still ahead of them.
    if (stage.status === 'active') return { ...stage, status: 'locked', progress: 0 };
    return stage;
  });
}

export function currentStage(stages: RoadmapStage[]): RoadmapStage | null {
  return stages.find((s) => s.status === 'active') ?? stages[stages.length - 1] ?? null;
}

/** Skills that the active stage explicitly wants, for goal-setting prompts. */
export function focusSkillsForStage(stage: RoadmapStage | null): Skill[] {
  if (!stage) return SKILLS;
  return stage.skills;
}

function average(values: number[]): number {
  const positive = values.filter((v) => v > 0);
  if (positive.length === 0) return 0;
  return positive.reduce((sum, v) => sum + v, 0) / positive.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export { CEFR_ORDER };
