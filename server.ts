import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { api, apiError } from './server/routes';
import { db } from './server/db';
import { seedCatalog } from './server/catalog';
const app = express();
const production = process.env.NODE_ENV === 'production';
if (process.env.DATABASE_URL) await seedCatalog();
if (production && ['DATABASE_URL','APP_ORIGIN','AUTH_JWKS_URL','AUTH_ISSUER','AUTH_AUDIENCE'].some(k => !process.env[k])) throw new Error('Missing required production configuration');
app.disable('x-powered-by');
// Configure only exact trusted proxy addresses, never trust arbitrary forwarding headers.
if (process.env.TRUSTED_PROXY_IPS) app.set('trust proxy',process.env.TRUSTED_PROXY_IPS.split(','));
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
app.use(helmet({ contentSecurityPolicy: production ? { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], connectSrc: ["'self'", ...(supabaseOrigin ? [new URL(supabaseOrigin).origin] : [])], imgSrc: ["'self'",'data:'], frameSrc: ["https://calendly.com"], frameAncestors: ["'none'"] } } : false }));
app.use(express.json({ limit: '1mb' }));
app.use('/api',api);
app.use(apiError);
if (!production) {
  const { createServer } = await import('vite');
  app.use((await createServer({ server: { middlewareMode: true }, appType: 'spa' })).middlewares);
} else {
  app.use('/assets', express.static(path.resolve('dist/assets'), { immutable: true, maxAge: '1y' }));
  app.get('*', (_req,res) => res.sendFile(path.resolve('dist/index.html')));
}
const server = app.listen(Number(process.env.PORT || 3000),'0.0.0.0',() => console.log('AIMI listening on http://0.0.0.0:' + (process.env.PORT || 3000)));
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => server.close(() => { void db.$disconnect().then(() => process.exit(0)); }));
