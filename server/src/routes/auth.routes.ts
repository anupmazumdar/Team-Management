import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { ENV } from '../config/env.js';
import { authenticateToken } from '../middleware/auth.js';

export const authRouter = Router();

export const ADMIN_EMAILS = ['thezeroanup0@gmail.com'];
export const isAdmin = (email?: string | null) =>
  Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase().trim()));

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

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'This account signs in via Auth0. Please click "Continue with Auth0".' });
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
        role: isAdmin(user.email) ? 'admin' : tm.role,
        joinedAt: tm.joinedAt,
      })),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to login.', details: err?.message || String(err) });
  }
});

// Current User Profile & Teams
authRouter.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        teamMembers: {
          where: { removedAt: null },
          include: { team: true },
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
  } catch (err: any) {
    console.error('Error fetching /me profile:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// Auth0 User Sync & Provisioning
authRouter.post('/auth0-sync', async (req: Request, res: Response) => {
  try {
    const { auth0Id, email, fullName, avatarUrl } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required from Auth0 profile.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check if user already exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          auth0Id ? { auth0Id } : {},
          { email: cleanEmail },
        ],
      },
      include: {
        teamMembers: {
          where: { removedAt: null },
          include: { team: true },
        },
      },
    });

    if (user) {
      // Update details and link auth0Id
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          auth0Id: auth0Id || user.auth0Id,
          authProvider: 'auth0',
          fullName: fullName?.trim() || user.fullName,
          avatarUrl: avatarUrl || user.avatarUrl,
        },
        include: {
          teamMembers: {
            where: { removedAt: null },
            include: { team: true },
          },
        },
      });

      if (isAdmin(cleanEmail)) {
        await prisma.teamMember.updateMany({
          where: { userId: user.id },
          data: { role: 'admin' },
        });
      }
    } else {
      // Provision new user in PostgreSQL
      const primaryTeam = await prisma.team.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          fullName: fullName?.trim() || cleanEmail.split('@')[0],
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
          auth0Id: auth0Id || null,
          authProvider: 'auth0',
        },
        include: {
          teamMembers: {
            where: { removedAt: null },
            include: { team: true },
          },
        },
      });

      // Automatically attach user to primary workspace
      if (primaryTeam) {
        await prisma.teamMember.create({
          data: {
            teamId: primaryTeam.id,
            userId: user.id,
            role: isAdmin(cleanEmail) ? 'admin' : 'member',
          },
        });

        // Re-fetch user with team membership
        user = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            teamMembers: {
              where: { removedAt: null },
              include: { team: true },
            },
          },
        }) as any;
      }
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to synchronize Auth0 user.' });
    }

    // 2. Issue App JWT Token
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
        authProvider: user.authProvider,
      },
      teams: (user.teamMembers || []).map((tm: any) => ({
        teamId: tm.teamId,
        teamName: tm.team.name,
        teamSlug: tm.team.slug,
        role: tm.role,
        joinedAt: tm.joinedAt,
      })),
    });
  } catch (err: any) {
    console.error('Auth0 Sync Error:', err);
    return res.status(500).json({ error: 'Failed to synchronize Auth0 user.', details: err?.message || String(err) });
  }
});

// Universal Social OAuth Sync (Google, GitHub, LinkedIn, Auth0)
authRouter.post('/social-sync', async (req: Request, res: Response) => {
  try {
    const { provider, providerId, email, fullName, avatarUrl, headline } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required from OAuth profile.' });
    }

    const validProviders = ['google', 'github', 'linkedin', 'auth0'];
    const chosenProvider = validProviders.includes((provider || '').toLowerCase())
      ? (provider || '').toLowerCase()
      : 'oauth';

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists by auth0Id (used as universal oauth id) or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          providerId ? { auth0Id: providerId } : {},
          { email: cleanEmail },
        ],
      },
      include: {
        teamMembers: {
          where: { removedAt: null },
          include: { team: true },
        },
      },
    });

    if (user) {
      // Update details and link oauth provider
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          auth0Id: providerId || user.auth0Id,
          authProvider: chosenProvider,
          fullName: fullName?.trim() || user.fullName,
          avatarUrl: avatarUrl || user.avatarUrl,
          title: headline || user.title,
        },
        include: {
          teamMembers: {
            where: { removedAt: null },
            include: { team: true },
          },
        },
      });

      if (isAdmin(cleanEmail)) {
        await prisma.teamMember.updateMany({
          where: { userId: user.id },
          data: { role: 'admin' },
        });
      }
    } else {
      // Provision new user in PostgreSQL
      const primaryTeam = await prisma.team.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          fullName: fullName?.trim() || cleanEmail.split('@')[0],
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
          title: headline || `${chosenProvider.toUpperCase()} Verified Member`,
          auth0Id: providerId || null,
          authProvider: chosenProvider,
        },
        include: {
          teamMembers: {
            where: { removedAt: null },
            include: { team: true },
          },
        },
      });

      // Automatically attach user to primary workspace
      if (primaryTeam) {
        await prisma.teamMember.create({
          data: {
            teamId: primaryTeam.id,
            userId: user.id,
            role: isAdmin(cleanEmail) ? 'admin' : 'member',
          },
        });

        // Re-fetch user with team membership
        user = (await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            teamMembers: {
              where: { removedAt: null },
              include: { team: true },
            },
          },
        })) as any;
      }
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to synchronize OAuth user.' });
    }

    // Sign JWT
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
        authProvider: user.authProvider,
      },
      teams: (user.teamMembers || []).map((tm: any) => ({
        teamId: tm.teamId,
        teamName: tm.team.name,
        teamSlug: tm.team.slug,
        role: tm.role,
        joinedAt: tm.joinedAt,
      })),
    });
  } catch (err: any) {
    console.error('Social OAuth Sync Error:', err);
    return res.status(500).json({ error: 'Failed to synchronize social OAuth account.', details: err?.message || String(err) });
  }
});

