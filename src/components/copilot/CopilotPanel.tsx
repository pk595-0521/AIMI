import {api} from '../../services/api';
import {Markdown} from '../revised/Primitives';
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  Sparkles,
  ChevronRight,
  Send,
  ShieldCheck,
  Bot,
  User,
} from 'lucide-react';
import { ChatMessage, TrackConfig, AttemptState } from '../../types';
import { COPILOT_MODELS, queryCopilot } from '../../services/aiCopilot';
import { PromptLogModal } from './PromptLogModal';

interface CopilotPanelProps {
  trackConfig: TrackConfig;
  attemptState: AttemptState;
  onSendMessage: (msg: ChatMessage) => void;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  activeTab?: string;
}

export const CopilotPanel: React.FC<CopilotPanelProps> = ({
  trackConfig,
  attemptState,
  onSendMessage,
  isOpen: controlledIsOpen,
  onToggleOpen,
  activeTab = 'workspace',
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isPanelOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleToggle = (nextOpen: boolean) => {
    if (onToggleOpen) {
      onToggleOpen(nextOpen);
    } else {
      setInternalIsOpen(nextOpen);
    }
  };

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText,setStreamingText]=useState('');
  const [chatError,setChatError]=useState('');

  const scrollRef=useRef<HTMLDivElement>(null);
  const following=useRef(true);
  const [showLatest,setShowLatest]=useState(false);
  const chatMessages=useMemo(()=>(attemptState.chatByPhase[attemptState.currentPhase]||[]).filter(m=>m.sender==='user'||m.sender==='assistant'),[attemptState.chatByPhase,attemptState.currentPhase]);
  const scrollToBottom=()=>{const el=scrollRef.current;if(el)el.scrollTop=el.scrollHeight;};
  useLayoutEffect(()=>{following.current=true;setShowLatest(false);scrollToBottom();},[attemptState.currentPhase,isPanelOpen]);
  useLayoutEffect(()=>{if(following.current&&!scrollRef.current?.querySelector('.work-table-wrap:hover, .work-table-wrap:focus-within'))scrollToBottom();},[chatMessages,streamingText,isLoading]);
  const onChatScroll=()=>{const el=scrollRef.current;if(!el)return;following.current=el.scrollTop+el.clientHeight>=el.scrollHeight-60;setShowLatest(!following.current);};

  const handleTriggerSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isLoading || attemptState.isSubmitted || (trackConfig.dataGate && !attemptState.dataGateCompleted)) return;
    setPendingPrompt(inputPrompt.trim());
    setIsLogModalOpen(true);
  };

  const handleConfirmLogAndSend = async (meta: {
    purpose: string;
    privateDataShared: boolean;
    aiVerificationEnabled: boolean;
  }) => {
    setIsLogModalOpen(false);
    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: pendingPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      promptLogged: meta,
    };
    onSendMessage(userMessage);
    setInputPrompt('');
    setIsLoading(true);setStreamingText('');setChatError('');

    try {
      const reply = await queryCopilot({
        sessionId: attemptState.attemptId,
        trackId: trackConfig.id,
        phaseId: attemptState.currentPhase,
        modelId: COPILOT_MODELS[0].id,
        prompt: pendingPrompt,
        loggedPurpose: meta.purpose,
        privateDataShared: meta.privateDataShared,
        aiVerificationEnabled: meta.aiVerificationEnabled,
      },setStreamingText,model=>setSelectedModel({name:model,provider:'Groq Cloud'}));

      const assistantMessage: ChatMessage = {
        id: reply.logId+'-response',
        sender: 'assistant',
        content: reply.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      onSendMessage(assistantMessage);
    } catch (err) {
      setChatError(err instanceof Error?err.message:'Copilot is unavailable.');
    } finally {
      setIsLoading(false);setStreamingText('');
    }
  };

  const [selectedModel,setSelectedModel]=useState({name:'Groq Cloud',provider:'Groq Cloud'});
  useEffect(()=>{api('/copilot/config').then(c=>setSelectedModel({name:c.model,provider:c.provider})).catch(()=>{});},[]);

  return (
    <>
      {/* Floating trigger toggle when closed / collapsed on roadmap */}
      {!isPanelOpen && (
        <button
          onClick={() => handleToggle(true)}
          className="fixed right-5 bottom-6 z-40 bg-black hover:bg-neutral-800 text-white p-3 px-4 rounded-full shadow-lg border border-black flex items-center space-x-2 transition-transform hover:scale-105 select-none"
          title="Expand AI Copilot"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-xs font-medium tracking-wide">AI Copilot</span>
        </button>
      )}

      {/* Right Drawer / Floating Panel */}
      {isPanelOpen && (
        <>
          {/* Overlay backdrop for screens under 1280px (xl) */}
          <div
            onClick={() => handleToggle(false)}
            className="xl:hidden fixed inset-0 bg-black/30 backdrop-blur-xs z-40 transition-opacity"
          />

          <aside className="fixed xl:sticky right-0 top-0 bottom-0 z-50 xl:z-30 w-[85vw] sm:w-96 xl:w-80 2xl:w-96 bg-white border-l border-[#EBEBEB] text-[#1A1A1A] flex flex-col h-full shrink-0 min-w-0 shadow-2xl xl:shadow-none animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-3.5 border-b border-[#EBEBEB] bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-6 h-6 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A]" />
                </div>
                <h3 className="font-medium text-xs tracking-tight text-[#1A1A1A]">
                  AI Copilot Assistant
                </h3>
              </div>

              {/* Minimize / Close Button */}
              <button
                type="button"
                onClick={() => handleToggle(false)}
                className="p-1 rounded-lg text-[#888] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] transition-colors flex items-center space-x-1"
                title="Collapse AI Copilot"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          {/* Approved provider model status (applicants cannot change the model) */}
          <div className="px-3.5 py-2 bg-[#FAFAFA] border-b border-[#EBEBEB] text-xs relative shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#888] font-mono font-medium">ACTIVE MODEL</span>
              <span
                className="text-[11px] text-[#1A1A1A] font-medium"
                aria-label="Active Copilot model"
              >
                <span>{selectedModel.name}</span>
              </span>
            </div>
          </div>

          {/* Chat Message Stream - Scrollable */}
          <div ref={scrollRef} onScroll={onChatScroll} data-testid="copilot-scroll" className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden overscroll-contain p-4 space-y-3.5 text-xs bg-white" style={{overflowAnchor:'none'}}>
            {chatMessages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col w-full min-w-0 space-y-1 ${
                    isUser ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-[10px] text-[#888] font-mono">
                    {isAssistant ? (
                      <>
                        <Bot className="w-3 h-3 text-[#1A1A1A]" />
                        <span>Copilot ({selectedModel.provider})</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 text-[#888]" />
                        <span>Candidate Query</span>
                      </>
                    )}
                    <span>· {msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-3 rounded-xl w-full min-w-0 break-words leading-relaxed ${
                      isUser
                        ? 'bg-white border border-[#EBEBEB] text-[#1A1A1A] rounded-br-xs'
                        : 'bg-[#FAFAFA] border border-[#EBEBEB] text-[#1A1A1A] rounded-bl-xs'
                    }`}
                  >
                    <div className="min-w-0 break-words font-sans text-xs font-light">
                      {isUser?(msg.content.length>600?<details><summary>Your message · expand to read</summary><p className="mt-2">{msg.content}</p></details>:msg.content):<Markdown text={msg.content}/>}
                    </div>

                    {msg.promptLogged && (
                      <div
                        className={`mt-2 pt-1.5 border-t text-[9px] font-mono flex items-center justify-between ${
                          isUser
                            ? 'border-[#EBEBEB] text-[#777]'
                            : 'border-[#EBEBEB] text-[#777]'
                        }`}
                      >
                        <span>Purpose: {msg.promptLogged.purpose}</span>
                        {msg.promptLogged.privateDataShared && (
                          <span className="font-medium">PII Logged</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {chatError&&<p role="alert" className="work-warning">{chatError}</p>}
            {streamingText&&<div aria-live="polite" className="p-3 w-full min-w-0 break-words text-xs"><Markdown text={streamingText}/></div>}
            {isLoading && (
              <div className="flex items-center space-x-2 text-[#777] text-xs py-2">
                <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A] animate-spin" />
                <span className="font-light">Copilot is synthesizing analysis...</span>
              </div>
            )}

          </div>

          {showLatest&&<button className="work-secondary self-center my-2" onClick={()=>{following.current=true;setShowLatest(false);scrollToBottom();}}>Jump to latest</button>}
          {/* Bottom Chat Input - Permanently Docked */}
          <div className="shrink-0 p-3.5 border-t border-[#EBEBEB] bg-white space-y-2 sticky bottom-0">
            <form onSubmit={handleTriggerSend} className="relative">
              <textarea
                disabled={attemptState.isSubmitted || (!!trackConfig.dataGate && !attemptState.dataGateCompleted)}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTriggerSend(e);
                  }
                }}
                rows={2}
                placeholder={attemptState.isSubmitted ? "Assessment closed" : trackConfig.dataGate && !attemptState.dataGateCompleted ? "Complete the data hygiene review before AI use" : "Ask Copilot for analysis, formulas, or risk frameworks…"}
                className="w-full text-xs p-3 pr-10 rounded-xl bg-[#FAFAFA] border border-[#EBEBEB] focus:border-black focus:ring-1 focus:ring-black outline-none text-[#1A1A1A] placeholder:text-[#999] resize-none font-sans font-light"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isLoading || attemptState.isSubmitted || (!!trackConfig.dataGate && !attemptState.dataGateCompleted)}
                className="absolute right-2.5 bottom-3.5 p-2 rounded-full bg-black hover:bg-neutral-800 disabled:opacity-30 text-white transition-colors"
                title="Audit & Send Prompt"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-[#888] font-mono">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-[#1A1A1A]" />
                <span>Prompt logging enforced</span>
              </span>
              <span>Enter to send</span>
            </div>
          </div>
        </aside>
      </>
    )}

      {/* Prompt Logger Modal */}
      <PromptLogModal
        isOpen={isLogModalOpen}
        promptText={pendingPrompt}
        onClose={() => setIsLogModalOpen(false)}
        onConfirm={handleConfirmLogAndSend}
      />
    </>
  );
};
