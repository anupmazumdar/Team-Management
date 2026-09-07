import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { authenticateToken, requireTeamRole } from '../middleware/auth.js';
import { logActivity, createNotification } from '../utils/logger.js';

export const teamRouter = Router();

// Apply auth to all team routes
teamRouter.use(authenticateToken);

// List all teams the current user belongs to
teamRouter.get('/', async (req: Request, res: Response) => {
  try {
    const memberships = await prisma.teamMember.findMany({
      where: {
        userId: req.user!.id,
        removedAt: null,
      },
      include: {
        team: {
          include: {
            _count: {
              select: {
                members: { where: { removedAt: null } },
                projects: true,
                tasks: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const teams = memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      slug: m.team.slug,
      description: m.team.description,
      currentUserRole: m.role,
      joinedAt: m.joinedAt,
      stats: {
        memberCount: m.team._count.members,
        projectCount: m.team._count.projects,
        taskCount: m.team._count.tasks,
      },
    }));

    return res.json(teams);
  } catch (err) {
    console.error('List teams error:', err);
    return res.status(500).json({ error: 'Failed to fetch teams.' });
  }
});

// Create new team
teamRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required.' });
    }

    const baseSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // Create team and creator as admin
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name: name.trim(),
          slug,
          description: description || null,
          createdById: req.user!.id,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: req.user!.id,
          role: 'admin',
        },
      });

      // Initialize default 6-month internship roadmap for this team
      const monthTemplates = [
        {
          monthNumber: 1,
          monthTitle: 'Month 1: Orientation & Onboarding',
          milestones: [
            { id: 'm1-1', title: 'Setup local development environment & Git workflows', completed: true, dueDate: 'Week 2' },
            { id: 'm1-2', title: 'Complete HustleX codebase orientation & architectural review', completed: true, dueDate: 'Week 4' },
          ],
          completionPercentage: 100,
          status: 'COMPLETED',
        },
        {
          monthNumber: 2,
          monthTitle: 'Month 2: Frontend Mastery & Component Architecture',
          milestones: [
            { id: 'm2-1', title: 'Implement dynamic state machines & form validation', completed: true, dueDate: 'Week 2' },
            { id: 'm2-2', title: 'Build responsive design system & theme customization', completed: false, dueDate: 'Week 4' },
          ],
          completionPercentage: 50,
          status: 'IN_PROGRESS',
        },
        {
          monthNumber: 3,
          monthTitle: 'Month 3: Backend API Design & Database Schema',
          milestones: [
            { id: 'm3-1', title: 'Design normalized PostgreSQL models & Prisma migrations', completed: false, dueDate: 'Week 2' },
            { id: 'm3-2', title: 'Implement dynamic per-team role permissions middleware', completed: false, dueDate: 'Week 4' },
          ],
          completionPercentage: 20,
          status: 'IN_PROGRESS',
        },
        {
          monthNumber: 4,
          monthTitle: 'Month 4: Real-time Collaboration & Socket.IO',
          milestones: [
            { id: 'm4-1', title: 'Build project-level WebSockets chat & presence tracking', completed: false, dueDate: 'Week 2' },
            { id: 'm4-2', title: 'System alert broadcast on status transitions', completed: false, dueDate: 'Week 4' },
          ],
          completionPercentage: 0,
          status: 'UPCOMING',
        },
        {
          monthNumber: 5,
          monthTitle: 'Month 5: Automated Testing & Review Pipeline',
          milestones: [
            { id: 'm5-1', title: 'Implement approval verification state machine', completed: false, dueDate: 'Week 2' },
            { id: 'm5-2', title: 'Reviewer snapshotting & audit history verification', completed: false, dueDate: 'Week 4' },
          ],
          completionPercentage: 0,
          status: 'UPCOMING',
        },
        {
          monthNumber: 6,
          monthTitle: 'Month 6: Capstone Project Delivery & Final Review',
          milestones: [
            { id: 'm6-1', title: 'Full-stack production deployment & performance optimization', completed: false, dueDate: 'Week 2' },
            { id: 'm6-2', title: 'Final internship presentation & lead review', completed: false, dueDate: 'Week 4' },
          ],
          completionPercentage: 0,
          status: 'UPCOMING',
        },
      ];

      const now = new Date();
      for (const tpl of monthTemplates) {
        const startDate = new Date(now.getFullYear(), now.getMonth() + (tpl.monthNumber - 1), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + tpl.monthNumber, 0);

        await tx.internshipPeriod.create({
          data: {
            teamId: newTeam.id,
            monthNumber: tpl.monthNumber,
            monthTitle: tpl.monthTitle,
            startDate,
            endDate,
            milestones: tpl.milestones,
            completionPercentage: tpl.completionPercentage,
            status: tpl.status,
          },
        });
      }

      return newTeam;
    });

    await logActivity({
      teamId: team.id,
      actorId: req.user!.id,
      action: 'TEAM_CREATED',
      details: { teamName: team.name },
    });

    return res.status(201).json(team);
  } catch (err) {
    console.error('Create team error:', err);
    return res.status(500).json({ error: 'Failed to create team.' });
  }
});

