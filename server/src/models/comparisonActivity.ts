import { queryGet, queryAll, queryRun } from '../db/client.js';

export interface ComparisonActivity {
  id: number;
  user_id: string;
  user_email: string;
  user_name: string;
  source: 'addin' | 'web';
  original_filename: string;
  modified_filename: string;
  comparison_id: string;
  server_status: 'success' | 'failed' | 'unknown';
  http_status_code: number;
  duration_ms: number;
  error_message?: string;
  total_changes: number;
  ip_address?: string;
  created_at: string;
  request_headers?: string;
  response_headers?: string;
  has_custom_rendering?: boolean;
  rendering_parameters?: string;
  machine_info?: string;
}

export interface ActivityFilterOptions {
  user?: string;
  source?: 'all' | 'addin' | 'web';
  status?: 'all' | 'success' | 'failed' | 'unknown' | 'failed_any';
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface UserStatsSummary {
  user_email: string;
  user_name: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  addin_requests: number;
  web_requests: number;
  last_active: string;
}

export interface ActivityDashboardSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  addinRequests: number;
  webRequests: number;
  uniqueUsersCount: number;
  averageLatencyMs: number;
  userSummaries: UserStatsSummary[];
  recentTimeline: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
  }>;
}

export function logComparisonActivity(activity: Omit<ComparisonActivity, 'id'>): ComparisonActivity {
  const createdAt = activity.created_at || new Date().toISOString();
  
  queryRun(
    `INSERT INTO comparison_activity (
      user_id, user_email, user_name, source, original_filename, modified_filename,
      comparison_id, server_status, http_status_code, duration_ms, error_message,
      total_changes, ip_address, created_at, request_headers, response_headers, 
      has_custom_rendering, rendering_parameters, machine_info
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      activity.user_id || 'anonymous_user',
      activity.user_email || 'anonymous@guest.local',
      activity.user_name || 'Guest User',
      activity.source,
      activity.original_filename,
      activity.modified_filename,
      activity.comparison_id,
      activity.server_status,
      activity.http_status_code,
      activity.duration_ms,
      activity.error_message || null,
      activity.total_changes || 0,
      activity.ip_address || '127.0.0.1',
      createdAt,
      activity.request_headers || null,
      activity.response_headers || null,
      activity.has_custom_rendering ? 1 : 0,
      activity.rendering_parameters || null,
      activity.machine_info || null
    ]
  );

  const inserted = queryGet<any>('SELECT * FROM comparison_activity ORDER BY id DESC LIMIT 1');
  return formatActivityRow(inserted);
}

export function getFilteredActivity(options: ActivityFilterOptions = {}): {
  items: ComparisonActivity[];
  total: number;
} {
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (options.user && options.user !== 'all') {
    whereClauses.push('(LOWER(user_email) LIKE ? OR LOWER(user_name) LIKE ?)');
    params.push(`%${options.user.toLowerCase()}%`, `%${options.user.toLowerCase()}%`);
  }

  if (options.source && options.source !== 'all') {
    whereClauses.push('source = ?');
    params.push(options.source);
  }

  if (options.status && options.status !== 'all') {
    if (options.status === 'failed_any') {
      whereClauses.push("server_status = 'failed'");
    } else {
      whereClauses.push('server_status = ?');
      params.push(options.status);
    }
  }

  if (options.search && options.search.trim()) {
    const s = `%${options.search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(original_filename) LIKE ? OR LOWER(modified_filename) LIKE ? OR LOWER(user_email) LIKE ? OR LOWER(comparison_id) LIKE ? OR LOWER(ip_address) LIKE ?)');
    params.push(s, s, s, s, s);
  }

  if (options.startDate) {
    whereClauses.push('created_at >= ?');
    params.push(options.startDate);
  }

  if (options.endDate) {
    whereClauses.push('created_at <= ?');
    params.push(options.endDate);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count
  const countRow = queryGet<any>(`SELECT COUNT(*) as cnt FROM comparison_activity ${whereSql}`, params);
  const total = countRow ? Number(countRow.cnt) : 0;

  // Get paged items
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  const pagedParams = [...params, limit, offset];

  const rows = queryAll<any>(
    `SELECT * FROM comparison_activity ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    pagedParams
  );

  return {
    items: rows.map(formatActivityRow),
    total,
  };
}

export function getDashboardSummary(options: ActivityFilterOptions = {}): ActivityDashboardSummary {
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (options.user && options.user !== 'all') {
    whereClauses.push('(LOWER(user_email) LIKE ? OR LOWER(user_name) LIKE ?)');
    params.push(`%${options.user.toLowerCase()}%`, `%${options.user.toLowerCase()}%`);
  }

  if (options.source && options.source !== 'all') {
    whereClauses.push('source = ?');
    params.push(options.source);
  }

  if (options.status && options.status !== 'all') {
    whereClauses.push('server_status = ?');
    params.push(options.status);
  }

  if (options.startDate) {
    whereClauses.push('created_at >= ?');
    params.push(options.startDate);
  }

  if (options.endDate) {
    whereClauses.push('created_at <= ?');
    params.push(options.endDate);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Aggregated totals
  const totalRow = queryGet<any>(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN server_status = 'success' THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN server_status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN source = 'addin' THEN 1 ELSE 0 END) as addin_count,
      SUM(CASE WHEN source = 'web' THEN 1 ELSE 0 END) as web_count,
      COUNT(DISTINCT user_email) as unique_users,
      AVG(duration_ms) as avg_latency
    FROM comparison_activity ${whereSql}`,
    params
  );

  const totalRequests = Number(totalRow?.total || 0);
  const successfulRequests = Number(totalRow?.successful || 0);
  const failedRequests = Number(totalRow?.failed || 0);
  const addinRequests = Number(totalRow?.addin_count || 0);
  const webRequests = Number(totalRow?.web_count || 0);
  const uniqueUsersCount = Number(totalRow?.unique_users || 0);
  const averageLatencyMs = Math.round(Number(totalRow?.avg_latency || 0));
  const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100;

  // Breakdown by individual user
  const userRows = queryAll<any>(
    `SELECT 
      user_email,
      user_name,
      COUNT(*) as total_requests,
      SUM(CASE WHEN server_status = 'success' THEN 1 ELSE 0 END) as successful_requests,
      SUM(CASE WHEN server_status = 'failed' THEN 1 ELSE 0 END) as failed_requests,
      SUM(CASE WHEN source = 'addin' THEN 1 ELSE 0 END) as addin_requests,
      SUM(CASE WHEN source = 'web' THEN 1 ELSE 0 END) as web_requests,
      MAX(created_at) as last_active
    FROM comparison_activity ${whereSql}
    GROUP BY user_email
    ORDER BY total_requests DESC`,
    params
  );

  const userSummaries: UserStatsSummary[] = userRows.map((r) => {
    const total = Number(r.total_requests || 0);
    const success = Number(r.successful_requests || 0);
    return {
      user_email: r.user_email,
      user_name: r.user_name || r.user_email.split('@')[0],
      total_requests: total,
      successful_requests: success,
      failed_requests: Number(r.failed_requests || 0),
      success_rate: total > 0 ? Math.round((success / total) * 100) : 0,
      addin_requests: Number(r.addin_requests || 0),
      web_requests: Number(r.web_requests || 0),
      last_active: r.last_active,
    };
  });

  // Recent timeline (last 7 days grouped)
  const timelineRows = queryAll<any>(
    `SELECT 
      SUBSTR(created_at, 1, 10) as day,
      COUNT(*) as day_total,
      SUM(CASE WHEN server_status = 'success' THEN 1 ELSE 0 END) as day_success,
      SUM(CASE WHEN server_status = 'failed' THEN 1 ELSE 0 END) as day_failed
    FROM comparison_activity ${whereSql}
    GROUP BY SUBSTR(created_at, 1, 10)
    ORDER BY day DESC
    LIMIT 14`,
    params
  );

  const recentTimeline = timelineRows.reverse().map((t) => ({
    date: t.day,
    total: Number(t.day_total || 0),
    success: Number(t.day_success || 0),
    failed: Number(t.day_failed || 0),
  }));

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    successRate,
    addinRequests,
    webRequests,
    uniqueUsersCount,
    averageLatencyMs,
    userSummaries,
    recentTimeline,
  };
}

