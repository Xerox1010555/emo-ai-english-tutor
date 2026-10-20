import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { generateDailyQuests, type DailyQuest } from './quests';
import { todayKey } from './profile';
import { useTutor } from '@/context/TutorContext';
import { useAuth } from '@/context/AuthContext';
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
  const { refreshProfile } = useAuth();
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

    // First visit today: persist the generated set (upsert-safe; migration 3
    // adds UNIQUE(user_id, date, quest_key), so a double-visit cannot dupe).
    const rows = generated.map((q) => ({
      user_id: userId,
      quest_key: q.id,
      date,
      kind: q.kind,
      skill: q.skill,
      title: q.title,
      prompt: q.prompt,
      hint: q.hint,
      answer: q.answer,
      xp_reward: q.xpReward,
      goal_skill: q.goal_skill,
      goal_level: q.goal_level,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('daily_quests')
      .upsert(rows, { onConflict: 'user_id,date,quest_key' })
      .select();

    if (!insertError && inserted && inserted.length > 0) {
      setQuests(inserted.map(fromRow));
      setLoading(false);
      return;
    }

    // The answer/goal_level columns come from migration 3. Retry without them
    // so quests still persist on a database that has not applied it.
    const legacyRows = rows.map((row) => ({
      user_id: row.user_id,
      quest_key: row.quest_key,
      date: row.date,
      kind: row.kind,
      skill: row.skill,
      title: row.title,
      prompt: row.prompt,
      hint: row.hint,
      xp_reward: row.xp_reward,
      goal_skill: row.goal_skill,
    }));
    const { data: legacyInserted, error: legacyError } = await supabase
      .from('daily_quests')
      .upsert(legacyRows, { onConflict: 'user_id,date,quest_key' })
      .select();

    setQuests(
      legacyError || !legacyInserted
        ? applyLocal(generated, localKey)
        : legacyInserted.map(fromRow),
    );
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

      // Preferred path: the migration-3 RPC marks completion and adds XP in a
      // single transaction, so a double-tap or concurrent visit cannot lose XP.
      // The auth profile is refreshed so XP everywhere converges to the truth.
      const { error: rpcError } = await supabase.rpc('complete_quest', {
        p_quest_key: id,
      });

      if (!rpcError) {
        await refreshProfile().catch(() => undefined);
        return;
      }

      // Fallback (migration 3 not applied): plain update, then a guarded XP add.
      const { error } = await supabase
        .from('daily_quests')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('quest_key', id)
        .eq('completed', false);

      // xp is a new column; a failure is non-fatal.
      if (!error) await awardXp(userId, target.xpReward);
    },
    [quests, userId, localKey, refreshProfile],
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
    // Migration 3 persists the model answer; without it written quests lose
    // their "Answer:" reveal after a reload.
    answer: typeof row.answer === 'string' && row.answer.length > 0 ? row.answer : null,
    goal_skill: (row.goal_skill as Skill) ?? null,
    goal_level: (row.goal_level as DailyQuest['goal_level']) ?? undefined,
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
