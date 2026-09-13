import {Markdown} from '../revised/Primitives';
import {FullTranscript,chatTranscript} from './FullTranscript';
import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  FileCheck,
  AlertTriangle,
  Lock,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { AttemptState, TrackConfig, AssumptionEntry, ChatMessage } from '../../types';

interface AuditLogsViewProps {
  attemptState: AttemptState;
  trackConfig: TrackConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  attemptState,
  trackConfig,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    'assumptions' | 'verification' | 'governance' | 'prompts'
  >('assumptions');

  if (!isOpen) return null;

  const allPrompts: ChatMessage[] = Object.values(attemptState.chatByPhase || {})
    .flatMap((msgs) => (msgs as ChatMessage[]) || [])
    .filter((msg: ChatMessage) => msg.sender === 'user');

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#EBEBEB] w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#EBEBEB] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] flex items-center justify-center text-[#1A1A1A]">
              <ShieldCheck className="w-4 h-4 text-[#1A1A1A]" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-[#1A1A1A] tracking-tight">
                Candidate Audit & Compliance Ledger
              </h3>
              <p className="text-[11px] text-[#777] font-light">
                Verifiable record of assumptions, AI scrutiny, and data classifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#888] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 py-2 bg-[#FAFAFA] border-b border-[#EBEBEB] flex items-center space-x-1.5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('assumptions')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'assumptions'
                ? 'bg-black text-white'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            Assumption Log ({attemptState.assumptions.length})
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'verification'
                ? 'bg-black text-white'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            AI Verification ({Object.keys(attemptState.aiAnnotations).length})
          </button>
          <button
            onClick={() => setActiveTab('governance')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'governance'
                ? 'bg-black text-white'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            Data Governance ({attemptState.dataHandling?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'prompts'
                ? 'bg-black text-white'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            AI Prompts ({allPrompts.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {/* 1. Assumptions Tab */}
          {activeTab === 'assumptions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[#888] text-[11px] pb-2 border-b border-[#EBEBEB] font-mono">
                <span>Core Assumptions Logged Across Phases</span>
                <span>Pre vs Post-Shock Tracking</span>
              </div>

              {attemptState.assumptions.map((asm) => (
                <div
                  key={asm.id}
                  className="p-4 border border-[#EBEBEB] rounded-xl bg-[#FAFAFA] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#1A1A1A] text-xs">
                      {asm.assumption}
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-medium bg-white text-[#1A1A1A] border border-[#EBEBEB]">
                      {asm.confidence.toUpperCase()} CONFIDENCE
                    </span>
                  </div>

                  <p className="text-xs text-[#666] font-light">
                    <span className="font-medium text-[#1A1A1A]">Evidence cited: </span>
                    {asm.evidence}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#999] font-mono pt-2 border-t border-[#EBEBEB]">
                    <span>Created in Phase {asm.phaseCreated}</span>
                    {asm.changedAfterShock ? (
                      <span className="text-[#1A1A1A] font-medium">
                        Shock Adapted: {asm.revisionReason || 'Updated post-constraint'}
                      </span>
                    ) : (
                      <span className="text-[#888]">Unchanged Baseline</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Verification Tab */}
          {activeTab === 'verification' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[#888] text-[11px] pb-2 border-b border-[#EBEBEB] font-mono">
                <span>Annotations on Automated AI Outputs</span>
                <span>Critical Scrutiny</span>
              </div>

              {Object.keys(attemptState.aiAnnotations).length === 0 ? (
                <div className="text-center py-8 text-[#999] font-light">
                  No AI verification annotations logged yet. Annotate Exhibit 3 in Workspace.
                </div>
              ) : (
                Object.entries(attemptState.aiAnnotations).map(([exhibitId, text]) => {
                  const exhibit = trackConfig.exhibits.find((e) => e.id === exhibitId);
                  return (
                    <div
                      key={exhibitId}
                      className="p-4 border border-[#EBEBEB] rounded-xl bg-[#FAFAFA] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#1A1A1A]">
                          {exhibit?.title || exhibitId}
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white text-[#1A1A1A] border border-[#EBEBEB] font-mono font-medium">
                          Verified
                        </span>
                      </div>
                      <p className="text-xs text-[#333] whitespace-pre-line leading-relaxed font-light">
                        {text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 3. Governance Tab */}
          {activeTab === 'governance' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[#888] text-[11px] pb-2 border-b border-[#EBEBEB] font-mono">
                <span>Field-Level Classification Compliance</span>
                <span>Security Protocol</span>
              </div>

              {!attemptState.dataHandling || attemptState.dataHandling.length === 0 ? (
                <div className="text-center py-8 text-[#999] font-light">
                  No sensitive dataset gate active for this track.
                </div>
              ) : (
                attemptState.dataHandling.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-[#EBEBEB] rounded-xl bg-[#FAFAFA] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-[#1A1A1A] font-mono block">
                        {item.fieldName}
                      </span>
                      <span className="text-xs text-[#777] font-light">{item.rationale}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-medium bg-white text-[#1A1A1A] border border-[#EBEBEB] uppercase">
                        {item.action}
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-medium bg-black text-white">
                        {item.isApproved ? 'Policy Pass' : 'Policy Warning'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 4. Prompts Tab */}
          {activeTab === 'prompts' && (
            <div className="space-y-3"><FullTranscript messages={chatTranscript(attemptState.chatByPhase)}/>
              <div className="flex items-center justify-between text-[#888] text-[11px] pb-2 border-b border-[#EBEBEB] font-mono">
                <span>AI Prompt Query History</span>
                <span>Audited Purposes</span>
              </div>

              {allPrompts.length === 0 ? (
                <div className="text-center py-8 text-[#999] font-light">
                  No copilot prompts run yet.
                </div>
              ) : (
                allPrompts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 border border-[#EBEBEB] rounded-xl bg-[#FAFAFA] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#888]">
                      <span>{p.timestamp}</span>
                      {p.promptLogged?.purpose && (
                        <span className="text-[#1A1A1A] font-medium">
                          Purpose: {p.promptLogged.purpose}
                        </span>
                      )}
                    </div>
                    <Markdown text={p.content}/>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
