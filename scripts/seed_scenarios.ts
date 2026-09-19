import 'dotenv/config';
import { seedScenarioPool } from '../server/catalog';
import { db } from '../server/db';

try { await seedScenarioPool(); console.log('Seeded AIMI Screen scenario pool'); }
finally { await db.$disconnect(); }
