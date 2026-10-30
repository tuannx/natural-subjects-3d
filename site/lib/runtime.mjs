// The small scripts every lesson page gets: render-resolution cap, a no-WebGL message and (for the bundled lessons) the phone layout.
import { readFileSync } from 'node:fs';

const rt = new URL('../runtime/', import.meta.url).pathname;
const read = f => readFileSync(rt + f, 'utf8').trim();

export const qualityScript = () => `<script>${read('quality.js')}
${read('nogl.js')}</script>`;

// Injected right after the viewport meta of a bundled (Tongjiang Lab) lesson, before its module script.
export function injectBundleRuntime(html) {
  const tags = `\n<style>${read('mobile.css')}</style>\n${qualityScript()}\n<script>${read('mobile.js')}
${read('adaptive.js')}</script>`;
  const at = html.indexOf('>', html.indexOf('<meta name="viewport"')) + 1;
  if (at <= 0) throw new Error('lesson has no viewport meta');
  return html.slice(0, at) + tags + html.slice(at);
}
