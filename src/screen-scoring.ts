import { SCREEN_RUBRIC, SCREEN_SECTIONS } from './data/screen';
export interface ScreenCaps {privacyLeak:boolean; gateFailure:boolean; pmBroadLaunch:boolean; shockNonAdaptation:boolean; missingVisual:boolean; consultingUnsafeExpansion:boolean; ibMissingDownside:boolean; calibrationNo:number; evidence:string}
export const EMPTY_SCREEN_CAPS:ScreenCaps={privacyLeak:false,gateFailure:false,pmBroadLaunch:false,shockNonAdaptation:false,missingVisual:false,consultingUnsafeExpansion:false,ibMissingDownside:false,calibrationNo:0,evidence:''};
// Accept documented Markdown tables and fenced flowcharts, not decorative prose or images.
export function countScreenVisuals(memo:string) {
 const fences=memo.match(/```(?:mermaid|text|ascii)?\s*\n[\s\S]*?```/g)||[];
 const charts=fences.filter(f=>/(?:flowchart|graph\s+(?:TD|LR|TB)|-->|→|\+[-]+\+)/.test(f)).length;
 const prose=memo.replace(/```[\s\S]*?```/g,'');
 const tables=(prose.match(/^\s*\|?\s*:?-{3,}:?\s*\|(?:\s*:?-{3,}:?\s*\|?)+\s*$/gm)||[]).length;
 return charts+tables;
}
export function screenMemoProblems(memo:string) {
 const headings=[...memo.matchAll(/^## (.+)\s*$/gm)];
 const problems:string[]=[];
 if(headings.length!==5||headings.some((h,i)=>h[1].trim()!==SCREEN_SECTIONS[i]))problems.push('Use the five required Markdown section titles in order.');
 if(headings.some((h,i)=>!memo.slice(h.index!+h[0].length,headings[i+1]?.index??memo.length).trim()))problems.push('Complete all five memo sections.');
 if(countScreenVisuals(memo)!==1)problems.push('Include exactly one Markdown table or fenced ASCII/Mermaid flowchart.');
 return problems;
}
export function effectiveScreenCaps(s:any, flags:Partial<ScreenCaps>={}):ScreenCaps {
 const events=s.hygieneEvents||[];
 const gateAttempts=events.filter((e:any)=>e.type==='SCREEN_HYGIENE_ATTEMPT');
 const finalGate=gateAttempts.at(-1);
 return {...EMPTY_SCREEN_CAPS,...flags,
 privacyLeak:!!flags.privacyLeak||events.some((e:any)=>e.type==='PII_DISCLOSED'),
 gateFailure:!!flags.gateFailure||!s.dataHandling||events.some((e:any)=>e.type==='SCREEN_GATE_DEADLINE_MISSED')||!!(s.dataHandling&&finalGate&&!finalGate.passed),
 missingVisual:!!flags.missingVisual||countScreenVisuals(s.finalDeliverable||'')===0};
}
export function scoreScreen(scores:Record<string,{score:number;notes?:string}>,caps:ScreenCaps,track:string) {
 const points=Object.fromEntries(SCREEN_RUBRIC.map(c=>[c.id,Math.min(c.maxScore,Math.max(0,scores[c.id]?.score||0))]));
 if(caps.shockNonAdaptation){points.adaptability=Math.min(4,points.adaptability);points.recommendation=Math.min(10,points.recommendation);}
 if(caps.missingVisual)points.synthesis=Math.min(10,points.synthesis);
 if(track==='consulting'&&caps.consultingUnsafeExpansion)points.adaptability=Math.min(4,points.adaptability);
 if(track==='investment-banking'&&caps.ibMissingDownside)points.recommendation=Math.min(7,points.recommendation);
 const interaction=['hygiene','branch','copilot','adaptability'].reduce((n,k)=>n+points[k],0);
 const deliverable=['recommendation','risk','uncertainty','synthesis'].reduce((n,k)=>n+points[k],0);
 const ceiling=Math.min(caps.privacyLeak||caps.gateFailure?60:100,track==='product-management'&&caps.pmBroadLaunch?50:100,caps.calibrationNo>=2?74:100);
 return {points,interaction,deliverable,uncapped:interaction+deliverable,total:Math.min(ceiling,interaction+deliverable),ceiling};
}
