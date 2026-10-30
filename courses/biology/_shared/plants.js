// Shared pieces for the middle school plant and energy lessons (photosynthesis, respiration, microorganisms):
// particle streams that show substances moving along a path, a glucose "hexagon", a plant growing in a
// cut-away block of soil, and a sprig of pondweed. Everything is three.js geometry; nothing is loaded.
import { leafGeometry } from './leaf.js';

// Seeded "random" number in [0, 1), so videos render the same every time.
export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Colours used for the same substance in every lesson.
export const SUBST = { co2: 0x6b7280, o2: 0xe5484d, water: 0x2f80ed, glucose: 0xf2a516, energy: 0xffd23f, starch: 0x3b3f8f };

// Glucose drawn as a small flat hexagon (its ring of atoms), lying in the xz plane.
export const glucoseGeometry = (THREE, r = 0.07) => new THREE.CylinderGeometry(r, r, r * 0.45, 6);

// Particles that travel along a path again and again (e.g. carbon dioxide into a leaf).
// points: [[x,y,z], ...] in the parent's space. update(dt) moves them; rate scales the speed (0 stops them).
// Particles grow in at the start of the path and shrink away at the end, so the loop has no visible jump.
export function stream(THREE, parent, { points, count = 8, color = 0xffffff, radius = 0.06, geo, speed = 0.25, spin = 0, emissive = 0.15 }) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  curve.getLengths(); // build the arc-length table once
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: emissive });
  const im = new THREE.InstancedMesh(geo || new THREE.SphereGeometry(radius, 10, 8), m, count);
  im.frustumCulled = false; // positions change every frame
  parent.add(im);
  const p = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), mt = new THREE.Matrix4();
  const S = { mesh: im, material: m, curve, phase: 0, rate: 1, size: 1 };
  S.update = (dt) => {
    S.phase += dt * speed * S.rate;
    for (let i = 0; i < count; i++) {
      const u = (((S.phase + i / count) % 1) + 1) % 1;
      curve.getPointAt(u, p);
      const k = Math.min(1, u / 0.12, (1 - u) / 0.12) * S.size;
      s.setScalar(Math.max(0.001, k));
      e.set(0.4 + spin * (S.phase * 6 + i), spin * (S.phase * 4 + i * 2), 0);
      q.setFromEuler(e);
      mt.compose(p, q, s);
      im.setMatrixAt(i, mt);
    }
    im.instanceMatrix.needsUpdate = true;
  };
  S.update(0);
  return S;
}

