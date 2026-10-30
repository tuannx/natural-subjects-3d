// Builds the primary-school lessons: one esbuild pass for all of them, so three.js and the
// lesson engine land in shared, content-hashed chunks that the browser caches once for every lesson.
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { qualityScript } from './runtime.mjs';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function buildPrimary(lessons, root, dist) {
  if (!lessons.length) return;
  const tmp = root + '.build/entries/';
  rmSync(root + '.build', { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  for (const l of lessons) {
    writeFileSync(tmp + l.slug + '.js',
      `import meta from '../../courses/${l.slug}/lesson.json';\n` +
      `import setup from '../../courses/${l.slug}/scene.js';\n` +
      `import { runLesson } from '../../lib/primary/engine.js';\n` +
      `runLesson(meta, setup);\n`);
  }
  const res = await build({
    entryPoints: [...lessons.map(l => tmp + l.slug + '.js'), root + 'lib/primary/style.css'],
    bundle: true, splitting: true, format: 'esm', minify: true, target: 'es2020',
    outdir: dist + 'assets', entryNames: '[name]-[hash]', chunkNames: 'shared-[hash]',
    metafile: true, legalComments: 'eof', logLevel: 'warning',
  });
  const outs = Object.entries(res.metafile.outputs);
  const css = outs.find(([, o]) => o.entryPoint?.endsWith('style.css'))[0].replace(/^.*\/assets\//, '/assets/');
  for (const l of lessons) {
    const [file, o] = outs.find(([, o]) => o.entryPoint?.endsWith(`entries/${l.slug}.js`));
    const js = file.replace(/^.*\/assets\//, '/assets/');
    const preload = o.imports.filter(i => i.kind === 'import-statement')
      .map(i => `<link rel="modulepreload" href="${i.path.replace(/^.*\/assets\//, '/assets/')}">`).join('\n');
    mkdirSync(dist + l.slug, { recursive: true });
    writeFileSync(dist + l.slug + '/index.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(l.title)} · Natural Subjects 3D</title>
<meta name="description" content="${esc(l.question)}">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="${css}">
${qualityScript()}
${preload}
<script type="module" src="${js}"></script>
</head>
<body>
<noscript>This 3D lesson needs JavaScript and WebGL.</noscript>
</body>
</html>
`);
  }
  rmSync(root + '.build', { recursive: true, force: true });
}
