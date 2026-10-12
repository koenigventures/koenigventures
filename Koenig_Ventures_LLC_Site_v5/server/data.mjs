import {timingSafeEqual,randomUUID} from 'node:crypto';
export function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
export function authenticate(req,secret){
 if(!secret||secret.length<24)fail('Private access is not configured on the server.',503);
 const actual=req.headers.get('authorization')||'',expected='Bearer '+secret;
 const a=Buffer.from(actual),b=Buffer.from(expected);
 if(a.length!==b.length||!timingSafeEqual(a,b))fail('Enter the private access code.',401);
}
export function validDate(d){return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;}
export function validateVol(x){
 if(typeof x.vix!=='number'||!Number.isFinite(x.vix)||x.vix<1||x.vix>150||typeof x.vvix!=='number'||!Number.isFinite(x.vvix)||x.vvix<1||x.vvix>300)fail('Supply valid VIX (1–150) and VVIX (1–300) values.');
}
export function blankState(){return {schema:1,closes:[],snapshots:[],audit:[]};}
export async function readState(store){return await store.getWithMetadata('state',{type:'json',consistency:'strong'});}
export async function changeState(store,edit){
 const found=await readState(store),state=found?structuredClone(found.data):blankState();
 const result=await edit(state);
 const saved=await store.setJSON('state',state,found?{onlyIfMatch:found.etag}:{onlyIfNew:true});
 if(!saved.modified)fail('Another save changed the database. Reload and try again.',409);
 return result;
}
export function saveClose(state,input,now=new Date()){
 validateVol(input);if(!validDate(input.date))fail('Supply a valid closing date.');
 const et=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',hourCycle:'h23'}).format(now));
 if(input.date>et||input.date===et&&hour<17)fail('A daily close can be saved after 5 p.m. New York time. Use Current reading during the session.');
 const day=new Date(input.date+'T12:00:00Z').getUTCDay();if(day===0||day===6)fail('Closing date must be a weekday.');
 const prior=state.closes.find(r=>r.date===input.date);
 if(prior&&!input.correct)fail('A close already exists for this date. Choose Correct existing close.',409);
 if(input.correct&&(!prior||input.expectedRevision!==prior.revision))fail('Reload the saved record before correcting it.',409);
 const reason=String(input.reason||'').trim();if(prior&&reason.length<3)fail('Add a correction reason.');
 const source=String(input.source||'Manual entry by Steven').slice(0,200);
 const row={date:input.date,vix:input.vix,vvix:input.vvix,source,prices:prior?.prices||{},revision:(prior?.revision||0)+1,updatedAt:now.toISOString()};
 state.closes=state.closes.filter(r=>r.date!==row.date);state.closes.push(row);state.closes.sort((a,b)=>a.date.localeCompare(b.date));
 state.audit.push({at:now.toISOString(),action:prior?'correct-close':'add-close',date:row.date,reason,before:prior?structuredClone(prior):null,after:structuredClone(row)});
 if(state.closes.length>10000||state.audit.length>20000)fail('Database limit reached. Export and contact your administrator.');return row;
}
export function saveSnapshot(state,input,now=new Date()){
 validateVol(input);const t=Date.parse(input.observedAt);if(!Number.isFinite(t)||t>now.getTime()+60000)fail('Supply an observation time that is not in the future.');
 const row={id:randomUUID(),vix:input.vix,vvix:input.vvix,observedAt:new Date(t).toISOString(),source:String(input.source||'Manual entry by Steven').slice(0,200),savedAt:now.toISOString(),kind:'current-reading'};
 if(state.snapshots.length>=10000)fail('Snapshot limit reached. Export and contact your administrator.');state.snapshots.push(row);return row;
}
export function importHistory(state,rows,now=new Date()){
 if(!Array.isArray(rows)||!rows.length||rows.length>5000||state.closes.length+rows.length>10000)fail('Import must contain 1–5,000 rows and keep the database below 10,000 dates.');
 const dates=new Set();for(const r of rows){validateVol(r);if(!validDate(r.date)||r.date>=now.toISOString().slice(0,10)||dates.has(r.date)||(r.spx!=null&&(typeof r.spx!=='number'||!Number.isFinite(r.spx)||r.spx<=0)))fail('Invalid, future, or duplicate historical row.');dates.add(r.date);if(state.closes.some(x=>x.date===r.date))fail('Import overlaps existing dates; no records were changed.',409);}
 for(const r of rows)state.closes.push({date:r.date,vix:r.vix,vvix:r.vvix,source:'Garlic Data.xlsx import',prices:r.spx==null?{}:{SPX:r.spx},revision:1,updatedAt:now.toISOString()});
 state.closes.sort((a,b)=>a.date.localeCompare(b.date));state.audit.push({at:now.toISOString(),action:'import-history',count:rows.length});return {imported:rows.length};
}
export function historyRows(state,symbol='SPX'){return state.closes.filter(r=>r.prices?.[symbol]>0).map(r=>({date:r.date,vix:r.vix,vvix:r.vvix,spx:r.prices[symbol]}));}
