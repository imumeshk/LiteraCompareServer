import { Router, Request, Response } from 'express';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { getServerConfig } from '../models/serverConfig.js';

const router = Router();

router.all('/*', (req: Request, res: Response) => {
  const config = getServerConfig();
  if (!config.compare_server_url) {
    return res.status(500).send('Compare server URL not configured');
  }

  let targetUrlString = config.compare_server_url;
  // If target URL is like http://192.168.29.101/worksharecompareapi/api/v1
  // we need to be careful about replacing /proxy. We want to append the path.
  if (targetUrlString.endsWith('/')) {
    targetUrlString = targetUrlString.slice(0, -1);
  }
  
  // pathWithQuery handles everything after /proxy
  const pathWithQuery = req.originalUrl.replace(/^\/proxy/, '');
  targetUrlString += pathWithQuery;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrlString);
  } catch (e) {
    return res.status(500).send('Invalid compare server URL');
  }

  const protocol = parsedUrl.protocol === 'https:' ? https : http;

  const headers = { ...req.headers };
  delete headers.host; // IMPORTANT for proxies

  const customFilename = req.query.filename as string;

  const requestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: req.method,
    headers: headers,
  };

  const proxyReq = protocol.request(requestOptions, (proxyRes) => {
    if (proxyRes.statusCode) {
      res.status(proxyRes.statusCode);
    }
    
    Object.keys(proxyRes.headers).forEach((key) => {
      const headerVal = proxyRes.headers[key];
      if (headerVal !== undefined) {
        res.setHeader(key, headerVal);
      }
    });

    if (customFilename) {
      const safeName = customFilename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
      const encodedName = encodeURIComponent(customFilename);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`
      );
    }

    res.removeHeader('access-control-allow-origin');
    res.removeHeader('access-control-allow-credentials');

    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[Universal Proxy] Error:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Error proxying request: ' + err.message);
    }
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
});

export default router;
