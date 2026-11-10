(() => {
  'use strict';

  const settingsKey = 'compare_addin_settings';
  const buildAdminApiBase = () => {
    const origin = window.location.origin || '';
    const path = window.location.pathname || '';
    const marker = '/src/taskpane/';
    const idx = path.indexOf(marker);
    const basePath = idx >= 0 ? path.substring(0, idx) : '';
    const apiBase = origin + basePath + '/admin/api';
    const rootApiBase = origin + '/admin/api';
    const adminJsonUrl = origin + basePath + '/admin/admin-settings.json';
    const rootAdminJsonUrl = origin + '/admin/admin-settings.json';
    return {
      apiBases: [apiBase, rootApiBase],
      adminJsonUrls: [adminJsonUrl, rootAdminJsonUrl]
    };
  };

  const adminBase = buildAdminApiBase(); // Admin settings on same server
  const defaultSettings = {
    showSaveOptions: ['pdf', 'docx', 'track_changes', 'changedPagesPdf'],
    showEmailOptions: ['original', 'modified', 'pdf', 'docx', 'track_changes', 'changedPagesPdf'],
    defaultEmailChecked: ['pdf'],
    enableHints: true,
    showInDownloadList: false,
    showPathAfterAction: true,
    rememberLastFolder: false,
    enableCancelCompare: true,
    defaultSaveFolderLabel: '',
    namePrefixes: {
      pdf: 'Redline - ',
      docx: 'Redline - ',
      track_changes: 'Track Changes - ',
      changedPagesPdf: 'Redline Pages - ',
      default: 'Comparison - '
    },
    nameTemplate: '{prefix}{original} and {modified}',
    emailSubjectTemplate: 'Document Comparison ({original} vs {modified})'
    ,
    userOverrideSaveOptions: false,
    userOverrideEmailOptions: false,
    userOverrideTemplates: false,
    userOverridePrefixes: false,
    userOverrideInteractionToggles: false,
    allowCustomRenderingOptions: false,
      enable_password_fields: true,
    renderingOptions: ''
  };

  const cloneDefaults = () => JSON.parse(JSON.stringify(defaultSettings));

  const readStorage = async () => {
    try {
      if (typeof OfficeRuntime !== 'undefined' && OfficeRuntime.storage) {
        return await OfficeRuntime.storage.getItem(settingsKey);
      }
    } catch (e) {}
    try {
      return window.localStorage.getItem(settingsKey);
    } catch (e) {}
    return null;
  };

  const writeStorage = async (value) => {
    try {
      if (typeof OfficeRuntime !== 'undefined' && OfficeRuntime.storage) {
        await OfficeRuntime.storage.setItem(settingsKey, value);
        return;
      }
    } catch (e) {}
    try {
      window.localStorage.setItem(settingsKey, value);
    } catch (e) {}
  };

  const fetchAdminSettings = async () => {
    try {
      // The new Litera Node server exposes addin settings directly at /api/addin-settings
      const url = '/api/addin-settings?t=' + Date.now();
      const response = await fetch(url, { cache: 'no-store' });
        let vsData = {};
        try {
           const vsRes = await fetch('/api/viewer-settings?t=' + Date.now(), { cache: 'no-store' });
           if (vsRes.ok) vsData = await vsRes.json();
        } catch (e) {}
      if (response.ok) {
        const data = await response.json();
        // Map database snake_case keys to camelCase used by add-in
        return {
          showSaveOptions: data.show_save_options || defaultSettings.showSaveOptions,
          showEmailOptions: data.show_email_options || defaultSettings.showEmailOptions,
          defaultEmailChecked: data.default_email_checked || defaultSettings.defaultEmailChecked,
          enableHints: data.enable_hints !== undefined ? data.enable_hints : defaultSettings.enableHints,
          showInDownloadList: data.show_in_download_list !== undefined ? data.show_in_download_list : defaultSettings.showInDownloadList,
          showPathAfterAction: data.show_path_after_action !== undefined ? data.show_path_after_action : defaultSettings.showPathAfterAction,
          rememberLastFolder: data.remember_last_folder !== undefined ? data.remember_last_folder : defaultSettings.rememberLastFolder,
          enableCancelCompare: data.enable_cancel_compare !== undefined ? data.enable_cancel_compare : defaultSettings.enableCancelCompare,
          namePrefixes: data.name_prefixes || defaultSettings.namePrefixes,
          nameTemplate: data.name_template || defaultSettings.nameTemplate,
          emailSubjectTemplate: data.email_subject_template || defaultSettings.emailSubjectTemplate,
          userOverrideSaveOptions: data.user_override_save_options === true,
          userOverrideEmailOptions: data.user_override_email_options === true,
          userOverrideTemplates: data.user_override_templates === true,
          userOverridePrefixes: data.user_override_prefixes === true,
          userOverrideInteractionToggles: data.user_override_interaction_toggles === true,
          allowCustomRenderingOptions: data.allow_custom_rendering_options === true,
          enable_password_fields: data.enable_password_fields !== false,
          hideSettings: data.hide_settings === true,
          hideSettingsHints: data.hide_settings_hints === true,
          hideSettingsSaveMenuItems: data.hide_settings_save_menu_items === true,
          hideSettingsEmailMenuItems: data.hide_settings_email_menu_items === true,
          hideSettingsDefaultChecked: data.hide_settings_default_checked === true,
          hideSettingsSaveBehavior: data.hide_settings_save_behavior === true,
          hideSettingsCompareBehavior: data.hide_settings_compare_behavior === true,
          hideSettingsNamePrefixes: data.hide_settings_name_prefixes === true,
          hideSettingsEmailSubject: data.hide_settings_email_subject === true,
          hideSettingsShowInDownloadList: data.hide_settings_show_in_download_list === true,
          hideSettingsRememberLastFolder: data.hide_settings_remember_last_folder === true,
          hideSettingsShowSavedPath: data.hide_settings_show_saved_path === true,
          hideButtonEmail: data.hide_button_email === true,
          hideButtonView: data.hide_button_view === true,
          hideButtonCancel: data.hide_button_cancel === true,
          brandLogoText: data.brand_logo_text || 'L',
          brandTitle: data.brand_title || 'Compare Server',
          brandSubtitle: data.brand_subtitle || 'Enterprise Document Comparison',
          customLanguages: data.custom_languages || '[]',
        };
      }
      return null;
    } catch (e) {
      console.warn('Failed to fetch admin settings, using defaults');
      return null;
    }
  };

  const mergeSettings = (raw, adminSettings) => {
    try {
      const parsed = JSON.parse(raw);
      let merged = {
        ...defaultSettings,
        ...parsed,
        namePrefixes: {
          ...defaultSettings.namePrefixes,
          ...(parsed && parsed.namePrefixes ? parsed.namePrefixes : {})
        }
      };

                // If admin settings exist, apply admin controls
        if (adminSettings) {
          merged.brandLogoText = adminSettings.brandLogoText;
          merged.brandTitle = adminSettings.brandTitle;
          merged.brandSubtitle = adminSettings.brandSubtitle;
          merged.customLanguages = adminSettings.customLanguages;
          
          merged.userOverrideSaveOptions = adminSettings.userOverrideSaveOptions;
          merged.userOverrideEmailOptions = adminSettings.userOverrideEmailOptions;
          merged.userOverrideTemplates = adminSettings.userOverrideTemplates;
          merged.userOverridePrefixes = adminSettings.userOverridePrefixes;
          merged.userOverrideInteractionToggles = adminSettings.userOverrideInteractionToggles;
          merged.allowCustomRenderingOptions = adminSettings.allowCustomRenderingOptions;
          merged.enable_password_fields = adminSettings.enable_password_fields;
          merged.hideSettings = adminSettings.hideSettings === true;
          merged.hideSettingsHints = adminSettings.hideSettingsHints === true;
          merged.hideSettingsSaveMenuItems = adminSettings.hideSettingsSaveMenuItems === true;
          merged.hideSettingsEmailMenuItems = adminSettings.hideSettingsEmailMenuItems === true;
          merged.hideSettingsDefaultChecked = adminSettings.hideSettingsDefaultChecked === true;
          merged.hideSettingsSaveBehavior = adminSettings.hideSettingsSaveBehavior === true;
          merged.hideSettingsCompareBehavior = adminSettings.hideSettingsCompareBehavior === true;
          merged.hideSettingsNamePrefixes = adminSettings.hideSettingsNamePrefixes === true;
          merged.hideSettingsEmailSubject = adminSettings.hideSettingsEmailSubject === true;
          merged.hideSettingsShowInDownloadList = adminSettings.hideSettingsShowInDownloadList === true;
          merged.hideSettingsRememberLastFolder = adminSettings.hideSettingsRememberLastFolder === true;
          merged.hideSettingsShowSavedPath = adminSettings.hideSettingsShowSavedPath === true;
          merged.hideButtonEmail = adminSettings.hideButtonEmail === true;
          merged.hideButtonView = adminSettings.hideButtonView === true;
          merged.hideButtonCancel = adminSettings.hideButtonCancel === true;

          if (!adminSettings.userOverrideSaveOptions) {
            merged.showSaveOptions = adminSettings.showSaveOptions;
          } else {
            const userSaveOptions = parsed && parsed.showSaveOptions ? parsed.showSaveOptions : adminSettings.showSaveOptions;
            merged.showSaveOptions = userSaveOptions.filter(opt => adminSettings.showSaveOptions.includes(opt));
          }
          merged._adminShowSaveOptions = adminSettings.showSaveOptions;

          if (!adminSettings.userOverrideEmailOptions) {
            merged.showEmailOptions = adminSettings.showEmailOptions;
            merged.defaultEmailChecked = adminSettings.defaultEmailChecked;
          } else {
            const userEmailOptions = parsed && parsed.showEmailOptions ? parsed.showEmailOptions : adminSettings.showEmailOptions;
            merged.showEmailOptions = userEmailOptions.filter(opt => adminSettings.showEmailOptions.includes(opt));
            merged.defaultEmailChecked = parsed && parsed.defaultEmailChecked ? parsed.defaultEmailChecked : adminSettings.defaultEmailChecked;
          }
          merged._adminShowEmailOptions = adminSettings.showEmailOptions;

          if (!adminSettings.userOverrideInteractionToggles) {
            if (adminSettings.enableHints !== undefined) merged.enableHints = adminSettings.enableHints;
            if (adminSettings.showPathAfterAction !== undefined) merged.showPathAfterAction = adminSettings.showPathAfterAction;
            if (adminSettings.showInDownloadList !== undefined) merged.showInDownloadList = adminSettings.showInDownloadList;
            if (adminSettings.rememberLastFolder !== undefined) merged.rememberLastFolder = adminSettings.rememberLastFolder;
            if (adminSettings.enableCancelCompare !== undefined) merged.enableCancelCompare = adminSettings.enableCancelCompare;
          }

          if (!adminSettings.userOverridePrefixes) {
            if (adminSettings.namePrefixes) {
              merged.namePrefixes = { ...merged.namePrefixes, ...adminSettings.namePrefixes };
            }
          }
          if (!adminSettings.userOverrideTemplates) {
            if (adminSettings.nameTemplate) merged.nameTemplate = adminSettings.nameTemplate;
            if (adminSettings.emailSubjectTemplate) merged.emailSubjectTemplate = adminSettings.emailSubjectTemplate;
          }
        }

      return merged;
    } catch (e) {
      return cloneDefaults();
    }
  };

  const load = async () => {
    const [raw, adminSettings] = await Promise.all([
      readStorage(),
      fetchAdminSettings()
    ]);

    if (raw) return mergeSettings(raw, adminSettings);
    return mergeSettings(null, adminSettings);
  };

  const save = async (settings) => {
    await writeStorage(JSON.stringify(settings));
  };

  const reset = async () => {
    const settings = cloneDefaults();
    await save(settings);
    return await load();
  };

  const getDateYyyyMmDd = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const buildFileName = (format, origName, modName, settings) => {
    const perFormatInput = settings.namePrefixes[format] || settings.namePrefixes.default || defaultSettings.namePrefixes.default;
    let ext = '';

    switch (format) {
      case 'pdf':             ext = '.pdf'; break;
      case 'docx':            ext = '.docx'; break;
      case 'track_changes':   ext = '.docx'; break;
      case 'changedPagesPdf': ext = '.pdf'; break;
      case 'eml':             ext = '.eml'; break;
      default:                ext = '.pdf';
    }

    let baseName = '';
    const hasVars = perFormatInput.includes('{original}') || perFormatInput.includes('{modified}');

    if (hasVars) {
      baseName = perFormatInput
        .replaceAll('{original}', origName)
        .replaceAll('{modified}', modName).replaceAll('{date}', getDateYyyyMmDd())
        .replaceAll('{prefix}', '').replaceAll('{date}', getDateYyyyMmDd())
        .trim();
    } else {
      const template = (settings.nameTemplate || defaultSettings.nameTemplate).trim();
      baseName = template
        .replaceAll('{prefix}', perFormatInput)
        .replaceAll('{original}', origName)
        .replaceAll('{modified}', modName).replaceAll('{date}', getDateYyyyMmDd())
        .trim();
    }

    if (!baseName) {
      baseName = `${perFormatInput}${origName} and ${modName}`;
    }

    const maxBaseLength = 255 - ext.length;
    if (baseName.length > maxBaseLength) baseName = baseName.substring(0, maxBaseLength);

    return baseName + ext;
  };

  const buildEmailSubject = (origName, modName, settings) => {
    const subjectTemplate = (settings.emailSubjectTemplate || defaultSettings.emailSubjectTemplate).trim();
    const subject = subjectTemplate
      .replaceAll('{original}', origName)
      .replaceAll('{modified}', modName).replaceAll('{date}', getDateYyyyMmDd())
      .replaceAll('{date}', getDateYyyyMmDd())
      .trim();
    return subject || defaultSettings.emailSubjectTemplate;
  };

  window.settingsStore = {
    defaultSettings,
    load,
    save,
    reset,
    buildFileName,
    buildEmailSubject
  };
})();
