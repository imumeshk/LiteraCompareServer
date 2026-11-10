import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { queryAll } from '../db/client.js';
import {
  getFilteredActivity,
  getDashboardSummary,
  getAllUniqueUsers,
  logComparisonActivity,
} from '../models/comparisonActivity.js';
import {
  getActivitySettings,
  updateActivitySettings,
} from '../models/activitySettings.js';

const router = Router();

// GET /api/activity/settings - Get current activity tracking settings
router.get('/settings', (req: Request, res: Response) => {
  const settings = getActivitySettings();
  res.json({
    success: true,
    settings,
  });
});

// PUT /api/activity/settings - Update tracking settings (Admin Only)
router.put('/settings', requireAuth, (req: Request, res: Response) => {
  const settings = updateActivitySettings(req.body);
  res.json({
    success: true,
    settings,
  });
});

// GET /api/activity/active-users - Get currently active users
router.get('/active-users', requireAuth, (req: Request, res: Response) => {
  // Get active SSO users
  const ssoQuery = `
    WITH RankedEvents AS (
      SELECT user_email, user_name, source, event_type, created_at,
             ROW_NUMBER() OVER(PARTITION BY user_email, source ORDER BY created_at DESC) as rn
      FROM sso_events
      WHERE user_email IS NOT NULL
    )
    SELECT user_email, user_name, source, created_at as login_time
    FROM RankedEvents 
    WHERE rn = 1 AND event_type = 'login'
  `;
  const activeSsoRows = queryAll<any>(ssoQuery);

  // Get active non-SSO users (guests based on IP) in the last 60 minutes
  const guestQuery = `
    SELECT ip_address, source, MAX(created_at) as login_time
    FROM comparison_activity
    WHERE (user_email = 'anonymous@guest.local' OR user_email IS NULL OR user_email = 'guest@litera.local')
      AND created_at >= datetime('now', '-60 minutes')
    GROUP BY ip_address, source
  `;
  const activeGuestRows = queryAll<any>(guestQuery);

  // Group by user (email for SSO, IP for guest)
  const usersMap = new Map<string, any>();

  for (const row of activeSsoRows) {
    const key = row.user_email;
    if (!usersMap.has(key)) {
      usersMap.set(key, {
        id: key,
        type: 'sso',
        name: row.user_name || row.user_email,
        email: row.user_email,
        taskpane_time: null,
        web_time: null
      });
    }
    const user = usersMap.get(key);
    if (row.source === 'addin') {
      user.taskpane_time = row.login_time;
    } else {
      user.web_time = row.login_time;
    }
  }

  for (const row of activeGuestRows) {
    const key = row.ip_address || 'unknown';
    if (!usersMap.has(key)) {
      usersMap.set(key, {
        id: key,
        type: 'guest',
        name: key, // name is IP for non-SSO
        email: null,
        taskpane_time: null,
        web_time: null
      });
    }
    const user = usersMap.get(key);
    if (row.source === 'addin') {
      user.taskpane_time = row.login_time;
    } else {
      user.web_time = row.login_time;
    }
  }

  res.json({
    success: true,
    activeUsers: Array.from(usersMap.values())
  });
});

// GET /api/activity/logs - Get paginated/filtered comparison activity (Admin Only)
router.get('/logs', requireAuth, (req: Request, res: Response) => {
  const {
    user,
    source,
    status,
    search,
    startDate,
    endDate,
    limit,
    offset,
  } = req.query;

  const results = getFilteredActivity({
    user: user as string,
    source: (source as any) || 'all',
    status: (status as any) || 'all',
    search: search as string,
    startDate: startDate as string,
    endDate: endDate as string,
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0,
  });

  res.json({
    success: true,
    items: results.items,
    total: results.total,
  });
});

// GET /api/activity/summary - Aggregated dashboard metrics & charts (Admin Only)
router.get('/summary', requireAuth, (req: Request, res: Response) => {
  const {
    user,
    source,
    status,
    startDate,
    endDate,
  } = req.query;

  const summary = getDashboardSummary({
    user: user as string,
    source: (source as any) || 'all',
    status: (status as any) || 'all',
    startDate: startDate as string,
    endDate: endDate as string,
  });

  res.json({
    success: true,
    summary,
  });
});

// GET /api/activity/users - Active users list for filter dropdown
router.get('/users', requireAuth, (req: Request, res: Response) => {
  const users = getAllUniqueUsers();
  res.json({
    success: true,
    users,
  });
});

