// Rewrites the lesson lists shown on GitHub from the lesson.json files:
// courses/README.md (all subjects) and courses/<subject>/README.md (one subject, by grade).
// Usage: npm run readme
import { writeFileSync } from 'node:fs';
import { loadLessons, loadSubjects } from './lib/catalog.mjs';
import { LEVELS, gradeText } from './lib/levels.mjs';

const root = new URL('..', import.meta.url).pathname;
const subjects = loadSubjects(root + 'courses/');
const lessons = loadLessons(root + 'courses/');
const item = (l, prefix) => `- [${l.title}](${prefix}${l.slug}/) · ${gradeText(l.grades)}`;
const byLevel = (list, prefix) => LEVELS.map(lv => {
  const mine = list.filter(l => l.level === lv.key);
  return mine.length ? `### ${lv.name} (${mine.length})\n\n${mine.map(l => item(l, prefix)).join('\n')}\n` : '';
}).filter(Boolean).join('\n');

for (const s of subjects) {
  const mine = lessons.filter(l => l.subject === s.key);
  writeFileSync(root + `courses/${s.key}/README.md`, `# ${s.name}

${s.blurb}

${mine.length} lessons. On the site: \`/subjects/${s.key}/\`. How to add one: [../README.md](../README.md).

${byLevel(mine, '').replace(/^### /gm, '## ')}`);
}

writeFileSync(root + 'courses/README.md', `# Lessons

Lessons are grouped by subject, one folder each, so every subject can grow on its own:

\`\`\`
courses/
  <subject>/                 physics, chemistry, biology, earth-space
    subject.json             name, colour, blurb, order on the site
    README.md                this subject's lesson list (npm run readme)
    _shared/                 optional: 3D helpers only this subject's lessons use
    <slug>/                  one lesson; its URL is /<slug>/ (slugs are unique across subjects)
      lesson.json            catalog entry and all lesson text
      scene.js               the 3D world (engine lesson, see lib/engine/README.md)
      index.html             or: a complete bundled lesson (the high school labs)
      cover.webp, cover-480.webp
\`\`\`

## Add a lesson to a subject

1. Pick the topic and grades from [docs/curriculum-map.md](../docs/curriculum-map.md) and mark it there.
2. Create \`courses/<subject>/<slug>/lesson.json\` and \`scene.js\` (see [lib/engine/README.md](../lib/engine/README.md)). Set \`level\` (\`primary\` grades 1–5, \`middle\` grades 6–9, \`high-school\` grades 10–12) and \`grades\` \`[from, to]\` inside that level. The subject comes from the folder.
3. Check it: \`LESSONS=<slug> OUT=/tmp/one npm run build\`, then in \`video/\`: \`DIST=/tmp/one node scripts/check.mjs <slug> --shots /tmp/shots\` and \`DIST=/tmp/one node scripts/covers.mjs <slug>\`.
4. Run \`npm run readme\` to refresh the lesson lists.

A new lesson only touches its own folder (plus the subject's \`README.md\` and the map), so lessons for different subjects never conflict.

${subjects.map(s => {
  const mine = lessons.filter(l => l.subject === s.key);
  return `## [${s.name}](${s.key}/) (${mine.length})\n\n${byLevel(mine, s.key + '/')}`;
}).join('\n')}`);
console.log('wrote courses/README.md and', subjects.length, 'subject READMEs');
