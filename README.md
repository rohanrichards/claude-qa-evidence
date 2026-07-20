# qa-evidence — evidence-grade QA for Claude Code

A Claude Code skill that makes "it works" a *demonstrated* claim, not an asserted one.
Before any PR for a non-trivial change, the model runs live QA against the **real
running application** and produces an HTML evidence report — presented to you for
approval **before** the PR opens.

## What you get

- **Evidence forms matched to the surface** (chosen automatically, never asked):
  - UI work → per-assertion screenshots + per-scenario recorded video (Playwright `recordVideo`)
  - Engine/API/CLI work → a runnable behavioural demo driving the real built artifact,
    plus captured gate output (lint / typecheck / test / build)
- **A generated HTML report** — PASS/FAIL verdict table, gates, per-scenario sections
  with embedded media, bug found→fixed→re-verified narratives, an honest
  "Not tested / caveats" section — built by a zero-dependency generator from a JSON
  manifest, never hand-written.
- **Mock fidelity**: if a design mock exists for the touched UI, the report includes
  like-for-like side-by-side comparisons (app state *staged* to match what the mock
  depicts) with every deviation classified `intentional` or `drift`.
- **Discipline rules earned from real incidents**: evidence must show the asserted
  thing; PASS comes from assertions, not eyeballs; no simulated surfaces (a static
  rebuild of a component is never QA); videos must finalize; environment friction is
  never a reason to downgrade the evidence form.

## Why it exists

Analysis across weeks of real sessions showed the failure mode: a QA convention that
lives as prose ("take screenshots and video, make a report") transfers badly between
models and sessions — the plumbing gets re-derived every run, and under friction the
expensive parts get skipped or turned into "should I bother?" questions. The fix is
**two layers**:

1. **This skill (generic, portable)** — owns the process: preflight, evidence forms,
   scenario planning, quality rules, report contract, approval gate.
2. **A per-project adapter (committed to each repo)** — owns the plumbing: how to start
   the app, authenticate a test session, seed state, where reports live, plus a
   committed Playwright driver and report generator.

On first use in a project with no adapter, the skill **bootstraps one** from its
`references/` (driver template with `ADAPT` markers, portable report generator,
adapter template, manifest schema), commits it, and proceeds — so the next session
inherits working infrastructure instead of prose.

## Install

```
/plugin marketplace add rohanrichards/claude-qa-evidence
/plugin install qa-evidence@rohan-skills
```

Then in any project, either invoke `/qa-evidence` directly or just work normally —
the skill triggers before PRs for non-trivial changes, when you ask for QA or a QA
report, or when you ask to compare a built UI against a mock.

## Requirements

- Playwright available in the target project for UI evidence (the driver falls back to
  the system Edge channel if chromium isn't installed)
- Node ≥ 20 for the report generator (zero npm dependencies)

## Report layout (per run)

```
docs/<your-qa-home>/<YYYY-MM-DD>-<feature>/
├── manifest.json            # committed — the structured evidence record
├── qa-evidence-report.html  # committed — generated, degrades gracefully without media
└── media/                   # gitignored — screenshots, webm videos, transcripts
```

## Notes

- QA approval is **not** merge authorization — the skill's terminal state is a report
  presented for review.
- Bugs found during QA are the point: fix → re-verify → document. A failing scenario
  loops back to build; it doesn't fail the run.
