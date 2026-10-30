// Food chains: a meadow where energy flows from the Sun to grass (a producer) and on to animals
// (consumers): grass → grasshopper → frog → snake → hawk, and grass → rabbit → fox. Arrows point from
// the food to the eater ("is eaten by") and light up in turn. One link can be taken away to see what
// happens to the others, and decomposers (mushrooms, worms) turn dead leaves back into soil food.
import { rand, paint, makeMushroom, makeFrog, makeTree, tuftGeometry, smooth } from '../_shared/habitat-kit.js';

const SUN = [-7, 6.5, -4];
const GRASS = [-4.2, 0.9];      // grass patch centre (x, z)
const HOPPERS = [-2.6, 1.35];   // grasshoppers
const FROGS = [-0.9, 1.3];
const SNAKES = [1.1, 1.15];
const PERCH = [4.9, 1.1];      // dead tree with the hawk
const RABBIT = [-2.2, -1.4];
const FOX = [0.2, -2.0];
const BUSH = [1.6, -2.6];
const LOG = [3.6, -2.5];

export default function setup({ THREE, scene, kit, ui, label, view, freeRect }) {
  const { clamp, lerp, follow } = kit;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const sky = new THREE.Color(0xdff1ff), dusk = new THREE.Color(0x9fb0c4);
  scene.background = sky.clone();
  kit.stage(scene, { ground: 0x9ccc65, sky: 0xdff1ff, radius: 16 });
  const sunLight = kit.lights(scene, { sun: [-6, 10, 4] });
  const hemi = scene.children.find(o => o.isHemisphereLight);

  // ---------- Sun ----------
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  const sun = kit.mesh(new THREE.SphereGeometry(0.8, 24, 12), sunMat, SUN, scene);
  sun.castShadow = false;
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.3, depthWrite: false });
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 12), glowMat));

  // ---------- Grass (producer) ----------
  const tuftGeo = tuftGeometry(THREE, { h: 0.42, w: 0.045, blades: 7 });
  const grassMat = kit.mat(0x4caf50);
  const green = new THREE.Color(0x4caf50), yellow = new THREE.Color(0xc8b45a);
  const tufts = [];
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4, r = 0.2 + 0.75 * Math.sqrt((i + 0.5) / 16);
    const m = kit.mesh(tuftGeo, grassMat, [GRASS[0] + Math.cos(a) * r, 0, GRASS[1] + Math.sin(a) * r * 0.8], scene);
    m.rotation.y = rand(i) * 6;
    tufts.push({ m, s: 1, to: 1 });
  }
  // A few fixed tufts around the meadow, just for looks.
  const meadowMat = kit.mat(0x5dbb52);
  for (let i = 0; i < 26; i++) {
    const x = -7 + rand(i + 70) * 14, z = -4 + rand(i + 90) * 7.5;
    if (Math.abs(z - 1.2) < 0.7 && x > -5.3 && x < 2) continue; // keep the chain row clear
    kit.mesh(tuftGeo, meadowMat, [x, 0, z], scene).scale.setScalar(0.7);
  }
  // Berry bush (another producer).
  const bush = new THREE.Group();
  bush.position.set(BUSH[0], 0, BUSH[1]);
  scene.add(bush);
  kit.mesh(new THREE.IcosahedronGeometry(0.5, 1), kit.mat(0x3f8f3f, { flatShading: true }), [0, 0.45, 0], bush);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.2, y = 0.3 + rand(i) * 0.4;
    kit.mesh(new THREE.SphereGeometry(0.055, 8, 6), kit.mat(0xd81b60), [Math.cos(a) * 0.45, y, Math.sin(a) * 0.45], bush);
  }
  // Background trees.
  [[-6, -3.5, 2.2], [-1.5, -4.2, 1.8], [6.2, -2.8, 2.0], [6.5, 1.5, 1.6]].forEach(([x, z, h], j) => {
    const t = makeTree(THREE, kit, { kind: j % 2 ? 'pine' : 'round', h, r: 0.6 });
    t.position.set(x, 0, z); scene.add(t);
  });
  // Puddle for the frogs.
  const pud = kit.mesh(new THREE.CircleGeometry(0.55, 24), kit.mat(0x4aa3df, { roughness: 0.15 }), [FROGS[0] - 0.05, 0.01, FROGS[1] - 0.2], scene);
  pud.rotation.x = -Math.PI / 2; pud.scale.y = 0.7; pud.castShadow = false;

  // ---------- Animals ----------
  const builders = makeAnimals(THREE, kit);
  const popGroup = (n, center, build, spread, seed, size) => {
    const list = [];
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group(), inner = build();
      inner.scale.setScalar(size);
      g.add(inner);
      g.userData = inner.userData;
      const a = i * 2.4 + seed, r = i === 0 ? 0 : spread * (0.45 + 0.55 * rand(i + seed));
      g.position.set(center[0] + Math.cos(a) * r, 0, center[1] + Math.sin(a) * r * 0.75);
      g.rotation.y = i === 0 ? 0 : (rand(i * 3 + seed) - 0.5) * 2;
      scene.add(g);
      list.push({ g, s: 1, to: 1, base: g.position.clone() });
    }
    return list;
  };
  const hoppers = popGroup(10, HOPPERS, builders.grasshopper, 0.8, 1, 1.8);
  const frogs = popGroup(4, FROGS, () => makeFrog(THREE, kit), 0.6, 5, 2);
  const snakes = popGroup(3, SNAKES, builders.snake, 0.7, 9, 1.3);
  // Dead tree with the hawk on a branch.
  const perch = new THREE.Group();
  perch.position.set(PERCH[0], 0, PERCH[1]);
  scene.add(perch);
  const bark = kit.mat(0x7a5a40);
  kit.mesh(new THREE.CylinderGeometry(0.09, 0.15, 2.2, 8), bark, [0, 1.1, 0], perch);
  const br = kit.mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.8, 6), bark, [-0.3, 1.75, 0], perch);
  br.rotation.z = 1.2;
  const br2 = kit.mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6), bark, [0.2, 1.95, 0], perch);
  br2.rotation.z = -0.9;
  const hawk = builders.hawk();
  hawk.position.set(PERCH[0] - 0.5, 1.9, PERCH[1]);
  hawk.scale.setScalar(1.5);
  scene.add(hawk);
  const rabbit = builders.rabbit();
  rabbit.position.set(RABBIT[0], 0, RABBIT[1]);
  rabbit.rotation.y = 0.5;
  rabbit.scale.setScalar(1.25);
  scene.add(rabbit);
  const fox = builders.fox();
  fox.position.set(FOX[0], 0, FOX[1]);
  fox.rotation.y = 2.6;
  fox.scale.setScalar(1.25);
  scene.add(fox);

  // ---------- Decomposers: log, mushrooms, worms, dead leaves, new plants ----------
  const log = kit.mesh(new THREE.CylinderGeometry(0.22, 0.25, 1.5, 12), kit.mat(0x6d4c33), [LOG[0], 0.22, LOG[1]], scene);
  log.rotation.z = Math.PI / 2; log.rotation.y = 0.3;
  const logEnd = kit.mesh(new THREE.CircleGeometry(0.22, 12), kit.mat(0xc49a6c), [LOG[0] - 0.75 * Math.cos(0.3) - 0.01, 0.22, LOG[1] + 0.75 * Math.sin(0.3)], scene);
  logEnd.rotation.y = -Math.PI / 2 + 0.3;
  const shrooms = [[-0.4, 0.42, 0.05, 1.2], [0.05, 0.44, 0.1, 1.5], [0.4, 0.4, 0.08, 1.0], [0.75, 0.0, 0.42, 1.3], [-0.2, 0.0, 0.45, 1.1]].map(([dx, y, dz, s]) => {
    const m = makeMushroom(THREE, kit, { s, cap: 0xc0703a });
    m.position.set(LOG[0] + dx, y, LOG[1] + dz);
    scene.add(m);
    return { m, s };
  });
  const soil = kit.mesh(new THREE.CircleGeometry(1.1, 24), kit.mat(0x6b4a2f), [LOG[0] - 0.9, 0.012, LOG[1] + 0.9], scene);
  soil.rotation.x = -Math.PI / 2; soil.scale.y = 0.7; soil.castShadow = false;
  const leafPile = new THREE.Group();
  leafPile.position.set(LOG[0] - 1.0, 0.02, LOG[1] + 0.9);
  scene.add(leafPile);
  const leafCols = [0xc0702a, 0x9a5b2a, 0xd4a03a, 0x8a4a22];
  for (let i = 0; i < 18; i++) {
    const l = kit.mesh(new THREE.CircleGeometry(0.09, 6), kit.mat(leafCols[i % 4], { side: THREE.DoubleSide }), [(rand(i) - 0.5) * 0.6, 0.01 + i * 0.012, (rand(i + 20) - 0.5) * 0.4], leafPile);
    l.rotation.set(-Math.PI / 2 + (rand(i + 5) - 0.5) * 0.6, 0, rand(i + 8) * 6);
    l.scale.y = 1.6;
  }
  const worms = [0, 1, 2].map(j => {
    const w = builders.worm();
    w.position.set(LOG[0] - 1.5 + j * 0.45, 0.03, LOG[1] + 1.25 - j * 0.12);
    w.rotation.y = j * 1.3;
    scene.add(w);
    return w;
  });
  const sprouts = [0, 1, 2, 3].map(j => {
    const m = kit.mesh(tuftGeo, grassMat, [LOG[0] - 0.3 + j * 0.3, 0, LOG[1] + 1.35 + (j % 2) * 0.15], scene);
    return m;
  });
  const nutMat = new THREE.MeshBasicMaterial({ color: 0xffc94d });
  const nutrients = [];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), nutMat); m.visible = false; scene.add(m); nutrients.push(m); }

  // ---------- Arrows: from the food to the eater ----------
  const dimCol = new THREE.Color(0xf4f1e8), litCol = new THREE.Color(0xff9f1c);
  const arrows = {};
  function arrow(key, a, b, lift) {
    const mid = V((a.x + b.x) / 2, Math.max(a.y, b.y) + lift, (a.z + b.z) / 2);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const m = new THREE.MeshStandardMaterial({ color: dimCol.clone(), emissive: 0x000000, transparent: true, opacity: 0.9, roughness: 0.5 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.035, 6), m);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 10), m);
    const tan = curve.getTangent(1);
    head.position.copy(b);
    head.quaternion.setFromUnitVectors(V(0, 1, 0), tan);
    head.position.addScaledVector(tan, 0.06);
    const g = new THREE.Group();
    g.add(tube, head);
    scene.add(g);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff3a0 }));
    dot.visible = false;
    scene.add(dot);
    arrows[key] = { g, m, curve, dot, lit: 0, to: 0, fade: 1, fadeTo: 1 };
  }
  arrow('sun', V(SUN[0] + 0.7, SUN[1] - 0.6, SUN[2] + 0.4), V(GRASS[0] - 0.1, 0.75, GRASS[1] - 0.1), 0);
  arrow('grass-hopper', V(GRASS[0] + 0.45, 0.5, GRASS[1] + 0.25), V(HOPPERS[0] - 0.42, 0.45, HOPPERS[1]), 0.55);
  arrow('hopper-frog', V(HOPPERS[0] + 0.38, 0.45, HOPPERS[1]), V(FROGS[0] - 0.32, 0.45, FROGS[1]), 0.55);
  arrow('frog-snake', V(FROGS[0] + 0.32, 0.45, FROGS[1]), V(SNAKES[0] - 0.62, 0.32, SNAKES[1]), 0.55);
  arrow('snake-hawk', V(SNAKES[0] + 0.72, 0.32, SNAKES[1]), V(PERCH[0] - 0.85, 1.8, PERCH[1] + 0.05), 0.5);
  arrow('grass-rabbit', V(GRASS[0] + 0.25, 0.5, GRASS[1] - 0.55), V(RABBIT[0] - 0.5, 0.55, RABBIT[1] + 0.1), 0.5);
  arrow('rabbit-fox', V(RABBIT[0] + 0.5, 0.6, RABBIT[1]), V(FOX[0] - 0.55, 0.7, FOX[1] + 0.05), 0.55);
  arrow('bush-fox', V(BUSH[0] - 0.45, 0.65, BUSH[1] + 0.2), V(FOX[0] + 0.5, 0.75, FOX[1] - 0.1), 0.35);
  const CHAIN1 = ['sun', 'grass-hopper', 'hopper-frog', 'frog-snake', 'snake-hawk'];
  const CHAIN2 = ['sun', 'grass-rabbit', 'rabbit-fox'];
  const EATER = { sun: null, 'grass-hopper': hoppers[0].g, 'hopper-frog': frogs[0].g, 'frog-snake': snakes[0].g, 'snake-hawk': hawk, 'grass-rabbit': rabbit, 'rabbit-fox': fox, 'bush-fox': fox };
  const SAY = {
    sun: 'Sunlight gives the <b>grass</b> energy to make its own food.',
    'grass-hopper': 'The grass <b>is eaten by</b> the grasshopper.',
    'hopper-frog': 'The grasshopper <b>is eaten by</b> the frog.',
    'frog-snake': 'The frog <b>is eaten by</b> the snake.',
    'snake-hawk': 'The snake <b>is eaten by</b> the hawk.',
    'grass-rabbit': 'The grass <b>is eaten by</b> the rabbit.',
    'rabbit-fox': 'The rabbit <b>is eaten by</b> the fox.',
  };

  // Sunlight beams to the grass (step 1).
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.55, depthWrite: false });
  const beams = [[-4.6, 0.4, 0.6], [-4.0, 0.4, 1.2], [-3.7, 0.4, 0.5]].map(([x, y, z]) => {
    const a = V(...SUN), b = V(x, y, z), d = V(0, 0, 0).subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6).translate(0, 0.5, 0), beamMat);
    m.position.copy(a); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    scene.add(m);
    return { m, a, b };
  });
  const sparks = [];
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6c0 })); m.visible = false; scene.add(m); sparks.push(m); }

  // ---------- Labels ----------
  const tagAt = (x, y, z) => V(x, y, z);
  const tags = {
    sun: label('Sun', sun, { cls: 'warm' }),
    grass: label('Grass', tagAt(GRASS[0] - 0.1, -0.05, GRASS[1] + 1.0)),
    bush: label('Berry bush', tagAt(BUSH[0], 1.05, BUSH[1])),
    hopper: label('Grasshopper', tagAt(HOPPERS[0], 0.75, HOPPERS[1])),
    frog: label('Frog', tagAt(FROGS[0], -0.05, FROGS[1] + 0.75)),
    snake: label('Snake', tagAt(SNAKES[0] + 0.3, 0.7, SNAKES[1])),
    hawk: label('Hawk', tagAt(PERCH[0] - 0.5, 2.75, PERCH[1])),
    rabbit: label('Rabbit', tagAt(RABBIT[0], 1.0, RABBIT[1])),
    fox: label('Fox', tagAt(FOX[0], 1.1, FOX[1])),
    mush: label('Mushrooms', tagAt(LOG[0] + 0.1, 0.75, LOG[1])),
    worm: label('Worms', tagAt(LOG[0] - 1.1, 0.12, LOG[1] + 1.25), { cls: 'warm' }),
    leaves: label('Dead leaves', tagAt(LOG[0] - 1.0, 0.3, LOG[1] + 0.85)),
    sprout: label('New plants', tagAt(LOG[0] + 0.15, 0.45, LOG[1] + 1.45), { cls: 'cool' }),
  };
  const NAMES = { grass: 'Grass', bush: 'Berry bush', hopper: 'Grasshopper', frog: 'Frog', snake: 'Snake', hawk: 'Hawk', rabbit: 'Rabbit', fox: 'Fox' };
  const showTags = names => { for (const [n, l] of Object.entries(tags)) { l.show(names.includes(n)); if (NAMES[n]) l.text = NAMES[n]; l.el.className = 'lab' + (n === 'sun' || n === 'worm' ? ' warm' : n === 'sprout' ? ' cool' : ''); } };

  // ---------- State ----------
  const st = { step: 0, quiz: false, time: 0, sunlight: 1, sunTo: 1, grassH: 1, grassHTo: 1, auto: false, mode: -1, chain: null, chainT: 0, plan: [], scen: 'normal', decay: -1, hops: new Map() };
  const animalsOf = { hopper: [hoppers[0].g], frog: [frogs[0].g], snake: [snakes[0].g], hawk: [hawk], rabbit: [rabbit], fox: [fox], grass: tufts.map(t => t.m), bush: [bush] };
  const pulsing = new Set();
  for (const list of Object.values(animalsOf)) for (const o of list) o.userData.s0 = o.scale.clone();
  const setPulse = keys => { for (const o of pulsing) o.scale.copy(o.userData.s0); pulsing.clear(); for (const k of keys) for (const o of animalsOf[k]) pulsing.add(o); };
  const light = (keys, on = 1) => { for (const k of Object.keys(arrows)) arrows[k].to = keys.includes(k) ? on : 0; };
  const hop = g => st.hops.set(g, 0);

  // Step 2 groups and step 3 modes.
  const KINDS = [
    { btn: 'Producers', keys: ['grass', 'bush'], text: 'Producer', say: 'Plants are <b>producers</b>: they make their own food using sunlight.', arrows: [] },
    { btn: 'Consumers', keys: ['hopper', 'frog', 'snake', 'hawk', 'rabbit', 'fox'], text: null, say: 'Animals are <b>consumers</b>: they get their energy by eating plants or other animals.', arrows: [] },
  ];
  const DIETS = [
    { btn: 'Herbivores', keys: ['hopper', 'rabbit'], text: 'Herbivore', say: '<b>Herbivores</b> eat only plants. The grasshopper and the rabbit eat grass.', arrows: ['grass-hopper', 'grass-rabbit'] },
    { btn: 'Carnivores', keys: ['frog', 'snake', 'hawk'], text: 'Carnivore', say: '<b>Carnivores</b> eat other animals. The frog, the snake and the hawk are carnivores.', arrows: ['hopper-frog', 'frog-snake', 'snake-hawk'] },
    { btn: 'Omnivores', keys: ['fox'], text: 'Omnivore', say: '<b>Omnivores</b> eat both plants and animals. A fox eats rabbits and mice, and also berries and fruit.', arrows: ['rabbit-fox', 'bush-fox'] },
  ];
  function pickGroup(list, j) {
    st.mode = j;
    const g = list[j];
    showTags(g.keys);
    if (g.text) for (const k of g.keys) tags[k].text = g.text;
    setPulse(g.keys);
    light(g.arrows);
    ui.readout(g.say);
  }

  const CHAIN_TAGS = list => (list === CHAIN1 ? ['sun', 'grass', 'hopper', 'frog', 'snake', 'hawk'] : ['sun', 'grass', 'rabbit', 'fox']);
  function playChain(list) {
    st.chain = list; st.chainT = 0; st.lastSay = null;
    light([]);
    for (const a of Object.values(arrows)) { a.lit = 0; a.hopped = false; }
    showTags(CHAIN_TAGS(list));
  }

  // Step 5: take away one link. Counts are how many of each we see after the change.
  const SCEN = {
    normal: { n: [16, 6, 3, 2], h: 1, tags: ['Grass', 'Grasshoppers', 'Frogs', 'Snakes', 'Hawk'], gone: null,
      say: 'Many grasshoppers, fewer frogs, fewer snakes, one hawk. Only a small part of the energy passes up each link, so there are fewer animals higher up.' },
    hopper: { n: [16, 0, 1, 1], h: 1.35, tags: ['Grass grows tall', 'Gone', 'Fewer frogs', 'Fewer snakes', 'Hawk: less food'], gone: 'hopper',
      say: 'No grasshoppers: nothing eats the grass, so it grows tall. The frogs have little to eat, so there are fewer frogs. Then the snakes and the hawk have less food too.' },
    frog: { n: [9, 10, 0, 1], h: 0.55, tags: ['Less grass', 'More grasshoppers', 'Gone', 'Fewer snakes', 'Hawk: less food'], gone: 'frog',
      say: 'No frogs: nothing eats the grasshoppers, so there are many more of them, and they eat the grass down. The snakes lose their food, so there are fewer snakes, and the hawk has less to eat.' },
    snake: { n: [16, 3, 4, 0], h: 1.15, tags: ['More grass', 'Fewer grasshoppers', 'More frogs', 'Gone', 'Hawk: less food'], gone: 'snake',
      say: 'No snakes: more frogs survive, so they eat more grasshoppers. With fewer grasshoppers, more grass is left. The hawk loses its food.' },
  };
  const ARROW_SPECIES = { 'grass-hopper': ['hopper'], 'hopper-frog': ['hopper', 'frog'], 'frog-snake': ['frog', 'snake'], 'snake-hawk': ['snake'] };
  function scenario(key) {
    st.scen = key;
    const s = SCEN[key];
    tufts.forEach((t, i) => { t.to = i < s.n[0] ? 1 : 0; });
    st.grassHTo = s.h;
    hoppers.forEach((o, i) => { o.to = i < s.n[1] ? 1 : 0; });
    frogs.forEach((o, i) => { o.to = i < s.n[2] ? 1 : 0; });
    snakes.forEach((o, i) => { o.to = i < s.n[3] ? 1 : 0; });
    showTags(['grass', 'hopper', 'frog', 'snake', 'hawk']);
    ['grass', 'hopper', 'frog', 'snake', 'hawk'].forEach((k, i) => { tags[k].text = s.tags[i]; tags[k].el.className = 'lab' + (s.tags[i] === 'Gone' ? ' warm' : ''); });
    for (const k of Object.keys(arrows)) arrows[k].fadeTo = (ARROW_SPECIES[k] || []).includes(s.gone) ? 0.15 : 1;
    light(CHAIN1, key === 'normal' ? 1 : 0.6);
    ui.readout(s.say);
  }
  function resetPops() {
    scenario('normal');
    for (const list of [tufts, hoppers, frogs, snakes]) list.forEach(o => { o.s = o.to; });
    for (const a of Object.values(arrows)) a.fade = a.fadeTo = 1;
    st.grassH = st.grassHTo;
  }
  // Starting picture outside step 5: one of each animal in the chain plus all the grass.
  function showSingles() {
    tufts.forEach(t => { t.to = t.s = 1; });
    [hoppers, frogs, snakes].forEach(list => list.forEach((o, i) => { o.to = o.s = i === 0 ? 1 : 0; }));
    st.grassH = st.grassHTo = 1;
  }

  const views = {
    sun: { radius: 4.6, yaw: 0.35, pitch: 0.25, target: [-5.4, 3.0, -1.2] },
    meadow: { halfW: 5.2, halfH: 2.4, yaw: 0, pitch: 0.45, target: [0.1, 0.5, -0.5] },
    chain: { halfW: 5.1, halfH: 2.6, yaw: 0, pitch: 0.3, target: [0.15, 1.1, 0.7] },
    pops: { halfW: 5.1, halfH: 2.2, yaw: 0.08, pitch: 0.38, target: [0.05, 0.7, 0.9] },
    decomp: { radius: 1.9, yaw: -0.25, pitch: 0.75, target: [LOG[0] - 0.5, 0.35, LOG[1] + 0.8] },
    all: { halfW: 5.2, halfH: 2.8, yaw: -0.2, pitch: 0.45, target: [-0.2, 0.6, -0.5] },
  };

  // Wide, flat views: the engine fits a sphere into the shorter side of the free area, so on a wide
  // screen we can come closer and still keep the whole row of living things in view.
  function fit(o) {
    if (!o.halfW) return o;
    const f = freeRect(), w = f.r - f.l, h = f.b - f.t;
    return { ...o, radius: Math.max(o.halfH, (1.05 * o.halfW * Math.min(w, h)) / w) };
  }

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(fit(o), instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: false, mode: -1, chain: null, plan: [], decay: -1 });
      st.sunlight = st.sunTo = 1;
      st.hops.clear();
      setPulse([]); light([]);
      for (const a of Object.values(arrows)) { a.lit = 0; a.fade = a.fadeTo = 1; }
      showSingles();
      showTags([]);
      for (const b of beams) b.m.visible = false;
      decayPose(i === 5 ? 0 : 1);
      if (i === 0) {
        go(views.sun); showTags(['sun', 'grass']);
        for (const b of beams) b.m.visible = true;
        light(['sun']);
        ui.slider({ label: 'Sunlight', min: 0, max: 100, step: 1, value: 100, unit: '%', onInput: v => { st.sunTo = v / 100; sayLight(); } });
        sayLight();
      }
      if (i === 1) {
        go(views.meadow); st.auto = true; pickGroup(KINDS, 0);
        ui.buttons(KINDS.map((k, j) => ({ label: k.btn, on: j === 0, onClick: () => { st.auto = false; pickGroup(KINDS, j); } })));
      }
      if (i === 2) {
        go(views.meadow); st.auto = true; pickGroup(DIETS, 0);
        ui.buttons(DIETS.map((k, j) => ({ label: k.btn, on: j === 0, onClick: () => { st.auto = false; pickGroup(DIETS, j); } })));
      }
      if (i === 3) {
        go(views.chain);
        st.auto = true; playChain(CHAIN1);
        ui.buttons([
          { label: 'Play chain 1', on: true, onClick: () => { st.auto = false; playChain(CHAIN1); } },
          { label: 'Play chain 2', onClick: () => { st.auto = false; playChain(CHAIN2); } },
        ]);
      }
      if (i === 4) {
        go(views.pops);
        resetPops();
        st.auto = true; st.plan = [[1.2, () => scenario('frog')], [7.5, () => scenario('normal')], [11, () => scenario('hopper')], [17.5, () => scenario('normal')], [21, () => scenario('snake')]];
        ui.buttons([
          { label: 'Take away grasshoppers', onClick: () => { st.auto = false; scenario('hopper'); } },
          { label: 'Take away frogs', onClick: () => { st.auto = false; scenario('frog'); } },
          { label: 'Take away snakes', onClick: () => { st.auto = false; scenario('snake'); } },
          { label: 'Put them all back', onClick: () => { st.auto = false; scenario('normal'); } },
        ]);
      }
      if (i === 5) {
        go(views.decomp); showTags(['mush', 'worm', 'leaves', 'sprout']);
        st.decay = 0; st.auto = true;
        ui.buttons([{ label: 'Speed up time', onClick: () => { st.auto = false; st.decay = 0; } }]);
        ui.readout('Watch the pile of dead leaves.');
      }
      if (isQuiz) { go(views.all); light(CHAIN1.concat(['grass-rabbit', 'rabbit-fox']), 0.7); }
    },

    update(dt, t) {
      dt = Math.max(0, dt); // the first frame after loading can report a tiny negative step
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) { const [, fn] = st.plan.shift(); if (st.auto) fn(); }

      // Sunlight: grass grows and greens with more light.
      follow(st, 'sunlight', st.sunTo, dt, 3);
      const S = st.sunlight;
      sunMat.color.setHex(0xffd34d).multiplyScalar(0.3 + 0.7 * S);
      glowMat.opacity = 0.3 * S;
      sunLight.intensity = 0.6 + 1.6 * S; hemi.intensity = 0.9 + 0.7 * S;
      scene.background.copy(dusk).lerp(sky, S);
      beamMat.opacity = 0.55 * S;
      grassMat.color.copy(yellow).lerp(green, smooth(0.05, 0.6, S));
      sparks.forEach((m, j) => {
        m.visible = st.step === 0 && S > 0.05;
        if (!m.visible) return;
        const b = beams[j % 3], u = (st.time * 0.45 + j / sparks.length) % 1;
        m.position.lerpVectors(b.a, b.b, u);
      });

      // Group cycling (steps 2 and 3).
      if (st.auto && (st.step === 1 || st.step === 2)) {
        const list = st.step === 1 ? KINDS : DIETS, j = Math.floor(Math.max(0, st.time) / 3.6) % list.length;
        if (j !== st.mode) pickGroup(list, j);
      }
      const pk = 1 + 0.12 * Math.sin(st.time * 6);
      for (const o of pulsing) o.scale.copy(o.userData.s0).multiplyScalar(pk);

      // Chain playback: one arrow after another, a glowing dot runs from food to eater.
      for (const a of Object.values(arrows)) a.dot.visible = false;
      if (st.chain) {
        st.chainT += dt;
        const k = Math.floor(st.chainT / 1.2), u = (st.chainT % 1.2) / 1.2;
        if (k < st.chain.length) {
          const key = st.chain[k], a = arrows[key];
          a.to = 1;
          a.dot.visible = true;
          a.curve.getPointAt(Math.min(1, u * 1.25), a.dot.position);
          if (u * 1.25 >= 1 && !a.hopped) { a.hopped = true; if (EATER[key]) hop(EATER[key]); }
          if (key !== st.lastSay) { st.lastSay = key; ui.readout(SAY[key]); }
        } else if (st.chainT > st.chain.length * 1.2 + 2.5) {
          playChain(st.auto ? (st.chain === CHAIN1 ? CHAIN2 : CHAIN1) : st.chain); // replay (taking turns while it runs by itself)
        }
      }
      for (const a of Object.values(arrows)) {
        follow(a, 'lit', a.to, dt, 5);
        follow(a, 'fade', a.fadeTo, dt, 3);
        a.m.color.copy(dimCol).lerp(litCol, a.lit);
        a.m.emissive.setRGB(0.45 * a.lit, 0.22 * a.lit, 0);
        a.m.opacity = (0.55 + 0.4 * a.lit) * a.fade;
        a.g.visible = st.step !== 5 || st.quiz;
      }
      arrows.sun.g.visible = arrows.sun.g.visible && (st.step === 0 || st.step === 3 || st.quiz);

      // Eaters give a little hop when food arrives.
      for (const [g, h] of st.hops) {
        const nh = h + dt;
        st.hops.set(g, nh);
        const base = g === hawk ? 1.9 : 0;
        g.position.y = base + Math.sin(Math.min(1, nh / 0.45) * Math.PI) * (g === hawk ? 0.25 : 0.15);
        if (g === hawk) hawk.userData.flap = nh < 0.6;
        if (nh > 0.45) { g.position.y = base; st.hops.delete(g); }
      }
      hawk.userData.wings.forEach((w, j) => { w.rotation.x = (j ? -1 : 1) * (hawk.userData.flap ? 0.3 + Math.sin(t * 20) * 0.5 : 0.15); });
      // Small idle motions.
      rabbit.userData.ears.forEach((e, j) => { e.rotation.z = Math.sin(t * 2 + j) * 0.12; });
      fox.userData.tail.rotation.y = Math.sin(t * 1.6) * 0.3;
      snakes.forEach((o, j) => { o.g.rotation.y = (j === 0 ? 0 : (rand(j * 3 + 9) - 0.5) * 2) + Math.sin(t * 1.2 + j) * 0.15; });
      if (st.step === 1 || st.step === 2) { hoppers[0].g.userData.head.rotation.z = Math.max(0, Math.sin(t * 6)) * 0.3; rabbit.userData.head.rotation.z = -Math.max(0, Math.sin(t * 4)) * 0.25; }

      // Population sizes grow and shrink smoothly (step 5).
      follow(st, 'grassH', st.grassHTo, dt, 1.5);
      tufts.forEach((o, j) => {
        follow(o, 's', o.to, dt, 1.5);
        o.m.visible = o.s > 0.02;
        o.m.scale.set(o.s, o.s * (0.35 + 0.65 * smooth(0, 0.7, S)) * st.grassH, o.s);
        if (pulsing.has(o.m)) o.m.scale.multiplyScalar(pk);
      });
      for (const list of [hoppers, frogs, snakes]) list.forEach((o, j) => {
        follow(o, 's', o.to, dt, 1.5);
        o.g.visible = o.s > 0.02;
        if (!pulsing.has(o.g)) o.g.scale.setScalar(o.s);
        if (list === hoppers && j > 0 && o.g.visible) o.g.position.y = Math.max(0, Math.sin(t * 3 + j * 1.7)) * 0.08;
      });
      hawk.userData.sad = st.scen !== 'normal' && st.step === 4;
      hawk.userData.head.rotation.z = hawk.userData.sad ? -0.35 : 0;

      // Decomposers: the leaf pile shrinks, mushrooms grow, food for plants goes into the soil.
      if (st.decay >= 0) {
        st.decay += dt;
        const u = clamp(st.decay / 6, 0, 1);
        decayPose(u);
        nutrients.forEach((m, j) => {
          const p = (st.decay * 0.5 + j / nutrients.length) % 1;
          m.visible = u > 0.05 && u < 1;
          const sp = sprouts[j % sprouts.length].position;
          m.position.set(lerp(leafPile.position.x, sp.x, p), 0.06 + Math.sin(p * Math.PI) * 0.12 - 0.04, lerp(leafPile.position.z, sp.z, p));
        });
        if (st.decay > 8.5 && st.auto) st.decay = 0;
        if (u > 0.05 && u < 1 && !st.saidDecay) { st.saidDecay = true; ui.readout('Mushrooms and worms are <b>breaking down</b> the dead leaves.'); }
        if (u >= 1 && st.saidDecay) { st.saidDecay = false; ui.readout('The leaves are gone. Their nutrients are back in the <b>soil</b>, and new plants grow.'); }
        worms.forEach((w, j) => { w.userData.segs.forEach((s, k) => { s.position.z = Math.sin(t * 5 + k * 0.9 + j) * 0.02; }); });
      } else nutrients.forEach(m => { m.visible = false; });
      return true;
    },
  };

  function sayLight() {
    const v = st.sunTo;
    ui.readout(v > 0.6 ? 'Lots of sunlight: the grass makes plenty of food and grows well.' : v > 0.1 ? 'Less sunlight: the grass makes less food and grows slowly.' : 'No sunlight: the grass cannot make food. With no food, it cannot grow.');
  }
  // u = 0: fresh dead leaves, small mushrooms, no new plants. u = 1: leaves gone, mushrooms big, new plants grown.
  function decayPose(u) {
    leafPile.scale.set(1 - 0.85 * u, 1 - 0.9 * u, 1 - 0.85 * u);
    leafPile.visible = u < 0.98;
    shrooms.forEach(({ m }, j) => m.scale.setScalar(0.5 + 0.6 * smooth(0, 0.6, u + j * 0.05)));
    sprouts.forEach((m, j) => { const g = smooth(0.4, 1, u - j * 0.04); m.scale.set(0.3 + 0.7 * g, 0.05 + 0.95 * g, 0.3 + 0.7 * g); });
  }
}

