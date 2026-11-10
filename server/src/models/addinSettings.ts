import { queryGet, queryRun, DEFAULT_ADDIN_SETTINGS } from '../db/client.js';

export interface AddinSettings {
  id: number;
  show_save_options: string[];
  show_email_options: string[];
  default_email_checked: string[];
  enable_hints: boolean;
  show_in_download_list: boolean;
  show_path_after_action: boolean;
  remember_last_folder: boolean;
  enable_cancel_compare: boolean;
  name_prefixes: Record<string, string>;
  name_template: string;
  email_subject_template: string;
  lock_name_formatting: boolean;
  lock_email_subject: boolean;
  user_override_save_options: boolean;
  user_override_email_options: boolean;
  user_override_templates: boolean;
  user_override_prefixes: boolean;
  user_override_interaction_toggles: boolean;
  allow_custom_rendering_options: boolean;
  enable_password_fields: boolean;
  custom_languages: string;
  hide_settings: boolean;
  hide_settings_hints: boolean;
  hide_settings_save_menu_items: boolean;
  hide_settings_email_menu_items: boolean;
  hide_settings_default_checked: boolean;
  hide_settings_save_behavior: boolean;
  hide_settings_compare_behavior: boolean;
  hide_settings_name_prefixes: boolean;
  hide_settings_email_subject: boolean;
  hide_settings_show_in_download_list: boolean;
  hide_settings_remember_last_folder: boolean;
  hide_settings_show_saved_path: boolean;
  hide_button_email: boolean;
  hide_button_view: boolean;
  hide_button_cancel: boolean;

}

interface AddinSettingsDbRow {
  id: number;
  show_save_options: string;
  show_email_options: string;
  default_email_checked: string;
  enable_hints: number;
  show_in_download_list: number;
  show_path_after_action: number;
  remember_last_folder: number;
  enable_cancel_compare: number;
  name_prefixes: string;
  name_template: string;
  email_subject_template: string;
  lock_name_formatting: number;
  lock_email_subject: number;
  user_override_save_options: number;
  user_override_email_options: number;
  user_override_templates: number;
  user_override_prefixes: number;
  user_override_interaction_toggles: number;
  allow_custom_rendering_options: number;
  enable_password_fields: number;
  custom_languages: string;
  hide_settings: number;
  hide_settings_hints: number;
  hide_settings_save_menu_items: number;
  hide_settings_email_menu_items: number;
  hide_settings_default_checked: number;
  hide_settings_save_behavior: number;
  hide_settings_compare_behavior: number;
  hide_settings_name_prefixes: number;
  hide_settings_email_subject: number;
  hide_settings_show_in_download_list: number;
  hide_settings_remember_last_folder: number;
  hide_settings_show_saved_path: number;
  hide_button_email: number;
  hide_button_view: number;
  hide_button_cancel: number;

}

function parseRow(row: AddinSettingsDbRow): AddinSettings {
  return {
    id: row.id,
    show_save_options: JSON.parse(row.show_save_options || '[]'),
    show_email_options: JSON.parse(row.show_email_options || '[]'),
    default_email_checked: JSON.parse(row.default_email_checked || '[]'),
    enable_hints: Boolean(row.enable_hints),
    show_in_download_list: Boolean(row.show_in_download_list),
    show_path_after_action: Boolean(row.show_path_after_action),
    remember_last_folder: Boolean(row.remember_last_folder),
    enable_cancel_compare: Boolean(row.enable_cancel_compare),
    name_prefixes: JSON.parse(row.name_prefixes || '{}'),
    name_template: row.name_template || '{prefix}{original} and {modified}',
    email_subject_template: row.email_subject_template || 'Document Comparison ({original} vs {modified})',
    lock_name_formatting: Boolean(row.lock_name_formatting),
    lock_email_subject: Boolean(row.lock_email_subject),
    user_override_save_options: Boolean(row.user_override_save_options),
    user_override_email_options: Boolean(row.user_override_email_options),
    user_override_templates: Boolean(row.user_override_templates),
    user_override_prefixes: Boolean(row.user_override_prefixes),
    user_override_interaction_toggles: Boolean(row.user_override_interaction_toggles),
    allow_custom_rendering_options: Boolean(row.allow_custom_rendering_options),
    enable_password_fields: Boolean(row.enable_password_fields),
    custom_languages: row.custom_languages || '[]',
    hide_settings: Boolean(row.hide_settings),
    hide_settings_hints: Boolean(row.hide_settings_hints),
    hide_settings_save_menu_items: Boolean(row.hide_settings_save_menu_items),
    hide_settings_email_menu_items: Boolean(row.hide_settings_email_menu_items),
    hide_settings_default_checked: Boolean(row.hide_settings_default_checked),
    hide_settings_save_behavior: Boolean(row.hide_settings_save_behavior),
    hide_settings_compare_behavior: Boolean(row.hide_settings_compare_behavior),
    hide_settings_name_prefixes: Boolean(row.hide_settings_name_prefixes),
    hide_settings_email_subject: Boolean(row.hide_settings_email_subject),
    hide_settings_show_in_download_list: Boolean(row.hide_settings_show_in_download_list),
    hide_settings_remember_last_folder: Boolean(row.hide_settings_remember_last_folder),
    hide_settings_show_saved_path: Boolean(row.hide_settings_show_saved_path),
    hide_button_email: Boolean(row.hide_button_email),
    hide_button_view: Boolean(row.hide_button_view),
    hide_button_cancel: Boolean(row.hide_button_cancel),

  };
}

