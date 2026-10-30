// From cells to organisms: a row of five pedestals shows the levels of organisation (heart muscle cell,
// heart muscle tissue, heart, circulatory system, person; or palisade cell, leaf tissue, leaf, shoot system,
// whole plant). Off to the left: an amoeba that feeds and divides, and four specialised cells.
import { plantCell, rand } from '../_shared/cells.js';
import { leafGeometry } from '../_shared/leaf.js';

const LX = [0, 3.2, 6.4, 9.8, 13.2];       // x of each level
const AMX = -4.6;                           // amoeba
const SPX = [-12.75, -11.25, -9.75, -8.25]; // specialised cells
const LEVELS = ['Cell', 'Tissue', 'Organ', 'Organ system', 'Organism'];
const ANIMAL_TXT = [
  'the basic unit of life. Here: <b>one heart muscle cell</b>.',
  'a group of <b>similar cells</b> doing one job. Here: <b>heart muscle tissue</b>, which contracts.',
  'several <b>different tissues</b> working together. Here: <b>the heart</b>, which pumps blood.',
  'a group of <b>organs</b> working together. Here: <b>the circulatory system</b> (heart, blood vessels, blood).',
  'a <b>whole living thing</b>, made of organ systems working together. Here: <b>a person</b>.',
];
const PLANT_TXT = [
  'the basic unit of life. Here: <b>one palisade cell</b> from a leaf, full of chloroplasts.',
  'a group of <b>similar cells</b> doing one job. Here: <b>palisade tissue</b> (green), between thin layers of epidermis.',
  'several <b>different tissues</b> working together. Here: <b>a leaf</b>, which makes food by photosynthesis.',
  'a group of <b>organs</b> working together. Here: <b>the shoot system</b>: stem, leaves and flower.',
  'a <b>whole living thing</b>: shoot system and root system together. Here: <b>a plant</b>.',
];
const FRAMES = [
  { r: 0.95, y: 1.0 }, { r: 1.1, y: 1.0 }, { r: 1.0, y: 1.05 }, { r: 1.4, y: 1.35 }, { r: 1.4, y: 1.35 },
];
const SPECIAL = [
  ['Muscle cell', 'long and thin, full of fibres that <b>contract</b> (get shorter) to move things.'],
  ['Nerve cell', 'long thin fibres carry <b>electrical messages</b> around the body.'],
  ['Red blood cell', 'a small dented disc with <b>no nucleus</b>, packed with haemoglobin to carry <b>oxygen</b>.'],
  ['Root hair cell', 'a long thin hair gives a big surface to take in <b>water and minerals</b> from soil. No chloroplasts: it lives underground.'],
];
const SYS = [
  ['Heart', 'a muscular <b>pump</b>. Each beat pushes blood out into the arteries.'],
  ['Arteries', 'carry blood <b>away from the heart</b> (drawn red: rich in oxygen).'],
  ['Veins', 'carry blood <b>back to the heart</b> (drawn blue: low in oxygen).'],
  ['Blood', 'carries <b>oxygen, food and wastes</b>. Capillaries pass them to and from every cell.'],
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xe3ecd9, sky: 0xe4f0fb, radius: 34 });
  kit.lights(scene, { sun: [4, 10, 8] });
  const DS = THREE.DoubleSide;
  const glowSet = []; // materials that pulse while selected: { mat, on }
  const glow = (m) => { const o = { mat: m, on: false }; glowSet.push(o); return o; };

  // ---------- Pedestals and arrows ----------
  const pedMat = kit.mat(0xf4f1e8), pedR = [0.9, 1.15, 1.05, 1.0, 1.0];
  LX.forEach((x, i) => kit.mesh(new THREE.CylinderGeometry(pedR[i], pedR[i] * 1.06, 0.12, 36), pedMat, [x, 0.06, 0], scene));
  const arrowMat = kit.mat(0x9fb3c8);
  for (let i = 0; i < 4; i++) {
    const a = kit.mesh(new THREE.ConeGeometry(0.16, 0.34, 3), arrowMat, [(LX[i] + LX[i + 1]) / 2 + 0.15, 0.03, 0.6], scene);
    a.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); a.scale.z = 0.25; a.castShadow = false;
    const s = kit.mesh(new THREE.BoxGeometry(0.5, 0.02, 0.08), arrowMat, [(LX[i] + LX[i + 1]) / 2 - 0.2, 0.02, 0.6], scene);
    s.castShadow = false;
  }
  kit.mesh(new THREE.CylinderGeometry(1.0, 1.06, 0.12, 36), pedMat, [AMX, 0.06, 0], scene);
  kit.mesh(new THREE.BoxGeometry(6.2, 0.12, 1.4), pedMat, [-10.5, 0.06, 0], scene);
  const levelTags = LEVELS.map((n, i) => label(n, new THREE.Vector3(LX[i], [1.75, 1.75, 1.85, 2.75, 2.75][i], 0), { cls: 'big' }));

  // ---------- Shared bits ----------
  const stripes = stripeTexture(THREE);
  const muscleMat = kit.mat(0xffffff, { map: stripes, roughness: 0.55 });
  const nucMat = kit.mat(0x7b4bb8, { roughness: 0.5 });
  const beat = (t, bpm) => Math.pow(Math.max(0, Math.sin(t * bpm / 60 * Math.PI * 2)), 3);

  // Heart muscle cell: a striped, branched fibre with one central nucleus.
  function muscleCell(len = 1.1, r = 0.15) {
    const g = new THREE.Group();
    const body = kit.mesh(new THREE.CylinderGeometry(r, r, len, 16, 1, false), muscleMat, [0, 0, 0], g);
    body.rotation.z = Math.PI / 2;
    for (const [x, a, l] of [[len / 2, 0.55, 0.42], [len / 2, -0.5, 0.36], [-len / 2, 0.45, 0.32], [-len / 2, -0.6, 0.3]]) {
      const b = kit.mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.85, l, 12), muscleMat, [0, 0, 0], g);
      const dir = Math.sign(x);
      b.position.set(x + dir * Math.cos(a) * l / 2 - dir * 0.04, Math.sin(a) * l / 2, 0);
      b.rotation.z = Math.PI / 2 + (dir > 0 ? a : -a);
    }
    for (const x of [len / 2, -len / 2]) kit.mesh(new THREE.SphereGeometry(r, 14, 10), muscleMat, [x, 0, 0], g);
    const n = kit.mesh(new THREE.SphereGeometry(r * 0.6, 14, 10), nucMat, [0, 0, r * 0.55], g);
    n.scale.set(1.6, 0.9, 0.7);
    return g;
  }

  // ---------- Level 1 (animal): one heart muscle cell ----------
  const L1 = new THREE.Group(); L1.position.set(LX[0], 1.0, 0); scene.add(L1);
  const cell1 = muscleCell(1.0, 0.16); L1.add(cell1);

  // ---------- Level 2 (animal): heart muscle tissue ----------
  const L2 = new THREE.Group(); L2.position.set(LX[1], 1.0, 0); scene.add(L2);
  const tissue = new THREE.Group(); L2.add(tissue);
  const tCellGeo = new THREE.CapsuleGeometry(0.085, 0.24, 3, 10), tNucGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const tCells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const g = new THREE.Group();
    g.position.set((c - 2) * 0.4 + (r % 2 ? 0.2 : 0) - 0.1, (r - 1.5) * 0.19, (rand(r * 5 + c) - 0.5) * 0.05);
    const m = kit.mesh(tCellGeo, muscleMat, [0, 0, 0], g); m.rotation.z = Math.PI / 2 + (rand(r * 9 + c) - 0.5) * 0.25;
    kit.mesh(tNucGeo, nucMat, [0, 0, 0.06], g).scale.set(1.5, 0.8, 0.8);
    tissue.add(g);
    tCells.push(g);
  }
  tCells.sort((a, b) => a.position.length() - b.position.length()); // join from the middle outwards

  // ---------- Level 3 (animal): the heart, and a piece of its wall ----------
  const L3 = new THREE.Group(); L3.position.set(LX[2], 1.05, 0); scene.add(L3);
  const heartMat = kit.mat(0xc23b32, { roughness: 0.55 });
  const heart = makeHeart(1, heartMat);
  L3.add(heart);
  // Wall sample: outer layer, thick muscle, inner lining (shown in step 5).
  const wall = new THREE.Group(); wall.position.set(1.15, 0.05, 0.1); L3.add(wall);
  wall.rotation.y = -0.35;
  const layerDefs = [['Outer layer', 0.06, kit.mat(0xf2c4b4)], ['Muscle tissue', 0.36, kit.mat(0xffffff, { map: stripes })], ['Inner lining', 0.05, kit.mat(0xf7ddd2)]];
  const layers = layerDefs.map(([, h, m]) => kit.mesh(new THREE.BoxGeometry(0.8, h, 0.55), m, [0, 0, 0], wall));
  const layerTags = layerDefs.map(([n], i) => label(n, new THREE.Object3D(), { cls: i === 1 ? 'warm' : '' }));
  layerTags.forEach((tg, i) => { layers[i].add(tg.at); tg.at.position.set(0.55, 0, 0.2); });
  const heartTag = label('Heart', new THREE.Vector3(LX[2] - 0.2, 1.75, 0));

  // ---------- Level 4 (animal): circulatory system inside a see-through body ----------
  const L4 = new THREE.Group(); L4.position.set(LX[3], 0.12, 0); scene.add(L4);
  const ghostMat = new THREE.MeshStandardMaterial({ color: 0x9ec9e8, transparent: true, opacity: 0.22, roughness: 0.4, depthWrite: false });
  const ghost = person(THREE, kit, { all: ghostMat });
  ghost.g.traverse(o => { if (o.isMesh) { o.renderOrder = 5; o.castShadow = false; } });
  L4.add(ghost.g);
  const H = new THREE.Vector3(0.05, 1.5, 0.12);
  const sysHeartMat = kit.mat(0xc23b32, { roughness: 0.5 });
  const sysHeart = makeHeart(0.24, sysHeartMat); sysHeart.position.copy(H); L4.add(sysHeart);
  const artMat = kit.mat(0xd62828, { roughness: 0.5 }), veinMat = kit.mat(0x3a6fd8, { roughness: 0.5 });
  const gHeart = glow(sysHeartMat), gArt = glow(artMat), gVein = glow(veinMat);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const routes = [
    [V(0, 1.75, 0.08), V(-0.02, 2.0, 0.06), V(0, 2.28, 0.02)],
    [V(-0.3, 1.78, 0.06), V(-0.47, 1.4, 0.06), V(-0.47, 1.0, 0.04)],
    [V(0.3, 1.78, 0.06), V(0.47, 1.4, 0.06), V(0.47, 1.0, 0.04)],
    [V(-0.05, 1.15, 0.1), V(-0.15, 0.85, 0.06), V(-0.16, 0.45, 0.05), V(-0.16, 0.12, 0.08)],
    [V(0.05, 1.15, 0.1), V(0.15, 0.85, 0.06), V(0.16, 0.45, 0.05), V(0.16, 0.12, 0.08)],
  ];
  const loops = routes.map(pts => {
    const out = new THREE.CatmullRomCurve3([H.clone(), ...pts.map(p => p.clone().add(V(-0.035, 0, 0.02)))]);
    const back = new THREE.CatmullRomCurve3([...pts.slice().reverse().map(p => p.clone().add(V(0.035, 0, -0.03))), H.clone().add(V(0.02, 0, -0.03))]);
    kit.mesh(new THREE.TubeGeometry(out, 32, 0.022, 6), artMat, [0, 0, 0], L4).castShadow = false;
    kit.mesh(new THREE.TubeGeometry(back, 32, 0.022, 6), veinMat, [0, 0, 0], L4).castShadow = false;
    return { out, back };
  });
  const DOTS = 8, blood = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), loops.length * DOTS);
  blood.frustumCulled = false;
  L4.add(blood);
  const red = new THREE.Color(0xff3b3b), blue = new THREE.Color(0x5b8cff);
  // Lungs (respiratory system), shown when the systems work together.
  const lungs = new THREE.Group(); L4.add(lungs);
  const lungMat = kit.mat(0xf29aa8, { roughness: 0.6 });
  const lungL = kit.mesh(new THREE.SphereGeometry(1, 18, 14), lungMat, [-0.17, 1.58, 0.0], lungs);
  const lungR = kit.mesh(new THREE.SphereGeometry(1, 18, 14), lungMat, [0.19, 1.58, 0.0], lungs);
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), kit.mat(0xe6c3c8), [0, 1.93, 0.0], lungs);
  const sysTags = SYS.map(([n], i) => label(n, i === 0 ? sysHeart : new THREE.Vector3(LX[3] + [0, -0.55, 0.58, 0.25][i], [0, 1.25, 1.25, 0.65][i], 0.1), { cls: i === 1 ? 'warm' : i === 2 ? 'cool' : '' }));
  const lungTag = label('Lungs', new THREE.Vector3(LX[3] - 0.55, 1.95, 0));

  // ---------- Level 5 (animal): a person ----------
  const L5 = new THREE.Group(); L5.position.set(LX[4], 0.12, 0); scene.add(L5);
  const runner = person(THREE, kit, { skin: kit.mat(0xe0ac85), shirt: kit.mat(0x2a9d8f), shorts: kit.mat(0x264653), hair: kit.mat(0x2b1d14) });
  L5.add(runner.g);

  // ---------- Plant levels ----------
  const P1 = new THREE.Group(); P1.position.set(LX[0], 1.0, 0); scene.add(P1);
  const pal = plantCell(THREE, kit, { W: 2.4, H: 1.5, D: 1.4 });
  pal.g.rotation.z = Math.PI / 2; pal.g.scale.setScalar(0.52); P1.add(pal.g);
  const P2 = new THREE.Group(); P2.position.set(LX[1], 1.0, 0); scene.add(P2);
  buildLeafSlice(P2);
  const P3 = new THREE.Group(); P3.position.set(LX[2], 0.12, 0); scene.add(P3);
  buildLeaf(P3);
  const P4 = new THREE.Group(); P4.position.set(LX[3], 0.12, 0); scene.add(P4);
  const shootOnly = buildPlant(P4, true);
  const P5 = new THREE.Group(); P5.position.set(LX[4], 0.12, 0); scene.add(P5);
  const wholePlant = buildPlant(P5, false);
  const animalSet = [L1, L2, L3, L4, L5], plantSet = [P1, P2, P3, P4, P5];

  // ---------- Amoeba ----------
  const amA = amoeba(), amB = amoeba();
  amA.g.position.set(AMX, 0.55, 0); amB.g.position.set(AMX, 0.55, 0);
  scene.add(amA.g, amB.g);
  const food = kit.mesh(new THREE.SphereGeometry(0.08, 12, 8), kit.mat(0x5cb85c), [0, 0, 0], scene);
  const amTag = label('Amoeba', new THREE.Vector3(AMX, 1.15, 0));
  const foodTag = label('Food', food, { cls: 'warm' });

  // ---------- Specialised cells ----------
  const specials = [muscleCell(0.9, 0.12), nerveCell(), redCell(), rootHairCell()].map((g, i) => {
    const holder = new THREE.Group(); holder.position.set(SPX[i], 0.75, 0); holder.add(g); scene.add(holder);
    return holder;
  });
  const specTags = SPECIAL.map(([n], i) => label(n, new THREE.Vector3(SPX[i], 1.55, 0), { cls: 'big' }));

  // ---------- State ----------
  const st = { step: 0, quiz: false, time: 0, auto: false, level: 0, plant: false, cells: 20, apart: 0, sys: 0, effort: 0, spec: 0, feed: -1, divide: -1, slider: null, row: null, run: 0, breath: 0, flow: 0, beatT: 0 };

  function hideAll() {
    for (const t of [...levelTags, ...layerTags, ...sysTags, ...specTags, heartTag, lungTag, amTag, foodTag]) t.show(false);
    wall.visible = false; lungs.visible = false; amB.g.visible = false; food.visible = false;
    for (const o of glowSet) o.on = false;
  }
  function showPath(plant) {
    st.plant = plant;
    animalSet.forEach(g => { g.visible = !plant; });
    plantSet.forEach(g => { g.visible = plant; });
    levelTags.forEach((t, j) => { t.at.y = (plant ? [1.75, 1.75, 1.75, 2.35, 2.35] : [1.75, 1.75, 1.85, 2.75, 2.75])[j]; });
  }
  function frameLevel(i, instant) {
    const f = st.plant && i >= 3 ? { r: 1.3, y: 1.2 } : FRAMES[i];
    view({ radius: f.r, yaw: 0.3, pitch: 0.18, target: [LX[i], f.y, 0] }, instant);
  }
  function setLevel(i, instant = false) {
    st.level = i;
    frameLevel(i, instant);
    levelTags.forEach((t, j) => t.show(j === i));
    ui.readout(`Level ${i + 1} of 5: <b>${LEVELS[i]}</b>: ${(st.plant ? PLANT_TXT : ANIMAL_TXT)[i]}`);
  }
  function setSpec(i) {
    st.spec = i;
    specTags.forEach((t, j) => t.show(j === i));
    ui.readout(`<b>${SPECIAL[i][0]}</b>: ${SPECIAL[i][1]}`);
  }
  function setCells(n) {
    st.cells = n;
    tCells.forEach((c, j) => { c.visible = j < n; });
    ui.readout(`Cells joined: <b>${n}</b>. ${n === 1 ? 'One cell on its own is not a tissue yet.' : 'Similar cells working together form <b>muscle tissue</b>.'}`);
  }
  function setApart(v) {
    st.apart = v;
    const gap = v * 0.32;
    layers[0].position.y = 0.18 + 0.03 + gap; layers[1].position.y = 0; layers[2].position.y = -0.18 - 0.025 - gap;
    layerTags.forEach(t => t.show(v > 0.25));
    ui.readout(v > 0.25
      ? 'Heart wall: <b>outer layer</b> (thin) · <b>muscle tissue</b> (thick, contracts) · <b>inner lining</b> (smooth). Several tissues make one organ.'
      : 'One <b>organ</b>, many <b>tissues</b>: pull the piece of heart wall apart.');
  }
  function setSys(i) {
    st.sys = i;
    gHeart.on = i === 0; gArt.on = i === 1; gVein.on = i === 2;
    sysTags.forEach((t, j) => t.show(j === i));
    ui.readout(`<b>${SYS[i][0]}</b>: ${SYS[i][1]}`);
  }
  const rates = e => ({ hr: Math.round(75 + 90 * e), br: Math.round(15 + 30 * e) });
  function setEffort(e) {
    st.effort = e;
    const { hr, br } = rates(e);
    ui.readout(`Heart rate: about <b>${hr}</b> beats per minute<br>Breathing: about <b>${br}</b> breaths per minute`);
  }

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, slider: null, row: null, feed: -1, divide: -1, effort: 0, msg: '' });
      hideAll();
      showPath(i === 7);
      tCells.forEach(c => { c.visible = true; });
      if (i === 0) {
        go({ radius: 1.15, yaw: 0.2, pitch: 0.35, target: [AMX + 0.2, 0.6, 0] });
        amTag.show(true);
        food.visible = true; food.position.set(AMX + 0.95, 0.55, 0.15); foodTag.show(true);
        ui.buttons([{ label: 'Feed the amoeba', onClick: () => { st.auto = false; st.feed = 0; st.divide = -1; } }, { label: 'Divide in two', onClick: () => { st.auto = false; st.divide = 0; } }]);
        ui.readout('Cells in this organism: <b>1</b>. One cell does every job of life.');
      }
      if (i === 1) {
        go({ radius: 1.6, width: 3.05, yaw: 0.1, pitch: 0.25, target: [-10.35, 0.95, 0] });
        st.row = ui.buttons(SPECIAL.map(([n], j) => ({ label: n, on: j === 0, onClick: () => { st.auto = false; setSpec(j); } })));
        setSpec(0);
      }
      if (i === 2 || i === 7) {
        st.slider = ui.slider({ label: 'Level', min: 0, max: 4, step: 1, value: 0, format: v => LEVELS[v], onInput: v => { st.auto = false; setLevel(v); } });
        setLevel(0, instant);
      }
      if (i === 3) {
        go({ radius: 1.15, yaw: 0.25, pitch: 0.15, target: [LX[1], 1.0, 0] });
        levelTags[1].show(true);
        st.slider = ui.slider({ label: 'Cells in the tissue', min: 1, max: 20, step: 1, value: 1, onInput: v => { st.auto = false; setCells(v); } });
        setCells(1);
      }
      if (i === 4) {
        go({ radius: 1.35, yaw: 0.15, pitch: 0.2, target: [LX[2] + 0.55, 1.05, 0] });
        wall.visible = true; heartTag.show(true);
        st.slider = ui.slider({ label: 'Take apart', min: 0, max: 1, step: 0.01, value: 0, format: v => `${Math.round(v * 100)}%`, onInput: v => { st.auto = false; setApart(v); } });
        setApart(0);
      }
      if (i === 5) {
        go({ radius: 1.4, yaw: 0.2, pitch: 0.12, target: [LX[3], 1.3, 0] });
        st.row = ui.buttons(SYS.map(([n], j) => ({ label: n, on: j === 0, onClick: () => { st.auto = false; setSys(j); } })));
        setSys(0);
      }
      if (i === 6) {
        go({ radius: 1.4, width: 2.75, yaw: 0.15, pitch: 0.12, target: [(LX[3] + LX[4]) / 2, 1.3, 0] });
        lungs.visible = true; lungTag.show(true); sysTags[0].show(true);
        st.slider = ui.slider({ label: 'Exercise', min: 0, max: 1, step: 0.01, value: 0, format: v => (v < 0.05 ? 'Resting' : v > 0.9 ? 'Running hard' : v < 0.45 ? 'Walking' : 'Running'), onInput: v => { st.auto = false; setEffort(v); } });
        setEffort(0);
      }
      if (isQuiz) {
        go({ radius: 2, width: 7.6, yaw: 0.12, pitch: 0.2, target: [LX[2], 1.2, 0] });
      }
    },

    update(dt, t) {
      st.time += dt;
      const s = st.step, T = st.time;
      // ---- Auto demos (until the learner takes over) ----
      if (st.auto && !st.quiz) {
        if (s === 0) { if (T > 0.6 && st.feed < 0 && st.divide < 0) st.feed = 0; if (T > 5.2 && st.divide < 0) st.divide = 0; }
        if (s === 1) { const j = Math.floor(T / 2.5) % 4; if (j !== st.spec) { setSpec(j); st.row?.select(j); } }
        if (s === 2 || s === 7) { const j = Math.min(4, Math.floor(T / 3.4) % 5); if (j !== st.level) { setLevel(j); st.slider?.set(j); } }
        if (s === 3) { const n = Math.min(20, 1 + Math.floor(T * 6)); if (n !== st.cells) { setCells(n); st.slider?.set(n); } }
        if (s === 4) { const v = kit.clamp((T % 7 - 0.8) / 1.6, 0, 1) * (T % 7 < 5.5 ? 1 : 0); if (Math.abs(v - st.apart) > 0.005) { setApart(v); st.slider?.set(v); } }
        if (s === 5) { const j = Math.floor(T / 2.6) % 4; if (j !== st.sys) { setSys(j); st.row?.select(j); } }
        if (s === 6) { const v = kit.clamp((T % 10 - 0.5) / 3, 0, 1) * (T % 10 < 8 ? 1 : 0); if (Math.abs(v - st.effort) > 0.01) { setEffort(v); st.slider?.set(v); } }
      }
      const e = s === 6 ? st.effort : 0, { hr, br } = rates(e);
      st.beatT += dt * hr / 75;
      const b = beat(st.beatT, 75);
      // Heart muscle cell and tissue contract together with the beat.
      cell1.scale.set(1 - 0.12 * b, 1 + 0.05 * b, 1);
      tissue.scale.set(1 - 0.1 * b, 1 + 0.04 * b, 1);
      heart.scale.setScalar(1 - 0.06 * b);
      sysHeart.scale.setScalar(0.24 * (1 - 0.1 * b));
      // Blood dots around the five loops.
      st.flow += dt * 0.12 * hr / 75;
      const tmp = blood.userData.v ||= new THREE.Vector3(), m = blood.userData.m ||= new THREE.Matrix4();
      const big = st.sys === 3 && s === 5 ? 1.8 : 1;
      loops.forEach((lp, li) => {
        for (let d = 0; d < DOTS; d++) {
          const u = (st.flow + d / DOTS + li * 0.13) % 1;
          if (u < 0.5) lp.out.getPointAt(u * 2, tmp); else lp.back.getPointAt(u * 2 - 1, tmp);
          m.makeScale(big, big, big).setPosition(tmp);
          blood.setMatrixAt(li * DOTS + d, m);
          blood.setColorAt(li * DOTS + d, u < 0.5 ? red : blue);
        }
      });
      blood.instanceMatrix.needsUpdate = true;
      if (blood.instanceColor) blood.instanceColor.needsUpdate = true;
      // Lungs breathe.
      st.breath += dt * br / 60;
      const lb = 0.5 - 0.5 * Math.cos(st.breath * Math.PI * 2), deep = 0.06 + 0.1 * e;
      lungL.scale.set(0.13 * (1 + deep * lb), 0.27 * (1 + deep * 0.8 * lb), 0.11 * (1 + deep * lb));
      lungR.scale.copy(lungL.scale);
      // The runner: idle sway, or running in place faster with more effort.
      st.run += dt * (1.2 + 5 * e);
      const sw = Math.sin(st.run * Math.PI), amp = s === 6 ? 0.08 + 0.75 * e : 0.05;
      runner.arms[0].rotation.x = sw * amp; runner.arms[1].rotation.x = -sw * amp;
      runner.legs[0].rotation.x = -sw * amp * 0.9; runner.legs[1].rotation.x = sw * amp * 0.9;
      runner.g.position.y = s === 6 ? Math.abs(Math.cos(st.run * Math.PI)) * 0.06 * e : 0;
      // Specialised cells: the chosen one lifts and turns.
      specials.forEach((h, j) => {
        const on = j === st.spec && s === 1;
        kit.follow(h.position, 'y', on ? 1.05 : 0.75, dt, 4);
        h.rotation.y = on ? Math.sin(t * 0.9) * 0.6 : kit.lerp(h.rotation.y, 0, Math.min(1, dt * 3));
      });
      // Plant: whole plant sways gently.
      wholePlant.rotation.z = Math.sin(t * 0.8) * 0.02; shootOnly.rotation.z = Math.sin(t * 0.8 + 1) * 0.02;
      // Glow on selected materials.
      const k = 0.3 + 0.22 * Math.sin(t * 5);
      for (const o of glowSet) { if (o.on) o.mat.emissive.copy(o.mat.color).multiplyScalar(k); else o.mat.emissive.setRGB(0, 0, 0); }
      // Amoeba: feeding and dividing.
      if (s === 0) animateAmoeba(dt, t);
      return true;
    },
  };

  // ---------- Amoeba behaviour ----------
  function animateAmoeba(dt, t) {
    const dir = amA.dir;
    if (st.feed >= 0) {
      st.feed += dt;
      const u = kit.clamp(st.feed / 2.2, 0, 1);
      dir.set(1, 0, 0.2).normalize();
      amA.reach = Math.sin(Math.min(1, st.feed / 2.6) * Math.PI) * 0.5;
      food.visible = st.divide < 0;
      // Food drifts in, then sits in a food vacuole and slowly shrinks as it is digested.
      const inside = kit.clamp((st.feed - 2.2) / 6, 0, 1);
      food.position.set(AMX + kit.lerp(0.95, 0.18, kit.ease(u)), 0.55, kit.lerp(0.15, 0.08, u));
      food.scale.setScalar(1 - 0.75 * inside);
      foodTag.show(st.step === 0 && u < 1);
      amA.vac.visible = u >= 1;
      if (u >= 1) amA.vac.scale.setScalar(1 - 0.5 * inside);
      if (u >= 1 && st.divide < 0) say('The food is now inside a <b>food vacuole</b>, where it is digested. The amoeba needs no mouth or stomach.');
    } else {
      dir.set(Math.cos(t * 0.4), 0, Math.sin(t * 0.4) * 0.6).normalize();
      amA.reach = 0.25 + 0.15 * Math.sin(t * 0.9);
      amA.vac.visible = false; food.scale.setScalar(1);
    }
    if (st.divide >= 0) {
      st.divide += dt;
      const p = kit.ease(kit.clamp(st.divide / 2.5, 0, 1));
      amB.g.visible = true;
      amA.g.position.x = AMX - 0.42 * p; amB.g.position.x = AMX + 0.42 * p;
      const sc = 1 - 0.22 * p;
      amA.g.scale.setScalar(sc); amB.g.scale.setScalar(sc);
      amA.reach = amB.reach = 0.1;
      amA.dir.set(-1, 0, 0); amB.dir.set(1, 0, 0);
      food.visible = false; amA.vac.visible = false;
      say(st.divide < 2.5 ? 'The nucleus divides first, then the cell pinches in two.' : 'Now there are <b>2 amoebas</b>. Each is a complete organism made of just one cell.');
    } else {
      amA.g.position.x = AMX; amA.g.scale.setScalar(1); amB.g.visible = false;
    }
    amA.update(t, dt); if (amB.g.visible) amB.update(t + 3, dt);
  }
  function say(html) { if (html !== st.msg && !st.quiz) { st.msg = html; ui.readout(html); } }

  function amoeba() {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.5, 28, 18), pos = geo.attributes.position, base = pos.array.slice();
    const skin = kit.mesh(geo, new THREE.MeshStandardMaterial({ color: 0xa9cfe0, transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false }), [0, 0, 0], g);
    skin.castShadow = false; skin.renderOrder = 3;
    kit.mesh(new THREE.SphereGeometry(0.13, 16, 10), nucMat, [-0.05, 0.02, 0.05], g);
    const cv = kit.mesh(new THREE.SphereGeometry(0.07, 12, 8), kit.mat(0xe8f6ff, { transparent: true, opacity: 0.8 }), [-0.25, 0.05, -0.12], g);
    cv.castShadow = false;
    const vac = kit.mesh(new THREE.SphereGeometry(0.11, 12, 8), kit.mat(0xcfe8b5, { transparent: true, opacity: 0.7 }), [0.18, 0, 0.08], g);
    vac.visible = false;
    for (let i = 0; i < 10; i++) kit.mesh(new THREE.SphereGeometry(0.018, 6, 4), kit.mat(0x6f8f9f), [(rand(i) - 0.5) * 0.6, (rand(i + 20) - 0.5) * 0.15, (rand(i + 40) - 0.5) * 0.5], g);
    const o = { g, vac, dir: new THREE.Vector3(1, 0, 0), reach: 0.3 };
    o.update = (time) => {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
        const nx = x / 0.5, ny = y / 0.5, nz = z / 0.5;
        const d = Math.max(0, nx * o.dir.x + ny * o.dir.y + nz * o.dir.z);
        const r = 1 + 0.1 * Math.sin(3 * nx + 1.7 * time) * Math.cos(2 * nz + time) + 0.07 * Math.sin(4 * nz - 1.3 * time + ny) + o.reach * d * d * d * d;
        pos.setXYZ(i, x * r, y * r * 0.5, z * r);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };
    return o;
  }

  // ---------- Builders ----------
  function makeHeart(s, m) {
    const g = new THREE.Group();
    const prof = [[0, -0.55], [0.12, -0.46], [0.25, -0.3], [0.36, -0.1], [0.42, 0.1], [0.4, 0.27], [0.3, 0.4], [0.13, 0.47], [0, 0.48]].map(([r, y]) => new THREE.Vector2(r, y));
    const body = kit.mesh(new THREE.LatheGeometry(prof, 20), m, [0, 0, 0], g);
    body.scale.set(1.15, 1, 0.9); body.rotation.z = 0.35;
    const aorta = kit.mesh(new THREE.TorusGeometry(0.18, 0.075, 8, 16, Math.PI), m, [0.02, 0.5, 0], g);
    aorta.rotation.z = 0.1;
    const blueish = kit.mat(0x4a6fd0, { roughness: 0.55 });
    const pa = kit.mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.32, 10), blueish, [-0.12, 0.5, 0.16], g); pa.rotation.z = 0.5;
    kit.mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.4, 10), blueish, [0.3, 0.42, -0.05], g);
    g.scale.setScalar(s);
    return g;
  }

  function nerveCell() {
    const g = new THREE.Group(), m = kit.mat(0xf2c14e, { roughness: 0.5 });
    kit.mesh(new THREE.SphereGeometry(0.15, 16, 12), m, [-0.45, 0, 0], g);
    kit.mesh(new THREE.SphereGeometry(0.07, 10, 8), nucMat, [-0.45, 0, 0.1], g);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.55 + (i / 6) * Math.PI * 0.95, l = 0.22 + rand(i) * 0.1;
      const d = kit.mesh(new THREE.CylinderGeometry(0.008, 0.035, l, 6), m, [-0.45 + Math.cos(a) * (0.12 + l / 2), Math.sin(a) * (0.12 + l / 2), 0], g);
      d.rotation.z = a - Math.PI / 2;
    }
    const axon = kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8), m, [0.1, 0, 0], g); axon.rotation.z = Math.PI / 2;
    const sheath = kit.mat(0xf8f1dc);
    for (let i = 0; i < 4; i++) { const sh = kit.mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.17, 10), sheath, [-0.2 + i * 0.22, 0, 0], g); sh.rotation.z = Math.PI / 2; }
    for (const a of [-0.6, 0, 0.6]) {
      const tb = kit.mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.16, 5), m, [0.6 + Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0], g); tb.rotation.z = a - Math.PI / 2;
      kit.mesh(new THREE.SphereGeometry(0.03, 8, 6), m, [0.6 + Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0], g);
    }
    g.position.x = -0.05;
    return g;
  }

  function redCell() {
    const g = new THREE.Group();
    const prof = [[0.001, -0.05], [0.12, -0.06], [0.24, -0.1], [0.31, -0.08], [0.34, 0], [0.31, 0.08], [0.24, 0.1], [0.12, 0.06], [0.001, 0.05]].map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(prof, 28);
    const m = kit.mat(0xd62828, { roughness: 0.45 });
    const a = kit.mesh(geo, m, [0, 0.05, 0], g); a.rotation.x = 1.15;
    const b = kit.mesh(geo, m, [0.28, -0.25, -0.15], g); b.rotation.set(0.5, 0, 1.3); b.scale.setScalar(0.75);
    return g;
  }

  function rootHairCell() {
    const g = new THREE.Group(), wallM = kit.mat(0xe2cf9c, { roughness: 0.7 });
    const box = kit.mesh(new THREE.BoxGeometry(0.42, 0.34, 0.34), new THREE.MeshStandardMaterial({ color: 0xe2cf9c, transparent: true, opacity: 0.55, roughness: 0.6, depthWrite: false }), [-0.3, 0, 0], g);
    box.castShadow = false;
    kit.mesh(new THREE.BoxGeometry(0.44, 0.36, 0.36), new THREE.MeshBasicMaterial({ color: 0xb59a5c, wireframe: true }), [-0.3, 0, 0], g);
    const hair = kit.mesh(new THREE.CapsuleGeometry(0.05, 0.75, 4, 8), wallM, [0.25, 0.05, 0], g);
    hair.rotation.z = Math.PI / 2 + 0.08;
    kit.mesh(new THREE.SphereGeometry(0.06, 10, 8), nucMat, [0.0, 0.06, 0.05], g);
    const vac = kit.mesh(new THREE.SphereGeometry(0.12, 12, 10), kit.mat(0x9fd0ee, { transparent: true, opacity: 0.7 }), [-0.33, -0.02, 0], g);
    vac.scale.set(1.3, 1, 1);
    return g;
  }

  function buildLeafSlice(parent) {
    const pale = kit.mat(0xe7f2cf, { transparent: true, opacity: 0.85 }), palM = kit.mat(0x8fd16a, { transparent: true, opacity: 0.75 });
    const spongy = kit.mat(0xb7e08f), chl = kit.mat(0x2f9e3c);
    const n = 7, w = 0.26;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * w;
      kit.mesh(new THREE.BoxGeometry(w * 0.94, 0.12, 0.5), pale, [x, 0.48, 0], parent).castShadow = false;
      kit.mesh(new THREE.BoxGeometry(w * 0.94, 0.12, 0.5), pale, [x, -0.5, 0], parent).castShadow = false;
      const p = kit.mesh(new THREE.CapsuleGeometry(w * 0.4, 0.38, 3, 10), palM, [x, 0.17, 0], parent); p.castShadow = false;
    }
    const chlIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), chl, n * 7);
    const mm = new THREE.Matrix4();
    for (let i = 0; i < n * 7; i++) {
      const c = Math.floor(i / 7), x = (c - (n - 1) / 2) * w + (rand(i) - 0.5) * 0.12;
      mm.makeScale(1.4, 0.7, 1).setPosition(x, 0.17 + (rand(i + 50) - 0.5) * 0.42, (rand(i + 90) - 0.5) * 0.16 + 0.07);
      chlIM.setMatrixAt(i, mm);
    }
    parent.add(chlIM);
    for (let i = 0; i < 9; i++) kit.mesh(new THREE.SphereGeometry(0.1, 12, 8), spongy, [(i - 4) * 0.2 + (rand(i + 7) - 0.5) * 0.06, -0.24 + (i % 2) * 0.1, (rand(i + 3) - 0.5) * 0.2], parent);
    // A vein in the spongy layer.
    const vein = kit.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 12), kit.mat(0xd9e7a8), [0.55, -0.27, 0], parent);
    vein.rotation.x = Math.PI / 2;
  }

  function buildLeaf(parent) {
    const g = new THREE.Group(); g.position.set(-0.6, 0.55, 0); g.rotation.z = 0.45; parent.add(g);
    const len = 1.5;
    const blade = kit.mesh(leafGeometry(THREE, len, 0.75, 0.1), kit.mat(0x4f9d3a, { side: DS }), [0, 0, 0], g);
    blade.rotation.x = Math.PI / 2 - 0.25;
    const vm = kit.mat(0xb9dc8a);
    const ribPts = [];
    for (let i = 0; i <= 8; i++) { const x = i / 8; ribPts.push(new THREE.Vector3(x * len, len * (0.3 * x - 0.4 * x * x) + 0.012, 0)); }
    const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPts), 16, 0.012, 5), vm);
    blade.add(rib);
    for (let i = 1; i <= 4; i++) for (const sd of [-1, 1]) {
      const x0 = i / 5.2, p0 = new THREE.Vector3(x0 * len, len * (0.3 * x0 - 0.4 * x0 * x0) + 0.01, 0);
      const x1 = x0 + 0.12, wz = sd * 0.75 * 0.33 * Math.sin(Math.PI * Math.min(1, x1)) ;
      const p1 = new THREE.Vector3(x1 * len, len * (0.3 * x1 - 0.4 * x1 * x1) - 0.25 * Math.abs(wz) + 0.01, wz);
      blade.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 1, 0.006, 4), vm));
    }
    const pet = kit.mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 6), kit.mat(0x5d8f3a), [0, 0, 0], parent);
    pet.position.set(-0.675, 0.275, 0); pet.rotation.z = -0.27;
  }

  function buildPlant(parent, faintRoots) {
    const g = new THREE.Group(); parent.add(g);
    const soil = kit.mesh(new THREE.BoxGeometry(1.3, 0.55, 0.9), new THREE.MeshStandardMaterial({ color: 0x8a5a33, transparent: true, opacity: faintRoots ? 0.25 : 0.42, roughness: 0.9, depthWrite: false }), [0, 0.275, 0], g);
    soil.castShadow = false; soil.renderOrder = 4;
    const rootM = faintRoots ? new THREE.MeshStandardMaterial({ color: 0xd8c39a, transparent: true, opacity: 0.25, depthWrite: false }) : kit.mat(0xd8c39a);
    const top = 0.55;
    kit.mesh(new THREE.ConeGeometry(0.04, 0.45, 6), rootM, [0, top - 0.24, 0], g).rotation.x = Math.PI;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, l = 0.3 + rand(i) * 0.15;
      const r = kit.mesh(new THREE.CylinderGeometry(0.008, 0.02, l, 5), rootM, [Math.cos(a) * l * 0.4, top - 0.12 - i * 0.05, Math.sin(a) * l * 0.3], g);
      r.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    }
    const green = kit.mat(0x4f9a3a), leafM = kit.mat(0x5bab42, { side: DS });
    kit.mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.25, 8), green, [0, top + 0.625, 0], g);
    const lg = leafGeometry(THREE, 0.5, 0.26, 0.12);
    for (let i = 0; i < 5; i++) {
      const piv = new THREE.Group(); piv.position.y = top + 0.3 + i * 0.18; piv.rotation.y = i * 2.4 + 0.4; g.add(piv);
      const l = kit.mesh(lg, leafM, [0.02, 0, 0], piv); l.rotation.set(0.3, 0, 0.35);
    }
    const head = new THREE.Group(); head.position.y = top + 1.25; g.add(head);
    kit.mesh(new THREE.SphereGeometry(0.08, 12, 8), kit.mat(0xf2b01e), [0, 0, 0.02], head);
    const petal = kit.mat(0xf06b9a, { side: DS });
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const p = kit.mesh(new THREE.SphereGeometry(0.08, 10, 6), petal, [Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0], head); p.scale.set(1.3, 0.6, 0.25); p.rotation.z = a; }
    head.rotation.x = -0.35;
    return g;
  }
}