// Animal builders. Each faces +x and stands on y = 0.
function makeAnimals(THREE, kit) {
  const M = (geo, mat, pos, parent, scale) => { const m = kit.mesh(geo, mat, pos, parent); if (scale) m.scale.set(...scale); return m; };
  const eyeMat = kit.mat(0x111111);
  const snakeTex = paint(THREE, 256, 32, (g, w, h) => {
    g.fillStyle = '#7f9a3a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4e6420';
    for (let x = 0; x < w; x += 20) g.fillRect(x, 0, 9, h);
  });
  return {
    grasshopper() {
      const g = new THREE.Group(), c = kit.mat(0x7cb342), d = kit.mat(0x558b2f);
      M(new THREE.CapsuleGeometry(0.045, 0.16, 3, 8), c, [0, 0.09, 0], g).rotation.z = Math.PI / 2;
      const head = new THREE.Group(); head.position.set(0.12, 0.1, 0); g.add(head);
      M(new THREE.SphereGeometry(0.045, 10, 8), c, [0.02, 0, 0], head, [1, 1.15, 0.9]);
      for (const z of [-1, 1]) {
        M(new THREE.SphereGeometry(0.015, 6, 4), eyeMat, [0.045, 0.02, z * 0.03], head);
        const ant = M(new THREE.CylinderGeometry(0.004, 0.004, 0.15, 4), d, [0.03, 0.08, z * 0.02], head);
        ant.rotation.z = -0.7; ant.rotation.x = z * 0.25;
        const leg = M(new THREE.CylinderGeometry(0.012, 0.01, 0.17, 5), d, [-0.04, 0.1, z * 0.05], g);
        leg.rotation.z = 1.0;
        const shin = M(new THREE.CylinderGeometry(0.008, 0.006, 0.17, 5), d, [-0.08, 0.05, z * 0.06], g);
        shin.rotation.z = -0.9;
        for (const x of [0.05, 0.1]) M(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 4), d, [x, 0.04, z * 0.04], g);
      }
      g.userData.head = head;
      return g;
    },
    snake() {
      const g = new THREE.Group();
      const pts = [];
      for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3(-0.45 + i * 0.075, 0.045, Math.sin(i * 0.75) * 0.11));
      const skin = kit.mat(0xffffff, { map: snakeTex });
      M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 6), skin, [0, 0, 0], g);
      const end = pts[pts.length - 1];
      M(new THREE.SphereGeometry(0.06, 10, 8), kit.mat(0x7f9a3a), [end.x + 0.04, 0.055, end.z], g, [1.4, 0.8, 1]);
      for (const z of [-1, 1]) M(new THREE.SphereGeometry(0.012, 6, 4), eyeMat, [end.x + 0.08, 0.08, end.z + z * 0.03], g);
      M(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 4), kit.mat(0xd62828), [end.x + 0.15, 0.05, end.z], g).rotation.z = Math.PI / 2;
      return g;
    },
    hawk() {
      const g = new THREE.Group(), brown = kit.mat(0x7b4f2c), light = kit.mat(0xe8d6b0);
      M(new THREE.SphereGeometry(0.14, 12, 10), brown, [0, 0.16, 0], g, [0.9, 1.35, 0.85]);
      M(new THREE.SphereGeometry(0.1, 10, 8), light, [0.06, 0.12, 0], g, [0.7, 1.1, 0.75]);
      const head = new THREE.Group(); head.position.set(0.03, 0.36, 0); g.add(head);
      M(new THREE.SphereGeometry(0.075, 12, 8), brown, [0, 0, 0], head);
      const beak = M(new THREE.ConeGeometry(0.025, 0.07, 6), kit.mat(0xf2b134), [0.08, -0.01, 0], head);
      beak.rotation.z = -Math.PI / 2 - 0.4;
      for (const z of [-1, 1]) M(new THREE.SphereGeometry(0.014, 6, 4), eyeMat, [0.05, 0.02, z * 0.045], head);
      const wings = [-1, 1].map(z => {
        const w = new THREE.Group(); w.position.set(-0.02, 0.24, z * 0.1); g.add(w);
        M(new THREE.BoxGeometry(0.3, 0.03, 0.12), brown, [-0.08, 0, z * 0.05], w).rotation.z = 1.1;
        return w;
      });
      const tail = M(new THREE.BoxGeometry(0.16, 0.02, 0.1), brown, [-0.14, 0.02, 0], g);
      tail.rotation.z = 0.9;
      for (const z of [-1, 1]) M(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 4), kit.mat(0xf2b134), [0.02, -0.02, z * 0.04], g);
      g.userData = { wings, head, flap: false };
      return g;
    },
    rabbit() {
      const g = new THREE.Group(), fur = kit.mat(0xa58b6f), pale = kit.mat(0xefe6da);
      M(new THREE.SphereGeometry(0.2, 14, 10), fur, [0, 0.2, 0], g, [1.3, 1, 0.95]);
      const head = new THREE.Group(); head.position.set(0.24, 0.34, 0); g.add(head);
      M(new THREE.SphereGeometry(0.11, 12, 10), fur, [0, 0, 0], head, [1.15, 1, 0.95]);
      for (const z of [-1, 1]) M(new THREE.SphereGeometry(0.018, 6, 4), eyeMat, [0.08, 0.03, z * 0.07], head);
      M(new THREE.SphereGeometry(0.02, 6, 4), kit.mat(0xe57373), [0.125, -0.01, 0], head);
      const ears = [-1, 1].map(z => {
        const e = new THREE.Group(); e.position.set(-0.02, 0.08, z * 0.04); head.add(e);
        M(new THREE.CapsuleGeometry(0.03, 0.18, 3, 8), fur, [0, 0.12, 0], e, [1, 1, 0.5]);
        return e;
      });
      M(new THREE.SphereGeometry(0.06, 8, 6), pale, [-0.27, 0.23, 0], g);
      for (const z of [-1, 1]) {
        M(new THREE.SphereGeometry(0.07, 8, 6), fur, [-0.1, 0.06, z * 0.12], g, [1.6, 0.6, 0.8]);
        M(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 5), fur, [0.15, 0.07, z * 0.07], g);
      }
      g.userData = { ears, head };
      return g;
    },
    fox() {
      const g = new THREE.Group(), orange = kit.mat(0xd9692a), white = kit.mat(0xf5ede0), dark = kit.mat(0x3a2a20);
      M(new THREE.SphereGeometry(0.22, 14, 10), orange, [0, 0.36, 0], g, [1.6, 0.85, 0.8]);
      const head = new THREE.Group(); head.position.set(0.38, 0.5, 0); g.add(head);
      M(new THREE.SphereGeometry(0.11, 12, 10), orange, [0, 0, 0], head);
      const snout = M(new THREE.ConeGeometry(0.06, 0.16, 8), white, [0.13, -0.03, 0], head);
      snout.rotation.z = -Math.PI / 2;
      M(new THREE.SphereGeometry(0.02, 6, 4), dark, [0.21, -0.03, 0], head);
      for (const z of [-1, 1]) {
        M(new THREE.ConeGeometry(0.04, 0.1, 6), orange, [-0.01, 0.12, z * 0.06], head);
        M(new THREE.SphereGeometry(0.015, 6, 4), eyeMat, [0.08, 0.03, z * 0.055], head);
      }
      for (const x of [-0.2, 0.2]) for (const z of [-0.09, 0.09]) M(new THREE.CylinderGeometry(0.03, 0.025, 0.28, 6), dark, [x, 0.14, z], g);
      const tail = new THREE.Group(); tail.position.set(-0.32, 0.38, 0); g.add(tail);
      const tb = M(new THREE.SphereGeometry(0.09, 10, 8), orange, [-0.15, -0.02, 0], tail, [2.2, 0.9, 0.9]);
      tb.rotation.z = 0.35;
      M(new THREE.SphereGeometry(0.06, 8, 6), white, [-0.34, -0.09, 0], tail);
      g.userData = { tail, head };
      return g;
    },
    worm() {
      const g = new THREE.Group(), pink = kit.mat(0xd98a8a), segs = [];
      for (let k = 0; k < 7; k++) segs.push(M(new THREE.SphereGeometry(0.028, 8, 6), pink, [k * 0.04, 0.02, 0], g, [1.4, 1, 1]));
      g.userData.segs = segs;
      return g;
    },
  };
}
