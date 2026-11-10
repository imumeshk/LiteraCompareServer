  const schemaSql = `
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
      enable_reset_button INTEGER NOT NULL DEFAULT 1
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