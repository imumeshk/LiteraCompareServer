import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { queryAll } from '../db/client.js';

const router = Router();

router.get('/active', requireAuth, (req: Request, res: Response) => {
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

export default router;
