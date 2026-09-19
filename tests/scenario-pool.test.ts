import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chooseRandomScenario,scenarioFromRow} from '../server/catalog';
import {SCREEN_TRACKS,SCREEN_TEMPLATE} from '../src/data/screen';
import {splitScreenMemo,withScreenVisual,screenVisualTemplate} from '../src/screen-memo';
import {countScreenVisuals} from '../src/screen-scoring';

test('random selection stays within track and reaches both pool entries',()=>{
 const rows=[{track:'consulting',id:1},{track:'product-management',id:2},{track:'consulting',id:3}];
 assert.equal(chooseRandomScenario(rows,'consulting',()=>0).id,1);
 assert.equal(chooseRandomScenario(rows,'consulting',()=>0.99).id,3);
 assert.throws(()=>chooseRandomScenario(rows,'missing'));
});
test('all seeded scenarios have validated complete payloads without early shock disclosure',()=>{
 for(const t of SCREEN_TRACKS){
  const row={track:t.id,title:t.title,role:t.roleTitle,contextBrief:t.companyBackground,exhibits:t.exhibits,stakeholderInbox:t.inboxMessages,branchingOptions:t.branchingDecisions,minute20Shock:t.emergencyConstraint};
  assert.deepEqual(scenarioFromRow(t,row),t);
  assert.equal(t.exhibits.length,3);assert.equal(t.inboxMessages.length,3);
  assert.ok(!JSON.stringify(t.exhibits).includes('At minute 20'));
  assert.throws(()=>scenarioFromRow(t,{...row,exhibits:[]}));
 }
});
test('visual editor preserves memo and replaces the fifth section without duplicates',()=>{
 for(const t of SCREEN_TRACKS){
  const visual=screenVisualTemplate(t.id), memo=withScreenVisual(SCREEN_TEMPLATE,visual);
  assert.equal(countScreenVisuals(memo),1);
  assert.equal(withScreenVisual(memo,visual),memo);
  assert.equal(splitScreenMemo(memo).visual,visual);
  assert.equal((memo.match(/^## /gm)||[]).length,5);
 }
});
