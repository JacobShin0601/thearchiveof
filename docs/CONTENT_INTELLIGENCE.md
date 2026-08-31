# The Archive — Traffic & Content Intelligence

## Purpose

Measurement exists to decide what to write, refresh, connect, merge, or stop investing in. It must not turn the publication into a real-time dashboard or add unnecessary client-side tracking.

## Responsibilities

### Owner actions that require account access

1. After the custom domain is connected to Production, enable Cloudflare Web Analytics and provide the site token for `src/site.config.ts`.
2. Verify the production domain in Google Search Console and submit `https://thearchiveof.com/sitemap-index.xml`.
3. Once a month, export or copy the relevant Cloudflare and Search Console observations into the monthly review record.
4. Approve editorial decisions that change the author's thesis, merge articles, or remove published URLs.

### Work actions

1. Maintain review metadata and the Preview review queue.
2. Compare performance by section, topic, article, language, and content type.
3. Identify evidence gaps, stale data, weak titles, internal-link opportunities, and overlapping articles.
4. Propose and implement approved refreshes on `develop`, including Korean and English alignment.
5. Preserve canonical URLs and redirects when an approved merge or retirement changes a route.

## Measurement stack

Start with:

- Cloudflare Web Analytics for page paths, referrers, countries, and broad traffic patterns.
- Google Search Console for impressions, clicks, click-through rate, queries, indexing, and ranking ranges.

Add Bing Webmaster Tools only when the production site is stable. Add GA4 only when a concrete question requires event-level or funnel analysis that the initial stack cannot answer.

## Monthly review

Review data over a meaningful window and avoid reacting to single-day changes. Record:

| Signal | Question | Typical action |
| --- | --- | --- |
| High impressions, position 5–20 | Can a clearer answer, stronger evidence, or better internal links move the article? | Refresh |
| High impressions, low CTR | Does the title and description match the query intent? | Refresh |
| Durable traffic or citations | Which adjacent question deserves a new article? | Expand |
| Strong article, stale evidence | Can the URL retain authority while data and sources are updated? | Defend |
| Overlapping articles | Is one canonical treatment stronger than several thin pages? | Merge |
| Low signal after sufficient time | Does the article still serve readers or the topic graph? | Keep, reposition, or retire |

Do not collapse these signals into a single score during the early stage. Foundation, Research, Current, Implementation, and Perspective articles have different jobs and should be judged accordingly.

### Monthly decision record

```text
Review month:
Observation window:

Topic signals:
- Growing:
- Stable:
- Weak or unclear:

Article decisions:
- Expand:
- Refresh:
- Defend:
- Merge:
- Retire or redirect:

Next publishing priorities:
1.
2.
3.
```

Wait for enough evidence before merging or retiring a URL. Traffic alone is not sufficient: consider authority, citations, strategic importance, and internal-link value.

## Content review rules

- `evergreen`: normally review every 6–12 months.
- `periodic`: normally review every 3–6 months.
- `time-sensitive`: review after the relevant event or at least monthly while active.
- A review verifies claims, dates, sources, outbound links, code, figures, and translation parity.
- Update `lastReviewed` after the check and schedule a new `nextReviewDate`.
- Set public `updatedDate` only when readers receive a meaningful change.

The Preview-only queue is available at `/ops/content-review/`. It contains no analytics data and requires no server or database.

## Distribution and UTM convention

The website remains the canonical original. Links shared elsewhere should use lowercase, stable values:

```text
utm_source=linkedin
utm_medium=social
utm_campaign=<article-slug>
utm_content=<placement>
```

Approved `utm_source` values:

- `linkedin`
- `github`
- `newsletter`
- the lowercase community name for a specific community

Approved `utm_medium` values:

- `social`
- `referral`
- `email`

Use the article slug for `utm_campaign`. Use `utm_content` only to distinguish placements such as `personal-post`, `profile`, `readme`, or `issue-01`. Never add UTM parameters to internal links or canonical URLs.

## AI visibility review

Once a month, test a small stable set of priority questions rather than automating broad scraping. Record the date, question, service, whether The Archive was cited, the cited URL, competing sources, and the next action. Look for repeated topic-level patterns, not one-off mentions.

## Initial conversion path

Use one simple path until there is enough traffic to justify more instrumentation:

```text
Search / AI / referral discovery
  → article visit
  → related article or topic hub
  → newsletter interest
```

The newsletter remains disabled until a provider and privacy wording are deliberately chosen. No paid service, database, or server-side function is required by this plan.
