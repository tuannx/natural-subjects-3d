// The four stages of a butterfly's life cycle (a monarch), as small low-poly models.
// Each stage is { name, make() } and make() returns { g, animate(time, p) }, where p (0..1) is how far
// through that stage the animal is. Models stand on y = 0 and fit in about 0.8 units.
import { leafGeometry } from './leaf.js';

const flat = (kit, c, o) => kit.mat(c, { flatShading: true, ...o });

function leaf(THREE, kit, len = 0.8) {
  const m = kit.mesh(leafGeometry(THREE, len, len * 0.5, 0.05), flat(kit, 0x58a845, { side: THREE.DoubleSide }), [-len / 2, 0.03, 0]);
  return m;
}

function wingShape(THREE, pts) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  for (let i = 0; i < pts.length; i += 3) s.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2][0], pts[i + 2][1]);
  return new THREE.ShapeGeometry(s, 6);
}

export function butterflyStages(THREE, kit) {
  return [
    { name: 'Egg', make() {
      const g = new THREE.Group();
      g.add(leaf(THREE, kit));
      const egg = kit.mesh(new THREE.SphereGeometry(0.07, 12, 8), flat(kit, 0xf3ecc2), [0.02, 0.12, 0.02], g);
      egg.scale.set(1, 1.35, 1);
      return { g, animate(t, p) { egg.scale.set(1, 1.35, 1).multiplyScalar(1 + 0.04 * Math.sin(t * 3)); } };
    } },
    { name: 'Caterpillar', make() {
      const g = new THREE.Group();
      const lf = leaf(THREE, kit, 0.9);
      g.add(lf);
      const body = new THREE.Group();
      g.add(body);
      const cols = [0xf5c518, 0x1d1d1d, 0xffffff].map(c => flat(kit, c));
      const segGeo = new THREE.SphereGeometry(0.055, 10, 6), segs = [];
      for (let i = 0; i < 9; i++) segs.push(kit.mesh(segGeo, i === 8 ? cols[1] : cols[i % 3], [-0.2 + i * 0.05, 0.07, 0], body));
      const ant = flat(kit, 0x1d1d1d), antGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.1, 4);
      for (const s of [-1, 1]) {
        const a = kit.mesh(antGeo, ant, [0.22, 0.14, s * 0.025], body); a.rotation.z = -0.6;
        const b = kit.mesh(antGeo, ant, [-0.22, 0.13, s * 0.025], body); b.rotation.z = 0.6;
      }
      return { g, animate(t, p) {
        body.scale.setScalar(0.55 + 0.75 * p); // it eats and grows
        lf.scale.set(1 - 0.35 * p, 1, 1);      // the leaf gets eaten
        segs.forEach((s, i) => { s.position.y = 0.07 + 0.02 * Math.max(0, Math.sin(t * 4 - i * 0.7)); });
      } };
    } },
    { name: 'Chrysalis', make() {
      const g = new THREE.Group();
      const twig = kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), flat(kit, 0x8a5a35), [0, 0.62, 0], g);
      twig.rotation.z = Math.PI / 2;
      kit.mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.64, 6), flat(kit, 0x8a5a35), [-0.38, 0.32, 0], g); // a post holds the twig up
      const hang = new THREE.Group();
      hang.position.y = 0.6;
      g.add(hang);
      kit.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 4), flat(kit, 0x2b2b2b), [0, -0.03, 0], hang);
      const pod = kit.mesh(new THREE.CapsuleGeometry(0.1, 0.16, 4, 10), flat(kit, 0x6fcf7a, { roughness: 0.4 }), [0, -0.23, 0], hang);
      pod.scale.set(1, 1, 0.9);
      const gold = flat(kit, 0xf2c230, { metalness: 0.6, roughness: 0.3 });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; kit.mesh(new THREE.SphereGeometry(0.015, 6, 4), gold, [Math.cos(a) * 0.1, -0.15, Math.sin(a) * 0.1], hang); }
      // Late in the stage the case turns see-through dark, showing the wings inside.
      const green = new THREE.Color(0x6fcf7a), dark = new THREE.Color(0x3a2a22);
      return { g, animate(t, p) { hang.rotation.z = Math.sin(t * 1.2) * 0.08; pod.material.color.copy(green).lerp(dark, Math.max(0, p - 0.6) / 0.4); } };
    } },
    { name: 'Butterfly', make() {
      const g = new THREE.Group();
      // A flower to rest on.
      const stem = kit.mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.35, 5), flat(kit, 0x4f9a3a), [0, 0.175, 0], g);
      stem.castShadow = false;
      const head = kit.mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.05, 10), flat(kit, 0xe85d9e), [0, 0.36, 0], g);
      head.castShadow = false;
      const fly = new THREE.Group();
      fly.position.y = 0.42;
      g.add(fly);
      const black = flat(kit, 0x1d1d1d);
      const body = kit.mesh(new THREE.CapsuleGeometry(0.025, 0.2, 3, 6), black, [0, 0, 0], fly);
      body.rotation.x = Math.PI / 2;
      kit.mesh(new THREE.SphereGeometry(0.035, 8, 6), black, [0, 0.01, 0.13], fly);
      const orange = flat(kit, 0xf28a1c, { side: THREE.DoubleSide }), edge = flat(kit, 0x1d1d1d, { side: THREE.DoubleSide });
      const fore = wingShape(THREE, [0.15, 0.2, [0.36, 0.22], 0.34, 0.05, [0.2, -0.04], 0.08, -0.06, [0, 0]]);
      const hind = wingShape(THREE, [0.22, -0.02, [0.24, -0.18], 0.16, -0.3, [0.03, -0.2], -0.01, -0.1, [0, 0]]);
      const wings = [-1, 1].map(s => {
        const w = new THREE.Group();
        w.scale.x = s;
        fly.add(w);
        for (const [geo, z] of [[fore, 0.02], [hind, 0.0]]) {
          const a = kit.mesh(geo, edge, [0, 0, 0], w); a.rotation.x = Math.PI / 2; a.position.z = z;
          const b = kit.mesh(geo, orange, [0.012, 0.004, 0], w); b.rotation.x = Math.PI / 2; b.position.z = z; b.scale.set(0.88, 0.85, 1);
        }
        return w;
      });
      for (const s of [-1, 1]) { const a = kit.mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 3), black, [s * 0.025, 0.05, 0.19], fly); a.rotation.x = 0.9; a.rotation.z = -s * 0.3; }
      return { g, animate(t, p) {
        const flap = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 7));
        wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * flap * 0.9; });
        fly.position.y = 0.42 + 0.02 * Math.sin(t * 7);
      } };
    } },
  ];
}
