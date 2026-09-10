import { createHash } from 'node:crypto';
export const policy = {
  version: '2026-09-10.1',
  monitoring: 'Your prompts, Copilot responses, edits, phase checkpoints, and submitted work are recorded and available to authorized human graders for this assessment.',
  zeroRetraining: 'Assessment prompts and responses are routed exclusively through an approved enterprise API under contractual terms prohibiting their use for model training. AIMI does not use your assessment content to train models. Assessment audit records are retained separately from model training.',
  humanReview: 'AI metrics are supplementary signals only. Certified human graders make final evaluation decisions. No automated hiring decision is made by this platform. Contact your assessment administrator to request an accommodation or human review.',
};
export const policyDigest = createHash('sha256').update(JSON.stringify(policy)).digest('hex');
export function governanceReady() {
  return process.env.AI_ZERO_TRAINING_VERIFIED === 'true' && !!process.env.AI_CONTRACT_REFERENCE;
}
