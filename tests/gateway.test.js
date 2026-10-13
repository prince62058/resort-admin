import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createGateway, backendOrigin} from '../server/gateway.js';
const servers = [];
async function listen(app) {
  const server = app.listen(0, '127.0.0.1');servers.push(server);
  await new Promise(resolve => server.once('listening', resolve));
  return 'http://127.0.0.1:' + server.address().port;
}
after(async () => {for (const server of servers) await new Promise(resolve => server.close(resolve));});

test('separate admin origin preserves login cookies, bodies and CSRF headers through its gateway', async () => {
  const api = express();api.use(express.raw({type:'*/*'}));
  api.post('/api/admin/login', (req,res) => {
    assert.equal(req.get('origin'), 'http://' + req.get('host'));
    assert.equal(req.get('X-CMS-Request'), '1');
    res.set('Set-Cookie','__Host-nest_admin=test; Path=/; Secure; HttpOnly; SameSite=Strict');
    res.json({body:JSON.parse(req.body.toString()), csrf:req.get('X-CSRF-Token'), cookie:req.get('Cookie')});
  });
  const backendUrl = await listen(api);
  const edge = express();edge.set('trust proxy',1);edge.use(createGateway({backendUrl,admin:true}));
  const front = await listen(edge);
  const response = await fetch(front + '/api/admin/login', {method:'POST',headers:{Origin:front.replace('http:','https:'),'X-Forwarded-Proto':'https','Content-Type':'application/json','X-CMS-Request':'1','X-CSRF-Token':'valid-token',Cookie:'test=one'},body:JSON.stringify({email:'owner@example.test'})});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{body:{email:'owner@example.test'},csrf:'valid-token',cookie:'test=one'});
  assert.match(response.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Strict/);
});

test('cross-site requests and forged forwarded hosts are rejected before reaching the backend', async () => {
  let requests = 0;
  const api=express();api.use((req,res)=>{requests++;res.json({ok:true});});
  const backendUrl=await listen(api);const edge=express();edge.use(createGateway({backendUrl,admin:true}));const front=await listen(edge);
  for (const origin of ['https://evil.example','null',front+'/not-an-origin']) {
    const response=await fetch(front+'/api/admin/login',{method:'POST',headers:{Origin:origin,'X-Forwarded-Host':'evil.example','X-CMS-Request':'1'}});
    assert.equal(response.status,403);
  }
  assert.equal(requests,0);
});

test('public website exposes content and enquiries but does not expose admin endpoints', async () => {
  const api=express();api.use((req,res)=>res.json({path:req.url}));
  const backendUrl=await listen(api);const edge=express();edge.use(createGateway({backendUrl}));const front=await listen(edge);
  assert.equal((await fetch(front+'/api/admin/status')).status,404);
  assert.deepEqual(await(await fetch(front+'/api/content?version=2')).json(),{path:'/api/content?version=2'});
});

test('image fallback remains available when the backend has no image; failures reveal no backend URL', async () => {
  const api=express();api.use((req,res)=>res.status(404).end());
  const backendUrl=await listen(api);const edge=express();edge.use(createGateway({backendUrl}));edge.use((req,res)=>res.send('bundled image'));const front=await listen(edge);
  assert.equal(await(await fetch(front+'/assets/photo.webp')).text(),'bundled image');
  const unavailable=express();unavailable.use(createGateway({backendUrl:'http://127.0.0.1:1'}));const failed=await listen(unavailable);
  const response=await fetch(failed+'/api/content');assert.equal(response.status,502);assert.doesNotMatch(await response.text(),/127\.0\.0\.1/);
});

test('backend configuration rejects credentials, paths and non-HTTP URLs', () => {
  for (const url of ['file:///etc/passwd','https://user:pass@example.test','https://example.test/path','https://example.test/?secret=yes']) assert.throws(()=>backendOrigin(url));
  assert.equal(backendOrigin('http://backend:5174/'),'http://backend:5174');
});
