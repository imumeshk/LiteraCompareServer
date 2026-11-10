import { Request, Response, NextFunction } from 'express';
import { getSessionIdFromRequest } from '../services/sessionStore.js';
import { getValidSession } from '../models/adminSession.js';
import { getAdminUserById, AdminUserPublic } from '../models/adminUser.js';

export interface AuthenticatedRequest extends Request {
  adminUser?: AdminUserPublic;
  sessionId?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) {
    res.status(401).json({ error: 'Unauthorized: No active admin session' });
    return;
  }

  const session = getValidSession(sessionId);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized: Session is expired or revoked' });
    return;
  }

  const user = getAdminUserById(session.user_id);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: User no longer exists' });
    return;
  }

  req.adminUser = {
    id: user.id,
    username: user.username,
    created_at: user.created_at,
    last_login_at: user.last_login_at,
  };
  req.sessionId = session.id;

  next();
}
