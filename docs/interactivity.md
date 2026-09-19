# The Archive — Interactivity

The Archive stays a static research publication. HTML remains the source of reading. Pages Functions, D1, giscus, and browser-only demos are enhancements.

```text
Humans → HTML → Read
              → Useful (Pages Function → D1)
              → Discussion (giscus)
              → Interactive equivalent (browser JS)
```

Do not add a standalone Worker, Astro SSR, or React for these features.

## Analytics audit

| Signal | Status | Action |
| --- | --- | --- |
| Cloudflare Web Analytics beacon | Present in `src/components/Analytics.astro`, Production-only, token empty | Enable in the dashboard, then put the token in `src/site.config.ts` |
| Duplicate custom analytics | None | Do not add another beacon or GA4 |
| Preview mixed into Production | Prevented: beacon is omitted when `IS_PREVIEW` | Keep Preview hostnames out of the Production Web Analytics site |
| Sitemap / robots / canonical / hreflang / JSON-LD | Present | Submit the sitemap in Search Console |

Zone Overview totals (unique visitors, requests, cache) are not enough to judge article usefulness. Use Web Analytics for readership and first-party `/api/events` for interaction.

### Cloudflare Web Analytics checklist

1. Workers & Pages → thearchiveof → Metrics → Web Analytics → Enable.
2. Attach **thearchiveof.com** only. Do not attach `*.pages.dev` Preview hosts.
3. Copy the site token into `src/site.config.ts` → `cloudflareWebAnalyticsToken`.
4. Confirm Preview HTML has no `static.cloudflareinsights.com` script.

### Google Search Console checklist

1. Verify `https://thearchiveof.com`.
2. Submit `https://thearchiveof.com/sitemap-index.xml`.
3. Paste the verification code into `src/site.config.ts` → `googleSiteVerification`.
4. Confirm Korean/English pairs have `hreflang` and that draft/Preview URLs stay `noindex`.

## Comments (giscus)

`src/components/Comments.astro` renders only when `comments: true` **and** all giscus fields in `src/site.config.ts` are filled.

Comments are keyed by URL pathname, so Korean and English editions have separate threads.

### Manual GitHub setup

1. Enable Discussions on `JacobShin0601/thearchiveof`.
2. Create a category, for example `Article discussion`.
3. Install the [giscus app](https://giscus.app) on that repository.
4. Copy `repo`, `repoId`, `category`, and `categoryId` into `src/site.config.ts` and set `giscus.enabled` to `true`.

## Useful reactions

Korean and English editions of the same article share one count through `translationKey`.

```text
GET  /api/articles/{key}/reactions
POST /api/articles/{key}/reactions
```

`{key}` is the `translationKey`, or the filename slug when that field is absent.

### D1

```text
archive-interactions-preview      → Preview / develop
archive-interactions-production   → Production / main
```

Binding name is `DB` in both environments. Apply `migrations/` to each database.

### Identity

The browser stores an anonymous UUID in `localStorage`. The Function hashes `HMAC(INTERACTION_SECRET, articleKey + viewerId)` and stores only `actor_hash`. Raw IP, email, and fingerprints are not stored.

V1 `actor_type` is `human`. `agent` exists in the schema for a later authenticated API and is not exposed in the UI.

### Abuse controls

- Allowed article keys generated at build time
- `useful` is the only reaction
- JSON body ≤ 2 KB
- Origin must match the request host, `thearchiveof.com`, or `*.pages.dev`
- Toggle is one row per `(article_slug, actor_hash, reaction_type)`
- Repeat posts within one second are rejected

Turnstile is not used on every click.

## First-party events

```text
POST /api/events
```

Allowed events: `reaction_click`, `code_run`, `language_switch`.

Allowed fields: `event`, `articleSlug`, `language`, `component`.

Do not send code, slider values, or free-text. Cloudflare Analytics Engine is deferred.

## Interactive components

Browser-only. No server execution. No arbitrary user code.

The first demo is `ParetoExplorer` on the Pareto draft. It reads `src/data/pareto-restaurants.ts`, the same source as the static table and SVG charts. The article conclusion remains readable without JavaScript.

Label the control **Interactive equivalent** / **직접 실험**. Do not claim that Python is executed.

## Preview vs Production

| | Preview (`develop`) | Production (`main`) |
| --- | --- | --- |
| Drafts | Visible | Hidden |
| Indexing | `noindex` | Indexable |
| Web Analytics beacon | Off | On, after token is set |
| D1 | preview database | production database |
| giscus | Same config; threads follow Preview URLs | Production URLs |

## Security

- Parameterized D1 queries only
- No `Access-Control-Allow-Origin: *`
- No secrets in client code
- `INTERACTION_SECRET` is a Pages environment variable
- CSP is not added in this phase (it would break giscus and the Web Analytics beacon)

## Privacy

Measurement exists to improve the publication, not to build advertising profiles. See the About page disclosure.

## Cloudflare dashboard steps

### D1

1. Workers & Pages → D1 → Create `archive-interactions-preview`.
2. Create `archive-interactions-production`.
3. Pages project → Settings → Bindings:
   - Preview: `DB` → preview database
   - Production: `DB` → production database
4. Pages project → Settings → Environment variables: `INTERACTION_SECRET` (different values per environment).
5. Apply migrations to both databases:

```sh
npx wrangler d1 migrations apply archive-interactions-preview
npx wrangler d1 migrations apply archive-interactions-production
```

Local:

```sh
npx wrangler d1 migrations apply archive-interactions-preview --local
npm run preview:cf
```

## Future items (not in this work)

- Authenticated agent reaction API (`actor_type: agent` only after user-directed intent)
- Agent comments, badges, and provenance
- Autonomous likes from crawlers (forbidden)
- Pyodide or a remote Python sandbox
- Public MCP server
- Dedicated Worker, queues, cron
- Markdown content negotiation / Cloudflare Pro “Markdown for Agents”
- Analytics Engine
- Cost vs Carbon explorer (needs that article first)

Agent actions must represent an actual user-directed action, not synthetic engagement.
