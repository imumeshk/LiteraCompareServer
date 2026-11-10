import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { getDb } from './db/client.js';
import { getServerConfig } from './models/serverConfig.js';
import configRouter from './routes/config.js';
import addinSettingsRouter from './routes/addinSettings.js';
import viewerSettingsRouter from './routes/viewerSettings.js';
import installerRouter from './routes/installer.js';
import { backupRouter } from './routes/backup.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import ssoRouter from './routes/sso.js';
import downloadRouter from './routes/download.js';
import { activityRouter } from './routes/activity.js';
import { compareServerSettingsRouter } from './routes/compareServerSettings.js';
import manifestSettingsRouter from './routes/manifestSettings.js';
import proxyRouter from './routes/proxy.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupModeGuard } from './middleware/setupModeGuard.js';

export async function createApp(): Promise<Express> {
  // Ensure DB and migrations are ready
  await getDb();

  const app = express();

  // Dynamic CORS Middleware based on DB config
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Admin console and installer always get permissive CORS (they're internal)
    if (req.path.startsWith('/admin') || req.path.startsWith('/api/installer')) {
      return cors({ origin: true, credentials: true })(req, res, next);
    }
    
    // For API and Add-in/Viewer endpoints, check the configured mode
    const config = getServerConfig();
    if (config.cors_mode === 'bypass') {
      return cors({ origin: true, credentials: true })(req, res, next);
    } else if (config.cors_mode === 'strict') {
      return cors({ origin: false })(req, res, next); // Same-origin only
    } else if (config.cors_mode === 'custom') {
      const allowedOrigins = (config.cors_allowed_origins || '')
        .split(',')
        .map(o => o.trim())
        .filter(o => o.length > 0);
      
      return cors({
        origin: (requestOrigin, callback) => {
          if (!requestOrigin) return callback(null, true);
          if (allowedOrigins.includes(requestOrigin)) {
            return callback(null, true);
          }
          callback(new Error('Not allowed by CORS'));
        },
        credentials: true
      })(req, res, next);
    }
    
    // Default fallback
    cors({ origin: false })(req, res, next);
  });

  app.use(cookieParser());
  
  // Universal proxy route MUST be before body-parsers to preserve the raw stream for piping
  app.use('/proxy', proxyRouter);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(setupModeGuard);

  // 1. API routes FIRST
  app.use('/api/config', configRouter);
  app.use('/api/addin-settings', addinSettingsRouter);
  app.use('/api/viewer-settings', viewerSettingsRouter);
  app.use('/api/compare-server-settings', compareServerSettingsRouter);
  app.use('/api/manifest-settings', manifestSettingsRouter);
  app.use('/api/installer', installerRouter);
  app.use('/api/backup', backupRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/sso', ssoRouter);
  app.use('/api/download', downloadRouter);
  app.use('/api/activity', activityRouter);

  // 2. Dynamic static mounting for /addin and /viewer based on install_mode
  // /addin static serving
  const addinStaticDir = path.join(process.cwd(), 'addin');
  app.use('/addin', (req: Request, res: Response, next: NextFunction) => {
    const config = getServerConfig();
    if (!config.installed_at) {
      res.status(403).send('<html><body><h2>403 - Forbidden</h2><p>Please complete deployment in the installer first.</p></body></html>');
      return;
    }
    if (config.install_mode === 'viewer') {
      res.status(404).send(`
        <html>
          <head><title>404 - Add-in Disabled</title><style>body{font-family:sans-serif;padding:40px;background:#f8fafc;color:#334155;}</style></head>
          <body>
            <h2>404 - Office Add-in is disabled in this deployment mode</h2>
            <p>The current installation mode is configured as <strong>viewer</strong>.</p>
            <p><a href="/admin">Return to Admin Console</a></p>
          </body>
        </html>
      `);
      return;
    }
    // Set Frame-Ancestors dynamically based on CORS setting
    if (config.cors_mode === 'strict') {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    } else if (config.cors_mode === 'custom' && config.cors_allowed_origins) {
      const origins = config.cors_allowed_origins.split(',').map(o => o.trim()).join(' ');
      res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${origins}`);
    } else {
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
    }
    next();
  }, express.static(addinStaticDir, {
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));

  // /viewer static serving
  const viewerStaticDir = path.join(process.cwd(), 'viewer');
  app.use('/viewer', (req: Request, res: Response, next: NextFunction) => {
    const config = getServerConfig();
    if (!config.installed_at) {
      res.status(403).send('<html><body><h2>403 - Forbidden</h2><p>Please complete deployment in the installer first.</p></body></html>');
      return;
    }
    if (config.install_mode === 'addin') {
      res.status(404).send(`
        <html>
          <head><title>404 - Viewer Disabled</title><style>body{font-family:sans-serif;padding:40px;background:#f8fafc;color:#334155;}</style></head>
          <body>
            <h2>404 - Custom Viewer is disabled in this deployment mode</h2>
            <p>The current installation mode is configured as <strong>addin</strong>.</p>
            <p><a href="/admin">Return to Admin Console</a></p>
          </body>
        </html>
      `);
      return;
    }
    // Set Frame-Ancestors dynamically based on CORS setting
    if (config.cors_mode === 'strict') {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    } else if (config.cors_mode === 'custom' && config.cors_allowed_origins) {
      const origins = config.cors_allowed_origins.split(',').map(o => o.trim()).join(' ');
      res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${origins}`);
    } else {
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
    }
    next();
  }, express.static(viewerStaticDir, {
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));

  // Fallback direct root links for convenience if navigated directly
  app.get('/manifest.xml', (req: Request, res: Response) => {
    res.redirect('/api/installer/manifest');
  });

  return app;
}
