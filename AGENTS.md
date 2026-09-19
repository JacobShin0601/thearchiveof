# The Archive — agent notes

Static research journal. Astro `output: 'static'` on Cloudflare Pages. Do not add SSR, `@astrojs/cloudflare`, or React unless the user explicitly asks.

Details: `README.md`, `docs/EDITORIAL_WORKFLOW.md`, `docs/interactivity.md`.

## Git and deploy

Do not commit directly to `develop` or `main`. Start a branch, open a pull request, wait for CI (`npm test` and `npm run build`), then merge.

- Site work: `feat/<change>`, `fix/<change>`, or `design/<change>` → PR into `develop` → Preview → PR the **same branch** into `main`.
- Articles: `content/<english-slug>` from latest `develop` → PR into `develop` with `draft: true` → after review, `draft: false` → PR that branch into `main`.
- Do not merge all of `develop` into `main` while unpublished drafts should stay off production.
- Do not mix site work and a new article on one branch.
- Do not merge interactivity or drafts to `main` unless the user asks.

Cloudflare deploys automatically. `develop` is Preview (`*.pages.dev`, drafts on, `noindex`). `main` is Production (`thearchiveof.com`). There is no extra deploy command. Feature branches do not get a Pages preview.

## Content and product

- Korean is the source edition. English is an adaptation, not a literal translation. Share `translationKey` on paired files.
- Useful counts are shared by `translationKey`. giscus threads stay per URL.
- Keep article prose readable without JavaScript. Explorers and Useful are enhancements.
- Do not add extra analytics beacons or a CSP that would break giscus or Web Analytics.
- Do not store raw IP or fingerprints. Functions trust only build-generated article keys.
- Cost vs Carbon explorer is out of scope until that article exists.

Commit only when the user asks. Do not push to `main` unless they ask.
