import { queryGet, queryAll, queryRun } from '../db/client.js';

export interface SsoEvent {
  id: number;
  event_type: 'login' | 'logout';
  source: 'addin' | 'web';
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface SsoEventSummary {
  addinLogins: number;
  webLogins: number;
  addinLogouts: number;
  webLogouts: number;
  totalLogins: number;
  recentLogins: Array<{
    user_email: string | null;
    user_name: string | null;
    source: string;
    created_at: string;
  }>;
}

export function logSsoEvent(event: Omit<SsoEvent, 'id'>): SsoEvent {
  queryRun(
    `INSERT INTO sso_events (event_type, source, user_id, user_email, user_name, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      event.event_type,
      event.source,
      event.user_id || 'unknown',
      event.user_email || null,
      event.user_name || null,
      event.ip_address || null,
      event.created_at || new Date().toISOString(),
    ]
  );

  const inserted = queryGet<any>('SELECT * FROM sso_events ORDER BY id DESC LIMIT 1');
  return formatEventRow(inserted);
}

export function getSsoEventSummary(): SsoEventSummary {
  const totals = queryGet<any>(`
    SELECT
      SUM(CASE WHEN event_type = 'login' AND source = 'addin' THEN 1 ELSE 0 END) as addin_logins,
      SUM(CASE WHEN event_type = 'login' AND source = 'web' THEN 1 ELSE 0 END) as web_logins,
      SUM(CASE WHEN event_type = 'logout' AND source = 'addin' THEN 1 ELSE 0 END) as addin_logouts,
      SUM(CASE WHEN event_type = 'logout' AND source = 'web' THEN 1 ELSE 0 END) as web_logouts,
      SUM(CASE WHEN event_type = 'login' THEN 1 ELSE 0 END) as total_logins
    FROM sso_events
  `);

  const recentRows = queryAll<any>(
    `SELECT user_email, user_name, source, created_at FROM sso_events
     WHERE event_type = 'login'
     ORDER BY created_at DESC LIMIT 10`
  );

  return {
    addinLogins: Number(totals?.addin_logins || 0),
    webLogins: Number(totals?.web_logins || 0),
    addinLogouts: Number(totals?.addin_logouts || 0),
    webLogouts: Number(totals?.web_logouts || 0),
    totalLogins: Number(totals?.total_logins || 0),
    recentLogins: recentRows.map((r) => ({
      user_email: r.user_email || null,
      user_name: r.user_name || null,
      source: r.source,
      created_at: r.created_at,
    })),
  };
}

function formatEventRow(row: any): SsoEvent {
  return {
    id: Number(row.id),
    event_type: row.event_type,
    source: row.source,
    user_id: row.user_id || 'unknown',
    user_email: row.user_email || null,
    user_name: row.user_name || null,
    ip_address: row.ip_address || null,
    created_at: row.created_at,
  };
}
