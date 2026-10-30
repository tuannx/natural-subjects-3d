// Climate and the greenhouse effect.
// 1) Weather vs climate: monthly bars of a made-up town averaged over 1 to 30 years settle onto the 30-year line.
// 2-4) Earth with sunlight dots (about 30% reflected) and infrared dots; greenhouse gases send some infrared back.
//      A CO2 slider adds molecules; model temperature = 14 °C + 1.8 °C x log2(CO2 / 280) (about 1.8 °C per doubling,
//      the warming within a few decades). With no greenhouse effect the model shows about -18 °C.
// 5) CO2 graph from 1750 to today (about 280 -> about 420 ppm). 6) Sea level rise and a shrinking glacier.
// 7) A town that switches to clean power, plants trees and takes the bus.
import { rand, makeSun, SPACE, starfield, planetTexture } from '../_shared/sky.js';
import { makeFlow, makeThermometer } from '../_shared/atmos.js';

const R = 1.5, RA = 1.98;                 // Earth and the top of the drawn atmosphere
const modelT = c => 14 + 1.8 * Math.log2(c / 280);
const CO2 = [[1750, 280], [1800, 282], [1850, 285], [1900, 296], [1925, 305], [1950, 311], [1960, 317], [1970, 326], [1980, 339], [1990, 354], [2000, 370], [2010, 390], [2020, 414], [2025, 422]];
const co2At = y => {
  for (let i = 0; i < CO2.length - 1; i++) {
    const [a, pa] = CO2[i], [b, pb] = CO2[i + 1];
    if (y <= b) return pa + ((pb - pa) * (y - a)) / (b - a);
  }
  return CO2[CO2.length - 1][1];
};
// Sea level since 1900 in cm (rates of about 1.3, 1.9 and 3.7 mm per year; about 20 cm by 2018).
const seaCm = y => {
  const a = Math.min(y, 1971) - 1900, b = Math.max(0, Math.min(y, 2006) - 1971), c = Math.max(0, y - 2006);
  return (a * 1.3 + b * 1.9 + c * 3.7) / 10;
};
const MONTHS = 'JFMAMJJASOND';
const normalT = m => 11 - 12 * Math.cos((2 * Math.PI * (m - 0.5)) / 12);
const yearT = (y, m) => normalT(m) + (rand(y * 7.7 + 500) - 0.5) * 2 + (rand(y * 12 + m + 0.5) - 0.5) * 7;
const avgT = (n, m) => { let s = 0; for (let y = 0; y < n; y++) s += yearT(y, m); return s / n; };
const BAR_Y = t => (t + 10) * 0.08;      // bar height for a temperature (-10 °C at the floor)
const BAR_X = m => (m - 5.5) * 0.56;

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const skyDay = new THREE.Color(0xd6ecff), space = new THREE.Color(SPACE);
  scene.background = skyDay.clone();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8fa6b8, 1.5);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
  sunLight.position.set(-6, 8, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunLight.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 40 });
  scene.add(sunLight);
  const stars = starfield(THREE, scene, { count: 500, radius: 90, size: 0.5, seed: 3 });

  // ---------- 1. weather vs climate bars ----------
  const bars = new THREE.Group();
  scene.add(bars);
  const barGeo = new THREE.BoxGeometry(0.4, 1, 0.4);
  barGeo.translate(0, 0.5, 0);
  const barMeshes = [];
  for (let m = 0; m < 12; m++) {
    const b = kit.mesh(barGeo, kit.mat(0xffffff), [BAR_X(m), 0, 0], bars);
    barMeshes.push(b);
  }
  const normals = [];
  for (let m = 0; m < 12; m++) normals.push(avgT(30, m));
  bars.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(normals.map((t, m) => new THREE.Vector3(BAR_X(m), BAR_Y(t), 0.26))), 60, 0.035, 6), new THREE.MeshBasicMaterial({ color: 0x111827 })));
  for (let m = 0; m < 12; m++) kit.mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0x111827 }), [BAR_X(m), BAR_Y(normals[m]), 0.26], bars);
  {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 3.4), new THREE.MeshBasicMaterial({ map: barPanel(THREE) }));
    panel.position.set(0, 1.6, -0.35);
    bars.add(panel);
    const base = kit.mesh(new THREE.BoxGeometry(7.4, 0.12, 1.1), new THREE.MeshStandardMaterial({ map: monthStrip(THREE) }), [0, -0.06, 0.1], bars);
    base.castShadow = false;
  }
  const BAR_COLD = new THREE.Color(0x3b82f6), BAR_WARM = new THREE.Color(0xef4444), BAR_MID = new THREE.Color(0xfbbf24);

  // ---------- 2-4. Earth, sunlight, infrared, greenhouse gases ----------
  const earthG = new THREE.Group();
  scene.add(earthG);
  const earthMat = new THREE.MeshStandardMaterial({ map: planetTexture(THREE, 'earth'), roughness: 0.9, emissive: 0xdff3ff, emissiveIntensity: 0 });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), earthMat);
  earth.rotation.z = 0.41;
  earthG.add(earth);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(RA, 32, 24), new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.13, depthWrite: false }));
  earthG.add(atmo);
  const bigSun = makeSun(THREE, 0.9);
  bigSun.position.set(-6.4, 0.3, 0);
  earthG.add(bigSun);
  const spaceLight = new THREE.DirectionalLight(0xffffff, 2.4);
  spaceLight.position.set(-6, 0.8, 1.5);
  earthG.add(spaceLight);
  // photons
  const NS = 46, NI = 60, X0 = -5.4;
  const sunDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f }), NS);
  const irDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NI);
  sunDots.frustumCulled = irDots.frustumCulled = false;
  earthG.add(sunDots, irDots);
  const IR_OUT = new THREE.Color(0xef4444), IR_BACK = new THREE.Color(0xff8fab);
  // CO2 molecules (O=C=O): one black carbon and two red oxygen spheres each.
  const NC = 70;
  const cMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), kit.mat(0x222222), NC);
  const oMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 10, 8), kit.mat(0xe63946), NC * 2);
  cMesh.frustumCulled = oMesh.frustumCulled = false;
  earthG.add(cMesh, oMesh);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), o = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), e = new THREE.Euler();
    for (let i = 0; i < NC; i++) {
      p.set(rand(i * 3.1) - 0.5, rand(i * 5.7) - 0.5, rand(i * 7.3) - 0.5).normalize().multiplyScalar(R + 0.14 + rand(i * 9.9) * (RA - R - 0.22));
      e.set(rand(i) * 6, rand(i + 9) * 6, 0); q.setFromEuler(e);
      m4.compose(p, q, one); cMesh.setMatrixAt(i, m4);
      o.set(0.08, 0, 0).applyQuaternion(q).add(p); m4.compose(o, q, one); oMesh.setMatrixAt(i * 2, m4);
      o.set(-0.08, 0, 0).applyQuaternion(q).add(p); m4.compose(o, q, one); oMesh.setMatrixAt(i * 2 + 1, m4);
    }
  }
  const thermo = makeThermometer(THREE, { height: 2.6, min: -30, max: 30, step: 10 });
  thermo.obj.position.set(2.75, -1.45, 0.2);
  earthG.add(thermo.obj);

  // ---------- 5. CO2 graph ----------
  const chart = new THREE.Group();
  scene.add(chart);
  const CX = y => -2.7 + ((y - 1750) / (2025 - 1750)) * 5.6, CY = p => -1.3 + ((p - 260) / 180) * 2.8;
  {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshBasicMaterial({ map: chartBoard(THREE, CX, CY) }));
    chart.add(board);
    const pts = [];
    for (let y = 1750; y <= 2025; y += 5) pts.push([CX(y), CY(co2At(y))]);
    const shape = new THREE.Shape([new THREE.Vector2(CX(1750), CY(260)), ...pts.map(([x, y]) => new THREE.Vector2(x, y)), new THREE.Vector2(CX(2025), CY(260))]);
    const area = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false }), kit.mat(0xfca5a5, { transparent: true, opacity: 0.8 }));
    area.position.z = 0.01;
    chart.add(area);
    chart.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0.37))), 80, 0.035, 6), new THREE.MeshBasicMaterial({ color: 0xb91c1c })));
  }
  const marker = kit.mesh(new THREE.SphereGeometry(0.1, 16, 12), kit.mat(0x111827), [0, 0, 0.37], chart);
  const stem = kit.mesh(new THREE.BoxGeometry(0.025, 1, 0.025), new THREE.MeshBasicMaterial({ color: 0x111827 }), [0, 0, 0.37], chart);

  // ---------- 6. coast: sea level and glacier ----------
  const coast = new THREE.Group();
  scene.add(coast);
  const coastH = (x, z) => {
    const s = t => Math.max(0, Math.min(1, t)), sm = t => s(t) * s(t) * (3 - 2 * s(t));
    return -0.6 + 0.85 * sm((x + 2.2) / 2.6) + 2.3 * Math.exp(-(((x - 3.6) / 1.2) ** 2) - ((z / 2.4) ** 2)) + 0.05 * Math.sin(x * 2 + z * 1.3) * sm(x / 2);
  };
  {
    const geo = new THREE.PlaneGeometry(10, 5, 60, 20);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = coastH(x, z);
      p.setY(i, y);
      c.set(y < 0.12 ? 0xe5cf98 : y < 1.2 ? 0x77b255 : 0x8d8579);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = kit.mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }), [0, 0, 0], coast);
    m.castShadow = false;
    const base = kit.mesh(new THREE.BoxGeometry(10, 0.5, 5), kit.mat(0x8b6a4a), [0, -0.86, 0], coast);
    base.castShadow = false;
    // front and back walls of the land, so the block looks solid
    for (const zs of [1, -1]) {
      const sh = new THREE.Shape();
      sh.moveTo(-5, -0.62);
      for (let x = -5; x <= 5.001; x += 0.2) sh.lineTo(x, coastH(x, 2.5 * zs));
      sh.lineTo(5, -0.62);
      const w = new THREE.Mesh(new THREE.ShapeGeometry(sh, 1), kit.mat(0x8b6a4a));
      w.position.z = 2.5 * zs; if (zs < 0) { w.rotation.y = Math.PI; w.scale.x = -1; }
      w.material.side = THREE.DoubleSide;
      coast.add(w);
    }
  }
  const sea = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1, 4.96), new THREE.MeshStandardMaterial({ color: 0x2f7fd6, transparent: true, opacity: 0.82, roughness: 0.25 }));
  coast.add(sea);
  const glacier = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf1f7ff, roughness: 0.5, flatShading: true }));
  glacier.position.set(3.6, 2.1, 0);
  coast.add(glacier);
  const houses = new THREE.Group();
  coast.add(houses);
  for (let i = 0; i < 6; i++) {
    const x = 0.25 + (i % 3) * 0.5, z = -1.1 + Math.floor(i / 3) * 1.7 + (i % 2) * 0.3, s = 0.26;
    const y = coastH(x, z);
    kit.mesh(new THREE.BoxGeometry(s, s, s), kit.mat([0xf1e4d0, 0xdfe7ee, 0xf6d9a8][i % 3]), [x, y + s / 2, z], houses);
    const roof = kit.mesh(new THREE.ConeGeometry(s * 0.78, s * 0.5, 4), kit.mat(0xc2410c), [x, y + s * 1.25, z], houses);
    roof.rotation.y = Math.PI / 4;
  }

  // ---------- 7. town: what people can do ----------
  const town = new THREE.Group();
  scene.add(town);
  {
    const g = kit.mesh(new THREE.BoxGeometry(9, 0.3, 5), kit.mat(0x86c06c), [0, -0.15, 0], town);
    g.castShadow = false;
    const road = kit.mesh(new THREE.BoxGeometry(9, 0.02, 0.7), kit.mat(0x4b5563), [0, 0.01, 1.6], town);
    road.castShadow = false;
  }
  const plant = new THREE.Group();
  plant.position.set(-3, 0, -0.9);
  town.add(plant);
  kit.mesh(new THREE.BoxGeometry(1.4, 0.8, 1.0), kit.mat(0x9ca3af), [0, 0.4, 0], plant);
  for (const x of [-0.35, 0.35]) kit.mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.5, 12), kit.mat(0xb91c1c), [x, 0.75, -0.2], plant);
  for (let i = 0; i < 6; i++) {
    const x = -1.2 + (i % 3) * 0.9, z = -1.2 + Math.floor(i / 3) * 1.25, s = 0.4 + rand(i + 7) * 0.15;
    kit.mesh(new THREE.BoxGeometry(s, s, s), kit.mat([0xf1e4d0, 0xdfe7ee, 0xf6d9a8][i % 3]), [x, s / 2, z], town);
    const roof = kit.mesh(new THREE.ConeGeometry(s * 0.78, s * 0.5, 4), kit.mat(0xc2410c), [x, s * 1.25, z], town);
    roof.rotation.y = Math.PI / 4;
  }
  const smoke = [-0.35, 0.35].map((x, i) => makeFlow(THREE, [[plant.position.x + x, 1.55, plant.position.z - 0.2], [plant.position.x + x + 0.2, 2.4, -1.1], [plant.position.x + x + 0.7, 3.4, -1.3]], { count: 14, color: 0x6b7280, size: 0.1, speed: 0.6, seed: i * 31 }));
  const exhaust = [-1.5, 1.2].map((x, i) => makeFlow(THREE, [[x, 0.3, 1.6], [x + 0.15, 1.3, 1.4], [x + 0.4, 2.4, 1.2]], { count: 9, color: 0x6b7280, size: 0.08, speed: 0.5, seed: 70 + i * 17 }));
  for (const f of [...smoke, ...exhaust]) town.add(f.obj);
  const solar = new THREE.Group(), wind = new THREE.Group(), trees = new THREE.Group(), cars = new THREE.Group(), bus = new THREE.Group();
  town.add(solar, wind, trees, cars, bus);
  for (let i = 0; i < 6; i++) {
    const p = kit.mesh(new THREE.BoxGeometry(0.55, 0.04, 0.38), kit.mat(0x1e3a8a, { roughness: 0.3, metalness: 0.3 }), [1.5 + (i % 3) * 0.65, 0.3, -1.6 + Math.floor(i / 3) * 0.55], solar);
    p.rotation.x = -0.5;
    kit.mesh(new THREE.BoxGeometry(0.04, 0.28, 0.04), kit.mat(0x9ca3af), [p.position.x, 0.14, p.position.z], solar);
  }
  const rotors = [];
  for (const [x, z] of [[3.4, 0.0], [-4.1, 0.6]]) {
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.2, 8), kit.mat(0xf8fafc), [x, 1.1, z], wind);
    const hub = new THREE.Group();
    hub.position.set(x, 2.2, z + 0.1);
    wind.add(hub);
    for (let b = 0; b < 3; b++) {
      const blade = kit.mesh(new THREE.BoxGeometry(0.08, 0.8, 0.02), kit.mat(0xf8fafc), [0, 0.4, 0], new THREE.Group());
      blade.parent.rotation.z = (b * Math.PI * 2) / 3;
      hub.add(blade.parent);
    }
    rotors.push(hub);
  }
  const treeList = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    g.position.set(-1.6 + (i % 5) * 0.75 + rand(i) * 0.2, 0, 0.55 + Math.floor(i / 5) * 0.45 - (i % 2) * 0.1);
    kit.mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 6), kit.mat(0x7a5232), [0, 0.12, 0], g);
    kit.mesh(new THREE.ConeGeometry(0.2, 0.5, 8), kit.mat(0x2f8f46), [0, 0.45, 0], g);
    trees.add(g);
    treeList.push(g);
  }
  const carList = [0xdc2626, 0x2563eb, 0xf59e0b, 0x10b981].map((c, i) => {
    const g = new THREE.Group();
    kit.mesh(new THREE.BoxGeometry(0.42, 0.16, 0.22), kit.mat(c), [0, 0.12, 0], g);
    kit.mesh(new THREE.BoxGeometry(0.22, 0.12, 0.2), kit.mat(0xdbeafe), [0, 0.25, 0], g);
    g.position.set(-4 + i * 2.1, 0, 1.45 + (i % 2) * 0.3);
    cars.add(g);
    return g;
  });
  kit.mesh(new THREE.BoxGeometry(1.1, 0.34, 0.3), kit.mat(0xfacc15), [0, 0.22, 0], bus);
  kit.mesh(new THREE.BoxGeometry(1.0, 0.1, 0.31), kit.mat(0x1e293b), [0, 0.3, 0], bus);
  bus.position.set(0, 0, 1.45);
  const bikes = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Group();
    for (const dx of [-0.08, 0.08]) { const w = kit.mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12), kit.mat(0x111827), [dx, 0.07, 0], b); w.castShadow = false; }
    kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), kit.mat([0x7c3aed, 0x0ea5e9, 0xf97316][i]), [0, 0.2, 0], b);
    b.position.set(-2.5 + i * 0.9, 0, 1.85);
    bikes.add(b);
  }
  town.add(bikes);

  // ---------- labels ----------
  const at = (x, y, z) => new THREE.Vector3(x, y, z);
  const L = {
    line: label('30-year average', at(BAR_X(9), BAR_Y(normals[9]) + 0.35, 0.3)),
    sun: label('Sun', at(-6.4, 1.3, 0), { cls: 'warm' }),
    sunlight: label('Sunlight', at(-3.4, 1.3, 0), { cls: 'warm' }),
    infrared: label('Infrared', at(1.4, 2.4, 0.5)),
    gases: label('Greenhouse gases', at(-0.4, 2.05, 0.6), { cls: 'cool' }),
    thermo: label('', at(2.75, 1.35, 0.2)),
    year: label('', marker),
    glacier: label('Glacier', at(3.6, 3.1, 0)),
    sea: label('Sea', at(-3.2, 0.3, 1.6), { cls: 'cool' }),
    houses: label('Houses', at(0.75, 0.8, 0.6)),
    plant: label('Power plant', at(-3, 1.7, -0.6)),
    turbine: label('Wind turbine', at(3.4, 3.1, 0)),
    solar: label('Solar panels', at(2.15, 0.7, -1.3)),
  };

  // ---------- state ----------
  const st = { step: 0, quiz: false, years: 1, show: 3, gh: true, ghF: 1, ghTo: 1, co2: 280, co2Shown: 280, T: 15, TShown: 15, year: 1750, yearShown: 1750, sYear: 1900, sYearShown: 1900,
    clean: false, plantTrees: false, transit: false, cleanF: 0, treeF: 0, busF: 0, demo: null, pTrap: 0 };
  const m4 = new THREE.Matrix4(), qI = new THREE.Quaternion(), vP = new THREE.Vector3(), vS = new THREE.Vector3(), dir = new THREE.Vector3(), cTmp = new THREE.Color();
  const ZERO = new THREE.Vector3(0.0001, 0.0001, 0.0001), ONE = new THREE.Vector3(1, 1, 1);

  function applyBars() {
    let dev = 0;
    for (let m = 0; m < 12; m++) {
      const t = avgT(st.years, m), b = barMeshes[m];
      b.scale.y = Math.max(0.02, BAR_Y(t));
      const f = kit.clamp((t + 2) / 26, 0, 1);
      if (f < 0.5) cTmp.copy(BAR_COLD).lerp(BAR_MID, f * 2); else cTmp.copy(BAR_MID).lerp(BAR_WARM, (f - 0.5) * 2);
      b.material.color.copy(cTmp);
      dev += Math.abs(t - normals[m]);
    }
    st.dev = dev / 12;
  }
  function trapP() {
    if (!st.gh && st.ghF < 0.02) return 0;
    return st.ghF * kit.clamp(0.36 + 0.16 * Math.log2(st.co2Shown / 280), 0.15, 0.8);
  }
  function applyCO2() {
    const n = Math.round(kit.clamp(18 + (st.co2Shown - 280) * 0.055, 0, NC) * st.ghF);
    cMesh.count = n; oMesh.count = n * 2;
    cMesh.visible = oMesh.visible = n > 0;
  }
  function targetT() { return st.gh ? (st.step === 2 ? 15 : modelT(st.co2)) : -18; }

  function placePhotons(t) {
    const showSun = st.show & 1, showIR = st.show & 2;
    // sunlight: from the left toward the disc of the Earth; about 30% reflected
    for (let i = 0; i < NS; i++) {
      const P = 3.0, ph = t / P + rand(i * 1.3), k = Math.floor(ph), u = ph - k;
      const r = Math.sqrt(rand(i * 13 + k * 7.1)) * 1.38, a = rand(i * 17 + k * 3.3) * Math.PI * 2;
      const y = Math.sin(a) * r, z = Math.cos(a) * r, xh = -Math.sqrt(Math.max(0, R * R - y * y - z * z));
      const d1 = xh - X0, s = u * 3.2 * P, refl = rand(i * 29 + k * 11) < 0.3;
      let show = showSun;
      if (s < d1) vP.set(X0 + s, y, z);
      else if (refl) { const s2 = s - d1; vP.set(xh - s2, y + y * s2 * 0.12, z + z * s2 * 0.12); if (vP.x < X0) show = 0; }
      else show = 0;
      m4.compose(vP, qI, show ? ONE : ZERO);
      sunDots.setMatrixAt(i, m4);
    }
    sunDots.instanceMatrix.needsUpdate = true;
    // infrared: out from the surface in every direction; some are sent back down by greenhouse gases
    const p = st.pTrap;
    for (let i = 0; i < NI; i++) {
      const P = 2.6, ph = t / P + rand(i * 2.7 + 100), k = Math.floor(ph), u = ph - k;
      dir.set(rand(i * 5.1 + k * 1.7) - 0.5, rand(i * 6.3 + k * 2.9) - 0.5, rand(i * 7.9 + k * 4.3) - 0.5);
      if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
      dir.normalize();
      const s = u * 1.5 * P, trapped = rand(i * 41 + k * 13) < p, rt = R + 0.18 + rand(i * 3 + k) * (RA - R - 0.25);
      let r, back = false, show = showIR;
      if (!trapped) { r = R + s; if (r > 4.3) show = 0; }
      else if (s < rt - R) r = R + s;
      else { r = rt - (s - (rt - R)); back = true; if (r < R) show = 0; }
      vP.copy(dir).multiplyScalar(r);
      m4.compose(vP, qI, show ? ONE : ZERO);
      irDots.setMatrixAt(i, m4);
      irDots.setColorAt(i, back ? IR_BACK : IR_OUT);
    }
    irDots.instanceMatrix.needsUpdate = true;
    if (irDots.instanceColor) irDots.instanceColor.needsUpdate = true;
  }
  function applyEarthTemp() {
    thermo.setTemp(st.TShown);
    L.thermo.text = `${st.TShown.toFixed(1)} °C (model)`;
    earthMat.emissiveIntensity = on.thermo ? 0.55 * kit.clamp((10 - st.TShown) / 28, 0, 1) : 0; // icy look when cold
  }
  function applyChart() {
    const y = st.yearShown, p = co2At(y);
    marker.position.set(CX(y), CY(p), 0.37);
    stem.scale.y = Math.max(0.01, CY(p) - CY(260));
    stem.position.set(CX(y), (CY(p) + CY(260)) / 2, 0.37);
    L.year.text = `${Math.round(y)}: about ${Math.round(p)} ppm`;
  }
  function applyCoast() {
    const cm = seaCm(st.sYearShown);
    const top = -0.02 + cm * 0.012; // drawn about 1.2 units per metre: much bigger than real
    sea.scale.y = top + 0.75;
    sea.position.set(-1.9, (top - 0.75) / 2, 0); // reaches under the land, which hides the part below the ground
    const f = (st.sYearShown - 1900) / 120;
    glacier.scale.set(1.15 * (1 - 0.5 * f), 0.75 * (1 - 0.55 * f) + 0.05, 1.3 * (1 - 0.45 * f));
  }
  function applyTown() {
    const c = st.cleanF, tr = st.treeF, b = st.busF;
    solar.visible = wind.visible = c > 0.01;
    solar.scale.setScalar(Math.max(0.01, c)); wind.scale.set(1, Math.max(0.01, c), 1);
    trees.visible = tr > 0.01;
    treeList.forEach((g, i) => g.scale.setScalar(Math.max(0.01, kit.clamp(tr * 1.5 - i * 0.06, 0, 1))));
    for (const f of smoke) f.setCount(on.town ? Math.round(14 * (1 - c)) : 0);
    for (const f of exhaust) f.setCount(on.town ? Math.round(9 * (1 - b)) : 0);
    cars.visible = b < 0.5; bus.visible = bikes.visible = b >= 0.5;
    L.solar.show(on.town && st.clean); L.turbine.show(on.town && st.clean);
  }

  const on = {};
  function show(parts) {
    for (const k of ['bars', 'earth', 'gases', 'thermo', 'chart', 'coast', 'town']) on[k] = parts.includes(k);
    bars.visible = on.bars; earthG.visible = on.earth; chart.visible = on.chart; coast.visible = on.coast; town.visible = on.town;
    atmo.visible = on.gases;
    thermo.obj.visible = on.thermo;
    stars.visible = on.earth;
    scene.background.copy(on.earth ? space : skyDay);
    hemi.intensity = on.earth ? 0.35 : 1.5;
    sunLight.intensity = on.earth ? 0 : 2.2;
    const labs = parts.filter(p => p.startsWith('L:')).map(p => p.slice(2));
    for (const [k, l] of Object.entries(L)) l.show(labs.includes(k));
  }

  function readout() {
    if (st.quiz) return;
    const i = st.step;
    const co2 = Math.round(st.co2 / 10) * 10, year = Math.round(st.year / 5) * 5, sYear = Math.round(st.sYear);
    if (i === 0) {
      ui.readout(`Averaging <b>${st.years}</b> year${st.years === 1 ? '' : 's'}: July average <b>${avgT(st.years, 6).toFixed(1)} °C</b><br>The bars are on average <b>${st.dev.toFixed(1)} °C</b> away from the 30-year averages (the line).`);
    } else if (i === 1) {
      ui.readout('Of all the sunlight reaching Earth, about <b>30%</b> is reflected back to space<br>and about <b>70%</b> is absorbed and warms Earth, which then gives off <b>infrared</b>.');
    } else if (i === 2) {
      ui.readout(st.gh ? 'Greenhouse gases <b>on</b>: some infrared is sent back down.<br>Average surface temperature: about <b>15 °C</b>' : 'Greenhouse gases <b>off</b>: all the infrared escapes to space.<br>Average surface temperature: about <b>−18 °C</b>');
    } else if (i === 3) {
      const d = Math.log2(co2 / 280);
      ui.readout(`CO₂ <b>${co2} ppm</b> = ${d.toFixed(2)} doublings since 280 ppm<br>Model temperature = 14 °C + 1.8 °C × ${d.toFixed(2)} = <b>${modelT(co2).toFixed(1)} °C</b> (model)`);
    } else if (i === 4) {
      const p = co2At(year);
      ui.readout(`Year <b>${year}</b>: CO₂ about <b>${Math.round(p)} ppm</b><br>That is about <b>${Math.round(((p - 280) / 280) * 100)}%</b> more than the 280 ppm before industry.`);
    } else if (i === 5) {
      ui.readout(`Year <b>${sYear}</b>: the average sea level is about <b>${seaCm(sYear).toFixed(0)} cm</b> higher than in 1900.`);
    } else if (i === 6) {
      const n = (st.clean ? 0 : 28) + (st.transit ? 0 : 18);
      const acts = [st.clean && 'clean power', st.plantTrees && 'trees growing', st.transit && 'buses and bikes'].filter(Boolean);
      ui.readout(`Grey CO₂ dots rising from the model town: <b>${n}</b> of 46<br>${acts.length ? 'On: <b>' + acts.join(', ') + '</b>' + (st.plantTrees ? ' (the trees also take CO₂ in as they grow)' : '') : 'Nothing switched on yet.'}`);
    }
  }
  const demo = (key, to, rate, input, round, after) => { st.demo = { key, to, rate, input, round, after }; };

  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz; st.demo = null;
      if (i === 0) {
        st.years = 1;
        show(['bars', 'L:line']);
        applyBars();
        view({ radius: 2.2, width: 3.9, yaw: 0.2, pitch: 0.22, target: [0, 1.35, 0] }, instant);
        const inp = ui.slider({ label: 'Years averaged', min: 1, max: 30, step: 1, value: 1, onInput: v => { st.demo = null; st.years = v; applyBars(); readout(); } });
        demo('years', 30, 6, inp, v => Math.round(v), () => { st.years = Math.round(st.years); applyBars(); });
      }
      if (i === 1) {
        st.show = 3; st.gh = false; st.ghTo = 0; st.co2 = 280;
        show(['earth', 'L:sun', 'L:sunlight', 'L:infrared']);
        view({ radius: 2.4, width: 5.0, yaw: 0, pitch: 0.12, target: [-1.9, 0.2, 0] }, instant);
        const pick = s => () => { st.show = s; };
        ui.buttons([{ label: 'Sunlight', onClick: pick(1) }, { label: 'Infrared', onClick: pick(2) }, { label: 'Both', on: true, onClick: pick(3) }]);
      }
      if (i === 2) {
        st.show = 3; st.gh = true; st.ghTo = 1; st.co2 = 420;
        show(['earth', 'gases', 'thermo', 'L:gases', 'L:thermo', 'L:infrared']);
        view({ radius: 2.6, width: 3.4, yaw: 0, pitch: 0.12, target: [0.5, 0.2, 0] }, instant);
        ui.toggle({ label: 'Greenhouse gases', value: true, onChange: v => { st.gh = v; st.ghTo = v ? 1 : 0; readout(); } });
      }
      if (i === 3) {
        st.show = 3; st.gh = true; st.ghTo = 1; st.co2 = 280;
        show(['earth', 'gases', 'thermo', 'L:gases', 'L:thermo']);
        view({ radius: 2.6, width: 3.4, yaw: 0, pitch: 0.12, target: [0.5, 0.2, 0] }, instant);
        const inp = ui.slider({ label: 'CO₂', min: 280, max: 1120, step: 10, value: 280, unit: ' ppm', onInput: v => { st.demo = null; st.co2 = v; readout(); } });
        demo('co2', 560, 160, inp, v => Math.round(v / 10) * 10);
      }
      if (i === 4) {
        st.year = 1750;
        show(['chart', 'L:year']);
        view({ radius: 2.0, width: 3.4, yaw: 0.12, pitch: 0.06, target: [0.1, 0.05, 0] }, instant);
        const inp = ui.slider({ label: 'Year', min: 1750, max: 2025, step: 5, value: 1750, onInput: v => { st.demo = null; st.year = v; readout(); } });
        demo('year', 2025, 110, inp, v => Math.round(v / 5) * 5);
      }
      if (i === 5) {
        st.sYear = 1900;
        show(['coast', 'L:glacier', 'L:sea', 'L:houses']);
        view({ radius: 2.6, width: 4.2, yaw: -0.3, pitch: 0.38, target: [0.4, 0.5, 0] }, instant);
        const inp = ui.slider({ label: 'Year', min: 1900, max: 2020, step: 1, value: 1900, onInput: v => { st.demo = null; st.sYear = v; readout(); } });
        demo('sYear', 2020, 45, inp, v => Math.round(v));
      }
      if (i === 6) {
        st.clean = st.plantTrees = st.transit = false;
        show(['town', 'L:plant']);
        view({ radius: 2.6, width: 4.3, yaw: 0.15, pitch: 0.4, target: [0, 0.9, 0] }, instant);
        ui.toggle({ label: 'Solar and wind power', value: false, onChange: v => { st.clean = v; readout(); } });
        ui.toggle({ label: 'Plant trees', value: false, onChange: v => { st.plantTrees = v; readout(); } });
        ui.toggle({ label: 'Buses and bikes', value: false, onChange: v => { st.transit = v; readout(); } });
      }
      if (isQuiz) {
        st.show = 3; st.gh = true; st.ghTo = 1; st.co2 = 420;
        show(['earth', 'gases', 'thermo']);
        view({ radius: 2.8, width: 3.8, yaw: 0.25, pitch: 0.2, target: [0, 0.2, 0] }, instant);
      }
      st.T = targetT();
      if (instant) {
        st.ghF = st.ghTo; st.co2Shown = st.co2; st.TShown = st.T; st.yearShown = st.year; st.sYearShown = st.sYear;
        st.cleanF = +st.clean; st.treeF = +st.plantTrees; st.busF = +st.transit;
      }
      st.pTrap = trapP();
      applyCO2(); applyEarthTemp(); applyChart(); applyCoast(); applyTown();
      readout();
    },
    update(dt, t) {
      if (st.demo) {
        const d = st.demo, v = Math.min(d.to, st[d.key] + d.rate * dt);
        if (d.round(v) !== d.round(st[d.key])) { st[d.key] = v; d.input.set(d.round(v)); d.after?.(); readout(); } else st[d.key] = v;
        if (v >= d.to) { st[d.key] = d.round(d.to); st.demo = null; }
      }
      const co2Round = Math.round(st.co2 / 10) * 10;
      st.T = targetT();
      if (kit.follow(st, 'ghF', st.ghTo, dt, 2) | kit.follow(st, 'co2Shown', co2Round, dt, 4)) applyCO2();
      st.pTrap = trapP();
      if (kit.follow(st, 'TShown', st.step === 3 ? modelT(st.co2Shown) : st.T, dt, 2.5)) applyEarthTemp();
      if (kit.follow(st, 'yearShown', st.year, dt, 6)) applyChart();
      if (kit.follow(st, 'sYearShown', st.sYear, dt, 6)) applyCoast();
      const moved = kit.follow(st, 'cleanF', +st.clean, dt, 3) | kit.follow(st, 'treeF', +st.plantTrees, dt, 1.5) | kit.follow(st, 'busF', +st.transit, dt, 4);
      if (moved) applyTown();
      if (earthG.visible) { earth.rotation.y += dt * 0.15; placePhotons(t); }
      if (town.visible) {
        for (const f of [...smoke, ...exhaust]) if (f.obj.visible) f.tick(dt);
        for (const r of rotors) r.rotation.z -= dt * 2.5;
        carList.forEach((c, i) => { c.position.x = -4.2 + ((t * 0.9 + i * 2.1) % 8.4); });
        bus.position.x = -4.2 + ((t * 0.7) % 8.4);
        bikes.children.forEach((b, i) => { b.position.x = -4.2 + ((t * 0.35 + i * 2.8) % 8.4); });
      }
      return true;
    },
  };
}

