// Genes, DNA and chromosomes: a zoom from a body cell to its nucleus, a copied chromosome, DNA wound round
// proteins and the double helix (with a live width-of-view readout); a turning double helix that untwists into a
// ladder; a base-pairing game; three genes read codon by codon into protein chains that fold and build a trait;
// a human karyotype (46 chromosomes in 23 pairs, XX or XY); mitosis and meiosis in a model cell with two pairs;
// and one-base mutations in the start of the haemoglobin gene (one has no effect, one causes sickle cell).
import { chromosome, letterTexture, rand } from '../_shared/genetics.js';
import { redCellGeometry } from '../_shared/body.js';

const ZM = [0, 0, 0];     // zoom
const HX = [14, 0, 0];    // double helix
const GM = [28, 0, 0];    // base-pair game
const GN = [44, 0, 0];    // genes and proteins
const KY = [62, 0, 0];    // karyotype
const DV = [80, 0, 0];    // mitosis and meiosis
const MU = [96, 0, 0];    // mutation

const BASE = { A: 0xe5484d, T: 0xf5b400, C: 0x2f80ed, G: 0x27a845 };
const BASE_CSS = { A: '#e5484d', T: '#f5b400', C: '#2f80ed', G: '#27a845' };
const PAIR = { A: 'T', T: 'A', C: 'G', G: 'C' };
const NAME = { A: 'adenine', T: 'thymine', C: 'cytosine', G: 'guanine' };
const MOTHER = 0xf08a2e, FATHER = 0x2bb3a3;
const chip = b => `<span style="display:inline-block;min-width:1.4em;text-align:center;border-radius:6px;padding:0 3px;font-weight:800;color:${b === 'T' ? '#3a2a00' : '#fff'};background:${BASE_CSS[b]}">${b}</span>`;

// Human chromosome sizes (millions of base pairs, rounded) and roughly where the centromere sits (fraction of
// the length in the short arm). Used only for the relative sizes and shapes of the model.
const KAR = [[248, 0.5], [242, 0.39], [198, 0.46], [190, 0.27], [181, 0.27], [171, 0.35], [159, 0.37], [145, 0.31], [138, 0.33], [134, 0.3], [135, 0.4],
  [133, 0.27], [114, 0.15], [107, 0.16], [102, 0.17], [90, 0.41], [83, 0.31], [80, 0.21], [59, 0.45], [64, 0.43], [47, 0.25], [51, 0.27]];
const XC = [156, 0.39], YC = [57, 0.18];

// Zoom: each level is a model at its own scale. ratio = how many times bigger the next level's model is than the
// part of this level it zooms into. Width of the first view is about 26 µm.
const W0_UM = 26;

// Genes for step 4 (8 codons each, a model: real genes are thousands of bases long).
const GENES = [
  { name: 'Pigment gene', protein: 'an enzyme', trait: 'Eye colour', seq: 'ATGGCTAAAGAGTTCGGACTTTGG', col: 0x8a5a2b,
    txt: 'The <b>pigment gene</b> codes for an <b>enzyme</b>, a protein that speeds up a chemical reaction. This one helps make <b>melanin</b>, the brown pigment in your eyes, hair and skin.' },
  { name: 'Keratin gene', protein: 'keratin', trait: 'Hair', seq: 'ATGTCCTGCGGATACCGCAGCTTT', col: 0xd99a2b,
    txt: 'The <b>keratin gene</b> codes for <b>keratin</b>, a tough protein. Long strands of keratin build your <b>hair and nails</b>.' },
  { name: 'Haemoglobin gene', protein: 'haemoglobin', trait: 'Red blood cell', seq: 'ATGGTGCACCTGACTCCTGAGGAG', col: 0xd23a3a,
    txt: 'The <b>haemoglobin gene</b> codes for <b>haemoglobin</b>, the protein in red blood cells that <b>carries oxygen</b> round your body.' },
];
const AA_COLORS = [0x5b8def, 0xf08a2e, 0x9b6bd9, 0x2bb3a3, 0xe5484d, 0xf5b400, 0x27a845, 0xe06fb0];

// Mutation: the start of the human haemoglobin (beta) gene, codons 1 to 6.
const MSEQ = 'GTGCACCTGACTCCTGAG';
const MUT = [
  { label: 'Original gene', at: -1, base: '', aa: ['Val', 'His', 'Leu', 'Thr', 'Pro', 'Glu'] },
  { label: 'Change: GAG → GAA', at: 17, base: 'A', aa: ['Val', 'His', 'Leu', 'Thr', 'Pro', 'Glu'] },
  { label: 'Change: GAG → GTG', at: 16, base: 'T', aa: ['Val', 'His', 'Leu', 'Thr', 'Pro', 'Val'] },
];
const AA_NAME = { Val: 'valine', His: 'histidine', Leu: 'leucine', Thr: 'threonine', Pro: 'proline', Glu: 'glutamic acid' };
const AA_COL = { Val: 0x5b8def, His: 0x9b6bd9, Leu: 0x2bb3a3, Thr: 0xf5b400, Pro: 0xe06fb0, Glu: 0xf08a2e };

