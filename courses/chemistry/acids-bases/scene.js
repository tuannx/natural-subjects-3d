// Acids, bases and pH: household substances on a universal-indicator pH strip; a beaker of H⁺ and OH⁻ ions
// with a pH slider; litmus papers and universal indicator in three beakers; a burette adding sodium hydroxide
// to hydrochloric acid drop by drop (live pH from the amounts); the ions of neutralisation; acids with
// magnesium (squeaky pop) and with marble (limewater); and a safety bench with goggles and a hazard sign.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bench, beaker, testTube, stopper, bubbles, tube, sign, paint, rand, labMats } from '../_shared/labware.js';

const X = { home: -6, ion: -1.5, litmus: 3, neut: 7.5, ions: 12, react: 16.5, safe: 21 };

// Universal indicator colours for pH 0–14 (one colour per whole pH unit, blended in between).
const UI = ['#d7191c', '#e3261d', '#ee3f1f', '#f6681f', '#fb9426', '#fdbd2b', '#e3d92c', '#4fb648', '#269c75', '#2a78b8', '#3a4ea7', '#55399c', '#652e93', '#70268b', '#781f81'];
const SUBST = [
  { name: 'Lemon juice', ph: 2, txt: 'about 2' },
  { name: 'Vinegar', ph: 3, txt: 'about 3' },
  { name: 'Pure water', ph: 7, txt: '7' },
  { name: 'Baking soda solution', ph: 8.5, txt: 'about 8 to 9' },
  { name: 'Soap', ph: 9.5, txt: 'about 9 to 10' },
  { name: 'Oven cleaner', ph: 13, txt: 'about 13' },
];
const LIT = [{ name: 'Vinegar', ph: 3, liquid: 0xf4efe0 }, { name: 'Water', ph: 7, liquid: 0xe9f5fb }, { name: 'Soap solution', ph: 10, liquid: 0xf1f1f6 }];
// Neutralisation model: 10 cm³ of 0.10 mol/L HCl (1.0 mmol); each drop is 0.050 cm³ of 1.0 mol/L NaOH (0.050 mmol).
const ACID_MMOL = 1.0, DROP_MMOL = 0.05, ACID_CM3 = 10, DROP_CM3 = 0.05;
function phAfter(drops) {
  const x = (ACID_MMOL - DROP_MMOL * drops) / (ACID_CM3 + DROP_CM3 * drops); // excess acid in mol/L (negative = excess base)
  const h = (x + Math.sqrt(x * x + 4e-14)) / 2;
  return -Math.log10(h);
}
const kindOf = ph => (ph < 6.95 ? 'acidic' : ph > 7.05 ? 'basic' : 'neutral');

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  kit.stage(scene, { ground: 0xd8d2c8, sky: 0xe8f0f6, radius: 40 });
  kit.lights(scene, { sun: [4, 10, 7] });
  const lm = labMats(k);
  bench(k, { w: 31, d: 3.2, pos: [7.5, 0, 0] });
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const uiC = UI.map(c => new THREE.Color(c));
  const cTmp = new THREE.Color();
  const uiColor = (ph, out = cTmp) => { const p = kit.clamp(ph, 0, 14), i = Math.min(13, Math.floor(p)); return out.copy(uiC[i]).lerp(uiC[i + 1], p - i); };
  const station = x => { const g = new THREE.Group(); g.position.x = x; scene.add(g); return g; };

  // Particles that drift inside a container. Positions come only from t and a per-particle seed (no state).
  const out = new THREE.Vector3();
  function swarm(parent, geo, mat, max) {
    const m = new THREE.InstancedMesh(geo, mat, max);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; m.count = 0;
    parent.add(m);
    const A = m.instanceMatrix.array;
    return {
      mesh: m,
      // box: { hx, y0, y1, hz, round } — round = cylinder of radius hx.
      draw(n, t, box, seed) {
        for (let i = 0; i < n; i++) {
          const s = seed + i * 7.3, w = 0.25 + 0.35 * rand(s + 1);
          const u = Math.sin(t * w + 6.283 * rand(s + 2)) * 0.7 + Math.sin(t * w * 1.7 + 6.283 * rand(s + 3)) * 0.3;
          const v = Math.sin(t * w * 0.9 + 6.283 * rand(s + 4)) * 0.7 + Math.sin(t * w * 1.3 + 6.283 * rand(s + 5)) * 0.3;
          const y = box.y0 + (box.y1 - box.y0) * (0.5 + 0.5 * (Math.sin(t * w * 0.8 + 6.283 * rand(s + 6)) * 0.75 + Math.sin(t * w * 2.1 + rand(s + 7) * 6) * 0.25));
          if (box.round) { const a = u * Math.PI + rand(s + 8) * 6.283, r = box.hx * (0.25 + 0.7 * Math.abs(v)); out.set(Math.cos(a) * r, y, Math.sin(a) * r); }
          else out.set(u * box.hx, y, v * box.hz);
          const o = i * 16, ang = t * w * 2 + i;
          const c = Math.cos(ang), sn = Math.sin(ang);
          A[o] = c; A[o + 1] = 0; A[o + 2] = -sn; A[o + 3] = 0; A[o + 4] = 0; A[o + 5] = 1; A[o + 6] = 0; A[o + 7] = 0;
          A[o + 8] = sn; A[o + 9] = 0; A[o + 10] = c; A[o + 11] = 0; A[o + 12] = out.x; A[o + 13] = out.y; A[o + 14] = out.z; A[o + 15] = 1;
        }
        m.count = n; m.instanceMatrix.needsUpdate = true;
      },
    };
  }
  const colorGeo = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 });
  const ION = { H: 0xff4d4d, OH: 0x3b82f6, Na: 0x9d4edd, Cl: 0x40c057, W: 0x99e9f2 };
  const geoH = colorGeo(new THREE.SphereGeometry(0.05, 12, 8), ION.H);
  const geoOH = mergeGeometries([colorGeo(new THREE.SphereGeometry(0.075, 12, 8), ION.OH), colorGeo(new THREE.SphereGeometry(0.04, 10, 6).translate(0.08, 0.03, 0), 0xffffff)]);
  const geoNa = colorGeo(new THREE.SphereGeometry(0.075, 12, 8), ION.Na);
  const geoCl = colorGeo(new THREE.SphereGeometry(0.1, 12, 8), ION.Cl);
  const ha = (104.5 / 2) * Math.PI / 180;
  const geoW = mergeGeometries([colorGeo(new THREE.SphereGeometry(0.07, 12, 8), ION.W), colorGeo(new THREE.SphereGeometry(0.042, 10, 6).translate(Math.sin(ha) * 0.08, -Math.cos(ha) * 0.08, 0), 0xffffff), colorGeo(new THREE.SphereGeometry(0.042, 10, 6).translate(-Math.sin(ha) * 0.08, -Math.cos(ha) * 0.08, 0), 0xffffff)]);
  const legendDraw = rows => (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, 22); g.fill();
    g.font = 'bold 34px sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
    rows.forEach(([c, t], i) => {
      const y = 34 + i * ((H - 68) / Math.max(1, rows.length - 1));
      g.fillStyle = c; g.beginPath(); g.arc(34, y, 15, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1d2b36'; g.fillText(t, 62, y + 2);
    });
  };
  const flameMatO = new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.85, depthWrite: false });
  const flameMatI = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95, depthWrite: false });
  const flameGeo = new THREE.SphereGeometry(1, 12, 8).translate(0, 1, 0);

  // ---------- Step 0: household substances on a pH strip ----------
  const S0 = station(X.home);
  const stripTex = paint(THREE, 512, 96, (g, W, H) => {
    const cw = W / 15;
    for (let i = 0; i < 15; i++) { g.fillStyle = UI[i]; g.fillRect(i * cw, 0, cw + 1, 60); g.fillStyle = i >= 4 && i <= 7 ? '#1d2b36' : '#ffffff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i), i * cw + cw / 2, 31); }
    g.fillStyle = '#ffffff'; g.fillRect(0, 60, W, 36);
    g.fillStyle = '#1d2b36'; g.font = 'bold 22px sans-serif'; g.textAlign = 'left'; g.fillText('← more acidic', 6, 79);
    g.textAlign = 'center'; g.fillText('neutral', W * 7.5 / 15, 79);
    g.textAlign = 'right'; g.fillText('more basic →', W - 6, 79);
  });
  const SL = 3.9;
  const strip = kit.mesh(new THREE.BoxGeometry(SL, 0.02, 0.73), [kit.mat(0xffffff), kit.mat(0xffffff), new THREE.MeshBasicMaterial({ map: stripTex }), kit.mat(0xffffff), kit.mat(0xffffff), kit.mat(0xffffff)], [0, 0.03, 0.55], S0);
  strip.castShadow = false;
  const phX = p => -SL / 2 + ((p + 0.5) / 15) * SL;
  const marker = kit.mesh(new THREE.ConeGeometry(0.07, 0.18, 16).rotateX(Math.PI), kit.mat(0x1d2b36), [0, 0.2, 0.42], S0);
  const ring = kit.mesh(new THREE.TorusGeometry(0.25, 0.02, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1f7ae0 }), [0, 0.02, -0.25], S0);
  ring.castShadow = false;
  const items = [];
  const IX = i => -1.8 + i * 0.72;
  const g0 = () => { const g = new THREE.Group(); S0.add(g); return g; };
  { // lemon
    const g = g0(); const l = kit.mesh(new THREE.SphereGeometry(0.2, 20, 14), kit.mat(0xf9d71c, { roughness: 0.6 }), [0, 0.17, 0], g); l.scale.set(1.25, 0.85, 0.9);
    kit.mesh(new THREE.ConeGeometry(0.04, 0.08, 10).rotateZ(-Math.PI / 2), kit.mat(0xe9c400), [0.27, 0.17, 0], g);
    kit.mesh(new THREE.ConeGeometry(0.04, 0.08, 10).rotateZ(Math.PI / 2), kit.mat(0xe9c400), [-0.27, 0.17, 0], g); items.push(g);
  }
  { // vinegar bottle
    const g = g0(); kit.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 20), new THREE.MeshStandardMaterial({ color: 0xf4e8c1, transparent: true, opacity: 0.75, roughness: 0.15 }), [0, 0.2, 0], g);
    kit.mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.14, 20), kit.mat(0xffffff), [0, 0.2, 0], g);
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0xf4e8c1, transparent: true, opacity: 0.75 }), [0, 0.46, 0], g);
    kit.mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 16), kit.mat(0xd62828), [0, 0.55, 0], g); items.push(g);
  }
  { const g = g0(); beaker(k, { parent: g, r: 0.16, h: 0.34, fill: 0.7, color: 0xd6ecfa, opacity: 0.5 }); items.push(g); }
  { // baking soda box
    const g = g0(); kit.mesh(new THREE.BoxGeometry(0.24, 0.34, 0.14), kit.mat(0xf08c00), [0, 0.17, 0], g);
    kit.mesh(new THREE.BoxGeometry(0.245, 0.1, 0.145), kit.mat(0xffffff), [0, 0.2, 0], g); items.push(g);
  }
  { // soap bar with suds
    const g = g0(); kit.mesh(new THREE.CapsuleGeometry(0.07, 0.18, 4, 12).rotateZ(Math.PI / 2), kit.mat(0xf7a1c4, { roughness: 0.5 }), [0, 0.08, 0], g).scale.set(1, 1, 1.5);
    for (let i = 0; i < 5; i++) kit.mesh(new THREE.SphereGeometry(0.03 + 0.02 * rand(i), 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }), [(rand(i + 3) - 0.5) * 0.25, 0.17 + rand(i + 6) * 0.05, (rand(i + 9) - 0.5) * 0.1], g);
    items.push(g);
  }
  { // oven cleaner spray
    const g = g0(); kit.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 18), kit.mat(0x364fc7), [0, 0.2, 0], g);
    kit.mesh(new THREE.BoxGeometry(0.1, 0.12, 0.16), kit.mat(0x212529), [0, 0.46, 0.02], g);
    kit.mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), kit.mat(0x212529), [0, 0.48, 0.13], g);
    kit.mesh(new THREE.BoxGeometry(0.205, 0.08, 0.205), kit.mat(0xfab005), [0, 0.22, 0], g); items.push(g);
  }
  items.forEach((g, i) => g.position.set(IX(i), 0.0, -0.25));
  const homeTag = label('', v3(0, 0, 0), { cls: 'big' });
  const hm = { sel: 0, auto: false, row: null };
  function pickItem(i) {
    hm.sel = i;
    const s = SUBST[i];
    ring.position.x = IX(i);
    homeTag.at.set(X.home + IX(i), 0.72, -0.25);
    homeTag.text = `${s.name}: pH ${s.txt}`;
    ui.readout(`<b>${s.name}</b>: pH ${s.txt}, so it is <b>${kindOf(s.ph)}</b>.<br>Below 7: acidic · 7: neutral · above 7: basic`);
    hm.row?.select(i);
  }

  // ---------- Step 1: ions and pH ----------
  const S1 = station(X.ion);
  const big = beaker(k, { parent: S1, r: 0.62, h: 1.15, fill: 0.82, color: 0x4fb648, opacity: 0.45 });
  const sH1 = swarm(big.group, geoH, vcMat, 30), sOH1 = swarm(big.group, geoOH, vcMat, 30);
  const phSign = sign(k, { w: 1.0, h: 0.32, px: 256, py: 80, font: 'bold 52px sans-serif', parent: S1, text: 'pH 7' });
  phSign.position.set(0, 1.45, 0);
  const legend1 = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.3), new THREE.MeshBasicMaterial({ map: paint(THREE, 380, 120, legendDraw([['#ff4d4d', 'H⁺ hydrogen ion'], ['#3b82f6', 'OH⁻ hydroxide ion']])), transparent: true }));
  legend1.position.set(1.25, 0.75, -0.2);
  S1.add(legend1);
  const io = { ph: 7, slider: null, auto: true, msg: '' };
  function setPh(p) {
    io.ph = p;
    big.setColor(uiColor(p));
    const t = `pH ${p.toFixed(1)}`, c = '#' + uiColor(p).getHexString();
    phSign.setText(t, { bg: c, color: p >= 4 && p <= 7.5 ? '#1d2b36' : '#ffffff' });
    const ratio = Math.pow(10, Math.abs(7 - p));
    const r = Math.round(ratio).toLocaleString('en-US');
    let msg = p < 6.95 ? `pH <b>${p.toFixed(1)}</b>: <b>acidic</b>. About <b>${r}</b> times more H⁺ ions than pure water.`
      : p > 7.05 ? `pH <b>${p.toFixed(1)}</b>: <b>basic</b>. About <b>${r}</b> times more OH⁻ ions than pure water.`
      : 'pH <b>7</b>: <b>neutral</b>. Equal (and tiny) numbers of H⁺ and OH⁻ ions.';
    msg += '<br><small>The beaker shows a few ions only: not to scale.</small>';
    if (msg !== io.msg) { io.msg = msg; ui.readout(msg); }
  }
  const ionCounts = p => [p <= 7 ? Math.round(2 + 3.4 * (7 - p)) : Math.max(0, Math.round(2 - 0.6 * (p - 7))), p >= 7 ? Math.round(2 + 3.4 * (p - 7)) : Math.max(0, Math.round(2 - 0.6 * (7 - p)))];

  // ---------- Step 2: litmus and universal indicator ----------
  const S2 = station(X.litmus);
  const LX = [-1.0, 0, 1.0];
  const lb = LIT.map((s, i) => beaker(k, { parent: S2, pos: [LX[i], 0, 0], r: 0.28, h: 0.5, fill: 0.6, color: s.liquid, opacity: 0.55 }));
  const litTags = LIT.map((s, i) => label(s.name, v3(X.litmus + LX[i], -0.14, 0.4)));
  const holder = new THREE.Group();
  S2.add(holder);
  kit.mesh(new THREE.BoxGeometry(0.3, 0.05, 0.06), lm.steel, [0, 0.5, 0], holder);
  kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), lm.steel, [0, 0.75, 0], holder);
  const cLitBlue = new THREE.Color(0x4d7fe0), cLitRed = new THREE.Color(0xe0525a);
  const papers = [cLitBlue, cLitRed].map((c, j) => {
    const top = kit.mesh(new THREE.BoxGeometry(0.07, 0.22, 0.006), kit.mat(c.getHex()), [j ? 0.06 : -0.06, 0.38, 0], holder);
    const bot = kit.mesh(new THREE.BoxGeometry(0.07, 0.22, 0.006), kit.mat(c.getHex()), [j ? 0.06 : -0.06, 0.16, 0], holder);
    top.castShadow = bot.castShadow = false;
    return { base: c, bot };
  });
  const dropper = new THREE.Group();
  S2.add(dropper);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.012, 0.25, 10), new THREE.MeshStandardMaterial({ color: 0xe9f4fb, transparent: true, opacity: 0.7 }), [0, 0.12, 0], dropper);
  kit.mesh(new THREE.SphereGeometry(0.045, 12, 8), kit.mat(0x343a40), [0, 0.27, 0], dropper);
  const lt = { at: 0, start: null, done: [false, false, false], from: 0, to: 0 };
  const litColor = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
  LIT.forEach((s, i) => litColor[i].copy(new THREE.Color(s.liquid)));
  function testLitmus(i) { lt.from = holder.position.x; lt.to = LX[i]; lt.i = i; lt.start = st.time; papers.forEach(p => p.bot.material.color.copy(p.base)); }
  function tickLitmus() {
    if (lt.start == null) return false;
    const tt = st.time - lt.start, i = lt.i, s = LIT[i];
    const mv = kit.ease(kit.clamp(tt / 0.5, 0, 1)), dip = kit.clamp((tt - 0.5) / 0.4, 0, 1) * (1 - kit.clamp((tt - 1.7) / 0.4, 0, 1));
    holder.position.set(kit.lerp(lt.from, lt.to, mv) - 0.12, 0.62 - 0.42 * kit.ease(dip), 0);
    const ch = kit.clamp((tt - 0.9) / 0.6, 0, 1);
    if (s.ph < 7) papers[0].bot.material.color.copy(cLitBlue).lerp(cLitRed, ch);
    if (s.ph > 7) papers[1].bot.material.color.copy(cLitRed).lerp(cLitBlue, ch);
    // Universal indicator: a drop from the dropper turns the beaker its colour.
    dropper.position.set(lt.to + 0.12, 0.62 + 0.1 * (1 - kit.clamp((tt - 0.6) / 0.3, 0, 1)), 0);
    const ind = kit.clamp((tt - 1.0) / 0.8, 0, 1);
    lb[i].mat.color.copy(litColor[i].set(s.liquid)).lerp(uiColor(s.ph), ind);
    if (tt > 1.9 && !lt.done[i]) {
      lt.done[i] = true;
      const res = s.ph < 7 ? 'Blue litmus turns <b>red</b>, red stays red: <b>acid</b>.' : s.ph > 7 ? 'Red litmus turns <b>blue</b>, blue stays blue: <b>alkali</b>.' : 'Neither paper changes: <b>neutral</b>.';
      ui.readout(`<b>${s.name}</b> (pH about ${s.ph}): ${res}<br>Universal indicator turns <b>${s.ph < 7 ? 'orange' : s.ph > 7 ? 'dark blue' : 'green'}</b>.`);
    }
    return tt < 2.2;
  }

  // ---------- Step 3: neutralisation with a burette ----------
  const S3 = station(X.neut);
  kit.mesh(new THREE.BoxGeometry(0.9, 0.03, 0.9), kit.mat(0xffffff), [0, 0.015, 0], S3).castShadow = false;
  const nb = beaker(k, { parent: S3, pos: [0, 0.03, 0], r: 0.4, h: 0.72, fill: 0.45, color: 0xd7191c, opacity: 0.6 });
  // Clamp stand and burette.
  kit.mesh(new THREE.BoxGeometry(0.6, 0.04, 0.45), kit.mat(0x343a40), [-0.75, 0.02, -0.1], S3);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 10), lm.steel, [-0.75, 1.2, -0.25], S3);
  kit.mesh(new THREE.BoxGeometry(0.75, 0.04, 0.04), lm.steel, [-0.39, 1.75, -0.25], S3);
  kit.mesh(new THREE.BoxGeometry(0.06, 0.1, 0.25), kit.mat(0x343a40), [0, 1.75, -0.13], S3);
  const BUR0 = 0.95, BURH = 1.2;
  const bur = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, BURH, 16, 1, true).translate(0, BUR0 + BURH / 2, 0), lm.glass);
  bur.renderOrder = 3; S3.add(bur);
  const burLiq = kit.mesh(new THREE.CylinderGeometry(0.052, 0.052, 1, 14).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xf1f8ff, transparent: true, opacity: 0.7, depthWrite: false }), [0, BUR0, 0], S3);
  burLiq.castShadow = false;
  kit.mesh(new THREE.ConeGeometry(0.06, 0.12, 14).rotateX(Math.PI), lm.rim, [0, BUR0 - 0.06, 0], S3);
  kit.mesh(new THREE.BoxGeometry(0.22, 0.04, 0.04), kit.mat(0x2b8a3e), [0, BUR0 + 0.05, 0], S3);
  const dropM = kit.mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe7f5ff, transparent: true, opacity: 0.9 }), [0, BUR0 - 0.12, 0], S3);
  dropM.visible = false;
  const phSign3 = sign(k, { w: 0.85, h: 0.28, px: 256, py: 80, font: 'bold 50px sans-serif', parent: S3, text: 'pH 1.0' });
  phSign3.position.set(0.85, 0.95, 0);
  const burTag = label('NaOH solution', v3(X.neut + 0.05, BUR0 + BURH + 0.1, 0), { cls: 'cool' });
  const acidTag = label('HCl + indicator', v3(X.neut, 0.1, 0.5), { cls: 'warm' });
  const nt = { drops: 0, falling: [], slider: null, auto: false, next: 0, msg: '' };
  function setDrops(d) {
    nt.drops = d;
    const p = phAfter(d);
    nb.setColor(uiColor(p));
    nb.setFill(0.45 + d * 0.0012);
    burLiq.scale.y = BURH * 0.9 - d * 0.01;
    phSign3.setText(`pH ${p.toFixed(1)}`, { bg: '#' + uiColor(p).getHexString(), color: p >= 4 && p <= 7.5 ? '#1d2b36' : '#ffffff' });
    const left = Math.max(0, ACID_MMOL - DROP_MMOL * d), extra = Math.max(0, DROP_MMOL * d - ACID_MMOL);
    const msg = `Drops added: <b>${d}</b> · pH: <b>${p.toFixed(1)}</b> (<b>${kindOf(p)}</b>)<br>${left > 0 ? `Acid left: ${Math.round(left / ACID_MMOL * 100)}%` : extra > 0 ? `Extra alkali: ${Math.round(extra / ACID_MMOL * 100)}% of what was needed` : 'Exactly neutralised: only salt and water!'} · 20 drops neutralise this acid (model)`;
    if (msg !== nt.msg && !st.quiz) { nt.msg = msg; ui.readout(msg); }
  }
  function addDrop() { if (nt.drops + nt.falling.length >= 40) return; nt.falling.push(0); }
  function tickDrops(dt) {
    let busy = nt.falling.length > 0;
    const top = BUR0 - 0.12, bottom = 0.03 + nb.surface();
    for (let i = nt.falling.length - 1; i >= 0; i--) {
      nt.falling[i] += dt;
      if (nt.falling[i] > 0.35) { nt.falling.splice(i, 1); setDrops(nt.drops + 1); nt.slider?.set(nt.drops); }
    }
    dropM.visible = nt.falling.length > 0;
    if (dropM.visible) { const f = nt.falling[0] / 0.35; dropM.position.y = kit.lerp(top, bottom, f * f); }
    if (nt.auto && st.time >= nt.next && nt.drops + nt.falling.length < 20) { addDrop(); nt.next = st.time + 0.11; busy = true; }
    return busy || (nt.auto && nt.drops < 20);
  }

  // ---------- Step 4: ions in neutralisation ----------
  const S4 = station(X.ions);
  const IB = { hx: 0.8, hz: 0.45, h: 1.15 };
  const ionBoxGeo = new THREE.BoxGeometry(2 * IB.hx + 0.04, IB.h, 2 * IB.hz + 0.04).translate(0, IB.h / 2, 0);
  const ionBox = new THREE.Mesh(ionBoxGeo, new THREE.MeshStandardMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  ionBox.renderOrder = 3;
  S4.add(ionBox, new THREE.LineSegments(new THREE.EdgesGeometry(ionBoxGeo), new THREE.LineBasicMaterial({ color: 0x6f93b3 })));
  kit.mesh(new THREE.BoxGeometry(2 * IB.hx + 0.2, 0.05, 2 * IB.hz + 0.2), kit.mat(0x6d7782), [0, 0.025, 0], S4).castShadow = false;
  const sH = swarm(S4, geoH, vcMat, 12), sCl = swarm(S4, geoCl, vcMat, 12), sNa = swarm(S4, geoNa, vcMat, 18), sOH = swarm(S4, geoOH, vcMat, 6), sW = swarm(S4, geoW, vcMat, 12);
  const legend4 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.05), new THREE.MeshBasicMaterial({ map: paint(THREE, 300, 400, legendDraw([['#ff4d4d', 'H⁺'], ['#40c057', 'Cl⁻'], ['#9d4edd', 'Na⁺'], ['#3b82f6', 'OH⁻'], ['#99e9f2', 'H₂O (new)']])), transparent: true }));
  legend4.position.set(1.35, 0.62, -0.1);
  S4.add(legend4);
  const ions = { f: 0, slider: null, auto: true, msg: '' };
  const ionBoxDims = { hx: IB.hx - 0.1, hz: IB.hz - 0.1, y0: 0.15, y1: IB.h - 0.1 };
  function ionReadout() {
    const n = Math.round(12 * ions.f), h = Math.max(0, 12 - n), oh = Math.max(0, n - 12), w = Math.min(12, n);
    const msg = `Base added: <b>${Math.round(ions.f * 100)}%</b> · H⁺ left: <b>${h}</b> · new water molecules: <b>${w}</b> · spare OH⁻: <b>${oh}</b><br>Na⁺: ${n} and Cl⁻: 12 stay in the water (dissolved salt). The solution is <b>${h > 0 ? 'acidic' : oh > 0 ? 'basic' : 'neutral'}</b>.`;
    if (msg !== ions.msg) { ions.msg = msg; ui.readout(msg); }
  }
  function tickIons(t) {
    const n = Math.round(12 * ions.f);
    sCl.draw(12, t, ionBoxDims, 11);
    sH.draw(Math.max(0, 12 - n), t, ionBoxDims, 300);
    sNa.draw(n, t, ionBoxDims, 600);
    sOH.draw(Math.max(0, n - 12), t, ionBoxDims, 900);
    sW.draw(Math.min(12, n), t, ionBoxDims, 1200);
  }

  // ---------- Step 5: acids with a metal and a carbonate ----------
  const S5 = station(X.react);
  const rackM = kit.mat(0xb07b4a);
  kit.mesh(new THREE.BoxGeometry(3.1, 0.06, 0.45), rackM, [0, 0.03, 0], S5);
  kit.mesh(new THREE.BoxGeometry(3.1, 0.05, 0.45), rackM, [0, 0.3, 0], S5).castShadow = false;
  for (const x of [-1.5, 1.5]) kit.mesh(new THREE.BoxGeometry(0.06, 0.3, 0.45), rackM, [x, 0.17, 0], S5);
  const tM = testTube(k, { parent: S5, pos: [-1.0, 0.06, 0], r: 0.13, h: 1.0, fill: 0.4, color: 0xe4f1f8, opacity: 0.5 });
  const tCarb = testTube(k, { parent: S5, pos: [0.25, 0.06, 0], r: 0.13, h: 1.0, fill: 0.4, color: 0xe4f1f8, opacity: 0.5 });
  const tLime = testTube(k, { parent: S5, pos: [1.1, 0.06, 0], r: 0.13, h: 1.0, fill: 0.55, color: 0xf3f6f8, opacity: 0.3 });
  const mgStrip = kit.mesh(new THREE.BoxGeometry(0.03, 0.22, 0.006), kit.mat(0xc9ced3, { metalness: 0.7, roughness: 0.3 }), [0, 0.16, 0], tM.group);
  mgStrip.rotation.z = 0.3;
  const chips = [0, 1, 2].map(i => kit.mesh(new THREE.DodecahedronGeometry(0.045, 0), kit.mat(0xeceae4, { flatShading: true }), [(i - 1) * 0.05, 0.07 + (i % 2) * 0.03, 0], tCarb.group));
  const fizzM = bubbles(k, { parent: tM.group, r: 0.08, y0: 0.08, y1: 0.4, size: 0.018, n: 26 });
  const fizzC = bubbles(k, { parent: tCarb.group, r: 0.08, y0: 0.08, y1: 0.4, size: 0.018, n: 26 });
  const fizzL = bubbles(k, { parent: tLime.group, r: 0.02, y0: 0.08, y1: 0.55, size: 0.02, n: 14 });
  const flTop = 0.06 + 1.0;
  stopper(k, { parent: tCarb.group, nr: 0.13, y: 1.0 });
  tube(k, [[0.25, flTop + 0.1, 0], [0.25, flTop + 0.32, 0], [0.55, flTop + 0.42, 0], [1.1, flTop + 0.32, 0], [1.1, flTop, 0], [1.1, 0.2, 0]], { r: 0.022, parent: S5 });
  const splint = new THREE.Group();
  S5.add(splint);
  kit.mesh(new THREE.BoxGeometry(0.035, 0.6, 0.035).translate(0, 0.3, 0), kit.mat(0xd9a066), [0, 0, 0], splint);
  const spFlame = new THREE.Group();
  spFlame.add(new THREE.Mesh(flameGeo, flameMatO), new THREE.Mesh(flameGeo, flameMatI));
  spFlame.children[0].scale.set(0.42, 1, 0.42); spFlame.children[1].scale.set(0.24, 0.6, 0.24);
  spFlame.rotation.z = -0.9; spFlame.scale.setScalar(0.07);
  splint.add(spFlame);
  splint.rotation.z = 0.9;
  const pop = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff3bf, transparent: true, opacity: 0, depthWrite: false }));
  pop.visible = false; S5.add(pop);
  const popTag = label('Squeaky pop!', v3(X.react - 1.0, 1.55, 0), { cls: 'warm' });
  const mgTag = label('Magnesium + acid', v3(X.react - 1.0, 1.15, 0.2));
  const carbTag = label('Marble + acid', v3(X.react + 0.25, 1.62, 0.2));
  const limeTag = label('Limewater', v3(X.react + 1.15, 1.15, 0.2), { cls: 'cool' });
  const rc = { mg: null, sp: null, carb: null, lime: null, popShown: false };
  const cLime = new THREE.Color(0xe6f3fa), cMilk = new THREE.Color(0xf6f4ee);
  function tickReact(t) {
    const T = st.time;
    const mgOn = rc.mg != null, cOn = rc.carb != null;
    mgStrip.visible = mgOn && T - rc.mg < 12;
    if (mgOn) mgStrip.scale.y = Math.max(0.1, 1 - (T - rc.mg) / 12);
    fizzM.tick(t, mgOn ? kit.clamp((T - rc.mg) / 0.6, 0, 1) * 0.9 : 0);
    chips.forEach(c => { c.visible = cOn; });
    fizzC.tick(t, cOn ? kit.clamp((T - rc.carb) / 0.6, 0, 1) * 0.8 : 0);
    // Splint: hovers at the side, dips to the mouth of the magnesium tube, pops, then comes back.
    const sp = rc.sp == null ? -1 : T - rc.sp;
    const dip = sp < 0 ? 0 : kit.ease(kit.clamp(sp / 0.6, 0, 1)) * (1 - kit.ease(kit.clamp((sp - 1.4) / 0.6, 0, 1)));
    splint.position.set(kit.lerp(-1.75, -1.05, dip), kit.lerp(1.15, 1.08, dip), 0.05);
    const lit = !(sp > 0.6 && sp < 0.75);
    spFlame.visible = lit; spFlame.scale.setScalar(0.07 * (1 + 0.1 * Math.sin(t * 19)));
    const pp = sp - 0.6;
    pop.visible = mgOn && pp > 0 && pp < 0.45;
    if (pop.visible) { pop.position.set(-1.0, 1.1, 0); pop.scale.setScalar(0.08 + pp * 0.5); pop.material.opacity = 1 - pp / 0.45; }
    popTag.show(st.step === 5 && mgOn && pp > 0 && pp < 2.5);
    // Limewater turns milky as carbon dioxide bubbles through it.
    const lw = rc.lime == null || !cOn ? 0 : kit.clamp((T - Math.max(rc.lime, rc.carb)) / 2.5, 0, 1);
    fizzL.tick(t, rc.lime != null && cOn ? 0.8 : 0);
    tLime.mat.color.copy(cLime).lerp(cMilk, lw);
    tLime.mat.opacity = 0.12 + 0.85 * lw;
    return true;
  }

  // ---------- Step 6: safety ----------
  const S6 = station(X.safe);
  kit.mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), kit.mat(0x495057), [-1.0, 0.03, 0], S6);
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 12), kit.mat(0xd9c2a5), [-1.0, 0.36, 0], S6);
  const head = kit.mesh(new THREE.SphereGeometry(0.3, 24, 16), kit.mat(0xd9c2a5, { roughness: 0.8 }), [-1.0, 0.92, 0], S6);
  head.scale.set(0.9, 1.1, 0.95);
  const goggles = new THREE.Group();
  S6.add(goggles);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.55, roughness: 0.1 });
  for (const x of [-0.11, 0.11]) { const l = kit.mesh(new THREE.SphereGeometry(0.1, 16, 10), lensMat, [x, 0, 0], goggles); l.scale.set(1, 0.65, 0.5); }
  kit.mesh(new THREE.BoxGeometry(0.42, 0.13, 0.04), kit.mat(0x1c7ed6), [0, 0, -0.03], goggles);
  const strap = kit.mesh(new THREE.TorusGeometry(0.3, 0.02, 6, 32, Math.PI), kit.mat(0x212529), [0, 0, -0.14], goggles);
  strap.rotation.x = -Math.PI / 2;
  const safeB = beaker(k, { parent: S6, pos: [0.3, 0, 0], r: 0.42, h: 0.8, fill: 0.75, color: 0xe7f5ff, opacity: 0.35 });
  const sAcid = swarm(safeB.group, geoH, vcMat, 40), sWat = swarm(safeB.group, geoW, vcMat, 40);
  const hazTex = paint(THREE, 256, 256, (g, W) => {
    g.clearRect(0, 0, W, W);
    g.save(); g.translate(W / 2, W / 2); g.rotate(Math.PI / 4);
    g.fillStyle = '#ffffff'; g.fillRect(-84, -84, 168, 168); g.lineWidth = 14; g.strokeStyle = '#e03131'; g.strokeRect(-84, -84, 168, 168); g.restore();
    g.fillStyle = '#1d2b36';
    g.save(); g.translate(92, 82); g.rotate(-0.5); g.fillRect(-9, -26, 18, 44); g.restore();
    g.save(); g.translate(164, 82); g.rotate(0.5); g.fillRect(-9, -26, 18, 44); g.restore();
    for (const [x, y] of [[100, 120], [104, 140], [156, 120], [152, 140]]) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }
    g.fillRect(70, 160, 52, 14); g.fillRect(140, 160, 46, 14); g.fillRect(150, 150, 30, 10);
  });
  const haz = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map: hazTex, transparent: true }));
  haz.position.set(1.25, 0.95, -0.1);
  S6.add(haz);
  kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), lm.steel, [1.25, 0.3, -0.12], S6);
  const concTag = label('Dilute', v3(X.safe + 0.3, 1.0, 0));
  const sf = { on: null, conc: 10, msg: '' };
  const gOff = v3(-0.35, 0.08, 0.45), gOn = v3(-1.0, 0.98, 0.25);
  function concReadout() {
    const n = Math.round(40 * sf.conc / 100), word = sf.conc < 30 ? 'Dilute' : sf.conc < 60 ? 'Fairly concentrated' : 'Concentrated';
    concTag.text = word;
    const msg = `<b>${word}</b> acid: about <b>${n}</b> acid particles in every 40 particles (model).<br>${sf.conc < 30 ? 'Still an irritant: wear goggles and wash splashes off with water.' : '<b>Corrosive!</b> Can burn skin and eyes. Handle with great care.'}`;
    if (msg !== sf.msg) { sf.msg = msg; ui.readout(msg); }
  }
  function tickSafe(t) {
    const g = sf.on == null ? 0 : kit.ease(kit.clamp((st.time - sf.on) / 1.0, 0, 1));
    goggles.position.lerpVectors(gOff, gOn, g);
    goggles.position.y += Math.sin(Math.PI * g) * 0.4;
    goggles.rotation.set((1 - g) * -1.3, 0, 0);
    const n = Math.round(40 * sf.conc / 100), box = { hx: 0.36, round: true, y0: 0.06, y1: 0.55 };
    sAcid.draw(n, t, box, 50); sWat.draw(40 - n, t, box, 500);
    return true;
  }

  // ---------- Steps ----------
  const stations = [S0, S1, S2, S3, S4, S5, S6];
  const allTags = [homeTag, ...litTags, burTag, acidTag, popTag, mgTag, carbTag, limeTag, concTag];
  const st = { step: 0, time: 0, quiz: false, plan: [] };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.time = 0; st.plan = [];
      stations.forEach((g, j) => { g.visible = isQuiz ? j === 3 : j === i; });
      allTags.forEach(t => t.show(false));
      if (i === 0) {
        view({ radius: 1.15, width: 2.1, yaw: 0, pitch: 0.55, target: [X.home, 0.25, 0.15] });
        homeTag.show(true); hm.auto = true;
        hm.row = ui.buttons(SUBST.map((s, j) => ({ label: s.name, onClick: () => { hm.auto = false; pickItem(j); } })));
        pickItem(0);
      }
      if (i === 1) {
        view({ radius: 1.05, width: 1.45, yaw: 0, pitch: 0.18, target: [X.ion + 0.35, 0.75, 0] });
        io.auto = true; io.msg = '';
        io.slider = ui.slider({ label: 'pH', min: 0, max: 14, step: 0.5, value: 7, format: v => v.toFixed(1), onInput: v => { io.auto = false; setPh(v); } });
        setPh(7);
      }
      if (i === 2) {
        view({ radius: 0.95, width: 1.5, yaw: 0, pitch: 0.28, target: [X.litmus, 0.5, 0] });
        litTags.forEach(t => t.show(true));
        lt.done = [false, false, false]; lt.start = null;
        lb.forEach((b, j) => b.setColor(LIT[j].liquid));
        papers.forEach(p => p.bot.material.color.copy(p.base));
        holder.position.set(-1.6, 0.62, 0); dropper.position.set(-1.4, 0.72, 0);
        const row = ui.buttons(LIT.map((s, j) => ({ label: s.name, onClick: () => { st.plan = []; testLitmus(j); } })));
        st.plan = [[0.2, () => { testLitmus(0); row.select(0); }], [3.4, () => { testLitmus(1); row.select(1); }], [5.8, () => { testLitmus(2); row.select(2); }]];
        ui.readout('Blue litmus turns <b>red</b> in acid. Red litmus turns <b>blue</b> in alkali.');
      }
      if (i === 3 || isQuiz) {
        view(isQuiz ? { radius: 1.45, yaw: -0.25, pitch: 0.2, target: [X.neut, 1.0, 0] } : { radius: 1.35, yaw: 0.15, pitch: 0.15, target: [X.neut + 0.05, 1.05, 0] });
        nt.falling = []; nt.msg = ''; nt.auto = !isQuiz; nt.next = 0.3; dropM.visible = false;
        if (!isQuiz) {
          burTag.show(true); acidTag.show(true);
          nt.slider = ui.slider({ label: 'Drops added', min: 0, max: 40, step: 1, value: 0, onInput: v => { nt.auto = false; nt.falling = []; setDrops(v); } });
          ui.buttons([{ label: 'Add 1 drop', onClick: () => { nt.auto = false; addDrop(); } }, { label: 'Start again', onClick: () => { nt.auto = false; nt.falling = []; setDrops(0); nt.slider.set(0); } }]);
          setDrops(0);
        } else { nt.slider = null; setDrops(20); }
      }
      if (i === 4) {
        view({ radius: 1.05, width: 1.5, yaw: 0, pitch: 0.2, target: [X.ions + 0.3, 0.6, 0] });
        ions.auto = true; ions.f = 0; ions.msg = '';
        ions.slider = ui.slider({ label: 'Base added', min: 0, max: 150, step: 5, value: 0, unit: '%', onInput: v => { ions.auto = false; ions.f = v / 100; ionReadout(); } });
        ionReadout(); tickIons(0);
      }
      if (i === 5) {
        view({ radius: 1.2, width: 1.7, yaw: 0.1, pitch: 0.22, target: [X.react, 0.8, 0] });
        rc.mg = rc.sp = rc.carb = rc.lime = null;
        mgTag.show(true); carbTag.show(true); limeTag.show(true);
        st.plan = [[0.2, () => { rc.mg = st.time; }], [0.4, () => { rc.carb = st.time; }], [1.0, () => { rc.lime = st.time; }], [1.8, () => { rc.sp = st.time; }]];
        ui.buttons([
          { label: 'Add magnesium', onClick: () => { st.plan = []; rc.mg = st.time; } },
          { label: 'Test with a lit splint', onClick: () => { st.plan = []; rc.sp = st.time; } },
          { label: 'Add marble', onClick: () => { st.plan = []; rc.carb = st.time; } },
          { label: 'Bubble through limewater', onClick: () => { st.plan = []; rc.lime = st.time; } },
        ]);
        ui.readout('Metal + acid → salt + <b>hydrogen</b><br>Carbonate + acid → salt + water + <b>carbon dioxide</b>');
      }
      if (i === 6) {
        view({ radius: 1.15, width: 1.65, yaw: 0, pitch: 0.2, target: [X.safe + 0.1, 0.65, 0] });
        sf.on = null; sf.conc = 10; sf.msg = ''; concTag.show(true);
        ui.buttons([{ label: 'Put on goggles', onClick: () => { st.plan = []; sf.on = st.time; } }]);
        const sl = ui.slider({ label: 'Acid concentration', min: 5, max: 80, step: 5, value: 10, format: v => (v < 30 ? 'dilute' : v < 60 ? 'fairly concentrated' : 'concentrated'), onInput: v => { st.plan = []; sf.conc = v; concReadout(); } });
        st.plan = [[0.3, () => { sf.on = st.time; }], [1.6, () => { sf.conc = 70; sl.set(70); concReadout(); }]];
        concReadout();
      }
    },

    update(dt, t) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step, T = st.time;
      if (s === 0) {
        if (hm.auto) { const n = Math.min(5, Math.floor(T / 1.6)) % 6; if (n !== hm.sel) pickItem(n); }
        const tx = phX(SUBST[hm.sel].ph);
        const moving = kit.follow(marker.position, 'x', tx, dt, 5);
        return moving || (hm.auto && T < 8.5);
      }
      if (s === 1) {
        if (io.auto) { const p = Math.round((7 - 6 * Math.sin(T * 0.5)) * 2) / 2; if (p !== io.ph) { setPh(p); io.slider.set(p); } }
        const [nh, noh] = ionCounts(io.ph), box = { hx: 0.52, round: true, y0: 0.08, y1: 0.88 };
        sH1.draw(nh, t, box, 7); sOH1.draw(noh, t, box, 400);
        return true;
      }
      if (s === 2) return tickLitmus() || st.plan.length > 0;
      if (s === 3) return tickDrops(dt) || st.plan.length > 0;
      if (s === 4) {
        if (ions.auto) { const f = Math.min(1, Math.max(0, (T - 0.3) / 4)); const r = Math.round(f * 20) / 20; if (r !== ions.f) { ions.f = r; ions.slider.set(Math.round(r * 100)); ionReadout(); } }
        tickIons(t);
        return true;
      }
      if (s === 5) return tickReact(t);
      if (s === 6) return tickSafe(t);
      return false;
    },
  };
}
