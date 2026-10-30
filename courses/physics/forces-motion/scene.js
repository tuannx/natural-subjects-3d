// Forces and motion: a crate with weight and support arrows; a cart on a smooth track with pushes, net force,
// steady coasting and F = m × a; a crate sliding on ice, wood and carpet (friction); a cart with a sail
// (air resistance and top speed); two skateboarders pushing apart (Newton's third law); a model rocket.
// World units are metres on the track; the rocket's climb is drawn at 0.12 scale.
import { makeArrow, paint, rand, fmt } from '../_shared/lab.js';

const G = 9.8;
const START = -3.6, END = 3.8;           // cart centre limits on the track
const S = 0.12;                           // arrow length per newton on the track
const SURF = [
  { name: 'Ice', mu: 0.05, color: 0xd7f1ff, rough: 0.08 },
  { name: 'Wood', mu: 0.3, color: 0xc28a52, rough: 0.6 },
  { name: 'Carpet', mu: 0.5, color: 0xb23a48, rough: 1 },
];
const SKATE_X = 20, ROCKET_X = -18;
const PUSH_N = 60, PUSH_T = 1.0;          // skaters push each other with 60 N for 1 s
const ROCKET_M = 0.5, ROCKET_SCALE = 0.12;
const C_SAIL = 0.6, C_BARE = 0.03, SAIL_PUSH = 6;

