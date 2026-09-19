# The Archive — Agent access

The publication is for agents first as carriers of the argument, then for humans who follow those citations. Do not treat bots as an accident to be blocked. Also do not spend money to host them.

## Product intent

1. A retrieval agent should be able to fetch a production article, read the claim, evidence, and limits, and carry that text elsewhere.
2. A human who arrives from that citation should be able to read the same page without JavaScript.
3. Preview drafts stay off the public graph.
4. Bots must not create Useful counts, comments, or events by themselves. That is synthetic engagement, not retrieval.

## What already matches

| Surface | Why it is cheap and readable |
| --- | --- |
| Astro `output: 'static'` | HTML is built once. Cloudflare can cache it. A crawl is a cache hit, not a server render. |
| Semantic article, `AnswerBlock`, tables, references | The argument is in the document, not only in a widget. |
| JSON-LD `BlogPosting`, canonical, hreflang | Agents can identify the work without executing UI. |
| Production sitemap and RSS | Discovery does not need a custom index API. |
| Production `robots.txt` allows `*` | Search, retrieval, and training user-agents are not source-blocked. |
| Useful / events / explorer | Separate from reading. Origin checks and allowlisted keys. Crawler likes are forbidden. |

## What must stay closed

- Preview (`develop`, `*.pages.dev`): `noindex` and `User-agent: * Disallow: /`, except Googlebot/Bingbot so they can see the noindex tag.
- Drafts: omitted from the production build.
- `/api/*`: not for anonymous agent writes. `actor_type: agent` waits for an authenticated, user-directed API.
- Cloudflare **Bot Fight Mode** or a WAF rule that challenges unknown user-agents: do not turn this on. It blocks the readers this site wants and does not save meaningful money on static files.

## Cost rule (now)

Bot *reads* of static HTML, CSS, SVG, and images are acceptable. They are cached at the edge.

Do not add any of the following to make the site “more agent-friendly” unless the user explicitly accepts the bill:

- SSR or `@astrojs/cloudflare` so each crawl hits a Worker
- uncached Pages Functions on the article page itself
- a public MCP server, queue, or dedicated Worker
- per-request Markdown negotiation or a remote Python sandbox
- Analytics Engine or an extra beacon
- letting crawlers POST `/api/events` or `/api/articles/*/reactions`

Future items in `docs/interactivity.md` (`llms.txt`, Markdown for Agents, authenticated agent reactions) stay future until they can be static or explicitly budgeted.

## Editorial consequence

Write so an agent can extract a sentence-level answer and the caveat that limits it. Foundation and Research pieces should keep an early `AnswerBlock`. Do not hide the conclusion behind a client-only explorer.

## When changing code

Ask two questions before merging:

1. Can a bot GET this production URL and understand the article from the HTML?
2. Does this change make a bot request more expensive than a cached static file?

If (1) becomes no, the change is wrong for this publication. If (2) becomes yes, do not ship it at the current stage.
