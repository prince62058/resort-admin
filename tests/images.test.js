import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifiedImages} from '../server/images.js';
import {createGateway} from '../server/gateway.js';

test('matching photos use local bytes; publishing a new backend version immediately bypasses the local copy', async () => {
  const root=await mkdtemp(path.join(tmpdir(),'nest-image-cache-'));
  const original=Buffer.from('bundled original photo');let current=original,downloads=0;
  const etag=()=> '"'+createHash('sha256').update(current).digest('hex')+'"';
  await writeFile(path.join(root,'photo.webp'),original);
  const servers=[];
  async function listen(app){const server=app.listen(0,'127.0.0.1');servers.push(server);await new Promise(r=>server.once('listening',r));return 'http://127.0.0.1:'+server.address().port;}
  try {
    const api=express();
    api.head('/assets/photo.webp',(req,res)=>res.set('ETag',etag()).status(req.get('If-None-Match')===etag()?304:200).end());
    api.get('/assets/photo.webp',(req,res)=>{downloads++;res.set('ETag',etag()).type('webp').send(current);});
    const backendUrl=await listen(api);
    const app=express();app.use(verifiedImages({backendUrl,root}));app.use(createGateway({backendUrl}));const front=await listen(app);
    let response=await fetch(front+'/assets/photo.webp');
    assert.equal(response.headers.get('x-media-cache'),'verified-frontend');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),original);assert.equal(downloads,0);
    response=await fetch(front+'/assets/photo.webp',{headers:{'If-None-Match':etag(),'Cache-Control':'max-age=0'}});assert.equal(response.status,304);
    current=Buffer.from('updated photograph from admin');
    response=await fetch(front+'/assets/photo.webp');assert.deepEqual(Buffer.from(await response.arrayBuffer()),current);assert.equal(downloads,1);
    assert.equal(response.headers.get('x-media-cache'),null);
  } finally {for(const server of servers)await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
});
