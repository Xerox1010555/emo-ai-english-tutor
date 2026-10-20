import { useEffect, useState } from 'react';
import {
  Bell,
  Globe,
  LogOut,
  Mail,
  Moon,
  RotateCcw,
  Target,
  Plus,
  X,
  Cpu,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AssistantModeCards } from '@/components/AssistantModeSwitch';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, SectionHeader } from '@/components/ui/primitives';
import type { CEFRLevel } from '@/lib/types';
import { useNotifications } from '@/context/NotificationContext';
import { useTutor } from '@/context/TutorContext';
import { aiProviders, resolveProvider } from '@/lib/ai/provider';

const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const GOAL_SUGGESTIONS = [
  'Speak with strangers',
  'Pass IELTS',
  'Get a job interview',
  'Travel without English',
  'Write better emails',
  'Understand native speech',
];

export function SettingsScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { settings, updateSettings, permission, requestPermission, supportMessage } =
    useNotifications();
  const { refreshSnapshot } = useTutor();

  const [targetLevel, setTargetLevel] = useState<CEFRLevel>(profile?.target_level ?? 'B2');
  const [language, setLanguage] = useState(profile?.preferred_language ?? 'ar');
  const [goals, setGoals] = useState<string[]>(profile?.learning_goals ?? []);
  const [goalDraft, setGoalDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const currentLevel = profile?.current_level ?? 'A1';
  // The reminder time has a single source of truth: the notification context
  // (which is hydrated from the profile and written straight back to it).
  const notificationTime = settings.time;

  useEffect(() => {
    setTargetLevel(profile?.target_level ?? 'B2');
    setLanguage(profile?.preferred_language ?? 'ar');
    setGoals(Array.isArray(profile?.learning_goals) ? profile.learning_goals : []);
  }, [profile]);

  const dirty =
    targetLevel !== (profile?.target_level ?? 'B2') ||
    notificationTime !== (profile?.notification_time ?? '09:00').slice(0, 5) ||
    language !== (profile?.preferred_language ?? 'ar') ||
    goals.join('|') !== (profile?.learning_goals ?? []).join('|');

  const configuredProvider = resolveProvider();
  const providerConfigured = aiProviders.some((p) => p.isConfigured());

  async function saveSettings() {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        target_level: targetLevel,
        notification_time: notificationTime,
        preferred_language: language,
        learning_goals: goals,
      })
      .eq('id', user.id);

    if (error) {
      // Never claim success when the write failed.
      setSaveError('Your changes were not saved. Check your connection and try again.');
      setSaving(false);
      return;
    }

    await refreshProfile();
    await refreshSnapshot();
    setSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  async function toggleNotifications() {
    const next = !settings.enabled;
    if (next && permission === 'default') {
      const result = await requestPermission();
      if (result !== 'granted') {
        setSaveError('Notifications are blocked by the browser, so reminders stay off.');
        return;
      }
    }
    if (next && permission === 'denied') {
      setSaveError('Notifications are blocked at the browser level for this site.');
      return;
    }

    updateSettings({ enabled: next });
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ notifications_enabled: next })
        .eq('id', user.id);
      if (error) setSaveError('Could not save the reminder preference.');
    }
  }

  async function persistReminderField(patch: Record<string, unknown>) {
    if (!user) return;
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (error) setSaveError('Could not save the reminder setting.');
  }

  async function retakePlacement() {
    if (!user) return;
    setResetting(true);
    const { error } = await supabase
      .from('profiles')
      .update({ placement_done: false })
      .eq('id', user.id);
    if (error) {
      setSaveError('Could not restart the placement test.');
      setResetting(false);
      return;
    }
    await refreshProfile();
  }

  function addGoal(value: string) {
    const trimmed = value.trim();
    if (!trimmed || goals.length >= 5) return;
    if (goals.some((g) => g.toLowerCase() === trimmed.toLowerCase())) return;
    setGoals((prev) => [...prev, trimmed]);
    setGoalDraft('');
  }

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader title="Settings" subtitle="Manage your tutor, your goals, and your reminders" />

      {/* Account */}
      <Card className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Level {currentLevel} · Member since{' '}
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </p>
        </div>
      </Card>

      {/* Assistant mode */}
      <div>
        <SectionHeader title="Assistant personality" />
        <AssistantModeCards />
      </div>

      {/* AI status */}
      <div>
        <SectionHeader title="AI tutor connection" />
        <Card className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            {providerConfigured ? (
              <CheckCircle2 className="w-4 h-4 text-success-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-warning-400 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {providerConfigured ? configuredProvider.label : 'Not connected'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {providerConfigured
                  ? 'Replies are generated by a language model using your level, goals, and past mistakes.'
                  : 'Replies fall back to the built-in rules engine until a model provider is configured.'}
              </p>
            </div>
            <Cpu className={`w-4 h-4 flex-shrink-0 ${providerConfigured ? 'text-success-400' : 'text-gray-600'}`} />
          </div>
          {!providerConfigured && (
            <div className="text-[11px] bg-white/[0.02] border border-white/[0.05] rounded-xl px-3.5 py-3 text-gray-500 leading-relaxed space-y-1">
              <p>To connect a model, deploy the edge function and add the key as a server secret:</p>
              <code className="block text-gray-400 font-mono text-[10px] break-all">
                supabase functions deploy tutor-reply
              </code>
              <code className="block text-gray-400 font-mono text-[10px] break-all">
                supabase secrets set OPENAI_API_KEY=...
              </code>
              <p className="pt-1">
                The key is never shipped to the browser. Alternatively set
                <span className="text-gray-400 font-mono text-[10px]"> VITE_AI_PROXY_URL</span> to
                your own gateway.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Target level */}
      <div>
        <SectionHeader title="Target level" />
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary-400" />
            <p className="text-sm text-gray-300">Where do you want to reach?</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {levels.map((lvl) => {
              const disabled = levels.indexOf(lvl) <= levels.indexOf(currentLevel);
              const active = targetLevel === lvl;
              return (
                <button
                  key={lvl}
                  disabled={disabled}
                  onClick={() => setTargetLevel(lvl)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
                    active
                      ? 'bg-primary-500 text-white'
                      : disabled
                        ? 'bg-white/[0.02] text-gray-700 cursor-not-allowed'
                        : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Goals */}
      <div>
        <SectionHeader title="Learning goals" />
        <Card className="space-y-3.5">
          <p className="text-xs text-gray-500 leading-relaxed">
            The tutor uses these to pick exercises and questions. Up to 5.
          </p>

          {goals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {goals.map((goal) => (
                <span
                  key={goal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 text-xs font-medium"
                >
                  {goal}
                  <button
                    onClick={() => setGoals((prev) => prev.filter((g) => g !== goal))}
                    aria-label={`Remove goal ${goal}`}
                    className="hover:text-primary-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {goals.length < 5 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addGoal(goalDraft);
                  }
                }}
                placeholder="e.g. Speak with strangers"
                className="flex-1 px-4 py-2.5 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40 transition-colors"
              />
              <Button
                size="md"
                variant="secondary"
                onClick={() => addGoal(goalDraft)}
                disabled={!goalDraft.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {GOAL_SUGGESTIONS.filter((s) => !goals.includes(s))
              .slice(0, 4)
              .map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => addGoal(suggestion)}
                  disabled={goals.length >= 5}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-300 transition-colors disabled:opacity-40"
                >
                  + {suggestion}
                </button>
              ))}
          </div>
        </Card>
      </div>

      {/* Notifications */}
      <div>
        <SectionHeader title="Reminders" />
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Bell className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-gray-300">Study reminders</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {permission === 'granted' ? 'Allowed by your browser' : supportMessage}
                </p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              role="switch"
              aria-checked={settings.enabled}
              aria-label="Toggle study reminders"
              disabled={permission === 'denied' || permission === 'unsupported'}
              className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-40 ${
                settings.enabled ? 'bg-primary-500' : 'bg-white/[0.1]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ${
                  settings.enabled ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {settings.enabled && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-accent-400" />
                  <div>
                    <p className="text-sm text-gray-300">Remind me at</p>
                    <p className="text-[11px] text-gray-500">Your local time</p>
                  </div>
                </div>
                <input
                  type="time"
                  value={settings.time}
                  onChange={(e) => {
                    updateSettings({ time: e.target.value });
                    void persistReminderField({ notification_time: e.target.value });
                  }}
                  className="bg-black/30 border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500/40"
                />
              </div>

              <div>
                <p className="text-sm text-gray-300 mb-2.5">Frequency</p>
                <div className="flex gap-2">
                  {(
                    [
                      { id: 'daily', label: 'Every day' },
                      { id: 'weekdays', label: 'Weekdays' },
                      { id: 'off', label: 'Off' },
                    ] as const
                  ).map((option) => {
                    const active = settings.frequency === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          updateSettings({ frequency: option.id });
                          void persistReminderField({ reminder_frequency: option.id });
                        }}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                          active
                            ? 'bg-primary-500/15 text-primary-400 border border-primary-500/25'
                            : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300">Respect quiet hours</p>
                  <p className="text-[11px] text-gray-500">No reminders between 10pm and 8am</p>
                </div>
                <button
                  onClick={() => updateSettings({ quietHours: !settings.quietHours })}
                  role="switch"
                  aria-checked={settings.quietHours}
                  aria-label="Respect quiet hours"
                  className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${
                    settings.quietHours ? 'bg-primary-500' : 'bg-white/[0.1]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ${
                      settings.quietHours ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <p className="text-[11px] text-gray-600 leading-relaxed pt-1 border-t border-white/[0.05]">
                Reminder wording follows your assistant mode
                {settings.mode ? ` (currently ${settings.mode})` : ''}. Maximum two per day, and
                never during quiet hours.
              </p>
            </>
          )}

          {permission === 'denied' && (
            <div className="text-[11px] text-warning-400 bg-warning-500/5 border border-warning-500/10 rounded-xl px-3.5 py-2.5 leading-relaxed">
              Notifications are blocked at the browser level. Re-enable them for this site in your
              browser settings, then turn reminders back on here.
            </div>
          )}
        </Card>
      </div>

      {/* Language */}
      <div>
        <SectionHeader title="Language support" />
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-primary-400" />
            <p className="text-sm text-gray-300">
              Arabic support in the tutor's explanations and corrections
            </p>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'ar', label: 'Arabic + English' },
              { id: 'en', label: 'English only' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setLanguage(opt.id)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  language === opt.id
                    ? 'bg-primary-500/15 text-primary-400 border border-primary-500/25'
                    : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            The tutor writes primarily in English either way. With Arabic support on, it weaves in
            short Arabic phrases where they genuinely help — it does not translate everything.
          </p>
        </Card>
      </div>

      {/* Save */}
      {saveError && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-xl px-3.5 py-2.5">
          {saveError}
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        onClick={saveSettings}
        loading={saving}
        disabled={!dirty}
      >
        {saved ? (
          <>
            <CheckCircle2 className="w-4 h-4" /> Saved
          </>
        ) : (
          'Save changes'
        )}
      </Button>

      {/* Placement */}
      <div>
        <SectionHeader title="Placement" />
        <Card className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Retake placement test</p>
            <p className="text-xs text-gray-500 mt-0.5">Re-evaluate your current level</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={retakePlacement}
            loading={resetting}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retake
          </Button>
        </Card>
      </div>

      {/* Sign out */}
      <Button fullWidth variant="danger" onClick={signOut}>
        <LogOut className="w-4 h-4" /> Sign out
      </Button>
    </div>
  );
}
