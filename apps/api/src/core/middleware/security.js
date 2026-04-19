import cors from 'cors';
import helmet from 'helmet';
import { env } from '../../config/env.js';

export const securityMiddleware = [
  helmet(),
  cors({
    origin(origin, callback) {
      if (!origin || env.allowedOrigins.length === 0 || env.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS origin not allowed'));
      }
    },
    credentials: true
  })
];
