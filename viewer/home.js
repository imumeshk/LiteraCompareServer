/**
 * Litera Compare - Custom Viewer Portal Home Logic
 */

(function () {
  let config = {
    compare_server_url: 'https://compare.litera.com/api/v1',
    viewer_url: window.location.origin + '/viewer',
  };

  let ssoConfig = {
    enabled: false,
    require_login_to_compare: false,
    tenant_id: '',
    client_id: '',
  };

  let currentUser = null;

  let origFile = null;
  let modFile = null;

  const form = document.getElementById('compare-upload-form');
  const inputOrig = document.getElementById('input-orig');
  const inputMod = document.getElementById('input-mod');
  const dropOrig = document.getElementById('drop-orig');
  const dropMod = document.getElementById('drop-mod');
  const btnSwapFiles = document.getElementById('btn-swap-files');
  const origFilename = document.getElementById('orig-filename');
  const modFilename = document.getElementById('mod-filename');
  const btnSubmit = document.getElementById('btn-submit-compare');
  const statusMsg = document.getElementById('upload-status');
  const btnResetForm = document.getElementById('btn-reset-form');
  const btnCancelCompare = document.getElementById('btn-cancel-compare');
  const compareLoader = document.getElementById('compare-loader');
  const compareLoaderText = document.getElementById('compare-loader-text');
  const hdrBrandInitial = document.getElementById('hdr-brand-initial');
  const hdrBrandName = document.getElementById('hdr-brand-name');
  const hdrBrandSub = document.getElementById('hdr-brand-sub');
  const passwordToggleRow = document.getElementById('password-toggle-row-container');
  const chkPassword = document.getElementById('chk-password-protected');
  
  let currentAbortController = null;
  let enableCancelBtn = false;


  // SSO UI Elements
  const viewerSsoWall = document.getElementById('viewer-sso-wall');
  const viewerCompareCard = document.getElementById('viewer-compare-card');
  const viewerUserBadge = document.getElementById('viewer-user-badge');
  const viewerAvatar = document.getElementById('viewer-avatar');
  const viewerUserName = document.getElementById('viewer-user-name');
  const viewerUserEmail = document.getElementById('viewer-user-email');
  const btnViewerLogin = document.getElementById('btn-viewer-login');
  const btnViewerLogout = document.getElementById('btn-viewer-logout');
  const langSelector = document.getElementById('lang-selector');
  const passwordFields = document.getElementById('password-fields');
  const inputOrigPassword = document.getElementById('input-orig-password');
  const inputModPassword = document.getElementById('input-mod-password');


  // Restore branding from cache if available
  try {
    const cachedBranding = localStorage.getItem('litera_cached_branding');
    if (cachedBranding) {
      const b = JSON.parse(cachedBranding);
      if (b.brand_initial) window._vsData_brand_initial = b.brand_initial;
      if (b.brand_name) window._vsData_brand_name = b.brand_name;
      if (b.brand_sub) window._vsData_brand_sub = b.brand_sub;
    }
  } catch (e) {}

  function applyBranding() {
    const t = (k, vars, def) => {
       if (!window.LiteraI18n) return def;
       const translated = window.LiteraI18n.translate(k, vars);
       return translated === k ? def : translated;
    };
    if (hdrBrandInitial) hdrBrandInitial.textContent = t('hdr_brand_initial', {}, window._vsData_brand_initial || 'L');
    if (hdrBrandName) hdrBrandName.textContent = t('hdr_brand_name', {}, window._vsData_brand_name || 'Compare Server');
    if (hdrBrandSub) hdrBrandSub.textContent = t('hdr_brand_sub', {}, window._vsData_brand_sub || 'Enterprise Document Comparison');
  }

  async function init() {
    // 1. Synchronous pass: Apply cached translations and branding immediately before any network fetch
    if (window.LiteraI18n) {
      if (langSelector && window.LiteraI18n.buildLanguageSelector) {
        window.LiteraI18n.buildLanguageSelector(langSelector);
        langSelector.value = window.LiteraI18n.getLanguage();
      }
      window.LiteraI18n.applyTranslations();
      applyBranding();
      document.documentElement.classList.remove('i18n-loading');
    }

    // Language selector change listener
    if (langSelector && window.LiteraI18n) {
      langSelector.addEventListener('change', (e) => {
        window.LiteraI18n.setLanguage(e.target.value);
        window.LiteraI18n.applyTranslations();
        // Re-apply branding after language change (translations overwrite data-i18n elements)
        applyBranding();
        // Re-render filename boxes so drop subtitles or file cards keep proper translation or selection
        renderFilename(origFilename, origFile, 'lbl_drop_orig_sub');
        renderFilename(modFilename, modFile, 'lbl_drop_mod_sub');
        if (compareLoaderText) {
          compareLoaderText.textContent = getLoadingText();
        }
      });
    }

    // 2. Asynchronously load remote custom languages and refresh if needed
    if (window.LiteraI18n) {
      await window.LiteraI18n.init();
      if (langSelector && window.LiteraI18n.buildLanguageSelector) {
        window.LiteraI18n.buildLanguageSelector(langSelector);
        langSelector.value = window.LiteraI18n.getLanguage();
      }
      window.LiteraI18n.applyTranslations();
      applyBranding();
      document.documentElement.classList.remove('i18n-loading');
    }
    // Check cached SSO user
    try {
      const cached = localStorage.getItem('litera_sso_user');
      if (cached) {
        currentUser = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to parse cached SSO user', e);
    }

    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        config = await res.json();
      }
    } catch (e) {
      console.warn('Could not load config', e);
    }

    try {
      const addinRes = await fetch('/api/addin-settings');
      if (addinRes.ok) {
        const addinSettings = await addinRes.json();
        if (addinSettings.custom_languages) {
          try {
            if (window.LiteraI18n && window.LiteraI18n.addTranslations) {
              window.LiteraI18n.addTranslations([{
                code: 'en',
                translations: {
                  hdr_brand_logo: addinSettings.brand_logo_text || 'L',
                  hdr_brand_name: addinSettings.brand_title || 'Compare Server',
                  hdr_brand_sub: addinSettings.brand_subtitle || 'Enterprise Document Comparison'
                }
              }]);
            }
            const parsed = JSON.parse(addinSettings.custom_languages);
            if (window.LiteraI18n && window.LiteraI18n.addTranslations) {
              window.LiteraI18n.addTranslations(parsed);
            }
          } catch (e) { console.error('Failed to parse custom languages', e); }
        }
      }
    } catch (e) {}

    try {
      const ssoRes = await fetch('/api/sso/config');
      if (ssoRes.ok) {
        ssoConfig = await ssoRes.json();
      }
    } catch (e) {
      console.warn('Could not load /api/sso/config', e);
    }
    
    try {
      const vsRes = await fetch('/api/viewer-settings');
      if (vsRes.ok) {
        const vsData = await vsRes.json();
        // Store branding globally and apply (after translations so we overwrite them)
        if (vsData.brand_initial) window._vsData_brand_initial = vsData.brand_initial;
        if (vsData.brand_name) window._vsData_brand_name = vsData.brand_name;
        if (vsData.brand_sub) window._vsData_brand_sub = vsData.brand_sub;
        try {
          localStorage.setItem('litera_cached_branding', JSON.stringify({
            brand_initial: window._vsData_brand_initial,
            brand_name: window._vsData_brand_name,
            brand_sub: window._vsData_brand_sub
          }));
        } catch (e) {}
        applyBranding();
        if (vsData.enable_cancel) enableCancelBtn = true;
          
          if (vsData.show_rendering_params_on_home) {
          const advOptions = document.getElementById('advanced-options');
          if (advOptions) advOptions.style.display = 'block';
        }

        if (vsData.enable_password_fields === false) {
          const passRow = document.getElementById('password-toggle-row-container');
          if (passRow) passRow.style.display = 'none';
        }

        // Register custom loading message configured in admin panel into English dictionary
        if (vsData.loading_message && vsData.loading_message.trim()) {
          const customMsg = vsData.loading_message.trim();
          if (window.LiteraI18n && window.LiteraI18n.addTranslations) {
            window.LiteraI18n.addTranslations([{
              code: 'en',
              translations: {
                msg_uploading_files: customMsg,
                msg_uploading: customMsg
              }
            }]);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load viewer settings', e);
    }

    applySsoAuthState();
    setupEvents();
  }

  function applySsoAuthState() {
    const isSsoEnforced = ssoConfig.enabled && ssoConfig.require_login_to_compare;

    if (isSsoEnforced) {
      if (currentUser) {
        // Authenticated
        if (viewerSsoWall) viewerSsoWall.style.display = 'none';
        if (viewerCompareCard) viewerCompareCard.style.display = 'block';
        if (viewerUserBadge) {
          viewerUserBadge.style.display = 'flex';
          if (btnViewerLogout) btnViewerLogout.style.display = 'flex';
          if (viewerUserName) viewerUserName.textContent = (currentUser.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          if (viewerUserEmail) viewerUserEmail.textContent = currentUser.email || '';
          const initials = (currentUser.name || 'EU')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          if (viewerAvatar) viewerAvatar.textContent = initials;
        }
      } else {
        // Unauthorized
        if (viewerSsoWall) viewerSsoWall.style.display = 'block';
        if (viewerCompareCard) viewerCompareCard.style.display = 'none';
        if (viewerUserBadge) viewerUserBadge.style.display = 'none';
        if (btnViewerLogout) btnViewerLogout.style.display = 'none';
        if (btnViewerLogout) btnViewerLogout.style.display = 'none';
      }
    } else {
      // SSO Disabled: show compare workspace directly
      if (viewerSsoWall) viewerSsoWall.style.display = 'none';
      if (viewerCompareCard) viewerCompareCard.style.display = 'block';
        if (currentUser && viewerUserBadge) {
          viewerUserBadge.style.display = 'flex';
          if (btnViewerLogout) btnViewerLogout.style.display = 'flex';
          if (viewerUserName) viewerUserName.textContent = (currentUser.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          if (viewerUserEmail) viewerUserEmail.textContent = currentUser.email;
          if (viewerAvatar) viewerAvatar.textContent = (currentUser.name || 'U')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        } else if (viewerUserBadge) {
        viewerUserBadge.style.display = 'none';
        if (btnViewerLogout) btnViewerLogout.style.display = 'none';
      }
    }
  }

  
  function getLoadingText() {
    if (!window.LiteraI18n) return 'Uploading & comparing files';
    const tr = window.LiteraI18n.translate('msg_uploading_files');
    if (tr && tr !== 'msg_uploading_files') return tr;
    const fallback = window.LiteraI18n.translate('msg_uploading');
    if (fallback && fallback !== 'msg_uploading') return fallback;
    return 'Uploading & comparing files';
  }

  function resetUiToInitialState() {
    form.reset();
    origFile = null;
    modFile = null;
    if (inputOrig) inputOrig.value = '';
    if (inputMod) inputMod.value = '';
    renderFilename(origFilename, null, 'lbl_drop_orig_sub');
    renderFilename(modFilename, null, 'lbl_drop_mod_sub');

    if (chkPassword) {
      chkPassword.checked = false;
      chkPassword.disabled = false;
    }
    if (passwordFields) {
      passwordFields.style.display = 'none';
      passwordFields.style.pointerEvents = 'auto';
      passwordFields.style.opacity = '1';
    }
    if (passwordToggleRow) {
      passwordToggleRow.style.pointerEvents = 'auto';
      passwordToggleRow.style.opacity = '1';
    }
    if (inputOrigPassword) {
      inputOrigPassword.value = '';
      inputOrigPassword.type = 'password';
      inputOrigPassword.disabled = false;
    }
    if (inputModPassword) {
      inputModPassword.value = '';
      inputModPassword.type = 'password';
      inputModPassword.disabled = false;
    }
    document.querySelectorAll('.btn-eye').forEach(btn => {
      btn.style.color = '#64748b';
      btn.disabled = false;
    });

    if (btnSwapFiles) {
      btnSwapFiles.disabled = false;
      btnSwapFiles.style.opacity = '1';
      btnSwapFiles.style.cursor = 'pointer';
    }

    const advOptionsInput = document.getElementById('input-rendering-options');
    if (advOptionsInput) {
      advOptionsInput.value = '';
      advOptionsInput.disabled = false;
    }

    if (statusMsg) {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
      statusMsg.style.display = 'none';
    }

    if (compareLoader) compareLoader.style.display = 'none';
    if (btnCancelCompare) btnCancelCompare.style.display = 'none';

    btnSubmit.disabled = false;
    btnSubmit.style.opacity = '1';
    const t = (k) => window.LiteraI18n ? window.LiteraI18n.translate(k) : k;
    btnSubmit.innerHTML = `<span>🚀</span><span id="btn-submit-text" data-i18n="btn_run_compare" style="margin-left: 8px;">${t('btn_run_compare') || 'Run Compare'}</span>`;

    if (dropOrig) {
      dropOrig.style.pointerEvents = 'auto';
      dropOrig.style.opacity = '1';
    }
    if (dropMod) {
      dropMod.style.pointerEvents = 'auto';
      dropMod.style.opacity = '1';
    }
    if (btnResetForm) {
      btnResetForm.disabled = false;
      btnResetForm.style.opacity = '1';
      btnResetForm.style.cursor = 'pointer';
    }
  }

  function renderFilename(el, file, defaultI18nKey) {
    const t = (k) => window.LiteraI18n ? window.LiteraI18n.translate(k) : k;
    if (file) {
      el.innerHTML = `<span style="color: #1e3a8a; font-weight: 600;">${file.name}</span> <button type="button" class="btn-remove-file" style="background:none; border:none; color:#ef4444; font-size: 14px; cursor:pointer; padding: 0 5px;" title="Remove file">✖</button>`;
      const removeBtn = el.querySelector('.btn-remove-file');
      if (removeBtn) {
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          if (el.id === 'orig-filename') {
            origFile = null;
            if (inputOrig) inputOrig.value = '';
          } else {
            modFile = null;
            if (inputMod) inputMod.value = '';
          }
          el.innerHTML = `<span data-i18n="${defaultI18nKey}">${t(defaultI18nKey)}</span>`;

          // Clear passwords and status error
          if (chkPassword) chkPassword.checked = false;
          if (passwordFields) passwordFields.style.display = 'none';
          if (inputOrigPassword) inputOrigPassword.value = '';
          if (inputModPassword) inputModPassword.value = '';
          if (statusMsg) {
            statusMsg.textContent = '';
            statusMsg.className = 'status-msg';
            statusMsg.style.display = 'none';
          }

          if (!origFile && !modFile) {
            resetUiToInitialState();
          }
        };
      }
    } else {
      el.innerHTML = `<span data-i18n="${defaultI18nKey}">${t(defaultI18nKey)}</span>`;
    }
  }

  function showStatus(text, isError = false) {
    statusMsg.textContent = text;
    statusMsg.className = `status-msg ${isError ? 'status-error' : 'status-success'}`;
    statusMsg.style.display = 'block';
  }

  function setupEvents() {
    

    // SSO Login — real MSAL.js popup flow
    if (btnViewerLogin) {
      btnViewerLogin.addEventListener('click', async () => {
        if (!ssoConfig.client_id || !ssoConfig.tenant_id) {
          showStatus('Microsoft Entra SSO is not fully configured. Please contact your administrator.', true);
          return;
        }

        try {
          btnViewerLogin.disabled = true;
          btnViewerLogin.innerHTML = '<span>Signing in...</span>';

          const msalConfig = {
            auth: {
              clientId: ssoConfig.client_id,
              authority: `https://login.microsoftonline.com/${ssoConfig.tenant_id}`,
              redirectUri: ssoConfig.web_redirect_uri || window.location.origin + '/viewer/auth-callback.html',
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
          showStatus(t('msg_sso_welcome', { name: name }) || `Welcome, ${name}! Signed in via Microsoft Entra.`, false);

          // Log the login event
          logSsoEvent('login', currentUser, 'web');
        } catch (err) {
          if (err.name === 'AbortError') {
             showStatus(t('msg_compare_canceled') || 'Comparison canceled.', true);
             return;
          }

          console.error('MSAL login failed:', err);
          const msg = err && err.message
            ? (err.message.includes('user_cancelled') || err.message.includes('popup_window_error')
                ? 'Sign-in was cancelled or the popup was blocked. Please allow popups and try again.'
                : `Sign-in failed: ${err.message}`)
            : 'Sign-in failed. Please try again.';
          showStatus(msg, true);
        } finally {
        currentAbortController = null;
        if (btnResetForm) btnResetForm.disabled = false;
        document.querySelectorAll('.btn-remove-file').forEach(btn => { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; });
        if (btnCancelCompare) btnCancelCompare.style.display = 'none';

          if (btnViewerLogin) {
            btnViewerLogin.disabled = false;
            btnViewerLogin.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right:8px;">
                <path fill="#f25022" d="M1 1h10v10H1z"/>
                <path fill="#00a4ef" d="M1 12h10v10H1z"/>
                <path fill="#7fba00" d="M12 1h10v10H12z"/>
                <path fill="#ffb900" d="M12 12h10v10H12z"/>
              </svg>
              <span>Sign In with Microsoft Entra</span>`;
          }
        }
      });
    }

    // SSO Logout
    if (btnViewerLogout) {
      btnViewerLogout.addEventListener('click', () => {
        if (currentUser) {
          logSsoEvent('logout', currentUser, 'web');
        }
        currentUser = null;
        localStorage.removeItem('litera_sso_user');
        applySsoAuthState();
        showStatus('Signed out from Microsoft Entra session.', false);
      });
    }

    // Setup file selection click and drag-and-drop for drop-orig
    if (dropOrig && inputOrig) {
      dropOrig.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-file')) return;
        inputOrig.value = '';
        inputOrig.click();
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropOrig.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropOrig.classList.add('active');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropOrig.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropOrig.classList.remove('active');
        });
      });
      dropOrig.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          origFile = e.dataTransfer.files[0];
          renderFilename(origFilename, origFile, 'lbl_drop_orig_sub');
        }
      });
    }

    // Setup file selection click and drag-and-drop for drop-mod
    if (dropMod && inputMod) {
      dropMod.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-file')) return;
        inputMod.value = '';
        inputMod.click();
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropMod.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropMod.classList.add('active');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropMod.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropMod.classList.remove('active');
        });
      });
      dropMod.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          modFile = e.dataTransfer.files[0];
          renderFilename(modFilename, modFile, 'lbl_drop_mod_sub');
        }
      });
    }

    if (inputOrig) {
      inputOrig.addEventListener('click', () => {
        inputOrig.value = '';
      });
      inputOrig.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          origFile = e.target.files[0];
          renderFilename(origFilename, origFile, 'lbl_drop_orig_sub');
        }
      });
    }

    if (inputMod) {
      inputMod.addEventListener('click', () => {
        inputMod.value = '';
      });
      inputMod.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          modFile = e.target.files[0];
          renderFilename(modFilename, modFile, 'lbl_drop_mod_sub');
        }
      });
    }

    // Password toggle
    if (chkPassword && passwordFields) {
      chkPassword.addEventListener('change', (e) => {
        passwordFields.style.display = e.target.checked ? 'block' : 'none';
      });
    }

    // Password eye toggle
    document.querySelectorAll('.btn-eye').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) {
          if (input.type === 'password') {
            input.type = 'text';
            e.currentTarget.style.color = '#0284c7'; // highlight color
          } else {
            input.type = 'password';
            e.currentTarget.style.color = '#64748b'; // default color
          }
        }
      });
    });

    if (btnSwapFiles) {
      btnSwapFiles.addEventListener('click', () => {
        const tempFile = origFile;
        origFile = modFile;
        modFile = tempFile;

        renderFilename(origFilename, origFile, 'lbl_drop_orig_sub');
        renderFilename(modFilename, modFile, 'lbl_drop_mod_sub');

        if (inputOrigPassword && inputModPassword) {
          const tempPass = inputOrigPassword.value;
          inputOrigPassword.value = inputModPassword.value;
          inputModPassword.value = tempPass;
        }
      });
    }

    const t = (k) => window.LiteraI18n ? window.LiteraI18n.translate(k) : k;

    if (btnResetForm) {
      btnResetForm.addEventListener('click', resetUiToInitialState);
    }

    if (btnCancelCompare) {
      btnCancelCompare.addEventListener('click', () => {
        if (currentAbortController) {
          currentAbortController.abort();
          currentAbortController = null;
        }
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!origFile || !modFile) {
        showStatus(t('msg_select_both_files'), true);
        return;
      }

      if (ssoConfig.enabled && ssoConfig.require_login_to_compare && !currentUser) {
        showStatus(t('msg_sso_unauthorized'), true);
        applySsoAuthState();
        return;
      }

      const loadingMsg = getLoadingText();

      btnSubmit.disabled = true;
      btnSubmit.style.opacity = '0.5';
      if (dropOrig) {
        dropOrig.style.pointerEvents = 'none';
        dropOrig.style.opacity = '0.7';
      }
      if (dropMod) {
        dropMod.style.pointerEvents = 'none';
        dropMod.style.opacity = '0.7';
      }
      if (btnSwapFiles) {
        btnSwapFiles.disabled = true;
        btnSwapFiles.style.opacity = '0.5';
        btnSwapFiles.style.cursor = 'not-allowed';
      }

      // Disable password options and inputs during comparison
      if (chkPassword) {
        chkPassword.disabled = true;
      }
      if (passwordToggleRow) {
        passwordToggleRow.style.pointerEvents = 'none';
        passwordToggleRow.style.opacity = '0.5';
      }
      if (passwordFields) {
        passwordFields.style.pointerEvents = 'none';
        passwordFields.style.opacity = '0.5';
      }
      if (inputOrigPassword) inputOrigPassword.disabled = true;
      if (inputModPassword) inputModPassword.disabled = true;
      document.querySelectorAll('.btn-eye').forEach(btn => btn.disabled = true);

      const advOptionsInput = document.getElementById('input-rendering-options');
      if (advOptionsInput) advOptionsInput.disabled = true;

      if (btnResetForm) {
        btnResetForm.disabled = true;
        btnResetForm.style.opacity = '0.5';
        btnResetForm.style.cursor = 'not-allowed';
      }
      document.querySelectorAll('.btn-remove-file').forEach(btn => { 
        btn.disabled = true; 
        btn.style.opacity = '0.5'; 
        btn.style.cursor = 'not-allowed'; 
      });
      if (enableCancelBtn && btnCancelCompare) btnCancelCompare.style.display = 'inline-flex';
      
      currentAbortController = new AbortController();

      if (compareLoader) {
        if (compareLoaderText) compareLoaderText.textContent = loadingMsg;
        compareLoader.style.display = 'flex';
      }
      btnSubmit.innerHTML = `<span>⏳</span><span style="margin-left: 8px;">${t('btn_running_comparison') || 'Running comparison...'}</span>`;
      statusMsg.style.display = 'none';
      const compareStartTime = Date.now();
      let compareHttpCode = 0;

      try {
        let renderingOptions = '';

        const advOptionsInput = document.getElementById('input-rendering-options');
        if (advOptionsInput && advOptionsInput.value.trim() !== '') {
          if (renderingOptions) {
            renderingOptions += ';' + advOptionsInput.value.trim();
          } else {
            renderingOptions = advOptionsInput.value.trim();
          }
        }

        const formData = new FormData();
        formData.append('originalDocument', origFile, origFile.name || 'original.docx');
        formData.append('modifiedDocument', modFile, modFile.name || 'modified.docx');
        if (renderingOptions) formData.append('renderingOptions', renderingOptions);

        if (passwordFields && passwordFields.style.display !== 'none') {
          if (inputOrigPassword.value) formData.append('originalDocumentPassword', inputOrigPassword.value);
          if (inputModPassword.value) formData.append('modifiedDocumentPassword', inputModPassword.value);
        }

        let endpoint = config.compare_server_url || 'http://192.168.29.122/WorkshareCompareApi';
        
        // Build Curl-like request header string without passwords
        let curlStr = `'${endpoint}/api/UICompare' \\\n  -H 'accept: */*' \\\n  -H 'Content-Type: multipart/form-data'`;
        for (let [key, value] of formData.entries()) {
          if (key.toLowerCase().includes('password')) {
            curlStr += ` \\\n  -F '${key}='`;
          } else if (value instanceof File) {
            curlStr += ` \\\n  -F '${key}=@${value.name};type=${value.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}'`;
          } else {
            curlStr += ` \\\n  -F '${key}=${value}'`;
          }
        }
        const reqHeadersStr = curlStr;
        let respHeadersStr = '';

        const res = await fetch(`${endpoint}/api/UICompare`, {
          signal: currentAbortController.signal,
          method: 'POST',
          body: formData,
          redirect: 'manual' // intercept 201 Location redirect
        });

        res.headers.forEach((val, key) => { respHeadersStr += `${key}: ${val}\n`; });

        compareHttpCode = res.status || (res.type === 'opaqueredirect' ? 201 : 0);

        const lang = window.LiteraI18n ? window.LiteraI18n.getLanguage() : 'en';

        if (res.status === 201 || res.status === 200 || res.type === 'opaqueredirect') {
          const comparisonUrl = res.headers.get('Location') || res.url;
          if (chkPassword) chkPassword.checked = false;
          if (passwordFields) passwordFields.style.display = 'none';
          if (inputOrigPassword) inputOrigPassword.value = '';
          if (inputModPassword) inputModPassword.value = '';
          
          showStatus(t('msg_compare_success'), false);
          
          // Log successful comparison
          logComparisonResult(compareHttpCode || 201, origFile.name, modFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingOptions);

          const parts = comparisonUrl.split('/').filter(Boolean);
          const comparisonId = parts[parts.length - 1];

          setTimeout(() => {
            window.location.href = `viewer.html?id=${encodeURIComponent(comparisonId)}&lang=${lang}&orig=${encodeURIComponent(origFile.name)}&mod=${encodeURIComponent(modFile.name)}`;
          }, 600);
        } else if (res.status === 403) {
          if (chkPassword && !chkPassword.checked) {
            chkPassword.checked = true;
            if (passwordFields) passwordFields.style.display = 'block';
          }
          logComparisonResult(403, origFile.name, modFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingOptions);
          throw new Error(t('err_403'));
        } else if (res.status === 400) {
          logComparisonResult(400, origFile.name, modFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingOptions);
          throw new Error(t('err_400'));
        } else if (res.status === 404) {
          logComparisonResult(404, origFile.name, modFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingOptions);
          throw new Error(t('err_404'));
        } else if (res.status === 415) {
            logComparisonResult(415, origFile.name, modFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingOptions);
            throw new Error(t('err_415'));
          } else if (res.status === 422) {
          logComparisonResult(422, origFile.name, modFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingOptions);
          throw new Error(t('err_422'));
        } else if (res.status === 500) {
          logComparisonResult(500, origFile.name, modFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingOptions);
          throw new Error(t('err_500'));
        } else if (res.status === 503) {
          logComparisonResult(503, origFile.name, modFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingOptions);
          throw new Error(t('err_503'));
        } else {
          logComparisonResult(res.status, origFile.name, modFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingOptions);
          throw new Error(t('err_unknown_status', {status: res.status}) || `Server returned status ${res.status}`);
        }
      } catch (err) {
        console.error('Compare failed:', err);
        let msg = err.message;
        if (msg === 'Failed to fetch') msg = t('err_failed_to_fetch') || msg;
        // Unknown statuses are already translated in the else block above
        showStatus(msg || t('msg_compare_error'), true);
        logComparisonResult(0, origFile.name, modFile.name, Date.now() - compareStartTime, 0, reqHeadersStr, respHeadersStr, renderingOptions);
      } finally {
        if (compareLoader) compareLoader.style.display = 'none';
        if (btnCancelCompare) btnCancelCompare.style.display = 'none';
        btnSubmit.disabled = false;
        btnSubmit.style.opacity = '1';
        btnSubmit.innerHTML = `<span>🚀</span><span id="btn-submit-text" data-i18n="btn_run_compare" style="margin-left: 8px;">${t('btn_run_compare') || 'Run Compare'}</span>`;
        
        if (dropOrig) {
          dropOrig.style.pointerEvents = 'auto';
          dropOrig.style.opacity = '1';
        }
        if (dropMod) {
          dropMod.style.pointerEvents = 'auto';
          dropMod.style.opacity = '1';
        }
        if (btnSwapFiles) {
          btnSwapFiles.disabled = false;
          btnSwapFiles.style.opacity = '1';
          btnSwapFiles.style.cursor = 'pointer';
        }

        // Re-enable password options and inputs
        if (chkPassword) {
          chkPassword.disabled = false;
        }
        if (passwordToggleRow) {
          passwordToggleRow.style.pointerEvents = 'auto';
          passwordToggleRow.style.opacity = '1';
        }
        if (passwordFields) {
          passwordFields.style.pointerEvents = 'auto';
          passwordFields.style.opacity = '1';
        }
        if (inputOrigPassword) inputOrigPassword.disabled = false;
        if (inputModPassword) inputModPassword.disabled = false;
        document.querySelectorAll('.btn-eye').forEach(btn => btn.disabled = false);

        const advOptionsInput = document.getElementById('input-rendering-options');
        if (advOptionsInput) advOptionsInput.disabled = false;
        
        if (btnResetForm) {
          btnResetForm.disabled = false;
          btnResetForm.style.opacity = '1';
          btnResetForm.style.cursor = 'pointer';
        }
        document.querySelectorAll('.btn-remove-file').forEach(btn => { 
          btn.disabled = false; 
          btn.style.opacity = '1'; 
          btn.style.cursor = 'pointer'; 
        });
      }
    });
  }

  // ── Activity tracking helpers ────────────────────────────────────────────

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
    if (!code) return null;
    
    const defaultMessages = {
      400: 'Bad Request: One or more document URLs is malformed, invalid, or cannot be retrieved.',
      401: 'Unauthorized: Session is expired or revoked.',
      403: 'Forbidden: One or both documents are password protected and cannot be read.',
      404: 'Not Found: The requested resource could not be found.',
      413: 'Payload Too Large: The documents exceed the maximum allowed size.',
      415: 'Unsupported Media Type: The POST request is not a multipart media type.',
      422: 'Unprocessable Entity: Documents are corrupt, of an unsupported format, or a processing error occurred.',
      500: 'Internal Server Error: Server is incorrectly configured, unlicensed, or an unexpected error occurred.',
      503: 'Service Unavailable: The server is currently too busy to handle the request.'
    };

    const i18nKey = `err_${code}`;
    let msg = window.LiteraI18n ? window.LiteraI18n.translate(i18nKey) : i18nKey;
    
    // If the translation engine returned the raw key, fallback to default English text
    if (msg === i18nKey) {
      msg = defaultMessages[code] || `Unexpected server response: HTTP ${code}`;
    }
    return msg;
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
          source:            'web',
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

  init();
})();
