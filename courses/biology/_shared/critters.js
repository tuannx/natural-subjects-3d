// Friendly low-poly animals and their food, built from a few simple shapes.
// Every animal faces +Z and stands on y = 0 (the fish is centred on its own middle).
// Each builder returns { g, ...parts } so a scene can animate the head, wings or tail.

const flat = (kit, color, opts) => kit.mat(color, { flatShading: true, ...opts });
const ball = (THREE, r, seg = 10) => new THREE.SphereGeometry(r, seg, Math.max(6, seg - 3));

function eyes(THREE, kit, parent, x, y, z, r) {
  const black = flat(kit, 0x1d1d24, { roughness: 0.3 });
  for (const s of [-1, 1]) kit.mesh(ball(THREE, r, 8), black, [s * x, y, z], parent).castShadow = false;
}

export function rabbit(THREE, kit, { fur = 0xc9a27e, belly = 0xf4ead8 } = {}) {
  const g = new THREE.Group(), furMat = flat(kit, fur), pale = flat(kit, belly), pink = flat(kit, 0xf3a0b5);
  const body = kit.mesh(ball(THREE, 0.28, 12), furMat, [0, 0.27, -0.02], g);
  body.scale.set(0.9, 0.85, 1.15);
  kit.mesh(ball(THREE, 0.1, 8), pale, [0, 0.33, -0.34], g); // tail
  for (const s of [-1, 1]) {
    const foot = kit.mesh(ball(THREE, 0.08, 8), furMat, [s * 0.15, 0.05, -0.04], g);
    foot.scale.set(1, 0.55, 2.1);
    kit.mesh(ball(THREE, 0.05, 6), pale, [s * 0.09, 0.05, 0.24], g); // front paws
  }
  // Head on a pivot at the neck, so it can dip down to eat and drink.
  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.18);
  g.add(head);
  kit.mesh(ball(THREE, 0.18, 12), furMat, [0, 0.1, 0.1], head);
  kit.mesh(ball(THREE, 0.09, 8), pale, [0, 0.05, 0.21], head).scale.set(1.2, 0.8, 0.8); // muzzle
  kit.mesh(ball(THREE, 0.03, 6), pink, [0, 0.08, 0.29], head); // nose
  eyes(THREE, kit, head, 0.1, 0.15, 0.22, 0.032);
  const ears = [-1, 1].map(s => {
    const e = new THREE.Group();
    e.position.set(s * 0.07, 0.24, 0.05);
    e.rotation.z = -s * 0.18;
    head.add(e);
    kit.mesh(ball(THREE, 0.06, 8), furMat, [0, 0.17, 0], e).scale.set(0.85, 3, 0.5);
    kit.mesh(ball(THREE, 0.04, 6), pink, [0, 0.17, 0.02], e).scale.set(0.7, 2.6, 0.4);
    return e;
  });
  const nose = new THREE.Object3D();
  nose.position.set(0, 0.08, 0.3);
  head.add(nose);
  return { g, body, head, ears, nose };
}

export function bird(THREE, kit, { feathers = 0x4a8fd9, chest = 0xf28c38 } = {}) {
  const g = new THREE.Group(), coat = flat(kit, feathers), orange = flat(kit, 0xf6a623);
  const body = kit.mesh(ball(THREE, 0.15, 10), coat, [0, 0.2, 0], g);
  body.scale.set(0.9, 0.9, 1.2);
  kit.mesh(ball(THREE, 0.11, 8), flat(kit, chest), [0, 0.19, 0.07], g).scale.set(0.95, 0.95, 0.9);
  const tail = kit.mesh(new THREE.BoxGeometry(0.12, 0.025, 0.2), coat, [0, 0.25, -0.22], g);
  tail.rotation.x = -0.45;
  for (const s of [-1, 1]) kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 4), orange, [s * 0.05, 0.05, 0.01], g);
  const head = new THREE.Group();
  head.position.set(0, 0.3, 0.1);
  g.add(head);
  kit.mesh(ball(THREE, 0.1, 10), coat, [0, 0.04, 0.03], head);
  const beak = kit.mesh(new THREE.ConeGeometry(0.035, 0.1, 6), orange, [0, 0.03, 0.15], head);
  beak.rotation.x = Math.PI / 2;
  eyes(THREE, kit, head, 0.065, 0.07, 0.09, 0.022);
  const wings = [-1, 1].map(s => {
    const w = new THREE.Group();
    w.position.set(s * 0.12, 0.27, 0);
    g.add(w);
    const m = kit.mesh(ball(THREE, 0.1, 8), coat, [s * 0.03, -0.05, -0.03], w);
    m.scale.set(0.3, 0.65, 1.2);
    w.side = s;
    return w;
  });
  const beakTip = new THREE.Object3D();
  beakTip.position.set(0, 0.03, 0.2);
  head.add(beakTip);
  return { g, body, head, wings, beakTip };
}

