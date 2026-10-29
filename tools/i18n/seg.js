// Split a unit text into translation segments: long code-like texts go line by line.
const { CJK } = require('./units');
const LONG = 1000;
function segments(text) {
  if (text.length <= LONG) return [text];
  return text.split('\n').map(l => l.trim()).filter(l => CJK.test(l));
}
module.exports = { segments, LONG };
