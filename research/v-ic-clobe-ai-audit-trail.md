# V-IC (Clobe AI) — Research Audit Trail

**As of:** 2026-10-14  
**Scope:** Public-information underwriting for a hypothetical next Series A.

## Evidence register

| Claim / input | Value used | Status | Source | Limitation |
| --- | ---: | --- | --- | --- |
| Legal entity | V-IC / 브이원씨 | Confirmed | THE VC | Database profile, not registry extract. |
| Latest financing | KRW 13.4bn Pre-A, Apr 2026 | Confirmed | MoneyToday; THE VC | Pre/post valuation undisclosed. |
| Corporate customers | 10,000+ | Company-reported | MoneyToday | Active users and finance-eligible users unknown. |
| Cumulative finance supply | KRW 110bn | Company-reported | MoneyToday | Cumulative, not annualized; press article calls it loans while product documentation uses assignment. |
| Repeat finance use | 3.7x average | Company-reported | Clobe Finance | Cohort population, observation period and weighting unknown. |
| ERP / tax-agent price | Free for life | Confirmed | Clobe pricing | Does not reveal product operating cost. |
| Finance price | Per-transaction fee | Confirmed | Clobe pricing | Rate card and net take rate undisclosed. |
| Finance product | Future-receivables securitization / assignment | Company-described | Clobe Finance | Does not settle accounting or economic risk allocation. |
| Finance applicant | Korean corporation operating 6+ months | Company-described | Clobe Finance | Personal ERP users may not be eligible. |
| Employee count | 25, Aug 2026 | Database-reported | THE VC | Not payroll, contractor, or functional headcount data. |

## Analyst assumptions

| Assumption | Bear | Base | Bull | Why it matters |
| --- | ---: | ---: | ---: | --- |
| 2027 revenue | KRW 40bn | KRW 80bn | KRW 120bn | Management’s reported KRW 100bn target is not verified as accounting revenue. |
| 2031 revenue | KRW 90bn | KRW 270bn | KRW 400bn | Derived from 2027 revenue and CAGR, not company guidance. |
| 2031 operating margin | 12% | 30% | 45% | Separates loss-bearing finance economics from capital-light fee economics. |
| Tax rate | 25% | 25% | 25% | Simplification; not an effective-tax-rate forecast. |
| Exit P/E | 12x | 18x | 22x | Private-company exit uncertainty requires a range. |
| Follow-on dilution | 20% | 20% | 20% | Requires actual cap table and financing plan. |

## Reproducible formulas

```text
2031 revenue = 2027 revenue × (1 + revenue CAGR)^4
2031 net income = 2031 revenue × operating margin × (1 − tax rate)
exit equity value = 2031 net income × exit P/E
exit proceeds = exit equity value × investment/(pre-money + investment) × (1 − dilution)
IRR = (exit proceeds / investment)^(1 / years to exit) − 1
maximum pre-money = [exit equity value × investment × (1 − dilution) / required proceeds] − investment
required proceeds = investment × (1 + target IRR)^years to exit
```

## Open questions that can change the conclusion

| Question | If the answer is favorable | If the answer is adverse |
| --- | --- | --- |
| Who bears first loss? | Higher fee multiple may be justified. | Treat as a credit business and lower margin / exit multiple. |
| Is revenue gross or net? | Net, recurring fee revenue supports a clearer revenue multiple. | Gross recognition may overstate the relevant take rate and valuation scale. |
| What is net vintage loss after recoveries? | Validates data underwriting advantage. | Raises capital cost and can invalidate high-margin case. |
| What is ERP-to-finance conversion? | Establishes CAC advantage. | ERP is a cost center rather than financial distribution. |
| What does KRW 100bn mean? | Audited accounting revenue supports the Base/Bull framing. | Finance volume or run-rate requires a full model reset. |
