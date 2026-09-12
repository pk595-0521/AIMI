import { createHash } from 'node:crypto';
export const policy = {
  version: '2026-09-12.1',
  monitoring: 'Your prompts, Copilot responses, edits, phase checkpoints, and submitted work are recorded and available to authorized human graders for this assessment.',
  zeroRetraining: 'AIMI does not use your assessment content to train models. During beta, you can complete the assessment without an AI provider. Copilot and AI-assisted grading remain unavailable until the administrator verifies an enterprise API contract prohibiting model training. Assessment audit records are retained separately from model training.',
  humanReview: 'AI metrics are supplementary signals only. Certified human graders make final evaluation decisions. No automated hiring decision is made by this platform. Contact your assessment administrator to request an accommodation or human review.',
};
export const policyDigest = createHash('sha256').update(JSON.stringify(policy)).digest('hex');
export function governanceReady() {
  return process.env.AI_ZERO_TRAINING_VERIFIED === 'true' && !!process.env.AI_CONTRACT_REFERENCE;
}
// This release defaults to beta enrollment. Explicit false restores the contract
// prerequisite. This flag never enables outbound AI requests or changes roles.
export function enrollmentReady(env = process.env) {
  const beta = env.NEXT_PUBLIC_BETA_MODE ?? 'true';
  return beta === 'true' || (env.AI_ZERO_TRAINING_VERIFIED === 'true' && !!env.AI_CONTRACT_REFERENCE);
}
