import React from 'react';
import {
  Briefcase,
  TrendingUp,
  Sliders,
  Smartphone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building,
} from 'lucide-react';

import { TrackConfig, TrackId } from '../../types';

interface TrackSelectionViewProps {
  tracks: TrackConfig[];
  onSelectTrack: (trackId: TrackId) => void;
}

export const TrackSelectionView: React.FC<TrackSelectionViewProps> = ({ onSelectTrack, tracks }) => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] flex flex-col justify-between p-6 sm:p-10">
      <div className="max-w-6xl mx-auto w-full space-y-8 my-auto">
        {/* Top Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-[#EBEBEB] text-[#1A1A1A] text-xs font-mono font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A]" />
            <span>AIMI SUPERDAY ASSESSMENT SUITE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-medium text-[#1A1A1A] tracking-tight">
            Workplace Role Simulation & Executive Assessment
          </h1>

          <p className="text-sm text-[#666] leading-relaxed font-light">
            Select your assessment track. Each track is a timed, multi-phase workplace simulation
            evaluating planning, verification scrutiny, live crisis adaptation, and executive communication.
          </p>
        </div>

        {/* 4 Track Cards Grid */}
        {tracks.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-xl border border-[#EBEBEB] bg-white p-8 text-center shadow-xs">
            <Building className="mx-auto h-6 w-6" />
            <h2 className="mt-4 text-xl font-medium">Your candidate workspace is ready</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#666]">
              No assessment track has been assigned to this account yet. An AIMI administrator can assign a role simulation, after which it will appear here.
            </p>
            <a href="/" className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#1A1A1A] px-4 py-2 text-xs font-medium hover:bg-[#FAFAFA]">
              Return home <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tracks.map((track) => {
            const icon =
              track.id === 'consulting' ? (
                <Briefcase className="w-4 h-4 text-[#1A1A1A]" />
              ) : track.id === 'investment-banking' ? (
                <TrendingUp className="w-4 h-4 text-[#1A1A1A]" />
              ) : track.id === 'business-operations' ? (
                <Sliders className="w-4 h-4 text-[#1A1A1A]" />
              ) : (
                <Smartphone className="w-4 h-4 text-[#1A1A1A]" />
              );

            const totalDurationMin = Math.round(
              track.phases.reduce((acc, p) => acc + p.durationSeconds, 0) / 60
            );

            return (
              <div
                key={track.id}
                className="bg-white border border-[#EBEBEB] hover:border-black rounded-xl p-6 shadow-xs flex flex-col justify-between transition-all duration-200 group"
              >
                <div className="space-y-4">
                  {/* Top Track Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-[#FAFAFA] border border-[#EBEBEB] flex items-center justify-center">
                        {icon}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#888] font-medium block">
                          {track.companyName}
                        </span>
                        <h3 className="text-base font-medium text-[#1A1A1A]">
                          {track.title}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] font-mono text-[#666]">
                        {totalDurationMin} mins
                      </span>
                    </div>
                  </div>

                  {/* Objective */}
                  <p className="text-xs text-[#666] leading-relaxed font-light">
                    {track.activeObjective}
                  </p>

                  {/* Highlights */}
                  <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-[11px] text-[#666] font-mono">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#1A1A1A] shrink-0" />
                      <span className="font-medium text-[#1A1A1A]">Mid-assessment update: </span>
                      <span className="truncate">{track.emergencyConstraint.title}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-[#666] font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1A1A1A] shrink-0" />
                      <span className="font-medium text-[#1A1A1A]">Deliverables: </span>
                      <span>{track.deliverables.length} core executive submissions</span>
                    </div>
                  </div>
                </div>

                {/* Launch Button */}
                <div className="pt-5 mt-4 border-t border-[#EBEBEB] flex items-center justify-between">
                  <span className="text-[11px] text-[#888] font-mono">
                    {track.phases.length} Structured Segments
                  </span>

                  <button
                    onClick={() => onSelectTrack(track.id)}
                    className="px-4 py-2 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-medium flex items-center space-x-1.5 transition-all"
                  >
                    <span>Launch Simulation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>}
      </div>

      {/* Footer */}
      <footer className="text-center text-[#999] text-xs font-mono mt-8 font-light">
        AIMI Superday Executive Workplace Assessment Platform · Confidential Simulation Environment
      </footer>
    </div>
  );
};
