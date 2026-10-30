// The water cycle and the Sun's energy: a cut-away landscape (sea, plain with trees, a snowy mountain)
// with the cycle drawn as flowing dots: evaporation, transpiration, condensation, precipitation, runoff,
// infiltration and groundwater. Extra pieces: a box of water molecules for changes of state, a rising
// air parcel (cools 6.5 °C per km, cloud at the dew point), drop size vs rain, paving vs runoff, and
// residence times of each store.
import { rand, makeSun } from '../_shared/sky.js';
import { makeCloud, makeRain, makeFlow, makeArrowPath } from '../_shared/atmos.js';
import { arrow } from '../_shared/geo.js';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Ground height: sea floor (x < -3.6), shore near x = -1.6, plain, mountain peak at x = 5.
function H(x, z) {
  const ridge = 1 - 0.22 * (z / 3) ** 2;
  return -1.3 + 1.45 * smooth(-3.6, -1.2, x) + 0.2 * smooth(-1, 2, x)
    + 2.9 * Math.exp(-(((x - 5) / 1.5) ** 2)) * ridge + 0.06 * Math.sin(x * 1.7 + z * 2.1) * smooth(-1.5, 0, x);
}
const waterTable = s => 0.4 * s - 0.45; // top of the groundwater under land with surface height s
const BOTTOM = -2.6, FRONT = 3, X0 = -7, X1 = 7;

