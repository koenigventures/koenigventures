import {authenticate,fail,readState,blankState,changeState,saveClose,saveSnapshot,importHistory,historyRows,validDate,validateVol} from './data.mjs';
import {readSPY} from './market.mjs';
import '../public/garlic-demo/engine.js';
import '../public/garlic-demo/versions.js';
import '../public/garlic-demo/history.js';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createHandler({getStore,env=process.env,market=readSPY,now=()=>new Date()}={}){
 return async function(req){
  try{
   authenticate(req,env.NEXUS_ACCESS_CODE);
   if(!['GET','POST'].includes(req.method))fail('Method not allowed.',405);
   if(!env.NEXUS_DATA_STORE||!/^nexus-market-(production|preview)$/.test(env.NEXUS_DATA_STORE))fail('Set the server data store for this deploy context.',503);
   const store=getStore({name:env.NEXUS_DATA_STORE,consistency:'strong'});
   if(req.method==='GET'){const s=(await readState(store))?.data||blankState();return json(s);}
   if(req.headers.get('content-type')?.split(';')[0]!=='application/json')fail('Send JSON.',415);
   const raw=await req.text();if(raw.length>1000000)fail('Request too large.',413);let b;try{b=JSON.parse(raw);}catch{fail('Invalid JSON.');}
   if(b.action==='close')return json(await changeState(store,s=>saveClose(s,b,now())));
   if(b.action==='snapshot')return json(await changeState(store,s=>saveSnapshot(s,b,now())));
   if(b.action==='import')return json(await changeState(store,s=>importHistory(s,b.rows,now())));
   if(b.action==='attach-price'){
    if(!validDate(b.date))fail('Invalid date.');const found=(await readState(store))?.data?.closes.find(r=>r.date===b.date);if(!found)fail('Save the closing VIX/VVIX pair first.');
    const m=await market({from:b.date,to:b.date,key:env.MASSIVE_API_KEY});const price=m.bars.find(r=>r.date===b.date);if(!price)fail('No SPY close returned for that date.',422);
    return json(await changeState(store,s=>{const r=s.closes.find(x=>x.date===b.date);if(!r||r.revision!==found.revision)fail('Record changed. Reload and retry.',409);const before=structuredClone(r);r.prices.SPY=price.spx;r.priceSource='Massive';r.revision++;s.audit.push({action:'attach-SPY',date:r.date,at:now().toISOString(),before,after:structuredClone(r)});return r;}));
   }
   if(b.action==='run'){
    validateVol(b);const observed=Date.parse(b.observedAt),n=now();if(!Number.isFinite(observed)||observed>n.getTime()+60000||n.getTime()-observed>4*86400000)fail('Current reading is missing, future-dated, or older than four days.');
    const to=n.toISOString().slice(0,10),from=new Date(n.getTime()-100*86400000).toISOString().slice(0,10);
    const m=await market({from,to,key:env.MASSIVE_API_KEY});if(m.bars.length<21)fail('Need at least 21 SPY daily bars.',422);
    if(n.getTime()-Date.parse(m.bars.at(-1).date)>4*86400000)fail('SPY history is stale.',422);
    const inputs=globalThis.GarlicHistory.features(m.bars.map(r=>({...r,vix:b.vix,vvix:b.vvix})),m.bars.length-1);inputs.geo=b.geo??0;
    const results=globalThis.Garlic.evaluate(inputs);if(!results.valid)fail('Invalid model inputs.');
    const s=(await readState(store))?.data||blankState(),asOf=new Date(observed).toISOString().slice(0,10);
    let context=null,historyNote='';try{context=globalThis.GarlicHistory.context(historyRows(s),inputs,asOf);}catch{historyNote='Not enough matched SPX history. Import the supplied history CSV.';}
    const closes=s.closes.filter(r=>r.date<asOf);const percentiles=closes.length?{observations:closes.length,vix:100*closes.filter(r=>r.vix<=b.vix).length/closes.length,vvix:100*closes.filter(r=>r.vvix<=b.vvix).length/closes.length}:null;
    return json({mode:'MANUAL CURRENT VIX/VVIX + MASSIVE SPY',observedAt:new Date(observed).toISOString(),priceAsOf:m.bars.at(-1).date,priceSymbol:'SPY',priceStatus:m.providerStatus,fetchedAt:m.fetchedAt,inputs,models:{v76:results,v70:globalThis.GarlicVersions.evaluate70(inputs),v71:globalThis.GarlicVersions.evaluate71(inputs)},historical_context:context,closingPercentiles:percentiles,historyNote,note:'SPY daily bar may be delayed or unfinished during market hours. Current VIX/VVIX and price observations may have different times. SPX analogs remain separate from SPY inputs. Assumed transition matrix is unchanged.'});
   }
   fail('Unknown action.');
  }catch(e){return json({error:e.status?e.message:'Server operation failed. No success is claimed. Try again or contact Ann.'},e.status||500);}
 };
}
