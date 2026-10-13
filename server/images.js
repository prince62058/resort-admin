import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {backendOrigin} from './gateway.js';

// Check the current backend ETag before serving an exact local copy. Changed
// photos and new uploads always continue to the backend instead of going stale.
export function verifiedImages({backendUrl, root, maxBytes = 32 * 1024 * 1024}) {
  const origin = backendOrigin(backendUrl), cache = new Map(), pending = new Map();
  let bytes = 0;
  async function localImage(filename) {
    if (cache.has(filename)) {
      const item = cache.get(filename);cache.delete(filename);cache.set(filename,item);return item;
    }
    if (!pending.has(filename)) pending.set(filename, (async () => {
      const location = path.join(root, filename);
      if ((await stat(location)).size > 8 * 1024 * 1024) return null;
      const data = await readFile(location);
      const item = {data, etag:'"' + createHash('sha256').update(data).digest('hex') + '"'};
      while (bytes + data.length > maxBytes && cache.size) {
        const first = cache.keys().next().value;bytes -= cache.get(first).data.length;cache.delete(first);
      }
      cache.set(filename,item);bytes += data.length;return item;
    })().catch(() => null).finally(() => pending.delete(filename)));
    return pending.get(filename);
  }
  return async (req,res,next) => {
    if (!['GET','HEAD'].includes(req.method) || !req.path.startsWith('/assets/')) return next();
    let filename;
    try {filename = decodeURIComponent(req.path.slice('/assets/'.length));} catch {return next();}
    if (/[\\\x00-\x1f]/.test(filename) || filename.split('/').some(part => !part || part === '.' || part === '..') || !/\.(png|jpe?g|webp|gif|avif|svg|ico)$/i.test(filename)) return next();
    const item = await localImage(filename);
    if (!item) return next();
    try {
      const response = await fetch(origin + '/assets/' + filename.split('/').map(encodeURIComponent).join('/'), {method:'HEAD',headers:{'If-None-Match':item.etag},signal:AbortSignal.timeout(5000)});
      if (response.status !== 304 && !(response.ok && response.headers.get('etag') === item.etag)) return next();
      res.set({'ETag':item.etag,'Cache-Control':response.headers.get('cache-control') || 'public, max-age=3600','X-Media-Source':'mongodb','X-Media-Cache':'verified-frontend'});
      res.type(path.extname(filename)).send(item.data);
    } catch {next();}
  };
}
