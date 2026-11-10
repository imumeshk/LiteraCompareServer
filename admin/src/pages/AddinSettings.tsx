import React, { useState, useEffect } from 'react';
import { api, AddinSettings as AddinSettingsType, toast } from '../api/client';
import { useUnsavedChanges } from '../context/UnsavedChangesContext';
import { AddinSettingsSkeleton } from '../components/Skeleton';
import {
  Settings,
  Save,
  Pencil,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  FileText,
  Mail,
  Sliders,
  Sparkles,
  Globe,
  X,
  Edit2,
  Copy,
  ClipboardPaste,
} from 'lucide-react';

const ToggleButton = ({ active, onClick, disabled = false }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
      active ? 'bg-blue-500' : 'bg-slate-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span className="sr-only">Toggle</span>
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        active ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

export const AddinSettings: React.FC = () => {
  const [settings, setSettings] = useState<AddinSettingsType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [templatesEditing, setTemplatesEditing] = useState<boolean>(false);
  const [templatesForm, setTemplatesForm] = useState<any>(null);
  const [showLangModal, setShowLangModal] = useState<boolean>(false);
  const [modalLangCode, setModalLangCode] = useState<string | null>(null);
  const [modalLangJson, setModalLangJson] = useState<string>('');

  const { setHasUnsavedChanges } = useUnsavedChanges();
  
  useEffect(() => {
    setHasUnsavedChanges(editMode);
    return () => setHasUnsavedChanges(false);
  }, [editMode, setHasUnsavedChanges]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings && savedSnapshot) {
      if (JSON.stringify(settings) !== savedSnapshot) {
        setEditMode(true);
      }
    }
  }, [settings, savedSnapshot]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getAddinSettings();
      setSettings(data);
      setSavedSnapshot(JSON.stringify(data));
      setEditMode(false);
    } catch (err: any) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    if (!editMode) {
      setEditMode(true);
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const updated = await api.updateAddinSettings(settings);
      setSettings(updated);
      setSavedSnapshot(JSON.stringify(updated));
      setEditMode(false);
      const saveText = 'Add-in settings successfully saved and published.';
      setMessage({ type: 'success', text: saveText });
      toast.success(saveText, 'Settings Saved');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update add-in settings.' });
    } finally {
      setSaving(false);
    }
  };

  // --- Inline Templates Edit/Save ---
  const handleTemplatesEdit = () => {
    if (!settings) return;
    setTemplatesForm({
      name_template: settings.name_template,
      email_subject_template: settings.email_subject_template,
      name_prefixes: { ...settings.name_prefixes },
      user_override_templates: settings.user_override_templates,
      user_override_prefixes: settings.user_override_prefixes,
      user_override_email_options: settings.user_override_email_options,
    });
    setTemplatesEditing(true);
  };

  const handleTemplatesSave = async () => {
    if (!settings || !templatesForm) return;
    try {
      setSaving(true);
      const payload = { ...settings, ...templatesForm };
      const updated = await api.updateAddinSettings(payload);
      setSettings(updated);
      setSavedSnapshot(JSON.stringify(updated));
      setTemplatesEditing(false);
      setTemplatesForm(null);
      toast.success('File & Email Templates saved.', 'Templates Saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save templates.');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplatesCancel = () => {
    setTemplatesEditing(false);
    setTemplatesForm(null);
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all add-in settings to factory defaults?')) {
      return;
    }
    try {
      setResetting(true);
      setMessage(null);
      const reset = await api.resetAddinSettings();
      setSettings(reset);
      const resetText = 'All add-in settings have been reset to factory defaults.';
      setMessage({ type: 'success', text: resetText });
      toast.success(resetText, 'Settings Reset');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to reset add-in settings.' });
    } finally {
      setResetting(false);
    }
  };

  const loadSampleLanguage = () => {
    const sample = {
      "code": modalLangCode && modalLangCode !== 'new' ? modalLangCode : "en",
      "name": "English",
      "translations": {
        "btn_run_compare": "Run Compare",
        "btn_comparing": "Comparing...",
        "btn_running_comparison": "Running comparison...",
        "msg_uploading_files": "Uploading & comparing files",
        "btn_compare": "Compare",
        "btn_cancel": "Cancel",
        "btn_reset": "Reset",
        "btn_save": "Save",
        "btn_email": "Email",
        "btn_view": "View",
        "btn_settings": "Settings",
        "btn_sign_in": "Sign In with Microsoft",
        "btn_sign_out": "Sign Out",
        "hdr_sso": "Single Sign-On (SSO)",
        "msg_sso_restricted": "Access to the Compare add-in is restricted to authorized users.",
        "msg_sso_welcome": "Signed in as {name}",
        "lbl_original_file": "Original file",
        "lbl_modified_file": "Modified file",
        "lbl_original": "Original Document",
        "lbl_modified": "Modified Document",
        "btn_choose_file": "Choose File",
        "btn_local_device": "Local device",
        "btn_current_doc": "Current Document",
        "btn_choose": "Choose",
        "btn_clear": "Clear",
        "btn_confirm": "Confirm",
        "lbl_save_menu_items": "Save menu items",
        "lbl_save_behavior": "Save behavior",
        "lbl_show_in_download_list": "Show in download list",
        "lbl_show_saved_path": "Show saved path",
        "lbl_remember_last_folder": "Remember last selected folder",
        "lbl_redline_pdf": "Redline (PDF)",
        "lbl_redline_docx": "Redline (Docx)",
        "lbl_track_changes": "Track Changes",
        "lbl_redline_pages": "Redline Pages",
        "lbl_email_menu_items": "Email menu items",
        "lbl_default_checked": "Default checked in Email menu",
        "lbl_default_subject": "Default subject",
        "lbl_email_subject": "Email subject",
        "lbl_name_template": "Default Name Template",
        "lbl_default_name_prefixes": "Default name prefixes",
        "msg_saved_to_path": "Saved to {path}",
        "msg_use_variables": "You can use {original} and {modified} in any field below.",
        "msg_use_prefix_vars": "Use {prefix}, {original}, {modified}",
        "msg_use_date_vars": "Use {original}, {modified}, {date}",
        "lbl_compare_behavior": "Compare behavior",
        "lbl_enable_cancel": "Enable cancel during compare",
        "lbl_parameters": "Parameters",
        "lbl_notifications": "Notifications",
        "msg_visibility_controlled": "Visibility is controlled by Admin",
        "msg_reset_settings": "Reset settings to defaults?",
        "btn_reset_default": "Reset Default",
        "lbl_default_save_folder": "Default save folder",
        "msg_used_for_display": "Used for display. When a folder is chosen, saves go there.",
        "msg_compare_completed": "Comparison completed successfully!",
        "msg_compare_canceled": "Comparison canceled.",
        "msg_compare_failed": "Comparison failed: {error}",
        "msg_compare_success": "Comparison complete.",
        "msg_compare_error": "Failed to run comparison.",
        "msg_select_mod_file": "Please select a modified file.",
        "msg_same_name_warning": "Both selected files have the same name, but you can still proceed with the comparison.",
        "msg_err_gen_email": "Failed to generate email: {error}",
        "msg_download_complete": "Download complete.",
        "msg_email_downloaded": "Email downloaded.",
        "msg_save_complete": "Save complete.",
        "msg_email_saved": "Email saved.",
        "msg_saving": "Saving {name}...",
        "lbl_password_protected": "Documents are password-protected",
        "lbl_original_password": "Original Password",
        "lbl_modified_password": "Modified Password",
        "lbl_show_password": "Show password",
        "lbl_password_privacy_note": "Passwords are used only for this comparison and are not stored.",
        "lbl_rendering_options": "Rendering Parameters",
        "ph_rendering_options": "e.g. opt1=val1;opt2=val2",
        "ph_not_set": "Not set",
        "ph_redline_pdf": "Redline - ",
        "ph_redline_docx": "Redline - ",
        "ph_track_changes": "Track Changes - ",
        "ph_redline_pages": "Redline Pages - ",
        "ph_name_template": "{prefix}{original} and {modified}",
        "ph_email_subject_template": "Document Comparison ({original} vs {modified})"
      }
    };
    setModalLangJson(JSON.stringify(sample, null, 2));
  };

  if (loading || !settings) {
    return <AddinSettingsSkeleton />;
  }

  const saveOptionList = [
    { id: 'pdf', label: 'Redline PDF (.pdf)' },
    { id: 'docx', label: 'Redline Document (.docx)' },
    { id: 'track_changes', label: 'Track Changes DOCX (.docx)' },
    { id: 'changedPagesPdf', label: 'Changed Pages Only PDF (.pdf)' },
  ];

  const emailOptionList = [
    { id: 'original', label: 'Original Baseline' },
    { id: 'modified', label: 'Modified Revision' },
    { id: 'pdf', label: 'Redline PDF (.pdf)' },
    { id: 'docx', label: 'Redline DOCX (.docx)' },
    { id: 'track_changes', label: 'Track Changes DOCX (.docx)' },
    { id: 'changedPagesPdf', label: 'Changed Pages PDF (.pdf)' },
  ];

  // Preview computation
  const sampleOriginal = 'Contract_Agreement_v1';
  const sampleModified = 'Contract_Agreement_v2';
  const samplePrefix = settings.name_prefixes?.['pdf'] || 'Redline - ';
  const previewName = settings.name_template
    .replace('{prefix}', samplePrefix)
    .replace('{original}', sampleOriginal)
    .replace('{modified}', sampleModified);

  const previewSubject = settings.email_subject_template
    .replace('{original}', sampleOriginal)
    .replace('{modified}', sampleModified);

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-blue-400" />
            Office Add-in Settings & Behavior Rules
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure redline output formats, email attachment defaults, automated file naming, and user lock policies.
          </p>
        </div>

        
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center gap-2.5 border ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
              : 'bg-red-950/40 border-red-800/40 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Section 1: Save Redline Options Visibility */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <FileText className="w-4 h-4 text-blue-400" />
      <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
        1. Save Redline Options Visibility
      </h2>
    </div>
    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
      <span className="text-xs text-slate-300">Allow User Override:</span>
      <ToggleButton active={settings.user_override_save_options} onClick={() => setSettings({ ...settings, user_override_save_options: !settings.user_override_save_options })} />
    </div>
  </div>
        <p className="text-xs text-slate-400">
          Select which redline output format options are visible to end-users inside the Word Add-in taskpane.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {saveOptionList.map((opt) => {
            const isChecked = settings.show_save_options.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`p-3 rounded-lg border flex items-center gap-2.5 cursor-pointer text-xs transition ${
                  isChecked
                    ? 'bg-blue-600/10 border-blue-500/40 text-slate-100 font-medium'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <ToggleButton
                  active={isChecked}
                  onClick={() => {
                    const next = !isChecked
                      ? [...settings.show_save_options, opt.id]
                      : settings.show_save_options.filter((x) => x !== opt.id);
                    setSettings({ ...settings, show_save_options: next });
                  }}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Section 2: Email Options Visibility & Defaults */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Mail className="w-4 h-4 text-blue-400" />
      <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
        2. Email Attachment Options & Default Selection
      </h2>
    </div>
    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
      <span className="text-xs text-slate-300">Allow User Override:</span>
      <ToggleButton active={settings.user_override_email_options} onClick={() => setSettings({ ...settings, user_override_email_options: !settings.user_override_email_options })} />
    </div>
  </div>
        <p className="text-xs text-slate-400">
          Control which document versions appear in the email section and specify which items are checked by default.
        </p>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-300">Visible in Taskpane:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {emailOptionList.map((opt) => {
              const isVisible = settings.show_email_options.includes(opt.id);
              const isDefault = settings.default_email_checked.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs"
                >
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-200">
                    <ToggleButton
                      active={isVisible}
                      onClick={() => {
                        const nextVisible = !isVisible
                          ? [...settings.show_email_options, opt.id]
                          : settings.show_email_options.filter((x) => x !== opt.id);
                        const nextDefault = !isVisible
                          ? settings.default_email_checked
                          : settings.default_email_checked.filter((x) => x !== opt.id);
                        setSettings({
                          ...settings,
                          show_email_options: nextVisible,
                          default_email_checked: nextDefault,
                        });
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600"
                    />
                    <span>{opt.label}</span>
                  </label>

                  {isVisible && (
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-blue-400 pl-5">
                      <ToggleButton
                        active={isDefault}
                        onClick={() => {
                          const nextDefault = !isDefault
                            ? [...settings.default_email_checked, opt.id]
                            : settings.default_email_checked.filter((x) => x !== opt.id);
                          setSettings({ ...settings, default_email_checked: nextDefault });
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600"
                      />
                      <span>Check by default</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 3: Name Formatting & Templates */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              3. Automated File &amp; Email Templates
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Inline edit / save / cancel buttons */}
            {!templatesEditing ? (
              <button
                type="button"
                onClick={handleTemplatesEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
                title="Edit templates"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTemplatesSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60"
                  title="Save templates"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleTemplatesCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              {!(templatesEditing ? templatesForm.user_override_templates : settings.user_override_templates) ? (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="text-xs text-slate-300">Allow User Override:</span>
              <ToggleButton active={templatesEditing ? templatesForm.user_override_templates : settings.user_override_templates} onClick={() => templatesEditing && setTemplatesForm({ ...templatesForm, user_override_templates: !templatesForm.user_override_templates })} disabled={!templatesEditing} />
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!templatesEditing ? 'opacity-70' : ''}`}>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Default Name Template
            </label>
            <input
              type="text"
              disabled={!templatesEditing}
              value={templatesEditing ? templatesForm.name_template : settings.name_template}
              onChange={(e) => setTemplatesForm({ ...templatesForm, name_template: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none disabled:cursor-not-allowed"
            />
            <div className="text-[11px] text-slate-400">
              Available tags: <code className="text-blue-400">{'{prefix}'}</code>, <code className="text-blue-400">{'{original}'}</code>, <code className="text-blue-400">{'{modified}'}</code>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] text-slate-300 truncate">
              Preview: <span className="text-emerald-400 font-mono">{previewName}.pdf</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Email Subject Template
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                <span>Allow User Override:</span>
                <ToggleButton active={templatesEditing ? templatesForm.user_override_email_options : settings.user_override_email_options} onClick={() => templatesEditing && setTemplatesForm({ ...templatesForm, user_override_email_options: !templatesForm.user_override_email_options })} disabled={!templatesEditing} />
              </label>
            </div>
            <input
              type="text"
              disabled={!templatesEditing}
              value={templatesEditing ? templatesForm.email_subject_template : settings.email_subject_template}
              onChange={(e) => setTemplatesForm({ ...templatesForm, email_subject_template: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none disabled:cursor-not-allowed"
            />
            <div className="text-[11px] text-slate-400">
              Available tags: <code className="text-blue-400">{'{original}'}</code>, <code className="text-blue-400">{'{modified}'}</code>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] text-slate-300 truncate">
              Preview: <span className="text-indigo-400 font-mono">{previewSubject}</span>
            </div>
          </div>
        </div>

        {/* Prefixes Configuration */}
        <div className={`pt-3 border-t border-slate-800/80 space-y-2 ${!templatesEditing ? 'opacity-70' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-300">Format Name Prefixes:</div>
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-300">Allow User Override:</span>
              <ToggleButton active={templatesEditing ? templatesForm.user_override_prefixes : settings.user_override_prefixes} onClick={() => templatesEditing && setTemplatesForm({ ...templatesForm, user_override_prefixes: !templatesForm.user_override_prefixes })} disabled={!templatesEditing} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
            {['pdf', 'docx', 'track_changes', 'changedPagesPdf', 'default'].map((key) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">{key}</label>
                <input
                  type="text"
                  disabled={!templatesEditing}
                  value={templatesEditing ? (templatesForm.name_prefixes?.[key] || '') : (settings.name_prefixes?.[key] || '')}
                  onChange={(e) => {
                    const nextPrefixes = { ...templatesForm.name_prefixes, [key]: e.target.value };
                    setTemplatesForm({ ...templatesForm, name_prefixes: nextPrefixes });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Behavior & UX Options */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Sliders className="w-4 h-4 text-blue-400" />
      <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
        4. Taskpane Interaction Toggles
      </h2>
    </div>
    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
      <span className="text-xs text-slate-300">Allow User Override:</span>
      <ToggleButton active={settings.user_override_interaction_toggles} onClick={() => setSettings({ ...settings, user_override_interaction_toggles: !settings.user_override_interaction_toggles })} />
    </div>
  </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            {
              key: 'show_path_after_action',
              label: 'Show Saved Path Confirmation',
              desc: 'Notifies user of download destination folder',
            },
            {
              key: 'enable_cancel_compare',
              label: 'Allow Cancelling Compare Jobs',
              desc: 'Permits user to abort long-running comparisons',
            },
            {
              key: 'show_in_download_list',
              label: 'Show in Office Download List',
              desc: 'Registers saved outputs in Word MRU list',
            },
            {
              key: 'remember_last_folder',
              label: 'Remember Last Browse Folder',
              desc: 'Preserves previous file picker directory',
            },
          ].map((item) => {
            const isChecked = (settings as any)[item.key];
            return (
              <label
                key={item.key}
                className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer text-xs transition ${
                  isChecked
                    ? 'bg-blue-600/10 border-blue-500/40 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <ToggleButton active={isChecked} onClick={() => setSettings({ ...settings, [item.key]: !isChecked })} />
                <div>
                  <div className="font-semibold text-slate-200">{item.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Section 5: Multi-Language & Internationalization Support */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              5. Taskpane Multi-Language Support (i18n)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setModalLangCode('new');
                setModalLangJson(JSON.stringify({ code: "new", name: "New Language", translations: {} }, null, 2));
                setShowLangModal(true);
              }}
              className={`text-[10px] bg-emerald-900/40 text-emerald-400 hover:text-emerald-300 px-2 py-1.5 rounded ${!editMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!editMode}
            >
              + Add Language
            </button>
            <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              Active: English (Built-in) + Custom
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The Word Add-in taskpane interface and its settings modal automatically detect and adapt to the host <strong className="text-slate-200">Microsoft Word display language</strong> (<code className="text-blue-400">Office.context.displayLanguage</code>). Users can also toggle their preferred UI language directly from the taskpane header or the settings drawer at any time, with instant local persistence.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          
            {(() => {
              const baseLangs = [
                { code: 'en', name: 'EN (English)', flag: '🌐', defaultHint: 'Default / Word Host' }
              ];
              let customParsed = [];
              try {
                if (settings.custom_languages) {
                  customParsed = JSON.parse(settings.custom_languages);
                }
              } catch(e) {}
              const customMapped = customParsed.map(c => ({
                code: c.code,
                name: c.name || c.code.toUpperCase() + ' (Custom)',
                flag: '⚙️',
                defaultHint: 'Custom JSON',
                isCustom: true
              }));
              return [...baseLangs, ...customMapped];
            })().map((lang) => {
              return (
            <div
              key={lang.code}
              className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between relative"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{lang.flag}</span>
                <span className="text-xs font-medium text-slate-200">{lang.name}</span>
                </div>
                {(lang as any).isCustom && (
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button type="button" disabled={!editMode} onClick={() => {
                        let parsed = [];
                        try { parsed = JSON.parse(settings.custom_languages || '[]'); } catch(e){}
                        if (!Array.isArray(parsed)) parsed = [];
                        const langObj = parsed.find(l => l.code === lang.code) || lang;
                        setModalLangCode(lang.code);
                        setModalLangJson(JSON.stringify(langObj, null, 2));
                        setShowLangModal(true);
                      }} className={`text-slate-400 hover:text-blue-400 ${!editMode ? 'opacity-50 cursor-not-allowed' : ''}`} title="Edit JSON">
                        ✏️
                      </button>
                      <button type="button" disabled={!editMode} onClick={() => {
                        if (window.confirm(`Are you sure you want to delete the custom language '${lang.code}'?`)) {
                          try {
                            let customParsed = JSON.parse(settings.custom_languages || '[]');
                            customParsed = customParsed.filter((c: any) => c.code !== lang.code);
                            setSettings({ ...settings, custom_languages: customParsed.length > 0 ? JSON.stringify(customParsed, null, 2) : '' });
                          } catch(e) {}
                        }
                      }} className={`text-slate-400 hover:text-red-400 ${!editMode ? 'opacity-50 cursor-not-allowed' : ''}`} title="Delete">
                        🗑️
                      </button>
                    </div>
                  )}
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px]">
                <span className="font-mono text-slate-400">{lang.code.toUpperCase()}</span>
                <span className="text-emerald-400">{lang.defaultHint}</span>
              </div>
            </div>
          )})}
        </div>
      
      </div>
    
      
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              6. Additional Settings
            </h2>
          </div>
          <div className="flex flex-col gap-4 mt-4 bg-slate-900 p-4 rounded-lg border border-slate-800">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800/50 pb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">Allow Custom Rendering Options</p>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Allow users to specify custom rendering parameters in the taskpane for the compare request.
                </p>
              </div>
              <ToggleButton active={settings.allow_custom_rendering_options} onClick={() => setSettings({ ...settings, allow_custom_rendering_options: !settings.allow_custom_rendering_options })} />
            </div>
            <div className="flex items-start justify-between gap-4 pt-1">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">Enable Password Fields</p>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Enable the "Documents are password-protected" fields on the taskpane. If disabled, users cannot provide passwords on the taskpane UI.
                </p>
              </div>
              <ToggleButton active={settings.enable_password_fields} onClick={() => setSettings({ ...settings, enable_password_fields: !settings.enable_password_fields })} />
            </div>
          </div>
        </div>
      </div>


        {/* Section 7: Taskpane Settings Menu */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                7. Taskpane Settings Menu
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-2">Control which configuration options are visible to users inside the Add-in Settings menu.</p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer mb-2 font-semibold text-slate-200">
              <ToggleButton active={settings.hide_settings} onClick={() => setSettings({ ...settings, hide_settings: !settings.hide_settings })} />
              <span>Hide Entire Settings Menu</span>
            </label>
            <div className={`pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs ${settings.hide_settings ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_settings_save_menu_items} onClick={() => setSettings({ ...settings, hide_settings_save_menu_items: !settings.hide_settings_save_menu_items })} />
                <span>Hide Save menu items</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_settings_email_menu_items} onClick={() => setSettings({ ...settings, hide_settings_email_menu_items: !settings.hide_settings_email_menu_items })} />
                <span>Hide Email menu items</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_settings_default_checked} onClick={() => setSettings({ ...settings, hide_settings_default_checked: !settings.hide_settings_default_checked })} />
                <span>Hide Default checked in Email menu</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_settings_save_behavior} onClick={() => setSettings({ ...settings, hide_settings_save_behavior: !settings.hide_settings_save_behavior })} />
                <span>Hide Save behavior section</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_settings_compare_behavior} onClick={() => setSettings({ ...settings, hide_settings_compare_behavior: !settings.hide_settings_compare_behavior })} />
                <span>Hide Compare behavior section</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_settings_name_prefixes} onClick={() => setSettings({ ...settings, hide_settings_name_prefixes: !settings.hide_settings_name_prefixes })} />
                <span>Hide Default name prefixes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_settings_email_subject} onClick={() => setSettings({ ...settings, hide_settings_email_subject: !settings.hide_settings_email_subject })} />
                <span>Hide Email subject</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_settings_show_in_download_list} onClick={() => setSettings({ ...settings, hide_settings_show_in_download_list: !settings.hide_settings_show_in_download_list })} />
                <span>Hide Show in download list</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_settings_remember_last_folder} onClick={() => setSettings({ ...settings, hide_settings_remember_last_folder: !settings.hide_settings_remember_last_folder })} />
                <span>Hide Remember last selected folder</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_settings_show_saved_path} onClick={() => setSettings({ ...settings, hide_settings_show_saved_path: !settings.hide_settings_show_saved_path })} />
                <span>Hide Show saved path</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 8: Taskpane Front Settings */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                8. Taskpane Front Settings
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-2">Control which buttons are visible on the main taskpane screen.</p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_button_email} onClick={() => setSettings({ ...settings, hide_button_email: !settings.hide_button_email })} />
                <span>Hide Email Button</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_button_view} onClick={() => setSettings({ ...settings, hide_button_view: !settings.hide_button_view })} />
                <span>Hide View button</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <ToggleButton active={settings.hide_button_cancel} onClick={() => setSettings({ ...settings, hide_button_cancel: !settings.hide_button_cancel })} />
                <span>Hide Cancel button</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 9: Header Branding */}

      
      <div className="flex justify-end pt-6">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer mr-3"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{resetting ? 'Resetting...' : 'Reset Defaults'}</span>
          </button>

      </div>
    
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        {editMode ? (
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
              setEditMode(true);
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
                          
                          setSettings({...settings, custom_languages: JSON.stringify(parsed, null, 2)});
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
