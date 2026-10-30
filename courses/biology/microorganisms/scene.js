// Microorganisms: a zoom from a hair down to a virus (true relative sizes), a cut-away bacterium, a virus and
// how it copies itself inside a host cell, three protists, bacteria doubling in a dish (2^n), and helpful and
// harmful microbes (yoghurt, decomposers, hand washing, antibiotics and vaccines).
// Each step's model sits in its own place along x; only the current one is shown.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { partSet, rand } from '../_shared/cells.js';
import { leafGeometry } from '../_shared/leaf.js';

const POS = { zoom: [0, 0, 0], bact: [16, 0, 0], virus: [32, 0, 0], host: [48, 0, 0], prot: [64, 0, 0], dish: [80, 0, 0], help: [96, 0, 0], fight: [112, 0, 0] };
// Real sizes in micrometres for the zoom; x positions are chosen so each object is centred at "its" zoom.
const HAIR = { d: 80, x: 165 }, EUG = { len: 50, x: 45 }, BAC = { len: 2, x: 2.6 }, VIR = { d: 0.1, x: 0 };
const ZOOM_PATH = [[400, 100], [150, 45], [40, 30], [12, 3], [2, 1.2], [0.4, 0]]; // [view width µm, centre x µm]
const F_MAX = 400, F_MIN = 0.4;
const BACT_PARTS = [
  ['wall', 'Cell wall', 'a tough outer layer that gives the bacterium its shape and protects it.'],
  ['membrane', 'Cell membrane', 'a thin layer just inside the wall that <b>controls what goes in and out</b>.'],
  ['cytoplasm', 'Cytoplasm', 'a jelly that fills the cell, where the cell\'s chemical reactions happen.'],
  ['dna', 'DNA loop', 'the genetic material: one long loop lying loose in the cytoplasm. <b>There is no nucleus.</b>'],
  ['flagellum', 'Flagellum', 'a long whip-like tail that <b>spins like a propeller</b> to push the bacterium along.'],
];
const VIRUS_PARTS = [
  ['coat', 'Protein coat', 'many identical protein pieces fitted together. The spikes help the virus <b>stick to a host cell</b>.'],
  ['gene', 'Genetic material', 'the instructions for making new viruses (DNA or RNA). The virus needs a <b>host cell</b> to use them.'],
];
const STAGES = [
  ['Attach', 'the virus sticks to the outside of the host cell.'],
  ['Get in', 'the virus\'s genetic material gets inside the cell and takes over.'],
  ['Copy', 'the cell is forced to build new viruses.'],
  ['Release', 'the new viruses burst out of the cell, ready to infect other cells.'],
];
const PROTISTS = [
  ['amoeba', 'Amoeba', 'moves and catches food with <b>pseudopods</b> ("false feet"). The big pond amoeba is about 0.25 to 0.75 mm long.'],
  ['para', 'Paramecium', 'swims by beating thousands of <b>cilia</b> (tiny hairs). About 0.2 to 0.3 mm long.'],
  ['eug', 'Euglena', 'makes food in light with its <b>chloroplasts</b> and swims with a flagellum. About 50 µm long.'],
];
const HELP = [
  ['Making yoghurt', 'Bacteria change milk sugar (<b>lactose</b>) into <b>lactic acid</b>, which makes the milk thick and sour. This takes a few hours in warm milk (about 40 to 45 °C).'],
  ['Decomposers', 'Bacteria and fungi <b>break down</b> the dead leaf and return its <b>nutrients</b> to the soil, where plant roots can take them up again.'],
];
const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  scene.background = new THREE.Color(0xe2f3f1);
  kit.lights(scene, { sun: [4, 9, 7], shadows: false });
  const v3 = (a, dx = 0, dy = 0, dz = 0) => new THREE.Vector3(a[0] + dx, a[1] + dy, a[2] + dz);
  const group = p => { const g = new THREE.Group(); g.position.set(...p); scene.add(g); return g; };
  const G = {};
  for (const k of Object.keys(POS)) G[k] = group(POS[k]);

  // Shared small shapes: a rod-shaped bacterium and a mini virus (coat + spikes), merged into one geometry each.
  const rodGeo = new THREE.CapsuleGeometry(0.045, 0.13, 2, 6).rotateZ(Math.PI / 2);
  const miniVirusGeo = (() => {
    const parts = [new THREE.IcosahedronGeometry(1, 0)];
    for (const d of icoDirs(THREE)) {
      const s = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 4).translate(0, 1.1, 0);
      s.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
      parts.push(s.toNonIndexed());
    }
    return mergeGeometries(parts.map(p => { p.deleteAttribute('uv'); return p; }));
  })();
  const virusMat = kit.mat(0x9b6bd6, { flatShading: true, roughness: 0.5 });
  const bactMat = kit.mat(0x58a84a, { roughness: 0.5 });

  // ================= Step 0: zoom from a hair to a virus =================
  const zoomG = new THREE.Group();
  G.zoom.add(zoomG);
  const hair = kit.mesh(new THREE.CylinderGeometry(HAIR.d / 2, HAIR.d / 2, 1200, 32, 1, true), kit.mat(0xffffff, { map: hairTexture(THREE), roughness: 0.55 }), [HAIR.x, 0, 0], zoomG);
  hair.rotation.z = -0.12;
  const eugZ = euglena(THREE, kit, partSet(THREE, kit));
  eugZ.g.scale.setScalar(EUG.len / 2);
  eugZ.g.position.set(EUG.x, 0, 0);
  zoomG.add(eugZ.g);
  const bacZ = new THREE.Group();
  bacZ.position.set(BAC.x, 0, 0);
  zoomG.add(bacZ);
  kit.mesh(new THREE.CapsuleGeometry(0.3, BAC.len - 0.6, 4, 12).rotateZ(Math.PI / 2), bactMat, [0, 0, 0], bacZ);
  kit.mesh(new THREE.TubeGeometry(helix(THREE, 1.0, 2.6, 0.12, 3), 40, 0.03, 4), bactMat, [0, 0, 0], bacZ);
  const virZ = new THREE.Mesh(miniVirusGeo, virusMat);
  virZ.scale.setScalar(VIR.d / 2 / 1.25);
  virZ.position.set(VIR.x, 0, 0);
  zoomG.add(virZ);
  const zAnchor = (x, y) => { const o = new THREE.Object3D(); o.position.set(x, y, 0); zoomG.add(o); return o; };
  const zTags = [
    { tag: label('Human hair', zAnchor(HAIR.x, 0), { cls: 'warm' }), size: HAIR.d, x: HAIR.x },
    { tag: label('Euglena', zAnchor(EUG.x, 9), { cls: 'warm' }), size: EUG.len, x: EUG.x },
    { tag: label('Bacterium', zAnchor(BAC.x, 0.4), { cls: 'warm' }), size: BAC.len, x: BAC.x },
    { tag: label('Virus', zAnchor(VIR.x, 0.07), { cls: 'warm' }), size: VIR.d, x: VIR.x },
  ];

  // ================= Step 1: cut-away bacterium =================
  const BP = partSet(THREE, kit);
  const bb = new THREE.Group();
  bb.rotation.z = Math.PI / 2; // lathe axis (y) lies along x; local +x points up
  G.bact.add(bb);
  const lathe = (r, mat) => kit.mesh(new THREE.LatheGeometry(capsuleProfile(THREE, r, 1.9), 32, Math.PI / 2, Math.PI * 1.5), mat, [0, 0, 0], bb);
  lathe(0.62, BP.mat('wall', 0x6fbf5a, { side: THREE.DoubleSide, roughness: 0.6 }));
  lathe(0.54, BP.mat('membrane', 0xf2a65a, { roughness: 0.5 }));
  lathe(0.53, BP.mat('cytoplasm', 0xfdf1c0, { side: THREE.BackSide, roughness: 0.8 }));
  // Ribosome-sized dots give the cytoplasm some texture (not labelled).
  const dotIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 4), BP.mat('cytoplasm', 0xd9b56a), 70);
  const mt = new THREE.Matrix4();
  for (let i = 0; i < 70; i++) {
    const a = rand(i) * Math.PI * 1.5 + Math.PI / 2, rr = 0.15 + rand(i + 5) * 0.32;
    mt.makeTranslation(Math.sin(a) * rr, (rand(i + 9) - 0.5) * 2.4, Math.cos(a) * rr);
    dotIM.setMatrixAt(i, mt);
  }
  bb.add(dotIM);
  const dnaPts = [];
  for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2; dnaPts.push(new THREE.Vector3(0.22 * Math.cos(3 * a), 0.9 * Math.sin(a) + 0.12 * Math.sin(4 * a), 0.2 * Math.sin(2 * a + 0.5))); }
  kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dnaPts, true), 160, 0.032, 6, true), BP.mat('dna', 0x6a3fb5, { roughness: 0.4 }), [0, 0, 0], bb);
  const flag = new THREE.Group();
  flag.position.y = -1.55;
  bb.add(flag);
  kit.mesh(new THREE.TubeGeometry(helix(THREE, 0, -2.0, 0.15, 2.8, 'y'), 90, 0.035, 5), BP.mat('flagellum', 0x4f9a3e, { roughness: 0.5 }), [0, 0, 0], flag);
  // Anchors in bb space: world (x, y, z) = (-ly, lx, lz), so local = (wy, -wx, wz).
  BP.anchor('wall', bb, [0.45, -0.5, -0.45]);
  BP.anchor('membrane', bb, [0.56, 0.6, 0.02]);
  BP.anchor('cytoplasm', bb, [-0.25, -0.8, -0.3]);
  BP.anchor('dna', bb, [0.2, 0.25, 0.1]);
  BP.anchor('flagellum', bb, [0.25, -2.9, 0]);
  const bTags = {};
  for (const [k, name] of BACT_PARTS) bTags[k] = label(name, BP.parts[k].anchor, { cls: 'cool' });
  const bTitle = label('Bacterium: about 2 µm long', v3(POS.bact, 0.2, -1.3, 0), { cls: 'big' });

  // ================= Step 2: a virus =================
  const VP = partSet(THREE, kit);
  const vg = new THREE.Group();
  G.virus.add(vg);
  const coatMat = VP.mat('coat', 0x9b6bd6, { flatShading: true, roughness: 0.45, transparent: true });
  kit.mesh(new THREE.IcosahedronGeometry(1, 1), coatMat, [0, 0, 0], vg);
  const spikeMat = VP.mat('coat', 0x7d4fc0, { roughness: 0.5, transparent: true });
  const spikeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.36, 6).translate(0, 1.1, 0), knobGeo = new THREE.SphereGeometry(0.085, 10, 8).translate(0, 1.3, 0);
  for (const d of icoDirs(THREE)) {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    kit.mesh(spikeGeo, spikeMat, [0, 0, 0], vg).quaternion.copy(q);
    kit.mesh(knobGeo, spikeMat, [0, 0, 0], vg).quaternion.copy(q);
  }
  kit.mesh(new THREE.TorusKnotGeometry(0.36, 0.045, 140, 6, 2, 3), VP.mat('gene', 0xf4a02a, { roughness: 0.4 }), [0, 0, 0], vg);
  VP.anchor('coat', G.virus, [0.75, 1.0, 0.4]);
  VP.anchor('gene', G.virus, [0, 0.1, 0.3]);
  const vTags = { coat: label('Protein coat', VP.parts.coat.anchor, { cls: 'cool' }), gene: label('Genetic material', VP.parts.gene.anchor, { cls: 'cool' }) };
  const vTitle = label('Virus: about 100 nm', v3(POS.virus, 0, -1.65, 0), { cls: 'big' });

  // ================= Step 3: a virus copies itself in a host cell =================
  const HR = 1.7;
  const hostMat = new THREE.MeshStandardMaterial({ color: 0xf4a3b5, transparent: true, opacity: 0.38, roughness: 0.4, depthWrite: false, side: THREE.DoubleSide });
  const host = new THREE.Mesh(new THREE.SphereGeometry(HR, 32, 24), hostMat);
  host.renderOrder = 2;
  G.host.add(host);
  const nucleus = kit.mesh(new THREE.SphereGeometry(0.5, 24, 16), kit.mat(0x8e5cc4, { roughness: 0.5 }), [-0.35, -0.25, -0.4], G.host);
  const attachDir = new THREE.Vector3(0.75, 0.6, 0.3).normalize();
  const vStart = attachDir.clone().multiplyScalar(HR + 0.75);
  const vAttach = attachDir.clone().multiplyScalar(HR + 0.2);
  const v0 = new THREE.Mesh(miniVirusGeo, new THREE.MeshStandardMaterial({ color: 0x9b6bd6, flatShading: true, roughness: 0.5, transparent: true }));
  v0.scale.setScalar(0.17);
  G.host.add(v0);
  const strandCurve = new THREE.CatmullRomCurve3([attachDir.clone().multiplyScalar(HR), attachDir.clone().multiplyScalar(1.0).add(new THREE.Vector3(0, -0.2, 0.3)), new THREE.Vector3(0.1, -0.1, 0.2), new THREE.Vector3(-0.1, -0.15, 0.05)]);
  const strandGeo = new THREE.TubeGeometry(strandCurve, 40, 0.04, 5);
  const strand = kit.mesh(strandGeo, kit.mat(0xf4a02a, { emissive: 0xf4a02a, emissiveIntensity: 0.3 }), [0, 0, 0], G.host);
  const NEWV = 10, newV = [], newHome = [], newDir = [];
  for (let i = 0; i < NEWV; i++) {
    const m = new THREE.Mesh(miniVirusGeo, virusMat);
    m.scale.setScalar(0.001);
    G.host.add(m); newV.push(m);
    const a = rand(i + 40) * Math.PI * 2, y = (rand(i + 60) - 0.5) * 1.6, rr = 0.75 + rand(i + 80) * 0.35;
    const p = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr + 0.15);
    newHome.push(p); newDir.push(p.clone().normalize());
  }
  const hostTag = label('Host cell', v3(POS.host, -0.9, 1.55, 0.3), { cls: 'big' });
  const virusTag = label('Virus', v0);
  const countTag = label('New viruses: 0', v3(POS.host, 0, -2.05, 0), { cls: 'warm' });

  // ================= Step 4: protists =================
  const PP = partSet(THREE, kit);
  const PX = { amoeba: -2.35, para: 0, eug: 2.3 };
  // Amoeba: a soft blob whose pseudopods bulge out and pull back.
  const am = new THREE.Group();
  am.position.set(PX.amoeba, 0, 0);
  G.prot.add(am);
  const amGeo = new THREE.IcosahedronGeometry(0.75, 3);
  const amBase = amGeo.attributes.position.array.slice();
  const amMesh = new THREE.Mesh(amGeo, PP.mat('amoeba', 0x9fc3dc, { flatShading: true, transparent: true, opacity: 0.62, depthWrite: false, roughness: 0.35 }));
  amMesh.renderOrder = 2;
  am.add(amMesh);
  kit.mesh(new THREE.SphereGeometry(0.2, 16, 12), kit.mat(0x5b4a99), [0.05, 0, 0], am);
  for (let i = 0; i < 3; i++) kit.mesh(new THREE.SphereGeometry(0.09, 10, 8), kit.mat(0xc9a160), [-0.3 + i * 0.25, 0.05, 0.25 - i * 0.2], am);
  const LOBES = [new THREE.Vector3(1, 0.1, 0.2).normalize(), new THREE.Vector3(-0.6, 0, 0.8).normalize(), new THREE.Vector3(-0.4, -0.1, -0.9).normalize()];
  const lobeTip = new THREE.Object3D();
  am.add(lobeTip);
  // Paramecium: a slipper shape covered in beating cilia.
  const pa = new THREE.Group();
  pa.position.set(PX.para, 0, 0);
  G.prot.add(pa);
  const PS = [0.95, 0.36, 0.42];
  const paMesh = kit.mesh(new THREE.SphereGeometry(1, 32, 20), PP.mat('para', 0xd6e6b0, { transparent: true, opacity: 0.7, depthWrite: false, roughness: 0.4 }), [0, 0, 0], pa);
  paMesh.scale.set(...PS); paMesh.renderOrder = 2;
  kit.mesh(new THREE.SphereGeometry(1, 16, 12), kit.mat(0x6b4fa8), [0.05, 0.02, 0], pa).scale.set(0.24, 0.12, 0.14);
  kit.mesh(new THREE.SphereGeometry(1, 12, 8), kit.mat(0x9d8a5a), [-0.1, -0.05, 0.3], pa).scale.set(0.18, 0.08, 0.06);
  for (const s of [-1, 1]) kit.mesh(new THREE.SphereGeometry(0.07, 10, 8), kit.mat(0x8cc8ee), [s * 0.55, 0.12, 0], pa);
  const NC = 260, ciliaBase = new Float32Array(NC * 3), ciliaN = new Float32Array(NC * 3);
  const ciliaPos = new Float32Array(NC * 6);
  for (let i = 0; i < NC; i++) {
    const y = 1 - (2 * (i + 0.5)) / NC, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    const d = [r * Math.cos(a), y, r * Math.sin(a)];
    const b = [d[0] * PS[0], d[1] * PS[1], d[2] * PS[2]];
    const n = new THREE.Vector3(d[0] / PS[0], d[1] / PS[1], d[2] / PS[2]).normalize();
    ciliaBase.set(b, i * 3); ciliaN.set([n.x, n.y, n.z], i * 3);
    ciliaPos.set(b, i * 6);
  }
  const ciliaGeo = new THREE.BufferGeometry();
  ciliaGeo.setAttribute('position', new THREE.BufferAttribute(ciliaPos, 3));
  const cilia = new THREE.LineSegments(ciliaGeo, new THREE.LineBasicMaterial({ color: 0x5f8a45 }));
  cilia.frustumCulled = false;
  pa.add(cilia);
  // Euglena.
  const eu = euglena(THREE, kit, PP);
  eu.g.position.set(PX.eug, 0, 0);
  eu.g.scale.setScalar(0.9);
  eu.g.rotation.y = Math.PI; // flagellum points away from the paramecium
  G.prot.add(eu.g);
  const pTags = {
    amoeba: label('Amoeba', v3(POS.prot, PX.amoeba, 0.85, 0), { cls: 'big' }),
    para: label('Paramecium', v3(POS.prot, PX.para, 0.62, 0), { cls: 'big' }),
    eug: label('Euglena', v3(POS.prot, PX.eug, 0.5, 0), { cls: 'big' }),
  };
  const fTags = { amoeba: label('Pseudopod', lobeTip, { cls: 'cool' }), para: label('Cilia', v3(POS.prot, PX.para + 0.55, -0.45, 0.2), { cls: 'cool' }), eug: label('Chloroplasts', eu.chlAnchor, { cls: 'cool' }) };
  const eyeTag = label('Eyespot', eu.eyeAnchor, { cls: 'warm' });

  // ================= Step 5: bacteria doubling in a dish =================
  const MAXN = 9, MAXB = 1 << MAXN;
  kit.mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.45, roughness: 0.1 }), [0, -0.04, 0], G.dish);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.3, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8efff, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  rim.position.y = 0.11;
  G.dish.add(rim);
  kit.mesh(new THREE.CylinderGeometry(2.38, 2.38, 0.1, 48), kit.mat(0xf1dc9a, { roughness: 0.6 }), [0, 0.05, 0], G.dish);
  const colony = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.055, 0.15, 2, 6).rotateZ(Math.PI / 2), bactMat, MAXB);
  colony.frustumCulled = false;
  colony.count = 1;
  G.dish.add(colony);
  const home = [], cur = [], rot = [];
  for (let k = 0; k < MAXB; k++) {
    const r = 0.1 * Math.sqrt(k + 0.3), a = k * 2.39996;
    home.push(new THREE.Vector3(Math.cos(a) * r, 0.15, Math.sin(a) * r));
    cur.push(home[k].clone()); rot.push(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand(k + 3) * Math.PI));
  }
  const dishTag = label('Agar jelly: food for bacteria', v3(POS.dish, 0, 0.2, 2.2));
  const one = new THREE.Vector3(1, 1, 1);

  // ================= Step 6: helpful microbes =================
  const YX = -1.35, LX = 1.35;
  const cupMat = kit.mat(0xfafafa, { side: THREE.DoubleSide, roughness: 0.35 });
  kit.mesh(new THREE.CylinderGeometry(0.72, 0.58, 1.1, 32, 1, true), cupMat, [YX, 0.55, 0], G.help);
  kit.mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.02, 32), cupMat, [YX, 0.01, 0], G.help);
  kit.mesh(new THREE.TorusGeometry(0.72, 0.03, 6, 32), kit.mat(0x7cc1e8), [YX, 1.1, 0], G.help).rotation.x = Math.PI / 2;
  const milkMat = kit.mat(0xf3f7ff, { roughness: 0.3 });
  const milk = kit.mesh(new THREE.CircleGeometry(0.69, 32), milkMat, [YX, 0.95, 0], G.help);
  milk.rotation.x = -Math.PI / 2;
  const NY = 16, yogBugs = [];
  for (let i = 0; i < NY; i++) { const m = new THREE.Mesh(rodGeo, bactMat); m.scale.setScalar(0.001); G.help.add(m); yogBugs.push(m); }
  const milkC = new THREE.Color(0xf3f7ff), yogC = new THREE.Color(0xfff1d2);
  // Soil patch with a dead leaf, fungal threads and bacteria.
  const soilMat = kit.mat(0x5e3b22, { roughness: 0.95 });
  kit.mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.3, 32), soilMat, [LX, 0.15, 0], G.help);
  const deadLeaf = new THREE.Mesh(leafGeometry(THREE, 1.3, 0.62, 0), kit.mat(0xb7892f, { side: THREE.DoubleSide, roughness: 0.8 }));
  deadLeaf.position.set(LX - 0.6, 0.36, 0.12);
  deadLeaf.rotation.y = 0.3;
  G.help.add(deadLeaf);
  const leafGreen = new THREE.Color(0xb5c43c), leafBrown = new THREE.Color(0xa8742f);
  const hyphaMat = kit.mat(0xf6f1e4, { roughness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const a0 = rand(i + 200) * 6.28, pts = [];
    for (let k = 0; k < 4; k++) pts.push(new THREE.Vector3(LX + Math.cos(a0 + k * 0.5) * (0.25 + k * 0.17), 0.31, Math.sin(a0 + k * 0.5) * (0.25 + k * 0.17)));
    kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.012, 4), hyphaMat, [0, 0, 0], G.help);
  }
  const soilBugs = [];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(rodGeo, bactMat); G.help.add(m); soilBugs.push(m); }
  const yogTag = label('Milk → yoghurt', v3(POS.help, YX, 1.35, 0), { cls: 'big' });
  const decTag = label('Dead leaf', v3(POS.help, LX, 0.75, 0), { cls: 'big' });

  // ================= Step 7: germs and how we fight them =================
  const HX = -1.5, BX = 1.6;
  const skin = kit.mat(0xf0c3a0, { roughness: 0.6 });
  const hand = new THREE.Group();
  hand.position.set(HX, 0.1, 0);
  hand.rotation.y = -1.15; // fingers point right, the arm goes off to the left
  G.fight.add(hand);
  kit.mesh(new THREE.SphereGeometry(1, 24, 16), skin, [0, 0, 0.1], hand).scale.set(0.62, 0.17, 0.72);
  const fingerGeo = new THREE.CapsuleGeometry(0.11, 0.5, 3, 10).rotateX(Math.PI / 2);
  [[-0.4, -0.95, 0.42], [-0.14, -1.05, 0.55], [0.13, -1.02, 0.52], [0.38, -0.9, 0.42]].forEach(([x, z, len]) => { const f = kit.mesh(fingerGeo, skin, [x, 0.03, z], hand); f.scale.z = len / 0.5; });
  const thumb = kit.mesh(fingerGeo, skin, [0.72, 0.02, -0.05], hand);
  thumb.rotation.y = -0.9; thumb.scale.z = 0.8;
  kit.mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.7, 20), skin, [0, -0.04, 1.05], hand).rotation.x = Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.9, 20), kit.mat(0x3d7cc9, { roughness: 0.8 }), [0, -0.06, 1.75], hand).rotation.x = Math.PI / 2; // sleeve
  const handGerms = [];
  for (let i = 0; i < 10; i++) {
    const isV = i % 3 === 2;
    const m = new THREE.Mesh(isV ? miniVirusGeo : rodGeo, isV ? virusMat : bactMat);
    if (isV) m.scale.setScalar(0.06); else m.scale.setScalar(1.2);
    const p = new THREE.Vector3(HX + (rand(i + 300) - 0.5) * 0.8, 0.32, (rand(i + 310) - 0.5) * 0.75);
    m.position.copy(p); m.rotation.y = rand(i + 320) * 3;
    G.fight.add(m); handGerms.push({ m, p, s: m.scale.x });
  }
  const bubbles = [];
  const bubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1, depthWrite: false });
  for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + rand(i + 400) * 0.08, 12, 8), bubMat); b.visible = false; G.fight.add(b); bubbles.push(b); }
  // "Inside the body" disc with red blood cells, bacteria and viruses.
  kit.mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.12, 40), kit.mat(0xf7c4bf, { roughness: 0.7 }), [BX, 0.06, 0], G.fight);
  kit.mesh(new THREE.TorusGeometry(1.25, 0.04, 6, 40), kit.mat(0xd9827a), [BX, 0.12, 0], G.fight).rotation.x = Math.PI / 2;
  const rbcGeo = new THREE.SphereGeometry(1, 16, 10);
  [[-0.6, 0.5], [0.55, 0.6], [0.2, -0.75], [-0.75, -0.35]].forEach(([x, z]) => kit.mesh(rbcGeo, kit.mat(0xd8342f, { roughness: 0.5 }), [BX + x, 0.16, z], G.fight).scale.set(0.2, 0.05, 0.2));
  const bodyVirusMat = kit.mat(0x9b6bd6, { flatShading: true, roughness: 0.5 });
  const bodyBact = [], bodyVir = [], antibodies = [];
  const abMat = kit.mat(0x2a9df4, { roughness: 0.4 });
  const abGeo = (() => {
    const a = new THREE.CylinderGeometry(0.018, 0.018, 0.14, 5).translate(0, -0.07, 0);
    const b = new THREE.CylinderGeometry(0.018, 0.018, 0.12, 5).translate(0, 0.06, 0).rotateZ(0.6);
    const c = new THREE.CylinderGeometry(0.018, 0.018, 0.12, 5).translate(0, 0.06, 0).rotateZ(-0.6);
    return mergeGeometries([a, b, c]);
  })();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const b = new THREE.Mesh(rodGeo, bactMat); b.scale.setScalar(1.6);
    G.fight.add(b); bodyBact.push({ m: b, a, r: 0.45 + rand(i + 500) * 0.35 });
    const vm = new THREE.Mesh(miniVirusGeo, bodyVirusMat); vm.scale.setScalar(0.075);
    G.fight.add(vm); bodyVir.push({ m: vm, a: a + 0.6, r: 0.55 + rand(i + 510) * 0.35 });
    const ab = new THREE.Mesh(abGeo, abMat); ab.scale.setScalar(1.4); ab.visible = false;
    G.fight.add(ab); antibodies.push(ab);
  }
  const handTag = label('Germs on a hand', v3(POS.fight, HX, 0.9, -0.2), { cls: 'big' });
  const bodyTag = label('Inside the body', v3(POS.fight, BX, 0.75, -0.4), { cls: 'big' });
  const purple = new THREE.Color(0x9b6bd6), grey = new THREE.Color(0x9a9aa2);

  // ================= State and helpers =================
  const st = { step: 0, quiz: false, time: 0, auto: true, part: 0, slider: null, row: null, zv: 25, ph: 0, n: 0, help: 0, wash: 0, anti: 0, vacc: 0, wantWash: 0, wantAnti: 0, wantVacc: 0, fightStage: -1 };
  const allTags = [...zTags.map(z => z.tag), ...Object.values(bTags), bTitle, ...Object.values(vTags), vTitle, hostTag, virusTag, countTag, ...Object.values(pTags), ...Object.values(fTags), eyeTag, dishTag, yogTag, decTag, handTag, bodyTag];
  const hideAll = () => { for (const t of allTags) t.show(false); };
  const showOnly = keys => { for (const k of Object.keys(G)) G[k].visible = keys.includes(k); };

  const fOf = v => F_MAX * Math.pow(F_MIN / F_MAX, v / 100);
  const fmtLen = f => (f >= 10 ? `${Math.round(f)} µm` : f >= 1 ? `${f.toFixed(1)} µm` : `${Math.round(f * 1000)} nm`);
  function centreOf(F) {
    const lf = Math.log(F);
    for (let i = 0; i < ZOOM_PATH.length - 1; i++) {
      const [f0, c0] = ZOOM_PATH[i], [f1, c1] = ZOOM_PATH[i + 1];
      if (F <= f0 && F >= f1) return kit.lerp(c0, c1, (Math.log(f0) - lf) / (Math.log(f0) - Math.log(f1)));
    }
    return F > F_MAX ? ZOOM_PATH[0][1] : 0;
  }
  function setZoom(v) {
    st.zv = v;
    const F = fOf(v), s = 10 / F, c = centreOf(F);
    zoomG.scale.setScalar(s);
    zoomG.position.x = -c * s;
    for (const z of zTags) {
      const px = (z.x - c) * s, size = z.size * s;
      z.tag.show(st.step === 0 && !st.quiz && size > 0.3 && size < 16 && Math.abs(px) < 7);
    }
    ui.readout(`Width of view: about <b>${fmtLen(F)}</b><br>Hair about 80 µm · Euglena about 50 µm · Bacterium about 2 µm · Virus about 100 nm (0.1 µm)`);
  }

  function pickPart(list, P, tags, i, extra) {
    st.part = i;
    const [k, name, txt] = list[i];
    P.select(k);
    for (const [kk] of list) tags[kk].show(kk === k);
    ui.readout(`<b>${name}</b>: ${txt}`);
    extra?.(k);
  }
  const coat = { want: 1 };
  const virusExtra = k => { coat.want = k === 'gene' ? 0.28 : 1; };

  function setStage(ph) {
    st.ph = ph;
    const i = Math.min(3, Math.floor(ph));
    const made = Math.min(NEWV, Math.floor(kit.clamp(ph - 2, 0, 1) * NEWV + 0.001));
    countTag.text = `New viruses: ${made}`;
    ui.readout(`<b>${i + 1}. ${STAGES[i][0]}</b>: ${STAGES[i][1]}<br>New viruses made: <b>${made}</b>`);
  }
  function placeHost(ph) {
    const a = kit.clamp(ph, 0, 1), b = kit.clamp(ph - 1, 0, 1), c = kit.clamp(ph - 2, 0, 1), d = kit.clamp(ph - 3, 0, 1);
    v0.position.lerpVectors(vStart, vAttach, kit.ease(a));
    v0.material.opacity = 1 - 0.6 * b - 0.4 * d;
    strand.visible = b > 0 && c < 0.6;
    strandGeo.setDrawRange(0, Math.floor(strandGeo.index.count * b / 3) * 3);
    for (let i = 0; i < NEWV; i++) {
      const g = kit.clamp(c * NEWV - i, 0, 1);
      newV[i].scale.setScalar(0.001 + 0.13 * kit.ease(g));
      newV[i].position.copy(newHome[i]).addScaledVector(newDir[i], kit.ease(d) * 2.0);
    }
    host.scale.setScalar(1 + 0.12 * d);
    hostMat.opacity = 0.38 * (1 - d);
    nucleus.visible = d < 0.6;
  }

  function pickProtist(i, move) {
    st.part = i;
    const [k, name, txt] = PROTISTS[i];
    PP.select(k);
    for (const [kk] of PROTISTS) fTags[kk].show(kk === k);
    eyeTag.show(k === 'eug');
    ui.readout(`<b>${name}</b>: ${txt}`);
    if (move) view({ radius: 1.35, yaw: 0.15, pitch: 0.45, target: [POS.prot[0] + PX[k], 0, 0] });
  }

  function setN(n) {
    const N = 1 << n, prev = colony.count;
    if (N > prev) for (let k = prev; k < N; k++) cur[k].copy(cur[k - prev]); // daughters start where their parent is
    colony.count = N; st.n = n;
    ui.readout(`Time: <b>${n * 20} min</b> → number of doublings n = ${n * 20} ÷ 20 = <b>${n}</b><br>Bacteria = 2${SUP[n]} = <b>${N}</b> (in ideal conditions)`);
  }

  function pickHelp(i, move) {
    st.help = i;
    yogTag.show(true); decTag.show(true);
    ui.readout(`<b>${HELP[i][0]}</b>: ${HELP[i][1]}`);
    if (move) view(i === 0 ? { radius: 1.25, yaw: 0.2, pitch: 0.55, target: [POS.help[0] + YX, 0.7, 0] } : { radius: 1.25, yaw: -0.1, pitch: 0.6, target: [POS.help[0] + LX, 0.35, 0] });
  }

  function fightReadout() {
    const onHand = Math.round(handGerms.length * (1 - st.wantWash));
    const bact = st.wantAnti ? 0 : bodyBact.length;
    ui.readout(`On the hand: <b>${onHand}</b> germs<br>In the body: <b>${bact}</b> bacteria, <b>${bodyVir.length}</b> viruses${st.wantVacc ? ' (all stopped by antibodies)' : ''}${st.wantAnti ? '<br>The antibiotic killed the bacteria, but not the viruses.' : ''}`);
  }
  function fightDo(k) {
    if (k === 0) st.wantWash = 1;
    if (k === 1) st.wantAnti = 1;
    if (k === 2) st.wantVacc = 1;
    if (k === 3) { st.wantWash = st.wantAnti = st.wantVacc = 0; st.wash = st.anti = st.vacc = 0; }
    fightReadout();
  }

  const F = {
    zoom: { radius: 5, yaw: 0, pitch: 0.1, target: POS.zoom },
    bact: { radius: 1.5, width: 2.75, yaw: 0.2, pitch: 0.42, target: [POS.bact[0] + 0.95, 0.1, 0] },
    virus: { radius: 1.7, yaw: 0.3, pitch: 0.3, target: [POS.virus[0], 0.1, 0] },
    host: { radius: 2.5, yaw: 0.35, pitch: 0.3, target: [POS.host[0] + 0.4, 0, 0] },
    prot: { radius: 1.6, width: 3.75, yaw: 0, pitch: 0.42, target: [POS.prot[0] + 0.55, 0, 0] },
    dish: { radius: 2.5, yaw: 0, pitch: 0.95, target: [POS.dish[0], 0, 0.15] },
    help: { radius: 1.6, width: 2.6, yaw: 0.05, pitch: 0.5, target: [POS.help[0], 0.5, 0] },
    fight: { radius: 1.6, width: 3.0, yaw: 0, pitch: 0.75, target: [POS.fight[0], 0.1, 0.1] },
    quiz: { radius: 1.6, width: 3.75, yaw: 0.2, pitch: 0.45, target: [POS.prot[0] + 0.55, 0, 0] },
  };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, slider: null, row: null });
      hideAll(); BP.select(null); VP.select(null); PP.select(null);
      if (i === 0) {
        showOnly(['zoom']); go(F.zoom);
        st.slider = ui.slider({ label: 'Zoom', min: 0, max: 100, step: 1, value: 0, format: v => `${Math.round(F_MAX / fOf(v))}×`, onInput: v => { st.auto = false; setZoom(v); } });
        setZoom(0);
      }
      if (i === 1) {
        showOnly(['bact']); go(F.bact); bTitle.show(true);
        st.row = ui.buttons(BACT_PARTS.map(([, name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickPart(BACT_PARTS, BP, bTags, j); } })));
        pickPart(BACT_PARTS, BP, bTags, 0);
      }
      if (i === 2) {
        showOnly(['virus']); go(F.virus); vTitle.show(true);
        st.row = ui.buttons(VIRUS_PARTS.map(([, name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickPart(VIRUS_PARTS, VP, vTags, j, virusExtra); } })));
        pickPart(VIRUS_PARTS, VP, vTags, 0, virusExtra);
      }
      if (i === 3) {
        showOnly(['host']); go(F.host); hostTag.show(true); virusTag.show(true); countTag.show(true);
        st.slider = ui.slider({ label: 'Stage', min: 0, max: 4, step: 0.05, value: 0, format: v => STAGES[Math.min(3, Math.floor(v))][0], onInput: v => { st.auto = false; setStage(v); placeHost(v); } });
        setStage(0); placeHost(0);
      }
      if (i === 4 || isQuiz) {
        showOnly(['prot']); go(isQuiz ? F.quiz : F.prot);
        for (const t of Object.values(pTags)) t.show(true);
        if (!isQuiz) {
          st.row = ui.buttons(PROTISTS.map(([, name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickProtist(j, true); } })));
          pickProtist(0, false);
        }
      }
      if (i === 5) {
        showOnly(['dish']); go(F.dish); dishTag.show(true);
        colony.count = 1; cur[0].copy(home[0]);
        st.slider = ui.slider({ label: 'Time', min: 0, max: MAXN * 20, step: 20, value: 0, unit: ' min', onInput: v => { st.auto = false; setN(v / 20); } });
        setN(0);
      }
      if (i === 6) {
        showOnly(['help']); go(F.help);
        st.row = ui.buttons(HELP.map(([name], j) => ({ label: name, on: j === 0, onClick: () => { st.auto = false; pickHelp(j, true); } })));
        pickHelp(0, false);
      }
      if (i === 7) {
        showOnly(['fight']); go(F.fight); handTag.show(true); bodyTag.show(true);
        st.row = ui.buttons(['Wash hands', 'Antibiotic', 'Vaccine', 'Start again'].map((label, j) => ({ label, onClick: () => { st.auto = false; fightDo(j); } })));
        st.fightStage = -1; fightDo(3);
      }
    },

    update(dt, t) {
      st.time += dt;
      const s = st.step, T = st.time, auto = st.auto && !st.quiz;
      // ---- zoom
      if (s === 0 && !st.quiz && auto) {
        const u = T % 15;
        const v = u < 10 ? 100 * kit.ease(Math.min(1, u / 10)) : u < 12 ? 100 : 100 * (1 - kit.ease((u - 12) / 3));
        setZoom(Math.round(v)); st.slider?.set(Math.round(v));
      }
      eugZ.g.rotation.x = Math.sin(t * 0.7) * 0.2;
      // ---- bacterium
      flag.rotation.y = t * 7;
      bb.rotation.x = Math.sin(t * 0.5) * 0.12;
      if (s === 1 && auto) { const j = Math.floor(T / 2.4) % BACT_PARTS.length; if (j !== st.part && j >= 0) { pickPart(BACT_PARTS, BP, bTags, j); st.row?.select(j); } }
      BP.pulse(t);
      // ---- virus
      if (s === 2 && auto) { const j = Math.floor(T / 3) % 2; if (j !== st.part && j >= 0) { pickPart(VIRUS_PARTS, VP, vTags, j, virusExtra); st.row?.select(j); } }
      coatMat.opacity += (coat.want - coatMat.opacity) * Math.min(1, dt * 5);
      spikeMat.opacity = coatMat.opacity;
      coatMat.depthWrite = spikeMat.depthWrite = coatMat.opacity > 0.95;
      vg.rotation.y = t * 0.3; vg.rotation.x = Math.sin(t * 0.4) * 0.2;
      VP.pulse(t);
      // ---- host cell
      if (s === 3 && auto) {
        const ph = Math.min(4, (T * 0.42) % 4.8);
        setStage(ph); placeHost(ph); st.slider?.set(ph);
      }
      v0.rotation.y = t * 0.8;
      for (let i = 0; i < NEWV; i++) newV[i].rotation.set(t * 0.6 + i, t * 0.4 + i * 2, 0);
      // ---- protists
      if (s === 4 && auto) { const j = Math.floor(T / 3) % 3; if (j !== st.part && j >= 0) { pickProtist(j, false); st.row?.select(j); } }
      if (s === 4 || st.quiz) animateProtists(t);
      PP.pulse(t);
      // ---- doubling
      if (s === 5) {
        if (auto) {
          let k = Math.floor(T / 0.8);
          if (k > MAXN + 3) { st.time = 0; k = 0; }
          const nn = Math.min(MAXN, k);
          if (nn !== st.n) { if (nn < st.n) { colony.count = 1; cur[0].copy(home[0]); } setN(nn); st.slider?.set(nn * 20); }
        }
        const N = colony.count;
        for (let k = 0; k < N; k++) {
          cur[k].lerp(home[k], Math.min(1, dt * 3));
          mt.compose(cur[k], rot[k], one); colony.setMatrixAt(k, mt);
        }
        colony.instanceMatrix.needsUpdate = true;
      }
      // ---- helpful microbes: one shared 9-second cycle
      if (s === 6) {
        if (auto) { const j = Math.floor(T / 4.5) % 2; if (j !== st.help) { pickHelp(j, false); st.row?.select(j); } }
        const p = kit.clamp((T % 10) / 8, 0, 1);
        milkMat.color.copy(milkC).lerp(yogC, p);
        for (let i = 0; i < NY; i++) {
          const g = kit.clamp(p * NY - i + 1, 0, 1), a = t * (0.5 + rand(i) * 0.4) + i * 2.1, r = 0.12 + rand(i + 20) * 0.48;
          yogBugs[i].scale.setScalar(0.001 + 1.1 * g);
          yogBugs[i].position.set(YX + Math.cos(a) * r, 0.97, Math.sin(a) * r);
          yogBugs[i].rotation.y = -a;
        }
        yogTag.text = p < 0.12 ? 'Warm milk' : p < 0.95 ? 'Milk thickening…' : 'Yoghurt!';
        decTag.text = p < 0.12 ? 'Dead leaf' : p < 0.95 ? 'Breaking down…' : 'Nutrients in the soil';
        const k = 1 - 0.8 * p;
        deadLeaf.scale.set(k, 1, 0.5 + 0.5 * k);
        deadLeaf.material.color.copy(leafGreen).lerp(leafBrown, Math.min(1, p * 1.6));
        for (let i = 0; i < soilBugs.length; i++) {
          const a = t * 0.4 * (i % 2 ? 1 : -1) + i * 0.63, r = 0.25 + (i % 4) * 0.15;
          soilBugs[i].position.set(LX + Math.cos(a) * r * 0.9, 0.34, Math.sin(a) * r * 0.8);
          soilBugs[i].rotation.y = -a + Math.PI / 2;
        }
      }
      // ---- germs: auto runs wash, antibiotic, vaccine, then starts again
      if (s === 7) {
        if (auto) {
          const u = T % 12, k = u < 1 ? 3 : u < 4 ? 0 : u < 7 ? 1 : 2;
          if (k !== st.fightStage) { st.fightStage = k; fightDo(k); st.row?.select(k === 3 ? -1 : k); }
        }
        kit.follow(st, 'wash', st.wantWash, dt, 1.6);
        kit.follow(st, 'anti', st.wantAnti, dt, 2);
        kit.follow(st, 'vacc', st.wantVacc, dt, 2);
        handGerms.forEach((g, i) => {
          const w = st.wash;
          g.m.position.set(g.p.x + Math.sin(i * 3) * w * 0.4, g.p.y + w * (0.9 + rand(i) * 0.6), g.p.z + Math.cos(i * 2) * w * 0.3);
          g.m.scale.setScalar(g.s * Math.max(0.001, 1 - w));
          g.m.rotation.y = t * 0.5 + i;
        });
        bubbles.forEach((b, i) => {
          const w = st.wash, on = w > 0.02 && w < 0.98;
          b.visible = on;
          if (on) b.position.set(HX + (rand(i + 410) - 0.5) * 1.2, 0.3 + ((t * 0.5 + rand(i + 420)) % 1) * 0.9, (rand(i + 430) - 0.5) * 1.3);
        });
        bodyBact.forEach((b, i) => {
          const a = b.a + t * 0.25, pop = st.anti;
          b.m.position.set(BX + Math.cos(a) * b.r, 0.2, Math.sin(a) * b.r);
          b.m.rotation.y = -a;
          b.m.scale.setScalar(1.6 * Math.max(0.001, pop < 0.3 ? 1 + pop : (1 - pop) * 1.86));
        });
        bodyVirusMat.color.copy(purple).lerp(grey, st.vacc);
        bodyVir.forEach((v, i) => {
          const a = v.a - t * 0.2 * (1 - st.vacc);
          v.m.position.set(BX + Math.cos(a) * v.r, 0.24, Math.sin(a) * v.r);
          v.m.rotation.set(t * 0.5 + i, t * 0.3, 0);
          const ab = antibodies[i];
          ab.visible = st.vacc > 0.02;
          ab.position.set(kit.lerp(BX + Math.cos(a) * 1.6, v.m.position.x + 0.12, st.vacc), kit.lerp(0.9, 0.42, st.vacc), kit.lerp(Math.sin(a) * 1.6, v.m.position.z, st.vacc));
          ab.rotation.z = Math.PI;
        });
      }
      return true;
    },
  };

  function animateProtists(t) {
    // Amoeba: pseudopods bulge out and pull back in turn.
    const P = amGeo.attributes.position, arr = P.array;
    let best = -1, bx = 0, by = 0, bz = 0;
    for (let i = 0; i < arr.length; i += 3) {
      const x = amBase[i] / 0.75, y = amBase[i + 1] / 0.75, z = amBase[i + 2] / 0.75;
      let r = 1 + 0.04 * Math.sin(t * 2 + x * 4 + z * 3);
      for (let k = 0; k < 3; k++) {
        const d = LOBES[k], dot = Math.max(0, x * d.x + y * d.y + z * d.z), amp = 0.55 * (0.5 + 0.5 * Math.sin(t * 0.9 + k * 2.1));
        r += amp * Math.pow(dot, 6);
      }
      const R = 0.75 * r;
      arr[i] = x * R; arr[i + 1] = y * R * 0.55; arr[i + 2] = z * R;
      if (r > best) { best = r; bx = arr[i]; by = arr[i + 1]; bz = arr[i + 2]; }
    }
    P.needsUpdate = true;
    lobeTip.position.set(bx, by + 0.1, bz);
    am.rotation.y = Math.sin(t * 0.2) * 0.3;
    // Paramecium: cilia beat in waves that run along the body.
    const cp = ciliaGeo.attributes.position.array;
    for (let i = 0; i < NC; i++) {
      const bx2 = ciliaBase[i * 3], by2 = ciliaBase[i * 3 + 1], bz2 = ciliaBase[i * 3 + 2];
      const beat = Math.sin(t * 9 - bx2 * 7);
      cp[i * 6 + 3] = bx2 + ciliaN[i * 3] * 0.09 + beat * 0.05;
      cp[i * 6 + 4] = by2 + ciliaN[i * 3 + 1] * 0.09;
      cp[i * 6 + 5] = bz2 + ciliaN[i * 3 + 2] * 0.09;
    }
    ciliaGeo.attributes.position.needsUpdate = true;
    pa.rotation.x = Math.sin(t * 0.8) * 0.15;
    pa.position.y = Math.sin(t * 1.1) * 0.04;
    // Euglena: flagellum whirls, body sways.
    eu.flag.rotation.x = t * 6;
    eu.g.rotation.z = Math.sin(t * 1.3) * 0.08;
  }
}

