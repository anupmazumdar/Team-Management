import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { authenticateToken, requireTeamRole } from '../middleware/auth.js';
import { validateStateTransition, TaskStatus, STATUS_LABELS } from '../utils/stateMachine.js';
import { logActivity, createNotification } from '../utils/logger.js';
import { broadcastSystemMessage } from '../socket/socketHandler.js';

export const taskRouter = Router();

taskRouter.use(authenticateToken);

// List tasks with combinable filters
taskRouter.get('/', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const teamId = req.teamId!;
    const { projectId, status, priority, assignedTo, reviewer, category, search, reviewQueue } = req.query;

    const where: any = { teamId };

    if (projectId && projectId !== 'all') {
      where.projectId = projectId as string;
    }

    if (status && status !== 'all') {
      where.status = status as string;
    }

    if (priority && priority !== 'all') {
      where.priority = priority as string;
    }

    if (category && category !== 'all') {
      where.category = category as string;
    }

    if (assignedTo) {
      if (assignedTo === 'me') {
        where.assignedToId = req.user!.id;
      } else if (assignedTo !== 'all') {
        where.assignedToId = assignedTo as string;
      }
    }

    if (reviewer) {
      if (reviewer === 'me') {
        where.reviewerId = req.user!.id;
      } else if (reviewer !== 'all') {
        where.reviewerId = reviewer as string;
      }
    }

    // Review Queue filter: tasks waiting for review
    if (reviewQueue === 'true') {
      where.status = { in: ['SUBMITTED', 'UNDER_REVIEW'] };
    }

    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, title: true },
        },
        reviewer: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, title: true },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
        _count: {
          select: {
            comments: true,
            reviews: true,
            attachments: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return res.json(tasks);
  } catch (err) {
    console.error('List tasks error:', err);
    return res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// Create task
taskRouter.post('/', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const teamId = req.teamId!;
    const {
      projectId,
      title,
      description,
      missionDetails,
      priority = 'MEDIUM',
      category = 'General',
      deadline,
      assignedToId,
      reviewerId,
      checklist = [],
    } = req.body;

    if (!projectId || !title || !description) {
      return res.status(400).json({ error: 'Project, title, and description are required.' });
    }

    // Verify project belongs to team
    const project = await prisma.project.findFirst({
      where: { id: projectId, teamId },
    });

    if (!project) {
      return res.status(400).json({ error: 'Invalid project for this team.' });
    }

    // Verify assignee if provided
    if (assignedToId) {
      const assigneeMember = await prisma.teamMember.findFirst({
        where: { teamId, userId: assignedToId, removedAt: null },
      });
      if (!assigneeMember) {
        return res.status(400).json({ error: 'Assignee is not an active member of this team.' });
      }
    }

    // Verify reviewer if provided
    if (reviewerId) {
      const reviewerMember = await prisma.teamMember.findFirst({
        where: { teamId, userId: reviewerId, removedAt: null },
      });
      if (!reviewerMember) {
        return res.status(400).json({ error: 'Reviewer is not an active member of this team.' });
      }
    }

    const task = await prisma.task.create({
      data: {
        teamId,
        projectId,
        title: title.trim(),
        description: description.trim(),
        missionDetails: missionDetails ? missionDetails.trim() : null,
        status: 'NOT_STARTED',
        priority,
        category,
        deadline: deadline ? new Date(deadline) : null,
        assignedToId: assignedToId || null,
        reviewerId: reviewerId || null,
        createdById: req.user!.id,
        checklist: Array.isArray(checklist)
          ? checklist.map((item: any, idx: number) => ({
              id: item.id || `chk-${Date.now()}-${idx}`,
              text: typeof item === 'string' ? item : item.text,
              completed: !!item.completed,
            }))
          : [],
      },
      include: {
        project: true,
        assignedTo: true,
        reviewer: true,
        createdBy: true,
      },
    });

    await logActivity({
      teamId,
      actorId: req.user!.id,
      action: 'TASK_CREATED',
      projectId: task.projectId,
      taskId: task.id,
      details: {
        title: task.title,
        priority: task.priority,
        assignedToId: task.assignedToId,
      },
    });

    // Notify assignee if assigned
    if (assignedToId && assignedToId !== req.user!.id) {
      await createNotification({
        userId: assignedToId,
        teamId,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `${req.user!.fullName} assigned you to task: "${task.title}"`,
        link: `/tasks/${task.id}`,
      });
    }

    return res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ error: 'Failed to create task.' });
  }
});

// Get task details with full back-and-forth reviews, comments, and attachments
taskRouter.get('/:taskId', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const teamId = req.teamId!;

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId },
      include: {
        project: true,
        assignedTo: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, title: true },
        },
        reviewer: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, title: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, title: true },
        },
        reviews: {
          orderBy: { timestamp: 'desc' },
          include: {
            reviewedByUser: {
              select: { id: true, fullName: true, avatarUrl: true, email: true },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, fullName: true, avatarUrl: true, title: true },
            },
          },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    return res.json(task);
  } catch (err) {
    console.error('Get task error:', err);
    return res.status(500).json({ error: 'Failed to fetch task.' });
  }
});

