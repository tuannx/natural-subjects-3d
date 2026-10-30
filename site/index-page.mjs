// Renders the home page (lesson catalog), grouped by school level, then subject.
const LEVELS = [
  ['primary', 'Primary school', 'Ages 6–11: first steps in science, short and hands-on.'],
  ['high-school', 'High school', 'Ages 15–18: physics, chemistry, biology and geography labs.'],
];
const SUBJECTS = [
  ['space', 'Earth & Space'], ['phys', 'Physics'], ['chem', 'Chemistry'], ['bio', 'Biology'], ['geo', 'Geography'],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const card = l => `
      <a class="card" href="./${esc(l.slug)}/">
        <img src="./${esc(l.slug)}/${l.thumb ? 'cover-480' : 'cover'}.webp"${l.thumb ? ` srcset="./${esc(l.slug)}/cover-480.webp 480w, ./${esc(l.slug)}/cover.webp 800w" sizes="(max-width:600px) 50vw, 320px"` : ''} alt="" loading="lazy" decoding="async" width="800" height="450">
        <div class="body">
          <span class="type">${esc(l.type)} · ${l.steps.length} steps · ages ${esc(l.ages)}</span>
          <h3>${esc(l.title)}</h3>
          <p>${esc(l.question)}</p>
        </div>
      </a>`;

const group = (lessons, [level, name, blurb]) => {
  const mine = lessons.filter(l => l.level === level);
  if (!mine.length) return '';
  const subjects = SUBJECTS.map(([key, sname]) => {
    const list = mine.filter(l => l.subject === key);
    if (!list.length) return '';
    return `
    <section id="${level}-${key}">
      <h3 class="subj">${sname} <span>${list.length}</span></h3>
      <div class="grid">${list.map(card).join('')}
      </div>
    </section>`;
  }).join('');
  return `
  <div class="level" data-level="${level}" id="${level}">
    <h2>${name} <span>${mine.length} lessons</span></h2>
    <p class="blurb">${blurb}</p>${subjects}
  </div>`;
};

export function renderIndex(lessons) {
  const n = l => lessons.filter(x => x.level === l).length;
  const filters = [['all', `All ${lessons.length}`], ...LEVELS.map(([k, name]) => [k, `${name} ${n(k)}`])]
    .map(([k, label], i) => `<button type="button" data-f="${k}"${i ? '' : ' aria-pressed="true"'}>${label}</button>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Natural Subjects 3D · Interactive 3D Science Lessons</title>
<meta name="description" content="Free interactive 3D science lessons, from primary school (ages 6–11) to high school physics, chemistry, biology and geography.">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="./site.css">
<script type="speculationrules">{"prefetch":[{"where":{"href_matches":"/*/"},"eagerness":"moderate"}]}</script>
</head>
<body>
<header>
  <h1>Natural Subjects 3D</h1>
  <p>Free, interactive 3D science lessons: ${lessons.length} lessons from primary school to high school. Each one is a 3D world you can turn and explore, a guiding question and a step-by-step path. Works on phones, tablets, laptops and classroom boards.</p>
  <nav class="filters" aria-label="Filter by school level">${filters}</nav>
</header>
<main>${LEVELS.map(lv => group(lessons, lv)).join('')}
</main>
<footer>
  <p>High school lessons: English adaptation of <a href="https://lab.tongjiang.app">Tongjiang Lab</a> by Tongjiang, licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>. Changes: all lesson text translated into English, phone layout, new home page. Primary school lessons are original to Natural Subjects 3D and shared under the same license. Non-commercial use only.</p>
  <p>three.js is MIT licensed. High school lessons follow the PEP 2019 senior high school textbooks; not affiliated with People's Education Press. <a href="https://github.com/tuannx/natural-subjects-3d">Source on GitHub</a>.</p>
</footer>
<script>
for (const b of document.querySelectorAll('.filters button')) b.onclick = () => {
  for (const x of document.querySelectorAll('.filters button')) x.setAttribute('aria-pressed', x === b);
  for (const g of document.querySelectorAll('.level')) g.hidden = b.dataset.f !== 'all' && g.dataset.level !== b.dataset.f;
};
</script>
</body>
</html>
`;
}
