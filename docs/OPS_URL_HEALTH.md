# Ops: URL health and 4xx / 3xx verification

This note complements `docs/URL_POLICY.md` and `docs/ANALYTICS_DASHBOARD.md`.
It explains how to judge whether a deploy improved errors without waiting for a polluted 30-day blend.

## Architecture (current)

| Layer | Role |
| --- | --- |
| Astro `output: 'static'`, `trailingSlash: 'always'` | Builds HTML directories with trailing slashes |
| Cloudflare Pages | Hosts `dist/`, applies `public/_redirects` |
| `scripts/lib/legacy-redirects.mjs` | Explicit 301 catalog; write with `npm run write:redirects` |
| Preview D1 + Analytics sync | Daily zone aggregates; no raw IP / full UA storage |
| `npm run check:urls` | Build-time URL contract (canonical, hreflang, links, redirects, sitemap) |

Preview-only `/ops/analytics` reads D1. Production still 404s that API.

## Already merged (do not redo)

- Analytics strategy dashboard, signal layers, quality v3 (`dataQuality`, Zone visits naming, period Useful/Impact)
- Analytics sync (+ diagnose) workflows on `main`
- URL contract check and SEO link helpers (`aa322bf` lineage)
- WAF scanner guidance in `docs/CLOUDFLARE_WAF.md` (dashboard-only; not Astro)

## Status codes

| Response | When |
| --- | --- |
| **301** | Published URL moved to a stable successor (catalog only) |
| **308** | Framework trailing-slash normalization for existing pages |
| **404** | Never existed, or no successor; page is `noindex` |
| **410** | Only if we deliberately retire a URL with no successor (none today) |

Never silently send unknown paths to `/`. That creates soft-404 analytics noise.

Never redirect `/auth/callback`, WordPress probe paths (`wp-includes`, `xmlrpc.php`, `wlwmanifest.xml`, etc.) to `/` or invent compatibility endpoints. Those are scanner targets, not product URLs.

## Auth / OAuth

The Archive has **no** login or OAuth product. There is no `/auth/callback` page, Pages Function, or middleware that validates `state` / provider codes.

| Request | Observed on production (2026-10-10 probe) | Policy |
| --- | --- | --- |
| `GET` / `HEAD` `/` | **200** | Required for readers |
| `POST` / `PUT` / `OPTIONS` `/` | **405** | Static hosting; not a reader failure |
| `GET` / `HEAD` `/auth/callback` | **404** | Path does not exist — keep 404 |
| `POST` `/auth/callback` | **405** | No callback handler |
| `GET` WordPress probe paths | **404** | Keep 404; no redirects |

A normal OAuth success path is **out of scope** until an auth product exists. Do not add a callback route “to clear 4xx.”

## 2026-09-18 spike (confirmed analytics)

Same UTC hour (~09:00) saw:

- `/auth/callback`: 109× **403**, Zone visits **0**
- `/`: ~170× **403** plus a few **405**; month totals ≈ 178× 403 + 17× 405 on `/`
- Concurrent WordPress paths (`//wp…/wlwmanifest.xml`, `//xmlrpc.php`, …)

**Judgment:** automated scanner / blocked probe traffic, not an ongoing reader outage. Current edge probes show healthy `GET /` → 200 and missing auth/WP paths → 404/405. Bulk **403** on that day is **not** explained by Astro routes (none exist for `/auth/callback`). Treat 403 as **likely Cloudflare security** until Security Events say otherwise — do not redesign the homepage or invent auth from this alone.

### Cloudflare Security Events checklist

1. Zone → **Security** → **Events** (or Analytics → Security).
2. Time range: **2026-09-18 08:50–09:10 UTC** (adjust account TZ).
3. Filter path `/` and `/auth/callback` (and optionally `wlwmanifest` / `xmlrpc`).
4. If **Block** / **Managed Challenge** / WAF managed rules appear → record as normal defense; no app change.
5. If **no** security events → check Pages/deployment logs for that window; still do **not** add home redirects for scanner paths.
6. Keep Free Analytics limitation in mind: **no User-Agent breakdown** in the UI; rely on D1 path class + Security Events.

## Local checks

```sh
npm run write:redirects
npm test
npm run check:functions
npm run build          # includes check:urls
```

