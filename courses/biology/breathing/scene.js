// Breathing and the lungs: a see-through chest with the airway (nose, trachea with cartilage rings, bronchi,
// bronchioles, alveoli), ribs and a diaphragm that move as we breathe in and out; a bell-jar lung model;
// breathing rate × volume per breath = volume per minute with a lung-volume trace; gas exchange between an
// alveolus and a capillary; why many small sacs beat one big one (same volume, k× the surface); and the damage
// smoking does to cilia and alveoli.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { partSet } from '../_shared/cells.js';
import { flow, redCellGeometry, torso, rand, BODY } from '../_shared/body.js';

const JAR = [6, 0, 0];      // bell-jar model
const GAS = [12, 1.45, 0];  // alveolus + capillary
const SAC = [15.6, 1.35, 0]; // surface-area model
const SMK = [20, 0, 0];     // smoking damage
const O2C = 0xe5484d, CO2C = 0x6b7280, AIR = 0x9fd3ff;
const PARTS = [
  ['nose', 'Nose', 'Air comes in through the <b>nose</b> (or mouth). Hairs and sticky <b>mucus</b> trap dust, and the air is warmed and moistened.'],
  ['trachea', 'Trachea', 'The <b>trachea</b> (windpipe) is held open by C-shaped <b>rings of cartilage</b>, so it never collapses when you breathe in.'],
  ['bronchi', 'Bronchi', 'The trachea splits into two <b>bronchi</b> (one is a bronchus), one going into each lung.'],
  ['bronchioles', 'Bronchioles', 'Each bronchus branches again and again into thinner and thinner tubes called <b>bronchioles</b>.'],
  ['alveoli', 'Alveoli', 'Every bronchiole ends in bunches of tiny air sacs, the <b>alveoli</b>. This is where oxygen gets into the blood.'],
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xe6e1ea, sky: 0xedf4fb, radius: 40 });
  ground.position.x = 10;
  const sun = kit.lights(scene, { sun: [5, 10, 8] });
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const group = (p, parent = scene) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; };
  const anchor = (parent, pos) => { const o = new THREE.Object3D(); o.position.set(...pos); parent.add(o); return o; };
  const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => V(...p)));
  const M4 = new THREE.Matrix4(), P3 = new THREE.Vector3(), A3 = new THREE.Vector3(), B3 = new THREE.Vector3(), S3 = new THREE.Vector3(), Q = new THREE.Quaternion(), E3 = new THREE.Euler();
  const C1 = new THREE.Color(), RED = new THREE.Color(BODY.oxy), BLUE = new THREE.Color(BODY.deoxy);
  const rbcGeo = redCellGeometry(THREE, 0.06, 10, 4);
  const plain = (color, opts) => kit.mat(color, opts);

  // ================= The chest: airway, lungs, ribs and diaphragm =================
  const gT = group([0, 0.12, 0]);
  kit.mesh(new THREE.CylinderGeometry(0.75, 0.82, 0.12, 32), plain(0xb9b3c4), [0, 0.06, 0], scene);
  const body = torso(THREE, kit, { opacity: 0.14 });
  gT.add(body.g);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 8), body.skin);
  nose.position.set(0, 3.66, 0.43); nose.rotation.x = Math.PI / 2 - 0.35; nose.renderOrder = 3; gT.add(nose);
  // Spine behind the organs, for scale.
  const bone = plain(0xf1e9d6, { roughness: 0.6 });
  const vGeo = new THREE.BoxGeometry(0.14, 0.11, 0.12);
  for (let i = 0; i < 16; i++) kit.mesh(vGeo, bone, [0, 0.95 + i * 0.14, -0.27], gT);

  const AP = partSet(THREE, kit);
  // Nose, throat and trachea.
  const nasal = kit.mesh(new THREE.TubeGeometry(curve([[0, 3.6, 0.4], [0, 3.66, 0.24], [0, 3.6, 0.06], [0, 3.36, 0.01], [0, 3.14, 0.06], [0, 3.06, 0.07]]), 24, 0.045, 8), AP.mat('nose', 0xe9958f), [0, 0, 0], gT);
  nasal.castShadow = false;
  const trMat = AP.mat('trachea', 0xe7b7a4);
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 12, 1, true), trMat, [0, 2.7, 0.07], gT);
  const ringMat = AP.mat('trachea', 0xf5f0e0, { roughness: 0.5 });
  const ringGeo = new THREE.TorusGeometry(0.058, 0.014, 5, 16, Math.PI * 1.5).rotateX(-Math.PI / 2).rotateY(Math.PI * 0.25 + Math.PI);
  for (let i = 0; i < 10; i++) kit.mesh(ringGeo, ringMat, [0, 2.4 + i * 0.07, 0.07], gT).castShadow = false;

  // Lungs: one group scaled from the top so they stretch down and out as we breathe in.
  const LTOP = 2.52;
  const lungsG = group([0, LTOP, 0], gT);
  const lc = (x, y, z) => [x, y - LTOP, z];
  const lungMat = new THREE.MeshStandardMaterial({ color: 0xf2a0b0, roughness: 0.85, transparent: true, opacity: 0.32, depthWrite: false });
  AP.parts.lungs = { mats: [lungMat] };
  const LUNG = { cy: 2.07, rx: 0.27, ry: 0.46, rz: 0.25, cx: 0.31 };
  for (const s of [-1, 1]) {
    const m = kit.mesh(new THREE.SphereGeometry(1, 24, 16), lungMat, lc(s * LUNG.cx, LUNG.cy, 0.03), lungsG);
    m.scale.set(LUNG.rx, LUNG.ry, LUNG.rz); m.renderOrder = 4; m.castShadow = false;
  }
  // Bronchi and two levels of bronchioles (seeded, kept inside each lung), with bunches of alveoli at the ends.
  const inside = (p, s) => {
    const rel = [(p[0] - s * LUNG.cx) / LUNG.rx, (p[1] - LUNG.cy) / LUNG.ry, (p[2] - 0.03) / LUNG.rz];
    const d = Math.hypot(...rel);
    if (d > 0.82) { const k = 0.82 / d; return [s * LUNG.cx + rel[0] * k * LUNG.rx, LUNG.cy + rel[1] * k * LUNG.ry, 0.03 + rel[2] * k * LUNG.rz]; }
    return p;
  };
  const seg = (a, b, r) => new THREE.TubeGeometry(new THREE.LineCurve3(V(...lc(...a)), V(...lc(...b))), 3, r, 6);
  const bronchiGeos = [], b1Geos = [], b2Geos = [], ends = [];
  const TOP = [0, 2.34, 0.07];
  for (const s of [-1, 1]) {
    const B = [s * 0.2, 2.18, 0.06];
    bronchiGeos.push(seg(TOP, B, 0.034));
    const l1 = [[s * 0.3, 2.38, 0.06], [s * 0.42, 2.06, 0.0], [s * 0.3, 1.78, 0.07]].map(p => inside(p, s));
    l1.forEach((p, j) => {
      b1Geos.push(seg(B, p, 0.02));
      [[0.09, 0.12, 0.09], [0.11, -0.02, -0.1], [0.0, -0.13, 0.08]].forEach((o, q) => {
        const e = inside([p[0] + s * o[0] * (0.8 + rand(j * 3 + q + (s > 0 ? 9 : 0)) * 0.4), p[1] + o[1], p[2] + o[2]], s);
        b2Geos.push(seg(p, e, 0.011));
        ends.push(e);
      });
    });
  }
  const tubeMesh = (geos, mat) => { const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = false; lungsG.add(m); return m; };
  tubeMesh(bronchiGeos, AP.mat('bronchi', 0xe7b7a4));
  tubeMesh(b1Geos, AP.mat('bronchioles', 0xeaa596));
  tubeMesh(b2Geos, AP.mat('bronchioles', 0xeaa596));
  const alvMat = AP.mat('alveoli', 0xf07f93, { roughness: 0.6 });
  const alv = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 8, 6), alvMat, ends.length * 5);
  alv.castShadow = false;
  ends.forEach((e, j) => {
    for (let q = 0; q < 5; q++) {
      const a = q * 1.26 + j, r = q === 0 ? 0 : 0.034;
      P3.set(e[0] + Math.cos(a) * r, e[1] - LTOP + (q === 0 ? 0.02 : -0.01), e[2] + Math.sin(a) * r);
      alv.setMatrixAt(j * 5 + q, M4.compose(P3, Q.identity(), S3.setScalar(1)));
    }
  });
  lungsG.add(alv);

  // Ribs: rings hinged at the spine; breathing in swings their fronts up and out.
  const profX = y => (y < 2.2 ? kit.lerp(0.56, 0.66, (y - 1.6) / 0.6) : kit.lerp(0.66, 0.8, (y - 2.2) / 0.4));
  const ribs = [];
  const ribMat = plain(0xf3ead6, { roughness: 0.55 });
  for (let i = 0; i < 7; i++) {
    const y = 1.72 + i * 0.13, rx = profX(y + 0.08) * 0.9, rz = rx * 0.55 * 0.95;
    const piv = group([0, y, -rz * 0.92], gT);
    const geo = new THREE.TorusGeometry(1, 0.022 / rx, 5, 32, Math.PI * 2 - 0.5).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2 + 0.25);
    const m = kit.mesh(geo, ribMat, [0, 0, rz * 0.92], piv);
    m.scale.set(rx, rx, rz);
    m.castShadow = false;
    ribs.push(piv);
  }
  const sternum = kit.mesh(new THREE.BoxGeometry(0.07, 0.62, 0.03), ribMat, [0, 2.2, 0.32], gT); // sternum
  sternum.castShadow = false;
  // Diaphragm: a dome of muscle under the lungs that flattens when it contracts.
  const CAP = 1.05, capBase = Math.cos(CAP);
  const diaMat = new THREE.MeshStandardMaterial({ color: 0xc8544e, roughness: 0.6, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  const dia = kit.mesh(new THREE.SphereGeometry(1, 28, 8, 0, Math.PI * 2, 0, CAP), diaMat, [0, 0, 0.0], gT);
  dia.castShadow = false;
  const DIA_Y = 1.56;
  const setDia = sy => { dia.scale.set(0.6, sy, 0.33); dia.position.y = DIA_Y - capBase * sy; };
  setDia(0.4);

  // Air moving in and out along the airway to each lung.
  const airGeo = new THREE.SphereGeometry(0.02, 6, 5);
  const airFlows = [-1, 1].map(s => flow(THREE, gT, { points: [[0, 3.6, 0.42], [0, 3.66, 0.24], [0, 3.6, 0.06], [0, 3.36, 0.01], [0, 3.1, 0.07], [0, 2.7, 0.07], [0, 2.36, 0.07], [s * 0.2, 2.16, 0.06], [s * 0.36, 1.98, 0.05]], count: 14, geo: airGeo, color: AIR, speed: 0.35, emissive: 0.5 }));

  const tTags = {
    nose: label('Nose', anchor(gT, [0.12, 3.72, 0.45])),
    trachea: label('Trachea', anchor(gT, [0.3, 2.85, 0.1])),
    bronchi: label('Bronchi', anchor(lungsG, lc(-0.32, 2.36, 0.1))),
    bronchioles: label('Bronchioles', anchor(lungsG, lc(0.5, 2.3, 0.05))),
    alveoli: label('Alveoli', anchor(lungsG, lc(-0.48, 1.86, 0.1))),
    ribs: label('Ribs', anchor(ribs[4], [-0.62, 0, 0.3])),
    inter: label('Intercostal muscles', anchor(gT, [0.62, 1.95, 0.1])),
    dia: label('Diaphragm', anchor(dia, [-0.3, 0.75, 0.9]), { cls: 'warm' }),
    lungs: label('Lungs', anchor(lungsG, lc(0.32, 2.5, 0.1)), { cls: 'big' }),
  };

  // Lung volume trace (20 s wide), drawn beside the chest in the breathing-rate step.
  const gTr = group([1.75, 2.1, 0.1]);
  gTr.rotation.y = -0.15;
  const TW = 1.7, TH = 0.9, NS = 300;
  kit.mesh(new THREE.BoxGeometry(TW + 0.2, TH + 0.3, 0.04), new THREE.MeshBasicMaterial({ color: 0xf7fafd }), [0, 0.05, -0.03], gTr);
  const gridMat = new THREE.LineBasicMaterial({ color: 0xc9d6e2 });
  const gridPts = [];
  for (let k = 0; k <= 3; k++) { const y = -TH / 2 + k * TH / 3; gridPts.push(V(-TW / 2, y, 0), V(TW / 2, y, 0)); }
  gTr.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPts), gridMat));
  const trPos = new Float32Array(NS * 3), trVal = new Float32Array(NS);
  for (let i = 0; i < NS; i++) { trPos[i * 3] = -TW / 2 + TW * i / (NS - 1); trPos[i * 3 + 1] = -TH / 2; trPos[i * 3 + 2] = 0.01; }
  const trGeo = new THREE.BufferGeometry(); trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3));
  const trLine = new THREE.Line(trGeo, new THREE.LineBasicMaterial({ color: 0x1f7ae0 }));
  trLine.frustumCulled = false; gTr.add(trLine);
  const trTags = [label('Air in each breath (0–3 L)', anchor(gTr, [0, TH / 2 + 0.17, 0])), label('Last 20 s', anchor(gTr, [0, -TH / 2 - 0.12, 0]))];

  // ================= Bell-jar model =================
  const gJ = group(JAR);
  kit.mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.3, 32), plain(0x8a7f9c), [0, 0.15, 0], gJ);
  for (const x of [-0.75, 0.75]) kit.mesh(new THREE.BoxGeometry(0.12, 0.3, 0.5), plain(0x6f6582), [x, 0.45, 0], gJ);
  const glass = new THREE.MeshStandardMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.2, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const JB = 0.62, JH = 1.4, JR = 0.6;
  const jarWall = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, JH, 32, 1, true), glass); jarWall.position.y = JB + JH / 2; jarWall.renderOrder = 5; gJ.add(jarWall);
  const jarTop = new THREE.Mesh(new THREE.SphereGeometry(JR, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass); jarTop.scale.y = 0.45; jarTop.position.y = JB + JH; jarTop.renderOrder = 5; gJ.add(jarTop);
  const rimMat = new THREE.LineBasicMaterial({ color: 0x8fb3c9 });
  for (const y of [JB, JB + JH]) { const c = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, i) => V(Math.cos(i / 48 * Math.PI * 2) * JR, y, Math.sin(i / 48 * Math.PI * 2) * JR))), rimMat); gJ.add(c); }
  kit.mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.16, 16), plain(0x5b5b66), [0, JB + JH + 0.3, 0], gJ); // stopper
  const tubeGlass = new THREE.MeshStandardMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.55, roughness: 0.1 });
  const yPts = [[0, JB + JH + 0.55, 0], [0, JB + JH + 0.1, 0], [0, 1.6, 0]];
  kit.mesh(new THREE.TubeGeometry(curve(yPts), 12, 0.035, 8), tubeGlass, [0, 0, 0], gJ).castShadow = false;
  const balloons = [], BAL = 1.15;
  const balloonMat = plain(0xe8546a, { roughness: 0.45 });
  for (const s of [-1, 1]) {
    kit.mesh(new THREE.TubeGeometry(curve([[0, 1.6, 0], [s * 0.12, 1.5, 0], [s * 0.2, 1.33, 0]]), 10, 0.03, 8), tubeGlass, [0, 0, 0], gJ).castShadow = false;
    const b = new THREE.Group(); b.position.set(s * 0.22, 1.3, 0); gJ.add(b);
    const m = kit.mesh(new THREE.SphereGeometry(1, 20, 14), balloonMat, [0, 0, 0], b); m.castShadow = false;
    balloons.push({ g: b, m });
  }
  // Rubber sheet: a shallow bowl that bulges down as it is pulled.
  const sheet = new THREE.Group(); sheet.position.y = JB; gJ.add(sheet);
  const sheetMat = plain(0x3f6fd1, { roughness: 0.75, side: THREE.DoubleSide });
  const bowl = kit.mesh(new THREE.SphereGeometry(JR, 32, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), sheetMat, [0, 0, 0], sheet);
  bowl.castShadow = false;
  const knob = group([0, 0, 0], sheet);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), plain(0x333344), [0, -0.08, 0], knob);
  kit.mesh(new THREE.SphereGeometry(0.06, 12, 8), plain(0x333344), [0, -0.17, 0], knob);
  const jarAir = [-1, 1].map(s => flow(THREE, gJ, { points: [[0, JB + JH + 0.6, 0], [0, JB + JH + 0.1, 0], [0, 1.6, 0], [s * 0.12, 1.5, 0], [s * 0.22, 1.3, 0]], count: 8, geo: airGeo, color: AIR, speed: 0.6, emissive: 0.5 }));
  const jTags = [
    label('Balloon = lung', anchor(gJ, [-0.95, 1.55, 0.2]), { cls: 'warm' }),
    label('Y-tube = trachea', anchor(gJ, [0.3, 2.6, 0])),
    label('Jar = chest wall', anchor(gJ, [0.95, 1.85, 0.1])),
    label('Rubber sheet = diaphragm', anchor(knob, [0, -0.2, 0.62]), { cls: 'cool' }),
  ];

  // ================= Alveolus and capillary =================
  const gA = group(GAS);
  const AR = 0.8, W = 1.5;
  const sacMat = new THREE.MeshStandardMaterial({ color: 0xf3a6b4, roughness: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
  const sac = kit.mesh(new THREE.SphereGeometry(AR, 32, 20, Math.PI / 2 + W / 2, Math.PI * 2 - W), sacMat, [0, 0, 0], gA);
  const sacLow = kit.mesh(new THREE.SphereGeometry(AR, 8, 8, Math.PI / 2 - W / 2, W, Math.PI * 0.6, Math.PI * 0.4), sacMat, [0, 0, 0], gA);
  sac.castShadow = sacLow.castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.7, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xeaa596, side: THREE.DoubleSide, roughness: 0.7 }), [0, AR + 0.25, 0], gA);
  // Capillary wrapped round the lower front of the sac.
  const CY = -0.48, CRr = Math.sqrt(AR * AR - CY * CY) + 0.13;
  const capPts = [[-1.9, CY - 0.1, 0.2], [-1.2, CY - 0.05, 0.3]];
  for (let k = 0; k <= 8; k++) { const a = Math.PI - k / 8 * Math.PI; capPts.push([Math.cos(a) * CRr, CY + Math.sin(k / 8 * Math.PI * 2) * 0.04, Math.sin(a) * CRr]); }
  capPts.push([1.2, CY - 0.05, 0.3], [1.9, CY - 0.1, 0.2]);
  const capCurve = curve(capPts); capCurve.getLengths(300);
  const capTubeGeo = new THREE.TubeGeometry(capCurve, 60, 0.1, 12);
  const capCol = new Float32Array(capTubeGeo.attributes.position.count * 3);
  const oxyAt = u => kit.clamp((u - 0.3) / 0.4, 0, 1);
  for (let i = 0; i <= 60; i++) { C1.copy(BLUE).lerp(RED, oxyAt(i / 60)).lerp(new THREE.Color(0xffffff), 0.25); for (let j = 0; j <= 12; j++) { const k = i * 13 + j; capCol[k * 3] = C1.r; capCol[k * 3 + 1] = C1.g; capCol[k * 3 + 2] = C1.b; } }
  capTubeGeo.setAttribute('color', new THREE.BufferAttribute(capCol, 3));
  const capTube = new THREE.Mesh(capTubeGeo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.4, roughness: 0.35, depthWrite: false }));
  capTube.renderOrder = 4; gA.add(capTube);
  const blood = flow(THREE, gA, { curve: capCurve, count: 14, geo: rbcGeo, speed: 0.07, tumble: 0.6, emissive: 0.2, colorAt: (u, c) => c.copy(BLUE).lerp(RED, oxyAt(u)) });
  blood.material.side = THREE.DoubleSide;
  // Gas molecules: O2 (two red atoms) diffusing from the air in the sac into the blood; CO2 (grey + two red) the other way.
  const atom = new THREE.SphereGeometry(0.035, 8, 6);
  const o2Geo = mergeGeometries([atom.clone().translate(-0.028, 0, 0), atom.clone().translate(0.028, 0, 0)]);
  const co2Geo = mergeGeometries([atom.clone().translate(-0.055, 0, 0), atom.clone().scale(1.15, 1.15, 1.15), atom.clone().translate(0.055, 0, 0)]);
  const co2Col = new Float32Array(co2Geo.attributes.position.count * 3), perAtom = atom.attributes.position.count;
  for (let i = 0; i < co2Geo.attributes.position.count; i++) { C1.set(i >= perAtom && i < 2 * perAtom ? 0x3d4450 : 0xd9dde3); co2Col.set([C1.r, C1.g, C1.b], i * 3); }
  co2Geo.setAttribute('color', new THREE.BufferAttribute(co2Col, 3));
  const NG = 16;
  const gas = (geo, mat, toBlood) => {
    const im = new THREE.InstancedMesh(geo, mat, NG); im.frustumCulled = false; im.castShadow = false; gA.add(im);
    const from = [], to = [];
    for (let i = 0; i < NG; i++) {
      const a = rand(i * 7 + (toBlood ? 1 : 2)) * Math.PI * 2, r = 0.15 + rand(i * 5 + 3) * 0.4;
      const inner = V(Math.cos(a) * r, -0.05 + rand(i * 3 + 11) * 0.45, Math.sin(a) * r * 0.8);
      const outer = capCurve.getPointAt(0.3 + (i / NG) * 0.4 + rand(i + 40) * 0.02);
      (toBlood ? from : to).push(inner); (toBlood ? to : from).push(outer);
    }
    return { im, from, to, phase: toBlood ? 0 : 0.5, on: true };
  };
  const o2 = gas(o2Geo, new THREE.MeshStandardMaterial({ color: O2C, emissive: O2C, emissiveIntensity: 0.25, roughness: 0.4 }), true);
  const co2 = gas(co2Geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.4 }), false);
  const gTags = {
    sac: label('Alveolus (air sac)', anchor(gA, [-0.15, AR + 0.12, 0.2]), { cls: 'big' }),
    cap: label('Capillary', anchor(gA, [-1.25, CY + 0.14, 0.3])),
    low: label('Low in O₂', anchor(gA, [-1.35, CY - 0.3, 0.3]), { cls: 'cool' }),
    high: label('Rich in O₂', anchor(gA, [1.35, CY - 0.3, 0.3]), { cls: 'warm' }),
    o2: label('O₂ in', anchor(gA, [-0.5, 0.05, 0.6]), { cls: 'warm' }),
    co2: label('CO₂ out', anchor(gA, [0.5, 0.05, 0.6])),
    wall: label('Wall one cell thick', anchor(gA, [0.55, -0.2, 0.62])),
  };

  // ================= Surface area: one big sac or many small ones =================
  const gS = group(SAC);
  const SR = 0.62;
  const ghost = new THREE.Mesh(new THREE.SphereGeometry(SR, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf3a6b4, transparent: true, opacity: 0.12, depthWrite: false }));
  ghost.renderOrder = 4; gS.add(ghost);
  const sacs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), plain(0xf07f93, { roughness: 0.55 }), 125);
  sacs.frustumCulled = false; sacs.castShadow = false; gS.add(sacs);
  const sTag = label('Same volume of air', anchor(gS, [0, SR + 0.18, 0]));
  let shownK = 0;
  const setSacs = (k) => {
    if (k === shownK) return; shownK = k;
    const r = SR / k;
    sacs.count = k * k * k;
    let n = 0;
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) for (let c = 0; c < k; c++) {
      P3.set(-SR + r + a * 2 * r, -SR + r + b * 2 * r, -SR + r + c * 2 * r);
      sacs.setMatrixAt(n++, M4.compose(P3, Q.identity(), S3.setScalar(r * 0.97)));
    }
    sacs.instanceMatrix.needsUpdate = true;
  };
  setSacs(1);

  // ================= Smoking: cilia in the airway lining, and alveoli =================
  const gK = group(SMK);
  const lining = kit.mesh(new THREE.BoxGeometry(1.7, 0.16, 0.7), plain(0xe8a59a), [-1.05, 0.62, 0], gK);
  kit.mesh(new THREE.BoxGeometry(1.8, 0.54, 0.8), plain(0xcfc6d8), [-1.05, 0.27, 0], gK);
  const ciliaMat = plain(0xf4d1c4, { roughness: 0.6 });
  const ciliaGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.2, 5).translate(0, 0.1, 0);
  const cilia = [];
  for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) {
    const c = kit.mesh(ciliaGeo, ciliaMat, [-1.82 + i * 0.14, 0.7, -0.24 + j * 0.16], gK); c.castShadow = false; c.phase = i * 0.55 + j * 0.2; cilia.push(c);
  }
  const mucusMat = new THREE.MeshStandardMaterial({ color: 0xd9e6a8, transparent: true, opacity: 0.8, roughness: 0.3 });
  const mucus = [0, 1, 2].map(i => { const m = kit.mesh(new THREE.SphereGeometry(0.12, 14, 8), mucusMat, [0, 0.93, -0.02 + (i - 1) * 0.12], gK); m.scale.set(1.4, 0.45, 0.9); m.castShadow = false; m.x0 = i / 3; return m; });
  const tarMat = plain(0x3b2a1c, { roughness: 0.9, transparent: true });
  const tar = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 4), tarMat, 40);
  tar.castShadow = false;
  for (let i = 0; i < 40; i++) tar.setMatrixAt(i, M4.compose(P3.set(-1.85 + rand(i) * 1.6, 0.92 + rand(i + 9) * 0.04, -0.3 + rand(i + 3) * 0.6), Q.identity(), S3.set(1, 0.5, 1)));
  gK.add(tar);
  // Alveoli: a healthy bunch of many small sacs, and the same bunch after smoking (fewer, bigger, broken-down sacs).
  const bunch = (n, r, spread, mat, seed) => {
    const g = group([1.0, 0.95, 0], gK);
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 8), plain(0xeaa596), [0, 0.55, 0], g).castShadow = false;
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), mat, n);
    im.castShadow = false;
    for (let i = 0; i < n; i++) {
      const a = rand(i + seed) * Math.PI * 2, h = (rand(i + seed + 30) - 0.5) * 2 * spread, rr = Math.sqrt(Math.max(0, spread * spread - h * h)) * (0.4 + 0.6 * rand(i + seed + 60));
      im.setMatrixAt(i, M4.compose(P3.set(Math.cos(a) * rr, h, Math.sin(a) * rr), Q.identity(), S3.setScalar(r * (0.85 + 0.3 * rand(i + seed + 90)))));
    }
    g.add(im);
    return { g, mat, im };
  };
  const healthy = bunch(26, 0.13, 0.42, plain(0xf07f93, { roughness: 0.55 }), 3);
  const damaged = bunch(6, 0.27, 0.32, plain(0x9d8a86, { roughness: 0.8 }), 70);
  const kTags = {
    cilia: label('Cilia', anchor(gK, [-1.6, 0.98, 0.35])),
    mucus: label('Mucus', anchor(mucus[1], [0, 0.4, 0])),
    tar: label('Tar', anchor(gK, [-1.2, 1.05, 0.3]), { cls: 'warm' }),
    alv: label('Alveoli', anchor(gK, [1.0, 1.55, 0.3]), { cls: 'big' }),
  };

  // ================= State, views and steps =================
  const allTags = [...Object.values(tTags), ...trTags, ...jTags, ...Object.values(gTags), sTag, ...Object.values(kTags)];
  const F = {
    airway: { radius: 1.42, yaw: 0.35, pitch: 0.1, target: [0, 2.85, 0] },
    chest: { radius: 1.12, yaw: 0.6, pitch: 0.12, target: [0, 2.12, 0] },
    jar: { radius: 1.35, yaw: 0.2, pitch: 0.16, target: [JAR[0], 1.35, 0] },
    rate: { radius: 1.45, width: 1.98, yaw: 0.12, pitch: 0.1, target: [0.85, 2.35, 0] },
    gas: { radius: 1.35, width: 2.05, yaw: 0.1, pitch: 0.35, target: [GAS[0], GAS[1] - 0.15, 0] },
    sac: { radius: 1.05, yaw: 0.5, pitch: 0.35, target: [SAC[0], SAC[1], 0] },
    smoke: { radius: 1.35, width: 2.0, yaw: 0.15, pitch: 0.3, target: [SMK[0] - 0.12, 0.95, 0] },
    quiz: { radius: 1.55, yaw: -0.45, pitch: 0.12, target: [0, 2.45, 0] },
  };
  const st = { step: 0, quiz: false, time: 0, auto: true, row: null, b: 0, bTo: 0, mode: 'auto', phase: 0, rate: 12, tidal: 0.5, amp: 0.9, pull: 0, pullTo: 0, sample: 0, k: 1, smoke: 0, smokeTo: 0, part: -1, gasMode: 'both' };

  function hideAll() {
    for (const tg of allTags) tg.show(false);
    for (const t of Object.values(tTags)) t.el.classList.remove('warm');
    gTr.visible = false; AP.select([]);
    for (const r of ribs) r.visible = true; sternum.visible = true;
  }
  function pickPart(j) {
    st.part = j;
    AP.select(PARTS[j][0]);
    PARTS.forEach(([key], q) => tTags[key].el.classList.toggle('warm', q === j));
    ui.readout(`<b>${PARTS[j][1]}</b>: ${PARTS[j][2]}`);
  }
  function setGas(mode) {
    st.gasMode = mode;
    o2.on = mode !== 'co2'; co2.on = mode !== 'o2';
    gTags.o2.show(o2.on); gTags.co2.show(co2.on);
    ui.readout('<table><tr><th></th><th>Breathed in</th><th>Breathed out</th></tr><tr><td>Oxygen</td><td>about 21%</td><td>about 16%</td></tr><tr><td>Carbon dioxide</td><td>about 0.04%</td><td>about 4%</td></tr></table>Each gas diffuses from where it is <b>more concentrated</b> to where it is <b>less concentrated</b>.');
  }
  function rateReadout() {
    const vpm = st.rate * st.tidal;
    ui.readout(`Volume per minute = breathing rate × volume per breath<br>= ${st.rate} × ${st.tidal.toFixed(2)} L = <b>${vpm.toFixed(1)} L per minute</b><br><small>Model values. At rest: about 12–20 breaths per minute and about 0.5 L per breath.</small>`);
  }
  function sacReadout() {
    const k = st.k, n = k * k * k;
    ui.readout(`<b>${n}</b> sac${n > 1 ? 's' : ''}, each ${k > 1 ? `1/${k} as wide` : 'full size'}.<br>Total volume of air: <b>the same</b>.<br>Total surface area: <b>${k}×</b> the single sac.`);
  }
  function setSmoke(on) {
    st.smokeTo = on ? 1 : 0;
    ui.readout(on
      ? 'Tobacco smoke contains <b>tar</b>, which coats the airways and causes cancer; <b>nicotine</b>, which is addictive; and <b>carbon monoxide</b>, which takes the place of oxygen in red blood cells. The cilia stop beating, mucus builds up (a smoker\'s cough), and the walls between alveoli break down, so there is far less surface for gas exchange.'
      : 'In healthy airways, <b>cilia</b> (tiny hairs) beat to sweep <b>mucus</b>, with the dust and germs it traps, up and away from the lungs. The alveoli are many small sacs with a huge surface.');
  }

  function breathe(dt) {
    // b: 0 = fully breathed out, 1 = fully breathed in.
    if (st.mode === 'auto') {
      st.phase = (st.phase + dt * st.rate / 60) % 1;
      st.bTo = 0.5 - 0.5 * Math.cos(st.phase * Math.PI * 2);
      st.b = st.bTo;
    } else kit.follow(st, 'b', st.bTo, dt, 1.6);
    return st.b;
  }
  function applyChest(b, prev, dt) {
    const a = st.amp;
    lungsG.scale.set(1 + 0.07 * a * b, 1 + 0.13 * a * b, 1 + 0.08 * a * b);
    for (const r of ribs) r.rotation.x = 0.26 - 0.16 * a * b;
    setDia(0.4 - 0.26 * a * b);
    const v = dt > 0 ? (b - prev) / dt : 0;
    for (const f of airFlows) { f.rate = kit.clamp(v * 2.2, -3, 3); f.size = Math.min(1, Math.abs(v) * 3); f.update(dt); }
    return v;
  }

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.auto = true; st.row = null; st.slider = null;
      hideAll();
      st.mode = 'auto'; st.rate = 12; st.tidal = 0.5; st.amp = 0.9; st.lastPhase = '';
      if (i === 0) {
        view(F.airway);
        for (const [key] of PARTS) tTags[key].show(true);
        for (const r of ribs) r.visible = false; sternum.visible = false;
        st.amp = 0.4;
        st.row = ui.buttons(PARTS.map(([, n], j) => ({ label: n, on: j === 0, onClick: () => { st.auto = false; pickPart(j); } })));
        pickPart(0);
      }
      if (i === 1) {
        view(F.chest);
        for (const k of ['ribs', 'inter', 'dia', 'lungs']) tTags[k].show(true);
        st.rate = 10; st.amp = 1;
        st.row = ui.buttons([
          { label: 'Breathe in', onClick: () => { st.auto = false; st.mode = 'hold'; st.bTo = 1; } },
          { label: 'Breathe out', onClick: () => { st.auto = false; st.mode = 'hold'; st.bTo = 0; } },
          { label: 'Keep breathing', on: true, onClick: () => { st.auto = false; st.mode = 'auto'; st.phase = Math.acos(1 - 2 * st.b) / (Math.PI * 2); } },
        ]);
      }
      if (i === 2) {
        view(F.jar);
        for (const tg of jTags) tg.show(true);
        st.pull = st.pullTo = 0;
        st.slider = ui.slider({ label: 'Pull the rubber sheet down', min: 0, max: 100, step: 1, value: 0, unit: '%', onInput: v => { st.auto = false; st.pullTo = v / 100; } });
        ui.readout('Pull the sheet down: the space inside the jar gets <b>bigger</b>, so the air pressure inside <b>falls</b>. Air from outside rushes in and the balloons inflate.');
      }
      if (i === 3) {
        view(F.rate);
        gTr.visible = true; for (const tg of trTags) tg.show(true);
        tTags.lungs.show(true);
        for (let k = 0; k < NS; k++) { const back = (NS - 1 - k) / 15; trVal[k] = 0.5 * (0.5 - 0.5 * Math.cos((st.phase - back * 12 / 60) * Math.PI * 2)); }
        st.sample = 0;
        st.rateS = ui.slider({ label: 'Breathing rate', min: 6, max: 50, step: 1, value: 12, unit: ' breaths/min', onInput: v => { st.auto = false; st.rate = v; rateReadout(); } });
        st.tidS = ui.slider({ label: 'Volume per breath', min: 0.25, max: 3, step: 0.05, value: 0.5, unit: ' L', format: v => v.toFixed(2), onInput: v => { st.auto = false; st.tidal = v; rateReadout(); } });
        rateReadout();
      }
      if (i === 4) {
        view(F.gas);
        for (const k of ['sac', 'cap', 'low', 'high']) gTags[k].show(true);
        st.row = ui.buttons([{ label: 'Oxygen', onClick: () => { st.auto = false; setGas('o2'); } }, { label: 'Carbon dioxide', onClick: () => { st.auto = false; setGas('co2'); } }, { label: 'Both', on: true, onClick: () => { st.auto = false; setGas('both'); } }]);
        setGas('both');
      }
      if (i === 5) {
        view(F.sac);
        sTag.show(true);
        st.k = 1; setSacs(1);
        st.slider = ui.slider({ label: 'Split into smaller sacs', min: 1, max: 5, step: 1, value: 1, format: v => `${v ** 3} sac${v > 1 ? 's' : ''}`, onInput: v => { st.auto = false; st.k = v; setSacs(v); sacReadout(); } });
        sacReadout();
      }
      if (i === 6) {
        view(F.smoke);
        for (const t of Object.values(kTags)) t.show(true);
        kTags.tar.show(false);
        st.smoke = st.smokeTo = 0;
        st.toggle = ui.toggle({ label: 'Damage from smoking', value: false, onChange: v => { st.auto = false; setSmoke(v); } });
        setSmoke(false);
      }
      if (isQuiz) { view(F.quiz); st.amp = 0.6; }
    },

    update(dt) {
      st.time += dt;
      const t = st.time, s = st.step;
      // The chest breathes in every step that shows it.
      if (s <= 1 || s === 3 || st.quiz) {
        if (s === 0 && !st.quiz && st.auto) { const j = Math.floor(t / 2.6) % PARTS.length; if (j !== st.part) { pickPart(j); st.row?.select(j); } }
        if (s === 0 || st.quiz) AP.pulse(t);
        if (s === 1 && st.auto) {
          // Demo: slow breaths in and out, naming each half.
          st.mode = 'auto'; st.rate = 10;
        }
        if (s === 3 && st.auto) {
          // Demo: a jog speeds breathing up, then it settles back.
          const e = 0.5 - 0.5 * Math.cos(Math.min(t, 16) / 16 * Math.PI * 2);
          const r = Math.round(12 + 28 * e), v = Math.round((0.5 + 1.7 * e) * 20) / 20;
          if (r !== st.rate || v !== st.tidal) { st.rate = r; st.tidal = v; st.rateS?.set(r); st.tidS?.set(v); rateReadout(); }
        }
        if (s === 3) st.amp = kit.clamp(st.tidal / 2.2, 0.15, 1.35);
        const prev = st.b, b = breathe(dt);
        const v = applyChest(b, prev, dt);
        if (s === 1) {
          const ph = Math.abs(v) < 0.02 ? (b > 0.5 ? 'held in' : 'held out') : v > 0 ? 'in' : 'out';
          if (ph !== st.lastPhase) {
            st.lastPhase = ph;
            ui.readout(ph === 'in' ? '<b>Breathing in</b>: the intercostal muscles contract and lift the ribs <b>up and out</b>; the diaphragm contracts and <b>flattens</b>. The chest gets bigger, the pressure inside falls, and air flows <b>in</b>.'
              : ph === 'out' ? '<b>Breathing out</b>: the intercostal muscles relax and the ribs move <b>down and in</b>; the diaphragm relaxes and <b>domes up</b>. The chest gets smaller, the pressure inside rises, and air is pushed <b>out</b>.'
              : `The lungs are ${ph === 'held in' ? 'full: the ribs are up and the diaphragm is flat' : 'emptied: the ribs are down and the diaphragm is domed'}.`);
          }
        }
        if (s === 3) {
          st.sample += dt;
          while (st.sample >= 1 / 15) {
            st.sample -= 1 / 15;
            trVal.copyWithin(0, 1); trVal[NS - 1] = st.tidal * b;
          }
          for (let k = 0; k < NS; k++) trPos[k * 3 + 1] = -TH / 2 + TH * Math.min(1, trVal[k] / 3);
          trGeo.attributes.position.needsUpdate = true;
        }
      }
      if (s === 2 && !st.quiz) {
        if (st.auto) { st.pullTo = 0.5 - 0.5 * Math.cos(t * 1.4); st.slider?.set(Math.round(st.pullTo * 100)); }
        const prev = st.pull;
        kit.follow(st, 'pull', st.pullTo, dt, 5);
        const v = (st.pull - prev) / Math.max(dt, 1e-4);
        bowl.scale.set(1, 0.02 + st.pull * 0.45, 1);
        knob.position.y = -st.pull * 0.45 * JR;
        const r = 0.11 + 0.17 * st.pull;
        for (const b of balloons) b.m.scale.set(r * 0.92, r, r * 0.92);
        for (const f of jarAir) { f.rate = kit.clamp(v * 2, -2.5, 2.5); f.size = Math.min(1, Math.abs(v) * 3); f.update(dt); }
      }
      if (s === 4 && !st.quiz) {
        if (st.auto) { const k = Math.floor(t / 4.5) % 3, m = ['both', 'o2', 'co2'][k]; if (m !== st.gasMode) { setGas(m); st.row?.select([2, 0, 1][k]); } }
        blood.update(dt);
        for (const G of [o2, co2]) {
          G.phase += dt * 0.28;
          for (let i = 0; i < NG; i++) {
            const f = (G.phase + i / NG + rand(i + 17) * 0.3) % 1;
            P3.lerpVectors(G.from[i], G.to[i], f);
            const sz = G.on ? Math.min(1, f / 0.12, (1 - f) / 0.12) : 0;
            E3.set(i + G.phase * 3, i * 2.1 + G.phase * 2, 0); Q.setFromEuler(E3);
            G.im.setMatrixAt(i, M4.compose(P3, Q, S3.setScalar(Math.max(0.001, sz))));
          }
          G.im.instanceMatrix.needsUpdate = true;
        }
      }
      if (s === 5 && !st.quiz) {
        if (st.auto) { const k = Math.min(5, 1 + Math.floor(Math.max(0, t - 0.8) / 1.3)); if (k !== st.k) { st.k = k; setSacs(k); st.slider?.set(k); sacReadout(); } if (k >= 5) st.auto = false; }
        gS.rotation.y += dt * 0.25;
      }
      if (s === 6 && !st.quiz) {
        if (st.auto) { const on = t > 2 && Math.floor((t - 2) / 5) % 2 === 0; if (on !== !!st.smokeTo) { setSmoke(on); if (st.toggle) st.toggle.checked = on; } }
        kit.follow(st, 'smoke', st.smokeTo, dt, 2.5);
        const k = st.smoke;
        kTags.tar.show(k > 0.5); kTags.cilia.show(true);
        for (const c of cilia) { c.rotation.z = (1 - k) * 0.45 * Math.sin(t * 9 - c.phase) + k * 0.5; }
        ciliaMat.color.setHex(0xf4d1c4).lerp(C1.setHex(0x8f7a6a), k);
        mucus.forEach((m, i) => {
          if (k < 0.5) m.x0 = (m.x0 + dt * 0.12 * (1 - k)) % 1;
          m.position.x = -1.85 + m.x0 * 1.6; m.scale.set(1.4 + k * 0.6, 0.45 + k * 0.25, 0.9);
        });
        tar.visible = k > 0.02; tarMat.opacity = k;
        healthy.im.scale.setScalar(Math.max(0.001, 1 - k)); damaged.im.scale.setScalar(Math.max(0.001, k));
        healthy.im.visible = k < 0.99; damaged.im.visible = k > 0.01;
      }
      return true;
    },
  };
}
