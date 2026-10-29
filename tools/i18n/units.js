// Find translatable units (string literals, template literals, "+" chains) in a JS source.
const acorn = require('acorn');
const walk = require('acorn-walk');

const CJK = /[　-〿㐀-鿿＀-￯①-⓿]/;
const HAN = /[㐀-鿿]/;

const isStr = n => n.type === 'Literal' && typeof n.value === 'string';
const tplText = n => n.quasis.map(q => q.value.cooked ?? '').join('');
const hasCjk = n => (isStr(n) && CJK.test(n.value)) || (n.type === 'TemplateLiteral' && CJK.test(tplText(n)));

function flattenPlus(n) {
  if (n.type === 'BinaryExpression' && n.operator === '+') return [...flattenPlus(n.left), ...flattenPlus(n.right)];
  return [n];
}

// Build {text, exprs} for a unit; exprs are AST nodes rendered later.
function describe(node, kind) {
  const parts = [], exprs = [];
  const pushTpl = t => t.quasis.forEach((q, i) => {
    parts.push(q.value.cooked ?? '');
    if (i < t.expressions.length) { parts.push(`{${exprs.length}}`); exprs.push(t.expressions[i]); }
  });
  if (kind === 'str') parts.push(node.value);
  else if (kind === 'tpl') pushTpl(node);
  else {
    const ops = flattenPlus(node);
    const k = ops.findIndex(o => isStr(o) || o.type === 'TemplateLiteral');
    if (k > 0) { parts.push(`{${exprs.length}}`); exprs.push({ prefix: true, start: ops[0].start, end: ops[k - 1].end }); }
    for (const o of ops.slice(k)) {
      if (isStr(o)) parts.push(o.value);
      else if (o.type === 'TemplateLiteral') pushTpl(o);
      else { parts.push(`{${exprs.length}}`); exprs.push(o); }
    }
  }
  return { text: parts.join(''), exprs };
}

function findUnits(code) {
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', preserveParens: true });
  const units = [], covered = new Set();
  walk.fullAncestor(ast, (node, _s, anc) => {
    const parent = anc[anc.length - 2];
    if (node.type === 'BinaryExpression' && node.operator === '+' &&
        !(parent && parent.type === 'BinaryExpression' && parent.operator === '+' )) {
      const ops = flattenPlus(node);
      if (ops.some(hasCjk) && ops.some(o => isStr(o) || o.type === 'TemplateLiteral')) {
        units.push({ node, kind: 'cat' });
        ops.forEach(o => covered.add(o));
      }
    }
  });
  walk.fullAncestor(ast, (node, _s, anc) => {
    if (covered.has(node) || !hasCjk(node)) return;
    const parent = anc[anc.length - 2];
    if (parent && parent.type === 'TaggedTemplateExpression') return;
    if (isStr(node)) {
      const isKey = parent && (parent.type === 'Property' || parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && parent.key === node && !parent.computed;
      const isImport = parent && /Import|Export/.test(parent.type);
      if (isImport) return;
      units.push({ node, kind: isKey ? 'key' : 'str' });
    } else if (node.type === 'TemplateLiteral') units.push({ node, kind: 'tpl' });
  });
  for (const u of units) Object.assign(u, describe(u.node, u.kind === 'key' ? 'str' : u.kind), { start: u.node.start, end: u.node.end });
  units.sort((a, b) => a.start - b.start);
  return units;
}

module.exports = { findUnits, CJK, HAN };
