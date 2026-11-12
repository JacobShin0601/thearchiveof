import test from 'node:test';
import assert from 'node:assert/strict';
import {coreweaveValue,cwPresets} from '../src/lib/coreweave-valuation.ts';
test('CoreWeave model reconciles equity and price with prepaid cash deduction',()=>{
  const x=coreweaveValue(cwPresets.base);
  assert.ok(Math.abs(x.pvRevenue-90.851)<.002);
  assert.ok(Math.abs(x.fairPrice-54.64)<.02);
  assert.ok(Math.abs(x.requiredOther-63.43)<.02);
  assert.equal(x.rawEquity,x.backlog+60-x.netDebt);
});
test('CoreWeave model responds correctly to key risks',()=>{
  const b=cwPresets.base, x=coreweaveValue(b);
  assert.ok(coreweaveValue({...b,margin:25}).fairPrice>x.fairPrice);
  assert.ok(coreweaveValue({...b,prepaid:10}).fairPrice<x.fairPrice);
  assert.ok(coreweaveValue({...b,shares:620}).fairPrice<x.fairPrice);
  assert.equal(coreweaveValue(cwPresets.bear).fairPrice,0);
});
