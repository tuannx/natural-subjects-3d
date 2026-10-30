// Rewrites courses/README.md (the lesson list shown on GitHub) from the lesson.json files.
// Usage: npm run readme
import { writeFileSync } from 'node:fs';
import { loadLessons } from './lib/catalog.mjs';

const root = new URL('..', import.meta.url).pathname;
const lessons = loadLessons(root + 'courses/');
const SUBJECTS = { space: 'Earth & Space', phys: 'Physics', chem: 'Chemistry', bio: 'Biology', geo: 'Geography' };
const section = (level, intro) => {
  const mine = lessons.filter(l => l.level === level);
  return Object.entries(SUBJECTS).map(([k, name]) => {
    const list = mine.filter(l => l.subject === k);
    return list.length ? `### ${name}\n\n${list.map(l => `- [${l.title}](${l.slug}/) · ages ${l.ages.replace('-', '–')}`).join('\n')}\n` : '';
  }).filter(Boolean).join('\n').replace(/^/, intro);
};
writeFileSync(root + 'courses/README.md', `# Lessons

Each folder is one lesson: \`lesson.json\` (title, level, ages, steps) and its cover, plus either \`index.html\` (a complete high school lesson you can download and open in Chrome or Edge) or \`scene.js\` (a primary lesson, built with the shared engine in \`lib/primary/\`). On the deployed site every lesson is at \`/<slug>/\`.

## Primary school (ages 6–11)

${section('primary', '')}
## High school (ages 15–18)

${section('high-school', '')}`);
console.log('wrote courses/README.md');
