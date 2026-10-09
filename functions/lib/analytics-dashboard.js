const DAY_MS = 86_400_000;

export const ANALYTICS_SCHEMA_VERSION = 1;
export const ALLOWED_ANALYTICS_WINDOWS = new Set([7, 30, 90]);

export function shiftDay(day, delta) {
  const value = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(value.valueOf())) throw new Error('Invalid analytics day');
  return new Date(value.valueOf() + delta * DAY_MS).toISOString().slice(0, 10);
}

export function analyticsWindow(rangeEnd, days) {
  if (!ALLOWED_ANALYTICS_WINDOWS.has(days)) throw new Error('Invalid analytics window');
  return {
    currentStart: shiftDay(rangeEnd, -days),
    currentEnd: rangeEnd,
    previousStart: shiftDay(rangeEnd, -(days * 2)),
    previousEnd: shiftDay(rangeEnd, -days),
  };
}

export function sumRows(rows) {
  return rows.reduce((total, row) => ({
    requests: total.requests + Number(row.requests ?? 0),
    visits: total.visits + Number(row.visits ?? 0),
    bytes: total.bytes + Number(row.bytes ?? 0),
  }), { requests: 0, visits: 0, bytes: 0 });
}

export function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export function safeAnalyticsPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > 500) return false;
  if (path.startsWith('/api/') || path.startsWith('/ops/')) return false;
  return !/\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|webp|woff2?)(?:$|\?)/i.test(path);
}

export async function tokenMatches(provided, expected) {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}

export function bearerToken(request) {
  const value = request.headers.get('Authorization') ?? '';
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}
