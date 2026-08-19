import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import { databaseStatus } from './config/database.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { requestContext } from './middleware/requestContext.js';
import { requestLogger } from './middleware/requestLogger.js';
import { sanitizeInput } from './middleware/sanitize.js';
import { apiRouter } from './routes/index.js';
import { authSettingsRepository } from './repositories/authSettingsRepository.js';
import { AppError } from './utils/AppError.js';
import { installSlowQueryDetection } from './utils/slowQuery.js';

installSlowQueryDetection();
authSettingsRepository.bootstrapFromEnv().catch((err) => console.warn('[qavlio] failed to bootstrap auth settings', err));

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    // Sandbox/preview hosts (e.g. https://5173-<id>.e2b.app) are allowed outside production
    // only. This matches the origin allowance used by requireTrustedOrigin.
    const allowed = !origin || env.clientOrigins.includes(origin) || (env.nodeEnv !== 'production' && /^https:\/\/[^/]+\.e2b\.app$/.test(origin));
    callback(allowed ? null : new AppError(403, 'Request origin is not allowed', 'ORIGIN_NOT_ALLOWED'), allowed);
  },
};

app.use(requestContext);
app.use(requestLogger);
// Marketplace-appropriate security headers. CSP is deliberately configured so
// listings/media from CDNs, Google Fonts and websocket/API traffic are allowed
// while inline script injection remains blocked.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      mediaSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: env.nodeEnv === 'test' ? 1000 : 300, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '256kb', verify: (req: any, _res, buffer) => { if (req.originalUrl?.endsWith('/payments/webhook')) req.rawBody = buffer.toString('utf8'); } }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(hpp());
app.use(sanitizeInput);

app.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, service: 'qavlio-api', status: 'ok', database: databaseStatus(), timestamp: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
  const db = databaseStatus();
  const checks = { database: db === 'connected' };
  const ready = db === 'connected';
  res.set('Cache-Control', 'no-store');
  res.status(ready ? 200 : 503).json({ success: ready, service: 'qavlio-api', ready, checks, timestamp: new Date().toISOString() });
});

app.use(env.apiPrefix, apiRouter);
app.use(notFound);
app.use(errorHandler);
