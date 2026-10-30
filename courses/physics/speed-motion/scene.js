// Speed: a 100 m straight with a mark every 10 m. A runner and a cyclist race while a stopwatch runs and a
// distance–time graph draws itself; a car shows average speed with a red light, km/h vs m/s, light gates
// with a speed camera, and the thinking distance behind a braking car.
// The road is drawn 14 units long for 100 m (people and cars are drawn larger than scale).
import { panel, drawGraph, paint, fmt } from '../_shared/lab.js';

const U = 0.14;                           // world units per metre along the road
const X0 = -7;                            // x of the 0 m mark
const X = m => X0 + m * U;
const LANE_A = 0.75, LANE_B = -0.75;      // runner lane (front), cyclist / car lane (back)
const COLORS = { runner: '#1d6fd8', cyclist: '#f77f00', car: '#7b2cbf' };
const LIMIT = 50;                         // km/h, step 7
const GATE1 = 40, GATE2 = 60;

export default function setup({ THREE, scene, kit, ui, label, view, freeRect }) {
  const ground = kit.stage(scene, { ground: 0xcfe5bf, sky: 0xe2f0ff, radius: 26 });
  Object.assign(ground.material, { polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 });
  kit.lights(scene, { sun: [3, 12, 8] });

  // ---------- Road, lines and distance marks ----------
  const flat = (w, d, color, x, z, y = 0.031) => {
    const m = kit.mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }), [x, y, z], scene);
    m.rotation.x = -Math.PI / 2; m.castShadow = false;
    return m;
  };
  kit.mesh(new THREE.BoxGeometry(15.2, 0.06, 3.2), kit.mat(0x59626b, { roughness: 0.9 }), [0, 0, 0], scene).castShadow = false;
  flat(15.2, 0.06, 0xffffff, 0, 1.5); flat(15.2, 0.06, 0xffffff, 0, -1.5);
  for (let i = 0; i < 25; i++) flat(0.3, 0.05, 0xffffff, -7.4 + i * 0.62, 0);
  flat(0.1, 3.0, 0xffffff, X(0), 0, 0.032);
  const finish = flat(0.14, 3.0, 0xe63946, X(100), 0, 0.032);
  for (let m = 0; m <= 100; m += 10) {
    const tex = paint(THREE, 128, 64, (g, w, h) => {
      g.fillStyle = m === 0 || m === 100 ? '#ffd166' : '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1d2b36'; g.font = '800 38px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(`${m} m`, w / 2, h / 2 + 2);
    });
    kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), kit.mat(0x52606d), [X(m), 0.25, 1.85], scene);
    kit.mesh(new THREE.PlaneGeometry(0.56, 0.28), new THREE.MeshBasicMaterial({ map: tex }), [X(m), 0.6, 1.86], scene).castShadow = false;
  }

  // ---------- Board (stopwatch / signs) and graph ----------
  const board = panel(THREE, 3.0, 1.2, { px: 512 });
  board.position.set(5.3, 2.75, -2.1);
  scene.add(board);
  const post = kit.mat(0x5c6b77);
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.15, 8), post, [5.3, 1.07, -2.2], scene);
  const graph = panel(THREE, 6.6, 3.7, { px: 512 });
  graph.position.set(-1.1, 4.0, -2.3);
  scene.add(graph);
  const gPost = [-3.4, 1.2].map(x => kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.15, 8), post, [x, 1.07, -2.4], scene));

  // ---------- Movers ----------
  const runner = makeRunner(THREE, kit), cyclist = makeCyclist(THREE, kit), car = makeCar(THREE, kit), car2 = makeCar(THREE, kit, 0x2a9d8f);
  scene.add(runner, cyclist, car, car2);
  const ghost = makeCar(THREE, kit, 0xffffff);
  ghost.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshStandardMaterial({ color: 0xe63946, transparent: true, opacity: 0.3, depthWrite: false }); o.castShadow = false; } });
  scene.add(ghost);
  const tags = {
    runner: label('Runner', new THREE.Object3D(), { cls: 'cool' }),
    cyclist: label('Cyclist', new THREE.Object3D(), { cls: 'warm' }),
  };
  runner.add(tags.runner.at); tags.runner.at.position.y = 1.1;
  cyclist.add(tags.cyclist.at); tags.cyclist.at.position.y = 1.15;

  // Traffic light at 50 m.
  const tl = new THREE.Group();
  tl.position.set(X(50) + 0.2, 0, -1.8);
  scene.add(tl);
  kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), post, [0, 0.65, 0], tl);
  kit.mesh(new THREE.BoxGeometry(0.22, 0.56, 0.18), kit.mat(0x2b2d42), [0, 1.45, 0], tl);
  const lampOff = [0x4a1010, 0x4a3b10, 0x0f3a1c], lampOn = [0xff3b30, 0xffc300, 0x2ee66b];
  const lamps = [0, 1, 2].map(i => kit.mesh(new THREE.SphereGeometry(0.065, 12, 8), new THREE.MeshBasicMaterial({ color: lampOff[i] }), [0, 1.62 - i * 0.17, 0.1], tl));
  const setLight = i => lamps.forEach((l, j) => l.material.color.setHex(j === i ? lampOn[j] : lampOff[j]));

  // Light gates at 40 m and 60 m, and a speed camera.
  const gates = [GATE1, GATE2].map(m => {
    const g = new THREE.Group();
    g.position.x = X(m);
    scene.add(g);
    for (const z of [-1.55, 1.55]) kit.mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), kit.mat(0x2b2d42), [0, 0.35, z], g);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.1, 6), new THREE.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: 0.8 }));
    beam.rotation.x = Math.PI / 2; beam.position.y = 0.4;
    g.add(beam); g.beam = beam;
    return g;
  });
  const gateTags = gates.map((g, i) => { const t = label(`Gate ${i + 1}`, new THREE.Vector3(X([GATE1, GATE2][i]), 0.95, 1.55)); return t; });
  const cam = new THREE.Group();
  cam.position.set(X(72), 0, -1.85);
  scene.add(cam);
  kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), post, [0, 0.6, 0], cam);
  kit.mesh(new THREE.BoxGeometry(0.34, 0.22, 0.22), kit.mat(0xffd166), [0, 1.3, 0], cam);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  flash.position.set(0.1, 1.3, 0.2);
  cam.add(flash);

  // Following distance bands (step 8).
  const bandRed = flat(1, 0.5, 0xe63946, 0, LANE_B, 0.035);
  bandRed.material.transparent = true; bandRed.material.opacity = 0.55;
  const bandBlue = flat(1, 0.18, 0x1d6fd8, 0, 0.25, 0.035);
  const redTag = label('Thinking distance', new THREE.Object3D(), { cls: 'warm' });
  bandRed.add(redTag.at); redTag.at.position.set(0, 0, 0.45);
  const blueTag = label('2-second gap', new THREE.Object3D(), { cls: 'cool' });
  bandBlue.add(blueTag.at); blueTag.at.position.set(0.25, 0, 0);

  // ---------- State ----------
  const st = {
    step: 0, quiz: false, time: 0, plan: [], sliders: {},
    clock: 0, running: false, sample: 0, msg: '', boardKey: '', graphKey: '', avg: null,
    r: { x: 0, v: 8, pts: [], done: false, wait: false, on: true },
    c: { x: 0, v: 12, pts: [], done: false, wait: false, on: false },
    k: { x: 0, v: 20, pts: [], done: false, wait: false, on: false, waited: 0 },
    redWait: 2.5, kmh: 72, t1: null, t2: null, flashT: 0, react: 1, play: -1,
  };
  const movers = { r: runner, c: cyclist, k: car };

  function resetRace() {
    st.clock = 0; st.running = false; st.sample = 0;
    for (const m of [st.r, st.c, st.k]) { m.x = 0; m.done = false; m.wait = false; m.pts = [[0, 0]]; m.waited = 0; }
    st.t1 = st.t2 = null; st.flashT = 0; st.graphKey = '';
  }
  const start = () => { resetRace(); st.running = true; };

  function hideAll() {
    runner.visible = cyclist.visible = car.visible = car2.visible = ghost.visible = false;
    tags.runner.show(false); tags.cyclist.show(false);
    graph.visible = false; gPost.forEach(p => { p.visible = false; });
    tl.visible = false; cam.visible = false;
    gates.forEach(g => { g.visible = false; }); gateTags.forEach(t => t.show(false));
    bandRed.visible = bandBlue.visible = false; redTag.show(false); blueTag.show(false);
    flash.material.opacity = 0;
  }

  const slider = (key, opts) => { st.sliders[key] = ui.slider(opts); };
  const speedOf = s => (s === 4 ? (st.k.x < 50 ? 20 : 10) : 0);

  // ---------- Board drawing ----------
  function drawBoard(key, fn) { if (key === st.boardKey) return; st.boardKey = key; board.draw(fn); }
  function stopwatch(t) {
    drawBoard('sw' + t.toFixed(2), (c, W, H) => {
      c.fillStyle = '#14212b'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#9fb3c4'; c.font = '700 30px system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText('STOPWATCH', 26, 36);
      c.fillStyle = '#5cf08a'; c.font = '800 112px ui-monospace, Menlo, monospace'; c.textAlign = 'right';
      c.fillText(t.toFixed(2), W - 110, H / 2 + 22);
      c.font = '800 64px system-ui, sans-serif'; c.fillText('s', W - 40, H / 2 + 28);
    });
  }
  function sign(lines, key) {
    drawBoard(key, (c, W, H) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const n = lines.length;
      lines.forEach(([text, size, color], i) => {
        c.fillStyle = color || '#1d2b36'; c.font = `800 ${size}px system-ui, sans-serif`;
        c.fillText(text, W / 2, (H * (i + 0.5)) / n + 4);
      });
    });
  }

  function drawPlot() {
    const parts = [];
    if (st.r.on) parts.push(st.r.pts.length);
    if (st.c.on) parts.push(st.c.pts.length);
    if (st.k.on) parts.push(st.k.pts.length);
    const key = parts.join() + '|' + (st.avg ? st.avg.join() : '');
    if (key === st.graphKey) return;
    st.graphKey = key;
    graph.draw((c, W, H) => {
      const series = [];
      if (st.avg) series.push({ color: '#8d99ae', pts: [[0, 0], st.avg], width: 3, dash: [10, 8] });
      if (st.r.on) series.push({ color: COLORS.runner, pts: st.r.pts });
      if (st.c.on) series.push({ color: COLORS.cyclist, pts: st.c.pts });
      if (st.k.on) series.push({ color: COLORS.car, pts: st.k.pts });
      drawGraph(c, W, H, { xMax: 20, yMax: 100, xStep: 2, yStep: 20, xLabel: 'Time (s)', yLabel: 'Distance (m)', title: 'Distance–time graph', series });
      c.font = '700 18px system-ui, sans-serif'; c.textAlign = 'left';
      let y = 66;
      for (const [on, name, col] of [[st.r.on, 'Runner', COLORS.runner], [st.c.on, 'Cyclist', COLORS.cyclist], [st.k.on, 'Car', COLORS.car], [!!st.avg, 'Average', '#8d99ae']]) {
        if (!on) continue;
        c.fillStyle = col; c.fillRect(90, y - 4, 22, 8); c.fillText(name, 120, y); y += 26;
      }
    });
  }

  // ---------- Readouts ----------
  function readout() {
    const s = st.step, r = st.r, cy = st.c, k = st.k;
    let html = '';
    if (s === 0) {
      html = r.done ? `Finished: 100 m in <b>${fmt(st.clock, 2)} s</b><br>speed = 100 m ÷ ${fmt(st.clock, 2)} s = <b>${fmt(100 / st.clock, 1)} m/s</b>`
        : `Time: <b>${fmt(st.clock, 1)} s</b> · Distance: <b>${fmt(r.x, 0)} m</b>`;
    } else if (s === 1 || s === 2 || s === 3) {
      html = `Time: <b>${fmt(st.clock, 1)} s</b>${!st.running && st.clock > 0 && !(r.done && cy.done) ? ' (stopped)' : ''}<br>Runner <b>${fmt(r.x, 0)} m</b> at ${r.wait ? 0 : r.v} m/s · Cyclist <b>${fmt(cy.x, 0)} m</b> at ${cy.wait ? 0 : cy.v} m/s`;
    } else if (s === 4) {
      const total = 2.5 + st.redWait + 5;
      html = `Speed now: <b>${k.wait ? 0 : k.done ? 0 : speedOf(4)} m/s</b> · Time: <b>${fmt(st.clock, 1)} s</b><br>Average = 100 m ÷ ${fmt(total, 1)} s = <b>${fmt(100 / total, 1)} m/s</b>`;
    } else if (s === 5) {
      html = `${st.kmh} km/h ÷ 3.6 = <b>${fmt(st.kmh / 3.6, 1)} m/s</b> · 100 m takes <b>${fmt(100 / (st.kmh / 3.6), 1)} s</b>`;
    } else if (s === 6) {
      html = st.t2 != null ? `Time between gates: <b>${fmt(st.t2 - st.t1, 2)} s</b><br>20 m ÷ ${fmt(st.t2 - st.t1, 2)} s = <b>${fmt(20 / (st.t2 - st.t1), 1)} m/s</b> = <b>${fmt((20 / (st.t2 - st.t1)) * 3.6, 0)} km/h</b>${(20 / (st.t2 - st.t1)) * 3.6 > LIMIT + 0.5 ? ' · <b>over the limit!</b>' : ''}`
        : `Car speed: <b>${st.kmh} km/h</b> · Gates 20 m apart${st.t1 != null ? ' · timing…' : ''}`;
    } else if (s === 7) {
      const v = st.kmh / 3.6;
      html = `${st.kmh} km/h = <b>${fmt(v, 1)} m/s</b><br>Thinking distance = ${fmt(v, 1)} m/s × ${st.react} s = <b>${fmt(v * st.react, 1)} m</b> · Two-second gap = <b>${fmt(v * 2, 0)} m</b>`;
    }
    if (html !== st.msg) { st.msg = html; ui.readout(html); }
  }

  const roadView = { radius: 2.4, width: 7.6, yaw: 0, pitch: 0.38, target: [0, 1.2, -0.6] };
  const graphView = { radius: 3.3, width: 7.7, yaw: 0, pitch: 0.2, target: [-0.2, 2.6, -0.8] };
  // On a tall, narrow free area (phones) the long road is seen at an angle and the boards turn to face it.
  const portrait = () => { const f = freeRect(); return f.r - f.l < 560; };
  const roadTall = { radius: 6.0, yaw: 0.65, pitch: 0.42, target: [0.1, 1.0, -0.6] };
  const graphTall = { radius: 6.2, yaw: 0.45, pitch: 0.2, target: [-0.3, 2.4, -0.8] };
  const frame = (wide, tall) => {
    const p = portrait();
    graph.rotation.y = board.rotation.y = p ? (tall === roadTall ? 0.65 : 0.45) : 0;
    view(p ? tall : wide);
  };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? 8 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.sliders = {}; st.msg = ''; st.boardKey = ''; st.avg = null;
      hideAll(); resetRace();
      st.r.on = st.c.on = st.k.on = false;
      board.visible = true;
      if (i === 0) {
        frame(roadView, roadTall);
        runner.visible = true; tags.runner.show(true); st.r.on = true; st.r.v = 8;
        slider('r', { label: 'Runner speed', min: 2, max: 10, step: 0.5, value: 8, unit: ' m/s', onInput: v => { st.plan = []; st.r.v = v; } });
        ui.buttons([{ label: 'Start the race', onClick: () => { st.plan = []; start(); } }, { label: 'Reset', onClick: () => { st.plan = []; resetRace(); } }]);
        st.plan = [[0.3, start]];
      }
      if (i >= 1 && i <= 3) {
        if (i === 1) frame(roadView, roadTall); else frame(graphView, graphTall);
        runner.visible = cyclist.visible = true; tags.runner.show(true); tags.cyclist.show(true);
        st.r.on = st.c.on = true; st.r.v = 6; st.c.v = 12;
        if (i >= 2) { graph.visible = true; gPost.forEach(p => { p.visible = true; }); }
        slider('r', { label: 'Runner speed', min: 2, max: 10, step: 0.5, value: 6, unit: ' m/s', onInput: v => { st.plan = []; st.r.v = v; } });
        slider('c', { label: 'Cyclist speed', min: 2, max: 15, step: 0.5, value: 12, unit: ' m/s', onInput: v => { st.plan = []; st.c.v = v; } });
        const btns = [{ label: 'Start', onClick: () => { st.plan = []; start(); } }];
        if (i < 3) btns.push({ label: 'Stop the clock', onClick: () => { st.plan = []; st.running = false; } });
        else btns.push({ label: 'Stop the cyclist', onClick: () => { st.plan = []; st.c.wait = true; } }, { label: 'Go on', onClick: () => { st.plan = []; st.c.wait = false; } });
        ui.buttons(btns);
        st.plan = [[0.3, start]];
        if (i === 1) st.plan.push([2.8, () => { st.running = false; }]);
        if (i === 3) st.plan.push([1.6, () => { st.c.wait = true; }], [5.5, () => { st.c.wait = false; }]);
      }
      if (i === 4) {
        frame(graphView, graphTall);
        car.visible = true; tl.visible = true; st.k.on = true;
        graph.visible = true; gPost.forEach(p => { p.visible = true; });
        st.redWait = 2.5;
        slider('w', { label: 'Red light wait', min: 0, max: 10, step: 0.5, value: 2.5, unit: ' s', onInput: v => { st.plan = []; st.redWait = v; resetRace(); } });
        ui.buttons([{ label: 'Drive', onClick: () => { st.plan = []; start(); } }]);
        st.plan = [[0.3, start]];
      }
      if (i === 5) {
        frame(roadView, roadTall);
        car.visible = true; st.k.on = true; st.kmh = 36;
        slider('v', { label: 'Car speed', min: 10, max: 120, step: 2, value: 36, unit: ' km/h', onInput: v => { st.plan = []; st.kmh = v; } });
        st.running = true;
        st.plan = [[2.0, () => { st.kmh = 72; st.sliders.v.set(72); }], [7, () => { st.kmh = 108; st.sliders.v.set(108); }]];
      }
      if (i === 6) {
        frame(roadView, roadTall);
        car.visible = true; st.k.on = true; cam.visible = true;
        gates.forEach(g => { g.visible = true; }); gateTags.forEach(t => t.show(true));
        st.kmh = 90;
        slider('v', { label: 'Car speed', min: 20, max: 100, step: 5, value: 90, unit: ' km/h', onInput: v => { st.plan = []; st.kmh = v; } });
        ui.buttons([{ label: 'Drive through', onClick: () => { st.plan = []; start(); } }]);
        st.plan = [[0.3, start], [6, () => { st.kmh = 50; st.sliders.v.set(50); start(); }]];
      }
      if (i === 7) {
        frame(roadView, roadTall);
        car.visible = car2.visible = ghost.visible = true;
        bandRed.visible = bandBlue.visible = true; redTag.show(true); blueTag.show(true);
        st.kmh = 50; st.react = 1; st.play = -1;
        slider('v', { label: 'Car speed', min: 30, max: 120, step: 5, value: 50, unit: ' km/h', onInput: v => { st.plan = []; st.kmh = v; st.play = -1; } });
        slider('t', { label: 'Reaction time', min: 0.5, max: 2, step: 0.1, value: 1, unit: ' s', format: v => v.toFixed(1), onInput: v => { st.plan = []; st.react = +v.toFixed(1); st.play = -1; } });
        ui.buttons([{ label: 'Front car brakes!', onClick: () => { st.plan = []; st.play = 0; } }]);
        st.plan = [[0.5, () => { st.play = 0; }], [6, () => { st.kmh = 100; st.sliders.v.set(100); st.play = 0; }]];
      }
      if (isQuiz) {
        frame({ ...graphView, yaw: -0.2, pitch: 0.24 }, graphTall);
        runner.visible = cyclist.visible = true;
        graph.visible = true; gPost.forEach(p => { p.visible = true; });
        st.r.on = st.c.on = true; st.r.v = 6; st.c.v = 12;
        st.r.x = 48; st.c.x = 96; st.clock = 8;
        st.r.pts = [[0, 0], [8, 48]]; st.c.pts = [[0, 0], [8, 96]];
      }
    },

    update(dt, t) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step;
      let busy = st.plan.length > 0 || st.running;

      // ---- Racing (steps 0–4, 6) ----
      if (st.running && s !== 5 && s !== 7) {
        st.clock += dt;
        const list = [st.r, st.c, st.k].filter(m => m.on);
        for (const m of list) {
          if (m.done) continue;
          let v = m.v;
          if (s === 4) {
            if (m.x >= 50 && m.waited < st.redWait) { m.wait = true; m.waited += dt; v = 0; if (m.waited >= st.redWait) m.wait = false; }
            else v = m.x < 50 ? 20 : 10;
            if (m.x < 50 && m.x + v * dt > 50) v = (50 - m.x) / dt;     // stop exactly at the light
          }
          if (s === 6) v = st.kmh / 3.6;
          if (m.wait && s !== 4) v = 0;
          m.cur = v;
          m.x = Math.min(100, m.x + v * dt);
          if (m.x >= 100) { m.done = true; m.pts.push([st.clock, 100]); }
        }
        st.sample += dt;
        if (st.sample >= 0.2) { st.sample = 0; for (const m of list) if (!m.done) m.pts.push([st.clock, m.x]); }
        if (s === 6) {
          if (st.t1 == null && st.k.x >= GATE1) st.t1 = st.clock;
          if (st.t2 == null && st.k.x >= GATE2) { st.t2 = st.clock; if (st.kmh > LIMIT) st.flashT = 0.5; }
        }
        if (list.every(m => m.done)) {
          st.running = false;
          if (s === 4) st.avg = [st.clock, 100];
        }
      }

      // ---- Car loops (step 5) ----
      if (s === 5) {
        st.k.cur = st.kmh / 3.6;
        st.k.x += st.k.cur * dt;
        if (st.k.x > 100) st.k.x -= 100;
        busy = true;
      }

      // ---- Following distance (step 7) ----
      if (s === 7) {
        const v = st.kmh / 3.6, think = v * st.react, rear = 4;
        bandRed.scale.x = Math.max(0.01, think * U); bandRed.position.x = X(rear) + 0.55 + (think * U) / 2;
        bandBlue.scale.x = 2 * v * U; bandBlue.position.x = X(rear) + 0.55 + v * U;
        blueTag.at.position.set(0.5, 0, 0.15);
        ghost.position.set(X(rear + think), 0, LANE_B);
        car2.position.set(X(92), 0, LANE_B);
        let at = rear;
        if (st.play >= 0) {
          st.play += dt * 0.5;                              // shown at half speed
          at = rear + v * Math.min(st.play, st.react);
          if (st.play > st.react + 1.2) st.play = -1;
          busy = true;
        }
        car.position.set(X(at), 0, LANE_B);
        car.brake(st.play >= st.react);
        car2.brake(st.play >= 0);
        st.k.cur = st.play >= 0 && st.play < st.react ? v : 0;
      }

      // ---- Place movers and animate legs and wheels ----
      runner.position.set(X(st.r.x), 0, LANE_A);
      cyclist.position.set(X(st.c.x), 0, LANE_B);
      if (s !== 7) { car.position.set(X(st.k.x), 0, s === 6 || s === 5 || s === 4 ? LANE_B : LANE_B); car.brake(st.k.wait); }
      const moving = m => (st.running && !m.done && !m.wait ? m.v : 0);
      runner.stride(t, moving(st.r));
      cyclist.pedal(dt, moving(st.c));
      car.roll(dt, s === 5 || s === 6 || s === 4 || s === 7 ? (st.k.cur || 0) * (st.running || s === 5 || s === 7 ? 1 : 0) : 0);
      if (s === 4) setLight(st.redWait === 0 || (!st.k.wait && st.k.x >= 50) ? 2 : 0);

      // Gates flash when broken; the camera flashes once if the car is over the limit.
      if (s === 6) {
        gates.forEach((g, j) => { const m = [GATE1, GATE2][j], near = Math.abs(st.k.x - m) < 3; g.beam.material.opacity = near ? 0.2 : 0.8; });
        if (st.flashT > 0) { st.flashT = Math.max(0, st.flashT - dt); flash.material.opacity = st.flashT * 1.8; busy = true; }
        else flash.material.opacity = 0;
      }

      // ---- Board ----
      if (s <= 4) stopwatch(Math.round(st.clock * 20) / 20);
      if (s === 5) sign([[`${st.kmh} km/h`, 92], [`= ${fmt(st.kmh / 3.6, 1)} m/s`, 64, '#7b2cbf']], 'v' + st.kmh);
      if (s === 6) {
        if (st.t2 != null) {
          const dtg = st.t2 - st.t1, kmh = (20 / dtg) * 3.6;
          sign([['GATE TIMER', 30, '#526472'], [`${fmt(dtg, 2)} s → ${fmt(kmh, 0)} km/h`, 50, kmh > LIMIT + 0.5 ? '#d62839' : '#1e9e55']], 'g' + dtg.toFixed(3));
        } else sign([['GATE TIMER', 30, '#526472'], [st.t1 != null ? `${fmt(st.clock - st.t1, 2)} s` : 'ready', 64]], 'g' + (st.t1 != null ? (st.clock - st.t1).toFixed(2) : 'r'));
      }
      if (s === 7) { const v = st.kmh / 3.6; sign([[`${st.kmh} km/h × ${st.react} s`, 48, '#526472'], [`thinking ${fmt(v * st.react, 1)} m`, 56, '#d62839']], 'f' + st.kmh + st.react); }
      if (s === 8) stopwatch(8);
      if (graph.visible) drawPlot();
      readout();
      return busy;
    },
  };
}

