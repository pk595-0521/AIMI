import React, { useEffect, useState } from 'react';
import {Markdown} from '../revised/Primitives';
import {FullTranscript} from '../logs/FullTranscript';
import { api } from '../../services/api';
export function PromptAuditPlayer({ sessionId }: { sessionId: string }) {
  const [phase,setPhase]=useState(''); const [search,setSearch]=useState('');
  const [rows,setRows]=useState<any[]>([]); const [cursor,setCursor]=useState<string|null>(null);
  const [index,setIndex]=useState(0); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  useEffect(() => {
    const controller=new AbortController(); setRows([]); setIndex(0); setCursor(null); setLoading(true); setError('');
    const timer=setTimeout(() => {
      const q=new URLSearchParams(); if(phase) q.set('phase',phase); if(search) q.set('search',search);
      api(`/grader/${sessionId}/prompts?${q}`,undefined,controller.signal).then(d=>{setRows(d.rows);setCursor(d.nextCursor);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },250);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[sessionId,phase,search]);
  async function more() { setLoading(true); try { const q=new URLSearchParams({cursor:cursor!});if(phase)q.set('phase',phase);if(search)q.set('search',search);const d=await api(`/grader/${sessionId}/prompts?${q}`);setRows(r=>[...r,...d.rows]);setCursor(d.nextCursor); } catch(e){setError((e as Error).message);}finally{setLoading(false);} }
  const entry=rows[index];
  return <section className="bg-white border rounded-xl flex flex-col h-full min-h-0" aria-label="Prompt audit trail player">
    <div className="p-4 border-b space-y-3"><FullTranscript messages={rows.flatMap(r=>[{id:r.id+'-prompt',label:`Segment ${r.phase} · Candidate`,text:r.prompt},{id:r.id+'-response',label:`${r.provider} · ${r.model} · ${r.status}`,text:r.response||'No response recorded.'}])} footer={cursor?<button className="work-secondary" disabled={loading} onClick={more}>Load more records</button>:undefined}/><h2 className="font-semibold">Prompt Audit Trail Player</h2>
      <div className="flex gap-2"><select aria-label="Filter by phase" value={phase} onChange={e=>setPhase(e.target.value)} className="border rounded-lg p-2 text-sm"><option value="">All phases</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>Phase {n}</option>)}</select><input aria-label="Search prompts and responses" placeholder="Search audit trail" value={search} onChange={e=>setSearch(e.target.value)} className="border rounded-lg p-2 text-sm min-w-0 flex-1"/></div>
      <div className="flex items-center justify-between text-sm"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)} className="disabled:opacity-30">← Previous</button><span>{rows.length ? index+1 : 0} / {rows.length}{cursor ? '+' : ''}</span><button disabled={index>=rows.length-1} onClick={()=>setIndex(i=>i+1)} className="disabled:opacity-30">Next →</button></div>
    </div>
    <div className="p-4 overflow-y-auto min-h-0 flex-1 space-y-4 break-words">
      {error && <p role="alert">{error}</p>}{loading && <p role="status">Loading audit records…</p>}
      {!entry && !loading && <p className="text-neutral-500 text-sm">No matching prompts.</p>}
      {entry && <><p className="text-xs text-neutral-500">Phase {entry.phase} · {new Date(entry.createdAt).toLocaleString()} · {entry.status}</p><p className="text-xs">{entry.provider} · {entry.model}<br/>{entry.latencyMs ?? '—'} ms · Input {entry.inputTokens ?? '—'} / output {entry.outputTokens ?? '—'} tokens</p><p className="text-sm">Purpose: {entry.purpose}</p><div className="bg-neutral-50 border rounded-xl p-4 min-w-0 text-sm"><h3>Candidate prompt</h3><Markdown text={entry.prompt}/></div><div className="bg-neutral-50 border rounded-xl p-4 min-w-0 text-sm"><Markdown text={entry.response || (entry.status==='FAILED' ? 'Provider failed; no response.' : 'Awaiting provider response.')}/></div></>}
      {cursor && <button disabled={loading} onClick={more} className="border rounded-full px-4 py-2 text-sm">Load more records</button>}
    </div>
  </section>;
}
