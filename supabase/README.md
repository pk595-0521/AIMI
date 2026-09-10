# Supabase production database

The application uses Prisma against PostgreSQL, so a Supabase project can provide
the production `DATABASE_URL` without a frontend Supabase client. The SQL in
`supabase/migrations/` mirrors the Prisma schema and enables row-level security
with a deny-by-default Data API posture. The Express server connects through the
private database role and remains responsible for OIDC identity, organization
scope, and grader authorization.

Before applying migrations, link the intended project and verify the target URL:

```sh
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Never put `SUPABASE_SERVICE_ROLE_KEY` or database credentials in the repository.