// ---------- Figures (drawn larger than scale) ----------
function makeRunner(THREE, kit) {
  const g = new THREE.Group();
  const skin = kit.mat(0x8d5524), shirt = kit.mat(0x1d6fd8), shorts = kit.mat(0x1d2b36);
  kit.mesh(new THREE.CapsuleGeometry(0.11, 0.26, 4, 10), shirt, [0, 0.66, 0], g);
  kit.mesh(new THREE.SphereGeometry(0.1, 14, 10), skin, [0, 0.96, 0], g);
  const limb = (y, len, mat, r) => { const p = new THREE.Group(); p.position.y = y; kit.mesh(new THREE.CylinderGeometry(r, r * 0.8, len, 8), mat, [0, -len / 2, 0], p); g.add(p); return p; };
  const legs = [limb(0.48, 0.46, shorts, 0.045), limb(0.48, 0.46, shorts, 0.045)];
  const arms = [limb(0.8, 0.3, skin, 0.03), limb(0.8, 0.3, skin, 0.03)];
  legs[0].position.z = 0.06; legs[1].position.z = -0.06; arms[0].position.z = 0.14; arms[1].position.z = -0.14;
  g.stride = (t, v) => {
    const a = v > 0 ? Math.sin(t * (4 + v * 0.6)) * Math.min(0.9, 0.3 + v * 0.07) : 0;
    legs[0].rotation.z = a; legs[1].rotation.z = -a; arms[0].rotation.z = -a; arms[1].rotation.z = a;
    g.position.y = v > 0 ? Math.abs(Math.sin(t * (4 + v * 0.6))) * 0.03 : 0;
  };
  return g;
}

