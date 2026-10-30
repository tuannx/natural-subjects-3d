// Float or sink: objects dropped into a glass tank bob and settle. A floating object sits with
// (its density / water density) of its volume under water; anything denser than water sinks.
const WY = 2.1;      // water surface height
const FLOOR = 0.1;   // inside floor of the tank
const G = 6;         // gentle gravity so children can follow the motion
const HALF_X = 3, HALF_Z = 1.1;

// Clay: the same lump makes the ball and the boat. The boat's walls are thin enough to use the
// same amount of clay, so its average density (clay + the air inside) is below water's.
const CLAY_R = 0.26, CLAY_RHO = 1.8;
const BOAT = { w: 0.62, l: 1.0, h: 0.32 };
const clayVol = (4 / 3) * Math.PI * CLAY_R ** 3;
const boatRho = (clayVol * CLAY_RHO) / (BOAT.w * BOAT.l * BOAT.h);
const boatWall = clayVol / (BOAT.w * BOAT.l + 2 * (BOAT.w + BOAT.l) * BOAT.h);

// Density in g/cm3 compared with water (1). shape picks how the under-water part grows with depth.
const DEFS = {
  wood:  { short: 'Wood', name: 'wooden block', rho: 0.6, shape: 'box', hh: 0.2 },
  log:   { short: 'Big log', name: 'big log', rho: 0.6, shape: 'log', hh: 0.3 },
  apple: { short: 'Apple', name: 'apple', rho: 0.8, shape: 'ball', hh: 0.26 },
  ball:  { short: 'Plastic ball', name: 'plastic ball', rho: 0.1, shape: 'ball', hh: 0.3 },
  coin:  { short: 'Coin', name: 'coin', rho: 8.5, shape: 'box', hh: 0.025 },
  rock:  { short: 'Rock', name: 'rock', rho: 2.6, shape: 'ball', hh: 0.25 },
  key:   { short: 'Key', name: 'metal key', rho: 8.5, shape: 'box', hh: 0.03 },
  clay:  { short: 'Clay ball', name: 'clay ball', rho: CLAY_RHO, shape: 'ball', hh: CLAY_R },
  boat:  { short: 'Clay boat', name: 'clay boat', rho: boatRho, shape: 'box', hh: BOAT.h / 2 },
};
// Slots for "test them all": floaters and sinkers alternate so their labels sit at different heights.
const ALL = ['wood', 'coin', 'apple', 'rock', 'ball', 'key', 'boat', 'clay'];
const slotX = i => -2.6 + i * (5.2 / 7);

