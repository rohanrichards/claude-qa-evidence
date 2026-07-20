// Template — search for ADAPT markers, then commit into your project near existing e2e utils.
//
// QA evidence driver — an authenticated, video-recording Playwright session
// with numbered screenshots and finalized per-scenario video.
// Used by ad-hoc QA scenario scripts (ADAPT: run via your project's TS script runner,
// e.g. `npx tsx <script>`), NOT by the Playwright test runner.
// See your project's .claude/rules/qa-evidence.md adapter.
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { mkdirSync, renameSync } from 'fs'
import path from 'path'

// ADAPT: replace with your project's auth mechanism. The driver needs a function
// returning Playwright cookies (or swap addCookies for storageState/headers below).
// import { getAuthCookies } from './auth'
// import type { TestUserType } from './test-users'
type TestUserType = 'free' | 'pro' // ADAPT: your tiers
declare function getAuthCookies(tier: TestUserType): Parameters<
  import('@playwright/test').BrowserContext['addCookies']
>[0] // ADAPT: implement or import

const VIEWPORT = { width: 1280, height: 720 } // matched to recordVideo size

export interface LaunchQAOptions {
  /** Directory the report lives in; media lands in `${evidenceDir}/media`. */
  evidenceDir: string
  /** Seeded test user tier. Default 'pro'. */
  tier?: TestUserType
  /** Default http://localhost:<3000 + WORKTREE_PORT_OFFSET>. */
  baseURL?: string
  /** Record a video for this session. Default true. */
  video?: boolean
  /** 'msedge' needs no `playwright install` (uses system Edge). Default 'chromium',
   *  which falls back to msedge automatically if chromium isn't installed. */
  browser?: 'chromium' | 'msedge'
}

export interface QASession {
  page: Page
  context: BrowserContext
  browser: Browser
  /** Screenshot into media/ as `NN-<slug>.png`; returns the manifest-relative path. */
  shoot(name: string, opts?: { fullPage?: boolean }): Promise<string>
  /** Close the context (finalizes video), rename the webm to `<videoName>.webm`,
   *  close the browser. Returns the manifest-relative video path, or null. */
  done(videoName?: string): Promise<string | null>
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function launchBrowser(kind: 'chromium' | 'msedge'): Promise<Browser> {
  if (kind === 'msedge') return chromium.launch({ channel: 'msedge' })
  try {
    return await chromium.launch()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("playwright install")) {
      console.warn('[qa-driver] chromium not installed; falling back to msedge channel')
      return chromium.launch({ channel: 'msedge' })
    }
    throw err
  }
}

export async function launchQA(opts: LaunchQAOptions): Promise<QASession> {
  const tier = opts.tier ?? 'pro'
  // ADAPT: project port convention
  const offset = Number(process.env.WORKTREE_PORT_OFFSET ?? 0)
  const baseURL = opts.baseURL ?? `http://localhost:${3000 + offset}`
  const video = opts.video ?? true
  const mediaDir = path.resolve(opts.evidenceDir, 'media')
  mkdirSync(mediaDir, { recursive: true })

  const browser = await launchBrowser(opts.browser ?? 'chromium')
  const context = await browser.newContext({
    baseURL,
    viewport: VIEWPORT,
    colorScheme: 'dark', // ADAPT: your project's default color scheme
    recordVideo: video ? { dir: mediaDir, size: VIEWPORT } : undefined,
  })
  await context.addCookies(getAuthCookies(tier))
  const page = await context.newPage()

  let shotCount = 0
  return {
    page,
    context,
    browser,
    async shoot(name, shotOpts) {
      shotCount += 1
      const file = `${String(shotCount).padStart(2, '0')}-${slug(name)}.png`
      await page.screenshot({ path: path.join(mediaDir, file), fullPage: shotOpts?.fullPage ?? false })
      return `media/${file}`
    },
    async done(videoName) {
      const videoHandle = page.video()
      await context.close() // finalizes the webm
      let result: string | null = null
      if (videoHandle && videoName) {
        const raw = await videoHandle.path()
        const file = `${slug(videoName)}.webm`
        renameSync(raw, path.join(mediaDir, file))
        result = `media/${file}`
      }
      await browser.close()
      return result
    },
  }
}
