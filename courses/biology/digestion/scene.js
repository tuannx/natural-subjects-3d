// Digestion: a see-through body with the digestive organs that light up one by one; a food cube cut into smaller
// pieces (surface area = pieces × 6 × side²); enzymes snipping starch, a protein and a fat into small molecules;
// a squeezing oesophagus (peristalsis); bile breaking a fat drop into droplets next to the liver, gall bladder
// and pancreas; villi absorbing nutrients into the blood; and a timeline slider for food moving through the gut.
import { partSet } from '../_shared/cells.js';
import { glucoseGeometry } from '../_shared/plants.js';
import { torso, taperTube, flow, rand, BODY } from '../_shared/body.js';

const ME = [6, 0, 0];   // mechanical digestion (food cube)
const EN = [12, 0, 0];  // enzymes
const PE = [18, 0, 0];  // peristalsis (oesophagus, magnified)
const VI = [24, 0, 0];  // villi (magnified)
const CUBE = 1.2;       // the 2 cm food cube, in scene units
const ORGANS = [
  ['mouth', 'Mouth', 'Teeth cut and grind food into small pieces. <b>Saliva</b> wets it, and the enzyme <b>amylase</b> in saliva starts digesting starch.'],
  ['oesophagus', 'Oesophagus', 'A muscular tube, about <b>25 cm</b> long, that pushes food down to the stomach by <b>peristalsis</b>.'],
  ['stomach', 'Stomach', 'A stretchy, muscular bag. It churns food with <b>hydrochloric acid</b> and the enzyme <b>pepsin</b>, which starts digesting proteins.'],
  ['small', 'Small intestine', 'About <b>6 m</b> long, coiled up. Digestion finishes here, and the small food molecules are <b>absorbed into the blood</b>.'],
  ['large', 'Large intestine', 'About <b>1.5 m</b> long and wider. It absorbs <b>water</b> from what is left. The waste (faeces) leaves through the anus.'],
  ['liver', 'Liver', 'Makes <b>bile</b>, which is stored in the gall bladder and flows into the small intestine to break up fats.'],
  ['pancreas', 'Pancreas', 'Makes <b>pancreatic juice</b>, full of enzymes (amylase, proteases and lipase), which flows into the small intestine.'],
];
const MOLS = {
  starch: { name: 'Starch', enzyme: 'Amylase', small: 'glucose', txt: '<b>Starch → sugars → glucose</b>. Enzyme: <b>amylase</b> (in saliva and pancreatic juice) breaks starch into sugars, and enzymes in the small intestine finish the job.' },
  protein: { name: 'Protein', enzyme: 'Protease', small: 'amino acids', txt: '<b>Protein → amino acids</b>. Enzymes: <b>proteases</b>, such as pepsin in the stomach and others from the pancreas.' },
  fat: { name: 'Fat', enzyme: 'Lipase', small: 'fatty acids and glycerol', txt: '<b>Fat → fatty acids + glycerol</b>. Enzyme: <b>lipase</b>, from the pancreas.' },
};
// Timeline: slider value 0–100 → where the food is. Times are rough textbook averages ("about").
const STAGES = [
  { v: 0, h: 0, organ: 'mouth', name: 'Mouth', txt: 'chewed and mixed with saliva for about a minute.' },
  { v: 4, h: 1 / 60, organ: 'oesophagus', name: 'Oesophagus', txt: 'squeezed down to the stomach in a few seconds.' },
  { v: 8, h: 0.02, organ: 'stomach', name: 'Stomach', txt: 'churned with acid and pepsin for about <b>2 to 4 hours</b>, until it is a thick liquid.' },
  { v: 35, h: 3, organ: 'small', name: 'Small intestine', txt: 'digested and absorbed over about <b>3 to 6 hours</b>.' },
  { v: 60, h: 8, organ: 'large', name: 'Large intestine', txt: 'water is absorbed over about <b>1 to 2 days</b>. Helpful bacteria live here.' },
  { v: 96, h: 40, organ: 'large', name: 'Rectum and anus', txt: 'the faeces are stored in the rectum, then leave through the anus (egestion).' },
  { v: 100, h: 48, organ: 'large', name: '', txt: '' },
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xe8e2d6, sky: 0xeaf2fb, radius: 40 });
  ground.position.x = 12;
  const sun = kit.lights(scene, { sun: [4, 10, 7] });
  scene.add(sun.target);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => V(...p)));
  const group = p => { const g = new THREE.Group(); g.position.set(...p); scene.add(g); return g; };
  const anchor = (parent, pos) => { const o = new THREE.Object3D(); o.position.set(...pos); parent.add(o); return o; };
  const M4 = new THREE.Matrix4(), P3 = new THREE.Vector3(), Q3 = new THREE.Vector3(), S3 = new THREE.Vector3(), QI = new THREE.Quaternion(), E3 = new THREE.Euler(), QT = new THREE.Quaternion();
  const flows = [];

  // ================= The body and its digestive organs =================
  const gB = group([0, 0, 0]);
  const body = torso(THREE, kit);
  gB.add(body.g);
  const OP = partSet(THREE, kit);
  const tube = (name, c, r, color, segs = 64, radial = 10, opts = {}) => {
    const t = taperTube(THREE, c, { segs, radial, r: typeof r === 'number' ? () => r : r });
    const m = kit.mesh(t.geo, OP.mat(name, color, { roughness: 0.55, ...opts }), [0, 0, 0], gB);
    m.castShadow = false;
    return m;
  };
  const mouth = kit.mesh(new THREE.SphereGeometry(1, 16, 10), OP.mat('mouth', 0xe06c75, { roughness: 0.5 }), [0, 3.47, 0.27], gB);
  mouth.scale.set(0.14, 0.055, 0.09);
  const oesoC = curve([[0, 3.42, 0.2], [0, 3.15, 0.05], [0.02, 2.6, -0.02], [0.08, 2.25, 0], [0.13, 2.12, 0.02]]);
  tube('oesophagus', oesoC, 0.045, 0xe8918a);
  const stomC = curve([[0.13, 2.12, 0.02], [0.32, 2.06, 0.06], [0.43, 1.86, 0.1], [0.34, 1.64, 0.12], [0.12, 1.6, 0.13], [-0.05, 1.67, 0.12]]);
  tube('stomach', stomC, u => 0.07 + 0.15 * Math.sin(Math.PI * (0.15 + 0.85 * u)), 0xec8f86, 48, 16);
  const duoC = curve([[-0.05, 1.67, 0.12], [-0.2, 1.62, 0.09], [-0.24, 1.45, 0.06], [-0.1, 1.33, 0.05], [0.1, 1.33, 0.04]]);
  tube('small', duoC, 0.05, 0xf3b29a);
  // Small intestine: a long tube that snakes back and forth in rows, so it looks coiled.
  const coil = [[0.1, 1.33, 0.04], [0.32, 1.22, 0.1]];
  for (let row = 0; row < 6; row++) {
    const y = 1.17 - row * 0.115, dir = row % 2 ? 1 : -1;
    for (let k = 0; k <= 4; k++) {
      const x = dir * (0.36 - 0.18 * k);
      coil.push([x, y + 0.03 * Math.sin(k * 1.7 + row), 0.12 + 0.09 * Math.sin(k * 2.1 + row * 1.3)]);
    }
  }
  coil.push([-0.34, 0.5, 0.12], [-0.5, 0.52, 0.12]);
  const smallC = curve(coil);
  tube('small', smallC, 0.042, 0xf3b29a, 360, 8);
  const largeC = curve([[-0.52, 0.48, 0.12], [-0.56, 0.9, 0.13], [-0.55, 1.25, 0.15], [-0.45, 1.36, 0.2], [0, 1.31, 0.22], [0.45, 1.38, 0.18], [0.56, 1.25, 0.13], [0.57, 0.8, 0.12], [0.5, 0.45, 0.12], [0.3, 0.33, 0.12], [0.06, 0.3, 0.06], [0, 0.12, 0.02], [0, 0.0, 0]]);
  tube('large', largeC, u => (u < 0.86 ? 0.085 : 0.085 - 0.04 * (u - 0.86) / 0.14), 0xd99a6c, 200, 12);
  const liver = kit.mesh(new THREE.SphereGeometry(1, 24, 16), OP.mat('liver', BODY.liver, { roughness: 0.5 }), [-0.3, 1.98, 0.05], gB);
  liver.scale.set(0.46, 0.2, 0.27); liver.rotation.z = -0.18;
  const gall = kit.mesh(new THREE.SphereGeometry(1, 14, 10), OP.mat('gall', 0x4f9d48, { roughness: 0.45 }), [-0.2, 1.79, 0.25], gB);
  gall.scale.set(0.055, 0.085, 0.055);
  tube('gall', curve([[-0.2, 1.72, 0.24], [-0.21, 1.6, 0.14], [-0.21, 1.5, 0.08]]), 0.014, 0x4f9d48, 12, 6);
  tube('pancreas', curve([[-0.14, 1.46, 0.0], [0.08, 1.49, -0.03], [0.36, 1.55, -0.08]]), u => 0.065 - 0.03 * u, 0xf0c36a, 24, 10);
  OP.anchor('mouth', gB, [0.18, 3.52, 0.3]);
  OP.anchor('oesophagus', gB, [-0.08, 2.75, 0]);
  OP.anchor('stomach', gB, [0.48, 1.95, 0.12]);
  OP.anchor('small', gB, [0, 0.85, 0.25]);
  OP.anchor('large', gB, [0.6, 0.75, 0.15]);
  OP.anchor('liver', gB, [-0.45, 2.12, 0.2]);
  OP.anchor('pancreas', gB, [0.3, 1.58, -0.05]);
  OP.anchor('gall', gB, [-0.27, 1.82, 0.3]);
  const organTag = {};
  for (const [k, n] of ORGANS) organTag[k] = label(n, OP.parts[k].anchor, { cls: k === 'liver' || k === 'pancreas' ? 'warm' : '' });
  organTag.gall = label('Gall bladder', OP.parts.gall.anchor, { cls: 'cool' });
  const duoTag = label('Duodenum', anchor(gB, [-0.32, 1.42, 0.1]));
  // Bile (green) and pancreatic juice (purple) flowing into the duodenum.
  const bileFlow = flow(THREE, gB, { points: [[-0.2, 1.79, 0.27], [-0.21, 1.62, 0.16], [-0.21, 1.5, 0.1], [-0.2, 1.45, 0.08]], count: 6, radius: 0.022, color: 0x5cb85c, speed: 0.35 });
  const juiceFlow = flow(THREE, gB, { points: [[0.34, 1.55, -0.04], [0.1, 1.5, 0.0], [-0.12, 1.47, 0.04], [-0.19, 1.47, 0.07]], count: 6, radius: 0.022, color: 0x9575cd, speed: 0.3 });
  flows.push(bileFlow, juiceFlow);
  // Magnified view of fat in the small intestine: bile breaks one drop into many droplets.
  const lens = new THREE.Group(); lens.position.set(1.2, 1.55, 0.3); gB.add(lens);
  const lensGlass = new THREE.Mesh(new THREE.SphereGeometry(0.44, 28, 18), new THREE.MeshStandardMaterial({ color: 0xfbe3d8, transparent: true, opacity: 0.25, roughness: 0.2, depthWrite: false }));
  lensGlass.renderOrder = 4; lens.add(lensGlass);
  const lensRim = kit.mesh(new THREE.TorusGeometry(0.44, 0.02, 6, 40), kit.mat(0x9a8f86), [0, 0, 0], lens); lensRim.castShadow = false;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), kit.mat(0xf5c542, { roughness: 0.3, emissive: 0x6b4f00, emissiveIntensity: 0.2 }), 64);
  drops.frustumCulled = false; drops.castShadow = false; lens.add(drops);
  const zoom = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-0.12, 1.45, 0.1), V(0.78, 1.55, 0.3)]), new THREE.LineDashedMaterial({ color: 0x8a7f76, dashSize: 0.04, gapSize: 0.03 }));
  zoom.computeLineDistances(); gB.add(zoom);
  const lensTag = label('Fat droplets (magnified)', anchor(lens, [0, 0.5, 0]));
  // Food marker for the timeline.
  const food = kit.mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb000, emissiveIntensity: 0.6 }), [0, 3.47, 0.27], gB);
  food.castShadow = false;
  const foodTag = label('Food', anchor(food, [0, 0.08, 0]), { cls: 'warm' });

  // ================= Mechanical digestion: a food cube cut into pieces =================
  const gM = group(ME);
  kit.mesh(new THREE.CylinderGeometry(1.3, 1.15, 0.08, 40), kit.mat(0xffffff, { roughness: 0.3 }), [0, 0.6, 0], gM);
  kit.mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.56, 24), kit.mat(0xb5c7d6), [0, 0.28, 0], gM);
  const breadTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#efd29a'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 70; i++) { x.fillStyle = rand(i) > 0.5 ? '#e2bd7a' : '#f7e2b5'; x.beginPath(); x.arc(rand(i + 1) * 64, rand(i + 2) * 64, 1 + rand(i + 3) * 2.5, 0, 6.3); x.fill(); }
    x.strokeStyle = '#b07a3a'; x.lineWidth = 4; x.strokeRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), kit.mat(0xffffff, { map: breadTex, roughness: 0.85 }), 125);
  cubes.frustumCulled = false; cubes.castShadow = true; gM.add(cubes);
  const sideTag = label('2 cm', V(ME[0] + CUBE / 2 + 0.2, 0.64 + CUBE / 2, 0.65));
  const cubeTag = label('Same amount of food', V(ME[0], 2.05, 0), { cls: 'warm' });

  // ================= Enzymes: big molecules into small ones =================
  const gE = group(EN);
  kit.mesh(new THREE.BoxGeometry(3.6, 0.12, 1.4), kit.mat(0xe6eef7), [0, 0.06, 0], gE);
  const EY = 1.15;
  const enzGeo = new THREE.SphereGeometry(0.24, 24, 16, 0.5, Math.PI * 2 - 1.0);
  const enzyme = kit.mesh(enzGeo, kit.mat(0x2fbf71, { roughness: 0.45, side: THREE.DoubleSide }), [1.8, EY, 0.0], gE);
  enzyme.rotation.y = 0.4; // the open mouth faces -x (the way it moves), turned a little towards the viewer
  const enzTag = label('Amylase', anchor(enzyme, [0, 0.3, 0]), { cls: 'cool' });
  const bondGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 6);
  bondGeo.rotateZ(Math.PI / 2);
  const bondMat = kit.mat(0x8a8f99);
  const molecule = (kind) => {
    const g = new THREE.Group(); g.visible = false; gE.add(g);
    const units = [], bonds = [];
    const addUnit = (mesh, x, y) => { const u = new THREE.Group(); u.position.set(x, y, 0); u.add(mesh); g.add(u); units.push({ g: u, home: V(x, y, 0), free: 0 }); return u; };
    const addBond = (x0, x1, y, frees) => { const b = kit.mesh(bondGeo, bondMat, [(x0 + x1) / 2, y, 0], g); b.scale.x = Math.abs(x1 - x0); b.castShadow = false; bonds.push({ m: b, x: (x0 + x1) / 2, frees }); };
    if (kind === 'starch' || kind === 'protein') {
      const N = 9, dx = 0.32, x0 = -((N - 1) * dx) / 2;
      const cols = [0xe76f51, 0x2a9d8f, 0x8e6fd8, 0xf4a261, 0x457b9d];
      const hex = glucoseGeometry(THREE, 0.12), ball = new THREE.SphereGeometry(0.11, 14, 10);
      const hexMat = kit.mat(0xf2a516, { roughness: 0.45 });
      const ballMats = cols.map(c => kit.mat(c, { roughness: 0.45 }));
      for (let k = 0; k < N; k++) {
        const m = kind === 'starch' ? new THREE.Mesh(hex, hexMat) : new THREE.Mesh(ball, ballMats[(k * 3 + 1) % cols.length]);
        if (kind === 'starch') m.rotation.x = Math.PI / 2;
        addUnit(m, x0 + k * dx, EY);
      }
      // Bonds are cut from the right-hand end, one by one.
      for (let k = N - 2; k >= 0; k--) addBond(x0 + k * dx + 0.1, x0 + (k + 1) * dx - 0.1, EY, k === 0 ? [0, 1] : [k + 1]);
    } else {
      const gx = -0.75;
      const glyc = new THREE.Group();
      glyc.add(kit.mesh(new THREE.BoxGeometry(0.12, 0.66, 0.12), kit.mat(0x4cc9f0)));
      for (const y of [-0.24, 0, 0.24]) glyc.add(kit.mesh(new THREE.SphereGeometry(0.07, 10, 8), kit.mat(0x4cc9f0), [0.06, y, 0]));
      addUnit(glyc, gx, EY);
      const faMat = kit.mat(0xf9c74f, { roughness: 0.45 });
      [0.24, 0, -0.24].forEach((y, k) => {
        const pts = [];
        for (let j = 0; j <= 8; j++) pts.push(V(j * 0.15, (j % 2 ? 0.05 : -0.05), 0));
        const fa = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.035, 6), faMat);
        const u = addUnit(fa, gx + 0.3, EY + y);
        addBond(gx + 0.07, gx + 0.3, EY + y, [k + 1]);
        u.position.x = gx + 0.3;
      });
      bonds.reverse();
      bonds[bonds.length - 1].frees.push(0);
    }
    return { g, units, bonds };
  };
  const mols = { starch: molecule('starch'), protein: molecule('protein'), fat: molecule('fat') };
  const molTag = label('Starch', V(EN[0] - 1.4, EY + 0.45, 0), { cls: 'warm' });

  // ================= Peristalsis: a magnified oesophagus =================
  const gP = group(PE);
  const PTOP = 3.7, PBOT = 0.75, PR = 0.3;
  const pC = curve([[0, PTOP, 0], [0, (PTOP + PBOT) / 2, 0], [0, PBOT, 0]]);
  const oeso = taperTube(THREE, pC, { segs: 72, radial: 20, r: () => PR });
  const oesoMat = new THREE.MeshStandardMaterial({ color: 0xe8918a, transparent: true, opacity: 0.55, roughness: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const oesoMesh = new THREE.Mesh(oeso.geo, oesoMat); oesoMesh.renderOrder = 3; gP.add(oesoMesh);
  const stomBlob = kit.mesh(new THREE.SphereGeometry(0.55, 24, 16), kit.mat(0xec8f86, { roughness: 0.55 }), [0.25, PBOT - 0.3, 0], gP);
  stomBlob.scale.set(1.2, 0.6, 0.8);
  const bolus = kit.mesh(new THREE.SphereGeometry(0.22, 20, 14), kit.mat(0xc9894b, { roughness: 0.8 }), [0, PTOP, 0], gP);
  bolus.scale.set(1, 1.25, 1); bolus.castShadow = false;
  const squeezeAt = anchor(gP, [PR * 0.5 + 0.05, PTOP, 0]), relaxAt = anchor(gP, [PR + 0.05, PTOP, 0]);
  const pTags = {
    bolus: label('Bolus (food)', anchor(bolus, [-0.62, 0, 0]), { cls: 'warm' }),
    squeeze: label('Muscle contracts', squeezeAt),
    relax: label('Muscle relaxes', relaxAt, { cls: 'cool' }),
    top: label('From the mouth', V(PE[0], PTOP + 0.25, 0)),
    stom: label('Stomach', V(PE[0] + 0.25, PBOT - 0.05, 0.5)),
  };

  // ================= Villi: absorption in the small intestine =================
  const gV = group(VI);
  const WALL_W = 2.6, WALL_D = 1.6, WALL_Y = 0.62;
  kit.mesh(new THREE.BoxGeometry(WALL_W, 0.16, WALL_D), kit.mat(0xe78f8f, { roughness: 0.7 }), [0, WALL_Y - 0.08, 0], gV);
  kit.mesh(new THREE.BoxGeometry(WALL_W, 0.3, WALL_D), kit.mat(0xd9a07a, { roughness: 0.8 }), [0, WALL_Y - 0.31, 0], gV);
  const VR = 0.1, VL = 0.55, VCOLS = 8, VROWS = 5;
  const villusGeo = new THREE.CapsuleGeometry(VR, VL, 4, 12);
  villusGeo.translate(0, VL / 2 + VR, 0);
  const villusMat = kit.mat(0xf2a3a0, { roughness: 0.6 });
  const villusFront = new THREE.MeshStandardMaterial({ color: 0xf6b8b4, transparent: true, opacity: 0.55, roughness: 0.5, depthWrite: false });
  const villi = [], frontVilli = [];
  for (let r = 0; r < VROWS; r++) for (let c = 0; c < VCOLS; c++) {
    const x = -WALL_W / 2 + 0.2 + c * ((WALL_W - 0.4) / (VCOLS - 1)) + (r % 2 ? 0.08 : -0.04), z = -WALL_D / 2 + 0.2 + r * ((WALL_D - 0.45) / (VROWS - 1));
    const front = r === VROWS - 1;
    const m = new THREE.Mesh(villusGeo, front ? villusFront : villusMat);
    m.position.set(x, WALL_Y, z); m.castShadow = !front; m.renderOrder = front ? 3 : 0;
    gV.add(m); villi.push(m);
    if (front) frontVilli.push({ m, x, z });
  }
  // Capillary loops (red) and lacteals (pale yellow) inside the see-through front villi.
  const capMat = kit.mat(0xd7263d, { roughness: 0.45 }), lacMat = kit.mat(0xf6e7a8, { roughness: 0.5 });
  const loopGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.06, 0, 0), V(-0.06, VL * 0.9, 0), V(0, VL + 0.06, 0), V(0.06, VL * 0.9, 0), V(0.06, 0, 0)]), 20, 0.014, 5);
  const lacGeo = new THREE.CylinderGeometry(0.022, 0.022, VL * 0.85, 6); lacGeo.translate(0, VL * 0.42, 0);
  const inside = frontVilli.map(({ x, z }) => {
    const g = new THREE.Group(); g.position.set(x, WALL_Y, z); gV.add(g);
    kit.mesh(loopGeo, capMat, [0, 0, 0], g).castShadow = false;
    kit.mesh(lacGeo, lacMat, [0, 0, 0.0], g).castShadow = false;
    return g;
  });
  const FZ = frontVilli[0].z;
  const vessel = kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, WALL_W, 12), kit.mat(0xd7263d), [0, WALL_Y - 0.25, FZ + 0.12], gV);
  vessel.rotation.z = Math.PI / 2;
  const lacteal = kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, WALL_W, 10), lacMat, [0, WALL_Y - 0.4, FZ + 0.12], gV);
  lacteal.rotation.z = Math.PI / 2;
  const NV = 30;
  const nutGeo = new THREE.SphereGeometry(0.04, 8, 6);
  const nut = new THREE.InstancedMesh(nutGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, emissive: 0x222222, emissiveIntensity: 0.3 }), NV);
  nut.frustumCulled = false; nut.castShadow = false; gV.add(nut);
  const NUT_COL = [0xf2a516, 0x8e6fd8, 0xf9e04f]; // glucose, amino acids, fatty acids
  { const c = new THREE.Color(); for (let i = 0; i < NV; i++) nut.setColorAt(i, c.setHex(NUT_COL[i % 3])); }
  const flatArea = WALL_W * WALL_D, villusArea = 2 * Math.PI * VR * VL + Math.PI * VR * VR;
  const villiRatio = (flatArea + villi.length * villusArea) / flatArea;
  const vTags = {
    villus: label('Villus', anchor(gV, [frontVilli[3].x, WALL_Y + VL + 0.4, FZ])),
    cap: label('Blood capillary', anchor(gV, [frontVilli[1].x - 0.3, WALL_Y + 0.35, FZ + 0.1]), { cls: 'warm' }),
    blood: label('To the blood', anchor(gV, [WALL_W / 2 - 0.25, WALL_Y - 0.2, FZ + 0.15]), { cls: 'warm' }),
    lacteal: label('Lacteal (fats)', anchor(gV, [-WALL_W / 2 + 0.35, WALL_Y - 0.42, FZ + 0.15])),
    food: label('Digested food', anchor(gV, [0.6, 1.95, 0.3]), { cls: 'cool' }),
  };

  // ================= State =================
  const allTags = [...Object.values(organTag), duoTag, lensTag, foodTag, sideTag, cubeTag, enzTag, molTag, ...Object.values(pTags), ...Object.values(vTags)];
  const st = { step: 0, quiz: false, time: 0, auto: false, row: null, slider: null, toggle: null,
    pieces: 1, gap: 0, mol: 'starch', molT: 0, bolusT: 0, bileV: 0, dropR: 0.26, villi: 1, villiTo: 1, vPhase: 0, tl: 0, cmShown: -1, stageShown: -1 };

  function pickOrgan(j) {
    const [k, n, txt] = ORGANS[j];
    OP.select(k === 'liver' ? ['liver', 'gall'] : [k]);
    for (const t of Object.values(organTag)) t.show(false);
    organTag[k].show(true); if (k === 'liver') organTag.gall.show(true);
    ui.readout(`<b>${n}</b>: ${txt}`);
  }
  function setPieces(n) {
    st.pieces = n;
    const side = 2 / n, area = n * n * n * 6 * side * side;
    ui.readout(`Cut into <b>${n * n * n}</b> piece${n > 1 ? 's' : ''}, each <b>${+side.toFixed(2)} cm</b> wide<br>Volume: <b>8 cm³</b> (always the same)<br>Total surface area = ${n * n * n} × 6 × ${+side.toFixed(2)}² = <b>${Math.round(area)} cm²</b>`);
    layoutCubes();
  }
  function layoutCubes() {
    const n = st.pieces, s = CUBE / n, gap = st.gap;
    let k = 0;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let c = 0; c < n; c++) {
      const off = (i) => (i - (n - 1) / 2) * (s + gap);
      P3.set(off(a), 0.64 + s / 2 + b * (s + gap), off(c));
      cubes.setMatrixAt(k++, M4.compose(P3, QI, S3.setScalar(s * 0.985)));
    }
    cubes.count = k;
    cubes.instanceMatrix.needsUpdate = true;
  }
  function setMol(kind) {
    st.mol = kind; st.molT = 0;
    for (const [k, m] of Object.entries(mols)) {
      m.g.visible = k === kind;
      for (const u of m.units) { u.free = 0; u.g.position.copy(u.home); u.g.rotation.set(0, 0, 0); }
      for (const b of m.bonds) b.m.visible = true;
    }
    enzTag.text = MOLS[kind].enzyme; molTag.text = MOLS[kind].name;
    molReadout(0);
  }
  function molReadout(cut) {
    const m = mols[st.mol], n = m.units.filter(u => u.free > 0).length;
    ui.readout(`${MOLS[st.mol].txt}<br>Bonds broken: <b>${cut}</b> of ${m.bonds.length} · small molecules set free: <b>${n}</b>`);
  }
  function setBile(v) {
    st.bileV = v;
    const n = 2 ** v, ratio = Math.cbrt(n);
    st.dropR = 0.27 / Math.cbrt(n);
    for (let k = 0; k < 64; k++) {
      if (k >= n) { drops.setMatrixAt(k, M4.makeScale(0, 0, 0)); continue; }
      const rr = n === 1 ? 0 : 0.33 * Math.cbrt((k + 0.5) / n), y = 1 - 2 * (k + 0.5) / n, a = k * 2.39996, h = Math.sqrt(Math.max(0, 1 - y * y));
      P3.set(Math.cos(a) * h * rr, y * rr, Math.sin(a) * h * rr);
      drops.setMatrixAt(k, M4.compose(P3, QI, S3.setScalar(st.dropR)));
    }
    drops.instanceMatrix.needsUpdate = true;
    ui.readout(`Fat: <b>${n === 1 ? 'one big drop' : `${n} droplets`}</b> (the same amount of fat)<br>Total surface area: <b>${ratio.toFixed(1)} ×</b> the single drop<br>More surface means lipase can digest the fat faster.`);
  }
  function setVilli(v) {
    st.villiTo = v ? 1 : 0;
    ui.readout(v
      ? `<b>With villi</b>: the surface area of this piece of wall is about <b>${villiRatio.toFixed(1)} ×</b> a flat wall (this model). Microvilli on the cells add even more.`
      : '<b>Flat wall</b> (no villi): much less surface, so far fewer food molecules are absorbed each second.');
  }
  // Timeline helpers.
  const stageAt = v => { let i = 0; while (i < STAGES.length - 2 && v >= STAGES[i + 1].v) i++; return i; };
  const hoursAt = v => { const i = stageAt(v), a = STAGES[i], b = STAGES[i + 1]; return a.h + (b.h - a.h) * kit.clamp((v - a.v) / (b.v - a.v), 0, 1); };
  const timeText = v => {
    const h = hoursAt(v);
    if (h < 1 / 60) return 'under 1 min';
    if (h < 0.05) return 'about 1 min';
    if (h < 1) return `about ${Math.round(h * 60 / 10) * 10} min`;
    if (h < 30) return `about ${Math.round(h)} h`;
    return `about ${(h / 24).toFixed(1)} days`;
  };
  function placeFood(v) {
    const i = stageAt(v), a = STAGES[i], b = STAGES[i + 1], f = kit.clamp((v - a.v) / (b.v - a.v), 0, 1);
    if (i === 0) food.position.set(0, 3.47, 0.27);
    else if (i === 1) oesoC.getPointAt(f, food.position);
    else if (i === 2) stomC.getPointAt(0.15 + 0.8 * f, food.position);
    else if (i === 3) { if (f < 0.12) duoC.getPointAt(f / 0.12, food.position); else smallC.getPointAt((f - 0.12) / 0.88, food.position); }
    else if (i === 4) largeC.getPointAt(0.86 * f, food.position);
    else largeC.getPointAt(0.86 + 0.14 * f, food.position);
    food.position.z += 0.06;
    return i;
  }
  function setTimeline(v) {
    st.tl = v;
    const i = placeFood(v);
    if (i !== st.stageShown) {
      st.stageShown = i;
      OP.select(STAGES[i].organ === 'large' && i === 5 ? ['large'] : [STAGES[i].organ]);
    }
    ui.readout(`Time after eating: <b>${timeText(v)}</b><br><b>${STAGES[i].name}</b>: ${STAGES[i].txt}<br><span style="opacity:.75">Rough times; they vary a lot between people and meals.</span>`);
  }

  const F = {
    body: { radius: 2.0, yaw: 0.0, pitch: 0.08, target: [0, 1.95, 0] },
    cube: { radius: 1.5, yaw: 0.5, pitch: 0.42, target: [6, 1.15, 0] },
    enz: { radius: 1.7, width: 1.8, yaw: 0.0, pitch: 0.2, target: [12, 1.25, 0] },
    peri: { radius: 2.05, yaw: 0.25, pitch: 0.1, target: [18.1, 2.25, 0] },
    bile: { radius: 1.05, yaw: 0.1, pitch: 0.08, target: [0.45, 1.72, 0.2] },
    villi: { radius: 1.5, width: 1.45, yaw: 0.15, pitch: 0.35, target: [24, 1.0, 0] },
    quiz: { radius: 2.1, yaw: -0.4, pitch: 0.12, target: [0, 1.95, 0] },
  };
  const centres = [0, 6, 12, 18, 0, 24, 0];

  return {
    step(i, { isQuiz }) {
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: false, row: null, slider: null, toggle: null, stageShown: -1 });
      for (const t of allTags) t.show(false);
      OP.select([]);
      for (const m of Object.values(mols)) m.g.visible = false;
      for (const f of flows) f.mesh.visible = false;
      lens.visible = false; zoom.visible = false; food.visible = false;
      const cx = isQuiz ? 0 : centres[i];
      sun.position.set(cx + 4, 10, 7); sun.target.position.set(cx, 0, 0);
      if (i === 0) {
        view(F.body);
        st.auto = true;
        st.row = ui.buttons(ORGANS.map(([, n], j) => ({ label: n, on: j === 0, onClick: () => { st.auto = false; pickOrgan(j); } })));
        pickOrgan(0);
      }
      if (i === 1) {
        view(F.cube);
        sideTag.show(true); cubeTag.show(true);
        st.auto = true; st.gap = 0;
        st.slider = ui.slider({ label: 'Cuts: pieces along each side', min: 1, max: 5, step: 1, value: 1, onInput: v => { st.auto = false; setPieces(v); } });
        setPieces(1);
      }
      if (i === 2) {
        view(F.enz);
        enzTag.show(true); molTag.show(true);
        st.auto = true;
        st.row = ui.buttons(['starch', 'protein', 'fat'].map((k, j) => ({ label: MOLS[k].name, on: j === 0, onClick: () => { st.auto = false; setMol(k); } })));
        setMol('starch');
      }
      if (i === 3) {
        view(F.peri);
        for (const t of Object.values(pTags)) t.show(true);
        st.auto = true; st.bolusT = 0; st.cmShown = -1;
        ui.buttons([{ label: 'Swallow', onClick: () => { st.auto = false; st.bolusT = 0; } }]);
      }
      if (i === 4) {
        view(F.bile);
        lens.visible = zoom.visible = true;
        bileFlow.mesh.visible = juiceFlow.mesh.visible = true;
        OP.select(['liver', 'gall', 'pancreas']);
        for (const k of ['liver', 'gall', 'pancreas']) organTag[k].show(true);
        duoTag.show(true); lensTag.show(true);
        st.auto = true;
        st.slider = ui.slider({ label: 'Bile added', min: 0, max: 6, step: 1, value: 0, format: v => (v ? `${2 ** v} droplets` : 'none'), onInput: v => { st.auto = false; setBile(v); } });
        setBile(0);
      }
      if (i === 5) {
        view(F.villi);
        for (const t of Object.values(vTags)) t.show(true);
        st.auto = true; st.villi = st.villiTo = 1;
        st.toggle = ui.toggle({ label: 'Villi', value: true, onChange: v => { st.auto = false; setVilli(v); } });
        setVilli(true);
      }
      if (i === 6) {
        view(F.body);
        food.visible = true; foodTag.show(true);
        st.auto = true;
        st.slider = ui.slider({ label: 'Time after eating', min: 0, max: 100, step: 0.5, value: 0, format: v => timeText(v), onInput: v => { st.auto = false; setTimeline(v); } });
        setTimeline(0);
      }
      if (isQuiz) view(F.quiz);
    },

    update(dt) {
      st.time += dt;
      const t = st.time;
      OP.pulse(t);
      if (st.quiz) return false;
      if (st.step === 0 && st.auto) {
        const j = Math.floor(t / 2.2) % ORGANS.length;
        if (OP.selected[0] !== ORGANS[j][0]) { pickOrgan(j); st.row?.select(j); }
      }
      if (st.step === 1) {
        if (st.auto) { const n = Math.min(5, 1 + Math.floor(Math.max(0, t - 0.6) / 1.4)); if (n !== st.pieces) { setPieces(n); st.slider?.set(n); } }
        const want = st.pieces > 1 ? 0.06 : 0;
        if (kit.follow(st, 'gap', want, dt, 4)) layoutCubes();
      }
      if (st.step === 2) updateEnzyme(dt);
      if (st.step === 3) updateOeso(dt);
      if (st.step === 4) {
        bileFlow.update(dt); juiceFlow.update(dt);
        if (st.auto) { const v = Math.min(6, Math.floor(Math.max(0, t - 0.8) / 1.1)); if (v !== st.bileV) { setBile(v); st.slider?.set(v); } }
        lens.rotation.y = Math.sin(t * 0.6) * 0.3;
      }
      if (st.step === 5) {
        if (st.auto) { const on = (t % 10) < 6; if (on !== (st.villiTo === 1)) { setVilli(on); if (st.toggle) st.toggle.checked = on; } }
        kit.follow(st, 'villi', st.villiTo, dt, 3);
        const s = Math.max(0.001, st.villi);
        for (const m of villi) m.scale.set(1, s, 1);
        for (const g of inside) g.scale.set(1, s, 1);
        updateNutrients(dt);
      }
      if (st.step === 6 && st.auto) {
        const v = Math.min(100, Math.round(Math.max(0, t - 0.5) * 13) / 2);
        setTimeline(v); st.slider?.set(v);
        if (v >= 100) st.auto = false;
      }
      return true;
    },
  };

  function updateEnzyme(dt) {
    const m = mols[st.mol];
    st.molT += dt;
    if (st.auto && st.molT > 9) { const order = ['starch', 'protein', 'fat'], j = (order.indexOf(st.mol) + 1) % 3; setMol(order[j]); st.row?.select(j); return; }
    const cut = Math.min(m.bonds.length, Math.floor(Math.max(0, st.molT - 0.3) * 1.6));
    const target = cut < m.bonds.length ? m.bonds[cut] : null;
    // The enzyme glides to the next bond to cut, then waits off to the side when all are cut.
    const tx = target ? target.x + 0.2 : -1.6, ty = target ? target.m.position.y : EY + 0.5;
    kit.follow(enzyme.position, 'x', tx, dt, 6); kit.follow(enzyme.position, 'y', ty, dt, 6);
    enzyme.rotation.z = Math.sin(st.molT * 14) * 0.12;
    let changed = false;
    m.bonds.forEach((b, k) => {
      if (k < cut && b.m.visible) { b.m.visible = false; for (const ui2 of b.frees) m.units[ui2].free = Math.max(m.units[ui2].free, 0.001); changed = true; }
    });
    m.units.forEach((u, k) => {
      if (!u.free) return;
      u.free = Math.min(1, u.free + dt * 0.8);
      const e = kit.ease(u.free), seed = k + (st.mol === 'protein' ? 20 : st.mol === 'fat' ? 40 : 0);
      u.g.position.set(u.home.x + (rand(seed) - 0.5) * 0.4 * e, u.home.y + (0.15 + 0.3 * rand(seed + 3)) * e * (rand(seed + 7) > 0.5 ? 1 : -1.3) + Math.sin(st.molT * 2 + k) * 0.03 * e, u.home.z + (rand(seed + 5) - 0.5) * 0.9 * e);
      u.g.rotation.set(e * rand(seed + 9) * 2, e * rand(seed + 11) * 2, 0);
    });
    if (changed) molReadout(cut);
  }

  function updateOeso(dt) {
    st.bolusT += dt;
    if (st.auto && st.bolusT > 5.2) st.bolusT = 0;
    const u = kit.clamp((st.bolusT - 0.4) / 3.6, 0, 1.08);
    const gauss = (x, w) => Math.exp(-(x * x) / (2 * w * w));
    const ub = Math.min(1, u), squeeze = u - 0.13;
    oeso.set(x => PR + 0.04 * gauss(x - (u + 0.1), 0.08) - 0.17 * gauss(x - squeeze, 0.045) - 0.03 * (x < squeeze ? 1 - gauss(x - squeeze, 0.12) : 0));
    pC.getPointAt(ub, bolus.position);
    bolus.visible = u < 1.04;
    squeezeAt.position.y = PTOP + (PBOT - PTOP) * kit.clamp(squeeze, 0, 1);
    relaxAt.position.y = PTOP + (PBOT - PTOP) * kit.clamp(u + 0.17, 0, 1);
    pTags.squeeze.show(squeeze > 0 && squeeze < 1); pTags.relax.show(u + 0.17 < 1); pTags.bolus.show(u < 1);
    const cm = Math.round(Math.min(1, u) * 25);
    if (cm !== st.cmShown) {
      st.cmShown = cm;
      ui.readout(u >= 1 ? 'The bolus has reached the <b>stomach</b>.' : `Bolus: <b>${cm} cm</b> down the oesophagus (about 25 cm long)<br>Behind it the muscle <b>contracts</b>; in front it <b>relaxes</b>.`);
    }
  }

  function updateNutrients(dt) {
    st.vPhase += dt * 0.12;
    const hv = st.villi, active = Math.max(3, Math.round(NV * (1 + (villiRatio - 1) * hv) / villiRatio));
    for (let k = 0; k < NV; k++) {
      if (k >= active) { nut.setMatrixAt(k, M4.makeScale(0, 0, 0)); continue; }
      const u = (st.vPhase + k / NV + rand(k) * 0.03) % 1, v = frontVilli[(k * 3) % frontVilli.length], fat = k % 3 === 2;
      const top = WALL_Y + (VL + 2 * VR) * hv, tubeY = fat ? WALL_Y - 0.4 : WALL_Y - 0.25;
      if (u < 0.3) P3.set(v.x + (rand(k + 9) - 0.5) * 0.6 * (1 - u / 0.3), top + 0.05 + 1.1 * (1 - u / 0.3), v.z + (rand(k + 4) - 0.2) * 0.6 * (1 - u / 0.3));
      else if (u < 0.55) P3.set(v.x + (fat ? 0 : 0.06), top - (top - WALL_Y) * (u - 0.3) / 0.25, v.z + 0.01);
      else if (u < 0.65) { Q3.set(v.x, tubeY, FZ + 0.12); P3.set(v.x, WALL_Y, v.z).lerp(Q3, (u - 0.55) / 0.1); }
      else { const end = fat ? -WALL_W / 2 : WALL_W / 2; P3.set(v.x + (end - v.x) * (u - 0.65) / 0.35, tubeY, FZ + 0.12); }
      const s = Math.min(1, u / 0.05, (1 - u) / 0.05);
      E3.set(u * 9, k, 0); QT.setFromEuler(E3);
      nut.setMatrixAt(k, M4.compose(P3, QT, S3.setScalar(Math.max(0.001, s))));
    }
    nut.instanceMatrix.needsUpdate = true;
  }
}
