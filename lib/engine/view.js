// Camera framing for the engine lessons: keeps the content centred and fully visible in the part
// of the screen not covered by the lesson card, using a view offset instead of resizing the canvas.
export function createFramer(camera, controls, freeRect) {
  let want = { radius: 5, yaw: 0, pitch: 0.35 };

  function apply() {
    const W = innerWidth, H = innerHeight, f = freeRect();
    const cx = (f.l + f.r) / 2, cy = (f.t + f.b) / 2;
    camera.aspect = W / H;
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    camera.updateProjectionMatrix();
    return { w: Math.max(80, f.r - f.l), h: Math.max(80, f.b - f.t) };
  }

  // Distance at which a sphere of `radius` fills ~90% of the free rect's shorter side. A wide scene can add
  // `width` (half its width): the camera then also backs off until that half-width fits ~90% of the free width.
  function distanceFor({ radius, width = 0 }, free) {
    const tanV = Math.tan((camera.fov * Math.PI) / 360), px = (innerHeight / 2) / (tanV * 0.45);
    return Math.max(radius * px / Math.min(free.w, free.h), width * px / free.w);
  }

  function frame(opts = {}, instant = false) {
    want = { ...want, ...opts };
    if (opts.radius != null && opts.width == null) want.width = 0; // a new framing drops the last step's width
    const free = apply();
    const d = distanceFor(want, free);
    const t = want.target ? controls.target.clone().set(...want.target) : controls.target.clone();
    const to = t.clone().add({
      x: d * Math.cos(want.pitch) * Math.sin(want.yaw),
      y: d * Math.sin(want.pitch),
      z: d * Math.cos(want.pitch) * Math.cos(want.yaw),
    });
    controls.minDistance = d * 0.35;
    controls.maxDistance = d * 2.5;
    return { from: camera.position.clone(), to, fromT: controls.target.clone(), toT: t, instant };
  }

  return { frame, apply };
}
