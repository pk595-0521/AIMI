import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enrollmentReady,governanceReady} from '../server/policy';
test('beta enrollment defaults open and explicit production mode requires the contract',()=>{
 assert.equal(enrollmentReady({}),true);
 assert.equal(enrollmentReady({NEXT_PUBLIC_BETA_MODE:'true'}),true);
 assert.equal(enrollmentReady({NEXT_PUBLIC_BETA_MODE:'false'}),false);
 assert.equal(enrollmentReady({NEXT_PUBLIC_BETA_MODE:'false',AI_ZERO_TRAINING_VERIFIED:'true'}),false);
 assert.equal(enrollmentReady({NEXT_PUBLIC_BETA_MODE:'false',AI_ZERO_TRAINING_VERIFIED:'true',AI_CONTRACT_REFERENCE:'verified-test-contract'}),true);
});
test('beta enrollment does not attest AI provider verification',()=>{
 const previous={...process.env};
 try{process.env.NEXT_PUBLIC_BETA_MODE='true';delete process.env.AI_ZERO_TRAINING_VERIFIED;delete process.env.AI_CONTRACT_REFERENCE;assert.equal(enrollmentReady(),true);assert.equal(governanceReady(),false);}
 finally{process.env=previous;}
});
