import type { TrackConfig } from '../src/types';
import { HttpError } from './validation';
import {adjustedPillarScore} from '../src/hygiene-scoring';
export function scoreHygiene(track: TrackConfig, rows: {fieldName:string;action:string;rationale:string}[]) {
  const fields = track.dataGate?.fields || [];
  if (!fields.length || rows.length !== fields.length || new Set(rows.map(r=>r.fieldName)).size !== fields.length ||
      fields.some(f=>!rows.some(r=>r.fieldName===f.fieldName && ['use-as-is','aggregate','redact','exclude'].includes(r.action) && r.rationale.trim()))) {
    throw new HttpError(422, 'Supply one decision and rationale for every governed field');
  }
  const correct = fields.filter(f=>f.expectedAction.includes(rows.find(r=>r.fieldName===f.fieldName)!.action as any)).length;
  return {raw_hygiene_score:{correct,total:fields.length},hygiene_multiplier:correct/fields.length};
}
export function sessionHygiene(s:any) {
  if(s.scenarioSnapshot.assessmentType==='AIMI_SCREEN'){const last=(s.hygieneEvents||[]).filter((e:any)=>e.type==='SCREEN_HYGIENE_ATTEMPT').at(-1);return {raw_hygiene_score:last?.raw_hygiene_score||null,hygiene_multiplier:s.dataHandling?1:0};}
  const recorded = (s.hygieneEvents || []).find((e:any)=>e.type==='HYGIENE_SUBMITTED');
  if (recorded) return {raw_hygiene_score:recorded.raw_hygiene_score,hygiene_multiplier:recorded.hygiene_multiplier};
  // Legacy successful attempts are scored against their assigned snapshot.
  if (s.dataHandling && s.scenarioSnapshot.dataGate?.fields.length) return scoreHygiene(s.scenarioSnapshot,s.dataHandling);
  return {raw_hygiene_score:null,hygiene_multiplier:s.scenarioSnapshot.dataGate?.fields.length?0:1};
}
export function assertTransition(phase: number, peerComplete: boolean, reflection: string | null) {
  if (phase === 1 && !reflection?.trim()) throw new HttpError(409, 'Complete the Phase 1 reflection');
  if (phase === 1 && !peerComplete) throw new HttpError(409, 'Open the peer request and save verification before Phase 2');
  if (phase < 1 || phase > 4) throw new HttpError(409, 'Invalid phase');
}
export function checkDataHandling(track: TrackConfig, rows: { fieldName: string; action: string; rationale: string }[]) {
  const fields = track.dataGate?.fields || [];
  if (new Set(rows.map(r => r.fieldName)).size !== rows.length || rows.length !== fields.length || fields.some(f => !rows.some(r => r.fieldName === f.fieldName && f.expectedAction.includes(r.action as any) && r.rationale.trim()))) {
    throw new HttpError(422, 'Complete safe handling decisions and rationale for every governed field');
  }
}
export function scoreRubric(criteria: any[], scores: Record<string, {score: number; notes: string}>, cap: boolean, multiplier=1) {
  if (Object.keys(scores).length !== criteria.length) throw new HttpError(422, 'Score every rubric criterion');
  let total = 0, weight = 0;
  for (const c of criteria) {
    const value = scores[c.id];
    const max = cap && c.id === 'planning' ? Math.min(5, c.maxScore) : c.maxScore;
    if (!value || !Number.isInteger(value.score) || value.score < 0 || value.score > max || !value.notes.trim()) throw new HttpError(422, `Invalid score or missing evidence: ${c.name} (maximum ${max})`);
    total += adjustedPillarScore(c,value.score,multiplier) / c.maxScore * c.weight; weight += c.weight;
  }
  if (weight <= 0) throw new HttpError(422, 'Rubric weights are not configured');
  return Math.round(total / weight * 10000) / 100;
}
