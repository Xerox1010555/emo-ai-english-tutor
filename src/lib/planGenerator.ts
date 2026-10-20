import type { CEFRLevel, Skill, LearningPlanWeek } from './types';

const levelOrder: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const skillRotation: Skill[] = ['Grammar', 'Vocabulary', 'Reading', 'Listening', 'Speaking', 'Writing'];

const weekTitles: Record<Skill, string[]> = {
  Grammar: ['Tenses & Time', 'Conditionals Deep Dive', 'Passive & Reported Speech', 'Articles & Determiners', 'Sentence Structure', 'Inversion & Emphasis'],
  Vocabulary: ['Daily Essentials', 'Phrasal Verbs', 'Academic Word List', 'Idioms & Collocations', 'Business English', 'Advanced Synonyms'],
  Reading: ['Skimming & Scanning', 'Inference & Implication', 'Author\'s Tone', 'Text Structure', 'Critical Reading', 'Speed Reading'],
  Listening: ['Gist & Detail', 'Connected Speech', 'Accents & Varieties', 'Lectures & Talks', 'Note-Taking', 'Dictation Practice'],
  Speaking: ['Pronunciation Basics', 'Fluency Drills', 'Describing & Explaining', 'Opinions & Debate', 'Storytelling', 'Presentations'],
  Writing: ['Paragraph Structure', 'Emails & Messages', 'Essays & Arguments', 'Reports & Summaries', 'Creative Writing', 'Academic Writing'],
};

export function generatePlan(currentLevel: CEFRLevel, targetLevel: CEFRLevel): Omit<LearningPlanWeek, 'id' | 'user_id' | 'created_at'>[] {
  const startIdx = levelOrder.indexOf(currentLevel);
  const endIdx = levelOrder.indexOf(targetLevel);
  const levelsToCover = levelOrder.slice(startIdx, endIdx + 1);

  const weeksPerLevel = Math.max(2, Math.ceil(24 / levelsToCover.length));
  const plan: Omit<LearningPlanWeek, 'id' | 'user_id' | 'created_at'>[] = [];
  let weekNum = 1;

  for (const level of levelsToCover) {
    for (let w = 0; w < weeksPerLevel; w++) {
      const skill = skillRotation[(weekNum - 1) % skillRotation.length];
      const titles = weekTitles[skill];
      const title = `${level} · ${titles[w % titles.length]}`;
      plan.push({
        week_number: weekNum,
        focus_skill: skill,
        title,
        status: weekNum === 1 ? 'active' : 'upcoming',
      });
      weekNum++;
    }
  }

  return plan;
}

export function adjustPlanForPerformance(
  plan: Omit<LearningPlanWeek, 'id' | 'user_id' | 'created_at'>[],
  weakSkills: Skill[]
): Omit<LearningPlanWeek, 'id' | 'user_id' | 'created_at'>[] {
  if (weakSkills.length === 0) return plan;
  // Insert extra review weeks for weak skills before moving forward
  const adjusted = [...plan];
  for (const skill of weakSkills) {
    const insertIdx = Math.min(adjusted.length, 3);
    const titles = weekTitles[skill];
    adjusted.splice(insertIdx, 0, {
      week_number: 0, // Will be renumbered
      focus_skill: skill,
      title: `Review · ${titles[0]}`,
      status: 'upcoming',
    });
  }
  // Renumber
  return adjusted.map((w, i) => ({ ...w, week_number: i + 1 }));
}

export function getWeeksToTarget(currentLevel: CEFRLevel, targetLevel: CEFRLevel): number {
  const startIdx = levelOrder.indexOf(currentLevel);
  const endIdx = levelOrder.indexOf(targetLevel);
  const levels = levelOrder.slice(startIdx, endIdx + 1);
  return Math.max(2, Math.ceil(24 / levels.length)) * levels.length;
}
