# The Archive — Work Editorial Workflow

## Operating principle

Korean is the source edition. The English edition is an editorial adaptation made only after the Korean argument is stable. GitHub is the source of truth, `develop` is the review environment, and `main` is production.

```text
Author brief
  → branch from latest develop (`content/<slug>`)
  → Work challenges gaps and develops the argument
  → Korean source draft
  → English edited edition
  → paired MDX files (`draft: true`)
  → PR into develop (CI: npm test + npm run build)
  → merge to develop
  → Cloudflare Preview review
  → corrections on the article branch
  → `draft: false`
  → PR the article branch into main
  → Production
```

## Branching

Keep site work and article work on separate branches so a draft does not block design, and a design review does not collide with an unfinished essay. Do not commit directly to `develop` or `main`.

- `main` is production. Do not commit drafts or in-progress articles here.
- `develop` is the integration and Cloudflare Preview branch. It may contain reviewed drafts, but it is not the place to start new writing.
- GitHub Actions runs `npm test` and `npm run build` on pull requests to `develop` and `main`, and again on the merge commit.
- Cloudflare deploys automatically. Merge to `develop` updates Preview; merge to `main` updates `thearchiveof.com`. There is no extra deploy step. Feature branches do not get a Pages preview.
- Each new article gets its own branch from the latest `develop`, named `content/<english-slug>`. Open a pull request into `develop`. After Preview approval, set `draft: false` and open a pull request from that article branch into `main`.
- Site design, layout, schema, and functionality use `feat/<change>`, `design/<change>`, or `fix/<change>` from `develop` (or from `main` for a production-only hotfix). Pull request into `develop` first. When Preview is good, pull request the **same feature branch** into `main`. Do not merge all of `develop` into `main` while unpublished drafts should stay off production.
- Articles already in progress on `develop` may stay there. This rule applies to new work.

Do not add a new article, series metadata, or topic-registry entries on a design or fix branch. Do not mix a site redesign into an article branch.

## 1. Intake

Start from `docs/ARTICLE_BRIEF_TEMPLATE.md`. The author provides at least:

- the question or topic;
- sentences, claims, or positions that must remain;
- the required logical structure;
- original observations or interpretation;
- evidence, data, and known uncertainty.

Work must not silently replace the author's position. It may reorganize, clarify, test, and strengthen it, but material changes to the thesis should be surfaced for approval.

## 2. Korean source edition

Work first develops the Korean article using the publication method:

1. **Explain** — define the question and answer it early.
2. **Model** — show the mechanism or conceptual structure.
3. **Test** — use evidence, data, code, or sources where relevant.
4. **Interpret** — explain meaning, limits, and practical consequences.

Foundation and Research articles should normally begin with an `AnswerBlock`. Research pieces should identify data sources, data-through date, methodology, references, and limitations when applicable. Put the claim in HTML so a retrieval agent can carry it; do not hide the answer in a client-only widget. See `docs/AGENT_ACCESS.md`.

## 3. English edition

The English file is not a literal translation. Work should:

- preserve the thesis, factual evidence and figures, links, and caveats; localize illustrative examples according to [the English localization guide](editorial-localization.md);
- rewrite syntax and idiom for natural English;
- keep terminology consistent with the topic registry;
- avoid adding claims that do not exist in the approved Korean edition;
- use the same `translationKey` as the Korean file.

Korean files live under `src/content/posts/<section>/...`; paired English files live under `src/content/posts/en/<section>/...`. Both editions use the same filename slug whenever practical.

## 4. Taxonomy rules

- **Section** says where the article belongs. Lab contains reproducible experiments and projects; Notes contains perspectives, reading records, and shorter essays.
- **Content type** says what kind of article it is.
- **Topic** says what the article is actually about and powers knowledge hubs.
- **Tag** is a secondary descriptor used for archive filtering and navigation.

Topics must come from `src/data/topics.json`. Use one optional `primaryTopic`; it must also be present in `topics`. Use 2–5 tags. Notes articles should still receive professional topics when relevant so that perspectives connect to Foundation, Research, Current, and Implementation material.

Topic hubs cross sections and group content by type. A topic page remains `noindex` until it has a registry introduction, at least three related posts, and a pillar / Start Here article. Once those conditions have been reviewed, set that registry entry's `indexable` value to `true`. Tags do not become SEO landing pages.

## 5. Paired frontmatter

The two files must share structural metadata:

```yaml
title: "A clear, specific title"
subtitle: "An optional supporting line under the title"
section: "AI & AX"
subsection: "Agents"
contentType: "foundation"
topics:
  - ai-agents
primaryTopic: ai-agents
tags:
  - framework
  - publishing
draft: true
translationKey: "example-article"
socialImage: "/og/example-article.png"
```

`title`, `subtitle`, `description`, body text, and `language` normally differ. If a pair has a custom share image, both files use the same `socialImage` path. Put the file at `public/og/<translationKey>.png` (1200×630). Omit the field to fall back to `/og.png`. Optional `localization` metadata belongs to the English edition only; `updatedDate` can differ when just one published edition materially changes. Semantic parity does not require identical illustrative prices, locations, jokes, or paragraph order. Set `language: "ko"` for the source and `language: "en"` for the English edition. Use `title` for the heading and optional `subtitle` for the supporting line; keep the search summary in `description`.

## 6. Preview review

Work lands on an article branch first, then merges into `develop` for the first review. Do not update `main` until the pair is approved. Cloudflare automatically builds the Preview deployment from `develop`; GitHub Actions must be green on the pull request before that merge. Review both language buttons and confirm they open the corresponding edition.

Checklist:

- argument and mandatory wording preserved;
- unsupported claims removed or qualified;
- facts, analytical numbers, sources, and dates agree in both languages; illustrative adaptations preserve the same decision logic and are internally consistent;
- headings, tables, equations, links, captions, and code render correctly;
- mobile layout and language switch work;
- Topic, primaryTopic, and tags are intentional;
- canonical, alternate-language links, and Preview `noindex` are present;
- drafts are visible in Preview but absent from Production;
- if `socialImage` is set, the file exists at `public/og/` and both editions use the same path.

## 7. Production release

After approval:

1. apply corrections on the article branch;
2. change both paired files to `draft: false`;
3. run the production build locally if you want a last check (`npm test` and `npm run build`);
4. open a pull request from the article branch into `main` so unrelated `develop` drafts do not ship;
5. confirm CI is green and the Cloudflare Production deployment finished.

Never publish only one half of an approved pair accidentally. If an English edition is intentionally deferred, publish the Korean article without a `translationKey` until the English file is ready; the language button will then lead to the English homepage.

## 8. Review lifecycle

Every approved article should declare its expected review cadence in both language files:

```yaml
freshness: periodic # evergreen | periodic | time-sensitive
lastReviewed: 2026-09-01
nextReviewDate: 2026-12-01
```

- `updatedDate` is public and changes only when the published article materially changes.
- `lastReviewed` records the latest editorial fact, source, and link check even if no public edit was needed.
- `nextReviewDate` schedules the next check.
- `freshness` describes the article's normal decay rate, not its quality or performance.

Use `/ops/content-review/` on the Cloudflare Preview deployment to find overdue, upcoming, and unscheduled articles. This route is omitted from Production. Review Korean and English editions together, keep their review metadata aligned, and use `docs/CONTENT_INTELLIGENCE.md` for the monthly decision process.
