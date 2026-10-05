# Samsung earnings event Lab: data and calculation notes

Checked 2026-09-27. This is a Preview draft. The page makes three browser-side requests to the [aikstockdata historical-close API](https://aikstockdata.com/en/api): `s/005930_history.json`, `s/000660_history.json`, and `market_index_history.json`. The API attributes settled daily closes to the Korean Financial Services Commission open data portal. It is T+1 data, not a live quote. No API key or server-side proxy is used. The site does not commit or serve a copy of the historical time series.

The published data's [licence](https://aikstockdata.com/en/api) permits attributed non-commercial use and restricts commercial redistribution. Recheck the licence and the site's intended use before a Production release. The Lab links to those terms beside the visual.

## Cross-checks

| Item | July 6 close | July 7 close | July 7 close-to-close return |
| --- | ---: | ---: | ---: |
| Samsung Electronics | ₩318,000 | ₩296,000 | −6.918% |
| SK hynix | ₩2,343,000 | ₩2,201,000 | −6.061% |
| KOSPI | 8,051.33 | 7,656.31 | −4.906% |

The Samsung and KOSPI figures match contemporaneous [Reuters reporting](https://www.investing.com/news/stock-market-news/samsung-flags-19fold-jump-in-profit-but-shares-slump-on-jitters-ai-boom-may-stall-4783723) after rounding. The Lab refuses to draw a fetched series if its event-day returns differ from those verified values by more than 0.2 percentage point.

[Samsung's July 7 guidance](https://news.samsung.com/global/samsung-electronics-announces-earnings-guidance-for-second-quarter-2026) was revenue about ₩171tn and operating profit about ₩89.4tn. [Reuters/LSEG](https://www.investing.com/news/stock-market-news/samsung-flags-19fold-jump-in-profit-but-shares-slump-on-jitters-ai-boom-may-stall-4783723) gave an operating-profit SmartEstimate of ₩87.3tn. The surprise is `(89.4 / 87.3 - 1) * 100 = +2.4055%`.

## Chart methods

- Dates are intersected across Samsung, SK hynix, and KOSPI; the event is 2026-07-07.
- Each plotted return is `(close on date / close on 2026-07-06 - 1) * 100`.
- The short views cover ±5 or ±10 trading dates. The wider view covers 60 trading dates before the event and 10 after. The pre-event card measures `July 6 close / first displayed close - 1`. The window is set before reading its result; the 10-day decline (−10.0%) and 60-day rise (+61.8%) must both be shown to avoid cherry-picking a pre-pricing story.
- The simple difference is Samsung's rebased return minus the selected comparator's rebased return, in percentage points. This is descriptive. It is not a market-model abnormal return, sector-neutral return, or causal estimate.
- The user can access the chart values in a table.
- The estimate slider changes only the calculated profit surprise. The historical price series never changes.
- A profit surprise is the relative difference between one quarter's operating profit and one LSEG estimate. The share-price return reflects a change in the value of future cash flows and risk; the two percentages are not directly comparable.
- Daily closes cannot identify intraday response or all news and positioning that affected the day. One event cannot test EMH.

The API is an enhancement: article text and announcement-day facts remain in static HTML. If the API cannot be reached or its event-day values fail the cross-check, the interactive chart displays an error message instead of silently substituting invented prices.
