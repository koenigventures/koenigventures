import assert from 'node:assert/strict';
import {createHandler} from '../server/api.mjs';
import {blankState} from '../server/data.mjs';
const now=new Date('2026-10-29T22:00:00Z');let state=blankState(),etag=0,calls=0;
const store={getWithMetadata:async()=>({data:structuredClone(state),etag:String(etag)}),setJSON:async(k,v,o)=>{if(o.onlyIfMatch!==String(etag))return {modified:false};state=structuredClone(v);return {modified:true,etag:String(++etag)};}};
const bars=[];for(let d=new Date('2026-09-01T12:00:00Z');d<=now;d.setUTCDate(d.getUTCDate()+1)){if(![0,6].includes(d.getUTCDay()))bars.push({date:d.toISOString().slice(0,10),spx:600+bars.length+Math.sin(bars.length)});}
const secret='local-test-access-code-24-characters';
const handler=createHandler({getStore:()=>store,env:{NEXUS_ACCESS_CODE:secret,NEXUS_DATA_STORE:'nexus-market-preview'},now:()=>now,market:async()=>{calls++;return {bars,providerStatus:'OK',fetchedAt:now.toISOString()};}});
const req=(body,auth=true)=>new Request('https://example.test/',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+secret}:{})},body:JSON.stringify(body)});
const input={action:'run',vix:15,vvix:90,geo:0,observedAt:now.toISOString()};
assert.equal((await handler(req(input,false))).status,401);assert.equal(calls,0);
const first=await handler(req(input));assert.equal(first.status,200);const a=await first.json();assert.equal(Object.keys(a.models).length,5);assert(Object.values(a.models).every(r=>r.valid));assert.equal(a.calculationVersion,'2026-10-29-v74');assert.match(a.realizedVolatilityMethod,/ddof=0/);
const b=await (await handler(req(input))).json();assert.deepEqual(a.models,b.models);
assert.equal(a.models.v74surface.intensity,a.models.v74.intensity);
assert.equal((await handler(req({...input,vix:null}))).status,400);
assert.equal((await handler(req({...input,observedAt:'2026-10-01T00:00:00Z'}))).status,400);
assert.equal((await handler(req({...input,action:'snapshot'}))).status,200);assert.equal(state.snapshots.length,1);assert.equal(state.closes.length,0);
console.log('PASS: authenticated five-model API, metadata, repeatability, input gates, snapshot separation; mocked data/storage.');
