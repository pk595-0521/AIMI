import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request, Response, NextFunction } from 'express';
import type { User, Role, Prisma } from '@prisma/client';
import { db } from './db';
export interface AuthRequest extends Request { user: User }
let jwks: ReturnType<typeof createRemoteJWKSet>;
const SELF_SERVICE_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

export async function provisionSupabaseUser(subject: string, email: string, role: Role = 'APPLICANT', client: Prisma.TransactionClient = db) {
  const organization = await client.organization.upsert({
    where: { id: SELF_SERVICE_ORGANIZATION_ID },
    update: {},
    create: { id: SELF_SERVICE_ORGANIZATION_ID, name: 'AIMI self-service candidates' },
  });
  return client.user.upsert({
    where: { subject },
    update: {},
    create: { subject, email, organizationId: organization.id, role },
  });
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!process.env.AUTH_JWKS_URL || !process.env.AUTH_ISSUER || !process.env.AUTH_AUDIENCE) {
      res.status(503).json({ error: 'Identity provider is not configured' }); return;
    }
    // A trusted OIDC gateway sets this Secure, HttpOnly, SameSite=Strict cookie.
    const cookie = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('__Host-aimi_token='))?.slice('__Host-aimi_token='.length);
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : cookie;
    if (!token) { res.status(401).json({ error: 'Sign in to continue' }); return; }
    jwks ??= createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: process.env.AUTH_ISSUER, audience: process.env.AUTH_AUDIENCE, algorithms: ['RS256', 'ES256'],
    });
    if (!payload.sub || !payload.exp) throw new Error('Missing claims');
    let user = await db.user.findUnique({ where: { subject: payload.sub } });
    // Supabase Auth access tokens use the configured issuer and the
    // `authenticated` audience. Provisioning happens on the first API call
    // so a simple email/password signup can enter the candidate workspace
    // without a separate organization administrator workflow.
    const isSupabaseToken = payload.iss === process.env.AUTH_ISSUER && payload.aud === 'authenticated';
    if (!user && isSupabaseToken) {
      const email = typeof payload.email === 'string' && payload.email.includes('@')
        ? payload.email.toLowerCase()
        : `${payload.sub}@users.invalid`;
      user = await provisionSupabaseUser(payload.sub, email);
    }
    if (!user || user.disabled) { res.status(403).json({ error: 'Account is not provisioned' }); return; }
    (req as AuthRequest).user = user; next();
  } catch (error) {
    // Log only the error class/code, never credentials or token contents.
    const failure = error as { name?: string; code?: string };
    console.error('Authentication failure', failure.code || failure.name || 'unknown');
    if (failure.name?.startsWith('PrismaClient')) {
      res.status(503).json({ error: 'Sign-in verification is temporarily unavailable. Please retry.' }); return;
    }
    res.status(401).json({ error: 'Invalid or expired sign-in' });
  }
}
