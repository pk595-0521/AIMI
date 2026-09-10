import {z} from 'zod';
const s=z.string().max(30000),id=z.string().min(1).max(100),phase=z.number().int().min(1).max(5),confidence=z.enum(['','high','medium','low']);
const kpi=z.object({metric:s,threshold:s,owner:s}).strict();
export const workSchema=z.object({
 assumptions:z.array(z.object({id,statement:s,evidence:s,uncertainty:s,confidence,phase,revisionReason:s}).strict()).max(100),
 verifications:z.array(z.object({id,phase,source:s,claim:s,classification:z.enum(['','supported','plausible','unsupported']),decision:z.enum(['','accept','modify','reject']),issue:s,evidence:s,correction:s,validation:s}).strict()).max(100),
 visuals:z.array(z.object({id,phase,title:s,kind:z.enum(['bar','table']),unit:s,takeaway:s,source:s,rows:z.array(z.object({label:s,value:z.number().finite()}).strict()).max(100)}).strict()).max(30),
 documents:z.array(z.object({id,phase,kind:z.enum(['deck','memo','dashboard']),stage:z.enum(['draft','final']),title:s,pages:z.array(z.object({headline:s,body:s,visualIds:z.array(id).max(10)}).strict()).max(5)}).strict()).max(20),
 analysis:z.array(z.object({id,metric:s,value:z.number().finite(),formula:s,source:s}).strict()).max(100),
 final:z.object({contextRecommendation:s,risks:z.tuple([s,s]),monitoring:s,roadmap:s,uncertainty:s,confidence}).strict(),
 shock:z.object({recommendation:s,changed:s,unchanged:s,reason:s,revisedAssumption:s,kpis:z.tuple([kpi,kpi])}).strict(),dcfWalkthrough:s,verbalDefense:s,
}).strict();
