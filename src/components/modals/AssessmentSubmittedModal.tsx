import React from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  FileText,
  GitBranch,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { TrackConfig, AttemptState, DeliverableResponse } from '../../types';

interface AssessmentSubmittedModalProps {
  isOpen: boolean;
  isAutoExpired?: boolean;
  trackConfig: TrackConfig;
  attemptState: AttemptState;
  onReviewDeliverables: () => void;
  onOpenReviewerMode: () => void;
  onReset?: () => void;
}

export const AssessmentSubmittedModal: React.FC<AssessmentSubmittedModalProps> = ({
  isOpen,
  isAutoExpired = false,
  trackConfig,
  attemptState,
  onReviewDeliverables,
  onOpenReviewerMode,
  onReset,
}) => {
  if (!isOpen) return null;

  const completedDeliverablesCount = Object.values(attemptState.deliverables || {}).filter(
    (d: DeliverableResponse) => d && d.value && d.value.trim().length > 0
  ).length;
  const totalDeliverablesCount = trackConfig.deliverables.length;

  const completedNodesCount = (attemptState.roadmapNodesState || []).filter(
    (n) => n.isComplete
  ).length;
  const totalNodesCount = (attemptState.roadmapNodesState || []).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#EBEBEB] w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div className="bg-[#1A1A1A] text-white p-6 sm:p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-white">
            {isAutoExpired ? (
              <Clock className="w-6 h-6 text-white" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-white" />
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 inline-block text-neutral-300">
              {isAutoExpired ? 'Timer Expired · Auto-Submitted' : 'Assessment Submitted'}
            </span>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
              {isAutoExpired
                ? 'Time Elapsed — Submission Sealed'
                : 'Superday Assessment Successfully Submitted'}
            </h2>
            <p className="text-xs text-neutral-300 font-light max-w-md mx-auto">
              {trackConfig.title} ({trackConfig.companyName}) · Final candidate snapshot securely saved
              to local storage cache.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Submission Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#FAFAFA] border border-[#EBEBEB] p-3 rounded-xl text-center space-y-1">
              <div className="text-[10px] uppercase font-mono text-[#888]">Phase Reached</div>
              <div className="text-sm font-semibold text-[#1A1A1A]">
                Phase {attemptState.currentPhase}
              </div>
            </div>

            <div className="bg-[#FAFAFA] border border-[#EBEBEB] p-3 rounded-xl text-center space-y-1">
              <div className="text-[10px] uppercase font-mono text-[#888]">Deliverables</div>
              <div className="text-sm font-semibold text-[#1A1A1A]">
                {completedDeliverablesCount} / {totalDeliverablesCount}
              </div>
            </div>

            <div className="bg-[#FAFAFA] border border-[#EBEBEB] p-3 rounded-xl text-center space-y-1">
              <div className="text-[10px] uppercase font-mono text-[#888]">Roadmap Nodes</div>
              <div className="text-sm font-semibold text-[#1A1A1A]">
                {completedNodesCount} / {totalNodesCount}
              </div>
            </div>

            <div className="bg-[#FAFAFA] border border-[#EBEBEB] p-3 rounded-xl text-center space-y-1">
              <div className="text-[10px] uppercase font-mono text-[#888]">Peer Audit</div>
              <div className="text-sm font-semibold text-[#1A1A1A]">
                {attemptState.peerReviewResponse || attemptState.phase2PeerReview
                  ? 'Completed'
                  : 'Pending'}
              </div>
            </div>
          </div>

          {/* Audit Verification Log Pill */}
          <div className="bg-[#FAFAFA] border border-[#EBEBEB] p-4 rounded-xl flex items-center justify-between text-[#555]">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-[#1A1A1A] shrink-0" />
              <div>
                <div className="font-medium text-[#1A1A1A]">Candidate Audit Integrity Protected</div>
                <div className="text-[11px] text-[#777] font-light">
                  All timeline events, prompt logs, and exhibit annotations are cataloged for review.
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">

            <button
              onClick={onReviewDeliverables}
              className="w-full py-2.5 bg-white hover:bg-[#F5F5F5] border border-[#EBEBEB] text-[#333] rounded-xl font-medium text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <FileText className="w-4 h-4 text-[#666]" />
              <span>Inspect Workspace Deliverables (Read-Only)</span>
            </button>


          </div>
        </div>
      </div>
    </div>
  );
};