// ---------- Builders ----------

// The 12 corner directions of an icosahedron.
function icoDirs(THREE) {
  const p = (1 + Math.sqrt(5)) / 2, out = [];
  for (const a of [-1, 1]) for (const b of [-p, p]) out.push(new THREE.Vector3(0, a, b), new THREE.Vector3(a, b, 0), new THREE.Vector3(b, 0, a));
  return out.map(v => v.normalize());
}

// Outline of a capsule (radius r, straight part L) for LatheGeometry, from the bottom pole to the top pole.
function capsuleProfile(THREE, r, L, n = 8) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(r * Math.cos(a), -L / 2 + r * Math.sin(a))); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(1e-4, r * Math.cos(a)), L / 2 + r * Math.sin(a))); }
  pts[0].x = 1e-4;
  return pts;
}

// A corkscrew. Along x (from x0 to x1) by default, or along y.
function helix(THREE, a0, a1, amp, turns, axis = 'x') {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, w = Math.min(1, u * 4) * amp, ang = u * turns * Math.PI * 2, along = a0 + (a1 - a0) * u;
    pts.push(axis === 'x' ? new THREE.Vector3(along, Math.sin(ang) * w, Math.cos(ang) * w) : new THREE.Vector3(Math.sin(ang) * w, along, Math.cos(ang) * w));
  }
  return new THREE.CatmullRomCurve3(pts);
}

