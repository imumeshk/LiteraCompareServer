import React, { useState, useEffect } from 'react';
import { api, ManifestSettings } from '../api/client';
import { X, Save, RefreshCw } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const ManifestSettingsModal: React.FC<Props> = ({ onClose }) => {
  const [settings, setSettings] = useState<ManifestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getManifestSettings().then((res) => {
      setSettings(res);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateManifestSettings(settings);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const generateUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  if (loading || !settings) return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">Loading...</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Manifest Configuration</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Manifest ID</label>
            <div className="flex gap-2">
              <input type="text" value={settings.manifest_id} onChange={e => setSettings({...settings, manifest_id: e.target.value})} className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
              <button type="button" onClick={() => setSettings({...settings, manifest_id: generateUuid()})} className="px-3 py-2 bg-slate-800 rounded-md text-slate-300 hover:bg-slate-700 text-sm flex items-center gap-1"><RefreshCw className="w-4 h-4"/> Generate</button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Version</label>
              <input type="text" value={settings.version} onChange={e => setSettings({...settings, version: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Provider Name</label>
              <input type="text" value={settings.provider_name} onChange={e => setSettings({...settings, provider_name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Default Locale</label>
              <input type="text" value={settings.default_locale} onChange={e => setSettings({...settings, default_locale: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Display Name</label>
              <input type="text" value={settings.display_name} onChange={e => setSettings({...settings, display_name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea value={settings.description} onChange={e => setSettings({...settings, description: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 rows-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Icon URL (relative to Add-in)</label>
              <input type="text" value={settings.icon_url} onChange={e => setSettings({...settings, icon_url: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">High Res Icon URL</label>
              <input type="text" value={settings.high_resolution_icon_url} onChange={e => setSettings({...settings, high_resolution_icon_url: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Office Tab ID</label>
              <input type="text" value={settings.office_tab_id} onChange={e => setSettings({...settings, office_tab_id: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Group ID</label>
              <input type="text" value={settings.group_id} onChange={e => setSettings({...settings, group_id: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Taskpane ID</label>
              <input type="text" value={settings.taskpane_id} onChange={e => setSettings({...settings, taskpane_id: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Debug Logger Tag</label>
              <input type="text" value={settings.debug_logger_tag} onChange={e => setSettings({...settings, debug_logger_tag: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Support URL</label>
            <input type="text" value={settings.support_url} onChange={e => setSettings({...settings, support_url: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200" />
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white text-sm">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg flex items-center gap-2">
            <Save className="w-4 h-4"/>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};
