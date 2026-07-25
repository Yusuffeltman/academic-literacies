// Kill-switch service worker.
//
// An earlier version of the app registered a cache-FIRST service worker
// (cache name "acadlit-v2") that permanently served a cached index.html and
// hashed JS bundles. Vite renames hashed assets on every build and deletes the
// previous ones, so after each deploy that stale shell pointed browsers at
// files that no longer exist — the app failed to boot and students' work
// (which is stored server-side in Firebase, and is intact) appeared to
// "disappear". App-side registration has since been disabled, but service
// workers already installed in browsers keep running independently.
//
// This replacement does the opposite of caching: on activation it deletes every
// cache, unregisters itself, and reloads any open tabs so each affected browser
// self-heals to the current, uncached app. It is a no-op for browsers that
// never had the old worker. Once every client has picked this up, the worker
// removes itself entirely.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (err) {
      // Ignore cache cleanup failures — unregister below still removes the SW.
    }
    try {
      await self.clients.claim();
    } catch (err) {
      // Ignore claim failures.
    }
    try {
      await self.registration.unregister();
    } catch (err) {
      // Ignore unregister failures.
    }
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        // Reload each open tab so it drops the old controller and fetches the
        // live app straight from the network.
        client.navigate(client.url).catch(() => {});
      });
    } catch (err) {
      // Ignore navigation failures — tabs recover on their next manual reload.
    }
  })());
});

// Deliberately NO fetch handler: while this worker is briefly active, all
// requests go straight to the network (no stale cache is ever served).
