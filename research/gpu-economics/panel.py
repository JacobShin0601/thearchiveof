"""Reproduce strict matched-endpoint analysis from pinned upstream CSV.
Usage: python3 panel.py /path/to/rent_panel_monthly.csv
"""
import sys
from pathlib import Path
import pandas as pd

KEYS=['gpu','form_factor','segment','provider','region','source','instance_types']
START, END='2024-09','2026-09'
p=pd.read_csv(sys.argv[1],low_memory=False)
p=p[p.month.isin([START,END]) & p.gpu.isin(['A100-80GB','H100','H200','B200']) & p.flag.isna() & p.staleness_days.between(0,30) & p.observation_type.isin(['catalog_snapshot','price_list_version'])].copy()
a=p[p.month==START]; b=p[p.month==END]
x=a.merge(b,on=KEYS,suffixes=('_start','_end'),validate='one_to_one')
x['change_pct']=100*(x.usd_per_gpu_hour_end/x.usd_per_gpu_hour_start-1)
cols=KEYS+['usd_per_gpu_hour_start','usd_per_gpu_hour_end','snapshot_date_start','snapshot_date_end','staleness_days_start','staleness_days_end','change_pct']
out=Path(__file__).parent/'results';out.mkdir(exist_ok=True)
x[cols].sort_values(KEYS).to_csv(out/'matched_endpoints_2024_2026.csv',index=False)
y=x.groupby(['gpu','form_factor','segment','provider'],dropna=False).agg(matched_cells=('change_pct','size'),median_change_pct=('change_pct','median')).reset_index()
y.to_csv(out/'provider_endpoint_summary.csv',index=False)
print('matched endpoint cells:',len(x),'providers:',x.provider.nunique());print(y.to_string(index=False))
