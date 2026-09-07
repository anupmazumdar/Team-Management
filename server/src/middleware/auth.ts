import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { prisma } from '../config/db.js';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      teamId?: string;
      teamRole?: 'admin' | 'lead' | 'member';
      teamMember?: any;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Dynamic Per-Team Role Middleware:
 * Never caches roles in JWT. Queries live role in PostgreSQL at request time.
 */
export function requireTeamRole(allowedRoles: ('admin' | 'lead' | 'member')[] = ['admin', 'lead', 'member']) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const teamId = (req.params.teamId || req.headers['x-team-id'] || req.body?.teamId || req.query?.teamId) as string;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required (via URL param or x-team-id header).' });
    }

    try {
      // Query current active role in database
      const member = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: req.user.id,
          removedAt: null,
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!member) {
        return res.status(403).json({
          error: 'Forbidden: You are not an active member of this team.',
        });
      }

      const currentRole = member.role as 'admin' | 'lead' | 'member';

      if (!allowedRoles.includes(currentRole)) {
        return res.status(403).json({
          error: `Forbidden: This action requires role [${allowedRoles.join(', ')}]. Your current role is "${currentRole}".`,
        });
      }

      req.teamId = teamId;
      req.teamRole = currentRole;
      req.teamMember = member;

      next();
    } catch (err) {
      console.error('Error checking team role:', err);
      return res.status(500).json({ error: 'Failed to verify team permissions.' });
    }
  };
}
