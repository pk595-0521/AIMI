# Supabase production database

The application uses Prisma against PostgreSQL, so a Supabase project can provide
the production `DATABASE_URL`. The browser uses the publishable key for
email/password Auth; the service-role/secret key is server-only. The SQL in
`supabase/migrations/` mirrors the Prisma schema, creates `public.profiles` from
`auth.users`, and enables row-level security with a deny-by-default Data API
posture. The Express server connects through the private database role and maps
Supabase access-token subjects to server-owned applicant records.

Before applying migrations, link the intended project and verify the target URL:

```sh
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Never put `SUPABASE_SERVICE_ROLE_KEY` or database credentials in the repository.

After applying `20260911002748_auth_profiles.sql`, verify that the
`on_auth_user_created` trigger exists and that the `profiles_select_own` and
`profiles_update_own` policies are enabled. Roles for grader and employer access
remain server-managed; users cannot promote themselves through `user_metadata`.

## Enterprise pilot inquiries

`20260925180911_enterprise_leads.sql` adds a private lead table. The public
`POST /api/enterprise-leads` endpoint validates the configured `APP_ORIGIN`,
rate-limits requests, and inserts through the existing server database connection.
RLS is enabled and `anon` / `authenticated` have no table privileges. Duplicate
normalized emails return the same success response without overwriting existing
contact details. This intentionally has no browser RLS policies.

The homepage schedules calls at `https://calendly.com/pk595-cornell/aimi` only
after lead persistence succeeds. The iframe is allowed by the production CSP.
Optional account creation uses Supabase email magic links with email ownership
verification; it does not grant employer/admin access. Configure Supabase Auth's
Site URL and allowed redirect URLs for `https://aimisuperday.com/screen` and
configure production email delivery. An email failure never blocks booking or
claims that an account email was sent successfully.

Verification: `pnpm test`, `pnpm lint`, `pnpm build`, and (with `pnpm dev`
running) `pnpm test:landing` and `pnpm test:browser`. The landing browser test
uses explicit API and calendar fixtures; it never sends a real booking or email.
