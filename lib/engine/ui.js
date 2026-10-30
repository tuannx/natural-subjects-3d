// DOM for an engine lesson: top bar, the lesson card (step text, controls, quiz) and step navigation.
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat().filter(x => x != null && x !== false));
  return el;
};

export function createUI(meta, { onStep }) {
  const steps = meta.content.steps, quiz = meta.content.quiz || [];
  const total = steps.length + (quiz.length ? 1 : 0);
  const title = h('h1', {}, meta.title);
  const bar = h('header', { class: 'bar' },
    h('a', { class: 'home', href: '/', 'aria-label': 'All lessons' }, '‹'), title,
    h('span', { class: 'age' }, `Ages ${meta.ages.replace('-', '–')}`));
  const kicker = h('div', { class: 'kicker' }), heading = h('h2'), text = h('p', { class: 'text' });
  const tryBox = h('div', { class: 'try' }), controls = h('div', { class: 'controls' }), readout = h('div', { class: 'readout', 'aria-live': 'polite' });
  const seeBody = h('p'), see = h('div', { class: 'see' });
  const quizBox = h('div', { class: 'quiz' });
  const body = h('div', { class: 'cardbody' }, kicker, heading, text, tryBox, controls, readout, see, quizBox);
  const handle = h('button', { class: 'handle', type: 'button', 'aria-label': 'Show or hide the lesson card', onclick: () => card.classList.toggle('min') });
  const card = h('aside', { class: 'card', id: 'card' }, handle, body);
  const dots = h('div', { class: 'dots' });
  const prev = h('button', { class: 'nav prev', type: 'button', onclick: () => go(cur - 1) }, '‹ Back');
  const next = h('button', { class: 'nav next', type: 'button', onclick: () => go(cur + 1) }, 'Next ›');
  const nav = h('nav', { class: 'steps' }, prev, dots, next);
  const labels = h('div', { class: 'labels' });
  for (let i = 0; i < total; i++) dots.append(h('button', { type: 'button', 'aria-label': `Step ${i + 1}`, onclick: () => go(i) }, String(i + 1)));
  document.body.append(bar, card, labels, nav);
  let cur = -1;

  function renderQuiz() {
    let qi = 0, score = 0;
    const show = () => {
      quizBox.replaceChildren();
      if (qi >= quiz.length) {
        quizBox.append(h('p', { class: 'score' }, `You got ${score} of ${quiz.length} right!`),
          h('button', { class: 'btn', type: 'button', onclick: () => { qi = 0; score = 0; show(); } }, 'Try the quiz again'));
        return;
      }
      const q = quiz[qi], why = h('p', { class: 'why' });
      const opts = q.options.map((o, i) => h('button', {
        class: 'opt', type: 'button', onclick: () => {
          if (quizBox.dataset.done) return;
          quizBox.dataset.done = '1';
          if (i === q.answer) score++;
          opts.forEach((b, j) => b.classList.add(j === q.answer ? 'right' : j === i ? 'wrong' : 'off'));
          why.textContent = (i === q.answer ? 'Yes! ' : 'Not quite. ') + q.why;
          quizBox.append(h('button', { class: 'btn', type: 'button', onclick: () => { qi++; show(); } }, qi + 1 < quiz.length ? 'Next question' : 'See my score'));
        },
      }, o));
      delete quizBox.dataset.done;
      quizBox.append(h('p', { class: 'q' }, `${qi + 1}. ${q.q}`), h('div', { class: 'opts' }, opts), why);
    };
    show();
  }

  function go(i, opts = {}) {
    i = Math.max(0, Math.min(total - 1, i));
    if (i === cur) return;
    cur = i;
    const isQuiz = i >= steps.length, s = steps[i] || { title: 'Quick quiz', text: 'Check what you learned. Tap an answer.' };
    kicker.textContent = `Step ${i + 1} of ${total}`;
    heading.textContent = s.title;
    text.textContent = s.text;
    tryBox.hidden = !s.try; tryBox.replaceChildren(h('b', {}, 'Try it: '), s.try || '');
    see.hidden = !s.see;
    seeBody.textContent = s.see || ''; seeBody.hidden = true;
    see.replaceChildren(h('button', { class: 'reveal', type: 'button', onclick: e => { seeBody.hidden = false; e.target.remove(); } }, 'What did you notice?'), seeBody);
    controls.replaceChildren(); readout.replaceChildren();
    quizBox.hidden = !isQuiz; if (isQuiz) renderQuiz();
    [...dots.children].forEach((d, j) => { d.classList.toggle('on', j === i); d.classList.toggle('done', j < i); });
    prev.disabled = i === 0; next.disabled = i === total - 1;
    card.classList.remove('min');
    onStep(i, isQuiz, opts);
  }

  // Free screen area for the 3D content: right of the card on wide screens, above it in portrait.
  // Hidden parts (e.g. in the video exporter) take no room.
  function freeRect() {
    const W = innerWidth, H = innerHeight, rect = el => { const r = el.getBoundingClientRect(); return r.height ? r : null; };
    const b = rect(bar), n = rect(nav), c = rect(card);
    const t = b ? b.bottom + 8 : 8, bottom = n ? n.top - 8 : H - 8;
    if (!c) return { l: 8, r: W - 8, t, b: bottom };
    if (W > 760) return { l: c.right + 8, r: W - 8, t, b: bottom };
    return { l: 8, r: W - 8, t, b: Math.min(c.top - 8, bottom) };
  }

  const widget = {
    slider({ label, min, max, step = 1, value, unit = '', format = v => v, onInput }) {
      const out = h('output', {}, `${format(value)}${unit}`);
      const input = h('input', { type: 'range', min, max, step, value, 'aria-label': label,
        oninput: e => { const v = +e.target.value; out.textContent = `${format(v)}${unit}`; onInput(v); } });
      controls.append(h('label', { class: 'slider' }, h('span', {}, label), out, input));
      input.set = v => { input.value = v; out.textContent = `${format(+input.value)}${unit}`; }; // move it from code
      return input;
    },
    toggle({ label, value, onChange }) {
      const input = h('input', { type: 'checkbox', checked: value || false, onchange: e => onChange(e.target.checked) });
      controls.append(h('label', { class: 'toggle' }, input, h('span', {}, label)));
      return input;
    },
    buttons(items) {
      const row = h('div', { class: 'choices' }, items.map(it => h('button', {
        type: 'button', class: it.on ? 'btn on' : 'btn', onclick: e => { row.querySelectorAll('.btn').forEach(b => b.classList.toggle('on', b === e.currentTarget)); it.onClick(); },
      }, it.label)));
      controls.append(row);
      return row;
    },
    readout(html) { readout.innerHTML = html; },
  };

  return { go, freeRect, widget, labels, card, get step() { return cur; }, total };
}
