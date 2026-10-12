import assert from 'node:assert/strict';
import fs from 'node:fs';
import {blankState,saveClose,saveSnapshot,importHistory,changeState} from '../server/data.mjs';
import {createHandler} from '../server/api.mjs';
const now=new Date('2026-10-12T22:00:00Z'),s=blankState();
saveSnapshot(s,{vix:15.14,vvix:86.66,observedAt:'2026-10-12T16:16:07Z'},now);
assert.equal(s.closes.length,0);assert.equal(s.snapshots.length,1);
const c={date:'2026-10-09',vix:15.5,vvix:87};saveClose(s,c,now);
assert.throws(()=>saveClose(s,c,now),/already exists/);
assert.throws(()=>saveClose(s,{...c,correct:true,expectedRevision:2,reason:'fix'},now),/Reload/);
saveClose(s,{...c,vix:16,correct:true,expectedRevision:1,reason:'Correct transcription'},now);
assert.equal(s.closes[0].revision,2);assert.equal(s.audit[1].before.vix,15.5);
assert.throws(()=>saveClose(s,{...c,date:'2026-10-12'},new Date('2026-10-12T16:00:00Z')),/after 5/);
assert.throws(()=>saveClose(s,{...c,date:'2026-02-30'},now),/valid closing date/);
assert.throws(()=>saveClose(s,{...c,date:'2026-10-10'},now),/weekday/);
const csv=fs.readFileSync('../PRIVATE_DO_NOT_UPLOAD/history.csv','utf8');
const rows=globalThis.GarlicHistory.parseCSV(csv),empty=blankState();importHistory(empty,rows,now);assert.equal(empty.closes.length,506);
assert.throws(()=>importHistory(empty,rows,now),/overlaps/);
class MemoryStore{
 state=null;etag=0;
 async getWithMetadata(){return this.state?{data:structuredClone(this.state),etag:String(this.etag)}:null;}
 async setJSON(k,v,o){if(o.onlyIfNew&&this.state||o.onlyIfMatch&&o.onlyIfMatch!==String(this.etag))return {modified:false};this.state=structuredClone(v);return {modified:true,etag:String(++this.etag)};}
}
const store=new MemoryStore();await changeState(store,s=>importHistory(s,rows,now));
const collision=new MemoryStore();collision.getWithMetadata=async()=>({data:blankState(),etag:'stale'});await assert.rejects(changeState(collision,s=>saveSnapshot(s,{vix:15,vvix:90,observedAt:now.toISOString()},now)),/Another save/);
let networkCalls=0;
const market=async()=>{networkCalls++;return {bars:Array.from({length:30},(_,i)=>({date:new Date(Date.parse('2026-09-13')+i*86400000).toISOString().slice(0,10),spx:600+i})),providerStatus:'OK',fetchedAt:now.toISOString()};};
const full=JSON.parse(fs.readFileSync('../PRIVATE_DO_NOT_UPLOAD/full-closing-history.json','utf8'));const fullState=blankState();importHistory(fullState,full,now);assert.equal(fullState.closes.length,1255);assert.equal(fullState.closes.filter(r=>r.prices.SPX).length,506);
const secret='test-access-code-at-least-24-characters';const handler=createHandler({getStore:()=>store,env:{NEXUS_ACCESS_CODE:secret,NEXUS_DATA_STORE:'nexus-market-production',MASSIVE_API_KEY:'mock'},market,now:()=>now});
const request=(data,auth=true)=>new Request('https://example.com/.netlify/functions/nexus-data',{method:data?'POST':'GET',headers:{...(auth?{Authorization:'Bearer '+secret}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
assert.equal((await handler(request({action:'run',vix:15,vvix:90},false))).status,401);assert.equal(networkCalls,0);
const snapshot={action:'snapshot',vix:15.14,vvix:86.66,observedAt:'2026-10-12T16:16:07Z'};
assert.equal((await handler(request(snapshot))).status,200);assert.equal(store.state.closes.length,506);
const result=await handler(request({...snapshot,action:'run',geo:0}));assert.equal(result.status,200);const output=await result.json();assert(output.models.v76.valid&&output.models.v70.valid&&output.models.v71.valid);assert.equal(output.priceSymbol,'SPY');assert.equal(output.historical_context.observations,506);assert.equal(output.closingPercentiles.observations,506);
assert.equal((await handler(request({...snapshot,action:'run',observedAt:'2026-09-01T12:00:00Z'}))).status,400);
assert.equal((await handler(request({action:'import',rows}))).status,409);
assert.equal((await handler(request({action:'close',...c}))).status,200);
const before=store.state.closes.length;assert.equal((await handler(request({action:'attach-price',date:c.date}))).status,200);assert.equal(store.state.closes.length,before);assert.equal(store.state.closes.find(r=>r.date===c.date).prices.SPY,626);
const failing=createHandler({getStore:()=>store,env:{NEXUS_ACCESS_CODE:secret,NEXUS_DATA_STORE:'nexus-market-production'},market:async()=>{throw Error('secret-leak-must-not-appear');},now:()=>now});const error=await failing(request({...snapshot,action:'run'}));assert.equal(error.status,500);assert(!(await error.text()).includes('secret-leak'));
console.log('PASS: separate snapshots and closes, persistence, duplicate rejection, correction audit, revision conflicts, atomic conflicts, date/close gates, import integrity, private access, all three models, historical context, Massive price attachment and redacted errors.');
