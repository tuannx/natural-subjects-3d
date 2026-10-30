// What plants need: a seed in a clear pot sprouts and grows. Light, water and warmth change
// how the plant looks; a lamp to one side makes the stem bend toward it.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SOIL_Y = 1.15;            // top of the soil
const SEED = [0, 0.88, 0.15];   // seed sits a little in front of the pot centre, so it is easy to see
const N = 6;                    // stem segments (segment 0 is the part under the soil)
const UNDER = 0.29;             // length of stem below the soil
const FULL = 2.6;               // full stem length
const SUN_POS = [2.4, 4.6, 1.6];
const LAMP = { left: [-2.7, 2.3, 0.5], top: [0, 4.7, 0.5], right: [2.7, 2.3, 0.5] };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const { clamp, lerp, follow } = kit;
  const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

  // Room: table top, sky colour that dims with the light.
  const sky = new THREE.Color(0xdff1ff), dark = new THREE.Color(0x26303c);
  scene.background = sky.clone();
  const table = kit.stage(scene, { ground: 0xe6d3b3, radius: 6 });
  table.castShadow = false;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9a8f80, 1.3);
  scene.add(hemi);
  const light = new THREE.DirectionalLight(0xfff4dd, 2.6);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 0.5, far: 14 });
  light.shadow.bias = -0.0005;
  light.target.position.set(0, 1.8, 0);
  scene.add(light, light.target);

  // The light source: a sun-like bulb that becomes a desk lamp (with a shade) in step 5.
  const sun = new THREE.Group();
  sun.position.set(...SUN_POS);
  scene.add(sun);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  kit.mesh(new THREE.SphereGeometry(0.26, 24, 12), bulbMat, [0, 0, 0], sun).castShadow = false;
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffc53d, transparent: true, opacity: 0.3, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12), glowMat);
  sun.add(glow);
  const shadeGeo = new THREE.ConeGeometry(0.5, 0.6, 24, 1, true).rotateX(-Math.PI / 2);
  const shade = kit.mesh(shadeGeo, kit.mat(0x3aa38a, { side: THREE.DoubleSide, emissive: 0x12352c }), [0, 0, -0.3], sun);
  shade.castShadow = false;
  const sunTag = label('Sunlight', sun, { cls: 'warm' });

  // Clear plastic pot on a saucer, with see-through soil so the roots show.
  const potMat = new THREE.MeshStandardMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.22, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide });
  const pot = kit.mesh(new THREE.CylinderGeometry(0.86, 0.62, 1.2, 40, 1, true), potMat, [0, 0.66, 0], scene);
  pot.castShadow = false;
  const rim = kit.mesh(new THREE.TorusGeometry(0.86, 0.035, 8, 40), kit.mat(0x7fb7e0), [0, 1.26, 0], scene);
  rim.rotation.x = Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(1.0, 0.95, 0.06, 40), kit.mat(0x7fb7e0), [0, 0.03, 0], scene);
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, transparent: true, opacity: 0.42, roughness: 1, depthWrite: false });
  const soil = kit.mesh(new THREE.CylinderGeometry(0.83, 0.61, SOIL_Y - 0.08, 40), soilMat, [0, (SOIL_Y + 0.08) / 2, 0], scene);
  soil.castShadow = false;
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x5fa8e8, transparent: true, opacity: 0, roughness: 0.1, depthWrite: false });
  const puddle = kit.mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.03, 40), puddleMat, [0, SOIL_Y + 0.01, 0], scene);
  const tray = kit.mesh(new THREE.CylinderGeometry(0.97, 0.97, 0.02, 40), puddleMat, [0, 0.065, 0], scene);
  puddle.castShadow = tray.castShadow = false;

  // Seed and roots (roots are one merged mesh that grows by scaling from the seed).
  const seed = kit.mesh(new THREE.SphereGeometry(0.09, 16, 10), kit.mat(0xc98b3c), SEED, scene);
  const seedMark = new THREE.Object3D(); seedMark.position.set(0.3, -0.02, 0); seed.add(seedMark);
  const rootMat = kit.mat(0xfff6e0, { emissive: 0x000000 });
  const roots = kit.mesh(rootGeometry(THREE), rootMat, SEED, scene);
  roots.castShadow = false;
  const rootTip = new THREE.Object3D(); rootTip.position.set(-0.05, -0.5, 0); roots.add(rootTip);

  // Stem: a chain of segments, so bending is just a rotation at each joint.
  const stemMat = kit.mat(0x4c9a3a);
  const segGeo = new THREE.CylinderGeometry(0.94, 1, 1, 8).translate(0, 0.5, 0);
  const knotGeo = new THREE.SphereGeometry(1, 10, 6);
  const joints = [];
  let parent = scene;
  for (let i = 0; i < N; i++) {
    const g = new THREE.Group();
    if (i === 0) g.position.set(...SEED);
    parent.add(g);
    const m = kit.mesh(segGeo, stemMat, [0, 0, 0], g);
    const knot = i > 0 ? kit.mesh(knotGeo, stemMat, [0, 0, 0], g) : null; // rounds off each bend
    joints.push({ g, m, knot });
    parent = g;
  }
  const tip = new THREE.Group();
  joints[N - 1].g.add(tip);

  // Leaves: one on each joint above the soil, on alternate sides, plus two young leaves at the tip.
  const leafMat = kit.mat(0x3f9b3a, { side: THREE.DoubleSide });
  const leafGeo = leafGeometry(THREE);
  const leaves = [];
  const addLeaf = (host, yaw, base, from) => {
    const pivot = new THREE.Group();
    pivot.rotation.y = yaw;
    host.add(pivot);
    const m = kit.mesh(leafGeo, leafMat, [0, 0, 0], pivot);
    m.rotation.x = 0.75 * Math.cos(yaw); // roll the blade toward the viewer so it is not seen edge-on
    const mark = new THREE.Object3D(); mark.position.set(0.55, 0, 0); m.add(mark);
    leaves.push({ pivot, m, base, from, mark });
  };
  for (let j = 2; j < N; j++) addLeaf(joints[j].g, (j % 2 ? Math.PI : 0) + (j % 3 - 1) * 0.5, 1, 0.3 + (j - 2) * 0.12);
  addLeaf(tip, 0.4, 0.55, -1); addLeaf(tip, Math.PI + 0.4, 0.55, -1);

  // Flower at the tip: one petal mesh and a yellow centre, tipped to face the viewer.
  const flower = new THREE.Group();
  flower.rotation.x = 0.7;
  tip.add(flower);
  const petalMat = kit.mat(0xff6fa5, { side: THREE.DoubleSide });
  kit.mesh(flowerGeometry(THREE), petalMat, [0, 0.03, 0], flower);
  kit.mesh(new THREE.SphereGeometry(0.11, 16, 8), kit.mat(0xffcf3a), [0, 0.06, 0], flower);

  // Blue water drops that travel from the roots up the stem (one instanced mesh).
  const DROPS = 10;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 6), new THREE.MeshBasicMaterial({ color: 0x2d7fe0 }), DROPS);
  drops.visible = false;
  scene.add(drops);

  // Labels.
  const tags = {
    seed: label('Seed', seedMark),
    roots: label('Roots', rootTip, { cls: 'cool' }),
    stem: label('Stem', joints[2].g),
    leaves: label('Leaf', leaves[1].mark),
    flower: label('Flower', flower, { cls: 'warm' }),
    air: label('Air', new THREE.Vector3(-1.3, 3.1, 0.3), { cls: 'cool' }),
    water: label('Water', new THREE.Vector3(-0.9, 0.7, 0.6), { cls: 'cool' }),
    pot: label('Clear pot', new THREE.Vector3(0.75, 0.4, 0.5)),
  };
  const showTags = names => { for (const [n, l] of Object.entries(tags)) l.show(names.includes(n)); sunTag.show(names.includes('sun')); };

  // Conditions the child controls, and the plant's look that follows them smoothly.
  const st = { step: 0, light: 100, water: 55, warm: true, grow: 1, growTo: 1, rate: 0, lampTo: new THREE.Vector3(...SUN_POS), lean: 0, room: 'sun' };
  const look = { grow: 1, stretch: 1, thick: 1, leaf: 1, pale: 0, droop: 0, yellow: 0, wet: 0.55, lean: 0, flower: 0, light: 1 };
  const green = new THREE.Color(0x3f9b3a), stemGreen = new THREE.Color(0x4c9a3a), pale = new THREE.Color(0xe4dc8c), sick = new THREE.Color(0xc9b23c);
  const soilDry = new THREE.Color(0xc29c6c), soilWet = new THREE.Color(0x5e3b1f), soilSoaked = new THREE.Color(0x35210f);
  const bulbOn = new THREE.Color(0xffd34d), bulbOff = new THREE.Color(0x8a8a80);
  const c = new THREE.Color();

  function conditions() {
    const L = st.light / 100, W = st.water / 100;
    const lightOK = smooth(0.08, 0.55, L);
    const dry = clamp((0.3 - W) / 0.3, 0, 1), soggy = clamp((W - 0.75) / 0.25, 0, 1);
    return { L, W, lightOK, dry, soggy, waterOK: 1 - Math.max(dry, soggy), warmOK: st.warm ? 1 : 0 };
  }

  // Apply the smoothed look to the meshes.
  function draw() {
    const s = clamp((look.grow - 0.08) / 0.92, 0, 1);
    const stemLen = FULL * s * lerp(1, look.stretch, s);
    const L0 = Math.min(stemLen, UNDER), Lr = Math.max(0, stemLen - UNDER) / (N - 1);
    const r = 0.075 * look.thick * (0.45 + 0.55 * s);
    joints.forEach(({ g, m, knot }, i) => {
      const L = i === 0 ? L0 : Lr, ri = r * (1 - i * 0.06);
      m.scale.set(ri, Math.max(L, 1e-4), ri);
      m.visible = L > 1e-3;
      if (knot) { knot.scale.setScalar(ri * 1.02); knot.visible = m.visible; }
      if (i > 0) {
        g.position.y = i === 1 ? L0 : Lr;
        g.rotation.z = look.lean / (N - 1) - look.droop * (0.05 + 0.06 * i);
      }
    });
    tip.position.y = Lr;
    for (const lf of leaves) {
      const grow = lf.from < 0 ? smooth(0.1, 0.3, s) : smooth(lf.from, lf.from + 0.2, s);
      const k = grow * lf.base * look.leaf * (lf.from < 0 ? lerp(1, 0.7, look.flower) : 1);
      lf.m.scale.setScalar(Math.max(k, 1e-4));
      lf.m.visible = k > 1e-3;
      lf.pivot.rotation.z = (lf.from < 0 ? 0.75 : 0.42) - 1.5 * look.droop;
    }
    flower.scale.setScalar(Math.max(look.flower, 1e-4));
    flower.visible = look.flower > 1e-3;
    const sw = clamp(look.grow * 10, 0, 1), used = clamp((look.grow - 0.3) / 0.6, 0, 1);
    seed.scale.set(1.3, 0.85, 0.95).multiplyScalar(1 + 0.35 * sw - 0.45 * used);
    roots.scale.setScalar(Math.max(smooth(0.02, 0.95, look.grow) * (0.35 + 0.65 * look.thick), 1e-4));
    roots.visible = look.grow > 0.025;

    leafMat.color.copy(green).lerp(pale, look.pale).lerp(sick, look.yellow);
    stemMat.color.copy(stemGreen).lerp(pale, look.pale).lerp(sick, look.yellow * 0.7);
    // A plant grown in the dark has no green colour; a faint glow keeps that pale yellow visible in a dark room.
    if (!highlighted) for (const m of [leafMat, stemMat]) m.emissive.copy(pale).multiplyScalar(0.3 * look.pale);
    const w = look.wet;
    soilMat.color.copy(soilDry).lerp(soilWet, clamp(w / 0.55, 0, 1)).lerp(soilSoaked, clamp((w - 0.75) / 0.25, 0, 1));
    puddleMat.opacity = 0.75 * clamp((w - 0.8) / 0.2, 0, 1);

    // Brightness of the room and the bulb.
    const lt = look.light;
    light.intensity = 0.05 + 2.6 * lt;
    hemi.intensity = st.room === 'lamp' ? 0.3 : 0.65 + 0.7 * lt; // never pitch black, so the plant stays visible
    scene.background.copy(dark).lerp(sky, st.room === 'lamp' ? 0.1 : 0.12 + 0.88 * lt);
    bulbMat.color.copy(bulbOff).lerp(bulbOn, lt);
    glowMat.opacity = st.room === 'lamp' ? 0 : 0.3 * lt;
    light.position.copy(sun.position);
  }

  // Water drops follow a path from the root tip, through the seed, up each joint to the tip.
  const path = Array.from({ length: N + 2 }, () => new THREE.Vector3());
  const dm = new THREE.Matrix4(), dp = new THREE.Vector3();
  function moveDrops(t) {
    rootTip.getWorldPosition(path[0]);
    joints.forEach(({ g }, i) => g.getWorldPosition(path[i + 1]));
    tip.getWorldPosition(path[N + 1]);
    for (let k = 0; k < DROPS; k++) {
      const u = ((t * 0.22 + k / DROPS) % 1) * (path.length - 1), a = Math.floor(u);
      dp.lerpVectors(path[a], path[Math.min(a + 1, path.length - 1)], u - a);
      dm.makeTranslation(dp.x, dp.y, dp.z + 0.03);
      drops.setMatrixAt(k, dm);
    }
    drops.instanceMatrix.needsUpdate = true;
  }

  const say = html => { if (!st.quiz) ui.readout(html); };
  function report() {
    const k = conditions();
    if (st.step === 0) {
      if (k.W < 0.3) say('The soil is <b>dry</b>. The seed stays asleep.');
      else if (!st.warm) say('It is <b>too cold</b>. The seed stays asleep.');
      else say(st.grow < 0.05 ? 'The seed is soaking up water...' : st.grow < 0.12 ? 'A <b>root</b> pokes out and grows down!' : 'A <b>shoot</b> pushes up into the light!');
    }
    if (st.step === 2) say(k.L < 0.1 ? 'Dark: no food. The plant is <b>pale, thin and stretched</b>.' : k.L < 0.5 ? 'Dim light: the plant is <b>weak and pale</b>.' : 'Bright light: the plant is <b>green and strong</b>.');
    if (st.step === 3) say(k.dry > 0.3 ? 'Too dry: the plant is <b>wilting</b>.' : k.soggy > 0.3 ? 'Too wet: the roots need air. Leaves turn <b>yellow</b>.' : 'Just right: the plant <b>stands up tall</b>.');
    if (st.step === 5) {
      const need = [k.lightOK < 0.5 && 'light', k.waterOK < 0.5 && 'water', !st.warm && 'warmth'].filter(Boolean);
      say(need.length ? `Growing has stopped. The plant needs <b>${need.join(' and ')}</b>.` : st.grow >= 1.19 ? 'All it needs: a <b>flower</b>!' : 'Light, water and warmth: <b>growing well</b>.');
    }
  }

  const jobs = {
    Roots: '<b>Roots</b> hold the plant in the soil and drink up water.',
    Stem: '<b>The stem</b> holds the plant up and carries water to the leaves.',
    Leaves: '<b>Leaves</b> use sunlight, air and water to make food.',
    Flower: '<b>The flower</b> makes seeds for new plants.',
  };
  const hiMats = { Roots: [rootMat], Stem: [stemMat], Leaves: [leafMat], Flower: [petalMat] };
  let highlighted = null;
  function highlight(part) {
    highlighted = part;
    for (const [p, ms] of Object.entries(hiMats)) for (const m of ms) m.emissive.setHex(p === part ? 0x3a3a10 : 0x000000);
    if (part) ui.readout(jobs[part]);
  }

  function setLamp(where) {
    st.lampTo.set(...LAMP[where]);
    st.lean = where === 'left' ? 0.95 : where === 'right' ? -0.95 : 0;
  }

  return {
    step(i, { isQuiz, instant }) {
      Object.assign(st, { step: i, quiz: isQuiz, light: 100, water: 55, warm: true, lean: 0, rate: 0, room: 'sun' });
      st.lampTo.set(...SUN_POS);
      shade.visible = false; sunTag.text = 'Sunlight';
      drops.visible = false;
      highlight(null);
      if (i === 0) {
        st.grow = look.grow = 0; st.growTo = 0.3; st.rate = 0.075;
        view({ radius: 1.3, yaw: 0.25, pitch: 0.2, target: [0, 1.15, 0] }, instant);
        showTags(['seed', 'roots', 'pot']);
        ui.toggle({ label: 'Water the soil', value: true, onChange: v => { st.water = v ? 55 : 5; report(); } });
        ui.toggle({ label: 'Warm room', value: true, onChange: v => { st.warm = v; report(); } });
        ui.buttons([{ label: 'Plant a new seed', onClick: () => { st.grow = look.grow = 0; } }]);
      }
      if (i === 1) {
        st.growTo = 1.2; st.rate = 0.6;
        drops.visible = true;
        view({ radius: 2.1, yaw: 0.35, pitch: 0.12, target: [0, 1.85, 0] }, instant);
        showTags(['roots', 'stem', 'leaves', 'flower']);
        ui.buttons(Object.keys(jobs).map(p => ({ label: p, onClick: () => highlight(p) })));
      }
      if (i === 2) {
        st.growTo = 1; st.rate = 0.6;
        view({ radius: 2.9, yaw: 0.15, pitch: 0.2, target: [0.7, 2.75, 0.5] }, instant);
        showTags(['sun', 'air', 'water', 'leaves']);
        st.light = 0;
        ui.slider({ label: 'Sunlight', min: 0, max: 100, step: 5, value: 0, format: v => (v < 10 ? 'dark' : v < 50 ? 'dim' : 'bright'), onInput: v => { st.light = v; report(); } });
      }
      if (i === 3) {
        st.growTo = 1; st.rate = 0.6;
        st.water = 10;
        view({ radius: 2.3, yaw: -0.45, pitch: 0.4, target: [0, 1.85, 0] }, instant);
        showTags(['roots', 'leaves']);
        ui.slider({ label: 'Water', min: 0, max: 100, step: 5, value: 10, format: v => (v < 15 ? 'very dry' : v < 30 ? 'a little' : v <= 75 ? 'just right' : 'too much'), onInput: v => { st.water = v; report(); } });
      }
      if (i === 4) {
        st.growTo = 1; st.rate = 0.6; st.room = 'lamp';
        shade.visible = true; sunTag.text = 'Lamp';
        setLamp('left');
        view({ radius: 2.9, yaw: 0, pitch: 0.1, target: [0, 2.2, 0] }, instant);
        showTags(['sun', 'stem']);
        ui.buttons([{ label: 'Lamp left', onClick: () => setLamp('left') }, { label: 'Lamp on top', onClick: () => setLamp('top') }, { label: 'Lamp right', onClick: () => setLamp('right') }]);
      }
      if (i === 5) {
        st.grow = look.grow = 0.12; st.growTo = 1.2; st.rate = 0.15;
        view({ radius: 2.2, yaw: 0.6, pitch: 0.16, target: [0, 1.9, 0] }, instant);
        showTags(['flower']);
        ui.toggle({ label: 'Sunlight', value: true, onChange: v => { st.light = v ? 100 : 0; report(); } });
        ui.toggle({ label: 'Water', value: true, onChange: v => { st.water = v ? 55 : 0; report(); } });
        ui.toggle({ label: 'Warm room', value: true, onChange: v => { st.warm = v; report(); } });
        ui.buttons([{ label: 'Grow again', onClick: () => { st.grow = look.grow = 0.12; } }]);
      }
      if (isQuiz) {
        st.growTo = 1.2; st.rate = 0.6;
        view({ radius: 2.2, yaw: -0.5, pitch: 0.16, target: [0, 1.9, 0] }, instant);
        showTags([]);
      }
      if (instant) { sun.position.copy(st.lampTo); sun.lookAt(light.target.position); look.lean = st.lean; }
      report();
    },
    update(dt, t) {
      const k = conditions();
      // Growth: steps 1 and 6 grow only when the plant has what it needs.
      let can = 1;
      if (st.step === 0) can = k.W >= 0.3 && st.warm ? 1 : 0;
      if (st.step === 5) can = k.lightOK * k.waterOK * k.warmOK;
      const cap = st.step === 5 && can < 0.5 ? Math.min(st.growTo, 1) : st.growTo;
      const before = st.grow;
      if (st.grow < cap) st.grow = Math.min(cap, st.grow + st.rate * can * dt);
      else if (st.step !== 0 && st.step !== 5) st.grow = cap;
      if (Math.floor(before * 20) !== Math.floor(st.grow * 20)) report();

      let busy = st.grow !== before;
      const tgt = {
        grow: st.grow, stretch: 1 + 0.45 * (1 - k.lightOK), thick: 1 - 0.45 * (1 - k.lightOK), leaf: 1 - 0.4 * (1 - k.lightOK),
        pale: 1 - k.lightOK, droop: look.grow > 0.3 ? Math.max(k.dry, 0.6 * k.soggy) : 0, yellow: Math.max(0.5 * k.dry, 0.85 * k.soggy),
        wet: k.W, lean: st.lean, flower: smooth(1.0, 1.2, st.grow), light: st.room === 'lamp' ? 1 : k.L,
      };
      for (const key in tgt) busy = follow(look, key, tgt[key], dt, key === 'grow' ? 8 : key === 'lean' ? 1.2 : 2.5) || busy;
      if (sun.position.distanceToSquared(st.lampTo) > 1e-6) { sun.position.lerp(st.lampTo, Math.min(1, dt * 2.5)); busy = true; }
      sun.lookAt(light.target.position);
      draw();
      if (st.step === 0 && !st.quiz) tags.roots.show(look.grow > 0.1);
      if (drops.visible) { moveDrops(t); busy = true; }
      return busy;
    },
  };
}

