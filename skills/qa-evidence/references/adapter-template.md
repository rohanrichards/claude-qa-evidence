# QA Evidence — project adapter (<PROJECT NAME>)

Plumbing only. The process is owned by the user-level `qa-evidence` skill.

## Start the app
- Dev command: <e.g. `pnpm dev`> → <ports>
- Readiness check: <e.g. curl a health endpoint>
- Multi-checkout/port notes: <worktree offsets, env vars>

## Auth (test sessions)
- Mechanism: <cookie/token/fixture + where secrets come from>
- Test users/tiers: <ids, capabilities, limitations>
- The QA driver (<path>) injects auth itself via `launchQA({ tier })`.

## Drive the browser
- Driver: <path to committed qa-driver.ts>; scenario scripts run via <tsx/node command>.
- Browser install fallback: driver falls back to the `msedge` channel if chromium
  is missing, or run `playwright install chromium`.

## Seed / manipulate state
- <scripts, commands, and the DB they may touch; name any DB that must NEVER be written>

## Report
- Home: <docs path>/<YYYY-MM-DD>-<feature>/ — commit `manifest.json` +
  `qa-evidence-report.html`; gitignore `<home>/**/media/`.
- Generate: `node <path>/generate.mjs <report-dir>` (never hand-write report HTML).
- Mock locations for fidelity checks: <canonical dir(s)>