// Fraction of the object under water when its bottom is `d` below the surface.
function frac(shape, d, r) {
  if (shape === 'ball') return (d * d * (3 * r - d)) / (4 * r ** 3);
  if (shape === 'log') { const a = 2 * Math.acos((r - d) / r); return (a - Math.sin(a)) / (2 * Math.PI); }
  return d / (2 * r);
}
// Depth of the bottom below the surface when floating (fraction under water = density).
function floatDepth(def) {
  let lo = 0, hi = 2 * def.hh;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (frac(def.shape, m, def.hh) < def.rho) lo = m; else hi = m; }
  return lo;
}

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xead9bf, sky: 0xe6f3ff });
  kit.lights(scene, { sun: [4, 9, 6] });

  // Glass tank and water. Transparent parts do not cast shadows or write depth.
  const tankH = 2.7;
  const glassGeo = new THREE.BoxGeometry(HALF_X * 2 + 0.1, tankH, HALF_Z * 2 + 0.1);
  const glass = new THREE.Mesh(glassGeo, new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.16, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.y = tankH / 2;
  glass.renderOrder = 2;
  scene.add(glass);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glassGeo), new THREE.LineBasicMaterial({ color: 0x7fb2cc }));
  edges.position.y = tankH / 2;
  scene.add(edges);
  const base = kit.mesh(new THREE.BoxGeometry(HALF_X * 2 + 0.1, FLOOR, HALF_Z * 2 + 0.1), kit.mat(0x9cc3d4), [0, FLOOR / 2, 0], scene);
  base.castShadow = false;
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3b9be0, transparent: true, opacity: 0.32, roughness: 0.15, depthWrite: false });
  const water = new THREE.Mesh(new THREE.BoxGeometry(HALF_X * 2, WY - FLOOR, HALF_Z * 2), waterMat);
  water.position.y = (WY + FLOOR) / 2;
  water.renderOrder = 1;
  scene.add(water);
  const waterTag = label('Water', new THREE.Vector3(-2.3, 1.2, HALF_Z), { cls: 'cool' });

  // Splash rings on the surface.
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 4, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    r.rotation.x = Math.PI / 2; r.visible = false; r.life = 0;
    scene.add(r); rings.push(r);
  }
  let ringNext = 0;
  const splash = (x, z, size) => {
    const r = rings[ringNext++ % rings.length];
    r.position.set(x, WY + 0.01, z); r.life = 1; r.size = size; r.visible = true;
  };

  // The objects. Each has a group, a label anchor and simple up/down motion.
  const builders = makeBuilders(THREE, kit);
  const objs = {};
  for (const kind of Object.keys(DEFS)) {
    const def = DEFS[kind], g = builders[kind]();
    g.visible = false;
    scene.add(g);
    const anchor = new THREE.Object3D();
    scene.add(anchor);
    const tag = label(def.short, anchor);
    tag.show(false);
    objs[kind] = { kind, def, g, anchor, tag, y: 0, v: 0, t: 0, x: 0, z: 0, active: false, held: false, eq: WY + def.hh - floatDepth(def) };
  }
  // Water mask: an invisible lid at the water line inside the boat, so the water surface
  // does not show inside the hollow hull.
  const mask = new THREE.Mesh(new THREE.PlaneGeometry(BOAT.w - 2 * boatWall, BOAT.l - 2 * boatWall), new THREE.MeshBasicMaterial({ colorWrite: false }));
  mask.rotation.x = -Math.PI / 2; mask.renderOrder = 5; mask.visible = false;
  scene.add(mask);

  function place(kind, x, z = 0, how = 'held') {
    const o = objs[kind];
    o.active = true; o.g.visible = true; o.x = x; o.z = z; o.v = 0; o.t = 0; o.splashed = false;
    o.held = how === 'held';
    o.y = how === 'settled' ? (o.def.rho < 1 ? o.eq : FLOOR + o.def.hh) : WY + 0.85 + o.def.hh;
    if (how === 'settled') { o.t = 9; o.splashed = true; }  // label updates on the next frame
    o.g.rotation.set(0, 0, 0);
    o.done = false; o.tag.text = o.def.short; o.tag.show(st.step < 5);
    sync(o);
  }
  const drop = (kind, x, z = 0) => { place(kind, x, z, 'held'); objs[kind].held = false; };
  function clearTank() { for (const o of Object.values(objs)) { o.active = false; o.g.visible = false; o.tag.show(false); } mask.visible = false; }
  function sync(o) {
    o.g.position.set(o.x, o.y, o.z);
    o.anchor.position.set(o.x, o.y + o.def.hh + 0.1, o.z);
    if (o.kind === 'boat') {
      const top = o.y + o.def.hh, floor = o.y - o.def.hh + boatWall;
      mask.visible = o.active && floor < WY;
      mask.position.set(o.x, Math.min(WY + 0.004, top), o.z);
    }
  }

  // One small physics step: weight down, water push up (share of volume under water), water drag.
  function physics(o, h) {
    const d = kit.clamp(WY - (o.y - o.def.hh), 0, 2 * o.def.hh);
    const f = frac(o.def.shape, d, o.def.hh);
    const a = G * (f / o.def.rho - 1) - (0.4 + 5 * f) * o.v;
    o.v += a * h; o.y += o.v * h;
    if (o.y - o.def.hh < FLOOR) { o.y = FLOOR + o.def.hh; o.v = Math.max(0, -o.v * 0.15); }
    if (!o.splashed && d > 0) { o.splashed = true; splash(o.x, o.z, 0.5 + Math.min(1.2, -o.v * 0.25)); }
    return f;
  }
  // In "test them all" the label says only the result, so neighbouring labels stay short.
  const result = o => { const r = o.def.rho < 1 ? 'floats' : 'sinks'; return st.step === 5 ? r[0].toUpperCase() + r.slice(1) : `${o.def.short}: ${r}`; };

  // Balance scale (step 3): the object on one pan, the same shape made of water on the other.
  const BX = 5.3, BZ = 0.2, ARM = 1;
  const balance = new THREE.Group();
  balance.position.set(BX, 0, BZ);
  scene.add(balance);
  const steel = kit.mat(0x8d99ae, { metalness: 0.5, roughness: 0.4 });
  kit.mesh(new THREE.BoxGeometry(0.9, 0.1, 0.6), kit.mat(0x6d597a), [0, 0.05, 0], balance);
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.55, 12), steel, [0, 0.82, 0], balance);
  const beam = new THREE.Group();
  beam.position.y = 1.6;
  balance.add(beam);
  kit.mesh(new THREE.BoxGeometry(ARM * 2 + 0.2, 0.07, 0.1), steel, [0, 0, 0], beam);
  const pans = [-1, 1].map(side => {
    const p = new THREE.Group();
    balance.add(p);
    kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 4), steel, [0, -0.45, 0], p);
    kit.mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.05, 24), steel, [0, -0.92, 0], p);
    p.side = side;
    return p;
  });
  const waterTwinMat = new THREE.MeshStandardMaterial({ color: 0x3b9be0, transparent: true, opacity: 0.6, roughness: 0.2 });
  const twins = {};
  const twin = kind => {
    if (!twins[kind]) {
      const a = objs[kind].g.clone(), b = objs[kind].g.clone();
      b.traverse(m => { if (m.isMesh) m.material = waterTwinMat; });
      a.visible = b.visible = true;
      pans[0].add(a); pans[1].add(b);
      twins[kind] = [a, b];
    }
    return twins[kind];
  };
  const thingTag = label('', new THREE.Object3D());
  const waterTwinTag = label('Same amount of water', new THREE.Object3D(), { cls: 'cool' });
  pans[0].add(thingTag.at); pans[1].add(waterTwinTag.at);
  thingTag.at.position.y = -0.3; waterTwinTag.at.position.y = -0.3;

  const st = { step: 0, time: 0, quiz: false, plan: [], auto: false, tilt: 0, tiltTo: 0, onScale: null, push: 0, slider: null, cycle: 0 };

  function weigh(kind) {
    st.onScale = kind;
    for (const [k, [a, b]] of Object.entries(twins)) a.visible = b.visible = k === kind;
    const [a, b] = twin(kind);
    a.visible = b.visible = true;
    for (const t of [a, b]) { t.position.set(0, -0.895 + DEFS[kind].hh, 0); t.rotation.set(0, 0, 0); }
    const rho = DEFS[kind].rho;
    st.tiltTo = kit.clamp(0.6 * (rho - 1) / (rho + 1), -0.28, 0.28);
    thingTag.text = DEFS[kind].short;
    const heavier = rho > 1;
    ui.readout(`The ${DEFS[kind].name} is <b>${heavier ? 'heavier' : 'lighter'}</b> than the same amount of water, so it <b>${heavier ? 'sinks' : 'floats'}</b>.`);
    clearTank();
    drop(kind, 2.1, 0);
  }

  // Push-down rod and force arrows (step 4).
  const rod = kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 8), kit.mat(0xb08968), [0, 0, 0], scene);
  const arrow = (color) => {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 8), m);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 12), m);
    g.add(shaft, head); g.shaft = shaft; g.head = head;
    scene.add(g);
    g.set = (x, y, len, dir) => {
      g.position.set(x, y, 0.4);
      g.rotation.z = dir > 0 ? 0 : Math.PI;
      shaft.scale.y = Math.max(0.001, len); shaft.position.y = len / 2;
      head.position.y = len + 0.1;
      g.visible = true;
    };
    return g;
  };
  const upArrow = arrow(0x1d6fd8), downArrow = arrow(0xe63946);
  const upTag = label('Water pushes up', new THREE.Object3D(), { cls: 'cool' });
  const downTag = label('Weight', new THREE.Object3D(), { cls: 'warm' });
  upArrow.add(upTag.at); downArrow.add(downTag.at);

  function hideExtras() {
    balance.visible = false; rod.visible = false; upArrow.visible = downArrow.visible = false;
    thingTag.show(false); waterTwinTag.show(false); upTag.show(false); downTag.show(false);
    waterTag.show(false);
  }

  const wide = { radius: 3.1, yaw: 0.3, pitch: 0.22, target: [0, 1.25, 0] };

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.auto = false;
      hideExtras(); clearTank();
      if (i === 0) {
        view(wide);
        waterTag.show(true);
        place('wood', -1.1); place('rock', 1.1);
        st.plan = [[0.5, () => drop('wood', -1.1)], [1.6, () => drop('rock', 1.1)]];
        ui.buttons([{ label: 'Drop the wooden block', onClick: () => drop('wood', -1.1) }, { label: 'Drop the rock', onClick: () => drop('rock', 1.1) }]);
      }
      if (i === 1) {
        view({ radius: 3, yaw: -0.35, pitch: 0.25, target: [0, 1.3, 0] });
        place('log', -1.1); place('coin', 1.1);
        st.plan = [[0.8, () => drop('log', -1.1)], [2.2, () => drop('coin', 1.1)]];
        ui.buttons([{ label: 'Drop the big log', onClick: () => drop('log', -1.1) }, { label: 'Drop the coin', onClick: () => drop('coin', 1.1) }]);
        ui.readout('The log is <b>much heavier</b> than the coin.');
      }
      if (i === 2) {
        view({ radius: 2.5, yaw: 0.2, pitch: 0.2, target: [4.1, 1.05, 0.2] });
        balance.visible = true; thingTag.show(true); waterTwinTag.show(true);
        st.tilt = 0; st.auto = true; st.cycle = 0;
        const kinds = ['wood', 'rock', 'apple', 'key', 'ball'];
        ui.buttons(kinds.map(k => ({ label: DEFS[k].short, onClick: () => { st.auto = false; weigh(k); } })));
        weigh('wood');
      }
      if (i === 3) {
        st.msg = '';
        view({ radius: 2.5, yaw: 0.25, pitch: 0.2, target: [0, 1.5, 0] });
        place('ball', 0, 0, 'settled');
        objs.ball.held = true; objs.ball.tag.show(false);
        rod.visible = true; upTag.show(true); downTag.show(true);
        st.push = 0; st.auto = true; st.cycle = 0;
        st.slider = ui.slider({ label: 'Push the ball down', min: 0, max: 1, step: 0.01, value: 0, format: v => `${Math.round(v * 100)}%`, onInput: v => { st.auto = false; objs.ball.held = true; st.push = v; } });
        ui.buttons([{ label: 'Let go', onClick: () => { st.auto = false; objs.ball.held = false; } }]);
      }
      if (i === 4) {
        view({ radius: 2.6, yaw: 0.45, pitch: 0.3, target: [0, 1.4, 0] });
        place('clay', -1.1); place('boat', 1.1);
        st.plan = [[0.6, () => drop('clay', -1.1)], [2.4, () => drop('boat', 1.1)]];
        ui.buttons([{ label: 'Drop the clay ball', onClick: () => drop('clay', -1.1) }, { label: 'Drop the clay boat', onClick: () => drop('boat', 1.1) }]);
        ui.readout('Same clay, same weight. Only the <b>shape</b> is different.');
      }
      if (i === 5 || isQuiz) {
        view({ ...wide, yaw: isQuiz ? -0.3 : 0.15, pitch: isQuiz ? 0.32 : 0.2 });
        ALL.forEach((k, j) => place(k, slotX(j), 0, isQuiz ? 'settled' : 'held'));
        if (!isQuiz) {
          st.auto = true;
          st.plan = ALL.map((k, j) => [4 + j * 0.9, () => { if (objs[k].held) drop(k, slotX(j)); }]);
          ui.buttons([...ALL.map((k, j) => ({ label: DEFS[k].short, onClick: () => { st.auto = false; drop(k, slotX(j)); } })),
            { label: 'Empty the tank', onClick: () => { st.auto = false; ALL.forEach((k, j) => place(k, slotX(j))); } }]);
          ui.readout('Guess first, then tap an object to drop it in.');
        }
      }
    },

    update(dt) {
      st.time += dt;
      // Scripted demo moves (so the step plays by itself until a child takes over).
      while (st.plan.length && st.time >= st.plan[0][0]) {
        const [, fn] = st.plan.shift();
        if (st.step !== 5 || st.auto) fn();
      }
      if (st.step === 2 && st.auto && !st.quiz) {
        const kinds = ['wood', 'rock', 'apple', 'key', 'ball'], n = Math.floor(st.time / 3.2) % kinds.length;
        if (n !== st.cycle) { st.cycle = n; weigh(kinds[n]); }
      }
      if (st.step === 3 && !st.quiz) pushDemo(dt);

      // Physics in small sub-steps so fast bobbing stays stable.
      const n = Math.ceil(dt / (1 / 120)), h = dt / n;
      for (const o of Object.values(objs)) {
        if (!o.active) continue;
        if (o.held) { sync(o); if (st.step !== 3) o.g.position.y += Math.sin(st.time * 2.5 + o.x * 2) * 0.04; continue; }
        o.t += dt;
        for (let s = 0; s < n; s++) physics(o, h);
        // A little tilt while moving, and rocks tumble as they sink.
        o.g.rotation.z = kit.clamp(o.v * 0.12, -0.3, 0.3) * (o.def.rho < 1 ? 1 : 0.4);
        if (o.kind === 'rock' && o.y > FLOOR + o.def.hh + 0.01) o.g.rotation.x += o.v * dt * 0.8;
        if (o.t > 1.4 && !o.done && o.y < WY + o.def.hh) { o.done = true; o.tag.text = result(o); o.tag.show(!st.quiz); }
        sync(o);
      }

      // Balance beam tilts toward the heavier side; pans hang straight down.
      if (balance.visible) {
        kit.follow(st, 'tilt', st.tiltTo, dt, 3);
        beam.rotation.z = st.tilt;
        for (const p of pans) p.position.set(p.side * ARM * Math.cos(st.tilt), 1.6 + p.side * ARM * Math.sin(st.tilt), 0);
      }
      for (const r of rings) {
        if (!r.visible) continue;
        r.life -= dt * 0.9;
        if (r.life <= 0) { r.visible = false; continue; }
        const s = r.size * (1.15 - r.life);
        r.scale.set(s, s, s);
        r.material.opacity = r.life * 0.8;
      }
      return true;
    },
  };

  // Step 4: the rod holds the ball at a chosen depth; arrows show weight and the water's push.
  function pushDemo(dt) {
    const b = objs.ball;
    if (st.auto) {
      // Push down over 2 s, hold, let go at 4 s, float again, repeat every 8 s.
      const c = st.time % 8, cyc = Math.floor(st.time / 8);
      if (cyc !== st.cycle) { st.cycle = cyc; b.held = true; }
      st.push = kit.clamp((c - 0.6) / 2, 0, 1) * (c < 4 ? 1 : 0);
      if (c >= 4 && b.held && c < 7.5) b.held = false;
      if (c >= 7.5) { b.held = true; st.push = 0; }
      if (st.slider) { st.slider.value = st.push; st.slider.previousElementSibling.textContent = `${Math.round(st.push * 100)}%`; }
    }
    const deep = WY - b.def.hh - 0.35;
    if (b.held) kit.follow(b, 'y', kit.lerp(b.eq, deep, st.push), dt, 5);
    const d = kit.clamp(WY - (b.y - b.def.hh), 0, 2 * b.def.hh), f = frac('ball', d, b.def.hh);
    const L = 1.5;
    upArrow.set(b.x - 0.6, b.y - 0.25, Math.max(0.05, f * L), 1);
    downArrow.set(b.x + 0.6, b.y + 0.25, b.def.rho * L, -1);
    upTag.at.position.y = f * L + 0.3;
    downTag.at.position.y = b.def.rho * L + 0.35;
    rod.visible = b.held;
    rod.position.set(b.x, b.y + b.def.hh + 0.8, b.z);
    const push = f / b.def.rho;
    const msg = push > 1.5 ? `Water pushes up <b>${Math.round(push)} times</b> as hard as the ball's weight.` : 'The push from the water <b>equals</b> the ball\'s weight, so it floats.';
    if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
  }
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Simple painted textures (made in code, so there is nothing to download).
function paint(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeBuilders(THREE, kit) {
  const woodTex = paint(THREE, 128, 64, (g, w, h) => {
    g.fillStyle = '#c98f55'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a8703d'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const y = 4 + i * 7 + rand(i) * 3;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 2);
      g.stroke();
    }
  });
  const ballTex = paint(THREE, 256, 64, (g, w, h) => {
    const cols = ['#ff5d8f', '#ffffff', '#3a86ff', '#ffffff', '#ffbe0b', '#ffffff'];
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect((i * w) / 6, 0, w / 6 + 1, h); });
  });
  const wood = kit.mat(0xffffff, { map: woodTex });
  const metal = (c) => kit.mat(c, { metalness: 0.85, roughness: 0.3 });
  const clay = kit.mat(0xe07a5f, { roughness: 0.95 });
  const group = (...meshes) => { const g = new THREE.Group(); meshes.forEach(m => g.add(m)); return g; };
  const m = (geo, mat, pos) => kit.mesh(geo, mat, pos);

  return {
    wood: () => group(m(new THREE.BoxGeometry(0.55, 0.4, 0.5), wood)),
    log: () => {
      const l = m(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 20), wood);
      l.rotation.x = Math.PI / 2;
      const ends = kit.mat(0xe2b47c);
      const a = m(new THREE.CircleGeometry(0.29, 20), ends, [0, 0, 0.801]);
      const b = m(new THREE.CircleGeometry(0.29, 20), ends, [0, 0, -0.801]);
      b.rotation.y = Math.PI;
      return group(l, a, b);
    },
    apple: () => group(
      m(new THREE.SphereGeometry(0.26, 24, 16), kit.mat(0xd62828, { roughness: 0.45 })),
      m(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 6), kit.mat(0x6b4226), [0, 0.29, 0])),
    ball: () => group(m(new THREE.SphereGeometry(0.3, 24, 16), kit.mat(0xffffff, { map: ballTex, roughness: 0.4 }))),
    coin: () => group(m(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 24), metal(0xd9b44a))),
    rock: () => {
      const geo = new THREE.DodecahedronGeometry(0.25, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        // Same bump for vertices at the same spot, so the faces stay joined.
        const key = Math.round(p.getX(i) * 50) * 7 + Math.round(p.getY(i) * 50) * 13 + Math.round(p.getZ(i) * 50) * 29;
        const s = 0.85 + rand(key) * 0.25;
        p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.85, p.getZ(i) * s);
      }
      geo.computeVertexNormals();
      return group(m(geo, kit.mat(0x7d7f86, { flatShading: true, roughness: 1 })));
    },
    key: () => {
      const k = metal(0xc9a227);
      const ring = m(new THREE.TorusGeometry(0.11, 0.035, 8, 20), k, [-0.2, 0, 0]);
      ring.rotation.x = Math.PI / 2;
      return group(ring,
        m(new THREE.BoxGeometry(0.4, 0.05, 0.06), k, [0.08, 0, 0]),
        m(new THREE.BoxGeometry(0.05, 0.05, 0.08), k, [0.18, 0, 0.06]),
        m(new THREE.BoxGeometry(0.05, 0.05, 0.06), k, [0.26, 0, 0.05]));
    },
    clay: () => group(m(new THREE.SphereGeometry(CLAY_R, 24, 16), clay)),
    boat: () => {
      const { w, l, h } = BOAT, t = boatWall, y0 = -h / 2;
      return group(
        m(new THREE.BoxGeometry(w, t, l), clay, [0, y0 + t / 2, 0]),
        m(new THREE.BoxGeometry(t, h, l), clay, [-(w - t) / 2, 0, 0]),
        m(new THREE.BoxGeometry(t, h, l), clay, [(w - t) / 2, 0, 0]),
        m(new THREE.BoxGeometry(w - 2 * t, h, t), clay, [0, 0, -(l - t) / 2]),
        m(new THREE.BoxGeometry(w - 2 * t, h, t), clay, [0, 0, (l - t) / 2]));
    },
  };
}
