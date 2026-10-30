// Builds the static site into dist/: home page, subject pages, every lesson at /<slug>/, catalog.json, cache headers.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { renderIndex } from './index-page.mjs';
import { renderSubject } from './subject-page.mjs';
import { loadLessons, loadSubjects, publicEntry } from './lib/catalog.mjs';
import { injectBundleRuntime } from './lib/runtime.mjs';
import { buildScenes } from './lib/scenes.mjs';

const root = new URL('..', import.meta.url).pathname;
const dist = (process.env.OUT || root + 'dist').replace(/\/?$/, '/'); // OUT=<dir> builds elsewhere
const subjects = loadSubjects(root + 'courses/');
const lessons = loadLessons(root + 'courses/', process.env.LESSONS?.split(','));
const reserved = new Set(['assets', 'subjects']);
for (const l of lessons) if (reserved.has(l.slug)) throw new Error(`lesson slug "${l.slug}" is reserved for the site`);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const l of lessons) {
  const out = dist + l.slug + '/';
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(l.dir).filter(f => /\.(webp|png|jpg)$/.test(f))) cpSync(l.dir + f, out + f);
  if (l.kind === 'bundle') writeFileSync(out + 'index.html', injectBundleRuntime(readFileSync(l.dir + 'index.html', 'utf8')));
}
await buildScenes(lessons.filter(l => l.kind === 'scene'), root, dist);
for (const s of subjects) {
  mkdirSync(dist + 'subjects/' + s.key, { recursive: true });
  writeFileSync(dist + `subjects/${s.key}/index.html`, renderSubject(s, lessons, subjects));
}
writeFileSync(dist + 'catalog.json', JSON.stringify(lessons.map(publicEntry), null, 1));
writeFileSync(dist + 'subjects.json', JSON.stringify(subjects, null, 1));
cpSync(root + 'site/site.css', dist + 'site.css');
cpSync(root + 'site/_headers', dist + '_headers');
writeFileSync(dist + 'index.html', renderIndex(lessons, subjects));
console.log(`built ${lessons.length} lessons (${subjects.map(s => `${s.name} ${lessons.filter(l => l.subject === s.key).length}`).join(', ')}) into dist/`);