function makeCyclist(THREE, kit) {
  const g = new THREE.Group();
  const dark = kit.mat(0x2b2d42), frame = kit.mat(0xf77f00), skin = kit.mat(0xf1c27d);
  const wheels = [-0.33, 0.33].map(x => kit.mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 24), dark, [x, 0.26, 0], g));
  const bar = (a, b, mat = frame, r = 0.02) => {
    const m = kit.mesh(new THREE.CylinderGeometry(r, r, 1, 6), mat, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0], g);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    m.scale.y = Math.hypot(dx, dy); m.rotation.z = Math.atan2(-dx, dy);
    return m;
  };
  bar([-0.33, 0.26], [0, 0.28]); bar([0, 0.28], [-0.08, 0.58]); bar([-0.08, 0.58], [0.25, 0.58]); bar([0.25, 0.58], [0.33, 0.26]); bar([0, 0.28], [0.25, 0.58]);
  bar([0.25, 0.58], [0.25, 0.7]);
  kit.mesh(new THREE.CapsuleGeometry(0.1, 0.24, 4, 10), frame, [0.04, 0.82, 0], g).rotation.z = -0.6;
  kit.mesh(new THREE.SphereGeometry(0.09, 14, 10), skin, [0.2, 1.02, 0], g);
  kit.mesh(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0xe63946), [0.2, 1.05, 0], g);
  bar([0.1, 0.9], [0.25, 0.7], skin, 0.025);
  bar([-0.06, 0.66], [0.02, 0.4], kit.mat(0x264653), 0.035); bar([0.02, 0.4], [0.0, 0.28], kit.mat(0x264653), 0.03);
  g.pedal = (dt, v) => { for (const w of wheels) w.rotation.z -= (v * 0.14 * dt) / 0.24; };
  return g;
}

