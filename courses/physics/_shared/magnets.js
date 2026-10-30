// Magnet helpers for the magnetism lessons (magnetic-fields, electromagnetism): a painted bar magnet, a
// small compass, a field from magnetic "poles" (each pole acts like a point source, which gives the
// familiar bar-magnet pattern), field lines traced along that field, and iron filings that line up with it.
// The field is worked out in a flat 2D plane (u, v); a `to3(u, v, out)` function places a 2D point in the
// 3D scene, so the same code draws lines on a table (x–z) or around a globe (x–y). Build everything once
// in setup; nothing here allocates per frame.
import { paint } from './lab.js';

export const N_RED = 0xe63946, S_BLUE = 0x2f6db5;

function letterTex(THREE, text, bg) {
  return paint(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.font = '800 92px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

// A bar magnet along x: red north half at +x, blue south half at −x, letters on the top and the front.
// magnet.nEnd / magnet.sEnd are anchors just above each end (for labels). magnet.inset = how far in from
// each end the model pole sits.
export function barMagnet(THREE, kit, { length = 2, width = 0.5, height = 0.32 } = {}) {
  const g = new THREE.Group(), half = length / 2;
  const red = kit.mat(N_RED, { roughness: 0.45 }), blue = kit.mat(S_BLUE, { roughness: 0.45 });
  kit.mesh(new THREE.BoxGeometry(half, height, width), red, [half / 2, 0, 0], g);
  kit.mesh(new THREE.BoxGeometry(half, height, width), blue, [-half / 2, 0, 0], g);
  const nTex = letterTex(THREE, 'N', '#e63946'), sTex = letterTex(THREE, 'S', '#2f6db5');
  const s = Math.min(width, height) * 0.9, sTop = Math.min(width * 0.9, half * 0.6);
  for (const [tex, x] of [[nTex, half * 0.6], [sTex, -half * 0.6]]) {
    const m = new THREE.MeshBasicMaterial({ map: tex });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(sTop, sTop), m);
    top.rotation.x = -Math.PI / 2; top.position.set(x, height / 2 + 0.002, 0); g.add(top);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(s, s), m);
    front.position.set(x, 0, width / 2 + 0.002); g.add(front);
  }
  g.nEnd = new THREE.Object3D(); g.nEnd.position.set(half * 0.75, height / 2 + 0.05, 0); g.add(g.nEnd);
  g.sEnd = new THREE.Object3D(); g.sEnd.position.set(-half * 0.75, height / 2 + 0.05, 0); g.add(g.sEnd);
  g.length = length; g.inset = Math.min(0.18, length * 0.1);
  return g;
}

// A small compass lying flat. compass.needle turns about y; its red (north-seeking) tip points along local +x.
// compass.aim(du, dv) points it along a direction in the x–z plane (du = x, dv = z), compass.angle(a) sets it.
export function compass(THREE, kit, { r = 0.22 } = {}) {
  const g = new THREE.Group();
  kit.mesh(new THREE.CylinderGeometry(r, r * 1.04, 0.06, 24), kit.mat(0x9aa4ad, { metalness: 0.4, roughness: 0.4 }), [0, 0.03, 0], g);
  const face = paint(THREE, 128, 128, (c, w, h) => {
    c.fillStyle = '#fbfaf5'; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#8d99ae'; c.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, r1 = i % 4 ? 50 : 44;
      c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1); c.lineTo(w / 2 + Math.cos(a) * 60, h / 2 + Math.sin(a) * 60); c.stroke();
    }
  });
  const f = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 24), new THREE.MeshBasicMaterial({ map: face }));
  f.rotation.x = -Math.PI / 2; f.position.y = 0.062; g.add(f);
  const needle = new THREE.Group(); needle.position.y = 0.085; g.add(needle);
  const tipGeo = new THREE.ConeGeometry(r * 0.2, r * 0.82, 4);
  const north = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: N_RED }));
  north.rotation.z = -Math.PI / 2; north.position.x = r * 0.41; north.scale.set(1, 1, 0.35); needle.add(north);
  const south = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0xe9ecef }));
  south.rotation.z = Math.PI / 2; south.position.x = -r * 0.41; south.scale.set(1, 1, 0.35); needle.add(south);
  kit.mesh(new THREE.CylinderGeometry(r * 0.08, r * 0.08, 0.03, 10), kit.mat(0x33414d), [0, 0.1, 0], g);
  g.needle = needle;
  g.angle = a => { needle.rotation.y = a; };
  g.aim = (du, dv) => { needle.rotation.y = Math.atan2(-dv, du); };
  return g;
}

