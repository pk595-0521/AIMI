import {
  AttemptState,
  AttemptSnapshot,
  TrackConfig,
  TrackId,
  DeliverableResponse,
  RoadmapResponse,
  TimelineEvent,
  AssumptionEntry,
} from '../types';


const STORAGE_PREFIX = 'aimi_superday_attempt_v2_';

export function createInitialAttemptState(trackConfig: TrackConfig): AttemptState {
  const initialDeliverables: Record<string, DeliverableResponse> = {};
  trackConfig.deliverables.forEach((d) => {
    initialDeliverables[d.id] = {
      id: d.id,
      value: d.initialValue || '',
      updatedAt: new Date().toISOString(),
    };
  });

  const initialRoadmapResponses: Record<string, RoadmapResponse> = {};
  trackConfig.roadmapNodes.forEach((node) => {
    initialRoadmapResponses[node.id] = {
      nodeId: node.id,
      rationale: '',
      isComplete: false,
    };
  });

  const hasDataGate = !!trackConfig.dataGate;
  const initialPhase = 1;
  const totalTime = trackConfig.phases.reduce((acc, p) => acc + p.durationSeconds, 0);

  const initialAssumptions: AssumptionEntry[] = [];

  return {
    attemptId: `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    trackId: trackConfig.id,
    status: hasDataGate ? 'DATA_GATE_REQUIRED' : 'PHASE_1_ACTIVE',
    currentPhase: initialPhase,
    timeRemainingSeconds: trackConfig.phases[0].durationSeconds,
    totalTimeRemainingSeconds: totalTime,
    isTimerRunning: true,
    deliverables: initialDeliverables,
    roadmapResponses: initialRoadmapResponses,
    roadmapNodesState: JSON.parse(JSON.stringify(trackConfig.roadmapNodes)),
    dataGatePassed: !hasDataGate,
    assumptions: initialAssumptions,
    aiAnnotations: {},
    inbox: JSON.parse(JSON.stringify(trackConfig.inboxMessages)),
    chatByPhase: {
      1: [
        {
          id: 'chat-init-1',
          sender: 'assistant',
          content: `Welcome to the ${trackConfig.title} simulation. I am your Copilot assistant. You can prompt me for domain analysis, calculations, or framework structuring. All queries are audited.`,
          timestamp: '09:00 AM',
        },
      ],
      2: [],
      3: [],
      4: [],
      5: [],
    },
    snapshots: [],
    confidenceRating: 'medium',
    timelineEvents: [
      {
        id: 'evt-start',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: 'Assessment Started',
        description: `Started ${trackConfig.title} simulation at ${trackConfig.companyName}.`,
        type: 'info',
      },
    ],
    timestamps: {
      startedAt: new Date().toISOString(),
    },
  };
}

export function loadAttemptState(trackId: TrackId): AttemptState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${trackId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as AttemptState;
      if (parsed && parsed.trackId === trackId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading attempt state from localStorage', e);
  }

  return null;
}

export function saveAttemptState(state: AttemptState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${state.trackId}`, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving attempt state to localStorage', e);
  }
}

export function clearAttemptState(trackId: TrackId): AttemptState {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${trackId}`);
  } catch (e) {
    console.error('Error clearing attempt state', e);
  }
  return null;
}

export function createSnapshot(state: AttemptState, label: string): AttemptSnapshot {
  const plainDeliverables: Record<string, string> = {};
  Object.entries(state.deliverables).forEach(([k, v]) => {
    plainDeliverables[k] = v.value;
  });

  return {
    snapshotId: `snap_${Date.now()}`,
    label,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    phase: state.currentPhase,
    deliverables: plainDeliverables,
    roadmap: JSON.parse(JSON.stringify(state.roadmapResponses)),
    assumptions: JSON.parse(JSON.stringify(state.assumptions)),
  };
}

export function addTimelineEvent(
  state: AttemptState,
  title: string,
  description: string,
  type: TimelineEvent['type'] = 'info'
): TimelineEvent[] {
  const newEvent: TimelineEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    title,
    description,
    type,
  };
  return [newEvent, ...state.timelineEvents];
}
