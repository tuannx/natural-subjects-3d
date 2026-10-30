// Shared pieces of the catalog pages (home page and subject pages): HTML escaping, lesson card, page frame.
import { gradeText } from './levels.mjs';

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// base: path from the page to the site root ("./" on the home page, "../../" on /subjects/<key>/).
export const card = (l, base) => `
      <a class="card" href="${base}${esc(l.slug)}/">
        <img src="${base}${esc(l.slug)}/${l.thumb ? 'cover-480' : 'cover'}.webp"${l.thumb ? ` srcset="${base}${esc(l.slug)}/cover-480.webp 480w, ${base}${esc(l.slug)}/cover.webp 800w" sizes="(max-width:600px) 50vw, 320px"` : ''} alt="" loading="lazy" decoding="async" width="800" height="450">
        <div class="body">
          <span class="type">${esc(gradeText(l.grades))} · ${l.steps.length} steps</span>
          <h3>${esc(l.title)}</h3>
          <p>${esc(l.question)}</p>
        </div>
      </a>`;

// Filter chips: [[value, label]]; the first one starts pressed.
export const chips = (name, label, items) => `
  <nav class="filters" data-name="${name}" aria-label="${esc(label)}">${items
    .map(([k, text], i) => `<button type="button" data-f="${esc(k)}"${i ? '' : ' aria-pressed="true"'}>${esc(text)}</button>`).join('')}</nav>`;

export const footer = base => `
<footer>
  <p>High school lessons: English adaptation of <a href="https://lab.tongjiang.app">Tongjiang Lab</a> by Tongjiang, licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>. Changes: all lesson text translated into English, phone layout, new home page. Primary and middle school lessons are original to Natural Subjects 3D and shared under the same license. Non-commercial use only.</p>
  <p>three.js is MIT licensed. High school lessons follow the PEP 2019 senior high school textbooks; not affiliated with People's Education Press. <a href="https://github.com/tuannx/natural-subjects-3d">Source on GitHub</a> · <a href="${base}">All lessons</a></p>
</footer>`;

// Combined filtering: every [data-level][data-subject] block shows when it matches all pressed chips;
// a wrapper with data-group hides when none of its blocks show.
export const filterScript = `
<script>
const state = {};
for (const nav of document.querySelectorAll('.filters')) for (const b of nav.querySelectorAll('button')) b.onclick = () => {
  for (const x of nav.querySelectorAll('button')) x.setAttribute('aria-pressed', x === b);
  state[nav.dataset.name] = b.dataset.f;
  for (const el of document.querySelectorAll('[data-item]'))
    el.hidden = Object.entries(state).some(([k, v]) => v !== 'all' && el.dataset[k] !== v);
  for (const g of document.querySelectorAll('[data-group]')) g.hidden = !g.querySelector('[data-item]:not([hidden])');
};
</script>`;

export const head = (title, description, base) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="${base}site.css">
<script type="speculationrules">{"prefetch":[{"where":{"href_matches":"/*/"},"eagerness":"moderate"}]}</script>
</head>`;
