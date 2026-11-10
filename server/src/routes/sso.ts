import { Router, Request, Response, NextFunction } from 'express';
import { getSsoConfig, updateSsoConfig } from '../models/ssoConfig.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { countAdminUsers } from '../models/adminUser.js';

const router = Router();

// GET /api/sso/config - Public client config or full admin config
router.get('/config', (req: Request, res: Response) => {
  const config = getSsoConfig();
  res.json({
    success: true,
    config,
    ...config,
  });
});

// PUT /api/sso/config - Admin only
router.put('/config', requireAuth, (req: Request, res: Response) => {
  const {
    enabled,
    tenant_id,
    client_id,
    addin_redirect_uri,
    web_redirect_uri,
    allowed_domains,
    scopes,
    require_login_to_compare,
  } = req.body;

  const rawUpdates: any = {
    enabled: typeof enabled === 'boolean' ? enabled : undefined,
    tenant_id: tenant_id?.trim(),
    client_id: client_id?.trim(),
    addin_redirect_uri: addin_redirect_uri?.trim(),
    web_redirect_uri: web_redirect_uri?.trim(),
    allowed_domains: allowed_domains?.trim(),
    scopes: scopes?.trim(),
    require_login_to_compare: typeof require_login_to_compare === 'boolean' ? require_login_to_compare : undefined,
  };

  const updatesToApply: any = {};
  for (const key in rawUpdates) {
    if (rawUpdates[key] !== undefined) {
      updatesToApply[key] = rawUpdates[key];
    }
  }

  const updated = updateSsoConfig(updatesToApply);

  res.json({
    success: true,
    config: updated,
    message: 'Microsoft Entra SSO configuration successfully saved.',
  });
});

// POST /api/sso/test - Validate Entra configuration by calling real OIDC discovery
router.post('/test', requireAuth, async (req: Request, res: Response) => {
  const { tenant_id, client_id } = req.body;
  const targetTenant = (tenant_id || getSsoConfig().tenant_id || '').trim();
  const targetClient = (client_id || getSsoConfig().client_id || '').trim();

  if (!targetTenant || !targetClient) {
    res.status(400).json({
      success: false,
      error: 'Tenant ID (Directory ID) and Client ID (Application ID) are required for testing.',
    });
    return;
  }

  const openIdUrl = `https://login.microsoftonline.com/${targetTenant}/v2.0/.well-known/openid-configuration`;

  try {
    const msResponse = await fetch(openIdUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!msResponse.ok) {
      let detail = `Microsoft returned HTTP ${msResponse.status}`;
      try {
        const errBody = await msResponse.json() as any;
        if (errBody?.error_description) detail = errBody.error_description;
        else if (errBody?.error) detail = errBody.error;
      } catch {}
      res.status(502).json({
        success: false,
        testedAt: new Date().toISOString(),
        tenant_id: targetTenant,
        client_id: targetClient,
        openIdConfigurationUrl: openIdUrl,
        error: `Tenant not found or invalid. ${detail}`,
      });
      return;
    }

    const oidcDoc = await msResponse.json() as any;

    res.json({
      success: true,
      testedAt: new Date().toISOString(),
      tenant_id: targetTenant,
      client_id: targetClient,
      openIdConfigurationUrl: openIdUrl,
      message: 'Microsoft Entra ID discovery endpoints validated successfully.',
      endpoints: {
        authorization_endpoint: oidcDoc.authorization_endpoint,
        token_endpoint: oidcDoc.token_endpoint,
        userinfo_endpoint: oidcDoc.userinfo_endpoint,
        issuer: oidcDoc.issuer,
      },
    });
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.code === 'UND_ERR_CONNECT_TIMEOUT';
    res.status(502).json({
      success: false,
      testedAt: new Date().toISOString(),
      tenant_id: targetTenant,
      client_id: targetClient,
      openIdConfigurationUrl: openIdUrl,
      error: isTimeout
        ? 'Connection timed out. Cannot reach login.microsoftonline.com â€” check server internet access.'
        : `Network error: ${err?.message || 'Unknown error'}`,
    });
  }
});

// POST /api/sso/events/log - Record SSO login/logout events from addin and viewer
router.post('/events/log', async (req: Request, res: Response) => {
  const {
    event_type,
    source,
    user_email,
    user_name,
    user_id,
  } = req.body;

  if (!event_type || !source) {
    res.status(400).json({ error: 'event_type and source are required.' });
    return;
  }

  if (!['login', 'logout'].includes(event_type)) {
    res.status(400).json({ error: 'event_type must be login or logout.' });
    return;
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  try {
    const { logSsoEvent } = await import('../models/ssoEvent.js');
    const recorded = logSsoEvent({
      event_type,
      source: source === 'addin' ? 'addin' : 'web',
      user_id: user_id || 'unknown',
      user_email: user_email || null,
      user_name: user_name || null,
      ip_address: clientIp,
      created_at: new Date().toISOString(),
    });
    res.json({ success: true, event: recorded });
  } catch (err: any) {
    console.error('Failed to log SSO event:', err);
    res.status(500).json({ error: 'Failed to record SSO event.' });
  }
});

// GET /api/sso/events/summary - Get SSO login counts by source
router.get('/events/summary', async (req: Request, res: Response) => {
  try {
    const { getSsoEventSummary } = await import('../models/ssoEvent.js');
    const summary = getSsoEventSummary();
    res.json({ success: true, summary });
  } catch (err: any) {
    console.error('Failed to get SSO event summary:', err);
    res.status(500).json({ error: 'Failed to load SSO event summary.' });
  }
});

export default router;


