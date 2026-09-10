import React from 'react';
import { Clock, ShieldAlert, Menu, X } from 'lucide-react';
import type { TrackConfig, AttemptState, PhaseId } from '../../types';
interface HeaderProps {
 trackConfig: TrackConfig; attemptState: AttemptState; onReset:()=>void; onToggleReviewer:()=>void;
 isReviewerMode:boolean; onOpenAuditLogs:()=>void; onSwitchTrack:()=>void;
 onAdvancePhaseDemo?:(phase:PhaseId)=>void; onToggleSidebar?:()=>void; isSidebarOpen?:boolean;
}
export function Header({trackConfig,attemptState,onOpenAuditLogs,onSwitchTrack,onToggleSidebar,isSidebarOpen}:HeaderProps) {
 const seconds=attemptState.timeRemainingSeconds;
 const clock=`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
 return <header className="bg-white border-b px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
  <button onClick={onToggleSidebar} aria-label="Toggle Navigation Menu" className="xl:hidden shrink-0 p-1.5">{isSidebarOpen?<X size={18}/>:<Menu size={18}/>}</button>
  <button onClick={onSwitchTrack} title="Switch assessment track" className="flex gap-2 sm:gap-3 items-center text-left min-w-0 flex-1 xl:flex-none">
   <span className="hidden sm:flex shrink-0 w-8 h-8 bg-neutral-900 text-white rounded-lg items-center justify-center text-xs font-mono">AI</span>
   <span className="min-w-0"><span className="block text-sm font-semibold truncate">AIMI Superday</span><span className="block text-[11px] text-neutral-500 truncate">{trackConfig.title}<span className="hidden lg:inline"> / {trackConfig.companyName}</span></span></span>
  </button>
  <div className="hidden xl:flex min-w-0 flex-1 items-center gap-3 border-l pl-4"><span className="shrink-0 text-xs rounded-full bg-neutral-100 px-3 py-1">Phase {attemptState.currentPhase} Active</span><span className="text-xs text-neutral-500 truncate">{trackConfig.phases.find(p=>p.id===attemptState.currentPhase)?.subtitle}</span></div>
  <div aria-label={`Time left ${clock}`} className="shrink-0 flex items-center gap-2 border rounded-lg bg-neutral-50 px-2 sm:px-3 py-1"><Clock size={13}/><span className="text-right"><span className="block text-xs font-mono font-semibold">{clock}</span><span className="block text-[8px] uppercase tracking-wider text-neutral-500">Time left</span></span></div>
  <button onClick={onOpenAuditLogs} title="View assessment audit logs" aria-label="Audit Logs" className="shrink-0 border rounded-lg p-2 flex items-center gap-2 text-xs"><ShieldAlert size={14}/><span className="hidden sm:inline">Audit Logs</span></button>
 </header>;
}
