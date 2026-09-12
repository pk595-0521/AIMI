# AIMI Superday

A four-track workplace assessment with server-enforced phase gates, PostgreSQL persistence, audited enterprise Copilot calls, candidate consent and a separate human grader portal.

- [Deployment and source decisions](docs/IMPLEMENTATION.md)
- [PostgreSQL schema](prisma/schema.prisma)
- [API routes](server/routes.ts)
- [Environment configuration](.env.example)

Install Node 22+, pnpm and PostgreSQL. Run `pnpm install`, `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed` with DATABASE_URL configured. For hosted account access, configure the Supabase URL/publishable key and apply the auth profile migration. The four bundled revised tracks are enabled for beta assignment automatically at server startup. Their existing provisional rubric weights are preserved; beta activation does not represent hiring calibration.

The server applies Prisma's `pgbouncer=true` compatibility setting to Supabase transaction pooler URLs on port 6543. Direct connections and session pooler connections retain their normal behavior. Database failures during identity lookup return a retryable 503 instead of incorrectly reporting an expired sign-in.

For an explicitly authorized live workflow probe, run `LIVE_SMOKE_ALLOW_WRITES=true node .live-assignment-smoke.mjs`. It creates disposable users prefixed `aimi-assignment-smoke-` and real assessment sessions; remove those exact test records after verification. The printed temporary directory holds private browser sessions for resuming with `SMOKE_STATE_DIR` and must be removed after cleanup. The probe verifies all three consent acknowledgments, Segment 1, the timer, and the in-progress grader queue.

Beta enrollment is enabled by default in this release (`NEXT_PUBLIC_BETA_MODE=true`). Candidates may start after all three consent acknowledgments even while the enterprise AI contract is pending. Set `NEXT_PUBLIC_BETA_MODE=false` to restore that enrollment prerequisite. Outbound Copilot and AI-assisted grading still require `AI_ZERO_TRAINING_VERIFIED=true` and `AI_CONTRACT_REFERENCE`; beta enrollment does not attest a contract or grant any additional portal permissions.

`pnpm dev` runs the app. `pnpm lint`, `pnpm test`, and `pnpm build` validate it. `pnpm start` runs the production build. The root landing page is public, while assessment and portal APIs require a Supabase or trusted OIDC session. There is no insecure local-login or simulated-provider fallback.

For the UI fixture smoke test, start the app and run `pnpm exec playwright install chromium`, then `pnpm test:browser`. Alternatively set BROWSER_EXECUTABLE to a compatible installed Chromium executable. TEST_BASE_URL defaults to http://127.0.0.1:3000. The browser test uses isolated mocked API responses; it does not replace live database, identity-provider or provider integration testing.
# Beta invite signup

`/auth/signup` accepts name, email, password, and an optional invite key. The Express
`POST /api/auth/signup` endpoint validates keys server-side, creates an immediately
confirmed Supabase beta account, and provisions its application role. Blank or
unrecognized keys create candidates. Defaults are `GRADER2026` and `ADMIN2026`;
override with server-only `BETA_GRADER_KEY` and `BETA_ADMIN_KEY` to rotate them.
The server requires `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL`
(or `VITE_SUPABASE_URL`). Existing accounts must sign in; signup never upgrades them.

Apply `supabase/migrations/20260911163550_beta_access_roles.sql`. The profile trigger
trusts only admin-controlled app metadata; users can update only their own name.
Admin invite accounts use the tenant-scoped `EMPLOYER_ADMIN` role, not global system
administration. Grader certification and assigned-assessment checks still apply.
Signup and login redirect using the server's `/api/me` role. Assessments still need
assignment. Run `node --import tsx tests/profile-migration.ts` for profile/RLS checks.

## Assignment workflow

The canonical cases are `server/scenarios/revised.json`, imported by the four
`src/data/tracks/*.ts` modules. `server/catalog.ts` seeds `AssessmentTrack` and
`RubricCriterion` from that content at startup or via `pnpm db:seed`, without
overwriting existing case content or candidate snapshots. No separate placeholder
template table is used. Catalog responses omit unreleased exhibits, shocks and rubrics.

In `/employer`, select an assessment and candidate, optionally select a certified
grader, and assign. The candidate sees **Start Assessment**; consent starts the
assessment clock. **Self-Assign Beta Practice Track** creates the same real workflow.
Repeated assignment clicks resume an active session. Graders see their assignments
and unclaimed work in their own organization; selecting unclaimed work claims it.
An admin confirms grader training before scoring is enabled. Submissions are scored
using the existing evidence, pre/post-shock checkpoints, rubric anchors and human
finalization. The existing provider-contract consent gate still applies.

`AssessmentSession.status=ACTIVE` with no consent is presented as `assigned`,
ACTIVE with consent as `in_progress`; SUBMITTED and EXPIRED remain explicit.
The protected Express API supplies UI data using server-side tenant predicates;
raw assessment tables are not exposed to browser Supabase queries.

### Groq streaming Copilot

Set the server-only `GROQ_API_KEY` in Render. Candidate Copilot uses Groq's OpenAI-compatible chat completions endpoint, `llama-3.3-70b-versatile`, temperature 0.2, and SSE. The key is never sent to the browser. Grader model advisory remains separately configured.

`POST /api/copilot/chat` accepts `assessment_id`, `track_id`, `segment_id`, `request_id`, `messages`, `purpose`, optional `candidate_id` and `current_shock_state`. The authenticated owner, assigned scenario snapshot, active segment and server-released shock determine context. Browser shock flags and unverified conversation history are ignored. Only submitted hygiene decisions are required; incorrect classifications never authorize sensitive data disclosure.

Audit responses are stored in the existing `PromptLog` table and exposed through the service-only `copilot_audit_logs` view (migration `20260912213026_copilot_audit_logs_view.sql`). This preserves existing grader history and AI verification references without maintaining duplicate audit stores. Completion audit failures are logged server-side and do not truncate the stream. Provider failures and disconnects record partial responses as failed where storage is available.

Consent version `2026-09-12.2` describes Groq transmission and potential abuse-monitoring retention. Groq's published service terms prohibit model training absent customer permission; enable zero data retention in the Groq console if required by your organization. Missing keys produce a friendly configuration error; rate limits produce a retry message. No simulated answer is returned.
