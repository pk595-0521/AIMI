import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AssessmentClient} from '../../services/api';
import {createInitialAttemptState} from '../../services/storage';
import {emptyWork} from '../../types/work';
import type {AttemptState,ChatMessage,PhaseId,TrackConfig} from '../../types';
import {PhaseStepBar} from '../common/PhaseStepBar';
import {RoadmapBuilder} from '../roadmap/RoadmapBuilder';
import {CopilotPanel} from '../copilot/CopilotPanel';
import {Calculator} from './Calculator';
import {Field,Markdown,Modal} from './Primitives';
import {Logbook,HygieneEditor} from './Logbook';
import {Studio,Attachments} from './Studio';
import {FinalWork,ShockWork,AnalysisWork} from './FinalWork';
const pack=(s:any)=>({drafts:s.drafts,work:s.work,nodes:s.nodes,roadmapResponses:s.roadmapResponses});
export function SimulationApp({initialSession,onSwitch}:{initialSession:any;onSwitch:()=>void}) {
 const client=useMemo(()=>new AssessmentClient(initialSession),[initialSession.id]);
 const [s,setS]=useState(()=>({...initialSession,work:initialSession.work?.final?initialSession.work:emptyWork()}));
 const [tab,setTab]=useState('Workspace'),[modal,setModal]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState('Saved to server'),[saving,setSaving]=useState(false),[copilot,setCopilot]=useState(()=>window.innerWidth>=1280),[remaining,setRemaining]=useState(0),[selectedExhibit,setSelectedExhibit]=useState('');
 useEffect(()=>{
  const closeCopilotOnMobile=()=>{if(window.innerWidth<1280)setCopilot(false)};
  window.addEventListener('resize',closeCopilotOnMobile);
  closeCopilotOnMobile();
  return()=>window.removeEventListener('resize',closeCopilotOnMobile);
 },[]);
 const [chat,setChat]=useState(initialSession.chatByPhase||{1:[],2:[],3:[],4:[],5:[]});
 const latest=useRef(s);latest.current=s;const busy=useRef(false);const saved=useRef(JSON.stringify(pack(s)));const fingerprint=JSON.stringify(pack(s));
 const t=s.track as TrackConfig,phase=t.phases.find(p=>p.id===s.phase)!;
 const readonly=s.status!=='ACTIVE'||remaining===0;
 useEffect(()=>{const tick=()=>setRemaining(Math.max(0,Math.ceil((Date.parse(client.session.deadline)-Date.now())/1000)));tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[client]);
 async function command(action='save',extra:object={}){
  if(busy.current)return null;busy.current=true;setSaving(true);setError('');
  const submitted=pack(latest.current),sent=JSON.stringify(submitted);
  try{const r=await client.command({...submitted,action,...extra});
   saved.current=sent;
   setS((current:any)=>({...r,work:current.work,drafts:current.drafts,nodes:current.nodes,roadmapResponses:current.roadmapResponses}));
   setRemaining(Math.max(0,Math.ceil((Date.parse(r.deadline)-Date.now())/1000)));
   setStatus(sent===JSON.stringify(pack(latest.current))?'Saved to server':'Unsaved changes');
   if(action==='advance'){setTab('Workspace');if(r.phase===t.shockSegment&&r.status==='ACTIVE')setModal('Scenario update');}
   return r;
  }catch(e){setError((e as Error).message);setStatus('Save failed');return null;}finally{busy.current=false;setSaving(false);}
 }
 useEffect(()=>{if(readonly||fingerprint===saved.current||error||saving)return;setStatus('Unsaved changes');const timer=setTimeout(()=>{void command();},700);return()=>clearTimeout(timer);},[fingerprint,saving,readonly,error]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(JSON.stringify(pack(latest.current))!==saved.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 const changeWork=(work:any)=>setS((prev:any)=>({...prev,work}));
 const attempt:AttemptState={...createInitialAttemptState(t),attemptId:s.id,trackId:t.id,currentPhase:s.phase,isSubmitted:readonly,deliverables:s.drafts,roadmapNodesState:s.nodes,roadmapResponses:s.roadmapResponses,inbox:s.messages,work:s.work,dataHandling:s.dataHandling,dataGateCompleted:!!s.dataHandling,dataGatePassed:!!s.dataHandling&&s.hygiene_multiplier===1,timeRemainingSeconds:remaining,chatByPhase:chat};
 const onMessage=(msg:ChatMessage)=>setChat((prev:any)=>({...prev,[s.phase]:[...(prev[s.phase]||[]),msg]}));
 const options=['Workspace','Roadmap','Stakeholder inbox','Reference materials','Deliverables','Artifact studio','Audit logs'];
 return <div className="work-shell"><header className="work-header"><div className="mr-auto"><h1>AIMI Superday <span className="work-badge">Revised design</span></h1><p className="text-xs text-neutral-500 mt-1">{t.title} / {t.companyName}</p></div><span className="font-mono text-sm" role="timer">{Math.floor(remaining/60).toString().padStart(2,'0')}:{(remaining%60).toString().padStart(2,'0')}</span><span className="text-xs text-neutral-500" role="status">{saving?'Saving…':status}</span><button className="work-secondary" disabled={saving||readonly} onClick={()=>command()}>Save now</button><button className="work-primary" disabled={saving||readonly} onClick={()=>command('advance')}>{s.phase===t.phases.length?'Submit assessment':`Complete segment ${s.phase}`} →</button></header>
 <PhaseStepBar phases={t.phases} currentPhase={s.phase}/>
 {error&&<div role="alert" className="work-warning mx-3 my-2 shrink-0 flex gap-3 justify-between">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}
 {readonly&&<p role="status" className="p-3 bg-neutral-800 text-white text-sm">{s.status==='SUBMITTED'?'Assessment submitted. Your evidence is available for human review.':'This segment deadline has passed. Saved work is retained; editing is closed.'}</p>}
 <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden"><nav className="work-nav" aria-label="Assessment navigation">{options.map(label=><button key={label} aria-current={tab===label?'page':undefined} onClick={()=>setTab(label)}>{label}</button>)}<button onClick={async()=>{if(!saving&&(fingerprint===saved.current||await command()))onSwitch();}}>← Assessments</button><div className="hidden lg:block p-3 mt-10"><p className="work-eyebrow">Assessment state</p><p>Segment {s.phase} / {t.phases.length}</p><p className="text-xs text-neutral-500 mt-2">{s.work.assumptions.length} assumptions<br/>{s.work.verifications.length} AI reviews</p></div></nav>
 <main className="flex-1 min-w-0 overflow-auto bg-[#f7f7f8]"><div className="work-main work-stack">
 {tab==='Workspace'&&<><section className="work-card"><p className="work-eyebrow">Active brief · Segment {s.phase}</p><h2>{phase.title}</h2><p className="work-muted">{t.companyBackground}</p><details className="mt-6" open><summary className="font-medium">Segment instructions and required outputs</summary><Markdown text={phase.instructions||''}/></details><div className="flex gap-2 flex-wrap mt-5"><button className="work-primary" onClick={()=>setTab('Deliverables')}>Open deliverables →</button><button className="work-secondary" onClick={()=>setModal('Data hygiene')}>{s.dataHandling?'Review data decisions':'Complete data hygiene review'}</button><button className="work-secondary" onClick={()=>setTab('Audit logs')}>Assumptions & AI reviews</button></div></section><section className="work-card"><h3>Work products</h3><p className="work-muted">{t.artifactRequirements?.minVisuals?`Create ${t.artifactRequirements.minVisuals} decision-oriented visuals in segment 2. `:''}{t.artifactRequirements?.draftDeckSegment?'Create a 3-slide draft deck in segment 3. ':''}{t.artifactRequirements?.finalDeckPages?'Final: 4–5-slide executive deck. ':''}{t.artifactRequirements?.finalMemoPages?`Final: ${t.artifactRequirements.finalMemoPages.join('–')}-page memo. `:''}{t.artifactRequirements?.finalDashboard?'Include a one-page visual appendix.':''}</p><button className="work-secondary mt-4" onClick={()=>setTab('Artifact studio')}>Open artifact studio</button></section></>}
 {tab==='Reference materials'&&<><nav className="work-tabs">{t.exhibits.map(e=><button key={e.id} aria-pressed={(selectedExhibit||t.exhibits[0]?.id)===e.id} onClick={()=>setSelectedExhibit(e.id)}>Exhibit {e.number}</button>)}</nav>{t.exhibits.filter(e=>e.id===(selectedExhibit||t.exhibits[0]?.id)).map(e=><section key={e.id} className="work-card"><p className="work-eyebrow">Exhibit {e.number}</p><h2>{e.title}</h2><Markdown text={e.content||''}/>{e.type==='dataset'&&<div className="work-table-wrap"><table><thead><tr>{e.tableColumns?.map(c=><th key={c.key}>{c.header}</th>)}</tr></thead><tbody>{e.tableRows?.map((r,i)=><tr key={i}>{e.tableColumns?.map(c=><td key={c.key}>{String(r[c.key]??'')}</td>)}</tr>)}</tbody></table></div>}</section>)}</>}
 {tab==='Stakeholder inbox'&&<>{s.messages.length===0&&<section className="work-card"><h3>No new messages</h3><p className="work-muted">Stakeholder perspectives are available in the reference exhibits. New scenario messages arrive during the assessment.</p></section>}{s.messages.map((m:any)=><section className="work-card" key={m.id}><p className="work-eyebrow">{m.senderName} · {m.timestamp}</p><h2>{m.subject}</h2>{m.content.map((c:string,i:number)=><Markdown key={i} text={c}/>)}{m.unread&&<button className="work-secondary mt-4" onClick={()=>command('open-message',{messageId:m.id})}>Acknowledge message</button>}</section>)}</>}
 <fieldset disabled={readonly} className="work-stack min-w-0">
 {tab==='Deliverables'&&<><section className="work-card"><h2>Segment deliverables</h2>{t.deliverables.filter(d=>d.phaseId<=s.phase).map(d=><details key={d.id} open={d.phaseId===s.phase} className="border-t mt-4 pt-4"><summary className="font-medium">Segment {d.phaseId}: {d.title}</summary><Markdown text={d.description}/><Field label={`Segment ${d.phaseId} response`} value={s.drafts[d.id]?.value||''} onChange={value=>setS((prev:any)=>({...prev,drafts:{...prev.drafts,[d.id]:{id:d.id,value}}}))} rows={10}/></details>)}</section>{s.phase>=2&&<Calculator work={s.work} onChange={changeWork} trackId={t.id}/>}<AnalysisWork work={s.work} onChange={changeWork} trackId={t.id}/>{t.id==='investment-banking'&&s.phase>=2&&<section className="work-card"><h3>Walk me through a DCF · 5 minutes</h3><p className="work-muted">Give your verbal explanation to the assessor, then capture an accurate transcript here for review. Explain unlevered cash flow, WACC, terminal value, EV-to-equity bridge and key sensitivities.</p><Field label="Verbal DCF walkthrough transcript" value={s.work.dcfWalkthrough} onChange={dcfWalkthrough=>changeWork({...s.work,dcfWalkthrough})} rows={8}/></section>}{s.phase>=t.shockSegment!&&<ShockWork work={s.work} onChange={changeWork}/>}<FinalWork work={s.work} onChange={changeWork}/></>}
 {tab==='Artifact studio'&&<Studio work={s.work} onChange={changeWork} phase={s.phase} sessionId={s.id}/>}
 {tab==='Audit logs'&&<Logbook work={s.work} onChange={changeWork} phase={s.phase} track={t} chats={chat} hygiene={s.dataHandling} events={s.hygieneEvents||[]} onHygiene={()=>setModal('Data hygiene')}/>}
 {tab==='Roadmap'&&<RoadmapBuilder trackConfig={t} attemptState={attempt} onUpdateNodes={nodes=>setS((prev:any)=>({...prev,nodes}))} onSelectDecisionOption={()=>{}} onUpdateDeliverable={()=>{}} isCopilotOpen={copilot} onToggleCopilot={()=>setCopilot(!copilot)}/>}
 </fieldset>
 {readonly&&tab==='Artifact studio'&&<Attachments sessionId={s.id} readOnly/>}
 </div></main>
 <CopilotPanel trackConfig={t} attemptState={attempt} onSendMessage={onMessage} isOpen={copilot} onToggleOpen={setCopilot} activeTab={tab}/>
 </div>
 {modal==='Data hygiene'&&<Modal title="Field-level data hygiene" onClose={()=>setModal('')}><HygieneEditor track={t} initial={s.dataHandling} error={error} busy={saving||readonly} onSubmit={async dataHandling=>{if(await command('data-handling',{dataHandling}))setModal('');}}/></Modal>}
 {modal==='Scenario update'&&<Modal title={`${t.emergencyConstraint.memoTimestamp} · ${t.emergencyConstraint.title}`} onClose={()=>setModal('')}><Markdown text={t.emergencyConstraint.memoPoints.join('\n\n')}/><p className="work-warning mt-5">Revisit your recommendation and record changed and unchanged conclusions in Deliverables.</p><button className="work-primary mt-5" onClick={()=>{setModal('');setTab('Stakeholder inbox');}}>Open stakeholder inbox</button></Modal>}
 </div>;
}
