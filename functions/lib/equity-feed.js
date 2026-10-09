/** Completed-session closes for a listed-equity decision. No open-session print. */

function roundPrice(close) {
  return Math.round(close * 10000) / 10000;
}

function utcDate(seconds) {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function zoneParts(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    hour: Number(pick('hour')),
    minute: Number(pick('minute')),
  };
}

function sessionOpen(now, timeZone, closeHour, closeMinute) {
  const parts = zoneParts(now, timeZone);
  if (!Number.isFinite(parts.hour) || !Number.isFinite(parts.minute)) return false;
  if (parts.hour < closeHour) return true;
  if (parts.hour > closeHour) return false;
  return parts.minute < closeMinute;
}

/** Drop today's print while that cash session is still open. Yesterday's close stays. */
export function dropOpenSession(closes, market, now = new Date()) {
  if (!Array.isArray(closes) || closes.length === 0) return [];
  const last = closes[closes.length - 1];
  const open = market === 'kr'
    ? sessionOpen(now, 'Asia/Seoul', 15, 30) && last.date === zoneParts(now, 'Asia/Seoul').date
    : sessionOpen(now, 'America/New_York', 16, 0) && last.date === zoneParts(now, 'America/New_York').date;
  return open ? closes.slice(0, -1) : closes;
}

export function closesFromYahooPayload(payload, priceField) {
  const result = payload?.chart?.result?.[0];
  const stamps = result?.timestamp;
  const values = priceField === 'adjclose' ? result?.indicators?.adjclose?.[0]?.adjclose : result?.indicators?.quote?.[0]?.close;
  if (!Array.isArray(stamps) || !Array.isArray(values)) return [];
  const byDate = new Map();
  for (let index = 0; index < stamps.length; index += 1) {
    const stamp = stamps[index];
    const close = values[index];
    if (typeof stamp !== 'number' || typeof close !== 'number' || !(close > 0)) continue;
    byDate.set(utcDate(stamp), roundPrice(close));
  }
  const lastStamp = stamps[stamps.length - 1];
  const lastValue = values[values.length - 1];
  const meta = result?.meta;
  if (
    typeof lastStamp === 'number'
    && (lastValue === null || typeof lastValue === 'undefined')
    && typeof meta?.regularMarketPrice === 'number'
    && meta.regularMarketPrice > 0
    && typeof meta.regularMarketTime === 'number'
    && utcDate(lastStamp) === utcDate(meta.regularMarketTime)
    && !sessionOpen(new Date(meta.regularMarketTime * 1000), meta.exchangeTimezoneName || 'America/New_York', 16, 0)
  ) {
    byDate.set(utcDate(lastStamp), roundPrice(meta.regularMarketPrice));
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, close]) => ({ date, close }));
}

export function closesFromAikPayload(payload) {
  if (!Array.isArray(payload)) return [];
  const byDate = new Map();
  for (const row of payload) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const raw = String(row[0]);
    const close = row[1];
    if (!/^\d{8}$/.test(raw) || typeof close !== 'number' || !(close > 0)) continue;
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    byDate.set(date, roundPrice(close));
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, close]) => ({ date, close }));
}

async function readJson(response, symbol) {
  if (!response.ok) throw new Error(`Feed HTTP ${response.status} for ${symbol}`);
  return response.json();
}

export async function closesForDecision(record, fetchImpl = globalThis.fetch, now = new Date()) {
  if (record.feed.kind === 'yahoo') {
    const start = Date.parse(`${record.decisionDate}T00:00:00Z`) / 1000;
    const end = Math.floor(now.getTime() / 1000) + 86_400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(record.feed.symbol)}?period1=${start}&period2=${end}&interval=1d&events=div%7Csplit`;
    const response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'thearchiveof-equity-feed' } });
    const closes = dropOpenSession(closesFromYahooPayload(await readJson(response, record.feed.symbol), record.priceField), 'us', now);
    if (closes.length === 0) throw new Error(`No Yahoo closes for ${record.feed.symbol}`);
    return closes;
  }
  const url = `https://aikstockdata.com/data/public/s/${record.feed.symbol}_history.json`;
  const response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  const closes = dropOpenSession(closesFromAikPayload(await readJson(response, record.feed.symbol)), 'kr', now);
  if (closes.length === 0) throw new Error(`No aikstockdata closes for ${record.feed.symbol}`);
  return closes;
}
