import type {TrackConfig} from '../src/types';
import {emptyWork,type AssessmentWork} from '../src/types/work';
import {HttpError} from './validation';
export const hasText=(s:unknown)=>typeof s==='string'&&s.trim().length>0;
export function completeFinal(w:AssessmentWork) {const f=w.final;return !!f&&[f.contextRecommendation,...f.risks,f.monitoring,f.roadmap,f.uncertainty,f.confidence].every(hasText)&&f.risks[0].trim()!==f.risks[1].trim();}
export function completeVerification(v:AssessmentWork['verifications'][number]) {return [v.source,v.claim,v.classification,v.decision,v.issue,v.evidence,v.validation].every(hasText)&&(v.decision==='accept'||hasText(v.correction));}
export function completeVisual(v:AssessmentWork['visuals'][number]) {return [v.title,v.takeaway,v.source].every(hasText)&&v.rows.length>=2&&v.rows.every(r=>hasText(r.label)&&Number.isFinite(r.value));}
export function completeShock(w:AssessmentWork) {return [w.shock.recommendation,w.shock.changed,w.shock.unchanged,w.shock.reason,w.shock.revisedAssumption].every(hasText)&&w.shock.kpis.every(k=>[k.metric,k.threshold,k.owner].every(hasText));}
export function assertWorkIdentity(w:AssessmentWork,old:AssessmentWork,phase:number,t:TrackConfig) {
 for(const group of ['assumptions','verifications','visuals','documents'] as const) {
  if(new Set(w[group].map(x=>x.id)).size!==w[group].length)throw new HttpError(422,'Duplicate evidence IDs');
  for(const item of w[group]) {const previous=old[group].find(x=>x.id===item.id);if(item.phase>phase||item.phase>t.phases.length||(!previous&&item.phase!==phase)||(previous&&previous.phase!==item.phase))throw new HttpError(422,'Evidence segment attribution cannot be changed');}
 }
 const sources=new Set(t.exhibits.filter(e=>!e.graderOnly&&(e.releaseSegment||1)<=phase).map(e=>e.id));
 for(const v of w.verifications)if(v.source.startsWith(t.id+'-ex')&&!sources.has(v.source))throw new HttpError(422,'Verification references an unreleased exhibit');
 if(w.documents.some(d=>d.pages.some(p=>p.visualIds.some(id=>!w.visuals.some(v=>v.id===id)))))throw new HttpError(422,'Document references a missing visual');
}
export function assertRevisedTransition(t:TrackConfig,phase:number,w:AssessmentWork,hygiene:unknown) {
 const fail=(s:string)=>{throw new HttpError(422,s);};
 if(!hygiene)fail('Complete the data hygiene review.');
 if(!w.assumptions.some(a=>[a.statement,a.evidence,a.uncertainty,a.confidence].every(hasText)))fail('Record an assumption, supporting evidence, uncertainty and confidence in Audit logs.');
 if(t.verificationSegments?.includes(phase)) {
  const count=phase===1?(t.minimumInitialClaims||1):1;
  if(w.verifications.filter(v=>v.phase===phase&&completeVerification(v)).length<count)fail(`Complete ${count} AI claim review${count>1?'s':''} for this segment in Audit logs.`);
 }
 const r=t.artifactRequirements!;
 if(phase===r.visualSegment&&w.visuals.filter(v=>v.phase===phase&&completeVisual(v)).length<r.minVisuals)fail(`Create ${r.minVisuals} visuals with data, source and a takeaway in the artifact studio.`);
 const document=(kind:string,stage:string,min:number,max:number)=>w.documents.some(d=>d.kind===kind&&d.stage===stage&&d.phase===phase&&hasText(d.title)&&d.pages.length>=min&&d.pages.length<=max&&d.pages.every(p=>hasText(p.headline)&&hasText(p.body)));
 if(phase===r.draftDeckSegment&&!document('deck','draft',3,3))fail('Build the 3-slide draft executive deck.');
 if(phase===t.shockSegment&&!completeShock(w))fail('Complete the shock response: changed and unchanged conclusions, rationale, revised assumption, and two KPIs with owners and thresholds.');
 if(t.id==='investment-banking'&&phase===2&&!hasText(w.dcfWalkthrough))fail('Record the verbal DCF walkthrough transcript in Deliverables.');
 if(phase===t.phases.length) {
  if(!completeFinal(w))fail('Complete all five final recommendation parts, two distinct risks and a confidence rating.');
  if(!completeShock(w))fail('Complete the post-shock re-underwriting record.');
  if(!w.assumptions.some(a=>hasText(a.revisionReason)))fail('Explain at least one assumption revision after the shock.');
  if(r.finalDeckPages&&!document('deck','final',...r.finalDeckPages as [number,number]))fail('Build a final 4–5-slide deck.');
  if(r.finalMemoPages&&!document('memo','final',...r.finalMemoPages as [number,number]))fail(`Build the final ${r.finalMemoPages.join('–')}-page memo.`);
  if(r.finalDashboard&&!document('dashboard','final',1,1))fail('Build the one-page visual appendix.');
  const finalDocs=w.documents.filter(d=>d.stage==='final'&&d.phase===phase);
  const refs=new Set(finalDocs.flatMap(d=>d.pages.flatMap(p=>p.visualIds)));
  if(r.minVisuals&&[...refs].filter(id=>w.visuals.some(v=>v.id===id&&completeVisual(v))).length<r.minVisuals)fail('Include at least two completed visuals in your final deck or appendix.');
 }
}
export function workOf(s:any):AssessmentWork {return s.work?.final?s.work:emptyWork();}
