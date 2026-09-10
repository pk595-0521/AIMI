import React, { useState } from 'react';
import { UserCheck, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert, Check } from 'lucide-react';
import { PeerReviewConfig, PeerReviewResponse, ReviewDecision } from '../../types';

interface Phase2PeerReviewModalProps {
  peerReview: PeerReviewConfig;
  isOpen: boolean;
  onComplete: (response: PeerReviewResponse) => void;
  onClose?: () => void;
}

export const Phase2PeerReviewModal: React.FC<Phase2PeerReviewModalProps> = ({
  peerReview,
  isOpen,
  onComplete,
  onClose,
}) => {
  const [problems, setProblems] = useState('');
  const [evidence, setEvidence] = useState('');
  const [decision, setDecision] = useState<ReviewDecision>('modify');
  const [correctedVersion, setCorrectedVersion] = useState('');
  const [validationNeeded, setValidationNeeded] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isProblemsValid = problems.trim().length >= 15;
  const isCorrectedValid = correctedVersion.trim().length >= 15;
  const isValid = isProblemsValid && isCorrectedValid && !!evidence.trim() && !!validationNeeded.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isProblemsValid) {
      setError('Please provide identified flaws or ungrounded assumptions (at least 15 characters).');
      return;
    }
    if (!isCorrectedValid) {
      setError('Please provide a corrected, executive-ready recommendation (at least 15 characters).');
      return;
    }

    if (!evidence.trim() || !validationNeeded.trim()) { setError('Cite evidence and describe the additional validation required.'); return; }
    setError('');
    onComplete({
      problemsIdentified: problems.trim(),
      evidenceCited: evidence.trim(),
      decision,
      correctedVersion: correctedVersion.trim(),
      additionalValidation: validationNeeded.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#EBEBEB] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#EBEBEB] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] flex items-center justify-center text-[#1A1A1A]">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#1A1A1A] tracking-tight">
                Peer Review Verification Gate
              </h3>
              <p className="text-[11px] text-[#777] font-light">
                Independent audit of colleague memo ({peerReview.peerName})
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAFAFA] text-[#1A1A1A] font-mono font-medium border border-[#EBEBEB]">
              Phase 2 Gate
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-[#999] hover:text-black p-1 rounded-md text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Peer Context & Draft */}
          <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#1A1A1A] text-xs">
                Draft by {peerReview.peerName} ({peerReview.peerRole})
              </span>
              <span className="text-[10px] text-[#888] font-mono">Requires Independent Scrutiny</span>
            </div>
            <p className="italic text-xs font-serif leading-relaxed text-[#333] bg-white p-3.5 rounded-lg border border-[#EBEBEB]">
              "{peerReview.aiDraftText}"
            </p>
            {peerReview.requiredChecks && peerReview.requiredChecks.length > 0 && (
              <div className="pt-2 text-[11px] text-[#666] space-y-1">
                <span className="font-medium text-[#1A1A1A]">Mandatory audit checks:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[#555]">
                  {peerReview.requiredChecks.map((chk, idx) => (
                    <li key={idx}>{chk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-lg text-xs font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{error}</span>
            </div>
          )}

          {/* Decision Buttons */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#1A1A1A] block">
              Your Review Disposition:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['accept', 'modify', 'reject'] as ReviewDecision[]).map((dec) => (
                <button
                  type="button"
                  key={dec}
                  onClick={() => setDecision(dec)}
                  className={`py-2 px-3 rounded-lg border text-center font-medium text-xs capitalize transition-all ${
                    decision === dec
                      ? 'bg-black text-white border-black shadow-xs'
                      : 'bg-white border-[#EBEBEB] hover:border-black text-[#666] hover:text-[#1A1A1A]'
                  }`}
                >
                  {dec} Draft
                </button>
              ))}
            </div>
          </div>

          {/* Problems Identified */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[#1A1A1A] block">
                1. Flaws, Unsupported Assumptions, or Risks in Draft:
              </label>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isProblemsValid
                    ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]'
                    : 'bg-[#FAFAFA] text-[#888] border border-[#EBEBEB]'
                }`}
              >
                {isProblemsValid ? '✓ Verified' : `${Math.max(0, 15 - problems.trim().length)} more chars needed`}
              </span>
            </div>
            <textarea
              rows={2}
              value={problems}
              onChange={(e) => {
                setProblems(e.target.value);
                if (error) setError('');
              }}
              placeholder="What assertions are ungrounded? What stakeholder or risk constraints did the peer overlook?"
              className={`w-full text-xs p-3 rounded-lg border outline-none bg-[#FAFAFA] text-[#1A1A1A] font-light transition-colors ${
                touched && !isProblemsValid
                  ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]'
                  : 'border-[#EBEBEB] focus:border-black focus:ring-1 focus:ring-black'
              }`}
            />
          </div>

          {/* Corrected Recommendation */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[#1A1A1A] block">
                2. Corrected Executive Language / Redline:
              </label>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isCorrectedValid
                    ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]'
                    : 'bg-[#FAFAFA] text-[#888] border border-[#EBEBEB]'
                }`}
              >
                {isCorrectedValid ? '✓ Verified' : `${Math.max(0, 15 - correctedVersion.trim().length)} more chars needed`}
              </span>
            </div>
            <textarea
              rows={2}
              value={correctedVersion}
              onChange={(e) => {
                setCorrectedVersion(e.target.value);
                if (error) setError('');
              }}
              placeholder="Provide the rewritten, defensible recommendation statement..."
              className={`w-full text-xs p-3 rounded-lg border outline-none bg-[#FAFAFA] text-[#1A1A1A] font-light transition-colors ${
                touched && !isCorrectedValid
                  ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]'
                  : 'border-[#EBEBEB] focus:border-black focus:ring-1 focus:ring-black'
              }`}
            />
          </div>

          {/* Additional Evidence & Validation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-[#1A1A1A] block">
                3. Evidence & Metrics Cited:
              </label>
              <input
                type="text"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="e.g., Exhibit 2 unit economics, 400 bps margin target..."
                className="w-full text-xs p-2.5 rounded-lg border border-[#EBEBEB] focus:border-black focus:ring-1 focus:ring-black outline-none bg-[#FAFAFA] text-[#1A1A1A] font-light"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[#1A1A1A] block">
                4. Confirmatory Diligence / Testing:
              </label>
              <input
                type="text"
                value={validationNeeded}
                onChange={(e) => setValidationNeeded(e.target.value)}
                placeholder="e.g., Run regression testing on 100 sample tickets..."
                className="w-full text-xs p-2.5 rounded-lg border border-[#EBEBEB] focus:border-black focus:ring-1 focus:ring-black outline-none bg-[#FAFAFA] text-[#1A1A1A] font-light"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#EBEBEB] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[10px] text-[#999] font-mono">
              Peer critique unlocks Phase 2 progression and factors into Verification rubric.
            </span>

            <button
              type="submit"
              className={`w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-medium tracking-wide flex items-center justify-center space-x-2 transition-all ${
                isValid
                  ? 'bg-black hover:bg-neutral-800 text-white shadow-xs cursor-pointer'
                  : 'bg-[#F0F0F0] text-[#888] border border-[#E0E0E0] hover:bg-[#E5E5E5]'
              }`}
            >
              <span>{isValid ? 'Verify & Save Peer Audit' : 'Complete Required Fields'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