// Update task details (title, description, priority, category, deadline, assignee, reviewer)
taskRouter.put('/:taskId', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const teamId = req.teamId!;
    const { title, description, priority, category, deadline, assignedToId, reviewerId, checklist } = req.body;

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Only creator, assignee, lead, or admin can update details
    const canUpdate =
      req.teamRole === 'admin' ||
      req.teamRole === 'lead' ||
      task.createdById === req.user!.id ||
      task.assignedToId === req.user!.id;

    if (!canUpdate) {
      return res.status(403).json({ error: 'You do not have permission to edit this task.' });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(priority ? { priority } : {}),
        ...(category ? { category } : {}),
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
        ...(assignedToId !== undefined ? { assignedToId: assignedToId || null } : {}),
        ...(reviewerId !== undefined ? { reviewerId: reviewerId || null } : {}),
        ...(checklist !== undefined ? { checklist } : {}),
      },
      include: {
        assignedTo: true,
        reviewer: true,
        project: true,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error('Update task error:', err);
    return res.status(500).json({ error: 'Failed to update task.' });
  }
});

// Toggle or update checklist item
taskRouter.put('/:taskId/checklist/:itemId', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { taskId, itemId } = req.params;
    const teamId = req.teamId!;
    const { completed, text } = req.body;

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const checklist = Array.isArray(task.checklist) ? (task.checklist as any[]) : [];
    const updatedChecklist = checklist.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          ...(completed !== undefined ? { completed: !!completed } : {}),
          ...(text !== undefined ? { text: text.trim() } : {}),
        };
      }
      return item;
    });

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { checklist: updatedChecklist },
    });

    return res.json(updated);
  } catch (err) {
    console.error('Checklist error:', err);
    return res.status(500).json({ error: 'Failed to update checklist item.' });
  }
});

/**
 * Explicit Accept Task / Mission Endpoint:
 * The assigned team member formally accepts the mission!
 */
taskRouter.post('/:taskId/accept', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const teamId = req.teamId!;

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId },
      include: { assignedTo: true, project: true, reviewer: true },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const isAssignee = task.assignedToId === req.user!.id;
    const isAdminOrLead = req.teamRole === 'admin' || req.teamRole === 'lead';

    if (!isAssignee && !isAdminOrLead) {
      return res.status(403).json({ error: 'Only the assigned member or team leadership can accept this task.' });
    }

    if (task.status !== 'NOT_STARTED') {
      return res.status(400).json({ error: `Task cannot be accepted in "${task.status}" state. Current state must be NOT_STARTED.` });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
        acceptedAt: new Date(),
        acceptedById: req.user!.id,
      },
      include: {
        project: true,
        assignedTo: true,
        reviewer: true,
      },
    });

    await logActivity({
      teamId,
      actorId: req.user!.id,
      action: 'TASK_ACCEPTED',
      projectId: task.projectId,
      taskId: task.id,
      details: {
        taskTitle: task.title,
        acceptedBy: req.user!.fullName,
      },
    });

    const acceptMsg = `🎯 ${req.user!.fullName} accepted mission "${task.title}" and commenced execution!`;
    await broadcastSystemMessage(task.projectId, teamId, acceptMsg);

    return res.json(updated);
  } catch (err) {
    console.error('Accept task error:', err);
    return res.status(500).json({ error: 'Failed to accept task.' });
  }
});

/**
 * Task Verification State Machine Transition Endpoint
 * Enforces valid state transitions and role checks server-side
 */
