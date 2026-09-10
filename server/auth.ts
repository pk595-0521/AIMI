import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request, Response, NextFunction } from 'express';
import type { User } from '@prisma/client';
import { db } from './db';
export interface AuthRequest extends Request { user: User }
let jwks: ReturnType<typeof createRemoteJWKSet>;
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!process.env.AUTH_JWKS_URL || !process.env.AUTH_ISSUER || !process.env.AUTH_AUDIENCE) {
      res.status(503).json({ error: 'Identity provider is not configured' }); return;
    }
    // A trusted OIDC gateway sets this Secure, HttpOnly, SameSite=Strict cookie.
    const cookie = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('__Host-aimi_token='))?.slice('__Host-aimi_token='.length);
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : cookie;
    if (!token) { res.status(401).json({ error: 'Sign in through your organization to continue' }); return; }
    jwks ??= createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: process.env.AUTH_ISSUER, audience: process.env.AUTH_AUDIENCE, algorithms: ['RS256', 'ES256'],
    });
    if (!payload.sub || !payload.exp) throw new Error('Missing claims');
    const user = await db.user.findUnique({ where: { subject: payload.sub } });
    if (!user || user.disabled) { res.status(403).json({ error: 'Account is not provisioned' }); return; }
    (req as AuthRequest).user = user; next();
  } catch { res.status(401).json({ error: 'Invalid or expired sign-in' }); }
}
