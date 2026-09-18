import { z } from 'zod';
import {workSchema} from './work-validation';
export const text = z.string().trim().min(1).max(30000);
export const peerSchema = z.object({
  decision: z.enum(['accept','modify','reject']), problemsIdentified: text,
  correctedVersion: text, evidenceCited: text, additionalValidation: text,
}).strict();
export const nodeSchema = z.object({
  id: z.string().min(1).max(100), phaseId: z.number().int().min(1).max(5),
  category: z.enum(['DIAGNOSE','ANALYZE','DECIDE','PILOT','EXECUTE','REVISE']),
  title: text, context: z.string().max(10000), purpose: z.string().max(10000), tradeoffs: z.string().max(10000),
  owner: z.string().max(1000).optional(), dependencies: z.string().max(5000).optional(),
  targetMilestone: z.string().max(1000).optional(), triggerThreshold: z.string().max(5000).optional(),
  position: z.object({ x: z.number().finite().min(0).max(10000), y: z.number().finite().min(0).max(10000) }),
  connectsTo: z.array(z.string().max(100)).max(100).optional(), isComplete: z.boolean(), isRevisedAfterConstraint: z.boolean().optional(),
});
export const syncSchema = z.object({
  sessionId: z.string().uuid(), revision: z.number().int().nonnegative(),
  work: workSchema.optional(),
  screen: z.record(z.string(),z.unknown()).optional(),
  action: z.enum(['save','advance','open-message','peer-review','data-handling']),
  drafts: z.record(z.string().max(100), z.object({ id: z.string().max(100), value: z.string().max(50000), lastUpdated: z.string().optional() })).optional(),
  nodes: z.array(nodeSchema).max(100).optional(),
  roadmapResponses: z.record(z.string().max(100), z.object({
    nodeId: z.string().max(100), selectedOption: z.string().max(100).optional(), rationale: z.string().max(10000),
    rejectedAlternatives: z.string().max(10000).optional(), dependencies: z.string().max(5000).optional(),
    owner: z.string().max(1000).optional(), timing: z.string().max(1000).optional(), targetMilestone: z.string().max(1000).optional(),
    triggerThreshold: z.string().max(5000).optional(), isComplete: z.boolean(), isRevisedAfterConstraint: z.boolean().optional(),
  })).optional(),
  reflection: text.optional(), messageId: z.string().max(100).optional(), peerReview: peerSchema.optional(),
  dataHandling: z.array(z.object({ fieldName: z.string().max(100), action: z.enum(['use-as-is','aggregate','redact','exclude']), rationale: text })).max(100).optional(),
}).strict();
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
