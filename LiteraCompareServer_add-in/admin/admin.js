(function() {
    'use strict';

    // Admin settings API (file-backed) hosted under /admin/api
    const adminApiBase = new URL('api/', window.location.href);
    const settingsEndpoint = new URL('settings.asp', adminApiBase).toString();
    const resetEndpoint = new URL('reset.asp', adminApiBase).toString();

    const defaultAdminSettings = {
        // Visibility controls
        showSaveOptions: ['pdf', 'docx', 'track_changes', 'changedPagesPdf'],
        showEmailOptions: ['original', 'modified', 'pdf', 'docx', 'track_changes', 'changedPagesPdf'],

        // Default settings for new users
        defaultEmailChecked: ['pdf'],
        enableHints: true,
        showInDownloadList: false,
        showPathAfterAction: true,
        rememberLastFolder: false,
        enableCancelCompare: true,
        namePrefixes: {
            pdf: 'Redline - ',
            docx: 'Redline - ',
            track_changes: 'Track Changes - ',
            changedPagesPdf: 'Redline Pages - ',
            default: 'Comparison - '
        },
        nameTemplate: '{prefix}{original} and {modified}',
        emailSubjectTemplate: 'Document Comparison ({original} vs {modified})',
        lockNameFormatting: false,
        lockEmailSubject: false
    };

    const showStatus = (message, isError = false) => {
        const statusEl = document.getElementById('admin-status');
        statusEl.textContent = message;
        statusEl.style.color = isError ? '#c50f1f' : '#107c10';
    };

    const authStorageKey = 'admin_basic_auth';

    const buildAuthHeader = () => {
        const stored = sessionStorage.getItem(authStorageKey);
        if (stored) return stored;
        const username = prompt('Admin username:');
        if (username === null) return null;
        const password = prompt('Admin password:');
        if (password === null) return null;
        const header = 'Basic ' + btoa(`${username}:${password}`);
        sessionStorage.setItem(authStorageKey, header);
        return header;
    };

    const fetchWithAuth = async (url, options = {}) => {
        const header = buildAuthHeader();
        if (!header) throw new Error('Authentication required');
        const opts = { ...options, headers: { ...(options.headers || {}), Authorization: header } };
        let response = await fetch(url, opts);
        if (response.status === 401) {
            sessionStorage.removeItem(authStorageKey);
            const retryHeader = buildAuthHeader();
            if (!retryHeader) throw new Error('Authentication required');
            const retryOpts = { ...options, headers: { ...(options.headers || {}), Authorization: retryHeader } };
            response = await fetch(url, retryOpts);
        }
        return response;
    };

    const readErrorBody = async (response) => {
        try {
            const text = await response.text();
            return text ? ` ${text}` : '';
        } catch (e) {
            return '';
        }
    };

    const loadAdminSettings = async () => {
        try {
            const response = await fetchWithAuth(settingsEndpoint, { cache: 'no-store' });
            if (!response.ok) {
                const extra = await readErrorBody(response);
                throw new Error(`HTTP ${response.status}: ${response.statusText}.${extra}`);
            }
            const settings = await response.json();
            populateAdminForm(settings);
            showStatus('Settings loaded successfully');
        } catch (error) {
            console.error('Failed to load admin settings:', error);
            showStatus(`Failed to load settings: ${error.message}`, true);
            // Load defaults if API fails
            populateAdminForm(defaultAdminSettings);
        }
    };

    const saveAdminSettings = async () => {
        const settings = collectAdminFormData();

        try {
            const response = await fetchWithAuth(settingsEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                const extra = await readErrorBody(response);
                throw new Error(`HTTP ${response.status}: ${response.statusText}.${extra}`);
            }

            showStatus('Admin settings saved successfully');
        } catch (error) {
            console.error('Failed to save admin settings:', error);
            showStatus(`Failed to save settings: ${error.message}`, true);
        }
    };

    const resetAdminSettings = async () => {
        if (!confirm('Are you sure you want to reset all admin settings to defaults?')) {
            return;
        }

        try {
            const response = await fetchWithAuth(resetEndpoint, { method: 'POST' });

            if (!response.ok) {
                const extra = await readErrorBody(response);
                throw new Error(`HTTP ${response.status}: ${response.statusText}.${extra}`);
            }

            const settings = await response.json();
            populateAdminForm(settings);
            showStatus('Settings reset to defaults');
        } catch (error) {
            console.error('Failed to reset admin settings:', error);
            showStatus(`Failed to reset settings: ${error.message}`, true);
        }
    };

    const collectAdminFormData = () => {
        return {
            showSaveOptions: [
                document.getElementById('admin-show-save-pdf').checked ? 'pdf' : null,
                document.getElementById('admin-show-save-docx').checked ? 'docx' : null,
                document.getElementById('admin-show-save-track-changes').checked ? 'track_changes' : null,
                document.getElementById('admin-show-save-changed-pages').checked ? 'changedPagesPdf' : null
            ].filter(Boolean),

            showEmailOptions: [
                document.getElementById('admin-show-email-original').checked ? 'original' : null,
                document.getElementById('admin-show-email-modified').checked ? 'modified' : null,
                document.getElementById('admin-show-email-pdf').checked ? 'pdf' : null,
                document.getElementById('admin-show-email-docx').checked ? 'docx' : null,
                document.getElementById('admin-show-email-track-changes').checked ? 'track_changes' : null,
                document.getElementById('admin-show-email-changed-pages').checked ? 'changedPagesPdf' : null
            ].filter(Boolean),

            defaultEmailChecked: [
                document.getElementById('admin-default-email-original').checked ? 'original' : null,
                document.getElementById('admin-default-email-modified').checked ? 'modified' : null,
                document.getElementById('admin-default-email-pdf').checked ? 'pdf' : null,
                document.getElementById('admin-default-email-docx').checked ? 'docx' : null,
                document.getElementById('admin-default-email-track-changes').checked ? 'track_changes' : null,
                document.getElementById('admin-default-email-changed-pages').checked ? 'changedPagesPdf' : null
            ].filter(Boolean),

            enableHints: document.getElementById('admin-enable-hints').checked,
            showInDownloadList: document.getElementById('admin-show-in-download-list').checked,
            showPathAfterAction: document.getElementById('admin-show-path-after-action').checked,
            rememberLastFolder: document.getElementById('admin-remember-last-folder').checked,
            enableCancelCompare: document.getElementById('admin-enable-cancel-compare').checked,

            namePrefixes: {
                pdf: document.getElementById('admin-prefix-pdf').value || defaultAdminSettings.namePrefixes.pdf,
                docx: document.getElementById('admin-prefix-docx').value || defaultAdminSettings.namePrefixes.docx,
                track_changes: document.getElementById('admin-prefix-track').value || defaultAdminSettings.namePrefixes.track_changes,
                changedPagesPdf: document.getElementById('admin-prefix-pages').value || defaultAdminSettings.namePrefixes.changedPagesPdf,
                default: defaultAdminSettings.namePrefixes.default
            },

            nameTemplate: document.getElementById('admin-name-template').value || defaultAdminSettings.nameTemplate,
            emailSubjectTemplate: document.getElementById('admin-email-subject-template').value || defaultAdminSettings.emailSubjectTemplate,
            lockNameFormatting: document.getElementById('admin-lock-name-formatting').checked,
            lockEmailSubject: document.getElementById('admin-lock-email-subject').checked
        };
    };

    const populateAdminForm = (settings) => {
        // Visibility settings
        document.getElementById('admin-show-save-pdf').checked = settings.showSaveOptions?.includes('pdf') ?? true;
        document.getElementById('admin-show-save-docx').checked = settings.showSaveOptions?.includes('docx') ?? true;
        document.getElementById('admin-show-save-track-changes').checked = settings.showSaveOptions?.includes('track_changes') ?? true;
        document.getElementById('admin-show-save-changed-pages').checked = settings.showSaveOptions?.includes('changedPagesPdf') ?? true;

        document.getElementById('admin-show-email-original').checked = settings.showEmailOptions?.includes('original') ?? true;
        document.getElementById('admin-show-email-modified').checked = settings.showEmailOptions?.includes('modified') ?? true;
        document.getElementById('admin-show-email-pdf').checked = settings.showEmailOptions?.includes('pdf') ?? true;
        document.getElementById('admin-show-email-docx').checked = settings.showEmailOptions?.includes('docx') ?? true;
        document.getElementById('admin-show-email-track-changes').checked = settings.showEmailOptions?.includes('track_changes') ?? true;
        document.getElementById('admin-show-email-changed-pages').checked = settings.showEmailOptions?.includes('changedPagesPdf') ?? true;

        // Default settings
        document.getElementById('admin-default-email-original').checked = settings.defaultEmailChecked?.includes('original') ?? false;
        document.getElementById('admin-default-email-modified').checked = settings.defaultEmailChecked?.includes('modified') ?? false;
        document.getElementById('admin-default-email-pdf').checked = settings.defaultEmailChecked?.includes('pdf') ?? true;
        document.getElementById('admin-default-email-docx').checked = settings.defaultEmailChecked?.includes('docx') ?? false;
        document.getElementById('admin-default-email-track-changes').checked = settings.defaultEmailChecked?.includes('track_changes') ?? false;
        document.getElementById('admin-default-email-changed-pages').checked = settings.defaultEmailChecked?.includes('changedPagesPdf') ?? false;

        document.getElementById('admin-enable-hints').checked = settings.enableHints ?? true;
        document.getElementById('admin-show-in-download-list').checked = settings.showInDownloadList ?? false;
        document.getElementById('admin-show-path-after-action').checked = settings.showPathAfterAction ?? true;
        document.getElementById('admin-remember-last-folder').checked = settings.rememberLastFolder ?? false;
        document.getElementById('admin-enable-cancel-compare').checked = settings.enableCancelCompare ?? true;

        document.getElementById('admin-prefix-pdf').value = settings.namePrefixes?.pdf || '';
        document.getElementById('admin-prefix-docx').value = settings.namePrefixes?.docx || '';
        document.getElementById('admin-prefix-track').value = settings.namePrefixes?.track_changes || '';
        document.getElementById('admin-prefix-pages').value = settings.namePrefixes?.changedPagesPdf || '';
        document.getElementById('admin-name-template').value = settings.nameTemplate || '';
        document.getElementById('admin-email-subject-template').value = settings.emailSubjectTemplate || '';
        document.getElementById('admin-lock-name-formatting').checked = settings.lockNameFormatting ?? false;
        document.getElementById('admin-lock-email-subject').checked = settings.lockEmailSubject ?? false;
    };

    // Event listeners
    document.getElementById('btn-load-admin-settings').addEventListener('click', loadAdminSettings);
    document.getElementById('btn-save-admin-settings').addEventListener('click', saveAdminSettings);
    document.getElementById('btn-reset-admin-settings').addEventListener('click', resetAdminSettings);

    // Load settings on page load
    loadAdminSettings();

})();