// Euglena, about 2 units long along x (front, with the flagellum, at -x). Parts glow as 'eug'.
function euglena(THREE, kit, P) {
  const g = new THREE.Group();
  const prof = [];
  for (let i = 0; i <= 16; i++) { const y = -1 + (2 * i) / 16; prof.push(new THREE.Vector2(Math.max(1e-3, 0.32 * Math.pow(1 - y * y, 0.75) * (1 - 0.25 * y)), y)); }
  const body = kit.mesh(new THREE.LatheGeometry(prof, 24), P.mat('eug', 0xa8d88a, { transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.35 }), [0, 0, 0], g);
  body.rotation.z = Math.PI / 2; // lathe +y becomes -x: the wide end (front) points to -x
  body.renderOrder = 2;
  const chl = kit.mat(0x2f8f3a, { roughness: 0.5 }), cg = new THREE.SphereGeometry(1, 10, 6);
  for (let i = 0; i < 11; i++) {
    const x = -0.6 + (i / 10) * 1.2, a = i * 2.2, r = 0.14 * (1 - Math.abs(x) * 0.5);
    const c = kit.mesh(cg, chl, [x, Math.sin(a) * r, Math.cos(a) * r], g);
    c.scale.set(0.11, 0.05, 0.06); c.rotation.set(a, 0, 0.3);
  }
  kit.mesh(new THREE.SphereGeometry(0.1, 14, 10), kit.mat(0x6b4fa8), [0.15, 0, 0], g);
  kit.mesh(new THREE.SphereGeometry(0.05, 10, 8), kit.mat(0xe23b2e, { emissive: 0x7a1010 }), [-0.72, 0.1, 0.12], g);
  const flag = new THREE.Group();
  flag.position.x = -0.98;
  g.add(flag);
  kit.mesh(new THREE.TubeGeometry(helix(THREE, 0, -1.5, 0.12, 2), 50, 0.018, 4), kit.mat(0x5d9a4a), [0, 0, 0], flag);
  const eyeAnchor = new THREE.Object3D(); eyeAnchor.position.set(-0.75, 0.16, 0.12); g.add(eyeAnchor);
  const chlAnchor = new THREE.Object3D(); chlAnchor.position.set(0.45, -0.12, 0.1); g.add(chlAnchor);
  return { g, flag, eyeAnchor, chlAnchor };
}

// A strand of hair: brown with overlapping cuticle scales.
function hairTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#6b4428'; x.fillRect(0, 0, 128, 256);
  x.strokeStyle = '#4a2c18'; x.lineWidth = 3;
  for (let y = 10; y < 256; y += 22) {
    x.beginPath();
    for (let i = 0; i <= 128; i += 8) x.lineTo(i, y + Math.sin(i * 0.09 + y) * 5);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 18);
  return t;
}
