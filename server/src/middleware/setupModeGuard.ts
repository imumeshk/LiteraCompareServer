import { Request, Response, NextFunction } from 'express';
import { countAdminUsers } from '../models/adminUser.js';

export function setupModeGuard(req: Request, res: Response, next: NextFunction) {
  const adminCount = countAdminUsers();
  // Allow setup endpoints and health checks regardless
  if (adminCount === 0) {
    if (
      req.path === '/api/auth/setup' ||
      req.path === '/api/auth/setup-status' ||
      req.path === '/api/health'
    ) {
      return next();
    }
  }
  next();
}
