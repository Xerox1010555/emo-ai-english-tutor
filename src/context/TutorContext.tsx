import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { clearTutorCache } from '@/lib/ai/client';
import { emptyProfileSnapshot, type AssistantMode, type TutorProfileSnapshot } from '@/lib/ai/types';
import { buildTutorProfileSnapshot, type ExtendedProfile } from '@/lib/learning/profile';
import type { Skill } from '@/lib/types';

interface TutorFocus {
  skill: Skill;
  title: string;
}

interface TutorContextValue {
  mode: AssistantMode;
  setMode: (mode: AssistantMode) => Promise<void>;
  profileSnapshot: TutorProfileSnapshot;
  profileLoading: boolean;
  /** Re-reads the learning profile after an activity. */
  refreshSnapshot: () => Promise<void>;
  /** Current lesson or quest context, used to bias the tutor's attention. */
  focus: TutorFocus | null;
  setFocus: (focus: TutorFocus | null) => void;
}

const TutorContext = createContext<TutorContextValue | undefined>(undefined);

const MODE_STORAGE_KEY = 'emo:assistant-mode';

function readStoredMode(): AssistantMode {
  if (typeof window === 'undefined') return 'friendly';
  const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
  return stored === 'friendly' || stored === 'coach' || stored === 'strict' ? stored : 'friendly';
}

export function TutorProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [mode, setModeState] = useState<AssistantMode>(readStoredMode);
  const [profileSnapshot, setProfileSnapshot] = useState<TutorProfileSnapshot>(emptyProfileSnapshot);
  const [profileLoading, setProfileLoading] = useState(true);
  const [focus, setFocus] = useState<TutorFocus | null>(null);

  const extendedProfile = profile as ExtendedProfile | null;
  const storedMode = extendedProfile?.assistant_mode;

  // The database column wins once it exists; localStorage covers the first
  // paint and users on an un-migrated database.
  useEffect(() => {
    if (storedMode === 'friendly' || storedMode === 'coach' || storedMode === 'strict') {
      setModeState(storedMode);
    }
  }, [storedMode]);

  const refreshSnapshot = useCallback(async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const snapshot = await buildTutorProfileSnapshot(user.id, extendedProfile);
      setProfileSnapshot(snapshot);
    } finally {
      setProfileLoading(false);
    }
  }, [user, extendedProfile]);

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    void refreshSnapshot();
  }, [user, refreshSnapshot]);

  const setMode = useCallback(
    async (next: AssistantMode) => {
      setModeState(next);
      window.localStorage.setItem(MODE_STORAGE_KEY, next);
      // A different mode is a different conversation state, so cached replies
      // from the previous tone must not be served.
      clearTutorCache();
      if (user) {
        await supabase.from('profiles').update({ assistant_mode: next }).eq('id', user.id);
      }
    },
    [user],
  );

  const value = useMemo<TutorContextValue>(
    () => ({
      mode,
      setMode,
      profileSnapshot,
      profileLoading,
      refreshSnapshot,
      focus,
      setFocus,
    }),
    [mode, setMode, profileSnapshot, profileLoading, refreshSnapshot, focus],
  );

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutor(): TutorContextValue {
  const ctx = useContext(TutorContext);
  if (!ctx) throw new Error('useTutor must be used within TutorProvider');
  return ctx;
}
