/** Listed-equity decision records. The published return is a close-to-close price change. */

export const EQUITY_STANCES = ['buy', 'hold', 'reduce', 'sell'] as const;
export type EquityStance = (typeof EQUITY_STANCES)[number];
export type EquityLanguage = 'ko' | 'en';
export type EquityCurrency = 'USD' | 'KRW';
export type EquityPriceField = 'close' | 'adjclose';

export interface EquityClose {
  date: string;
  close: number;
}

export interface EquityDecision {
  id: string;
  ticker: string;
  name: { ko: string; en: string };
  venue: string;
  currency: EquityCurrency;
  stance: EquityStance;
  decisionDate: string;
  decisionClose: number;
  priceField: EquityPriceField;
  feed: { kind: 'yahoo'; symbol: string } | { kind: 'aikstockdata'; symbol: string };
  source: { name: string; url: string };
  closes: EquityClose[];
}

export interface PreparedEquityDecision extends EquityDecision {
  latest: EquityClose;
  /** Null until a close after the decision date exists. Zero is a real unchanged price, not missing data. */
  priceChange: number | null;
  observationsAfterDecision: number;
}

export const EQUITY_CHART = { width: 720, height: 280, padL: 58, padR: 16, padT: 16, padB: 32 } as const;

export interface EquityChartPoint extends EquityClose {
  x: number;
  y: number;
  change: number | null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const STANCE_LABEL: Record<EquityStance, Record<EquityLanguage, string>> = {
  buy: { ko: '매수', en: 'Buy' },
  hold: { ko: '유지', en: 'Hold' },
  reduce: { ko: '축소', en: 'Reduce' },
  sell: { ko: '매도', en: 'Sell' },
};

const SINCE: Record<EquityStance, Record<EquityLanguage, string>> = {
  buy: { ko: '매수 이후', en: 'Since the purchase' },
  hold: { ko: '유지 이후', en: 'Since the decision to hold' },
  reduce: { ko: '축소 이후', en: 'Since the reduction' },
  sell: { ko: '매도 이후', en: 'Since the sale' },
};

export function isIsoDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function utcDateFromUnix(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

export function samePrice(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-6;
}

export function roundPrice(close: number): number {
  return Math.round(close * 10000) / 10000;
}

/** True once the US cash session that contains this instant has reached 16:00 local time. */
export function usSessionClosed(unixSeconds: number, timeZone = 'America/New_York'): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(unixSeconds * 1000));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  return Number.isFinite(hour) && hour >= 16;
}

/** Close-to-close change versus the decision close. Not an account profit. */
export function priceChange(decisionClose: number, close: number): number {
  if (!(decisionClose > 0) || !Number.isFinite(close)) return NaN;
  return close / decisionClose - 1;
}

export function stanceLabel(stance: EquityStance, language: EquityLanguage): string {
  return STANCE_LABEL[stance][language];
}

