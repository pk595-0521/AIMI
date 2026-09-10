// Versioned reviewer baselines. Not imported by applicant UI or sent to Copilot.
export function consultingBaseline(){
 const inputs=[['Operations Routing',61,3.2,34],['Customer Support',65,2.1,31],['Enterprise Sales',30,1,48],['Finance / Admin',12,1.4,39]] as const;
 const functions=inputs.map(([name,active,hours,cost])=>({name,potential:active*hours*52*cost,realized:active*hours*52*cost*.6}));
 const potential=functions.reduce((s,x)=>s+x.potential,0),realized=potential*.6;
 return {functions,potential,realized,programCost:420000,netValue:realized-420000,roi:(realized-420000)/420000,realization:.6};
}
export function dcfBaseline(){
 const growth=[.2,.18,.15,.12,.1],margin=[.18,.19,.2,.2,.21];let revenue=42;
 const years=growth.map((g,i)=>{const previous=revenue;revenue*=1+g;const ebitda=revenue*margin[i],da=revenue*.035,ebit=ebitda-da,nopat=ebit*.75,capex=revenue*.04,nwc=(revenue-previous)*.02,fcf=nopat+da-capex-nwc,pv=fcf/(1.11**(i+1));return {year:i+1,revenue,ebitda,da,ebit,nopat,capex,nwc,fcf,pv};});
 const terminal=years[4].fcf*1.03/(.11-.03),terminalPV=terminal/1.11**5,ev=years.reduce((s,y)=>s+y.pv,0)+terminalPV;
 return {unit:'USD millions',years,terminal,terminalPV,ev,equity:ev-25,netDebt:25,ltmEBITDA:42*.18,compsLow:42*.18*18,compsHigh:42*.18*23,price:180,settlement:15,growth,margin,wacc:.11,terminalGrowth:.03};
}
export function baseline(trackId:string):Record<string,number>{
 if(trackId==='consulting'){const b=consultingBaseline();return {potential:b.potential,realization:b.realization,realized:b.realized,programCost:b.programCost,netValue:b.netValue,roi:b.roi};}
 if(trackId==='investment-banking'){const b=dcfBaseline();return {ltmEBITDA:b.ltmEBITDA,wacc:b.wacc,terminalGrowth:b.terminalGrowth,netDebt:b.netDebt,ev:b.ev,equity:b.equity,compsLow:b.compsLow,compsHigh:b.compsHigh,price:b.price};}
 if(trackId==='business-operations')return {hubCProcessing:4.7,pickingGap:.6,exceptionGap:.7,hubCComplexity:.38,hubAComplexity:.21,hubCStaff:3.8,hubAStaff:8.5,cancelledSlots:.2};
 return {linkAttempts:8,linkFailures:6,linkFailureRate:.75,returningActivations:5,totalActivations:7,sessions:15,activationRate:7/15,shockRelativeDrop:.17};
}
