// Ecosystems: a meadow-and-pond diorama (living and non-living parts; population, community, habitat); a
// stepped food web of nine species with producers and consumers at each level, where removing a species changes
// the others (a simple labelled model); an energy pyramid whose slab areas are drawn to scale (about 10% passed
// on); carbon cycling through plants, animals, decomposers and the air while energy flows one way; and a
// predator–prey population model (Lotka–Volterra) drawn as a graph with a meadow of rabbits and foxes.
import { rabbit, bird, fish } from '../_shared/critters.js';
import { makeTree, tuftGeometry, makeMushroom, makeFrog, rand } from '../_shared/habitat-kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const WEB = [9, 0, 0];
const PYR = [18, 0, 0];
const CYC = [26, 0, 0];
const POP = [34, 0, 0];

// The food web: who eats whom (arrows point from the food to the eater, the way energy flows).
const SPECIES = {
  grass: { name: 'Grass', lvl: 0, pos: [-0.85, 0, 1.05] },
  bush: { name: 'Berry bush', lvl: 0, pos: [0.85, 0, 1.05] },
  hopper: { name: 'Grasshopper', lvl: 1, pos: [-1.25, 0, 0.35] },
  rabbit: { name: 'Rabbit', lvl: 1, pos: [0, 0, 0.35] },
  mouse: { name: 'Mouse', lvl: 1, pos: [1.25, 0, 0.35] },
  frog: { name: 'Frog', lvl: 2, pos: [-1.25, 0, -0.35] },
  bird: { name: 'Thrush', lvl: 2, pos: [0, 0, -0.35] },
  snake: { name: 'Snake', lvl: 2, pos: [1.25, 0, -0.35] },
  hawk: { name: 'Hawk', lvl: 3, pos: [0, 0, -1.05] },
};
const EATS = [['grass', 'hopper'], ['grass', 'rabbit'], ['grass', 'mouse'], ['bush', 'mouse'], ['bush', 'bird'], ['hopper', 'frog'], ['hopper', 'bird'],
  ['mouse', 'snake'], ['frog', 'snake'], ['mouse', 'hawk'], ['rabbit', 'hawk'], ['snake', 'hawk'], ['bird', 'hawk']];
