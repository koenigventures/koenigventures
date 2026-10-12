'use strict';
// Protected-server adapter. Do not import this into the browser or publish its response.
const ENDPOINT='https://api.massive.com';
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));}
async function readSpyCloses({from,to,key=process.env.MASSIVE_API_KEY,fetcher=globalThis.fetch}={}){
 if(!key)throw Error('MASSIVE_API_KEY is unavailable on the server');
 if(!validDate(from)||!validDate(to)||from>to)throw Error('Invalid date range');
 if((Date.parse(to)-Date.parse(from))/86400000>120)throw Error('Date range exceeds 120 days');
 const url=new URL(`/v2/aggs/ticker/SPY/range/1/day/${from}/${to}`,ENDPOINT);
 url.searchParams.set('adjusted','true');url.searchParams.set('sort','asc');url.searchParams.set('limit','5000');
 const response=await fetcher(url,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error(`Massive SPY request failed (HTTP ${response.status})`);
 const body=await response.json();
 if(body.status!=='OK'||!Array.isArray(body.results)||body.ticker!=='SPY'||body.next_url)throw Error('Incomplete or unexpected SPY response');
 const bars=body.results.map(b=>({close:b.c,timestamp:b.t}));
 if(bars.length<21||bars.some((b,i)=>!Number.isFinite(b.close)||b.close<=0||!Number.isFinite(b.timestamp)||(i&&b.timestamp<=bars[i-1].timestamp)))throw Error('Insufficient or invalid SPY history');
 return {provider:'Massive',symbol:'SPY',adjusted:true,asOf:new Date(bars.at(-1).timestamp).toISOString(),closes:bars.map(b=>b.close),timestamps:bars.map(b=>b.timestamp),entitlement:'Verify account and display rights separately'};
}
module.exports={readSpyCloses};
