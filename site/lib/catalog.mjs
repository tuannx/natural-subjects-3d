// Reads the lessons into one catalog. Layout: courses/<subject>/subject.json and
// courses/<subject>/<slug>/lesson.json. Folders starting with "_" (e.g. a subject's shared helpers) are skipped.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { levelOf } from './levels.mjs';

const json = f => JSON.parse(readFileSync(f, 'utf8'));
const dirs = d => readdirSync(d).filter(n => !/^[._]/.test(n) && statSync(d + n).isDirectory());

export function loadSubjects(coursesDir) {
  return dirs(coursesDir).map(key => {
    const s = json(coursesDir + key + '/subject.json');
    if (s.key !== key) throw new Error(`${coursesDir}${key}/subject.json: key "${s.key}" does not match its folder`);
    return s;
  }).sort((a, b) => a.order - b.order);
}

// only: optional list of slugs to build (LESSONS=a,b npm run build) for quick local checks.
export function loadLessons(coursesDir, only = null) {
  const lessons = [], seen = new Set();
  for (const subject of loadSubjects(coursesDir).map(s => s.key)) {
    for (const slug of dirs(coursesDir + subject + '/')) {
      if (only && !only.includes(slug)) continue;
      const dir = `${coursesDir}${subject}/${slug}/`;
      const l = json(dir + 'lesson.json');
      check(l, slug, dir, seen);
      l.subject = subject;
      l.dir = dir;
      l.kind = existsSync(dir + 'scene.js') ? 'scene' : existsSync(dir + 'index.html') ? 'bundle' : null;
      if (!l.kind) throw new Error(`${dir}: needs scene.js (engine lesson) or index.html (bundled lesson)`);
      l.thumb = existsSync(dir + 'cover-480.webp');
      lessons.push(l);
    }
  }
  return lessons.sort((a, b) => a.grades[0] - b.grades[0] || a.order - b.order || a.slug.localeCompare(b.slug));
}

function check(l, slug, dir, seen) {
  const where = dir + 'lesson.json';
  if (l.slug !== slug) throw new Error(`${where}: slug "${l.slug}" does not match its folder`);
  if (seen.has(slug)) throw new Error(`${where}: slug "${slug}" is used twice (lesson URLs are /<slug>/)`);
  seen.add(slug);
  if ('subject' in l) throw new Error(`${where}: remove "subject", the folder it sits in decides it`);
  const level = levelOf(l.level);
  if (!level) throw new Error(`${where}: unknown level "${l.level}"`);
  const [a, b] = l.grades || [];
  if (!(a <= b && a >= level.grades[0] && b <= level.grades[1])) throw new Error(`${where}: grades ${JSON.stringify(l.grades)} must sit inside ${level.key} (${level.grades.join('–')})`);
}

// Finds one lesson folder by slug (used by the video scripts).
export function findLesson(coursesDir, slug) {
  const l = loadLessons(coursesDir, [slug])[0];
  if (!l) throw new Error(`no lesson "${slug}" under ${coursesDir}`);
  return l;
}

// Public catalog entry (dist/catalog.json): drops build-only fields, adds URLs.
export const publicEntry = ({ dir, kind, order, thumb, ...l }) => ({ ...l, url: `/${l.slug}/`, cover: `/${l.slug}/cover.webp` });