// Angle for compass.needle.rotation.y that points along (du, dv) in the x–z plane.
export const aimAngle = (du, dv) => Math.atan2(-dv, du);

// Turn angle `a` toward `b` the short way round, by at most `max` radians. Returns the new angle.
export function turnToward(a, b, max) {
  let d = b - a;
  d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
  return Math.abs(d) <= max ? b : a + Math.sign(d) * max;
}

// Field at (u, v) from poles [{ u, v, q }] (q = +1 north, −1 south): sum of q·r/|r|³, softened near a pole.
// Writes into out = { u, v } and returns it.
export function poleField(poles, u, v, out, soft = 0.01) {
  let bu = 0, bv = 0;
  for (const p of poles) {
    const du = u - p.u, dv = v - p.v, r2 = du * du + dv * dv + soft, k = p.q / (r2 * Math.sqrt(r2));
    bu += du * k; bv += dv * k;
  }
  out.u = bu; out.v = bv;
  return out;
}

// The two model poles of a bar magnet of `length` centred at (u, v), turned by angle a (radians, from +u
// toward +v), north end at the +u side when a = 0. Pushes them into `list` and returns it.
export function magnetPoles(list, length, u = 0, v = 0, a = 0, inset = 0.18, strength = 1) {
  const h = length / 2 - inset, cu = Math.cos(a) * h, cv = Math.sin(a) * h;
  list.push({ u: u + cu, v: v + cv, q: strength }, { u: u - cu, v: v - cv, q: -strength });
  return list;
}

// Trace field lines. seeds: [[u, v, dir]] (dir +1 follows the field, −1 goes against it). A line stops near a
// pole it is heading into, outside the box |u| < bu, |v| < bv, where stop(u, v) is true, or after `max` steps.
// Returns arrays of [u, v]; an array that ended at a pole has hitPole = true.
export function traceLines(poles, seeds, { step = 0.03, max = 900, bu = 6, bv = 6, stopR = 0.1, cu = 0, cv = 0, stop: stopAt = null } = {}) {
  const f = { u: 0, v: 0 }, lines = [];
  for (const [u0, v0, dir = 1] of seeds) {
    let u = u0, v = v0;
    const pts = [[u, v]];
    for (let i = 0; i < max; i++) {
      poleField(poles, u, v, f);
      let l = Math.hypot(f.u, f.v) || 1;
      const mu = u + dir * f.u / l * step / 2, mv = v + dir * f.v / l * step / 2;
      poleField(poles, mu, mv, f);
      l = Math.hypot(f.u, f.v) || 1;
      u += dir * f.u / l * step; v += dir * f.v / l * step;
      pts.push([u, v]);
      if (Math.abs(u - cu) > bu || Math.abs(v - cv) > bv || (stopAt && i > 2 && stopAt(u, v))) break;
      let stop = false;
      for (const p of poles) if (p.q * dir < 0 && (u - p.u) ** 2 + (v - p.v) ** 2 < stopR * stopR) { stop = true; pts.push([p.u, p.v]); pts.hitPole = true; }
      if (stop) break;
    }
    lines.push(pts);
  }
  return lines;
}

// Seeds on a small circle around a pole, at the given angles (radians), all following the field away from
// a north pole (dir +1) or against it from a south pole (dir −1).
export function ringSeeds(list, pole, angles, r = 0.12) {
  const dir = pole.q > 0 ? 1 : -1;
  for (const a of angles) list.push([pole.u + Math.cos(a) * r, pole.v + Math.sin(a) * r, dir]);
  return list;
}

