'use strict';
try{
 const stored=sessionStorage.getItem('nexus-current-run');const rawHistory=sessionStorage.getItem('nexus-history-rows');
 if(rawHistory){historyRows=JSON.parse(rawHistory);sessionStorage.removeItem('nexus-history-rows');}
 if(stored){
  const run=JSON.parse(stored);sessionStorage.removeItem('nexus-current-run');
  if(run.mode==='MANUAL CURRENT VIX/VVIX + MASSIVE SPY'&&run.inputs&&Garlic.evaluate(run.inputs).valid){
   keys.forEach(k=>$(k).value=run.inputs[k]);$('missing').checked=false;update(true);
   current={...current,data_mode:run.mode,observedAt:run.observedAt,priceAsOf:run.priceAsOf,priceSymbol:'SPY',priceStatus:run.priceStatus,historical_context:run.historical_context,closingPercentiles:run.closingPercentiles};
   $('status').textContent='MANUAL VOL + MASSIVE SPY';$('input-note').textContent=`VIX/VVIX reported ${run.observedAt}; Massive SPY daily bar ${run.priceAsOf} (${run.priceStatus}). ${run.note}`;
   $('history-asof').value=run.observedAt.slice(0,10);refreshHistory();
  }
 }
}catch{historyStatus.textContent='Private results could not be loaded. Return to Market inputs and run again.';}
