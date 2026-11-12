"""Unlevered illustrative GPU asset economics; USD. Not company estimates."""
from dataclasses import dataclass
@dataclass(frozen=True)
class Inputs:
    gpu_cost: float=30000
    infrastructure_cost: float=12000
    hourly_rent: float=3.0
    availability: float=.98
    utilization: float=.7
    cash_opex: float=6500
    maintenance: float=1000
    tax_rate: float=.0
    discount_rate: float=.12
    years: int=6
    contract_years: int=3
    post_contract_price_ratio: float=.55
    renewal_probability: float=.7
    annual_price_decline: float=.12
    salvage: float=3000
    contract_type: str='on_demand'

def cashflows(i: Inputs):
    if i.contract_type not in ('on_demand','take_or_pay'): raise ValueError('contract type')
    flows=[-(i.gpu_cost+i.infrastructure_cost)]
    for t in range(1,i.years+1):
        demand = i.availability if i.contract_type=='take_or_pay' and t<=i.contract_years else i.utilization
        renewal = 1 if t<=i.contract_years else i.renewal_probability
        price = i.hourly_rent if t<=i.contract_years else i.hourly_rent*i.post_contract_price_ratio*(1-i.annual_price_decline)**(t-i.contract_years-1)
        revenue=8760*demand*renewal*price
        operating=revenue-i.cash_opex-i.maintenance
        tax=max(operating,0)*i.tax_rate # illustrative cash tax, not GAAP tax expense
        flows.append(operating-tax+(i.salvage if t==i.years else 0))
    return flows

def npv(flows,rate):
    if rate<=-1: raise ValueError('discount rate')
    return sum(cf/(1+rate)**t for t,cf in enumerate(flows))

def payback(flows):
    cumulative=flows[0]
    for t,cf in enumerate(flows[1:],1):
        prior=cumulative;cumulative+=cf
        if cumulative>=0 and cf>0:return (t-1)+(-prior/cf)
    return None

def cost_per_million(hourly,tps):
    if hourly<0 or tps<=0: raise ValueError('price and throughput')
    return 1e6*hourly/(3600*tps)

def breakeven_old_price(new_price,old_tps,new_tps):
    if min(old_tps,new_tps)<=0: raise ValueError('throughput')
    return new_price*old_tps/new_tps

if __name__=='__main__':
 i=Inputs(); f=cashflows(i); print('flows', [round(x,2) for x in f]);print('NPV',round(npv(f,i.discount_rate),2),'payback',payback(f));print('hypothetical breakeven hourly',breakeven_old_price(4,40,120))

def continuation_value(hourly_rent=1.65, utilization=.7, renewal_probability=.7,
                       annual_price_decline=.12, cash_opex=6500, maintenance=1000,
                       discount_rate=.12, years=3, terminal_salvage=3000):
    """Time-zero value conditional on keeping the installed asset, before debt and tax.

    Renewal probability scales revenue for the full renewal period; fixed operating
    and maintenance costs are incurred even if the renewal does not materialize.
    Initial acquisition costs are sunk. Compare to cash proceeds from sale now;
    financing, working capital, sale tax, alternative uses and optimal timing omitted.
    """
    if not (0 <= utilization <= 1 and 0 <= renewal_probability <= 1 and
            0 <= annual_price_decline <= 1 and hourly_rent >= 0 and
            cash_opex >= 0 and maintenance >= 0 and discount_rate > -1 and
            years > 0 and terminal_salvage >= 0):
        raise ValueError('invalid continuation assumptions')
    flows=[0.0]
    for year in range(1, years+1):
        revenue=8760*utilization*renewal_probability*hourly_rent*(1-annual_price_decline)**(year-1)
        flows.append(revenue-cash_opex-maintenance+(terminal_salvage if year==years else 0))
    return npv(flows, discount_rate)
