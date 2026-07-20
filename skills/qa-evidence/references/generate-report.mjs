// scripts/qa-report/generate.mjs
// QA evidence report generator — zero dependencies, plain Node ESM.
// Usage: node scripts/qa-report/generate.mjs <report-dir>
//   <report-dir> must contain manifest.json; media/ is optional.
//   Writes <report-dir>/qa-evidence-report.html
// Portable: copy this single file into any project (also shipped as a
// reference in the qa-evidence skill).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const esc = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const IMG_EXT = /\.(png|jpe?g|webp|gif)$/i
const VID_EXT = /\.(webm|mp4)$/i
const TXT_EXT = /\.(txt|log|json)$/i

/** Render one media reference. Missing files degrade to a labeled placeholder
 *  (media/ is gitignored, so committed reports must survive without assets). */
function media(ref, reportDir) {
  if (!ref) return ''
  const abs = join(reportDir, ref)
  if (!existsSync(abs)) {
    return `<div class="placeholder">media not available locally: <code>${esc(ref)}</code></div>`
  }
  if (IMG_EXT.test(ref)) return `<a href="${esc(ref)}"><img src="${esc(ref)}" alt="${esc(ref)}" loading="lazy"></a>`
  if (VID_EXT.test(ref)) return `<video controls preload="metadata" src="${esc(ref)}"></video>`
  if (TXT_EXT.test(ref)) {
    let body = ''
    try { body = readFileSync(abs, 'utf8') } catch { body = '(unreadable)' }
    return `<pre class="transcript">${esc(body)}</pre>`
  }
  return `<a href="${esc(ref)}">${esc(ref)}</a>`
}

const badge = (status) =>
  `<span class="badge ${esc(status)}" data-status="${esc(status)}">${esc(String(status).toUpperCase())}</span>`

function gatesSection(gates) {
  if (!gates?.length) return ''
  const rows = gates
    .map(
      (g) => `<tr>
      <td>${esc(g.name)}</td><td><code>${esc(g.command)}</code></td>
      <td>${badge(g.result)}</td><td>${esc(g.detail)}</td></tr>`,
    )
    .join('')
  return `<h2>Gates</h2>
  <table><thead><tr><th>Gate</th><th>Command</th><th>Result</th><th>Detail</th></tr></thead>
  <tbody>${rows}</tbody></table>`
}

function mockFidelitySection(items, reportDir) {
  if (!items?.length) return ''
  const blocks = items
    .map((m) => {
      const devs = (m.deviations ?? [])
        .map((d) => `<li><span class="badge ${esc(d.kind)}">${esc(d.kind)}</span> ${esc(d.desc)}</li>`)
        .join('')
      return `<section class="fidelity">
      <h3>${esc(m.view)}</h3>
      <div class="side-by-side">
        <figure><figcaption>Mock</figcaption>${media(m.mock, reportDir)}</figure>
        <figure><figcaption>Actual</figcaption>${media(m.actual, reportDir)}</figure>
      </div>
      <ul class="deviations">${devs || '<li>No deviations found.</li>'}</ul>
    </section>`
    })
    .join('')
  return `<h2>Mock fidelity</h2>${blocks}`
}

function scenarioSection(s, reportDir) {
  const steps = (s.steps ?? []).map((st) => `<li>${esc(st)}</li>`).join('')
  const asserts = (s.assertions ?? [])
    .map(
      (a) => `<li>${a.pass ? '✅' : '❌'} ${esc(a.desc)}
        ${a.evidence ? `<div class="evidence">${media(a.evidence, reportDir)}</div>` : ''}</li>`,
    )
    .join('')
  const bugs = (s.bugs ?? [])
    .map(
      (b) => `<div class="bug"><strong>Found:</strong> ${esc(b.found)}<br>
      <strong>Fixed:</strong> ${esc(b.fixed)}<br><strong>Re-verified:</strong> ${esc(b.reverified)}</div>`,
    )
    .join('')
  return `<section class="scenario" data-status="${esc(s.status)}">
    <h3>${esc(s.id)} — ${esc(s.title)} ${badge(s.status)} <span class="form">[${esc(s.form)}]</span></h3>
    ${s.narrative ? `<p>${esc(s.narrative)}</p>` : ''}
    ${steps ? `<ol class="steps">${steps}</ol>` : ''}
    <ul class="assertions">${asserts}</ul>
    ${s.video ? `<div class="video">${media(s.video, reportDir)}</div>` : ''}
    ${bugs}
  </section>`
}