// Get team details and active members (with task & approval metrics)
teamRouter.get('/:teamId', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { removedAt: null },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                title: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            _count: { select: { tasks: true } },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    // Compute task counts and approval rate for each member
    const membersWithStats = await Promise.all(
      team.members.map(async (m) => {
        const assignedTasks = await prisma.task.count({
          where: { teamId, assignedToId: m.userId },
        });

        const completedTasks = await prisma.task.count({
          where: { teamId, assignedToId: m.userId, status: 'APPROVED' },
        });

        const pendingTasks = await prisma.task.count({
          where: {
            teamId,
            assignedToId: m.userId,
            status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUIRED'] },
          },
        });

        // Reviews received on this member's tasks
        const approvedReviews = await prisma.taskReview.count({
          where: {
            task: { teamId, assignedToId: m.userId },
            decision: 'APPROVED',
          },
        });

        const totalReviews = await prisma.taskReview.count({
          where: {
            task: { teamId, assignedToId: m.userId },
          },
        });

        const approvalRate = totalReviews > 0 ? Math.round((approvedReviews / totalReviews) * 100) : 100;

        // On-Time Delivery Rate
        const onTimeTasks = await prisma.task.count({
          where: {
            teamId,
            assignedToId: m.userId,
            status: 'APPROVED',
            isOnTime: true,
          },
        });

        const onTimeRate = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 100;

        return {
          id: m.id,
          userId: m.userId,
          user: m.user,
          role: m.role,
          joinedAt: m.joinedAt,
          stats: {
            assigned: assignedTasks,
            completed: completedTasks,
            pending: pendingTasks,
            approvalRate,
            onTimeRate,
          },
        };
      })
    );

    return res.json({
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      currentUserRole: req.teamRole,
      members: membersWithStats,
      projects: team.projects,
    });
  } catch (err) {
    console.error('Get team error:', err);
    return res.status(500).json({ error: 'Failed to fetch team details.' });
  }
});

// Invite/Add member to team
teamRouter.post('/:teamId/invite', requireTeamRole(['admin', 'lead']), async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { email, role = 'member' } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'User email is required.' });
    }

    if (!['admin', 'lead', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, lead, or member.' });
    }

    // Only admins can invite another admin
    if (role === 'admin' && req.teamRole !== 'admin') {
      return res.status(403).json({ error: 'Only team admins can invite other admins.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(404).json({ error: `No user found with email ${email}. They must register first.` });
    }

    // Check if already member
    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
    });

    if (existing && !existing.removedAt) {
      return res.status(400).json({ error: 'User is already an active member of this team.' });
    }

    let member;
    if (existing && existing.removedAt) {
      // Re-activate member
      member = await prisma.teamMember.update({
        where: { id: existing.id },
        data: {
          role,
          removedAt: null,
          joinedAt: new Date(),
        },
        include: { user: true },
      });
    } else {
      member = await prisma.teamMember.create({
        data: {
          teamId,
          userId: user.id,
          role,
        },
        include: { user: true },
      });
    }

    await logActivity({
      teamId,
      actorId: req.user!.id,
      action: 'MEMBER_ADDED',
      details: {
        targetUserId: user.id,
        targetUserName: user.fullName,
        role,
      },
    });

    await createNotification({
      userId: user.id,
      teamId,
      type: 'ROLE_CHANGED',
      title: 'Added to team',
      message: `You have been added to the team with role: ${role.toUpperCase()}`,
      link: `/team`,
    });

    return res.status(201).json(member);
  } catch (err) {
    console.error('Invite member error:', err);
    return res.status(500).json({ error: 'Failed to add member to team.' });
  }
});

