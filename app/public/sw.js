// Lets the website itself boot with zero network signal, after at least one successful
// visit — a static site needs *some* copy of its own HTML/JS/CSS cached locally to load
// cold, since a browser tab can't run code it was never able to download in the first
// place. This only ever touches the app's own same-origin files (the page shell, JS
// bundle, CSS, icons); API calls to the backend/Wikipedia/OSRM/etc. are a different origin
// and pass straight through untouched — offline handling for those already lives in the
// app itself (see useOfflineAreas / useOfflineTrips).
const CACHE_NAME = 'traveltales-shell-v1';
const SHELL_URLS = ['/', '/manifest.json', '/icon.png'];

// The page that registers this worker already fetched its own HTML/JS/CSS *before*
// registration could possibly happen (registration itself only runs once that HTML has
// loaded and executed) — so nothing about the current page load is caught by the runtime
// 'fetch' handler below. Explicitly re-fetch the shell here instead. Expo's static export
// renames the JS/CSS bundle files every build (content-hashed), so rather than hardcoding
// filenames, parse them out of the HTML document that was just fetched.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(SHELL_URLS);

      const htmlResponse = await cache.match('/');
      if (htmlResponse) {
        const html = await htmlResponse.clone().text();
        const assetUrls = Array.from(html.matchAll(/(?:src|href)="(\/_expo\/[^"]+)"/g)).map((match) => match[1]);
        await Promise.all(
          assetUrls.map((assetUrl) =>
            fetch(assetUrl)
              .then((response) => (response.ok ? cache.put(assetUrl, response) : null))
              .catch(() => null)
          )
        );
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Any uncached route (e.g. a direct/offline open of /trip) falls back to the
        // cached app shell — Expo Router's client-side code then renders the right
        // screen from the real URL once it boots, no extra network request needed.
        const shell = await caches.match('/');
        if (shell) return shell;
        return Response.error();
      })
  );
});
