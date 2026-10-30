// Parts of a plant: a tomato plant growing in a block of garden soil that is cut open at the front,
// so the roots show. Each step lights up one part and shows its job: water climbing from the roots
// up the stem, leaves making food in sunlight, a bee carrying pollen, a fruit full of seeds.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand, leafGeometry } from '../_shared/leaf.js';

const BOX = { w: 3.0, h: 1.4, d: 2.0 };          // soil block, top at y = 0
const NODES = [0.45, 0.85, 1.25, 1.65];          // leaf heights on the stem
const YAWS = [-0.35, Math.PI + 0.35, -0.6, Math.PI + 0.6];
const STEM_H = 2.45;
const FLOWERS = [[-0.3, 2.3, 0.18], [0.32, 2.45, 0.12]];   // top flowers (the bee visits these)
const FRUITS = [[0.62, 1.22, 0.12], [0.78, 1.32, -0.05]]; // tomatoes on a side branch
const SUN = [1.8, 3.1, 0.9];
const NEW_SEED = [0.95, -0.3, 0.86];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const { clamp, lerp } = kit;
  const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const V = a => new THREE.Vector3(...a);
  const flat = (c, o) => kit.mat(c, { flatShading: true, ...o });

  const sky = new THREE.Color(0xdff1ff), night = new THREE.Color(0x3a4658);
  scene.background = sky.clone();
  const ground = kit.mesh(new THREE.CircleGeometry(9, 40).rotateX(-Math.PI / 2), kit.mat(0xb9e09a), [0, -BOX.h - 0.02, 0], scene);
  ground.castShadow = false;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa6b8, 1.4));
  const sunLight = new THREE.DirectionalLight(0xfff4dd, 2.4);
  sunLight.position.set(3, 6, 4);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunLight.shadow.camera, { left: -3, right: 3, top: 3.5, bottom: -2.5, near: 0.5, far: 16 });
  sunLight.shadow.bias = -0.0005;
  sunLight.target.position.set(0, 0.5, 0);
  scene.add(sunLight, sunLight.target);

  // Soil block, cut open at the front: we see its inside walls. A layer of grass on top.
  const soilTex = speckle(THREE);
  const soilMat = kit.mat(0xffffff, { map: soilTex, side: THREE.BackSide, roughness: 1 });
  const soilDry = new THREE.Color(0xffffff), soilWet = new THREE.Color(0x9a8a80);
  const soil = kit.mesh(new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d), soilMat, [0, -BOX.h / 2, 0], scene);
  soil.castShadow = false;
  const turf = kit.mesh(new THREE.BoxGeometry(BOX.w, 0.1, BOX.d), kit.mat(0x6fbf4f), [0, -0.05, 0], scene);
  turf.castShadow = false;
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d)), new THREE.LineBasicMaterial({ color: 0x5a3a1f }));
  edge.position.y = -BOX.h / 2;
  scene.add(edge);
  const pebMat = flat(0xa39e94);
  for (let i = 0; i < 14; i++) {
    const p = kit.mesh(new THREE.DodecahedronGeometry(0.05 + rand(i) * 0.06, 0), pebMat,
      [(rand(i + 10) - 0.5) * 2.7, -0.25 - rand(i + 20) * 1.05, -BOX.d / 2 + 0.05 + rand(i + 30) * 0.4], scene);
    p.castShadow = false;
  }

  // Everything that belongs to the plant hangs on one group, so "pull the plant" can lift it.
  const plant = new THREE.Group();
  let growNow = 1; // 0 = seed, 1 = plant with fruit
  scene.add(plant);

  // Roots: a main root with side roots, merged into one mesh.
  const rootMat = flat(0xf1ddb0);
  const tap = [[0, 0, 0], [0.03, -0.35, 0.03], [-0.04, -0.7, 0.06], [0.03, -1.05, 0.02], [0, -1.28, 0.04]].map(V);
  const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, r, 5);
  const geos = [tube(tap, 0.045)];
  const laterals = [];
  const tapAt = y => { // point on the main root at height y
    for (let i = 1; i < tap.length; i++) if (y >= tap[i].y) { const u = (y - tap[i - 1].y) / (tap[i].y - tap[i - 1].y); return tap[i - 1].clone().lerp(tap[i], u); }
    return tap[tap.length - 1].clone();
  };
  [[-0.15, 0.25], [-0.25, 2.75], [-0.42, 0.9], [-0.55, 3.6], [-0.72, -0.4], [-0.88, 2.2]].forEach(([y, a], i) => {
    const start = tapAt(y), len = 1.0 - 0.45 * (-y), pts = [start];
    for (let s = 1; s <= 3; s++) {
      const f = (s / 3) * len;
      pts.push(new THREE.Vector3(start.x + Math.cos(a) * f, start.y - f * 0.45 + (rand(i * 7 + s) - 0.5) * 0.08, start.z + Math.sin(a) * f * 0.55));
    }
    geos.push(tube(pts, 0.026));
    const mid = pts[2], b = a + (i % 2 ? 0.9 : -0.9);
    const sub = [mid, mid.clone().add(new THREE.Vector3(Math.cos(b) * 0.18, -0.12, Math.sin(b) * 0.1)), mid.clone().add(new THREE.Vector3(Math.cos(b) * 0.32, -0.28, Math.sin(b) * 0.18))];
    geos.push(tube(sub, 0.016));
    laterals.push({ pts, junction: start });
  });
  const roots = kit.mesh(mergeGeometries(geos), rootMat, [0, 0, 0], plant);
  roots.castShadow = false;

  // Stem with a gentle curve, and a thin blue water pipe inside it.
  const stemMat = flat(0x4f9a3a, { transparent: true, opacity: 1 });
  const stemGeo = new THREE.CylinderGeometry(0.06, 0.1, STEM_H, 10, 8).translate(0, STEM_H / 2, 0);
  const stemX = y => 0.05 * Math.sin(y * 1.4);
  { const p = stemGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + stemX(p.getY(i))); stemGeo.computeVertexNormals(); }
  const stem = kit.mesh(stemGeo, stemMat, [0, 0, 0], plant);
  const pipeMat = new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.55, depthWrite: false });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, STEM_H - 0.1, 6).translate(0, STEM_H / 2, 0), pipeMat);
  pipe.visible = false;
  stem.add(pipe);

  // Leaves on the stem. Each node group sits at its height times the stem's growth.
  const leafMat = flat(0x3f9b3a, { side: THREE.DoubleSide });
  const leafGeo = leafGeometry(THREE, 0.85, 0.42, 0.12);
  const leaves = NODES.map((y, i) => {
    const node = new THREE.Group();
    plant.add(node);
    const pivot = new THREE.Group();
    pivot.rotation.y = YAWS[i];
    node.add(pivot);
    const m = kit.mesh(leafGeo, leafMat, [0.03, 0, 0], pivot);
    m.rotation.set(0.75 * Math.cos(YAWS[i]), 0, 0.3);
    const tip = new THREE.Object3D(); tip.position.set(0.8, -0.05, 0); m.add(tip);
    const mid = new THREE.Object3D(); mid.position.set(0.42, 0.06, 0); m.add(mid);
    return { y, node, pivot, m, tip, mid };
  });

  // Flowers: five yellow petals round an orange centre, with green sepals behind.
  const petalMat = flat(0xffd23f, { side: THREE.DoubleSide });
  const sepalMat = flat(0x3f8f34, { side: THREE.DoubleSide });
  const petalGeo = leafGeometry(THREE, 0.2, 0.09, 0.1), sepalGeo = leafGeometry(THREE, 0.13, 0.05, 0.05);
  function makeFlower(parent, pos) {
    const f = new THREE.Group();
    f.position.set(...pos);
    f.rotation.x = 1.0; // face the viewer
    parent.add(f);
    const petals = new THREE.Group();
    f.add(petals);
    for (let k = 0; k < 5; k++) {
      const piv = new THREE.Group(); piv.rotation.y = (k / 5) * Math.PI * 2; petals.add(piv);
      kit.mesh(petalGeo, petalMat, [0.02, 0, 0], piv).rotation.z = 0.15;
      const s = new THREE.Group(); s.rotation.y = (k / 5 + 0.1) * Math.PI * 2; f.add(s);
      kit.mesh(sepalGeo, sepalMat, [0.01, -0.015, 0], s).rotation.z = -0.25;
    }
    kit.mesh(new THREE.ConeGeometry(0.035, 0.08, 6), flat(0xf08a24), [0, 0.04, 0], f);
    return { f, petals };
  }
  const branchMat = stemMat;
  const twig = (a, b, r = 0.025) => {
    const A = V(a), B = V(b), len = A.distanceTo(B);
    const m = kit.mesh(new THREE.CylinderGeometry(r * 0.8, r, len, 6), branchMat, [0, 0, 0], plant);
    m.position.copy(A).lerp(B, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  };
  const topTwigs = [twig([stemX(2.1), 2.1, 0], FLOWERS[0]), twig([stemX(2.3), 2.3, 0], FLOWERS[1])];
  const flowers = FLOWERS.map(p => makeFlower(plant, p));

  // Fruit branch: two tomatoes (they start as flowers in the grow step).
  const fruitMat = flat(0x3f9b3a, { roughness: 0.45 });
  const fruitGreen = new THREE.Color(0x7cbf3f), fruitRed = new THREE.Color(0xe0352b);
  const sideTwigs = [twig([stemX(1.05), 1.05, 0], [0.55, 1.45, 0.05], 0.03), twig([0.55, 1.45, 0.05], [FRUITS[0][0], FRUITS[0][1] + 0.15, FRUITS[0][2]], 0.015), twig([0.55, 1.45, 0.05], [FRUITS[1][0], FRUITS[1][1] + 0.15, FRUITS[1][2]], 0.015)];
  const tomatoGeo = new THREE.SphereGeometry(0.16, 14, 10);
  const calyxGeo = leafGeometry(THREE, 0.1, 0.035, 0.1);
  const fruits = FRUITS.map((p, i) => {
    const g = new THREE.Group(); g.position.set(...p); plant.add(g);
    const ball = kit.mesh(tomatoGeo, fruitMat, [0, 0, 0], g); ball.scale.set(1, 0.85, 1);
    for (let k = 0; k < 5; k++) { const piv = new THREE.Group(); piv.rotation.y = (k / 5) * Math.PI * 2; piv.position.y = 0.13; g.add(piv); kit.mesh(calyxGeo, sepalMat, [0, 0, 0], piv).rotation.z = 0.3; }
    const bud = makeFlower(plant, [p[0], p[1] + 0.02, p[2] + 0.05]);
    bud.f.rotation.x = 1.2 + i * 0.2;
    return { g, ball, bud };
  });

  // The seed the plant grows from (grow step).
  const seedMat = flat(0xe8d48a);
  const seed = kit.mesh(new THREE.SphereGeometry(0.07, 10, 6), seedMat, [0, -0.22, 0.05], scene);
  seed.scale.set(1, 0.6, 1.4);

  // A tomato cut in half, full of seeds (fruit step), and a new seed that sprouts in the soil.
  const half = new THREE.Group();
  half.position.set(1.3, 0.72, 0.55);
  half.rotation.set(0.15, -0.5, 0);
  scene.add(half);
  kit.mesh(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), flat(0xe0352b, { side: THREE.DoubleSide }), [0, 0, 0], half).rotation.x = -Math.PI / 2;
  const face = kit.mesh(new THREE.CircleGeometry(0.42, 24), flat(0xf26a4f), [0, 0, 0.002], half);
  face.castShadow = false;
  const jelly = flat(0xf7a25e), seedGeo = new THREE.SphereGeometry(0.025, 6, 4);
  for (let c = 0; c < 3; c++) {
    const a = (c / 3) * Math.PI * 2 + 0.5;
    const room = kit.mesh(new THREE.CircleGeometry(0.13, 12), jelly, [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.004], half);
    room.scale.set(1, 1.3, 1); room.rotation.z = a; room.castShadow = false;
    for (let k = 0; k < 5; k++) {
      const s = kit.mesh(seedGeo, seedMat, [Math.cos(a) * 0.2 + (rand(c * 9 + k) - 0.5) * 0.14, Math.sin(a) * 0.2 + (rand(c * 9 + k + 50) - 0.5) * 0.18, 0.012], half);
      s.scale.set(1.4, 1, 0.5);
    }
  }
  half.visible = false;
  const sprout = new THREE.Group();
  sprout.position.set(...NEW_SEED);
  scene.add(sprout);
  const newSeed = kit.mesh(new THREE.SphereGeometry(0.075, 8, 6), seedMat, [0, 0, 0], sprout);
  newSeed.scale.set(1.4, 0.6, 1);
  const sproutRoot = kit.mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.3, 5).translate(0, -0.15, 0), rootMat, [0, 0, 0], sprout);
  const sproutStem = kit.mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.5, 5).translate(0, 0.25, 0), stemMat, [0, 0, 0], sprout);
  const sproutLeaves = new THREE.Group(); sproutLeaves.position.y = 0.5; sprout.add(sproutLeaves);
  const smallLeaf = leafGeometry(THREE, 0.16, 0.08, 0.1);
  for (const s of [0, Math.PI]) { const p = new THREE.Group(); p.rotation.y = s - 0.4; sproutLeaves.add(p); kit.mesh(smallLeaf, leafMat, [0, 0, 0], p).rotation.z = 0.3; }
  sprout.visible = false;

  // Sun with rays to the leaves (leaf step).
  const sunBall = kit.mesh(new THREE.SphereGeometry(0.3, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffd34d }), SUN, scene);
  sunBall.castShadow = false;
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.4, depthWrite: false });
  const rays = leaves.map(() => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4), rayMat); scene.add(r); return r; });

  // Bee with pollen (flower step).
  const bee = new THREE.Group();
  scene.add(bee);
  const beeBody = kit.mesh(new THREE.SphereGeometry(0.06, 10, 8), flat(0xf6c431), [0, 0, 0], bee);
  beeBody.scale.set(1, 0.9, 1.5);
  for (const z of [-0.03, 0.03]) kit.mesh(new THREE.TorusGeometry(0.055, 0.012, 4, 10), flat(0x2b2b2b), [0, 0, z], bee).scale.set(1, 0.9, 1);
  kit.mesh(new THREE.SphereGeometry(0.035, 8, 6), flat(0x2b2b2b), [0, 0.01, 0.09], bee);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), wingMat); w.position.set(s * 0.05, 0.06, 0); w.rotation.x = -Math.PI / 2; w.scale.set(0.6, 1, 1); bee.add(w); w.side = s; return w; });
  const pollenMat = flat(0xffb703);
  const pollen = [];
  for (let i = 0; i < 6; i++) { const p = kit.mesh(new THREE.SphereGeometry(0.018, 6, 4), pollenMat, [(i % 2 ? 1 : -1) * 0.05, -0.05, -0.02 + (i >> 1) * 0.02], bee); pollen.push(p); }
  bee.visible = false;
  const miniFruit = kit.mesh(new THREE.SphereGeometry(0.06, 10, 8), flat(0x7cbf3f), FLOWERS[1], plant);
  miniFruit.visible = false;

  // Water drops and food (sugar) dots that travel along paths through the plant.
  grow(1);
  plant.updateMatrixWorld(true);
  const W = v => v.clone().applyMatrix4(plant.matrixWorld);
  const worldOf = o => o.getWorldPosition(new THREE.Vector3());
  const path = pts => { const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1])); return { pts, len, total: len[len.length - 1] }; };
  const at = (p, u, out) => {
    const d = clamp(u, 0, 1) * p.total;
    let i = 1; while (i < p.len.length - 1 && p.len[i] < d) i++;
    const s = (d - p.len[i - 1]) / Math.max(1e-6, p.len[i] - p.len[i - 1]);
    return out.copy(p.pts[i - 1]).lerp(p.pts[i], clamp(s, 0, 1));
  };
  const DROPS = 14;
  const waterPaths = [];
  for (let j = 0; j < DROPS; j++) {
    const L = laterals[j % laterals.length], lf = leaves[j % leaves.length];
    const tip = L.pts[L.pts.length - 1];
    const out = tip.clone().sub(L.junction).setY(0).normalize().multiplyScalar(0.22);
    const below = [];
    for (const p of tap) if (p.y > L.junction.y) below.push(p);
    const rootPart = [tip.clone().add(out).add(new THREE.Vector3(0, -0.05 - rand(j) * 0.1, 0)), ...L.pts.slice().reverse(), ...below.reverse()];
    const up = [new THREE.Vector3(stemX(0.01), 0.01, 0), new THREE.Vector3(stemX(lf.y), lf.y, 0), worldOf(lf.mid), worldOf(lf.tip)];
    const a = path(rootPart.map(W)), b = path(up);
    waterPaths.push({ root: a, up: b });
  }
  const sugarPaths = leaves.map(lf => path([worldOf(lf.tip), worldOf(lf.mid), new THREE.Vector3(stemX(lf.y), lf.y, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, -0.35, 0.03), new THREE.Vector3(-0.04, -0.7, 0.06)]));
  const dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 8, 6), new THREE.MeshBasicMaterial({ color: 0x2f86e8 }), DROPS);
  const SUGAR = 16;
  const sugarMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.048, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff9800 }), SUGAR);
  const RAIN = 20;
  const rainMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0x2f86e8 }), RAIN);
  dropMesh.renderOrder = sugarMesh.renderOrder = 0;
  scene.add(dropMesh, sugarMesh, rainMesh);
  const dummy = new THREE.Object3D(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), SUNV = V(SUN);
  const BEE = { A: V(FLOWERS[0]).add(V([0, 0.12, 0.2])), B: V(FLOWERS[1]).add(V([0, 0.12, 0.2])), P0: V([1.4, 2.7, 0.8]), P3: V([-1.5, 2.9, 0.8]) };

  // Labels.
  const anchor = (parent, p) => { const o = new THREE.Object3D(); o.position.set(...p); parent.add(o); return o; };
  const tags = {
    roots: label('Roots', laterals[0].pts[3], { cls: 'warm' }),
    stem: label('Stem', anchor(plant, [0.08, 0.7, 0]), { cls: 'warm' }),
    leaf: label('Leaf', leaves[1].tip, { cls: 'warm' }),
    flower: label('Flower', flowers[1].f, { cls: 'warm' }),
    fruit: label('Fruit', anchor(fruits[1].g, [0.1, -0.05, 0]), { cls: 'warm' }),
    seed: label('Seed', seed),
    seeds: label('Seeds', anchor(half, [0.15, 0.25, 0])),
    newSeed: label('New plant', anchor(sprout, [0, 0.25, 0])),
    soil: label('Soil', V([-1.1, -0.95, 0.9])),
    water: label('Water', V([-1.1, -0.5, 0.6]), { cls: 'cool' }),
    sun: label('Sunlight', sunBall, { cls: 'warm' }),
    bee: label('Bee', bee),
    pollen: label('Pollen', anchor(flowers[0].f, [0, 0.0, 0.1])),
  };
  const showTags = list => { for (const [k, l] of Object.entries(tags)) l.show(list.includes(k)); };

  const PARTS = { roots: [rootMat], stem: [stemMat], leaf: [leafMat], flower: [petalMat], fruit: [fruitMat] };
  const JOBS = {
    roots: '<b>Roots</b> hold the plant in the soil and drink up water.',
    stem: '<b>The stem</b> holds the plant up and carries water to the leaves.',
    leaf: '<b>Leaves</b> use sunlight to make food for the plant.',
    flower: '<b>Flowers</b> make seeds.',
    fruit: '<b>The fruit</b> holds and protects the seeds.',
  };
  const st = {
    step: 0, time: 0, quiz: false, plan: [], gAuto: false, slider: null, glow: null, cycle: -1, auto: false,
    flow: 0, flowTo: 0, flowPart: 'root', wet: 0, wetTo: 0, rainT: -1, lift: 0, liftT: -1,
    light: 1, sugar: 0, beeT: -1, cutT: -1, plantT: -1, inside: false,
  };
  const glow = name => { st.glow = name; if (name) ui.readout(JOBS[name]); };

  function grow(g) {
    growNow = g;
    seed.visible = g < 0.3;
    seed.scale.set(1, 0.6, 1.4).multiplyScalar(Math.max(0.01, 1 - smooth(0.12, 0.3, g)));
    const r = Math.max(0.001, smooth(0.03, 0.55, g));
    roots.scale.set(r, r, r);
    roots.position.y = lerp(-0.22, 0, smooth(0.03, 0.2, g));
    const h = Math.max(0.001, smooth(0.1, 0.6, g));
    stem.scale.set(0.4 + 0.6 * h, h, 0.4 + 0.6 * h);
    stem.visible = g > 0.1;
    leaves.forEach((lf, i) => {
      const s = smooth(0.15 + 0.1 * i, 0.3 + 0.1 * i, g);
      lf.node.position.set(stemX(lf.y), lf.y * h, 0);
      lf.node.scale.setScalar(Math.max(0.001, s));
      lf.node.visible = s > 0.005;
    });
    const fl = smooth(0.62, 0.72, g);
    flowers.forEach(f => { f.f.scale.setScalar(Math.max(0.001, fl)); f.f.visible = fl > 0.005; });
    topTwigs.forEach(t => { t.visible = g > 0.6; });
    const side = smooth(0.5, 0.6, g);
    sideTwigs.forEach(t => { t.visible = side > 0.05; t.scale.setScalar(Math.max(0.001, side)); });
    fruits.forEach(fr => {
      const bud = smooth(0.58, 0.66, g) * (1 - smooth(0.78, 0.86, g));
      fr.bud.f.scale.setScalar(Math.max(0.001, bud)); fr.bud.f.visible = bud > 0.005;
      const size = smooth(0.8, 0.94, g);
      fr.g.scale.setScalar(Math.max(0.001, size)); fr.g.visible = size > 0.005;
    });
    fruitMat.color.copy(fruitGreen).lerp(fruitRed, smooth(0.9, 1, g));
  }
  const stageName = g => g < 0.12 ? 'a seed in the soil' : g < 0.3 ? 'a seed sprouting: root down, shoot up' : g < 0.6 ? 'a young plant with leaves' : g < 0.8 ? 'a plant with flowers' : 'a plant with fruits';
  function growTags() {
    const g = growNow;
    showTags([g < 0.3 && 'seed', g > 0.12 && 'roots', g > 0.35 && 'stem', g > 0.35 && 'leaf', g > 0.68 && 'flower', g > 0.9 && 'fruit'].filter(Boolean));
  }

  function resetStep() {
    st.plan = []; st.glow = null; st.flowTo = 0; st.flow = 0; st.wetTo = 0; st.rainT = -1; st.liftT = -1; st.beeT = -1; st.cutT = -1; st.plantT = -1;
    st.light = 1; st.inside = false; st.gAuto = false; st.auto = false; st.cycle = -1;
    grow(1);
    stemMat.opacity = 1; stemMat.transparent = false; stemMat.depthWrite = true; stemMat.needsUpdate = true; pipe.visible = false;
    for (const ms of Object.values(PARTS)) for (const m of ms) m.emissive.setHex(0x000000);
    rays.forEach(r => { r.visible = false; });
    bee.visible = false; miniFruit.visible = false; flowers[1].petals.scale.setScalar(1);
    half.visible = false; sprout.visible = false;
    sunBall.visible = false;
  }
  function seeInside(on) {
    st.inside = on;
    stemMat.transparent = on; stemMat.opacity = on ? 0.4 : 1; stemMat.depthWrite = !on; stemMat.needsUpdate = true;
    pipe.visible = on;
  }

  const WHOLE = { radius: 2.4, yaw: 0.25, pitch: 0.12, target: [0.15, 0.6, 0] };

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.time = 0;
      resetStep();
      if (i === 0) {
        view(WHOLE);
        showTags(['roots', 'stem', 'leaf', 'flower', 'fruit']);
        st.auto = true;
        ui.buttons(Object.keys(PARTS).map(p => ({ label: p === 'leaf' ? 'Leaves' : p === 'roots' ? 'Roots' : p[0].toUpperCase() + p.slice(1), onClick: () => { st.auto = false; glow(p); } })));
        ui.readout('Press a part to see its job.');
      }
      if (i === 1) {
        view({ radius: 1.5, yaw: 0.2, pitch: 0.12, target: [0, -0.6, 0.2] });
        showTags(['roots', 'soil', 'water']);
        glow('roots');
        st.flowPart = 'root';
        const water = () => { st.rainT = 0; st.wetTo = 1; st.flowTo = 1; ui.readout('The roots <b>drink up water</b> from the wet soil.'); };
        st.plan = [[0.3, water]];
        ui.buttons([
          { label: 'Water the soil', onClick: water },
          { label: 'Pull the plant', onClick: () => { st.liftT = 0; ui.readout('Pull! The roots <b>hold the plant</b> tight in the soil.'); } },
        ]);
      }
      if (i === 2) {
        view({ radius: 1.75, yaw: 0.2, pitch: 0.1, target: [0.1, 1.0, 0] });
        showTags(['stem', 'leaf']);
        glow('stem');
        st.flowPart = 'up'; st.flowTo = 1; st.flow = 1;
        seeInside(true);
        ui.toggle({ label: 'See inside the stem', value: true, onChange: seeInside });
      }
      if (i === 3) {
        view({ radius: 1.9, yaw: 0.35, pitch: 0.18, target: [0.55, 1.75, 0.2] });
        showTags(['leaf', 'sun']);
        glow('leaf');
        sunBall.visible = true;
        st.light = 1;
        const msg = v => ui.readout(v < 0.1 ? 'No light: the leaves <b>cannot make food</b>.' : v < 0.5 ? 'Dim light: the leaves make <b>a little food</b>.' : 'Bright light: the leaves make <b>lots of food</b>.');
        ui.slider({ label: 'Sunlight', min: 0, max: 100, step: 1, value: 100, unit: '%', onInput: v => { st.light = v / 100; msg(st.light); } });
        msg(1);
      }
      if (i === 4) {
        view({ radius: 0.95, yaw: 0.15, pitch: 0.12, target: [0.02, 2.4, 0.15] });
        showTags(['flower', 'bee']);
        glow('flower');
        const send = () => { st.beeT = 0; miniFruit.visible = false; flowers[1].petals.scale.setScalar(1); };
        st.plan = [[0.3, send]];
        ui.buttons([{ label: 'Send the bee', onClick: send }]);
        ui.readout('The bee carries <b>pollen</b> from one flower to the other.');
      }
      if (i === 5) {
        view({ radius: 1.45, yaw: 0.15, pitch: 0.12, target: [0.8, 0.5, 0.35] });
        showTags(['fruit']);
        glow('fruit');
        const cut = () => { st.cutT = 0; tags.seeds.show(true); ui.readout('Inside the tomato are lots of <b>seeds</b>.'); };
        const sow = () => { if (st.cutT < 0) cut(); st.plantT = 0; tags.newSeed.show(true); ui.readout('A seed grows into a <b>new plant</b>.'); };
        st.plan = [[0.3, cut], [1.6, sow]];
        ui.buttons([{ label: 'Cut a tomato open', onClick: cut }, { label: 'Plant a seed', onClick: sow }]);
      }
      if (i === 6) {
        view({ ...WHOLE, radius: 2.3 });
        st.gAuto = true; grow(0);
        st.slider = ui.slider({ label: 'Grow', min: 0, max: 100, step: 1, value: 0, unit: '%', onInput: v => { st.gAuto = false; grow(v / 100); growTags(); ui.readout(`Now it is ${stageName(growNow)}.`); } });
        ui.buttons([{ label: 'Grow again', onClick: () => { st.gAuto = true; grow(0); } }]);
        growTags();
        ui.readout(`Now it is ${stageName(0)}.`);
      }
      if (isQuiz) {
        view({ ...WHOLE, yaw: -0.3 });
        showTags([]);
      }
    },

    update(dt, time) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();

      // Step 1 cycles through the parts by itself until a part is pressed.
      if (st.step === 0 && st.auto && !st.quiz) {
        const keys = Object.keys(PARTS), n = Math.floor(st.time / 2.5) % keys.length;
        if (n !== st.cycle) { st.cycle = n; glow(keys[n]); }
      }
      // Glow the chosen part.
      const pulse = 0.25 + 0.2 * Math.sin(time * 5);
      for (const [name, ms] of Object.entries(PARTS)) for (const m of ms) {
        if (name === st.glow) m.emissive.setRGB(pulse, pulse * 0.85, pulse * 0.3); else m.emissive.setHex(0x000000);
      }

      // Grow step: play from seed to fruit.
      if (st.step === 6 && st.gAuto) {
        const g = Math.min(1, growNow + dt * 0.18);
        if (g !== growNow) { grow(g); growTags(); ui.readout(`Now it is ${stageName(g)}.`); st.slider?.set(Math.round(g * 100)); }
      }

      // Rain on the soil, wet soil, and the pull.
      kit.follow(st, 'wet', st.wetTo, dt, 1.5);
      soilMat.color.copy(soilDry).lerp(soilWet, st.wet);
      rainMesh.visible = st.rainT >= 0 && st.rainT < 2.2;
      if (st.rainT >= 0) {
        st.rainT += dt;
        for (let k = 0; k < RAIN; k++) {
          const y = 1.0 - ((st.rainT * 2.6 + rand(k) * 1.0) % 1.0) - (st.rainT > 1.6 ? 9 : 0);
          dummy.position.set(-1.3 + rand(k + 7) * 2.6, y, -0.8 + rand(k + 17) * 1.6);
          dummy.updateMatrix(); rainMesh.setMatrixAt(k, dummy.matrix);
        }
        rainMesh.instanceMatrix.needsUpdate = true;
      }
      if (st.liftT >= 0) {
        st.liftT += dt;
        const u = st.liftT;
        plant.position.y = u < 0.6 ? 0.1 * Math.sin((u / 0.6) * Math.PI / 2) + 0.015 * Math.sin(u * 60) : 0.1 * Math.max(0, 1 - (u - 0.6) * 3) * Math.cos((u - 0.6) * 25);
        if (u > 1.2) { st.liftT = -1; plant.position.y = 0; }
      }

      // Water drops: through the soil into the roots, or up the stem to the leaves.
      kit.follow(st, 'flow', st.flowTo, dt, 2);
      dropMesh.visible = st.flow > 0.02 && !st.quiz;
      if (dropMesh.visible) {
        for (let j = 0; j < DROPS; j++) {
          const p = waterPaths[j], s = (time * 0.18 + j / DROPS) % 1;
          at(st.flowPart === 'root' ? p.root : p.up, s, tmp);
          dummy.position.copy(tmp).add(plant.position);
          dummy.scale.setScalar(st.flow * (st.flowPart === 'up' && s > 0.92 ? (1 - s) / 0.08 : 1));
          dummy.updateMatrix(); dropMesh.setMatrixAt(j, dummy.matrix);
        }
        dropMesh.instanceMatrix.needsUpdate = true;
      }

      // Sunlight: brighter sky, rays to the leaves and more food dots.
      const leafStep = st.step === 3 && !st.quiz;
      kit.follow(st, 'sugar', leafStep ? st.light : 0, dt, 3);
      sunLight.intensity = leafStep ? 0.5 + 2.0 * st.light : 2.4;
      scene.background.copy(night).lerp(sky, leafStep ? 0.25 + 0.75 * st.light : 1);
      sunBall.material.color.setHex(leafStep && st.light < 0.05 ? 0x8a8a80 : 0xffd34d);
      rays.forEach((r, k) => {
        r.visible = leafStep && st.light > 0.03;
        if (!r.visible) return;
        const a = SUNV, b = leaves[k].mid.getWorldPosition(tmp);
        r.position.copy(a).lerp(b, 0.5); r.scale.set(1, a.distanceTo(b), 1);
        r.quaternion.setFromUnitVectors(UP, tmp2.subVectors(b, a).normalize());
      });
      rayMat.opacity = 0.15 + 0.35 * st.light;
      sugarMesh.visible = st.sugar > 0.02;
      if (sugarMesh.visible) {
        const n = Math.round(st.sugar * SUGAR);
        for (let j = 0; j < SUGAR; j++) {
          const s = (time * 0.15 + (j % 4) / 4 + Math.floor(j / 4) * 0.06) % 1;
          at(sugarPaths[j % sugarPaths.length], s, dummy.position);
          dummy.scale.setScalar(j < n ? 1 : 0.0001);
          dummy.updateMatrix(); sugarMesh.setMatrixAt(j, dummy.matrix);
        }
        sugarMesh.instanceMatrix.needsUpdate = true;
      }

      // Bee: flower A, then flower B, then away. Flower B then starts to turn into a fruit.
      if (st.beeT >= 0) {
        st.beeT += dt;
        const u = st.beeT, { A, B, P0, P3 } = BEE;
        bee.visible = u < 5.8;
        if (u < 1.2) bee.position.copy(P0).lerp(A, kit.ease(u / 1.2));
        else if (u < 2.4) bee.position.copy(A);
        else if (u < 3.2) bee.position.copy(A).lerp(B, kit.ease((u - 2.4) / 0.8));
        else if (u < 4.4) bee.position.copy(B);
        else bee.position.copy(B).lerp(P3, kit.ease(Math.min(1, (u - 4.4) / 1.4)));
        bee.position.y += Math.sin(time * 9) * 0.015;
        bee.rotation.y = u < 2.4 ? -2.2 : u < 4.4 ? 1.6 : -1.4;
        wings.forEach(w => { w.rotation.y = w.side * Math.sin(time * 60) * 0.6; });
        pollen.forEach(p => { p.visible = u > 1.6 && u < 4.0; });
        tags.pollen.show(u > 1.4 && u < 2.6 && st.step === 4);
        flowers[1].petals.scale.setScalar(Math.max(0.001, 1 - smooth(4.6, 6.2, u)));
        miniFruit.visible = u > 5;
        miniFruit.scale.setScalar(Math.max(0.001, smooth(5, 7, u)));
      }
      // Fruit step: the cut tomato appears, then a seed drops into the soil and sprouts.
      if (st.cutT >= 0) {
        st.cutT += dt;
        half.visible = true;
        half.scale.setScalar(Math.max(0.001, smooth(0, 0.6, st.cutT)));
      }
      if (st.plantT >= 0) {
        st.plantT += dt;
        const u = st.plantT;
        sprout.visible = true;
        const fall = smooth(0, 0.9, u);
        newSeed.position.set(lerp(0.35, 0, fall), lerp(1.0, 0, fall), lerp(-0.2, 0, fall));
        const r = smooth(1.0, 2.0, u), s = smooth(1.6, 3.4, u);
        sproutRoot.scale.set(1, Math.max(0.001, r), 1); sproutRoot.visible = r > 0.01;
        sproutStem.scale.set(1, Math.max(0.001, s), 1); sproutStem.visible = s > 0.01;
        sproutLeaves.position.y = 0.5 * s; sproutLeaves.scale.setScalar(Math.max(0.001, smooth(2.4, 3.6, u))); sproutLeaves.visible = u > 2.4;
      }
      return true;
    },
  };
}

// Brown soil with darker and lighter speckles (drawn in code, nothing to download).
function speckle(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#7a5232'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rand(i) > 0.5 ? '#5e3d22' : '#946642';
    g.beginPath(); g.arc(rand(i + 1000) * 256, rand(i + 2000) * 256, 1 + rand(i + 3000) * 2.5, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 1);
  return t;
}
