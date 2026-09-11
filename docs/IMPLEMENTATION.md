# AIMI implementation and deployment

This project uses React/Vite and Express, with PostgreSQL/Prisma. The requested endpoints are Express route handlers, not Next.js route files. Entry points: `server/routes.ts`, `server/assessment.ts`, `prisma/schema.prisma`, `src/components/grader/PromptAuditPlayer.tsx`, `src/components/legal/LegalConsentModal.tsx`, and `src/App.tsx`.

## Source decisions

The pasted request is the implementation instruction. Both PDFs and all eleven screenshots are reference evidence. The second PDF says peer review occurs during Phase 2; the explicit request says it must be completed before Phase 2 opens. The implementation follows the explicit request. A peer message is dispatched once at assignment, unread; the server requires an opened timestamp and all five annotation fields. The Phase 3 message is created in the transition transaction with the stable key `mid_scenario_constraint`. Applicant responses omit its content before release. The browser URL uses `?selectedMsg=mid_scenario_constraint`.

Phase durations use the revised design values: Consulting 25/35/15/20/25 minutes (120 total); IB 30/50/20/20/20 (140 total); BizOps 20/40/20/15 (95 total); PM 25/35/20/15/25 (120 total). Submitting saves a checkpoint; earlier deliverables remain editable until final submission/deadline. Deadline expiration freezes the session; it cannot silently skip required gates. The server, not localStorage, controls phase and time.

Neither supplied PDF contains a complete numeric weighting table. The seed provides the five named PDF competencies and provisional weights 25/25/20/15/15 with maxima 13/13/10/7/7. It deliberately seeds tracks as **unapproved**. The assessment owner must approve/calibrate the weights before assignment. Do not describe these weights as official. The first PDF mandates a PM planning cap of 5/13 for retaining full-feature launch after the shock; the second includes a recovery-threshold qualification. The implementation uses the first document's stricter official rubric rule. A certified human grader records the cap determination from the candidate's work; the server enforces the numeric cap when applied. No keyword classifier makes this high-stakes judgment.

The revised registry is generated from `docs/AIMI_Assessment_Design_Revised.md` by `scripts/build_scenarios.py`; it preserves released exhibits, hidden grader keys, segment instructions and roadmap nodes in an immutable assignment snapshot. The reference PDFs contain scoring evidence and sample-derived conclusions; they are not sent wholesale to the candidate or provider. Sensitive datasets are excluded from automatic provider context. Prompt entry still requires safe data-handling choices; free-form input classification requires organizational DLP if a guaranteed content-level control is needed.

## Install and run

1. Install Node 22+ and PostgreSQL. Run `pnpm install`, `pnpm exec prisma generate`.
2. Copy `.env.example` to `.env` and set real configuration. Never commit secrets.
3. Run `pnpm db:migrate`, then `pnpm db:seed`.
4. For simple account access, apply `supabase/migrations/20260911002748_auth_profiles.sql` and configure the browser-safe `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` values (Render maps its `NEXT_PUBLIC_*` equivalents at build time). The `auth.users` trigger seeds `public.profiles`; the first valid Supabase bearer request provisions an applicant `User` in the self-service organization. Roles still come from the database, never browser inputs or editable user metadata. Provision certified graders and assess their training independently; the software cannot certify competence.
5. Review scenario versions and rubric calibration. Set `AssessmentTrack.approved = true` only for approved tracks. Version changes must create a reviewed version; existing sessions retain immutable scenario and rubric snapshots.
6. Assign a session and grader with `pnpm exec tsx server/assign.ts APPLICANT_UUID TRACK_ID GRADER_UUID`. This privileged operator command is not a public enrollment endpoint.
7. Configure the Supabase Auth issuer/JWKS URL and audience (`authenticated`) for the API, or retain a trusted OIDC gateway that sets the `__Host-aimi_token` cookie with `Secure; HttpOnly; SameSite=Strict; Path=/` and no Domain. Valid signed bearer JWTs are accepted; browser writes require exact APP_ORIGIN. No development auth bypass exists.
8. Verify the paid enterprise provider contract, configure an available GEMINI_MODEL, and record AI_CONTRACT_REFERENCE and AI_ZERO_TRAINING_VERIFIED. Without these, consent and AI usage fail closed.
9. Run `pnpm lint`, `pnpm test`, `pnpm build`, then `pnpm start`. Reverse proxy to loopback port 3000.

The no-retraining clause is an organizational/provider contract commitment, not a claim that source code can independently verify provider billing or enforce the provider's internal practices. Google distinguishes paid from unpaid service data use: https://ai.google.dev/gemini-api/terms. Human involvement alone does not establish legal compliance. EEOC resources also address job-related validation, adverse impact and accommodations: https://www.eeoc.gov/eeoc-disability-related-resources/artificial-intelligence-and-ada. Organize accessible accommodation and appeal processes with the assessment administrator.

## Security and operations

Authenticated users are organization-scoped. Graders can see assigned sessions; employer admins see only their organization; system admins have cross-organization review access. Only assigned, certified graders can save/finalize evaluations. Applicants cannot choose their role, review others, reset an attempt, overwrite audit entries, or select a model. Finalized evaluations are immutable through the API. Database operators retain administrative power; use least-privilege credentials and an audited operator workflow.

All writes validate bounded input. Session row locks and optimistic revision checks serialize concurrent saves and transitions. API-origin checks defend cookie-authenticated mutations. Prompt rate limits are process-local; configure a distributed limiter at the gateway before deploying multiple replicas. No CORS wildcard is enabled. Configure exact trusted proxy IPs for reliable consent IP records.

Prompt execution and log capture share `/api/prompt/log` (`/api/copilot` alias). A pending record is committed before provider execution; completion/failure follows. Reusing a request ID never calls the provider twice. Token counts are nullable when unavailable, not fabricated zeros. Provider failures have no fake answer fallback. Pending calls block phase submission. A process crash can leave a pending record: reconcile those records with provider/job traces before marking failed; do not blindly retry potentially billable generation. Audits contain sensitive assessment content: encrypt database disks/backups, restrict access, define retention and deletion policy, monitor access, and test restore procedures. No automatic deletion period is invented here.

The frontend displays explicit server save errors and warns before leaving with unsaved edits. A revision conflict preserves local edits and requires reload/reconciliation. It never silently overwrites a newer revision. Do not open the same assessment in multiple tabs. Consent must succeed before the workspace is rendered and before its initial timer begins.

## Validation scope

Automated tests cover workflow gates, field-handling validation, prohibited state overrides, numeric scoring and PM cap, source-event withholding, authentication rejection and HTTP error handling. TypeScript, Prisma validation and the production build are checked separately. Deployment requires integration validation against your real PostgreSQL database, OIDC gateway, provider contract/model, and certified-grader assignments. No live provider request or external applicant notification is sent during development; stakeholder emails are internal simulation messages.
