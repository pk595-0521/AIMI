import React from 'react';
import { AlertTriangle, Mail, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { EmergencyConstraintConfig } from '../../types';

interface Phase3EmergencyAlertModalProps {
  constraint: EmergencyConstraintConfig;
  isOpen: boolean;
  onOpenInbox: () => void;
  onDismiss: () => void;
}

export const Phase3EmergencyAlertModal: React.FC<Phase3EmergencyAlertModalProps> = ({
  constraint,
  isOpen,
  onOpenInbox,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#EBEBEB] rounded-xl shadow-xl w-full max-w-2xl overflow-hidden text-[#1A1A1A]">
        {/* Top Emergency Banner */}
        <div className="bg-white px-6 py-4 border-b border-[#EBEBEB] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] flex items-center justify-center text-[#1A1A1A]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#1A1A1A]" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#888] font-medium block">
                Phase 3 Live Production Constraint
              </span>
              <h3 className="font-medium text-sm text-[#1A1A1A] tracking-tight">
                {constraint.title}
              </h3>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#FAFAFA] text-[#1A1A1A] text-[10px] font-mono font-medium border border-[#EBEBEB]">
            IMMEDIATE ACTION
          </span>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 text-xs">
          <div>
            <h4 className="font-medium text-sm text-[#1A1A1A] mb-1">
              {constraint.headline}
            </h4>
            <p className="text-[#666] text-xs font-light leading-relaxed">
              {constraint.adaptationRequirement}
            </p>
          </div>

          {/* Key Shift Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {constraint.indicators.map((ind, idx) => (
              <div
                key={idx}
                className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl p-3 text-center flex flex-col justify-between"
              >
                <span className="text-[9px] text-[#888] font-mono uppercase tracking-wider line-clamp-1">
                  {ind.name}
                </span>
                <span className="text-base font-mono font-medium text-[#1A1A1A] my-1">
                  {ind.currentState}
                </span>
                <span className="text-[10px] text-[#999] font-mono">
                  {ind.change}
                </span>
              </div>
            ))}
          </div>

          {/* Memo Summary Points */}
          <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#888] border-b border-[#EBEBEB] pb-2">
              <span>MEMORANDUM: {constraint.memoRecipient}</span>
              <span>{constraint.memoTimestamp}</span>
            </div>
            <ul className="space-y-1.5 text-[#333] text-xs leading-relaxed font-light pt-1">
              {constraint.memoPoints.slice(0, 3).map((point, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-black mt-1.5 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-between border-t border-[#EBEBEB]">
            <button
              onClick={onDismiss}
              className="px-4 py-2 rounded-full border border-[#EBEBEB] text-[#666] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] text-xs font-medium transition-colors"
            >
              Acknowledge & Stay in Workspace
            </button>

            <button
              onClick={onOpenInbox}
              className="px-5 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-medium flex items-center space-x-2 transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Open Stakeholder Inbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
