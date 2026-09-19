import {effectiveScreenCaps,scoreScreen} from '../src/screen-scoring';
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Prisma, User } from '@prisma/client';
import { z } from 'zod';
import { db } from './db';
import { json } from './assessment';
import { HttpError } from './validation';
import { loadScenarioForTrack, trackSummary } from './catalog';
import type { AuthRequest } from './auth';
import type { TrackConfig } from '../src/types';
const wrap = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { fn(req as AuthRequest, res).catch(next); };
const admin = (u: User) => { if (!['EMPLOYER_ADMIN', 'SYSTEM_ADMIN'].includes(u.role)) throw new HttpError(403, 'Admin access required'); };
export async function assignSession(tx: Prisma.TransactionClient, applicant: User, trackId: string, graderId?: string) {
  // Serialize duplicate assignment / practice clicks without resetting a live attempt.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${applicant.id}::uuid FOR UPDATE`;
  const track = await tx.assessmentTrack.findUnique({ where: { id: trackId } });
  if (!track?.approved) throw new HttpError(404, 'Active assessment not found');
  if (graderId && !await tx.user.findFirst({ where: { id: graderId, organizationId: applicant.organizationId, role: 'GRADER', disabled: false, certifiedGrader: true } })) throw new HttpError(422, 'Select a certified grader in the candidate organization');
  const existing = await tx.assessmentSession.findFirst({ where: { applicantId: applicant.id, trackId, archivedAt: null, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
  if (existing) {
    if (graderId) await tx.evaluation.upsert({ where: { sessionId_graderId: { sessionId: existing.id, graderId } }, update: {}, create: { sessionId: existing.id, graderId, rubricVersion: track.rubricVersion } });
    return existing;
  }
  const t = await loadScenarioForTrack(tx, trackId, track.scenario as unknown as TrackConfig);
  return tx.assessmentSession.create({ data: {
    applicantId: applicant.id, organizationId: applicant.organizationId, trackId,
    assessmentType:t.assessmentType||'AIMI_SUPERDAY', scenarioVersion: track.version, scenarioSnapshot: json(t), rubricSnapshot: json(t.rubric),
    // Consent starts the clock; an assignment itself cannot expire before start.
    phaseDeadlineAt: new Date(), drafts: json(Object.fromEntries(t.deliverables.map(d => [d.id, { id: d.id, value: '' }]))),
    ...(graderId ? { evaluations: { create: { graderId, rubricVersion: track.rubricVersion } } } : {}),
    nodes: { create: t.roadmapNodes.map(n => ({ key: n.id, phase: n.phaseId, category: ['EXECUTE', 'REVISE'].includes(n.category) ? 'PILOT' : n.category as any, title: n.title, context: n.context, purpose: n.purpose, tradeoffs: n.tradeoffs, owner: n.owner, dependencies: n.dependencies, targetMilestone: n.targetMilestone, triggerThreshold: n.triggerThreshold, positionX: n.position.x, positionY: n.position.y, connectsTo: n.connectsTo || [], bezierPaths: [] })) },
    messages: { create: t.inboxMessages.filter(m => !m.isEmergency).map(m => ({ key: m.id, payload: json(m) })) },
  } });
}
export const assignments = Router();
assignments.get('/catalog', wrap(async (_req, res) => {
  const tracks = await db.assessmentTrack.findMany({ where: { approved: true }, orderBy: { title: 'asc' } });
  res.json(tracks.map(t => trackSummary(t.id, t.scenario as unknown as TrackConfig)));
}));
assignments.get('/admin/people', wrap(async (req, res) => {
  admin(req.user);
  const people = await db.user.findMany({ where: { organizationId: req.user.organizationId, disabled: false, role: { in: ['APPLICANT', 'GRADER'] } }, select: { id: true, subject: true, email: true, role: true, certifiedGrader: true }, orderBy: { email: 'asc' } });
  // Application identity is authoritative; profile is used only for display names.
  const profiles = await db.$queryRaw<{ id: string; full_name: string }[]>`SELECT id::text, full_name FROM public.profiles WHERE id::text IN (SELECT subject FROM "User" WHERE "organizationId"=${req.user.organizationId}::uuid)`;
  res.json(people.map(p => ({ ...p, name: profiles.find(x => x.id === p.subject)?.full_name || p.email })));
}));
assignments.post('/admin/graders/:id/certify', wrap(async (req, res) => {
  admin(req.user); z.object({ confirmed: z.literal(true) }).strict().parse(req.body);
  const result = await db.user.updateMany({ where: { id: z.string().uuid().parse(req.params.id), organizationId: req.user.organizationId, role: 'GRADER', disabled: false }, data: { certifiedGrader: true } });
  if (!result.count) throw new HttpError(404, 'Grader not found'); res.json({ certified: true });
}));
assignments.post('/admin/assignments', wrap(async (req, res) => {
  admin(req.user);
  const input = z.object({ candidateId: z.string().uuid(), trackId: z.string().max(100), graderId: z.string().uuid().optional(),assessmentType:z.enum(['AIMI_SCREEN','AIMI_SUPERDAY']).optional() }).strict().parse(req.body);
  const candidate = await db.user.findFirst({ where: { id: input.candidateId, organizationId: req.user.organizationId, role: 'APPLICANT', disabled: false } });
  if (!candidate) throw new HttpError(404, 'Candidate not found');
  const selected=await db.assessmentTrack.findUnique({where:{id:input.trackId}});
  if(input.assessmentType&&((selected?.scenario as any)?.assessmentType||'AIMI_SUPERDAY')!==input.assessmentType)throw new HttpError(422,'Assessment type does not match the selected track.');
  const session = await db.$transaction(tx => assignSession(tx, candidate, input.trackId, input.graderId));
  res.status(201).json({ sessionId: session.id, trackId: session.trackId });
}));
assignments.post('/practice', wrap(async (req, res) => {
  if (req.user.role !== 'APPLICANT') throw new HttpError(403, 'Candidate access required');
  const { trackId } = z.object({ trackId: z.string().max(100) }).strict().parse(req.body);
  const session = await db.$transaction(tx => assignSession(tx, req.user, trackId));
  res.status(201).json({ sessionId: session.id, trackId: session.trackId });
}));
assignments.post('/grader/claim', wrap(async (req, res) => {
  if (req.user.role !== 'GRADER' || !req.user.certifiedGrader) throw new HttpError(403, 'An administrator must certify your grader account first');
  const { sessionId } = z.object({ sessionId: z.string().uuid() }).strict().parse(req.body);
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "AssessmentSession" WHERE id=${sessionId}::uuid FOR UPDATE`;
    const session = await tx.assessmentSession.findFirst({ where: { id: sessionId, archivedAt: null, organizationId: req.user.organizationId }, include: { evaluations: true, track: true } });
    if (!session) throw new HttpError(404, 'Assessment not found');
    if (session.evaluations.some(e => e.graderId !== req.user.id)) throw new HttpError(409, 'Assessment already has an assigned grader');
    await tx.evaluation.upsert({ where: { sessionId_graderId: { sessionId, graderId: req.user.id } }, update: {}, create: { sessionId, graderId: req.user.id, rubricVersion: session.track.rubricVersion } });
  }); res.json({ assigned: true });
}));

// Archive retains evidence and grading history; tenant and role checks apply to every write.
assignments.get('/admin/assessments', wrap(async (req, res) => {
  admin(req.user);
  const rows = await db.assessmentSession.findMany({where:{organizationId:req.user.organizationId,archivedAt:null},select:{id:true,assessmentType:true,trackId:true,status:true,phaseDeadlineAt:true,createdAt:true,applicant:{select:{email:true}},track:{select:{title:true}},_count:{select:{consents:true}}},orderBy:{createdAt:'desc'},take:500});
  res.json(rows.map(s=>({...s,expired:s.status==='EXPIRED'||(s.status==='ACTIVE'&&s._count.consents>0&&s.phaseDeadlineAt.getTime()<Date.now())})));
}));
assignments.post('/admin/assessments/archive', wrap(async (req, res) => {
  admin(req.user);
  const {assessment_id}=z.object({assessment_id:z.string().uuid()}).strict().parse(req.body);
  await db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "AssessmentSession" WHERE id=${assessment_id}::uuid FOR UPDATE`;
    const s=await tx.assessmentSession.findFirst({where:{id:assessment_id,organizationId:req.user.organizationId}});
    if(!s)throw new HttpError(404,'Assessment not found');
    if(!s.archivedAt)await tx.assessmentSession.update({where:{id:s.id},data:{archivedAt:new Date(),revision:{increment:1}}});
  });
  res.json({archived:true,assessment_id});
}));

assignments.get('/admin/screen-analytics',wrap(async(req,res)=>{
 admin(req.user);
 const rows=await db.assessmentSession.findMany({where:{organizationId:req.user.organizationId,assessmentType:'AIMI_SCREEN',archivedAt:null},select:{id:true,trackId:true,status:true,dataHandling:true,hygieneEvents:true,finalDeliverable:true,scenarioSnapshot:true,evaluations:{where:{finalizedAt:{not:null}},orderBy:{updatedAt:'desc'},take:1,select:{scores:true,screenCaps:true,overallScore:true}}},orderBy:{createdAt:'desc'},take:500});
 const attempts=rows.flatMap(s=>(s.hygieneEvents as any[]).filter(e=>e.type==='SCREEN_HYGIENE_ATTEMPT'));
 const graded=rows.filter(s=>s.evaluations.length).map(s=>{const e=s.evaluations[0];return {sessionId:s.id,trackId:s.trackId,...scoreScreen(e.scores as any,effectiveScreenCaps(s,e.screenCaps as any),(s.scenarioSnapshot as any).id)};});
 res.json({sampleSize:rows.length,limit:500,gateAttempts:attempts.length,passedAttempts:attempts.filter(e=>e.passed).length,failedAttempts:attempts.filter(e=>!e.passed).length,passedSessions:rows.filter(s=>s.dataHandling).length,graded});
}));