// Changes of state: [from, to, energy per gram, taken in?]
const CHANGES = {
  melt: { name: 'Melting', from: 0, to: 1, J: 334, inn: true, what: 'solid ice → liquid water' },
  evap: { name: 'Evaporation', from: 1, to: 2, J: 2260, inn: true, what: 'liquid water → water vapour (gas)' },
  cond: { name: 'Condensation', from: 2, to: 1, J: 2260, inn: false, what: 'water vapour (gas) → liquid water' },
  freeze: { name: 'Freezing', from: 1, to: 0, J: 334, inn: false, what: 'liquid water → solid ice' },
};
const STATE_NAMES = ['Ice (solid)', 'Water (liquid)', 'Vapour (gas)'];
// Paving vs where rain goes (rounded US EPA figures): runoff, soaks in, back to the air (%).
const GROUNDS = [
  { name: 'Natural ground', run: 10, soak: 50, air: 40, paved: 0 },
  { name: 'About half paved', run: 30, soak: 35, air: 35, paved: 0.5 },
  { name: 'City', run: 55, soak: 15, air: 30, paved: 1 },
];
// Rough residence times (textbook averages).
const STORES = [
  { name: 'Atmosphere', time: 'about 9 days' },
  { name: 'Rivers', time: 'about 2 to 6 months' },
  { name: 'Soil water', time: 'about 1 to 2 months' },
  { name: 'Snow and glaciers', time: 'about 2 to 6 months for seasonal snow, about 20 to 100 years in a mountain glacier' },
  { name: 'Groundwater', time: 'about 100 to 200 years near the surface, up to about 10,000 years deep down' },
  { name: 'Ocean', time: 'about 3,200 years' },
];
const DEW = 7, T0 = 20, LAPSE = 6.5, KM = 0.8; // parcel model; KM = scene units per km
const fmtJ = j => (j >= 1000 ? `${Math.round(j).toLocaleString('en-US')} J (${(j / 1000).toFixed(1)} kJ)` : `${Math.round(j)} J`);

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const sky = new THREE.Color(0xcfe9ff), dusk = new THREE.Color(0x4a5a78);
  scene.background = sky.clone();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8fa6b8, 1.5);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
  sunLight.position.set(-6, 10, 5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunLight.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 40 });
  scene.add(sunLight);

  // ---------- landscape ----------
  const land = new THREE.Group();
  scene.add(land);
  {
    const geo = new THREE.PlaneGeometry(X1 - X0, 6, 70, 18);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = H(x, z);
      p.setY(i, y);
      if (y < -0.05) c.set(0xcdb98a);
      else if (y < 0.12 && x < -0.8) c.set(0xe6d29a);
      else if (y < 1.5) c.set(0x6fae4f).lerp(new THREE.Color(0x5d9a43), rand(i) * 0.6);
      else if (y < 2.45) c.set(0x8d8579);
      else c.set(0xf4f7fb);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = kit.mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), [0, 0, 0], land);
    m.castShadow = false;
  }
  // Cut faces around the block: the front one is painted with soil, rock and groundwater layers.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b7660, roughness: 1 });
  function wall(top, a, b, material, rotY, pos) {
    const s = new THREE.Shape();
    s.moveTo(a, BOTTOM);
    for (let u = a; u <= b + 1e-6; u += 0.2) s.lineTo(u, top(u));
    s.lineTo(b, BOTTOM);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s, 1), material);
    m.rotation.y = rotY; m.position.set(...pos);
    m.receiveShadow = true;
    land.add(m);
    return m;
  }
  const cutTex = paintCut(THREE);
  cutTex.repeat.set(1 / (X1 - X0), 1 / (4.2 - BOTTOM));
  cutTex.offset.set(-X0 / (X1 - X0), -BOTTOM / (4.2 - BOTTOM));
  wall(u => H(u, FRONT), X0, X1, new THREE.MeshStandardMaterial({ map: cutTex, roughness: 1 }), 0, [0, 0, FRONT]);
  wall(u => H(X1, -u), -3, 3, wallMat, Math.PI / 2, [X1, 0, 0]);
  wall(u => H(X0, u), -3, 3, wallMat, -Math.PI / 2, [X0, 0, 0]);
  wall(u => H(-u, -3), -7, 7, wallMat, Math.PI, [0, 0, -3]);
  // Sea: a see-through block of water up to sea level (y = 0).
  const sea = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.27, 5.94), new THREE.MeshStandardMaterial({ color: 0x2f7fd6, transparent: true, opacity: 0.72, roughness: 0.3, depthWrite: false }));
  sea.position.set(-4.2, -0.635, -0.03); // just behind the cut face, so the two never overlap
  land.add(sea);

  // Trees on the plain (two front trees stand at the cut, so their roots show on the cut face).
  const TREES = [[0.3, 2.75], [1.5, 2.7], [-0.5, 2.2], [2.3, 1.9], [0.9, -0.6], [-0.2, -1.4], [1.8, -1.5], [0.4, -2.3]];
  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.4, 6), crownGeo = new THREE.ConeGeometry(0.3, 0.75, 8);
  const trunkMat = kit.mat(0x7a5232), crownMat = kit.mat(0x2f8f46);
  const trees = TREES.map(([x, z]) => {
    const g = new THREE.Group(), y = H(x, z);
    g.position.set(x, y, z);
    kit.mesh(trunkGeo, trunkMat, [0, 0.2, 0], g);
    kit.mesh(crownGeo, crownMat, [0, 0.72, 0], g);
    land.add(g);
    return g;
  });
  // Roots of the two front trees, painted on the cut face.
  const rootMat = new THREE.LineBasicMaterial({ color: 0x4a2f1a });
  for (const [x] of TREES.slice(0, 2)) {
    const s = H(x, FRONT), pts = [];
    for (const [dx, dy] of [[0, 0], [0, -0.35], [0, -0.2], [-0.18, -0.4], [0, -0.2], [0.18, -0.42]]) pts.push(new THREE.Vector3(x + dx, s + dy, FRONT + 0.01));
    land.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), rootMat));
  }
  // A small town for the paving step: grey paving on the plain and box buildings.
  const town = new THREE.Group();
  land.add(town);
  const paveMat = kit.mat(0x9aa0a6, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const paves = [], houses = [];
  for (let i = 0; i < 6; i++) {
    const x = -0.9 + (i % 3) * 1.15, z = i < 3 ? 2.2 : -1.2;
    const geo = new THREE.PlaneGeometry(1.0, 1.6, 4, 6);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let j = 0; j < p.count; j++) p.setY(j, H(x + p.getX(j), z + p.getZ(j)) + 0.03);
    geo.computeVertexNormals();
    const m = kit.mesh(geo, paveMat, [x, 0, z], town);
    m.castShadow = false;
    paves.push(m);
    const hm = kit.mesh(new THREE.BoxGeometry(0.4, 0.3 + rand(i + 20) * 0.4, 0.4), kit.mat([0xe9d8c4, 0xd9a07a, 0xc8d3dc][i % 3]), [x + 0.2, 0, z - 0.3], town);
    hm.position.y = H(x + 0.2, z - 0.3) + hm.geometry.parameters.height / 2;
    houses.push(hm);
  }

  // ---------- Sun, clouds and the cycle ----------
  const sun = makeSun(THREE, 0.75);
  sun.position.set(-6.2, 6.4, -2.5);
  scene.add(sun);
  const beams = new THREE.Group();
  scene.add(beams);
  for (const [x, z] of [[-5.4, 1.2], [-4.2, 0.2], [-3.0, 1.6]]) {
    const a = makeArrowPath(THREE, [[-5.9, 5.9, -2.2], [x, 0.25, z]], { color: 0xffc83d, radius: 0.035, head: 0.25, opacity: 0.75 });
    beams.add(a);
  }
  const cloudA = makeCloud(THREE, { seed: 3, puffs: 7, size: 1.05 });
  cloudA.position.set(-2.8, 4.3, 0);
  scene.add(cloudA);
  const cloudB = makeCloud(THREE, { seed: 9, puffs: 8, size: 1.5 });
  cloudB.position.set(4.0, 4.7, 0.4);
  scene.add(cloudB);
  const transport = makeArrowPath(THREE, [[-1.3, 4.9, 0], [0.4, 5.25, 0.2], [2.0, 5.1, 0.3]], { color: 0xffffff, radius: 0.04, head: 0.28 });
  scene.add(transport);

  const VAPOUR = 0x8fd0ff, WATER = 0x1e6fd9;
  const evap = [[-5.6, 1.4], [-4.3, 0.4], [-3.1, 1.8]].map(([x, z], i) =>
    makeFlow(THREE, [[x, 0.04, z], [x + 0.2, 1.4, z], [x + 0.7, 2.9, z * 0.6], [-2.9 + i * 0.4, 3.9, 0]], { count: 12, color: VAPOUR, size: 0.08, speed: 0.9, seed: i * 17 }));
  const trans = TREES.map(([x, z], i) => {
    const y = H(x, z), front = i < 2;
    const pts = front
      ? [[x, H(x, FRONT) - 0.42, FRONT + 0.03], [x, H(x, FRONT) - 0.1, FRONT + 0.03], [x, y + 0.15, z], [x, y + 0.75, z], [x + 0.15, y + 1.5, z - 0.1], [x + 0.35, y + 2.5, z - 0.3]]
      : [[x, y + 0.1, z], [x, y + 0.75, z], [x + 0.15, y + 1.5, z - 0.1], [x + 0.35, y + 2.5, z - 0.3]];
    return makeFlow(THREE, pts, { count: 9, color: VAPOUR, size: 0.06, speed: 0.6, seed: 100 + i * 13 });
  });
  // River from the mountain to the sea, hugging the ground.
  const riverCtl = [[4.1, 0.3], [3.2, 0.9], [2.2, 0.8], [1.2, 0.4], [0.2, 1.1], [-0.9, 1.4], [-2.2, 1.5]];
  const riverPts = [];
  for (let i = 0; i < riverCtl.length - 1; i++) for (let k = 0; k < 3; k++) {
    const [ax, az] = riverCtl[i], [bx, bz] = riverCtl[i + 1], f = k / 3, x = ax + (bx - ax) * f, z = az + (bz - az) * f;
    riverPts.push([x, Math.max(0.02, H(x, z) + 0.05), z]);
  }
  riverPts.push([-2.2, 0.03, 1.5]);
  const riverBed = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPts.map(p => new THREE.Vector3(p[0], p[1] - 0.03, p[2]))), 60, 0.09, 5, false), kit.mat(0x3b8fe0, { roughness: 0.3 }));
  riverBed.scale.y = 1;
  land.add(riverBed);
  const runoff = makeFlow(THREE, riverPts, { count: 26, color: WATER, size: 0.065, speed: 1.0, seed: 300 });
  // Infiltration (down through the soil on the cut face) and groundwater flowing to the sea.
  const infil = [0.0, 0.8, 1.7].map((x, i) => {
    const s = H(x, FRONT);
    return makeFlow(THREE, [[x, s - 0.02, FRONT + 0.03], [x + 0.05, s - 0.5, FRONT + 0.03], [x + 0.1, waterTable(s) - 0.35, FRONT + 0.03]], { count: 8, color: WATER, size: 0.06, speed: 0.35, seed: 400 + i * 7 });
  });
  const gw = makeFlow(THREE, [[2.6, -1.05, FRONT + 0.03], [1.0, -1.15, FRONT + 0.03], [-0.6, -1.2, FRONT + 0.03], [-1.8, -1.0, FRONT + 0.03], [-2.4, -0.78, FRONT + 0.03]], { count: 16, color: 0x0b4fa8, size: 0.06, speed: 0.22, seed: 500 });
  // Rain and snow under cloud B.
  const rain = makeRain(THREE, { count: 160, w: 0.6, d: 0.7, top: 4.25, bottom: 0.6, speed: 6, seed: 11 });
  const snow = makeRain(THREE, { count: 90, w: 0.6, d: 0.7, top: 4.3, bottom: 2.7, color: 0xffffff, speed: 0.9, seed: 23, snow: true });
  snow.obj.position.set(5.0, 0, 0.4);
  scene.add(rain.obj, snow.obj);
  const flows = [...evap, ...trans, runoff, ...infil, gw];
  for (const f of flows) scene.add(f.obj);

  // Gravity arrow next to the rain.
  const gArrow = arrow(THREE, 0x7c3aed, { radius: 0.06, head: 0.3 });
  gArrow.rotation.z = Math.PI;
  gArrow.setLength(1.3);
  scene.add(gArrow);

  // ---------- molecules (changes of state) ----------
  const mol = new THREE.Group();
  mol.position.set(-4.4, 2.35, 1.6);
  scene.add(mol);
  mol.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.4, 1.4, 1.4)), new THREE.LineBasicMaterial({ color: 0x334155 })));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false }));
  mol.add(glass);
  const NM = 27;
  const oMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 12, 8), kit.mat(0xe63946), NM);
  const hMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.038, 10, 6), kit.mat(0xffffff), NM * 2);
  oMesh.frustumCulled = hMesh.frustumCulled = false;
  mol.add(oMesh, hMesh);
  const molArr = [[], [], []]; // solid, liquid, gas base positions
  for (let i = 0; i < NM; i++) {
    const ix = (i % 3) - 1, iy = Math.floor(i / 9) - 1, iz = (Math.floor(i / 3) % 3) - 1;
    molArr[0].push([ix * 0.2, iy * 0.2 - 0.42, iz * 0.2]);
    molArr[1].push([(rand(i * 3.1) - 0.5) * 1.05, -0.6 + rand(i * 5.3) * 0.28, (rand(i * 7.7) - 0.5) * 1.05]);
    molArr[2].push([rand(i * 2.9), rand(i * 4.3), rand(i * 6.1)]);
  }
  const energyArrow = arrow(THREE, 0xe63946, { radius: 0.06, head: 0.28 });
  energyArrow.setLength(0.9);
  mol.add(energyArrow);
  const mTmp = new THREE.Matrix4(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), qM = new THREE.Quaternion(), eM = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const H1 = new THREE.Vector3(0.048, 0.037, 0), H2 = new THREE.Vector3(-0.048, 0.037, 0), hv = new THREE.Vector3();
  const tri = v => { const f = ((v % 2) + 2) % 2; return f < 1 ? f : 2 - f; };
  function molPos(state, i, t, out) {
    if (state === 0) { const b = molArr[0][i]; return out.set(b[0] + 0.012 * Math.sin(t * 23 + i), b[1] + 0.012 * Math.sin(t * 19 + i * 2), b[2] + 0.012 * Math.sin(t * 29 + i * 3)); }
    if (state === 1) { const b = molArr[1][i]; return out.set(b[0] + 0.07 * Math.sin(t * 1.1 + i * 2.1), b[1] + 0.03 * Math.sin(t * 1.7 + i), b[2] + 0.07 * Math.cos(t * 0.9 + i * 1.3)); }
    const b = molArr[2][i], s = 0.4;
    return out.set((tri(b[0] * 2 + t * s * (0.6 + rand(i) * 0.8)) - 0.5) * 1.22, (tri(b[1] * 2 + t * s * (0.5 + rand(i + 50) * 0.8)) - 0.5) * 1.22, (tri(b[2] * 2 + t * s * (0.7 + rand(i + 90) * 0.6)) - 0.5) * 1.22);
  }
  function placeMolecules(t) {
    const a = Math.floor(Math.min(1.999, st.ms)), f = st.ms - a;
    for (let i = 0; i < NM; i++) {
      molPos(a, i, t, vA); molPos(a + 1, i, t, vB);
      vA.lerp(vB, f);
      const spin = st.ms < 0.5 ? 0 : Math.min(1, st.ms - 0.5);
      eM.set(i * 0.7 + spin * t * (1 + rand(i)) * 1.5, i * 1.3 + spin * t * 1.2, i * 0.4);
      qM.setFromEuler(eM);
      mTmp.compose(vA, qM, one); oMesh.setMatrixAt(i, mTmp);
      hv.copy(H1).applyQuaternion(qM).add(vA); mTmp.compose(hv, qM, one); hMesh.setMatrixAt(i * 2, mTmp);
      hv.copy(H2).applyQuaternion(qM).add(vA); mTmp.compose(hv, qM, one); hMesh.setMatrixAt(i * 2 + 1, mTmp);
    }
    oMesh.instanceMatrix.needsUpdate = hMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------- rising air parcel ----------
  const PX = 0.1, PZ = 1.9, G0 = H(PX, PZ) + 0.45;
  const pole = new THREE.Group();
  pole.position.set(PX - 1.0, H(PX - 1.0, PZ), PZ);
  scene.add(pole);
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 5 * KM + 0.5, 6), kit.mat(0x475569), [0, (5 * KM + 0.5) / 2, 0], pole);
  const tickAt = [];
  for (let k = 0; k <= 5; k++) {
    const m = kit.mesh(new THREE.BoxGeometry(0.22, 0.03, 0.03), kit.mat(0x475569), [0.08, G0 - pole.position.y + k * KM, 0], pole);
    tickAt.push(m);
  }
  const baseY = G0 + ((T0 - DEW) / LAPSE) * KM;
  const baseDisc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  baseDisc.rotation.x = -Math.PI / 2;
  baseDisc.position.set(PX, baseY, PZ);
  scene.add(baseDisc);
  const parcel = new THREE.Group();
  scene.add(parcel);
  const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xffb36b, transparent: true, opacity: 0.3, roughness: 0.4, depthWrite: false });
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), bubbleMat);
  parcel.add(bubble);
  const dustGeo = new THREE.SphereGeometry(0.022, 6, 4), dustMat = new THREE.MeshBasicMaterial({ color: 0x3b2f2a });
  const dropGeo = new THREE.SphereGeometry(0.055, 10, 8), dropMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const drops = [];
  for (let i = 0; i < 14; i++) {
    const v = new THREE.Vector3(rand(i * 3.7) - 0.5, rand(i * 5.1) - 0.5, rand(i * 8.3) - 0.5).normalize().multiplyScalar(0.08 + rand(i * 2.2) * 0.22);
    const d = new THREE.Mesh(dustGeo, dustMat); d.position.copy(v); parcel.add(d);
    const w = new THREE.Mesh(dropGeo, dropMat); w.position.copy(v); parcel.add(w);
    drops.push(w);
  }
  const parcelCloud = makeCloud(THREE, { seed: 41, puffs: 5, size: 0.42 });
  parcel.add(parcelCloud);

  // ---------- magnified drop and the store marker ----------
  const bigDrop = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: 0x5aa9ff, roughness: 0.2, transparent: true, opacity: 0.85 }));
  bigDrop.position.set(1.6, 4.7, 1.2);
  scene.add(bigDrop);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.38, depthWrite: false }));
  scene.add(marker);
  const STORE_AT = [
    [cloudA.position.x, cloudA.position.y, 0, 1.3],
    [1.2, H(1.2, 0.4) + 0.1, 0.4, 0.55],
    [0.9, H(0.9, FRONT) - 0.18, FRONT, 0.4],
    [5.0, 3.0, 0, 0.75],
    [0.6, -1.15, FRONT, 0.6],
    [-4.6, -0.3, 1.0, 1.4],
  ];

  // ---------- labels ----------
  const stateAt = new THREE.Object3D(); stateAt.position.set(0, 0.95, 0); mol.add(stateAt);
  const at = (x, y, z) => new THREE.Vector3(x, y, z);
  const L = {
    sun: label('Sun', at(-4.9, 6.9, -2.5), { cls: 'warm' }),
    energy: label("Sun's energy", at(-4.6, 3.1, -0.6), { cls: 'warm' }),
    evap: label('Evaporation', at(-5.2, 1.5, 1.6), { cls: 'cool' }),
    cond: label('Condensation', at(-2.8, 5.1, 0), { cls: 'cool' }),
    precip: label('Precipitation', at(3.0, 3.6, 0.6), { cls: 'cool' }),
    gravity: label('Gravity', at(2.0, 3.0, 0.9)),
    runoff: label('Runoff', at(1.2, H(1.2, 0.4) + 0.35, 0.4), { cls: 'cool' }),
    trans: label('Transpiration', at(0.6, 2.8, 2.6), { cls: 'cool' }),
    infil: label('Infiltration', at(0.8, -0.25, FRONT + 0.05)),
    gw: label('Groundwater', at(-0.8, -1.5, FRONT + 0.05), { cls: 'cool' }),
    state: label('', stateAt),
    energyArrow: label('', at(0, 0, 0)),
    parcel: label('', parcel),
    km0: label('0 km', at(PX - 1.35, G0, PZ)),
    km5: label('5 km', at(PX - 1.35, G0 + 5 * KM, PZ)),
    base: label('Dew point: 7 °C', at(PX + 1.25, baseY, PZ)),
    drop: label('Drop (magnified)', at(1.6, 5.3, 1.2)),
    store: label('', marker),
  };

  // ---------- state ----------
  const st = { step: 0, quiz: false, sun: 1, sunShown: 1, ms: 1, msTo: 1, change: 'evap', mass: 10, nTrees: 8, h: 0, hShown: 0,
    dropV: 0, ground: 0, paved: 0, pavedTo: 0, store: 0, t: 0, cbTo: new THREE.Vector3(4.0, 4.7, 0.4) };

  function setEnergyArrow(inn) {
    energyArrow.material.color.set(inn ? 0xe63946 : 0x2563eb);
    if (inn) { energyArrow.rotation.z = -Math.PI / 2; energyArrow.position.set(-1.75, 0, 0); }
    else { energyArrow.rotation.z = Math.PI / 2; energyArrow.position.set(-0.8, 0, 0); }
    L.energyArrow.text = inn ? 'Energy in' : 'Energy out';
    L.energyArrow.el.className = 'lab ' + (inn ? 'warm' : 'cool');
    mol.updateMatrixWorld(); mol.localToWorld(L.energyArrow.at.set(-1.3, 0.25, 0));
  }
  function dropMM() { return 0.02 * Math.pow(10, st.dropV / 50); }
  function rainAmount() { const d = dropMM(); return d < 0.2 ? 0 : d < 0.5 ? 0.25 + ((d - 0.2) / 0.3) * 0.2 : 0.45 + 0.55 * Math.min(1, (d - 0.5) / 1.5); }
  function parcelT() { return T0 - LAPSE * st.hShown; }

  function applyTrees() {
    trees.forEach((tr, i) => { tr.visible = i < st.nTrees && !(on.parcel && TREES[i][1] > 1.5); trans[i].setCount(tr.visible && on.trans ? 9 : 0); });
  }
  function applySun() {
    const s = st.sunShown;
    scene.background.copy(dusk).lerp(sky, 0.25 + 0.75 * s);
    sunLight.intensity = 0.5 + 1.7 * s;
    hemi.intensity = 0.7 + 0.8 * s;
    sun.visible = s > 0.02;
    sun.scale.setScalar(0.6 + 0.4 * s);
    beams.visible = on.beams && s > 0.02;
    for (const f of evap) { f.st.speed = 0.25 + 0.9 * s; f.setCount(on.evap ? Math.round(12 * s) : 0); }
    for (const f of trans) f.st.speed = 0.2 + 0.5 * s;
  }
  function applyGround() {
    const g = GROUNDS[st.ground];
    runoff.setCount(on.runoff ? Math.round(26 * (st.step === 5 ? g.run / 55 : 0.6)) : 0);
    for (const f of infil) f.setCount(on.infil ? Math.round(8 * (st.step === 5 ? g.soak / 50 : 0.7)) : 0);
    st.pavedTo = st.step === 5 ? g.paved : 0;
  }
  function applyPaving() {
    const p = st.paved;
    town.visible = p > 0.01;
    paves.forEach((m, i) => { const k = kit.clamp(p * 6 - (i < 3 ? i * 2 : (i - 3) * 2 + 1), 0, 1); m.visible = k > 0; m.scale.set(1, 1, Math.max(0.01, k)); });
    houses.forEach((m, i) => { const k = kit.clamp(p * 6 - (i < 3 ? i * 2 : (i - 3) * 2 + 1), 0, 1); m.visible = k > 0.05; m.scale.set(1, Math.max(0.01, k), 1); m.position.y = H(m.position.x, m.position.z) + m.geometry.parameters.height * Math.max(0.01, k) / 2; });
    if (st.step === 5) {
      const air = GROUNDS[st.ground].air / 40;
      trees.forEach((tr, i) => { tr.visible = i < 8 - Math.round(p * 6); trans[i].setCount(tr.visible && on.trans ? Math.round(9 * air) : 0); });
    }
  }
  function applyParcel() {
    const h = st.hShown, T = parcelT(), f = kit.clamp((DEW - T) / 4, 0, 1);
    parcel.position.set(PX, G0 + h * KM, PZ);
    parcel.scale.setScalar(1 + 0.06 * h);
    const warm = kit.clamp((T + 15) / 35, 0, 1);
    bubbleMat.color.setRGB(0.45 + 0.55 * warm, 0.6 + 0.1 * warm, 1 - 0.6 * warm);
    bubbleMat.opacity = 0.3 * (1 - f) + 0.08;
    for (const d of drops) { d.scale.setScalar(Math.max(0.001, f)); d.visible = f > 0.01; }
    parcelCloud.scale.setScalar(Math.max(0.001, f * 1.15));
    parcelCloud.visible = f > 0.05;
    parcelCloud.userData.mat.opacity = 0.35 + 0.6 * f;
    L.parcel.text = `${T.toFixed(1)} °C`;
  }
  function applyDrop() {
    const d = dropMM();
    bigDrop.scale.setScalar(0.06 + 0.17 * (Math.log10(d / 0.02) / 2) + 0.02);
    const a = rainAmount();
    rain.setAmount(on.rain ? (st.step === 4 ? a : 0.8) : 0);
    snow.setAmount(on.snow ? (st.step === 4 ? a : 0.8) : 0);
  }
  function placeRain() {
    rain.obj.position.set(cloudB.position.x - (st.step === 5 ? 0 : 0.9), 0, cloudB.position.z);
    rain.box.top = cloudB.position.y - 0.35;
    rain.box.bottom = st.step === 5 ? 0.3 : 0.75;
    gArrow.position.set(rain.obj.position.x - 1.0, rain.box.top - 0.4, cloudB.position.z + 0.5);
    L.gravity.at.set(gArrow.position.x, gArrow.position.y - 1.55, gArrow.position.z);
    L.precip.at.set(rain.obj.position.x + 0.1, rain.box.top - 0.9, cloudB.position.z + 0.6);
  }
  function applyStore() {
    const s = STORE_AT[st.store];
    marker.position.set(s[0], s[1], s[2]);
    marker.userData.r = s[3];
    L.store.text = STORES[st.store].name;
  }

  const on = {};
  function show(parts) {
    for (const k of ['beams', 'evap', 'trans', 'transport', 'rain', 'snow', 'runoff', 'infil', 'gw', 'mol', 'parcel', 'drop', 'store', 'cloudA', 'gravity']) on[k] = parts.includes(k);
    transport.visible = on.transport;
    gw.setCount(on.gw ? 16 : 0);
    mol.visible = on.mol;
    parcel.visible = pole.visible = baseDisc.visible = on.parcel;
    bigDrop.visible = on.drop;
    marker.visible = on.store;
    cloudA.visible = on.cloudA;
    gArrow.visible = on.gravity;
    const labs = parts.filter(p => p.startsWith('L:')).map(p => p.slice(2));
    for (const [k, l] of Object.entries(L)) l.show(labs.includes(k));
    applySun(); applyTrees(); applyGround(); applyDrop();
  }

  function readout() {
    if (st.quiz) return;
    const i = st.step;
    if (i === 0) {
      const s = Math.round(st.sun * 100);
      ui.readout(`Sunlight: <b>${s}%</b> · evaporation: <b>${s === 0 ? 'stopped' : s < 40 ? 'slow' : s < 75 ? 'medium' : 'fast'}</b><br>Gravity still pulls rain and rivers <b>down</b>.`);
    } else if (i === 1) {
      const c = CHANGES[st.change];
      ui.readout(`<b>${c.name}</b>: ${c.what}. Energy is <b>${c.inn ? 'taken in' : 'given out'}</b>.<br>Energy = ${c.J.toLocaleString('en-US')} J/g × ${st.mass} g = <b>${fmtJ(c.J * st.mass)}</b>`);
    } else if (i === 2) {
      const n = st.nTrees;
      ui.readout(`<b>${n}</b> large tree${n === 1 ? '' : 's'} × about 400 L per day = about <b>${(n * 400).toLocaleString('en-US')} L</b> of water vapour a day`);
    } else if (i === 3) {
      const h = Math.round(st.h * 10) / 10, T = T0 - LAPSE * h;
      ui.readout(`Height <b>${h.toFixed(1)} km</b>: temperature = 20 °C − 6.5 °C/km × ${h.toFixed(1)} km = <b>${T.toFixed(1)} °C</b><br>${T > DEW + 0.05 ? 'Warmer than the dew point (7 °C): the vapour stays a gas.' : T > 0 ? '<b>At or below the dew point</b>: vapour condenses on dust specks into cloud droplets.' : '<b>Below 0 °C</b>: cloud droplets, and some tiny ice crystals.'}`);
    } else if (i === 4) {
      const d = 0.02 * Math.pow(10, Math.round(st.dropV) / 50), n = Math.pow(d / 0.02, 3);
      const n2 = n < 10 ? n.toFixed(0) : n < 1e6 * 0.95 ? Math.round(n).toLocaleString('en-US') : 'about 1,000,000';
      ui.readout(`Drop diameter <b>${d < 0.1 ? d.toFixed(3) : d.toFixed(2)} mm</b> = about <b>${n2}</b> cloud droplet${n < 1.5 ? '' : 's'} joined (${d.toFixed(2)} ÷ 0.02)³<br>${d < 0.2 ? 'Too small: rising air holds it up in the cloud.' : d < 0.5 ? 'Big enough to fall as <b>drizzle</b>.' : 'Big enough to fall as <b>rain</b> (snow on the cold peak).'}`);
    } else if (i === 5) {
      const g = GROUNDS[st.ground];
      ui.readout(`<b>${g.name}</b>: of all the rain, about <b>${g.run}%</b> runs off, <b>${g.soak}%</b> soaks in, <b>${g.air}%</b> goes back to the air`);
    } else if (i === 6) {
      const s = STORES[st.store];
      ui.readout(`<b>${s.name}</b>: water stays ${s.time}.`);
    }
  }

  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz; st.demo = null; st.nTrees = 8;
      st.cbTo.set(4.0, 4.7, 0.4);
      if (i === 0) {
        st.sun = 1;
        show(['beams', 'evap', 'trans', 'transport', 'rain', 'snow', 'runoff', 'gw', 'infil', 'cloudA', 'gravity', 'L:sun', 'L:energy', 'L:evap', 'L:precip', 'L:gravity']);
        view({ radius: 5.2, width: 7.4, yaw: -0.2, pitch: 0.28, target: [0, 1.4, 0] }, instant);
        ui.slider({ label: 'Sunlight', min: 0, max: 100, step: 1, value: 100, unit: '%', onInput: v => { st.sun = v / 100; readout(); } });
      }
      if (i === 1) {
        st.sun = 1;
        show(['mol', 'cloudA', 'L:state', 'L:energyArrow']);
        view({ radius: 1.7, yaw: -0.15, pitch: 0.18, target: [mol.position.x - 0.35, mol.position.y, mol.position.z] }, instant);
        const pick = key => () => { const c = CHANGES[key]; st.change = key; st.ms = c.from; st.msTo = c.to; setEnergyArrow(c.inn); readout(); };
        const keys = ['melt', 'evap', 'cond', 'freeze'];
        ui.buttons(keys.map(k => ({ label: CHANGES[k].name, on: k === 'evap', onClick: pick(k) })));
        ui.slider({ label: 'Mass of water', min: 1, max: 100, step: 1, value: st.mass, unit: ' g', onInput: v => { st.mass = v; readout(); } });
        pick('evap')();
        st.ms = 1;
      }
      if (i === 2) {
        st.sun = 1; st.nTrees = 8;
        show(['trans', 'L:trans', 'beams']);
        view({ radius: 2.6, yaw: -0.1, pitch: 0.18, target: [0.8, 1.3, 1.2] }, instant);
        ui.slider({ label: 'Trees', min: 0, max: 8, step: 1, value: 8, onInput: v => { st.nTrees = v; applyTrees(); readout(); } });
      }
      if (i === 3) {
        st.h = 0;
        show(['parcel', 'L:parcel', 'L:km0', 'L:km5', 'L:base']);
        view({ radius: 2.6, yaw: -0.25, pitch: 0.1, target: [PX - 0.2, G0 + 2.5 * KM, PZ] }, instant);
        const inp = ui.slider({ label: 'Height', min: 0, max: 5, step: 0.1, value: 0, unit: ' km', format: v => v.toFixed(1), onInput: v => { st.demo = null; st.h = v; readout(); } });
        // short demo: the parcel rises to 3 km by itself until the learner moves the slider
        st.demo = { key: 'h', to: 3, rate: 1.1, input: inp, round: v => Math.round(v * 10) / 10 };
      }
      if (i === 4) {
        st.dropV = 0;
        show(['rain', 'snow', 'drop', 'gravity', 'L:drop', 'L:gravity', 'L:precip']);
        view({ radius: 3.3, yaw: -0.15, pitch: 0.15, target: [3.2, 3.1, 0.5] }, instant);
        const inp = ui.slider({ label: 'Drop size', min: 0, max: 100, step: 1, value: 0, format: v => { const d = 0.02 * Math.pow(10, v / 50); return d < 0.1 ? d.toFixed(3) : d.toFixed(2); }, unit: ' mm',
          onInput: v => { st.demo = null; st.dropV = v; applyDrop(); readout(); } });
        st.demo = { key: 'dropV', to: 100, rate: 30, input: inp, round: v => Math.round(v), after: applyDrop };
      }
      if (i === 5) {
        st.ground = 0;
        st.cbTo.set(1.0, 3.75, 1.6);
        show(['rain', 'runoff', 'infil', 'gw', 'trans', 'L:runoff', 'L:infil', 'L:gw']);
        view({ radius: 3.0, width: 3.6, yaw: -0.12, pitch: 0.22, target: [0.6, 0.9, 1.6] }, instant);
        const pick = g => () => { st.ground = g; applyGround(); readout(); };
        ui.buttons(GROUNDS.map((g, k) => ({ label: g.name, on: k === 0, onClick: pick(k) })));
      }
      if (i === 6) {
        st.store = 0;
        show(['store', 'cloudA', 'evap', 'rain', 'snow', 'runoff', 'infil', 'gw', 'trans', 'L:store']);
        applyStore();
        view({ radius: 5.2, width: 7.4, yaw: -0.2, pitch: 0.28, target: [0, 1.4, 0] }, instant);
        ui.slider({ label: 'Store', min: 0, max: STORES.length - 1, step: 1, value: 0, format: v => STORES[v].name, onInput: v => { st.store = v; applyStore(); readout(); } });
      }
      if (isQuiz) {
        st.sun = 1;
        show(['beams', 'evap', 'trans', 'transport', 'rain', 'snow', 'runoff', 'gw', 'infil', 'cloudA']);
        view({ radius: 5.2, width: 7.6, yaw: -0.35, pitch: 0.35, target: [0, 1.2, 0] }, instant);
      }
      if (i !== 5) { st.ground = 0; applyGround(); }
      if (instant) {
        st.sunShown = st.sun; st.hShown = st.h; st.paved = st.pavedTo;
        cloudB.position.copy(st.cbTo);
      }
      applySun(); applyParcel(); applyPaving(); placeRain();
      readout();
    },
    update(dt, t) {
      st.t = t;
      if (st.demo) {
        const d = st.demo, v = Math.min(d.to, st[d.key] + d.rate * dt);
        if (d.round(v) !== d.round(st[d.key])) { st[d.key] = v; d.input.set(d.round(v)); d.after?.(); readout(); } else st[d.key] = v;
        if (v >= d.to) st.demo = null;
      }
      if (kit.follow(st, 'sunShown', st.sun, dt, 5)) applySun();
      if (kit.follow(st, 'hShown', st.h, dt, 6) || st.step === 3) applyParcel();
      if (kit.follow(st, 'paved', st.pavedTo, dt, 3)) applyPaving();
      let moved = false;
      for (const k of ['x', 'y', 'z']) moved = kit.follow(cloudB.position, k, st.cbTo[k], dt, 2.5) || moved;
      if (moved) placeRain();
      kit.follow(st, 'ms', st.msTo, dt, 1.4);
      if (mol.visible) { const nm = STATE_NAMES[Math.round(st.ms)]; if (L.state.el.textContent !== nm) L.state.text = nm; }
      if (mol.visible) placeMolecules(t);
      for (const f of flows) if (f.obj.visible) f.tick(dt);
      if (rain.obj.visible) rain.tick(dt);
      if (snow.obj.visible) snow.tick(dt);
      cloudA.position.y = 4.3 + Math.sin(t * 0.6) * 0.06;
      cloudB.position.y = st.cbTo.y + Math.sin(t * 0.5 + 1) * 0.06;
      if (marker.visible) marker.scale.setScalar(marker.userData.r * (1 + 0.08 * Math.sin(t * 4)));
      return true;
    },
  };
}

