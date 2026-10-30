// Air and oxygen: a 100-molecule air sample sorted into a bar chart, the glowing-splint test,
// breathed-in and breathed-out air, a candle under jars of different sizes, the fire triangle,
// putting out a campfire, and a city with a pollution slider.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Species: name, formula, colour of the bar label.
const SP = [
  { key: 'N2', name: 'Nitrogen', f: 'N₂' },
  { key: 'O2', name: 'Oxygen', f: 'O₂' },
  { key: 'Ar', name: 'Argon', f: 'Ar' },
  { key: 'CO2', name: 'Carbon dioxide', f: 'CO₂' },
  { key: 'H2O', name: 'Water vapour', f: 'H₂O' },
];
// 100 molecules: which species each one is, in breathed-in air and in breathed-out air.
const IN = i => (i < 78 ? 0 : i < 99 ? 1 : 2);
const OUT = i => (i < 78 ? 0 : i < 94 ? 1 : i < 98 ? 3 : i < 99 ? 4 : 2);
const NM = 100;
const BOX = { x: 1.2, z: 0.75, h: 1.7 };
const BURN_PER_ML = 0.02; // model: seconds of burning per millilitre of air in the jar

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  const sky = new THREE.Color(0xe3f0fb);
  scene.background = sky.clone();
  scene.fog = new THREE.Fog(0xe3f0fb, 300, 1000);
  const ground = kit.stage(scene, { ground: 0xe6d8bf, sky: 0xe3f0fb, radius: 30 });
  scene.background = sky.clone();
  kit.lights(scene, { sun: [5, 10, 6] });

  const glassMat = new THREE.MeshStandardMaterial({ color: 0xd6ecff, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x7fa6c4 });
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- Flames (shared look) ----------
  const flameOuter = new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const flameInner = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const flameGeo = new THREE.SphereGeometry(1, 16, 10); flameGeo.translate(0, 1, 0);
  function flame(size, parent, pos = [0, 0, 0]) {
    const g = new THREE.Group();
    g.position.set(...pos);
    const o = new THREE.Mesh(flameGeo, flameOuter), n = new THREE.Mesh(flameGeo, flameInner);
    o.scale.set(0.45, 1, 0.45); n.scale.set(0.25, 0.6, 0.25);
    g.add(o, n);
    parent.add(g);
    g.base = size; g.level = 1; g.seed = rand(size * 99 + pos[0]) * 10;
    g.tick = t => {
      const s = g.base * g.level, f = 1 + 0.08 * Math.sin(t * 17 + g.seed) + 0.05 * Math.sin(t * 29 + g.seed * 2);
      g.visible = g.level > 0.02;
      g.scale.set(s, s * f, s);
    };
    return g;
  }
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0x9aa1a6, transparent: true, opacity: 0.5, depthWrite: false });
  const puffGeo = new THREE.SphereGeometry(1, 10, 7);

  // ---------- 1 & 3: the air sample ----------
  const sample = new THREE.Group();
  scene.add(sample);
  const boxGeo = new THREE.BoxGeometry(BOX.x * 2, BOX.h, BOX.z * 2).translate(0, BOX.h / 2, 0);
  const sampleGlass = new THREE.Group();
  sampleGlass.add(new THREE.Mesh(boxGeo, glassMat), new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat));
  sample.add(sampleGlass);
  const chartBase = kit.mesh(new THREE.BoxGeometry(4.2, 0.06, 0.9), kit.mat(0xffffff), [0, 0.03, 0], sample);

  // Molecule shapes with atom colours baked in (N blue, O red, C dark grey, H white, Ar gold).
  const atom = (r, x, y, color) => {
    const g = new THREE.SphereGeometry(r, 10, 7); g.translate(x, y, 0);
    const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  };
  const ang = (104.5 / 2) * Math.PI / 180;
  const shapes = [
    mergeGeometries([atom(0.05, -0.04, 0, 0x3a6fe0), atom(0.05, 0.04, 0, 0x3a6fe0)]),
    mergeGeometries([atom(0.05, -0.04, 0, 0xe03a3a), atom(0.05, 0.04, 0, 0xe03a3a)]),
    atom(0.06, 0, 0, 0xffc300),
    mergeGeometries([atom(0.045, 0, 0, 0x3b3f44), atom(0.042, -0.08, 0, 0xe03a3a), atom(0.042, 0.08, 0, 0xe03a3a)]),
    mergeGeometries([atom(0.05, 0, 0, 0xe03a3a), atom(0.032, Math.sin(ang) * 0.06, -Math.cos(ang) * 0.06, 0xffffff), atom(0.032, -Math.sin(ang) * 0.06, -Math.cos(ang) * 0.06, 0xffffff)]),
  ];
  const molMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 });
  const meshes = shapes.map(g => {
    const m = new THREE.InstancedMesh(g, molMat, NM);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false; m.castShadow = true;
    sample.add(m);
    return m;
  });
  const MP = new Float32Array(NM * 3), MV = new Float32Array(NM * 3), FROM = new Float32Array(NM * 3), SLOT = new Float32Array(NM * 3);
  const axes = [], spin = new Float32Array(NM), species = new Uint8Array(NM);
  for (let i = 0; i < NM; i++) {
    MP[i * 3] = (rand(i) * 2 - 1) * (BOX.x - 0.1); MP[i * 3 + 1] = 0.1 + rand(i + 300) * (BOX.h - 0.2); MP[i * 3 + 2] = (rand(i + 600) * 2 - 1) * (BOX.z - 0.1);
    const a = rand(i + 900) * Math.PI * 2, b = rand(i + 1200) * 2 - 1, sp = 0.35 + rand(i + 1500) * 0.3;
    MV[i * 3] = Math.cos(a) * Math.sqrt(1 - b * b) * sp; MV[i * 3 + 1] = b * sp; MV[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - b * b) * sp;
    axes.push(new THREE.Vector3(rand(i + 1800) - 0.5, rand(i + 2100) - 0.5, rand(i + 2400) - 0.5).normalize());
    spin[i] = 1 + rand(i + 2700) * 2;
  }
  const dummy = new THREE.Object3D();
  const barTags = SP.map(() => label('', new THREE.Vector3(), { cls: 'cool' }));
  const mol = { mode: 'gas', k: 1, mix: IN, sortAt: 0, tAcc: 0 };

  function setMix(fn) { mol.mix = fn; for (let i = 0; i < NM; i++) species[i] = fn(i); }
  // Bar chart slots: each bar is 5 molecules wide; only species that are present get a bar.
  function layoutBars() {
    const present = SP.map((_, s) => [...species].filter(x => x === s).length);
    const used = present.map((n, s) => (n ? s : -1)).filter(s => s >= 0);
    const gap = 0.82, seen = new Array(SP.length).fill(0);
    for (let i = 0; i < NM; i++) {
      const s = species[i], b = used.indexOf(s), j = seen[s]++;
      SLOT[i * 3] = (b - (used.length - 1) / 2) * gap + ((j % 5) - 2) * 0.13;
      SLOT[i * 3 + 1] = 0.13 + Math.floor(j / 5) * 0.13;
      SLOT[i * 3 + 2] = 0;
    }
    SP.forEach((sp, s) => {
      const b = used.indexOf(s), n = present[s];
      barTags[s].text = `${sp.f} ${n}%`;
      barTags[s].at.set((b - (used.length - 1) / 2) * gap, 0.2 + Math.ceil(n / 5) * 0.13 + 0.12, 0);
      barTags[s].on = n > 0;
    });
  }
  function startTween(mode) {
    for (let i = 0; i < NM * 3; i++) FROM[i] = MP[i];
    mol.mode = mode; mol.k = 0;
    if (mode === 'gas') for (let i = 0; i < NM; i++) { SLOT[i * 3] = (rand(i + 77) * 2 - 1) * (BOX.x - 0.1); SLOT[i * 3 + 1] = 0.1 + rand(i + 377) * (BOX.h - 0.2); SLOT[i * 3 + 2] = (rand(i + 677) * 2 - 1) * (BOX.z - 0.1); }
  }
  function showBarTags(v) { SP.forEach((_, s) => barTags[s].show(v && barTags[s].on)); }
  function sampleTick(dt, t) {
    if (mol.k < 1) {
      mol.k = Math.min(1, mol.k + dt / 1.3);
      const e = kit.ease(mol.k);
      for (let i = 0; i < NM; i++) {
        const lift = Math.sin(Math.PI * e) * 0.25 * rand(i + 5);
        MP[i * 3] = kit.lerp(FROM[i * 3], SLOT[i * 3], e);
        MP[i * 3 + 1] = kit.lerp(FROM[i * 3 + 1], SLOT[i * 3 + 1], e) + lift;
        MP[i * 3 + 2] = kit.lerp(FROM[i * 3 + 2], SLOT[i * 3 + 2], e);
      }
      if (mol.k >= 1 && mol.mode === 'bars') showBarTags(!st.quiz);
    } else if (mol.mode === 'gas') {
      for (let i = 0; i < NM; i++) for (let q = 0; q < 3; q++) {
        const lim = q === 0 ? BOX.x - 0.08 : q === 2 ? BOX.z - 0.08 : 0;
        MP[i * 3 + q] += MV[i * 3 + q] * dt;
        if (q === 1) { if (MP[i * 3 + 1] < 0.08) { MP[i * 3 + 1] = 0.08; MV[i * 3 + 1] = Math.abs(MV[i * 3 + 1]); } if (MP[i * 3 + 1] > BOX.h - 0.08) { MP[i * 3 + 1] = BOX.h - 0.08; MV[i * 3 + 1] = -Math.abs(MV[i * 3 + 1]); } }
        else if (Math.abs(MP[i * 3 + q]) > lim) { MP[i * 3 + q] = Math.sign(MP[i * 3 + q]) * lim; MV[i * 3 + q] *= -1; }
      }
    }
    const counts = [0, 0, 0, 0, 0];
    const wob = mol.mode === 'bars' && mol.k >= 1 ? 0.25 : 1;
    for (let i = 0; i < NM; i++) {
      const s = species[i];
      dummy.position.set(MP[i * 3], MP[i * 3 + 1], MP[i * 3 + 2]);
      dummy.quaternion.setFromAxisAngle(axes[i], t * spin[i] * wob + i);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      meshes[s].setMatrixAt(counts[s]++, dummy.matrix);
    }
    meshes.forEach((m, s) => { m.count = counts[s]; m.instanceMatrix.needsUpdate = true; });
  }
  function readMix() {
    const out = mol.mix === OUT;
    ui.readout(out
      ? 'Breathed-out air: nitrogen about <b>78%</b>, oxygen about <b>16%</b>, carbon dioxide about <b>4%</b>, plus argon and more water vapour.'
      : 'Air by volume: nitrogen about <b>78%</b>, oxygen about <b>21%</b>, argon about <b>1%</b>. Carbon dioxide is only about <b>0.04%</b> (4 in every 10,000 particles), so none shows up in 100.');
  }

  // ---------- 2: glowing splint test ----------
  const splint = new THREE.Group();
  scene.add(splint);
  const jarGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.3, 32, 1, true).translate(0, 0.65, 0);
  const jarBase = new THREE.CylinderGeometry(0.46, 0.46, 0.06, 32).translate(0, 0.03, 0);
  const JX = [-0.8, 0.8];
  JX.forEach(x => {
    const j = new THREE.Group(); j.position.x = x; splint.add(j);
    j.add(new THREE.Mesh(jarGeo, glassMat));
    j.add(new THREE.LineSegments(new THREE.EdgesGeometry(jarGeo, 40), edgeMat));
    kit.mesh(jarBase, glassMat.clone(), [0, 0, 0], j).material.opacity = 0.35;
  });
  const stick = new THREE.Group();
  splint.add(stick);
  kit.mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), kit.mat(0xd9a066), [0, 0.7, 0], stick);
  const emberMat = new THREE.MeshStandardMaterial({ color: 0x3a2a20, emissive: 0xff4d00, emissiveIntensity: 1 });
  kit.mesh(new THREE.BoxGeometry(0.07, 0.1, 0.07), emberMat, [0, 0.02, 0], stick);
  const splintFlame = flame(0.24, stick, [0, -0.04, 0]);
  const splintTags = [label('Air', v3(JX[0], 1.5, 0), { cls: 'cool' }), label('Oxygen', v3(JX[1], 1.5, 0), { cls: 'cool' })];
  const spl = { from: 0, to: 0, k: 1, inO2: false, glowT: 0 };
  const stickPos = (x, dip) => stick.position.set(x, 1.55 - dip * 1.0, 0);
  function moveSplint(j) { spl.from = stick.position.x; spl.to = JX[j]; spl.k = 0; spl.target = j; spl.inO2 = false; }
  function splintTick(dt, t) {
    if (spl.k < 1) {
      spl.k = Math.min(1, spl.k + dt / 1.6);
      const a = kit.clamp(spl.k / 0.45, 0, 1), b = kit.clamp((spl.k - 0.45) / 0.55, 0, 1);
      const up = kit.clamp(1 - spl.k / 0.2, 0, 1);
      stickPos(kit.lerp(spl.from, spl.to, kit.ease(a)), kit.ease(b) * (1 - up));
      spl.inO2 = spl.target === 1 && b > 0.7;
      if (spl.k >= 1) ui.readout(spl.target === 1 ? 'In pure oxygen the glowing splint <b>bursts into flame</b>. This is the test for oxygen.' : 'In air (only about 21% oxygen) the splint just keeps <b>glowing</b>.');
    }
    const want = spl.inO2 ? 1 : 0;
    splintFlame.level += (want - splintFlame.level) * Math.min(1, dt * (want ? 3 : 6));
    emberMat.emissiveIntensity = 0.7 + 0.3 * Math.sin(t * 6) + splintFlame.level;
    splintFlame.tick(t);
  }

  // ---------- 4: candle under a jar ----------
  const candle = new THREE.Group();
  scene.add(candle);
  kit.mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 32), kit.mat(0xb0bec5), [0, 0.025, 0], candle);
  kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 20), kit.mat(0xfff8e7), [0, 0.275, 0], candle);
  kit.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 4), kit.mat(0x222222), [0, 0.53, 0], candle);
  const candleFlame = flame(0.09, candle, [0, 0.53, 0]);
  const bell = new THREE.Group();
  candle.add(bell);
  const bellGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true).translate(0, 0.5, 0);
  const bellTop = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2).translate(0, 1, 0);
  bell.add(new THREE.Mesh(bellGeo, glassMat), new THREE.Mesh(bellTop, glassMat), new THREE.LineSegments(new THREE.EdgesGeometry(bellGeo, 40), edgeMat));
  const puffs = [];
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(puffGeo, smokeMat); p.visible = false; candle.add(p); puffs.push(p); }
  const cd = { V: 500, covered: false, drop: 0, time: 0, out: false, outAt: 0, autoAt: 0, last: '' };
  const bellSize = V => { const r = 0.3 * Math.cbrt(V / 500); return { r, h: Math.max(0.75, 2.6 * r) }; };
  function sizeBell() { const { r, h } = bellSize(cd.V); bell.scale.set(r, h, r); }
  function cover(on) { cd.covered = on; cd.time = 0; cd.out = false; candleFlame.level = 1; puffs.forEach(p => { p.visible = false; }); }
  function candleTick(dt, t) {
    if (cd.autoAt > 0) { cd.autoAt -= dt; if (cd.autoAt <= 0) { cover(true); st.coverRow?.select(0); } }
    kit.follow(cd, 'drop', cd.covered ? 1 : 0, dt, 4);
    const { h } = bellSize(cd.V);
    bell.position.y = 0.05 + (1 - cd.drop) * 0.6;
    const sealed = cd.covered && cd.drop > 0.97;
    const burn = cd.V * BURN_PER_ML;
    if (sealed && !cd.out) {
      cd.time += dt;
      if (cd.time >= burn) { cd.out = true; cd.outAt = 0; }
    }
    const o2 = sealed ? Math.max(16, 21 - 5 * Math.min(1, cd.time / burn)) : 21;
    candleFlame.level = cd.out ? Math.max(0, candleFlame.level - dt * 3) : (sealed ? 0.35 + 0.65 * Math.sqrt(Math.max(0, (o2 - 16) / 5)) : 1);
    candleFlame.tick(t);
    if (cd.out) {
      cd.outAt += dt;
      puffs.forEach((p, i) => {
        const a = (cd.outAt * 0.6 + i / puffs.length) % 1;
        p.visible = true;
        p.position.set(Math.sin(i * 2 + a * 3) * 0.05, 0.6 + a * (h - 0.25), Math.cos(i * 3) * 0.04);
        p.scale.setScalar(0.03 + a * 0.06);
      });
    }
    const html = !cd.covered ? `Jar: <b>${cd.V} mL</b> · The candle burns in open air.`
      : cd.out ? `Jar: <b>${cd.V} mL</b> · The flame went out after <b>${burn.toFixed(1)} s</b> (model), with oxygen still left in the jar.`
        : `Jar: <b>${cd.V} mL</b> · Time: <b>${cd.time.toFixed(1)} s</b> · Oxygen in the jar: <b>about ${o2.toFixed(1)}%</b>`;
    if (html !== cd.last) { cd.last = html; ui.readout(html); }
  }

  // ---------- 5: fire triangle ----------
  const tri = new THREE.Group();
  scene.add(tri);
  // Side 0 is the bottom, side 1 the right, side 2 the left.
  const SIDES = [
    { name: 'Fuel', color: 0x8d5524, cls: 'warm' },
    { name: 'Oxygen', color: 0x3a86ff, cls: 'cool' },
    { name: 'Heat', color: 0xe76f51, cls: 'warm' },
  ];
  const TR = 1.15; // distance from centre to each corner
  const corners = [0, 1, 2].map(i => { const a = Math.PI / 2 + i * (2 * Math.PI / 3); return [Math.cos(a) * TR, Math.sin(a) * TR]; });
  const triCentre = new THREE.Group(); triCentre.position.y = 1.05; tri.add(triCentre);
  // Side i joins corner i+1 and corner i+2; its label sits on the outside of the triangle.
  const bars = SIDES.map((s, i) => {
    const [ax, ay] = corners[(i + 1) % 3], [bx, by] = corners[(i + 2) % 3];
    const len = Math.hypot(bx - ax, by - ay);
    const g = new THREE.Group();
    const m = kit.mesh(new THREE.BoxGeometry(len + 0.24, 0.24, 0.24), kit.mat(s.color, { transparent: true, opacity: 1 }), [0, 0, 0], g);
    g.position.set((ax + bx) / 2, (ay + by) / 2, 0);
    g.rotation.z = Math.atan2(by - ay, bx - ax);
    g.home = g.position.clone();
    g.out = new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, 0).normalize().multiplyScalar(0.9).add(g.home);
    g.mat = m.material; g.on = 1; g.want = 1; g.name = s.name;
    triCentre.add(g);
    const out = Math.sign(-Math.sin(g.rotation.z) * g.home.x + Math.cos(g.rotation.z) * g.home.y) || 1;
    const anchor = new THREE.Object3D(); anchor.position.set(0, out * 0.3 - 0.08, 0.14); g.add(anchor);
    g.tag = label(s.name, anchor, { cls: s.cls });
    return g;
  });
  const logMat = kit.mat(0x6b4226);
  const triFuel = new THREE.Group(); triFuel.position.set(0, -0.45, 0); triCentre.add(triFuel);
  for (let i = 0; i < 3; i++) { const l = kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10), logMat, [0, 0.06, 0], triFuel); l.rotation.set(Math.PI / 2, 0, i * 1.05); }
  const triFlame = flame(0.32, triFuel, [0, 0.05, 0]);
  const triPuff = new THREE.Mesh(puffGeo, smokeMat); triPuff.visible = false; triFuel.add(triPuff);
  function triTick(dt, t) {
    let all = 1;
    bars.forEach(b => {
      kit.follow(b, 'on', b.want, dt, 4);
      b.position.lerpVectors(b.out, b.home, b.on);
      b.mat.opacity = 0.25 + 0.75 * b.on;
      if (b.want < 1) all = 0;
    });
    triFlame.level += (all - triFlame.level) * Math.min(1, dt * (all ? 2 : 4));
    triFlame.tick(t);
    const smoking = triFlame.level < 0.6 && !all;
    triPuff.visible = smoking;
    if (smoking) { const a = (t * 0.7) % 1; triPuff.position.set(0, 0.2 + a * 0.9, 0); triPuff.scale.setScalar(0.06 + a * 0.12); }
  }
  function readTri() {
    const missing = bars.filter(b => b.want < 1).map(b => b.name.toLowerCase());
    ui.readout(missing.length ? `No ${missing.join(' and no ')}: the fire <b>goes out</b>.` : 'Heat, fuel and oxygen are all there: the fire <b>keeps burning</b>.');
  }

  // ---------- 6: putting out a campfire ----------
  const camp = new THREE.Group();
  scene.add(camp);
  const stoneMat = kit.mat(0x8d8f94, { flatShading: true, roughness: 1 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, s = kit.mesh(new THREE.DodecahedronGeometry(0.13, 0), stoneMat, [Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62], camp); s.rotation.set(i, i * 2, 0); }
  const logs = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4, l = new THREE.Group();
    const m = kit.mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.8, 10), logMat, [0, 0, 0], l);
    m.rotation.z = Math.PI / 2;
    l.rotation.y = a; l.position.y = 0.12 + (i % 2) * 0.1;
    l.dir = new THREE.Vector3(Math.cos(a + Math.PI / 2), 0, -Math.sin(a + Math.PI / 2));
    camp.add(l); logs.push(l);
  }
  const campFlame = flame(0.42, camp, [0, 0.15, 0]);
  const glow = new THREE.PointLight(0xff8a3d, 2.5, 4, 1.5);
  glow.position.set(0, 0.6, 0); camp.add(glow);
  const sand = kit.mesh(new THREE.ConeGeometry(0.7, 0.55, 24), kit.mat(0xd9b77a, { roughness: 1 }), [0, 0, 0], camp);
  sand.geometry.translate(0, 0.275, 0);
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0x4aa3ff, roughness: 0.2 }), 40);
  drops.frustumCulled = false; drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage); camp.add(drops);
  const bucket = new THREE.Group(); bucket.position.set(-1.5, 1.3, 0); camp.add(bucket);
  kit.mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 16, 1, true), kit.mat(0x9aa5b1, { side: THREE.DoubleSide, metalness: 0.5 }), [0, 0, 0], bucket);
  bucket.rotation.z = -1.0;
  const steam = [];
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(puffGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false })); p.visible = false; camp.add(p); steam.push(p); }
  const cf = { act: '', t: 0, level: 1, autoAt: 0 };
  function campAct(a) {
    cf.act = a; cf.t = 0;
    if (a === 'light') { cf.level = 1; }
    const txt = {
      water: 'Water <b>cools</b> the fire: it takes away the <b>heat</b>. (Never use water on burning oil or on electrical fires.)',
      sand: 'Sand smothers the fire: it keeps out the <b>oxygen</b>. A fire blanket or a carbon dioxide extinguisher works the same way.',
      wood: 'Taking away the wood removes the <b>fuel</b>, so there is nothing left to burn. Firefighters clear firebreaks for the same reason.',
      light: 'Heat, fuel and oxygen: the campfire is burning.',
    };
    ui.readout(txt[a]);
  }
  function campTick(dt, t) {
    if (cf.autoAt > 0) { cf.autoAt -= dt; if (cf.autoAt <= 0) { campAct('water'); st.campRow?.select(0); } }
    cf.t += dt;
    const a = cf.act;
    // Logs, sand and bucket follow the current action.
    logs.forEach(l => { const d = a === 'wood' ? Math.min(1, cf.t / 1.2) * 0.9 : 0; l.position.x = l.dir.x * d; l.position.z = l.dir.z * d; });
    sand.visible = a === 'sand';
    if (a === 'sand') { const s = Math.min(1, cf.t / 1.2); sand.scale.set(0.3 + 0.7 * s, Math.max(0.01, s), 0.3 + 0.7 * s); }
    bucket.visible = a === 'water';
    const pouring = a === 'water' && cf.t < 1.8;
    drops.visible = pouring;
    if (pouring) {
      for (let i = 0; i < 40; i++) {
        const u = (cf.t * 1.6 + i / 40) % 1;
        dummy.position.set(kit.lerp(-1.35, (rand(i) - 0.5) * 0.3, u), 1.25 + 0.5 * u - 1.5 * u * u, (rand(i + 40) - 0.5) * 0.3);
        dummy.quaternion.identity(); dummy.scale.setScalar(1); dummy.updateMatrix();
        drops.setMatrixAt(i, dummy.matrix);
      }
      drops.instanceMatrix.needsUpdate = true;
    }
    const want = a === 'light' || a === '' ? 1 : 0;
    const delay = a === 'wood' ? 0.6 : a === 'sand' ? 0.8 : 0.5;
    if (want || cf.t > delay) cf.level += (want - cf.level) * Math.min(1, dt * (want ? 2 : 2.5));
    campFlame.level = cf.level; campFlame.tick(t);
    glow.intensity = 2.5 * cf.level;
    steam.forEach((p, i) => {
      p.visible = a === 'water' && cf.t > 0.5 && cf.t < 4;
      const u = ((cf.t - 0.5) * 0.5 + i / steam.length) % 1;
      p.position.set(Math.sin(i * 2.3) * 0.15, 0.3 + u * 1.2, Math.cos(i * 1.7) * 0.15);
      p.scale.setScalar(0.05 + u * 0.09);
    });
  }

  // ---------- 7: city and pollution ----------
  const city = new THREE.Group();
  scene.add(city);
  const grass = kit.mesh(new THREE.BoxGeometry(14, 0.04, 7), kit.mat(0x9ccc65), [0, 0.02, 0], city);
  grass.castShadow = false;
  const road = kit.mesh(new THREE.BoxGeometry(14, 0.02, 0.9), kit.mat(0x4a4e54), [0, 0.05, 1.6], city);
  road.castShadow = false;
  const winTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = '#d9dee4'; g.fillRect(0, 0, 64, 128);
    g.fillStyle = '#6f8faf';
    for (let y = 6; y < 128; y += 14) for (let x = 6; x < 64; x += 14) g.fillRect(x, y, 8, 9);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const towers = [[-5.2, 1.6], [-4.2, 2.6], [-3.2, 1.9], [-1.9, 3.2], [-0.8, 2.2], [0.4, 2.8], [1.5, 1.7]];
  towers.forEach(([x, h], i) => {
    const tex = winTex.clone(); tex.repeat.set(1, h / 1.2); tex.needsUpdate = true;
    kit.mesh(new THREE.BoxGeometry(0.8, h, 0.8), kit.mat(i % 2 ? 0xffffff : 0xf1e4d3, { map: tex }), [x, h / 2, -0.6 - (i % 3) * 0.5], city);
  });
  // Factory with two chimneys.
  kit.mesh(new THREE.BoxGeometry(2.4, 1.0, 1.4), kit.mat(0xa1887f), [3.9, 0.5, -0.8], city);
  kit.mesh(new THREE.BoxGeometry(2.4, 0.3, 1.4), kit.mat(0x8d6e63), [3.9, 1.15, -0.8], city).rotation.x = 0.0;
  const chimneys = [[3.3, -1.1], [4.4, -1.1]];
  chimneys.forEach(([x, z]) => kit.mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.2, 14), kit.mat(0xb23a3a), [x, 1.1, z], city));
  // Trees.
  for (let i = 0; i < 7; i++) {
    const x = -6 + i * 2.0 + (i % 2) * 0.3, z = 2.7;
    kit.mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.4, 8), kit.mat(0x795548), [x, 0.2, z], city);
    kit.mesh(new THREE.ConeGeometry(0.3, 0.8, 10), kit.mat(0x2e7d32), [x, 0.75, z], city);
  }
  // Cars on the road.
  const cars = [];
  const carCols = [0xe63946, 0x3a86ff, 0xffbe0b, 0x2a9d8f, 0xffffff, 0x6d597a];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    kit.mesh(new THREE.BoxGeometry(0.5, 0.16, 0.26), kit.mat(carCols[i]), [0, 0.14, 0], c);
    kit.mesh(new THREE.BoxGeometry(0.28, 0.12, 0.22), kit.mat(0xcfe8ff), [-0.03, 0.27, 0], c);
    c.lane = i % 2; c.off = i / 6; city.add(c); cars.push(c);
  }
  // Smoke puffs: from the chimneys and the cars' exhausts.
  const SMOKE = 48;
  const smoke = new THREE.InstancedMesh(puffGeo, new THREE.MeshStandardMaterial({ color: 0x5f5a55, transparent: true, opacity: 0.55, depthWrite: false }), SMOKE);
  smoke.frustumCulled = false; smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage); city.add(smoke);
  const cityTags = [label('Factory', v3(3.9, 2.5, -0.8), { cls: 'warm' }), label('Traffic', v3(-4.5, 0.6, 1.6), { cls: 'warm' })];
  const pol = { p: 0.6, clean: false };
  const clearSky = new THREE.Color(0xbfe3ff), smog = new THREE.Color(0x9a8f7e), fogCol = new THREE.Color();
  function cityTick(dt, t) {
    const p = pol.p;
    cars.forEach((c, i) => {
      const u = ((t * 0.08 * (c.lane ? 1 : -1) + c.off) % 1 + 1) % 1;
      c.position.set(-6.5 + u * 13, 0.05, 1.6 + (c.lane ? 0.22 : -0.22));
      c.rotation.y = c.lane ? 0 : Math.PI;
    });
    const n = Math.round(SMOKE * p);
    for (let i = 0; i < SMOKE; i++) {
      if (i >= n) { dummy.scale.setScalar(0.0001); dummy.position.set(0, -5, 0); }
      else if (i < 32) {
        const ch = chimneys[i % 2], u = (t * 0.25 + i / 16) % 1;
        dummy.position.set(ch[0] + u * 1.2 + Math.sin(i + u * 4) * 0.15, 2.3 + u * 1.8, ch[1] + Math.cos(i) * 0.1);
        dummy.scale.setScalar(0.15 + u * 0.45);
      } else {
        const c = cars[i % cars.length], u = (t * 0.9 + i / 7) % 1;
        dummy.position.set(c.position.x + (c.lane ? -0.32 : 0.32) - (c.lane ? 1 : -1) * u * 0.4, 0.15 + u * 0.35, c.position.z);
        dummy.scale.setScalar(0.06 + u * 0.12);
      }
      dummy.quaternion.identity(); dummy.updateMatrix(); smoke.setMatrixAt(i, dummy.matrix);
    }
    smoke.instanceMatrix.needsUpdate = true;
    fogCol.copy(clearSky).lerp(smog, p);
    scene.background.copy(fogCol); scene.fog.color.copy(fogCol);
    // Haze: about 0.55 × p of the colour at the middle of the city, more towards the back.
    const d = k.camera.position.distanceTo(k.controls.target), span = kit.lerp(200, 14, p);
    scene.fog.near = d - 0.55 * p * span; scene.fog.far = scene.fog.near + span;
  }
  function readCity() {
    const p = pol.p, q = p < 0.25 ? 'Good' : p < 0.5 ? 'Moderate' : p < 0.75 ? 'Poor' : 'Very poor';
    ui.readout(`Air quality: <b>${q}</b><br>Burning fuels in cars, factories and power stations gives out smoke and soot, carbon monoxide, sulfur dioxide and nitrogen oxides, and extra carbon dioxide.`);
  }

  const st = { step: 0, quiz: false };
  const stations = { sample, splint, candle, tri, camp, city };
  function only(g) {
    for (const s of Object.values(stations)) s.visible = s === g;
    ground.visible = g !== city;
    scene.fog.near = 300; scene.fog.far = 1000;
    scene.background.copy(sky); scene.fog.color.copy(sky);
  }
  function hideTags() { barTags.forEach(t => t.show(false)); splintTags.forEach(t => t.show(false)); bars.forEach(b => b.tag.show(false)); cityTags.forEach(t => t.show(false)); }

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.quiz = isQuiz;
      hideTags();
      if (i === 0) {
        only(sample); sampleGlass.visible = true; chartBase.visible = false;
        setMix(IN); layoutBars();
        startTween('gas'); mol.k = 1; for (let q = 0; q < NM * 3; q++) MP[q] = SLOT[q];
        mol.sortAt = 1.2;
        go({ radius: 1.6, width: 2.2, yaw: 0, pitch: 0.18, target: [0, 1.05, 0] });
        const sort = () => { mol.sortAt = 0; sampleGlass.visible = false; chartBase.visible = true; layoutBars(); startTween('bars'); };
        st.sortRow = ui.buttons([{ label: 'Sort into a bar chart', onClick: sort }, { label: 'Mix them again', onClick: () => { mol.sortAt = 0; showBarTags(false); sampleGlass.visible = true; chartBase.visible = false; startTween('gas'); } }]);
        st.sort = sort;
        readMix();
      }
      if (i === 1) {
        only(splint); splintTags.forEach(t => t.show(true));
        stickPos(0, 0); spl.k = 1; spl.inO2 = false; splintFlame.level = 0; st.splintAt = 0.6;
        go({ radius: 1.5, width: 1.4, yaw: 0.2, pitch: 0.15, target: [0, 1.0, 0] });
        st.splintRow = ui.buttons([{ label: 'Put it into air', onClick: () => { st.splintAt = 0; moveSplint(0); } }, { label: 'Put it into oxygen', onClick: () => { st.splintAt = 0; moveSplint(1); } }]);
        ui.readout('A <b>glowing splint</b>: a wooden stick that was lit, then blown out so it only glows.');
      }
      if (i === 2) {
        only(sample); sampleGlass.visible = false; chartBase.visible = true;
        setMix(IN); layoutBars(); startTween('bars'); mol.k = 1; for (let q = 0; q < NM * 3; q++) MP[q] = SLOT[q];
        showBarTags(true); st.breathAt = 1.2;
        go({ radius: 1.6, width: 2.2, yaw: -0.1, pitch: 0.12, target: [0, 1.05, 0] });
        const set = out => { setMix(out ? OUT : IN); showBarTags(false); layoutBars(); startTween('bars'); readMix(); };
        st.breathToggle = ui.toggle({ label: 'Breathed-out air', value: false, onChange: v => { st.breathAt = 0; set(v); } });
        st.setBreath = set;
        readMix();
      }
      if (i === 3) {
        only(candle);
        cd.V = 500; sizeBell(); cover(false); cd.drop = 0; cd.autoAt = 0.6; cd.last = '';
        go({ radius: 1.15, yaw: 0.25, pitch: 0.18, target: [0, 0.75, 0] });
        ui.slider({ label: 'Jar volume', min: 250, max: 2000, step: 250, value: 500, unit: ' mL', onInput: v => { cd.V = v; sizeBell(); cover(false); cd.autoAt = 0; st.coverRow.select(1); } });
        st.coverRow = ui.buttons([{ label: 'Cover the candle', onClick: () => { cd.autoAt = 0; cover(true); } }, { label: 'Lift the jar', onClick: () => { cd.autoAt = 0; cover(false); } }]);
      }
      if (i === 4) {
        only(tri); bars.forEach(b => { b.want = 1; b.on = 1; b.tag.show(true); }); triFlame.level = 1;
        go({ radius: 1.75, yaw: 0, pitch: 0.12, target: [0, 1.0, 0] });
        bars.forEach(b => ui.toggle({ label: b.name, value: true, onChange: v => { b.want = v ? 1 : 0; readTri(); } }));
        readTri();
      }
      if (i === 5) {
        only(camp); campAct('light'); cf.level = 1; cf.autoAt = 1.6;
        go({ radius: 1.6, width: 1.6, yaw: 0.35, pitch: 0.35, target: [-0.3, 0.5, 0] });
        st.campRow = ui.buttons([
          { label: 'Pour water', onClick: () => { cf.autoAt = 0; campAct('water'); } },
          { label: 'Cover with sand', onClick: () => { cf.autoAt = 0; campAct('sand'); } },
          { label: 'Take away the wood', onClick: () => { cf.autoAt = 0; campAct('wood'); } },
          { label: 'Light it again', onClick: () => { cf.autoAt = 0; campAct('light'); } },
        ]);
      }
      if (i === 6) {
        only(city); cityTags.forEach(t => t.show(true));
        pol.p = 0.6;
        go({ radius: 3.6, width: 6.6, yaw: 0, pitch: 0.28, target: [0, 1.4, 0] });
        ui.slider({ label: 'Pollution from traffic and factories', min: 0, max: 100, step: 5, value: 60, unit: '%', onInput: v => { pol.p = v / 100; readCity(); } });
        readCity();
      }
      if (isQuiz) {
        only(sample); sampleGlass.visible = true; chartBase.visible = false;
        setMix(IN); startTween('gas'); mol.k = 1; for (let q = 0; q < NM * 3; q++) MP[q] = SLOT[q];
        mol.sortAt = 0;
        go({ radius: 1.6, width: 2.2, yaw: 0.35, pitch: 0.3, target: [0, 0.9, 0] });
      }
    },

    update(dt, t) {
      if (sample.visible) {
        if (mol.sortAt > 0) { mol.sortAt -= dt; if (mol.sortAt <= 0) { st.sort(); st.sortRow.select(0); } }
        if (st.step === 2 && st.breathAt > 0) { st.breathAt -= dt; if (st.breathAt <= 0) { st.breathToggle.checked = true; st.setBreath(true); } }
        sampleTick(dt, t);
      }
      if (splint.visible) {
        if (st.splintAt > 0) { st.splintAt -= dt; if (st.splintAt <= 0) { moveSplint(1); st.splintRow.select(1); } }
        splintTick(dt, t);
      }
      if (candle.visible) candleTick(dt, t);
      if (tri.visible) triTick(dt, t);
      if (camp.visible) campTick(dt, t);
      if (city.visible) cityTick(dt, t);
      return true;
    },
  };
}
