# FDE loop, hyperscalers, and Palantir — research dossier

Data cutoff: 2026-10-03

This dossier separates public facts, the author's personal observations, and the article's analytical hypotheses. It is not an assessment of any named employee, account team, or undisclosed customer environment.

## AWS

| Item | Finding | Date | Source | Status | Article treatment |
|---|---|---:|---|---|---|
| FDE investment | AWS announced a dedicated FDE organization backed by an initial $1B investment. | 2026-06-30 | [About Amazon](https://www.aboutamazon.com/news/aws/aws-1-billion-forward-deployed-ai-engineers) | Primary, confirmed | Fact |
| Scale | AWS said it would embed thousands of experts in customer teams. | 2026-06-30 | [About Amazon](https://www.aboutamazon.com/news/aws/aws-1-billion-forward-deployed-ai-engineers) | Primary, company statement | Fact with attribution; not current headcount |
| Engagement design | Public preview terms describe 45-day sprints and customer responsibility for deployment readiness and ongoing operations. | current | [AWS legal terms](https://aws.amazon.com/legal/fde_terms/) | Primary | Fact |
| Reuse/product feedback | AWS describes reusable patterns, codified expertise, compounding project learning, and customer self-sufficiency. | 2026-06-30 | [About Amazon](https://www.aboutamazon.com/news/aws/aws-1-billion-forward-deployed-ai-engineers) | Primary | Fact; shows theory is understood |
| Job design | Principal FDE role calls for reusable architectures, accelerators, and influence on AWS product roadmaps. | accessed 2026-10-03 | [Amazon Jobs](https://www.amazon.jobs/en/jobs/10521876/principal-forward-deployed-engineer-aws-forward-deployed-engineering) | Primary | Fact |
| Government FDE | Role describes end-to-end production ownership and feeding reusable patterns back into AWS services. | accessed 2026-10-03 | [Amazon Jobs](https://www.amazon.jobs/en/jobs/10517550/forward-deployed-engineer-aws-forward-deployed-engineering-us-government) | Primary | Fact |

## Google and Microsoft

| Item | Finding | Date | Source | Status | Article treatment |
|---|---|---:|---|---|---|
| Google ecosystem FDE | Accenture and Google Cloud announced a Gemini Enterprise group with 1,000 Accenture FDEs and specialized Google Cloud engineering support. | 2026-09-08 | [Google Cloud Press Corner](https://www.googlecloudpresscorner.com/2026-09-08-Accenture-and-Google-Cloud-Deepen-Partnership-with-Formation-of-New-Accenture-Gemini-Enterprise-Business-Group) | Primary | Fact; do not call Google CE/TAM roles FDE |
| Microsoft co-build | Microsoft AI Co-Innovation Labs offer hands-on co-building and prototyping support. | current | [Microsoft AI Co-Innovation Labs](https://www.microsoft.com/en-us/ailab) | Primary | Adjacent model, not claimed equivalent to FDE |
| Google deployment incident | Custom Agent SSO issue required multiple handoffs, reached a product team after more than two weeks, remained unreliable, and the author stopped using the feature. | author recollection | Private experience | Personal observation | Anonymized; one engagement only |
| AWS interaction pattern | Some conversations appeared to begin with AWS services or credits rather than latent workflow problems. | author recollection | Private experience | Personal observation | Limited interactions; no judgment of individuals |

## Palantir

| Item | Finding | Date | Source | Status | Article treatment |
|---|---|---:|---|---|---|
| FY2025 revenue | $4.475B, up 56%. | FY2025 | [2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm) | Primary, audited | Fact |
| FY2025 gross margin | GAAP gross profit $3.686B; GAAP gross margin 82%; 84% excluding SBC. | FY2025 | [2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm) | Primary | Fact; use GAAP headline |
| Customers | 954 customers at 2025-12-31, up from 711. Definition is organizations with revenue recognized in trailing 12 months; separately invoiced government units count separately. | 2025-12-31 | [2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm) | Primary | Fact with definition caveat |
| Employees | 4,429 full-time employees at 2025-12-31. | 2025-12-31 | [2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm) | Primary | Fact |
| Latest quarterly scale | Q2 2026 revenue $1.935B, up 93% YoY; gross profit $1.639B (about 84.7% GAAP gross margin, author calculation). | 2026-Q2 | [Q2 2026 earnings release](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000039/a2026q2ex991pressrelease.htm) | Primary; margin calculated | Supporting evidence, not directly comparable to startups |
| Revenue structure | Cloud subscriptions, on-prem software with O&M, and professional services; professional services include support, UI configuration, training, and ontology/data modeling. | FY2025 | [2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm) | Primary | Fact; mix not separately disclosed |
| Embedded development | 10-K says Palantir embeds with customers while continuously enhancing platform capabilities. | FY2025 | [2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm) | Primary | Fact |
| FDE paradigm | Official architecture docs call FDE a product-development paradigm and describe customer embedding as a feedback mechanism for platform development. | current | [Architecture Center](https://www.palantir.com/docs/foundry/architecture-center/platforms), [platform summary](https://www.palantir.com/docs/foundry/getting-started/foundry-platform-summary-llm) | Primary | Fact with company-source attribution |
| Ontology | Objects, properties, links, actions, functions, and dynamic security form a digital representation that can support operational workflows and writeback. | current | [Introductory concepts](https://www.palantir.com/docs/foundry/getting-started/introductory-concepts), [Why Ontology](https://www.palantir.com/docs/foundry/ontology/why-ontology) | Primary | Fact; avoid reducing it to a semantic layer |
| AIP | 10-K says AIP links third-party LLMs with Palantir data/operations and includes agent tooling, applications, and evaluations; docs show Ontology-aware data, logic, and action tools. | FY2025/current | [2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm), [AIP Logic](https://www.palantir.com/docs/foundry/logic) | Primary | Fact |
| Apollo | Continuous delivery and control layer for updates and configurations across customer environments. | FY2025/current | [2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm), [Apollo](https://www.palantir.com/platforms/apollo/) | Primary | Fact |

## Analytical frameworks

- **Customer-to-Product Latency:** elapsed time from a field discovery to a core-product change. Author's conceptual term, not an industry KPI.
- **Organizational Impedance:** delay, information loss, ownership ambiguity, and priority conflict across organizational boundaries. Metaphor, not an electrical model.
- **Problem Discovery Loop:** customer context → observation → hidden problem → redefinition → build.
- **Product Learning Loop:** build → product gap → core product → reusable primitive → next customer.
- **Workaround Factory:** a failure mode in which customer resolution authority exists without sufficient product influence.
- **Accumulated Learning:** what remains in platform capabilities, deployment patterns, governance, and trust after repeated loops. Author's framework.

## Editorial guardrails

- Do not infer that AWS, Google, or Microsoft will fail at FDE.
- Do not treat personal observations as representative evidence.
- Do not describe customer-facing roles at Google or Microsoft as FDE unless the source does.
- Do not claim Palantir's results were caused by FDE alone.
- Keep Palantir as a counterexample/control case, not the main subject.
- Separate company-stated strategy from observed outcomes.
