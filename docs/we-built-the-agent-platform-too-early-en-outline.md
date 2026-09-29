# English localization outline — We Built the Agent Platform Too Early

## Editorial intent

- **Working title:** We Built the Agent Platform Too Early
- **Alternate title:** Building Agents Got Easy. Production Didn't.
- **Series:** Enterprise AX
- **Format:** Engineering retrospective + enterprise AX essay
- **Audience:** Engineering leaders, AI platform teams, FDEs, and transformation owners
- **Thesis:** Don't start by building the platform. Earn the platform through production.
- **Localization strategy:** Natural en-US adaptation with semantic parity. Preserve the author's enterprise experience, technical claims, caveats, and Wonderful analysis; do not turn it into a literal translation or a vendor summary.

## Proposed AnswerBlock

**Question:** How should an enterprise agent platform be built?

A durable enterprise agent platform is usually discovered through production rather than designed in full on a whiteboard. Start with one narrow workflow, deploy it, observe failures, fix them, and extract a shared capability only after the same problem repeats across distinct use cases. Coding agents have reduced the cost of convincing prototypes, but they have not removed the cost of evaluation, permissions, state, recovery, security, observability, and operations. The sequence is **Experienced → Repeated → Abstracted**.

## Structure

1. **The architecture was reasonable**
   - Open with the recurring enterprise pattern: understand internal documents, combine external information, apply an analysis framework.
   - Explain Tools → Modules → Agent Runs → Dynamic Orchestration.
   - Retain “Build once, compose many workflows.”
   - Make clear that this was a rational response to the information available at the time.

2. **The Prototype Illusion**
   - Coding agents can read repositories, edit files, run commands, and complete multi-step engineering work.
   - Their productivity gains compress visible implementation time and make prototypes look finished.
   - Preserve: “AI coding has compressed the cost of building demos, not the cost of operating systems.”
   - Use Figure 2 as the lead visualization; label it explicitly as conceptual, not measured data.

3. **Predictability became the real engineering problem**
   - Cover tool selection, decomposition variance, context loss, intermediate hallucination, error propagation, retry, re-planning, state consistency, validation, timeouts, permissions, latency, logging, observability, model changes, API failures, and document variance.
   - Use concrete engineering questions rather than a generic reliability list.
   - Preserve: “How do you make an agent predictable?”

4. **Users benchmark the experience, not the architecture**
   - Explain the tension between enterprise constraints and consumer-grade interaction expectations.
   - Preserve: “Users do not experience your architecture. They experience your failures.”
   - Avoid framing management or users as uninformed.

5. **The last operational layer**
   - Use the iceberg figure to distinguish visible capability from production systems work.
   - Keep “The last 10% of engineering can determine 90% of perceived reliability” explicitly framed as rhetoric, not statistics.

6. **Trust Debt**
   - Describe the early broad rollout, user churn, stabilization, and the cost of re-engagement without identifying the company or project.
   - Define Trust Debt as future adoption cost created by premature exposure to unreliable behavior.
   - Emphasize controlled rollout as a learning and trust-preservation mechanism.

7. **Production Before Platform**
   - Contrast Platform First with Production First.
   - Keep the narrow example: internal business plans plus the latest results of five named competitors, producing a fixed-template 3C analysis.
   - Limit data sources, tools, output schema, and autonomy.
   - Preserve: “The right abstraction should be discovered, not imagined.”

8. **Wonderful as a corroborating observation**
   - Order the argument as personal experience → lesson → similar observations in Wonderful's writing.
   - State that Wonderful is a commercial vendor and separate its product positioning from its production observations.
   - Connect execution, deployment learning, platform scope, and the FDE-to-product feedback loop.

9. **When a platform is justified**
   - Distinguish a minimum viable control plane from a universal workflow abstraction.
   - Preserve the five extraction tests: repetition, common cause, quality/speed benefit, ownership, and escape hatch.

10. **Closing**
    - Return to the sequence: solve one problem fully; look for recurrence in the second; abstract only after the third confirms the pattern.
    - Final sentence: “Don't start by building the platform. Earn the platform through production.”

## Localization notes

- Preserve Korean enterprise context because it is personal production experience, not an illustrative setting to Americanize.
- Keep technical English terms where they are standard: tool selection, decomposition, retry, state consistency, observability, evaluation, authorization, DAG, and FDE.
- Use short English paragraphs and restrained first-person reflection.
- Do not add industry-wide success-rate statistics or claims that are not supported by a primary source.
- Create the English edition only after the Korean draft is approved. At that point, add the same `translationKey` to both editions and use the repository's `localized-adaptation` metadata.

## Verified source chronology

| Source | Published | Role in the essay |
| --- | --- | --- |
| Wonderful, “The Execution Gap No Model Can Close” | 2026-01-07 | Model capability vs implementation |
| Wonderful, “The Learning Curve You Can't Skip” | 2026-02-02 | Production learning and tacit knowledge |
| Wonderful, “FDE: The Engineers Owning The Last Mile” | 2026-03-03 | Last-mile enterprise deployment |
| Wonderful, “The Hard Part of AI Agents Isn't Building Them” | 2026-04-01 | Verification, monitoring, compliance, iteration |
| Wonderful, “Why enterprise AI gets stuck in pilot mode” | 2026-05-07 | Prototype-to-production gap |
| Wonderful, “Building an AI Platform Won't Transform Your Business” | 2026-08-31 | Platform scope and vendor positioning |
| Wonderful, “Let the Field Build the Product” | 2026-09-17 | Field learning returned to the core product |
| OpenAI, Codex | reviewed 2026-09-29 | Current coding-agent positioning |
| Anthropic, Claude Code overview | reviewed 2026-09-29 | Current coding-agent capabilities |
| Cursor documentation | reviewed 2026-09-29 | Current coding-agent capabilities |

