# The Archive — Work Editorial Workflow

## Operating principle

Korean is the source edition. The English edition is an editorial adaptation made only after the Korean argument is stable. GitHub is the source of truth, `develop` is the review environment, and `main` is production.

```text
Author brief
  → Work challenges gaps and develops the argument
  → Korean source draft
  → English edited edition
  → paired MDX files (`draft: true`)
  → develop push
  → Cloudflare Preview review
  → corrections in develop
  → `draft: false`
  → develop → main merge
  → Production
```

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

Foundation and Research articles should normally begin with an `AnswerBlock`. Research pieces should identify data sources, data-through date, methodology, references, and limitations when applicable.

## 3. English edition

The English file is not a literal translation. Work should:

- preserve the thesis, evidence, figures, links, and caveats;
- rewrite syntax and idiom for natural English;
- keep terminology consistent with the topic registry;
- avoid adding claims that do not exist in the approved Korean edition;
- use the same `translationKey` as the Korean file.

Korean files live under `src/content/posts/<section>/...`; paired English files live under `src/content/posts/en/<section>/...`. Both editions use the same filename slug whenever practical.

## 4. Taxonomy rules

- **Section** says where the article belongs.
- **Content type** says what kind of article it is.
- **Topic** says what the article is actually about and powers knowledge hubs.
- **Tag** is a secondary descriptor used for archive filtering and navigation.

Topics must come from `src/data/topics.json`. Use one optional `primaryTopic`; it must also be present in `topics`. Use 2–5 tags. Misc articles should still receive professional topics when relevant so that perspectives connect to Foundation, Research, Current, and Implementation material.

Topic hubs cross sections and group content by type. A topic page remains `noindex` until it has a registry introduction, at least three related posts, and a pillar / Start Here article. Once those conditions have been reviewed, set that registry entry's `indexable` value to `true`. Tags do not become SEO landing pages.

## 5. Paired frontmatter

The two files must share structural metadata:

```yaml
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
```

Only `title`, `description`, body text, and `language` normally differ. Set `language: "ko"` for the source and `language: "en"` for the English edition.

## 6. Preview review

Work updates `develop`, never `main`, for the first review. Cloudflare automatically builds the Preview deployment. Review both language buttons and confirm they open the corresponding edition.

Checklist:

- argument and mandatory wording preserved;
- unsupported claims removed or qualified;
- facts, numbers, sources, and dates match in both languages;
- headings, tables, equations, links, captions, and code render correctly;
- mobile layout and language switch work;
- Topic, primaryTopic, and tags are intentional;
- canonical, alternate-language links, and Preview `noindex` are present;
- drafts are visible in Preview but absent from Production.

## 7. Production release

After approval:

1. apply corrections on `develop`;
2. change both paired files to `draft: false`;
3. run the production build;
4. merge `develop` into `main`;
5. confirm the Cloudflare Production deployment.

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
