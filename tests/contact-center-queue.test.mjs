import assert from 'node:assert/strict';
import test from 'node:test';
import {
  erlangC,
  humanHandoffRate,
  meanInterarrivalMinutes,
} from '../src/lib/contact-center-queue.ts';

test('Poisson thinning gives the illustrative human handoff rate', () => {
  assert.equal(humanHandoffRate(100, 0.2), 20);
  assert.equal(meanInterarrivalMinutes(20), 3);
});

test('Erlang C reproduces the article staffing table', () => {
  const five = erlangC(20, 12, 5, 5);
  const six = erlangC(20, 12, 6, 5);
  const seven = erlangC(20, 12, 7, 5);

  assert.ok(Math.abs(five.averageWaitMinutes - 6.649) < 0.001);
  assert.ok(Math.abs(five.serviceLevel - 0.634706) < 1e-6);
  assert.ok(Math.abs(six.averageWaitMinutes - 1.709) < 0.001);
  assert.ok(Math.abs(six.serviceLevel - 0.876243) < 1e-6);
  assert.ok(Math.abs(seven.averageWaitMinutes - 0.540) < 0.001);
  assert.ok(Math.abs(seven.serviceLevel - 0.961290) < 1e-6);
});

test('a queue at or above full utilization is unstable', () => {
  const four = erlangC(20, 12, 4, 5);
  assert.equal(four.stable, false);
  assert.equal(four.serviceLevel, 0);
  assert.equal(four.averageWaitMinutes, Number.POSITIVE_INFINITY);
});

