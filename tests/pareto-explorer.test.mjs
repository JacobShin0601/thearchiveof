import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dominatesInChart, efficientRestaurants, restaurants } from '../src/data/pareto-restaurants.ts';
import { efficientOf, weightedChoice } from '../src/data/pareto-score.ts';

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

describe('weighted-sum explorer', () => {
  const places = restaurants.map((place) => ({ ...place }));

  it('keeps D out of the Pareto pool', () => {
    assert.deepEqual(efficientOf(places).map((place) => place.name), ['A', 'B', 'C']);
  });

  it('moves the choice when weights change', () => {
    const pool = efficientOf(places);
    assert.equal(weightedChoice(pool, [10, 16, 10])?.name, 'B');
    assert.equal(weightedChoice(pool, [20, 2, 2])?.name, 'A');
    assert.equal(weightedChoice(pool, [2, 20, 2])?.name, 'C');
    assert.equal(weightedChoice(pool, [2, 2, 20])?.name, 'A');
  });
});
