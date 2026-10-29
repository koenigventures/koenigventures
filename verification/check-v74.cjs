'use strict';
const assert=require('node:assert/strict');
require('../public/garlic-demo/engine.js');
const V=require('../public/garlic-demo/versions.js');
const H=require('../public/garlic-demo/history.js');
const fixtures=require('./v74-parity-fixtures.json');
for(const f of fixtures){const r=V.evaluate74Surface(f.inputs);for(const k of ['stress','signal','state','intensity','surfaceScore','surfaceLevel'])assert.equal(r[k],f[k],k+JSON.stringify(f.inputs));assert.deepEqual(r,V.evaluate74Surface(f.inputs));}
for(const k of ['vix','vvix','rv','r5','r10'])assert.equal(V.evaluate74({...fixtures[0].inputs,[k]:null}).valid,false);
const rows=Array.from({length:21},(_,i)=>({spx:100*Math.exp(i%2?0.01:0),vix:15,vvix:90}));
assert(Math.abs(H.features(rows,20).rv-0.01*Math.sqrt(252)*100)<1e-10);
console.log('PASS: 1,000 Python-source parity fixtures, deterministic V7.4, missing inputs, population realized volatility.');
