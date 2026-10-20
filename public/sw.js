/*
 * Emo service worker.
 *
 * Two jobs:
 *  1. Receive Web Push messages and show a real notification, so a study
 *     reminder arrives even when the app is closed.
 *  2. Cache the app shell so the app opens instantly (and offline) instead of
 *     waiting on the network.
 *
 * The VAPID public key lives in the app build; the private key never leaves
 * the server.
 */

const CACHE_NAME = 'emo-shell-v1';
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API traffic — stale learning data is worse than no data.
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/rest/v1/')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Emo', body: event.data ? event.data.text() : 'Time to practise.' };
  }

  const title = payload.title || 'Emo';
  const options = {
    body: payload.body || 'Your daily practice is waiting.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.tag || 'emo-daily-reminder',
    renotify: true,
    data: { url: payload.url || '/' },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'emo-open', url: target });
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
