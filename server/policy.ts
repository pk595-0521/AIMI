import { createHash } from 'node:crypto';
export const policy = {
  version: '2026-09-12.2',
  monitoring: 'Your prompts, Copilot responses, edits, phase checkpoints, and submitted work are recorded and available to authorized human graders for this assessment.',
  zeroRetraining: 'AIMI does not use your assessment content to train models. Copilot sends your question and sanitized, released case context to Groq Cloud. Groq’s published terms prohibit training on inputs and outputs without customer permission; reliability or abuse-monitoring retention may apply unless your organization enables zero data retention. AIMI retains prompts and responses for assessment auditing. AI-assisted grading uses a separately approved provider.',
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
