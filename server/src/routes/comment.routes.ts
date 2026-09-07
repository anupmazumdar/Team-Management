import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { authenticateToken, requireTeamRole } from '../middleware/auth.js';
import { logActivity, createNotification } from '../utils/logger.js';

export const commentRouter = Router();

commentRouter.use(authenticateToken);

// Get comments for a task
commentRouter.get('/:taskId', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true, title: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json(comments);
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// Add comment to task discussion thread
commentRouter.post('/:taskId', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const teamId = req.teamId!;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required.' });
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId },
      include: { assignedTo: true, reviewer: true },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        userId: req.user!.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true, title: true, email: true },
        },
      },
    });

    await logActivity({
      teamId,
      actorId: req.user!.id,
      action: 'TASK_COMMENT_ADDED',
      projectId: task.projectId,
      taskId: task.id,
      details: {
        taskTitle: task.title,
        commentPreview: content.trim().substring(0, 60),
      },
    });

    // Notify assignee or reviewer if they didn't write the comment
    const targets = new Set<string>();
    if (task.assignedToId && task.assignedToId !== req.user!.id) {
      targets.add(task.assignedToId);
    }
    if (task.reviewerId && task.reviewerId !== req.user!.id) {
      targets.add(task.reviewerId);
    }

    for (const targetId of targets) {
      await createNotification({
        userId: targetId,
        teamId,
        type: 'NEW_MESSAGE',
        title: `New comment on "${task.title}"`,
        message: `${req.user!.fullName}: ${content.trim().substring(0, 80)}`,
        link: `/tasks/${task.id}`,
      });
    }

    return res.status(201).json(comment);
  } catch (err) {
    console.error('Add comment error:', err);
    return res.status(500).json({ error: 'Failed to add comment.' });
  }
});
