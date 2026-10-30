// Density: equal cubes of different materials on digital scales, a mass–volume graph, water displacement in
// a measuring cylinder (a stone, and two yellow bars of equal mass) and a density column of honey, water and
// oil where objects settle at their own layer. World units: 1 unit = 10 cm.
import { panel, drawGraph, paint, rand, fmt } from '../_shared/lab.js';
import { digitalScale, measuringCylinder, liquidMat, liquidColumn, glassTube, stoneGeometry } from '../_shared/fluids.js';

const CM = 0.1;
// Densities in g/cm³ (textbook values; wood depends on the kind, about 0.7).
const MATS = [
  { key: 'wood', name: 'Wood', rho: 0.7 },
  { key: 'al', name: 'Aluminium', rho: 2.7 },
  { key: 'iron', name: 'Iron', rho: 7.8 },
  { key: 'lead', name: 'Lead', rho: 11.3 },
  { key: 'gold', name: 'Gold', rho: 19.3 },
];
const ROW_X = [-2.1, -1.05, 0, 1.05, 2.1];
// Step 3: two rows, so the five scales fit a phone screen (back: wood, aluminium, iron; front: lead, gold).
const GRID_X = [-1.05, 0, 1.05, -0.53, 0.53], GRID_Z = [-0.6, -0.6, -0.6, 0.85, 0.85];
const SAME = [0, 1, 2, 4], SAME_X = [-1.65, -0.55, 0.55, 1.65];   // step 4: wood, aluminium, iron, gold

// Displacement bench: a 500 mL measuring cylinder (inner radius 3 cm) between two scales.
const CYL_X = 4.5, CYL_R = 3, UPM = CM / (Math.PI * CYL_R * CYL_R), START_ML = 300;
const LEFT_X = 3.3, RIGHT_X = 5.7;
const STONE = { m: 52, v: 20, rx: 2.0, ry: 1.4, rz: 1.7 };            // g, cm³, cm
const BARS = [{ name: 'A', m: 965, v: 50, w: 2, d: 2.5, h: 10, what: 'gold' },
  { name: 'B', m: 965, v: 85, w: 2.5, d: 3.4, h: 10, what: 'lead' }];

// Density column: three 6 cm layers in a tall glass.
const COL_X = -4.2, COL_R = 0.45, LAYER = 0.6, FLOOR = 0.04, TOPL = FLOOR + 3 * LAYER;
const LAYERS = [
  { name: 'Honey', rho: 1400, color: 0xd99a1e, op: 0.8 },
  { name: 'Water', rho: 1000, color: 0x3b9be0, op: 0.38 },
  { name: 'Oil', rho: 920, color: 0xf2d24b, op: 0.5 },
];
const OBJS = [
  { key: 'cork', name: 'Cork', rho: 240, h: 0.2, dx: -0.24, dz: 0.05 },
  { key: 'bead', name: 'Plastic bead', rho: 950, h: 0.08, dx: -0.06, dz: -0.12 },
  { key: 'brick', name: 'Toy brick', rho: 1050, h: 0.12, dx: 0.1, dz: 0.1 },
  { key: 'nut', name: 'Steel nut', rho: 7800, h: 0.07, dx: 0.25, dz: -0.05 },
];
const HELD_Y = 2.55;

