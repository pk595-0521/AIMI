import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Lock, ArrowRight } from 'lucide-react';
import { DataGateConfig, DataHandlingResponse, HandlingAction } from '../../types';

interface DataGateModalProps {
  dataGate: DataGateConfig;
  isOpen: boolean;
  onComplete: (responses: DataHandlingResponse[]) => void;
}

export const DataGateModal: React.FC<DataGateModalProps> = ({
  dataGate,
  isOpen,
  onComplete,
}) => {
  const [selections, setSelections] = useState<Record<string, HandlingAction>>({});
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleActionChange = (fieldName: string, action: HandlingAction) => {
    setSelections((prev) => ({ ...prev, [fieldName]: action }));
    setErrorMessage(null);
  };

  const handleRationaleChange = (fieldName: string, text: string) => {
    setRationales((prev) => ({ ...prev, [fieldName]: text }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check all fields are answered
    for (const field of dataGate.fields) {
      if (!selections[field.fieldName]) {
        setErrorMessage(`Please classify field: "${field.fieldName}"`);
        return;
      }
    }

    // Validate classifications against security expectations
    const responses: DataHandlingResponse[] = dataGate.fields.map((field) => {
      const selected = selections[field.fieldName];
      const isApproved = field.expectedAction.includes(selected);
      return {
        fieldName: field.fieldName,
        action: selected,
        rationale: rationales[field.fieldName] || 'Classified according to data policy',
        isApproved,
      };
    });

    onComplete(responses);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#EBEBEB] w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#EBEBEB] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] flex items-center justify-center text-[#1A1A1A]">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-[#1A1A1A] tracking-tight">
                {dataGate.title}
              </h3>
              <p className="text-[11px] text-[#777] font-light">
                Pre-Chatbot Data Governance & Privacy Classification Gate
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAFAFA] text-[#1A1A1A] font-mono font-medium border border-[#EBEBEB]">
            Mandatory Gate
          </span>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div className="p-4 bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl text-[#333] leading-relaxed text-xs flex items-start space-x-2.5 font-light">
            <AlertTriangle className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#1A1A1A]">{dataGate.description}</p>
              <p className="mt-0.5 text-[#666]">
                Classify each field before running AI prompts or analytics tools.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-[#FAFAFA] border border-black text-[#1A1A1A] rounded-lg font-medium text-xs">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3.5">
            {dataGate.fields.map((field) => (
              <div
                key={field.fieldName}
                className="p-4 border border-[#EBEBEB] rounded-xl bg-[#FAFAFA] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium font-mono text-[#1A1A1A] text-xs">
                    {field.fieldName}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-medium bg-white text-[#1A1A1A] border border-[#EBEBEB]">
                    {field.sensitivityLevel}
                  </span>
                </div>

                <p className="text-xs text-[#777] font-light">{field.description}</p>

                {/* Handling Action Options */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {(['use-as-is', 'aggregate', 'redact', 'exclude'] as HandlingAction[]).map(
                    (action) => {
                      const isSelected = selections[field.fieldName] === action;
                      return (
                        <button
                          type="button"
                          key={action}
                          onClick={() => handleActionChange(field.fieldName, action)}
                          className={`py-2 px-2.5 rounded-lg border text-center transition-all font-mono text-[11px] ${
                            isSelected
                              ? 'bg-black text-white font-medium border-black'
                              : 'bg-white border-[#EBEBEB] hover:border-black text-[#666] hover:text-[#1A1A1A]'
                          }`}
                        >
                          {action === 'use-as-is'
                            ? 'Use As-Is'
                            : action.charAt(0).toUpperCase() + action.slice(1)}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#EBEBEB] flex items-center justify-between">
            <span className="text-[10px] text-[#999] font-mono">
              Classifications are audited in the candidate compliance log.
            </span>
            <button
              type="submit"
              className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors"
            >
              <span>Verify & Unlock Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
