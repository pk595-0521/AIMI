import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { DeliverableItemConfig, TrackConfig, AttemptState, PhaseId } from '../../types';

interface DeliverablesViewProps {
  trackConfig: TrackConfig;
  attemptState: AttemptState;
  onUpdateDeliverable: (id: string, value: string) => void;
  onSubmitPhase: (phaseId: PhaseId) => void;
  onFileUpload?: (file: { name: string; size: string; timestamp: string }) => void;
}

export const DeliverablesView: React.FC<DeliverablesViewProps> = ({
  trackConfig,
  attemptState,
  onUpdateDeliverable,
  onSubmitPhase,
  onFileUpload,
}) => {
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | 'ALL'>(
    attemptState.currentPhase
  );
  const [dragActive, setDragActive] = useState(false);

  const deliverables = trackConfig.deliverables;
  const filteredDeliverables =
    selectedPhaseFilter === 'ALL'
      ? deliverables
      : deliverables.filter((d) => d.phaseId === selectedPhaseFilter);

  const totalCount = deliverables.length;
  const completedCount = Object.values(attemptState.deliverables || {}).filter(
    (d: any) => d && d.value && d.value.trim().length > 10
  ).length;
  const percent = Math.round((completedCount / totalCount) * 100);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && onFileUpload) {
      const file = e.dataTransfer.files[0];
      onFileUpload({
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onFileUpload) {
      const file = e.target.files[0];
      onFileUpload({
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  };

  const currentPhaseDeliverables = deliverables.filter(
    (d) => d.phaseId === attemptState.currentPhase
  );
  const currentPhaseCompleted = currentPhaseDeliverables.every(
    (d) =>
      attemptState.deliverables[d.id] &&
      attemptState.deliverables[d.id].value.trim().length > 5
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Overall Progress */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <CheckSquare className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="text-sm font-medium text-[#1A1A1A] tracking-tight">
              Assessment Deliverables & Submission Desk
            </h2>
          </div>
          <p className="text-xs text-[#777] font-light mt-1">
            Responses autosave continuously and populate the evaluator grading ledger.
          </p>
        </div>

        <div className="flex items-center space-x-5">
          <div className="text-right">
            <div className="text-xs font-mono font-medium text-[#1A1A1A]">
              {completedCount} / {totalCount} Completed
            </div>
            <div className="w-32 bg-[#F5F5F5] border border-[#EBEBEB] rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-black h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => onSubmitPhase(attemptState.currentPhase)}
            className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors"
          >
            <span>Complete Phase {attemptState.currentPhase}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Phase Filter Tabs */}
      <div className="flex items-center space-x-1 bg-[#FAFAFA] border border-[#EBEBEB] p-1 rounded-xl w-fit text-xs">
        <button
          onClick={() => setSelectedPhaseFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
            selectedPhaseFilter === 'ALL'
              ? 'bg-black text-white'
              : 'text-[#666] hover:text-[#1A1A1A]'
          }`}
        >
          All Phases ({totalCount})
        </button>
        {[1, 2, 3, 4].map((pNum) => (
          <button
            key={pNum}
            onClick={() => setSelectedPhaseFilter(pNum)}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              selectedPhaseFilter === pNum
                ? 'bg-black text-white'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            <span>Phase {pNum}</span>
            {pNum === attemptState.currentPhase && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                  selectedPhaseFilter === pNum ? 'bg-white/20 text-white' : 'bg-[#EBEBEB] text-[#1A1A1A]'
                }`}
              >
                Active
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Deliverable Cards Grid */}
      <div className="space-y-4">
        {filteredDeliverables.map((item) => {
          const res = attemptState.deliverables[item.id]?.value || '';
          const isFilled = res.trim().length > 10;

          return (
            <div
              key={item.id}
              className={`bg-white border rounded-xl p-6 transition-all space-y-3.5 ${
                item.phaseId === attemptState.currentPhase
                  ? 'border-black ring-1 ring-black/10'
                  : 'border-[#EBEBEB]'
              }`}
            >
              {/* Deliverable Header */}
              <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-medium bg-[#FAFAFA] border border-[#EBEBEB] text-[#1A1A1A]">
                    PHASE {item.phaseId} · STEP {item.stepNumber}
                  </span>
                  <h3 className="font-medium text-[#1A1A1A] text-sm">{item.title}</h3>
                </div>

                <div className="flex items-center space-x-2">
                  {isFilled ? (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#F5F5F5] text-[#1A1A1A] border border-[#EBEBEB] flex items-center space-x-1 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-[#1A1A1A]" />
                      <span>Draft Ready</span>
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] text-[#999] font-mono">
                      Incomplete
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#666] font-light leading-relaxed">{item.description}</p>

              {/* Textarea Input */}
              <textarea
                value={res}
                onChange={(e) => onUpdateDeliverable(item.id, e.target.value)}
                rows={4}
                placeholder={item.placeholder}
                className="w-full text-xs p-3.5 rounded-lg border border-[#EBEBEB] focus:border-black focus:ring-1 focus:ring-black outline-none text-[#1A1A1A] placeholder:text-[#999] bg-[#FAFAFA] leading-relaxed font-sans"
              />

              <div className="flex items-center justify-between text-[11px] text-[#999] font-light">
                <span className="font-mono">{res.length} characters</span>
                <span className="flex items-center space-x-1 text-[#666]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1A1A1A]" />
                  <span>Autosaved to Ledger</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional Artifact Upload Area */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider font-mono text-[#1A1A1A]">
              Supplementary Exhibits & Artifacts (Optional)
            </h4>
            <p className="text-xs text-[#777] font-light mt-0.5">
              Attach supporting PDF decks, model snapshots, or calculation sheets.
            </p>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleFileDrop}
          className={`border border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? 'border-black bg-[#F5F5F5]'
              : 'border-[#DDD] hover:border-black bg-[#FAFAFA]'
          }`}
        >
          <Upload className="w-5 h-5 text-[#888] mx-auto mb-2" />
          <p className="text-xs text-[#333] font-light">
            Drag & drop files here, or{' '}
            <label className="text-[#1A1A1A] font-medium cursor-pointer underline hover:opacity-80">
              browse
              <input type="file" onChange={handleFileInput} className="hidden" />
            </label>
          </p>
          <p className="text-[10px] text-[#999] mt-1 font-mono">
            Supported formats: PDF, CSV, XLSX, PNG
          </p>
        </div>

        {attemptState.uploadedFiles && attemptState.uploadedFiles.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-medium text-[#1A1A1A] block font-mono">
              Attached Artifacts:
            </span>
            {attemptState.uploadedFiles.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAFA] border border-[#EBEBEB] text-xs text-[#333]"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-[#1A1A1A]" />
                  <span className="font-medium text-[#1A1A1A]">{f.name}</span>
                  <span className="text-[#999] font-mono text-[10px]">({f.size})</span>
                </div>
                <span className="text-[10px] text-[#999] font-mono">{f.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
