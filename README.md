# The Archive of Ideas

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
description: "A one-sentence summary for search results and feeds."
publishedDate: 2026-09-05
category: "Investing"
tags:
  - Macro
  - Rates
author: "Jacob Shin"
draft: false
---

Write the note here.
```

Allowed categories are `Investing`, `AI & AX`, `Coding`, and `Mathematics`. Set `draft: true` to keep a note out of the build.

## Cloudflare Pages

When connecting this repository to Cloudflare Pages, use:

- Framework preset: `Astro`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `22`

No Functions, database, environment variables, or paid services are required.

After the first deployment, add `thearchiveof.com` as the custom domain in Cloudflare Pages. The Astro site URL, canonical links, sitemap, RSS feed, and `robots.txt` are already configured for that domain.
