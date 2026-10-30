// The five stages of a bean plant's life cycle as small low-poly models on a mound of soil.
// Same shape as butterfly.js: each stage is { name, make() } -> { g, animate(time, p) }.
import { leafGeometry } from './leaf.js';

const flat = (kit, c, o) => kit.mat(c, { flatShading: true, ...o });

function mound(THREE, kit, g) {
  const m = kit.mesh(new THREE.SphereGeometry(0.38, 14, 5, 0, Math.PI * 2, 0, Math.PI / 2), flat(kit, 0x7a5232), [0, 0, 0], g);
  m.scale.y = 0.3;
  return m;
}

function beanSeed(THREE, kit) {
  const s = kit.mesh(new THREE.SphereGeometry(0.06, 10, 6), flat(kit, 0xc98f5a), [0, 0, 0]);
  s.scale.set(1.5, 0.8, 1);
  return s;
}

// A bean plant of height h with n leaves, and optional flowers and pods.
function beanPlant(THREE, kit, { h, n, flowers = 0, pods = 0, seedLeaves = false }) {
  const g = new THREE.Group(), green = flat(kit, 0x4f9a3a), leafMat = flat(kit, 0x5bab42, { side: THREE.DoubleSide });
  const stem = kit.mesh(new THREE.CylinderGeometry(0.018, 0.026, h, 6).translate(0, h / 2, 0), green, [0, 0.08, 0], g);
  const leafGeo = leafGeometry(THREE, 0.24, 0.15, 0.1);
  for (let i = 0; i < n; i++) {
    const y = 0.08 + h * (0.35 + 0.6 * (i / Math.max(1, n - 1)));
    const piv = new THREE.Group(); piv.position.y = Math.min(y, 0.08 + h); piv.rotation.y = i * 2.4 + 0.3; g.add(piv);
    const m = kit.mesh(leafGeo, leafMat, [0.01, 0, 0], piv); m.rotation.set(0.5, 0, 0.35);
  }
  if (seedLeaves) for (const s of [-1, 1]) {
    const c = kit.mesh(new THREE.SphereGeometry(0.05, 8, 6), flat(kit, 0x9cc95a), [s * 0.05, 0.08 + h * 0.55, 0.01], g);
    c.scale.set(1.2, 0.5, 0.8);
  }
  const petal = flat(kit, 0xf3e9ff), centre = flat(kit, 0xb07ad6);
  for (let i = 0; i < flowers; i++) {
    const a = i * 2.1 + 0.6, y = 0.08 + h * (0.5 + 0.15 * i);
    const f = new THREE.Group(); f.position.set(Math.cos(a) * 0.07, y, Math.sin(a) * 0.07 + 0.02); g.add(f);
    kit.mesh(new THREE.SphereGeometry(0.035, 8, 6), petal, [0, 0, 0], f).scale.set(1.2, 1, 0.6);
    kit.mesh(new THREE.SphereGeometry(0.02, 6, 4), centre, [0, -0.015, 0.02], f);
  }
  const podMat = flat(kit, 0x7cbf3f);
  for (let i = 0; i < pods; i++) {
    const a = i * 2.1 + 0.6, y = 0.08 + h * (0.45 + 0.15 * i);
    const p = new THREE.Group(); p.position.set(Math.cos(a) * 0.06, y, Math.sin(a) * 0.06 + 0.02); g.add(p);
    const pod = kit.mesh(new THREE.CapsuleGeometry(0.025, 0.2, 3, 6), podMat, [0.03, -0.11, 0], p);
    pod.rotation.z = 0.25; pod.scale.set(1, 1, 0.6);
    for (let k = 0; k < 3; k++) kit.mesh(new THREE.SphereGeometry(0.022, 6, 4), podMat, [0.012 + k * 0.015, -0.05 - k * 0.055, 0.004], p).scale.set(1.1, 1, 0.8);
  }
  return { g, stem };
}

export function beanStages(THREE, kit) {
  const sway = g => (t) => { g.rotation.z = Math.sin(t * 1.5) * 0.04; };
  return [
    { name: 'Seed', make() {
      const g = new THREE.Group();
      mound(THREE, kit, g);
      const s = beanSeed(THREE, kit); s.position.set(0, 0.12, 0); g.add(s);
      // Near the end of the stage the seed swells with water and its skin splits.
      const root = kit.mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.12, 5).translate(0, -0.06, 0), flat(kit, 0xf1ddb0), [0.02, 0.1, 0], g);
      return { g, animate(t, p) { s.scale.set(1.5, 0.8, 1).multiplyScalar(1 + 0.25 * p); root.scale.set(1, Math.max(0.001, (p - 0.6) / 0.4), 1); root.visible = p > 0.6; } };
    } },
    { name: 'Seedling', make() {
      const g = new THREE.Group();
      mound(THREE, kit, g);
      const p = beanPlant(THREE, kit, { h: 0.26, n: 2, seedLeaves: true });
      g.add(p.g);
      return { g, animate(t, pr) { p.g.scale.set(1, 0.7 + 0.3 * pr, 1); sway(p.g)(t); } };
    } },
    { name: 'Young plant', make() {
      const g = new THREE.Group();
      mound(THREE, kit, g);
      const p = beanPlant(THREE, kit, { h: 0.55, n: 6 });
      g.add(p.g);
      return { g, animate(t, pr) { p.g.scale.set(1, 0.75 + 0.25 * pr, 1); sway(p.g)(t); } };
    } },
    { name: 'Flowers', make() {
      const g = new THREE.Group();
      mound(THREE, kit, g);
      const p = beanPlant(THREE, kit, { h: 0.62, n: 7, flowers: 3 });
      g.add(p.g);
      return { g, animate: sway(p.g) };
    } },
    { name: 'Pods', make() {
      const g = new THREE.Group();
      mound(THREE, kit, g);
      const p = beanPlant(THREE, kit, { h: 0.62, n: 7, pods: 3 });
      g.add(p.g);
      // Seeds from an old pod lie on the soil, ready to start again.
      for (let k = 0; k < 2; k++) { const s = beanSeed(THREE, kit); s.position.set(0.18 + k * 0.08, 0.06, 0.18 - k * 0.05); s.rotation.y = k; s.scale.multiplyScalar(0.8); g.add(s); }
      return { g, animate: sway(p.g) };
    } },
  ];
}
