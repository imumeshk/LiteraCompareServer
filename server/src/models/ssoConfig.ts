import { queryGet, queryRun, queryExec } from '../db/client.js';

export interface SsoConfig {
  id: number;
  enabled: boolean;
  tenant_id: string;
  client_id: string;
  addin_redirect_uri: string;
  web_redirect_uri: string;
  allowed_domains: string;
  scopes: string;
  require_login_to_compare: boolean;
  authority_url?: string;
  updated_at: string;
}

export const DEFAULT_SSO_CONFIG: Omit<SsoConfig, 'id'> = {
  enabled: true,
  tenant_id: '',
  client_id: '',
  addin_redirect_uri: 'https://localhost:3000/addin/auth-callback.html',
  web_redirect_uri: 'https://localhost:3000/viewer/auth-callback.html',
  allowed_domains: '',
  scopes: 'User.Read openid profile email',
  require_login_to_compare: true,
  authority_url: '',
  updated_at: new Date().toISOString(),
};

export function getSsoConfig(): SsoConfig {
  const row = queryGet<any>('SELECT * FROM sso_config WHERE id = 1');
  if (!row) {
    // Insert default
    queryRun(
      `INSERT INTO sso_config (
        id, enabled, tenant_id, client_id, addin_redirect_uri, web_redirect_uri,
        allowed_domains, scopes, require_login_to_compare, authority_url, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DEFAULT_SSO_CONFIG.enabled ? 1 : 0,
        DEFAULT_SSO_CONFIG.tenant_id,
        DEFAULT_SSO_CONFIG.client_id,
        DEFAULT_SSO_CONFIG.addin_redirect_uri,
        DEFAULT_SSO_CONFIG.web_redirect_uri,
        DEFAULT_SSO_CONFIG.allowed_domains,
        DEFAULT_SSO_CONFIG.scopes,
        DEFAULT_SSO_CONFIG.require_login_to_compare ? 1 : 0,
        DEFAULT_SSO_CONFIG.authority_url || '',
        DEFAULT_SSO_CONFIG.updated_at,
      ]
    );
    return { id: 1, ...DEFAULT_SSO_CONFIG };
  }

  return {
    id: row.id,
    enabled: Boolean(row.enabled),
    tenant_id: row.tenant_id,
    client_id: row.client_id,
    addin_redirect_uri: row.addin_redirect_uri,
    web_redirect_uri: row.web_redirect_uri,
    allowed_domains: row.allowed_domains || '',
    scopes: row.scopes || 'User.Read openid profile email',
    require_login_to_compare: Boolean(row.require_login_to_compare),
    authority_url: row.authority_url || `https://login.microsoftonline.com/${row.tenant_id}`,
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export function updateSsoConfig(updates: Partial<SsoConfig>): SsoConfig {
  const current = getSsoConfig();
  const merged: SsoConfig = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (merged.tenant_id) {
    merged.authority_url = `https://login.microsoftonline.com/${merged.tenant_id}`;
  }

  queryRun(
    `UPDATE sso_config SET
      enabled = ?,
      tenant_id = ?,
      client_id = ?,
      addin_redirect_uri = ?,
      web_redirect_uri = ?,
      allowed_domains = ?,
      scopes = ?,
      require_login_to_compare = ?,
      authority_url = ?,
      updated_at = ?
    WHERE id = 1`,
    [
      merged.enabled ? 1 : 0,
      merged.tenant_id,
      merged.client_id,
      merged.addin_redirect_uri,
      merged.web_redirect_uri,
      merged.allowed_domains,
      merged.scopes,
      merged.require_login_to_compare ? 1 : 0,
      merged.authority_url || '',
      merged.updated_at,
    ]
  );

  return getSsoConfig();
}
