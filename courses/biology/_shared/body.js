// Shared pieces for the middle school human body lessons (digestion, circulation): tubes whose radius can
// change along their length (guts, blood vessels, a squeezing oesophagus), particle flows that can change
// colour along their path (blood picking up and giving up oxygen), blood cell shapes and a see-through torso.
// Everything is three.js geometry; nothing is loaded.

// Seeded "random" number in [0, 1), so videos render the same every time.
export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Colours used for the same thing in every body lesson.
export const BODY = {
  oxy: 0xd7263d,     // oxygenated blood (drawn red)
  deoxy: 0x3d63d6,   // deoxygenated blood (drawn blue)
  plasma: 0xf2cf63,
  white: 0xf3efe6,
  platelet: 0xc79be0,
  skin: 0xf1c7a8,
  gut: 0xf2a7a0,
  liver: 0x8e3b2f,
};

// A tube along `curve` whose radius is r(u) (u from 0 at the start to 1 at the end).
// Returns { geo, set(r) }: set(r) re-shapes the same geometry with a new radius function (no new allocation),
// e.g. to squeeze a ring of muscle along the tube every frame.
export function taperTube(THREE, curve, { segs = 48, radial = 12, r = () => 0.1, closed = false } = {}) {
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, closed);
  const p = geo.attributes.position, n = p.count;
  const centre = new Float32Array(n * 3), unit = new Float32Array(n * 3), us = new Float32Array(n);
  const c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = closed && i === segs ? 0 : i / segs;
    curve.getPointAt(u, c);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      centre[k * 3] = c.x; centre[k * 3 + 1] = c.y; centre[k * 3 + 2] = c.z;
      unit[k * 3] = p.getX(k) - c.x; unit[k * 3 + 1] = p.getY(k) - c.y; unit[k * 3 + 2] = p.getZ(k) - c.z;
      us[k] = i / segs;
    }
  }
  const set = (rf) => {
    for (let k = 0; k < n; k++) {
      const rr = rf(us[k]);
      p.setXYZ(k, centre[k * 3] + unit[k * 3] * rr, centre[k * 3 + 1] + unit[k * 3 + 1] * rr, centre[k * 3 + 2] + unit[k * 3 + 2] * rr);
    }
    p.needsUpdate = true;
  };
  set(r);
  geo.computeBoundingSphere();
  return { geo, set };
}

// Particles that travel along a path again and again. curve: a THREE curve (or points: [[x,y,z], ...]).
// colorAt(u, color) may set each particle's colour from its place on the path (u from 0 to 1).
// With closed: true the path is a loop and particles never fade; otherwise they grow in and shrink away at
// the ends so the loop has no visible jump. Set S.rate to change the speed (0 stops them, negative reverses).
export function flow(THREE, parent, { curve, points, count = 12, geo, radius = 0.05, color = 0xffffff, colorAt = null,
  speed = 0.2, emissive = 0.15, closed = false, tumble = 0, fade = 0.1 }) {
  const path = curve || new THREE.CatmullRomCurve3(points.map(q => new THREE.Vector3(...q)), closed);
  path.getLengths();
  const m = new THREE.MeshStandardMaterial({ color: colorAt ? 0xffffff : color, roughness: 0.45, emissive: colorAt ? 0x000000 : color, emissiveIntensity: emissive });
  const im = new THREE.InstancedMesh(geo || new THREE.SphereGeometry(radius, 10, 8), m, count);
  im.frustumCulled = false; // positions change every frame
  im.castShadow = false;
  parent.add(im);
  const p = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), mt = new THREE.Matrix4(), col = new THREE.Color();
  const S = { mesh: im, material: m, curve: path, phase: 0, rate: 1, size: 1 };
  S.update = (dt) => {
    S.phase += dt * speed * S.rate;
    for (let i = 0; i < count; i++) {
      const u = (((S.phase + i / count) % 1) + 1) % 1;
      path.getPointAt(u, p);
      const k = closed ? S.size : Math.min(1, u / fade, (1 - u) / fade) * S.size;
      s.setScalar(Math.max(0.001, k));
      e.set(rand(i) * 6 + tumble * S.phase * 7, rand(i + 50) * 6 + tumble * S.phase * 5, rand(i + 90) * 6);
      q.setFromEuler(e);
      mt.compose(p, q, s);
      im.setMatrixAt(i, mt);
      if (colorAt) { colorAt(u, col); im.setColorAt(i, col); }
    }
    im.instanceMatrix.needsUpdate = true;
    if (colorAt && im.instanceColor) im.instanceColor.needsUpdate = true;
  };
  S.update(0);
  return S;
}

// A red blood cell: a disc of radius r that is thinner in the middle (biconcave), lying in the xz plane.
// Its faces may wind either way, so give it a DoubleSide material.
// segments: steps around the rim; n: steps from the centre to the rim (each face), so 4 * n * segments triangles.
export function redCellGeometry(THREE, r = 0.1, segments = 12, n = 5) {
  const pts = [];
  // Top surface from the centre out to the rim, then the bottom surface back to the centre.
  const h = x => r * Math.sqrt(Math.max(0, 1 - x * x)) * (0.12 + 0.62 * x * x - 0.34 * x ** 4);
  for (let i = 0; i <= n; i++) { const x = i / n; pts.push(new THREE.Vector2(Math.max(0.0001, x * r), h(x))); }
  for (let i = n - 1; i >= 0; i--) { const x = i / n; pts.push(new THREE.Vector2(Math.max(0.0001, x * r), -h(x))); }
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

// A see-through body outline: torso (height about 3, hips at y = 0), neck and head. Faces +z.
// The organs go inside it. Returns { g, head, mouthAt } (mouthAt: a point at the mouth, in g's space).
export function torso(THREE, kit, { color = BODY.skin, opacity = 0.16 } = {}) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const prof = [[0.001, -0.05], [0.42, -0.02], [0.6, 0.25], [0.64, 0.7], [0.58, 1.2], [0.56, 1.6], [0.66, 2.2], [0.8, 2.6], [0.76, 2.85], [0.45, 3.0], [0.2, 3.06], [0.17, 3.12]];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 28), skin);
  body.scale.z = 0.55;
  body.renderOrder = 3;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.3, 16, 1, true), skin);
  neck.position.y = 3.22; neck.scale.z = 0.9; neck.renderOrder = 3;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), skin);
  head.position.y = 3.68; head.scale.set(0.9, 1.05, 0.95); head.renderOrder = 3;
  g.add(head);
  return { g, head, skin, mouthAt: new THREE.Vector3(0, 3.48, 0.33) };
}