function makeCar(THREE, kit, color = 0x7b2cbf) {
  const g = new THREE.Group();
  kit.mesh(new THREE.BoxGeometry(1.1, 0.26, 0.5), kit.mat(color, { roughness: 0.4 }), [0, 0.24, 0], g);
  kit.mesh(new THREE.BoxGeometry(0.6, 0.22, 0.46), kit.mat(0xcfe8ff, { roughness: 0.2 }), [-0.06, 0.47, 0], g);
  const wheels = [];
  for (const [x, z] of [[-0.34, 0.25], [0.34, 0.25], [-0.34, -0.25], [0.34, -0.25]]) {
    const w = kit.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 14), kit.mat(0x1d2b36), [x, 0.12, z], g);
    w.rotation.x = Math.PI / 2;
    wheels.push(w);
  }
  const off = 0x6a1b1b, on = 0xff2d2d;
  const lights = [0.17, -0.17].map(z => kit.mesh(new THREE.BoxGeometry(0.03, 0.07, 0.1), new THREE.MeshBasicMaterial({ color: off }), [-0.56, 0.28, z], g));
  for (const z of [0.17, -0.17]) kit.mesh(new THREE.BoxGeometry(0.03, 0.07, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }), [0.56, 0.28, z], g);
  let lit = null;
  g.brake = v => { if (v === lit) return; lit = v; for (const l of lights) l.material.color.setHex(v ? on : off); };
  g.roll = (dt, v) => { for (const w of wheels) w.rotation.y -= (v * 0.14 * dt) / 0.12; };
  return g;
}
