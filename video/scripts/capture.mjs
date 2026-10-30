// Step 1 of the video export: open a built lesson in headless Chrome and save frames for each step
// to public/captures/<slug>/, plus manifest.json with the titles and captions Remotion needs.
// Both kinds are rendered frame by frame on a virtual clock, so the output is exact and smooth
// even on a slow machine: primary lessons through window.__lesson.renderAt, the 3D lab lessons
// through a requestAnimationFrame/performance.now shim (virtual-time.js).
import puppeteer from 'puppeteer-core';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { parseArgs, paths } from './args.mjs';
import { browserPath } from './browser.mjs';
import { serve } from './serve.mjs';
import { hideChrome, stepCaption } from './lesson-page.mjs';
import { findLesson } from '../../site/lib/catalog.mjs';

const o = parseArgs();
const dist = paths.root + 'dist/';
if (!existsSync(dist + o.slug + '/index.html')) throw new Error(`dist/${o.slug} not found: run "npm run build" in the repo root first`);
const meta = findLesson(paths.root + 'courses/', o.slug);
const out = paths.video + `public/captures/${o.slug}/`;
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const site = await serve(dist);
const browser = await puppeteer.launch({
  executablePath: await browserPath(),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: o.width, height: o.height, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(readFileSync(paths.video + 'scripts/virtual-time.js', 'utf8'));
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${site.url}/${o.slug}/?quality=high`, { waitUntil: 'load' });
const kind = await page.waitForFunction(() => (window.__lesson && 'primary') || (window.__lab && 'lab'), { timeout: 60000 }).then(h => h.jsonValue());
await hideChrome(page, kind);
await new Promise(r => setTimeout(r, 1500)); // let shaders compile and the first framing settle
if (kind === 'lab') await page.evaluate(() => window.__vt.start());

const count = await page.evaluate(k => (k === 'primary' ? window.__lesson.steps : window.__lab.STEPS.length), kind);
const perStep = Math.round(o.seconds * o.captureFps);
const steps = [];
for (let i = 0; i < count; i++) {
  mkdirSync(out + i, { recursive: true });
  await page.evaluate((k, i) => (k === 'primary' ? window.__lesson.goto(i) : window.__lab.goto(i, { instant: false })), kind, i);
  for (let f = 0; f < perStep; f++) {
    if (kind === 'primary') await page.evaluate(t => window.__lesson.renderAt(t), i * o.seconds + f / o.captureFps);
    else await page.evaluate(ms => window.__vt.tick(ms), 1000 / o.captureFps);
    await page.screenshot({ path: `${out}${i}/${f}.jpg`, type: 'jpeg', quality: 88 });
  }
  steps.push({ ...stepCaption(meta, i, count), frames: perStep });
  console.log(`step ${i + 1}/${count}`);
}
writeFileSync(out + 'manifest.json', JSON.stringify({
  slug: o.slug, title: meta.title, question: meta.question, ages: meta.ages, level: meta.level, source: meta.source,
  width: o.width, height: o.height, fps: o.fps, captureFps: o.captureFps, steps,
}, null, 1));
await browser.close();
site.close();
console.log(`\ncaptured ${count} steps x ${perStep} frames -> public/captures/${o.slug}/`);
if (errors.length) console.warn('page errors:', errors);
