-- Keep the existing immutable-session audit store as the single source of truth.
-- Grader APIs enforce tenant/assignment access; no public Data API exposure.
create or replace view public.copilot_audit_logs with (security_invoker = true) as
select p.id, s."applicantId" as candidate_id, p."sessionId" as assessment_id,
       s."trackId" as track_id, p.phase as segment_id, p.prompt as prompt_text,
       p.response as response_text, p."createdAt" as created_at, p.status, p.provider, p.model
from public."PromptLog" p join public."AssessmentSession" s on s.id=p."sessionId";
revoke all on public.copilot_audit_logs from public, anon, authenticated;
grant select on public.copilot_audit_logs to service_role;
