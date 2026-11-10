import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ServerConfig, SsoConfig } from '../api/client';
import {
  Server,
  Settings,
  Eye,
  Users,
  Wand2,
  LogOut,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  AlertCircle
} from 'lucide-react';

interface LayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  children: React.ReactNode;
}

import { useUnsavedChanges } from '../context/UnsavedChangesContext';

export const Layout: React.FC<LayoutProps> = ({ currentTab, onSelectTab, children }) => {
  const { user, logout } = useAuth();
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [ssoConfig, setSsoConfig] = useState<SsoConfig | null>(null);
  const [pendingTabNavigation, setPendingTabNavigation] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [srvCfg, ssoCfg] = await Promise.all([
          api.getConfig(),
          api.getSsoConfig()
        ]);
        setConfig(srvCfg);
        setSsoConfig(ssoCfg);
        if (srvCfg.app_name) {
          document.title = srvCfg.app_name;
        }
      } catch (err) {
        console.error('Failed to fetch layout config', err);
      }
    };
    fetchData();
  }, []);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('litera_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('litera_admin_sidebar_collapsed', next.toString());
  };

  const navItems = [
    { id: 'server', label: 'Configuration', icon: Server, desc: 'URLs, manifest, & SSO' },
    { id: 'viewer', label: 'Viewer Settings', icon: Eye, desc: 'Viewer UI & Categories', hidden: config?.install_mode === 'addin' },
    { id: 'activity', label: 'Activity Tracking', icon: Activity, desc: 'Logs, settings & dashboard' },
    { id: 'addin', label: 'Add-in Settings', icon: Settings, desc: 'Save/email & template rules', hidden: config?.install_mode === 'viewer' },
    { id: 'users', label: 'Admin Accounts', icon: Users, desc: 'Manage access & security' },
  ].filter(item => !item.hidden);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out select-none`}
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
          {/* Brand Header */}
          <div
            className={`p-4 border-b border-slate-800 flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between'
            } transition-all`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow-md shrink-0 cursor-pointer"
                title="Litera Compare Admin Console"
                onClick={isCollapsed ? toggleSidebar : undefined}
              >
                L
              </div>
              {!isCollapsed && (
                <div className="transition-opacity duration-200 truncate">
                  <div className="font-bold text-slate-100 text-base tracking-tight truncate">{config?.app_name || 'Admin Console'}</div>
                  <div className="text-xs text-blue-400 font-medium truncate">Settings & Management</div>
                </div>
              )}
            </div>
            
            {/* Collapse/Expand Toggle Button */}
            {!isCollapsed && (
              <button
                onClick={toggleSidebar}
                title="Collapse Sidebar"
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors shrink-0 hidden md:block"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1 mt-2">
            {!isCollapsed ? (
              <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Management
              </div>
            ) : (
              <div className="w-full flex justify-center py-1">
                <div className="w-6 h-px bg-slate-800 my-1" />
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => {
                    if (hasUnsavedChanges && currentTab !== item.id) {
                      setPendingTabNavigation(item.id);
                    } else {
                      onSelectTab(item.id);
                    }
                  }}
                  title={isCollapsed ? `${item.label} (${item.desc})` : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center p-3' : 'items-start gap-3 px-3 py-2.5'
                  } rounded-lg text-left transition-all group relative ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    } ${!isCollapsed ? 'mt-0.5' : ''}`}
                  />
                  {!isCollapsed && (
                    <div className="overflow-hidden">
                      <div className="text-sm leading-snug truncate">{item.label}</div>
                      <div className="text-[11px] text-slate-400 truncate">{item.desc}</div>
                    </div>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      <div className="font-semibold text-slate-100">{item.label}</div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Live Endpoints & User Footprint */}
        <div className={`p-3 border-t border-slate-800 space-y-3 ${isCollapsed ? 'items-center' : ''}`}>
          {!isCollapsed ? (
            <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Live Endpoints
              </div>
              <div className="space-y-1 text-xs">
                {['full', 'addin'].includes(config?.install_mode || 'full') && (
                  <a
                    href="/addin/src/taskpane/taskpane.html"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-slate-300 hover:text-blue-400 transition"
                  >
                    <span>Word Add-in</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {['full', 'viewer'].includes(config?.install_mode || 'full') && (
                  <a
                    href="/viewer/home.html"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-slate-300 hover:text-blue-400 transition"
                  >
                    <span>Delta Viewer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {['full', 'addin'].includes(config?.install_mode || 'full') && (
                  <a
                    href="/api/installer/manifest"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-slate-300 hover:text-blue-400 transition"
                  >
                    <span>manifest.xml</span>
                    <FileCode className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* Collapsed Quick Endpoints Row */
            <div className="flex flex-col items-center gap-2 py-1">
              {['full', 'addin'].includes(config?.install_mode || 'full') && (
                <a
                  href="/addin/src/taskpane/taskpane.html"
                  target="_blank"
                  rel="noreferrer"
                  title="Open Word Add-in Taskpane"
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {['full', 'viewer'].includes(config?.install_mode || 'full') && (
                <a
                  href="/viewer/home.html"
                  target="_blank"
                  rel="noreferrer"
                  title="Open Delta Viewer"
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {['full', 'addin'].includes(config?.install_mode || 'full') && (
                <a
                  href="/api/installer/manifest"
                  target="_blank"
                  rel="noreferrer"
                  title="Download manifest.xml"
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                >
                  <FileCode className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* User & Logout */}
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between'} pt-1`}>
            <div className="flex items-center gap-2 overflow-hidden" title={`${user?.username || 'Admin'} (Active Session)`}>
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 uppercase shrink-0">
                  {user?.username?.[0] || 'A'}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-medium text-slate-200 truncate">{user?.username}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Active Session
                  </div>
                </div>
              )}
            </div>
            <button
              id="btn-logout"
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-900 p-8">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>

      {/* Unsaved Changes Modal */}
      {pendingTabNavigation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Unsaved Changes
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                You have unsaved changes on this page. If you leave now, your edits will be discarded. Do you want to proceed?
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-950 flex justify-end gap-3 border-t border-slate-800">
              <button
                onClick={() => setPendingTabNavigation(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
              >
                Stay on page
              </button>
              <button
                onClick={() => {
                  setHasUnsavedChanges(false);
                  onSelectTab(pendingTabNavigation);
                  setPendingTabNavigation(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
