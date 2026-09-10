import 'dotenv/config';
import { db } from './db';
import { json } from './assessment';
import type { TrackConfig } from '../src/types';
// Privileged operator CLI, not an HTTP self-enrollment route. Users must already be provisioned from OIDC.
async function assign() {
 const [applicantId,trackId,graderId] = process.argv.slice(2);
 if(!applicantId||!trackId||!graderId) throw new Error('Usage: tsx server/assign.ts APPLICANT_UUID TRACK_ID GRADER_UUID');
 const session=await db.$transaction(async tx=>{
  const applicant=await tx.user.findUniqueOrThrow({where:{id:applicantId}});
  const grader=await tx.user.findUniqueOrThrow({where:{id:graderId}});
  if(applicant.role!=='APPLICANT'||grader.role!=='GRADER'||!grader.certifiedGrader||grader.organizationId!==applicant.organizationId) throw new Error('Assignment requires an applicant and certified grader in the same organization');
  const track=await tx.assessmentTrack.findUniqueOrThrow({where:{id:trackId},include:{criteria:true}});
  if(!track.approved) throw new Error('Track requires explicit calibration approval');
  const t=track.scenario as unknown as TrackConfig;
  const criteria=track.criteria.map(c=>({...c.anchors as object,id:c.key,name:c.name,weight:c.weight,maxScore:c.maxScore}));
  const peer=t.peerReview;
  const s=await tx.assessmentSession.create({data:{applicantId,organizationId:applicant.organizationId,trackId,scenarioVersion:track.version,scenarioSnapshot:json(t),rubricSnapshot:json(criteria),phaseDeadlineAt:new Date(),drafts:json(Object.fromEntries(t.deliverables.map(d=>[d.id,{id:d.id,value:''}]))),evaluations:{create:{graderId,rubricVersion:track.rubricVersion}},nodes:{create:t.roadmapNodes.map(n=>({key:n.id,phase:n.phaseId,category:['EXECUTE','REVISE'].includes(n.category)?'PILOT':n.category as any,title:n.title,context:n.context,purpose:n.purpose,tradeoffs:n.tradeoffs,owner:n.owner,dependencies:n.dependencies,targetMilestone:n.targetMilestone,triggerThreshold:n.triggerThreshold,positionX:n.position.x,positionY:n.position.y,connectsTo:n.connectsTo||[],bezierPaths:[],isComplete:false}))},messages:{create:[...t.inboxMessages.filter(m=>!m.isEmergency).map(m=>({key:m.id,payload:json(m)})),...(t.designVersion===2?[]:[{key:'peer-review-memo',payload:json({senderName:peer.peerName,senderRole:peer.peerRole,senderInitials:peer.peerName.split(' ').map(x=>x[0]).join(''),subject:'ACTION REQUIRED: Verify teammate AI draft before Phase 2',timestamp:new Date().toISOString(),content:[peer.scenarioContext,'Open this request, verify the claims, cite evidence, choose Accept / Modify / Reject, supply a corrected version and identify further validation.']})}])]}}});
  return s;
 });console.log('Assigned assessment',session.id);
}
assign().finally(()=>db.$disconnect());
