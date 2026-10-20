import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { generateDailyQuests, type DailyQuest } from './quests';
import { todayKey } from './profile';
import { useTutor } from '@/context/TutorContext';
import type { Skill } from '@/lib/types';

export interface DailyQuestState {
  quests: DailyQuest[];
  loading: boolean;
  completedCount: number;
  totalXp: number;
  earnedXp: number;
  allDone: boolean;
  completeQuest: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Daily quests are generated deterministically from (user, date) and then
 * persisted. If the `daily_quests` table is missing, generation still works
 * from memory plus local storage — persistence is the only part that degrades.
 */
export function useDailyQuests(userId: string | null): DailyQuestState {
  const { profileSnapshot } = useTutor();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const date = todayKey();
  const localKey = useMemo(() => `emo:quests:${date}`, [date]);

  const generated = useMemo(
    () =>
      generateDailyQuests({
        profile: profileSnapshot,
        date,
        seedKey: userId ?? 'anonymous',
        count: 4,
      }),
    [profileSnapshot, date, userId],
  );

  const load = useCallback(async () => {
    if (!userId) {
      setQuests(applyLocal(generated, localKey));
      setLoading(false);
      return;
    }

    const { data, error: readError } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);

    if (readError) {
      // Un-migrated database: generated quests plus local completion state.
      setQuests(applyLocal(generated, localKey));
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setQuests(data.map(fromRow));
      setLoading(false);
      return;
    }

    // First visit today: persist the generated set.
    const rows = generated.map((q) => ({
      user_id: userId,
      quest_key: q.id,
      date,
      kind: q.kind,
      skill: q.skill,
      title: q.title,
      prompt: q.prompt,
      hint: q.hint,
      xp_reward: q.xpReward,
      goal_skill: q.goal_skill,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('daily_quests')
      .insert(rows)
      .select();

    setQuests(insertError || !inserted ? applyLocal(generated, localKey) : inserted.map(fromRow));
    setLoading(false);
  }, [userId, date, generated, localKey]);

  useEffect(() => {
    let cancelled = false;
    void load().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const completeQuest = useCallback(
    async (id: string) => {
      const target = quests.find((q) => q.id === id);
      if (!target || target.completed) return;

      const updated = quests.map((q) =>
        q.id === id ? { ...q, completed: true, completed_at: new Date().toISOString() } : q,
      );
      setQuests(updated);
      persistLocal(localKey, updated);

      if (!userId) return;

      const { error } = await supabase
        .from('daily_quests')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('quest_key', id);

      // xp is a new column; a failure is non-fatal.
      if (!error) await awardXp(userId, target.xpReward);
    },
    [quests, userId, localKey],
  );

  const completedCount = quests.filter((q) => q.completed).length;

  return {
    quests,
    loading,
    completedCount,
    totalXp: quests.reduce((sum, q) => sum + q.xpReward, 0),
    earnedXp: quests.filter((q) => q.completed).reduce((sum, q) => sum + q.xpReward, 0),
    allDone: quests.length > 0 && completedCount === quests.length,
    completeQuest,
    refresh: load,
  };
}

async function awardXp(userId: string, amount: number): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .maybeSingle();

  const current = Number(data?.xp);
  if (!Number.isFinite(current)) return;

  const { error } = await supabase
    .from('profiles')
    .update({ xp: current + amount })
    .eq('id', userId);

  if (error) console.warn('[quests] xp not persisted:', error.message);
}

function fromRow(row: Record<string, unknown>): DailyQuest {
  return {
    id: String(row.quest_key ?? row.id),
    date: String(row.date),
    kind: row.kind as DailyQuest['kind'],
    skill: row.skill as Skill,
    title: String(row.title),
    prompt: String(row.prompt),
    hint: String(row.hint ?? ''),
    xpReward: Number(row.xp_reward) || 0,
    completed: Boolean(row.completed),
    answer: null,
    goal_skill: (row.goal_skill as Skill) ?? null,
    goalLevel: (row.goal_level as DailyQuest['goalLevel']) ?? 'A1',
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function applyLocal(quests: DailyQuest[], key: string): DailyQuest[] {
  const done = readLocal(key);
  if (!done) return quests;
  return quests.map((q) => (done.has(q.id) ? { ...q, completed: true } : q));
}

function persistLocal(key: string, quests: DailyQuest[]): void {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(quests.filter((q) => q.completed).map((q) => q.id)),
    );
  } catch {
    // Storage blocked or full — completion still works in memory.
  }
}

function readLocal(key: string): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return null;
  }
}
