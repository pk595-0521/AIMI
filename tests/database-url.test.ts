import {test} from 'node:test';
import assert from 'node:assert/strict';
import {databaseUrl} from '../server/database-url';
test('Supabase transaction pooler uses Prisma compatibility while preserving connection options',()=>{
 const url=new URL(databaseUrl('postgresql://user:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=3')!);
 assert.equal(url.searchParams.get('pgbouncer'),'true');
 assert.equal(url.searchParams.get('sslmode'),'require');
 assert.equal(url.searchParams.get('connection_limit'),'3');
});
test('direct and session connections retain prepared statement support',()=>{
 for(const host of ['aws-0-us-east-1.pooler.supabase.com:5432','localhost:6543','db.example.supabase.co:5432']){
  assert.equal(new URL(databaseUrl(`postgresql://user:password@${host}/postgres`)!).searchParams.has('pgbouncer'),false);
 }
 assert.equal(databaseUrl(undefined),undefined);
});
