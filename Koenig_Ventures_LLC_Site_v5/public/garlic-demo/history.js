(function(root){
'use strict';
function parseCSV(text){
 const lines=text.trim().split(/\r?\n/);if(lines.shift().trim()!=='date,vix,vvix,spx')throw Error('Expected date,vix,vvix,spx header');
 const rows=lines.map(line=>{const a=line.split(',');if(a.length!==4)throw Error('Expected four columns');const [date,...v]=a;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||v.some(s=>!s.trim()||!Number.isFinite(Number(s))||Number(s)<=0))throw Error('Invalid date or close');
  return {date,vix:+v[0],vvix:+v[1],spx:+v[2]};}).sort((a,b)=>a.date.localeCompare(b.date));
 if(rows.length<30||rows.some((r,i)=>i&&r.date===rows[i-1].date))throw Error('Need at least 30 unique dates');return rows;
}
function features(rows,i){
 if(i<20)throw Error('Need 21 closes');
 const returns=rows.slice(i-20,i+1).slice(1).map((r,j)=>Math.log(r.spx/rows[i-20+j].spx));
 const mean=returns.reduce((a,b)=>a+b,0)/20;
 return {vix:rows[i].vix,vvix:rows[i].vvix,rv:Math.sqrt(returns.reduce((a,b)=>a+(b-mean)**2,0)/20)*Math.sqrt(252)*100,r5:(rows[i].spx/rows[i-5].spx-1)*100,r10:(rows[i].spx/rows[i-10].spx-1)*100,geo:0};
}
function context(rows,x,asOf){
 if(!root.Garlic.evaluate(x).valid)throw Error('Current model inputs are incomplete');
 const prior=rows.filter(r=>r.date<asOf);if(prior.length<30)throw Error('Insufficient history before comparison date');
 const percentile=k=>100*prior.filter(r=>r[k]<=x[k]).length/prior.length;
 const samples=[];
 // Only analogs whose subsequent five-session outcome was known before asOf.
 for(let i=20;i+5<prior.length;i++){
  const f=features(prior,i);const distance=((f.vix-x.vix)/10)**2+((f.vvix-x.vvix)/30)**2+((f.r5-x.r5)/3)**2;
  samples.push({date:prior[i].date,distance,forward5:(prior[i+5].spx/prior[i].spx-1)*100,signal:root.Garlic.evaluate(f).signal});
 }
 const analogs=samples.sort((a,b)=>a.distance-b.distance).slice(0,10);
 return {asOf,historyStart:prior[0].date,historyEnd:prior.at(-1).date,observations:prior.length,vixPercentile:percentile('vix'),vvixPercentile:percentile('vvix'),analogs,meanForward5:analogs.reduce((a,b)=>a+b.forward5,0)/analogs.length,method:'10 nearest dates using fixed VIX, VVIX and 5-session-return scales; descriptive, overlapping observations; no calibrated forecast.'};
}
const api={parseCSV,features,context};root.GarlicHistory=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
