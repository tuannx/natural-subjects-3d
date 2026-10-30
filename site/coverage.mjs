// Compares docs/curriculum-map.md with the lessons in courses/: refreshes the map's status marks
// (✅ built, ○ planned) and prints what is built and missing per level and subject.
// Usage: npm run coverage
import { readFileSync, writeFileSync } from 'node:fs';
import { loadLessons } from './lib/catalog.mjs';

const root = new URL('..', import.meta.url).pathname;
const file = root + 'docs/curriculum-map.md';
const built = new Map(loadLessons(root + 'courses/').map(l => [l.slug, l]));
const rows = [];
let level = '', subject = '';
const md = readFileSync(file, 'utf8').split('\n').map(line => {
  if (line.startsWith('## ')) level = line.slice(3).replace(/ \(.*/, '');
  if (line.startsWith('### ')) subject = line.slice(4);
  const m = line.match(/^(\|.*\| `([a-z0-9-]+)` \| )(✅|○)( \|)$/);
  if (!m) return line;
  const l = built.get(m[2]);
  if (l && l.subject !== subject.toLowerCase().replace(' & ', '-')) console.warn(`${m[2]}: built under ${l.subject}, mapped under ${subject}`);
  rows.push({ level, subject, slug: m[2], done: !!l });
  return m[1] + (l ? '✅' : '○') + m[4];
});
writeFileSync(file, md.join('\n'));

for (const lv of [...new Set(rows.map(r => r.level))]) {
  console.log(lv);
  for (const s of [...new Set(rows.filter(r => r.level === lv).map(r => r.subject))]) {
    const mine = rows.filter(r => r.level === lv && r.subject === s), done = mine.filter(r => r.done).length;
    console.log(`  ${s.padEnd(14)} ${done}/${mine.length}  missing: ${mine.filter(r => !r.done).map(r => r.slug).join(', ') || 'none'}`);
  }
}
const done = rows.filter(r => r.done).length;
console.log(`\n${done}/${rows.length} mapped topics built`);
