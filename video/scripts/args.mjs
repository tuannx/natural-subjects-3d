// Shared CLI options: node <script> <slug> [--size 1280x720] [--seconds 4] [--fps 30]
export function parseArgs(argv = process.argv.slice(2)) {
  const o = { slug: null, size: '1280x720', seconds: 4, fps: 30, captureFps: 15 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) o[a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = argv[++i];
    else o.slug = a;
  }
  if (!o.slug) throw new Error('usage: npm run video -- <lesson-slug> [--size 1280x720] [--seconds 4]');
  const [w, h] = String(o.size).split('x').map(Number);
  return { ...o, width: w, height: h, seconds: +o.seconds, fps: +o.fps, captureFps: +o.captureFps };
}

export const paths = {
  root: new URL('../../', import.meta.url).pathname,
  video: new URL('../', import.meta.url).pathname,
};
