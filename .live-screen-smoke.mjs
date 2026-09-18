import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
if(process.env.LIVE_SMOKE_ALLOW_WRITES!=='true')throw new Error('Live Screen smoke requires explicit write opt-in.');
if(!process.env.SMOKE_STATE_DIR)throw new Error('Run --mode=superday first, then reuse its SMOKE_STATE_DIR for Screen.');
const stateDir=process.env.SMOKE_STATE_DIR,base=process.env.TEST_BASE_URL||'https://aimi-lvls.onrender.com';
const runId=(await readFile(join(stateDir,'run-id'),'utf8')).trim();
const browser=await chromium.launch({headless:true});
const pages={};
async function api(page,path,body){return page.evaluate(async({path,body})=>{const key=Object.keys(localStorage).find(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'));const token=JSON.parse(localStorage.getItem(key)).access_token;const r=await fetch('/api'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};},{path,body});}
const cases=[['consulting',['exclude','redact','use-as-is','aggregate']],['investment-banking',['exclude','redact','use-as-is','use-as-is']],['business-operations',['redact','exclude','aggregate','redact','use-as-is']],['product-management',['exclude','exclude','use-as-is','redact']]];
const sessions=[];
async function waitPhase(phase){const deadline=Date.now()+45*60000;while(Date.now()<deadline){let ready=true;for(const s of sessions){const r=await api(pages.candidate,'/assessment?trackId='+s.trackId);assert.equal(r.status,200);s.state=r.data;if(s.state.phase<phase)ready=false;}if(ready)return;await new Promise(r=>setTimeout(r,5000));}throw new Error('Timed out waiting for server phase '+phase);}
async function command(s,action,extra={},expected=200){const r=await api(pages.candidate,'/assessment/sync',{sessionId:s.state.id,revision:s.state.revision,action,...extra});assert.equal(r.status,expected,JSON.stringify(r));if(expected===200)s.state=r.data;return r;}
try{
 for(const role of ['candidate','grader','admin']){const context=await browser.newContext({storageState:join(stateDir,role+'.json')});pages[role]=await context.newPage();await pages[role].goto(base+'/'+(role==='candidate'?'assessment':role==='admin'?'employer':'grader'));}
 const {candidate,grader,admin}=pages;
 const people=(await api(admin,'/admin/people')).data;
 const c=people.find(p=>p.email==='aimi-assignment-smoke-'+runId+'-candidate@example.test'),g=people.find(p=>p.email==='aimi-assignment-smoke-'+runId+'-grader@example.test');assert.ok(c&&g);
 const me=(await api(candidate,'/me')).data;
 for(const [track,actions] of cases){
  const assignment=await api(admin,'/admin/assignments',{candidateId:c.id,graderId:g.id,trackId:track+'-screen-v1',assessmentType:'AIMI_SCREEN'});assert.equal(assignment.status,201);
  const s={track,trackId:assignment.data.trackId,state:null};
  assert.equal((await api(candidate,'/legal/consent',{sessionId:assignment.data.sessionId,policyVersion:me.policy.version,monitoringAccepted:true,zeroRetrainingAccepted:true,humanReviewAccepted:true})).status,201);
  s.state=(await api(candidate,'/assessment?trackId='+s.trackId)).data;sessions.push(s);assert.equal(s.state.phase,1);assert.equal(s.state.track.exhibits.length,0);
  const blocked=await api(candidate,'/copilot/chat',{assessment_id:s.state.id,track_id:track,segment_id:1,request_id:crypto.randomUUID(),purpose:'Verify gate isolation',messages:[{role:'user',content:'Summarize exhibits'}]});assert.equal(blocked.status,403);
  const rows=s.state.track.dataGate.fields.map((f,i)=>({fieldName:f.fieldName,action:actions[i],rationale:'Disposable Screen smoke: minimum safe handling.'}));
  await command(s,'data-handling',{dataHandling:rows.map(r=>({...r,action:'use-as-is'}))});assert.equal(s.state.dataHandling,null);
  await command(s,'data-handling',{dataHandling:rows});assert.ok(s.state.dataHandling);assert.equal(s.state.phase,2);assert.equal(s.state.track.exhibits.length,3);
 }
 await writeFile(join(stateDir,'screen-sessions.json'),JSON.stringify(sessions.map(s=>({id:s.state.id,trackId:s.trackId}))),{mode:0o600});
 console.log('SCREEN_WAIT_BASELINE '+JSON.stringify(sessions.map(s=>s.state.id)));
 // Normal wall clock works. An authorized operator may age only these disposable fixture clocks
 // externally; production has no time-travel route or client-controlled clock.
 await waitPhase(2);
 for(const s of sessions){assert.equal(s.state.track.exhibits.length,3);assert.equal(s.state.track.emergencyConstraint.memoPoints.length,0);await command(s,'save',{screen:{scratchpad:'Disposable fixture: baseline analysis.',finalDeliverable:'Pre-shock fixture recommendation',branchingDecision:{selectedOption:'2',rationale:'Constrained targeted intervention',rejectedAlternatives:'Broad expansion exceeds available resources',dependencies:'Operational owner and validated data',owner:'Executive sponsor',timing:'Within one day',triggerThreshold:'Reverse if failure exceeds 5%'}}});}
 if(process.env.LIVE_SMOKE_GROQ==='true'){
  const s=sessions[0];const response=await candidate.evaluate(async({id,track})=>{const key=Object.keys(localStorage).find(k=>k.startsWith('sb-')&&k.endsWith('-auth-token')),token=JSON.parse(localStorage.getItem(key)).access_token;const r=await fetch('/api/copilot/chat',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({assessment_id:id,track_id:track,segment_id:2,request_id:crypto.randomUUID(),purpose:'Verify released Screen adoption facts',messages:[{role:'user',content:'Summarize the three adoption rates from the released exhibits in one compact Markdown table. Do not invent information.'}]})});return {status:r.status,text:await r.text()};},{id:s.state.id,track:s.track});assert.equal(response.status,200);assert.match(response.text,/"type":"done"/);assert.match(response.text,/72/);console.log('PASS Screen live Groq released-fact stream');
 }
 console.log('SCREEN_WAIT_SHOCK '+JSON.stringify(sessions.map(s=>s.state.id)));
 await waitPhase(3);
 const headings=['Context & Executive Recommendation','Top 2 Operational/Financial Risks','Monitoring & Risk Mitigation Framework','Uncertainty Acknowledgment & Evidence Dependencies','1 Required Visual Representation'];
 for(const s of sessions){assert.ok(s.state.shockTriggeredAt);assert.ok(s.state.messages.some(m=>m.isEmergency));assert.equal(s.state.finalDeliverable,'Pre-shock fixture recommendation');await command(s,'save',{screen:{branchingDecision:{...s.state.branchingDecision,selectedOption:'1'}}},409);
  const memo=headings.map((h,i)=>'## '+h+'\n\n'+(i===4?'| Action | Trigger |\n| --- | --- |\n| Contain and validate | Failure >5% |':i===0?'Contain the shock and narrow the recommendation.':i===1?'Risk 1: ongoing failures; monitor daily at 5%. Risk 2: constrained capacity; escalate daily if backlog rises 10%.':i===2?'Executive sponsor owns daily recovery review and containment.':'Medium confidence; validate recovery and resource assumptions before expansion.')).join('\n\n');
  await command(s,'advance',{screen:{finalDeliverable:memo}});assert.equal(s.state.status,'SUBMITTED');const record=(await api(grader,'/grader/'+s.state.id)).data;assert.equal(record.finalDeliverable,memo);assert.equal(record.checkpoints.find(c=>c.phase===2).snapshot.finalDeliverable,'Pre-shock fixture recommendation');
  const scores=Object.fromEntries(record.rubricSnapshot.map(c=>[c.id,{score:c.maxScore,notes:'Disposable test: verifying scoring plumbing only; not a hiring assessment.'}]));
  const caps={privacyLeak:false,gateFailure:false,pmBroadLaunch:s.track==='product-management',shockNonAdaptation:true,missingVisual:false,consultingUnsafeExpansion:false,ibMissingDownside:false,calibrationNo:0,evidence:'Disposable cap test. Confirm server enforces requested post-shock caps.'};
  const graded=await api(grader,'/grader/'+s.state.id+'/evaluation',{revision:record.evaluation.revision,scores,screenCaps:caps,feedback:'Disposable test only',humanDecision:'Do not use this fixture for employment decisions',planningCapApplied:false,finalize:true});assert.equal(graded.status,200);assert.equal(graded.data.overallScore,s.track==='product-management'?50:89);
  await command(s,'save',{screen:{scratchpad:'Rejected late edit'}},409);console.log('PASS live Screen '+s.track+': timed shock, persisted memo, submission, certified grading and caps');
 }
 await grader.reload();await grader.getByLabel('Assigned assessment').selectOption(sessions[0].state.id);await grader.getByRole('heading',{name:'Hard caps · evidence required'}).waitFor();await grader.screenshot({path:join(stateDir,'screen-grader.png'),fullPage:true});
 const analytics=await api(admin,'/admin/screen-analytics');assert.equal(analytics.status,200);assert.ok(analytics.data.graded.length>=4);console.log('PASS live Screen grader UI and employer analytics');
 for(const s of sessions)assert.equal((await api(admin,'/admin/assessments/archive',{assessment_id:s.state.id})).status,200);
 console.log('PASS Screen fixtures archived; exact disposable users require operator cleanup.');
}finally{for(const [role,page] of Object.entries(pages))await writeFile(join(stateDir,role+'.json'),JSON.stringify(await page.context().storageState()),{mode:0o600});await browser.close();}
