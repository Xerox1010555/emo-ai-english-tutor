import type { AssistantMode } from '@/lib/ai/types';

export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export type ReminderFrequency = 'daily' | 'weekdays' | 'off';

export interface ReminderSettings {
  enabled: boolean;
  time: string; // "HH:MM" in 24h local time
  frequency: ReminderFrequency;
  mode: AssistantMode;
  /** Do not send two nudges inside this window. */
  quietHours: boolean;
}

export interface ReminderContext {
  streak: number;
  incompleteQuests: number;
  lastSessionAt: Date | null;
  lessonTitle: string | null;
}

const QUIET_START_HOUR = 22;
const QUIET_END_HOUR = 8;
const MIN_GAP_MS = 60 * 60 * 1000;
const MAX_REMINDERS_PER_SESSION = 2;

export function notificationSupport(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (notificationSupport() === 'unsupported') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission as NotificationPermissionState;
  try {
    return (await Notification.requestPermission()) as NotificationPermissionState;
  } catch {
    return 'denied';
  }
}

function isQuietHours(date: Date, quiet: boolean): boolean {
  if (!quiet) return false;
  const hour = date.getHours();
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

function copyFor(mode: AssistantMode, context: ReminderContext): { title: string; body: string } {
  const hasQuests = context.incompleteQuests > 0;
  const missed = context.lastSessionAt
    ? Date.now() - context.lastSessionAt.getTime() > 24 * 60 * 60 * 1000
    : false;

  switch (mode) {
    case 'strict':
      if (missed) {
        return {
          title: 'لسه ما بدأتش جلسة النهارده',
          body: '15 دقيقة بس وابدأ. الـ streak بتاعك مستنيك.',
        };
      }
      if (hasQuests) {
        return {
          title: `عندك ${context.incompleteQuests} Quest لسه مفتوحة`,
          body: 'افتح أول Lesson وابدأ الآن. متأجلش تاني النهارده.',
        };
      }
      return { title: 'وقت الإنجليزي', body: 'الجلسة اليومية مستنياك. 15 دقيقة تكفي.' };

    case 'coach':
      if (hasQuests) {
        return {
          title: `${context.incompleteQuests} quests left today`,
          body: 'Clear them before you stop. Momentum beats intensity.',
        };
      }
      return { title: "Today's practice is waiting", body: 'Ten focused minutes will keep your streak alive.' };

    case 'friendly':
    default:
      if (hasQuests) {
        return {
          title: '⏰ وقت الإنجليزي',
          body: `${context.incompleteQuests} short quests are waiting for you.`,
        };
      }
      return {
        title: '⏰ وقت الإنجليزي',
        body: 'A few minutes today keeps your streak going.',
      };
  }
}

/**
 * In-app reminder scheduler.
 *
 * Scope note: this uses the Web Notification API and fires while the tab is
 * open. Background delivery when the tab is closed requires a service worker
 * with Web Push plus a VAPID backend, which this project does not yet have.
 * See Remaining Work in the delivery report.
 */
class ReminderService {
  private lastFiredAt = 0;
  private firesThisSession = 0;
  private settings: ReminderSettings | null = null;
  private context: ReminderContext | null = null;

  configure(settings: ReminderSettings, context: ReminderContext): void {
    const changed =
      !this.settings ||
      this.settings.enabled !== settings.enabled ||
      this.settings.time !== settings.time ||
      this.settings.frequency !== settings.frequency ||
      this.settings.quietHours !== settings.quietHours ||
      this.settings.mode !== settings.mode;

    this.settings = settings;
    this.context = context;
    if (changed) this.reschedule();
  }

  /** Fires immediately if a reminder is due right now. */
  checkNow(now = new Date()): void {
    if (!this.settings || !this.shouldFire(now)) return;
    this.fire(now);
  }

  destroy(): void {
    this.settings = null;
    this.context = null;
  }

  private shouldFire(now: Date): boolean {
    const settings = this.settings;
    if (!settings || !settings.enabled) return false;
    if (notificationSupport() !== 'granted') return false;
    if (settings.frequency === 'off') return false;
    if (isQuietHours(now, settings.quietHours)) return false;
    if (this.firesThisSession >= MAX_REMINDERS_PER_SESSION) return false;
    if (now.getTime() - this.lastFiredAt < MIN_GAP_MS) return false;

    if (settings.frequency === 'weekdays') {
      const day = now.getDay();
      if (day === 0 || day === 6) return false;
    }

    const [hours, minutes] = parseTime(settings.time);
    const due = new Date(now);
    due.setHours(hours, minutes, 0, 0);

    // Fire from the scheduled minute until the end of that hour, so a tab
    // opened late still gets the nudge.
    return now.getTime() >= due.getTime() && now.getTime() - due.getTime() < 60 * 60 * 1000;
  }

  private reschedule(): void {
    this.destroy();
    // A fresh configuration gets one immediate evaluation, so switching the
    // reminder on during the target hour does not wait for the next tick.
    this.checkNow();
  }

  private fire(now: Date): void {
    const settings = this.settings;
    const context = this.context;
    if (!settings || !context) return;

    const { title, body } = copyFor(settings.mode, context);
    try {
      new Notification(title, { body, tag: 'emo-daily-reminder' });
      this.lastFiredAt = now.getTime();
      this.firesThisSession += 1;
    } catch {
      // Notification constructor can throw on some mobile browsers; the
      // scheduler simply does not mark the reminder as fired.
    }
  }
}

function parseTime(value: string): [number, number] {
  const [h, m] = value.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return [9, 0];
  return [Math.min(23, Math.max(0, hours)), Math.min(59, Math.max(0, minutes))];
}

export const reminderService = new ReminderService();

/** Milestone notifications fired the moment something is achieved. */
export function notifyMilestone(title: string, body: string): void {
  if (notificationSupport() !== 'granted') return;
  try {
    new Notification(title, { body, tag: `emo-${title}` });
  } catch {
    // ignore
  }
}

export function describeSupport(): string {
  switch (notificationSupport()) {
    case 'unsupported':
      return 'This browser does not support notifications. Reminders will appear in-app instead.';
    case 'denied':
      return 'Notifications are blocked. Re-enable them in your browser site settings.';
    case 'default':
      return 'Allow notifications to get study reminders when this tab is open.';
    default:
      return 'Reminders fire while this tab is open, at your chosen time.';
  }
}