export function generateReport(manifest, reportDir) {
  if (!manifest || typeof manifest.title !== 'string' || !Array.isArray(manifest.scenarios)) {
    throw new Error('manifest.json must have a string "title" and a "scenarios" array')
  }
  const total = manifest.scenarios.length
  const passed = manifest.scenarios.filter((s) => s.status === 'pass').length
  const summaryRows = manifest.scenarios
    .map((s) => `<tr><td><a href="#${esc(s.id)}">${esc(s.id)}</a></td><td>${esc(s.title)}</td><td>${badge(s.status)}</td></tr>`)
    .join('')
  const notTested = (manifest.notTested ?? []).map((n) => `<li>${esc(n)}</li>`).join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QA Evidence — ${esc(manifest.title)}</title>
<style>
  :root { color-scheme: dark light; }
  body { font-family: system-ui, sans-serif; margin: 0 auto; max-width: 60rem; padding: 2rem 1.5rem;
         background: #17161b; color: #e6e3ee; line-height: 1.55; }
  h1, h2, h3 { line-height: 1.25; }
  h2 { margin-top: 2.5rem; border-bottom: 1px solid #38343f; padding-bottom: .4rem; }
  code, pre { font-family: ui-monospace, monospace; }
  pre.transcript { background: #201e26; border: 1px solid #38343f; border-radius: 8px; padding: 1rem;
                   overflow-x: auto; max-height: 24rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #38343f; padding: .45rem .6rem; text-align: left; vertical-align: top; }
  th { background: #201e26; }
  .badge { display: inline-block; padding: .05rem .55rem; border-radius: 999px; font-size: .78rem;
           font-weight: 700; letter-spacing: .04em; }
  .badge.pass { background: #1d3a2a; color: #7ee2a8; }
  .badge.fail { background: #43222a; color: #ff9db0; }
  .badge.partial { background: #403418; color: #ffd479; }
  .badge.drift { background: #43222a; color: #ff9db0; }
  .badge.intentional { background: #263447; color: #9ec9ff; }
  .scenario { border: 1px solid #38343f; border-radius: 10px; padding: 1rem 1.25rem; margin: 1rem 0; }
  .scenario .form { color: #8f8a9c; font-size: .85rem; font-weight: 400; }
  img, video { max-width: 100%; border-radius: 8px; border: 1px solid #38343f; margin-top: .5rem; }
  .side-by-side { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .side-by-side figcaption { color: #8f8a9c; font-size: .85rem; margin-bottom: .25rem; }
  .placeholder { background: #201e26; border: 1px dashed #524c5e; border-radius: 8px;
                 padding: 1rem; color: #8f8a9c; margin-top: .5rem; }
  .bug { background: #2a2030; border-left: 3px solid #b98aff; border-radius: 6px;
         padding: .6rem .9rem; margin-top: .75rem; }
  .meta { color: #8f8a9c; }
  footer { margin-top: 3rem; color: #8f8a9c; font-size: .85rem; border-top: 1px solid #38343f;
           padding-top: 1rem; }
  @media (prefers-color-scheme: light) {
    body { background: #faf9fc; color: #26232e; }
    th { background: #efedf4; }
    th, td, .scenario, pre.transcript, img, video { border-color: #d9d5e2; }
    pre.transcript, .placeholder { background: #f1eff6; }
  }
</style>
</head>
<body>
<h1>QA Evidence — ${esc(manifest.title)}</h1>
<p class="meta">${esc(manifest.date)} · branch <code>${esc(manifest.branch)}</code> · commit <code>${esc(manifest.commit)}</code>
${manifest.issue ? ` · issue ${esc(manifest.issue)}` : ''}${manifest.pr ? ` · PR ${esc(manifest.pr)}` : ''}</p>

<h2>Verdict: ${passed}/${total} scenarios passed</h2>
<table><thead><tr><th>ID</th><th>Scenario</th><th>Status</th></tr></thead><tbody>${summaryRows}</tbody></table>

${gatesSection(manifest.gates)}
${mockFidelitySection(manifest.mockFidelity, reportDir)}

<h2>Scenarios</h2>
${manifest.scenarios.map((s) => `<a id="${esc(s.id)}"></a>${scenarioSection(s, reportDir)}`).join('')}

${notTested ? `<h2>Not tested / caveats</h2><ul>${notTested}</ul>` : ''}

<footer>Generated by <code>scripts/qa-report/generate.mjs</code> from <code>manifest.json</code>.
Media lives beside this file in <code>media/</code> (gitignored); assertion text and verdicts are authoritative.</footer>
</body>
</html>`
}

// ---- CLI ----
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const dir = process.argv[2]
  if (!dir) {
    console.error('Usage: node scripts/qa-report/generate.mjs <report-dir>')
    process.exit(1)
  }
  const manifestPath = join(dir, 'manifest.json')
  if (!existsSync(manifestPath)) {
    console.error(`No manifest.json found in ${dir}`)
    process.exit(1)
  }
  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (err) {
    console.error(`Invalid manifest.json: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }
  try {
    const html = generateReport(manifest, dir)
    const out = join(dir, 'qa-evidence-report.html')
    writeFileSync(out, html)
    console.log(`wrote ${out}`)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
