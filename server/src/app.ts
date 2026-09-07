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

export const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically if local
const uploadsPath = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

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
