'use strict';
// Bump APP_BUILD when publishing an app or content change. Each cache is a coherent snapshot.
const APP_BUILD = '20260927-r5';
const CACHE_NAME = `role-studio-${APP_BUILD}`;
const SCOPE = new URL('./', self.location.href);
const SHELL = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icon.svg'];
const absolute = path => new URL(path, SCOPE).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const [content, receipt] = await Promise.all([
      fetch(absolute('./data/content.json'), { cache: 'no-cache' }),
      fetch(absolute('./data/content.sha256'), { cache: 'no-cache' })
    ]);
    if (!content.ok || !receipt.ok) throw new Error('The content snapshot is unavailable.');
    const bytes = await content.clone().arrayBuffer();
    const expected = (await receipt.clone().text()).match(/[a-f0-9]{64}/i)?.[0].toLowerCase();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const actual = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
    if (!expected || actual !== expected) throw new Error('The content snapshot failed its integrity check.');
    await cache.addAll(SHELL.map(absolute));
    await cache.put(absolute('./data/content.json'), content);
    await cache.put(absolute('./data/content.sha256'), receipt);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('role-studio-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
    for (const client of await self.clients.matchAll()) client.postMessage({ type: 'CACHE_READY' });
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    if (event.request.mode === 'navigate') {
      const shell = await cache.match(absolute('./index.html'));
      if (shell) return shell;
    }
    return fetch(event.request);
  })());
});
