// Renders the home page (lesson catalog) from catalog.json entries.
const SUBJECTS = [
  ['phys', 'Physics'], ['chem', 'Chemistry'], ['bio', 'Biology'], ['geo', 'Geography'],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const card = l => `
      <a class="card" href="./${esc(l.slug)}">
        <img src="./${esc(l.cover)}" alt="" loading="lazy" width="800" height="450">
        <div class="body">
          <span class="type">${esc(l.type)} · ${l.steps.length} steps</span>
          <h3>${esc(l.title)}</h3>
          <p>${esc(l.question)}</p>
        </div>
      </a>`;

export function renderIndex(catalog) {
  const sections = SUBJECTS.map(([key, name]) => {
    const list = catalog.filter(l => l.subject === key);
    if (!list.length) return '';
    return `
    <section id="${key}">
      <h2>${name} <span>${list.length}</span></h2>
      <div class="grid">${list.map(card).join('')}
      </div>
    </section>`;
  }).join('');
  const nav = SUBJECTS.map(([k, n]) => `<a href="#${k}">${n}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Natural Subjects 3D · Interactive 3D Science Lessons</title>
<meta name="description" content="Free interactive 3D science lessons for high school physics, chemistry, biology and geography. Each lesson is one 3D world with a live control console and a step-by-step path.">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="./site.css">
</head>
<body>
<header>
  <h1>Natural Subjects 3D</h1>
  <p>Free, interactive 3D science lessons for high school: ${catalog.length} lessons in physics, chemistry, biology and geography. Each one is a single 3D world with a live control console, a guiding question and a step-by-step path. Works on a laptop, projector or interactive whiteboard (Chrome or Edge recommended).</p>
  <nav>${nav}</nav>
</header>
<main>${sections}
</main>
<footer>
  <p>English adaptation of <a href="https://lab.tongjiang.app">Tongjiang Lab</a> by Tongjiang, licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>. Changes: all lesson text translated into English, new home page. Non-commercial use only.</p>
  <p>Bundled three.js is MIT licensed. Lessons follow the PEP 2019 senior high school textbooks; not affiliated with People's Education Press. <a href="https://github.com/tuannx/natural-subjects-3d">Source on GitHub</a>.</p>
</footer>
</body>
</html>
`;
}
