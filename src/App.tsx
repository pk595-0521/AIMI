import React, { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  TrackId,
  PhaseId,
  NavTab,
  AttemptState,
  ChatMessage,
  RoadmapNode,
  DataHandlingResponse,
  ReflectionResponse,
  PeerReviewResponse,
  DeliverableResponse,
} from './types';
import {SimulationApp as RevisedSimulationApp} from './components/revised/SimulationApp';
import { api, AssessmentClient } from './services/api';
import { LegalConsentModal } from './components/legal/LegalConsentModal';
import { GraderDashboard } from './components/grader/GraderDashboard';
import type { TrackConfig } from './types';
import {
  loadAttemptState,
  saveAttemptState,
  createInitialAttemptState,
  clearAttemptState,
} from './services/storage';
import { useLocalStorageSync } from './hooks/useLocalStorageSync';
import { Header } from './components/common/Header';
import { PhaseStepBar } from './components/common/PhaseStepBar';
import { Sidebar } from './components/common/Sidebar';
import { WorkspaceView } from './components/workspace/WorkspaceView';
import { RoadmapBuilder } from './components/roadmap/RoadmapBuilder';
import { StakeholderInbox } from './components/inbox/StakeholderInbox';
import { ReferenceMaterials } from './components/exhibits/ReferenceMaterials';
import { DeliverablesView } from './components/deliverables/DeliverablesView';
import { ReviewerView } from './components/reviewer/ReviewerView';
import { CopilotPanel } from './components/copilot/CopilotPanel';
import { AuditLogsView } from './components/logs/AuditLogsView';
import { DataGateModal } from './components/modals/DataGateModal';
import { Phase1ReflectionModal } from './components/modals/Phase1ReflectionModal';
import { Phase2PeerReviewModal } from './components/modals/Phase2PeerReviewModal';
import { Phase3EmergencyAlertModal } from './components/modals/Phase3EmergencyAlertModal';
import { AssessmentSubmittedModal } from './components/modals/AssessmentSubmittedModal';
import { TrackSelectionView } from './components/track-selection/TrackSelectionView';
import { UserCheck, Inbox, ShieldCheck, X, AlertTriangle, Lock } from 'lucide-react';
import { supabase, getSupabaseSession } from './services/supabase';
import { LandingPage, SignupPage, LoginPage, AuthRequired, AccessDenied } from './components/auth/AuthPages';
import { canAccessPortal } from './auth-roles';
import { PracticeTracks } from './components/admin/Assignments';

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname.replace(/\/$/, '') || '/');
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    const onNavigate = () => setPathname(window.location.pathname.replace(/\/$/, '') || '/');
    window.addEventListener('popstate', onNavigate);
    return () => window.removeEventListener('popstate', onNavigate);
  }, []);
  useEffect(() => {
    let active = true;
    void getSupabaseSession().then(session => { if (active) { setAuthSession(session); setAuthReady(true); } }).catch(() => { if (active) setAuthReady(true); });
    if (!supabase) return () => { active = false; };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (active) setAuthSession(session); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const signOut = async () => { await supabase?.auth.signOut(); window.location.assign('/'); };
  if (pathname === '/auth/signup') return <SignupPage />;
  if (pathname === '/auth/login') return <LoginPage />;
  const isDevelopment = Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
  // The fixture-only demo keeps the browser smoke test deterministic without
  // introducing a production authentication bypass. Production /demo links
  // remain public landing links and never enter the assessment API.
  if (pathname === '/demo' && isDevelopment) return <CandidateAssessment demo />;
  if (pathname === '/demo/grader' && isDevelopment) return <GraderDashboard canScore />;
  if (pathname === '/demo/employer' && isDevelopment) return <GraderDashboard canScore={false} admin />;
  if (pathname === '/' || pathname === '/demo' || pathname.startsWith('/demo/')) return <LandingPage session={authSession} onSignOut={signOut} />;
  if (!authReady) return <p role="status" className="p-8">Loading account…</p>;
  if (!authSession) return <AuthRequired next={pathname} />;
  if (pathname === '/grader' || pathname.startsWith('/grader/')) return <PortalApp portal="grader" />;
  if (pathname === '/employer' || pathname.startsWith('/employer/') || pathname === '/admin' || pathname.startsWith('/admin/')) return <PortalApp portal="employer" />;
  return <CandidateAssessment />;
}

function PortalApp({ portal }: { portal: 'grader' | 'employer' }) {
  const [identity, setIdentity] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/me').then(setIdentity).catch(e => setError(e.message)); }, []);
  if (error) return <div className="min-h-dvh bg-neutral-50 p-8"><h1 className="text-2xl">AIMI Superday</h1><p role="alert" className="mt-4 work-warning">{error}</p><a className="work-secondary mt-4" href="/auth/login">Sign in again</a></div>;
  if (!identity) return <p role="status" className="p-8">Loading protected portal…</p>;
  const allowed = canAccessPortal(identity.role, portal);
  if (!allowed) return <AccessDenied portal={portal} />;
  return <GraderDashboard admin={portal === 'employer'} isGrader={identity.role === 'GRADER'} canScore={portal === 'grader' && identity.role === 'GRADER' && identity.certifiedGrader} />;
}

function CandidateAssessment({ demo = false }: { demo?: boolean }) {
  const [identity, setIdentity] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [tracks, setTracks] = useState<TrackConfig[]>([]);
  const [error, setError] = useState('');
  const [trackId, setTrackId] = useState<TrackId | null>(null);
  useEffect(() => { api('/me').then(setIdentity).catch(e => setError(e.message)); }, []);
  useEffect(() => { if(identity && canAccessPortal(identity.role, 'assessment')) api('/tracks').then(setTracks).catch(e => setError(e.message)); }, [identity]);
  async function load(id: TrackId) { setError(''); setSession(null); setTrackId(id); try { setSession(await api('/assessment?trackId=' + id)); } catch(e) { setError((e as Error).message); } }
  if(error) return <div className="min-h-dvh p-8 bg-neutral-50"><h1 className="text-2xl mb-4">AIMI Superday</h1><p role="alert" className="work-warning">{error}</p><p className="mt-3 text-sm">Your account may need an assessment assignment from an AIMI administrator.</p><button className="border rounded-full px-4 py-2 mt-4" onClick={() => window.location.reload()}>Retry</button></div>;
  if(!identity) return <p role="status" className="p-8">{demo ? 'Loading assessment demo…' : 'Loading secure assessment…'}</p>;
  if(!canAccessPortal(identity.role, 'assessment')) return <AccessDenied portal="assessment" />;
  if(!trackId) return <><PracticeTracks onAssigned={id => { api('/tracks').then(setTracks).catch(e => setError(e.message)); void load(id as TrackId); }} /><TrackSelectionView tracks={tracks} onSelectTrack={load}/></>;
  if(!session) return <p role="status" className="p-8">Loading assigned assessment…</p>;
  if(!session.consented) return <LegalConsentModal sessionId={session.id} policy={identity.policy} ready={identity.governanceReady} onAccepted={() => load(trackId)}/>;
  if(session.track.designVersion===2)return <RevisedSimulationApp key={session.id} initialSession={session} onSwitch={()=>{setTrackId(null);setSession(null);}}/>;
  return <SimulationApp key={session.id} initialSession={session} onSwitch={() => { setTrackId(null); setSession(null); }}/>;
}
function SimulationApp({ initialSession, onSwitch }: { initialSession: any; onSwitch: () => void }) {
  const client = useMemo(() => new AssessmentClient(initialSession), [initialSession.id]);
  const [syncError, setSyncError] = useState('');
  const [saveStatus, setSaveStatus] = useState('Saved to server');
  const [trackConfig, setTrackConfig] = useState<TrackConfig>(initialSession.track);
  const latest = React.useRef<AttemptState>(null);
  const dirty = React.useRef(false);
  const busy = React.useRef(false);
  const [commandBusy, setCommandBusy] = useState(false);
  function applySession(result: any) {
    setTrackConfig(result.track);
    setAttemptState(prev => ({ ...prev, currentPhase: result.phase, inbox: result.messages,
      timeRemainingSeconds: Math.max(0, Math.ceil((Date.parse(result.deadline) - Date.now())/1000)),
      isSubmitted: result.status !== 'ACTIVE', peerReviewResponse: result.peerReview,
      phase2PeerReview: result.peerReview, phase1Reflection: result.reflection ? { text: result.reflection, timestamp: new Date().toISOString() } : undefined,
      dataGateCompleted: !!result.dataHandling || !result.track.dataGate,
    }));
  }
  async function command(action: string, extra: object = {}) {
    if(busy.current) return null;
    busy.current = true; setCommandBusy(true); setSyncError('');
    try {
      const state = latest.current!;
      const result = await client.command({ action, drafts: state.deliverables, nodes: state.roadmapNodesState, roadmapResponses: state.roadmapResponses, ...extra });
      applySession(result); dirty.current = false; setSaveStatus('Saved to server'); return result;
    } catch(e) { setSyncError((e as Error).message); setSaveStatus('Save failed'); return null; }
    finally { busy.current = false; setCommandBusy(false); }
  }
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId>(initialSession.trackId);
  const [activeTab, setActiveTab] = useState<NavTab>('workspace');
  const [isReviewerMode, setIsReviewerMode] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [showTrackSelection, setShowTrackSelection] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(() => window.innerWidth >= 1280);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  useEffect(() => {
    const closeDesktopDrawersOnMobile = () => {
      if (window.innerWidth < 1280) {
        setIsCopilotOpen(false);
        setIsLeftSidebarOpen(false);
      }
    };
    window.addEventListener('resize', closeDesktopDrawersOnMobile);
    return () => window.removeEventListener('resize', closeDesktopDrawersOnMobile);
  }, []);

  // Deep-linking selections
  const [selectedExhibitId, setSelectedExhibitId] = useState<string | undefined>(undefined);
  const [selectedInboxMessageId, setSelectedInboxMessageId] = useState<string | undefined>(undefined);

  // Modal States
  const [showDataGateModal, setShowDataGateModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showPeerReviewModal, setShowPeerReviewModal] = useState(false);
  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false);
  const [showAssessmentSubmittedModal, setShowAssessmentSubmittedModal] = useState(false);

  // Progression Gate Alert State
  const [gateAlert, setGateAlert] = useState<{
    title: string;
    message: string;
    targetMessageId: string;
  } | null>(null);



  const [attemptState, setAttemptState] = useState<AttemptState>(() => ({
    ...createInitialAttemptState(initialSession.track), attemptId: initialSession.id,
    currentPhase: initialSession.phase, deliverables: initialSession.drafts,
    roadmapNodesState: initialSession.nodes, roadmapResponses: initialSession.roadmapResponses,
    inbox: initialSession.messages, peerReviewResponse: initialSession.peerReview,
    phase2PeerReview: initialSession.peerReview,
    phase1Reflection: initialSession.reflection ? { text: initialSession.reflection, timestamp: new Date().toISOString() } : undefined,
    dataHandling: initialSession.dataHandling, dataGateCompleted: !!initialSession.dataHandling || !initialSession.track.dataGate,
    isSubmitted: initialSession.status !== 'ACTIVE',
    chatByPhase: initialSession.chatByPhase || { 1: [], 2: [], 3: [], 4: [], 5: [] },
    timeRemainingSeconds: Math.max(0,Math.ceil((Date.parse(initialSession.deadline)-Date.now())/1000)),
  }));
  latest.current = attemptState;
  useEffect(() => { setShowDataGateModal(!!trackConfig.dataGate && !attemptState.dataGateCompleted && !attemptState.isSubmitted); }, [attemptState.dataGateCompleted]);
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0,Math.ceil((Date.parse(client.session.deadline)-Date.now())/1000));
      setAttemptState(prev => ({ ...prev, timeRemainingSeconds: remaining, isSubmitted: prev.isSubmitted || remaining === 0 }));
    },1000); return () => clearInterval(timer);
  }, [client]);
  const savePayload = JSON.stringify([attemptState.deliverables, attemptState.roadmapNodesState, attemptState.roadmapResponses]);
  const lastPayload = React.useRef(savePayload);
  useEffect(() => {
    if(lastPayload.current === savePayload || attemptState.isSubmitted || syncError) return;
    dirty.current = true; setSaveStatus('Unsaved changes');
    const timer = setTimeout(async () => {
      if(busy.current) return;
      const result = await command('save');
      if(result) lastPayload.current = savePayload;
    },700);
    return () => clearTimeout(timer);
  }, [savePayload, commandBusy]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if(dirty.current) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload',warn); }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('selectedMsg');
    if(id) { setSelectedInboxMessageId(id); setActiveTab('inbox'); }
  }, []);

  // Handlers
  const handleSelectTrack = async () => { if(busy.current) return; if(!dirty.current || await command('save')) onSwitch(); };
  const handlePhaseChange = async (phaseId: PhaseId) => {
    if(attemptState.isSubmitted || phaseId !== attemptState.currentPhase + 1) return;
    const result = await command('advance');
    if(result?.phase === 3) setShowEmergencyAlert(true);
    else if(!result && attemptState.currentPhase === 1 && !attemptState.peerReviewResponse) setGateAlert({ title: 'Peer verification required', message: 'Open the peer request, review the draft and save all verification annotations before Phase 2.', targetMessageId: 'peer-review-memo' });
  };
  const handleSubmitPhase = async (phaseId: PhaseId) => {
    if(phaseId !== attemptState.currentPhase || attemptState.isSubmitted) return;
    if(phaseId === 1 && !attemptState.phase1Reflection) { setShowReflectionModal(true); return; }
    if(phaseId < 4) await handlePhaseChange((phaseId+1) as PhaseId);
    else { const result=await command('advance'); if(result) setShowAssessmentSubmittedModal(true); }
  };
  const handleCompleteReflection = async (reflection: ReflectionResponse) => {
    const saved=await command('save', { reflection: reflection.text });
    if(saved) { setShowReflectionModal(false); setGateAlert({ title: 'Peer verification required', message: 'Open the peer request and save verification before submitting Phase 1.', targetMessageId: 'peer-review-memo' }); }
  };
  const handleCompletePeerReview = async (peerReview: PeerReviewResponse) => {
    const { timestamp, ...annotations } = peerReview;
    if(await command('peer-review', { peerReview: annotations })) { setShowPeerReviewModal(false); setGateAlert(null); }
  };
  const handleCompleteDataGate = async (responses: DataHandlingResponse[]) => {
    if(await command('data-handling', { dataHandling: responses.map(({fieldName,action,rationale}) => ({fieldName,action,rationale})) })) setShowDataGateModal(false);
  };

  const handleUpdateDeliverable = (id: string, value: string) => {
    if (attemptState.isSubmitted) return;
    setAttemptState((prev) => ({
      ...prev,
      deliverables: {
        ...prev.deliverables,
        [id]: {
          id,
          value,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      },
    }));
  };

  const handleSelectDecisionOption = (nodeId: string, optionId: string, rationale: string, fields: Record<string,string> = {}) => {
    if (attemptState.isSubmitted) return;
    setAttemptState((prev) => ({
      ...prev,
      selectedDecisionOptionId: optionId,
      roadmapResponses: {
        ...prev.roadmapResponses,
        [nodeId]: {
          ...prev.roadmapResponses[nodeId],
          ...fields,
          nodeId,
          selectedOption: optionId,
          rationale,
          isComplete: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      },
    }));
  };

  const handleUpdateRoadmapNodes = (nodes: RoadmapNode[]) => {
    if (attemptState.isSubmitted) return;
    setAttemptState((prev) => ({
      ...prev,
      roadmapNodesState: nodes,
    }));
  };

  const handleNavigateToExhibit = (exhibitId: string) => {
    setSelectedExhibitId(exhibitId);
    setActiveTab('exhibits');
  };

  const handleNavigateToInbox = (messageId?: string) => {
    if (messageId) {
      const url = new URL(window.location.href); url.searchParams.set('selectedMsg',messageId); window.history.replaceState(null,'',url);
      setSelectedInboxMessageId(messageId);
    }
    setActiveTab('inbox');
  };

  const handleSendChatMessage = (msg: ChatMessage) => {
    setAttemptState((prev) => {
      const currentPhase = prev.currentPhase;
      const phaseMessages = prev.chatByPhase[currentPhase] || [];
      return {
        ...prev,
        chatByPhase: {
          ...prev.chatByPhase,
          [currentPhase]: [...phaseMessages, msg],
        },
      };
    });
  };

  const opened = React.useRef(new Set<string>());
  const handleMarkInboxRead = async (messageId: string) => {
    if(opened.current.has(messageId) || !attemptState.inbox.some(m => m.id === messageId && m.unread)) return;
    opened.current.add(messageId);
    const result = await command('open-message', { messageId });
    if(!result) opened.current.delete(messageId);
  };

  const handleUpdateReviewerScore = (
    categoryId: string,
    score: number,
    notes: string
  ) => {
    setAttemptState((prev) => ({
      ...prev,
      reviewerScores: {
        ...prev.reviewerScores,
        [categoryId]: { score, notes },
      },
    }));
  };

  if (showTrackSelection) {
    return null;
  }

  // Calculate unread inbox count respecting Phase gating
  const unreadInboxCount = (attemptState.inbox || trackConfig.inboxMessages).filter((m) => {
    if (m.isEmergency && attemptState.currentPhase < 3) return false;
    return m.unread;
  }).length;

  const completedDeliverablesCount = Object.values(attemptState.deliverables || {}).filter(
    (d: DeliverableResponse) => d && d.value && d.value.trim().length > 10
  ).length;

  return (
    <div className="w-screen h-screen max-w-full box-border flex flex-col bg-[#F7F7F8] font-sans text-[#1A1A1A] antialiased selection:bg-black selection:text-white overflow-hidden">
      <div className="shrink-0 border-b bg-white px-4 py-2 flex justify-between gap-3 text-xs" role="status"><span>{saveStatus}</span><button disabled={commandBusy || !!attemptState.isSubmitted} onClick={() => handleSubmitPhase(attemptState.currentPhase)} className="bg-black text-white rounded-full px-4 py-1 disabled:opacity-40">{commandBusy ? 'Saving…' : `Submit Phase ${attemptState.currentPhase}`}</button></div>
      {syncError && <div role="alert" className="fixed top-3 right-3 max-w-lg z-[150] bg-red-50 border rounded-xl shadow-lg p-3 text-sm text-red-800">{syncError} <button className="underline" onClick={() => command('save')}>Retry save</button></div>}
      {/* Top Application Header */}
      <Header
        trackConfig={trackConfig}
        attemptState={attemptState}
        isReviewerMode={isReviewerMode}
        onToggleReviewer={() => {}}
        onSwitchTrack={handleSelectTrack}
        onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
        onReset={() => {}}
        onAdvancePhaseDemo={undefined}
        onToggleSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        isSidebarOpen={isLeftSidebarOpen}
      />

      {/* Assessment Phase Step Progression Bar */}
      <PhaseStepBar
        phases={trackConfig.phases}
        currentPhase={attemptState.currentPhase}
        onSelectPhase={(pNum) => handlePhaseChange(pNum)}
      />

      {/* Submission Frozen Notice Banner */}
      {attemptState.isSubmitted && (
        <div className="bg-[#1A1A1A] text-white px-6 py-2.5 flex items-center justify-between text-xs z-30 shrink-0 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-neutral-300" />
            <span className="font-medium">Assessment Submitted & Locked</span>
            <span className="text-neutral-400 font-light hidden sm:inline">
              · All deliverables, graphs, and audit logs are captured in final state.
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAssessmentSubmittedModal(true)}
              className="px-3 py-1 bg-white hover:bg-neutral-200 text-[#1A1A1A] rounded-full text-xs font-medium transition-colors"
            >
              View Submission Summary
            </button>

          </div>
        </div>
      )}

      {/* Urgent Gated Progression Banner */}
      {gateAlert && (
        <div className="bg-neutral-900 text-white px-6 py-3 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md z-40 transition-all shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <UserCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-medium tracking-tight text-white flex items-center space-x-2">
                <span>{gateAlert.title}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/20 font-mono">ACTION REQUIRED</span>
              </h4>
              <p className="text-[11px] text-neutral-300 font-light max-w-2xl mt-0.5">{gateAlert.message}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => {
                handleNavigateToInbox(gateAlert.targetMessageId);
                setGateAlert(null);
              }}
              className="px-3.5 py-1.5 bg-white text-black hover:bg-neutral-200 rounded-full text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Open Memo in Inbox</span>
            </button>
            <button
              onClick={() => {
                handleNavigateToInbox('peer-review-memo');
              }}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors border border-neutral-700"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Launch Verification Modal</span>
            </button>
            <button
              onClick={() => setGateAlert(null)}
              className="p-1 text-neutral-400 hover:text-white rounded"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Multi-Pane Application Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Left Navigation Sidebar Drawer on Mobile / Compact screens (< 1280px) */}
        {isLeftSidebarOpen && (
          <div className="xl:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
            <div
              onClick={() => setIsLeftSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            />
            <div className="relative z-10 w-72 bg-white h-full shadow-2xl animate-in slide-in-from-left duration-200">
              <Sidebar
                activeTab={activeTab}
                onSelectTab={(tab) => {
                  setActiveTab(tab);
                  setIsLeftSidebarOpen(false);
                }}
                currentPhase={attemptState.currentPhase}
                deliverablesCount={trackConfig.deliverables.length}
                completedDeliverablesCount={completedDeliverablesCount}
                unreadInboxCount={unreadInboxCount}
                exhibitsCount={trackConfig.exhibits.length}
                isReviewerMode={isReviewerMode}
                onSwitchTrack={() => {
                  setIsLeftSidebarOpen(false);
                  void handleSelectTrack();
                }}
                onClose={() => setIsLeftSidebarOpen(false)}
                isDrawer
              />
            </div>
          </div>
        )}

        {/* Static Left Navigation Sidebar (>= 1280px / xl) */}
        <div className="hidden xl:block shrink-0">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            currentPhase={attemptState.currentPhase}
            deliverablesCount={trackConfig.deliverables.length}
            completedDeliverablesCount={completedDeliverablesCount}
            unreadInboxCount={unreadInboxCount}
            exhibitsCount={trackConfig.exhibits.length}
            isReviewerMode={isReviewerMode}
            onSwitchTrack={handleSelectTrack}
          />
        </div>

        {/* Center Main Work Canvas */}
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-[#F7F7F8]">
          {activeTab === 'workspace' && (
            <WorkspaceView
              trackConfig={trackConfig}
              attemptState={attemptState}
              onUpdateDeliverable={handleUpdateDeliverable}
              onSelectDecisionOption={handleSelectDecisionOption}
              onSubmitPhase={handleSubmitPhase}
              onNavigateToDeliverables={() => setActiveTab('deliverables')}
              onNavigateToExhibit={handleNavigateToExhibit}
              onSelectRoadmap={() => setActiveTab('roadmap')}
            />
          )}

          {activeTab === 'roadmap' && (
            <RoadmapBuilder
              trackConfig={trackConfig}
              attemptState={attemptState}
              onUpdateNodes={handleUpdateRoadmapNodes}
              onSelectDecisionOption={handleSelectDecisionOption}
              onUpdateDeliverable={handleUpdateDeliverable}
              isCopilotOpen={isCopilotOpen}
              onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
            />
          )}

          {activeTab === 'inbox' && (
            <StakeholderInbox
              trackConfig={trackConfig}
              attemptState={attemptState}
              targetMessageId={selectedInboxMessageId}
              onMarkRead={handleMarkInboxRead}
              onOpenPeerReviewModal={() => { const m=attemptState.inbox.find(x=>x.id==='peer-review-memo'); if(m && !m.unread) setShowPeerReviewModal(true); }}
            />
          )}

          {activeTab === 'exhibits' && (
            <ReferenceMaterials
              trackConfig={trackConfig}
              targetExhibitId={selectedExhibitId}
              onSelectExhibit={(id) => setSelectedExhibitId(id)}
            />
          )}

          {activeTab === 'deliverables' && (
            <DeliverablesView
              trackConfig={trackConfig}
              attemptState={attemptState}
              onUpdateDeliverable={handleUpdateDeliverable}
              onSubmitPhase={handleSubmitPhase}
            />
          )}


        </main>

        {/* Right Floating / Docked Copilot Panel */}
        <CopilotPanel
          trackConfig={trackConfig}
          attemptState={attemptState}
          onSendMessage={handleSendChatMessage}
          isOpen={isCopilotOpen}
          onToggleOpen={(open) => setIsCopilotOpen(open)}
          activeTab={activeTab}
        />
      </div>

      {/* Mandatory & Interactive Modals */}
      {trackConfig.dataGate && (
        <DataGateModal
          dataGate={trackConfig.dataGate}
          isOpen={showDataGateModal}
          onComplete={handleCompleteDataGate}
        />
      )}

      <Phase1ReflectionModal
        isOpen={showReflectionModal}
        promptText={trackConfig.phase1ReflectionPrompt || trackConfig.reflectionPrompt}
        onComplete={handleCompleteReflection}
      />

      {trackConfig.peerReview && (
        <Phase2PeerReviewModal
          peerReview={trackConfig.peerReview}
          isOpen={showPeerReviewModal}
          onComplete={handleCompletePeerReview}
          onClose={() => setShowPeerReviewModal(false)}
        />
      )}

      <Phase3EmergencyAlertModal
        constraint={trackConfig.emergencyConstraint}
        isOpen={showEmergencyAlert}
        onOpenInbox={() => {
          setShowEmergencyAlert(false);
          const emergencyMsg = trackConfig.inboxMessages.find((m) => m.isEmergency);
          handleNavigateToInbox('mid_scenario_constraint');
        }}
        onDismiss={() => setShowEmergencyAlert(false)}
      />

      <AssessmentSubmittedModal
        isOpen={showAssessmentSubmittedModal}
        isAutoExpired={attemptState.timeRemainingSeconds === 0}
        trackConfig={trackConfig}
        attemptState={attemptState}
        onReviewDeliverables={() => {
          setShowAssessmentSubmittedModal(false);
          setActiveTab('deliverables');
        }}
        onOpenReviewerMode={() => {}}
        onReset={() => {}}

      />

      <AuditLogsView
        attemptState={attemptState}
        trackConfig={trackConfig}
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
      />
    </div>
  );
}
