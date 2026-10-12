import {fail} from './data.mjs';
export async function readSPY({from,to,key=process.env.MASSIVE_API_KEY,fetcher=fetch}={}){
 if(!key)fail('Massive is not configured on the server.',503);
 const url=new URL(`https://api.massive.com/v2/aggs/ticker/SPY/range/1/day/${from}/${to}`);url.searchParams.set('adjusted','true');url.searchParams.set('sort','asc');url.searchParams.set('limit','5000');
 const res=await fetcher(url,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)});
 if(!res.ok)fail(`Massive request failed (HTTP ${res.status}).`,502);
 const b=await res.json();if(!['OK','DELAYED'].includes(b.status)||b.ticker!=='SPY'||!Array.isArray(b.results)||b.next_url)fail('Massive returned incomplete data.',502);
 const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
 const bars=b.results.map(r=>({date:dateFormat.format(new Date(r.t)),spx:r.c,timestamp:r.t}));
 if(bars.some((r,i)=>!Number.isFinite(r.spx)||r.spx<=0||!Number.isFinite(r.timestamp)||i&&r.date<=bars[i-1].date))fail('Massive returned invalid price history.',502);
 return {bars,providerStatus:b.status,fetchedAt:new Date().toISOString()};
}
