// Fungi and bacteria: six stations. A forest patch with mushrooms on white threads that release spores;
// two bread slices (warm and damp vs cold and dry) growing mould over the days; two bowls of dough,
// one with yeast that fills with gas bubbles and doubles; a magnifier that zooms into yogurt to show
// rod, sphere and spiral bacteria; helpful bacteria making yogurt and turning dead leaves into soil;
// and hands where rinsing with water leaves many germs but washing with soap removes almost all.
import { makeMushroom, paint, smooth } from '../_shared/habitat-kit.js';
import { rand, leafGeometry } from '../_shared/leaf.js';

const BT = 0.9;                       // lab bench top
const FOREST = [-8.6, 0.1];           // station x, z
const X = { bread: -4.6, dough: -1.5, zoom: 1.6, help: 4.7, hands: 7.8 };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const { clamp, lerp, ease } = kit;
  kit.stage(scene, { ground: 0xd9e8cf, sky: 0xe4f2fb, radius: 18 });
  kit.lights(scene, { sun: [2, 11, 7] });
  const flat = (c, o) => kit.mat(c, { flatShading: true, ...o });
  const basic = (c, o) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const glass = (c = 0xe6f6ff, o = 0.22) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: o, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const dummy = new THREE.Object3D(), col = new THREE.Color();

  // ---------- Lab bench ----------
  const benchMat = kit.mat(0xd8b384);
  kit.mesh(new THREE.BoxGeometry(15.6, 0.12, 1.8), benchMat, [1.6, BT - 0.06, 0], scene);
  for (const x of [-6.0, -1.0, 4.2, 9.2]) for (const z of [-0.75, 0.75]) kit.mesh(new THREE.BoxGeometry(0.12, BT - 0.12, 0.12), kit.mat(0x9a7b55), [x, (BT - 0.12) / 2, z], scene);
  const mats = {};
  for (const [k, x] of Object.entries(X)) {
    const m = kit.mesh(new THREE.CircleGeometry(1.15, 32), kit.mat(0xf5efe3, { polygonOffset: true, polygonOffsetFactor: -1 }), [x, BT + 0.003, 0.05], scene);
    m.rotation.x = -Math.PI / 2; m.castShadow = false; mats[k] = m;
  }

  // ---------- 1. Forest patch: soil block with threads, log, mushrooms, spores ----------
  const forest = new THREE.Group();
  forest.position.set(FOREST[0], 0, FOREST[1]);
  scene.add(forest);
  const SOIL_H = 0.55;
  const soilTex = paint(THREE, 512, 128, (g, w, h) => {
    g.fillStyle = '#7a5235'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { g.fillStyle = rand(i) > 0.5 ? '#6a452b' : '#8a6040'; g.fillRect(rand(i + 1) * w, rand(i + 2) * h, 4, 3); }
    // White fungus threads branching through the soil from under each mushroom.
    g.strokeStyle = '#f4efe2'; g.lineCap = 'round';
    const branch = (x, y, a, len, wdt, d) => {
      if (d > 5 || len < 4) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      g.lineWidth = wdt; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      branch(x2, y2, a + 0.5 + rand(d * 13 + x) * 0.3, len * 0.72, wdt * 0.75, d + 1);
      branch(x2, y2, a - 0.5 - rand(d * 7 + y) * 0.3, len * 0.72, wdt * 0.75, d + 1);
    };
    for (const fx of [0.3, 0.55, 0.72]) { branch(fx * w, 2, Math.PI / 2, 34, 3, 0); branch(fx * w, 2, Math.PI * 0.2, 26, 2.2, 1); branch(fx * w, 2, Math.PI * 0.8, 26, 2.2, 1); }
  });
  const soilSide = kit.mat(0x7a5235);
  const soilBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, SOIL_H, 1.6), [soilSide, soilSide, kit.mat(0x6e9e45), soilSide, kit.mat(0xffffff, { map: soilTex }), soilSide]);
  soilBox.position.y = SOIL_H / 2; soilBox.receiveShadow = true;
  forest.add(soilBox);
  const log = kit.mesh(new THREE.CylinderGeometry(0.22, 0.25, 1.9, 12), kit.mat(0x7b5134), [0.1, SOIL_H + 0.2, -0.4], forest);
  log.rotation.z = Math.PI / 2; log.rotation.y = 0.15;
  const mushrooms = [[-0.52, 0.25, 3.6, 0xd64545], [0.13, 0.35, 4.4, 0xb5651d], [0.6, 0.2, 3.0, 0xd64545], [0.95, -0.05, 2.4, 0xb5651d]].map(([x, z, s, c]) => {
    const m = makeMushroom(THREE, kit, { s, cap: c });
    m.position.set(x, SOIL_H, z);
    forest.add(m);
    return { m, s };
  });
  const sporeGeo = new THREE.SphereGeometry(0.014, 4, 3), sporeMat = basic(0x6d4c41, { transparent: true, opacity: 0.8 });
  const spores = [];
  for (let i = 0; i < 36; i++) { const s = new THREE.Mesh(sporeGeo, sporeMat); s.visible = false; forest.add(s); spores.push(s); }
  const tagMush = label('Mushroom', new THREE.Vector3(FOREST[0] + 0.13, SOIL_H + 0.75, FOREST[1] + 0.35));
  const tagThreads = label('Threads', new THREE.Vector3(FOREST[0] - 0.55, SOIL_H * 0.45, FOREST[1] + 0.8), { cls: 'cool' });
  const tagSpores = label('Spores', new THREE.Vector3(FOREST[0] + 0.9, SOIL_H + 1.2, FOREST[1] + 0.3), { cls: 'warm' });

  // ---------- 2. Bread: warm and damp box vs cold and dry box ----------
  const crumbTex = paint(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = '#f3dfb5'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = '#e2c48e'; g.beginPath(); g.arc(rand(i) * w, rand(i + 50) * h, 1 + rand(i + 7) * 2, 0, 7); g.fill(); }
  });
  const crust = kit.mat(0xb7793f), crumb = kit.mat(0xffffff, { map: crumbTex });
  const SLICE_Y = BT + 0.06;
  function slice(x) {
    const g = new THREE.Group();
    g.position.set(x, 0, 0.05);
    scene.add(g);
    kit.mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.04, 24), kit.mat(0xffffff, { roughness: 0.3 }), [0, BT + 0.02, 0], g);
    kit.mesh(new THREE.BoxGeometry(0.58, 0.07, 0.52), crust, [0, SLICE_Y, 0], g);
    const top = kit.mesh(new THREE.PlaneGeometry(0.53, 0.47), crumb, [0, SLICE_Y + 0.036, 0], g);
    top.rotation.x = -Math.PI / 2;
    return g;
  }
  const warmSlice = slice(X.bread - 0.62), coldSlice = slice(X.bread + 0.62);
  const boxGeo = new THREE.BoxGeometry(1.0, 0.75, 0.95);
  const warmBox = new THREE.Mesh(boxGeo, glass(0xfff0d0, 0.2)); warmBox.position.set(X.bread - 0.62, BT + 0.375, 0.05); warmBox.renderOrder = 2;
  const coldBox = new THREE.Mesh(boxGeo, glass(0xbfe3ff, 0.32)); coldBox.position.set(X.bread + 0.62, BT + 0.375, 0.05); coldBox.renderOrder = 2;
  scene.add(warmBox, coldBox);
  for (const [b, c] of [[warmBox, 0xffcf7a], [coldBox, 0x7fc4f0]]) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({ color: c })); b.add(e); }
  const dropMat = glass(0x9fd4ff, 0.6);
  for (let i = 0; i < 18; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.02 + rand(i) * 0.015, 6, 4), dropMat);
    // Condensation on the back and left walls, above the bread (so the drops never cover the slice).
    if (i % 3) { d.position.set(-0.44 + rand(i + 3) * 0.88, 0.02 + rand(i + 5) * 0.3, -0.47); d.scale.z = 0.4; }
    else { d.position.set(-0.49, 0.0 + rand(i + 5) * 0.3, -0.4 + rand(i + 3) * 0.8); d.scale.x = 0.4; }
    warmBox.add(d);
  }
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), basic(0xffffff)); f.position.set(-0.3 + i * 0.2, 0.4, 0); f.scale.y = 0.3; coldBox.add(f); }
  const MOULD = 26;
  const mouldGeo = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const mouldMat = kit.mat(0xffffff, { roughness: 1, flatShading: true });
  const mouldWarm = new THREE.InstancedMesh(mouldGeo, mouldMat, MOULD), mouldCold = new THREE.InstancedMesh(mouldGeo, mouldMat, MOULD);
  const mouldCols = [0x4f8a3c, 0xf2f5ec, 0x6f9a52, 0x2f4f2a, 0xdfe8d2, 0x87a85e];
  const spots = [];
  for (let i = 0; i < MOULD; i++) {
    spots.push({ x: (rand(i * 3 + 11) - 0.5) * 0.46, z: (rand(i * 5 + 17) - 0.5) * 0.4, day: 1.6 + rand(i * 7 + 2) * 4.2, size: 0.035 + rand(i + 31) * 0.05 });
    col.setHex(mouldCols[i % mouldCols.length]);
    mouldWarm.setColorAt(i, col); mouldCold.setColorAt(i, col);
  }
  mouldWarm.frustumCulled = mouldCold.frustumCulled = false; // instance spots move, so skip the cached bounds
  warmSlice.add(mouldWarm); coldSlice.add(mouldCold);
  // Cold slice: only the earliest spot starts, very late and very small.
  function setMould(days) {
    let n = 0;
    for (let i = 0; i < MOULD; i++) {
      const s = spots[i], r = clamp((days - s.day) / 2.5, 0, 1) * s.size;
      if (r <= 0.002) continue;
      dummy.position.set(s.x, SLICE_Y + 0.036, s.z); dummy.scale.set(r, r * 0.22, r); dummy.updateMatrix();
      mouldWarm.setMatrixAt(n, dummy.matrix); mouldWarm.setColorAt(n, col.setHex(mouldCols[i % mouldCols.length])); n++;
    }
    mouldWarm.count = n; mouldWarm.instanceMatrix.needsUpdate = true; if (mouldWarm.instanceColor) mouldWarm.instanceColor.needsUpdate = true;
    const rc = clamp((days - 5.5) / 6, 0, 1) * 0.03;
    dummy.position.set(0.1, SLICE_Y + 0.036, -0.05); dummy.scale.set(rc, rc * 0.45, rc); dummy.updateMatrix();
    mouldCold.setMatrixAt(0, dummy.matrix); mouldCold.count = rc > 0.002 ? 1 : 0; mouldCold.instanceMatrix.needsUpdate = true;
    return n;
  }
  const tagWarm = label('Warm and damp', new THREE.Vector3(X.bread - 0.62, BT + 0.95, 0.05), { cls: 'warm' });
  const tagCold = label('Cold and dry', new THREE.Vector3(X.bread + 0.62, BT + 0.95, 0.05), { cls: 'cool' });

  // ---------- 3. Dough: with yeast vs no yeast ----------
  const doughMat = kit.mat(0xf3e2c0, { roughness: 0.85 }), bowlMat = glass(0xdff2ff, 0.3);
  const DR = 0.26;
  function bowl(x) {
    const g = new THREE.Group();
    g.position.set(x, BT, 0.05);
    scene.add(g);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bowlMat);
    b.position.y = 0.42; b.renderOrder = 2; g.add(b);
    kit.mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.03, 20), kit.mat(0xcfe6f5), [0, 0.015, 0], g);
    const d = kit.mesh(new THREE.SphereGeometry(DR, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), doughMat, [0, 0.2, 0], g);
    d.scale.set(1.2, 0.8, 1.2);
    return { g, d };
  }
  const yeastBowl = bowl(X.dough - 0.62), plainBowl = bowl(X.dough + 0.62);
  const bubbleGeo = new THREE.SphereGeometry(1, 10, 6), bubbleMat = kit.mat(0xffffff, { transparent: true, opacity: 0.75, roughness: 0.2 });
  const bubbles = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(bubbleGeo, bubbleMat); m.castShadow = false;
    const a = rand(i * 3 + 1) * Math.PI * 2, e = 0.15 + rand(i * 3 + 2) * 1.2;
    m.dir = [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)];
    m.ph = rand(i + 70);
    yeastBowl.g.add(m); bubbles.push(m);
  }
  const tagYeast = label('With yeast', new THREE.Vector3(X.dough - 0.62, BT + 0.95, 0.05), { cls: 'warm' });
  const tagPlain = label('No yeast', new THREE.Vector3(X.dough + 0.62, BT + 0.95, 0.05));
  const tagGas = label('Gas bubbles', new THREE.Vector3(X.dough - 0.95, BT + 0.55, 0.4), { cls: 'cool' });
  function setDough(min, t) {
    const grow = Math.cbrt(1 + clamp(min / 60, 0, 1));    // volume doubles in an hour
    yeastBowl.d.scale.set(1.2 * grow, 0.8 * grow * grow * 0.9, 1.2 * grow);
    yeastBowl.d.position.y = 0.2;
    const sx = DR * 1.2 * grow, sy = DR * 0.8 * grow * grow * 0.9;
    bubbles.forEach((b, i) => {
      const on = min > 2 + i * 1.5;
      b.visible = on;
      if (!on) return;
      const c = (t * 0.45 + b.ph) % 1, s = 0.012 + 0.03 * Math.sin(Math.PI * c);   // swell then pop
      b.scale.setScalar(s);
      b.position.set(b.dir[0] * sx * 0.98, 0.2 + b.dir[1] * sy * 0.98, b.dir[2] * sx * 0.98);
    });
  }

  // ---------- 4. Magnifier over a yogurt pot ----------
  const pot = new THREE.Group();
  pot.position.set(X.zoom, BT, 0.25);
  scene.add(pot);
  kit.mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.32, 20), kit.mat(0xffffff, { roughness: 0.4 }), [0, 0.16, 0], pot);
  kit.mesh(new THREE.CylinderGeometry(0.203, 0.19, 0.1, 20), kit.mat(0x7fb3e6), [0, 0.16, 0], pot);
  kit.mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.01, 20), kit.mat(0xfffaf0), [0, 0.3, 0], pot).castShadow = false;
  const spoon = new THREE.Group();
  kit.mesh(new THREE.BoxGeometry(0.03, 0.4, 0.012), kit.mat(0xc0c8d0, { metalness: 0.6, roughness: 0.3 }), [0, 0.2, 0], spoon);
  kit.mesh(new THREE.SphereGeometry(0.06, 12, 6).scale(1, 0.25, 1.4), kit.mat(0xc0c8d0, { metalness: 0.6, roughness: 0.3 }), [0, 0.0, 0], spoon);
  spoon.position.set(0.05, 0.3, 0); spoon.rotation.z = -0.4;
  pot.add(spoon);
  const ring = kit.mesh(new THREE.TorusGeometry(0.05, 0.006, 4, 20), basic(0x1565c0), [-0.05, 0.31, 0.02], pot);
  ring.rotation.x = Math.PI / 2; ring.castShadow = false;
  const lens = new THREE.Group();
  lens.position.set(X.zoom, BT + 1.45, 0.25);
  lens.rotation.x = -0.12;
  scene.add(lens);
  const LR = 0.62;
  lens.add(new THREE.Mesh(new THREE.CircleGeometry(LR, 40), basic(0xeef7f2)));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(LR, 0.05, 8, 40), kit.mat(0x37474f, { metalness: 0.3, roughness: 0.4 }));
  lens.add(rim);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.45, 10), kit.mat(0x6d4c41));
  handle.position.set(LR * 0.78 + 0.13, -LR * 0.78 - 0.13, 0); handle.rotation.z = Math.PI / 4;
  lens.add(handle);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(LR * 0.9, 0.05, 1.0, 24, 1, true), glass(0xc8f0d8, 0.18));
  beam.position.set(X.zoom - 0.05, BT + 0.82, 0.27); beam.renderOrder = 3;
  scene.add(beam);
  const bugs = new THREE.Group();
  bugs.position.z = 0.02;
  lens.add(bugs);
  const rodMat = kit.mat(0x8e5bd6, { roughness: 0.5 }), cocMat = kit.mat(0x2e9e8f, { roughness: 0.5 }), spiMat = kit.mat(0xe0794f, { roughness: 0.5 });
  const rodGeo = new THREE.CapsuleGeometry(0.035, 0.13, 4, 8), cocGeo = new THREE.SphereGeometry(0.04, 12, 8);
  const helix = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24; helix.push(new THREE.Vector3((u - 0.5) * 0.26, Math.sin(u * Math.PI * 6) * 0.03, Math.cos(u * Math.PI * 6) * 0.03)); }
  const spiGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 48, 0.012, 6);
  const bugList = [];
  const addBug = (geo, mat, x, y, a, kind) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0.02); m.rotation.z = a; m.home = [x, y, a]; m.kind = kind; bugs.add(m); bugList.push(m); return m; };
  [[-0.3, 0.25, 0.4], [-0.1, 0.38, -0.3], [0.05, -0.05, 1.2], [-0.38, -0.1, -0.9], [0.32, 0.12, 0.2]].forEach(([x, y, a]) => addBug(rodGeo, rodMat, x, y, a, 'rod'));
  [[0.15, 0.32], [0.33, -0.18], [-0.18, -0.35], [-0.42, 0.1]].forEach(([x, y], i) => { for (let j = 0; j < 3; j++) addBug(cocGeo, cocMat, x + j * 0.075 * Math.cos(i), y + j * 0.075 * Math.sin(i), 0, 'coc'); });
  [[0.05, -0.38, 0.3], [0.2, 0.0, -0.8], [-0.2, 0.1, 0.9]].forEach(([x, y, a]) => addBug(spiGeo, spiMat, x, y, a, 'spi'));
  const tagRod = label('Rod', new THREE.Object3D(), { cls: '' }), tagCoc = label('Sphere', new THREE.Object3D()), tagSpi = label('Spiral', new THREE.Object3D());
  // One label per shape, spread out: a rod on the left, a chain of spheres at the top, a spiral at the bottom.
  bugList[3].add(tagRod.at); tagRod.at.position.y = 0.06;
  bugList[6].add(tagCoc.at); tagCoc.at.position.y = 0.06;
  bugList[17].add(tagSpi.at); tagSpi.at.position.y = 0.06;
  const tagYog = label('Yogurt', new THREE.Vector3(X.zoom + 0.38, BT + 0.25, 0.25), { cls: 'warm' });
  function setZoom(z) { st.zoom = z; bugs.scale.setScalar(Math.max(0.001, z / 1000)); for (const t of [tagRod, tagCoc, tagSpi]) t.show(z >= 400 && !st.quiz); }

  // ---------- 5. Helpful bacteria: milk to yogurt, dead leaves to soil ----------
  const jar = new THREE.Group();
  jar.position.set(X.help - 0.6, BT, 0.05);
  scene.add(jar);
  const jarGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.62, 24, 1, true), glass(0xe6f6ff, 0.25));
  jarGlass.position.y = 0.31; jarGlass.renderOrder = 2; jar.add(jarGlass);
  kit.mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 24), kit.mat(0xd0e4ee), [0, 0.01, 0], jar);
  const milkMat = kit.mat(0xffffff, { roughness: 0.6 });
  const milk = kit.mesh(new THREE.CylinderGeometry(0.235, 0.225, 0.42, 24), milkMat, [0, 0.22, 0], jar);
  const surfMat = kit.mat(0xffffff, { roughness: 0.6 });
  const surf = kit.mesh(new THREE.CircleGeometry(0.235, 24), surfMat, [0, 0.432, 0], jar); surf.rotation.x = -Math.PI / 2;
  const jarSpoon = new THREE.Group();
  kit.mesh(new THREE.BoxGeometry(0.035, 0.5, 0.014), kit.mat(0xc0c8d0, { metalness: 0.6, roughness: 0.3 }), [0, 0.25, 0], jarSpoon);
  jar.add(jarSpoon);
  const bacMax = 60, bacIM = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.012, 0.03, 2, 6), basic(0x7b3fc4), bacMax);
  bacIM.frustumCulled = false;
  jar.add(bacIM);
  const bacPos = [];
  for (let i = 0; i < bacMax; i++) { const a = rand(i * 2 + 5) * Math.PI * 2; bacPos.push([Math.cos(a) * 0.236, 0.05 + rand(i * 3 + 8) * 0.37, Math.sin(a) * 0.236, rand(i + 99) * 3]); }
  const milkW = new THREE.Color(0xffffff), yogC = new THREE.Color(0xfff1cf);
  const tray = new THREE.Group();
  tray.position.set(X.help + 0.6, BT, 0.05);
  scene.add(tray);
  kit.mesh(new THREE.BoxGeometry(0.9, 0.08, 0.8), kit.mat(0x9c7a54), [0, 0.04, 0], tray);
  const soilMound = kit.mesh(new THREE.SphereGeometry(0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), flat(0x4e342e), [0, 0.08, 0], tray);
  soilMound.scale.set(1.1, 0.15, 1);
  const leafG = leafGeometry(THREE, 0.4, 0.2, 0.1);
  const leaves = [];
  const leafGreen = new THREE.Color(0xc58b3a), leafDark = new THREE.Color(0x4e342e);
  for (let i = 0; i < 12; i++) {
    const lm = kit.mat(0xc58b3a, { side: THREE.DoubleSide });
    const l = kit.mesh(leafG, lm, [(rand(i) - 0.5) * 0.4, 0.1 + i * 0.012, (rand(i + 20) - 0.5) * 0.35], tray);
    l.rotation.y = rand(i + 40) * 6; l.base = l.position.clone();
    leaves.push(l);
  }
  const sprout = new THREE.Group();
  sprout.position.set(0, 0.12, 0);
  tray.add(sprout);
  kit.mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.22, 6), kit.mat(0x5a9e3a), [0, 0.11, 0], sprout);
  const sl = new THREE.MeshStandardMaterial({ color: 0x6abf45, side: THREE.DoubleSide });
  for (const a of [0, Math.PI]) { const m = kit.mesh(leafGeometry(THREE, 0.13, 0.08, 0.1), sl, [0, 0.21, 0], sprout); m.rotation.y = a; }
  const tagMilk = label('Milk', new THREE.Vector3(X.help - 0.6, BT + 0.9, 0.05));
  const tagLeaves = label('Dead leaves', new THREE.Vector3(X.help + 0.6, BT + 0.6, 0.05), { cls: 'warm' });
  function setYogurt(p) {
    st.yog = p;
    const n = Math.round(lerp(4, bacMax, smooth(0, 0.8, p)));
    for (let i = 0; i < n; i++) { const b = bacPos[i]; dummy.position.set(b[0], b[1], b[2]); dummy.rotation.set(b[3], b[3] * 2, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); bacIM.setMatrixAt(i, dummy.matrix); }
    bacIM.count = n; bacIM.instanceMatrix.needsUpdate = true;
    const k = smooth(0.4, 1, p);
    milkMat.color.lerpColors(milkW, yogC, k); surfMat.color.copy(milkMat.color);
    // Runny milk: the spoon leans on the rim. Thick yogurt: it stands up straight.
    jarSpoon.position.set(lerp(0.15, 0, k), lerp(0.08, 0.2, k), 0);
    jarSpoon.rotation.z = lerp(0.55, 0, k);
    tagMilk.text = k > 0.6 ? 'Yogurt' : 'Milk';
  }
  function setRot(q) {
    st.rot = q;
    const k = smooth(0, 0.85, q);
    leaves.forEach((l, i) => {
      const s = Math.max(0.01, 1 - k * (0.9 + rand(i) * 0.1));
      l.scale.setScalar(s); l.visible = s > 0.05;
      l.material.color.lerpColors(leafGreen, leafDark, k);
      l.position.y = lerp(l.base.y, 0.12, k);
    });
    soilMound.scale.y = lerp(0.15, 0.45, k);
    const g = smooth(0.75, 1, q);
    sprout.visible = g > 0; sprout.scale.setScalar(Math.max(0.01, g));
    sprout.position.y = 0.08 + 0.36 * soilMound.scale.y;
    tagLeaves.text = k > 0.6 ? 'New soil' : 'Dead leaves';
  }

  // ---------- 6. Hands under a tap ----------
  const sink = new THREE.Group();
  sink.position.set(X.hands, BT, 0.05);
  scene.add(sink);
  kit.mesh(new THREE.BoxGeometry(1.5, 0.06, 1.0), kit.mat(0xcfd8dc, { roughness: 0.3 }), [0, 0.03, 0], sink);
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 12), kit.mat(0xb0bec5, { metalness: 0.7, roughness: 0.25 }), [0, 0.38, -0.42], sink);
  const spout = kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 12), kit.mat(0xb0bec5, { metalness: 0.7, roughness: 0.25 }), [0, 0.72, -0.25], sink);
  spout.rotation.x = Math.PI / 2;
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.45, 10, 1, true), glass(0x7cc7f2, 0.55));
  stream.position.set(0, 0.48, -0.07); stream.visible = false; sink.add(stream);
  const skin = kit.mat(0xd9a07a);
  const hands = [-0.27, 0.27].map((x, h) => {
    const g = new THREE.Group();
    g.position.set(x, 0.2, 0.08);
    g.rotation.y = h ? -0.25 : 0.25;
    sink.add(g);
    const palm = kit.mesh(new THREE.SphereGeometry(1, 16, 10), skin, [0, 0, 0], g);
    palm.scale.set(0.15, 0.05, 0.17);
    for (let f = 0; f < 4; f++) { const fi = kit.mesh(new THREE.CapsuleGeometry(0.028, 0.13 - Math.abs(f - 1.5) * 0.02, 3, 8), skin, [-0.09 + f * 0.06, 0.01, -0.22 + Math.abs(f - 1.5) * 0.012], g); fi.rotation.x = Math.PI / 2; }
    const th = kit.mesh(new THREE.CapsuleGeometry(0.03, 0.1, 3, 8), skin, [h ? -0.16 : 0.16, 0.0, -0.04], g);
    th.rotation.x = Math.PI / 2; th.rotation.y = h ? 0.6 : -0.6;
    const wrist = kit.mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.3, 12), skin, [0, -0.01, 0.27], g); wrist.rotation.x = Math.PI / 2;
    return g;
  });
  const GERMS = 70;
  const germIM = [0, 1].map(h => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.016, 6, 4), basic(h ? 0xd81b60 : 0x43a047), GERMS); m.frustumCulled = false; hands[h].add(m); return m; });
  const germPos = [];
  for (let i = 0; i < GERMS; i++) {
    const onFinger = rand(i * 4 + 3) < 0.35, f = Math.floor(rand(i * 4 + 9) * 4);
    germPos.push(onFinger ? [-0.09 + f * 0.06, 0.04, -0.17 - rand(i + 5) * 0.1] : [(rand(i * 2 + 1) - 0.5) * 0.24, 0.056, (rand(i * 2 + 7) - 0.5) * 0.26]);
  }
  function setGerms(frac) {
    const n = Math.round(GERMS * frac);
    for (const im of germIM) {
      for (let i = 0; i < n; i++) { dummy.position.set(...germPos[i]); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }
      im.count = n; im.instanceMatrix.needsUpdate = true;
    }
  }
  const foam = [];
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(bubbleGeo, kit.mat(0xffffff, { transparent: true, opacity: 0.85, roughness: 0.2 })); m.visible = false; m.castShadow = false; sink.add(m); foam.push(m); }
  const tagGerms = label('Germs', new THREE.Vector3(X.hands - 0.3, BT + 0.55, 0.15), { cls: 'warm' });

  // ---------- State ----------
  const st = { step: 0, quiz: false, time: 0, plan: [], auto: false, grow: 1, sporeT: -1, days: 0, min: 0, zoom: 1, yog: 0, rot: 0, yogOn: false, rotOn: false, wash: null, washT: 0, germs: 1, from: 1, slider: null, msg: '' };
  const tags = [tagMush, tagThreads, tagSpores, tagWarm, tagCold, tagYeast, tagPlain, tagGas, tagRod, tagCoc, tagSpi, tagYog, tagMilk, tagLeaves, tagGerms];
  const readout = msg => { if (msg !== st.msg) { st.msg = msg; ui.readout(msg); } };

  function growMushrooms() { st.grow = 0; st.sporeT = -1; }
  function releaseSpores() { st.sporeT = 0; }
  function setDays(d) {
    st.days = d;
    const n = setMould(d);
    if (st.step === 1) readout(`Day <b>${d}</b>: ${n ? `<b>${n}</b> mould spots on the warm slice` : 'no mould yet'}, ${d > 6 ? 'one tiny spot' : 'none'} on the cold slice.`);
  }
  function setMin(m) {
    st.min = m;
    if (st.step === 2) readout(`After <b>${m} minutes</b> the yeast dough is <b>${(1 + m / 60).toFixed(1)} times</b> as big as at the start.`);
  }
  function startWash(kind) {
    st.wash = kind; st.washT = 0; st.from = st.germs;
    if (st.germs < 0.2) st.from = st.germs = 1;
  }

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.auto = false; st.msg = ''; st.wash = null;
      tags.forEach(t => t.show(false));
      // Default look of every station (so each step starts from the same picture).
      st.grow = 1; st.sporeT = -1; spores.forEach(s => { s.visible = false; }); mushrooms.forEach(m => m.m.scale.setScalar(1));
      setDays(isQuiz ? 7 : 0); setDough(isQuiz ? 60 : 0, 0); setZoom(isQuiz ? 1000 : 1);
      setYogurt(isQuiz ? 1 : 0); setRot(isQuiz ? 1 : 0); st.yogOn = st.rotOn = false;
      st.germs = 1; setGerms(isQuiz ? 0.05 : 1); stream.visible = false; foam.forEach(f => { f.visible = false; });
      st.msg = '';
      if (i === 0) {
        view({ radius: 1.55, yaw: 0.25, pitch: 0.3, target: [FOREST[0] + 0.1, 0.75, FOREST[1]] });
        tagMush.show(true); tagThreads.show(true);
        growMushrooms();
        st.plan = [[1.6, releaseSpores]];
        ui.buttons([{ label: 'Grow mushrooms', onClick: () => { st.plan = []; growMushrooms(); } }, { label: 'Release spores', onClick: () => { st.plan = []; releaseSpores(); } }]);
        readout('Fungi feed on dead things, like this old log.');
      }
      if (i === 1) {
        view({ radius: 1.3, yaw: 0, pitch: 0.55, target: [X.bread, BT + 0.3, 0.05] });
        tagWarm.show(true); tagCold.show(true);
        st.auto = true;
        st.slider = ui.slider({ label: 'Days', min: 0, max: 7, step: 1, value: 0, onInput: v => { st.auto = false; setDays(v); } });
        setDays(0);
      }
      if (i === 2) {
        view({ radius: 1.25, yaw: 0, pitch: 0.42, target: [X.dough, BT + 0.35, 0.05] });
        tagYeast.show(true); tagPlain.show(true);
        st.auto = true;
        st.slider = ui.slider({ label: 'Time', min: 0, max: 60, step: 5, value: 0, unit: ' min', onInput: v => { st.auto = false; setMin(v); } });
        setMin(0);
      }
      if (i === 3) {
        view({ radius: 1.15, yaw: 0, pitch: 0.12, target: [X.zoom, BT + 0.95, 0.2] });
        tagYog.show(true);
        st.auto = true;
        st.slider = ui.slider({ label: 'Magnify', min: 0, max: 3, step: 0.05, value: 0, format: v => `×${Math.round(10 ** v)}`, onInput: v => { st.auto = false; setZoom(10 ** v); } });
      }
      if (i === 4) {
        view({ radius: 1.3, yaw: 0, pitch: 0.4, target: [X.help, BT + 0.4, 0.05] });
        tagMilk.show(true); tagLeaves.show(true);
        const row = ui.buttons([{ label: 'Make yogurt', onClick: () => { st.plan = []; st.yogOn = true; st.yog = 0; } }, { label: 'Rot the leaves', onClick: () => { st.plan = []; st.rotOn = true; st.rot = 0; } }]);
        st.plan = [[0.3, () => { st.yogOn = true; row.select(0); }], [1.8, () => { st.rotOn = true; row.select(1); }]];
        readout('Bacteria are too small to see. Here each purple dot stands for a huge number of them.');
      }
      if (i === 5) {
        view({ radius: 1.05, yaw: 0, pitch: 0.75, target: [X.hands, BT + 0.25, 0.05] });
        tagGerms.show(true);
        const row = ui.buttons([{ label: 'Rinse with water', onClick: () => { st.plan = []; startWash('rinse'); } }, { label: 'Wash with soap', onClick: () => { st.plan = []; startWash('soap'); } }]);
        st.plan = [[0.4, () => { startWash('rinse'); row.select(0); }], [6, () => { st.germs = 1; setGerms(1); startWash('soap'); row.select(1); }]];
        readout('Each dot stands for a lot of germs.');
      }
      if (isQuiz) view({ radius: 2, width: 3.9, yaw: 0, pitch: 0.38, target: [-1.5, 1.2, 0] });
    },

    update(dt) {
      st.time += dt;
      const t = st.time;
      let busy = false;
      while (st.plan.length && t >= st.plan[0][0]) st.plan.shift()[1]();
      if (st.plan.length) busy = true;
      if (st.quiz) return busy;

      if (st.step === 0) {
        if (st.grow < 1) { st.grow = Math.min(1, st.grow + dt / 1.4); busy = true; }
        const g = ease(st.grow);
        mushrooms.forEach((m, j) => { const s = clamp(g * 1.2 - j * 0.07, 0.05, 1); m.m.scale.set(s, s, s); });
        if (st.sporeT >= 0) {
          st.sporeT += dt;
          spores.forEach((s, j) => {
            const m = mushrooms[j % mushrooms.length], life = (st.sporeT * 0.35 + rand(j) * 0.9) % 1;
            const capY = 0.11 * m.s;
            s.visible = st.sporeT > rand(j + 3) * 0.6;
            s.position.set(m.m.position.x + (rand(j + 7) - 0.3) * 0.3 + life * 0.9, SOIL_H + capY + life * 1.1 + Math.sin(t * 2 + j) * 0.04, m.m.position.z + (rand(j + 11) - 0.5) * 0.3 + life * 0.2);
          });
          tagSpores.show(true);
          busy = true;
        }
      }
      if (st.step === 1 && st.auto) {
        const d = clamp(Math.floor(t / 0.5), 0, 7);
        if (d !== st.days) { setDays(d); st.slider?.set(d); }
        busy = busy || d < 7;
      }
      if (st.step === 2) {
        if (st.auto) {
          const m = clamp(Math.floor(t / 0.25) * 5, 0, 60);
          if (m !== st.min) { setMin(m); st.slider?.set(m); }
        }
        setDough(st.min, t);
        tagGas.show(st.min > 5);
        busy = true;
      }
      if (st.step === 3) {
        if (st.auto) {
          const v = clamp((t - 0.3) / 2.4, 0, 1) * 3;
          setZoom(10 ** v); st.slider?.set(v);
        }
        bugList.forEach((b, j) => {
          const [x, y, a] = b.home;
          b.position.set(x + Math.sin(t * 0.8 + j) * 0.015, y + Math.cos(t * 0.7 + j * 2) * 0.015, 0.02);
          if (b.kind === 'spi') { b.rotation.set(t * 3 + j, 0, a, 'ZXY'); } else if (b.kind === 'rod') b.rotation.z = a + Math.sin(t * 0.6 + j) * 0.3;
        });
        const z = st.zoom;
        readout(z < 20 ? `×${Math.round(z)}: the yogurt just looks smooth.` : z < 300 ? `×${Math.round(z)}: tiny dots are starting to show.` : `×${Math.round(z)}: now we can see the shapes of the bacteria!`);
        busy = true;
      }
      if (st.step === 4) {
        if (st.yogOn && st.yog < 1) { setYogurt(Math.min(1, st.yog + dt / 4.5)); busy = true; }
        if (st.rotOn && st.rot < 1) { setRot(Math.min(1, st.rot + dt / 4.5)); busy = true; }
        if (st.yogOn || st.rotOn) {
          const y = st.yog >= 1 ? 'The milk is now <b>thick yogurt</b>.' : st.yogOn ? 'The bacteria are multiplying in the milk...' : '';
          const r = st.rot >= 1 ? 'The leaves became <b>soil</b>, and a plant sprouts.' : st.rotOn ? 'Bacteria and fungi are breaking down the leaves...' : '';
          readout(`${y} ${r}`.trim());
        }
      }
      if (st.step === 5 && st.wash) {
        st.washT += dt;
        const D = 4, k = clamp(st.washT / D, 0, 1), target = st.wash === 'soap' ? 0.05 : 0.6;
        st.germs = lerp(st.from, Math.min(st.from, target), ease(k));
        setGerms(st.germs);
        stream.visible = k < 1;
        foam.forEach((f, j) => {
          f.visible = st.wash === 'soap' && k < 1;
          if (!f.visible) return;
          const h = j % 2, hp = hands[h].position;
          f.scale.setScalar(0.025 + rand(j) * 0.03 + Math.sin(t * 4 + j) * 0.006);
          f.position.set(hp.x + (rand(j + 3) - 0.5) * 0.3, hp.y + 0.05 + rand(j + 5) * 0.06, hp.z + (rand(j + 9) - 0.5) * 0.36);
        });
        hands.forEach((h, j) => { h.position.x = (j ? 0.27 : -0.27) + (k < 1 ? Math.sin(t * 9 + j * 3) * 0.02 : 0); });
        const secs = Math.round(k * 20);
        readout(st.wash === 'soap' ? `Soap and scrub: <b>${secs} seconds</b>.${k >= 1 ? ' Almost all the germs are <b>gone</b>.' : ''}` : `Water only.${k >= 1 ? ' <b>Many germs are left</b> on the hands.' : ''}`);
        if (k >= 1) st.wash = null;
        busy = true;
      }
      return busy;
    },
  };
}
