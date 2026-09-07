import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { prisma } from '../config/db.js';

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

interface SocketUser {
  id: string;
  email: string;
  fullName: string;
}

export function initSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication required for socket connection'));
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as SocketUser;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid socket token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as SocketUser;
    if (!user) return;

    // Join personal user notification room
    socket.join(`user:${user.id}`);

    // Join team room
    socket.on('join-team', (teamId: string) => {
      socket.join(`team:${teamId}`);
    });

    socket.on('leave-team', (teamId: string) => {
      socket.leave(`team:${teamId}`);
    });

    // Join project chat room
    socket.on('join-project', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('leave-project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // Send chat message
    socket.on('send-message', async (data: { projectId: string; teamId: string; content: string; mentions?: string[]; attachmentIds?: string[] }) => {
      try {
        const { projectId, teamId, content, mentions = [], attachmentIds = [] } = data;
        if (!content || !content.trim()) return;

        // Verify sender is active team member
        const member = await prisma.teamMember.findFirst({
          where: { teamId, userId: user.id, removedAt: null },
        });

        if (!member) {
          socket.emit('error', { message: 'You are not an active member of this team.' });
          return;
        }

        const message = await prisma.message.create({
          data: {
            projectId,
            teamId,
            senderId: user.id,
            content: content.trim(),
            isSystem: false,
            mentions: mentions,
          },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                title: true,
              },
            },
            attachments: true,
          },
        });

        // Link attachments if provided
        if (attachmentIds && attachmentIds.length > 0) {
          await prisma.attachment.updateMany({
            where: { id: { in: attachmentIds } },
            data: { messageId: message.id },
          });
        }

        // Broadcast to project room
        io?.to(`project:${projectId}`).emit('new-message', message);

        // Notify mentioned users
        if (mentions.length > 0) {
          for (const mentionedId of mentions) {
            if (mentionedId !== user.id) {
              await prisma.notification.create({
                data: {
                  userId: mentionedId,
                  teamId,
                  type: 'MENTION',
                  title: `${user.fullName} mentioned you`,
                  message: content.length > 80 ? `${content.substring(0, 80)}...` : content,
                  link: `/projects/${projectId}?tab=chat`,
                },
              });
              io?.to(`user:${mentionedId}`).emit('notification', {
                type: 'MENTION',
                title: `${user.fullName} mentioned you`,
                message: content,
              });
            }
          }
        }
      } catch (err) {
        console.error('Error handling socket message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing', (data: { projectId: string; isTyping: boolean }) => {
      socket.to(`project:${data.projectId}`).emit('user-typing', {
        userId: user.id,
        fullName: user.fullName,
        isTyping: data.isTyping,
      });
    });

    socket.on('disconnect', () => {
      // Disconnected cleanly
    });
  });

  return io;
}

// Helper to broadcast system message to project chat
export async function broadcastSystemMessage(projectId: string, teamId: string, content: string) {
  try {
    const sysMsg = await prisma.message.create({
      data: {
        projectId,
        teamId,
        senderId: null,
        content,
        isSystem: true,
        mentions: [],
      },
      include: {
        sender: true,
      },
    });

    if (io) {
      io.to(`project:${projectId}`).emit('new-message', sysMsg);
    }
    return sysMsg;
  } catch (err) {
    console.error('Failed to broadcast system message:', err);
  }
}
