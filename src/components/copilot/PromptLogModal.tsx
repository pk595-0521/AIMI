import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, X, Sparkles } from 'lucide-react';

interface PromptLogModalProps {
  isOpen: boolean;
  promptText: string;
  onClose: () => void;
  onConfirm: (data: {
    purpose: string;
    privateDataShared: boolean;
    aiVerificationEnabled: boolean;
  }) => void;
}

export const PromptLogModal: React.FC<PromptLogModalProps> = ({
  isOpen,
  promptText,
  onClose,
  onConfirm,
}) => {
  const [purpose, setPurpose] = useState('');
  const [privateDataShared, setPrivateDataShared] = useState(false);
  const [aiVerificationEnabled, setAiVerificationEnabled] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      purpose: purpose.trim() || 'General domain analysis',
      privateDataShared,
      aiVerificationEnabled,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#EBEBEB] w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-[#EBEBEB] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-[#1A1A1A]" />
            <h3 className="font-medium text-[#1A1A1A] text-sm">Audit: Log AI Query</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#888] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-medium text-[#1A1A1A] block mb-1">
              Query Preview:
            </label>
            <div className="p-3 bg-[#FAFAFA] border border-[#EBEBEB] rounded-lg text-[#333] font-mono text-[11px] line-clamp-2">
              "{promptText}"
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[#1A1A1A] block">
              Why are you using AI for this step? (Audited)
            </label>
            <textarea
              required
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Synthesizing quantitative DCF assumptions or stress-testing rollout trade-offs..."
              className="w-full p-2.5 border border-[#EBEBEB] rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none text-[#1A1A1A] bg-[#FAFAFA]"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-[#EBEBEB]">
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={privateDataShared}
                onChange={(e) => setPrivateDataShared(e.target.checked)}
                className="w-4 h-4 accent-black rounded border-[#EBEBEB] mt-0.5"
              />
              <span className="text-[#666] font-light leading-tight">
                Contains confidential enterprise PII or raw customer identifiers (Compliance Flag)
              </span>
            </label>

            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aiVerificationEnabled}
                onChange={(e) => setAiVerificationEnabled(e.target.checked)}
                className="w-4 h-4 accent-black rounded border-[#EBEBEB] mt-0.5"
              />
              <span className="text-[#666] font-light leading-tight">
                Log for post-query critical scrutiny & verification
              </span>
            </label>
          </div>

          <div className="pt-3 flex justify-end space-x-2.5 border-t border-[#EBEBEB]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#EBEBEB] text-[#555] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-medium tracking-wide flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Log & Run Query</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
