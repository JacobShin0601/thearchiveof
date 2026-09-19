# English editorial localization

## Principles

> Preserve the concept, not the literal setting.

> English articles should read as if they were originally written in English, not translated from Korean.

Korean remains the source edition for the argument. English is an editorial adaptation with **semantic parity**, not sentence-by-sentence parity. Preserve the thesis, technical explanations, evidence, caveats, conclusion, and topic/series relationships. Paragraph order, illustrative numbers, settings, and jokes may change. Do not rewrite an approved Korean article just to match its English adaptation.

## Decide what can change

> Localize examples, not facts.

> Never Americanize a fact pattern when the geography itself is analytically relevant.

Distinguish invented teaching examples from actual observations before editing. Preserve Korean context for Korean real estate, law, institutions, markets, regulation, company culture when it is the subject, customer or industry structures, and any real case whose geography affects the analysis.

Real projects and company cases must not become fictional US cases for readability. A battery procurement or product carbon footprint (PCF) case may anonymize companies and customers under the existing disclosure rules; it must retain its actual market, regulatory context, analytical numbers, and causal relationships. Korean regulation must never become US regulation. Explain unfamiliar facts briefly instead of replacing them. If an example's factual status is unclear, preserve it until clarified.

## Everyday examples: NYC / Manhattan by default

For generic everyday examples where Korea is not essential, use New York City, with a Manhattan-centric context when a city setting helps. Do not force a city into examples that do not need one.

Seoul neighborhoods such as Gangnam, Yongsan, Sinchon, and Jamsil are not a one-to-one lookup table. Rebuild the same decision intuition: convenience for one person may mean a difficult trip for someone else. For example, friends can live on the Upper West Side, in Williamsburg (Brooklyn), in Lower Manhattan, and in Midtown East; restaurants can be in Midtown, near Union Square / Flatiron, on the Lower East Side, and in Downtown Brooklyn. Manhattan-centric does not mean Manhattan-only.

Use door-to-door subway travel, transfers, walks, and waits rather than Seoul transit assumptions or straight-line distance. Invented journey times must be plausible, clearly illustrative, and consistent with the model's constraints. Do not present them as verified route estimates or promise equal travel penalties for every neighborhood. Verify actual routes when factual precision is necessary.

## Currency and units

> Convert purchasing-power intuition, not just exchange rate.

An illustrative KRW 30,000 casual dinner can become roughly $25–35 per person, or a single $30 budget before tax and tip. These are editorial example values, not current restaurant-price claims or exchange-rate conversions. A $120-per-person steakhouse can illustrate a different kind of evening. State the cost basis once and apply it consistently to prose, tables, equations, charts, and captions. If a constraint is $30, a more expensive option requires explicitly relaxing that constraint.

For factual financial or analytical data, preserve the original currency and numbers. Any supplementary FX conversion needs an identified rate, date, and source; do not alter the conclusion by silently repricing inputs. Recalculate all derived values when intentionally adapting an invented numerical example.

Everyday distances may use miles and temperatures may use Fahrenheit or dual units when useful. Scientific, industrial, and technical data can keep kilometers, Celsius, tonnes, and other original units. There is no mandatory imperial conversion. Preserve precision and meaning; label units clearly.

## Food, social context, and humor

When local culture is incidental, adapt soju/beer and anju to “beers and shared plates” or “a casual dinner and drinks.” A gender-specific Korean phrase about male friends having a drink can simply become “a casual dinner with friends” or “grabbing beers after work.” Preserve culture when culture is the subject.

Match the effect of humor, not its literal wording. Instead of mechanically translating a strong Korean reaction as “people would call you crazy,” use a restrained line such as: “If everyone agreed on a casual dinner and someone booked a $120-per-person steakhouse, that person would probably get roasted before anyone even left home.” A quieter alternative is “everyone would immediately question the choice.” Avoid forced slang and excessive idioms.

Use short, clear paragraphs, natural English essay rhythm, and precise technical terms. Remove translated connective phrases. Generic prediction examples can refer to commodity prices or a central bank; do not substitute the Fed unless the US institution matters to the example.

## Metadata, links, and agent readability

`translationKey` groups language editions of the same article. It does not promise literal translation. Keep the existing key, filename, taxonomy, and series/order where present. Keep language switches, canonical URLs, and hreflang relationships intact; do not invent a next-article URL before that edition exists.

The content schema supports this optional English editorial record:

```yaml
localization:
  locale: "en-US"
  defaultContext: "New York City"
  strategy: "localized-adaptation"
```

Use it when the edition is a localized adaptation. `defaultContext` is optional and describes the illustrative context, not the location of every fact. The entire block is optional; Korean articles and existing English articles need no migration. It does not change routing, HTML language, canonical, or hreflang. Update the schema deliberately if another locale or strategy is later needed. A material revision to a published English article updates its own `updatedDate` without forcing a Korean edit.

Keep an AnswerBlock self-contained: define the concept without depending on the story. Preserve natural SEO terminology such as objective function, constraints, decision variables, integer programming, and binary decision when relevant; do not stuff keywords. Preserve topic and series navigation and verify links in both editions.

## English authoring checklist

- Is this a literal translation or a natural English article?
- Are local examples understandable to a US/international reader?
- Are Seoul-specific neighborhoods necessary?
- Are KRW amounts meaningful to the target reader?
- Should a number be FX-converted, contextually localized, or preserved as factual data?
- Does the humor sound natural in English?
- Is any Korea-specific fact analytically important and therefore unchanged?
- Does the English article preserve the same concept and argument as the Korean original?
- Does the article still link cleanly to the same topic/series structure?
- Are illustrative prices, units, equations, ratings, travel assumptions, and constraints consistent?

## Workflow for Work and other authoring agents

1. Read the Korean source and existing editorial guidance.
2. Identify factual versus illustrative elements, including numbers and personal history.
3. Preserve factual context, evidence, and uncertainty.
4. Localize illustrative context, defaulting to NYC / Manhattan where useful.
5. Adapt currency, locations, travel, food, and social norms together.
6. Rewrite naturally in English, including restrained humor.
7. Recheck technical accuracy and all dependent numerical expressions.
8. Verify internal links, taxonomy, series metadata, and `translationKey`.
9. Compare semantic meaning with the Korean edition; document material adaptations in the diff summary.
10. Run the build and review desktop/mobile Preview, equations, imports, schema, language switch, canonical/hreflang, and Preview noindex. Confirm the Korean source is unchanged.

Use `develop` for edits and Preview. New articles start as drafts; an already published article can retain `draft: false` while its revision is reviewed on `develop`. Do not merge to `main` without release approval. See [the editorial workflow](EDITORIAL_WORKFLOW.md) and [article brief](ARTICLE_BRIEF_TEMPLATE.md).
