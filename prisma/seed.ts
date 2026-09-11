import 'dotenv/config';
import { db } from '../server/db';
import { seedCatalog } from '../server/catalog';
seedCatalog().then(() => console.log('Seeded four complete repository beta tracks. Existing case snapshots preserved.'))
  .catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
