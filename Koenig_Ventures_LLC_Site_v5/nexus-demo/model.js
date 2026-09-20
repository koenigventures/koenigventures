(function(root){
function calculate(p){
 let previous=p.revenue,pv=0;const years=[];
 for(let i=0;i<3;i++){const revenue=previous*(1+p.growth[i]/100),ebitda=revenue*p.margin[i]/100,da=revenue*p.da/100,ebit=ebitda-da,tax=Math.max(0,ebit)*p.tax/100,capex=revenue*p.capex/100,workingCapital=(revenue-previous)*p.wc/100,fcf=ebit-tax+da-capex-workingCapital,discountFactor=1/(1+p.discount/100)**(i+1);pv+=fcf*discountFactor;years.push({revenue,ebitda,fcf,margin:p.margin[i],discountFactor});previous=revenue;}
 const terminal=years[2].ebitda>0?years[2].ebitda*p.multiple:null,pvTerminal=terminal===null?null:terminal*years[2].discountFactor,ev=pvTerminal===null?null:pv+pvTerminal;
 return {years,pv,terminal,pvTerminal,ev,sales:p.revenue*p.revenueMultiple,startEbitda:p.revenue*p.startingMargin/100};
}
if(typeof module!=='undefined'&&module.exports)module.exports={calculate};else root.NexusDemo={calculate};
})(typeof window!=='undefined'?window:globalThis);
