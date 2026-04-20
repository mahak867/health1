import { WebSocketServer } from 'ws';
import { setPublisher } from './publisher.js';
import { verifyAccessToken } from '../core/utils/jwt.js';
import { query } from '../config/db.js';

export { getPublisher } from './publisher.js';

const channels = new Map();

/**
 * Compute a stable channel key for a two-party conversation so both sides
 * share the same channel regardless of who opened the connection first.
 */
function pairKey(idA, idB) {
  return [idA, idB].sort().join(':');
}

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    let subscribedChannels = new Set();
    socket._userId = null; // set after successful "auth" message

    socket.on('message', async (raw) => {
      try {
        const message = JSON.parse(String(raw));

        // ── Auth ──────────────────────────────────────────────────────────────
        if (message.type === 'auth' && message.token) {
          try {
            const payload = verifyAccessToken(message.token);
            socket._userId = payload.sub;
            socket.send(JSON.stringify({ type: 'authenticated', userId: socket._userId }));
          } catch {
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token.' }));
          }
          return;
        }

        // ── Subscribe / unsubscribe ───────────────────────────────────────────
        if (message.type === 'subscribe' && message.channel) {
          const ch = message.channel;
          subscribedChannels.add(ch);
          if (!channels.has(ch)) channels.set(ch, new Set());
          channels.get(ch).add(socket);
          socket.send(JSON.stringify({ type: 'subscribed', channel: ch }));
          return;
        }

        if (message.type === 'unsubscribe' && message.channel) {
          const ch = message.channel;
          subscribedChannels.delete(ch);
          channels.get(ch)?.delete(socket);
          socket.send(JSON.stringify({ type: 'unsubscribed', channel: ch }));
          return;
        }

        // ── Ping ─────────────────────────────────────────────────────────────
        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // ── Trainer chat message ──────────────────────────────────────────────
        if (message.type === 'chat_message') {
          if (!socket._userId) {
            socket.send(JSON.stringify({ type: 'error', message: 'Authenticate first with type:"auth".' }));
            return;
          }

          const { toUserId, body: msgBody } = message;
          if (!toUserId || typeof msgBody !== 'string' || !msgBody.trim()) {
            socket.send(JSON.stringify({ type: 'error', message: 'chat_message requires toUserId and body.' }));
            return;
          }

          // Persist to DB
          const saved = await query(
            `INSERT INTO trainer_chat_messages (sender_id, recipient_id, body)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [socket._userId, toUserId, msgBody.trim().slice(0, 4000)]
          );
          const savedMsg = saved.rows[0];

          const channel = `trainer_chat:${pairKey(socket._userId, toUserId)}`;
          const envelope = JSON.stringify({ type: 'event', channel, payload: savedMsg, ts: Date.now() });

          // Deliver to all subscribers of this channel (includes sender's own tab)
          const clients = channels.get(channel) ?? new Set();
          for (const client of clients) {
            if (client.readyState === 1) client.send(envelope);
          }
          return;
        }

      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Malformed message' }));
      }
    });

    socket.on('close', () => {
      for (const ch of subscribedChannels) {
        channels.get(ch)?.delete(socket);
      }
    });
  });

  const publisher = {
    publish(channel, payload) {
      const clients = channels.get(channel) ?? new Set();
      const envelope = JSON.stringify({ type: 'event', channel, payload, ts: Date.now() });
      for (const client of clients) {
        if (client.readyState === 1) client.send(envelope);
      }
    }
  };

  // Make publisher available globally within the process
  setPublisher(publisher.publish.bind(publisher));

  return publisher;
}