`check:urls` verifies:

- 404 SEO metadata (no canonical / hreflang / JSON-LD)
- canonical origin and self hreflang
- reciprocal ko/en hreflang
- internal links resolve to pages, static files, or redirect sources
- redirect catalog sync, no chains, permanent 301
- sitemap parity with indexable HTML
- robots.txt Sitemap line

Pages trailing-slash **308** behavior is platform-side. After production deploy, probe:

```sh
curl -sI --max-redirs 0 'https://thearchiveof.com/'
curl -sk -o /dev/null -w '%{http_code}\n' -X GET 'https://thearchiveof.com/'
curl -sk -o /dev/null -w '%{http_code}\n' -X POST 'https://thearchiveof.com/'
curl -sk -o /dev/null -w '%{http_code}\n' -X GET 'https://thearchiveof.com/auth/callback'
curl -sk -o /dev/null -w '%{http_code}\n' -X POST 'https://thearchiveof.com/auth/callback'
curl -sk -o /dev/null -w '%{http_code}\n' -X GET 'https://thearchiveof.com/wp-login.php'
curl -sk -o /dev/null -w '%{http_code}\n' -X GET 'https://thearchiveof.com//wp/wp-includes/wlwmanifest.xml'
curl -sI --max-redirs 0 'https://thearchiveof.com/series/internal-llm-serving'
curl -sI --max-redirs 0 'https://thearchiveof.com/sitemap.xml'
curl -sI 'https://thearchiveof.com/robots.txt'
```

Expect: `GET /` → 200; `POST /` → 405; `GET /auth/callback` → 404; WP probes → 404; legacy/sitemap aliases → 301.

Regression coverage: `tests/edge-path-policy.test.mjs`, `npm run check:urls` (forbids auth/WP markers in links, canonical, hreflang, sitemap).

## Observability (privacy-preserving)

After migration `0006_analytics_error_detail.sql` and a sync:

- `analytics_error_detail_daily`: path + **exact status** + **class** (`scanner|content|asset|api|other`)
- `analytics_server_error_path_daily`: path + exact 5xx status
- API `errors` object on Preview `/api/ops/analytics`
- Dashboard section **오류**

Classes use **path patterns only**. Known crawlers remain in separate crawler tables (UA classified in memory, never stored).

## Deploy verification windows

Do **not** use a 30-day rolling total the day after merge. Prefer complete UTC days:

| Window | What to watch | Pass criteria (directional) |
| --- | --- | --- |
| **24h** (1 complete UTC day after deploy) | `content` 4xx, 5xx path rows, legacy no-slash probes; `GET /` still 200 | No new content 4xx spike vs prior complete day; sitemap alias and legacy no-slash return 301→200; do not alert on `/auth/callback` or WP 404/403 alone |
| **7d** | `errors.totals.content4xx`, `scanner4xx`, server errors; known crawler 2xx share | content 4xx flat or down; scanner may stay high (WAF optional); crawler success not degraded; `/` 403 bursts without content-path failures → Security Events, not homepage rewrite |
| **30d** | Same, after ≥14 post-deploy days dominate the window | Use only for trend; still separate scanner vs content |

Suggested alert ideas (not automated yet):

- `content` 4xx > 3× prior 7-day median on a complete day
- Any 5xx path with ≥20 requests on a complete day
- Known-crawler success share drop >10 points day-over-day

Do **not** alert on total 4xx alone.

## Cloudflare dashboard tasks (not in repo)

1. Confirm `www` → apex Single Redirect still one hop (`docs/URL_POLICY.md`).
2. Optionally extend WAF scanner rule with `wp-includes` / `wlwmanifest` / `xmlrpc` paths (`docs/CLOUDFLARE_WAF.md`) — never Bot Fight Mode.
3. After Preview deploy of this branch: run Analytics sync (preview, ≥2 days) so `errors` fills in.

## If 4xx stays high

Extract next (still no raw UA storage in D1):

1. Exact status for `/` (403 vs 404 vs 429)
2. Method dimension for `/` and `/api/*`
3. Known-crawler vs unclassified share on content 4xx (join crawler path table)
4. Deploy timestamp correlation for 5xx paths
