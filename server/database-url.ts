// Supabase transaction pooling cannot retain Prisma prepared statements between
// transactions. Keep the workaround scoped to the documented pooler endpoint.
export function databaseUrl(value: string | undefined) {
  if (!value) return value;
  const url = new URL(value);
  if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') {
    url.searchParams.set('pgbouncer', 'true');
  }
  return url.toString();
}
