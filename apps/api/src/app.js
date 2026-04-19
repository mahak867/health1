import express from 'express';
import morgan from 'morgan';
import { securityMiddleware } from './core/middleware/security.js';
import { requireAuth } from './core/middleware/auth.js';
import { auditLog } from './core/middleware/audit.js';
import { errorHandler, notFound } from './core/middleware/error.js';
import { simpleRateLimit } from './core/middleware/rateLimit.js';
import { authRouter } from './modules/auth/routes.js';
import { healthModuleRouter } from './modules/health/routes.js';
import { fitnessRouter } from './modules/fitness/routes.js';
import { nutritionRouter } from './modules/nutrition/routes.js';
import { wearablesRouter } from './modules/wearables/routes.js';
import { telemedicineRouter } from './modules/telemedicine/routes.js';
import { notificationsRouter } from './modules/notifications/routes.js';
import { exportsRouter } from './modules/exports/routes.js';
import { rankingRouter } from './modules/ranking/routes.js';
import { modesRouter } from './modules/modes/routes.js';
import { aiRouter } from './modules/ai/routes.js';
import { socialRouter } from './modules/social/routes.js';

export function buildApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('combined'));
  app.use(securityMiddleware);
  app.use(simpleRateLimit());

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/health', requireAuth, auditLog, healthModuleRouter);
  app.use('/api/v1/fitness', requireAuth, auditLog, fitnessRouter);
  app.use('/api/v1/nutrition', requireAuth, auditLog, nutritionRouter);
  app.use('/api/v1/wearables', requireAuth, auditLog, wearablesRouter);
  app.use('/api/v1/telemedicine', requireAuth, auditLog, telemedicineRouter);
  app.use('/api/v1/notifications', requireAuth, auditLog, notificationsRouter);
  app.use('/api/v1/exports', requireAuth, auditLog, exportsRouter);
  app.use('/api/v1/ranking', requireAuth, auditLog, rankingRouter);
  app.use('/api/v1/modes', requireAuth, auditLog, modesRouter);
  app.use('/api/v1/ai', requireAuth, auditLog, aiRouter);
  app.use('/api/v1/social', requireAuth, auditLog, socialRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
