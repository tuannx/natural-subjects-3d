// Reads every lesson folder (courses/<slug>/lesson.json) into one catalog, in display order.
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// only: optional list of slugs to build (LESSONS=a,b npm run build) for quick local checks.
export function loadLessons(coursesDir, only = null) {
  const lessons = [];
  for (const slug of readdirSync(coursesDir)) {
    if (only && !only.includes(slug)) continue;
    const meta = coursesDir + slug + '/lesson.json';
    if (!existsSync(meta)) continue;
    const l = JSON.parse(readFileSync(meta, 'utf8'));
    if (l.slug !== slug) throw new Error(`${meta}: slug "${l.slug}" does not match its folder`);
    l.dir = coursesDir + slug + '/';
    l.kind = existsSync(l.dir + 'scene.js') ? 'primary' : existsSync(l.dir + 'index.html') ? 'bundle' : null;
    if (!l.kind) throw new Error(`${l.dir}: needs scene.js (primary lesson) or index.html (bundled lesson)`);
    l.thumb = existsSync(l.dir + 'cover-480.webp');
    lessons.push(l);
  }
  return lessons.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

// Public catalog entry (dist/catalog.json): drops build-only fields, adds URLs.
export const publicEntry = ({ dir, kind, order, thumb, ...l }) => ({ ...l, url: `/${l.slug}/`, cover: `/${l.slug}/cover.webp` });
