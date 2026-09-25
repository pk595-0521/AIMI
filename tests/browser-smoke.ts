import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {TRACK_LIST} from '../src/data/tracks';
import {publicSession} from '../server/assessment';
import {emptyWork} from '../src/types/work';
import {policy} from '../server/policy';
import {evaluationEvidence,automatedAdvisory} from '../server/evaluation';
import assert from 'node:assert/strict';
await mkdir('tests/artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});const errors:string[]=[];
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
let record:any;
try{
const landing=await browser.newPage({viewport:{width:1440,height:1000}});
await landing.goto(base);
await landing.getByRole('button',{name:'Request Enterprise Pilot',exact:true}).waitFor();
await landing.getByRole('link',{name:'Candidate Login',exact:true}).waitFor();
await landing.getByRole('link',{name:/^Grader Portal/}).waitFor();
await landing.getByRole('link',{name:/^Employer \/ Admin/}).waitFor();
await landing.goto(base+'/auth/signup');
await landing.getByRole('heading',{name:'Create your account'}).waitFor();
await landing.getByLabel('Full Name').waitFor();
await landing.getByLabel('Access Key / Invite Code (Optional)').waitFor();
await landing.getByText('Leave blank for Candidate access, or enter your Grader/Employer key.').waitFor();
await landing.goto(base+'/auth/login');
await landing.getByRole('heading',{name:'Welcome back'}).waitFor();
await landing.close();
const adminPage=await browser.newPage({viewport:{width:1440,height:1000}});
let assignmentSent=false;
await adminPage.route('**/api/**',async route=>{
 const url=new URL(route.request().url());let data:any=[];
 if(url.pathname==='/api/admin/screen-analytics')data={sampleSize:0,limit:500,passedSessions:0,passedAttempts:0,failedAttempts:0,gateAttempts:0,graded:[]};
 if(url.pathname==='/api/catalog')data=TRACK_LIST.map(t=>({id:t.id+'-v2',title:t.title,companyName:t.companyName}));
 if(url.pathname==='/api/admin/people')data=[{id:'candidate-fixture',name:'Case Tester',email:'case@example.test',role:'APPLICANT'},{id:'grader-fixture',name:'Reviewer',role:'GRADER',certifiedGrader:true}];
 if(url.pathname==='/api/admin/assignments'){assert.deepEqual(route.request().postDataJSON(),{assessmentType:'AIMI_SUPERDAY',trackId:'consulting-v2',candidateId:'candidate-fixture',graderId:'grader-fixture'});assignmentSent=true;data={sessionId:'assigned-fixture'};}
 await route.fulfill({json:data});
});
await adminPage.goto(base+'/demo/employer');
await adminPage.getByRole('combobox',{name:'Select Assessment',exact:true}).selectOption('consulting-v2');
await adminPage.getByRole('combobox',{name:'Candidate',exact:true}).selectOption('candidate-fixture');
await adminPage.getByRole('combobox',{name:'Grader',exact:true}).selectOption('grader-fixture');
await adminPage.getByRole('button',{name:'Assign Assessment',exact:true}).click();
await adminPage.getByRole('status').getByText('Assessment Strategy Consultant assigned to Case Tester').waitFor();assert.ok(assignmentSent);
await adminPage.setViewportSize({width:390,height:844});assert.ok(await adminPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await adminPage.close();
console.log('PASS admin: repository track dropdown, candidate/grader selection, assignment and success confirmation');
for(const track of TRACK_LIST){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>{if(e.message!=='WebSocket closed without opened.')errors.push(e.message)});
 let consent=false;
 let raw:any={id:'2b938834-8258-4fb5-bdbb-aecb68365373',trackId:track.id+'-v2',revision:0,activePhase:1,phaseDeadlineAt:new Date(Date.now()+track.phases[0].durationSeconds*1000),status:'ACTIVE',scenarioSnapshot:track,scenarioVersion:2,rubricSnapshot:track.rubric,drafts:Object.fromEntries(track.deliverables.map(d=>[d.id,{id:d.id,value:''}])),nodes:[],roadmapResponses:{},messages:[],work:emptyWork(),hygieneEvents:[],dataHandling:null,checkpoints:[]};
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),body=req.method()==='POST'?req.postDataJSON():null;let data:any={};
  if(url.pathname==='/api/me')data={role:'APPLICANT',policy,governanceReady:true};
  else if(url.pathname==='/api/tracks')data=[{...track,id:track.id+'-v2'}];
  else if(url.pathname==='/api/admin/screen-analytics')data={sampleSize:0,limit:500,passedSessions:0,passedAttempts:0,failedAttempts:0,gateAttempts:0,graded:[]};
 if(url.pathname==='/api/catalog')data=[{...track,id:track.id+'-v2'}];
  else if(url.pathname==='/api/practice'){assert.equal(body.trackId,track.id+'-v2');data={sessionId:raw.id,trackId:raw.trackId};}
  else if(url.pathname==='/api/legal/consent'){consent=true;data={accepted:true};}
  else if(url.pathname==='/api/assessment')data=consent?{...publicSession(raw),consented:true}:{id:raw.id,consented:false};
  else if(url.pathname.endsWith('/artifacts'))data=[];
  else if(url.pathname==='/api/assessment/sync'){
   assert.equal(body.revision,raw.revision,'client revision stays synchronized');raw.revision++;
   if(body.work)raw.work=body.work;if(body.drafts)raw.drafts=body.drafts;
   if(body.action==='data-handling')raw.dataHandling=body.dataHandling;
   data=publicSession(raw);
  }
  await route.fulfill({json:data});
 });
 await page.goto(base+'/demo');
 if(track.id==='consulting'){await page.getByRole('combobox',{name:'Practice track'}).selectOption(track.id+'-v2');await page.getByRole('button',{name:'Self-Assign Beta Practice Track'}).click();}
 else await page.getByRole('button',{name:'Start Assessment'}).click();
 await page.getByRole('heading',{name:'Before you begin'}).waitFor();assert.equal(await page.getByRole('button',{name:'Accept and enter assessment'}).isEnabled(),false);
 for(const box of await page.getByRole('checkbox').all())await box.check();await page.getByRole('button',{name:'Accept and enter assessment'}).click();await page.getByRole('button',{name:'Complete segment 1'}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:`tests/artifacts/${track.id}-workspace.png`,fullPage:true});
 await page.getByRole('button',{name:'Audit logs',exact:true}).click();await page.getByRole('button',{name:'Add assumption'}).click();await page.getByLabel('Assumption',{exact:true}).fill('Hypothesis persisted through reload');await page.getByLabel('Evidence supporting this assumption').fill('Exhibit 1');await page.getByLabel('What is uncertain?').fill('Causality is uncertain');await page.getByLabel('Assumption confidence').selectOption('medium');await page.getByRole('button',{name:'Save now'}).click();await page.getByRole('status').filter({hasText:'Saved to server'}).waitFor();
 assert.equal(raw.work.assumptions[0].statement,'Hypothesis persisted through reload');
 await page.reload();await page.getByRole('button',{name:'Start Assessment'}).click();await page.getByRole('button',{name:'Audit logs',exact:true}).click();assert.equal(await page.getByLabel('Assumption',{exact:true}).inputValue(),'Hypothesis persisted through reload');
 await page.getByRole('button',{name:'AI verification',exact:true}).click();await page.getByRole('button',{name:'Add AI review'}).click();await page.getByLabel('AI source',{exact:true}).selectOption(track.exhibits.find(e=>e.type==='ai-sample')!.id);await page.getByLabel('Claim reviewed').fill('Unsupported causal claim');await page.getByLabel('Claim classification').selectOption('unsupported');await page.getByLabel('Disposition').selectOption('modify');await page.getByLabel('Independent evidence / calculation and result').fill('Tested using baseline data');await page.screenshot({path:`tests/artifacts/${track.id}-verification.png`,fullPage:true});
 await page.getByRole('button',{name:'Artifact studio',exact:true}).click();await page.getByRole('button',{name:'Create visual'}).click();await page.getByLabel('Visual title',{exact:true}).fill('Compare value and quality');await page.getByLabel('Label 1',{exact:true}).fill('Baseline');await page.getByLabel('Value 1',{exact:true}).fill('42');await page.getByLabel('Label 2',{exact:true}).fill('Proposed');await page.getByLabel('Value 2',{exact:true}).fill('65');await page.getByLabel('Visual source').fill('Exhibit 1');await page.getByLabel('Executive takeaway').fill('Validate quality before expansion');
 await page.getByRole('button',{name:'Decks & memos'}).click();await page.getByRole('button',{name:'New deck'}).click();await page.getByLabel('Document title').fill('Evidence supports a staged decision');await page.getByLabel('Assertion headline 1').fill('Prioritize the verified opportunity');await page.getByLabel('Page 1 narrative / evidence / actions').fill('Owner, milestone and measured progress.');await page.getByRole('checkbox',{name:'Compare value and quality'}).check();await page.getByRole('button',{name:'Preview',exact:true}).click();await page.getByRole('dialog',{name:'Document preview'}).waitFor();await page.screenshot({path:`tests/artifacts/${track.id}-deck.png`,fullPage:true});await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await page.getByRole('button',{name:'Save now'}).click();await page.getByRole('status').filter({hasText:'Saved to server'}).waitFor();
 // Release the server fixture at the configured shock segment and confirm UI exposes the wire and structured response.
 raw.activePhase=track.shockSegment;raw.phaseDeadlineAt=new Date(Date.now()+1200000);raw.messages=[{key:'mid_scenario_constraint',payload:track.inboxMessages.find(m=>m.isEmergency),openedAt:null}];
 await page.reload();await page.getByRole('button',{name:'Start Assessment'}).click();await page.getByRole('button',{name:'Stakeholder inbox',exact:true}).click();await page.getByRole('heading',{name:track.emergencyConstraint.title,exact:true}).waitFor();
 await page.getByRole('button',{name:'Deliverables',exact:true}).click();await page.getByLabel('Revised recommendation',{exact:true}).fill('Contain the issue and validate recovery');await page.getByLabel('1. Context and recommendation').fill('Context and recommendation');await page.getByLabel('2. Top risk 1').fill('Quality risk');await page.getByLabel('2. Top risk 2').fill('Capacity risk');await page.getByLabel('Final confidence').selectOption('low');
 await page.getByRole('button',{name:'Save now'}).click();await page.getByRole('status').filter({hasText:'Saved to server'}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Workspace',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const timer=await page.getByRole('timer').boundingBox();assert.ok(timer&&timer.x+timer.width<=390);await page.screenshot({path:`tests/artifacts/${track.id}-mobile.png`,fullPage:true});
 record=raw;await page.close();console.log(`PASS browser ${track.id}: consent, editable logs, persistence, chart/deck preview, shock fields and mobile bounds`);
}
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>{if(e.message!=='WebSocket closed without opened.')errors.push(e.message)});record.status='SUBMITTED';record.evaluation={revision:0,scores:{},rubricVersion:'test-v2'};record.evidence=evaluationEvidence(record);record.advisory=automatedAdvisory(record);
await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let data:any={};if(path==='/api/me')data={role:'GRADER',certifiedGrader:true};else if(path==='/api/grader/sessions')data=[{id:record.id,trackId:record.trackId,status:record.status,applicant:{email:'candidate@test.invalid'}}];else if(path.endsWith('/artifacts'))data=[];else if(path.endsWith('/prompts'))data={rows:[],nextCursor:null};else data=record;await route.fulfill({json:data});});
await page.goto(base+'/demo/grader');await page.getByLabel('Assigned assessment').selectOption(record.id);await page.getByRole('heading',{name:'Observable signals'}).waitFor();await page.getByRole('button',{name:'Strong / Mid / Weak'}).first().click();await page.getByRole('dialog').waitFor();await page.screenshot({path:'tests/artifacts/grader-anchor.png',fullPage:true});await page.keyboard.press('Escape');
await page.getByRole('button',{name:'Final recommendation',exact:true}).click();await page.screenshot({path:'tests/artifacts/grader-desktop.png',fullPage:true});
await page.getByRole('button',{name:'Quantitative checks',exact:true}).click();await page.getByRole('heading',{name:'Candidate inputs vs. scenario baseline'}).waitFor();await page.getByRole('button',{name:'Shock adaptation',exact:true}).click();await page.getByRole('heading',{name:'Before and after the scenario update'}).waitFor();
assert.deepEqual(errors,[]);console.log('PASS grader split view, anchors, final structure, quantitative comparison and shock evidence; no browser runtime errors');
}finally{await browser.close();}
