// Weight and springs: 100 g slotted masses hang on a spring on a lab stand. Weight = m × g changes with the
// planet; the spring's extension (on a ruler and a live graph) is proportional to the force up to its
// elastic limit, past which it stays stretched. A newton meter weighs everyday objects.
// World units: 1 unit = 10 cm.
import { panel, drawGraph, makeArrow, makeCoil, rulerTexture, RULER_PAD, fmt } from '../_shared/lab.js';

const K = 20;          // spring constant, N/m (5 cm per newton)
const LIMIT = 5;       // elastic limit, N
const SOFT = 2;        // past the limit the spring stretches twice as much per newton
const TOP = 6.4;       // where the spring hangs from
const NAT = 1.5;       // natural length (15 cm)
const ZERO = TOP - NAT; // pointer height for zero extension
const ARROW = 0.3;     // arrow length per newton
const PLANETS = [
  { name: 'Earth', g: 9.8, sky: 0xdff1ff, ground: 0xcfe8c4 },
  { name: 'Moon', g: 1.6, sky: 0x0d1226, ground: 0x9b9ba3 },
  { name: 'Mars', g: 3.7, sky: 0xe7b48f, ground: 0xb4552f },
];
// Newton meter: scale 0–10 N, 0.15 units per newton.
const NM_PER_N = 0.15, NM_ZERO = 5.6;
const THINGS = [
  { key: 'apple', name: 'Apple', m: 0.1, what: 'apple' },
  { key: 'can', name: 'Can', m: 0.4, what: 'can of food' },
  { key: 'bottle', name: 'Water bottle', m: 0.5, what: 'bottle of water' },
  { key: 'sugar', name: 'Bag of sugar', m: 1.0, what: 'bag of sugar' },
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: PLANETS[0].ground, sky: PLANETS[0].sky, radius: 16 });
  kit.lights(scene, { sun: [5, 11, 7] });

  // ---------- Lab stand ----------
  const steel = kit.mat(0x8d99ae, { metalness: 0.6, roughness: 0.35 });
  kit.mesh(new THREE.BoxGeometry(2.6, 0.12, 1.5), kit.mat(0x3d4a56), [-0.5, 0.06, 0], scene);
  kit.mesh(new THREE.CylinderGeometry(0.07, 0.07, 6.7, 12), steel, [-1.3, 3.4, -0.2], scene);
  const arm = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 10), steel, [-0.5, TOP + 0.15, -0.2], scene);
  arm.rotation.z = Math.PI / 2;
  kit.mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), kit.mat(0x2b2d42), [-1.3, TOP + 0.15, -0.2], scene);
  kit.mesh(new THREE.BoxGeometry(0.12, 0.2, 0.42), steel, [0, TOP + 0.08, -0.05], scene);

  // ---------- Spring, hook, hanger and masses ----------
  const springMat = kit.mat(0xb8c4cf, { metalness: 0.8, roughness: 0.3 });
  const coil = makeCoil(THREE, springMat, { turns: 16, radius: 0.2, wire: 0.03 });
  coil.position.set(0, TOP, 0);
  scene.add(coil);
  const hang = new THREE.Group();           // moves with the bottom of the spring
  scene.add(hang);
  const hookGeo = new THREE.TorusGeometry(0.09, 0.02, 6, 16, Math.PI * 1.5);
  const hook = kit.mesh(hookGeo, steel, [0, -0.1, 0], hang);
  hook.rotation.z = Math.PI * 0.75;
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), steel, [0, -0.67, 0], hang);
  kit.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24), steel, [0, -1.15, 0], hang);
  const brass = kit.mat(0xc9a227, { metalness: 0.75, roughness: 0.35 });
  const discGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.115, 24);
  const masses = [];
  for (let i = 0; i < 6; i++) {
    const d = kit.mesh(discGeo, brass, [0, -1.13 + 0.07 + i * 0.13, 0], hang);
    d.visible = false;
    masses.push(d);
  }
  const pointer = kit.mesh(new THREE.BoxGeometry(0.62, 0.03, 0.05), new THREE.MeshBasicMaterial({ color: 0xe63946 }), [0.33, 0, 0.12], hang);
  pointer.castShadow = false;

  // Ruler: 0–40 cm, zero at the bottom of the unstretched spring.
  const RL = 4, RH = RL / (1 - 2 * RULER_PAD), RW = RH * 96 / 512;
  const ruler = kit.mesh(new THREE.PlaneGeometry(RW, RH), new THREE.MeshStandardMaterial({ map: rulerTexture(THREE, { max: 40, minor: 1, major: 5, vertical: true }), roughness: 0.8 }),
    [0.64 + RW / 2, ZERO + RH * RULER_PAD - RH / 2, 0.1], scene);
  ruler.castShadow = false;
  const rulerBack = kit.mesh(new THREE.BoxGeometry(RW + 0.06, RH + 0.06, 0.05), kit.mat(0x8a6a3d), [0.64 + RW / 2, ruler.position.y, 0.06], scene);
  const rulerTag = label('cm', new THREE.Vector3(0.64 + RW / 2, ZERO + RH * RULER_PAD + 0.05, 0.1));

  // Force arrows: weight down from the masses, spring pull up from the hook.
  const wArrow = makeArrow(THREE, 0xe63946), sArrow = makeArrow(THREE, 0x1d6fd8);
  scene.add(wArrow, sArrow);
  const wTag = label('Weight', wArrow.tip, { cls: 'warm' });
  const sTag = label('Spring pull', sArrow.tip, { cls: 'cool' });

  // ---------- Sign (W = m × g) and graph ----------
  const sign = panel(THREE, 3.2, 1.6, { px: 512 });
  sign.position.set(3.1, 4.9, -0.2);
  scene.add(sign);
  const graph = panel(THREE, 4.4, 3.3, { px: 512 });
  graph.position.set(4.2, 3.4, -0.3);
  scene.add(graph);
  // Little stands under the boards.
  const post = kit.mat(0x5c6b77);
  const signPost = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.1, 8), post, [3.1, 2.05, -0.3], scene);
  const graphPost = kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.75, 8), post, [4.2, 0.875, -0.4], scene);

  // ---------- Newton meter with everyday objects ----------
  const nm = new THREE.Group();
  scene.add(nm);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 2.45, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.28, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  tube.position.y = TOP - 1.225;
  nm.add(tube);
  kit.mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 24), kit.mat(0xe85d04), [0, TOP - 0.02, 0], nm);
  kit.mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 24), kit.mat(0xe85d04), [0, TOP - 2.45, 0], nm);
  const nmScaleLen = 10 * NM_PER_N, nmH = nmScaleLen / (1 - 2 * RULER_PAD), nmW = nmH * 96 / 512;
  kit.mesh(new THREE.PlaneGeometry(nmW, nmH), new THREE.MeshStandardMaterial({ map: rulerTexture(THREE, { max: 10, minor: 0.5, major: 1, vertical: true, color: '#ffffff' }), roughness: 0.8 }),
    [0.27 + nmW / 2, NM_ZERO + nmH * RULER_PAD - nmH / 2, 0.02], nm).castShadow = false;
  const nmCoil = makeCoil(THREE, springMat, { turns: 12, radius: 0.15, wire: 0.022 });
  nmCoil.position.set(0, TOP - 0.08, 0);
  nm.add(nmCoil);
  const nmMove = new THREE.Group();   // pointer, rod, hook and the object hanging on it
  nm.add(nmMove);
  kit.mesh(new THREE.BoxGeometry(0.62, 0.035, 0.05), new THREE.MeshBasicMaterial({ color: 0xe63946 }), [0.3, 0, 0.12], nmMove).castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.0, 8), steel, [0, -1.0, 0], nmMove);
  const nmHook = kit.mesh(hookGeo, steel, [0, -2.08, 0], nmMove);
  nmHook.rotation.z = Math.PI * 0.75;
  const things = makeThings(THREE, kit);
  for (const t of Object.values(things)) { t.position.y = -2.2; t.visible = false; nmMove.add(t); }
  const nmTag = label('N', new THREE.Vector3(0.27 + nmW / 2, NM_ZERO + nmH * RULER_PAD + 0.05, 0.05));

  // ---------- State ----------
  const st = {
    step: 0, quiz: false, time: 0, plan: [], n: 0, planet: 0, maxF: 0,
    ext: 0, vel: 0, points: [], showLine: false, slider: null, planetRow: null,
    thing: 'apple', moon: false, nmExt: 0, nmVel: 0, signText: '', graphKey: '',
  };
  const P = () => PLANETS[st.planet];
  const tagShow = (tag, v) => { if (tag.visible !== v) tag.show(v); };
  const force = () => st.n * 0.1 * P().g;

  // Extension in metres for a force, remembering the largest force so far (for permanent stretch).
  function extFor(F) {
    if (F >= st.maxF) return F <= LIMIT ? F / K : LIMIT / K + (SOFT * (F - LIMIT)) / K;
    const set = st.maxF > LIMIT ? ((SOFT - 1) * (st.maxF - LIMIT)) / K : 0;
    return set + F / K;
  }
  const permanent = () => (st.maxF > LIMIT ? ((SOFT - 1) * (st.maxF - LIMIT)) / K : 0);

  function setPlanet(i) {
    st.planet = i;
    scene.background.setHex(PLANETS[i].sky);
    ground.material.color.setHex(PLANETS[i].ground);
    load(st.n);
  }

  // Change the number of masses; record a point on the graph for the new force.
  function load(n) {
    st.n = n;
    masses.forEach((d, i) => { d.visible = i < n; });
    const F = force();
    const x = extFor(F);
    if (F > st.maxF) st.maxF = F;
    const key = F.toFixed(2) + (st.maxF > LIMIT && F < st.maxF ? 'u' : '');
    if (!st.points.some(p => p.key === key)) st.points.push({ key, F, x: x * 100, over: st.maxF > LIMIT });
    refresh();
  }

  function newSpring() {
    st.maxF = 0; st.points = [];
    load(st.n);
  }

  function refresh() {
    const F = force(), m = st.n * 0.1, x = extFor(F) * 100, g = P().g;
    if (st.step === 5) {
      const t = THINGS.find(t => t.key === st.thing), gg = st.moon ? 1.6 : 9.8;
      ui.readout(`${t.name}: mass <b>${fmt(t.m, 1)} kg</b> · weight <b>${fmt(t.m * gg, 1)} N</b>${st.moon ? ' on the Moon' : ''}<br>W = ${fmt(t.m, 1)} kg × ${gg} N/kg`);
    } else if (st.step === 0) {
      ui.readout(`Mass: <b>${fmt(m, 1)} kg</b> (${st.n * 100} g) · Weight: <b>${fmt(F, 1)} N</b>`);
    } else if (st.step === 1) {
      ui.readout(`W = m × g = ${fmt(m, 1)} kg × ${g} N/kg = <b>${fmt(F, 2)} N</b>`);
    } else if (st.step === 2) {
      const place = ['Earth', 'the Moon', 'Mars'][st.planet];
      ui.readout(`On ${place}: mass <b>${fmt(m, 1)} kg</b> · g = ${g} N/kg · weight <b>${fmt(F, 2)} N</b>`);
    } else if (st.step === 3) {
      ui.readout(`Force: <b>${fmt(F, 1)} N</b> · Extension: <b>${fmt(x, 1)} cm</b>`);
    } else if (st.step === 4) {
      ui.readout(`${P().name}: force <b>${fmt(F, 2)} N</b> → extension <b>${fmt(x, 1)} cm</b>${F > 0 ? ` · ${fmt(x / F, 1)} cm per N` : ''}`);
    } else if (st.step === 6) {
      const over = st.maxF > LIMIT;
      ui.readout(`Force: <b>${fmt(F, 1)} N</b> · Extension: <b>${fmt(x, 1)} cm</b><br>${over ? `Past the elastic limit! Permanent stretch: <b>${fmt(permanent() * 100, 1)} cm</b>` : 'Within the elastic limit (5 N)'}`);
    }
  }

  function drawSign() {
    const m = st.n * 0.1, F = force(), key = `${st.n}|${st.planet}`;
    if (key === st.signText) return;
    st.signText = key;
    sign.draw((c, W, H) => {
      c.fillStyle = '#fffdf5'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#1d2b36'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '800 64px system-ui, sans-serif'; c.fillText('W = m × g', W / 2, 62);
      c.font = '700 40px system-ui, sans-serif'; c.fillStyle = '#526472';
      c.fillText(`${fmt(m, 1)} kg × ${P().g} N/kg`, W / 2, 140);
      c.fillStyle = '#d62839'; c.font = '800 48px system-ui, sans-serif';
      c.fillText(`= ${fmt(F, 2)} N`, W / 2, 205);
    });
  }

  function drawPlot() {
    const key = st.points.map(p => p.key).join() + st.showLine;
    if (key === st.graphKey) return;
    st.graphKey = key;
    graph.draw((c, W, H) => drawGraph(c, W, H, {
      xMax: 6, yMax: 40, xStep: 1, yStep: 10, xLabel: 'Force (N)', yLabel: 'Extension (cm)', title: 'Extension against force',
      series: [
        ...(st.showLine ? [{ color: '#9ab3c7', pts: [[0, 0], [LIMIT, LIMIT * 5]], width: 3, dash: [10, 8] }] : []),
        { color: '#1d6fd8', pts: st.points.filter(p => !p.over).map(p => [p.F, p.x]), dots: 9, line: false },
        { color: '#e63946', pts: st.points.filter(p => p.over).map(p => [p.F, p.x]), dots: 9, line: false },
      ],
    }));
  }

  // Newton meter reading.
  function showThing(key) {
    st.thing = key;
    for (const [k, t] of Object.entries(things)) t.visible = k === key;
    refresh();
  }

  function hideAll() {
    for (const l of [wTag, sTag, rulerTag, nmTag]) l.show(false);
    sign.visible = signPost.visible = false;
    graph.visible = graphPost.visible = false;
    nm.visible = false;
    coil.visible = hang.visible = ruler.visible = rulerBack.visible = true;
    sArrow.userData.on = false; wArrow.userData.on = false;
  }

  const massSlider = (max = 5) => {
    st.slider = ui.slider({ label: 'Masses (100 g each)', min: 0, max, step: 1, value: st.n, format: v => `${v} × 100 g`, onInput: v => { st.plan = []; load(v); } });
  };
  const planetButtons = () => {
    st.planetRow = ui.buttons(PLANETS.map((p, i) => ({ label: p.name, on: i === st.planet, onClick: () => { st.plan = []; setPlanet(i); } })));
  };
  // Scripted demo: until the learner touches a control.
  const demoLoad = n => { load(n); st.slider?.set(n); };
  const demoPlanet = i => { setPlanet(i); st.planetRow?.select(i); };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? 7 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.slider = null; st.planetRow = null;
      hideAll();
      st.maxF = 0; st.n = 0;
      setPlanet(0);
      st.points = [];
      st.showLine = false;
      if (i === 0) {
        view({ radius: 3, yaw: 0.35, pitch: 0.16, target: [0, 3.5, 0] });
        wArrow.userData.on = true; wTag.show(true);
        load(1); massSlider();
        st.plan = [[0.8, () => demoLoad(2)], [1.6, () => demoLoad(3)]];
      }
      if (i === 1) {
        view({ radius: 3, width: 3.5, yaw: 0.2, pitch: 0.12, target: [1.6, 3.6, 0] });
        sign.visible = signPost.visible = true;
        wArrow.userData.on = true; wTag.show(true);
        load(1); massSlider();
        st.plan = [[0.9, () => demoLoad(3)], [2.2, () => demoLoad(5)]];
      }
      if (i === 2) {
        view({ radius: 3, yaw: 0.45, pitch: 0.16, target: [0, 3.3, 0] });
        wArrow.userData.on = true; wTag.show(true);
        setPlanet(0); load(5);
        planetButtons(); massSlider();
        st.plan = [[1.0, () => demoPlanet(1)], [4.0, () => demoPlanet(2)], [7.0, () => demoPlanet(0)]];
      }
      if (i === 3) {
        view({ radius: 2.6, yaw: -0.3, pitch: 0.12, target: [0.3, 3.6, 0] });
        wArrow.userData.on = sArrow.userData.on = true; wTag.show(true); sTag.show(true); rulerTag.show(true);
        load(1); massSlider();
        st.plan = [[0.7, () => demoLoad(2)], [1.4, () => demoLoad(3)], [2.1, () => demoLoad(4)]];
      }
      if (i === 4) {
        view({ radius: 3.4, width: 3.6, yaw: 0, pitch: 0.1, target: [2.2, 3.5, 0] });
        graph.visible = graphPost.visible = true; rulerTag.show(true);
        setPlanet(0); load(0); st.showLine = true;
        massSlider(); planetButtons();
        ui.buttons([{ label: 'Clear the graph', onClick: () => { st.plan = []; st.points = []; load(st.n); } }]);
        st.plan = [0.4, 0.8, 1.2, 1.6, 2.0].map((t, j) => [t, () => demoLoad(j + 1)]);
        st.plan.push([4.5, () => { demoPlanet(1); demoLoad(1); }], [5.3, () => demoLoad(3)], [6.1, () => demoLoad(5)]);
      }
      if (i === 5) {
        view({ radius: 3.1, yaw: 0.3, pitch: 0.12, target: [0, 3.4, 0] });
        coil.visible = hang.visible = ruler.visible = rulerBack.visible = false;
        nm.visible = true; nmTag.show(true);
        st.moon = false;
        const row = ui.buttons(THINGS.map((t, j) => ({ label: t.name, on: j === 2, onClick: () => { st.plan = []; showThing(t.key); } })));
        const moon = ui.toggle({ label: 'Take it to the Moon', value: false, onChange: v => { st.plan = []; st.moon = v; setPlanet(v ? 1 : 0); refresh(); } });
        showThing('bottle');
        st.plan = [[2.0, () => { showThing('sugar'); row.select(3); }], [5.0, () => { st.moon = true; moon.checked = true; setPlanet(1); refresh(); }],
          [8.0, () => { st.moon = false; moon.checked = false; setPlanet(0); showThing('apple'); row.select(0); }]];
      }
      if (i === 6) {
        view({ radius: 3.4, width: 3.6, yaw: 0, pitch: 0.1, target: [2.2, 3.4, 0] });
        graph.visible = graphPost.visible = true; rulerTag.show(true);
        st.showLine = true; st.maxF = 0;
        load(4); massSlider(6);
        ui.buttons([
          { label: 'Take the masses off', onClick: () => { st.plan = []; demoLoad(0); } },
          { label: 'New spring', onClick: () => { st.plan = []; newSpring(); } },
        ]);
        st.points = [];
        for (let n = 1; n <= 4; n++) { st.n = n; load(n); }
        st.plan = [[0.7, () => demoLoad(5)], [1.5, () => demoLoad(6)], [4.5, () => demoLoad(0)]];
      }
      if (isQuiz) {
        view({ radius: 3.6, width: 3.8, yaw: -0.2, pitch: 0.16, target: [1.8, 3.4, 0] });
        graph.visible = graphPost.visible = true;
        st.showLine = true;
        for (let n = 1; n <= 3; n++) load(n);
      }
      // Start the spring at rest for the current load.
      st.ext = extFor(force()); st.vel = 0;
      st.nmExt = 0; st.nmVel = 0;
      refresh();
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();

      // Spring bounce: a damped spring towards the extension for the current force.
      let busy = st.plan.length > 0;
      const target = extFor(force()) * 10;  // world units
      const n = Math.ceil(dt / (1 / 120)), h = dt / Math.max(1, n);
      for (let s = 0; s < n; s++) {
        const a = -55 * (st.ext * 10 - target) - 3 * st.vel;
        st.vel += a * h; st.ext += (st.vel * h) / 10;
      }
      if (Math.abs(st.vel) > 1e-3 || Math.abs(st.ext * 10 - target) > 1e-4) busy = true; else { st.ext = target / 10; st.vel = 0; }
      const e = st.ext * 10;
      coil.setLength(NAT + e - 0.05);
      hang.position.set(0, ZERO - e, 0);

      // Arrows: weight from the middle of the masses; spring pull from the hook (equal when still).
      const F = force();
      if (wArrow.userData.on && st.n > 0) {
        const mid = ZERO - e - 1.13 + st.n * 0.065 + 0.02;
        wArrow.point(-0.62, mid, 0, 0, -1, 0, F * ARROW, -0.6);
      } else wArrow.visible = false;
      tagShow(wTag, wArrow.visible);
      if (sArrow.userData.on && st.n > 0) {
        const pull = K * (st.ext - permanent());
        sArrow.point(-0.42, ZERO - e, 0, 0, 1, 0, Math.max(0, pull) * ARROW, -0.55);
      } else sArrow.visible = false;
      tagShow(sTag, sArrow.visible);

      if (sign.visible) drawSign();
      if (graph.visible) drawPlot();

      // Newton meter.
      if (nm.visible) {
        const t = THINGS.find(t => t.key === st.thing), want = t.m * (st.moon ? 1.6 : 9.8) * NM_PER_N;
        for (let s = 0; s < n; s++) { const a = -60 * (st.nmExt - want) - 4 * st.nmVel; st.nmVel += a * h; st.nmExt += st.nmVel * h; }
        if (Math.abs(st.nmVel) > 1e-3 || Math.abs(st.nmExt - want) > 1e-4) busy = true; else { st.nmExt = want; st.nmVel = 0; }
        nmCoil.setLength(TOP - 0.08 - (NM_ZERO - st.nmExt));
        nmMove.position.y = NM_ZERO - st.nmExt;
      }
      return busy;
    },
  };
}

