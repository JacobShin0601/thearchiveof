#!/usr/bin/env python3
"""Exploratory robustness checks for a locally supplied provider JSON snapshot."""
import argparse
import json
from collections import defaultdict
from pathlib import Path
import numpy as np


def valid_score(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and 1 <= value <= 5


def summarize(rows):
    if not rows:
        return {'n': 0, 'mean_gap': None, 'median_gap': None, 'positive_pct': None}
    diffs = np.array([row['naver_visitor_score'] - row['kakao_rating'] for row in rows])
    return {'n': len(diffs), 'mean_gap': round(float(diffs.mean()), 4),
            'median_gap': round(float(np.median(diffs)), 4),
            'positive_pct': round(float((diffs > 1e-8).mean() * 100), 2)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    data = json.loads(Path(args.input).read_text(encoding='utf-8'))
    records = data['restaurants']
    pairs = [r for r in records if valid_score(r.get('naver_visitor_score')) and valid_score(r.get('kakao_rating'))]
    eligible = lambda r, k, n: isinstance(r.get(k), (int, float)) and r[k] >= n
    checks = {
        'all_valid_pairs': summarize(pairs),
        'provider_confidence_at_least_0_9': summarize([r for r in pairs if eligible(r, 'naver_match_confidence', .9)]),
        'kakao_rating_count_at_least_30': summarize([r for r in pairs if eligible(r, 'kakao_rating_count', 30)]),
        'kakao_rating_count_at_least_100': summarize([r for r in pairs if eligible(r, 'kakao_rating_count', 100)]),
        'absolute_gap_at_most_1': summarize([r for r in pairs if abs(r['naver_visitor_score'] - r['kakao_rating']) <= 1]),
    }
    groups = defaultdict(list)
    for row in pairs:
        # District is a provider-assigned neighbourhood, not an administrative district.
        districts = row.get('districts') or []
        for district in set(districts):
            groups[district].append(row)
    checks['by_provider_area'] = {k: summarize(v) for k, v in sorted(groups.items())}
    checks['notes'] = ['Exploratory subsets overlap and are not causal comparisons.',
        'The confidence score threshold is arbitrary and not a validated probability.',
        'The absolute-gap filter is outcome-dependent and is a sensitivity check, not evidence of errors.',
        'Closure and matching error cannot be reliably assessed from these fields alone.',
        'Areas can overlap and are defined by the provider, not a probability sample.']
    Path(args.output).write_text(json.dumps(checks, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
