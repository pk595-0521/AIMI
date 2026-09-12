import {chromium} from 'playwright';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Explicit opt-in: this probe creates disposable accounts and assessment sessions.
// SMOKE_STATE_DIR resumes an interrupted probe; its private files contain sessions.
if(process.env.LIVE_SMOKE_ALLOW_WRITES!=='true')throw new Error('Set LIVE_SMOKE_ALLOW_WRITES=true to create disposable workflow test records.');
const browser=await chromium.launch({headless:true});
const base=process.env.TEST_BASE_URL||'https://aimi-lvls.onrender.com';
const pages={};
const stateDir=process.env.SMOKE_STATE_DIR||await mkdtemp(join(tmpdir(),'aimi-smoke-'));
const runId=process.env.SMOKE_STATE_DIR?await readFile(join(stateDir,'run-id'),'utf8'):Date.now().toString();
await writeFile(join(stateDir,'run-id'),runId,{mode:0o600});
console.log('Smoke state directory: '+stateDir);
const emailFor=role=>'aimi-assignment-smoke-'+runId+'-'+role+'@example.test';
async function api(page,path,body){return page.evaluate(async({path,body})=>{const key=Object.keys(localStorage).find(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'));const token=JSON.parse(localStorage.getItem(key)).access_token;const r=await fetch('/api'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};},{path,body});}
try{
for(const [role,key,route] of [['candidate','','assessment'],['grader','GRADER2026','grader'],['admin','ADMIN2026','employer']]){
 const saved=process.env.SMOKE_STATE_DIR&&await access(join(stateDir,role+'.json')).then(()=>true,()=>false);
 const page=await browser.newPage({viewport:{width:1440,height:1000},...(saved?{storageState:join(stateDir,role+'.json')}:{})});pages[role]=page;
 page.setDefaultTimeout(120000);
 if(saved){await page.goto(base+'/'+route);continue;}
 await page.goto(base+'/auth/signup');await page.getByLabel('Full Name').fill('AIMI disposable assignment verification '+role);await page.getByLabel('Email Address').fill(emailFor(role));await page.getByLabel('Password',{exact:true}).fill(randomBytes(24).toString('base64url'));await page.getByLabel('Access Key / Invite Code (Optional)').fill(key);await page.getByRole('button',{name:'Create account'}).click();await page.waitForURL('**/'+route);console.log('PASS signup '+role);
}
const {admin,candidate,grader}=pages;
const catalog=await api(admin,'/catalog');assert.equal(catalog.data.length,4);
const peopleResponse=await api(admin,'/admin/people');assert.equal(peopleResponse.status,200,JSON.stringify(peopleResponse));const people=peopleResponse.data;const c=people.find(p=>p.email===emailFor('candidate')),g=people.find(p=>p.email===emailFor('grader'));assert.ok(c&&g);
const certification=await api(admin,'/admin/graders/'+g.id+'/certify',{confirmed:true});assert.equal(certification.status,200,JSON.stringify(certification));
await admin.getByRole('button',{name:'Refresh people and tracks'}).click();
await admin.getByRole('combobox',{name:'Select Assessment',exact:true}).selectOption('consulting-v2');await admin.getByRole('combobox',{name:'Candidate',exact:true}).selectOption(c.id);await admin.getByRole('combobox',{name:'Grader',exact:true}).selectOption(g.id);await admin.getByRole('button',{name:'Assign Assessment',exact:true}).click();await admin.getByRole('status').getByText('Assessment Strategy Consultant assigned to '+c.name).waitFor();console.log('PASS live admin dropdown and assignment confirmation');
await candidate.reload();await candidate.getByRole('button',{name:'Start Assessment'}).first().click();await candidate.getByRole('heading',{name:'Before you begin'}).waitFor();const me=await api(candidate,'/me');assert.equal(me.data.enrollmentReady,true);
const accept=candidate.getByRole('button',{name:'Accept and enter assessment'});assert.equal(await accept.isEnabled(),false);
const boxes=await candidate.getByRole('checkbox').all();assert.equal(boxes.length,3);await boxes[0].check();await boxes[1].check();assert.equal(await accept.isEnabled(),false);await boxes[2].check();assert.equal(await accept.isEnabled(),true);await accept.click();await candidate.getByRole('button',{name:'Complete segment 1'}).waitFor();await candidate.getByRole('timer').waitFor();console.log('PASS live candidate consent, Segment 1 and timer');
assert.equal(await candidate.getByPlaceholder('Complete the data hygiene review before AI use').isEnabled(),false);
await candidate.getByRole('button',{name:'Complete data hygiene review',exact:true}).click();
const handling=candidate.getByRole('combobox',{name:/^Handling for /});
for(const select of await handling.all())await select.selectOption('use-as-is');
for(const rationale of await candidate.getByRole('textbox',{name:/^Rationale for /}).all())await rationale.fill('Disposable test: deliberately classify every field as raw.');
await candidate.getByRole('button',{name:'Submit data hygiene attempt',exact:true}).click();
await candidate.getByPlaceholder('Ask Copilot for analysis, formulas, or risk frameworks…').waitFor();
assert.equal(await candidate.getByPlaceholder('Ask Copilot for analysis, formulas, or risk frameworks…').isEnabled(),true);
const gate=(await api(candidate,'/assessment?trackId=consulting-v2')).data;
assert.ok(gate.dataHandling);assert.ok(gate.hygiene_multiplier<1);assert.ok(gate.raw_hygiene_score.total>0);
assert.equal((await api(candidate,'/assessment/sync',{sessionId:gate.id,revision:gate.revision,action:'data-handling',dataHandling:gate.dataHandling})).status,409);
await candidate.reload();await candidate.getByPlaceholder('Ask Copilot for analysis, formulas, or risk frameworks…').waitFor();
assert.equal(await candidate.getByPlaceholder('Ask Copilot for analysis, formulas, or risk frameworks…').isEnabled(),true);
console.log('PASS live incorrect first attempt unlocks Copilot, persists score and rejects retry');

await grader.reload();const queue=(await api(grader,'/grader/sessions')).data;const session=queue.find(s=>s.applicant.email===c.email&&s.trackId==='consulting-v2');assert.ok(session);assert.equal(session.queueStatus,'in_progress');await grader.getByLabel('Assigned assessment').selectOption(session.id);await grader.getByRole('heading',{name:'Observable signals'}).waitFor();console.log('PASS live grader in-progress queue and evidence view');await grader.getByTestId('hygiene-calculation').waitFor();const calculation=await grader.getByTestId('hygiene-calculation').innerText();assert.ok(calculation.includes(gate.raw_hygiene_score.correct+'/'+gate.raw_hygiene_score.total));await grader.getByLabel('Data Hygiene & Privacy score',{exact:true}).fill('4');assert.ok((await grader.getByTestId('hygiene-calculation').innerText()).includes('Final Score: '+(4*gate.hygiene_multiplier).toFixed(2)+'/5'));console.log('PASS live grader gate multiplier calculation');
await candidate.goto(base+'/assessment');await candidate.getByRole('combobox',{name:'Practice track'}).selectOption('product-management-v2');await candidate.getByRole('button',{name:'Self-Assign Beta Practice Track'}).click();await candidate.getByRole('heading',{name:'Before you begin'}).waitFor();console.log('PASS live self-assign practice');
assert.equal((await api(candidate,'/admin/people')).status,403);console.log('PASS candidate admin API denied');
console.log('Health '+(await (await fetch(base+'/api/health')).text()));
}finally{for(const [role,page] of Object.entries(pages)){await writeFile(join(stateDir,role+'.json'),JSON.stringify(await page.context().storageState()),{mode:0o600});}await browser.close();}
