import { supabase } from '@/lib/supabase';

/**
 * Web Push subscription management.
 *
 * The VAPID public key is public by design (it identifies the server, it
 * cannot sign anything). The private key stays in the edge function's
 * environment.
 *
 * Everything degrades quietly: a browser without push support, a denied
 * permission, or a missing key all return a clear reason instead of throwing.
 */

export type PushState = 'unsupported' | 'denied' | 'default' | 'granted' | 'disabled';

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function pushEnabled(): boolean {
  return Boolean(VAPID_KEY);
}

/** Registers the service worker (safe to call more than once). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (!import.meta.env.PROD) {
    // In development the worker would shadow HMR; the app works without it.
    return null;
  }
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export interface PushResult {
  ok: boolean;
  state: PushState;
  message?: string;
}

/**
 * Subscribes this device to push and stores the subscription server-side.
 * Safe to call repeatedly: an existing subscription for the same endpoint is
 * reused instead of duplicated.
 */
export async function subscribeToPush(userId: string): Promise<PushResult> {
  if (!pushSupported()) {
    return { ok: false, state: 'unsupported', message: 'This browser does not support push.' };
  }
  if (!VAPID_KEY) {
    return {
      ok: false,
      state: 'disabled',
      message: 'Push is not configured on this deployment yet.',
    };
  }

  const permission = Notification.permission;
  if (permission === 'denied') {
    return {
      ok: false,
      state: 'denied',
      message: 'Notifications are blocked in your browser settings.',
    };
  }

  let registration: ServiceWorkerRegistration | null =
    (await navigator.serviceWorker.getRegistration('/')) ?? null;
  if (!registration) {
    registration = await registerServiceWorker();
  }
  if (!registration) {
    return { ok: false, state: 'unsupported', message: 'Could not start the service worker.' };
  }

  try {
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      }));

    const json = subscription.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, state: 'unsupported', message: 'The browser gave an incomplete subscription.' };
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 300),
      },
      { onConflict: 'endpoint' },
    );

    if (error) {
      return { ok: false, state: 'unsupported', message: 'Could not save the subscription.' };
    }

    return { ok: true, state: 'granted' };
  } catch (err) {
    return {
      ok: false,
      state: 'default',
      message: err instanceof Error ? err.message : 'Could not subscribe to push.',
    };
  }
}

/** Removes this device's subscription. */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      const json = subscription.toJSON() as { endpoint?: string };
      if (json.endpoint) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', json.endpoint);
      }
      await subscription.unsubscribe();
    }
    void userId;
  } catch {
    // Nothing to clean up.
  }
}

/** Whether this device is already subscribed. */
export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}
