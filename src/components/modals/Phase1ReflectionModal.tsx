import React, { useState } from 'react';
import { HelpCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { ReflectionResponse } from '../../types';

interface Phase1ReflectionModalProps {
  isOpen: boolean;
  promptText: string;
  onComplete: (reflection: ReflectionResponse) => void;
}

export const Phase1ReflectionModal: React.FC<Phase1ReflectionModalProps> = ({
  isOpen,
  promptText,
  onComplete,
}) => {
  const [reflectionText, setReflectionText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionText.trim() || reflectionText.trim().length < 15) {
      setError('Please provide a thoughtful reflection (at least 15 characters).');
      return;
    }
    onComplete({
      text: reflectionText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#EBEBEB] w-full max-w-xl overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-[#EBEBEB] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] flex items-center justify-center text-[#1A1A1A]">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-[#1A1A1A] tracking-tight">
                Phase 1 Critical Reflection
              </h3>
              <p className="text-[11px] text-[#777] font-light">
                Mandatory assumption audit before unlocking Phase 2
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAFAFA] text-[#1A1A1A] font-mono font-medium border border-[#EBEBEB]">
            Uncertainty Audit
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-4 bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl space-y-1 text-[#1A1A1A]">
            <span className="font-medium text-[10px] uppercase font-mono block text-[#888]">
              Reflection Question:
            </span>
            <p className="text-xs leading-relaxed text-[#1A1A1A] font-light">
              {promptText}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-[#FAFAFA] border border-black text-[#1A1A1A] rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-medium text-[#1A1A1A] block">
              Your Analysis & Supporting Evidence Required:
            </label>
            <textarea
              rows={4}
              value={reflectionText}
              onChange={(e) => {
                setReflectionText(e.target.value);
                setError('');
              }}
              placeholder="State the fragile assumption, explain why data is incomplete, and specify what future testing would confirm or invalidate your posture..."
              className="w-full text-xs p-3.5 rounded-xl border border-[#EBEBEB] focus:border-black focus:ring-1 focus:ring-black outline-none leading-relaxed bg-[#FAFAFA] text-[#1A1A1A] font-light"
            />
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-[#EBEBEB]">
            <span className="text-[10px] text-[#999] font-mono flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1A1A1A]" />
              <span>Logged to candidate assumption ledger</span>
            </span>

            <button
              type="submit"
              className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors"
            >
              <span>Submit & Enter Phase 2</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