const smooth = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  scene.background = new THREE.Color(0xeaf0fa);
  kit.lights(scene, { sun: [4, 9, 8], shadows: false });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const group = (p, parent = scene) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; };
  const anchor = (parent, pos) => { const o = new THREE.Object3D(); o.position.set(...pos); parent.add(o); return o; };
  const texCache = {};
  const tex = (text, opts = {}) => texCache[text + JSON.stringify(opts)] ||= letterTexture(THREE, text, opts);
  const baseTex = b => tex(b, { bg: BASE_CSS[b], fg: b === 'T' ? '#3a2a00' : '#ffffff', size: 96 });
  const tileGeo = new THREE.PlaneGeometry(1, 1);
  const tile = (map, size, pos, parent) => {
    const m = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
    m.scale.set(size, size, 1); m.position.set(...pos); parent.add(m); m.renderOrder = 4;
    return m;
  };

  // ---------- A DNA ladder: two backbones of beads, joined by half-rungs coloured by base ----------
  // Built from three InstancedMeshes; layout(f) twists it (f = 1) or lays it out as a flat ladder (f = 0).
  // Strand 0 is at x = -R and strand 1 at x = +R when flat; base pairs run along +y.
  function makeLadder(parent, { n, seq, R = 0.5, rise = 0.2, twist = Math.PI / 5, bead = 0.08, rung = 0.04, link = 0.03, backbone = 0x7d8fb3, seg = 10, matFn = (c, o) => kit.mat(c, o) }) {
    const g = new THREE.Group();
    parent.add(g);
    const beadM = new THREE.InstancedMesh(new THREE.SphereGeometry(bead, seg, Math.max(6, seg - 2)), matFn(backbone, { roughness: 0.45 }), 2 * n);
    const linkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(link, link, 1, 6, 1, true), matFn(backbone, { roughness: 0.5 }), 2 * (n - 1));
    const rungM = new THREE.InstancedMesh(new THREE.CylinderGeometry(rung, rung, 1, 8), matFn(0xffffff, { roughness: 0.5 }), 2 * n);
    for (const m of [beadM, linkM, rungM]) { m.frustumCulled = false; m.castShadow = m.receiveShadow = false; g.add(m); }
    const bases = [seq.split(''), seq.split('').map(b => PAIR[b])];
    const grow = new Float32Array(2 * n).fill(1);
    const P = Array.from({ length: 2 * n }, () => new THREE.Vector3());
    const d = new THREE.Object3D(), up = V(0, 1, 0), dir = new THREE.Vector3(), E = new THREE.Vector3(), c = new THREE.Color();
    const anchors = [];
    let tw = 1;
    const setBase = (i, s, b) => { bases[s][i] = b; rungM.setColorAt(i * 2 + s, c.setHex(BASE[b])); if (rungM.instanceColor) rungM.instanceColor.needsUpdate = true; };
    for (let i = 0; i < n; i++) { setBase(i, 0, bases[0][i]); setBase(i, 1, bases[1][i]); }
    const put = (mesh, idx, a, b, s) => { // a cylinder of unit height from point a to point b, or hidden
      const len = a.distanceTo(b);
      if (len < 1e-4 || s < 1e-3) { d.position.copy(a); d.scale.setScalar(1e-4); d.quaternion.identity(); }
      else { d.position.addVectors(a, b).multiplyScalar(0.5); dir.subVectors(b, a).divideScalar(len); d.quaternion.setFromUnitVectors(up, dir); d.scale.set(s, len, s); }
      d.updateMatrix(); mesh.setMatrixAt(idx, d.matrix);
    };
    function layout(f = tw) {
      tw = f;
      for (let i = 0; i < n; i++) {
        const y = (i - (n - 1) / 2) * rise, a = i * twist * f;
        for (let s = 0; s < 2; s++) {
          const ang = a + (s ? 0 : Math.PI), k = i * 2 + s, gr = grow[k];
          P[k].set(R * Math.cos(ang), y, R * Math.sin(ang));
          d.position.copy(P[k]); d.quaternion.identity(); d.scale.setScalar(Math.max(1e-4, gr)); d.updateMatrix();
          beadM.setMatrixAt(k, d.matrix);
          E.set(P[k].x * (1 - gr * 0.97), y, P[k].z * (1 - gr * 0.97));
          put(rungM, k, P[k], E, 1);
        }
      }
      for (let i = 0; i < n - 1; i++) for (let s = 0; s < 2; s++) put(linkM, i * 2 + s, P[i * 2 + s], P[(i + 1) * 2 + s], Math.min(grow[i * 2 + s], grow[(i + 1) * 2 + s]) > 0.5 ? 1 : 0);
      beadM.instanceMatrix.needsUpdate = linkM.instanceMatrix.needsUpdate = rungM.instanceMatrix.needsUpdate = true;
      for (const an of anchors) {
        if (an.kind === 'pair') an.o.position.set(0, (an.i - (n - 1) / 2) * rise, 0);
        else an.o.position.copy(P[an.i * 2 + an.s]);
      }
    }
    const anchorAt = (i, s, kind = 'bead') => { const o = new THREE.Object3D(); g.add(o); anchors.push({ o, i, s, kind }); return o; };
    layout(1);
    return { g, n, R, rise, grow, bases, setBase, layout, anchorAt, get twist() { return tw; } };
  }

  // =====================================================================================
  // Step 1: zoom from a cell to DNA
  // =====================================================================================
  const zoomG = group(ZM);
  const levels = [];
  const newLevel = ratio => { const L = { g: group([0, 0, 0], zoomG), mats: [], ratio, focus: V(0, 0, 0), tags: [], alpha: 1 }; levels.push(L); return L; };
  const lmat = (L, color, opts = {}) => { const m = kit.mat(color, { ...opts, transparent: true }); L.mats.push([m, opts.opacity ?? 1, m.depthWrite]); return m; };
  const worldIn = (L, o) => { L.g.updateMatrixWorld(true); return o.getWorldPosition(new THREE.Vector3()).sub(zoomG.position); };

  // Level 0: a body cell with its nucleus.
  const L0 = newLevel(1 / 0.35);
  const memb = kit.mesh(new THREE.SphereGeometry(1, 32, 22), lmat(L0, 0xf4a6b8, { opacity: 0.28, depthWrite: false, roughness: 0.4 }), [0, 0, 0], L0.g);
  memb.renderOrder = 2;
  const N0 = [0.22, 0.12, 0.12];
  kit.mesh(new THREE.SphereGeometry(0.35, 28, 18), lmat(L0, 0x8e5cc4, { roughness: 0.5 }), N0, L0.g);
  const mitoGeo = new THREE.CapsuleGeometry(0.05, 0.14, 3, 8), mitoMat = lmat(L0, 0xf08a2e, { roughness: 0.55 });
  [[-0.55, 0.3, 0.2], [-0.4, -0.45, 0.3], [0.5, -0.45, -0.2], [-0.2, 0.55, -0.4], [0.62, 0.35, -0.3], [-0.6, -0.05, -0.45], [0.15, -0.6, 0.45]].forEach((p, i) => {
    const m = kit.mesh(mitoGeo, mitoMat, p, L0.g); m.rotation.set(i, i * 0.7, 1 + i * 0.5);
  });
  L0.focus.set(...N0);
  L0.tags.push(label('Cell', anchor(L0.g, [-0.45, 0.85, 0.2]), { cls: 'big' }), label('Nucleus', anchor(L0.g, [N0[0], N0[1] + 0.33, N0[2]])));

  // Level 1: the nucleus, with its chromosomes coiled up as the cell gets ready to divide.
  const L1 = newLevel(4);
  const env = kit.mesh(new THREE.SphereGeometry(1.03, 32, 22), lmat(L1, 0xb48ae0, { opacity: 0.26, depthWrite: false, roughness: 0.4 }), [0, 0, 0], L1.g);
  env.renderOrder = 2;
  const nucMats = [0x7b5cc4, 0x9d7be0, 0x6a4fb0, 0xa58ad8].map(c => lmat(L1, c, { roughness: 0.55 }));
  const hiMat = lmat(L1, 0xf08a2e, { roughness: 0.5 });
  const F1 = V(0.3, 0.1, 0.32);
  const hiChr = chromosome(THREE, kit, { len: 0.6, r: 0.045, cen: 0.4, doubled: true, radial: 6, mat: hiMat, spread: 0.12 });
  hiChr.g.position.copy(F1); L1.g.add(hiChr.g);
  for (let i = 1, tries = 0; i < 46 && tries < 2000; tries++) {
    const p = V(rand(tries * 3 + 1) * 2 - 1, rand(tries * 3 + 2) * 2 - 1, rand(tries * 3 + 3) * 2 - 1).multiplyScalar(0.72);
    if (p.length() > 0.72 || p.distanceTo(F1) < 0.42) continue;
    const [mb, cen] = i <= 44 ? KAR[(i - 1) >> 1] : i === 45 ? XC : YC;
    const c = chromosome(THREE, kit, { len: 0.12 + 0.4 * mb / 248, r: 0.03, cen, doubled: true, radial: 5, mat: nucMats[i % 4], spread: 0.12 });
    c.g.position.copy(p); c.g.rotation.set(rand(i + 300) * 6, rand(i + 400) * 6, rand(i + 500) * 6);
    L1.g.add(c.g);
    i++;
  }
  L1.focus.copy(F1);
  L1.tags.push(label('Chromosome', anchor(hiChr.top, [0, 0.03, 0])), label('Nucleus', anchor(L1.g, [0.5, -0.38, 0.6]), { cls: 'big' }));

  // Level 2: one copied chromosome (two chromatids), with a loop of DNA fibre poking out.
  const L2 = newLevel(15);
  const stripe = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#d9d0c4'; g.lineWidth = 9;
    for (let k = -2; k < 4; k++) { g.beginPath(); g.moveTo(k * 22, 64); g.lineTo(k * 22 + 32, 0); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 5); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const bigMat = lmat(L2, 0xf08a2e, { roughness: 0.6, map: stripe });
  const bigChr = chromosome(THREE, kit, { len: 2.4, r: 0.2, cen: 0.4, doubled: true, radial: 16, mat: bigMat, spread: 0.12 });
  L2.g.add(bigChr.g);
  const loopPts = [[0.16, -0.5, 0.06], [0.26, -0.45, 0.12], [0.34, -0.52, 0.16], [0.33, -0.62, 0.13], [0.24, -0.64, 0.08], [0.16, -0.58, 0.04]].map(p => V(...p));
  const loopCurve = new THREE.CatmullRomCurve3(loopPts, false, 'centripetal');
  const fibreMat = lmat(L2, 0x6c7a96, { roughness: 0.5 });
  kit.mesh(new THREE.TubeGeometry(loopCurve, 40, 0.012, 5), fibreMat, [0, 0, 0], bigChr.chromatids[1]);
  const loopBead = new THREE.SphereGeometry(0.02, 8, 6);
  for (let k = 1; k < 6; k++) kit.mesh(loopBead, lmat(L2, 0x9b7bd4), loopCurve.getPoint(k / 6).toArray(), bigChr.chromatids[1]);
  const loopA = anchor(bigChr.chromatids[1], [0.26, -0.55, 0.11]);
  L2.focus.copy(worldIn(L2, loopA));
  L2.tags.push(label('Chromosome', anchor(bigChr.top, [0, 0.05, 0]), { cls: 'big' }), label('Coiled DNA', anchor(bigChr.chromatids[1], [0.34, -0.48, 0.16])));

  // Level 3: DNA wound round balls of protein (histones), like thread on spools.
  const L3 = newLevel(29.2);
  const histMat = lmat(L3, 0x9b7bd4, { roughness: 0.55 }), dnaMat = lmat(L3, 0x6c7a96, { roughness: 0.45 });
  const NUC = [[-1.45, 0.35], [-0.9, -0.12], [-0.3, 0.105], [0.3, 0.105], [0.9, 0.42], [1.45, -0.05]];
  const RW = 0.105, PITCH = 0.045;
  const path = [V(-1.95, 0.0, -0.05)];
  NUC.forEach(([x, y], j) => {
    const z0 = -0.045;
    for (let k = 0; k <= 16; k++) {
      const th = -Math.PI / 2 + (k / 16) * Math.PI * 4;
      path.push(V(x + RW * Math.cos(th), y + RW * Math.sin(th), z0 + PITCH * (k / 8)));
    }
    kit.mesh(new THREE.SphereGeometry(0.088, 16, 12), histMat, [x, y, z0 + PITCH], L3.g);
  });
  path.push(V(1.95, 0.05, 0.0));
  kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path, false, 'centripetal'), 420, 0.017, 6), dnaMat, [0, 0, 0], L3.g);
  L3.focus.set(0, 0, 0);
  L3.tags.push(label('Protein (histone)', anchor(L3.g, [0.9, 0.55, 0.05])), label('DNA', anchor(L3.g, [-0.6, 0.02, 0.0]), { cls: 'cool' }));

  // Level 4: the double helix.
  const L4 = newLevel(1);
  let zs = ''; for (let i = 0; i < 26; i++) zs += 'ATCG'[Math.floor(rand(i + 70) * 4)];
  const zHelix = makeLadder(L4.g, { n: 26, seq: zs, R: 0.5, rise: 0.17, bead: 0.075, rung: 0.035, link: 0.028, matFn: (c, o) => lmat(L4, c, o) });
  zHelix.g.rotation.z = -Math.PI / 2;
  L4.tags.push(label('DNA double helix', anchor(L4.g, [-0.4, 0.62, 0]), { cls: 'big' }));

  let Zacc = 0;
  for (const L of levels) { L.Z = Zacc; L.dz = L === L4 ? 0 : Math.log10(L.ratio); Zacc += L.dz; }
  const ZMAX = Zacc;
  const setAlpha = (L, a) => {
    L.alpha = a; L.g.visible = a > 0.01;
    for (const [m, o, dw] of L.mats) { m.opacity = o * a; m.depthWrite = dw && a > 0.98; }
  };
  let zoomZ = -1, zoomText = '';
  function applyZoom(z) {
    zoomZ = z;
    let cur = levels.length - 1;
    for (let j = 0; j < levels.length - 1; j++) if (z < levels[j].Z + levels[j].dz) { cur = j; break; }
    for (const L of levels) setAlpha(L, 0);
    const L = levels[cur], u = z - L.Z, f = L.dz ? u / L.dz : 0, s = Math.pow(10, u);
    L.g.scale.setScalar(s);
    L.g.position.copy(L.focus).multiplyScalar(-s * smooth(0, 0.7, f));
    const fade = cur < levels.length - 1 ? smooth(0.7, 1, f) : 0;
    setAlpha(L, 1 - fade);
    if (fade > 0) { const N = levels[cur + 1]; N.g.scale.setScalar(Math.pow(10, z - N.Z)); N.g.position.set(0, 0, 0); setAlpha(N, fade); }
    const main = fade > 0.5 ? cur + 1 : cur;
    levels.forEach((Lv, j) => Lv.tags.forEach(tg => tg.show(st.step === 0 && !st.quiz && j === main && Lv.alpha > 0.5)));
    if (st.step === 0 && !st.quiz) {
      const w = W0_UM / Math.pow(10, z);
      const width = w >= 1 ? `${w >= 10 ? Math.round(w) : w.toFixed(1)} µm` : `${w * 1000 >= 10 ? Math.round(w * 1000) : (w * 1000).toFixed(1)} nm`;
      const what = [
        '<b>Cell</b>: a human body cell is about 20 µm across (1 µm = 1 micrometre = one thousandth of a millimetre). The purple ball is the <b>nucleus</b>.',
        '<b>Nucleus</b>: it holds the <b>chromosomes</b>. Here they are coiled up tightly, ready for the cell to divide.',
        '<b>Chromosome</b>: one very long DNA molecule, coiled up again and again. This one has been copied, so it has two matching halves joined in the middle.',
        '<b>DNA wound round proteins</b>: the DNA is wrapped round small balls of protein, like thread on spools.',
        '<b>DNA double helix</b>: two strands twisted together, only about <b>2 nm</b> wide (1 nm = one millionth of a millimetre).',
      ][main];
      const txt = `${what}<br>Width of this view: about <b>${width}</b>`;
      if (txt !== zoomText) { zoomText = txt; ui.readout(txt); }
    }
  }

  // =====================================================================================
  // Step 2: the double helix
  // =====================================================================================
  const hxG = group(HX);
  const helixSeq = 'ATGCGTACCGATTGCAGTCA';
  const helix = makeLadder(hxG, { n: 20, seq: helixSeq, R: 0.55, rise: 0.2, bead: 0.085, rung: 0.045, link: 0.03 });
  helix.g.position.y = 2.0;
  const hxTags = {
    back: label('Backbone', helix.anchorAt(17, 0)),
    pair: label('Base pair', helix.anchorAt(8, 0, 'pair')),
  };

  // =====================================================================================
  // Step 3: base-pair game
  // =====================================================================================
  const gmG = group(GM);
  const GAME_SEQS = ['ATGCCGTA', 'GGATCCTA', 'TACGGATC', 'CATTGCAG'];
  const GN_R = 0.55, GN_RISE = 0.55;
  const game = makeLadder(gmG, { n: 8, seq: GAME_SEQS[0], R: GN_R, rise: GN_RISE, bead: 0.1, rung: 0.06, link: 0.035, seg: 12 });
  game.g.rotation.z = -Math.PI / 2;
  game.g.position.y = 1.2;
  game.layout(0);
  const gx = i => (i - 3.5) * GN_RISE;
  const topTiles = [], botTiles = [];
  for (let i = 0; i < 8; i++) {
    topTiles.push(tile(baseTex('A'), 0.34, [gx(i), 1.2 + GN_R + 0.33, 0], gmG));
    botTiles.push(tile(baseTex('T'), 0.34, [gx(i), 1.2 - GN_R - 0.33, 0], gmG));
  }
  const markMat = new THREE.MeshBasicMaterial({ color: 0x1f7ae0, transparent: true, opacity: 0.9 });
  const marker = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 32), markMat);
  gmG.add(marker);
  const gmTags = { tmpl: label('Template', anchor(gmG, [gx(0) - 0.75, 1.2 + GN_R - 0.05, 0])), part: label('Partner', anchor(gmG, [gx(0) - 0.75, 1.2 - GN_R - 0.05, 0]), { cls: 'cool' }) };
  const gs = { seq: GAME_SEQS[0], round: 0, filled: 0, flash: 0, wait: 0, msg: '' };
  function gameSet(round) {
    gs.round = round; gs.seq = GAME_SEQS[round % GAME_SEQS.length]; gs.filled = 0; gs.flash = 0; gs.wait = 0;
    for (let i = 0; i < 8; i++) {
      game.setBase(i, 0, gs.seq[i]); game.setBase(i, 1, PAIR[gs.seq[i]]);
      game.grow[i * 2 + 1] = 0;
      topTiles[i].material.map = baseTex(gs.seq[i]);
      botTiles[i].material.map = baseTex(PAIR[gs.seq[i]]);
      botTiles[i].visible = false;
    }
    game.layout(0);
    gameMsg('Pick the base that pairs with the one above the blue ring.');
  }
  function gameMsg(m) {
    gs.msg = m;
    if (st.step !== 2) return;
    const done = gs.filled >= 8;
    ui.readout(`${m}<br>Matched: <b>${gs.filled} of 8</b>${done ? ` · partner strand: ${gs.seq.split('').map(b => chip(PAIR[b])).join(' ')}` : ''}<br>Rule: ${chip('A')} pairs with ${chip('T')} · ${chip('C')} pairs with ${chip('G')}`);
  }
  function gamePick(b) {
    if (gs.filled >= 8) return;
    const want = PAIR[gs.seq[gs.filled]];
    if (b === want) {
      const i = gs.filled;
      botTiles[i].visible = true; botTiles[i].scale.set(0.01, 0.01, 1);
      gs.filled++;
      gameMsg(gs.filled >= 8 ? '<b>Well done!</b> Every base has its partner.' : `Yes: ${chip(gs.seq[i])} pairs with ${chip(b)}.`);
      if (gs.filled >= 8) gs.wait = 0;
    } else {
      gs.flash = 1;
      gameMsg(`Not quite: ${chip(gs.seq[gs.filled])} (${NAME[gs.seq[gs.filled]]}) pairs with ${chip(want)}, not ${chip(b)}.`);
    }
  }

  // =====================================================================================
  // Step 4: genes code for proteins
  // =====================================================================================
  const gnG = group(GN);
  const SPACER = 'TTAGCA';
  let gnSeq = SPACER.slice(0, 4);
  const geneStart = [];
  GENES.forEach((G, j) => { geneStart.push(gnSeq.length); gnSeq += G.seq + (j < 2 ? SPACER : 'GCTA'); });
  const GRISE = 0.1, GR = 0.2, GY = 0.75;
  const gene = makeLadder(gnG, { n: gnSeq.length, seq: gnSeq, R: GR, rise: GRISE, bead: 0.042, rung: 0.022, link: 0.018, seg: 8 });
  gene.g.rotation.z = -Math.PI / 2; gene.g.position.y = GY;
  gene.layout(0);
  const bx = i => (i - (gnSeq.length - 1) / 2) * GRISE;
  const geneBoxes = GENES.map((G, j) => {
    const x0 = bx(geneStart[j]), x1 = bx(geneStart[j] + 23);
    const m = kit.mesh(new THREE.BoxGeometry(x1 - x0 + 0.12, GR * 2 + 0.22, 0.2), new THREE.MeshBasicMaterial({ color: G.col, transparent: true, opacity: 0.14, depthWrite: false }), [(x0 + x1) / 2, GY, 0], gnG);
    m.renderOrder = 3;
    return m;
  });
  const reader = kit.mesh(new THREE.BoxGeometry(GRISE * 3 + 0.02, GR * 2 + 0.32, 0.3), new THREE.MeshBasicMaterial({ color: 0x1f7ae0, transparent: true, opacity: 0.25, depthWrite: false }), [0, GY, 0], gnG);
  reader.renderOrder = 5;
  // Protein chain: 8 amino acids (beads). Unfolded in a row, folded into a compact shape.
  const chainG = group([0, -0.25, 0], gnG);
  const aaGeo = new THREE.SphereGeometry(0.1, 14, 10);
  const aas = AA_COLORS.map(c => kit.mesh(aaGeo, kit.mat(c, { roughness: 0.45 }), [0, 0, 0], chainG));
  const bondGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6), bondMat = kit.mat(0xb8c2d0);
  const bonds = aas.slice(1).map(() => kit.mesh(bondGeo, bondMat, [0, 0, 0], chainG));
  const FOLD = [[-0.12, 0.1, 0.05], [0.0, 0.18, -0.08], [0.13, 0.08, 0.02], [0.08, -0.06, 0.13], [-0.07, -0.08, 0.12], [-0.17, -0.02, -0.06], [-0.02, -0.17, -0.07], [0.15, -0.12, -0.1]].map(p => V(...p));
  const chainTag = anchor(chainG, [0, 0.2, 0]);
  // Traits built by each protein: an eye, hair, a red blood cell.
  const traitG = group([0, -1.05, 0], gnG);
  const eye = new THREE.Group(); traitG.add(eye);
  kit.mesh(new THREE.SphereGeometry(0.26, 24, 16), kit.mat(0xfbfbf8, { roughness: 0.3 }), [0, 0, 0], eye);
  const iris = kit.mesh(new THREE.CircleGeometry(0.13, 24), kit.mat(0x7a4a22, { roughness: 0.5 }), [0, 0, 0.262], eye);
  kit.mesh(new THREE.CircleGeometry(0.055, 20), kit.mat(0x111111), [0, 0, 0.002], iris);
  const hair = new THREE.Group(); traitG.add(hair);
  const hairMat = kit.mat(0x4a2c17, { roughness: 0.7 });
  for (let k = 0; k < 7; k++) {
    const x = (k - 3) * 0.07, pts = [];
    for (let q = 0; q <= 6; q++) pts.push(V(x + Math.sin(q * 0.9 + k) * 0.04, -0.28 + q * 0.09, Math.cos(q * 0.8 + k) * 0.03));
    kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.014, 5), hairMat, [0, 0, 0], hair);
  }
  const rbc = kit.mesh(redCellGeometry(THREE, 0.3, 24, 6), kit.mat(0xd23a3a, { roughness: 0.45, side: THREE.DoubleSide }), [0, 0, 0], traitG);
  rbc.rotation.x = 1.25;
  const traitObjs = [eye, hair, rbc];
  const traitTag = anchor(traitG, [0, 0.32, 0]);
  const gnTags = { gene: label('Gene', anchor(gnG, [0, GY + 0.36, 0]), { cls: 'warm' }), protein: label('Protein', chainTag), trait: label('Trait', traitTag, { cls: 'big' }) };
  const gnTagGene = gnTags.gene;
  const gsN = { gene: 0, read: 0, readTo: 0, fold: 0, show: 0 };
  const geneCenter = j => (bx(geneStart[j]) + bx(geneStart[j] + 23)) / 2;
  const gnView = j => ({ radius: 1.55, yaw: 0, pitch: 0.08, target: [GN[0] + geneCenter(j), -0.15, 0] });

  // =====================================================================================
  // Step 5: karyotype
  // =====================================================================================
  const kyG = group(KY);
  const KS = 1.2 / 248, KR = 0.047;
  const kyPairs = [];
  const ROWS = [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11], [12, 13, 14, 15, 16, 17], [18, 19, 20, 21, 22]];
  const info = j => (j < 22 ? KAR[j] : XC);
  let rowY = 1.9;
  const kyNum = [];
  ROWS.forEach((row, ri) => {
    const maxP = Math.max(...row.map(j => info(j)[0] * KS * info(j)[1]));
    const maxQ = Math.max(...row.map(j => info(j)[0] * KS * (1 - info(j)[1])));
    if (ri) rowY -= maxP + 0.32;
    row.forEach((j, ci) => {
      const x = (ci - 2.5) * 0.95 + (j === 22 ? 0.5 : 0);
      const [mb, cen] = info(j);
      const col = new THREE.Color().setHSL(j / 23 * 0.85, 0.5, 0.62).getHex();
      const mats = [kit.mat(col, { roughness: 0.55 }), kit.mat(col, { roughness: 0.55 })];
      const a = chromosome(THREE, kit, { len: mb * KS, r: KR, cen, mat: mats[0], spread: 0.06 });
      const b = chromosome(THREE, kit, { len: mb * KS, r: KR, cen, mat: mats[1], spread: 0.06 });
      a.g.position.set(x - 0.17, rowY, 0); b.g.position.set(x + 0.17, rowY, 0);
      kyG.add(a.g, b.g);
      const p = { a, b, mats, col, x, y: rowY };
      if (j === 22) {
        const y = chromosome(THREE, kit, { len: YC[0] * KS, r: KR, cen: YC[1], mat: mats[1], spread: 0.06 });
        y.g.position.set(x + 0.17, rowY, 0); kyG.add(y.g); y.g.visible = false; p.y2 = y;
      }
      kyPairs.push(p);
      const tl = tile(tex(j < 22 ? String(j + 1) : 'XX', { fg: '#526472', size: 64 }), 0.24, [x, rowY - maxQ - 0.15, 0], kyG);
      kyNum.push(tl);
    });
    rowY -= maxQ + 0.2;
  });
  const kyTop = 1.9 + 1.2 * 0.5 + 0.32, kyBot = rowY - 0.1;
  const kyTags = { p1: label('Pair 1', anchor(kyG, [kyPairs[0].x, kyPairs[0].y + 0.62, 0])), sex: label('Sex chromosomes', anchor(kyG, [kyPairs[22].x, kyPairs[22].y + 0.42, 0]), { cls: 'warm' }) };
  const ks = { xy: false, parents: false };
  function kySet() {
    const p = kyPairs[22];
    p.b.g.visible = !ks.xy; p.y2.g.visible = ks.xy;
    kyNum[22].material.map = tex(ks.xy ? 'XY' : 'XX', { fg: '#526472', size: 64 });
    kyPairs.forEach(q => { q.mats[0].color.setHex(ks.parents ? MOTHER : q.col); q.mats[1].color.setHex(ks.parents ? FATHER : q.col); });
    if (st.step !== 4) return;
    ui.readout(`Body cell: <b>46</b> chromosomes = <b>23 pairs</b><br>22 pairs of autosomes + 1 pair of sex chromosomes: <b>${ks.xy ? 'XY (male)' : 'XX (female)'}</b>${ks.parents ? `<br><span style="color:#c8691a;font-weight:700">■ from the mother</span> · <span style="color:#1c8f83;font-weight:700">■ from the father</span>` : ''}`);
  }

  // =====================================================================================
  // Step 6: mitosis and meiosis in a model cell with two pairs of chromosomes
  // =====================================================================================
  const dvG = group(DV);
  const discGeo = new THREE.CircleGeometry(1, 48), ringGeo = new THREE.RingGeometry(0.97, 1.05, 48);
  const discMat = kit.mat(0xfdebd6, { roughness: 0.9, emissive: 0xfdebd6, emissiveIntensity: 0.3 }), ringMat = kit.mat(0xef8fa6, { roughness: 0.6 });
  const discs = [0, 1, 2, 3].map(() => {
    const d = new THREE.Group(); dvG.add(d);
    kit.mesh(discGeo, discMat, [0, 0, -0.12], d).castShadow = false;
    kit.mesh(ringGeo, ringMat, [0, 0, -0.15], d).castShadow = false;
    return d;
  });
  const CH = [[0.5, MOTHER], [0.5, FATHER], [0.3, MOTHER], [0.3, FATHER]];
  const chroms = CH.map(([len, col]) => {
    const mat = kit.mat(col, { roughness: 0.5 });
    return [0, 1].map(() => { const c = chromosome(THREE, kit, { len, r: 0.055, cen: 0.45, doubled: false, mat, radial: 10 }); c.g.position.y = 0; dvG.add(c.g); return c; });
  });
  // Keyframes: for each stage, discs [x, y, r] and chromatids [x, y, rot] (a then b) for chromosomes 0..3.
  const P0 = [[-0.45, 0.32, 0.35], [0.42, 0.42, -0.4], [-0.32, -0.5, -0.25], [0.48, -0.32, 0.6]];
  const OFF = 0.058, SPL = 0.12;
  const twin = (x, y, rot) => [[x - OFF * Math.cos(rot), y - OFF * Math.sin(rot), rot + SPL], [x + OFF * Math.cos(rot), y + OFF * Math.sin(rot), rot - SPL]];
  const Y2 = [0.72, -0.33, 0.18, -0.84];
  const KEYS = {
    mitosis: [
      { d: [[0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35]], c: P0.map(p => [p, p]), b: 0 },
      { d: [[0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35]], c: P0.map(p => twin(...p)), b: 1 },
      { d: [[0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35]], c: Y2.map(y => twin(0, y, 0)), b: 1 },
      { d: [[-0.45, 0, 1.1], [-0.45, 0, 1.1], [0.45, 0, 1.1], [0.45, 0, 1.1]], c: Y2.map(y => [[-0.92, y * 0.85, 0], [0.92, y * 0.85, 0]]), b: 1 },
      { d: [[-1.6, 0, 1.0], [-1.6, 0, 1.0], [1.6, 0, 1.0], [1.6, 0, 1.0]], c: P0.map(([x, y, r]) => [[-1.6 + x * 0.72, y * 0.72, r], [1.6 + x * 0.72, y * 0.72, r]]), b: 1 },
    ],
    meiosis: [
      { d: [[0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35]], c: P0.map(p => [p, p]), b: 0 },
      { d: [[0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35]], c: P0.map(p => twin(...p)), b: 1 },
      { d: [[0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35], [0, 0, 1.35]], c: [twin(-0.2, 0.42, 0), twin(0.2, 0.42, 0), twin(-0.2, -0.5, 0), twin(0.2, -0.5, 0)], b: 1 },
      { d: [[-1.6, 0, 1.0], [-1.6, 0, 1.0], [1.6, 0, 1.0], [1.6, 0, 1.0]], c: [twin(-1.6, 0.32, 0), twin(1.6, 0.32, 0), twin(-1.6, -0.42, 0), twin(1.6, -0.42, 0)], b: 1 },
      { d: [[-2.55, 0, 0.72], [-0.85, 0, 0.72], [0.85, 0, 0.72], [2.55, 0, 0.72]], c: [[[-2.55, 0.25, 0], [-0.85, 0.25, 0]], [[0.85, 0.25, 0], [2.55, 0.25, 0]], [[-2.55, -0.35, 0], [-0.85, -0.35, 0]], [[0.85, -0.35, 0], [2.55, -0.35, 0]]], b: 1 },
    ],
  };
  const STAGES = {
    mitosis: ['Parent cell', 'Chromosomes copied', 'Line up in the middle', 'Copies pulled apart', 'Two new cells'],
    meiosis: ['Parent cell', 'Chromosomes copied', 'Pairs line up', 'First division', 'Four sex cells'],
  };
  const dv = { mode: 'mitosis', stage: 0, stageTo: 0, auto: true, timer: 0, slider: null, row: null, shown: -1 };
  function dvPose(sv) {
    const K = KEYS[dv.mode], k = Math.min(3, Math.floor(sv)), f = kit.ease(Math.min(1, Math.max(0, sv - k)));
    const A = K[k], B = K[k + 1];
    discs.forEach((d, i) => {
      const a = A.d[i], b = B.d[i];
      d.position.set(kit.lerp(a[0], b[0], f), kit.lerp(a[1], b[1], f), 0);
      d.scale.setScalar(kit.lerp(a[2], b[2], f));
    });
    chroms.forEach((pair, j) => pair.forEach((c, w) => {
      const a = A.c[j][w], b = B.c[j][w];
      c.g.position.set(kit.lerp(a[0], b[0], f), kit.lerp(a[1], b[1], f), 0);
      c.g.rotation.z = kit.lerp(a[2], b[2], f);
      if (w === 1) c.g.scale.setScalar(Math.max(1e-3, kit.lerp(A.b, B.b, f)));
    }));
  }
  function dvReadout() {
    const s = Math.round(dv.stage);
    if (s === dv.shown || st.step !== 5) return;
    dv.shown = s;
    const mit = dv.mode === 'mitosis';
    const cells = mit ? (s < 4 ? 1 : 2) : (s < 3 ? 1 : s < 4 ? 2 : 4);
    const per = mit ? 4 : (s < 3 ? 4 : 2);
    const copied = s >= 1 && (mit ? s <= 2 : s <= 3);
    const end = mit ? 'Each new cell has <b>4</b> chromosomes, the <b>same</b> as the parent cell. In humans: 46 → 46 and 46.'
      : 'Each sex cell has <b>2</b> chromosomes, <b>one from each pair</b>: half the number. In humans: 46 → 23 in each egg or sperm.';
    ui.readout(`<b>${STAGES[dv.mode][s]}</b>: ${cells} cell${cells > 1 ? 's' : ''}, ${per} chromosomes in each${copied ? ' (each one copied)' : ''}${s === 4 ? '<br>' + end : ''}<br><span style="opacity:.8">Model cell with 2 pairs (a human cell has 23 pairs).</span>`);
  }
  function dvMode(m) {
    dv.mode = m; dv.stage = 0; dv.stageTo = 0; dv.timer = 0; dv.shown = -1;
    dv.slider?.set(0);
    dvPose(0); dvReadout();
  }

  // =====================================================================================
  // Step 7: mutations
  // =====================================================================================
  const muG = group(MU);
  const MRISE = 0.32, MR = 0.34, MY = 0.75;
  const mut = makeLadder(muG, { n: 18, seq: MSEQ, R: MR, rise: MRISE, bead: 0.07, rung: 0.04, link: 0.026, seg: 10 });
  mut.g.rotation.z = -Math.PI / 2; mut.g.position.y = MY;
  mut.layout(0);
  const mx = i => (i - 8.5) * MRISE;
  const mTop = [], mBot = [];
  for (let i = 0; i < 18; i++) {
    mTop.push(tile(baseTex(MSEQ[i]), 0.26, [mx(i), MY + MR + 0.26, 0.02], muG));
    mBot.push(tile(baseTex(PAIR[MSEQ[i]]), 0.26, [mx(i), MY - MR - 0.26, 0.02], muG));
  }
  for (let c = 0; c < 6; c++) { // codon plates behind each group of three bases
    const m = kit.mesh(new THREE.BoxGeometry(MRISE * 3 - 0.06, 0.36, 0.02), new THREE.MeshBasicMaterial({ color: c % 2 ? 0xd6e4f5 : 0xe9eef5 }), [mx(c * 3 + 1), MY + MR + 0.26, -0.03], muG);
    m.castShadow = false;
  }
  const aaY = -0.72;
  const aaBeads = [], aaTiles = [];
  const aaGeoM = new THREE.SphereGeometry(0.13, 16, 12);
  for (let c = 0; c < 6; c++) {
    const x = mx(c * 3 + 1);
    aaBeads.push(kit.mesh(aaGeoM, kit.mat(AA_COL[MUT[0].aa[c]], { roughness: 0.45 }), [x, aaY, 0], muG));
    aaTiles.push(tile(tex(MUT[0].aa[c], { fg: '#1d2b36', size: 128, scale: 0.42 }), 0.42, [x, aaY - 0.3, 0.02], muG));
    if (c) { const b = kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, MRISE * 3, 6), kit.mat(0xb8c2d0), [x - MRISE * 1.5, aaY, -0.02], muG); b.rotation.z = Math.PI / 2; }
  }
  const muRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 28), new THREE.MeshBasicMaterial({ color: 0xd9480f }));
  muG.add(muRing); muRing.visible = false;
  const muTags = { codon: label('Codon 6', anchor(muG, [mx(16), MY + MR + 0.55, 0]), { cls: 'warm' }), aa: label('Amino acids', anchor(muG, [mx(4), aaY + 0.15, 0])) };
  const ms = { k: 0, flash: 0 };
  function muSet(k) {
    ms.k = k; ms.flash = 1;
    const M = MUT[k];
    const seq = MSEQ.split('');
    if (M.at >= 0) seq[M.at] = M.base;
    seq.forEach((b, i) => { mut.setBase(i, 0, b); mut.setBase(i, 1, PAIR[b]); mTop[i].material.map = baseTex(b); mBot[i].material.map = baseTex(PAIR[b]); });
    mut.layout(0);
    M.aa.forEach((a, c) => { aaBeads[c].material.color.setHex(AA_COL[a]); aaTiles[c].material.map = tex(a, { fg: a !== MUT[0].aa[c] ? '#d9480f' : '#1d2b36', size: 128, scale: 0.42 }); });
    muRing.visible = M.at >= 0;
    if (M.at >= 0) muRing.position.set(mx(M.at), MY + MR + 0.26, 0.04);
    if (st.step !== 6) return;
    const codon = seq.slice(15, 18).join('');
    const seqHtml = [0, 1, 2, 3, 4, 5].map(c => seq.slice(c * 3, c * 3 + 3).map((b, q) => (c * 3 + q === M.at ? chip(b) : b)).join('')).join(' ');
    const eff = k === 0 ? 'This is the start of the normal haemoglobin gene. Codon 6 is <b>GAG</b>, which codes for <b>Glu</b> (glutamic acid).'
      : k === 1 ? `One base changed: codon 6 is now <b>${codon}</b>. GAA also codes for <b>Glu</b>, so the protein is <b>exactly the same</b>. This mutation has <b>no effect</b>.`
        : `One base changed: codon 6 is now <b>${codon}</b>, which codes for <b>Val</b> (valine) instead of Glu. The haemoglobin changes shape, and red blood cells can bend into a sickle shape: <b>sickle cell disease</b>.`;
    ui.readout(`<span style="font-family:ui-monospace,monospace">${seqHtml}</span><br>${eff}`);
  }

  // =====================================================================================
  const allTags = [...levels.flatMap(L => L.tags), ...Object.values(hxTags), ...Object.values(gmTags), ...Object.values(gnTags), ...Object.values(kyTags), ...Object.values(muTags)];
  const st = { step: 0, quiz: false, time: 0, auto: true, untwist: false, twist: 1, spin: 0, zoomV: 0, slider: null, row: null };

  function geneSet(j) {
    gsN.gene = j; gsN.read = 0; gsN.readTo = 0; gsN.fold = 0; gsN.show = 0;
    const G = GENES[j];
    geneBoxes.forEach((b, k) => { b.material.opacity = k === j ? 0.3 : 0.1; });
    const cx = geneCenter(j);
    chainG.position.x = cx; traitG.position.x = cx;
    gnTagGene.text = G.name; gnTagGene.at.position.x = cx;
    gnTags.trait.text = G.trait;
    traitObjs.forEach((o, k) => { o.visible = k === j; });
    st.slider?.set(0);
    geneLayout();
    if (st.step === 3 && !st.quiz) view(gnView(j));
    geneReadout();
  }
  function geneLayout() {
    const j = gsN.gene, x0 = bx(geneStart[j]);
    const nRead = Math.floor(gsN.read / 3 + 1e-6);
    reader.visible = gsN.read < 24 - 1e-3;
    reader.position.x = x0 + (Math.min(7, nRead) * 3 + 1) * GRISE;
    const cx = geneCenter(j), f = kit.ease(gsN.fold);
    aas.forEach((a, k) => {
      const show = k < nRead;
      a.visible = show;
      const ux = x0 + (k * 3 + 1) * GRISE - cx, uy = 0;
      a.position.set(kit.lerp(ux, FOLD[k].x, f), kit.lerp(uy, FOLD[k].y, f), kit.lerp(0, FOLD[k].z, f));
    });
    bonds.forEach((b, k) => {
      const p = aas[k].position, q = aas[k + 1].position;
      b.visible = k + 1 < nRead;
      b.position.addVectors(p, q).multiplyScalar(0.5);
      b.scale.set(1, Math.max(0.01, p.distanceTo(q)), 1);
      b.quaternion.setFromUnitVectors(V0.set(0, 1, 0), V1.subVectors(q, p).normalize());
    });
    traitG.scale.setScalar(Math.max(1e-3, kit.ease(gsN.show)));
    gnTags.protein.show(st.step === 3 && !st.quiz && nRead > 0);
    gnTags.trait.show(st.step === 3 && !st.quiz && gsN.show > 0.6);
  }
  const V0 = new THREE.Vector3(), V1 = new THREE.Vector3();
  function geneReadout() {
    if (st.step !== 3 || st.quiz) return;
    const G = GENES[gsN.gene], r = Math.round(gsN.readTo), n = Math.floor(r / 3);
    const codons = G.seq.match(/.{3}/g).map((c, k) => (k < n ? `<b>${c}</b>` : `<span style="opacity:.45">${c}</span>`)).join(' ');
    ui.readout(`Bases read: <b>${r} of 24</b> → <b>${n}</b> amino acid${n === 1 ? '' : 's'} joined (3 bases = 1 codon = 1 amino acid)<br><span style="font-family:ui-monospace,monospace;font-size:14px">${codons}</span>${n >= 8 ? `<br>${G.txt}` : ''}`);
  }

  // Frames for each step.
  const F = {
    zoom: { radius: 1.32, yaw: 0.25, pitch: 0.12, target: [0, 0, 0] },
    helix: { radius: 2.3, yaw: 0, pitch: 0.12, target: [HX[0], 2.0, 0] },
    game: { radius: 1.5, width: 2.65, yaw: 0, pitch: 0.06, target: [GM[0] - 0.3, 1.2, 0] },
    kary: { radius: (kyTop - kyBot) / 2 + 0.1, width: 2.85, yaw: 0, pitch: 0.03, target: [KY[0], (kyTop + kyBot) / 2, 0] },
    divi: { radius: 1.6, width: 3.4, yaw: 0, pitch: 0.02, target: [DV[0], 0, 0] },
    mut: { radius: 1.6, width: 3.1, yaw: 0, pitch: 0.05, target: [MU[0], 0.2, 0] },
    quiz: { radius: 2.6, yaw: 0.5, pitch: 0.15, target: [HX[0], 2.0, 0] },
  };

  gameSet(0); kySet(); dvMode('mitosis'); muSet(0); geneSet(0); applyZoom(0);

  return {
    step(i, { isQuiz }) {
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, slider: null, row: null });
      for (const t of allTags) t.show(false);
      zoomG.visible = i === 0 && !isQuiz;
      st.untwist = false;
      if (isQuiz) { view(F.quiz); st.untwist = false; return; }
      if (i === 0) {
        view(F.zoom);
        st.zoomV = 0; zoomText = '';
        st.slider = ui.slider({ label: 'Zoom', min: 0, max: 100, step: 1, value: 0, format: v => { const m = Math.pow(10, ZMAX * v / 100); return `×${m >= 10 ? Math.round(m) : m.toFixed(1)}`; }, onInput: v => { st.auto = false; st.zoomV = v; applyZoom(ZMAX * v / 100); } });
        applyZoom(0);
      }
      if (i === 1) {
        view(F.helix);
        hxTags.back.show(true); hxTags.pair.show(true);
        ui.toggle({ label: 'Untwist the ladder', value: false, onChange: v => { st.untwist = v; } });
        ui.readout(`Bases: ${chip('A')} adenine · ${chip('T')} thymine · ${chip('C')} cytosine · ${chip('G')} guanine<br>${chip('A')} always pairs with ${chip('T')}, and ${chip('C')} with ${chip('G')}.<br>About <b>10 base pairs</b> in each full turn, which is about <b>3.4 nm</b> long. Width: about <b>2 nm</b>.`);
      }
      if (i === 2) {
        view(F.game);
        gmTags.tmpl.show(true); gmTags.part.show(true);
        st.row = ui.buttons([...'ATCG'].map(b => ({ label: `${b} (${NAME[b]})`, onClick: () => { st.auto = false; gamePick(b); } })).concat([{ label: 'New strand', onClick: () => { st.auto = false; gameSet(gs.round + 1); } }]));
        gameSet(0);
      }
      if (i === 3) {
        gnTags.gene.show(true);
        st.row = ui.buttons(GENES.map((G, j) => ({ label: G.name, on: j === 0, onClick: () => { st.auto = false; geneSet(j); } })));
        st.slider = ui.slider({ label: 'Read the gene', min: 0, max: 24, step: 3, value: 0, format: v => `${Math.round(v)} of 24 bases`, onInput: v => { st.auto = false; gsN.readTo = v; geneReadout(); } });
        geneSet(0);
        view(gnView(0));
      }
      if (i === 4) {
        view(F.kary);
        kyTags.p1.show(true); kyTags.sex.show(true);
        ks.xy = false; ks.parents = false;
        st.row = ui.buttons([{ label: 'XX (female)', on: true, onClick: () => { st.auto = false; ks.xy = false; kySet(); } }, { label: 'XY (male)', onClick: () => { st.auto = false; ks.xy = true; kySet(); } }]);
        ui.toggle({ label: 'Colour by parent', value: false, onChange: v => { st.auto = false; ks.parents = v; kySet(); } });
        kySet();
      }
      if (i === 5) {
        view(F.divi);
        dv.auto = true;
        st.row = ui.buttons([{ label: 'Body cell divides (mitosis)', on: true, onClick: () => { dv.auto = true; dvMode('mitosis'); } }, { label: 'Sex cells form (meiosis)', onClick: () => { dv.auto = true; dvMode('meiosis'); } }]);
        dv.slider = ui.slider({ label: 'Stage', min: 0, max: 4, step: 1, value: 0, format: v => `${Math.round(v)} of 4`, onInput: v => { dv.auto = false; dv.stageTo = v; } });
        dvMode('mitosis');
      }
      if (i === 6) {
        view(F.mut);
        muTags.codon.show(true); muTags.aa.show(true);
        st.row = ui.buttons(MUT.map((M, k) => ({ label: M.label, on: k === 0, onClick: () => { st.auto = false; muSet(k); } })));
        muSet(0);
      }
    },
    update(dt) {
      st.time += dt;
      let busy = false;
      const s = st.step;
      if (s === 0 && !st.quiz) {
        if (st.auto) {
          const T = st.time % 18, v = T < 8 ? kit.ease(T / 8) : T < 10 ? 1 : T < 16 ? 1 - kit.ease((T - 10) / 6) : 0;
          const vv = Math.round(v * 1000) / 10;
          if (vv !== st.zoomV) { st.zoomV = vv; st.slider?.set(Math.round(vv)); }
        }
        const z = ZMAX * st.zoomV / 100;
        if (Math.abs(z - zoomZ) > 1e-5) applyZoom(z);
        zHelix.g.rotation.y += dt * 0.5;
        busy = true;
      }
      if (s === 1 || st.quiz) {
        busy = kit.follow(st, 'twist', st.untwist ? 0 : 1, dt, 3) || busy;
        helix.layout(st.twist);
        if (!st.untwist) helix.g.rotation.y += dt * 0.45;
        else busy = kit.follow(helix.g.rotation, 'y', Math.round(helix.g.rotation.y / (Math.PI * 2)) * Math.PI * 2, dt, 3) || busy;
        busy = true;
      }
      if (s === 2 && !st.quiz) {
        if (st.auto) {
          gs.wait += dt;
          if (gs.filled < 8 && gs.wait > 1.0) { gs.wait = 0; gamePick(PAIR[gs.seq[gs.filled]]); }
          else if (gs.filled >= 8 && gs.wait > 2.5) gameSet(gs.round + 1);
        }
        for (let i = 0; i < 8; i++) {
          const k = i * 2 + 1, want = i < gs.filled ? 1 : 0;
          if (Math.abs(game.grow[k] - want) > 1e-3) { kit.follow(game.grow, k, want, dt, 8); busy = true; }
          const t = botTiles[i];
          if (t.visible && t.scale.x < 0.34) { t.scale.x = t.scale.y = Math.min(0.34, t.scale.x + dt * 1.6); busy = true; }
        }
        game.layout(0);
        const j = Math.min(7, gs.filled);
        marker.visible = gs.filled < 8;
        marker.position.set(gx(j), 1.2 - GN_R - 0.33, 0.02);
        gs.flash = Math.max(0, gs.flash - dt * 1.5);
        markMat.color.setHex(gs.flash > 0 ? 0xd9480f : 0x1f7ae0);
        marker.scale.setScalar(1 + 0.12 * Math.sin(st.time * 5));
        busy = true;
      }
      if (s === 3 && !st.quiz) {
        if (st.auto) {
          const T = st.time % 14;
          const r = T < 1 ? 0 : Math.min(24, Math.floor((T - 1) / 0.75) * 3);
          if (r !== gsN.readTo) { gsN.readTo = r; st.slider?.set(r); geneReadout(); }
          if (T > 13.7 && gsN.read > 0) { gsN.read = 0; gsN.readTo = 0; gsN.fold = 0; gsN.show = 0; }
        }
        busy = kit.follow(gsN, 'read', gsN.readTo, dt, 10) || busy;
        const done = gsN.readTo >= 24;
        busy = kit.follow(gsN, 'fold', done && gsN.read > 23.5 ? 1 : 0, dt, 2.5) || busy;
        busy = kit.follow(gsN, 'show', done && gsN.fold > 0.8 ? 1 : 0, dt, 4) || busy;
        if (gsN.readTo < 24) { gsN.fold = Math.min(gsN.fold, 0); }
        chainG.rotation.y = gsN.fold > 0.5 ? chainG.rotation.y + dt * 0.8 : 0;
        traitG.rotation.y = Math.sin(st.time * 0.8) * 0.4;
        geneLayout();
        busy = true;
      }
      if (s === 5 && !st.quiz) {
        if (dv.auto) {
          dv.timer += dt;
          if (dv.timer > 1.7) {
            dv.timer = 0;
            dv.stageTo = dv.stageTo >= 4 ? 0 : dv.stageTo + 1;
            if (dv.stageTo === 0) dv.stage = 0;
            dv.slider?.set(dv.stageTo);
          }
        }
        busy = kit.follow(dv, 'stage', dv.stageTo, dt, 3) || busy;
        dvPose(dv.stage);
        dvReadout();
      }
      if (s === 6 && !st.quiz) {
        if (st.auto) { const k = Math.floor(st.time / 3.5) % 3; if (k !== ms.k) { muSet(k); st.row?.select(k); } }
        ms.flash = Math.max(0, ms.flash - dt * 0.8);
        muRing.scale.setScalar(1 + 0.25 * Math.sin(st.time * 6) * (0.3 + ms.flash));
        busy = true;
      }
      return busy;
    },
  };
}
