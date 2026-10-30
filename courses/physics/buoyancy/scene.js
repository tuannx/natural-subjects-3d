// Buoyancy: an aluminium block on a newton meter is lowered into water (reading, buoyant force, a live graph),
// pressure arrows on its top and bottom, an overflow can whose spilled water is weighed on a scale (Archimedes'
// principle), fresh, sea and Dead Sea water, and a tank where a block of any density floats, sinks or hovers
// and a steel block or steel boat with cargo. World units: 1 unit = 10 cm.
import { panel, drawGraph, makeArrow, makeCoil, rulerTexture, RULER_PAD, fmt } from '../_shared/lab.js';
import { liquidMat, liquidColumn, liquidBox, glassBox, glassTube, digitalScale } from '../_shared/fluids.js';

const G = 9.8;
const BLOCK = { w: 5, d: 4, rho: 2700 };           // cm, cm, kg/m³ (aluminium); height comes from the volume
const FLOOR = 0.03, WATER0 = 3.4;                   // beaker floor and starting water depth (units)
const BEAKER_R = 1.0, AREA = Math.PI * 100;         // inner radius 10 cm → area in cm²
const NM_PER_N = 0.25, NM_MAX = 6;                  // newton meter scale: 2.5 cm per newton, 0–6 N
const ARM0 = 8.6, TRAVEL = 20;                      // highest arm height (units), slider travel (cm)
const LIQUIDS = [
  { name: 'Fresh water', rho: 1000, color: 0x3b9be0 },
  { name: 'Sea water', rho: 1030, color: 0x2a9d8f },
  { name: 'Dead Sea water', rho: 1240, color: 0x7cc4a8 },
];
// Tank (steps 6–7): 60 × 30 cm, water 30 cm deep.
const T_FLOOR = 0.06, T_WS = T_FLOOR + 3;
const EXAMPLES = [{ name: 'Wood', rho: 700 }, { name: 'Ice', rho: 920 }, { name: 'Aluminium', rho: 2700 }];
// Steel boat: 30 × 20 × 10 cm outside, 3.9 kg of steel (500 cm³). It can push aside up to 6000 cm³ (6 kg) of water.
const BOAT = { l: 3, w: 2, h: 1, steel: 3.9, wall: 0.06 };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xd8e2ea, sky: 0xe4f1fb, radius: 40 });
  const sun = kit.lights(scene, { sun: [5, 11, 7] });
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 10, bottom: -4 });
  sun.shadow.camera.updateProjectionMatrix();
  const steel = kit.mat(0x9aa3ad, { metalness: 0.45, roughness: 0.35 });

  // ======================= Lab stand, newton meter and block =======================
  const labG = new THREE.Group();
  scene.add(labG);
  kit.mesh(new THREE.BoxGeometry(2.4, 0.12, 1.6), kit.mat(0x3d4a56), [-1.4, 0.06, -0.6], labG);
  kit.mesh(new THREE.CylinderGeometry(0.07, 0.07, 9.4, 12), steel, [-2.2, 4.7, -0.9], labG);
  const arm = new THREE.Group();            // moves down the rod with the slider
  labG.add(arm);
  kit.mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), kit.mat(0x2b2d42), [-2.2, 0.15, -0.9], arm);
  const armBar = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 10), steel, [-1.1, 0.15, -0.9], arm);
  armBar.rotation.z = Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), steel, [0, 0.15, -0.45], arm).rotation.x = Math.PI / 2;
  // Newton meter: top cap at arm height, pointer zero 0.35 below it.
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.25, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  tube.position.y = -1.2; tube.renderOrder = 2;
  arm.add(tube);
  kit.mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 20), kit.mat(0xe85d04), [0, 0, 0], arm);
  kit.mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 20), kit.mat(0xe85d04), [0, -2.42, 0], arm);
  const scaleLen = NM_MAX * NM_PER_N, sH = scaleLen / (1 - 2 * RULER_PAD), sW = sH * 96 / 512;
  kit.mesh(new THREE.PlaneGeometry(sW, sH), new THREE.MeshStandardMaterial({ map: rulerTexture(THREE, { max: NM_MAX, minor: 0.2, major: 1, vertical: true, color: '#ffffff' }), roughness: 0.8 }),
    [0.25 + sW / 2, -0.35 + sH * RULER_PAD - sH / 2, 0.02], arm).castShadow = false;
  const coil = makeCoil(THREE, kit.mat(0xb8c4cf, { metalness: 0.7, roughness: 0.3 }), { turns: 12, radius: 0.13, wire: 0.02 });
  coil.position.y = -0.07;
  arm.add(coil);
  const mover = new THREE.Group();          // pointer, rod and hook: moves with the spring
  arm.add(mover);
  kit.mesh(new THREE.BoxGeometry(0.56, 0.035, 0.05), new THREE.MeshBasicMaterial({ color: 0xe63946 }), [0.28, 0, 0.12], mover).castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 8), steel, [0, -0.95, 0], mover);
  const hook = kit.mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 14, Math.PI * 1.5), steel, [0, -1.98, 0], mover);
  hook.rotation.z = Math.PI * 0.75;
  kit.mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), kit.mat(0xeeeeee), [0, -2.13, 0], mover);
  const blockMat = kit.mat(0xd3d9e0, { metalness: 0.25, roughness: 0.35 });
  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  blockGeo.translate(0, -0.5, 0);            // hangs from its top
  const block = kit.mesh(blockGeo, blockMat, [0, -2.3, 0], mover);
  const nmTag = label('N', new THREE.Object3D());
  mover.add(nmTag.at); nmTag.at.position.set(0.95, -0.05, 0.1);   // shows the reading next to the pointer

  // Beaker of water under the block.
  const beaker = glassTube(THREE, kit, BEAKER_R, 4.3, { thick: FLOOR });
  labG.add(beaker);
  const liquid = liquidMat(THREE, LIQUIDS[0].color, 0.38);
  const beakerWater = liquidColumn(THREE, liquid, BEAKER_R * 0.97);
  beakerWater.position.y = FLOOR;
  labG.add(beakerWater);

  // Overflow can, spout, catch beaker and scale (step 4).
  const canG = new THREE.Group();
  labG.add(canG);
  const canWall = new THREE.Mesh(new THREE.CylinderGeometry(BEAKER_R + 0.03, BEAKER_R + 0.03, 3.9, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.22, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  canWall.position.y = 1.95; canWall.renderOrder = 2;
  canG.add(canWall);
  kit.mesh(new THREE.TorusGeometry(BEAKER_R + 0.03, 0.025, 4, 32), kit.mat(0x7fb2cc), [0, 3.9, 0], canG).rotation.x = Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(BEAKER_R + 0.03, BEAKER_R + 0.03, 0.04, 32), kit.mat(0x9cc3d4), [0, 0.02, 0], canG);
  const SPOUT = FLOOR + WATER0;                          // water surface when the can is full
  const spout = kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 10), kit.mat(0xdff3ff, { transparent: true, opacity: 0.5 }), [BEAKER_R + 0.38, SPOUT - 0.15, 0], canG);
  spout.rotation.z = Math.PI / 2 + 0.35;
  const CATCH_X = 2.6, CATCH_R = 0.6, CATCH_AREA = Math.PI * 36;
  const catchScale = digitalScale(THREE, kit, { w: 1.6, d: 1.4 });
  catchScale.position.set(CATCH_X, 0, 0.1);
  canG.add(catchScale);
  const catchBeaker = glassTube(THREE, kit, CATCH_R, 1.4, { thick: 0.03 });
  catchBeaker.position.set(CATCH_X, catchScale.top, 0);
  canG.add(catchBeaker);
  const catchWater = liquidColumn(THREE, liquidMat(THREE, 0x3b9be0, 0.45), CATCH_R * 0.96);
  catchWater.position.set(CATCH_X, catchScale.top + 0.03, 0);
  canG.add(catchWater);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), liquidMat(THREE, 0x3b9be0, 0.6));
  canG.add(stream);
  const streamTop = new THREE.Vector3(BEAKER_R + 0.78, SPOUT - 0.33, 0);
  stream.position.set(streamTop.x, (streamTop.y + catchScale.top + 0.1) / 2, 0);
  stream.scale.y = streamTop.y - catchScale.top - 0.1;
  const catchTag = label('Water pushed out', new THREE.Vector3(CATCH_X, catchScale.top + 1.45, 0), { cls: 'cool' });

  // Graph (step 2) and pressure arrows (step 3).
  const graph = panel(THREE, 4.0, 3.0, { px: 512 });
  graph.position.set(3.6, 4.4, -0.3);
  labG.add(graph);
  const graphPost = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.0, 8), kit.mat(0x5c6b77), [3.6, 1.45, -0.4], labG);
  const downArrow = makeArrow(THREE, 0xe63946, { radius: 0.045, head: 0.2 });
  const upArrow = makeArrow(THREE, 0x1d6fd8, { radius: 0.045, head: 0.2 });
  const sideL = makeArrow(THREE, 0x8d99ae, { radius: 0.035, head: 0.16 }), sideR = makeArrow(THREE, 0x8d99ae, { radius: 0.035, head: 0.16 });
  labG.add(downArrow, upArrow, sideL, sideR);
  const downTag = label('', downArrow.tip, { cls: 'warm' });
  const upTag = label('', upArrow.tip, { cls: 'cool' });

  // ======================= Tank: float or sink, steel boat =======================
  const tankG = new THREE.Group();
  scene.add(tankG);
  const tank = glassBox(THREE, kit, 6, 4.2, 3);
  tankG.add(tank);
  const tankWater = liquidBox(THREE, liquidMat(THREE, 0x3b9be0, 0.36), 5.94, 2.94);
  tankWater.position.y = T_FLOOR; tankWater.setLevel(3);
  tankG.add(tankWater);
  const cubeMat = kit.mat(0xd9a066, { roughness: 0.6 });
  const cube = kit.mesh(new THREE.BoxGeometry(1, 1, 1), cubeMat, [0, 0, 0], tankG);
  const wArrow = makeArrow(THREE, 0xe63946, { radius: 0.05, head: 0.22 }), bArrow = makeArrow(THREE, 0x1d6fd8, { radius: 0.05, head: 0.22 });
  tankG.add(wArrow, bArrow);
  const wTag = label('Weight P', wArrow.tip, { cls: 'warm' });
  const bTag = label('Buoyant force Fₐ', bArrow.tip, { cls: 'cool' });
  const cLight = new THREE.Color(0xd9a066), cHeavy = new THREE.Color(0x8d99ae);
  // Steel block and boat.
  const steelDark = kit.mat(0x7d8792, { metalness: 0.4, roughness: 0.45 });
  const steelBlock = kit.mesh(new THREE.BoxGeometry(1, 0.5, 1), steelDark, [0, 0, 0], tankG);
  const boat = new THREE.Group();
  tankG.add(boat);
  const { l, w, h, wall } = BOAT;
  for (const [sx, sy, sz, px, py, pz] of [[l, wall, w, 0, wall / 2, 0], [wall, h, w, -(l - wall) / 2, h / 2, 0], [wall, h, w, (l - wall) / 2, h / 2, 0],
    [l - 2 * wall, h, wall, 0, h / 2, -(w - wall) / 2], [l - 2 * wall, h, wall, 0, h / 2, (w - wall) / 2]]) kit.mesh(new THREE.BoxGeometry(sx, sy, sz), steelDark, [px, py, pz], boat);
  // Red paint on the outside of the lower hull.
  const red = kit.mat(0xd62839);
  for (const [sx, sz, px, pz] of [[l + 0.02, 0.01, 0, w / 2 + 0.005], [l + 0.02, 0.01, 0, -w / 2 - 0.005], [0.01, w, l / 2 + 0.005, 0], [0.01, w, -l / 2 - 0.005, 0]]) kit.mesh(new THREE.BoxGeometry(sx, 0.4, sz), red, [px, 0.2, pz], boat);
  const crates = [];
  for (let i = 0; i < 5; i++) {
    const c = kit.mesh(new THREE.BoxGeometry(0.5, 0.36, 0.5), kit.mat(0xc98f55), [-1.0 + (i % 3) * 0.95, wall + 0.18 + Math.floor(i / 3) * 0.37, i < 3 ? -0.35 : 0.35], boat);
    c.visible = false;
    crates.push(c);
  }
  const floodWater = liquidBox(THREE, liquidMat(THREE, 0x3b9be0, 0.4), l - 2 * wall - 0.01, w - 2 * wall - 0.01);
  floodWater.position.y = wall;
  boat.add(floodWater);
  // Invisible lid at the water line inside the hull, so the tank's water surface does not show inside the boat.
  const mask = new THREE.Mesh(new THREE.PlaneGeometry(l - 2 * wall, w - 2 * wall), new THREE.MeshBasicMaterial({ colorWrite: false }));
  mask.rotation.x = -Math.PI / 2; mask.renderOrder = 5;
  tankG.add(mask);

  // ======================= State =======================
  const st = {
    step: 0, quiz: false, time: 0, plan: [], auto: false, slider: null, msg: '',
    lower: 0, lowerTo: 0, R: 0, armY: ARM0, vol: 200, liq: 0, topDepth: 0.05,
    can: 0, caught: 0, flow: 0, points: [], graphKey: '',
    rho: 700, cy: 0, cv: 0, ship: 1, cargo: 0, boatY: 0, sblockY: 0,
  };
  const L = () => LIQUIDS[st.liq];
  const blockH = () => st.vol / (BLOCK.w * BLOCK.d) / 10;                 // block height in units
  const weightN = () => BLOCK.rho * st.vol * 1e-6 * G;
  const dSpec = () => L().rho * G;                                           // N/m³

  function setVolume(v) {
    st.vol = v;
    block.scale.set(BLOCK.w / 10, blockH(), BLOCK.d / 10);
  }
  function setLiquid(i) {
    st.liq = i;
    liquid.color.setHex(LIQUIDS[i].color);
  }
  // Block bottom height for an arm height and reading (hook 1.95 below the pointer, 0.35 of string).
  const blockTop = (armY, R) => armY - 0.35 - R * NM_PER_N - 2.3;
  // Solve the water level, the part under water and the meter reading together (a few rounds converge).
  function solve() {
    const W = weightN(), hb = blockH(), A = AREA;
    let R = st.R || W, level = 0, sub = 0;
    const can = canG.visible;
    for (let it = 0; it < 6; it++) {
      const top = blockTop(st.armY, R), bot = top - hb;
      const base = can ? st.can : WATER0 * 10 * A;          // cm³ of water in the container (excluding the block)
      // Level (cm above the floor) with the block part under it: try levels until they agree.
      let lv = base / A;
      for (let k = 0; k < 4; k++) {
        const depth = kit.clamp((FLOOR + lv / 10 - bot) * 10, 0, hb * 10);   // cm of block under water
        sub = depth * BLOCK.w * BLOCK.d;
        lv = (base + sub) / A;
        if (can) lv = Math.min(lv, WATER0 * 10);
      }
      level = lv;
      R = W - dSpec() * sub * 1e-6;
    }
    return { R, level, sub };
  }

  function readout(R, sub) {
    const W = weightN(), F = W - R;
    let msg;
    if (st.step === 0 || st.step === 1) msg = `Weight in air <b>${fmt(W, 2)} N</b> · reading now <b>${fmt(R, 2)} N</b><br>Fₐ = ${fmt(W, 2)} − ${fmt(R, 2)} = <b>${fmt(F, 2)} N</b>` + (st.step === 1 ? ` · ${Math.round(sub)} cm³ under water` : '');
    else if (st.step === 2) {
      const ft = dSpec() * st.topDepth * 0.002, fb = dSpec() * (st.topDepth + 0.1) * 0.002;
      msg = `Top at <b>${fmt(st.topDepth, 2)} m</b>: push down = 9800 × ${fmt(st.topDepth, 2)} × 0.002 = <b>${fmt(ft, 2)} N</b><br>Bottom at ${fmt(st.topDepth + 0.1, 2)} m: push up = <b>${fmt(fb, 2)} N</b> · difference <b>${fmt(fb - ft, 2)} N</b>`;
    } else if (st.step === 3) msg = `Fₐ = ${fmt(W, 2)} − ${fmt(R, 2)} = <b>${fmt(F, 2)} N</b><br>Water pushed out: <b>${Math.round(st.caught)} cm³</b>, weight <b>${fmt(st.caught * 1e-6 * 9800, 2)} N</b>`;
    else if (st.step === 4) msg = `${L().name}: d = ${L().rho} × 9.8 ≈ <b>${Math.round(dSpec()).toLocaleString('en-US')} N/m³</b><br>Fₐ = d · V = ${Math.round(dSpec()).toLocaleString('en-US')} × ${fmt(st.vol * 1e-6, 4)} m³ = <b>${fmt(dSpec() * st.vol * 1e-6, 2)} N</b>`;
    else return;
    if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
  }

  function drawPlot() {
    const key = st.points.length;
    if (key === st.graphKey) return;
    st.graphKey = key;
    graph.draw((c, W, H) => drawGraph(c, W, H, {
      xMax: 20, yMax: 2.5, xStep: 5, yStep: 0.5, xLabel: 'How far lowered (cm)', yLabel: 'Fₐ (N)', title: 'Buoyant force',
      fmtY: v => v.toFixed(1),
      series: [{ color: '#1d6fd8', pts: st.points.slice(), width: 5 }],
    }));
  }

  // Overflow can: full to the spout, nothing caught.
  function refill() { st.can = WATER0 * 10 * AREA; st.caught = 0; st.flow = 0; }

  // ---- tank ----
  function dropCube(rho) {
    st.rho = rho;
    st.cy = T_FLOOR + 1.6; st.cv = 0;   // start in the middle of the water each time
    cubeMat.color.lerpColors(cLight, cHeavy, kit.clamp((rho - 200) / 2800, 0, 1));
    tankReadout();
  }
  const cubeSub = () => kit.clamp(T_WS - (st.cy - 0.5), 0, 1);
  function tankReadout() {
    const P = st.rho * 0.001 * G, Fmax = 1000 * 0.001 * G;
    const res = st.rho < 1000 ? `floats, with ${Math.round(st.rho / 10)}% under water` : st.rho > 1000 ? 'sinks' : 'hovers';
    ui.readout(`Block 1000 cm³, density <b>${st.rho} kg/m³</b><br>P = <b>${fmt(P, 1)} N</b> · biggest Fₐ = 9800 × 0.001 = <b>9.8 N</b><br>${P < Fmax ? 'Fₐ > P' : P > Fmax ? 'Fₐ < P' : 'Fₐ = P'}: it <b>${res}</b>`);
  }
  function setShip(i) {
    st.ship = i;
    steelBlock.visible = i === 0;
    boat.visible = i === 1;
    shipReadout();
  }
  function setCargo(kg) {
    st.cargo = kg;
    crates.forEach((c, j) => { c.visible = j < Math.ceil(kg / 0.5 - 1e-6); });
    shipReadout();
  }
  const flooded = () => BOAT.steel + st.cargo > 6.0001;
  function shipReadout() {
    if (st.ship === 0) { ui.readout('Steel block: <b>3.9 kg</b>, 500 cm³<br>Biggest Fₐ = 9800 × 0.0005 = <b>4.9 N</b> < P = <b>38.2 N</b>: it sinks'); return; }
    const m = BOAT.steel + st.cargo, P = m * G;
    if (flooded()) ui.readout(`Boat + cargo: <b>${fmt(m, 1)} kg</b>, P = ${fmt(P, 1)} N<br>Even fully under, the hull pushes aside only 6000 cm³: Fₐ = 58.8 N < P. <b>It floods and sinks!</b>`);
    else ui.readout(`Boat + cargo: <b>${fmt(m, 1)} kg</b>, P = <b>${fmt(P, 1)} N</b><br>Floats with <b>${fmt(m * 1000 / 600, 1)} cm</b> under water, pushing aside ${Math.round(m * 1000)} cm³: Fₐ = P`);
  }

  function hideAll() {
    labG.visible = tankG.visible = false;
    graph.visible = graphPost.visible = false;
    canG.visible = false; beaker.visible = beakerWater.visible = true;
    for (const a of [downArrow, upArrow, sideL, sideR]) a.visible = false;
    for (const t of [downTag, upTag, wTag, bTag, catchTag, nmTag]) t.show(false);
    wArrow.visible = bArrow.visible = false;
  }
  const lowerSlider = () => {
    st.slider = ui.slider({ label: 'Lower the block', min: 0, max: TRAVEL, step: 0.5, value: 0, unit: ' cm', format: v => fmt(v, 1), onInput: v => { st.auto = false; st.plan = []; st.lowerTo = v; } });
  };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? 7 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.auto = false; st.slider = null; st.msg = '';
      hideAll();
      setVolume(200); setLiquid(0);
      st.lower = st.lowerTo = 0; st.R = 0; st.points = []; st.graphKey = -1;
      if (i <= 4 || isQuiz) {
        labG.visible = true;
        nmTag.show(!isQuiz);
      }
      if (i === 0) {
        view({ radius: 4.6, yaw: 0.35, pitch: 0.12, target: [-0.2, 4.6, 0] });
        lowerSlider(); st.auto = true;
      }
      if (i === 1) {
        view({ radius: 4.6, width: 4.3, yaw: 0.05, pitch: 0.1, target: [1.3, 4.6, 0] });
        graph.visible = graphPost.visible = true;
        lowerSlider(); st.auto = true;
        ui.buttons([{ label: 'Clear the graph', onClick: () => { st.points = []; } }]);
      }
      if (i === 2) {
        view({ radius: 3.0, yaw: 0.3, pitch: 0.1, target: [0, 3.0, 0] });
        for (const a of [downArrow, upArrow, sideL, sideR]) a.visible = true;
        downTag.show(true); upTag.show(true);
        st.topDepth = 0.05;
        const sl = ui.slider({ label: 'Depth of the top', min: 0.02, max: 0.2, step: 0.01, value: 0.05, unit: ' m', format: v => fmt(v, 2), onInput: v => { st.plan = []; st.topDepth = v; } });
        st.plan = [[1.0, () => { st.topDepth = 0.12; sl.set(0.12); }], [2.0, () => { st.topDepth = 0.18; sl.set(0.18); }]];
      }
      if (i === 3) {
        view({ radius: 4.4, width: 3.4, yaw: 0.1, pitch: 0.12, target: [0.8, 4.4, 0] });
        canG.visible = true; beaker.visible = false;
        catchTag.show(true);
        refill();
        lowerSlider(); st.auto = true;
        ui.buttons([{ label: 'Refill the can', onClick: () => { st.auto = false; st.plan = []; st.lower = st.lowerTo = 0; st.slider?.set(0); refill(); } }]);
      }
      if (i === 4) {
        view({ radius: 3.6, yaw: 0.3, pitch: 0.1, target: [0, 3.4, 0] });
        const row = ui.buttons(LIQUIDS.map((q, j) => ({ label: q.name, on: j === 0, onClick: () => { st.plan = []; setLiquid(j); } })));
        const sl = ui.slider({ label: 'Block volume', min: 100, max: 300, step: 50, value: 200, unit: ' cm³', onInput: v => { st.plan = []; setVolume(v); } });
        st.plan = [[1.0, () => { setLiquid(1); row.select(1); }], [2.0, () => { setLiquid(2); row.select(2); }], [4.0, () => { setVolume(300); sl.set(300); }]];
      }
      if (i === 5 || i === 6) {
        tankG.visible = true;
        view({ radius: 3.4, width: 3.2, yaw: 0.25, pitch: 0.28, target: [0, 1.9, 0] });
      }
      if (i === 5) {
        cube.visible = true; steelBlock.visible = boat.visible = false; mask.visible = false;
        wArrow.visible = bArrow.visible = true; wTag.show(true); bTag.show(true);
        dropCube(700);
        const row = ui.buttons(EXAMPLES.map(e => ({ label: e.name, on: e.rho === 700, onClick: () => { st.plan = []; dropCube(e.rho); st.slider?.set(e.rho); } })));
        st.slider = ui.slider({ label: 'Density of the block', min: 200, max: 3000, step: 50, value: 700, unit: ' kg/m³', onInput: v => { st.plan = []; dropCube(v); } });
        st.plan = [[3.5, () => { dropCube(920); row.select(1); st.slider?.set(920); }], [7.0, () => { dropCube(2700); row.select(2); st.slider?.set(2700); }], [10.5, () => { dropCube(1000); row.select(-1); st.slider?.set(1000); }]];
      }
      if (i === 6) {
        cube.visible = false;
        st.cargo = 0; st.sblockY = T_WS + 0.6; st.boatY = T_WS + 0.4;
        const row = ui.buttons([{ label: 'Steel block', onClick: () => { st.plan = []; setShip(0); } }, { label: 'Steel boat', on: true, onClick: () => { st.plan = []; setShip(1); } }]);
        const sl = ui.slider({ label: 'Cargo', min: 0, max: 2.5, step: 0.1, value: 0, unit: ' kg', format: v => fmt(v, 1), onInput: v => { st.plan = []; setCargo(v); } });
        setCargo(0); setShip(0);
        row.select(0);
        st.plan = [[1.6, () => { setShip(1); row.select(1); }], [4.0, () => { setCargo(1.5); sl.set(1.5); }]];
      }
      if (isQuiz) {
        view({ radius: 4.6, yaw: -0.3, pitch: 0.16, target: [-0.2, 4.4, 0] });
        st.lower = st.lowerTo = TRAVEL * 0.9;
      }
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      let busy = st.plan.length > 0;

      if (labG.visible) {
        // Arm height: from the slider (with a scripted demo first), or from the wanted depth of the top in step 3.
        if (st.auto) {
          const want = kit.clamp((st.time - 0.3) / 2.4, 0, 1) * TRAVEL;
          st.lowerTo = Math.round(want * 2) / 2;
          if (st.slider && +st.slider.value !== st.lowerTo) st.slider.set(st.lowerTo);
          if (want < TRAVEL) busy = true;
        }
        busy = kit.follow(st, 'lower', st.lowerTo, dt, 5) || busy;
        if (st.step === 2 || st.step === 4) {
          const R = weightN() - dSpec() * st.vol * 1e-6;
          const surface = FLOOR + WATER0 + st.vol / AREA / 10;     // water level with the block fully under
          const top = surface - (st.step === 2 ? st.topDepth * 10 : 0.3);
          busy = kit.follow(st, 'armY', top + 2.65 + R * NM_PER_N, dt, 5) || busy;
        } else st.armY = ARM0 - st.lower / 10;
        arm.position.y = st.armY;
        const { R, level, sub } = solve();
        if (Math.abs(R - st.R) > 1e-4) busy = true;
        st.R = R;
        // Overflow: water above the spout runs out into the catch beaker.
        if (canG.visible) {
          const over = st.can + sub - WATER0 * 10 * AREA;
          if (over > 0.01) { st.can -= over; st.caught += over; st.flow = 0.25; }
          st.flow = Math.max(0, st.flow - dt);
          stream.visible = st.flow > 0;
          catchWater.setLevel(st.caught / CATCH_AREA / 10);
          catchScale.set(`${fmt(st.caught * 1e-6 * 9800, 2)} N`);
          catchTag.text = `Pushed out: ${fmt(st.caught * 1e-6 * 9800, 2)} N`;
          if (stream.visible) busy = true;
        }
        beakerWater.setLevel(level / 10);
        const ext = R * NM_PER_N;
        mover.position.y = -0.35 - ext;
        nmTag.text = `${fmt(R, 2)} N`;
        coil.setLength(0.28 + ext);
        if (st.step === 1) {
          const x = st.lower, last = st.points[st.points.length - 1];
          if (!last || Math.abs(last[0] - x) > 0.2) { st.points.push([x, weightN() - R]); if (x < (last ? last[0] : 0)) st.points = [[x, weightN() - R]]; }
          drawPlot();
        }
        if (st.step === 2) {
          const top = blockTop(st.armY, R), bot = top - blockH(), s = 0.3;
          const ft = dSpec() * st.topDepth * 0.002, fb = dSpec() * (st.topDepth + 0.1) * 0.002;
          downArrow.point(-0.12, top + ft * s, 0.32, 0, -1, 0, ft * s, -0.55);
          upArrow.point(0.12, bot, 0.32, 0, 1, 0, fb * s, 0.6);
          const side = (ft + fb) / 2 * s * 0.6;
          sideL.point(-0.27 - side, (top + bot) / 2, 0, 1, 0, 0, side, 0);
          sideR.point(0.27 + side, (top + bot) / 2, 0, -1, 0, 0, side, 0);
          downTag.text = `Push down ${fmt(ft, 2)} N`;
          upTag.text = `Push up ${fmt(fb, 2)} N`;
        }
        if (!st.quiz) readout(R, sub);
      }

      if (tankG.visible) {
        if (st.step === 5) {
          const n = Math.ceil(dt / (1 / 120)), hh = dt / Math.max(1, n);
          for (let s = 0; s < n; s++) {
            const a = 6 * (cubeSub() * 1000 / st.rho - 1) - 3.5 * st.cv;
            st.cv += a * hh; st.cy += st.cv * hh;
            if (st.cy - 0.5 < T_FLOOR) { st.cy = T_FLOOR + 0.5; st.cv = 0; }
          }
          if (Math.abs(st.cv) > 1e-3) busy = true;
          cube.position.set(0, st.cy, 0);
          const P = st.rho * 0.001 * G, F = cubeSub() * 9.8, s = 0.09;
          // Weight drawn ending at the block's middle and the push starting there, so both stay above the floor.
          wArrow.point(0.75, st.cy + P * s, 0.3, 0, -1, 0, P * s, 0.75);
          bArrow.point(-0.75, st.cy, 0.3, 0, 1, 0, Math.max(0.05, F * s), -1.05);
        }
        if (st.step === 6) {
          const sbWant = T_FLOOR + 0.25;
          busy = kit.follow(st, 'sblockY', sbWant, dt, 2.5) || busy;
          steelBlock.position.set(0, st.sblockY, 0);
          const m = BOAT.steel + st.cargo;
          const want = flooded() ? T_FLOOR : T_WS - (m * 1000 / 600) / 10;
          busy = kit.follow(st, 'boatY', want, dt, flooded() ? 1.2 : 3) || busy;
          boat.position.set(0, st.boatY, 0);
          floodWater.setLevel(flooded() ? Math.min(h - wall - 0.02, kit.clamp(T_WS - st.boatY - wall, 0, h)) : 0);
          floodWater.visible = flooded();
          mask.visible = boat.visible && !flooded() && st.boatY + wall < T_WS;
          mask.position.set(0, Math.min(T_WS + 0.004, st.boatY + h), 0);
        }
      }
      return busy;
    },
  };
}
