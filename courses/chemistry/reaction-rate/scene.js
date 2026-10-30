// Reaction rate: marble chips (CaCO₃) in hydrochloric acid in a flask standing in a water bath, the CO₂ going
// into a gas syringe, a live volume–time graph, and a particle view where acid particles hit the marble surface.
// Model: V(t) = Vmax (1 − e^(−k t)) with k = k0 × 2^((T − 20)/10) × concentration × surface factor.
// The values are a model; the trends are real. The clock runs SPEED times faster than real time.
import { chartBoard } from '../_shared/particles.js';
import { bench, beaker, flask, stopper, syringe, thermometer, bubbles, tube, rand } from '../_shared/labware.js';

const VMAX = 85;               // cm³ of CO₂ from 0.35 g of marble (0.0035 mol × about 24 dm³/mol); acid in excess
const K0 = 0.03;               // 1/s at 20 °C, 1.0 mol/L, small chips (model)
const SPEED = 6, TMAX = 180;   // model seconds per real second; graph time axis
const SA = { lumps: 0.4, chips: 1, powder: 4 };
const SA_NAME = { lumps: 'large lumps', chips: 'small chips', powder: 'powder' };
const PEROX = { vmax: 80, kOff: 0.0015, kOn: 0.12 };
const kOf = (T, c, sa) => K0 * Math.pow(2, (T - 20) / 10) * c * SA[sa];
const vol = (vmax, k, t) => vmax * (1 - Math.exp(-k * t));

