// The four stages of a frog's life cycle as small low-poly models, in water or on a lily pad.
// Same shape as butterfly.js: each stage is { name, make() } -> { g, animate(time, p) }.

const flat = (kit, c, o) => kit.mat(c, { flatShading: true, ...o });

function pond(THREE, kit, g) {
  const w = kit.mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20), flat(kit, 0x5fb3e6, { transparent: true, opacity: 0.75 }), [0, 0.02, 0], g);
  w.castShadow = false;
  return w;
}

// A frog body that can have a tail and legs of any size (0..1), so the tadpole, froglet and frog share it.
function frogBody(THREE, kit, color) {
  const g = new THREE.Group(), skin = flat(kit, color), belly = flat(kit, 0xd9eaa0);
  const body = kit.mesh(new THREE.SphereGeometry(0.14, 12, 8), skin, [0, 0.12, 0], g);
  body.scale.set(1, 0.75, 1.25);
  kit.mesh(new THREE.SphereGeometry(0.11, 10, 6), belly, [0, 0.08, 0.04], g).scale.set(1, 0.6, 1.2);
  const white = flat(kit, 0xffffff), black = flat(kit, 0x1d1d24);
  for (const s of [-1, 1]) {
    kit.mesh(new THREE.SphereGeometry(0.045, 8, 6), skin, [s * 0.07, 0.2, 0.1], g);
    kit.mesh(new THREE.SphereGeometry(0.03, 8, 6), white, [s * 0.075, 0.215, 0.125], g);
    kit.mesh(new THREE.SphereGeometry(0.016, 6, 4), black, [s * 0.078, 0.22, 0.15], g);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.12, -0.15);
  g.add(tail);
  const t = kit.mesh(new THREE.ConeGeometry(0.07, 0.34, 6), skin, [0, 0, -0.17], tail);
  t.rotation.x = -Math.PI / 2;
  t.scale.set(0.25, 1, 1);
  const back = [-1, 1].map(s => {
    const leg = new THREE.Group();
    leg.position.set(s * 0.11, 0.08, -0.08);
    g.add(leg);
    kit.mesh(new THREE.SphereGeometry(0.06, 8, 6), skin, [s * 0.04, 0, 0.01], leg).scale.set(0.8, 0.6, 1.5);
    kit.mesh(new THREE.SphereGeometry(0.045, 6, 4), skin, [s * 0.08, -0.05, 0.08], leg).scale.set(0.7, 0.35, 1.6);
    return leg;
  });
  const front = [-1, 1].map(s => {
    const leg = new THREE.Group();
    leg.position.set(s * 0.09, 0.07, 0.11);
    g.add(leg);
    kit.mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.09, 5), skin, [s * 0.01, -0.03, 0.01], leg);
    kit.mesh(new THREE.SphereGeometry(0.03, 6, 4), skin, [s * 0.015, -0.07, 0.03], leg).scale.set(1, 0.4, 1.3);
    return leg;
  });
  const set = (tailSize, backSize, frontSize) => {
    tail.scale.setScalar(Math.max(0.001, tailSize)); tail.visible = tailSize > 0.01;
    back.forEach(l => { l.scale.setScalar(Math.max(0.001, backSize)); l.visible = backSize > 0.01; });
    front.forEach(l => { l.scale.setScalar(Math.max(0.001, frontSize)); l.visible = frontSize > 0.01; });
  };
  return { g, tail, set };
}

export function frogStages(THREE, kit) {
  return [
    { name: 'Frogspawn', make() {
      const g = new THREE.Group();
      pond(THREE, kit, g);
      const jelly = new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false });
      const dot = flat(kit, 0x1d1d24), eggs = new THREE.Group();
      g.add(eggs);
      const spots = [[0, 0, 0], [0.13, 0, 0.02], [-0.12, 0, 0.04], [0.05, 0, 0.12], [-0.05, 0, -0.11], [0.08, 0.1, -0.04], [-0.07, 0.1, 0.05], [0.0, 0.11, 0.0], [0.12, 0.02, -0.11], [-0.13, 0.03, -0.08]];
      spots.forEach(([x, y, z]) => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), jelly);
        e.position.set(x, 0.08 + y, z);
        eggs.add(e);
        kit.mesh(new THREE.SphereGeometry(0.022, 6, 4), dot, [x, 0.08 + y, z], eggs);
      });
      return { g, animate(t) { eggs.position.y = 0.01 * Math.sin(t * 2); } };
    } },
    { name: 'Tadpole', make() {
      const g = new THREE.Group();
      pond(THREE, kit, g);
      const f = frogBody(THREE, kit, 0x4a3b2a);
      f.g.position.y = 0.0;
      g.add(f.g);
      // Back legs grow first, then the front legs.
      return { g, animate(t, p) {
        f.set(1, Math.max(0, (p - 0.35) / 0.4), Math.max(0, (p - 0.75) / 0.25));
        f.tail.rotation.y = Math.sin(t * 9) * 0.45;
        f.g.rotation.y = Math.sin(t * 1.3) * 0.4;
      } };
    } },
    { name: 'Froglet', make() {
      const g = new THREE.Group();
      pond(THREE, kit, g);
      const pad = kit.mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 14, 1, false, 0.4, Math.PI * 1.8), flat(kit, 0x5aae4a), [0, 0.05, 0], g);
      pad.castShadow = false;
      const f = frogBody(THREE, kit, 0x6b8f3a);
      f.g.scale.setScalar(0.8);
      f.g.position.y = 0.06;
      g.add(f.g);
      return { g, animate(t, p) { f.set(0.5 * (1 - p) + 0.1, 1, 1); f.tail.rotation.y = Math.sin(t * 3) * 0.2; } };
    } },
    { name: 'Frog', make() {
      const g = new THREE.Group();
      const rock = kit.mesh(new THREE.DodecahedronGeometry(0.3, 0), flat(kit, 0x9a9a92), [0, 0.05, 0], g);
      rock.scale.set(1.3, 0.35, 1.1);
      const f = frogBody(THREE, kit, 0x4caf50);
      f.set(0, 1, 1);
      f.g.scale.setScalar(1.25);
      f.g.position.y = 0.12;
      g.add(f.g);
      return { g, animate(t) { f.g.scale.set(1.25, 1.25 * (1 + 0.03 * Math.sin(t * 5)), 1.25); } };
    } },
  ];
}
