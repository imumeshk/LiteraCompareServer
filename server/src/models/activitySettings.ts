import { queryGet, queryRun } from '../db/client.js';

export interface ActivitySettings {
  logging_enabled: boolean;
  log_with_sso: boolean;
  log_without_sso: boolean;
  retention_days: number;
}

export function getActivitySettings(): ActivitySettings {
  let row = queryGet<any>('SELECT * FROM activity_settings WHERE id = 1');

  if (!row) {
    queryRun(
      `INSERT INTO activity_settings (id, logging_enabled, log_with_sso, log_without_sso, retention_days, updated_at) 
       VALUES (1, 1, 1, 1, 90, ?)`,
      [new Date().toISOString()]
    );
    row = queryGet<any>('SELECT * FROM activity_settings WHERE id = 1');
  }

  return {
    logging_enabled: Boolean(row.logging_enabled),
    log_with_sso: Boolean(row.log_with_sso),
    log_without_sso: Boolean(row.log_without_sso),
    retention_days: Number(row.retention_days),
  };
}

export function updateActivitySettings(updates: Partial<ActivitySettings>): ActivitySettings {
  const current = getActivitySettings();
  
  const merged = {
    ...current,
    ...updates,
  };

  if (merged.retention_days > 180) {
    merged.retention_days = 180;
  }
  if (merged.retention_days < 1) {
    merged.retention_days = 1;
  }

  queryRun(
    `UPDATE activity_settings 
     SET logging_enabled = ?, log_with_sso = ?, log_without_sso = ?, retention_days = ?, updated_at = ?
     WHERE id = 1`,
    [
      merged.logging_enabled ? 1 : 0,
      merged.log_with_sso ? 1 : 0,
      merged.log_without_sso ? 1 : 0,
      merged.retention_days,
      new Date().toISOString(),
    ]
  );

  return getActivitySettings();
}

export function purgeOldActivity(): { deleted: number } {
  const settings = getActivitySettings();
  
  const result = queryRun(`
    DELETE FROM comparison_activity 
    WHERE datetime(created_at) < datetime('now', '-' || ? || ' days')
  `, [settings.retention_days]);

  return { deleted: result.changes };
}
