const assert=require('node:assert/strict');
const G=require('../site-additions/garlic-demo/engine.js');
for(const row of G.matrix){assert(Math.abs(row.reduce((a,b)=>a+b)-1)<1e-12);assert(row.every(x=>x>=0&&x<=1));}
for(const state of G.states){assert.deepEqual(G.probabilities(state,1),G.matrix[G.states.indexOf(state)]);for(const steps of [0,1,5,50]){const p=G.probabilities(state,steps);assert(Math.abs(p.reduce((a,b)=>a+b)-1)<1e-12);assert(p.every(x=>x>=0&&x<=1));}}
assert.equal(G.evaluate(G.scenarios.calm).signal,'CALM RISK-ON');
assert.equal(G.evaluate(G.scenarios.hidden).signal,'HIDDEN INSTABILITY');
assert.equal(G.evaluate(G.scenarios.stress).signal,'DISORDERLY DE-RISKING');
assert.equal(G.evaluate(G.scenarios.stress).stress,10);
assert.equal(G.evaluate(G.scenarios.stress).intensity,100);
assert.equal(G.evaluate(G.scenarios.missing).valid,false);
for(const key of ['vix','vvix','rv','r5','r10','geo'])for(const value of [null,undefined,NaN,Infinity,'14']){const r=G.evaluate({...G.scenarios.calm,[key]:value});assert.equal(r.valid,false);assert.equal(r.intensity,undefined);assert.equal(r.probs,undefined);}
assert.equal(G.evaluate({...G.scenarios.calm,geo:21}).valid,false);
for(const s of Object.values(G.scenarios)){const r=G.evaluate(s);assert.deepEqual(r,G.evaluate(s));if(r.valid)assert(r.intensity>=0&&r.intensity<=100);}
// Check score threshold semantics inherited from V7.6.
assert.equal(G.evaluate({...G.scenarios.calm,r5:-3}).contributions[2][1],1);
assert.equal(G.evaluate({...G.scenarios.calm,r5:-3.01}).contributions[2][1],2);
console.log('PASS: matrix normalization, exact propagation, preset regimes, stress cap, deterministic output, missing/invalid input suppression, return boundaries.');
