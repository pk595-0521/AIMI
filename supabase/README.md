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
