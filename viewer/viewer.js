async function init() {

  // Global interceptors to catch Deltaview's native rogue downloads (iframe, a.click, window.open)
  function interceptRogueDownload(url) {
    if (typeof url === 'string' && (url.includes('/acdownload') || url.includes('/tcdownload') || url.includes('/download'))) {
      if (!url.startsWith(window.location.origin + '/proxy')) {
        console.log('[Intercept] Caught rogue download attempt:', url);
        let type = 'docx';
        if (url.includes('acdownload')) type = 'accept_changes';
        else if (url.includes('tcdownload')) type = 'track_changes';
        downloadWithCustomName(url, generateFilename(type) || 'Document.docx', true);
        return true;
      }
    }
    return false;
  }

  const origIframeSrc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src').set;
  Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
    set: function(val) {
      if (interceptRogueDownload(val)) return;
      return origIframeSrc.call(this, val);
    }
  });

  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() {
    if (interceptRogueDownload(this.href)) return;
    return origAnchorClick.call(this);
  };
  
  const origWindowOpen = window.open;
  window.open = function(url, ...args) {
    if (interceptRogueDownload(url)) return null;
    return origWindowOpen.call(window, url, ...args);
  };

  // Auth logic
  const ssoUserJson = localStorage.getItem('litera_sso_user');
  if (ssoUserJson) {
    try {
      const currentUser = JSON.parse(ssoUserJson);
      const badge = document.getElementById('dv-user-badge');
      const logoutBtn = document.getElementById('dv-btn-logout');
      const avatar = document.getElementById('dv-avatar-initials');
      const username = document.getElementById('dv-user-name');
      
      if (badge && logoutBtn && avatar && currentUser) {
        badge.style.display = 'flex';
        logoutBtn.style.display = 'flex';
        
        
        const initials = (currentUser.name || 'UK')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        avatar.textContent = initials;
        
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('litera_sso_user');
          window.location.href = '/viewer/home.html';
        });
      }
    } catch (e) {
      console.warn('Failed to parse SSO user', e);
    }
  }

  // Fix DeltaView Toolbar Button Text Wrapping
  const style = document.createElement('style');
  style.innerHTML = `
    .Toolbar_container button span, 
      [class*="Toolbar_container"] [class*="Toolbar_label"], 
      [class*="ToolbarItem_label"] {
        white-space: normal !important;
        word-wrap: break-word !important;
        max-width: 140px !important;
        line-height: 1.2 !important;
        text-align: center;
        display: inline-block;
      }
      [class*="Toolbar_item"] {
        min-width: 110px !important;
        margin-right: 16px !important;
        flex: 0 0 auto !important;
        height: auto !important;
        min-height: 56px !important;
      }
  `;
  document.head.appendChild(style);

  const errorContainer = document.getElementById('error-container');

  function showError(msg) {
    errorContainer.textContent = msg;
    errorContainer.style.display = 'block';
  }

  // Toast notification helper
  function showToast(message, isError = false) {
    let toast = document.getElementById('dv-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'dv-toast';
      Object.assign(toast.style, {
        position: 'fixed', bottom: '20px', right: '20px', padding: '12px 24px',
        backgroundColor: '#334155', color: '#fff', borderRadius: '4px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: '9999',
        transition: 'opacity 0.3s ease', opacity: '0', pointerEvents: 'none'
      });
      document.body.appendChild(toast);
    }
    toast.style.backgroundColor = isError ? '#ef4444' : '#10b981';
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 3500);
  }

  // 1. Read URL params
  const params = new URLSearchParams(window.location.search);
  const comparisonId = params.get('id');

  // 2. Apply language to viewer UI
  let activeLang = 'en';
  if (window.LiteraI18n) {
    await window.LiteraI18n.init();
    activeLang = window.LiteraI18n.getLanguage();
    window.LiteraI18n.applyTranslations();

    const langSelector = document.getElementById('viewer-lang-selector');
    if (langSelector && window.LiteraI18n.buildLanguageSelector) {
      window.LiteraI18n.buildLanguageSelector(langSelector);
      langSelector.value = activeLang;
      langSelector.addEventListener('change', (e) => {
        window.LiteraI18n.setLanguage(e.target.value);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('lang', e.target.value);
        window.location.href = newUrl.toString();
      });
    }
  }

  if (!comparisonId) {
    showError('No comparison ID provided.');
    return;
  }

  let compareServerUrl = 'http://192.168.29.122/WorkshareCompareApi';
  try {
    const configRes = await fetch('/api/config');
    if (configRes.ok) {
      const config = await configRes.json();
      if (config.compare_server_url) compareServerUrl = config.compare_server_url;
    }
  } catch (e) {
    console.warn('Failed to load config, using default compare URL');
  }

  // Override compareServerUrl to route through our universal API proxy to bypass CORS 
  // and enable native HTML downloads
  const proxyBaseUrl = window.location.origin + '/proxy';

  let comparisonUrl = `${proxyBaseUrl}/api/Comparison/${comparisonId}`;

  // Helper to handle showCategories visibility
  let showCategories = true;
  function applyCategoryVisibility() {
    const selector = [
      "[class*='CategoryHeader_categoriesList']",
      "[class*='CategoryHeader_categoriesToggler']",
      "[class*='CategoryHeader_categoriesWrapper']",
      "[class*='CategoryHeader_category']",
      "[class*='CategoryHeader_activeCategory']"
    ].join(", ");

    const nodes = document.querySelectorAll(selector);
    nodes.forEach((el) => {
      if (showCategories) {
        el.style.removeProperty("display");
        el.style.removeProperty("visibility");
        el.style.removeProperty("opacity");
      } else {
        el.style.setProperty("display", "none", "important");
      }
    });
  }

  // 4. Fetch viewer settings (display toggles, toolbar visibility)
  
  let hasSavedComparison = false;

  let viewerSettings = {};
  try {
    const res = await fetch('/api/viewer-settings');
    if (res.ok) {
      viewerSettings = await res.json();
      if (typeof viewerSettings.show_categories !== 'undefined') {
        showCategories = viewerSettings.show_categories;
      }
    }
  } catch (e) {
    console.warn('Failed to load viewer settings, using defaults');
  }

  // 5. Inject deltaview.js script
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${proxyBaseUrl}/Content/deltaview.js`;
    script.onload = resolve;
    script.onerror = () => {
      showError(`Failed to load deltaview.js via proxy`);
      reject();
    };
    document.body.appendChild(script);
  });

  function translateStubbornText() {
    if (!window.currentDeltaViewTranslations) return;
    const t = window.currentDeltaViewTranslations;
    const changeListTitle = t.changeList?.title;
    const contentCat = t.changeListCategories?.content;
    const wordVarCat = t.changeListCategories?.wordVariations;
    const savingChangesText = t.loading?.saving_changes;
    const applyChangesError = t.errors?.apply_changes;
    const changesAppliedText = t.loading?.changes_applied;

    if (changeListTitle) {
      const allTextElements = document.querySelectorAll("h1, h2, h3, h4, span, div, p, button, a");
      allTextElements.forEach(el => {
        if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 && el.textContent.trim().toLowerCase() === 'change list') {
          el.textContent = changeListTitle;
        }
      });
    }
    
    if (savingChangesText || applyChangesError || changesAppliedText || window._suppressSuccessMessage) {
      const allTextElements = document.querySelectorAll("span, div, p");
      allTextElements.forEach(el => {
        if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
          if (savingChangesText && el.textContent.includes('Saving selected changes to new document')) {
            el.textContent = savingChangesText;
          }
          if (applyChangesError && el.textContent.includes('Unable to apply selected changes')) {
            el.textContent = applyChangesError;
          }
          if (el.textContent.includes('Changes successfully applied.')) {
            if (window._suppressSuccessMessage) {
              el.style.display = 'none'; // Hide if user cancelled save dialog
            } else if (changesAppliedText) {
              el.textContent = changesAppliedText;
            }
          }
        }
      });
    }

    if (contentCat || wordVarCat) {
      const allNodes = document.querySelectorAll("span, div, button, li, a, label, h1, h2, h3, h4, p, [class*='CategoryHeader_category'], [class*='CategoryHeader_activeCategory']");
      allNodes.forEach(n => {
        for (let i = 0; i < n.childNodes.length; i++) {
          const child = n.childNodes[i];
          if (child.nodeType === 3 && child.nodeValue) {
            if (contentCat && /\bcontent\b/i.test(child.nodeValue)) {
              child.nodeValue = child.nodeValue.replace(/\bcontent\b/i, contentCat);
            }
            if (wordVarCat && /\bword variations?\b/i.test(child.nodeValue)) {
              child.nodeValue = child.nodeValue.replace(/\bword variations?\b/i, wordVarCat);
            }
          }
        }
      });
    }
  }

  const getComparisonDownloadUrl = async (format) => {
    if (format === 'track_changes') {
      const createTcUrl = `${comparisonUrl}/tccreate`;
      const response = await fetch(createTcUrl, { method: 'POST' });
      if (response.status === 201) return response.headers.get('location');
      throw new Error(`Server returned ${response.status} during tccreate`);
    } else {
      const prepareUrl = `${comparisonUrl}/prepareDownload?format=${format}`;
      const response = await fetch(prepareUrl, { method: 'GET' });
      if (response.ok) { 
        let downloadUrl = `${comparisonUrl}/download`;
        if (format !== 'pdf' && format !== 'changedPagesPdf') downloadUrl += `?format=${format}`;
        return downloadUrl;
      }
      throw new Error(`Server returned ${response.status} during prepareDownload`);
    }
  };

  // Setup DOM observer for categories visibility and intercepting Deltaview buttons
  function installDomObserver() {
    const deltaviewRoot = document.getElementById('deltaview-container');
    if (!deltaviewRoot) return;
    const observer = new MutationObserver(() => { 
      applyCategoryVisibility(); 
      translateStubbornText();
      
      // Hook print button
      const printBtn = document.querySelector('#btnPrint, [class*="Toolbar_item"] [class*="icon-print"], button[title*="Print"]');
      if (printBtn && !printBtn.dataset.printHooked) {
        printBtn.dataset.printHooked = "true";
        printBtn.addEventListener('click', () => { hasSavedComparison = true; });
      }

      // Hook download buttons to override Deltaview's native download logic
      const downloadButtons = [
        { key: 'pdf', selectors: ['#btnPDF', '[class*="icon-pdf"]', '[title*="pdf" i]'], format: 'pdf' },
        { key: 'docx', selectors: ['#btnDOCX', '[class*="icon-docx"]', '[title*="docx" i]', '[title*="word" i]'], format: 'docx' },
        { key: 'track_changes', selectors: ['#btnTrackedChanges', '[class*="icon-tracked"]', '[class*="icon-track_changes"]', '[title*="track" i]', '[title*="changes" i]'], format: 'track_changes' },
        { key: 'changedPagesPdf', selectors: ['#btnchangedPagesPdf', '[class*="icon-changedPagesPdf"]', '[title*="pages" i]'], format: 'changedPagesPdf' }
      ];

      downloadButtons.forEach(btnInfo => {
        const query = btnInfo.selectors.join(', ');
        const nodes = document.querySelectorAll(query);
        nodes.forEach(iconNode => {
          const btn = iconNode.closest('button') || iconNode.closest('a') || iconNode;
          if (!btn.dataset.dlHooked) {
            btn.dataset.dlHooked = "true";
            
            const interceptHandler = async (e) => {
              // Intercept early to stop Deltaview's internal behavior (whether they use click, mousedown, etc.)
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              
              if (e.type !== 'click') return; // Only process the action on actual click, but we still blocked the other events from reaching Deltaview
              
              hasSavedComparison = true;
              showToast(window.currentDeltaViewTranslations?.msg_prep_download || 'Preparing download...');
              
              try {
                const targetUrl = await getComparisonDownloadUrl(btnInfo.format);
                const suggestedName = generateFilename(btnInfo.key);
                await downloadWithCustomName(targetUrl, suggestedName, true);
              } catch (err) {
                console.error('Download intercept failed:', err);
                showToast(window.currentDeltaViewTranslations?.msg_download_failed || 'Failed to prepare document.', true);
              }
            };
            
            btn.addEventListener('click', interceptHandler, true);
            btn.addEventListener('mousedown', interceptHandler, true);
            btn.addEventListener('pointerdown', interceptHandler, true);
          }
        });
      });
    });
    observer.observe(deltaviewRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden", "aria-hidden"]
    });
  }
  installDomObserver();
  setInterval(applyCategoryVisibility, 500);

  // 6. Build deltaview options from viewer settings
  const origNameParam = params.get('orig') || 'Original';
  const modNameParam = params.get('mod') || 'Modified';

  function generateFilename(type) {
    if (viewerSettings.enable_name_templates === false) return null;
    const nameTemplate = viewerSettings.name_template || '{prefix}{original} and {modified}';
    let namePrefixes = viewerSettings.name_prefixes;
    if (typeof namePrefixes === 'string') {
      try { namePrefixes = JSON.parse(namePrefixes); } catch (e) {}
    }
    if (!namePrefixes || typeof namePrefixes !== 'object') {
      namePrefixes = {};
    }
    const defaultPrefixes = { pdf: 'Redline - ', docx: 'Redline - ', track_changes: 'Track Changes - ', accept_changes: 'Accepted Changes - ', changedPagesPdf: 'Redline Pages - ' };
    const prefix = namePrefixes[type] || defaultPrefixes[type] || namePrefixes['default'] || '';
    
    let result = nameTemplate.replace('{prefix}', prefix)
                             .replace('{original}', origNameParam.replace(/\.[^/.]+$/, ""))
                             .replace('{modified}', modNameParam.replace(/\.[^/.]+$/, ""));
    
    if (type === 'pdf' || type === 'changedPagesPdf') result += '.pdf';
    if (type === 'docx' || type === 'track_changes' || type === 'accept_changes') result += '.docx';
    return result;
  }

  async function downloadWithCustomName(url, defaultFilename, disableFallbackNav = false) {
    if (!defaultFilename) {
      console.log('[Download] No filename provided, using direct navigation');
      if (!disableFallbackNav) window.location.href = url;
      return false;
    }
    
    // Parse the API URL to see if it's already using the proxy
    let finalUrl = url;
    if (url && !url.startsWith(window.location.origin + '/proxy')) {
      try {
        if (url.startsWith('blob:')) {
          finalUrl = url;
        } else {
          const u = new URL(url);
          let path = u.pathname;
          // Strip any backend-specific base path (e.g. /worksharecompareapi)
          const apiIdx = path.indexOf('/api/Comparison');
          if (apiIdx !== -1) {
            path = path.substring(apiIdx);
          }
          finalUrl = proxyBaseUrl + path + u.search;
        }
      } catch(e) {}
    }

    // Always show the save dialog; editability depends on the admin setting
    const canEdit = !!viewerSettings.allow_user_edit_filename;
    const dvLanguage = window.currentDeltaViewTranslations || {};
    const finalName = await showSaveDialog(
      defaultFilename,
      canEdit,
      viewerSettings.enable_save_as_dialog,
      dvLanguage,
      finalUrl
    );
      
    if (finalName === '__HANDLED_INTERNALLY__') {
      return true; // The native picker already saved the file
    }
      
    if (!finalName) {
      console.log('[Download] User cancelled save dialog');
      return false;
    }
  
    showToast(dvLanguage.msg_downloading || 'Downloading document...');

    const separator = finalUrl.includes('?') ? '&' : '?';
    const downloadUrl = finalUrl + separator + 'filename=' + encodeURIComponent(finalName);
    
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = objectUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(objectUrl);
      }, 100);
      
      showToast(dvLanguage.msg_download_complete || 'Download complete');
    } catch(err) {
      console.error('Blob download failed:', err);
      // Fallback to location.href if fetch fails (e.g. cross-origin issues)
      window.location.href = downloadUrl;
    }
    
    return true;
  }

  function showSaveDialog(defaultName, canEditName, enableFolderPicker, t, downloadUrl) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '99999', display: 'flex',
        alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)'
      });

      const modal = document.createElement('div');
      Object.assign(modal.style, {
        backgroundColor: '#fff', borderRadius: '8px', padding: '24px',
        width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        fontFamily: 'sans-serif'
      });

      const title = document.createElement('h3');
      title.textContent = t.dlg_save_file || 'Save File';
      Object.assign(title.style, { marginTop: '0', marginBottom: '16px', fontSize: '18px', color: '#1e293b' });

      const inputLabel = document.createElement('label');
      inputLabel.textContent = t.lbl_file_name || 'File Name';
      Object.assign(inputLabel.style, { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' });

      const input = document.createElement('input');
      input.type = 'text';
      input.value = defaultName;
      input.readOnly = !canEditName;
      Object.assign(input.style, {
        width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1',
        borderRadius: '4px', fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box',
        backgroundColor: canEditName ? '#fff' : '#f1f5f9',
        color: canEditName ? '#1e293b' : '#64748b',
        cursor: canEditName ? 'text' : 'default'
      });

      const btnContainer = document.createElement('div');
      Object.assign(btnContainer.style, { display: 'flex', justifyContent: 'flex-end', gap: '10px' });

      let folderBtn;
      
      if (enableFolderPicker && window.showSaveFilePicker) {
        folderBtn = document.createElement('button');
        folderBtn.textContent = t.btn_choose_folder || 'Choose Folder...';
        Object.assign(folderBtn.style, {
          padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1',
          borderRadius: '4px', cursor: 'pointer', fontSize: '14px', color: '#334155', marginRight: 'auto'
        });
        folderBtn.onclick = async () => {
          try {
            let currentName = (canEditName ? input.value.trim() : defaultName) || defaultName;
            
            let fileTypes = [];
            if (currentName.toLowerCase().endsWith('.pdf')) {
              fileTypes.push({ description: 'PDF Document (*.pdf)', accept: { 'application/pdf': ['.pdf'] } });
            } else if (currentName.toLowerCase().endsWith('.docx')) {
              fileTypes.push({ description: 'Word Document (*.docx)', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } });
            }
            
            // This opens the native OS "Save As" window, allowing them to pick the folder AND rename the file!
            const fileHandle = await window.showSaveFilePicker({
              suggestedName: currentName,
              types: fileTypes.length > 0 ? fileTypes : undefined
            });
            
            let finalName = fileHandle.name; // Get the name they ultimately typed in the native window
            overlay.remove();
            showToast(t.msg_preparing_doc || 'Preparing document...');
            
            const separator = downloadUrl.includes('?') ? '&' : '?';
            const proxyFetchUrl = downloadUrl + separator + 'filename=' + encodeURIComponent(finalName);
            const resp = await fetch(proxyFetchUrl);
            if(!resp.ok) throw new Error('Network response was not ok');
            const blob = await resp.blob();
            
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            showToast(t.msg_download_complete || 'Download complete');
            resolve('__HANDLED_INTERNALLY__');
          } catch(e) {
            console.error(e);
            if (e.name !== 'AbortError') {
              showToast(t.msg_download_failed || 'Failed to save document.', true);
            }
          }
        };
        btnContainer.appendChild(folderBtn);
      }

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = (t.SummaryAI?.cancelSummaryButton) || 'Cancel';
      Object.assign(cancelBtn.style, {
        padding: '8px 16px', backgroundColor: 'transparent', border: 'none',
        cursor: 'pointer', fontSize: '14px', color: '#64748b'
      });

      const saveBtn = document.createElement('button');
      saveBtn.textContent = t.btn_download || 'Download';
      Object.assign(saveBtn.style, {
        padding: '8px 16px', backgroundColor: '#2563eb', border: 'none',
        borderRadius: '4px', cursor: 'pointer', fontSize: '14px', color: '#fff', fontWeight: 'bold'
      });

      cancelBtn.onclick = () => { overlay.remove(); resolve(null); };
      saveBtn.onclick = async () => {
        let finalName = (canEditName ? input.value.trim() : defaultName) || defaultName;
        overlay.remove();
        resolve(finalName);
      };

      btnContainer.appendChild(cancelBtn);
      btnContainer.appendChild(saveBtn);

      modal.appendChild(title);
      modal.appendChild(inputLabel);
      modal.appendChild(input);
      modal.appendChild(btnContainer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      if (canEditName) {
        input.focus();
        const dotIdx = input.value.lastIndexOf('.');
        if (dotIdx > 0) input.setSelectionRange(0, dotIdx);
        else input.select();
      }
    });
  }

  const displayOptions = {
    toolbar: viewerSettings.show_toolbar !== false,
    statistics: viewerSettings.show_statistics !== false,
    redline: viewerSettings.show_redline !== false,
    changeSummary: viewerSettings.show_changelist !== false,
    about: true
  };

  const homeButtons = {
    pdf: { 
      display: viewerSettings.toolbar_show_pdf !== false,
      action: function(url) {
        hasSavedComparison = true;
        downloadWithCustomName(url, generateFilename('pdf'));
      }
    },
    docx: { 
      display: viewerSettings.toolbar_show_docx !== false,
      action: function(url) {
        hasSavedComparison = true;
        downloadWithCustomName(url, generateFilename('docx'));
      }
    },
    tracked: { 
      display: viewerSettings.toolbar_show_tracked !== false,
      action: function(url) {
        hasSavedComparison = true;
        downloadWithCustomName(url, generateFilename('track_changes'));
      }
    },
    changedPagesPdf: { 
      display: viewerSettings.toolbar_show_changed_pages !== false,
      action: function(url) {
        hasSavedComparison = true;
        downloadWithCustomName(url, generateFilename('changedPagesPdf'));
      }
    },
    print: { display: viewerSettings.toolbar_show_print !== false },
    next: { display: viewerSettings.toolbar_show_nav_arrows !== false },
    previous: { display: viewerSettings.toolbar_show_nav_arrows !== false },
  };

  const options = {
    deltaviewId: 'deltaview-container',
    display: displayOptions,
    homeButtons,
    acceptChanges: { 
      enabled: viewerSettings.accept_changes_enabled !== false,
      success: async function(url, callback) {
        hasSavedComparison = true;
        window._suppressSuccessMessage = false;
        try {
          const success = await downloadWithCustomName(url, generateFilename('accept_changes') || 'Accepted_Changes.docx');
          if (!success) {
            window._suppressSuccessMessage = true;
          }
        } catch(e) {
          console.error(e);
        }
        if (callback) callback();
      },
      error: function(status, statusText, callback) {
        showToast((window.currentDeltaViewTranslations?.msg_download_failed || 'Error applying accepted changes:') + ' ' + statusText, true);
        if (callback) callback();
      }
    }
  };

  function getDeltaViewLanguage(langCode) {
    const builtInMap = { en: 'english', it: 'italian', fr: 'french', es: 'spanish', zh: 'mandarin' };
    let baseLang = window.deltaview?.languages?.english || {};
    
    if (builtInMap[langCode] && window.deltaview?.languages?.[builtInMap[langCode]]) {
      baseLang = window.deltaview.languages[builtInMap[langCode]];
    }

    
    const builtInTranslationsMap = {}; if (builtInTranslationsMap[langCode]) {
        baseLang = {
          ...baseLang,
          ...builtInTranslationsMap[langCode],
          toolbar: { ...(baseLang.toolbar || {}), ...(builtInTranslationsMap[langCode].toolbar || {}) },
          changeList: { ...(baseLang.changeList || {}), ...(builtInTranslationsMap[langCode].changeList || {}) },
          loading: { ...(baseLang.loading || {}), ...(builtInTranslationsMap[langCode].loading || {}) }
        };
      }
  
    
    // Merge any custom overrides provided by admin
    if (window.LiteraDeltaViewLanguages && window.LiteraDeltaViewLanguages[langCode]) {
      const customOverride = window.LiteraDeltaViewLanguages[langCode];
      const merged = {
        ...baseLang,
        ...customOverride,
        toolbar: { ...(baseLang.toolbar || {}), ...(customOverride.toolbar || {}) },
        changeList: { ...(baseLang.changeList || {}), ...(customOverride.changeList || {}) },
        changeListCategories: { ...(baseLang.changeListCategories || {}), ...(customOverride.changeListCategories || {}) },
        loading: { ...(baseLang.loading || {}), ...(customOverride.loading || {}) },
        errors: { ...(baseLang.errors || {}), ...(customOverride.errors || {}) },
        SummaryAI: { ...(baseLang.SummaryAI || {}), ...(customOverride.SummaryAI || {}) }
      };
      
      // Alias mapping for keys that are frequently undocumented or misnamed in the sample
      if (merged.changeListCategories) {
        if (merged.changeListCategories.content && !merged.changeListCategories.text) {
          merged.changeListCategories.text = merged.changeListCategories.content;
          merged.changeListCategories.Text = merged.changeListCategories.content;
        }
        if (merged.changeListCategories.wordVariations && !merged.changeListCategories.wordVariation) {
          merged.changeListCategories.wordVariation = merged.changeListCategories.wordVariations;
          merged.changeListCategories.wordvariations = merged.changeListCategories.wordVariations;
        }
      }
      if (merged.changeList && merged.changeList.title) {
        merged.changeList.header = merged.changeList.title;
        merged.changeListTitle = merged.changeList.title;
        if (!merged.changeSummary) merged.changeSummary = {};
        merged.changeSummary.title = merged.changeList.title;
        merged.changeSummary.header = merged.changeList.title;
      }
      
      window.currentDeltaViewTranslations = merged;
      return merged;
    }
    
    window.currentDeltaViewTranslations = baseLang;
    return baseLang;
  }

  const dvLanguage = getDeltaViewLanguage(activeLang);

  // 8. Init and render
  if (window.deltaview && window.deltaview.init) {
    window.deltaview.init(options, dvLanguage);
    window.deltaview.render(comparisonUrl);

    // Setup observer to fix hardcoded "Accept selected changes" button
    const acceptText = dvLanguage?.changeList?.acceptSelectedChanges || 'Accept selected changes';
    if (acceptText !== 'Accept selected changes') {
      const observer = new MutationObserver((mutations) => {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent.trim() === 'Accept selected changes') {
            btn.textContent = acceptText;
          }
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

  } else {
    showError('DeltaView initialization failed: window.deltaview.init is not available.');
  }


  // Setup Save Prompt Modal
  const txtNewComp = window.LiteraI18n ? (window.LiteraI18n.translate('lbl_new_comp_title') || 'New Comparison') : 'New Comparison';
  const txtSavePrompt = window.LiteraI18n ? (window.LiteraI18n.translate('msg_save_prompt') || 'Do you want to save the current comparison before starting a new one?') : 'Do you want to save the current comparison before starting a new one?';
  const txtCancel = window.LiteraI18n ? (window.LiteraI18n.translate('btn_cancel') || 'Cancel') : 'Cancel';
  const txtIgnoreCont = window.LiteraI18n ? (window.LiteraI18n.translate('btn_ignore_continue') || 'Ignore and Continue') : 'Ignore and Continue';
  const txtSave = window.LiteraI18n ? (window.LiteraI18n.translate('btn_save') || 'Save') : 'Save';

  const modalHtml = `
    <div id="dv-save-prompt-modal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.6); z-index:10000; align-items:center; justify-content:center; backdrop-filter:blur(2px);">
      <div style="background:#fff; border-radius:10px; padding:28px; max-width:440px; width:90%; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <h3 style="margin-top:0; color:#1e3a8a; font-family:sans-serif; font-size:19px; font-weight:600; margin-bottom:12px;">${txtNewComp}</h3>
        <p style="color:#475569; font-family:sans-serif; font-size:14px; margin-bottom:28px; line-height:1.6;">${txtSavePrompt}</p>
        <div style="display:flex; justify-content:flex-end; gap:12px; align-items:center;">
          <button id="dv-save-prompt-cancel" style="padding:8px 16px; border-radius:6px; background:transparent; border:1px solid transparent; color:#64748b; cursor:pointer; font-weight:500; font-size:14px; transition:color 0.2s;">${txtCancel}</button>
          <button id="dv-save-prompt-continue" style="padding:8px 16px; border-radius:6px; background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; cursor:pointer; font-weight:500; font-size:14px; transition:background 0.2s;">${txtIgnoreCont}</button>
          <button id="dv-save-prompt-save" style="padding:8px 18px; border-radius:6px; background:#1e3a8a; border:none; color:#fff; cursor:pointer; font-weight:600; font-size:14px; box-shadow:0 1px 3px rgba(30,58,138,0.3); transition:background 0.2s;">${txtSave}</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const saveModal = document.getElementById('dv-save-prompt-modal');
  document.getElementById('dv-save-prompt-cancel').addEventListener('click', () => { saveModal.style.display = 'none'; });
  document.getElementById('dv-save-prompt-continue').addEventListener('click', () => { window.location.href = '/viewer/home.html'; });
  document.getElementById('dv-save-prompt-save').addEventListener('click', async () => {
    saveModal.style.display = 'none';
    const fn = generateFilename('pdf') || 'Comparison.pdf';
    console.log('[AutoSave] Save+Continue clicked. Filename:', fn);
    try {
      showToast('Preparing document...');
      const prepareUrl = comparisonUrl + '/prepareDownload?format=pdf';
      const prepRes = await fetch(prepareUrl);
      if (!prepRes.ok) throw new Error('Prepare failed');
      const pdfUrl = comparisonUrl + '/download';
      const success = await downloadWithCustomName(pdfUrl, fn, true);
      console.log('[AutoSave] Download result:', success);
    } catch (e) {
      console.error('[AutoSave] Failed', e);
      showToast('Failed to save document.', true);
    }
    // Give browser time to initiate the download before navigating
    setTimeout(() => { window.location.href = '/viewer/home.html'; }, 1500);
  });

  // Add "New Comparison" Button if enabled
  if (viewerSettings.enable_new_comparison_btn !== false) {
    const langBar = document.getElementById('viewer-controls-bar');
    if (langBar) {
      const newCompBtn = document.createElement('button');
      newCompBtn.textContent = window.LiteraI18n ? (window.LiteraI18n.translate('btn_new_comparison') || 'New Comparison') : 'New Comparison';
      newCompBtn.style.cssText = 'margin-right:12px; padding:6px 14px; border-radius:6px; background:#1e3a8a; color:#fff; border:none; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 1px 3px rgba(30,58,138,0.3); vertical-align: middle; transition:background 0.2s;';
      newCompBtn.addEventListener('click', async () => {
        const target = viewerSettings.new_comparison_target || 'same_tab';
        if (target === 'new_tab') {
          window.open('/viewer/home.html', '_blank');
        } else {
          const promptEnabled = viewerSettings.enable_save_prompt !== false;
          console.log('[NewComparison] Clicked. save_prompt:', promptEnabled, 'hasSaved:', hasSavedComparison);
          if (promptEnabled && !hasSavedComparison) {
            // Show save prompt modal
            saveModal.style.display = 'flex';
          } else if (!promptEnabled && !hasSavedComparison) {
            // Auto-save then navigate
            const fn = generateFilename('pdf') || 'Comparison.pdf';
            console.log('[AutoSave] Auto-saving before new comparison. File:', fn);
            try {
              showToast('Preparing document...');
              const prepareUrl = comparisonUrl + '/prepareDownload?format=pdf';
              const prepRes = await fetch(prepareUrl);
              if (prepRes.ok) {
                const pdfUrl = comparisonUrl + '/download';
                await downloadWithCustomName(pdfUrl, fn, true);
              }
            } catch(e) {}
            setTimeout(() => { window.location.href = '/viewer/home.html'; }, 1500);
          } else {
            // Already saved, just navigate
            window.location.href = '/viewer/home.html';
          }
        }
      });
      langBar.insertBefore(newCompBtn, langBar.firstChild);
    }
  }

}

init();
