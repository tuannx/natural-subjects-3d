// Electric circuits (grades 8–9): real parts next to their circuit symbols, current as moving charge with an
// ammeter in series, voltage with a voltmeter in parallel, Ohm's law I = U / R with a power supply and an
// I–U graph, series and parallel circuits (unscrew a bulb), total resistance, and a short circuit that blows
// a fuse. Each circuit is a board built once and shown only in its steps. Bulbs are treated as fixed
// resistances (a real filament's resistance grows as it heats up). Blue dots are electrons, which drift from
// the − terminal round to the + terminal; the yellow arrows show the agreed current direction (+ to −).
import { panel, drawGraph } from '../_shared/lab.js';
import { wire, polyPath, chargeDots, battery, bulb, meter, knifeSwitch, fuse, drawSchematic } from '../_shared/circuit.js';

const WY = 0.45;                 // wire height above the ground (board top is 0.3)
const CELL_V = 1.5;              // volts per cell
const R_BULB = 10;               // ohms, one bulb (model)
const P_REF = 3.6;               // W: one bulb on 6 V, shown as "full" brightness
const R_SHORT = 0.5;             // ohms left in a short circuit: wires + the battery itself (model)
const FUSE_A = 2;                // fuse rating, amperes
const glow = P => Math.sqrt(Math.max(0, P) / P_REF);
const f2 = v => v.toFixed(2), f1 = v => v.toFixed(1);
const ohm = v => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));
const PART_INFO = [
  { name: 'Cell', text: 'A <b>cell</b> pushes charge round the circuit. Symbol: a long line (+) and a short line (−). Several cells together make a <b>battery</b>.' },
  { name: 'Switch', text: 'A <b>switch</b> opens or closes the circuit. Symbol: a gap with a lever. Open switch: no current.' },
  { name: 'Bulb', text: 'A <b>bulb</b> (lamp) turns electrical energy into light and heat. Symbol: a circle with a cross.' },
  { name: 'Wires', text: '<b>Wires</b> (conductors) join the parts into one complete loop. Symbol: straight lines.' },
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xd9e4d1, sky: 0xe3f0fa, radius: 30 });
  const sun = kit.lights(scene, { sun: [4, 10, 7] });
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  const clamp = kit.clamp;
  const boardMat = kit.mat(0xe2c79c, { roughness: 0.85 });
  const boards = [];
  function makeBoard(w, d, cz = 0) {
    const g = new THREE.Group(); g.visible = false; scene.add(g); boards.push(g);
    const b = kit.mesh(new THREE.BoxGeometry(w, 0.1, d), boardMat, [0, 0.25, cz], g);
    b.castShadow = false;
    return g;
  }
  const put = (parent, obj, x, z, ry = 0) => { obj.position.set(x, WY, z); obj.rotation.y = ry; parent.add(obj); return obj; };
  const leadColor = 0x2b2f36;
  const anchorAt = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const junction = (parent, x, z) => kit.mesh(new THREE.SphereGeometry(0.07, 10, 8), kit.mat(0xd1453b), [x, WY, z], parent);
  const dotsOf = (parent, pts) => { const d = chargeDots(THREE, polyPath(pts), { spacing: 0.3, radius: 0.06, color: 0x2f80ed }); d.position.y = 0.0; parent.add(d); return d; };
  const speed = I => Math.min(6, 1.8 * I);
  const labels = [];
  const tag = (text, at, cls) => { const l = label(text, at, { cls }); labels.push(l); return l; };

  // ======================= Board A: one loop (steps 0–3) =======================
  const A = makeBoard(5.6, 4.7, 0.5);
  const loopA = [[0, WY, -1.2], [2.2, WY, -1.2], [2.2, WY, 1.2], [-2.2, WY, 1.2], [-2.2, WY, -1.2]];
  const wireA = wire(THREE, loopA, { closed: true }); A.add(wireA);
  const battA = put(A, battery(THREE, kit, { slots: 4 }), 0, -1.2);
  const supply = put(A, powerSupply(), 0, -1.2);
  const swA = put(A, knifeSwitch(THREE, kit), -2.2, 0, Math.PI / 2);
  const ammA = put(A, meter(THREE, kit, 'A'), -1.0, 1.2);
  const bulbA = put(A, bulb(THREE, kit), 0.9, 1.2);
  const voltA = put(A, meter(THREE, kit, 'V'), 0.9, 2.2);
  const leadsA = new THREE.Group(); A.add(leadsA);
  leadsA.add(wire(THREE, [[0.5, WY, 1.2], [0.5, WY, 2.2], [0.55, WY, 2.2]], { color: leadColor, radius: 0.025 }));
  leadsA.add(wire(THREE, [[1.3, WY, 1.2], [1.3, WY, 2.2], [1.25, WY, 2.2]], { color: leadColor, radius: 0.025 }));
  const jA = [junction(leadsA, 0.5, 1.2), junction(leadsA, 1.3, 1.2)];
  const dotsA = dotsOf(A, loopA);
  // Arrows for the agreed current direction (+ to −), along the loop.
  const arrows = new THREE.Group(); A.add(arrows);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
  const upY = new THREE.Vector3(0, 1, 0), dirTmp = new THREE.Vector3();
  for (const [x, z, dx, dz] of [[1.4, -1.2, 1, 0], [2.2, -0.2, 0, 1], [2.2, 0.7, 0, 1], [0.0, 1.2, -1, 0], [-1.9, 1.2, -1, 0], [-2.2, -0.75, 0, -1]]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 12), arrowMat);
    c.position.set(x, WY + 0.17, z);
    c.quaternion.setFromUnitVectors(upY, dirTmp.set(dx, 0, dz));
    arrows.add(c);
  }
  // Schematic and graph boards behind the circuit.
  const sch = panel(THREE, 4.2, 2.4, { px: 512 });
  sch.position.set(0, 1.75, -2.05); sch.rotation.x = -0.3; A.add(sch);
  const graph = panel(THREE, 4.2, 2.6, { px: 512 });
  graph.position.set(0, 1.85, -2.1); graph.rotation.x = -0.3; A.add(graph);
  const ammATag = tag('', ammA.anchor, 'cool'), voltATag = tag('', voltA.anchor, 'warm');
  const partTag = tag('', anchorAt(A, 0, 0, 0));
  const PART_AT = [[0, 0.9, -1.2], [-2.2, 0.95, 0], [0.9, 1.55, 1.2], [2.2, 0.75, 0.2]];

  // ======================= Board C: series =======================
  const C = makeBoard(6.4, 4.7, 0.5);
  const loopC = [[0.6, WY, -1.2], [2.6, WY, -1.2], [2.6, WY, 1.2], [-2.6, WY, 1.2], [-2.6, WY, -1.2]];
  C.add(wire(THREE, loopC, { closed: true }));
  put(C, battery(THREE, kit, { slots: 4 }), 0.6, -1.2);
  const ammC1 = put(C, meter(THREE, kit, 'A'), -1.75, -1.2);
  const bulbC1 = put(C, bulb(THREE, kit), -1.5, 1.2);
  const ammC2 = put(C, meter(THREE, kit, 'A'), 0, 1.2);
  const bulbC2 = put(C, bulb(THREE, kit), 1.5, 1.2);
  const voltsC = new THREE.Group(); C.add(voltsC);
  const voltC1 = put(voltsC, meter(THREE, kit, 'V'), -1.5, 2.2), voltC2 = put(voltsC, meter(THREE, kit, 'V'), 1.5, 2.2);
  for (const x of [-1.5, 1.5]) {
    voltsC.add(wire(THREE, [[x - 0.4, WY, 1.2], [x - 0.4, WY, 2.2], [x - 0.35, WY, 2.2]], { color: leadColor, radius: 0.025 }));
    voltsC.add(wire(THREE, [[x + 0.4, WY, 1.2], [x + 0.4, WY, 2.2], [x + 0.35, WY, 2.2]], { color: leadColor, radius: 0.025 }));
    junction(voltsC, x - 0.4, 1.2); junction(voltsC, x + 0.4, 1.2);
  }
  const dotsC = dotsOf(C, loopC);
  const c1Tag = tag('', ammC1.anchor, 'cool'), c2Tag = tag('', ammC2.anchor, 'cool');
  const v1Tag = tag('', voltC1.anchor, 'warm'), v2Tag = tag('', voltC2.anchor, 'warm');
  const rC1Tag = tag('', bulbC1.anchor), rC2Tag = tag('', bulbC2.anchor);

  // ======================= Board D: parallel =======================
  const D = makeBoard(6.4, 3.8, 0);
  const XB = -2.6, X1 = 0, X2 = 2.6, ZB = -1.3, ZF = 1.3;
  const loopD1 = [[XB, WY, 0], [XB, WY, ZB], [X1, WY, ZB], [X1, WY, ZF], [XB, WY, ZF]];
  const loopD2 = [[XB, WY, 0], [XB, WY, ZB], [X2, WY, ZB], [X2, WY, ZF], [XB, WY, ZF]];
  D.add(wire(THREE, loopD2, { closed: true }));
  D.add(wire(THREE, [[X1, WY, ZB], [X1, WY, ZF]]));
  junction(D, X1, ZB); junction(D, X1, ZF);
  put(D, battery(THREE, kit, { slots: 4, cell: 0.55 }), XB, 0, Math.PI / 2);
  const ammD = put(D, meter(THREE, kit, 'A'), -1.3, ZB);
  const ammD2 = put(D, meter(THREE, kit, 'A'), 1.3, ZB);
  const ammD1 = put(D, meter(THREE, kit, 'A'), X1, -0.45, -Math.PI / 2);
  const bulbD1 = put(D, bulb(THREE, kit), X1, 0.6, Math.PI / 2);
  const bulbD2 = put(D, bulb(THREE, kit), X2, 0.3, Math.PI / 2);
  const dotsD1 = dotsOf(D, loopD1), dotsD2 = dotsOf(D, loopD2);
  const dTag = tag('', ammD.anchor, 'cool'), d1Tag = tag('', ammD1.anchor, 'cool'), d2Tag = tag('', ammD2.anchor, 'cool');
  const rD1Tag = tag('', bulbD1.anchor), rD2Tag = tag('', bulbD2.anchor);

  // ======================= Board E: fuse and short circuit =======================
  const E = makeBoard(5.6, 4.2, 0.4);
  const loopE = [[0, WY, -1.2], [2.2, WY, -1.2], [2.2, WY, 1.2], [-2.2, WY, 1.2], [-2.2, WY, -1.2]];
  const shortE = [[0, WY, -1.2], [2.2, WY, -1.2], [2.2, WY, 1.2], [1.35, WY, 1.2], [1.35, WY, 1.85], [0.45, WY, 1.85], [0.45, WY, 1.2], [-2.2, WY, 1.2], [-2.2, WY, -1.2]];
  E.add(wire(THREE, loopE, { closed: true }));
  put(E, battery(THREE, kit, { slots: 4 }), 0, -1.2);
  const ammE = put(E, meter(THREE, kit, 'A'), -1.75, -1.2);
  const fuseE = put(E, fuse(THREE, kit), -1.2, 1.2);
  const bulbE = put(E, bulb(THREE, kit), 0.9, 1.2);
  const bypass = wire(THREE, [[0.45, WY, 1.2], [0.45, WY, 1.85], [1.35, WY, 1.85], [1.35, WY, 1.2]], { color: 0xc77b30, radius: 0.05 });
  E.add(bypass);
  const dotsE = dotsOf(E, loopE), dotsES = dotsOf(E, shortE);
  const eTag = tag('', ammE.anchor, 'cool'), fuseTag = tag('Fuse (2 A)', fuseE.anchor, 'warm');
  const shortTag = tag('Short circuit!', anchorAt(E, 0.9, WY + 0.45, 1.9), 'warm');

  // ======================= state =======================
  const st = { step: 0, quiz: false, t: 0, plan: [], cells: 2, closed: false, U: 6, R: 12, out1: 0, out1To: 0, mode: 'series', R1: 10, R2: 20,
    part: 0, partAuto: true, short: false, drop: 1, heat: 0, blown: false, overT: 0, I: { A: 0, C: 0, D1: 0, D2: 0, E: 0 } };
  const showBoard = b => boards.forEach(x => { x.visible = x === b; });

  // ---------- board A ----------
  function solveA() {
    const useSupply = st.step === 3;
    const U = useSupply ? st.U : st.cells * CELL_V, R = useSupply ? st.R : R_BULB;
    const I = st.closed ? U / R : 0;
    st.I.A = I;
    ammA.set(f2(I)); voltA.set(f1(I > 0 ? U : 0));
    ammATag.text = `${f2(I)} A`; voltATag.text = `U = ${f1(I > 0 ? U : 0)} V`;
    bulbA.set(glow(U * I));
    supply.set(U);
    swA.set(st.closed);
    if (st.step <= 2) drawSch();
    if (useSupply) drawOhmGraph(U, R, I);
    return { U, R, I };
  }
  function drawSch() {
    const s = st.step, hl = s === 0 ? st.part : -1;
    const parts = [
      { type: 'battery', n: s === 2 ? st.cells : 2, x: 256, y: 62, hl: hl === 0 },
      { type: 'switch', x: 90, y: 128, rot: 1, open: !st.closed, hl: hl === 1 },
      { type: 'lamp', x: 340, y: 194, on: st.closed, hl: hl === 2 },
    ];
    const lines = [[90, 62, 422, 62], [422, 62, 422, 194], [422, 194, 90, 194], [90, 194, 90, 62]];
    const dots = [];
    if (s >= 1) parts.push({ type: 'ammeter', x: 190, y: 194 });
    if (s === 2) {
      parts.push({ type: 'voltmeter', x: 340, y: 262 });
      lines.push([302, 194, 302, 262], [302, 262, 378, 262], [378, 262, 378, 194]);
      dots.push([302, 194], [378, 194]);
    }
    sch.draw((ctx, W, H) => drawSchematic(ctx, W, H, { parts, lines, dots, lineInk: hl === 3 ? '#e8590c' : null, title: 'Circuit diagram' }));
  }
  function drawOhmGraph(U, R, I) {
    graph.draw((ctx, W, H) => drawGraph(ctx, W, H, {
      xMax: 12, yMax: 3, xStep: 2, yStep: 0.5, xLabel: 'Voltage U (V)', yLabel: 'Current I (A)', title: `I = U / R   (R = ${R} Ω)`,
      series: [{ color: '#1f7ae0', pts: [[0, 0], [12, 12 / R]] }, { color: '#e8590c', pts: [[U, I]], dots: 10, line: false }],
    }));
  }
  function readA() {
    const { U, I } = solveA();
    if (st.step === 1) ui.readout(st.closed ? `Switch closed: current flows.<br>Ammeter: I = <b>${f2(I)} A</b>` : 'Switch open: the loop is broken, so <b>no current</b> flows. Ammeter: <b>0.00 A</b>');
    if (st.step === 2) ui.readout(`${st.cells} cell${st.cells > 1 ? 's' : ''} × 1.5 V = voltage (U) <b>${f1(U)} V</b><br>Voltmeter across the bulb: <b>${f1(U)} V</b> · Ammeter: <b>${f2(I)} A</b>`);
    if (st.step === 3) ui.readout(`I = U / R = ${f1(st.U)} V ÷ ${st.R} Ω = <b>${f2(I)} A</b><br>Voltmeter <b>${f1(st.U)} V</b> · Ammeter <b>${f2(I)} A</b>`);
  }
  function setPart(i) {
    st.part = i;
    partTag.at.position.set(...PART_AT[i]);
    partTag.text = PART_INFO[i].name;
    wireA.material.emissive.setHex(i === 3 ? 0x993300 : 0);
    ui.readout(PART_INFO[i].text);
    drawSch();
  }

  // ---------- board C (series) ----------
  function solveC() {
    const U = 4 * CELL_V, R = st.R1 + st.R2, broken = st.out1To > 0;
    const I = broken ? 0 : U / R;
    st.I.C = I;
    const U1 = broken ? U : I * st.R1, U2 = I * st.R2;
    ammC1.set(f2(I)); ammC2.set(f2(I)); voltC1.set(f1(U1)); voltC2.set(f1(U2));
    c1Tag.text = `${f2(I)} A`; c2Tag.text = `${f2(I)} A`; v1Tag.text = `U₁ = ${f1(U1)} V`; v2Tag.text = `U₂ = ${f1(U2)} V`;
    rC1Tag.text = `R₁ = ${st.R1} Ω`; rC2Tag.text = `R₂ = ${st.R2} Ω`;
    bulbC1.set(broken ? 0 : glow(I * I * st.R1)); bulbC2.set(glow(I * I * st.R2));
    return { U, R, I, U1, U2, broken };
  }
  // ---------- board D (parallel) ----------
  function solveD() {
    const U = 4 * CELL_V, broken = st.out1To > 0;
    const I1 = broken ? 0 : U / st.R1, I2 = U / st.R2, I = I1 + I2;
    st.I.D1 = I1; st.I.D2 = I2;
    ammD.set(f2(I)); ammD1.set(f2(I1)); ammD2.set(f2(I2));
    dTag.text = `I = ${f2(I)} A`; d1Tag.text = `I₁ = ${f2(I1)} A`; d2Tag.text = `I₂ = ${f2(I2)} A`;
    rD1Tag.text = `R₁ = ${st.R1} Ω`; rD2Tag.text = `R₂ = ${st.R2} Ω`;
    bulbD1.set(glow(I1 * I1 * st.R1)); bulbD2.set(glow(I2 * I2 * st.R2));
    return { U, I, I1, I2, broken };
  }
  function readSeries() {
    const { U, I, U1, U2, broken } = solveC();
    ui.readout(broken
      ? 'Bulb 1 is out, so the only path is broken. <b>Both bulbs go out</b> and both ammeters read <b>0.00 A</b>.'
      : `Same current everywhere: I = <b>${f2(I)} A</b><br>U₁ + U₂ = ${f1(U1)} V + ${f1(U2)} V = <b>${f1(U)} V</b> (the battery's voltage)`);
  }
  function readParallel() {
    const { U, I, I1, I2, broken } = solveD();
    ui.readout(`Each bulb gets the full <b>${f1(U)} V</b>.<br>I = I₁ + I₂ = ${f2(I1)} A + ${f2(I2)} A = <b>${f2(I)} A</b>`
      + (broken ? '<br>Bulb 1 is out, but bulb 2 <b>stays on</b>.' : ''));
  }
  function readTotal() {
    const U = 4 * CELL_V;
    if (st.mode === 'series') {
      const { I } = solveC(), R = st.R1 + st.R2;
      ui.readout(`Series: R = R₁ + R₂ = ${st.R1} + ${st.R2} = <b>${R} Ω</b><br>I = U / R = ${f1(U)} V ÷ ${R} Ω = <b>${f2(I)} A</b>`);
    } else {
      const { I } = solveD(), R = 1 / (1 / st.R1 + 1 / st.R2);
      ui.readout(`Parallel: 1/R = 1/R₁ + 1/R₂ = 1/${st.R1} + 1/${st.R2}<br>R = <b>${ohm(R)} Ω</b> (less than either bulb) · I = U / R = <b>${f2(I)} A</b>`);
    }
  }

  // ---------- board E (fuse) ----------
  function solveE() {
    const U = 4 * CELL_V;
    const I = st.blown ? 0 : st.short && st.drop <= 0 ? U / R_SHORT : U / R_BULB;
    st.I.E = I;
    ammE.set(I >= 10 ? f1(I) : f2(I)); eTag.text = `${I >= 10 ? f1(I) : f2(I)} A`;
    bulbE.set(st.blown || (st.short && st.drop <= 0) ? 0 : glow(U * I));
    fuseE.set(st.heat, st.blown);
    return I;
  }
  function readE() {
    const I = solveE();
    if (st.blown) ui.readout(`<b>The fuse has blown.</b> Its thin wire melted, so the circuit is broken and the current is <b>0 A</b> before the wires can overheat.`);
    else if (st.short && st.drop <= 0) ui.readout(`<b>Short circuit!</b> The current takes the easy path round the bulb. Only about ${R_SHORT} Ω is left (wires and battery), so I ≈ 6 V ÷ ${R_SHORT} Ω = <b>${Math.round(I)} A</b> (model). The fuse is rated ${FUSE_A} A…`);
    else ui.readout(`Normal: I = U / R = 6 V ÷ 10 Ω = <b>${f2(I)} A</b>. That is below the fuse's rating of ${FUSE_A} A, so the fuse stays cool.`);
  }
  function startShort() { if (st.short || st.blown) return; st.short = true; st.drop = 1; }
  function resetFuse() { st.short = false; st.blown = false; st.heat = 0; st.drop = 1; st.overT = 0; readE(); }

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.t = 0; st.plan = [];
      for (const l of labels) l.show(false);
      st.out1 = st.out1To = 0; bulbC1.out(false); bulbD1.out(false);
      st.R1 = 10; st.R2 = 20;
      if (i <= 3) {
        showBoard(A);
        const useSupply = i === 3;
        battA.visible = !useSupply; supply.visible = useSupply;
        sch.visible = i <= 2; graph.visible = useSupply;
        ammA.visible = i >= 1; ammATag.show(i >= 1);
        voltA.visible = leadsA.visible = i >= 2; voltATag.show(i >= 2);
        arrows.visible = i === 1;
        swA.visible = i <= 2;
        wireA.material.emissive.setHex(0);
        st.cells = 2;
        battA.setCells(st.cells);
      }
      if (i === 0) {
        view({ radius: 3.2, width: 3.2, yaw: 0, pitch: 0.62, target: [0, 0.9, -0.2] });
        st.closed = false; partTag.show(true); st.partAuto = true;
        const row = ui.buttons(PART_INFO.map((p, j) => ({ label: p.name, on: j === 0, onClick: () => { st.partAuto = false; setPart(j); } })));
        st.partRow = row;
        ui.toggle({ label: 'Close the switch', value: false, onChange: v => { st.closed = v; solveA(); } });
        solveA(); setPart(0);
      }
      if (i === 1) {
        view({ radius: 3.2, width: 3.2, yaw: 0, pitch: 0.62, target: [0, 0.9, -0.2] });
        st.closed = false;
        const tg = ui.toggle({ label: 'Switch closed', value: false, onChange: v => { st.plan = []; st.closed = v; readA(); } });
        st.plan = [[1.0, () => { st.closed = true; tg.checked = true; readA(); }]];
        readA();
      }
      if (i === 2) {
        view({ radius: 3.2, width: 3.2, yaw: 0, pitch: 0.65, target: [0, 0.9, 0.0] });
        st.closed = true;
        ui.slider({ label: 'Number of cells', min: 1, max: 4, step: 1, value: 2, onInput: v => { st.cells = v; battA.setCells(v); readA(); } });
        readA();
      }
      if (i === 3) {
        view({ radius: 3.2, width: 3.2, yaw: 0, pitch: 0.62, target: [0, 0.9, -0.1] });
        st.closed = true; st.U = 6; st.R = 12;
        ui.slider({ label: 'Voltage U', min: 0, max: 12, step: 0.5, value: st.U, unit: ' V', format: v => f1(v), onInput: v => { st.U = v; readA(); } });
        ui.slider({ label: 'Resistance R', min: 4, max: 24, step: 2, value: st.R, unit: ' Ω', onInput: v => { st.R = v; readA(); } });
        readA();
      }
      if (i === 4) {
        showBoard(C); voltsC.visible = true;
        view({ radius: 3.0, width: 3.5, yaw: 0, pitch: 0.75, target: [0, 0.5, 0.5] });
        [c1Tag, c2Tag, v1Tag, v2Tag].forEach(l => l.show(true));
        ui.buttons([{ label: 'Unscrew bulb 1', onClick: () => { st.out1To = 1; readSeries(); } }, { label: 'Screw it back in', onClick: () => { st.out1To = 0; readSeries(); } }]);
        readSeries();
      }
      if (i === 5) {
        showBoard(D);
        view({ radius: 2.9, width: 3.5, yaw: 0, pitch: 0.75, target: [0, 0.5, 0] });
        [dTag, d1Tag, d2Tag].forEach(l => l.show(true));
        ui.buttons([{ label: 'Unscrew bulb 1', onClick: () => { st.out1To = 1; readParallel(); } }, { label: 'Screw it back in', onClick: () => { st.out1To = 0; readParallel(); } }]);
        readParallel();
      }
      if (i === 6) {
        st.mode = 'series';
        const layout = () => {
          const ser = st.mode === 'series';
          showBoard(ser ? C : D); voltsC.visible = false;
          for (const l of labels) l.show(false);
          (ser ? [c1Tag, rC1Tag, rC2Tag] : [dTag, rD1Tag, rD2Tag]).forEach(l => l.show(true));
          view(ser ? { radius: 2.8, width: 3.4, yaw: 0, pitch: 0.8, target: [0, 0.5, 0.1] } : { radius: 2.9, width: 3.5, yaw: 0, pitch: 0.75, target: [0, 0.5, 0] });
          readTotal();
        };
        ui.buttons([{ label: 'Series', on: true, onClick: () => { st.mode = 'series'; layout(); } }, { label: 'Parallel', onClick: () => { st.mode = 'parallel'; layout(); } }]);
        ui.slider({ label: 'R₁', min: 5, max: 30, step: 5, value: 10, unit: ' Ω', onInput: v => { st.R1 = v; readTotal(); } });
        ui.slider({ label: 'R₂', min: 5, max: 30, step: 5, value: 20, unit: ' Ω', onInput: v => { st.R2 = v; readTotal(); } });
        layout();
      }
      if (i === 7) {
        showBoard(E);
        view({ radius: 2.9, width: 3.2, yaw: 0, pitch: 0.72, target: [0, 0.5, 0.35] });
        eTag.show(true); fuseTag.show(true);
        st.short = false; st.blown = false; st.heat = 0; st.drop = 1; st.overT = 0;
        const row = ui.buttons([{ label: 'Short circuit', onClick: () => { st.plan = []; startShort(); } }, { label: 'Replace the fuse', onClick: () => { st.plan = []; resetFuse(); } }]);
        st.plan = [[1.0, () => { startShort(); row.select(0); }]];
        readE();
      }
      if (isQuiz) {
        showBoard(D);
        view({ radius: 3.0, width: 3.6, yaw: -0.35, pitch: 0.7, target: [0, 0.5, 0] });
        solveD();
      }
    },

    update(dt, t) {
      st.t += dt;
      while (st.plan.length && st.t >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step;
      if (st.quiz) { dotsD1.advance(-speed(st.I.D1) * dt); dotsD2.advance(-speed(st.I.D2) * dt); return true; }
      if (s <= 3) {
        if (s === 0 && st.partAuto) {
          const n = clamp(Math.floor(st.t / 2.5) % 4, 0, 3);
          if (n !== st.part) { setPart(n); st.partRow?.select(n); }
        }
        if (s === 0) { partTag.at.position.y = PART_AT[st.part][1] + 0.05 * Math.sin(t * 4); }
        dotsA.visible = s >= 1;
        dotsA.advance(-speed(st.I.A) * dt);
        return true;
      }
      // Unscrewing animation for bulb 1 (series and parallel).
      if (st.out1 !== st.out1To) {
        kit.follow(st, 'out1', st.out1To, dt, 5);
        bulbC1.out(st.out1 > 0.001, st.out1); bulbD1.out(st.out1 > 0.001, st.out1);
      }
      if (s === 4 || (s === 6 && st.mode === 'series')) dotsC.advance(-speed(st.I.C) * dt);
      if (s === 5 || (s === 6 && st.mode === 'parallel')) { dotsD1.advance(-speed(st.I.D1) * dt); dotsD2.advance(-speed(st.I.D2) * dt); }
      if (s === 7) {
        if (st.short && st.drop > 0) {
          st.drop = Math.max(0, st.drop - dt * 2.5);
          bypass.position.y = st.drop * 1.2;
          if (st.drop === 0) readE();
        } else if (!st.short) bypass.position.y = 1.2;
        bypass.visible = st.short;
        shortTag.show(st.short && st.drop <= 0 && !st.blown);
        const I = st.I.E;
        if (!st.blown) {
          const target = clamp(I / (FUSE_A * 1.5), 0, 1.2);
          st.heat += (target - st.heat) * Math.min(1, dt * 2.2);
          if (I > FUSE_A) st.overT += dt;
          if (st.overT > 1.0) { st.blown = true; st.heat = 0.3; readE(); }
        } else st.heat = Math.max(0, st.heat - dt * 0.5);
        solveE();
        dotsE.visible = !st.short && !st.blown; dotsES.visible = st.short && st.drop <= 0 && !st.blown;
        if (dotsE.visible) dotsE.advance(-speed(I) * dt);
        if (dotsES.visible) dotsES.advance(-speed(I) * dt);
        return true;
      }
      return true;
    },
  };

  // A bench power supply: a box with a voltage display and two terminals (± 0.6 along x).
  function powerSupply() {
    const g = new THREE.Group();
    kit.mesh(new THREE.BoxGeometry(1.5, 0.55, 0.8), kit.mat(0x3a4651, { roughness: 0.5 }), [0, 0.12, 0], g);
    const W = 256, H = 96, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    face.rotation.x = -Math.PI / 2; face.position.set(-0.15, 0.401, 0.05); g.add(face);
    const knob = kit.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16), kit.mat(0xd9dee3), [0.5, 0.44, 0.1], g);
    kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), kit.mat(0xe63946), [0.55, 0.44, -0.25], g);
    kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), kit.mat(0x1d2b36), [0.3, 0.44, -0.25], g);
    let last = null;
    g.set = U => {
      knob.rotation.y = -U / 12 * 4;
      const txt = `${U.toFixed(1)} V`;
      if (txt === last) return;
      last = txt;
      ctx.fillStyle = '#10161c'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff6b4a'; ctx.font = '700 64px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, W / 2, H / 2 + 3);
      tex.needsUpdate = true;
    };
    g.anchor = new THREE.Object3D(); g.anchor.position.set(0, 0.7, 0); g.add(g.anchor);
    g.set(6);
    return g;
  }
}
