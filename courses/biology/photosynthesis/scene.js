// Photosynthesis: a plant in cut-away soil with light, carbon dioxide and water going in and glucose and oxygen
// coming out; a magnified leaf slice (epidermis, palisade, spongy layer, stomata, vein) with gases diffusing
// through stomata that open and close; a chloroplast that only works in the light; a pondweed bubble experiment
// (lamp distance and carbon dioxide as limiting factors, model values); and where the glucose goes.
import { partSet } from '../_shared/cells.js';
import { leafGeometry } from '../_shared/leaf.js';
import { stream, soilPlant, pondweed, glucoseGeometry, rand, SUBST } from '../_shared/plants.js';

const PL = [0, 1.1, 0];     // plant (soil block sits on the ground)
const LS = [11, 1.9, 0];    // leaf slice
const CH = [22, 1.8, 0];    // chloroplast
const PW = [32, 0, 0];      // pondweed bench (beaker at local x = BK)
const GL = [44, 1.1, 0];    // plant with a tuber
const BK = 0.9, WATER_TOP = 1.32;
const CO2_LEVELS = [['Low', 18], ['Normal', 40], ['High', 75]]; // model: highest bubble rate each CO2 level allows
const LEAF_PARTS = [
  ['epidermis', 'Epidermis', 'a thin, clear skin on the top and bottom of the leaf. Light passes straight through it.'],
  ['palisade', 'Palisade cells', 'tall cells just under the top skin, <b>packed with chloroplasts</b>. Most photosynthesis happens here.'],
  ['spongy', 'Spongy layer', 'round cells with <b>air spaces</b> between them, so gases can move through the leaf.'],
  ['stomata', 'Stomata', 'tiny pores in the lower skin. Two <b>guard cells</b> open and close each one.'],
  ['vein', 'Vein', '<b>xylem</b> tubes bring water in; <b>phloem</b> tubes carry sugar away to the rest of the plant.'],
];
const USES = [
  ['Energy', 'Glucose is broken down in <b>respiration</b> in every living cell, to release energy for living.'],
  ['Growth', 'Glucose is turned into <b>cellulose</b> to build new cell walls, so the plant can grow new leaves and stems.'],
  ['Starch store', 'Glucose is changed into <b>starch</b> and stored, here in a tuber (like a potato). Starch is also stored in leaves, seeds and roots.'],
  ['Iodine test', 'Both leaves were boiled and soaked in hot ethanol to remove the green chlorophyll. Then iodine solution goes on: <b>blue-black means starch</b>, orange-brown means no starch.'],
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xcfe8c4, sky: 0xdff1ff, radius: 70 });
  const sunLight = kit.lights(scene, { sun: [4, 10, 6] });
  const sky = new THREE.Color(0xdff1ff), dusk = new THREE.Color(0x24304d);
  const v3 = (a, dx = 0, dy = 0, dz = 0) => new THREE.Vector3(a[0] + dx, a[1] + dy, a[2] + dz);
  const group = p => { const g = new THREE.Group(); g.position.set(...p); scene.add(g); return g; };
  const all = [];
  const S = (parent, o) => { const s = stream(THREE, parent, o); all.push(s); return s; };
  const gluGeo = glucoseGeometry(THREE, 0.08);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.25, depthWrite: false });
  const makeSun = (parent, pos, r) => {
    const s = kit.mesh(new THREE.SphereGeometry(r, 24, 16), sunMat, pos, parent);
    s.castShadow = s.receiveShadow = false;
    s.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.45, 24, 16), glowMat));
    return s;
  };

  // ================= Step 0: the whole plant =================
  const plantA = soilPlant(THREE, kit, { h: 2.2, pairs: 3 });
  const gA = group(PL); gA.add(plantA.g);
  const SUN_A = [-2.9, 3.4, -1.2];
  makeSun(gA, SUN_A, 0.42);
  const T = plantA.leafTips, fz = plantA.soilFront;
  const arr = v => [v.x, v.y, v.z];
  const sA = {
    light: S(gA, { points: [SUN_A, [-1.6, 3.0, -0.5], arr(T[4])], count: 8, color: SUBST.energy, radius: 0.045, speed: 0.55, emissive: 0.8 }),
    co2: S(gA, { points: [[-2.2, 1.7, 0.7], [-1.3, 1.5, 0.5], arr(T[2])], count: 7, color: SUBST.co2, radius: 0.06, speed: 0.25 }),
    water: S(gA, { points: [arr(plantA.rootTip), [0.0, -0.45, fz], [0, -0.05, 0.12], [0, 0.8, 0.06], [0, 1.6, 0.06], arr(T[3])], count: 10, color: SUBST.water, radius: 0.05, speed: 0.18 }),
    o2: S(gA, { points: [arr(T[3]), [1.3, 2.0, 0.5], [2.2, 2.5, 0.7]], count: 7, color: SUBST.o2, radius: 0.06, speed: 0.25 }),
    glu: S(gA, { points: [arr(T[2]), [-0.05, 1.3, 0.08], [0, 0.35, 0.08]], count: 5, color: SUBST.glucose, geo: gluGeo, speed: 0.2, spin: 1 }),
  };
  const tA = {
    light: label('Light', v3(PL, -1.75, 3.15, -0.5), { cls: 'warm' }),
    co2: label('Carbon dioxide', v3(PL, -2.1, 1.85, 0.7), { cls: 'cool' }),
    water: label('Water', v3(PL, 0.35, -0.55, fz), { cls: 'cool' }),
    o2: label('Oxygen', v3(PL, 2.1, 2.65, 0.7), { cls: 'cool' }),
    glu: label('Glucose', v3(PL, 0.35, 0.75, 0.1), { cls: 'warm' }),
  };

  // ================= Step 1-2: leaf slice =================
  const LP = partSet(THREE, kit);
  const gL = group(LS);
  const W = 4, D = 1.6;
  const epiMat = LP.mat('epidermis', 0xe9f6d6, { transparent: true, opacity: 0.7, roughness: 0.3 });
  const tileGeo = new THREE.BoxGeometry(0.48, 0.12, 0.51);
  const STOMA_X = [-1.25, 1.25], STOMA_Z = 0.53;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) {
    const x = -1.75 + i * 0.5, z = -0.53 + j * 0.53;
    kit.mesh(tileGeo, epiMat, [x, 0.74, z], gL);
    if (!(j === 2 && STOMA_X.includes(x))) kit.mesh(tileGeo, epiMat, [x, -0.66, z], gL);
  }
  // Stomata: two guard cells each, with thin epidermis strips beside them.
  const guardMat = LP.mat('stomata', 0x5fb04a, { roughness: 0.5 });
  const guardGeo = new THREE.CapsuleGeometry(0.07, 0.28, 4, 10).rotateX(Math.PI / 2);
  const guards = [];
  for (const sx of STOMA_X) {
    for (const s of [-1, 1]) { const g = kit.mesh(guardGeo, guardMat, [sx + s * 0.13, -0.66, STOMA_Z], gL); g.userData.side = s; g.userData.cx = sx; g.scale.x = 1; guards.push(g); }
    for (const s of [-1, 1]) kit.mesh(new THREE.BoxGeometry(0.07, 0.12, 0.51), epiMat, [sx + s * 0.215, -0.66, STOMA_Z], gL);
  }
  // Palisade cells (instanced) with chloroplasts.
  const palMat = LP.mat('palisade', 0xa7d97a, { transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.4 });
  const pal = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.125, 0.34, 3, 10), palMat, 13 * 5);
  pal.renderOrder = 2;
  const chlMat = kit.mat(0x2e8b3a, { roughness: 0.5 }), chlGeo = new THREE.SphereGeometry(1, 6, 4);
  const chlPal = new THREE.InstancedMesh(chlGeo, chlMat, 13 * 5 * 6);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), p4 = new THREE.Vector3(), s4 = new THREE.Vector3(), e4 = new THREE.Euler();
  let ci = 0;
  for (let i = 0; i < 13; i++) for (let j = 0; j < 5; j++) {
    const x = -1.8 + i * 0.3, z = -0.6 + j * 0.3, k = i * 5 + j;
    m4.makeTranslation(x, 0.37, z); pal.setMatrixAt(k, m4);
    for (let c = 0; c < 6; c++) {
      const a = c * 1.047 + rand(k) * 2;
      p4.set(x + Math.cos(a) * 0.085, 0.37 + (c - 2.5) * 0.075, z + Math.sin(a) * 0.085);
      e4.set(rand(k + c) * 3, a, 0); q4.setFromEuler(e4); s4.set(0.045, 0.028, 0.034);
      m4.compose(p4, q4, s4); chlPal.setMatrixAt(ci++, m4);
    }
  }
  gL.add(pal, chlPal);
  // Spongy cells: rounder, with air spaces; none in the vein or just above the stomata.
  const VEIN_X = 0.55;
  const spMat = LP.mat('spongy', 0xc9e8a4, { transparent: true, opacity: 0.6, depthWrite: false, roughness: 0.4 });
  const spots = [];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) for (let l = 0; l < 2; l++) {
    const x = -1.8 + i * 0.45 + (rand(i * 7 + j * 3 + l) - 0.5) * 0.12, z = -0.55 + j * 0.55 + (rand(i + j * 11 + l * 5) - 0.5) * 0.1, y = l ? -0.42 : -0.12;
    if (Math.abs(x - VEIN_X) < 0.42 && y > -0.36) continue;
    if (l && j === 2 && STOMA_X.some(sx => Math.abs(x - sx) < 0.3)) continue;
    spots.push([x, y, z, 0.15 + rand(i * 3 + j + l * 9) * 0.04]);
  }
  const sp = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), spMat, spots.length);
  sp.renderOrder = 2;
  const chlSp = new THREE.InstancedMesh(chlGeo, chlMat, spots.length * 2);
  spots.forEach(([x, y, z, r], k) => {
    s4.set(r * 1.15, r * 0.9, r); p4.set(x, y, z); q4.identity(); m4.compose(p4, q4, s4); sp.setMatrixAt(k, m4);
    for (let c = 0; c < 2; c++) { p4.set(x + (c ? 0.07 : -0.06), y + 0.03, z + 0.08); s4.set(0.04, 0.026, 0.032); m4.compose(p4, q4, s4); chlSp.setMatrixAt(k * 2 + c, m4); }
  });
  gL.add(sp, chlSp);
  // Vein: a bundle running front to back, with xylem (blue) above and phloem (orange) below.
  const veinMat = LP.mat('vein', 0xeef2c8, { transparent: true, opacity: 0.55, depthWrite: false });
  const vein = kit.mesh(new THREE.CylinderGeometry(0.25, 0.25, D, 20), veinMat, [VEIN_X, -0.08, 0], gL);
  vein.rotation.x = Math.PI / 2; vein.renderOrder = 2;
  const xyMat = LP.mat('vein', 0x5a8fd6, { roughness: 0.4 }), phMat = LP.mat('vein', 0xe39b4b, { roughness: 0.4 });
  for (let k = 0; k < 3; k++) {
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, D + 0.02, 10), xyMat, [VEIN_X - 0.1 + k * 0.1, 0.0, 0], gL).rotation.x = Math.PI / 2;
    kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, D + 0.02, 8), phMat, [VEIN_X - 0.08 + k * 0.08, -0.17, 0], gL).rotation.x = Math.PI / 2;
  }
  LP.anchor('epidermis', gL, [-1.6, 0.82, 0.8]);
  LP.anchor('palisade', gL, [-0.45, 0.5, 0.8]);
  LP.anchor('spongy', gL, [-1.55, -0.2, 0.8]);
  LP.anchor('stomata', gL, [STOMA_X[0], -0.74, 0.75]);
  LP.anchor('vein', gL, [VEIN_X, 0.12, 0.85]);
  const lTags = {};
  for (const [k, name] of LEAF_PARTS) lTags[k] = label(name, LP.parts[k].anchor, { cls: 'cool' });
  gL.traverse(o => { o.castShadow = false; });
  const lTitle = label('Leaf slice (magnified)', v3(LS, 0, 1.15, 0), { cls: 'big' });
  // Gas and water flows for step 2.
  const sL = {
    co2: S(gL, { points: [[STOMA_X[0], -1.75, 0.6], [STOMA_X[0], -1.0, STOMA_Z], [STOMA_X[0], -0.66, STOMA_Z], [-1.15, -0.35, 0.62], [-0.95, -0.05, 0.78], [-0.9, 0.3, 0.8]], count: 8, color: SUBST.co2, radius: 0.05, speed: 0.22 }),
    o2: S(gL, { points: [[1.05, 0.35, 0.8], [1.15, -0.05, 0.75], [STOMA_X[1], -0.4, 0.6], [STOMA_X[1], -0.66, STOMA_Z], [STOMA_X[1], -1.05, STOMA_Z], [1.3, -1.75, 0.62]], count: 8, color: SUBST.o2, radius: 0.05, speed: 0.22 }),
    vap: S(gL, { points: [[0.95, -0.3, 0.55], [STOMA_X[1] - 0.04, -0.66, STOMA_Z - 0.06], [1.15, -1.6, 0.45]], count: 5, color: 0xa6d8f7, radius: 0.033, speed: 0.3 }),
    w1: S(gL, { points: [[VEIN_X - 0.05, 0.0, 0.84], [0.3, 0.2, 0.86], [0.05, 0.4, 0.86]], count: 4, color: SUBST.water, radius: 0.045, speed: 0.3 }),
    w2: S(gL, { points: [[VEIN_X + 0.05, 0.0, 0.84], [0.8, 0.22, 0.86], [1.0, 0.42, 0.86]], count: 4, color: SUBST.water, radius: 0.045, speed: 0.3 }),
  };
  const tL = {
    co2: label('Carbon dioxide in', v3(LS, STOMA_X[0], -1.55, 0.6), { cls: 'cool' }),
    o2: label('Oxygen out', v3(LS, 1.45, -1.55, 0.62), { cls: 'cool' }),
    w: label('Water (xylem)', v3(LS, VEIN_X, -0.3, 0.9), { cls: 'cool' }),
  };

  // ================= Step 3: a chloroplast =================
  const gC = group(CH);
  const env = kit.mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshStandardMaterial({ color: 0x9ad978, transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.3 }), [0, 0, 0], gC);
  env.scale.set(1.9, 0.85, 1.0); env.renderOrder = 2; env.castShadow = false;
  const granaMat = kit.mat(0x2e8b3a, { roughness: 0.45 }), lamMat = kit.mat(0x6dbb55, { roughness: 0.5 });
  const discGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.045, 18);
  const GRANA = [[-1.2, -0.05, 0.1], [-0.75, 0.2, -0.25], [-0.35, -0.15, 0.3], [0.1, 0.15, -0.1], [0.55, -0.1, 0.25], [1.0, 0.12, -0.2], [0.25, -0.3, -0.45]];
  GRANA.forEach(([x, y, z], i) => {
    for (let k = 0; k < 5; k++) kit.mesh(discGeo, granaMat, [x, y + (k - 2) * 0.062, z], gC);
    if (i) {
      const [px, py, pz] = GRANA[i - 1], len = Math.hypot(x - px, y - py, z - pz);
      const lam = kit.mesh(new THREE.BoxGeometry(len, 0.02, 0.08), lamMat, [(x + px) / 2, (y + py) / 2, (z + pz) / 2], gC);
      lam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(x - px, y - py, z - pz).normalize());
    }
  });
  const SUN_C = [-2.7, 2.1, 0.5];
  const sunC = makeSun(gC, SUN_C, 0.32);
  const sC = {
    light1: S(gC, { points: [SUN_C, [-1.9, 1.4, 0.4], [-1.2, 0.15, 0.2]], count: 7, color: SUBST.energy, radius: 0.045, speed: 0.6, emissive: 0.8 }),
    light2: S(gC, { points: [SUN_C, [-1.4, 1.5, 0.3], [-0.35, 0.05, 0.35]], count: 7, color: SUBST.energy, radius: 0.045, speed: 0.6, emissive: 0.8 }),
    co2: S(gC, { points: [[-3.0, -0.25, 0.8], [-2.0, -0.2, 0.5], [-0.8, -0.1, 0.3]], count: 6, color: SUBST.co2, radius: 0.06, speed: 0.25 }),
    water: S(gC, { points: [[-2.4, -1.5, 0.6], [-1.5, -0.8, 0.4], [-0.5, -0.25, 0.3]], count: 6, color: SUBST.water, radius: 0.055, speed: 0.25 }),
    glu: S(gC, { points: [[0.5, -0.1, 0.3], [1.6, -0.45, 0.5], [2.9, -0.7, 0.7]], count: 5, color: SUBST.glucose, geo: gluGeo, speed: 0.22, spin: 1 }),
    o2: S(gC, { points: [[0.7, 0.2, 0.25], [1.6, 0.8, 0.45], [2.6, 1.4, 0.6]], count: 6, color: SUBST.o2, radius: 0.06, speed: 0.25 }),
  };
  const tC = {
    title: label('Chloroplast', v3(CH, 0.3, 0.95, 0), { cls: 'big' }),
    grana: label('Stacks with chlorophyll', v3(CH, -0.75, 0.33, -0.25), { cls: 'cool' }),
    light: label('Light', v3(CH, SUN_C[0], SUN_C[1] + 0.45, SUN_C[2]), { cls: 'warm' }),
    co2: label('Carbon dioxide', v3(CH, -2.9, -0.15, 0.8), { cls: 'cool' }),
    water: label('Water', v3(CH, -2.4, -1.45, 0.6), { cls: 'cool' }),
    glu: label('Glucose made: 0', v3(CH, 2.7, -0.6, 0.7), { cls: 'warm' }),
    o2: label('Oxygen', v3(CH, 2.6, 1.5, 0.6), { cls: 'cool' }),
  };

  // ================= Steps 4-5: pondweed and lamp =================
  const gP = group(PW);
  const bench = kit.mesh(new THREE.BoxGeometry(7.2, 0.1, 1.8), kit.mat(0xd2b48c, { roughness: 0.85 }), [-1.4, 0.05, 0], gP);
  bench.castShadow = false;
  const ruler = kit.mesh(new THREE.BoxGeometry(5.4, 0.02, 0.3), kit.mat(0xffffff, { map: rulerTexture(THREE) }), [BK - 2.7, 0.11, 0.6], gP);
  ruler.castShadow = false;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.55, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.set(BK, 0.1 + 0.775, 0); glass.renderOrder = 3;
  gP.add(glass);
  kit.mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 32), new THREE.MeshStandardMaterial({ color: 0xd5ecf7, transparent: true, opacity: 0.6 }), [BK, 0.115, 0], gP);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, WATER_TOP - 0.13, 32), new THREE.MeshStandardMaterial({ color: 0x67b4e8, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false }));
  water.position.set(BK, (WATER_TOP + 0.13) / 2, 0); water.renderOrder = 2;
  gP.add(water);
  const weed = pondweed(THREE, kit, { h: 1.0 });
  weed.g.position.set(BK, 0.16, 0);
  gP.add(weed.g);
  const tip = weed.tip.clone().add(weed.g.position);
  const BUB = 18, bubs = [];
  const bubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, roughness: 0.05, metalness: 0.2 });
  for (let i = 0; i < BUB; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), bubMat); b.visible = false; b.renderOrder = 4; gP.add(b); bubs.push({ m: b, y: 0, on: false, k: i }); }
  // Fizz from baking soda: tiny dots drifting in the water (count shows the CO2 level).
  const fizz = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 6, 4), kit.mat(0x8a94a6), 30);
  fizz.frustumCulled = false; fizz.count = 0;
  gP.add(fizz);
  const soda = new THREE.Group();
  soda.position.set(BK + 0.85, 0.1, 0.25);
  gP.add(soda);
  kit.mesh(new THREE.BoxGeometry(0.34, 0.42, 0.22), kit.mat(0xf5f5f5), [0, 0.21, 0], soda);
  kit.mesh(new THREE.BoxGeometry(0.35, 0.14, 0.23), kit.mat(0xe85d75), [0, 0.26, 0], soda);
  // Desk lamp facing the beaker.
  const lamp = new THREE.Group();
  gP.add(lamp);
  const dark = kit.mat(0x2b2d42, { roughness: 0.5 });
  kit.mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 24), dark, [0, 0.14, 0], lamp);
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), dark, [0, 0.52, 0], lamp);
  const shade = kit.mesh(new THREE.ConeGeometry(0.26, 0.36, 24, 1, true), kit.mat(0x2e86de, { side: THREE.DoubleSide, roughness: 0.4 }), [0.12, 0.88, 0], lamp);
  shade.rotation.z = Math.PI / 2;
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe066, emissiveIntensity: 1.2 });
  kit.mesh(new THREE.SphereGeometry(0.1, 16, 10), bulbMat, [0.22, 0.88, 0], lamp).castShadow = false;
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.22, 1, 24, 1, true).rotateZ(Math.PI / 2).translate(0.5, 0, 0), beamMat);
  beam.position.set(0.3, 0.88, 0);
  lamp.add(beam);
  const lampLight = new THREE.PointLight(0xfff1b8, 3, 0, 2);
  lampLight.position.set(0.3, 0.88, 0);
  lamp.add(lampLight);
  const lampTop = new THREE.Object3D();
  lampTop.position.set(0.1, 1.12, 0);
  lamp.add(lampTop);
  const tP = {
    weed: label('Pondweed', v3(PW, BK - 0.3, 0.3, 0.55), { cls: 'cool' }),
    lamp: label('Lamp', lampTop, { cls: 'warm' }),
    count: label('Bubbles: 0', v3(PW, BK, 1.9, 0), { cls: 'big' }),
    soda: label('Baking soda', v3(PW, BK + 0.85, 0.62, 0.25)),
  };

  // ================= Step 6: plant with a tuber, and the iodine test =================
  const plantB = soilPlant(THREE, kit, { h: 2.0, pairs: 3, tuber: true });
  const gG = group(GL); gG.add(plantB.g);
  const TB = plantB.leafTips, fzB = plantB.soilFront;
  const sG = {
    energy: S(gG, { points: [arr(TB[2]), [-0.1, 1.25, 0.1], [0, 0.85, 0.1]], count: 5, color: SUBST.glucose, geo: gluGeo, speed: 0.25, spin: 1 }),
    growth: S(gG, { points: [arr(TB[3]), [0.05, 1.55, 0.08], [0, 2.05, 0.08]], count: 5, color: SUBST.glucose, geo: gluGeo, speed: 0.25, spin: 1 }),
    starch: S(gG, { points: [arr(TB[0]), [0, 0.6, 0.08], [0, 0.0, 0.1], [0.05, -0.2, fzB], [0.35, -0.36, fzB], [0.62, -0.56, fzB + 0.02]], count: 7, color: SUBST.glucose, geo: gluGeo, speed: 0.2, spin: 1 }),
  };
  const sparks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: SUBST.energy }), 8);
  sparks.frustumCulled = false;
  gG.add(sparks);
  const newLeaf = new THREE.Mesh(leafGeometry(THREE, 0.45, 0.22, 0.05), plantB.leafMat);
  newLeaf.position.set(0, 2.02, 0); newLeaf.rotation.set(0, 0.8, 0.8);
  gG.add(newLeaf);
  const tuberBase = plantB.tuber.scale.clone();
  const TILE = [GL[0] + 2.5, 0, 0.7];
  kit.mesh(new THREE.BoxGeometry(1.7, 0.06, 1.0), kit.mat(0xffffff, { roughness: 0.3 }), [TILE[0], 0.03, TILE[2]], scene);
  const testLeafGeo = leafGeometry(THREE, 0.65, 0.34, 0.02);
  const pale = new THREE.Color(0xf1ead0), blueBlack = new THREE.Color(0x1f2340), orangeBrown = new THREE.Color(0xc77a2a);
  const testLeaves = [-0.42, 0.42].map(dx => {
    const m = new THREE.Mesh(testLeafGeo, kit.mat(0xf1ead0, { side: THREE.DoubleSide, roughness: 0.7 }));
    m.position.set(TILE[0] + dx - 0.3, 0.075, TILE[2] + 0.05); m.rotation.y = 0.2;
    scene.add(m); return m;
  });
  const drops = [-0.42, 0.42].map(dx => kit.mesh(new THREE.SphereGeometry(0.04, 10, 8), kit.mat(0xc96a1c), [TILE[0] + dx, 0.6, TILE[2] + 0.1], scene));
  const tG = {
    energy: label('Energy for cells', v3(GL, 0.45, 0.85, 0.1), { cls: 'warm' }),
    growth: label('New growth', v3(GL, 0.25, 2.25, 0.05), { cls: 'warm' }),
    starch: label('Starch store (tuber)', v3(GL, 0.75, -0.32, fzB), { cls: 'warm' }),
    light: label('Kept in light', v3(TILE, -0.42, 0.12, 0.38), { cls: 'cool' }),
    dark: label('Kept in dark', v3(TILE, 0.42, 0.12, 0.38), { cls: 'cool' }),
  };

  // ================= State =================
  const st = { step: 0, quiz: false, time: 0, auto: true, row: null, toggle: null, slider: null, part: 0, side: 0, open: 1, gap: 1, light: true, glu: 0, dist: 30, co2: 1, acc: 0, bubbles: 0, use: 0, dim: 0 };
  const allTags = [...Object.values(tA), ...Object.values(lTags), lTitle, ...Object.values(tL), ...Object.values(tC), ...Object.values(tP), ...Object.values(tG)];
  const showStreams = (set, on) => { for (const s of Object.values(set)) { s.mesh.visible = on; s.rate = 1; } };

  function setSide(i) {
    st.side = i;
    const inn = i === 0;
    for (const k of ['light', 'co2', 'water']) { sA[k].mesh.visible = inn; tA[k].show(inn); }
    for (const k of ['o2', 'glu']) { sA[k].mesh.visible = !inn; tA[k].show(!inn); }
    const hi = (txt, on) => (on ? `<b>${txt}</b>` : txt);
    ui.readout(`${hi('carbon dioxide + water', inn)} <span style="white-space:nowrap">→<sup style="font-size:.75em"> light, chlorophyll</sup></span> ${hi('glucose + oxygen', !inn)}<br>${inn ? 'In: carbon dioxide from the air, water from the soil, and light energy.' : 'Out: glucose (food) for the plant, and oxygen into the air.'}`);
  }
  function pickLeaf(i) {
    st.part = i;
    const [k, name, txt] = LEAF_PARTS[i];
    LP.select(k);
    for (const [kk] of LEAF_PARTS) lTags[kk].show(kk === k);
    ui.readout(`<b>${name}</b>: ${txt}`);
  }
  function setOpen(v) {
    st.open = v ? 1 : 0;
    for (const k of ['co2', 'o2', 'vap']) sL[k].rate = v ? 1 : 0;
    sL.w1.rate = sL.w2.rate = v ? 1 : 0.3;
    ui.readout(v ? '<b>Stomata open</b>: carbon dioxide diffuses in, oxygen and water vapour diffuse out.' : '<b>Stomata closed</b>: very little gas can get in or out, so photosynthesis slows down. Water arrives more slowly too.');
  }
  function setLight(v) {
    st.light = v;
    for (const s of Object.values(sC)) s.rate = v ? 1 : 0;
    ui.readout(v ? `<b>Light on</b>: chlorophyll absorbs light energy, and the chloroplast makes glucose and oxygen.<br>Glucose made: <b>${Math.floor(st.glu)}</b> (model count)` : `<b>Light off</b>: no light energy, so photosynthesis stops.<br>Glucose made: <b>${Math.floor(st.glu)}</b> (model count)`);
  }
  // Model bubble rate: light intensity falls with distance squared; the rate is the smaller (smoothly) of what the
  // light allows and what the carbon dioxide allows.
  const intensity = d => (10 / d) ** 2;
  const lightRate = d => 100 * intensity(d);
  const rateOf = (d, c) => { const L = lightRate(d), C = CO2_LEVELS[c][1]; return (L * C) / Math.pow(L ** 4 + C ** 4, 0.25); };
  function setBench(d, c, withCo2) {
    if (d !== st.dist || c !== st.co2) { st.bubbles = 0; st.acc = 0.9; }
    st.dist = d; st.co2 = c;
    lamp.position.x = BK - d / 10;
    beam.scale.x = Math.max(0.2, d / 10 - 0.75);
    lampLight.intensity = 3;
    fizz.count = [3, 10, 24][c];
    const r = rateOf(d, c), lim = lightRate(d) < CO2_LEVELS[c][1] ? 'light' : 'carbon dioxide';
    ui.readout(`Lamp distance: <b>${d} cm</b> · light intensity: <b>${Math.round(intensity(d) * 100)}%</b> of the brightest (at 10 cm)${withCo2 ? `<br>Carbon dioxide: <b>${CO2_LEVELS[c][0]}</b>` : ''}<br>Oxygen bubbles: about <b>${Math.round(r)} per minute</b> (model)${withCo2 ? `<br>Limiting factor: <b>${lim}</b>` : (lim === 'light' ? '' : '<br>The rate has reached its limit: more light no longer helps much.')}`);
  }
  function pickUse(i, move) {
    st.use = i;
    sG.energy.mesh.visible = i === 0; tG.energy.show(i === 0); sparks.visible = i === 0;
    sG.growth.mesh.visible = i === 1; tG.growth.show(i === 1); newLeaf.visible = i === 1;
    sG.starch.mesh.visible = i === 2; tG.starch.show(i === 2);
    tG.light.show(i === 3); tG.dark.show(i === 3);
    st.ioT = 0;
    ui.readout(`<b>${USES[i][0]}</b>: ${USES[i][1]}`);
    if (move) view(i === 3 ? { radius: 0.9, yaw: 0.1, pitch: 0.85, target: [TILE[0], 0.1, TILE[2]] } : F.uses);
  }

  const F = {
    plant: { radius: 2.4, width: 2.6, yaw: 0.15, pitch: 0.12, target: [PL[0] - 0.2, 2.2, 0] },
    leaf: { radius: 1.7, width: 2.35, yaw: 0.3, pitch: 0.3, target: [LS[0], LS[1], 0.2] },
    gas: { radius: 2.0, width: 2.4, yaw: 0.25, pitch: 0.12, target: [LS[0], LS[1] - 0.45, 0.2] },
    chl: { radius: 2.0, width: 3.45, yaw: 0.1, pitch: 0.2, target: [CH[0], CH[1] + 0.2, 0.3] },
    bench: { radius: 1.6, width: 3.45, yaw: 0.22, pitch: 0.3, target: [PW[0] - 1.1, 0.8, 0] },
    uses: { radius: 2.2, width: 2.9, yaw: 0.1, pitch: 0.18, target: [GL[0] + 1.1, 1.4, 0.3] },
    quiz: { radius: 2.4, width: 2.6, yaw: -0.15, pitch: 0.15, target: [PL[0] - 0.2, 2.2, 0] },
  };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, row: null, toggle: null, slider: null });
      for (const t of allTags) t.show(false);
      for (const s of all) { s.mesh.visible = false; s.rate = 1; }
      LP.select(null);
      sparks.visible = newLeaf.visible = false;
      st.dim = 0;
      if (i === 0) {
        go(F.plant);
        st.row = ui.buttons([{ label: 'What goes in', on: true, onClick: () => { st.auto = false; setSide(0); } }, { label: 'What comes out', onClick: () => { st.auto = false; setSide(1); } }]);
        setSide(0);
      }
      if (i === 1) {
        go(F.leaf); lTitle.show(true);
        st.row = ui.buttons(LEAF_PARTS.map(([, name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickLeaf(j); } })));
        pickLeaf(0); setOpen(true); st.gap = 1;
        ui.readout(`<b>${LEAF_PARTS[0][1]}</b>: ${LEAF_PARTS[0][2]}`);
      }
      if (i === 2) {
        go(F.gas); lTitle.show(true);
        showStreams(sL, true);
        for (const t of Object.values(tL)) t.show(true);
        st.toggle = ui.toggle({ label: 'Stomata open', value: true, onChange: v => { st.auto = false; setOpen(v); } });
        setOpen(true);
      }
      if (i === 3) {
        go(F.chl);
        showStreams(sC, true);
        for (const t of Object.values(tC)) t.show(true);
        st.toggle = ui.toggle({ label: 'Light on', value: true, onChange: v => { st.auto = false; setLight(v); } });
        setLight(true);
      }
      if (i === 4 || i === 5) {
        go(F.bench);
        tP.weed.show(true); tP.lamp.show(true); tP.count.show(true); tP.soda.show(i === 5);
        soda.visible = i === 5;
        const withCo2 = i === 5;
        st.slider = ui.slider({ label: 'Lamp distance', min: 10, max: 50, step: 5, value: 50, unit: ' cm', onInput: v => { st.auto = false; setBench(v, st.co2, withCo2); } });
        if (withCo2) st.slider2 = ui.slider({ label: 'Carbon dioxide', min: 0, max: 2, step: 1, value: 0, format: v => CO2_LEVELS[v][0], onInput: v => { st.auto = false; setBench(st.dist, v, true); } });
        setBench(i === 4 ? 50 : 10, i === 4 ? 1 : 0, withCo2);
        if (i === 5) st.slider.set(10);
      }
      if (i === 6) {
        go(F.uses);
        st.row = ui.buttons(USES.map(([name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickUse(j, true); } })));
        pickUse(0, false);
      }
      if (isQuiz) {
        go(F.quiz);
        showStreams(sA, true);
        for (const t of Object.values(tA)) t.show(true);
      }
    },

    update(dt, t) {
      st.time += dt;
      const s = st.step, T = st.time, auto = st.auto && !st.quiz;
      for (const sm of all) if (sm.mesh.visible) sm.update(dt);
      // Step 0: alternate in / out.
      if (s === 0 && auto) { const j = Math.floor(T / 3.5) % 2; if (j !== st.side) { setSide(j); st.row?.select(j); } }
      // Step 1: parts of the leaf in turn.
      if (s === 1 && auto) { const j = Math.floor(T / 2.6) % LEAF_PARTS.length; if (j !== st.part && j >= 0) { pickLeaf(j); st.row?.select(j); } }
      LP.pulse(t);
      // Step 2: stomata open and close.
      if (s === 2 && auto) { const o = Math.floor(T / 4) % 2 === 0; if (o !== !!st.open) { setOpen(o); if (st.toggle) st.toggle.checked = o; } }
      kit.follow(st, 'gap', st.open, dt, 4);
      for (const g of guards) g.position.x = g.userData.cx + g.userData.side * (0.072 + 0.058 * st.gap);
      for (const k of ['co2', 'o2', 'vap']) sL[k].size = 0.15 + 0.85 * st.gap;
      // Step 3: light on and off.
      if (s === 3) {
        if (auto) { const on = T % 9 < 6; if (on !== st.light) { setLight(on); if (st.toggle) st.toggle.checked = on; } }
        if (st.light) {
          const before = Math.floor(st.glu);
          st.glu += dt * 1.1;
          if (Math.floor(st.glu) !== before) { tC.glu.text = `Glucose made: ${Math.floor(st.glu)}`; setLight(true); }
        }
        for (const sm of Object.values(sC)) sm.mesh.visible = st.light;
        tC.light.show(st.light);
      }
      kit.follow(st, 'dim', s === 3 && !st.light ? 1 : 0, dt, 3);
      scene.background.copy(sky).lerp(dusk, st.dim * 0.85);
      sunLight.intensity = 2.2 * (1 - 0.75 * st.dim);
      sunMat.color.setHex(st.dim > 0.5 ? 0x8a8f99 : 0xffd34d);
      glowMat.opacity = 0.25 * (1 - st.dim);
      // Steps 4-5: bubbles from the cut stem.
      if (s === 4 || s === 5) {
        if (auto) {
          if (s === 4) { const d = Math.max(10, 50 - 5 * Math.floor(T / 1.4)); if (d !== st.dist) { setBench(d, 1, false); st.slider?.set(d); } }
          else { const c = Math.min(2, Math.floor(T / 3)); if (c !== st.co2) { setBench(st.dist, c, true); st.slider2?.set(c); } }
        }
        st.acc += (dt * rateOf(st.dist, st.co2)) / 60;
        if (st.acc >= 1) {
          st.acc -= 1;
          const b = bubs.find(x => !x.on);
          if (b) { b.on = true; b.y = tip.y; b.m.visible = true; st.bubbles++; tP.count.text = `Bubbles: ${st.bubbles}`; }
        }
        for (const b of bubs) if (b.on) {
          b.y += dt * 0.42;
          b.m.position.set(tip.x + Math.sin(b.y * 9 + b.k) * 0.03, b.y, tip.z + Math.cos(b.y * 7 + b.k) * 0.02);
          if (b.y > WATER_TOP - 0.03) { b.on = false; b.m.visible = false; }
        }
        for (let k = 0; k < fizz.count; k++) {
          const a = k * 2.4 + t * 0.3, r = 0.12 + rand(k) * 0.33, y = 0.2 + ((rand(k + 7) + t * 0.05 * (0.5 + rand(k + 3))) % 1) * (WATER_TOP - 0.3);
          p4.set(BK + Math.cos(a) * r, y, Math.sin(a) * r); q4.identity(); s4.set(1, 1, 1); m4.compose(p4, q4, s4); fizz.setMatrixAt(k, m4);
        }
        fizz.instanceMatrix.needsUpdate = true;
        bulbMat.emissiveIntensity = 1.2 + 0.1 * Math.sin(t * 3);
      }
      // Step 6: glucose uses and the iodine test.
      if (s === 6) {
        if (auto) { const j = Math.floor(T / 3.5) % 4; if (j !== st.use) { pickUse(j, false); st.row?.select(j); } }
        if (st.use === 0) {
          for (let k = 0; k < 8; k++) {
            const a = k * 0.785 + t * 1.5, pulse = 0.6 + 0.6 * Math.abs(Math.sin(t * 3 + k));
            p4.set(Math.cos(a) * 0.2, 0.85 + Math.sin(t * 2 + k) * 0.08, Math.sin(a) * 0.2 + 0.05); q4.identity(); s4.setScalar(pulse); m4.compose(p4, q4, s4); sparks.setMatrixAt(k, m4);
          }
          sparks.instanceMatrix.needsUpdate = true;
        }
        if (st.use === 1) newLeaf.scale.setScalar(0.2 + 0.8 * ((T % 3.5) / 3.5));
        const sw = st.use === 2 ? 1 + 0.3 * Math.min(1, (T % 3.5) / 3) : 1;
        plantB.tuber.scale.set(tuberBase.x * sw, tuberBase.y * sw, tuberBase.z * sw);
        st.ioT += dt;
        const u = kit.clamp((st.ioT - 0.8) / 1.2, 0, 1);
        drops.forEach(d => { d.visible = st.use === 3 && st.ioT < 0.8; d.position.y = 0.6 - 0.65 * Math.min(1, st.ioT / 0.8); });
        testLeaves[0].material.color.copy(pale).lerp(st.use === 3 ? blueBlack : pale, u);
        testLeaves[1].material.color.copy(pale).lerp(st.use === 3 ? orangeBrown : pale, u);
      }
      return true;
    },
  };
}

// Ruler along the bench: marks every 1 cm (10 per scene unit), numbers every 10 cm, counted from the beaker.
function rulerTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#fff7d6'; x.fillRect(0, 0, 512, 32);
  x.fillStyle = '#333'; x.font = 'bold 13px system-ui, sans-serif'; x.textAlign = 'center';
  for (let cm = 0; cm <= 54; cm++) {
    const px = 512 - (cm / 54) * 512;
    const h = cm % 10 === 0 ? 14 : cm % 5 === 0 ? 9 : 5;
    x.fillRect(px - 1, 0, 2, h);
    if (cm % 10 === 0 && cm > 0) x.fillText(`${cm}`, px, 29);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
