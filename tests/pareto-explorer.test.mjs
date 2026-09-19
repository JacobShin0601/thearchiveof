import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dominatesInChart, efficientRestaurants, restaurants } from '../src/data/pareto-restaurants.ts';

describe('shared restaurant data', () => {
  it('keeps D dominated on price and travel time', () => {
    const b = restaurants.find((place) => place.name === 'B');
    const d = restaurants.find((place) => place.name === 'D');
    assert.ok(b && d);
    assert.equal(dominatesInChart(b, d), true);
    assert.deepEqual(efficientRestaurants.map((place) => place.name), ['A', 'B', 'C']);
  });

  it('starts from the article values', () => {
    assert.equal(restaurants.length, 4);
    assert.equal(restaurants[0].price, 20000);
    assert.equal(restaurants[3].taste, 4);
  });
});
