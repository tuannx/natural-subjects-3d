// Levers and turning forces. A door with a closer spring opens only when the moment (force × perpendicular
// distance from the hinge) is big enough; a see-saw balances when clockwise and anticlockwise moments are
// equal; a crowbar lifts a heavy rock with a small force; the three classes of lever with everyday examples;
// the forearm as a class 3 lever. g is taken as 10 N/kg. World units: 1 unit = 1 m, except the arm (1 unit = 10 cm).
import { makeArrow, paint, fmt } from '../_shared/lab.js';
import { stoneGeometry } from '../_shared/fluids.js';

const A_X = 0, B_X = 16, C_X = 32, D_X = 48, E_X = 64;
const G = 10;
const DOOR_W = 0.9, DOOR_NEED = 6;           // the door closer needs 6 N·m to start turning
const SEE_L = 2.2, M1 = 3, D1 = 1.0;          // see-saw half length; fixed left mass (kg) and distance (m)
const ROCK = 50, LOAD_ARM = 0.2;              // crowbar: 50 kg rock, 0.2 m from the fulcrum
const ARM_LOAD = 0.32, ARM_BICEPS = 0.04;     // forearm: hand and biceps distances from the elbow (m)
const BLUE = 0x1d6fd8, RED = 0xe63946, GREEN = 0x2a9d8f;

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xd5e5c8, sky: 0xe2f0fa, radius: 46 });
  ground.position.x = 32;
  const sun = kit.lights(scene, { sun: [3, 9, 6] });
  scene.add(sun.target);
  const moveSun = x => { sun.position.set(x + 3, 9, 6); sun.target.position.set(x, 0, 0); };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  // A thin bar between two points (local to its parent); bar.between(a, b).
  function makeBar(color, r = 0.02) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), new THREE.MeshBasicMaterial({ color }));
    m.between = (a, b) => {
      tmp.subVectors(b, a);
      const L = tmp.length();
      m.visible = L > 0.01;
      if (!m.visible) return;
      m.position.copy(a).addScaledVector(tmp, 0.5);
      m.quaternion.setFromUnitVectors(up, tmp.multiplyScalar(1 / L));
      m.scale.set(1, L, 1);
    };
    return m;
  }
  function makeDash(parent, color = 0x33414d) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize: 0.06, gapSize: 0.04 }));
    l.frustumCulled = false;
    parent.add(l);
    l.set = (a, b) => {
      const p = g.attributes.position.array;
      p[0] = a.x; p[1] = a.y; p[2] = a.z; p[3] = b.x; p[4] = b.y; p[5] = b.z;
      g.attributes.position.needsUpdate = true;
      l.computeLineDistances();
    };
    return l;
  }
  const arrow = (color, opts) => { const a = makeArrow(THREE, color, opts); scene.add(a); return a; };

  // ---------- Station A: a door with a closer ----------
  const wallMat = kit.mat(0xf1e3d3, { roughness: 0.95 });
  kit.mesh(new THREE.BoxGeometry(2.0, 2.5, 0.15), wallMat, [A_X - 1.55, 1.25, -0.06], scene);
  kit.mesh(new THREE.BoxGeometry(2.0, 2.5, 0.15), wallMat, [A_X + 1.55, 1.25, -0.06], scene);
  kit.mesh(new THREE.BoxGeometry(1.1, 0.42, 0.15), wallMat, [A_X, 2.29, -0.06], scene);
  const frameMat = kit.mat(0x6b4f3a);
  kit.mesh(new THREE.BoxGeometry(0.06, 2.1, 0.2), frameMat, [A_X - 0.52, 1.05, -0.04], scene);
  kit.mesh(new THREE.BoxGeometry(0.06, 2.1, 0.2), frameMat, [A_X + 0.52, 1.05, -0.04], scene);
  kit.mesh(new THREE.BoxGeometry(1.1, 0.06, 0.2), frameMat, [A_X, 2.08, -0.04], scene);
  const hingeX = A_X - DOOR_W / 2 - 0.03;
  const door = new THREE.Group();
  door.position.set(hingeX, 0, 0);
  scene.add(door);
  const doorTex = paint(THREE, 128, 256, (c, w, h) => {
    c.fillStyle = '#c98f55'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a8703d'; c.lineWidth = 6;
    c.strokeRect(16, 16, w - 32, h * 0.42); c.strokeRect(16, h * 0.5, w - 32, h * 0.44);
  });
  kit.mesh(new THREE.BoxGeometry(DOOR_W, 2.0, 0.05), kit.mat(0xffffff, { map: doorTex }), [DOOR_W / 2 + 0.01, 1.01, 0], door);
  kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), kit.mat(0xc9a227, { metalness: 0.8, roughness: 0.3 }), [DOOR_W - 0.08, 1.0, 0.07], door).rotation.x = Math.PI / 2;
  for (const y of [0.3, 1.7]) kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), kit.mat(0x8d99ae, { metalness: 0.7 }), [0, y, 0], door);
  // Door closer: a box on the door and an arm to the frame.
  kit.mesh(new THREE.BoxGeometry(0.28, 0.07, 0.07), kit.mat(0x5c677d), [0.2, 1.9, 0.06], door);
  const closerTag = label('Door closer', new THREE.Vector3(hingeX + 0.25, 2.35, 0.1));
  const hingeTag = label('Hinge (pivot)', new THREE.Vector3(hingeX - 0.05, 1.62, 0.15));
  const pull = makeArrow(THREE, BLUE, { radius: 0.022, head: 0.1 });
  door.add(pull);
  const pullAt = new THREE.Object3D();
  door.add(pullAt);
  const pullTag = label('Force', pullAt, { cls: 'cool' });
  const lineOfAction = makeDash(door);
  const dBar = makeBar(0xfb8500, 0.018);
  door.add(dBar);
  const dAt = new THREE.Object3D();
  door.add(dAt);
  const dTag = label('d', dAt, { cls: 'warm' });

  // ---------- Station B: see-saw ----------
  const stB = new THREE.Group();
  stB.position.x = B_X;
  scene.add(stB);
  const PIV_Y = 0.62;
  const fulcrumGeo = new THREE.CylinderGeometry(0.02, 0.32, 0.56, 3);
  const fulcrumMat = kit.mat(GREEN);
  kit.mesh(fulcrumGeo, fulcrumMat, [0, 0.28, 0], stB).rotation.y = Math.PI / 2;
  const beam = new THREE.Group();
  beam.position.y = PIV_Y;
  stB.add(beam);
  const plankTex = paint(THREE, 512, 48, (c, w, h) => {
    c.fillStyle = '#e9c46a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1d2b36'; c.strokeStyle = '#1d2b36'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 15px system-ui, sans-serif';
    for (let k = -22; k <= 22; k++) {
      const x = w / 2 + k * (w / 44), big = k % 5 === 0;
      c.lineWidth = big ? 2.5 : 1; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, big ? 18 : 9); c.stroke();
      if (big && k !== 0 && Math.abs(k) < 22) c.fillText(String(Math.abs(k) / 10), x, 32);
    }
  });
  const plankMats = [kit.mat(0xd4a373), kit.mat(0xd4a373), kit.mat(0xd4a373), kit.mat(0xd4a373), kit.mat(0xd4a373), kit.mat(0xd4a373)];
  plankMats[2] = kit.mat(0xffffff, { map: plankTex });
  kit.mesh(new THREE.BoxGeometry(SEE_L * 2, 0.08, 0.45), plankMats, [0, 0.04, 0], beam);
  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  const blockL = kit.mesh(blockGeo, kit.mat(0x3a86ff), [0, 0, 0], beam);
  const blockR = kit.mesh(blockGeo, kit.mat(0xfb8500), [0, 0, 0], beam);
  const tagL = label('3 kg', new THREE.Object3D()), tagR = label('2 kg', new THREE.Object3D());
  beam.add(tagL.at, tagR.at);
  const wL = arrow(RED, { radius: 0.03, head: 0.14 }), wR = arrow(RED, { radius: 0.03, head: 0.14 });
  const pivotTag = label('Pivot', new THREE.Vector3(B_X, 0.1, 0.45));

  // ---------- Station C: crowbar and rock ----------
  const stC = new THREE.Group();
  stC.position.x = C_X;
  scene.add(stC);
  const FUL_H = 0.095;
  kit.mesh(new THREE.BoxGeometry(0.16, FUL_H - 0.015, 0.16), kit.mat(0x6c757d, { roughness: 1 }), [0, (FUL_H - 0.015) / 2, 0], stC);
  const bar = new THREE.Group();
  bar.position.y = FUL_H;
  stC.add(bar);
  const steelMat = kit.mat(0x495057, { metalness: 0.6, roughness: 0.4 });
  const barGeo = new THREE.BoxGeometry(1, 0.03, 0.035);
  barGeo.translate(0.5, 0, 0);
  const barLong = kit.mesh(barGeo, steelMat, [0, 0, 0], bar);
  kit.mesh(new THREE.BoxGeometry(LOAD_ARM + 0.04, 0.03, 0.035), steelMat, [-(LOAD_ARM + 0.04) / 2, 0, 0], bar);
  const tipAt = new THREE.Object3D(); tipAt.position.x = -LOAD_ARM; bar.add(tipAt);
  const handAt = new THREE.Object3D(); bar.add(handAt);
  const fist = kit.mesh(new THREE.SphereGeometry(0.06, 14, 10), kit.mat(0xf1c27d), [0, 0, 0], stC);
  const rock = kit.mesh(stoneGeometry(THREE, 0.32, 0.26, 0.3, 3), kit.mat(0x8a817c, { flatShading: true, roughness: 1 }), [0, 0, 0], stC);
  const effortC = arrow(BLUE, { radius: 0.02, head: 0.09 }), loadC = arrow(RED, { radius: 0.02, head: 0.09 });
  const effortCTag = label('Effort', effortC.tip, { cls: 'cool' });
  const loadCTag = label('Load: 500 N', loadC.tip, { cls: 'warm' });
  const fulcrumCTag = label('Fulcrum', new THREE.Vector3(C_X + 0.02, 0.0, 0.12));

  // ---------- Station D: the three classes ----------
  const stD = new THREE.Group();
  stD.position.x = D_X;
  scene.add(stD);
  const LEV_Y = 0.9, LEV_L = 1.6;
  const fulD = kit.mesh(new THREE.CylinderGeometry(0.02, 0.22, LEV_Y - 0.02, 3), fulcrumMat, [0, (LEV_Y - 0.02) / 2, 0], stD);
  fulD.rotation.y = Math.PI / 2;
  const levG = new THREE.Group();
  stD.add(levG);
  const levBar = kit.mesh(new THREE.BoxGeometry(LEV_L * 2, 0.06, 0.2), kit.mat(0xd4a373), [0, 0.03, 0], levG);
  const loadBox = kit.mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), kit.mat(RED), [0, 0, 0], levG);
  const eAt = new THREE.Object3D(); levG.add(eAt);
  const effortD = arrow(BLUE, { radius: 0.035, head: 0.16 });
  const tagFD = label('Fulcrum', new THREE.Object3D());
  stD.add(tagFD.at);
  const tagED = label('Effort', effortD.tip, { cls: 'cool' });
  const tagLD = label('Load', new THREE.Object3D(), { cls: 'warm' });
  loadBox.add(tagLD.at); tagLD.at.position.y = 0.3;
  // Everyday examples, each with coloured dots: green fulcrum, blue effort, red load.
  const dotGeo = new THREE.SphereGeometry(0.06, 12, 8);
  const dotM = { f: new THREE.MeshBasicMaterial({ color: GREEN }), e: new THREE.MeshBasicMaterial({ color: BLUE }), l: new THREE.MeshBasicMaterial({ color: RED }) };
  const dots = (g, list) => list.forEach(([k, x, y, z = 0.08]) => { const d = new THREE.Mesh(dotGeo, dotM[k]); d.position.set(x, y, z); g.add(d); });
  const EX = new THREE.Vector3(3.2, 0.95, 0);
  const metal = kit.mat(0xadb5bd, { metalness: 0.7, roughness: 0.3 });
  const examples = [];
  { // Class 1: scissors
    const g = new THREE.Group();
    for (const s of [1, -1]) {
      const blade = new THREE.Group();
      blade.rotation.z = 0.22 * s;
      kit.mesh(new THREE.BoxGeometry(1.0, 0.07, 0.03), metal, [0.5, 0, 0.02 * s], blade);
      kit.mesh(new THREE.BoxGeometry(0.4, 0.06, 0.03), kit.mat(0xe63946), [-0.25, 0, 0.02 * s], blade);
      kit.mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 20), kit.mat(0xe63946), [-0.52, 0, 0.02 * s], blade);
      g.add(blade);
    }
    dots(g, [['f', 0, 0], ['e', -0.52, 0.12], ['l', 0.6, 0]]);
    examples.push({ g, name: 'Scissors' });
  }
  { // Class 2: wheelbarrow
    const g = new THREE.Group();
    const wheel = kit.mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 24), kit.mat(0x2b2d42), [0.75, -0.7, 0], g);
    wheel.rotation.x = Math.PI / 2;
    kit.mesh(new THREE.BoxGeometry(0.9, 0.32, 0.6), kit.mat(0x2a9d8f), [0.15, -0.28, 0], g);
    kit.mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0x7f5539, { roughness: 1 }), [0.15, -0.12, 0], g);
    for (const z of [-0.22, 0.22]) {
      const h = kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), kit.mat(0x8d5524), [-0.3, -0.35, z], g);
      h.rotation.z = Math.PI / 2 + 0.25;
      kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), kit.mat(0x8d5524), [-0.1, -0.75, z], g);
    }
    dots(g, [['f', 0.75, -0.7, 0.12], ['l', 0.15, 0.05, 0.32], ['e', -0.85, -0.2, 0.3]]);
    examples.push({ g, name: 'Wheelbarrow' });
  }
  { // Class 3: tweezers holding a bead
    const g = new THREE.Group();
    for (const s of [1, -1]) {
      const arm = kit.mesh(new THREE.BoxGeometry(1.35, 0.05, 0.12), metal, [0.05, 0.06 * s, 0], g);
      arm.rotation.z = -0.05 * s;
    }
    kit.mesh(new THREE.BoxGeometry(0.1, 0.17, 0.12), metal, [-0.62, 0, 0], g);
    kit.mesh(new THREE.SphereGeometry(0.05, 12, 8), kit.mat(0xffbe0b), [0.66, 0, 0], g);
    dots(g, [['f', -0.62, 0, 0.1], ['e', 0, 0.12, 0.1], ['l', 0.66, 0, 0.1]]);
    examples.push({ g, name: 'Tweezers' });
  }
  for (const ex of examples) {
    ex.g.position.copy(EX);
    stD.add(ex.g);
    const at = new THREE.Object3D(); at.position.y = 0.42; ex.g.add(at);
    ex.tag = label(ex.name, at);
  }
  // Positions of fulcrum, effort and load for each class (lever-relative x).
  const CLASSES = [
    { f: 0.1, e: -1.45, l: 1.3, eDir: -1 },
    { f: -1.45, e: 1.45, l: -0.3, eDir: 1 },
    { f: -1.45, e: -0.55, l: 1.3, eDir: 1 },
  ];

  // ---------- Station E: the forearm (1 unit = 10 cm) ----------
  const stE = new THREE.Group();
  stE.position.x = E_X;
  scene.add(stE);
  const ELB = new THREE.Vector3(0, 2.0, 0);
  const bone = kit.mat(0xf2e8cf, { roughness: 0.6 });
  kit.mesh(new THREE.CapsuleGeometry(0.17, 2.6, 4, 12), bone, [ELB.x, ELB.y + 1.5, -0.05], stE);
  kit.mesh(new THREE.SphereGeometry(0.28, 20, 14), kit.mat(GREEN), [ELB.x, ELB.y, 0], stE);
  kit.mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), kit.mat(0x6d597a), [0, 0.06, 0], stE);
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 8), kit.mat(0x5c6b77), [-0.3, 2.35, -0.35], stE);
  const fore = new THREE.Group();
  fore.position.copy(ELB);
  stE.add(fore);
  kit.mesh(new THREE.CapsuleGeometry(0.15, 2.7, 4, 12), bone, [1.55, 0, 0.05], fore).rotation.z = Math.PI / 2;
  kit.mesh(new THREE.CapsuleGeometry(0.12, 2.6, 4, 12), bone, [1.55, -0.05, -0.12], fore).rotation.z = Math.PI / 2;
  kit.mesh(new THREE.BoxGeometry(0.6, 0.18, 0.5), kit.mat(0xf1c27d), [3.3, 0.02, 0], fore);
  const ballE = kit.mesh(new THREE.SphereGeometry(1, 20, 14), kit.mat(0xe63946), [ARM_LOAD * 10, 0.3, 0], fore);
  const insAt = new THREE.Object3D(); insAt.position.set(ARM_BICEPS * 10, 0.16, 0); fore.add(insAt);
  const SHOULDER = new THREE.Vector3(0.28, 4.6, 0.05);
  const muscle = kit.mesh(new THREE.CapsuleGeometry(0.17, 1, 4, 12), kit.mat(0xc1121f, { roughness: 0.55 }), [0, 0, 0], stE);
  const effortE = arrow(BLUE, { radius: 0.05, head: 0.22 }), loadE = arrow(RED, { radius: 0.05, head: 0.22 });
  const elbowTag = label('Elbow (fulcrum)', new THREE.Vector3(E_X - 0.2, ELB.y - 0.55, 0.3));
  const bicepsTag = label('Biceps (effort)', new THREE.Vector3(E_X + 0.5, 4.0, 0.3), { cls: 'cool' });
  const loadETag = label('Load', loadE.tip, { cls: 'warm' });

  // ---------- State ----------
  const st = {
    step: 0, quiz: false, time: 0, plan: [], slider: null, auto: false,
    F: 20, d: 0.15, ang: 90, doorA: 0, m2: 2, d2: 1.0, tilt: 0, dE: 1.2, cls: 0, mass: 2,
  };
  const allTags = [closerTag, hingeTag, pullTag, dTag, tagL, tagR, pivotTag, effortCTag, loadCTag, fulcrumCTag, tagFD, tagED, tagLD, ...examples.map(e => e.tag), elbowTag, bicepsTag, loadETag];
  function hideAll() {
    allTags.forEach(l => l.show(false));
    for (const a of [wL, wR, effortC, loadC, effortD, effortE, loadE]) a.visible = false;
    pull.visible = false; lineOfAction.visible = false; dBar.visible = false;
  }

  // ---------- Door ----------
  const P = new THREE.Vector3(), dir = new THREE.Vector3(), foot = new THREE.Vector3(), H = new THREE.Vector3(0, 1.0, 0.03);
  const doorMoment = () => st.F * st.d * Math.sin(st.ang * DEGR);
  function layoutDoor() {
    const th = st.ang * DEGR;
    P.set(st.d, 1.0, 0.03);
    dir.set(-Math.cos(th), 0, Math.sin(th));
    pull.point(P.x, P.y, P.z, dir.x, dir.y, dir.z, st.F * 0.025);
    pullAt.position.copy(P).addScaledVector(dir, st.F * 0.025); pullAt.position.y -= 0.26;
    foot.copy(P).addScaledVector(dir, st.d * Math.cos(th));
    dBar.between(H, foot);
    dAt.position.copy(H).lerp(foot, 0.3); dAt.position.y += 0.1;
    const showLine = st.step === 1;
    lineOfAction.visible = showLine;
    if (showLine) lineOfAction.set(tmp2.copy(P).addScaledVector(dir, -0.25), tmp.copy(foot).addScaledVector(dir, 0.35));
    const M = doorMoment(), dp = st.d * Math.sin(th), opens = M >= DOOR_NEED - 1e-9;
    if (st.step === 0) ui.readout(`Moment = F × d = ${st.F} N × ${fmt(st.d, 2)} m = <b>${fmt(M, 1)} N·m</b><br>The closer needs ${DOOR_NEED} N·m: the door <b>${opens ? 'opens' : 'stays shut'}</b>`);
    else ui.readout(`Perpendicular distance d⊥ = <b>${fmt(dp, 2)} m</b> · Moment = F × d⊥ = ${st.F} N × ${fmt(dp, 2)} m = <b>${fmt(M, 1)} N·m</b><br>The door <b>${opens ? 'opens' : 'stays shut'}</b> (it needs ${DOOR_NEED} N·m)`);
  }

  // ---------- See-saw ----------
  const sizeFor = m => 0.17 * Math.cbrt(m);
  function layoutSeesaw() {
    const sL = sizeFor(M1), sR = sizeFor(st.m2);
    blockL.scale.setScalar(sL); blockL.position.set(-D1, 0.08 + sL / 2, 0);
    blockR.scale.setScalar(sR); blockR.position.set(st.d2, 0.08 + sR / 2, 0);
    tagL.at.position.set(-D1, 0.12 + sL + 0.05, 0);
    tagR.at.position.set(st.d2, 0.12 + sR + 0.05, 0);
    tagR.text = `${st.m2} kg`;
    const Ma = M1 * G * D1, Mc = st.m2 * G * st.d2, diff = Ma - Mc;
    st.tiltTo = Math.abs(diff) < 0.05 ? 0 : (diff > 0 ? 0.24 : -0.24);
    const res = Math.abs(diff) < 0.05 ? '<b>Balanced!</b> The moments are equal.' : diff > 0 ? 'Anticlockwise is bigger: the <b>left side goes down</b>.' : 'Clockwise is bigger: the <b>right side goes down</b>.';
    ui.readout(`Anticlockwise: ${M1 * G} N × ${fmt(D1, 1)} m = <b>${fmt(Ma, 0)} N·m</b> · Clockwise: ${st.m2 * G} N × ${fmt(st.d2, 1)} m = <b>${fmt(Mc, 0)} N·m</b><br>${res}`);
  }

  // ---------- Crowbar ----------
  function layoutCrowbar() {
    barLong.scale.x = st.dE + 0.04;
    handAt.position.x = st.dE;
    const F = ROCK * G * LOAD_ARM / st.dE, ratio = String(+(st.dE / LOAD_ARM).toFixed(1));
    effortCTag.text = `Effort: ${Math.round(F)} N`;
    ui.readout(`Effort = load × load arm ÷ effort arm = 500 N × 0.2 m ÷ ${fmt(st.dE, 1)} m = <b>${Math.round(F)} N</b><br>The effort is only <b>1/${ratio}</b> of the load, but your hand moves <b>${ratio}×</b> as far as the rock rises`);
  }

  // ---------- Classes ----------
  const CLASS_TEXT = [
    '<b>Class 1:</b> the fulcrum is between the effort and the load. Examples: see-saw, scissors, crowbar.',
    '<b>Class 2:</b> the load is between the fulcrum and the effort. Examples: wheelbarrow, nutcracker, bottle opener. You need less force than the load.',
    '<b>Class 3:</b> the effort is between the fulcrum and the load. Examples: tweezers, fishing rod, your forearm. You need more force, but the load moves farther.',
  ];
  function setClass(c) {
    st.cls = c;
    const k = CLASSES[c];
    fulD.position.x = k.f;
    levG.position.set(k.f, LEV_Y, 0);
    levBar.position.x = -k.f;
    loadBox.position.set(k.l - k.f, 0.06 + 0.17, 0);
    eAt.position.set(k.e - k.f, 0.06, 0);
    tagFD.at.position.set(k.f, 0.35, 0.3);
    examples.forEach((ex, j) => { ex.g.visible = j === c; ex.tag.show(j === c); });
    ui.readout(CLASS_TEXT[c]);
  }

  function layoutArm() {
    ballE.scale.setScalar(0.17 * Math.cbrt(st.mass));
    ballE.position.y = 0.11 + 0.17 * Math.cbrt(st.mass);
    const W = st.mass * G, Mload = W * ARM_LOAD, Fb = Mload / ARM_BICEPS;
    ui.readout(`Load moment = ${W} N × ${ARM_LOAD} m = <b>${fmt(Mload, 1)} N·m</b><br>Biceps force = ${fmt(Mload, 1)} N·m ÷ ${ARM_BICEPS} m = <b>${Math.round(Fb)} N</b> (${fmt(ARM_LOAD / ARM_BICEPS, 0)} times the load)`);
  }

  const demoSet = (key, v, fn) => { st[key] = v; st.slider?.set(v); fn(); };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? 6 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.slider = null; st.auto = false;
      hideAll();
      for (const ex of examples) ex.g.visible = false;
      if (i === 0 || i === 1) {
        moveSun(A_X);
        view({ radius: 1.5, yaw: 0.45, pitch: 0.35, target: [A_X - 0.05, 1.0, 0.3] });
        st.doorA = 0; door.rotation.y = 0;
        pull.visible = true; hingeTag.show(true); closerTag.show(true); pullTag.show(true); dTag.show(true);
        st.F = 20;
        if (i === 0) {
          st.ang = 90; st.d = 0.15; dTag.text = 'd';
          ui.slider({ label: 'Force', min: 5, max: 40, step: 1, value: st.F, unit: ' N', onInput: v => { st.plan = []; st.F = v; layoutDoor(); } });
          st.slider = ui.slider({ label: 'Distance from the hinge', min: 0.1, max: 0.85, step: 0.05, value: st.d, unit: ' m', format: v => v.toFixed(2), onInput: v => { st.plan = []; st.d = v; layoutDoor(); } });
          st.plan = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((d, j) => [0.6 + j * 0.15, () => demoSet('d', d, layoutDoor)]);
        } else {
          st.ang = 10; st.d = 0.8; dTag.text = 'd⊥';
          st.slider = ui.slider({ label: 'Angle between force and door', min: 0, max: 90, step: 5, value: st.ang, unit: '°', onInput: v => { st.plan = []; st.ang = v; layoutDoor(); } });
          st.plan = [20, 30, 45, 60, 75, 90].map((a, j) => [0.6 + j * 0.15, () => demoSet('ang', a, layoutDoor)]);
        }
        layoutDoor();
      }
      if (i === 2) {
        moveSun(B_X);
        view({ radius: 1.6, width: 2.5, yaw: 0, pitch: 0.18, target: [B_X, 0.75, 0] });
        tagL.show(true); tagR.show(true); pivotTag.show(true);
        st.m2 = 2; st.d2 = 1.0; st.tilt = 0.24;
        ui.slider({ label: 'Right mass', min: 1, max: 6, step: 1, value: st.m2, unit: ' kg', onInput: v => { st.plan = []; st.m2 = v; layoutSeesaw(); } });
        st.slider = ui.slider({ label: 'Right distance from pivot', min: 0.2, max: 2.0, step: 0.1, value: st.d2, unit: ' m', format: v => v.toFixed(1), onInput: v => { st.plan = []; st.d2 = v; layoutSeesaw(); } });
        st.plan = [1.1, 1.2, 1.3, 1.4, 1.5].map((d, j) => [0.6 + j * 0.2, () => demoSet('d2', d, layoutSeesaw)]);
        layoutSeesaw();
      }
      if (i === 3) {
        moveSun(C_X);
        view({ radius: 1.0, width: 1.2, yaw: 0.2, pitch: 0.2, target: [C_X + 0.35, 0.6, 0] });
        effortCTag.show(true); loadCTag.show(true); fulcrumCTag.show(true);
        st.dE = 0.6;
        st.slider = ui.slider({ label: 'Effort arm (fulcrum to hand)', min: 0.4, max: 1.6, step: 0.1, value: st.dE, unit: ' m', format: v => v.toFixed(1), onInput: v => { st.plan = []; st.dE = v; layoutCrowbar(); } });
        st.plan = [0.8, 1.0, 1.2].map((d, j) => [0.6 + j * 0.3, () => demoSet('dE', d, layoutCrowbar)]);
        layoutCrowbar();
      }
      if (i === 4) {
        moveSun(D_X);
        view({ radius: 1.9, width: 3.0, yaw: 0.1, pitch: 0.2, target: [D_X + 1.25, 0.95, 0] });
        tagFD.show(true); tagED.show(true); tagLD.show(true);
        st.auto = true;
        const row = ui.buttons(['Class 1', 'Class 2', 'Class 3'].map((t, j) => ({ label: t, on: j === 0, onClick: () => { st.auto = false; setClass(j); } })));
        st.row = row;
        setClass(0);
      }
      if (i === 5) {
        moveSun(E_X);
        view({ radius: 2.6, width: 2.6, yaw: 0.35, pitch: 0.15, target: [E_X + 1.6, 2.8, 0] });
        elbowTag.show(true); bicepsTag.show(true); loadETag.show(true);
        st.mass = 2;
        st.slider = ui.slider({ label: 'Mass in the hand', min: 1, max: 5, step: 1, value: st.mass, unit: ' kg', onInput: v => { st.mass = v; layoutArm(); } });
        layoutArm();
      }
      if (isQuiz) {
        moveSun(B_X);
        view({ radius: 1.7, width: 2.6, yaw: -0.35, pitch: 0.3, target: [B_X, 0.7, 0] });
        tagL.show(true); tagR.show(true);
        st.m2 = 2; st.d2 = 1.5; st.tilt = 0; layoutSeesaw();
        ui.readout('');
      }
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step;
      if (s === 0 || s === 1) {
        const open = doorMoment() >= DOOR_NEED - 1e-9;
        kit.follow(st, 'doorA', open ? 0.45 : 0, dt, 2.2);
        door.rotation.y = -st.doorA;
      }
      if (s === 2 || s === 6) {
        kit.follow(st, 'tilt', st.tiltTo, dt, 3);
        beam.rotation.z = st.tilt;
        beam.updateMatrixWorld();
        for (const [blk, arr, m] of [[blockL, wL, M1], [blockR, wR, st.m2]]) {
          blk.getWorldPosition(tmp2);
          arr.point(tmp2.x, tmp2.y, tmp2.z + 0.3, 0, -1, 0, m * G * 0.018, 0.2);
        }
      }
      if (s === 3) {
        // Push down for 1.5 s, let up for 1.5 s.
        const c = (st.time % 3) / 3, push = c < 0.5 ? kit.ease(c * 2) : kit.ease(2 - c * 2);
        const phi = kit.lerp(0.49, 0.2, push);
        bar.rotation.z = phi;
        bar.updateMatrixWorld();
        tipAt.getWorldPosition(tmp);
        const lift = Math.max(0, tmp.y);
        rock.position.set(-LOAD_ARM - 0.18, 0.24 + lift, 0);
        rock.rotation.z = -lift * 1.5;
        handAt.getWorldPosition(tmp2);
        fist.position.set(tmp2.x - C_X, tmp2.y + 0.07, 0);
        const F = ROCK * G * LOAD_ARM / st.dE;
        effortC.point(tmp2.x, tmp2.y + 0.13 + F * 0.002, 0, 0, -1, 0, F * 0.002, 0.12);
        loadC.point(rock.position.x + C_X - 0.05, rock.position.y + 0.3 + 1.0, 0.05, 0, -1, 0, 1.0, 0.2);
      }
      if (s === 4) {
        if (st.auto) {
          const c = Math.min(2, Math.floor(st.time / 3.2) % 3);
          if (c !== st.cls) { setClass(c); st.row?.select(c); }
        }
        const k = CLASSES[st.cls], psi = 0.07 * (0.5 + 0.5 * Math.sin(st.time * 2.4));
        levG.rotation.z = psi;
        levG.updateMatrixWorld();
        eAt.getWorldPosition(tmp);
        const len = 0.55;
        if (k.eDir < 0) effortD.point(tmp.x, tmp.y + 0.03 + len, tmp.z, 0, -1, 0, len, 0.2);
        else effortD.point(tmp.x, tmp.y - len, tmp.z, 0, 1, 0, len - 0.01, 0.2);
      }
      if (s === 5) {
        const a = 0.35 * (0.5 - 0.5 * Math.cos(st.time * 1.2));
        fore.rotation.z = a;
        fore.updateMatrixWorld();
        insAt.getWorldPosition(tmp);
        tmp.x -= E_X;
        tmp2.subVectors(SHOULDER, tmp);
        const L = tmp2.length();
        muscle.position.copy(tmp).addScaledVector(tmp2, 0.5);
        muscle.quaternion.setFromUnitVectors(up, tmp2.multiplyScalar(1 / L));
        muscle.scale.set(1 + 0.25 * a, Math.max(0.2, L - 0.5), 1 + 0.25 * a);
        const W = st.mass * G, Fb = W * ARM_LOAD / ARM_BICEPS;
        effortE.point(tmp.x + E_X + 0.45, tmp.y, 0.35, 0, 1, 0, Fb * 0.007, -0.25);
        ballE.getWorldPosition(tmp2);
        loadE.point(tmp2.x, tmp2.y - 0.25, tmp2.z + 0.3, 0, -1, 0, Math.max(0.12, W * 0.007), 0.3);
      }
      return true;
    },
  };
}

const DEGR = Math.PI / 180;
