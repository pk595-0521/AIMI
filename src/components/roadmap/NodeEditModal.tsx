import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Sparkles, User, Link, Calendar, Bell } from 'lucide-react';
import { RoadmapNode } from '../../types';

interface NodeEditModalProps {
  node: RoadmapNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNode: RoadmapNode) => void;
}

export const NodeEditModal: React.FC<NodeEditModalProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<RoadmapNode | null>(node);

  useEffect(() => {
    if (node) {
      setFormData(node);
    }
  }, [node]);

  if (!isOpen || !node || !formData) return null;

  const handleChange = (field: keyof RoadmapNode, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#EBEBEB] w-full max-w-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-[#EBEBEB] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium uppercase bg-[#F5F5F5] border border-[#EBEBEB] text-[#1A1A1A]">
              {formData.category}
            </span>
            <h3 className="font-medium text-[#1A1A1A] text-sm">Edit Roadmap Node</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#888] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Title & Category */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="font-medium text-[#1A1A1A]">Node Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full p-2.5 border border-[#EBEBEB] rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none text-[#1A1A1A] bg-[#FAFAFA]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-[#1A1A1A]">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full p-2.5 border border-[#EBEBEB] rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none text-[#1A1A1A] bg-[#FAFAFA]"
              >
                <option value="DIAGNOSE">DIAGNOSE</option>
                <option value="ANALYZE">ANALYZE</option>
                <option value="DECIDE">DECIDE</option>
                <option value="PILOT">PILOT</option>
                <option value="EXECUTE">EXECUTE</option>
                <option value="REVISE">REVISE</option>
              </select>
            </div>
          </div>

          {/* Context */}
          <div className="space-y-1">
            <label className="font-medium text-[#1A1A1A]">Context & Situation</label>
            <textarea
              rows={2}
              value={formData.context}
              onChange={(e) => handleChange('context', e.target.value)}
              className="w-full p-2.5 border border-[#EBEBEB] rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none text-[#1A1A1A] bg-[#FAFAFA]"
              placeholder="Describe what initiates this step..."
            />
          </div>

          {/* Purpose & Objective */}
          <div className="space-y-1">
            <label className="font-medium text-[#1A1A1A]">Core Purpose / Target Output</label>
            <textarea
              rows={2}
              value={formData.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              className="w-full p-2.5 border border-[#EBEBEB] rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none text-[#1A1A1A] bg-[#FAFAFA]"
              placeholder="What must be achieved or proven here?"
            />
          </div>

          {/* Tradeoffs */}
          <div className="space-y-1">
            <label className="font-medium text-[#1A1A1A]">Tradeoffs & Rejected Alternatives</label>
            <textarea
              rows={2}
              value={formData.tradeoffs}
              onChange={(e) => handleChange('tradeoffs', e.target.value)}
              className="w-full p-2.5 border border-[#EBEBEB] rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none text-[#1A1A1A] bg-[#FAFAFA]"
              placeholder="What sacrifices or risks does this step entail?"
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#EBEBEB]">
            <div className="space-y-1">
              <label className="font-medium text-[#1A1A1A] flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-[#888]" />
                <span>Owner</span>
              </label>
              <input
                type="text"
                value={formData.owner || ''}
                onChange={(e) => handleChange('owner', e.target.value)}
                className="w-full p-2.5 border border-[#EBEBEB] rounded-lg outline-none text-[#1A1A1A] bg-[#FAFAFA]"
                placeholder="e.g., Strategy Lead"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[#1A1A1A] flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-[#888]" />
                <span>Target Milestone</span>
              </label>
              <input
                type="text"
                value={formData.targetMilestone || ''}
                onChange={(e) => handleChange('targetMilestone', e.target.value)}
                className="w-full p-2.5 border border-[#EBEBEB] rounded-lg outline-none text-[#1A1A1A] bg-[#FAFAFA]"
                placeholder="e.g., Week 2"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[#1A1A1A] flex items-center space-x-1">
                <Link className="w-3.5 h-3.5 text-[#888]" />
                <span>Dependencies</span>
              </label>
              <input
                type="text"
                value={formData.dependencies || ''}
                onChange={(e) => handleChange('dependencies', e.target.value)}
                className="w-full p-2.5 border border-[#EBEBEB] rounded-lg outline-none text-[#1A1A1A] bg-[#FAFAFA]"
                placeholder="e.g., Exhibit 1, Node 2"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[#1A1A1A] flex items-center space-x-1">
                <Bell className="w-3.5 h-3.5 text-[#888]" />
                <span>Trigger for Path Change</span>
              </label>
              <input
                type="text"
                value={formData.triggerThreshold || ''}
                onChange={(e) => handleChange('triggerThreshold', e.target.value)}
                className="w-full p-2.5 border border-[#EBEBEB] rounded-lg outline-none text-[#1A1A1A] bg-[#FAFAFA]"
                placeholder="e.g., Failure rate > 5%"
              />
            </div>
          </div>

          {/* Status Checkbox */}
          <div className="flex items-center space-x-4 pt-3 border-t border-[#EBEBEB]">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isComplete}
                onChange={(e) => handleChange('isComplete', e.target.checked)}
                className="w-4 h-4 accent-black rounded border-[#EBEBEB]"
              />
              <span className="font-medium text-[#1A1A1A]">Mark Node Completed</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={formData.isRevisedAfterConstraint || false}
                onChange={(e) => handleChange('isRevisedAfterConstraint', e.target.checked)}
                className="w-4 h-4 accent-black rounded border-[#EBEBEB]"
              />
              <span className="font-medium text-[#555]">Revised for Phase 3 Constraint</span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-[#EBEBEB] flex items-center justify-end space-x-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[#EBEBEB] text-[#555] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-medium tracking-wide transition-colors"
          >
            Save Node Changes
          </button>
        </div>
      </div>
    </div>
  );
};
