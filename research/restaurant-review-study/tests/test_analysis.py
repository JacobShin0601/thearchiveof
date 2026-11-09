import unittest
import numpy as np
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from analysis import ci_mean


class AnalysisTests(unittest.TestCase):
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
