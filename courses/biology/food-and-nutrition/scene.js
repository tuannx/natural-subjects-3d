// Food and nutrition: a kitchen table with low-poly foods sorted into groups. A child uses up energy
// playing and refills it by eating; foods jump up by group; buttons build a balanced plate with a
// balance meter; drinks and snacks show their sugar and salt; the energy in rice is traced back to the
// Sun; and germs grow fast on leftovers left on the warm table but slowly in the fridge.
import { rand } from '../_shared/leaf.js';

const TOP = 1.075;                 // table top surface
const PLATE = [0, 0.2];            // plate centre (x, z)
const PLATE_R = 0.85;
const KID = [3.05, 0.35];          // child (x, z), on the floor
const BAT = [3.85, 0.15];          // energy bar
const FRIDGE = [-3.25, -0.35];
const PADDY = [-1.4, -3.8];
const SUN = [-2.4, 4.3, -5.6];

// Food groups: colour of their part of the plate, the label text and the plate sector (degrees,
// counted from +x toward the back of the table).
const GROUPS = {
  grains:  { name: 'Grains: energy', short: 'Grains', color: 0xf6c177, a0: 90, a1: 180 },
  protein: { name: 'Protein: grow and repair', short: 'Protein', color: 0xc9a7eb, a0: 180, a1: 270 },
  veg:     { name: 'Vegetables: vitamins, fibre', short: 'Vegetables', color: 0x9ed99e, a0: 270, a1: 378 },
  fruit:   { name: 'Fruit: vitamins, fibre', short: 'Fruit', color: 0xf7a6a6, a0: 18, a1: 90 },
  dairy:   { name: 'Dairy: calcium for bones', short: 'Dairy' },
  fat:     { name: 'Fats and oils: a little', short: 'Fats' },
  treat:   { name: 'Treats: now and then', short: 'Treats' },
};
const MAIN = ['grains', 'protein', 'veg', 'fruit', 'dairy'];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const { clamp, lerp, ease, follow } = kit;
  kit.stage(scene, { ground: 0xe8d8c0, sky: 0xfbefdc, radius: 16 });
  kit.lights(scene, { sun: [3, 10, 6] });
  const flat = (c, o) => kit.mat(c, { flatShading: true, ...o });
  const basic = (c, o) => new THREE.MeshBasicMaterial({ color: c, ...o });

  // ---------- Kitchen table ----------
  const wood = kit.mat(0xc8935a);
  kit.mesh(new THREE.BoxGeometry(4.6, 0.15, 2.8), wood, [0, TOP - 0.075, 0], scene);
  for (const [x, z] of [[-2.1, -1.2], [2.1, -1.2], [-2.1, 1.2], [2.1, 1.2]]) kit.mesh(new THREE.BoxGeometry(0.14, TOP - 0.15, 0.14), wood, [x, (TOP - 0.15) / 2, z], scene);
  // A checked table cloth strip under the plate.
  const cloth = kit.mesh(new THREE.PlaneGeometry(2.2, 1.9), kit.mat(0xffffff, { map: checks(THREE), polygonOffset: true, polygonOffsetFactor: -1 }), [0, TOP + 0.002, 0.2], scene);
  cloth.rotation.x = -Math.PI / 2; cloth.castShadow = false;

  // ---------- Plate with coloured parts ----------
  const plate = new THREE.Group();
  plate.position.set(PLATE[0], TOP, PLATE[1]);
  scene.add(plate);
  kit.mesh(new THREE.CylinderGeometry(PLATE_R + 0.06, PLATE_R - 0.08, 0.06, 32), kit.mat(0xffffff, { roughness: 0.3 }), [0, 0.03, 0], plate);
  const deg = Math.PI / 180;
  const sectorTags = {};
  for (const [key, gr] of Object.entries(GROUPS)) {
    if (gr.a0 == null) continue;
    const s = kit.mesh(new THREE.CircleGeometry(PLATE_R - 0.04, 16, gr.a0 * deg, (gr.a1 - gr.a0) * deg), kit.mat(gr.color, { roughness: 0.5 }), [0, 0.062, 0], plate);
    s.rotation.x = -Math.PI / 2; s.castShadow = false;
    const mid = (gr.a0 + gr.a1) / 2 * deg;
    const at = new THREE.Object3D();
    at.position.set(Math.cos(mid) * 0.66, 0.12, -Math.sin(mid) * 0.66);
    plate.add(at);
    sectorTags[key] = label(gr.short, at);
  }
  // Dairy spot: a small blue mat beside the plate.
  const dairyMat = kit.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 24), kit.mat(0x9cc9f0), [1.2, TOP + 0.006, 0.95], scene);
  dairyMat.castShadow = false;
  sectorTags.dairy = label('Dairy', new THREE.Vector3(1.2, TOP + 0.32, 0.95));
  // Where a food sits on the plate: its group's part, two places side by side.
  const slot = (group, n) => {
    if (group === 'dairy') return [1.2, PLATE[1] + 0.75];
    if (group === 'treat') return [PLATE[0], PLATE[1]];
    const gr = GROUPS[group], mid = ((gr.a0 + gr.a1) / 2 + (n ? 14 : -14)) * deg;
    return [PLATE[0] + Math.cos(mid) * 0.42, PLATE[1] - Math.sin(mid) * 0.42];
  };

  // ---------- Foods ----------
  const B = makeFoods(THREE, kit, flat);
  const foods = {};
  const add = (key, group, x, z, n = 0) => {
    const g = B[key]();
    scene.add(g);
    const f = { key, group, g, n, home: new THREE.Vector3(x, TOP, z), from: new THREE.Vector3(), to: new THREE.Vector3(), k: 1, dur: 0.8, arc: 0, done: null, hop: 0, hopTo: 0, spin: 0, onPlate: false };
    g.position.copy(f.home);
    foods[key] = f;
    return f;
  };
  add('rice', 'grains', -1.85, -0.55); add('bread', 'grains', -1.35, -0.9, 1);
  add('fish', 'protein', -0.72, -0.98); add('egg', 'protein', -0.25, -0.98, 1);
  add('broccoli', 'veg', 0.28, -0.98); add('carrot', 'veg', 0.75, -0.98, 1);
  add('apple', 'fruit', 1.35, -0.9); add('banana', 'fruit', 1.85, -0.55, 1);
  add('milk', 'dairy', 1.8, 0.35); add('cheese', 'dairy', 1.8, 0.85, 1);
  add('butter', 'fat', -1.85, 0.3);
  add('cupcake', 'treat', -1.85, 0.85); add('can', 'treat', -1.4, 1.0, 1);
  add('crisps', 'treat', -1.35, 0.45, 2);
  add('water', 'drink', 1.3, 1.05);
  const groupOf = g => Object.values(foods).filter(f => f.group === g);
  const groupTags = {};
  for (const key of Object.keys(GROUPS)) {
    const fs = groupOf(key), c = new THREE.Vector3();
    fs.forEach(f => c.add(f.home)); c.multiplyScalar(1 / fs.length); c.y = TOP + 0.75;
    groupTags[key] = label(GROUPS[key].name, c, { cls: key === 'treat' || key === 'fat' ? 'warm' : '' });
  }

  function moveTo(f, x, y, z, { arc = 0.45, dur = 0.8, done = null } = {}) {
    f.from.copy(f.g.position); f.to.set(x, y, z); f.k = 0; f.arc = arc; f.dur = dur; f.done = done;
  }
  function goHome(f, instant) {
    f.onPlate = false; f.hopTo = 0; f.done = null;
    if (instant) { f.k = 1; f.hop = 0; f.g.position.copy(f.home); f.g.visible = true; f.g.rotation.set(0, 0, 0); f.g.scale.setScalar(1); }
    else moveTo(f, f.home.x, f.home.y, f.home.z);
  }

  // ---------- Child and energy bar (step 1) ----------
  const kid = makeKid(THREE, kit);
  kid.g.position.set(KID[0], 0, KID[1]);
  kid.g.rotation.y = -0.55;
  scene.add(kid.g);
  const mouth = new THREE.Vector3(KID[0] - 0.1, 1.33, KID[1] + 0.12);
  const bat = new THREE.Group();
  bat.position.set(BAT[0], 0, BAT[1]);
  scene.add(bat);
  const batH = 1.3;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.34, batH + 0.06, 0.34), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
  frame.position.y = 0.2 + batH / 2; bat.add(frame);
  kit.mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), kit.mat(0x666666), [0, 0.25 + batH + 0.04, 0], bat);
  kit.mesh(new THREE.BoxGeometry(0.42, 0.2, 0.42), kit.mat(0x5c6b7a), [0, 0.1, 0], bat);
  const fillMat = kit.mat(0x4caf50, { emissive: 0x113311 });
  const fill = kit.mesh(new THREE.BoxGeometry(0.28, 1, 0.28), fillMat, [0, 0, 0], bat);
  const energyTag = label('Energy', new THREE.Vector3(BAT[0], 1.68, BAT[1]), { cls: 'big' });
  const kidTag = label('Playing', new THREE.Vector3(KID[0], 2.1, KID[1]));

  // ---------- Balance meter (step 3) ----------
  const gauge = new THREE.Group();
  gauge.position.set(0, TOP, -1.12);
  scene.add(gauge);
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), kit.mat(0x8d99ae), [0, 0.27, -0.02], gauge);
  kit.mesh(new THREE.BoxGeometry(0.95, 0.52, 0.04), kit.mat(0xfdfdfd), [0, 0.75, -0.04], gauge);
  [[0xe76f51, 120, 60], [0xf4d35e, 60, 60], [0x57cc99, 0, 60]].forEach(([c, a, len]) => {
    const s = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.4, 12, 1, a * deg, len * deg), basic(c));
    s.position.set(0, 0.55, -0.015); gauge.add(s);
  });
  const needle = new THREE.Group();
  needle.position.set(0, 0.55, 0);
  gauge.add(needle);
  const nm = basic(0x263238);
  const nb = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.02), nm); nb.position.x = 0.19; needle.add(nb);
  needle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12).rotateX(Math.PI / 2), nm));
  const gaugeTag = label('Balance meter', new THREE.Vector3(0, TOP + 1.12, -1.12), { cls: 'big' });

  // ---------- Sugar cubes and salt (step 4) ----------
  const cubeGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11), cubeMat = kit.mat(0xffffff, { roughness: 0.9 });
  const cubes = [];
  for (let i = 0; i < 9; i++) {
    const layer = i < 4 ? 0 : i < 7 ? 1 : i < 9 ? 2 : 3, j = i < 4 ? i : i < 7 ? i - 4 : i - 7;
    const per = [4, 3, 2][layer];
    const c = kit.mesh(cubeGeo, cubeMat, [0, 0, 0], scene);
    c.place = [0.42 + (j - (per - 1) / 2) * 0.125, TOP + 0.068 + layer * 0.115, PLATE[1] + 0.05 * (layer % 2)];
    c.visible = false; cubes.push(c);
  }
  const salt = kit.mesh(new THREE.ConeGeometry(0.2, 0.16, 16), kit.mat(0xf5f5f5, { roughness: 1 }), [0.42, TOP + 0.06, PLATE[1]], scene);
  salt.visible = false;
  const shaker = new THREE.Group();
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.2, 12), kit.mat(0xeaf4f4, { transparent: true, opacity: 0.8 }), [0, 0.1, 0], shaker);
  kit.mesh(new THREE.SphereGeometry(0.062, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0xb0bec5, { metalness: 0.6, roughness: 0.3 }), [0, 0.2, 0], shaker);
  shaker.visible = false; scene.add(shaker);
  const grainGeo = new THREE.SphereGeometry(0.012, 4, 3), grainMat = basic(0xffffff);
  const grains = [];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(grainGeo, grainMat); m.visible = false; scene.add(m); grains.push(m); }
  const drinkTag = label('', new THREE.Vector3(0.42, TOP + 0.62, PLATE[1]), { cls: 'warm' });

  // ---------- Rice field and Sun (step 5) ----------
  const field = new THREE.Group();
  field.position.set(PADDY[0], 0, PADDY[1]);
  scene.add(field);
  const grass = kit.mesh(new THREE.CircleGeometry(2.1, 32), kit.mat(0x8bc34a, { polygonOffset: true, polygonOffsetFactor: -1 }), [0, 0.01, 0], field);
  grass.rotation.x = -Math.PI / 2; grass.castShadow = false;
  const pond = kit.mesh(new THREE.CircleGeometry(1.45, 24), kit.mat(0x6fb7d9, { roughness: 0.2, polygonOffset: true, polygonOffsetFactor: -2 }), [0, 0.02, 0], field);
  pond.rotation.x = -Math.PI / 2; pond.castShadow = false;
  const plants = [];
  const bladeGeo = new THREE.ConeGeometry(0.025, 0.9, 3).translate(0, 0.45, 0), bladeMat = flat(0x6aa84f);
  const headGeo = new THREE.SphereGeometry(0.035, 6, 4).scale(1, 1.6, 1), headMat = flat(0xe0b44c);
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Group(), a = i * 2.4, r = 0.25 + 0.9 * Math.sqrt((i + 0.5) / 9);
    p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.8);
    for (let b = 0; b < 6; b++) {
      const m = kit.mesh(bladeGeo, bladeMat, [0, 0, 0], p);
      m.rotation.set(0.25 + rand(i * 7 + b) * 0.2, (b / 6) * Math.PI * 2, 0, 'YXZ');
      m.scale.y = 0.85 + rand(i + b * 3) * 0.3;
    }
    // A drooping head of golden rice grains.
    for (let s = 0; s < 6; s++) {
      const u = s / 5;
      kit.mesh(headGeo, headMat, [0.05 + u * 0.22, 0.98 - u * u * 0.32, 0], p).rotation.z = -0.3 - u;
    }
    p.rotation.y = rand(i + 40) * 6;
    field.add(p); plants.push(p);
  }
  const sun = kit.mesh(new THREE.SphereGeometry(0.55, 24, 12), basic(0xffd34d), SUN, scene);
  sun.castShadow = false;
  const glowMat = basic(0xffb703, { transparent: true, opacity: 0.3, depthWrite: false });
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 12), glowMat));
  // Glowing arrows: Sun -> rice plant -> bowl of rice.
  const arrows = [
    makeArrow(THREE, new THREE.Vector3(SUN[0] + 0.3, SUN[1] - 0.6, SUN[2] + 0.3), new THREE.Vector3(PADDY[0], 1.3, PADDY[1]), 0xffb703),
    makeArrow(THREE, new THREE.Vector3(PADDY[0] - 0.2, 1.15, PADDY[1] + 0.9), new THREE.Vector3(-1.85, TOP + 0.4, -0.65), 0xff8f00),
  ];
  arrows.forEach(a => scene.add(a.g));
  const fieldTags = [
    label('Rice', new THREE.Vector3(-1.85, TOP + 0.5, -0.55), { cls: 'big' }),
    label('Rice plant', new THREE.Vector3(PADDY[0] + 0.9, 1.35, PADDY[1] + 0.2), { cls: 'big' }),
    label('Sun', new THREE.Vector3(SUN[0] + 1.1, SUN[1] + 0.1, SUN[2]), { cls: 'big warm' }),
  ];

  // ---------- Fridge and leftovers (step 6) ----------
  const fridge = new THREE.Group();
  fridge.position.set(FRIDGE[0], 0, FRIDGE[1]);
  scene.add(fridge);
  const shell = kit.mat(0xf1f4f6, { roughness: 0.35 }), inner = kit.mat(0xd4ecfb, { emissive: 0x2a4a66, emissiveIntensity: 0.25 });
  const FW = 1.1, FH = 2.0, FD = 0.85;
  kit.mesh(new THREE.BoxGeometry(FW, FH, 0.06), shell, [0, FH / 2, -FD / 2], fridge);
  kit.mesh(new THREE.BoxGeometry(0.06, FH, FD), shell, [-FW / 2, FH / 2, 0], fridge);
  kit.mesh(new THREE.BoxGeometry(0.06, FH, FD), shell, [FW / 2, FH / 2, 0], fridge);
  kit.mesh(new THREE.BoxGeometry(FW, 0.08, FD), shell, [0, FH - 0.04, 0], fridge);
  kit.mesh(new THREE.BoxGeometry(FW, 0.12, FD), shell, [0, 0.06, 0], fridge);
  kit.mesh(new THREE.BoxGeometry(FW - 0.1, FH - 0.2, 0.02), inner, [0, FH / 2, -FD / 2 + 0.04], fridge).castShadow = false;
  const SHELF = 1.0;
  for (const y of [0.55, SHELF, 1.45]) kit.mesh(new THREE.BoxGeometry(FW - 0.1, 0.03, FD - 0.1), kit.mat(0xe0f2ff, { transparent: true, opacity: 0.7 }), [0, y, 0], fridge).castShadow = false;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-FW / 2, 0, FD / 2);
  doorPivot.rotation.y = -1.9;
  fridge.add(doorPivot);
  kit.mesh(new THREE.BoxGeometry(FW, FH, 0.07), shell, [FW / 2, FH / 2, 0.035], doorPivot);
  kit.mesh(new THREE.BoxGeometry(0.04, 0.5, 0.05), kit.mat(0x90a4ae), [FW - 0.1, FH * 0.6, -0.04], doorPivot);
  for (let i = 0; i < 3; i++) {
    const fl = kit.mesh(new THREE.OctahedronGeometry(0.06, 0), basic(0x8fd3ff), [-0.3 + i * 0.3, 1.78, 0.1], fridge);
    fl.castShadow = false; fl.scale.set(1, 1, 0.3);
  }
  const bowlWarm = B.rice(), bowlCold = B.rice();
  bowlWarm.position.set(-1.75, TOP, 0.35);
  bowlCold.position.set(FRIDGE[0], SHELF + 0.015, FRIDGE[1] + 0.05);
  bowlWarm.scale.setScalar(1.7); bowlCold.scale.setScalar(1.7);
  scene.add(bowlWarm, bowlCold);
  const germGeo = new THREE.SphereGeometry(0.018, 6, 4), germMat = basic(0x1f9d3a);
  const MAXG = 72;
  const germSpots = [];
  for (let i = 0; i < MAXG; i++) {
    // Spread over the top of the rice mound (radius ~0.15, centre 0.11 above the bowl's base).
    const a = i * 2.39996, r = 0.13 * Math.sqrt(0.05 + 0.95 * rand(i * 3 + 1)), h = Math.sqrt(Math.max(0, 0.15 * 0.15 - r * r));
    germSpots.push([Math.cos(a) * r, 0.105 + h * 0.6, Math.sin(a) * r]);
  }
  const germsWarm = new THREE.InstancedMesh(germGeo, germMat, MAXG), germsCold = new THREE.InstancedMesh(germGeo, germMat, MAXG);
  germsWarm.frustumCulled = germsCold.frustumCulled = false; // instance count changes, so skip the cached bounds
  bowlWarm.add(germsWarm); bowlCold.add(germsCold);
  const dummy = new THREE.Object3D();
  function setGerms(im, n) {
    n = Math.min(MAXG, Math.round(n));
    for (let i = 0; i < n; i++) { dummy.position.set(...germSpots[i]); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }
    im.count = n; im.instanceMatrix.needsUpdate = true;
  }
  const warmTag = label('Warm table', new THREE.Vector3(-1.75, TOP + 0.45, 0.35), { cls: 'warm' });
  const coldTag = label('Cold fridge', new THREE.Vector3(FRIDGE[0], 2.25, FRIDGE[1]), { cls: 'cool' });

  // ---------- State ----------
  const st = { step: 0, quiz: false, time: 0, plan: [], auto: false, energy: 1, playing: false, eating: 0, group: null, show: null, trace: 0, hours: 0, slider: null, row: null };
  const allTags = [...Object.values(sectorTags), ...Object.values(groupTags), energyTag, kidTag, gaugeTag, drinkTag, ...fieldTags, warmTag, coldTag];

  function reset() {
    st.plan = []; st.auto = false; st.group = null; st.show = null; st.playing = false; st.eating = 0;
    for (const f of Object.values(foods)) goHome(f, true);
    allTags.forEach(t => t.show(false));
    kid.g.visible = bat.visible = false; gauge.visible = false;
    field.visible = sun.visible = false; arrows.forEach(a => { a.g.visible = false; });
    cubes.forEach(c => { c.visible = false; }); salt.visible = shaker.visible = false; grains.forEach(g => { g.visible = false; });
    bowlWarm.visible = bowlCold.visible = false; fridge.visible = true;
    kid.g.position.y = 0; kid.armL.rotation.z = kid.armR.rotation.z = 0;
  }

  // Step 1: playing uses energy, a meal refills it.
  function play() { st.playing = true; st.eating = 0; }
  function eat() {
    if (st.eating) return;
    st.playing = false; st.eating = 1;
    const fs = [foods.rice, foods.fish, foods.apple];
    fs.forEach((f, i) => moveTo(f, mouth.x, mouth.y, mouth.z, { arc: 1, dur: 0.9 + i * 0.25, done: () => { f.g.visible = false; st.energy = Math.min(1, st.energy + 0.36); if (i === 2) { st.eating = 0; fs.forEach(h => { goHome(h, true); }); } } }));
  }
  function showEnergy() {
    fill.scale.y = Math.max(0.001, st.energy * batH);
    fill.position.y = 0.2 + fill.scale.y / 2;
    fillMat.color.setHSL(st.energy * 0.33, 0.65, 0.48);
    const txt = st.eating ? 'Eating' : st.playing ? (st.energy > 0 ? 'Playing' : 'Too tired!') : 'Resting';
    if (kidTag.el.textContent !== txt) kidTag.text = txt;
    const msg = `Energy: <b>${Math.round(st.energy * 100)}%</b>`;
    if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
  }

  // Step 2: lift one food group.
  function pickGroup(key) {
    st.group = key;
    for (const f of Object.values(foods)) f.hopTo = f.group === key ? 0.32 : 0;
    for (const [k, t] of Object.entries(groupTags)) t.show(k === key && !st.quiz);
  }

  // Step 3: balanced plate.
  function togglePlate(key) {
    const f = foods[key];
    if (f.onPlate) goHome(f);
    else { f.onPlate = true; const [x, z] = slot(f.group, f.n); moveTo(f, x, TOP + 0.06, z, { arc: 0.5 }); }
    scorePlate();
  }
  function scorePlate() {
    const have = new Set(Object.values(foods).filter(f => f.onPlate).map(f => f.group));
    const n = MAIN.filter(g => have.has(g)).length, sweet = have.has('treat');
    st.score = clamp(n / 5 - (sweet ? 0.25 : 0), 0, 1);
    const names = g => GROUPS[g].short.toLowerCase();
    const got = MAIN.filter(g => have.has(g)), miss = MAIN.filter(g => !have.has(g));
    let msg = got.length ? `On the plate: <b>${got.map(names).join(', ')}</b>.` : 'The plate is empty.';
    if (miss.length) msg += ` Still missing: ${miss.map(names).join(', ')}.`;
    else msg += ' <b>A balanced meal!</b>';
    if (sweet) msg += ' A cupcake is a treat, so keep it small.';
    ui.readout(msg);
  }

  // Step 4: drinks and snacks.
  function showcase(key) {
    st.show = key; st.time4 = 0;
    for (const k of ['water', 'can', 'crisps']) if (k !== key) goHome(foods[k]);
    moveTo(foods[key], -0.32, TOP + 0.06, PLATE[1] + 0.05, { arc: 0.5 });
    cubes.forEach(c => { c.visible = false; });
    salt.visible = shaker.visible = false; salt.scale.setScalar(0.01);
    grains.forEach(g => { g.visible = false; });
    const txt = { water: 'No sugar', can: 'About 9 sugar cubes', crisps: 'Lots of salt' }[key];
    drinkTag.text = txt; drinkTag.show(true);
    ui.readout({ water: 'A glass of water has <b>no sugar</b> and no salt.', can: 'One can of fizzy drink: about <b>35 g of sugar</b>.', crisps: 'Crisps have lots of <b>added salt</b>.' }[key]);
  }

  // Step 5: trace the energy back.
  function trace(n) {
    st.trace = n;
    fieldTags.forEach((t, i) => t.show(i <= n && !st.quiz));
    arrows[1].g.visible = n >= 1; arrows[0].g.visible = n >= 2;
    ui.readout([
      'The rice in the bowl gives you <b>energy</b>.',
      'The rice grains grew on a <b>rice plant</b>. The plant stored food in its grains.',
      'The plant made that food using <b>sunlight</b>. So the energy in your rice came from the Sun!',
    ][n]);
  }

  // Step 6: germs on leftovers.
  const warmGerms = h => 3 * Math.pow(2, h * 0.9);
  const coldGerms = h => 3 + h / 3;
  function setHours(h) {
    st.hours = h;
    setGerms(germsWarm, warmGerms(h)); setGerms(germsCold, coldGerms(h));
    const w = Math.min(MAXG, Math.round(warmGerms(h)));
    ui.readout(`After <b>${h} hours</b>: ${w >= MAXG ? 'too many germs to count' : w + ' dots'} on the warm table, ${Math.round(coldGerms(h))} dots in the fridge.`);
  }

  const overview = { radius: 2.5, yaw: 0.25, pitch: 0.5, target: [0, TOP, 0] };

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.msg = '';
      reset();
      if (i === 0) {
        view({ radius: 1.5, width: 2.4, yaw: 0.15, pitch: 0.25, target: [1.75, 0.95, 0.2] });
        kid.g.visible = bat.visible = true; energyTag.show(true); kidTag.show(true);
        st.energy = 1; st.auto = true; play();
        ui.buttons([{ label: 'Play', onClick: () => { st.auto = false; play(); } }, { label: 'Eat a meal', onClick: () => { st.auto = false; eat(); } }]);
      }
      if (i === 1) {
        view({ radius: 1.5, width: 2.3, yaw: 0, pitch: 0.55, target: [0, TOP, -0.1] });
        st.auto = true; st.cycle = -1;
        const keys = ['grains', 'protein', 'veg', 'fruit', 'dairy', 'fat', 'treat'];
        st.row = ui.buttons(keys.map(k => ({ label: GROUPS[k].short, onClick: () => { st.auto = false; pickGroup(k); } })));
      }
      if (i === 2) {
        view({ radius: 1.65, yaw: 0.1, pitch: 0.72, target: [0.25, TOP + 0.25, -0.05] });
        gauge.visible = true; gaugeTag.show(true);
        MAIN.forEach(g => sectorTags[g].show(true));
        st.score = 0; needle.rotation.z = Math.PI;
        const keys = ['rice', 'fish', 'egg', 'broccoli', 'carrot', 'apple', 'milk', 'cupcake'];
        ui.buttons([...keys.map(k => ({ label: k[0].toUpperCase() + k.slice(1), onClick: () => { st.plan = []; togglePlate(k); } })),
          { label: 'Clear the plate', onClick: () => { st.plan = []; Object.values(foods).forEach(f => { if (f.onPlate) goHome(f); }); scorePlate(); } }]);
        scorePlate();
        st.plan = ['rice', 'fish', 'broccoli', 'apple', 'milk', 'carrot'].map((k, j) => [0.5 + j * 0.65, () => togglePlate(k)]);
      }
      if (i === 3) {
        view({ radius: 1.0, yaw: -0.15, pitch: 0.4, target: [0.05, TOP + 0.22, 0.2] });
        const row = ui.buttons([{ label: 'Water', onClick: () => { st.plan = []; showcase('water'); } }, { label: 'Fizzy drink', onClick: () => { st.plan = []; showcase('can'); } }, { label: 'Crisps', onClick: () => { st.plan = []; showcase('crisps'); } }]);
        st.plan = [[0.3, () => { showcase('can'); row.select(1); }], [6, () => { showcase('water'); row.select(0); }], [9, () => { showcase('crisps'); row.select(2); }]];
      }
      if (i === 4) {
        view({ radius: 3.3, yaw: 0.6, pitch: 0.1, target: [-1.8, 2.4, -3.1] });
        field.visible = sun.visible = true; fridge.visible = false;
        const row = ui.buttons(['Rice', 'Rice plant', 'Sun'].map((l, n) => ({ label: l, onClick: () => { st.plan = []; trace(n); } })));
        trace(0); row.select(0);
        st.plan = [[1.1, () => { trace(1); row.select(1); }], [2.2, () => { trace(2); row.select(2); }]];
      }
      if (i === 5) {
        view({ radius: 1.25, width: 1.2, yaw: 0.3, pitch: 0.38, target: [-2.5, 1.3, 0.0] });
        ['butter', 'cupcake', 'can', 'crisps', 'rice'].forEach(k => { foods[k].g.visible = false; });
        bowlWarm.visible = bowlCold.visible = true; warmTag.show(true); coldTag.show(true);
        st.auto = true;
        st.slider = ui.slider({ label: 'Hours', min: 0, max: 6, step: 0.5, value: 0, onInput: v => { st.auto = false; setHours(v); } });
        setHours(0);
      }
      if (isQuiz) {
        view(overview);
        gauge.visible = true;
        ['rice', 'fish', 'broccoli', 'carrot', 'apple', 'milk'].forEach(k => { const f = foods[k]; f.onPlate = true; const [x, z] = slot(f.group, f.n); f.g.position.set(x, TOP + 0.06, z); });
        st.score = 1; needle.rotation.z = 0;
      }
    },

    update(dt) {
      st.time += dt;
      let busy = false;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      if (st.plan.length) busy = true;

      if (st.step === 0 && !st.quiz) {
        if (st.playing && st.energy > 0) {
          st.energy = Math.max(0, st.energy - dt * 0.16);
          const j = Math.abs(Math.sin(st.time * 5.5));
          kid.g.position.y = j * 0.22;
          kid.armL.rotation.z = 0.4 + j * 1.6; kid.armR.rotation.z = -0.4 - j * 1.6;
          kid.legL.rotation.x = Math.sin(st.time * 5.5) * 0.3; kid.legR.rotation.x = -kid.legL.rotation.x;
          kid.head.rotation.x = 0;
        } else {
          follow(kid.g.position, 'y', 0, dt, 8);
          follow(kid.armL.rotation, 'z', st.eating ? 1.2 : 0.05, dt, 6); follow(kid.armR.rotation, 'z', -0.05, dt, 6);
          kid.legL.rotation.x = kid.legR.rotation.x = 0;
          kid.head.rotation.x = st.playing && st.energy <= 0 ? 0.35 : 0;
        }
        if (st.auto && st.energy < 0.25 && st.playing) eat();
        if (st.auto && !st.eating && !st.playing && st.energy > 0.95) play();
        showEnergy();
        busy = true;
      }
      if (st.step === 1 && !st.quiz && st.auto) {
        const keys = ['grains', 'protein', 'veg', 'fruit', 'dairy', 'fat', 'treat'];
        const n = clamp(Math.floor(st.time / 2.2), 0, 1e6) % keys.length;
        if (n !== st.cycle) { st.cycle = n; pickGroup(keys[n]); st.row?.select(n); }
      }
      if (st.step === 2 && !st.quiz) {
        busy = follow(needle.rotation, 'z', Math.PI * (1 - st.score), dt, 3) || busy;
      }
      if (st.step === 3 && st.show) {
        st.time4 += dt;
        const t4 = st.time4;
        if (st.show === 'can') cubes.forEach((c, j) => {
          const s = clamp((t4 - 0.9 - j * 0.16) / 0.25, 0, 1);
          c.visible = s > 0;
          c.position.set(c.place[0], c.place[1] + (1 - ease(s)) * 0.5, c.place[2]);
          c.rotation.y = (1 - s) * 1.5 + j * 0.3;
        });
        if (st.show === 'crisps') {
          shaker.visible = t4 > 0.8 && t4 < 3.2;
          shaker.position.set(0.42, TOP + 0.55 + Math.abs(Math.sin(t4 * 9)) * 0.06, PLATE[1]);
          shaker.rotation.z = Math.PI * 0.85;
          grains.forEach((g, j) => {
            const ph = (t4 * 1.6 + j / grains.length) % 1;
            g.visible = shaker.visible;
            g.position.set(0.42 + (rand(j) - 0.5) * 0.08, TOP + 0.38 - ph * 0.3, PLATE[1] + (rand(j + 9) - 0.5) * 0.08);
          });
          salt.visible = t4 > 0.9;
          salt.scale.setScalar(clamp((t4 - 0.9) / 2.3, 0.01, 1));
        }
        busy = busy || st.time4 < 4;
      }
      if (st.step === 4) {
        arrows.forEach((a, j) => { if (a.g.visible) a.pulse((st.time * 0.6 + j * 0.5) % 1); });
        glowMat.opacity = 0.25 + Math.sin(st.time * 3) * 0.08;
        busy = true;
      }
      if (st.step === 5 && !st.quiz && st.auto) {
        const h = Math.min(6, Math.floor(st.time / 0.5) * 0.5);
        if (h !== st.hours) { setHours(h); st.slider?.set(h); }
        busy = busy || h < 6;
      }

      // Food motion: flights, hops and the little spin of a lifted group.
      for (const f of Object.values(foods)) {
        if (f.k < 1) {
          f.k = Math.min(1, f.k + dt / f.dur);
          const e = ease(f.k);
          f.g.position.lerpVectors(f.from, f.to, e);
          f.g.position.y += f.arc * 4 * e * (1 - e);
          if (st.step === 0) f.g.scale.setScalar(1 - 0.6 * e);
          if (f.k >= 1 && f.done) { const d = f.done; f.done = null; d(); }
          busy = true;
        } else if (f.hop || f.hopTo) {
          busy = follow(f, 'hop', f.hopTo, dt, 6) || busy;
          f.g.position.y = f.home.y + f.hop + (f.hopTo ? Math.sin(st.time * 4) * 0.03 : 0);
          if (f.hopTo) f.g.rotation.y = st.time * 1.2; else f.g.rotation.y *= Math.max(0, 1 - dt * 6);
          if (f.hopTo) busy = true;
        }
      }
      return busy;
    },
  };
}

