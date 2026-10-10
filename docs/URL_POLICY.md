# URL policy

The Archive has one public origin:

```text
https://thearchiveof.com
```

## Canonical routes

- Korean is the default locale at `/`.
- English uses the `/en/` prefix.
- Page routes end with `/`; file routes such as `/rss.xml` keep their extension.
- Article URLs use the registered section slug, subsection slug, and content filename.
- Preview pages keep production canonical URLs but are `noindex`.
- Error responses are `noindex` and do not emit canonical, hreflang, or structured-data URLs.

Do not rename stable public paths solely to match navigation labels. In particular, the Lab label uses `/coding/` and Perspectives uses `/misc/`.

## Alternate languages

Only equivalent pages may be declared with `<link rel="alternate" hreflang>`. A language-switch control may fall back to the other locale's home or listing page, but that fallback is navigation, not an SEO alternate.

For a Korean/English pair:

- each page declares itself;
- each page declares the other edition;
- `x-default` points to the Korean edition.

## Redirects

Repository-managed legacy redirects are defined in `scripts/lib/legacy-redirects.mjs` and written to `public/_redirects` by `npm run write:redirects` (also run at the start of `npm run build`).

Add a redirect only when a published URL moved or production 404 data shows an established inbound path. Include both trailing-slash and no-slash sources when the platform would otherwise 404 the no-slash form. Avoid redirect chains and never fall back unknown paths to `/`.

| Status | Meaning |
| --- | --- |
| 301 | Stable successor exists (catalog entries) |
| 308 | Existing page trailing-slash normalization (Astro / Pages) |
| 404 | No successor; error page is `noindex` |
| 410 | Reserved for deliberate retirement without a successor (unused today) |

Common sitemap aliases `/sitemap.xml` and `/sitemap_index.xml` permanently redirect to `/sitemap-index.xml`.

Ops verification windows and analytics separation: `docs/OPS_URL_HEALTH.md`.

Cloudflare must also normalize the hostname:

1. Add `www.thearchiveof.com` as a proxied hostname in the `thearchiveof.com` zone.
2. Add a zone-level Single Redirect in the `http_request_dynamic_redirect` phase.
3. Match `http.host eq "www.thearchiveof.com"`.
4. Redirect to `concat("https://thearchiveof.com", http.request.uri.path)` with status `301` and preserve the query string.
5. Keep `thearchiveof.com` as the Pages primary custom domain.

Verify after every domain change:

```sh
curl -I https://www.thearchiveof.com/about/
curl -I http://thearchiveof.com/about/
curl -I https://thearchiveof.com/about
```

The expected results are one hop to `https://thearchiveof.com/about/`, HTTPS enforcement, and a trailing slash for page routes.

## Automated checks

`npm run check:urls` validates the built site:

- 404 SEO metadata;
- canonical origin and route;
- self, reciprocal, and `x-default` hreflang;
- production internal-link targets;
- permanent redirects and redirect targets;
- sitemap uniqueness and parity with indexable HTML.

`npm run build` runs this check after generating the static site.
