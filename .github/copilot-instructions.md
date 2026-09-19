# The Archive — GitHub Copilot

Follow `AGENTS.md` in the repository root. Short copy of the rules that must not be skipped:

- Static Astro site. No SSR, Cloudflare adapter, or React unless the user asks.
- Never commit to `develop` or `main`. Branch → pull request → CI (`npm test`, `npm run build`) → merge.
- Site changes use `feat/`, `fix/`, or `design/`. Articles use `content/<slug>` from `develop` with `draft: true`.
- After Preview, open a second PR from the same branch into `main`. Do not merge all of `develop` into `main` while drafts should stay off production.
- `develop` = Cloudflare Preview. `main` = Production. Cloudflare deploys on merge; do not add a deploy script.
- Korean is the source edition. Pair English with the same `translationKey`. Keep prose readable without JavaScript.
- Do not add extra analytics beacons, store raw IP/fingerprints, or ship Cost vs Carbon until that article exists.

Read `README.md` and `docs/EDITORIAL_WORKFLOW.md` before changing publishing or branching behavior.
