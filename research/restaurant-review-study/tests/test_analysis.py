import unittest
import numpy as np
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from analysis import ci_mean
from robustness import valid_score, summarize
from review_volume import summarize as summarize_volume
from validate_exports import equal


class AnalysisTests(unittest.TestCase):
    def test_export_field_normalization(self):
        self.assertTrue(equal(None, ''))
        self.assertTrue(equal(True, 'True'))
        self.assertTrue(equal(4.0, '4'))
        self.assertTrue(equal(['myeongdong'], 'myeongdong'))
        self.assertFalse(equal(4.1, '4.2'))

    def test_review_volume_band_boundaries(self):
        rows = [{'score': 4.0, 'count': 9}, {'score': 4.5, 'count': 10},
                {'score': 4.0, 'count': 30}, {'score': 5.0, 'count': 100},
                {'score': 4.0, 'count': 300}, {'score': 0, 'count': 10},
                {'score': 4.0, 'count': -1}]
        out = summarize_volume(rows, 'score', 'count')
        self.assertEqual(out['n'], 5)
        self.assertEqual([band['n'] for band in out['bands']], [1, 1, 1, 1, 1])
        self.assertEqual(out['count_median'], 30)

    def test_invalid_scores_and_paired_summary(self):
        for invalid in [None, 0, 0.5, 5.1, True, '4.5']:
            self.assertFalse(valid_score(invalid))
        self.assertTrue(valid_score(1))
        self.assertTrue(valid_score(5))
        sample = [{'naver_visitor_score': 4.5, 'kakao_rating': 4.0},
                  {'naver_visitor_score': 3.5, 'kakao_rating': 4.0}]
        self.assertEqual(summarize(sample), {'n': 2, 'mean_gap': 0.0, 'median_gap': 0.0, 'positive_pct': 50.0})
        self.assertEqual(summarize([])['n'], 0)

    def test_bootstrap_constant_and_seed(self):
        self.assertEqual(ci_mean([0.5, 0.5, 0.5]), [0.5, 0.5])
        self.assertEqual(ci_mean([0.1, 0.4, 0.7]), ci_mean([0.1, 0.4, 0.7]))

    def test_threshold_ties_are_separate(self):
        scores = np.array([3.0, 3.5, 3.5, 4.0])
        self.assertEqual(((scores < 3.5).sum(), (scores == 3.5).sum(), (scores > 3.5).sum()), (1, 2, 1))
        self.assertEqual((scores >= 3.5).sum(), 3)

    def test_decimal_tie_precision(self):
        diff = np.round(np.array([4.4 - 4.4, 4.3 - 4.2]), 8)
        self.assertEqual(int((diff == 0).sum()), 1)


if __name__ == '__main__':
    unittest.main()
