// Magnets and magnetic fields. Station A: two bar magnets attract or repel with force arrows that grow as the
// gap closes, then the field pattern between them (N–S and N–N). Station B: one bar magnet on paper, iron
// filings and small compasses show its field. Station C: which materials a magnet picks up. Station D: Earth
// as a giant magnet with a compass on its surface. Station E: making a magnet by stroking a steel bar (the
// tiny domains line up). World units: 1 unit = 5 cm on the tables.
import { makeArrow, rand, paint } from '../_shared/lab.js';
import { barMagnet, compass, poleField, magnetPoles, traceLines, allLines, lineGroup, filings, aimAngle, turnToward } from '../_shared/magnets.js';

const A_X = 0, B_X = 12, C_X = 24, D_X = 36, E_X = 48;
const DEG = Math.PI / 180;
const L = 2;                 // bar magnet length (10 cm)
const CM = 0.2;              // world units per cm

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xd9d4c7, sky: 0xe3edf6, radius: 40 });
  ground.position.x = 24;
  const sun = kit.lights(scene, { sun: [4, 10, 6] });
  scene.add(sun.target);
  const moveSun = x => { sun.position.set(x + 4, 10, 6); sun.target.position.set(x, 0, 0); };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const board = (w, d, x, color = 0xb98b5e) => {
    const m = kit.mesh(new THREE.BoxGeometry(w, 0.12, d), kit.mat(color, { roughness: 0.8 }), [x, 0.06, 0], scene);
    m.castShadow = false;
    return m;
  };
  const paper = (w, d, x) => {
    const m = kit.mesh(new THREE.PlaneGeometry(w, d), kit.mat(0xfbfaf4, { roughness: 0.95 }), [x, 0.125, 0], scene);
    m.rotation.x = -Math.PI / 2; m.castShadow = false;
    return m;
  };
  const MY = 0.12 + 0.16;    // centre height of a magnet lying on a board

  // ---------- Station A: two magnets ----------
  board(9, 3.4, A_X);
  const paperA = paper(8.4, 3.0, A_X);
  const magL = barMagnet(THREE, kit, { length: L }), magR = barMagnet(THREE, kit, { length: L });
  scene.add(magL, magR);
  const fL = makeArrow(THREE, 0x7b2cbf, { radius: 0.06, head: 0.26 }), fR = makeArrow(THREE, 0x7b2cbf, { radius: 0.06, head: 0.26 });
  scene.add(fL, fR);
  const fTag = label('Force', fL.tip, { cls: 'big' });
  const fTag2 = label('Force', fR.tip, { cls: 'big' });
  const st = { step: 0, time: 0, mode: 'NS', gap: 4, auto: true, slider: null, quiz: false };
  function placePair(gapCm) {
    const g = gapCm * CM, x = g / 2 + L / 2;
    magL.position.set(A_X - x, MY, 0);
    magR.position.set(A_X + x, MY, 0);
    magL.rotation.y = 0;                                   // N end faces right
    magR.rotation.y = st.mode === 'NS' ? 0 : Math.PI;      // NS: its S end faces left; NN: its N end faces left
  }
  const strength = gapCm => 1 / (1 + (gapCm / 2.2) ** 2);  // qualitative: grows quickly as the gap closes
  function forceArrows() {
    const attract = st.mode === 'NS', s = strength(st.gap), len = 0.25 + 1.9 * s;
    const xl = magL.position.x, xr = magR.position.x, y = MY + 0.75;
    if (attract) { fL.point(xl - len / 2, y, 0, 1, 0, 0, len, 0.3); fR.point(xr + len / 2, y, 0, -1, 0, 0, len, 0.3); }
    else { fL.point(xl + len / 2, y, 0, -1, 0, 0, len, 0.3); fR.point(xr - len / 2, y, 0, 1, 0, 0, len, 0.3); }
  }
  function pairReadout() {
    const s = strength(st.gap), word = s > 0.6 ? 'very strong' : s > 0.3 ? 'strong' : s > 0.12 ? 'medium' : 'weak';
    const what = st.mode === 'NS' ? 'Unlike poles (N and S) <b>attract</b>' : 'Like poles (N and N) <b>repel</b>';
    ui.readout(`Gap: <b>${Math.round(st.gap * 10) / 10} cm</b> · ${what}. Force: <b>${word}</b>`);
  }

  // Field patterns between the two magnets (step 3), worked out once for a 2 cm gap.
  const PAIR_GAP = 2;
  const toA = (u, v, out) => out.set(A_X + u, 0.14, v);
  const pairPoles = { NS: [], NN: [] };
  {
    const x = PAIR_GAP * CM / 2 + L / 2;
    magnetPoles(pairPoles.NS, L, -x, 0, 0); magnetPoles(pairPoles.NS, L, x, 0, 0);
    magnetPoles(pairPoles.NN, L, -x, 0, 0); magnetPoles(pairPoles.NN, L, x, 0, Math.PI);
  }
  const pairLines = {}, pairFilings = {};
  for (const mode of ['NS', 'NN']) {
    const poles = pairPoles[mode];
    // Seed angles point out of each pole's own end of its magnet.
    const ends = mode === 'NS' ? [0, Math.PI, 0, Math.PI] : [0, Math.PI, Math.PI, 0];
    const { lines, dirs } = allLines(poles, p => { const out = ends[poles.indexOf(p)]; return [-80, -55, -35, -18, 0, 18, 35, 55, 80].map(a => out + a * DEG); }, { bu: 4.1, bv: 1.45, stopR: 0.12 });
    pairLines[mode] = lineGroup(THREE, lines, toA, { color: 0x1d3557, radius: 0.016, arrows: 1, dirs });
    pairLines[mode].visible = false;
    scene.add(pairLines[mode]);
    const skip = (u, v) => Math.abs(v) < 0.3 && (Math.abs(Math.abs(u) - (PAIR_GAP * CM / 2 + L / 2)) < L / 2 + 0.05);
    pairFilings[mode] = filings(THREE, poles, toA, rand, { count: 900, u0: -4.1, u1: 4.1, v0: -1.45, v1: 1.45, skip, seed: mode === 'NS' ? 100 : 9000, size: 0.12 });
    pairFilings[mode].visible = false;
    pairFilings[mode].settle(1);
    scene.add(pairFilings[mode]);
  }
  const neutralAt = new THREE.Object3D(); neutralAt.position.set(A_X, 0.2, 0); scene.add(neutralAt);
  const neutralTag = label('Neutral point', neutralAt, { cls: 'warm' });
  const gapAt = new THREE.Object3D(); gapAt.position.set(A_X, 0.2, 0.7); scene.add(gapAt);
  const gapTag = label('Lines join up', gapAt, { cls: 'cool' });

  // ---------- Station B: one magnet on paper ----------
  board(7, 4.6, B_X);
  paper(6.6, 4.2, B_X);
  const magB = barMagnet(THREE, kit, { length: L });
  magB.position.set(B_X, MY, 0);
  scene.add(magB);
  const nTagB = label('N pole', magB.nEnd, { cls: 'warm' });
  const sTagB = label('S pole', magB.sEnd, { cls: 'cool' });
  const polesB = magnetPoles([], L, 0, 0, 0);
  const toB = (u, v, out) => out.set(B_X + u, 0.14, v);
  const linesB = (() => {
    const { lines, dirs } = allLines(polesB, p => [-150, -120, -90, -65, -42, -20, 0, 20, 42, 65, 90, 120, 150].map(a => (p.q > 0 ? 0 : Math.PI) + a * DEG), { bu: 3.25, bv: 2.05 });
    return lineGroup(THREE, lines, toB, { color: 0x1d3557, radius: 0.016, arrows: 1, dirs });
  })();
  linesB.visible = false;
  scene.add(linesB);
  const skipB = (u, v) => Math.abs(v) < 0.3 && Math.abs(u) < L / 2 + 0.05;
  const filB = filings(THREE, polesB, toB, rand, { count: 1300, u0: -3.2, u1: 3.2, v0: -2.0, v1: 2.0, skip: skipB, seed: 500, size: 0.13 });
  filB.visible = false;
  scene.add(filB);
  const crowdAt = new THREE.Object3D(); crowdAt.position.set(B_X + 1.35, 0.15, 0.55); scene.add(crowdAt);
  const crowdTag = label('Crowded at the poles', crowdAt);
  // Small fixed compasses around the magnet and one big compass that the slider moves.
  const fB = { u: 0, v: 0 };
  const smallC = [];
  for (const [u, v] of [[-2.6, 0], [2.6, 0], [-2.1, 1.0], [2.1, 1.0], [-2.1, -1.0], [2.1, -1.0], [-1, 1.25], [0, 1.4], [1, 1.25], [-1, -1.25], [0, -1.4], [1, -1.25], [-2.8, 1.7], [2.8, 1.7], [-2.8, -1.7], [2.8, -1.7]]) {
    const c = compass(THREE, kit, { r: 0.2 });
    c.position.set(B_X + u, 0.125, v);
    poleField(polesB, u, v, fB);
    c.target = aimAngle(fB.u, fB.v);
    c.visible = false;
    scene.add(c); smallC.push(c);
  }
  const bigC = compass(THREE, kit, { r: 0.34 });
  bigC.visible = false;
  scene.add(bigC);
  const bigTag = label('Compass', new THREE.Object3D());
  bigC.add(bigTag.at); bigTag.at.position.set(0, 0.25, 0);
  const loop = p => { const a = p * Math.PI * 2; return [2.15 * Math.cos(a), -1.25 * Math.sin(a)]; };

  // ---------- Station C: magnetic and non-magnetic materials ----------
  board(8.6, 2.6, C_X, 0x8d6e53);
  const SAMPLES = [
    { name: 'Iron', mag: true, make: () => rod(0x6c757d, 0.07, 0.7) },
    { name: 'Copper', mag: false, make: () => rod(0xc8743a, 0.06, 0.7, 0.4) },
    { name: 'Steel', mag: true, make: () => clip(0xadb5bd) },
    { name: 'Plastic', mag: false, make: () => block(0x52b788, 0.4, 0.22, 0.3) },
    { name: 'Nickel', mag: true, make: () => disc(0xced4da) },
    { name: 'Aluminium', mag: false, make: () => can() },
    { name: 'Cobalt', mag: true, make: () => block(0x6d7a8a, 0.34, 0.2, 0.3, 0.6) },
    { name: 'Wood', mag: false, make: () => block(0xc69c6d, 0.45, 0.2, 0.3) },
  ];
  function rod(color, r, len, metal = 0.6) { const g = new THREE.Group(); kit.mesh(new THREE.CylinderGeometry(r, r, len, 12), kit.mat(color, { metalness: metal, roughness: 0.35 }), [0, r, 0], g).rotation.z = Math.PI / 2; g.h = r * 2; return g; }
  function clip(color) {
    const g = new THREE.Group(), m = kit.mat(color, { metalness: 0.7, roughness: 0.3 });
    const t = kit.mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 20), m, [0, 0.02, 0], g); t.rotation.x = Math.PI / 2; t.scale.set(1.9, 1, 1);
    const t2 = kit.mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 20), m, [0.03, 0.03, 0], g); t2.rotation.x = Math.PI / 2; t2.scale.set(2.1, 1, 1);
    g.h = 0.05; return g;
  }
  function disc(color) { const g = new THREE.Group(); kit.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20), kit.mat(color, { metalness: 0.8, roughness: 0.25 }), [0, 0.025, 0], g); g.h = 0.05; return g; }
  function block(color, w, h, d, metal = 0) { const g = new THREE.Group(); kit.mesh(new THREE.BoxGeometry(w, h, d), kit.mat(color, { metalness: metal, roughness: 0.5 }), [0, h / 2, 0], g); g.h = h; return g; }
  function can() { const g = new THREE.Group(); kit.mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 18), kit.mat(0xdee2e6, { metalness: 0.7, roughness: 0.25 }), [0, 0.2, 0], g); g.h = 0.4; return g; }
  const sampleX = i => C_X - 3.5 + i * 1.0;
  const lift = new THREE.Group();                 // long magnet that the slider lowers over the row
  scene.add(lift);
  const longMag = barMagnet(THREE, kit, { length: 8.2, width: 0.4, height: 0.36 });
  lift.add(longMag);
  for (const x of [-3.6, 3.6]) kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), kit.mat(0x495057, { metalness: 0.5 }), [x, 0.98, 0], lift);
  SAMPLES.forEach((s, i) => {
    s.g = s.make();
    s.g.position.set(sampleX(i), 0.12, 0);
    scene.add(s.g);
    s.anchor = new THREE.Object3D();         // name tags along the front edge of the board, in two rows
    scene.add(s.anchor);
    s.anchor.position.set(sampleX(i), i % 2 ? -0.3 : 0.05, 1.35);
    s.tag = label(s.name, s.anchor, { cls: s.mag ? 'warm' : '' });
    s.y = 0.12; s.stuck = false;
  });
  const lowY = h => 0.12 + 0.42 + 0.18 + h * CM;   // magnet centre for a gap of h cm above the tallest sample
  st.height = 8;

  // ---------- Station D: Earth as a giant magnet ----------
  const EY = 2.9, R = 1.3, TILT = 11 * DEG;       // magnetic axis tilted about 11° from the spin axis
  const earthTex = paint(THREE, 512, 256, (g, w, h) => {
    g.fillStyle = '#2f7fc1'; g.fillRect(0, 0, w, h);
    const X = lon => (lon + 180) / 360 * w, Y = lat => (90 - lat) / 180 * h;
    const land = [[-100, 47, 32, 18], [-112, 30, 14, 12], [-60, -15, 15, 22], [-68, 5, 10, 8], [15, 50, 18, 9], [20, 5, 20, 20], [25, -20, 12, 12], [90, 50, 50, 16], [100, 30, 25, 12], [78, 20, 9, 10], [110, 5, 12, 6], [135, -25, 17, 10], [-42, 72, 12, 7]];
    g.fillStyle = '#5a9e4b';
    for (const [lo, la, rw, rh] of land) { g.beginPath(); g.ellipse(X(lo), Y(la), rw / 360 * w, rh / 180 * h, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#f1f5f9'; g.fillRect(0, Y(-70), w, h - Y(-70)); g.fillRect(0, 0, w, Y(80));
  });
  const earthMat = new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.8, transparent: true, opacity: 1 });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), earthMat);
  earth.position.set(D_X, EY, 0);
  earth.rotation.y = -1.2;
  scene.add(earth);
  const axis = kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, R * 2 + 0.9, 8), kit.mat(0x6c757d), [D_X, EY, 0], scene);
  axis.castShadow = false;
  const geoN = new THREE.Object3D(); geoN.position.set(D_X, EY + R + 0.45, 0); scene.add(geoN);
  const geoNTag = label('Geographic North Pole', geoN, { cls: 'big' });
  const geoS = new THREE.Object3D(); geoS.position.set(D_X, EY - R - 0.62, 0); scene.add(geoS);
  const geoSTag = label('Geographic South Pole', geoS);
  // The imaginary bar magnet inside: its S end points up near the geographic North Pole.
  const inner = barMagnet(THREE, kit, { length: R * 1.3, width: 0.3, height: 0.3 });
  inner.position.set(D_X, EY, 0);
  inner.rotation.z = -Math.PI / 2 + TILT;     // N end (local +x) points down, tilted a little
  scene.add(inner);
  const magS = new THREE.Object3D(); inner.add(magS); magS.position.set(-R * 0.65 - 0.05, 0, 0.2);
  const magSTag = label('Magnetic S pole', magS, { cls: 'cool' });
  // Field lines in the x–y plane: poles inside Earth along the tilted axis, traced from the surface.
  const mAxis = { u: Math.sin(TILT), v: -Math.cos(TILT) };   // direction to the magnet's N end
  const ePoles = [{ u: mAxis.u * 0.45 * R, v: mAxis.v * 0.45 * R, q: 1 }, { u: -mAxis.u * 0.45 * R, v: -mAxis.v * 0.45 * R, q: -1 }];
  const eSeeds = [];
  const perp = { u: -mAxis.v, v: mAxis.u };
  for (const side of [-1, 1]) for (const phi of [38, 48, 60, 74]) {
    const c = Math.cos(phi * DEG), s = Math.sin(phi * DEG) * side;
    eSeeds.push([(mAxis.u * c + perp.u * s) * R * 1.01, (mAxis.v * c + perp.v * s) * R * 1.01, 1]);
  }
  const eLines = lineGroup(THREE, traceLines(ePoles, eSeeds, { bu: 4.4, bv: 2.75, step: 0.03, stop: (u, v) => u * u + v * v < R * R }),
    (u, v, out) => out.set(D_X + u, EY + v, -0.02), { color: 0xc1121f, radius: 0.016, arrows: 1, arrowSize: 0.11 });
  scene.add(eLines);
  // Compass on the front of the globe, moved by latitude.
  const eC = compass(THREE, kit, { r: 0.36 });
  scene.add(eC);
  const eCTag = label('Compass', new THREE.Object3D());
  eC.add(eCTag.at); eCTag.at.position.set(0, 0.3, 0);
  const ep = new THREE.Vector3(), en = new THREE.Vector3(), eb = new THREE.Vector3(), ex = new THREE.Vector3(), ez = new THREE.Vector3(), em = new THREE.Matrix4();
  const pole3 = ePoles.map(p => new THREE.Vector3(p.u, p.v, 0));
  st.lat = 35;
  function placeEarthCompass(latDeg) {
    const a = latDeg * DEG;
    en.set(0, Math.sin(a), Math.cos(a));                 // outward normal on the front meridian
    ep.copy(en).multiplyScalar(R + 0.01);
    eb.set(0, 0, 0);
    for (let i = 0; i < 2; i++) {                        // 3D field from the two model poles
      ex.subVectors(ep, pole3[i]);
      const r = ex.length();
      eb.addScaledVector(ex, ePoles[i].q / (r * r * r));
    }
    eb.addScaledVector(en, -eb.dot(en)).normalize();     // the part along the ground: where the needle points
    ez.crossVectors(eb, en);
    em.makeBasis(eb, en, ez);
    eC.quaternion.setFromRotationMatrix(em);
    eC.position.set(D_X, EY, 0).add(ep);
    eC.angle(0);
  }

  // ---------- Station E: making a magnet ----------
  board(6, 3, E_X);
  const BAR = { l: 4, w: 0.7, h: 0.22 };
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa5b1, metalness: 0.6, roughness: 0.35, transparent: true, opacity: 0.85 });
  const bar = kit.mesh(new THREE.BoxGeometry(BAR.l, BAR.h, BAR.w), steelMat, [E_X, 0.12 + BAR.h / 2, 0.3], scene);
  const barTop = 0.12 + BAR.h;
  // Domains: a grid of small flat arrows on the bar. Each turns from its own direction toward −x.
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0.11, 0); arrowShape.lineTo(-0.01, 0.07); arrowShape.lineTo(-0.01, 0.025); arrowShape.lineTo(-0.1, 0.025);
  arrowShape.lineTo(-0.1, -0.025); arrowShape.lineTo(-0.01, -0.025); arrowShape.lineTo(-0.01, -0.07); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const COLS = 13, ROWS = 3, ND = COLS * ROWS;
  const dom = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0x7b2cbf, side: THREE.DoubleSide }), ND);
  dom.frustumCulled = false;
  scene.add(dom);
  const dAng = new Float32Array(ND), dHome = new Float32Array(ND), dPos = [];
  for (let i = 0; i < ND; i++) {
    const c = i % COLS, r = Math.floor(i / COLS);
    dPos.push(V(E_X - BAR.l / 2 + 0.17 + c * (BAR.l - 0.34) / (COLS - 1), barTop + 0.004, 0.3 + (r - 1) * 0.21));
    dHome[i] = rand(i * 7 + 1) * Math.PI * 2;
  }
  const m4 = new THREE.Matrix4(), dq = new THREE.Quaternion(), one = V(1, 1, 1), yAxis = V(0, 1, 0);
  function drawDomains() {
    for (let i = 0; i < ND; i++) { dq.setFromAxisAngle(yAxis, dAng[i]); dom.setMatrixAt(i, m4.compose(dPos[i], dq, one)); }
    dom.instanceMatrix.needsUpdate = true;
  }
  const lined = () => { let s = 0; for (let i = 0; i < ND; i++) s += Math.cos(dAng[i] - Math.PI); return Math.max(0, s / ND); };
  const stroker = barMagnet(THREE, kit, { length: 1.4, width: 0.4, height: 0.26 });
  scene.add(stroker);
  const strokeTag = label('N end down', stroker.nEnd, { cls: 'warm' });
  const endN = new THREE.Object3D(); endN.position.set(E_X - BAR.l / 2 + 0.2, barTop + 0.1, 0.3); scene.add(endN);
  const endS = new THREE.Object3D(); endS.position.set(E_X + BAR.l / 2 - 0.2, barTop + 0.1, 0.3); scene.add(endS);
  const endNTag = label('N', endN, { cls: 'warm' }), endSTag = label('S', endS, { cls: 'cool' });
  // Paper clips that stick to the new magnet's N end.
  const clipsE = [];
  for (let i = 0; i < 4; i++) {
    const c = clip(0xadb5bd);
    c.rotation.z = Math.PI / 2; c.rotation.y = 0.3 * (i % 2 ? 1 : -1);
    c.position.set(E_X - BAR.l / 2 - 0.25 - i * 0.02, barTop - 0.05 - i * 0.0, 0.3 + (i - 1.5) * 0.18);
    c.visible = false;
    scene.add(c); clipsE.push(c);
  }
  st.strokes = 0; st.sPhase = -1; st.shake = 0;
  function resetBar() { for (let i = 0; i < ND; i++) dAng[i] = dHome[i]; st.strokes = 0; drawDomains(); }
  function strokeDone() {
    st.strokes++;
    for (let i = 0; i < ND; i++) {
      // Each stroke turns every domain part of the way toward −x (some turn more easily than others).
      const k = 0.18 + 0.2 * rand(i * 3 + st.strokes);
      let d = Math.PI - dAng[i];
      d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
      dAng[i] += d * k;
    }
    drawDomains();
  }
  function strokePose(p) {
    // p in [0, 1): slide along the bar touching it (0–0.65), then lift and swing back over the top.
    const x0 = E_X - BAR.l / 2 + 0.3, x1 = E_X + BAR.l / 2 - 0.1;
    if (p < 0.65) { const s = p / 0.65; stroker.position.set(x0 + (x1 - x0) * s, barTop + 0.7, 0.3); }
    else { const s = (p - 0.65) / 0.35; stroker.position.set(x1 + (x0 - x1) * s, barTop + 0.7 + Math.sin(s * Math.PI) * 1.0, 0.3); }
    stroker.rotation.set(0, 0, -Math.PI / 2);       // standing up, N end down
  }
  function eReadout() {
    const k = lined(), clips = k > 0.55 ? Math.min(4, Math.floor((k - 0.45) * 8)) : 0;
    clipsE.forEach((c, i) => { c.visible = i < clips; });
    endNTag.show(st.step === 6 && k > 0.55); endSTag.show(st.step === 6 && k > 0.55);
    ui.readout(`Strokes: <b>${st.strokes}</b> · Domains lined up: <b>${Math.round(k * 100)}%</b> (model) · Paper clips held: <b>${clips}</b>`);
  }

  const allTags = [fTag, fTag2, neutralTag, gapTag, nTagB, sTagB, crowdTag, bigTag, ...SAMPLES.map(s => s.tag), geoNTag, geoSTag, magSTag, eCTag, strokeTag, endNTag, endSTag];
  function hideAll() {
    allTags.forEach(t => t.show(false));
    fL.visible = fR.visible = false;
    paperA.visible = false;
    for (const m of ['NS', 'NN']) { pairLines[m].visible = false; pairFilings[m].visible = false; }
    linesB.visible = false; filB.visible = false; smallC.forEach(c => { c.visible = false; }); bigC.visible = false;
  }

  function setMode(m) {
    st.mode = m;
    placePair(st.step === 3 ? PAIR_GAP : st.gap);
    if (st.step === 0) { forceArrows(); pairReadout(); }
    if (st.step === 3) {
      for (const k of ['NS', 'NN']) { pairLines[k].visible = k === m; pairFilings[k].visible = k === m && st.showFil; pairLines[k].visible = k === m && st.showLines; }
      neutralTag.show(m === 'NN'); gapTag.show(m === 'NS');
      ui.readout(m === 'NS' ? 'N facing S: the field lines <b>join across the gap</b>. The magnets <b>attract</b>.' : 'N facing N: the lines <b>push apart</b>. In the middle there is a <b>neutral point</b> where the two fields cancel. The magnets <b>repel</b>.');
    }
  }

  function setHeight(h) {
    st.height = h;
    lift.position.set(C_X, lowY(h), 0);
    const picked = [];
    SAMPLES.forEach(s => { if (s.mag && h <= 2) s.stuck = true; if (s.stuck) picked.push(s.name.toLowerCase()); });
    ui.readout(picked.length ? `Gap: <b>${Math.round(h * 10) / 10} cm</b> · Picked up: <b>${picked.join(', ')}</b>` : `Gap: <b>${Math.round(h * 10) / 10} cm</b> · Nothing picked up yet. Lower the magnet.`);
  }

  return {
    step(i, { isQuiz }) {
      st.step = i; st.time = 0; st.auto = true; st.quiz = isQuiz; st.slider = null;
      hideAll();
      if (i === 0) {
        moveSun(A_X);
        view({ radius: 2.2, width: 3.6, yaw: 0, pitch: 0.55, target: [A_X, 0.5, 0] });
        st.mode = 'NS'; st.gap = 6;
        fTag.show(true); fTag2.show(true);
        st.row = ui.buttons([{ label: 'N facing S', on: true, onClick: () => { st.auto = false; setMode('NS'); } }, { label: 'N facing N', onClick: () => { st.auto = false; setMode('NN'); } }]);
        st.slider = ui.slider({ label: 'Gap between the magnets', min: 0.5, max: 8, step: 0.5, value: 6, unit: ' cm', format: v => v.toFixed(1), onInput: v => { st.auto = false; st.gap = v; placePair(v); forceArrows(); pairReadout(); } });
        setMode('NS');
      }
      if (i === 1) {
        moveSun(B_X);
        view({ radius: 2.3, width: 3.4, yaw: 0, pitch: 1.0, target: [B_X, 0, 0] });
        filB.visible = true; filB.settle(0); st.k = 0; st.tap = false;
        nTagB.show(true); sTagB.show(true);
        ui.buttons([{ label: 'Tap the paper', onClick: () => { st.auto = false; st.tap = true; } }, { label: 'Scatter again', onClick: () => { st.auto = false; st.tap = false; st.k = 0; filB.settle(0); crowdTag.show(false); } }]);
        ui.toggle({ label: 'Show field lines', value: false, onChange: v => { linesB.visible = v; } });
        ui.readout('Iron filings scattered on paper over a bar magnet.');
      }
      if (i === 2) {
        moveSun(B_X);
        view({ radius: 2.4, width: 3.5, yaw: 0, pitch: 1.05, target: [B_X, 0, 0] });
        linesB.visible = true; bigC.visible = true; smallC.forEach(c => { c.visible = true; c.needle.rotation.y = 1.3; });
        nTagB.show(true); sTagB.show(true); bigTag.show(true);
        st.p = 0.05; st.bigA = 0;
        st.slider = ui.slider({ label: 'Move the compass', min: 0, max: 100, step: 1, value: 5, unit: '%', format: v => Math.round(v), onInput: v => { st.auto = false; st.p = v / 100; } });
      }
      if (i === 3) {
        moveSun(A_X);
        view({ radius: 2.2, width: 4.1, yaw: 0, pitch: 1.0, target: [A_X, 0, 0] });
        paperA.visible = true; st.showFil = true; st.showLines = true;
        ui.buttons([{ label: 'N facing S', on: true, onClick: () => setMode('NS') }, { label: 'N facing N', onClick: () => setMode('NN') }]);
        ui.toggle({ label: 'Iron filings', value: true, onChange: v => { st.showFil = v; setMode(st.mode); } });
        ui.toggle({ label: 'Field lines', value: true, onChange: v => { st.showLines = v; setMode(st.mode); } });
        setMode('NS');
      }
      if (i === 4) {
        moveSun(C_X);
        view({ radius: 2.2, width: 4.4, yaw: 0, pitch: 0.04, target: [C_X, 0.45, 0.4] });
        SAMPLES.forEach(s => { s.stuck = false; s.y = 0.12; s.g.position.y = 0.12; s.tag.show(true); });
        st.slider = ui.slider({ label: 'Gap above the samples', min: 1, max: 8, step: 0.5, value: 8, unit: ' cm', format: v => v.toFixed(1), onInput: v => { st.auto = false; setHeight(v); } });
        ui.buttons([{ label: 'Put them back', onClick: () => { st.auto = false; SAMPLES.forEach(s => { s.stuck = false; }); st.slider.set(8); setHeight(8); } }]);
        setHeight(8);
      }
      if (i === 5) {
        moveSun(D_X);
        view({ radius: 3.0, width: 3.4, yaw: 0.2, pitch: 0.1, target: [D_X, EY, 0] });
        geoNTag.show(true); geoSTag.show(true); magSTag.show(true);
        st.lat = 35; placeEarthCompass(35); earthMat.opacity = 0.45; earthMat.depthWrite = false; inner.visible = true;
        st.slider = ui.slider({ label: 'Move the compass (latitude)', min: -60, max: 70, step: 5, value: 35, unit: '°', format: v => Math.round(v), onInput: v => { st.auto = false; st.lat = v; placeEarthCompass(v); earthReadout(); } });
        ui.toggle({ label: 'See the magnet inside', value: true, onChange: v => { earthMat.opacity = v ? 0.45 : 1; earthMat.depthWrite = !v; inner.visible = v; magSTag.show(v); } });
        earthReadout();
      }
      if (i === 6) {
        moveSun(E_X);
        view({ radius: 2.1, width: 2.9, yaw: 0.15, pitch: 0.55, target: [E_X, 0.8, 0.2] });
        resetBar(); st.sPhase = 0; strokeTag.show(true);
        ui.buttons([{ label: 'Stroke it', onClick: () => { st.auto = false; st.sPhase = 0; st.sLeft = 3; } },
          { label: 'Drop it hard', onClick: () => { st.auto = false; st.sPhase = -1; st.shake = 0.6; for (let k = 0; k < ND; k++) dAng[k] = turnToward(dAng[k], dHome[k] + st.strokes, 2.2); drawDomains(); eReadout(); } },
          { label: 'Start again', onClick: () => { st.auto = false; st.sPhase = -1; resetBar(); eReadout(); } }]);
        st.sLeft = 99;
        eReadout();
      }
      if (isQuiz) {
        moveSun(B_X);
        view({ radius: 2.4, width: 3.4, yaw: 0.2, pitch: 0.9, target: [B_X, 0, 0] });
        linesB.visible = true; filB.visible = true; filB.settle(1); nTagB.show(true); sTagB.show(true);
      }
      stroker.visible = i === 6;
      if (i !== 6) { stroker.position.set(E_X + 1.4, 0.12 + 0.13, -1.0); stroker.rotation.set(0, 0, 0); stroker.visible = true; }
      if (i !== 4) { lift.position.set(C_X, lowY(8), 0); SAMPLES.forEach(s => { s.stuck = false; s.g.position.y = 0.12; }); }
      if (i !== 0 && i !== 3) { st.mode = 'NS'; st.gap = 6; placePair(6); }
      if (i !== 5) { earthMat.opacity = 1; earthMat.depthWrite = true; inner.visible = false; placeEarthCompass(35); }
    },

    update(dt) {
      st.time += dt;
      const t = st.time;
      if (st.quiz) return false;
      if (st.step === 0) {
        if (st.auto) {
          // Demo: close the gap slowly, then flip to N–N, and repeat.
          const c = t % 10, g = c < 4.5 ? 6 - c * 1.1 : c < 5 ? 1 : c < 9.5 ? 1 + (c - 5) * 1.1 : 6;
          const mode = Math.floor(t / 10) % 2 ? 'NN' : 'NS';
          if (mode !== st.mode) { setMode(mode); st.row.select(mode === 'NS' ? 0 : 1); }
          st.gap = Math.round(Math.max(0.5, g) * 2) / 2;
          if (st.slider && +st.slider.value !== st.gap) st.slider.set(st.gap);
        }
        placePair(st.gap);
        // A tiny shiver in the hands holding them: bigger when the force is bigger.
        const s = strength(st.gap), j = Math.sin(t * 40) * 0.012 * s;
        magL.position.x += st.mode === 'NS' ? j : -j; magR.position.x -= st.mode === 'NS' ? j : -j;
        forceArrows();
        if (st.auto) pairReadout();
        return true;
      }
      if (st.step === 1) {
        if (st.auto && t > 0.9) st.tap = true;
        if (st.tap && st.k < 1) {
          st.k = Math.min(1, st.k + dt * 0.8);
          filB.settle(1 - (1 - st.k) ** 2);
          // The filings jiggle as the paper is tapped.
          filB.position.y = Math.sin(t * 50) * 0.01 * (1 - st.k);
          if (st.k >= 1) { crowdTag.show(true); ui.readout('The filings line up along curved lines from pole to pole, and crowd together at the poles where the field is strongest.'); }
          return true;
        }
        return false;
      }
      if (st.step === 2) {
        if (st.auto) { st.p = (0.05 + t * 0.06) % 1; if (st.slider) st.slider.set(Math.round(st.p * 100)); }
        const [u, v] = loop(st.p);
        bigC.position.set(B_X + u, 0.125, v);
        poleField(polesB, u, v, fB);
        const want = aimAngle(fB.u, fB.v);
        st.bigA = turnToward(st.bigA, want, dt * 5);
        bigC.angle(st.bigA);
        let moving = Math.abs(st.bigA - want) > 1e-3 || st.auto;
        for (const c of smallC) {
          const a = turnToward(c.needle.rotation.y, c.target, dt * 3);
          if (a !== c.needle.rotation.y) moving = true;
          c.needle.rotation.y = a;
        }
        const nearN = Math.hypot(u - 1, v), nearS = Math.hypot(u + 1, v);
        const where = nearN < 1.35 && Math.abs(u) > 1.3 ? 'Near the <b>N pole</b>: the needle\'s red end points <b>away from</b> it.'
          : nearS < 1.35 && Math.abs(u) > 1.3 ? 'Near the <b>S pole</b>: the needle\'s red end points <b>toward</b> it.'
            : 'Beside the magnet: the needle lies <b>along the field line</b>, pointing from the N end toward the S end.';
        if (where !== st.where) { st.where = where; ui.readout(where); }
        return moving;
      }
      if (st.step === 4) {
        if (st.auto) {
          const h = Math.max(1, 8 - Math.max(0, t - 0.3) * 4);
          const hs = Math.round(h * 2) / 2;
          if (hs !== st.height) { setHeight(hs); st.slider.set(hs); }
        }
        let moving = st.auto && st.height > 1;
        const under = lowY(st.height) - 0.18;
        SAMPLES.forEach(s => {
          const goal = s.stuck ? under - s.g.h : 0.12;
          if (kit.follow(s, 'y', goal, dt, s.stuck ? 14 : 8)) moving = true;
          s.g.position.y = s.y;
        });
        return moving;
      }
      if (st.step === 5) {
        if (st.auto) { st.lat = Math.round((20 + Math.sin(t * 0.5 + 2.2) * 25) / 5) * 5; placeEarthCompass(st.lat); if (st.slider && +st.slider.value !== st.lat) { st.slider.set(st.lat); earthReadout(); } }
        return st.auto;
      }
      if (st.step === 6) {
        let moving = false;
        if (st.sPhase >= 0) {
          const before = st.sPhase;
          st.sPhase += dt / 1.1;
          if (before < 0.65 && st.sPhase >= 0.65) { strokeDone(); eReadout(); }
          if (st.sPhase >= 1) {
            st.sLeft--;
            st.sPhase = st.sLeft > 0 && st.strokes < 30 ? st.sPhase - 1 : -1;
          }
          strokePose(Math.max(0, st.sPhase < 0 ? 0 : st.sPhase));
          if (st.sPhase < 0) strokePose(0.999);
          moving = true;
        }
        if (st.shake > 0) {
          st.shake = Math.max(0, st.shake - dt);
          bar.position.y = 0.12 + BAR.h / 2 + Math.abs(Math.sin(st.shake * 18)) * st.shake * 0.4;
          moving = true;
        }
        return moving;
      }
      return false;
    },
  };

  function earthReadout() {
    const where = st.lat > 0 ? `${Math.round(st.lat)}° north of the equator` : st.lat < 0 ? `${Math.round(-st.lat)}° south of the equator` : 'on the equator';
    ui.readout(`Compass ${where}: its red N end points <b>north</b>, toward the magnetic pole near the geographic North Pole, which is a magnetic <b>S</b> pole.`);
  }
}
