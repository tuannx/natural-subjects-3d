/* natural-subjects-3d: when the lesson's own frame-rate watchdog flags a slow device
   (it adds body.lowfps), also drop the 3D canvas to 1x resolution. */
(() => {
  const drop = () => {
    const r = window.__lab && window.__lab.renderer;
    if (!r || r.getPixelRatio() <= 1) return;
    r.setPixelRatio(1);
    dispatchEvent(new Event('resize'));
  };
  const watch = () => new MutationObserver(() => document.body.classList.contains('lowfps') && drop())
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.body ? watch() : document.addEventListener('DOMContentLoaded', watch);
})();
