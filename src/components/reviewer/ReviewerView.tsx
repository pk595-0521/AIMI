import React, { useState } from 'react';
import {
  UserCheck,
  Award,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { TrackConfig, AttemptState, RubricCategory } from '../../types';

interface ReviewerViewProps {
  trackConfig: TrackConfig;
  attemptState: AttemptState;
  onUpdateScore: (categoryId: string, score: number, notes: string) => void;
  onExitReviewer: () => void;
}

export const ReviewerView: React.FC<ReviewerViewProps> = ({
  trackConfig,
  attemptState,
  onUpdateScore,
  onExitReviewer,
}) => {
  const [scores, setScores] = useState<
    Record<string, { score: number; notes: string }>
  >(attemptState.reviewerScores || {});
  const [activeDiffTab, setActiveDiffTab] = useState<'deliverables' | 'assumptions' | 'roadmap'>('deliverables');

  const handleScoreChange = (catId: string, val: number) => {
    const current = scores[catId] || { score: val, notes: '' };
    const updated = { ...current, score: val };
    setScores((prev) => ({ ...prev, [catId]: updated }));
    onUpdateScore(catId, val, updated.notes);
  };

  const handleNotesChange = (catId: string, notesText: string) => {
    const current = scores[catId] || { score: 10, notes: '' };
    const updated = { ...current, notes: notesText };
    setScores((prev) => ({ ...prev, [catId]: updated }));
    onUpdateScore(catId, updated.score, notesText);
  };

  const totalMaxScore = trackConfig.rubric.reduce((acc, r) => acc + r.maxScore, 0);
  const totalCandidateScore = trackConfig.rubric.reduce(
    (acc, r) => acc + (scores[r.id]?.score || 0),
    0
  );
  const scorePercent = Math.round((totalCandidateScore / totalMaxScore) * 100);

  const getRecommendation = (pct: number) => {
    if (pct >= 85) return { label: 'STRONG HIRE / ADVANCE', color: 'emerald' };
    if (pct >= 70) return { label: 'HIRE WITH CONDITIONS', color: 'blue' };
    if (pct >= 55) return { label: 'LEAN NO HIRE', color: 'amber' };
    return { label: 'NO HIRE', color: 'rose' };
  };

  const rec = getRecommendation(scorePercent);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F5F5F5] text-[#1A1A1A] font-mono font-medium border border-[#EBEBEB]">
              EVALUATOR & GRADER VIEW
            </span>
            <span className="text-[11px] text-[#999] font-mono">
              Attempt ID: {attemptState.attemptId}
            </span>
          </div>
          <h2 className="text-base font-medium text-[#1A1A1A] tracking-tight">
            Candidate Assessment: {trackConfig.title}
          </h2>
          <p className="text-xs text-[#777] font-light">
            {trackConfig.companyName} · Role Simulation Rubric
          </p>
        </div>

        {/* Score Tally Banner */}
        <div className="flex items-center space-x-5 bg-[#FAFAFA] p-4 rounded-xl border border-[#EBEBEB]">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-mono text-[#888] block">
              Calculated Score
            </span>
            <div className="text-xl font-mono font-medium text-[#1A1A1A]">
              {totalCandidateScore} <span className="text-xs text-[#888]">/ {totalMaxScore}</span>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-lg font-mono font-medium text-xs text-center border border-[#EBEBEB] bg-white text-[#1A1A1A]">
            {rec.label}
            <div className="text-[10px] font-normal text-[#888]">{scorePercent}% Score</div>
          </div>

          <button
            onClick={() => window.print()}
            className="p-2.5 rounded-lg bg-white hover:bg-[#F5F5F5] border border-[#EBEBEB] text-[#555] hover:text-[#1A1A1A] transition-colors"
            title="Print or Export Evaluation"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Snapshots & Work Review Tabs */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl p-8 space-y-5">
        <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
          <h3 className="font-medium text-[#1A1A1A] text-sm">Candidate Work Review & Diff Ledger</h3>
          <div className="flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => setActiveDiffTab('deliverables')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeDiffTab === 'deliverables'
                  ? 'bg-black text-white'
                  : 'bg-[#FAFAFA] border border-[#EBEBEB] text-[#666] hover:text-[#1A1A1A]'
              }`}
            >
              Deliverables ({trackConfig.deliverables.length})
            </button>
            <button
              onClick={() => setActiveDiffTab('assumptions')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeDiffTab === 'assumptions'
                  ? 'bg-black text-white'
                  : 'bg-[#FAFAFA] border border-[#EBEBEB] text-[#666] hover:text-[#1A1A1A]'
              }`}
            >
              Assumptions ({attemptState.assumptions.length})
            </button>
            <button
              onClick={() => setActiveDiffTab('roadmap')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeDiffTab === 'roadmap'
                  ? 'bg-black text-white'
                  : 'bg-[#FAFAFA] border border-[#EBEBEB] text-[#666] hover:text-[#1A1A1A]'
              }`}
            >
              Roadmap ({attemptState.roadmapNodesState?.length || 0})
            </button>
          </div>
        </div>

        {/* Deliverables Tab */}
        {activeDiffTab === 'deliverables' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {trackConfig.deliverables.map((item) => {
              const res = attemptState.deliverables[item.id]?.value || '';
              return (
                <div
                  key={item.id}
                  className="p-4 border border-[#EBEBEB] rounded-xl bg-[#FAFAFA] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#1A1A1A] text-xs">
                      Phase {item.phaseId}: {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-[#999]">
                      {res.length} chars
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-[#EBEBEB] rounded-lg text-[#333] whitespace-pre-line leading-relaxed max-h-44 overflow-y-auto font-sans font-light">
                    {res || <span className="text-[#999] italic">No response provided.</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Assumptions Tab */}
        {activeDiffTab === 'assumptions' && (
          <div className="space-y-3 text-xs">
            {attemptState.assumptions.map((asm) => (
              <div
                key={asm.id}
                className="p-4 border border-[#EBEBEB] rounded-xl bg-[#FAFAFA] flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-[#1A1A1A] block">{asm.assumption}</span>
                  <span className="text-[#777] font-light text-[11px]">Evidence: {asm.evidence}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white border border-[#EBEBEB] text-[#1A1A1A] uppercase">
                    {asm.confidence}
                  </span>
                  {asm.changedAfterShock && (
                    <span className="block text-[10px] text-[#1A1A1A] font-mono mt-1">
                      Revised
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Roadmap Tab */}
        {activeDiffTab === 'roadmap' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {attemptState.roadmapNodesState?.map((node) => (
              <div
                key={node.id}
                className="p-4 border border-[#EBEBEB] rounded-xl bg-[#FAFAFA] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#1A1A1A] text-xs">{node.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#EBEBEB] font-mono text-[#666]">
                    {node.category}
                  </span>
                </div>
                <p className="text-[11px] text-[#777] font-light line-clamp-2">{node.purpose}</p>
                <div className="text-[10px] text-[#999] pt-2 border-t border-[#EBEBEB] flex justify-between font-mono">
                  <span>Owner: {node.owner || 'N/A'}</span>
                  <span>{node.isComplete ? 'Complete' : 'Incomplete'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4 Rubric Evaluation Cards */}
      <div className="space-y-4">
        <h3 className="font-medium text-[#1A1A1A] text-sm">Grading Rubric Assessment</h3>

        <div className="grid grid-cols-1 gap-5">
          {trackConfig.rubric.map((category) => {
            const currentScore = scores[category.id]?.score ?? Math.round(category.maxScore * 0.75);
            const currentNotes = scores[category.id]?.notes ?? '';

            return (
              <div
                key={category.id}
                className="bg-white border border-[#EBEBEB] rounded-xl p-8 space-y-5"
              >
                {/* Rubric Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EBEBEB] pb-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h4 className="font-medium text-[#1A1A1A] text-sm">{category.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] font-mono font-medium text-[#666]">
                        Weight: {category.weight}%
                      </span>
                    </div>
                    <p className="text-xs text-[#777] font-light mt-1">{category.description}</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-medium text-[#1A1A1A]">
                      Score: {currentScore} / {category.maxScore}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={category.maxScore}
                      value={currentScore}
                      onChange={(e) =>
                        handleScoreChange(category.id, parseInt(e.target.value, 10))
                      }
                      className="w-32 accent-black cursor-pointer"
                    />
                  </div>
                </div>

                {/* Score Anchors Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-4 bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl space-y-1">
                    <span className="font-medium text-[#1A1A1A] text-[10px] uppercase font-mono block">
                      Strong (11-13 pts)
                    </span>
                    <p className="text-[#666] font-light text-[11px] leading-relaxed">
                      {category.anchorStrong}
                    </p>
                  </div>

                  <div className="p-4 bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl space-y-1">
                    <span className="font-medium text-[#1A1A1A] text-[10px] uppercase font-mono block">
                      Mid / Benchmark (7-10 pts)
                    </span>
                    <p className="text-[#666] font-light text-[11px] leading-relaxed">
                      {category.anchorMid}
                    </p>
                  </div>

                  <div className="p-4 bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl space-y-1">
                    <span className="font-medium text-[#1A1A1A] text-[10px] uppercase font-mono block">
                      Weak / Deficient (0-6 pts)
                    </span>
                    <p className="text-[#666] font-light text-[11px] leading-relaxed">
                      {category.anchorWeak}
                    </p>
                  </div>
                </div>

                {/* Evaluator Notes */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-medium text-[#1A1A1A] text-xs block">
                    Evaluator Evidence & Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={currentNotes}
                    onChange={(e) => handleNotesChange(category.id, e.target.value)}
                    placeholder="Document specific evidence, quotes, or calculation checks justifying this grade..."
                    className="w-full text-xs p-3 rounded-xl border border-[#EBEBEB] focus:border-black focus:ring-1 focus:ring-black outline-none text-[#1A1A1A] bg-[#FAFAFA]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
