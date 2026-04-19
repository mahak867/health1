/* ─────────────────────────────────────────────────────────────────────────────
   HealthSphere Service Worker
   Strategy:
     • Static / font assets  → Stale-while-revalidate (instant load, background refresh)
     • SPA navigation         → Network-first, fallback to cached index.html
     • API GET                → Network-first, IndexedDB cache fallback (offline reads)
     • API mutations          → Network-first, queue in IndexedDB when offline
     • Background Sync        → Auto-flushes the mutation queue when connectivity returns
   ───────────────────────────────────────────────────────────────────────────── */

const STATIC_CACHE = 'hs-static-v1';
const FONT_CACHE   = 'hs-fonts-v1';
const DB_NAME      = 'hs-offline';
const QUEUE_STORE  = 'mutations';
const RESP_STORE   = 'api_responses';

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE))
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains(RESP_STORE))
        db.createObjectStore(RESP_STORE, { keyPath: 'url' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = reject;
  });
}

async function dbPut(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = resolve;
    tx.onerror    = reject;
  });
}

async function dbAdd(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).add(value);
    tx.oncomplete = resolve;
    tx.onerror    = reject;
  });
}

async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = resolve;
    tx.onerror    = reject;
  });
}

async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => resolve(null);
  });
}

// ─── Flush offline mutation queue ─────────────────────────────────────────────

async function flushQueue() {
  let items;
  try { items = await dbGetAll(QUEUE_STORE); } catch { return; }

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method:  item.method,
        headers: item.headers,
        body:    item.body ?? undefined,
      });
      // Remove on any definitive response (even 4xx — retrying bad requests is futile)
      if (res.status < 500) {
        await dbDelete(QUEUE_STORE, item.id).catch(() => {});
      }
    } catch {
      // Network still down — stop processing
      break;
    }
  }

  // Notify all open windows so they can refresh their queue count
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) => c.postMessage({ type: 'QUEUE_FLUSHED' }));
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  // Take control immediately without waiting for old SW to be released
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== FONT_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http(s), WebSocket upgrades, or browser-extension requests
  if (!url.protocol.startsWith('http')) return;
  if (request.headers.get('upgrade') === 'websocket') return;

  const isAPI   = url.pathname.startsWith('/api/');
  const isFont  = url.hostname.includes('fonts.g');
  const isMut   = request.method !== 'GET' && request.method !== 'HEAD';

  // ── Mutations → queue on network failure ──────────────────────────────────
  if (isMut && isAPI) {
    event.respondWith(
      request.clone().text().then((body) => {
        const headers = {};
        request.headers.forEach((v, k) => { headers[k] = v; });
        return fetch(request.clone()).catch(async () => {
          await dbAdd(QUEUE_STORE, {
            method:    request.method,
            url:       request.url,
            headers,
            body:      body || null,
            timestamp: Date.now(),
          }).catch(() => {});
          return new Response(
            JSON.stringify({ offline: true, queued: true }),
            { status: 202, headers: { 'Content-Type': 'application/json' } }
          );
        });
      })
    );
    return;
  }

  // ── SPA navigation → network first, fallback to cached shell ──────────────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match('/') || await caches.match('/index.html');
        return cached ?? new Response(
          '<!doctype html><html><head><meta charset="utf-8"><title>HealthSphere</title></head><body style="background:#0b0b12;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;"><div style="text-align:center"><h1>📵 Offline</h1><p>HealthSphere will be available when you reconnect.</p></div></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
    return;
  }

  // ── Google Fonts → cache first ─────────────────────────────────────────────
  if (isFont) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(request).then((hit) => {
          if (hit) return hit;
          return fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => new Response('', { status: 408 }));
        })
      )
    );
    return;
  }

  // ── API GET → network first, IndexedDB fallback ────────────────────────────
  if (isAPI) {
    event.respondWith(
      fetch(request.clone())
        .then(async (res) => {
          if (res.ok) {
            try {
              const data = await res.clone().json();
              await dbPut(RESP_STORE, { url: request.url, data, ts: Date.now() });
            } catch { /* response not JSON-able, skip caching */ }
          }
          return res;
        })
        .catch(async () => {
          const entry = await dbGet(RESP_STORE, request.url);
          if (entry) {
            return new Response(JSON.stringify(entry.data), {
              status:  200,
              headers: { 'Content-Type': 'application/json', 'X-Cache': 'offline' },
            });
          }
          return new Response(
            JSON.stringify({ error: 'Offline — no cached data available', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // ── Static assets → stale-while-revalidate ────────────────────────────────
  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const networkRequest = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached ?? new Response('', { status: 408 }));
        // Serve from cache immediately if available, revalidate in background
        return cached ?? networkRequest;
      })
    )
  );
});

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'hs-flush') {
    event.waitUntil(flushQueue());
  }
});

// ─── Messages from main thread ────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FLUSH_QUEUE')  event.waitUntil(flushQueue());
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
