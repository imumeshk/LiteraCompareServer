import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { queryGet, queryRun } from '../db/client.js';
import { updateServerConfig } from '../models/serverConfig.js';
import { updateSsoConfig } from '../models/ssoConfig.js';
import { updateManifestSettings } from '../models/manifestSettings.js';
import { updateAddinSettings } from '../models/addinSettings.js';
import { updateViewerSettings } from '../models/viewerSettings.js';
import { updateActivitySettings } from '../models/activitySettings.js';
import { generateManifestXml } from '../services/manifestGenerator.js';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const type = req.query.type as string || 'master';
    const backup: any = { type, timestamp: new Date().toISOString() };

    if (['master', 'config'].includes(type)) {
      backup.server_config = queryGet('SELECT * FROM server_config WHERE id = 1');
      backup.sso_config = queryGet('SELECT * FROM sso_config WHERE id = 1');
      backup.activity_settings = queryGet('SELECT * FROM activity_settings WHERE id = 1');
    }
    
    if (['master', 'addin'].includes(type)) {
      backup.addin_settings = queryGet('SELECT * FROM addin_settings WHERE id = 1');
      backup.manifest_settings = queryGet('SELECT * FROM manifest_settings WHERE id = 1');
    }

    if (['master', 'viewer'].includes(type)) {
      backup.viewer_settings = queryGet('SELECT * FROM viewer_settings WHERE id = 1');
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="litera-backup-${type}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore', requireAuth, (req: Request, res: Response) => {
  try {
    const backup = req.body;
    
    if (backup.server_config) {
      updateServerConfig(backup.server_config);
    }
    if (backup.sso_config) {
      updateSsoConfig(backup.sso_config);
    }
    if (backup.activity_settings) {
      updateActivitySettings(backup.activity_settings);
    }
    if (backup.addin_settings) {
      updateAddinSettings(backup.addin_settings);
    }
    if (backup.viewer_settings) {
      updateViewerSettings(backup.viewer_settings);
    }
    if (backup.manifest_settings) {
      updateManifestSettings(backup.manifest_settings);
      
      // Regenerate manifest.xml and save to disk
      const manifestXml = generateManifestXml();
      const addinManifestPath = path.join(process.cwd(), 'addin/manifest.xml');
      const serverManifestPath = path.join(process.cwd(), 'server/src/static/manifest.xml');
      
      try {
        if (fs.existsSync(path.dirname(addinManifestPath))) {
          fs.writeFileSync(addinManifestPath, manifestXml, 'utf-8');
        }
        if (fs.existsSync(path.dirname(serverManifestPath))) {
          fs.writeFileSync(serverManifestPath, manifestXml, 'utf-8');
        }
      } catch (err) {
        console.error('Failed to regenerate manifest xml on restore:', err);
      }
    }

    res.json({ success: true, message: 'Restore completed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as backupRouter };
