---
name: qa-evidence
description: Use before opening ANY PR for a non-trivial feature or fix, when the user asks for QA / a QA report / validation evidence, or when a phase reaches its final review round. Produces an evidence-grade HTML QA report (screenshots + video for UI; behavioural demo + gates for engine/API) presented for user approval BEFORE the PR. Also use when asked to compare a built UI against a mock.
---

# QA Evidence

Run live QA against the real running application and produce an HTML evidence report
the user approves **before** any PR is opened. QA is iterative, not terminal: bugs
found here are the point — fix, re-verify, document, and loop back to build if needed.
QA approval is NOT merge authorization.

## Process

1. **Resolve the project adapter.** Read `.claude/rules/qa-evidence.md` in the project.
   It owns the plumbing: how to start the app, authenticate, seed state, where reports
   live. **If it doesn't exist, bootstrap it** (see Bootstrap below) before doing any QA.
   Never improvise "generic" QA without an adapter.

2. **Preflight — fix, don't route around.** In order:
   - Playwright browsers installed? If not: `playwright install chromium`, or use the
     driver's `msedge` channel fallback (no install needed).
   - App running and reachable at the adapter's URL (worktrees: apply the adapter's
     port recipe)? If not, start it and wait for readiness.
   - Auth injection works (navigate to a protected route; assert you are NOT redirected
     to login)?
   Environment friction is never a reason to downgrade the evidence form or skip QA.

3. **Choose the evidence form — never ask:**
   - **UI surface** → screenshots at every key assertion + per-scenario recorded video.
   - **Engine/API/CLI (no UI)** → a runnable behavioural demo driving the real built
     artifact end-to-end + captured gate output (lint/typecheck/test/build); transcripts
     go in the report as text media.
   - **Mixed** → both.

4. **Write the scenario plan first.** Before driving anything, write `manifest.json`
   (contract: `references/manifest.schema.json`) with scenarios mapping to (a) the
   acceptance criteria, and (b) adjacent behaviors the change could have broken
   (regression checks). Fill in statuses/evidence as you execute.

5. **Execute with the project's committed driver** against the real running app.
   Screenshots at every key assertion, named per scenario. Videos must finalize
   (close the context before reading the video path).

6. **Mock fidelity.** If a mock exists for any touched UI (check the plan header and
   the adapter's mock locations): render the mock at the driver's viewport, screenshot
   it, capture the real view identically, and record every deviation classified
   `intentional` or `drift`. **Compare like-for-like: stage the app's state (seed data
   per the adapter) so the real view exercises the same UI elements the mock depicts —
   an empty state compared against a populated mock proves nothing.** Multi-section
   mock documents need explicit scroll-targeting to the comparable section before the
   shot. Drift is either fixed or explicitly accepted by the user in the report.

7. **Bugs found → fix → re-verify → document** the found/fixed/re-verified narrative in
   the scenario's `bugs` array. A failing scenario is a loop back to build, not a
   failed QA run.

8. **Generate the report** with the project's generator (never hand-write report HTML),
   commit manifest + HTML to the adapter's report home (media stays local), and give
   the user the file path.

9. **Hold for approval.** Terminal state: report presented, awaiting the user's verdict.
   Only after approval does the PR open (per project rules). Never merge.

## Evidence-quality rules (each earned from a real incident)

- **Evidence must show the asserted thing.** A true PASS with a screenshot of the wrong
  part of the page is bad evidence — re-capture until the asserted element is visibly
  in frame (scroll it into view first).
- **PASS comes from assertions, not eyeballs.** DOM/DB assertions decide; media proves.
- **No simulated surfaces.** Never rebuild a component as a static preview and
  screenshot that — it cannot catch integration drift, which is the whole point.
  The real app serves the real component, always.
- **Videos must finalize.** Close the browser context, then read `video.path()` and
  rename. A 0-byte webm is not evidence.
- **Honesty section.** Every report has "Not tested / caveats". Unverified claims are
  listed there, never rounded up into PASS counts.
- **Use the project's real IDs and seeded users** per the adapter's gotchas — a zero
  result from querying with a wrong/test client ID looks like a failure and isn't.

## Bootstrap (no adapter in this project?)

Leave the next session better off — write the plumbing INTO the project, don't carry
it in conversation:

1. Discover: how the app starts (dev command, ports, readiness), how a test session
   authenticates (cookie/token/fixture — if unclear, ask the user ONCE and record the
   answer in the adapter), where reports should live.
2. Copy `references/generate-report.mjs` into the project (e.g. `scripts/qa-report/generate.mjs`).
3. Adapt `references/qa-driver.template.ts` to the project's auth and commit it near
   existing e2e utils.
4. Write the adapter from `references/adapter-template.md` → `.claude/rules/qa-evidence.md`.
5. Add the report-home media gitignore. Commit all of it, then proceed with QA.
