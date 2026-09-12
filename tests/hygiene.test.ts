import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACK_LIST} from '../src/data/tracks';
import {scoreHygiene,scoreRubric,sessionHygiene} from '../server/workflow';
import {sanitizedContext} from '../server/governance';
import {syncSchema} from '../server/validation';
for(const track of TRACK_LIST) test(`${track.id}: gate accuracy accepts zero, partial and perfect attempts without releasing protected data`,()=>{
 const fields=track.dataGate!.fields;
 const correct=fields.map(f=>({fieldName:f.fieldName,action:f.expectedAction[0],rationale:'Recorded decision'}));
 const wrong=fields.map(f=>({fieldName:f.fieldName,action:['use-as-is','aggregate','redact','exclude'].find(a=>!f.expectedAction.includes(a as any))!,rationale:'Recorded decision'}));
 assert.equal(scoreHygiene(track,correct).hygiene_multiplier,1);
 assert.equal(scoreHygiene(track,wrong).hygiene_multiplier,0);
 const partial=[correct[0],...wrong.slice(1)];
 assert.equal(scoreHygiene(track,partial).hygiene_multiplier,1/fields.length);
 assert.throws(()=>scoreHygiene(track,correct.slice(1)));
 assert.throws(()=>scoreHygiene(track,[correct[0],...correct.slice(0,-1)]));
 assert.throws(()=>scoreHygiene(track,correct.map(r=>({...r,rationale:' '}))));
 const context=sanitizedContext(track,1,wrong);
 for(const exhibit of context.exhibits) if('rows' in exhibit) for(const row of exhibit.rows!) assert.deepEqual(row,{});
 assert.equal(sessionHygiene({scenarioSnapshot:track,dataHandling:correct}).hygiene_multiplier,1);
 assert.equal(sessionHygiene({scenarioSnapshot:track}).hygiene_multiplier,0);
});
test('4/5 base at 60% becomes 2.4/5, only hygiene is multiplied',()=>{
 const criteria=[{id:'a',name:'Data Hygiene & Privacy',maxScore:5,weight:50},{id:'b',name:'Judgment',maxScore:5,weight:50}];
 const scores={a:{score:4,notes:'Evidence'},b:{score:4,notes:'Evidence'}};
 assert.equal(scoreRubric(criteria,scores,false,.6),64);
 assert.equal(scoreRubric(criteria,scores,false,0),40);
 assert.equal(scoreRubric(criteria,scores,false,1),80);
 assert.equal(scores.a.score,4);
});
test('candidate cannot forge recorded accuracy',()=>{
 assert.equal(syncSchema.safeParse({sessionId:crypto.randomUUID(),revision:0,action:'data-handling',hygiene_multiplier:1,raw_hygiene_score:{correct:10,total:10}}).success,false);
});
