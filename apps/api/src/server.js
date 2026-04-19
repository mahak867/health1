import http from 'http';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { attachWebSocket } from './websocket/gateway.js';

const app = buildApp();
const server = http.createServer(app);
const wsGateway = attachWebSocket(server);

server.listen(env.port, () => {
  console.log(`API listening on port ${env.port}`);
});

process.on('SIGTERM', () => {
  wsGateway.publish('system', { type: 'shutdown' });
  server.close(() => process.exit(0));
});
