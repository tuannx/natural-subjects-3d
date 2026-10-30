// Makes cover.webp (800x450) and cover-480.webp for primary lessons from the lesson itself.
// Usage: node scripts/covers.mjs [slug ...]   (default: every primary lesson without a cover)
// Needs the site built first (npm run build in the repo root). Picks lesson.json "coverStep" (default 0).
import puppeteer from 'puppeteer-core';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { paths } from './args.mjs';
import { browserPath } from './browser.mjs';
import { serve } from './serve.mjs';
import { hideChrome } from './lesson-page.mjs';

const courses = paths.root + 'courses/';
const meta = slug => JSON.parse(readFileSync(courses + slug + '/lesson.json', 'utf8'));
const slugs = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(courses).filter(s => existsSync(courses + s + '/scene.js') && !existsSync(courses + s + '/cover.webp'));

const site = await serve(paths.root + 'dist/');
const browser = await puppeteer.launch({ executablePath: await browserPath(), args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const slug of slugs) {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 450, deviceScaleFactor: 1 });
  await page.goto(`${site.url}/${slug}/?quality=high`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lesson, { timeout: 60000 });
  await hideChrome(page, 'primary', { captions: false });
  await page.evaluate(i => { window.__lesson.goto(i); window.__lesson.renderAt(3); }, meta(slug).coverStep || 0);
  const out = courses + slug + '/';
  await page.screenshot({ path: out + 'cover.webp', type: 'webp', quality: 82 });
  await page.screenshot({ path: out + 'cover-480.webp', type: 'webp', quality: 75, clip: { x: 0, y: 0, width: 800, height: 450, scale: 0.6 } });
  console.log('cover', slug);
  await page.close();
}
await browser.close();
site.close();
