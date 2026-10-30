/* natural-subjects-3d: render-resolution budget. The 3D lessons size their canvas from
   devicePixelRatio once at start-up, so this runs first and caps it on phones and weak devices.
   ?quality=low forces 1x, ?quality=high keeps the device value. */
(() => {
  const q = new URLSearchParams(location.search).get('quality');
  const real = window.devicePixelRatio || 1;
  const phone = matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 820;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const cap = q === 'high' ? real : q === 'low' ? 1 : phone ? (weak ? 1.25 : 1.5) : weak ? 1.25 : real;
  if (cap >= real) return;
  Object.defineProperty(window, 'devicePixelRatio', { get: () => cap, configurable: true });
  document.documentElement.dataset.dpr = String(cap);
})();
