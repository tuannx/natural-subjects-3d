// Usage: node check.js <slug>   — validates done/<slug>.json ({"index": english}) against todo/<slug>.json
const fs = require('fs');
const slug = process.argv[2];
const todo = JSON.parse(fs.readFileSync(`todo/${slug}.json`, 'utf8'));
const segs = Array.isArray(todo) ? todo : todo.segments;
let done;
try { done = JSON.parse(fs.readFileSync(`done/${slug}.json`, 'utf8')); }
catch (e) { console.log('INVALID JSON or missing file:', e.message); process.exit(1); }
const HAN = /[㐀-鿿]/, FW = /[、-〃「-』！-？（）]/;
const ph = s => (s.match(/\{\d+\}/g) || []).sort().join(',');
const tags = s => (s.match(/<\/?[a-zA-Z][^>]*>/g) || []).length;
const errs = [];
segs.forEach((s, i) => {
  const t = done[String(i)];
  if (typeof t !== 'string') { errs.push(['MISSING', i, s]); return; }
  if (HAN.test(t)) errs.push(['CHINESE LEFT', i, s, t]);
  else if (FW.test(t)) errs.push(['FULL-WIDTH PUNCT', i, s, t]);
  if (ph(s) !== ph(t)) errs.push(['PLACEHOLDERS', i, s, t]);
  if (tags(s) !== tags(t)) errs.push(['HTML TAG COUNT', i, s, t]);
  if (/^\s/.test(s) !== /^\s/.test(t) || /\n$/.test(s) !== /\n$/.test(t)) errs.push(['EDGE WHITESPACE', i, s, t]);
});
const extra = Object.keys(done).filter(k => !(Number(k) >= 0 && Number(k) < segs.length));
if (extra.length) errs.push(['EXTRA KEYS (keys must be indexes 0..n-1)', extra.length, extra.slice(0, 3)]);
for (const e of errs.slice(0, 40)) console.log(JSON.stringify(e));
console.log(errs.length ? `${errs.length} problems` : `OK ${segs.length} segments`);
process.exit(errs.length ? 1 : 0);
