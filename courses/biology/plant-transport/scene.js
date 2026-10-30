// Water and nutrient transport in plants: a plant in cut-away soil with xylem (water up) and phloem (sugar)
// flows; a magnified root tip whose root hairs take in water and mineral salts; a magnified xylem vessel and
// phloem sieve tube; celery standing in dyed water with a time slider and a cut slice; transpiration through a
// stoma that opens and closes; and a potometer whose bubble speed follows light, temperature, wind and
// humidity (model values).
import { partSet } from '../_shared/cells.js';
import { leafGeometry } from '../_shared/leaf.js';
import { stream, soilPlant, glucoseGeometry, rand, SUBST } from '../_shared/plants.js';

const PL = [0, 1.1, 0];   // plant overview (soil block sits on the ground)
const RT = [8, 0, 0];     // root tip (magnified)
const TB = [16, 0, 0];    // xylem vessel and phloem tube (magnified)
const CE = [24, 0, 0];    // celery in dyed water
const TR = [32, 1.1, 0];  // transpiration plant + magnified stoma
const PO = [40, 0, 0];    // potometer bench
const STALK_CM = 20, FULL_H = 6; // model: dye reaches the top of a 20 cm stalk after about 6 hours
const MINERAL = 0x9b5de5, DYE = 0xd6336c, VAPOUR = 0xb8dcff;

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xd8e9cc, sky: 0xe3f2fb, radius: 60 });
  ground.position.x = 20;
  const sun = kit.lights(scene, { sun: [6, 10, 6] });
  scene.add(sun.target);
  const v3 = (a, dx = 0, dy = 0, dz = 0) => new THREE.Vector3(a[0] + dx, a[1] + dy, a[2] + dz);
  const arr = v => [v.x, v.y, v.z];
  const group = p => { const g = new THREE.Group(); g.position.set(...p); scene.add(g); return g; };
  const all = [];
  const S = (parent, o) => { const s = stream(THREE, parent, o); all.push(s); return s; };
  const sugarGeo = glucoseGeometry(THREE, 0.06);
  const glass = new THREE.MeshStandardMaterial({ color: 0xe4f4ff, transparent: true, opacity: 0.22, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const M4 = new THREE.Matrix4(), P3 = new THREE.Vector3(), Q3 = new THREE.Vector3(), D3 = new THREE.Vector3(), S3 = new THREE.Vector3(), QI = new THREE.Quaternion();
  const anchor = (parent, pos) => { const o = new THREE.Object3D(); o.position.set(...pos); parent.add(o); return o; };

  // ================= Plant overview (steps 1 and 7) =================
  const plant = soilPlant(THREE, kit, { h: 2.3, pairs: 3, tuber: true });
  const gP = group(PL); gP.add(plant.g);
  const fz = plant.soilFront, LT = plant.leafTips, H = 2.3;
  const leafY = i => H * (0.35 + 0.55 * (Math.floor(i / 2) / 2));
  const leafBase = new Map(plant.leaves.map(l => [l, l.scale.x]));
  // Root ends the water starts from (main root tip and two side roots).
  const rootEnds = [arr(plant.rootTip), [-0.5, -0.4, fz], [0.47, -0.55, fz]];
  const water = (parent, ends, tips, yOf, opts = {}) => tips.map((tip, i) => S(parent, {
    points: [ends[i % ends.length], [0, -0.35, fz], [0, -0.04, fz * 0.6], [-0.035, 0.25, 0.06], [-0.035, yOf(i), 0.06], arr(tip)],
    count: 7, color: SUBST.water, radius: 0.045, speed: 0.13, ...opts,
  }));
  const xylemP = water(gP, rootEnds, LT, leafY);
  const tuberPath = [[0.04, 0.05, 0.06], [0.0, -0.06, fz * 0.7], [0, -0.2, fz], [0.35, -0.35, fz], [0.62, -0.55, fz]];
  // Summer: lower leaves feed the tuber, top leaves feed the bud. Spring: the tuber feeds the bud and young leaves.
  const summer = [0, 1, 2, 3].map(i => S(gP, { points: [arr(LT[i]), [0.04, leafY(i), 0.06], ...tuberPath], count: 6, color: SUBST.glucose, geo: sugarGeo, speed: 0.12, spin: 1 }))
    .concat([4, 5].map(i => S(gP, { points: [arr(LT[i]), [0.04, leafY(i), 0.06], [0.04, H - 0.05, 0.05], arr(plant.top)], count: 4, color: SUBST.glucose, geo: sugarGeo, speed: 0.2, spin: 1 })));
  const spring = [arr(plant.top), arr(LT[4]), arr(LT[5])].map((end, i) => S(gP, {
    points: [...tuberPath.slice().reverse(), [0.04, 0.4, 0.06], [0.04, i ? leafY(4) : H - 0.05, 0.06], end], count: 8, color: SUBST.glucose, geo: sugarGeo, speed: 0.1, spin: 1,
  }));
  const pTags = {
    xylem: label('Xylem: water up', v3(PL, -0.55, 0.55, 0.1), { cls: 'cool' }),
    phloem: label('Phloem: sugar', v3(PL, 0.55, 1.15, 0.1), { cls: 'warm' }),
    roots: label('Roots', v3(PL, -0.75, -0.45, fz), { cls: 'cool' }),
    tuber: label('Tuber (store)', v3(PL, 0.95, -0.72, fz)),
    leaves: label('Leaves', v3(PL, LT[3].x, LT[3].y + 0.25, LT[3].z)),
  };

  // ================= Root tip with root hairs (step 2) =================
  const gR = group(RT);
  const ROOT_R = 0.25, ROOT_Y0 = 0.55, ROOT_Y1 = 3.35;
  const rootMat = new THREE.MeshStandardMaterial({ color: 0xf3e3bf, transparent: true, opacity: 0.55, roughness: 0.7, depthWrite: false });
  const rootBody = kit.mesh(new THREE.CylinderGeometry(ROOT_R, ROOT_R, ROOT_Y1 - ROOT_Y0, 24, 1, true), rootMat, [0, (ROOT_Y0 + ROOT_Y1) / 2, 0], gR);
  rootBody.renderOrder = 2; rootBody.castShadow = false;
  const cap = kit.mesh(new THREE.ConeGeometry(ROOT_R, 0.38, 24), kit.mat(0xe2c48e), [0, ROOT_Y0 - 0.19, 0], gR);
  cap.rotation.x = Math.PI;
  const core = kit.mesh(new THREE.CylinderGeometry(0.075, 0.075, ROOT_Y1 - ROOT_Y0 - 0.1, 12), kit.mat(0x8ec5ff, { roughness: 0.5 }), [0, (ROOT_Y0 + ROOT_Y1) / 2 + 0.05, 0], gR);
  core.castShadow = false;
  const hairMat = kit.mat(0xf7ead0, { roughness: 0.6 });
  const hairGeo = new THREE.CylinderGeometry(0.02, 0.026, 1, 6);
  hairGeo.translate(0, 0.5, 0);
  const HAIRS = 60, HAIR_R = 0.022;
  const hairs = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < HAIRS; i++) {
    const a = i * 2.39996 + 0.4, y = 1.05 + 1.65 * rand(i + 3), len = 0.55 + 0.45 * rand(i + 7);
    const dir = new THREE.Vector3(Math.cos(a), -0.12 - 0.15 * rand(i + 11), Math.sin(a)).normalize();
    const base = new THREE.Vector3(Math.cos(a) * ROOT_R * 0.95, y, Math.sin(a) * ROOT_R * 0.95);
    const m = kit.mesh(hairGeo, hairMat, arr(base), gR);
    m.quaternion.setFromUnitVectors(up, dir);
    m.scale.y = len; m.castShadow = false;
    hairs.push({ m, base, tip: base.clone().addScaledVector(dir, len), dir, len, area: 2 * Math.PI * HAIR_R * len });
  }
  const bareArea = 2 * Math.PI * ROOT_R * (ROOT_Y1 - ROOT_Y0);
  // Soil grains around the root, kept out of the space right in front of it.
  const grainGeo = new THREE.DodecahedronGeometry(0.13, 0);
  const grains = new THREE.InstancedMesh(grainGeo, kit.mat(0x9b6a43, { flatShading: true, roughness: 1 }), 46);
  {
    const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    let n = 0;
    for (let i = 0; n < 46 && i < 400; i++) {
      p.set(-1.5 + 3 * rand(i * 3 + 1), 0.25 + 3.1 * rand(i * 3 + 2), -1.1 + 1.5 * rand(i * 3 + 5));
      const d = Math.hypot(p.x, p.z);
      if (d < 0.5 || (p.z > -0.1 && Math.abs(p.x) < 1.0)) continue;
      e.set(rand(i) * 6, rand(i + 9) * 6, 0); q.setFromEuler(e); s.setScalar(0.7 + 0.8 * rand(i + 4));
      grains.setMatrixAt(n++, mt.compose(p, q, s));
    }
    grains.count = n;
  }
  gR.add(grains);
  // Water (blue) and mineral salt (purple) particles: soil → root hair → into the root → up the xylem.
  const NP = 32;
  const rootDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, emissive: 0x112244, emissiveIntensity: 0.2 }), NP);
  rootDots.frustumCulled = false; rootDots.castShadow = false;
  gR.add(rootDots);
  { const c = new THREE.Color(); for (let i = 0; i < NP; i++) rootDots.setColorAt(i, c.setHex(i % 4 === 3 ? MINERAL : SUBST.water)); }
  const bare = [0, 1, 2, 3, 4, 5].map(i => { const a = i * 2.2 + 0.7, y = 1.1 + 0.3 * i; return { base: new THREE.Vector3(Math.cos(a) * ROOT_R, y, Math.sin(a) * ROOT_R), dir: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)) }; });
  const rTags = {
    hair: label('Root hair', anchor(gR, [hairs[1].tip.x, hairs[1].tip.y + 0.05, hairs[1].tip.z]), { cls: 'cool' }),
    xylem: label('Xylem', v3(RT, 0, 3.5, 0), { cls: 'cool' }),
    soil: label('Soil', v3(RT, -1.3, 0.35, -0.6)),
    water: label('Water', v3(RT, 1.25, 2.95, 0.1), { cls: 'cool' }),
    salt: label('Mineral salts', v3(RT, 1.2, 0.55, 0.1), { cls: 'warm' }),
  };

  // ================= Xylem vessel and phloem sieve tube (step 3) =================
  const gT = group(TB);
  const TP = partSet(THREE, kit);
  const CELL_H = 0.62, NCELL = 5, TY0 = 0.35;
  const XX = -0.45, PX = 0.5, XR = 0.3, PR = 0.17;
  kit.mesh(new THREE.BoxGeometry(2.2, 0.2, 1.0), kit.mat(0xf2ede0), [0.05, 0.1, 0], gT);
  const xWall = TP.mat('xylem', 0xd9c38a, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const lignin = TP.mat('xylem', 0x9a7b3c, { roughness: 0.6 });
  const pWall = TP.mat('phloem', 0x9fd18b, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const plateTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(32, 32, 31, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 9; i++) { const a = i * 0.7, r = i ? 18 : 0; x.beginPath(); x.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 5, 0, Math.PI * 2); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const plate = TP.mat('plate', 0x5f9e4a, { map: plateTex, alphaTest: 0.5, side: THREE.DoubleSide });
  const comp = TP.mat('companion', 0x6cbf7a, { roughness: 0.5 });
  const nucMat = kit.mat(0x6a3d9a);
  const ringGeo = new THREE.TorusGeometry(XR, 0.022, 5, 24), rimGeo = new THREE.TorusGeometry(XR * 0.97, 0.04, 6, 24);
  const plateGeo = new THREE.CircleGeometry(PR * 0.98, 20), compGeo = new THREE.CapsuleGeometry(0.055, CELL_H - 0.2, 3, 8);
  for (let c = 0; c < NCELL; c++) {
    const y0 = TY0 + c * CELL_H;
    const w = kit.mesh(new THREE.CylinderGeometry(XR, XR, CELL_H, 20, 1, true), xWall, [XX, y0 + CELL_H / 2, 0], gT);
    w.castShadow = false; w.renderOrder = 2;
    for (let k = 1; k < 5; k++) { const r = kit.mesh(ringGeo, lignin, [XX, y0 + k * CELL_H / 5, 0], gT); r.rotation.x = Math.PI / 2; r.castShadow = false; }
    const rim = kit.mesh(rimGeo, lignin, [XX, y0, 0], gT); rim.rotation.x = Math.PI / 2; rim.castShadow = false;
    const pw = kit.mesh(new THREE.CylinderGeometry(PR, PR, CELL_H, 16, 1, true), pWall, [PX, y0 + CELL_H / 2, 0], gT);
    pw.castShadow = false; pw.renderOrder = 2;
    const pl = kit.mesh(plateGeo, plate, [PX, y0, 0], gT); pl.rotation.x = -Math.PI / 2; pl.castShadow = false;
    const cc = kit.mesh(compGeo, comp, [PX + PR + 0.07, y0 + CELL_H / 2, 0.05], gT); cc.castShadow = false;
    kit.mesh(new THREE.SphereGeometry(0.04, 8, 6), nucMat, [PX + PR + 0.07, y0 + CELL_H / 2 + 0.06, 0.1], gT).castShadow = false;
  }
  const TOP = TY0 + NCELL * CELL_H;
  { const pl = kit.mesh(plateGeo, plate, [PX, TOP, 0], gT); pl.rotation.x = -Math.PI / 2; }
  { const rim = kit.mesh(rimGeo, lignin, [XX, TOP, 0], gT); rim.rotation.x = Math.PI / 2; }
  const xUp = [-0.12, 0.1].map((dx, j) => S(gT, { points: [[XX + dx, TY0 + 0.05, 0.05 * j], [XX + dx * 0.6, (TY0 + TOP) / 2, 0.08], [XX + dx, TOP + 0.1, 0]], count: 9, color: SUBST.water, radius: 0.055, speed: 0.16 + 0.03 * j }));
  const pDown = S(gT, { points: [[PX, TOP + 0.1, 0], [PX, (TY0 + TOP) / 2, 0.03], [PX, TY0 + 0.05, 0]], count: 8, color: SUBST.glucose, geo: sugarGeo, speed: 0.08, spin: 1 });
  TP.anchor('xylem', gT, [XX - 0.1, TOP + 0.15, 0]);
  TP.anchor('phloem', gT, [PX + 0.05, TOP + 0.5, 0]);
  TP.anchor('companion', gT, [PX + PR + 0.3, TY0 + CELL_H * 1.6, 0.05]);
  TP.anchor('plate', gT, [PX, TY0 + CELL_H * 3 + 0.05, 0.1]);
  const tTags = {
    xylem: label('Xylem vessel', TP.parts.xylem.anchor, { cls: 'cool' }),
    phloem: label('Phloem sieve tube', TP.parts.phloem.anchor, { cls: 'warm' }),
    comp: label('Companion cell', TP.parts.companion.anchor),
    plate: label('Sieve plate', TP.parts.plate.anchor),
    lignin: label('Lignin rings', v3(TB, XX - XR - 0.15, TY0 + CELL_H * 1.2, 0)),
  };

  // ================= Celery in dyed water (step 4) =================
  const gC = group(CE);
  const BEAK_R = 0.5, BEAK_H = 1.15, WATER_H = 0.78;
  const beaker = new THREE.Mesh(new THREE.CylinderGeometry(BEAK_R, BEAK_R, BEAK_H, 28, 1, true), glass);
  beaker.position.y = BEAK_H / 2; beaker.renderOrder = 4; gC.add(beaker);
  kit.mesh(new THREE.CylinderGeometry(BEAK_R, BEAK_R, 0.03, 28), glass, [0, 0.015, 0], gC).castShadow = false;
  const dyeWater = new THREE.Mesh(new THREE.CylinderGeometry(BEAK_R * 0.96, BEAK_R * 0.96, WATER_H, 28), new THREE.MeshStandardMaterial({ color: DYE, transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false }));
  dyeWater.position.y = WATER_H / 2 + 0.03; dyeWater.renderOrder = 3; gC.add(dyeWater);
  // Celery stalk: a ribbed crescent cross-section, extruded upwards. Ribs face the camera (+z).
  const crescent = (() => {
    const s = new THREE.Shape(), N = 28;
    for (let i = 0; i <= N; i++) {
      const a = (160 + 220 * i / N) * Math.PI / 180, r = 0.24 + 0.012 * Math.cos(a * 10);
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    for (let i = N; i >= 0; i--) { const a = (160 + 220 * i / N) * Math.PI / 180; s.lineTo(Math.cos(a) * 0.15, 0.09 + Math.sin(a) * 0.15); }
    return s;
  })();
  const bundles = [];
  for (let i = 0; i < 9; i++) { const a = (175 + 190 * i / 8) * Math.PI / 180; bundles.push([Math.cos(a) * 0.222, Math.sin(a) * 0.222]); }
  const STALK_Y0 = 0.06, STALK_H = 2.3;
  const stalkGeo = new THREE.ExtrudeGeometry(crescent, { depth: STALK_H, bevelEnabled: false, curveSegments: 4 });
  stalkGeo.rotateX(-Math.PI / 2);
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0x9ccc65, transparent: true, opacity: 0.8, roughness: 0.55, depthWrite: false });
  const stalk = kit.mesh(stalkGeo, stalkMat, [0, STALK_Y0, 0], gC);
  stalk.renderOrder = 2; stalk.castShadow = false;
  const strandGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 6); strandGeo.translate(0, 0.5, 0);
  const strandMat = kit.mat(DYE, { roughness: 0.5, emissive: DYE, emissiveIntensity: 0.25 });
  const strands = bundles.map(([bx, by]) => { const m = kit.mesh(strandGeo, strandMat, [bx, STALK_Y0, -by], gC); m.castShadow = false; return m; });
  const celLeafMat = kit.mat(0x5aa83a, { side: THREE.DoubleSide, roughness: 0.6 });
  const leafG = leafGeometry(THREE, 0.55, 0.3, 0.1);
  const LEAF_TOP = STALK_Y0 + STALK_H;
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45 + Math.PI / 2;
    const pet = kit.mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 6), kit.mat(0x8cc152), [Math.cos(a) * 0.12, LEAF_TOP + 0.15, -0.05 + Math.sin(a) * 0.02], gC);
    pet.rotation.z = (2 - i) * 0.35;
    // Leaflets fan out from left to right through the front (a leaf's tip points along +x before turning).
    const l = kit.mesh(leafG, celLeafMat, [0, LEAF_TOP + 0.3, -0.02], gC);
    l.rotation.order = 'YZX';
    l.rotation.set(0, -Math.PI + i * Math.PI / 4, 0.55 + (i === 2 ? 0.35 : 0));
  }
  // Cutting board with a slice of the stalk (shown with "Cut across the stalk").
  const board = kit.mesh(new THREE.BoxGeometry(0.9, 0.06, 0.7), kit.mat(0xd8b07a), [1.05, 0.03, 0.35], gC);
  const sliceG = new THREE.Group(); sliceG.position.set(1.05, 0.06, 0.35); gC.add(sliceG);
  const sliceGeo = new THREE.ExtrudeGeometry(crescent, { depth: 0.07, bevelEnabled: false, curveSegments: 4 });
  sliceGeo.rotateX(-Math.PI / 2);
  const slice = kit.mesh(sliceGeo, kit.mat(0xb7dc8a, { roughness: 0.6 }), [0, 0, 0], sliceG);
  slice.scale.set(1.5, 1, 1.5);
  const dotMat = kit.mat(0xa8cf7a, { roughness: 0.5 });
  const dotGeo = new THREE.CircleGeometry(0.03, 12);
  bundles.forEach(([bx, by]) => { const d = kit.mesh(dotGeo, dotMat, [bx * 1.5, 0.072, -by * 1.5], sliceG); d.rotation.x = -Math.PI / 2; d.castShadow = false; });
  const cTags = {
    dye: label('Dyed water', v3(CE, -0.62, 0.45, 0.4), { cls: 'warm' }),
    stalk: label('Celery stalk', v3(CE, -0.35, 1.7, 0.2), { cls: 'cool' }),
    xylem: label('Dye in xylem', anchor(gC, [bundles[4][0], 1, -bundles[4][1] + 0.02])),
    slice: label('Cut end', v3(CE, 1.05, 0.25, 0.35)),
  };

  // ================= Transpiration plant and a magnified stoma (step 5) =================
  const tplant = soilPlant(THREE, kit, { h: 2.2, pairs: 3 });
  const gTr = group(TR); gTr.add(tplant.g);
  const tLeafY = i => 2.2 * (0.35 + 0.55 * (Math.floor(i / 2) / 2));
  const xylemT = water(gTr, [arr(tplant.rootTip), [-0.5, -0.4, tplant.soilFront], [0.47, -0.55, tplant.soilFront]], tplant.leafTips, tLeafY, { count: 8 });
  const vapour = tplant.leafTips.map((tip, i) => {
    const d = new THREE.Vector3(tip.x, 0, tip.z).normalize();
    return S(gTr, { points: [[tip.x, tip.y - 0.04, tip.z], [tip.x + d.x * 0.35, tip.y + 0.1, tip.z + d.z * 0.35 + 0.15], [tip.x + d.x * 0.7, tip.y + 0.55, tip.z + d.z * 0.7 + 0.3]], count: 5, color: VAPOUR, radius: 0.04, speed: 0.22 + 0.02 * i, emissive: 0.3 });
  });
  const stoma = new THREE.Group(); stoma.position.set(1.95, 1.25, 0.3); gTr.add(stoma);
  const skinDisc = kit.mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 32), kit.mat(0xc5e3a0, { roughness: 0.7 }), [0, 0, -0.04], stoma);
  skinDisc.rotation.x = Math.PI / 2; skinDisc.castShadow = false;
  const pore = kit.mesh(new THREE.CircleGeometry(0.16, 24), new THREE.MeshBasicMaterial({ color: 0x1f3b26 }), [0, 0, 0.0], stoma);
  const guardMat = kit.mat(0x4caf50, { roughness: 0.5 });
  const guardGeo = new THREE.TorusGeometry(0.22, 0.085, 10, 20, Math.PI);
  const guards = [1, -1].map(s => { const g = kit.mesh(guardGeo, guardMat, [0, 0, 0.02], stoma); g.rotation.z = s * Math.PI / 2; g.castShadow = false; return g; });
  for (const s of [-1, 1]) for (const y of [0.1, -0.1]) kit.mesh(new THREE.SphereGeometry(0.035, 8, 6), kit.mat(0x2e7d32), [s * 0.21, y, 0.1], stoma).castShadow = false;
  const stomaVap = S(stoma, { points: [[0, 0, 0.02], [0.08, 0.2, 0.45], [0.2, 0.5, 0.85]], count: 7, color: VAPOUR, radius: 0.05, speed: 0.3, emissive: 0.3 });
  const trTags = {
    stoma: label('Stoma (magnified)', anchor(stoma, [0.1, -0.75, 0])),
    guard: label('Guard cell', anchor(stoma, [-0.42, -0.25, 0.1])),
    vap: label('Water vapour', v3(TR, -1.05, 2.55, 0.5), { cls: 'cool' }),
    stream: label('Transpiration stream', v3(TR, -0.75, 0.75, 0.1), { cls: 'cool' }),
  };
  const zoomLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([tplant.leafTips[3].clone().add(new THREE.Vector3(0.05, -0.05, 0)), new THREE.Vector3(1.4, 1.25, 0.3)]), new THREE.LineDashedMaterial({ color: 0x5a7d4a, dashSize: 0.06, gapSize: 0.05 }));
  zoomLine.computeLineDistances(); gTr.add(zoomLine);

  // ================= Potometer bench (step 6) =================
  const gF = group(PO);
  const VX = -0.7, CAP_Y = 0.6, CAP_X0 = VX, CAP_X1 = 1.75;
  kit.mesh(new THREE.BoxGeometry(3.7, 0.08, 1.2), kit.mat(0xe9dcc4), [0.35, 0.04, 0], gF);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.15, 16, 1, true), glass);
  tube.position.set(VX, 1.2, 0); tube.renderOrder = 4; gF.add(tube);
  kit.mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.15, 16), kit.mat(0x8fc9f0, { transparent: true, opacity: 0.55, depthWrite: false }), [VX, 1.2, 0], gF).castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.16, 16), kit.mat(0x7a2e2e), [VX, 1.84, 0], gF);
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, CAP_X1 - CAP_X0, 10, 1, true), glass, [(CAP_X0 + CAP_X1) / 2, CAP_Y, 0], gF).rotation.z = Math.PI / 2;
  const capWater = kit.mesh(new THREE.CylinderGeometry(0.026, 0.026, CAP_X1 - CAP_X0, 8), kit.mat(0x6fb7ea, { transparent: true, opacity: 0.7, depthWrite: false }), [(CAP_X0 + CAP_X1) / 2, CAP_Y, 0], gF);
  capWater.rotation.z = Math.PI / 2; capWater.castShadow = false;
  kit.mesh(new THREE.SphereGeometry(0.1, 12, 8), glass, [VX, CAP_Y, 0], gF);
  // Reservoir with a tap at the far end (refills the tube to reset the bubble).
  kit.mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.45, 16), glass, [CAP_X1 + 0.1, CAP_Y + 0.35, 0], gF);
  kit.mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.3, 16), kit.mat(0x8fc9f0, { transparent: true, opacity: 0.6, depthWrite: false }), [CAP_X1 + 0.1, CAP_Y + 0.28, 0], gF).castShadow = false;
  kit.mesh(new THREE.BoxGeometry(0.05, 0.12, 0.16), kit.mat(0x444444), [CAP_X1 + 0.1, CAP_Y + 0.08, 0.06], gF);
  // Scale behind the capillary tube (one mark per mm, model scale: 50 mm per unit).
  const ruler = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 48;
    const x = c.getContext('2d');
    x.fillStyle = '#fffdf3'; x.fillRect(0, 0, 512, 48);
    x.fillStyle = '#333'; x.font = '14px sans-serif'; x.textAlign = 'center';
    for (let i = 0; i <= 120; i++) {
      const px = 6 + i * (500 / 120), big = i % 10 === 0;
      x.fillRect(px, 0, 1, big ? 18 : i % 5 === 0 ? 12 : 7);
      if (big) x.fillText(String(i), px, 36);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const RULE_W = CAP_X1 - CAP_X0 - 0.1;
  kit.mesh(new THREE.PlaneGeometry(RULE_W, RULE_W * 48 / 512), kit.mat(0xffffff, { map: ruler }), [(CAP_X0 + CAP_X1) / 2 + 0.05, CAP_Y - 0.11, 0.04], gF).castShadow = false;
  const bubble = kit.mesh(new THREE.CapsuleGeometry(0.03, 0.09, 3, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, emissive: 0x9fbfd9, emissiveIntensity: 0.4 }), [CAP_X1 - 0.15, CAP_Y, 0], gF);
  bubble.rotation.z = Math.PI / 2; bubble.castShadow = false;
  // Leafy shoot.
  const shoot = new THREE.Group(); shoot.position.set(VX, 1.9, 0); gF.add(shoot);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.1, 8), kit.mat(0x4f8f2f), [0, 0.55, 0], shoot);
  const shootLeaf = kit.mat(0x3f9e3a, { side: THREE.DoubleSide });
  const sLeafG = leafGeometry(THREE, 0.5, 0.26, 0.12);
  for (let i = 0; i < 7; i++) { const l = kit.mesh(sLeafG, shootLeaf, [0, 0.25 + i * 0.12, 0], shoot); l.rotation.set(0, i * 2.4, 0.45); l.scale.setScalar(1 - i * 0.07); }
  // Lamp, fan, thermometer and mist for humidity.
  const lamp = new THREE.Group(); lamp.position.set(-1.45, 3.05, 0.35); gF.add(lamp);
  kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.05, 6), kit.mat(0x555555), [-0.25, -1.5, -0.2], lamp);
  const shade = kit.mesh(new THREE.ConeGeometry(0.25, 0.3, 20, 1, true), kit.mat(0x2f6f9f, { side: THREE.DoubleSide }), [0, 0, 0], lamp);
  shade.rotation.z = -0.6;
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd34d, emissiveIntensity: 1 });
  const bulb = kit.mesh(new THREE.SphereGeometry(0.1, 14, 10), bulbMat, [0.06, -0.08, 0], lamp); bulb.castShadow = false;
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 20, 1, true), beamMat);
  beam.position.set(0.38, -0.5, 0); beam.rotation.z = -0.6; beam.renderOrder = 5; lamp.add(beam);
  const fan = new THREE.Group(); fan.position.set(0.55, 2.3, 0.15); gF.add(fan);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.04, 2.25, 6), kit.mat(0x666666), [0, -1.12, 0], fan);
  kit.mesh(new THREE.TorusGeometry(0.36, 0.015, 4, 28), kit.mat(0x888888), [0, 0, 0], fan).rotation.y = Math.PI / 2;
  const rotor = new THREE.Group(); fan.add(rotor);
  kit.mesh(new THREE.SphereGeometry(0.06, 10, 8), kit.mat(0x444444), [0, 0, 0], rotor);
  for (let i = 0; i < 3; i++) {
    const b = kit.mesh(new THREE.BoxGeometry(0.02, 0.3, 0.1), kit.mat(0x5fa8d3), [0, Math.cos(i * 2.094) * 0.18, Math.sin(i * 2.094) * 0.18], rotor);
    b.rotation.x = -i * 2.094; b.rotation.y = 0.4;
  }
  const thermo = new THREE.Group(); thermo.position.set(1.3, 0.75, 0.35); gF.add(thermo);
  kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 12, 1, true), glass, [0, 0.55, 0], thermo);
  kit.mesh(new THREE.SphereGeometry(0.07, 12, 8), kit.mat(0xd62828), [0, 0, 0], thermo);
  const mercury = kit.mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 8), kit.mat(0xd62828), [0, 0.05, 0], thermo);
  mercury.geometry.translate(0, 0.5, 0); mercury.castShadow = false;
  const mistMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
  const mist = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), mistMat, 22);
  mist.frustumCulled = false; mist.castShadow = false; gF.add(mist);
  const fTags = {
    bubble: label('Air bubble', anchor(bubble, [0, 0, 0])),
    shoot: label('Leafy shoot', v3(PO, VX - 0.45, 2.75, 0), { cls: 'cool' }),
    lamp: label('Lamp', anchor(lamp, [0, 0.25, 0]), { cls: 'warm' }),
    fan: label('Fan', anchor(fan, [0, 0.45, 0])),
    thermo: label('Thermometer', anchor(thermo, [0, 1.25, 0])),
    scale: label('Scale (mm)', v3(PO, 0.9, 0.36, 0.1)),
  };

  // ================= State and controls =================
  const allTags = [pTags, rTags, tTags, cTags, trTags, fTags].flatMap(o => Object.values(o));
  const st = { step: 0, quiz: false, time: 0, auto: false, flows: 'both', season: 'summer', season01: 0,
    hairs: 0, hairsShown: 0, hours: 0, cut: false, open: 1, openTo: 1, light: 60, temp: 20, wind: 0, hum: 50, bubbleX: CAP_X1 - 0.15, slider: null, row: null, toggle: null, rootPhase: 0, mistT: 0 };
  const showOnly = list => { for (const s of all) s.mesh.visible = false; for (const s of list) s.mesh.visible = true; };
  const areaRatio = n => { let a = bareArea; for (let i = 0; i < n; i++) a += hairs[i].area; return a / bareArea; };

  function setFlows(which) {
    st.flows = which;
    const x = which !== 'phloem', p = which !== 'xylem';
    showOnly([...(x ? xylemP : []), ...(p ? summer : [])]);
    pTags.xylem.show(x); pTags.phloem.show(p);
    ui.readout(`${x ? '<b>Xylem</b>: water and mineral salts, from the roots <b>up</b> to the leaves.<br>' : ''}${p ? '<b>Phloem</b>: dissolved sugars, from the leaves to the roots, the tuber and the growing tip.' : ''}`);
  }
  function setHairs(n) {
    st.hairs = n;
    for (let i = 0; i < HAIRS; i++) hairs[i].m.visible = i < n;
    const r = areaRatio(n);
    ui.readout(`Root hairs: <b>${n}</b><br>Surface area: <b>${r.toFixed(1)} ×</b> the bare root (this model)<br>So this root tip can take in about <b>${r.toFixed(1)} times</b> as much water.`);
  }
  function setTube(which) {
    TP.select(which === 'xylem' ? ['xylem'] : ['phloem', 'plate', 'companion']);
    tTags.lignin.show(which === 'xylem'); tTags.plate.show(which === 'phloem'); tTags.comp.show(which === 'phloem');
    ui.readout(which === 'xylem'
      ? '<b>Xylem vessel</b>: dead, hollow cells joined end to end with no end walls. Walls stiffened with <b>lignin</b>. Carries water and mineral salts <b>up only</b>.'
      : '<b>Phloem sieve tube</b>: living cells joined end to end. End walls are <b>sieve plates</b> full of holes. A <b>companion cell</b> beside each keeps it alive. Carries dissolved sugars <b>up or down</b>.');
  }
  function setHours(h) {
    st.hours = h;
    const f = Math.min(1, h / FULL_H);
    for (const s of strands) s.scale.y = Math.max(0.001, 0.05 + f * (STALK_H - 0.05));
    cTags.xylem.at.position.y = STALK_Y0 + 0.05 + f * (STALK_H - 0.05) * 0.85;
    const tint = kit.clamp((h - FULL_H) / 12, 0, 1);
    celLeafMat.color.setHex(0x5aa83a).lerp(new THREE.Color(DYE), tint * 0.55);
    dotMat.color.setHex(h > 0.2 ? DYE : 0xa8cf7a);
    const cm = Math.round(f * STALK_CM);
    ui.readout(`Time: <b>${h} h</b><br>Dye has climbed about <b>${cm} cm</b> up the ${STALK_CM} cm stalk (model)${tint > 0 ? `<br>Leaves: <b>${tint < 0.5 ? 'starting to change colour' : 'clearly coloured'}</b>` : ''}`);
  }
  function setCut(v) { st.cut = v; sliceG.visible = v; cTags.slice.show(v && !st.quiz); }
  const transRate = () => 10 * (0.25 + 0.75 * st.light / 100) * (0.4 + 1.2 * (st.temp - 10) / 25) * (1 + 0.06 * st.wind) * (1.1 - st.hum / 100);
  function potoReadout() {
    const r = transRate();
    ui.readout(`Bubble speed: about <b>${r.toFixed(1)} mm per minute</b> (model)<br>${r > 12 ? 'Fast: the shoot is losing water quickly.' : r < 2 ? 'Very slow: the shoot is losing very little water.' : 'The faster the bubble, the faster the shoot takes up (and loses) water.'}`);
  }
  function setSeason(s) {
    st.season = s;
    showOnly(s === 'summer' ? summer : spring);
    pTags.leaves.text = s === 'summer' ? 'Source: leaves' : 'Sink: young leaves';
    pTags.tuber.text = s === 'summer' ? 'Sink: tuber' : 'Source: tuber';
    ui.readout(s === 'summer'
      ? '<b>Summer</b>: the big leaves make more sugar than they need. Source: <b>leaves</b>. Sinks: the <b>tuber</b> (stores it as starch), the roots and the growing tip.'
      : '<b>Spring</b>: the young leaves are too small to make enough food. Source: the <b>tuber</b>, whose starch is turned back into sugar. Sinks: the <b>bud and young leaves</b>.');
  }
  function setOpen(v) {
    st.openTo = v ? 1 : 0;
    ui.readout(v ? '<b>Stomata open</b>: water vapour diffuses out of the leaves, and water is pulled up the xylem to replace it.' : '<b>Stomata closed</b>: very little water vapour escapes, so the pull on the water in the xylem almost stops.');
  }

  const F = {
    plant: { radius: 2.2, yaw: 0.22, pitch: 0.14, target: [0, 1.7, 0.2] },
    root: { radius: 1.9, yaw: 0.0, pitch: 0.12, target: [8, 1.85, 0] },
    tube: { radius: 2.15, yaw: -0.15, pitch: 0.12, target: [16.05, 2.1, 0] },
    celery: { radius: 1.75, yaw: 0.2, pitch: 0.2, target: [24.3, 1.35, 0] },
    trans: { radius: 2.4, yaw: 0.1, pitch: 0.14, target: [32.8, 1.65, 0.2] },
    poto: { radius: 1.9, width: 2.0, yaw: 0.12, pitch: 0.16, target: [40.25, 1.75, 0] },
    quiz: { radius: 2.3, yaw: -0.35, pitch: 0.22, target: [0, 1.65, 0] },
  };
  const centres = [0, 8, 16, 24, 32, 40, 0];

  return {
    step(i, { isQuiz }) {
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: false, slider: null, row: null, toggle: null });
      for (const t of allTags) t.show(false);
      TP.select([]);
      for (const l of plant.leaves) l.scale.setScalar(leafBase.get(l));
      showOnly([]);
      const cx = isQuiz ? 0 : centres[i];
      sun.position.set(cx + 6, 10, 6); sun.target.position.set(cx, 0, 0);
      if (i === 0) {
        view(F.plant);
        pTags.roots.show(true);
        st.row = ui.buttons([{ label: 'Xylem', onClick: () => { st.auto = false; setFlows('xylem'); } }, { label: 'Phloem', onClick: () => { st.auto = false; setFlows('phloem'); } }, { label: 'Both', on: true, onClick: () => { st.auto = false; setFlows('both'); } }]);
        setFlows('both');
      }
      if (i === 1) {
        view(F.root);
        for (const k of ['hair', 'xylem', 'soil', 'water', 'salt']) rTags[k].show(true);
        st.auto = true; st.hairsShown = 0;
        st.slider = ui.slider({ label: 'Root hairs', min: 0, max: HAIRS, step: 1, value: 0, onInput: v => { st.auto = false; setHairs(v); } });
        setHairs(0);
      }
      if (i === 2) {
        view(F.tube);
        showOnly([...xUp, pDown]);
        tTags.xylem.show(true); tTags.phloem.show(true);
        st.auto = true;
        st.row = ui.buttons([{ label: 'Xylem vessel', on: true, onClick: () => { st.auto = false; setTube('xylem'); } }, { label: 'Phloem tube', onClick: () => { st.auto = false; setTube('phloem'); } }]);
        setTube('xylem');
      }
      if (i === 3) {
        view(F.celery);
        for (const k of ['dye', 'stalk', 'xylem']) cTags[k].show(true);
        st.auto = true;
        st.slider = ui.slider({ label: 'Time', min: 0, max: 24, step: 0.5, value: 0, unit: ' h', onInput: v => { st.auto = false; setHours(v); } });
        st.toggle = ui.toggle({ label: 'Cut across the stalk', value: false, onChange: v => { st.auto = false; setCut(v); } });
        setHours(0); setCut(false);
      }
      if (i === 4) {
        view(F.trans);
        showOnly([...xylemT, ...vapour, stomaVap]);
        for (const t of Object.values(trTags)) t.show(true);
        st.auto = true; st.open = st.openTo = 1;
        st.toggle = ui.toggle({ label: 'Stomata open', value: true, onChange: v => { st.auto = false; setOpen(v); } });
        setOpen(true);
      }
      if (i === 5) {
        view(F.poto);
        for (const t of Object.values(fTags)) t.show(true);
        Object.assign(st, { light: 60, temp: 20, wind: 0, hum: 50 });
        ui.slider({ label: 'Light', min: 0, max: 100, step: 5, value: st.light, unit: '%', onInput: v => { st.light = v; potoReadout(); } });
        ui.slider({ label: 'Temperature', min: 10, max: 35, step: 1, value: st.temp, unit: ' °C', onInput: v => { st.temp = v; potoReadout(); } });
        ui.slider({ label: 'Wind', min: 0, max: 20, step: 1, value: st.wind, unit: ' km/h', onInput: v => { st.wind = v; potoReadout(); } });
        ui.slider({ label: 'Humidity', min: 20, max: 95, step: 5, value: st.hum, unit: '%', onInput: v => { st.hum = v; potoReadout(); } });
        potoReadout();
      }
      if (i === 6) {
        view(F.plant);
        pTags.tuber.show(true); pTags.leaves.show(true);
        st.auto = true;
        st.row = ui.buttons([{ label: 'Summer', on: true, onClick: () => { st.auto = false; setSeason('summer'); } }, { label: 'Spring', onClick: () => { st.auto = false; setSeason('spring'); } }]);
        setSeason('summer');
      }
      if (isQuiz) {
        view(F.quiz);
        showOnly([...xylemP, ...summer]);
      }
      // Reset the potometer and celery when leaving them, so they look tidy from far away.
      if (i !== 3) { setCutQuiet(false); }
    },

    update(dt) {
      st.time += dt;
      const t = st.time;
      // Auto demos: each step plays by itself until the learner takes over.
      if (st.auto && !st.quiz) {
        if (st.step === 1) {
          const n = Math.min(HAIRS, Math.floor(Math.max(0, t - 0.8) * 9));
          if (n !== st.hairs) { setHairs(n); st.slider?.set(n); }
          if (n >= HAIRS) st.auto = false;
        }
        if (st.step === 2) {
          const which = Math.floor(t / 4) % 2 ? 'phloem' : 'xylem';
          if ((which === 'xylem') !== TP.selected.includes('xylem')) { setTube(which); st.row?.select(which === 'xylem' ? 0 : 1); }
        }
        if (st.step === 3) {
          const h = Math.min(24, Math.floor(Math.max(0, t - 0.5) * 3) / 2);
          if (h !== st.hours) { setHours(h); st.slider?.set(h); }
          if (h >= 24 && !st.cut) { setCut(true); if (st.toggle) st.toggle.checked = true; st.auto = false; }
        }
        if (st.step === 4) {
          const open = (t % 9) < 5.5;
          if (open !== (st.openTo === 1)) { setOpen(open); if (st.toggle) st.toggle.checked = open; }
        }
        if (st.step === 6) {
          const s = Math.floor(t / 6) % 2 ? 'spring' : 'summer';
          if (s !== st.season) { setSeason(s); st.row?.select(s === 'summer' ? 0 : 1); }
        }
      }
      // Streams.
      for (const s of all) if (s.mesh.visible) s.update(dt);
      // Root tip particles.
      if (st.step === 1 && !st.quiz) updateRoot(dt);
      // Spring: young leaves at the top are small; summer: full size.
      if (st.step === 6) {
        kit.follow(st, 'season01', st.season === 'spring' ? 1 : 0, dt, 3);
        plant.leaves.forEach((l, j) => l.scale.setScalar(leafBase.get(l) * (j >= 4 ? 1 - 0.55 * st.season01 : 1)));
      }
      // Stoma opening.
      if (st.step === 4) {
        kit.follow(st, 'open', st.openTo, dt, 3);
        const s = 0.22 + 0.78 * st.open;
        for (const g of guards) g.scale.set(s, 1, 1);
        pore.scale.set(Math.max(0.02, s * 0.9), 1, 1);
        for (const v of vapour) v.rate = st.open;
        stomaVap.rate = st.open; stomaVap.size = st.open;
        for (const x of xylemT) x.rate = 0.06 + 0.94 * st.open;
      }
      // Potometer: lamp, fan, thermometer, mist and the bubble (1 s of animation = 1 minute; 50 mm per unit).
      if (st.step === 5) {
        bulbMat.emissiveIntensity = 0.1 + 1.6 * st.light / 100;
        beamMat.opacity = 0.03 + 0.25 * st.light / 100;
        rotor.rotation.x -= dt * st.wind * 1.2;
        mercury.scale.y = 0.15 + 0.85 * st.temp / 40;
        mistMat.opacity = 0.02 + 0.3 * (st.hum - 20) / 75;
        st.mistT += dt * (0.3 + st.wind * 0.08);
        const mt = M4, p = P3;
        for (let k = 0; k < 22; k++) {
          const a = k * 2.4 + st.mistT * (0.3 + rand(k) * 0.4);
          p.set(VX + Math.cos(a) * (0.35 + rand(k + 5) * 0.35) + Math.sin(st.mistT + k) * 0.05, 2.0 + rand(k + 2) * 0.9, Math.sin(a) * (0.35 + rand(k + 5) * 0.3));
          mist.setMatrixAt(k, mt.makeTranslation(p.x, p.y, p.z));
        }
        mist.instanceMatrix.needsUpdate = true;
        st.bubbleX -= dt * transRate() / 50;
        if (st.bubbleX < CAP_X0 + 0.2) st.bubbleX = CAP_X1 - 0.15;
        bubble.position.x = st.bubbleX;
      }
      return true;
    },
  };

  function setCutQuiet(v) { st.cut = v; sliceG.visible = v; }

  function updateRoot(dt) {
    st.rootPhase += dt * 0.16;
    const n = st.hairs, active = Math.min(NP, Math.round(7 * areaRatio(n)));
    for (let k = 0; k < NP; k++) {
      if (k >= active) { rootDots.setMatrixAt(k, M4.makeScale(0, 0, 0)); continue; }
      const u = (st.rootPhase + rand(k + 40) + k / NP) % 1;
      let A, B;
      if (n > 0) { const hr = hairs[(k * 7) % n]; A = hr.tip; B = hr.base; D3.copy(hr.dir); }
      else { const b = bare[k % bare.length]; A = b.base; B = b.base; D3.copy(b.dir); }
      // Path: soil (beyond the hair tip) → hair tip → hair base → core → up the core.
      if (u < 0.3) P3.copy(A).addScaledVector(D3, 0.45 * (1 - u / 0.3));
      else if (u < 0.55) P3.lerpVectors(A, B, (u - 0.3) / 0.25);
      else if (u < 0.65) { Q3.set(0, B.y, 0); P3.lerpVectors(B, Q3, (u - 0.55) / 0.1); }
      else P3.set(0, B.y + (ROOT_Y1 - 0.05 - B.y) * (u - 0.65) / 0.35, 0);
      const s = Math.min(1, u / 0.06, (1 - u) / 0.06);
      rootDots.setMatrixAt(k, M4.compose(P3, QI, S3.setScalar(Math.max(0.001, s))));
    }
    rootDots.instanceMatrix.needsUpdate = true;
  }
}

