Office.onReady(async function () {
  'use strict';

  // 1. Immediate synchronous pass: restore branding and apply i18n translations before any network/async calls
  try {
    const cachedBranding = localStorage.getItem('litera_cached_addin_branding');
    if (cachedBranding) {
      const b = JSON.parse(cachedBranding);
      const brandLogo = document.getElementById('hdr-brand-initial');
      const brandName = document.getElementById('hdr-brand-name');
      const brandSub  = document.getElementById('hdr-brand-sub');
      if (brandLogo && b.brandLogoText) brandLogo.textContent = b.brandLogoText;
      if (brandName && b.brandTitle) brandName.textContent = b.brandTitle;
      if (brandSub && b.brandSubtitle) brandSub.textContent = b.brandSubtitle;
    }
  } catch (e) {}

  if (window.LiteraI18n) {
    const langSelector = document.getElementById('lang-selector');
    if (langSelector && window.LiteraI18n.buildLanguageSelector) {
      window.LiteraI18n.buildLanguageSelector(langSelector);
      langSelector.value = window.LiteraI18n.getLanguage();
    }
    window.LiteraI18n.applyTranslations();
    document.documentElement.classList.remove('i18n-loading');
  }

  let compareServerUrl = 'http://localhost/WorkshareCompareApi';
  let apiEndpoint = `${compareServerUrl}/api/uicompare`;

  let ssoConfig = {
    enabled: false,
    require_login_to_compare: false,
    tenant_id: '',
    client_id: ''
  };
  let currentUser = null;

  const applySsoAuthState = () => {
    const isSsoEnforced = ssoConfig.enabled;
    const ssoWall = document.getElementById('viewer-sso-wall');
    const compareCard = document.getElementById('viewer-compare-card');
    const userBadge = document.getElementById('viewer-user-badge');
    const userName = document.getElementById('viewer-user-name');
    const userAvatar = document.getElementById('viewer-avatar');
    const btnViewerLogout = document.getElementById('btn-viewer-logout');

    if (isSsoEnforced) {
      if (currentUser) {
        if (ssoWall) ssoWall.style.display = 'none';
        if (compareCard) compareCard.style.display = 'block';
        if (userBadge) {
          userBadge.style.display = 'flex';
          if (btnViewerLogout) btnViewerLogout.style.display = 'flex';
          if (userName) userName.textContent = (currentUser.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          if (userAvatar) userAvatar.textContent = (currentUser.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
      } else {
        if (ssoWall) ssoWall.style.display = 'block';
        if (compareCard) compareCard.style.display = 'none';
        if (userBadge) userBadge.style.display = 'none';
        if (btnViewerLogout) btnViewerLogout.style.display = 'none';
        if (btnViewerLogout) btnViewerLogout.style.display = 'none';
      }
    } else {
      if (ssoWall) ssoWall.style.display = 'none';
      if (compareCard) compareCard.style.display = 'block';
      if (currentUser && userBadge) {
        userBadge.style.display = 'flex';
          if (btnViewerLogout) btnViewerLogout.style.display = 'flex';
        if (userName) userName.textContent = (currentUser.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        if (userAvatar) userAvatar.textContent = (currentUser.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      } else if (userBadge) {
        userBadge.style.display = 'none';
        if (btnViewerLogout) btnViewerLogout.style.display = 'none';
      }
    }
  };

  let serverConfig = null;
  const initSso = async () => {
    try {
      const cached = localStorage.getItem('litera_sso_user');
      if (cached) currentUser = JSON.parse(cached);
    } catch (e) {}

    try {
      const origin = window.location.origin || '';
      try {
        const confRes = await fetch(origin + '/api/config');
        if (confRes.ok) {
          serverConfig = await confRes.json();
          if (serverConfig.compare_server_url) {
            compareServerUrl = window.location.origin + '/proxy';
            apiEndpoint = `${compareServerUrl}/api/uicompare`;
          }
        }
      } catch(e) {}
      const ssoRes = await fetch(origin + '/api/sso/config');
      if (ssoRes.ok) {
        ssoConfig = await ssoRes.json();
      }
    } catch (e) {}

    applySsoAuthState();

    const btnLogin = document.getElementById('btn-viewer-login');
    if (btnLogin) {
      btnLogin.addEventListener('click', async () => {
        // Use real MSAL.js login if SSO is configured, otherwise show a graceful error
        if (!ssoConfig.client_id || !ssoConfig.tenant_id) {
          setResult('Microsoft Entra SSO is not fully configured. Please contact your administrator.', true);
          return;
        }

        try {
          btnLogin.disabled = true;
          btnLogin.textContent = 'Signing in...';

          // Build MSAL application instance
          const msalConfig = {
            auth: {
              clientId: ssoConfig.client_id,
              authority: `https://login.microsoftonline.com/${ssoConfig.tenant_id}`,
              redirectUri: ssoConfig.addin_redirect_uri || window.location.origin + '/addin/auth-callback.html',
            },
            cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false },
          };
          const msalApp = new msal.PublicClientApplication(msalConfig);
          await msalApp.initialize();

          const loginResponse = await msalApp.loginPopup({
            scopes: (ssoConfig.scopes || 'User.Read openid profile email').split(' ').filter(Boolean),
          });

          
          const email = loginResponse.account.username || loginResponse.account.name || '';
          const name = loginResponse.account.name || email.split('@')[0];

          // Tenant restriction validation (Blocked Domains)
          if (ssoConfig.allowed_domains) {
            const domainStr = ssoConfig.allowed_domains.toLowerCase();
            const blockedList = domainStr.split(',').map(d => d.trim()).filter(Boolean);
            if (blockedList.length > 0) {
              const userDomain = email.split('@')[1]?.toLowerCase();
              if (userDomain && blockedList.includes(userDomain)) {
                throw new Error('Your email domain is blocked for this application.');
              }
            }
          }

          currentUser = {
            email,
            name,
            tenant: loginResponse.tenantId || ssoConfig.tenant_id,
            loginTime: new Date().toISOString(),
          };
          localStorage.setItem('litera_sso_user', JSON.stringify(currentUser));
          applySsoAuthState();
          setResultI18n('msg_sso_welcome', {name}, false);

          // Log the login event to the server
          logSsoEvent('login', currentUser, 'addin');
        } catch (err) {
          console.error('MSAL login failed:', err);
          const message = err && err.message
            ? (err.message.includes('user_cancelled') || err.message.includes('popup_window_error')
                ? 'Sign-in was cancelled or the popup was blocked. Please allow popups and try again.'
                : `Sign-in failed: ${err.message}`)
            : 'Sign-in failed. Please try again.';
          setResult(message, true);
        } finally {
          if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Sign In with Microsoft';
          }
        }
      });
    }

    const btnLogout = document.getElementById('btn-viewer-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (currentUser) {
          logSsoEvent('logout', currentUser, 'addin');
        }
        currentUser = null;
        localStorage.removeItem('litera_sso_user');
        applySsoAuthState();
        setResultI18n('msg_sso_signed_out', null, false);
      });
    }
  };

  // Log SSO login/logout events to the server for activity tracking
  async function logSsoEvent(eventType, user, source) {
    try {
      await fetch('/api/sso/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          source,
          user_email: user ? user.email : null,
          user_name: user ? user.name : null,
        }),
      });
    } catch (e) {
      console.warn('Failed to log SSO event:', e);
    }
  }

  function getCompareErrorMessage(code) {
    switch (code) {
      case 400: return 'Bad Request: One or more document URLs is malformed, invalid, or cannot be retrieved.';
      case 403: return 'Forbidden: One or both documents are password protected and cannot be read.';
      case 422: return 'Unprocessable Entity: Documents are corrupt, of an unsupported format, or a processing error occurred.';
      case 500: return 'Internal Server Error: Server is incorrectly configured, unlicensed, or an unexpected error occurred.';
      case 503: return 'Service Unavailable: The server is currently too busy to handle the request.';
      default:  return code ? `Unexpected server response: HTTP ${code}` : null;
    }
  }

  async function logComparisonResult(httpCode, originalName, modifiedName, durationMs, totalChanges, reqHeaders, respHeaders, renderingParams) {
    const isSuccess = httpCode === 200 || httpCode === 201;
    try {
      await fetch('/api/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:           currentUser ? currentUser.email : 'guest',
          user_email:        currentUser ? currentUser.email : 'anonymous@guest.local',
          user_name:         currentUser ? currentUser.name  : 'Guest',
          source:            'addin',
          original_filename: originalName || 'unknown',
          modified_filename: modifiedName || 'unknown',
          http_status_code:  httpCode,
          server_status:     isSuccess ? 'success' : 'failed',
          error_message:     isSuccess ? null : getCompareErrorMessage(httpCode),
          duration_ms:       durationMs || 0,
          total_changes:     totalChanges || 0,
          request_headers:   typeof reqHeaders === 'string' ? reqHeaders : (reqHeaders ? JSON.stringify(reqHeaders) : null),
          response_headers:  typeof respHeaders === 'string' ? respHeaders : (respHeaders ? JSON.stringify(respHeaders) : null),
          has_custom_rendering: !!renderingParams,
          rendering_parameters: renderingParams || null,
          machine_info:      navigator.userAgent
        }),
      });
    } catch (e) {
      console.warn('Failed to log comparison activity:', e);
    }
  }



  let originalFile = null;
  let modifiedFile = null;
  let originalSource = null; 
  let modifiedSource = null;
  let comparisonUrl = null;

  let fileInputOriginal;
  let fileInputModified;
  let btnCompare;
  let btnCancelCompare;
  let btnSwapFiles;
  let resultActions;
  let btnView;
  let btnReset;
  let statusWrap;
  let btnSettings;
  let settingsOverlay;
  let btnCloseSettings;
  let btnSaveSettings;
  let btnResetSettings;
  let settingsConfirm;
  let btnConfirmReset;
  let btnCancelReset;
  let settingsSaveCheckboxes;
  let settingsEmailCheckboxes;
  let settingsEmailDefaultCheckboxes;
  let prefixPdfInput;
  let prefixDocxInput;
  let prefixTrackInput;
  let prefixPagesInput;
  let nameTemplateInput;
  let emailSubjectTemplateInput;
  let enableHintsInput;
  let defaultSaveFolderInput;
  let btnChooseSaveFolder;
  let btnClearSaveFolder;
  let showInDownloadListInput;
  let showPathAfterActionInput;
  let rememberLastFolderInput;
  let enableCancelCompareInput;

  // Save buttons
  let btnSavePrimary;
  let btnSaveToggle;
  let ddMenu;

  // Email buttons
  let btnEmailPrimary;
  let btnEmailToggle;
  let emailMenu;
  let settings = JSON.parse(JSON.stringify(settingsStore.defaultSettings));
  let currentSavePrimaryFormat = 'pdf';
  let defaultSaveFolderHandle = null;
  let lastSavedPathLabel = '';
  let compareAbortController = null;
  let isComparing = false;

  const supportsFilePicker = () => {
    return typeof window.showOpenFilePicker === 'function';
  };

  const supportsFileSystemAccess = () => {
    return typeof window.showDirectoryPicker === 'function' && typeof window.FileSystemWritableFileStream !== 'undefined';
  };

  const injectSettingsHtml = async () => {
    const mount = document.getElementById('settings-mount');
    if (!mount) return;
    try {
      const response = await fetch('settings.html', { cache: 'no-store' });
      if (response.ok) {
        mount.innerHTML = await response.text();
      }
    } catch (e) {}
  };

  const initElements = async () => {
    fileInputOriginal = document.getElementById('file-input-original');
    fileInputModified = document.getElementById('file-input-modified');
    btnCompare = document.getElementById('btn-compare');
    btnCancelCompare = document.getElementById('btn-cancel-compare');
    
    btnSwapFiles = document.getElementById('btn-swap-files');
    resultActions = document.getElementById('result-actions');
    btnView = document.getElementById('btn-view');
    btnReset = document.getElementById('btn-reset');
    statusWrap = document.getElementById('status-wrap');
    btnSettings = document.getElementById('btn-settings');
    settingsOverlay = document.getElementById('settings-overlay');
    btnCloseSettings = document.getElementById('btn-close-settings');
    btnSaveSettings = document.getElementById('btn-save-settings');
    btnResetSettings = document.getElementById('btn-reset-settings');
    settingsConfirm = document.getElementById('settings-confirm');
    btnConfirmReset = document.getElementById('btn-confirm-reset');
    btnCancelReset = document.getElementById('btn-cancel-reset');
    settingsSaveCheckboxes = Array.from(document.querySelectorAll('[data-save-option]'));
    settingsEmailCheckboxes = Array.from(document.querySelectorAll('[data-email-option]'));
    settingsEmailDefaultCheckboxes = Array.from(document.querySelectorAll('[data-email-default]'));
    prefixPdfInput = document.getElementById('prefix-pdf');
    prefixDocxInput = document.getElementById('prefix-docx');
    prefixTrackInput = document.getElementById('prefix-track');
    prefixPagesInput = document.getElementById('prefix-pages');
    nameTemplateInput = document.getElementById('name-template');
    emailSubjectTemplateInput = document.getElementById('email-subject-template');
    enableHintsInput = document.getElementById('enable-hints');
    defaultSaveFolderInput = document.getElementById('default-save-folder');
    btnChooseSaveFolder = document.getElementById('btn-choose-save-folder');
    btnClearSaveFolder = document.getElementById('btn-clear-save-folder');
    showInDownloadListInput = document.getElementById('show-in-download-list');
    showPathAfterActionInput = document.getElementById('show-path-after-action');
    rememberLastFolderInput = document.getElementById('remember-last-folder');
    enableCancelCompareInput = document.getElementById('enable-cancel-compare');

    btnSavePrimary = document.getElementById('btn-save-primary');
    btnSaveToggle = document.getElementById('btn-save-toggle');
    ddMenu = document.getElementById('dd-menu');
    btnEmailPrimary = document.getElementById('btn-email-primary');
    btnEmailToggle = document.getElementById('btn-email-toggle');
    emailMenu = document.getElementById('email-menu');

    const langSelector = document.getElementById('lang-selector');
    if (langSelector && window.LiteraI18n) {
      await window.LiteraI18n.init();
      
      // Populate the dropdown with language names instead of just the hardcoded ones
      if (window.LiteraI18n.buildLanguageSelector) {
        window.LiteraI18n.buildLanguageSelector(langSelector);
      }
      
      const availableLangs = window.LiteraI18n.getAvailableLanguages();
      
      // Load stored lang from roaming settings
      const roamingLang = Office.context.roamingSettings ? Office.context.roamingSettings.get("litera_lang") : null;
      if (roamingLang && availableLangs.includes(roamingLang)) {
        window.LiteraI18n.setLanguage(roamingLang);
      } else if (!localStorage.getItem('litera_viewer_lang') && Office.context.displayLanguage) {
        // Fallback to Office display language on first launch
        const officeLang = Office.context.displayLanguage.split('-')[0];
        if (availableLangs.includes(officeLang)) {
          window.LiteraI18n.setLanguage(officeLang);
        }
      }

      const existingOptions = Array.from(langSelector.options).map(o => o.value);
      availableLangs.forEach(code => {
        if (!existingOptions.includes(code)) {
          const opt = document.createElement('option');
          opt.value = code;
          opt.textContent = window.LiteraI18n.getLanguageName ? window.LiteraI18n.getLanguageName(code) : code.toUpperCase();
          langSelector.appendChild(opt);
        }
      });

      langSelector.value = window.LiteraI18n.getLanguage();
      window.LiteraI18n.applyTranslations();
      langSelector.addEventListener('change', (e) => {
        window.LiteraI18n.setLanguage(e.target.value);
        if (Office.context.roamingSettings) {
          Office.context.roamingSettings.set("litera_lang", e.target.value);
          Office.context.roamingSettings.saveAsync();
        }
        window.LiteraI18n.applyTranslations();
        if (typeof applySettingsToUI === 'function') applySettingsToUI();
        if (typeof populateSettingsForm === 'function') populateSettingsForm();
        if (typeof applySsoAuthState === 'function') applySsoAuthState();
      });
    }
  };

  // Reusable icon strings
  const docIcon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23616161'%3E%3Cpath d='M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414c0-.53-.21-1.04-.586-1.414l-3.414-3.414A2 2 0 0010.586 2H6zm4.5 1.5V7a.5.5 0 00.5.5h3.5L10.5 3.5z'/%3E%3Cpath d='M10 14.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-2.15-1.85a.5.5 0 0 0-.7 0L4.5 15.29l-.65-.64a.5.5 0 0 0-.7.7l1 1c.2.2.5.2.7 0l3-3a.5.5 0 0 0 0-.7z'/%3E%3C/svg%3E`;
  const folderIcon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23616161'%3E%3Cpath d='M2 5.5A2.5 2.5 0 014.5 3h2.646c.398 0 .78.158 1.06.44l1.086 1.085c.14.14.332.22.53.225h5.678A2.5 2.5 0 0118 7.25v7.25A2.5 2.5 0 0115.5 17H4.5A2.5 2.5 0 012 14.5V5.5z'/%3E%3Cpath d='M13.85 11.15a.5.5 0 0 0-.7-.7l-2.65 2.65V7.5a.5.5 0 0 0-1 0v5.6l-2.65-2.65a.5.5 0 0 0-.7.7l3.5 3.5a.5.5 0 0 0 .7 0l3.5-3.5z'/%3E%3C/svg%3E`;
  const clearIcon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath d='M4.854 4.146a.5.5 0 10-.708.708L8.293 9l-4.147 4.146a.5.5 0 00.708.708L9 9.707l4.146 4.147a.5.5 0 00.708-.708L9.707 9l4.147-4.146a.5.5 0 00-.708-.708L9 8.293 4.854 4.146z'/%3E%3C/svg%3E`;

  const setResult = (text, isError, isWarning = false) => {
    let color = '#333';
    if (isError) color = '#c50f1f';
    else if (isWarning) color = '#975a16'; 
    statusWrap.className = '';
    statusWrap.style.display = 'block';
    statusWrap.style.marginTop = '10px';
    statusWrap.style.textAlign = 'center';
    statusWrap.innerHTML = `<div style="color: ${color}; font-weight: ${isWarning ? '600' : '500'}">${text}</div>`;
  };

  const setResultI18n = (key, opts, isError, isWarning = false) => {
    const text = window.LiteraI18n ? window.LiteraI18n.translate(key, opts) : key;
    let color = '#333';
    if (isError) color = '#c50f1f';
    else if (isWarning) color = '#975a16';
    const optsStr = opts ? " data-i18n-opts='" + JSON.stringify(opts).replace(/'/g, "&#39;") + "'" : "";
    statusWrap.className = '';
    statusWrap.style.display = 'block';
    statusWrap.style.marginTop = '10px';
    statusWrap.style.textAlign = 'center';
    statusWrap.innerHTML = "<div style=\"color: " + color + "; font-weight: " + (isWarning ? '600' : '500') + "\" data-i18n=\"" + key + "\"" + optsStr + ">" + text + "</div>";
  };
  const setResultHtml = (html, isError, isWarning = false) => {
    let color = '#333';
    if (isError) color = '#c50f1f';
    else if (isWarning) color = '#975a16';
    statusWrap.className = '';
    statusWrap.style.display = 'block';
    statusWrap.style.marginTop = '10px';
    statusWrap.style.textAlign = 'center';
    statusWrap.innerHTML = `<div style="color: ${color}; font-weight: ${isWarning ? '600' : '500'}">${html}</div>`;
  };

  const escapeHtml = (value) => {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  };

  const handleDb = 'compare_addin_handles';
  const handleStore = 'handles';
  const defaultFolderKey = 'defaultSaveFolder';
  const lastOriginalFileHandleKey = 'lastOriginalFileHandle';
  const lastModifiedFileHandleKey = 'lastModifiedFileHandle';

  const openHandleDb = () => {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB not available'));
      const request = indexedDB.open(handleDb, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(handleStore);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const getDefaultFolderHandle = async () => {
    if (!supportsFileSystemAccess()) return null;
    try {
      const db = await openHandleDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(handleStore, 'readonly');
        const store = tx.objectStore(handleStore);
        const req = store.get(defaultFolderKey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return null;
    }
  };

  const setDefaultFolderHandle = async (handle) => {
    if (!supportsFileSystemAccess()) return;
    const db = await openHandleDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(handleStore, 'readwrite');
      tx.objectStore(handleStore).put(handle, defaultFolderKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  const clearDefaultFolderHandle = async () => {
    if (!supportsFileSystemAccess()) return;
    const db = await openHandleDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(handleStore, 'readwrite');
      tx.objectStore(handleStore).delete(defaultFolderKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  const getLastFileHandleKey = (section) => {
    return section === 'original' ? lastOriginalFileHandleKey : lastModifiedFileHandleKey;
  };

  const getLastFileHandle = async (section) => {
    if (!supportsFilePicker()) return null;
    try {
      const db = await openHandleDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(handleStore, 'readonly');
        const store = tx.objectStore(handleStore);
        const req = store.get(getLastFileHandleKey(section));
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return null;
    }
  };

  const setLastFileHandle = async (section, handle) => {
    if (!supportsFilePicker()) return;
    const db = await openHandleDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(handleStore, 'readwrite');
      tx.objectStore(handleStore).put(handle, getLastFileHandleKey(section));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  const formatPathLine = (label) => {
    return window.LiteraI18n 
      ? window.LiteraI18n.translate('msg_saved_to_path', { path: escapeHtml(label) })
      : `Saved to ${escapeHtml(label)}`;
  };

  const resolveSaveFolderHandle = async () => {
    if (!supportsFileSystemAccess()) return null;
    return defaultSaveFolderHandle || null;
  };

  const saveBlobToFolder = async (folderHandle, blob, fileName) => {
    if (folderHandle && typeof folderHandle.requestPermission === 'function') {
      const permission = await folderHandle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        throw new Error('Permission denied for the selected folder.');
      }
    }
    const fileHandle = await folderHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return fileHandle;
  };

  await injectSettingsHtml();
  await initElements();

  const updateCompareButton = () => {
    const canCompare = originalFile && modifiedFile;
    const btnResetF = document.getElementById('btn-reset-files');
    if (btnResetF) {
      btnResetF.style.display = (originalFile || modifiedFile) ? 'inline-block' : 'none';
    }
    btnCompare.disabled = !canCompare || isComparing;

    const warningEl = document.getElementById('same-name-warning');
    if (warningEl) {
      if (canCompare && originalFile.name === modifiedFile.name) {
        warningEl.style.display = 'block';
      } else {
        warningEl.style.display = 'none';
      }
    }
  };

  const setCompareInProgress = (inProgress) => {
    isComparing = inProgress;
    const showCancel = settings.enableCancelCompare !== false && !settings.hideButtonCancel;
    btnCancelCompare.style.display = inProgress && showCancel ? 'inline-flex' : 'none';
    
    // Grey out compare button
    btnCompare.disabled = inProgress || !(originalFile && modifiedFile);
    btnCompare.style.opacity = inProgress ? '0.5' : '';
    btnCompare.style.cursor = inProgress ? 'not-allowed' : '';

    // Grey out file removal buttons (clear-btn) during comparison
    const form = document.getElementById('compare-upload-form');
    if (form) {
      if (inProgress) {
        form.classList.add('comparing-active');
      } else {
        form.classList.remove('comparing-active');
        btnCompare.style.opacity = '';
        btnCompare.style.cursor = '';
      }
    }
  };

  const updateSectionUI = (section) => {
    const contentDiv = document.getElementById(section + '-content');
    const file = section === 'original' ? originalFile : modifiedFile;
    const source = section === 'original' ? originalSource : modifiedSource;

    if (file) {
        contentDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; background: white; margin-bottom: 8px; max-width: 100%; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1; min-width: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280" style="flex-shrink: 0;"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                <span style="font-size: 14px; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${escapeHtml(file.name)}</span>
              </div>
              <button type="button" class="clear-btn" data-section="${section}" title="Remove file" style="background: none; border: none; cursor: pointer; color: #4b5563; font-size: 18px; padding: 0 0 0 8px; flex-shrink: 0; line-height: 1;">×</button>
            </div>
        `;
        document.getElementById('drop-' + (section === 'original' ? 'orig' : 'mod'))?.classList.add('active');
    } else {
        document.getElementById('drop-' + (section === 'original' ? 'orig' : 'mod'))?.classList.remove('active');
        contentDiv.innerHTML = `
            <div class="source-list">
                <button class="source-btn" data-action="current" data-section="${section}" type="button" data-hint="Use the current document" data-i18n-hint="hint_use_current">
                    <img width="16" height="16" src="${docIcon}" alt="" />
                    <span data-i18n="btn_current_doc">Current Document</span>
                </button>
                <button class="source-btn" data-action="browse" data-section="${section}" type="button" data-hint="Choose a file from your device" data-i18n-hint="hint_choose_file">
                    <img width="16" height="16" src="${folderIcon}" alt="" />
                    <span data-i18n="btn_local_device">Local device</span>
                </button>
            </div>
        `;
    }

    applyHints();
    if (window.LiteraI18n) window.LiteraI18n.applyTranslations();
  };

  document.addEventListener('click', function(e) {
    if (e.target.closest('.clear-btn')) {
      e.stopPropagation(); 
      const btn = e.target.closest('.clear-btn');
      const section = btn.getAttribute('data-section');
      clearFile(section);
    }

    const sourceBtn = e.target.closest('.source-btn[data-action]');
    if (sourceBtn) {
        const section = sourceBtn.dataset.section;
        const action = sourceBtn.dataset.action;

        if (action === 'current') {
            fetchCurrentDocument(section);
        } else if (action === 'browse') {
            selectLocalFile(section);
        }
    }
  });

  const populateSettingsForm = () => {
    const fsSupported = supportsFileSystemAccess();
    const filePickerSupported = supportsFilePicker();
      if (defaultSaveFolderInput) defaultSaveFolderInput.placeholder = fsSupported ? (window.LiteraI18n ? window.LiteraI18n.translate('ph_not_set') : 'Not set') : (window.LiteraI18n ? window.LiteraI18n.translate('msg_err_save_not_supported') : 'Not supported');
    if (defaultSaveFolderInput) defaultSaveFolderInput.value = settings.defaultSaveFolderLabel || '';
    const showInDownloads = settings.showInDownloadList === true;
    
    const renderingOptionsSection = document.getElementById('rendering-options-section');
    const renderingOptionsInput = document.getElementById('rendering-options');
    if (renderingOptionsSection && renderingOptionsInput) {
      if (settings.allowCustomRenderingOptions) {
        renderingOptionsSection.style.display = 'block';
        renderingOptionsInput.value = settings.renderingOptions || '';
      } else {
        renderingOptionsSection.style.display = 'none';
      }
    }
    if (showInDownloadListInput) showInDownloadListInput.checked = showInDownloads;

    const disableToggles = !settings.userOverrideInteractionToggles;
    if (showInDownloadListInput) showInDownloadListInput.disabled = disableToggles;

    const disableDefaultFolder = showInDownloads || disableToggles;
    if (defaultSaveFolderInput) defaultSaveFolderInput.disabled = disableDefaultFolder;
    if (btnChooseSaveFolder) btnChooseSaveFolder.disabled = !fsSupported || disableDefaultFolder;
    if (btnClearSaveFolder) btnClearSaveFolder.disabled = !fsSupported || disableDefaultFolder || !settings.defaultSaveFolderLabel;
    if (showPathAfterActionInput) showPathAfterActionInput.checked = settings.showPathAfterAction !== false;
    if (showPathAfterActionInput) showPathAfterActionInput.disabled = disableToggles;
    if (rememberLastFolderInput) rememberLastFolderInput.checked = settings.rememberLastFolder === true;
    if (rememberLastFolderInput) rememberLastFolderInput.disabled = disableToggles || !filePickerSupported;
    if (enableCancelCompareInput) enableCancelCompareInput.checked = settings.enableCancelCompare !== false;
    if (enableCancelCompareInput) enableCancelCompareInput.disabled = disableToggles;
    settingsSaveCheckboxes.forEach(cb => {
        cb.checked = settings.showSaveOptions.includes(cb.getAttribute('data-save-option'));
        cb.disabled = !settings.userOverrideSaveOptions;
      });
    settingsEmailCheckboxes.forEach(cb => {
        cb.checked = settings.showEmailOptions.includes(cb.getAttribute('data-email-option'));
        cb.disabled = !settings.userOverrideEmailOptions;
      });
    settingsEmailDefaultCheckboxes.forEach(cb => {
      cb.checked = settings.defaultEmailChecked.includes(cb.getAttribute('data-email-default'));
      cb.disabled = !settings.userOverrideEmailOptions;
    });
    const lockNameFormatting = settings.lockNameFormatting === true;
    const lockEmailSubject = settings.lockEmailSubject === true;

    if (prefixPdfInput) prefixPdfInput.value = settings.namePrefixes.pdf || '';
    if (prefixDocxInput) prefixDocxInput.value = settings.namePrefixes.docx || '';
    if (prefixTrackInput) prefixTrackInput.value = settings.namePrefixes.track_changes || '';
    if (prefixPagesInput) prefixPagesInput.value = settings.namePrefixes.changedPagesPdf || '';
    if (nameTemplateInput) nameTemplateInput.value = settings.nameTemplate || '';
    if (emailSubjectTemplateInput) emailSubjectTemplateInput.value = settings.emailSubjectTemplate || '';

    const disablePrefixes = lockNameFormatting || !settings.userOverridePrefixes;
    if (prefixPdfInput) prefixPdfInput.disabled = disablePrefixes;
    if (prefixDocxInput) prefixDocxInput.disabled = disablePrefixes;
    if (prefixTrackInput) prefixTrackInput.disabled = disablePrefixes;
    if (prefixPagesInput) prefixPagesInput.disabled = disablePrefixes;
    
    const disableTemplates = !settings.userOverrideTemplates;
    if (nameTemplateInput) nameTemplateInput.disabled = lockNameFormatting || disableTemplates;
    if (emailSubjectTemplateInput) emailSubjectTemplateInput.disabled = lockEmailSubject || disableTemplates;
  };

  const applyHints = () => {
    // Hints feature removed
  };

  const applySettingsToUI = () => {
    const saveOptions = settings.showSaveOptions || [];
    const emailOptions = settings.showEmailOptions || [];
    const defaultChecked = settings.defaultEmailChecked || [];

    document.querySelectorAll('#dd-menu .dd-item').forEach(item => {
      const format = item.getAttribute('data-format');
      item.style.display = saveOptions.includes(format) ? '' : 'none';
    });

    document.querySelectorAll('#email-menu .dd-item').forEach(item => {
      const option = item.getAttribute('data-option');
      if (!option) return;
      const show = emailOptions.includes(option);
      item.style.display = show ? '' : 'none';
      const input = item.querySelector('input[type="checkbox"]');
      if (!show && input) input.checked = false;
      if (show && input) input.checked = defaultChecked.includes(option);
    });

    
    // Admin Hide Controls
    if (btnSettings) btnSettings.style.display = settings.hideSettings ? 'none' : '';
    const btnEmail = document.getElementById('email-btn-group');
    if (btnEmail) btnEmail.style.display = settings.hideButtonEmail ? 'none' : '';
    if (btnView) btnView.style.display = settings.hideButtonView ? 'none' : '';
    
    // Hide settings sections if hideSettings is false but individual hides are true
    const hideIf = (id, condition) => {
      const el = document.getElementById(id);
      if (el) el.style.display = condition ? 'none' : '';
    };
    
    hideIf('section-save-menu-items', settings.hideSettingsSaveMenuItems);
    hideIf('section-email-menu-items', settings.hideSettingsEmailMenuItems);
    hideIf('section-default-checked', settings.hideSettingsDefaultChecked);
    hideIf('section-save-behavior', settings.hideSettingsSaveBehavior);
    hideIf('section-compare-behavior', settings.hideSettingsCompareBehavior);
    hideIf('section-name-prefixes', settings.hideSettingsNamePrefixes);
    hideIf('section-email-subject', settings.hideSettingsEmailSubject);

    if (showInDownloadListInput && showInDownloadListInput.parentElement) 
      showInDownloadListInput.parentElement.style.display = settings.hideSettingsShowInDownloadList ? 'none' : '';
    if (rememberLastFolderInput && rememberLastFolderInput.parentElement) 
      rememberLastFolderInput.parentElement.style.display = settings.hideSettingsRememberLastFolder ? 'none' : '';
    if (showPathAfterActionInput && showPathAfterActionInput.parentElement) 
      showPathAfterActionInput.parentElement.style.display = settings.hideSettingsShowSavedPath ? 'none' : '';

    
    const pwdToggleRow = document.getElementById('password-toggle-row-container');
    const pwdContainer = document.getElementById('password-fields-container');
    const chkPassword = document.getElementById('chk-password-protected');
    
    if (pwdToggleRow) {
      pwdToggleRow.style.display = settings.enable_password_fields !== false ? 'block' : 'none';
    }
    
    if (chkPassword && pwdContainer) {
      chkPassword.addEventListener('change', (e) => {
        pwdContainer.style.display = e.target.checked ? 'block' : 'none';
      });
      // Set initial state
      pwdContainer.style.display = chkPassword.checked ? 'block' : 'none';
    }
    
    // Wire up eye icons for passwords
    document.querySelectorAll('.btn-eye').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        if (!targetId) return;
        const input = document.getElementById(targetId);
        if (input) {
          if (input.type === 'password') {
            input.type = 'text';
            btn.style.color = '#3b82f6'; // active color
          } else {
            input.type = 'password';
            btn.style.color = '#64748b'; // default color
          }
        }
      });
    });


    const firstVisible = saveOptions.find(opt => {
      const el = document.querySelector(`#dd-menu .dd-item[data-format="${opt}"]`);
      return el && el.style.display !== 'none';
    });

    currentSavePrimaryFormat = firstVisible || 'pdf';
    if (firstVisible) {
      const hintMap = {
        pdf: 'Save PDF',
        docx: 'Save Docx',
        track_changes: 'Save Track Changes',
        changedPagesPdf: 'Save Redline Pages'
      };
      // btnSavePrimary.textContent removed to preserve SVG and i18n span
      if (btnSavePrimary) btnSavePrimary.setAttribute('data-hint', hintMap[currentSavePrimaryFormat] || 'Save file');
      if (btnSavePrimary) btnSavePrimary.disabled = false;
      if (btnSaveToggle) btnSaveToggle.disabled = false;
    } else {
      // btnSavePrimary.textContent removed to preserve SVG and i18n span
      if (btnSavePrimary) btnSavePrimary.setAttribute('data-hint', 'Save file');
      if (btnSavePrimary) btnSavePrimary.disabled = true;
      if (btnSaveToggle) btnSaveToggle.disabled = true;
    }

    applyHints();
  };

  const loadSettings = async () => {
    settings = await settingsStore.load();
    // Apply brand settings directly to header DOM (not via i18n so translations cannot override them)
    const brandLogo = document.getElementById('hdr-brand-initial');
    const brandName = document.getElementById('hdr-brand-name');
    const brandSub  = document.getElementById('hdr-brand-sub');
    if (brandLogo) brandLogo.textContent = settings.brandLogoText || 'L';
    if (brandName) brandName.textContent = settings.brandTitle    || 'Compare Server';
    if (brandSub)  brandSub.textContent  = settings.brandSubtitle || 'Enterprise Document Comparison';
    try {
      localStorage.setItem('litera_cached_addin_branding', JSON.stringify({
        brandLogoText: settings.brandLogoText,
        brandTitle: settings.brandTitle,
        brandSubtitle: settings.brandSubtitle
      }));
    } catch (e) {}

    if (settings.customLanguages) {
      try {
        const parsed = JSON.parse(settings.customLanguages);
        if (window.LiteraI18n && window.LiteraI18n.addTranslations) {
          window.LiteraI18n.addTranslations(parsed);
          
          // Rebuild the language selector now that custom languages are added
          const langSelector = document.getElementById('lang-selector');
          if (langSelector && window.LiteraI18n.buildLanguageSelector) {
            window.LiteraI18n.buildLanguageSelector(langSelector);
            // Ensure the currently selected language matches the dropdown
            langSelector.value = window.LiteraI18n.getLanguage();
          }

          window.LiteraI18n.applyTranslations();
        }
      } catch (e) { console.error('Failed to parse custom languages', e); }
    }
    if (settings.showInDownloadList === true) {
      await clearDefaultFolderHandle();
      defaultSaveFolderHandle = null;
      settings.defaultSaveFolderLabel = '';
      await settingsStore.save(settings);
    }
    defaultSaveFolderHandle = await getDefaultFolderHandle();
    if (!defaultSaveFolderHandle) {
      settings.defaultSaveFolderLabel = '';
    } else if (!settings.defaultSaveFolderLabel) {
      settings.defaultSaveFolderLabel = defaultSaveFolderHandle.name || 'Selected folder';
      await settingsStore.save(settings);
    }
    try { applySettingsToUI(); } catch(e) { console.error('applySettingsToUI error:', e); }
    try { populateSettingsForm(); } catch(e) { console.error('populateSettingsForm error:', e); }
    setCompareInProgress(isComparing);
  };

  const clearFile = (section) => {
    if (section === 'original') {
      originalFile = null;
      originalSource = null;
      fileInputOriginal.value = '';
    } else {
      modifiedFile = null;
      modifiedSource = null;
      fileInputModified.value = '';
    }
    comparisonUrl = null; 
    updateSectionUI(section);
    resultActions.style.display = 'none';
    
    // Close menus
    document.querySelectorAll('.dd-menu').forEach(menu => menu.classList.remove('open'));
    updateCompareButton();
    setResult('', false); 
  };

  const swapSelectedFiles = () => {
    const nextOriginalFile = modifiedFile;
    const nextModifiedFile = originalFile;
    const nextOriginalSource = modifiedSource;
    const nextModifiedSource = originalSource;

    originalFile = nextOriginalFile;
    modifiedFile = nextModifiedFile;
    originalSource = nextOriginalSource;
    modifiedSource = nextModifiedSource;

    fileInputOriginal.value = '';
    fileInputModified.value = '';
    comparisonUrl = null;
    resultActions.style.display = 'none';
    updateSectionUI('original');
    updateSectionUI('modified');
    updateCompareButton();
    setResult('', false);
  };

  const selectLocalFile = async (section) => {
    if (!supportsFilePicker()) {
      if (section === 'original') {
        fileInputOriginal.click();
      } else {
        fileInputModified.click();
      }
      return;
    }

    try {
      const options = {
        multiple: false,
        types: [
          {
            description: 'Documents',
            accept: {
              'application/msword': ['.doc'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              'application/rtf': ['.rtf'],
              'text/plain': ['.txt'],
              'application/pdf': ['.pdf']
            }
          }
        ]
      };
      if (settings.rememberLastFolder === true) {
        const lastHandle = await getLastFileHandle(section);
        if (lastHandle) options.startIn = lastHandle;
      } else {
        options.startIn = 'documents';
      }

      let fileHandle;
      try {
        const fileHandles = await window.showOpenFilePicker(options);
        fileHandle = fileHandles[0];
        if (!fileHandle) return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (section === 'original') fileInputOriginal.click();
        else fileInputModified.click();
        return;
      }
      const file = await fileHandle.getFile();

      if (settings.rememberLastFolder === true) {
        await setLastFileHandle(section, fileHandle);
      }

      if (section === 'original') {
        originalFile = file;
        originalSource = 'local';
        fileInputOriginal.value = '';
        updateSectionUI('original');
      } else {
        modifiedFile = file;
        modifiedSource = 'local';
        fileInputModified.value = '';
        updateSectionUI('modified');
      }

      updateCompareButton();
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      setResultI18n('msg_err_open_file', {error: e.message || e}, true);
    }
  };

  const officeFileToBlob = (file) => {
    return new Promise((resolve, reject) => {
      const totalSlices = file.sliceCount;
      let currentSlice = 0;
      const slices = [];
  
      const getSlice = () => {
        file.getSliceAsync(currentSlice, (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            const u8Array = new Uint8Array(result.value.data);
            slices.push(u8Array);
            
            currentSlice++;
            if (currentSlice < totalSlices) {
              getSlice();
            } else {
              file.closeAsync();
              resolve(new Blob(slices, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
            }
          } else {
            file.closeAsync();
            reject(result.error);
          }
        });
      };
      getSlice();
    });
  };

  const fetchCurrentDocument = async (section) => {
    setResultI18n('msg_loading_doc', {section: section}, false);
    
    Office.context.document.getFileAsync(Office.FileType.Compressed, async (result) => {
      if (result.status !== Office.AsyncResultStatus.Succeeded) {
        setResultI18n('msg_err_get_file', {error: result.error.message}, true);
        return;
      }
  
      const file = result.value;
      let docUrl = Office.context.document.url;
      let fileName = 'Current Document.docx';
      
      if (docUrl) {
        const urlParts = docUrl.split(/[/\\]/);
        let rawName = urlParts[urlParts.length - 1];
        try { rawName = decodeURIComponent(rawName); } catch(e){}
        rawName = rawName.split('?')[0]; 
        if (rawName) fileName = rawName;
      }
      
      if (!fileName.toLowerCase().match(/\.(docx?|pdf|rtf|txt)$/)) {
          fileName += '.docx';
      }
  
      try {
        const blob = await officeFileToBlob(file);
        blob.name = fileName; 
  
        if (section === 'original') {
          originalFile = blob;
          originalSource = 'current';
        } else {
          modifiedFile = blob;
          modifiedSource = 'current';
        }
  
        updateSectionUI(section);
        updateCompareButton();
        
        if (!statusWrap.innerText.includes('same name')) {
            setResult('', false);
        }
      } catch (error) {
        setResultI18n('msg_err_process_file', {error: error.message}, true);
      }
    });
  };

  fileInputOriginal.addEventListener('change', function () {
    if (fileInputOriginal.files.length > 0) {
      originalFile = fileInputOriginal.files[0];
      originalSource = 'local';
      updateSectionUI('original');
      updateCompareButton();
    }
  });

  fileInputModified.addEventListener('change', function () {
    if (fileInputModified.files.length > 0) {
      modifiedFile = fileInputModified.files[0];
      modifiedSource = 'local';
      updateSectionUI('modified');
      updateCompareButton();
    }
  });

  /* =========================================
     COMPARE AND ACTION LOGIC
     ========================================= */

  btnCompare.addEventListener('click', async function () {
    if (!originalFile || !modifiedFile) return;
    if (isComparing) return;
    if (ssoConfig.enabled && ssoConfig.require_login_to_compare && !currentUser) {
      setResultI18n('msg_err_unauthorized', null, true);
      applySsoAuthState();
      return;
    }

    const formData = new FormData();
    formData.append('originalDocument', originalFile, originalFile.name || 'original.docx');
    formData.append('modifiedDocument', modifiedFile, modifiedFile.name || 'modified.docx');
    
    const origPwd = document.getElementById('input-orig-password')?.value;
    const modPwd = document.getElementById('input-mod-password')?.value;
    if (origPwd) formData.append('originalDocumentPassword', origPwd);
    if (modPwd) formData.append('modifiedDocumentPassword', modPwd);

    if (settings.allowCustomRenderingOptions && settings.renderingOptions) {
      formData.append('renderingOptions', settings.renderingOptions);
    }

    setResultI18n('btn_comparing', null, false);
    compareAbortController = new AbortController();
    setCompareInProgress(true);
    const compareStartTime = Date.now();

    // Build Curl-like request header string without passwords
    let curlStr = `'${apiEndpoint}' \\\n  -H 'accept: */*' \\\n  -H 'Content-Type: multipart/form-data'`;
    for (let [key, value] of formData.entries()) {
      if (key.toLowerCase().includes('password')) {
        curlStr += ` \\\n  -F '${key}='`;
      } else if (value instanceof File) {
        curlStr += ` \\\n  -F '${key}=@${value.name};type=${value.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}'`;
      } else {
        curlStr += ` \\\n  -F '${key}=${value}'`;
      }
    }
    const reqHeadersStr = `POST ${apiEndpoint}\nAccept: */*\nContent-Type: multipart/form-data\n\n[Body]\n${curlStr}`;

    const renderingParams = (settings.allowCustomRenderingOptions && settings.renderingOptions) ? settings.renderingOptions : null;

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Accept': '*/*'
        },
        body: formData,
        signal: compareAbortController.signal
      });
      
      let respHeadersStr = `HTTP/1.1 ${response.status} ${response.statusText}\n`;
      response.headers.forEach((val, key) => {
        respHeadersStr += `${key}: ${val}\n`;
      });
      const contentType = response.headers.get('content-type') || '';
      
      if (response.status === 201) {
        const location = response.headers.get('location');
        if (!location) throw new Error('201 response received but Location header is missing.');
        
        comparisonUrl = location;
        
        resultActions.style.display = 'grid';
        setResultI18n('msg_compare_completed', null, false);

        // Log successful comparison with real HTTP code
        logComparisonResult(201, originalFile && originalFile.name, modifiedFile && modifiedFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingParams);
      } else {
        const text = await response.text();
        // Log failed comparison with real HTTP code before throwing
        logComparisonResult(response.status, originalFile && originalFile.name, modifiedFile && modifiedFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingParams);
        
        const t = (k, opts) => window.LiteraI18n ? window.LiteraI18n.translate(k, opts) : k;
        if (response.status === 403) {
          if (settings.enable_password_fields === false) {
            throw new Error(t('err_403_password_disabled') || 'One or both documents are password-protected, but password fields are disabled by your administrator.');
          }
          throw new Error(t('err_403_password') || 'Password protected');
        };
        if (response.status === 400) throw new Error(t('err_400_bad_request') || 'Bad request');
        if (response.status === 404) throw new Error(t('err_404_not_found') || 'Not found (404)');
        if (response.status === 415) throw new Error(t('err_415_unsupported') || 'Unsupported media type');
        if (response.status === 422) throw new Error(t('err_422_corrupt') || 'Corrupt or unsupported format');
        if (response.status === 500) throw new Error(t('err_500_server') || 'Server error');
        if (response.status === 503) throw new Error(t('err_503_busy') || 'Server busy');
        
        throw new Error(t('err_unknown_status', {status: response.status}) || `Server returned ${response.status}: ${text}`);
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        setResultI18n('msg_compare_canceled', null, false, true);
      } else {
        setResultI18n('msg_compare_failed', {error: err.message}, true);
      }
      resultActions.style.display = 'none';

      // Log failed connection if it wasn't an abort
      if (!err || err.name !== 'AbortError') {
        logComparisonResult(0, originalFile && originalFile.name, modifiedFile && modifiedFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingParams);
      }
    } finally {
      compareAbortController = null;
      setCompareInProgress(false);
    }
  });

  btnCancelCompare.addEventListener('click', () => {
    if (compareAbortController) {
      compareAbortController.abort();
    }
  });

  btnReset.addEventListener('click', () => {
    clearFile('original');
    clearFile('modified');
  });

  btnSwapFiles.addEventListener('click', () => {
    if (!originalFile && !modifiedFile) return;
    swapSelectedFiles();
  });

    btnView.addEventListener('click', async function () {
    if (!comparisonUrl) return;
    
    let finalUrl = comparisonUrl;
    try {
      const confRes = await fetch(window.location.origin + '/api/config');
      if (confRes.ok) {
        const config = await confRes.json();
        // Extract comparisonId from the end of the location URL
        const urlParts = comparisonUrl.split('/');
        const comparisonId = urlParts[urlParts.length - 1];

        if (config.install_mode === 'full' || config.install_mode === 'addin_and_admin_and_viewer' || config.install_mode === 'addin_admin_and_viewer' || config.install_mode === 'addin_and_viewer' || config.install_mode === 'viewer_only') {
          // It has viewer
          const safeOrig = encodeURIComponent(originalFile ? originalFile.name : 'Original');
          const safeMod = encodeURIComponent(modifiedFile ? modifiedFile.name : 'Modified');
          finalUrl = window.location.origin + '/viewer/viewer.html?id=' + comparisonId + '&orig=' + safeOrig + '&mod=' + safeMod;
        }
      }
    } catch (e) {
      console.warn('Could not fetch config to determine viewer mode, falling back to default URL');
    }

    // Append language
    if (window.LiteraI18n) {
      const currentLang = window.LiteraI18n.getLanguage();
      if (finalUrl.includes('?')) {
        finalUrl += '&lang=' + currentLang;
      } else {
        finalUrl += '?lang=' + currentLang;
      }
    }
    
    try {
      if (window.Office && window.Office.context && window.Office.context.ui && window.Office.context.ui.openBrowserWindow) {
        Office.context.ui.openBrowserWindow(finalUrl);
      } else {
        window.open(finalUrl, '_blank');
      }
    } catch (err) {
      window.open(finalUrl, '_blank');
    }
  });

  // Manage Dropdowns Click logic
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.dd-wrap')) {
      document.querySelectorAll('.dd-menu').forEach(menu => menu.classList.remove('open'));
    }
    const so = document.getElementById('settings-overlay');
    if (so && so.classList.contains('open') && !e.target.closest('.settings-panel') && !e.target.closest('#btn-settings')) {
      so.classList.remove('open');
      so.setAttribute('aria-hidden', 'true');
    }
  });

  // Stop checkbox menu from closing when interacting inside (delegated)
  document.addEventListener('click', (e) => {
    const em = document.getElementById('email-menu');
    if (em && em.contains(e.target)) {
      e.stopPropagation();
    }
  }, true);

  document.addEventListener('click', (e) => {
    const saveToggle = document.getElementById('btn-save-toggle');
    const emailToggle = document.getElementById('btn-email-toggle');
    const ddMenuEl = document.getElementById('dd-menu');
    const emailMenuEl = document.getElementById('email-menu');

    if (saveToggle && e.target === saveToggle) {
      e.stopPropagation();
      if (emailMenuEl) emailMenuEl.classList.remove('open');
      if (ddMenuEl) ddMenuEl.classList.toggle('open');
    }

    if (emailToggle && e.target === emailToggle) {
      e.stopPropagation();
      if (ddMenuEl) ddMenuEl.classList.remove('open');
      if (emailMenuEl) emailMenuEl.classList.toggle('open');
    }
  });

  btnSettings.addEventListener('click', () => {
    const so = document.getElementById('settings-overlay');
    if (!so) return;
    populateSettingsForm();
    so.classList.add('open');
    so.setAttribute('aria-hidden', 'false');
  });

  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest('#btn-close-settings')) {
      const so = document.getElementById('settings-overlay');
      if (so) { so.classList.remove('open'); so.setAttribute('aria-hidden', 'true'); }
    }
    if (e.target && e.target.closest('#btn-reset-settings')) {
      const sc = document.getElementById('settings-confirm');
      const brs = document.getElementById('btn-reset-settings');
      const bss = document.getElementById('btn-save-settings');
      if (sc) sc.style.display = 'inline-flex';
      if (brs) brs.style.display = 'none';
      if (bss) bss.style.display = 'none';
    }
    if (e.target && e.target.closest('#btn-cancel-reset')) {
      const sc = document.getElementById('settings-confirm');
      const brs = document.getElementById('btn-reset-settings');
      const bss = document.getElementById('btn-save-settings');
      if (sc) sc.style.display = 'none';
      if (brs) brs.style.display = '';
      if (bss) bss.style.display = '';
    }
    if (e.target && e.target.closest('#btn-confirm-reset')) {
      (async () => {
        settings = await settingsStore.reset();
        await clearDefaultFolderHandle();
        defaultSaveFolderHandle = null;
        settings.defaultSaveFolderLabel = '';
        try { applySettingsToUI(); } catch(err) {}
        try { populateSettingsForm(); } catch(err) {}
        const so = document.getElementById('settings-overlay');
        if (so) { so.classList.remove('open'); so.setAttribute('aria-hidden', 'true'); }
        const sc = document.getElementById('settings-confirm');
        const brs = document.getElementById('btn-reset-settings');
        const bss = document.getElementById('btn-save-settings');
        if (sc) sc.style.display = 'none';
        if (brs) brs.style.display = '';
        if (bss) bss.style.display = '';
      })();
    }
    if (e.target && e.target.closest('#btn-save-settings')) {
      (async () => {
        if (settings.userOverrideSaveOptions) {
          settings.showSaveOptions = Array.from(document.querySelectorAll('[data-save-option]'))
            .filter(cb => cb.checked)
            .map(cb => cb.getAttribute('data-save-option'));
        }
        if (settings.userOverrideEmailOptions) {
          settings.showEmailOptions = Array.from(document.querySelectorAll('[data-email-option]'))
            .filter(cb => cb.checked)
            .map(cb => cb.getAttribute('data-email-option'));
        }
        settings.defaultEmailChecked = Array.from(document.querySelectorAll('[data-email-default]'))
          .filter(cb => cb.checked)
          .map(cb => cb.getAttribute('data-email-default'))
          .filter(opt => settings.showEmailOptions.includes(opt));

        if (settings.userOverridePrefixes) {
          const pPdf = document.getElementById('prefix-pdf');
          const pDocx = document.getElementById('prefix-docx');
          const pTrack = document.getElementById('prefix-track');
          const pPages = document.getElementById('prefix-pages');
          settings.namePrefixes = {
            ...settingsStore.defaultSettings.namePrefixes,
            pdf: (pPdf && pPdf.value) || settingsStore.defaultSettings.namePrefixes.pdf,
            docx: (pDocx && pDocx.value) || settingsStore.defaultSettings.namePrefixes.docx,
            track_changes: (pTrack && pTrack.value) || settingsStore.defaultSettings.namePrefixes.track_changes,
            changedPagesPdf: (pPages && pPages.value) || settingsStore.defaultSettings.namePrefixes.changedPagesPdf
          };
        }
        if (settings.userOverrideTemplates) {
          const ntEl = document.getElementById('name-template');
          const estEl = document.getElementById('email-subject-template');
          if (ntEl) settings.nameTemplate = (ntEl.value || settingsStore.defaultSettings.nameTemplate).trim();
          if (estEl) settings.emailSubjectTemplate = (estEl.value || settingsStore.defaultSettings.emailSubjectTemplate).trim();
        }
        const silDiv = document.getElementById('show-in-download-list');
        const spaEl = document.getElementById('show-path-after-action');
        const rlf = document.getElementById('remember-last-folder');
        const eccEl = document.getElementById('enable-cancel-compare');
        const dsf = document.getElementById('default-save-folder');
        const roEl = document.getElementById('rendering-options');
        if (silDiv) settings.showInDownloadList = silDiv.checked;
        if (spaEl) settings.showPathAfterAction = spaEl.checked;
        if (rlf) settings.rememberLastFolder = rlf.checked;
        if (eccEl) settings.enableCancelCompare = eccEl.checked;
        if (dsf) settings.defaultSaveFolderLabel = (dsf.value || '').trim();
        if (roEl && settings.allowCustomRenderingOptions) settings.renderingOptions = roEl.value;

        await settingsStore.save(settings);
        try { applySettingsToUI(); } catch(err) {}
        setCompareInProgress(isComparing);
        const so = document.getElementById('settings-overlay');
        if (so) { so.classList.remove('open'); so.setAttribute('aria-hidden', 'true'); }
      })();
    }
    // Choose/clear save folder
    if (e.target && e.target.closest('#btn-choose-save-folder')) {
      (async () => {
        if (!supportsFileSystemAccess()) { setResultI18n('msg_err_save_not_supported', null, true); return; }
        try {
          const handle = await window.showDirectoryPicker();
          if (!handle) return;
          defaultSaveFolderHandle = handle;
          settings.defaultSaveFolderLabel = handle.name || 'Selected folder';
          await setDefaultFolderHandle(handle);
          await settingsStore.save(settings);
          populateSettingsForm();
        } catch(err) {
          if (err && err.name === 'AbortError') return;
          setResultI18n('msg_err_set_save_folder', {error: err.message || err}, true);
        }
      })();
    }
    if (e.target && e.target.closest('#btn-clear-save-folder')) {
      (async () => {
        if (!supportsFileSystemAccess()) return;
        await clearDefaultFolderHandle();
        defaultSaveFolderHandle = null;
        settings.defaultSaveFolderLabel = '';
        const dsfEl = document.getElementById('default-save-folder');
        if (dsfEl) dsfEl.value = '';
        await settingsStore.save(settings);
        populateSettingsForm();
      })();
    }
    // Show-in-download-list
    const silTarget = e.target && e.target.id === 'show-in-download-list' ? e.target : null;
    if (silTarget) {
      if (silTarget.checked) {
        settings.showInDownloadList = true;
        clearDefaultFolderHandle().finally(() => {
          defaultSaveFolderHandle = null;
          settings.defaultSaveFolderLabel = '';
          const dsfEl = document.getElementById('default-save-folder');
          if (dsfEl) dsfEl.value = '';
          settingsStore.save({...settings, showInDownloadList: true, defaultSaveFolderLabel: ''}).finally(() => populateSettingsForm());
        });
      } else {
        settings.showInDownloadList = false;
        settingsStore.save(settings).finally(() => populateSettingsForm());
      }
    }
  });


  // Helper logic for file names and API routing
  const getBaseName = (fileName) => {
    if (!fileName) return "Document";
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? fileName : fileName.substring(0, lastDot);
  };

  const generateFileName = (format, origFile, modFile) => {
    const origName = getBaseName(origFile ? origFile.name : 'Original');
    const modName = getBaseName(modFile ? modFile.name : 'Modified');
    return settingsStore.buildFileName(format, origName, modName, settings);
  };

  const getComparisonDownloadUrl = async (format) => {
    const urlObj = new URL(comparisonUrl);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const comparisonId = pathSegments[pathSegments.length - 1];
    const baseUrl = urlObj.origin; 
    
    if (format === 'track_changes') {
      const createTcUrl = `${compareServerUrl}/api/Comparison/${comparisonId}/tccreate`;
      const response = await fetch(createTcUrl, { method: 'POST' });
      if (response.status === 201) return response.headers.get('location');
      throw new Error(`Server returned ${response.status} during tccreate`);
    } else {
      const prepareUrl = `${compareServerUrl}/api/Comparison/${comparisonId}/prepareDownload?format=${format}`;
      const response = await fetch(prepareUrl, { method: 'GET' });
      if (response.ok) { 
        let downloadUrl = `${compareServerUrl}/api/Comparison/${comparisonId}/download`;
        if (format !== 'pdf') downloadUrl += `?format=${format}`;
        return downloadUrl;
      }
      throw new Error(`Server returned ${response.status} during prepareDownload`);
    }
  };

  const executeBlobDownload = (blob, fileName) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = objectUrl;
    a.download = fileName; 
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    }, 100);
  };

  /* Save logic */
  btnSavePrimary.addEventListener('click', () => { triggerDownload(currentSavePrimaryFormat); });
  document.querySelectorAll('#dd-menu .dd-item').forEach(item => {
    item.addEventListener('click', (e) => { triggerDownload(e.target.getAttribute('data-format')); ddMenu.classList.remove('open'); });
  });

  async function triggerDownload(format) {
    if (!comparisonUrl) return;
    const suggestedName = generateFileName(format, originalFile, modifiedFile);
    try {
      setResultI18n('msg_prep_download', {format: format.toUpperCase()}, false);
      const targetUrl = await getComparisonDownloadUrl(format);
      
      setResultI18n('msg_saving', {name: suggestedName}, false);
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      
      const blob = await response.blob();
      let savedToFolder = false;
      let folderHandle = null;

      if (supportsFileSystemAccess() && settings.showInDownloadList !== true) {
        folderHandle = await resolveSaveFolderHandle();
        if (folderHandle) {
          await saveBlobToFolder(folderHandle, blob, suggestedName);
          savedToFolder = true;
        }
      }

      if (savedToFolder) {
        const folderLabel = settings.defaultSaveFolderLabel || folderHandle.name || 'Selected folder';
        lastSavedPathLabel = `${folderLabel}\\${suggestedName}`;
        if (settings.showPathAfterAction !== false) {
          setResultHtml(formatPathLine(lastSavedPathLabel), false);
        } else {
          setResultI18n('msg_save_complete', null, false);
        }
      } else {
        executeBlobDownload(blob, suggestedName);
        lastSavedPathLabel = `Downloads\\${suggestedName}`;
        if (settings.showPathAfterAction !== false) {
          setResultHtml(formatPathLine(lastSavedPathLabel), false);
        } else {
          setResultI18n('msg_download_complete', null, false);
        }
      }
    } catch (error) {
      setResultI18n('msg_err_save_file', {error: error.message}, true);
    }
  }

  /* Email Logic (Generates native Outlook .eml file to attach files via Client Side JS) */
  btnEmailPrimary.addEventListener('click', async () => {
    if (!comparisonUrl) return;

    // 1. Gather selected options
    const checkboxes = emailMenu.querySelectorAll('input[type="checkbox"]:checked');
    const selectedFormats = Array.from(checkboxes).map(cb => cb.value);

    if (selectedFormats.length === 0) {
      setResultI18n('msg_err_no_email_format', null, true);
      return;
    }

    setResultI18n('msg_prep_email', null, false);
    emailMenu.classList.remove('open');

    try {
      const attachments = [];

      // 2. Attach Source Files if requested
      if (selectedFormats.includes('original') && originalFile) {
        attachments.push({ name: originalFile.name || 'Original.docx', blob: originalFile });
      }
      if (selectedFormats.includes('modified') && modifiedFile) {
        attachments.push({ name: modifiedFile.name || 'Modified.docx', blob: modifiedFile });
      }

      // 3. Attach dynamically generated Redlines
      const apiFormats = selectedFormats.filter(f => !['original', 'modified'].includes(f));
      
      for (const format of apiFormats) {
        const targetUrl = await getComparisonDownloadUrl(format);
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${format}`);
        
        attachments.push({
          name: generateFileName(format, originalFile, modifiedFile),
          blob: await response.blob()
        });
      }

      // 4. Convert blobs to Base64
      const blobToBase64 = (blob) => new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });

            // 5. Construct .eml content block
      let eml = "To: \r\n";
      const subject = settingsStore.buildEmailSubject(
        getBaseName(originalFile?.name),
        getBaseName(modifiedFile?.name),
        settings
      );
      eml += "Subject: " + subject + "\r\n";
      eml += "X-Unsent: 1\r\n";
      eml += "MIME-Version: 1.0\r\n";
      const boundary = "----=_NextPart_000_0001_01D9D9D9.D9D9D9D9";
      eml += "Content-Type: multipart/mixed; boundary=\"" + boundary + "\"\r\n\r\n";
      eml += "--" + boundary + "\r\n";
      eml += "Content-Type: text/plain; charset=utf-8\r\n\r\n";
      eml += "Please find the requested document comparison and source files attached.\r\n\r\n";

      for (const att of attachments) {
        const mimeType = att.name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const base64 = await blobToBase64(att.blob);
        const chunked = base64.match(/.{1,76}/g).join("\r\n");

        eml += "--" + boundary + "\r\n";
        eml += "Content-Type: " + mimeType + "; name=\"" + att.name + "\"\r\n";
        eml += "Content-Disposition: attachment; filename=\"" + att.name + "\"\r\n";
        eml += "Content-Transfer-Encoding: base64\r\n\r\n";
        eml += chunked + "\r\n\r\n";
      }
      eml += "--" + boundary + "--\r\n";

      // 6. Download the EML file. Clicking it will open Outlook natively.
      const emlBlob = new Blob([eml], { type: 'message/rfc822' });
      let savedToFolder = false;
      let folderHandle = null;
      const emlName = generateFileName('eml', originalFile, modifiedFile);

      if (supportsFileSystemAccess() && settings.showInDownloadList !== true) {
        folderHandle = await resolveSaveFolderHandle();
        if (folderHandle) {
          await saveBlobToFolder(folderHandle, emlBlob, emlName);
          savedToFolder = true;
        }
      }

      if (savedToFolder) {
        const folderLabel = settings.defaultSaveFolderLabel || folderHandle.name || 'Selected folder';
        lastSavedPathLabel = `${folderLabel}\\${emlName}`;
        if (settings.showPathAfterAction !== false) {
          const msg = window.LiteraI18n 
            ? window.LiteraI18n.translate('msg_saved_to_path_email', { path: escapeHtml(lastSavedPathLabel), app: 'Outlook' })
            : `${formatPathLine(lastSavedPathLabel)}. Click the .eml file to open Outlook.`;
          setResultHtml(msg, false);
        } else {
          setResultI18n('msg_email_saved', null, false);
        }
      } else {
        executeBlobDownload(emlBlob, emlName);
        lastSavedPathLabel = `Downloads\\${emlName}`;
        if (settings.showPathAfterAction !== false) {
          const msg = window.LiteraI18n 
            ? window.LiteraI18n.translate('msg_saved_to_path_email', { path: escapeHtml(lastSavedPathLabel), app: 'Outlook' })
            : `${formatPathLine(lastSavedPathLabel)}. Click the .eml file to open Outlook.`;
          setResultHtml(msg, false);
        } else {
          setResultI18n('msg_email_downloaded', null, false);
        }
      }
    } catch (error) {
      setResultI18n('msg_err_gen_email', {error: error.message}, true);
    }
  });

  await loadSettings();
  initSso();
});
