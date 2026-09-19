export const chartTypes = ['Bar Graph', 'Line Chart', 'Pie Chart', 'Stacked Bar'] as const;
export type ChartType = typeof chartTypes[number];
export type ChartGrid = { type: ChartType; columns: string[]; rows: string[][] };
export const emptyChart = (): ChartGrid => ({type:'Bar Graph',columns:['Label','Value'],rows:[['',''],['','']]});
const clean=(s:string)=>s.replace(/\|/g,'／').replace(/[\r\n]/g,' ');
export function encodeChart(grid:ChartGrid) {
 return `<!-- aimi-chart:${grid.type} -->\n| ${grid.columns.map(clean).join(' | ')} |\n| ${grid.columns.map(()=>'---').join(' | ')} |\n${grid.rows.map(row=>`| ${row.map(clean).join(' | ')} |`).join('\n')}`;
}
export function decodeChart(visual:string):ChartGrid|null {
 const type=visual.match(/<!-- aimi-chart:(.*?) -->/)?.[1];
 if(!chartTypes.includes(type as ChartType))return null;
 const lines=visual.split('\n').filter(l=>l.trim().startsWith('|'));
 const cells=(line:string)=>line.trim().slice(1,-1).split('|').map(c=>c.trim());
 if(lines.length<3)return null;
 return {type:type as ChartType,columns:cells(lines[0]),rows:lines.slice(2).map(cells)};
}
export function chartError(grid:ChartGrid):string {
 if(grid.columns.length<2||grid.rows.length<1)return 'Add at least one label column, one value column and one data row.';
 if(grid.columns.length>6||grid.rows.length>30)return 'Use at most 30 rows and 5 numeric series.';
 if(grid.columns.some(c=>!c.trim()))return 'Name each column, including units for numeric values.';
 if(grid.rows.some(r=>r.length!==grid.columns.length||!r[0]?.trim()))return 'Give every row a label.';
 const values=grid.rows.flatMap(r=>r.slice(1));
 if(values.some(v=>!v.trim()||!Number.isFinite(Number(v))))return 'Enter a finite number in every value cell. Use plain numbers without currency symbols or commas.';
 if(values.some(v=>Math.abs(Number(v))>1e15))return 'Use values between -1,000,000,000,000,000 and 1,000,000,000,000,000; adjust the units if needed.';
 if(grid.type==='Pie Chart'&&(grid.columns.length!==2||values.some(v=>Number(v)<0)||!values.some(v=>Number(v)>0)))return 'Pie charts require one numeric series with nonnegative values and a positive total.';
 return '';
}
