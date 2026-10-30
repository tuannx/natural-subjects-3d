// The particle model: the same particles arranged as a solid, a liquid and a gas; heating gives them
// more kinetic energy; a live heating curve for 10 g of ice; diffusion; gas pressure and squashing.
import { particleBox, chartBoard, SOLID, LIQUID, GAS } from '../_shared/particles.js';

const MASS = 10;                                   // grams of water in the heating curve
const C_ICE = 2.1, C_WATER = 4.18, C_STEAM = 2.0;  // J per gram per °C
const L_FUSE = 334, L_VAP = 2260;                  // J per gram
const E1 = MASS * C_ICE * 20;                      // ice from -20 °C to 0 °C
const E2 = E1 + MASS * L_FUSE;                     // all melted
const E3 = E2 + MASS * C_WATER * 100;              // water at 100 °C
const E4 = E3 + MASS * L_VAP;                      // all boiled
const E5 = E4 + MASS * C_STEAM * 20;               // steam at 120 °C
const EMAX = 32000;

// Temperature, melted fraction and boiled fraction after adding energy E (joules) to 10 g of ice at -20 °C.
function heat(E) {
  if (E < E1) return { T: -20 + E / (MASS * C_ICE), melt: 0, boil: 0 };
  if (E < E2) return { T: 0, melt: (E - E1) / (E2 - E1), boil: 0 };
  if (E < E3) return { T: (E - E2) / (MASS * C_WATER), melt: 1, boil: 0 };
  if (E < E4) return { T: 100, melt: 1, boil: (E - E3) / (E4 - E3) };
  return { T: Math.min(120, 100 + (E - E4) / (MASS * C_STEAM)), melt: 1, boil: 1 };
}
const agit = T => 0.45 + 0.9 * (T + 20) / 140;     // how hard the particles jiggle at temperature T
const fmt = v => Math.round(v).toLocaleString('en-US');
const stateName = (T, melt, boil) => (melt < 1 && melt > 0 ? 'melting' : boil > 0 && boil < 1 ? 'boiling' : T < 0 || melt === 0 ? 'solid (ice)' : boil === 1 ? 'gas (steam)' : 'liquid (water)');

