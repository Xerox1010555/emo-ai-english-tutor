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
import { useTutor } from './TutorContext';
import {
  describeSupport,
  notificationSupport,
  reminderService,
  requestNotificationPermission,
  type NotificationPermissionState,
  type ReminderContext,
  type ReminderFrequency,
  type ReminderSettings,
} from '@/lib/notifications/service';

interface NotificationContextValue {
  supported: boolean;
  permission: NotificationPermissionState;
  supportMessage: string;
  requestPermission: () => Promise<NotificationPermissionState>;
  settings: ReminderSettings;
  updateSettings: (patch: Partial<ReminderSettings>) => void;
  /** Feeds the scheduler the live learning state it uses to phrase reminders. */
  updateContext: (context: ReminderContext) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const CHECK_INTERVAL_MS = 60_000;

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  time: '09:00',
  frequency: 'daily',
  mode: 'friendly',
  quietHours: true,
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { mode } = useTutor();
  const [permission, setPermission] = useState<NotificationPermissionState>(() => notificationSupport());
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [context, setContext] = useState<ReminderContext>({
    streak: 0,
    incompleteQuests: 0,
    lastSessionAt: null,
    lessonTitle: null,
  });

  // Hydrate from the profile once it loads; defaults stand if columns are absent.
  useEffect(() => {
    if (!profile) return;
    setSettings((prev) => ({
      ...prev,
      enabled: profile.notifications_enabled ?? false,
      time: (profile.notification_time ?? '09:00').slice(0, 5),
      frequency: isFrequency(profile.reminder_frequency) ? profile.reminder_frequency : 'daily',
    }));
  }, [profile]);

  useEffect(() => {
    setSettings((prev) => (prev.mode === mode ? prev : { ...prev, mode }));
  }, [mode]);

  // Keep the scheduler in sync with settings + live context.
  useEffect(() => {
    reminderService.configure(settings, context);
  }, [settings, context]);

  useEffect(() => {
    const interval = window.setInterval(() => reminderService.checkNow(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => reminderService.destroy(), []);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  const updateSettings = useCallback((patch: Partial<ReminderSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateContext = useCallback((next: ReminderContext) => {
    setContext((prev) => (isSameContext(prev, next) ? prev : next));
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      supported: permission !== 'unsupported',
      permission,
      supportMessage: describeSupport(),
      requestPermission,
      settings,
      updateSettings,
      updateContext,
    }),
    [permission, requestPermission, settings, updateSettings, updateContext],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

function isFrequency(value: unknown): value is ReminderFrequency {
  return value === 'daily' || value === 'weekdays' || value === 'off';
}

function isSameContext(a: ReminderContext, b: ReminderContext): boolean {
  return (
    a.streak === b.streak &&
    a.incompleteQuests === b.incompleteQuests &&
    a.lastSessionAt?.getTime() === b.lastSessionAt?.getTime() &&
    a.lessonTitle === b.lessonTitle
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export { notifyMilestone } from '@/lib/notifications/service';