export function getAddinSettings(): AddinSettings {
  const row = queryGet<AddinSettingsDbRow>('SELECT * FROM addin_settings WHERE id = 1');
  if (!row) {
    return {
      id: 1,
      ...DEFAULT_ADDIN_SETTINGS,
    };
  }
  return parseRow(row);
}

export function updateAddinSettings(data: Partial<Omit<AddinSettings, 'id'>>): AddinSettings {
  const current = getAddinSettings();
  const updated: AddinSettings = {
    ...current,
    ...data,
  };

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
      lock_email_subject = ?,
      user_override_save_options = ?,
      user_override_email_options = ?,
      user_override_templates = ?,
      user_override_prefixes = ?,
      user_override_interaction_toggles = ?,
      allow_custom_rendering_options = ?,
      enable_password_fields = ?,
      custom_languages = ?,
      hide_settings = ?,
      hide_settings_hints = ?,
      hide_settings_save_menu_items = ?,
      hide_settings_email_menu_items = ?,
      hide_settings_default_checked = ?,
      hide_settings_save_behavior = ?,
      hide_settings_compare_behavior = ?,
      hide_settings_name_prefixes = ?,
      hide_settings_email_subject = ?,
      hide_settings_show_in_download_list = ?,
      hide_settings_remember_last_folder = ?,
      hide_settings_show_saved_path = ?,
      hide_button_email = ?,
      hide_button_view = ?,
      hide_button_cancel = ?
     WHERE id = 1`,
    [
      JSON.stringify(updated.show_save_options),
      JSON.stringify(updated.show_email_options),
      JSON.stringify(updated.default_email_checked),
      updated.enable_hints ? 1 : 0,
      updated.show_in_download_list ? 1 : 0,
      updated.show_path_after_action ? 1 : 0,
      updated.remember_last_folder ? 1 : 0,
      updated.enable_cancel_compare ? 1 : 0,
      JSON.stringify(updated.name_prefixes),
      updated.name_template,
      updated.email_subject_template,
      updated.lock_name_formatting ? 1 : 0,
      updated.lock_email_subject ? 1 : 0,
      updated.user_override_save_options ? 1 : 0,
      updated.user_override_email_options ? 1 : 0,
      updated.user_override_templates ? 1 : 0,
      updated.user_override_prefixes ? 1 : 0,
      updated.user_override_interaction_toggles ? 1 : 0,
      updated.allow_custom_rendering_options ? 1 : 0,
      updated.enable_password_fields ? 1 : 0,
      updated.custom_languages,
      updated.hide_settings ? 1 : 0,
      updated.hide_settings_hints ? 1 : 0,
      updated.hide_settings_save_menu_items ? 1 : 0,
      updated.hide_settings_email_menu_items ? 1 : 0,
      updated.hide_settings_default_checked ? 1 : 0,
      updated.hide_settings_save_behavior ? 1 : 0,
      updated.hide_settings_compare_behavior ? 1 : 0,
      updated.hide_settings_name_prefixes ? 1 : 0,
      updated.hide_settings_email_subject ? 1 : 0,
      updated.hide_settings_show_in_download_list ? 1 : 0,
      updated.hide_settings_remember_last_folder ? 1 : 0,
      updated.hide_settings_show_saved_path ? 1 : 0,
      updated.hide_button_email ? 1 : 0,
      updated.hide_button_view ? 1 : 0,
      updated.hide_button_cancel ? 1 : 0
    ]
  );

  return getAddinSettings();
}

export function resetAddinSettings(): AddinSettings {
  updateAddinSettings(DEFAULT_ADDIN_SETTINGS);
  return getAddinSettings();
}

