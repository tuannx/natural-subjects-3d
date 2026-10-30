// Usage: node thumbs.mjs <coursesDir>
// Writes cover-480.webp next to every lesson's cover.webp (the home page grid uses it on small cards).
import sharp from 'sharp';
import { readdirSync, existsSync } from 'node:fs';

const dir = process.argv[2].replace(/\/?$/, '/');
let n = 0;
for (const slug of readdirSync(dir)) {
  const src = dir + slug + '/cover.webp';
  if (!existsSync(src)) continue;
  await sharp(src).resize(480).webp({ quality: 72, effort: 6 }).toFile(dir + slug + '/cover-480.webp');
  n++;
}
console.log(`wrote ${n} thumbnails`);
