"""Illustrative reverse valuation; USD bn, valuation date proxy 2026-09-30.
Run: python3 research/coreweave-2026/model.py
Revenue timing is management's Q3 2026 backlog buckets; within-bucket allocations,
prepayments and unlevered margins are hypothetical. No price target.
"""
from dataclasses import dataclass

@dataclass(frozen=True)
class Inputs:
    backlog: float = 132.5
    equity_proxy: float = 33.52
    debt: float = 46.873
    cash: float = 4.122
    discount: float = .12
    already_paid_in_backlog: float = 5.0


def model(i=Inputs()):
    # Buckets: 36% years 1-2, 38% years 3-4, 26% years 5-8; equal in each.
    fractions = [.36/2]*2 + [.38/2]*2 + [.26/4]*4
    assert abs(sum(fractions)-1)<1e-10
    df = [1/(1+i.discount)**year for year in range(1,9)]
    pv_revenue = i.backlog*sum(a*b for a,b in zip(fractions,df))
    # Assumes already-collected amounts would have been recognized equally in years 1 and 2.
    pv_prepaid = i.already_paid_in_backlog*sum(df[:2])/2
    enterprise_value = i.equity_proxy + i.debt - i.cash
    scenarios=[]
    for name,margin in [('bear',.10),('base',.20),('bull',.30)]:
        # Revenue times future unlevered cash margin treats all revenues as uncollected;
        # subtract discounted assumed already-collected revenue, whose financing effect is already reflected at the valuation date.
        contract_pv = pv_revenue*margin-pv_prepaid
        remaining = enterprise_value-contract_pv
        scenarios.append((name,margin,contract_pv,remaining))
    return enterprise_value,pv_revenue,pv_prepaid,scenarios

if __name__ == '__main__':
    for rate in (.10,.12,.14):
        i=Inputs(discount=rate)
        ev,pv,pre,scenarios=model(i)
        print(f'rate={rate:.0%} EV={ev:.3f} PV_revenue={pv:.3f} PV_already_paid={pre:.3f}')
        for name,margin,value,gap in scenarios: print(f' {name}: margin={margin:.0%} PV_backlog={value:.3f} required_other_net_PV={gap:.3f}')
