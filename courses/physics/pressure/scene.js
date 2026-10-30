// Pressure: bricks pressing into sand (p = F / S), a person on soft snow in boots or snowshoes, a water tank
// with a depth sensor and jets from holes at three depths (p = d · h), connected vessels of different shapes,
// and atmospheric pressure (an upturned glass held shut by a card, and a can crushed by the air).
// Each demo is its own group, built at the origin and shown only in its step. World units: 1 unit = 10 cm.
import { paint, makeArrow, rand, fmt } from '../_shared/lab.js';
import { glassMat, liquidMat, liquidColumn, liquidBox, glassBox, glassTube } from '../_shared/fluids.js';

const D_WATER = 9800;          // specific weight of water, N/m³ (= 1000 kg/m³ × 9.8 N/kg)
const GU = 98;                 // g in world units per s² (9.8 m/s²)
const BRICK_N = 20;            // weight of one brick, N
const SAND_Y = 1.0;
const FACES = [
  { name: 'Lying flat', S: 0.02, rot: [0, 0, 0], h: 0.5, fx: 2, fz: 1 },
  { name: 'On its side', S: 0.01, rot: [Math.PI / 2, 0, 0], h: 1, fx: 2, fz: 0.5 },
  { name: 'Standing on end', S: 0.005, rot: [0, 0, Math.PI / 2], h: 2, fx: 0.5, fz: 1 },
];
const PERSON_N = 600;
const FEET = [
  { name: 'Boots', S: 0.06 },
  { name: 'One boot', S: 0.03 },
  { name: 'Snowshoes', S: 0.3 },
];
// Tank: table top at 10 units (1 m), water 0.6 m deep, holes 0.1, 0.3 and 0.5 m below the surface.
const TABLE = 10, TANK_FLOOR = TABLE + 0.06, WATER_TOP = TANK_FLOOR + 6, HOLES = [0.1, 0.3, 0.5], LAND = 0.25, DROPS = 36;
// Connected vessels: bottoms at 1.2 units, 5 units tall. Radii at the bottom and the top.
const V_BOT = 1.2, V_H = 5;
const VESSELS = [
  { x: -4.5, rb: 0.35, rt: 0.35 },
  { x: -1.5, rb: 1.05, rt: 1.05 },
  { x: 1.5, rb: 0.35, rt: 1.2 },
  { x: 4.5, rb: 1.0, rt: 0.4 },
];

const comma = n => Math.round(n).toLocaleString('en-US');

