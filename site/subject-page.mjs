// Renders one subject page (/subjects/<key>/): that subject's lessons by school level, then grade.
import { LEVELS, gradeText } from './lib/levels.mjs';
import { esc, plural, card, chips, footer, filterScript, head } from './lib/page.mjs';

const BASE = '../../';

const levelBlock = (mine, lv) => {
  const list = mine.filter(l => l.level === lv.key);
  if (!list.length) return '';
  const grades = [...new Set(list.map(l => l.grades[0]))].sort((a, b) => a - b);
  return `
  <div class="level" data-group id="${lv.key}">
    <h2>${esc(lv.name)} <span>${plural(list.length, 'lesson')}</span></h2>${grades.map(g => {
      const inGrade = list.filter(l => l.grades[0] === g);
      return `
    <section data-item data-level="${lv.key}" id="grade-${g}">
      <h3 class="subj">${lv.key === 'high-school' ? gradeText(lv.grades) : `Grade ${g}`} <span>${inGrade.length}</span></h3>
      <div class="grid">${inGrade.map(l => card(l, BASE)).join('')}
      </div>
    </section>`;
    }).join('')}
  </div>`;
};

export function renderSubject(subject, lessons, subjects) {
  const mine = lessons.filter(l => l.subject === subject.key);
  const levels = chips('level', 'Filter by school level', [['all', `All ${mine.length}`], ...LEVELS
    .map(lv => [lv.key, lv.name, mine.filter(l => l.level === lv.key).length]).filter(x => x[2]).map(([k, n, c]) => [k, `${n} ${c}`])]);
  const others = subjects.filter(s => s.key !== subject.key).map(s => `<a href="${BASE}subjects/${s.key}/" style="--subj:${esc(s.color)}">${esc(s.name)}</a>`).join(' ');
  return `${head(`${subject.name} · Natural Subjects 3D`, `${subject.name} lessons in interactive 3D, grades 1–12. ${subject.blurb}`, BASE)}
<body style="--subj:${esc(subject.color)}">
<header>
  <p class="crumb"><a href="${BASE}">‹ All lessons</a></p>
  <h1 class="subject-title">${esc(subject.name)}</h1>
  <p>${esc(subject.blurb)} ${mine.length} interactive 3D lessons, sorted by grade.</p>${levels}
  <p class="subjects">Other subjects: ${others}</p>
</header>
<main>${LEVELS.map(lv => levelBlock(mine, lv)).join('')}
</main>${footer(BASE)}${filterScript}
</body>
</html>
`;
}
