'use strict';
const $=id=>document.getElementById(id),keys=['vix','vvix','rv','r5','r10','geo'];
let current;
function readInputs(){return Object.fromEntries(keys.map(k=>[k,(k==='vvix'&&$('missing').checked)||$(k).value.trim()===''?null:Number($(k).value)]));}
function update(custom=false){
 $('vvix').disabled=$('missing').checked;
 const inputs=readInputs(),r=Garlic.evaluate(inputs);current={version:'Garlic demo 0.2',data_mode:'SYNTHETIC / USER-ENTERED',scenario:Garlic.scenarios[$('scenario').value].name,inputs,results:r,assumed_transition_matrix:Garlic.matrix,states:Garlic.states,model_steps:5,calendar_horizon:'Not calibrated',disclaimer:$('disclaimer-text').textContent};
 $('input-note').textContent=custom?'Custom inputs based on the selected scenario.':'Preset synthetic scenario. No live market data.';
 $('status').textContent=r.valid?'SYNTHETIC SCENARIO':'OUTPUT WITHHELD';$('status').className='badge'+(r.valid?'':' blocked');
 $('result-title').textContent=r.valid?r.signal.toLowerCase().replace(/^./,s=>s.toUpperCase()):'Required inputs unavailable';
 $('summary').textContent=r.valid?`${r.trend.toLowerCase()} · ${r.direction.toLowerCase()} · ${r.risk.toLowerCase()} market-only stress classification. Geo overlay: ${r.geoRegime.toLowerCase()}. Inspect the assumptions and score contributions below.`:`Missing or invalid: ${r.errors.join(', ')}. Supply valid values to resume. No regime, hedge score or probabilities are generated.`;
 for(const id of ['state','stress','vrp','intensity'])$(id).textContent=r.valid?({state:r.state,stress:String(r.stress),vrp:r.vrp.toFixed(1)+' pp',intensity:r.intensity+' / 100'})[id]:'—';
 $('intensity-bar').style.width=(r.valid?r.intensity:0)+'%';
 $('review').textContent=!r.valid?'Human review: restore and verify the missing inputs before evaluating any hedge.':r.intensity>=75?'Research discussion: examine downside exposure, protection costs and liquidity under stress. A human must assess suitability, sizing and trade-offs.':r.intensity>=40?'Research discussion: examine whether existing protection remains aligned with the scenario and its assumptions. The model has no knowledge of your portfolio.':'Research discussion: compare the cost of protection with residual tail exposure. A low model score is not an assurance of safety.';
 $('action').textContent=r.valid?r.action:'Insufficient data — no strategy generated.';
 $('reason').textContent=r.valid?r.reason:'Restore required inputs before evaluating a strategy.';
 $('strategy').textContent=r.valid?r.strategy:'Withheld.';
 $('geo-context').textContent=r.valid?`Market classification excludes geopolitical stress. Manual geo score ${inputs.geo}/20: ${r.geoRegime.toLowerCase()}, adding ${r.geoAdd} points. Final strategy uses ${r.intensity}/100 after all adjustments; this is not hedge coverage or capital allocation.`:'No market or geopolitical strategy is produced from incomplete data.';
 $('trace').replaceChildren();
 if(r.valid)for(const [label,value] of [['Base rules',r.base],['After transition adjustment',r.afterTransition],['After risk-surface adjustment',r.surface],['Geo adjustment','+'+r.geoAdd],['Final, capped at 100',r.intensity]]){const li=document.createElement('li'),b=document.createElement('b');li.append(label);b.textContent=value;li.append(b);$('trace').append(li);}
 $('probabilities').replaceChildren();
 if(r.valid)r.probs.forEach((p,i)=>{const row=document.createElement('div');row.className='prob';const label=document.createElement('span');label.textContent=Garlic.states[i];const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('i');fill.style.width=(p*100)+'%';bar.append(fill);const val=document.createElement('strong');val.textContent=(p*100).toFixed(1)+'%';row.append(label,bar,val);$('probabilities').append(row);});
 else $('probabilities').textContent='Withheld until required inputs are valid.';
 $('evidence').textContent=r.valid?'Stress contributions: '+r.contributions.map(([k,v])=>`${k} ${v}`).join(' + ')+` = ${r.stress}. Geo score ${inputs.geo} is a separate manual overlay. Results are repeatable for the same inputs.`:'The validation gate has stopped the calculation. This demonstrates how unavailable data remains visible instead of becoming a false signal.';
}
function load(){const s=Garlic.scenarios[$('scenario').value];keys.forEach(k=>$(k).value=s[k]===null?'':s[k]);$('missing').checked=s.vvix===null;update();}
$('scenario').addEventListener('change',load);$('reset').addEventListener('click',load);keys.forEach(k=>$(k).addEventListener('input',()=>update(true)));$('missing').addEventListener('change',()=>update(true));
$('export').addEventListener('click',()=>{const b=new Blob([JSON.stringify(current,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='garlic-synthetic-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});load();
