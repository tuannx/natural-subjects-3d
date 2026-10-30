// Smoke test for built lessons: opens each one on a phone and a desktop screen, walks every step,
// and fails on page errors or console errors. Optional screenshots for a quick visual check.
// Usage: node scripts/check.mjs [slug ...] [--shots <dir>]   (default: every lesson in dist/catalog.json)
// Needs the site built first (npm run build in the repo root; DIST=<dir> if built with OUT=<dir>).
import puppeteer from 'puppeteer-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { paths } from './args.mjs';
import { browserPath } from './browser.mjs';
import { serve } from './serve.mjs';

const argv = process.argv.slice(2);
const shotsAt = argv.indexOf('--shots');
const shots = shotsAt >= 0 ? argv.splice(shotsAt, 2)[1].replace(/\/?$/, '/') : null;
const dist = process.env.DIST?.replace(/\/?$/, '/') || paths.root + 'dist/';
const slugs = argv.length ? argv : JSON.parse(readFileSync(dist + 'catalog.json', 'utf8')).map(l => l.slug);
const SCREENS = { phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, desktop: { width: 1280, height: 800, deviceScaleFactor: 1 } };

const site = await serve(dist);
const browser = await puppeteer.launch({ executablePath: await browserPath(), args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = 0;
for (const slug of slugs) {
  for (const [screen, viewport] of Object.entries(SCREENS)) {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${site.url}/${slug}/`, { waitUntil: 'load' });
    const kind = await page.waitForFunction(() => (window.__lesson && 'primary') || (window.__lab && 'lab'), { timeout: 60000 })
      .then(h => h.jsonValue()).catch(() => 'none');
    const count = kind === 'none' ? 0 : await page.evaluate(k => (k === 'primary' ? window.__lesson.steps : window.__lab.STEPS.length), kind);
    for (let i = 0; i < count; i++) {
      await page.evaluate((k, i) => (k === 'primary' ? (window.__lesson.goto(i), window.__lesson.renderAt(i * 3 + 2.5)) : window.__lab.goto(i, { instant: true })), kind, i);
      if (shots) { mkdirSync(shots, { recursive: true }); await page.screenshot({ path: `${shots}${slug}-${screen}-${i}.jpg`, type: 'jpeg', quality: 70 }); }
    }
    const ok = kind !== 'none' && !errors.length;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${slug} ${screen} ${count} steps${kind === 'none' ? ' (lesson did not start)' : ''}${errors.length ? '\n     ' + errors.join('\n     ') : ''}`);
    await page.close();
  }
}
await browser.close();
site.close();
if (failed) { console.error(`${failed} failed`); process.exit(1); }
