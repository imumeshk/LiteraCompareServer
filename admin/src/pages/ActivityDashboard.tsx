import React, { useState, useEffect } from 'react';
import {
  api,
  ComparisonActivity,
  ActivityDashboardSummary,
  ActivitySettings,
  SsoEventSummary,
  toast,
} from '../api/client';
import { useUnsavedChanges } from '../context/UnsavedChangesContext';
import { Skeleton } from '../components/Skeleton';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  Search,
  RefreshCw,
  Users,
  Monitor,
  Laptop,
  Check,
  X,
  Eye,
  Save,
  Globe,
  Settings,
  ShieldCheck,
  Edit2,
} from 'lucide-react';

export const ActivityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'settings'>('dashboard');

  // Settings State
  const [settings, setSettings] = useState<ActivitySettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false);

  // Dashboard & Activity State
  const [summary, setSummary] = useState<ActivityDashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [ssoEventSummary, setSsoEventSummary] = useState<SsoEventSummary | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [activeUsersList, setActiveUsersList] = useState<any[]>([]);
  const [showActiveUsersGrid, setShowActiveUsersGrid] = useState<boolean>(false);

  const { setHasUnsavedChanges } = useUnsavedChanges();
  
  useEffect(() => {
    setHasUnsavedChanges(isEditingSettings);
    return () => setHasUnsavedChanges(false);
  }, [isEditingSettings, setHasUnsavedChanges]);

  const [logs, setLogs] = useState<ComparisonActivity[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  const [usersList, setUsersList] = useState<Array<{ email: string; name: string }>>([]);

  // Filter State
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'addin' | 'web'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'unknown' | 'failed_any'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [viewLog, setViewLog] = useState<ComparisonActivity | null>(null);
  const [activeUserForModal, setActiveUserForModal] = useState<any | null>(null);
  const [activeUserLogs, setActiveUserLogs] = useState<ComparisonActivity[]>([]);

  const handleViewActiveUser = async (user: any) => {
    setActiveUserForModal(user);
    try {
      const data = await api.getSsoActivity({
        user: user.type === 'sso' ? user.email : undefined,
        search: user.type === 'guest' ? user.id : undefined,
        limit: 50,
        offset: 0,
      });
      setActiveUserLogs(data.items);
    } catch (err) {}
  };
  
  const [ssoEnabled, setSsoEnabled] = useState<boolean>(true);

  // Initial Load
  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

  const refreshDashboard = () => {
    if (activeTab === 'dashboard') {
      loadSummary();
      loadSsoEventSummary();
      loadActiveUsers();
    } else if (activeTab === 'logs') {
      loadLogs();
    }
    setLastRefreshed(new Date());
  };

  const loadActiveUsers = async () => {
    try {
      const users = await api.getActiveUsers();
      setActiveUsersList(users);
    } catch (err) {}
  };

  // Reload data on tab change or filter change
  useEffect(() => {
    refreshDashboard();
    
    const interval = setInterval(() => {
      refreshDashboard();
    }, 10000); // 10 seconds auto-refresh

    return () => clearInterval(interval);
  }, [activeTab, filterUser, filterSource, filterStatus, searchQuery]);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const data = await api.getActivitySettings();
      setSettings(data);
      const ssoConfig = await api.getSsoConfig();
      setSsoEnabled(ssoConfig.enabled);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load activity settings.');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    if (!isEditingSettings) {
      setIsEditingSettings(true);
      return;
    }

    try {
      setSavingSettings(true);
      const updated = await api.updateActivitySettings(settings);
      setSettings(updated);
      setIsEditingSettings(false);
      toast.success('Activity tracking settings saved.', 'Settings Saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const loadUsers = async () => {
    try {
      const list = await api.getSsoUsers(); // using the old rename or current
      setUsersList(list);
    } catch (err) {}
  };

  const loadSummary = async () => {
    if (settings?.logging_enabled === false) return;
    try {
      setLoadingSummary(true);
      const data = await api.getSsoSummary({ user: filterUser, source: filterSource, status: filterStatus });
      setSummary(data);
    } catch (err: any) {
      toast.error('Failed to load user activity dashboard.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadSsoEventSummary = async () => {
    try {
      const data = await api.getSsoEventSummary();
      setSsoEventSummary(data);
    } catch (err) {}
  };

  const loadLogs = async () => {
    if (settings?.logging_enabled === false) return;
    try {
      setLoadingLogs(true);
      const data = await api.getSsoActivity({
        user: filterUser, source: filterSource, status: filterStatus, search: searchQuery, limit: 100,
      });
      setLogs(data.items);
      setTotalLogs(data.total);
    } catch (err: any) {
      toast.error('Failed to load comparison logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleDownloadReport = (format: 'csv' | 'json') => {
    const url = api.getExportUrl({ user: filterUser, source: filterSource, status: filterStatus, search: searchQuery }, format);
    window.open(url, '_blank');
    toast.info('Preparing export...', 'Export Started');
  };

  if (loadingSettings && !settings) {
    return <div className="p-10 animate-pulse text-slate-500">Loading Dashboard...</div>;
  }

  const isLoggingDisabled = settings?.logging_enabled === false;

  return (
    <div className="space-y-6 relative">
      {/* Top Header & Tabs */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
              Activity Tracking
              <button 
                onClick={refreshDashboard} 
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition" 
                title={`Last refreshed: ${lastRefreshed.toLocaleTimeString()}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Monitor server usage, user activity, and comparison logs</p>
          </div>
        </div>
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-md transition"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-md transition"
          >
            <Search className="w-3.5 h-3.5" /> Audit Log
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-md transition"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>
      </div>

      {isLoggingDisabled && activeTab !== 'settings' && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Activity tracking is currently disabled. Historical data is shown, but no new activity is being logged.
        </div>
      )}

      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-100 mb-4">Master Tracking Control</h2>
            
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-200">Enable Activity Tracking</div>
                <div className="text-xs text-slate-400 mt-1">Master switch to enable or completely disable all tracking</div>
              </div>
              <button
                type="button"
                disabled={!isEditingSettings}
                onClick={() => setSettings({...settings, logging_enabled: !settings.logging_enabled})}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.logging_enabled ? 'bg-blue-600' : 'bg-slate-700'} ${!isEditingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${settings.logging_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h2 className="text-sm font-bold text-slate-100">Logging Conditions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ssoEnabled && (
                  <label className={`flex items-start gap-3 p-4 bg-slate-900/40 border border-slate-800 rounded-lg transition ${settings.logging_enabled && isEditingSettings ? 'cursor-pointer hover:border-slate-700' : 'opacity-50 cursor-not-allowed'}`}>
                    <input type="checkbox" disabled={!settings.logging_enabled || !isEditingSettings} checked={settings.log_with_sso} onChange={(e) => setSettings({...settings, log_with_sso: e.target.checked})} className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 disabled:cursor-not-allowed" />
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Log SSO Users</div>
                      <div className="text-xs text-slate-400 mt-1">Record activity when users are authenticated via Microsoft Entra ID.</div>
                    </div>
                  </label>
                )}
                <label className={`flex items-start gap-3 p-4 bg-slate-900/40 border border-slate-800 rounded-lg transition ${settings.logging_enabled && isEditingSettings ? 'cursor-pointer hover:border-slate-700' : 'opacity-50 cursor-not-allowed'}`}>
                  <input type="checkbox" disabled={!settings.logging_enabled || !isEditingSettings} checked={settings.log_without_sso} onChange={(e) => setSettings({...settings, log_without_sso: e.target.checked})} className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 disabled:cursor-not-allowed" />
                  <div>
                    <div className="text-sm font-semibold text-slate-200">Log Anonymous/Guest Users</div>
                    <div className="text-xs text-slate-400 mt-1">Record activity when SSO is disabled or bypassed. Captures IP/Machine Info.</div>
                  </div>
                </label>
              </div>

              <h2 className="text-sm font-bold text-slate-100 pt-4">Data Retention Policy</h2>
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg">
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Activity Retention (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  disabled={!isEditingSettings}
                  value={settings.retention_days}
                  onChange={(e) => setSettings({...settings, retention_days: Number(e.target.value)})}
                  className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Logs older than this number of days will be automatically purged by the server. Maximum 180 days.
                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
            {isEditingSettings ? (
              <button
                type="submit"
                disabled={savingSettings}
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
                  setIsEditingSettings(true);
                }}
                className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all transform hover:scale-105 cursor-pointer"
                title="Edit Settings"
              >
                <Edit2 className="w-6 h-6" />
              </button>
            )}
          </div>
        </form>
      )}

      {/* DASHBOARD TAB OMITTED FOR BREVITY, IN REALITY IT WOULD BE HERE */}
      {activeTab === 'dashboard' && summary && (
        <div className="space-y-6">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase">Total Compare Requests</div>
                <div className="text-2xl font-bold text-slate-100">{summary.totalRequests}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="text-xs font-semibold text-emerald-400 uppercase">Successful Comparisons</div>
                <div className="text-2xl font-bold text-emerald-400">{summary.successfulRequests}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="text-xs font-semibold text-red-400 uppercase">Server Failures / Errors</div>
                <div className="text-2xl font-bold text-red-400">{summary.failedRequests}</div>
              </div>
              <button 
                onClick={() => setShowActiveUsersGrid(!showActiveUsersGrid)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2 text-left hover:border-indigo-500 hover:bg-slate-900 transition flex flex-col items-start"
              >
                <div className="text-xs font-semibold text-indigo-400 uppercase">Active Users Online</div>
                <div className="text-2xl font-bold text-slate-100">{activeUsersList.length}</div>
              </button>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="text-xs font-semibold text-blue-400 uppercase">Add-in SSO Logins</div>
                <div className="text-2xl font-bold text-slate-100">{ssoEventSummary?.addinLogins ?? '—'}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="text-xs font-semibold text-indigo-400 uppercase">Web Portal SSO Logins</div>
                <div className="text-2xl font-bold text-slate-100">{ssoEventSummary?.webLogins ?? '—'}</div>
              </div>
           </div>

           {showActiveUsersGrid && (
             <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden mt-6">
               <div className="p-4 border-b border-slate-800 bg-slate-900">
                 <h2 className="text-sm font-bold text-slate-100">Active Users Online</h2>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs text-slate-300">
                   <thead className="bg-slate-900 border-b border-slate-800">
                     <tr>
                       <th className="p-3">User / IP</th>
                       <th className="p-3">Type</th>
                       <th className="p-3">Taskpane Login</th>
                       <th className="p-3">Viewer Login</th>
                       <th className="p-3 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                     {activeUsersList.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="p-4 text-center text-slate-500">No active users found.</td>
                       </tr>
                     ) : (
                       activeUsersList.map(user => (
                         <tr key={user.id} className="hover:bg-slate-900/50">
                           <td className="p-3 font-semibold">{user.name} {user.email && <span className="text-[10px] text-slate-500 block">{user.email}</span>}</td>
                           <td className="p-3">{user.type === 'sso' ? <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">SSO</span> : <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">Guest</span>}</td>
                           <td className="p-3">{user.taskpane_time ? new Date(user.taskpane_time).toLocaleString() : '—'}</td>
                           <td className="p-3">{user.web_time ? new Date(user.web_time).toLocaleString() : '—'}</td>
                           <td className="p-3 text-right">
                             <button onClick={() => handleViewActiveUser(user)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 transition text-white rounded text-xs flex items-center gap-1 ml-auto">
                               <Eye className="w-3 h-3"/> View Activity
                             </button>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
           )}
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
           {/* Filters */}
           <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5 flex-1 min-w-[150px]">
                 <label className="text-xs font-semibold text-slate-400">Username</label>
                 <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white">
                    <option value="all">All Users</option>
                    {usersList.map(u => <option key={u.email} value={u.email}>{u.name} ({u.email})</option>)}
                 </select>
              </div>
              <div className="space-y-1.5 flex-1 min-w-[150px]">
                 <label className="text-xs font-semibold text-slate-400">IP / Search</label>
                 <input type="text" placeholder="Search IP or filename..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-[150px]">
                 <label className="text-xs font-semibold text-slate-400">Source</label>
                 <select value={filterSource} onChange={e => setFilterSource(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white">
                    <option value="all">All Sources</option>
                    <option value="addin">Office Add-in</option>
                    <option value="web">Web Portal</option>
                 </select>
              </div>
              <div className="space-y-1.5 flex-1 min-w-[150px]">
                 <label className="text-xs font-semibold text-slate-400">Status</label>
                 <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white">
                    <option value="all">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                 </select>
              </div>
              <div>
                 <button onClick={() => handleDownloadReport('csv')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition text-white rounded text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5"/> Export</button>
              </div>
           </div>
           
           <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
             <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Status</th>
                    <th className="p-3">User / Machine</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-900/50">
                      <td className="p-3">{log.http_status_code}</td>
                      <td className="p-3">
                        <div className="font-semibold">{log.user_name}</div>
                        <div className="text-[10px] text-slate-500">{log.machine_info || log.ip_address}</div>
                      </td>
                      <td className="p-3">{log.source}</td>
                      <td className="p-3">
                        <div>O: {log.original_filename}</div>
                        <div>M: {log.modified_filename}</div>
                      </td>
                      <td className="p-3">
                        <button onClick={() => setViewLog(log)} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs flex items-center gap-1"><Eye className="w-3 h-3"/> View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Modal for single activity detail */}
      {viewLog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-100">Log Details (ID: {viewLog.id})</h3>
              <button onClick={() => setViewLog(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-300">
              
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div><span className="text-slate-500">Date/Time:</span> {new Date(viewLog.created_at).toLocaleString()}</div>
                <div><span className="text-slate-500">User:</span> {viewLog.user_name} ({viewLog.user_email})</div>
                <div><span className="text-slate-500">Source:</span> {viewLog.source}</div>
                <div><span className="text-slate-500">IP Address:</span> {viewLog.ip_address}</div>
                <div><span className="text-slate-500">Machine/Browser:</span> {viewLog.machine_info || 'N/A'}</div>
                <div><span className="text-slate-500">Status:</span> {viewLog.http_status_code}</div>
                <div><span className="text-slate-500">Duration:</span> {viewLog.duration_ms}ms</div>
                <div><span className="text-slate-500">Total Changes:</span> {viewLog.total_changes}</div>
                <div className="col-span-2"><span className="text-slate-500">Custom Rendering:</span> {viewLog.has_custom_rendering ? 'Yes' : 'No'}</div>
                {viewLog.rendering_parameters && <div className="col-span-2"><span className="text-slate-500">Rendering Params:</span> <code className="block bg-slate-900 p-2 rounded mt-1">{viewLog.rendering_parameters}</code></div>}
              </div>

              <div>
                <h4 className="font-bold mb-2 text-blue-400">Request Headers</h4>
                <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg overflow-x-auto text-[11px] font-mono whitespace-pre-wrap">
                  {viewLog.request_headers ? (function(){
                    try {
                      const parsed = JSON.parse(viewLog.request_headers);
                      if (typeof parsed === 'string') {
                        // check if it's double-encoded JSON
                        try { const p2 = JSON.parse(parsed); if (typeof p2 === 'object') return JSON.stringify(p2, null, 2); } catch(e){}
                        return parsed;
                      }
                      return JSON.stringify(parsed, null, 2);
                    } catch(e) {
                      return viewLog.request_headers;
                    }
                  })() : 'No headers recorded.'}
                </pre>
              </div>
              
              <div>
                <h4 className="font-bold mb-2 text-indigo-400">Response Headers</h4>
                <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg overflow-x-auto text-[11px] font-mono whitespace-pre-wrap">
                  {viewLog.response_headers ? (function(){
                    try {
                      const parsed = JSON.parse(viewLog.response_headers);
                      if (typeof parsed === 'string') {
                        try { const p2 = JSON.parse(parsed); if (typeof p2 === 'object') return JSON.stringify(p2, null, 2); } catch(e){}
                        return parsed;
                      }
                      return JSON.stringify(parsed, null, 2);
                    } catch(e) {
                      return viewLog.response_headers;
                    }
                  })() : 'No headers recorded.'}
                </pre>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal for active user activity */}
      {activeUserForModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                Activity Log: {activeUserForModal.name}
              </h3>
              <button onClick={() => setActiveUserForModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Source</th>
                      <th className="p-3">Original File</th>
                      <th className="p-3">Modified File</th>
                      <th className="p-3">Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {activeUserLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500">No activity recorded for this user recently.</td>
                      </tr>
                    ) : (
                      activeUserLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-900/50">
                          <td className="p-3">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-semibold ${log.http_status_code >= 200 && log.http_status_code < 300 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                              {log.http_status_code}
                            </span>
                          </td>
                          <td className="p-3">{log.source}</td>
                          <td className="p-3" title={log.original_filename}>{log.original_filename.length > 20 ? log.original_filename.substring(0, 20) + '...' : log.original_filename}</td>
                          <td className="p-3" title={log.modified_filename}>{log.modified_filename.length > 20 ? log.modified_filename.substring(0, 20) + '...' : log.modified_filename}</td>
                          <td className="p-3">{log.total_changes}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
