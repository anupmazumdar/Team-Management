import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { ENV } from '../config/env.js';
import { authenticateToken } from '../middleware/auth.js';

export const authRouter = Router();

// Register new user
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, title, avatarUrl } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName: fullName.trim(),
        title: title || 'Team Member',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, fullName: user.fullName },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        title: user.title,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to create user account.' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        teamMembers: {
          where: { removedAt: null },
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, fullName: user.fullName },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        title: user.title,
        avatarUrl: user.avatarUrl,
      },
      teams: user.teamMembers.map((tm) => ({
        teamId: tm.teamId,
        teamName: tm.team.name,
        teamSlug: tm.team.slug,
        role: tm.role,
        joinedAt: tm.joinedAt,
      })),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to login.', details: err?.message || String(err) });
  }
});

// Get current authenticated user profile + dynamic teams & current roles
authRouter.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        teamMembers: {
          where: { removedAt: null },
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        title: user.title,
        avatarUrl: user.avatarUrl,
      },
      teams: user.teamMembers.map((tm) => ({
        teamId: tm.teamId,
        teamName: tm.team.name,
        teamSlug: tm.team.slug,
        role: tm.role,
        joinedAt: tm.joinedAt,
      })),
    });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ error: 'Failed to fetch current user profile.' });
  }
});
