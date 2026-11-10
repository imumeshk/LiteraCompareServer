import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getManifestSettings, updateManifestSettings } from '../models/manifestSettings.js';
import { generateManifestXml } from '../services/manifestGenerator.js';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/', requireAuth, (req: Request, res: Response) => {
  const settings = getManifestSettings();
  res.json(settings);
});

router.put('/', requireAuth, (req: Request, res: Response) => {
  const updated = updateManifestSettings(req.body);

  // Regenerate manifest.xml immediately and save it so it's always up to date
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
    console.error('Failed to regenerate manifest xml on update:', err);
  }

  res.json(updated);
});

export default router;