// A small checked cloth texture.
function checks(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#f2b5b5';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) g.fillRect(x * 16, y * 16, 16, 16);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}

// A glowing arrow from a to b, with a bright dot that runs along it.
function makeArrow(THREE, a, b, color) {
  const g = new THREE.Group();
  const dir = b.clone().sub(a), len = dir.length();
  const m = new THREE.MeshBasicMaterial({ color });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len - 0.25, 8), m);
  shaft.position.y = (len - 0.25) / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 12), m);
  head.position.y = len - 0.125;
  const holder = new THREE.Group();
  holder.add(shaft, head);
  holder.position.copy(a);
  holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.add(holder);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  holder.add(dot);
  g.visible = false;
  return { g, pulse(u) { dot.position.y = u * (len - 0.2); } };
}

// A cheerful low-poly child, standing on y = 0 and facing +z. Arms and legs swing from pivots.
function makeKid(THREE, kit) {
  const g = new THREE.Group();
  const skin = kit.mat(0xd9a07a), shirt = kit.mat(0x3fa7d6), shorts = kit.mat(0x34495e), hair = kit.mat(0x3b2a20), shoe = kit.mat(0xffffff);
  const limb = (x, y, len, r, m) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    kit.mesh(new THREE.CylinderGeometry(r, r * 0.9, len, 10), m, [0, -len / 2, 0], p);
    g.add(p);
    return p;
  };
  const legL = limb(-0.1, 0.62, 0.58, 0.075, skin), legR = limb(0.1, 0.62, 0.58, 0.075, skin);
  for (const leg of [legL, legR]) {
    kit.mesh(new THREE.BoxGeometry(0.13, 0.08, 0.22), shoe, [0, -0.6, 0.04], leg);
    kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 10), shorts, [0, -0.07, 0], leg);
  }
  kit.mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.56, 14), shirt, [0, 0.9, 0], g);
  const armL = limb(-0.26, 1.12, 0.48, 0.055, skin), armR = limb(0.26, 1.12, 0.48, 0.055, skin);
  for (const arm of [armL, armR]) {
    kit.mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.18, 10), shirt, [0, -0.07, 0], arm);
    kit.mesh(new THREE.SphereGeometry(0.06, 10, 8), skin, [0, -0.5, 0], arm);
  }
  const head = new THREE.Group();
  head.position.y = 1.22;
  g.add(head);
  kit.mesh(new THREE.SphereGeometry(0.19, 20, 14), skin, [0, 0.16, 0], head);
  kit.mesh(new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hair, [0, 0.2, -0.02], head);
  const eye = kit.mat(0x222222);
  for (const x of [-0.065, 0.065]) kit.mesh(new THREE.SphereGeometry(0.025, 8, 6), eye, [x, 0.18, 0.17], head);
  const smile = kit.mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 12, Math.PI), kit.mat(0x9c3b3b), [0, 0.1, 0.175], head);
  smile.rotation.z = Math.PI;
  return { g, armL, armR, legL, legR, head };
}

