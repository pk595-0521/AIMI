import { PrismaClient } from '@prisma/client';
import { databaseUrl } from './database-url';
const url = databaseUrl(process.env.DATABASE_URL);
export const db = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
