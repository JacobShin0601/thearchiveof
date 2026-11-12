/** Illustrative cohort bridge, USD bn; t=0 is 2026-09-30. Not an intrinsic value. */
export type CoreWeaveInputs = {margin:number; discount:number; prepaid:number; eligible:number; utilization:number; hourly:number; renewalMargin:number; renewalYears:number; annualCapex:number; cashYield:number; cohortLife:number; cohortCount:number; shares:number; price:number};
export const cwDebt=46.873+.649, cwCash=4.122;
export const cwPresets: Record<'bear'|'base'|'bull',CoreWeaveInputs>={
 bear:{margin:10,discount:14,prepaid:5,eligible:45,utilization:50,hourly:1.5,renewalMargin:30,renewalYears:2,annualCapex:10,cashYield:30,cohortLife:4,cohortCount:6,shares:559,price:60.77},
 base:{margin:20,discount:12,prepaid:5,eligible:65,utilization:70,hourly:2.5,renewalMargin:40,renewalYears:3,annualCapex:20,cashYield:38,cohortLife:5,cohortCount:6,shares:559,price:60.77},
 bull:{margin:30,discount:10,prepaid:5,eligible:80,utilization:85,hourly:4,renewalMargin:50,renewalYears:4,annualCapex:30,cashYield:46,cohortLife:6,cohortCount:6,shares:559,price:60.77},
};
export function coreweaveValue(i:CoreWeaveInputs){
 const r=i.discount/100, df=(t:number)=>1/(1+r)**t;
 const weights=[.18,.18,.19,.19,.065,.065,.065,.065];
 const pvRevenue=132.5*weights.reduce((s,w,n)=>s+w*df(n+1),0);
 const pvPrepaid=i.prepaid*(df(1)+df(2))/2;
 const backlog=pvRevenue*i.margin/100-pvPrepaid;
 // 130k is a conservative lower bound; 170k is approximate. Unknown overlap
 // with already-booked backlog is represented by the editable eligible fraction.
 // First revenue is t=2/t=3, not a claim about actual expiry dates.
 const renewals=[{gpus:130000,start:2},{gpus:170000,start:3}];
 const renewal=renewals.reduce((s,c)=>s+Array.from({length:i.renewalYears},(_,j)=>c.gpus*(i.eligible/100)*8760*(i.utilization/100)*i.hourly*(i.renewalMargin/100)/1e9*df(c.start+j)).reduce((a,b)=>a+b,0),0);
 // New investments are explicitly incremental to the Q3 backlog and must not
 // duplicate those renewal GPUs. Annual cash yield is after operating costs,
 // taxes, maintenance capex, before financing; no end-of-life value included.
 const newInvestment=Array.from({length:i.cohortCount},(_,j)=>{const t=j+2;return -i.annualCapex*df(t)+Array.from({length:i.cohortLife},(_,k)=>i.annualCapex*(i.cashYield/100)*df(t+k+1)).reduce((a,b)=>a+b,0)}).reduce((a,b)=>a+b,0);
 const netDebt=cwDebt-cwCash, partialEquity=backlog+renewal+newInvestment-netDebt;
 const partialPerShare=Math.max(0,partialEquity)*1000/i.shares;
 const marketEquity=i.price*i.shares/1000;
 const requiredResidual=marketEquity+netDebt-backlog-renewal-newInvestment;
 return {pvRevenue,pvPrepaid,backlog,renewal,newInvestment,netDebt,partialEquity,partialPerShare,marketEquity,requiredResidual};
}
