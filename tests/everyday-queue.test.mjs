import assert from 'node:assert/strict';
import test from 'node:test';
import { simulateQueue } from '../src/lib/everyday-queue.ts';

test('the simulator is deterministic for a fixed seed', () => {
  const input = {
    arrivalRatePerMinute: 1.2,
    averageServiceMinutes: 1.2,
    servers: 2,
    serviceCv: 1,
    mode: 'pooled',
    seed: 42,
  };
  assert.deepEqual(simulateQueue(input), simulateQueue(input));
});

test('greater service-time variability raises waiting in the illustrative queue', () => {
  const base = {
    arrivalRatePerMinute: 1.2,
    averageServiceMinutes: 1.2,
    servers: 2,
    mode: 'pooled',
    seed: 42,
    durationMinutes: 2000,
  };
  const steady = simulateQueue({ ...base, serviceCv: 0 });
  const variable = simulateQueue({ ...base, serviceCv: 1.5 });
  assert.ok(variable.averageWaitMinutes > steady.averageWaitMinutes);
  assert.ok(variable.p95WaitMinutes > steady.p95WaitMinutes);
});

test('utilization marks an overloaded queue as unstable', () => {
  const result = simulateQueue({
    arrivalRatePerMinute: 2,
    averageServiceMinutes: 2,
    servers: 3,
    serviceCv: 1,
    mode: 'pooled',
  });
  assert.ok(result.utilization > 1);
  assert.equal(result.stable, false);
});