// Update Member Role / Transfer Leadership (Admin only)
teamRouter.put('/:teamId/members/:userId/role', requireTeamRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { teamId, userId } = req.params;
    const { newRole } = req.body;

    if (!['admin', 'lead', 'member'].includes(newRole)) {
      return res.status(400).json({ error: 'Role must be admin, lead, or member.' });
    }

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      include: { user: true },
    });

    if (!member || member.removedAt) {
      return res.status(404).json({ error: 'Active team member not found.' });
    }

    const oldRole = member.role;
    if (oldRole === newRole) {
      return res.json({ message: 'Role is already set to ' + newRole, member });
    }

    const updated = await prisma.teamMember.update({
      where: { id: member.id },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            title: true,
          },
        },
      },
    });

    // Write to append-only audit log
    await logActivity({
      teamId,
      actorId: req.user!.id,
      action: 'ROLE_UPDATED',
      details: {
        targetUserId: userId,
        targetUserName: member.user.fullName,
        previousRole: oldRole,
        newRole,
      },
    });

    // Notify user
    await createNotification({
      userId,
      teamId,
      type: 'ROLE_CHANGED',
      title: 'Role Updated',
      message: `Your team role was changed from ${oldRole.toUpperCase()} to ${newRole.toUpperCase()} by ${req.user!.fullName}`,
      link: '/team',
    });

    return res.json(updated);
  } catch (err) {
    console.error('Update role error:', err);
    return res.status(500).json({ error: 'Failed to update member role.' });
  }
});

// Remove Member from Team with Mandatory Task Reassignment Check (Admin only)
teamRouter.post('/:teamId/members/:userId/remove', requireTeamRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { teamId, userId } = req.params;
    const { reassignToUserId } = req.body;

    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'You cannot remove yourself as the active admin. Transfer leadership first.' });
    }

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      include: { user: true },
    });

    if (!member || member.removedAt) {
      return res.status(404).json({ error: 'Active member not found.' });
    }

    // Check for open tasks assigned to this user
    const openTasks = await prisma.task.findMany({
      where: {
        teamId,
        assignedToId: userId,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUIRED'] },
      },
    });

    if (openTasks.length > 0 && !reassignToUserId) {
      return res.status(400).json({
        error: `Cannot remove member: They have ${openTasks.length} open task(s). Please select a replacement team member to reassign their open tasks to.`,
        openTaskCount: openTasks.length,
        requiresReassignment: true,
      });
    }

    // Process reassignment if required
    if (openTasks.length > 0 && reassignToUserId) {
      const replacement = await prisma.teamMember.findFirst({
        where: { teamId, userId: reassignToUserId, removedAt: null },
        include: { user: true },
      });

      if (!replacement) {
        return res.status(400).json({ error: 'Reassignment target is not an active member of this team.' });
      }

      await prisma.task.updateMany({
        where: {
          teamId,
          assignedToId: userId,
          status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUIRED'] },
        },
        data: {
          assignedToId: reassignToUserId,
        },
      });

      await logActivity({
        teamId,
        actorId: req.user!.id,
        action: 'TASKS_REASSIGNED',
        details: {
          fromUserId: userId,
          fromUserName: member.user.fullName,
          toUserId: reassignToUserId,
          toUserName: replacement.user.fullName,
          count: openTasks.length,
        },
      });
    }

    // Mark member as removed
    await prisma.teamMember.update({
      where: { id: member.id },
      data: { removedAt: new Date() },
    });

    await logActivity({
      teamId,
      actorId: req.user!.id,
      action: 'MEMBER_REMOVED',
      details: {
        removedUserId: userId,
        removedUserName: member.user.fullName,
        reassignedTo: reassignToUserId || null,
      },
    });

    return res.json({
      message: `Member ${member.user.fullName} removed successfully. ${openTasks.length > 0 ? `${openTasks.length} tasks reassigned.` : ''}`,
    });
  } catch (err) {
    console.error('Remove member error:', err);
    return res.status(500).json({ error: 'Failed to remove member from team.' });
  }
});
