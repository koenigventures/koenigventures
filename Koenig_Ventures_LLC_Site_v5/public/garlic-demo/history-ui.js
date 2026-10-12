'use strict';
let historyRows=null;
const historyStatus=document.getElementById('history-status');
function refreshHistory(){
 try{
  if(!historyRows){historyStatus.textContent='Load your private history.csv to connect historical context.';return;}
  const asOf=document.getElementById('history-asof').value;
  const c=GarlicHistory.context(historyRows,readInputs(),asOf);
  current.historical_context=c;
  historyStatus.textContent=`History ${c.historyStart} to ${c.historyEnd}: ${c.observations} matched dates. VIX percentile ${c.vixPercentile.toFixed(1)}%; VVIX percentile ${c.vvixPercentile.toFixed(1)}%. Ten comparable dates had mean subsequent five-session SPX return ${c.meanForward5.toFixed(2)}%. Descriptive history, not a forecast. The model's transition matrix remains assumed.`;
  const list=document.getElementById('history-analogs');list.replaceChildren();
  c.analogs.forEach(a=>{const li=document.createElement('li');li.textContent=`${a.date}: ${a.signal}; subsequent five-session SPX return ${a.forward5.toFixed(2)}%`;list.append(li);});
 }catch(e){delete current.historical_context;historyStatus.textContent=e.message;document.getElementById('history-analogs').replaceChildren();}
}
document.getElementById('history-file').addEventListener('change',async e=>{
 try{historyRows=null;delete current.historical_context;document.getElementById('history-analogs').replaceChildren();const f=e.target.files[0];if(!f){refreshHistory();return;}if(f.size>2000000)throw Error('File too large');historyRows=GarlicHistory.parseCSV(await f.text());refreshHistory();}catch(err){historyStatus.textContent=err.message;}
});
document.getElementById('history-asof').value=new Date().toISOString().slice(0,10);
document.getElementById('history-asof').addEventListener('change',refreshHistory);
document.getElementById('history-replay').addEventListener('click',()=>{
 try{if(!historyRows)throw Error('Load history first');const d=document.getElementById('history-asof').value;const prior=historyRows.filter(r=>r.date<=d);const f=GarlicHistory.features(prior,prior.length-1);keys.forEach(k=>$(k).value=f[k]);$('missing').checked=false;update(true);current.data_mode='HISTORICAL SPX REPLAY';$('status').textContent='HISTORICAL SPX REPLAY';current.observation_date=prior.at(-1).date;$('input-note').textContent=`Historical SPX replay for ${prior.at(-1).date}; geo set to zero. Not current market data.`;refreshHistory();}catch(e){historyStatus.textContent=e.message;}
});
for(const id of [...keys,'scenario','missing','reset'])$(id).addEventListener(id==='reset'?'click':id==='scenario'||id==='missing'?'change':'input',refreshHistory);
refreshHistory();
