/**
 * Lightweight WebSocket singleton for real-time events from the HealthSphere
 * backend gateway (`/ws`).
 *
 * Usage:
 *   import { initWS, subscribe } from '../lib/ws';
 *
 *   // Initialise once at app startup:
 *   initWS('http://localhost:4000/api/v1');
 *
 *   // Subscribe to a channel inside a component:
 *   useEffect(() => subscribe('nutrition', (payload) => { ... }), []);
 *   // The returned function unsubscribes when called (perfect for cleanup).
 */

type Handler = (payload: unknown) => void;

const handlers = new Map<string, Set<Handler>>();
let socket: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let _wsUrl = '';

function connect() {
  // Skip if already connecting / open, or if we don't have a URL yet
  if (
    !_wsUrl ||
    socket?.readyState === WebSocket.CONNECTING ||
    socket?.readyState === WebSocket.OPEN
  ) return;

  try {
    socket = new WebSocket(_wsUrl);
  } catch {
    return;
  }

  socket.onopen = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    // Re-subscribe to all active channels after reconnection
    for (const channel of handlers.keys()) {
      socket!.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(String(event.data));
      if (msg.type === 'event' && msg.channel) {
        handlers.get(msg.channel)?.forEach((h) => h(msg.payload));
      }
    } catch { /* ignore malformed frames */ }
  };

  socket.onclose = () => {
    socket = null;
    // Exponential back-off capped at 5 s for a smooth UX
    reconnectTimeout = setTimeout(connect, 5000);
  };

  socket.onerror = () => socket?.close();
}

/**
 * Initialise the WebSocket connection.
 * Converts the REST base URL (e.g. `http://localhost:4000/api/v1`) to the WS
 * gateway endpoint (`ws://localhost:4000/ws`).
 */
export function initWS(apiBaseUrl: string): void {
  _wsUrl = apiBaseUrl
    .replace(/^http/, 'ws')       // http→ws, https→wss
    .replace(/\/api\/v\d+\/?$/, '') // strip /api/v1
    + '/ws';
  connect();
}

/**
 * Subscribe to a WebSocket channel.
 *
 * @returns An unsubscribe function — call it to remove the handler (e.g. in a
 *          `useEffect` cleanup).
 */
export function subscribe(channel: string, handler: Handler): () => void {
  if (!handlers.has(channel)) handlers.set(channel, new Set());
  handlers.get(channel)!.add(handler);

  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'subscribe', channel }));
  }

  return () => {
    const set = handlers.get(channel);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      handlers.delete(channel);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'unsubscribe', channel }));
      }
    }
  };
}
