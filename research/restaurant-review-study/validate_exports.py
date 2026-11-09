#!/usr/bin/env python3
"""Compare common scalar fields in locally downloaded JSON and CSV exports."""
import argparse
import csv
import hashlib
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path


def equal(left, right):
    if left is None:
        return right == ''
    if isinstance(left, list):
        return '|'.join(str(value) for value in left) == right
    if isinstance(left, bool):
        return str(left).lower() == right.lower()
    if isinstance(left, (float, int)):
        try:
            return Decimal(str(left)) == Decimal(right)
        except InvalidOperation:
            return False
    return str(left) == right


def main():
    p = argparse.ArgumentParser(); p.add_argument('--json', required=True); p.add_argument('--csv', required=True); p.add_argument('--output', required=True)
    args = p.parse_args()
    json_bytes = Path(args.json).read_bytes(); csv_bytes = Path(args.csv).read_bytes()
    records = json.loads(json_bytes)['restaurants']
    with Path(args.csv).open(encoding='utf-8-sig', newline='') as f:
        csv_rows = list(csv.DictReader(f))
    json_by_id = {row['id']: row for row in records}; csv_by_id = {row['id']: row for row in csv_rows}
    fields = set(csv_rows[0]) if csv_rows else set()
    json_fields = set().union(*(r.keys() for r in records))
    common_ids = set(json_by_id) & set(csv_by_id)
    differences = {}
    for key in fields & json_fields:
        mismatched = sum(not equal(json_by_id[i].get(key), csv_by_id[i].get(key, '')) for i in common_ids)
        if mismatched:
            differences[key] = mismatched
    result = {'json_sha256': hashlib.sha256(json_bytes).hexdigest(), 'csv_sha256': hashlib.sha256(csv_bytes).hexdigest(),
              'json_bytes': len(json_bytes), 'csv_bytes': len(csv_bytes), 'json_rows': len(records), 'csv_rows': len(csv_rows),
              'json_duplicate_ids': len(records) - len(json_by_id), 'csv_duplicate_ids': len(csv_rows) - len(csv_by_id),
              'json_only_ids': len(set(json_by_id) - set(csv_by_id)), 'csv_only_ids': len(set(csv_by_id) - set(json_by_id)),
              'json_only_fields': sorted(json_fields - fields), 'csv_only_fields': sorted(fields - json_fields),
              'common_fields': len(fields & json_fields), 'mismatches_by_field': differences}
    Path(args.output).write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
