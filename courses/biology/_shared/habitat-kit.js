// Low-poly builders shared by the habitat and food-chain lessons: seeded random numbers, painted
// textures, trees, grass tufts, mushrooms and a frog. Everything is made from three.js geometry.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Seeded "random" number in [0, 1), so videos render the same every time.
export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Small canvas texture drawn in code.
export function paint(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Smooth step from 0 to 1 between a and b.
export const smooth = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

// A tree standing on y = 0. kind 'round' (leafy) or 'pine'. Returns the group; userData.trunk, userData.crown.
export function makeTree(THREE, kit, { kind = 'round', h = 1.5, r = 0.5, trunk = 0x8b5a2b, leaves = 0x4f9d48 } = {}) {
  const g = new THREE.Group();
  const tr = kit.mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.24, h * 0.62, 8), kit.mat(trunk), [0, h * 0.31, 0], g);
  const lm = kit.mat(leaves, { flatShading: true });
  const crown = new THREE.Group();
  g.add(crown);
  if (kind === 'pine') {
    for (let i = 0; i < 3; i++) kit.mesh(new THREE.ConeGeometry(r * (1 - i * 0.22), h * 0.42, 8), lm, [0, h * (0.42 + i * 0.2), 0], crown);
  } else {
    kit.mesh(new THREE.IcosahedronGeometry(r, 1), lm, [0, h * 0.78, 0], crown);
    kit.mesh(new THREE.IcosahedronGeometry(r * 0.7, 1), lm, [r * 0.55, h * 0.7, r * 0.1], crown);
    kit.mesh(new THREE.IcosahedronGeometry(r * 0.65, 1), lm, [-r * 0.5, h * 0.72, -r * 0.15], crown);
  }
  g.userData = { trunk: tr, crown };
  return g;
}

// One merged geometry for a tuft of grass blades (base at y = 0), shared by every tuft.
export function tuftGeometry(THREE, { blades = 6, h = 0.32, w = 0.035 } = {}) {
  const parts = [];
  for (let i = 0; i < blades; i++) {
    const b = new THREE.ConeGeometry(w, h * (0.7 + rand(i + 3) * 0.5), 3).translate(0, h * 0.4, 0);
    b.rotateZ((rand(i) - 0.5) * 0.7).rotateY((i / blades) * Math.PI * 2);
    b.translate(Math.cos(i * 2.4) * w * 1.5, 0, Math.sin(i * 2.4) * w * 1.5);
    parts.push(b);
  }
  return mergeGeometries(parts);
}

// A mushroom on y = 0 (stalk + cap). userData.cap is the cap mesh.
export function makeMushroom(THREE, kit, { s = 1, cap = 0xd64545, stalk = 0xf4ead2 } = {}) {
  const g = new THREE.Group();
  kit.mesh(new THREE.CylinderGeometry(0.03 * s, 0.04 * s, 0.12 * s, 8), kit.mat(stalk), [0, 0.06 * s, 0], g);
  const c = kit.mesh(new THREE.SphereGeometry(0.08 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(cap), [0, 0.11 * s, 0], g);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7;
    kit.mesh(new THREE.SphereGeometry(0.012 * s, 6, 4), kit.mat(0xffffff), [Math.cos(a) * 0.045 * s, 0.11 * s + 0.06 * s, Math.sin(a) * 0.045 * s], g).castShadow = false;
  }
  g.userData.cap = c;
  return g;
}

// A frog facing +x, sitting on y = 0, about 0.24 long. userData.feet: the webbed back feet.
export function makeFrog(THREE, kit, { color = 0x5aa83a } = {}) {
  const g = new THREE.Group();
  const skin = kit.mat(color), belly = kit.mat(0xd8e8a0), dark = kit.mat(0x1d1d1d);
  const body = kit.mesh(new THREE.SphereGeometry(0.1, 14, 10), skin, [0, 0.075, 0], g);
  body.scale.set(1.25, 0.75, 1);
  kit.mesh(new THREE.SphereGeometry(0.07, 12, 8), belly, [0.03, 0.055, 0], g).scale.set(1.2, 0.6, 1.1);
  for (const z of [-0.045, 0.045]) {
    kit.mesh(new THREE.SphereGeometry(0.032, 10, 8), skin, [0.08, 0.13, z], g);
    kit.mesh(new THREE.SphereGeometry(0.016, 8, 6), dark, [0.098, 0.14, z * 1.25], g);
  }
  // Back legs folded beside the body, with wide webbed feet.
  const feet = [];
  const webMat = kit.mat(0x8fcf5a, { side: THREE.DoubleSide });
  for (const z of [-1, 1]) {
    const thigh = kit.mesh(new THREE.SphereGeometry(0.045, 10, 6), skin, [-0.07, 0.05, z * 0.08], g);
    thigh.scale.set(1.5, 0.7, 0.8);
    const foot = kit.mesh(new THREE.CircleGeometry(0.06, 5, -0.7, 1.4), webMat, [-0.02, 0.006, z * 0.11], g);
    foot.rotation.x = -Math.PI / 2;
    foot.rotation.z = Math.PI;
    feet.push(foot);
    kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 5), skin, [0.08, 0.035, z * 0.06], g);
  }
  g.userData.feet = feet;
  return g;
}
