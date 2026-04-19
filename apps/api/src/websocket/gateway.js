import { WebSocketServer } from 'ws';
import { setPublisher } from './publisher.js';

export { getPublisher } from './publisher.js';

const channels = new Map();

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    let subscribedChannels = new Set();

    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(String(raw));

        if (message.type === 'subscribe' && message.channel) {
          const ch = message.channel;
          subscribedChannels.add(ch);
          if (!channels.has(ch)) channels.set(ch, new Set());
          channels.get(ch).add(socket);
          socket.send(JSON.stringify({ type: 'subscribed', channel: ch }));
        }

        if (message.type === 'unsubscribe' && message.channel) {
          const ch = message.channel;
          subscribedChannels.delete(ch);
          channels.get(ch)?.delete(socket);
          socket.send(JSON.stringify({ type: 'unsubscribed', channel: ch }));
        }

        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
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
