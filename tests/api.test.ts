import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticate } from '../server/auth';
import { apiError } from '../server/routes';
import { HttpError, syncSchema } from '../server/validation';
function response(){return {statusCode:200,body:null as any,status(n:number){this.statusCode=n;return this;},json(body:unknown){this.body=body;return this;}};}
test('unconfigured identity fails closed',async()=>{
 const old=process.env.AUTH_JWKS_URL; delete process.env.AUTH_JWKS_URL;
 try{const res=response();let advanced=false;await authenticate({headers:{}} as any,res as any,()=>{advanced=true;});assert.equal(res.statusCode,503);assert.equal(advanced,false);}finally{if(old)process.env.AUTH_JWKS_URL=old;}
});
test('anonymous requests cannot enter authenticated API',async()=>{
 const old={url:process.env.AUTH_JWKS_URL,issuer:process.env.AUTH_ISSUER,audience:process.env.AUTH_AUDIENCE};
 Object.assign(process.env,{AUTH_JWKS_URL:'https://idp.invalid/jwks',AUTH_ISSUER:'https://idp.invalid',AUTH_AUDIENCE:'aimi'});
 try{const res=response();let advanced=false;await authenticate({headers:{}} as any,res as any,()=>{advanced=true;});assert.equal(res.statusCode,401);assert.equal(advanced,false);}finally{for(const [key,value] of Object.entries({AUTH_JWKS_URL:old.url,AUTH_ISSUER:old.issuer,AUTH_AUDIENCE:old.audience})){if(value)process.env[key]=value;else delete process.env[key];}}
});
test('API returns bounded validation errors without input content',()=>{
 const parsed=syncSchema.safeParse({sessionId:'sensitive arbitrary input',action:'override-role'});assert.equal(parsed.success,false);
 const res=response();apiError((parsed as any).error,{} as any,res as any,()=>{});assert.equal(res.statusCode,422);assert.ok(!JSON.stringify(res.body).includes('sensitive arbitrary input'));
});
test('ownership and conflict errors preserve HTTP status',()=>{
 for(const status of [403,404,409]){const res=response();apiError(new HttpError(status,'Not available'),{} as any,res as any,()=>{});assert.equal(res.statusCode,status);}
});
