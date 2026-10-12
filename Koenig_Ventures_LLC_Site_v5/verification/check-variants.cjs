'use strict';
const assert=require('node:assert/strict');
const Garlic=require('../public/garlic-demo/engine.js');
const V=require('../public/garlic-demo/versions.js');
const {readSpyCloses}=require('../server/massive-spy.cjs');
async function main(){
 const calm=Garlic.scenarios.calm,hidden=Garlic.scenarios.hidden;
 assert.equal(V.evaluate70(calm).state,'LOW');
 assert.equal(V.evaluate70(hidden).state,'NORMAL'); // stress-only V7.0 versus blended V7.6
 assert.equal(Garlic.evaluate(hidden).state,'ELEVATED');
 assert.deepEqual(V.evaluate70(calm).oneStep,[.70,.20,.08,.02]);
 assert.equal(V.evaluate71(calm).stress,0);
 assert.equal(V.evaluate71(Garlic.scenarios.stress).signal,'DEFENSIVE REGIME');
 for(const key of ['vix','vvix','rv','r5','r10','geo']){
  assert.equal(V.evaluate70({...calm,[key]:null}).valid,false);
  assert.equal(V.evaluate71({...calm,[key]:null}).valid,false);
 }
 let called=false;
 const bars=Array.from({length:21},(_,i)=>({c:400+i,t:Date.UTC(2026,8,1+i)}));
 const result=await readSpyCloses({from:'2026-09-01',to:'2026-09-30',key:'test-only',fetcher:async(url,options)=>{called=true;assert.equal(url.hostname,'api.massive.com');assert.equal(options.headers.Authorization,'Bearer test-only');return {ok:true,json:async()=>({status:'OK',ticker:'SPY',results:bars})};}});
 assert(called);assert.equal(result.closes.length,21);
 await assert.rejects(readSpyCloses({from:'2026-09-01',to:'2026-09-30',key:'test-only',fetcher:async()=>({ok:true,json:async()=>({status:'OK',ticker:'SPY',results:bars.slice(1)})})}),/Insufficient/);
 console.log('Variants and protected Massive adapter: checks passed.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
