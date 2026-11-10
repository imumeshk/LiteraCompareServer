import { getDb, DEFAULT_ADDIN_SETTINGS, DEFAULT_VIEWER_SETTINGS, DEFAULT_SERVER_CONFIG, DEFAULT_MANIFEST_SETTINGS, queryRun, saveDb } from './client.js';

export async function runSeed(forceReset = false) {
  const db = await getDb();
  if (forceReset) {
      db.run(
        `UPDATE server_config SET
          compare_server_url = ?,
          addin_url = ?,
          viewer_url = ?,
          install_mode = ?,
          installed_at = ?,
          app_name = ?,
          app_base_url = ?,
          brand_logo_text = ?,
          brand_title = ?,
          brand_subtitle = ?,
          enqueue_endpoint_url = ?,
          active_endpoint = ?
         WHERE id = 1`,
        [
          DEFAULT_SERVER_CONFIG.compare_server_url,
          DEFAULT_SERVER_CONFIG.addin_url,
          DEFAULT_SERVER_CONFIG.viewer_url,
          DEFAULT_SERVER_CONFIG.install_mode,
          DEFAULT_SERVER_CONFIG.installed_at,
          DEFAULT_SERVER_CONFIG.app_name,
          DEFAULT_SERVER_CONFIG.app_base_url,
          DEFAULT_SERVER_CONFIG.brand_logo_text,
          DEFAULT_SERVER_CONFIG.brand_title,
          DEFAULT_SERVER_CONFIG.brand_subtitle,
          DEFAULT_SERVER_CONFIG.enqueue_endpoint_url,
          DEFAULT_SERVER_CONFIG.active_endpoint,
        ]
      );

    queryRun(
      `UPDATE manifest_settings SET
        manifest_id = ?, version = ?, provider_name = ?, default_locale = ?,
        display_name = ?, description = ?, icon_url = ?, high_resolution_icon_url = ?,
        support_url = ?, office_tab_id = ?, group_id = ?, debug_logger_tag = ?, taskpane_id = ?
       WHERE id = 1`,
      [
        DEFAULT_MANIFEST_SETTINGS.manifest_id,
        DEFAULT_MANIFEST_SETTINGS.version,
        DEFAULT_MANIFEST_SETTINGS.provider_name,
        DEFAULT_MANIFEST_SETTINGS.default_locale,
        DEFAULT_MANIFEST_SETTINGS.display_name,
        DEFAULT_MANIFEST_SETTINGS.description,
        DEFAULT_MANIFEST_SETTINGS.icon_url,
        DEFAULT_MANIFEST_SETTINGS.high_resolution_icon_url,
        DEFAULT_MANIFEST_SETTINGS.support_url,
        DEFAULT_MANIFEST_SETTINGS.office_tab_id,
        DEFAULT_MANIFEST_SETTINGS.group_id,
        DEFAULT_MANIFEST_SETTINGS.debug_logger_tag,
        DEFAULT_MANIFEST_SETTINGS.taskpane_id,
      ]
    );

    queryRun(
      `UPDATE addin_settings SET
        show_save_options = ?,
        show_email_options = ?,
        default_email_checked = ?,
        enable_hints = ?,
        show_in_download_list = ?,
        show_path_after_action = ?,
        remember_last_folder = ?,
        enable_cancel_compare = ?,
        name_prefixes = ?,
        name_template = ?,
        email_subject_template = ?,
        lock_name_formatting = ?,
        lock_email_subject = ?
       WHERE id = 1`,
      [
        JSON.stringify(DEFAULT_ADDIN_SETTINGS.show_save_options),
        JSON.stringify(DEFAULT_ADDIN_SETTINGS.show_email_options),
        JSON.stringify(DEFAULT_ADDIN_SETTINGS.default_email_checked),
        DEFAULT_ADDIN_SETTINGS.enable_hints ? 1 : 0,
        DEFAULT_ADDIN_SETTINGS.show_in_download_list ? 1 : 0,
        DEFAULT_ADDIN_SETTINGS.show_path_after_action ? 1 : 0,
        DEFAULT_ADDIN_SETTINGS.remember_last_folder ? 1 : 0,
        DEFAULT_ADDIN_SETTINGS.enable_cancel_compare ? 1 : 0,
        JSON.stringify(DEFAULT_ADDIN_SETTINGS.name_prefixes),
        DEFAULT_ADDIN_SETTINGS.name_template,
        DEFAULT_ADDIN_SETTINGS.email_subject_template,
        DEFAULT_ADDIN_SETTINGS.lock_name_formatting ? 1 : 0,
        DEFAULT_ADDIN_SETTINGS.lock_email_subject ? 1 : 0,
      ]
    );

    queryRun(`UPDATE viewer_settings SET show_categories = ? WHERE id = 1`, [
      DEFAULT_VIEWER_SETTINGS.show_categories ? 1 : 0,
    ]);

    saveDb();
    console.log('Database defaults reset successfully.');
  }
}
