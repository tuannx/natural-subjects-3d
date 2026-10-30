// Builds the static site into dist/: home page, every lesson at /<slug>/, catalog.json, cache headers.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { renderIndex } from './index-page.mjs';
import { loadLessons, publicEntry } from './lib/catalog.mjs';
import { injectBundleRuntime } from './lib/runtime.mjs';
import { buildPrimary } from './lib/primary.mjs';

const root = new URL('..', import.meta.url).pathname;
const dist = root + 'dist/';
const lessons = loadLessons(root + 'courses/');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const l of lessons) {
  const out = dist + l.slug + '/';
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(l.dir).filter(f => /\.(webp|png|jpg)$/.test(f))) cpSync(l.dir + f, out + f);
  if (l.kind === 'bundle') writeFileSync(out + 'index.html', injectBundleRuntime(readFileSync(l.dir + 'index.html', 'utf8')));
}
await buildPrimary(lessons.filter(l => l.kind === 'primary'), root, dist);
writeFileSync(dist + 'catalog.json', JSON.stringify(lessons.map(publicEntry), null, 1));
cpSync(root + 'site/site.css', dist + 'site.css');
cpSync(root + 'site/_headers', dist + '_headers');
writeFileSync(dist + 'index.html', renderIndex(lessons));
console.log(`built ${lessons.length} lessons into dist/`);
