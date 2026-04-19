import React, { useEffect, useState } from 'react';
import { getQueueCount, triggerSync } from '../lib/db';

/**
 * Sticky banner shown at the top of every page when the device is offline or
 * there are queued mutations waiting to sync.
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline]     = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    // Listen for SW confirmation that the queue was flushed
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'QUEUE_FLUSHED') setQueueCount(0);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    // Poll the queue count every 4 s so the indicator stays accurate
    const poll = setInterval(async () => {
      setQueueCount(await getQueueCount());
    }, 4000);

    // Seed immediately
    getQueueCount().then(setQueueCount);

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
      clearInterval(poll);
    };
  }, []);

  // Nothing to show when fully online and queue is empty
  if (isOnline && queueCount === 0) return null;

  // Back online but still draining the queue
  if (isOnline && queueCount > 0) {
    return (
      <div className="bg-sky-500/10 border-b border-sky-500/20 px-4 py-1.5 flex items-center gap-2 text-xs text-sky-300">
        <span className="animate-spin inline-block leading-none">⟳</span>
        <span>
          Syncing {queueCount} queued action{queueCount > 1 ? 's' : ''}…
        </span>
      </div>
    );
  }

  // Offline
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center gap-2 text-xs text-amber-300">
      <span>📵</span>
      <span>You&apos;re offline — data will sync automatically when you reconnect.</span>
      {queueCount > 0 && (
        <span className="ml-auto font-bold bg-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
          {queueCount} pending
        </span>
      )}
    </div>
  );
}
