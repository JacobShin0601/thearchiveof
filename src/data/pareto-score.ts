export type Place = { name: string; price: number; travelTime: number; taste: number };

export function dominates(a: Place, b: Place) {
  return a.price <= b.price && a.travelTime <= b.travelTime && a.taste >= b.taste
    && (a.price < b.price || a.travelTime < b.travelTime || a.taste > b.taste);
}

export function efficientOf(places: Place[]) {
  return places.filter((candidate) => !places.some((other) => dominates(other, candidate)));
}

export function normalize(values: number[], invert = false) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((value) => {
    const unit = (value - min) / span;
    return invert ? 1 - unit : unit;
  });
}

export function weightedChoice(places: Place[], weights: [number, number, number]) {
  if (places.length === 0) return undefined;
  const cheap = normalize(places.map((place) => place.price), true);
  const near = normalize(places.map((place) => place.travelTime), true);
  const tasty = normalize(places.map((place) => place.taste));
  const [wPrice, wTime, wTaste] = weights;
  const total = wPrice + wTime + wTaste || 1;
  let best = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  places.forEach((_place, index) => {
    const score = (wPrice * cheap[index] + wTime * near[index] + wTaste * tasty[index]) / total;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return places[best];
}
