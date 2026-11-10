-- Schema for Litera Compare Server

CREATE TABLE IF NOT EXISTS server_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  compare_server_url TEXT NOT NULL DEFAULT 'https://compare.litera.com/api/v1',
  addin_url TEXT NOT NULL DEFAULT 'https://localhost:3000/addin',
  viewer_url TEXT NOT NULL DEFAULT 'https://localhost:3000/viewer',
  install_mode TEXT NOT NULL DEFAULT 'addin_and_admin_and_viewer' CHECK (install_mode IN ('addin_and_admin_and_viewer', 'addin_admin_and_viewer', 'addin_and_admin', 'addin_and_viewer', 'viewer_only')),
  installed_at TEXT,
  enqueue_endpoint_url TEXT,
  active_endpoint TEXT NOT NULL DEFAULT 'compare'
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
  lock_name_formatting INTEGER NOT NULL DEFAULT 0,
  lock_email_subject INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS viewer_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  show_categories INTEGER NOT NULL DEFAULT 0
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
