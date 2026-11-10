import React, { useState, useEffect, useRef } from 'react';
import { api, ServerConfig, toast } from '../api/client';
import { useUnsavedChanges } from '../context/UnsavedChangesContext';
import { ServerSettingsSkeleton } from '../components/Skeleton';
import { Server, Settings, Save, Edit2, Download, UploadCloud, Database } from 'lucide-react';
import { ManifestSettingsModal } from '../components/ManifestSettingsModal';
import { EntraSSO } from './EntraSSO';

export const Configuration: React.FC = () => {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [compareUrl, setCompareUrl] = useState('');
  const [enqueueUrl, setEnqueueUrl] = useState('');
  const [activeEndpoint, setActiveEndpoint] = useState<'compare' | 'enqueue'>('compare');
  const [pendingEndpoint, setPendingEndpoint] = useState<'compare' | 'enqueue' | null>(null);
  const [showToggleModal, setShowToggleModal] = useState(false);
  
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  const [brandLogo, setBrandLogo] = useState('');
  const [brandTitle, setBrandTitle] = useState('');
  const [brandSubtitle, setBrandSubtitle] = useState('');
  
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState<boolean>(true);
  const [ssoLoaded, setSsoLoaded] = useState<boolean>(false);
  const [ssoHasTenantId, setSsoHasTenantId] = useState<boolean>(false);

  const [corsMode, setCorsMode] = useState<'bypass' | 'strict' | 'custom'>('bypass');
  const [corsOrigins, setCorsOrigins] = useState('');
  const [showCorsModal, setShowCorsModal] = useState(false);

  const { setHasUnsavedChanges } = useUnsavedChanges();
  
  useEffect(() => {
    setHasUnsavedChanges(isEditing);
    return () => setHasUnsavedChanges(false);
  }, [isEditing, setHasUnsavedChanges]);

  useEffect(() => {
    loadConfig();
  }, []);

  const [targetRestoreType, setTargetRestoreType] = useState<'master' | 'config' | 'addin' | 'viewer' | null>(null);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreSuccessModal, setRestoreSuccessModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await api.getConfig();
      setConfig(data);
      setCompareUrl(data.compare_server_url);
      setEnqueueUrl(data.enqueue_endpoint_url || '');
      setActiveEndpoint(data.active_endpoint || 'compare');
      setBrandLogo(data.brand_logo_text || '');
      setBrandTitle(data.brand_title || '');
      setBrandSubtitle(data.brand_subtitle || '');
      setCorsMode(data.cors_mode || 'bypass');
      setCorsOrigins(data.cors_allowed_origins || '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.updateConfig({
        compare_server_url: compareUrl.trim(),
        enqueue_endpoint_url: enqueueUrl.trim(),
        active_endpoint: activeEndpoint,
        brand_logo_text: brandLogo,
        brand_title: brandTitle,
        brand_subtitle: brandSubtitle,
        cors_mode: corsMode,
        cors_allowed_origins: corsOrigins
      });
      setIsEditing(false);
      toast.success('Configuration saved successfully.');
      await loadConfig();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = (type: 'master' | 'config' | 'addin' | 'viewer') => {
    api.downloadBackup(type);
  };

  const handleRestoreClick = (type: 'master' | 'config' | 'addin' | 'viewer') => {
    setTargetRestoreType(type);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.type !== targetRestoreType) {
          toast.error(`It's not a ${targetRestoreType} backup you cannot restore it here`);
          return;
        }
        setPendingRestoreData(json);
        setConfirmCheckbox(false);
        setShowRestoreModal(true);
      } catch (err: any) {
        toast.error(err.message || 'Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const executeRestore = async () => {
    try {
      await api.restoreBackup(pendingRestoreData);
      setShowRestoreModal(false);
      setRestoreSuccessModal(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore backup.');
    }
  };

  const handleToggleEndpoint = (endpoint: 'compare' | 'enqueue') => {
    if (activeEndpoint === endpoint) return;
    setPendingEndpoint(endpoint);
    setShowToggleModal(true);
  };

  const confirmToggleEndpoint = async () => {
    if (!pendingEndpoint) return;
    try {
      await api.updateConfig({ active_endpoint: pendingEndpoint });
      setActiveEndpoint(pendingEndpoint);
      setConfig(prev => prev ? { ...prev, active_endpoint: pendingEndpoint } : null);
      setPendingEndpoint(null);
      toast.success('Active endpoint updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update active endpoint.');
    } finally {
      setShowToggleModal(false);
    }
  };

  if (loading || !config) return <ServerSettingsSkeleton />;

  return (
    <form onSubmit={handleSave} className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            Configuration
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage component URLs, manifest settings, and SSO</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Component URLs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-800">
            <h2 className="font-semibold text-slate-200">Component URLs</h2>
          </div>
          <div className="p-5 space-y-6 flex-1">
            {/* Compare Server URL */}
            <div className={`space-y-2 p-4 rounded-lg border transition-colors ${activeEndpoint === 'compare' ? 'bg-blue-900/10 border-blue-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-300">Compare Server URL</label>
                <button 
                  type="button" 
                  onClick={() => handleToggleEndpoint('compare')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${activeEndpoint === 'compare' ? 'bg-blue-600' : 'bg-slate-700'}`}
                  title={activeEndpoint === 'compare' ? 'Active' : 'Click to set active'}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeEndpoint === 'compare' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={compareUrl}
                  onChange={(e) => setCompareUrl(e.target.value)}
                  disabled={!isEditing}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Enqueue Endpoint URL */}
            <div className={`space-y-2 p-4 rounded-lg border transition-colors ${activeEndpoint === 'enqueue' ? 'bg-blue-900/10 border-blue-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-300">Enqueue Endpoint URL</label>
                <button 
                  type="button" 
                  onClick={() => handleToggleEndpoint('enqueue')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${activeEndpoint === 'enqueue' ? 'bg-blue-600' : 'bg-slate-700'}`}
                  title={activeEndpoint === 'enqueue' ? 'Active' : 'Click to set active'}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeEndpoint === 'enqueue' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={enqueueUrl}
                  onChange={(e) => setEnqueueUrl(e.target.value)}
                  disabled={!isEditing}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="e.g. https://enqueue.litera.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Manifest URL */}
        {(config.install_mode === 'full' || config.install_mode === 'addin') && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-800">
              <h2 className="font-semibold text-slate-200">Manifest settings</h2>
            </div>
            <div className="p-5 space-y-4 flex-1">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Addin Manifest File URL</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={`${config.app_base_url.replace(/\/+$/, '')}/api/installer/manifest`}
                    readOnly
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowManifestModal(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg whitespace-nowrap transition flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Configure
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Brand Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-semibold text-slate-200">Brand Header</h2>
          </div>
          <div className="p-5 space-y-4 flex-1">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Brand Logo Text (Max 2 chars)</label>
              <input
                type="text"
                maxLength={2}
                value={brandLogo}
                onChange={(e) => setBrandLogo(e.target.value)}
                disabled={!isEditing}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g. L"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Brand Title</label>
              <input
                type="text"
                value={brandTitle}
                onChange={(e) => setBrandTitle(e.target.value)}
                disabled={!isEditing}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g. Compare Server"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Brand Subtitle</label>
              <input
                type="text"
                value={brandSubtitle}
                onChange={(e) => setBrandSubtitle(e.target.value)}
                disabled={!isEditing}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g. Enterprise Document Comparison"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security & CORS */}
      <div className="mt-8 border-t border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Security & CORS Policies</h2>
            <p className="text-xs text-slate-400">Control who can access the API and embed the viewers</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">CORS & Framing Policy Mode</label>
              <div className="flex items-center gap-4">
                <select
                  value={corsMode}
                  onChange={(e) => {
                    const val = e.target.value as 'bypass' | 'strict' | 'custom';
                    setCorsMode(val);
                    if (val === 'custom') {
                      setShowCorsModal(true);
                    }
                  }}
                  disabled={!isEditing}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 min-w-[200px]"
                >
                  <option value="bypass">Bypass (Allow All)</option>
                  <option value="strict">Strict (Same-Origin Only)</option>
                  <option value="custom">Custom (Allowed Origins)</option>
                </select>
                
                {corsMode === 'custom' && (
                  <button
                    type="button"
                    onClick={() => setShowCorsModal(true)}
                    disabled={!isEditing}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition disabled:opacity-50"
                  >
                    Edit Allowed Origins
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {corsMode === 'bypass' && "Permissive mode: allows any external site to embed the app or call the API. Not recommended for production."}
                {corsMode === 'strict' && "Strict mode: blocks all external embedding and cross-origin API calls. Only the app itself can access its resources."}
                {corsMode === 'custom' && "Custom mode: only explicitly allowed domains can embed the app or call the API."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SSO Config */}
      <div className={`mt-8 border-t border-slate-800 pt-8 transition-opacity ${!ssoLoaded ? 'hidden' : ''}`}>
         <EntraSSO 
           onLoaded={(enabled, hasTenantId) => {
             setSsoEnabled(enabled);
             setSsoHasTenantId(hasTenantId);
             setSsoLoaded(true);
           }}
         />
      </div>

      {/* Backup & Restore */}
      <div className="mt-8 border-t border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Backup & Restore</h2>
            <p className="text-xs text-slate-400">Download configurations or restore them from a JSON file</p>
          </div>
        </div>
        
        <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Master Backup */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-full">
            <div>
              <h3 className="font-semibold text-slate-200 mb-1">Master Backup</h3>
              <p className="text-xs text-slate-400 mb-4">Configuration + Add-in + Viewer + Activity + SSO + Manifest</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleBackup('master')} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Backup
              </button>
              <button type="button" onClick={() => handleRestoreClick('master')} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <UploadCloud className="w-4 h-4" /> Restore
              </button>
            </div>
          </div>

          {/* Configuration Backup */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-full">
            <div>
              <h3 className="font-semibold text-slate-200 mb-1">Configuration Backup</h3>
              <p className="text-xs text-slate-400 mb-4">Configuration + Activity + SSO</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleBackup('config')} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Backup
              </button>
              <button type="button" onClick={() => handleRestoreClick('config')} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <UploadCloud className="w-4 h-4" /> Restore
              </button>
            </div>
          </div>

          {/* Add-in Backup */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-full">
            <div>
              <h3 className="font-semibold text-slate-200 mb-1">Add-in Backup</h3>
              <p className="text-xs text-slate-400 mb-4">Add-in settings + Manifest configuration</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleBackup('addin')} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Backup
              </button>
              <button type="button" onClick={() => handleRestoreClick('addin')} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <UploadCloud className="w-4 h-4" /> Restore
              </button>
            </div>
          </div>

          {/* Viewer Backup */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-full">
            <div>
              <h3 className="font-semibold text-slate-200 mb-1">Viewer Backup</h3>
              <p className="text-xs text-slate-400 mb-4">Viewer Settings</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleBackup('viewer')} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Backup
              </button>
              <button type="button" onClick={() => handleRestoreClick('viewer')} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <UploadCloud className="w-4 h-4" /> Restore
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Manifest Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Confirm Restore</h3>
            <p className="text-sm text-slate-300 mb-4">
              You are about to restore a {targetRestoreType} backup. This action will overwrite your current settings.
            </p>
            <label className="flex items-center gap-2 mb-6 cursor-pointer">
              <input type="checkbox" checked={confirmCheckbox} onChange={(e) => setConfirmCheckbox(e.target.checked)} className="rounded border-slate-700 text-blue-600 bg-slate-900" />
              <span className="text-sm text-slate-200">I confirm proceeding with the restore</span>
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowRestoreModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition">Cancel</button>
              <button type="button" onClick={executeRestore} disabled={!confirmCheckbox} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">Restore</button>
            </div>
          </div>
        </div>
      )}

      {restoreSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Restore Successful</h3>
            <p className="text-sm text-slate-300 mb-6">
              The {targetRestoreType} backup has been restored successfully. The application will now reload to apply the changes.
            </p>
            <div className="flex justify-end">
              <button type="button" onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition">OK</button>
            </div>
          </div>
        </div>
      )}

      {showCorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Custom CORS Allowed Origins
              </h2>
              <button 
                type="button"
                onClick={() => {
                  setShowCorsModal(false);
                  if (!corsOrigins.trim()) setCorsMode('bypass');
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-300 mb-4">
                Enter a comma-separated list of trusted origins that are allowed to make cross-origin API calls and embed the Viewer/Taskpane.
              </p>
              <textarea
                value={corsOrigins}
                onChange={(e) => setCorsOrigins(e.target.value)}
                placeholder="https://app.litera.com, https://office.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 min-h-[120px] font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                Note: Do not include trailing slashes. Example: <code className="text-slate-400">https://example.com</code>
              </p>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
              <button 
                type="button"
                onClick={() => {
                  setShowCorsModal(false);
                  if (!corsOrigins.trim()) setCorsMode('bypass');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowCorsModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
              >
                Apply Custom Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {showManifestModal && (
        <ManifestSettingsModal onClose={() => setShowManifestModal(false)} />
      )}

      {/* Toggle Endpoint Modal */}
      {showToggleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Switch Active Endpoint</h3>
            <p className="text-sm text-slate-300 mb-6">
              You are about to switch the active comparison endpoint to <span className="font-semibold text-white">{pendingEndpoint === 'compare' ? 'Compare Server URL' : 'Enqueue Endpoint URL'}</span>. This will immediately apply to all connected clients.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowToggleModal(false); setPendingEndpoint(null); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition">Cancel</button>
              <button type="button" onClick={confirmToggleEndpoint} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition">OK</button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        {isEditing ? (
          <button
            type="submit"
            disabled={isSaving}
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
              setIsEditing(true);
            }}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all transform hover:scale-105 cursor-pointer"
            title="Edit Settings"
          >
            <Edit2 className="w-6 h-6" />
          </button>
        )}
      </div>
    </form>
  );
};
