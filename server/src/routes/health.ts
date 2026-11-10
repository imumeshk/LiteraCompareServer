import { Router, Request, Response } from 'express';
import { getServerConfig } from '../models/serverConfig.js';
import { countAdminUsers } from '../models/adminUser.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const config = getServerConfig();
    const adminCount = countAdminUsers();

    res.json({
      status: 'healthy',
      service: 'litera-compare-server',
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      database: 'connected',
      install_mode: config.install_mode,
      installed_at: config.installed_at,
      admin_users_count: adminCount,
      endpoints: {
        api_config: '/api/config',
        api_addin_settings: '/api/addin-settings',
        api_viewer_settings: '/api/viewer-settings',
        addin_taskpane: '/addin/src/taskpane/taskpane.html',
        viewer_home: '/viewer/home.html',
        viewer_diff: '/viewer/viewer.html',
        admin_panel: '/admin',
      },
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

export default router;
