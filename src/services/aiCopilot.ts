import { api } from './api';
import type { TrackId, PhaseId } from '../types';
export const COPILOT_MODELS = [{ id: 'approved-provider', name: 'Organization-approved model', provider: 'Enterprise API', badge: 'Audited', description: 'The server selects the contract-approved provider model.' }];
export interface CopilotQueryOptions { sessionId: string; trackId: TrackId; phaseId: PhaseId; modelId: string; prompt: string; loggedPurpose: string; privateDataShared: boolean; aiVerificationEnabled: boolean }
export async function queryCopilot(options: CopilotQueryOptions): Promise<{reply:string;logId:string}> {
  const {sessionId,prompt,loggedPurpose,privateDataShared,aiVerificationEnabled} = options;
  const result = await api('/prompt/log', { sessionId,requestId:crypto.randomUUID(),prompt,loggedPurpose,privateDataShared,aiVerificationEnabled });
  return result;
}
