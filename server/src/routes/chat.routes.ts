import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { authenticateToken, requireTeamRole } from '../middleware/auth.js';

export const chatRouter = Router();

chatRouter.use(authenticateToken);

// Get messages for project channel
chatRouter.get('/:projectId/messages', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const teamId = req.teamId!;

    // Verify project exists in team
    const project = await prisma.project.findFirst({
      where: { id: projectId, teamId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const messages = await prisma.message.findMany({
      where: { projectId, teamId },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true, title: true, email: true },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});
