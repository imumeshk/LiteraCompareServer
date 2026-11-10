import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlValue } from 'sql.js';
import { ENV } from '../env.js';

let dbInstance: Database | null = null;
let sqlEngine: any = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!sqlEngine) {
    sqlEngine = await initSqlJs();
  }

  const dbDir = path.dirname(ENV.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(ENV.DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(ENV.DB_PATH);
      dbInstance = new sqlEngine.Database(fileBuffer);
    } catch (err) {
      console.warn('Failed to load existing DB file, initializing new one:', err);
      dbInstance = new sqlEngine.Database();
    }
  } else {
    dbInstance = new sqlEngine.Database();
  }

  // Run migrations
  await runMigrations(dbInstance);
  saveDb();

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const dbDir = path.dirname(ENV.DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    fs.writeFileSync(ENV.DB_PATH, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

async function runMigrations(db: Database) {
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN enable_password_fields INTEGER NOT NULL DEFAULT 1;'); } catch (e) {}
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN enable_reset_button INTEGER NOT NULL DEFAULT 1;'); } catch (e) {}
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN enable_new_comparison_btn INTEGER NOT NULL DEFAULT 1;'); } catch (e) {}
  try { db.exec("ALTER TABLE viewer_settings ADD COLUMN new_comparison_target TEXT NOT NULL DEFAULT 'same_tab';"); } catch (e) {}
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN enable_save_prompt INTEGER NOT NULL DEFAULT 1;'); } catch (e) {}

  // Ensure server_config table exists with all columns
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS server_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        compare_server_url TEXT NOT NULL DEFAULT 'https://compare.litera.com/api/v1',
        addin_url TEXT NOT NULL DEFAULT 'http://localhost:3000/addin',
        viewer_url TEXT NOT NULL DEFAULT 'http://localhost:3000/viewer',
        install_mode TEXT NOT NULL DEFAULT 'full',
        installed_at TEXT,
        app_name TEXT NOT NULL DEFAULT 'Litera Compare Server admin Console',
        app_base_url TEXT NOT NULL DEFAULT 'http://localhost:3000',
        brand_logo_text TEXT NOT NULL DEFAULT 'L',
        brand_title TEXT NOT NULL DEFAULT 'Compare Server',
        brand_subtitle TEXT NOT NULL DEFAULT 'Enterprise Document Comparison'
      );
    `);
  } catch {}

  // Add columns to existing server_config if they are missing
  try { db.exec("ALTER TABLE server_config ADD COLUMN app_name TEXT NOT NULL DEFAULT 'Litera Compare Server admin Console';"); } catch {}
  try { db.exec("ALTER TABLE server_config ADD COLUMN app_base_url TEXT NOT NULL DEFAULT 'http://localhost:3000';"); } catch {}
  try { db.exec("ALTER TABLE server_config ADD COLUMN brand_logo_text TEXT NOT NULL DEFAULT 'L';"); } catch {}
  try { db.exec("ALTER TABLE server_config ADD COLUMN brand_title TEXT NOT NULL DEFAULT 'Compare Server';"); } catch {}
  try { db.exec("ALTER TABLE server_config ADD COLUMN brand_subtitle TEXT NOT NULL DEFAULT 'Enterprise Document Comparison';"); } catch {}
  try { db.exec("ALTER TABLE server_config ADD COLUMN enqueue_endpoint_url TEXT;"); } catch {}
  try { db.exec("ALTER TABLE server_config ADD COLUMN active_endpoint TEXT NOT NULL DEFAULT 'compare';"); } catch {}

  // Migrate older install_mode values to the new ones
  try {
    db.exec("UPDATE server_config SET install_mode = 'full' WHERE install_mode IN ('addin_and_admin_and_viewer', 'addin_admin_and_viewer');");
    db.exec("UPDATE server_config SET install_mode = 'addin' WHERE install_mode = 'addin_and_admin';");
    db.exec("UPDATE server_config SET install_mode = 'viewer' WHERE install_mode IN ('addin_and_viewer', 'viewer_only');");
  } catch {}

  const schemaSql = `
    CREATE TABLE IF NOT EXISTS manifest_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      manifest_id TEXT NOT NULL,
      version TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      default_locale TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon_url TEXT NOT NULL,
      high_resolution_icon_url TEXT NOT NULL,
      support_url TEXT NOT NULL,
      office_tab_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      debug_logger_tag TEXT NOT NULL,
      taskpane_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS addin_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      show_save_options TEXT NOT NULL,
      show_email_options TEXT NOT NULL,
      default_email_checked TEXT NOT NULL,
      enable_hints INTEGER NOT NULL DEFAULT 1,
      show_in_download_list INTEGER NOT NULL DEFAULT 0,
      show_path_after_action INTEGER NOT NULL DEFAULT 1,
      remember_last_folder INTEGER NOT NULL DEFAULT 0,
      enable_cancel_compare INTEGER NOT NULL DEFAULT 1,
      name_prefixes TEXT NOT NULL,
      name_template TEXT NOT NULL,
      email_subject_template TEXT NOT NULL,
      user_override_save_options INTEGER NOT NULL DEFAULT 0,
      user_override_email_options INTEGER NOT NULL DEFAULT 0,
      user_override_templates INTEGER NOT NULL DEFAULT 0,
      user_override_prefixes INTEGER NOT NULL DEFAULT 0,
      user_override_interaction_toggles INTEGER NOT NULL DEFAULT 0,
      allow_custom_rendering_options INTEGER NOT NULL DEFAULT 0,
        enable_password_fields INTEGER NOT NULL DEFAULT 1,
      lock_name_formatting INTEGER NOT NULL DEFAULT 0,
      lock_email_subject INTEGER NOT NULL DEFAULT 0,
      hide_settings INTEGER NOT NULL DEFAULT 0,
      hide_settings_hints INTEGER NOT NULL DEFAULT 0,
      hide_settings_save_menu_items INTEGER NOT NULL DEFAULT 0,
      hide_settings_email_menu_items INTEGER NOT NULL DEFAULT 0,
      hide_settings_default_checked INTEGER NOT NULL DEFAULT 0,
      hide_settings_save_behavior INTEGER NOT NULL DEFAULT 0,
      hide_settings_compare_behavior INTEGER NOT NULL DEFAULT 0,
      hide_settings_name_prefixes INTEGER NOT NULL DEFAULT 0,
      hide_settings_email_subject INTEGER NOT NULL DEFAULT 0,
      hide_settings_show_in_download_list INTEGER NOT NULL DEFAULT 0,
      hide_settings_remember_last_folder INTEGER NOT NULL DEFAULT 0,
      hide_settings_show_saved_path INTEGER NOT NULL DEFAULT 0,
      hide_button_email INTEGER NOT NULL DEFAULT 0,
      hide_button_view INTEGER NOT NULL DEFAULT 0,
      hide_button_cancel INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS viewer_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      show_categories INTEGER NOT NULL DEFAULT 0,
      show_changelist INTEGER NOT NULL DEFAULT 1,
      show_statistics INTEGER NOT NULL DEFAULT 1,
      show_toolbar INTEGER NOT NULL DEFAULT 1,
      show_redline INTEGER NOT NULL DEFAULT 1,
      toolbar_show_pdf INTEGER NOT NULL DEFAULT 1,
      toolbar_show_docx INTEGER NOT NULL DEFAULT 1,
      toolbar_show_tracked INTEGER NOT NULL DEFAULT 1,
      toolbar_show_changed_pages INTEGER NOT NULL DEFAULT 1,
      toolbar_show_print INTEGER NOT NULL DEFAULT 1,
      toolbar_show_nav_arrows INTEGER NOT NULL DEFAULT 1,
      accept_changes_enabled INTEGER NOT NULL DEFAULT 1,
      loading_message TEXT NOT NULL DEFAULT 'Uploading files for comparison & comparing file',
      custom_languages TEXT NOT NULL DEFAULT '[]',
      show_rendering_params_on_home INTEGER NOT NULL DEFAULT 0,
      enable_password_fields INTEGER NOT NULL DEFAULT 1,
      enable_reset_button INTEGER NOT NULL DEFAULT 1,
      enable_new_comparison_btn INTEGER NOT NULL DEFAULT 1,
      new_comparison_target TEXT NOT NULL DEFAULT 'same_tab',
      enable_save_prompt INTEGER NOT NULL DEFAULT 1,
      enable_cancel INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS compare_server_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      compare_headers_footers INTEGER NOT NULL DEFAULT 1,
      compare_footnotes INTEGER NOT NULL DEFAULT 1,
      compare_character_level INTEGER NOT NULL DEFAULT 0,
      ignore_case_changes INTEGER NOT NULL DEFAULT 0,
      ignore_textboxes INTEGER NOT NULL DEFAULT 0,
      ignore_tables INTEGER NOT NULL DEFAULT 0,
      compare_comments INTEGER NOT NULL DEFAULT 0,
      compare_images INTEGER NOT NULL DEFAULT 0,
      detect_list_numbering INTEGER NOT NULL DEFAULT 1,
      detect_movements INTEGER NOT NULL DEFAULT 1,
      detect_whitespace INTEGER NOT NULL DEFAULT 1,
      detect_paragraph_changes INTEGER NOT NULL DEFAULT 0,
      detect_font_changes INTEGER NOT NULL DEFAULT 0,
      detect_para_style_changes INTEGER NOT NULL DEFAULT 0,
      detect_char_style_changes INTEGER NOT NULL DEFAULT 0,
      remove_pages_without_changes INTEGER NOT NULL DEFAULT 0,
      include_statistics INTEGER NOT NULL DEFAULT 0,
      include_summary INTEGER NOT NULL DEFAULT 0,
      show_workshare_footers INTEGER NOT NULL DEFAULT 0,
      show_change_numbering INTEGER NOT NULL DEFAULT 0,
      paragraph_threshold INTEGER NOT NULL DEFAULT 10,
      output_format TEXT NOT NULL DEFAULT 'DocX'
        CHECK (output_format IN ('Rtf','Doc','DocX','Pdf','TrackChanges','RedlineJSON','RedlineMl')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES admin_users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sso_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER NOT NULL DEFAULT 1,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      addin_redirect_uri TEXT NOT NULL,
      web_redirect_uri TEXT NOT NULL,
      allowed_domains TEXT NOT NULL,
      scopes TEXT NOT NULL,
      require_login_to_compare INTEGER NOT NULL DEFAULT 1,
      authority_url TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comparison_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      user_name TEXT NOT NULL,
      source TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      modified_filename TEXT NOT NULL,
      comparison_id TEXT NOT NULL,
      server_status TEXT NOT NULL,
      http_status_code INTEGER NOT NULL DEFAULT 200,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      total_changes INTEGER NOT NULL DEFAULT 0,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sso_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      source TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      logging_enabled INTEGER NOT NULL DEFAULT 1,
      log_with_sso INTEGER NOT NULL DEFAULT 1,
      log_without_sso INTEGER NOT NULL DEFAULT 1,
      retention_days INTEGER NOT NULL DEFAULT 90,
      updated_at TEXT NOT NULL
    );
  `;

  db.exec(schemaSql);

  // --- Migrations ---
  try {
    db.exec(`ALTER TABLE comparison_activity ADD COLUMN request_headers TEXT;`);
    db.exec(`ALTER TABLE comparison_activity ADD COLUMN response_headers TEXT;`);
    db.exec(`ALTER TABLE comparison_activity ADD COLUMN has_custom_rendering INTEGER NOT NULL DEFAULT 0;`);
    db.exec(`ALTER TABLE comparison_activity ADD COLUMN rendering_parameters TEXT;`);
    db.exec(`ALTER TABLE comparison_activity ADD COLUMN machine_info TEXT;`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN custom_languages TEXT NOT NULL DEFAULT '[]';`);
  } catch (e) {}

  
  try {
    db.exec(`ALTER TABLE addin_settings ADD COLUMN lock_name_formatting INTEGER NOT NULL DEFAULT 0;`);
    db.exec(`ALTER TABLE addin_settings ADD COLUMN lock_email_subject INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE addin_settings ADD COLUMN custom_languages TEXT NOT NULL DEFAULT '[]';`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE addin_settings ADD COLUMN user_override_save_options INTEGER NOT NULL DEFAULT 0;`);
    db.exec(`ALTER TABLE addin_settings ADD COLUMN user_override_email_options INTEGER NOT NULL DEFAULT 0;`);
    db.exec(`ALTER TABLE addin_settings ADD COLUMN user_override_templates INTEGER NOT NULL DEFAULT 0;`);
    db.exec(`ALTER TABLE addin_settings ADD COLUMN user_override_prefixes INTEGER NOT NULL DEFAULT 0;`);
    db.exec(`ALTER TABLE addin_settings ADD COLUMN user_override_interaction_toggles INTEGER NOT NULL DEFAULT 0;`);
    db.exec(`ALTER TABLE addin_settings ADD COLUMN allow_custom_rendering_options INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {}

  try { db.exec(`ALTER TABLE addin_settings ADD COLUMN enable_password_fields INTEGER NOT NULL DEFAULT 1;`); } catch (e) {}


  try {
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_hints INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_save_menu_items INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_email_menu_items INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_default_checked INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_save_behavior INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_compare_behavior INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_name_prefixes INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_email_subject INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_show_in_download_list INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_remember_last_folder INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_settings_show_saved_path INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_button_email INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_button_view INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE addin_settings ADD COLUMN hide_button_cancel INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {}
  // Migrate viewer_settings if columns are missing

  try {
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN show_changelist INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN show_statistics INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN show_toolbar INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN show_redline INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN toolbar_show_pdf INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN toolbar_show_docx INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN toolbar_show_tracked INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN toolbar_show_changed_pages INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN toolbar_show_print INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN toolbar_show_nav_arrows INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN accept_changes_enabled INTEGER NOT NULL DEFAULT 1;`);
    db.exec(`ALTER TABLE viewer_settings ADD COLUMN show_rendering_params_on_home INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {
    // Ignore, might already exist
  }
  
  // Migration: update old manifest defaults to generic defaults
  try {
    db.run("UPDATE manifest_settings SET support_url = 'support@example.com' WHERE support_url = 'https://www.litera.com/support'");
    db.run("UPDATE manifest_settings SET group_id = 'AddInGroup' WHERE group_id = 'LiteraCompareGroup'");
    db.run("UPDATE manifest_settings SET taskpane_id = 'TaskpaneID' WHERE taskpane_id = 'LiteraCompareTaskpane'");
  } catch(e) {}

  // Migrate viewer_settings cancel column
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN enable_cancel INTEGER NOT NULL DEFAULT 0;'); } catch (e) {}

  // Migrate viewer_settings automated file columns
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN name_template TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN name_prefixes TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN user_override_templates INTEGER NOT NULL DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN user_override_prefixes INTEGER NOT NULL DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN enable_name_templates INTEGER NOT NULL DEFAULT 1;'); } catch (e) {}
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN allow_user_edit_filename INTEGER NOT NULL DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE viewer_settings ADD COLUMN enable_save_as_dialog INTEGER NOT NULL DEFAULT 0;'); } catch (e) {}

  // Migrate server_config cors columns
  try { db.exec("ALTER TABLE server_config ADD COLUMN cors_mode TEXT NOT NULL DEFAULT 'bypass';"); } catch (e) {}
  try { db.exec("ALTER TABLE server_config ADD COLUMN cors_allowed_origins TEXT NOT NULL DEFAULT '';"); } catch (e) {}

  // Seed defaults if empty
  await seedDefaults(db);
}

export const DEFAULT_ADDIN_SETTINGS = {
  show_save_options: ['pdf', 'docx', 'track_changes', 'changedPagesPdf'],
  show_email_options: ['original', 'modified', 'pdf', 'docx', 'track_changes', 'changedPagesPdf'],
  default_email_checked: ['pdf'],
  enable_hints: true,
  show_in_download_list: false,
  show_path_after_action: true,
  remember_last_folder: false,
  enable_cancel_compare: true,
  name_prefixes: {
    pdf: 'Redline - ',
    docx: 'Redline - ',
    track_changes: 'Track Changes - ',
    changedPagesPdf: 'Redline Pages - ',
    default: 'Comparison - ',
  },
  name_template: '{prefix}{original} and {modified}',
  email_subject_template: 'Document Comparison ({original} vs {modified})',
  lock_name_formatting: false,
  lock_email_subject: false,
  user_override_save_options: false,
  user_override_email_options: false,
  user_override_templates: false,
  user_override_prefixes: false,
  user_override_interaction_toggles: false,
  allow_custom_rendering_options: false,
  enable_password_fields: false,
  custom_languages: '[]',
  hide_settings: false,
  hide_settings_hints: false,
  hide_settings_save_menu_items: false,
  hide_settings_email_menu_items: false,
  hide_settings_default_checked: false,
  hide_settings_save_behavior: false,
  hide_settings_compare_behavior: false,
  hide_settings_name_prefixes: false,
  hide_settings_email_subject: false,
  hide_button_email: false,
  hide_button_view: false,
  hide_button_cancel: false,
};

export const DEFAULT_VIEWER_SETTINGS = {
  show_categories: false,
  show_changelist: true,
  show_statistics: true,
  show_toolbar: true,
  show_redline: true,
  toolbar_show_pdf: true,
  toolbar_show_docx: true,
  toolbar_show_tracked: true,
  toolbar_show_changed_pages: true,
  toolbar_show_print: true,
  toolbar_show_nav_arrows: true,
  accept_changes_enabled: true,
  custom_languages: '[]',
  show_rendering_params_on_home: false,
  enable_password_fields: true,
  enable_reset_button: true,
  enable_new_comparison_btn: true,
  new_comparison_target: 'same_tab',
  enable_save_prompt: true,
  loading_message: 'Uploading files for comparison & comparing file',
  name_template: '{prefix}{original} and {modified}',
  name_prefixes: {
    pdf: 'Redline - ',
    docx: 'Redline - ',
    track_changes: 'Track Changes - ',
    changedPagesPdf: 'Redline Pages - ',
    default: 'Comparison - ',
  },
  user_override_templates: false,
  user_override_prefixes: false,
  enable_name_templates: true,
  allow_user_edit_filename: false,
  enable_save_as_dialog: false,
};

export const DEFAULT_COMPARE_SERVER_SETTINGS = {
  compare_headers_footers: 1,
  compare_footnotes: 1,
  compare_character_level: 0,
  ignore_case_changes: 0,
  ignore_textboxes: 0,
  ignore_tables: 0,
  compare_comments: 0,
  compare_images: 0,
  detect_list_numbering: 1,
  detect_movements: 1,
  detect_whitespace: 1,
  detect_paragraph_changes: 0,
  detect_font_changes: 0,
  detect_para_style_changes: 0,
  detect_char_style_changes: 0,
  remove_pages_without_changes: 0,
  include_statistics: 0,
  include_summary: 0,
  show_workshare_footers: 0,
  show_change_numbering: 0,
  paragraph_threshold: 10,
  output_format: 'DocX' as const,
};

import { ENV } from '../env.js';

export const DEFAULT_SERVER_CONFIG = {
  compare_server_url: 'https://compare.litera.com/api/v1',
  addin_url: `${ENV.APP_URL}/addin`,
  viewer_url: `${ENV.APP_URL}/viewer`,
  install_mode: 'full' as const,
  installed_at: null as string | null,
  app_name: 'Litera Compare Server admin Console',
  app_base_url: ENV.APP_URL,
  brand_logo_text: 'L',
  brand_title: 'Compare Server',
  brand_subtitle: 'Enterprise Document Comparison',
  cors_mode: 'bypass' as const,
  cors_allowed_origins: '',
  enqueue_endpoint_url: '',
  active_endpoint: 'compare' as const,
};

export const DEFAULT_MANIFEST_SETTINGS = {
  manifest_id: 'e3a4789b-9801-4475-9e6b-a4962b1b36fa',
  version: '1.2.0.0',
  provider_name: 'Litera',
  default_locale: 'en-US',
  display_name: 'Litera Compare',
  description: 'Litera Compare Server Office Add-in for seamless document comparison.',
  icon_url: '/assets/icon-32.png',
  high_resolution_icon_url: '/assets/icon-80.png',
  support_url: 'support@example.com',
  office_tab_id: 'TabHome',
  group_id: 'AddInGroup',
  debug_logger_tag: 'LiteraCompare',
  taskpane_id: 'TaskpaneID',
};

async function seedDefaults(db: Database) {
  // Check server_config
  const configRes = db.exec('SELECT id FROM server_config WHERE id = 1');
  if (configRes.length === 0 || configRes[0].values.length === 0) {
    db.run(
      `INSERT INTO server_config (id, compare_server_url, addin_url, viewer_url, install_mode, installed_at, app_name, app_base_url, brand_logo_text, brand_title, brand_subtitle, cors_mode, cors_allowed_origins, enqueue_endpoint_url, active_endpoint)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        DEFAULT_SERVER_CONFIG.cors_mode,
        DEFAULT_SERVER_CONFIG.cors_allowed_origins,
        DEFAULT_SERVER_CONFIG.enqueue_endpoint_url,
        DEFAULT_SERVER_CONFIG.active_endpoint,
      ]
    );
  }

  // Check manifest_settings
  const manifestRes = db.exec('SELECT id FROM manifest_settings WHERE id = 1');
  if (manifestRes.length === 0 || manifestRes[0].values.length === 0) {
    db.run(
      `INSERT INTO manifest_settings (id, manifest_id, version, provider_name, default_locale, display_name, description, icon_url, high_resolution_icon_url, support_url, office_tab_id, group_id, debug_logger_tag, taskpane_id)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  }

  // Check addin_settings
  const addinRes = db.exec('SELECT id FROM addin_settings WHERE id = 1');
  if (addinRes.length === 0 || addinRes[0].values.length === 0) {
    db.run(
      `INSERT INTO addin_settings (
        id, show_save_options, show_email_options, default_email_checked,
        enable_hints, show_in_download_list, show_path_after_action,
        remember_last_folder, enable_cancel_compare, name_prefixes,
        name_template, email_subject_template, lock_name_formatting, lock_email_subject, user_override_save_options, user_override_email_options, user_override_templates, user_override_prefixes, user_override_interaction_toggles, allow_custom_rendering_options, custom_languages, enable_password_fields
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        DEFAULT_ADDIN_SETTINGS.user_override_save_options ? 1 : 0,
          DEFAULT_ADDIN_SETTINGS.user_override_email_options ? 1 : 0,
          DEFAULT_ADDIN_SETTINGS.user_override_templates ? 1 : 0,
          DEFAULT_ADDIN_SETTINGS.user_override_prefixes ? 1 : 0,
          DEFAULT_ADDIN_SETTINGS.user_override_interaction_toggles ? 1 : 0,
          DEFAULT_ADDIN_SETTINGS.allow_custom_rendering_options ? 1 : 0,
          DEFAULT_ADDIN_SETTINGS.custom_languages,
          DEFAULT_ADDIN_SETTINGS.enable_password_fields ? 1 : 0
        ]
    );
  }

  // Check viewer_settings
  const viewerRes = db.exec('SELECT id FROM viewer_settings WHERE id = 1');
  if (viewerRes.length === 0 || viewerRes[0].values.length === 0) {
    db.run(
      `INSERT INTO viewer_settings (
        id, show_categories, show_changelist, show_statistics, show_toolbar,
        show_redline, toolbar_show_pdf, toolbar_show_docx, toolbar_show_tracked,
        toolbar_show_changed_pages, toolbar_show_print, toolbar_show_nav_arrows,
        accept_changes_enabled, custom_languages, loading_message, show_rendering_params_on_home,
        name_template, name_prefixes, user_override_templates, user_override_prefixes, enable_name_templates,
        allow_user_edit_filename, enable_save_as_dialog
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DEFAULT_VIEWER_SETTINGS.show_categories ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.show_changelist ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.show_statistics ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.show_toolbar ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.show_redline ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.toolbar_show_pdf ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.toolbar_show_docx ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.toolbar_show_tracked ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.toolbar_show_changed_pages ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.toolbar_show_print ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.toolbar_show_nav_arrows ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.accept_changes_enabled ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.custom_languages,
        DEFAULT_VIEWER_SETTINGS.loading_message,
        DEFAULT_VIEWER_SETTINGS.show_rendering_params_on_home ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.name_template,
        JSON.stringify(DEFAULT_VIEWER_SETTINGS.name_prefixes),
        DEFAULT_VIEWER_SETTINGS.user_override_templates ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.user_override_prefixes ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.enable_name_templates ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.allow_user_edit_filename ? 1 : 0,
        DEFAULT_VIEWER_SETTINGS.enable_save_as_dialog ? 1 : 0
      ]
    );
  }

  // Check compare_server_settings
  const compareServerRes = db.exec('SELECT id FROM compare_server_settings WHERE id = 1');
  if (compareServerRes.length === 0 || compareServerRes[0].values.length === 0) {
    db.run(
      `INSERT INTO compare_server_settings (
        id, compare_headers_footers, compare_footnotes, compare_character_level,
        ignore_case_changes, ignore_textboxes, ignore_tables, compare_comments,
        compare_images, detect_list_numbering, detect_movements, detect_whitespace,
        detect_paragraph_changes, detect_font_changes, detect_para_style_changes,
        detect_char_style_changes, remove_pages_without_changes, include_statistics,
        include_summary, show_workshare_footers, show_change_numbering, paragraph_threshold,
        output_format, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DEFAULT_COMPARE_SERVER_SETTINGS.compare_headers_footers,
        DEFAULT_COMPARE_SERVER_SETTINGS.compare_footnotes,
        DEFAULT_COMPARE_SERVER_SETTINGS.compare_character_level,
        DEFAULT_COMPARE_SERVER_SETTINGS.ignore_case_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.ignore_textboxes,
        DEFAULT_COMPARE_SERVER_SETTINGS.ignore_tables,
        DEFAULT_COMPARE_SERVER_SETTINGS.compare_comments,
        DEFAULT_COMPARE_SERVER_SETTINGS.compare_images,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_list_numbering,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_movements,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_whitespace,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_paragraph_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_font_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_para_style_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_char_style_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.remove_pages_without_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.include_statistics,
        DEFAULT_COMPARE_SERVER_SETTINGS.include_summary,
        DEFAULT_COMPARE_SERVER_SETTINGS.show_workshare_footers,
        DEFAULT_COMPARE_SERVER_SETTINGS.show_change_numbering,
        DEFAULT_COMPARE_SERVER_SETTINGS.paragraph_threshold,
        DEFAULT_COMPARE_SERVER_SETTINGS.output_format,
        new Date().toISOString(),
      ]
    );
  }

  // Check sso_config
  const ssoRes = db.exec('SELECT id FROM sso_config WHERE id = 1');
  if (ssoRes.length === 0 || ssoRes[0].values.length === 0) {
    db.run(
      `INSERT INTO sso_config (
        id, enabled, tenant_id, client_id, addin_redirect_uri, web_redirect_uri,
        allowed_domains, scopes, require_login_to_compare, authority_url, updated_at
      ) VALUES (1, 1, '', '',
        'https://localhost:3000/addin/auth-callback.html', 'https://localhost:3000/viewer/auth-callback.html',
        '', 'User.Read openid profile email', 1,
        '', ?)`,
      [new Date().toISOString()]
    );
  }

}

// Database helper functions
export function queryGet<T = any>(sql: string, params: SqlValue[] = []): T | null {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  try {
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      return row as unknown as T;
    }
    return null;
  } finally {
    stmt.free();
  }
}

export function queryAll<T = any>(sql: string, params: SqlValue[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  const results: T[] = [];
  try {
    stmt.bind(params);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function queryRun(sql: string, params: SqlValue[] = []): { changes: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  saveDb();
  return { changes: dbInstance.getRowsModified() };
}

export function queryExec(sql: string): void {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.exec(sql);
  saveDb();
}








