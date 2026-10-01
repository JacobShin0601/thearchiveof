import assert from 'node:assert/strict';
import test from 'node:test';
import {
  costOptimalInventory,
  expectedLeftover,
  expectedMismatchCost,
  expectedShortage,
  poissonCdf,
  poissonQuantile,
  poissonPmf,
  stockoutProbability,
} from '../src/lib/poisson-inventory.ts';

test('Poisson probabilities match the article examples', () => {
  assert.ok(Math.abs(poissonPmf(3, 0) - 0.049787) < 1e-6);
  assert.ok(Math.abs(poissonPmf(3, 2) - 0.224042) < 1e-6);
  assert.ok(Math.abs((1 - poissonCdf(3, 4)) - 0.184737) < 1e-6);
});

test('inventory metrics match the illustrative Poisson(30) case', () => {
  assert.ok(Math.abs(stockoutProbability(30, 35) - 0.157383) < 1e-6);
  assert.ok(Math.abs(expectedShortage(30, 35) - 0.572328) < 1e-6);
  assert.ok(Math.abs(expectedLeftover(30, 35) - 5.572328) < 1e-6);
  assert.equal(poissonQuantile(30, 0.95), 39);
});

test('cost optimum follows the critical fractile and minimizes nearby cost', () => {
  const q = costOptimalInventory(30, 9000, 4000);
  assert.equal(q, poissonQuantile(30, 9000 / 13000));
  const cost = expectedMismatchCost(30, q, 9000, 4000);
  assert.ok(cost <= expectedMismatchCost(30, q - 1, 9000, 4000));
  assert.ok(cost <= expectedMismatchCost(30, q + 1, 9000, 4000));
});
