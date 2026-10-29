// Convert Chinese full-width punctuation in strings that have no Chinese words.
const MAP = [
  [/，|、/g, ', '], [/；/g, '; '], [/：/g, ': '], [/。/g, '. '], [/（/g, ' ('], [/）/g, ')'],
  [/[「『]/g, '“'], [/[」』]/g, '”'], [/！/g, '!'], [/？/g, '?'], [/～/g, '~'], [/　/g, ' '],
];
function punct(s) {
  let out = s;
  for (const [re, to] of MAP) out = out.replace(re, to);
  // tidy spaces we introduced, keep original edges
  out = out.replace(/ {2,}/g, m => (s.includes(m) ? m : ' ')).replace(/\( /g, '(').replace(/ ([,;:)])/g, (m, c) => c);
  if (!/^\s/.test(s)) out = out.replace(/^ +/, '');
  if (!/[\s，、；：]$/.test(s)) out = out.replace(/ +$/, '');
  return out;
}
module.exports = { punct };
