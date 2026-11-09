#!/usr/bin/env python3
"""The Archive of | Restaurant rating study (Naver x Kakao x Google)
Run (on a machine with internet):
    python thearchive_review_study.py --output results
Or download the source JSON first, then:
    python thearchive_review_study.py --input restaurants.json --output results
Dependencies: numpy pandas scipy matplotlib statsmodels requests
Data source: https://seoulrestaurants.com/data/ (CC BY 4.0 as represented by publisher)
This is an observational, selected sample; results do NOT identify review-event causality.
"""
import argparse
import io
import json
from pathlib import Path
from datetime import date
import numpy as np
import pandas as pd
from scipy import stats
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

URL = 'https://seoulrestaurants.com/data/restaurants.json'
RATING = {'naver': 'naver_visitor_score', 'kakao': 'kakao_rating', 'google': 'google_rating'}
VOLUME = {'naver': 'naver_visitor_reviews', 'kakao': 'kakao_rating_count', 'google': 'google_reviews'}


def get_data(path):
    if path:
        raw = Path(path).read_bytes()
        if Path(path).suffix.lower() == '.csv':
            return pd.read_csv(io.BytesIO(raw)), {'source': path}
        data = json.loads(raw)
    else:
        import requests
        resp = requests.get(URL, timeout=40, headers={'User-Agent': 'TheArchiveOf-IndependentAnalysis/1.0'})
        resp.raise_for_status()
        data = resp.json()
    if isinstance(data, list):
        return pd.json_normalize(data), {}
    records = data.get('restaurants', data.get('records', []))
    if not records:
        raise ValueError('JSON has no restaurants or records array')
    return pd.json_normalize(records), {k: data.get(k) for k in ('dataset', 'updated', 'license', 'count', 'tier_counts')}


def ci_mean(a, seed=20261109, iters=10000):
    a=np.asarray(a, dtype=float)
    a=a[np.isfinite(a)]
    if len(a) < 2: return [None, None]
    rng=np.random.default_rng(seed)
    means=np.empty(iters)
    for i in range(iters):
        means[i]=np.mean(a[rng.integers(0,len(a),len(a))])
    return [float(v) for v in np.round(np.quantile(means,[0.025,0.975]),4)]


