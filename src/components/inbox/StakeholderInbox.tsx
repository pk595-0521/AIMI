import React, { useState, useEffect, useMemo } from 'react';
import {
  Inbox,
  AlertTriangle,
  CornerUpLeft,
  UserCheck,
  ArrowRight,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { InboxMessage, TrackConfig, AttemptState } from '../../types';

interface StakeholderInboxProps {
  trackConfig: TrackConfig;
  attemptState: AttemptState;
  targetMessageId?: string;
  onMarkRead: (messageId: string) => void;
  onOpenPeerReviewModal?: () => void;
}

export const StakeholderInbox: React.FC<StakeholderInboxProps> = ({
  trackConfig,
  attemptState,
  targetMessageId,
  onMarkRead,
  onOpenPeerReviewModal,
}) => {
  // Construct dynamic inbox message list strictly respecting Phase gating:
  // 1. Emergency constraint message only dispatched when currentPhase >= 3
  // 2. Peer review request message dispatched when trackConfig.peerReview exists
  const visibleMessages = useMemo(() => {
    const rawList = attemptState.inbox || trackConfig.inboxMessages;
    
    // Filter base messages (hide emergency messages if currentPhase < 3)
    const list: (InboxMessage & { isPeerReview?: boolean })[] = rawList.filter((msg) => {
      if (msg.isEmergency) {
        return attemptState.currentPhase >= 3;
      }
      return true;
    });

    list.forEach(msg => { if(msg.id === 'peer-review-memo') msg.isPeerReview = true; });

    return list;
  }, [attemptState.inbox, trackConfig.inboxMessages, trackConfig.peerReview, attemptState.currentPhase, attemptState.peerReviewResponse]);

  const [selectedMessageId, setSelectedMessageId] = useState<string>(() => {
    if (targetMessageId && visibleMessages.some((m) => m.id === targetMessageId)) {
      return targetMessageId;
    }
    return visibleMessages[0]?.id || '';
  });

  const [repliedMessages, setRepliedMessages] = useState<Record<string, string>>({});
  const [replyInput, setReplyInput] = useState<string>('');

  // Synchronize when targetMessageId prop is passed (e.g. from alert banner / toast deep-link)
  useEffect(() => {
    if (targetMessageId && visibleMessages.some((m) => m.id === targetMessageId)) {
      setSelectedMessageId(targetMessageId);
      const target = visibleMessages.find((m) => m.id === targetMessageId);
      if (target?.unread) {
        onMarkRead(target.id);
      }
    }
  }, [targetMessageId, visibleMessages, onMarkRead]);

  // Ensure active selection remains valid if messages change
  const activeMessage = useMemo(() => {
    return visibleMessages.find((m) => m.id === selectedMessageId) || visibleMessages[0];
  }, [visibleMessages, selectedMessageId]);

  const handleSelect = (msg: InboxMessage) => {
    setSelectedMessageId(msg.id);
    if (msg.unread) {
      onMarkRead(msg.id);
    }
  };

  const handleSendReply = () => {
    if (!replyInput.trim() || !activeMessage) return;
    setRepliedMessages((prev) => ({
      ...prev,
      [activeMessage.id]: replyInput,
    }));
    setReplyInput('');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden flex flex-col md:flex-row min-h-[580px]">
        {/* Left Pane: Message List */}
        <div className="w-full md:w-84 border-r border-[#EBEBEB] flex flex-col bg-[#FAFAFA] shrink-0">
          <div className="p-4 border-b border-[#EBEBEB] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Inbox className="w-4 h-4 text-[#1A1A1A]" />
              <h3 className="font-medium text-xs tracking-wide uppercase font-mono text-[#1A1A1A]">
                Stakeholder Memos
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#EBEBEB] text-[#666] font-mono">
              {visibleMessages.length} memos
            </span>
          </div>

          <div className="overflow-y-auto divide-y divide-[#EBEBEB] flex-1">
            {visibleMessages.map((msg) => {
              const isSelected = msg.id === activeMessage?.id;
              return (
                <button
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  className={`w-full text-left p-4 transition-colors flex flex-col space-y-1.5 ${
                    isSelected
                      ? 'bg-white border-l-2 border-black shadow-xs'
                      : msg.unread
                      ? 'bg-white font-medium hover:bg-[#F5F5F5]'
                      : 'hover:bg-[#F5F5F5] opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      {msg.isEmergency && (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#1A1A1A] shrink-0" />
                      )}
                      {msg.isPeerReview && (
                        <UserCheck className="w-3.5 h-3.5 text-[#1A1A1A] shrink-0" />
                      )}
                      <span className="text-xs font-medium text-[#1A1A1A] truncate">
                        {msg.senderName}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#999] font-mono shrink-0">
                      {msg.timestamp}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#777] font-light truncate">
                    {msg.senderRole}
                  </p>

                  <p
                    className={`text-xs line-clamp-1 ${
                      msg.unread ? 'text-[#1A1A1A] font-medium' : 'text-[#555] font-light'
                    }`}
                  >
                    {msg.subject}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Message Detail View */}
        <div className="flex-1 flex flex-col bg-white">
          {activeMessage ? (
            <div className="flex-1 flex flex-col justify-between p-8">
              <div className="space-y-5">
                {/* Header info */}
                <div className="border-b border-[#EBEBEB] pb-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white font-medium text-xs">
                        {activeMessage.senderInitials}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2.5">
                          <h4 className="font-medium text-[#1A1A1A] text-sm">
                            {activeMessage.senderName}
                          </h4>
                          {activeMessage.isEmergency && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] text-[#1A1A1A] font-mono font-medium uppercase">
                              EMERGENCY CONSTRAINT
                            </span>
                          )}
                          {activeMessage.isPeerReview && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] text-[#1A1A1A] font-mono font-medium uppercase">
                              PEER AUDIT REQUIRED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#777] font-light mt-0.5">{activeMessage.senderRole}</p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-[#999] font-mono">
                      {activeMessage.timestamp}
                    </div>
                  </div>

                  <h3 className="text-base font-medium text-[#1A1A1A] pt-2">
                    {activeMessage.subject}
                  </h3>
                </div>

                {/* Message Body */}
                <div className="text-xs text-[#444] leading-relaxed space-y-3.5 py-2 font-light">
                  {activeMessage.content.map((p, idx) => (
                    <p key={idx} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>

                {/* Dedicated Interactive Card for Peer Review Memo */}
                {activeMessage.isPeerReview && trackConfig.peerReview && (
                  <div className="p-5 rounded-xl bg-[#FAFAFA] border border-[#EBEBEB] space-y-4 my-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-[#1A1A1A]" />
                        <span className="font-medium text-xs text-[#1A1A1A]">
                          Attached AI Draft by {trackConfig.peerReview.peerName}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#888] font-mono">Phase 2 Verification Gate</span>
                    </div>

                    <div className="italic text-xs font-serif leading-relaxed text-[#333] bg-white p-4 rounded-lg border border-[#EBEBEB]">
                      "{trackConfig.peerReview.aiDraftText}"
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {attemptState.peerReviewResponse ? (
                        <div className="flex items-center space-x-2 text-xs text-[#1A1A1A] font-medium">
                          <CheckCircle2 className="w-4 h-4 text-[#1A1A1A]" />
                          <span>Audit Completed & Submitted ({attemptState.peerReviewResponse.decision.toUpperCase()})</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#777]">
                          Required checks: Verify quantitative claims, capacity limits, and policy compliance.
                        </span>
                      )}

                      {onOpenPeerReviewModal && (
                        <button
                          type="button"
                          onClick={onOpenPeerReviewModal}
                          className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
                        >
                          <span>{attemptState.peerReviewResponse ? 'Edit Peer Audit' : 'Launch Peer Verification Review'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Replied Record (if any) */}
                {repliedMessages[activeMessage.id] && (
                  <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-lg p-3.5 text-xs text-[#444] space-y-1">
                    <span className="font-medium text-[#1A1A1A] block text-[11px] font-mono">
                      Your Acknowledgment / Reply:
                    </span>
                    <p className="font-light italic text-[#555]">{repliedMessages[activeMessage.id]}</p>
                  </div>
                )}
              </div>

              {/* Bottom Reply Box */}
              <div className="pt-5 border-t border-[#EBEBEB] space-y-3">
                <textarea
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder={`Draft acknowledgment or reply to ${activeMessage.senderName}...`}
                  rows={2}
                  className="w-full text-xs p-3 rounded-lg border border-[#EBEBEB] focus:border-black focus:ring-1 focus:ring-black outline-none bg-[#FAFAFA] font-light"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSendReply}
                    disabled={!replyInput.trim()}
                    className="px-4 py-2 bg-black hover:bg-neutral-800 disabled:opacity-30 text-white rounded-full text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    <span>Send Reply</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#999] text-xs font-light">
              Select a message from the left pane to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