// Particle box (local units): inner half sizes and height.
const BX = 0.78, BZ = 0.48, BH = 1.25, RA = 0.045, RS = 0.065, NA = 48, NS = 64;

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  kit.stage(scene, { ground: 0xd8d2c8, sky: 0xe8f0f6, radius: 30 });
  kit.lights(scene, { sun: [3, 10, 7] });
  bench(k, { w: 8.4, d: 2.6, pos: [0.3, 0, 0] });
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- Apparatus ----------
  const FX = -1.9, HB = 0.12;
  const hot = new THREE.Group();
  hot.position.set(FX, 0, 0);
  scene.add(hot);
  kit.mesh(new THREE.BoxGeometry(1.7, HB, 1.7), kit.mat(0x495057), [0, HB / 2, 0], hot);
  const ringMat = kit.mat(0x2b2b2b, { emissive: 0xff3b1f, emissiveIntensity: 0 });
  kit.mesh(new THREE.TorusGeometry(0.5, 0.04, 6, 32).rotateX(Math.PI / 2), ringMat, [0, HB + 0.005, 0], hot).castShadow = false;
  const bath = beaker(k, { parent: hot, pos: [0, HB, 0], r: 0.74, h: 0.62, fill: 0.66, color: 0xa5d8ff, opacity: 0.32 });
  const fl = flask(k, { parent: hot, pos: [0, HB + 0.02, 0], r: 0.5, h: 0.85, neckR: 0.13, neckH: 0.42, fill: 0.3, color: 0xeef6f8, opacity: 0.45 });
  const flTop = HB + 0.02 + fl.top;
  stopper(k, { parent: hot, nr: 0.13, y: flTop });
  const thermo = thermometer(k, { parent: hot, pos: [-0.5, HB + 0.06, 0.4], h: 1.2, min: 0, max: 60 });
  const SY = 1.0, SX = -1.05;
  const syr = syringe(k, { pos: [SX, SY, 0], len: 1.9, r: 0.17, maxVol: 100, feet: SY - 0.17 });
  tube(k, [[FX, flTop + 0.1, 0], [FX, flTop + 0.3, 0], [FX + 0.25, flTop + 0.38, 0], [SX - 0.45, SY + 0.25, 0], [SX - 0.3, SY, 0], [SX - 0.13, SY, 0]], { r: 0.03 });
  const fizz = bubbles(k, { parent: fl.group, r: 0.3, y0: 0.05, y1: fl.surface, size: 0.02, n: 44 });

  // Marble in the flask: lumps, chips or powder (same mass). Pieces shrink as the marble is used up.
  const marbleMat = kit.mat(0xeceae4, { roughness: 0.85, flatShading: true });
  const rock = new THREE.DodecahedronGeometry(1, 0);
  const pieces = [];
  const LAYOUT = {
    lumps: [[-0.12, 0.13, 0.05, 0.13], [0.14, 0.12, -0.08, 0.12]],
    chips: [...Array(8)].map((_, i) => [Math.cos(i * 0.8) * (0.08 + 0.15 * rand(i)), 0.055, Math.sin(i * 0.8) * (0.08 + 0.15 * rand(i)), 0.055 + 0.015 * rand(i + 3)]),
    powder: [...Array(14)].map((_, i) => [Math.cos(i * 2.4) * 0.28 * Math.sqrt(rand(i + 5)), 0.04, Math.sin(i * 2.4) * 0.28 * Math.sqrt(rand(i + 5)), 0.022]),
  };
  for (let i = 0; i < 14; i++) { const m = kit.mesh(rock, marbleMat, [0, 0, 0], fl.group); m.castShadow = false; m.rotation.set(rand(i) * 3, rand(i + 1) * 3, 0); pieces.push(m); }
  const powderBed = kit.mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.03, 24), marbleMat, [0, 0.03, 0], fl.group);
  powderBed.castShadow = false;
  const mno2 = kit.mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.025, 20), kit.mat(0x1e1e1e, { roughness: 1 }), [0, 0.025, 0], fl.group);
  mno2.castShadow = false;

  // ---------- Graph ----------
  const st = { step: 0, time: 0, quiz: false, plan: [], T: 20, c: 1, sa: 'chips', cat: false, highlight: true, slider: null, msg: '', tan: null };
  const run = { k: kOf(20, 1, 'chips'), vmax: VMAX, t: 0, on: false };
  let ghost = null;
  const board = chartBoard(k, {
    w: 2.9, h: 1.65, px: 512, py: 300,
    draw(g, W, H) {
      const L = 70, R = 16, T = 46, B = 52, pw = W - L - R, ph = H - T - B;
      const X = t => L + (t / TMAX) * pw, Y = v => T + ph - (v / 100) * ph;
      g.fillStyle = '#fbfdff'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1d2b36'; g.font = 'bold 24px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(st.step === 5 ? 'Oxygen collected (model)' : 'CO₂ collected (model)', 12, 30);
      g.strokeStyle = '#dbe4ec'; g.lineWidth = 1.5;
      for (let t = 30; t <= TMAX; t += 30) { g.beginPath(); g.moveTo(X(t), T); g.lineTo(X(t), T + ph); g.stroke(); }
      for (let v = 20; v <= 100; v += 20) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(L + pw, Y(v)); g.stroke(); }
      g.strokeStyle = '#1d2b36'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(L, T - 4); g.lineTo(L, T + ph); g.lineTo(L + pw + 4, T + ph); g.stroke();
      g.fillStyle = '#425466'; g.font = '20px sans-serif'; g.textAlign = 'center';
      for (let t = 0; t <= TMAX; t += 60) g.fillText(String(t), X(t), T + ph + 24);
      g.fillText('time (s)', L + pw - 40, H - 4);
      g.textAlign = 'right';
      for (let v = 0; v <= 100; v += 20) g.fillText(String(v), L - 8, Y(v) + 7);
      g.save(); g.translate(18, T + ph / 2 + 10); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('volume (cm³)', 0, 0); g.restore();
      const curve = (kk, vmax, upto) => { g.beginPath(); for (let j = 0; j <= 90; j++) { const t = (upto * j) / 90; const x = X(t), y = Y(vol(vmax, kk, t)); j ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
      if (ghost) { g.strokeStyle = '#9aa5b1'; g.lineWidth = 4; g.setLineDash([10, 8]); curve(ghost.k, ghost.vmax, TMAX); g.setLineDash([]); }
      const upto = Math.min(run.t, TMAX);
      g.strokeStyle = '#1f7ae0'; g.lineWidth = 5; if (upto > 0) curve(run.k, run.vmax, upto);
      if (st.tan != null) {
        const t0 = st.tan, v0 = vol(run.vmax, run.k, t0), s = run.vmax * run.k * Math.exp(-run.k * t0);
        g.strokeStyle = '#e03131'; g.lineWidth = 3.5;
        g.beginPath(); g.moveTo(X(Math.max(0, t0 - 35)), Y(v0 - s * Math.min(35, t0))); g.lineTo(X(Math.min(TMAX, t0 + 35)), Y(v0 + s * Math.min(35, TMAX - t0))); g.stroke();
      }
      g.fillStyle = '#1f7ae0';
      g.beginPath(); g.arc(X(upto), Y(vol(run.vmax, run.k, upto)), 7, 0, Math.PI * 2); g.fill();
    },
  });
  board.group.position.set(-1.0, 2.68, -0.75);

  // ---------- Particle view ----------
  // The particle view floats on a stand above the syringe, beside the graph.
  const PBX = 1.55, PBY = 1.78;
  const pbox = new THREE.Group();
  pbox.position.set(PBX, PBY, 0);
  scene.add(pbox);
  kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, PBY, 10), kit.mat(0x6d7782), [0.55, -PBY / 2, -0.4], pbox);
  kit.mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.05, 20), kit.mat(0x6d7782), [0.55, -PBY + 0.025, -0.4], pbox);
  const boxGeo = new THREE.BoxGeometry(2 * BX + 0.04, BH + 0.02, 2 * BZ + 0.04).translate(0, BH / 2, 0);
  const boxGlass = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0xdff0ff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
  boxGlass.renderOrder = 3;
  pbox.add(boxGlass, new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({ color: 0x6f93b3 })));
  kit.mesh(new THREE.BoxGeometry(2 * BX + 0.2, 0.06, 2 * BZ + 0.2), kit.mat(0x6d7782), [0, -0.03, 0], pbox).castShadow = false;
  const inst = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; pbox.add(m); return m; };
  const acid = inst(new THREE.SphereGeometry(RA, 12, 8), kit.mat(0xffffff, { roughness: 0.35 }), NA);
  acid.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NA * 3), 3);
  const solid = inst(new THREE.SphereGeometry(RS, 12, 8), kit.mat(0xe9ecef, { roughness: 0.6 }), NS);
  const flashes = [...Array(8)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.life = 0; pbox.add(m); return m; });
  const co2 = [...Array(10)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 6), kit.mat(0x868e96)); m.visible = false; m.castShadow = false; pbox.add(m); return m; });
  let nextFlash = 0, nextCo2 = 0;
  const SOLID = {
    lumps: [...Array(NS)].map((_, i) => [(i % 4 - 1.5) * 0.13, RS + Math.floor(i / 16) * 0.13, (Math.floor(i / 4) % 4 - 1.5) * 0.13]),
    chips: [...Array(NS)].map((_, i) => { const b = Math.floor(i / 8), j = i % 8; return [[-0.52, -0.17, 0.17, 0.52][b % 4] + (j % 2 - 0.5) * 0.13, RS + Math.floor(j / 4) * 0.13, (b < 4 ? -0.22 : 0.22) + (Math.floor(j / 2) % 2 - 0.5) * 0.13]; }),
    // Powder: tiny grains spread through the acid, so every grain can be hit from all sides.
    powder: [...Array(NS)].map((_, i) => [-0.57 + (i % 4) * 0.38 + (Math.floor(i / 16) % 2) * 0.1, RS + 0.03 + Math.floor(i / 16) * 0.17, -0.33 + (Math.floor(i / 4) % 4) * 0.22 + (Math.floor(i / 16) % 2) * 0.06]),
  };
  const PA = new Float32Array(NA * 3), VA = new Float32Array(NA * 3), RANK = new Float32Array(NA), BASE = new Float32Array(NA);
  for (let i = 0; i < NA; i++) {
    PA[i * 3] = (rand(i * 5 + 1) * 2 - 1) * (BX - 0.1); PA[i * 3 + 1] = 0.62 + rand(i * 5 + 2) * 0.5; PA[i * 3 + 2] = (rand(i * 5 + 3) * 2 - 1) * (BZ - 0.1);
    const a = rand(i * 5 + 4) * 6.283, b0 = rand(i * 7 + 9) * 2 - 1, b = Math.sign(b0 || 1) * (0.3 + 0.6 * Math.abs(b0)), s = Math.sqrt(1 - b * b);
    VA[i * 3] = Math.cos(a) * s; VA[i * 3 + 1] = b; VA[i * 3 + 2] = Math.sin(a) * s;
    BASE[i] = 0.55 + 0.6 * rand(i * 13 + 2);
    RANK[i] = (i * 0.6180339887 + 0.1) % 1; // evenly spread, so any number of particles has the same share of energetic ones
  }
  const pv = { arr: 'chips', top: 0, na: 24, hits: 0, wins: 0, hitRate: 0, winRate: 0, acc: 0, pE: 0.08, tScale: 1, spawn: 0 };
  const m4 = new THREE.Matrix4(), cBlue = new THREE.Color(0x4dabf7), cHot = new THREE.Color(0xff7b1c);
  function setSolid(arr) {
    pv.arr = arr; pv.top = 0; pv.hits = pv.wins = 0; pv.acc = 0;
    SOLID[arr].forEach((p, i) => { m4.makeTranslation(p[0], p[1], p[2]); solid.setMatrixAt(i, m4); pv.top = Math.max(pv.top, p[1] + RS); });
    solid.instanceMatrix.needsUpdate = true;
    // Lift any acid particle that is now inside the marble.
    for (let i = 0; i < NA; i++) if (PA[i * 3 + 1] < pv.top + RA) PA[i * 3 + 1] = pv.top + RA + 0.05 + rand(i) * 0.4;
  }
  function setParticles() {
    pv.na = Math.round(24 * st.c);
    pv.pE = Math.min(0.8, 0.08 * Math.pow(2, (st.T - 20) / 10));
    pv.tScale = 1 + (st.T - 20) / 45;
    pv.hits = pv.wins = 0; pv.acc = 0;
    for (let i = 0; i < NA; i++) acid.setColorAt(i, RANK[i] < pv.pE && st.highlight ? cHot : cBlue);
    acid.instanceColor.needsUpdate = true;
  }
  function burst(x, y, z) {
    const f = flashes[nextFlash++ % flashes.length];
    f.position.set(x, y, z); f.life = 1; f.visible = true;
    const b = co2[nextCo2++ % co2.length];
    b.position.set(x, y + 0.05, z); b.visible = true;
  }
  function simParticles(dt) {
    const n = Math.max(1, Math.ceil(dt * 150)), h = dt / n, S = SOLID[pv.arr], D = RA + RS, D2 = D * D;
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < pv.na; i++) {
        const o = i * 3, hotP = RANK[i] < pv.pE, sp = (hotP ? 1.15 + 0.25 * rand(i) : BASE[i]) * 0.75 * pv.tScale;
        PA[o] += VA[o] * sp * h; PA[o + 1] += VA[o + 1] * sp * h; PA[o + 2] += VA[o + 2] * sp * h;
        if (PA[o] < -BX + RA) { PA[o] = -BX + RA; VA[o] = Math.abs(VA[o]); }
        if (PA[o] > BX - RA) { PA[o] = BX - RA; VA[o] = -Math.abs(VA[o]); }
        if (PA[o + 2] < -BZ + RA) { PA[o + 2] = -BZ + RA; VA[o + 2] = Math.abs(VA[o + 2]); }
        if (PA[o + 2] > BZ - RA) { PA[o + 2] = BZ - RA; VA[o + 2] = -Math.abs(VA[o + 2]); }
        if (PA[o + 1] < RA) { PA[o + 1] = RA; VA[o + 1] = Math.abs(VA[o + 1]); }
        if (PA[o + 1] > BH - RA) { PA[o + 1] = BH - RA; VA[o + 1] = -Math.abs(VA[o + 1]); }
        if (PA[o + 1] > pv.top + RA) continue;
        for (let j = 0; j < NS; j++) {
          const dx = PA[o] - S[j][0]; if (dx > D || dx < -D) continue;
          const dy = PA[o + 1] - S[j][1]; if (dy > D || dy < -D) continue;
          const dz = PA[o + 2] - S[j][2], d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= D2 || d2 < 1e-9) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d, vn = VA[o] * nx + VA[o + 1] * ny + VA[o + 2] * nz;
          PA[o] = S[j][0] + nx * D; PA[o + 1] = S[j][1] + ny * D; PA[o + 2] = S[j][2] + nz * D;
          if (vn < 0) {
            VA[o] -= 2 * vn * nx; VA[o + 1] -= 2 * vn * ny; VA[o + 2] -= 2 * vn * nz;
            pv.hits++;
            if (hotP) {
              // The acid particle reacts and is used up; a fresh one drifts in from the top of the box.
              pv.wins++; burst(S[j][0] + nx * RS, S[j][1] + ny * RS, S[j][2] + nz * RS);
              const q = ++pv.spawn;
              PA[o] = (rand(q * 3 + 1) * 2 - 1) * (BX - 0.1); PA[o + 1] = pv.top + RA + 0.1 + rand(q * 3 + 6) * (BH - pv.top - 0.3); PA[o + 2] = (rand(q * 3 + 2) * 2 - 1) * (BZ - 0.1);
              const a2 = rand(q * 3 + 3) * 6.283, b2 = (rand(q * 3 + 5) < 0.5 ? -1 : 1) * (0.4 + 0.5 * rand(q * 3 + 4)), s2 = Math.sqrt(1 - b2 * b2);
              VA[o] = Math.cos(a2) * s2; VA[o + 1] = b2; VA[o + 2] = Math.sin(a2) * s2;
              break;
            }
          }
        }
      }
    }
    pv.acc += dt;
    // Average since the conditions last changed (counts are small, so a longer average reads steadier).
    if (pv.acc >= 1) { pv.hitRate = pv.hits / pv.acc; pv.winRate = pv.wins / pv.acc; }
    for (let i = 0; i < NA; i++) {
      if (i < pv.na) m4.makeTranslation(PA[i * 3], PA[i * 3 + 1], PA[i * 3 + 2]); else m4.makeScale(0, 0, 0);
      acid.setMatrixAt(i, m4);
    }
    acid.instanceMatrix.needsUpdate = true;
    for (const f of flashes) {
      if (!f.visible) continue;
      f.life -= dt * 2.5;
      if (f.life <= 0) { f.visible = false; continue; }
      f.scale.setScalar(0.05 + (1 - f.life) * 0.1); f.material.opacity = f.life;
    }
    for (const b of co2) {
      if (!b.visible) continue;
      b.position.y += dt * 0.5;
      if (b.position.y > BH - 0.05) b.visible = false;
    }
  }

  // ---------- Labels ----------
  const tagFlask = label('Marble + acid', v3(FX - 0.3, 1.2, 0.3));
  const tagSyr = label('Gas syringe', v3(SX + 0.95, SY + 0.32, 0), { cls: 'cool' });
  const tagBath = label('Water bath 20 °C', v3(FX + 0.15, HB + 0.4, 0.8), { cls: 'warm' });
  const tagBox = label('Particle view', v3(PBX, PBY + BH + 0.12, 0), { cls: 'cool' });
  const tagCat = label('MnO₂', v3(FX, HB + 0.25, 0.4));

  // ---------- Run control ----------
  const cWater = new THREE.Color(), cCold = new THREE.Color(0xa5d8ff), cWarm = new THREE.Color(0xffb38a);
  function applyConditions() {
    cWater.copy(cCold).lerp(cWarm, kit.clamp((st.T - 20) / 40, 0, 1));
    if (st.T < 20) cWater.lerp(new THREE.Color(0xe7f5ff), (20 - st.T) / 10);
    bath.setColor(cWater);
    ringMat.emissiveIntensity = kit.clamp((st.T - 22) / 38, 0, 1) * 1.4;
    thermo.set(st.T);
    tagBath.text = `Water bath ${st.T} °C`;
    setParticles();
  }
  function startRun(on = true) {
    run.vmax = st.step === 5 ? PEROX.vmax : VMAX;
    run.k = st.step === 5 ? (st.cat ? PEROX.kOn : PEROX.kOff) : kOf(st.T, st.c, st.sa);
    run.t = 0; run.on = on;
  }
  function showMarble(on) {
    const lay = LAYOUT[st.sa];
    pieces.forEach((m, i) => { m.visible = on && i < lay.length; });
    powderBed.visible = on && st.sa === 'powder';
    mno2.visible = !on && st.cat;
  }
  function drawContents() {
    const left = st.step === 5 ? 1 : 1 - vol(run.vmax, run.k, run.t) / run.vmax;
    if (st.step !== 5) {
      const lay = LAYOUT[st.sa], s = Math.cbrt(Math.max(0, left));
      pieces.forEach((m, i) => {
        if (i >= lay.length) return;
        const [x, y, z, r] = lay[i];
        m.visible = s > 0.06;
        m.scale.setScalar(r * s); m.position.set(x, y * s + 0.012, z);
      });
      powderBed.visible = st.sa === 'powder' && left > 0.04;
      powderBed.scale.set(1, Math.max(0.05, left), 1);
    }
    syr.set(vol(run.vmax, run.k, run.t));
    const r = run.vmax * run.k * Math.exp(-run.k * run.t);
    fizz.tick(st.time, run.t > 0 ? kit.clamp(r / 4, 0, 1) * (r > 0.03 ? 1 : 0) : 0);
  }
  function readout() {
    const V = vol(run.vmax, run.k, run.t), t = Math.min(run.t, TMAX), r0 = run.vmax * run.k, t95 = Math.log(20) / run.k;
    const fin = t95 > 999 ? 'over 15 minutes' : `about ${Math.round(t95)} s`;
    const coll = pv.acc < 1 ? 'Counting collisions…' : `Collisions with the marble: about <b>${pv.hitRate.toFixed(0)}</b> per second, successful: about <b>${pv.winRate.toFixed(1)}</b> per second`;
    let msg = '';
    if (st.step === 0) msg = `Time: <b>${t.toFixed(0)} s</b> · Volume: <b>${V.toFixed(0)} cm³</b>${t >= 1 ? ` · Average rate = ${V.toFixed(0)} ÷ ${t.toFixed(0)} = <b>${(V / t).toFixed(1)} cm³/s</b>` : ''}<br><small>Model values; the clock runs ${SPEED}× faster than real time.</small>`;
    if (st.step === 1) msg = `${coll}<br>Energetic particles: about <b>${Math.round(pv.pE * 100)}%</b> of them`;
    if (st.step >= 2 && st.step <= 4) {
      const what = st.step === 2 ? `Temperature <b>${st.T} °C</b>` : st.step === 3 ? `Acid <b>${st.c.toFixed(2)} mol/L</b>` : `Marble as <b>${SA_NAME[st.sa]}</b>`;
      msg = `${what}: starting rate <b>${r0.toFixed(1)} cm³/s</b>, finished in ${fin} (model)<br>${coll}`;
    }
    if (st.step === 5) msg = `${st.cat ? 'With manganese dioxide' : 'No catalyst'}: <b>${V.toFixed(0)} cm³</b> of oxygen after <b>${t.toFixed(0)} s</b> (model)<br>Manganese dioxide: <b>0.50 g</b> at the start, <b>0.50 g</b> at the end${st.cat ? '' : ' (not added yet)'}`;
    if (st.step === 6) msg = `At <b>${t.toFixed(0)} s</b>: volume <b>${V.toFixed(0)} cm³</b>, rate (gradient) <b>${(run.vmax * run.k * Math.exp(-run.k * run.t)).toFixed(2)} cm³/s</b><br>Starting rate: ${r0.toFixed(1)} cm³/s · final volume: ${run.vmax} cm³`;
    if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
  }

  const allTags = [tagFlask, tagSyr, tagBath, tagBox, tagCat];
  const near = { radius: 1.8, width: 2.75, yaw: 0, pitch: 0.12, target: [0, 1.75, 0] };
  const wide = near;
  setSolid('chips');
  // Let the particles mix for a while before the first frame, so the counts start from a steady state.
  pv.na = NA;
  for (let f = 0; f < 900; f++) simParticles(1 / 60);
  flashes.forEach(f => { f.visible = false; }); co2.forEach(b => { b.visible = false; });
  pv.hits = pv.wins = 0; pv.acc = 0;

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.msg = ''; st.tan = null;
      st.T = 20; st.c = 1; st.sa = 'chips'; st.cat = false; st.highlight = i !== 1;
      allTags.forEach(t => t.show(false));
      pbox.visible = isQuiz || (i >= 1 && i <= 4);
      if (pv.arr !== 'chips') setSolid('chips');
      ghost = null;
      applyConditions();
      startRun(false);
      showMarble(i !== 5);
      if (i === 0) {
        view(near);
        tagFlask.show(true); tagSyr.show(true);
        st.plan = [[0.3, () => startRun()]];
        ui.buttons([{ label: 'Start', onClick: () => { st.plan = []; startRun(); } }, { label: 'Reset', onClick: () => { st.plan = []; startRun(false); } }]);
      }
      if (i === 1) {
        view({ radius: 0.95, yaw: -0.2, pitch: 0.28, target: [PBX, PBY + 0.62, 0] });
        tagBox.show(true);
        const tg = ui.toggle({ label: 'Show energetic particles', value: false, onChange: v => { st.plan = []; st.highlight = v; setParticles(); } });
        st.plan = [[1.2, () => { st.highlight = true; setParticles(); tg.checked = true; }]];
      }
      if (i >= 2 && i <= 4) {
        view(wide);
        tagBox.show(true);
        ghost = { k: kOf(20, 1, 'chips'), vmax: VMAX };
        startRun();
        if (i === 2) {
          tagBath.show(true);
          st.slider = ui.slider({ label: 'Temperature', min: 10, max: 60, step: 5, value: 20, unit: ' °C', onInput: v => { st.plan = []; st.T = v; applyConditions(); startRun(); } });
          st.plan = [[0.2, () => { st.T = 40; st.slider.set(40); applyConditions(); startRun(); }]];
        }
        if (i === 3) {
          tagFlask.show(true);
          st.slider = ui.slider({ label: 'Acid concentration', min: 0.5, max: 2, step: 0.25, value: 1, unit: ' mol/L', format: v => v.toFixed(2), onInput: v => { st.plan = []; st.c = v; applyConditions(); startRun(); } });
          st.plan = [[0.2, () => { st.c = 2; st.slider.set(2); applyConditions(); startRun(); }]];
        }
        if (i === 4) {
          tagFlask.show(true);
          const pick = sa => { st.plan = []; st.sa = sa; setSolid(sa); showMarble(true); startRun(); };
          const row = ui.buttons([{ label: 'Large lumps', onClick: () => pick('lumps') }, { label: 'Small chips', on: true, onClick: () => pick('chips') }, { label: 'Powder', onClick: () => pick('powder') }]);
          st.plan = [[0.2, () => { pick('powder'); row.select(2); }]];
        }
      }
      if (i === 5) {
        view(near);
        tagFlask.text = 'Hydrogen peroxide'; tagFlask.show(true); tagSyr.show(true);
        ghost = { k: PEROX.kOff, vmax: PEROX.vmax };
        startRun();
        const tg = ui.toggle({ label: 'Add manganese dioxide', value: false, onChange: v => { st.plan = []; st.cat = v; showMarble(false); tagCat.show(v); startRun(); } });
        st.plan = [[0.5, () => { st.cat = true; tg.checked = true; showMarble(false); tagCat.show(true); startRun(); }]];
      } else tagFlask.text = 'Marble + acid';
      if (i === 6) {
        view(near);
        tagFlask.show(true);
        st.tan = 20; run.t = 20;
        st.slider = ui.slider({ label: 'Time', min: 0, max: TMAX, step: 1, value: 20, unit: ' s', onInput: v => { st.plan = []; st.sweep = false; st.tan = v; run.t = v; } });
        st.plan = [[0.1, () => {}]];
        st.sweep = true;
      } else st.sweep = false;
      if (isQuiz) {
        view({ ...wide, yaw: -0.15, pitch: 0.18 });
        ghost = { k: kOf(20, 1, 'chips'), vmax: VMAX }; st.sa = 'powder'; setSolid('powder'); showMarble(true);
        run.k = kOf(20, 1, 'powder'); run.t = TMAX;
      }
      st.key = ''; drawContents(); board.redraw(); readout();
    },

    update(dt, t) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step;
      let busy = st.plan.length > 0;
      if (s === 6 && st.sweep) {
        // Demo: sweep the tangent along the curve once, until the learner takes over.
        if (st.plan.length === 0 && st.time < 6) { st.tan = Math.min(TMAX, 20 + st.time * 12); run.t = st.tan; st.slider.set(Math.round(st.tan)); busy = true; }
      }
      if (run.on) {
        run.t += dt * SPEED;
        if (run.t >= TMAX) { run.t = TMAX; run.on = false; }
        busy = true;
      }
      if (pbox.visible && !st.quiz) { simParticles(dt); busy = true; }
      if (s === 6) { st.tan = run.t; }
      if (s >= 0) {
        const key = `${run.t}|${run.k}|${st.tan}|${ghost ? ghost.k : 0}`;
        if (key !== st.key || fizz.mesh.count > 0) { drawContents(); busy = true; }
        if (key !== st.key) { st.key = key; board.redraw(); }
        readout();
      }
      return busy;
    },
  };
}
