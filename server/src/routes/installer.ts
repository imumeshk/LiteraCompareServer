import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { runDeploy } from '../services/deployRunner.js';
import { generateManifestXml } from '../services/manifestGenerator.js';
import { getServerConfig } from '../models/serverConfig.js';
import { countAdminUsers } from '../models/adminUser.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// POST /api/installer/run - Runs the deploy runner
// If no admin users exist yet (first-time installation), permit run; otherwise require auth
router.post('/run', (req: Request, res: Response, next) => {
  const adminCount = countAdminUsers();
  if (adminCount === 0) {
    return next();
  }
  return requireAuth(req, res, next);
}, async (req: Request, res: Response) => {
  try {
    const result = await runDeploy(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/installer/manifest - Download the generated manifest.xml
router.get('/manifest', (req: Request, res: Response) => {
  try {
    const config = getServerConfig();
    const manifestXml = generateManifestXml();

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="manifest.xml"');
    res.send(manifestXml);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/installer/export-bundle - Download server config export
router.get('/export-bundle', requireAuth, (req: Request, res: Response) => {
  try {
    const config = getServerConfig();
    const manifestXml = generateManifestXml();
    const bundle = {
      app: 'litera-compare-server',
      version: '1.2.0',
      exported_at: new Date().toISOString(),
      server_config: config,
      manifest_xml: manifestXml,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="litera-compare-config-bundle.json"');
    res.send(JSON.stringify(bundle, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
