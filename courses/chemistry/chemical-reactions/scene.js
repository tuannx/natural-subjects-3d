// Chemical reactions: a lab bench with stations, one per step. Ice melting vs paper burning; four test tubes
// showing the signs of a reaction; a particle board where 2H₂ + O₂ → 2H₂O rearranges atom by atom and a
// balancing game; a flask on a balance (closed vs open); magnesium burning in a crucible; a beaker with a
// thermometer for exothermic and endothermic reactions.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CPK } from '../_shared/atoms.js';
import { bench, beaker, testTube, flask, stopper, balance, thermometer, bubbles, arrow, sign, rand, labMats } from '../_shared/labware.js';

// Station x positions along the bench.
const X = { change: -8, signs: -3.6, board: 3, flask: 9.6, mg: 13.6, heat: 17.4 };
const RAD = { H: 0.2, C: 0.3, N: 0.29, O: 0.29 };

// Molecules for the particle board: [element, x, y, z] in board units, bonds [a, b, order].
const tet = 0.62 / Math.sqrt(3), ha = (104.5 / 2) * Math.PI / 180;
const MOLS = {
  H2: { f: 'H₂', atoms: [['H', -0.275, 0, 0], ['H', 0.275, 0, 0]], bonds: [[0, 1, 1]] },
  O2: { f: 'O₂', atoms: [['O', -0.36, 0, 0], ['O', 0.36, 0, 0]], bonds: [[0, 1, 2]] },
  N2: { f: 'N₂', atoms: [['N', -0.34, 0, 0], ['N', 0.34, 0, 0]], bonds: [[0, 1, 3]] },
  H2O: { f: 'H₂O', atoms: [['O', 0, 0.12, 0], ['H', -0.6 * Math.sin(ha), 0.12 - 0.6 * Math.cos(ha), 0], ['H', 0.6 * Math.sin(ha), 0.12 - 0.6 * Math.cos(ha), 0]], bonds: [[0, 1, 1], [0, 2, 1]] },
  CO2: { f: 'CO₂', atoms: [['O', -0.66, 0, 0], ['C', 0, 0, 0], ['O', 0.66, 0, 0]], bonds: [[0, 1, 2], [1, 2, 2]] },
  CH4: { f: 'CH₄', atoms: [['C', 0, 0, 0], ['H', tet, tet, tet], ['H', tet, -tet, -tet], ['H', -tet, tet, -tet], ['H', -tet, -tet, tet]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
  NH3: { f: 'NH₃', atoms: [['N', 0, 0.14, 0], ['H', 0.56, -0.08, 0], ['H', -0.28, -0.08, 0.485], ['H', -0.28, -0.08, -0.485]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
};
// Equations for the balancing game. ans = the smallest whole-number coefficients.
const EQS = [
  { name: 'Hydrogen + oxygen', left: ['H2', 'O2'], right: ['H2O'], ans: [2, 1, 2] },
  { name: 'Burning methane', left: ['CH4', 'O2'], right: ['CO2', 'H2O'], ans: [1, 2, 1, 2] },
  { name: 'Making ammonia', left: ['N2', 'H2'], right: ['NH3'], ans: [1, 3, 2] },
];
const MAXC = 4;
const CO2_MASS = 0.52;           // g of CO₂ from 1.00 g of baking soda: 1.00 / 84 × 44
const FLASK_MASS = 156.5;        // flask + 50 mL vinegar + vial with 1.00 g baking soda + stopper (model)
const CRUCIBLE = 25.0;           // g, empty crucible (model)

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  kit.stage(scene, { ground: 0xd8d2c8, sky: 0xe8f0f6, radius: 40 });
  kit.lights(scene, { sun: [4, 10, 7] });
  const lm = labMats(k);
  bench(k, { w: 31, d: 3.2, pos: [4.6, 0, 0] });
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion();
  const station = x => { const g = new THREE.Group(); g.position.x = x; scene.add(g); return g; };

  // Shared flame look (additive glowing spheres).
  const flameGeo = new THREE.SphereGeometry(1, 14, 10).translate(0, 1, 0);
  const fMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
  const orangeOuter = fMat(0xff8a1f, 0.85), orangeInner = fMat(0xffe066, 0.95);
  function flame(parent, size, outer = orangeOuter, inner = orangeInner) {
    const g = new THREE.Group();
    const o = new THREE.Mesh(flameGeo, outer), n = new THREE.Mesh(flameGeo, inner);
    o.scale.set(0.42, 1, 0.42); n.scale.set(0.24, 0.6, 0.24);
    g.add(o, n); parent.add(g);
    g.size = size; g.level = 0;
    g.tick = (t, seed = 0) => {
      const s = g.size * g.level, f = 1 + 0.1 * Math.sin(t * 17 + seed) + 0.06 * Math.sin(t * 29 + seed * 2);
      g.visible = g.level > 0.02; g.scale.set(s, s * f, s);
    };
    g.visible = false;
    return g;
  }
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0x8d949a, transparent: true, opacity: 0.45, depthWrite: false });
  const puffGeo = new THREE.SphereGeometry(1, 10, 7);
  const glowWhite = new THREE.MeshBasicMaterial({ color: 0xffffff }), glowBlue = fMat(0xffe066, 0.45);
  function glow(parent, r) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(puffGeo, glowWhite), new THREE.Mesh(puffGeo, glowBlue));
    g.children[0].scale.setScalar(r); g.children[1].scale.setScalar(r * 2.4);
    g.visible = false; parent.add(g);
    return g;
  }

  // ---------- Step 0: ice melting vs paper burning ----------
  const S0 = station(X.change);
  const plate = kit.mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.06, 32), kit.mat(0xffffff, { roughness: 0.3 }), [-0.85, 0.03, 0], S0);
  plate.castShadow = false;
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xe9f7ff, transparent: true, opacity: 0.8, roughness: 0.1 });
  const ice = kit.mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), iceMat, [-0.85, 0.24, 0], S0);
  const puddle = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.02, 32), new THREE.MeshStandardMaterial({ color: 0x8cc8f0, transparent: true, opacity: 0.65, roughness: 0.05 }));
  puddle.position.set(-0.85, 0.07, 0);
  S0.add(puddle);
  const tile = kit.mesh(new THREE.BoxGeometry(1.25, 0.05, 1.0), kit.mat(0x7b8288), [0.85, 0.025, 0], S0);
  tile.castShadow = false;
  const strips = [];
  for (let j = 0; j < 8; j++) {
    const m = kit.mesh(new THREE.BoxGeometry(0.12, 0.012, 0.72), kit.mat(0xfbfaf3), [0.85 - 0.42 + j * 0.12, 0.057, 0], S0);
    m.castShadow = false;
    strips.push(m);
  }
  const paperFlame = flame(S0, 0.22);
  const puffs = [];
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(puffGeo, smokeMat); p.visible = false; S0.add(p); puffs.push(p); }
  const iceTag = label('Ice', v3(X.change - 0.85, 0.75, 0), { cls: 'cool' });
  const paperTag = label('Paper', v3(X.change + 0.85, 0.75, 0), { cls: 'warm' });
  const cWhite = new THREE.Color(0xfbfaf3), cBrown = new THREE.Color(0x8a5a2b), cAsh = new THREE.Color(0x2b2b2b);
  const ch = { melt: null, burn: null };
  function resetChange() {
    ch.melt = ch.burn = null;
    ice.scale.setScalar(1); ice.position.y = 0.24; ice.visible = true; puddle.scale.set(0.001, 1, 0.001); puddle.visible = false;
    strips.forEach(s => { s.material.color.copy(cWhite); s.scale.set(1, 1, 1); s.position.y = 0.057; s.visible = true; });
    paperFlame.level = 0; paperFlame.visible = false; puffs.forEach(p => { p.visible = false; });
    iceTag.text = 'Ice'; paperTag.text = 'Paper'; ch.iceDone = ch.paperDone = false;
  }
  function tickChange(t) {
    let busy = false;
    if (ch.melt != null) {
      const m = kit.clamp((st.time - ch.melt) / 3.5, 0, 1);
      const s = Math.cbrt(Math.max(0.0001, 1 - m));
      ice.scale.setScalar(s); ice.position.y = 0.06 + 0.18 * s; ice.visible = m < 0.995;
      puddle.visible = m > 0.01; puddle.scale.set(0.12 + 0.36 * Math.sqrt(m), 1, 0.12 + 0.36 * Math.sqrt(m));
      if (m >= 1 && !ch.iceDone) { ch.iceDone = true; iceTag.text = 'Water: physical change'; }
      busy = busy || m < 1;
    }
    if (ch.burn != null) {
      const bt = st.time - ch.burn, front = bt * 2.6;
      strips.forEach((s, j) => {
        const a = kit.clamp(front - j, 0, 1.6);
        if (a < 0.6) s.material.color.copy(cWhite).lerp(cBrown, a / 0.6); else s.material.color.copy(cBrown).lerp(cAsh, Math.min(1, (a - 0.6)));
        const sh = 1 - 0.45 * kit.clamp(a - 0.6, 0, 1);
        s.scale.set(sh, 1, sh); s.position.y = 0.057 + 0.01 * Math.sin(j * 1.7) * (1 - sh);
      });
      const live = front < 9.2;
      paperFlame.level = live ? kit.clamp(front, 0, 1) * kit.clamp(9.2 - front, 0, 1) : 0;
      paperFlame.position.set(0.85 - 0.42 + kit.clamp(front - 0.5, 0, 7) * 0.12, 0.06, 0);
      paperFlame.tick(t);
      puffs.forEach((p, i) => {
        const age = ((bt * 0.6 + i / puffs.length) % 1);
        const on = bt > 0.4 && bt < 5.5;
        p.visible = on;
        if (!on) return;
        const s = 0.03 + age * 0.08;
        p.position.set(paperFlame.position.x + Math.sin(i * 2.3 + age * 3) * 0.1, 0.4 + age * 0.8, Math.cos(i * 1.7) * 0.08);
        p.scale.setScalar(s);
      });
      if (front > 9.2 && !ch.paperDone) { ch.paperDone = true; paperTag.text = 'Ash: chemical change'; }
      busy = busy || bt < 5.6;
    }
    return busy;
  }

  // ---------- Step 1: signs of a reaction ----------
  const S1 = station(X.signs);
  const rackMat = kit.mat(0xb07b4a);
  kit.mesh(new THREE.BoxGeometry(2.3, 0.06, 0.5), rackMat, [-0.8, 0.03, 0], S1);
  kit.mesh(new THREE.BoxGeometry(2.3, 0.05, 0.5), rackMat, [-0.8, 0.55, 0], S1).castShadow = false;
  for (const x of [-1.9, 0.3]) kit.mesh(new THREE.BoxGeometry(0.06, 0.55, 0.5), rackMat, [x, 0.3, 0], S1);
  const TX = [-1.6, -0.8, 0];
  const tA = testTube(k, { parent: S1, pos: [TX[0], 0.07, 0], fill: 0.5, color: 0xdfeef7, opacity: 0.5 });
  const tB = testTube(k, { parent: S1, pos: [TX[1], 0.07, 0], fill: 0.55, color: 0x2f7fe0, opacity: 0.75 });
  const tC = testTube(k, { parent: S1, pos: [TX[2], 0.07, 0], fill: 0.5, color: 0x5fa8f0, opacity: 0.6 });
  const zinc = new THREE.DodecahedronGeometry(0.035, 0);
  const zincMat = kit.mat(0x8f979e, { metalness: 0.6, roughness: 0.5, flatShading: true });
  for (let i = 0; i < 4; i++) kit.mesh(zinc, zincMat, [(rand(i) - 0.5) * 0.1, 0.06 + i * 0.02, (rand(i + 9) - 0.5) * 0.1], tA.group).castShadow = false;
  const fizzA = bubbles(k, { parent: tA.group, r: 0.07, y0: 0.08, y1: 0.54, size: 0.018, n: 26 });
  const nailMat = kit.mat(0x8a9096, { metalness: 0.6, roughness: 0.45 });
  const nail = kit.mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.85, 8), nailMat, [0.02, 0.5, 0], tB.group);
  nail.rotation.z = 0.12;
  const cBlue = new THREE.Color(0x2f7fe0), cGreen = new THREE.Color(0x9ccf8f), cIron = new THREE.Color(0x8a9096), cCopper = new THREE.Color(0xb5652b);
  const pptMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), kit.mat(0x1f5fc8, { roughness: 0.8 }), 40);
  pptMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); pptMesh.frustumCulled = false; pptMesh.count = 0; pptMesh.renderOrder = 4;
  tC.group.add(pptMesh);
  const drop = kit.mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: 0xeef6ff, transparent: true, opacity: 0.85 }), [0, 1.3, 0], tC.group);
  drop.visible = false;
  // Magnesium ribbon held in tongs over a heat-proof mat.
  const ribbonSt = new THREE.Group();
  ribbonSt.position.set(1.0, 0, 0);
  S1.add(ribbonSt);
  kit.mesh(new THREE.BoxGeometry(0.8, 0.04, 0.7), kit.mat(0x7b8288), [0, 0.02, 0], ribbonSt).castShadow = false;
  const tongs = new THREE.Group();
  tongs.position.set(0.3, 0.75, 0); tongs.rotation.z = 0.6;
  ribbonSt.add(tongs);
  kit.mesh(new THREE.BoxGeometry(0.03, 0.6, 0.03), lm.steel, [0.02, 0.3, 0], tongs);
  kit.mesh(new THREE.BoxGeometry(0.03, 0.6, 0.03), lm.steel, [-0.02, 0.3, 0.03], tongs);
  const ribbon = kit.mesh(new THREE.BoxGeometry(0.035, 1, 0.008).translate(0, -0.5, 0), kit.mat(0xc9ced3, { metalness: 0.7, roughness: 0.3 }), [0, 0, 0], tongs);
  ribbon.scale.y = 0.45;
  const mgGlow = glow(tongs, 0.05);
  const ashPile = kit.mesh(new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0xf4f4f0), [-0.05, 0.04, 0], ribbonSt);
  const tagGas = label('Gas', v3(X.signs + TX[0], 1.12, 0), { cls: 'cool' });
  const tagCol = label('Colour change', v3(X.signs + TX[1], 1.42, 0));
  const tagPpt = label('Precipitate', v3(X.signs + TX[2], 1.12, 0), { cls: 'cool' });
  const tagHeat = label('Heat and light', v3(X.signs + 1.0, 1.42, 0), { cls: 'warm' });
  const sg = { a: null, b: null, c: null, d: null };
  function tickSigns(t) {
    const T = st.time;
    fizzA.tick(t, sg.a == null ? 0 : kit.clamp((T - sg.a) / 1.2, 0, 1) * 0.85);
    const pb = sg.b == null ? 0 : kit.clamp((T - sg.b) / 4, 0, 1);
    tB.mat.color.copy(cBlue).lerp(cGreen, pb);
    nailMat.color.copy(cIron).lerp(cCopper, kit.clamp(pb * 1.4, 0, 1));
    // Precipitate: a drop falls in, then blue solid clouds out and sinks to the bottom.
    let n = 0;
    if (sg.c != null) {
      const ct = T - sg.c;
      drop.visible = ct < 0.6; drop.position.y = 1.3 - Math.min(1, ct / 0.6) * (1.3 - tC.surface());
      const grow = kit.clamp((ct - 0.5) / 1.0, 0, 1), sink = kit.clamp((ct - 1.2) / 3.5, 0, 1);
      const A = pptMesh.instanceMatrix.array;
      for (let i = 0; i < 40 && grow > 0; i++) {
        if (rand(i * 5 + 1) > grow) continue;
        const a = rand(i) * 6.283, r = Math.sqrt(rand(i + 50)) * 0.085;
        const y0 = 0.25 + rand(i + 99) * 0.28, y1 = 0.05 + rand(i + 7) * 0.05;
        const y = kit.lerp(y0, y1, kit.ease(sink)) + Math.sin(t * 1.5 + i) * 0.006 * (1 - sink);
        const s = 0.012 + rand(i + 3) * 0.012, o = n * 16;
        A.fill(0, o, o + 16); A[o] = A[o + 5] = A[o + 10] = s; A[o + 15] = 1;
        A[o + 12] = Math.cos(a) * r; A[o + 13] = y; A[o + 14] = Math.sin(a) * r;
        n++;
      }
    } else drop.visible = false;
    pptMesh.count = n; pptMesh.instanceMatrix.needsUpdate = true;
    // Magnesium: burns from the tip for 3 s, leaving white ash.
    const dt0 = sg.d == null ? -1 : T - sg.d;
    const burning = dt0 >= 0 && dt0 < 3;
    ribbon.scale.y = dt0 < 0 ? 0.45 : Math.max(0.02, 0.45 * (1 - dt0 / 3));
    ribbon.visible = !(dt0 >= 3);
    mgGlow.visible = burning;
    if (burning) { mgGlow.position.y = -ribbon.scale.y; const f = 1 + 0.25 * Math.sin(t * 31) + 0.15 * Math.sin(t * 47); mgGlow.scale.setScalar(f); }
    ashPile.visible = dt0 > 1;
    ashPile.scale.setScalar(kit.clamp((dt0 - 1) / 2, 0.2, 1));
    return true;
  }

  // ---------- Steps 2 & 3: particle board ----------
  const S2 = station(X.board);
  const BY = 1.85, BZ = -0.75;   // molecule plane centre (y, z)
  const boardPanel = kit.mesh(new THREE.BoxGeometry(7.8, 3.7, 0.08), kit.mat(0x1d2d44, { roughness: 0.9 }), [0, BY + 0.1, -1.2], S2);
  boardPanel.castShadow = false;
  kit.mesh(new THREE.BoxGeometry(8.0, 3.9, 0.06), kit.mat(0x8d99ae), [0, BY + 0.1, -1.27], S2).castShadow = false;
  for (const x of [-3.6, 3.6]) kit.mesh(new THREE.BoxGeometry(0.12, BY - 1.75, 0.12), kit.mat(0x8d99ae), [x, (BY - 1.75) / 2, -1.2], S2);
  const eqSign = sign(k, { w: 4.4, h: 0.55, px: 512, py: 64, font: 'bold 40px sans-serif', parent: S2, text: '' });
  eqSign.position.set(0, BY + 1.55, -1.14);
  const atomGeo = new THREE.SphereGeometry(1, 20, 14);
  const atomMats = {}; for (const el of ['H', 'C', 'N', 'O']) atomMats[el] = new THREE.MeshStandardMaterial({ color: CPK[el], roughness: 0.35 });
  const stickMat = new THREE.MeshStandardMaterial({ color: 0xc9d1d9, roughness: 0.5 });
  const stickGeo = new THREE.CylinderGeometry(1, 1, 1, 10);

  // Step 2: six atoms that move from reactants to products. R = reactant, F = bonds broken, P = product spots.
  const rxAtoms = [
    { el: 'H', R: [-2.575, 0.6], F: [-1.3, 1.05], P: [1.425, 0.333 + 0.1] },
    { el: 'H', R: [-2.025, 0.6], F: [-0.25, 1.15], P: [2.375, 0.333 + 0.1] },
    { el: 'H', R: [-2.575, -0.6], F: [-1.35, -1.05], P: [1.425, -0.967 - 0.1] },
    { el: 'H', R: [-2.025, -0.6], F: [-0.2, -1.1], P: [2.375, -0.967 - 0.1] },
    { el: 'O', R: [-0.9, 0.36], F: [-0.55, 0.38], P: [1.9, 0.7 + 0.1] },
    { el: 'O', R: [-0.9, -0.36], F: [-0.65, -0.42], P: [1.9, -0.6 - 0.1] },
  ];
  const rxGroup = new THREE.Group();
  rxGroup.position.set(0, BY, BZ);
  S2.add(rxGroup);
  rxAtoms.forEach(a => { a.m = new THREE.Mesh(atomGeo, atomMats[a.el]); a.m.scale.setScalar(RAD[a.el]); rxGroup.add(a.m); });
  const rxBonds = [[0, 1, 1, 'r'], [2, 3, 1, 'r'], [4, 5, 2, 'r'], [4, 0, 1, 'p'], [4, 1, 1, 'p'], [5, 2, 1, 'p'], [5, 3, 1, 'p']];
  const rxSticks = [];
  rxBonds.forEach(([a, b, order, kind]) => {
    for (let s = 0; s < order; s++) {
      const m = new THREE.Mesh(stickGeo, stickMat);
      rxGroup.add(m);
      rxSticks.push({ m, a, b, off: order === 1 ? 0 : (s - (order - 1) / 2) * 0.13, kind });
    }
  });
  const rxArrow = arrow(k, { color: 0xdee2e6, len: 0.55, r: 0.035, parent: rxGroup });
  rxArrow.position.set(0.15, 0, 0); rxArrow.rotation.z = -Math.PI / 2;
  const tagReact = label('Reactants', v3(X.board - 1.7, BY - 1.35, BZ), { cls: 'cool' });
  const tagProd = label('Products', v3(X.board + 1.9, BY - 1.35, BZ), { cls: 'warm' });
  const rx = { p: 0, play: false, slider: null, msg: '' };
  function placeRx() {
    const p = rx.p;
    const f1 = kit.ease(kit.clamp((p - 0.08) / 0.37, 0, 1)), f2 = kit.ease(kit.clamp((p - 0.5) / 0.4, 0, 1));
    for (const a of rxAtoms) {
      const x = kit.lerp(kit.lerp(a.R[0], a.F[0], f1), a.P[0], f2), y = kit.lerp(kit.lerp(a.R[1], a.F[1], f1), a.P[1], f2);
      a.m.position.set(x, y, 0);
    }
    const sr = 1 - kit.clamp((p - 0.08) / 0.2, 0, 1), sp = kit.clamp((p - 0.78) / 0.14, 0, 1);
    for (const s of rxSticks) {
      const k2 = s.kind === 'r' ? sr : sp;
      s.m.visible = k2 > 0.02;
      if (!s.m.visible) continue;
      const A = rxAtoms[s.a].m.position, B = rxAtoms[s.b].m.position;
      tmp.subVectors(B, A); const len = tmp.length(); tmp.normalize();
      tmp2.set(-tmp.y, tmp.x, 0);
      s.m.position.addVectors(A, B).multiplyScalar(0.5).addScaledVector(tmp2, s.off);
      s.m.quaternion.setFromUnitVectors(up, tmp);
      const r = (s.off ? 0.045 : 0.065) * k2;
      s.m.scale.set(r, len, r);
    }
    const msg = p < 0.08 ? 'Reactants: <b>2 H₂ + 1 O₂</b> = 3 molecules'
      : p < 0.5 ? 'Bonds <b>breaking</b>: the atoms come apart'
      : p < 0.92 ? 'Atoms <b>joining</b> in new ways'
      : 'Products: <b>2 H₂O</b> = 2 molecules';
    if (msg !== rx.msg) { rx.msg = msg; ui.readout(`${msg}<br>Hydrogen atoms: <b>4</b> before, <b>4</b> after · Oxygen atoms: <b>2</b> before, <b>2</b> after`); }
  }

  // Step 3: balancing game. Each species is one InstancedMesh of a merged molecule (atom colours baked in).
  const molMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 });
  const SCALE = 0.72;
  function molGeo(def) {
    const parts = [];
    const colorize = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const P = def.atoms.map(([, x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(SCALE));
    def.atoms.forEach(([el], i) => parts.push(colorize(new THREE.SphereGeometry(RAD[el] * SCALE, 16, 12).translate(P[i].x, P[i].y, P[i].z), CPK[el])));
    const d = new THREE.Vector3(), side = new THREE.Vector3();
    for (const [a, b, order] of def.bonds) {
      d.subVectors(P[b], P[a]); const len = d.length(); d.normalize();
      side.set(0, 0, 1).cross(d); if (side.lengthSq() < 1e-6) side.set(0, 1, 0); side.normalize();
      for (let s = 0; s < order; s++) {
        const off = order === 1 ? 0 : (s - (order - 1) / 2) * 0.12 * SCALE;
        const g = new THREE.CylinderGeometry((order === 1 ? 0.065 : 0.045) * SCALE, (order === 1 ? 0.065 : 0.045) * SCALE, len, 8);
        g.applyQuaternion(qa.setFromUnitVectors(up, d));
        g.translate((P[a].x + P[b].x) / 2 + side.x * off, (P[a].y + P[b].y) / 2 + side.y * off, (P[a].z + P[b].z) / 2 + side.z * off);
        parts.push(colorize(g, 0xc9d1d9));
      }
    }
    return mergeGeometries(parts);
  }
  const balGroup = new THREE.Group();
  balGroup.position.set(0, BY, BZ);
  S2.add(balGroup);
  const pools = {};
  for (const [key, def] of Object.entries(MOLS)) {
    const m = new THREE.InstancedMesh(molGeo(def), molMat, MAXC);
    m.count = 0; m.frustumCulled = false; m.castShadow = false;
    balGroup.add(m);
    pools[key] = m;
  }
  const balArrow = arrow(k, { color: 0xadb5bd, len: 0.5, r: 0.04, parent: balGroup });
  balArrow.rotation.z = -Math.PI / 2;
  const colTags = [0, 1, 2, 3].map(() => label('', v3(0, 0, 0)));
  const bal = { eq: 1, coef: EQS.map(e => e.ans.map(() => 1)), xs: [], row: null };
  const dummy = new THREE.Object3D();
  function atomCount(keys, coefs) {
    const c = {};
    keys.forEach((key, i) => MOLS[key].atoms.forEach(([el]) => { c[el] = (c[el] || 0) + coefs[i]; }));
    return c;
  }
  function drawBalance() {
    const e = EQS[bal.eq], cf = bal.coef[bal.eq], keys = [...e.left, ...e.right];
    for (const m of Object.values(pools)) m.count = 0;
    const nl = e.left.length, nr = e.right.length;
    const xs = nl + nr === 4 ? [-2.75, -1.3, 1.25, 2.8] : [-2.3, -0.85, 1.6];
    const ax = (xs[nl - 1] + xs[nl]) / 2;
    balArrow.position.set(ax - 0.3, -0.1, 0);
    keys.forEach((key, i) => {
      const m = pools[key], c = cf[i];
      for (let j = 0; j < c; j++) {
        dummy.position.set(xs[i], -0.15 + (j - (c - 1) / 2) * 0.7, 0);
        dummy.rotation.set(0.25, -0.35 + j * 0.2, 0);
        dummy.updateMatrix();
        m.setMatrixAt(j, dummy.matrix);
      }
      m.count = c; m.instanceMatrix.needsUpdate = true;
      colTags[i].at.set(X.board + xs[i], BY - 1.55, BZ);
      colTags[i].text = `${c} × ${MOLS[key].f}`;
    });
    colTags.forEach((t, i) => t.show(st.step === 3 && i < keys.length));
    const L = atomCount(e.left, cf.slice(0, nl)), R = atomCount(e.right, cf.slice(nl));
    const els = Object.keys({ ...L, ...R });
    const ok = els.every(el => L[el] === R[el]);
    const co = (c, f) => (c === 1 ? '' : c) + MOLS[f].f;
    const text = `${e.left.map((f, i) => co(cf[i], f)).join(' + ')} → ${e.right.map((f, i) => co(cf[nl + i], f)).join(' + ')}`;
    eqSign.setText(text, { bg: ok ? '#d3f9d8' : '#ffffff', color: ok ? '#1b7a3a' : '#1d2b36' });
    balArrow.mat.color.set(ok ? 0x40c057 : 0xadb5bd);
    const side = c => els.map(el => `${el} <b>${c[el] || 0}</b>`).join(' · ');
    if (!st.quiz) ui.readout(`Left: ${side(L)} &nbsp;|&nbsp; Right: ${side(R)}<br>${ok ? '<b style="color:#1e9e55">Balanced!</b> Same atoms on both sides.' : 'Not balanced yet: the atom counts differ.'}`);
  }
  function balanceButtons() {
    bal.row?.remove();
    const e = EQS[bal.eq], keys = [...e.left, ...e.right];
    const items = [];
    keys.forEach((key, i) => {
      items.push({ label: `− ${MOLS[key].f}`, onClick: () => change(i, -1) });
      items.push({ label: `+ ${MOLS[key].f}`, onClick: () => change(i, 1) });
    });
    const row = ui.buttons(items);
    row.style.display = 'grid'; row.style.gridTemplateColumns = 'repeat(4, 1fr)';
    row.querySelectorAll('.btn').forEach(b => { b.style.padding = '8px 4px'; });
    bal.row = row;
    function change(i, d) { const cf = bal.coef[bal.eq]; cf[i] = kit.clamp(cf[i] + d, 1, MAXC); row.select(-1); drawBalance(); }
  }

  // ---------- Step 4: closed vs open flask on a balance ----------
  const S4 = station(X.flask);
  const bal4 = balance(k, { parent: S4, w: 1.9, d: 1.3 });
  const fl = flask(k, { parent: S4, pos: [0, bal4.top + 0.01, -0.05], r: 0.5, h: 0.85, neckR: 0.13, neckH: 0.42, fill: 0.3, color: 0xeef4f2, opacity: 0.5 });
  const flTop = bal4.top + 0.01 + fl.top;
  const bung = stopper(k, { parent: S4, nr: 0.13, y: flTop });
  const vial = testTube(k, { parent: fl.group, pos: [0.17, 0.02, 0], r: 0.06, h: 0.42, fill: 0.35, color: 0xffffff, opacity: 0.95 });
  const fizzF = bubbles(k, { parent: fl.group, r: 0.35, y0: 0.04, y1: fl.surface, size: 0.022, n: 40 });
  const GN = 30;
  const gasMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), kit.mat(0x495057, { roughness: 0.5 }), GN);
  gasMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gasMesh.frustumCulled = false; gasMesh.count = 0; gasMesh.castShadow = false;
  fl.group.add(gasMesh);
  const flaskTag = label('Closed flask', v3(X.flask, flTop + 0.35, 0));
  const gasTag = label('Carbon dioxide', v3(X.flask + 0.55, flTop + 0.05, 0), { cls: 'cool' });
  const fx = { closed: true, start: null, msg: '' };
  const prog = tt => (tt <= 0 ? 0 : 1 - Math.exp(-tt / 2.2));
  function resetFlask() {
    fx.start = null;
    bung.position.set(0, flTop - 0.06, -0.05); bung.rotation.set(0, 0, 0);
    if (!fx.closed) { bung.position.set(0.68, 0.22, 0.4); bung.rotation.set(Math.PI / 2, 0, 0); }
    vial.group.rotation.z = 0; vial.setFill(0.35);
    flaskTag.text = fx.closed ? 'Closed flask' : 'Open flask';
  }
  function tickFlask(t) {
    const tt = fx.start == null ? 0 : st.time - fx.start;
    const p = prog(tt - 0.6);
    const tip = kit.clamp(tt / 0.6, 0, 1);
    vial.group.rotation.z = 1.25 * kit.ease(tip);
    vial.setFill(0.35 * (1 - kit.clamp((tt - 0.4) / 0.5, 0, 1)));
    fizzF.tick(t, fx.start == null ? 0 : kit.clamp((1 - p) * 1.3, 0, 1) * kit.clamp(tt - 0.5, 0, 1));
    // Gas particles: in the closed flask they stay in the space above the liquid; in the open one they rise out and leave.
    const A = gasMesh.instanceMatrix.array, ys = fl.surface + 0.06, yt = fl.top - 0.05;
    let n = 0;
    for (let i = 0; i < GN; i++) {
      const born = (i + 0.5) / GN;
      if (p < born * 0.97) continue;
      let x, y, z, s = 0.03;
      if (fx.closed) {
        y = kit.lerp(ys, yt, 0.5 + 0.5 * Math.sin(t * (0.6 + rand(i) * 0.9) + i * 2.1));
        const rr = (y < fl.h ? fl.r + (fl.neckR - fl.r) * (y / fl.h) : fl.neckR) * 0.75 * Math.sqrt(rand(i + 40));
        const a = rand(i + 80) * 6.283 + t * (0.4 + rand(i + 3));
        x = Math.cos(a) * rr; z = Math.sin(a) * rr;
      } else {
        const ts = -2.2 * Math.log(1 - born * 0.97) + 0.6;   // time this particle was made
        const age = tt - ts;
        if (age > 3.2) continue;
        y = ys + age * 0.55;
        const spread = Math.max(0, y - fl.top) * 0.6, a = rand(i + 80) * 6.283;
        const rr = (y < fl.h ? (fl.r + (fl.neckR - fl.r) * (y / fl.h)) * 0.6 : fl.neckR * 0.6) * Math.sqrt(rand(i + 40));
        x = Math.cos(a) * (rr + spread); z = Math.sin(a) * (rr + spread);
        s = 0.03 * kit.clamp((3.2 - age) / 0.8, 0, 1);
      }
      const o = n * 16;
      A.fill(0, o, o + 16); A[o] = A[o + 5] = A[o + 10] = s; A[o + 15] = 1;
      A[o + 12] = x; A[o + 13] = y; A[o + 14] = z;
      n++;
    }
    gasMesh.count = n; gasMesh.instanceMatrix.needsUpdate = true;
    const lost = fx.closed ? 0 : CO2_MASS * prog(tt - 0.6 - 1.4);
    const mass = FLASK_MASS - lost;
    bal4.set(mass);
    const msg = `Mass at start: <b>${FLASK_MASS.toFixed(2)} g</b> · Mass now: <b>${mass.toFixed(2)} g</b> · Change: <b>${lost > 0.004 ? '−' + lost.toFixed(2) : '0.00'} g</b><br>${fx.closed ? 'Closed flask: the gas is trapped, so its mass stays on the balance.' : 'Open flask: carbon dioxide escapes into the air.'}`;
    if (msg !== fx.msg) { fx.msg = msg; ui.readout(msg); }
    return fx.start != null && tt < 9;
  }

  // ---------- Step 5: burning magnesium in a crucible ----------
  const S5 = station(X.mg);
  const bal5 = balance(k, { parent: S5, pos: [-0.55, 0, 0], w: 1.3, d: 1.1 });
  // Tripod with a pipe-clay triangle and a Bunsen burner.
  const tripod = new THREE.Group();
  tripod.position.set(0.75, 0, 0);
  S5.add(tripod);
  const TH = 0.95;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + 0.3, leg = kit.mesh(new THREE.CylinderGeometry(0.018, 0.018, TH, 6), kit.mat(0x343a40), [Math.cos(a) * 0.26, TH / 2, Math.sin(a) * 0.26], tripod);
    leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
  }
  kit.mesh(new THREE.TorusGeometry(0.3, 0.02, 6, 24).rotateX(Math.PI / 2), kit.mat(0x343a40), [0, TH, 0], tripod);
  // Pipe-clay triangle that holds the crucible on the tripod ring.
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094, bar = kit.mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 6).rotateZ(Math.PI / 2), kit.mat(0xe9dccb), [Math.cos(a) * 0.16, TH + 0.02, Math.sin(a) * 0.16], tripod);
    bar.rotation.y = -a + Math.PI / 2;
  }
  kit.mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.04, 24), kit.mat(0x343a40), [0, 0.02, 0], tripod);
  kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 12), lm.steel, [0, 0.22, 0], tripod);
  const blueOuter = fMat(0x4dabf7, 0.6), blueInner = fMat(0x91f5ff, 0.8);
  const bunsen = flame(tripod, 0.36, blueOuter, blueInner);
  bunsen.position.y = 0.42;
  const crucible = new THREE.Group();
  S5.add(crucible);
  const crProf = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.14, 0), new THREE.Vector2(0.24, 0.26), new THREE.Vector2(0.255, 0.27), new THREE.Vector2(0.22, 0.27), new THREE.Vector2(0.12, 0.03), new THREE.Vector2(0.001, 0.03)];
  kit.mesh(new THREE.LatheGeometry(crProf, 28), kit.mat(0xfaf7f0, { roughness: 0.35, side: THREE.DoubleSide, emissive: 0x3a3a36 }), [0, 0, 0], crucible);
  const helix = new THREE.Curve();
  helix.getPoint = (u, out = new THREE.Vector3()) => out.set(Math.cos(u * 6.283 * 3.5) * 0.11, 0.06 + u * 0.12, Math.sin(u * 6.283 * 3.5) * 0.11);
  const coil = kit.mesh(new THREE.TubeGeometry(helix, 80, 0.012, 4, false), kit.mat(0xc9ced3, { metalness: 0.7, roughness: 0.3 }), [0, 0, 0], crucible);
  const mgo = kit.mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0xfbfbf8, { roughness: 0.95 }), [0, 0.04, 0], crucible);
  mgo.scale.y = 0.45;
  const mgGlow5 = glow(crucible, 0.08);
  mgGlow5.position.y = 0.3;
  const mgTag = label('Magnesium', v3(X.mg - 0.55, 0.9, 0));
  const mg = { m: 2.4, start: null, slider: null, msg: '' };
  const onBalance = v3(-0.55, bal5.top + 0.005, -0.05), onTripod = v3(0.75, TH - 0.05, 0);
  function resetMg() { mg.start = null; coil.visible = true; mgo.visible = false; mgGlow5.visible = false; bunsen.level = 0; bunsen.visible = false; crucible.position.copy(onBalance); mgTag.text = 'Magnesium'; mg.oxide = false; coil.scale.setScalar(0.7 + 0.3 * Math.sqrt(mg.m / 4.8)); }
  function tickMg(t) {
    const bt = mg.start == null ? -1 : st.time - mg.start;
    let away = false;
    if (bt >= 0) {
      // 0–0.8 s move to the tripod, 0.8–3.4 s heat and burn, 3.4–4.2 s back to the balance.
      const go = kit.ease(kit.clamp(bt / 0.8, 0, 1)), back = kit.ease(kit.clamp((bt - 3.4) / 0.8, 0, 1));
      const f = go * (1 - back);
      crucible.position.lerpVectors(onBalance, onTripod, f);
      crucible.position.y += Math.sin(Math.PI * (bt < 2 ? go : back)) * 0.35;
      away = f > 0.02;
      bunsen.level = kit.clamp((bt - 0.7) * 4, 0, 1) * kit.clamp((3.3 - bt) * 4, 0, 1);
      bunsen.tick(t);
      const burn = kit.clamp((bt - 1.1) / 1.8, 0, 1);
      mgGlow5.visible = burn > 0 && burn < 1;
      if (mgGlow5.visible) mgGlow5.scale.setScalar(0.8 + 0.3 * Math.sin(t * 29) + 0.2 * Math.sin(t * 41));
      coil.visible = burn < 0.7;
      mgo.visible = burn > 0.3;
      const ms = Math.cbrt(mg.m / 2.4) * 0.8;
      mgo.scale.set(ms, ms * 0.45, ms);
      if (burn >= 1 && !mg.oxide) { mg.oxide = true; mgTag.text = 'Magnesium oxide'; }
    }
    const done = bt >= 4.2;
    const before = CRUCIBLE + mg.m, after = CRUCIBLE + mg.m * 40 / 24;
    bal5.set(away ? 0 : done ? after : before);
    mgTag.at.set(X.mg + crucible.position.x, crucible.position.y + 0.55, 0);
    const o2 = mg.m * 16 / 24, mgoM = mg.m * 40 / 24;
    const msg = done
      ? `Before: <b>${before.toFixed(2)} g</b> → After: <b>${after.toFixed(2)} g</b> (crucible ${CRUCIBLE.toFixed(2)} g)<br>${mg.m.toFixed(1)} g magnesium + <b>${o2.toFixed(1)} g oxygen</b> = <b>${mgoM.toFixed(1)} g</b> magnesium oxide`
      : `Crucible + magnesium: <b>${before.toFixed(2)} g</b><br>Prediction: ${mg.m.toFixed(1)} g magnesium + ${o2.toFixed(1)} g oxygen → <b>${mgoM.toFixed(1)} g</b> magnesium oxide`;
    if (msg !== mg.msg) { mg.msg = msg; ui.readout(msg); }
    return bt >= 0 && bt < 4.4;
  }

  // ---------- Step 6: exothermic and endothermic ----------
  const S6 = station(X.heat);
  const bk = beaker(k, { parent: S6, r: 0.45, h: 0.85, fill: 0.5, color: 0xe7f3f8, opacity: 0.55 });
  const thermo = thermometer(k, { parent: S6, pos: [0.12, 0.1, 0.05], h: 1.5, min: 0, max: 40 });
  thermo.group.rotation.z = -0.08;
  const fizz6 = bubbles(k, { parent: bk.group, r: 0.36, y0: 0.05, y1: 0.42, size: 0.02, n: 36 });
  const heatArrows = [];
  for (let i = 0; i < 6; i++) {
    const a = arrow(k, { color: 0xe8590c, len: 0.32, r: 0.03, parent: S6 });
    a.theta = (i / 6) * Math.PI * 2 + 0.3;
    heatArrows.push(a);
  }
  const heatTag = label('Heat out', v3(X.heat - 0.95, 1.05, 0), { cls: 'warm' });
  const hx = { mode: 0, start: null, T: 20, msg: '' };
  const TARGET = [27, 14];
  function setHeatMode(mode) {
    hx.mode = mode; hx.start = st.time; hx.T = 20;
    for (const a of heatArrows) {
      const dir = tmp.set(Math.cos(a.theta), 0, Math.sin(a.theta));
      if (mode === 1) dir.negate();
      a.quaternion.setFromUnitVectors(up, dir);
      a.mat.color.set(mode === 0 ? 0xe8590c : 0x1c7ed6);
    }
    heatTag.text = mode === 0 ? 'Heat out' : 'Heat in';
    heatTag.el.className = 'lab ' + (mode === 0 ? 'warm' : 'cool');
  }
  function tickHeat(t, dt) {
    const going = hx.start != null;
    const tt = going ? st.time - hx.start : 0;
    if (going) hx.T = 20 + (TARGET[hx.mode] - 20) * (1 - Math.exp(-tt / 1.6));
    thermo.set(hx.T);
    fizz6.tick(t, going && hx.mode === 1 ? kit.clamp(1.2 - tt * 0.15, 0, 1) : 0);
    const show = going && tt > 0.2;
    heatArrows.forEach((a, i) => {
      a.visible = show;
      if (!show) return;
      const ph = (t * 0.7 + i * 0.37) % 1, r = hx.mode === 0 ? 0.62 + ph * 0.35 : 1.3 - ph * 0.35;
      a.position.set(Math.cos(a.theta) * r, 0.35 + (i % 2) * 0.2, Math.sin(a.theta) * r);
      a.mat.opacity = Math.sin(Math.PI * ph);
    });
    heatTag.show(show && st.step === 6);
    const d = hx.T - 20;
    const msg = `Start: <b>20.0 °C</b> · Now: <b>${hx.T.toFixed(1)} °C</b> · ΔT = <b>${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} °C</b><br>${!going ? 'Choose a reaction.' : hx.mode === 0 ? '<b>Exothermic</b>: heat is given out, so the mixture warms up.' : '<b>Endothermic</b>: heat is taken in, so the mixture cools down.'}`;
    if (msg !== hx.msg) { hx.msg = msg; ui.readout(msg); }
    return going;
  }
  heatArrows.forEach(a => { a.mat.transparent = true; a.visible = false; });

  // ---------- Steps ----------
  const groups = [S0, S1, S2, S2, S4, S5, S6];
  const allTags = [iceTag, paperTag, tagGas, tagCol, tagPpt, tagHeat, tagReact, tagProd, flaskTag, gasTag, mgTag, heatTag, ...colTags];
  const st = { step: 0, time: 0, quiz: false, plan: [], auto: false };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.auto = false;
      [S0, S1, S2, S4, S5, S6].forEach(g => { g.visible = isQuiz || groups[i] === g; });
      allTags.forEach(t => t.show(false));
      rxGroup.visible = i === 2; balGroup.visible = i === 3 || isQuiz;
      if (i === 0) {
        view({ radius: 1.35, width: 1.55, yaw: 0.2, pitch: 0.42, target: [X.change, 0.3, 0] });
        resetChange(); iceTag.show(true); paperTag.show(true);
        st.plan = [[0.3, () => { ch.melt = st.time; }], [0.9, () => { ch.burn = st.time; }]];
        ui.buttons([{ label: 'Melt the ice', onClick: () => { ch.melt = st.time; } }, { label: 'Burn the paper', onClick: () => { ch.burn = st.time; } }, { label: 'Reset', onClick: () => { st.plan = []; resetChange(); } }]);
        ui.readout('Melting: ice → liquid water, still H₂O (<b>physical change</b>).<br>Burning: paper + oxygen → ash, smoke, carbon dioxide and water vapour (<b>chemical change</b>).');
      }
      if (i === 1) {
        view({ radius: 1.4, width: 1.75, yaw: 0.12, pitch: 0.3, target: [X.signs - 0.3, 0.6, 0] });
        [tagGas, tagCol, tagPpt, tagHeat].forEach(t => t.show(true));
        sg.a = sg.b = sg.c = sg.d = null;
        st.plan = [[0.2, () => { sg.a = st.time; }], [0.5, () => { sg.b = st.time; }], [0.8, () => { sg.c = st.time; }], [1.1, () => { sg.d = st.time; }]];
        ui.buttons([
          { label: 'Gas', onClick: () => { sg.a = st.time; } },
          { label: 'Colour change', onClick: () => { sg.b = st.time; } },
          { label: 'Precipitate', onClick: () => { sg.c = st.time; } },
          { label: 'Heat and light', onClick: () => { sg.d = st.time; } },
        ]);
        ui.readout('Zinc + hydrochloric acid → zinc chloride + <b>hydrogen</b><br>Iron + copper(II) sulfate → iron(II) sulfate + <b>copper</b><br>Copper(II) sulfate + sodium hydroxide → <b>copper(II) hydroxide</b> (blue solid) + sodium sulfate<br>Magnesium + oxygen → magnesium oxide, with <b>heat and light</b>');
      }
      if (i === 2) {
        view({ radius: 1.7, width: 3.1, yaw: 0, pitch: 0.06, target: [X.board, BY, BZ] });
        tagReact.show(true); tagProd.show(true);
        eqSign.setText('2H₂ + O₂ → 2H₂O', { bg: '#ffffff', color: '#1d2b36' });
        rx.p = 0; rx.play = true; rx.msg = ''; st.auto = true;
        rx.slider = ui.slider({ label: 'Reaction progress', min: 0, max: 100, step: 1, value: 0, unit: '%', onInput: v => { st.auto = false; rx.play = false; rx.p = v / 100; placeRx(); } });
        ui.buttons([{ label: 'Play', onClick: () => { st.auto = false; if (rx.p >= 1) rx.p = 0; rx.play = true; } }, { label: 'Back to start', onClick: () => { st.auto = false; rx.play = false; rx.p = 0; rx.slider.set(0); placeRx(); } }]);
        placeRx();
      }
      if (i === 3) {
        view({ radius: 1.8, width: 3.7, yaw: 0, pitch: 0.06, target: [X.board, BY, BZ] });
        const eqRow = ui.buttons(EQS.map((e, j) => ({ label: e.name, on: j === bal.eq, onClick: () => { bal.eq = j; balanceButtons(); drawBalance(); } })));
        eqRow.select(bal.eq);
        balanceButtons();
        drawBalance();
      }
      if (i === 4) {
        view({ radius: 1.2, yaw: -0.15, pitch: 0.3, target: [X.flask, 0.95, 0] });
        fx.closed = true; resetFlask(); fx.msg = '';
        flaskTag.show(true); gasTag.show(true);
        st.plan = [[0.5, () => { fx.start = st.time; }]];
        ui.toggle({ label: 'Stopper in (closed flask)', value: true, onChange: v => { st.plan = []; fx.closed = v; resetFlask(); } });
        ui.buttons([{ label: 'Start the reaction', onClick: () => { st.plan = []; resetFlask(); fx.start = st.time; } }, { label: 'Reset', onClick: () => { st.plan = []; resetFlask(); } }]);
      }
      if (i === 5) {
        view({ radius: 1.15, width: 1.45, yaw: 0.1, pitch: 0.3, target: [X.mg + 0.1, 0.6, 0] });
        mg.msg = ''; resetMg(); mgTag.show(true);
        st.plan = [[0.4, () => { mg.start = st.time; }]];
        mg.slider = ui.slider({ label: 'Magnesium', min: 0.6, max: 4.8, step: 0.6, value: mg.m, unit: ' g', format: v => v.toFixed(1), onInput: v => { st.plan = []; mg.m = v; resetMg(); } });
        ui.buttons([{ label: 'Burn it', onClick: () => { st.plan = []; resetMg(); mg.start = st.time; } }, { label: 'Reset', onClick: () => { st.plan = []; resetMg(); } }]);
      }
      if (i === 6) {
        view({ radius: 1.25, yaw: 0.15, pitch: 0.3, target: [X.heat, 0.75, 0] });
        hx.start = null; hx.T = 20; hx.msg = '';
        setHeatMode(0); hx.start = null;
        st.plan = [[0.4, () => setHeatMode(0)]];
        ui.buttons([{ label: 'Acid + alkali', onClick: () => { st.plan = []; setHeatMode(0); } }, { label: 'Citric acid + baking soda', onClick: () => { st.plan = []; setHeatMode(1); } }]);
      }
      if (isQuiz) {
        view({ radius: 2.2, width: 4.2, yaw: -0.15, pitch: 0.18, target: [X.board, 1.5, -0.4] });
        bal.eq = 1; bal.coef[1] = [1, 2, 1, 2]; drawBalance(); colTags.forEach(t => t.show(false));
      }
    },

    update(dt, t) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step;
      if (s === 0) return tickChange(t) || st.plan.length > 0;
      if (s === 1) return tickSigns(t);
      if (s === 2) {
        if (rx.play) {
          rx.p = Math.min(1, rx.p + dt / 4.5);
          if (rx.p >= 1) { rx.play = false; if (st.auto) st.plan = [[st.time + 1.8, () => { if (st.auto) { rx.p = 0; rx.play = true; } }]]; }
          rx.slider.set(Math.round(rx.p * 100));
          placeRx();
        }
        return rx.play || st.plan.length > 0;
      }
      if (s === 4) return tickFlask(t) || st.plan.length > 0;
      if (s === 5) return tickMg(t) || st.plan.length > 0;
      if (s === 6) return tickHeat(t, dt) || st.plan.length > 0;
      return false;
    },
  };
}