// Seeded random numbers, so every video renders the same roots.
function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Roots: one main root going down and a few side roots, merged into one geometry.
function rootGeometry(THREE) {
  const tubes = [];
  const main = [], V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (let i = 0; i <= 6; i++) main.push(V((rand(i) - 0.5) * 0.08, -i * 0.11, (rand(i + 9) - 0.5) * 0.06));
  tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(main), 24, 0.03, 6));
  for (let b = 0; b < 7; b++) {
    const start = main[1 + (b % 5)], a = b * 2.4 + rand(b) * 0.8, len = 0.22 + rand(b + 20) * 0.22;
    const dir = V(Math.cos(a), -0.6 - rand(b + 40) * 0.5, Math.sin(a) * 0.6).normalize();
    const pts = [start.clone()];
    for (let s = 1; s <= 3; s++) pts.push(start.clone().addScaledVector(dir, (len * s) / 3).add(V(0, -s * s * 0.012, 0)));
    tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.018, 5));
  }
  return mergeGeometries(tubes);
}

// A pointed leaf lying flat, growing out along +x from its stalk.
function leafGeometry(THREE) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.06, 0);
  s.quadraticCurveTo(0.3, 0.26, 0.72, 0);
  s.quadraticCurveTo(0.3, -0.26, 0.06, 0);
  return new THREE.ShapeGeometry(s, 8).rotateX(-Math.PI / 2);
}

// Five round petals as one flat shape, facing up.
function flowerGeometry(THREE) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2, r = 0.13 + 0.21 * Math.pow(Math.abs(Math.cos((a * 5) / 2)), 0.6);
    if (i === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a)); else s.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2);
}
