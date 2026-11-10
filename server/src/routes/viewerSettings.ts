import { Router, Request, Response } from 'express';
import { getViewerSettings, updateViewerSettings } from '../models/viewerSettings.js';
import { getServerConfig } from '../models/serverConfig.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// GET /api/viewer-settings - Public for viewer & admin
router.get('/', (req: Request, res: Response) => {
  try {
    const settings = getViewerSettings();
    const config = getServerConfig();
    res.json({
      ...settings,
      brand_initial: config.brand_logo_text,
      brand_name: config.brand_title,
      brand_sub: config.brand_subtitle
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/viewer-settings - Protected by admin auth
router.put('/', requireAuth, (req: Request, res: Response) => {
  try {
    const updated = updateViewerSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
