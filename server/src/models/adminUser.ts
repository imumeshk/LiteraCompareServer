import { queryGet, queryAll, queryRun } from '../db/client.js';

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  last_login_at: string | null;
}

export type AdminUserPublic = Omit<AdminUser, 'password_hash'>;

export function countAdminUsers(): number {
  const row = queryGet<{ count: number }>('SELECT COUNT(*) as count FROM admin_users');
  return row ? row.count : 0;
}

export function getAllAdminUsers(): AdminUserPublic[] {
  const rows = queryAll<AdminUser>('SELECT id, username, created_at, last_login_at FROM admin_users ORDER BY id ASC');
  return rows;
}

export function getAdminUserByUsername(username: string): AdminUser | null {
  return queryGet<AdminUser>('SELECT * FROM admin_users WHERE username = ?', [username]);
}

export function getAdminUserById(id: number): AdminUser | null {
  return queryGet<AdminUser>('SELECT * FROM admin_users WHERE id = ?', [id]);
}

export function createAdminUser(username: string, passwordHash: string): AdminUserPublic {
  const now = new Date().toISOString();
  queryRun(
    'INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, ?)',
    [username, passwordHash, now]
  );
  const user = getAdminUserByUsername(username);
  if (!user) throw new Error('Failed to create admin user');
  return {
    id: user.id,
    username: user.username,
    created_at: user.created_at,
    last_login_at: user.last_login_at,
  };
}

export function updateAdminUserPassword(id: number, passwordHash: string): void {
  queryRun('UPDATE admin_users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

export function updateAdminUserLastLogin(id: number): void {
  const now = new Date().toISOString();
  queryRun('UPDATE admin_users SET last_login_at = ? WHERE id = ?', [now, id]);
}