taskRouter.put('/:taskId/status', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const teamId = req.teamId!;
    const { newStatus, submissionNote } = req.body as { newStatus: TaskStatus; submissionNote?: string };

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId },
      include: { project: true, assignedTo: true, reviewer: true },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const currentStatus = task.status as TaskStatus;

    // Validate the transition via our State Machine
    const validation = validateStateTransition(currentStatus, newStatus, {
      userId: req.user!.id,
      userRole: req.teamRole!,
      assignedToId: task.assignedToId,
      reviewerId: task.reviewerId,
    });

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.reason || 'Illegal state transition.',
        currentStatus,
        attemptedStatus: newStatus,
      });
    }

    // On delivery (submission), calculate on-time status against deadline
    let deliveredAt: Date | undefined = undefined;
    let isOnTime: boolean | undefined = undefined;

    if (newStatus === 'SUBMITTED') {
      deliveredAt = new Date();
      isOnTime = task.deadline ? deliveredAt <= new Date(task.deadline) : true;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        ...(submissionNote !== undefined ? { submissionNote } : {}),
        ...(deliveredAt ? { deliveredAt, isOnTime } : {}),
      },
      include: {
        project: true,
        assignedTo: true,
        reviewer: true,
      },
    });

    // Write to append-only audit log
    await logActivity({
      teamId,
      actorId: req.user!.id,
      action: 'STATUS_CHANGED',
      projectId: task.projectId,
      taskId: task.id,
      details: {
        previousStatus: currentStatus,
        newStatus,
        submissionNote: submissionNote || null,
        taskTitle: task.title,
        deliveredAt: deliveredAt ? deliveredAt.toISOString() : null,
        isOnTime: isOnTime !== undefined ? isOnTime : null,
      },
    });

    // Broadcast system message to project chat upon key milestones
    if (newStatus === 'SUBMITTED') {
      const onTimeBadge = isOnTime ? '⏱️ Delivered On-Time!' : '⚠️ Delivered Past Deadline';
      const msg = `${req.user!.fullName} submitted "${task.title}" for review (${onTimeBadge}).`;
      await broadcastSystemMessage(task.projectId, teamId, msg);

      // Notify designated reviewer
      if (task.reviewerId) {
        await createNotification({
          userId: task.reviewerId,
          teamId,
          type: 'TASK_SUBMITTED',
          title: 'Task Submitted for Review',
          message: `${req.user!.fullName} delivered "${task.title}" (${onTimeBadge}). Please review.`,
          link: `/tasks/${task.id}`,
        });
      }
    }

    return res.json(updated);
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Failed to update task status.' });
  }
});

/**
 * Review Submission Endpoint:
 * Reviewer Approves or Requests Changes with Permanent Historical Snapshot!
 */
taskRouter.post('/:taskId/review', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const teamId = req.teamId!;
    const { decision, comment } = req.body as { decision: 'APPROVED' | 'CHANGES_REQUIRED'; comment: string };

    if (!['APPROVED', 'CHANGES_REQUIRED'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be APPROVED or CHANGES_REQUIRED.' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'A review comment is required.' });
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId },
      include: {
        assignedTo: true,
        reviewer: true,
        project: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Permission check: Reviewer, Lead, or Admin
    const isDesignatedReviewer = task.reviewerId === req.user!.id;
    const isAdminOrLead = req.teamRole === 'admin' || req.teamRole === 'lead';

    if (!isDesignatedReviewer && !isAdminOrLead) {
      return res.status(403).json({
        error: 'Only the designated reviewer or team leadership (Lead/Admin) can review this task.',
      });
    }

    // Assignee cannot approve their own work
    if (task.assignedToId === req.user!.id && !isAdminOrLead) {
      return res.status(403).json({
        error: 'Assignees cannot self-approve their own submitted tasks.',
      });
    }

    // Task must be in SUBMITTED or UNDER_REVIEW
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(task.status)) {
      return res.status(400).json({
        error: `Cannot review a task in "${STATUS_LABELS[task.status as TaskStatus]}" status. Task must be Submitted or Under Review.`,
      });
    }

    // Execute review and update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create permanent snapshot record in task_reviews
      const reviewRecord = await tx.taskReview.create({
        data: {
          taskId,
          reviewedByUserId: req.user!.id,
          reviewedByNameSnapshot: req.user!.fullName,
          reviewedByRoleSnapshot: req.teamRole!,
          decision,
          comment: comment.trim(),
          timestamp: new Date(),
        },
      });

      // Update task status according to decision
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          status: decision,
        },
        include: {
          assignedTo: true,
          reviewer: true,
          project: true,
          reviews: {
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      return { reviewRecord, updatedTask };
    });

    // Write to audit log
    await logActivity({
      teamId,
      actorId: req.user!.id,
      action: 'REVIEW_SUBMITTED',
      projectId: task.projectId,
      taskId: task.id,
      details: {
        decision,
        comment: comment.trim(),
        reviewerName: req.user!.fullName,
        reviewerRole: req.teamRole,
        taskTitle: task.title,
      },
    });

    // System message in project chat
    const actionText = decision === 'APPROVED' ? 'approved' : 'requested changes on';
    const sysMsg = `${req.user!.fullName} (${req.teamRole?.toUpperCase()}) ${actionText} "${task.title}": "${comment.trim()}"`;
    await broadcastSystemMessage(task.projectId, teamId, sysMsg);

    // Notify assignee
    if (task.assignedToId) {
      const notifType = decision === 'APPROVED' ? 'TASK_APPROVED' : 'CHANGES_REQUESTED';
      const notifTitle = decision === 'APPROVED' ? 'Task Approved!' : 'Changes Requested';
      await createNotification({
        userId: task.assignedToId,
        teamId,
        type: notifType,
        title: notifTitle,
        message: `${req.user!.fullName} (${req.teamRole?.toUpperCase()}): ${comment.trim()}`,
        link: `/tasks/${task.id}`,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('Submit review error:', err);
    return res.status(500).json({ error: 'Failed to submit review.' });
  }
});
