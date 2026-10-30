// Step 2 of the video export: render public/captures/<slug>/ into out/<slug>.mp4 with Remotion.
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { readFileSync, mkdirSync } from 'node:fs';
import { parseArgs, paths } from './args.mjs';
import { browserPath } from './browser.mjs';

const o = parseArgs();
const manifest = JSON.parse(readFileSync(paths.video + `public/captures/${o.slug}/manifest.json`, 'utf8'));
const browserExecutable = await browserPath();
const serveUrl = await bundle({ entryPoint: paths.video + 'src/index.jsx', publicDir: paths.video + 'public' });
const inputProps = { manifest };
const composition = await selectComposition({ serveUrl, id: 'Lesson', inputProps, browserExecutable });
mkdirSync(paths.video + 'out', { recursive: true });
const outputLocation = paths.video + `out/${o.slug}.mp4`;
let last = -1;
await renderMedia({
  composition, serveUrl, inputProps, browserExecutable, codec: 'h264', outputLocation,
  onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; process.stdout.write(`${p * 10}% `); } },
});
console.log(`\nwrote out/${o.slug}.mp4 (${composition.durationInFrames} frames, ${composition.width}x${composition.height} @ ${composition.fps} fps)`);
