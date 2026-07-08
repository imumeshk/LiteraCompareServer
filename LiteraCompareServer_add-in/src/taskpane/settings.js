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
    lockNameFormatting: false,
    lockEmailSubject: false
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
      for (const base of adminBase.apiBases) {
        const url = `${base}/settings.asp`;
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          return data;
        }
      }
      console.warn('Failed to fetch admin API settings, trying static JSON');
      for (const url of adminBase.adminJsonUrls) {
        const fallback = await fetch(url, { cache: 'no-store' });
        if (fallback.ok) {
          const data = await fallback.json();
          return data;
        }
      }
      console.warn('Failed to fetch admin settings, using defaults');
      return null;
    } catch (e) {
      try {
        for (const url of adminBase.adminJsonUrls) {
          const fallback = await fetch(url, { cache: 'no-store' });
          if (fallback.ok) {
            const data = await fallback.json();
            return data;
          }
        }
      } catch (err) {
      }
      console.warn('Error fetching admin settings:', e);
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
        // Admin controls visibility - these override user settings
        if (adminSettings.showSaveOptions) {
          merged.showSaveOptions = adminSettings.showSaveOptions;
        }
        if (adminSettings.showEmailOptions) {
          merged.showEmailOptions = adminSettings.showEmailOptions;
        }

        // Apply admin defaults for all users (admin panel reflects immediately)
        if (adminSettings.defaultEmailChecked) {
          merged.defaultEmailChecked = adminSettings.defaultEmailChecked;
        }
        if (adminSettings.enableHints !== undefined) {
          merged.enableHints = adminSettings.enableHints;
        }
        if (adminSettings.showPathAfterAction !== undefined) {
          merged.showPathAfterAction = adminSettings.showPathAfterAction;
        }
        if (adminSettings.showInDownloadList !== undefined) {
          merged.showInDownloadList = adminSettings.showInDownloadList;
        }
        if (adminSettings.rememberLastFolder !== undefined) {
          merged.rememberLastFolder = adminSettings.rememberLastFolder;
        }
        if (adminSettings.enableCancelCompare !== undefined) {
          merged.enableCancelCompare = adminSettings.enableCancelCompare;
        }
        merged.lockNameFormatting = adminSettings.lockNameFormatting === true;
        merged.lockEmailSubject = adminSettings.lockEmailSubject === true;

        if (adminSettings.lockNameFormatting) {
          if (adminSettings.namePrefixes) {
            merged.namePrefixes = { ...merged.namePrefixes, ...adminSettings.namePrefixes };
          }
          if (adminSettings.nameTemplate) {
            merged.nameTemplate = adminSettings.nameTemplate;
          }
        }
        if (adminSettings.lockEmailSubject) {
          if (adminSettings.emailSubjectTemplate) {
            merged.emailSubjectTemplate = adminSettings.emailSubjectTemplate;
          }
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
    return settings;
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
      default:                ext = '.pdf';
    }

    let baseName = '';
    const hasVars = perFormatInput.includes('{original}') || perFormatInput.includes('{modified}');

    if (hasVars) {
      baseName = perFormatInput
        .replaceAll('{original}', origName)
        .replaceAll('{modified}', modName)
        .replaceAll('{prefix}', '')
        .trim();
    } else {
      const template = (settings.nameTemplate || defaultSettings.nameTemplate).trim();
      baseName = template
        .replaceAll('{prefix}', perFormatInput)
        .replaceAll('{original}', origName)
        .replaceAll('{modified}', modName)
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
      .replaceAll('{modified}', modName)
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
