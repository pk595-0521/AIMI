import 'dotenv/config';
import { db } from '../server/db';
import { TRACK_LIST } from '../src/data/tracks';
import { json } from '../server/assessment';
async function seed() {
 for (const scenario of TRACK_LIST) {
  const id=scenario.id+'-v2';
  await db.assessmentTrack.upsert({where:{id},update:{},create:{id,title:scenario.title,version:2,scenario:json(scenario),phaseConfigurations:json(scenario.phases),rubricVersion:'revised-2026-09-10-provisional-v2',approved:false,criteria:{create:scenario.rubric.map(c=>({id:id+':'+c.id,key:c.id,name:c.name,weight:c.weight,maxScore:c.maxScore,anchors:json(c)}))}}});
 }
 console.log('Seeded revised v2 tracks separately from legacy assignments. Equal rubric weights and advisory penalties are provisional; calibrate before approval.');
}
seed().finally(()=>db.$disconnect());
