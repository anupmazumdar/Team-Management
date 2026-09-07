import { prisma } from '../config/db.js';
import { getIO } from '../socket/socketHandler.js';

export interface LogActivityParams {
  teamId: string;
  actorId: string;
  action: string;
  projectId?: string | null;
  taskId?: string | null;
  details?: Record<string, any>;
}

export async function logActivity(params: LogActivityParams) {
  try {
    const activity = await prisma.activityLog.create({
      data: {
        teamId: params.teamId,
        actorId: params.actorId,
        action: params.action,
        projectId: params.projectId || null,
        taskId: params.taskId || null,
        details: params.details || {},
      },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            title: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Emit live to team room if socket is available
    const io = getIO();
    if (io) {
      io.to(`team:${params.teamId}`).emit('new-activity', activity);
    }

    return activity;
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export interface CreateNotificationParams {
  userId: string;
  teamId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        teamId: params.teamId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
      },
    });

    const io = getIO();
    if (io) {
      io.to(`user:${params.userId}`).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
