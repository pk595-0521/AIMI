import type {TrackConfig} from '../src/types';
import {scoreHygiene} from './workflow';
export function unsafePrompt(text:string,t:TrackConfig):string[] {
 const reasons:string[]=[];
 if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text))reasons.push('email address');
 if(/\b\d{2}-\d{7}\b|\b\d{3}-\d{2}-\d{4}\b/.test(text))reasons.push('tax or personal identifier');
 if(/(?:\+1[ -]?)?\(?\d{3}\)?[ -]\d{3}[ -]\d{4}\b/.test(text))reasons.push('phone number');
 const protectedFields=t.dataGate?.fields.filter(f=>!f.expectedAction.includes('use-as-is'))||[];
 for(const e of t.exhibits.filter(e=>e.type==='dataset'))for(const row of e.tableRows||[])for(const f of protectedFields){const v=String(row[f.fieldName]??'');if(v.length>=5&&text.toLowerCase().includes(v.toLowerCase()))reasons.push(f.fieldName);}
 return [...new Set(reasons)];
}
export function sanitizedContext(t:TrackConfig,phase:number,decisions:any[]) {
 if(t.dataGate)scoreHygiene(t,decisions);
 // Incorrect classifications affect scoring, never permission to disclose data.
 decisions=decisions.map(d=>({...d,action:t.dataGate?.fields.find(f=>f.fieldName===d.fieldName)?.expectedAction.includes(d.action)?d.action:'exclude'}));
 const exhibits=t.exhibits.filter(e=>!e.graderOnly&&(e.releaseSegment||1)<=phase).map(e=>{
  // Screen exhibits are curated operational facts rather than row-level
  // customer data. Preserve their full table payload for Copilot context.
  if(t.assessmentType==='AIMI_SCREEN')return {id:e.id,title:e.title,content:e.content,columns:e.tableColumns,rows:e.tableRows};
  if(e.type!=='dataset')return {id:e.id,title:e.title,content:e.content};
  const rows=(e.tableRows||[]).map(row=>Object.fromEntries((t.dataGate?.fields||[]).flatMap(f=>{
   if(!(f.fieldName in row))return [];
   const action=decisions.find(d=>d.fieldName===f.fieldName)?.action;
   if(action==='use-as-is'&&f.expectedAction.includes('use-as-is'))return [[f.fieldName,row[f.fieldName]]];
   if(action==='redact')return [[f.fieldName,'[REDACTED]']];
   // Aggregated quasi-identifiers never remain attached to individual rows.
   return [];
  })));
  const aggregates:Record<string,unknown>={};
  for(const d of decisions.filter(d=>d.action==='aggregate')){
   const groups:Record<string,number>={};for(const r of e.tableRows||[]){const value=String(r[d.fieldName]??'');if(value)groups[value.slice(0,3)]=(groups[value.slice(0,3)]||0)+1;}
   aggregates[d.fieldName]=Object.entries(groups).filter(([,count])=>count>=5).map(([zone,count])=>({zone:zone+'**',count}));
  }
  return {id:e.id,title:e.title,rows,aggregates};
 });
 return {company:t.companyBackground,segment:phase,exhibits};
}