export function formatDate(iso: string, language: EquityLanguage): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (language === 'ko') return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatPrice(currency: EquityCurrency, value: number): string {
  if (currency === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(value))}원`;
}

export function formatAxisPrice(currency: EquityCurrency, value: number): string {
  if (currency === 'KRW') return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value));
  return value >= 100 ? value.toFixed(0) : value.toFixed(2);
}

export function formatChange(change: number): string {
  if (!Number.isFinite(change)) return '—';
  const pct = change * 100;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

export function priceFieldLabel(priceField: EquityPriceField, language: EquityLanguage): string {
  if (priceField === 'adjclose') return language === 'ko' ? '조정 종가' : 'adjusted close';
  return language === 'ko' ? '종가' : 'close';
}

const READING: Record<EquityStance, Record<'up' | 'down', Record<EquityLanguage, { label: string; sentence: string }>>> = {
  sell: {
    down: {
      ko: { label: '피한 하락', sentence: '매도 이후 주가가 내렸다. 그 폭은 그 가격에 남아 있었다면 맞았을 하락이라, 피한 하락이다.' },
      en: { label: 'Avoided decline', sentence: 'Since the sale, the price is lower. That move is the decline someone still at the decision price would have taken.' },
    },
    up: {
      ko: { label: '놓친 상승', sentence: '매도 이후 주가가 올랐다. 그 폭은 그 가격에 남아 있었다면 맞았을 상승이라, 놓친 상승이다.' },
      en: { label: 'Missed rise', sentence: 'Since the sale, the price is higher. That move is the rise someone still at the decision price would have caught.' },
    },
  },
  reduce: {
    down: {
      ko: { label: '줄여 피한 하락', sentence: '축소 이후 주가가 내렸다. 줄인 뒤에 맞지 않은 하락이라, 피한 하락이다.' },
      en: { label: 'Decline avoided after reducing', sentence: 'Since the reduction, the price is lower. That is decline no longer taken on the part that was sold.' },
    },
    up: {
      ko: { label: '줄인 뒤 놓친 상승', sentence: '축소 이후 주가가 올랐다. 줄인 뒤에 맞지 않은 상승이라, 놓친 상승이다.' },
      en: { label: 'Rise missed after reducing', sentence: 'Since the reduction, the price is higher. That is rise no longer caught on the part that was sold.' },
    },
  },
  buy: {
    up: {
      ko: { label: '매수 이후 상승', sentence: '매수 이후 주가가 올랐다. 그 폭은 그 가격을 들고 있는 상승이다.' },
      en: { label: 'Rise since the purchase', sentence: 'Since the purchase, the price is higher. That move is the rise on the decision price.' },
    },
    down: {
      ko: { label: '매수 이후 하락', sentence: '매수 이후 주가가 내렸다. 그 폭은 그 가격을 들고 있는 하락이다.' },
      en: { label: 'Decline since the purchase', sentence: 'Since the purchase, the price is lower. That move is the decline on the decision price.' },
    },
  },
  hold: {
    up: {
      ko: { label: '유지한 상승', sentence: '유지 이후 주가가 올랐다. 그 폭은 그 가격을 들고 있는 상승이다.' },
      en: { label: 'Rise while held', sentence: 'Since the decision to hold, the price is higher. That move is the rise on the price being held.' },
    },
    down: {
      ko: { label: '유지한 하락', sentence: '유지 이후 주가가 내렸다. 그 폭은 그 가격을 들고 있는 하락이다.' },
      en: { label: 'Decline while held', sentence: 'Since the decision to hold, the price is lower. That move is the decline on the price being held.' },
    },
  },
};

/** What the price move means for the decision. The percent itself stays the price change. */
export function decisionReading(stance: EquityStance, change: number | null, language: EquityLanguage): { label: string; sentence: string } {
  const since = SINCE[stance][language];
  if (change === null || !Number.isFinite(change)) {
    return {
      label: language === 'ko' ? '이후 종가 없음' : 'No later close',
      sentence: language === 'ko' ? `${since} 종가는 아직 없다.` : `${since}, no later close is in the record yet.`,
    };
  }
  if (change === 0) {
    return {
      label: language === 'ko' ? '가격 그대로' : 'Unchanged',
      sentence: language === 'ko' ? `${since} 종가는 의사결정 종가와 같다.` : `${since}, the close is unchanged.`,
    };
  }
  return READING[stance][change > 0 ? 'up' : 'down'][language];
}

export function priceDirection(decision: PreparedEquityDecision, language: EquityLanguage): string {
  return decisionReading(decision.stance, decision.priceChange, language).sentence;
}

function fail(message: string): never {
  throw new Error(`Equity decision: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string) {
  const actual = Object.keys(value);
  const missing = keys.filter((key) => !actual.includes(key));
  const extra = actual.filter((key) => !keys.includes(key));
  if (missing.length || extra.length) fail(`${label} keys must be ${keys.join(', ')}`);
}

function readCloses(value: unknown, decisionDate: string, decisionClose: number): EquityClose[] {
  if (!Array.isArray(value) || value.length === 0) fail('closes must be a non-empty list');
  const closes: EquityClose[] = [];
  for (const row of value) {
    if (!isRecord(row)) fail('each close must be an object');
    exactKeys(row, ['date', 'close'], 'close');
    if (typeof row.date !== 'string' || !isIsoDate(row.date)) fail(`bad close date ${String(row.date)}`);
    if (typeof row.close !== 'number' || !(row.close > 0)) fail(`bad close on ${row.date}`);
    if (row.date < decisionDate) fail(`${row.date} is before the decision`);
    closes.push({ date: row.date, close: row.close });
  }
  const dates = closes.map((row) => row.date);
  const sorted = [...dates].sort();
  if (dates.some((date, index) => date !== sorted[index])) fail('closes must be sorted by date');
  if (new Set(dates).size !== dates.length) fail('closes contain a duplicate date');
  const decision = closes.find((row) => row.date === decisionDate);
  if (!decision) fail('closes must include the decision date');
  if (!samePrice(decision.close, decisionClose)) fail('decision-date close must equal decisionClose');
  return closes;
}

