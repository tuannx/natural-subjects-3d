// Usage: node apply.js <srcCoursesDir> <outCoursesDir> [slug...]
// Reads the upstream flat <slug>.html files and writes <outCoursesDir>/<slug>/index.html.
// Replaces Chinese string units in each lesson with the English from dictionary.json.
const fs = require('fs'), path = require('path');
const acorn = require('acorn');
const { findUnits, CJK, HAN } = require('./units');
const { segments, LONG } = require('./seg');
const { punct } = require('./punct');

const SCRIPT = /(<script type="module">)([\s\S]*?)(<\/script>)/;
const SHIM = fs.readFileSync(path.join(__dirname, 'shim.js'), 'utf8').trim();

// Chinese -> English dictionary built from the translated segments (see README).
const DICT = JSON.parse(fs.readFileSync(path.join(__dirname, 'dictionary.json'), 'utf8'));
const loadDict = () => DICT;

function makeTranslator(dict, missing) {
  const one = s => {
    if (!HAN.test(s)) return punct(s);
    if (s in dict) return dict[s];
    missing.add(s);
    return s;
  };
  return text => {
    if (text.length <= LONG) return one(text);
    return text.split('\n').map(line => {
      if (!CJK.test(line)) return line;
      const indent = line.match(/^\s*/)[0], body = line.trim();
      return indent + one(body) + line.slice(indent.length + body.length);
    }).join('\n');
  };
}

const escTpl = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/\r/g, '\\r');

function rewrite(code, units, tr) {
  const sorted = [...units].sort((a, b) => a.start - b.start || b.end - a.end);
  // render source range [start,end) with maximal child units replaced
  const render = (start, end, skip) => {
    let out = '', pos = start;
    for (const u of sorted) {
      if (u === skip || u.start < pos || u.end > end) continue;
      out += code.slice(pos, u.start) + renderUnit(u);
      pos = u.end;
    }
    return out + code.slice(pos, end);
  };
  const renderUnit = u => {
    const en = tr(u.text);
    if (u.exprs.length === 0 && (u.kind === 'str' || u.kind === 'key')) return JSON.stringify(en);
    const parts = en.split(/\{(\d+)\}/);
    let out = '`';
    parts.forEach((p, i) => {
      if (i % 2 === 0) { out += escTpl(p); return; }
      const e = u.exprs[Number(p)];
      if (!e) { out += escTpl(`{${p}}`); return; }
      const src = render(e.start, e.end);
      out += '${' + (e.prefix ? `(${src})` : src) + '}';
    });
    return out + '`';
  };
  return render(0, code.length);
}

function processFile(src, dst, slug) {
  const html = fs.readFileSync(src, 'utf8');
  const dict = loadDict(slug), missing = new Set();
  const tr = makeTranslator(dict, missing);
  const [, open, code, close] = html.match(SCRIPT);
  const units = findUnits(code);
  let js = rewrite(code, units, tr);
  acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' }); // throws on broken output
  js = SHIM + '\n' + js;
  let out = html.replace(SCRIPT, () => open + js + close)
    .replace('<html lang="zh-CN">', '<html lang="en">')
    .replace(/<title>([^<]*)<\/title>/, (m, t) => `<title>${tr(t)}</title>`);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, out);
  const left = (js.match(/\\u(?:3[4-9a-fA-F]|[4-9][0-9a-fA-F])[0-9a-fA-F]{2}/g) || []).length + (out.match(/[㐀-鿿]/g) || []).length;
  return { units: units.length, missing: [...missing], left };
}

if (require.main === module) {
  const [srcDir, outDir, ...only] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html')).map(f => f.replace(/\.html$/, ''))
    .filter(s => !only.length || only.includes(s));
  for (const slug of files) {
    try {
      const r = processFile(path.join(srcDir, slug + '.html'), path.join(outDir, slug, 'index.html'), slug);
      console.log(slug, 'units', r.units, 'missing', r.missing.length, 'hanLeft', r.left);
    } catch (e) { console.log(slug, 'ERROR', e.message); }
  }
}
module.exports = { processFile };
