import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
const dir = await mkdtemp(path.join(tmpdir(), 'aimi-profile-test-'));
const pg = new EmbeddedPostgres({ databaseDir: dir, port: 55441, user: 'test', password: 'local-only', persistent: false, onLog: () => {}, onError: () => {}, postgresFlags: ['-h', '127.0.0.1'] });
try {
  await pg.initialise(); await pg.start(); await pg.createDatabase('profiles_test');
  const client = pg.getPgClient('profiles_test'); await client.connect();
  try {
    await client.query(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT current_setting('test.uid', true)::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;`);
    for (const file of ['20260911002748_auth_profiles.sql', '20260911163550_beta_access_roles.sql']) await client.query(await readFile('supabase/migrations/' + file, 'utf8'));
    const id = '00000000-0000-0000-0000-000000000010';
    await client.query(`INSERT INTO auth.users VALUES ($1,'test@example.test','{"full_name":"Test","role":"admin","beta_role":"admin"}','{}')`, [id]);
    assert.equal((await client.query('SELECT role FROM profiles WHERE id=$1', [id])).rows[0].role, 'candidate');
    for (const [suffix, role] of [['11', 'grader'], ['12', 'admin']]) {
      await client.query(`INSERT INTO auth.users VALUES ($1,'test@example.test','{}',$2)`, ['00000000-0000-0000-0000-0000000000' + suffix, JSON.stringify({ beta_role: role })]);
    }
    assert.deepEqual((await client.query('SELECT role FROM profiles ORDER BY id')).rows.map(r => r.role), ['candidate','grader','admin']);
    await client.query(`SET ROLE authenticated; SELECT set_config('test.uid', '${id}', false)`);
    assert.equal((await client.query('SELECT * FROM profiles')).rowCount, 1);
    await client.query("UPDATE profiles SET full_name='New Name' WHERE id=$1", [id]);
    await assert.rejects(client.query("UPDATE profiles SET role='admin' WHERE id=$1", [id]), /permission denied/);
    await assert.rejects(client.query("UPDATE profiles SET id='00000000-0000-0000-0000-000000000099' WHERE id=$1", [id]), /permission denied/);
    console.log('PASS profile trigger: trusted roles only, own-row RLS, name updates, role/id escalation denied');
  } finally { await client.end(); }
} finally { await pg.stop(); await rm(dir, { recursive: true, force: true }); }
