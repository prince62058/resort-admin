import http from 'node:http';
import https from 'node:https';

const hopHeaders = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];
function endToEnd(headers) {
  const filtered = {...headers};
  const connectionHeaders = String(headers.connection || '').split(',').map(value => value.trim().toLowerCase());
  for (const key of [...hopHeaders, ...connectionHeaders]) delete filtered[key];
  return filtered;
}
export function backendOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('BACKEND_URL must be an HTTP(S) origin without a path or credentials.');
  }
  return url.origin;
}

// Browser requests stay on the website/admin origin. Only the server calls the API.
export function createGateway({backendUrl, admin = false, assetFallback = true}) {
  const target = new URL(backendOrigin(backendUrl));
  return (req, res, next) => {
    const path = req.originalUrl || req.url;
    const pathname = path.split('?')[0];
    const api = pathname === '/api' || pathname.startsWith('/api/');
    const asset = pathname.startsWith('/assets/');
    if (!api && !asset) return next();
    if (!admin && /^\/api\/admin(?:\/|$)/i.test(pathname)) return res.status(404).json({error: 'Not found.'});
    // Never turn an untrusted browser Origin into a trusted upstream request.
    const origin = req.headers.origin;
    if (origin) {
      try {
        const expected = (req.protocol || 'http') + '://' + req.headers.host;
        if (origin !== new URL(expected).origin) throw new Error();
      } catch {
        return res.status(403).json({error: 'Cross-site request rejected.'});
      }
    }
    const headers = endToEnd(req.headers);
    headers.host = target.host;
    for (const name of Object.keys(headers)) {
      if (name === 'forwarded' || name.startsWith('x-forwarded-')) delete headers[name];
    }
    // The address is undefined once the browser has already cancelled the request.
    const clientAddress = req.ip || req.socket.remoteAddress;
    if (clientAddress) headers['x-forwarded-for'] = clientAddress;
    if (origin) headers.origin = target.origin;
    const transport = target.protocol === 'https:' ? https : http;
    const upstream = transport.request({protocol: target.protocol, hostname: target.hostname, port: target.port || undefined, method: req.method, path, headers});
    let handled = false;
    const fallback = assetFallback && asset && ['GET', 'HEAD'].includes(req.method);
    upstream.on('response', response => {
      handled = true;
      if (fallback && (response.statusCode === 404 || response.statusCode >= 500)) {
        response.resume();
        return next();
      }
      res.statusCode = response.statusCode;
      for (const [name, value] of Object.entries(endToEnd(response.headers))) {
        if (value !== undefined) res.setHeader(name, value);
      }
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    upstream.setTimeout(15000, () => upstream.destroy(new Error('Backend timed out.')));
    upstream.on('error', () => {
      if (handled || res.destroyed) return;
      handled = true;
      if (fallback) return next();
      res.status(502).json({error: 'Backend unavailable. Please try again shortly.'});
    });
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => {if (!res.writableEnded) upstream.destroy();});
    req.pipe(upstream);
  };
}