// Lines from every pole of a set: north poles trace along the field, south poles against it. A line from a south
// pole that ends on a north pole repeats one already traced, so it is dropped. Returns { lines, dirs } for lineGroup.
export function allLines(poles, angleFor, opts) {
  const lines = [], dirs = [];
  for (const p of poles) {
    const seeds = ringSeeds([], p, angleFor(p), opts.seedR || 0.14);
    for (const l of traceLines(poles, seeds, opts)) {
      if (p.q < 0 && l.hitPole) continue;
      lines.push(l); dirs.push(p.q > 0 ? 1 : -1);
    }
  }
  return { lines, dirs };
}

// Field lines as thin tubes with small arrowheads that point along the field (north to south), placed in 3D
// by to3(u, v, outVector3). lines: from traceLines (a line traced against the field has its arrows flipped
// with flip: true per line, see dirs). Returns a Group.
export function lineGroup(THREE, lines, to3, { color = 0x33414d, radius = 0.014, arrows = 1, arrowSize = 0.09, dirs = null, minLen = 0.3 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });
  const cone = new THREE.ConeGeometry(arrowSize * 0.55, arrowSize * 1.4, 8);
  const up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3();
  lines.forEach((pts, li) => {
    // Thin the points (keep every ~0.12 units of path).
    const keep = [pts[0]];
    let acc = 0, total = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      acc += d; total += d;
      if (acc > 0.12 || i === pts.length - 1) { keep.push(pts[i]); acc = 0; }
    }
    if (keep.length < 3 || total < minLen) return;
    const v3 = keep.map(([u, v]) => to3(u, v, new THREE.Vector3()));
    const curve = new THREE.CatmullRomCurve3(v3);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(160, v3.length * 2), radius, 4, false), mat);
    g.add(tube);
    const flip = dirs ? dirs[li] < 0 : false;
    for (let k = 0; k < arrows; k++) {
      const s = (k + 0.5) / arrows;
      curve.getPointAt(s, a);
      curve.getTangentAt(s, b);
      if (flip) b.negate();
      const c = new THREE.Mesh(cone, mat);
      c.position.copy(a);
      c.quaternion.setFromUnitVectors(up, b);
      g.add(c);
    }
  });
  return g;
}

// Iron filings: thin dark slivers scattered over a rectangle, more of them where the field is strong.
// filings.settle(k) turns each from its own random angle (k = 0) to the field direction (k = 1).
// skip(u, v) → true leaves a spot empty (e.g. under the magnet). rand(i) is a seeded random in [0, 1).
export function filings(THREE, poles, to3, rand, { count = 1200, u0 = -3, u1 = 3, v0 = -2, v1 = 2, size = 0.12, skip = () => false, color = 0x3a3a3a, seed = 0, bias = 0.6 } = {}) {
  const geo = new THREE.BoxGeometry(size, size * 0.15, size * 0.3);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 }), count);
  mesh.frustumCulled = false;
  const pos = [], ang0 = new Float32Array(count), ang1 = new Float32Array(count), f = { u: 0, v: 0 };
  // Reference strength for the density bias: field half way between the poles' spread.
  let n = 0, tries = 0;
  while (n < count && tries < count * 40) {
    const i = seed + tries++;
    const u = u0 + (u1 - u0) * rand(i * 2 + 1), v = v0 + (v1 - v0) * rand(i * 2 + 2);
    if (skip(u, v)) continue;
    poleField(poles, u, v, f);
    const s = Math.hypot(f.u, f.v);
    // Keep more filings where the field is strong (they are pulled there), a few everywhere else.
    if (rand(i * 3 + 7) > bias * Math.min(1, s * 1.5) + (1 - bias) * 0.35) continue;
    pos.push(to3(u, v, new THREE.Vector3()));
    ang0[n] = rand(i * 5 + 3) * Math.PI;
    ang1[n] = Math.atan2(f.v, f.u);
    n++;
  }
  mesh.count = n;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), axis = new THREE.Vector3(0, 1, 0);
  mesh.axis = axis; // the plane's normal; set before settle() for a plane other than x–z
  mesh.settle = k => {
    for (let i = 0; i < n; i++) {
      // Lines have no head or tail: turn the short way to the field line.
      let d = ang1[i] - ang0[i];
      d -= Math.round(d / Math.PI) * Math.PI;
      q.setFromAxisAngle(axis, -(ang0[i] + d * k));
      mesh.setMatrixAt(i, m4.compose(pos[i], q, s1));
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  mesh.settle(0);
  return mesh;
}
