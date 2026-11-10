import { Router, Request, Response } from 'express';
import { getAddinSettings, updateAddinSettings, resetAddinSettings } from '../models/addinSettings.js';
import { getServerConfig } from '../models/serverConfig.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// GET /api/addin-settings - Public for add-in & admin
router.get('/', (req: Request, res: Response) => {
  try {
    const settings = getAddinSettings();
    const config = getServerConfig();
    res.json({
      ...settings,
      brand_logo_text: config.brand_logo_text,
      brand_title: config.brand_title,
      brand_subtitle: config.brand_subtitle,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/addin-settings - Protected by admin auth
router.put('/', requireAuth, (req: Request, res: Response) => {
  try {
    const updated = updateAddinSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/addin-settings/reset - Protected by admin auth
router.post('/reset', requireAuth, (req: Request, res: Response) => {
  try {
    const reset = resetAddinSettings();
    res.json(reset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
