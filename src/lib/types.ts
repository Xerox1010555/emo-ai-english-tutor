export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type Skill = 'Grammar' | 'Vocabulary' | 'Listening' | 'Speaking' | 'Writing' | 'Reading';

export interface Profile {
  id: string;
  current_level: CEFRLevel;
  target_level: CEFRLevel;
  notification_time: string;
  preferred_language: string;
  streak: number;
  last_active_date: string | null;
  placement_done: boolean;
  created_at: string;
}

export interface PlacementResult {
  id: string;
  user_id: string;
  skill: Skill;
  score: number;
  taken_at: string;
}

export interface LearningPlanWeek {
  id: string;
  user_id: string;
  week_number: number;
  focus_skill: Skill;
  title: string;
  status: 'upcoming' | 'active' | 'completed';
  created_at: string;
}

export interface DailyLesson {
  id: string;
  user_id: string;
  date: string;
  title: string;
  skill: Skill;
  content: string;
  duration_minutes: number;
  completed: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  appointment_at: string;
  remind_before_hours: number;
  notified: boolean;
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  user_id: string;
  role: 'user' | 'emo';
  content: string;
  correction: string | null;
  created_at: string;
}

export interface QuizResult {
  id: string;
  user_id: string;
  quiz_type: string;
  score: number;
  total: number;
  taken_at: string;
}

export interface VocabItem {
  id: string;
  user_id: string;
  word: string;
  definition: string;
  example: string;
  box: number;
  next_review: string;
  mastered: boolean;
  created_at: string;
}

export interface LevelHistoryEntry {
  id: string;
  user_id: string;
  level: CEFRLevel;
  score: number;
  recorded_at: string;
}
