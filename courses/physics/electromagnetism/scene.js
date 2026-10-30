// Electromagnets, motors and generators. Station A: compasses round a wire turn when a current flows.
// Station B: a coil with an iron core lifts paper clips (more current, more turns: stronger). Station C: a
// scrap-yard crane with an electromagnet. Station D: a copper rod on rails between magnet poles is pushed
// along (the motor effect, F = B × I × L). Station E: a simple DC motor with a split-ring commutator.
// Station F: a magnet pushed into a coil makes a current (a galvanometer swings). Station G: an AC generator
// with a live voltage trace. Station H: a transformer (Vs / Vp = Ns / Np).
import { makeArrow, makeCoil, panel, rand, fmt } from '../_shared/lab.js';
import { wire, battery, meter, bulb } from '../_shared/circuit.js';
import { barMagnet, compass, aimAngle, turnToward, lineGroup, allLines, N_RED, S_BLUE } from '../_shared/magnets.js';

const A_X = 0, B_X = 12, C_X = 24, D_X = 36, E_X = 48, F_X = 60, G_X = 72, H_X = 84;
const DEG = Math.PI / 180;
const COPPER = 0xc8743a;

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xd8d3c6, sky: 0xe1ebf3, radius: 54 });
  ground.position.x = 42;
  const sun = kit.lights(scene, { sun: [4, 10, 7] });
  scene.add(sun.target);
  const moveSun = x => { sun.position.set(x + 4, 10, 7); sun.target.position.set(x, 0, 0); };
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const copper = kit.mat(COPPER, { metalness: 0.6, roughness: 0.35 });
  const dark = kit.mat(0x4a4e69, { roughness: 0.6 });
  const ironMat = kit.mat(0x7d8590, { metalness: 0.5, roughness: 0.45 });
  const board = (w, d, x, z = 0, color = 0xb98b5e) => { const m = kit.mesh(new THREE.BoxGeometry(w, 0.12, d), kit.mat(color, { roughness: 0.8 }), [x, 0.06, z], scene); m.castShadow = false; return m; };
  const rod = (len, r, mat, pos, rotZ = 0, rotX = 0) => { const m = kit.mesh(new THREE.CylinderGeometry(r, r, len, 12), mat, pos, scene); m.rotation.set(rotX, 0, rotZ); return m; };
  const cone = (color, r = 0.07, h = 0.2) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), new THREE.MeshBasicMaterial({ color })); scene.add(m); return m; };
  const st = { step: 0, time: 0, auto: true, quiz: false, slider: null };

  // ---------- Station A: compasses round a straight wire ----------
  const CARD_Y = 1.25, BE = 20;                     // card height; Earth's field along the ground, about 20 µT
  board(4.2, 3.2, A_X + 0.6);
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) kit.mesh(new THREE.BoxGeometry(0.08, CARD_Y - 0.12, 0.08), dark, [A_X + x, (CARD_Y + 0.12) / 2, z], scene);
  const card = kit.mesh(new THREE.BoxGeometry(2.8, 0.04, 2.8), kit.mat(0xfbfaf4, { roughness: 0.9 }), [A_X, CARD_Y, 0], scene);
  card.castShadow = false;
  const wireA = wire(THREE, [[A_X, 0.3, 0], [A_X, 2.7, 0], [A_X + 2.0, 2.7, 0], [A_X + 2.0, 0.3, 0], [A_X + 1.62, 0.3, 0]], { radius: 0.04, color: COPPER });
  scene.add(wireA);
  scene.add(wire(THREE, [[A_X, 0.3, 0], [A_X + 0.38, 0.3, 0]], { radius: 0.04, color: COPPER }));
  const batA = battery(THREE, kit, { slots: 2, cell: 0.55, r: 0.13 });
  batA.position.set(A_X + 1.0, 0.3, 0);
  scene.add(batA);
  const curA = cone(0xe63946, 0.08, 0.24);
  const curTagAt = new THREE.Object3D(); scene.add(curTagAt);
  const curTag = label('Current', curTagAt, { cls: 'warm' });
  const compA = [];
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, c = compass(THREE, kit, { r: 0.2 });
    c.position.set(A_X + Math.cos(a) * 0.8, CARD_Y + 0.02, Math.sin(a) * 0.8);
    c.u = Math.cos(a); c.v = Math.sin(a);
    scene.add(c); compA.push(c);
  }
  // Circular field lines on the card, with arrowheads (direction set when the current changes).
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x1d3557 });
  const rings = [0.45, 1.15].map(r => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 4, 48), ringMat); t.rotation.x = Math.PI / 2; g.add(t);
    g.heads = [0, 1, 2].map(k => { const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 8), ringMat); h.a = k * 2 * Math.PI / 3 + 0.5; h.r = r; g.add(h); return h; });
    g.position.set(A_X, CARD_Y + 0.03, 0);
    scene.add(g);
    return g;
  });
  const northAt = new THREE.Object3D(); northAt.position.set(A_X - 1.0, CARD_Y + 0.05, -1.3); scene.add(northAt);
  const northTag = label('North ↑', northAt);
  const fieldTagAt = new THREE.Object3D(); fieldTagAt.position.set(A_X + 0.85, CARD_Y + 0.05, 1.0); scene.add(fieldTagAt);
  const fieldTag = label('Field lines', fieldTagAt, { cls: 'cool' });
  st.I = 0; st.dirA = 1;
  const upV = V(0, 1, 0), tmpV = V(0, 0, 0);
  function setWire() {
    // Field round the wire: circles, the way your fingers curl when your right thumb points along the current.
    const s = st.dirA;
    batA.rotation.y = s > 0 ? Math.PI : 0;          // + terminal next to the wire's foot: current flows up the wire
    curA.position.set(A_X, s > 0 ? 2.15 : 2.0, 0);
    curA.rotation.set(s > 0 ? 0 : Math.PI, 0, 0);
    curA.visible = st.I > 0;
    curTagAt.position.set(A_X, 2.3, 0);
    for (const g of rings) {
      g.visible = st.I > 0;
      for (const h of g.heads) {
        h.position.set(Math.cos(h.a) * h.r, 0, Math.sin(h.a) * h.r);
        // Tangent direction (y × r) for current up; reversed for current down.
        tmpV.set(-Math.sin(h.a) * s, 0, Math.cos(h.a) * s).multiplyScalar(-1);
        h.quaternion.setFromUnitVectors(upV, tmpV);
      }
    }
    const bw = 2e-7 * st.I / 0.02 * 1e6;            // µT at 2 cm from the wire
    ui.readout(st.I > 0 ? `Current I = <b>${fmt(st.I, 1)} A</b> ${s > 0 ? 'up' : 'down'} the wire · field from the wire at the compasses (2 cm away): about <b>${Math.round(bw)} µT</b>, compared with Earth's field of about ${BE} µT. A bigger current turns the needles further.` : 'No current: every compass points north, along Earth\'s magnetic field.');
  }
  function compassTargets() {
    const s = st.dirA, bw = 2e-7 * st.I / 0.02 * 1e6;
    for (const c of compA) {
      // y × (u, 0, v) = (v, 0, −u): the wire's field direction for current going up.
      const bx = bw * s * c.v, bz = -BE + bw * s * -c.u;
      c.target = aimAngle(bx, bz);
    }
  }

  // ---------- Station B: an electromagnet lifts paper clips ----------
  const COIL_TOP = 2.9, COIL_L = 1.2, COIL_R = 0.3;
  board(4, 2.6, B_X);
  kit.mesh(new THREE.BoxGeometry(0.16, 3.3, 0.16), dark, [B_X - 1.5, 1.77, -0.6], scene);
  kit.mesh(new THREE.BoxGeometry(1.7, 0.14, 0.16), dark, [B_X - 0.75, 3.38, -0.6], scene);
  kit.mesh(new THREE.BoxGeometry(0.16, 0.14, 0.7), dark, [B_X, 3.38, -0.3], scene);
  const coreB = rod(1.55, 0.18, ironMat, [B_X, COIL_TOP - COIL_L / 2 + 0.02, 0]);
  const coreBottom = COIL_TOP - COIL_L / 2 + 0.02 - 0.775;
  const TURNS = [20, 40, 60, 80, 100];
  const coilsB = TURNS.map(n => {
    const c = makeCoil(THREE, copper, { turns: n / 5, radius: COIL_R, wire: 0.03, perTurn: 14, radial: 5 });
    c.setLength(COIL_L); c.position.set(B_X, COIL_TOP, 0); c.visible = false;
    scene.add(c); return c;
  });
  const batB = battery(THREE, kit, { slots: 2, cell: 0.5, r: 0.12 });
  batB.position.set(B_X + 1.2, 0.27, 0.6); scene.add(batB);
  const meterB = meter(THREE, kit, 'A');
  meterB.position.set(B_X - 0.9, 0.27, 0.7); scene.add(meterB);
  scene.add(wire(THREE, [[B_X + COIL_R, COIL_TOP, 0], [B_X + 0.9, COIL_TOP, 0], [B_X + 1.9, COIL_TOP, 0], [B_X + 1.9, 0.27, 0.6], [B_X + 1.75, 0.27, 0.6]], { radius: 0.025 }));
  scene.add(wire(THREE, [[B_X + 0.65, 0.27, 0.6], [B_X - 0.52, 0.27, 0.7]], { radius: 0.025 }));
  scene.add(wire(THREE, [[B_X - 1.28, 0.27, 0.7], [B_X - 1.75, 0.27, 0.7], [B_X - 1.75, COIL_TOP - COIL_L, 0], [B_X - COIL_R, COIL_TOP - COIL_L, 0]], { radius: 0.025 }));
  function makeClip() {
    const g = new THREE.Group(), m = kit.mat(0xadb5bd, { metalness: 0.7, roughness: 0.3 });
    const t = kit.mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 18), m, [0, 0, 0], g); t.scale.set(1.8, 1, 1);
    const t2 = kit.mesh(new THREE.TorusGeometry(0.065, 0.014, 6, 18), m, [0.03, 0, 0], g); t2.scale.set(2.1, 1, 1);
    return g;
  }
  const clipsB = [];
  for (let k = 0; k < 12; k++) {
    const c = makeClip();
    c.home = V(B_X - 0.45 + (k % 4) * 0.3 + rand(k) * 0.08, 0.135 + Math.floor(k / 4) * 0.012, -0.25 + Math.floor(k / 4) * 0.25);
    c.homeRot = rand(k + 20) * Math.PI;
    const row = Math.floor(k / 3), col = k % 3;
    c.hang = V(B_X + (col - 1) * 0.12, coreBottom - 0.1 - row * 0.17, (col - 1) * 0.05);
    c.position.copy(c.home); c.rotation.set(0, c.homeRot, 0); c.f = 0;
    scene.add(c); clipsB.push(c);
  }
  const coreTag = label('Iron core', new THREE.Object3D()); scene.add(coreTag.at); coreTag.at.position.set(B_X - 0.55, COIL_TOP + 0.05, 0.2);
  const coilTag = label('Coil', new THREE.Object3D()); scene.add(coilTag.at); coilTag.at.position.set(B_X + 0.62, COIL_TOP - 0.45, 0);
  const bN = new THREE.Object3D(); bN.position.set(B_X + 0.45, coreBottom + 0.05, 0.1); scene.add(bN);
  const bS = new THREE.Object3D(); bS.position.set(B_X + 0.45, COIL_TOP + 0.25, 0.1); scene.add(bS);
  const bNTag = label('N', bN, { cls: 'warm' }), bSTag = label('S', bS, { cls: 'cool' });
  // Field lines of the coil (it acts like a bar magnet: N at the bottom, S at the top).
  const coilPoles = [{ u: 0, v: coreBottom + 0.1, q: 1 }, { u: 0, v: COIL_TOP + 0.05, q: -1 }];
  const coilLines = (() => {
    const { lines, dirs } = allLines(coilPoles, p => [-70, -45, -22, 0, 22, 45, 70].map(a => (p.q > 0 ? -90 : 90) * DEG + a * DEG), { cu: 0, cv: 2.2, bu: 1.9, bv: 2.05, stopR: 0.1 });
    return lineGroup(THREE, lines, (u, v, out) => out.set(B_X + u, v, -0.02), { color: 0x1d3557, radius: 0.012, dirs });
  })();
  scene.add(coilLines);
  st.IB = 2; st.NB = 60; st.core = true;
  const clipCount = () => Math.min(12, Math.floor(st.NB * st.IB * (st.core ? 1 / 25 : 1 / 250)));
  function setMagnetB() {
    coilsB.forEach((c, k) => { c.visible = TURNS[k] === st.NB; });
    coreB.visible = st.core;
    meterB.set(st.IB.toFixed(2));
    coilLines.visible = st.IB > 0 && st.lines;
    bNTag.show(st.step === 1 && st.IB > 0); bSTag.show(st.step === 1 && st.IB > 0); coreTag.show(st.step === 1 && st.core);
    const n = clipCount();
    ui.readout(`Current: <b>${fmt(st.IB, 1)} A</b> · Turns: <b>${st.NB}</b> · Iron core: <b>${st.core ? 'in' : 'out'}</b><br>Paper clips lifted: <b>${n}</b> (model)${st.IB === 0 ? ' · no current, no magnet' : ''}`);
  }

  // ---------- Station C: scrap-yard crane ----------
  board(9, 7, C_X, 0, 0x9c8b78);
  kit.mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.4, 20), kit.mat(0xf2b134), [C_X, 0.32, 0], scene);
  kit.mesh(new THREE.BoxGeometry(0.4, 3.6, 0.4), kit.mat(0xf2b134), [C_X, 2.3, 0], scene);
  const boom = new THREE.Group(); boom.position.set(C_X, 4.0, 0); scene.add(boom);
  kit.mesh(new THREE.BoxGeometry(3.6, 0.3, 0.3), kit.mat(0xf2b134), [1.5, 0, 0], boom);
  kit.mesh(new THREE.BoxGeometry(0.8, 0.6, 0.7), kit.mat(0x5c677d), [-0.5, 0.05, 0], boom);
  const cable = kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), kit.mat(0x222222), [3, 0, 0], boom);
  const disc = new THREE.Group(); boom.add(disc);
  kit.mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.25, 24), kit.mat(0x3d4451, { metalness: 0.5, roughness: 0.4 }), [0, 0, 0], disc);
  const discGlow = kit.mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 24), new THREE.MeshBasicMaterial({ color: 0x555555 }), [0, -0.135, 0], disc);
  const bin = new THREE.Group(); scene.add(bin);
  const binMat = kit.mat(0x2a9d8f);
  kit.mesh(new THREE.BoxGeometry(1.8, 0.1, 1.6), binMat, [0, 0.17, 0], bin);
  for (const [x, z, w, d] of [[-0.9, 0, 0.08, 1.6], [0.9, 0, 0.08, 1.6], [0, -0.8, 1.8, 0.08], [0, 0.8, 1.8, 0.08]]) kit.mesh(new THREE.BoxGeometry(w, 0.7, d), binMat, [x, 0.47, z], bin);
  const BOOM_R = 3.0, BIN_A = 110 * DEG;
  bin.position.set(C_X + BOOM_R * Math.cos(BIN_A), 0, -BOOM_R * Math.sin(BIN_A));
  const scrap = [];
  const steelM = kit.mat(0x8a8f98, { metalness: 0.6, roughness: 0.5 }), rustM = kit.mat(0x9c5a3c, { roughness: 0.8 });
  for (let k = 0; k < 7; k++) {
    const g = k === 6 ? kit.mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.38, 14), kit.mat(0xdfe3e8, { metalness: 0.8, roughness: 0.2 }))
      : kit.mesh(k % 2 ? new THREE.BoxGeometry(0.42, 0.14, 0.24) : new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10), k % 3 ? steelM : rustM);
    g.mag = k !== 6;
    g.home = V(C_X + BOOM_R + (rand(k * 3) - 0.5) * 0.9, 0.2 + (k === 6 ? 0.08 : 0), (rand(k * 3 + 1) - 0.5) * 0.9);
    if (k === 6) g.home.set(C_X + BOOM_R + 0.55, 0.31, 0.45);
    g.homeRot = rand(k * 5) * Math.PI;
    g.off = V((rand(k * 7) - 0.5) * 0.7, -0.22, (rand(k * 7 + 2) - 0.5) * 0.7);
    g.stuck = false; g.vy = 0;
    g.position.copy(g.home); g.rotation.set(k % 2 ? 0 : Math.PI / 2, g.homeRot, 0);
    scene.add(g); scrap.push(g);
  }
  const canTag = label('Aluminium can', new THREE.Object3D()); scrap[6].add(canTag.at); canTag.at.position.y = 0.25;
  const discTag = label('Electromagnet', new THREE.Object3D()); disc.add(discTag.at); discTag.at.position.set(0, 0.25, 0);
  const binTag = label('Bin', new THREE.Object3D()); bin.add(binTag.at); binTag.at.position.set(0, 0.95, 0);
  st.boom = 0; st.drop = 0; st.on = false;
  const discW = V(0, 0, 0);
  function poseCrane() {
    boom.rotation.y = st.boom;
    const len = 0.6 + st.drop;
    cable.scale.y = len; cable.position.set(BOOM_R, -len / 2, 0);
    disc.position.set(BOOM_R, -len - 0.12, 0);
    discGlow.material.color.setHex(st.on ? 0xffb703 : 0x555555);
    disc.getWorldPosition(discW);
  }

  // ---------- Station D: the motor effect ----------
  const RY = 1.1, RAIL_L = 4.2, RZ = 0.5, ROD_L = 0.25;   // rail height, rail length, rail half-gap; 1 unit = 10 cm here
  board(6, 3, D_X);
  for (const z of [-RZ, RZ]) rod(RAIL_L, 0.03, kit.mat(0xb0b7bf, { metalness: 0.7, roughness: 0.3 }), [D_X, RY, z], Math.PI / 2);
  for (const x of [-RAIL_L / 2 + 0.2, RAIL_L / 2 - 0.2]) for (const z of [-RZ, RZ]) kit.mesh(new THREE.BoxGeometry(0.1, RY - 0.12, 0.1), dark, [D_X + x, (RY + 0.12) / 2, z], scene);
  const barD = rod(RZ * 2 + 0.3, 0.06, copper, [D_X, RY + 0.09, 0], 0, Math.PI / 2);
  const poleTop = new THREE.Group(), poleBot = new THREE.Group(); scene.add(poleTop, poleBot);
  const topM = kit.mesh(new THREE.BoxGeometry(2.6, 0.3, 1.3), kit.mat(N_RED, { roughness: 0.45 }), [0, 0, 0], poleTop);
  const botM = kit.mesh(new THREE.BoxGeometry(2.6, 0.3, 1.3), kit.mat(S_BLUE, { roughness: 0.45 }), [0, 0, 0], poleBot);
  poleTop.position.set(D_X, RY + 0.75, 0); poleBot.position.set(D_X, RY - 0.42, 0);
  kit.mesh(new THREE.BoxGeometry(2.6, 1.5, 0.2), kit.mat(0x6c757d, { metalness: 0.4 }), [D_X, RY + 0.18, -0.75], scene);
  const topTagAt = new THREE.Object3D(); poleTop.add(topTagAt); topTagAt.position.set(0.9, 0.2, 0.4);
  const botTagAt = new THREE.Object3D(); poleBot.add(botTagAt); botTagAt.position.set(0.9, -0.55, 0.4);
  const topTag = label('N', topTagAt, { cls: 'warm' }), botTag = label('S', botTagAt, { cls: 'cool' });
  const batD = battery(THREE, kit, { slots: 2, cell: 0.5, r: 0.12 });
  batD.rotation.y = Math.PI / 2; batD.position.set(D_X - RAIL_L / 2 - 0.5, 0.26, 0); scene.add(batD);
  scene.add(wire(THREE, [[D_X - RAIL_L / 2 - 0.5, 0.26, -0.62], [D_X - RAIL_L / 2 - 0.5, 0.26, -RZ - 0.3], [D_X - RAIL_L / 2, RY, -RZ]], { radius: 0.022 }));
  scene.add(wire(THREE, [[D_X - RAIL_L / 2 - 0.5, 0.26, 0.62], [D_X - RAIL_L / 2 - 0.5, 0.26, RZ + 0.3], [D_X - RAIL_L / 2, RY, RZ]], { radius: 0.022 }));
  const forceD = makeArrow(THREE, 0x7b2cbf, { radius: 0.05, head: 0.24 }); scene.add(forceD);
  const fTagD = label('Force', forceD.tip, { cls: 'big' });
  const curD = cone(0xe63946, 0.07, 0.2);
  const curDAt = new THREE.Object3D(); scene.add(curDAt);
  const curDTag = label('Current', curDAt, { cls: 'warm' });
  const fieldArrows = [-0.8, 0, 0.8].map(x => { const a = makeArrow(THREE, 0x3a86ff, { radius: 0.02, head: 0.12 }); scene.add(a); a.x0 = x; return a; });
  st.ID = 3; st.curDir = 1; st.magDir = 1; st.xD = -1.4; st.vD = 0;
  const BT = 0.2, LD = 0.05;                        // magnet's field 0.2 T; 5 cm of rod between the poles
  function motorForce() {
    // F = I L × B. Current along z (st.curDir), field down (N on top) or up.
    const I = st.ID * st.curDir, B = -st.magDir;     // field's y component (tesla units of BT)
    // (0, 0, I) × (0, B, 0) = (−I·B, 0, 0)
    return -I * B * BT * LD;                         // newtons along x
  }
  function setMotorD() {
    const F = motorForce();
    topM.material.color.setHex(st.magDir > 0 ? N_RED : S_BLUE); botM.material.color.setHex(st.magDir > 0 ? S_BLUE : N_RED);
    topTag.text = st.magDir > 0 ? 'N' : 'S'; botTag.text = st.magDir > 0 ? 'S' : 'N';
    topTag.el.className = 'lab ' + (st.magDir > 0 ? 'warm' : 'cool'); botTag.el.className = 'lab ' + (st.magDir > 0 ? 'cool' : 'warm');
    for (const a of fieldArrows) a.point(D_X + a.x0, st.magDir > 0 ? RY + 0.55 : RY - 0.22, -0.45, 0, -st.magDir, 0, 0.32, 0.15);
    const dir = F > 0 ? 'right' : F < 0 ? 'left' : '—';
    ui.readout(`F = B × I × L = ${BT} T × ${fmt(st.ID, 1)} A × ${LD} m = <b>${fmt(Math.abs(F), 3)} N</b>, to the <b>${dir}</b><br>Current ${st.curDir > 0 ? 'toward you' : 'away from you'} along the rod · field ${st.magDir > 0 ? 'down (N pole on top)' : 'up (N pole below)'}`);
  }

  // ---------- Station E: DC motor and Station G: AC generator (same coil design) ----------
  const CW = 0.7, CL = 1.6, AXY = 1.8;             // coil half-width, coil length (along z), axle height
  function machine(x0, slip) {
    const g = { x0 };
    board(5, 3.2, x0);
    const nM = kit.mesh(new THREE.BoxGeometry(0.7, 1.6, 2.0), kit.mat(N_RED, { roughness: 0.45 }), [x0 - 1.55, AXY, -0.1], scene);
    const sM = kit.mesh(new THREE.BoxGeometry(0.7, 1.6, 2.0), kit.mat(S_BLUE, { roughness: 0.45 }), [x0 + 1.55, AXY, -0.1], scene);
    for (const m of [nM, sM]) kit.mesh(new THREE.BoxGeometry(0.5, AXY - 0.92, 1.2), dark, [m.position.x, (AXY - 0.8 + 0.12) / 2 + 0.06, -0.1], scene);
    g.nAt = new THREE.Object3D(); g.nAt.position.set(x0 - 1.55, AXY + 0.9, 0.5); scene.add(g.nAt);
    g.sAt = new THREE.Object3D(); g.sAt.position.set(x0 + 1.55, AXY + 0.9, 0.5); scene.add(g.sAt);
    g.nTag = label('N', g.nAt, { cls: 'warm' }); g.sTag = label('S', g.sAt, { cls: 'cool' });
    const rot = new THREE.Group(); rot.position.set(x0, AXY, 0); scene.add(rot);
    const cm = copper;
    // Two long sides (along z) and two short ends.
    const sideA = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, CL, 10), cm, [CW, 0, 0], rot); sideA.rotation.x = Math.PI / 2;
    const sideB = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, CL, 10), cm, [-CW, 0, 0], rot); sideB.rotation.x = Math.PI / 2;
    const endBack = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 2 * CW, 10), cm, [0, 0, -CL / 2], rot); endBack.rotation.z = Math.PI / 2;
    // Front end: two halves that go to the rings.
    for (const s of [-1, 1]) { const e = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, CW - 0.1, 10), cm, [s * (CW + 0.1) / 2, 0, CL / 2], rot); e.rotation.z = Math.PI / 2; }
    kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.3, 10), kit.mat(0x9aa4ad, { metalness: 0.6 }), [0, 0, 0.35], rot).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { const l = kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), cm, [s * 0.1, 0, CL / 2 + 0.27], rot); l.rotation.x = Math.PI / 2; }
    const ringZ = CL / 2 + 0.6;
    if (!slip) {
      // Split ring: two copper halves with gaps between them.
      for (const s of [0, 1]) {
        const h = kit.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 16, 1, true, s * Math.PI + 0.18, Math.PI - 0.36), kit.mat(COPPER, { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }), [0, 0, ringZ], rot);
        h.rotation.x = Math.PI / 2;
      }
    } else {
      for (const z of [ringZ - 0.18, ringZ + 0.18]) { const r = kit.mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 24), kit.mat(COPPER, { metalness: 0.7, roughness: 0.3 }), [0, 0, z], rot); void r; }
    }
    // Carbon brushes touching the ring(s) from left and right, wired down to the board.
    const brushM = kit.mat(0x2b2d42);
    g.brushes = [-1, 1].map((s, k) => {
      const z = slip ? ringZ + (k ? 0.18 : -0.18) : ringZ;
      const b = kit.mesh(new THREE.BoxGeometry(0.2, 0.12, 0.12), brushM, [x0 + s * 0.32, AXY, z], scene);
      scene.add(wire(THREE, [[x0 + s * 0.42, AXY, z], [x0 + s * 0.8, AXY, z], [x0 + s * 0.8, 0.3, 1.25]], { radius: 0.02 }));
      return b;
    });
    g.rot = rot; g.sideA = sideA; g.sideB = sideB; g.ringZ = ringZ;
    g.theta = 0; g.omega = 0;
    return g;
  }
  const motor = machine(E_X, false);
  const batE = battery(THREE, kit, { slots: 2, cell: 0.5, r: 0.12 });
  batE.position.set(E_X, 0.27, 1.25); scene.add(batE);
  scene.add(wire(THREE, [[E_X - 0.8, 0.3, 1.25], [E_X - 0.62, 0.27, 1.25]], { radius: 0.02 }));
  scene.add(wire(THREE, [[E_X + 0.8, 0.3, 1.25], [E_X + 0.62, 0.27, 1.25]], { radius: 0.02 }));
  const fA = makeArrow(THREE, 0x7b2cbf, { radius: 0.045, head: 0.22 }), fB = makeArrow(THREE, 0x7b2cbf, { radius: 0.045, head: 0.22 });
  scene.add(fA, fB);
  const fATag = label('Force', fA.tip, { cls: 'big' });
  const commAt = new THREE.Object3D(); commAt.position.set(E_X + 0.1, AXY + 0.3, motor.ringZ + 0.1); scene.add(commAt);
  const commTag = label('Split-ring commutator', commAt);
  const iConesE = [cone(0xe63946, 0.07, 0.2), cone(0xe63946, 0.07, 0.2)];
  const wp = V(0, 0, 0);
  st.IE = 2;
  function motorForces() {
    // The side that is on the right gets current toward you (the commutator sees to that), so it is pushed up.
    const sides = [motor.sideA, motor.sideB];
    let right = null, left = null;
    for (const s of sides) { s.getWorldPosition(wp); if (wp.x > E_X) right = s; else left = s; }
    const len = 0.25 + 0.3 * st.IE;
    right.getWorldPosition(wp); fA.point(wp.x, wp.y + 0.08, wp.z + 0.45, 0, 1, 0, len, 0.3);
    left.getWorldPosition(wp); fB.point(wp.x, wp.y - 0.08, wp.z + 0.45, 0, -1, 0, len, 0.3);
    right.getWorldPosition(wp); iConesE[0].position.set(wp.x, wp.y, wp.z + 0.1); iConesE[0].rotation.set(Math.PI / 2, 0, 0);
    left.getWorldPosition(wp); iConesE[1].position.set(wp.x, wp.y, wp.z + 0.1); iConesE[1].rotation.set(-Math.PI / 2, 0, 0);
    fA.visible = fB.visible = st.IE > 0; iConesE.forEach(c => { c.visible = st.IE > 0; });
  }

  // ---------- Station F: electromagnetic induction ----------
  const FY = 1.2, FCOIL_L = 1.4;
  board(7, 2.8, F_X);
  const coilF = makeCoil(THREE, copper, { turns: 16, radius: 0.42, wire: 0.035, perTurn: 16, radial: 5 });
  coilF.setLength(FCOIL_L);
  coilF.rotation.z = Math.PI / 2;                    // horizontal: runs from x = −0.7 to +0.7
  coilF.position.set(F_X - 0.7 - 0.6, FY, 0);
  scene.add(coilF);
  const FC = F_X - 0.6;                              // coil centre
  kit.mesh(new THREE.BoxGeometry(1.6, FY - 0.55, 0.5), kit.mat(0xdcc7a1), [FC, (FY - 0.42 + 0.12) / 2 + 0.06, 0], scene);
  const galvo = new THREE.Group(); galvo.position.set(F_X - 2.6, 0.12, 0.3); scene.add(galvo);
  kit.mesh(new THREE.BoxGeometry(1.3, 1.2, 0.5), kit.mat(0xf2f4f6, { roughness: 0.5 }), [0, 0.6, 0], galvo);
  const dial = panel(THREE, 1.1, 0.8, { px: 256, frame: 0xf2f4f6, depth: 0.02 });
  dial.position.set(0, 0.68, 0.26); galvo.add(dial);
  dial.draw((g, W, H) => {
    g.fillStyle = '#fffdf5'; g.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.92, r = H * 0.72;
    g.strokeStyle = '#1d2b36'; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, r, -Math.PI * 0.85, -Math.PI * 0.15); g.stroke();
    g.fillStyle = '#1d2b36'; g.font = '700 22px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = -5; k <= 5; k++) {
      const a = -Math.PI / 2 + k * 0.07 * Math.PI, r1 = r - (k % 5 ? 10 : 18);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke();
      if (k % 5 === 0) g.fillText(k === 0 ? '0' : k < 0 ? '−' : '+', cx + Math.cos(a) * (r + 18), cy + Math.sin(a) * (r + 18));
    }
    g.font = '800 22px system-ui, sans-serif'; g.fillText('mA', cx, H * 0.62);
  });
  const needle = new THREE.Group(); needle.position.set(0, 0.68 - 0.4 * 0.84, 0.29); galvo.add(needle);
  kit.mesh(new THREE.BoxGeometry(0.02, 0.56, 0.01), new THREE.MeshBasicMaterial({ color: 0xd62828 }), [0, 0.28, 0], needle);
  scene.add(wire(THREE, [[FC - 0.7, FY - 0.42, 0], [FC - 0.9, 0.3, 0.2], [F_X - 2.3, 0.3, 0.3]], { radius: 0.022 }));
  scene.add(wire(THREE, [[FC + 0.7, FY - 0.42, 0], [FC + 0.8, 0.22, 0.6], [F_X - 2.9, 0.22, 0.6], [F_X - 2.9, 0.3, 0.3]], { radius: 0.022 }));
  const magF = barMagnet(THREE, kit, { length: 1.8, width: 0.42, height: 0.42 });
  scene.add(magF);
  const handAt = new THREE.Object3D(); magF.add(handAt); handAt.position.set(0.6, 0.3, 0);
  const galvoTag = label('Galvanometer', new THREE.Object3D()); galvo.add(galvoTag.at); galvoTag.at.position.set(0, 1.3, 0);
  const coilFTag = label('Coil', new THREE.Object3D()); scene.add(coilFTag.at); coilFTag.at.position.set(FC, FY + 0.5, 0);
  // Flux through the coil for the magnet's leading pole at distance s from the coil centre (model).
  const dflux = s => -2 * (s / 0.55) / 0.55 / (1 + (s / 0.55) ** 2) ** 2;
  st.mx = 3.0; st.mv = 0; st.mGoal = 3.0; st.mSpeed = 1; st.flip = 1; st.needle = 0;
  const OUT_X = 2.9, IN_X = 0.75;                    // magnet centre positions (relative to the coil centre)
  function placeMagF() {
    magF.position.set(FC + st.mx, FY, 0);
    magF.rotation.y = st.flip > 0 ? Math.PI : 0;     // flip = 1: N end leads into the coil
  }

  // ---------- Station G: AC generator ----------
  const gen = machine(G_X, true);
  const meterG = meter(THREE, kit, 'V');
  meterG.position.set(G_X, 0.27, 1.25); scene.add(meterG);
  scene.add(wire(THREE, [[G_X - 0.8, 0.3, 1.25], [G_X - 0.38, 0.27, 1.25]], { radius: 0.02 }));
  scene.add(wire(THREE, [[G_X + 0.8, 0.3, 1.25], [G_X + 0.38, 0.27, 1.25]], { radius: 0.02 }));
  const crank = new THREE.Group(); gen.rot.add(crank);
  kit.mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), dark, [0, 0.25, -1.32], crank);
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10), kit.mat(0xe9c46a), [0, 0.5, -1.47], crank).rotation.x = Math.PI / 2;
  const graph = panel(THREE, 2.6, 1.3, { px: 512 });
  graph.position.set(G_X + 3.6, 2.2, -0.2); graph.rotation.y = -0.25;
  scene.add(graph);
  kit.mesh(new THREE.BoxGeometry(0.1, 1.55, 0.1), dark, [G_X + 3.6, 0.8, -0.2], scene);
  const SAMPLES = 160, trace = new Float32Array(SAMPLES);
  let traceHead = 0, traceAcc = 0;
  const slipAt = new THREE.Object3D(); slipAt.position.set(G_X + 0.1, AXY + 0.3, gen.ringZ + 0.2); scene.add(slipAt);
  const slipTag = label('Slip rings', slipAt);
  st.fG = 1;
  const NG = 100, BG = 0.2, AG = 0.04 * 0.05;        // turns, field (T), coil area (m²) for the model readout
  const v0 = f => NG * BG * AG * 2 * Math.PI * f;
  function drawTrace() {
    graph.draw((g, W, H) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      const L = 64, R = 14, T = 36, B = 30, mid = (T + H - B) / 2, amp = (H - T - B) / 2;
      g.strokeStyle = '#dde6ee'; g.lineWidth = 1.5;
      for (const y of [-0.5, -0.25, 0.25, 0.5]) { const py = mid - y / 0.6 * amp; g.beginPath(); g.moveTo(L, py); g.lineTo(W - R, py); g.stroke(); }
      g.strokeStyle = '#1d2b36'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(L, T); g.lineTo(L, H - B); g.moveTo(L, mid); g.lineTo(W - R, mid); g.stroke();
      g.fillStyle = '#526472'; g.font = '600 17px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (const y of [-0.5, 0, 0.5]) g.fillText(y === 0 ? '0' : (y > 0 ? '+' : '−') + Math.abs(y), L - 8, mid - y / 0.6 * amp);
      g.textAlign = 'center'; g.fillStyle = '#1d2b36'; g.font = '700 20px system-ui, sans-serif';
      g.fillText('Voltage (V) over the last 2 seconds', W / 2, 18);
      g.fillText('time →', W - 60, H - 12);
      g.strokeStyle = '#e63946'; g.lineWidth = 4; g.beginPath();
      for (let k = 0; k < SAMPLES; k++) {
        const v = trace[(traceHead + k) % SAMPLES], px = L + (W - L - R) * k / (SAMPLES - 1), py = mid - Math.max(-0.6, Math.min(0.6, v)) / 0.6 * amp;
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
    });
  }
  function genReadout() {
    ui.readout(`Turning speed: <b>${fmt(st.fG, 2)} turns per second</b> → frequency <b>${fmt(st.fG, 2)} Hz</b><br>Peak voltage: about <b>${fmt(v0(st.fG), 2)} V</b> (model: 100 turns, 0.2 T, 4 cm × 5 cm coil). Twice as fast gives twice the peak voltage and twice the frequency.`);
  }

  // ---------- Station H: transformer ----------
  board(6, 3, H_X);
  const HY = 1.9, CORE_W = 2.4, CORE_H = 2.2, CT = 0.36;
  const coreH = new THREE.Group(); coreH.position.set(H_X, HY, 0); scene.add(coreH);
  for (const [x, y, w, h] of [[-CORE_W / 2, 0, CT, CORE_H], [CORE_W / 2, 0, CT, CORE_H], [0, CORE_H / 2, CORE_W + CT, CT], [0, -CORE_H / 2, CORE_W + CT, CT]]) kit.mesh(new THREE.BoxGeometry(w, h, CT), ironMat, [x, y, 0], coreH);
  kit.mesh(new THREE.BoxGeometry(0.3, HY - CORE_H / 2 - CT / 2 - 0.12, 0.3), dark, [H_X, (HY - CORE_H / 2 - CT / 2 + 0.12) / 2 + 0.06, 0], scene);
  const primary = makeCoil(THREE, kit.mat(0xd1453b, { roughness: 0.5 }), { turns: 10, radius: 0.32, wire: 0.035, perTurn: 14, radial: 5 });
  primary.setLength(1.3); primary.position.set(H_X - CORE_W / 2, HY + 0.65, 0); scene.add(primary);
  const NS = [25, 50, 100, 200, 400];
  const secondaries = NS.map(n => {
    const c = makeCoil(THREE, copper, { turns: Math.max(3, Math.round(n / 10)), radius: 0.32, wire: 0.03, perTurn: 14, radial: 5 });
    c.setLength(1.3); c.position.set(H_X + CORE_W / 2, HY + 0.65, 0); c.visible = false; scene.add(c); return c;
  });
  const supply = new THREE.Group(); supply.position.set(H_X - 2.4, 0.12, 0.5); scene.add(supply);
  kit.mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), kit.mat(0x343a40), [0, 0.3, 0], supply);
  const lampH = bulb(THREE, kit);
  lampH.position.set(H_X + 2.3, 0.24, 0.5); scene.add(lampH);
  scene.add(wire(THREE, [[H_X - CORE_W / 2 - 0.32, HY + 0.6, 0], [H_X - 2.4, HY + 0.6, 0.2], [H_X - 2.4, 0.72, 0.4]], { radius: 0.022 }));
  scene.add(wire(THREE, [[H_X - CORE_W / 2 - 0.32, HY - 0.6, 0], [H_X - 2.1, HY - 0.6, 0.3], [H_X - 2.1, 0.72, 0.5]], { radius: 0.022 }));
  scene.add(wire(THREE, [[H_X + CORE_W / 2 + 0.32, HY + 0.6, 0], [H_X + 2.08, HY + 0.6, 0.3], [H_X + 2.08, 0.24, 0.5]], { radius: 0.022 }));
  scene.add(wire(THREE, [[H_X + CORE_W / 2 + 0.32, HY - 0.6, 0], [H_X + 2.52, HY - 0.6, 0.3], [H_X + 2.52, 0.24, 0.5]], { radius: 0.022 }));
  const supTag = label('AC supply 12 V', new THREE.Object3D()); supply.add(supTag.at); supTag.at.position.y = 0.75;
  const priTag = label('Primary coil', new THREE.Object3D()); scene.add(priTag.at); priTag.at.position.set(H_X - CORE_W / 2, HY + CORE_H / 2 + 0.3, 0);
  const secTag = label('Secondary coil', new THREE.Object3D()); scene.add(secTag.at); secTag.at.position.set(H_X + CORE_W / 2, HY + CORE_H / 2 + 0.3, 0);
  // Pulses of magnetic field running round the iron core, back and forth (AC).
  const pulses = [];
  for (let k = 0; k < 8; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3a86ff })); p.position.z = CT / 2 + 0.03; coreH.add(p); pulses.push(p); }
  const loopLen = 2 * (CORE_W + CORE_H);
  const loopAt = (s, out) => {
    s = ((s % loopLen) + loopLen) % loopLen;
    const w = CORE_W, h = CORE_H;
    if (s < w) return out.set(-w / 2 + s, h / 2, CT / 2 + 0.03);
    if ((s -= w) < h) return out.set(w / 2, h / 2 - s, CT / 2 + 0.03);
    if ((s -= h) < w) return out.set(w / 2 - s, -h / 2, CT / 2 + 0.03);
    s -= w; return out.set(-w / 2, -h / 2 + s, CT / 2 + 0.03);
  };
  st.nsIdx = 3;
  function setTransformer() {
    secondaries.forEach((c, k) => { c.visible = k === st.nsIdx; });
    const ns = NS[st.nsIdx], vs = 12 * ns / 100;
    lampH.set(Math.min(1.6, vs / 24));
    ui.readout(`Vs = Vp × Ns ÷ Np = 12 V × ${ns} ÷ 100 = <b>${fmt(vs, 1)} V</b> · ${ns > 100 ? '<b>step-up</b> transformer' : ns < 100 ? '<b>step-down</b> transformer' : 'same voltage'}`);
  }

  // ---------- Steps ----------
  const allTags = [curTag, northTag, fieldTag, coreTag, coilTag, bNTag, bSTag, canTag, discTag, binTag, topTag, botTag, fTagD, curDTag, motor.nTag, motor.sTag, fATag, commTag, galvoTag, coilFTag, gen.nTag, gen.sTag, slipTag, supTag, priTag, secTag];
  function hideAll() { allTags.forEach(t => t.show(false)); }

  function resetCrane() { st.boom = 0; st.drop = 0; st.on = false; scrap.forEach(s => { s.stuck = false; s.vy = 0; s.position.copy(s.home); }); poseCrane(); }
  function setOn(on) {
    st.on = on;
    poseCrane();
    if (on) scrap.forEach(s => { if (s.mag && discW.distanceTo(s.position) < 1.6) s.stuck = true; });
    else scrap.forEach(s => { s.stuck = false; s.vy = 0; });
    craneReadout();
  }
  function craneReadout() {
    const n = scrap.filter(s => s.stuck).length;
    ui.readout(st.on ? `Electromagnet <b>ON</b>: current flows, so it is a strong magnet. Holding <b>${n}</b> pieces of steel. The aluminium can is not attracted.` : 'Electromagnet <b>OFF</b>: no current, no magnetism. Anything it was holding drops.');
  }
  function moveMagnet(goal, speed) { st.mGoal = goal; st.mSpeed = speed; }

  return {
    step(i, { isQuiz }) {
      st.step = i; st.time = 0; st.auto = true; st.quiz = isQuiz; st.slider = null;
      hideAll();
      if (i === 0) {
        moveSun(A_X);
        view({ radius: 2.0, width: 2.2, yaw: 0.2, pitch: 0.75, target: [A_X + 0.3, 1.4, 0] });
        northTag.show(true); curTag.show(true); fieldTag.show(true);
        st.I = 0; st.dirA = 1;
        st.slider = ui.slider({ label: 'Current', min: 0, max: 5, step: 0.5, value: 0, unit: ' A', format: v => v.toFixed(1), onInput: v => { st.auto = false; st.I = v; setWire(); compassTargets(); } });
        ui.buttons([{ label: 'Reverse the current', onClick: () => { st.auto = false; st.dirA *= -1; setWire(); compassTargets(); } }]);
        compA.forEach(c => { c.needle.rotation.y = aimAngle(0, -1); });
        setWire(); compassTargets();
      }
      if (i === 1) {
        moveSun(B_X);
        view({ radius: 2.1, width: 2.2, yaw: 0.25, pitch: 0.2, target: [B_X, 1.8, 0] });
        coilTag.show(true);
        st.IB = 0; st.NB = 60; st.core = true; st.lines = false;
        st.slider = ui.slider({ label: 'Current', min: 0, max: 3, step: 0.5, value: 0, unit: ' A', format: v => v.toFixed(1), onInput: v => { st.auto = false; st.IB = v; setMagnetB(); } });
        ui.slider({ label: 'Turns on the coil', min: 20, max: 100, step: 20, value: 60, format: v => Math.round(v), onInput: v => { st.auto = false; st.NB = v; setMagnetB(); } });
        ui.toggle({ label: 'Iron core', value: true, onChange: v => { st.auto = false; st.core = v; setMagnetB(); } });
        ui.toggle({ label: 'Show field lines', value: false, onChange: v => { st.lines = v; setMagnetB(); } });
        setMagnetB();
      } else { coilsB.forEach((c, k) => { c.visible = TURNS[k] === 60; }); coreB.visible = true; coilLines.visible = false; }
      if (i === 2) {
        moveSun(C_X + 1);
        view({ radius: 3.4, yaw: 0.35, pitch: 0.3, target: [C_X + 1.0, 2.0, -0.6] });
        canTag.show(true); discTag.show(true); binTag.show(true);
        resetCrane();
        ui.buttons([{ label: 'Switch on', onClick: () => { st.auto = false; setOn(true); } }, { label: 'Switch off', onClick: () => { st.auto = false; setOn(false); } }]);
        st.slider = ui.slider({ label: 'Turn the crane', min: 0, max: 110, step: 5, value: 0, unit: '°', format: v => Math.round(v), onInput: v => { st.auto = false; st.boom = v * DEG; poseCrane(); } });
        ui.slider({ label: 'Lower the magnet', min: 0, max: 100, step: 5, value: 0, unit: '%', format: v => Math.round(v), onInput: v => { st.auto = false; st.drop = v / 100 * 2.35; poseCrane(); } });
        craneReadout();
      } else resetCrane();
      if (i === 3) {
        moveSun(D_X);
        view({ radius: 2.2, width: 2.6, yaw: 0.3, pitch: 0.38, target: [D_X, 1.2, 0] });
        topTag.show(true); botTag.show(true); fTagD.show(true); curDTag.show(true);
        st.ID = 3; st.curDir = 1; st.magDir = 1; st.xD = -1.4; st.vD = 0;
        st.slider = ui.slider({ label: 'Current', min: 0, max: 5, step: 0.5, value: 3, unit: ' A', format: v => v.toFixed(1), onInput: v => { st.auto = false; st.ID = v; setMotorD(); } });
        ui.buttons([{ label: 'Reverse the current', onClick: () => { st.auto = false; st.curDir *= -1; setMotorD(); } },
          { label: 'Flip the magnet', onClick: () => { st.auto = false; st.magDir *= -1; setMotorD(); } },
          { label: 'Put the rod back', onClick: () => { st.auto = false; st.xD = 0; st.vD = 0; } }]);
        setMotorD();
      }
      if (i === 4) {
        moveSun(E_X);
        view({ radius: 2.4, width: 2.3, yaw: 0.55, pitch: 0.38, target: [E_X, 1.5, 0.3] });
        motor.nTag.show(true); motor.sTag.show(true); fATag.show(true); commTag.show(true);
        st.IE = 2;
        st.slider = ui.slider({ label: 'Current', min: 0, max: 4, step: 0.5, value: 2, unit: ' A', format: v => v.toFixed(1), onInput: v => { st.auto = false; st.IE = v; } });
      }
      if (i === 5) {
        moveSun(F_X - 1);
        view({ radius: 2.0, width: 2.9, yaw: 0.15, pitch: 0.25, target: [F_X - 1.0, 1.0, 0] });
        galvoTag.show(true); coilFTag.show(true);
        st.mx = OUT_X; st.mv = 0; st.mGoal = OUT_X; st.flip = 1; st.needle = 0; placeMagF();
        ui.buttons([{ label: 'Push in slowly', onClick: () => { st.auto = false; moveMagnet(IN_X, 0.8); } },
          { label: 'Push in fast', onClick: () => { st.auto = false; moveMagnet(IN_X, 3.2); } },
          { label: 'Pull out', onClick: () => { st.auto = false; moveMagnet(OUT_X, 1.6); } }]);
        ui.toggle({ label: 'Turn the magnet round (S end first)', value: false, onChange: v => { st.auto = false; st.flip = v ? -1 : 1; st.mx = OUT_X; st.mGoal = OUT_X; placeMagF(); } });
        ui.readout('Magnet still: <b>no current</b>. Push the magnet into the coil.');
      }
      if (i === 6) {
        moveSun(G_X + 1);
        view({ radius: 2.6, width: 3.8, yaw: 0.3, pitch: 0.3, target: [G_X + 1.3, 1.6, 0] });
        gen.nTag.show(true); gen.sTag.show(true); slipTag.show(true);
        st.fG = 1; trace.fill(0);
        st.slider = ui.slider({ label: 'Turning speed', min: 0.25, max: 2, step: 0.25, value: 1, unit: ' turns/s', format: v => v.toFixed(2), onInput: v => { st.auto = false; st.fG = v; genReadout(); } });
        genReadout();
      }
      if (i === 7) {
        moveSun(H_X);
        view({ radius: 2.4, width: 3.0, yaw: 0.1, pitch: 0.2, target: [H_X, 1.5, 0] });
        supTag.show(true); priTag.show(true); secTag.show(true);
        st.nsIdx = 3;
        st.slider = ui.slider({ label: 'Turns on the secondary coil (Ns)', min: 0, max: 4, step: 1, value: 3, unit: ' turns', format: v => NS[Math.round(v)], onInput: v => { st.auto = false; st.nsIdx = Math.round(v); setTransformer(); } });
        ui.readout('');
        setTransformer();
      }
      if (isQuiz) {
        moveSun(E_X);
        view({ radius: 2.4, width: 2.3, yaw: -0.5, pitch: 0.35, target: [E_X, 1.5, 0.3] });
        motor.nTag.show(true); motor.sTag.show(true);
        st.IE = 2;
      }
      fA.visible = fB.visible = false; iConesE.forEach(c => { c.visible = false; });
      forceD.visible = false; curD.visible = false; fieldArrows.forEach(a => { a.visible = false; });
      if (i === 3) setMotorD();
    },

    update(dt) {
      st.time += dt;
      const t = st.time, s = st.step;
      if (s === 0) {
        if (st.auto) {
          // Demo: switch on, turn up the current, then reverse it.
          const I = t < 0.6 ? 0 : Math.min(5, Math.round((t - 0.6) * 3) / 2 * 1);
          const dir = Math.floor(t / 7) % 2 ? -1 : 1;
          if (I !== st.I || dir !== st.dirA) { st.I = I; st.dirA = dir; st.slider.set(I); setWire(); compassTargets(); }
        }
        let moving = st.auto;
        for (const c of compA) {
          const a = turnToward(c.needle.rotation.y, c.target, dt * 2.5);
          if (a !== c.needle.rotation.y) moving = true;
          c.needle.rotation.y = a;
        }
        return moving;
      }
      if (s === 1) {
        if (st.auto) {
          const Ir = Math.min(3, Math.max(0, Math.round((t - 0.5) * 3) / 2));
          if (Ir !== st.IB) { st.IB = Ir; st.slider.set(Ir); setMagnetB(); }
        }
        const n = clipCount();
        let moving = st.auto;
        clipsB.forEach((c, k) => {
          const goal = k < n ? 1 : 0;
          if (kit.follow(c, 'f', goal, dt, goal ? 7 : 4)) moving = true;
          c.position.lerpVectors(c.home, c.hang, c.f);
          if (goal === 0 && c.f > 0.01) c.position.y = c.home.y + (c.hang.y - c.home.y) * c.f * c.f;
          c.rotation.set(c.f * Math.PI / 2, c.homeRot * (1 - c.f), 0);
        });
        return moving;
      }
      if (s === 2) {
        if (st.auto) {
          // Lower, switch on, lift, swing to the bin, switch off, swing back: every 10 s.
          const c = t % 10;
          const drop = c < 1.2 ? c / 1.2 : c < 1.6 ? 1 : c < 2.8 ? 1 - (c - 1.6) / 1.2 : 0;
          st.drop = 2.35 * kit.ease(Math.min(1, Math.max(0, drop)));
          st.boom = BIN_A * kit.ease(Math.min(1, Math.max(0, c < 3 ? 0 : c < 5.5 ? (c - 3) / 2.5 : c < 7 ? 1 : 1 - (c - 7) / 2.5)));
          poseCrane();
          if (c >= 1.3 && c < 6 && !st.on) setOn(true);
          if (c >= 6 && st.on) setOn(false);
          if (c < 0.1 && !st.on) scrap.forEach(p => { if (p.position.distanceTo(p.home) > 0.05 && Math.abs(p.position.x - bin.position.x) < 1.1) { p.position.copy(p.home); } });
          if (st.slider) st.slider.set(Math.round(st.boom / DEG / 5) * 5);
        }
        for (const p of scrap) {
          if (p.stuck) { p.position.set(discW.x + p.off.x, discW.y + p.off.y - 0.05, discW.z + p.off.z); continue; }
          // Fall to the floor, or into the bin when above it.
          const inBin = Math.abs(p.position.x - bin.position.x) < 0.85 && Math.abs(p.position.z - bin.position.z) < 0.75;
          const floorY = inBin ? 0.3 : (p === scrap[6] ? 0.31 : 0.2);
          if (p.position.y > floorY) { p.vy -= 9 * dt; p.position.y = Math.max(floorY, p.position.y + p.vy * dt); } else p.vy = 0;
        }
        return true;
      }
      if (s === 3) {
        const F = motorForce();
        if (st.auto && Math.abs(st.xD) > 1.15 && Math.abs(st.vD) < 1e-3 && t > 1) { st.curDir *= -1; setMotorD(); }
        // a = F/m with a light rod (model), rolling friction, stops at the ends of the poles.
        st.vD += (F * 60 - st.vD * 0.8) * dt;
        st.xD += st.vD * dt;
        if (st.xD > 1.2) { st.xD = 1.2; st.vD = 0; }
        if (st.xD < -1.2) { st.xD = -1.2; st.vD = 0; }
        barD.position.set(D_X + st.xD, RY + 0.09, 0);
        barD.rotation.y = 0; barD.rotation.x = Math.PI / 2; barD.rotation.z = 0;
        const len = Math.abs(F) * 22;
        forceD.point(D_X + st.xD, RY + 0.3, RZ + 0.25, Math.sign(F) || 1, 0, 0, len, 0.25);
        curD.visible = st.ID > 0;
        curD.position.set(D_X + st.xD, RY + 0.09, 0.2 * st.curDir);
        curD.rotation.set(st.curDir * Math.PI / 2, 0, 0);
        curDAt.position.set(D_X + st.xD, RY + 0.1, 0.75);
        for (const a of fieldArrows) a.point(D_X + a.x0, st.magDir > 0 ? RY + 0.55 : RY - 0.22, -0.45, 0, -st.magDir, 0, 0.32, 0.15);
        return true;
      }
      if (s === 4 || st.quiz) {
        const m = motor;
        // Torque ∝ I·|cos θ| (the commutator keeps it turning one way), minus friction.
        m.omega += (2.4 * st.IE * Math.abs(Math.cos(m.theta)) + 0.15 * Math.sign(st.IE) - 0.9 * m.omega) * dt;
        if (st.IE === 0) m.omega = Math.max(0, m.omega - dt * 0.8);
        m.theta += m.omega * dt;
        m.rot.rotation.z = m.theta;
        if (!st.quiz) {
          motorForces();
          const rpm = Math.round(m.omega / (2 * Math.PI) * 60);
          const msg = `Current: <b>${fmt(st.IE, 1)} A</b> · speed about <b>${rpm} turns per minute</b> (model)<br>Every half turn the split ring swaps which brush touches which side, so the current in the coil reverses and the forces keep turning it the same way.`;
          if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
        }
        return true;
      }
      if (s === 5) {
        if (st.auto) {
          const c = t % 9;
          if (c < 0.05) { st.mx = OUT_X; moveMagnet(OUT_X, 1); }
          if (c > 0.3 && c < 0.4) moveMagnet(IN_X, 0.8);
          if (c > 4.2 && c < 4.3) moveMagnet(OUT_X, 3.0);
        }
        const before = st.mx, d = st.mGoal - st.mx, stepX = Math.sign(d) * Math.min(Math.abs(d), st.mSpeed * dt);
        st.mx += stepX;
        st.mv = dt > 0 ? (st.mx - before) / dt : 0;
        placeMagF();
        // Current ∝ rate of change of the field through the coil = dΦ/dx × speed; the pole facing the coil sets the sign.
        const lead = st.mx - 0.75;                       // leading pole's distance from the coil centre
        const I = -st.flip * dflux(lead) * st.mv * 0.7;  // mA (model)
        st.needle += (I - st.needle) * Math.min(1, dt * 10);
        needle.rotation.z = -Math.max(-1, Math.min(1, st.needle / 2.5)) * 0.35 * Math.PI;
        const speedCm = Math.abs(st.mv) * 10;
        const msg = Math.abs(st.mv) < 1e-3 ? 'Magnet still: <b>no current</b>, the needle rests at 0.'
          : `Magnet moving ${st.mv < 0 ? 'in' : 'out'} at <b>${Math.round(speedCm)} cm/s</b> · current about <b>${I >= 0 ? '+' : '−'}${fmt(Math.abs(I), 1)} mA</b> (model)`;
        if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
        return true;
      }
      if (s === 6) {
        const g = gen;
        g.theta += 2 * Math.PI * st.fG * dt;
        g.rot.rotation.z = g.theta;
        // Voltage ∝ cos θ: biggest when the coil's sides cut straight across the field lines.
        const v = v0(st.fG) * Math.cos(g.theta);
        traceAcc += dt;
        while (traceAcc >= 2 / SAMPLES) { traceAcc -= 2 / SAMPLES; trace[traceHead] = v; traceHead = (traceHead + 1) % SAMPLES; }
        meterG.set(fmt(v, 2));
        st.gFrame = (st.gFrame || 0) + 1;
        if (st.gFrame % 2 === 0) drawTrace();
        return true;
      }
      if (s === 7) {
        // Field in the core changes direction 50 times a second in real life; slowed right down here.
        const sPos = Math.sin(t * 2.2) * 1.4;
        pulses.forEach((p, k) => loopAt(sPos + k * loopLen / pulses.length, p.position));
        return true;
      }
      return false;
    },
  };
}
