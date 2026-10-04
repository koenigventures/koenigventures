/* Garlic demonstration engine 0.2. Adapted from supplied V7.6 rules.
   Synthetic inputs only. No network, credentials, execution or trained model. */
(function(root){
'use strict';
const states=['LOW','NORMAL','ELEVATED','CRISIS'];
const matrix=[[.70,.20,.08,.02],[.15,.55,.20,.10],[.05,.25,.50,.20],[.02,.08,.30,.60]];
const scenarios={
 calm:{name:'Calm expansion',vix:14,vvix:85,rv:12,r5:1.2,r10:2.1,geo:0},
 hidden:{name:'Hidden instability',vix:18,vvix:128,rv:14,r5:.4,r10:1.1,geo:5},
 stress:{name:'Disorderly sell-off',vix:38,vvix:150,rv:28,r5:-4,r10:-7,geo:12},
 missing:{name:'Missing volatility data',vix:18,vvix:null,rv:14,r5:.4,r10:1.1,geo:5}
};
function probabilities(state,steps=5){
 let p=states.map(s=>s===state?1:0);
 for(let i=0;i<steps;i++)p=states.map((_,j)=>p.reduce((sum,x,k)=>sum+x*matrix[k][j],0));
 return p;
}
function evaluate(x){
 const ranges={vix:[1,150],vvix:[1,300],rv:[0,150],r5:[-99,100],r10:[-99,100],geo:[0,20]};
 const errors=Object.entries(ranges).filter(([k,[a,b]])=>typeof x[k]!=='number'||!Number.isFinite(x[k])||x[k]<a||x[k]>b).map(([k])=>k.toUpperCase());
 if(errors.length)return {valid:false,errors};
 const trend=x.r5>0&&x.r10>0?'UPTREND':x.r5<0&&x.r10<0?'DOWNTREND':'MIXED';
 const direction=x.r5>1?'IMPROVING':x.r5< -1?'DETERIORATING':'STABLE';
 const contributions=[['VIX',x.vix>=35?3:x.vix>=25?2:x.vix>=18?1:0],['VVIX',x.vvix>=140?3:x.vvix>=120?2:x.vvix>=100?1:0],['5-session return',x.r5< -3?2:x.r5< -1?1:0],['10-session return',x.r10< -5?2:x.r10< -2?1:0]];
 const stress=contributions.reduce((s,a)=>s+a[1],0),vrp=x.vix-x.rv;
 const risk=stress<=2?'LOW':stress<=5?'MODERATE':stress<=8?'HIGH':'EXTREME';
 let state=x.vix>=35||x.vvix>=140?'CRISIS':x.vix>=25||x.vvix>=120||(trend==='DOWNTREND'&&x.vix>=20)?'ELEVATED':x.vix>=18||x.vvix>=100?'NORMAL':stress<=2?'LOW':stress<=5?'NORMAL':stress<=8?'ELEVATED':'CRISIS';
 const signal=trend==='DOWNTREND'&&x.vix>=25&&x.vvix>=140?'DISORDERLY DE-RISKING':trend==='DOWNTREND'&&x.vix>=25?'ORDERLY DE-RISKING':x.vix<20&&x.vvix>=120?'HIDDEN INSTABILITY':vrp>8&&x.vvix<120?'VOL RICH / STABLE':trend==='UPTREND'&&x.vix<20&&x.vvix<100?'CALM RISK-ON':'MIXED REGIME';
 let base={LOW:25,MODERATE:50,HIGH:75,EXTREME:100}[risk];
 if(signal==='DISORDERLY DE-RISKING')base=Math.min(base+15,100);
 else if(signal==='CALM RISK-ON')base=Math.max(base-15,10);
 if(direction==='IMPROVING')base=Math.max(base-10,10);
 else if(direction==='DETERIORATING')base=Math.min(base+10,100);
 const probs=probabilities(state),crisis=probs[3];
 const afterTransition=Math.min(100,base+(crisis>=.20?20:crisis>=.15?10:crisis>=.10?5:0));
 const surfaceScore=stress*2+(vrp>=10?6:vrp>=7?4:vrp>=4?2:vrp>=2?1:0)+(crisis>=.25?8:crisis>=.20?6:crisis>=.15?4:crisis>=.10?2:0);
 const surface=surfaceScore<=8?Math.max(afterTransition-10,10):surfaceScore<=14?Math.max(afterTransition,25):surfaceScore<=20?Math.max(afterTransition,50):Math.max(afterTransition,75);
 const geoAdd=x.geo<=3?0:x.geo<=7?5:x.geo<=12?15:30;
 const intensity=Math.min(100,surface+geoAdd);
 const geoRegime=x.geo<=3?'LOW GEO RISK':x.geo<=7?'ELEVATED GEO RISK':x.geo<=12?'HIGH GEO RISK':'CRISIS GEO REGIME';
 const volState=x.vix>=25&&x.vvix>=140?'DISORDERLY VOL':x.vix>=25?'ORDERLY ELEVATED VOL':x.vix<20&&x.vvix>=120?'HIDDEN INSTABILITY':'NORMAL STRUCTURE';
 const action={
  'DISORDERLY DE-RISKING':'Increase convex hedges.',
  'ORDERLY DE-RISKING':'Maintain structured hedges.',
  'HIDDEN INSTABILITY':'Layer cheap protection.',
  'VOL RICH / STABLE':'Premium selling may be attractive.',
  'CALM RISK-ON':'Avoid over-hedging.',
  'MIXED REGIME':'Stay balanced and wait for confirmation.'
 }[signal];
 let strategy=intensity<=25?'Light hedging: small put spreads or collars':intensity<=50?'Core hedges: maintain SPX put spreads':intensity<=75?'Defensive: increase size of put spreads or tighten strikes':'Maximum defense: add convex hedges (outright puts / ratio spreads)';
 if(volState==='DISORDERLY VOL')strategy+=' | Favor convex protection (gamma)';
 else if(volState==='ORDERLY ELEVATED VOL')strategy+=' | Prefer structured spreads over outright premium';
 else if(volState==='HIDDEN INSTABILITY')strategy+=' | Add cheap tail hedges';
 if(direction==='IMPROVING')strategy+=' | Avoid over-hedging into strength';
 else if(direction==='DETERIORATING')strategy+=' | Increase urgency of protection';
 const reason=signal==='DISORDERLY DE-RISKING'?'Both returns are negative, VIX ≥25 and VVIX ≥140.':signal==='ORDERLY DE-RISKING'?'Both returns are negative, VIX ≥25 and VVIX <140.':signal==='HIDDEN INSTABILITY'?'VIX <20 while VVIX ≥120.':signal==='VOL RICH / STABLE'?'VIX minus realized volatility >8 points while VVIX <120. This does not establish option mispricing.':signal==='CALM RISK-ON'?'Both returns are positive, VIX <20 and VVIX <100.':'No earlier signal rule matched; wait for confirmation.';
 return {valid:true,action,strategy,reason,geoRegime,volState,trend,direction,contributions,stress,vrp,risk,state,signal,base,afterTransition,surfaceScore,surface,geoAdd,intensity,probs};
}
const api={states,matrix,scenarios,probabilities,evaluate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.Garlic=api;
})(typeof globalThis!=='undefined'?globalThis:this);
