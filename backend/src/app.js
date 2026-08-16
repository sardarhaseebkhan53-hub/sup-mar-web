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
import { sanitizeInput } from './middleware/sanitize.js';
import { apiRouter } from './routes/index.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    const allowed = !origin || env.clientOrigins.includes(origin) || (env.nodeEnv !== 'production' && /^https:\/\/[^/]+\.e2b\.app$/.test(origin));
    callback(allowed ? null : new Error('Origin is not allowed by CORS'), allowed);
  },
};

app.use(requestContext);
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: env.nodeEnv === 'test' ? 1000 : 300, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(hpp());
app.use(sanitizeInput);

app.get('/health', (_req, res) => {
  res.json({ success: true, service: 'dealhub-api', status: 'ok', database: databaseStatus(), timestamp: new Date().toISOString() });
});
app.use(env.apiPrefix, apiRouter);
app.use(notFound);
app.use(errorHandler);
