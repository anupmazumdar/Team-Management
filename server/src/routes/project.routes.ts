import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { authenticateToken, requireTeamRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

export const projectRouter = Router();

type ProjectWithMetricsPayload = Prisma.ProjectGetPayload<{
  include: {
    createdBy: {
      select: { id: true; fullName: true; avatarUrl: true };
    };
    tasks: {
      select: { id: true; status: true; priority: true };
    };
    _count: {
      select: {
        tasks: true;
        messages: true;
      };
    };
  };
}>;

type ProjectTaskItem = ProjectWithMetricsPayload['tasks'][number];

projectRouter.use(authenticateToken);

// List projects for active team
projectRouter.get('/', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const teamId = req.teamId!;

    const projects = await prisma.project.findMany({
      where: { teamId },
      include: {
        createdBy: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        tasks: {
          select: { id: true, status: true, priority: true },
        },
        _count: {
          select: {
            tasks: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const projectsWithMetrics = projects.map((p: ProjectWithMetricsPayload) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t: ProjectTaskItem) => t.status === 'APPROVED').length;
      const inProgressTasks = p.tasks.filter((t: ProjectTaskItem) => ['IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW'].includes(t.status)).length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        createdAt: p.createdAt,
        createdBy: p.createdBy,
        taskCount: totalTasks,
        completedCount: completedTasks,
        inProgressCount: inProgressTasks,
        progressPercentage,
        messageCount: p._count.messages,
      };
    });

    return res.json(projectsWithMetrics);
  } catch (err) {
    console.error('List projects error:', err);
    return res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// Create new project (lead/admin only)
projectRouter.post('/', requireTeamRole(['admin', 'lead']), async (req: Request, res: Response) => {
  try {
    const teamId = req.teamId!;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    const project = await prisma.project.create({
      data: {
        teamId,
        name: name.trim(),
        description: description || null,
        createdById: req.user!.id,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    await logActivity({
      teamId,
      actorId: req.user!.id,
      action: 'PROJECT_CREATED',
      projectId: project.id,
      details: { projectName: project.name },
    });

    return res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    return res.status(500).json({ error: 'Failed to create project.' });
  }
});

// Get project details + tasks + messages
projectRouter.get('/:projectId', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const teamId = req.teamId!;

    const project = await prisma.project.findFirst({
      where: { id: projectId, teamId },
      include: {
        createdBy: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, fullName: true, avatarUrl: true, title: true },
            },
            reviewer: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
            _count: {
              select: { comments: true, attachments: true, reviews: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    return res.json(project);
  } catch (err) {
    console.error('Get project error:', err);
    return res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// Update project
projectRouter.put('/:projectId', requireTeamRole(['admin', 'lead']), async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const teamId = req.teamId!;
    const { name, description, status } = req.body;

    const project = await prisma.project.findFirst({
      where: { id: projectId, teamId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error('Update project error:', err);
    return res.status(500).json({ error: 'Failed to update project.' });
  }
});
