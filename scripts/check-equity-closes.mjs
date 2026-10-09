import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { closesForDecision } from '../functions/lib/equity-feed.js';
import { decisionReading, formatChange, formatPrice, mergeCloses, prepareEquityDecision } from '../src/lib/equity-decision.ts';

const directory = new URL('../src/data/equity-decisions/', import.meta.url);
const requested = process.argv.slice(2);
const files = readdirSync(directory)
  .filter((name) => name.endsWith('.json'))
  .filter((name) => requested.length === 0 || requested.includes(basename(name, '.json')))
  .sort();

if (files.length === 0) {
  console.error(requested.length ? `No equity decision named ${requested.join(', ')}` : 'No equity decisions to check');
  process.exit(1);
}

let failed = 0;
for (const name of files) {
  const record = JSON.parse(readFileSync(join(directory.pathname, name), 'utf8'));
  const decision = prepareEquityDecision(record);
  try {
    const incoming = await closesForDecision(decision);
    const closes = mergeCloses(decision.closes, incoming, decision.decisionDate, decision.decisionClose);
    const latest = closes[closes.length - 1];
    const change = closes.length === 1 ? null : latest.close / decision.decisionClose - 1;
    const reading = decisionReading(decision.stance, change, 'ko');
    console.log(`${decision.id}: ${formatPrice(decision.currency, decision.decisionClose)} on ${decision.decisionDate} → ${formatPrice(decision.currency, latest.close)} on ${latest.date} (${change === null ? reading.label : formatChange(change)}, ${reading.label})`);
  } catch (error) {
    failed += 1;
    console.error(`${decision.id}: ${error instanceof Error ? error.message : error}`);
  }
}

if (failed) process.exit(1);
