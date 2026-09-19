import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {queryCopilot} from '../../services/aiCopilot';
import {api} from '../../services/api';
import {Markdown} from './Primitives';



export function ScreenCopilot({session,chat,onMessage,disabled}:{session:any;chat:any;onMessage:(phase:number,message:any)=>void;disabled:boolean}){
 const [open,setOpen]=useState(()=>window.innerWidth>=1280),[prompt,setPrompt]=useState(''),[purpose,setPurpose]=useState(''),[busy,setBusy]=useState(false),[stream,setStream]=useState(''),[error,setError]=useState(''),[model,setModel]=useState('llama-3.3-70b-versatile'),[provider,setProvider]=useState('Groq Cloud'),[showLatest,setShowLatest]=useState(false);
 const scroll=useRef<HTMLDivElement>(null),following=useRef(true);
 const messages=useMemo(()=>((chat?.[session.phase]||[]) as any[]).filter(m=>m.sender==='user'||m.sender==='assistant'),[chat,session.phase]);
 const estimatedTokens=Math.ceil((prompt.length+purpose.length)/4);
 useEffect(()=>{const resize=()=>{if(window.innerWidth<1280)setOpen(false);};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 useEffect(()=>{api('/copilot/config').then(c=>{setModel(c.model);setProvider(c.provider||'Groq Cloud');}).catch(()=>{});},[]);
 const scrollToBottom=()=>{const el=scroll.current;if(el)el.scrollTop=el.scrollHeight;};
 useLayoutEffect(()=>{following.current=true;setShowLatest(false);scrollToBottom();},[session.phase,open]);
 useLayoutEffect(()=>{const el=scroll.current;if(el&&following.current&&!el.querySelector('.work-table-wrap:hover, .work-table-wrap:focus-within'))scrollToBottom();},[stream,messages.length,busy]);
 function onScroll(){const el=scroll.current;if(!el)return;following.current=el.scrollTop+el.clientHeight>=el.scrollHeight-60;setShowLatest(!following.current);}
 async function send(e:React.FormEvent){e.preventDefault();if(disabled||busy||!prompt.trim()||!purpose.trim())return;const phase=session.phase,text=prompt.trim(),loggedPurpose=purpose.trim();setBusy(true);setError('');setPrompt('');onMessage(phase,{id:crypto.randomUUID(),sender:'user',content:text,timestamp:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),promptLogged:{purpose:loggedPurpose,privateDataShared:false,aiVerificationEnabled:false}});
  try{const r=await queryCopilot({sessionId:session.id,trackId:session.track.id,phaseId:phase,modelId:model,prompt:text,loggedPurpose,privateDataShared:false,aiVerificationEnabled:false},setStream,setModel);onMessage(phase,{id:r.logId+'-response',sender:'assistant',content:r.reply,timestamp:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});setPurpose('');}catch(e){setError((e as Error).message);}finally{setBusy(false);setStream('');}
 }
 if(!open)return <button className="fixed bottom-5 right-5 work-primary z-30" onClick={()=>setOpen(true)}>AI Copilot</button>;
 return <aside aria-label="Screen Copilot" className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] xl:static xl:shrink-0 bg-white border-l border-slate-200 text-slate-900 flex flex-col min-h-0 shadow-xl">
  <header className="p-4 border-b border-slate-200 flex gap-3 items-center"><div className="mr-auto"><h2>AI Copilot Assistant</h2><p className="text-xs text-slate-500">{provider} · {model}</p></div><button className="work-secondary" onClick={()=>setOpen(false)}>Close Copilot</button></header>
  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs flex items-center justify-between"><span className="text-slate-500">Phase {session.phase} · prompt logging enforced</span><span className="text-slate-600">~{estimatedTokens} tokens</span></div>
  <div className="flex-1 overflow-y-auto min-w-0 p-4 space-y-4" ref={scroll} onScroll={onScroll} data-testid="copilot-scroll">{messages.map(m=><article key={m.id} className={`min-w-0 ${m.sender==='user'?'text-right':''}`}><strong className="text-xs uppercase text-slate-500">{m.sender==='user'?'Candidate Query':'Copilot'}</strong><div className={`w-full overflow-x-auto my-2 rounded-xl border border-slate-200 p-3 text-left ${m.sender==='user'?'bg-white':'bg-slate-50'}`}><Markdown text={m.content}/></div></article>)}{stream&&<article className="min-w-0"><strong className="text-xs uppercase text-slate-500">Copilot</strong><div className="w-full overflow-x-auto my-2 rounded-xl border border-slate-200 bg-slate-50 p-3"><Markdown text={stream}/></div></article>}{busy&&!stream&&<p role="status" className="text-sm text-slate-500">Copilot is thinking…</p>}</div>
  {showLatest&&<button className="work-secondary self-center my-2" onClick={()=>{following.current=true;setShowLatest(false);scrollToBottom();}}>Jump to latest</button>}
  {error&&<p role="alert" className="work-warning m-3">{error}</p>}
  <form onSubmit={send} className="shrink-0 p-4 border-t border-slate-200"><fieldset disabled={disabled||busy}><label className="work-field"><span>Query purpose</span><input value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="Verify arithmetic or compare options" required maxLength={2000}/></label><label className="work-field"><span>Ask Copilot</span><textarea rows={3} value={prompt} onChange={e=>setPrompt(e.target.value)} required maxLength={16000} placeholder="Use sanitized case data only" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send(e);}}}/></label><button className="work-primary" disabled={!prompt.trim()||!purpose.trim()||estimatedTokens>4000}>Send query</button></fieldset><p className="work-muted text-xs mt-3">Verify and edit generated work before including it in the executive memo.</p></form>
 </aside>;
}
