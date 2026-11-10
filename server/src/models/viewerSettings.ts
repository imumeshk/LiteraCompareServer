import { queryGet, queryRun, DEFAULT_VIEWER_SETTINGS } from '../db/client.js';

export interface ViewerSettings {
  id: number;
  show_categories: boolean;
  show_changelist: boolean;
  show_statistics: boolean;
  show_toolbar: boolean;
  show_redline: boolean;
  toolbar_show_pdf: boolean;
  toolbar_show_docx: boolean;
  toolbar_show_tracked: boolean;
  toolbar_show_changed_pages: boolean;
  toolbar_show_print: boolean;
  toolbar_show_nav_arrows: boolean;
  accept_changes_enabled: boolean;
  loading_message: string;
  custom_languages: string;
  show_rendering_params_on_home: boolean;
  enable_password_fields: boolean;
  enable_reset_button: boolean;
  enable_new_comparison_btn: boolean;
  new_comparison_target: string;
  enable_save_prompt: boolean;

  enable_cancel?: boolean;
  name_template?: string;
  name_prefixes?: Record<string, string>;
  user_override_templates?: boolean;
  user_override_prefixes?: boolean;
  enable_name_templates?: boolean;
  allow_user_edit_filename?: boolean;
  enable_save_as_dialog?: boolean;
}

interface ViewerSettingsDbRow {
  id: number;
  show_categories: number;
  show_changelist: number;
  show_statistics: number;
  show_toolbar: number;
  show_redline: number;
  toolbar_show_pdf: number;
  toolbar_show_docx: number;
  toolbar_show_tracked: number;
  toolbar_show_changed_pages: number;
  toolbar_show_print: number;
  toolbar_show_nav_arrows: number;
  accept_changes_enabled: number;
  loading_message: string;
  custom_languages: string;
  show_rendering_params_on_home: number;
  enable_password_fields: number;
  enable_reset_button: number;
  enable_new_comparison_btn: number;
  new_comparison_target: string;
  enable_save_prompt: number;

  enable_cancel?: number;
  name_template?: string;
  name_prefixes?: string;
  user_override_templates?: number;
  user_override_prefixes?: number;
  enable_name_templates?: number;
  allow_user_edit_filename?: number;
  enable_save_as_dialog?: number;
}

export function getViewerSettings(): ViewerSettings {
  const row = queryGet<ViewerSettingsDbRow>('SELECT * FROM viewer_settings WHERE id = 1');
  if (!row) {
    return {
      id: 1,
      ...DEFAULT_VIEWER_SETTINGS,
    };
  }

  let namePrefixes = DEFAULT_VIEWER_SETTINGS.name_prefixes;
  if (row.name_prefixes) {
    try {
      let parsed = JSON.parse(row.name_prefixes);
      while (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      namePrefixes = parsed;
    } catch (e) {}
  }

  return {
    id: row.id,
    show_categories: Boolean(row.show_categories),
    show_changelist: Boolean(row.show_changelist),
    show_statistics: Boolean(row.show_statistics),
    show_toolbar: Boolean(row.show_toolbar),
    show_redline: Boolean(row.show_redline),
    toolbar_show_pdf: Boolean(row.toolbar_show_pdf),
    toolbar_show_docx: Boolean(row.toolbar_show_docx),
    toolbar_show_tracked: Boolean(row.toolbar_show_tracked),
    toolbar_show_changed_pages: Boolean(row.toolbar_show_changed_pages),
    toolbar_show_print: Boolean(row.toolbar_show_print),
    toolbar_show_nav_arrows: Boolean(row.toolbar_show_nav_arrows),
    accept_changes_enabled: Boolean(row.accept_changes_enabled),
    loading_message: row.loading_message || 'Uploading files for comparison & comparing file',
    custom_languages: row.custom_languages || '[]',
    show_rendering_params_on_home: Boolean(row.show_rendering_params_on_home),
    enable_password_fields: Boolean(row.enable_password_fields),
    enable_reset_button: Boolean(row.enable_reset_button),
    enable_new_comparison_btn: Boolean(row.enable_new_comparison_btn),
    new_comparison_target: row.new_comparison_target || 'same_tab',
    enable_save_prompt: Boolean(row.enable_save_prompt),

    enable_cancel: Boolean(row.enable_cancel),
    name_template: row.name_template || DEFAULT_VIEWER_SETTINGS.name_template,
    name_prefixes: namePrefixes,
    user_override_templates: Boolean(row.user_override_templates),
    user_override_prefixes: Boolean(row.user_override_prefixes),
    enable_name_templates: row.enable_name_templates === undefined ? true : Boolean(row.enable_name_templates),
    allow_user_edit_filename: Boolean(row.allow_user_edit_filename),
    enable_save_as_dialog: Boolean(row.enable_save_as_dialog),
  };
}

export function updateViewerSettings(data: Partial<Omit<ViewerSettings, 'id'>>): ViewerSettings {
  const current = getViewerSettings();
  const updated: ViewerSettings = {
    ...current,
    ...data,
  };

  queryRun(
    `UPDATE viewer_settings SET
      show_categories = ?,
      show_changelist = ?,
      show_statistics = ?,
      show_toolbar = ?,
      show_redline = ?,
      toolbar_show_pdf = ?,
      toolbar_show_docx = ?,
      toolbar_show_tracked = ?,
      toolbar_show_changed_pages = ?,
      toolbar_show_print = ?,
      toolbar_show_nav_arrows = ?,
      accept_changes_enabled = ?,
      loading_message = ?, 
      custom_languages = ?,
      show_rendering_params_on_home = ?,
      enable_password_fields = ?,
      enable_reset_button = ?,
      enable_new_comparison_btn = ?,
      new_comparison_target = ?,
      enable_save_prompt = ?,

      enable_cancel = ?,
      name_template = ?,
      name_prefixes = ?,
      user_override_templates = ?,
      user_override_prefixes = ?,
      enable_name_templates = ?,
      allow_user_edit_filename = ?,
      enable_save_as_dialog = ?
     WHERE id = 1`,
    [
      updated.show_categories ? 1 : 0,
      updated.show_changelist ? 1 : 0,
      updated.show_statistics ? 1 : 0,
      updated.show_toolbar ? 1 : 0,
      updated.show_redline ? 1 : 0,
      updated.toolbar_show_pdf ? 1 : 0,
      updated.toolbar_show_docx ? 1 : 0,
      updated.toolbar_show_tracked ? 1 : 0,
      updated.toolbar_show_changed_pages ? 1 : 0,
      updated.toolbar_show_print ? 1 : 0,
      updated.toolbar_show_nav_arrows ? 1 : 0,
      updated.accept_changes_enabled ? 1 : 0,
      updated.loading_message,
      updated.custom_languages,
      updated.show_rendering_params_on_home ? 1 : 0,
      updated.enable_password_fields ? 1 : 0,
      updated.enable_reset_button ? 1 : 0,
      updated.enable_new_comparison_btn ? 1 : 0,
      updated.new_comparison_target,
      updated.enable_save_prompt ? 1 : 0,

      updated.enable_cancel ? 1 : 0,
      updated.name_template,
      JSON.stringify(updated.name_prefixes),
      updated.user_override_templates ? 1 : 0,
      updated.user_override_prefixes ? 1 : 0,
      updated.enable_name_templates === false ? 0 : 1,
      updated.allow_user_edit_filename ? 1 : 0,
      updated.enable_save_as_dialog ? 1 : 0,
    ]
  );

  return getViewerSettings();
}
