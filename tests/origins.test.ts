import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import express from 'express';
import { apiCors, canonicalHost } from '../server/origins';
test('custom domain CORS rejects lookalikes, handles preflight, and canonicalizes www safely', async () => {
  const previous = { APP_ORIGIN: process.env.APP_ORIGIN, ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS };
  process.env.APP_ORIGIN = 'https://aimisuperday.com';
  process.env.ALLOWED_ORIGINS = 'https://www.aimisuperday.com,https://aimi-lvls.onrender.com';
  const app = express(); app.use(canonicalHost); app.use('/api', apiCors); app.all('/api/health', (_req,res) => res.json({status:'ok'}));
  const server = app.listen(0,'127.0.0.1'); await new Promise<void>(r=>server.once('listening',r));
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/health`;
  try {
    for (const origin of ['https://aimisuperday.com','https://www.aimisuperday.com','https://aimi-lvls.onrender.com']) {
      const response = await fetch(url,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}});
      assert.equal(response.status,204); assert.equal(response.headers.get('access-control-allow-origin'),origin);
    }
    for (const origin of ['https://aimisuperday.com.evil.test','null','http://aimisuperday.com']) {
      const response = await fetch(url,{headers:{Origin:origin}}); assert.equal(response.status,403); assert.equal(response.headers.get('access-control-allow-origin'),null);
    }
    assert.equal((await fetch(url)).status,200);
    const redirect = await new Promise<http.IncomingMessage>((resolve,reject)=>http.get(url+'?test=1',{headers:{Host:'www.aimisuperday.com'}},res=>{res.resume();resolve(res);}).on('error',reject));
    assert.equal(redirect.statusCode,308); assert.equal(redirect.headers.location,'https://aimisuperday.com/api/health?test=1');
    assert.equal((await fetch(url,{headers:{'X-Forwarded-Host':'www.aimisuperday.com'}})).status,200);
  } finally {
    server.close(); for (const [key,value] of Object.entries(previous)) { if(value===undefined) delete process.env[key]; else process.env[key]=value; }
  }
});