// Low-poly foods. Each builder returns a group standing on y = 0, about 0.2 to 0.35 across.
function makeFoods(THREE, kit, flat) {
  const G = (...ms) => { const g = new THREE.Group(); ms.forEach(m => g.add(m)); return g; };
  const m = (geo, mat, pos = [0, 0, 0]) => kit.mesh(geo, mat, pos);
  const bowlMat = kit.mat(0x5b8fd6, { side: THREE.DoubleSide }), whiteMat = kit.mat(0xffffff, { roughness: 0.6 });
  return {
    rice: () => {
      const bowl = m(new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bowlMat, [0, 0.17, 0]);
      const mound = m(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), flat(0xfbfbf4), [0, 0.105, 0]);
      mound.scale.y = 0.6;
      return G(bowl, mound);
    },
    bread: () => G(m(new THREE.BoxGeometry(0.32, 0.14, 0.18), kit.mat(0xd9a05b), [0, 0.07, 0]),
      m(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(0), kit.mat(0xc68642), [0, 0.14, 0])),
    fish: () => {
      const body = m(new THREE.SphereGeometry(0.1, 14, 10), kit.mat(0xf08a5d), [0, 0.07, 0]);
      body.scale.set(1.7, 0.6, 0.8);
      const tail = m(new THREE.ConeGeometry(0.07, 0.12, 4), kit.mat(0xe76f51), [-0.2, 0.07, 0]);
      tail.rotation.z = -Math.PI / 2;
      return G(body, tail);
    },
    egg: () => { const e = m(new THREE.SphereGeometry(0.075, 14, 10), kit.mat(0xfff6e5, { roughness: 0.4 }), [0, 0.095, 0]); e.scale.y = 1.3; return G(e); },
    broccoli: () => G(m(new THREE.CylinderGeometry(0.035, 0.05, 0.14, 8), kit.mat(0x8bc34a), [0, 0.07, 0]),
      m(new THREE.IcosahedronGeometry(0.09, 0), flat(0x2e7d32), [0, 0.19, 0]),
      m(new THREE.IcosahedronGeometry(0.07, 0), flat(0x388e3c), [0.08, 0.16, 0.02]),
      m(new THREE.IcosahedronGeometry(0.07, 0), flat(0x1b5e20), [-0.07, 0.17, -0.03])),
    carrot: () => {
      const c = m(new THREE.ConeGeometry(0.05, 0.3, 10), kit.mat(0xf28c28), [0, 0.05, 0]);
      c.rotation.z = Math.PI / 2;
      const top = m(new THREE.ConeGeometry(0.04, 0.1, 5), flat(0x4caf50), [0.19, 0.05, 0]);
      top.rotation.z = -Math.PI / 2;
      return G(c, top);
    },
    apple: () => G(m(new THREE.SphereGeometry(0.1, 16, 12), kit.mat(0xd62828, { roughness: 0.45 }), [0, 0.1, 0]),
      m(new THREE.CylinderGeometry(0.008, 0.01, 0.06, 5), kit.mat(0x6b4226), [0, 0.21, 0]),
      m(new THREE.SphereGeometry(0.03, 6, 4).scale(1.4, 0.3, 0.8), flat(0x4caf50), [0.03, 0.22, 0])),
    banana: () => {
      const b = m(new THREE.TorusGeometry(0.15, 0.04, 8, 14, Math.PI * 0.7), kit.mat(0xf6d743), [0, 0.19, 0]);
      b.rotation.z = Math.PI * 1.15;
      return G(b);
    },
    milk: () => G(m(new THREE.CylinderGeometry(0.075, 0.065, 0.24, 16), whiteMat, [0, 0.12, 0]),
      m(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16), kit.mat(0x9cc9f0), [0, 0.25, 0])),
    cheese: () => G(m(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 3, 1, false, 0, Math.PI / 2.5), kit.mat(0xffcc33), [0, 0.05, 0])),
    butter: () => G(m(new THREE.BoxGeometry(0.2, 0.07, 0.12), kit.mat(0xfff1a8), [0, 0.035, 0]),
      m(new THREE.BoxGeometry(0.26, 0.012, 0.16), kit.mat(0xb0bec5), [0, 0.006, 0])),
    cupcake: () => G(m(new THREE.CylinderGeometry(0.09, 0.065, 0.1, 12), kit.mat(0xb07a4f), [0, 0.05, 0]),
      m(new THREE.SphereGeometry(0.095, 14, 8), kit.mat(0xff8fb1), [0, 0.12, 0]),
      m(new THREE.SphereGeometry(0.025, 8, 6), kit.mat(0xd00000), [0, 0.215, 0])),
    can: () => G(m(new THREE.CylinderGeometry(0.065, 0.065, 0.24, 16), kit.mat(0xe63946, { metalness: 0.4, roughness: 0.35 }), [0, 0.12, 0]),
      m(new THREE.CylinderGeometry(0.055, 0.065, 0.02, 16), kit.mat(0xcfd8dc, { metalness: 0.7, roughness: 0.3 }), [0, 0.25, 0]),
      m(new THREE.CylinderGeometry(0.066, 0.066, 0.05, 16), kit.mat(0xffffff), [0, 0.13, 0])),
    crisps: () => { const b = m(new THREE.SphereGeometry(0.12, 12, 8), flat(0xffb703), [0, 0.12, 0]); b.scale.set(1, 1.2, 0.45); return G(b, m(new THREE.BoxGeometry(0.2, 0.025, 0.05), flat(0x3a86ff), [0, 0.25, 0])); },
    water: () => G(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.24, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xe0f4ff, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })).translateY(0.12),
      m(new THREE.CylinderGeometry(0.068, 0.062, 0.18, 16), kit.mat(0x6ec6f5, { transparent: true, opacity: 0.75, roughness: 0.1 }), [0, 0.095, 0])),
  };
}
