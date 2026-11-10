import React, { useState, useEffect } from 'react';
import { api, SsoConfig, toast } from '../api/client';
import { Skeleton } from '../components/Skeleton';
import { Shield, Key, CheckCircle2, AlertCircle, Save, Sliders, RefreshCw, Edit2, ExternalLink, ChevronDown, ChevronRight, LogIn } from 'lucide-react';

export interface EntraSSOProps {
  onLoaded: (enabled: boolean, hasTenantId: boolean) => void;
}

export const EntraSSO: React.FC<EntraSSOProps> = ({ onLoaded }) => {
  const [config, setConfig] = useState<SsoConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [testingConfig, setTestingConfig] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  // Form Fields
  const [ssoEnabled, setSsoEnabled] = useState<boolean>(true);
  const [tenantId, setTenantId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [addinRedirectUri, setAddinRedirectUri] = useState<string>('');
  const [webRedirectUri, setWebRedirectUri] = useState<string>('');
  const [allowedDomains, setAllowedDomains] = useState<string>('');
  const [scopes, setScopes] = useState<string>('');
  const [requireLogin, setRequireLogin] = useState<boolean>(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      const data = await api.getSsoConfig();
      setConfig(data);
      setSsoEnabled(data.enabled);
      setTenantId(data.tenant_id);
      setClientId(data.client_id);
      setAddinRedirectUri(data.addin_redirect_uri);
      setWebRedirectUri(data.web_redirect_uri);
      setAllowedDomains(data.allowed_domains);
      setScopes(data.scopes);
      setRequireLogin(data.require_login_to_compare);
      
      setIsEditing(false); // Always start in read-only view; user clicks "Edit Configuration" to make changes
      onLoaded(data.enabled, !!data.tenant_id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load Microsoft Entra SSO configuration.');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      const updated = await api.updateSsoConfig({
        enabled: ssoEnabled,
        tenant_id: tenantId.trim(),
        client_id: clientId.trim(),
        addin_redirect_uri: addinRedirectUri.trim(),
        web_redirect_uri: webRedirectUri.trim(),
        allowed_domains: allowedDomains.trim(),
        scopes: scopes.trim(),
        require_login_to_compare: requireLogin,
      });
      setConfig(updated);
      setIsEditing(false);
      toast.success('Microsoft Entra SSO settings saved successfully.', 'SSO Config Saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save SSO configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConfig(true);
      setTestResult(null);
      const res = await api.testSsoConfig({
        tenant_id: tenantId.trim(),
        client_id: clientId.trim(),
      });
      setTestResult(res);
      toast.success('Microsoft Entra ID discovery endpoints validated successfully.', 'Connection Verified');
    } catch (err: any) {
      toast.error(err.message || 'Failed to validate Microsoft Entra connection.');
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingConfig(false);
    }
  };

  if (loadingConfig && !config) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="border-b border-slate-800 pb-5 space-y-2">
          <Skeleton className="h-6 w-80" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Microsoft Entra ID (SSO)</h1>
              <p className="text-xs text-slate-400 mt-0.5">Configure Azure Active Directory Single Sign-On and security policies</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveConfig} className="space-y-6">
        {/* Entra Guide */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setGuideOpen(!guideOpen)}
            className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                <LogIn className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-100 text-sm">Entra ID Setup Guide</div>
                <div className="text-xs text-slate-400">Step-by-step instructions to register this application</div>
              </div>
            </div>
            {guideOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </button>

          {guideOpen && (
            <div className="p-5 border-t border-slate-700 bg-slate-900/50 text-sm text-slate-300 space-y-4">
              <p>Follow these steps to manually register the Office Add-in & Delta Viewer in your Microsoft Entra ID (formerly Azure AD) tenant:</p>
              <ol className="list-decimal pl-5 space-y-2 marker:text-slate-500">
                <li>Go to the <a href="https://entra.microsoft.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Microsoft Entra admin center</a>.</li>
                <li>Navigate to <strong>Applications</strong> {'>'} <strong>App registrations</strong> and click <strong>New registration</strong>.</li>
                <li>Name the application (e.g., <em>Litera Compare Add-in & Viewer</em>).</li>
                <li>Set supported account types (usually <em>Accounts in this organizational directory only</em>).</li>
                <li>Under <strong>Redirect URI</strong>, select <strong>Single-page application (SPA)</strong>. Add the Word Add-in Redirect URI:<br/>
                  <code className="bg-slate-950 px-2 py-1 rounded text-blue-400 select-all mt-1 inline-block">{window.location.origin}/addin/auth-callback.html</code>
                </li>
                <li>Click <strong>Register</strong>.</li>
                <li>Copy the <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong> from the Overview page and paste them below.</li>
                <li>Go to <strong>Authentication</strong>, add another URI under SPA for the Web Viewer (if using the DeltaView portal):<br/>
                  <code className="bg-slate-950 px-2 py-1 rounded text-blue-400 select-all mt-1 inline-block">{window.location.origin}/viewer/auth-callback.html</code>
                </li>
                <li>In the same Authentication section, set the <strong>Front-channel logout URL</strong> to:<br/>
                  <code className="bg-slate-950 px-2 py-1 rounded text-blue-400 select-all mt-1 inline-block">{window.location.origin}/viewer/home.html</code><br/>
                  <span className="text-[11px] text-slate-400">Ensure <em>ID tokens</em> and <em>Access tokens</em> are checked for implicit grant (if required by your MSAL config).</span>
                </li>
                <li>Go to <strong>API permissions</strong> and grant admin consent for <code>User.Read</code>.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Status / Toggles */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-400" />
              Integration Status
            </h2>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800">
            <div>
              <div className="text-sm font-semibold text-slate-200">Enable Entra SSO Authentication</div>
              <div className="text-xs text-slate-400 mt-1">Allow users to sign in using their Microsoft 365 / Azure AD credentials</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const newVal = !ssoEnabled;
                setSsoEnabled(newVal);
                if (!isEditing) {
                  try {
                    await api.updateSsoConfig({ enabled: newVal });
                    toast.success(newVal ? 'SSO Enabled' : 'SSO Disabled');
                  } catch (e: any) {
                    toast.error('Failed to toggle SSO');
                    setSsoEnabled(!newVal);
                  }
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${ssoEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${ssoEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {ssoEnabled && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <label className="flex items-start gap-3 p-4 bg-slate-900/40 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition">
                <input disabled={!isEditing} type="checkbox" checked={requireLogin} onChange={(e) => setRequireLogin(e.target.checked)} className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600" />
                <div>
                  <div className="text-sm font-semibold text-slate-200">Require Login to Compare</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Lock compare buttons in both Add-in & Viewer until user signs in with Microsoft Entra ID.
                  </div>
                </div>
              </label>

              <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/60 flex items-center justify-between text-xs text-slate-300">
                <span className="text-slate-400">Authority URL:</span>
                <span className="font-mono text-blue-400 text-[11px] truncate max-w-[220px]">
                  https://login.microsoftonline.com/{tenantId || 'common'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            Entra ID App Registration Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Directory (Tenant) ID <span className="text-red-400">*</span>
              </label>
              <input
                id="sso-tenant-id"
                disabled={!isEditing}
                type="text"
                required={ssoEnabled}
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="e.g. 72f988bf-86f1-41af-91ab-2d7cd011db47 or 'common'"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The GUID of your Azure AD / Microsoft Entra tenant, or <code className="text-slate-400">organizations</code> for multi-tenant.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Application (Client) ID <span className="text-red-400">*</span>
              </label>
              <input
                id="sso-client-id"
                disabled={!isEditing}
                type="text"
                required={ssoEnabled}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 0981a23c-f45e-49b2-9df7-6d2c49e21890"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The Application (Client) ID assigned in the Azure Portal under App Registrations.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Word Add-in Redirect URI
              </label>
              <input
                id="sso-addin-redirect"
                disabled={!isEditing}
                type="text"
                value={addinRedirectUri}
                onChange={(e) => setAddinRedirectUri(e.target.value)}
                placeholder="https://localhost:3000/addin/auth-callback.html"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                SPA redirect URI configured in Azure App Registration for Office Add-in taskpane.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Web Delta Viewer Redirect URI
              </label>
              <input
                id="sso-web-redirect"
                disabled={!isEditing}
                type="text"
                value={webRedirectUri}
                onChange={(e) => setWebRedirectUri(e.target.value)}
                placeholder="https://localhost:3000/viewer/auth-callback.html"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                SPA redirect URI configured for the standalone DeltaView web portal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Blocked Email Domains (Tenant Restriction)
              </label>
              <input
                id="sso-allowed-domains"
                disabled={!isEditing}
                type="text"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                placeholder=""
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Comma-separated list of blocked email domains. Leave empty to allow any user in your tenant.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Microsoft Graph Scopes
              </label>
              <input
                id="sso-scopes"
                disabled={!isEditing}
                type="text"
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
                placeholder="User.Read openid profile email"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Standard OpenID Connect scopes requested during authorization.
              </p>
            </div>
          </div>

          {isEditing ? (
            <div className="pt-6 mt-6 border-t border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConfig || !tenantId || !clientId}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold transition disabled:opacity-50"
              >
                {testingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Test Connection
              </button>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    // Also reload config to revert unsaved changes
                    loadConfig();
                  }}
                  className="flex-1 md:flex-none items-center gap-2 px-5 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-200 rounded-lg text-sm font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {savingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-6 mt-6 border-t border-slate-800">
              {!tenantId && (
                <div className="mb-4 p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-center gap-2 text-amber-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>SSO is not yet configured. Click <strong>Edit Configuration</strong> to set up Microsoft Entra SSO.</span>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-sm font-bold transition"
                >
                  <Edit2 className="w-4 h-4" /> Edit Configuration
                </button>
              </div>
            </div>
          )}


          {testResult && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${testResult.success ? 'bg-emerald-950/30 border border-emerald-900/50 text-emerald-400' : 'bg-red-950/30 border border-red-900/50 text-red-400'} mt-4`}>
              {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <div>
                <div className="font-bold text-sm">{testResult.success ? 'Connection Successful' : 'Connection Failed'}</div>
                <div className="text-xs mt-1 opacity-80">{testResult.message || testResult.error}</div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
