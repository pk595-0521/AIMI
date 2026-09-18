import { db } from './db';
import { SCREEN_TRACKS } from '../src/data/screen';
import { TRACK_LIST } from '../src/data/tracks';
import { json } from './assessment';
import type { TrackConfig } from '../src/types';

// Bundled beta cases are versioned repository content, never generated examples.
export async function seedCatalog() {
  for (const scenario of [...TRACK_LIST,...SCREEN_TRACKS]) {
    const screen=scenario.assessmentType==='AIMI_SCREEN';
    const id = scenario.id + (screen?'-screen-v1':'-v2');
    await db.assessmentTrack.upsert({ where: { id }, update: { approved: true }, create: {
      id, title: scenario.title, version: screen?3:2, scenario: json(scenario),
      phaseConfigurations: json(scenario.phases), rubricVersion: screen?'screen-2026-09-14-v1':'revised-2026-09-10-provisional-v2', approved: true,
      criteria: { create: scenario.rubric.map(c => ({ id: id + ':' + c.id, key: c.id, name: c.name, weight: c.weight, maxScore: c.maxScore, anchors: json(c) })) },
    } });
  }
}

// Candidate catalog must not disclose hidden shocks, future exhibits or rubric answers.
export function trackSummary(id: string, t: TrackConfig) {
  return { id, assessmentType:t.assessmentType||'AIMI_SUPERDAY', title: t.title, companyName: t.companyName, roleTitle: t.roleTitle,
    activeObjective: t.activeObjective,
    phases: t.phases.map(({ id, number, title, subtitle, durationSeconds }) => ({ id, number, title, subtitle, durationSeconds })),
    deliverables: t.deliverables.map(d => ({ id: d.id })),
    emergencyConstraint: { title: `A new development arrives in segment ${t.shockSegment || 3}` } };
}