const TIER_Y = [0.25, 0.6, 0.95, 1.3];
const LEVELS = [
  ['Producers', ['grass', 'bush'], '<b>Producers</b> (plants) make their own food by photosynthesis, using energy from sunlight. Every food chain starts with a producer.'],
  ['Primary consumers', ['hopper', 'rabbit', 'mouse'], '<b>Primary consumers</b> eat producers. They are herbivores (plant eaters), like the grasshopper, rabbit and mouse.'],
  ['Secondary consumers', ['frog', 'bird', 'snake'], '<b>Secondary consumers</b> eat primary consumers. The thrush also eats berries, so it is an omnivore that feeds at two levels.'],
  ['Tertiary consumers', ['hawk'], '<b>Tertiary consumers</b> eat secondary consumers. The hawk is the top predator here. The snake is also a tertiary consumer when it eats frogs.'],
  ['Decomposers', [], '<b>Decomposers</b> (fungi and bacteria) feed on dead plants, dead animals and droppings from every level, breaking them down and returning nutrients to the soil.'],
];
const REMOVE = ['hopper', 'mouse', 'snake', 'hawk'];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xe5e8d8, sky: 0xe4f1fb, radius: 45 });
  ground.position.x = 17;
  const sun = kit.lights(scene, { sun: [4, 10, 7] });
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const group = (p, parent = scene) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; };
  const anchor = (parent, pos) => { const o = new THREE.Object3D(); o.position.set(...pos); parent.add(o); return o; };
  const flat = (c, o) => kit.mat(c, { flatShading: true, ...o });
  const M4 = new THREE.Matrix4(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(), Q = new THREE.Quaternion(), C1 = new THREE.Color();
  const matsOf = (obj, list) => { obj.traverse(o => { if (o.isMesh && o.material && !list.includes(o.material)) list.push(o.material); }); return list; };
  const glow = (list, k) => { for (const m of list) { if (k > 0) m.emissive.copy(C1.copy(m.color)).multiplyScalar(k); else m.emissive.setRGB(0, 0, 0); } };

  // ----- Small animal and plant builders (all stand on y = 0, face +z, about 0.3–0.5 across) -----
  const tuft = tuftGeometry(THREE, { blades: 7, h: 0.3, w: 0.03 });
  const B = {
    grass() { const g = new THREE.Group(), m = flat(0x5fae45); for (let i = 0; i < 5; i++) { const t = kit.mesh(tuft, m, [Math.cos(i * 1.3) * 0.13 * (i ? 1 : 0), 0, Math.sin(i * 1.3) * 0.1 * (i ? 1 : 0)], g); t.scale.setScalar(0.9 + rand(i) * 0.4); } return g; },
    bush() {
      const g = new THREE.Group(), m = flat(0x3f8f3a), red = flat(0xd62f4b);
      for (const [x, y, z, r] of [[0, 0.17, 0, 0.17], [0.12, 0.12, 0.05, 0.12], [-0.12, 0.12, -0.03, 0.13]]) kit.mesh(new THREE.IcosahedronGeometry(r, 1), m, [x, y, z], g);
      for (let i = 0; i < 9; i++) { const a = i * 2.1, y = 0.08 + rand(i) * 0.2; kit.mesh(new THREE.SphereGeometry(0.025, 6, 5), red, [Math.cos(a) * 0.17, y, Math.sin(a) * 0.14 + 0.02], g); }
      return g;
    },
    hopper() {
      const g = new THREE.Group(), m = flat(0x7cbf3f), d = flat(0x4d8a26);
      const b = kit.mesh(new THREE.CapsuleGeometry(0.045, 0.2, 3, 8), m, [0, 0.09, 0], g); b.rotation.x = Math.PI / 2;
      kit.mesh(new THREE.SphereGeometry(0.05, 8, 6), m, [0, 0.11, 0.15], g);
      for (const s of [-1, 1]) {
        const leg = kit.mesh(new THREE.BoxGeometry(0.018, 0.16, 0.02), d, [s * 0.06, 0.1, -0.02], g); leg.rotation.x = 0.9;
        const shin = kit.mesh(new THREE.BoxGeometry(0.014, 0.14, 0.014), d, [s * 0.07, 0.05, -0.1], g); shin.rotation.x = -0.6;
        const ant = kit.mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 3), d, [s * 0.025, 0.19, 0.2], g); ant.rotation.x = 0.7; ant.rotation.z = -s * 0.3;
      }
      return g;
    },
    rabbit() { const r = rabbit(THREE, kit); r.g.scale.setScalar(0.8); return r.g; },
    mouse() {
      const g = new THREE.Group(), m = flat(0x9c8f86), p = flat(0xe9a8b5);
      kit.mesh(new THREE.SphereGeometry(0.08, 10, 8), m, [0, 0.07, 0], g).scale.set(0.8, 0.75, 1.3);
      kit.mesh(new THREE.SphereGeometry(0.05, 10, 8), m, [0, 0.08, 0.11], g).scale.set(0.9, 0.9, 1.2);
      for (const s of [-1, 1]) kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 10), p, [s * 0.035, 0.13, 0.1], g).rotation.x = Math.PI / 2;
      kit.mesh(new THREE.SphereGeometry(0.012, 6, 4), p, [0, 0.08, 0.17], g);
      kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.06, -0.1), V(0.05, 0.03, -0.18), V(0.02, 0.02, -0.27)]), 6, 0.008, 4), p, [0, 0, 0], g);
      return g;
    },
    frog() { const f = makeFrog(THREE, kit); f.scale.setScalar(1.5); f.rotation.y = -Math.PI / 2; return f; },
    bird() { const b = bird(THREE, kit, { feathers: 0x8a6a4a, chest: 0xe8d2a6 }); b.g.scale.setScalar(1.1); return b.g; },
    snake() {
      const g = new THREE.Group(), m = flat(0x7a8b3a), pts = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(V(Math.sin(u * Math.PI * 2.2) * 0.12, 0.03 + (u > 0.85 ? (u - 0.85) * 0.6 : 0), (u - 0.55) * 0.5)); }
      kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.028, 6), m, [0, 0, 0], g);
      const h = kit.mesh(new THREE.SphereGeometry(0.04, 8, 6), m, [pts[12].x, pts[12].y + 0.005, pts[12].z + 0.02], g); h.scale.set(1, 0.7, 1.4);
      return g;
    },
    hawk() {
      const g = new THREE.Group(), m = flat(0x7a5134), pale = flat(0xd9c4a0), y = flat(0xf2b632);
      kit.mesh(new THREE.SphereGeometry(0.1, 10, 8), m, [0, 0.2, 0], g).scale.set(0.9, 1.1, 1.3);
      kit.mesh(new THREE.SphereGeometry(0.075, 10, 8), pale, [0, 0.32, 0.08], g);
      const beak = kit.mesh(new THREE.ConeGeometry(0.025, 0.07, 6), y, [0, 0.31, 0.17], g); beak.rotation.x = Math.PI / 2 + 0.4;
      for (const s of [-1, 1]) { const w = kit.mesh(new THREE.SphereGeometry(0.1, 8, 6), m, [s * 0.2, 0.25, -0.02], g); w.scale.set(1.9, 0.25, 0.9); w.rotation.z = s * 0.35; }
      const tail = kit.mesh(new THREE.BoxGeometry(0.12, 0.02, 0.16), m, [0, 0.15, -0.16], g); tail.rotation.x = -0.4;
      for (const s of [-1, 1]) kit.mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 4), y, [s * 0.04, 0.05, 0.02], g);
      return g;
    },
    fox() {
      const g = new THREE.Group(), m = flat(0xe0782c), w = flat(0xf6eee2), d = flat(0x3b2a20);
      kit.mesh(new THREE.SphereGeometry(0.1, 10, 8), m, [0, 0.17, 0], g).scale.set(0.8, 0.8, 1.6);
      kit.mesh(new THREE.SphereGeometry(0.075, 10, 8), m, [0, 0.24, 0.18], g);
      const sn = kit.mesh(new THREE.ConeGeometry(0.04, 0.1, 6), w, [0, 0.22, 0.27], g); sn.rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) kit.mesh(new THREE.ConeGeometry(0.03, 0.07, 4), m, [s * 0.04, 0.32, 0.17], g);
      for (const [x, z] of [[-0.05, 0.1], [0.05, 0.1], [-0.05, -0.1], [0.05, -0.1]]) kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 5), d, [x, 0.06, z], g);
      const t = kit.mesh(new THREE.SphereGeometry(0.06, 8, 6), m, [0, 0.2, -0.24], g); t.scale.set(0.8, 0.8, 2); t.rotation.x = 0.5;
      kit.mesh(new THREE.SphereGeometry(0.035, 6, 5), w, [0, 0.14, -0.34], g);
      return g;
    },
  };

  // ================= Diorama: a meadow with a pond =================
  const gD = group([0, 0, 0]);
  const soilMat = flat(0x8b6a48), turf = flat(0x8cc66a), rockMat = flat(0x8d8f96), waterMat = new THREE.MeshStandardMaterial({ color: 0x4aa3df, transparent: true, opacity: 0.75, roughness: 0.15 });
  const island = kit.mesh(new THREE.CylinderGeometry(2.6, 2.75, 0.3, 40), [soilMat, turf, soilMat], [0, 0.15, 0], gD);
  island.receiveShadow = true;
  const TOP = 0.3;
  const pond = kit.mesh(new THREE.CircleGeometry(0.78, 32), waterMat, [1.05, TOP + 0.012, 0.7], gD); pond.rotation.x = -Math.PI / 2; pond.castShadow = false;
  const rocks = [];
  for (const [x, z, r] of [[1.85, 0.05, 0.2], [0.3, 1.55, 0.14], [1.9, 1.3, 0.12], [-1.9, -0.6, 0.17]]) {
    const geo = new THREE.DodecahedronGeometry(r, 0); const m = kit.mesh(geo, rockMat, [x, TOP + r * 0.5, z], gD); m.scale.y = 0.7; rocks.push(m);
  }
  const living = [], rabbitsM = [], abiotic = [soilMat, rockMat, waterMat];
  const place = (obj, x, z, ry = 0, s = 1) => { obj.position.set(x, TOP, z); obj.rotation.y = ry; obj.scale.multiplyScalar(s); gD.add(obj); matsOf(obj, living); return obj; };
  const trees = [place(makeTree(THREE, kit, { h: 1.9, r: 0.55 }), -1.2, -1.3), place(makeTree(THREE, kit, { kind: 'pine', h: 2.1, r: 0.45, leaves: 0x3f7f4a }), 0.2, -1.8), place(makeTree(THREE, kit, { h: 1.5, r: 0.45, leaves: 0x5aa54a }), 1.55, -1.1)];
  const tufts = new THREE.InstancedMesh(tuft, flat(0x5fae45), 46);
  for (let i = 0; i < 46; i++) {
    const a = rand(i) * Math.PI * 2, r = 0.5 + rand(i + 50) * 1.9;
    let x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - 1.05, z - 0.7) < 0.9) { x -= 1.8; }
    tufts.setMatrixAt(i, M4.compose(P3.set(x, TOP, z), Q.setFromAxisAngle(V(0, 1, 0), a), S3.setScalar(0.7 + rand(i + 9) * 0.6)));
  }
  gD.add(tufts); living.push(tufts.material);
  const bushD = place(B.bush(), -1.95, 0.55, 0, 1.3);
  const rabbits = [[-0.9, 0.55, 0.4], [-0.5, 1.0, -0.6], [-1.3, 1.15, 1.2], [-0.3, 0.3, 2.2]].map(([x, z, r]) => { const g = B.rabbit(); g.position.set(x, TOP, z); g.rotation.y = r; gD.add(g); matsOf(g, rabbitsM); matsOf(g, living); return g; });
  const fox = place(B.fox(), 0.55, -0.75, -0.5, 1.4);
  const birds = [place(B.bird(), -0.2, -0.9, 0.8), place(B.bird(), 0.9, 1.65, -2.2)];
  const frog = place(B.frog(), 1.75, 0.65, Math.PI, 1);
  const fishes = [0, 1].map(i => { const f = fish(THREE, kit); f.g.scale.setScalar(0.55); f.g.position.set(1.05 + (i ? 0.3 : -0.25), TOP - 0.01, 0.7 + (i ? 0.2 : -0.15)); gD.add(f.g); matsOf(f.g, living); return f.g; });
  const shrooms = [[-0.85, -0.95], [-1.45, -0.85]].map(([x, z]) => place(makeMushroom(THREE, kit, { s: 1.4 }), x, z));
  // The sun (non-living), drawn small and close for the diorama.
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const sunM = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), sunMat); sunM.position.set(-2.1, 3.0, -1.4); gD.add(sunM);
  const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.35, depthWrite: false })); sunHalo.position.copy(sunM.position); gD.add(sunHalo);
  const habitat = kit.mesh(new THREE.TorusGeometry(1.05, 0.03, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffb703 }), [-0.75, TOP + 0.03, 0.85], gD);
  habitat.rotation.x = Math.PI / 2; habitat.scale.set(1, 1.15, 1); habitat.visible = false;
  const dTags = {
    rabbits: label('Rabbits', anchor(rabbits[0], [0, 0.6, 0])),
    trees: label('Trees', anchor(trees[0], [0, 2.0, 0])),
    fox: label('Fox', anchor(fox, [0, 0.55, 0])),
    fungi: label('Fungi', anchor(shrooms[0], [0, 0.35, 0.1])),
    water: label('Water', anchor(gD, [1.1, TOP + 0.1, 1.2]), { cls: 'cool' }),
    sunlight: label('Sunlight', anchor(gD, [-2.1, 3.45, -1.4]), { cls: 'warm' }),
    rocks: label('Rocks', anchor(rocks[0], [0, 0.3, 0])),
    soil: label('Soil', anchor(gD, [-0.6, 0.12, 2.65])),
    air: label('Air', anchor(gD, [0.4, 2.3, 0]), { cls: 'cool' }),
    pop: label('Rabbit population', anchor(rabbits[0], [0, 0.6, 0]), { cls: 'warm' }),
    hab: label('Habitat: the meadow', anchor(gD, [-0.75, TOP + 0.15, 2.1]), { cls: 'warm' }),
    com: label('Community: all the living things', anchor(gD, [0, 2.45, 0]), { cls: 'warm' }),
    eco: label('Ecosystem: community + non-living parts', anchor(gD, [0, 2.75, 0]), { cls: 'warm' }),
  };

  // ================= Food web on stepped tiers =================
  const gW = group(WEB);
  const tierMat = [flat(0xcfe3b8), flat(0xdfe8c8), flat(0xe8e4cc), flat(0xefe0cc)];
  TIER_Y.forEach((y, i) => kit.mesh(new THREE.BoxGeometry(3.4 - i * 0.5, y, 0.7), tierMat[i], [0, y / 2, 1.05 - i * 0.7], gW));
  const nodes = {};
  for (const [k, sp] of Object.entries(SPECIES)) {
    const y = TIER_Y[sp.lvl];
    const g = group([sp.pos[0], y, sp.pos[2]], gW);
    const padMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const pad = kit.mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.04, 24), padMat, [0, 0.02, 0], g); pad.castShadow = false;
    const model = B[k](); model.position.y = 0.04; g.add(model);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x9aa5b1, roughness: 0.5 });
    const bar = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), barMat, [0.3, 0.5, 0], g); bar.visible = false;
    const tag = label(sp.name, anchor(g, [0, sp.lvl === 0 ? 0.42 : 0.48, 0]));
    nodes[k] = { g, model, padMat, bar, barMat, tag, pop: 1, popTo: 1, alive: 1, aliveTo: 1 };
  }
  // Arrows from food to eater, arched a little so they do not hide the animals.
  const arrows = EATS.map(([a, b]) => {
    const A = V(...SPECIES[a].pos).setY(TIER_Y[SPECIES[a].lvl] + 0.18), Bp = V(...SPECIES[b].pos).setY(TIER_Y[SPECIES[b].lvl] + 0.12);
    const dir = Bp.clone().sub(A).normalize();
    const start = A.clone().addScaledVector(dir, 0.22), end = Bp.clone().addScaledVector(dir, -0.27);
    const mid = start.clone().lerp(end, 0.5); mid.y += 0.22;
    const c = new THREE.QuadraticBezierCurve3(start, mid, end);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3f4f63, roughness: 0.5 });
    const g = group([0, 0, 0], gW);
    kit.mesh(new THREE.TubeGeometry(c, 16, 0.02, 6), mat, [0, 0, 0], g).castShadow = false;
    const head = kit.mesh(new THREE.ConeGeometry(0.055, 0.13, 8), mat, [0, 0, 0], g); head.castShadow = false;
    head.position.copy(end); head.quaternion.setFromUnitVectors(V(0, 1, 0), c.getTangent(1));
    return { a, b, g, mat };
  });
  const decomp = group([1.95, 0, 1.25], gW);
  for (const [x, z, s] of [[0, 0, 1.3], [0.16, 0.08, 1], [-0.1, 0.14, 0.8]]) { const m = makeMushroom(THREE, kit, { s, cap: 0xb5651d }); m.position.set(x, 0, z); decomp.add(m); }
  const decompMats = matsOf(decomp, []);
  const wTags = { decomp: label('Decomposers', anchor(decomp, [0, 0.4, 0])), model: label('Model', anchor(gW, [1.75, 1.55, -1.0])) };

  // ================= Energy pyramid =================
  const gP = group(PYR);
  const SL_H = 0.36, B0 = 2.3;
  const slabCols = [0x5fae45, 0xf2c14e, 0xf08a4b, 0xd1495b];
  const slabs = slabCols.map((c, i) => kit.mesh(new THREE.BoxGeometry(1, SL_H, 1), flat(c), [0, SL_H * (i + 0.5), 0], gP));
  // Grass grows on the producer block; one animal from each consumer level stands on a column as tall as its level.
  const pyrGrass = B.grass(); gP.add(pyrGrass);
  ['rabbit', 'bird', 'hawk'].forEach((k, j) => {
    const i = j + 1, h = SL_H * (i + 1), x = -1.55 - j * 0.02, z = 0.75 - j * 0.6;
    kit.mesh(new THREE.CylinderGeometry(0.16, 0.18, h, 16), flat(slabCols[i]), [x, h / 2, z], gP);
    const m = B[k](); m.scale.multiplyScalar(0.8); m.position.set(x, h, z); m.rotation.y = 0.6; gP.add(m);
  });
  // Heat lost at each level: rising, wavy particles.
  const NH = 24;
  const heat = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshStandardMaterial({ color: 0xff6b3d, emissive: 0xff6b3d, emissiveIntensity: 0.6 }), NH);
  heat.frustumCulled = false; heat.castShadow = false; gP.add(heat);
  const pTags = slabCols.map((_, i) => label('', anchor(gP, [0, SL_H * (i + 0.5), 0])));
  const heatTag = label('Heat lost', anchor(gP, [0.2, 1.75, -1.0]), { cls: 'warm' });
  const sunP = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), sunMat); sunP.position.set(1.2, 2.0, -1.2); gP.add(sunP);
  let pyrSides = [B0, 0, 0, 0];

  // ================= Carbon cycle and energy flow =================
  const gC = group(CYC);
  kit.mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.2, 40), [soilMat, turf, soilMat], [0, 0.1, 0], gC);
  const plant = makeTree(THREE, kit, { h: 1.6, r: 0.5 }); plant.position.set(-0.85, 0.2, -0.1); gC.add(plant);
  const rab = B.rabbit(); rab.scale.multiplyScalar(1.5); rab.position.set(0.5, 0.2, 0.3); rab.rotation.y = -0.6; gC.add(rab);
  const shr = group([0.15, 0.2, 1.15], gC);
  for (const [x, z, s] of [[0, 0, 1.5], [0.2, 0.08, 1.1], [-0.15, 0.12, 0.9]]) { const m = makeMushroom(THREE, kit, { s, cap: 0xb5651d }); m.position.set(x, 0, z); shr.add(m); }
  const leaf = kit.mesh(new THREE.BoxGeometry(0.12, 0.01, 0.07), flat(0x9c7a3c), [-0.1, 0.21, 1.15], gC);
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.55, roughness: 0.9, depthWrite: false });
  const cloud = group([0.1, 2.55, -0.3], gC);
  for (const [x, y, r] of [[0, 0, 0.32], [0.35, -0.05, 0.25], [-0.36, -0.04, 0.26], [0.15, 0.15, 0.22]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), cloudMat); m.position.set(x, y, 0); m.renderOrder = 3; cloud.add(m); }
  const sunC = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), sunMat); sunC.position.set(-2.0, 2.6, -0.4); gC.add(sunC);
  const cGeo = new THREE.SphereGeometry(0.04, 8, 6);
  const mk = (pts, color, count = 6, speed = 0.3) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)));
    curve.getLengths();
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.35 });
    const im = new THREE.InstancedMesh(cGeo, m, count); im.frustumCulled = false; im.castShadow = false; gC.add(im);
    return { curve, im, count, speed, phase: 0 };
  };
  const CARB = 0x3d4450, ENER = 0xffc21a, HEAT = 0xff6b3d;
  const carbon = [
    mk([[-0.1, 2.35, -0.3], [-0.6, 2.1, -0.2], [-0.85, 1.6, -0.1]], CARB),               // photosynthesis: air → plant
    mk([[-0.55, 1.05, 0.05], [-0.1, 0.9, 0.3], [0.45, 0.65, 0.35]], CARB),               // eating: plant → rabbit
    mk([[-0.85, 0.9, 0.1], [-0.6, 0.5, 0.7], [-0.05, 0.3, 1.1]], CARB, 5),              // dead leaves → decomposers
    mk([[0.55, 0.35, 0.55], [0.4, 0.3, 0.9], [0.2, 0.3, 1.1]], CARB, 4),                // droppings and dead animals → decomposers
    mk([[0.6, 0.9, 0.3], [0.55, 1.7, 0.0], [0.3, 2.3, -0.3]], CARB, 5),                 // respiration: rabbit → air
    mk([[0.2, 0.55, 1.15], [0.95, 1.4, 0.6], [0.45, 2.35, -0.25]], CARB, 5),            // respiration: decomposers → air
    mk([[-1.15, 1.7, -0.1], [-1.05, 2.2, -0.2], [-0.3, 2.5, -0.3]], CARB, 4),           // respiration: plant → air
  ];
  const energy = [
    mk([[-1.8, 2.45, -0.35], [-1.35, 2.1, -0.2], [-0.95, 1.6, -0.1]], ENER, 6, 0.4),    // sunlight → plant
    mk([[-0.5, 1.15, 0.0], [0.0, 1.05, 0.25], [0.45, 0.8, 0.35]], ENER, 5, 0.3),        // food energy → rabbit
    mk([[-0.85, 0.95, 0.15], [-0.4, 0.55, 0.75], [0.05, 0.35, 1.1]], ENER, 4, 0.3),     // → decomposers
    mk([[-1.25, 1.4, -0.1], [-1.6, 2.2, 0.2], [-1.75, 3.3, 0.3]], HEAT, 5, 0.3),         // heat lost by the plant
    mk([[0.8, 0.7, 0.4], [1.25, 1.6, 0.5], [1.5, 3.0, 0.5]], HEAT, 5, 0.3),             // heat lost by the rabbit
    mk([[0.35, 0.45, 1.25], [0.9, 1.3, 1.4], [1.2, 2.8, 1.4]], HEAT, 5, 0.3),           // heat lost by decomposers
  ];
  const cTags = {
    co2: label('CO₂ in the air', anchor(cloud, [0, 0.45, 0])),
    photo: label('Photosynthesis', anchor(gC, [-1.25, 2.2, -0.2]), { cls: 'cool' }),
    resp: label('Respiration', anchor(gC, [0.95, 1.85, 0.0])),
    decomp: label('Decomposers', anchor(shr, [0, 0.35, 0.1])),
    eat: label('Eating', anchor(gC, [-0.05, 1.08, 0.35])),
    sun: label('Light energy', anchor(gC, [-2.0, 2.95, -0.4]), { cls: 'warm' }),
    heat: label('Heat lost', anchor(gC, [1.45, 2.65, 0.5]), { cls: 'warm' }),
  };

  // ================= Predator and prey model =================
  const gQ = group(POP);
  const GW = 3.2, GH = 1.5, GX = 0, GY = 1.55;
  const board = kit.mesh(new THREE.BoxGeometry(GW + 0.35, GH + 0.45, 0.05), new THREE.MeshBasicMaterial({ color: 0xfbfcfe }), [GX, GY + 0.05, -0.6], gQ);
  board.castShadow = false;
  kit.mesh(new THREE.BoxGeometry(0.06, GY - GH / 2 - 0.15, 0.06), flat(0x9aa5b1), [GX - GW / 2, (GY - GH / 2 - 0.15) / 2, -0.62], gQ);
  kit.mesh(new THREE.BoxGeometry(0.06, GY - GH / 2 - 0.15, 0.06), flat(0x9aa5b1), [GX + GW / 2, (GY - GH / 2 - 0.15) / 2, -0.62], gQ);
  const gridPts = [];
  for (let k = 0; k <= 4; k++) { const y = GY - GH / 2 + k * GH / 4; gridPts.push(V(-GW / 2, y, -0.57), V(GW / 2, y, -0.57)); }
  for (let k = 0; k <= 6; k++) { const x = -GW / 2 + k * GW / 6; gridPts.push(V(x, GY - GH / 2, -0.57), V(x, GY + GH / 2, -0.57)); }
  gQ.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPts), new THREE.LineBasicMaterial({ color: 0xd6dee6 })));
  const YEARS = 30, NP = 301, RMAX = 300, FMAX = 60;
  // Each graph line is a thin ribbon (two vertices per point), drawn up to the current year with setDrawRange.
  const mkLine = (color, z) => {
    const pos = new Float32Array(NP * 2 * 3), idx = [];
    for (let i = 0; i < NP - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); m.frustumCulled = false; gQ.add(m);
    const set = (i, x, y) => { pos.set([x, y - 0.014, z, x, y + 0.014, z], i * 6); };
    return { pos, geo, set };
  };
  const rabLine = mkLine(0x8a6a4a, -0.56), foxLine = mkLine(0xe0782c, -0.555);
  const cursor = new THREE.Mesh(new THREE.BoxGeometry(0.012, GH, 0.01), new THREE.MeshBasicMaterial({ color: 0x1f7ae0 }));
  cursor.position.set(0, GY, -0.55); gQ.add(cursor);
  const series = { r: new Float32Array(NP), f: new Float32Array(NP) };
  // Lotka–Volterra model: dR/dt = a·R − b·R·F,  dF/dt = e·b·R·F − d·F (a, b, d, e chosen for a cycle of about 9 years).
  const LV = { a: 0.8, b: 0.04, d: 0.6, e: 0.1875 };
  function simulate(f0) {
    let R = 120, Fx = f0;
    const h = 0.01, per = Math.round((YEARS / (NP - 1)) / h);
    const dR = (r, f) => LV.a * r - LV.b * r * f, dF = (r, f) => LV.e * LV.b * r * f - LV.d * f;
    for (let i = 0; i < NP; i++) {
      series.r[i] = R; series.f[i] = Fx;
      for (let s = 0; s < per; s++) {
        const k1r = dR(R, Fx), k1f = dF(R, Fx);
        const k2r = dR(R + h / 2 * k1r, Fx + h / 2 * k1f), k2f = dF(R + h / 2 * k1r, Fx + h / 2 * k1f);
        const k3r = dR(R + h / 2 * k2r, Fx + h / 2 * k2f), k3f = dF(R + h / 2 * k2r, Fx + h / 2 * k2f);
        const k4r = dR(R + h * k3r, Fx + h * k3f), k4f = dF(R + h * k3r, Fx + h * k3f);
        R += h / 6 * (k1r + 2 * k2r + 2 * k3r + k4r); Fx += h / 6 * (k1f + 2 * k2f + 2 * k3f + k4f);
      }
    }
    for (let i = 0; i < NP; i++) {
      const x = -GW / 2 + GW * i / (NP - 1);
      rabLine.set(i, x, GY - GH / 2 + GH * Math.min(1, series.r[i] / RMAX));
      foxLine.set(i, x, GY - GH / 2 + GH * Math.min(1, series.f[i] / FMAX));
    }
    rabLine.geo.attributes.position.needsUpdate = true; foxLine.geo.attributes.position.needsUpdate = true;
  }
  // Meadow in front of the graph: one icon for every 20 rabbits and every 5 foxes.
  kit.mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.12, 36), [soilMat, turf, soilMat], [0, 0.06, 0.55], gQ).scale.z = 0.5;
  const icon = (parts, color) => { const geo = mergeGeometries(parts.map(([g, x, y, z, sx = 1, sy = 1, sz = 1]) => g.scale(sx, sy, sz).translate(x, y, z))); return new THREE.InstancedMesh(geo, flat(color), 16); };
  const rabIcons = icon([[new THREE.SphereGeometry(0.07, 8, 6), 0, 0.07, 0, 0.9, 0.85, 1.2], [new THREE.SphereGeometry(0.045, 8, 6), 0, 0.13, 0.07], [new THREE.SphereGeometry(0.02, 6, 4), -0.02, 0.2, 0.06, 0.7, 2.4, 0.5], [new THREE.SphereGeometry(0.02, 6, 4), 0.02, 0.2, 0.06, 0.7, 2.4, 0.5]], 0x9c7b5c);
  const foxIcons = icon([[new THREE.SphereGeometry(0.07, 8, 6), 0, 0.1, 0, 0.8, 0.8, 1.6], [new THREE.SphereGeometry(0.05, 8, 6), 0, 0.15, 0.12], [new THREE.ConeGeometry(0.025, 0.07, 6).rotateX(Math.PI / 2), 0, 0.14, 0.18], [new THREE.SphereGeometry(0.04, 6, 5), 0, 0.12, -0.17, 0.8, 0.8, 2], [new THREE.CylinderGeometry(0.012, 0.012, 0.07, 4), 0.04, 0.035, 0.07], [new THREE.CylinderGeometry(0.012, 0.012, 0.07, 4), -0.04, 0.035, -0.07]], 0xe0782c);
  for (const im of [rabIcons, foxIcons]) { im.frustumCulled = false; im.count = 0; gQ.add(im); }
  const slotR = Array.from({ length: 16 }, (_, i) => V(-1.45 + (i % 8) * 0.24 + (i >= 8 ? 0.1 : 0), 0.12, 0.35 + Math.floor(i / 8) * 0.28 + (rand(i) - 0.5) * 0.06));
  const slotF = Array.from({ length: 16 }, (_, i) => V(0.35 + (i % 6) * 0.2, 0.12, 0.3 + Math.floor(i / 6) * 0.22 + (rand(i + 30) - 0.5) * 0.06));
  const setIcons = (im, n, slots, ry) => {
    n = Math.min(16, n); if (im.count === n) return; im.count = n;
    for (let i = 0; i < n; i++) im.setMatrixAt(i, M4.compose(slots[i], Q.setFromAxisAngle(V(0, 1, 0), ry + rand(i) * 0.6), S3.setScalar(1)));
    im.instanceMatrix.needsUpdate = true;
  };
  const qTags = {
    rab: label('Rabbits (prey, 0–300)', anchor(gQ, [-0.85, GY + GH / 2 + 0.12, -0.55])),
    fox: label('Foxes (predators, 0–60)', anchor(gQ, [0.95, GY + GH / 2 + 0.12, -0.55]), { cls: 'warm' }),
    years: label('Years →', anchor(gQ, [GW / 2 - 0.25, GY - GH / 2 - 0.13, -0.55])),
    model: label('Model', anchor(gQ, [-GW / 2 + 0.3, GY - GH / 2 - 0.13, -0.55])),
  };

  // ================= State, views and steps =================
  const allTags = [...Object.values(dTags), ...Object.values(nodes).map(n => n.tag), ...Object.values(wTags), ...pTags, heatTag, ...Object.values(cTags), ...Object.values(qTags)];
  const F = {
    dio: { radius: 2.7, yaw: 0.35, pitch: 0.42, target: [0, 1.0, 0] },
    web: { radius: 2.05, width: 2.1, yaw: 0.0, pitch: 0.55, target: [WEB[0], 0.85, 0.05] },
    pyr: { radius: 1.6, width: 2.05, yaw: 0.35, pitch: 0.32, target: [PYR[0] - 0.15, 0.85, 0] },
    cyc: { radius: 1.95, width: 2.05, yaw: 0.2, pitch: 0.25, target: [CYC[0] - 0.1, 1.55, 0.2] },
    pop: { radius: 1.6, width: 1.95, yaw: 0.0, pitch: 0.18, target: [POP[0], 1.2, 0] },
    quiz: { radius: 2.8, yaw: -0.45, pitch: 0.42, target: [0, 1.0, 0] },
  };
  const st = { step: 0, quiz: false, time: 0, auto: true, row: null, dmode: '', level: -1, removed: null, E0: 10000, pct: 10, f0: 10, cmode: 'both', simT: 0 };

  function hideAll() {
    for (const tg of allTags) tg.show(false);
    habitat.visible = false;
    glow(living, 0); glow(abiotic, 0); glow(decompMats, 0);
    for (const n of Object.values(nodes)) { n.padMat.emissive.setRGB(0, 0, 0); n.bar.visible = false; }
  }
  function setDio(mode) {
    st.dmode = mode;
    for (const tg of Object.values(dTags)) tg.show(false);
    habitat.visible = false;
    const show = ks => ks.forEach(k => dTags[k].show(true));
    if (mode === 'living') { show(['rabbits', 'trees', 'fox', 'fungi']); ui.readout('<b>Living (biotic) parts</b>: plants, animals, fungi and microorganisms such as bacteria.'); }
    if (mode === 'non') { show(['water', 'sunlight', 'rocks', 'soil', 'air']); ui.readout('<b>Non-living (abiotic) parts</b>: sunlight, water, air, soil, rocks and temperature. Living things depend on them.'); }
    if (mode === 'pop') { show(['pop']); ui.readout('A <b>population</b> is all the organisms of <b>one species</b> living in an area, like all the rabbits in this meadow.'); }
    if (mode === 'com') { show(['com']); ui.readout('A <b>community</b> is all the populations of different species living in the same area and interacting.'); }
    if (mode === 'hab') { show(['hab']); habitat.visible = true; ui.readout('A <b>habitat</b> is the place where an organism lives, which gives it food, water and shelter. The rabbits\' habitat is the grassy meadow.'); }
    if (mode === 'eco') { show(['eco']); ui.readout('An <b>ecosystem</b> is a community together with the non-living parts of its environment, all working as one system.'); }
  }
  function setLevel(j) {
    st.level = j;
    for (const [k, n] of Object.entries(nodes)) n.padMat.emissive.setHex(j < 4 && LEVELS[j][1].includes(k) ? 0xffb703 : 0x000000);
    glow(decompMats, j === 4 ? 0.45 : 0);
    ui.readout(LEVELS[j][2]);
  }
  // Simple model of what happens to the others when one species disappears (1 = normal population).
  const foods = k => EATS.filter(e => e[1] === k).map(e => e[0]);
  const eaters = k => EATS.filter(e => e[0] === k).map(e => e[1]);
  function removeSpecies(r) {
    st.removed = r;
    const d1 = {}, d = {};
    for (const k of Object.keys(SPECIES)) {
      d1[k] = 0;
      if (!r || k === r) continue;
      if (foods(k).includes(r)) d1[k] -= 0.6 / foods(k).length;
      if (eaters(k).includes(r)) d1[k] += 0.5 / eaters(k).length;
    }
    for (const k of Object.keys(SPECIES)) {
      d[k] = d1[k];
      if (!r || k === r) continue;
      for (const f of foods(k)) if (f !== r) d[k] += 0.3 * d1[f] / foods(k).length;
      for (const e of eaters(k)) if (e !== r) d[k] -= 0.3 * d1[e] / eaters(k).length;
    }
    for (const [k, n] of Object.entries(nodes)) { n.aliveTo = k === r ? 0 : 1; n.popTo = k === r ? 0 : kit.clamp(1 + d[k], 0.15, 1.9); }
    for (const a of arrows) a.g.visible = !(a.a === r || a.b === r);
    if (!r) { ui.readout('All nine species are here. Tap one to take it out of the food web.'); return; }
    const up = [], down = [];
    for (const [k, n] of Object.entries(nodes)) { if (k === r) continue; if (n.popTo > 1.1) up.push(SPECIES[k].name); if (n.popTo < 0.9) down.push(SPECIES[k].name); }
    ui.readout(`Without the <b>${SPECIES[r].name.toLowerCase()}</b>:<br>${down.length ? `<b>Fall</b>: ${down.join(', ')} (less food, or more predators).<br>` : ''}${up.length ? `<b>Rise</b>: ${up.join(', ')} (fewer predators, or less competition).` : ''}<br><small>Model: bar heights are predictions from a simple model.</small>`);
  }
  function pyramid() {
    const p = st.pct / 100, E = [st.E0, st.E0 * p, st.E0 * p * p, st.E0 * p * p * p];
    pyrSides = E.map(e => B0 * Math.sqrt(e / st.E0));
    const names = ['Producers', 'Primary consumers', 'Secondary consumers', 'Tertiary consumers'];
    const fmt = v => (v >= 10 ? Math.round(v).toLocaleString('en-US') : v >= 1 ? v.toFixed(1) : v.toFixed(2));
    pTags.forEach((tg, i) => { tg.text = `${fmt(E[i])} kJ`; tg.at.position.set(Math.max(pyrSides[i] / 2, 0.12) + 0.42, SL_H * (i + 0.5), 0); });
    ui.readout(names.map((n, i) => `${n}: <b>${fmt(E[i])} kJ</b>`).join('<br>') + `<br><small>Energy per square metre per year. Each level gets ${st.pct}% of the level below; the rest is lost, mostly as heat. Slab areas are drawn to scale.</small>`);
  }
  function setCycle(mode) {
    st.cmode = mode;
    const c = mode !== 'energy', e = mode !== 'carbon';
    for (const f of carbon) f.im.visible = c;
    for (const f of energy) f.im.visible = e;
    cTags.co2.show(c); cTags.photo.show(c); cTags.resp.show(c); cTags.eat.show(c); cTags.decomp.show(true);
    cTags.sun.show(e); cTags.heat.show(e);
    ui.readout(mode === 'carbon' ? '<b>Carbon cycles</b>: plants take CO₂ from the air in photosynthesis; carbon passes to animals when they eat; decomposers break down dead things and droppings; respiration by all of them returns CO₂ to the air. The same atoms are used again and again.'
      : mode === 'energy' ? '<b>Energy flows one way</b>: light energy from the Sun is captured by plants, passes along the food chain in food, and at every level some is lost as heat. Heat cannot be used by plants again, so ecosystems need a constant supply of sunlight.'
        : 'Grey dots are carbon, going round and round. Yellow dots are energy, coming in from the Sun, and orange dots are heat, leaving for good.');
  }
  function popReadout() {
    const i = Math.min(NP - 1, Math.round(st.simT / YEARS * (NP - 1)));
    ui.readout(`Year <b>${(st.simT).toFixed(1)}</b>: rabbits <b>${Math.round(series.r[i])}</b>, foxes <b>${Math.round(series.f[i])}</b><br><small>Model (Lotka–Volterra): rabbits breed fast; foxes need to eat rabbits to survive and breed.</small>`);
  }

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.auto = true; st.row = null; st.slider = null;
      hideAll();
      if (i === 0) {
        view(F.dio);
        st.row = ui.buttons([{ label: 'Living (biotic)', on: true, onClick: () => { st.auto = false; setDio('living'); } }, { label: 'Non-living (abiotic)', onClick: () => { st.auto = false; setDio('non'); } }]);
        setDio('living');
      }
      if (i === 1) {
        view({ ...F.dio, yaw: -0.15 });
        st.row = ui.buttons([{ label: 'Population', on: true, onClick: () => { st.auto = false; setDio('pop'); } }, { label: 'Community', onClick: () => { st.auto = false; setDio('com'); } }, { label: 'Habitat', onClick: () => { st.auto = false; setDio('hab'); } }, { label: 'Ecosystem', onClick: () => { st.auto = false; setDio('eco'); } }]);
        setDio('pop');
      }
      if (i === 2 || i === 3) {
        view(F.web);
        for (const n of Object.values(nodes)) n.tag.show(true);
        wTags.decomp.show(true);
        removeSpecies(null);
        for (const n of Object.values(nodes)) { n.pop = n.popTo = 1; n.alive = n.aliveTo = 1; }
      }
      if (i === 2) {
        st.row = ui.buttons(LEVELS.map(([n], j) => ({ label: n, on: j === 0, onClick: () => { st.auto = false; setLevel(j); } })));
        setLevel(0);
      }
      if (i === 3) {
        wTags.model.show(true);
        for (const n of Object.values(nodes)) n.bar.visible = true;
        st.row = ui.buttons([...REMOVE.map(k => ({ label: `Remove ${SPECIES[k].name.toLowerCase()}`, onClick: () => { st.auto = false; removeSpecies(k); } })), { label: 'Put them all back', on: true, onClick: () => { st.auto = false; removeSpecies(null); } }]);
      }
      if (i === 4) {
        view(F.pyr);
        pTags.forEach(t => t.show(true)); heatTag.show(true);
        st.E0 = 10000; st.pct = 10;
        st.slider = ui.slider({ label: 'Energy captured by producers', min: 1000, max: 50000, step: 1000, value: 10000, unit: ' kJ', format: v => v.toLocaleString('en-US'), onInput: v => { st.auto = false; st.E0 = v; pyramid(); } });
        st.slider2 = ui.slider({ label: 'Energy passed to the next level', min: 5, max: 20, step: 1, value: 10, unit: '%', onInput: v => { st.auto = false; st.pct = v; pyramid(); } });
        pyramid();
      }
      if (i === 5) {
        view(F.cyc);
        st.row = ui.buttons([{ label: 'Carbon cycle', onClick: () => { st.auto = false; setCycle('carbon'); } }, { label: 'Energy flow', onClick: () => { st.auto = false; setCycle('energy'); } }, { label: 'Both', on: true, onClick: () => { st.auto = false; setCycle('both'); } }]);
        setCycle('both');
      }
      if (i === 6) {
        view(F.pop);
        for (const t of Object.values(qTags)) t.show(true);
        st.f0 = 10; simulate(10); st.simT = 0;
        st.slider = ui.slider({ label: 'Foxes at the start', min: 4, max: 40, step: 1, value: 10, onInput: v => { st.auto = false; st.f0 = v; simulate(v); st.simT = 0; } });
        ui.buttons([{ label: 'Run again', onClick: () => { st.simT = 0; } }]);
        popReadout();
      }
      if (isQuiz) { view(F.quiz); }
    },

    update(dt) {
      st.time += dt;
      const t = st.time, s = st.step;
      // Gentle life in the diorama.
      if (s <= 1 || st.quiz) {
        rabbits.forEach((r, i) => { r.position.y = TOP + Math.max(0, Math.sin(t * 3 + i * 1.7)) * 0.05; });
        fishes.forEach((f, i) => { const a = t * 0.6 + i * Math.PI; f.position.x = 1.05 + Math.cos(a) * 0.38; f.position.z = 0.7 + Math.sin(a) * 0.32; f.rotation.y = -a; });
        sunHalo.scale.setScalar(1 + 0.06 * Math.sin(t * 2));
        if (!st.quiz) {
          if (s === 0 && st.auto) { const m = Math.floor(t / 4) % 2 ? 'non' : 'living'; if (m !== st.dmode) { setDio(m); st.row?.select(m === 'non' ? 1 : 0); } }
          if (s === 1 && st.auto) { const k = Math.floor(t / 3.5) % 4, m = ['pop', 'com', 'hab', 'eco'][k]; if (m !== st.dmode) { setDio(m); st.row?.select(k); } }
          const k = 0.3 + 0.2 * Math.sin(t * 5), m = st.dmode;
          glow(living, m === 'living' || m === 'com' || m === 'eco' ? k : 0);
          glow(abiotic, m === 'non' || m === 'eco' ? k : 0);
          if (m === 'pop') glow(rabbitsM, k);
          habitat.material.color.setHSL(0.11, 1, 0.5 + 0.1 * Math.sin(t * 4));
        }
      }
      if ((s === 2 || s === 3) && !st.quiz) {
        if (s === 2 && st.auto) { const j = Math.floor(t / 3) % LEVELS.length; if (j !== st.level) { setLevel(j); st.row?.select(j); } }
        if (s === 3 && st.auto) {
          const k = Math.floor(t / 4) % 5, r = k === 4 ? null : REMOVE[k];
          if (r !== st.removed) { removeSpecies(r); st.row?.select(k); }
        }
        for (const n of Object.values(nodes)) {
          kit.follow(n, 'pop', n.popTo, dt, 3); kit.follow(n, 'alive', n.aliveTo, dt, 4);
          const a = Math.max(0.001, n.alive);
          n.model.scale.setScalar(a); n.tag.show(n.alive > 0.5);
          n.bar.scale.y = Math.max(0.001, n.pop * 0.4); n.bar.position.y = 0.04 + n.pop * 0.2;
          n.barMat.color.setHex(n.popTo > 1.1 ? 0x2fa84f : n.popTo < 0.9 ? 0xd9480f : 0x9aa5b1);
        }
        glow(decompMats, s === 2 && st.level === 4 ? 0.3 + 0.2 * Math.sin(t * 5) : 0);
      }
      if (s === 4 && !st.quiz) {
        if (st.auto) { const v = [10, 20, 5, 10][Math.floor(t / 3) % 4]; if (v !== st.pct) { st.pct = v; st.slider2?.set(v); pyramid(); } }
        slabs.forEach((m, i) => { const w = Math.max(0.02, kit.lerp(m.scale.x, pyrSides[i], Math.min(1, dt * 5))); m.scale.set(w, 1, w); });
        pyrGrass.position.set(-slabs[0].scale.x * 0.3, SL_H, slabs[0].scale.x * 0.3);
        for (let k = 0; k < NH; k++) {
          const lvl = k % 4, f = ((t * 0.35 + rand(k) ) % 1), w = slabs[lvl].scale.x;
          P3.set((rand(k + 5) - 0.5) * w * 0.8 + Math.sin(f * 9 + k) * 0.05, SL_H * (lvl + 0.5) + f * 0.6, -w / 2 - 0.08 - f * 0.3);
          heat.setMatrixAt(k, M4.compose(P3, Q.identity(), S3.setScalar(Math.max(0.001, Math.min(1, (1 - f) * 2) * (lvl === 0 ? 1.2 : 0.9)))));
        }
        heat.instanceMatrix.needsUpdate = true;
      }
      if (s === 5 && !st.quiz) {
        if (st.auto) { const k = Math.floor(t / 5) % 3, m = ['both', 'carbon', 'energy'][k]; if (m !== st.cmode) { setCycle(m); st.row?.select([2, 0, 1][k]); } }
        for (const f of [...carbon, ...energy]) {
          if (!f.im.visible) continue;
          f.phase += dt * f.speed;
          for (let k = 0; k < f.count; k++) {
            const u = (f.phase + k / f.count) % 1;
            f.curve.getPointAt(u, P3);
            f.im.setMatrixAt(k, M4.compose(P3, Q.identity(), S3.setScalar(Math.max(0.001, Math.min(1, u / 0.1, (1 - u) / 0.1)))));
          }
          f.im.instanceMatrix.needsUpdate = true;
        }
      }
      if (s === 6 && !st.quiz) {
        if (st.auto) { const want = [10, 25, 4][Math.floor(t / 15) % 3]; if (want !== st.f0) { st.f0 = want; simulate(want); st.simT = 0; st.slider?.set(want); } }
        st.simT = Math.min(YEARS, st.simT + dt * 2);
        const n = Math.max(2, Math.round(st.simT / YEARS * (NP - 1)) + 1);
        for (const L of [rabLine, foxLine]) L.geo.setDrawRange(0, (n - 1) * 6);
        cursor.position.x = -GW / 2 + GW * st.simT / YEARS;
        const i = n - 1;
        setIcons(rabIcons, Math.round(series.r[i] / 20), slotR, 0.4);
        setIcons(foxIcons, Math.round(series.f[i] / 5), slotF, -0.4);
        const yr = Math.floor(st.simT * 2);
        if (yr !== st.lastYr) { st.lastYr = yr; popReadout(); }
      }
      return true;
    },
  };
}