// Fraction of a sphere-like stone under water when the water is d above its bottom (height 2r).
const capFrac = (d, r) => { d = Math.max(0, Math.min(2 * r, d)); return (d * d * (3 * r - d)) / (4 * r * r * r); };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xe6d3b3, sky: 0xe4f1fb, radius: 16 });
  const sun = kit.lights(scene, { sun: [4, 9, 6] });
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  sun.shadow.camera.updateProjectionMatrix();

  // ---------- Cubes on a row of scales ----------
  const woodTex = paint(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = '#c98f55'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a8703d'; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const y = 5 + i * 10 + rand(i) * 4;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 3);
      g.stroke();
    }
  });
  const cubeMats = {
    wood: kit.mat(0xffffff, { map: woodTex }),
    al: kit.mat(0xe6eaef, { metalness: 0.2, roughness: 0.35 }),
    iron: kit.mat(0x7d838b, { metalness: 0.25, roughness: 0.45 }),
    lead: kit.mat(0x9aa6b6, { metalness: 0.1, roughness: 0.75 }),
    gold: kit.mat(0xffcc33, { metalness: 0.25, roughness: 0.3, emissive: 0x3a2600 }),
  };
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  cubeGeo.translate(0, 0.5, 0);
  const row = MATS.map((m, i) => {
    const sc = digitalScale(THREE, kit);
    sc.position.set(ROW_X[i], 0, 0);
    scene.add(sc);
    const cube = kit.mesh(cubeGeo, cubeMats[m.key], [0, sc.top, sc.panZ], sc);
    cube.scale.setScalar(4 * CM);
    const anchor = new THREE.Object3D();
    sc.add(anchor);
    const tag = label(m.name, anchor);
    tag.show(false);
    return { ...m, sc, cube, anchor, tag, side: 4, sideTo: 4 };
  });
  const sideTag = label('', new THREE.Object3D());
  sideTag.show(false);

  // Mass–volume graph (step 2).
  const graph = panel(THREE, 2.2, 1.65, { px: 512 });
  graph.position.set(1.75, 0.95, -0.25);
  scene.add(graph);
  const graphPost = kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8), kit.mat(0x5c6b77), [1.75, 0.07, -0.28], scene);

  // ---------- Displacement bench ----------
  const waterMat = liquidMat(THREE, 0x3b9be0, 0.4);
  const cyl = measuringCylinder(THREE, kit, { r: CYL_R * CM, upm: UPM, maxML: 500, major: 100, minor: 20, waterMat, extra: 0.2 });
  cyl.position.set(CYL_X, 0, 0);
  scene.add(cyl);
  const levelAnchor = new THREE.Object3D();
  cyl.add(levelAnchor);
  const levelTag = label('', levelAnchor, { cls: 'cool' });
  levelTag.show(false);
  const left = digitalScale(THREE, kit), right = digitalScale(THREE, kit);
  left.position.set(LEFT_X, 0, 0); right.position.set(RIGHT_X, 0, 0);
  scene.add(left, right);

  const threadMat = kit.mat(0xf4f1e8);
  const threadGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.8, 4);
  threadGeo.translate(0, 0.4, 0);
  const thread = (top) => { const t = new THREE.Mesh(threadGeo, threadMat); t.position.y = top; return t; };

  // The stone and the bars hang from threads; each is carried from its scale into the cylinder by u (0 → 1).
  const carried = [];
  const stoneG = new THREE.Group();
  const sh = STONE.ry * CM;
  kit.mesh(stoneGeometry(THREE, STONE.rx * CM, sh, STONE.rz * CM, 3), kit.mat(0x8a8d93, { flatShading: true, roughness: 1 }), [0, sh, 0], stoneG);
  stoneG.add(thread(2 * sh * 0.92));
  scene.add(stoneG);
  carried.push({ g: stoneG, sc: left, h: 2 * sh, v: STONE.v, m: STONE.m, stone: true, u: 0, uTo: 0 });
  const goldMat = cubeMats.gold;
  const barTags = [];
  BARS.forEach((b, i) => {
    const g = new THREE.Group();
    kit.mesh(new THREE.BoxGeometry(b.w * CM, b.h * CM, b.d * CM), goldMat, [0, b.h * CM / 2, 0], g);
    g.add(thread(b.h * CM));
    const a = new THREE.Object3D();
    a.position.y = b.h * CM + 0.12;
    g.add(a);
    barTags.push(label(`Bar ${b.name}`, a, { cls: 'warm' }));
    scene.add(g);
    carried.push({ g, sc: i ? right : left, h: b.h * CM, v: b.v, m: b.m, u: 0, uTo: 0, bar: b });
  });
  const [stone, barA, barB] = carried;

  // Position along the carry path: up and over to the cylinder (u < 0.35), then straight down into it.
  const hiY = cyl.height + 0.08, lowY = cyl.floorY + 0.004;
  function placeCarried(c) {
    const sx = c.sc.position.x, sz = c.sc.panZ, u = c.u;
    let x, y, z;
    if (u < 0.35) {
      const k = kit.ease(u / 0.35);
      x = kit.lerp(sx, CYL_X, k); z = kit.lerp(sz, 0, k);
      y = kit.lerp(c.sc.top, hiY, Math.sin(Math.min(1, u / 0.25) * Math.PI / 2));
    } else {
      x = CYL_X; z = 0;
      y = kit.lerp(hiY, lowY, (u - 0.35) / 0.65);
    }
    c.g.position.set(x, y, z);
    c.bottom = y;
  }
  // Under-water fraction of a carried object for a water surface at height L (cylinder coordinates).
  const subFrac = (c, L) => (c.u < 0.36 ? 0 : c.stone ? capFrac(L - c.bottom, c.h / 2) : kit.clamp((L - c.bottom) / c.h, 0, 1));
  function waterLevel() {
    const L0 = cyl.levelY(START_ML);
    let L = L0, ml = START_ML;
    for (let it = 0; it < 6; it++) {
      ml = START_ML;
      for (const c of carried) if (c.g.visible) ml += subFrac(c, L) * c.v;
      L = cyl.levelY(ml);
    }
    return ml;
  }

  // ---------- Density column ----------
  const colGlass = glassTube(THREE, kit, COL_R, TOPL + 0.45, { thick: FLOOR, foot: COL_R * 1.15 });
  colGlass.position.set(COL_X, 0, 0);
  scene.add(colGlass);
  const layerTags = LAYERS.map((l, i) => {
    const m = liquidColumn(THREE, liquidMat(THREE, l.color, l.op), COL_R * 0.97);
    m.position.set(COL_X, FLOOR + i * LAYER, 0);
    m.setLevel(LAYER - 0.002);
    scene.add(m);
    return label(l.name, new THREE.Vector3(COL_X - COL_R - 0.32, FLOOR + (i + 0.45) * LAYER, 0), { cls: i === 1 ? 'cool' : 'warm' });
  });
  const objBuild = {
    cork: () => kit.mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.2, 18), kit.mat(0xc8955c, { roughness: 1 })),
    bead: () => kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 18), kit.mat(0xff5d8f, { roughness: 0.4 })),
    brick: () => {
      const g = new THREE.Group(), red = kit.mat(0xe63946, { roughness: 0.4 });
      kit.mesh(new THREE.BoxGeometry(0.22, 0.12, 0.14), red, [0, 0, 0], g);
      for (const x of [-0.055, 0.055]) kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 12), red, [x, 0.07, 0], g);
      return g;
    },
    nut: () => {
      const g = new THREE.Group();
      kit.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 6), kit.mat(0x9aa3ad, { metalness: 0.6, roughness: 0.35 }), [0, 0, 0], g);
      kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.072, 12), kit.mat(0x2b2f36), [0, 0, 0], g);
      return g;
    },
  };
  const col = OBJS.map(o => {
    const g = objBuild[o.key]();
    scene.add(g);
    const anchor = new THREE.Object3D();
    scene.add(anchor);
    const tag = label(o.name, anchor);
    tag.show(false);
    g.position.set(COL_X + o.dx, HELD_Y, o.dz);
    return { ...o, g, anchor, tag, y: HELD_Y, v: 0, held: true, still: 0 };
  });
  // Upward push from the layers as a share of the object's weight (each layer pushes by its density × share of volume).
  function layerPush(o) {
    const b = o.y - o.h / 2, t = o.y + o.h / 2;
    let p = 0, honey = 0;
    LAYERS.forEach((l, i) => {
      const a = FLOOR + i * LAYER, f = Math.max(0, Math.min(t, a + LAYER) - Math.max(b, a)) / o.h;
      p += l.rho * f;
      if (i === 0) honey = f;
    });
    return { p, honey };
  }
  function settle(o) {
    // Solve for the resting height directly (used for the quiz view).
    if (o.rho > LAYERS[0].rho) { o.y = FLOOR + o.h / 2; return; }
    let lo = FLOOR + o.h / 2, hi = TOPL + o.h / 2;
    for (let i = 0; i < 40; i++) { o.y = (lo + hi) / 2; if (layerPush(o).p > o.rho) lo = o.y; else hi = o.y; }
  }
  for (const o of col) { settle(o); o.eq = o.y; o.y = HELD_Y; }
  const resetColumn = () => col.forEach(o => { o.held = true; o.y = HELD_Y; o.v = 0; o.still = 0; o.tag.show(false); o.g.position.y = HELD_Y; });
  const dropObj = o => { if (o.held) { o.held = false; o.v = 0; o.still = 0; } };

  // ---------- State ----------
  const st = { step: 0, quiz: false, time: 0, plan: [], mat: 1, points: [], graphKey: '', mass: 500, auto: false, slider: null, msg: '', stoneML: -1 };

  function showRow(n, xs, zs) {
    row.forEach((r, i) => {
      const j = n.indexOf(i);
      r.sc.visible = j >= 0;
      r.tag.show(false);
      if (j >= 0) r.sc.position.set(xs[j], 0, zs ? zs[j] : 0);
    });
  }
  // Steps 1–2: one cube on the middle scale, aluminium or iron.
  const single = () => row[2];
  function setSingle(matIndex, side) {
    st.mat = matIndex;
    const r = single();
    r.cube.material = cubeMats[MATS[matIndex].key];
    r.sideTo = side;
    const V = side ** 3, m = V * MATS[matIndex].rho;
    if (st.step === 1) {
      const key = `${matIndex}:${side}`;
      if (!st.points.some(p => p.key === key)) st.points.push({ key, mat: matIndex, V, m });
    }
    r.sc.set(`${fmt(m, 1)} g`);
    sideTag.text = `side ${side} cm`;
    const name = MATS[matIndex].name;
    if (st.step === 0) ui.readout(`Side <b>${side} cm</b> · Volume V = ${side} × ${side} × ${side} = <b>${V} cm³</b> · Mass m = <b>${fmt(m, 1)} g</b>`);
    else ui.readout(`${name}: D = m / V = ${fmt(m, 1)} g ÷ ${V} cm³ = <b>${fmt(MATS[matIndex].rho, 1)} g/cm³</b> = ${MATS[matIndex].rho * 1000} kg/m³`);
  }
  function drawPlot() {
    const key = st.points.map(p => p.key).join();
    if (key === st.graphKey) return;
    st.graphKey = key;
    const lines = [1, 2].filter(mi => st.points.some(p => p.mat === mi)).map(mi => {
      const vmax = Math.max(...st.points.filter(p => p.mat === mi).map(p => p.V));
      return { color: mi === 1 ? '#9ab3c7' : '#d9a3a3', pts: [[0, 0], [vmax, vmax * MATS[mi].rho]], width: 3, dash: [10, 8] };
    });
    graph.draw((c, W, H) => drawGraph(c, W, H, {
      xMax: 125, yMax: 1000, xStep: 25, yStep: 200, xLabel: 'Volume (cm³)', yLabel: '', title: 'Mass (g) against volume (cm³)',
      series: [...lines,
        { color: '#1d6fd8', pts: st.points.filter(p => p.mat === 1).map(p => [p.V, p.m]), dots: 9, line: false },
        { color: '#d62839', pts: st.points.filter(p => p.mat === 2).map(p => [p.V, p.m]), dots: 9, line: false }],
    }));
  }
  function pickRow(i) {
        const r = row[i], m = 64 * r.rho;
    ui.readout(`${r.name}: D = m / V = ${fmt(m, 1)} g ÷ 64 cm³ = <b>${fmt(r.rho, 1)} g/cm³</b> = ${Math.round(r.rho * 1000)} kg/m³`);
  }
  function setMass(M) {
    st.mass = M;
    SAME.forEach(i => { const r = row[i]; r.sideTo = Math.cbrt(M / r.rho); r.sc.set(`${M}.0 g`); });
    ui.readout(SAME.map(i => `${row[i].name} <b>${Math.round(M / row[i].rho)} cm³</b>`).join(' · ') + `<br>V = m / D, with m = ${M} g for every block`);
  }

  function bench(showStone, showBars) {
    left.visible = showStone || showBars; right.visible = showBars; cyl.visible = showStone || showBars;
    stone.g.visible = showStone; barA.g.visible = barB.g.visible = showBars;
    barTags.forEach(t => t.show(false));
    levelTag.show(showStone || showBars);
    for (const c of carried) { c.u = c.uTo = 0; placeCarried(c); }
    st.stoneML = -1;
  }
  function testBar(i) { barA.uTo = i === 0 ? 1 : 0; barB.uTo = i === 1 ? 1 : 0; st.msg = ''; }

  // Live text for the displacement steps.
  function benchReadout(ml) {
    let msg;
    if (st.step === 4) {
      const v = ml - START_ML, full = stone.u > 0.999;
      msg = `Mass m = <b>52 g</b> · water level <b>${Math.round(ml)} mL</b> · volume pushed aside <b>${Math.round(v)} cm³</b>` +
        (full ? `<br>V = ${Math.round(ml)} − ${START_ML} = 20 cm³ → D = 52 g ÷ 20 cm³ = <b>2.6 g/cm³</b> = 2600 kg/m³` : '');
    } else {
      const c = barA.uTo > 0 ? barA : barB.uTo > 0 ? barB : null;
      if (!c) msg = 'Both bars: mass <b>965 g</b>. Water in the cylinder: <b>300 mL</b>.';
      else {
        const b = c.bar, v = ml - START_ML;
        msg = `Bar ${b.name}: m = 965 g · level <b>${Math.round(ml)} mL</b> · V = <b>${Math.round(v)} cm³</b>`;
        if (c.u > 0.999) msg += `<br>D = 965 g ÷ ${b.v} cm³ = <b>${fmt(965 / b.v, 1)} g/cm³</b> → ${b.what === 'gold' ? 'real gold!' : 'not gold: it matches lead'}`;
      }
    }
    if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
  }

  function hideAll() {
    showRow([], []);
    sideTag.show(false);
    graph.visible = graphPost.visible = false;
    bench(false, false);
    layerTags.forEach(t => t.show(false));
    resetColumn();
  }

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? 7 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.auto = false; st.slider = null; st.msg = '';
      hideAll();
      if (i === 0 || i === 1) {
        showRow([2], [0]);
        sideTag.show(true);
        st.points = []; st.graphKey = '';
        const startSide = i === 0 ? 2 : 1;
        single().side = startSide;
        setSingle(1, startSide);
        st.slider = ui.slider({ label: 'Cube side', min: 1, max: 5, step: 1, value: startSide, unit: ' cm', onInput: v => { st.plan = []; setSingle(st.mat, v); } });
        const demo = (m, s) => { setSingle(m, s); st.slider?.set(s); };
        if (i === 0) {
          view({ radius: 0.8, yaw: 0.45, pitch: 0.32, target: [0, 0.36, 0] });
          st.plan = [[1.0, () => demo(1, 3)], [2.0, () => demo(1, 4)]];
        } else {
          view({ radius: 1.2, width: 1.75, yaw: 0.15, pitch: 0.2, target: [1.15, 0.85, 0] });
          graph.visible = graphPost.visible = true;
          const btns = ui.buttons([{ label: 'Aluminium', on: true, onClick: () => { st.plan = []; setSingle(1, +st.slider.value); } },
            { label: 'Iron', onClick: () => { st.plan = []; setSingle(2, +st.slider.value); } }]);
          st.plan = [0.3, 0.6, 0.9, 1.2].map((t, j) => [t, () => demo(1, j + 2)]);
          st.plan.push([1.7, () => { btns.select(1); demo(2, 1); }]);
          [2.0, 2.3, 2.6, 2.9].forEach((t, j) => st.plan.push([t, () => demo(2, j + 2)]));
        }
      }
      if (i === 2) {
        view({ radius: 1.15, width: 1.65, yaw: 0, pitch: 0.56, target: [0, 0.3, 0.1] });
        showRow([0, 1, 2, 3, 4], GRID_X, GRID_Z);
        row.forEach(r => { r.cube.material = cubeMats[r.key]; r.side = r.sideTo = 4; r.sc.set(`${fmt(64 * r.rho, 1)} g`); r.tag.show(true); });
        const btns = ui.buttons(row.map((r, j) => ({ label: r.name, onClick: () => { st.plan = []; pickRow(j); } })));
        ui.readout('Each cube: V = 4 × 4 × 4 = <b>64 cm³</b>. Tap a material.');
        st.plan = [[1.2, () => { btns.select(4); pickRow(4); }]];
      }
      if (i === 3) {
        view({ radius: 1.0, width: 2.3, yaw: -0.15, pitch: 0.3, target: [0, 0.48, 0] });
        showRow(SAME, SAME_X);
        SAME.forEach(j => { row[j].cube.material = cubeMats[row[j].key]; row[j].tag.show(true); });
        setMass(200);
        SAME.forEach(j => { row[j].side = row[j].sideTo; });
        st.slider = ui.slider({ label: 'Mass of each block', min: 100, max: 500, step: 50, value: 200, unit: ' g', onInput: v => { st.plan = []; setMass(v); } });
        st.plan = [[0.8, () => { setMass(350); st.slider?.set(350); }], [1.8, () => { setMass(500); st.slider?.set(500); }]];
      }
      if (i === 4) {
        view({ radius: 1.35, yaw: 0.25, pitch: 0.22, target: [3.95, 1.15, 0] });
        bench(true, false);
        left.set('52.0 g');
        st.auto = true;
        st.slider = ui.slider({ label: 'Lower the stone', min: 0, max: 100, step: 1, value: 0, unit: '%', onInput: v => { st.auto = false; stone.uTo = v / 100; } });
      }
      if (i === 5) {
        view({ radius: 1.75, width: 1.75, yaw: 0, pitch: 0.2, target: [4.5, 1.45, 0] });
        bench(false, true);
        left.set('965.0 g'); right.set('965.0 g');
        const btns = ui.buttons([{ label: 'Test bar A', onClick: () => { st.plan = []; testBar(0); } }, { label: 'Test bar B', onClick: () => { st.plan = []; testBar(1); } }]);
        st.plan = [[0.3, () => { btns.select(0); testBar(0); }], [6.5, () => { btns.select(1); testBar(1); }]];
      }
      if (i === 6) {
        view({ radius: 1.55, yaw: 0.2, pitch: 0.2, target: [COL_X + 0.1, 1.3, 0] });
        layerTags.forEach(t => t.show(true));
        ui.buttons([...col.map(o => ({ label: o.name, onClick: () => { st.plan = []; dropObj(o); } })),
          { label: 'Take them out', onClick: () => { st.plan = []; resetColumn(); } }]);
        ui.readout('Honey <b>1400</b> · water <b>1000</b> · oil <b>920</b> kg/m³ (about)');
        st.plan = col.map((o, j) => [0.2 + j * 0.2, () => dropObj(o)]);
      }
      if (isQuiz) {
        view({ radius: 2.0, width: 5.6, yaw: 0.1, pitch: 0.3, target: [0.75, 0.9, 0] });
        showRow([0, 1, 2, 3, 4], ROW_X);
        row.forEach(r => { r.cube.material = cubeMats[r.key]; r.side = r.sideTo = 4; r.sc.set(`${fmt(64 * r.rho, 1)} g`); });
        bench(false, true);
        levelTag.show(false);
        left.set('965.0 g'); right.set('965.0 g');
        col.forEach(o => { o.held = false; o.y = o.eq; });
      }
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      let busy = st.plan.length > 0;

      // Cubes grow or shrink smoothly to their new size.
      for (const r of row) {
        if (!r.sc.visible) continue;
        if (kit.follow(r, 'side', r.sideTo, dt, 7)) busy = true;
        r.cube.scale.setScalar(r.side * CM);
        r.anchor.position.set(0, r.sc.top + r.side * CM + 0.06 + 0, r.sc.panZ);
      }
      if (st.step <= 1) {
        const r = single();
        sideTag.at.position.set(0, r.sc.top + r.side * CM + 0.07, r.sc.panZ);
        if (st.step === 1) drawPlot();
      }

      // Displacement bench.
      if (cyl.visible) {
        if (st.step === 4 && st.auto) {
          const want = kit.clamp((st.time - 0.4) / 2.2, 0, 1);
          stone.uTo = want;
          const pct = Math.round(want * 100);
          if (st.slider && +st.slider.value !== pct) st.slider.set(pct);
          if (want < 1) busy = true;
        }
        for (const c of carried) {
          if (!c.g.visible) continue;
          // A bar waits beside the cylinder until the other bar is out of it.
          const other = c === barA ? barB : c === barB ? barA : null;
          const goal = other && other.u > 0.3 && c.uTo > c.u ? Math.min(c.uTo, 0.12) : c.uTo;
          const d = goal - c.u, speed = c.stone && !st.auto ? 0.9 : d < 0 ? 0.8 : 0.42;
          if (Math.abs(d) > 1e-4) { c.u += Math.sign(d) * Math.min(Math.abs(d), dt * speed); busy = true; } else c.u = goal;
          if (c.u !== c.uTo) busy = true;
          placeCarried(c);
        }
        const ml = waterLevel();
        cyl.setML(ml);
        levelAnchor.position.set(-CYL_R * CM - 0.3, cyl.levelY(ml) - 0.03, 0);
        levelTag.text = `${Math.round(ml)} mL`;
        left.set(st.step === 4 ? (stone.u > 0.01 ? '0.0 g' : '52.0 g') : (barA.u > 0.01 ? '0.0 g' : '965.0 g'));
        if (st.step === 5 || st.quiz) right.set(barB.u > 0.01 ? '0.0 g' : '965.0 g');
        [barA, barB].forEach((c, j) => { const on = st.step === 5 && c.g.visible && c.u < 0.3; if (barTags[j].visible !== on) barTags[j].show(on); });
        if (!st.quiz) benchReadout(ml);
      }

      // Density column: each object falls to its resting height (where the layers' push equals its weight),
      // quickly through air, more slowly through the liquids and slowest through thick honey.
      for (const o of col) o.g.visible = st.step >= 6;
      if (st.step >= 6) {
        for (const o of col) {
          if (o.held) o.y = HELD_Y + Math.sin(st.time * 2.4 + o.dx * 9) * 0.02;
          else {
            const d = o.eq - o.y, inHoney = o.y < FLOOR + LAYER, inLiquid = o.y < TOPL;
            const speed = Math.min(inHoney ? 1.1 : inLiquid ? 2 : 4.5, 6 * Math.abs(d) + 0.08);
            o.y = Math.abs(d) <= speed * dt ? o.eq : o.y + Math.sign(d) * speed * dt;
            if (o.y !== o.eq) busy = true;
            // Name tags appear once an object has come to rest, so moving tags do not pile up.
            const on = !st.quiz && o.y === o.eq;
            if (o.tag.visible !== on) o.tag.show(on);
          }
          o.g.position.set(COL_X + o.dx, o.y, o.dz);
          o.anchor.position.set(COL_X + COL_R + 0.42, o.y - 0.03, 0);
          if (o.held && st.step === 6) busy = true;
        }
      }
      return busy;
    },
  };
}
