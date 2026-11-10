import { Response, Request } from 'express';
import { createSession, getValidSession, revokeSession, revokeAllSessionsForUser } from '../models/adminSession.js';

export const SESSION_COOKIE_NAME = 'litera_admin_session';

export function setSessionCookie(res: Response, sessionId: string, maxAgeDays = 7): void {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.SECURE_COOKIES === 'true',
    sameSite: 'lax',
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    path: '/',
  });
}

export function getSessionIdFromRequest(req: Request): string | null {
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export { createSession, getValidSession, revokeSession, revokeAllSessionsForUser };
