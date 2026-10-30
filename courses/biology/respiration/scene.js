// Cellular respiration: glucose and oxygen going into a cut-away cell with glowing mitochondria and carbon dioxide,
// water and energy coming out; animal and plant cells by day and night; a runner whose breathing, heart rate and
// muscle cell speed up with exercise (model values); photosynthesis and respiration as a cycle between a plant
// and a rabbit; the limewater test; germinating seeds warming a flask; and cold storage slowing respiration.
import { animalCell, plantCell } from '../_shared/cells.js';
import { rabbit } from '../_shared/critters.js';
import { stream, soilPlant, glucoseGeometry, rand, SUBST } from '../_shared/plants.js';

const CELL = [0, 1.6, 0], DN = [14, 1.5, 0], EX = [28, 0, 0], CY = [42, 0, 0], LW = [56, 0, 0], SD = [68, 0, 0], ST = [80, 0, 0];
const SUBS = [
  ['glu', 'Glucose', 'comes from <b>digested food</b>, carried to the cell in the blood.'],
  ['o2', 'Oxygen', 'comes from the air we <b>breathe in</b>, carried to the cell in the blood.'],
  ['co2', 'Carbon dioxide', 'a waste product. The blood carries it to the lungs and we <b>breathe it out</b>.'],
  ['water', 'Water', 'is made too. The body uses it or gets rid of it, for example in breath and urine.'],
  ['energy', 'Energy', 'is used for <b>moving, growing, repairing</b> the body and <b>keeping warm</b>.'],
];
const EXERCISE = ['Resting', 'Walking', 'Jogging', 'Running fast'];
const CYCLE = [
  ['Photosynthesis', 'In the plant: <b>carbon dioxide + water → glucose + oxygen</b> (using light energy).'],
  ['Respiration', 'In the rabbit (and in the plant too): <b>glucose + oxygen → carbon dioxide + water + energy</b>.'],
  ['Both together', 'The products of each process are what the other one uses, so carbon and oxygen keep cycling.'],
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xd5e8c8, sky: 0xe3f0fb, radius: 100 });
  const sunLight = kit.lights(scene, { sun: [4, 10, 6] });
  const sky = new THREE.Color(0xe3f0fb), night = new THREE.Color(0x1f2a48), cold = new THREE.Color(0xcfe3ff), warm = new THREE.Color(0xffe2c2);
  const v3 = (a, dx = 0, dy = 0, dz = 0) => new THREE.Vector3(a[0] + dx, a[1] + dy, a[2] + dz);
  const group = p => { const g = new THREE.Group(); g.position.set(...p); scene.add(g); return g; };
  const all = [];
  const S = (parent, o) => { const s = stream(THREE, parent, o); all.push(s); return s; };
  const gluGeo = glucoseGeometry(THREE, 0.08);
  const sparkGeo = new THREE.OctahedronGeometry(0.055, 0);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), p4 = new THREE.Vector3(), s4 = new THREE.Vector3();
  const pedestal = (parent, x, z, r) => { const p = kit.mesh(new THREE.CylinderGeometry(r, r * 1.08, 0.14, 32), kit.mat(0xd9d4c7), [x, 0.07, z], parent); return p; };

  // ================= Step 0: one cell =================
  const g0 = group(CELL);
  pedestal(scene, CELL[0], CELL[2], 1.0);
  const cell = animalCell(THREE, kit, { r: 1.2 });
  g0.add(cell.g);
  const s0 = {
    glu: S(g0, { points: [[-2.0, 0.55, 1.7], [-1.0, 0.4, 1.25], [0.3, 0.15, 0.45]], count: 6, color: SUBST.glucose, geo: gluGeo, speed: 0.22, spin: 1 }),
    o2: S(g0, { points: [[-2.0, -0.45, 1.7], [-1.0, -0.35, 1.25], [0.3, -0.1, 0.45]], count: 7, color: SUBST.o2, radius: 0.06, speed: 0.22 }),
    co2: S(g0, { points: [[0.45, 0.12, 0.35], [1.3, 0.4, -0.3], [2.1, 0.6, -1.5]], count: 7, color: SUBST.co2, radius: 0.06, speed: 0.22 }),
    water: S(g0, { points: [[0.45, -0.12, 0.35], [1.3, -0.45, -0.3], [2.1, -0.65, -1.5]], count: 7, color: SUBST.water, radius: 0.055, speed: 0.22 }),
    energy: S(g0, { points: [[0.35, 0.15, 0.4], [0.55, 1.0, 0.55], [0.75, 2.0, 0.7]], count: 7, color: SUBST.energy, geo: sparkGeo, speed: 0.35, spin: 1, emissive: 0.9 }),
  };
  const t0 = {
    glu: label('Glucose', v3(CELL, -1.95, 0.7, 1.7), { cls: 'warm' }),
    o2: label('Oxygen', v3(CELL, -1.95, -0.3, 1.7), { cls: 'cool' }),
    co2: label('Carbon dioxide', v3(CELL, 2.05, 0.75, -1.5), { cls: 'cool' }),
    water: label('Water', v3(CELL, 2.05, -0.5, -1.5), { cls: 'cool' }),
    energy: label('Energy', v3(CELL, 0.75, 2.15, 0.7), { cls: 'warm' }),
    mito: label('Mitochondria', cell.anchor('mitochondria')),
  };

  // ================= Step 1: animal and plant cells, day and night =================
  const g1 = group(DN);
  const AX = -1.75, PX = 1.75;
  const aCell = animalCell(THREE, kit, { r: 0.95 });
  aCell.g.position.x = AX; aCell.g.rotation.y = -0.43;
  g1.add(aCell.g);
  const pCell = plantCell(THREE, kit, { W: 2.0, H: 1.35, D: 1.25 });
  pCell.g.position.x = PX; pCell.g.rotation.y = 0.3;
  g1.add(pCell.g);
  pedestal(scene, DN[0] + AX, 0, 0.9); pedestal(scene, DN[0] + PX, 0, 1.2);
  const s1 = {
    aIn: S(g1, { points: [[AX - 1.3, 1.25, 0.5], [AX - 0.6, 0.65, 0.6], [AX - 0.05, 0.1, 0.4]], count: 6, color: SUBST.o2, radius: 0.055, speed: 0.22 }),
    aOut: S(g1, { points: [[AX - 0.05, -0.1, 0.4], [AX - 0.7, -0.6, 0.6], [AX - 1.35, -1.0, 0.5]], count: 6, color: SUBST.co2, radius: 0.055, speed: 0.22 }),
    dayIn: S(g1, { points: [[PX + 1.5, 1.2, 0.6], [PX + 0.95, 0.65, 0.75], [PX + 0.3, 0.1, 0.6]], count: 6, color: SUBST.co2, radius: 0.055, speed: 0.22 }),
    dayOut: S(g1, { points: [[PX + 0.3, -0.1, 0.6], [PX + 0.95, -0.6, 0.75], [PX + 1.55, -1.0, 0.6]], count: 6, color: SUBST.o2, radius: 0.055, speed: 0.22 }),
    nightIn: S(g1, { points: [[PX + 1.5, 1.2, 0.6], [PX + 0.95, 0.65, 0.75], [PX + 0.3, 0.1, 0.6]], count: 6, color: SUBST.o2, radius: 0.055, speed: 0.22 }),
    nightOut: S(g1, { points: [[PX + 0.3, -0.1, 0.6], [PX + 0.95, -0.6, 0.75], [PX + 1.55, -1.0, 0.6]], count: 6, color: SUBST.co2, radius: 0.055, speed: 0.22 }),
  };
  const t1 = {
    animal: label('Animal cell', v3(DN, AX, -1.2, 0.3), { cls: 'big' }),
    plant: label('Leaf cell', v3(DN, PX, -1.2, 0.3), { cls: 'big' }),
    aIn: label('Oxygen in', v3(DN, AX - 1.3, 1.4, 0.5), { cls: 'cool' }),
    aOut: label('Carbon dioxide out', v3(DN, AX - 1.45, -0.75, 0.5), { cls: 'cool' }),
    pIn: label('Carbon dioxide in', v3(DN, PX + 1.5, 1.35, 0.6), { cls: 'cool' }),
    pOut: label('Oxygen out', v3(DN, PX + 1.65, -0.75, 0.6), { cls: 'cool' }),
  };

  // ================= Step 2: exercise =================
  const g2 = group(EX);
  const run = runner(THREE, kit);
  run.g.position.set(-0.4, 0.14, 0);
  g2.add(run.g);
  const beltTex = stripes(THREE);
  kit.mesh(new THREE.BoxGeometry(1.7, 0.12, 0.75), kit.mat(0x3d4250), [-0.4, 0.06, 0], g2);
  const belt = kit.mesh(new THREE.BoxGeometry(1.6, 0.02, 0.6), kit.mat(0xffffff, { map: beltTex, roughness: 0.9 }), [-0.4, 0.13, 0], g2);
  belt.castShadow = false;
  for (const z of [-0.36, 0.36]) {
    kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), kit.mat(0x8d99ae, { metalness: 0.4 }), [0.38, 0.62, z], g2);
    kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), kit.mat(0x8d99ae, { metalness: 0.4 }), [0.18, 1.12, z], g2).rotation.z = Math.PI / 2;
  }
  // Heart.
  const heart = new THREE.Group();
  heart.position.set(1.35, 2.0, 0.2);
  g2.add(heart);
  const red = kit.mat(0xd62839, { roughness: 0.4 });
  for (const s of [-1, 1]) kit.mesh(new THREE.SphereGeometry(0.13, 16, 12), red, [s * 0.09, 0.05, 0], heart);
  const cone = kit.mesh(new THREE.ConeGeometry(0.2, 0.3, 16), red, [0, -0.13, 0], heart);
  cone.rotation.z = Math.PI;
  // Muscle cell with mitochondria.
  const muscle = new THREE.Group();
  muscle.position.set(1.4, 0.95, 0.3);
  g2.add(muscle);
  const mm = kit.mesh(new THREE.CapsuleGeometry(0.18, 0.95, 4, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf29aa8, transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.4 }), [0, 0, 0], muscle);
  mm.renderOrder = 2;
  const mitoMat = kit.mat(0xf08a2e, { roughness: 0.5, emissive: 0xff8a00, emissiveIntensity: 0.1 });
  for (let i = 0; i < 6; i++) { const c = kit.mesh(new THREE.CapsuleGeometry(0.04, 0.1, 3, 8), mitoMat, [-0.45 + i * 0.18, (i % 2 ? 0.06 : -0.05), (i % 3 - 1) * 0.06], muscle); c.rotation.z = Math.PI / 2 + i * 0.4; }
  const mSparks = new THREE.InstancedMesh(sparkGeo, new THREE.MeshBasicMaterial({ color: SUBST.energy }), 12);
  mSparks.frustumCulled = false;
  muscle.add(mSparks);
  // Breath puffs of carbon dioxide from the mouth.
  const PUFFS = 4, PP = 10;
  const puffIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), kit.mat(SUBST.co2, { transparent: true, opacity: 0.85 }), PUFFS * PP);
  puffIM.frustumCulled = false;
  g2.add(puffIM);
  const puffs = Array.from({ length: PUFFS }, () => ({ age: 9, n: 0 }));
  const t2 = {
    heart: label('Heart: 75 beats/min', v3(EX, 1.35, 2.25, 0.2), { cls: 'warm' }),
    breath: label('Breathing: 15/min', v3(EX, -0.75, 2.05, 0), { cls: 'cool' }),
    muscle: label('Muscle cell', v3(EX, 1.4, 1.18, 0.3)),
  };

  // ================= Step 3: photosynthesis and respiration as a cycle =================
  const g3 = group(CY);
  const pl = soilPlant(THREE, kit, { h: 1.6, pairs: 3, soilW: 1.5, soilD: 1.0, soilH: 0.6 });
  pl.g.position.set(-1.8, 0.6, 0);
  g3.add(pl.g);
  const bun = rabbit(THREE, kit);
  bun.g.scale.setScalar(2.2); bun.g.position.set(1.9, 0, 0); bun.g.rotation.y = -Math.PI / 2;
  g3.add(bun.g);
  const SUN = [-3.0, 3.1, -0.8];
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  const sun = kit.mesh(new THREE.SphereGeometry(0.38, 24, 16), sunMat, SUN, g3);
  sun.castShadow = false;
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.25, depthWrite: false })));
  const leafAt = i => { const v = pl.leafTips[i]; return [v.x - 1.8, v.y + 0.6, v.z]; };
  const s3 = {
    light: S(g3, { points: [SUN, [-2.4, 2.6, -0.4], leafAt(4)], count: 7, color: SUBST.energy, radius: 0.045, speed: 0.55, emissive: 0.8 }),
    o2: S(g3, { points: [leafAt(5), [-0.4, 2.55, 0.4], [0.7, 1.7, 0.35], [0.95, 1.12, 0.12]], count: 8, color: SUBST.o2, radius: 0.06, speed: 0.2 }),
    glu: S(g3, { points: [leafAt(3), [-0.6, 1.55, 0.6], [0.5, 1.2, 0.45], [0.95, 0.98, 0.12]], count: 6, color: SUBST.glucose, geo: gluGeo, speed: 0.2, spin: 1 }),
    co2: S(g3, { points: [[0.95, 1.05, -0.12], [0.3, 0.75, -0.6], [-0.8, 0.95, -0.5], leafAt(2)], count: 8, color: SUBST.co2, radius: 0.06, speed: 0.2 }),
  };
  const bunSparks = new THREE.InstancedMesh(sparkGeo, new THREE.MeshBasicMaterial({ color: SUBST.energy }), 10);
  bunSparks.frustumCulled = false;
  g3.add(bunSparks);
  const t3 = {
    plant: label('Plant', v3(CY, -1.8, 2.5, 0), { cls: 'big' }),
    bun: label('Rabbit', v3(CY, 1.9, 1.75, -0.2), { cls: 'big' }),
    light: label('Light', v3(CY, SUN[0], SUN[1] + 0.6, SUN[2]), { cls: 'warm' }),
    o2: label('Oxygen', v3(CY, 0.5, 2.15, 0.4), { cls: 'cool' }),
    glu: label('Glucose (food)', v3(CY, -0.1, 1.5, 0.6), { cls: 'warm' }),
    co2: label('Carbon dioxide', v3(CY, 0.2, 0.62, -0.6), { cls: 'cool' }),
    energy: label('Energy', v3(CY, 2.3, 1.2, 0.5), { cls: 'warm' }),
  };

  // ================= Step 4: limewater test =================
  const g4 = group(LW);
  kit.mesh(new THREE.BoxGeometry(2.2, 0.3, 0.6), kit.mat(0xc8a27a, { roughness: 0.8 }), [0, 0.45, 0], g4);
  for (const x of [-1, 1]) kit.mesh(new THREE.BoxGeometry(0.1, 0.3, 0.5), kit.mat(0xb08a62), [x, 0.15, 0], g4);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  const clear = new THREE.Color(0xbfe2fb), milky = new THREE.Color(0xffffff);
  const tubes = [-0.55, 0.55].map(x => {
    const t = new THREE.Group();
    t.position.set(x, 0.32, 0);
    g4.add(t);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.45, 24, 1, true), glassMat);
    gl.position.y = 0.72; gl.renderOrder = 3; t.add(gl);
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glassMat);
    bot.renderOrder = 3; t.add(bot);
    const liqMat = new THREE.MeshStandardMaterial({ color: 0xd7efff, transparent: true, opacity: 0.4, roughness: 0.2, depthWrite: false });
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.85, 24), liqMat);
    liq.position.y = 0.425; liq.renderOrder = 2; t.add(liq);
    const lb = new THREE.Mesh(new THREE.SphereGeometry(0.155, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), liqMat);
    lb.renderOrder = 2; t.add(lb);
    // Delivery tube (straw) down to near the bottom.
    kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), kit.mat(x < 0 ? 0x4ea8de : 0xe85d75, { roughness: 0.4 }), [0.05, 0.95, 0], t);
    const bubbles = [];
    for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); b.renderOrder = 4; t.add(b); bubbles.push(b); }
    return { t, liqMat, bubbles };
  });
  // A rubber bulb pump on the ordinary-air straw.
  kit.mesh(new THREE.SphereGeometry(0.17, 16, 12), kit.mat(0xc0392b, { roughness: 0.6 }), [0.6, 2.05, 0], g4).scale.y = 1.25;
  const t4 = {
    a: label('Breathed-out air', v3(LW, -0.6, 2.0, 0), { cls: 'warm' }),
    b: label('Ordinary air (pump)', v3(LW, 0.6, 2.4, 0), { cls: 'cool' }),
    lime: label('Limewater', v3(LW, 0, 0.85, 0.35)),
  };

  // ================= Step 5: germinating seeds in vacuum flasks =================
  const g5 = group(SD);
  const flasks = [-0.75, 0.75].map((x, fi) => {
    const f = new THREE.Group();
    f.position.set(x, 0, 0);
    g5.add(f);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.5, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xdfe8ef, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    gl.position.y = 0.8; gl.renderOrder = 3; f.add(gl);
    kit.mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 28), kit.mat(0x9aa5b1, { metalness: 0.5, roughness: 0.4 }), [0, 0.04, 0], f);
    kit.mesh(new THREE.TorusGeometry(0.41, 0.03, 6, 28), kit.mat(0x9aa5b1, { metalness: 0.5 }), [0, 1.55, 0], f).rotation.x = Math.PI / 2;
    const plug = kit.mesh(new THREE.SphereGeometry(0.36, 16, 10), kit.mat(0xf7f7f2, { roughness: 1 }), [0, 1.58, 0], f);
    plug.scale.y = 0.45;
    const seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), kit.mat(fi === 0 ? 0xd9c15a : 0xb8a37a, { roughness: 0.7 }), 60);
    for (let k = 0; k < 60; k++) {
      const a = rand(k * 3 + fi) * Math.PI * 2, r = Math.sqrt(rand(k * 5 + fi)) * 0.3;
      p4.set(Math.cos(a) * r, 0.15 + (k / 60) * 0.75, Math.sin(a) * r); q4.identity(); s4.set(1, 0.85, 1); m4.compose(p4, q4, s4); seeds.setMatrixAt(k, m4);
    }
    f.add(seeds);
    if (fi === 0) {
      const sprouts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.02, 0.12, 5), kit.mat(0xf3f0dc), 24);
      for (let k = 0; k < 24; k++) {
        const a = rand(k * 3 + 50) * Math.PI * 2, r = 0.12 + rand(k + 9) * 0.2;
        p4.set(Math.cos(a) * r, 0.25 + (k / 24) * 0.7, Math.sin(a) * r);
        q4.setFromAxisAngle(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)), 0.9); m4.compose(p4, q4, s4.set(1, 1, 1)); sprouts.setMatrixAt(k, m4);
      }
      f.add(sprouts);
    }
    // Thermometer through the plug: glass rod, bulb and red column.
    kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.9, 10), new THREE.MeshStandardMaterial({ color: 0xf2f8ff, transparent: true, opacity: 0.55, roughness: 0.1 }), [0.12, 1.4, 0.1], f);
    kit.mesh(new THREE.SphereGeometry(0.06, 10, 8), kit.mat(0xd62839), [0.12, 0.47, 0.1], f);
    const col = kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8).translate(0, 0.5, 0), kit.mat(0xd62839), [0.12, 0.5, 0.1], f);
    return { col };
  });
  const tempH = T => 0.9 + (T - 15) * 0.08; // red column length (scene units) for a temperature
  const t5 = {
    a: label('Germinating seeds', v3(SD, -0.75, 0.55, 0.45), { cls: 'cool' }),
    b: label('Boiled seeds (control)', v3(SD, 0.75, 0.55, 0.45), { cls: 'cool' }),
    ta: label('20.0 °C', v3(SD, -0.63, 2.5, 0.1), { cls: 'warm big' }),
    tb: label('20.0 °C', v3(SD, 0.87, 2.5, 0.1), { cls: 'warm big' }),
  };

  // ================= Step 6: storing apples =================
  const g6 = group(ST);
  const wood = kit.mat(0xc49a6c, { roughness: 0.85 });
  kit.mesh(new THREE.BoxGeometry(1.5, 0.06, 1.0), wood, [0, 0.03, 0], g6);
  for (const [w, d, x, z] of [[1.5, 0.05, 0, 0.48], [1.5, 0.05, 0, -0.48], [0.05, 1.0, 0.73, 0], [0.05, 1.0, -0.73, 0]]) for (const y of [0.15, 0.37]) kit.mesh(new THREE.BoxGeometry(w, 0.14, d), wood, [x, y, z], g6);
  const appleMat = kit.mat(0xd8342f, { roughness: 0.45 }), stemMat = kit.mat(0x6b4226);
  const apples = [];
  for (let i = 0; i < 8; i++) {
    const x = -0.5 + (i % 4) * 0.33, z = i < 4 ? -0.2 : 0.2, y = 0.24 + (i % 3 === 0 ? 0.05 : 0);
    const a = kit.mesh(new THREE.SphereGeometry(0.17, 18, 12), appleMat, [x, y, z], g6);
    a.scale.y = 0.9;
    kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 5), stemMat, [x, y + 0.18, z], g6);
    apples.push(a);
  }
  const NP = 30;
  const co2IM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), kit.mat(SUBST.co2), NP);
  const heatIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff8c42, transparent: true, opacity: 0.7 }), NP);
  for (const im of [co2IM, heatIM]) { im.frustumCulled = false; g6.add(im); }
  // Thermometer beside the crate.
  kit.mesh(new THREE.BoxGeometry(0.22, 1.5, 0.05), kit.mat(0xffffff), [1.05, 0.85, 0.2], g6);
  kit.mesh(new THREE.SphereGeometry(0.06, 10, 8), kit.mat(0xd62839), [1.05, 0.2, 0.24], g6);
  const sCol = kit.mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 8).translate(0, 0.5, 0), kit.mat(0xd62839), [1.05, 0.22, 0.24], g6);
  const t6 = {
    apples: label('Apples (still alive)', v3(ST, -0.3, 0.55, 0.5), { cls: 'cool' }),
    co2: label('Carbon dioxide', v3(ST, 0, 1.55, 0), { cls: 'cool' }),
    temp: label('20 °C', v3(ST, 1.05, 1.7, 0.2), { cls: 'warm big' }),
  };

  // ================= State =================
  const st = { step: 0, quiz: false, time: 0, auto: true, row: null, toggle: null, slider: null, sub: 0, day: true, dayK: 1, ex: 0, exW: 0, phase: 0, hb: 0, br: 0, puffNext: 0, cyc: 2, breaths: 0, bub: 0, hours: 0, temp: 20, nightK: 0, tint: 0 };
  const allTags = [t0, t1, t2, t3, t4, t5, t6].flatMap(o => Object.values(o));
  const vis = (set, on) => { for (const s of Object.values(set)) s.mesh.visible = on; };

  function pickSub(i) {
    st.sub = i;
    const [k, name, txt] = SUBS[i];
    for (const [kk] of SUBS) { s0[kk].size = kk === k ? 1.6 : 0.75; t0[kk].show(kk === k); }
    ui.readout(`glucose + oxygen → carbon dioxide + water + energy<br><b>${name}</b> ${txt}`);
  }
  function setDay(v) {
    st.day = v;
    s1.dayIn.mesh.visible = s1.dayOut.mesh.visible = v;
    s1.nightIn.mesh.visible = s1.nightOut.mesh.visible = !v;
    pCell.select(v ? ['chloroplasts', 'mitochondria'] : ['mitochondria']);
    t1.pIn.text = v ? 'Carbon dioxide in' : 'Oxygen in';
    t1.pOut.text = v ? 'Oxygen out' : 'Carbon dioxide out';
    ui.readout(v ? '<b>Day</b>: both cells respire. The leaf cell also photosynthesises, faster than it respires, so overall it <b>takes in carbon dioxide</b> and <b>gives out oxygen</b>.' : '<b>Night</b>: no light, so no photosynthesis. Both cells only respire: they <b>take in oxygen</b> and <b>give out carbon dioxide</b>.');
  }
  // Model values for a young teenager (rounded): breathing 15 → 45 per minute, heart 75 → 185 beats per minute,
  // energy use 1 → 10 times resting.
  const exVals = x => ({ breath: Math.round(15 + 30 * x), heart: Math.round(75 + 110 * x), energy: Math.round(1 + 9 * x) });
  function setEx(v) {
    st.ex = v;
    const x = v / 3, e = exVals(x);
    t2.heart.text = `Heart: ${e.heart} beats/min`;
    t2.breath.text = `Breathing: ${e.breath}/min`;
    ui.readout(`<b>${EXERCISE[v]}</b><br>Energy used by muscles: about <b>${e.energy}×</b> resting<br>Breathing: about <b>${e.breath}</b> breaths per minute · Heart: about <b>${e.heart}</b> beats per minute<br>Carbon dioxide breathed out: about <b>${e.energy}×</b> resting (model values)`);
  }
  function pickCycle(i) {
    st.cyc = i;
    const ph = i !== 1, re = i !== 0;
    s3.light.mesh.visible = ph; t3.light.show(ph);
    bunSparks.visible = re; t3.energy.show(re);
    for (const k of ['o2', 'glu', 'co2']) { s3[k].mesh.visible = true; t3[k].show(true); }
    if (!st.quiz) ui.readout(`<b>${CYCLE[i][0]}</b>: ${CYCLE[i][1]}<br><span style="opacity:.8">Photosynthesis: carbon dioxide + water → glucose + oxygen<br>Respiration: glucose + oxygen → carbon dioxide + water + energy</span>`);
  }
  const cloud = (n, co2) => 1 - Math.exp(-(n * co2) / 2.5);
  function setBreaths(n) {
    if (n !== st.breaths) st.bub = 1.4;
    st.breaths = n;
    const a = cloud(n, 1), b = cloud(n, 0.01);
    tubes[0].liqMat.color.copy(clear).lerp(milky, a); tubes[0].liqMat.opacity = 0.3 + 0.68 * a; tubes[0].liqMat.roughness = 0.2 + 0.8 * a;
    tubes[1].liqMat.color.copy(clear).lerp(milky, b); tubes[1].liqMat.opacity = 0.3 + 0.68 * b;
    const word = c => (c > 0.75 ? 'milky' : c > 0.3 ? 'cloudy' : 'clear');
    ui.readout(`Breaths blown in: <b>${n}</b><br>Breathed-out air (about 4% carbon dioxide): limewater is <b>${word(a)}</b><br>Ordinary air (about 0.04% carbon dioxide): limewater is <b>${word(b)}</b>`);
  }
  // Model: living seeds warm by about 5 °C over two days; boiled seeds stay at room temperature (20 °C).
  const seedT = h => 20 + 5.6 * (1 - Math.exp(-h / 22));
  function setHours(h) {
    st.hours = h;
    const ta = seedT(h);
    t5.ta.text = `${ta.toFixed(1)} °C`; t5.tb.text = '20.0 °C';
    ui.readout(`Time: <b>${h} hours</b><br>Germinating seeds: about <b>${ta.toFixed(1)} °C</b> · Boiled seeds: <b>20.0 °C</b><br>Difference: about <b>${(ta - 20).toFixed(1)} °C</b>, from the heat released by respiration (model values)`);
  }
  const rateAt = T => Math.pow(2, T / 10); // compared with the rate at 0 °C: about doubles every 10 °C (rough rule)
  function setTemp(T) {
    st.temp = T;
    t6.temp.text = `${T} °C`;
    const r = rateAt(T);
    ui.readout(`Storage temperature: <b>${T} °C</b><br>Respiration rate: about <b>${r < 10 ? r.toFixed(1) : Math.round(r)}×</b> the rate at 0 °C<br>(rough rule: the rate doubles for every 10 °C warmer)${T <= 5 ? '<br>Like a fridge: respiration is slow, so the apples keep their sugar.' : T >= 25 ? '<br>Warm: fast respiration uses up sugar, so the apples spoil sooner.' : ''}`);
  }

  const F = {
    cell: { radius: 2.2, width: 2.5, yaw: 0.8, pitch: 0.25, target: [CELL[0] + 0.1, CELL[1] + 0.2, CELL[2]] },
    dn: { radius: 1.9, width: 3.6, yaw: 0.35, pitch: 0.2, target: [DN[0] + 0.1, DN[1] + 0.1, 0] },
    ex: { radius: 1.6, width: 2.1, yaw: 0.3, pitch: 0.12, target: [EX[0] + 0.45, 1.15, 0] },
    cy: { radius: 1.9, width: 3.3, yaw: 0.1, pitch: 0.15, target: [CY[0] - 0.4, 1.5, 0] },
    lw: { radius: 1.45, yaw: 0.2, pitch: 0.2, target: [LW[0], 1.25, 0] },
    sd: { radius: 1.6, yaw: 0.15, pitch: 0.2, target: [SD[0], 1.3, 0] },
    st: { radius: 1.25, width: 1.4, yaw: 0.2, pitch: 0.55, target: [ST[0] + 0.15, 0.7, 0] },
  };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, row: null, toggle: null, slider: null });
      for (const t of allTags) t.show(false);
      for (const s of all) { s.mesh.visible = false; s.size = 1; }
      cell.select(null); aCell.select(null); pCell.select(null);
      bunSparks.visible = false;
      if (i === 0) {
        go(F.cell);
        vis(s0, true); cell.select('mitochondria'); t0.mito.show(true);
        st.row = ui.buttons(SUBS.map(([, name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickSub(j); } })));
        pickSub(0);
      }
      if (i === 1) {
        go(F.dn);
        s1.aIn.mesh.visible = s1.aOut.mesh.visible = true;
        aCell.select('mitochondria');
        for (const t of Object.values(t1)) t.show(true);
        st.toggle = ui.toggle({ label: 'Daytime', value: true, onChange: v => { st.auto = false; setDay(v); } });
        setDay(true);
      }
      if (i === 2) {
        go(F.ex);
        for (const t of Object.values(t2)) t.show(true);
        st.slider = ui.slider({ label: 'Exercise', min: 0, max: 3, step: 1, value: 0, format: v => EXERCISE[v], onInput: v => { st.auto = false; setEx(v); } });
        setEx(0);
      }
      if (i === 3 || isQuiz) {
        go(F.cy);
        t3.plant.show(true); t3.bun.show(true);
        if (!isQuiz) st.row = ui.buttons(CYCLE.map(([name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickCycle(j); } })));
        pickCycle(isQuiz ? 2 : 0);
      }
      if (i === 4) {
        go(F.lw);
        for (const t of Object.values(t4)) t.show(true);
        st.slider = ui.slider({ label: 'Breaths', min: 0, max: 10, step: 1, value: 0, onInput: v => { st.auto = false; setBreaths(v); } });
        setBreaths(0);
      }
      if (i === 5) {
        go(F.sd);
        for (const t of Object.values(t5)) t.show(true);
        st.slider = ui.slider({ label: 'Time', min: 0, max: 48, step: 6, value: 0, unit: ' hours', onInput: v => { st.auto = false; setHours(v); } });
        setHours(0);
      }
      if (i === 6) {
        go(F.st);
        for (const t of Object.values(t6)) t.show(true);
        st.slider = ui.slider({ label: 'Storage temperature', min: 0, max: 30, step: 5, value: 30, unit: ' °C', onInput: v => { st.auto = false; setTemp(v); } });
        setTemp(30);
      }
    },

    update(dt, t) {
      st.time += dt;
      const s = st.step, T = st.time, auto = st.auto && !st.quiz;
      for (const sm of all) if (sm.mesh.visible) sm.update(dt);
      cell.pulse(t); aCell.pulse(t); pCell.pulse(t);
      cell.g.rotation.y = Math.sin(t * 0.4) * 0.12;
      // Step 0
      if (s === 0 && auto) { const j = Math.floor(T / 2.6) % SUBS.length; if (j !== st.sub && j >= 0) { pickSub(j); st.row?.select(j); } }
      // Step 1: day and night
      if (s === 1 && auto) { const d = T % 10 < 5; if (d !== st.day) { setDay(d); if (st.toggle) st.toggle.checked = d; } }
      kit.follow(st, 'nightK', s === 1 && !st.day ? 1 : 0, dt, 3);
      // Step 6 tints the sky cold or warm.
      kit.follow(st, 'tint', s === 6 ? (st.temp - 15) / 15 : 0, dt, 3);
      scene.background.copy(sky);
      if (st.tint < 0) scene.background.lerp(cold, -st.tint); else scene.background.lerp(warm, st.tint * 0.8);
      scene.background.lerp(night, st.nightK * 0.85);
      sunLight.intensity = 2.2 * (1 - 0.7 * st.nightK);
      // Step 2: exercise
      if (s === 2) {
        if (auto) { const v = Math.min(3, Math.floor(T / 2.2)) ; const vv = T > 12 ? (st.time = 0, 0) : v; if (vv !== st.ex) { setEx(vv); st.slider?.set(vv); } }
        kit.follow(st, 'exW', st.ex / 3, dt, 2);
        const x = st.exW, e = exVals(x);
        animateRunner(run, x, dt);
        beltTex.offset.x += dt * (x * 2.2);
        st.hb += dt * e.heart / 60;
        const beat = Math.pow(Math.max(0, Math.sin(st.hb * Math.PI * 2)), 6);
        heart.scale.setScalar(1 + 0.18 * beat);
        // Breaths: a puff of carbon dioxide each breath, bigger with more exercise.
        st.br += dt * e.breath / 60;
        run.chest.scale.set(1 + 0.06 * Math.sin(st.br * Math.PI * 2), 1, 1 + 0.06 * Math.sin(st.br * Math.PI * 2));
        if (st.br >= 1) { st.br -= 1; const pf = puffs[st.puffNext++ % PUFFS]; pf.age = 0; pf.n = Math.round(3 + 7 * x); }
        let k = 0;
        for (let pi = 0; pi < PUFFS; pi++) {
          const pf = puffs[pi];
          pf.age += dt;
          for (let j = 0; j < PP; j++, k++) {
            const on = j < pf.n && pf.age < 1.4, u = pf.age / 1.4;
            p4.set(-0.4 + 0.22 + u * (0.6 + rand(j) * 0.3), 1.83 + u * (0.25 + rand(j + 5) * 0.3) + (rand(j + 9) - 0.5) * 0.08, (rand(j + 13) - 0.5) * 0.25 * (0.3 + u));
            s4.setScalar(on ? 1 - 0.6 * u : 0.001); q4.identity(); m4.compose(p4, q4, s4); puffIM.setMatrixAt(k, m4);
          }
        }
        puffIM.instanceMatrix.needsUpdate = true;
        mitoMat.emissiveIntensity = 0.1 + 0.9 * x * (0.75 + 0.25 * Math.sin(t * 6));
        const nS = Math.round(2 + 10 * x);
        for (let j = 0; j < 12; j++) {
          const u = (t * (0.5 + x) + j / 12) % 1;
          p4.set(-0.5 + (j / 11), 0.15 + u * 0.55, (rand(j) - 0.5) * 0.3);
          s4.setScalar(j < nS ? Math.sin(u * Math.PI) : 0.001); q4.identity(); m4.compose(p4, q4, s4); mSparks.setMatrixAt(j, m4);
        }
        mSparks.instanceMatrix.needsUpdate = true;
      }
      // Step 3 / quiz: the cycle
      if (s === 3 || st.quiz) {
        if (s === 3 && auto) { const j = Math.floor(T / 3.5) % 3; if (j !== st.cyc) { pickCycle(j); st.row?.select(j); } }
        if (bunSparks.visible) {
          for (let j = 0; j < 10; j++) {
            const a = j * 0.63 + t * 1.2, u = (t * 0.6 + j / 10) % 1;
            p4.set(1.9 + Math.cos(a) * 0.55, 0.5 + u * 1.0, Math.sin(a) * 0.55);
            s4.setScalar(Math.sin(u * Math.PI) * 1.2); q4.identity(); m4.compose(p4, q4, s4); bunSparks.setMatrixAt(j, m4);
          }
          bunSparks.instanceMatrix.needsUpdate = true;
        }
        bun.head.rotation.x = Math.sin(t * 1.5) * 0.08;
      }
      // Step 4: limewater
      if (s === 4) {
        if (auto) { const n = Math.min(10, Math.floor(T / 0.6)); if (n !== st.breaths) { setBreaths(n); st.slider?.set(n); } }
        st.bub = Math.max(0, st.bub - dt);
        for (const tb of tubes) tb.bubbles.forEach((b, k) => {
          const u = (t * 1.3 + k / 6) % 1;
          b.visible = st.bub > 0;
          b.position.set(0.05 + Math.sin(u * 12 + k) * 0.03, 0.18 + u * 0.62, Math.cos(u * 9 + k) * 0.03);
        });
      }
      // Step 5: seeds warming
      if (s === 5 && auto) { const h = Math.min(48, 6 * Math.floor(T / 0.8)); if (h !== st.hours) { setHours(h); st.slider?.set(h); } }
      flasks[0].col.scale.y += (tempH(seedT(st.hours)) - flasks[0].col.scale.y) * Math.min(1, dt * 4);
      flasks[1].col.scale.y = tempH(20);
      // Step 6: storage
      if (s === 6) {
        if (auto) { const v = Math.max(0, 30 - 5 * Math.floor(T / 1.2)); const vv = T > 12 ? (st.time = 0, 30) : v; if (vv !== st.temp) { setTemp(vv); st.slider?.set(vv); } }
        const r = rateAt(st.temp) / 8; // 0.125 at 0 °C, 1 at 30 °C
        const n = Math.round(NP * r);
        for (let j = 0; j < NP; j++) {
          const u = (t * (0.25 + 0.35 * r) + rand(j)) % 1, a = rand(j + 7) * Math.PI * 2, rr = 0.1 + rand(j + 3) * 0.5;
          p4.set(Math.cos(a) * rr, 0.4 + u * 1.0, Math.sin(a) * rr * 0.7);
          s4.setScalar(j < n ? Math.sin(u * Math.PI) + 0.05 : 0.001); q4.identity(); m4.compose(p4, q4, s4); co2IM.setMatrixAt(j, m4);
          p4.set(Math.cos(a + 1) * rr * 0.8, 0.35 + ((u + 0.5) % 1) * 0.7, Math.sin(a + 1) * rr * 0.6);
          s4.setScalar(j < n * 0.7 ? Math.sin(((u + 0.5) % 1) * Math.PI) : 0.001); m4.compose(p4, q4, s4); heatIM.setMatrixAt(j, m4);
        }
        co2IM.instanceMatrix.needsUpdate = heatIM.instanceMatrix.needsUpdate = true;
        sCol.scale.y += (0.15 + (st.temp / 30) * 1.15 - sCol.scale.y) * Math.min(1, dt * 4);
      }
      return true;
    },
  };

  function animateRunner(r, x, dt) {
    const cadence = x < 0.02 ? 0 : 0.9 + 0.9 * x; // strides per second
    st.phase += dt * cadence * Math.PI * 2;
    const ph = st.phase, A = 0.25 + 0.55 * x, k = x < 0.02 ? 0 : 1;
    r.legs.forEach((l, i) => {
      const p = ph + i * Math.PI;
      l.thigh.rotation.z = k * A * Math.sin(p);
      l.shin.rotation.z = -k * (0.15 + 1.1 * x) * (0.5 + 0.5 * Math.sin(p - 1.4));
    });
    r.arms.forEach((a, i) => {
      const p = ph + (i ? 0 : Math.PI);
      a.upper.rotation.z = k * A * 0.9 * Math.sin(p);
      a.fore.rotation.z = 0.3 + 1.1 * x;
    });
    r.body.position.y = k * 0.04 * x * Math.abs(Math.sin(ph));
    r.body.rotation.z = -0.15 * x;
  }
}

