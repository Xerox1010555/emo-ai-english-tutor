import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { ExtendedProfile } from '@/lib/learning/profile';

export type { ExtendedProfile };

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: ExtendedProfile | null;
  loading: boolean;
  /** Set when the profile could not be loaded or created. */
  profileError: string | null;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Profile load error:', error);
      setProfileError('Could not load your profile.');
      return;
    }
    if (data) {
      setProfileError(null);
      setProfile(data as ExtendedProfile);
      return;
    }

    // First login: create the profile. Another request (the auth listener, or
    // a second tab) may create it first, so a conflict is resolved by reading
    // the row that won rather than leaving the app without a profile.
    const { data: newProfile, error: createErr } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select()
      .single();

    if (!createErr && newProfile) {
      setProfileError(null);
      setProfile(newProfile as ExtendedProfile);
      return;
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      setProfileError(null);
      setProfile(existing as ExtendedProfile);
    } else {
      setProfileError('Could not prepare your profile. Please try again.');
    }
  }

  /**
   * Tells the database how far this device's clock is from UTC.
   *
   * The daily reminder is stored in the learner's own local time, so the
   * server needs the offset to fire it at the right hour. It is sent once per
   * session; a failure here is not important enough to surface (the column
   * only exists after migration 4).
   */
  async function syncTimezone(userId: string) {
    try {
      const offsetMinutes = Math.round(-new Date().getTimezoneOffset());
      const { data } = await supabase
        .from('profiles')
        .select('tz_offset_minutes')
        .eq('id', userId)
        .maybeSingle();
      if (data && Number(data.tz_offset_minutes) === offsetMinutes) return;
      await supabase
        .from('profiles')
        .update({ tz_offset_minutes: offsetMinutes })
        .eq('id', userId);
    } catch {
      // Non-fatal: reminders fall back to the stored offset.
    }
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id)
          .then(() => syncTimezone(session!.user.id))
          .finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // The database work is DEFERRED out of the auth callback on purpose.
      //
      // Every PostgREST request calls auth.getSession() internally, and
      // getSession() waits for the auth lock — which the onAuthStateChange
      // callback holds while it runs. Awaiting a query inside the callback
      // therefore deadlocks: the query waits for the lock, the callback waits
      // for the query, and the app hangs on the loading screen forever.
      // Supabase documents the same rule.
      window.setTimeout(() => {
        if (!mounted) return;
        if (session?.user) {
          void loadProfile(session.user.id).then(() => syncTimezone(session!.user.id));
        } else {
          setProfile(null);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };

    // With email confirmation enabled there is no session yet. The UI has to
    // say so — otherwise a new learner is dropped back to the login form with
    // no explanation of what to do next.
    if (data.user && !data.session) {
      return { error: null, needsConfirmation: true };
    }

    if (data.user) {
      await loadProfile(data.user.id);
    }
    return { error: null, needsConfirmation: false };
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await loadProfile(data.user.id);
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileError(null);
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileError,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
