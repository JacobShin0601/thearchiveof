# Cloudflare WAF — scanner traffic

The Archive is a public research publication. Search and AI crawlers should keep reading production HTML. Credential scanners should not.

Do not put scanner handling in Astro routes, Pages Functions, or `_redirects`. Those paths are not part of the site.

## Policy

| Traffic | Action |
| --- | --- |
| Verified search / AI crawlers (`Googlebot`, `Bingbot`, `OAI-SearchBot`, `Claude-SearchBot`, and other verified useful crawlers) | Allow |
| Obvious credential / CMS scanners | Block |
| Unknown bots | Observe first. Do not challenge or country-block the whole site. |

Do **not** enable Bot Fight Mode. Do **not** add a WAF rule that challenges every bot or every country. Those rules block the readers this site is written for.

`robots.txt` is not a security control. Production still allows `User-agent: *`. WAF is only for junk paths.

## Dashboard checklist

1. Cloudflare → thearchiveof zone → **Security** → **WAF** → **Custom rules**.
2. Create a rule named `Block credential scanners`.
3. Action: **Block**.
4. Keep it off Preview if you only care about production, or apply to both — the paths do not exist in either environment.
5. After save, confirm `https://thearchiveof.com/robots.txt` is still HTTP 200 and that a normal article URL is not challenged.
6. Confirm a request to `https://thearchiveof.com/.env` is blocked.

Leave AI Crawl Control / bot management alone unless a named useful crawler is already being blocked. If `OAI-SearchBot` is blocked there, allow it. That check is a later step, after this `robots.txt` change is live.

## Suggested expression

Cloudflare expression language. Adjust field names if the dashboard UI differs.

```txt
(
  http.request.uri.path eq "/.env"
  or http.request.uri.path eq "/.secrets"
  or starts_with(http.request.uri.path, "/.pip/")
  or starts_with(http.request.uri.path, "/.git/")
  or starts_with(http.request.uri.path, "/.aws/")
  or http.request.uri.path contains "wp-config"
  or http.request.uri.path contains "phpmyadmin"
)
and not cf.client.bot
```

`not cf.client.bot` is the allow path for verified crawlers. If a useful crawler is still blocked, add an explicit skip by user-agent rather than turning the whole rule off:

```txt
not (
  http.user_agent contains "Googlebot"
  or http.user_agent contains "bingbot"
  or http.user_agent contains "OAI-SearchBot"
  or http.user_agent contains "Claude-SearchBot"
)
```

User-agent checks are weaker than Cloudflare's verified-bot signal. Prefer `cf.client.bot` when it is available.

## Paths to cover

These were observed in zone logs. They are not site features.

- `/.env`
- `/.secrets`
- `/.pip/pip.conf`
- `/.git/*`
- `/.aws/*`
- `wp-config*`
- `phpmyadmin*`

Do not add catch-all blocks for `/wp-admin` plus every CMS path unless logs show they are noisy. Start with the list above.

## What this does not do

- It does not change `src/pages/robots.txt.ts` or Preview `noindex`.
- It does not install GA4, ads, or a newsletter provider.
- It does not enforce Content-Security-Policy. Production `_headers` only ship Report-Only in v1.
