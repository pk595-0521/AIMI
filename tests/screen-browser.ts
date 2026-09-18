import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {SCREEN_TRACKS,SCREEN_SECTIONS} from '../src/data/screen';
import {publicSession} from '../server/assessment';
import {policy} from '../server/policy';
import {scoreHygiene} from '../server/workflow';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true}),base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
await mkdir('tests/artifacts',{recursive:true});
try{
 for(const t of SCREEN_TRACKS){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const raw:any={id:crypto.randomUUID(),assessmentType:'AIMI_SCREEN',trackId:t.id+'-screen-v1',activePhase:1,revision:0,status:'ACTIVE',scenarioSnapshot:t,rubricSnapshot:t.rubric,scenarioVersion:3,nodes:[],messages:[],hygieneEvents:[],dataHandling:null,finalDeliverable:null,scratchpad:null,branchingDecision:null,phaseDeadlineAt:new Date(Date.now()+2400000),screenStartedAt:new Date(),checkpoints:[],evaluation:{revision:0,scores:{}}};
  await page.route('**/api/**',async route=>{const url=new URL(route.request().url()),body=route.request().method()==='POST'?route.request().postDataJSON():null;let data:any={};
   if(url.pathname==='/api/me')data={role:'APPLICANT',policy,governanceReady:true};
   if(['/api/catalog','/api/tracks'].includes(url.pathname))data=[{...t,id:raw.trackId}];
   if(url.pathname==='/api/assessment')data={...publicSession(raw),consented:true};
   if(url.pathname==='/api/copilot/config')data={model:'llama-3.3-70b-versatile'};
   if(url.pathname==='/api/assessment/sync'){
    assert.equal(body.revision,raw.revision);raw.revision++;
    if(body.screen)Object.assign(raw,body.screen);
   if(body.action==='data-handling'){const score=scoreHygiene(t,body.dataHandling),passed=score.hygiene_multiplier===1;raw.hygieneEvents.push({type:'SCREEN_HYGIENE_ATTEMPT',passed,raw_hygiene_score:score.raw_hygiene_score,hygiene_multiplier:score.hygiene_multiplier,decisions:body.dataHandling});if(passed||raw.hygieneEvents.filter((e:any)=>e.type==='SCREEN_HYGIENE_ATTEMPT').length>=2){raw.dataHandling=body.dataHandling;raw.activePhase=2;}}
    if(body.action==='advance')raw.status='SUBMITTED';
    data=publicSession(raw);
   }
   await route.fulfill({json:data});
  });
  await page.goto(base+'/demo');await page.getByRole('button',{name:'Start Assessment'}).click();await page.getByRole('heading',{name:'Data Hygiene Gate',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Briefing',exact:true}).isEnabled(),false);
  for(const f of t.dataGate!.fields){await page.getByLabel('Handling for '+f.fieldName).selectOption(f.expectedAction[0]);await page.getByLabel('Rationale for '+f.fieldName).fill('Minimum safe handling');}
  await page.getByRole('button',{name:'Submit field classifications'}).click();await page.getByRole('button',{name:'Ex. 1',exact:true}).waitFor();
  await page.waitForTimeout(2500);
  await page.getByRole('button',{name:'Submit Session',exact:true}).waitFor();await page.getByRole('button',{name:'Submit Session',exact:true}).click();await page.getByLabel('Executive memo Markdown').fill('Baseline analysis and decision rationale.');
  await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('status').filter({hasText:/Saved/}).waitFor();
  raw.activePhase=3;raw.shockTriggeredAt=new Date();raw.messages=[{key:'mid_scenario_constraint',payload:t.inboxMessages.find(m=>m.isEmergency)}];
  await page.getByRole('dialog',{name:/URGENT/}).waitFor();await page.getByRole('button',{name:'Open Stakeholder Inbox'}).click();await page.getByText(t.inboxMessages[1].content[0],{exact:true}).waitFor();
  await page.getByRole('button',{name:'Submit Session',exact:true}).click();const memo=SCREEN_SECTIONS.map((title,i)=>'## '+title+'\n\n'+(i===4?'| Choice | Value |\n| --- | --- |\n| Recovery | 167 |':'Post-shock recommendation and evidence.')).join('\n\n');await page.getByLabel('Executive memo Markdown').fill(memo);await page.getByRole('button',{name:'Preview memo'}).click();await page.getByRole('table').waitFor();await page.screenshot({path:`tests/artifacts/screen-${t.id}-memo.png`});await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('status').filter({hasText:/Saved/}).waitFor();assert.equal(raw.finalDeliverable,memo);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`tests/artifacts/screen-${t.id}-mobile.png`});
  await page.getByRole('button',{name:'Submit Session',exact:true}).click();await page.getByRole('button',{name:'Submit final memo'}).click();await page.getByText('Submitted for human review.').waitFor();assert.equal(raw.status,'SUBMITTED');assert.deepEqual(errors,[]);await page.close();console.log('PASS Screen browser '+t.id+': gate, autosave, timed shock, memo/table, mobile and submission');
 }
}finally{await browser.close();}
