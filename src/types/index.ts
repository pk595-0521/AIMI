export type TrackId = 'consulting' | 'investment-banking' | 'business-operations' | 'product-management';

export type PhaseId = 1 | 2 | 3 | 4 | 5;

export type NavTab = 'workspace' | 'roadmap' | 'inbox' | 'exhibits' | 'deliverables' | 'reviewer';

export type HandlingAction = 'use-as-is' | 'aggregate' | 'redact' | 'exclude';

export type ReviewDecision = 'accept' | 'modify' | 'reject';

export type AssessmentStatus =
  | 'NOT_STARTED'
  | 'DATA_GATE_REQUIRED'
  | 'PHASE_1_ACTIVE'
  | 'PHASE_1_REFLECTION_REQUIRED'
  | 'PHASE_1_COMPLETE'
  | 'PHASE_2_ACTIVE'
  | 'PHASE_2_PEER_REVIEW_REQUIRED'
  | 'PHASE_2_COMPLETE'
  | 'PHASE_3_ALERT_REQUIRED'
  | 'PHASE_3_ACTIVE'
  | 'FINAL_REVIEW'
  | 'SUBMITTED';

export interface ExhibitMetric {
  label: string;
  value: string;
  subtext?: string;
  change?: string;
  color?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'blue';
}

export interface ExhibitTableColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
}

export interface Exhibit {
  releaseSegment?: number;
  graderOnly?: boolean;
  id: string;
  number: number;
  title: string;
  subtitle: string;
  type: 'data' | 'notes' | 'ai-sample' | 'dataset' | 'financial-model';
  content?: string;
  metrics?: ExhibitMetric[];
  tableColumns?: ExhibitTableColumn[];
  tableRows?: Record<string, any>[];
  aiSampleText?: string;
  aiVerificationPrompt?: string;
  downloadFilename?: string;
}

export interface PhaseConfig {
  instructions?: string;
  id: PhaseId;
  number: number;
  title: string;
  subtitle: string;
  durationSeconds: number;
  objective: string;
  focusAreas: string[];
  deliverablesSummary: string[];
}

export interface BranchingDecisionConfig {
  id: string;
  phaseId: PhaseId;
  decisionNumber: number;
  title: string;
  prompt: string;
  options: {
    id: string;
    label: string;
    description?: string;
  }[];
}

export interface RoadmapNode {
  id: string;
  phaseId: PhaseId;
  category: 'DIAGNOSE' | 'ANALYZE' | 'DECIDE' | 'PILOT' | 'EXECUTE' | 'REVISE';
  title: string;
  context: string;
  purpose: string;
  tradeoffs: string;
  owner?: string;
  dependencies?: string;
  targetMilestone?: string;
  triggerThreshold?: string;
  isComplete: boolean;
  isRevisedAfterConstraint?: boolean;
  position: { x: number; y: number };
  connectsTo?: string[];
}

export interface PeerReviewConfig {
  peerName: string;
  peerRole: string;
  scenarioContext: string;
  aiDraftText: string;
  requiredChecks: string[];
}

export interface GovernedField {
  fieldName: string;
  description: string;
  sensitivityLevel: 'Non-Sensitive' | 'PII / Proprietary' | 'PII / Financial' | 'Quasi-ID' | 'Operational Metric' | 'Unstructured / Sensitive';
  expectedAction: HandlingAction[];
  ruleRationale: string;
}

export interface DataGateConfig {
  title: string;
  description: string;
  fields: GovernedField[];
}

export interface EmergencyIndicator {
  name: string;
  currentState: string;
  change: string;
}

export interface EmergencyConstraintConfig {
  title: string;
  headline: string;
  indicators: EmergencyIndicator[];
  memoRecipient: string;
  memoTimestamp: string;
  memoPoints: string[];
  adaptationRequirement: string;
  mandatoryRevisions: string[];
}

export interface DeliverableItemConfig {
  id: string;
  phaseId: PhaseId;
  stepNumber: number;
  title: string;
  description: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'structured' | 'file-upload' | 'financial-table';
  required: boolean;
  initialValue?: string;
}

export interface RubricCategory {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
  description: string;
  anchorStrong: string;
  anchorMid: string;
  anchorWeak: string;
  hardGateRule?: string;
}

