import { db } from './db';
import { SCREEN_TRACKS } from '../src/data/screen';
import { TRACK_LIST } from '../src/data/tracks';
import { json } from './assessment';
import type { TrackConfig } from '../src/types';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

const scenarioPayload = z.object({
  track: z.string().min(1), title: z.string().min(1), role: z.string().min(1), contextBrief: z.string().min(1),
  exhibits: z.array(z.object({id:z.string().min(1),number:z.number(),title:z.string().min(1),content:z.string().min(1),releaseSegment:z.number().min(2)}).passthrough()).min(3),
  stakeholderInbox: z.array(z.object({id:z.string().min(1),senderName:z.string().min(1),subject:z.string().min(1),content:z.array(z.string().min(1)).min(1),isEmergency:z.boolean().optional()}).passthrough()).min(2).max(3),
  branchingOptions: z.array(z.object({id:z.string().min(1),options:z.array(z.object({id:z.string().min(1),label:z.string().min(1)}).passthrough()).min(2)}).passthrough()).length(1),
  minute20Shock: z.object({memoPoints:z.array(z.string().min(1)).min(1),mandatoryRevisions:z.array(z.string().min(1)).min(1)}).passthrough(),
}).passthrough();

export type DynamicScenarioRow = {
  id?: string;
  sourceKey?: string;
  track: string;
  title: string;
  role: string;
  contextBrief: string;
  exhibits: unknown;
  stakeholderInbox: unknown;
  branchingOptions: unknown;
  minute20Shock: unknown;
};

export function chooseRandomScenario<T extends { track: string }>(rows: T[], track: string, random = Math.random): T {
  const matches = rows.filter(row => row.track === track);
  if (!matches.length) throw new Error(`No AIMI Screen scenario is configured for ${track}`);
  return matches[Math.min(matches.length - 1, Math.floor(Math.max(0, random()) * matches.length))];
}

export function scenarioFromRow(base: TrackConfig, row: DynamicScenarioRow): TrackConfig {
  scenarioPayload.parse(row);
  if (row.track !== base.id) throw new Error('Scenario track mismatch');
  return {
    ...base,
    title: row.title || base.title,
    roleTitle: row.role || base.roleTitle,
    companyBackground: row.contextBrief || base.companyBackground,
    exhibits: (row.exhibits as TrackConfig['exhibits']) || base.exhibits,
    inboxMessages: (row.stakeholderInbox as TrackConfig['inboxMessages']) || base.inboxMessages,
    branchingDecisions: (row.branchingOptions as TrackConfig['branchingDecisions']) || base.branchingDecisions,
    emergencyConstraint: (row.minute20Shock as TrackConfig['emergencyConstraint']) || base.emergencyConstraint,
  };
}

export function baseScreenTrackId(trackId: string) {
  return trackId.replace(/-screen-v\d+$/, '');
}

export async function loadScenarioForTrack(tx: Prisma.TransactionClient, trackId: string, base: TrackConfig): Promise<TrackConfig> {
  if (base.assessmentType !== 'AIMI_SCREEN') return base;
  const rows = await tx.aimiScenario.findMany({ where: { track: baseScreenTrackId(trackId) } });
  return scenarioFromRow(base, chooseRandomScenario(rows, baseScreenTrackId(trackId)));
}

export async function seedScenarioPool() {
  for (const t of SCREEN_TRACKS) {
    await db.aimiScenario.upsert({
      where: { sourceKey: `screen:${t.id}` },
      update: {
        track: t.id,
        title: t.title,
        role: t.roleTitle,
        contextBrief: t.companyBackground,
        exhibits: json(t.exhibits),
        stakeholderInbox: json(t.inboxMessages),
        branchingOptions: json(t.branchingDecisions),
        minute20Shock: json(t.emergencyConstraint),
      },
      create: {
        sourceKey: `screen:${t.id}`,
        track: t.id,
        title: t.title,
        role: t.roleTitle,
        contextBrief: t.companyBackground,
        exhibits: json(t.exhibits),
        stakeholderInbox: json(t.inboxMessages),
        branchingOptions: json(t.branchingDecisions),
        minute20Shock: json(t.emergencyConstraint),
      },
    });
  }
}

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
  await seedScenarioPool();
}

// Candidate catalog must not disclose hidden shocks, future exhibits or rubric answers.
export function trackSummary(id: string, t: TrackConfig) {
  return { id, assessmentType:t.assessmentType||'AIMI_SUPERDAY', title: t.title, companyName: t.companyName, roleTitle: t.roleTitle,
    activeObjective: t.activeObjective,
    phases: t.phases.map(({ id, number, title, subtitle, durationSeconds }) => ({ id, number, title, subtitle, durationSeconds })),
    deliverables: t.deliverables.map(d => ({ id: d.id })),
    emergencyConstraint: { title: `A new development arrives in segment ${t.shockSegment || 3}` } };
}
