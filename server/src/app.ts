import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { authRouter } from './routes/auth.routes.js';
import { teamRouter } from './routes/team.routes.js';
import { projectRouter } from './routes/project.routes.js';
import { taskRouter } from './routes/task.routes.js';
import { commentRouter } from './routes/comment.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { internshipRouter } from './routes/internship.routes.js';
import { activityRouter } from './routes/activity.routes.js';
import { notificationRouter } from './routes/notification.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { exportRouter } from './routes/export.routes.js';

import { ENV } from './config/env.js';

export const app = express();

// Allowed CORS origins
const rawOrigins = [
  ENV.CLIENT_URL,
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : []),
  'https://team-management-client-ten.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];
const allowedOrigins = Array.from(new Set(rawOrigins.filter(Boolean)));

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // Allow all Vercel deployments (production, preview, branch)
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-team-id', 'Accept'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Serve uploaded files statically with security headers (download attachment, nosniff)
const uploadsPath = path.resolve(process.cwd(), 'uploads');
app.use(
  '/uploads',
  express.static(uploadsPath, {
    setHeaders: (res) => {
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/teams', teamRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/comments', commentRouter);
app.use('/api/chat', chatRouter);
app.use('/api/internship', internshipRouter);
app.use('/api/activity', activityRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/uploads', uploadRouter);
app.use('/api/export', exportRouter);

// Root healthcheck
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Hustlex Team Workspace API',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Something went wrong',
  });
});

export default app;
