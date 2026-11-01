// Accessibility audit. Run the server first (npm run dev), then:  npm run audit
// Checks every page in the light, dark and high-contrast themes with axe-core
// (the same kind of rules the WAVE extension uses) and saves screenshots to docs/screenshots.
//   - uses your installed Google Chrome. If it is not found, set CHROME_PATH to chrome.exe / chromium
//   - set BASE_URL to audit a deployed site, e.g. BASE_URL=https://studybuddy.onrender.com npm run audit
const { chromium } = require('playwright-core');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.AUDIT_EMAIL || 'demo@studybuddy.dev';
const PASSWORD = process.env.AUDIT_PASSWORD || 'Demo@1234';
const SHOTS = process.env.SHOTS !== 'off';

const PUBLIC_PAGES = ['index.html', 'login.html', 'register.html', '404.html'];
const APP_PAGES = ['dashboard.html', 'planner.html', 'focus.html', 'notes.html', 'quizzes.html', 'flashcards.html', 'xml.html'];
const THEMES = ['light', 'dark', 'contrast'];
const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function launch() {
  const opts = { headless: true };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  else opts.channel = 'chrome';
  return chromium.launch(opts);
}

(async () => {
  const browser = await launch();
  const outDir = path.join(__dirname, '..', 'docs', 'screenshots');
  if (SHOTS) fs.mkdirSync(outDir, { recursive: true });
  let problems = 0;
  const report = [];

  async function audit(context, file, theme, text = 'normal', viewport) {
    const page = await context.newPage();
    if (viewport) await page.setViewportSize(viewport);
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    // choose the theme BEFORE the page loads
    await page.addInitScript(([t, x]) => localStorage.setItem('sb-prefs', JSON.stringify({ theme: t, text: x, motion: 'reduce' })), [theme, text]);
    await page.goto(BASE + '/' + file, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const results = await new AxeBuilder({ page }).withTags(RULES).analyze();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const h1s = await page.evaluate(() => document.querySelectorAll('h1').length);
    const label = `${file.padEnd(16)} ${theme.padEnd(9)} ${text.padEnd(7)} ${viewport ? viewport.width + 'px' : 'desktop'}`;
    const issues = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    if (overflow > 1) issues.push(`horizontal scroll of ${overflow}px`);
    if (h1s !== 1) issues.push(`page has ${h1s} h1 headings (needs exactly 1)`);
    consoleErrors.forEach((e) => issues.push('console error: ' + e.slice(0, 160)));
    problems += issues.length;
    report.push({ label, issues });
    console.log(`${issues.length ? 'FAIL' : 'pass'}  ${label}${issues.length ? '\n        ' + issues.join('\n        ') : ''}`);
    if (SHOTS && theme === 'light' && text === 'normal' && !viewport) {
      await page.screenshot({ path: path.join(outDir, file.split('?')[0].replace('.html', '') + '.png'), fullPage: true });
    }
    await page.close();
  }

  // 1) pages anyone can see
  let context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  for (const t of THEMES) for (const f of PUBLIC_PAGES) await audit(context, f, t);
  await context.close();

  // 2) pages that need a login
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const res = await context.request.post(BASE + '/api/auth/login', {
    headers: { 'X-Requested-With': 'StudyBuddy' }, data: { email: EMAIL, password: PASSWORD } });
  if (!res.ok()) { console.error('Login failed. Run "npm run seed" first.'); process.exit(2); }
  const quizzes = await (await context.request.get(BASE + '/api/quizzes')).json();
  const quizPage = quizzes.data && quizzes.data[0] ? `quiz-take.html?id=${quizzes.data[0].id}` : null;
  const pages = [...APP_PAGES, ...(quizPage ? [quizPage] : [])];
  for (const t of THEMES) for (const f of pages) await audit(context, f, t);

  // 3) extra: big text and a phone-sized screen
  for (const f of ['dashboard.html', 'planner.html', 'notes.html']) {
    await audit(context, f, 'light', 'xlarge');
    await audit(context, f, 'light', 'normal', { width: 375, height: 800 });
  }
  await context.close();
  await browser.close();

  console.log(`\n${report.length} page checks, ${problems} problem(s).`);
  process.exit(problems ? 1 : 0);
})();
