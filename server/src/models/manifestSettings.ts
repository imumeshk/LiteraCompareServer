import { queryGet, queryRun, DEFAULT_MANIFEST_SETTINGS } from '../db/client.js';

export interface ManifestSettings {
  id: number;
  manifest_id: string;
  version: string;
  provider_name: string;
  default_locale: string;
  display_name: string;
  description: string;
  icon_url: string;
  high_resolution_icon_url: string;
  support_url: string;
  office_tab_id: string;
  group_id: string;
  debug_logger_tag: string;
  taskpane_id: string;
}

export function getManifestSettings(): ManifestSettings {
  const row = queryGet<ManifestSettings>('SELECT * FROM manifest_settings WHERE id = 1');
  if (!row) {
    return {
      id: 1,
      ...DEFAULT_MANIFEST_SETTINGS,
    };
  }
  return row;
}

export function updateManifestSettings(data: Partial<Omit<ManifestSettings, 'id'>>): ManifestSettings {
  const current = getManifestSettings();
  const updated: ManifestSettings = {
    ...current,
    ...data,
  };

  queryRun(
    `UPDATE manifest_settings SET
      manifest_id = ?,
      version = ?,
      provider_name = ?,
      default_locale = ?,
      display_name = ?,
      description = ?,
      icon_url = ?,
      high_resolution_icon_url = ?,
      support_url = ?,
      office_tab_id = ?,
      group_id = ?,
      debug_logger_tag = ?,
      taskpane_id = ?
     WHERE id = 1`,
    [
      updated.manifest_id,
      updated.version,
      updated.provider_name,
      updated.default_locale,
      updated.display_name,
      updated.description,
      updated.icon_url,
      updated.high_resolution_icon_url,
      updated.support_url,
      updated.office_tab_id,
      updated.group_id,
      updated.debug_logger_tag,
      updated.taskpane_id,
    ]
  );

  return getManifestSettings();
}
