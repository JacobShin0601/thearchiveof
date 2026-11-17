"""Reconstruct a single-provider matched-SKU example from the published monthly panel."""
from pathlib import Path
import pandas as pd
HERE=Path(__file__).resolve().parent
p=pd.read_csv(HERE/'data/a100_matched_source_rows.csv')
q=p[(p.gpu=='A100-80GB')&(p.form_factor=='SXM')&(p.segment=='neocloud_on_demand')&(p.provider=='lambda')&(p.region=='us-east-1')&(p.source=='skypilot')&(p.observation_type=='catalog_snapshot')&(p.flag.isna())&(p.instance_types=='gpu_8x_a100_80gb_sxm4')].copy()
assert not q.duplicated('month').any()
q=q.sort_values('month');q.to_csv(HERE/'results/a100_lambda_us_east_1.csv',index=False)
a,b=q.iloc[0],q.iloc[-1]
expected=pd.period_range(a['month'],b['month'],freq='M')
print(f"Matched rows={len(q)}, calendar months={len(expected)}, missing={len(expected)-len(q)}")
print(f"{a['month']} ${a.usd_per_gpu_hour:.2f}, snapshot {a.snapshot_date}; {b['month']} ${b.usd_per_gpu_hour:.2f}, snapshot {b.snapshot_date}; change={(b.usd_per_gpu_hour/a.usd_per_gpu_hour-1)*100:.1f}%")
print(f"staleness >30d={(q.staleness_days>30).sum()}")
print('Source: Mittal, gpu-price-history, commit ee8820dd90d7715d8bb57cee03fb0882706d76c5, panel CC BY 4.0; third-party source terms apply.')
