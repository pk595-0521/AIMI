import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { db } from './db';

export const enterpriseLeadInput = z.object({
  full_name: z.string().trim().min(1).max(200),
  work_email: z.email().max(320).transform(v => v.toLowerCase()),
  company_name: z.string().trim().min(1).max(200),
  team_size: z.enum(['1–10', '11–50', '51–200', '201–1000', '1000+']),
  track_interest: z.enum(['IB', 'PM', 'Consulting', 'Ops']),
}).strict();
export async function saveEnterpriseLead(input: z.infer<typeof enterpriseLeadInput>) {
  // Duplicate requests do not overwrite someone else's details or reveal whether an email exists.
  await db.$executeRaw`INSERT INTO public.enterprise_leads (full_name, work_email, company_name, team_size, track_interest)
    VALUES (${input.full_name}, ${input.work_email}, ${input.company_name}, ${input.team_size}, ${input.track_interest})
    ON CONFLICT (work_email) DO NOTHING`;
}
export function leadHandler(save = saveEnterpriseLead): RequestHandler {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!process.env.APP_ORIGIN || req.headers.origin !== process.env.APP_ORIGIN) { res.status(403).json({ error: 'Invalid request origin' }); return; }
    const parsed = enterpriseLeadInput.safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: 'Enter your name, work email, company, team size, and track interest.' }); return; }
    try { await save(parsed.data); res.status(201).json({ saved: true }); }
    catch { res.status(503).json({ error: 'Your request could not be saved. Please try again shortly.' }); }
  };
}
export const enterpriseLeads = Router();
enterpriseLeads.post('/enterprise-leads', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }), leadHandler());