export function getAllUniqueUsers(): Array<{ email: string; name: string }> {
  const rows = queryAll<any>(
    'SELECT DISTINCT user_email, user_name FROM comparison_activity WHERE user_email IS NOT NULL ORDER BY user_email ASC'
  );
  return rows.map((r) => ({
    email: r.user_email,
    name: r.user_name || r.user_email.split('@')[0],
  }));
}

function formatActivityRow(row: any): ComparisonActivity {
  return {
    id: Number(row.id),
    user_id: row.user_id,
    user_email: row.user_email,
    user_name: row.user_name,
    source: row.source,
    original_filename: row.original_filename,
    modified_filename: row.modified_filename,
    comparison_id: row.comparison_id,
    server_status: row.server_status,
    http_status_code: Number(row.http_status_code || 200),
    duration_ms: Number(row.duration_ms || 0),
    error_message: row.error_message || undefined,
    total_changes: Number(row.total_changes || 0),
    ip_address: row.ip_address || undefined,
    created_at: row.created_at,
    request_headers: row.request_headers || undefined,
    response_headers: row.response_headers || undefined,
    has_custom_rendering: Boolean(row.has_custom_rendering),
    rendering_parameters: row.rendering_parameters || undefined,
    machine_info: row.machine_info || undefined,
  };
}