export function prepareEquityDecision(input: unknown): PreparedEquityDecision {
  if (!isRecord(input)) fail('record must be an object');
  exactKeys(input, ['id', 'ticker', 'name', 'venue', 'currency', 'stance', 'decisionDate', 'decisionClose', 'priceField', 'feed', 'source', 'closes'], 'record');
  if (typeof input.id !== 'string' || !ID.test(input.id)) fail('id must be a slug');
  if (typeof input.ticker !== 'string' || !/^[A-Z0-9][A-Z0-9.-]{0,11}$/.test(input.ticker)) fail('ticker must be an uppercase symbol');
  if (!isRecord(input.name)) fail('name must be an object');
  exactKeys(input.name, ['ko', 'en'], 'name');
  if (typeof input.name.ko !== 'string' || typeof input.name.en !== 'string' || !input.name.ko || !input.name.en) fail('name needs Korean and English');
  if (typeof input.venue !== 'string' || !input.venue.trim()) fail('venue is required');
  if (input.currency !== 'USD' && input.currency !== 'KRW') fail('currency must be USD or KRW');
  if (!EQUITY_STANCES.includes(input.stance as EquityStance)) fail('stance must be buy, hold, reduce, or sell');
  if (typeof input.decisionDate !== 'string' || !isIsoDate(input.decisionDate)) fail('decisionDate must be YYYY-MM-DD');
  if (typeof input.decisionClose !== 'number' || !(input.decisionClose > 0)) fail('decisionClose must be a positive number');
  if (input.priceField !== 'close' && input.priceField !== 'adjclose') fail('priceField must be close or adjclose');
  if (!isRecord(input.feed)) fail('feed must be an object');
  exactKeys(input.feed, ['kind', 'symbol'], 'feed');
  if (input.feed.kind === 'yahoo') {
    if (typeof input.feed.symbol !== 'string' || !/^[A-Z0-9][A-Z0-9.-]{0,11}$/.test(input.feed.symbol)) fail('yahoo symbol is invalid');
  } else if (input.feed.kind === 'aikstockdata') {
    if (input.priceField !== 'close') fail('aikstockdata series use close, not adjclose');
    if (typeof input.feed.symbol !== 'string' || !/^\d{6}$/.test(input.feed.symbol)) fail('aikstockdata symbol must be a six-digit code');
  } else {
    fail('feed.kind must be yahoo or aikstockdata');
  }
  if (!isRecord(input.source)) fail('source must be an object');
  exactKeys(input.source, ['name', 'url'], 'source');
  if (typeof input.source.name !== 'string' || !input.source.name) fail('source name is required');
  if (typeof input.source.url !== 'string' || !/^https:\/\//.test(input.source.url)) fail('source url must be https');
  const closes = readCloses(input.closes, input.decisionDate, input.decisionClose);
  const latest = closes[closes.length - 1];
  const observationsAfterDecision = closes.filter((row) => row.date > input.decisionDate).length;
  return {
    id: input.id,
    ticker: input.ticker,
    name: { ko: input.name.ko, en: input.name.en },
    venue: input.venue,
    currency: input.currency,
    stance: input.stance as EquityStance,
    decisionDate: input.decisionDate,
    decisionClose: input.decisionClose,
    priceField: input.priceField,
    feed: input.feed.kind === 'yahoo'
      ? { kind: 'yahoo', symbol: input.feed.symbol as string }
      : { kind: 'aikstockdata', symbol: input.feed.symbol as string },
    source: { name: input.source.name, url: input.source.url },
    closes,
    latest,
    priceChange: observationsAfterDecision === 0 ? null : priceChange(input.decisionClose, latest.close),
    observationsAfterDecision,
  };
}

/** Keep the published decision close. Overlay later closes from the feed. Drop anything earlier. */
export function mergeCloses(existing: EquityClose[], incoming: EquityClose[], decisionDate: string, decisionClose: number): EquityClose[] {
  const byDate = new Map<string, number>();
  for (const row of existing) {
    if (row.date >= decisionDate && row.close > 0) byDate.set(row.date, row.close);
  }
  for (const row of incoming) {
    if (row.date > decisionDate && row.close > 0) byDate.set(row.date, row.close);
  }
  byDate.set(decisionDate, decisionClose);
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, close]) => ({ date, close }));
}

