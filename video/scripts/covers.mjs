// Makes cover.webp (800x450) and cover-480.webp for engine lessons (scene.js) from the lesson itself.
// Usage: node scripts/covers.mjs [slug ...]   (default: every engine lesson without a cover)
// Needs the site built first (npm run build in the repo root; DIST=<dir> if built with OUT=<dir>).
// Picks lesson.json "coverStep" (default 0).
import puppeteer from 'puppeteer-core';
import { paths } from './args.mjs';
import { browserPath } from './browser.mjs';
import { serve } from './serve.mjs';
import { hideChrome } from './lesson-page.mjs';
import { loadLessons } from '../../site/lib/catalog.mjs';

const args = process.argv.slice(2);
const lessons = loadLessons(paths.root + 'courses/', args.length ? args : null)
  .filter(l => l.kind === 'scene' && (args.length || !l.thumb));

const site = await serve(process.env.DIST?.replace(/\/?$/, '/') || paths.root + 'dist/');
const browser = await puppeteer.launch({ executablePath: await browserPath(), args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const { slug, dir, coverStep } of lessons) {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 450, deviceScaleFactor: 1 });
  await page.goto(`${site.url}/${slug}/?quality=high`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lesson, { timeout: 60000 });
  await hideChrome(page, 'primary', { captions: false });
  await page.evaluate(i => { window.__lesson.goto(i); window.__lesson.renderAt(3); }, coverStep || 0);
  const out = dir;
  await page.screenshot({ path: out + 'cover.webp', type: 'webp', quality: 82 });
  await page.screenshot({ path: out + 'cover-480.webp', type: 'webp', quality: 75, clip: { x: 0, y: 0, width: 800, height: 450, scale: 0.6 } });
  console.log('cover', slug);
  await page.close();
}
await browser.close();
site.close();
