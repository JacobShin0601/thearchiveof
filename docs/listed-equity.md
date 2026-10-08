# Listed equity decisions

Use this when a note states a position in a listed stock. The rule itself is in `docs/EDITORIAL_WORKFLOW.md`. This file is the template.

An industry essay that does not say buy, hold, reduce, or sell does not get a decision file.

## What the two pages do

| Page | Opens with | Then |
| --- | --- | --- |
| Investing essay | `EquityStance` | The argument, in HTML |
| Lab | `EquityDecisionChart` | The rest of the lab, below the chart |

Both import the same JSON file. The chart is not a second copy of the essay, and the essay is not the place that tracks the price every day.

The published figure is the change from the decision close to the latest close:

```text
price change = latest close / decision close − 1
```

A sale does not flip the sign. If the price falls after a sale, the figure is negative. The sentence next to it says whether the price is higher or lower. It does not call that an account profit. Dividends are inside an adjusted-close series only. Costs, taxes, and position size are never in the number.

Until a later close exists, the headline says that no later close is in the record. It does not show 0%.

## Decision file

One decision, one file: `src/data/equity-decisions/<id>.json`. The `id` and the filename match. A later decision in the same name gets a new file and a new date. Do not overwrite the old close.

```json
{
  "id": "strl-2026-10-06",
  "ticker": "STRL",
  "name": { "ko": "Sterling Infrastructure", "en": "Sterling Infrastructure" },
  "venue": "NASDAQ",
  "currency": "USD",
  "stance": "sell",
  "decisionDate": "2026-10-06",
  "decisionClose": 564,
  "priceField": "adjclose",
  "feed": { "kind": "yahoo", "symbol": "STRL" },
  "source": { "name": "Yahoo Finance", "url": "https://finance.yahoo.com/quote/STRL/history/" },
  "closes": [{ "date": "2026-10-06", "close": 564 }]
}
```

`stance` is `buy`, `hold`, `reduce`, or `sell`. `currency` is `USD` or `KRW`. `priceField` is `adjclose` or `close`, and it must be the series the essay cites. A Korean listing uses the public close feed, not an adjusted close:

```json
"currency": "KRW",
"priceField": "close",
"feed": { "kind": "aikstockdata", "symbol": "005930" }
```

`closes` starts at the decision date, stays sorted, and the decision-date price stays equal to `decisionClose`. The update script will not move that price. `npm test` checks every file in the directory.

`strl-2026-10-06` is the Sterling sale at the 6 October 2026 adjusted close of $564. `hii-2026-10-06` is the Huntington hold at the 6 October close of $263.75. `crm-2026-10-07` is the Salesforce buy at the 7 October regular-session close of $224.56. Sterling, Huntington, and Salesforce open their Labs with the chart. The essays keep the stance and link to that Lab.

## Essay

From `src/content/posts/investing/`:

```mdx
import EquityStance from '../../../components/EquityStance.astro';
import decision from '../../../data/equity-decisions/strl-2026-10-06.json';

<EquityStance decision={decision} language="ko" labHref="/coding/experiments/<lab-slug>/" />
```

Put this before `AnswerBlock`. Omit `labHref` until the Lab exists. The English file uses `language="en"` and the English lab path.

## Lab

The chart is the first thing in the body. From `src/content/posts/coding/`:

```mdx
import EquityDecisionChart from '../../../components/interactive/EquityDecisionChart.astro';
import decision from '../../../data/equity-decisions/strl-2026-10-06.json';

<EquityDecisionChart decision={decision} language="ko" />
```

The decision close is in the HTML. The path after it loads when the page opens. Moving across the chart, or focusing it and using the arrow keys, changes only the readout under the line. The headline stays on the latest completed close.

The words under the percent say what the move means for the decision:

| Decision | Price fell | Price rose |
| --- | --- | --- |
| Sell | 피한 하락 | 놓친 상승 |
| Reduce | 줄여 피한 하락 | 줄인 뒤 놓친 상승 |
| Buy | 매수 이후 하락 | 매수 이후 상승 |
| Hold | 유지한 하락 | 유지한 상승 |

The percent keeps its sign. A sale does not turn a falling price into a positive account profit.

On Preview, `/ops/equity-decisions/` renders every decision file. It is not in the Production build.

## Closes after the decision

`closes` in the JSON file is the decision close. Do not append later sessions there. Doing that would freeze the path until the next git deploy.

When the page opens, the chart calls `GET /api/equity-decisions/<id>`. The function only answers ids generated from `src/data/equity-decisions/`. It asks Yahoo or aikstockdata for daily closes, drops a print from a session that is still open, and keeps that JSON for an hour so the next chart on the same edge does not ask again. The browser may reuse its copy for five minutes. `robots.txt` disallows `/api/`. A request that is not the chart's own fetch is refused before the price feed is called.

Each of those requests also takes one slot in `equity_refresh_day`, counted by UTC date, the same day the Workers Free quota uses. After 100,000 slots the function stops asking the price feed and the chart keeps the decision close. The count needs the `0003_equity_refresh_day.sql` table in both D1 databases. Until that table exists, a deployed function leaves the feed off. Local `astro dev` has no D1 binding, so the chart still loads the feed there. The chart then pins the published decision close and draws everything after it.

A reader who opens the page on a trading day sees the previous completed close. After the cash session ends, the next hour can pick up that session's close. No commit is required for that.

`npm run equity:check` prints the same feed and does not write the file.
