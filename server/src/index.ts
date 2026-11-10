import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './app.js';
import { ENV } from './env.js';

async function bootstrap() {
  const app = await createApp();
  const PORT = ENV.PORT || 3000;

  // Integrate Vite for Admin React SPA
  if (ENV.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    // Use Vite middleware for React Admin Frontend
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Setup background tasks
  const { purgeOldActivity } = await import('./models/activitySettings.js');
  
  // Run purge once on startup
  try {
    const purged = purgeOldActivity();
    console.log(`[Activity Tracker] Startup purge complete: ${purged.deleted} old records removed.`);
  } catch (err) {
    console.warn('[Activity Tracker] Startup purge failed:', err);
  }

  // Then run every 12 hours (12 * 60 * 60 * 1000)
  setInterval(() => {
    try {
      const purged = purgeOldActivity();
      if (purged.deleted > 0) {
        console.log(`[Activity Tracker] Scheduled purge complete: ${purged.deleted} old records removed.`);
      }
    } catch (err) {
      console.warn('[Activity Tracker] Scheduled purge failed:', err);
    }
  }, 12 * 60 * 60 * 1000);



  const startMessage = () => {
    console.log(`====================================================`);
    console.log(` Litera Compare Server is running on port ${PORT}`);
    console.log(` Installer URL:  ${ENV.APP_URL}/installer`);
    console.log(` API Health:     ${ENV.APP_URL}/api/health`);
    console.log(`====================================================`);
  };

  if (ENV.USE_NATIVE_SSL && ENV.SSL_CERT_PATH && ENV.SSL_KEY_PATH) {
    try {
      const https = await import('https');
      const fs = await import('fs');
      const options = {
        key: fs.readFileSync(ENV.SSL_KEY_PATH),
        cert: fs.readFileSync(ENV.SSL_CERT_PATH)
      };
      
      https.createServer(options, app).listen(PORT, '0.0.0.0', startMessage);
    } catch (err) {
      console.error('Failed to start HTTPS server (check your certificate paths):', err);
      process.exit(1);
    }
  } else {
    app.listen(PORT, '0.0.0.0', startMessage);
  }
}

bootstrap().catch((err) => {
  console.error('Fatal error during Litera Compare Server startup:', err);
  process.exit(1);
});
