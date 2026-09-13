import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {TRACK_LIST} from '../src/data/tracks';
import {publicSession} from '../server/assessment';
import {emptyWork} from '../src/types/work';
import {policy} from '../server/policy';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3179';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},...(process.env.SMOKE_STATE_DIR?{storageState:process.env.SMOKE_STATE_DIR+'/candidate.json'}:{})});
 const t=TRACK_LIST[0],text='**Decision**<br>Validate first.\\n\\n| Metric | Value |\\n| --- | --- |\\n| Revenue | $145M |\\n\\n- Check quality\\n- Review evidence';
 const raw:any={id:'2b938834-8258-4fb5-bdbb-aecb68365373',trackId:t.id+'-v2',revision:0,activePhase:1,phaseDeadlineAt:new Date(Date.now()+1800000),status:'ACTIVE',scenarioSnapshot:t,scenarioVersion:2,rubricSnapshot:t.rubric,drafts:{},nodes:[],roadmapResponses:{},messages:[],work:emptyWork(),hygieneEvents:[],dataHandling:t.dataGate!.fields.map(f=>({fieldName:f.fieldName,action:'use-as-is',rationale:'UI fixture'})),checkpoints:[]};
 await page.route('**/api/**',async route=>{const p=new URL(route.request().url()).pathname;let data:any={};if(p==='/api/me')data={role:'APPLICANT',policy,enrollmentReady:true};if(p==='/api/tracks')data=[{...t,id:raw.trackId}];if(p==='/api/catalog')data=[];if(p==='/api/copilot/config')data={model:'test-stream',provider:'Groq Cloud'};if(p==='/api/assessment')data={...publicSession(raw),consented:true,chatByPhase:{1:Array.from({length:12},(_,i)=>({id:String(i),sender:'assistant',content:text,timestamp:'Test'}))}};await route.fulfill({json:data});});
 // Controlled incremental stream tests scrolling deterministically without writing production records.
 await page.addInitScript(()=>{const original=window.fetch;window.fetch=async(...args)=>{if(String(args[0]).endsWith('/api/copilot/chat'))return new Response(new ReadableStream({start(controller){let n=0;const enc=new TextEncoder();const timer=setInterval(()=>{controller.enqueue(enc.encode('data: '+JSON.stringify({type:'delta',text:'\n\nA measured recommendation keeps stakeholder decisions grounded in case evidence. '+n})+'\n\n'));if(++n===35){clearInterval(timer);controller.enqueue(enc.encode('data: {"type":"done","logId":"fixture"}\n\n'));controller.close();}},100);}}),{headers:{'Content-Type':'text/event-stream'}});return original(...args);};});
 await page.goto(base+(process.env.SMOKE_STATE_DIR?'/assessment':'/demo'));await page.getByRole('button',{name:'Start Assessment'}).click();const scroll=page.getByTestId('copilot-scroll');await scroll.waitFor();
 await page.waitForTimeout(200);assert.ok(await scroll.evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight<60));
 assert.equal(await scroll.locator('strong').first().innerText(),'Decision');assert.equal(await scroll.locator('table').count(),12);assert.equal(await scroll.locator('br').count(),12);
 const width=await scroll.locator('.work-prose').first().evaluate(el=>el.getBoundingClientRect().width);assert.ok(width>220,'message must occupy usable sidebar width');
 const chat=page.getByPlaceholder('Ask Copilot for analysis, formulas, or risk frameworks…');await chat.fill('Give a concise recommendation');await chat.press('Enter');await page.getByPlaceholder('e.g., Synthesizing quantitative DCF assumptions or stress-testing rollout trade-offs...').fill('Layout test');await page.getByRole('button',{name:'Log & Run Query'}).click();
 await page.waitForTimeout(500);
 const table=scroll.locator('.work-table-wrap').last();await table.hover();
 await table.evaluate(el=>{el.scrollLeft=50;(window as any).__tableNode=el;});
 await page.waitForTimeout(700);
 assert.ok(await table.evaluate(el=>el===(window as any).__tableNode&&el.scrollLeft>0),'table DOM and horizontal offset must survive streaming renders');
 await chat.hover();
 await page.getByRole('button',{name:'Jump to latest'}).click();await page.waitForTimeout(150);
 assert.ok(await scroll.evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight<60));
 await scroll.hover();await page.mouse.wheel(0,-700);await page.waitForTimeout(250);const top=await scroll.evaluate(el=>el.scrollTop);await page.waitForTimeout(1400);assert.ok(Math.abs(await scroll.evaluate(el=>el.scrollTop)-top)<5,'stream must not pull a reader back down');
 await page.getByRole('button',{name:'Jump to latest'}).click();await page.waitForTimeout(300);assert.ok(await scroll.evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight<60));
 await page.getByRole('button',{name:'Audit logs',exact:true}).click();await page.getByRole('button',{name:'AI history',exact:true}).click();await page.getByRole('button',{name:'Expand Full Transcript'}).click();const dialog=page.getByRole('dialog',{name:'Full AI transcript'});await dialog.waitFor();assert.ok(await dialog.locator('table').count()>0);assert.ok(await dialog.evaluate(el=>el.getBoundingClientRect().width)>900);await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS chat width, Markdown, near-bottom streaming, manual scroll pause, jump-to-latest, wide candidate transcript and mobile overflow');
}finally{await browser.close();}
