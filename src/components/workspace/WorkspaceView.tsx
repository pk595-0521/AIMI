import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  Layers,
  GitBranch,
} from 'lucide-react';
import { TrackConfig, AttemptState, PhaseId } from '../../types';

interface WorkspaceViewProps {
  trackConfig: TrackConfig;
  attemptState: AttemptState;
  onUpdateDeliverable: (id: string, value: string) => void;
  onSelectDecisionOption: (nodeId: string, optionId: string, rationale: string) => void;
  onSubmitPhase?: (phaseId: PhaseId) => void;
  onNavigateToDeliverables: () => void;
  onNavigateToExhibit: (exhibitId: string) => void;
  onSelectRoadmap: () => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  trackConfig,
  attemptState,
  onUpdateDeliverable,
  onSelectDecisionOption,
  onSubmitPhase,
  onNavigateToDeliverables,
  onNavigateToExhibit,
  onSelectRoadmap,
}) => {
  const [isBriefExpanded, setIsBriefExpanded] = useState(true);

  const visibleExhibits = trackConfig.exhibits;
  const [expandedExhibits, setExpandedExhibits] = useState<Record<string, boolean>>({});

  const toggleExhibit = (id: string) => {
    setExpandedExhibits((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllExhibits = (expand: boolean) => {
    const nextState: Record<string, boolean> = {};
    visibleExhibits.forEach((e) => {
      nextState[e.id] = expand;
    });
    setExpandedExhibits(nextState);
  };

  const currentPhaseConfig = trackConfig.phases.find((p) => p.id === attemptState.currentPhase);
  const allExpanded = visibleExhibits.every((e) => expandedExhibits[e.id]);

  return (
    <div className="p-4 sm:p-6 min-w-0 max-w-7xl mx-auto space-y-6">
      {/* 1. Active Brief Card */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden transition-all">
        <div className="px-6 py-4 bg-white border-b border-[#EBEBEB] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-black"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#999]">
              Active Brief
            </span>
            <span className="text-xs text-[#DDD]">/</span>
            <span className="text-xs font-medium text-[#1A1A1A]">{trackConfig.companyName}</span>
            <span className="text-xs text-[#888] hidden lg:inline">({trackConfig.roleTitle})</span>
          </div>

          <button
            onClick={() => setIsBriefExpanded(!isBriefExpanded)}
            className="text-xs text-[#777] hover:text-[#1A1A1A] flex items-center space-x-1 font-medium transition-colors"
          >
            <span>{isBriefExpanded ? 'Collapse' : 'Expand Details'}</span>
            {isBriefExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isBriefExpanded && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-[#666] leading-relaxed">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <span className="font-medium text-[#1A1A1A] block text-sm mb-1">Company Context</span>
                <p className="text-[#666] leading-relaxed font-light">{trackConfig.companyBackground}</p>
              </div>

              <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-lg p-4">
                <span className="font-medium text-[#1A1A1A] block mb-1">
                  Current Assessment Focus ({currentPhaseConfig?.title})
                </span>
                <p className="text-[#555] font-light">{currentPhaseConfig?.objective}</p>
              </div>
            </div>

            <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-lg p-4 space-y-3">
              <span className="font-bold text-[#999] block text-[10px] uppercase tracking-[0.2em]">
                Phase Deliverables
              </span>
              <ul className="space-y-2">
                {currentPhaseConfig?.deliverablesSummary.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-[11px] text-[#555]">
                    <span className="w-1.5 h-1.5 rounded-full bg-black mt-1.5 shrink-0"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onNavigateToDeliverables}
                className="w-full mt-2 py-2 px-4 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-medium tracking-wide flex items-center justify-center space-x-2 transition-colors"
              >
                <span>Open Deliverables</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Live Metrics Row */}
      {trackConfig.defaultMetrics && trackConfig.defaultMetrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {trackConfig.defaultMetrics.map((metric, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#EBEBEB] rounded-xl p-5 flex flex-col justify-between"
            >
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#999]">
                {metric.label}
              </div>
              <div className="text-3xl font-light text-[#1A1A1A] tracking-tight my-2">
                {metric.value}
              </div>
              <div className="text-xs text-[#888] font-light">{metric.subtext}</div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Streamlined Collapsible Exhibit Accordions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Layers className="w-4 h-4 text-[#1A1A1A]" />
            <h3 className="font-medium text-sm text-[#1A1A1A] tracking-tight">
              Case Exhibits & Data Artifacts
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] text-[#777] font-mono">
              {visibleExhibits.length} Documents
            </span>
          </div>

          <button
            onClick={() => toggleAllExhibits(!allExpanded)}
            className="text-xs text-[#777] hover:text-[#1A1A1A] font-medium transition-colors"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        <div className="space-y-3">
          {visibleExhibits.map((exhibit) => {
            const isExpanded = !!expandedExhibits[exhibit.id];
            const topMetric = exhibit.metrics && exhibit.metrics.length > 0 ? exhibit.metrics[0] : null;

            return (
              <div
                key={exhibit.id}
                className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden transition-all duration-150 shadow-xs"
              >
                {/* Accordion Header / Summary Bar */}
                <div
                  role="button" tabIndex={0} aria-expanded={isExpanded}
                  onKeyDown={e => { if(e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleExhibit(exhibit.id); } }}
                  onClick={() => toggleExhibit(exhibit.id)}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors select-none"
                >
                  <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#EBEBEB] text-[#1A1A1A] text-[10px] font-mono font-medium shrink-0">
                      EXHIBIT {exhibit.number}
                    </span>

                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-[#1A1A1A] text-xs truncate">
                          {exhibit.title}
                        </h4>
                        <span className="text-[11px] text-[#999] hidden md:inline truncate">
                          · {exhibit.subtitle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {/* Collapsed Metric / Badge preview */}
                    {topMetric && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] text-[11px] font-mono text-[#1A1A1A]">
                        {topMetric.label}: <strong className="font-semibold">{topMetric.value}</strong>
                      </span>
                    )}

                    {exhibit.tableRows && !topMetric && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] text-[10px] font-mono text-[#666]">
                        {exhibit.tableRows.length} Rows
                      </span>
                    )}

                    {/* View in Reference Materials Deep Link */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToExhibit(exhibit.id);
                      }}
                      className="px-3 py-1 bg-white hover:bg-black hover:text-white text-[#1A1A1A] border border-[#EBEBEB] hover:border-black rounded-full text-[11px] font-medium transition-all flex items-center space-x-1.5 group"
                      title="View full exhibit in Reference Materials tab"
                    >
                      <span>View in Reference Materials</span>
                      <ExternalLink className="w-3 h-3 text-[#777] group-hover:text-white" />
                    </button>

                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[#888]">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Accordion Expanded Details */}
                {isExpanded && (
                  <div className="p-6 border-t border-[#EBEBEB] bg-white space-y-4 text-xs text-[#555]">
                    {/* Metrics Grid */}
                    {exhibit.metrics && exhibit.metrics.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {exhibit.metrics.map((metric, mIdx) => (
                          <div
                            key={mIdx}
                            className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-lg p-3.5"
                          >
                            <span className="text-[9px] uppercase font-mono tracking-wider text-[#888] block">
                              {metric.label}
                            </span>
                            <span className="text-xl font-medium text-[#1A1A1A] my-1 block">
                              {metric.value}
                            </span>
                            {metric.subtext && (
                              <span className="text-[10px] text-[#777] font-light block">
                                {metric.subtext}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content Text */}
                    {exhibit.content && (
                      <p className="leading-relaxed font-light text-[#444] bg-[#FAFAFA] border border-[#EBEBEB] p-4 rounded-lg">
                        {exhibit.content}
                      </p>
                    )}

                    {/* Table Preview */}
                    {exhibit.tableColumns && exhibit.tableRows && (
                      <div className="border border-[#EBEBEB] rounded-lg overflow-hidden my-2">
                        <div className="bg-[#FAFAFA] px-4 py-2 border-b border-[#EBEBEB] flex items-center justify-between text-[11px] font-mono text-[#777]">
                          <span>DATASET SAMPLE</span>
                          <span>{exhibit.tableRows.length} records</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#777] font-medium">
                              <tr>
                                {exhibit.tableColumns.map((col) => (
                                  <th key={col.key} className="px-3.5 py-2 font-medium">
                                    {col.header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EBEBEB]">
                              {exhibit.tableRows.slice(0, 5).map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-[#FAFAFA] transition-colors">
                                  {exhibit.tableColumns!.map((col) => (
                                    <td key={col.key} className="px-3.5 py-2 font-medium text-[#1A1A1A]">
                                      {row[col.key]}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Bottom Link Bar */}
                    <div className="pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-[#888] font-light">
                        Full datasets, transcripts, and export tools available in Reference Materials.
                      </span>
                      <button
                        onClick={() => onNavigateToExhibit(exhibit.id)}
                        className="text-xs font-medium text-black hover:underline flex items-center space-x-1"
                      >
                        <span>Open Document Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Strategic Branching Decisions Single Teaser Box */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <GitBranch className="w-4 h-4 text-[#1A1A1A]" />
            <h3 className="font-medium text-[#1A1A1A] text-sm tracking-tight">
              Phase {attemptState.currentPhase} Strategic Branching Decisions
            </h3>
          </div>
          <p className="text-xs text-[#777] font-light mt-1">
            Select your operating posture and provide structured justification.
          </p>
        </div>

        <button
          onClick={onSelectRoadmap}
          className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors shrink-0 shadow-xs"
        >
          <span>View in Roadmap Graph</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
