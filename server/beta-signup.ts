import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { provisionSupabaseUser } from './auth';
import { db } from './db';
import { homeForRole } from '../src/auth-roles';

const same = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
export function resolveBetaRole(key: string, env = process.env) {
  if (!key) return 'candidate';
  if (same(key, env.BETA_ADMIN_KEY ?? 'ADMIN2026')) return 'admin';
  if (same(key, env.BETA_GRADER_KEY ?? 'GRADER2026')) return 'grader';
  return 'candidate';
}
export const signupInput = z.object({ name: z.string().trim().min(1).max(200), email: z.email().max(320), password: z.string().min(8).max(128), access_key: z.string().max(256).optional().default('') }).strict();
export const betaSignup = Router();
betaSignup.post('/signup', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.headers.origin !== process.env.APP_ORIGIN) { res.status(403).json({ error: 'Invalid request origin' }); return; }
  const input = signupInput.safeParse(req.body);
  if (!input.success) { res.status(422).json({ error: 'Enter a name, valid email, and password of at least 8 characters.' }); return; }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) { res.status(503).json({ error: 'Account registration is not configured.' }); return; }
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  let createdId: string | undefined;
  try {
    const { name, email, password, access_key } = input.data;
    const role = resolveBetaRole(access_key);
    // Never accept a role or retain an access key in editable user metadata.
    // Instant beta registration explicitly confirms the account at creation.
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name }, app_metadata: { beta_role: role } });
    if (error || !data.user) { res.status(400).json({ error: 'Unable to register. If you already have an account, sign in.' }); return; }
    createdId = data.user.id;
    const applicationRole = role === 'admin' ? 'EMPLOYER_ADMIN' : role === 'grader' ? 'GRADER' : 'APPLICANT';
    await db.$transaction(async tx => {
      await provisionSupabaseUser(data.user.id, email.toLowerCase(), applicationRole, tx);
      await tx.$executeRaw`UPDATE public.profiles SET role = ${role}, updated_at = now() WHERE id = ${data.user.id}::uuid`;
    });
    res.status(201).json({ redirect: homeForRole(applicationRole) });
  } catch {
    if (createdId) await admin.auth.admin.deleteUser(createdId).catch(() => undefined);
    res.status(503).json({ error: 'Registration could not complete. Please try again.' });
  }
});
