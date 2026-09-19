import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chartError,chartTypes,decodeChart,encodeChart,type ChartGrid} from '../src/screen-chart';
import {withScreenVisual} from '../src/screen-memo';
import {SCREEN_SECTIONS} from '../src/data/screen';
import {screenMemoProblems} from '../src/screen-scoring';
test('all chart types survive memo persistence and remain one valid visual',()=>{
 for(const type of chartTypes){
  const grid:ChartGrid={type,columns:['Region','Revenue ($M)'],rows:[['North','12'],['South','8']]};
  const memo=withScreenVisual(SCREEN_SECTIONS.map(h=>`## ${h}\n\nEvidence`).join('\n\n'),encodeChart(grid));
  assert.deepEqual(decodeChart(memo),grid);assert.deepEqual(screenMemoProblems(memo),[]);
 }
});
test('charts reject missing and nonnumeric values; pies reject negative or multiple series',()=>{
 const grid:ChartGrid={type:'Bar Graph',columns:['Label','Value'],rows:[['A','']]};
 assert.ok(chartError(grid));grid.rows[0][1]='NaN';assert.ok(chartError(grid));
 grid.rows[0][1]='-5';assert.equal(chartError(grid),'');grid.type='Pie Chart';assert.ok(chartError(grid));
 grid.rows[0][1]='0';assert.ok(chartError(grid));grid.rows[0][1]='5';assert.equal(chartError(grid),'');
 grid.columns.push('Second');grid.rows[0].push('3');assert.ok(chartError(grid));
});
