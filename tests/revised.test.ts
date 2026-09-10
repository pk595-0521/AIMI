import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACK_LIST} from '../src/data/tracks';
import {emptyWork} from '../src/types/work';
import {workSchema} from '../server/work-validation';
import {publicSession} from '../server/assessment';
import {assertRevisedTransition,assertWorkIdentity,completeFinal} from '../server/revised-workflow';
import {sanitizedContext,unsafePrompt} from '../server/governance';
import {consultingBaseline,dcfBaseline} from '../server/analytics';
import {automatedAdvisory,evaluationEvidence} from '../server/evaluation';
import {validateArtifact} from '../server/artifacts';
const track=TRACK_LIST[0];
for(const [i,t] of TRACK_LIST.entries()){
 test(`${t.id}: timing and staged evidence are consistent`,()=>{
  assert.equal(t.phases.reduce((n,p)=>n+p.durationSeconds/60,0),[120,140,95,120][i]);
  assert.equal(t.phases.length,[5,5,4,5][i]);
  const s={trackId:t.id,activePhase:t.shockSegment!-1,scenarioSnapshot:t,nodes:[],messages:[],phaseDeadlineAt:new Date()};
  const pre=publicSession(s);assert.equal(pre.track.emergencyConstraint.memoPoints.length,0);
  assert.ok(pre.track.exhibits.every(e=>!e.graderOnly&&(e.releaseSegment||1)<t.shockSegment!));
  assert.ok(pre.track.phases.filter(p=>p.id>=t.shockSegment!).every(p=>!p.instructions));
  assert.ok(pre.track.deliverables.every(d=>d.phaseId<t.shockSegment!));
  assert.ok(pre.track.dataGate!.fields.every(f=>!f.expectedAction.length&&!f.ruleRationale));
  const post=publicSession({...s,activePhase:t.shockSegment});assert.ok(post.track.emergencyConstraint.memoPoints.length);
  assert.ok(post.track.exhibits.some(e=>e.releaseSegment===t.shockSegment));assert.ok(!post.track.exhibits.some(e=>e.graderOnly));
 });
 test(`${t.id}: no transition with empty work`,()=>{assert.throws(()=>assertRevisedTransition(t,1,emptyWork(),null),/hygiene/);assert.throws(()=>assertRevisedTransition(t,1,emptyWork(),[]),/assumption/);});
}
test('all final structures require two distinct risks and explicit confidence',()=>{
 const w=emptyWork();Object.assign(w.final,{contextRecommendation:'Context and choice',risks:['First risk','Second risk'],monitoring:'Measures',roadmap:'Actions',uncertainty:'Uncertain',confidence:'low'});assert.equal(completeFinal(w),true);w.final.risks[1]='First risk';assert.equal(completeFinal(w),false);w.final.risks[1]='Second risk';w.final.confidence='';assert.equal(completeFinal(w),false);
 assert.equal(workSchema.safeParse(emptyWork()).success,true);assert.equal(workSchema.safeParse({...w,final:{...w.final,risks:['Only one']}}).success,false);
});
test('evidence cannot be assigned to a future segment or backdated',()=>{
 const w=emptyWork();w.assumptions.push({id:'a',phase:2,statement:'x',evidence:'x',uncertainty:'x',confidence:'low',revisionReason:''});assert.throws(()=>assertWorkIdentity(w,emptyWork(),1,track));assert.throws(()=>assertWorkIdentity(w,emptyWork(),3,track));assert.doesNotThrow(()=>assertWorkIdentity(w,emptyWork(),2,track));
});
test('consulting economics count active users once and discount before subtracting cost',()=>{
 const b=consultingBaseline();assert.equal(b.functions[0].potential,61*3.2*52*34);assert.ok(Math.abs(b.potential-674102)<1e-6);assert.equal(b.realized,b.potential*.6);assert.equal(b.netValue,b.realized-420000);assert.ok(b.netValue<0);assert.equal(b.roi,b.netValue/420000);
});
test('DCF uses forecast growth, change in revenue for NWC and EV-to-equity bridge',()=>{
 const b=dcfBaseline();assert.ok(Math.abs(b.years[0].revenue-50.4)<1e-9);assert.ok(Math.abs(b.years[0].nwc-.168)<1e-9);assert.equal(b.years.length,5);assert.equal(b.equity,b.ev-25);assert.ok(Math.abs(b.compsLow-136.08)<1e-9);assert.ok(Math.abs(b.compsHigh-173.88)<1e-9);assert.ok(b.ev>0&&b.terminalPV<b.terminal);assert.equal(b.growth[0],.2);
});
test('sensitive fields are transformed, never attached to individual records as aggregates',()=>{
 const t=TRACK_LIST[2],decisions=t.dataGate!.fields.map(f=>({fieldName:f.fieldName,action:f.fieldName==='Shipping_ZIP_Code'?'aggregate':f.expectedAction[0],rationale:'Minimum necessary'}));
 const safe=sanitizedContext(t,1,decisions);const data=safe.exhibits.find(e=>e.id===t.id+'-ex3') as any;
 assert.equal(data.rows.length,25);assert.ok(data.rows.every((r:any)=>r.Client_Company_Name==='[REDACTED]'&&!('Shipping_ZIP_Code' in r)));assert.equal(data.aggregates.Shipping_ZIP_Code[0].count,25);
 const raw=t.exhibits[2].tableRows![0];const serialized=JSON.stringify(safe);assert.ok(!serialized.includes(raw.Enterprise_Tax_ID));assert.ok(!serialized.includes(raw.Client_Company_Name));assert.ok(!serialized.includes('Hidden Key Signals'));
 assert.ok(unsafePrompt(raw.Enterprise_Tax_ID,t).length);assert.ok(unsafePrompt('Send to candidate@example.test',t).length);assert.equal(unsafePrompt('Do not upload Enterprise_Tax_ID; analyze 4.7 hours instead.',t).length,0);
});
test('generated PM sample reconciles to the required funnel and rounded NPS',()=>{
 const rows=TRACK_LIST[3].exhibits[5].tableRows!;assert.equal(rows.length,15);assert.equal(rows.filter(r=>r.Account_Linking_Attempted).length,8);assert.equal(rows.filter(r=>r.Account_Linking_Attempted&&!r.Account_Linking_Success).length,6);assert.equal(rows.filter(r=>r.Activation_Completed).length,7);for(const [complete,expected] of [[0,2.6],[1,8.1]]){const group=rows.filter(r=>r.Activation_Completed===complete);assert.equal(Number((group.reduce((n,r)=>n+r.NPS,0)/group.length).toFixed(1)),expected);}
});
test('advisory flags blocked attempts without fabricating external exposure or human conclusions',()=>{
 const s={scenarioSnapshot:track,work:emptyWork(),activePhase:4,hygieneEvents:[{type:'BLOCKED_PII'}],checkpoints:[]};const a=automatedAdvisory(s);assert.equal(a.totalPenalty,10);assert.match(a.evidence.signals.find(s=>s.id==='pii').evidence,/no external exposure observed/);assert.equal(a.evidence.signals.find(s=>s.id==='shock').status,'needs-review');assert.equal(a.evidence.signals.find(s=>s.id==='challenge').status,'missing');
});
test('artifact validation rejects forged file types and oversize content',()=>{assert.throws(()=>validateArtifact(Buffer.from('<script>evil</script>'),'report.pdf'));assert.throws(()=>validateArtifact(Buffer.alloc(5_000_001),'large.pdf'));assert.equal(validateArtifact(Buffer.from('%PDF-1.7\nfixture'),'safe.pdf').mimeType,'application/pdf');assert.equal(validateArtifact(Buffer.from('one,two\n1,2'),'data.csv').mimeType,'text/plain');});
