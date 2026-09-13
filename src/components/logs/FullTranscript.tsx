import React,{useState} from 'react';
import {createPortal} from 'react-dom';
import {Markdown,Modal} from '../revised/Primitives';
export type TranscriptMessage={id:string;label:string;text:string};
export function FullTranscript({messages,footer}:{messages:TranscriptMessage[];footer?:React.ReactNode}){
 const [open,setOpen]=useState(false);
 return <><button className="work-secondary" onClick={()=>setOpen(true)}>Expand Full Transcript</button>{open&&createPortal(<Modal title="Full AI transcript" onClose={()=>setOpen(false)}><div className="space-y-6 min-w-0">{messages.map(m=><article key={m.id} className="border-b pb-5 min-w-0"><h3 className="font-semibold mb-3">{m.label}</h3><Markdown text={m.text}/></article>)}{!messages.length&&<p>No interactions recorded.</p>}{footer}</div></Modal>,document.body)}</>;
}
export function chatTranscript(chats:Record<string,any[]>):TranscriptMessage[]{return Object.entries(chats).flatMap(([phase,rows])=>rows.filter(m=>m.sender==='user'||m.sender==='assistant').map(m=>({id:m.id,label:`Segment ${phase} · ${m.sender==='user'?'Candidate':'Copilot'} · ${m.timestamp||''}`,text:m.content})));}
