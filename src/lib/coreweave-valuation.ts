/** Illustrative enterprise DCF bridge, dollar figures in billions, share count in millions. */
export type CoreWeaveInputs = {margin: number; discount: number; prepaid: number; otherPv: number; shares: number; price: number};
export const cwDebt = 46.873 + .649;
export const cwCash = 4.122;
export const cwPresets: Record<'bear' | 'base' | 'bull', CoreWeaveInputs> = {
  bear: {margin: 10, discount: 12, prepaid: 5, otherPv: 35, shares: 559, price: 60.77},
  base: {margin: 20, discount: 12, prepaid: 5, otherPv: 60, shares: 559, price: 60.77},
  bull: {margin: 30, discount: 12, prepaid: 5, otherPv: 90, shares: 559, price: 60.77},
};
export function coreweaveValue(i: CoreWeaveInputs) {
  const r=i.discount/100;
  const weights=[.18,.18,.19,.19,.065,.065,.065,.065];
  const pvRevenue=132.5*weights.reduce((sum,w,n)=>sum+w/(1+r)**(n+1),0);
  const pvPrepaid=i.prepaid*((1/(1+r)+1/(1+r)**2)/2);
  const backlog=pvRevenue*i.margin/100-pvPrepaid;
  const netDebt=cwDebt-cwCash;
  const rawEquity=backlog+i.otherPv-netDebt;
  const fairPrice=Math.max(0,rawEquity)*1000/i.shares;
  const marketEquity=i.price*i.shares/1000;
  const requiredOther=marketEquity+netDebt-backlog;
  const gapPercent=(fairPrice/i.price-1)*100;
  return {pvRevenue,pvPrepaid,backlog,netDebt,rawEquity,fairPrice,marketEquity,requiredOther,gapPercent};
}
