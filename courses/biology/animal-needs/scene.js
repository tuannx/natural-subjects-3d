// What animals need: a small farm with a pond. A rabbit, a bird and a fish each get food, water,
// air and shelter in their own way. Buttons send food, fill the water bowl, show breathing and
// bring rain so the animals hurry to their shelters.
import { rabbit, bird, fish, carrot, seeds, worm } from '../_shared/critters.js';
import { rand } from '../_shared/leaf.js';

const POND = { x: 2.3, z: 0.2, r: 1.45, depth: 0.75, water: -0.06 };
const SPOT = {
  rabbit: [-0.35, 0, 0.75], bird: [-1.85, 0, 0.95], fishAir: [2.15, -0.3, 0.55],
  carrot: [0.75, 0, 1.15], seeds: [-1.05, 0, 1.45], worm: [1.9, -0.3, 0.8],
  bowl: [-0.95, 0, 2.15], burrow: [-0.5, 0, -1.55], hole: [-0.5, 0, -0.62],
  nest: [-2.1, 1.5, -0.35], weeds: [2.95, -0.38, -0.25],
};
const SIZE = { rabbit: 1.5, bird: 1.7, fish: 1.5 }; // the animals are drawn a bit big so children can see them
const NEEDS = ['food', 'water', 'air', 'shelter'];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const V = (a) => new THREE.Vector3(...a);
  const flat = (c, o) => kit.mat(c, { flatShading: true, ...o });
  const sky = new THREE.Color(0xd8efff), rainSky = new THREE.Color(0x9fb3c4);
  scene.background = sky.clone();
  kit.lights(scene, { sun: [4, 9, 6] });

  // Grass with a round hole for the pond.
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 9, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(POND.x, -POND.z, POND.r, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const groundGeo = new THREE.ShapeGeometry(shape, 40).rotateX(-Math.PI / 2);
  kit.mesh(groundGeo, kit.mat(0x9fd67f), [0, 0, 0], scene).castShadow = false;

  // Pond: a shallow bowl under the grass, clear water on top, stones round the edge, water plants.
  const bowl = kit.mesh(new THREE.SphereGeometry(POND.r, 28, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    kit.mat(0x5b7f6a, { side: THREE.BackSide }), [POND.x, 0, POND.z], scene);
  bowl.scale.y = POND.depth / POND.r;
  bowl.castShadow = false;
  const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 32).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x4aa8e0, transparent: true, opacity: 0.42, roughness: 0.1, depthWrite: false }));
  water.position.set(POND.x, POND.water, POND.z);
  water.renderOrder = 2;
  scene.add(water);
  const stoneGeo = new THREE.DodecahedronGeometry(0.13, 0), stoneMat = flat(0x9a9a92);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const s = kit.mesh(stoneGeo, stoneMat, [POND.x + Math.cos(a) * (POND.r + 0.05), 0.02, POND.z + Math.sin(a) * (POND.r + 0.05)], scene);
    s.scale.set(1 + rand(i) * 0.5, 0.6, 1 + rand(i + 9) * 0.4);
    s.rotation.y = rand(i + 3) * 3;
  }
  const weedMat = flat(0x3f8f3a), weedGeo = new THREE.ConeGeometry(0.05, 0.85, 4);
  for (let i = 0; i < 7; i++) {
    const w = kit.mesh(weedGeo, weedMat, [SPOT.weeds[0] - 0.25 + rand(i + 40) * 0.5, -0.32, SPOT.weeds[2] - 0.3 + rand(i + 50) * 0.35], scene);
    w.rotation.set((rand(i + 60) - 0.5) * 0.4, 0, (rand(i + 70) - 0.5) * 0.4);
  }
  const pad = kit.mesh(new THREE.CircleGeometry(0.22, 12, 0.3, Math.PI * 1.85).rotateX(-Math.PI / 2), flat(0x5aae4a, { side: THREE.DoubleSide }), [1.6, POND.water + 0.01, -0.35], scene);
  pad.castShadow = false;

  // Tree with a nest on a low branch.
  const bark = flat(0x8a5a35), leafy = flat(0x4f9e44);
  kit.mesh(new THREE.CylinderGeometry(0.13, 0.2, 2.3, 7), bark, [-2.7, 1.15, -1.05], scene);
  const branch = kit.mesh(new THREE.CylinderGeometry(0.045, 0.07, 1.0, 5), bark, [-2.4, 1.35, -0.7], scene);
  branch.rotation.set(0.85, 0, -0.6);
  [[-2.7, 2.75, -1.15, 0.85], [-3.25, 2.45, -1.2, 0.6], [-2.2, 2.5, -1.35, 0.6], [-2.75, 3.25, -1.1, 0.55]].forEach(([x, y, z, r]) =>
    kit.mesh(new THREE.IcosahedronGeometry(r, 0), leafy, [x, y, z], scene));
  const nest = new THREE.Group();
  nest.position.set(SPOT.nest[0], SPOT.nest[1] - 0.06, SPOT.nest[2]);
  scene.add(nest);
  const twig = flat(0xa9784a);
  const ring = kit.mesh(new THREE.TorusGeometry(0.27, 0.08, 5, 12), twig, [0, 0.04, 0], nest);
  ring.rotation.x = Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(0.27, 0.15, 0.08, 10), twig, [0, -0.01, 0], nest);

  // Burrow: a grassy mound with a dark hole in front.
  const mound = kit.mesh(new THREE.SphereGeometry(0.85, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), flat(0x8fb86a), SPOT.burrow, scene);
  mound.scale.y = 0.45;
  const door = kit.mesh(new THREE.CircleGeometry(0.26, 12), kit.mat(0x2a1a0e), [SPOT.burrow[0], 0.17, -0.79], scene);
  door.rotation.x = -0.45;
  door.castShadow = false;

  // Water bowl for the rabbit and the bird.
  const dish = kit.mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.14, 16, 1, true), kit.mat(0x8aa4b8, { side: THREE.DoubleSide }), [SPOT.bowl[0], 0.07, SPOT.bowl[2]], scene);
  kit.mesh(new THREE.CircleGeometry(0.3, 16).rotateX(-Math.PI / 2), kit.mat(0x8aa4b8), [SPOT.bowl[0], 0.005, SPOT.bowl[2]], scene);
  dish.castShadow = false;
  const bowlWater = kit.mesh(new THREE.CircleGeometry(0.34, 16).rotateX(-Math.PI / 2), kit.mat(0x3d9be0, { roughness: 0.15 }), [SPOT.bowl[0], 0.02, SPOT.bowl[2]], scene);
  bowlWater.castShadow = false;

  // Grass tufts.
  const tuftGeo = new THREE.ConeGeometry(0.04, 0.22, 3), tuftMat = flat(0x6dbb4f);
  for (let i = 0; i < 40; i++) {
    const a = rand(i + 100) * Math.PI * 2, r = 1.2 + rand(i + 200) * 4.5;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.3) continue;
    kit.mesh(tuftGeo, tuftMat, [x, 0.1, z], scene).castShadow = false;
  }

  // Rain cloud and drops (shown in the shelter step).
  const cloud = new THREE.Group();
  cloud.position.set(0.3, 4.3, -2.2);
  scene.add(cloud);
  const puffMat = flat(0xf4f6f8);
  for (let i = 0; i < 8; i++) kit.mesh(new THREE.IcosahedronGeometry(0.4 + rand(i + 300) * 0.2, 1), puffMat, [-3.2 + i * 0.9, rand(i + 310) * 0.3, (rand(i + 320) - 0.5) * 0.8], cloud).castShadow = false;
  const DROPS = 70;
  const drops = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 3), new THREE.MeshBasicMaterial({ color: 0x5aa0e6 }), DROPS);
  scene.add(drops);
  const dummy = new THREE.Object3D();

  // Animals and food.
  const R = rabbit(THREE, kit), B = bird(THREE, kit), F = fish(THREE, kit);
  scene.add(R.g, B.g, F.g);
  const food = {
    carrot: { g: carrot(THREE, kit), at: V(SPOT.carrot) },
    seeds: { g: seeds(THREE, kit), at: V(SPOT.seeds) },
    worm: { ...worm(THREE, kit), at: V(SPOT.worm) },
  };
  for (const f of Object.values(food)) { f.g.position.copy(f.at); f.g.visible = false; scene.add(f.g); }
  food.carrot.base = 1.7; food.seeds.base = 2.4; food.worm.base = 2.2;
  food.carrot.g.rotation.y = 0.5;

  // Breathing: little puffs of air going in at the nose or beak; water going in at the fish's mouth and out at its gills.
  const puffGeo = new THREE.SphereGeometry(0.03, 6, 4);
  function puffs(parent, color, path) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false });
    const list = [];
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(puffGeo, m); p.visible = false; parent.add(p); list.push(p); }
    return { list, path };
  }
  const air = {
    rabbit: puffs(R.head, 0xffffff, [[0, 0.06, 0.62], [0, 0.08, 0.3]]),
    bird: puffs(B.head, 0xffffff, [[0, 0.03, 0.42], [0, 0.04, 0.15]]),
    fish: puffs(F.g, 0x9fe3ff, [[0, -0.01, 0.5], [0, -0.01, 0.2], [0.16, -0.01, -0.02]]),
  };

  const mover = (name, parts, home, speed, yaw = 0) => ({
    name, ...parts, base: SIZE[name], home: V(home), pos: V(home), to: V(home), speed, yaw, face: yaw, phase: 0,
    dip: 0, size: 1, sizeTo: 1, task: null, breathe: false, jump: 1, done: {},
  });
  const A = {
    rabbit: mover('rabbit', R, SPOT.rabbit, 1.3, 0.3),
    bird: mover('bird', B, SPOT.bird, 1.5, 0.4),
    fish: mover('fish', F, SPOT.fishAir, 0.7, -1),
  };
  const fishWander = { on: true, a: 0 };

  // Labels: animal names ride above each animal.
  const tagAt = (parent, y) => { const o = new THREE.Object3D(); o.position.y = y; parent.add(o); return o; };
  const names = { rabbit: label('Rabbit', tagAt(R.g, 0.95), { cls: 'warm' }), bird: label('Bird', tagAt(B.g, 0.55), { cls: 'warm' }), fish: label('Fish', tagAt(F.g, 0.3), { cls: 'warm' }) };
  const tags = {
    carrot: label('Carrot', tagAt(food.carrot.g, 0.25)),
    seeds: label('Seeds', tagAt(food.seeds.g, 0.15)),
    worm: label('Worm', tagAt(food.worm.g, 0.12)),
    bowl: label('Water bowl', V([SPOT.bowl[0], 0.0, SPOT.bowl[2] + 0.45]), { cls: 'cool' }),
    pond: label('Pond water', V([POND.x + 0.5, 0.05, POND.z + 0.9]), { cls: 'cool' }),
    burrow: label('Burrow', V([SPOT.burrow[0], 0.45, SPOT.burrow[2]])),
    nest: label('Nest', V([SPOT.nest[0] + 0.1, SPOT.nest[1] + 0.05, SPOT.nest[2]])),
    weeds: label('Water plants', V([SPOT.weeds[0] + 0.1, 0.5, SPOT.weeds[2]])),
    nose: label('Nose', R.nose, { cls: 'cool' }),
    beak: label('Beak', B.beakTip, { cls: 'cool' }),
    gills: label('Gills', F.gill, { cls: 'cool' }),
  };
  const showTags = (list = [], animals = []) => {
    for (const [k, l] of Object.entries(tags)) l.show(list.includes(k));
    for (const [k, l] of Object.entries(names)) l.show(animals.includes(k));
  };

  const st = { step: 0, time: 0, quiz: false, plan: [], bowl: 0, bowlTo: 0, rain: 0, rainTo: 0, sel: 'rabbit', auto: false };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  // Send an animal to stand `reach` away from a spot, facing it.
  function goTo(m, spot, reach = 0, side = null) {
    if (side) tmp.set(side[0], 0, side[1]); else tmp.subVectors(m.pos, spot);
    tmp.y = 0;
    if (tmp.lengthSq() < 1e-4) tmp.set(0, 0, 1);
    tmp.normalize().multiplyScalar(reach);
    m.to.copy(spot).add(tmp);
    m.face = Math.atan2(spot.x - m.to.x, spot.z - m.to.z);
  }
  function goHome(m) { m.to.copy(m.home); m.face = m.name === 'fish' ? -1 : m.name === 'rabbit' ? 0.3 : 0.4; }

  // Tasks: eat, drink, hide, breathe. A new task replaces the old one.
  const foodOf = { rabbit: 'carrot', bird: 'seeds', fish: 'worm' };
  const reachOf = { rabbit: 0.68, bird: 0.56, fish: 0.4 };
  function endTask(m) {
    const t = m.task;
    if (!t) return;
    if (t.kind === 'eat') { food[t.food].g.visible = false; tags[t.food].show(false); }
    m.sizeTo = 1; m.breathe = false; m.task = null;
    if (m.name === 'fish') fishWander.on = st.step !== 3;
  }
  function task(m, kind) {
    endTask(m);
    const t = { kind, t: 0, arrived: false };
    m.task = t;
    if (m.name === 'fish') fishWander.on = false;
    if (kind === 'eat') {
      const f = food[foodOf[m.name]];
      t.food = foodOf[m.name];
      f.g.visible = true; f.g.scale.setScalar(f.base);
      f.g.position.copy(f.at);
      if (t.food === 'worm') f.g.position.y = POND.water + 0.02; // drops in and sinks
      tags[t.food].show(st.step === 1 || st.step === 5);
      goTo(m, f.at, reachOf[m.name]);
      t.dur = 4;
    }
    if (kind === 'drink') {
      if (m.name === 'fish') { t.kind = 'swim'; t.dur = 4; }
      else { st.bowlTo = 1; m.name === 'rabbit' ? goTo(m, V(SPOT.bowl), 0.82, [1, -0.25]) : goTo(m, V(SPOT.bowl), 0.62, [-1, -0.2]); t.dur = 4; }
    }
    if (kind === 'hide') {
      if (m.name === 'rabbit') goTo(m, V(SPOT.hole), 0);
      if (m.name === 'bird') { m.to.set(...SPOT.nest); m.face = 0.6; }
      if (m.name === 'fish') { m.to.set(...SPOT.weeds); m.face = -2.4; }
      t.dur = st.step === 4 ? Infinity : 3.5;
    }
    if (kind === 'breathe') { m.breathe = true; t.dur = 4; if (m.name !== 'fish') goHome(m); else { m.to.set(...SPOT.fishAir); m.face = -1; } }
    if (kind === 'swim') t.dur = 4;
  }
  function runTask(m, dt) {
    const t = m.task;
    if (!t) return;
    if (!t.arrived && m.pos.distanceTo(m.to) < 0.02) t.arrived = true;
    if (t.kind === 'breathe' || t.kind === 'swim') t.arrived = true;
    if (!t.arrived) return;
    t.t += dt;
    if (t.kind === 'eat') {
      const f = food[t.food];
      f.g.scale.setScalar(f.base * Math.max(0.05, 1 - t.t / t.dur));
      m.dip = 1;
    }
    if (t.kind === 'drink') m.dip = st.bowl > 0.2 ? 1 : 0;
    if (t.kind === 'hide' && m.name === 'rabbit') m.sizeTo = 0;
    if (t.kind === 'swim') { fishWander.a += dt * 1.6; circle(m.to, fishWander.a, 0.75); }
    if (t.t >= t.dur) { const kind = t.kind; endTask(m); goHome(m); if (kind === 'hide') m.sizeTo = 1; }
  }
  const circle = (out, a, r) => out.set(POND.x + Math.cos(a) * r, -0.32, POND.z + Math.sin(a) * r * 0.8);

  // The "look after the animals" game: press a need for the chosen animal.
  function give(name, need) {
    const m = A[name];
    task(m, need === 'food' ? 'eat' : need === 'water' ? 'drink' : need === 'air' ? 'breathe' : 'hide');
    m.done[need] = true; m.last = need;
    if (NEEDS.every(n => m.done[n])) st.plan.push([st.time + 4.2, () => { if (m.task) return; m.jump = 0; }]);
    checklist();
  }
  const where = {
    rabbit: { food: 'carrots and grass', water: 'a water bowl', air: 'breathes with its nose', shelter: 'a burrow' },
    bird: { food: 'seeds and worms', water: 'a water bowl', air: 'breathes through its beak', shelter: 'a nest' },
    fish: { food: 'worms and insects', water: 'lives in the pond', air: 'its gills take air from the water', shelter: 'hides in water plants' },
  };
  function checklist() {
    const m = A[st.sel], all = NEEDS.every(n => m.done[n]);
    ui.readout(`<b>${st.sel[0].toUpperCase() + st.sel.slice(1)}</b>: ` +
      NEEDS.map(n => `${m.done[n] ? '✓' : '○'} ${n}`).join(' · ') +
      (all ? '<br>It has <b>everything it needs</b>!' : m.last ? `<br>${m.last[0].toUpperCase() + m.last.slice(1)}: ${where[st.sel][m.last]}.` : '<br>Press a need to give it.'));
  }

  const OVER = { radius: 3.3, yaw: 0.12, pitch: 0.62, target: [0.1, 0.55, 0.45] };
  function reset() {
    for (const m of Object.values(A)) {
      endTask(m); goHome(m); m.size = m.sizeTo = 1; m.dip = 0; m.done = {}; m.last = null; m.jump = 1;
      if (m.name !== 'fish') m.pos.copy(m.home);
    }
    fishWander.on = true;
    st.bowlTo = 0; st.rainTo = 0; st.plan = [];
  }

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.time = 0;
      reset();
      if (i === 0) {
        view(OVER);
        showTags([], ['rabbit', 'bird', 'fish']);
        ui.buttons(['rabbit', 'bird', 'fish'].map(n => ({
          label: n[0].toUpperCase() + n.slice(1),
          onClick: () => { const p = A[n].pos; view({ radius: n === 'rabbit' ? 1.4 : 1.2, yaw: 0.2, pitch: n === 'fish' ? 0.75 : 0.35, target: [p.x, p.y + (n === 'fish' ? 0 : n === 'bird' ? 0.4 : 0.55), p.z] }); A[n].jump = 0; },
        })));
        ui.readout('Every animal needs <b>food</b>, <b>water</b>, <b>air</b> and <b>shelter</b>.');
      }
      if (i === 1) {
        view({ radius: 2.4, yaw: 0.05, pitch: 0.7, target: [0.3, 0.2, 1.0] });
        showTags([]);
        st.plan = [[0.3, () => task(A.rabbit, 'eat')], [0.9, () => task(A.bird, 'eat')], [1.5, () => task(A.fish, 'eat')]];
        ui.buttons([
          { label: 'Feed the rabbit', onClick: () => task(A.rabbit, 'eat') },
          { label: 'Feed the bird', onClick: () => task(A.bird, 'eat') },
          { label: 'Feed the fish', onClick: () => task(A.fish, 'eat') },
        ]);
        ui.readout('Rabbit: <b>carrots</b> · Bird: <b>seeds</b> · Fish: <b>worms</b>');
      }
      if (i === 2) {
        view({ radius: 2.5, yaw: 0.1, pitch: 0.65, target: [0.45, 0.3, 1.4] });
        showTags(['bowl', 'pond']);
        const fill = () => { st.bowlTo = 1; task(A.rabbit, 'drink'); task(A.bird, 'drink'); ui.readout('The rabbit and the bird <b>drink</b> from the bowl. The fish lives in water.'); };
        st.plan = [[0.4, fill]];
        ui.buttons([
          { label: 'Fill the bowl', onClick: fill },
          { label: 'Empty the bowl', onClick: () => { st.bowlTo = 0; endTask(A.rabbit); endTask(A.bird); goHome(A.rabbit); goHome(A.bird); ui.readout('No water! The rabbit and the bird will get <b>thirsty</b>.'); } },
        ]);
        ui.readout('The bowl is empty.');
      }
      if (i === 3) {
        view({ radius: 2.6, yaw: 0.1, pitch: 0.6, target: [0.15, 0.35, 0.7] });
        showTags(['nose', 'beak', 'gills']);
        fishWander.on = false;
        for (const m of Object.values(A)) { task(m, 'breathe'); m.task.dur = Infinity; }
        const look = (n, o) => () => { const p = A[n].to; view({ ...o, target: [p.x, p.y + (o.up || 0), p.z] }); };
        ui.buttons([
          { label: 'Look at the rabbit', onClick: look('rabbit', { radius: 1.2, yaw: 0.9, pitch: 0.25, up: 0.65 }) },
          { label: 'Look at the bird', onClick: look('bird', { radius: 0.9, yaw: 0.9, pitch: 0.25, up: 0.5 }) },
          { label: 'Look at the fish', onClick: look('fish', { radius: 1.0, yaw: 1.2, pitch: 0.6 }) },
        ]);
        ui.readout('White dots: <b>air</b> going in. Blue dots: <b>water</b> going over the fish\'s gills.');
      }
      if (i === 4) {
        view({ radius: 3.7, yaw: 0.2, pitch: 0.4, target: [-0.1, 1.5, -0.4] });
        showTags(['burrow', 'nest', 'weeds']);
        const rain = () => { st.rainTo = 1; for (const m of Object.values(A)) task(m, 'hide'); ui.readout('Rain! Each animal goes to its <b>shelter</b>.'); };
        st.plan = [[0.5, rain]];
        ui.buttons([
          { label: 'Make it rain', onClick: rain },
          { label: 'Sun comes out', onClick: () => { st.rainTo = 0; for (const m of Object.values(A)) { endTask(m); goHome(m); } ui.readout('The sun is out. The animals come back out.'); } },
        ]);
        ui.readout('The sky is clear.');
      }
      if (i === 5) {
        view(OVER);
        st.sel = 'rabbit'; st.auto = true;
        showTags(['carrot', 'seeds', 'worm'], ['rabbit']);
        const pick = n => { st.sel = n; showTags(['carrot', 'seeds', 'worm'], [n]); checklist(); };
        ui.buttons(['rabbit', 'bird', 'fish'].map(n => ({ label: n[0].toUpperCase() + n.slice(1), on: n === 'rabbit', onClick: () => { st.auto = false; pick(n); } })));
        ui.buttons(NEEDS.map(n => ({ label: n[0].toUpperCase() + n.slice(1), onClick: () => { st.auto = false; give(st.sel, n); } })));
        st.plan = [[0.4, () => st.auto && give('rabbit', 'food')]];
        checklist();
      }
      if (isQuiz) {
        view({ ...OVER, yaw: -0.2, pitch: 0.55 });
        showTags([]);
      }
    },

    update(dt, time) {
      st.time += dt;
      st.plan.sort((a, b) => a[0] - b[0]);
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();

      kit.follow(st, 'bowl', st.bowlTo, dt, 2);
      bowlWater.position.y = 0.012 + st.bowl * 0.08;
      bowlWater.scale.setScalar(0.85 + st.bowl * 0.15);
      bowlWater.visible = st.bowl > 0.02;

      // Rain and a darker sky.
      kit.follow(st, 'rain', st.rainTo, dt, 2);
      cloud.visible = drops.visible = st.rain > 0.02;
      scene.background.copy(sky).lerp(rainSky, st.rain);
      if (drops.visible) {
        cloud.scale.setScalar(0.6 + st.rain * 0.4);
        for (let i = 0; i < DROPS; i++) {
          const y = 4 - ((time * 4 + rand(i) * 4) % 4);
          dummy.position.set(-3.3 + rand(i + 500) * 7, y, -1.8 + rand(i + 600) * 4.2);
          dummy.scale.setScalar(st.rain);
          dummy.updateMatrix();
          drops.setMatrixAt(i, dummy.matrix);
        }
        drops.instanceMatrix.needsUpdate = true;
      }

      // Fish swims slow loops round the pond unless it is busy.
      if (fishWander.on && !A.fish.task) { fishWander.a += dt * 0.6; circle(A.fish.to, fishWander.a, 0.75); }
      // The worm sinks slowly and wiggles.
      const w = food.worm;
      if (w.g.visible) {
        w.g.position.y = Math.max(w.at.y, w.g.position.y - dt * 0.4);
        w.beads.forEach((b, j) => { b.position.x = Math.sin(time * 6 + j * 0.9) * 0.03; });
      }

      for (const m of Object.values(A)) {
        runTask(m, dt);
        if (!m.task || !m.task.arrived) m.dip = Math.max(0, m.dip - dt * 3);
        // Walk, hop, fly or swim toward the target at a steady speed.
        tmp.subVectors(m.to, m.pos);
        const dist = tmp.length(), moving = dist > 0.01;
        if (moving) {
          m.pos.addScaledVector(tmp, Math.min(dist, m.speed * dt) / dist);
          m.phase += dt * (m.name === 'rabbit' ? 11 : 14);
        }
        tmp2.set(tmp.x, 0, tmp.z);
        const want = moving && tmp2.lengthSq() > 4e-4 ? Math.atan2(tmp.x, tmp.z) : m.face;
        let d = want - m.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        m.yaw += d * Math.min(1, dt * 7);
        kit.follow(m, 'size', m.sizeTo, dt, 4);
        m.jump = Math.min(1, m.jump + dt * 1.6);
        const jumpY = Math.sin(Math.PI * m.jump) * 0.35;
        const breath = 1 + Math.sin(time * (m.breathe ? 5 : 3)) * (m.breathe ? 0.05 : 0.02);
        m.g.position.copy(m.pos);
        m.g.rotation.y = m.yaw;
        m.g.scale.setScalar(Math.max(0.001, m.size) * m.base);
        m.g.visible = m.size > 0.02;
        const bob = m.dip * (0.55 + 0.25 * Math.sin(time * 12));
        if (m.name === 'rabbit') {
          m.g.position.y += (moving ? Math.abs(Math.sin(m.phase)) * 0.16 : 0) + jumpY;
          m.head.rotation.x = bob;
          m.body.scale.set(0.9 * breath, 0.85 * breath, 1.15);
          m.ears.forEach((e, j) => { e.rotation.x = -0.15 + Math.sin(time * 2 + j) * 0.08; });
        }
        if (m.name === 'bird') {
          const flying = m.pos.y > 0.02 && moving;
          m.g.position.y += (moving && !flying ? Math.abs(Math.sin(m.phase)) * 0.06 : 0) + jumpY * 0.6;
          m.wings.forEach(wg => { wg.rotation.z = flying ? wg.side * (0.3 + Math.sin(time * 26) * 0.9) : wg.side * 0.05; });
          m.head.rotation.x = bob * 0.9;
          m.body.scale.set(0.9 * breath, 0.9 * breath, 1.2);
        }
        if (m.name === 'fish') {
          m.g.position.y += Math.sin(time * 1.7) * 0.02 + jumpY * 0.3;
          m.tail.rotation.y = Math.sin(time * (moving ? 10 : 4)) * 0.4;
        }
        // Breathing dots.
        const a = air[m.name];
        a.list.forEach((p, j) => {
          p.visible = m.breathe;
          if (!m.breathe) return;
          const ph = (time * 0.55 + j / a.list.length) % 1, path = a.path;
          if (path.length === 2) { tmp.fromArray(path[0]).lerp(tmp2.fromArray(path[1]), ph); }
          else {
            const half = ph < 0.5, u = half ? ph * 2 : ph * 2 - 1;
            tmp.fromArray(half ? path[0] : path[1]).lerp(tmp2.fromArray(half ? path[1] : path[2]), u);
            if (!half && j % 2) tmp.x = -tmp.x; // out of the gills on both sides
          }
          p.position.copy(tmp);
          p.scale.setScalar(Math.sin(Math.PI * ph) + 0.05);
        });
      }
      return true;
    },
  };
}
