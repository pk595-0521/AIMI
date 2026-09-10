export type Confidence = '' | 'high' | 'medium' | 'low';
export interface Assumption { id:string; statement:string; evidence:string; uncertainty:string; confidence:Confidence; phase:number; revisionReason:string; }
export interface Verification { id:string; phase:number; source:string; claim:string; classification:''|'supported'|'plausible'|'unsupported'; decision:''|'accept'|'modify'|'reject'; issue:string; evidence:string; correction:string; validation:string; }
export interface Visual { id:string; phase:number; title:string; kind:'bar'|'table'; unit:string; takeaway:string; source:string; rows:{label:string;value:number}[]; }
export interface WorkDocument { id:string; phase:number; kind:'deck'|'memo'|'dashboard'; stage:'draft'|'final'; title:string; pages:{headline:string;body:string;visualIds:string[]}[]; }
export interface AnalysisEntry { id:string; metric:string; value:number; formula:string; source:string; }
export interface AssessmentWork {
 assumptions:Assumption[]; verifications:Verification[]; visuals:Visual[]; documents:WorkDocument[]; analysis:AnalysisEntry[];
 final:{contextRecommendation:string;risks:[string,string];monitoring:string;roadmap:string;uncertainty:string;confidence:Confidence};
 shock:{recommendation:string;changed:string;unchanged:string;reason:string;revisedAssumption:string;kpis:[{metric:string;threshold:string;owner:string},{metric:string;threshold:string;owner:string}]};
 dcfWalkthrough:string; verbalDefense:string;
}
export function emptyWork():AssessmentWork { return {assumptions:[],verifications:[],visuals:[],documents:[],analysis:[],final:{contextRecommendation:'',risks:['',''],monitoring:'',roadmap:'',uncertainty:'',confidence:''},shock:{recommendation:'',changed:'',unchanged:'',reason:'',revisedAssumption:'',kpis:[{metric:'',threshold:'',owner:''},{metric:'',threshold:'',owner:''}]},dcfWalkthrough:'',verbalDefense:''}; }