// A plant growing in a block of soil whose front is cut away, so its roots show. The soil top is at y = 0
// and the stem at x = 0. Leaves sit in pairs up the stem. Returns anchors (local positions) for arrows.
export function soilPlant(THREE, kit, { h = 2.2, pairs = 3, soilW = 2.6, soilD = 1.4, soilH = 1.1, tuber = false, leafColor = 0x3f9e3a } = {}) {
  const g = new THREE.Group();
  // Soil block, front face slightly darker and speckled.
  const soilTex = speckle(THREE);
  const soilMat = kit.mat(0x8a5a35, { map: soilTex, roughness: 0.95 });
  const soil = kit.mesh(new THREE.BoxGeometry(soilW, soilH, soilD), soilMat, [0, -soilH / 2, 0], g);
  soil.castShadow = false;
  // Roots drawn on the cut face (just in front of it), like a diagram of a dug-up plant.
  const rootMat = kit.mat(0xf0deb4, { roughness: 0.8 });
  const fz = soilD / 2 + 0.012;
  const roots = [];
  const addRoot = (pts, r) => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], fz)));
    const m = kit.mesh(new THREE.TubeGeometry(c, 16, r, 5), rootMat, [0, 0, 0], g);
    m.castShadow = false; roots.push(c);
  };
  addRoot([[0, 0, 0], [0.03, -0.3], [-0.04, -0.6], [0.02, -0.92]], 0.035);
  for (let i = 0; i < 5; i++) {
    const s = i % 2 ? 1 : -1, y0 = -0.12 - i * 0.15, len = 0.55 - i * 0.06;
    addRoot([[0, y0], [s * len * 0.45, y0 - 0.1], [s * len, y0 - 0.25 - rand(i) * 0.1]], 0.016);
  }
  // Optional tuber (a potato-like food store) on a side root.
  let tuberMesh = null;
  if (tuber) {
    addRoot([[0, -0.2], [0.35, -0.35], [0.62, -0.55]], 0.014);
    tuberMesh = kit.mesh(new THREE.SphereGeometry(0.2, 16, 12), kit.mat(0xc9a066, { roughness: 0.8 }), [0.72, -0.62, fz - 0.05], g);
    tuberMesh.scale.set(1.25, 0.85, 0.5);
  }
  // Stem and leaves.
  const stemMat = kit.mat(0x4f8f2f, { roughness: 0.7 });
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.055, h, 10), stemMat, [0, h / 2, 0], g);
  const leafMat = kit.mat(leafColor, { side: THREE.DoubleSide, roughness: 0.65 });
  const LEN = 0.9, TILT = 0.5;
  const leafGeo = leafGeometry(THREE, LEN, 0.42, 0.12);
  const leaves = [], leafTips = [];
  for (let i = 0; i < pairs; i++) {
    const y = h * (0.35 + 0.55 * (i / Math.max(1, pairs - 1)));
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(leafGeo, leafMat);
      l.position.set(0, y, 0);
      l.rotation.y = s > 0 ? 0.25 + i * 0.4 : Math.PI + 0.25 + i * 0.4;
      l.rotation.z = TILT;
      l.scale.setScalar(1 - i * 0.12);
      l.castShadow = true;
      g.add(l); leaves.push(l);
      // A point about 60% of the way along the leaf (where streams start and end).
      const a = l.rotation.y, r = 0.6 * LEN * l.scale.x, cx = Math.cos(TILT) * r;
      leafTips.push(new THREE.Vector3(Math.cos(a) * cx, y + Math.sin(TILT) * r, -Math.sin(a) * cx));
    }
  }
  // A small bud at the top.
  kit.mesh(new THREE.SphereGeometry(0.07, 10, 8), kit.mat(0x7cc35a), [0, h + 0.04, 0], g);
  return { g, leaves, leafMat, leafTips, top: new THREE.Vector3(0, h, 0), roots, tuber: tuberMesh, soilFront: fz, rootTip: new THREE.Vector3(0.02, -0.92, fz) };
}

// A sprig of pondweed (like Elodea): a slightly bent stem with whorls of three small leaves.
// The cut end (where oxygen bubbles come out) is at the top, at `tip`.
export function pondweed(THREE, kit, { h = 1.2 } = {}) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, h * 0.35, 0.02), new THREE.Vector3(-0.04, h * 0.7, -0.02), new THREE.Vector3(0.02, h, 0)]);
  const stemMat = kit.mat(0x3d8a3a, { roughness: 0.6 });
  kit.mesh(new THREE.TubeGeometry(curve, 20, 0.022, 6), stemMat, [0, 0, 0], g);
  const leafMat = kit.mat(0x3fa34a, { side: THREE.DoubleSide, roughness: 0.6 });
  const leafGeo = leafGeometry(THREE, 0.16, 0.05, 0.05);
  const p = new THREE.Vector3();
  for (let i = 1; i < 14; i++) {
    const u = i / 14;
    curve.getPointAt(u, p);
    for (let k = 0; k < 3; k++) {
      const l = new THREE.Mesh(leafGeo, leafMat);
      l.position.copy(p);
      l.rotation.set(0, (k * Math.PI * 2) / 3 + i * 0.7, 0.5 + 0.3 * (1 - u));
      g.add(l);
    }
  }
  // Pale cut end.
  kit.mesh(new THREE.SphereGeometry(0.028, 8, 6), kit.mat(0xcfe8b0), [0.02, h, 0], g);
  return { g, tip: new THREE.Vector3(0.02, h + 0.02, 0) };
}

// Brown speckles for soil.
function speckle(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#8a5a35'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    x.fillStyle = rand(i) > 0.5 ? '#6e4426' : '#a2734a';
    x.fillRect(rand(i + 3) * 128, rand(i + 7) * 128, 2 + rand(i + 11) * 3, 2 + rand(i + 13) * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
