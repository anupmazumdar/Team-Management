import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { authenticateToken, requireTeamRole } from '../middleware/auth.js';

export const activityRouter = Router();

activityRouter.use(authenticateToken);

// Get append-only audit trail for team
activityRouter.get('/:teamId', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { action, actorId, projectId, taskId, limit = '50', page = '1' } = req.query;

    const take = Math.min(parseInt(limit as string, 10) || 50, 100);
    const skip = ((parseInt(page as string, 10) || 1) - 1) * take;

    const where: any = { teamId };

    if (action && action !== 'all') {
      where.action = action as string;
    }

    if (actorId && actorId !== 'all') {
      where.actorId = actorId as string;
    }

    if (projectId && projectId !== 'all') {
      where.projectId = projectId as string;
    }

    if (taskId) {
      where.taskId = taskId as string;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, fullName: true, avatarUrl: true, title: true, email: true },
          },
          project: {
            select: { id: true, name: true },
          },
          task: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return res.json({
      logs,
      total,
      page: parseInt(page as string, 10) || 1,
      totalPages: Math.ceil(total / take),
    });
  } catch (err) {
    console.error('Get activity error:', err);
    return res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
});
