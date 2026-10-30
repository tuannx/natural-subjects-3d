// Natural selection: peppered moths of three colours resting on a tree trunk; a bird that hunts the moths
// that stand out on light (lichen) or sooty bark; a model population whose colour frequencies change over up to
// 50 generations (live bar chart); the four steps of natural selection on four panels; antibiotic resistance in
// a Petri dish; rock layers with fossils (deeper = older); and homologous limb bones of a human, cat, whale and bat.
import { bird as makeBird } from '../_shared/critters.js';
import { rand } from '../_shared/habitat-kit.js';
import { letterTexture } from '../_shared/genetics.js';

const TR = [0, 0, 0];     // tree trunk with moths
const CH = [14, 0, 0];    // generations chart
const FL = [30, 0, 0];    // four steps
const AB = [46, 0, 0];    // antibiotic resistance
const FO = [60, 0, 0];    // fossils
const LB = [74, 0, 0];    // limb bones
const FORMS = ['light', 'medium', 'dark'];
const FORM_COL = [0xf1eee6, 0x8d8a83, 0x2b2927];
const FORM_CSS = ['#b9b4a6', '#7d7a73', '#2b2927'];
const FIT = { sooty: [0.85, 0.92, 1.0], clean: [1.0, 0.92, 0.85] };
const START = [0.9, 0.08, 0.02];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xcfe2bf, sky: 0xe3eef8, radius: 60 });
  ground.position.x = 37;
  const sun = kit.lights(scene, { sun: [4, 10, 7] });
  scene.add(sun.target);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const group = (p, parent = scene) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; };
  const anchor = (parent, pos) => { const o = new THREE.Object3D(); o.position.set(...pos); parent.add(o); return o; };
  const canvasTex = (w, h, draw, repeat) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
    return t;
  };
  const tileGeo = new THREE.PlaneGeometry(1, 1);
  const tile = (map, w, h, pos, parent) => {
    const m = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
    m.scale.set(w, h, 1); m.position.set(...pos); parent.add(m); m.renderOrder = 4; return m;
  };

  // ---------- Bark: pale with lichen, or blackened by soot ----------
  const barkTex = sooty => canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = sooty ? '#2e2b29' : '#b9bdb2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const x = rand(i + (sooty ? 900 : 0)) * w, y = rand(i + 300) * h, r = 4 + rand(i + 600) * 16;
      g.fillStyle = sooty ? ['#26231f', '#3a3532', '#33302c'][i % 3] : ['#a7b79c', '#d6dbcd', '#9fa596', '#c7d2b4'][i % 4];
      g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rand(i + 7) * 0.6), rand(i + 9) * 3, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = sooty ? '#1b1917' : '#878b80'; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const x = rand(i + 50) * w; g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 32) g.lineTo(x + (rand(i * 31 + y) - 0.5) * 14, y);
      g.stroke();
    }
  }, [2, 1]);
  const BARK = { clean: barkTex(false), sooty: barkTex(true) };

  // ---------- A resting peppered moth: wings flat, facing +z ----------
  const speck = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3835';
    for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(rand(i + 40) * w, rand(i + 80) * h, 0.6 + rand(i + 120) * 1.8, 0, Math.PI * 2); g.fill(); }
  }, [9, 9]);
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.02);
  wingShape.bezierCurveTo(0.06, 0.07, 0.15, 0.06, 0.17, 0.035);
  wingShape.bezierCurveTo(0.15, -0.01, 0.11, -0.03, 0.09, -0.04);
  wingShape.bezierCurveTo(0.08, -0.08, 0.04, -0.1, 0.0, -0.07);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 6);
  const mothMats = FORM_COL.map(c => kit.mat(c, { map: speck, side: THREE.DoubleSide, roughness: 0.85 }));
  const ghostMats = FORM_COL.map(c => kit.mat(c, { map: speck, side: THREE.DoubleSide, roughness: 0.85, transparent: true, opacity: 0.15, depthWrite: false }));
  const bodyGeo = new THREE.CapsuleGeometry(0.014, 0.08, 3, 6), bodyMat = kit.mat(0x4a4540);
  function moth(form, parent, s = 1) {
    const g = new THREE.Group();
    const wings = [-1, 1].map(side => { const w = kit.mesh(wingGeo, mothMats[form], [0, 0, 0.004], g); w.scale.x = side; w.castShadow = false; return w; });
    const b = kit.mesh(bodyGeo, bodyMat, [0, -0.01, 0.012], g); b.castShadow = false;
    g.scale.setScalar(s);
    parent.add(g);
    return { g, wings, form, setForm(f) { this.form = f; for (const w of wings) w.material = mothMats[f]; }, ghost(on) { for (const w of wings) w.material = on ? ghostMats[this.form] : mothMats[this.form]; } };
  }

  // =====================================================================================
  // Steps 1 and 2: tree trunk with moths; a bird hunts them
  // =====================================================================================
  const trG = group(TR);
  const R0 = 1.25, R1 = 1.05, TH = 7;
  const barkMat = kit.mat(0xffffff, { map: BARK.clean, roughness: 0.95 });
  const trunk = kit.mesh(new THREE.CylinderGeometry(R1, R0, TH, 32), barkMat, [0, TH / 2, 0], trG);
  trunk.castShadow = false;
  const radiusAt = y => R0 + (R1 - R0) * (y / TH);
  const NM = 30;
  const moths = [];
  const lineQ = new THREE.Quaternion();
  for (let k = 0; k < NM; k++) {
    const form = k % 3;
    const m = moth(form, trG, 1.15);
    const gc = k % 6, grw = Math.floor(k / 6); // a jittered 6 × 5 grid, so moths rarely overlap
    const th = ((gc + 0.5) / 6 - 0.5) * 1.75 + (rand(k * 3 + 1) - 0.5) * 0.14, y = 1.8 + (grw + 0.5) * 0.5 + (rand(k * 3 + 2) - 0.5) * 0.22;
    const r = radiusAt(y) + 0.012;
    const p = V(Math.sin(th) * r, y, Math.cos(th) * r);
    m.g.position.copy(p);
    m.g.lookAt(V(Math.sin(th) * 5, y, Math.cos(th) * 5).add(trG.position));
    m.g.rotateZ((rand(k + 77) - 0.5) * 0.9);
    m.barkP = p.clone(); m.barkQ = m.g.quaternion.clone();
    const col = form, row = Math.floor(k / 3);
    m.lineP = V((col - 1) * 1.02 + ((row % 2) - 0.5) * 0.44, 3.95 - Math.floor(row / 2) * 0.3, R0 + 0.55);
    m.birdP = V(Math.sin(th), 0, Math.cos(th)).multiplyScalar(0.28).add(p).add(V(0, 0.05, 0));
    moths.push(m);
  }
  const mothData = moths.map(m => ({ alive: true, eat: 0 })); // separate from the THREE objects
  const trTags = { light: label('Light', anchor(trG, [-1.02, 4.12, R0 + 0.55])), medium: label('Medium', anchor(trG, [0, 4.12, R0 + 0.55])), dark: label('Dark', anchor(trG, [1.02, 4.12, R0 + 0.55]), { cls: 'warm' }) };
  const tr = { line: 0, lineTo: 0, bark: 'clean' };
  const bird = makeBird(THREE, kit, { feathers: 0x8b6a4f, chest: 0xe8c9a0 });
  bird.g.scale.setScalar(1.4);
  trG.add(bird.g);
  const BIRD_HOME = V(3.2, 5.2, 2.5);
  bird.g.position.copy(BIRD_HOME); bird.g.visible = false;
  const hunt = { queue: [], k: 0, t: 0, from: V(), to: V(), on: false, seed: 0 };
  const tmpV = new THREE.Vector3();
  function setBark(b) {
    tr.bark = b; barkMat.map = BARK[b]; barkMat.needsUpdate = true;
    trReadout();
  }
  function resetMoths() {
    mothData.forEach((d, k) => { d.alive = true; d.eat = 0; moths[k].g.scale.setScalar(1.15); moths[k].g.visible = true; });
    hunt.on = false; hunt.queue = []; bird.g.visible = false; bird.g.position.copy(BIRD_HOME);
    trReadout();
  }
  function startHunt() {
    if (hunt.on) return;
    const shade = tr.bark === 'clean' ? 0 : 2;
    const cand = mothData.map((d, k) => ({ k, c: Math.abs(moths[k].form - shade) + rand(k * 13 + hunt.seed * 7) * 0.6 })).filter(o => mothData[o.k].alive);
    cand.sort((a, b) => b.c - a.c);
    hunt.queue = cand.slice(0, 6).map(o => o.k);
    hunt.seed++;
    hunt.k = 0; hunt.t = 0; hunt.on = true;
    bird.g.visible = true;
    hunt.from.copy(bird.g.position);
  }
  function counts() { const c = [0, 0, 0]; mothData.forEach((d, k) => { if (d.alive) c[moths[k].form]++; }); return c; }
  function trReadout() {
    if (st.quiz) return;
    const c = counts();
    if (st.step === 0) ui.readout(`Moths on this tree: <b>${NM}</b><br>${FORMS.map((f, j) => `<b style="color:${FORM_CSS[j]}">${f}</b> ${c[j]}`).join(' · ')}<br><span style="opacity:.8">Same species, different wing colours: variation.</span>`);
    if (st.step === 1) {
      const shade = tr.bark === 'clean' ? 0 : 2, easy = FORMS[shade === 0 ? 2 : 0];
      ui.readout(`Bark: <b>${tr.bark === 'clean' ? 'light, with lichens' : 'blackened by soot'}</b> · easiest to see: <b>${easy}</b> moths<br>Survivors: ${FORMS.map((f, j) => `<b style="color:${FORM_CSS[j]}">${f}</b> ${c[j]} of 10`).join(' · ')}`);
    }
  }

  // =====================================================================================
  // Step 3: model population over generations
  // =====================================================================================
  const chG = group(CH);
  const panelMat = kit.mat(0xffffff, { map: BARK.sooty.clone(), roughness: 0.95 });
  panelMat.map.repeat.set(1, 0.8);
  const panel = kit.mesh(new THREE.BoxGeometry(1.7, 2.1, 0.12), panelMat, [-1.6, 1.35, 0], chG);
  const chMoths = [];
  for (let k = 0; k < 20; k++) {
    const m = moth(0, chG, 1.0);
    m.g.position.set(-1.6 + ((k % 4) - 1.5) * 0.38 + (rand(k + 5) - 0.5) * 0.12, 1.35 + (Math.floor(k / 4) - 2) * 0.36 + (rand(k + 9) - 0.5) * 0.1, 0.07);
    m.g.rotation.z = (rand(k + 33) - 0.5) * 0.8;
    chMoths.push(m);
  }
  const base = kit.mesh(new THREE.BoxGeometry(2.4, 0.08, 0.6), kit.mat(0x5b6b7a), [0.85, 0.34, 0], chG);
  base.castShadow = false;
  const chBars = FORM_COL.map((c, j) => kit.mesh(new THREE.BoxGeometry(0.55, 1, 0.4), kit.mat(j === 0 ? 0xd9d4c4 : c, { roughness: 0.6 }), [0.85 + (j - 1) * 0.72, 0.38, 0], chG));
  const barH = [0, 0, 0], barTo = [0, 0, 0];
  FORMS.forEach((f, j) => tile(letterTexture(THREE, f[0].toUpperCase() + f.slice(1), { fg: '#1d2b36', size: 128, scale: 0.3 }), 0.6, 0.6, [0.85 + (j - 1) * 0.72, 0.12, 0.31], chG));
  const chTags = { model: label('Model population', anchor(chG, [0.85, 2.95, 0]), { cls: 'big' }) };
  const ch = { bark: 'sooty', gen: 0 };
  function freqAt(bark, gen) {
    let f = bark === 'sooty' ? START.slice() : freqAt('sooty', 50);
    const w = FIT[bark];
    for (let g = 0; g < gen; g++) { const s = f[0] * w[0] + f[1] * w[1] + f[2] * w[2]; f = f.map((v, j) => v * w[j] / s); }
    return f;
  }
  function chSet() {
    const f = freqAt(ch.bark, ch.gen);
    f.forEach((v, j) => { barTo[j] = 0.03 + v * 2.3; });
    panelMat.map = ch.bark === 'sooty' ? BARK.sooty : BARK.clean; panelMat.needsUpdate = true;
    // 20 moths shown in the same proportions (largest remainder rounding).
    const n = f.map(v => Math.floor(v * 20)); let left = 20 - n.reduce((a, b) => a + b, 0);
    f.map((v, j) => [v * 20 - n[j], j]).sort((a, b) => b[0] - a[0]).forEach(([, j]) => { if (left > 0) { n[j]++; left--; } });
    let k = 0;
    [2, 1, 0].forEach(j => { for (let q = 0; q < n[j]; q++) chMoths[(k++ * 7) % 20].setForm(j); });
    if (st.step !== 2 || st.quiz) return;
    const pct = v => (v * 100 >= 10 ? Math.round(v * 100) : (v * 100).toFixed(1));
    ui.readout(`Generation <b>${ch.gen}</b> on <b>${ch.bark === 'sooty' ? 'sooty' : 'clean'}</b> bark (model)<br>${FORMS.map((nm, j) => `<b style="color:${FORM_CSS[j]}">${nm}</b> ${pct(f[j])}%`).join(' · ')}<br><span style="opacity:.8">Each generation the easily seen moths are a little less likely to survive to breed.</span>`);
  }

  // =====================================================================================
  // Step 4: the four steps of natural selection, on four panels of sooty bark
  // =====================================================================================
  const flG = group(FL);
  const PX = [-3.6, -1.2, 1.2, 3.6];
  const sootMat = kit.mat(0xffffff, { map: BARK.sooty, roughness: 0.95 });
  PX.forEach(x => { kit.mesh(new THREE.BoxGeometry(1.9, 1.5, 0.1), sootMat, [x, 1.25, 0], flG); kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), kit.mat(0x6b4a33), [x, 0.25, -0.03], flG); });
  const arrowMat = kit.mat(0xf2b134);
  [-2.4, 0, 2.4].forEach(x => {
    const a = kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8), arrowMat, [x - 0.06, 1.25, 0.05], flG); a.rotation.z = Math.PI / 2;
    const h = kit.mesh(new THREE.ConeGeometry(0.09, 0.16, 12), arrowMat, [x + 0.15, 1.25, 0.05], flG); h.rotation.z = -Math.PI / 2;
  });
  const FL_FORMS = [
    [0, 0, 1, 0, 2, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  ];
  const EATEN = new Set([0, 1, 2, 3, 4, 5, 6, 8, 10, 12]); // on panel 3: 7 of 8 light and 3 of 6 medium are eaten
  const flMoths = FL_FORMS.map((forms, p) => forms.map((f, k) => {
    const n = forms.length, cols = n > 6 ? 6 : 3, rowsN = Math.ceil(n / cols);
    const order = (k * 7) % n; // mix the colours across the panel
    const c = order % cols, r = Math.floor(order / cols);
    const m = moth(f, flG, n > 6 ? 1.15 : 1.6);
    m.g.position.set(PX[p] + (c - (cols - 1) / 2) * (1.6 / cols) + (rand(p * 50 + k) - 0.5) * 0.06, 1.25 + ((rowsN - 1) / 2 - r) * (1.2 / rowsN), 0.06);
    m.g.rotation.z = (rand(p * 70 + k) - 0.5) * 0.9;
    return m;
  }));
  const flTags = ['1 Variation', '2 Overproduction', '3 Selection', '4 Inheritance'].map((t, p) => label(t, anchor(flG, [PX[p], 2.08, 0]), { cls: p === 2 ? 'warm' : '' }));
  const fl = { panel: -1, sel: 0 };
  const FL_TXT = [
    '<b>1 Variation</b>: the parent moths differ in wing colour, and the colour is inherited.',
    '<b>2 Overproduction</b>: they have many more young than the tree can support (a female peppered moth can lay hundreds of eggs).',
    '<b>3 Selection</b>: on dark bark, birds find and eat most of the light moths (faded) and some medium ones. The dark ones are camouflaged, so more of them survive.',
    '<b>4 Inheritance</b>: the survivors breed and pass on their colours, so the next generation has more dark moths.',
  ];
  const flView = p => (p < 0 ? { radius: 1.6, width: 4.7, yaw: 0, pitch: 0.06, target: [FL[0], 1.3, 0] } : { radius: 1.1, yaw: 0, pitch: 0.05, target: [FL[0] + PX[p], 1.35, 0] });
  function flSet(p) {
    fl.panel = p;
    if (st.step !== 3 || st.quiz) return;
    view(flView(p));
    flTags.forEach((t, q) => t.show(p < 0 || q === p));
    const n = [6, 18, 8, 18][Math.max(0, p)];
    ui.readout(p < 0 ? 'Four steps, from left to right. Tap a step to look closer.' : `${FL_TXT[p]}${p === 2 ? `<br>Survivors: <b>${n}</b> of 18 (1 light, 3 medium, 4 dark)` : `<br>Moths on this panel: <b>${n}</b>`}`);
  }

  // =====================================================================================
  // Step 5: antibiotic resistance in a Petri dish
  // =====================================================================================
  const abG = group(AB);
  const glass = kit.mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.2, 48, 1, true), kit.mat(0xdfefff, { transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }), [0, 0.12, 0], abG);
  glass.castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.03, 48), kit.mat(0xdfefff, { transparent: true, opacity: 0.4, roughness: 0.1 }), [0, 0.03, 0], abG).castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(1.66, 1.66, 0.08, 48), kit.mat(0xf1dfa0, { roughness: 0.6 }), [0, 0.08, 0], abG).castShadow = false;
  const drug = kit.mesh(new THREE.CylinderGeometry(1, 1, 0.01, 48), kit.mat(0x6fb8ff, { transparent: true, opacity: 0.0, depthWrite: false }), [0, 0.13, 0], abG);
  drug.castShadow = false;
  const MAXB = 200;
  const bact = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.05, 0.13, 3, 6), kit.mat(0xffffff, { roughness: 0.5 }), MAXB);
  bact.frustumCulled = false; bact.castShadow = false; abG.add(bact);
  const RES = [17, 52, 81];
  const bInfo = [];
  for (let k = 0; k < 100; k++) {
    let x, z, t = 0;
    do { x = (rand(k * 2 + 400 + t) - 0.5) * 2.8; z = (rand(k * 2 + 401 + t) - 0.5) * 2.8; t += 13; } while (x * x + z * z > 1.9);
    bInfo.push({ x, z, a: rand(k + 900) * 6, res: RES.includes(k), born: 0 });
  }
  for (let k = 100; k < 196; k++) {
    if (k - 100 >= 93) break;
    const parent = bInfo[RES[(k - 100) % 3]], ang = rand(k + 1200) * 6.283, d = 0.12 + rand(k + 1300) * 0.42;
    bInfo.push({ x: parent.x + Math.cos(ang) * d, z: parent.z + Math.sin(ang) * d, a: rand(k + 1400) * 6, res: true, born: 2 });
  }
  const NB = bInfo.length;
  const bScale = new Float32Array(MAXB), bTo = new Float32Array(MAXB);
  const normalC = new THREE.Color(0x4caf7a), resC = new THREE.Color(0xe8833a);
  bInfo.forEach((b, k) => bact.setColorAt(k, b.res ? resC : normalC));
  for (let k = NB; k < MAXB; k++) bact.setColorAt(k, normalC);
  bact.instanceColor.needsUpdate = true;
  const ab = { stage: 0, drug: 0, drugTo: 0 };
  function abLayout() {
    for (let k = 0; k < MAXB; k++) {
      const b = bInfo[k], s = bScale[k];
      if (!b || s < 1e-3) { dmy.position.set(0, -1, 0); dmy.scale.setScalar(0); }
      else { dmy.position.set(b.x, 0.16, b.z); dmy.rotation.set(Math.PI / 2, 0, b.a); dmy.scale.setScalar(s); }
      dmy.updateMatrix(); bact.setMatrixAt(k, dmy.matrix);
    }
    bact.instanceMatrix.needsUpdate = true;
    drug.scale.set(1.0 + 0.6 * ab.drug, 1, 1.0 + 0.6 * ab.drug);
    drug.material.opacity = 0.3 * ab.drug;
  }
  const dmy = new THREE.Object3D();
  function abSet(s) {
    ab.stage = s;
    bInfo.forEach((b, k) => { bTo[k] = (b.born <= s && (b.res || s === 0)) ? 1 : 0; });
    ab.drugTo = s === 1 || s === 3 ? 1 : 0;
    if (st.step !== 4 || st.quiz) return;
    ui.readout([
      'Stage 0, <b>start</b>: 100 bacteria. By chance, <b>3</b> carry a mutation that makes them <b style="color:#d06a1f">resistant</b> (3%).',
      'Stage 1, <b>antibiotic added</b>: the 97 normal bacteria are killed. The <b>3</b> resistant ones survive.',
      'Stage 2, <b>survivors multiply</b>: 3 → 6 → 12 → 24 → 48 → <b>96</b> after 5 doublings. Now <b>100%</b> are resistant.',
      'Stage 3, <b>same antibiotic again</b>: <b>none</b> of the 96 are killed. The medicine no longer works on this population.',
    ][s]);
  }

  // =====================================================================================
  // Step 6: fossils in rock layers
  // =====================================================================================
  const foG = group(FO);
  const LAYER_COL = ['#c9a77c', '#b98f63', '#a7865f', '#8f7458'];
  const LAYER_NAME = ['mammal bones', 'reptile bones', 'fish', 'trilobites and shells'];
  const bone = (g, x1, y1, x2, y2, w) => {
    g.lineCap = 'round'; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    for (const [x, y] of [[x1, y1], [x2, y2]]) { g.beginPath(); g.arc(x, y, w * 0.8, 0, Math.PI * 2); g.fill(); }
  };
  const fossilTex = j => canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = LAYER_COL[j]; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.fillStyle = rand(i + j * 999) > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'; g.fillRect(rand(i + 3 + j * 77) * w, rand(i + 5 + j * 55) * h, 3, 2); }
    g.strokeStyle = g.fillStyle = '#f4ead2';
    if (j === 0) { // mammal: skull and limb bones
      g.beginPath(); g.ellipse(110, 42, 34, 24, 0, 0, Math.PI * 2); g.fill(); // skull: braincase, snout, lower jaw
      g.beginPath(); g.moveTo(130, 30); g.lineTo(196, 42); g.lineTo(194, 56); g.lineTo(126, 60); g.closePath(); g.fill();
      g.lineWidth = 6; g.beginPath(); g.moveTo(96, 66); g.lineTo(186, 72); g.stroke();
      g.fillStyle = LAYER_COL[0]; g.beginPath(); g.ellipse(132, 40, 9, 7, 0, 0, 7); g.fill();
      for (let x = 150; x < 192; x += 9) g.fillRect(x, 58, 4, 6);
      g.fillStyle = '#f4ead2';
      bone(g, 260, 30, 340, 62, 8); bone(g, 380, 66, 450, 36, 7); bone(g, 300, 76, 330, 80, 5);
    } else if (j === 1) { // reptile skeleton
      g.lineWidth = 5; g.beginPath(); g.moveTo(140, 50); g.quadraticCurveTo(250, 30, 360, 55); g.quadraticCurveTo(420, 66, 470, 58); g.stroke();
      for (let x = 170; x < 330; x += 16) { g.lineWidth = 3; g.beginPath(); g.moveTo(x, 44 - (x - 250) * (x - 250) / 4000); g.lineTo(x + 4, 64); g.stroke(); }
      g.beginPath(); g.moveTo(140, 50); g.lineTo(96, 40); g.lineTo(96, 60); g.closePath(); g.fill();
      bone(g, 190, 52, 175, 80, 4); bone(g, 320, 54, 335, 82, 4);
    } else if (j === 2) { // fish skeletons
      for (const [x0, s] of [[110, 1], [330, 0.8]]) {
        g.lineWidth = 4; g.beginPath(); g.moveTo(x0, 48); g.lineTo(x0 + 120 * s, 48); g.stroke();
        g.lineWidth = 2; for (let x = x0 + 18 * s; x < x0 + 105 * s; x += 10 * s) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 5 * s, 66); g.stroke(); }
        g.beginPath(); g.arc(x0, 48, 14 * s, 0, 7); g.fill();
        g.beginPath(); g.moveTo(x0 + 120 * s, 48); g.lineTo(x0 + 145 * s, 30); g.lineTo(x0 + 145 * s, 66); g.closePath(); g.fill();
      }
    } else { // trilobites and coiled shells
      for (const [x0, y0] of [[100, 46], [300, 50]]) {
        g.beginPath(); g.ellipse(x0, y0, 30, 20, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = LAYER_COL[3]; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x0 - 30, y0 - 6); g.lineTo(x0 + 30, y0 - 6); g.moveTo(x0 - 30, y0 + 6); g.lineTo(x0 + 30, y0 + 6); g.stroke();
        for (let x = x0 - 18; x < x0 + 25; x += 8) { g.beginPath(); g.moveTo(x, y0 - 18); g.lineTo(x, y0 + 18); g.stroke(); }
        g.strokeStyle = '#f4ead2';
      }
      g.lineWidth = 4; g.beginPath();
      for (let a = 0; a < 18; a += 0.2) { const r = 2 + a * 1.6; const x = 205 + Math.cos(a) * r, y = 48 + Math.sin(a) * r; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
      g.beginPath(); for (let a = 0; a < 16; a += 0.2) { const r = 2 + a * 1.4; const x = 420 + Math.cos(a) * r, y = 50 + Math.sin(a) * r; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
    }
  });
  const LW = 3.2, LH = 0.6, LD = 1.4;
  const layers = [0, 1, 2, 3].map(j => {
    const side = kit.mat(LAYER_COL[j], { roughness: 0.95 });
    const front = kit.mat(0xffffff, { map: fossilTex(j), roughness: 0.95 });
    const m = kit.mesh(new THREE.BoxGeometry(LW, LH, LD), [side, side, side, side, front, side], [0, 0.3 + (3 - j) * LH + LH / 2, 0], foG);
    return { m, out: 0, to: 0 };
  });
  kit.mesh(new THREE.BoxGeometry(LW + 0.1, 0.3, LD + 0.1), kit.mat(0x7a6650), [0, 0.15, 0], foG);
  const foTags = { young: label('Youngest', anchor(foG, [LW / 2 + 0.45, 0.3 + 3.5 * LH, LD / 2]), { cls: 'cool' }), old: label('Oldest', anchor(foG, [LW / 2 + 0.4, 0.3 + 0.5 * LH, LD / 2]), { cls: 'warm' }) };
  const fo = { layer: 0 };
  function foSet(j) {
    fo.layer = j;
    layers.forEach((L, q) => { L.to = q === j ? 0.45 : 0; });
    if (st.step !== 5 || st.quiz) return;
    ui.readout(`Layer <b>${j + 1}</b> of 4, counting down from the top: <b>${LAYER_NAME[j]}</b><br>${j === 0 ? 'The top layer formed last, so it is the <b>youngest</b>.' : j === 3 ? 'The bottom layer formed first, so it is the <b>oldest</b>.' : `Older than the ${j === 1 ? 'layer' : 'layers'} above it, younger than the ${j === 2 ? 'layer' : 'layers'} below.`}`);
  }

  // =====================================================================================
  // Step 7: homologous limb bones
  // =====================================================================================
  const lbG = group(LB);
  const BONE_COL = { humerus: 0xf08a2e, ulna: 0x2f80ed, radius: 0x2bb3a3, carpals: 0xf2c230, digits: 0x9b6bd9 };
  const boneMats = {}; for (const [k, c] of Object.entries(BONE_COL)) boneMats[k] = kit.mat(c, { roughness: 0.5 });
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8), ballGeo = new THREE.SphereGeometry(1, 10, 8);
  const up = V(0, 1, 0), dirV = new THREE.Vector3();
  const rod = (parent, mat, a, b, r) => {
    const m = kit.mesh(cylGeo, mat, [0, 0, 0], parent);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0); m.scale.set(r, len, r);
    m.quaternion.setFromUnitVectors(up, dirV.set(b[0] - a[0], b[1] - a[1], 0).normalize());
    for (const p of [a, b]) kit.mesh(ballGeo, mat, [p[0], p[1], 0], parent).scale.setScalar(r * 1.3);
    return m;
  };
  const LIMBS = [
    { name: 'Human arm', x: -2.25, H: 1.0, F: 0.85, r: 0.05, dig: [0.3, 0.42, 0.46, 0.43, 0.34], spread: 0.55, tilt: 0 },
    { name: 'Cat leg', x: -0.75, H: 0.85, F: 0.9, r: 0.045, dig: [0.12, 0.26, 0.28, 0.26, 0.22], spread: 0.3, tilt: 0 },
    { name: 'Whale flipper', x: 0.75, H: 0.4, F: 0.38, r: 0.075, dig: [0.35, 0.85, 0.8, 0.62, 0.38], spread: 0.45, tilt: 0, fin: true },
    { name: 'Bat wing', x: 2.25, H: 0.5, F: 0.75, r: 0.032, dig: [0.15, 0.85, 0.95, 0.8, 0.65], spread: 1.75, tilt: 0, wing: true },
  ];
  const lbTags = [];
  LIMBS.forEach(L => {
    const g = group([L.x, 2.75, 0], lbG);
    g.rotation.z = L.tilt;
    rod(g, boneMats.humerus, [0, 0], [0, -L.H], L.r * 1.25);
    rod(g, boneMats.ulna, [-L.r * 1.1, -L.H - 0.02], [-L.r * 1.1, -L.H - L.F], L.r);
    rod(g, boneMats.radius, [L.r * 1.1, -L.H - 0.02], [L.r * 1.1, -L.H - L.F], L.r * 0.85);
    const wy = -L.H - L.F - L.r * 2;
    for (let q = 0; q < 4; q++) kit.mesh(ballGeo, boneMats.carpals, [(q - 1.5) * L.r * 1.3, wy - (q % 2) * L.r * 1.2, 0], g).scale.setScalar(L.r * 0.95);
    const tips = [];
    L.dig.forEach((len, d) => {
      const a = (d - 2) / 4 * L.spread;
      const sx = (d - 2) * L.r * 1.1, sy = wy - L.r * 2;
      const dx = Math.sin(a), dy = -Math.cos(a), segs = 3;
      for (let q = 0; q < segs; q++) {
        const t0 = q / segs, t1 = (q + 1) / segs - 0.03;
        rod(g, boneMats.digits, [sx + dx * len * t0, sy + dy * len * t0], [sx + dx * len * t1, sy + dy * len * t1], L.r * 0.6 * (1 - q * 0.15));
      }
      tips.push([sx + dx * len, sy + dy * len]);
    });
    if (L.fin || L.wing) {
      const sh = new THREE.Shape();
      if (L.fin) { sh.absellipse(0, -L.H - 0.7, 0.34, 0.86, 0, Math.PI * 2); }
      else { sh.moveTo(-0.02, -L.H - L.F); tips.slice(1).forEach(([x, y]) => sh.lineTo(x, y)); sh.quadraticCurveTo(0.55, -L.H - 0.3, 0.06, -L.H * 0.35); sh.lineTo(-0.02, -L.H - L.F); }
      const m = kit.mesh(new THREE.ShapeGeometry(sh, 16), kit.mat(L.fin ? 0x6f8aa0 : 0x7b6a5e, { transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }), [0, 0, -0.06], g);
      m.castShadow = false; m.renderOrder = 1;
    }
    lbTags.push(label(L.name, anchor(lbG, [L.x, LIMBS.indexOf(L) % 2 ? -0.3 : -0.02, 0.3]), { cls: L.wing ? 'warm' : '' }));
  });
  const lb = { part: '' };
  const BONE_TXT = {
    humerus: '<b>Humerus</b>: one bone in the upper arm, in all four limbs.',
    forearm: '<b>Radius and ulna</b>: two bones side by side in the forearm.',
    carpals: '<b>Wrist bones</b> (carpals): a group of small bones.',
    digits: '<b>Finger bones</b>: long and thin in the bat, short in the cat, inside a paddle in the whale.',
  };
  function lbSet(part) {
    lb.part = part;
    if (st.step !== 6 || st.quiz) return;
    ui.readout(`${part ? BONE_TXT[part] + '<br>' : ''}Same bones in the same order, used to <b>grasp</b>, <b>walk</b>, <b>swim</b> and <b>fly</b>.`);
  }
  const glowTmp = new THREE.Color();

  // =====================================================================================
  const allTags = [...Object.values(trTags), ...Object.values(chTags), ...flTags, ...Object.values(foTags), ...lbTags];
  const st = { step: 0, quiz: false, time: 0, auto: true, row: null, slider: null, toggle: null };
  const F = {
    tr: { radius: 1.65, yaw: 0, pitch: 0.06, target: [0, 2.95, 0.5] },
    ch: { radius: 1.75, width: 2.35, yaw: 0, pitch: 0.08, target: [CH[0] - 0.35, 1.45, 0] },
    ab: { radius: 1.85, yaw: 0, pitch: 0.95, target: [AB[0], 0.1, 0] },
    fo: { radius: 1.75, width: 2.3, yaw: -0.35, pitch: 0.2, target: [FO[0] + 0.25, 1.45, 0] },
    lb: { radius: 1.75, width: 3.05, yaw: 0, pitch: 0.05, target: [LB[0], 1.45, 0] },
    quiz: { radius: 2.1, yaw: 0.35, pitch: 0.12, target: [0, 2.95, 0.4] },
  };
  const centres = [TR, TR, CH, FL, AB, FO, LB];
  setBark('clean'); chSet(); abSet(0); foSet(0);

  return {
    step(i, { isQuiz }) {
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, row: null, slider: null, toggle: null });
      for (const t of allTags) t.show(false);
      const c = isQuiz ? TR : centres[i];
      sun.position.set(c[0] + 4, 10, 7); sun.target.position.set(c[0], 0, 0);
      tr.lineTo = 0; hunt.on = false; bird.g.visible = false;
      if (isQuiz || i === 0) { resetMoths(); setBark('clean'); }
      if (isQuiz) { view(F.quiz); return; }
      if (i === 0) {
        view(F.tr);
        st.toggle = ui.toggle({ label: 'Line them up by colour', value: false, onChange: v => { st.auto = false; tr.lineTo = v ? 1 : 0; for (const t of Object.values(trTags)) t.show(false); } });
        trReadout();
      }
      if (i === 1) {
        view(F.tr);
        resetMoths(); setBark('clean');
        st.row = ui.buttons([{ label: 'Light bark', on: true, onClick: () => { st.auto = false; resetMoths(); setBark('clean'); } }, { label: 'Sooty bark', onClick: () => { st.auto = false; resetMoths(); setBark('sooty'); } }]);
        ui.buttons([{ label: 'Birds hunt', onClick: () => { st.auto = false; startHunt(); } }, { label: 'Reset moths', onClick: () => { st.auto = false; resetMoths(); } }]);
        trReadout();
      }
      if (i === 2) {
        view(F.ch);
        chTags.model.show(true);
        ch.bark = 'sooty'; ch.gen = 0;
        st.row = ui.buttons([{ label: 'Sooty bark (1800s)', on: true, onClick: () => { st.auto = false; ch.bark = 'sooty'; ch.gen = 0; st.slider.set(0); chSet(); } }, { label: 'Clean bark (after 1956)', onClick: () => { st.auto = false; ch.bark = 'clean'; ch.gen = 0; st.slider.set(0); chSet(); } }]);
        st.slider = ui.slider({ label: 'Generations', min: 0, max: 50, step: 1, value: 0, format: v => `${Math.round(v)}`, onInput: v => { st.auto = false; ch.gen = Math.round(v); chSet(); } });
        chSet();
      }
      if (i === 3) {
        fl.sel = 0;
        st.row = ui.buttons(['1 Variation', '2 Overproduction', '3 Selection', '4 Inheritance'].map((t, p) => ({ label: t, onClick: () => { st.auto = false; flSet(p); } })).concat([{ label: 'All four', on: true, onClick: () => { st.auto = false; flSet(-1); } }]));
        flSet(-1);
      }
      if (i === 4) {
        view(F.ab);
        bScale.fill(0); ab.drug = 0;
        st.slider = ui.slider({ label: 'Stage', min: 0, max: 3, step: 1, value: 0, format: v => `${Math.round(v)} of 3`, onInput: v => { st.auto = false; abSet(Math.round(v)); } });
        abSet(0);
      }
      if (i === 5) {
        view(F.fo);
        foTags.young.show(true); foTags.old.show(true);
        st.slider = ui.slider({ label: 'Rock layer', min: 1, max: 4, step: 1, value: 1, format: v => `${Math.round(v)} from the top`, onInput: v => { st.auto = false; foSet(Math.round(v) - 1); } });
        foSet(0);
      }
      if (i === 6) {
        view(F.lb);
        lbTags.forEach(t => t.show(true));
        st.row = ui.buttons([['humerus', 'Humerus'], ['forearm', 'Radius and ulna'], ['carpals', 'Wrist bones'], ['digits', 'Finger bones']].map(([k, t]) => ({ label: t, onClick: () => { st.auto = false; lbSet(k); } })));
        lbSet('');
      }
    },
    update(dt) {
      st.time += dt;
      let busy = false;
      const s = st.quiz ? -1 : st.step;
      // Moths on the trunk: line up by colour, or get eaten.
      if (s === 0 && st.auto) {
        const want = st.time > 1.2 && st.time % 8 < 5 ? 1 : 0;
        if (want !== tr.lineTo) { tr.lineTo = want; if (st.toggle) st.toggle.checked = !!want; }
      }
      if (kit.follow(tr, 'line', tr.lineTo, dt, 2.5)) busy = true;
      if (s === 0 || s === 1 || s === -1) {
        const e = kit.ease(tr.line);
        moths.forEach((m, k) => {
          m.g.position.lerpVectors(m.barkP, m.lineP, e);
          m.g.quaternion.slerpQuaternions(m.barkQ, lineQ, e);
        });
        if (s === 0) { const on = tr.line > 0.95; for (const t of Object.values(trTags)) t.show(on); }
      }
      if (s === 1) {
        if (st.auto && !hunt.on && st.time > 0.6 && hunt.seed === 0) startHunt();
        if (hunt.on) {
          busy = true;
          hunt.t += dt;
          const leaving = hunt.k >= hunt.queue.length;
          const target = leaving ? BIRD_HOME : moths[hunt.queue[hunt.k]].birdP;
          const T = 0.75, f = Math.min(1, hunt.t / T);
          bird.g.position.lerpVectors(hunt.from, target, kit.ease(f));
          bird.g.position.y += Math.sin(f * Math.PI) * 0.35;
          const look = leaving ? BIRD_HOME : moths[hunt.queue[hunt.k]].barkP;
          bird.g.lookAt(tmpV.copy(look).add(trG.position));
          bird.wings.forEach((w, q) => { w.rotation.z = (q ? -1 : 1) * (0.3 + Math.sin(st.time * 26) * 0.6) * (f < 1 ? 1 : 0.2); });
          if (f >= 1) {
            if (leaving) { hunt.on = false; bird.g.visible = false; }
            else { mothData[hunt.queue[hunt.k]].alive = false; hunt.k++; hunt.t = 0; hunt.from.copy(bird.g.position); trReadout(); }
          }
        }
        mothData.forEach((d, k) => {
          const want = d.alive ? 1 : 0;
          if (kit.follow(d, 'eat', 1 - want, dt, 8)) busy = true;
          moths[k].g.scale.setScalar(Math.max(1e-3, 1.15 * (1 - d.eat)));
          moths[k].g.visible = d.eat < 0.99;
        });
      }
      if (s === 2) {
        if (st.auto) {
          const g = Math.min(50, Math.max(0, Math.floor((st.time - 0.5) * 10)));
          if (g !== ch.gen) { ch.gen = g; st.slider?.set(g); chSet(); }
        }
        chBars.forEach((b, j) => {
          if (kit.follow(barH, j, barTo[j], dt, 6)) busy = true;
          b.scale.y = barH[j]; b.position.y = 0.38 + barH[j] / 2;
        });
      }
      if (s === 3) {
        if (st.auto) {
          const p = st.time < 1.5 ? -1 : Math.floor((st.time - 1.5) / 3) % 5 - 0;
          const pp = p >= 4 ? -1 : p;
          if (pp !== fl.panel) { flSet(pp); st.row?.select(pp < 0 ? 4 : pp); }
        }
        const want = fl.panel === 2 || fl.panel === 3 || fl.panel < 0 ? 1 : 0;
        if (kit.follow(fl, 'sel', want, dt, 2.5)) busy = true;
        flMoths[2].forEach((m, k) => { if (EATEN.has(k)) { m.ghost(fl.sel > 0.5); m.g.scale.setScalar(1.15 * (1 - 0.3 * fl.sel)); } });
      }
      if (s === 4) {
        if (st.auto) { const k = Math.min(3, Math.floor(st.time / 2.2)); if (k !== ab.stage) { abSet(k); st.slider?.set(k); } }
        for (let k = 0; k < NB; k++) {
          const target = bTo[k], delay = bInfo[k].born === 2 ? ((k * 37) % 93) / 93 * 0.6 : 0;
          if (Math.abs(bScale[k] - target) > 1e-3) {
            const sp = target > bScale[k] ? 3 : 4;
            bScale[k] = target > bScale[k] && ab.stageT < delay ? bScale[k] : kit.clamp(bScale[k] + Math.sign(target - bScale[k]) * dt * sp, 0, 1);
            busy = true;
          }
        }
        ab.stageT = (ab.lastStage === ab.stage ? (ab.stageT || 0) + dt : 0); ab.lastStage = ab.stage;
        if (kit.follow(ab, 'drug', ab.drugTo, dt, 3)) busy = true;
        abLayout();
      }
      if (s === 5) {
        if (st.auto) { const j = Math.floor(st.time / 2.2) % 4; if (j !== fo.layer) { foSet(j); st.slider?.set(j + 1); } }
        layers.forEach(L => { if (kit.follow(L, 'out', L.to, dt, 5)) busy = true; L.m.position.z = L.out; });
      }
      if (s === 6) {
        if (st.auto) { const keys = ['humerus', 'forearm', 'carpals', 'digits']; const k = keys[Math.floor(st.time / 2.2) % 4]; if (k !== lb.part) { lbSet(k); st.row?.select(keys.indexOf(k)); } }
        const glow = 0.35 + 0.25 * Math.sin(st.time * 5);
        for (const [k, m] of Object.entries(boneMats)) {
          const on = lb.part === k || (lb.part === 'forearm' && (k === 'ulna' || k === 'radius'));
          if (on) m.emissive.copy(glowTmp.copy(m.color)).multiplyScalar(glow); else m.emissive.setRGB(0, 0, 0);
        }
        busy = true;
      } else if (lb.part) { for (const m of Object.values(boneMats)) m.emissive.setRGB(0, 0, 0); }
      return busy;
    },
  };
}
