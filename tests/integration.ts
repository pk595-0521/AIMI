import {scoreRubric} from '../server/workflow';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import express from 'express';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {TRACK_LIST} from '../src/data/tracks';
import {emptyWork,type AssessmentWork} from '../src/types/work';
import {policy,policyDigest} from '../server/policy';
const dir=await mkdtemp(path.join(tmpdir(),'aimi-integration-'));
const port=process.env.TEST_PG_PORT?Number(process.env.TEST_PG_PORT):55439;
const pg=new EmbeddedPostgres({databaseDir:path.join(dir,'pg'),port,user:'aimi_test',password:'local-test-only',persistent:false,onLog:()=>{},onError:()=>{},postgresFlags:['-h','127.0.0.1']});
let server:any,issuer:any,db:any;
try{
 await pg.initialise();await pg.start();await pg.createDatabase('aimi_test');
 process.env.DATABASE_URL=`postgresql://aimi_test:local-test-only@127.0.0.1:${port}/aimi_test`;
 const client=pg.getPgClient('aimi_test');await client.connect();
 for(const migration of ['202609100001_initial','202609100002_revised_design','20260913021939_archive_assessments','202609140001_aimi_screen'])await client.query(await readFile(`prisma/migrations/${migration}/migration.sql`,'utf8'));
 await client.query('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role');
 await client.query(await readFile('supabase/migrations/20260912213026_copilot_audit_logs_view.sql','utf8'));
 await client.query('CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text)');await client.end();
 db=(await import('../server/db')).db;
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk={...await exportJWK(publicKey),kid:'local-test',alg:'RS256',use:'sig'};
 const idp=express();idp.get('/jwks',(_req,res)=>res.json({keys:[jwk]}));issuer=idp.listen(0,'127.0.0.1');await new Promise<void>(r=>issuer.on('listening',r));
 process.env.AUTH_JWKS_URL=`http://127.0.0.1:${issuer.address().port}/jwks`;process.env.AUTH_ISSUER='aimi-test';process.env.AUTH_AUDIENCE='aimi-test';
 process.env.AI_ZERO_TRAINING_VERIFIED='true';process.env.AI_CONTRACT_REFERENCE='LOCAL TEST FIXTURE ONLY';process.env.GEMINI_API_KEY='not-a-live-key';process.env.GEMINI_MODEL='not-a-live-model';
 const {api,apiError}=await import('../server/routes');const app=express();app.use(express.json({limit:'1mb'}));app.use('/api',api);app.use(apiError);server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));const origin=`http://127.0.0.1:${server.address().port}`;process.env.APP_ORIGIN=origin;
 const org=await db.organization.create({data:{name:'Isolated integration fixture'}}),otherOrg=await db.organization.create({data:{name:'Other tenant'}});
 async function user(role:string,subject:string,organizationId=org.id){const u=await db.user.create({data:{subject,email:subject+'@test.invalid',role,organizationId,certifiedGrader:role==='GRADER'}});const token=await new SignJWT({}).setProtectedHeader({alg:'RS256',kid:'local-test'}).setSubject(subject).setIssuer('aimi-test').setAudience('aimi-test').setExpirationTime('1h').sign(privateKey);return {...u,token};}
 const applicant=await user('APPLICANT','applicant'),grader=await user('GRADER','grader'),outsider=await user('APPLICANT','outsider',otherOrg.id),employer=await user('EMPLOYER_ADMIN','employer');
 async function call(who:any,url:string,body?:any,expected=200,headers:Record<string,string>={}) {const response=await fetch(origin+'/api'+url,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+who.token,Origin:origin,...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:body===undefined?undefined:Buffer.isBuffer(body)?body:JSON.stringify(body)});const content=response.headers.get('content-type')||'';const data=content.includes('json')?await response.json():Buffer.from(await response.arrayBuffer());assert.equal(response.status,expected,`${url}: ${JSON.stringify(data).slice(0,400)}`);return data;}
 let lastSession:any;
 const stableJson=(value:any)=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='number'?Number(v.toPrecision(14)):v));
 const {seedCatalog}=await import('../server/catalog');await seedCatalog();await seedCatalog();
 assert.equal(await db.assessmentTrack.count(),8);
 const catalog=await call(applicant,'/catalog');assert.equal(catalog.length,8);assert.ok(catalog.every((t:any)=>!t.exhibits&&!t.rubric&&!t.emergencyConstraint.memoPoints));
 await call(applicant,'/admin/people',undefined,403);
 const people=await call(employer,'/admin/people');assert.ok(people.some((p:any)=>p.id===applicant.id));assert.ok(!people.some((p:any)=>p.id===outsider.id));
 await call(employer,'/admin/assignments',{candidateId:outsider.id,trackId:'consulting-v2'},404);
 await call(grader,'/practice',{trackId:'consulting-v2'},403);
 await call(applicant,'/practice',{trackId:'missing'},404);
 const trainee=await user('GRADER','trainee');await db.user.update({where:{id:trainee.id},data:{certifiedGrader:false}});
 await call(trainee,'/grader/claim',{sessionId:'00000000-0000-0000-0000-000000000000'},403);
 await call(applicant,`/admin/graders/${trainee.id}/certify`,{confirmed:true},403);
 await call(employer,`/admin/graders/${trainee.id}/certify`,{confirmed:true});
 assert.equal((await db.user.findUniqueOrThrow({where:{id:trainee.id}})).certifiedGrader,true);

 const {SCREEN_TRACKS,SCREEN_SECTIONS,SCREEN_RUBRIC}=await import('../src/data/screen');
 for(const t of SCREEN_TRACKS){
  const candidate=await user('APPLICANT','screen-'+t.id);
  const assigned=await call(employer,'/admin/assignments',{candidateId:candidate.id,trackId:t.id+'-screen-v1',assessmentType:'AIMI_SCREEN',graderId:grader.id},201);
  await call(candidate,'/legal/consent',{sessionId:assigned.sessionId,policyVersion:policy.version,monitoringAccepted:true,zeroRetrainingAccepted:true,humanReviewAccepted:true},201);
  let s=await call(candidate,'/assessment?trackId='+assigned.trackId);
  assert.equal(s.track.exhibits.length,0);assert.equal(s.phase,1);
  const command=async(action:string,extra:any={},expected=200)=>{const r=await call(candidate,'/assessment/sync',{sessionId:s.id,revision:s.revision,action,...extra},expected);if(expected===200)s=r;return r;};
  const decisions=t.dataGate!.fields.map(f=>({fieldName:f.fieldName,action:f.expectedAction[0],rationale:'Classify safely'}));
  await command('data-handling',{dataHandling:decisions.map(d=>({...d,action:'use-as-is'}))});assert.equal(s.dataHandling,null);assert.equal(s.track.exhibits.length,0);
  await call(candidate,'/copilot/chat',{assessment_id:s.id,track_id:t.id,segment_id:1,request_id:crypto.randomUUID(),purpose:'test',messages:[{role:'user',content:'Analyze this case'}]},403);
  await command('data-handling',{dataHandling:decisions});assert.ok(s.dataHandling);assert.equal(s.phase,2);assert.equal(s.track.exhibits.length,3);
  await command('save',{screen:{scratchpad:'Available immediately after the gate'}});assert.equal(s.scratchpad,'Available immediately after the gate');
  const originTime=new Date(Date.now()-301000);await db.assessmentSession.update({where:{id:s.id},data:{screenStartedAt:originTime,phaseDeadlineAt:new Date(originTime.getTime()+2400000)}});
  s=await call(candidate,'/assessment?trackId='+assigned.trackId);assert.equal(s.phase,2);assert.equal(s.track.exhibits.length,3);assert.equal(s.track.emergencyConstraint.memoPoints.length,0);
  const branchingDecision={selectedOption:'2',rationale:'Targeted intervention',rejectedAlternatives:'Broad scope violates constraints',dependencies:'Validate available resources',owner:'Executive sponsor',timing:'Within one day',triggerThreshold:'Reverse if failure exceeds 5%'};
  await command('save',{screen:{scratchpad:'Saved analysis',finalDeliverable:'Pre-shock memo',branchingDecision}});
  await command('advance',{},409);
  const shockTime=new Date(Date.now()-1201000);await db.assessmentSession.update({where:{id:s.id},data:{screenStartedAt:shockTime,phaseDeadlineAt:new Date(shockTime.getTime()+2400000)}});
  s=await call(candidate,'/assessment?trackId='+assigned.trackId);assert.equal(s.phase,3);assert.ok(s.shockTriggeredAt);assert.ok(s.messages.some((m:any)=>m.isEmergency));assert.equal(s.scratchpad,'Saved analysis');
  await call(candidate,'/assessment?trackId='+assigned.trackId);assert.equal(await db.phaseCheckpoint.count({where:{sessionId:s.id,phase:2}}),1);
  await command('save',{screen:{branchingDecision:{...branchingDecision,selectedOption:'1'}}},409);
  const memo=SCREEN_SECTIONS.map((title,i)=>'## '+title+'\n\n'+(i===4?'| Choice | Value |\n| --- | --- |\n| Reallocate | 167 |':'Post-shock evidence, risk thresholds, owner and confidence.')).join('\n\n');
  await command('advance',{screen:{finalDeliverable:memo}});assert.equal(s.status,'SUBMITTED');
  const record=await call(grader,'/grader/'+s.id);assert.equal(record.finalDeliverable,memo);assert.equal(record.checkpoints[0].snapshot.finalDeliverable,'Pre-shock memo');
  const scores=Object.fromEntries(SCREEN_RUBRIC.map(c=>[c.id,{score:c.maxScore,notes:'Reviewed evidence'}]));
  const {EMPTY_SCREEN_CAPS}=await import('../src/screen-scoring');
  const grade=await call(grader,'/grader/'+s.id+'/evaluation',{revision:0,scores,feedback:'Review completed',humanDecision:'Further interview',planningCapApplied:false,finalize:true,screenCaps:{...EMPTY_SCREEN_CAPS,pmBroadLaunch:t.id==='product-management',evidence:'Post-shock recommendation retains launch'}});
  assert.equal(grade.overallScore,t.id==='product-management'?50:100);
  await command('save',{screen:{scratchpad:'Cannot alter after submission'}},409);
  await call(outsider,'/grader/'+s.id,undefined,404);
 }
 const screenAnalytics=await call(employer,'/admin/screen-analytics');assert.equal(screenAnalytics.sampleSize,4);assert.equal(screenAnalytics.graded.length,4);
 for(const t of TRACK_LIST){
  (await import('../server/copilot')).copilotLimit.resetKey(applicant.id);
  const registry=await db.assessmentTrack.findUniqueOrThrow({where:{id:t.id+'-v2'}});assert.deepEqual(stableJson(registry.scenario),stableJson(t));
  const practice=await call(applicant,'/practice',{trackId:registry.id},201);
  assert.equal((await call(applicant,'/practice',{trackId:registry.id},201)).sessionId,practice.sessionId);
  const queue=await call(grader,'/grader/sessions');assert.ok(queue.some((s:any)=>s.id===practice.sessionId&&s.canClaim&&s.queueStatus==='assigned'));
  await call(grader,'/grader/claim',{sessionId:practice.sessionId});
  await call(trainee,'/grader/claim',{sessionId:practice.sessionId},409);
  const assignment=await call(employer,'/admin/assignments',{candidateId:applicant.id,trackId:registry.id,graderId:grader.id},201);assert.equal(assignment.sessionId,practice.sessionId);
  const assigned=await db.assessmentSession.findUniqueOrThrow({where:{id:assignment.sessionId}});
  assert.deepEqual(stableJson(assigned.scenarioSnapshot),stableJson(t));assert.deepEqual(stableJson(assigned.rubricSnapshot),stableJson(t.rubric));
  let s=await call(applicant,'/assessment?trackId='+registry.id);assert.equal(s.consented,false);assert.equal(s.track,undefined);
  process.env.AI_ZERO_TRAINING_VERIFIED='false';process.env.NEXT_PUBLIC_BETA_MODE='false';
  const consentBody={sessionId:assigned.id,policyVersion:policy.version,monitoringAccepted:true,zeroRetrainingAccepted:true,humanReviewAccepted:true};
  await call(applicant,'/legal/consent',consentBody,503);
  process.env.NEXT_PUBLIC_BETA_MODE='true';
  const betaIdentity=await call(applicant,'/me');assert.equal(betaIdentity.enrollmentReady,true);assert.equal(betaIdentity.governanceReady,false);
  await call(applicant,'/legal/consent',{...consentBody,humanReviewAccepted:false},422);
  await call(applicant,'/legal/consent',{sessionId:assigned.id,policyVersion:policy.version,monitoringAccepted:true,zeroRetrainingAccepted:true,humanReviewAccepted:true},201);
  const started=await db.assessmentSession.findUniqueOrThrow({where:{id:assigned.id}});assert.ok(started.phaseDeadlineAt.getTime()>Date.now());
  await call(applicant,'/legal/consent',consentBody,201);
  assert.equal((await db.assessmentSession.findUniqueOrThrow({where:{id:assigned.id}})).phaseDeadlineAt.getTime(),started.phaseDeadlineAt.getTime());
  assert.ok((await call(grader,'/grader/sessions')).some((row:any)=>row.id===assigned.id&&row.queueStatus==='in_progress'));
  process.env.AI_ZERO_TRAINING_VERIFIED='true';
  s=await call(applicant,'/assessment?trackId='+registry.id);assert.equal(s.phase,1);
  const cmd=async(action:string,extra:any={},expected=200)=>{const r=await call(applicant,'/assessment/sync',{sessionId:s.id,revision:s.revision,action,...extra},expected);if(expected===200)s=r;return r;};
  await call(outsider,'/assessment/sync',{sessionId:s.id,revision:0,action:'save'},404);
  await cmd('advance',{},422);
  const decisions=t.dataGate!.fields.map(f=>({fieldName:f.fieldName,action:f.expectedAction[0],rationale:'Use the minimum necessary safe data.'}));
  const unsafe=decisions.map((d,i)=>i===decisions.length-1?{...d,action:'use-as-is'}:d);
  await cmd('data-handling',{dataHandling:unsafe});assert.equal(s.gateError,undefined);assert.equal(s.hygieneEvents.length,1);assert.deepEqual(s.dataHandling,unsafe);assert.ok(s.hygiene_multiplier<1);
  await cmd('data-handling',{dataHandling:decisions},409);assert.ok(s.dataHandling);
  const reloadedGate=await call(applicant,'/assessment?trackId='+registry.id);assert.deepEqual(reloadedGate.raw_hygiene_score,s.raw_hygiene_score);assert.equal(reloadedGate.hygiene_multiplier,s.hygiene_multiplier);
  await call(applicant,'/prompt/log',{sessionId:s.id,requestId:crypto.randomUUID(),prompt:'Send to person@example.test',loggedPurpose:'Test blocked sensitive data',privateDataShared:false,aiVerificationEnabled:true},422);
  assert.equal(await db.promptLog.count({where:{sessionId:s.id}}),0);
  const chatBody={assessment_id:s.id,track_id:t.id,segment_id:1,request_id:crypto.randomUUID(),purpose:'Local streaming verification',messages:[{role:'user',content:'Compare the case metrics.'}],current_shock_state:{injected:'DO NOT TRUST'}};
  await call(applicant,'/copilot/chat',{...chatBody,segment_id:5},409);
  await call(outsider,'/copilot/chat',chatBody,404);
  await call(applicant,'/copilot/chat',chatBody,503);
  const originalFetch=globalThis.fetch;process.env.GROQ_API_KEY='isolated-test-key';
  globalThis.fetch=(async(url:any,options:any)=>{
   if(String(url).startsWith('https://api.groq.com/')){const body=JSON.parse(options.body);assert.ok(body.messages[0].content.includes(t.companyName));assert.ok(!body.messages[0].content.includes('DO NOT TRUST'));return new Response('data: {"choices":[{"delta":{"content":"Case-grounded answer"}}]}\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});}
   return originalFetch(url,options);
  }) as typeof fetch;
  try{const stream=await call(applicant,'/copilot/chat',chatBody);assert.ok(stream.toString().includes('Case-grounded answer'));assert.ok(stream.toString().includes('"type":"done"'));
   // Completion auditing happens after the response ends.
   let audit;for(let n=0;n<30;n++){audit=await db.promptLog.findFirst({where:{sessionId:s.id,requestId:chatBody.request_id}});if(audit?.status==='COMPLETE')break;await new Promise(r=>setTimeout(r,20));}
   assert.equal(audit.status,'COMPLETE');assert.equal(audit.response,'Case-grounded answer');assert.equal(audit.model,'llama-3.3-70b-versatile');
   const mapped=await db.$queryRawUnsafe('SELECT candidate_id,prompt_text,response_text FROM public.copilot_audit_logs WHERE id=$1::uuid',audit.id);assert.equal(mapped[0].candidate_id,applicant.id);assert.equal(mapped[0].response_text,audit.response);
   await call(applicant,'/copilot/chat',chatBody,409);
  }finally{globalThis.fetch=originalFetch;delete process.env.GROQ_API_KEY;}

  const file=await call(applicant,`/assessment/${s.id}/artifacts`,Buffer.from('%PDF-1.7\nfixture'),201,{'Content-Type':'application/octet-stream','X-File-Name':'fixture.pdf'});
  const downloaded=await call(grader,`/assessment/${s.id}/artifacts/${file.id}`);assert.equal(downloaded.toString(),'%PDF-1.7\nfixture');
  await call(outsider,`/assessment/${s.id}/artifacts/${file.id}`,undefined,404);
  let w=emptyWork();
  for(let p=1;p<=t.phases.length;p++){
   if(p===1)w.assumptions.push({id:'assumption',phase:1,statement:'Test causal hypothesis',evidence:'Exhibit baseline; fixture',uncertainty:'Small sample',confidence:'low',revisionReason:''});
   if(t.verificationSegments!.includes(p))for(let j=0;j<(p===1?t.minimumInitialClaims!:1);j++)w.verifications.push({id:`review-${p}-${j}`,phase:p,source:t.exhibits.filter(e=>e.type==='ai-sample'&&(e.releaseSegment||1)<=p).at(-1)!.id,claim:'An unsupported AI causal claim',classification:'unsupported',decision:'modify',issue:'Correlation does not establish causation',evidence:'Exhibit baseline and independent calculation',correction:'Describe a testable hypothesis',validation:'Run a controlled test'});
   if(p===2){for(let j=0;j<t.artifactRequirements!.minVisuals;j++)w.visuals.push({id:'v'+j,phase:p,title:'Diagnostic comparison',kind:'bar',unit:'test units',source:'Exhibit baseline',takeaway:'Compare functions before expansion',rows:[{label:'A',value:1},{label:'B',value:2}]});if(t.id==='investment-banking')w.dcfWalkthrough='Forecast unlevered FCF; discount at WACC; terminal value; subtract net debt; test sensitivities.';}
   if(p===t.artifactRequirements!.draftDeckSegment)w.documents.push({id:'draft',phase:p,kind:'deck',stage:'draft',title:'Draft decision',pages:Array.from({length:3},(_,i)=>({headline:'Assertion '+i,body:'Evidence and actions',visualIds:w.visuals.map(v=>v.id)}))});
   if(p===t.shockSegment){w.shock={recommendation:'Contain the issue and test before scaling',changed:'Timing and scope',unchanged:'Original objective',reason:'New wire changes the feasible plan',revisedAssumption:'System reliability is less certain',kpis:[{metric:'Quality',threshold:'Target quality restored',owner:'Quality lead'},{metric:'Speed',threshold:'Baseline restored',owner:'Operations'}]};w.assumptions[0].revisionReason='Incident weakened original reliability assumption';}
   if(p===t.phases.length){Object.assign(w.final,{contextRecommendation:'Prioritize an evidence-led pilot',risks:['Quality variance','Implementation capacity'],monitoring:'Weekly metrics and pause thresholds',roadmap:'Named owner and staged launch',uncertainty:'Causality remains uncertain',confidence:'medium'});const requirements=t.artifactRequirements!;for(const [kind,range] of [['deck',requirements.finalDeckPages],['memo',requirements.finalMemoPages],['dashboard',requirements.finalDashboard?[1,1]:null]] as const)if(range)w.documents.push({id:'final-'+kind,phase:p,kind,stage:'final',title:'Final '+kind,pages:Array.from({length:range[0]},(_,i)=>({headline:'Assertion '+i,body:'Executive evidence and actions',visualIds:w.visuals.map(v=>v.id)}))});}
   const draft=t.deliverables.find(d=>d.phaseId===p)!;const drafts={...s.drafts,[draft.id]:{id:draft.id,value:'Segment evidence, recommendation and decision rationale.'}};
   const oldRevision=s.revision;await cmd('save',{work:w,drafts});
   await call(applicant,'/assessment/sync',{sessionId:s.id,revision:oldRevision,action:'save'},409);
   const reload=await call(applicant,'/assessment?trackId='+registry.id);assert.deepEqual(reload.work,w);
   await cmd('advance');
   if(p<t.phases.length){assert.equal(s.phase,p+1);assert.ok(Math.abs((Date.parse(s.deadline)-Date.now())/1000-t.phases[p].durationSeconds)<5);assert.equal(s.messages.filter((m:any)=>m.isEmergency).length,s.phase>=t.shockSegment!?1:0);}
  }
  assert.equal(s.status,'SUBMITTED');assert.equal((await db.phaseCheckpoint.findMany({where:{sessionId:s.id}})).length,t.phases.length);
  await cmd('save',{},409);
  const review=await call(grader,`/grader/${s.id}`);assert.ok(review.evidence.delta.length);assert.equal(review.evidence.signals.find((x:any)=>x.id==='structure').status,'observed');
  const advisory=await call(grader,`/grader/${s.id}/advisory`,{});assert.ok(advisory.advisory.totalPenalty>0);
  const evaluation={revision:advisory.evaluation.revision,scores:Object.fromEntries(t.rubric.map(c=>[c.id,{score:3,notes:'Fixture: specified evidence in segment 2 and shock checkpoint'}])),feedback:'Structured response and acknowledged limitations.',humanDecision:'Human-reviewed evaluation; this is a test fixture.',planningCapApplied:false,finalize:true};
  const result=await call(grader,`/grader/${s.id}/evaluation`,evaluation);assert.equal(result.overallScore,scoreRubric(t.rubric,evaluation.scores,false,s.hygiene_multiplier));assert.ok(result.overallScore<60);
  await call(grader,`/grader/${s.id}/evaluation`,evaluation,409);
  const report=await call(employer,`/employer/${s.id}/report`);assert.equal(report.evaluations.length,1);assert.equal(report.work.final.confidence,'medium');assert.ok(report.hygieneEvents.some((e:any)=>e.type==='BLOCKED_PII'));
  lastSession=s;console.log(`PASS ${t.id}: consent, gates, persistence, all segments, shock, attachments, tenant isolation, snapshots and final human report`);
 }
 // A separate expired attempt must reject mutations on the server, independently of UI timer state.
 const expired=await db.assessmentSession.create({data:{applicantId:applicant.id,organizationId:org.id,trackId:'consulting-v2',scenarioVersion:2,scenarioSnapshot:TRACK_LIST[0],rubricSnapshot:TRACK_LIST[0].rubric,phaseDeadlineAt:new Date(Date.now()-1000),consents:{create:{userId:applicant.id,policyVersion:policy.version,policyDigest,monitoringAccepted:true,zeroRetrainingAccepted:true,humanReviewAccepted:true,ipAddress:'127.0.0.1',userAgent:'fixture'}}}});
 await call(applicant,'/assessment/sync',{sessionId:expired.id,revision:0,action:'save'},409);
 const list=await call(employer,'/admin/assessments');assert.equal(list.find((r:any)=>r.id===expired.id).expired,true);
 const foreignAdmin=await user('EMPLOYER_ADMIN','foreign-admin',otherOrg.id);
 await call(applicant,'/admin/assessments/archive',{assessment_id:expired.id},403);
 await call(grader,'/admin/assessments/archive',{assessment_id:expired.id},403);
 await call(foreignAdmin,'/admin/assessments/archive',{assessment_id:expired.id},404);
 const before=await db.promptLog.count({where:{sessionId:lastSession.id}});
 for(const id of [expired.id,lastSession.id]){await call(employer,'/admin/assessments/archive',{assessment_id:id});await call(employer,'/admin/assessments/archive',{assessment_id:id});}
 assert.ok(!(await call(grader,'/grader/sessions')).some((r:any)=>r.id===lastSession.id));
 assert.ok(!(await call(employer,'/admin/assessments')).some((r:any)=>r.id===expired.id));
 await call(applicant,'/assessment/sync',{sessionId:lastSession.id,revision:lastSession.revision,action:'save'},404);
 assert.equal(await db.promptLog.count({where:{sessionId:lastSession.id}}),before);
 assert.ok(!(await call(applicant,'/tracks')).some((t:any)=>t.id===lastSession.trackId));
 await call(applicant,'/assessment?trackId='+lastSession.trackId,undefined,404);
 const replacement=await call(applicant,'/practice',{trackId:lastSession.trackId},201);assert.notEqual(replacement.sessionId,lastSession.id);
 console.log('PASS archive role/tenant checks, idempotency, hidden candidate/reviewer queues, retained audit and replacement assignment');
 console.log('PASS deadline enforcement and both SQL migrations on isolated PostgreSQL');
}finally{if(server)await new Promise<void>(r=>server.close(()=>r()));if(issuer)await new Promise<void>(r=>issuer.close(()=>r()));if(db)await db.$disconnect();await pg.stop().catch(()=>{});await rm(dir,{recursive:true,force:true});}