// Back panel of the bar chart: grid lines every 10 °C from -10 to 30 (bar height 0.08 per °C).
function barPanel(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 236;
  const g = c.getContext('2d');
  g.fillStyle = '#f8fafc'; g.fillRect(0, 0, 512, 236);
  // panel is 3.4 tall centred at y = 1.6, so y = 0 is 0.1 above its bottom edge
  const yPx = t => 236 - ((0.1 + (t + 10) * 0.08) / 3.4) * 236;
  g.font = 'bold 15px sans-serif'; g.textBaseline = 'middle';
  for (let t = -10; t <= 30; t += 10) {
    g.strokeStyle = t === 0 ? '#64748b' : '#cbd5e1'; g.lineWidth = t === 0 ? 2 : 1;
    g.beginPath(); g.moveTo(44, yPx(t)); g.lineTo(512, yPx(t)); g.stroke();
    g.fillStyle = '#334155'; g.fillText(`${t} °C`, 2, yPx(t));
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Month letters on the base of the bar chart (the base is 7.4 wide; bars are 0.56 apart).
function monthStrip(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = '#e2e8f0'; g.fillRect(0, 0, 512, 80);
  g.fillStyle = '#1f2937'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let m = 0; m < 12; m++) g.fillText(MONTHS[m], 256 + (BAR_X(m) / 7.4) * 512, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The CO2 graph's board: grid, axis labels and two dashed reference lines.
function chartBoard(THREE, CX, CY) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 288;
  const g = c.getContext('2d'), px = x => (x + 3.2) * 80, py = y => (1.8 - y) * 80;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 288);
  g.font = 'bold 15px sans-serif'; g.fillStyle = '#334155';
  g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let p = 280; p <= 440; p += 40) {
    g.strokeStyle = '#e2e8f0'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(px(CX(1750)), py(CY(p))); g.lineTo(px(CX(2025)), py(CY(p))); g.stroke();
    g.fillText(String(p), px(CX(1750)) - 6, py(CY(p)));
  }
  g.textAlign = 'center'; g.textBaseline = 'top';
  for (let y = 1750; y <= 2000; y += 50) {
    g.strokeStyle = '#e2e8f0';
    g.beginPath(); g.moveTo(px(CX(y)), py(CY(260))); g.lineTo(px(CX(y)), py(CY(440))); g.stroke();
    g.fillText(String(y), px(CX(y)), py(CY(260)) + 4);
  }
  g.strokeStyle = '#334155'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(px(CX(1750)), py(CY(440))); g.lineTo(px(CX(1750)), py(CY(260))); g.lineTo(px(CX(2025)), py(CY(260))); g.stroke();
  g.setLineDash([6, 5]); g.lineWidth = 2;
  for (const [p, txt, col] of [[280, 'before industry: about 280', '#2563eb'], [420, 'today: about 420', '#b91c1c']]) {
    g.strokeStyle = col; g.beginPath(); g.moveTo(px(CX(1750)), py(CY(p))); g.lineTo(px(CX(2025)), py(CY(p))); g.stroke();
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(txt, px(CX(1758)), py(CY(p < 300 ? 293 : p)) - 3); // above the shaded area
  }
  g.setLineDash([]);
  g.fillStyle = '#0f172a'; g.textAlign = 'left'; g.textBaseline = 'top'; g.font = 'bold 16px sans-serif';
  g.fillText('CO₂ in the air (ppm)', px(CX(1790)), 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
