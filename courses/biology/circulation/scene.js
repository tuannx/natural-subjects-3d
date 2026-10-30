// Heart and circulation: a cut-away four-chamber heart with valves that open and close as it beats and blood
// flowing through (deoxygenated blue, oxygenated red); a 3D double circulation (lung loop and body loop);
// an artery, a vein (with valves) and a capillary cut open side by side; a tube of blood separating in a
// centrifuge with models of each blood component; heart rate × stroke volume = cardiac output with a heartbeat
// trace; and a coronary artery narrowing with fatty build-up (open area ∝ width²).
import { partSet } from '../_shared/cells.js';
import { flow, redCellGeometry, rand, BODY } from '../_shared/body.js';

const HE = [0, 2.3, 0];   // heart (cut-away)
const DC = [8, 0, 0];     // double circulation
const VE = [16, 0, 0];    // vessels
const BL = [24, 0, 0];    // blood
const CO = [32, 0, 0];    // coronary artery
const CHAMBERS = [
  ['ra', 'Right atrium', 'receives <b>deoxygenated</b> blood from the body through the <b>vena cava</b>.'],
  ['rv', 'Right ventricle', 'pumps deoxygenated blood to the <b>lungs</b> through the <b>pulmonary artery</b>.'],
  ['la', 'Left atrium', 'receives <b>oxygenated</b> blood from the lungs through the <b>pulmonary veins</b>.'],
  ['lv', 'Left ventricle', 'pumps oxygenated blood to the <b>whole body</b> through the <b>aorta</b>. Its wall is the thickest.'],
];
const VESSELS = [
  ['Artery', 'Carries blood <b>away from the heart</b> at <b>high pressure</b>. Thick wall of muscle and elastic tissue, narrow lumen, no valves (except where it leaves the heart).'],
  ['Vein', 'Carries blood <b>back to the heart</b> at <b>low pressure</b>. Thinner wall, wide lumen, and <b>valves</b> that stop blood flowing backwards.'],
  ['Capillary', 'The tiniest vessel: a wall <b>one cell thick</b>, so narrow that red blood cells pass in single file. Oxygen and food diffuse out to the cells; carbon dioxide and wastes diffuse in.'],
];
const BLOOD = [
  ['red', 'Red blood cells', 'About <b>45%</b> of blood. Dented discs with no nucleus, packed with <b>haemoglobin</b>, which carries <b>oxygen</b> from the lungs to the cells.'],
  ['white', 'White blood cells', 'Less than <b>1%</b> of blood. Larger cells with a nucleus that <b>fight germs</b>: some engulf them, others make antibodies.'],
  ['platelet', 'Platelets', 'Less than <b>1%</b> of blood (in the same thin layer as white cells). Tiny <b>cell fragments</b> that help blood <b>clot</b> to seal a cut.'],
  ['plasma', 'Plasma', 'About <b>55%</b> of blood. A yellow liquid, mostly water, that carries dissolved <b>food, carbon dioxide, hormones and wastes</b>, and the cells.'],
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xe9e4dc, sky: 0xeef3fa, radius: 50 });
  ground.position.x = 16;
  const sun = kit.lights(scene, { sun: [4, 10, 7] });
  scene.add(sun.target);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const curve = (pts, closed = false) => new THREE.CatmullRomCurve3(pts.map(p => V(...p)), closed, 'centripetal');
  const group = p => { const g = new THREE.Group(); g.position.set(...p); scene.add(g); return g; };
  const anchor = (parent, pos) => { const o = new THREE.Object3D(); o.position.set(...pos); parent.add(o); return o; };
  const M4 = new THREE.Matrix4(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(), QI = new THREE.Quaternion(), QT = new THREE.Quaternion(), E3 = new THREE.Euler();
  const C1 = new THREE.Color(), RED = new THREE.Color(BODY.oxy), BLUE = new THREE.Color(BODY.deoxy);
  const rbcGeo = redCellGeometry(THREE, 0.07, 10, 4);
  const smooth = (pts, n = 90) => curve(pts, true).getSpacedPoints(n).slice(0, n).map(p => new THREE.Vector2(p.x, p.y));
  const shapeOf = (pts) => new THREE.Shape(smooth(pts));
  const pathOf = (pts) => new THREE.Path(smooth(pts));

  // ================= The heart (cut-away, seen from the front) =================
  const gH = group(HE);
  const beat = new THREE.Group(); gH.add(beat);
  const HP = partSet(THREE, kit);
  const outline = [[0, 0.95, 0], [0.6, 1.02, 0], [1.1, 0.85, 0], [1.22, 0.3, 0], [1.12, -0.35, 0], [0.88, -0.98, 0], [0.5, -1.48, 0], [0.3, -1.62, 0], [0.02, -1.42, 0], [-0.55, -1.0, 0], [-0.95, -0.42, 0], [-1.05, 0.25, 0], [-0.95, 0.8, 0], [-0.5, 1.0, 0]];
  const rightCav = [[-0.75, 0.82, 0], [-0.45, 0.8, 0], [-0.4, 0.5, 0], [-0.38, 0.25, 0], [-0.3, 0.12, 0], [-0.3, 0.86, 0], [-0.1, 0.86, 0], [-0.1, 0.0, 0], [-0.06, -0.45, 0], [-0.2, -0.85, 0], [-0.38, -0.9, 0], [-0.66, -0.6, 0], [-0.8, -0.2, 0], [-0.7, 0.15, 0], [-0.88, 0.3, 0], [-0.9, 0.6, 0]];
  const leftCav = [[0.5, 0.82, 0], [0.85, 0.7, 0], [0.9, 0.42, 0], [0.75, 0.18, 0], [0.72, -0.1, 0], [0.62, -0.6, 0], [0.46, -1.0, 0], [0.32, -1.1, 0], [0.16, -0.8, 0], [0.08, -0.3, 0], [0.04, 0.0, 0], [0.04, 0.86, 0], [0.24, 0.86, 0], [0.24, 0.12, 0], [0.36, 0.2, 0], [0.34, 0.45, 0], [0.38, 0.72, 0]];
  const heartShape = shapeOf(outline);
  heartShape.holes.push(pathOf(rightCav), pathOf(leftCav));
  const DEPTH = 0.5;
  const slabGeo = new THREE.ExtrudeGeometry(heartShape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 4 });
  slabGeo.translate(0, 0, -DEPTH / 2);
  const cutMat = HP.mat('wall', 0xcf5a52, { roughness: 0.6 }), sideMat = HP.mat('wall', 0xa8322f, { roughness: 0.55 });
  const slab = new THREE.Mesh(slabGeo, [cutMat, sideMat]);
  slab.castShadow = true; beat.add(slab);
  // Inside of each side of the heart, tinted by the blood it holds.
  const fill = (pts, color) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(pts)), kit.mat(color, { roughness: 0.7 })); m.position.z = -0.2; beat.add(m); return m; };
  fill(rightCav, 0x6f7fc4); fill(leftCav, 0xd46a6a);
  // Highlight patches for the chambers.
  const glowMat = {};
  const patch = (key, x, y, rx, ry) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthWrite: false }));
    m.position.set(x, y, -0.18); m.scale.set(rx, ry, 1); beat.add(m); glowMat[key] = m.material;
  };
  patch('ra', -0.64, 0.5, 0.2, 0.26); patch('rv', -0.42, -0.4, 0.26, 0.38); patch('la', 0.62, 0.48, 0.22, 0.24); patch('lv', 0.4, -0.45, 0.2, 0.45);
  // Blood vessels joined to the heart.
  const vesselMat = { red: kit.mat(0xc8323c, { roughness: 0.45 }), blue: kit.mat(0x4b67c9, { roughness: 0.45 }) };
  const vtube = (pts, r, col) => { const m = kit.mesh(new THREE.TubeGeometry(curve(pts), 32, r, 12), vesselMat[col], [0, 0, 0], beat); return m; };
  const svcPts = [[-0.68, 1.75, 0], [-0.67, 1.2, 0], [-0.66, 0.75, 0]];
  const ivcPts = [[-1.55, -0.75, -0.05], [-1.3, 0.2, -0.03], [-0.86, 0.45, 0]];
  const paPts = [[-0.2, 0.8, 0], [-0.2, 1.25, 0.05], [-0.3, 1.5, 0.12], [-0.85, 1.55, 0.15], [-1.55, 1.4, 0.1]];
  const pa2Pts = [[-0.3, 1.5, 0.12], [0.3, 1.62, 0.35], [1.0, 1.55, 0.35], [1.6, 1.38, 0.2]];
  const aoPts = [[0.14, 0.8, 0], [0.13, 1.4, 0], [0.35, 1.82, -0.1], [0.75, 1.68, -0.25], [0.9, 0.9, -0.45]];
  const pv1 = [[1.75, 0.72, 0], [1.3, 0.66, 0], [0.86, 0.6, 0]], pv2 = [[1.75, 0.38, -0.05], [1.3, 0.42, 0], [0.88, 0.45, 0]];
  vtube(svcPts, 0.12, 'blue'); vtube(ivcPts, 0.12, 'blue');
  vtube(paPts, 0.11, 'blue'); vtube(pa2Pts, 0.1, 'blue');
  vtube(aoPts, 0.13, 'red'); vtube([[0.28, 1.76, -0.07], [0.28, 2.15, -0.07]], 0.05, 'red'); vtube([[0.5, 1.8, -0.15], [0.55, 2.12, -0.15]], 0.05, 'red');
  vtube(pv1, 0.08, 'red'); vtube(pv2, 0.08, 'red');
  // Valves: flaps hinged on the walls. AV valves between atria and ventricles; semilunar valves in the arteries' exits.
  const flapMat = kit.mat(0xf7e7c6, { roughness: 0.5 });
  const valves = [];
  const valve = (ax, ay, bx, by, kind, len) => {
    const closedA = Math.atan2(by - ay, bx - ax), closedB = Math.atan2(ay - by, ax - bx);
    const sign = kind === 'av' ? -1 : 1; // AV flaps swing down into the ventricle; semilunar flaps swing up
    for (const [px, py, closed, dir] of [[ax, ay, closedA, sign], [bx, by, closedB, -sign]]) {
      const piv = new THREE.Group(); piv.position.set(px, py, 0); beat.add(piv);
      const f = kit.mesh(new THREE.BoxGeometry(len, 0.03, DEPTH * 0.8), flapMat, [len / 2, 0, 0], piv); f.castShadow = false;
      valves.push({ piv, closed, open: closed + dir * 1.2, kind, a: closed });
    }
  };
  valve(-0.7, 0.15, -0.38, 0.25, 'av', 0.17);
  valve(0.36, 0.2, 0.75, 0.18, 'av', 0.2);
  valve(-0.3, 0.55, -0.1, 0.55, 'sl', 0.105);
  valve(0.04, 0.55, 0.24, 0.55, 'sl', 0.105);
  // Blood flowing through each side.
  const rightPath = (start, branch) => [...start, [-0.62, 0.45, 0.02], [-0.54, 0.2, 0.02], [-0.48, -0.25, 0.02], [-0.35, -0.6, 0.02], [-0.2, -0.3, 0.02], [-0.2, 0.25, 0.02], [-0.2, 0.8, 0.0], [-0.2, 1.25, 0.05], [-0.3, 1.5, 0.12], ...branch];
  const leftPath = (start) => [...start, [0.62, 0.48, 0.02], [0.55, 0.19, 0.02], [0.48, -0.3, 0.02], [0.32, -0.75, 0.02], [0.14, -0.35, 0.02], [0.14, 0.25, 0.02], [0.14, 0.8, 0.0], [0.13, 1.4, 0], [0.35, 1.82, -0.1], [0.75, 1.68, -0.25], [0.9, 0.9, -0.45]];
  const hf = (pts, col) => flow(THREE, beat, { points: pts, count: 16, geo: rbcGeo, color: col, speed: 0.12, tumble: 1, emissive: 0.25 });
  const heartFlows = {
    right: [hf(rightPath([[-0.68, 1.75, 0], [-0.67, 1.1, 0]], [[-0.85, 1.55, 0.15], [-1.55, 1.4, 0.1]]), BODY.deoxy),
      hf(rightPath([[-1.55, -0.75, -0.05], [-1.3, 0.2, -0.03], [-0.86, 0.45, 0]], [[0.3, 1.62, 0.35], [1.0, 1.55, 0.35], [1.6, 1.38, 0.2]]), BODY.deoxy)],
    left: [hf(leftPath([[1.75, 0.72, 0], [1.25, 0.66, 0.02], [0.86, 0.6, 0.02]]), BODY.oxy), hf(leftPath([[1.75, 0.38, -0.05], [1.25, 0.42, 0.02], [0.88, 0.45, 0.02]]), BODY.oxy)],
  };
  const hTags = {
    ra: label('Right atrium', anchor(beat, [-0.64, 0.55, 0.3]), { cls: 'cool' }),
    rv: label('Right ventricle', anchor(beat, [-0.45, -0.35, 0.3]), { cls: 'cool' }),
    la: label('Left atrium', anchor(beat, [0.64, 0.55, 0.3]), { cls: 'warm' }),
    lv: label('Left ventricle', anchor(beat, [0.42, -0.45, 0.3]), { cls: 'warm' }),
    septum: label('Septum', anchor(beat, [0.0, -0.95, 0.3])),
    aorta: label('Aorta', anchor(beat, [0.6, 1.9, -0.1]), { cls: 'warm' }),
    pa: label('Pulmonary artery', anchor(beat, [-1.45, 1.05, 0.1]), { cls: 'cool' }),
    vc: label('Vena cava', anchor(beat, [-0.68, 1.85, 0]), { cls: 'cool' }),
    pv: label('Pulmonary veins', anchor(beat, [1.5, 0.85, 0]), { cls: 'warm' }),
    av: label('Valve', anchor(beat, [-0.54, 0.24, 0.3])),
    sl: label('Valve', anchor(beat, [0.14, 0.62, 0.3])),
  };
  // Heartbeat trace under the heart (one sample every 1/40 s, 6 s wide).
  const NS = 240, TRACE_W = 3.2;
  const tracePos = new Float32Array(NS * 3), traceVal = new Float32Array(NS);
  for (let i = 0; i < NS; i++) { tracePos[i * 3] = -TRACE_W / 2 + TRACE_W * i / (NS - 1); tracePos[i * 3 + 1] = 0; }
  const traceGeo = new THREE.BufferGeometry(); traceGeo.setAttribute('position', new THREE.BufferAttribute(tracePos, 3));
  const trace = new THREE.Line(traceGeo, new THREE.LineBasicMaterial({ color: 0xd7263d }));
  trace.position.set(0, -1.95, 0.4); trace.frustumCulled = false; gH.add(trace);
  const traceBg = kit.mesh(new THREE.PlaneGeometry(TRACE_W + 0.2, 0.62), kit.mat(0xffffff, { roughness: 0.9 }), [0, -1.85, 0.38], gH); traceBg.castShadow = false;
  const traceTag = label('Heartbeat trace (6 s)', anchor(gH, [-1.1, -1.48, 0.4]));

  // ================= Double circulation =================
  const gD = group(DC);
  const dcPts = [[-0.28, 2.05, 0.25], [-0.28, 1.55, 0.25], [-0.65, 2.3, 0.45], [-1.0, 3.0, 0.4], [-0.75, 3.55, 0.15], [0, 3.8, 0.05], [0.75, 3.55, 0.15], [1.0, 3.0, 0.4], [0.65, 2.3, 0.45], [0.28, 2.05, 0.25], [0.28, 1.55, 0.25], [0.7, 1.2, 0.45], [1.0, 0.6, 0.4], [0.7, 0.25, 0.3], [0, 0.15, 0.35], [-0.7, 0.25, 0.3], [-1.0, 0.6, 0.4], [-0.7, 1.4, 0.45]];
  const dcCurve = curve(dcPts, true);
  dcCurve.getLengths(400);
  // u (0–1 along the loop) of each control point, found by sampling.
  const uOf = (() => {
    const N = 600, pts = dcCurve.getSpacedPoints(N);
    return dcPts.map(p => { let best = 0, bd = 1e9; pts.forEach((q, i) => { const d = q.distanceToSquared(V(...p)); if (d < bd) { bd = d; best = i; } }); return best / N; });
  })();
  const U = { rv: uOf[1], lungIn: uOf[4], lungOut: uOf[6], la: uOf[9], lv: uOf[10], bodyIn: uOf[13], bodyOut: uOf[15], ra: 1 };
  const oxyAt = u => {
    if (u < U.lungIn) return 0;
    if (u < U.lungOut) return (u - U.lungIn) / (U.lungOut - U.lungIn);
    if (u < U.bodyIn) return 1;
    if (u < U.bodyOut) return 1 - (u - U.bodyIn) / (U.bodyOut - U.bodyIn);
    return 0;
  };
  const loopOf = u => (u >= U.rv && u < U.la ? 'lung' : u >= U.lv ? 'body' : 'heart');
  // Vessels: see-through tubes coloured by the oxygen they carry.
  const loopTube = (u0, u1, segs) => {
    const sub = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => dcCurve.getPointAt(u0 + (u1 - u0) * i / 39)));
    const g = new THREE.TubeGeometry(sub, segs, 0.09, 10);
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i <= segs; i++) {
      C1.copy(BLUE).lerp(RED, oxyAt(u0 + (u1 - u0) * i / segs));
      for (let j = 0; j <= 10; j++) { const k = i * 11 + j; col[k * 3] = C1.r; col[k * 3 + 1] = C1.g; col[k * 3 + 2] = C1.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.4, roughness: 0.4, depthWrite: false }));
    m.renderOrder = 3; gD.add(m); return m;
  };
  const lungTube = loopTube(U.rv + 0.01, U.la - 0.01, 80), bodyTube = loopTube(U.lv + 0.01, 0.995, 80);
  // Heart: four small chambers, right side blue and left side red.
  const chamberGeo = new THREE.SphereGeometry(0.2, 16, 12);
  for (const [x, y, c] of [[-0.28, 2.05, BODY.deoxy], [-0.28, 1.55, BODY.deoxy], [0.28, 2.05, BODY.oxy], [0.28, 1.55, BODY.oxy]]) {
    const m = kit.mesh(chamberGeo, kit.mat(c, { roughness: 0.5 }), [x, y, 0.1], gD); m.scale.set(1.2, y > 1.8 ? 1 : 1.4, 1);
  }
  kit.mesh(new THREE.BoxGeometry(0.06, 0.95, 0.4), kit.mat(0xa8322f), [0, 1.8, 0.1], gD);
  // Lungs and body organs (capillary beds).
  // See-through lungs and organs, so the blood can be seen passing through their capillaries.
  const lungMat = new THREE.MeshStandardMaterial({ color: 0xf2a0b0, roughness: 0.85, transparent: true, opacity: 0.55, depthWrite: false });
  for (const s of [-1, 1]) { const l = kit.mesh(new THREE.SphereGeometry(0.5, 20, 14), lungMat, [s * 0.55, 3.5, 0.1], gD); l.scale.set(0.85, 1.1, 0.7); l.renderOrder = 4; l.castShadow = false; }
  const organs = new THREE.Group(); organs.position.set(0, 0.25, 0.25); gD.add(organs);
  const organBox = kit.mesh(new THREE.BoxGeometry(2.0, 0.4, 0.7), new THREE.MeshStandardMaterial({ color: 0xe8b98e, roughness: 0.8, transparent: true, opacity: 0.5, depthWrite: false }), [0, 0, 0], organs);
  organBox.renderOrder = 4; organBox.castShadow = false;
  const dTags = {
    lungs: label('Lungs', V(DC[0] - 1.25, 3.9, 0), { cls: 'big' }),
    body: label('Body organs', V(DC[0] + 1.35, 0.15, 0.3), { cls: 'big' }),
    heart: label('Heart', V(DC[0] + 0.6, 1.95, 0.3)),
    lung: label('Lung loop', V(DC[0] - 1.2, 2.65, 0.45), { cls: 'cool' }),
    bodyL: label('Body loop', V(DC[0] - 1.2, 0.95, 0.45), { cls: 'warm' }),
  };
  const ND = 44;
  const dcDots = new THREE.InstancedMesh(rbcGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, side: THREE.DoubleSide }), ND);
  dcDots.frustumCulled = false; dcDots.castShadow = false; gD.add(dcDots);

  // ================= Arteries, veins and capillaries (cut open lengthwise) =================
  const gV = group(VE);
  kit.mesh(new THREE.BoxGeometry(3.4, 0.1, 2.0), kit.mat(0xf4efe6), [0, 0.05, -0.3], gV);
  const VLEN = 1.7;
  // Half of a tube along local y (bottom half kept), with coloured wall layers [{ r0, r1, color }].
  const halfVessel = (layers, len) => {
    const g = new THREE.Group();
    for (const { r0, r1, color } of layers) {
      const m = kit.mat(color, { side: THREE.DoubleSide, roughness: 0.6 });
      kit.mesh(new THREE.CylinderGeometry(r1, r1, len, 24, 1, true, -Math.PI / 2, Math.PI), m, [0, 0, 0], g);
      if (r0 > 0.001) kit.mesh(new THREE.CylinderGeometry(r0, r0, len, 24, 1, true, -Math.PI / 2, Math.PI), m, [0, 0, 0], g);
      const ring = new THREE.RingGeometry(Math.max(0.001, r0), r1, 24, 1, Math.PI, Math.PI); ring.rotateX(-Math.PI / 2);
      for (const y of [len / 2, -len / 2]) kit.mesh(ring, m, [0, y, 0], g).castShadow = false;
      for (const s of [-1, 1]) { const p = kit.mesh(new THREE.PlaneGeometry(r1 - r0, len), m, [s * (r0 + r1) / 2, 0, 0], g); p.castShadow = false; }
    }
    return g;
  };
  const along = (g, x, y) => { g.rotation.x = Math.PI / 2; g.position.set(x, y, -0.3); gV.add(g); return g; };
  const VP = partSet(THREE, kit);
  const artery = along(halfVessel([{ r0: 0.15, r1: 0.18, color: 0xf3d6cf }, { r0: 0.18, r1: 0.34, color: 0xd9534f }, { r0: 0.34, r1: 0.4, color: 0xf2e2c4 }], VLEN), -1.15, 0.55);
  const vein = along(halfVessel([{ r0: 0.33, r1: 0.35, color: 0xd8dcf2 }, { r0: 0.35, r1: 0.4, color: 0x7d8fd6 }, { r0: 0.4, r1: 0.43, color: 0xe6e0f2 }], VLEN), 0, 0.58);
  const capillary = along(halfVessel([{ r0: 0.085, r1: 0.105, color: 0xf0b9b4 }], VLEN), 1.05, 0.3);
  for (const [x, w] of [[-1.15, 0.5], [0, 0.55], [1.05, 0.2]]) for (const z of [-0.95, 0.35]) kit.mesh(new THREE.BoxGeometry(w, x === 1.05 ? 0.2 : 0.12, 0.08), kit.mat(0xc9bfae), [x, x === 1.05 ? 0.2 : 0.14, z], gV);
  // Vein valves: two pairs of flaps. Local frame of the vein group: axis = y (toward the viewer = toward the heart).
  const veinValves = [];
  for (const vy of [-0.35, 0.45]) for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.32, vy, 0.14); vein.add(piv);
    const f = kit.mesh(new THREE.BoxGeometry(0.3, 0.025, 0.24), kit.mat(0xb7c2ee, { roughness: 0.5 }), [0.15, 0, 0], piv); f.castShadow = false;
    const closed = s < 0 ? 0 : Math.PI;
    veinValves.push({ piv, closed, open: closed + (s < 0 ? 1.25 : -1.25), y: vy });
  }
  // Blood cells inside each vessel (positions in each vessel's local frame).
  const mkDots = (parent, n, col) => { const im = new THREE.InstancedMesh(rbcGeo, kit.mat(col, { roughness: 0.45, side: THREE.DoubleSide }), n); im.frustumCulled = false; im.castShadow = false; parent.add(im); return im; };
  const artDots = mkDots(artery, 10, BODY.oxy), veinDots = mkDots(vein, 18, BODY.deoxy), capDots = mkDots(capillary, 9, BODY.oxy);
  const veinY = new Float32Array(18);
  for (let k = 0; k < 18; k++) veinY[k] = -VLEN / 2 + VLEN * k / 18;
  const vTags = {
    artery: label('Artery', V(VE[0] - 1.15, 1.15, 0.6), { cls: 'warm' }),
    vein: label('Vein', V(VE[0], 1.2, 0.6), { cls: 'cool' }),
    cap: label('Capillary', V(VE[0] + 1.05, 0.65, 0.6)),
    wall: label('Thick muscle wall', anchor(artery, [-0.3, VLEN / 2, 0.25])),
    valve: label('Valve', anchor(vein, [0.0, 0.45, 0.35])),
    lumen: label('Lumen', anchor(vein, [0.12, -0.05, 0.2]), { cls: 'cool' }),
  };

  // ================= Blood: a tube in a centrifuge and models of the parts =================
  const gB = group(BL);
  const BP = partSet(THREE, kit);
  kit.mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.3, 32), kit.mat(0xd5dbe3, { roughness: 0.4 }), [-0.9, 0.15, 0], gB);
  const rotor = new THREE.Group(); rotor.position.set(-0.9, 0.3, 0); gB.add(rotor);
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 12), kit.mat(0x666666), [0, 0.12, 0], rotor);
  const tubeG = new THREE.Group(); tubeG.position.set(0, 0.25, 0); rotor.add(tubeG);
  const TR = 0.17, LIQ = 1.3;
  const tubeGlass = new THREE.Mesh(new THREE.CylinderGeometry(TR + 0.02, TR + 0.02, 1.7, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xeef7ff, transparent: true, opacity: 0.25, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  tubeGlass.position.y = 0.85; tubeGlass.renderOrder = 4; tubeG.add(tubeGlass);
  kit.mesh(new THREE.CylinderGeometry(TR + 0.035, TR + 0.035, 0.12, 24), kit.mat(0x3a7bd5), [0, 1.74, 0], tubeG);
  const layerGeo = new THREE.CylinderGeometry(TR, TR, 1, 24); layerGeo.translate(0, 0.5, 0);
  const mixedMat = new THREE.MeshStandardMaterial({ color: 0x9e1b26, roughness: 0.35, transparent: true, opacity: 1 });
  const mixed = new THREE.Mesh(layerGeo, mixedMat); mixed.scale.y = LIQ; mixed.position.y = 0.02; tubeG.add(mixed);
  const layer = (name, color, y0, h) => { const m = new THREE.Mesh(layerGeo, BP.mat(name, color, { roughness: 0.35, transparent: true, opacity: 0 })); m.position.y = 0.02 + y0; m.scale.y = h; tubeG.add(m); return m; };
  const RBC_H = 0.45 * LIQ, BUFFY_H = 0.035, PLASMA_H = LIQ - RBC_H - BUFFY_H;
  const layers = [layer('red', 0x9e1b26, 0, RBC_H), layer('white', 0xf5f2ea, RBC_H, BUFFY_H), layer('plasma', 0xf2cf63, RBC_H + BUFFY_H, PLASMA_H)];
  // Floating models.
  const models = new THREE.Group(); models.position.set(0.55, 1.4, 0); gB.add(models);
  const bigRbc = redCellGeometry(THREE, 0.2, 20, 8);
  const redMat = BP.mat('red', 0xc62832, { roughness: 0.45, side: THREE.DoubleSide });
  const reds = [[-0.35, 0.55, 0.1], [0.05, 0.75, -0.1], [-0.1, 0.25, 0.2], [0.35, 0.45, 0.05]].map(([x, y, z], k) => { const m = kit.mesh(bigRbc, redMat, [x, y, z], models); m.rotation.set(1.2 + k, k * 0.7, 0.3); return m; });
  const white = new THREE.Group(); white.position.set(0.15, -0.3, 0.1); models.add(white);
  const wMat = BP.mat('white', 0xf3efe6, { roughness: 0.6, transparent: true, opacity: 0.7, depthWrite: false });
  const wGeo = new THREE.SphereGeometry(0.3, 24, 16);
  { const p = wGeo.attributes.position; for (let i = 0; i < p.count; i++) { const s = 1 + 0.05 * Math.sin(p.getX(i) * 31) * Math.sin(p.getY(i) * 27 + p.getZ(i) * 13); p.setXYZ(i, p.getX(i) * s, p.getY(i) * s, p.getZ(i) * s); } wGeo.computeVertexNormals(); }
  const wm = new THREE.Mesh(wGeo, wMat); wm.renderOrder = 3; white.add(wm);
  const nucMat = BP.mat('white', 0x7b4bb8, { roughness: 0.5 });
  for (const [x, y, z] of [[-0.09, 0.05, 0], [0.04, 0.1, 0.03], [0.12, -0.03, -0.02]]) kit.mesh(new THREE.SphereGeometry(0.085, 12, 8), nucMat, [x, y, z], white).castShadow = false;
  const platMat = BP.mat('platelet', BODY.platelet, { roughness: 0.6, flatShading: true });
  const platGeo = new THREE.DodecahedronGeometry(0.05, 0);
  const plats = [[-0.45, -0.25, 0.1], [-0.3, -0.55, 0], [0.55, -0.1, 0.1], [0.6, 0.15, -0.1], [-0.6, 0.0, 0], [0.45, -0.55, 0.05]].map(([x, y, z], k) => { const m = kit.mesh(platGeo, platMat, [x, y, z], models); m.scale.set(1.4, 0.7, 1); m.rotation.set(k, k * 2, 0); return m; });
  const plasmaBlob = new THREE.Mesh(new THREE.SphereGeometry(1.0, 28, 18), BP.mat('plasma', 0xf6dc8a, { transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.3 }));
  plasmaBlob.scale.set(1.0, 0.95, 0.6); plasmaBlob.renderOrder = 5; models.add(plasmaBlob);
  BP.anchor('red', models, [0.5, 0.95, -0.1]); BP.anchor('white', models, [0.15, 0.08, 0.1]); BP.anchor('platelet', models, [0.75, -0.65, 0.05]); BP.anchor('plasma', models, [-0.75, 0.75, 0]);
  const bTags = {
    red: label('Red blood cells', BP.parts.red.anchor, { cls: 'warm' }),
    white: label('White blood cell', BP.parts.white.anchor),
    platelet: label('Platelets', BP.parts.platelet.anchor),
    plasma: label('Plasma', BP.parts.plasma.anchor, { cls: 'warm' }),
    tube: label('Blood sample', anchor(tubeG, [0, 2.0, 0])),
  };

  // ================= Coronary artery and fatty build-up =================
  const gC = group(CO);
  // A small heart with its coronary arteries on the outside.
  const smallHeart = new THREE.Group(); smallHeart.position.set(-1.35, 1.35, 0); gC.add(smallHeart);
  const hb = kit.mesh(new THREE.SphereGeometry(0.55, 24, 16), kit.mat(0xb33a35, { roughness: 0.55 }), [0, 0, 0], smallHeart);
  hb.scale.set(1, 1.15, 0.85); hb.rotation.z = 0.35;
  kit.mesh(new THREE.TubeGeometry(curve([[-0.12, 0.45, -0.1], [-0.1, 0.72, -0.1], [0.05, 0.86, -0.12], [0.25, 0.78, -0.15]]), 12, 0.09, 10), kit.mat(0xc8323c), [0, 0, 0], smallHeart);
  const corMat = kit.mat(0xe0303a, { roughness: 0.4, emissive: 0x500000, emissiveIntensity: 0.3 });
  const cor = (pts, r) => kit.mesh(new THREE.TubeGeometry(curve(pts), 24, r, 6), corMat, [0, 0, 0], smallHeart);
  cor([[0.0, 0.62, 0.3], [0.12, 0.35, 0.47], [0.18, 0.0, 0.48], [0.08, -0.4, 0.4], [-0.1, -0.62, 0.22]], 0.03);
  cor([[0.0, 0.62, 0.3], [-0.3, 0.45, 0.38], [-0.5, 0.15, 0.3], [-0.5, -0.2, 0.18]], 0.028);
  cor([[0.15, 0.2, 0.48], [0.35, -0.05, 0.38], [0.45, -0.35, 0.2]], 0.02);
  const spot = kit.mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 16), kit.mat(0xffd23f, { emissive: 0xffb000, emissiveIntensity: 0.5 }), [0.18, 0.02, 0.5], smallHeart);
  spot.castShadow = false;
  const segX = 0.65, AR = 0.32, AL = 2.0;
  const seg = halfVessel([{ r0: AR, r1: AR + 0.03, color: 0xf3d6cf }, { r0: AR + 0.03, r1: AR + 0.14, color: 0xd9534f }, { r0: AR + 0.14, r1: AR + 0.18, color: 0xf2e2c4 }], AL);
  seg.rotation.z = -Math.PI / 2; // axis along x; the kept half is on the +z side of segG
  // Tip segG so the kept half lies behind and below the axis: the open cut faces up and towards the viewer.
  const segG = new THREE.Group(); segG.position.set(segX, 1.1, 0); segG.rotation.x = 2.6; gC.add(segG); segG.add(seg);
  kit.mesh(new THREE.BoxGeometry(2.3, 0.6, 0.9), kit.mat(0xf4efe6), [segX, 0.3, 0], gC);
  const zoomLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-1.17, 1.37, 0.5), V(segX - AL / 2, 1.2, 0.2)]), new THREE.LineDashedMaterial({ color: 0x8a7f76, dashSize: 0.05, gapSize: 0.04 }));
  zoomLine.computeLineDistances(); gC.add(zoomLine);
  // Plaque: the inner surface of a fatty layer (bottom half), re-shaped from the slider.
  const PJ = 24, PI_ = 14;
  const plaqueGeo = new THREE.BufferGeometry();
  const plaquePos = new Float32Array(PJ * PI_ * 3), plaqueIdx = [];
  for (let i = 0; i < PI_ - 1; i++) for (let j = 0; j < PJ - 1; j++) { const a = i * PJ + j, b = a + 1, c = a + PJ, d = c + 1; plaqueIdx.push(a, c, b, b, c, d); }
  plaqueGeo.setAttribute('position', new THREE.BufferAttribute(plaquePos, 3)); plaqueGeo.setIndex(plaqueIdx);
  const plaque = new THREE.Mesh(plaqueGeo, kit.mat(0xf2d16b, { roughness: 0.7, side: THREE.DoubleSide }));
  plaque.frustumCulled = false; plaque.castShadow = false; segG.add(plaque);
  const bump = x => { const u = Math.abs(x) / (AL * 0.42); return u >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * u); };
  const shapePlaque = p => {
    for (let i = 0; i < PI_; i++) {
      const th = Math.PI * (i / (PI_ - 1)); // the kept half of the pipe: z >= 0 in segG's space
      for (let j = 0; j < PJ; j++) {
        const x = -AL / 2 + AL * j / (PJ - 1), r = AR * (1 - p * bump(x)) - 0.004;
        const k = (i * PJ + j) * 3;
        plaquePos[k] = x; plaquePos[k + 1] = Math.cos(th) * r; plaquePos[k + 2] = Math.sin(th) * r;
      }
    }
    plaqueGeo.attributes.position.needsUpdate = true; plaqueGeo.computeVertexNormals();
  };
  const corDots = new THREE.InstancedMesh(rbcGeo, kit.mat(BODY.oxy, { roughness: 0.45, side: THREE.DoubleSide }), 16);
  corDots.frustumCulled = false; corDots.castShadow = false; segG.add(corDots);
  const cTags = {
    heart: label('Coronary arteries', anchor(smallHeart, [-0.1, 0.95, 0.3]), { cls: 'warm' }),
    seg: label('Inside a coronary artery', V(CO[0] + segX, 1.85, 0)),
    fat: label('Fatty build-up', anchor(segG, [0.25, 0, AR * 0.75])),
  };

  // ================= State =================
  const allTags = [...Object.values(hTags), traceTag, ...Object.values(dTags), ...Object.values(vTags), ...Object.values(bTags), ...Object.values(cTags)];
  const allHeartFlows = [...heartFlows.right, ...heartFlows.left];
  const st = { step: 0, quiz: false, time: 0, auto: false, row: null, slider: null, toggle: null,
    bpm: 70, sv: 70, phase: 0, phaseName: '', side: 'both', loop: 'both', dcPhase: 0, vessel: 0, back: false, backTo: false, vPhase: 0,
    spin: 0, spinning: false, sep: 0, sepTo: 0, blood: 0, plaque: 0, plaqueTo: 0, corPhase: 0, sample: 0, sampleT: 0, pulse: 0, chamber: '' };
  const heartPhase = p => (p < 0.15 ? 'atria' : p < 0.45 ? 'ventricles' : 'relax');

  function pickChamber(j) {
    const [k, n, txt] = CHAMBERS[j];
    st.chamber = k;
    for (const c of CHAMBERS) hTags[c[0]].show(c[0] === k);
    ui.readout(`<b>${n}</b>: ${txt}`);
  }
  function setSide(s) {
    st.side = s;
    for (const f of heartFlows.right) f.mesh.visible = s !== 'left';
    for (const f of heartFlows.left) f.mesh.visible = s !== 'right';
    hTags.vc.show(s !== 'left'); hTags.pa.show(s !== 'left'); hTags.aorta.show(s !== 'right'); hTags.pv.show(s !== 'right');
    st.phaseName = '';
  }
  function phaseReadout(name) {
    const side = st.side === 'right' ? 'Right side: vena cava → right atrium → right ventricle → pulmonary artery → lungs.' : st.side === 'left' ? 'Left side: pulmonary veins → left atrium → left ventricle → aorta → body.' : 'Both sides squeeze at the same time.';
    const txt = name === 'atria' ? '<b>Atria contract</b>: blood is pushed through the open valves into the ventricles.'
      : name === 'ventricles' ? '<b>Ventricles contract</b>: the valves between atria and ventricles snap shut ("lub"), and the valves into the arteries open.'
        : '<b>Heart relaxes</b>: the valves into the arteries close ("dub"), and blood flows into the atria and ventricles.';
    ui.readout(`${txt}<br><span style="opacity:.8">${side} (slow motion)</span>`);
  }
  function setLoop(l) {
    st.loop = l;
    lungTube.material.opacity = l === 'body' ? 0.08 : 0.45;
    bodyTube.material.opacity = l === 'lung' ? 0.08 : 0.45;
    dTags.lung.show(l !== 'body'); dTags.bodyL.show(l !== 'lung');
    ui.readout(l === 'lung' ? '<b>Lung loop</b> (pulmonary circulation): right ventricle → pulmonary artery → lungs → pulmonary veins → left atrium. Blood <b>picks up oxygen</b> and gives off carbon dioxide.'
      : l === 'body' ? '<b>Body loop</b> (systemic circulation): left ventricle → aorta → body organs → vena cava → right atrium. Blood <b>gives oxygen</b> to the cells and collects carbon dioxide.'
        : 'On one full trip round the body, blood passes through the heart <b>twice</b>: once on the lung loop and once on the body loop.');
  }
  function setVessel(j) {
    st.vessel = j;
    vTags.wall.show(j === 0); vTags.valve.show(j === 1); vTags.lumen.show(j === 1);
    ui.readout(`<b>${VESSELS[j][0]}</b>: ${VESSELS[j][1]}${j === 1 && st.backTo ? '<br>Blood flowing back pushes the valve flaps <b>shut</b>, so it cannot go the wrong way.' : ''}<br><span style="opacity:.75">Not to scale: real capillaries are far thinner.</span>`);
    if (!st.quiz) view(j === 0 ? F.artery : j === 1 ? F.vein : F.cap);
  }
  function setBlood(j) {
    st.blood = j;
    BP.select([BLOOD[j][0]]);
    for (const b of BLOOD) bTags[b[0]].show(b[0] === BLOOD[j][0]);
    ui.readout(`<b>${BLOOD[j][1]}</b>: ${BLOOD[j][2]}${st.sepTo ? '' : '<br>Spin the tube to separate the layers.'}`);
  }
  function setSpin(v) {
    st.sepTo = v ? 1 : 0; st.spinning = v; st.spin = 0;
    setBlood(st.blood);
  }
  function hrReadout() {
    const co = st.bpm * st.sv;
    ui.readout(`Cardiac output = heart rate × stroke volume<br>= ${st.bpm} beats/min × ${st.sv} mL = <b>${co} mL per minute</b> ≈ <b>${(co / 1000).toFixed(1)} L/min</b><br>One beat every <b>${(60 / st.bpm).toFixed(2)} s</b> (model values)`);
  }
  function setPlaque(p) {
    st.plaqueTo = p / 100;
    const w = 1 - p / 100;
    ui.readout(`Fatty build-up: <b>${p}%</b> of the artery's width<br>Opening left: <b>${Math.round(w * 100)}%</b> of the width, but only <b>${Math.round(w * w * 100)}%</b> of the area (area ∝ width²)${p >= 50 ? '<br>Much less blood, and so less oxygen, reaches this part of the heart muscle.' : ''}`);
  }

  const F = {
    heart: { radius: 2.15, yaw: 0, pitch: 0.06, target: [0, 2.45, 0] },
    heartRate: { radius: 2.45, yaw: 0, pitch: 0.06, target: [0, 1.95, 0] },
    dc: { radius: 2.2, yaw: 0.35, pitch: 0.12, target: [8, 2.0, 0] },
    vessels: { radius: 1.6, width: 1.75, yaw: 0.5, pitch: 0.45, target: [16, 0.5, -0.3] },
    artery: { radius: 1.25, width: 1.5, yaw: 0.45, pitch: 0.5, target: [15.5, 0.5, -0.3] },
    vein: { radius: 1.25, width: 1.5, yaw: 0.45, pitch: 0.5, target: [16, 0.5, -0.3] },
    cap: { radius: 1.25, width: 1.5, yaw: 0.45, pitch: 0.5, target: [16.45, 0.45, -0.3] },
    blood: { radius: 1.75, yaw: 0.1, pitch: 0.1, target: [24, 1.3, 0] },
    cor: { radius: 1.65, width: 1.9, yaw: 0.1, pitch: 0.18, target: [31.95, 1.2, 0] },
    quiz: { radius: 2.3, yaw: -0.35, pitch: 0.15, target: [8, 2.0, 0] },
  };
  const centres = [0, 0, 8, 16, 24, 0, 32];

  return {
    step(i, { isQuiz }) {
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: false, row: null, slider: null, toggle: null, phaseName: '' });
      for (const t of allTags) t.show(false);
      for (const f of allHeartFlows) f.mesh.visible = false;
      for (const m of Object.values(glowMat)) m.opacity = 0;
      trace.visible = traceBg.visible = false;
      dcDots.visible = false; BP.select([]);
      const cx = isQuiz ? 8 : centres[i];
      sun.position.set(cx + 4, 10, 7); sun.target.position.set(cx, 0, 0);
      st.bpm = 70; st.sv = 70;
      if (i === 0) {
        view(F.heart);
        hTags.septum.show(true);
        st.auto = true;
        st.row = ui.buttons(CHAMBERS.map(([, n], j) => ({ label: n, on: j === 0, onClick: () => { st.auto = false; pickChamber(j); } })));
        pickChamber(0);
      }
      if (i === 1) {
        view(F.heart);
        st.bpm = 20;
        hTags.av.show(true); hTags.sl.show(true);
        st.auto = true;
        st.row = ui.buttons([{ label: 'Right side', onClick: () => { st.auto = false; setSide('right'); } }, { label: 'Left side', onClick: () => { st.auto = false; setSide('left'); } }, { label: 'Both', on: true, onClick: () => { st.auto = false; setSide('both'); } }]);
        setSide('both');
      }
      if (i === 2 || isQuiz) {
        view(isQuiz ? F.quiz : F.dc);
        dcDots.visible = true;
        for (const k of ['lungs', 'body', 'heart']) dTags[k].show(!isQuiz);
        if (!isQuiz) {
          st.auto = true;
          st.row = ui.buttons([{ label: 'Lung loop', onClick: () => { st.auto = false; setLoop('lung'); } }, { label: 'Body loop', onClick: () => { st.auto = false; setLoop('body'); } }, { label: 'Both', on: true, onClick: () => { st.auto = false; setLoop('both'); } }]);
          setLoop('both');
        } else { lungTube.material.opacity = bodyTube.material.opacity = 0.45; st.loop = 'both'; }
      }
      if (i === 3) {
        view(F.vessels);
        vTags.artery.show(true); vTags.vein.show(true); vTags.cap.show(true);
        st.auto = true; st.back = st.backTo = false;
        st.row = ui.buttons(VESSELS.map(([n], j) => ({ label: n, onClick: () => { st.auto = false; setVessel(j); } })));
        st.toggle = ui.toggle({ label: 'Blood flows back (vein)', value: false, onChange: v => { st.auto = false; st.backTo = v; st.row?.select(1); setVessel(1); } });
        st.vessel = -1;
        ui.readout('Tap a vessel to compare. All three are cut open lengthwise so you can see their walls.');
      }
      if (i === 4) {
        view(F.blood);
        bTags.tube.show(true);
        st.auto = true; st.sep = 0; st.sepTo = 0; st.spinning = false;
        st.toggle = ui.toggle({ label: 'Spin the tube', value: false, onChange: v => { st.auto = false; setSpin(v); } });
        st.row = ui.buttons(BLOOD.map(([, n], j) => ({ label: n, on: j === 0, onClick: () => { st.auto = false; setBlood(j); } })));
        setBlood(0);
      }
      if (i === 5) {
        view(F.heartRate);
        setSide('both'); hTags.vc.show(false); hTags.pv.show(false); hTags.pa.show(false); hTags.aorta.show(false);
        trace.visible = traceBg.visible = true; traceTag.show(true);
        st.auto = true;
        st.slider = ui.slider({ label: 'Heart rate', min: 50, max: 200, step: 1, value: 70, unit: ' bpm', onInput: v => { st.auto = false; st.bpm = v; hrReadout(); } });
        ui.slider({ label: 'Stroke volume', min: 50, max: 120, step: 5, value: 70, unit: ' mL', onInput: v => { st.auto = false; st.sv = v; hrReadout(); } });
        hrReadout();
      }
      if (i === 6) {
        view(F.cor);
        for (const t of Object.values(cTags)) t.show(true);
        st.auto = true; st.plaque = st.plaqueTo = 0; shapePlaque(0);
        st.slider = ui.slider({ label: 'Fatty build-up', min: 0, max: 80, step: 5, value: 0, unit: '%', onInput: v => { st.auto = false; setPlaque(v); } });
        setPlaque(0);
      }
    },

    update(dt) {
      st.time += dt;
      const t = st.time, s = st.step;
      // Heartbeat: phase 0–1 per beat.
      st.phase = (st.phase + dt * st.bpm / 60) % 1;
      const p = st.phase;
      const squeeze = p >= 0.15 && p < 0.45 ? Math.sin(Math.PI * (p - 0.15) / 0.3) : 0;
      const atria = p < 0.15 ? Math.sin(Math.PI * p / 0.15) : 0;
      if (s <= 1 || s === 5) {
        beat.scale.set(1 - 0.035 * squeeze, 1 - 0.05 * squeeze - 0.015 * atria, 1 - 0.03 * squeeze);
        const avOpen = p < 0.15 || p >= 0.5, slOpen = p >= 0.17 && p < 0.45;
        for (const v of valves) {
          const want = (v.kind === 'av' ? avOpen : slOpen) ? v.open : v.closed;
          v.a += (want - v.a) * Math.min(1, dt * 18);
          v.piv.rotation.z = v.a;
        }
        const rate = 0.35 + 1.4 * Math.max(squeeze, atria * 0.6);
        for (const f of allHeartFlows) if (f.mesh.visible) { f.rate = rate * st.bpm / 70; f.update(dt); }
      }
      if (st.quiz) { updateDC(dt); return true; }
      if (s === 0) {
        if (st.auto) { const j = Math.floor(t / 2.4) % 4; if (CHAMBERS[j][0] !== st.chamber) { pickChamber(j); st.row?.select(j); } }
        for (const [k, m] of Object.entries(glowMat)) m.opacity = k === st.chamber ? 0.35 + 0.25 * Math.sin(t * 5) : 0;
      }
      if (s === 1) {
        if (st.auto) { const k = Math.floor(t / 6) % 3, side = ['both', 'right', 'left'][k]; if (side !== st.side) { setSide(side); st.row?.select([2, 0, 1][k]); } }
        const name = heartPhase(p);
        if (name !== st.phaseName) { st.phaseName = name; phaseReadout(name); }
      }
      if (s === 2) {
        if (st.auto) { const k = Math.floor(t / 5) % 3, l = ['both', 'lung', 'body'][k]; if (l !== st.loop) { setLoop(l); st.row?.select([2, 0, 1][k]); } }
        updateDC(dt);
      }
      if (s === 3) updateVessels(dt);
      if (s === 4) updateBlood(dt);
      if (s === 5) {
        if (st.auto) { const bpm = Math.round(70 + 60 * (0.5 - 0.5 * Math.cos(Math.max(0, t - 1) * 0.5))); if (bpm !== st.bpm) { st.bpm = bpm; st.slider?.set(bpm); hrReadout(); } }
        // Sample the trace at a fixed rate so it does not depend on the frame rate.
        st.sampleT += dt;
        while (st.sampleT >= 1 / 40) {
          st.sampleT -= 1 / 40;
          traceVal.copyWithin(0, 1);
          const q = p;
          traceVal[NS - 1] = Math.exp(-(((q - 0.17) / 0.018) ** 2)) * 0.42 - Math.exp(-(((q - 0.21) / 0.02) ** 2)) * 0.08 + Math.exp(-(((q - 0.05) / 0.03) ** 2)) * 0.06 + Math.exp(-(((q - 0.42) / 0.05) ** 2)) * 0.1;
        }
        for (let k = 0; k < NS; k++) tracePos[k * 3 + 1] = traceVal[k] - 0.05;
        traceGeo.attributes.position.needsUpdate = true;
      }
      if (s === 6) updateCoronary(dt);
      return true;
    },
  };

  function updateDC(dt) {
    st.dcPhase += dt * 0.045;
    for (let k = 0; k < ND; k++) {
      const u = (st.dcPhase + k / ND) % 1;
      const show = st.loop === 'both' || loopOf(u) === st.loop || loopOf(u) === 'heart';
      dcCurve.getPointAt(u, P3);
      C1.copy(BLUE).lerp(RED, oxyAt(u));
      E3.set(k * 1.3 + u * 20, k * 0.7, 0); QT.setFromEuler(E3);
      dcDots.setMatrixAt(k, M4.compose(P3, QT, S3.setScalar(show ? 1 : 0.001)));
      dcDots.setColorAt(k, C1);
    }
    dcDots.instanceMatrix.needsUpdate = true; dcDots.instanceColor.needsUpdate = true;
  }

  function updateVessels(dt) {
    const t = st.time;
    if (st.auto) {
      const j = Math.floor(t / 3.5) % 4;
      const want = j === 3 ? 1 : j;
      if (want !== st.vessel || (j === 3) !== st.backTo) { st.backTo = j === 3; if (st.toggle) st.toggle.checked = st.backTo; setVessel(want); st.row?.select(want); }
    }
    st.vPhase += dt;
    // Artery: fast, pulsing flow.
    const surge = 0.6 + 0.8 * Math.max(0, Math.sin(t * 7));
    for (let k = 0; k < 10; k++) {
      const y = -VLEN / 2 + ((st.vPhase * 0.35 * surge + k / 10 + rand(k) * 0.05) % 1) * VLEN;
      P3.set((rand(k + 3) - 0.5) * 0.15, y, 0.06 + rand(k + 5) * 0.06);
      E3.set(k, y * 6, k * 0.5); QT.setFromEuler(E3);
      artDots.setMatrixAt(k, M4.compose(P3, QT, S3.setScalar(1.2)));
    }
    artDots.instanceMatrix.needsUpdate = true;
    // Vein: slow flow toward the heart; when blood flows back, the valves shut and cells pile up behind them.
    st.back = st.backTo;
    for (const v of veinValves) { const want = st.back ? v.closed : v.open; v.piv.rotation.z += (want - v.piv.rotation.z) * Math.min(1, dt * 8); }
    for (let k = 0; k < 18; k++) {
      let y = veinY[k];
      if (!st.back) { y += dt * 0.25; if (y > VLEN / 2) y -= VLEN; }
      else {
        const before = y; y -= dt * 0.25;
        for (const v of veinValves) if (before >= v.y + 0.04 && y < v.y + 0.04) y = v.y + 0.04 + rand(k) * 0.12;
        if (y < -VLEN / 2) y += VLEN;
      }
      veinY[k] = y;
      P3.set((rand(k + 7) - 0.5) * 0.4, y, 0.08 + rand(k + 9) * 0.15);
      E3.set(k * 0.8, k, 0); QT.setFromEuler(E3);
      veinDots.setMatrixAt(k, M4.compose(P3, QT, S3.setScalar(1.3)));
    }
    veinDots.instanceMatrix.needsUpdate = true;
    // Capillary: red cells in single file.
    for (let k = 0; k < 9; k++) {
      const y = -VLEN / 2 + ((st.vPhase * 0.12 + k / 9) % 1) * VLEN;
      P3.set(0, y, 0.0);
      capDots.setMatrixAt(k, M4.compose(P3, QI, S3.setScalar(1.05)));
    }
    capDots.instanceMatrix.needsUpdate = true;
  }

  function updateBlood(dt) {
    const t = st.time;
    if (st.auto) {
      if (t > 1.0 && !st.sepTo) { setSpin(true); if (st.toggle) st.toggle.checked = true; }
      const j = t > 4.5 ? Math.floor((t - 4.5) / 2.5) % 4 : 0;
      if (j !== st.blood) { setBlood(j); st.row?.select(j); }
    }
    if (st.spinning) {
      st.spin += dt;
      const k = Math.min(1, st.spin / 2.4), speed = Math.sin(Math.PI * k) * 14;
      rotor.rotation.y += dt * speed;
      tubeG.position.x = Math.sin(Math.PI * k) * 0.38;
      tubeG.rotation.z = -Math.sin(Math.PI * k) * 0.9;
      st.sep = Math.min(1, st.sep + dt * 0.5);
      if (k >= 1) { st.spinning = false; rotor.rotation.y = 0; tubeG.position.x = 0; tubeG.rotation.z = 0; }
    } else if (!st.sepTo) st.sep = Math.max(0, st.sep - dt);
    mixedMat.opacity = 1 - st.sep; mixed.visible = st.sep < 0.99;
    for (const l of layers) l.material.opacity = st.sep;
    BP.pulse(t);
    reds.forEach((r, k) => { r.rotation.y += dt * (0.3 + 0.1 * k); r.position.y += Math.sin(t * 1.3 + k) * 0.0006; });
    white.rotation.y += dt * 0.2;
    plats.forEach((m, k) => { m.rotation.x += dt * (0.4 + 0.1 * k); });
  }

  function updateCoronary(dt) {
    const t = st.time;
    if (st.auto) { const v = Math.min(80, Math.floor(Math.max(0, t - 0.8) / 0.5) * 5); if (Math.round(st.plaqueTo * 100) !== v) { setPlaque(v); st.slider?.set(v); } if (v >= 80) st.auto = false; }
    if (kit.follow(st, 'plaque', st.plaqueTo, dt, 4)) shapePlaque(st.plaque);
    spot.scale.setScalar(0.6 + st.plaque * 1.4);
    const w = 1 - st.plaque;
    st.corPhase += dt * (0.08 + 0.17 * w * w);
    const active = Math.max(2, Math.round(16 * w * w));
    for (let k = 0; k < 16; k++) {
      if (k >= active) { corDots.setMatrixAt(k, M4.makeScale(0, 0, 0)); continue; }
      const x = -AL / 2 + ((st.corPhase + k / 16 + rand(k) * 0.04) % 1) * AL;
      const room = Math.max(0.03, AR * (1 - st.plaque * bump(x)) - 0.08);
      P3.set(x, (rand(k + 4) - 0.5) * room, (0.25 + 0.5 * rand(k + 2)) * room);
      E3.set(k, x * 4, k * 0.4); QT.setFromEuler(E3);
      corDots.setMatrixAt(k, M4.compose(P3, QT, S3.setScalar(1.3)));
    }
    corDots.instanceMatrix.needsUpdate = true;
  }
}
