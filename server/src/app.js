import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import api from './routes/api.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { publicClient } from './config/supabase.js';

export const app = express();
const origins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((value) => value.trim());
const isAllowedOrigin = (origin) => Boolean(origin && origins.includes(origin));
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)), credentials: true, allowedHeaders: ['Content-Type', 'X-Organization-Id', 'Idempotency-Key', 'X-File-Name'], methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!isAllowedOrigin(req.get('origin'))) return res.status(403).json({ success: false, code: 'CSRF_REJECTED', message: 'This request origin is not allowed.' });
  next();
});
app.use(express.json({ limit: '256kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/health', (_req, res) => res.json({ success: true, data: { api: 'ok', supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) } }));
app.get('/ready', async (_req, res) => {
  try {
    const { data, error } = await publicClient().rpc('application_health');
    if (error || data !== 'ok') return res.status(503).json({ success: false, data: { ready: false, database: 'unavailable' }, message: 'Supabase database readiness check failed. Confirm the development migration is applied.' });
    return res.json({ success: true, data: { ready: true, database: 'connected' } });
  } catch {
    return res.status(503).json({ success: false, data: { ready: false, database: 'not_configured' }, message: 'Set the Supabase URL and publishable key in server/.env.' });
  }
});
app.use('/api/v1', api);
app.use(notFound);
app.use(errorHandler);
