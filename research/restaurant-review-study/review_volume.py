#!/usr/bin/env python3
"""Summarize rating/volume relationships from a local source snapshot."""
import argparse
import json
from pathlib import Path
import numpy as np
from scipy.stats import spearmanr
from robustness import valid_score


def number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and np.isfinite(v)


def summarize(records, rating, count):
    pairs = [(float(r[rating]), float(r[count])) for r in records
             if valid_score(r.get(rating)) and number(r.get(count)) and r[count] >= 0]
    scores = np.array([p[0] for p in pairs]); counts = np.array([p[1] for p in pairs])
    if not pairs:
        return {'n': 0, 'bands': []}
    corr = spearmanr(scores, counts) if len(pairs) > 2 else None
    bounds = [(0, 10), (10, 30), (30, 100), (100, 300), (300, float('inf'))]
    bands = []
    for lo, hi in bounds:
        a = scores[(counts >= lo) & (counts < hi)]
        if len(a):
            bands.append({'count_min': lo, 'count_max_exclusive': None if not np.isfinite(hi) else hi,
                          'n': len(a), 'rating_median': round(float(np.median(a)), 3),
                          'rating_mean': round(float(np.mean(a)), 3),
                          'rating_sd': round(float(np.std(a, ddof=1)), 3) if len(a) > 1 else None})
    return {'n': len(pairs), 'count_mean': round(float(np.mean(counts)), 2),
            'count_median': round(float(np.median(counts)), 2),
            'count_p99': round(float(np.quantile(counts, .99)), 2),
            'count_max': int(np.max(counts)),
            'spearman_rho': round(float(corr.statistic), 4) if corr and np.isfinite(corr.statistic) else None,
            'spearman_p': float(corr.pvalue) if corr and np.isfinite(corr.pvalue) else None,
            'bands': bands}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True); parser.add_argument('--output', required=True)
    args = parser.parse_args()
    records = json.loads(Path(args.input).read_text(encoding='utf-8'))['restaurants']
    fields = {'naver': ('naver_visitor_score', 'naver_visitor_reviews'),
              'kakao': ('kakao_rating', 'kakao_rating_count'), 'google': ('google_rating', 'google_reviews')}
    out = {name: summarize(records, *fields_) for name, fields_ in fields.items()}
    out['note'] = 'Counts differ by platform; Naver visitor reviews are not verified rating counts. Cross-sectional correlations are descriptive.'
    Path(args.output).write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