// ---------- Builders ----------

// A simple runner facing +x, standing on y = 0. Legs and arms have two segments each.
function runner(THREE, kit) {
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);
  const skin = kit.mat(0xd9a77f, { roughness: 0.6 }), shirt = kit.mat(0x2e86de, { roughness: 0.6 }), shorts = kit.mat(0x2b2d42, { roughness: 0.7 }), shoe = kit.mat(0xf4f4f4, { roughness: 0.5 });
  const chest = kit.mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 14), shirt, [0, 1.26, 0], body);
  chest.scale.z = 1.25;
  kit.mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.2, 14), shorts, [0, 0.96, 0], body);
  kit.mesh(new THREE.SphereGeometry(0.14, 18, 14), skin, [0.02, 1.72, 0], body);
  kit.mesh(new THREE.SphereGeometry(0.145, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0x3b2a1e), [0.0, 1.74, 0], body);
  const limb = (parent, len, r, mat) => { const m = kit.mesh(new THREE.CapsuleGeometry(r, len - 2 * r, 3, 10), mat, [0, -len / 2, 0], parent); return m; };
  const legs = [-1, 1].map(s => {
    const thigh = new THREE.Group(); thigh.position.set(0, 0.92, s * 0.1); body.add(thigh);
    limb(thigh, 0.44, 0.075, s < 0 ? shorts : shorts);
    const shin = new THREE.Group(); shin.position.y = -0.42; thigh.add(shin);
    limb(shin, 0.44, 0.06, skin);
    kit.mesh(new THREE.BoxGeometry(0.2, 0.07, 0.1), shoe, [0.05, -0.45, 0], shin);
    return { thigh, shin };
  });
  const arms = [-1, 1].map(s => {
    const upper = new THREE.Group(); upper.position.set(0, 1.5, s * 0.24); body.add(upper);
    limb(upper, 0.3, 0.055, shirt);
    const fore = new THREE.Group(); fore.position.y = -0.28; upper.add(fore);
    limb(fore, 0.28, 0.045, skin);
    return { upper, fore };
  });
  return { g, body, chest, legs, arms };
}

// Belt stripes for the treadmill (scrolls with texture offset).
function stripes(THREE) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 16;
  const x = c.getContext('2d');
  x.fillStyle = '#2b2f3a'; x.fillRect(0, 0, 128, 16);
  x.fillStyle = '#4a5060';
  for (let i = 0; i < 128; i += 16) x.fillRect(i, 0, 5, 16);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}
