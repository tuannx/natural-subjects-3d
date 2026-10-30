// Inheritance: Mendel's pea plants over three generations; a chromosome pair carrying the flower-colour gene
// (genotype AA, Aa or aa) beside the flower it gives; a parent cell splitting into sex cells with one allele each;
// a Punnett square for any two parents with genotype and phenotype ratios; a field of up to 400 offspring grown
// with seeded chance (so results are close to, not exactly, the expected ratio); a sex-chromosome Punnett square
// (XX × XY); and a bar chart showing how a trait controlled by more genes spreads into a smooth range.
import { chromosome, letterTexture, rand } from '../_shared/genetics.js';

const MD = [0, 0, 0];    // Mendel's garden
const AL = [12, 0, 0];   // alleles on a chromosome pair
const GA = [24, 0, 0];   // sex cells
const PS = [36, 0, 0];   // Punnett square
const GR = [50, 0, 0];   // field of offspring
const SX = [64, 0, 0];   // sex chromosomes
const MG = [78, 0, 0];   // many genes
const PURPLE = 0x8e44ad, WHITE = 0xf6f4ee, LEAF = 0x4f9d48;
const XCOL = 0x9b6bd9, YCOL = 0x2bb3a3;
const COUNTS = [4, 10, 20, 50, 100, 200, 400];
const GENOS = ['AA', 'Aa', 'aa'];
const purpleHtml = '<b style="color:#8e44ad">purple</b>', whiteHtml = '<b style="color:#7a7a72">white</b>';