export default function setup({ THREE, scene, kit, ui, label, view, renderer }) {
  const ground = kit.stage(scene, { ground: 0xd5e3c9, sky: 0xdff1ff, radius: 60 });
  const sun = kit.lights(scene, { sun: [6, 10, 5] });
  const sunDir = new THREE.Vector3(6, 10, 5).normalize();
  renderer.localClippingEnabled = true;
  // Fit the one shadow-casting light to the size of the current demo.
  function aimLight(size, cx = 0) {
    sun.position.copy(sunDir).multiplyScalar(size * 2.5).add({ x: cx, y: 0, z: 0 });
    sun.target.position.set(cx, 0, 0);
    sun.target.updateMatrixWorld();
    Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 0.5, far: size * 6 });
    sun.shadow.camera.updateProjectionMatrix();
  }
  scene.add(sun.target);
  const waterMat = liquidMat(THREE, 0x3b9be0, 0.38);

  // ======================= Bricks on sand =======================
  const sandG = new THREE.Group();
  scene.add(sandG);
  const sandTex = paint(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = '#e8cf95'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = rand(i) > 0.5 ? '#d9bb78' : '#f3e0b0'; g.fillRect(rand(i + 7) * w, rand(i + 13) * h, 2, 2); }
  });
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(3, 2);
  kit.mesh(new THREE.BoxGeometry(6.4, SAND_Y, 4.4), kit.mat(0xffffff, { map: sandTex, roughness: 1 }), [0, SAND_Y / 2, 0], sandG).castShadow = false;
  const frameMat = kit.mat(0x9c6b3e);
  for (const [x, z, w, d] of [[0, 2.3, 6.8, 0.2], [0, -2.3, 6.8, 0.2], [3.3, 0, 0.2, 4.4], [-3.3, 0, 0.2, 4.4]]) kit.mesh(new THREE.BoxGeometry(w, SAND_Y + 0.15, d), frameMat, [x, (SAND_Y + 0.15) / 2, z], sandG);
  const brickTex = paint(THREE, 128, 64, (g, w, h) => {
    g.fillStyle = '#b5482f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.fillStyle = rand(i + 50) > 0.5 ? '#9e3c27' : '#c95a3e'; g.fillRect(rand(i + 3) * w, rand(i + 9) * h, 3, 3); }
    g.strokeStyle = '#6e2617'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  });
  const brickGeo = new THREE.BoxGeometry(2, 0.5, 1);
  const bricks = [0, 1, 2].map(() => kit.mesh(brickGeo, kit.mat(0xffffff, { map: brickTex, roughness: 0.9 }), [0, 0, 0], sandG));
  const faceQ = FACES.map(f => new THREE.Quaternion().setFromEuler(new THREE.Euler(...f.rot)));
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffd60a, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  patch.rotation.x = -Math.PI / 2;
  patch.renderOrder = 1;
  sandG.add(patch);
  const forceArrow = makeArrow(THREE, 0xe63946, { radius: 0.07, head: 0.35 });
  sandG.add(forceArrow);
  const forceTag = label('', forceArrow.tip, { cls: 'warm' });
  const areaAnchor = new THREE.Object3D();
  sandG.add(areaAnchor);
  const areaTag = label('', areaAnchor);
  const qTmp = new THREE.Quaternion();

  // ======================= Person on snow =======================
  const snowG = new THREE.Group();
  scene.add(snowG);
  const snowMat = kit.mat(0xf7fbff, { roughness: 1 });
  const slab = kit.mesh(new THREE.BoxGeometry(18, 6, 12), snowMat, [0, -2.97, 0], snowG);
  slab.castShadow = false;
  const person = new THREE.Group();
  snowG.add(person);
  const jacket = kit.mat(0x2a9d8f), trousers = kit.mat(0x34495e), skin = kit.mat(0xe0ac85), boot = kit.mat(0x5a3a22);
  kit.mesh(new THREE.CylinderGeometry(1.6, 1.4, 5.6, 16), jacket, [0, 11.9, 0], person);
  kit.mesh(new THREE.SphereGeometry(1.15, 20, 14), skin, [0, 15.9, 0], person);
  kit.mesh(new THREE.SphereGeometry(1.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0xe63946), [0, 16.15, 0], person);
  for (const s of [-1, 1]) {
    const arm = kit.mesh(new THREE.CylinderGeometry(0.45, 0.4, 5.6, 10), jacket, [s * 2.0, 11.6, 0], person);
    arm.rotation.z = s * 0.12;
  }
  const legs = [-1, 1].map(s => {
    const hip = new THREE.Group();
    hip.position.set(s * 0.8, 9.2, 0);
    person.add(hip);
    kit.mesh(new THREE.CylinderGeometry(0.62, 0.55, 8.4, 12), trousers, [0, -4.4, 0], hip);
    kit.mesh(new THREE.BoxGeometry(1.1, 0.9, 2.8), boot, [0, -8.75, 0.5], hip);
    const shoe = new THREE.Group();
    shoe.position.set(0, -9.05, 0.4);
    hip.add(shoe);
    const ring = kit.mesh(new THREE.TorusGeometry(1, 0.16, 6, 28), kit.mat(0x1d3557), [0, 0, 0], shoe);
    ring.rotation.x = Math.PI / 2; ring.scale.set(1.45, 3.3, 1);
    const net = kit.mesh(new THREE.CircleGeometry(1, 28), kit.mat(0xa8dadc, { side: THREE.DoubleSide }), [0, 0.02, 0], shoe);
    net.rotation.x = -Math.PI / 2; net.scale.set(1.4, 3.25, 1);
    return { hip, shoe };
  });
  const snowTag = label('', new THREE.Vector3(0, 0.2, 4.5), { cls: 'cool' });
  const holeMat = new THREE.MeshBasicMaterial({ color: 0xb7c7d6 });
  const holes = [-1, 1].map(s => { const h = new THREE.Mesh(new THREE.CircleGeometry(1, 20), holeMat); h.rotation.x = -Math.PI / 2; h.position.set(s * 0.8, 0.045, 0.4); snowG.add(h); return h; });

  // ======================= Tank with holes =======================
  const tankG = new THREE.Group();
  scene.add(tankG);
  const wood = kit.mat(0x9c6b3e);
  kit.mesh(new THREE.BoxGeometry(6, 0.4, 4.6), wood, [-0.4, TABLE - 0.2, 0], tankG);
  for (const [x, z] of [[-3, 2], [-3, -2], [2.2, 2], [2.2, -2]]) kit.mesh(new THREE.CylinderGeometry(0.18, 0.18, TABLE - 0.4, 8), wood, [x, (TABLE - 0.4) / 2, z], tankG);
  const tank = glassBox(THREE, kit, 4, 7.4, 3);
  tank.position.y = TABLE;
  tankG.add(tank);
  const tankWater = liquidBox(THREE, waterMat, 3.94, 2.94);
  tankWater.position.y = TANK_FLOOR;
  tankWater.setLevel(6);
  tankG.add(tankWater);
  // Tap that keeps the tank topped up.
  const steel = kit.mat(0x9aa3ad, { metalness: 0.5, roughness: 0.35 });
  const tapPipe = kit.mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.4, 10), steel, [-2.6, TABLE + 8.6, -0.6], tankG);
  tapPipe.rotation.z = Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 10), steel, [-1.4, TABLE + 8.3, -0.6], tankG);
  const tapStream = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 8), liquidMat(THREE, 0x3b9be0, 0.6));
  tapStream.position.set(-1.4, (TABLE + 8.0 + WATER_TOP) / 2, -0.6);
  tapStream.scale.y = TABLE + 8.0 - WATER_TOP;
  tankG.add(tapStream);
  // Floor tray that catches the jets.
  kit.mesh(new THREE.BoxGeometry(15, 0.3, 3.4), kit.mat(0x6c7a89), [9.8, 0.15, 0], tankG).castShadow = false;
  const trayWater = liquidBox(THREE, waterMat, 14.6, 3.0);
  trayWater.position.set(9.8, 0.1, 0); trayWater.setLevel(0.22);
  tankG.add(trayWater);
  // Jets: a faint stream along each parabola and droplets running along it.
  const jets = HOLES.map((depth, j) => {
    const y0 = WATER_TOP - depth * 10, v = Math.sqrt(2 * GU * depth * 10), T = Math.sqrt((2 * (y0 - LAND)) / GU);
    const pts = [];
    for (let i = 0; i <= 24; i++) { const tt = (i / 24) * T; pts.push(new THREE.Vector3(2.02 + v * tt, y0 - 0.5 * GU * tt * tt, 0)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.07, 6), liquidMat(THREE, 0x5aaef0, 0.55));
    tankG.add(tube);
    const hole = kit.mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 14), kit.mat(0x1d3557), [2.01, y0, 0], tankG);
    hole.rotation.y = Math.PI / 2;
    const tt = 0.32 * T;
    const tag = label(`${depth} m deep`, new THREE.Vector3(2.4 + v * tt, y0 - 0.5 * GU * tt * tt + 0.2, 0));
    return { depth, y0, v, T, tag, range: v * T };
  });
  const dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2f8fdc, roughness: 0.2 }), HOLES.length * DROPS);
  dropMesh.frustumCulled = false;
  tankG.add(dropMesh);
  const m4 = new THREE.Matrix4();
  // Depth sensor on a rod.
  const sensor = new THREE.Group();
  tankG.add(sensor);
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 8), steel, [0, 2, 0], sensor);
  kit.mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.16, 18), kit.mat(0xffb703), [0, 0, 0], sensor);
  const sensorTag = label('', sensor, { cls: 'cool' });

  // ======================= Connected vessels =======================
  const vesG = new THREE.Group();
  scene.add(vesG);
  kit.mesh(new THREE.BoxGeometry(11.2, 0.6, 2.6), kit.mat(0x6c7a89), [0, 0.3, 0], vesG);
  const pipeWater = liquidMat(THREE, 0x3b9be0, 0.55);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 9.4, 12), pipeWater);
  pipe.rotation.z = Math.PI / 2; pipe.position.set(0, 0.9, 0);
  vesG.add(pipe);
  const pipeGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 9.6, 12, 1, true), glassMat(THREE, 0.3));
  pipeGlass.rotation.z = Math.PI / 2; pipeGlass.position.set(0, 0.9, 0); pipeGlass.renderOrder = 2;
  vesG.add(pipeGlass);
  const capGeo = new THREE.CircleGeometry(1, 32);
  const vessels = VESSELS.map(vd => {
    const g = new THREE.Group();
    g.position.x = vd.x;
    vesG.add(g);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(vd.rt, vd.rb, V_H, 32, 1, true), glassMat(THREE, 0.2));
    wall.position.y = V_BOT + V_H / 2; wall.renderOrder = 2;
    g.add(wall);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x7fb2cc });
    const top = new THREE.Mesh(new THREE.TorusGeometry(vd.rt, 0.03, 4, 32), lineMat);
    top.rotation.x = Math.PI / 2; top.position.y = V_BOT + V_H;
    const bot = new THREE.Mesh(new THREE.TorusGeometry(vd.rb, 0.03, 4, 32), lineMat);
    bot.rotation.x = Math.PI / 2; bot.position.y = V_BOT;
    g.add(top, bot);
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 10), pipeWater);
    stub.position.y = 1.03;
    g.add(stub);
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), V_BOT + 2);
    const mat = liquidMat(THREE, 0x3b9be0, 0.45);
    mat.clippingPlanes = [plane];
    const water = new THREE.Mesh(new THREE.CylinderGeometry(vd.rt * 0.95, vd.rb * 0.95, V_H, 32), mat);
    water.position.y = V_BOT + V_H / 2; water.renderOrder = 1;
    const cap = new THREE.Mesh(capGeo, liquidMat(THREE, 0x3b9be0, 0.45));
    cap.rotation.x = -Math.PI / 2; cap.renderOrder = 1;
    g.add(water, cap);
    return { ...vd, plane, cap, level: 2 };
  });
  const levelLine = kit.mesh(new THREE.BoxGeometry(11, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xe63946 }), [0, 0, 0], vesG);
  levelLine.castShadow = false;
  function setVessel(v, h) {
    v.level = h;
    const y = V_BOT + h;
    v.plane.constant = y;
    v.cap.position.y = y;
    v.cap.scale.setScalar((v.rb + (v.rt - v.rb) * (h / V_H)) * 0.95);
  }

  // ======================= Upturned glass =======================
  const airG = new THREE.Group();
  scene.add(airG);
  const TABLE2 = 0.8;
  kit.mesh(new THREE.BoxGeometry(3.4, 0.1, 2.2), wood, [0, TABLE2 - 0.05, 0], airG);
  for (const [x, z] of [[-1.5, 0.9], [-1.5, -0.9], [1.5, 0.9], [1.5, -0.9]]) kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, TABLE2 - 0.1, 6), wood, [x, (TABLE2 - 0.1) / 2, z], airG);
  const cup = new THREE.Group();               // pivot at the middle of the glass
  airG.add(cup);
  const cupGlass = glassTube(THREE, kit, 0.4, 0.8, { thick: 0.03 });
  cupGlass.position.y = -0.4;
  cup.add(cupGlass);
  const cupWater = liquidColumn(THREE, liquidMat(THREE, 0x3b9be0, 0.5), 0.385);
  cupWater.position.y = -0.37; cupWater.setLevel(0.765);
  cup.add(cupWater);
  const card = kit.mesh(new THREE.BoxGeometry(0.95, 0.012, 0.95), kit.mat(0xfff3c4), [0, 0.407, 0], cup);
  // A hand holds the glass from the side; the arm reaches in from the left.
  kit.mesh(new THREE.BoxGeometry(0.16, 0.42, 0.42), skin, [-0.5, 0, 0], cup);
  kit.mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), skin, [-0.38, 0.12, 0.25], cup);
  const arm = kit.mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.4, 10), kit.mat(0x457b9d), [0, 0, 0], airG);
  arm.rotation.z = Math.PI / 2;
  const airArrow = makeArrow(THREE, 0x1d6fd8, { radius: 0.05, head: 0.22 });
  const cupWeight = makeArrow(THREE, 0xe63946, { radius: 0.04, head: 0.14 });
  airG.add(airArrow, cupWeight);
  const airTag = label('Air pushes up: about 500 N', airArrow.tip, { cls: 'cool' });
  const cupTag = label('Water: about 4 N', cupWeight.tip, { cls: 'warm' });

  // ======================= Crushed can =======================
  const canG = new THREE.Group();
  scene.add(canG);
  kit.mesh(new THREE.BoxGeometry(1.3, 0.45, 1.3), kit.mat(0x2b2d42), [0, 0.225, 0], canG);
  kit.mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 20), steel, [0, 0.47, 0], canG).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) kit.mesh(new THREE.BoxGeometry(0.06, 0.06, 1.1), steel, [s * 0.35, 0.86, 0], canG);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 14), new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.85 }));
  flame.position.set(0, 0.66, 0);
  canG.add(flame);
  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.25, 12), new THREE.MeshBasicMaterial({ color: 0x4dabf7 }));
  flameCore.position.set(0, 0.6, 0);
  canG.add(flameCore);
  const BOWL_X = 2.4, BOWL_W = 0.55;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.75, 0.7, 32, 1, true), glassMat(THREE, 0.3));
  bowl.position.set(BOWL_X, 0.35, 0); bowl.renderOrder = 2;
  canG.add(bowl);
  kit.mesh(new THREE.TorusGeometry(1.0, 0.03, 4, 32), new THREE.MeshBasicMaterial({ color: 0x7fb2cc }), [BOWL_X, 0.7, 0], canG).rotation.x = Math.PI / 2;
  const bowlWater = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.75, BOWL_W, 32), liquidMat(THREE, 0x56a8e8, 0.5));
  bowlWater.position.set(BOWL_X, BOWL_W / 2 + 0.01, 0); bowlWater.renderOrder = 1;
  canG.add(bowlWater);
  for (let i = 0; i < 3; i++) kit.mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), kit.mat(0xe7f5ff, { transparent: true, opacity: 0.85 }), [BOWL_X - 0.5 + i * 0.45, BOWL_W, 0.45 - i * 0.3], canG).rotation.y = i;
  const canTex = paint(THREE, 256, 128, (g, w, h) => {
    g.fillStyle = '#d62839'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.fillRect(0, h * 0.42, w, h * 0.16);
    g.fillStyle = '#c8ced6'; g.fillRect(0, 0, w, h * 0.06); g.fillRect(0, h * 0.94, w, h * 0.06);
  });
  const canGeo = new THREE.CylinderGeometry(0.33, 0.33, 1.2, 24, 8);
  const canBase = Float32Array.from(canGeo.attributes.position.array);
  const can = new THREE.Group();
  canG.add(can);
  kit.mesh(canGeo, kit.mat(0xffffff, { map: canTex, metalness: 0.3, roughness: 0.4, flatShading: true }), [0, 0, 0], can);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  hole.rotation.x = -Math.PI / 2; hole.position.set(0.12, 0.602, 0); hole.scale.set(1, 0.6, 1);
  can.add(hole);
  const steam = [];
  const steamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false });
  for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), steamMat); s.visible = false; canG.add(s); steam.push(s); }
  const coldTag = label('Cold water', new THREE.Vector3(BOWL_X + 0.6, 0.75, 0.6), { cls: 'cool' });
  const steamTag = label('Steam', new THREE.Vector3(0.12, 2.2, 0));
  function crushCan(c) {
    const p = canGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = canBase[i], y = canBase[i + 1], z = canBase[i + 2];
      const th = Math.atan2(z, x), mid = 1 - Math.pow(y / 0.6, 2) * 0.7;
      const s = 1 - c * mid * (0.42 + 0.22 * Math.sin(3 * th + 2.1 + y * 3));
      p[i] = x * s; p[i + 1] = y * (1 - 0.12 * c); p[i + 2] = z * s;
    }
    canGeo.attributes.position.needsUpdate = true;
  }

  // ======================= State =======================
  const st = {
    step: 0, quiz: false, time: 0, plan: [],
    face: 0, faceFrom: 0, n: 1, k: 1,          // bricks
    feet: 0, sink: 0, sinkTo: 0, lift: 0, liftTo: 0, shoes: 0, // snow
    depth: 0.3,                                  // tank sensor (m)
    vLevel: 0.2,                                  // vessels (m)
    flip: 0, flipTo: 0,                           // glass
    heat: false, heatT: 0, dunk: 0, dunkTo: 0, crush: 0, crushed: false, // can
    msg: '',
  };
  const groups = [sandG, sandG, snowG, tankG, vesG, airG, canG];

  // ---- bricks ----
  const brickP = () => (st.n * BRICK_N) / FACES[st.face].S;
  function setFace(i) {
    if (i === st.face && st.k >= 1) { brickReadout(); return; }
    st.faceFrom = st.face; st.face = i; st.k = 0;
    brickReadout();
  }
  function setBricks(n) { st.n = n; brickReadout(); }
  function brickReadout() {
    const f = FACES[st.face], F = st.n * BRICK_N;
    ui.readout(`F = <b>${F} N</b> · S = <b>${f.S} m²</b><br>p = F / S = ${F} N ÷ ${f.S} m² = <b>${comma(F / f.S)} Pa</b>`);
    forceTag.text = `F = ${F} N`;
    areaTag.text = `S = ${f.S} m²`;
  }
  const sinkFor = (p) => (p / 12000) * 0.8;
  function placeBricks(dt) {
    let busy = false;
    if (st.k < 1) { st.k = Math.min(1, st.k + dt / 1.1); busy = true; }
    const e = kit.ease(st.k), a = FACES[st.faceFrom], b = FACES[st.face];
    const h = kit.lerp(a.h, b.h, e), lift = Math.sin(Math.PI * st.k) * 1.4;
    const sink = kit.lerp(sinkFor((st.n * BRICK_N) / a.S), sinkFor(brickP()), e);
    qTmp.slerpQuaternions(faceQ[st.faceFrom], faceQ[st.face], e);
    const base = SAND_Y - sink + lift;
    bricks.forEach((br, i) => {
      br.visible = i < st.n;
      br.quaternion.copy(qTmp);
      br.position.set(0, base + h * (i + 0.5) + 0.03 * i, 0);
    });
    patch.visible = st.k > 0.9;
    patch.scale.set(b.fx + 0.14, b.fz + 0.14, 1);
    patch.position.set(0, SAND_Y + 0.005, 0);
    const len = 0.6 + st.n * 0.6;
    forceArrow.point(Math.max(a.fx, b.fx) / 2 + 0.7, SAND_Y + len, 0.3, 0, -1, 0, len, 0.25);
    forceTag.show(st.k > 0.9);
    areaAnchor.position.set(-0.4, SAND_Y + 0.02, b.fz / 2 + 0.9);
    areaTag.show(st.k > 0.9);
    return busy;
  }

  // ---- snow ----
  function setFeet(i) {
    st.feet = i;
    const p = PERSON_N / FEET[i].S;
    st.sinkTo = 4.6 * Math.pow(p / 20000, 1.6);
    st.liftTo = i === 1 ? 1 : 0;
    snowTag.text = `${comma(p)} Pa`;
    ui.readout(`${FEET[i].name}: p = F / S = ${PERSON_N} N ÷ ${FEET[i].S} m² = <b>${comma(p)} Pa</b>`);
  }

  // ---- tank ----
  function setDepth(d) {
    st.depth = d;
    const p = D_WATER * d;
    sensor.position.set(-1.0, WATER_TOP - d * 10, 0.6);
    sensorTag.text = `${comma(p)} Pa`;
    ui.readout(`Depth h = <b>${fmt(d, 2)} m</b><br>p = d · h = 9800 N/m³ × ${fmt(d, 2)} m = <b>${comma(p)} Pa</b><br>(same as ρ · g · h = 1000 × 9.8 × ${fmt(d, 2)})`);
  }

  // ---- vessels ----
  function setLevel(h, pour) {
    const old = st.vLevel;
    st.vLevel = h;
    if (pour) setVessel(vessels[0], kit.clamp(vessels[0].level + (h - old) * 10 * 2.5, 0.3, V_H - 0.1));
    levelLine.position.y = V_BOT + h * 10;
    ui.readout(`Depth of water h = <b>${fmt(h, 2)} m</b> in every glass<br>Pressure at each bottom: p = d · h = 9800 × ${fmt(h, 2)} = <b>${comma(D_WATER * h)} Pa</b>`);
  }

  // ---- glass ----
  function placeCup() {
    const e = kit.ease(st.flip);
    cup.position.set(0, kit.lerp(TABLE2 + 0.4, 2.25, Math.sin(Math.min(1, st.flip * 1.6) * Math.PI / 2)), 0);
    arm.position.set(-1.78, cup.position.y, 0);
    cup.rotation.x = Math.PI * e;
    const done = st.flip > 0.98;
    const cardY = cup.position.y - 0.42;
    airArrow.point(0, cardY - 0.98, 0.05, 0, 1, 0, 0.95, 0.0);
    cupWeight.point(0.75, cup.position.y + 0.2, 0, 0, -1, 0, 0.35, 0.0);
    airArrow.visible = cupWeight.visible = done;
    airTag.show(done); cupTag.show(done);
  }

  // ---- can ----
  function canReadout() {
    let msg;
    if (st.crushed) msg = 'Inside: the steam turned back into water, so the pressure is <b>far below</b> the outside.<br>Outside: air at about <b>101,000 Pa</b> crushes the can.';
    else if (st.dunk > 0.99 && !st.heat) msg = 'The can was not heated, so it is still full of air at about 101,000 Pa. Inside and outside balance: <b>nothing happens</b>.';
    else if (st.heat) msg = 'Inside: hot steam at about <b>101,000 Pa</b>, the same as the air outside, so the can keeps its shape.';
    else msg = 'Inside and outside: air at about <b>101,000 Pa</b>. The pushes balance.';
    if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
  }
  function resetCan() { st.heat = false; st.heatT = 0; st.dunk = st.dunkTo = 0; st.crush = 0; st.crushed = false; crushCan(0); st.msg = ''; }
  function placeCan() {
    const u = kit.ease(st.dunk);
    // From the stove, up and over, upside down into the bowl.
    const x = kit.lerp(0, BOWL_X, u), y = kit.lerp(1.5, BOWL_W + 0.42, u) + Math.sin(Math.PI * u) * 1.4;
    can.position.set(x, y, 0);
    can.rotation.z = Math.PI * u;
  }

  function hideAll() {
    for (const g of [sandG, snowG, tankG, vesG, airG, canG]) g.visible = false;
    for (const t of [forceTag, areaTag, snowTag, sensorTag, airTag, cupTag, coldTag, steamTag, ...jets.map(j => j.tag)]) t.show(false);
  }

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? 7 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.msg = '';
      hideAll();
      const g = isQuiz ? vesG : groups[i];
      g.visible = true;
      ground.material.color.setHex(i === 2 && !isQuiz ? 0xf2f7fb : 0xd5e3c9);
      if (i === 0 || i === 1) {
        aimLight(6);
        st.n = 1; st.face = st.faceFrom = 0; st.k = 1;
        const row = ui.buttons(FACES.map((f, j) => ({ label: f.name, on: j === 0, onClick: () => { st.plan = []; setFace(j); } })));
        if (i === 0) {
          view({ radius: 3.0, yaw: 0.5, pitch: 0.42, target: [0.3, 1.4, 0] });
          st.plan = [[0.5, () => { row.select(2); setFace(2); }], [4.5, () => { row.select(1); setFace(1); }], [8.5, () => { row.select(0); setFace(0); }]];
        } else {
          view({ radius: 4.2, yaw: 0.5, pitch: 0.32, target: [0.3, 3.0, 0] });
          const sl = ui.slider({ label: 'Bricks', min: 1, max: 3, step: 1, value: 1, onInput: v => { st.plan = []; setBricks(v); } });
          st.face = st.faceFrom = 2;
          row.select(2);
          st.plan = [[0.4, () => { setBricks(2); sl.set(2); }], [1.2, () => { setBricks(3); sl.set(3); }]];
        }
        brickReadout();
      }
      if (i === 2) {
        aimLight(12);
        view({ radius: 9.5, yaw: 0.55, pitch: 0.22, target: [0, 7.5, 0] });
        snowTag.show(true);
        setFeet(0);
        st.sink = st.sinkTo; st.lift = st.liftTo;
        const row = ui.buttons(FEET.map((f, j) => ({ label: f.name, on: j === 0, onClick: () => { st.plan = []; setFeet(j); } })));
        st.plan = [[0.6, () => { row.select(1); setFeet(1); }], [4.5, () => { row.select(2); setFeet(2); }], [8.5, () => { row.select(0); setFeet(0); }]];
      }
      if (i === 3) {
        aimLight(20, 7);
        view({ radius: 9.6, width: 9.8, yaw: 0.25, pitch: 0.12, target: [7.2, 8.6, 0] });
        jets.forEach(j => j.tag.show(true));
        sensorTag.show(true);
        setDepth(0.1);
        const sl = ui.slider({ label: 'Depth', min: 0, max: 0.6, step: 0.05, value: 0.1, unit: ' m', format: v => fmt(v, 2), onInput: v => { st.plan = []; setDepth(v); } });
        st.plan = [[0.8, () => { setDepth(0.3); sl.set(0.3); }], [1.8, () => { setDepth(0.5); sl.set(0.5); }]];
      }
      if (isQuiz) {
        aimLight(8);
        view({ radius: 3.8, width: 6.2, yaw: -0.3, pitch: 0.3, target: [0, 3.2, 0] });
        st.vLevel = 0.3;
        vessels.forEach(v => setVessel(v, 3));
        levelLine.position.y = V_BOT + 3;
      }
      if (i === 4) {
        aimLight(8);
        view({ radius: 3.6, width: 6.0, yaw: 0.2, pitch: 0.25, target: [0, 3.4, 0] });
        st.vLevel = 0.15;
        vessels.forEach(v => setVessel(v, 1.5));
        setLevel(0.15, false);
        const sl = ui.slider({ label: 'Water level', min: 0.1, max: 0.45, step: 0.05, value: 0.15, unit: ' m', format: v => fmt(v, 2), onInput: v => { st.plan = []; setLevel(v, true); } });
        st.plan = [[0.5, () => { setLevel(0.2, true); sl.set(0.2); }]];
      }
      if (i === 5) {
        aimLight(4);
        view({ radius: 1.75, yaw: 0.35, pitch: 0.2, target: [-0.1, 1.55, 0] });
        st.flip = st.flipTo = 0;
        ui.buttons([{ label: 'Turn the glass over', onClick: () => { st.plan = []; st.flipTo = 1; } }, { label: 'Start again', onClick: () => { st.plan = []; st.flip = st.flipTo = 0; } }]);
        ui.readout('Air pressure: about <b>101,000 Pa</b><br>Card area: about 0.005 m², so the air pushes up with F = p × S ≈ <b>500 N</b>');
        st.plan = [[0.4, () => { st.flipTo = 1; }]];
      }
      if (i === 6) {
        aimLight(4, 1);
        view({ radius: 1.9, width: 1.9, yaw: 0.25, pitch: 0.25, target: [1.2, 1.25, 0] });
        resetCan();
        coldTag.show(true);
        ui.buttons([{ label: 'Heat the can', onClick: () => { st.plan = []; if (st.dunk === 0) st.heat = true; } },
          { label: 'Turn it into cold water', onClick: () => { st.plan = []; st.dunkTo = 1; } },
          { label: 'New can', onClick: () => { st.plan = []; resetCan(); } }]);
        st.plan = [[0.2, () => { st.heat = true; }], [1.2, () => { st.dunkTo = 1; }]];
      }
    },

    update(dt, t) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      let busy = st.plan.length > 0;

      if (sandG.visible) busy = placeBricks(dt) || busy;

      if (snowG.visible) {
        busy = kit.follow(st, 'sink', st.sinkTo, dt, 3) || busy;
        busy = kit.follow(st, 'lift', st.liftTo, dt, 4) || busy;
        busy = kit.follow(st, 'shoes', st.feet === 2 ? 1 : 0, dt, 8) || busy;
        // On one boot the right leg carries everything, so the person sinks on that side.
        person.position.y = -st.sink;
        legs[0].hip.rotation.x = -1.25 * st.lift;
        // Dark hollows in the snow where the legs go in (not on snowshoes).
        holes.forEach((hl, j) => { const on = st.sink > 0.4 && !(j === 0 && st.lift > 0.5); hl.visible = on; hl.scale.setScalar(0.9 + st.sink * 0.12); });
        for (const l of legs) { l.shoe.visible = st.shoes > 0.02; l.shoe.scale.setScalar(Math.max(0.02, st.shoes)); }
      }

      if (tankG.visible) {
        // Droplets run along each jet's parabola.
        let n = 0;
        jets.forEach((j, ji) => {
          for (let i = 0; i < DROPS; i++) {
            const s = (t / j.T + i / DROPS + ji * 0.13) % 1, tt = s * j.T;
            m4.makeTranslation(2.02 + j.v * tt, j.y0 - 0.5 * GU * tt * tt, Math.sin(i * 1.7) * 0.03);
            dropMesh.setMatrixAt(n++, m4);
          }
        });
        dropMesh.instanceMatrix.needsUpdate = true;
        tapStream.scale.x = tapStream.scale.z = 1 + Math.sin(t * 30) * 0.08;
        busy = true;
      }

      if (vesG.visible) {
        vessels.forEach((v, i) => {
          if (kit.follow(v, 'level', st.vLevel * 10, dt, i === 0 ? 2.2 : 1.6)) busy = true;
          setVessel(v, v.level);
        });
      }

      if (airG.visible) {
        const d = st.flipTo - st.flip;
        if (Math.abs(d) > 1e-4) { st.flip += Math.sign(d) * Math.min(Math.abs(d), dt / 1.6); busy = true; } else st.flip = st.flipTo;
        placeCup();
      }

      if (canG.visible) {
        const fire = st.heat && st.dunk === 0;
        flame.visible = flameCore.visible = fire;
        if (fire) { st.heatT += dt; flame.scale.set(1, 1 + Math.sin(t * 23) * 0.12 + Math.sin(t * 37) * 0.06, 1); busy = true; }
        // Steam puffs rise from the opening while the can is hot and upright.
        const puffing = st.heat && st.heatT > 0.6 && st.dunk < 0.05;
        steamTag.show(puffing);
        steam.forEach((s, i) => {
          s.visible = puffing;
          if (!puffing) return;
          const ph = (t * 0.7 + i / steam.length) % 1;
          s.position.set(0.12 + Math.sin(i * 2.3 + ph * 3) * 0.12 * ph, 2.15 + ph * 1.1, Math.cos(i * 1.9) * 0.1 * ph);
          s.scale.setScalar(0.6 + ph * 1.6);
        });
        const d = st.dunkTo - st.dunk;
        if (Math.abs(d) > 1e-4) { st.dunk += Math.sign(d) * Math.min(Math.abs(d), dt / 1.4); busy = true; } else st.dunk = st.dunkTo;
        if (st.dunk >= 1 && st.heat && st.crush < 1) { st.crush = Math.min(1, st.crush + dt / 0.22); crushCan(st.crush); busy = true; if (st.crush >= 1) st.crushed = true; }
        placeCan();
        canReadout();
      }
      return busy;
    },
  };
}
