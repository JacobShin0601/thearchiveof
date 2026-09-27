import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eventRows, surprisePercent } from '../src/lib/samsung-event.ts';

describe('Samsung earnings Lab calculations', () => {
  const samsung = [['20260703', 309500], ['20260706', 318000], ['20260707', 296000], ['20260708', 277500]];
  const hynix = [['20260703', 2425000], ['20260706', 2343000], ['20260707', 2201000], ['20260708', 2076000]];
  const kospi = [['20260703', 7900], ['20260706', 8051.33], ['20260707', 7656.31], ['20260708', 7400]];

  it('rebases all series to the pre-announcement close and aligns dates', () => {
    const rows = eventRows(samsung, hynix, kospi, 5);
    assert.equal(rows.length, 4);
    assert.equal(rows.find((row) => row.date === '20260706').samsung, 0);
    const event = rows.find((row) => row.date === '20260707');
    assert.ok(Math.abs(event.samsung + 6.9182) < .001);
    assert.ok(Math.abs(event.kospi + 4.9063) < .001);
    assert.ok(Math.abs((event.samsung - event.kospi) + 2.0119) < .001);
  });

  it('requires the verified event and base dates', () => {
    assert.deepEqual(eventRows(samsung.filter(([date]) => date !== '20260706'), hynix, kospi, 5), []);
    assert.deepEqual(eventRows(samsung, hynix, kospi, 7), []);
  });

  it('changes only the calculated surprise when the assumed estimate changes', () => {
    assert.ok(Math.abs(surprisePercent(89.4, 87.3) - 2.4055) < .001);
    assert.ok(Math.abs(surprisePercent(89.4, 90) + .6667) < .001);
    assert.ok(Number.isNaN(surprisePercent(89.4, 0)));
  });
});
