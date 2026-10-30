// Fuels and hydrocarbons (MS-PS1-6, KHTN 9). A bench with a station per step: alkane ball-and-stick
// models CH₄ … C₄H₁₀; the atoms of CH₄ + 2O₂ rearranging into CO₂ + 2H₂O; a Bunsen burner whose air
// hole sets a blue or a yellow sooty flame; a butane burner on a balance heating a can of water
// (Q = m·c·ΔT); a slice of rock where swamp plants become coal and sea life becomes oil and gas;
// a fractionating column for crude oil; and a power station, acid rain and a CO₂ bar chart.
import { bench, balance, thermometer, sign, paint, rand, tube } from '../_shared/labware.js';
import { CPK } from '../_shared/atoms.js';

const X = { hc: 0, burn: 8, bunsen: 16, energy: 24, fossil: 32, distil: 40, env: 48 };
const ALK = [
  { name: 'methane', f: 'CH₄', use: 'the main gas in natural gas' },
  { name: 'ethane', f: 'C₂H₆', use: 'found in natural gas; used to make plastics' },
  { name: 'propane', f: 'C₃H₈', use: 'bottled gas for barbecues and camping' },
  { name: 'butane', f: 'C₄H₁₀', use: 'the gas in lighters and camping stoves' },
];
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = n => String(n).split('').map(d => SUB[+d]).join('');
// Energy model for step 4: butane releases about 49.5 kJ per gram (2877 kJ/mol ÷ 58.1 g/mol);
// in this model 40% of it reaches the water.
const KJ_PER_G = 49.5, SHARE = 0.4, C_WATER = 4200, T0 = 20;
// Crude oil fractions, top of the column first. y = draw-off height, T = column temperature there (about).
const FR = [
  { name: 'Refinery gases', y: 3.3, T: 25, range: 'below about 25 °C', c: '1–4', use: 'bottled gas for cooking and heating', col: 0xdee2e6 },
  { name: 'Petrol', y: 2.75, T: 100, range: 'about 25–175 °C', c: '5–10', use: 'fuel for cars', col: 0xffe066 },
  { name: 'Kerosene', y: 2.2, T: 210, range: 'about 175–250 °C', c: '10–16', use: 'fuel for jet aircraft', col: 0xffc078 },
  { name: 'Diesel', y: 1.65, T: 300, range: 'about 250–350 °C', c: '15–20', use: 'fuel for lorries, buses and trains', col: 0xf08c00 },
  { name: 'Fuel oil', y: 1.1, T: 370, range: 'about 350–400 °C', c: '20–40', use: 'fuel for ships and power stations', col: 0x8d5524 },
  { name: 'Bitumen', y: 0.35, T: 400, range: 'above about 400 °C', c: 'over 40', use: 'roads and roofs', col: 0x2b2b2b },
];
// kg of CO₂ per GJ of heat from each fuel (IPCC default emission factors, rounded) and a sulfur level 0..1.
const FUELS = [
  { name: 'Coal', co2: 95, sulfur: 1, smoke: 0x495057, smokeOp: 0.6 },
  { name: 'Oil', co2: 74, sulfur: 0.6, smoke: 0x868e96, smokeOp: 0.45 },
  { name: 'Natural gas', co2: 56, sulfur: 0.03, smoke: 0xf1f3f5, smokeOp: 0.18 },
];

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  const ground = kit.stage(scene, { ground: 0xd8d2c8, sky: 0xe8f0f6, radius: 44 });
  ground.position.x = 24;
  const sun = kit.lights(scene, { sun: [4, 10, 7] });
  scene.add(sun.target);
  bench(k, { w: 58, d: 3.4, pos: [24, 0, 0] });
  const plain = (c, o = {}) => kit.mat(c, o);
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa5b1, metalness: 0.55, roughness: 0.35 });
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const tag = (text, parent, x, y, z, cls) => { const l = label(text, anchor(parent, x, y, z), { cls }); l.show(false); return l; };
  const station = x => { const g = new THREE.Group(); g.position.x = x; scene.add(g); return g; };
  const board = (parent, text, x, y, z, w = 1, font = 'bold 40px sans-serif') => {
    const s = sign(k, { parent, w, h: w * 0.25, px: 256, py: 64, text, font });
    s.position.set(x, y, z);
    return s;
  };
  const ball = new THREE.SphereGeometry(1, 20, 14);
  const stick = new THREE.CylinderGeometry(1, 1, 1, 10);
  const mC = plain(CPK.C, { roughness: 0.35 }), mH = plain(CPK.H, { roughness: 0.35 }), mO = plain(CPK.O, { roughness: 0.35 }), mStick = plain(0xc9d1d9, { roughness: 0.5 });
  const up = new THREE.Vector3(0, 1, 0), tv = new THREE.Vector3();
  const bond = (parent, a, b, r) => {
    const m = new THREE.Mesh(stick, mStick);
    tv.subVectors(b, a); const len = tv.length();
    m.position.addVectors(a, b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, tv.normalize());
    m.scale.set(r, len, r);
    parent.add(m);
    return m;
  };
  const flameGeo = new THREE.LatheGeometry([[0.001, 0], [0.62, 0.1], [1, 0.3], [0.88, 0.55], [0.5, 0.8], [0.001, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
  const flameMat = color => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });

  // ======================= Step 0: alkanes =======================
  const S0 = station(X.hc);
  const SA = 0.42;                                   // world units per 100 pm (1 Å)
  const DX = 1.258, DY = 0.889, CH = 1.09, CA = 0.5774, SNA = 0.8165;
  function alkane(n) {
    const g = new THREE.Group(); S0.add(g);
    const C = [];
    for (let i = 0; i < n; i++) C.push(new THREE.Vector3(i * DX - (n - 1) * DX / 2, (i % 2) * DY - (n > 1 ? DY / 2 : 0), 0));
    const H = [];
    if (n === 1) [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].forEach(d => H.push([0, new THREE.Vector3(...d).normalize().multiplyScalar(CH)]));
    else C.forEach((c, i) => {
      const b = [];
      if (i > 0) b.push(C[i - 1].clone().sub(c).normalize());
      if (i < n - 1) b.push(C[i + 1].clone().sub(c).normalize());
      if (b.length === 1) {
        // The zigzag would carry on here: put one H along that direction.
        const other = i === 0 ? C[1] : C[n - 2];
        const v = new THREE.Vector3(i === 0 ? -DX : DX, other.y - c.y, 0).normalize();
        H.push([i, v.clone().multiplyScalar(CH)]);
        b.push(v);
      }
      const d = b[0].clone().add(b[1]).multiplyScalar(-1).normalize(), p = new THREE.Vector3().crossVectors(b[0], b[1]).normalize();
      for (const s of [1, -1]) H.push([i, d.clone().multiplyScalar(CA).addScaledVector(p, s * SNA).multiplyScalar(CH)]);
    });
    const cs = C.map(c => { const m = new THREE.Mesh(ball, mC); m.scale.setScalar(0.34 * SA); m.position.copy(c).multiplyScalar(SA); m.castShadow = true; g.add(m); return m; });
    const hs = H.map(([i, v]) => { const m = new THREE.Mesh(ball, mH); m.scale.setScalar(0.24 * SA); m.position.copy(C[i]).add(v).multiplyScalar(SA); m.castShadow = true; g.add(m); return m; });
    for (let i = 0; i + 1 < n; i++) bond(g, cs[i].position, cs[i + 1].position, 0.075 * SA);
    H.forEach(([i], j) => bond(g, cs[i].position, hs[j].position, 0.075 * SA));
    g.position.y = 1.15;
    g.visible = false;
    const tC = label('Carbon', anchor(cs[0], 0, 1.2, 0), { cls: 'warm' }), tH = label('Hydrogen', anchor(hs[hs.length - 1], 0, 1.3, 0), { cls: 'cool' });
    tC.show(false); tH.show(false);
    return { g, tags: [tC, tH] };
  }
  const mols = [1, 2, 3, 4].map(alkane);
  const fSign = sign(k, { parent: S0, w: 1.5, h: 0.3, px: 512, py: 102, text: '', font: 'bold 64px sans-serif' });
  fSign.position.set(0, 0.2, 0.75); fSign.rotation.x = -0.45;
  const hc = { n: 1, auto: true, slider: null, msg: '' };
  function setN(n) {
    hc.n = n;
    mols.forEach((m, i) => { m.g.visible = i === n - 1; m.tags.forEach(t => t.show(st.step === 0 && i === n - 1)); });
    const a = ALK[n - 1];
    fSign.setText(`${a.f}  ${a.name}`);
    const msg = `Carbon atoms n = <b>${n}</b> · hydrogen atoms 2n + 2 = <b>${2 * n + 2}</b><br>C${n > 1 ? sub(n) : ''}H${sub(2 * n + 2)}: <b>${a.name}</b>, ${a.use}<br>Bonds: each C makes 4, each H makes 1`;
    if (msg !== hc.msg) { hc.msg = msg; ui.readout(msg); }
  }

  // ======================= Step 1: complete combustion (atoms rearrange) =======================
  const S1 = station(X.burn);
  const half = (104.5 / 2) * Math.PI / 180;
  const tet = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(d => new THREE.Vector3(...d).normalize().multiplyScalar(0.21));
  const wH = (o, s) => new THREE.Vector3(o.x + s * 0.19 * Math.sin(half), o.y - 0.19 * Math.cos(half), o.z);
  const pCH4 = new THREE.Vector3(-0.7, 0.95, 0), pO2a = new THREE.Vector3(0.5, 1.3, 0), pO2b = new THREE.Vector3(0.5, 0.6, 0);
  const pCO2 = new THREE.Vector3(-0.55, 0.95, 0), pW1 = new THREE.Vector3(0.65, 1.32, 0), pW2 = new THREE.Vector3(0.65, 0.6, 0);
  // [element, start, end]
  const ATOMS = [
    ['C', pCH4.clone(), pCO2.clone()],
    ['H', pCH4.clone().add(tet[0]), wH(pW1, 1)], ['H', pCH4.clone().add(tet[1]), wH(pW1, -1)],
    ['H', pCH4.clone().add(tet[2]), wH(pW2, 1)], ['H', pCH4.clone().add(tet[3]), wH(pW2, -1)],
    ['O', pO2a.clone().add({ x: -0.13, y: 0, z: 0 }), pCO2.clone().add({ x: -0.29, y: 0, z: 0 })],
    ['O', pO2a.clone().add({ x: 0.13, y: 0, z: 0 }), pCO2.clone().add({ x: 0.29, y: 0, z: 0 })],
    ['O', pO2b.clone().add({ x: -0.13, y: 0, z: 0 }), pW1.clone()],
    ['O', pO2b.clone().add({ x: 0.13, y: 0, z: 0 }), pW2.clone()],
  ];
  const RAD = { C: 0.17, H: 0.11, O: 0.16 }, MAT = { C: mC, H: mH, O: mO };
  const atomMeshes = ATOMS.map(([el, a]) => { const m = new THREE.Mesh(ball, MAT[el]); m.scale.setScalar(RAD[el]); m.position.copy(a); m.castShadow = true; S1.add(m); return m; });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff922b, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), glowMat);
  glow.position.set(0, 0.95, -0.2); S1.add(glow);
  const eq = sign(k, { parent: S1, w: 2.0, h: 0.33, px: 512, py: 84, text: 'CH₄ + 2O₂ → CO₂ + 2H₂O', font: 'bold 40px sans-serif' });
  eq.position.set(0, 0.2, 0.55); eq.rotation.x = -0.4;
  const tags1 = [tag('Methane', S1, pCH4.x, 1.32, 0), tag('Oxygen', S1, pO2a.x, 1.58, 0), tag('Carbon dioxide', S1, pCO2.x, 1.3, 0), tag('Water', S1, pW1.x, 1.62, 0)];
  const cb = { p: 0, auto: true, slider: null, msg: '' };
  function setBurn(p) {
    cb.p = p;
    const e = kit.ease(p);
    ATOMS.forEach(([, a, b], i) => {
      const m = atomMeshes[i];
      m.position.lerpVectors(a, b, e);
      m.position.y += Math.sin(Math.PI * p) * (0.25 + 0.2 * rand(i)) * (i % 2 ? 1 : -1);
      m.position.z += Math.sin(Math.PI * p) * 0.3 * (rand(i + 7) - 0.5);
    });
    glowMat.opacity = Math.sin(Math.PI * p) * 0.4;
    tags1[0].show(p < 0.35); tags1[1].show(p < 0.35); tags1[2].show(p > 0.65); tags1[3].show(p > 0.65);
    const msg = `Reaction progress: <b>${Math.round(p * 100)}%</b><br>${p < 0.35 ? 'Reactants: methane + oxygen' : p > 0.65 ? 'Products: carbon dioxide + water, and energy given out' : 'Bonds break and atoms rearrange…'}<br>Atoms on each side: <b>1 C · 4 H · 4 O</b> (none made, none lost)`;
    if (msg !== cb.msg) { cb.msg = msg; ui.readout(msg); }
  }

  // ======================= Step 2: Bunsen burner =======================
  const S2 = station(X.bunsen);
  kit.mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.06, 28), plain(0x343a40), [0, 0.03, 0], S2);
  kit.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.62, 18), steel, [0, 0.37, 0], S2);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.6, roughness: 0.35 });
  kit.mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.12, 18), brass, [0, 0.16, 0], S2);
  const hole = kit.mesh(new THREE.BoxGeometry(0.07, 1, 0.01), plain(0x111111), [0, 0.16, 0.088], S2);
  hole.castShadow = false;
  tube(k, [[-0.05, 0.09, 0], [-0.25, 0.07, 0.05], [-0.55, 0.03, 0.15], [-0.9, 0.02, 0.2]], { r: 0.03, parent: S2, mat: plain(0xe8590c, { roughness: 0.7 }) });
  const BT = 0.68;
  const fl = new THREE.Group(); fl.position.y = BT; S2.add(fl);
  const flO = new THREE.Mesh(flameGeo, flameMat(0x8ecbff)), flI = new THREE.Mesh(flameGeo, flameMat(0x1c7ed6));
  flO.renderOrder = 5; flI.renderOrder = 6; fl.add(flO, flI);
  const lumMat = new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const lum = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), lumMat); fl.add(lum);
  const cYO = new THREE.Color(0xffa41b), cBO = new THREE.Color(0x9fd0ff), cYI = new THREE.Color(0xfff3a0), cBI = new THREE.Color(0x1971c2);
  // Clamp stand holding a white dish above the flame.
  kit.mesh(new THREE.BoxGeometry(0.4, 0.03, 0.4), plain(0x495057), [0.75, 0.015, -0.1], S2);
  kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 8), steel, [0.8, 1.0, -0.1], S2);
  kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8).rotateZ(Math.PI / 2), steel, [0.5, 1.75, -0.05], S2);
  const DY0 = 1.72;
  const dish = kit.mesh(new THREE.LatheGeometry([[0.001, 0], [0.12, 0.005], [0.2, 0.04], [0.24, 0.1], [0.25, 0.11]].map(([x, y]) => new THREE.Vector2(x, y)), 24), plain(0xffffff, { roughness: 0.3, side: THREE.DoubleSide }), [0, DY0, 0], S2);
  const sootMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0, depthWrite: false });
  const soot = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20).rotateX(Math.PI / 2), sootMat);
  soot.position.y = DY0 - 0.003; S2.add(soot);
  const SOOT = 40;
  const specks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 6, 4), plain(0x1a1a1a), SOOT);
  specks.frustumCulled = false; specks.castShadow = false; specks.count = 0; S2.add(specks);
  const spA = specks.instanceMatrix.array;
  const tags2 = [tag('Air hole', S2, 0.18, 0.08, 0.1, 'cool'), tag('Soot', S2, 0.28, 1.45, 0)];
  const bn = { air: 1, auto: true, slider: null, soot: 0, msg: '' };
  function tickBunsen(dt, t) {
    const a = bn.air, y = 1 - a;
    const h = kit.lerp(0.42, 0.8, y), r = kit.lerp(0.075, 0.11, y);
    const fl1 = 1 + (0.03 + 0.14 * y) * Math.sin(t * (14 + 8 * a)) + 0.06 * y * Math.sin(t * 23 + 1);
    flO.scale.set(r * (1 + 0.05 * y * Math.sin(t * 9)), h * fl1, r);
    flI.scale.set(r * 0.55, h * kit.lerp(0.5, 0.35, y) * (2 - fl1), r * 0.55);
    flO.material.color.lerpColors(cBO, cYO, y); flO.material.opacity = kit.lerp(0.5, 0.9, y);
    flI.material.color.lerpColors(cBI, cYI, y);
    lum.scale.set(r * 1.5, h * 0.5, r * 1.5); lum.position.y = h * 0.45; lumMat.opacity = y * 0.12;
    hole.scale.y = Math.max(0.002, 0.08 * a);
    const sootRate = kit.clamp((0.6 - a) / 0.6, 0, 1);
    bn.soot = Math.min(1, bn.soot + dt * sootRate * 0.5);
    sootMat.opacity = bn.soot * 0.9;
    let c = 0;
    const n = Math.round(SOOT * sootRate), top = BT + h * 0.9;
    for (let i = 0; i < n; i++) {
      const ph = ((t * (0.8 + 0.4 * rand(i)) + rand(i + 3)) % 1 + 1) % 1, o = c * 16;
      spA[o] = 1; spA[o + 5] = 1; spA[o + 10] = 1; spA[o + 15] = 1;
      spA[o + 1] = spA[o + 2] = spA[o + 3] = spA[o + 4] = spA[o + 6] = spA[o + 7] = spA[o + 8] = spA[o + 9] = spA[o + 11] = 0;
      spA[o + 12] = (rand(i + 9) - 0.5) * 0.18 * (0.4 + ph) + Math.sin(t * 2 + i) * 0.02;
      spA[o + 13] = top + ph * (DY0 - top - 0.02);
      spA[o + 14] = (rand(i + 17) - 0.5) * 0.12;
      c++;
    }
    specks.count = c; specks.instanceMatrix.needsUpdate = true;
    tags2[1].show(st.step === 2 && sootRate > 0.2);
    const pct = Math.round(a * 100);
    const state = a >= 0.7 ? 'Plenty of oxygen: <b>complete combustion</b>. Blue, hot, clean flame.<br>CH₄ + 2O₂ → CO₂ + 2H₂O'
      : a >= 0.35 ? 'Less oxygen: the flame turns partly yellow; some <b>incomplete combustion</b>.'
      : 'Not enough oxygen: <b>incomplete combustion</b>. Yellow, sooty flame that makes soot (C) and toxic carbon monoxide (CO).<br>2CH₄ + 3O₂ → 2CO + 4H₂O';
    const msg = `Air hole: <b>${pct === 0 ? 'closed' : pct === 100 ? 'open' : pct + '% open'}</b><br>${state}`;
    if (msg !== bn.msg) { bn.msg = msg; ui.readout(msg); }
    return true;
  }

  // ======================= Step 3: energy from a fuel (calorimeter) =======================
  const S3 = station(X.energy);
  const bal = balance(k, { parent: S3, pos: [0, 0, 0], w: 1.0, d: 0.9 });
  kit.mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 24), plain(0x1c7ed6, { roughness: 0.4 }), [0, bal.top + 0.13, -0.05], S3);
  kit.mesh(new THREE.BoxGeometry(0.2, 0.06, 0.18), plain(0xffffff), [0, bal.top + 0.14, 0.05], S3);
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.08, 12), steel, [0, bal.top + 0.3, -0.05], S3);
  kit.mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.04, 16), steel, [0, bal.top + 0.36, -0.05], S3);
  const FB = bal.top + 0.38;
  const cf = new THREE.Group(); cf.position.set(0, FB, -0.05); S3.add(cf);
  const cfO = new THREE.Mesh(flameGeo, flameMat(0x9fd0ff)), cfI = new THREE.Mesh(flameGeo, flameMat(0x1971c2));
  cfO.renderOrder = 5; cfI.renderOrder = 6; cfO.material.opacity = 0.55;
  cfO.scale.set(0.07, 0.2, 0.07); cfI.scale.set(0.04, 0.1, 0.04); cf.add(cfO, cfI);
  // Clamp stand and the copper can of water.
  kit.mesh(new THREE.BoxGeometry(0.4, 0.03, 0.4), plain(0x495057), [-0.85, 0.015, -0.1], S3);
  kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 8), steel, [-0.9, 0.95, -0.1], S3);
  kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 8).rotateZ(Math.PI / 2), steel, [-0.55, 1.15, -0.05], S3);
  const CANB = FB + 0.24, CANR = 0.24, CANH = 0.42;
  const copper = new THREE.MeshStandardMaterial({ color: 0xe39a72, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
  kit.mesh(new THREE.CylinderGeometry(CANR, CANR, CANH, 28, 1, true), copper, [0, CANB + CANH / 2, -0.05], S3).receiveShadow = false;
  kit.mesh(new THREE.CircleGeometry(CANR, 28).rotateX(Math.PI / 2), copper, [0, CANB, -0.05], S3);
  const water = kit.mesh(new THREE.CylinderGeometry(CANR * 0.96, CANR * 0.96, 1, 28).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.8 }), [0, CANB + 0.005, -0.05], S3);
  water.castShadow = false;
  const th = thermometer(k, { parent: S3, pos: [0.06, CANB + 0.04, -0.05], h: 0.85, min: 0, max: 100 });
  const tags3 = [tag('Water', S3, -0.12, CANB + CANH + 0.02, 0.2, 'cool'), tag('Butane burner', S3, 0.42, bal.top + 0.25, 0.1)];
  const en = { fuel: 0, mw: 0.2, auto: true, fuelSlider: null, msg: '' };
  function setEnergy() {
    const Qfuel = en.fuel * KJ_PER_G * 1000, Q = Qfuel * SHARE, dT = Q / (en.mw * C_WATER), T = T0 + dT;
    th.set(T);
    bal.set(250 - en.fuel);
    water.scale.y = kit.lerp(0.13, 0.33, (en.mw - 0.15) / 0.25);
    const r0 = n => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
    const msg = `Butane burned: <b>${en.fuel.toFixed(1)} g</b> → about ${r0(Qfuel)} J released<br>Model: about 40% reaches the water → <b>Q ≈ ${r0(Q)} J</b><br>Water: ${en.mw.toFixed(2)} kg · temperature ${T0} → <b>${T.toFixed(1)} °C</b> (ΔT = ${dT.toFixed(1)} °C)<br>Q = m·c·ΔT = ${en.mw.toFixed(2)} kg × 4200 J/(kg·°C) × ${dT.toFixed(1)} °C`;
    if (msg !== en.msg) { en.msg = msg; ui.readout(msg); }
  }

  // ======================= Step 4: how fossil fuels formed =======================
  const S4 = station(X.fossil);
  const FW = 3.0, FD = 1.0, BASE = 0.3, ORG0 = 0.26, ORG1 = 0.09, LAY = 0.21, NL = 4;
  kit.mesh(new THREE.BoxGeometry(FW, BASE, FD), plain(0x6c6f73, { roughness: 0.9 }), [0, BASE / 2, 0], S4);
  const box1 = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const plantMat = plain(0x5c940d, { roughness: 0.9 }), seaMat = plain(0x3f9e8f, { roughness: 0.9 });
  const plantL = kit.mesh(box1, plantMat, [-FW / 4, BASE, 0], S4); plantL.scale.set(FW / 2, ORG0, FD);
  const seaL = kit.mesh(box1, seaMat, [FW / 4, BASE, 0], S4); seaL.scale.set(FW / 2, ORG0, FD);
  const LCOL = [0xd9b98c, 0xa8a29e, 0xc9a66b, 0x7c7f86];
  const layers = LCOL.map(c => { const m = kit.mesh(box1, plain(c, { roughness: 0.95 }), [0, 0, 0], S4); m.scale.set(FW, 0.001, FD); return m; });
  const seaWater = kit.mesh(box1, new THREE.MeshStandardMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.45, depthWrite: false }), [FW / 4, 0, 0], S4);
  seaWater.castShadow = false;
  const trees = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); S4.add(g);
    kit.mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.4, 8).translate(0, 0.2, 0), plain(0x6b4f2a), [0, 0, 0], g);
    const fern = plain(0x2b8a3e);
    for (let j = 0; j < 5; j++) { const f = kit.mesh(new THREE.ConeGeometry(0.04, 0.28, 6).translate(0, 0.14, 0), fern, [0, 0.4, 0], g); f.rotation.set(1.0, j * 1.256, 0, 'YXZ'); }
    g.position.set(-1.3 + i * 0.36, 0, (rand(i) - 0.5) * 0.5);
    trees.push(g);
  }
  const oilMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.15, metalness: 0.2 });
  const gasMat = new THREE.MeshStandardMaterial({ color: 0xfff3bf, roughness: 0.6, transparent: true, opacity: 0.9 });
  const oil = kit.mesh(new THREE.SphereGeometry(1, 20, 12), oilMat, [0.75, 0, 0.32], S4);
  const gas = kit.mesh(new THREE.SphereGeometry(1, 20, 12), gasMat, [0.75, 0, 0.32], S4);
  const rig = new THREE.Group(); S4.add(rig);
  const rigM = plain(0xc92a2a, { roughness: 0.5 });
  const rigTop = new THREE.Vector3(0, 0.6, 0);
  for (const [x, z] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) { const m = bond(rig, new THREE.Vector3(x, 0, z), rigTop, 0.012); m.material = rigM; }
  for (const yy of [0.15, 0.32]) { const w = 0.13 * (1 - yy / 0.6) * 2; kit.mesh(new THREE.BoxGeometry(w, 0.015, w), rigM, [0, yy, 0], rig); }
  kit.mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), rigM, [0, 0.61, 0], rig);
  const pipe = kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6).translate(0, -0.5, 0), steel, [0, 0, 0], rig);
  const tags4 = [tag('Swamp plants', plantL, 0, 1.0, 0.5), tag('Tiny sea life', seaL, 0, 1.0, 0.5), tag('Oil', oil, 0, -0.6, 1), tag('Natural gas', gas, 0, 1.6, 1, 'cool')];
  const fo = { my: 0, auto: true, slider: null, msg: '' };
  function setFossil(my) {
    fo.my = my;
    const org = kit.lerp(ORG0, ORG1, kit.clamp((my - 40) / 200, 0, 1));
    plantL.scale.y = org; seaL.scale.y = org;
    const coalF = kit.clamp((my - 40) / 200, 0, 1);
    plantMat.color.setHex(0x5c940d).lerp(C_PEAT, Math.min(1, coalF * 2)).lerp(C_COAL, Math.max(0, coalF * 2 - 1));
    seaMat.color.setHex(0x3f9e8f).lerp(C_PEAT, coalF);
    let y = BASE + org;
    layers.forEach((m, j) => {
      const g = kit.clamp((my - (20 + j * 62)) / 55, 0, 1);
      m.scale.y = Math.max(0.001, g * LAY); m.position.y = y; m.visible = g > 0;
      y += g * LAY;
    });
    const surf = y;
    trees.forEach((tr, i) => { const s = 1 - kit.clamp((my - 5 - i * 4) / 30, 0, 1); tr.visible = s > 0.01; tr.scale.setScalar(Math.max(0.01, s)); tr.position.y = BASE + org; tr.rotation.z = (1 - s) * 1.2; });
    const sea = 1 - kit.clamp((my - 180) / 60, 0, 1);
    seaWater.visible = sea > 0.01; seaWater.position.y = surf; seaWater.scale.set(FW / 2, 0.35 * sea + 0.001, FD);
    const og = kit.clamp((my - 140) / 110, 0, 1), oy = BASE + ORG1 + LAY * 2.1;
    oil.visible = gas.visible = og > 0.01;
    oil.scale.set(0.45 * og + 0.001, 0.09 * og + 0.001, 0.21); oil.position.y = oy;
    gas.scale.set(0.32 * og + 0.001, 0.06 * og + 0.001, 0.2); gas.position.y = oy + 0.12 * og;
    rig.visible = my >= 270; rig.position.set(0.75, surf, 0.32);
    pipe.scale.y = Math.max(0.01, surf - (oy + 0.06));
    tags4[0].text = coalF < 0.3 ? 'Swamp plants' : coalF < 0.7 ? 'Peat' : 'Coal';
    tags4[1].show(st.step === 4 && og < 0.4);
    tags4[2].show(st.step === 4 && og > 0.5); tags4[3].show(st.step === 4 && og > 0.5);
    const stage = my < 30 ? 'Plants grow in a swamp; tiny organisms live in the sea.' : my < 140 ? 'Dead plants and sea life are buried under mud and sand. Little oxygen reaches them, so they do not rot away.' : my < 250 ? 'Heat and pressure slowly change them: the plants into coal, the sea life into oil and natural gas, which rise until a rock layer traps them.' : 'Today we mine the coal and drill down to the oil and gas.';
    const msg = `Time passed: <b>${my} million years</b><br>${stage}<br>Fossil fuels take millions of years to form, so they are <b>non-renewable</b>.`;
    if (msg !== fo.msg) { fo.msg = msg; ui.readout(msg); }
  }
  const C_PEAT = new THREE.Color(0x6b4f2a), C_COAL = new THREE.Color(0x151515);

  // ======================= Step 5: fractional distillation =======================
  const S5 = station(X.distil);
  const COL0 = 0.2, COL1 = 3.45, CR = 0.42;
  const gradTex = paint(THREE, 8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4dabf7'); gr.addColorStop(0.5, '#ffd43b'); gr.addColorStop(1, '#f03e3e'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const colMat = new THREE.MeshStandardMaterial({ map: gradTex, transparent: true, opacity: 0.4, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, COL1 - COL0, 28, 1, true), colMat);
  column.position.y = (COL0 + COL1) / 2; column.renderOrder = 3; S5.add(column);
  kit.mesh(new THREE.SphereGeometry(CR, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel, [0, COL1, 0], S5);
  kit.mesh(new THREE.CylinderGeometry(CR + 0.02, CR + 0.05, 0.2, 28), steel, [0, 0.1, 0], S5);
  const trayMat = new THREE.MeshStandardMaterial({ color: 0xadb5bd, transparent: true, opacity: 0.55, depthWrite: false });
  FR.slice(1, 5).forEach(f => { const t = new THREE.Mesh(new THREE.CylinderGeometry(CR * 0.97, CR * 0.97, 0.02, 24), trayMat); t.position.y = f.y - 0.12; t.renderOrder = 2; S5.add(t); });
  FR.forEach((f, j) => {
    const yy = j === 5 ? 0.3 : f.y;
    tube(k, [[CR - 0.02, yy, 0], [0.8, yy, 0], [1.15, yy, 0]], { r: 0.045, parent: S5, mat: steel });
    kit.mesh(new THREE.SphereGeometry(0.09, 14, 10), plain(f.col, { roughness: 0.3 }), [1.2, yy, 0], S5);
    board(S5, f.name, 1.82, yy, 0, 1.0, f.name.length > 10 ? 'bold 30px sans-serif' : 'bold 36px sans-serif');
  });
  // Furnace heating the crude oil, and the pipe into the bottom of the column.
  kit.mesh(new THREE.BoxGeometry(0.6, 0.6, 0.55), plain(0x7c3a2d, { roughness: 0.9 }), [-1.3, 0.3, 0], S5);
  const fGlow = kit.mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshBasicMaterial({ color: 0xff7b1a }), [-1.3, 0.2, 0.276], S5);
  fGlow.castShadow = false;
  tube(k, [[-1.0, 0.45, 0], [-0.7, 0.45, 0], [-0.42, 0.45, 0]], { r: 0.05, parent: S5, mat: plain(0x343a40) });
  board(S5, 'about 400 °C', -1.3, 0.85, 0, 0.9, 'bold 38px sans-serif');
  board(S5, 'about 25 °C', -0.95, 3.35, 0, 0.8, 'bold 38px sans-serif');
  const tags5 = [tag('Crude oil', S5, -1.3, 1.05, 0, 'warm')];
  const VAP = 72;
  const vap = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 }), VAP);
  vap.frustumCulled = false; vap.castShadow = false; vap.renderOrder = 4; S5.add(vap);
  const cls = i => i % 6;
  for (let i = 0; i < VAP; i++) vap.setColorAt(i, new THREE.Color(FR[cls(i)].col));
  vap.instanceColor.needsUpdate = true;
  const vA = vap.instanceMatrix.array;
  const ring = kit.mesh(new THREE.TorusGeometry(CR + 0.06, 0.025, 8, 36).rotateX(Math.PI / 2), plain(0x1f6feb, { roughness: 0.3 }), [0, 1, 0], S5);
  const ringTag = label('Here', anchor(ring, -CR - 0.18, 0, 0), { cls: 'cool' }); ringTag.show(false);
  const tempAt = y => { // piecewise linear through the draw-off points
    if (y >= FR[0].y) return FR[0].T;
    for (let j = 0; j < 5; j++) { const a = FR[j], b = FR[j + 1]; if (y >= b.y) return kit.lerp(b.T, a.T, (y - b.y) / (a.y - b.y)); }
    return FR[5].T;
  };
  const fracAt = y => { let best = 0, d = 9; FR.forEach((f, j) => { const dd = Math.abs(f.y - y); if (dd < d) { d = dd; best = j; } }); return best; };
  const ds = { h: 0, auto: true, slider: null, msg: '' };
  function setHeight(h) {
    ds.h = h;
    const y = kit.lerp(0.35, 3.3, h / 100);
    ring.position.y = y;
    const f = FR[fracAt(y)], T = Math.round(tempAt(y) / 10) * 10 || 20;
    const msg = `Height: <b>${Math.round(h)}%</b> of the column · temperature about <b>${Math.max(20, T)} °C</b><br>Fraction here: <b>${f.name}</b> (boils ${f.range}; about ${f.c} carbon atoms)<br>Used for: ${f.use}`;
    if (msg !== ds.msg) { ds.msg = msg; ui.readout(msg); }
  }
  function tickDistil(t) {
    for (let i = 0; i < VAP; i++) {
      const j = cls(i), f = FR[j], o = i * 16;
      const ph = ((t * (0.16 + 0.05 * rand(i)) + rand(i + 31)) % 1 + 1) % 1;
      let x, y, z = (rand(i + 7) - 0.5) * 0.4;
      if (j === 5) { x = kit.lerp(-0.35, 1.15, ph); y = 0.3; z *= 0.3; }
      else if (ph < 0.75) { const q = ph / 0.75; y = kit.lerp(0.45, f.y, q); x = Math.sin(t * 1.5 + i * 2.1) * 0.25; }
      else { const q = (ph - 0.75) / 0.25; x = kit.lerp(0.2, 1.15, q); y = f.y; z *= 1 - q; }
      vA[o] = 1; vA[o + 5] = 1; vA[o + 10] = 1; vA[o + 15] = 1;
      vA[o + 12] = x; vA[o + 13] = y; vA[o + 14] = z;
    }
    vap.instanceMatrix.needsUpdate = true;
    fGlow.material.color.setHSL(0.07, 1, 0.5 + 0.06 * Math.sin(t * 6));
    return true;
  }

  // ======================= Step 6: fuels and the environment =======================
  const S6 = station(X.env);
  kit.mesh(new THREE.BoxGeometry(5.6, 0.04, 2.0), plain(0x8ac926, { roughness: 1 }), [0.35, 0.02, 0], S6).castShadow = false;
  kit.mesh(new THREE.BoxGeometry(0.85, 0.5, 0.6), plain(0xced4da), [-1.75, 0.29, -0.2], S6);
  kit.mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), plain(0xadb5bd), [-1.15, 0.19, -0.2], S6);
  kit.mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.2, 16), plain(0xe9ecef), [-1.95, 0.64, -0.3], S6);
  kit.mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.1, 16), plain(0xe03131), [-1.95, 1.1, -0.3], S6);
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0x495057, transparent: true, opacity: 0.6, depthWrite: false });
  const puffs = [0, 1, 2, 3, 4, 5].map(() => { const m = kit.mesh(new THREE.SphereGeometry(0.15, 12, 8), smokeMat, [0, 0, 0], S6); m.castShadow = false; return m; });
  const so2 = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: 0xfab005 }), 24);
  so2.frustumCulled = false; so2.count = 0; S6.add(so2);
  const soA = so2.instanceMatrix.array;
  const cloudMat = plain(0xf8f9fa, { roughness: 1 });
  [[0, 0, 0.32], [0.3, 0.05, 0.26], [-0.3, -0.02, 0.24], [0.12, 0.15, 0.24], [0.5, -0.05, 0.18]].forEach(([x, y, r]) => kit.mesh(new THREE.SphereGeometry(r, 14, 10), cloudMat, [0.85 + x, 1.95 + y, -0.1], S6).castShadow = false);
  const RAIN = 46;
  const rainMat = new THREE.MeshBasicMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.8 });
  const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.01, 0.1, 0.01), rainMat, RAIN);
  rain.frustumCulled = false; rain.castShadow = false; S6.add(rain);
  const rA = rain.instanceMatrix.array;
  const leafMats = [];
  [[0.35, -0.1], [0.85, 0.25], [1.3, -0.15], [0.6, -0.45]].forEach(([x, z], i) => {
    kit.mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.4, 8).translate(0, 0.2, 0), plain(0x6b4f2a), [x, 0.04, z], S6);
    const lm = plain(0x2f9e44, { roughness: 0.8 }); leafMats.push(lm);
    kit.mesh(new THREE.IcosahedronGeometry(0.22 + 0.04 * rand(i), 1), lm, [x, 0.6, z], S6);
  });
  kit.mesh(new THREE.CircleGeometry(0.4, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x339af0, roughness: 0.1 }), [1.05, 0.045, 0.55], S6).castShadow = false;
  // CO₂ bar chart: kg of CO₂ per GJ of heat.
  const barMats = FUELS.map(() => plain(0x868e96, { roughness: 0.5 }));
  FUELS.forEach((f, i) => { const m = kit.mesh(box1, barMats[i], [2.0 + i * 0.46, 0.04, 0.1], S6); m.scale.set(0.32, f.co2 * 0.012, 0.32); });
  FUELS.forEach((f, i) => board(S6, String(f.co2), 2.0 + i * 0.46, 0.04 + f.co2 * 0.012 + 0.14, 0.1, 0.44, 'bold 50px sans-serif'));
  ['Coal', 'Oil', 'Gas'].forEach((n, i) => { const s = board(S6, n, 2.0 + i * 0.46, 0.1, 0.5, 0.44, 'bold 46px sans-serif'); s.rotation.x = -0.6; });
  board(S6, 'kg CO₂ per GJ', 2.46, 1.62, 0.1, 1.3, 'bold 28px sans-serif');
  const tags6 = [tag('Power station', S6, -1.6, 0.6, 0.1), tag('Acid rain', S6, 0.85, 1.45, -0.1, 'warm')];
  const C_LEAF = new THREE.Color(0x2f9e44), C_DEAD = new THREE.Color(0x9c6b30), C_RAIN = new THREE.Color(0x4dabf7), C_ACID = new THREE.Color(0xc0d72f);
  const C_HI = new THREE.Color(0x1f6feb), C_LO = new THREE.Color(0xced4da), C_SM = new THREE.Color();
  const ev = { fuel: 0, clean: false, acid: 1, acidTo: 1, row: null, msg: '' };
  function setFuel(i) {
    ev.fuel = i;
    const f = FUELS[i], s = f.sulfur * (ev.clean ? 0.08 : 1);
    ev.acidTo = s;
    barMats.forEach((m, j) => m.color.copy(j === i ? C_HI : C_LO));
    const msg = `Fuel: <b>${f.name}</b> · CO₂: about <b>${f.co2} kg per GJ</b> of heat (coal 95 · oil 74 · gas 56)<br>Sulfur dioxide: ${s > 0.5 ? '<b>a lot</b>' : s > 0.2 ? 'some' : 'almost none'} → ${s > 0.2 ? '<b>acid rain</b> harms trees, lakes and buildings' : 'no acid rain'}${ev.clean ? '<br>Sulfur removed: the acid rain stops, but the CO₂ does not change.' : ''}`;
    if (msg !== ev.msg) { ev.msg = msg; ui.readout(msg); }
  }
  function tickEnv(dt, t) {
    const f = FUELS[ev.fuel];
    kit.follow(ev, 'acid', ev.acidTo, dt, 2);
    C_SM.set(f.smoke); smokeMat.color.lerp(C_SM, Math.min(1, dt * 4)); smokeMat.opacity += (f.smokeOp - smokeMat.opacity) * Math.min(1, dt * 4);
    puffs.forEach((m, i) => { const p = ((t * 0.22 + i / 6) % 1 + 1) % 1; m.position.set(-1.95 + p * 1.6, 1.2 + p * 0.65, -0.3); m.scale.setScalar(0.5 + p * 1.6); });
    const nS = Math.round(24 * kit.clamp(ev.acid, 0, 1));
    for (let i = 0; i < nS; i++) { const p = ((t * 0.22 + rand(i) ) % 1 + 1) % 1, o = i * 16; soA[o] = 1; soA[o + 5] = 1; soA[o + 10] = 1; soA[o + 15] = 1; soA[o + 12] = -1.95 + p * 1.6 + (rand(i + 3) - 0.5) * 0.3 * (0.4 + p); soA[o + 13] = 1.2 + p * 0.65 + (rand(i + 5) - 0.5) * 0.25 * (0.4 + p); soA[o + 14] = -0.3 + (rand(i + 8) - 0.5) * 0.3; }
    so2.count = nS; so2.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < RAIN; i++) { const ph = ((t * (1.3 + 0.3 * rand(i)) + rand(i + 50)) % 1 + 1) % 1, o = i * 16; rA[o] = 1; rA[o + 5] = 1; rA[o + 10] = 1; rA[o + 15] = 1; rA[o + 12] = 0.35 + rand(i + 100) * 1.1; rA[o + 13] = 1.75 - ph * 1.7; rA[o + 14] = -0.5 + rand(i + 200) * 0.8; }
    rain.instanceMatrix.needsUpdate = true;
    rainMat.color.lerpColors(C_RAIN, C_ACID, ev.acid);
    leafMats.forEach(m => m.color.lerpColors(C_LEAF, C_DEAD, ev.acid * 0.85));
    tags6[1].text = ev.acid > 0.3 ? 'Acid rain' : 'Rain';
    return true;
  }

  // ======================= Steps =======================
  const stations = [S0, S1, S2, S3, S4, S5, S6];
  const keys = Object.keys(X);
  const tagSets = [[], tags1, tags2, tags3, tags4, tags5, tags6];
  const st = { step: 0, time: 0, quiz: false, plan: [] };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.time = 0; st.plan = [];
      const si = isQuiz ? 5 : i;
      stations.forEach((g, j) => { g.visible = j === si; });
      tagSets.flat().forEach(t => t.show(false));
      mols.forEach(m => m.tags.forEach(t => t.show(false)));
      ringTag.show(false);
      if (!isQuiz && i !== 4 && i !== 1) tagSets[i].forEach(t => t.show(true));
      sun.position.set(X[keys[si]] + 4, 10, 7);
      sun.target.position.set(X[keys[si]], 0, 0);
      sun.target.updateMatrixWorld();
      if (i === 0) {
        view({ radius: 1.05, width: 1.55, yaw: 0, pitch: 0.25, target: [X.hc, 0.85, 0.2] });
        hc.auto = true; hc.msg = '';
        hc.slider = ui.slider({ label: 'Carbon atoms', min: 1, max: 4, step: 1, value: 1, onInput: v => { hc.auto = false; setN(v); } });
        setN(1);
      }
      if (i === 1) {
        view({ radius: 0.95, width: 1.35, yaw: 0, pitch: 0.2, target: [X.burn, 0.85, 0] });
        cb.auto = true; cb.msg = '';
        cb.slider = ui.slider({ label: 'Reaction progress', min: 0, max: 100, step: 1, value: 0, unit: '%', onInput: v => { cb.auto = false; setBurn(v / 100); } });
        setBurn(0);
      }
      if (i === 2) {
        view({ radius: 1.05, width: 0.9, yaw: 0, pitch: 0.18, target: [X.bunsen + 0.1, 0.95, 0] });
        bn.auto = true; bn.air = 1; bn.soot = 0; bn.msg = '';
        bn.slider = ui.slider({ label: 'Air hole', min: 0, max: 100, step: 5, value: 100, format: v => (v === 0 ? 'closed' : v === 100 ? 'open' : `${v}% open`), onInput: v => { bn.auto = false; bn.air = v / 100; } });
      }
      if (i === 3) {
        view({ radius: 1.1, width: 1.0, yaw: 0, pitch: 0.32, target: [X.energy - 0.15, 1.0, 0] });
        en.auto = true; en.fuel = 0; en.mw = 0.2; en.msg = '';
        en.fuelSlider = ui.slider({ label: 'Butane burned', min: 0, max: 1.5, step: 0.1, value: 0, unit: ' g', format: v => v.toFixed(1), onInput: v => { en.auto = false; en.fuel = v; setEnergy(); } });
        ui.slider({ label: 'Water mass', min: 0.15, max: 0.4, step: 0.05, value: 0.2, unit: ' kg', format: v => v.toFixed(2), onInput: v => { en.auto = false; en.mw = v; setEnergy(); } });
        setEnergy();
      }
      if (i === 4) {
        view({ radius: 0.95, width: 1.65, yaw: 0.25, pitch: 0.28, target: [X.fossil, 0.75, 0] });
        fo.auto = true; fo.msg = '';
        tags4[0].show(true);
        fo.slider = ui.slider({ label: 'Time', min: 0, max: 300, step: 10, value: 0, format: v => `${v} million years`, onInput: v => { fo.auto = false; setFossil(v); } });
        setFossil(0);
      }
      if (i === 5 || isQuiz) {
        view(isQuiz ? { radius: 1.9, width: 1.9, yaw: -0.25, pitch: 0.15, target: [X.distil + 0.3, 1.8, 0] } : { radius: 1.85, width: 1.85, yaw: 0, pitch: 0.1, target: [X.distil + 0.25, 1.8, 0] });
        ring.visible = !isQuiz;
        if (!isQuiz) {
          ds.auto = true; ds.msg = ''; ringTag.show(true);
          ds.slider = ui.slider({ label: 'Height in the column', min: 0, max: 100, step: 1, value: 0, unit: '%', onInput: v => { ds.auto = false; setHeight(v); } });
          setHeight(0);
        } else tags5.forEach(t => t.show(false));
      }
      if (i === 6) {
        view({ radius: 1.1, width: 2.7, yaw: 0, pitch: 0.22, target: [X.env + 0.45, 0.9, 0] });
        ev.clean = false; ev.msg = '';
        ev.row = ui.buttons(FUELS.map((f, j) => ({ label: f.name, on: j === 2, onClick: () => { st.plan = []; setFuel(j); } })));
        ui.toggle({ label: 'Remove the sulfur', value: false, onChange: v => { st.plan = []; ev.clean = v; setFuel(ev.fuel); } });
        setFuel(2); ev.acid = ev.acidTo;
        st.plan = [[1.0, () => { setFuel(1); ev.row.select(1); }], [2.0, () => { setFuel(0); ev.row.select(0); }]];
      }
    },

    update(dt, t) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step, T = st.time;
      if (s === 0) {
        if (hc.auto) { const n = Math.min(4, 1 + Math.floor(T / 0.8)); if (n !== hc.n) { setN(n); hc.slider.set(n); } }
        mols.forEach(m => { m.g.rotation.y = Math.sin(t * 0.5) * 0.6; m.g.rotation.x = 0.15; });
        return true;
      }
      if (s === 1) {
        if (cb.auto) { const p = Math.min(1, Math.max(0, (T - 0.4) / 2.4)); if (Math.abs(p - cb.p) > 1e-4) { setBurn(p); cb.slider.set(Math.round(p * 100)); } }
        return cb.auto && T < 3.2;
      }
      if (s === 2) {
        if (bn.auto) { const a = Math.round(kit.clamp(1 - (T - 0.6) / 1.8, 0, 1) * 20) / 20; if (a !== bn.air) { bn.air = a; bn.slider.set(Math.round(a * 100)); } }
        return tickBunsen(dt, t);
      }
      if (s === 3) {
        if (en.auto) { const f = Math.round(kit.clamp((T - 0.3) / 2.6, 0, 1) * 10) / 10; if (f !== en.fuel) { en.fuel = f; en.fuelSlider.set(f); setEnergy(); } }
        const fk = 1 + 0.08 * Math.sin(t * 19);
        cfO.scale.y = 0.2 * fk; cfI.scale.y = 0.1 * (2 - fk);
        return true;
      }
      if (s === 4) {
        if (fo.auto) { const my = Math.min(300, Math.round(Math.max(0, T - 0.3) * 110 / 10) * 10); if (my !== fo.my) { setFossil(my); fo.slider.set(my); } }
        return fo.auto && T < 3.5;
      }
      if (s === 5) {
        if (ds.auto) { const h = Math.min(100, Math.round(Math.max(0, T - 0.4) * 30)); if (h !== ds.h) { setHeight(h); ds.slider.set(h); } }
        return tickDistil(t);
      }
      if (s === -1) return tickDistil(t);
      if (s === 6) return tickEnv(dt, t);
      return false;
    },
  };
}
