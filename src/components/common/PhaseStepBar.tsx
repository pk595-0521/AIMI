import React from 'react';
import { Check, Clock } from 'lucide-react';
import { PhaseConfig, PhaseId } from '../../types';

interface PhaseStepBarProps {
  phases: PhaseConfig[];
  currentPhase: PhaseId;
  onSelectPhase?: (phaseId: PhaseId) => void;
}

export const PhaseStepBar: React.FC<PhaseStepBarProps> = ({
  phases,
  currentPhase,
  onSelectPhase,
}) => {
  return (
    <div className="bg-white border-b border-[#EBEBEB] px-3 sm:px-6 py-2.5 shrink-0 min-w-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-1 sm:space-x-2.5 w-full">
          {phases.map((phase, index) => {
            const isCompleted = phase.id < currentPhase;
            const isActive = phase.id === currentPhase;
            const isUpcoming = phase.id > currentPhase;

            return (
              <React.Fragment key={phase.id}>
                <button
                  onClick={() => onSelectPhase && onSelectPhase(phase.id)}
                  aria-label={`Phase ${phase.number}: ${phase.title}`}
                  disabled={!onSelectPhase}
                  className={`flex-1 min-w-0 w-0 flex items-center p-2 rounded-lg text-left transition-all border ${
                    isActive
                      ? 'bg-[#F5F5F5] border-[#EBEBEB] text-[#1A1A1A]'
                      : isCompleted
                      ? 'bg-white border-[#EBEBEB] text-[#555] hover:bg-[#FAFAFA]'
                      : 'bg-white border-[#EBEBEB] opacity-45'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-medium mr-2.5 shrink-0 ${
                      isActive
                        ? 'bg-black text-white'
                        : isCompleted
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-[#EAEAEA] text-[#777]'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : phase.number}
                  </div>

                  <div className="min-w-0 flex-1 hidden sm:block">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-medium truncate ${
                          isActive
                            ? 'text-black font-semibold'
                            : isCompleted
                            ? 'text-[#444]'
                            : 'text-[#888]'
                        }`}
                      >
                        {phase.title.replace(`Phase ${phase.number} - `, '')}
                      </span>
                      <span className="text-[10px] text-[#999] font-mono hidden md:inline ml-1">
                        {Math.floor(phase.durationSeconds / 60)}m
                      </span>
                    </div>
                    <p className="text-[11px] text-[#888] truncate hidden lg:block font-light">
                      {phase.subtitle}
                    </p>
                  </div>
                </button>

                {index < phases.length - 1 && (
                  <div className="hidden sm:block w-3 h-[1px] bg-[#EBEBEB] mx-0.5 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
