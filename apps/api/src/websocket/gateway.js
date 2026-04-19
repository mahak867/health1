import { WebSocketServer } from 'ws';

const channels = new Map();

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    let channel = null;

    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(String(raw));
        if (message.type === 'subscribe' && message.channel) {
          channel = message.channel;
          if (!channels.has(channel)) channels.set(channel, new Set());
          channels.get(channel).add(socket);
          socket.send(JSON.stringify({ type: 'subscribed', channel }));
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Malformed message' }));
      }
    });

    socket.on('close', () => {
      if (channel && channels.has(channel)) channels.get(channel).delete(socket);
    });
  });

  return {
    publish(channel, payload) {
      const clients = channels.get(channel) ?? new Set();
      for (const client of clients) {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: 'event', channel, payload }));
        }
      }
    }
  };
}