export default function setup({ THREE, scene, kit, ui, label, view, freeRect }) {
  const ground = kit.stage(scene, { ground: 0xd8e9c9, sky: 0xe4f1ff, radius: 34 });
  Object.assign(ground.material, { polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 });
  const sun = kit.lights(scene, { sun: [4, 12, 8] });
  scene.add(sun.target);

  // ---------- Track ----------
  const trackTex = paint(THREE, 512, 32, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#00000040';
    for (let i = 0; i <= 9; i++) g.fillRect(Math.round((i / 9) * (w - 3)), 0, 3, h);
  });
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x9fb3c4, roughness: 0.35 });
  const track = kit.mesh(new THREE.BoxGeometry(9, 0.08, 1.1), trackMat, [0, 0.04, 0], scene);
  const marks = kit.mesh(new THREE.PlaneGeometry(9, 0.12), new THREE.MeshBasicMaterial({ map: trackTex, transparent: true, opacity: 0.7 }), [0, 0.081, 0.48], scene);
  marks.rotation.x = -Math.PI / 2; marks.castShadow = false;
  for (const x of [-4.55, 4.55]) kit.mesh(new THREE.BoxGeometry(0.1, 0.3, 1.1), kit.mat(0x52606d), [x, 0.15, 0], scene);
  const TOPY = 0.08;

  // Cart: body, four wheels, optional sail.
  const cart = new THREE.Group();
  scene.add(cart);
  kit.mesh(new THREE.BoxGeometry(1, 0.3, 0.6), kit.mat(0x1d6fd8), [0, 0.32, 0], cart);
  const wheelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16);
  const wheels = [];
  for (const [x, z] of [[-0.32, 0.3], [0.32, 0.3], [-0.32, -0.3], [0.32, -0.3]]) {
    const w = kit.mesh(wheelGeo, kit.mat(0x2b2d42), [x, 0.12, z], cart);
    w.rotation.x = Math.PI / 2;
    wheels.push(w);
  }
  const sail = new THREE.Group();
  cart.add(sail);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), kit.mat(0x6b4226), [0, 1.1, 0], sail);
  const sheet = kit.mesh(new THREE.BoxGeometry(0.03, 0.9, 1.0), kit.mat(0xfff3c4, { side: THREE.DoubleSide }), [0.05, 1.15, 0], sail);
  sheet.castShadow = true;

  // Crate (step 0 and friction).
  const crateTex = paint(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = '#c98f55'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#a8703d';
    for (let i = 0; i < 4; i++) g.fillRect(0, i * 32 + 29, w, 4);
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  });
  const crate = kit.mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), kit.mat(0xffffff, { map: crateTex }), [0, TOPY + 0.4, 0], scene);

  // Dots dropped every 0.5 s along the track.
  const dotGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12), dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dots = [];
  for (let i = 0; i < 30; i++) { const d = new THREE.Mesh(dotGeo, dotMat); d.position.set(0, TOPY + 0.01, -0.42); d.visible = false; scene.add(d); dots.push(d); }

  // Arrows with labels that show their size.
  const mk = (color, cls) => { const a = makeArrow(THREE, color, { radius: 0.05, head: 0.24 }); scene.add(a); a.tag = label('', a.tip, { cls }); a.tag.show(false); a.txt = ''; return a; };
  const aPush = mk(0xf77f00, 'warm'), aPush2 = mk(0xf77f00, 'warm'), aFric = mk(0xe63946, 'warm'), aNet = mk(0x7b2cbf, ''), aUp = mk(0x1d6fd8, 'cool'), aDown = mk(0xe63946, 'warm');
  const arrows = [aPush, aPush2, aFric, aNet, aUp, aDown];
  // Horizontal arrow helper: tail x, height y, direction ±1, force (N), label text.
  function hArrow(a, x, y, dir, F, text, z = 0, below = false) {
    a.point(x, y, z, dir, 0, 0, Math.abs(F) * S, below ? -0.4 : 0.28);
    setTag(a, a.visible ? text : '');
  }
  function setTag(a, text) {
    if (text !== a.txt) { a.txt = text; a.tag.text = text; }
    const on = !!text && a.visible;
    if (a.tag.visible !== on) a.tag.show(on);
  }

  // ---------- Skaters ----------
  const rink = kit.mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshStandardMaterial({ color: 0xbfc8d2, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), [SKATE_X, 0.01, 0], scene);
  rink.rotation.x = -Math.PI / 2; rink.castShadow = false;
  const skaterA = makeSkater(THREE, kit, 0x2a9d8f, 1), skaterB = makeSkater(THREE, kit, 0xe76f51, -1);
  scene.add(skaterA, skaterB);
  skaterA.position.set(SKATE_X - 0.42, 0, 0); skaterB.position.set(SKATE_X + 0.42, 0, 0);
  const tagA = label('Skater A', new THREE.Object3D()), tagB = label('Skater B', new THREE.Object3D());
  skaterA.add(tagA.at); skaterB.add(tagB.at);
  tagA.at.position.y = 2.05; tagB.at.position.y = 2.05;
  const aOnA = mk(0x7b2cbf, ''), aOnB = mk(0x7b2cbf, '');
  arrows.push(aOnA, aOnB);

  // ---------- Rocket ----------
  const pad = kit.mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.2, 24), kit.mat(0x6c757d), [ROCKET_X, 0.1, 0], scene);
  pad.receiveShadow = true;
  const rocket = new THREE.Group();
  rocket.position.set(ROCKET_X, 0.2, 0);
  scene.add(rocket);
  const white = kit.mat(0xf8f9fa), red = kit.mat(0xd62828);
  kit.mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.3, 20), white, [0, 0.85, 0], rocket);
  kit.mesh(new THREE.ConeGeometry(0.22, 0.5, 20), red, [0, 1.75, 0], rocket);
  kit.mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.2, 16), kit.mat(0x495057), [0, 0.1, 0], rocket);
  for (let i = 0; i < 3; i++) {
    const f = kit.mesh(new THREE.BoxGeometry(0.03, 0.45, 0.32), red, [0, 0.42, 0], rocket);
    const a = (i / 3) * Math.PI * 2;
    f.position.set(Math.sin(a) * 0.32, 0.42, Math.cos(a) * 0.32);
    f.rotation.y = a;
  }
  kit.mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.12, 20), kit.mat(0x1d6fd8), [0, 1.2, 0], rocket);
  // Exhaust: a small pool of glowing balls (fixed count, moved each frame).
  const NP = 60;
  const puffs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa62b, transparent: true, opacity: 0.7, depthWrite: false }), NP);
  puffs.frustumCulled = false;
  puffs.castShadow = false;
  scene.add(puffs);
  const pState = Array.from({ length: NP }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }));
  const pm = new THREE.Matrix4(), pq = new THREE.Quaternion(), pp = new THREE.Vector3(), ps = new THREE.Vector3();
  const aThrust = mk(0x1d6fd8, 'cool'), aGas = mk(0xf77f00, 'warm'), aW = mk(0xe63946, 'warm');
  arrows.push(aThrust, aGas, aW);

  // ---------- State ----------
  const st = {
    step: 0, quiz: false, time: 0, plan: [],
    x: START, v: 0, mass: 2, push: 10, pushL: 8, pushR: 12, kick: 0, surf: 1, sailUp: true, crateMass: 5,
    dotT: 0, dotN: 0, showDots: false, msg: '',
    mA: 40, mB: 60, sk: { phase: 'ready', t: 0, xA: 0, xB: 0, vA: 0, vB: 0 },
    thrust: 10, engine: false, ry: 0, rv: 0, rt: 0, spawn: 0, seq: 0,
    sliders: {},
  };

  function clearDots() { st.dotN = 0; st.dotT = 0; dots.forEach(d => { d.visible = false; }); }
  function restart(keepSpeed = false) { st.x = START; if (!keepSpeed) st.v = 0; clearDots(); }

  function setSurface(i) {
    st.surf = i;
    const s = SURF[i];
    trackMat.color.setHex(s.color); trackMat.roughness = s.rough;
    restart();
  }

  // Net force on the track object for the current step (friction worked out when it is at rest).
  function trackForces() {
    const f = { net: 0, push: 0, fric: 0, drag: 0 };
    if (st.step === 1) f.net = st.pushR - st.pushL;
    if (st.step === 2) f.net = f.push = st.kick > 0 ? 10 : 0;
    if (st.step === 3) f.net = f.push = st.push;
    if (st.step === 4) {
      const max = SURF[st.surf].mu * st.mass * G;
      f.push = st.push;
      if (Math.abs(st.v) < 1e-6) f.fric = Math.min(st.push, max);
      else f.fric = max;
      f.net = f.push - f.fric;
    }
    if (st.step === 5) {
      f.push = SAIL_PUSH;
      f.drag = (st.sailUp ? C_SAIL : C_BARE) * st.v * st.v;
      f.net = f.push - f.drag;
    }
    return f;
  }

  function hideAll() {
    for (const a of arrows) { a.visible = false; setTag(a, ''); }
    cart.visible = crate.visible = sail.visible = false;
    tagA.show(false); tagB.show(false);
    clearDots();
    puffs.visible = false;
    trackMat.color.setHex(0x9fb3c4); trackMat.roughness = 0.35;
  }

  function readout() {
    const f = trackForces(), m = st.step === 4 ? st.mass : st.mass;
    let html = '';
    if (st.step === 0) {
      const W = st.crateMass * G;
      html = `Mass <b>${st.crateMass} kg</b> · Weight = ${st.crateMass} × 9.8 = <b>${fmt(W, 0)} N</b> down · Support <b>${fmt(W, 0)} N</b> up<br>Net force: <b>0 N</b> (balanced)`;
    } else if (st.step === 1) {
      const n = f.net;
      html = `Net force = ${st.pushR} N − ${st.pushL} N = <b>${Math.abs(n)} N ${n > 0 ? 'to the right' : n < 0 ? 'to the left' : ''}</b>${n === 0 ? ' · <b>balanced</b>' : ''}<br>Speed: <b>${fmt(Math.abs(st.v), 1)} m/s</b>`;
    } else if (st.step === 2) {
      html = `Net force: <b>${f.net} N</b> · Speed: <b>${fmt(st.v, 2)} m/s</b>${f.net === 0 && st.v > 0.01 ? ' (steady)' : ''}`;
    } else if (st.step === 3) {
      html = `a = F ÷ m = ${st.push} N ÷ ${st.mass} kg = <b>${fmt(st.push / st.mass, 2)} m/s²</b><br>Speed: <b>${fmt(st.v, 1)} m/s</b>`;
    } else if (st.step === 4) {
      const max = SURF[st.surf].mu * m * G, moving = f.net > 0 || st.v > 1e-6;
      html = `${SURF[st.surf].name}: friction up to <b>${fmt(max, 1)} N</b><br>Push ${st.push} N − friction ${fmt(f.fric, 1)} N = net <b>${fmt(Math.max(0, f.net), 1)} N</b>${moving ? ` → a = <b>${fmt(Math.max(0, f.net) / m, 2)} m/s²</b>` : ' → <b>no movement</b>'}`;
    } else if (st.step === 5) {
      html = `Push <b>${SAIL_PUSH} N</b> · Air resistance <b>${fmt(f.drag, 1)} N</b> · Net <b>${fmt(f.net, 1)} N</b><br>Speed: <b>${fmt(st.v, 1)} m/s</b>`;
    } else if (st.step === 6) {
      const vA = (PUSH_N * PUSH_T) / st.mA, vB = (PUSH_N * PUSH_T) / st.mB;
      html = `Push on A: <b>${PUSH_N} N</b> left · Push on B: <b>${PUSH_N} N</b> right<br>Speed after the push: A <b>${fmt(vA, 2)} m/s</b>, B <b>${fmt(vB, 2)} m/s</b>`;
    } else if (st.step === 7) {
      const W = ROCKET_M * G, net = st.thrust - W;
      html = `Thrust <b>${st.thrust} N</b> − weight <b>4.9 N</b> = net <b>${fmt(net, 1)} N</b><br>${net > 0 ? `a = ${fmt(net, 1)} N ÷ 0.5 kg = <b>${fmt(net / ROCKET_M, 1)} m/s²</b> up` : '<b>Not enough thrust</b> to lift off'}`;
    }
    if (html !== st.msg) { st.msg = html; ui.readout(html); }
  }

  const slider = (key, opts) => { st.sliders[key] = ui.slider(opts); };

  // Skaters: stand together, push for PUSH_T seconds, then roll apart.
  function skReset() { Object.assign(st.sk, { phase: 'ready', t: 0, xA: -0.42, xB: 0.42, vA: 0, vB: 0 }); }
  function skPush() { skReset(); st.sk.phase = 'push'; }

  function rocketReset() { st.engine = false; st.ry = 0; st.rv = 0; st.rt = 0; }
  function launch() { rocketReset(); st.engine = true; }

  // On a tall, narrow free area (phones) the long track is seen at an angle so it still fits.
  const portrait = () => { const f = freeRect(); return f.r - f.l < 560; };
  const trackView = { radius: 2.0, width: 4.9, yaw: 0, pitch: 0.3, target: [0, 0.7, 0] };
  const trackTall = { radius: 3.3, yaw: 0.72, pitch: 0.36, target: [0.2, 0.5, 0] };
  const frame = (wide, tall) => view(portrait() && tall ? tall : wide);

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? 8 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.sliders = {}; st.msg = '';
      hideAll();
      st.mass = 2; st.kick = 0;
      restart();
      if (i === 0) {
        view({ radius: 1.9, yaw: 0.4, pitch: 0.2, target: [0, 1.1, 0] });
        crate.visible = true; crate.position.set(0, TOPY + 0.4, 0);
        st.crateMass = 3;
        slider('crate', { label: 'Crate mass', min: 1, max: 10, step: 1, value: st.crateMass, unit: ' kg', onInput: v => { st.plan = []; st.crateMass = v; } });
        st.plan = [[1.0, () => { st.crateMass = 6; st.sliders.crate.set(6); }], [2.0, () => { st.crateMass = 9; st.sliders.crate.set(9); }]];
      }
      if (i === 1) {
        frame(trackView, trackTall);
        cart.visible = true; st.x = -0.5;
        st.pushL = 10; st.pushR = 10;
        slider('L', { label: 'Push from the left', min: 0, max: 20, step: 1, value: st.pushL, unit: ' N', onInput: v => { st.plan = []; st.pushL = v; } });
        slider('R', { label: 'Push from the right', min: 0, max: 20, step: 1, value: st.pushR, unit: ' N', onInput: v => { st.plan = []; st.pushR = v; } });
        ui.buttons([{ label: 'Back to the start', onClick: () => { st.x = -0.5; st.v = 0; } }]);
        st.plan = [[1.0, () => { st.pushL = 6; st.sliders.L.set(6); }], [5.5, () => { st.pushL = 10; st.sliders.L.set(10); st.x = -0.5; st.v = 0; }]];
      }
      if (i === 2) {
        frame(trackView, trackTall);
        cart.visible = true; st.showDots = true;
        ui.buttons([
          { label: 'Give it a push', onClick: () => { st.plan = []; st.kick = 0.25; } },
          { label: 'Stop it', onClick: () => { st.plan = []; st.v = 0; clearDots(); } },
        ]);
        st.plan = [[0.4, () => { st.kick = 0.25; }]];
      }
      if (i === 3) {
        frame(trackView, trackTall);
        cart.visible = true; st.showDots = true; st.push = 10;
        slider('push', { label: 'Push force', min: 0, max: 20, step: 1, value: st.push, unit: ' N', onInput: v => { st.plan = []; st.push = v; } });
        slider('mass', { label: 'Mass', min: 1, max: 5, step: 0.5, value: st.mass, unit: ' kg', onInput: v => { st.plan = []; st.mass = v; } });
        ui.buttons([{ label: 'Back to the start', onClick: () => restart() }]);
        st.plan = [[4.5, () => { st.mass = 4; st.sliders.mass.set(4); restart(); }]];
      }
      if (i === 4) {
        frame(trackView, trackTall);
        crate.visible = true; st.push = 6;
        const row = ui.buttons(SURF.map((s, j) => ({ label: s.name, on: j === 2, onClick: () => { st.plan = []; setSurface(j); } })));
        slider('push', { label: 'Push force', min: 0, max: 20, step: 1, value: st.push, unit: ' N', onInput: v => { st.plan = []; st.push = v; } });
        setSurface(2);
        st.plan = [[1.6, () => { setSurface(0); row.select(0); }], [6, () => { setSurface(1); row.select(1); st.push = 8; st.sliders.push.set(8); }]];
      }
      if (i === 5) {
        frame({ ...trackView, yaw: 0.4, pitch: 0.28 }, trackTall);
        cart.visible = true; sail.visible = true; st.sailUp = true;
        const tg = ui.toggle({ label: 'Sail up', value: true, onChange: v => { st.plan = []; st.sailUp = v; sail.visible = v; restart(); } });
        st.plan = [[9, () => { st.sailUp = false; sail.visible = false; tg.checked = false; restart(); }]];
      }
      if (i === 6) {
        view({ radius: 2.4, width: 3.6, yaw: 0.25, pitch: 0.22, target: [SKATE_X, 1.0, 0] });
        tagA.show(true); tagB.show(true);
        st.mA = 40; st.mB = 60;
        slider('A', { label: 'Mass of Skater A', min: 30, max: 90, step: 5, value: st.mA, unit: ' kg', onInput: v => { st.plan = []; st.mA = v; skReset(); } });
        slider('B', { label: 'Mass of Skater B', min: 30, max: 90, step: 5, value: st.mB, unit: ' kg', onInput: v => { st.plan = []; st.mB = v; skReset(); } });
        ui.buttons([{ label: 'Push off', onClick: () => { st.plan = []; skPush(); } }, { label: 'Stand together', onClick: () => { st.plan = []; skReset(); } }]);
        skReset();
        st.plan = [[2.2, skPush]];
      }
      if (i === 7) {
        view({ radius: 3.2, yaw: 0.35, pitch: 0.16, target: [ROCKET_X, 2.9, 0] });
        st.thrust = 10;
        slider('thrust', { label: 'Thrust', min: 0, max: 15, step: 1, value: st.thrust, unit: ' N', onInput: v => { st.plan = []; st.thrust = v; } });
        ui.buttons([{ label: 'Launch', onClick: () => { st.plan = []; launch(); } }, { label: 'Back on the pad', onClick: () => { st.plan = []; rocketReset(); } }]);
        rocketReset();
        st.plan = [[0.6, launch]];
      }
      if (isQuiz) {
        frame({ radius: 2.2, width: 5.1, yaw: -0.25, pitch: 0.3, target: [0, 0.7, 0] }, { ...trackTall, yaw: -0.72 });
        cart.visible = true; st.x = 0.6;
      }
      if (i !== 6) skReset();
      if (i !== 7) rocketReset();
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      let busy = st.plan.length > 0;
      const s = st.step;

      // ---- Track (steps 1–5) ----
      if (s >= 1 && s <= 5) {
        const n = Math.ceil(dt / (1 / 120)), h = dt / Math.max(1, n);
        for (let k = 0; k < n; k++) {
          const f = trackForces();
          const vOld = st.v;
          st.v += (f.net / st.mass) * h;
          if (s === 4 && vOld > 0 && st.v < 0) st.v = 0;    // friction stops it; it never pushes it backward
          st.x += st.v * h;
          if (st.kick > 0) st.kick = Math.max(0, st.kick - h);
        }
        if (Math.abs(st.v) > 1e-6 || st.kick > 0 || Math.abs(trackForces().net) > 1e-6) busy = true;
        const keep = s === 2 || s === 5;
        if (st.x > END) { st.x = START; if (!keep) st.v = 0; clearDots(); }
        if (st.x < START - 0.6) { st.x = START - 0.6; st.v = 0; }
        if (st.showDots && (s === 2 || s === 3) && Math.abs(st.v) > 0.01) {
          st.dotT += dt;
          if (st.dotT >= 0.5 && st.dotN < dots.length) { st.dotT -= 0.5; const d = dots[st.dotN++]; d.position.x = st.x; d.visible = true; }
        }
        const obj = s === 4 ? crate : cart;
        obj.position.x = st.x;
        for (const w of wheels) w.rotation.y -= (st.v * dt) / 0.12;
        const f = trackForces();
        if (s === 1) {
          hArrow(aPush, st.x - 0.55 - st.pushL * S, 0.32, 1, st.pushL, `${st.pushL} N`);
          hArrow(aPush2, st.x + 0.55 + st.pushR * S, 0.32, -1, st.pushR, `${st.pushR} N`);
          hArrow(aNet, st.x, 0.95, Math.sign(f.net), f.net, `Net ${Math.abs(f.net)} N`);
        }
        if (s === 2) {
          hArrow(aPush, st.x - 0.55 - f.push * S, 0.32, 1, f.push, 'Push');
        }
        if (s === 3) {
          hArrow(aPush, st.x - 0.55 - st.push * S, 0.32, 1, st.push, `Push ${st.push} N`);
        }
        if (s === 4) {
          hArrow(aPush, st.x - 0.45 - st.push * S, 0.48, 1, st.push, `Push ${st.push} N`);
          hArrow(aFric, st.x, 0.13, -1, f.fric, `Friction ${fmt(f.fric, 1)} N`, 0.45, true);
          hArrow(aNet, st.x, 1.35, 1, Math.max(0, f.net), `Net ${fmt(Math.max(0, f.net), 1)} N`);
        }
        if (s === 5) {
          hArrow(aPush, st.x - 0.55 - SAIL_PUSH * S, 0.32, 1, SAIL_PUSH, 'Push 6 N');
          hArrow(aFric, st.x - 0.05, st.sailUp ? 1.15 : 0.75, -1, f.drag, 'Air resistance', st.sailUp ? 0.6 : 0);
        }
      }

      // ---- Crate weight and support (step 0) ----
      if (s === 0) {
        const W = st.crateMass * G, L = W * 0.015;
        aDown.point(0.55, TOPY + 0.4, 0.45, 0, -1, 0, L, 0.2);
        aUp.point(-0.55, TOPY + 0.4, 0.45, 0, 1, 0, L, -0.2);
        setTag(aDown, `Weight ${fmt(W, 0)} N`);
        setTag(aUp, `Support ${fmt(W, 0)} N`);
      }

      // ---- Skaters ----
      if (s === 6 || st.quiz) {
        const k = st.sk;
        if (k.phase === 'push') {
          k.t += dt;
          k.vA -= (PUSH_N / st.mA) * dt; k.vB += (PUSH_N / st.mB) * dt;
          if (k.t >= PUSH_T) { k.phase = 'roll'; k.vA = -(PUSH_N * PUSH_T) / st.mA; k.vB = (PUSH_N * PUSH_T) / st.mB; }
        }
        if (k.phase !== 'ready') {
          k.xA += k.vA * dt; k.xB += k.vB * dt;
          if (k.xA < -4.5) { k.xA = -4.5; k.vA = 0; }
          if (k.xB > 4.5) { k.xB = 4.5; k.vB = 0; }
        }
        skaterA.position.set(SKATE_X + k.xA, 0, 0); skaterB.position.set(SKATE_X + k.xB, 0, 0);
        const pushing = k.phase === 'push' || k.phase === 'ready';
        skaterA.arms(pushing ? 1 : 0.2); skaterB.arms(pushing ? 1 : 0.2);
        for (const w of skaterA.wheels) w.rotation.y += (k.vA * dt) / 0.06;
        for (const w of skaterB.wheels) w.rotation.y -= (k.vB * dt) / 0.06;
        const showF = k.phase === 'push' && s === 6;
        const len = PUSH_N * 0.02;
        if (showF) {
          aOnA.point(SKATE_X + k.xA - 0.15, 1.15, 0.35, -1, 0, 0, len, 0.28);
          aOnB.point(SKATE_X + k.xB + 0.15, 1.15, 0.35, 1, 0, 0, len, 0.28);
        } else { aOnA.visible = aOnB.visible = false; }
        setTag(aOnA, showF ? `${PUSH_N} N on A` : '');
        setTag(aOnB, showF ? `${PUSH_N} N on B` : '');
        if (s === 6 && k.phase !== 'ready' && (k.vA || k.vB)) busy = true;
      }

      // ---- Rocket ----
      if (s === 7) {
        const W = ROCKET_M * G;
        if (st.engine) {
          st.rt += dt;
          const net = st.thrust - W;
          if (net > 0 || st.ry > 0) { st.rv += (net / ROCKET_M) * dt; st.ry = Math.max(0, st.ry + st.rv * dt); if (st.ry === 0) st.rv = 0; }
          if (st.ry * ROCKET_SCALE > 6.5 || st.rt > 6) rocketReset();
        }
        const y = 0.2 + st.ry * ROCKET_SCALE;
        rocket.position.set(ROCKET_X, y, 0);
        // Exhaust puffs: spawn at a fixed rate while the engine burns.
        puffs.visible = true;
        if (st.engine && st.thrust > 0) {
          st.spawn += dt * (20 + st.thrust * 6);
          while (st.spawn >= 1) {
            st.spawn -= 1;
            const p = pState[st.seq % NP], r1 = rand(st.seq), r2 = rand(st.seq + 999);
            st.seq++;
            Object.assign(p, { life: 1, x: ROCKET_X + (r1 - 0.5) * 0.12, y: y - 0.05, z: (r2 - 0.5) * 0.12, vx: (r1 - 0.5) * 1.2, vy: -3 - st.thrust * 0.25, vz: (r2 - 0.5) * 1.2 });
          }
        }
        for (let j = 0; j < NP; j++) {
          const p = pState[j];
          if (p.life > 0) {
            p.life -= dt * 1.6;
            p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
            if (p.y < 0.25) { p.y = 0.25; p.vy = 0; p.vx *= 1.04; p.vz *= 1.04; p.vx += (p.x - ROCKET_X) * dt * 4; }
          }
          const sc = p.life > 0 ? 0.45 + (1 - p.life) * 0.9 : 0;
          pp.set(p.x, p.y, p.z); ps.set(sc, sc, sc);
          puffs.setMatrixAt(j, pm.compose(pp, pq, ps));
        }
        puffs.instanceMatrix.needsUpdate = true;
        if (st.engine || pState.some(p => p.life > 0)) busy = true;
        const T = st.engine ? st.thrust : 0;
        aThrust.point(ROCKET_X - 0.42, y + 0.15, 0.3, 0, 1, 0, T * 0.12, -0.55);
        aGas.point(ROCKET_X + 0.3, y - 0.05, 0.3, 0, -1, 0, T * 0.12, 0.55);
        aW.point(ROCKET_X + 0.5, y + 1.1, 0.3, 0, -1, 0, W * 0.12, 0.55);
        setTag(aThrust, T ? `Thrust ${T} N` : '');
        setTag(aGas, T ? `Push on gas ${T} N` : '');
        setTag(aW, 'Weight 4.9 N');
      }

      if (st.quiz) cart.position.x = st.x;
      readout();
      return busy;
    },
  };
}

