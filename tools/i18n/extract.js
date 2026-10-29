// Usage: node extract.js <coursesDir> <outDir>
// Writes <outDir>/<slug>.json (unit texts in source order) and <outDir>/_all.json (text -> files).
const fs = require('fs'), path = require('path');
const { findUnits, CJK } = require('./units');

const [dir, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const all = {};
const SCRIPT = /<script type="module">([\s\S]*?)<\/script>/;

for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort()) {
  const html = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = html.match(SCRIPT);
  const units = findUnits(m[1]);
  const texts = [];
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  if (title && CJK.test(title)) texts.push(title);
  for (const u of units) texts.push(u.text);
  const slug = f.replace(/\.html$/, '');
  const uniq = [...new Set(texts)];
  fs.writeFileSync(path.join(out, slug + '.json'), JSON.stringify(uniq, null, 1));
  for (const t of uniq) (all[t] ||= []).push(slug);
  console.log(slug, units.length, uniq.length);
}
fs.writeFileSync(path.join(out, '_all.json'), JSON.stringify(all, null, 1));
const keys = Object.keys(all);
const shared = keys.filter(k => all[k].length >= 3);
console.log('unique', keys.length, 'chars', keys.join('').length, 'shared>=3', shared.length, 'sharedChars', shared.join('').length);
