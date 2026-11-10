import { Router, Request, Response } from 'express';
import { getServerConfig, updateServerConfig } from '../models/serverConfig.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// GET /api/config - Public for add-in/viewer/admin to read server URLs
router.get('/', (req: Request, res: Response) => {
  try {
    const config = getServerConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/config - Protected by admin auth
router.put('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { 
      compare_server_url, 
      addin_url, 
      viewer_url, 
      install_mode,
      app_name,
      app_base_url,
      brand_logo_text,
      brand_title,
      brand_subtitle,
      cors_mode,
      cors_allowed_origins,
      enqueue_endpoint_url,
      active_endpoint
    } = req.body;
    const current = getServerConfig();
    const updated = updateServerConfig({
      ...current,
      ...(compare_server_url !== undefined ? { compare_server_url } : {}),
      ...(addin_url !== undefined ? { addin_url } : {}),
      ...(viewer_url !== undefined ? { viewer_url } : {}),
      ...(install_mode !== undefined ? { install_mode } : {}),
      ...(app_name !== undefined ? { app_name } : {}),
      ...(app_base_url !== undefined ? { app_base_url } : {}),
      ...(brand_logo_text !== undefined ? { brand_logo_text } : {}),
      ...(brand_title !== undefined ? { brand_title } : {}),
      ...(brand_subtitle !== undefined ? { brand_subtitle } : {}),
      ...(cors_mode !== undefined ? { cors_mode } : {}),
      ...(cors_allowed_origins !== undefined ? { cors_allowed_origins } : {}),
      ...(enqueue_endpoint_url !== undefined ? { enqueue_endpoint_url } : {}),
      ...(active_endpoint !== undefined ? { active_endpoint } : {})
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
