// Earth's water: 100 drops sorted into salty ocean (97), ice (2) and liquid fresh water (1); then a coast
// with a cut-away side where the Sun drives the water cycle: vapour rises, a cloud fills and darkens,
// drifts to the mountain and rains or snows, and the river and groundwater carry the water back to the sea.

const CX = 14, CY = 1.45;      // centre of the coast scene; its sea level above the floor
const CLOUD_Y = 4.4;           // cloud height
const SEA_X = -3.3, MTN_X = 3.4; // cloud x over the sea and over the mountain (local)
const DROP_SP = 0.32;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const noise = (x, z) => Math.sin(1.7 * x + 0.6 * z) * Math.sin(1.3 * z - 0.8 * x + 1) + 0.5 * Math.sin(3.1 * x + 2.3 * z + 2);

const RIV = [[3.0, 0.2], [2.3, 0.75], [1.3, 1.0], [0.3, 0.9], [-0.7, 1.05], [-1.9, 1.15]];
function segDist(x, z, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}
// Coast height (local units): sea floor on the left, a beach, hills and a mountain on the right.
function coastH(x, z) {
  const shore = -1.3 + 0.25 * Math.sin(z * 0.9 + 0.5);
  const land = ss(shore - 0.5, shore + 0.9, x);
  let h = lerp(-0.75, 0.25, land);
  h += land * 0.45 * ss(-0.5, 3, x);
  h += 2.6 * Math.exp(-((x - 3.6) ** 2 / 2.0 + (z + 0.5) ** 2 / 2.6));
  h += 0.06 * noise(x, z) * land;
  h -= 0.12 * ss(0.35, 0.08, segDist(x, z, RIV)) * land;
  return h;
}

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xd9e8c8, sky: 0xd8ecff, radius: 40 });
  kit.lights(scene, { sun: [-6, 11, 6] });
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();

  // ---------- 100 drops ----------
  const prof = [[0, -0.1], [0.06, -0.088], [0.095, -0.045], [0.1, 0], [0.085, 0.05], [0.055, 0.1], [0.025, 0.15], [0, 0.19]].map(([r, y]) => new THREE.Vector2(r, y));
  const dropGeo = new THREE.LatheGeometry(prof, 12);
  const drops = new THREE.InstancedMesh(dropGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.05 }), 100);
  drops.castShadow = true;
  scene.add(drops);
  const grid = i => new THREE.Vector3(((i % 10) - 4.5) * DROP_SP, 3.2 - Math.floor(i / 10) * DROP_SP, 0);
  const TANK = { x: -0.9, z: 0.1 };
  const home = [];
  for (let i = 0; i < 100; i++) {
    let p;
    if (i < 97) p = new THREE.Vector3(TANK.x + ((i % 10) - 4.5) * DROP_SP, 0.33, TANK.z + (Math.floor(i / 10) - 4.5) * DROP_SP);
    else if (i < 99) p = new THREE.Vector3(1.75 + (i - 97) * 0.32, 0.27, -0.6);
    else p = new THREE.Vector3(1.9, 0.33, 1.0);
    home.push(p);
  }
  const start = Array.from({ length: 100 }, (_, i) => grid(i));
  const delay = Array.from({ length: 100 }, (_, i) => (i >= 97 ? 0.9 + (i - 97) * 0.25 : rand(i) * 0.8));
  const C = { water: new THREE.Color(0x3d9be9), ocean: new THREE.Color(0x1f6fc4), ice: new THREE.Color(0xe8f6ff), fresh: new THREE.Color(0x4fd1ff) };
  const group = i => (i < 97 ? 'ocean' : i < 99 ? 'ice' : 'fresh');
  const dummy = new THREE.Object3D(), tc = new THREE.Color();
  // Tank, ice tray and glass.
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const tankGeo = new THREE.BoxGeometry(3.4, 0.6, 3.4);
  const tank = new THREE.Mesh(tankGeo, glassMat); tank.position.set(TANK.x, 0.3, TANK.z); tank.renderOrder = 2; scene.add(tank);
  const tankEdges = new THREE.LineSegments(new THREE.EdgesGeometry(tankGeo), new THREE.LineBasicMaterial({ color: 0x7fb2cc })); tankEdges.position.copy(tank.position); scene.add(tankEdges);
  const seaWater = new THREE.Mesh(new THREE.BoxGeometry(3.36, 0.42, 3.36), new THREE.MeshStandardMaterial({ color: 0x2f86d6, transparent: true, opacity: 0.0, roughness: 0.2, depthWrite: false }));
  seaWater.position.set(TANK.x, 0.22, TANK.z); seaWater.renderOrder = 1; scene.add(seaWater);
  const salt = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 150 }, (_, j) => [TANK.x + (rand(j) - 0.5) * 3.2, 0.06 + rand(j + 400) * 0.36, TANK.z + (rand(j + 900) - 0.5) * 3.2]).flat(), 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, map: dotTex, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(salt);
  const tray = kit.mesh(new THREE.BoxGeometry(1.0, 0.1, 0.6), kit.mat(0xf2f6fa), [1.91, 0.05, -0.6], scene);
  const cubes = [0, 1].map(j => { const c = kit.mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), new THREE.MeshStandardMaterial({ color: 0xe6f7ff, roughness: 0.15, transparent: true, opacity: 0.9 }), [1.75 + j * 0.32, 0.23, -0.6], scene); c.rotation.y = 0.3 + j * 0.5; c.scale.setScalar(0.001); return c; });
  const cupGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.55, 20, 1, true);
  const cup = new THREE.Mesh(cupGeo, glassMat); cup.position.set(1.9, 0.28, 1.0); cup.renderOrder = 2; scene.add(cup);
  kit.mesh(new THREE.CircleGeometry(0.18, 20), kit.mat(0xcfe8f5), [1.9, 0.01, 1.0], scene).rotation.x = -Math.PI / 2;

  // ---------- The coast ----------
  const coast = new THREE.Group(); coast.position.set(CX, CY, 0); scene.add(coast);
  const NXg = 84, NZg = 42;
  const tg = new THREE.PlaneGeometry(12, 6, NXg, NZg); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, tn = tp.count, th = new Float32Array(tn), tcol = new Float32Array(tn * 3);
  for (let i = 0; i < tn; i++) { th[i] = coastH(tp.getX(i), tp.getZ(i)); tp.setY(i, th[i]); }
  tg.computeVertexNormals();
  tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  const CC = { sand: new THREE.Color(0xe7d39b), grass: new THREE.Color(0x7dbb55), forest: new THREE.Color(0x4e8f3f), rock: new THREE.Color(0x8f7b66), snow: new THREE.Color(0xffffff), floor: new THREE.Color(0xc9b27c) };
  function paintCoast(snowLine) {
    for (let i = 0; i < tn; i++) {
      const h = th[i];
      if (h < 0.02) tc.copy(CC.floor); else if (h < 0.18) tc.copy(CC.sand);
      else if (h < 1.2) tc.copy(CC.grass).lerp(CC.forest, ss(0.4, 1.2, h));
      else tc.copy(CC.forest).lerp(CC.rock, ss(1.2, 1.9, h));
      tc.lerp(CC.snow, ss(snowLine - 0.06, snowLine + 0.06, h + 0.08 * noise(tp.getX(i) * 3, tp.getZ(i) * 3)));
      tc.toArray(tcol, i * 3);
    }
    tg.attributes.color.needsUpdate = true;
  }
  paintCoast(2.45);
  kit.mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), [0, 0, 0], coast);
  // Cut-away front side with soil and rock layers.
  const BOT = -1.4, NC = 120, rows = [0, 0.12, 0.14, 0.55, 0.58];
  const cPos = [], cCol = [], cIdx = [];
  const layerC = [new THREE.Color(0x6b4a2b), new THREE.Color(0x6b4a2b), new THREE.Color(0xc8a874), new THREE.Color(0xc8a874), new THREE.Color(0x8a8580), new THREE.Color(0x8a8580)];
  for (let i = 0; i <= NC; i++) {
    const x = -6 + 12 * i / NC, top = coastH(x, 3);
    const ys = [...rows.map(d => Math.max(BOT, top - d)), BOT];
    ys.forEach((y, r) => { cPos.push(x, y, 3.0); layerC[r].toArray(cCol, cCol.length); });
    if (i) { const a = (i - 1) * 6, b = i * 6; for (let r = 0; r < 5; r++) cIdx.push(a + r, a + r + 1, b + r, a + r + 1, b + r + 1, b + r); }
  }
  const cutGeo = new THREE.BufferGeometry();
  cutGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
  cutGeo.setAttribute('color', new THREE.Float32BufferAttribute(cCol, 3));
  cutGeo.setIndex(cIdx); cutGeo.computeVertexNormals();
  const cutFace = new THREE.Mesh(cutGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
  coast.add(cutFace);
  // Sea: a see-through box over the sea floor.
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x2f86d6, transparent: true, opacity: 0.62, roughness: 0.15, depthWrite: false });
  const sea = new THREE.Mesh(new THREE.BoxGeometry(5.6, -BOT, 5.98), seaMat);
  sea.position.set(-3.2, BOT / 2, -0.01); sea.renderOrder = 2; coast.add(sea);
  // River with flowing stripes.
  const stripes = document.createElement('canvas'); stripes.width = 64; stripes.height = 16;
  { const g = stripes.getContext('2d'); g.fillStyle = '#3d8fe0'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#8fcaff'; for (let i = 0; i < 4; i++) g.fillRect(i * 16 + 2, 3 + (i % 2) * 6, 7, 3); }
  const flowTex = new THREE.CanvasTexture(stripes); flowTex.wrapS = flowTex.wrapT = THREE.RepeatWrapping; flowTex.colorSpace = THREE.SRGBColorSpace;
  const rp = [];
  for (let i = 0; i < RIV.length - 1; i++) for (let k = 0; k < 8; k++) rp.push([lerp(RIV[i][0], RIV[i + 1][0], k / 8), lerp(RIV[i][1], RIV[i + 1][1], k / 8)]);
  rp.push(RIV[RIV.length - 1]);
  const rPos = [], rUv = [], rIdx = [];
  let along = 0;
  rp.forEach(([x, z], i) => {
    const [nx, nz] = rp[Math.min(i + 1, rp.length - 1)], [px, pz] = rp[Math.max(i - 1, 0)];
    const dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz) || 1, w = 0.06 + 0.08 * i / rp.length, y = Math.max(coastH(x, z) + 0.05, 0.02);
    if (i) along += Math.hypot(x - rp[i - 1][0], z - rp[i - 1][1]);
    rPos.push(x - dz / l * w, y, z + dx / l * w, x + dz / l * w, y, z - dx / l * w); rUv.push(along * 2, 0, along * 2, 1);
    if (i) { const a = (i - 1) * 2; rIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const rGeo = new THREE.BufferGeometry();
  rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3)); rGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rUv, 2));
  rGeo.setIndex(rIdx); rGeo.computeVertexNormals();
  coast.add(new THREE.Mesh(rGeo, new THREE.MeshStandardMaterial({ map: flowTex, roughness: 0.3, side: THREE.DoubleSide })));
  // Sun.
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
  sun.position.set(-4.6, 6.2, -2.2); coast.add(sun);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.3, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16), glowMat); sun.add(glow);
  // Water vapour rising from the sea.
  const NV = 110, vPos = new Float32Array(NV * 3), vGeo = new THREE.BufferGeometry();
  vGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
  const vapour = new THREE.Points(vGeo, new THREE.PointsMaterial({ color: 0x8fd0ff, size: 0.3, map: dotTex, transparent: true, opacity: 0.85, depthWrite: false }));
  coast.add(vapour);
  // Cloud: puffs that grow and darken as it fills.
  const cloud = new THREE.Group(); coast.add(cloud);
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.95 });
  const puffGeo = new THREE.SphereGeometry(1, 16, 12);
  for (const [x, y, z, s] of [[0, 0, 0, 0.62], [0.55, -0.05, 0.1, 0.5], [-0.55, -0.08, -0.05, 0.48], [0.25, 0.28, -0.1, 0.45], [-0.3, 0.22, 0.15, 0.42], [0.95, -0.12, -0.1, 0.36], [-0.95, -0.12, 0.05, 0.34]]) {
    const p = new THREE.Mesh(puffGeo, cloudMat); p.position.set(x, y, z); p.scale.setScalar(s); p.castShadow = true; cloud.add(p);
  }
  const white = new THREE.Color(0xffffff), grey = new THREE.Color(0x6e7a88);
  // Rain (streaks) and snow (flakes) below the cloud over the mountain.
  const NR = 90, rainPos = new Float32Array(NR * 6), rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x2f7fd6, transparent: true, opacity: 0.8 }));
  coast.add(rain);
  const snowPos = new Float32Array(NR * 3), snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, map: dotTex, transparent: true, depthWrite: false }));
  coast.add(snow);
  const rx = [], rz = [], rg = [];
  for (let j = 0; j < NR; j++) { const x = MTN_X + (rand(j) - 0.5) * 2.0, z = (rand(j + 77) - 0.5) * 1.6; rx.push(x); rz.push(z); rg.push(coastH(x, z)); }
  // Groundwater: dots seeping through the cut face toward the sea.
  const NG = 40, gPos = new Float32Array(NG * 3), gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  const ground = new THREE.Points(gGeo, new THREE.PointsMaterial({ color: 0x1e88ff, size: 0.26, map: dotTex, transparent: true, depthWrite: false }));
  coast.add(ground);
  const gx0 = Array.from({ length: NG }, (_, j) => 0.2 + rand(j + 5) * 3.4), gy = Array.from({ length: NG }, (_, j) => -0.5 - rand(j + 33) * 0.6);
  // Cycle arrows (last step).
  const arrows = new THREE.Group(); coast.add(arrows);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xff8f1f });
  const headGeo = new THREE.ConeGeometry(0.13, 0.32, 12);
  function arrow(pts) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    arrows.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.045, 6), arrowMat));
    const head = new THREE.Mesh(headGeo, arrowMat), end = curve.getPoint(1), tan = curve.getTangent(1);
    head.position.copy(end); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan); arrows.add(head);
  }
  arrow([[-4.4, 0.4, 1.6], [-4.5, 2.0, 1.6], [-4.2, 3.6, 1.4]]);
  arrow([[-2.0, 5.5, 0.6], [0.3, 5.8, 0.6], [2.4, 5.5, 0.6]]);
  arrow([[4.7, 3.7, 1.4], [4.8, 2.9, 1.4], [4.6, 2.2, 1.4]]);
  arrow(RIV.map(([x, z]) => [x, coastH(x, z) + 0.45, z + 0.35]).slice(1));
  arrows.visible = false;

  // ---------- Labels ----------
  const W = (x, y, z) => new THREE.Vector3(CX + x, CY + y, z);
  const L = {
    ocean: label('Salty ocean: 97', new THREE.Vector3(TANK.x, 0.75, TANK.z - 1.6), { cls: 'cool' }),
    ice: label('Ice: 2', new THREE.Vector3(1.9, 0.6, -0.6)),
    fresh: label('Fresh liquid: 1', new THREE.Vector3(1.9, 0.62, 1.25), { cls: 'cool' }),
    sun: label('Sun', sun, { cls: 'big warm' }),
    vapour: label('Water vapour', W(-3.0, 2.2, 1.6), { cls: 'cool' }),
    cloud: label('Cloud', cloud),
    rain: label('Rain', W(MTN_X + 1.3, 3.0, 0.8), { cls: 'cool' }),
    snow: label('Snow', W(MTN_X + 1.3, 3.0, 0.8)),
    river: label('River', W(0.6, 0.9, 1.0), { cls: 'cool' }),
    sea: label('Sea', W(-4.5, 0.2, 2.6), { cls: 'cool' }),
    groundwater: label('Groundwater', W(1.2, -0.85, 3.05), { cls: 'cool' }),
    evap: label('Evaporation', W(-4.4, 2.0, 1.6), { cls: 'warm' }),
    cond: label('Condensation', W(0.3, 6.1, 0.6), { cls: 'warm' }),
    prec: label('Precipitation', W(4.9, 2.9, 1.4), { cls: 'warm' }),
    back: label('Flowing back', W(-0.5, 1.2, 1.4), { cls: 'warm' }),
  };
  const showLabels = keys => { for (const [k, l] of Object.entries(L)) l.show(keys.includes(k)); };

  // ---------- State ----------
  const st = {
    sort: 0, sortTo: 0, sortT: 0, hl: null, dirty: true, coast: false, sun: 0.6,
    cloud: 'grow', W: 0.15, cx: SEA_X, cloudA: 1, cold: false, snowLine: 2.45, gw: false, auto: -1, t: 0, mode: '',
  };
  function placeDrops() {
    for (let i = 0; i < 100; i++) {
      const k = clamp((st.sortT - delay[i]) / 1.0, 0, 1), e = ease(st.sortTo ? k : 1 - k);
      const a = start[i], b = home[i];
      dummy.position.set(lerp(a.x, b.x, e), lerp(a.y, b.y, e) + Math.sin(Math.PI * e) * 0.5, lerp(a.z, b.z, e));
      const iceShrink = i >= 97 && i < 99 ? 1 - ss(0.7, 1, e) : 1;
      dummy.scale.setScalar(1.25 * Math.max(0.001, iceShrink));
      dummy.updateMatrix(); drops.setMatrixAt(i, dummy.matrix);
      const g = group(i);
      tc.copy(C.water).lerp(C[g], e);
      if (st.hl && st.sortTo && g !== st.hl) tc.multiplyScalar(0.22);
      drops.setColorAt(i, tc);
      if (i >= 97 && i < 99) cubes[i - 97].scale.setScalar(Math.max(0.001, ss(0.7, 1, e)));
    }
    const e0 = st.sortTo ? ss(0.2, 1.6, st.sortT) : 1 - ss(0, 1.2, st.sortT);
    seaWater.material.opacity = 0.35 * e0; salt.material.opacity = 0.9 * e0;
    drops.instanceMatrix.needsUpdate = true; drops.instanceColor.needsUpdate = true;
  }
  function sortDrops(on, instant) { st.sortTo = on ? 1 : 0; st.sortT = instant ? 9 : 0; st.dirty = true; }
  function pick(g) { st.hl = g; st.dirty = true; showLabels(g ? [g] : ['ocean', 'ice', 'fresh']); }
  function resetCloud(state) {
    if (state === 'rain') { st.cloud = 'rain'; st.W = 1; st.cx = MTN_X; st.cloudA = 1; }
    else { st.cloud = 'grow'; st.W = state === 'full' ? 0.6 : 0.12; st.cx = SEA_X; st.cloudA = 1; }
  }
  function setSun(v) { st.sun = v; sun.scale.setScalar(0.7 + 0.5 * v); glowMat.opacity = 0.15 + 0.35 * v; }
  setSun(0.6);
  const sunSlider = () => ui.slider({ label: 'Sun strength', min: 1, max: 5, step: 1, value: Math.round(st.sun * 5), format: v => ['very weak', 'weak', 'medium', 'strong', 'very strong'][v - 1], onInput: v => setSun(v / 5) });
  const coastView = { radius: 4.0, width: 6.4, yaw: 0.12, pitch: 0.2, target: [CX, CY + 2.0, 0] };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.mode = ''; st.auto = -1; st.hl = null; st.dirty = true; arrows.visible = false; st.gw = false; st.cold = false;
      vapour.visible = cloud.visible = rain.visible = snow.visible = ground.visible = false;
      st.coast = i >= 2 && !isQuiz;
      if (i === 0) {
        sortDrops(false, true); showLabels([]);
        go({ radius: 2.3, yaw: 0, pitch: 0.12, target: [0, 1.75, 0] });
        ui.buttons([{ label: 'Sort the drops', onClick: () => { sortDrops(true); showLabels(['ocean', 'ice', 'fresh']); view({ radius: 2.6, yaw: 0.15, pitch: 0.75, target: [0.2, 0.3, 0.2] }); } },
          { label: 'Mix them up', onClick: () => { sortDrops(false); showLabels([]); view({ radius: 2.3, yaw: 0, pitch: 0.12, target: [0, 1.75, 0] }); } }]);
        st.mode = 'drops'; st.auto = 0;
        ui.readout('<b>100</b> drops = all the water on Earth.');
      }
      if (i === 1) {
        if (!st.sortTo) sortDrops(true, true);
        const row = ui.buttons([{ label: 'Ocean', onClick: () => pick('ocean') }, { label: 'Ice', onClick: () => pick('ice') }, { label: 'Liquid fresh water', onClick: () => pick('fresh') }]);
        row.select(2); pick('fresh');
        ui.readout('<span style="color:#1f6fc4">●</span> 97 salty ocean &nbsp; <span style="color:#9bb7c9">●</span> 2 ice &nbsp; <span style="color:#1aa7e0">●</span> 1 liquid fresh');
        go({ radius: 2.5, yaw: 0.25, pitch: 0.8, target: [0.4, 0.3, 0.2] });
      }
      if (i === 2) {
        vapour.visible = true; showLabels(['sun', 'vapour', 'sea']);
        sunSlider(); resetCloud('grow'); cloud.visible = false; st.mode = 'evap';
        go({ radius: 3.9, yaw: 0.2, pitch: 0.16, target: [CX - 2.6, CY + 3.0, 0] });
      }
      if (i === 3) {
        vapour.visible = cloud.visible = true; showLabels(['cloud', 'vapour']);
        sunSlider(); resetCloud('grow'); st.mode = 'cloud';
        go({ ...coastView, radius: 3.6, target: [CX - 0.5, CY + 2.8, 0] });
      }
      if (i === 4) {
        cloud.visible = true; resetCloud('rain'); st.mode = 'rain'; showLabels(['cloud', 'rain']);
        const row = ui.buttons([{ label: 'Warm day', onClick: () => { st.cold = false; showLabels(['cloud', 'rain']); } }, { label: 'Cold day', onClick: () => { st.cold = true; showLabels(['cloud', 'snow']); } }]);
        row.select(0); st.auto = 0;
        go({ radius: 2.9, yaw: 0.3, pitch: 0.15, target: [CX + MTN_X - 0.2, CY + 2.9, 0] });
      }
      if (i === 5) {
        st.gw = true; ground.visible = true; showLabels(['river', 'groundwater', 'sea']); st.mode = 'back';
        ui.toggle({ label: 'Show water under the ground', value: true, onChange: v => { st.gw = v; ground.visible = v; L.groundwater.show(v); } });
        go({ radius: 3.4, width: 4.8, yaw: 0.15, pitch: 0.3, target: [CX - 0.2, CY + 0.4, 1.2] });
      }
      if (i === 6) {
        vapour.visible = cloud.visible = true; arrows.visible = true; resetCloud('full'); st.mode = 'all';
        showLabels(['evap', 'cond', 'prec', 'back', 'sun']);
        sunSlider();
        go({ ...coastView, radius: 4.4, target: [CX, CY + 2.6, 0] });
      }
      if (i !== 4) { st.snowLine = 2.45; paintCoast(2.45); }
      if (isQuiz) { sortDrops(true, true); pick(null); go({ radius: 2.8, yaw: -0.2, pitch: 0.7, target: [0.3, 0.3, 0.2] }); }
    },
    update(dt) {
      let busy = false;
      // Drops.
      if (st.sortT < 3) { st.sortT += dt; st.dirty = true; }
      if (st.dirty) { placeDrops(); st.dirty = false; busy = true; }
      if (st.auto >= 0) {
        st.auto += dt; busy = true;
        if (st.mode === 'drops' && st.auto > 0.6) { sortDrops(true); showLabels(['ocean', 'ice', 'fresh']); view({ radius: 2.6, yaw: 0.15, pitch: 0.75, target: [0.2, 0.3, 0.2] }); st.auto = -1; }
        if (st.mode === 'rain' && st.auto > 4) st.auto = -1;
      }
      if (!st.coast) return busy;
      busy = true;
      st.t += dt;
      const t = st.t;
      flowTex.offset.x -= dt * 0.7;
      // Vapour rises from the sea; a stronger Sun sends up more of it, faster.
      if (vapour.visible) {
        const n = Math.round(NV * (0.25 + 0.75 * st.sun)), top = CLOUD_Y - 0.3;
        for (let j = 0; j < NV; j++) {
          const ph = (t * (0.18 + 0.22 * st.sun) + rand(j)) % 1;
          vPos[j * 3] = -5.6 + rand(j + 3) * 3.7 + 0.15 * Math.sin(t + j);
          vPos[j * 3 + 1] = 0.05 + ph * top;
          vPos[j * 3 + 2] = -2.4 + rand(j + 9) * 4.8;
        }
        vGeo.setDrawRange(0, n); vGeo.attributes.position.needsUpdate = true;
      }
      // Cloud: fills over the sea, drifts to the mountain, rains, then fades and starts again.
      if (cloud.visible) {
        if (st.cloud === 'grow') { st.W = Math.min(1, st.W + dt * 0.3 * st.sun); if (st.W >= 1 && st.mode !== 'cloud') st.cloud = 'move'; if (st.W >= 1 && st.mode === 'cloud') st.cloud = 'move'; }
        else if (st.cloud === 'move') { st.cx += dt * 1.3; if (st.cx >= MTN_X) { st.cx = MTN_X; st.cloud = 'rain'; } }
        else if (st.cloud === 'rain') { if (st.mode !== 'rain') st.W -= dt * 0.22; if (st.W <= 0.15) st.cloud = 'fade'; }
        else if (st.cloud === 'fade') { st.cloudA -= dt * 1.5; if (st.cloudA <= 0) resetCloud('grow'); }
        cloud.position.set(st.cx, CLOUD_Y, 0.2);
        cloud.scale.setScalar(0.45 + 0.85 * st.W);
        cloudMat.color.copy(white).lerp(grey, ss(0.3, 1, st.W));
        cloudMat.opacity = 0.95 * st.cloudA;
      }
      // Rain or snow under the cloud over the mountain.
      const falling = cloud.visible && st.cloud === 'rain';
      rain.visible = falling && !st.cold; snow.visible = falling && st.cold;
      if (falling) {
        const top = CLOUD_Y - 0.35;
        for (let j = 0; j < NR; j++) {
          const span = top - rg[j];
          if (!st.cold) {
            const y = top - ((t * 1.6 + rand(j + 5)) % 1) * span;
            rainPos.set([rx[j], y, rz[j], rx[j] - 0.02, y - 0.22, rz[j]], j * 6);
          } else {
            const y = top - ((t * 0.35 + rand(j + 5)) % 1) * span;
            snowPos.set([rx[j] + 0.08 * Math.sin(t * 2 + j), y, rz[j] + 0.08 * Math.cos(t * 1.7 + j)], j * 3);
          }
        }
        rainGeo.attributes.position.needsUpdate = true; snowGeo.attributes.position.needsUpdate = true;
      }
      // Snow line moves down on cold days and back up (melting) on warm days.
      const want = st.mode === 'rain' && st.cold ? 1.6 : 2.45;
      if (Math.abs(st.snowLine - want) > 0.005) { st.snowLine += (want - st.snowLine) * Math.min(1, dt * 0.8); paintCoast(st.snowLine); }
      // Groundwater seeps down and toward the sea.
      if (ground.visible) {
        for (let j = 0; j < NG; j++) {
          const s = (t * 0.07 + rand(j + 21)) % 1, x0 = gx0[j], y0 = coastH(x0, 3) - 0.15, yb = gy[j];
          let x, y;
          if (s < 0.3) { const k = s / 0.3; x = x0 - 0.3 * k; y = lerp(y0, yb, k); }
          else { const k = (s - 0.3) / 0.7; x = lerp(x0 - 0.3, -1.9, k); y = lerp(yb, Math.min(yb + 0.3, -0.75), k); }
          gPos.set([x, y, 3.03], j * 3);
        }
        gGeo.attributes.position.needsUpdate = true;
      }
      return busy;
    },
  };
}
