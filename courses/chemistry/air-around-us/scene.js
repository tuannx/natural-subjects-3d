// Air around us: a long bench with six stations, left to right.
// An "empty" jar full of air particles, a cup pushed into a water tank, two balloons on a balance stick,
// a fan blowing a pinwheel and ribbons, a box of air particles that can be sorted, and two candles under jars.
const BT = 0.8;                                    // bench top
const X = { jar: -8, tank: -5, bal: -1.7, fan: 1.0, wheel: 2.9, box: 5.5, c1: 7.8, c2: 8.95 };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xd8e4d0, sky: 0xe4f1ff, radius: 18 });
  kit.lights(scene, { sun: [1, 11, 7] });

  kit.mesh(new THREE.BoxGeometry(19.6, BT - 0.05, 1.8), kit.mat(0x8d6e63), [0.4, (BT - 0.05) / 2, 0], scene).castShadow = false;
  kit.mesh(new THREE.BoxGeometry(19.8, 0.05, 1.9), kit.mat(0xf4efe6), [0.4, BT - 0.025, 0], scene);
  kit.mesh(new THREE.PlaneGeometry(19.8, 2.6), kit.mat(0xfdf6e9), [0.4, BT + 1.3, -0.95], scene).castShadow = false;

  const glassMat = (opacity = 0.18) => new THREE.MeshStandardMaterial({ color: 0xe6f6ff, transparent: true, opacity, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), QI = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), AX = new THREE.Vector3(1, 0, 0), E = new THREE.Euler();
  const setInst = (im, i, x, y, z, s, q = QI) => { V.set(x, y, z); S.set(s, s, s); M4.compose(V, q, S); im.setMatrixAt(i, M4); };
  const anchor = (x, y, z, parent = scene) => { const a = new THREE.Object3D(); a.position.set(x, y, z); parent.add(a); return a; };
  const ballGeo = new THREE.SphereGeometry(1, 10, 8);
  const st = { step: 0, time: 0, quiz: false, plan: [] };

  // ---------- A: the "empty" jar, and air particles in and around it ----------
  const JR = 0.4, JH = 0.95;
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, JH, 28, 1, true), glassMat(0.22));
  jar.position.set(X.jar, BT + JH / 2, 0);
  jar.renderOrder = 2;
  scene.add(jar);
  kit.mesh(new THREE.CircleGeometry(JR, 28), glassMat(0.35), [X.jar, BT + 0.006, 0], scene).rotation.x = -Math.PI / 2;
  const rim = kit.mesh(new THREE.TorusGeometry(JR, 0.015, 6, 32), kit.mat(0xbfd9e6), [X.jar, BT + JH, 0], scene);
  rim.rotation.x = Math.PI / 2;
  const NA = 130, AB = { x0: X.jar - 1.05, x1: X.jar + 1.05, y0: BT + 0.04, y1: BT + 1.55, z0: -0.6, z1: 0.6 };
  const airDots = new THREE.InstancedMesh(ballGeo, kit.mat(0x7aa6c2, { roughness: 0.5 }), NA);
  airDots.frustumCulled = false; airDots.castShadow = false;
  scene.add(airDots);
  const air = [];
  for (let i = 0; i < NA; i++) {
    const inside = i < 34, a = rand(i) * Math.PI * 2, sp = 0.35 + rand(i + 50) * 0.25, b = rand(i + 70) * Math.PI - Math.PI / 2;
    let x, y, z;
    if (inside) { const r = Math.sqrt(rand(i + 9)) * (JR - 0.06); x = X.jar + r * Math.cos(a); z = r * Math.sin(a); y = BT + 0.06 + rand(i + 3) * (JH - 0.12); }
    else {
      let n = i;
      do { x = kit.lerp(AB.x0, AB.x1, rand(n + 11)); z = kit.lerp(AB.z0, AB.z1, rand(n + 13)); y = kit.lerp(AB.y0, AB.y1, rand(n + 17)); n += 1000; }
      while (Math.hypot(x - X.jar, z) < JR + 0.06 && y < BT + JH + 0.05);
    }
    air.push({ inside, x, y, z, vx: sp * Math.cos(a) * Math.cos(b), vy: sp * Math.sin(b), vz: sp * Math.sin(a) * Math.cos(b) });
  }
  function moveAir(dt) {
    for (let i = 0; i < NA; i++) {
      const p = air[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const dx = p.x - X.jar, r = Math.hypot(dx, p.z);
      if (p.inside) {
        if (r > JR - 0.05) { const nx = dx / r, nz = p.z / r, d = p.vx * nx + p.vz * nz; if (d > 0) { p.vx -= 2 * d * nx; p.vz -= 2 * d * nz; } }
        if (p.y < BT + 0.05 && p.vy < 0) p.vy = -p.vy;
        if (p.y > BT + JH - 0.04 && p.vy > 0) p.vy = -p.vy;
      } else {
        if (r < JR + 0.05 && p.y < BT + JH + 0.03) { const nx = dx / r, nz = p.z / r, d = p.vx * nx + p.vz * nz; if (d < 0) { p.vx -= 2 * d * nx; p.vz -= 2 * d * nz; } }
        if ((p.x < AB.x0 && p.vx < 0) || (p.x > AB.x1 && p.vx > 0)) p.vx = -p.vx;
        if ((p.y < AB.y0 && p.vy < 0) || (p.y > AB.y1 && p.vy > 0)) p.vy = -p.vy;
        if ((p.z < AB.z0 && p.vz < 0) || (p.z > AB.z1 && p.vz > 0)) p.vz = -p.vz;
      }
      setInst(airDots, i, p.x, p.y, p.z, 0.032);
    }
    airDots.instanceMatrix.needsUpdate = true;
  }
  moveAir(0);
  const jarTag = label('"Empty" jar', anchor(X.jar, BT + JH + 0.18, 0));

  // ---------- B: the cup pushed into a water tank ----------
  const TW = 1.5, TD = 0.9, TH = 1.25, WY0 = BT + 0.78, CR = 0.22, CH = 0.55;
  const tankGeo = new THREE.BoxGeometry(TW, TH, TD);
  const tank = new THREE.Mesh(tankGeo, glassMat(0.14));
  tank.position.set(X.tank, BT + TH / 2, 0); tank.renderOrder = 3;
  scene.add(tank);
  const tankEdges = new THREE.LineSegments(new THREE.EdgesGeometry(tankGeo), new THREE.LineBasicMaterial({ color: 0x7fb2cc }));
  tankEdges.position.copy(tank.position);
  scene.add(tankEdges);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3b9be0, transparent: true, opacity: 0.35, roughness: 0.15, depthWrite: false });
  const tankWater = new THREE.Mesh(new THREE.BoxGeometry(TW - 0.02, 1, TD - 0.02), waterMat);
  tankWater.renderOrder = 1;
  scene.add(tankWater);
  const cup = new THREE.Group();
  scene.add(cup);
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xbde0fe, transparent: true, opacity: 0.4, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const cupWall = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, CH, 24, 1, true), cupMat);
  cupWall.position.y = CH / 2; cupWall.renderOrder = 4;
  cup.add(cupWall);
  const cupTop = kit.mesh(new THREE.CircleGeometry(CR, 24), cupMat, [0, CH, 0], cup);
  cupTop.rotation.x = Math.PI / 2; cupTop.renderOrder = 4;
  const hole = kit.mesh(new THREE.CircleGeometry(0.035, 12), new THREE.MeshBasicMaterial({ color: 0x1d3557 }), [0.07, CH + 0.003, 0.04], cup);
  hole.rotation.x = -Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), kit.mat(0xc8a165), [0, CH + 0.55, 0], cup);
  const tissueMat = kit.mat(0xffffff, { roughness: 1, flatShading: true });
  const tissue = kit.mesh(new THREE.IcosahedronGeometry(0.15, 1), tissueMat, [0, CH - 0.13, 0], cup);
  tissue.scale.set(1, 0.7, 1);
  const cupWater = new THREE.Mesh(new THREE.CylinderGeometry(CR - 0.01, CR - 0.01, 1, 24), waterMat);
  cupWater.renderOrder = 1;
  cup.add(cupWater);
  const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0.1 });
  const bubbles = [];
  for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(ballGeo, bubbleMat); b.scale.setScalar(0.035 + rand(i + 400) * 0.02); b.visible = false; scene.add(b); bubbles.push({ m: b, y: 0, live: false }); }
  const tissueTag = label('Dry tissue', anchor(0, CH + 0.12, 0, cup));
  const tankTag = label('Water', anchor(X.tank - 0.55, BT + 0.35, TD / 2), { cls: 'cool' });
  const cupS = { p: 0, wy: WY0, hole: false, k: 0, wet: 0, emit: 0, slider: null };
  function cupFrame(dt) {
    const rimY = kit.lerp(WY0 + 0.3, BT + 0.1, cupS.p), top = rimY + CH, lv = cupS.wy;
    cup.position.set(X.tank, rimY, 0);
    let inner = rimY;
    if (rimY < lv) {
      const base = rimY + 0.07 * (lv - rimY); // air is squeezed a little, so water creeps in a little
      if (cupS.hole) cupS.k = Math.min(1, cupS.k + dt / 1.6);
      inner = kit.lerp(base, Math.min(lv, top), cupS.k);
    }
    const wh = Math.max(0.001, inner - rimY);
    cupWater.visible = inner > rimY + 0.002;
    cupWater.scale.y = wh; cupWater.position.y = wh / 2;
    const airUnder = Math.max(0, Math.min(top, lv) - inner) * Math.PI * CR * CR;
    cupS.wy = WY0 + (airUnder * 2.2) / (TW * TD);
    const wH = cupS.wy - BT - 0.01;
    tankWater.scale.y = wH; tankWater.position.set(X.tank, BT + 0.005 + wH / 2, 0);
    if (inner > top - 0.22) cupS.wet = Math.min(1, cupS.wet + dt * 2);
    tissueMat.color.setHex(0xffffff).lerp(TISSUE_WET, cupS.wet);
    tissueTag.text = cupS.wet > 0.5 ? 'Wet tissue' : 'Dry tissue';
    hole.visible = cupS.hole;
    // Bubbles leave through the hole while air is escaping under water.
    let busy = false;
    if (cupS.hole && cupS.k < 1 && top < lv) {
      cupS.emit -= dt;
      if (cupS.emit <= 0) { cupS.emit = 0.12; const b = bubbles.find(x => !x.live); if (b) { b.live = true; b.y = top; b.x = X.tank + 0.07; } }
    }
    for (const b of bubbles) {
      if (!b.live) { b.m.visible = false; continue; }
      b.y += dt * 0.9; busy = true;
      if (b.y > lv) b.live = false;
      b.m.visible = b.live; b.m.position.set(b.x + Math.sin(b.y * 20) * 0.02, b.y, 0.04);
    }
    return busy || (cupS.hole && cupS.k < 1 && rimY < lv);
  }
  const TISSUE_WET = new THREE.Color(0x8fb3c9);
  function cupReset() { cupS.hole = false; cupS.k = 0; cupS.wet = 0; for (const b of bubbles) b.live = false; }

  // ---------- C: two balloons on a balance stick ----------
  const PY = BT + 1.75, ARM = 0.95;
  const steel = kit.mat(0x8d99ae, { metalness: 0.5, roughness: 0.4 });
  kit.mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), steel, [X.bal, BT + 0.03, -0.55], scene);
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.95, 8), steel, [X.bal, BT + 0.98, -0.55], scene);
  kit.mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), steel, [X.bal, BT + 1.95, -0.27], scene);
  kit.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 4), steel, [X.bal, PY + 0.11, 0], scene);
  const beam = new THREE.Group();
  beam.position.set(X.bal, PY, 0);
  scene.add(beam);
  kit.mesh(new THREE.BoxGeometry(ARM * 2 + 0.1, 0.04, 0.04), kit.mat(0xd4a373), [0, 0, 0], beam);
  const balloonMat = kit.mat(0xe63946, { roughness: 0.35 });
  const stringMat = kit.mat(0x555555);
  const balloonGeo = new THREE.SphereGeometry(1, 24, 16);
  const balloons = [-1, 1].map(side => {
    const g = new THREE.Group();
    scene.add(g);
    const body = kit.mesh(balloonGeo, balloonMat, [0, 0, 0], g);
    const knot = kit.mesh(new THREE.ConeGeometry(0.04, 0.06, 8), balloonMat, [0, 0, 0], g);
    const str = kit.mesh(new THREE.CylinderGeometry(0.005, 0.005, 1, 4), stringMat, [0, 0, 0], g);
    const tag = label('Full', anchor(0, 0, 0.35, g));
    return { side, g, body, knot, str, tag, air: 1, to: 1 };
  });
  const balS = { tilt: 0 };
  function balFrame(dt) {
    let busy = false;
    for (const b of balloons) busy = kit.follow(b, 'air', b.to, dt, 2.5) || busy;
    const empty = balloons[1].air;
    busy = kit.follow(balS, 'tilt', 0.13 * (1 - empty), dt, 3) || busy;
    beam.rotation.z = balS.tilt;
    for (const b of balloons) {
      const ex = X.bal + b.side * ARM * Math.cos(balS.tilt), ey = PY + b.side * ARM * Math.sin(balS.tilt);
      const r = kit.lerp(0.09, 0.3, b.air), ry = kit.lerp(0.16, 0.36, b.air);
      const sl = 0.32;
      b.g.position.set(ex, ey, 0);
      b.str.scale.y = sl; b.str.position.y = -sl / 2;
      b.knot.position.y = -sl - 0.02; b.knot.rotation.x = Math.PI;
      b.body.scale.set(r, ry, r); b.body.position.y = -sl - 0.04 - ry;
      b.tag.at.position.set(0, -sl - 0.04 - ry * 2 - 0.12, 0.3);
      b.tag.text = b.air > 0.5 ? 'Full' : 'Empty';
    }
    return busy;
  }
  const letOut = () => { balloons[1].to = 0; };
  const blowUp = () => { balloons[1].to = 1; };

  // ---------- D: a fan, a pinwheel and ribbons ----------
  const FY = BT + 0.75;
  const fan = new THREE.Group();
  fan.position.set(X.fan, 0, 0);
  scene.add(fan);
  const fanMat = kit.mat(0x2a9d8f), white = kit.mat(0xf8f9fa);
  kit.mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 24), fanMat, [0, BT + 0.03, 0], fan);
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 8), white, [0, BT + 0.35, 0], fan);
  const motor = kit.mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.26, 16), fanMat, [-0.08, FY, 0], fan);
  motor.rotation.z = Math.PI / 2;
  const rotor = new THREE.Group();
  rotor.position.set(0.1, FY, 0);
  fan.add(rotor);
  kit.mesh(new THREE.SphereGeometry(0.06, 12, 8), white, [0, 0, 0], rotor);
  for (let i = 0; i < 3; i++) {
    const bl = kit.mesh(new THREE.BoxGeometry(0.02, 0.36, 0.13), kit.mat(0x8ecae6), [0, 0.2, 0], new THREE.Group());
    bl.rotation.y = 0.35;
    const holder = bl.parent; holder.rotation.x = (i * Math.PI * 2) / 3; rotor.add(holder);
  }
  const guard = kit.mesh(new THREE.TorusGeometry(0.42, 0.012, 6, 32), white, [0.14, FY, 0], fan);
  guard.rotation.y = Math.PI / 2;
  // Pinwheel on a stick, facing the fan.
  kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), kit.mat(0x6c757d), [X.wheel, BT + 0.4, 0], scene);
  const wheel = new THREE.Group();
  wheel.position.set(X.wheel - 0.03, FY, 0);
  scene.add(wheel);
  const vaneGeo = new THREE.BufferGeometry();
  vaneGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0.32, 0, 0, 0.32, 0.32], 3));
  vaneGeo.computeVertexNormals();
  [0xe63946, 0xffb703, 0x219ebc, 0x8ac926].forEach((c, i) => {
    const v = kit.mesh(vaneGeo, kit.mat(c, { side: THREE.DoubleSide }), [0, 0, 0], wheel);
    v.rotation.x = (i * Math.PI) / 2;
  });
  kit.mesh(new THREE.SphereGeometry(0.035, 8, 6), white, [0, 0, 0], wheel);
  // Ribbons hang from a little bar between the fan and the pinwheel.
  const RX = X.fan + 0.95;
  kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), kit.mat(0x6c757d), [RX, BT + 0.6, -0.45], scene);
  kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), kit.mat(0x6c757d), [RX, BT + 1.2, 0], scene).rotation.x = Math.PI / 2;
  const ribbons = [-0.3, 0, 0.3].map((z, i) => {
    const pv = new THREE.Group();
    pv.position.set(RX, BT + 1.19, z);
    scene.add(pv);
    kit.mesh(new THREE.BoxGeometry(0.06, 0.5, 0.005), kit.mat([0xff006e, 0xfb5607, 0x8338ec][i], { side: THREE.DoubleSide }), [0, -0.25, 0], pv);
    return pv;
  });
  const NF = 44;
  const flowDots = new THREE.InstancedMesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0x9fc9e3 }), NF);
  flowDots.frustumCulled = false; flowDots.castShadow = false;
  scene.add(flowDots);
  const fanTag = label('Fan', anchor(X.fan, BT + 1.25, 0));
  const windTag = label('Moving air', anchor(X.fan + 1.45, FY + 0.15, 0.35), { cls: 'cool' });
  const fanS = { speed: 2, spin: 0, flow: 0 };
  function fanFrame(dt) {
    const s = fanS.speed;
    let busy = kit.follow(fanS, 'spin', s, dt, 1.8);
    rotor.rotation.x += fanS.spin * dt * 9;
    wheel.rotation.x -= fanS.spin * dt * 4;
    fanS.flow += fanS.spin * dt * 0.9;
    ribbons.forEach((r, i) => { r.rotation.z = fanS.spin * 0.42 + (fanS.spin > 0.05 ? Math.sin(st.time * (9 + i * 2) + i) * 0.08 * fanS.spin : 0); });
    flowDots.visible = fanS.spin > 0.05;
    for (let i = 0; i < NF; i++) {
      const L = 2.3, x = X.fan + 0.25 + ((rand(i + 900) * L + fanS.flow) % L), a = rand(i + 950) * Math.PI * 2, r = 0.38 * Math.sqrt(rand(i + 975));
      setInst(flowDots, i, x, FY + r * Math.sin(a), r * Math.cos(a), 0.022);
    }
    flowDots.instanceMatrix.needsUpdate = true;
    windTag.show(st.step === 3 && fanS.spin > 0.05);
    return busy || fanS.spin > 0.01;
  }

  // ---------- E: a box of air particles: 78 nitrogen, 21 oxygen, 1 argon ----------
  const BY = BT + 0.72, BH = 0.62; // box centre height and half size
  const boxGeo = new THREE.BoxGeometry(BH * 2, BH * 2, BH * 2);
  const box = new THREE.Mesh(boxGeo, glassMat(0.12));
  box.position.set(X.box, BY, 0); box.renderOrder = 3;
  scene.add(box);
  const boxEdges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({ color: 0x7fb2cc }));
  boxEdges.position.copy(box.position);
  scene.add(boxEdges);
  const KIND = [];
  for (let i = 0; i < 100; i++) KIND.push(i < 78 ? 0 : i < 99 ? 1 : 2);
  const atomsN = 78 * 2 + 21 * 2 + 1;
  const atoms = new THREE.InstancedMesh(ballGeo, kit.mat(0xffffff, { roughness: 0.45 }), atomsN);
  atoms.frustumCulled = false;
  scene.add(atoms);
  const COLS = [new THREE.Color(0x4361ee), new THREE.Color(0xe63946), new THREE.Color(0xadb5bd)];
  const mol = [];
  let ai = 0;
  for (let i = 0; i < 100; i++) {
    const k = KIND[i], a = rand(i + 600) * Math.PI * 2, b = rand(i + 650) * 2 - 1, sp = 0.3 + rand(i + 700) * 0.2;
    // Grid slot: 10 by 10, filled from the bottom row up.
    const gx = (i % 10) - 4.5, gy = Math.floor(i / 10) - 4.5;
    const m = { k, x: X.box + (rand(i + 500) - 0.5) * 1.0, y: BY + (rand(i + 520) - 0.5) * 1.0, z: (rand(i + 540) - 0.5) * 1.0,
      vx: sp * Math.cos(a) * Math.sqrt(1 - b * b), vy: sp * b, vz: sp * Math.sin(a) * Math.sqrt(1 - b * b),
      gx: X.box + gx * 0.112, gy: BY + gy * 0.112, rx: rand(i + 800) * 6, ry: rand(i + 820) * 6, wr: 0.8 + rand(i + 840) * 1.5, a0: ai };
    ai += k === 2 ? 1 : 2;
    for (let j = m.a0; j < ai; j++) atoms.setColorAt(j, COLS[k]);
    mol.push(m);
  }
  const boxS = { sorted: false, sortK: 0 };
  const OFF = new THREE.Vector3();
  function boxFrame(dt) {
    const busy = kit.follow(boxS, 'sortK', boxS.sorted ? 1 : 0, dt, 2.2);
    const lim = BH - 0.07;
    for (const m of mol) {
      if (!boxS.sorted) {
        m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
        if ((m.x < X.box - lim && m.vx < 0) || (m.x > X.box + lim && m.vx > 0)) m.vx = -m.vx;
        if ((m.y < BY - lim && m.vy < 0) || (m.y > BY + lim && m.vy > 0)) m.vy = -m.vy;
        if ((m.z < -lim && m.vz < 0) || (m.z > lim && m.vz > 0)) m.vz = -m.vz;
        m.rx += m.wr * dt; m.ry += m.wr * 0.7 * dt;
      } else {
        const f = Math.min(1, dt * 5);
        m.x += (m.gx - m.x) * f; m.y += (m.gy - m.y) * f; m.z += (0.2 - m.z) * f;
        m.rx += (Math.round(m.rx / Math.PI) * Math.PI - m.rx) * f;
      }
      E.set(0, m.ry * (1 - boxS.sortK), m.rx + boxS.sortK * Math.PI / 4);
      Q.setFromEuler(E);
      if (m.k === 2) setInst(atoms, m.a0, m.x, m.y, m.z, 0.042);
      else {
        OFF.copy(AX).applyQuaternion(Q).multiplyScalar(0.03);
        setInst(atoms, m.a0, m.x + OFF.x, m.y + OFF.y, m.z + OFF.z, 0.036);
        setInst(atoms, m.a0 + 1, m.x - OFF.x, m.y - OFF.y, m.z - OFF.z, 0.036);
      }
    }
    atoms.instanceMatrix.needsUpdate = true;
    const lab = st.step === 4 && boxS.sortK > 0.8;
    nTag.show(lab); oTag.show(lab); arTag.show(lab);
    return true;
  }
  const nTag = label('Nitrogen: 78', anchor(X.box - BH - 0.05, BY - 0.12, 0.2), { cls: 'cool' });
  const oTag = label('Oxygen: 21', anchor(X.box - BH - 0.05, BY + 0.42, 0.2), { cls: 'warm' });
  const arTag = label('Other: 1', anchor(X.box + BH + 0.05, BY + 0.62, 0.2));
  const airBoxTag = label('Air', anchor(X.box, BY + BH + 0.12, 0));
  boxFrame(0);

  // ---------- F: two candles under a small jar and a big jar ----------
  const flameOuter = new THREE.MeshBasicMaterial({ color: 0xffa62b }), flameInner = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.25, depthWrite: false });
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0x8d8d8d, transparent: true, opacity: 0.5, depthWrite: false });
  const candles = [{ x: X.c1, r: 0.22, h: 0.55, name: 'Small jar' }, { x: X.c2, r: 0.34, h: 0.9, name: 'Big jar' }].map((c, ci) => {
    kit.mesh(new THREE.CylinderGeometry(0.2 + ci * 0.06, 0.18 + ci * 0.06, 0.03, 24), kit.mat(0xd8e2dc), [c.x, BT + 0.015, 0], scene);
    kit.mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.3, 16), kit.mat(0xfdfcdc), [c.x, BT + 0.18, 0], scene);
    kit.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 4), kit.mat(0x222222), [c.x, BT + 0.355, 0], scene);
    const flame = new THREE.Group();
    flame.position.set(c.x, BT + 0.38, 0);
    scene.add(flame);
    const fo = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), flameOuter); fo.scale.set(1, 2.2, 1); fo.position.y = 0.06;
    const fi = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 6), flameInner); fi.scale.set(1, 1.8, 1); fi.position.y = 0.04;
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), glowMat); gl.position.y = 0.06;
    flame.add(fo, fi, gl);
    const jarG = new THREE.Group();
    scene.add(jarG);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r, c.h, 24, 1, true), glassMat(0.22));
    wall.position.y = c.h / 2; wall.renderOrder = 2;
    const cap = new THREE.Mesh(new THREE.CircleGeometry(c.r, 24), glassMat(0.3));
    cap.position.y = c.h; cap.rotation.x = -Math.PI / 2; cap.renderOrder = 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(c.r, 0.012, 6, 28), kit.mat(0xbfd9e6));
    ring.rotation.x = Math.PI / 2;
    jarG.add(wall, cap, ring);
    const smoke = [];
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(ballGeo, smokeMat); s.visible = false; scene.add(s); smoke.push(s); }
    const tag = label(c.name, anchor(0, c.h + 0.14, 0, jarG));
    return { ...c, flame, jarG, smoke, tag, o: 1, lit: true, out: 0, y: c.h + 0.0, down: false, jy: 0 };
  });
  const UPY = 1.0;
  for (const c of candles) { c.jy = UPY; c.jarG.position.set(c.x, BT + 0.03 + c.jy, 0); }
  function candleFrame(dt) {
    let busy = false;
    for (const c of candles) {
      busy = kit.follow(c, 'jy', c.down ? 0 : UPY, dt, 4) || busy;
      c.jarG.position.set(c.x, BT + 0.03 + c.jy, 0);
      // Oxygen in the jar is used up faster in a small jar: the time scales with the jar's volume.
      if (c.down && c.jy < 0.05 && c.lit) {
        const vol = c.r * c.r * c.h;
        c.o -= (dt * 0.022) / vol;
        if (c.o <= 0.08) { c.lit = false; c.out = 0; }
      }
      if (!c.down && !c.lit && c.jy > 0.6) { c.lit = true; c.o = 1; }
      if (!c.down && c.lit) c.o = Math.min(1, c.o + dt);
      const sz = c.lit ? Math.sqrt(kit.clamp(c.o, 0, 1)) : 0;
      c.flame.visible = sz > 0.02;
      const fl = 1 + Math.sin(st.time * 17 + c.x) * 0.06 + Math.sin(st.time * 29 + c.x * 3) * 0.04;
      c.flame.scale.set(sz * (0.6 + 0.4 * sz), sz * fl, sz * (0.6 + 0.4 * sz));
      if (!c.lit) c.out += dt;
      c.smoke.forEach((s, i) => {
        const t = c.out - i * 0.18, on = !c.lit && t > 0 && t < 2.6;
        s.visible = on;
        if (on) { s.position.set(c.x + Math.sin(t * 3 + i) * 0.03, BT + 0.42 + t * 0.16, Math.cos(t * 2 + i) * 0.02); s.scale.setScalar(0.02 + t * 0.012); busy = true; }
      });
      c.tag.text = c.lit ? c.name : `${c.name}: out`;
      busy = busy || c.lit;
    }
    return busy;
  }
  const cover = () => { for (const c of candles) c.down = true; };
  const uncover = () => { for (const c of candles) c.down = false; };

  const tags = [jarTag, tissueTag, tankTag, nTag, oTag, arTag, airBoxTag, fanTag, windTag, ...balloons.map(b => b.tag), ...candles.map(c => c.tag)];
  const views = [
    { radius: 1.25, yaw: 0.25, pitch: 0.28, target: [X.jar, BT + 0.75, 0] },
    { radius: 1.2, yaw: 0.2, pitch: 0.2, target: [X.tank, BT + 0.8, 0] },
    { radius: 1.35, yaw: 0.15, pitch: 0.15, target: [X.bal, BT + 1.15, 0] },
    { radius: 1.45, yaw: 0.55, pitch: 0.3, target: [(X.fan + X.wheel) / 2, BT + 0.7, 0] },
    { radius: 1.05, yaw: 0.3, pitch: 0.2, target: [X.box, BY, 0] },
    { radius: 1.2, yaw: 0.15, pitch: 0.2, target: [(X.c1 + X.c2) / 2, BT + 0.9, 0] },
  ];

  cupFrame(0); balFrame(0); fanFrame(0);

  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.plan = [];
      for (const t of tags) t.show(false);
      airDots.visible = i === 0;
      if (i === 0) {
        jarTag.show(true);
        ui.toggle({ label: 'Show the air', value: true, onChange: v => { airDots.visible = v; } });
      }
      if (i === 1) {
        tissueTag.show(true); tankTag.show(true);
        cupReset(); cupS.p = 0;
        cupS.slider = ui.slider({ label: 'Push the cup down', min: 0, max: 1, step: 0.01, value: 0, format: v => `${Math.round(v * 100)}%`, onInput: v => { st.plan = []; cupS.p = v; } });
        ui.buttons([
          { label: 'Poke a hole in the cup', onClick: () => { st.plan = []; cupS.hole = true; if (cupS.p < 0.9) { cupS.p = 1; cupS.slider.set(1); } } },
          { label: 'Start again', onClick: () => { st.plan = []; cupReset(); cupS.p = 0; cupS.slider.set(0); } },
        ]);
        st.plan = [[0, d => { cupS.p = Math.min(1, cupS.p + d / 1.8); cupS.slider.set(cupS.p); return cupS.p < 1; }]];
      }
      if (i === 2) {
        for (const b of balloons) { b.to = 1; b.air = 1; b.tag.show(true); }
        balS.tilt = 0;
        const row = ui.buttons([{ label: 'Let the air out', onClick: () => { st.plan = []; letOut(); } }, { label: 'Blow it up again', onClick: () => { st.plan = []; blowUp(); } }]);
        st.plan = [[0.6, () => { letOut(); row.select(0); }]];
      }
      if (i === 3) {
        fanTag.show(true);
        fanS.speed = 2;
        const names = ['Off', 'Low', 'Medium', 'High'];
        ui.slider({ label: 'Fan speed', min: 0, max: 3, step: 1, value: 2, format: v => names[v] || '', onInput: v => { fanS.speed = v; } });
      }
      if (i === 4) {
        airBoxTag.show(true);
        boxS.sorted = false;
        const row = ui.buttons([{ label: 'Sort 100 particles', onClick: () => { st.plan = []; boxS.sorted = true; } }, { label: 'Mix them up', onClick: () => { st.plan = []; boxS.sorted = false; } }]);
        st.plan = [[0.4, () => { boxS.sorted = true; row.select(0); }]];
        ui.readout('<b style="color:#4361ee">Blue</b>: nitrogen &nbsp; <b style="color:#e63946">Red</b>: oxygen &nbsp; <b style="color:#868e96">Grey</b>: other gases');
      }
      if (i === 5) {
        for (const c of candles) { c.down = false; c.jy = UPY; c.lit = true; c.o = 1; c.tag.show(true); }
        const row = ui.buttons([{ label: 'Cover the candles', onClick: () => { st.plan = []; cover(); } }, { label: 'Take off the jars', onClick: () => { st.plan = []; uncover(); } }]);
        st.plan = [[0.3, () => { cover(); row.select(0); }]];
      }
      if (isQuiz) {
        airDots.visible = false; boxS.sorted = false;
        for (const c of candles) { c.down = false; c.lit = true; c.o = 1; }
        view({ radius: 2, width: 9.6, yaw: 0, pitch: 0.28, target: [0.5, BT + 0.75, 0] }, instant);
      } else view(views[i], instant);
    },
    update(dt) {
      st.time += dt;
      let busy = false;
      st.plan = st.plan.filter(([at, fn]) => {
        if (st.time < at) return true;
        busy = true;
        return fn(dt) === true;
      });
      busy = st.plan.length > 0 || busy;
      const s = st.quiz ? -1 : st.step;
      if (s === 0 && airDots.visible) { moveAir(dt); busy = true; }
      if (s === 1) busy = cupFrame(dt) || busy;
      if (s === 2) busy = balFrame(dt) || busy;
      if (s === 3 || st.quiz) busy = fanFrame(dt) || busy;
      if (s === 4 || st.quiz) busy = boxFrame(dt) || busy;
      if (s === 5 || st.quiz) busy = candleFrame(dt) || busy;
      if (s !== 1) cupFrame(0);
      if (s !== 2) balFrame(dt);
      return busy;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
