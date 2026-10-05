import type { RequestHandler } from 'express';

export function allowedOrigins(): Set<string> {
  return new Set([process.env.APP_ORIGIN, ...(process.env.ALLOWED_ORIGINS || '').split(',')].filter((value): value is string => !!value?.trim()).map(value => value.trim()));
}
export function isAllowedOrigin(origin: string | undefined): boolean {
  return !!origin && allowedOrigins().has(origin);
}

export const apiCors: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  res.vary('Origin');
  if (origin && !isAllowedOrigin(origin)) {
    res.status(403).json({ error: 'Invalid request origin' }); return;
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    if (!origin) { res.sendStatus(403); return; }
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-File-Name');
    res.sendStatus(204); return;
  }
  next();
};

// Render terminates TLS and redirects HTTP at its edge. Do not trust a client
// X-Forwarded-Proto header or redirect the Render health-check hostname.
export const canonicalHost: RequestHandler = (req, res, next) => {
  if (process.env.APP_ORIGIN === 'https://aimisuperday.com' && req.hostname === 'www.aimisuperday.com' && ['GET', 'HEAD'].includes(req.method)) {
    res.redirect(308, 'https://aimisuperday.com' + req.originalUrl); return;
  }
  next();
};
