# Analytics dashboard

The Archive analytics pipeline keeps collection credentials, storage credentials, and read credentials separate.

```text
Cloudflare zone analytics
  -> GitHub Actions (read-only analytics token)
  -> normalized daily aggregates
  -> D1 (CI token with D1 Edit)
  -> Preview-only bearer API
  -> /ops/analytics and a user-directed GPT Action
```

Only aggregate UTC-day metrics are stored: hostname, path, HTTP requests, Cloudflare visits, transferred bytes, status-code buckets, countries, known crawler catalog keys, AI referrer sources, 4xx paths, 4xx detail rows (path + exact status + path class), 5xx path rows, and existing first-party Useful/event totals. The pipeline does not store raw IPs, fingerprints, full user-agent strings, or visitor identifiers.

## Required configuration

GitHub Actions repository secrets:

- `CLOUDFLARE_ANALYTICS_TOKEN`: separate read-only token scoped to the intended account and `thearchiveof.com` zone.
- `CLOUDFLARE_API_TOKEN`: existing CI token. Analytics sync requires `D1 Edit` in addition to the existing Pages read access.
- `CLOUDFLARE_ACCOUNT_ID`: existing account ID.

The analytics token must be scoped to exactly one zone. The collector discovers that permitted Zone ID through GraphQL and refuses to guess if the token exposes zero or multiple zones. `CLOUDFLARE_ZONE_ID` remains an optional override for local diagnostics.

Cloudflare Pages Preview secret:

- `ANALYTICS_READ_TOKEN`: an independent, random bearer token. Do not reuse either Cloudflare API token. Register it for Preview only.

Generate a read token locally, then paste the value directly into the Cloudflare Pages secret field:

```sh
openssl rand -hex 32
```

The dashboard is built only for Preview at `/ops/analytics/`. The API returns 404 when `DEPLOY_ENV` is not `preview`. After adding or rotating `ANALYTICS_READ_TOKEN`, redeploy the latest `develop` build so the Pages Function receives the updated secret.

## Collected strategy signals

Daily sync stores:

- reader totals and top content paths;
- HTTP status buckets (`2xx`–`5xx`) and top 4xx paths;
- 4xx detail rows with exact status and path class (`scanner`, `content`, `asset`, `api`, `other`);
- 5xx path + exact status rows;
- top countries;
- known crawlers classified in memory into catalog keys such as `gptbot`, `claudebot`, `perplexitybot`, `googlebot`;
- crawler path and crawler status aggregates;
- AI referrer sources (`chatgpt`, `perplexity`, `gemini`, `copilot`, `claude`) and landing paths when the Cloudflare plan exposes `clientRefererHost`.

If referrer dimensions are unavailable, sync continues and writes `analytics_capability.clientRefererHost = 0`. The dashboard shows that empty state instead of inventing referral data.

## Dashboard sections

1. **Signal layers** — Zone visits, Search crawl requests, and AI crawl requests (training / user-fetch / agent) as separate cards.
2. **Readers** — visits, requests, transfer, daily trend, countries, top articles with all-time Useful and period Impact.
3. **Errors** — scanner vs content vs asset vs api 4xx, exact status codes, and top 5xx paths. Judge deploys on 1-day and 7-day windows (`docs/OPS_URL_HEALTH.md`).
4. **AI crawl** — operator/category totals, crawled paths, success-response share.
5. **AI referral** — AI-service visits and landing articles, or an explicit unavailable reason.
6. **Strategy candidates** — rule-based Expand / Refresh / Defend / Fix suggestions joined to article metadata, plus period Impact. Candidates are directional only; they do not write the publishing strategy.

Zone visits are Cloudflare Zone Analytics visits, not unique humans. Impact uses the selected window only: `periodUsefulAdded×3 + code_run×2 + language_switch`. All-time active Useful remains a separate long-term trust signal.

## Data quality

The reader API returns `dataQuality`:

```json
{
  "requestedDays": 90,
  "currentCoverageDays": 90,
  "previousCoverageDays": 30,
  "comparisonComplete": false,
  "changeUnavailableReason": "insufficient_coverage"
}
```

When `comparisonComplete` is false, overview `change` values are `null`. Do not interpret growth until both the current and previous windows have full daily coverage. A 90-day comparison needs 180 synced UTC days.

## Automatic sync

The scheduled workflow must exist on the default branch. The job checks out `develop` for the collector scripts until those scripts are selectively published to `main`. Manual dispatch can still target Preview or Production D1 and choose 1–180 days for backfill.

## First sync

1. Merge the feature into `develop` so Cloudflare creates the Preview build and its D1 binding.
2. In GitHub Actions, run **Analytics sync** from the `develop` branch.
3. Choose `preview` and `30` days. The workflow applies pending migrations before writing aggregates.
4. Open `https://develop.thearchiveof.pages.dev/ops/analytics/` and enter `ANALYTICS_READ_TOKEN`.

Scheduled workflows run from GitHub's default branch. Until the workflow exists on `main`, use manual dispatch from `develop`. When this feature is eventually published to `main`, the schedule continues to refresh Preview D1 because the dashboard and reader API remain Preview-only. Production can still be selected manually for a future production reader.

## GPT access

`docs/analytics-openapi.yaml` describes the same read-only endpoint used by the dashboard. A user-directed GPT Action can import that schema and store `ANALYTICS_READ_TOKEN` as bearer authentication. The GPT should:

1. check `metadata.refreshedAt`, `metadata.throughDay`, and `metadata.capabilities.referrers` first;
2. distinguish HTTP requests from visits and AI crawl from AI referral;
3. treat strategy candidates as hypotheses, not conclusions;
4. treat small samples as directional;
5. never call write endpoints or synthesize engagement.

Do not place `ANALYTICS_READ_TOKEN` in the OpenAPI file, repository, chat, or client source.

## Out of scope

Google Search Console impressions, clicks, CTR, and queries are not part of this Cloudflare-only dashboard. Add them only as a later integration when title and query decisions need search evidence.
