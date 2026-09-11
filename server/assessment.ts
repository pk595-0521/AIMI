import { Prisma } from '@prisma/client';
import { db } from './db';
import { HttpError, syncSchema } from './validation';
import { assertTransition, checkDataHandling } from './workflow';
import {assertRevisedTransition,assertWorkIdentity,workOf} from './revised-workflow';
import { policy } from './policy';
import type { TrackConfig } from '../src/types';
import type { User } from '@prisma/client';
import { canAccessPortal } from '../src/auth-roles';
export const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function ownedSession(tx: any, id: string, user: User) {
  if (!canAccessPortal(user.role, 'assessment')) throw new HttpError(403, 'Candidate access required');
  const s = await tx.assessmentSession.findFirst({ where: { id, applicantId: user.id, organizationId: user.organizationId }, include: { nodes: true, messages: true } });
  if (!s) throw new HttpError(404, 'Assessment not found');
  return s;
}
export async function requireConsent(tx: any, id: string) {
  if (!await tx.legalConsent.findUnique({ where: { sessionId_policyVersion: { sessionId: id, policyVersion: policy.version } } })) throw new HttpError(403, 'Accept the current assessment consent before continuing');
}
export function assertActive(s: any) {
  if (s.status !== 'ACTIVE' || s.phaseDeadlineAt.getTime() <= Date.now()) throw new HttpError(409, 'Assessment is submitted or its deadline has passed');
}
export function publicSession(s: any) {
  const t = s.scenarioSnapshot as unknown as TrackConfig;
  return {
    id: s.id, trackId: s.trackId, revision: s.revision, phase: s.activePhase,
    deadline: s.phaseDeadlineAt.toISOString(), status: s.status,
    drafts: s.drafts, nodes: s.nodes.map((n: any) => ({ ...n, id: n.key, phaseId: n.phase, position: { x: n.positionX, y: n.positionY }, owner:n.owner||'',dependencies:n.dependencies||'',targetMilestone:n.targetMilestone||'',triggerThreshold:n.triggerThreshold||'' })),
    work: workOf(s), hygieneEvents: s.hygieneEvents || [], roadmapResponses: s.roadmapResponses, peerReview: s.peerReview, reflection: s.reflection, dataHandling: s.dataHandling,
    messages: s.messages.map((m: any) => ({ ...(m.payload as object), id: m.key, unread: !m.openedAt })),
    // Never send unreleased event content or grading keys in applicant API responses.
    track: { ...t, phases:t.phases.map(p=>({...p,instructions:p.id<=s.activePhase?p.instructions:undefined})), deliverables:t.deliverables.filter(d=>d.phaseId<=s.activePhase), exhibits:t.exhibits.filter(e=>!e.graderOnly&&(e.releaseSegment||1)<=s.activePhase), rubric: [], inboxMessages: s.messages.map((m:any) => ({ ...m.payload, id: m.key, unread: !m.openedAt })),
      emergencyConstraint: s.activePhase >= (t.shockSegment || 3) ? t.emergencyConstraint : { title: 'Mid-scenario update', headline: '', indicators: [], memoRecipient: '', memoTimestamp: '', memoPoints: [], adaptationRequirement: '', mandatoryRevisions: [] },
      dataGate: t.dataGate ? { ...t.dataGate, fields: t.dataGate.fields.map(f => ({ ...f, ruleRationale: '', expectedAction: [] })) } : undefined,
    },
  };
}
export async function syncAssessment(user: User, raw: unknown) {
  const input = syncSchema.parse(raw);
  return db.$transaction(async tx => {
    // Row locking serializes saves, transitions, consent and prompt admission.
    await tx.$queryRaw`SELECT id FROM "AssessmentSession" WHERE id = ${input.sessionId}::uuid FOR UPDATE`;
    const s = await ownedSession(tx, input.sessionId, user);
    await requireConsent(tx, s.id); assertActive(s);
    if (s.revision !== input.revision) throw new HttpError(409, 'This assessment changed in another tab. Reload before saving.');
    const t = s.scenarioSnapshot as unknown as TrackConfig;
    const data: any = { revision: { increment: 1 } };
    if(input.work) {assertWorkIdentity(input.work as import("../src/types/work").AssessmentWork,workOf(s),s.activePhase,t);
      for(const v of input.work.verifications.filter(v=>v.source)){
        const exhibit=t.exhibits.find(e=>e.id===v.source&&e.type==='ai-sample'&&!e.graderOnly&&(e.releaseSegment||1)<=s.activePhase);
        if(!exhibit){const logId=v.source.replace(/-response$/,'');if(!/^[0-9a-f-]{36}$/i.test(logId)||!await tx.promptLog.findFirst({where:{id:logId,sessionId:s.id,status:'COMPLETE'}}))throw new HttpError(422,'AI review must reference a released AI exhibit or a recorded Copilot response.');}
      }
      data.work=json(input.work);}
    if (input.drafts) {
      if (Object.keys(input.drafts).some(id => !t.deliverables.some(d => d.id === id))) throw new HttpError(422, 'Unknown deliverable');
      data.drafts = json(input.drafts);
    }
    if (input.roadmapResponses) data.roadmapResponses = json(input.roadmapResponses);
    if (input.reflection) data.reflection = input.reflection;
    if (input.nodes) {
      const keys = new Set(input.nodes.map(n => n.id));
      if (keys.size !== input.nodes.length || input.nodes.some(n => n.connectsTo?.some(k => !keys.has(k) || k === n.id))) throw new HttpError(422, 'Invalid graph connections');
      await tx.roadmapNode.deleteMany({ where: { sessionId: s.id } });
      await tx.roadmapNode.createMany({ data: input.nodes.map(n => {
        const { id, phaseId, position, connectsTo = [], category, ...rest } = n;
        return { ...rest, sessionId: s.id, key: id, phase: phaseId, category: ['EXECUTE','REVISE'].includes(category) ? 'PILOT' : category as any, positionX: position.x, positionY: position.y, connectsTo,
          bezierPaths: connectsTo.map(k => { const target = input.nodes!.find(x => x.id === k)!; return `M ${position.x} ${position.y} C ${position.x + 100} ${position.y}, ${target.position.x - 100} ${target.position.y}, ${target.position.x} ${target.position.y}`; }),
        };
      }) });
    }
    if (input.action === 'open-message') {
      const m = s.messages.find((m: any) => m.key === input.messageId);
      if (!m) throw new HttpError(404, 'Message has not been dispatched');
      if (!m.openedAt) await tx.scenarioMessage.update({ where: { id: m.id }, data: { openedAt: new Date() } });
    }
    if (input.action === 'peer-review') {
      if (!s.messages.some((m: any) => m.key === 'peer-review-memo' && m.openedAt)) throw new HttpError(409, 'Open the peer request in your inbox first');
      if (!input.peerReview) throw new HttpError(422, 'Complete all peer review annotations');
      data.peerReview = json({ ...input.peerReview, timestamp: new Date().toISOString() }); data.isPeerReviewComplete = true;
    }
    if (input.action === 'data-handling') {
      if(!t.dataGate || !input.dataHandling) throw new HttpError(422, 'No data-handling submission supplied for this track');
      try {checkDataHandling(t,input.dataHandling);data.dataHandling=json(input.dataHandling);} catch {
        const events=[...(s.hygieneEvents||[]),{type:'UNSAFE_CLASSIFICATION',phase:s.activePhase,at:new Date().toISOString(),decisions:input.dataHandling}];
        const rejected=await tx.assessmentSession.update({where:{id:s.id},data:{hygieneEvents:json(events),revision:{increment:1}},include:{nodes:true,messages:true}});
        return {...publicSession(rejected),gateError:'Unsafe field decisions were recorded. Correct the classifications before AI use.'};
      }
    }
    if (input.action === 'advance') {
      if (await tx.promptLog.count({ where: { sessionId: s.id, status: 'PENDING' } })) throw new HttpError(409, 'Wait for the pending Copilot response');
      if(t.designVersion===2)assertRevisedTransition(t,s.activePhase,(input.work as import("../src/types/work").AssessmentWork)||workOf(s),data.dataHandling||s.dataHandling);
      else assertTransition(s.activePhase, s.isPeerReviewComplete, input.reflection || s.reflection);
      const drafts = (input.drafts || s.drafts) as any;
      if (t.deliverables.some(d => d.required && d.phaseId === s.activePhase && !drafts[d.id]?.value?.trim())) throw new HttpError(422, 'Complete the required phase deliverables');
      const responses = (input.roadmapResponses || s.roadmapResponses) as any;
      if (t.branchingDecisions.filter(d => d.phaseId === s.activePhase).some(d => {
        const r = responses[d.id]; return !r || !d.options.some(o => o.id === r.selectedOption) || !r.rationale?.trim() || !r.rejectedAlternatives?.trim() || !r.dependencies?.trim() || !r.owner?.trim() || !(r.timing || r.targetMilestone)?.trim() || !r.triggerThreshold?.trim();
      })) throw new HttpError(422, 'Complete branching rationales, rejected alternatives, dependencies, owner, timing and change thresholds in the roadmap');
      await tx.phaseCheckpoint.create({ data: { sessionId: s.id, phase: s.activePhase, revision: s.revision + 1, snapshot: json({ work:input.work||workOf(s),dataHandling:data.dataHandling||s.dataHandling,hygieneEvents:s.hygieneEvents, drafts, nodes: input.nodes || s.nodes, roadmapResponses: input.roadmapResponses || s.roadmapResponses, peerReview: s.peerReview }) } });
      if (s.activePhase === t.phases.length) { data.status = 'SUBMITTED'; data.submittedAt = new Date(); }
      else {
        const next = s.activePhase + 1;
        data.activePhase = next; data.phaseStartedAt = new Date(); data.phaseDeadlineAt = new Date(Date.now() + t.phases[next - 1].durationSeconds * 1000);
        if (next === (t.shockSegment || 3)) {
          const emergency = t.inboxMessages.find(m => m.isEmergency)!;
          await tx.scenarioMessage.create({ data: { sessionId: s.id, key: 'mid_scenario_constraint', payload: json({ ...emergency, content: [...emergency.content, ...t.emergencyConstraint.mandatoryRevisions] }) } });
        }
      }
    }
    const updated = await tx.assessmentSession.update({ where: { id: s.id }, data, include: { nodes: true, messages: true } });
    return publicSession(updated);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