def safe_number(x):
    if pd.isna(x): return None
    return float(x) if isinstance(x,(float,np.floating)) else int(x) if isinstance(x,(int,np.integer)) else x


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--input', help='Local restaurants.json or restaurants.csv (downloaded from publisher)')
    ap.add_argument('--output', default='thearchive_review_results')
    args=ap.parse_args()
    out=Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    df,meta=get_data(args.input)
    required=list(RATING.values())+list(VOLUME.values())
    absent=[x for x in required if x not in df]
    if absent: raise ValueError(f'Missing required columns: {absent}')
    for c in required+['naver_match_confidence','google_match_distance_m','local_score','gap_score']:
        if c in df: df[c]=pd.to_numeric(df[c],errors='coerce')
    if 'districts' in df:
        df['district'] = df['districts'].apply(lambda x: x[0] if isinstance(x,list) and x else str(x).split(',')[0])
    else:
        df['district']=df.get('district','Unknown')
    if 'category_en' not in df:
        df['category_en']=df.get('category','Unknown')
    df['category_en']=df['category_en'].fillna('Unknown').astype(str)
    quality={'records':len(df),'source_metadata':meta,'duplicate_id':int(df['id'].duplicated().sum()) if 'id' in df else None,
             'duplicate_name_address':int(df.duplicated(['name','address_road']).sum()) if {'name','address_road'}.issubset(df) else None}
    for name,col in RATING.items():
        quality[name+'_missing_ratings']=int(df[col].isna().sum())
        quality[name+'_invalid_rating']=int((df[col].notna() & ~df[col].between(1,5)).sum())
    for name,col in VOLUME.items():
        quality[name+'_missing_counts']=int(df[col].isna().sum())
        quality[name+'_invalid_counts']=int((df[col].notna() & (df[col]<0)).sum())
    if 'gap_score' in df and 'local_score' in df:
        mask=df[['gap_score','google_rating','local_score']].notna().all(axis=1)
        quality['gap_score_formula_mismatches_over_0.015']=int((np.abs(df.loc[mask,'gap_score']-(df.loc[mask,'google_rating']-df.loc[mask,'local_score']))>.015).sum())
    if 'local_score' in df:
        mask=df[['local_score','naver_visitor_score','kakao_rating']].notna().all(axis=1)
        computed=(2*df.loc[mask,'naver_visitor_score']+df.loc[mask,'kakao_rating'])/3
        quality['local_score_formula_mismatches_over_0.015']=int((np.abs(df.loc[mask,'local_score']-computed)>.015).sum())
    # Preserve invalid values in the quality audit, but exclude them from every analysis.
    for col in RATING.values():
        df.loc[~df[col].between(1, 5), col] = np.nan
    for col in VOLUME.values():
        df.loc[df[col] < 0, col] = np.nan
    with open(out/'data_quality.json','w',encoding='utf8') as f: json.dump(quality,f,ensure_ascii=False,indent=2,default=safe_number)
    metric={}
    ratings=[]
    for k,c in RATING.items():
        s=df[c].dropna()
        entry={'platform':k,'n':int(s.size),'mean':round(float(s.mean()),4) if len(s) else None,
               'median':round(float(s.median()),4) if len(s) else None,
               'std':round(float(s.std()),4) if len(s)>1 else None,
               **{f'q{int(q*100)}':round(float(s.quantile(q)),4) if len(s) else None for q in [.1,.25,.5,.75,.9]},
               'min':float(s.min()) if len(s) else None, 'max':float(s.max()) if len(s) else None,
               **{f'pct_ge_{t}':round(float((s>=t).mean()*100),2) if len(s) else None for t in [3.0,3.5,4.0,4.5]}}
        ratings.append(entry)
    pd.DataFrame(ratings).to_csv(out/'platform_summary.csv',index=False,encoding='utf-8-sig')
    metric['platforms']=ratings
    pairs={}
    for a,b in [('naver','kakao'),('google','kakao'),('naver','google')]:
        sub=df[[RATING[a],RATING[b]]].dropna()
        # Scores are displayed to hundredths; avoid floating-point false non-ties.
        difference=np.round((sub[RATING[a]]-sub[RATING[b]]).to_numpy(), 8)
        pos=int(np.sum(difference>0)); neg=int(np.sum(difference<0)); zero=int(np.sum(difference==0))
        rho,p_rho=stats.spearmanr(sub[RATING[a]],sub[RATING[b]]) if len(sub)>2 else (np.nan,np.nan)
        try: p_w=float(stats.wilcoxon(difference).pvalue) if np.any(difference) else 1.0
        except ValueError: p_w=None
        pairs[a+'_minus_'+b]={'n':len(difference),'mean':round(float(np.mean(difference)),4) if len(difference) else None,
             'median':round(float(np.median(difference)),4) if len(difference) else None,
             'bootstrap_95pct_CI':ci_mean(difference),'positive':pos,'negative':neg,'ties':zero,
             'positive_pct':round(100*pos/len(difference),2) if len(difference) else None,
             'std':round(float(np.std(difference,ddof=1)),4) if len(difference)>1 else None,
             'sign_test_p':float(stats.binomtest(pos,pos+neg,.5).pvalue) if pos+neg else None,
             'spearman_rho':round(float(rho),4) if np.isfinite(rho) else None,
             'spearman_p':safe_number(p_rho),'wilcoxon_p':p_w}
    metric['paired_comparisons']=pairs
    cutoff=[]
    for n in [0,10,30,100,300]:
        sub=(df['kakao_rating'].dropna() if n==0 else df.loc[df['kakao_rating_count']>=n,'kakao_rating'].dropna())
        if len(sub)==0: continue
        less=(sub<3.5).sum(); equal=(sub==3.5).sum(); greater=(sub>3.5).sum()
        cutoff.append({'min_kakao_rating_count':n,'n':len(sub),'mean':round(float(sub.mean()),4),
            'median':round(float(sub.median()),4),'pct_below_3_5':round(100*less/len(sub),2),
            'pct_equal_3_5':round(100*equal/len(sub),2),'pct_above_3_5':round(100*greater/len(sub),2),
            'pct_at_least_3_5':round(100*(equal+greater)/len(sub),2)})
    pd.DataFrame(cutoff).to_csv(out/'kakao_35_threshold.csv',index=False,encoding='utf-8-sig')
    metric['kakao_threshold_3_5']=cutoff
    threshold_rows=[]
    for t in [3.0,3.5,4.0]:
        s=df['kakao_rating'].dropna()
        threshold_rows.append({'threshold':t,'n':len(s),'below':int((s<t).sum()),'equal':int((s==t).sum()),'above':int((s>t).sum()),'at_least':int((s>=t).sum()),'ecdf_strict':float((s<t).mean()),'ecdf_inclusive':float((s<=t).mean())})
    pd.DataFrame(threshold_rows).to_csv(out/'kakao_thresholds.csv',index=False,encoding='utf-8-sig')
    correlations=[]
    for k in RATING:
        sub=df[[RATING[k],VOLUME[k]]].dropna()
        sub=sub.loc[sub[VOLUME[k]]>0]
        if len(sub)>2:
            rho,p=stats.spearmanr(sub[RATING[k]],sub[VOLUME[k]])
            correlations.append({'platform':k,'n':len(sub),'spearman_rating_count':round(float(rho),4),'p_value':float(p)})
    pd.DataFrame(correlations).to_csv(out/'count_vs_rating_spearman.csv',index=False,encoding='utf-8-sig')
    metric['count_rating_correlations']=correlations
    for dim in ['district','category_en']:
        rows=[]
        for key,g in df.groupby(dim,dropna=False):
            matched=g[['naver_visitor_score','kakao_rating']].dropna()
            if len(matched)<5: continue
            difference=matched['naver_visitor_score']-matched['kakao_rating']
            rows.append({'group':str(key),'n_matched':len(matched),'naver_mean':round(float(matched['naver_visitor_score'].mean()),3),
                'kakao_mean':round(float(matched['kakao_rating'].mean()),3),'mean_gap':round(float(difference.mean()),3),
                'kakao_pct_at_least_3_5':round(100*(matched['kakao_rating']>=3.5).mean(),2)})
        pd.DataFrame(rows,columns=['group','n_matched','naver_mean','kakao_mean','mean_gap','kakao_pct_at_least_3_5']).sort_values('n_matched',ascending=False).to_csv(out/f'grouped_{dim}.csv',index=False,encoding='utf-8-sig')
    if 'naver_match_confidence' in df:
        high=df.loc[df['naver_match_confidence']>=.9]
        matched=high[['naver_visitor_score','kakao_rating']].dropna()
        metric['high_confidence_sensitivity']={'n':len(matched),
            'mean_naver_minus_kakao':round(float((matched['naver_visitor_score']-matched['kakao_rating']).mean()),4) if len(matched) else None}
    try:
        # Regression is descriptive, not causal. Fixed effects can overfit with small category cells.
        import statsmodels.formula.api as smf
        sub=df[['naver_visitor_score','kakao_rating','kakao_rating_count','naver_visitor_reviews','district','category_en']].dropna().copy()
        sub=sub.loc[(sub['kakao_rating_count']>0)&(sub['naver_visitor_reviews']>0)]
        sub['rating_gap']=sub['naver_visitor_score']-sub['kakao_rating']
        sub['ln_kakao_count']=np.log1p(sub['kakao_rating_count'])
        sub['ln_naver_count']=np.log1p(sub['naver_visitor_reviews'])
        tops=sub['category_en'].value_counts().head(8).index
        sub['category_group']=sub['category_en'].where(sub['category_en'].isin(tops),'Other')
        model=smf.ols('rating_gap ~ ln_kakao_count + ln_naver_count + C(district) + C(category_group)',data=sub).fit(cov_type='HC3')
        metric['descriptive_regression']={'n':int(model.nobs),'adj_r2':round(float(model.rsquared_adj),4),
             'coefficients':{term:{'coef':round(float(model.params[term]),4),'robust_se':round(float(model.bse[term]),4),
             'p_value':round(float(model.pvalues[term]),5)} for term in ['ln_kakao_count','ln_naver_count']}}
        (out/'regression_summary.txt').write_text(str(model.summary()),encoding='utf8')
    except Exception as exc:
        metric['descriptive_regression_error']=repr(exc)
    with open(out/'summary.json','w',encoding='utf8') as f: json.dump(metric,f,ensure_ascii=False,indent=2,default=safe_number)
    # Visualizations. No intentionally fixed color palette.
    plt.figure(figsize=(8,4.8))
    bins=np.linspace(1,5,22)
    for k,c in RATING.items():
        plt.hist(df[c].dropna(),bins=bins,alpha=.42,label=k)
    plt.xlabel('Rating (1–5)'); plt.ylabel('Number of restaurants');plt.legend();plt.tight_layout();plt.savefig(out/'platform_distributions.png',dpi=180);plt.close()
    matched=df[['naver_visitor_score','kakao_rating']].dropna()
    plt.figure(figsize=(6.2,6))
    plt.scatter(matched['kakao_rating'],matched['naver_visitor_score'],alpha=.48,s=17)
    plt.plot([1,5],[1,5],linestyle='--',linewidth=1)
    plt.xlabel('Kakao rating');plt.ylabel('Naver visitor score');plt.xlim(1,5);plt.ylim(1,5)
    plt.tight_layout();plt.savefig(out/'naver_vs_kakao_scatter.png',dpi=180);plt.close()
    plt.figure(figsize=(8,4.8))
    dif=matched['naver_visitor_score']-matched['kakao_rating']
    plt.hist(dif,bins=27)
    plt.axvline(0,linestyle='--',linewidth=1)
    plt.xlabel('Naver − Kakao, same restaurant');plt.ylabel('Number of restaurants')
    plt.tight_layout();plt.savefig(out/'paired_gap_distribution.png',dpi=180);plt.close()
    fig,ax=plt.subplots(figsize=(7,4.2))
    ax.bar([str(x['min_kakao_rating_count'])+'+' for x in cutoff], [x['pct_at_least_3_5'] for x in cutoff])
    ax.set_ylim(0,100);ax.set_xlabel('Min. Kakao rating count');ax.set_ylabel('% of restaurants rated ≥3.5')
    fig.tight_layout();fig.savefig(out/'kakao_threshold_sensitivity.png',dpi=180);plt.close(fig)
    # Export a readable, non-causal report.
    pair=pairs['naver_minus_kakao']; at0=cutoff[0] if cutoff else {}
    report=f'''# The Archive of — Online rating analysis\n\nSource: {URL} (publisher: seoulrestaurants.com; dataset date: {meta.get('updated','unverified')}).\n\n## Data quality\n\n- Restaurants: {len(df)}\n- Duplicated IDs: {quality['duplicate_id']}\n- Duplicated name/address pairs: {quality['duplicate_name_address']}\n- Formula mismatches (local score > .015): {quality.get('local_score_formula_mismatches_over_0.015','not provided')}\n- Formula mismatches (gap score > .015): {quality.get('gap_score_formula_mismatches_over_0.015','not provided')}\n\n## Observed platform ratings\n\n{pd.DataFrame(ratings).to_markdown(index=False)}\n\n## Paired Naver vs Kakao\n\nMatched restaurants: {pair['n']}. Mean paired difference (Naver − Kakao): {pair['mean']} points, bootstrap 95% interval {pair['bootstrap_95pct_CI']}. Naver greater in {pair['positive']} stores, Kakao greater in {pair['negative']}, tied {pair['ties']}. Wilcoxon p: {pair['wilcoxon_p']}.\n\n## Is 3.5 on Kakao high in this sample?\n\n{pd.DataFrame(cutoff).to_markdown(index=False)}\n\nInterpretation: this is the percentile standing **within this curated dataset only**, not across Seoul restaurants.\n\n## Correlation with review counts (Spearman)\n\n{pd.DataFrame(correlations).to_markdown(index=False)}\n\n## Critical limitations\n\n1. Curated 352 restaurants across ten Seoul areas, no probability-based representative sampling.\n2. Review collection methods and incentives can produce selection and measurement bias; causal impact of review events cannot be estimated.\n3. Naver visitor-review count may not equal the number of users who submitted numeric stars. Treat this as a volume proxy, not a sample size for a rating-level Bayesian posterior.\n4. No individual ratings, timestamps, reviewer characteristics, review incentive flags, or verified transaction outcomes.\n5. One cross-sectional snapshot; cannot infer temporal improvement or deterioration.\n6. The dataset publisher states CC BY 4.0; upstream platforms may have separate restrictions. Credit the dataset but verify rights before republication of raw records.\n7. Paired tests quantify within-selected-sample differences; p-values do not solve selection bias or prove quality and causation.\n\nAll analyses are descriptive. Do not call a 3.5 'a great restaurant' based on distribution alone.\n'''
    (out/'analysis_report.md').write_text(report,encoding='utf8')
    narrative=f'''# 별점 4.9점과 리뷰 12개, 4.7점과 리뷰 2,000개 — 어디를 갈까?\n\n*부제: 우리가 식당을 고를 때 숫자를 믿는 방식, 그리고 숫자가 만들어지는 방식*\n\n우리 집에서는 식당을 고를 때 작은 의견 차이가 생긴다. 나는 별점이 높은 식당을 먼저 찾고, 아내는 리뷰가 충분히 쌓인 곳을 선호한다. 나는 '얼마나 좋게 평가했는가'를 먼저 보고, 아내는 '그 평가를 얼마나 믿어도 되는가'를 먼저 보는 셈이다.\n\n어느 쪽이 옳을까? 이 질문을 다루는 데는 단순한 평균보다 세 가지가 필요하다. 별점, 리뷰 수, 그리고 리뷰를 남기게 된 과정이다.\n\n## 같은 5점 만점은 같은 의미일까?\n\n서울의 식당 {len(df)}곳에 대해 네이버·카카오맵·구글 평점을 함께 수록한 공개 자료를 분석했다. 이 중 네이버와 카카오맵 점수가 모두 있는 식당은 {pair['n']}곳이었다. **동일 식당을 비교한 네이버−카카오 평균 차이는 {pair['mean']}점**(부트스트랩 95% 구간 {pair['bootstrap_95pct_CI']})이었다. 이 수치는 두 플랫폼의 점수 분포가 같다고 가정하기 어렵다는 것을 보여주는 *표본 내* 관찰이다.\n\n카카오맵 3.5점 이상인 식당의 비율은 이 자료에서 {at0.get('pct_at_least_3_5','NA')}%였다. 그러나 이 데이터셋은 서울 전체 식당에서 무작위로 선정한 표본이 아니다. 따라서 이 수치만으로 '서울에서 상위 몇 퍼센트'라고 말할 수는 없다.\n\n## 숫자가 많아지면 더 믿을 만할까?\n\n보통 같은 조건에서 독립적이고 대표성 있는 평가가 늘면 우연한 표본 변동은 줄어든다. 하지만 현실의 리뷰는 무작위 표본이 아니다. 극단적으로 만족하거나 불만족한 사람이 더 적극적으로 리뷰를 남길 수 있고, 이벤트 참여자가 다른 고객보다 더 많이 글을 남길 수도 있다. 그러면 리뷰 2,000개의 평균은 리뷰 20개보다 정밀할 수 있어도, 실제 방문자 전체의 만족도를 정확히 나타내는 것은 아니다.\n\n## 왜 네이버 4.5점과 카카오 3.5점을 같은 자로 재면 안 될까?\n\n같은 식당이라도 플랫폼 이용자, 리뷰 참여 방식, 평가 기준이 다를 수 있다. 이 연구는 그 차이의 *존재*를 관찰할 수는 있어도, 원인이 특정한 리뷰 이벤트 때문이라고 판정하지는 못한다.\n\n평가 점수를 읽을 때는 절대값과 함께 플랫폼 내부의 분포를 보자. 그보다 중요한 것은 최근의 낮은 평가가 반복되는지, 평가 이유가 구체적인지, 내가 중요하게 생각하는 요소(맛, 대기, 서비스, 가격)에 관한 이야기인지 확인하는 것이다.\n\n## 결국 누구의 선택이 옳았을까?\n\n높은 별점을 먼저 보는 것과 많은 리뷰를 먼저 보는 것은 서로 대립되는 기준이 아니다. 하나는 평가의 크기를, 다른 하나는 정보의 양을 본다. 더 나은 질문은 '평점이 얼마인가?'에서 '누가, 왜, 언제 그 점수를 남겼는가?'로 이동하는 것이다.\n\n---\n\n**데이터와 해석의 한계**: seoulrestaurants.com 공개 자료(2026년 8월 표기, CC BY 4.0), 선정된 서울 {len(df)}개 식당. 플랫폼 원본별 직접 검증을 전수 수행하지 않았고 무작위 표본이 아니다. 리뷰 이벤트 여부·작성자 특성·방문 결과 데이터가 없어 인과효과나 맛집 여부를 단정할 수 없다. 네이버 방문자 리뷰 수와 별점을 매긴 평가자 수는 다를 수 있다. 데이터 출처: https://seoulrestaurants.com/data/ ; 방법론: https://seoulrestaurants.com/methodology/ .\n\n**참고 연구**: Schoenmueller, Netzer & Stahl (2020), The Polarity of Online Reviews, Journal of Marketing Research. https://doi.org/10.1177/0022243720941832\n'''
    (out/'article_data_inserted.md').write_text(narrative,encoding='utf8')
    print('Finished:', out.resolve())
    print('N=',len(df),'matched=',pair['n'],'mean N-K=',pair['mean'],'K >=3.5=',at0.get('pct_at_least_3_5'))
    print('Files:',*[x.name for x in out.iterdir()],sep='\n - ')

if __name__=='__main__':main()
