// Builds the static site into dist/: home page, lessons at /<slug>, covers, catalog.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { renderIndex } from './index-page.mjs';

const root = new URL('..', import.meta.url).pathname;
const dist = root + 'dist/';
const catalog = JSON.parse(readFileSync(root + 'catalog.json', 'utf8'));

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const f of readdirSync(root + 'courses').filter(f => f.endsWith('.html'))) cpSync(root + 'courses/' + f, dist + f);
cpSync(root + 'covers', dist + 'covers', { recursive: true });
cpSync(root + 'catalog.json', dist + 'catalog.json');
cpSync(root + 'site/site.css', dist + 'site.css');
writeFileSync(dist + 'index.html', renderIndex(catalog));
console.log(`built ${catalog.length} lessons into dist/`);