// A simple person standing on y = 0, about 2.4 tall. Materials: either { all } (see-through) or skin/shirt/shorts/hair.
function person(THREE, kit, { all, skin, shirt, shorts, hair }) {
  const g = new THREE.Group();
  const S = all || skin, T = all || shirt, P = all || shorts;
  const torso = kit.mesh(new THREE.CapsuleGeometry(0.3, 0.5, 4, 14), T, [0, 1.5, 0], g); torso.scale.z = 0.65;
  kit.mesh(new THREE.CapsuleGeometry(0.27, 0.12, 4, 12), P, [0, 1.06, 0], g).scale.z = 0.7;
  kit.mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.15, 10), S, [0, 1.98, 0], g);
  kit.mesh(new THREE.SphereGeometry(0.22, 20, 14), S, [0, 2.2, 0.01], g);
  if (hair) { const h = kit.mesh(new THREE.SphereGeometry(0.225, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hair, [0, 2.23, -0.01], g); h.rotation.x = -0.25; }
  const arms = [-1, 1].map(s => {
    const p = new THREE.Group(); p.position.set(s * 0.39, 1.84, 0); g.add(p);
    kit.mesh(new THREE.CapsuleGeometry(0.075, 0.26, 3, 10), T, [0, -0.17, 0], p);
    kit.mesh(new THREE.CapsuleGeometry(0.065, 0.42, 3, 10), S, [s * 0.04, -0.55, 0], p).rotation.z = s * 0.08;
    return p;
  });
  const legs = [-1, 1].map(s => {
    const p = new THREE.Group(); p.position.set(s * 0.15, 1.0, 0); g.add(p);
    kit.mesh(new THREE.CapsuleGeometry(0.1, 0.28, 3, 10), P, [0, -0.15, 0], p);
    kit.mesh(new THREE.CapsuleGeometry(0.085, 0.5, 3, 10), S, [0, -0.6, 0], p);
    kit.mesh(new THREE.BoxGeometry(0.15, 0.08, 0.26), all || kit.mat(0xf4f4f4), [0, -0.94, 0.05], p);
    return p;
  });
  return { g, arms, legs };
}

// Striped texture for muscle: pale red with darker bands (striations).
function stripeTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e07065'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#b8443c';
  for (let y = 0; y < 128; y += 16) g.fillRect(0, y, 64, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  return t;
}
