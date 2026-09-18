# AIMI Screen

Screen is an additive assessment mode. The four catalog IDs end in `-screen-v1`;
Superday keeps its existing `-v2` cases, immutable snapshots, timing, rubric and
workspace. No Superday case, roadmap, deck, DCF, reflection or workflow module is
replaced. Existing rows default to `AIMI_SUPERDAY`. Screen-only content fields are
nullable. The original Superday grading implementation remains authoritative;
this change does not substitute a different historic rubric.

## Workflow

Consent starts one fixed 2,400-second server clock. Minutes 0–5 are reserved for
field classification. All correct classifications unlock analysis at minute 5;
failed attempts remain auditable and can be retried. A gate unfinished at minute 5
records a deadline failure and applies the 60-point overall ceiling. Exhibits,
inbox and Copilot stay blocked until the gate passes. Time continues on retries.

Minutes 5–20 allow baseline analysis and one structured branching decision.
At minute 20, the server freezes a pre-shock checkpoint and releases one emergency
inbox message. The baseline branch becomes read-only; the memo and scratchpad
persist. Server timestamps govern this even across reloads, tabs and disconnected
clients. The active browser polls for changes every two seconds. No timer bypass
or test fast-forward endpoint is exposed.

The final memo uses the five supplied Markdown headings, with exactly one table,
matrix or fenced ASCII/Mermaid flowchart. Native Markdown previews show tables and
ASCII/code blocks; Mermaid source is displayed as a fenced diagram definition.
Submission opens after the shock. At minute 40 editing closes and the last saved
work remains available for human grading, including incomplete work. There are no
Screen slide decks, DCF models, roadmaps or mandatory AI verification popups.

## Scoring

The eight criteria total 45 process points and 55 deliverable points. Screen does
not apply Superday's hygiene multiplier. The server applies hard caps, including
privacy/gate 60, PM broad launch 50, shock adaptability 4/10 and recommendation
10/15, missing visual synthesis 10/18. The additional consulting/IB checklist caps
and two-negative-answer calibration ceiling (74) are supported with evidence.
Observable gate failures and missing visuals cannot be unchecked by a grader.
Judgment-dependent findings require a certified human and cited evidence. A blocked
PII attempt is recorded as blocked, never fabricated as an external disclosure.

The source documents mention incompatible legacy 5/13 and 10/20 subscales. Screen
uses the final consolidated 100-point specification: PM overall 50 and strategic
recommendation 10/15. DCF time-wasting is reviewed under Copilot discipline; no
numeric DCF deduction was specified. More than one visual blocks valid submission;
expired incomplete work remains gradeable.

## Deployment and verification

Apply `prisma/migrations/202609140001_aimi_screen/migration.sql` before deploying the
new application. Production uses Supabase migration history; do not run the full
Prisma migration chain against its already-existing tables. The production
migration is recorded as `aimi_screen_additive_fields`. Fresh local databases use
the Prisma migration chain. Rollback can revert application code while retaining
the unused nullable columns and new assessment enum; do not delete candidate work.

The Render `AIMI` service auto-deploys pushes to `main`. The Blueprint file describes
the existing service configuration; do not create a duplicate service.

Checks: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:integration`,
`pnpm test:browser`, and `node --import tsx tests/screen-browser.ts` with the local
dev server running. Integration tests cover all eight cases on isolated Postgres.
Live scripts require explicit `LIVE_SMOKE_ALLOW_WRITES=true`; use only their
uniquely identified disposable users/sessions and clean them up afterward.
