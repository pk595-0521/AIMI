# AIMI Superday

A four-track workplace assessment with server-enforced phase gates, PostgreSQL persistence, audited enterprise Copilot calls, candidate consent and a separate human grader portal.

- [Deployment and source decisions](docs/IMPLEMENTATION.md)
- [PostgreSQL schema](prisma/schema.prisma)
- [API routes](server/routes.ts)
- [Environment configuration](.env.example)

Install Node 22+, pnpm and PostgreSQL. Run `pnpm install`, `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed` with DATABASE_URL configured. Seeded tracks require rubric calibration approval before assignment. Configure your OIDC gateway, provision users and assign sessions as described in the deployment guide.

`pnpm dev` runs the app. `pnpm lint`, `pnpm test`, and `pnpm build` validate it. `pnpm start` runs the production build. There is no insecure local-login or simulated-provider fallback.

For the UI fixture smoke test, start the app and run `pnpm exec playwright install chromium`, then `pnpm test:browser`. Alternatively set BROWSER_EXECUTABLE to a compatible installed Chromium executable. TEST_BASE_URL defaults to http://127.0.0.1:3000. The browser test uses isolated mocked API responses; it does not replace live database, identity-provider or provider integration testing.
