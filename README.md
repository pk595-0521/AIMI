# AIMI Superday

A four-track workplace assessment with server-enforced phase gates, PostgreSQL persistence, audited enterprise Copilot calls, candidate consent and a separate human grader portal.

- [Deployment and source decisions](docs/IMPLEMENTATION.md)
- [PostgreSQL schema](prisma/schema.prisma)
- [API routes](server/routes.ts)
- [Environment configuration](.env.example)

Install Node 22+, pnpm and PostgreSQL. Run `pnpm install`, `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed` with DATABASE_URL configured. For hosted account access, configure the Supabase URL/publishable key and apply the auth profile migration; email/password signup seeds a candidate profile and the API provisions its server-side user on first authenticated request. Seeded tracks require rubric calibration approval before assignment. Grader and employer roles remain administrator-managed.

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
