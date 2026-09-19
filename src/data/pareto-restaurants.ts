// Illustrative candidates, shared by the article table, comparison, and SVG charts.
export const restaurants = [
  { name: 'A', price: 20000, travelTime: 45, taste: 4.8 },
  { name: 'B', price: 25000, travelTime: 25, taste: 4.5 },
  { name: 'C', price: 30000, travelTime: 20, taste: 4.2 },
  { name: 'D', price: 32000, travelTime: 35, taste: 4.0 },
] as const;

export const formatPrice = (price: number, language: 'ko' | 'en' = 'ko') =>
  language === 'en' ? `$${(price / 1000).toFixed(0)}` : `${price.toLocaleString('ko-KR')}원`;
export const dominatesInChart = (a: typeof restaurants[number], b: typeof restaurants[number]) =>
  a.price <= b.price && a.travelTime <= b.travelTime
  && (a.price < b.price || a.travelTime < b.travelTime);
export const efficientRestaurants = restaurants.filter((candidate) =>
  !restaurants.some((other) => dominatesInChart(other, candidate)));
