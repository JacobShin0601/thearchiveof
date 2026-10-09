import { EQUITY_DECISIONS } from '../../_generated/equity-decisions.js';
import { takeEquityRefresh } from '../../lib/equity-budget.js';
import { closesForDecision } from '../../lib/equity-feed.js';
import { json, methodNotAllowed } from '../../lib/http.js';

const FRESH = 'public, max-age=300, s-maxage=3600';
const FAILURE = 'public, max-age=0, s-maxage=60';

/** The chart's fetch() sets these. Page scripts cannot override them. */
function fromChart(request) {
  return request.headers.get('Sec-Fetch-Site') === 'same-origin'
    && request.headers.get('Sec-Fetch-Mode') === 'cors'
    && request.headers.get('Sec-Fetch-Dest') === 'empty';
}

function stored(id) {
  return new Request(`https://thearchiveof.internal/equity-decisions/${id}`);
}

function payload(body, cacheControl, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
    },
  });
}

function paused(id, record) {
  return json({
    ok: true,
    id,
    refresh: 'paused',
    closes: [{ date: record.decisionDate, close: record.decisionClose }],
  });
}

/** open: count taken. paused: daily cap reached. closed: counter failed, so the feed stays off. */
async function refreshGate(db) {
  if (!db) return 'open';
  try {
    return await takeEquityRefresh(db) ? 'open' : 'paused';
  } catch {
    return 'closed';
  }
}

export async function onRequest(context) {
  const { request, params, env } = context;
  if (request.method !== 'GET') return methodNotAllowed();
  const gate = await refreshGate(env?.DB);
  if (gate === 'closed') return json({ ok: false, error: 'refresh_unavailable' }, 503);
  const record = EQUITY_DECISIONS[params.id];
  if (gate === 'paused') {
    if (!fromChart(request)) return json({ ok: false, error: 'forbidden_client' }, 403);
    if (!record) return json({ ok: false, error: 'unknown_decision' }, 404);
    return paused(params.id, record);
  }
  if (!fromChart(request)) return json({ ok: false, error: 'forbidden_client' }, 403);
  if (!record) return json({ ok: false, error: 'unknown_decision' }, 404);

  const cache = globalThis.caches?.default;
  const key = stored(params.id);
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  try {
    const closes = await closesForDecision(record);
    const response = payload({ ok: true, id: params.id, closes }, FRESH);
    if (cache) await cache.put(key, response.clone());
    return response;
  } catch {
    const response = payload({ ok: false, error: 'feed_unavailable' }, FAILURE, 502);
    if (cache) await cache.put(key, response.clone());
    return response;
  }
}
