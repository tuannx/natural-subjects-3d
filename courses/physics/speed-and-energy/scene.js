// Speed and energy: a toy car rolls down a ramp from three marks and hits a wooden block. Higher start →
// faster car (v = √(2gh)) → the block slides farther (distance grows with v²). A row of hanging balls passes
// energy along, crashes make sound rings and a little heat, and a chart shows energy changing form.
const G = 6;                         // gentle gravity so children can follow the motion
const RAMP = { x0: -6.5, top: 1.8, x1: -3 };   // ramp from (x0, top) down to (x1, 0)
const THETA = Math.atan2(RAMP.top, RAMP.x1 - RAMP.x0), SIN = Math.sin(THETA), COS = Math.cos(THETA);
const RAMP_L = Math.hypot(RAMP.top, RAMP.x1 - RAMP.x0);
const MARKS = [{ key: 'low', name: 'Low', h: 0.6, color: 0x2a9d8f }, { key: 'mid', name: 'Middle', h: 1.2, color: 0xf4a300 }, { key: 'high', name: 'High', h: 1.8, color: 0xe63946 }];
const VMAX = Math.sqrt(2 * G * RAMP.top);
const CAR_F = 0.38;                  // from the car's centre to its front bumper
const BLOCK_X = 0, BLOCK_S = 0.6;    // wooden block (steps 3, 5, 6)
const SLIDE = 2.6;                   // block slowing down by friction
const ROLL = 0.12;                   // car rolling friction on the flat
const CR = { x: 7.2, top: 2.2, len: 1.4, r: 0.22 };   // the row of hanging balls

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xe3c79f, sky: 0xeaf3fb, radius: 18 });
  kit.lights(scene, { sun: [2, 11, 7] });

  // Floor track: a light strip along the car's path.
  const strip = kit.mesh(new THREE.BoxGeometry(7.2, 0.02, 1.0), kit.mat(0xf3e6cf), [0.6, 0.01, 0], scene);
  strip.castShadow = false;

  // ---- Ramp with support legs and three start marks.
  const rampMat = kit.mat(0x5fa8d3, { roughness: 0.6 });
  const ramp = kit.mesh(new THREE.BoxGeometry(RAMP_L, 0.1, 1.0), rampMat, [(RAMP.x0 + RAMP.x1) / 2 - 0.05 * SIN, RAMP.top / 2 - 0.05 * COS, 0], scene);
  ramp.rotation.z = -THETA;
  [0.25, 0.6, 0.95].forEach(f => {
    const x = RAMP.x0 + (RAMP.x1 - RAMP.x0) * (1 - f) + 0.05, h = RAMP.top * f - 0.08;
    for (const z of [-0.4, 0.4]) kit.mesh(new THREE.BoxGeometry(0.08, h, 0.08), kit.mat(0x3d6f8f), [x, h / 2, z], scene);
  });
  const rampPoint = (h, out) => out.set(RAMP.x1 - h / Math.tan(THETA), h, 0);   // point on the ramp surface at height h
  const markTags = MARKS.map(m => {
    const p = rampPoint(m.h, new THREE.Vector3());
    const stripe = kit.mesh(new THREE.BoxGeometry(0.08, 0.02, 1.02), kit.mat(m.color), [p.x, p.y + 0.01, 0], scene);
    stripe.rotation.z = -THETA; stripe.castShadow = false;
    const at = new THREE.Object3D(); at.position.set(p.x - 0.1, p.y + 0.1, -0.55); scene.add(at);
    return label(m.name, at);
  });

  // ---- The toy car (origin at the bottom of the wheels, pointing +x).
  const car = new THREE.Group();
  scene.add(car);
  const body = kit.mat(0xe63946, { roughness: 0.4 });
  kit.mesh(new THREE.BoxGeometry(0.76, 0.2, 0.42), body, [0, 0.2, 0], car);
  kit.mesh(new THREE.BoxGeometry(0.36, 0.17, 0.36), kit.mat(0xbfe3ff, { roughness: 0.2 }), [-0.06, 0.38, 0], car);
  const wheels = [];
  for (const x of [-0.24, 0.24]) for (const z of [-0.22, 0.22]) {
    const w = kit.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 16), kit.mat(0x222222), [x, 0.1, z], car);
    w.rotation.x = Math.PI / 2; wheels.push(w);
  }
  const carTag = label('', new THREE.Object3D());
  car.add(carTag.at); carTag.at.position.y = 0.55;

  // ---- Wooden block, cushion, flags, speed gate.
  const woodTex = paint(THREE, 128, 128, grain);
  const block = kit.mesh(new THREE.BoxGeometry(BLOCK_S, BLOCK_S, BLOCK_S), kit.mat(0xffffff, { map: woodTex }), [BLOCK_X, BLOCK_S / 2, 0], scene);
  const cushion = kit.mesh(new THREE.SphereGeometry(0.5, 20, 12), kit.mat(0xf28fb5, { roughness: 1 }), [3.6, 0.35, 0], scene);
  cushion.scale.set(0.6, 0.75, 1.1);
  const flags = MARKS.map((m, i) => {
    const g = new THREE.Group();
    scene.add(g);
    kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), kit.mat(0x555555), [0, 0.45, 0], g);
    const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0.35, -0.12); tri.lineTo(0, -0.24);
    const f = kit.mesh(new THREE.ShapeGeometry(tri), kit.mat(m.color, { side: THREE.DoubleSide }), [0, 0.9, 0], g);
    f.castShadow = false;
    const at = new THREE.Object3D(); at.position.y = 1.0 + i * 0.28; g.add(at);
    const tag = label(m.name, at);
    g.visible = false;
    return { g, tag };
  });
  const gate = new THREE.Group();
  gate.position.set(-2.2, 0, 0);
  scene.add(gate);
  const gateMat = kit.mat(0x7b61ff);
  for (const z of [-0.6, 0.6]) kit.mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), gateMat, [0, 0.55, z], gate);
  kit.mesh(new THREE.BoxGeometry(0.1, 0.12, 1.3), gateMat, [0, 1.12, 0], gate);
  const gateAt = new THREE.Object3D(); gateAt.position.set(0, 1.3, 0); gate.add(gateAt);
  const gateTag = label('Speed check', gateAt, { cls: 'cool' });

  // ---- Tower of three blocks (step 1).
  const towerMats = [0x3a86ff, 0xffbe0b, 0x8ac926].map(c => kit.mat(c, { roughness: 0.5 }));
  const TB = 0.4;
  const tower = towerMats.map((m, i) => ({ mesh: kit.mesh(new THREE.BoxGeometry(TB, TB, TB), m, [0, 0, 0], scene), i, p: new THREE.Vector3(), v: new THREE.Vector3(), spin: 0, rot: 0, still: true }));
  function buildTower() {
    tower.forEach(b => { b.p.set(0.4, TB / 2 + b.i * TB, 0); b.v.set(0, 0, 0); b.spin = 0; b.rot = 0; b.still = true; b.mesh.rotation.set(0, 0, 0); b.mesh.position.copy(b.p); });
    st.towerHit = false;
  }
  function knockTower(v) {
    const push = [1.0, 0.7, 0.45], side = [0.3, -0.35, 0.12];
    tower.forEach(b => { b.v.set(v * push[b.i], 0.4 + b.i * 0.5, v * side[b.i]); b.spin = -v * (1.5 + b.i); b.still = false; });
    st.towerHit = true;
  }
  function runTower(dt) {
    for (const b of tower) {
      if (b.still) continue;
      b.v.y -= G * dt;
      b.p.addScaledVector(b.v, dt);
      b.rot += b.spin * dt;
      if (b.p.y <= TB / 2) {
        b.p.y = TB / 2; b.v.y = 0;
        const k = Math.max(0, 1 - 1.8 * dt);
        b.v.x *= k; b.v.z *= k; b.spin *= k;
        // Settle flat on a face.
        const flat = Math.round(b.rot / (Math.PI / 2)) * (Math.PI / 2);
        b.rot += (flat - b.rot) * Math.min(1, 6 * dt);
        if (Math.abs(b.v.x) + Math.abs(b.v.z) < 0.02 && Math.abs(flat - b.rot) < 0.01) { b.rot = flat; b.still = true; }
      }
      b.mesh.position.copy(b.p);
      b.mesh.rotation.z = b.rot;
    }
  }

  // ---- Sound rings and a warm glow at a crash (step 5).
  const rings = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 4, 40), new THREE.MeshBasicMaterial({ color: 0x7b61ff, transparent: true, opacity: 0, depthWrite: false }));
    r.visible = false; scene.add(r);
    return r;
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(glow);
  const bangAt = new THREE.Object3D(); scene.add(bangAt);
  const bangTag = label('BANG!', bangAt, { cls: 'big warm' });
  const crashFx = { t: 9, size: 1, at: new THREE.Vector3() };

  // ---- Energy chart on a board (step 6).
  const chartCanvas = document.createElement('canvas');
  chartCanvas.width = 360; chartCanvas.height = 200;
  const chartTex = new THREE.CanvasTexture(chartCanvas);
  chartTex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Group();
  board.position.set(-1.5, 0, -1.6);
  scene.add(board);
  for (const x of [-1.45, 1.45]) kit.mesh(new THREE.BoxGeometry(0.07, 3.0, 0.07), kit.mat(0x8a5a33), [x, 1.5, -0.08], board);
  kit.mesh(new THREE.BoxGeometry(3.1, 1.76, 0.05), kit.mat(0x8a5a33), [0, 2.2, -0.04], board);
  const chart = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.66), new THREE.MeshBasicMaterial({ map: chartTex }));
  chart.position.set(0, 2.2, 0.01);
  board.add(chart);
  let chartKey = '';
  function drawChart(stored, motion, other) {
    const key = `${stored.toFixed(2)}|${motion.toFixed(2)}|${other.toFixed(2)}`;
    if (key === chartKey) return;
    chartKey = key;
    const g = chartCanvas.getContext('2d'), W = 360, H = 200;
    g.fillStyle = '#fbfbf6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#333'; g.font = 'bold 20px sans-serif'; g.fillText('Where is the energy?', 14, 30);
    [['Stored (height)', stored, '#2a9d8f'], ['Motion', motion, '#e63946'], ['Sound + heat', other, '#f4a300']].forEach(([name, v, col], i) => {
      const y = 52 + i * 48;
      g.fillStyle = '#333'; g.font = 'bold 15px sans-serif'; g.fillText(name, 14, y + 14);
      g.fillStyle = '#e8edf2'; g.fillRect(14, y + 20, W - 28, 16);
      g.fillStyle = col; g.fillRect(14, y + 20, (W - 28) * kit.clamp(v, 0, 1), 16);
    });
    chartTex.needsUpdate = true;
  }

  // ---- Row of hanging balls (step 4).
  const steel = kit.mat(0xd5dde6, { metalness: 0.35, roughness: 0.25 });
  const frameMat = kit.mat(0x34495e);
  for (const z of [-0.45, 0.45]) {
    for (const x of [CR.x - 1.2, CR.x + 1.2]) kit.mesh(new THREE.BoxGeometry(0.07, CR.top, 0.07), frameMat, [x, CR.top / 2, z], scene);
    kit.mesh(new THREE.BoxGeometry(2.47, 0.07, 0.07), frameMat, [CR.x, CR.top, z], scene);
  }
  kit.mesh(new THREE.BoxGeometry(2.6, 0.08, 1.1), frameMat, [CR.x, 0.04, 0], scene).castShadow = false;
  const strMat = new THREE.MeshBasicMaterial({ color: 0x666666 });
  const sLen = Math.hypot(CR.len, 0.45), sTilt = Math.atan2(0.45, CR.len);
  const balls = [0, 1, 2, 3, 4].map(i => {
    const g = new THREE.Group();
    g.position.set(CR.x + (i - 2) * CR.r * 2.02, CR.top, 0);
    scene.add(g);
    kit.mesh(new THREE.SphereGeometry(CR.r, 24, 16), steel, [0, -CR.len, 0], g);
    for (const s of [-1, 1]) {
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, sLen, 4), strMat);
      str.position.set(0, -CR.len / 2, s * 0.225); str.rotation.x = s * sTilt; g.add(str);
    }
    return g;
  });
  const passAt = new THREE.Object3D(); passAt.position.set(CR.x, CR.top - CR.len + CR.r + 0.12, 0); scene.add(passAt);
  const passTag = label('Energy passes along', passAt, { cls: 'warm' });
  const clickRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 4, 32), new THREE.MeshBasicMaterial({ color: 0x7b61ff, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(clickRing);
  const cradle = { phi: 0, w: 0, n: 1, click: 9, side: 0, clickX: CR.x };

  // ======== State.
  const st = { step: 0, time: 0, quiz: false, auto: false, msg: '', mark: 2, plan: [], towerHit: false, landed: {} };
  const say = html => { if (html !== st.msg) { st.msg = html; ui.readout(html); } };
  // Car motion: 'idle' | 'ramp' (s = distance down the ramp from the top) | 'flat' (x).
  const cs = { mode: 'idle', s: 0, x: 0, v: 0, hit: false, gateV: 0, total: 1 };
  const bs = { x: BLOCK_X, v: 0, moving: false };
  const tmp = new THREE.Vector3();

  function placeCarOnRamp(h) {
    cs.mode = 'ramp'; cs.v = 0; cs.hit = false; cs.gateV = 0;
    cs.s = (RAMP.top - h) / SIN;
    cs.total = h;
    syncCar();
  }
  function release(i) {
    st.mark = i;
    placeCarOnRamp(MARKS[i].h);
    cs.go = true;
    if (block.visible) { bs.x = BLOCK_X; bs.v = 0; bs.moving = false; block.position.x = BLOCK_X; }
    chartKey = '';
  }
  function syncCar() {
    if (cs.mode === 'ramp') {
      car.position.set(RAMP.x0 + cs.s * COS, RAMP.top - cs.s * SIN, 0);
      car.rotation.z = -THETA;
    } else {
      car.position.set(cs.x, 0, 0);
      car.rotation.z = 0;
    }
  }
  function crash(v) {
    crashFx.t = 0;
    crashFx.size = 0.4 + (v / VMAX) * 0.9;
    crashFx.at.set(BLOCK_X - BLOCK_S / 2, 0.25, 0.1);
    glow.position.copy(crashFx.at);
    bangAt.position.copy(crashFx.at).add(tmp.set(0, 0.9, 0));
  }

  function runCar(dt) {
    if (cs.mode === 'idle' || !cs.go) return false;
    if (cs.mode === 'ramp') {
      cs.v += G * SIN * dt;
      cs.s += cs.v * dt;
      if (cs.s >= RAMP_L) { cs.mode = 'flat'; cs.x = RAMP.x1 + (cs.s - RAMP_L); cs.v = Math.sqrt(2 * G * cs.total); }
    } else {
      cs.x += cs.v * dt;
      cs.v = Math.max(0, cs.v - ROLL * dt);
      if (!cs.gateV && cs.x > gate.position.x) cs.gateV = cs.v;
      if (block.visible && !cs.hit && cs.x + CAR_F >= bs.x - BLOCK_S / 2) {
        // The car hands most of its motion to the block (same mass, a little lost to sound and heat).
        cs.hit = true;
        cs.x = bs.x - BLOCK_S / 2 - CAR_F;
        bs.v = 0.8 * cs.v; bs.moving = true;
        if (st.step === 4 || st.step === 5) crash(cs.v);
        cs.v *= 0.2;
      }
      if (st.step === 0 && !st.towerHit && cs.x + CAR_F >= 0.4 - TB / 2) { knockTower(cs.v); cs.v *= 0.3; }
      if (cushion.visible && cs.x + CAR_F > cushion.position.x - 0.3) cs.v = Math.max(0, cs.v - 14 * dt);
      if (st.step === 0 || cushion.visible) cs.v = Math.max(0, cs.v - (st.towerHit || cushion.visible ? 0.8 : 0) * dt);
      if (cs.hit && block.visible) cs.v = Math.max(0, cs.v - 1.5 * dt);   // the bumped car soon stops
      if (cs.v === 0) cs.go = false;
    }
    syncCar();
    for (const w of wheels) w.rotation.y -= cs.v * dt / 0.1;
    return true;
  }
  function runBlock(dt) {
    if (!bs.moving) return false;
    bs.x += bs.v * dt;
    bs.v = Math.max(0, bs.v - SLIDE * dt);
    block.position.x = bs.x;
    if (bs.v === 0) {
      bs.moving = false;
      if (st.step === 2) {
        const f = flags[st.mark];
        f.g.position.set(bs.x + 0.1, 0, 0.75); f.g.visible = true; f.tag.show(true);
        st.landed[st.mark] = bs.x - BLOCK_X;
      }
    }
    return true;
  }

  function hideAll() {
    markTags.forEach(t => t.show(false));
    flags.forEach(f => { f.g.visible = false; f.tag.show(false); });
    gateTag.show(false); passTag.show(false); bangTag.show(false); carTag.show(false);
    gate.visible = false; cushion.visible = false; block.visible = false; board.visible = false;
    tower.forEach(b => { b.mesh.visible = false; });
    rings.forEach(r => { r.visible = false; }); glow.material.opacity = 0;
    crashFx.t = 9;
    st.landed = {};
  }
  const speedWord = v => (v > 0.9 * VMAX ? 'fast' : v > 0.7 * VMAX ? 'medium' : 'slow');
  const bar = (v, col) => `<span style="display:inline-block;vertical-align:middle;height:10px;border-radius:5px;background:${col};width:${Math.round(20 + 120 * v / VMAX)}px"></span>`;
  const markButtons = onPick => ui.buttons(MARKS.map((m, i) => ({ label: m.name, onClick: () => { st.auto = false; onPick(i); } })));

  const VR = { radius: 2.4, width: 4.6, yaw: 0, pitch: 0.28 };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.time = 0; st.auto = true; st.msg = ''; st.plan = [];
      hideAll();
      cs.mode = 'idle'; cs.go = false;
      cradle.phi = 0; cradle.w = 0;

      if (i === 0) {
        view({ radius: 1.6, width: 2.9, yaw: 0.1, pitch: 0.3, target: [0.1, 0.45, 0] });
        tower.forEach(b => { b.mesh.visible = true; });
        buildTower();
        const roll = () => { cs.mode = 'flat'; cs.x = -2.4; cs.v = 2.6; cs.go = true; cs.hit = true; syncCar(); };
        cs.mode = 'flat'; cs.x = -2.4; cs.v = 0; syncCar();
        st.plan = [[0.3, roll]];
        ui.buttons([{ label: 'Roll the car', onClick: () => { st.auto = false; if (st.towerHit) buildTower(); roll(); } }, { label: 'Build the tower again', onClick: () => { st.auto = false; buildTower(); cs.mode = 'flat'; cs.x = -2.4; cs.v = 0; cs.go = false; syncCar(); } }]);
        say('The car is still. Push it and it will roll.');
      }
      if (i === 1) {
        view({ ...VR, target: [-2.2, 0.8, 0] });
        markTags.forEach(t => t.show(true));
        gate.visible = true; gateTag.show(true); cushion.visible = true;
        placeCarOnRamp(MARKS[2].h);
        st.plan = [[0.3, () => release(2)], [5, () => release(0)], [9.5, () => release(1)]];
        markButtons(release);
        say('Tap a mark to let the car go from there.');
      }
      if (i === 2) {
        view({ ...VR, target: [-1.9, 0.75, 0] });
        markTags.forEach(t => t.show(true));
        block.visible = true;
        placeCarOnRamp(MARKS[2].h);
        st.plan = [[0.3, () => release(2)], [5, () => release(0)], [9.5, () => release(1)]];
        markButtons(release);
        say('Where will the block stop? Tap a mark to let the car go.');
      }
      if (i === 3) {
        view({ radius: 1.55, yaw: 0, pitch: 0.12, target: [CR.x, 1.25, 0] });
        passTag.show(true);
        const swing = n => () => { st.auto = false; cradle.n = n; cradle.phi = -0.7; cradle.w = 0; cradle.side = -1; };
        cradle.n = 1; cradle.phi = -0.7; cradle.w = 0; cradle.side = -1;
        st.plan = [[8, () => { cradle.n = 2; cradle.phi = -0.7; cradle.w = 0; cradle.side = -1; st.row.select(1); }]];
        st.row = ui.buttons([{ label: 'Swing one ball', onClick: swing(1), on: true }, { label: 'Swing two balls', onClick: swing(2) }]);
      }
      if (i === 4) {
        view({ radius: 1.7, width: 2.6, yaw: 0.25, pitch: 0.25, target: [-1.1, 0.6, 0] });
        block.visible = true;
        placeCarOnRamp(MARKS[2].h);
        const go = m => () => { st.auto = false; release(m); };
        st.plan = [[0.3, () => release(2)]];
        ui.buttons([{ label: 'Slow crash', onClick: go(0) }, { label: 'Fast crash', onClick: go(2) }]);
        say('Listen for the bang!');
      }
      if (i === 5) {
        view({ radius: 2.4, width: 4.6, yaw: 0, pitch: 0.18, target: [-2.2, 1.35, -0.6] });
        block.visible = true; board.visible = true;
        placeCarOnRamp(MARKS[2].h);
        chartKey = '';
        st.plan = [[0.6, () => release(2)]];
        ui.buttons([{ label: 'Let go', onClick: () => { st.auto = false; release(2); } }]);
      }
      if (isQuiz) {
        view({ radius: 2.6, width: 7.8, yaw: 0, pitch: 0.3, target: [0.4, 0.9, 0] });
        block.visible = true; cushion.visible = false;
        placeCarOnRamp(MARKS[2].h);
        bs.x = BLOCK_X; block.position.x = BLOCK_X;
      }
    },

    update(dt) {
      st.time += dt;
      const t = st.time, i = st.step;
      while (st.plan.length && t >= st.plan[0][0]) { const [, fn] = st.plan.shift(); if (st.auto) fn(); }
      let busy = runCar(dt);
      busy = runBlock(dt) || busy;

      if (i === 0) {
        runTower(dt);
        busy = true;
        if (st.towerHit) say('Crash! The car passed some of its <b>energy of motion</b> to the blocks, so they moved.');
        else if (cs.go) say('The car is moving, so it has <b>energy of motion</b>.');
      }
      if (i === 1 && cs.mode !== 'idle') {
        const m = MARKS[st.mark];
        if (cs.gateV) { gateTag.text = `Speed: ${speedWord(cs.gateV)}`; say(`From the <b>${m.name}</b> mark the car passes the speed check going <b>${speedWord(cs.gateV)}</b>. ${bar(cs.gateV, '#7b61ff')}`); }
        else { gateTag.text = 'Speed check'; if (cs.go) say(`Rolling down from the <b>${m.name}</b> mark…`); }
      }
      if (i === 2) {
        const parts = MARKS.map((m, k) => (st.landed[k] != null ? `${m.name}: ${'■'.repeat(Math.max(1, Math.round(st.landed[k] * 4)))}` : null)).filter(Boolean);
        if (parts.length) say(`How far the block slid: <br>${parts.join('<br>')}`);
      }
      if (i === 3) {
        // One swinging angle: negative = the left ball(s) swing, positive = the right ball(s). Passing through
        // zero is the moment the energy goes through the row to the other end.
        const n = Math.ceil(dt / (1 / 240)), h = dt / n;
        for (let s = 0; s < n; s++) {
          cradle.w += (-(9.8 / CR.len) * Math.sin(cradle.phi) - 0.04 * cradle.w) * h;
          const before = cradle.phi;
          cradle.phi += cradle.w * h;
          if (before * cradle.phi < 0) {
            cradle.click = 0;
            // The bump happens where the swinging ball(s) meet the rest of the row.
            const k = cradle.w > 0 ? cradle.n - 1 : 4 - cradle.n;
            cradle.clickX = CR.x + (k - 1.5) * CR.r * 2.02;
          }
        }
        balls.forEach((b, k) => { b.rotation.z = k < cradle.n ? Math.min(0, cradle.phi) : k > 4 - cradle.n ? Math.max(0, cradle.phi) : 0; });
        cradle.click += dt;
        clickRing.visible = cradle.click < 0.5;
        if (clickRing.visible) {
          const s = 0.2 + cradle.click * 1.2;
          clickRing.position.set(cradle.clickX, CR.top - CR.len, 0.3);
          clickRing.scale.setScalar(s); clickRing.material.opacity = 0.8 * (1 - cradle.click / 0.5);
        }
        say(cradle.n === 1 ? 'One ball swings in … and <b>one ball</b> swings out at the other end.' : 'Two balls swing in … and <b>two balls</b> swing out at the other end.');
        busy = true;
      }
      if (crashFx.t < 3) {
        crashFx.t += dt;
        const ct = crashFx.t;
        rings.forEach((r, k) => {
          const u = ct - k * 0.18;
          r.visible = u > 0 && u < 1.2;
          if (r.visible) { r.position.copy(crashFx.at); r.scale.setScalar(0.2 + u * 1.6 * crashFx.size); r.material.opacity = 0.9 * (1 - u / 1.2); }
        });
        glow.material.opacity = kit.clamp(1 - ct / 2.5, 0, 1) * 0.7 * Math.min(1, crashFx.size);
        glow.scale.setScalar(0.6 + crashFx.size * 0.5);
        bangTag.show(ct < 1.4);
        if (i === 4) say(ct < 2.5 ? `<b>Bang!</b> Some of the car's energy changed into <b>sound</b> and a little <b>heat</b>.${crashFx.size > 1 ? ' A fast crash makes a big bang.' : ' A slow crash makes only a small bang.'}` : 'The sound has spread out and the warm spot has cooled down again.');
        busy = true;
      }
      if (i === 5) {
        // Share of the starting energy: stored = height, motion = car + block, the rest became sound and heat.
        const H = cs.total || 1, hNow = cs.mode === 'ramp' ? RAMP.top - cs.s * SIN : 0;
        const stored = cs.mode === 'idle' ? 1 : hNow / H;
        const motion = (0.5 * cs.v * cs.v + 0.5 * bs.v * bs.v) / (G * H);
        const other = Math.max(0, 1 - stored - motion);
        drawChart(stored, Math.min(1, motion), other);
        say(!cs.go && !bs.moving && cs.mode === 'flat' ? 'Everything has stopped. All the energy is now <b>sound and heat</b>. It was not used up, it changed form.' : cs.mode === 'ramp' ? 'Rolling down: <b>stored</b> energy is changing into energy of <b>motion</b>.' : 'Crash and slide: motion energy is changing into <b>sound and heat</b>.');
      }
      return busy || st.plan.length > 0;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function paint(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function grain(g, w, h) {
  g.fillStyle = '#d9a86c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b8864d'; g.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const y = 4 + i * 10 + rand(i) * 4;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 2);
    g.stroke();
  }
  g.strokeStyle = '#a5743d'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
}
