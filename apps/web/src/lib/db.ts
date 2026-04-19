/**
 * Thin IndexedDB helper used by the main thread to inspect the offline queue
 * that the Service Worker manages.  The SW and this module share the same DB
 * name + store names so they naturally stay in sync.
 */

const DB_NAME     = 'hs-offline';
const QUEUE_STORE = 'mutations';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE))
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('api_responses'))
        db.createObjectStore('api_responses', { keyPath: 'url' });
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = () => reject(req.error);
  });
}

/** Returns the number of mutations currently queued for sync. */
export async function getQueueCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(QUEUE_STORE, 'readonly');
      const req = tx.objectStore(QUEUE_STORE).count();
      req.onsuccess = () => resolve((req as IDBRequest<number>).result);
      req.onerror   = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

/**
 * Tells the active Service Worker to replay all queued mutations against the
 * API.  Safe to call without checking SW availability first.
 */
export function triggerSync(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'FLUSH_QUEUE' });
  }
}

/** Register the Service Worker (call once on app boot). */
export function registerSW(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}