// POST /api/activity/log - Record comparison action from addin/viewer
router.post('/log', (req: Request, res: Response) => {
  const {
    user_id,
    user_email,
    user_name,
    source,
    original_filename,
    modified_filename,
    comparison_id,
    server_status,
    http_status_code,
    duration_ms,
    error_message,
    total_changes,
    request_headers,
    response_headers,
    has_custom_rendering,
    rendering_parameters,
    machine_info
  } = req.body;

  // Check activity tracking settings
  const settings = getActivitySettings();
  
  if (!settings.logging_enabled) {
    // Logging is completely disabled, return early silently
    res.json({ success: true, activity: null, skipped: 'logging_disabled' });
    return;
  }

  // Determine if this is an SSO user based on user_email
  const isGuest = !user_email || user_email === 'guest@litera.local';
  const isSsoUser = !isGuest;

  if (isSsoUser && !settings.log_with_sso) {
    res.json({ success: true, activity: null, skipped: 'log_with_sso_disabled' });
    return;
  }

  if (!isSsoUser && !settings.log_without_sso) {
    res.json({ success: true, activity: null, skipped: 'log_without_sso_disabled' });
    return;
  }

  if (!source || !original_filename || !modified_filename) {
    res.status(400).json({ error: 'Missing required comparison metadata.' });
    return;
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const finalMachineInfo = machine_info || req.headers['user-agent'] || undefined;

  // Derive status from the real HTTP response code returned by the Compare Server
  const resolvedCode = Number(http_status_code) || 0;
  const resolvedStatus: 'success' | 'failed' | 'unknown' =
    resolvedCode >= 200 && resolvedCode < 300
      ? 'success'
      : resolvedCode >= 400
      ? 'failed'
      : server_status === 'failed'
      ? 'failed'
      : resolvedCode === 0
      ? 'unknown'
      : 'failed';

  const logged = logComparisonActivity({
    user_id: user_id || 'usr_guest',
    user_email: user_email || 'guest@litera.local',
    user_name: user_name || 'Guest User',
    source: source === 'addin' ? 'addin' : 'web',
    original_filename,
    modified_filename,
    comparison_id: comparison_id || `cmp_${Math.random().toString(36).substring(2, 9)}`,
    server_status: resolvedStatus,
    http_status_code: resolvedCode,
    duration_ms: duration_ms ? Number(duration_ms) : 0,
    error_message: error_message || undefined,
    total_changes: total_changes ? Number(total_changes) : 0,
    ip_address: clientIp,
    created_at: new Date().toISOString(),
    request_headers: request_headers ? JSON.stringify(request_headers) : undefined,
    response_headers: response_headers ? JSON.stringify(response_headers) : undefined,
    has_custom_rendering: Boolean(has_custom_rendering),
    rendering_parameters: rendering_parameters ? JSON.stringify(rendering_parameters) : undefined,
    machine_info: finalMachineInfo
  });

  res.json({
    success: true,
    activity: logged,
  });
});

// GET /api/activity/export - Download statistics & activity log as CSV or JSON (Admin Only)
router.get('/export', requireAuth, (req: Request, res: Response) => {
  const {
    user,
    source,
    status,
    search,
    startDate,
    endDate,
    format = 'csv',
  } = req.query;

  const data = getFilteredActivity({
    user: user as string,
    source: (source as any) || 'all',
    status: (status as any) || 'all',
    search: search as string,
    startDate: startDate as string,
    endDate: endDate as string,
    limit: 10000,
    offset: 0,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=litera_compare_activity_${timestamp}.json`);
    res.send(JSON.stringify(data.items, null, 2));
    return;
  }

  // Generate CSV format
  const csvHeaders = [
    'Log ID',
    'Timestamp (UTC)',
    'User Email',
    'User Name',
    'Application Source',
    'Original Document',
    'Modified Document',
    'Comparison ID',
    'Compare Server Status',
    'HTTP Code',
    'Duration (ms)',
    'Total Differences',
    'Error Details',
    'IP Address',
    'Machine / UA Info',
    'Custom Rendering'
  ];

  const csvRows = data.items.map((item) => [
    item.id,
    item.created_at,
    item.user_email,
    item.user_name,
    item.source,
    item.original_filename,
    item.modified_filename,
    item.comparison_id,
    item.server_status,
    item.http_status_code,
    item.duration_ms,
    item.total_changes,
    item.error_message || '',
    item.ip_address || '',
    item.machine_info || '',
    item.has_custom_rendering ? 'Yes' : 'No'
  ]);

  const csvContent = [
    csvHeaders.map(h => `"${h}"`).join(','),
    ...csvRows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=litera_compare_activity_${timestamp}.csv`);
  res.send(csvContent);
});

export { router as activityRouter };
