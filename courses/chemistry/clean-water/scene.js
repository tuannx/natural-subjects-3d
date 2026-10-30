// Making muddy water clean: a kitchen bench with six stations, left to right.
// Two glasses (salt dissolves, mud clouds the water), a settling jar, a bottle filter with layers and a jug,
// a glass of filtered water under a magnifier, a pot on a hot plate, and a dripping tap over a bucket.
const BT = 0.8;
const X = { salt: -6.65, mud: -5.85, jar: -3.6, filt: -0.6, mag: 2.4, pot: 5.2, tap: 8.2 };
const MUD = 0x8a6a45;

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xd5e3d2, sky: 0xe6f3ff, radius: 18 });
  kit.lights(scene, { sun: [1, 11, 7] });
  kit.mesh(new THREE.BoxGeometry(17.4, BT - 0.05, 1.8), kit.mat(0x6c8ead), [0.8, (BT - 0.05) / 2, 0], scene).castShadow = false;
  kit.mesh(new THREE.BoxGeometry(17.6, 0.05, 1.9), kit.mat(0xf4f6f8), [0.8, BT - 0.025, 0], scene);
  kit.mesh(new THREE.PlaneGeometry(17.6, 2.6), kit.mat(0xeef6f0), [0.8, BT + 1.3, -0.95], scene).castShadow = false;

  const glassMat = (o = 0.2) => new THREE.MeshStandardMaterial({ color: 0xe6f6ff, transparent: true, opacity: o, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const waterMat = (color = 0x4aa3df, opacity = 0.4) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.15, depthWrite: false });
  const M4 = new THREE.Matrix4(), QI = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), C1 = new THREE.Color(), C2 = new THREE.Color();
  const setInst = (im, i, x, y, z, s) => { V.set(x, y, z); S.set(s, s, s); M4.compose(V, QI, S); im.setMatrixAt(i, M4); };
  const anchor = (x, y, z, parent = scene) => { const a = new THREE.Object3D(); a.position.set(x, y, z); parent.add(a); return a; };
  const ballGeo = new THREE.SphereGeometry(1, 10, 8), icoGeo = new THREE.IcosahedronGeometry(1, 0), cylGeo = new THREE.CylinderGeometry(1, 1, 1, 28);
  const st = { step: 0, time: 0, quiz: false, plan: [], said: '' };
  const say = html => { if (html !== st.said) { st.said = html; ui.readout(html); } };

  // A glass with water whose height and colour can change. y0 is the bench top.
  function glass(x, r, h, level, z = 0) {
    const g = new THREE.Group();
    g.position.set(x, BT, z);
    scene.add(g);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28, 1, true), glassMat());
    wall.position.y = h / 2; wall.renderOrder = 3;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 28), glassMat(0.35));
    base.position.y = 0.015; base.renderOrder = 3;
    const wm = waterMat();
    const water = new THREE.Mesh(cylGeo, wm);
    water.renderOrder = 1;
    g.add(wall, base, water);
    const o = { g, r, h, wm, water, level: 0 };
    o.set = lv => { o.level = lv; water.visible = lv > 0.005; water.scale.set(r - 0.012, Math.max(0.001, lv), r - 0.012); water.position.y = 0.03 + lv / 2; };
    o.set(level);
    return o;
  }

  // ---------- A: salt and mud in two glasses ----------
  const gSalt = glass(X.salt, 0.28, 0.72, 0.52), gMud = glass(X.mud, 0.28, 0.72, 0.52);
  const NGR = 26;
  const saltGr = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), kit.mat(0xffffff), NGR);
  const mudGr = new THREE.InstancedMesh(icoGeo, kit.mat(MUD, { flatShading: true }), 60);
  for (const im of [saltGr, mudGr]) { im.frustumCulled = false; im.castShadow = false; scene.add(im); }
  const saltTag = label('Water', anchor(X.salt, BT + 0.9, 0)), mudTag = label('Water', anchor(X.mud, BT + 0.9, 0));
  const glS = { salt: -1, mud: -1 }; // seconds since added (-1: not yet)
  function glassFrame(dt) {
    let busy = false;
    if (glS.salt >= 0) { glS.salt += dt; busy = glS.salt < 3; }
    if (glS.mud >= 0) { glS.mud += dt; busy = true; }
    for (let i = 0; i < NGR; i++) {
      const t = glS.salt - rand(i) * 0.4, a = rand(i + 30) * 6.28, r = rand(i + 60) * 0.15;
      // Grains fall in, then shrink as they dissolve.
      const y = BT + 1.0 - Math.min(1, Math.max(0, t) / 0.45) ** 2 * 0.35 - Math.max(0, t - 0.45) * 0.18;
      const s = glS.salt < 0 ? 0 : 0.018 * kit.clamp(1 - (t - 0.5) / 1.4, 0, 1);
      setInst(saltGr, i, X.salt + r * Math.cos(a), Math.max(BT + 0.05, y), r * Math.sin(a), t < 0 ? 0 : s);
    }
    const mt = glS.mud;
    for (let i = 0; i < 60; i++) {
      const a = rand(i + 90) * 6.28, r = Math.sqrt(rand(i + 120)) * 0.24, t = mt - rand(i + 150) * 0.4;
      let y;
      if (t < 0.5) y = BT + 1.0 - Math.max(0, t) / 0.5 * 0.45;
      else y = BT + 0.1 + rand(i + 180) * 0.42 + Math.sin(st.time * (0.8 + rand(i) * 0.6) + i) * 0.02;
      setInst(mudGr, i, X.mud + r * Math.cos(a + st.time * 0.1), y, r * Math.sin(a + st.time * 0.1), mt < 0 || t < 0 ? 0 : 0.012 + rand(i + 200) * 0.012);
    }
    saltGr.instanceMatrix.needsUpdate = mudGr.instanceMatrix.needsUpdate = true;
    const k = mt < 0 ? 0 : kit.clamp((mt - 0.4) / 1.2, 0, 1);
    gMud.wm.color.copy(C1.setHex(0x4aa3df).lerp(C2.setHex(MUD), k));
    gMud.wm.opacity = 0.4 + 0.42 * k;
    saltTag.text = glS.salt > 1.6 ? 'Salt water' : 'Water';
    mudTag.text = mt > 1 ? 'Muddy water' : 'Water';
    return busy;
  }
  const addSalt = () => { if (glS.salt < 0) glS.salt = 0; };
  const addMud = () => { if (glS.mud < 0) glS.mud = 0; };

  // ---------- B: the settling jar ----------
  const JH = 1.05, JR = 0.34, JW = 0.95;
  const jar = glass(X.jar, JR, JH, JW);
  jar.wm.color.setHex(0x5aaee0);
  const cloudMat = waterMat(MUD, 0.8);
  const cloud = new THREE.Mesh(cylGeo, cloudMat);
  cloud.renderOrder = 2;
  scene.add(cloud);
  const sediment = kit.mesh(cylGeo, kit.mat(0x6f5332, { roughness: 1 }), [X.jar, BT, 0], scene);
  const NS = 70;
  const settle = new THREE.InstancedMesh(icoGeo, kit.mat(0x7a5a36, { flatShading: true }), NS);
  settle.frustumCulled = false; settle.castShadow = false;
  scene.add(settle);
  const jarTag = label('Mud settles', anchor(X.jar + 0.05, BT + 0.22, JR));
  const setS = { h: 0, slider: null };
  function settleFrame() {
    const h = setS.h, k = h / 12;
    const sedH = 0.13 * Math.sqrt(Math.min(1, k * 1.5)) + 0.001;
    sediment.scale.set(JR - 0.014, sedH, JR - 0.014); sediment.position.y = BT + 0.03 + sedH / 2;
    const top = BT + 0.03 + JW, low = BT + 0.03 + sedH;
    cloud.scale.set(JR - 0.016, top - low - 0.004, JR - 0.016); cloud.position.set(X.jar, (top + low) / 2, 0);
    cloudMat.opacity = 0.08 + 0.74 * Math.pow(1 - Math.min(1, k * 1.4), 2);
    for (let i = 0; i < NS; i++) {
      const sp = 0.06 + rand(i + 300) * rand(i + 330) * 1.2;  // units per hour: big bits fast, tiny bits slow
      const y0 = low + 0.02 + rand(i + 360) * (top - low - 0.05);
      const y = Math.max(low + 0.01, y0 - sp * h);
      const a = rand(i + 390) * 6.28, r = Math.sqrt(rand(i + 420)) * (JR - 0.05);
      setInst(settle, i, X.jar + r * Math.cos(a), y, r * Math.sin(a), 0.01 + sp * 0.012);
    }
    settle.instanceMatrix.needsUpdate = true;
    jarTag.text = h < 0.5 ? 'Muddy water' : 'Mud settles';
  }

  // ---------- C: the bottle filter and a jug ----------
  const FX = X.filt, BOT = BT + 0.95, TOPB = BT + 2.05, FR = 0.32;
  const steel = kit.mat(0x9aa5b1, { metalness: 0.4, roughness: 0.4 });
  kit.mesh(new THREE.BoxGeometry(0.9, 0.03, 0.5), steel, [FX, BT + 0.015, -0.45], scene);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8), steel, [FX, BT + 0.75, -0.55], scene);
  kit.mesh(new THREE.BoxGeometry(0.05, 0.04, 0.55), steel, [FX, BOT + 0.3, -0.3], scene);
  const clamp = kit.mesh(new THREE.TorusGeometry(FR + 0.02, 0.02, 6, 32), steel, [FX, BOT + 0.3, 0], scene);
  clamp.rotation.x = Math.PI / 2;
  const bottleWall = new THREE.Mesh(new THREE.CylinderGeometry(FR, FR, TOPB - BOT, 28, 1, true), glassMat(0.22));
  bottleWall.position.set(FX, (TOPB + BOT) / 2, 0); bottleWall.renderOrder = 4;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(FR, 0.07, 0.24, 28, 1, true), glassMat(0.25));
  neck.position.set(FX, BOT - 0.12, 0); neck.renderOrder = 4;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 16, 1, true), glassMat(0.3));
  spout.position.set(FX, BOT - 0.29, 0); spout.renderOrder = 4;
  scene.add(bottleWall, neck, spout);
  const cup = glass(FX, 0.24, 0.48, 0);
  cup.wm.color.setHex(0xa9d8ee);
  const LAY = [
    { name: 'Cotton', y0: 0, y1: 0.12, color: 0xf8f9fa, job: '<b>Cotton</b> stops the sand and charcoal from falling out of the bottle.' },
    { name: 'Charcoal', y0: 0.12, y1: 0.32, color: 0x2f2f2f, job: '<b>Charcoal</b> holds on to some things that cause bad smells, colours and tastes.' },
    { name: 'Sand', y0: 0.32, y1: 0.58, color: 0xe9c46a, job: '<b>Sand</b> has tiny gaps between its grains. It catches small bits of mud.' },
    { name: 'Gravel', y0: 0.58, y1: 0.8, color: 0x9a9a9a, job: '<b>Gravel</b> has big gaps between the pebbles. It catches big bits like leaves and grit.' },
  ];
  LAY.forEach((L, i) => {
    L.mat = kit.mat(L.color, { roughness: 1, flatShading: true, emissive: 0xffd166, emissiveIntensity: 0 });
    L.g = new THREE.Group();
    scene.add(L.g);
    const h = L.y1 - L.y0;
    const body = kit.mesh(cylGeo, L.mat, [0, h / 2, 0], L.g);
    body.scale.set(FR - 0.012, h, FR - 0.012);
    // Lumps on the top surface show what each layer is made of.
    const n = [6, 16, 0, 22][i], size = [0.05, 0.05, 0, 0.055][i];
    if (n) {
      const lumps = new THREE.InstancedMesh(i === 0 ? ballGeo : icoGeo, L.mat, n);
      for (let j = 0; j < n; j++) { const a = rand(j + i * 50) * 6.28, r = Math.sqrt(rand(j + i * 50 + 7)) * (FR - 0.07); setInst(lumps, j, r * Math.cos(a), h, r * Math.sin(a), size * (0.7 + rand(j + i * 9) * 0.5)); }
      L.g.add(lumps);
    }
    if (i === 0) kit.mesh(new THREE.ConeGeometry(FR - 0.02, 0.22, 24), L.mat, [0, -0.11, 0], L.g).rotation.x = Math.PI;
    const side = i % 2 ? -1 : 1;
    L.tag = label(L.name, anchor(side * (FR + 0.22), h / 2, 0, L.g));
    L.drop = 0;
  });
  const topMat = waterMat(MUD, 0.85);
  const topWater = new THREE.Mesh(cylGeo, topMat);
  topWater.renderOrder = 2;
  scene.add(topWater);
  const jug = new THREE.Group();
  scene.add(jug);
  const jugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.42, 20, 1, true), glassMat(0.3));
  jugBody.renderOrder = 4;
  const jugWater = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.3, 20), waterMat(MUD, 0.85));
  jugWater.position.y = -0.05;
  const jugHandle = kit.mesh(new THREE.TorusGeometry(0.11, 0.02, 6, 16, Math.PI), kit.mat(0x7fb2cc), [-0.2, 0.02, 0], jug);
  jugHandle.rotation.z = Math.PI / 2;
  jug.add(jugBody, jugWater);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8), waterMat(MUD, 0.85));
  scene.add(stream);
  const drops = [];
  const dropMat = waterMat(0x9fd3ef, 0.8);
  for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(ballGeo, dropMat); d.scale.set(0.022, 0.032, 0.022); d.visible = false; scene.add(d); drops.push(d); }
  const jugTag = label('Muddy water', anchor(0, 0.32, 0, jug), { cls: 'warm' });
  const cupTag = label('Cleaner water', anchor(FX, BT + 0.62, 0.25), { cls: 'cool' });
  const fS = { built: 1, pour: 0, top: 0, inCup: 0, dirt: 0, drip: 0, jugK: 0, hl: -1 };
  const JUG_REST = [FX - 0.75, BT + 0.25, 0.35], JUG_POUR = [FX - 0.42, TOPB + 0.32, 0];
  function filterFrame(dt) {
    let busy = false;
    // Building: layers drop in one by one, bottom first.
    if (fS.built < 1) { fS.built = Math.min(1, fS.built + dt / 2); busy = true; }
    LAY.forEach((L, i) => {
      const k = kit.clamp((fS.built * 4 - i) / 0.9, 0, 1);
      L.g.visible = k > 0;
      L.g.position.set(FX, BOT + L.y0 + (1 - k * k) * 1.0, 0);
      const pulse = fS.hl === i ? 0.35 + 0.25 * Math.sin(st.time * 6) : 0;
      L.mat.emissiveIntensity = pulse;
      if (fS.hl === i) busy = true;
    });
    // Pouring: the jug tips, muddy water builds up on the gravel and trickles down.
    const pouring = fS.pour > 0;
    if (pouring) { const d = Math.min(fS.pour, dt * 0.03); fS.pour -= d; fS.top += d; busy = true; }
    busy = kit.follow(fS, 'jugK', pouring ? 1 : 0, dt, 5) || busy;
    if (fS.top > 0) {
      const d = Math.min(fS.top, dt * 0.022);
      fS.top -= d; fS.inCup = Math.min(0.4, fS.inCup + d * 0.9); fS.dirt = Math.min(1, fS.dirt + d * 4); busy = true;
    }
    const jk = kit.ease(fS.jugK);
    jug.position.set(kit.lerp(JUG_REST[0], JUG_POUR[0], jk), kit.lerp(JUG_REST[1], JUG_POUR[1], jk), kit.lerp(JUG_REST[2], JUG_POUR[2], jk));
    jug.rotation.z = -jk * 1.5;
    const wTop = BOT + 0.8 + fS.top * 2.6;
    topWater.visible = fS.top > 0.002;
    topWater.scale.set(FR - 0.014, Math.max(0.001, fS.top * 2.6 + 0.03), FR - 0.014);
    topWater.position.set(FX, BOT + 0.8 + (fS.top * 2.6 + 0.03) / 2 - 0.03, 0);
    stream.visible = pouring && jk > 0.6;
    if (stream.visible) { const y0 = jug.position.y - 0.05, y1 = wTop; stream.scale.y = Math.max(0.01, y0 - y1); stream.position.set(FX - 0.2, (y0 + y1) / 2, 0); }
    // Drips fall from the bottle's neck into the glass while water is soaking through.
    const dripping = fS.top > 0.002;
    if (dripping) fS.drip += dt * 2.2;
    const yTop = BOT - 0.34, yEnd = BT + 0.03 + cup.level;
    drops.forEach((d, i) => {
      const ph = fS.drip - i * 0.2;
      const f = ph - Math.floor(ph);
      d.visible = dripping && ph > 0;
      d.position.set(FX, yTop - f * (yTop - yEnd), 0);
    });
    cup.set(fS.inCup);
    for (const L of LAY.slice(2)) L.mat.color.copy(C1.setHex(L.color).lerp(C2.setHex(0x6b4f2e), fS.dirt * (L.name === 'Gravel' ? 0.75 : 0.45)));
    return busy;
  }
  function filterReset(built = 1) { Object.assign(fS, { built, pour: 0, top: 0, inCup: 0, dirt: 0, drip: 0, jugK: 0, hl: -1 }); }
  const pour = () => { if (fS.pour + fS.top < 0.1) fS.pour += 0.1; };

  // ---------- D: a glass of filtered water under a magnifier ----------
  const gMag = glass(X.mag, 0.25, 0.5, 0.38);
  gMag.wm.color.setHex(0x9fd3ef);
  const lens = new THREE.Group();
  lens.position.set(X.mag, BT + 1.2, 0.15);
  lens.rotation.y = 0.2;
  scene.add(lens);
  const LR = 0.4;
  const lensFace = new THREE.Mesh(new THREE.CircleGeometry(LR, 40), new THREE.MeshBasicMaterial({ color: 0xd6eefa }));
  lens.add(lensFace);
  const lensRim = kit.mesh(new THREE.TorusGeometry(LR, 0.035, 8, 40), kit.mat(0x264653), [0, 0, 0], lens);
  const handle = kit.mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.45, 10), kit.mat(0x8d5524), [0.42, -0.42, 0], lens);
  handle.rotation.z = Math.PI / 4;
  // A faint cone from the water to the lens shows what is being magnified.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(LR * 0.92, 0.05, 0.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfe6f7, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(X.mag, BT + 0.67, 0.08);
  scene.add(beam);
  const germGeo = new THREE.CapsuleGeometry(0.022, 0.06, 4, 8);
  const germMats = [kit.mat(0x52b788), kit.mat(0x9d4edd), kit.mat(0xf4a261)];
  const germs = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(germGeo, germMats[i % 3]);
    m.castShadow = false;
    lens.add(m);
    germs.push({ m, ax: 0.1 + rand(i + 500) * 0.17, ay: 0.08 + rand(i + 520) * 0.17, fx: 0.5 + rand(i + 540) * 0.6, fy: 0.4 + rand(i + 560) * 0.7, p: rand(i + 580) * 6.28 });
  }
  const germTag = label('Germs', anchor(0, LR + 0.1, 0, lens), { cls: 'warm' });
  const magTag = label('Looks clean', anchor(X.mag, BT + 0.3, 0.3), { cls: 'cool' });
  function magFrame() {
    for (const g of germs) {
      const t = st.time;
      const x = g.ax * Math.sin(t * g.fx + g.p), y = g.ay * Math.cos(t * g.fy + g.p * 1.3);
      const dx = g.ax * g.fx * Math.cos(t * g.fx + g.p), dy = -g.ay * g.fy * Math.sin(t * g.fy + g.p * 1.3);
      g.m.position.set(x, y, 0.02);
      g.m.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
      g.m.scale.setScalar(1 + 0.08 * Math.sin(t * 7 + g.p));
    }
    return lens.visible;
  }
  const magnify = on => { lens.visible = beam.visible = on; germTag.show(on && st.step === 4); };

  // ---------- E: a pot of water on a hot plate ----------
  const PX = X.pot, PR = 0.36, PH = 0.36, PB = BT + 0.12;
  kit.mesh(new THREE.BoxGeometry(0.95, 0.1, 0.8), kit.mat(0x343a40), [PX, BT + 0.05, 0], scene);
  const burnerMat = kit.mat(0x495057, { emissive: 0xff3d00, emissiveIntensity: 0 });
  kit.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 28), burnerMat, [PX, BT + 0.11, 0], scene);
  const knob = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), kit.mat(0xe9ecef), [PX + 0.35, BT + 0.06, 0.4], scene);
  knob.rotation.x = Math.PI / 2;
  const potMat = kit.mat(0xadb5bd, { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide });
  kit.mesh(new THREE.CylinderGeometry(PR, PR, PH, 28, 1, true), potMat, [PX, PB + PH / 2, 0], scene).receiveShadow = false;
  kit.mesh(new THREE.CylinderGeometry(PR, PR, 0.02, 28), potMat, [PX, PB + 0.01, 0], scene);
  for (const s of [-1, 1]) kit.mesh(new THREE.BoxGeometry(0.16, 0.03, 0.06), kit.mat(0x212529), [PX + s * (PR + 0.08), PB + PH - 0.05, 0], scene);
  const potWater = new THREE.Mesh(cylGeo, waterMat(0x4aa3df, 0.75));
  potWater.scale.set(PR - 0.01, 0.26, PR - 0.01); potWater.position.set(PX, PB + 0.02 + 0.13, 0);
  scene.add(potWater);
  const WS = PB + 0.28; // water surface
  // Thermometer leaning in the pot.
  const thermo = new THREE.Group();
  thermo.position.set(PX + 0.2, WS - 0.18, -0.12);
  thermo.rotation.z = -0.25;
  scene.add(thermo);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }), [0, 0.375, 0], thermo);
  kit.mesh(new THREE.SphereGeometry(0.035, 10, 8), kit.mat(0xd62828), [0, 0, 0], thermo);
  const mercury = kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), kit.mat(0xd62828), [0, 0, 0.005], thermo);
  const NB = 26;
  const boilB = new THREE.InstancedMesh(ballGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, roughness: 0.1 }), NB);
  boilB.frustumCulled = false; boilB.castShadow = false;
  scene.add(boilB);
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false });
  const steam = [];
  for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(ballGeo, steamMat); s.visible = false; scene.add(s); steam.push(s); }
  const potGerms = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(germGeo, germMats[i % 3]); m.castShadow = false; scene.add(m); potGerms.push({ m, a: rand(i + 700) * 6.28, r: 0.08 + rand(i + 720) * 0.2, y: PB + 0.07 + rand(i + 740) * 0.17, w: 0.4 + rand(i + 760) * 0.5 }); }
  const potTag = label('Germs in the water', anchor(PX - 0.1, WS + 0.12, 0.2), { cls: 'warm' });
  const bS = { on: false, T: 20, boil: 0, steamT: 0 };
  function potFrame(dt) {
    let busy = false;
    if (bS.on) {
      if (bS.T < 100) bS.T = Math.min(100, bS.T + dt * 55);
      else bS.boil = Math.min(60, bS.boil + dt * 30); // shown sped up: one minute of boiling in two seconds
      busy = true;
    }
    burnerMat.emissiveIntensity = bS.on ? 0.9 : 0;
    const tk = (bS.T - 20) / 80;
    mercury.scale.y = 0.12 + tk * 0.5; mercury.position.y = mercury.scale.y / 2;
    const vig = kit.clamp((bS.T - 75) / 25, 0, 1);
    boilB.visible = vig > 0;
    for (let i = 0; i < NB; i++) {
      const sp = 0.25 + rand(i + 800) * 0.25, ph = (st.time * sp + rand(i + 820)) % 1;
      const a = rand(i + 840) * 6.28, r = Math.sqrt(rand(i + 860)) * (PR - 0.05);
      const on = i < NB * vig;
      setInst(boilB, i, PX + r * Math.cos(a), PB + 0.04 + ph * 0.24, r * Math.sin(a), on ? 0.012 + ph * 0.022 * (0.5 + vig) : 0);
    }
    boilB.instanceMatrix.needsUpdate = true;
    if (vig > 0) bS.steamT += dt;
    steam.forEach((s, i) => {
      const ph = (bS.steamT * 0.5 + i / steam.length) % 1;
      s.visible = vig > 0.3;
      s.position.set(PX + Math.sin(i * 2.1 + ph * 3) * 0.12, WS + 0.08 + ph * 0.75, Math.cos(i * 1.7) * 0.1);
      s.scale.setScalar(0.025 + ph * 0.05);
    });
    const alive = 1 - bS.boil / 60;
    for (const g of potGerms) {
      const a = g.a + st.time * g.w * alive;
      g.m.position.set(PX + g.r * Math.cos(a), g.y, g.r * Math.sin(a));
      g.m.rotation.set(0.3, 0, a);
      g.m.scale.setScalar(Math.max(0.001, alive * 1.5));
    }
    potTag.text = bS.boil >= 60 ? 'Germs killed' : 'Germs in the water';
    if (st.step === 5 && !st.quiz) {
      const T = Math.round(bS.T);
      say(bS.boil >= 60 ? `<b>100 °C</b> for one minute: the germs are dead. Let the water cool, then cover it.`
        : bS.T >= 100 ? `<b>100 °C</b>: boiling for <b>${Math.floor(bS.boil)}</b> seconds (sped up)`
        : `Temperature: <b>${T} °C</b>${bS.on ? ' (sped up)' : ''}`);
    }
    return busy || vig > 0 || alive > 0;
  }

  // ---------- F: a dripping tap and a bucket ----------
  const TX = X.tap, SPY = BT + 1.15;
  const chrome = kit.mat(0xced4da, { metalness: 0.7, roughness: 0.25 });
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 12), chrome, [TX, SPY + 0.12, -0.5], scene).rotation.x = Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12), chrome, [TX, SPY + 0.05, -0.08], scene);
  kit.mesh(new THREE.SphereGeometry(0.06, 12, 8), chrome, [TX, SPY + 0.12, -0.08], scene);
  const tapHandle = kit.mesh(new THREE.BoxGeometry(0.22, 0.03, 0.05), kit.mat(0x1d3557), [TX, SPY + 0.25, -0.3], scene);
  kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), chrome, [TX, SPY + 0.2, -0.3], scene);
  const bucketMat = kit.mat(0xf77f00, { side: THREE.DoubleSide });
  kit.mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.42, 24, 1, true), bucketMat, [TX, BT + 0.21, -0.08], scene).receiveShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 24), bucketMat, [TX, BT + 0.01, -0.08], scene);
  const bucketWater = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24), waterMat(0x4aa3df, 0.7));
  scene.add(bucketWater);
  const tapDrops = [0, 1, 2].map(() => { const d = new THREE.Mesh(ballGeo, dropMat); d.scale.set(0.022, 0.032, 0.022); d.visible = false; scene.add(d); return d; });
  const ripple = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 4, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
  ripple.rotation.x = Math.PI / 2;
  scene.add(ripple);
  const tapTag = label('Leaking tap', anchor(TX, SPY + 0.38, -0.3), { cls: 'warm' });
  const tS = { fixed: false, fast: false, drips: 0, ph: 0, toggle: null };
  function tapFrame(dt) {
    if (!tS.fixed) { tS.drips += dt * (tS.fast ? 3600 : 1); tS.ph += dt * (tS.fast ? 4 : 1); }
    const fill = Math.min(1, tS.drips / 28800);
    const lvl = 0.01 + fill * 0.38, rr = 0.24 + lvl / 0.42 * 0.06;
    bucketWater.scale.set(rr - 0.01, lvl, rr - 0.01); bucketWater.position.set(TX, BT + 0.02 + lvl / 2, -0.08);
    const y0 = SPY - 0.03, y1 = BT + 0.02 + lvl;
    tapDrops.forEach((d, i) => {
      const p = tS.ph - i / 3;
      const f = p - Math.floor(p);
      // Each drop grows on the spout, then falls.
      const fallF = kit.clamp((f - 0.55) / 0.45, 0, 1);
      d.visible = !tS.fixed && p > 0 && (tS.fast || i === 0);
      d.position.set(TX, y0 - fallF * fallF * (y0 - y1), -0.08);
      const grow = fallF > 0 ? 1 : 0.4 + f;
      d.scale.set(0.022 * grow, 0.032 * grow, 0.022 * grow);
    });
    const f0 = tS.ph - Math.floor(tS.ph), rk = f0 < 0.55 ? (f0 + 0.45) : f0 - 0.55;
    ripple.visible = !tS.fixed && tS.drips > 0.5 && rk < 0.4;
    ripple.position.set(TX, y1 + 0.003, -0.08); ripple.scale.set(0.03 + rk * 0.4, 0.03 + rk * 0.4, 0.05);
    tapTag.text = tS.fixed ? 'Fixed tap' : 'Leaking tap';
    if (st.step === 6 && !st.quiz) {
      const secs = tS.drips, hh = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60);
      say(`Time: <b>${hh} h ${mm} min</b> &nbsp; Drips: <b>${Math.floor(tS.drips).toLocaleString('en-US')}</b>${tS.fixed ? ' (tap fixed)' : ''}`);
    }
    return !tS.fixed;
  }

  const tags = [saltTag, mudTag, jarTag, jugTag, cupTag, germTag, magTag, potTag, tapTag, ...LAY.map(L => L.tag)];
  const views = [
    { radius: 0.95, yaw: 0.2, pitch: 0.3, target: [(X.salt + X.mud) / 2, BT + 0.45, 0] },
    { radius: 0.9, yaw: 0.2, pitch: 0.22, target: [X.jar, BT + 0.55, 0] },
    { radius: 1.15, yaw: 0.2, pitch: 0.15, target: [X.filt, BT + 1.1, 0] },
    { radius: 1.4, yaw: 0.25, pitch: 0.15, target: [X.filt - 0.2, BT + 1.2, 0] },
    { radius: 1.0, yaw: 0.2, pitch: 0.15, target: [X.mag, BT + 0.85, 0] },
    { radius: 0.95, yaw: 0.15, pitch: 0.45, target: [X.pot, BT + 0.55, 0] },
    { radius: 1.0, yaw: 0.35, pitch: 0.4, target: [X.tap, BT + 0.72, 0] },
  ];

  // Starting state for every station, so each step looks right even when visited out of order.
  glassFrame(0); settleFrame(); filterFrame(0); magFrame(); potFrame(0); tapFrame(0);

  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.said = '';
      for (const t of tags) t.show(false);
      if (i !== 2 && i !== 3) filterReset(1);
      magnify(true);
      if (i === 0) {
        saltTag.show(true); mudTag.show(true);
        glS.salt = glS.mud = -1;
        const row = ui.buttons([{ label: 'Add salt', onClick: () => { st.plan = []; addSalt(); } }, { label: 'Add mud', onClick: () => { st.plan = []; addMud(); } }]);
        st.plan = [[0.2, () => { addSalt(); row.select(0); }], [1.1, () => { addMud(); row.select(1); }]];
      }
      if (i === 1) {
        jarTag.show(true);
        setS.h = 0;
        setS.slider = ui.slider({ label: 'Time waited', min: 0, max: 12, step: 0.5, value: 0, format: v => (v === 1 ? '1 hour' : `${v} hours`), onInput: v => { st.plan = []; setS.h = v; settleFrame(); } });
        st.plan = [[0.3, d => { setS.h = Math.min(8, setS.h + d * 4); setS.slider.set(Math.round(setS.h * 2) / 2); settleFrame(); return setS.h < 8; }]];
      }
      if (i === 2) {
        filterReset(0);
        for (const L of LAY) L.tag.show(true);
        const row = ui.buttons(LAY.slice().reverse().map((L, j) => ({ label: L.name, onClick: () => { st.plan = []; fS.hl = LAY.indexOf(L); ui.readout(L.job); } })));
        ui.readout('The layers go in from the bottom up.');
        st.plan = [[2.1, () => { fS.hl = 3; row.select(0); ui.readout(LAY[3].job); }]];
      }
      if (i === 3) {
        filterReset(1);
        jugTag.show(true); cupTag.show(true);
        const row = ui.buttons([{ label: 'Pour muddy water', onClick: () => { st.plan = []; pour(); } }, { label: 'Start again', onClick: () => { st.plan = []; filterReset(1); } }]);
        st.plan = [[0.3, () => { pour(); row.select(0); }]];
      }
      if (i === 4) {
        germTag.show(true); magTag.show(true);
        ui.toggle({ label: 'Magnify', value: true, onChange: magnify });
      }
      if (i === 5) {
        potTag.show(true);
        Object.assign(bS, { on: false, T: 20, boil: 0, steamT: 0 });
        const row = ui.buttons([{ label: 'Boil the water', onClick: () => { st.plan = []; bS.on = true; } }, { label: 'Start again', onClick: () => { st.plan = []; Object.assign(bS, { on: false, T: 20, boil: 0, steamT: 0 }); } }]);
        st.plan = [[0.3, () => { bS.on = true; row.select(0); }]];
      }
      if (i === 6) {
        tapTag.show(true);
        Object.assign(tS, { fixed: false, fast: false, drips: 0, ph: 0 });
        tS.toggle = ui.toggle({ label: 'Fast forward (1 hour each second)', value: false, onChange: v => { st.plan = []; tS.fast = v; } });
        ui.buttons([{ label: 'Fix the tap', onClick: () => { st.plan = []; tS.fixed = true; } }, { label: 'Start again', onClick: () => { st.plan = []; Object.assign(tS, { fixed: false, drips: 0, ph: 0 }); } }]);
        st.plan = [[1.2, () => { tS.fast = true; tS.toggle.checked = true; }]];
      }
      if (isQuiz) view({ radius: 2, width: 8.6, yaw: 0, pitch: 0.28, target: [0.8, BT + 0.8, 0] }, instant);
      else view(views[i], instant);
      potFrame(0); tapFrame(0); filterFrame(0); glassFrame(0); settleFrame();
    },
    update(dt) {
      st.time += dt;
      let busy = false;
      st.plan = st.plan.filter(([at, fn]) => { if (st.time < at) return true; busy = true; return fn(dt) === true; });
      busy = busy || st.plan.length > 0;
      const s = st.quiz ? 9 : st.step;
      if (s === 0) busy = glassFrame(dt) || busy;
      if (s === 2 || s === 3) busy = filterFrame(dt) || busy;
      if (s === 4 || s === 9) busy = magFrame() || busy;
      if (s === 5) busy = potFrame(dt) || busy;
      if (s === 6 || s === 9) busy = tapFrame(dt) || busy;
      return busy;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
