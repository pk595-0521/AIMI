import { z } from 'zod';
import { HttpError } from './validation';
import { scoreHygiene } from './workflow';
import { screenMemoProblems } from '../src/screen-scoring';
export const isScreen=(s:any)=>s.assessmentType==='AIMI_SCREEN'||s.scenarioSnapshot?.assessmentType==='AIMI_SCREEN';
export const screenInput=z.object({scratchpad:z.string().max(50000).optional(),finalDeliverable:z.string().max(50000).optional(),branchingDecision:z.object({selectedOption:z.string().max(100),rationale:z.string().max(10000),rejectedAlternatives:z.string().max(10000),dependencies:z.string().max(5000),owner:z.string().max(1000),timing:z.string().max(1000),triggerThreshold:z.string().max(5000)}).strict().optional()}).strict();
const snapshot=(s:any)=>({finalDeliverable:s.finalDeliverable,scratchpad:s.scratchpad,branchingDecision:s.branchingDecision,dataHandling:s.dataHandling});
export function screenPhase(start:Date,now=Date.now()){const elapsed=Math.max(0,now-start.getTime());return {phase:elapsed<300000?1:elapsed<1200000?2:3,expired:elapsed>=2400000};}
export function screenGateState(s:any){
 const attempts=(s.hygieneEvents||[]).filter((e:any)=>e.type==='SCREEN_HYGIENE_ATTEMPT');
 const last=attempts.at(-1), first=attempts[0];
 return {attemptCount:attempts.length,firstAttemptScore:first?.raw_hygiene_score||null,lastAttemptScore:last?.raw_hygiene_score||null,finalized:!!s.dataHandling||attempts.length>=2};
}
// The consent timestamp is the only clock origin. A transaction locks the session even on reads.
export async function refreshScreenClock(tx:any,s:any):Promise<any>{
 if(!isScreen(s)||!s.screenStartedAt||s.status!=='ACTIVE')return s;
 if(typeof tx.$transaction==='function')return tx.$transaction((inner:any)=>refreshScreenClock(inner,s));
 await tx.$queryRaw`SELECT id FROM "AssessmentSession" WHERE id=${s.id}::uuid FOR UPDATE`;
 s=await tx.assessmentSession.findUniqueOrThrow({where:{id:s.id},include:{nodes:true,messages:true}});
 if(s.status!=='ACTIVE')return s;
 const {phase,expired}=screenPhase(s.screenStartedAt);
 // A completed gate may unlock Stage 1 before minute five. Never regress that
 // unlock when the absolute clock still reports the gate segment.
 const effectivePhase=Math.max(s.activePhase,phase);
 const events=[...(s.hygieneEvents||[])];
 const needsGateDeadline=phase>=2&&!s.dataHandling&&!events.some(e=>e.type==='SCREEN_GATE_DEADLINE_MISSED');
 if(effectivePhase===s.activePhase&&!expired&&!needsGateDeadline)return s;
 const data:any={activePhase:effectivePhase,revision:{increment:1}};
 if(phase>=2&&!s.dataHandling&&!events.some(e=>e.type==='SCREEN_GATE_DEADLINE_MISSED'))events.push({type:'SCREEN_GATE_DEADLINE_MISSED',at:new Date(s.screenStartedAt.getTime()+300000).toISOString(),phase:1});
 data.hygieneEvents=events;
 if(phase>=3&&!s.shockTriggeredAt){
  data.shockTriggeredAt=new Date(s.screenStartedAt.getTime()+1200000);
  await tx.phaseCheckpoint.create({data:{sessionId:s.id,phase:2,revision:s.revision+1,snapshot:snapshot(s)}});
  const emergency=s.scenarioSnapshot.inboxMessages.find((m:any)=>m.isEmergency);
  await tx.scenarioMessage.upsert({where:{sessionId_key:{sessionId:s.id,key:'mid_scenario_constraint'}},update:{},create:{sessionId:s.id,key:'mid_scenario_constraint',payload:emergency,dispatchedAt:data.shockTriggeredAt}});
 }
 if(expired){data.status='EXPIRED';data.submittedAt=s.phaseDeadlineAt;}
 return tx.assessmentSession.update({where:{id:s.id},data,include:{nodes:true,messages:true}});
}
export function assertScreenAnalysis(s:any){if(isScreen(s)&&(!s.dataHandling||s.activePhase<2))throw new HttpError(403,'Complete the data hygiene gate before analysis or Copilot use.');}
export async function syncScreen(tx:any,s:any,input:any){
 const data:any={revision:{increment:1}};
 if(input.action==='data-handling'){
  const gate=screenGateState(s);
  if(gate.finalized||gate.attemptCount>=2)throw new HttpError(409,'The data hygiene gate has already been finalized.');
  if(!input.dataHandling)throw new HttpError(422,'Classify every field.');
  const score=scoreHygiene(s.scenarioSnapshot,input.dataHandling),passed=score.hygiene_multiplier===1;
  const attemptNumber=gate.attemptCount+1;
  data.dataHygieneSelections=input.dataHandling;
  data.hygieneEvents=[...(s.hygieneEvents||[]),{type:'SCREEN_HYGIENE_ATTEMPT',attempt:attemptNumber,phase:s.activePhase,at:new Date().toISOString(),decisions:input.dataHandling,passed,...score}];
  // A perfect first attempt or any second attempt finalizes the gate and
  // unlocks Stage 1 immediately. The candidate never waits for minute five.
  if(passed||attemptNumber===2){
   data.dataHandling=input.dataHandling;
   data.activePhase=Math.max(s.activePhase,2);
   data.phaseStartedAt=new Date();
  }
 }else if(input.action==='open-message'){
  assertScreenAnalysis(s);
  const m=s.messages.find((m:any)=>m.key===input.messageId);
  if(!m)throw new HttpError(404,'Message is not released.');
  await tx.scenarioMessage.update({where:{id:m.id},data:{openedAt:m.openedAt||new Date()}});
 }else if(!['save','advance'].includes(input.action))throw new HttpError(422,'Unsupported Screen action.');
 if(input.screen){
  assertScreenAnalysis(s);
  const payload=screenInput.parse(input.screen);
  if(payload.branchingDecision&&JSON.stringify(payload.branchingDecision)!==JSON.stringify(s.branchingDecision)){
   if(s.activePhase!==2)throw new HttpError(409,'The single branching decision is locked after minute 20. Explain subsequent changes in your memo.');
   if(!s.scenarioSnapshot.branchingDecisions[0].options.some((o:any)=>o.id===payload.branchingDecision.selectedOption))throw new HttpError(422,'Choose a valid path.');
  }
  Object.assign(data,payload);
 }
 if(input.work||input.drafts||input.nodes||input.roadmapResponses||input.reflection||input.peerReview)throw new HttpError(422,'Use the Screen scratchpad, branch and executive memo.');
 if(input.action==='advance'){
  assertScreenAnalysis(s);
  if(s.activePhase!==3)throw new HttpError(409,'Final submission opens after the minute-20 emergency update.');
  const branch=data.branchingDecision||s.branchingDecision;
  if(!branch||Object.values(branch).some(v=>typeof v!=='string'||!v.trim()))throw new HttpError(422,'The Phase 1 branching decision is incomplete. Saved work will be retained at expiry.');
  const problems=screenMemoProblems(data.finalDeliverable??s.finalDeliverable);
  if(problems.length)throw new HttpError(422,problems.join(' '));
  await tx.phaseCheckpoint.create({data:{sessionId:s.id,phase:3,revision:s.revision+1,snapshot:snapshot({...s,...data})}});
  data.status='SUBMITTED';data.submittedAt=new Date();
 }
 return tx.assessmentSession.update({where:{id:s.id},data,include:{nodes:true,messages:true}});
}
