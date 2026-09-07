import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

export const notificationRouter = Router();

notificationRouter.use(authenticateToken);

// List user notifications
notificationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });

    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Mark single notification as read
notificationRouter.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notif = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json(updated);
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// Mark all as read
notificationRouter.put('/read-all', async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });

    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});
