/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// ── Precache all static assets built by Vite ──────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Background Sync queue — retries failed mutations for up to 24 hours ───────
const bgSyncPlugin = new BackgroundSyncPlugin('premier-hotel-mutations', {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        // Notify the app that a queued request was synced
        const clients = await self.clients.matchAll();
        clients.forEach(client => client.postMessage({ type: 'BACKGROUND_SYNC_SUCCESS', url: entry.request.url }));
      } catch {
        await queue.unshiftRequest(entry);
        // Notify app of failure so it can show a banner
        const clients = await self.clients.matchAll();
        clients.forEach(client => client.postMessage({ type: 'BACKGROUND_SYNC_FAILED' }));
        throw new Error('Replay failed — will retry on next sync event');
      }
    }
  },
});

// ── Determine API base URL dynamically ───────────────────────────────────────
// Matches /api/v1/ on any host/port (localhost dev, LAN IPs, and production domains)
const API_PATTERN = /\/api\/v1\//;

// ── POST / PUT / PATCH / DELETE → NetworkOnly + Background Sync ───────────────
// When offline, Workbox queues the request and replays it when back online.
registerRoute(
  ({ url, request }) =>
    API_PATTERN.test(url.href) &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'POST'
);
registerRoute(
  ({ url, request }) =>
    API_PATTERN.test(url.href) && request.method === 'PUT',
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'PUT'
);
registerRoute(
  ({ url, request }) =>
    API_PATTERN.test(url.href) && request.method === 'PATCH',
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'PATCH'
);
registerRoute(
  ({ url, request }) =>
    API_PATTERN.test(url.href) && request.method === 'DELETE',
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'DELETE'
);

// ── Menu items — StaleWhileRevalidate (great for static-ish data) ─────────────
registerRoute(
  ({ url }) => API_PATTERN.test(url.href) && url.pathname.includes('/menu'),
  new StaleWhileRevalidate({
    cacheName: 'api-menu',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// ── Rooms — NetworkFirst with 5s timeout, falls back to cache ─────────────────
registerRoute(
  ({ url }) => API_PATTERN.test(url.href) && url.pathname.includes('/rooms'),
  new NetworkFirst({
    cacheName: 'api-rooms',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 }),
    ],
  })
);

// ── Orders — NetworkFirst (1h cache, 8s timeout) ──────────────────────────────
registerRoute(
  ({ url }) => API_PATTERN.test(url.href) && url.pathname.includes('/orders'),
  new NetworkFirst({
    cacheName: 'api-orders',
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 }),
    ],
  })
);

// ── Bookings — NetworkFirst (2h cache) ────────────────────────────────────────
registerRoute(
  ({ url }) => API_PATTERN.test(url.href) && url.pathname.includes('/bookings'),
  new NetworkFirst({
    cacheName: 'api-bookings',
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 2 * 60 * 60 }),
    ],
  })
);

// ── Housekeeping / staff endpoints — NetworkFirst ─────────────────────────────
registerRoute(
  ({ url }) =>
    API_PATTERN.test(url.href) &&
    (url.pathname.includes('/housekeeping') || url.pathname.includes('/staff')),
  new NetworkFirst({
    cacheName: 'api-staff',
    networkTimeoutSeconds: 6,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 60 }),
    ],
  })
);

// ── Reports — NetworkFirst (short cache, reports change often) ────────────────
registerRoute(
  ({ url }) => API_PATTERN.test(url.href) && url.pathname.includes('/reports'),
  new NetworkFirst({
    cacheName: 'api-reports',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
    ],
  })
);

// ── Images — CacheFirst (30 days) ─────────────────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// ── SPA navigation — serve index.html from precache for all nav requests ──────
// This ensures the app shell loads offline for any route
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'html-shell',
      networkTimeoutSeconds: 3,
      plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
    })
  )
);

// ── On install: skip waiting so the new SW takes over immediately ─────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ── On activate: immediately claim all open tabs ──────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Listen for messages from the app ─────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Periodic background sync (if supported) ──────────────────────────────────
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'premier-hotel-sync') {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll();
        clients.forEach(c => c.postMessage({ type: 'PERIODIC_SYNC_TRIGGER' }));
      })()
    );
  }
});
