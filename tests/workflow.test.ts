import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition, checkDataHandling, scoreRubric } from '../server/workflow';
import { syncSchema } from '../server/validation';
import { publicSession } from '../server/assessment';
import { consultingTrack } from '../src/data/tracks/consulting';
import { businessOperationsTrack } from '../src/data/tracks/business-operations';

test('Phase 2 requires both reflection and completed peer review',()=>{
 assert.throws(()=>assertTransition(1,false,'Evidence remains uncertain'),/peer request/);
 assert.throws(()=>assertTransition(1,true,''),/reflection/);
 assert.doesNotThrow(()=>assertTransition(1,true,'Evidence remains uncertain'));
 assert.throws(()=>assertTransition(5,true,'ok'),/Invalid phase/);
});
test('data hygiene rejects raw sensitive fields, missing fields and duplicate rows',()=>{
 const rows=businessOperationsTrack.dataGate!.fields.map(f=>({fieldName:f.fieldName,action:f.expectedAction[0],rationale:'Minimum necessary data for comparison'}));
 assert.doesNotThrow(()=>checkDataHandling(businessOperationsTrack,rows));
 assert.throws(()=>checkDataHandling(businessOperationsTrack,rows.slice(1)));
 assert.throws(()=>checkDataHandling(businessOperationsTrack,[...rows,rows[0]]));
 const unsafe=rows.map(r=>r.fieldName==='Enterprise_Tax_ID'?{...r,action:'use-as-is'}:r);
 assert.throws(()=>checkDataHandling(businessOperationsTrack,unsafe));
});
test('client cannot override phase, timer, peer flag, organization or role',()=>{
 const base={sessionId:'2b938834-8258-4fb5-bdbb-aecb68365373',revision:0,action:'save'};
 for(const field of ['activePhase','phaseDeadlineAt','isPeerReviewComplete','organizationId','role']) assert.equal(syncSchema.safeParse({...base,[field]:true}).success,false);
 assert.equal(syncSchema.safeParse(base).success,true);
 assert.equal(syncSchema.safeParse({...base,revision:-1}).success,false);
});
test('score normalization and mandatory human evidence',()=>{
 const criteria=[{id:'planning',name:'Planning',weight:50,maxScore:13},{id:'verification',name:'Verification',weight:50,maxScore:10}];
 const scores={planning:{score:13,notes:'Specific cited evidence'},verification:{score:5,notes:'Partial verification'}};
 assert.equal(scoreRubric(criteria,scores,false),75);
 assert.throws(()=>scoreRubric(criteria,scores,true),/maximum 5/);
 assert.equal(scoreRubric(criteria,{...scores,planning:{score:5,notes:'Full scope after shock'}},true),44.23);
 assert.throws(()=>scoreRubric(criteria,{...scores,verification:{score:5,notes:''}},false));
 assert.throws(()=>scoreRubric(criteria,{planning:scores.planning},false));
});
test('unreleased emergency and grading keys are not returned in applicant session',()=>{
 const session={id:'id',trackId:'consulting',revision:0,activePhase:1,phaseDeadlineAt:new Date(),status:'ACTIVE',nodes:[],messages:[],scenarioSnapshot:consultingTrack};
 const before=publicSession(session);
 assert.equal(before.track.rubric.length,0);
 assert.equal(before.track.emergencyConstraint.memoPoints.length,0);
 assert.equal(before.track.inboxMessages.length,0);
 const after=publicSession({...session,activePhase:4});
 assert.ok(after.track.emergencyConstraint.memoPoints.length>0);
});