// Painted cut face: soil on top, dry ground, then rock full of groundwater (blue), deeper bedrock below.
// The texture spans x from -7 to 7 and y from BOTTOM to 4.2, so its layers follow the same ground heights.
function paintCut(THREE) {
  const W = 512, Hh = 256, c = document.createElement('canvas');
  c.width = W; c.height = Hh;
  const g = c.getContext('2d');
  const yPx = y => Hh - ((y - BOTTOM) / (4.2 - BOTTOM)) * Hh;
  for (let px = 0; px < W; px++) {
    const x = X0 + ((px + 0.5) / W) * (X1 - X0), s = H(x, FRONT), sea = s < -0.02;
    const top = yPx(s), soil = yPx(s - 0.28), wt = yPx(Math.min(s - 0.3, waterTable(s))), rock = yPx(-2.0);
    g.fillStyle = '#5b5560'; g.fillRect(px, rock, 1, Hh - rock);                               // bedrock
    g.fillStyle = sea ? '#6b8fae' : '#6d93bf'; g.fillRect(px, wt, 1, rock - wt);               // groundwater
    if (!sea) {
      g.fillStyle = '#b89c74'; g.fillRect(px, soil, 1, wt - soil);                               // dry ground
      g.fillStyle = '#6e4a2c'; g.fillRect(px, top, 1, soil - top);                               // soil
    } else { g.fillStyle = '#c9b48a'; g.fillRect(px, top, 1, Math.max(2, wt - top)); }          // sea-floor sand
  }
  // grains and pores
  for (let i = 0; i < 1400; i++) {
    const x = rand(i * 1.3) * W, y = rand(i * 2.7) * Hh;
    g.fillStyle = `rgba(255,255,255,${0.08 + rand(i * 3.9) * 0.12})`;
    g.fillRect(x, y, 2, 2);
  }
  // water-table line
  g.strokeStyle = 'rgba(20,60,140,0.8)'; g.lineWidth = 2; g.setLineDash([6, 4]);
  g.beginPath();
  for (let px = 0; px < W; px += 4) {
    const x = X0 + (px / W) * (X1 - X0), s = H(x, FRONT);
    if (s < -0.02) continue;
    const y = yPx(Math.min(s - 0.3, waterTable(s)));
    g.lineTo(px, y);
  }
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
