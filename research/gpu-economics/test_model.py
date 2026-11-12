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
 def test_linked_price_and_supplier_threshold(self):
  p=breakeven_old_price(4,40,120)
  a=replace(Inputs(),hourly_rent=p)
  self.assertAlmostEqual(npv(cashflows(a),a.discount_rate),-46871.065134,places=4)
  b=replace(a,contract_type='take_or_pay')
  self.assertAlmostEqual(npv(cashflows(b),b.discount_rate),-39016.116155,places=4)
  for item in (a,b):
   n0=npv(cashflows(replace(item,hourly_rent=0)),item.discount_rate)
   n1=npv(cashflows(replace(item,hourly_rent=1)),item.discount_rate)
   threshold=-n0/(n1-n0)
   self.assertAlmostEqual(npv(cashflows(replace(item,hourly_rent=threshold)),item.discount_rate),0,places=7)
 def test_zero_discount(self):
  self.assertEqual(npv([-5,2,4],0),1)
if __name__=='__main__':unittest.main()

class TestContinuation(unittest.TestCase):
 def test_continue_matches_known_example(self):
  from model import continuation_value
  self.assertAlmostEqual(continuation_value(), -682.3357325, places=5)
 def test_continue_price_and_sale(self):
  from model import continuation_value
  self.assertLess(continuation_value(hourly_rent=2),4000)
  self.assertGreater(continuation_value(hourly_rent=3),4000)
 def test_validation(self):
  from model import continuation_value
  with self.assertRaises(ValueError): continuation_value(renewal_probability=1.1)
