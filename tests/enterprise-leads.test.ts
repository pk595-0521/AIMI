import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { enterpriseLeadInput, leadHandler } from '../server/enterprise-leads';
const input = { full_name: ' Test Person ', work_email: 'Person@Example.com', company_name: 'Example', team_size: '11–50', track_interest: 'PM' };
test('lead validation normalizes identity and rejects malformed or unauthorized fields', () => {
  assert.equal(enterpriseLeadInput.parse(input).work_email, 'person@example.com');
  assert.equal(enterpriseLeadInput.parse(input).full_name, 'Test Person');
  for (const bad of [{...input, work_email:'invalid'}, {...input, role:'admin'}, {...input, team_size:'other'}, {...input, track_interest:'unknown'}, {...input, full_name:'  '}]) assert.equal(enterpriseLeadInput.safeParse(bad).success, false);
});
test('public lead route checks origin, validates, persists and reports storage failure honestly', async () => {
  const original = process.env.APP_ORIGIN; process.env.APP_ORIGIN = 'http://aimi.test';
  const saved: unknown[] = []; let fail = false;
  const app = express(); app.use(express.json()); app.post('/leads', leadHandler(async data => { if(fail) throw new Error('database unavailable'); saved.push(data); }));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as {port:number}).port}/leads`;
  const post = (body: unknown, origin = 'http://aimi.test') => fetch(url, {method:'POST', headers:{'Content-Type':'application/json', Origin:origin}, body:JSON.stringify(body)});
  try {
    assert.equal((await post(input, 'https://evil.test')).status, 403);
    assert.equal((await post({...input, full_name:''})).status, 422);
    assert.equal(saved.length, 0);
    const response = await post(input); assert.equal(response.status, 201); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.deepEqual(await response.json(), {saved:true});
    assert.equal(saved.length, 1);
    fail = true; const failed = await post(input); assert.equal(failed.status, 503); assert.ok(!(await failed.text()).includes('database unavailable'));
  } finally { server.close(); if(original === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = original; }
});
