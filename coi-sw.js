/* coi-sw.js: adds the COOP/COEP headers that SharedArrayBuffer (threaded Stockfish) needs.
 * GitHub Pages can't set headers itself, so this service worker does it.
 * Based on the MIT-licensed coi-serviceworker idea by Guido Zuidhof. */
const safari = /^((?!chrome|android).)*safari/i.test(self.navigator.userAgent);
const COEP = safari ? 'require-corp' : 'credentialless'; // Safari has no "credentialless"

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') return;
  const req = (COEP === 'credentialless' && r.mode === 'no-cors') ? new Request(r, { credentials: 'omit' }) : r;
  e.respondWith(fetch(req).then(res => {
    if (res.status === 0) return res;
    const h = new Headers(res.headers);
    h.set('Cross-Origin-Embedder-Policy', COEP);
    h.set('Cross-Origin-Opener-Policy', 'same-origin');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  }).catch(err => { console.error(err); return Response.error(); }));
});