const sortPair = (x, y) => (x === 'A' || y === 'a' ? x + y : y + x); // dominant allele first: "Aa", never "aA"
function choose(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xcfe8c4, sky: 0xe3f1fb, radius: 60 });
  ground.position.x = 39;
  const sun = kit.lights(scene, { sun: [4, 10, 7] });
  scene.add(sun.target);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const group = (p, parent = scene) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; };
  const anchor = (parent, pos) => { const o = new THREE.Object3D(); o.position.set(...pos); parent.add(o); return o; };
  const texCache = {};
  const tex = (text, opts = {}) => texCache[text + JSON.stringify(opts)] ||= letterTexture(THREE, text, opts);
  const tileGeo = new THREE.PlaneGeometry(1, 1);
  const tile = (map, size, pos, parent) => {
    const m = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
    m.scale.set(size, size, 1); m.position.set(...pos); parent.add(m); m.renderOrder = 4;
    return m;
  };
  const purpleMat = kit.mat(PURPLE, { roughness: 0.5 }), whiteMat = kit.mat(WHITE, { roughness: 0.5 });
  const leafMat = kit.mat(LEAF, { roughness: 0.7 }), soilMat = kit.mat(0x8a5a3b, { roughness: 0.95 });

  // ---------- A pea plant: stem, leaves and two flowers whose colour can be switched ----------
  const stemGeo = new THREE.CylinderGeometry(0.018, 0.024, 1, 6);
  const leafGeo = new THREE.SphereGeometry(1, 8, 6), petalGeo = new THREE.SphereGeometry(1, 10, 8);
  function peaPlant(purple, h = 0.8) {
    const g = new THREE.Group();
    const stem = kit.mesh(stemGeo, leafMat, [0, h / 2, 0], g); stem.scale.y = h;
    for (let k = 0; k < 4; k++) {
      const s = k % 2 ? 1 : -1, y = h * (0.25 + k * 0.15);
      const l = kit.mesh(leafGeo, leafMat, [s * 0.09, y, 0], g);
      l.scale.set(0.1, 0.025, 0.06); l.rotation.z = s * 0.4;
    }
    const flowers = [];
    for (const [x, y, ry] of [[0.07, h * 0.92, 0.4], [-0.06, h * 0.82, -0.5]]) {
      const f = new THREE.Group(); f.position.set(x, y, 0.02); f.rotation.y = ry; g.add(f);
      const banner = kit.mesh(petalGeo, purple ? purpleMat : whiteMat, [0, 0.03, -0.01], f); banner.scale.set(0.085, 0.075, 0.025);
      const keel = kit.mesh(petalGeo, purple ? purpleMat : whiteMat, [0, -0.02, 0.03], f); keel.scale.set(0.045, 0.035, 0.05);
      flowers.push(banner, keel);
    }
    const setPurple = p => { for (const m of flowers) m.material = p ? purpleMat : whiteMat; };
    return { g, setPurple };
  }
  const bed = (parent, w, pos) => { const b = kit.mesh(new THREE.BoxGeometry(w, 0.12, 0.55), soilMat, pos, parent); b.castShadow = false; return b; };

  // =====================================================================================
  // Step 1: Mendel's garden: parents, F1, F2
  // =====================================================================================
  const mdG = group(MD);
  const rows = { P: [], F1: [], F2: [] };
  const rowZ = { P: -1.3, F1: 0, F2: 1.3 };
  bed(mdG, 1.6, [0, 0.06, rowZ.P]); bed(mdG, 2.2, [0, 0.06, rowZ.F1]); bed(mdG, 4.0, [0, 0.06, rowZ.F2]);
  [[-0.45, true], [0.45, false]].forEach(([x, p]) => { const pl = peaPlant(p, 1.0); pl.g.position.set(x, 0.12, rowZ.P); mdG.add(pl.g); rows.P.push(pl.g); });
  const cross = tile(tex('×', { fg: '#1d2b36', size: 64 }), 0.3, [0, 0.7, rowZ.P], mdG);
  for (let k = 0; k < 4; k++) { const pl = peaPlant(true, 1.0); pl.g.position.set((k - 1.5) * 0.5, 0.12, rowZ.F1); mdG.add(pl.g); rows.F1.push(pl.g); }
  const F2W = [true, true, false, true, true, true, false, true];
  F2W.forEach((p, k) => { const pl = peaPlant(p, 1.0); pl.g.position.set((k - 3.5) * 0.48, 0.12, rowZ.F2); pl.g.rotation.y = rand(k) * 2; mdG.add(pl.g); rows.F2.push(pl.g); });
  const mdTags = {
    P: label('Parents (P)', anchor(mdG, [-1.3, 0.25, rowZ.P])),
    F1: label('F1 generation', anchor(mdG, [-1.6, 0.25, rowZ.F1])),
    F2: label('F2 generation', anchor(mdG, [-2.15, 0.3, rowZ.F2 + 0.1])),
  };
  const md = { show: 2, grow: { P: 1, F1: 1, F2: 1 } };
  function mdSet(n) {
    md.show = n;
    if (st.step !== 0 || st.quiz) return;
    mdTags.P.show(true); mdTags.F1.show(n >= 1); mdTags.F2.show(n >= 2);
    ui.readout([
      `Parents: a ${purpleHtml}-flowered plant × a ${whiteHtml}-flowered plant. Both are true-breeding.`,
      `First generation (F1): <b>4 of 4</b> plants are ${purpleHtml}. The white flowers seem to have vanished.`,
      `Second generation (F2): <b>6</b> ${purpleHtml} : <b>2</b> ${whiteHtml} here, which is 3 : 1.<br>Mendel counted <b>705</b> purple : <b>224</b> white. 705 ÷ 224 ≈ <b>3.1</b>, so about <b>3 : 1</b>.`,
    ][n]);
  }

  // =====================================================================================
  // Step 2: alleles on a pair of chromosomes
  // =====================================================================================
  const alG = group(AL);
  const BANDY = 0.32;
  const alPair = [0, 1].map(k => {
    const c = chromosome(THREE, kit, { len: 1.4, r: 0.1, cen: 0.4, doubled: false, color: k ? 0x6aa9e9 : 0xf2a65a, radial: 14, bands: [{ y: BANDY, h: 0.12, color: PURPLE }] });
    c.g.position.set(-1.05 + k * 0.55, 1.2, 0); alG.add(c.g);
    return c;
  });
  const alTiles = alPair.map((c, k) => tile(tex('A', { fg: '#ffffff', bg: '#8e44ad', size: 96 }), 0.3, [-1.05 + k * 0.55 + (k ? 0.3 : -0.3), 1.2 + BANDY, 0.05], alG));
  const alPlant = peaPlant(true, 1.3); alPlant.g.position.set(0.9, 0, 0); alG.add(alPlant.g);
  bed(alG, 0.8, [0.9, 0.06, 0]);
  alPlant.g.position.y = 0.12;
  const alTags = {
    gene: label('Flower-colour gene', anchor(alG, [-0.78, 1.2 + 0.68, 0])),
    m: label('From parent 1', anchor(alPair[0].g, [-0.42, -0.5, 0]), { cls: 'warm' }),
    f: label('From parent 2', anchor(alPair[1].g, [0.44, -0.5, 0]), { cls: 'cool' }),
  };
  const al = { geno: 'Aa' };
  const alleleTex = a => (a === 'A' ? tex('A', { fg: '#ffffff', bg: '#8e44ad', size: 96 }) : tex('a', { fg: '#1d2b36', bg: '#ecebe4', size: 96 }));
  function alSet(g) {
    al.geno = g;
    [0, 1].forEach(k => { alPair[k].bands[0].material.color.setHex(g[k] === 'A' ? PURPLE : WHITE); alTiles[k].material.map = alleleTex(g[k]); });
    alPlant.setPurple(g.includes('A'));
    if (st.step !== 1 || st.quiz) return;
    const homo = g[0] === g[1];
    ui.readout(`Genotype: <b>${g}</b>, ${homo ? '<b>homozygous</b> (two identical alleles)' : '<b>heterozygous</b> (two different alleles)'}<br>Phenotype: ${g.includes('A') ? purpleHtml : whiteHtml} flowers${g === 'Aa' ? '<br>The dominant allele <b>A</b> hides the recessive allele <b>a</b>.' : g === 'aa' ? '<br>No A to hide it, so the recessive allele <b>a</b> shows.' : ''}`);
  }

  // =====================================================================================
  // Step 3: each parent passes on one allele (sex cells)
  // =====================================================================================
  const gaG = group(GA);
  const cellMat = kit.mat(0xfde7cf, { transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.4 });
  const gaCells = [0, 1].map(() => { const m = kit.mesh(new THREE.SphereGeometry(1, 32, 20), cellMat, [0, 1.3, 0], gaG); m.castShadow = false; m.renderOrder = 2; return m; });
  const gaChr = [0, 1].map(k => {
    const c = chromosome(THREE, kit, { len: 0.75, r: 0.06, cen: 0.4, doubled: false, color: k ? 0x6aa9e9 : 0xf2a65a, radial: 10, bands: [{ y: 0.17, h: 0.08, color: PURPLE }] });
    gaG.add(c.g); return c;
  });
  const gaTiles = [0, 1].map(() => tile(alleleTex('A'), 0.26, [0, 0, 0.3], gaG));
  const gaTags = { parent: label('Parent cell', anchor(gaG, [0, 2.45, 0])), sex: label('Sex cells', anchor(gaG, [0, 2.2, 0]), { cls: 'warm' }) };
  const ga = { geno: 'Aa', split: 0, splitTo: 0 };
  function gaSet(g) {
    ga.geno = g;
    [0, 1].forEach(k => { gaChr[k].bands[0].material.color.setHex(g[k] === 'A' ? PURPLE : WHITE); gaTiles[k].material.map = alleleTex(g[k]); });
    gaReadout();
  }
  function gaReadout() {
    if (st.step !== 2 || st.quiz) return;
    const g = ga.geno, nA = (g[0] === 'A') + (g[1] === 'A');
    const sexTxt = ga.splitTo ? `Sex cells: <b>${nA * 50}%</b> carry <b>A</b>, <b>${100 - nA * 50}%</b> carry <b>a</b>` : 'Turn on <b>Make sex cells</b> to split the pair.';
    ui.readout(`Parent genotype: <b>${g}</b><br>${sexTxt}<br><span style="opacity:.8">Each sex cell gets <b>one</b> allele of the pair.</span>`);
  }
  function gaLayout() {
    const f = kit.ease(ga.split);
    gaCells[0].position.set(-1.05 * f, 1.3, 0); gaCells[1].position.set(1.05 * f, 1.3, 0);
    const r = kit.lerp(1.0, 0.62, f);
    gaCells.forEach(c => c.scale.setScalar(r));
    gaCells[1].visible = f > 0.02;
    gaChr.forEach((c, k) => { const s = k ? 1 : -1; c.g.position.set(kit.lerp(s * 0.16, s * 1.05, f), 1.3, 0); });
    gaTiles.forEach((t, k) => { const s = k ? 1 : -1; t.position.set(kit.lerp(s * 0.5, s * 1.05 + 0.32, f), 1.3 + 0.17, 0.3); });
    gaTags.parent.show(st.step === 2 && !st.quiz && f < 0.5);
    gaTags.sex.show(st.step === 2 && !st.quiz && f > 0.5);
  }

  // =====================================================================================
  // Punnett board: a 3 × 3 grid of tiles; corner, two headers on top, two on the left, four boxes
  // =====================================================================================
  const CELL = 0.9;
  function board(parent, y0, { topCol = 0xfff1cc, leftCol = 0xe3f1ff } = {}) {
    const g = group([0, y0, 0], parent);
    const back = kit.mesh(new THREE.BoxGeometry(CELL * 3 + 0.16, CELL * 3 + 0.16, 0.06), kit.mat(0x5b6b7a), [0, 0, -0.06], g);
    back.castShadow = false;
    for (const x of [-1.1, 1.1]) kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, y0, 8), kit.mat(0x8b6a4f), [x, -y0 / 2, -0.08], g);
    const boxGeo = new THREE.BoxGeometry(CELL * 0.94, CELL * 0.94, 0.05);
    const pos = (c, r) => [(c - 1) * CELL, (1 - r) * CELL, 0];
    kit.mesh(boxGeo, kit.mat(0xdfe6ec), pos(0, 0), g).castShadow = false;
    [1, 2].forEach(c => { kit.mesh(boxGeo, kit.mat(topCol), pos(c, 0), g).castShadow = false; });
    [1, 2].forEach(r => { kit.mesh(boxGeo, kit.mat(leftCol), pos(0, r), g).castShadow = false; });
    const cells = [];
    for (let r = 1; r <= 2; r++) for (let c = 1; c <= 2; c++) { kit.mesh(boxGeo, kit.mat(0xffffff), pos(c, r), g).castShadow = false; cells.push(group(pos(c, r), g)); }
    const top = [1, 2].map(c => group(pos(c, 0), g)), left = [1, 2].map(r => group(pos(0, r), g));
    return { g, top, left, cells, corner: group(pos(0, 0), g) };
  }

  // =====================================================================================
  // Step 4: Punnett square for flower colour
  // =====================================================================================
  const psG = group(PS);
  const pb = board(psG, 1.75);
  const psTop = pb.top.map(gr => tile(alleleTex('A'), 0.42, [0, 0, 0.04], gr));
  const psLeft = pb.left.map(gr => tile(alleleTex('a'), 0.42, [0, 0, 0.04], gr));
  const flowerHead = purple => { // a small flower for a Punnett box
    const f = new THREE.Group();
    const b = kit.mesh(petalGeo, purple ? purpleMat : whiteMat, [0, 0, 0], f); b.scale.set(0.15, 0.13, 0.05);
    const k = kit.mesh(petalGeo, purple ? purpleMat : whiteMat, [0, -0.06, 0.06], f); k.scale.set(0.08, 0.06, 0.07);
    return { f, set: p => { b.material = k.material = p ? purpleMat : whiteMat; } };
  };
  const psCells = pb.cells.map(gr => {
    const holder = group([0, 0, 0.04], gr);
    const t = tile(tex('Aa', { fg: '#1d2b36', size: 128, scale: 0.5 }), 0.42, [0, -0.2, 0], holder);
    const fl = flowerHead(true); fl.f.position.set(0, 0.15, 0.06); holder.add(fl.f);
    return { holder, t, fl, geno: 'Aa' };
  });
  const psTags = { p1: label('Parent 1', anchor(pb.g, [CELL * 0.5, CELL * 1.5 + 0.05, 0]), { cls: 'warm' }), p2: label('Parent 2', anchor(pb.g, [-CELL, -CELL * 1.5 - 0.35, 0]), { cls: 'cool' }) };
  const ps = { p1: 'Aa', p2: 'Aa', fill: 4 };
  function psSet() {
    psTop.forEach((t, c) => { t.material.map = alleleTex(ps.p1[c]); });
    psLeft.forEach((t, r) => { t.material.map = alleleTex(ps.p2[r]); });
    const tally = { AA: 0, Aa: 0, aa: 0 };
    psCells.forEach((cl, k) => {
      const r = k >> 1, c = k & 1, g = sortPair(ps.p1[c], ps.p2[r]);
      cl.geno = g; tally[g]++;
      cl.t.material.map = tex(g, { fg: '#1d2b36', size: 128, scale: 0.5 });
      cl.fl.set(g.includes('A'));
    });
    ps.fill = 0;
    if (st.step !== 3 || st.quiz) return;
    const pur = tally.AA + tally.Aa;
    const gtxt = GENOS.filter(g => tally[g]).map(g => `<b>${g}</b> ${tally[g]} (${tally[g] * 25}%)`).join(' · ');
    ui.readout(`Parent 1 <b>${ps.p1}</b> × Parent 2 <b>${ps.p2}</b><br>Genotypes: ${gtxt}<br>Phenotypes: ${purpleHtml} ${pur} of 4 (<b>${pur * 25}%</b>) · ${whiteHtml} ${4 - pur} of 4 (<b>${(4 - pur) * 25}%</b>)`);
  }

  // =====================================================================================
  // Step 5: grow many offspring (seeded chance)
  // =====================================================================================
  const grG = group(GR);
  const field = kit.mesh(new THREE.BoxGeometry(4.6, 0.1, 4.6), soilMat, [0, 0.05, 0], grG);
  field.castShadow = false;
  const MAXN = 400;
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.09, 1, 5), leafMat, MAXN);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), kit.mat(0xffffff, { roughness: 0.5 }), MAXN);
  for (const m of [stems, heads]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = false; grG.add(m); }
  const purpleC = new THREE.Color(PURPLE), whiteC = new THREE.Color(WHITE);
  for (let k = 0; k < MAXN; k++) heads.setColorAt(k, whiteC);
  const gr = { n: 100, seed: 1, cross: 'Aa × Aa', t: 99, purple: [] };
  const dmy = new THREE.Object3D();
  function grRoll() {
    const [a, b] = gr.cross.split(' × ');
    gr.purple = [];
    let np = 0;
    for (let k = 0; k < gr.n; k++) {
      const x = a[rand(k * 3.17 + gr.seed * 101.3) < 0.5 ? 0 : 1], y = b[rand(k * 5.31 + gr.seed * 57.9 + 7) < 0.5 ? 0 : 1];
      const p = x === 'A' || y === 'A';
      gr.purple.push(p); if (p) np++;
      heads.setColorAt(k, p ? purpleC : whiteC);
    }
    heads.instanceColor.needsUpdate = true;
    gr.t = 0;
    gr.np = np;
    grReadout();
  }
  function grLayout() {
    const n = gr.n, side = Math.ceil(Math.sqrt(n)), sp = 4.2 / side, h = Math.min(0.75, sp * 1.5), fr = Math.min(0.16, sp * 0.32);
    for (let k = 0; k < MAXN; k++) {
      if (k >= n) { dmy.scale.setScalar(0); dmy.position.set(0, -1, 0); dmy.updateMatrix(); stems.setMatrixAt(k, dmy.matrix); heads.setMatrixAt(k, dmy.matrix); continue; }
      const r = Math.floor(k / side), c = k % side;
      const x = (c - (side - 1) / 2) * sp + (rand(k + 11) - 0.5) * sp * 0.25, z = (r - (side - 1) / 2) * sp + (rand(k + 23) - 0.5) * sp * 0.25;
      const g = kit.clamp((gr.t - (k / n) * 0.8) * 3, 0, 1), e = kit.ease(g);
      dmy.position.set(x, 0.1 + h * e / 2, z); dmy.rotation.set(0, 0, 0); dmy.scale.set(sp * 0.25 * e + 1e-4, h * e + 1e-4, sp * 0.25 * e + 1e-4);
      dmy.updateMatrix(); stems.setMatrixAt(k, dmy.matrix);
      dmy.position.set(x, 0.1 + h * e, z); dmy.scale.set(fr * e + 1e-4, fr * 0.85 * e + 1e-4, fr * e + 1e-4);
      dmy.updateMatrix(); heads.setMatrixAt(k, dmy.matrix);
    }
    stems.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
  }
  function grReadout() {
    if (st.step !== 4 || st.quiz) return;
    const n = gr.n, p = gr.np, w = n - p, exp = gr.cross === 'Aa × Aa' ? [75, 25] : [50, 50];
    const pct = v => Math.round(v / n * 100);
    ui.readout(`Cross: <b>${gr.cross}</b> · offspring: <b>${n}</b><br>${purpleHtml}: <b>${p}</b> (${pct(p)}%) · ${whiteHtml}: <b>${w}</b> (${pct(w)}%)<br>Expected from the Punnett square: <b>${exp[0]}%</b> : <b>${exp[1]}%</b>`);
  }

  // =====================================================================================
  // Step 6: sex chromosomes
  // =====================================================================================
  const sxG = group(SX);
  const sb = board(sxG, 1.75, { topCol: 0xe6f6f3, leftCol: 0xf0e9fb });
  const xMat = kit.mat(XCOL, { roughness: 0.5 }), yMat = kit.mat(YCOL, { roughness: 0.5 });
  const mkX = (parent, x = 0, s = 1) => { const c = chromosome(THREE, kit, { len: 0.56 * s, r: 0.055 * s, cen: 0.39, doubled: false, mat: xMat, radial: 10 }); c.g.position.set(x, -0.02, 0.07); parent.add(c.g); return c; };
  const mkY = (parent, x = 0, s = 1) => { const c = chromosome(THREE, kit, { len: 0.26 * s, r: 0.045 * s, cen: 0.3, doubled: false, mat: yMat, radial: 10 }); c.g.position.set(x, 0.0, 0.07); parent.add(c.g); return c; };
  mkX(sb.top[0]); mkY(sb.top[1]); mkX(sb.left[0]); mkX(sb.left[1]);
  const sxCells = sb.cells.map((gr2, k) => {
    const holder = group([0, 0, 0.02], gr2);
    const chrG = group([0, 0.1, 0], holder); chrG.scale.setScalar(0.8);
    const isY = (k & 1) === 1;
    mkX(chrG, -0.13);
    if (isY) mkY(chrG, 0.13); else mkX(chrG, 0.13);
    const t = tile(tex(isY ? 'XY' : 'XX', { fg: '#1d2b36', size: 128, scale: 0.42 }), 0.26, [0, -0.335, 0.03], holder);
    return { holder, isY, t };
  });
  const sxTags = { dad: label('Father XY: sperm', anchor(sb.g, [CELL * 0.5, CELL * 1.5 + 0.05, 0]), { cls: 'cool' }), mum: label('Mother XX: eggs', anchor(sb.g, [-CELL, -CELL * 1.5 - 0.35, 0]), { cls: 'warm' }) };
  const sx = { fill: 4, t: 0 };
  function sxReadout() {
    if (st.step !== 5 || st.quiz) return;
    const n = Math.floor(sx.fill), xx = sxCells.slice(0, n).filter(c => !c.isY).length, xy = n - xx;
    ui.readout(`Boxes filled: <b>${n} of 4</b><br>XX (girl): <b>${xx}</b>${n === 4 ? ' (<b>50%</b>)' : ''} · XY (boy): <b>${xy}</b>${n === 4 ? ' (<b>50%</b>)' : ''}<br><span style="opacity:.8">Every egg carries an X; the sperm carries an X or a Y.</span>`);
  }

  // =====================================================================================
  // Step 7: many genes, a smooth range
  // =====================================================================================
  const mgG = group(MG);
  const axis = kit.mesh(new THREE.BoxGeometry(5.0, 0.06, 0.5), kit.mat(0x5b6b7a), [0, 0.03, 0], mgG);
  axis.castShadow = false;
  const bars = [];
  for (let k = 0; k < 13; k++) {
    const m = kit.mesh(new THREE.BoxGeometry(1, 1, 0.36), kit.mat(new THREE.Color().setHSL(0.58 - k / 12 * 0.5, 0.6, 0.55).getHex(), { roughness: 0.6 }), [0, 0, 0], mgG);
    bars.push({ m, h: 0, to: 0, x: 0, w: 0.3 });
  }
  const mgTags = { lo: label('Shorter', anchor(mgG, [-2.3, -0.05, 0.3]), { cls: 'cool' }), hi: label('Taller', anchor(mgG, [2.3, -0.05, 0.3]), { cls: 'warm' }) };
  const mg = { n: 1 };
  function mgSet(n) {
    mg.n = n;
    const m = 2 * n + 1, total = Math.pow(4, n), pmax = choose(2 * n, n) / total;
    const w = Math.min(1.1, 4.4 / m), gap = w * 0.12;
    bars.forEach((b, k) => {
      if (k < m) { b.to = (choose(2 * n, k) / total) / pmax * 2.4; b.x = (k - (m - 1) / 2) * w; b.w = w - gap; }
      else { b.to = 0; }
      b.m.material.color.setHSL(0.58 - (m > 1 ? k / (m - 1) : 0) * 0.5, 0.6, 0.55);
    });
    if (st.step !== 6 || st.quiz) return;
    const mid = choose(2 * n, n) / total * 100, ext = 100 / total;
    const fmt = v => (v >= 10 ? Math.round(v) : v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3));
    ui.readout(`Genes: <b>${n}</b> · possible heights: <b>${m}</b> (2 × ${n} + 1)<br>Middle height: <b>${fmt(mid)}%</b> of offspring · shortest and tallest: <b>${fmt(ext)}%</b> each<br><span style="opacity:.8">Model: both parents carry one "taller" and one "shorter" allele of every gene.</span>`);
  }

  // =====================================================================================
  const allTags = [...Object.values(mdTags), ...Object.values(alTags), ...Object.values(gaTags), ...Object.values(psTags), ...Object.values(sxTags), ...Object.values(mgTags)];
  const st = { step: 0, quiz: false, time: 0, auto: true, row: null, slider: null, toggle: null };
  const F = {
    md: { radius: 2.0, width: 2.5, yaw: 0, pitch: 0.68, target: [MD[0] - 0.45, 0.45, 0] },
    al: { radius: 1.45, yaw: 0.2, pitch: 0.12, target: [AL[0] - 0.1, 1.05, 0] },
    ga: { radius: 1.75, width: 1.9, yaw: 0, pitch: 0.1, target: [GA[0], 1.45, 0] },
    ps: { radius: 1.6, yaw: 0, pitch: 0.05, target: [PS[0], 1.65, 0] },
    gr: { radius: 2.8, yaw: 0.35, pitch: 0.75, target: [GR[0], 0.2, 0] },
    sx: { radius: 1.6, yaw: 0, pitch: 0.05, target: [SX[0], 1.65, 0] },
    mg: { radius: 1.7, width: 2.6, yaw: 0, pitch: 0.1, target: [MG[0], 1.15, 0] },
    quiz: { radius: 2.1, width: 2.3, yaw: -0.3, pitch: 0.6, target: [MD[0], 0.45, 0] },
  };
  const centres = [MD, AL, GA, PS, GR, SX, MG];
  mdSet(2); alSet('Aa'); gaSet('Aa'); psSet(); grRoll(); grLayout(); mgSet(1);

  return {
    step(i, { isQuiz }) {
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, row: null, slider: null, toggle: null });
      for (const t of allTags) t.show(false);
      const c = isQuiz ? MD : centres[i];
      sun.position.set(c[0] + 4, 10, 7); sun.target.position.set(c[0], 0, 0);
      if (isQuiz) { view(F.quiz); md.show = 2; return; }
      if (i === 0) {
        view(F.md);
        st.row = ui.buttons([{ label: 'Parents', onClick: () => { st.auto = false; mdSet(0); } }, { label: 'First generation (F1)', onClick: () => { st.auto = false; mdSet(1); } }, { label: 'Second generation (F2)', on: true, onClick: () => { st.auto = false; mdSet(2); } }]);
        mdSet(0); st.row.select(0);
      }
      if (i === 1) {
        view(F.al);
        alTags.gene.show(true); alTags.m.show(true); alTags.f.show(true);
        st.row = ui.buttons(GENOS.map(g => ({ label: g, on: g === 'Aa', onClick: () => { st.auto = false; alSet(g); } })));
        alSet('Aa');
      }
      if (i === 2) {
        view(F.ga);
        ga.split = 0; ga.splitTo = 0;
        st.row = ui.buttons(GENOS.map(g => ({ label: g, on: g === 'Aa', onClick: () => { st.auto = false; gaSet(g); } })));
        st.toggle = ui.toggle({ label: 'Make sex cells', value: false, onChange: v => { st.auto = false; ga.splitTo = v ? 1 : 0; gaReadout(); } });
        gaSet('Aa');
      }
      if (i === 3) {
        view(F.ps);
        psTags.p1.show(true); psTags.p2.show(true);
        ps.p1 = 'Aa'; ps.p2 = 'Aa';
        ui.buttons(GENOS.map(g => ({ label: `Parent 1: ${g}`, on: g === 'Aa', onClick: () => { st.auto = false; ps.p1 = g; psSet(); } })));
        ui.buttons(GENOS.map(g => ({ label: `Parent 2: ${g}`, on: g === 'Aa', onClick: () => { st.auto = false; ps.p2 = g; psSet(); } })));
        psSet();
      }
      if (i === 4) {
        view(F.gr);
        gr.n = 100; gr.cross = 'Aa × Aa';
        st.row = ui.buttons([{ label: 'Aa × Aa', on: true, onClick: () => { st.auto = false; gr.cross = 'Aa × Aa'; grRoll(); } }, { label: 'Aa × aa', onClick: () => { st.auto = false; gr.cross = 'Aa × aa'; grRoll(); } }, { label: 'Grow again', onClick: () => { st.auto = false; gr.seed++; grRoll(); st.row.select(gr.cross === 'Aa × Aa' ? 0 : 1); } }]);
        st.slider = ui.slider({ label: 'Number of offspring', min: 0, max: COUNTS.length - 1, step: 1, value: 4, format: v => `${COUNTS[Math.round(v)]} plants`, onInput: v => { st.auto = false; gr.n = COUNTS[Math.round(v)]; grRoll(); } });
        grRoll();
      }
      if (i === 5) {
        view(F.sx);
        sxTags.dad.show(true); sxTags.mum.show(true);
        sx.fill = 0;
        ui.buttons([{ label: 'Fill the square', onClick: () => { st.auto = false; sx.fill = 0; sxReadout(); } }]);
        sxReadout();
      }
      if (i === 6) {
        view(F.mg);
        mgTags.lo.show(true); mgTags.hi.show(true);
        st.slider = ui.slider({ label: 'Number of genes', min: 1, max: 6, step: 1, value: 1, format: v => `${Math.round(v)}`, onInput: v => { st.auto = false; mgSet(Math.round(v)); } });
        mgSet(1);
      }
    },
    update(dt) {
      st.time += dt;
      let busy = false;
      const s = st.quiz ? -1 : st.step;
      // Garden rows grow in as each generation is shown.
      for (const [k, list] of Object.entries(rows)) {
        const want = st.quiz ? 1 : s === 0 ? (k === 'P' || (k === 'F1' && md.show >= 1) || (k === 'F2' && md.show >= 2) ? 1 : 0) : 1;
        if (kit.follow(md.grow, k, want, dt, 4)) busy = true;
        list.forEach((g, j) => { const e = kit.clamp(md.grow[k] * 1.3 - j * 0.04, 0, 1); g.scale.setScalar(Math.max(1e-3, kit.ease(e))); });
      }
      if (s === 0 && st.auto) {
        const n = Math.min(2, Math.floor(st.time / 2.2));
        if (n !== md.show) { mdSet(n); st.row?.select(n); }
      }
      if (s === 1 && st.auto) {
        const g = GENOS[Math.floor(st.time / 2.5) % 3];
        if (g !== al.geno) { alSet(g); st.row?.select(GENOS.indexOf(g)); }
      }
      if (s === 2) {
        if (st.auto) {
          const want = Math.floor(st.time / 2.5) % 2;
          if (want !== ga.splitTo) { ga.splitTo = want; if (st.toggle) st.toggle.checked = !!want; gaReadout(); }
        }
        busy = kit.follow(ga, 'split', ga.splitTo, dt, 3) || busy;
        gaLayout();
      }
      if (s === 3) {
        if (ps.fill < 4) { ps.fill = Math.min(4, ps.fill + dt * 3); busy = true; }
        psCells.forEach((cl, k) => { const e = kit.clamp(ps.fill - k * 0.6, 0, 1); cl.holder.scale.setScalar(Math.max(1e-3, kit.ease(e))); });
        if (st.auto) {
          const pairs = [['Aa', 'Aa'], ['AA', 'aa'], ['Aa', 'aa']], j = Math.floor(st.time / 3.5) % 3;
          if (pairs[j][0] !== ps.p1 || pairs[j][1] !== ps.p2) { [ps.p1, ps.p2] = pairs[j]; psSet(); }
        }
      }
      if (s === 4) {
        if (gr.t < 1.2) { gr.t += dt * 0.6; grLayout(); busy = true; }
      }
      if (s === 5) {
        if (sx.fill < 4) {
          const before = Math.floor(sx.fill);
          sx.fill = Math.min(4, sx.fill + dt * 1.4); busy = true;
          if (Math.floor(sx.fill) !== before) sxReadout();
        } else if (st.auto && (sx.t += dt) > 3) { sx.t = 0; sx.fill = 0; sxReadout(); }
        sxCells.forEach((cl, k) => { const e = kit.clamp((sx.fill - k) * 2.5, 0, 1); cl.holder.scale.setScalar(Math.max(1e-3, kit.ease(e))); });
      }
      if (s === 6) {
        if (st.auto) { const n = 1 + Math.floor(st.time / 1.6) % 6; if (n !== mg.n) { mgSet(n); st.slider?.set(n); } }
        for (const b of bars) {
          if (kit.follow(b, 'h', b.to, dt, 5)) busy = true;
          b.m.visible = b.h > 0.005;
          b.m.scale.set(b.w, Math.max(0.001, b.h), 1);
          b.m.position.set(b.x, 0.06 + b.h / 2, 0);
        }
      }
      return busy;
    },
  };
}
