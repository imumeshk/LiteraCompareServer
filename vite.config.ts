import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

let cachedApp: any = null;

function expressMiddlewarePlugin(): Plugin {
  return {
    name: 'litera-express-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (!cachedApp) {
            const { createApp } = await import('./server/src/app.ts');
            cachedApp = await createApp();
          }
          cachedApp(req, res, next);
        } catch (err) {
          console.error('Failed to dispatch request to Litera Express server:', err);
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressMiddlewarePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