// Everyday objects for the newton meter (sizes in units of 10 cm), each hanging from its top at y = 0.
function makeThings(THREE, kit) {
  const g = (...m) => { const x = new THREE.Group(); m.forEach(o => x.add(o)); return x; };
  const m = (geo, mat, pos) => kit.mesh(geo, mat, pos);
  const string = (len) => m(new THREE.CylinderGeometry(0.012, 0.012, len, 4), kit.mat(0xeeeeee), [0, -len / 2, 0]);
  return {
    apple: g(string(0.2),
      m(new THREE.SphereGeometry(0.4, 24, 16), kit.mat(0xd62828, { roughness: 0.45 }), [0, -0.58, 0]),
      m(new THREE.CylinderGeometry(0.02, 0.025, 0.14, 6), kit.mat(0x6b4226), [0, -0.16, 0])),
    can: g(string(0.15),
      m(new THREE.CylinderGeometry(0.37, 0.37, 1.1, 24), kit.mat(0xbfc7cf, { metalness: 0.7, roughness: 0.35 }), [0, -0.7, 0]),
      m(new THREE.CylinderGeometry(0.375, 0.375, 0.7, 24, 1, true), kit.mat(0x2a9d8f), [0, -0.7, 0])),
    bottle: g(string(0.1),
      m(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12), kit.mat(0x1d6fd8), [0, -0.18, 0]),
      m(new THREE.CylinderGeometry(0.12, 0.33, 0.35, 20), kit.mat(0xa9dcff, { transparent: true, opacity: 0.7, roughness: 0.1 }), [0, -0.43, 0]),
      m(new THREE.CylinderGeometry(0.33, 0.33, 1.5, 20), kit.mat(0x7cc6ff, { transparent: true, opacity: 0.75, roughness: 0.1 }), [0, -1.35, 0])),
    sugar: g(string(0.15),
      m(new THREE.BoxGeometry(1.2, 1.15, 0.8), kit.mat(0xf8f9fa, { roughness: 0.9 }), [0, -0.73, 0]),
      m(new THREE.BoxGeometry(1.22, 0.35, 0.82), kit.mat(0x3a86ff), [0, -0.73, 0])),
  };
}
