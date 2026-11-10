import crypto from 'crypto';
import { queryGet, queryRun, queryAll } from '../db/client.js';

export interface AdminSession {
  id: string;
  user_id: number;
  expires_at: string;
  revoked_at: string | null;
}

const SESSION_TTL_HOURS = 24 * 7; // 7 days

export function createSession(userId: number): AdminSession {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();

  queryRun(
    'INSERT INTO admin_sessions (id, user_id, expires_at, revoked_at) VALUES (?, ?, ?, NULL)',
    [sessionId, userId, expiresAt]
  );

  return {
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
    revoked_at: null,
  };
}

export function getValidSession(sessionId: string): AdminSession | null {
  if (!sessionId) return null;
  const session = queryGet<AdminSession>(
    'SELECT * FROM admin_sessions WHERE id = ? AND revoked_at IS NULL',
    [sessionId]
  );

  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    revokeSession(sessionId);
    return null;
  }

  return session;
}

export function revokeSession(sessionId: string): void {
  const now = new Date().toISOString();
  queryRun('UPDATE admin_sessions SET revoked_at = ? WHERE id = ?', [now, sessionId]);
}

export function revokeAllSessionsForUser(userId: number, exceptSessionId?: string): void {
  const now = new Date().toISOString();
  if (exceptSessionId) {
    queryRun(
      'UPDATE admin_sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL',
      [now, userId, exceptSessionId]
    );
  } else {
    queryRun(
      'UPDATE admin_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
      [now, userId]
    );
  }
}
