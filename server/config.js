import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import {backendOrigin} from './gateway.js';
dotenv.config({path:fileURLToPath(new URL('../.env', import.meta.url)), quiet:true});
export function config() {
  const development = process.env.NODE_ENV !== 'production';
  const backendUrl = process.env.BACKEND_URL || (development ? 'http://127.0.0.1:5174' : '');
  const siteUrl = process.env.SITE_URL || (development ? 'http://localhost:5173' : '');
  if (!backendUrl || !siteUrl) throw new Error('Set BACKEND_URL and SITE_URL in the admin environment.');
  return {backendUrl:backendOrigin(backendUrl), siteUrl:backendOrigin(siteUrl), port:Number(process.env.PORT || 3000)};
}
