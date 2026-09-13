import { authHeaders } from './api';
import {sseData} from './sse';
import type { TrackId, PhaseId } from '../types';
export const COPILOT_MODELS = [{ id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 · 70B', provider: 'Groq Cloud', badge: 'Audited', description: 'Groq Cloud · Llama 3.3 70B Versatile' }];
export interface CopilotQueryOptions { sessionId: string; trackId: TrackId; phaseId: PhaseId; modelId: string; prompt: string; loggedPurpose: string; privateDataShared: boolean; aiVerificationEnabled: boolean }
export async function queryCopilot(options: CopilotQueryOptions, onDelta?:(text:string)=>void,onModel?:(model:string)=>void): Promise<{reply:string;logId:string}> {
  const {sessionId,prompt,loggedPurpose,privateDataShared,aiVerificationEnabled} = options;
  const response=await fetch('/api/copilot/chat',{method:'POST',headers:await authHeaders('application/json'),body:JSON.stringify({assessment_id:sessionId,track_id:options.trackId,segment_id:options.phaseId,request_id:crypto.randomUUID(),messages:[{role:'user',content:prompt}],purpose:loggedPurpose,privateDataShared})});
  if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||'Copilot is unavailable. Please try again shortly.');}
  if(!response.body)throw new Error('Copilot returned no stream.');
  let reply='',logId='',complete=false;
  for await(const data of sseData(response.body)){const event=JSON.parse(data);if(event.type==='start'&&event.model)onModel?.(event.model);if(event.type==='error')throw new Error(event.error);if(event.logId)logId=event.logId;if(event.type==='delta'){reply+=event.text;onDelta?.(reply);}if(event.type==='done')complete=true;}
  if(!complete)throw new Error('Copilot was interrupted. Please try again.');
  return {reply,logId};
}
