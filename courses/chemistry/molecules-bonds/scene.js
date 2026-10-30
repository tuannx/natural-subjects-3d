// Molecules and bonds: elements vs compounds; molecular mass as a stack of atom blocks; a covalent
// bond as a shared electron pair (H2, then H2O); an ionic bond (Na gives an electron to Cl); the NaCl
// crystal lattice; and why salt melts at about 801 °C while ice melts at 0 °C.
import { bohrAtom, molecule, CPK } from '../_shared/atoms.js';

const MASS = { H: 1, C: 12, O: 16, Na: 23, Cl: 35.5 };
const MOLS = [
  { key: 'H2', f: 'H₂', name: 'hydrogen', atoms: [['H', 2]] },
  { key: 'O2', f: 'O₂', name: 'oxygen', atoms: [['O', 2]] },
  { key: 'H2O', f: 'H₂O', name: 'water', atoms: [['H', 2], ['O', 1]] },
  { key: 'CO2', f: 'CO₂', name: 'carbon dioxide', atoms: [['C', 1], ['O', 2]] },
  { key: 'CH4', f: 'CH₄', name: 'methane', atoms: [['C', 1], ['H', 4]] },
];
const molMass = m => m.atoms.reduce((s, [el, n]) => s + MASS[el] * n, 0);
const CLUSTERS = [
  { key: 'He', f: 'He', kind: 'element', x: -4.6, n: 4 },
  { key: 'H2', f: 'H₂', kind: 'element', x: -2.5, n: 3 },
  { key: 'O2', f: 'O₂', kind: 'element', x: -0.4, n: 3 },
  { key: 'H2O', f: 'H₂O', kind: 'compound', x: 2.2, n: 3 },
  { key: 'CO2', f: 'CO₂', kind: 'compound', x: 4.4, n: 3 },
];
const H2_BOND = 74;              // pm
const SEP = d => (d / H2_BOND) * 1.15;
const ORANGE = 0xff922b, YELLOW = 0xffd166;

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  scene.background = new THREE.Color(0x13223f);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4a6a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(3, 6, 7);
  scene.add(sun);
  const v = new THREE.Vector3(), v2 = new THREE.Vector3(), q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1), sc = new THREE.Vector3();

  // ---- Step 1: clusters of elements and compounds ----
  const clusters = CLUSTERS.map((c, ci) => {
    const g = new THREE.Group();
    g.position.set(c.x, 0.2, 0);
    scene.add(g);
    const items = [];
    for (let i = 0; i < c.n; i++) {
      const a = (i / c.n) * Math.PI * 2 + ci, r = c.n > 1 ? 0.5 : 0;
      const m = molecule(k, c.key, { scale: 0.62, parent: g });
      const home = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.9, (rand(ci * 9 + i) - 0.5) * 0.5);
      const axis = new THREE.Vector3(rand(ci * 7 + i) - 0.5, rand(ci * 5 + i + 3) - 0.5, rand(i + ci * 3 + 11) - 0.5).normalize();
      items.push({ m, home, axis, ph: rand(ci * 13 + i) * 6 });
    }
    const anchor = new THREE.Object3D();
    anchor.position.set(c.x, -0.95, 0);
    scene.add(anchor);
    return { ...c, g, items, tag: label(c.f, anchor), s: 1, sTo: 1 };
  });
  const elemTag = label('Elements', new THREE.Vector3(-2.5, 1.45, 0), { cls: 'cool' });
  const compTag = label('Compounds', new THREE.Vector3(3.3, 1.45, 0), { cls: 'warm' });

  // ---- Step 2: one molecule and a stack of blocks (one block per atom, height = its mass) ----
  const models = MOLS.map(m => { const g = molecule(k, m.key, { scale: 1.35 }); g.position.set(-0.9, 0.9, 0); g.visible = false; return g; });
  const H_PER_AMU = 0.055, COLX = 1.9;
  const blockMats = Object.fromEntries(Object.entries(CPK).map(([el, c]) => [el, kit.mat(c, { roughness: 0.5 })]));
  const blocks = Array.from({ length: 5 }, () => { const b = kit.mesh(new THREE.BoxGeometry(0.7, 1, 0.7), blockMats.H, [COLX, 0, 0], scene); b.visible = false; return b; });
  const stand = kit.mesh(new THREE.BoxGeometry(1.1, 0.08, 1.1), kit.mat(0x2b3a5c), [COLX, -0.04, 0], scene);
  const colTop = new THREE.Object3D();
  scene.add(colTop);
  const massTag = label('', colTop, { cls: 'big warm' });
  const molTag = label('', new THREE.Vector3(-0.9, 2.45, 0), { cls: 'big' });

  // ---- Step 3: two hydrogen atoms that share their electrons ----
  const hb = { sep: SEP(220), f: 0, wob: 0 };
  const hA = bohrAtom(k, { maxP: 1, maxN: 0, maxE: 1, r0: 0.85, nR: 0.17, eR: 0.11, tube: 0.016, spin: 1.1 });
  const hB = bohrAtom(k, { maxP: 1, maxN: 0, maxE: 1, r0: 0.85, nR: 0.17, eR: 0.11, tube: 0.016, spin: 1.1 });
  hA.set(1, 0, 1); hB.set(1, 0, 1);
  hB.tint = () => ORANGE; hB.recolor();
  hB.angle = Math.PI;
  const share = side => (i, s, j, c, a, out) => {
    const r = 0.85, ox = Math.cos(a) * r, oy = Math.sin(a) * r;
    const px = side * hb.sep / 2, py = side * (0.13 + 0.03 * Math.sin(hb.wob));
    return out.set(kit.lerp(ox, px, hb.f), kit.lerp(oy, py, hb.f), 0);
  };
  hA.place = share(1); hB.place = share(-1);
  const hTagA = label('H', hA.group, { cls: '' }), hTagB = label('H', hB.group, { cls: '' });
  const pairAnchor = new THREE.Object3D();
  scene.add(pairAnchor);
  const pairTag = label('Shared pair', pairAnchor, { cls: 'warm' });

  // ---- Step 4: water as shells (O shares a pair with each H) and as ball-and-stick ----
  const W = new THREE.Group();
  W.position.set(0, 0.35, 0);
  scene.add(W);
  const RO = 1.15, RH = 0.7, DOH = 1.45, half = (104.5 / 2) * Math.PI / 180;
  const dirs = [-1, 1].map(s => new THREE.Vector2(s * Math.sin(half), -Math.cos(half)));
  const oxy = bohrAtom(k, { parent: W, maxP: 8, maxN: 8, maxE: 8, r0: 0.5, dr: RO - 0.5, nR: 0.085, eR: 0.095, tube: 0.016, spin: 0.9 });
  oxy.set(8, 8, 8);
  const PAIR = 0.96, OFF = 0.11;
  const lone = [52, 128].map(d => d * Math.PI / 180);
  oxy.place = (i, s, j, c, a, out) => {
    if (s === 0) return false;
    if (j < 2) { const d = dirs[j]; return out.set(d.x * PAIR - d.y * OFF, d.y * PAIR + d.x * OFF, 0); }
    const base = lone[(j - 2) >> 1], aa = base + ((j - 2) % 2 ? 0.2 : -0.2);
    return out.set(Math.cos(aa) * RO, Math.sin(aa) * RO, 0);
  };
  oxy.spin = 0.9;
  const hyd = dirs.map((d, j) => {
    const h = bohrAtom(k, { parent: W, pos: [d.x * DOH, d.y * DOH, 0], maxP: 1, maxN: 0, maxE: 1, r0: RH, nR: 0.13, eR: 0.095, tube: 0.016 });
    h.set(1, 0, 1);
    h.tint = () => ORANGE; h.recolor();
    // The H electron sits in the shared pair, next to the O electron (positions in the H atom's own space).
    h.place = (i, s, jj, c, a, out) => out.set(d.x * PAIR + d.y * OFF - d.x * DOH, d.y * PAIR - d.x * OFF - d.y * DOH, 0);
    h.spin = 0;
    return h;
  });
  const shellsView = new THREE.Group();
  W.add(shellsView);
  shellsView.add(oxy.group, hyd[0].group, hyd[1].group);
  const stickWater = molecule(k, 'H2O', { scale: 1.5, parent: W });
  stickWater.position.y = -0.2 * 1.5 + 0.0;
  const wv = { mode: 0, s0: 1, s1: 0 };
  const wPairAnchor = new THREE.Object3D();
  W.add(wPairAnchor);
  wPairAnchor.position.set(dirs[0].x * PAIR - 0.55, dirs[0].y * PAIR - 0.1, 0);
  const wPairTag = label('Shared pair', wPairAnchor, { cls: 'warm' });

  // ---- Step 5: sodium gives an electron to chlorine ----
  const ION = { na0: -2.3, cl0: 2.3, na1: -1.06, cl1: 1.08 };
  const na = bohrAtom(k, { maxP: 11, maxN: 12, maxE: 11, r0: 0.45, dr: 0.38, nR: 0.055, eR: 0.075, tube: 0.014, spin: 0.35 });
  const cl = bohrAtom(k, { maxP: 17, maxN: 18, maxE: 18, r0: 0.45, dr: 0.38, nR: 0.055, eR: 0.075, tube: 0.014, spin: 0.35 });
  na.mats.ring.color.set(0xc8b6ff); cl.mats.ring.color.set(0xa6e3b8);
  const flyer = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), new THREE.MeshStandardMaterial({ color: YELLOW, emissive: 0x7a5200, emissiveIntensity: 0.8 }));
  scene.add(flyer);
  const naTop = new THREE.Object3D(), clTop = new THREE.Object3D();
  na.group.add(naTop); cl.group.add(clTop);
  const naTag = label('Na', naTop, { cls: 'big' }), clTag = label('Cl', clTop, { cls: 'big' });
  const ion = { t: -1, phase: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };

  // ---- Step 6: NaCl lattice that grows with the slider ----
  const LAT = new THREE.Group();
  scene.add(LAT);
  const LA = 0.62, NMAX = 6;
  const latIn = new THREE.Group();
  LAT.add(latIn);
  const naMat = kit.mat(CPK.Na, { roughness: 0.35 }), clMat = kit.mat(CPK.Cl, { roughness: 0.35 });
  const ionGeo = new THREE.SphereGeometry(1, 12, 9);
  const naI = new THREE.InstancedMesh(ionGeo, naMat, 108), clI = new THREE.InstancedMesh(ionGeo, clMat, 108);
  for (const m of [naI, clI]) { m.frustumCulled = false; latIn.add(m); }
  const gridMat = new THREE.LineBasicMaterial({ color: 0x8aa0c0, transparent: true, opacity: 0.5 });
  const grid = new THREE.LineSegments(new THREE.BufferGeometry(), gridMat);
  grid.frustumCulled = false;
  latIn.add(grid);
  const naAnchor = new THREE.Object3D(), clAnchor = new THREE.Object3D();
  latIn.add(naAnchor, clAnchor);
  const naLatTag = label('Na⁺', naAnchor, { cls: 'big' }), clLatTag = label('Cl⁻', clAnchor, { cls: 'big' });
  const lat = { n: 0 };
  function buildLattice(n) {
    lat.n = n;
    let a = 0, b = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let kk = 0; kk < n; kk++) {
      const isNa = (i + j + kk) % 2 === 0;
      m4.compose(v.set(i * LA, j * LA, kk * LA), q.identity(), sc.setScalar(isNa ? 0.13 : 0.22));
      if (isNa) naI.setMatrixAt(a++, m4); else clI.setMatrixAt(b++, m4);
    }
    naI.count = a; clI.count = b;
    naI.instanceMatrix.needsUpdate = clI.instanceMatrix.needsUpdate = true;
    const pts = [], L = (n - 1) * LA;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      pts.push(0, i * LA, j * LA, L, i * LA, j * LA);
      pts.push(i * LA, 0, j * LA, i * LA, L, j * LA);
      pts.push(i * LA, j * LA, 0, i * LA, j * LA, L);
    }
    grid.geometry.dispose();
    grid.geometry = new THREE.BufferGeometry();
    grid.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    latIn.position.setScalar(-L / 2);
    // Label a corner Na+ and its Cl- neighbour on the side that faces the camera.
    naAnchor.position.set(0, L + 0.2, L);
    clAnchor.position.set(LA, L + 0.2, L);
    return { a, b };
  }

  // ---- Step 7: water molecules and salt ions as the temperature changes ----
  const HOT = new THREE.Group();
  scene.add(HOT);
  const trayMat = kit.mat(0x2b3a5c);
  kit.mesh(new THREE.BoxGeometry(4.2, 0.1, 3), trayMat, [-2.4, -0.05, 0], HOT).castShadow = false;
  kit.mesh(new THREE.BoxGeometry(4.2, 0.1, 3), trayMat, [2.4, -0.05, 0], HOT).castShadow = false;
  const NW = 27, NS = 64;
  const wO = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), kit.mat(CPK.O, { roughness: 0.35 }), NW);
  const wH = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), kit.mat(CPK.H, { roughness: 0.35 }), NW * 2);
  const sNa = new THREE.InstancedMesh(ionGeo, naMat, NS / 2), sCl = new THREE.InstancedMesh(ionGeo, clMat, NS / 2);
  for (const m of [wO, wH, sNa, sCl]) { m.frustumCulled = false; HOT.add(m); }
  // Three layouts for each particle: solid (lattice), liquid (a low, loose pile) and gas (spread through the air).
  const water = [], salt = [];
  for (let i = 0; i < NW; i++) {
    const a = i % 3, b = Math.floor(i / 3) % 3, c = Math.floor(i / 9);
    water.push({
      s: new THREE.Vector3(-2.4 + (a - 1) * 0.62, 0.45 + c * 0.62, (b - 1) * 0.62),
      l: new THREE.Vector3(-2.4 + (rand(i) - 0.5) * 3.2, 0.25 + rand(i + 40) * 0.55, (rand(i + 80) - 0.5) * 2.2),
      g: new THREE.Vector3(-2.4 + (rand(i + 120) - 0.5) * 3.8, 0.6 + rand(i + 160) * 3.2, (rand(i + 200) - 0.5) * 2.4),
      axis: new THREE.Vector3(rand(i + 5) - 0.5, rand(i + 6) - 0.5, rand(i + 7) - 0.5).normalize(), ph: rand(i + 9) * 6.28,
    });
  }
  for (let i = 0; i < NS; i++) {
    const a = i % 4, b = Math.floor(i / 4) % 4, c = Math.floor(i / 16);
    salt.push({
      na: (a + b + c) % 2 === 0,
      s: new THREE.Vector3(2.4 + (a - 1.5) * 0.46, 0.3 + c * 0.46, (b - 1.5) * 0.46),
      l: new THREE.Vector3(2.4 + (rand(i + 300) - 0.5) * 3.0, 0.22 + rand(i + 340) * 0.5, (rand(i + 380) - 0.5) * 2.2),
      ph: rand(i + 400) * 6.28,
    });
  }
  const hot = { T: -20, wState: 0, sState: 0, t: 0 };
  const hOff = [new THREE.Vector3(-0.757, -0.586, 0), new THREE.Vector3(0.757, -0.586, 0)].map(p => p.multiplyScalar(0.36));
  const wTagAnchor = new THREE.Object3D(), sTagAnchor = new THREE.Object3D();
  wTagAnchor.position.set(-2.4, 2.4, 0); sTagAnchor.position.set(2.4, 2.4, 0);
  HOT.add(wTagAnchor, sTagAnchor);
  const wTag = label('', wTagAnchor, { cls: 'cool' }), sTag = label('', sTagAnchor, { cls: 'warm' });
  const tmpP = new THREE.Vector3();
  const wDiag = [];
  function drawHot(dt) {
    hot.t += dt;
    const T = hot.T, t = hot.t;
    const wTarget = T < 0 ? 0 : T < 100 ? 1 : 2, sTarget = T < 801 ? 0 : 1;
    kit.follow(hot, 'wState', wTarget, dt, 2.5);
    kit.follow(hot, 'sState', sTarget, dt, 2.5);
    const ws = hot.wState, ss = hot.sState;
    const jig = 0.015 + 0.04 * kit.clamp((T + 20) / 120, 0, 1);
    for (let i = 0; i < NW; i++) {
      const w = water[i];
      // blend solid -> liquid -> gas
      if (ws <= 1) tmpP.lerpVectors(w.s, w.l, ws); else tmpP.lerpVectors(w.l, w.g, ws - 1);
      const roam = ws > 1 ? (ws - 1) : 0, flow = Math.min(1, ws);
      tmpP.x += Math.sin(t * (1.3 + roam * 1.5) + w.ph) * (jig + flow * 0.12 + roam * 0.5);
      tmpP.y += Math.sin(t * (1.7 + roam * 1.2) + w.ph * 2) * (jig + roam * 0.45);
      tmpP.z += Math.cos(t * (1.1 + roam) + w.ph) * (jig + flow * 0.1 + roam * 0.4);
      q.setFromAxisAngle(w.axis, w.ph + t * (0.2 + flow * 1.5 + roam * 2) * (ws < 0.05 ? 0.05 : 1));
      wO.setMatrixAt(i, m4.compose(tmpP, q, sc.setScalar(0.17)));
      for (let h = 0; h < 2; h++) {
        v2.copy(hOff[h]).applyQuaternion(q).add(tmpP);
        wH.setMatrixAt(i * 2 + h, m4.compose(v2, q, sc.setScalar(0.1)));
      }
    }
    const sj = 0.008 + 0.03 * kit.clamp(T / 801, 0, 1);
    let a = 0, b = 0;
    for (let i = 0; i < NS; i++) {
      const s = salt[i];
      tmpP.lerpVectors(s.s, s.l, ss);
      tmpP.x += Math.sin(t * (2.1 + ss * 1.5) + s.ph) * (sj + ss * 0.15);
      tmpP.y += Math.sin(t * 2.6 + s.ph * 2) * sj;
      tmpP.z += Math.cos(t * (1.9 + ss) + s.ph) * (sj + ss * 0.12);
      m4.compose(tmpP, q.identity(), sc.setScalar(s.na ? 0.12 : 0.2));
      if (s.na) sNa.setMatrixAt(a++, m4); else sCl.setMatrixAt(b++, m4);
    }
    for (const m of [wO, wH, sNa, sCl]) m.instanceMatrix.needsUpdate = true;
  }
  function hotText() {
    const T = hot.T;
    const w = T < 0 ? 'solid (ice)' : T < 100 ? 'liquid' : 'gas (steam)', s = T < 801 ? 'solid' : 'liquid (molten salt)';
    wTag.text = `Water: ${w.split(' ')[0]}`; sTag.text = `Salt: ${s.split(' ')[0]}`;
    ui.readout(`Temperature: <b>${T} °C</b><br>Water (H₂O): <b>${w}</b> · melts 0 °C, boils 100 °C<br>Salt (NaCl): <b>${s}</b> · melts about 801 °C`);
  }

  const st = { step: 0, quiz: false, time: 0, auto: false, row: null, slider: null, sel: -1, mol: 0 };

  function hideAll() {
    clusters.forEach(c => { c.g.visible = false; c.tag.show(false); });
    elemTag.show(false); compTag.show(false);
    models.forEach(m => { m.visible = false; });
    blocks.forEach(b => { b.visible = false; });
    stand.visible = false; massTag.show(false); molTag.show(false);
    hA.group.visible = hB.group.visible = false; hTagA.show(false); hTagB.show(false); pairTag.show(false);
    W.visible = false; wPairTag.show(false);
    na.group.visible = cl.group.visible = flyer.visible = false; naTag.show(false); clTag.show(false);
    LAT.visible = false; naLatTag.show(false); clLatTag.show(false);
    HOT.visible = false; wTag.show(false); sTag.show(false);
  }

  // ---- step helpers ----
  function pickKind(kind) {
    st.sel = kind;
    for (const c of clusters) c.sTo = kind === 'all' ? 1 : c.kind === kind ? 1.2 : 0.6;
    const txt = {
      element: '<b>Elements</b>: one kind of atom only. He (single atoms), H₂ and O₂ (molecules of two identical atoms).',
      compound: '<b>Compounds</b>: two or more kinds of atom bonded together. H₂O (2 H + 1 O) and CO₂ (1 C + 2 O).',
      all: 'Elements: <b>He, H₂, O₂</b> · Compounds: <b>H₂O, CO₂</b>. Molecules: H₂, O₂, H₂O, CO₂ (helium atoms stay single).',
    }[kind];
    ui.readout(txt);
  }

  function pickMol(i) {
    st.mol = i;
    const m = MOLS[i];
    models.forEach((g, j) => { g.visible = j === i; });
    const list = [];
    for (const [el, n] of m.atoms) for (let c = 0; c < n; c++) list.push(el);
    list.sort((a, b) => MASS[b] - MASS[a]);
    let y = 0;
    blocks.forEach((b, j) => {
      b.visible = j < list.length;
      if (j >= list.length) return;
      const h = MASS[list[j]] * H_PER_AMU;
      b.material = blockMats[list[j]];
      b.scale.set(1, Math.max(0.02, h - 0.03), 1);
      b.position.set(COLX, y + h / 2, 0);
      y += h;
    });
    colTop.position.set(COLX, y + 0.15, 0);
    const total = molMass(m);
    massTag.text = `${total} amu`;
    molTag.text = m.f;
    const sum = m.atoms.map(([el, n]) => `${n} × ${el} (${MASS[el]})`).join(' + ');
    ui.readout(`<b>${m.f}</b> (${m.name}): ${sum} = <b>${total} amu</b>`);
  }

  function setDistance(d) {
    hb.d = d;
    hb.sep = SEP(d);
    hA.group.position.set(-hb.sep / 2, 0.4, 0);
    hB.group.position.set(hb.sep / 2, 0.4, 0);
    pairAnchor.position.set(0, 0.4 + 0.25, 0);
    const f = kit.clamp((1.7 - hb.sep) / (1.7 - SEP(H2_BOND)), 0, 1);
    hb.fTo = f;
    const state = f === 0 ? 'shells not touching: <b>no bond</b>' : f < 1 ? 'shells overlap: the electrons start to be <b>shared</b>' : 'a shared pair: <b>covalent bond</b>, an H₂ molecule';
    ui.readout(`Distance between the nuclei: <b>${d} pm</b><br>${state}<br>Electrons in each atom's shell: <b>${f === 1 ? 2 : f > 0 ? '1 → 2' : 1}</b> of 2`);
  }

  function waterMode(mode) {
    wv.mode = mode;
    ui.readout(mode === 0
      ? 'Oxygen outer shell: 6 own (blue) + 2 shared from hydrogen (orange) = <b>8</b>. Each hydrogen: 1 own + 1 shared = <b>2</b>. Two shared pairs = <b>two covalent bonds</b>.'
      : 'Ball-and-stick: each stick is one shared pair (one covalent bond). H–O–H angle about <b>104.5°</b>. Molecular mass 2 × 1 + 16 = <b>18 amu</b>.');
  }

  function ionReset() {
    ion.t = -1; ion.phase = 0;
    na.set(11, 12, 11); cl.set(17, 18, 17);
    na.tint = i => (i === 10 ? YELLOW : null); na.recolor();
    cl.tint = null; cl.recolor();
    na.group.position.set(ION.na0, 0.2, 0); cl.group.position.set(ION.cl0, 0.2, 0);
    flyer.visible = false;
    naTag.text = 'Na'; clTag.text = 'Cl';
    naTop.position.y = na.outerRadius() + 0.25; clTop.position.y = cl.outerRadius() + 0.25;
    ionText();
  }
  function ionText() {
    ui.readout(ion.phase < 2
      ? 'Na: 11 protons, 11 electrons (<b>2, 8, 1</b>) · charge 0<br>Cl: 17 protons, 17 electrons (<b>2, 8, 7</b>) · charge 0'
      : 'Na⁺: 11 protons, 10 electrons (<b>2, 8</b>) · charge <b>+1</b><br>Cl⁻: 17 protons, 18 electrons (<b>2, 8, 8</b>) · charge <b>−1</b><br>Opposite charges attract: an <b>ionic bond</b>');
  }
  const ionGo = () => { if (ion.t < 0) { ion.t = 0; ion.phase = 0; } };

  function setLattice(n) {
    const { a, b } = buildLattice(n);
    ui.readout(`Ions: <b>${a + b}</b> → Na⁺ <b>${a}</b>, Cl⁻ <b>${b}</b><br>Ratio ${a === b ? '' : 'about '}<b>1 : 1</b>, so the formula is <b>NaCl</b> · one NaCl unit = 23 + 35.5 = <b>58.5 amu</b>`);
  }

  return {
    step(i, { isQuiz }) {
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: false, row: null, slider: null, sel: -1 });
      hideAll();
      if (i === 0) {
        view({ radius: 1.6, width: 5.4, yaw: 0, pitch: 0.12, target: [0, 0.25, 0] });
        clusters.forEach(c => { c.g.visible = true; c.tag.show(true); });
        elemTag.show(true); compTag.show(true);
        st.auto = true;
        st.row = ui.buttons([{ label: 'Elements', onClick: () => { st.auto = false; pickKind('element'); } }, { label: 'Compounds', onClick: () => { st.auto = false; pickKind('compound'); } }, { label: 'Show all', on: true, onClick: () => { st.auto = false; pickKind('all'); } }]);
        pickKind('all');
      }
      if (i === 1) {
        view({ radius: 2.0, width: 2.5, yaw: 0.15, pitch: 0.12, target: [0.4, 1.1, 0] });
        stand.visible = true; massTag.show(true); molTag.show(true);
        st.auto = true;
        st.row = ui.buttons(MOLS.map((m, j) => ({ label: m.f, on: j === 2, onClick: () => { st.auto = false; pickMol(j); } })));
        pickMol(2);
      }
      if (i === 2) {
        view({ radius: 1.5, width: 2.4, yaw: 0, pitch: 0.1, target: [0, 0.4, 0] });
        hA.group.visible = hB.group.visible = true; hTagA.show(true); hTagB.show(true);
        st.auto = true; hb.f = 0;
        st.slider = ui.slider({ label: 'Distance', min: H2_BOND, max: 250, step: 1, value: 220, unit: ' pm', onInput: v => { st.auto = false; setDistance(v); } });
        setDistance(220);
      }
      if (i === 3) {
        view({ radius: 2.05, yaw: 0, pitch: 0.1, target: [0, 0.12, 0] });
        W.visible = true;
        wv.s0 = 1; wv.s1 = 0;
        st.auto = true;
        st.row = ui.buttons([{ label: 'Shells', on: true, onClick: () => { st.auto = false; waterMode(0); } }, { label: 'Ball-and-stick', onClick: () => { st.auto = false; waterMode(1); } }]);
        waterMode(0);
      }
      if (i === 4) {
        view({ radius: 1.5, width: 3.6, yaw: 0, pitch: 0.1, target: [0, 0.3, 0] });
        na.group.visible = cl.group.visible = true; naTag.show(true); clTag.show(true);
        ionReset();
        st.auto = true;
        ui.buttons([{ label: 'Give the electron', onClick: () => { st.auto = false; ionGo(); } }, { label: 'Start again', onClick: () => { st.auto = false; ionReset(); } }]);
      }
      if (i === 5 || isQuiz) {
        view({ radius: 2.3, yaw: 0.5, pitch: 0.4, target: [0, 0, 0] });
        LAT.visible = true;
        LAT.rotation.set(0, 0, 0);
        if (!isQuiz) {
          naLatTag.show(true); clLatTag.show(true);
          st.auto = true;
          st.slider = ui.slider({ label: 'Ions along each edge', min: 2, max: NMAX, step: 1, value: 2, onInput: v => { st.auto = false; setLattice(v); } });
          setLattice(2);
        } else buildLattice(4);
      }
      if (i === 6) {
        view({ radius: 2.6, width: 4.6, yaw: 0, pitch: 0.18, target: [0, 1.2, 0] });
        HOT.visible = true; wTag.show(true); sTag.show(true);
        hot.T = -20; hot.wState = 0; hot.sState = 0; hot.t = 0;
        st.auto = true;
        st.slider = ui.slider({ label: 'Temperature', min: -20, max: 1000, step: 1, value: -20, unit: ' °C', onInput: v => { st.auto = false; hot.T = v; hotText(); } });
        hotText();
        drawHot(0);
      }
    },

    update(dt) {
      st.time += dt;
      const t = st.time;
      if (st.step === 0 && !st.quiz) {
        if (st.auto) { const kinds = ['all', 'element', 'compound'], n = Math.floor(t / 3) % 3; if (kinds[n] !== st.sel) { pickKind(kinds[n]); st.row?.select([2, 0, 1][n]); } }
        for (const c of clusters) {
          kit.follow(c, 's', c.sTo, dt, 5);
          c.g.scale.setScalar(c.s);
          for (const it of c.items) {
            it.m.position.copy(it.home);
            it.m.position.y += Math.sin(t * 1.1 + it.ph) * 0.08;
            it.m.position.x += Math.cos(t * 0.8 + it.ph) * 0.06;
            it.m.quaternion.setFromAxisAngle(it.axis, it.ph + t * 0.6);
          }
        }
      }
      if (st.step === 1 && !st.quiz) {
        if (st.auto) { const order = [2, 3, 4, 1, 0], j = order[Math.floor(t / 3) % order.length]; if (j !== st.mol) { pickMol(j); st.row?.select(j); } }
        models[st.mol].rotation.y = t * 0.6;
        models[st.mol].rotation.x = 0.25;
      }
      if (st.step === 2 && !st.quiz) {
        if (st.auto) {
          const d = Math.round(kit.lerp(220, H2_BOND, kit.ease(kit.clamp((t - 0.3) / 2.4, 0, 1))));
          if (d !== hb.d) { setDistance(d); st.slider?.set(d); }
          if (d === H2_BOND) st.auto = false;
        }
        kit.follow(hb, 'f', hb.fTo ?? 0, dt, 3);
        hb.wob += dt * 3;
        // While sharing, the electrons stop circling and stay in the overlap.
        hA.spin = hB.spin = 1.1 * (1 - hb.f);
        pairTag.show(hb.f > 0.8);
        hA.update(dt); hB.update(dt);
      }
      if (st.step === 3 && !st.quiz) {
        if (st.auto) { const m = Math.floor(t / 3.5) % 2; if (m !== wv.mode) { waterMode(m); st.row?.select(m); } }
        kit.follow(wv, 's0', wv.mode === 0 ? 1 : 0.001, dt, 6);
        kit.follow(wv, 's1', wv.mode === 1 ? 1 : 0.001, dt, 6);
        shellsView.scale.setScalar(wv.s0); shellsView.visible = wv.s0 > 0.01;
        stickWater.scale.setScalar(wv.s1); stickWater.visible = wv.s1 > 0.01;
        wPairTag.show(wv.mode === 0 && wv.s0 > 0.9);
        W.rotation.y = Math.sin(t * 0.5) * 0.35;
        oxy.update(dt);
      }
      if (st.step === 4 && !st.quiz) {
        if (st.auto && ion.t < 0 && t > 0.5) ionGo();
        if (ion.t >= 0) {
          ion.t += dt;
          if (ion.phase === 0 && ion.t > 0.4) {
            ion.phase = 1;
            na.group.updateMatrixWorld(true);
            na.electronWorld(10, ion.from);
            na.tint = null; na.set(11, 12, 10); na.recolor();
            flyer.visible = true;
          }
          if (ion.phase === 1) {
            const u = kit.clamp((ion.t - 0.4) / 1.2, 0, 1), e = kit.ease(u);
            ion.to.set(cl.group.position.x - cl.outerRadius(), cl.group.position.y, 0);
            flyer.position.lerpVectors(ion.from, ion.to, e);
            flyer.position.y += Math.sin(Math.PI * e) * 0.9;
            if (u >= 1) {
              ion.phase = 2; flyer.visible = false;
              cl.tint = i => (i === 17 ? YELLOW : null);
              cl.set(17, 18, 18);
              naTag.text = 'Na⁺'; clTag.text = 'Cl⁻';
              naTop.position.y = na.outerRadius() + 0.25;
              ionText();
            }
          }
          if (ion.phase === 2) {
            kit.follow(na.group.position, 'x', ION.na1, dt, 2.2);
            kit.follow(cl.group.position, 'x', ION.cl1, dt, 2.2);
          }
        }
        na.update(dt); cl.update(dt);
      }
      if ((st.step === 5 && !st.quiz) || st.quiz) {
        if (st.auto) { const n = kit.clamp(2 + Math.floor(t / 0.9), 2, NMAX); if (n !== lat.n) { setLattice(n); st.slider?.set(n); } if (n === NMAX) st.auto = false; }
        LAT.rotation.y = 0.35 + Math.sin(t * 0.3) * 0.3;
      }
      if (st.step === 6 && !st.quiz) {
        if (st.auto) {
          const T = Math.round(kit.lerp(-20, 1000, kit.clamp((t - 0.3) / 10, 0, 1)));
          if (T !== hot.T) { hot.T = T; st.slider?.set(T); hotText(); }
          if (T === 1000) st.auto = false;
        }
        drawHot(dt);
      }
      return true;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
