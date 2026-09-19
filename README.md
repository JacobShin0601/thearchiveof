# The Archive


Static research journal for [thearchiveof.com](https://thearchiveof.com), built with Astro, TypeScript, Markdown/MDX, and no server-side runtime.

## Local development

```sh
npm install
npm run dev
```

Run a production check with:

```sh
npm run build
```

## Publishing a note

Add a `.md` or `.mdx` file below `src/content/posts/`. Folder names become part of the article URL.

```md
---
title: "A clear, specific title"
subtitle: "An optional supporting line, displayed below the title"
description: "A one-sentence summary for search results and feeds."
publishedDate: 2026-09-05
section: "Investing"
subsection: "Macro"
contentType: "foundation"
topics:
  - treasury
  - term-premium
primaryTopic: term-premium
tags:
  - empirical
  - framework
author: "Jacob Shin"
featured: false
draft: true
comments: false
language: "ko"
translationKey: "term-premium-explained"
---

Write the note here.
```

Allowed sections are `Investing`, `AI & AX`, `Lab`, `Mathematics`, and `Notes`. Content types are `foundation`, `research`, `current`, `implementation`, and `perspective`.

- Topics are the main knowledge taxonomy and must come from `src/data/topics.json`.
- `primaryTopic` is optional, but when present it must also be listed in `topics`.
- Tags are secondary descriptors: use 2–5 lowercase English slugs.
- Korean is the source edition. A paired English edition uses the same `translationKey` and `language: "en"`.
- New work starts with `draft: true` and is reviewed on Cloudflare Preview.

Use `title` for the main heading and optional `subtitle` for its supporting line. Cards, archives, series, and article headers display these at distinct sizes. Keep the summary in `description`.

Optional fields include `subtitle`, `updatedDate`, `series`, `seriesOrder`, `primaryTopic`, `translationKey`, `dataSources`, `dataThrough`, `methodology`, `codeRepository`, `references`, and `pillar`.

Article URLs are generated from section, subsection, and filename, for example:

```text
/investing/macro/term-premium-explained/
```

Optional integrations are kept disabled in `src/site.config.ts`. Add the relevant values there when Cloudflare Web Analytics, Google Search Console, giscus, a newsletter provider, or advertising is intentionally enabled.

## Publishing workflow

- `develop` is the review branch. Cloudflare builds it as Preview, includes `draft: true` articles, and applies `noindex, nofollow`.
- `main` is the production branch. It excludes drafts, allows search and AI retrieval crawlers, creates the sitemap, and deploys to `thearchiveof.com`.

Start each new article on its own branch from the latest `develop`, for example `content/term-premium-explained`. Open a pull request into `develop`. After Preview review, change `draft` to `false` and merge `develop` into `main`.

Keep site design, layout, and functionality on a separate `design/` or `fix/` branch so an unfinished article does not mix with production UI changes. Articles already in progress on `develop` may stay there; this rule applies to new work.

The branching rule, Work authoring process, input brief, bilingual quality checks, and release checklist are documented in [`docs/EDITORIAL_WORKFLOW.md`](docs/EDITORIAL_WORKFLOW.md). Start each article from [`docs/ARTICLE_BRIEF_TEMPLATE.md`](docs/ARTICLE_BRIEF_TEMPLATE.md).

Cloudflare provides `CF_PAGES_BRANCH` automatically. For a local preview-style build, set `DEPLOY_ENV=preview`; no Cloudflare environment variable needs to be configured manually.

## Cloudflare Pages

When connecting this repository to Cloudflare Pages, use:

- Framework preset: `Astro`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `22.22.0` (pinned by `.nvmrc`)

Static pages do not require Functions. Optional Useful reactions and first-party events use Pages Functions and D1; see [`docs/interactivity.md`](docs/interactivity.md).

In **Settings → Builds & deployments**:

- Keep the production branch as `main` with automatic production deployments enabled.
- Configure Preview deployments as **Custom branches** and include only `develop`.

After the first deployment, add `thearchiveof.com` as the custom domain in Cloudflare Pages. The Astro site URL, canonical links, sitemap, RSS feed, and `robots.txt` are already configured for that domain.
