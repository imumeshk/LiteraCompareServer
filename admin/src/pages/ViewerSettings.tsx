import React, { useState, useEffect } from 'react';
import { api, ViewerSettings as ViewerSettingsType, toast } from '../api/client';
import { useUnsavedChanges } from '../context/UnsavedChangesContext';
import { ViewerSettingsSkeleton } from '../components/Skeleton';
import {
  Eye, Save, Pencil, CheckCircle2, AlertCircle, ExternalLink,
  Layers, Sparkles, ToggleLeft, ToggleRight, Layout,
  Settings, Globe, Languages, AlertTriangle, X, Edit2, Copy, ClipboardPaste
} from 'lucide-react';

const ToggleButton = ({ label, active, onClick, disabled = false }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${active ? 'bg-blue-500' : 'bg-slate-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${active ? 'translate-x-4' : 'translate-x-1'}`} />
  </button>
);

export const ViewerSettings: React.FC = () => {
  const [settings, setSettings] = useState<ViewerSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showLangModal, setShowLangModal] = useState<boolean>(false);
  const [modalLangCode, setModalLangCode] = useState<string | null>(null);
  const [modalLangJson, setModalLangJson] = useState<string>('');

  const { setHasUnsavedChanges } = useUnsavedChanges();
  
  useEffect(() => {
    setHasUnsavedChanges(isEditing);
    return () => setHasUnsavedChanges(false);
  }, [isEditing, setHasUnsavedChanges]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getViewerSettings();
      setSettings(data);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof ViewerSettingsType, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
      setIsEditing(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      setMessage(null);
      const updated = await api.updateViewerSettings(settings);
      setSettings(updated);
      setIsEditing(false);
      const saveText = 'Custom DeltaView settings saved successfully.';
      setMessage({ type: 'success', text: saveText });
      toast.success(saveText, 'Viewer Settings Saved');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update viewer settings.' });
    } finally {
      setSaving(false);
    }
  };



  const loadSampleLanguage = () => {
    const sample = [
      {
        "code": "en",
        "name": "English",
        "translations": {
          "btn_sign_in": "Sign In",
          "btn_sign_out": "Sign Out",
          "hdr_sso_required": "Microsoft Entra SSO Authentication Required",
          "msg_sso_restricted": "Access to Litera Compare Server web comparison portal is restricted to authorized enterprise users.",
          "btn_sso_login": "Sign In with Microsoft Entra",
          "msg_sso_unauthorized": "Unauthorized: please log in via Microsoft Entra.",
          "msg_sso_welcome": "Welcome, {name}! Signed in via Microsoft Entra.",
          "lbl_original": "Original Document",
      "lbl_modified": "Modified Document",
      "lbl_drop_orig_sub": "Click or drag baseline .docx / .pdf file",
      "lbl_drop_mod_sub": "Click or drag revised .docx / .pdf file",
      "btn_choose_file": "Choose File",
      "lbl_password_protected": "Documents are password-protected",
      "lbl_original_password": "Original Password",
      "lbl_modified_password": "Modified Password",
      "lbl_show_password": "Show password",
      "lbl_password_privacy_note": "Passwords are used only for this comparison and are not stored.",
      "lbl_advanced_options": "Advanced Options",
      "lbl_rendering_options": "Rendering Parameters",
      "ph_rendering_options": "e.g. opt1=val1;opt2=val2",
      "btn_run_compare": "Run Compare",
      "btn_comparing": "Comparing...",
      "btn_running_comparison": "Running comparison...",
      "btn_reset": "Reset",
      "btn_cancel": "Cancel",
      "btn_save": "Save",
      "btn_new_comparison": "New Comparison",
      "btn_ignore_continue": "Ignore and Continue",
      "lbl_select_language": "Select language",
      "msg_uploading_files": settings?.loading_message || "Uploading & comparing files",
      "msg_select_both_files": "Please select both Original and Modified files.",
      "msg_compare_success": "Comparison complete.",
      "msg_compare_error": "Failed to run comparison.",
      "msg_compare_completed": "Comparison completed successfully!",
      "msg_compare_canceled": "Comparison canceled.",
      "msg_compare_failed": "Comparison failed: {error}",
      "msg_same_name_warning": "Both selected files have the same name, but you can still proceed with the comparison.",
      "msg_save_prompt": "Do you want to save the current comparison before starting a new one?",
      "err_400": "The POST request did not contain exactly two files to compare.",
      "err_401": "Unauthorized: Session is expired or revoked.",
      "err_403": "One or both of the documents is password protected and cannot be read.",
      "err_404": "Not Found: The requested resource could not be found.",
      "err_413": "Payload Too Large: The documents exceed the maximum allowed size.",
      "err_415": "The POST request is not a multipart media type.",
      "err_422": "The documents cannot be compared because they are corrupt or of an unsupported format, or an error has occurred while processing their content.",
      "err_500": "The server is incorrectly configured, unlicensed or an unexpected error has occurred.",
      "err_503": "The server is currently too busy to handle the request (and is configured to reject requests when too busy).",
      "err_failed_to_fetch": "Failed to connect to server.",
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
      "dlg_save_file": "Save File",
      "lbl_file_name": "File Name",
      "btn_choose_folder": "Choose Folder...",
      "btn_download": "Download",
      "msg_downloading": "Downloading document...",
      "msg_preparing_doc": "Preparing document...",
      "msg_prep_download": "Preparing {format} download...",
      "msg_download_complete": "Download complete.",
      "msg_folder_selected": "Folder selected: {folder}",
      "msg_download_failed": "Failed to save document.",
      "loading": {
        "pages": "Loading pages...",
        "comparing": "Comparing...",
        "firstDelay": "Your documents are being compared. Please wait.",
        "secondDelay": "Still comparing. Large documents may take longer.",
        "error": "An error occurred during comparison. Please try again.",
        "saving_changes": "Saving selected changes to new document...",
        "changes_applied": "Changes successfully applied."
      },
      "errors": {
        "apply_changes": "Unable to apply selected changes.",
        "print": {
          "incompatibleVersion": "Please upgrade your version of Litera Compare Server to 9.5.7 or later",
          "loading": "This comparison can't be printed at this time."
        },
        "toolbarActionFailed": {
          "pdf": "It wasn't possible to save the comparison as a PDF.",
          "docx": "It wasn't possible to save the comparison as a Word document (DOCX).",
          "tracked": "It wasn't possible to save the comparison as a Word document (DOCX) with track changes.",
          "changedPagesPdf": "It wasn't possible to save the comparison as a changed pages PDF.",
          "noChangedPages": "There are no changed pages to download because the compared documents have no changes.",
          "gdoctracked": "It wasn't possible to save the comparison as a tracked document (GDOC) with track changes.",
          "unknown": "It wasn't possible to save the comparison."
        }
      },
      "SummaryAI": {
        "generatingTitle": "Generating summary...",
        "comparisonTitle": "Comparison Summary",
        "generatingTextTitle": "It may take some time to generate a summary for your comparison.",
        "generatingTextSubtitle": "You can continue to work during this time and navigate away from this tab but please keep the comparison browser page open.",
        "comparisonText": "Generate a comprehensive, natural language report to get contextual insights into the meaning and implications of the Change List found in the comparison.",
        "cancelSummaryButton": "Cancel",
        "retrySummaryButton": "Retry",
        "copySummaryButton": "Copy",
        "downloadSummaryButton": "Download",
        "generateSummaryButton": "Generate Summary",
        "failedToGenerateSummary": "Summary Generation Failed",
        "summaryFooter": "AI-generated summary may be incorrect.",
        "summaryHeader": "Here is a consolidated summary that comprises of substantive differences.",
        "working": "Working on it..."
      }
    }
  }
];
    const sampleObj = sample[0];
    if (modalLangCode && modalLangCode !== 'new') {
      sampleObj.code = modalLangCode;
    }
    setModalLangJson(JSON.stringify(sampleObj, null, 2));
  };

  if (loading || !settings) {
    return <ViewerSettingsSkeleton />;
  }

  const builtInLangs = ['en'];
  let customLangsCount = 0;
  try {
    const parsed = JSON.parse(settings.custom_languages || '[]');
    customLangsCount = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
  } catch (e) {}

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-blue-400" />
            Custom Viewer (DeltaView) Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Control DeltaView presentation rules, classification tabs, and client visual preferences.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/viewer/home.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <span>Open Delta Viewer Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-lg text-xs flex items-center gap-2.5 border ${message.type === 'success' ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300' : 'bg-red-950/40 border-red-800/40 text-red-300'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Section 1: Viewer Display Options */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-800 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">1</span>
          <h2 className="text-sm font-semibold text-slate-200">Viewer Display Options</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Show Category Tabs</span>
            <ToggleButton active={settings.show_categories} onClick={() => updateSetting('show_categories', !settings.show_categories)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Show Change Summary List</span>
            <ToggleButton active={settings.show_changelist} onClick={() => updateSetting('show_changelist', !settings.show_changelist)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Show Statistics Panel</span>
            <ToggleButton active={settings.show_statistics} onClick={() => updateSetting('show_statistics', !settings.show_statistics)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Show Main Toolbar</span>
            <ToggleButton active={settings.show_toolbar} onClick={() => updateSetting('show_toolbar', !settings.show_toolbar)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Show Redline Panel</span>
            <ToggleButton active={settings.show_redline} onClick={() => updateSetting('show_redline', !settings.show_redline)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Accept Changes Enabled</span>
            <ToggleButton active={settings.accept_changes_enabled} onClick={() => updateSetting('accept_changes_enabled', !settings.accept_changes_enabled)} />
          </div>
        </div>
      </div>

      {/* Section 2: Toolbar Button Visibility */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-800 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">2</span>
          <h2 className="text-sm font-semibold text-slate-200">Toolbar Button Visibility</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Save as PDF</span>
            <ToggleButton active={settings.toolbar_show_pdf} onClick={() => updateSetting('toolbar_show_pdf', !settings.toolbar_show_pdf)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Save as DOCX</span>
            <ToggleButton active={settings.toolbar_show_docx} onClick={() => updateSetting('toolbar_show_docx', !settings.toolbar_show_docx)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Save Tracked Changes</span>
            <ToggleButton active={settings.toolbar_show_tracked} onClick={() => updateSetting('toolbar_show_tracked', !settings.toolbar_show_tracked)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Changed Pages PDF</span>
            <ToggleButton active={settings.toolbar_show_changed_pages} onClick={() => updateSetting('toolbar_show_changed_pages', !settings.toolbar_show_changed_pages)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Print Button</span>
            <ToggleButton active={settings.toolbar_show_print} onClick={() => updateSetting('toolbar_show_print', !settings.toolbar_show_print)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-300">Navigation Arrows</span>
            <ToggleButton active={settings.toolbar_show_nav_arrows} onClick={() => updateSetting('toolbar_show_nav_arrows', !settings.toolbar_show_nav_arrows)} />
          </div>
        </div>
      </div>

      {/* Section 3: Loading Message */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-800 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">3</span>
          <h2 className="text-sm font-semibold text-slate-200">Loading & UX Messages</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Custom Loading Message</label>
            <input
              type="text"
              disabled={!isEditing}
              value={settings.loading_message}
              onChange={(e) => updateSetting('loading_message', e.target.value)}
              className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="E.g. Generating comparison..."
            />
          </div>
          
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center space-y-3">
            <div className="text-xs text-slate-500 font-semibold mb-2">LIVE PREVIEW</div>
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
            <div className="text-sm text-slate-300 font-medium">{settings.loading_message || '...'}</div>
          </div>
        </div>
      </div>

      {/* Section 4: Advanced Rendering Options & Passwords */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-800 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">4</span>
          <h2 className="text-sm font-semibold text-slate-200">Home Page Options</h2>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800/50 pb-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">Show Advanced Rendering Parameters</p>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                When enabled, an Advanced Options input appears on the viewer home page allowing users to enter custom rendering set parameters that will be appended to the comparison request.
              </p>
            </div>
            <ToggleButton active={settings.show_rendering_params_on_home} onClick={() => updateSetting('show_rendering_params_on_home', !settings.show_rendering_params_on_home)} />
          </div>
          
          <div className="flex items-start justify-between gap-4 pt-1">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">Show Password Fields</p>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Enable the "Documents are password-protected" checkbox on the front end. If disabled, users cannot provide passwords on the portal page.
              </p>
            </div>
            <ToggleButton active={settings.enable_password_fields} onClick={() => updateSetting('enable_password_fields', !settings.enable_password_fields)} />
          </div>
          <div className="flex items-start justify-between gap-4 pt-1 border-t border-slate-800/50 mt-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">Show Reset Button</p>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Enable a global reset button to clear both selected files simultaneously.
              </p>
            </div>
            <ToggleButton active={settings.enable_reset_button} onClick={() => updateSetting('enable_reset_button', !settings.enable_reset_button)} />
          </div>
        </div>
      </div>

      
      {/* Delta Viewer Comparison Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-800 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">5</span>
          <h2 className="text-sm font-semibold text-slate-200">Delta Viewer Comparison Actions</h2>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800/50 pb-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">Enable New Comparison Button</p>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Show an option to launch a new comparison directly from the Delta Viewer screen.
              </p>
            </div>
            <ToggleButton active={settings.enable_new_comparison_btn} onClick={() => updateSetting('enable_new_comparison_btn', !settings.enable_new_comparison_btn)} />
          </div>
          
          <div className={`flex items-start justify-between gap-4 border-b border-slate-800/50 pb-4 pt-1 ${!settings.enable_new_comparison_btn ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="space-y-1 w-full max-w-2xl">
              <p className="text-sm font-medium text-slate-200">Open New Comparison in:</p>
              <select 
                value={settings.new_comparison_target || 'same_tab'} 
                onChange={(e) => updateSetting('new_comparison_target', e.target.value)}
                className="mt-2 w-full max-w-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
              >
                <option value="same_tab">Same Tab</option>
                <option value="new_tab">New Tab</option>
              </select>
            </div>
          </div>

          <div className={`flex items-start justify-between gap-4 pt-1 ${(!settings.enable_new_comparison_btn || settings.new_comparison_target === 'new_tab') ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">Prompt to Save Comparison</p>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                If enabled, prompts the user to save the current comparison before launching a new one in the same tab.
              </p>
            </div>
            <ToggleButton active={settings.enable_save_prompt} onClick={() => updateSetting('enable_save_prompt', !settings.enable_save_prompt)} />
          </div>
        </div>
      </div>

  
  
    {/* Section 6: Download Naming & Save Dialog */}
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">6. Download Naming & Save Dialog</h2>
      </div>

      <div className="space-y-4 pt-4 md:pt-0">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/50 pb-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-200">Enable Download Name Templates</p>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              If enabled, controls the default naming format for all downloaded comparison files.
            </p>
          </div>
          <ToggleButton active={settings.enable_name_templates !== false} onClick={() => updateSetting('enable_name_templates', !settings.enable_name_templates)} />
        </div>

        <div className={`space-y-4 transition ${settings.enable_name_templates === false ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Filename Template</label>
            <input
              type="text"
              value={settings.name_template || '{prefix}{original} and {modified}'}
              onChange={(e) => updateSetting('name_template', e.target.value)}
              disabled={!isEditing}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 font-mono text-sm"
              placeholder="{prefix}{original} and {modified}"
            />
            <p className="text-xs text-slate-500">Available variables: {'{prefix}, {original}, {modified}'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">PDF Prefix</label>
              <input type="text" value={settings.name_prefixes?.pdf || 'Redline - '} onChange={(e) => updateSetting('name_prefixes', { ...settings.name_prefixes, pdf: e.target.value })} disabled={!isEditing} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">DOCX Prefix</label>
              <input type="text" value={settings.name_prefixes?.docx || 'Redline - '} onChange={(e) => updateSetting('name_prefixes', { ...settings.name_prefixes, docx: e.target.value })} disabled={!isEditing} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Track Changes Prefix</label>
              <input type="text" value={settings.name_prefixes?.track_changes || 'Track Changes - '} onChange={(e) => updateSetting('name_prefixes', { ...settings.name_prefixes, track_changes: e.target.value })} disabled={!isEditing} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Accept Changes Prefix</label>
              <input type="text" value={settings.name_prefixes?.accept_changes || 'Accepted Changes - '} onChange={(e) => updateSetting('name_prefixes', { ...settings.name_prefixes, accept_changes: e.target.value })} disabled={!isEditing} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Changed Pages PDF Prefix</label>
              <input type="text" value={settings.name_prefixes?.changedPagesPdf || 'Redline Pages - '} onChange={(e) => updateSetting('name_prefixes', { ...settings.name_prefixes, changedPagesPdf: e.target.value })} disabled={!isEditing} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-sm" />
            </div>
          </div>
          
          <div className="bg-slate-900 p-3 rounded border border-slate-800">
            <p className="text-xs text-slate-400 font-semibold mb-2">Live Preview:</p>
            <p className="text-sm font-mono text-slate-300">
              {(settings.name_template || '{prefix}{original} and {modified}').replace('{prefix}', settings.name_prefixes?.pdf || 'Redline - ').replace('{original}', 'Doc1').replace('{modified}', 'Doc2')}.pdf
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-slate-800/50 pt-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-200">Allow User to Edit Filename</p>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              If enabled, users can override the default filename in a Save Dialog modal before downloading.
            </p>
          </div>
          <ToggleButton active={settings.allow_user_edit_filename ?? false} onClick={() => updateSetting('allow_user_edit_filename', !settings.allow_user_edit_filename)} />
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-slate-800/50 pt-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-200">Show "Save As" Folder Picker</p>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              If enabled, presents a "Choose Folder..." option in the HTML Save Dialog. <br/>
              <span className="text-orange-400/80 mt-1 block">(Note: Only supported on Chromium browsers with HTTPS. Gracefully falls back if unavailable.)</span>
            </p>
          </div>
          <ToggleButton active={settings.enable_save_as_dialog ?? false} onClick={() => updateSetting('enable_save_as_dialog', !settings.enable_save_as_dialog)} />
        </div>
      </div>
    </div>

    {/* Section 7: Additional Features */}
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">7. Additional Features</h2>
      </div>
      
      <div className="space-y-4 pt-4 md:pt-0">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-200">Enable Cancel Button</p>
            <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
              Show a Cancel button dynamically while files are uploading or comparing.
            </p>
          </div>
          <ToggleButton 
            active={settings.enable_cancel ?? false} 
            onClick={() => updateSetting('enable_cancel', !settings.enable_cancel)} 
          />
        </div>
      </div>
    </div>

    {/* Section 8: Multi-Language & Internationalization Support */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              8. Viewer Custom Languages Support (i18n)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" disabled={!isEditing} onClick={() => {
              setModalLangCode('new');
              setModalLangJson(JSON.stringify({ code: "new", name: "New Language", translations: {} }, null, 2));
              setShowLangModal(true);
            }} className={`text-[10px] bg-emerald-900/40 text-emerald-400 hover:text-emerald-300 px-2 py-1.5 rounded ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}>+ Add Language</button>
            <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              Active: 1 Built-in + {customLangsCount} Custom
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Viewer portal merges built-in translations (i18n.js) with your custom dictionaries. You can provide an array of custom language configurations here to overwrite strings for the homepage UI and DeltaView component.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {builtInLangs.map(lang => (
            <div key={lang} className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-200">{lang.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px]">
                <span className="font-mono text-slate-400">{lang}</span>
                <span className="text-slate-500">Built-in</span>
              </div>
            </div>
          ))}
          {(() => {
              let customParsed: any[] = [];
              try {
                if (settings.custom_languages && typeof settings.custom_languages === 'string') {
                  const parsed = JSON.parse(settings.custom_languages);
                  if (Array.isArray(parsed)) {
                    customParsed = parsed;
                  } else if (parsed && typeof parsed === 'object') {
                    customParsed = Object.keys(parsed).map(k => ({
                      code: k,
                      name: parsed[k]?.__names || k.toUpperCase(),
                      translations: parsed[k]
                    }));
                  }
                }
              } catch(e) {
                customParsed = [];
              }
              if (!Array.isArray(customParsed)) customParsed = [];
              
              return customParsed.map((lang: any) => {
                return (
                <div key={lang.code || Math.random()} className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between relative">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">{lang.name || (lang.code ? lang.code.toUpperCase() : 'Unknown')}</span>
                  </div>
                  <div className="absolute right-2 top-2 flex gap-1">
                    <button type="button" disabled={!isEditing} onClick={() => {
                        setModalLangCode(lang.code);
                        setModalLangJson(JSON.stringify(lang, null, 2));
                        setShowLangModal(true);
                    }} className={`text-slate-400 hover:text-blue-400 ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`} title="Edit JSON">✏️</button>
                    <button type="button" disabled={!isEditing} onClick={() => {
                        if (window.confirm(`Are you sure you want to delete the custom language '${lang.code}'?`)) {
                          let parsed = [];
                          try { parsed = JSON.parse(settings.custom_languages || '[]'); } catch(e){}
                          if (!Array.isArray(parsed)) parsed = [];
                          parsed = parsed.filter((c: any) => c.code !== lang.code);
                          updateSetting('custom_languages', parsed.length > 0 ? JSON.stringify(parsed, null, 2) : '');
                        }
                    }} className={`text-slate-400 hover:text-red-400 ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`} title="Delete">🗑️</button>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px]">
                    <span className="font-mono text-slate-400">{lang.code ? lang.code.toUpperCase() : 'NA'}</span>
                    <span className="text-emerald-400">Custom</span>
                  </div>
                </div>
              )});
          })()}
        </div>

      </div>
        <div className="p-5">
          <p className="text-xs text-slate-400 mb-4">
            The viewer portal merges built-in translations (i18n.js) with your custom DeltaView definitions.
          </p>
          <div className="flex flex-wrap gap-2">
            {builtInLangs.map(lang => (
              <span key={lang} className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-emerald-400" />
                {lang.toUpperCase()}
              </span>
            ))}
            {customLangsCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-blue-900/30 border border-blue-800 text-blue-300 text-[11px] font-medium flex items-center gap-1.5">
                <Languages className="w-3 h-3" />
                +{customLangsCount} Custom
              </span>
            )}
          </div>
        </div>

    
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={async () => {
              if (confirm('Reset all viewer settings to defaults?')) {
                setSaving(true);
                const defs = {
                  show_categories: true,
                  show_changelist: true,
                  show_statistics: true,
                  show_toolbar: true,
                  show_redline: true,
                  accept_changes_enabled: true,
                  toolbar_show_pdf: true,
                  toolbar_show_docx: true,
                  toolbar_show_tracked: true,
                  toolbar_show_changed_pages: true,
                  toolbar_show_print: true,
                  toolbar_show_nav_arrows: true,
                  loading_message: '',
                  custom_languages: '',
                  show_rendering_params_on_home: true,
                  enable_password_fields: true,
                  enable_reset_button: true,
                  enable_new_comparison_btn: true,
                  new_comparison_target: 'same_tab',
                  enable_save_prompt: true,
                  enable_name_templates: true,
                  name_template: '{prefix}{original} and {modified}',
                  name_prefixes: {
                    pdf: 'Redline - ', docx: 'Redline - ', track_changes: 'Track Changes - ', accept_changes: 'Accepted Changes - ', changedPagesPdf: 'Redline Pages - '
                  },
                  allow_user_edit_filename: false,
                  enable_save_as_dialog: false
                };
                await api.updateViewerSettings(defs as any);
                setSettings(defs as any);
                setIsEditing(false);
                setSaving(false);
                toast.success('Settings reset to defaults');
              }
            }}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
          >
            <span>Reset Defaults</span>
          </button>
      </div>
      
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        {isEditing ? (
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl hover:bg-emerald-700 transition-all transform hover:scale-105 disabled:opacity-70 disabled:scale-100 cursor-pointer"
            title="Save Settings"
          >
            <Save className="w-6 h-6" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all transform hover:scale-105 cursor-pointer"
            title="Edit Settings"
          >
            <Edit2 className="w-6 h-6" />
          </button>
        )}
      </div>

      {showLangModal && (
        (() => {
          let parsedName = '';
          let parsedCode = '';
          try {
            const parsed = JSON.parse(modalLangJson);
            parsedName = parsed.name || '';
            parsedCode = parsed.code || '';
          } catch (e) {}

          const isEditMode = modalLangCode !== 'new';
          
          const handlePaste = async () => {
            try {
              const text = await navigator.clipboard.readText();
              try {
                const parsed = JSON.parse(text);
                if (!parsed.code || !parsed.name || !parsed.translations || typeof parsed.translations !== 'object') {
                  toast.error("Invalid language data: Must contain 'code', 'name', and 'translations' fields. Cannot paste data.");
                  return;
                }
                setModalLangJson(text);
                toast.success("Content pasted successfully.");
              } catch(e) {
                toast.error("Invalid JSON format. Cannot paste data.");
              }
            } catch (err) {
              toast.error("Failed to read clipboard.");
            }
          };

          const handleCopy = () => {
            navigator.clipboard.writeText(modalLangJson);
            toast.success("Copied to clipboard");
          };

          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full shadow-2xl flex flex-col">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-bold text-slate-100">
                     {isEditMode ? `Edit Language: ${parsedName || parsedCode || modalLangCode}` : `Add Custom Language${parsedName && parsedCode ? ` - ${parsedName} (${parsedCode})` : ''}`}
                   </h3>
                   <div className="flex items-center gap-2">
                     <button type="button" onClick={handleCopy} title="Copy JSON" className="text-slate-400 hover:text-blue-400 p-1"><Copy className="w-4 h-4"/></button>
                     <button type="button" onClick={handlePaste} title="Paste JSON" className="text-slate-400 hover:text-emerald-400 p-1"><ClipboardPaste className="w-4 h-4"/></button>
                     <button type="button" onClick={() => setShowLangModal(false)} title="Close" className="text-slate-400 hover:text-red-400 p-1 ml-2"><X className="w-5 h-5"/></button>
                   </div>
                </div>
                <textarea
                  value={modalLangJson}
                  onChange={(e) => setModalLangJson(e.target.value)}
                  className="w-full h-64 bg-slate-950 border border-slate-700 rounded p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 mb-4"
                  spellCheck="false"
                />
                <div className="flex justify-between items-center">
                  <button 
                    type="button" 
                    onClick={loadSampleLanguage} 
                    disabled={isEditMode}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${isEditMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                  >
                    Load English Template
                  </button>
                  <div className="flex gap-3">
                     <button type="button" onClick={() => setShowLangModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition">Cancel</button>
                     <button type="button" onClick={() => {
                        try {
                          const newLang = JSON.parse(modalLangJson);
                          if (!newLang.code || !newLang.name || !newLang.translations) {
                            toast.error("JSON must include 'code', 'name', and 'translations'.", "Save Failed");
                            return;
                          }
                          let parsed = [];
                          try { parsed = JSON.parse(settings.custom_languages || '[]'); } catch(e){}
                          if (!Array.isArray(parsed)) parsed = [];
                          
                          const idx = parsed.findIndex(l => l.code === (isEditMode ? modalLangCode : newLang.code));
                          if (idx >= 0) {
                            parsed[idx] = newLang;
                          } else {
                            parsed.push(newLang);
                          }
                          
                          updateSetting('custom_languages', JSON.stringify(parsed, null, 2));
                          setShowLangModal(false);
                        } catch (e: any) {
                          toast.error(`Invalid JSON: ${e.message}`, 'Save Failed');
                        }
                     }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition">
                       Save Language
                     </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

    </form>
  );
};
