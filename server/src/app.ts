import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import authRouter from './routes/auth.routes';
import usersRouter from './routes/users.routes';
import connectionsRouter from './routes/connections.routes';
import suggestionsRouter from './routes/suggestions.routes';
import postsRouter from './routes/posts.routes';
import messagesRouter from './routes/messages.routes';
import { feedRouter, hashtagRouter } from './routes/feed.routes';
import { jobsRouter, applicationsRouter, recruiterRouter } from './routes/jobs.routes';
import assessmentRouter from './routes/assessment.routes';
import answersRouter from './routes/answers.routes';
import eventsRouter from './routes/events.routes';
import verifyRouter from './routes/verify.routes';
// billingRouter import removed — billing disabled (Stripe not configured)
import companiesRouter from './routes/companies.routes';
import notificationsRouter from './routes/notifications.routes';
import privacyRouter from './routes/privacy.routes';
import skillsRouter from './routes/skills.routes';
import recruiterDashRouter from './routes/recruiter.routes';
import { errorHandler } from './middleware/error.middleware';
import mongoose from 'mongoose';
import { getRedis } from './config/redis';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'https://skillseal.tech',
        'https://www.skillseal.tech',
        process.env.CLIENT_URL || 'http://localhost:5173',
      ],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
const allowedOrigins = [
  process.env.CLIENT_URL,
  // Explicitly cover both www and non-www regardless of CLIENT_URL value.
  // The 403 on login was caused by the browser sending origin
  // "https://www.skillseal.tech" while CLIENT_URL was set without "www".
  'https://skillseal.tech',
  'https://www.skillseal.tech',
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean) as string[];
app.use(cors({
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  }, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  let redisOk = false;
  try { await getRedis().ping(); redisOk = true; } catch { /* redis not ready */ }
  res.status(mongoOk && redisOk ? 200 : 503).json({
    status: mongoOk && redisOk ? 'ok' : 'degraded',
    mongodb: mongoOk,
    redis: redisOk,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/connections', connectionsRouter);
app.use('/api/v1/suggestions', suggestionsRouter);
app.use('/api/v1/posts', postsRouter);
app.use('/api/v1/feed', feedRouter);
app.use('/api/v1/hashtags', hashtagRouter);
app.use('/api/v1/messages', messagesRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/applications', applicationsRouter);
app.use('/api/v1/recruiter', recruiterRouter);
app.use('/api/v1/recruiter', recruiterDashRouter);
app.use('/api/v1/sessions', assessmentRouter);
app.use('/api/v1/answers', answersRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/verify', verifyRouter);
// app.use('/api/v1/billing',        billingRouter);
app.use('/api/v1/companies', companiesRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/privacy', privacyRouter);
app.use('/api/v1/skills', skillsRouter);

// Root path — redirect uptime monitors / health checkers to /health.
// Without this, any checker hitting "/" gets a 404 and reports the
// service as down even when it is fully operational.
app.get('/', (_req, res) => res.redirect(301, '/health'));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

export default app;
