// Renders the home page (lesson catalog), grouped by school level, then subject, with level and subject filters.
import { LEVELS } from './lib/levels.mjs';
import { esc, plural, card, chips, footer, filterScript, head } from './lib/page.mjs';

const group = (lessons, subjects, lv) => {
  const mine = lessons.filter(l => l.level === lv.key);
  if (!mine.length) return '';
  const sections = subjects.map(s => {
    const list = mine.filter(l => l.subject === s.key);
    if (!list.length) return '';
    return `
    <section data-item data-level="${lv.key}" data-subject="${s.key}" id="${lv.key}-${s.key}">
      <h3 class="subj" style="--subj:${esc(s.color)}"><a href="./subjects/${s.key}/">${esc(s.name)}</a> <span>${list.length}</span></h3>
      <div class="grid">${list.map(l => card(l, './')).join('')}
      </div>
    </section>`;
  }).join('');
  return `
  <div class="level" data-group id="${lv.key}">
    <h2>${esc(lv.name)} <span>${plural(mine.length, 'lesson')}</span></h2>
    <p class="blurb">${esc(lv.blurb)}</p>${sections}
  </div>`;
};

export function renderIndex(lessons, subjects) {
  const count = (k, v) => lessons.filter(l => l[k] === v).length;
  const levels = chips('level', 'Filter by school level', [['all', `All levels ${lessons.length}`], ...LEVELS.filter(lv => count('level', lv.key)).map(lv => [lv.key, `${lv.name} ${count('level', lv.key)}`])]);
  const subjs = chips('subject', 'Filter by subject', [['all', 'All subjects'], ...subjects.map(s => [s.key, `${s.name} ${count('subject', s.key)}`])]);
  return `${head('Natural Subjects 3D · Interactive 3D Science Lessons', `Free interactive 3D science lessons for grades 1–12: physics, chemistry, biology, Earth and space.`, './')}
<body>
<header>
  <h1>Natural Subjects 3D</h1>
  <p>Free, interactive 3D science lessons: ${lessons.length} lessons from primary school to high school. Each one is a 3D world you can turn and explore, a guiding question and a step-by-step path. Works on phones, tablets, laptops and classroom boards.</p>${levels}${subjs}
  <p class="subjects">Subject pages: ${subjects.map(s => `<a href="./subjects/${s.key}/" style="--subj:${esc(s.color)}">${esc(s.name)}</a>`).join(' ')}</p>
</header>
<main>${LEVELS.map(lv => group(lessons, subjects, lv)).join('')}
</main>${footer('./')}${filterScript}
</body>
</html>
`;
}
