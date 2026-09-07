import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

export const exportRouter = Router();

// Helper to escape CSV fields
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// 1. Export Entire Workspace Data (JSON Backup)
exportRouter.get('/workspace', authenticateToken, async (req: Request, res: Response) => {
  try {
    const teamId = (req.headers['x-team-id'] as string) || req.query.teamId as string;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required.' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true, title: true, avatarUrl: true, authProvider: true },
            },
          },
        },
        projects: true,
        tasks: {
          include: {
            assignedTo: { select: { id: true, email: true, fullName: true } },
            reviewer: { select: { id: true, email: true, fullName: true } },
            createdBy: { select: { id: true, email: true, fullName: true } },
            reviews: true,
            comments: {
              include: { user: { select: { id: true, fullName: true } } },
            },
          },
        },
        internshipPeriods: true,
        activityLogs: {
          take: 500,
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        exportedBy: req.user?.email,
        version: '1.0',
        platform: 'HustleX Team Workspace',
      },
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        createdAt: team.createdAt,
      },
      members: team.members.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      projects: team.projects,
      tasks: team.tasks,
      internshipRoadmap: team.internshipPeriods,
      activityLogs: team.activityLogs,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="hustlex-${team.slug}-workspace-export-${Date.now()}.json"`
    );
    return res.json(exportData);
  } catch (err: any) {
    console.error('Export workspace error:', err);
    return res.status(500).json({ error: 'Failed to export workspace data.', details: err.message });
  }
});

// 2. Export Tasks & Deliverables (CSV)
exportRouter.get('/tasks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const teamId = (req.headers['x-team-id'] as string) || req.query.teamId as string;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required.' });
    }

    const tasks = await prisma.task.findMany({
      where: { teamId },
      include: {
        project: { select: { name: true } },
        assignedTo: { select: { fullName: true, email: true } },
        reviewer: { select: { fullName: true, email: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Task ID',
      'Title',
      'Project',
      'Category',
      'Priority',
      'Status',
      'Assignee Name',
      'Assignee Email',
      'Reviewer Name',
      'Deadline',
      'Accepted At',
      'Delivered At',
      'Delivered On Time',
      'Created By',
      'Created At',
      'Mission Details',
      'Description',
    ];

    const rows = tasks.map((t) => [
      escapeCsv(t.id),
      escapeCsv(t.title),
      escapeCsv(t.project?.name || ''),
      escapeCsv(t.category),
      escapeCsv(t.priority),
      escapeCsv(t.status),
      escapeCsv(t.assignedTo?.fullName || 'Unassigned'),
      escapeCsv(t.assignedTo?.email || ''),
      escapeCsv(t.reviewer?.fullName || 'None'),
      escapeCsv(t.deadline ? t.deadline.toISOString() : ''),
      escapeCsv(t.acceptedAt ? t.acceptedAt.toISOString() : ''),
      escapeCsv(t.deliveredAt ? t.deliveredAt.toISOString() : ''),
      escapeCsv(t.isOnTime === null ? 'N/A' : t.isOnTime ? 'YES' : 'NO'),
      escapeCsv(t.createdBy?.fullName || ''),
      escapeCsv(t.createdAt.toISOString()),
      escapeCsv(t.missionDetails || ''),
      escapeCsv(t.description || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tasks-export-${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (err: any) {
    console.error('Export tasks error:', err);
    return res.status(500).json({ error: 'Failed to export tasks.' });
  }
});

// 3. Export Team Governance & SLA Scorecard (CSV)
exportRouter.get('/team', authenticateToken, async (req: Request, res: Response) => {
  try {
    const teamId = (req.headers['x-team-id'] as string) || req.query.teamId as string;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required.' });
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId, removedAt: null },
      include: {
        user: { select: { fullName: true, email: true, title: true } },
      },
    });

    const headers = [
      'Member Name',
      'Email',
      'Title',
      'Role',
      'Joined At',
      'Assigned Tasks',
      'Completed Tasks',
      'Pending Tasks',
      'Approval Rate (%)',
      'On Time SLA Rate (%)',
    ];

    const rows = await Promise.all(
      members.map(async (m) => {
        const assigned = await prisma.task.count({ where: { teamId, assignedToId: m.userId } });
        const completed = await prisma.task.count({ where: { teamId, assignedToId: m.userId, status: 'APPROVED' } });
        const pending = await prisma.task.count({
          where: {
            teamId,
            assignedToId: m.userId,
            status: { in: ['IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUIRED'] },
          },
        });
        const approvedReviews = await prisma.taskReview.count({
          where: { reviewedByUserId: m.userId, decision: 'APPROVED' },
        });
        const totalReviews = await prisma.taskReview.count({
          where: { reviewedByUserId: m.userId },
        });
        const approvalRate = totalReviews > 0 ? Math.round((approvedReviews / totalReviews) * 100) : 100;

        const deliveredCount = await prisma.task.count({
          where: { teamId, assignedToId: m.userId, deliveredAt: { not: null } },
        });
        const onTimeCount = await prisma.task.count({
          where: { teamId, assignedToId: m.userId, deliveredAt: { not: null }, isOnTime: true },
        });
        const onTimeRate = deliveredCount > 0 ? Math.round((onTimeCount / deliveredCount) * 100) : 100;

        return [
          escapeCsv(m.user.fullName),
          escapeCsv(m.user.email),
          escapeCsv(m.user.title || ''),
          escapeCsv(m.role.toUpperCase()),
          escapeCsv(m.joinedAt.toISOString()),
          assigned,
          completed,
          pending,
          approvalRate,
          onTimeRate,
        ];
      })
    );

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="team-scorecard-${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (err: any) {
    console.error('Export team error:', err);
    return res.status(500).json({ error: 'Failed to export team scorecard.' });
  }
});

// 4. Export Audit Logs & Verification Snapshots (CSV)
exportRouter.get('/activity', authenticateToken, async (req: Request, res: Response) => {
  try {
    const teamId = (req.headers['x-team-id'] as string) || req.query.teamId as string;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required.' });
    }

    const logs = await prisma.activityLog.findMany({
      where: { teamId },
      include: {
        actor: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const headers = ['Timestamp', 'Action', 'Actor Name', 'Actor Email', 'Details'];

    const rows = logs.map((l) => [
      escapeCsv(l.createdAt.toISOString()),
      escapeCsv(l.action),
      escapeCsv(l.actor.fullName),
      escapeCsv(l.actor.email),
      escapeCsv(JSON.stringify(l.details)),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activity-audit-${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (err: any) {
    console.error('Export activity error:', err);
    return res.status(500).json({ error: 'Failed to export audit logs.' });
  }
});
