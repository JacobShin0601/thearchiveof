# Financial AI market and company research dossier

Data cutoff: 2026-10-03. This file records the inputs behind the paired Investing article. Company counts are claims by the companies unless a filing is specified. The SAM is an author scenario, not an independently measured market estimate.

## Four non-additive sizing layers

| Layer | Number | Definition/date | Source | Caveat |
| --- | ---: | --- | --- | --- |
| Underlying economic pool | $7.3T revenue; $1.3T net income | Global banking, 2025 | [McKinsey 2026 Global Banking Review](https://www.mckinsey.com/industries/financial-services/our-insights/global-banking-annual-review) | Not all financial services, not AI spend. McKinsey's 2023 financial-intermediation mix includes retail, corporate, payments, wealth/asset management, IB, and infrastructure; do not add that older $6.8T to this figure. |
| GenAI annual value potential | $200–340B | Global banking use cases, original 2023 potential estimate | [MGI original](https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier), [9–15% operating-profit framing](https://www.mckinsey.com/featured-insights/charts/bankings-gen-ai-opportunity) | 2.8–4.7% of contemporary banking revenue; potential economic benefit, predominantly productivity, not vendor revenue and not a 2026 realized result. CIB workflows are a subset. |
| Observable vendor revenue proxies | $8.740B plus £3.978B | Selected 2025 reported segments | Filings listed below | Cross-vendor resale/licensing may overlap. Segment definitions differ. No FX conversion or market-total claim. |
| Knowledge-work AI SAM scenario | $1.230B / $4.435B / $12.740B | Global seats × annual spend assumptions, low/base/high | Author calculation below, scale checks from [FactSet](https://www.sec.gov/Archives/edgar/data/1013237/000162828025045769/fds-20250831.htm) and [Rogo](https://rogo.com/news/strategic-investors) | Not current sales, not a forecast; existing data budget may be displaced. |

The [2024 McKinsey review](https://www.mckinsey.com/industries/financial-services/our-insights/global-banking-annual-review-2024) attributes 14% of its **2023** $6.8T global financial-intermediation revenue pool to wealth/asset management (about $0.952T) and 5% to investment banking (about $0.340T). These are rounded, historical economic revenue bases, not separate AI TAM estimates; do not add them to the 2025 $7.3T figure.

Subsector value estimates have incompatible boundaries. [McKinsey's 2024 asset-management article](https://www.mckinsey.com/industries/financial-services/our-insights/banking-matters/nine-key-observations-about-the-european-asset-management-industry) cites about $60B of **combined traditional and generative AI** global value at stake. Its [June 2026 European private-banking analysis](https://www.mckinsey.com/industries/financial-services/our-insights/building-profit-resilience-in-european-private-banking) models €4–5B of **profit uplift** from a broader AI-enabled redesign. Neither is an additive GenAI-only subcomponent of MGI's $200–340B global banking estimate.

## Observable vendor basket

| Company and boundary | 2025 revenue | Source | Treatment |
| --- | ---: | --- | --- |
| LSEG Data & Analytics excluding recoveries | £3.978B | [2025 annual report](https://www.lseg.com/content/dam/lseg/en_us/documents/investor-relations/annual-reports/lseg-annual-report-2025.pdf) | Includes Workflows £1.925B, Data & Feeds £1.822B, Analytics £0.231B. Do not add components again. |
| S&P Global Market Intelligence | $4.916B | [2025 10-K](https://www.sec.gov/Archives/edgar/data/64040/000006404026000013/spgi-20251231.htm) | Broad segment includes credit and enterprise solutions; Ratings segment excluded. |
| FactSet consolidated | $2.321748B | [FY2025 10-K](https://www.sec.gov/Archives/edgar/data/1013237/000162828025045769/fds-20250831.htm) | Workstation and data proxy, not pure AI revenue. |
| Morningstar Direct Platform | $0.8306B | [2025 annual report](https://www.sec.gov/Archives/edgar/data/1289419/000128941926000017/a2025annualreport.htm) | Investment analytics platform; other Morningstar segments excluded. |
| PitchBook | $0.6718B | [2025 annual report](https://www.sec.gov/Archives/edgar/data/1289419/000128941926000017/a2025annualreport.htm) | Separate Morningstar segment; do not add Morningstar consolidated revenue. |

USD basket = 4.916 + 2.321748 + 0.8306 + 0.6718 = **$8.740148B**. Keep LSEG in GBP. Bloomberg has no sufficiently comparable publicly disclosed segment figure. MSCI's broad revenue includes index-linked fees. AlphaSense's ARR is a run-rate and is not added to recognized vendor revenues. The basket demonstrates scale, but is not a rigorous floor on *unique* end-customer spend because wholesale inputs can be resold.

## Bottom-up SAM

The analyst-defined seats are professionals whose work repeatedly involves sourced research, analysis, and written or spreadsheet deliverables. The ranges are **assumptions**, not measured global workforce counts. They deliberately exclude most payments, retail banking operations, trading infrastructure, and insurance claims. Potential role overlap is minimized by assigning a person to their primary role. FY2025 FactSet's 237,324 users and Rogo's September 2026 50,000-plus announced deployments are order-of-magnitude checks only; they do not prove the global seat range. Annual spend is a blended amount a team might pay for AI-enabled knowledge workflow, including possible bundled data. It is not a quoted Rogo or AlphaSense price.

| Vertical | Seats low/base/high, thousands | Annual spend low/base/high, USD thousands | SAM low/base/high, USD billions |
| --- | ---: | ---: | ---: |
| Investment banking | 80 / 120 / 180 | 4 / 8 / 15 | 0.320 / 0.960 / 2.700 |
| Private equity | 60 / 100 / 140 | 3 / 7 / 12 | 0.180 / 0.700 / 1.680 |
| Asset management, public equities, hedge funds | 120 / 200 / 280 | 3 / 6 / 12 | 0.360 / 1.200 / 3.360 |
| Credit | 60 / 100 / 150 | 2 / 5 / 10 | 0.120 / 0.500 / 1.500 |
| Wealth | 150 / 275 / 400 | 1 / 2 / 5 | 0.150 / 0.550 / 2.000 |
| Corporate development, strategy, IR | 100 / 175 / 250 | 1 / 3 / 6 | 0.100 / 0.525 / 1.500 |
| **Total** | **570 / 970 / 1,400** | Differentiated | **1.230 / 4.435 / 12.740** |

Formula for each scenario: `sum(seats_thousands × annual_spend_usd_thousands) / 1000` gives USD billions. Recalculate with `node scripts/financial-ai-market-sizing.mjs`.

### External scale checks, not a workforce census

| Observation | Number and date | How it is used | Why it does not set a SAM row |
| --- | ---: | --- | --- |
| [US financial and investment analysts](https://www.bls.gov/ooh/business-and-financial/financial-analysts.htm) | 377,200 jobs, 2025 | Checks that analyst work spans hundreds of thousands of US jobs | US-only; occupation includes jobs outside the targeted workflows and overlaps verticals. |
| [US personal financial advisors](https://www.bls.gov/ooh/business-and-financial/personal-financial-advisors.htm) | 299,400 jobs, 2025 | Tests whether the wealth scenario is a selective subset | US-only, broader than high-spend research/document users; the global 150–400k eligible-seat assumption is **not** a global advisor count. |
| [CFA Institute](https://www.cfainstitute.org/programs/cfa-program/careers/employers-list) | More than 200,000 charterholders worldwide, current company page at cutoff | Scale check across investment professions | Credential holders overlap with occupational counts and do not include every eligible professional. |
| [FactSet FY2025 10-K](https://www.sec.gov/Archives/edgar/data/1013237/000162828025045769/fds-20250831.htm) | $2.321748B recognized FY revenue / 237,324 users at Aug. 31, 2025 ≈ $9,783 | Order-of-magnitude spending check | Company-wide revenue divided by point-in-time users is not a quoted seat price; it includes different products, data feeds and some users outside the count. |

The first three observations are **not summed or multiplied** into a global workforce figure. The FactSet ratio is **not** inserted as a uniform SAM price. Eligibility and blended spend remain explicit author assumptions; data-inclusive renewals and new AI budget are not separated in public disclosures.

## AlphaSense diligence

- [June 3, 2026 release](https://www.alpha-sense.com/press/alphasense-raises-350m-at-7-5b-valuation-and-surpasses-600m-in-annual-recurring-revenue/): $350M financing, $7.5B headline valuation, over $600M ARR reached in Q1 2026, over 7,000 global enterprise customers, over 500M business documents. $7.5B / $600M = 12.5; because ARR exceeds $600M, the exact headline valuation/reported ARR is below 12.5×. This is **not** EV/revenue.
- [March 2025 company announcement](https://www.alpha-sense.com/press/alphasense-supercharges-its-generative-ai-suite-with-groundbreaking-new-features/) and the [current broker-research marketing page](https://www.alpha-sense.com/solutions/broker-research-reports/) both state 90% penetration of the S&P 100. This is the company's customer claim, not a count derived from a published customer list; reconfirm its scope and date before publication.
- [Current expert page](https://www.alpha-sense.com/platform/expert-insights/): 300,000-plus investor-led insights and 8,000-plus transcripts added monthly. [Content page](https://www.alpha-sense.com/content-and-partners/) says 300,000-plus expert transcripts and 1,500 broker partners. [Broker research page](https://www.alpha-sense.com/solutions/broker-research-reports/) says 1,700-plus research sources. These definitions and update times differ; use conservative 1,500-plus, and refresh before publication.
- [Tegus 2024 announcement](https://www.prnewswire.com/news-releases/alphasense-to-join-forces-with-tegus-increases-latest-valuation-to-4b-302169502.html): $930M agreed acquisition, motivated by expert research and private-company content. The price is transaction consideration, not a stand-alone valuation of the content.
- [March 2025 Generative Search/Grid](https://www.alpha-sense.com/press/alphasense-supercharges-its-generative-ai-suite-with-groundbreaking-new-features/), [June 2025 Deep Research](https://www.alpha-sense.com/press/alphasense-launches-deep-research-automating-in-depth-analysis-with-agentic-ai-on-high-value-content/), [March 2026 Custom AI Agents](https://www.alpha-sense.com/press/alphasense-scales-workflow-automation-in-financial-firms-and-enterprises/), [June 2026 SuperAnalyst announcement](https://www.alpha-sense.com/press/alphasense-introduces-superanalyst-the-always-on-ai-execution-layer-for-decision-grade-intelligence/), [July 2026 Work Products](https://www.alpha-sense.com/press/alphasense-launches-work-products/). Announcement date is not necessarily general availability. Do not represent all milestones as firsthand usage.
- Thesis: content access rights + historical corpus + permission-aware retrieval and citation, enterprise distribution, potential ARPU and retention improvement. Risk: workflow-first interface captures user attention. Counter-thesis: AlphaSense itself owns both content and workflow.

## Rogo diligence

- [April 29, 2026 Series D](https://rogo.com/news/series-d): $160M, forward-deployed bankers and engineers mentioned; no valuation in official post. [Bloomberg reported](https://www.bloomberg.com/news/newsletters/2026-04-30/ai-will-kill-your-banking-job-or-make-you-a-billionaire) approximately $2B. Do not compute a revenue multiple from unverified revenue estimates.
- [September 10, 2026 announcement](https://rogo.com/news/strategic-investors): company claims deployments at 350-plus firms and 50,000-plus professionals. These are not audited paid-active seats.
- [May 2026 product update](https://rogo.com/news/may-product-update): Felix, PowerPoint/Excel/Word outputs, email, Excel plug-in, custom agents, PitchBook Premium.
- [LSEG partnership](https://www.lseg.com/en/media-centre/press-releases/2025/lseg-and-rogo-announce-strategic-partnership): LSEG Workspace license prerequisite for real-time LSEG data inside Rogo. [LSEG annual report](https://www.lseg.com/content/dam/lseg/en_us/documents/investor-relations/annual-reports/lseg-annual-report-2025.pdf) frames Rogo as an AI-application distribution channel.
- [PitchBook connector](https://pitchbook.com/premium-connectors/rogo) requires separate PitchBook and Rogo access; [Preqin partner](https://www.preqin.com/about/partners/rogo), [Third Bridge integration](https://rogo.com/news/february-product-update). Google Cloud's [Rogo case study](https://cloud.google.com/customers/rogo) lists S&P Global and FactSet among external sources, but this alone does not prove a formal bilateral partnership; the article does not claim one.
- Thesis: default workflow interface, model-agnostic orchestration, user distribution, enterprise trust. Risks: licensed data dependence, incumbent agentification, deployment cost, vertical fragmentation.

## Reading rules and publication refresh

- Economic value ≠ software TAM; transaction/deal volume ≠ vendor revenue; ARR ≠ recognized revenue; headline valuation/ARR ≠ EV/revenue.
- Refresh company ARR, valuation, customers, deployments, content counts, partner access conditions, and product availability immediately before publication. Refresh annual revenue basket when 2026 reports are released.
- Verify all source links and the draft-only preview. The paired KO/EN files must retain the same `translationKey` and `draft: true` until editorial approval.