export function closesFromYahooChart(payload: unknown, priceField: EquityPriceField): EquityClose[] {
  if (!isRecord(payload) || !isRecord(payload.chart) || !Array.isArray(payload.chart.result)) return [];
  const result = payload.chart.result[0];
  if (!isRecord(result) || !Array.isArray(result.timestamp) || !isRecord(result.indicators)) return [];
  const indicators = result.indicators;
  const values = priceField === 'adjclose'
    ? (Array.isArray(indicators.adjclose) && isRecord(indicators.adjclose[0]) ? indicators.adjclose[0].adjclose : undefined)
    : (Array.isArray(indicators.quote) && isRecord(indicators.quote[0]) ? indicators.quote[0].close : undefined);
  if (!Array.isArray(values)) return [];
  const byDate = new Map<string, number>();
  for (let index = 0; index < result.timestamp.length; index += 1) {
    const stamp = result.timestamp[index];
    const close = values[index];
    if (typeof stamp !== 'number' || typeof close !== 'number' || !(close > 0)) continue;
    byDate.set(utcDateFromUnix(stamp), roundPrice(close));
  }
  const lastStamp = result.timestamp[result.timestamp.length - 1];
  const lastValue = values[values.length - 1];
  const meta = isRecord(result.meta) ? result.meta : undefined;
  if (
    typeof lastStamp === 'number'
    && (lastValue === null || typeof lastValue === 'undefined')
    && meta
    && typeof meta.regularMarketPrice === 'number'
    && meta.regularMarketPrice > 0
    && typeof meta.regularMarketTime === 'number'
    && utcDateFromUnix(lastStamp) === utcDateFromUnix(meta.regularMarketTime)
    && usSessionClosed(meta.regularMarketTime, typeof meta.exchangeTimezoneName === 'string' ? meta.exchangeTimezoneName : 'America/New_York')
  ) {
    byDate.set(utcDateFromUnix(lastStamp), roundPrice(meta.regularMarketPrice));
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, close]) => ({ date, close }));
}

export function closesFromAikstockdata(payload: unknown): EquityClose[] {
  if (!Array.isArray(payload)) return [];
  const byDate = new Map<string, number>();
  for (const row of payload) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const raw = String(row[0]);
    const close = row[1];
    if (!/^\d{8}$/.test(raw) || typeof close !== 'number' || !(close > 0)) continue;
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    if (!isIsoDate(date)) continue;
    byDate.set(date, roundPrice(close));
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, close]) => ({ date, close }));
}

function niceStep(span: number, count: number): number {
  const rough = span / Math.max(count, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function equityChartLayout(closes: EquityClose[], decisionClose: number) {
  const values = closes.map((row) => row.close);
  let min = Math.min(...values, decisionClose);
  let max = Math.max(...values, decisionClose);
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.02;
    min -= pad;
    max += pad;
  } else {
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;
  }
  const { width, height, padL, padR, padT, padB } = EQUITY_CHART;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const yFor = (value: number) => padT + (1 - (value - min) / (max - min)) * innerH;
  const step = niceStep(max - min, 4);
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 0.001; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  const points: EquityChartPoint[] = closes.map((row, index) => ({
    ...row,
    x: padL + (closes.length === 1 ? innerW / 2 : (index / (closes.length - 1)) * innerW),
    y: yFor(row.close),
    change: closes.length === 1 ? null : priceChange(decisionClose, row.close),
  }));
  return { points, ticks, yFor, min, max, width, height };
}

export function chartLine(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

export function xLabelIndexes(length: number): number[] {
  if (length <= 1) return [0];
  if (length === 2) return [0, 1];
  return [0, Math.round((length - 1) / 2), length - 1];
}
