import { Router, Request, Response } from 'express';
import {
  countAdminUsers,
  getAllAdminUsers,
  getAdminUserByUsername,
  getAdminUserById,
  createAdminUser,
  updateAdminUserPassword,
  updateAdminUserLastLogin,
} from '../models/adminUser.js';
import { hashPassword, verifyPassword } from '../services/passwordHash.js';
import {
  createSession,
  revokeSession,
  revokeAllSessionsForUser,
  setSessionCookie,
  clearSessionCookie,
  getSessionIdFromRequest,
} from '../services/sessionStore.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth.js';

const router = Router();

import { getServerConfig } from '../models/serverConfig.js';

// GET /api/auth/setup-status - Check if first-run setup is required
router.get('/setup-status', (req: Request, res: Response) => {
  const count = countAdminUsers();
  const config = getServerConfig();
  res.json({
    setupRequired: count === 0,
    adminCount: count,
    installed: !!config.installed_at,
  });
});

// POST /api/auth/setup - First-run admin creation
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const adminCount = countAdminUsers();
    if (adminCount > 0) {
      res.status(403).json({ error: 'Setup is already complete. Admin users already exist.' });
      return;
    }

    const { username, password } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters long.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = createAdminUser(username.trim(), hashedPassword);

    // Create session and set cookie
    const session = createSession(user.id);
    setSessionCookie(res, session.id);
    updateAdminUserLastLogin(user.id);

    res.status(201).json({
      message: 'Admin account created successfully.',
      user,
      sessionId: session.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login - Authenticate admin user and set DB-backed HttpOnly cookie
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const user = getAdminUserByUsername(username.trim());
    if (!user) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    // Create DB-backed session
    const session = createSession(user.id);
    setSessionCookie(res, session.id);
    updateAdminUserLastLogin(user.id);

    res.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        username: user.username,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
      },
      sessionId: session.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout - Revoke session row in DB and clear cookie
router.post('/logout', (req: Request, res: Response) => {
  try {
    const sessionId = getSessionIdFromRequest(req);
    if (sessionId) {
      revokeSession(sessionId);
    }
    clearSessionCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me - Current user details
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.adminUser });
});

// POST /api/auth/change-password - Change password & revoke all other sessions for this user
router.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const userId = req.adminUser!.id;
    const user = getAdminUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isMatch = await verifyPassword(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    updateAdminUserPassword(userId, newHash);

    // Revoke all other sessions except the current one
    revokeAllSessionsForUser(userId, req.sessionId);

    res.json({ message: 'Password updated successfully. Other sessions have been revoked.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users - List admin users (Admin only)
router.get('/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = getAllAdminUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users - Create new admin user (Admin only)
router.post('/users', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = getAdminUserByUsername(username.trim());
    if (existing) {
      res.status(400).json({ error: 'Username is already taken.' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const newUser = createAdminUser(username.trim(), hashedPassword);

    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
