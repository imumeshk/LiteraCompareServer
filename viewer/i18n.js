window.LiteraI18n = (() => {
  const translations = {
    __names: {
      en: 'English'
    },
    en: {
      "msg_err_gen_email": "Failed to generate email: {error}",
      "msg_compare_completed": "Comparison completed successfully!",
      "msg_compare_canceled": "Comparison canceled.",
      "msg_compare_failed": "Comparison failed: {error}",
      "btn_reset_files": "Reset Files",
      "lbl_password_protected": "Documents are password-protected",
      "lbl_show_password": "Show password",
      "hdr_title": "Compare Server",
      "hdr_subtitle": "Enterprise Document Comparison",
      "lbl_modified_section": "Modified",
      "lbl_original_section": "Original",
      "lbl_select_language": "Select language",
      "btn_swap_files": "Swap Original and Modified files",
      "btn_local_device": "Local device",
      "btn_current_doc": "Current Document",
      "btn_cancel": "Cancel",
      "btn_choose": "Choose",
      "btn_clear": "Clear",
      "btn_confirm": "Confirm",
      "btn_reset_default": "Reset Default",
      "lbl_compare_behavior": "Compare behavior",
      "lbl_default_checked": "Default checked in Email menu",
      "lbl_default_name_prefixes": "Default name prefixes",
      "lbl_default_save_folder": "Default save folder",
      "lbl_default_subject": "Default subject",
      "lbl_email_menu_items": "Email menu items",
      "lbl_email_subject": "Email subject",
      "lbl_enable_cancel": "Enable cancel during compare",
      "lbl_hints": "Hints",
      "lbl_modified_file": "Modified file",
      "lbl_name_template": "Name template",
      "lbl_notifications": "Notifications",
      "lbl_original_file": "Original file",
      "lbl_parameters": "Parameters",
      "lbl_redline_docx": "Redline (Docx)",
      "lbl_redline_pages": "Redline Pages",
      "lbl_redline_pdf": "Redline (PDF)",
      "lbl_save_behavior": "Save behavior",
      "lbl_save_menu_items": "Save menu items",
      "lbl_show_button_hints": "Show button hints",
      "lbl_show_in_download_list": "Show in download list",
      "lbl_show_saved_path": "Show saved path",
      "lbl_track_changes": "Track Changes",
      "msg_reset_settings": "Reset settings to defaults?",
      "msg_use_date_vars": "Use {original}, {modified}, {date}",
      "msg_use_prefix_vars": "Use {prefix}, {original}, {modified}",
      "msg_use_variables": "You can use {original} and {modified} in any field below.",
      "msg_used_for_display": "Used for display. When a folder is chosen, saves go there.",
      "msg_visibility_controlled": "Visibility is controlled by Admin",
      "btn_sign_in": "Sign In",
      "hdr_sso": "Single Sign-On",
      "msg_same_name_warning": "Both selected files have the same name, but you can still proceed with the comparison.",
      "btn_run_compare": "Run Compare",
      "btn_comparing": "Comparing...",
      "btn_running_comparison": "Running comparison...",
      "msg_select_mod_file": "Please select a modified file.",
      "msg_compare_success": "Comparison complete.",
      "msg_compare_error": "Failed to run comparison.",
      "err_403": "One or both of the documents is password protected and cannot be read.",
      "err_401": "Unauthorized: Session is expired or revoked.",
      "err_404": "Not Found: The requested resource could not be found.",
      "err_413": "Payload Too Large: The documents exceed the maximum allowed size.",
      "err_400": "The POST request did not contain exactly two files to compare.",
      "err_422": "The documents cannot be compared because they are corrupt or of an unsupported format, or an error has occurred while processing their content.",
      "err_500": "The server is incorrectly configured, unlicensed or an unexpected error has occurred.",
      "err_503": "The server is currently too busy to handle the request (and is configured to reject requests when too busy).",
      "err_415": "The POST request is not a multipart media type.",
      "lbl_original_password": "Original Password",
      "lbl_modified_password": "Modified Password",
      "lbl_password_privacy_note": "Passwords are used only for this comparison and are not stored.",
      "lbl_advanced_options": "Advanced Options",
      "lbl_rendering_options": "Rendering Parameters",
      "lbl_brand_initial": "L",
      "lbl_brand_name": "Compare Server",
      "lbl_brand_sub": "Enterprise Document Comparison",
      "lbl_drop_orig_sub": "Click or drag baseline .docx / .pdf file",
      "lbl_drop_mod_sub": "Click or drag revised .docx / .pdf file",
      "err_failed_to_fetch": "Failed to connect to server.",
      "btn_new_comparison": "New Comparison",
      "lbl_new_comp_title": "New Comparison",
      "msg_save_prompt": "Do you want to save the current comparison before starting a new one?",
      "btn_ignore_continue": "Ignore and Continue",
      "hdr_compare": "Document Comparison",
      "lbl_original": "Original Document",
      "lbl_modified": "Modified Document",
      "btn_choose_file": "Choose File",
      "btn_load_sample": "Load Sample Commercial Agreement",
      "btn_admin_console": "Admin Console",
      "btn_system_health": "System Health",
      "btn_compare": "Compare",
      "btn_view": "View",
      "btn_save": "Save",
      "btn_email": "Email",
      "btn_reset": "Reset",
      "btn_settings": "Settings",
      "ph_not_set": "Not set",
      "ph_redline_pdf": "Redline - ",
      "ph_redline_docx": "Redline - ",
      "ph_track_changes": "Track Changes - ",
      "ph_redline_pages": "Redline Pages - ",
      "ph_name_template": "{prefix}{original} and {modified}",
      "ph_email_subject_template": "Document Comparison ({original} vs {modified})",
      "ph_rendering_options": "e.g. opt1=val1;opt2=val2",
      "lbl_remember_last_folder": "Remember last selected folder",
      "card_desc_compare": "Compare two documents with high-precision redline diff analysis.",
      "hdr_sso_required": "Microsoft Entra SSO Authentication Required",
      "msg_sso_restricted": "Access to Litera Compare Server web comparison portal is restricted to authorized enterprise users.",
      "btn_sso_login": "Sign In with Microsoft Entra",
      "msg_uploading_files": "Uploading & comparing files",
      "msg_uploading": "Uploading & comparing files",
      "msg_select_both_files": "Please select both Original and Modified files.",
      "msg_sso_unauthorized": "Unauthorized: please log in via Microsoft Entra.",
      "msg_sso_welcome": "Welcome, {name}! Signed in via Microsoft Entra.",
      "msg_download_complete": "Download complete.",
      "msg_save_complete": "Save complete.",
      "msg_saving": "Saving {name}...",
      "msg_prep_download": "Preparing {format} download...",
      "msg_email_saved": "Email draft saved successfully.",
      "msg_email_downloaded": "Email draft downloaded.",
      "msg_err_save_file": "Failed to save file: {error}",
      "msg_err_gen_email": "Failed to generate email: {error}",
      "msg_err_no_email_format": "Please select at least one format to email.",
      "msg_prep_email": "Preparing email...",
      "msg_err_set_save_folder": "Failed to set save folder: {error}",
      "msg_err_save_not_supported": "Direct folder save is not supported in this browser.",
      "msg_err_process_file": "Failed to process file: {error}",
      "msg_err_unauthorized": "Unauthorized access.",
      "msg_sso_signed_out": "You have been signed out.",
      "msg_err_open_file": "Failed to open file: {error}",
      "msg_loading_doc": "Loading {section} document...",
      "msg_err_get_file": "Failed to get file from Office: {error}",
      "dlg_save_file": "Save File",
      "lbl_file_name": "File Name",
      "btn_choose_folder": "Choose Folder...",
      "btn_download": "Download",
      "msg_preparing_doc": "Preparing document...",
      "msg_download_failed": "Failed to save document.",
      "hdr_brand_name": "Compare Server",
      "hdr_brand_sub": "Enterprise Document Comparison",
      "changeList": {
        "title": "Change List",
        "content": "CONTENT",
        "acceptSelectedChanges": "Accept selected changes",
        "zeroState": "Your documents contain no changes",
        "totalChanges": "Total changes",
        "originalDocument": "Original",
        "modifiedDocument": "Modified",
        "page": "Page",
        "changedContent": "Changed content",
        "categories": "Categories"
      },
      "changeListCategories": {
        "title": "Category",
        "content": "CONTENT",
        "wordVariations": "WORD VARIATIONS",
        "matching": "MATCHING"
      },
      "toolbar": {
        "changedPagesPdf": "Changed pages",
        "pdf": "Save as PDF",
        "docx": "Save as DOCX",
        "tracked": "Track Changes",
        "print": "Print",
        "email": "Email",
        "summary": "Change summary",
        "previous": "Previous change",
        "next": "Next change"
      },
      "loading": {
        "pages": "Loading pages...",
        "comparing": "Comparing...",
        "firstDelay": "Your documents are being compared. Please wait.",
        "secondDelay": "Still comparing. Large documents may take longer.",
        "error": "An error occurred during comparison. Please try again."
      }
    }
  };

  function mergeCustomLanguages(customLangs) {
    if (!customLangs || !Array.isArray(customLangs)) return;
    customLangs.forEach(item => {
      if (item.code && item.translations) {
        if (translations[item.code]) {
          translations[item.code] = { ...translations[item.code], ...item.translations };
        } else {
          translations[item.code] = item.translations;
        }
        if (item.name) {
          if (!translations.__names) translations.__names = {};
          translations.__names[item.code] = item.name;
        }
        if (!window.LiteraDeltaViewLanguages) window.LiteraDeltaViewLanguages = {};
        window.LiteraDeltaViewLanguages[item.code] = translations[item.code];
      } else {
        for (const langCode in item) {
          if (translations[langCode]) {
            translations[langCode] = { ...translations[langCode], ...item[langCode] };
          } else {
            translations[langCode] = item[langCode];
          }
          if (!window.LiteraDeltaViewLanguages) window.LiteraDeltaViewLanguages = {};
          window.LiteraDeltaViewLanguages[langCode] = translations[langCode];
        }
      }
    });
  }

  // 1. Immediately restore cached custom translations from previous sessions synchronously
  try {
    const cachedCustom = localStorage.getItem('litera_custom_languages_cache');
    if (cachedCustom) {
      mergeCustomLanguages(JSON.parse(cachedCustom));
    }
  } catch (e) {}

  // 2. Resolve initial language synchronously
  let currentLang = 'en';
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    const storedLang = localStorage.getItem('litera_viewer_lang');
    const detectedLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
    if (langParam && translations[langParam]) {
      currentLang = langParam;
    } else if (storedLang && translations[storedLang]) {
      currentLang = storedLang;
    } else if (detectedLang && translations[detectedLang]) {
      currentLang = detectedLang;
    }
  } catch (e) {}

  return {
    init: async () => {
      try {
        let customLangs = [];
        
        try {
          const resA = await fetch('/api/addin-settings');
          if (resA.ok) {
            const dataA = await resA.json();
            if (dataA.custom_languages) {
              const parsed = JSON.parse(dataA.custom_languages);
              customLangs = customLangs.concat(Array.isArray(parsed) ? parsed : [parsed]);
            }
          }
        } catch (e) {}
        
        try {
          const resV = await fetch('/api/viewer-settings');
          if (resV.ok) {
            const dataV = await resV.json();
            if (dataV.custom_languages) {
              const parsed = JSON.parse(dataV.custom_languages);
              customLangs = customLangs.concat(Array.isArray(parsed) ? parsed : [parsed]);
            }
          }
        } catch (e) {}

        if (customLangs.length >= 1) {
          mergeCustomLanguages(customLangs);
          try {
            localStorage.setItem('litera_custom_languages_cache', JSON.stringify(customLangs));
          } catch (e) {}
        }

        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang');
        const storedLang = localStorage.getItem('litera_viewer_lang');
        const detectedLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];

        if (langParam && translations[langParam]) {
          currentLang = langParam;
        } else if (storedLang && translations[storedLang]) {
          currentLang = storedLang;
        } else if (detectedLang && translations[detectedLang]) {
          currentLang = detectedLang;
        } else {
          currentLang = 'en';
        }

      } catch (e) {
        console.warn('Failed to load custom languages', e);
      }
    },
    setLanguage: (lang) => {
      if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('litera_viewer_lang', lang);
      }
    },
    getLanguage: () => currentLang,
    getAvailableLanguages: () => Object.keys(translations).filter(k => k !== '__names'),
    getLanguageName: (code) => translations.__names && translations.__names[code] ? translations.__names[code] : code,
    translate: (key, vars = {}) => {
      let str = (translations[currentLang] && translations[currentLang][key]) ? translations[currentLang][key] : (translations['en'][key] || key);
      for (const k in vars) {
        str = str.replace(new RegExp('{' + k + '}', 'g'), vars[k]);
      }
      return str;
    },
      addTranslations: (customLangsArray) => {
        if (Array.isArray(customLangsArray)) {
          customLangsArray.forEach(langObj => {
            if (langObj.code && langObj.translations) {
              if (!translations[langObj.code]) {
                translations[langObj.code] = {};
              }
              Object.assign(translations[langObj.code], langObj.translations);
              
              if (langObj.name) {
                if (!translations.__names) translations.__names = {};
                translations.__names[langObj.code] = langObj.name;
              }
            }
          });
        }
      },
    applyTranslations: () => {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = window.LiteraI18n.translate(key);
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', window.LiteraI18n.translate(key));
      });
    },
    buildLanguageSelector: (selectEl) => {
      if (!selectEl) return;
      selectEl.innerHTML = '';
      const langs = window.LiteraI18n.getAvailableLanguages();
      langs.forEach(langCode => {
        const option = document.createElement('option');
        option.value = langCode;
        option.textContent = window.LiteraI18n.getLanguageName(langCode);
        option.style.color = '#000000';
        selectEl.appendChild(option);
      });
    }
  };
})();

// Provide the built-in languages map for DeltaView integration
window.LiteraDeltaViewLanguages = {};
