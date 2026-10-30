// Injected before a lab lesson loads. After window.__vt.start(), requestAnimationFrame callbacks and
// performance.now() follow a virtual clock that only moves on __vt.tick(ms), so each video frame
// is rendered exactly once, at an exact time, however slow the machine is.
(() => {
  const realNow = performance.now.bind(performance), realRaf = window.requestAnimationFrame.bind(window);
  const queue = new Map();
  let manual = false, now = 0, id = 1e6;
  performance.now = () => (manual ? now : realNow());
  window.requestAnimationFrame = cb => {
    if (!manual) return realRaf(cb);
    queue.set(++id, cb);
    return id;
  };
  const realCancel = window.cancelAnimationFrame.bind(window);
  window.cancelAnimationFrame = h => (queue.delete(h) ? undefined : realCancel(h));
  window.__vt = {
    start() { manual = true; now = realNow(); },
    tick(ms) {
      now += ms;
      const cbs = [...queue.values()];
      queue.clear();
      for (const cb of cbs) cb(now);
    },
  };
})();
