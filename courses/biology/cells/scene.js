// Cells: a school light microscope with a turning nosepiece and an "eyepiece view" disc that shows onion skin
// or cheek cells at 40x, 100x or 400x; cut-away 3D animal and plant cells whose parts glow on demand;
// and a cluster of cells that doubles with each division (2^n).
import { animalCell, plantCell, microscopeView, partSet } from '../_shared/cells.js';

const MX = -2.2;            // microscope position (x)
const AXIS_Z = 0.15;        // optical axis (z) of the microscope
const OBJ = [4, 10, 40];    // objective lenses; eyepiece is 10x
const DISC = [1.55, 1.95, 0.2];
const AC = [8, 1.45, 0];    // animal cell
const PC = [11.4, 1.3, 0];  // plant cell
const DV = [18.5, 1.0, 0];    // dividing cells
const MIC_PARTS = [
  ['eyepiece', 'Eyepiece', 'the lens you look into. It magnifies <b>10×</b> (10 times).'],
  ['objectives', 'Objective lenses', 'three lenses just above the slide: <b>4×, 10× and 40×</b>. Turn the nosepiece to swap them.'],
  ['stage', 'Stage', 'the flat table that holds the <b>glass slide</b> with the thin specimen.'],
  ['lamp', 'Lamp', 'shines <b>light up through</b> the specimen, so it must be very thin.'],
  ['knobs', 'Focus knobs', 'move the stage up and down to make the image <b>sharp</b>.'],
];
const ANIMAL = [
  ['membrane', 'Cell membrane', 'a thin layer around the cell that <b>controls what goes in and out</b>.'],
  ['cytoplasm', 'Cytoplasm', 'a jelly that fills the cell, where <b>most chemical reactions</b> happen.'],
  ['nucleus', 'Nucleus', 'holds the <b>genetic material (DNA)</b> and controls the cell.'],
  ['mitochondria', 'Mitochondria', '<b>release energy</b> from food by respiration.'],
];
const PLANT = [
  ['wall', 'Cell wall', 'a stiff layer of <b>cellulose</b> outside the membrane: shape and support. Plants only.'],
  ['membrane', 'Cell membrane', 'controls what goes <b>in and out</b>. It lies just inside the wall.'],
  ['cytoplasm', 'Cytoplasm', 'the jelly where <b>most chemical reactions</b> happen.'],
  ['nucleus', 'Nucleus', 'holds the <b>DNA</b> and controls the cell.'],
  ['chloroplasts', 'Chloroplasts', 'contain green <b>chlorophyll</b> and make food by <b>photosynthesis</b>. Plants only.'],
  ['vacuole', 'Vacuole', 'a large space full of <b>cell sap</b> that keeps the cell firm. Plants only.'],
  ['mitochondria', 'Mitochondria', '<b>release energy</b> from food by respiration.'],
];
const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵'];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xe6dfcf, sky: 0xe8f1fa, radius: 30 });
  kit.lights(scene, { sun: [5, 10, 7] });

  // ---------- Bench ----------
  const bench = kit.mesh(new THREE.BoxGeometry(7.6, 0.08, 2.8), kit.mat(0xcfb894, { roughness: 0.85 }), [-0.4, 0.04, 0.2], scene);
  bench.castShadow = false;

  // ---------- Microscope ----------
  const MP = partSet(THREE, kit);
  const mic = new THREE.Group();
  mic.position.x = MX;
  scene.add(mic);
  const cream = kit.mat(0xeeebe4, { roughness: 0.5 }), black = kit.mat(0x2b2d42, { roughness: 0.45 });
  const chrome = kit.mat(0xc9ced6, { metalness: 0.7, roughness: 0.3 });
  kit.mesh(new THREE.BoxGeometry(1.2, 0.16, 1.4), cream, [0, 0.16, 0], mic);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffd34d, emissiveIntensity: 0.6 });
  kit.mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.06, 20), lampMat, [0, 0.27, AXIS_Z], mic);
  kit.mesh(new THREE.BoxGeometry(0.28, 2.6, 0.32), cream, [0, 1.45, -0.5], mic);
  kit.mesh(new THREE.BoxGeometry(0.28, 0.3, 0.8), cream, [0, 2.8, -0.2], mic);
  kit.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16), black, [0, 1.0, AXIS_Z], mic);
  const stageMat = MP.mat('stage', 0x2b2d42, { roughness: 0.45 });
  kit.mesh(new THREE.BoxGeometry(1.1, 0.07, 0.95), stageMat, [0, 1.12, 0.1], mic);
  kit.mesh(new THREE.BoxGeometry(0.8, 0.012, 0.26), new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.55, roughness: 0.1 }), [0, 1.162, AXIS_Z], mic);
  const specimen = kit.mesh(new THREE.PlaneGeometry(0.2, 0.17), kit.mat(0xe7cf86, { transparent: true, opacity: 0.8 }), [0, 1.17, AXIS_Z], mic);
  specimen.rotation.x = -Math.PI / 2; specimen.castShadow = false;
  for (const s of [-1, 1]) kit.mesh(new THREE.BoxGeometry(0.06, 0.02, 0.32), chrome, [s * 0.32, 1.175, 0.05], mic);
  kit.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.78, 20), cream, [0, 2.5, AXIS_Z], mic);
  const eyeMat = MP.mat('eyepiece', 0x2b2d42, { roughness: 0.45 });
  kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.34, 20), eyeMat, [0, 3.05, AXIS_Z], mic);
  kit.mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 20), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.1, metalness: 0.3 }), [0, 3.225, AXIS_Z], mic);
  const knobMat = MP.mat('knobs', 0x2b2d42, { roughness: 0.45 });
  for (const s of [-1, 1]) {
    const a = kit.mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 20), knobMat, [s * 0.2, 1.25, -0.5], mic); a.rotation.z = Math.PI / 2;
    const b = kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16), knobMat, [s * 0.28, 1.25, -0.5], mic); b.rotation.z = Math.PI / 2;
  }
  // Revolving nosepiece: three objectives on a circle; the chosen one turns to the front, over the slide.
  const nose = new THREE.Group();
  nose.position.set(0, 2.08, AXIS_Z - 0.17);
  mic.add(nose);
  kit.mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.1, 24), black, [0, 0, 0], nose);
  const objMat = MP.mat('objectives', 0xc9ced6, { metalness: 0.7, roughness: 0.3 });
  const bands = [0xe63946, 0xf2c230, 0x4ea8de];
  OBJ.forEach((m, i) => {
    const a = (i * Math.PI * 2) / 3, len = [0.26, 0.36, 0.48][i];
    const o = new THREE.Group();
    o.position.set(Math.sin(a) * 0.17, -0.05, Math.cos(a) * 0.17);
    nose.add(o);
    kit.mesh(new THREE.CylinderGeometry(0.06, 0.042, len, 16), objMat, [0, -len / 2, 0], o);
    kit.mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.035, 16), kit.mat(bands[i]), [0, -len * 0.3, 0], o);
  });
  // Light path: a faint beam and bright pulses travelling up the optical axis.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.95, 8), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.28, depthWrite: false }));
  beam.position.set(0, 0.3 + 2.95 / 2, AXIS_Z);
  mic.add(beam);
  const pulseGeo = new THREE.SphereGeometry(0.045, 10, 8), pulseMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const pulses = [0, 1, 2, 3].map(() => { const p = new THREE.Mesh(pulseGeo, pulseMat); mic.add(p); return p; });
  const micAnchors = {
    eyepiece: [0, 3.25, AXIS_Z], objectives: [0.15, 1.75, AXIS_Z], stage: [0.5, 1.18, 0.4], lamp: [0, 0.32, 0.55], knobs: [0.34, 1.3, -0.5],
  };
  const micTags = {};
  for (const [k, name] of MIC_PARTS) micTags[k] = label(name, new THREE.Vector3(MX + micAnchors[k][0], micAnchors[k][1], micAnchors[k][2]), { cls: 'warm' });

  // ---------- Eyepiece view ----------
  const texCache = {};
  const fieldTex = (kind, mag, stain) => (texCache[`${kind}${mag}${stain}`] ||= microscopeView(THREE, { kind, mag, stain }));
  const discMat = new THREE.MeshBasicMaterial({ map: fieldTex('onion', 100, true) });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), discMat);
  disc.position.set(...DISC);
  scene.add(disc);
  const rim = kit.mesh(new THREE.TorusGeometry(1.33, 0.07, 8, 48), black, [0, 0, 0], disc);
  rim.castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 8), black, [DISC[0], 0.35, DISC[2] - 0.05], scene);
  const discTag = label('Eyepiece view', new THREE.Vector3(DISC[0], DISC[1] + 1.42, DISC[2]));

  // Onion half and a cotton bud on the bench, plus a thin peel / smear that travels to the slide.
  const onion = new THREE.Group();
  onion.position.set(-0.55, 0.36, 0.95);
  scene.add(onion);
  const half = kit.mesh(new THREE.SphereGeometry(0.3, 24, 14, 0, Math.PI), kit.mat(0xc98a3d, { roughness: 0.7 }), [0, 0, 0], onion);
  half.rotation.y = Math.PI; half.scale.y = 1.05;
  const ringTex = ringsTexture(THREE);
  const face = kit.mesh(new THREE.CircleGeometry(0.3, 24), kit.mat(0xffffff, { map: ringTex }), [0, 0, 0.002], onion);
  face.scale.y = 1.05;
  const tip = kit.mesh(new THREE.ConeGeometry(0.06, 0.16, 8), kit.mat(0xb07a35), [0, 0.36, -0.04], onion);
  tip.castShadow = false;
  const bud = new THREE.Group();
  bud.position.set(0.25, 0.14, 1.1);
  bud.rotation.y = 0.5; bud.rotation.z = Math.PI / 2;
  scene.add(bud);
  kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), kit.mat(0xf4f1ea), [0, 0, 0], bud);
  for (const s of [-1, 1]) kit.mesh(new THREE.SphereGeometry(0.035, 10, 8), kit.mat(0xffffff), [0, s * 0.25, 0], bud).scale.y = 1.6;
  const peel = kit.mesh(new THREE.PlaneGeometry(0.2, 0.16), new THREE.MeshStandardMaterial({ color: 0xf7efd8, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), [0, 0, 0], scene);
  peel.castShadow = false; peel.visible = false;
  const onionTag = label('Onion', new THREE.Vector3(-0.55, 0.85, 0.95));
  const budTag = label('Cotton bud', new THREE.Vector3(0.25, 0.32, 1.1));

  // ---------- Cut-away cells ----------
  const pedestal = (x, z, r) => kit.mesh(new THREE.CylinderGeometry(r, r * 1.08, 0.14, 32), kit.mat(0xd9d4c7), [x, 0.07, z], scene);
  pedestal(AC[0], AC[2], 1.1); pedestal(PC[0], PC[2], 1.4);
  const animal = animalCell(THREE, kit, { r: 1.15 });
  animal.g.position.set(...AC);
  scene.add(animal.g);
  const plant = plantCell(THREE, kit, { W: 2.4, H: 1.6, D: 1.5 });
  plant.g.position.set(...PC);
  scene.add(plant.g);
  const aTags = {}, pTags = {};
  for (const [k, name] of ANIMAL) aTags[k] = label(name, animal.anchor(k), { cls: 'cool' });
  for (const [k, name] of PLANT) pTags[k] = label(name, plant.anchor(k), { cls: 'cool' });
  const aTitle = label('Animal cell', new THREE.Vector3(AC[0], AC[1] + 1.25, AC[2]), { cls: 'big' });
  const pTitle = label('Plant cell', new THREE.Vector3(PC[0], PC[1] + 1.2, PC[2]), { cls: 'big' });

  // ---------- Dividing cells ----------
  pedestal(DV[0], DV[2], 2.2);
  const MAXN = 5, MAXC = 32, AXES = ['x', 'z', 'y', 'x', 'z'], GAP = [0.8, 0.8, 0.8, 1.6, 1.6];
  const cellGeo = new THREE.SphereGeometry(0.36, 18, 12), nucGeo = new THREE.SphereGeometry(0.13, 12, 8);
  const cellsIM = new THREE.InstancedMesh(cellGeo, new THREE.MeshStandardMaterial({ color: 0xf4b7c4, transparent: true, opacity: 0.6, roughness: 0.4, depthWrite: false }), MAXC);
  const nucIM = new THREE.InstancedMesh(nucGeo, kit.mat(0x7b4bb8), MAXC);
  for (const im of [cellsIM, nucIM]) { im.frustumCulled = false; im.position.set(DV[0], DV[1] + 0.25, DV[2]); scene.add(im); }
  cellsIM.renderOrder = 2;
  cellsIM.count = nucIM.count = 1;
  const cur = Array.from({ length: MAXC }, () => new THREE.Vector3()), size = new Float32Array(MAXC).fill(1);
  const want = new THREE.Vector3(), mtx = new THREE.Matrix4(), qI = new THREE.Quaternion(), sc = new THREE.Vector3();
  const target = (i, n, out) => {
    out.set(0, 0, 0);
    for (let b = 0; b < n; b++) out[AXES[b]] += ((i >> b) & 1 ? 0.5 : -0.5) * GAP[b];
    return out;
  };

  // ---------- State ----------
  const st = { step: 0, quiz: false, time: 0, auto: false, obj: 1, kind: 'onion', stain: true, part: 0, n: 0, shownN: 0, travel: -1, travelKind: 'onion', slider: null, row: null, compare: 0 };

  function hideTags() {
    for (const t of Object.values(micTags)) t.show(false);
    for (const t of [...Object.values(aTags), ...Object.values(pTags)]) t.show(false);
    for (const t of [discTag, onionTag, budTag, aTitle, pTitle]) t.show(false);
  }
  function setField() {
    discMat.map = fieldTex(st.kind, 10 * OBJ[st.obj], st.stain);
    specimen.material.color.set(st.kind === 'cheek' ? (st.stain ? 0x8fb5e6 : 0xe8e8e4) : (st.stain ? 0xe7cf86 : 0xf2f0e6));
    nose.userData.want = -(st.obj * Math.PI * 2) / 3;
  }
  function magReadout() {
    const m = 10 * OBJ[st.obj];
    let html = `Total magnification = eyepiece × objective = 10 × ${OBJ[st.obj]} = <b>${m}×</b>`;
    if (st.step === 2 || st.step === 3) {
      const real = st.kind === 'onion' ? 0.25 : 0.06, img = Math.round(real * m * 10) / 10;
      html = `Magnification <b>${m}×</b>. Image size = real size × magnification = ${real} mm × ${m} = <b>${img} mm</b>`
        + `<br>${st.kind === 'onion' ? 'Onion skin' : 'Cheek'} cells, ${st.stain ? (st.kind === 'onion' ? 'stained with iodine' : 'stained with methylene blue') : 'no stain'}.`;
    }
    ui.readout(html);
  }
  function objSlider() {
    st.slider = ui.slider({ label: 'Objective lens', min: 0, max: 2, step: 1, value: st.obj, format: v => `${OBJ[v]}× (total ${10 * OBJ[v]}×)`,
      onInput: v => { st.auto = false; st.obj = v; setField(); magReadout(); } });
  }
  function pickMic(i) {
    st.part = i;
    const [k, name, txt] = MIC_PARTS[i];
    MP.select(k);
    for (const [kk] of MIC_PARTS) micTags[kk].show(kk === k && !st.quiz);
    ui.readout(`<b>${name}</b>: ${txt}`);
  }
  function pickCell(list, cell, tags, i) {
    st.part = i;
    const [k, name, txt] = list[i];
    cell.select(k);
    for (const [kk] of list) tags[kk].show(kk === k);
    ui.readout(`<b>${name}</b>: ${txt}`);
  }
  function setCompare(c) {
    st.compare = c;
    const both = ['membrane', 'cytoplasm', 'nucleus', 'mitochondria'], only = ['wall', 'chloroplasts', 'vacuole'];
    animal.select(c === 0 ? both : []);
    plant.select(c === 0 ? both : only);
    for (const k of only) pTags[k].show(c === 1);
    ui.readout(c === 0
      ? '<b>In both</b>: cell membrane, cytoplasm, nucleus, mitochondria.<br>Size: animal cell about 10–30 µm, plant cell about 10–100 µm.'
      : '<b>Only in plant cells</b>: cell wall, chloroplasts, large vacuole.<br>Shape: plant cells are fixed and box-like; animal cells are rounder or uneven.');
  }
  function setN(n) {
    for (let i = 1 << st.n; i < 1 << n; i++) { // new cells start where their parent cell is, a little small
      const p = i & ~(1 << (31 - Math.clz32(i)));
      cur[i].copy(cur[p]);
      size[i] = size[p] = 0.72;
    }
    st.n = n;
    cellsIM.count = nucIM.count = 1 << n;
    const N = 1 << n;
    const expand = n === 0 ? '1 cell (no divisions yet)' : `${Array(n).fill('2').join(' × ')} = <b>${N} cells</b>`;
    ui.readout(`After <b>${n}</b> division${n === 1 ? '' : 's'}: 2${SUP[n]} = ${expand}`);
  }
  // Text of a step's frame.
  const F = {
    mic: { radius: 1.95, yaw: 0.45, pitch: 0.18, target: [MX, 1.65, 0.1] },
    magn: { radius: 1.9, width: 3.2, yaw: 0.12, pitch: 0.14, target: [0.2, 1.7, 0.2] },
    bench: { radius: 1.9, width: 3.2, yaw: 0.05, pitch: 0.24, target: [0.2, 1.5, 0.3] },
    animal: { radius: 1.65, yaw: 0.8, pitch: 0.32, target: [AC[0], AC[1], AC[2]] },
    plant: { radius: 1.6, yaw: 0.28, pitch: 0.3, target: [PC[0], PC[1], PC[2]] },
    both: { radius: 1.5, width: 2.95, yaw: 0.3, pitch: 0.3, target: [9.7, 1.4, 0] },
    divide: { radius: 2.1, yaw: 0.5, pitch: 0.42, target: [DV[0], DV[1] + 0.35, DV[2]] },
    quiz: { radius: 2.2, width: 3.3, yaw: 0.25, pitch: 0.22, target: [0.2, 1.6, 0.2] },
  };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, slider: null, row: null, travel: -1 });
      hideTags(); MP.select(null); animal.select(null); plant.select(null);
      peel.visible = false;
      beam.visible = i <= 1 || isQuiz;
      for (const p of pulses) p.visible = beam.visible;
      if (i === 0) {
        go(F.mic);
        st.obj = 1; st.kind = 'onion'; st.stain = true; setField();
        st.row = ui.buttons(MIC_PARTS.map(([, name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickMic(j); } })));
        pickMic(0);
      }
      if (i === 1) {
        go(F.magn);
        st.kind = 'onion'; st.stain = true; st.obj = 0; setField(); discTag.show(true);
        objSlider(); magReadout();
      }
      if (i === 2 || i === 3) {
        go(F.bench);
        st.kind = i === 2 ? 'onion' : 'cheek'; st.stain = true; st.obj = i === 2 ? 1 : 2; setField();
        discTag.show(true); onionTag.show(i === 2); budTag.show(i === 3);
        st.travel = 0; st.travelKind = st.kind;
        if (i === 2) ui.buttons([{ label: 'No stain', onClick: () => { st.stain = false; setField(); magReadout(); } }, { label: 'Iodine stain', on: true, onClick: () => { st.stain = true; setField(); magReadout(); } }]);
        else ui.buttons([{ label: 'Cheek cells', on: true, onClick: () => { st.kind = 'cheek'; setField(); magReadout(); } }, { label: 'Onion skin', onClick: () => { st.kind = 'onion'; setField(); magReadout(); } }]);
        objSlider(); magReadout();
      }
      if (i === 4) {
        go(F.animal);
        aTitle.show(true);
        st.row = ui.buttons(ANIMAL.map(([, name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickCell(ANIMAL, animal, aTags, j); } })));
        pickCell(ANIMAL, animal, aTags, 0);
      }
      if (i === 5) {
        go(F.plant);
        pTitle.show(true);
        st.row = ui.buttons(PLANT.map(([, name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickCell(PLANT, plant, pTags, j); } })));
        pickCell(PLANT, plant, pTags, 0);
      }
      if (i === 6) {
        go(F.both);
        aTitle.show(true); pTitle.show(true);
        st.row = ui.buttons([{ label: 'In both', on: true, onClick: () => { st.auto = false; setCompare(0); } }, { label: 'Only in plant cells', onClick: () => { st.auto = false; setCompare(1); } }]);
        setCompare(0);
      }
      if (i === 7) {
        go(F.divide);
        for (let j = 0; j < MAXC; j++) { cur[j].set(0, 0, 0); size[j] = 1; }
        st.n = 0; setN(0);
        st.slider = ui.slider({ label: 'Divisions (n)', min: 0, max: MAXN, step: 1, value: 0, onInput: v => { st.auto = false; setN(v); } });
      }
      if (isQuiz) {
        go(F.quiz);
        st.kind = 'onion'; st.stain = true; st.obj = 1; setField(); discTag.show(true);
      }
    },

    update(dt, t) {
      st.time += dt;
      const s = st.step;
      // Auto demos until the learner takes over.
      if (st.auto && !st.quiz) {
        if (s === 0) { const j = Math.floor(st.time / 2.6) % MIC_PARTS.length; if (j !== st.part && j >= 0) { pickMic(j); st.row?.select(j); } }
        if (s === 1) { const j = Math.min(2, Math.floor(st.time / 2.2) % 3); if (j !== st.obj) { st.obj = j; setField(); magReadout(); st.slider?.set(j); } }
        if (s === 4) { const j = Math.floor(st.time / 2.6) % ANIMAL.length; if (j !== st.part) { pickCell(ANIMAL, animal, aTags, j); st.row?.select(j); } }
        if (s === 5) { const j = Math.floor(st.time / 2.4) % PLANT.length; if (j !== st.part) { pickCell(PLANT, plant, pTags, j); st.row?.select(j); } }
        if (s === 6) { const c = Math.floor(st.time / 3) % 2; if (c !== st.compare) { setCompare(c); st.row?.select(c); } }
        if (s === 7) { const n = Math.min(MAXN, Math.floor(st.time / 1.1) % (MAXN + 3)); if (n !== st.n) { if (n < st.n) for (let j = 0; j < MAXC; j++) cur[j].set(0, 0, 0); setN(n); st.slider?.set(n); } }
      }
      // Nosepiece turns to the chosen objective.
      kit.follow(nose.rotation, 'y', nose.userData.want ?? 0, dt, 5);
      // Light pulses run up the optical axis.
      if (beam.visible) pulses.forEach((p, j) => { const u = (t * 0.45 + j / pulses.length) % 1; p.position.set(0, 0.3 + u * 2.95, AXIS_Z); });
      lampMat.emissiveIntensity = MP.selected[0] === 'lamp' ? 0.9 + 0.5 * Math.sin(t * 5) : 0.6;
      MP.pulse(t); animal.pulse(t); plant.pulse(t);
      // Peel (onion) or smear (cheek) travels from the bench to the slide.
      if (st.travel >= 0) {
        st.travel += dt;
        const u = kit.clamp(st.travel / 1.6, 0, 1), e = kit.ease(u);
        const from = st.travelKind === 'onion' ? [-0.55, 0.45, 1.1] : [0.25, 0.2, 1.1];
        peel.visible = u < 1;
        peel.position.set(kit.lerp(from[0], MX, e), kit.lerp(from[1], 1.19, e) + Math.sin(e * Math.PI) * 0.6, kit.lerp(from[2], AXIS_Z, e));
        peel.rotation.set(-Math.PI / 2 * e, 0, 0.6 * (1 - e));
        peel.material.color.set(st.travelKind === 'onion' ? 0xf7efd8 : 0xd7e6f7);
        specimen.visible = u >= 1;
        bud.position.y = st.travelKind === 'cheek' ? 0.14 + Math.sin(e * Math.PI) * 0.05 : 0.14;
        if (u >= 1) st.travel = -1;
      } else specimen.visible = true;
      // Cells sway a little so the 3D shape reads.
      animal.g.rotation.y = Math.sin(t * 0.5) * 0.25;
      plant.g.rotation.y = Math.sin(t * 0.45 + 1) * 0.15;
      // Dividing cells move apart and grow back to full size.
      if (s === 7) {
        const N = 1 << st.n;
        for (let j = 0; j < N; j++) {
          target(j, st.n, want);
          cur[j].lerp(want, Math.min(1, dt * 3));
          size[j] += (1 - size[j]) * Math.min(1, dt * 1.5);
          const wob = 1 + 0.02 * Math.sin(t * 2 + j);
          sc.setScalar(size[j] * wob);
          mtx.compose(cur[j], qI, sc); cellsIM.setMatrixAt(j, mtx);
          want.copy(cur[j]); want.z += 0.25 * size[j]; want.y += 0.05;
          sc.setScalar(size[j]); mtx.compose(want, qI, sc); nucIM.setMatrixAt(j, mtx);
        }
        cellsIM.instanceMatrix.needsUpdate = nucIM.instanceMatrix.needsUpdate = true;
      }
      return true;
    },
  };
}

// Cut face of an onion: pale rings.
function ringsTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f6efd9'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#d9c99a'; g.lineWidth = 3;
  for (let r = 10; r < 64; r += 9) { g.beginPath(); g.arc(64, 64, r, 0, Math.PI * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
