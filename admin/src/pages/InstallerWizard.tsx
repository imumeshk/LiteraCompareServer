import React, { useState, useEffect } from 'react';
import { api, ServerConfig, DeployResult, toast, InstallMode, SsoConfig } from '../api/client';
import {
  Wand2,
  Check,
  ArrowRight,
  ArrowLeft,
  Server,
  Layers,
  FileCode,
  Download,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface InstallerWizardProps {
  onComplete?: () => void;
}

export const InstallerWizard: React.FC<InstallerWizardProps> = ({ onComplete }) => {
  const { setupRequired, setupFirstAdmin, user } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [deploying, setDeploying] = useState<boolean>(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [appName, setAppName] = useState('Litera Compare Server admin Console');
  const [appBaseUrl, setAppBaseUrl] = useState(window.location.origin);
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPass, setAdminPass] = useState('');
  const [adminPassConfirm, setAdminPassConfirm] = useState('');

  const [compareServerUrl, setCompareServerUrl] = useState('https://compare.litera.com/api/v1');
  const [installMode, setInstallMode] = useState<InstallMode>('full');
  
  const [addinUrl, setAddinUrl] = useState(window.location.origin + '/addin');
  const [viewerUrl, setViewerUrl] = useState(window.location.origin + '/viewer');
  
  const [ssoConfig, setSsoConfig] = useState<Partial<SsoConfig>>({
    tenant_id: '',
    client_id: ''
  });

  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    try {
      setLoading(true);
      const cfg = await api.getConfig();
      setAppName(cfg.app_name || 'Litera Compare');
      
      const isLocalhostSeed = (url: string) => url && url.includes('localhost:3000');
      
      setAppBaseUrl(isLocalhostSeed(cfg.app_base_url) ? window.location.origin : (cfg.app_base_url || window.location.origin));
      setCompareServerUrl(cfg.compare_server_url || '');
      setAddinUrl(isLocalhostSeed(cfg.addin_url) ? window.location.origin + '/addin' : (cfg.addin_url || window.location.origin + '/addin'));
      setViewerUrl(isLocalhostSeed(cfg.viewer_url) ? window.location.origin + '/viewer' : (cfg.viewer_url || window.location.origin + '/viewer'));
      setInstallMode(cfg.install_mode || 'full');

      try {
        const sso = await api.getSsoConfig();
        setSsoConfig(sso);
      } catch (e) {}

    } catch (err: any) {
      console.warn('Config fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasSsoValues = ssoConfig.tenant_id?.trim() !== '' && ssoConfig.client_id?.trim() !== '';

  const handleNext = async () => {
    setError(null);
    if (step === 1 && setupRequired) {
      if (adminPass.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (adminPass !== adminPassConfirm) {
        setError('Passwords do not match.');
        return;
      }
      try {
        await setupFirstAdmin(adminUser, adminPass);
      } catch (e: any) {
        setError(e.message || 'Failed to setup admin user');
        return;
      }
    }
    
    if (step < 6) {
      setStep(step + 1);
    }
  };

  const handleRunDeploy = async () => {
    setError(null);
    if (!confirmed) {
      setError('Please confirm deployment details before proceeding.');
      return;
    }
    setDeploying(true);

    try {
      await api.updateSsoConfig({
        enabled: hasSsoValues,
        tenant_id: ssoConfig.tenant_id,
        client_id: ssoConfig.client_id
      });

      const result = await api.runDeploy({
        app_name: appName.trim(),
        app_base_url: appBaseUrl.trim(),
        compare_server_url: compareServerUrl.trim(),
        addin_url: addinUrl.trim(),
        viewer_url: viewerUrl.trim(),
        install_mode: installMode,
      });

      setDeployResult(result);
      setStep(7);
      toast.success('Live deployment completed and manifest regenerated!', 'Deployment Success');
    } catch (err: any) {
      setError(err.message || 'Deploy execution failed.');
    } finally {
      setDeploying(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'App Settings', desc: 'Name, Base URL & Admin' },
    { num: 2, title: 'Compare Server', desc: 'External API endpoint' },
    { num: 3, title: 'Install Mode', desc: 'Deployment topology' },
    { num: 4, title: 'Component URLs', desc: 'Add-in and Viewer endpoints' },
    { num: 5, title: 'SSO Config', desc: 'Microsoft Entra Integration' },
    { num: 6, title: 'Confirmation', desc: 'Review & deploy' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 text-center text-slate-400">
        <div>
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          Loading installer settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-xl">
      <div className="border-b border-slate-800 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Wand2 className="w-5 h-5 text-blue-400" />
            Installer & Deployment Wizard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure and deploy the Litera Compare Server environment.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {step < 7 && (
        <div className="hidden md:flex gap-2">
          {stepsList.map((s) => (
            <div key={s.num} className={`flex-1 h-2 rounded-full ${step >= s.num ? 'bg-blue-600' : 'bg-slate-800'}`} />
          ))}
        </div>
      )}

      <div className="mt-8">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-200">1. General Application Settings</h2>
            
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Application Name</label>
                <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Application Base URL</label>
                <input type="text" value={appBaseUrl} onChange={(e) => setAppBaseUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>

              {setupRequired && (
                <div className="mt-8 space-y-4 border-t border-slate-800 pt-6">
                  <h3 className="text-md font-medium text-slate-300">Admin Login Setup</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                    <input type="text" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                    <input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                    <input type="password" value={adminPassConfirm} onChange={(e) => setAdminPassConfirm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-200">2. Compare Server</h2>
            <p className="text-sm text-slate-400 max-w-lg">Enter the base URL of your Litera Compare Server API endpoint.</p>
            
            <div className="max-w-lg">
              <label className="block text-sm font-medium text-slate-300 mb-1">Compare Server URL</label>
              <input type="text" value={compareServerUrl} onChange={(e) => setCompareServerUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-200">3. Installation Mode</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <button onClick={() => setInstallMode('full')} className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${installMode === 'full' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                <Layers className={`w-10 h-10 mb-3 ${installMode === 'full' ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="font-semibold text-slate-200">Full</span>
                <span className="text-xs text-slate-400 mt-2 text-center">Add-in, Admin, and Viewer</span>
              </button>
              <button onClick={() => setInstallMode('addin')} className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${installMode === 'addin' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                <FileCode className={`w-10 h-10 mb-3 ${installMode === 'addin' ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="font-semibold text-slate-200">Add-in</span>
                <span className="text-xs text-slate-400 mt-2 text-center">Office Add-in & Admin only</span>
              </button>
              <button onClick={() => setInstallMode('viewer')} className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${installMode === 'viewer' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                <ExternalLink className={`w-10 h-10 mb-3 ${installMode === 'viewer' ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="font-semibold text-slate-200">Delta Viewer</span>
                <span className="text-xs text-slate-400 mt-2 text-center">Viewer & Admin only</span>
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-200">4. Component URLs</h2>
            <div className="space-y-4 max-w-lg">
              {['full', 'addin'].includes(installMode) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Office Add-in Host Website URL</label>
                  <input type="text" value={addinUrl} onChange={(e) => setAddinUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              )}
              {['full', 'viewer'].includes(installMode) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Delta Viewer Website URL</label>
                  <input type="text" value={viewerUrl} onChange={(e) => setViewerUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-200">5. SSO Configuration</h2>
            
            <div className="space-y-4 max-w-lg mt-4 border border-slate-800 rounded-lg p-5 bg-slate-900/50">
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Configure Microsoft Entra SSO. These fields are <span className="text-slate-300 font-medium">optional during setup</span>. If you fill them out, SSO will be enabled. You can always configure or disable this from the Admin Panel later.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tenant ID</label>
                <input type="text" value={ssoConfig.tenant_id} onChange={(e) => setSsoConfig({ ...ssoConfig, tenant_id: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 8eaef023-..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Client ID</label>
                <input type="text" value={ssoConfig.client_id} onChange={(e) => setSsoConfig({ ...ssoConfig, client_id: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. d42c9431-..." />
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-slate-200">6. Confirmation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 relative group">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">App Name</div>
                <div className="font-medium text-slate-200">{appName}</div>
                <button onClick={() => setStep(1)} className="absolute top-4 right-4 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition">Edit</button>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 relative group">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Base URL</div>
                <div className="font-medium text-slate-200">{appBaseUrl}</div>
                <button onClick={() => setStep(1)} className="absolute top-4 right-4 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition">Edit</button>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 relative group">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Compare Server</div>
                <div className="font-medium text-slate-200 truncate">{compareServerUrl}</div>
                <button onClick={() => setStep(2)} className="absolute top-4 right-4 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition">Edit</button>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 relative group">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Install Mode</div>
                <div className="font-medium text-slate-200 capitalize">{installMode}</div>
                <button onClick={() => setStep(3)} className="absolute top-4 right-4 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition">Edit</button>
              </div>
              {['full', 'addin'].includes(installMode) && (
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 relative group">
                  <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Add-in URL</div>
                  <div className="font-medium text-slate-200 truncate">{addinUrl}</div>
                  <button onClick={() => setStep(4)} className="absolute top-4 right-4 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition">Edit</button>
                </div>
              )}
              {['full', 'viewer'].includes(installMode) && (
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 relative group">
                  <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Viewer URL</div>
                  <div className="font-medium text-slate-200 truncate">{viewerUrl}</div>
                  <button onClick={() => setStep(4)} className="absolute top-4 right-4 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition">Edit</button>
                </div>
              )}
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 relative group">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">SSO Enabled</div>
                <div className="font-medium text-slate-200">{hasSsoValues ? 'Yes' : 'No'}</div>
                <button onClick={() => setStep(5)} className="absolute top-4 right-4 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition">Edit</button>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-4 border border-blue-900/30 bg-blue-500/5 rounded-lg hover:bg-blue-500/10 transition mt-6">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="w-5 h-5 rounded border-blue-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-950" />
              <div className="font-medium text-slate-200">I confirm the above deployment configuration</div>
            </label>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-6 text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Deployment Successful</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Your server configuration and manifest file have been successfully generated and deployed.
            </p>
            <div className="pt-6">
              <button onClick={async () => {
                  try {
                    await api.logout();
                  } catch (e) {}
                  if (onComplete) onComplete(); 
                }} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2">
                Go to Admin Portal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {step < 7 && (
        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between">
          <button onClick={() => setStep(step - 1)} disabled={step === 1 || deploying} className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          {step < 6 ? (
            <button onClick={handleNext} disabled={deploying} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleRunDeploy} disabled={!confirmed || deploying} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2 transition-all">
              {deploying ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Deploying...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  Deploy Configuration
                </>
              )}
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