const PLOT = { l: 84, r: 24, t: 40, b: 66, w: 512, h: 320 };
const px = E => PLOT.l + (E / EMAX) * (PLOT.w - PLOT.l - PLOT.r);
const py = T => PLOT.t + ((120 - T) / 140) * (PLOT.h - PLOT.t - PLOT.b);

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  kit.stage(scene, { ground: 0xe9dcc6, sky: 0xe3f0fb, radius: 16 }).position.y = -0.1;
  kit.lights(scene, { sun: [4, 9, 6], shadows: false });

  const water = { stateColors: [0xc9ecff, 0x2f86e6, 0x86c9ff], speeds: [0.9, 0.75, 2.6], segs: 10, rings: 7, spacing: 0.26 };
  const A = particleBox(k, { ...water, n: 125, lattice: [5, 5, 5], pos: [-2.1, 0, 0], seed: 3 });
  const B = particleBox(k, { ...water, n: 125, lattice: [5, 5, 5], pos: [0, 0, 0], seed: 5 });
  const C = particleBox(k, { ...water, n: 125, lattice: [5, 5, 5], pos: [2.1, 0, 0], seed: 7 });
  A.agitation = agit(-10); A.reset(SOLID, { seed: 3 });
  B.agitation = agit(50); B.reset(LIQUID, { seed: 5, settle: 2 });
  C.agitation = agit(110); C.reset(GAS, { seed: 7 });

  // Diffusion box: two gases (or liquids) with a divider.
  const Dn = 180, DG = 90;
  const Dx = particleBox(k, { n: Dn, half: 1.3, halfZ: 0.5, height: 1.3, radius: 0.1, speeds: [1, 0.7, 1.1], segs: 10, rings: 7, pos: [0, 0, 0], seed: 9 });
  for (let i = 0; i < Dn; i++) Dx.setColor(i, i % 2 ? 0xe63946 : 0x3a86ff);

  // Cylinder with a piston: air or water.
  const AIR_N = 30, WATER_N = 190;
  const Ex = particleBox(k, { n: WATER_N, shape: 'cylinder', half: 0.5, height: 2.2, radius: 0.09, lid: true, speeds: [1, 0.75, 2.4], segs: 10, rings: 7, pos: [0, 0, 0], seed: 13 });
  Ex.count = WATER_N; Ex.agitation = agit(20); Ex.reset(LIQUID, { seed: 13, settle: 2.5 });
  const Y30 = Ex.surface() + 0.02;                 // the water fills 30 cm3; the air starts with the same volume

  // Thermometer beside the main box.
  const thermo = new THREE.Group();
  thermo.position.set(1.05, 0, 0.3);
  scene.add(thermo);
  const T0 = 0.35, TH = 2.1, tY = T => T0 + ((kit.clamp(T, -20, 120) + 20) / 140) * TH;
  thermo.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, TH + 0.3, 16, 1, true).translate(0, T0 + TH / 2, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })));
  const red = kit.mat(0xe23b2e);
  kit.mesh(new THREE.SphereGeometry(0.14, 16, 10), red, [0, T0 - 0.08, 0], thermo);
  const column = kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 10).translate(0, 0.5, 0), red, [0, T0 - 0.08, 0], thermo);
  for (const T of [0, 100]) kit.mesh(new THREE.BoxGeometry(0.26, 0.02, 0.02), kit.mat(0x1d2b36), [0, tY(T), 0], thermo);

  // Heating-curve board.
  const curve = { E: 0, shown: 0 };
  const board = chartBoard(k, { w: 2.9, h: 1.81, draw: (g, w, h) => drawCurve(g, w, h, curve.shown) });
  board.group.position.set(2.85, 1.25, 0);
  const onBoard = (u, v) => new THREE.Vector3(2.85 + (u / PLOT.w - 0.5) * 2.9, 1.25 + (0.5 - v / PLOT.h) * 1.81, 0.06);

  const tags = {
    solid: label('Solid', new THREE.Vector3(-2.1, 2.65, 0), { cls: 'cool' }),
    liquid: label('Liquid', new THREE.Vector3(0, 2.65, 0), { cls: 'cool' }),
    gas: label('Gas', new THREE.Vector3(2.1, 2.65, 0), { cls: 'cool' }),
    temp: label('', new THREE.Vector3(1.05, 2.7, 0.3), { cls: 'warm' }),
    melt: label('Melting', onBoard(px((E1 + E2) / 2), py(0) - 26)),
    boil: label('Boiling', onBoard(px((E3 + E4) / 2), py(100) - 26)),
    divider: label('Divider', new THREE.Vector3(0, 1.55, 0)),
    piston: label('Piston', new THREE.Vector3(0, 0, 0)),
    inside: label('Air', new THREE.Vector3(0.75, 0.5, 0), { cls: 'cool' }),
  };

  const st = { step: 0, quiz: false, T: 20, mode: 'slider', heating: false, power: 1000, time: 0, redrawAt: 0,
    mixGas: true, removed: false, removeAt: 0, mixTime: 0, fluid: 'air', push: 0, Tair: 20, last: '' };

  function showOnly(...boxes) { for (const b of [A, B, C, Dx, Ex]) b.show(boxes.includes(b)); }
  function hideTags() { for (const t of Object.values(tags)) t.show(false); }

  // Main box follows a temperature (slider mode) or the energy added (heating-curve mode).
  function applyB() {
    let T, melt, boil;
    if (st.mode === 'curve') ({ T, melt, boil } = heat(curve.E));
    else { T = st.T; melt = T < 0 ? 0 : T === 0 ? 0.5 : 1; boil = T < 100 ? 0 : T === 100 ? 0.5 : 1; }
    B.agitation = agit(T);
    B.setCounts(Math.round(B.N * (1 - melt)), Math.round(B.N * boil));
    column.scale.y = tY(T) - T0 + 0.08;
    tags.temp.text = `${Math.round(T)} °C`;
    const hot = kit.clamp((T - 20) / 100, 0, 1), cold = kit.clamp(-T / 20, 0, 1);
    B.plateMat.emissive.setRGB(0.9 * hot, 0.25 * hot, 0.15 * cold);
    return { T, melt, boil };
  }

  function energyBar(T) {
    const n = Math.round(4 + 16 * (T + 20) / 140);
    return `<span style="letter-spacing:-1px;color:#e76f51">${'▮'.repeat(n)}</span><span style="letter-spacing:-1px;color:#cfd8dc">${'▮'.repeat(20 - n)}</span>`;
  }
  function readSlider() {
    const { T, melt, boil } = applyB();
    const what = T < 0 ? 'vibrate in fixed places' : T === 0 ? 'some break free of their places' : T < 100 ? 'are close together but slide past each other' : T === 100 ? 'some escape and fly off' : 'move fast and far apart';
    out(`Temperature: <b>${T} °C</b> · State: <b>${stateName(T, melt, boil)}</b><br>Particles ${what}.<br>Average kinetic energy: ${energyBar(T)}`);
  }
  function readCurve() {
    const { T, melt, boil } = heat(curve.E);
    const s = stateName(T, melt, boil);
    out(`Heater: <b>${fmt(st.power)} W</b> (${fmt(st.power)} J each second) · Time: <b>${st.time.toFixed(1)} s</b><br>Energy added (power × time): <b>${fmt(curve.E)} J</b><br>Temperature: <b>${T.toFixed(0)} °C</b> · ${s}`);
  }
  const out = html => { if (html !== st.last && !st.quiz) { st.last = html; ui.readout(html); } };

  // Diffusion helpers.
  function resetDiffusion() {
    const n = st.mixGas ? DG : Dn;
    Dx.count = n; Dx.wall = true; Dx.divider.visible = true; st.removed = false; st.mixTime = 0;
    for (let i = 0; i < Dn; i++) Dx.state[i] = st.mixGas ? GAS : LIQUID;
    if (st.mixGas) { for (let i = 0; i < n; i++) Dx.scatter(i, i + 1, i % 2 ? -1 : 1); }
    else {
      // Left half red, right half blue: pile each side separately.
      Dx.pile(0, n);
      for (let i = 0; i < n; i++) { const left = Dx.P[i * 3] < 0; Dx.setColor(i, left ? 0xe63946 : 0x3a86ff); }
    }
    if (st.mixGas) for (let i = 0; i < Dn; i++) Dx.setColor(i, i % 2 ? 0xe63946 : 0x3a86ff);
    Dx.agitation = agit(st.T);
    Dx.settle(0.6);
  }
  function mixed() {
    let cross = 0;
    const n = Dx.count;
    for (let i = 0; i < n; i++) {
      const redP = Dx.mesh.instanceColor.array[i * 3] > 0.5, left = Dx.P[i * 3] < 0;
      if (redP !== left) cross++;
    }
    return Math.min(100, Math.round((cross / (n / 2)) * 100));
  }
  function readDiffusion() {
    const m = mixed();
    out(`Temperature: <b>${st.T} °C</b> · ${st.removed ? `Time since the divider was lifted: <b>${st.mixTime.toFixed(1)} s</b>` : 'Divider in place'}<br>Mixed: <b>${m}%</b>${m >= 90 ? ' (fully spread out)' : ''}`);
  }

  // Piston helpers.
  function setFluid(f) {
    st.fluid = f; st.push = 0;
    Ex.count = f === 'air' ? AIR_N : WATER_N;
    for (let i = 0; i < WATER_N; i++) { Ex.state[i] = f === 'air' ? GAS : LIQUID; Ex.setColor(i, f === 'air' ? 0x9be7c4 : 0x2f86e6); }
    Ex.top = Y30;
    Ex.agitation = agit(st.Tair);
    if (f === 'air') Ex.scatter(0, AIR_N); else Ex.pile(0, WATER_N);
    Ex.settle(f === 'air' ? 0.5 : 2);
    tags.inside.text = f === 'air' ? 'Air' : 'Water';
  }
  function readPiston() {
    const V = st.fluid === 'air' ? 30 - st.push : 30;
    const p = st.fluid === 'air' ? (100 * 30 / V) * (st.Tair + 273) / 293 : null;
    if (st.step === 5) out(`Temperature: <b>${st.Tair} °C</b> · Volume: <b>30 cm³</b><br>Pressure: <b>about ${fmt(p)} kPa</b> · Hits on the piston (model): <b>${fmt(Ex.hits)}</b> per second`);
    else if (st.fluid === 'air') out(`Air · Volume: <b>${V} cm³</b> · Pressure: <b>about ${fmt(p)} kPa</b><br>Pressure × volume = ${fmt(p * V)} (stays the same)`);
    else out(`Water · Volume: <b>30 cm³</b> however hard you push.<br>The particles are already touching, so the piston ${st.push > 0 ? '<b>will not move</b>' : 'rests on the water'}.`);
  }

  const OVER = { radius: 2.6, width: 3.1, yaw: 0, pitch: 0.2, target: [0, 1.25, 0] };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.quiz = isQuiz; st.last = ''; st.heating = false;
      hideTags(); thermo.visible = false; board.group.visible = false;
      B.plateMat.emissive.setRGB(0, 0, 0);
      if (i === 0 || isQuiz) {
        showOnly(A, B, C);
        A.agitation = agit(-10); A.setCounts(125, 0);
        B.agitation = agit(50); st.mode = 'fixed'; B.setCounts(0, 0);
        C.agitation = agit(110); C.setCounts(0, 125);
        go(isQuiz ? { ...OVER, yaw: -0.25, pitch: 0.3 } : OVER);
        if (!isQuiz) {
          tags.solid.show(true); tags.liquid.show(true); tags.gas.show(true);
          const info = {
            solid: ['Solid', 'Particles are packed in a regular pattern and <b>vibrate in fixed places</b>. A solid keeps its shape and its volume.', { radius: 1.6, yaw: 0.25, pitch: 0.25, target: [-2.1, 1, 0] }],
            liquid: ['Liquid', 'Particles are close together but <b>slide past each other</b>. A liquid flows and takes the shape of its container, but keeps its volume.', { radius: 1.6, yaw: 0.25, pitch: 0.25, target: [0, 1, 0] }],
            gas: ['Gas', 'Particles are <b>far apart and move fast</b> in all directions. A gas spreads out to fill the whole container.', { radius: 1.6, yaw: -0.25, pitch: 0.25, target: [2.1, 1.2, 0] }],
          };
          const pick = key => { const [, txt, cam] = info[key]; ui.readout(txt); view(cam); };
          ui.buttons([{ label: 'All three', on: true, onClick: () => { ui.readout('The same 125 water particles in each box. Only their arrangement and movement are different.'); view(OVER); } },
            ...Object.keys(info).map(key => ({ label: info[key][0], onClick: () => pick(key) }))]);
          ui.readout('The same 125 water particles in each box. Only their arrangement and movement are different.');
        }
      }
      if (i === 1) {
        showOnly(B); thermo.visible = true; tags.temp.show(true);
        st.mode = 'slider'; st.T = 20;
        go({ radius: 1.7, yaw: 0.35, pitch: 0.2, target: [0.3, 1.25, 0] });
        ui.slider({ label: 'Temperature', min: -20, max: 120, step: 1, value: 20, unit: ' °C', onInput: v => { st.T = v; readSlider(); } });
        readSlider();
      }
      if (i === 2 || i === 3) {
        showOnly(B); thermo.visible = true; board.group.visible = true; tags.temp.show(true);
        st.mode = 'curve';
        if (i === 2) {
          curve.E = 0; curve.shown = 0; st.time = 0; st.heating = true; st.power = 1000;
          go({ radius: 2.1, width: 2.85, yaw: 0, pitch: 0.12, target: [1.75, 1.25, 0] });
          const row = ui.buttons([{ label: 'Heat', on: true, onClick: () => { st.heating = true; } }, { label: 'Pause', onClick: () => { st.heating = false; } },
            { label: 'Start again', onClick: () => { curve.E = 0; curve.shown = 0; st.time = 0; st.heating = true; row.select(0); board.redraw(); } }]);
          ui.slider({ label: 'Heater power', min: 200, max: 2000, step: 100, value: 1000, unit: ' W', format: fmt, onInput: v => { st.power = v; } });
          applyB(); board.redraw(); readCurve();
        } else {
          curve.shown = E5; curve.E = (E1 + E2) / 2;
          go({ radius: 2.1, width: 2.85, yaw: 0, pitch: 0.12, target: [1.75, 1.25, 0] });
          tags.melt.show(true); tags.boil.show(true);
          const pts = [
            ['Ice warming', E1 / 2, 'Below 0 °C the energy makes the ice particles <b>vibrate harder</b>, so the temperature rises.'],
            ['Melting', (E1 + E2) / 2, 'At 0 °C the energy breaks particles out of their fixed places. Melting 10 g of ice takes <b>about 3,340 J</b>, and the temperature stays at 0 °C.'],
            ['Water warming', (E2 + E3) / 2, 'Now the energy makes the water particles <b>move faster</b>, so the temperature rises again, from 0 °C to 100 °C.'],
            ['Boiling', (E3 + E4) / 2, 'At 100 °C the energy pulls particles right away from each other. Boiling away 10 g of water takes <b>about 22,600 J</b>: almost 7 times as much as melting.'],
          ];
          const pick = j => { curve.E = pts[j][1]; applyB(); board.redraw(); ui.readout(pts[j][2]); };
          ui.buttons(pts.map((p, j) => ({ label: p[0], on: j === 1, onClick: () => pick(j) })));
          pick(1);
        }
      }
      if (i === 4) {
        showOnly(Dx); tags.divider.show(true);
        st.T = 20; st.mixGas = true;
        go({ radius: 1.7, width: 1.5, yaw: 0.2, pitch: 0.35, target: [0, 0.65, 0] });
        resetDiffusion(); st.removeAt = 1.2;
        const lift = () => { st.removed = true; st.removeAt = 0; Dx.wall = false; tags.divider.show(false); };
        ui.buttons([{ label: 'Lift the divider', onClick: lift },
          { label: 'Start again', onClick: () => { resetDiffusion(); tags.divider.show(true); st.removeAt = 0; } }]);
        ui.buttons([{ label: 'Two gases', on: true, onClick: () => { st.mixGas = true; resetDiffusion(); tags.divider.show(true); st.removeAt = 0; } },
          { label: 'Two liquids', onClick: () => { st.mixGas = false; resetDiffusion(); tags.divider.show(true); st.removeAt = 0; } }]);
        ui.slider({ label: 'Temperature', min: 0, max: 100, step: 5, value: 20, unit: ' °C', onInput: v => { st.T = v; Dx.agitation = agit(v); } });
        readDiffusion();
      }
      if (i === 5 || i === 6) {
        showOnly(Ex); tags.piston.show(true); tags.inside.show(true);
        st.Tair = 20; st.autoT = 0; st.autoPush = false; setFluid('air');
        go({ radius: 1.55, yaw: 0.3, pitch: 0.2, target: [0, 1.25, 0] });
        if (i === 5) {
          ui.slider({ label: 'Temperature of the air', min: 0, max: 100, step: 5, value: 20, unit: ' °C', onInput: v => { st.Tair = v; Ex.agitation = agit(v); } });
        } else {
          const slider = ui.slider({ label: 'Push the piston in', min: 0, max: 20, step: 1, value: 0, unit: ' cm³', onInput: v => { st.push = v; } });
          ui.buttons([{ label: 'Air', on: true, onClick: () => { st.autoPush = false; setFluid('air'); slider.set(0); } }, { label: 'Water', onClick: () => { st.autoPush = false; setFluid('water'); slider.set(0); } }]);
          st.autoPush = true;
          slider.addEventListener('input', () => { st.autoPush = false; });
          st.pushSlider = slider;
        }
        readPiston();
      }
    },

    update(dt) {
      if (st.step === 0 || st.quiz) { A.step(dt); B.step(dt); C.step(dt); return true; }
      if (st.step === 1) { B.step(dt); return true; }
      if (st.step === 2) {
        if (st.heating && curve.E < E5) {
          curve.E = Math.min(E5, curve.E + st.power * dt); st.time += dt; curve.shown = curve.E;
          st.redrawAt -= dt;
          if (st.redrawAt <= 0 || curve.E >= E5) { board.redraw(); st.redrawAt = 0.08; }
        }
        const { T } = applyB();
        if (st.heating && curve.E < E5) B.plateMat.emissive.setRGB(0.95, 0.3, 0.05);
        else if (T >= 0) B.plateMat.emissive.setRGB(0, 0, 0);
        readCurve();
        B.step(dt);
        return true;
      }
      if (st.step === 3) { B.step(dt); return true; }
      if (st.step === 4) {
        if (!st.removed && st.removeAt > 0) {
          st.removeAt -= dt;
          if (st.removeAt <= 0) { st.removed = true; Dx.wall = false; tags.divider.show(false); }
        }
        if (st.removed) st.mixTime += dt;
        Dx.step(dt);
        readDiffusion();
        return true;
      }
      if (st.step === 5 || st.step === 6) {
        if (st.step === 6 && st.autoPush && st.fluid === 'air') {
          // Demo: push the piston in slowly until someone takes over.
          st.autoT = (st.autoT || 0) + dt;
          const v = Math.min(15, Math.floor(st.autoT * 5));
          if (v !== st.push) { st.push = v; st.pushSlider.set(v); }
        }
        const want = st.fluid === 'air' ? Y30 * (30 - st.push) / 30 : Y30;
        kit.follow(Ex, 'top', want, dt, 4);
        tags.piston.at.set(0.35, Ex.top + 0.25, 0);
        tags.inside.at.set(0.75, Math.min(Ex.top * 0.5, 0.6), 0);
        Ex.step(dt);
        readPiston();
        return true;
      }
      return false;
    },
  };

  function drawCurve(g, w, h, upTo) {
    g.fillStyle = '#fbfdff'; g.fillRect(0, 0, w, h);
    const x0 = PLOT.l, x1 = w - PLOT.r, y0 = PLOT.t, y1 = h - PLOT.b;
    g.font = 'bold 26px system-ui, sans-serif';
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (const T of [-20, 0, 50, 100, 120]) {
      const y = py(T);
      g.strokeStyle = T === 0 || T === 100 ? '#9fb8cc' : '#e3ebf1'; g.lineWidth = T === 0 || T === 100 ? 2 : 1;
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      if (T !== 120) { g.fillStyle = '#37474f'; g.fillText(String(T), x0 - 8, y); }
    }
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (const E of [0, 10000, 20000, 30000]) { g.fillStyle = '#37474f'; g.fillText(String(E / 1000), px(E), y1 + 6); }
    g.fillText('Energy added (kJ)', (x0 + x1) / 2, y1 + 34);
    g.textAlign = 'left'; g.fillText('Temperature (°C)', 8, 4);
    g.strokeStyle = '#37474f'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y1); g.lineTo(x1, y1); g.stroke();
    if (upTo <= 0) return;
    g.strokeStyle = '#e63946'; g.lineWidth = 5; g.lineJoin = 'round';
    // Temperature is a straight line between the corners, so joining the corners draws it exactly.
    g.beginPath(); g.moveTo(px(0), py(-20));
    for (const E of [E1, E2, E3, E4, E5]) { const e = Math.min(E, upTo); g.lineTo(px(e), py(heat(e).T)); if (E >= upTo) break; }
    g.stroke();
    const cur = curve.E;
    g.fillStyle = '#1d3557';
    g.beginPath(); g.arc(px(cur), py(heat(cur).T), 8, 0, Math.PI * 2); g.fill();
  }
}