// GitHub OAuth Code Exchange & Account Sync
authRouter.post('/github-exchange', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'GitHub authorization code is required.' });
    }

    const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23livtqhYLVsxl5EUM';
    const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

    if (!GITHUB_CLIENT_SECRET) {
      return res.status(400).json({
        error: 'GITHUB_CLIENT_SECRET is missing. Please add GITHUB_CLIENT_SECRET in your Render backend environment variables.',
      });
    }

    // Exchange authorization code for GitHub access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token exchange error:', tokenData);
      return res.status(400).json({
        error: tokenData.error_description || tokenData.error || 'Failed to exchange GitHub authorization code.',
      });
    }

    // Fetch user details from GitHub
    const ghUserRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'HustleX-Team-Workspace',
      },
    });
    const ghUser: any = await ghUserRes.json();

    // Fetch email if private
    let email = ghUser.email;
    if (!email) {
      try {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'HustleX-Team-Workspace',
          },
        });
        const emails: any[] = (await emailsRes.json()) as any[];
        if (Array.isArray(emails)) {
          const primary = emails.find((e: any) => e.primary && e.verified) || emails[0];
          if (primary) email = primary.email;
        }
      } catch (err) {
        console.warn('Could not fetch user emails from GitHub:', err);
      }
    }

    if (!email) {
      email = `${ghUser.login}@users.noreply.github.com`;
    }

    const cleanEmail = email.toLowerCase().trim();
    const fullName = ghUser.name || ghUser.login || 'GitHub Developer';
    const avatarUrl = ghUser.avatar_url;
    const providerId = `github|${ghUser.id}`;

    // Sync into PostgreSQL
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { auth0Id: providerId },
        ],
      },
      include: {
        teamMembers: {
          where: { removedAt: null },
          include: { team: true },
        },
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: fullName || user.fullName,
          avatarUrl: avatarUrl || user.avatarUrl,
          authProvider: 'github',
          auth0Id: providerId,
        },
        include: {
          teamMembers: {
            where: { removedAt: null },
            include: { team: true },
          },
        },
      });

      if (isAdmin(cleanEmail)) {
        await prisma.teamMember.updateMany({
          where: { userId: user.id },
          data: { role: 'admin' },
        });
      }
    } else {
      const primaryTeam = await prisma.team.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          fullName,
          avatarUrl,
          title: ghUser.bio || 'GitHub Developer',
          auth0Id: providerId,
          authProvider: 'github',
        },
        include: {
          teamMembers: {
            where: { removedAt: null },
            include: { team: true },
          },
        },
      });

      if (primaryTeam) {
        await prisma.teamMember.create({
          data: {
            teamId: primaryTeam.id,
            userId: user.id,
            role: isAdmin(cleanEmail) ? 'admin' : 'member',
          },
        });

        user = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            teamMembers: {
              where: { removedAt: null },
              include: { team: true },
            },
          },
        }) as any;
      }
    }

    const token = jwt.sign(
      { id: user!.id, email: user!.email, fullName: user!.fullName },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return res.json({
      token,
      user: {
        id: user!.id,
        email: user!.email,
        fullName: user!.fullName,
        title: user!.title,
        avatarUrl: user!.avatarUrl,
        authProvider: user!.authProvider,
      },
      teams: (user!.teamMembers || []).map((tm: any) => ({
        teamId: tm.teamId,
        teamName: tm.team.name,
        teamSlug: tm.team.slug,
        role: tm.role,
        joinedAt: tm.joinedAt,
      })),
    });
  } catch (err: any) {
    console.error('GitHub exchange error:', err);
    return res.status(500).json({ error: 'Failed to complete GitHub sign-in.', details: err?.message || String(err) });
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
        role: isAdmin(user.email) ? 'admin' : tm.role,
        joinedAt: tm.joinedAt,
      })),
    });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ error: 'Failed to fetch current user profile.' });
  }
});