export interface TrackConfig {
  assessmentType?: 'AIMI_SCREEN' | 'AIMI_SUPERDAY';
  designVersion?: number;
  shockSegment?: number;
  minimumInitialClaims?: number;
  verificationSegments?: number[];
  artifactRequirements?: {visualSegment:number;minVisuals:number;draftDeckSegment:number|null;finalDeckPages:number[]|null;finalMemoPages:number[]|null;finalDashboard:boolean};
  id: TrackId;
  title: string;
  companyName: string;
  roleTitle: string;
  companyBackground: string;
  activeObjective: string;
  exhibits: Exhibit[];
  phases: PhaseConfig[];
  branchingDecisions: BranchingDecisionConfig[];
  roadmapNodes: RoadmapNode[];
  reflectionPrompt: string;
  phase1ReflectionPrompt?: string;
  peerReview: PeerReviewConfig;
  dataGate?: DataGateConfig;
  emergencyConstraint: EmergencyConstraintConfig;
  deliverables: DeliverableItemConfig[];
  rubric: RubricCategory[];
  inboxMessages: InboxMessage[];
  defaultMetrics?: ExhibitMetric[];
}

export interface InboxMessage {
  id: string;
  senderName: string;
  senderRole: string;
  senderAvatar: string;
  senderInitials: string;
  subject: string;
  timestamp: string;
  isEmergency?: boolean;
  unread: boolean;
  starred?: boolean;
  content: string[];
  attachmentName?: string;
}

export interface DeliverableResponse {
  id: string;
  value: string;
  lastUpdated?: string;
  updatedAt?: string;
  changedAfterShock?: boolean;
}

export interface RoadmapResponse {
  nodeId: string;
  selectedOption?: string;
  rationale: string;
  rejectedAlternatives?: string;
  dependencies?: string;
  owner?: string;
  timing?: string;
  targetMilestone?: string;
  triggerThreshold?: string;
  isComplete: boolean;
  isRevisedAfterConstraint?: boolean;
}

export interface ReflectionResponse {
  text: string;
  timestamp: string;
}

export interface PeerReviewResponse {
  problemsIdentified: string;
  evidenceCited: string;
  decision: ReviewDecision;
  correctedVersion: string;
  additionalValidation: string;
  timestamp: string;
}

export interface DataHandlingResponse {
  fieldName: string;
  action: HandlingAction;
  rationale: string;
  isApproved: boolean;
}

export interface AssumptionEntry {
  id: string;
  assumption: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  phaseCreated: PhaseId;
  changedAfterShock: boolean;
  revisionReason?: string;
}

export interface AIAnnotation {
  id: string;
  exhibitId: string;
  originalText: string;
  annotation: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  promptLogged?: {
    purpose: string;
    privateDataShared: boolean;
    aiVerificationEnabled: boolean;
  };
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'alert';
}

export interface AttemptSnapshot {
  snapshotId: string;
  label: string;
  timestamp: string;
  phase: PhaseId;
  deliverables: Record<string, string>;
  roadmap: Record<string, RoadmapResponse>;
  assumptions: AssumptionEntry[];
}

export interface AttemptState {
  work?: import("./work").AssessmentWork;
  attemptId: string;
  trackId: TrackId;
  status: AssessmentStatus;
  currentPhase: PhaseId;
  timeRemainingSeconds: number;
  totalTimeRemainingSeconds: number;
  isTimerRunning: boolean;
  deliverables: Record<string, DeliverableResponse>;
  roadmapResponses: Record<string, RoadmapResponse>;
  roadmapNodesState: RoadmapNode[];
  reflection?: ReflectionResponse;
  phase1Reflection?: ReflectionResponse;
  peerReview?: PeerReviewResponse;
  peerReviewResponse?: PeerReviewResponse;
  phase2PeerReview?: PeerReviewResponse;
  dataHandling?: DataHandlingResponse[];
  dataGatePassed: boolean;
  dataGateCompleted?: boolean;
  selectedDecisionOptionId?: string;
  assumptions: AssumptionEntry[];
  aiAnnotations: Record<string, string>;
  inbox: InboxMessage[];
  chatByPhase: Record<PhaseId, ChatMessage[]>;
  snapshots: AttemptSnapshot[];
  confidenceRating?: 'high' | 'medium' | 'low';
  timelineEvents: TimelineEvent[];
  timestamps: {
    startedAt: string;
    phase1SubmittedAt?: string;
    phase2SubmittedAt?: string;
    phase3AlertShownAt?: string;
    phase3AlertAcknowledgedAt?: string;
    phase3MessageOpenedAt?: string;
    completedAt?: string;
  };
  reviewerScores?: Record<string, { score: number; notes: string }>;
  uploadedFiles?: { name: string; size: string; timestamp: string }[];
  isSubmitted?: boolean;
  submittedAt?: string;
}
