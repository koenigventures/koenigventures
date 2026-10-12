/* Educational, synthetic adaptations of the supplied September 30 V7.0 and V7.1 scripts.
   No positions, credentials, market requests, or executable orders. */
(function(root){
'use strict';
function evaluate70(x){
 const gate=root.Garlic.evaluate(x);
 if(!gate.valid)return {valid:false,errors:gate.errors};
 const state=gate.stress<=2?'LOW':gate.stress<=5?'NORMAL':gate.stress<=8?'ELEVATED':'CRISIS';
 const idx=root.Garlic.states.indexOf(state),oneStep=root.Garlic.matrix[idx];
 const band=gate.base<=25?'LIGHTLY HEDGED':gate.base<=50?'MODERATELY HEDGED':gate.base<=75?'DEFENSIVELY HEDGED':'MAX DEFENSE';
 return {valid:true,version:'V7.0',signal:gate.signal,stress:gate.stress,state,oneStep,score:gate.base,band,
  explanation:`Stress ${gate.stress}/10 maps to ${state.toLowerCase()} under V7.0. Its one-step probabilities are assumptions, not forecasts. The ${gate.base}/100 score precedes later V7.6 transition, surface and geo adjustments.`};
}
function evaluate71(x){
 const gate=root.Garlic.evaluate(x);
 if(!gate.valid)return {valid:false,errors:gate.errors};
 // V7.1's source uses strict > thresholds and percentage returns as fractions.
 const stress=Number(x.vix>25)+Number(x.vvix>110)+Number(x.r5<0);
 const risk=stress<=1?'LOW':stress===2?'MODERATE':'HIGH';
 const vol=x.vix<20?'LOW VOL':x.vix<30?'NORMAL VOL':'ELEVATED VOL';
 let signal,score,comment;
 if(gate.trend==='UPTREND'&&vol==='NORMAL VOL'&&stress<=2){signal='MIXED REGIME';score=15;comment='Source branch: uptrend with normal volatility and stress at most 2.';}
 else if(gate.trend==='DOWNTREND'||stress>=3){signal='DEFENSIVE REGIME';score=35;comment='Source branch: downtrend or all three stress flags.';}
 else {signal='MIXED REGIME';score=15;comment='Source default branch: wait for confirmation.';}
 return {valid:true,version:'V7.1 overlay',signal,stress,risk,vol,score,
  explanation:`${comment} Stress ${stress}/3: VIX >25, VVIX >110, and negative five-session return each add one. Source position overlay requires a verified holding; none is used here.`};
}
const api={evaluate70,evaluate71};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.GarlicVersions=api;
})(typeof globalThis!=='undefined'?globalThis:this);
