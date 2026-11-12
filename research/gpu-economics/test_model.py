import unittest
from dataclasses import replace
from model import Inputs,cashflows,npv,cost_per_million,breakeven_old_price
class TestModel(unittest.TestCase):
 def test_cost(self):
  self.assertAlmostEqual(cost_per_million(3.6,100),10);self.assertAlmostEqual(breakeven_old_price(4,40,120),4/3)
 def test_monotonic(self):
  a=Inputs(); n=lambda x:npv(cashflows(x),x.discount_rate)
  self.assertLess(n(replace(a,gpu_cost=40000)),n(a));self.assertGreater(n(replace(a,hourly_rent=4)),n(a));self.assertLess(n(replace(a,cash_opex=7000)),n(a))
 def test_contract(self):
  a=Inputs(contract_type='take_or_pay',utilization=.2);b=replace(a,utilization=.8)
  self.assertEqual(cashflows(a)[1],cashflows(b)[1]);self.assertLess(cashflows(a)[4],cashflows(b)[4])
 def test_zero_discount(self):
  self.assertEqual(npv([-5,2,4],0),1)
if __name__=='__main__':unittest.main()
