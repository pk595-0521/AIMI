import { db } from './db';
import { TRACK_LIST } from '../src/data/tracks';
import { json } from './assessment';
import type { TrackConfig } from '../src/types';

// Bundled beta cases are versioned repository content, never generated examples.
export async function seedCatalog() {
  for (const scenario of TRACK_LIST) {
    const id = scenario.id + '-v2';
    await db.assessmentTrack.upsert({ where: { id }, update: { approved: true }, create: {
      id, title: scenario.title, version: 2, scenario: json(scenario),
      phaseConfigurations: json(scenario.phases), rubricVersion: 'revised-2026-09-10-provisional-v2', approved: true,
      criteria: { create: scenario.rubric.map(c => ({ id: id + ':' + c.id, key: c.id, name: c.name, weight: c.weight, maxScore: c.maxScore, anchors: json(c) })) },
    } });
  }
}

// Candidate catalog must not disclose hidden shocks, future exhibits or rubric answers.
export function trackSummary(id: string, t: TrackConfig) {
  return { id, title: t.title, companyName: t.companyName, roleTitle: t.roleTitle,
    activeObjective: t.activeObjective,
    phases: t.phases.map(({ id, number, title, subtitle, durationSeconds }) => ({ id, number, title, subtitle, durationSeconds })),
    deliverables: t.deliverables.map(d => ({ id: d.id })),
    emergencyConstraint: { title: `A new development arrives in segment ${t.shockSegment || 3}` } };
}
