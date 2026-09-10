import React, { useState } from 'react';
import {
  LayoutDashboard,
  GitBranch,
  Inbox,
  FileText,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Clock,
  Sparkles,
  Layers,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { NavTab, PhaseId } from '../../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentPhase: PhaseId;
  deliverablesCount: number;
  completedDeliverablesCount: number;
  unreadInboxCount: number;
  exhibitsCount: number;
  isReviewerMode?: boolean;
  onSwitchTrack?: () => void;
  onClose?: () => void;
  isDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentPhase,
  deliverablesCount,
  completedDeliverablesCount,
  unreadInboxCount,
  exhibitsCount,
  isReviewerMode,
  onSwitchTrack,
  onClose,
  isDrawer = false,
}) => {
  const deliverablePercent = Math.round(
    (completedDeliverablesCount / (deliverablesCount || 1)) * 100
  );

  const navItems: {
    id: NavTab;
    label: string;
    icon: any;
    badge: string | null;
    isEmergency?: boolean;
  }[] = [
    {
      id: 'workspace',
      label: 'Workspace',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'roadmap',
      label: 'Roadmap Builder',
      icon: GitBranch,
      badge: null,
    },
    {
      id: 'inbox',
      label: 'Stakeholder Inbox',
      icon: Inbox,
      badge: unreadInboxCount > 0 ? `${unreadInboxCount}` : null,
      isEmergency: currentPhase >= 3 && unreadInboxCount > 0,
    },
    {
      id: 'exhibits',
      label: 'Reference Materials',
      icon: FileText,
      badge: `${exhibitsCount}`,
    },
    {
      id: 'deliverables',
      label: 'Deliverables',
      icon: CheckSquare,
      badge: `${deliverablePercent}%`,
    },
  ];

  if (isReviewerMode) {
    navItems.push({
      id: 'reviewer',
      label: 'Reviewer Mode',
      icon: UserCheck,
      badge: 'Grader',
    });
  }

  return (
    <aside className="w-64 bg-white border-r border-[#EBEBEB] flex flex-col justify-between h-full shrink-0 select-none">
      {/* Top Section */}
      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Navigation Section Title */}
        <div className="px-2 pt-1 pb-1">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#999] mb-0.5">Navigation</div>
          <div className="text-sm font-medium tracking-tight text-[#1A1A1A]">Assessment Desk</div>
        </div>

        {/* Navigation Tabs */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#F5F5F5] text-[#1A1A1A] font-semibold'
                    : 'text-[#666] hover:text-[#1A1A1A] hover:bg-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isActive ? 'bg-black' : 'bg-transparent border border-[#DDD]'
                    }`}
                  />
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#1A1A1A]' : 'text-[#888]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive
                        ? 'bg-[#E5E5E5] text-[#1A1A1A]'
                        : item.isEmergency
                        ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                        : 'bg-[#F5F5F5] text-[#888] border border-[#EBEBEB]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Phase Summary Quick Info */}
        <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl p-3.5 text-[11px] space-y-2 text-[#666]">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#999] font-bold border-b border-[#EBEBEB] pb-1.5">
            <span>Assessment State</span>
            <span className="text-[#1A1A1A]">Phase {currentPhase}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Deliverables:</span>
            <span className="font-mono text-[#1A1A1A] font-medium">
              {completedDeliverablesCount} / {deliverablesCount}
            </span>
          </div>
          <div className="w-full bg-[#EBEBEB] rounded-full h-1 overflow-hidden">
            <div
              className="bg-[#1A1A1A] h-1 rounded-full transition-all duration-300"
              style={{ width: `${deliverablePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Footer: Switch Track Button */}
      {onSwitchTrack && (
        <div className="p-3.5 border-t border-[#EBEBEB] bg-white">
          <button
            onClick={onSwitchTrack}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-white hover:bg-[#F5F5F5] text-[#555] hover:text-[#1A1A1A] text-xs font-medium transition-colors border border-[#EBEBEB]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#888]" />
            <span>All tracks</span>
          </button>
        </div>
      )}
    </aside>
  );
};
