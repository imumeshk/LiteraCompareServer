import { Router, Request, Response } from 'express';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  const filename = req.query.filename as string;

  if (!targetUrl) return res.status(400).send('Missing url param');

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return res.status(400).send('Invalid url param');
  }

  const protocol = parsedUrl.protocol === 'https:' ? https : http;

  const requestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'GET',
    headers: {
      'Accept': '*/*',
    },
  };

  const proxyReq = protocol.request(requestOptions, (response) => {
    if (response.statusCode && response.statusCode >= 400) {
      res.status(response.statusCode).send('Failed to fetch from target server: HTTP ' + response.statusCode);
      response.resume();
      return;
    }

    // Build Content-Disposition with proper RFC 5987 encoding for non-ASCII
    if (filename) {
      const safeName = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
      const encodedName = encodeURIComponent(filename);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`
      );
    } else if (response.headers['content-disposition']) {
      res.setHeader('Content-Disposition', response.headers['content-disposition']);
    } else {
      res.setHeader('Content-Disposition', 'attachment');
    }

    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }

    // Remove headers that would cause issues
    res.removeHeader('X-Frame-Options');

    response.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[Download Proxy] Error proxying request to', targetUrl, err.message);
    if (!res.headersSent) {
      res.status(502).send('Error proxying request: ' + err.message);
    }
  });

  proxyReq.setTimeout(30000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).send('Proxy request timed out');
    }
  });

  proxyReq.end();
});

export default router;
