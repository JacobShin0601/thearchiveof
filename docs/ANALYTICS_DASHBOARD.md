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

Only aggregate UTC-day metrics are stored: hostname, path, HTTP requests, Cloudflare visits, transferred bytes, and existing first-party Useful/event totals. The pipeline does not store raw IPs, fingerprints, user agents, or visitor identifiers.

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

The dashboard is built only for Preview at `/ops/analytics/`. The API returns 404 when `DEPLOY_ENV` is not `preview`.

## First sync

1. Merge the feature into `develop` so Cloudflare creates the Preview build and its D1 binding.
2. In GitHub Actions, run **Analytics sync** from the `develop` branch.
3. Choose `preview` and `30` days. The workflow applies pending migrations before writing aggregates.
4. Open `https://develop.thearchiveof.pages.dev/ops/analytics/` and enter `ANALYTICS_READ_TOKEN`.

Scheduled workflows run from GitHub's default branch. Until the workflow exists on `main`, use manual dispatch from `develop`. When this feature is eventually published to `main`, the schedule continues to refresh Preview D1 because the dashboard and reader API remain Preview-only. Production can still be selected manually for a future production reader.

## GPT access

`docs/analytics-openapi.yaml` describes the same read-only endpoint used by the dashboard. A user-directed GPT Action can import that schema and store `ANALYTICS_READ_TOKEN` as bearer authentication. The GPT should:

1. check `metadata.refreshedAt` and `metadata.throughDay` first;
2. distinguish HTTP requests from visits;
3. compare traffic with Useful and interaction events without claiming causality;
4. treat small samples as directional;
5. never call write endpoints or synthesize engagement.

Do not place `ANALYTICS_READ_TOKEN` in the OpenAPI file, repository, chat, or client source.
