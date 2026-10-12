const assert=require('node:assert/strict');
const G=require('../public/garlic-demo/engine.js');
const fixtures=require('./source-rule-fixtures.json');
for(const f of fixtures){const r=G.evaluate(f.inputs);assert(r.valid);for(const k of ['signal','action','volState','direction'])assert.equal(r[k],f[k]);assert.equal(r.strategy,f.strategies[String(r.intensity)]);}
const calm=G.evaluate(G.scenarios.calm);assert.equal(calm.geoAdd,0);assert.equal(calm.intensity,10);
const overlaid=G.evaluate({...G.scenarios.calm,geo:20});assert.equal(overlaid.signal,calm.signal);assert.equal(overlaid.geoAdd,30);assert.equal(overlaid.intensity,40);assert.match(overlaid.strategy,/Core hedges/);
for(const [geo,add] of [[3,0],[4,5],[7,5],[8,15],[12,15],[13,30],[20,30]])assert.equal(G.evaluate({...G.scenarios.calm,geo}).geoAdd,add);
assert.equal(G.evaluate(G.scenarios.missing).strategy,undefined);
console.log('PASS: strategy and signal parity with original V7.6 functions; geo separation and boundaries; missing-data suppression.');
