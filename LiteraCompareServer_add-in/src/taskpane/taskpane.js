Office.onReady(async function () {
  'use strict';

  const apiEndpoint = 'http://localhost/WorkshareCompareApi/api/uicompare';

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
      const response = await fetch('/src/taskpane/settings.html', { cache: 'no-store' });
      if (response.ok) {
        mount.innerHTML = await response.text();
      }
    } catch (e) {}
  };

  const initElements = () => {
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
  };

  // Reusable icon strings
  const docIcon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23616161'%3E%3Cpath d='M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414c0-.53-.21-1.04-.586-1.414l-3.414-3.414A2 2 0 0010.586 2H6zm4.5 1.5V7a.5.5 0 00.5.5h3.5L10.5 3.5z'/%3E%3Cpath d='M10 14.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-2.15-1.85a.5.5 0 0 0-.7 0L4.5 15.29l-.65-.64a.5.5 0 0 0-.7.7l1 1c.2.2.5.2.7 0l3-3a.5.5 0 0 0 0-.7z'/%3E%3C/svg%3E`;
  const folderIcon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23616161'%3E%3Cpath d='M2 5.5A2.5 2.5 0 014.5 3h2.646c.398 0 .78.158 1.06.44l1.086 1.085c.14.14.332.22.53.225h5.678A2.5 2.5 0 0118 7.25v7.25A2.5 2.5 0 0115.5 17H4.5A2.5 2.5 0 012 14.5V5.5z'/%3E%3Cpath d='M13.85 11.15a.5.5 0 0 0-.7-.7l-2.65 2.65V7.5a.5.5 0 0 0-1 0v5.6l-2.65-2.65a.5.5 0 0 0-.7.7l3.5 3.5a.5.5 0 0 0 .7 0l3.5-3.5z'/%3E%3C/svg%3E`;
  const clearIcon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath d='M4.854 4.146a.5.5 0 10-.708.708L8.293 9l-4.147 4.146a.5.5 0 00.708.708L9 9.707l4.146 4.147a.5.5 0 00.708-.708L9.707 9l4.147-4.146a.5.5 0 00-.708-.708L9 8.293 4.854 4.146z'/%3E%3C/svg%3E`;

  const setResult = (text, isError, isWarning = false) => {
    let color = '#333';
    if (isError) color = '#c50f1f';
    else if (isWarning) color = '#975a16'; 
    statusWrap.innerHTML = `<div style="color: ${color}; font-weight: ${isWarning ? '600' : '500'}">${text}</div>`;
  };

  const setResultHtml = (html, isError, isWarning = false) => {
    let color = '#333';
    if (isError) color = '#c50f1f';
    else if (isWarning) color = '#975a16';
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
    return `Saved to ${escapeHtml(label)}`;
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
  initElements();

  const updateCompareButton = () => {
    const canCompare = originalFile && modifiedFile;
    btnCompare.disabled = !canCompare || isComparing;

    if (canCompare && originalFile.name === modifiedFile.name) {
        setResult('Note: Both selected files have the same name. You can still compare them.', false, true);
    } else {
        if (statusWrap.innerText.includes('same name')) {
            setResult('', false);
        }
    }
  };

  const setCompareInProgress = (inProgress) => {
    isComparing = inProgress;
    const showCancel = settings.enableCancelCompare !== false;
    btnCancelCompare.style.display = inProgress && showCancel ? 'inline-flex' : 'none';
    updateCompareButton();
  };

  const updateSectionUI = (section) => {
    const contentDiv = document.getElementById(section + '-content');
    const file = section === 'original' ? originalFile : modifiedFile;
    const source = section === 'original' ? originalSource : modifiedSource;

    if (file) {
        contentDiv.innerHTML = `
            <div class="file-row">
                <img width="16" height="16" src="${docIcon}" alt="" />
                <span class="fname">${file.name}</span>
                <button class="clear-btn" data-section="${section}" aria-label="Clear selection" data-hint="Clear selection"><img src="${clearIcon}" style="width:12px;height:12px;"/></button>
            </div>
        `;
    } else {
        contentDiv.innerHTML = `
            <div class="source-list">
                <button class="source-btn" data-action="current" data-section="${section}" type="button" data-hint="Use the current document">
                    <img width="16" height="16" src="${docIcon}" alt="" />
                    Current Document
                </button>
                <button class="source-btn" data-action="browse" data-section="${section}" type="button" data-hint="Choose a file from your device">
                    <img width="16" height="16" src="${folderIcon}" alt="" />
                    Local device
                </button>
            </div>
        `;
    }

    applyHints();
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
    defaultSaveFolderInput.placeholder = fsSupported ? 'Not set' : 'Not supported';
    defaultSaveFolderInput.value = settings.defaultSaveFolderLabel || '';
    const showInDownloads = settings.showInDownloadList === true;
    showInDownloadListInput.checked = showInDownloads;
    showInDownloadListInput.disabled = false;
    showInDownloadListInput.removeAttribute('disabled');
    const disableDefaultFolder = showInDownloads;
    defaultSaveFolderInput.disabled = disableDefaultFolder;
    btnChooseSaveFolder.disabled = !fsSupported || disableDefaultFolder;
    btnClearSaveFolder.disabled = !fsSupported || disableDefaultFolder || !settings.defaultSaveFolderLabel;
    showPathAfterActionInput.checked = settings.showPathAfterAction !== false;
    rememberLastFolderInput.checked = settings.rememberLastFolder === true;
    rememberLastFolderInput.disabled = !filePickerSupported;
    enableCancelCompareInput.checked = settings.enableCancelCompare !== false;
    settingsSaveCheckboxes.forEach(cb => {
      cb.checked = settings.showSaveOptions.includes(cb.getAttribute('data-save-option'));
      cb.disabled = true; // Admin controlled
    });
    settingsEmailCheckboxes.forEach(cb => {
      cb.checked = settings.showEmailOptions.includes(cb.getAttribute('data-email-option'));
      cb.disabled = true; // Admin controlled
    });
    settingsEmailDefaultCheckboxes.forEach(cb => {
      cb.checked = settings.defaultEmailChecked.includes(cb.getAttribute('data-email-default'));
    });
    const lockNameFormatting = settings.lockNameFormatting === true;
    const lockEmailSubject = settings.lockEmailSubject === true;

    prefixPdfInput.value = settings.namePrefixes.pdf || '';
    prefixDocxInput.value = settings.namePrefixes.docx || '';
    prefixTrackInput.value = settings.namePrefixes.track_changes || '';
    prefixPagesInput.value = settings.namePrefixes.changedPagesPdf || '';
    nameTemplateInput.value = settings.nameTemplate || '';
    emailSubjectTemplateInput.value = settings.emailSubjectTemplate || '';

    prefixPdfInput.disabled = lockNameFormatting;
    prefixDocxInput.disabled = lockNameFormatting;
    prefixTrackInput.disabled = lockNameFormatting;
    prefixPagesInput.disabled = lockNameFormatting;
    nameTemplateInput.disabled = lockNameFormatting;
    emailSubjectTemplateInput.disabled = lockEmailSubject;
    enableHintsInput.checked = settings.enableHints !== false;
  };

  const applyHints = () => {
    const enable = settings.enableHints !== false;
    document.querySelectorAll('[data-hint]').forEach(el => {
      if (enable) {
        el.setAttribute('title', el.getAttribute('data-hint') || '');
      } else {
        el.removeAttribute('title');
      }
    });
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
      btnSavePrimary.textContent = 'Save';
      btnSavePrimary.setAttribute('data-hint', hintMap[currentSavePrimaryFormat] || 'Save file');
      btnSavePrimary.disabled = false;
      btnSaveToggle.disabled = false;
    } else {
      btnSavePrimary.textContent = 'Save';
      btnSavePrimary.setAttribute('data-hint', 'Save file');
      btnSavePrimary.disabled = true;
      btnSaveToggle.disabled = true;
    }

    applyHints();
  };

  const loadSettings = async () => {
    settings = await settingsStore.load();
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
    applySettingsToUI();
    populateSettingsForm();
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

      const [fileHandle] = await window.showOpenFilePicker(options);
      if (!fileHandle) return;
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
      setResult('Unable to open file: ' + (e.message || e), true);
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
    setResult(`Loading ${section} document from Word...`, false);
    
    Office.context.document.getFileAsync(Office.FileType.Compressed, async (result) => {
      if (result.status !== Office.AsyncResultStatus.Succeeded) {
        setResult('Error getting file: ' + result.error.message, true);
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
        setResult('Error processing file: ' + error.message, true);
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

    const formData = new FormData();
    formData.append('file1', originalFile, originalFile.name || 'original.docx');
    formData.append('file2', modifiedFile, modifiedFile.name || 'modified.docx');

    setResult('Comparing documents...', false);
    compareAbortController = new AbortController();
    setCompareInProgress(true);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
        signal: compareAbortController.signal
      });

      if (response.status === 201) {
        const location = response.headers.get('location');
        if (!location) throw new Error('201 response received but Location header is missing.');
        
        comparisonUrl = location;
        
        resultActions.style.display = 'grid';
        setResult('Comparison completed successfully!', false);
      } else {
        const text = await response.text();
        throw new Error(`Server returned ${response.status}: ${text}`);
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        setResult('Comparison canceled.', false, true);
      } else {
        setResult('Comparison failed: ' + err.message, true);
      }
      resultActions.style.display = 'none';
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

  btnView.addEventListener('click', function () {
    if (!comparisonUrl) return;
    Office.context.ui.openBrowserWindow(comparisonUrl);
  });

  // Manage Dropdowns Click logic
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.dd-wrap')) {
      document.querySelectorAll('.dd-menu').forEach(menu => menu.classList.remove('open'));
    }
    if (settingsOverlay.classList.contains('open') && !e.target.closest('.settings-panel') && !e.target.closest('#btn-settings')) {
      settingsOverlay.classList.remove('open');
      settingsOverlay.setAttribute('aria-hidden', 'true');
    }
  });

  // Stop checkbox menu from closing when interacting inside
  emailMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  btnSaveToggle.addEventListener('click', (e) => {
    e.stopPropagation(); 
    emailMenu.classList.remove('open');
    ddMenu.classList.toggle('open');
  });

  btnEmailToggle.addEventListener('click', (e) => {
    e.stopPropagation(); 
    ddMenu.classList.remove('open');
    emailMenu.classList.toggle('open');
  });

  btnSettings.addEventListener('click', () => {
    populateSettingsForm();
    settingsOverlay.classList.add('open');
    settingsOverlay.setAttribute('aria-hidden', 'false');
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsOverlay.classList.remove('open');
    settingsOverlay.setAttribute('aria-hidden', 'true');
  });

  btnResetSettings.addEventListener('click', async () => {
    settingsConfirm.style.display = 'inline-flex';
    btnResetSettings.style.display = 'none';
    btnSaveSettings.style.display = 'none';
  });

  btnCancelReset.addEventListener('click', () => {
    settingsConfirm.style.display = 'none';
    btnResetSettings.style.display = '';
    btnSaveSettings.style.display = '';
  });

  btnConfirmReset.addEventListener('click', async () => {
    settings = await settingsStore.reset();
    await clearDefaultFolderHandle();
    defaultSaveFolderHandle = null;
    settings.defaultSaveFolderLabel = '';
    applySettingsToUI();
    populateSettingsForm();
    settingsOverlay.classList.remove('open');
    settingsOverlay.setAttribute('aria-hidden', 'true');
    settingsConfirm.style.display = 'none';
    btnResetSettings.style.display = '';
    btnSaveSettings.style.display = '';
  });

  btnChooseSaveFolder.addEventListener('click', async () => {
    if (!supportsFileSystemAccess()) {
      setResult('Default save folder is not supported in this environment.', true);
      return;
    }
    try {
      const handle = await window.showDirectoryPicker();
      if (!handle) return;
      defaultSaveFolderHandle = handle;
      settings.defaultSaveFolderLabel = handle.name || 'Selected folder';
      await setDefaultFolderHandle(handle);
      await settingsStore.save(settings);
      populateSettingsForm();
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      setResult('Unable to set default save folder: ' + (e.message || e), true);
    }
  });

  btnClearSaveFolder.addEventListener('click', async () => {
    if (!supportsFileSystemAccess()) return;
    await clearDefaultFolderHandle();
    defaultSaveFolderHandle = null;
    settings.defaultSaveFolderLabel = '';
    defaultSaveFolderInput.value = '';
    await settingsStore.save(settings);
    populateSettingsForm();
  });

  showInDownloadListInput.addEventListener('change', () => {
    if (showInDownloadListInput.checked) {
      settings.showInDownloadList = true;
      if (defaultSaveFolderHandle || settings.defaultSaveFolderLabel) {
        alert('Default save folder will be cleared and files will be saved to the Downloads folder.');
      }
      clearDefaultFolderHandle().finally(() => {
        defaultSaveFolderHandle = null;
        settings.defaultSaveFolderLabel = '';
        defaultSaveFolderInput.value = '';
        settingsStore.save({ ...settings, showInDownloadList: true, defaultSaveFolderLabel: '' }).finally(() => {
          populateSettingsForm();
        });
      });
      return;
    }
    settings.showInDownloadList = false;
    settingsStore.save(settings).finally(() => {
      populateSettingsForm();
    });
  });

  btnSaveSettings.addEventListener('click', async () => {
    // Note: showSaveOptions and showEmailOptions are admin-controlled and not saved from user settings

    settings.defaultEmailChecked = settingsEmailDefaultCheckboxes
      .filter(cb => cb.checked)
      .map(cb => cb.getAttribute('data-email-default'))
      .filter(opt => settings.showEmailOptions.includes(opt));

    if (settings.lockNameFormatting !== true) {
      settings.namePrefixes = {
        ...settingsStore.defaultSettings.namePrefixes,
        pdf: prefixPdfInput.value || settingsStore.defaultSettings.namePrefixes.pdf,
        docx: prefixDocxInput.value || settingsStore.defaultSettings.namePrefixes.docx,
        track_changes: prefixTrackInput.value || settingsStore.defaultSettings.namePrefixes.track_changes,
        changedPagesPdf: prefixPagesInput.value || settingsStore.defaultSettings.namePrefixes.changedPagesPdf
      };
      settings.nameTemplate = (nameTemplateInput.value || settingsStore.defaultSettings.nameTemplate).trim();
    }
    if (settings.lockEmailSubject !== true) {
      settings.emailSubjectTemplate = (emailSubjectTemplateInput.value || settingsStore.defaultSettings.emailSubjectTemplate).trim();
    }
    settings.enableHints = enableHintsInput.checked;
    settings.showInDownloadList = showInDownloadListInput.checked;
    settings.showPathAfterAction = showPathAfterActionInput.checked;
    settings.rememberLastFolder = rememberLastFolderInput.checked;
    settings.enableCancelCompare = enableCancelCompareInput.checked;
    settings.defaultSaveFolderLabel = (defaultSaveFolderInput.value || '').trim();

    await settingsStore.save(settings);
    applySettingsToUI();
    setCompareInProgress(isComparing);
    settingsOverlay.classList.remove('open');
    settingsOverlay.setAttribute('aria-hidden', 'true');
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
      const createTcUrl = `${baseUrl}/WorkshareCompareApi/api/Comparison/${comparisonId}/tccreate`;
      const response = await fetch(createTcUrl, { method: 'POST' });
      if (response.status === 201) return response.headers.get('location');
      throw new Error(`Server returned ${response.status} during tccreate`);
    } else {
      const prepareUrl = `${baseUrl}/WorkshareCompareApi/api/Comparison/${comparisonId}/prepareDownload?format=${format}`;
      const response = await fetch(prepareUrl, { method: 'GET' });
      if (response.ok) { 
        let downloadUrl = `${baseUrl}/WorkshareCompareApi/api/Comparison/${comparisonId}/download`;
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
    item.addEventListener('click', (e) => { triggerDownload(e.target.getAttribute('data-format')); });
  });

  async function triggerDownload(format) {
    if (!comparisonUrl) return;
    const suggestedName = generateFileName(format, originalFile, modifiedFile);
    try {
      setResult(`Preparing ${format.toUpperCase()} download...`, false);
      const targetUrl = await getComparisonDownloadUrl(format);
      
      setResult(`Saving ${suggestedName}...`, false);
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
          setResult('Save complete.', false);
        }
      } else {
        executeBlobDownload(blob, suggestedName);
        lastSavedPathLabel = `Downloads\\${suggestedName}`;
        if (settings.showPathAfterAction !== false) {
          setResultHtml(formatPathLine(lastSavedPathLabel), false);
        } else {
          setResult('Download complete.', false);
        }
      }
    } catch (error) {
      setResult('Error saving file: ' + error.message, true);
    }
  }

  /* Email Logic (Generates native Outlook .eml file to attach files via Client Side JS) */
  btnEmailPrimary.addEventListener('click', async () => {
    if (!comparisonUrl) return;

    // 1. Gather selected options
    const checkboxes = emailMenu.querySelectorAll('input[type="checkbox"]:checked');
    const selectedFormats = Array.from(checkboxes).map(cb => cb.value);

    if (selectedFormats.length === 0) {
      setResult('Please select at least one file format to email.', true);
      return;
    }

    setResult('Preparing Outlook email attachments...', false);
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
      let eml = `To: \r\n`;
      const subject = settingsStore.buildEmailSubject(
        getBaseName(originalFile?.name),
        getBaseName(modifiedFile?.name),
        settings
      );
      eml += `Subject: ${subject}\r\n`;
      eml += `X-Unsent: 1\r\n`; // <--- This flag tells Outlook to open as a Draft 
      eml += `Content-Type: multipart/mixed; boundary="--boundary_text"\r\n\r\n`;
      
      eml += `----boundary_text\r\n`;
      eml += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      eml += `Please find the requested document comparison and source files attached.\r\n\r\n`;

      for (const att of attachments) {
          const base64 = await blobToBase64(att.blob);
          eml += `----boundary_text\r\n`;
          eml += `Content-Type: application/octet-stream; name="${att.name}"\r\n`;
          eml += `Content-Transfer-Encoding: base64\r\n`;
          eml += `Content-Disposition: attachment; filename="${att.name}"\r\n\r\n`;
          
          // Base64 requires linebreaks every 76 characters for strict MIME compliance
          const chunked = base64.match(/.{1,76}/g).join('\r\n');
          eml += `${chunked}\r\n\r\n`;
      }
      eml += `----boundary_text--\r\n`;

      // 6. Download the EML file. Clicking it will open Outlook natively.
      const emlBlob = new Blob([eml], { type: 'message/rfc822' });
      let savedToFolder = false;
      let folderHandle = null;
      const emlName = 'Email_Comparison.eml';

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
          setResultHtml(`${formatPathLine(lastSavedPathLabel)}. Click the .eml file to open Outlook.`, false);
        } else {
          setResult('Email package saved. Click the .eml file to open Outlook.', false);
        }
      } else {
        executeBlobDownload(emlBlob, emlName);
        lastSavedPathLabel = `Downloads\\${emlName}`;
        if (settings.showPathAfterAction !== false) {
          setResultHtml(`${formatPathLine(lastSavedPathLabel)}. Click the .eml file to open Outlook.`, false);
        } else {
          setResult('Email package downloaded. Click the .eml file to open Outlook.', false);
        }
      }
    } catch (error) {
      setResult('Error generating email: ' + error.message, true);
    }
  });

  loadSettings();

});
