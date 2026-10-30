// Camera framing for the primary lessons: keeps the content centred and fully visible in the part
// of the screen not covered by the lesson card, using a view offset instead of resizing the canvas.
export function createFramer(camera, controls, freeRect) {
  let want = { radius: 5, yaw: 0, pitch: 0.35 };

  function apply() {
    const W = innerWidth, H = innerHeight, f = freeRect();
    const cx = (f.l + f.r) / 2, cy = (f.t + f.b) / 2;
    camera.aspect = W / H;
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    camera.updateProjectionMatrix();
    return Math.max(80, Math.min(f.r - f.l, f.b - f.t));
  }

  // Distance at which a sphere of `radius` fills ~90% of the free rect's shorter side.
  function distanceFor(radius, freePx) {
    const tanV = Math.tan((camera.fov * Math.PI) / 360);
    return (radius * (innerHeight / 2)) / (tanV * 0.45 * freePx);
  }

  function frame(opts = {}, instant = false) {
    want = { ...want, ...opts };
    const free = apply();
    const d = distanceFor(want.radius, free);
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