// A simple person on a skateboard. side 1 faces +x, -1 faces -x. group.arms(k) reaches forward (k = 1) or relaxes.
function makeSkater(THREE, kit, color, side) {
  const g = new THREE.Group();
  const skin = kit.mat(0xe0ac69), shirt = kit.mat(color), dark = kit.mat(0x2b2d42);
  kit.mesh(new THREE.BoxGeometry(0.9, 0.05, 0.3), kit.mat(0x8d6e63), [0, 0.12, 0], g);
  g.wheels = [];
  for (const [x, z] of [[-0.3, 0.12], [0.3, 0.12], [-0.3, -0.12], [0.3, -0.12]]) {
    const w = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), dark, [x, 0.05, z], g);
    w.rotation.x = Math.PI / 2;
    g.wheels.push(w);
  }
  for (const z of [-0.1, 0.1]) kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8), kit.mat(0x264653), [0, 0.52, z], g);
  kit.mesh(new THREE.CapsuleGeometry(0.2, 0.45, 4, 12), shirt, [0, 1.15, 0], g);
  kit.mesh(new THREE.SphereGeometry(0.16, 16, 12), skin, [0, 1.62, 0], g);
  const arms = [];
  for (const z of [-0.24, 0.24]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 1.35, z);
    g.add(pivot);
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), shirt, [0, -0.25, 0], pivot);
    arms.push(pivot);
  }
  g.arms = k => { for (const p of arms) p.rotation.z = side * (0.15 + k * 1.35); };
  g.arms(1);
  return g;
}
