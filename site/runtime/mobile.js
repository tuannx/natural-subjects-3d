/* natural-subjects-3d: on small screens keep at most one lesson panel open and add a dock
   (step text · 3D only · console) to switch between them. In portrait the open panel is a bottom
   sheet, so the lesson's own camera framing is told the free area is above the sheet. */
(() => {
  const small = matchMedia('(max-width:760px),(max-height:500px) and (pointer:coarse)');
  const portrait = matchMedia('(max-width:760px)');
  const start = () => {
    const L = document.getElementById('left'), R = document.getElementById('right');
    const tabL = document.getElementById('tabL'), tabR = document.getElementById('tabR');
    const foot = document.getElementById('foot');
    if (!L || !R || !tabL || !tabR || !foot) return false;
    const panes = { L: [L, tabL], R: [R, tabR] };
    const isOpen = s => !panes[s][0].classList.contains('collapsed');
    const setOpen = (s, on) => {
      if (isOpen(s) === on) return;
      if (on) panes[s][1].click(); else panes[s][0].querySelector('.fold')?.click();
    };
    const dock = document.createElement('div');
    dock.id = 'ns-dock';
    for (const [label, side] of [[tabL.textContent || 'Step', 'L'], ['3D', '3d'], [tabR.textContent || 'Console', 'R']]) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label.trim(); b.dataset.side = side;
      b.addEventListener('click', () => show(side === '3d' ? null : side));
      dock.append(b);
    }
    document.body.append(dock);

    // The lesson frames its 3D content inside the rect left free by #left/#right (sides) and
    // #steps/#foot (top/bottom). In portrait, report the sheets as taking no width and move the
    // footer's top edge up to the top of the open sheet (or of the dock).
    const sheetTop = el => innerHeight - parseFloat(getComputedStyle(el).bottom) - el.offsetHeight;
    const freeBottom = () => isOpen('L') ? sheetTop(L) : isOpen('R') ? sheetTop(R) : dock.getBoundingClientRect().top;
    const fake = (el, fn) => {
      const real = el.getBoundingClientRect.bind(el);
      el.getBoundingClientRect = () => (portrait.matches ? fn(real()) : real());
    };
    fake(L, r => new DOMRect(0, r.y, 0, r.height));
    fake(R, r => new DOMRect(innerWidth, r.y, 0, r.height));
    // The lessons place content a little below the middle of the free rect, so lift its bottom
    // edge by a third of the free height to keep the scene clear of the sheet.
    fake(foot, r => {
      const top = document.getElementById('steps')?.getBoundingClientRect().bottom ?? 0;
      const b = freeBottom(), t = b - (b - top) / 3;
      return new DOMRect(r.x, t, r.width, innerHeight - t);
    });

    const sync = () => {
      const cur = isOpen('L') ? 'L' : isOpen('R') ? 'R' : '3d';
      for (const b of dock.children) b.classList.toggle('on', b.dataset.side === cur);
    };
    let last = 'L';
    const show = side => {
      for (const s of ['L', 'R']) if (s !== side) setOpen(s, false);
      if (side) { setOpen(side, true); last = side; }
      sync();
    };
    // The lesson itself may open a panel (e.g. the test step opens the console): keep only that one.
    const mo = new MutationObserver(() => {
      if (!small.matches) return;
      if (isOpen('L') && isOpen('R')) show(last === 'L' ? 'R' : 'L'); else sync();
    });
    for (const el of [L, R]) mo.observe(el, { attributes: true, attributeFilter: ['class'] });
    const apply = () => {
      if (!small.matches) return;
      show(isOpen('L') ? 'L' : isOpen('R') ? 'R' : null);
      dispatchEvent(new Event('resize')); // re-run the lesson's framing with the new free rect
    };
    small.addEventListener('change', apply);
    apply();
    return true;
  };
  const wait = () => { if (!start()) setTimeout(wait, 60); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', wait) : wait();
})();
