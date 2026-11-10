import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { UnsavedChangesProvider } from './context/UnsavedChangesContext';
import { Layout } from './components/Layout';
import { SetupWizard } from './pages/SetupWizard';
import { Login } from './pages/Login';
import { Configuration } from './pages/Configuration';
import { InstallerWizard } from './pages/InstallerWizard';
import { AddinSettings } from './pages/AddinSettings';
import { ViewerSettings } from './pages/ViewerSettings';
import { AdminUsers } from './pages/AdminUsers';
import { EntraSSO } from './pages/EntraSSO';
import { ActivityDashboard } from './pages/ActivityDashboard';

const AdminAppContent: React.FC = () => {
  const { user, loading, setupRequired, installed } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('server');

  // Handle installer route explicitly
  if (window.location.pathname === '/installer') {
    return <InstallerWizard onComplete={() => { window.location.href = '/'; }} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        <div className="text-xs font-medium tracking-wide">Connecting to Litera Compare Server...</div>
      </div>
    );
  }

  // First-run setup mode or missing deployment: force app setup
  if ((setupRequired || !installed) && window.location.pathname !== '/installer') {
    window.location.href = '/installer';
    return null;
  }

  // Not authenticated: render login portal
  if (!user && window.location.pathname !== '/installer') {
    return <Login />;
  }

  // Authenticated: render main admin management dashboard
  return (
    <Layout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {currentTab === 'server' && <Configuration />}
      {currentTab === 'viewer' && <ViewerSettings />}
      {currentTab === 'sso' && <EntraSSO />}
      {currentTab === 'activity' && <ActivityDashboard />}
      {currentTab === 'addin' && <AddinSettings />}
      {currentTab === 'users' && <AdminUsers />}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <UnsavedChangesProvider>
          <AdminAppContent />
        </UnsavedChangesProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