export function fish(THREE, kit, { scales = 0xf59a23 } = {}) {
  const g = new THREE.Group(), skin = flat(kit, scales), fin = flat(kit, 0xffc56b, { side: THREE.DoubleSide });
  const body = kit.mesh(ball(THREE, 0.15, 12), skin, [0, 0, 0], g);
  body.scale.set(0.65, 0.9, 1.5);
  const tail = new THREE.Group();
  tail.position.set(0, 0, -0.2);
  g.add(tail);
  const tm = kit.mesh(new THREE.ConeGeometry(0.13, 0.22, 8), fin, [0, 0, -0.09], tail);
  tm.rotation.x = Math.PI / 2;
  tm.scale.set(0.2, 1, 1);
  const top = kit.mesh(new THREE.ConeGeometry(0.06, 0.12, 6), fin, [0, 0.14, -0.02], g);
  top.scale.set(0.25, 1, 1.4);
  top.rotation.x = -0.4;
  // Gills: a red slit on each side, just behind the eyes.
  const gillMat = flat(kit, 0xc8361e);
  for (const s of [-1, 1]) kit.mesh(ball(THREE, 0.04, 6), gillMat, [s * 0.088, -0.01, 0.07], g).scale.set(0.25, 1.4, 0.5);
  const white = flat(kit, 0xffffff);
  for (const s of [-1, 1]) kit.mesh(ball(THREE, 0.03, 8), white, [s * 0.075, 0.04, 0.13], g);
  eyes(THREE, kit, g, 0.092, 0.042, 0.142, 0.016);
  const mouth = new THREE.Object3D();
  mouth.position.set(0, -0.01, 0.23);
  const gill = new THREE.Object3D();
  gill.position.set(0.1, -0.01, 0.07);
  g.add(mouth, gill);
  return { g, body, tail, mouth, gill };
}

// Food. Each returns a group that sits on y = 0.
export function carrot(THREE, kit) {
  const g = new THREE.Group();
  const root = kit.mesh(new THREE.ConeGeometry(0.07, 0.4, 7), flat(kit, 0xf07a1a), [0, 0.07, 0], g);
  root.rotation.z = Math.PI / 2;
  const green = flat(kit, 0x4caf50);
  for (let i = -1; i <= 1; i++) {
    const l = kit.mesh(new THREE.ConeGeometry(0.025, 0.2, 4), green, [0.25, 0.1, i * 0.03], g);
    l.rotation.z = -Math.PI / 2 + 0.5 + i * 0.3;
  }
  return g;
}

export function seeds(THREE, kit) {
  const g = new THREE.Group(), m = flat(kit, 0xd8b26a), geo = new THREE.SphereGeometry(0.035, 6, 4);
  [[0, 0], [0.07, 0.03], [-0.06, 0.05], [0.02, -0.07], [-0.04, -0.04], [0.08, -0.05]].forEach(([x, z], i) => {
    const s = kit.mesh(geo, m, [x, 0.02, z], g);
    s.scale.set(1, 0.6, 1.5);
    s.rotation.y = i * 1.3;
  });
  return g;
}

// A worm made of a chain of pink beads; returns the beads so a scene can wiggle them.
export function worm(THREE, kit) {
  const g = new THREE.Group(), m = flat(kit, 0xe88aa0), geo = new THREE.SphereGeometry(0.035, 6, 4);
  const beads = [];
  for (let i = 0; i < 7; i++) beads.push(kit.mesh(geo, m, [0, 0, (i - 3) * 0.045], g));
  return { g, beads };
}
