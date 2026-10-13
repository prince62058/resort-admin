import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGateway, backendOrigin} from './gateway.js';
import {verifiedImages} from './images.js';
const project = fileURLToPath(new URL('../', import.meta.url));
export function createApp({backendUrl, siteUrl, root = project, production = process.env.NODE_ENV === 'production'} = {}) {
  const app = express();
  const publicConfig = JSON.stringify({siteUrl:backendOrigin(siteUrl)}).replace(/</g, '\\u003c');
  app.disable('x-powered-by');
  if (production) app.set('trust proxy', 1);
  app.use((req,res,next) => {res.set({'X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin'});next();});
  app.get('/healthz', (req,res) => res.json({ready:true, service:'nature-nest-admin'}));
  app.get('/robots.txt', (req,res) => res.type('text/plain').send('User-agent: *\nDisallow: /\n'));
  app.get('/app-config.js', (req,res) => res.type('application/javascript').set('Cache-Control','no-store').send('window.__NEST_CONFIG__=' + publicConfig + ';'));
  app.use(verifiedImages({backendUrl,root:path.join(root,'dist/assets')}));
  app.use(createGateway({backendUrl, admin:true}));
  app.use(express.static(path.join(root,'dist'), {dotfiles:'deny', index:false}));
  app.use('/assets', (req,res) => res.status(404).end());
  app.use('/_app', (req,res) => res.status(404).end());
  app.get(/^\/(?:admin\/?)?$/, (req,res) => res.set('Cache-Control','no-store').sendFile(path.join(root,'dist/index.html')));
  app.use((req,res) => res.status(404).json({error:'Not found.'}));
  return app;
}
