// Light: rays, reflection and mirrors. A ray box shines through holes in three cards (light goes in straight
// lines); a plane mirror on a protractor shows angle of incidence = angle of reflection, measured from the
// normal, and what happens when the mirror turns; a glass plate shows where the image is (as far behind as
// the object is in front, same size, virtual); parallel rays hit a smooth or a rough surface; a periscope
// uses two mirrors at 45°. World units: 1 unit = 10 cm.
import { makeArrow, paint, fmt } from '../_shared/lab.js';

const A_X = 0, B_X = 16, C_X = 32, D_X = 48, E_X = 64;
const DEG = Math.PI / 180;
const YELLOW = 0xffb703, ORANGE = 0xfb8500, GREY = 0x8d99ae;

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xd8d2c4, sky: 0xdde8f0, radius: 46 });
  ground.position.x = 32;
  const sun = kit.lights(scene, { sun: [4, 10, 6] });
  scene.add(sun.target);
  const moveSun = x => { sun.position.set(x + 4, 10, 6); sun.target.position.set(x, 0, 0); };

  // A pool of ray arrows, handed out per step.
  const rays = [];
  for (let i = 0; i < 14; i++) { const a = makeArrow(THREE, YELLOW, { radius: 0.035, head: 0.22 }); scene.add(a); rays.push(a); }
  const rayColor = (a, c) => a.children[0].material.color.setHex(c);
  const hideRays = () => rays.forEach(a => { a.visible = false; });
  // Dashed lines (normal, rays traced back behind the glass).
  const dashMat = new THREE.LineDashedMaterial({ color: 0x33414d, dashSize: 0.12, gapSize: 0.08 });
  const dashes = [0, 1, 2].map(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, dashMat);
    l.frustumCulled = false; l.visible = false;
    scene.add(l);
    l.set = (a, b) => {
      const p = g.attributes.position.array;
      p[0] = a.x; p[1] = a.y; p[2] = a.z; p[3] = b.x; p[4] = b.y; p[5] = b.z;
      g.attributes.position.needsUpdate = true;
      l.computeLineDistances();
      l.visible = true;
    };
    return l;
  });
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), v5 = new THREE.Vector3(), v6 = new THREE.Vector3();

  // A little ray box: dark box with a slit glowing at the front (+x of its own frame).
  function rayBox(parent) {
    const g = new THREE.Group();
    kit.mesh(new THREE.BoxGeometry(0.7, 0.45, 0.45), kit.mat(0x2b2d42), [-0.35, 0, 0], g);
    kit.mesh(new THREE.BoxGeometry(0.03, 0.1, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }), [0.01, 0, 0], g);
    parent.add(g);
    return g;
  }

  // ---------- Station A: holes in three cards ----------
  const stA = new THREE.Group();
  stA.position.x = A_X;
  scene.add(stA);
  const lampA = rayBox(stA);
  lampA.position.set(-4.2, 1.0, 0);
  kit.mesh(new THREE.BoxGeometry(0.5, 0.78, 0.3), kit.mat(0x4a4e69), [-4.5, 0.39, 0], stA);
  const cardMat = kit.mat(0xf4a261, { roughness: 0.9 });
  const HOLE = 0.16;
  function card(x) {
    const g = new THREE.Group();
    g.position.set(x, 0, 0);
    const W = 1.4, H = 1.7, T = 0.05, cy = 1.0;
    const side = (W - HOLE) / 2;
    kit.mesh(new THREE.BoxGeometry(T, H - (cy + HOLE / 2) + 0.15, W), cardMat, [0, (cy + HOLE / 2 + H + 0.15) / 2, 0], g);
    kit.mesh(new THREE.BoxGeometry(T, cy - HOLE / 2 - 0.15, W), cardMat, [0, (cy - HOLE / 2 + 0.15) / 2, 0], g);
    kit.mesh(new THREE.BoxGeometry(T, HOLE, side), cardMat, [0, cy, -(HOLE / 2 + side / 2)], g);
    kit.mesh(new THREE.BoxGeometry(T, HOLE, side), cardMat, [0, cy, HOLE / 2 + side / 2], g);
    kit.mesh(new THREE.BoxGeometry(0.4, 0.06, 0.6), kit.mat(0x6d597a), [0, 0.18, 0], g);
    stA.add(g);
    return g;
  }
  const cards = [card(-2.4), card(-0.4), card(1.6)];
  const screen = kit.mesh(new THREE.BoxGeometry(0.06, 1.8, 2.2), kit.mat(0xffffff, { roughness: 0.9 }), [3.6, 1.05, 0], stA);
  kit.mesh(new THREE.BoxGeometry(0.4, 0.06, 0.8), kit.mat(0x6d597a), [3.6, 0.18, 0], stA);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85 });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 12), beamMat);
  beam.rotation.z = Math.PI / 2;
  stA.add(beam);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
  spot.rotation.y = -Math.PI / 2;
  stA.add(spot);
  const lampTag = label('Ray box', new THREE.Vector3(A_X - 4.4, 1.55, 0));
  const screenTag = label('Screen', new THREE.Vector3(A_X + 3.6, 2.2, 0));
  const cardTag = label('Card with a hole', new THREE.Object3D());
  cardTag.at.position.set(0, 2.05, 0);
  cards[1].add(cardTag.at);

  // ---------- Station B: mirror on a protractor ----------
  const stB = new THREE.Group();
  stB.position.x = B_X;
  scene.add(stB);
  kit.mesh(new THREE.BoxGeometry(6.4, 0.1, 3.6), kit.mat(0xb08968), [0, 0.05, 0.9], stB);    // table board
  const turn = new THREE.Group();   // mirror, normal and protractor turn together
  turn.position.y = 0.1;
  stB.add(turn);
  const PR = 2.4;
  const protCanvas = document.createElement('canvas');
  protCanvas.width = protCanvas.height = 512;
  const protTex = new THREE.CanvasTexture(protCanvas);
  protTex.colorSpace = THREE.SRGBColorSpace; protTex.anisotropy = 4;
  const prot = new THREE.Mesh(new THREE.CircleGeometry(PR, 64, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ map: protTex, roughness: 0.8 }));
  prot.rotation.x = -Math.PI / 2;
  prot.position.y = 0.005;
  prot.receiveShadow = true;
  turn.add(prot);
  const silver = kit.mat(0xd9e8f2, { metalness: 0.35, roughness: 0.12 });
  kit.mesh(new THREE.BoxGeometry(5.0, 0.7, 0.05), silver, [0, 0.35, -0.025], turn);
  kit.mesh(new THREE.BoxGeometry(5.0, 0.7, 0.06), kit.mat(0x33414d), [0, 0.35, -0.08], turn);
  const normalEnd = new THREE.Object3D();
  normalEnd.position.set(0, 0.05, PR + 0.15);
  turn.add(normalEnd);
  const normalTag = label('Normal', normalEnd);
  const mirrorTagAt = new THREE.Object3D();
  mirrorTagAt.position.set(-2.1, 0.85, 0);
  turn.add(mirrorTagAt);
  const mirrorTag = label('Mirror', mirrorTagAt);
  const lampB = rayBox(stB);
  const inTag = label('Incident ray', new THREE.Object3D(), { cls: 'warm' });
  const outTag = label('Reflected ray', new THREE.Object3D(), { cls: 'warm' });

  function drawProtractor(i, r) {
    const c = protCanvas.getContext('2d'), S = 512, cx = 256, cy = 256, R = 250;
    c.clearRect(0, 0, S, S);
    // Lower half of the canvas is the half disc in front of the mirror (world +z points down the canvas).
    c.fillStyle = '#fbfaf3'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, 0, Math.PI); c.fill();
    // Angle wedges: incidence on the left of the normal, reflection on the right.
    const wedge = (from, to, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 120, from, to); c.closePath(); c.fill(); };
    if (i > 0.5) wedge(Math.PI / 2, Math.PI / 2 + i * DEG, 'rgba(255,183,3,0.45)');
    if (r > 0.5) wedge(Math.PI / 2 - r * DEG, Math.PI / 2, 'rgba(251,133,0,0.4)');
    c.strokeStyle = '#1d2b36'; c.fillStyle = '#1d2b36'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let a = 0; a <= 180; a += 5) {
      const t = a * DEG, big = a % 10 === 0, l = big ? 22 : 12;
      c.lineWidth = big ? 3 : 1.5;
      c.beginPath(); c.moveTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); c.lineTo(cx + Math.cos(t) * (R - l), cy + Math.sin(t) * (R - l)); c.stroke();
      if (big && a % 30 === 0) {
        const fromNormal = Math.abs(90 - a);
        c.font = '700 22px system-ui, sans-serif';
        c.fillText(String(fromNormal), cx + Math.cos(t) * (R - 44), cy + Math.sin(t) * (R - 44));
      }
    }
    c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI); c.stroke();
    c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.stroke();
    c.font = '800 28px system-ui, sans-serif';
    if (i > 4) { c.fillStyle = '#b36b00'; c.fillText(`i = ${Math.round(i)}°`, cx - 70, cy + 150); }
    if (r > 4) { c.fillStyle = '#c05000'; c.fillText(`r = ${Math.round(r)}°`, cx + 70, cy + 150); }
    protTex.needsUpdate = true;
  }

  // ---------- Station C: object, glass plate and image ----------
  const stC = new THREE.Group();
  stC.position.x = C_X;
  scene.add(stC);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 0.05), new THREE.MeshStandardMaterial({ color: 0xbfe3f5, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2, depthWrite: false }));
  plate.position.set(0, 1.2, 0); plate.renderOrder = 2;
  stC.add(plate);
  const plateEdge = new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry), new THREE.LineBasicMaterial({ color: 0x5c7c8a }));
  plateEdge.position.copy(plate.position);
  stC.add(plateEdge);
  kit.mesh(new THREE.BoxGeometry(3.8, 0.1, 0.4), kit.mat(0x4a4e69), [0, 0.05, 0], stC);
  function candle(mat, flameMat) {
    const g = new THREE.Group();
    kit.mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 20), mat, [0, 0.4, 0], g);
    kit.mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 4), kit.mat(0x222222), [0, 0.84, 0], g);
    const fl = kit.mesh(new THREE.SphereGeometry(0.07, 12, 8), flameMat, [0, 0.95, 0], g);
    fl.scale.y = 1.8; fl.castShadow = false;
    stC.add(g);
    return g;
  }
  const OBJ_X = -0.7;
  const obj = candle(kit.mat(0xe63946), new THREE.MeshBasicMaterial({ color: 0xffb703 }));
  const ghostMat = new THREE.MeshStandardMaterial({ color: 0xe63946, transparent: true, opacity: 0.45, depthWrite: false });
  const img = candle(ghostMat, new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.5, depthWrite: false }));
  img.traverse(m => { if (m.isMesh) m.castShadow = false; });
  const objTag = label('Object', new THREE.Object3D());
  objTag.at.position.y = 1.35; obj.add(objTag.at);
  const imgTag = label('Image', new THREE.Object3D(), { cls: 'cool' });
  imgTag.at.position.y = 1.35; img.add(imgTag.at);
  // Floor ruler through the object and the image: distances in cm from the glass.
  const rulerTex = paint(THREE, 512, 64, (g, w, h) => {
    g.fillStyle = '#f6e7b4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d2b36'; g.strokeStyle = '#1d2b36'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 18px system-ui, sans-serif';
    for (let cm = -35; cm <= 35; cm++) {
      const x = w / 2 + cm * (w / 70), big = cm % 5 === 0;
      g.lineWidth = big ? 2.5 : 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, big ? 22 : 12); g.stroke();
      if (cm % 10 === 0 && Math.abs(cm) < 35) g.fillText(String(Math.abs(cm)), x, 42);
    }
  });
  const ruler = kit.mesh(new THREE.PlaneGeometry(7, 0.55), new THREE.MeshStandardMaterial({ map: rulerTex, roughness: 0.9 }), [OBJ_X - 0.55, 0.012, 0], stC);
  ruler.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  ruler.castShadow = false;
  // The eye looking into the glass.
  function eye(parent) {
    const g = new THREE.Group();
    kit.mesh(new THREE.SphereGeometry(0.2, 20, 14), kit.mat(0xffffff, { roughness: 0.3 }), [0, 0, 0], g);
    kit.mesh(new THREE.SphereGeometry(0.1, 16, 10), kit.mat(0x3a86ff), [0, 0, 0.13], g);
    kit.mesh(new THREE.SphereGeometry(0.05, 12, 8), kit.mat(0x111111), [0, 0, 0.2], g);
    parent.add(g);
    return g;
  }
  const EYE_C = new THREE.Vector3(1.4, 1.15, 3.0);
  const eyeC = eye(stC);
  eyeC.position.copy(EYE_C);
  eyeC.lookAt(v1.set(C_X, 0.9, 0));    // pupil (+z of the eye) towards the glass
  const eyeTag = label('Eye', new THREE.Vector3(C_X + EYE_C.x, EYE_C.y + 0.4, EYE_C.z));
  const glassTag = label('Glass plate', new THREE.Vector3(C_X + 1.9, 0.45, 0));

  // ---------- Station D: smooth and rough surfaces ----------
  const stD = new THREE.Group();
  stD.position.x = D_X;
  scene.add(stD);
  const rough = x => 0.11 * Math.sin(3.1 * x) + 0.07 * Math.sin(7.3 * x + 1) + 0.045 * Math.sin(12.7 * x + 2);
  const roughD = x => 0.11 * 3.1 * Math.cos(3.1 * x) + 0.07 * 7.3 * Math.cos(7.3 * x + 1) + 0.045 * 12.7 * Math.cos(12.7 * x + 2);
  const SURF_Y = 0.6, SL = 7;
  function surface(fn, mat) {
    const geo = new THREE.BoxGeometry(SL, 0.4, 1.6, 140, 1, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, 0.2 + fn(p.getX(i)));
    geo.computeVertexNormals();
    const m = kit.mesh(geo, mat, [0, SURF_Y - 0.2, 0], stD);
    return m;
  }
  const smoothSurf = surface(() => 0, kit.mat(0xcfe3ee, { metalness: 0.4, roughness: 0.1 }));
  const roughSurf = surface(rough, kit.mat(0xc9b79c, { roughness: 1, flatShading: true }));
  kit.mesh(new THREE.BoxGeometry(SL + 0.2, 0.4, 1.8), kit.mat(0x6d597a), [0, 0.2, 0], stD).castShadow = false;
  const surfTagAt = new THREE.Vector3(D_X - 2.9, SURF_Y + 0.55, 0.8);
  const surfTag = label('Smooth surface', surfTagAt);
  const normals = [];
  for (let k = 0; k < 6; k++) {
    const n = kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 4), new THREE.MeshBasicMaterial({ color: 0x33414d }), [0, 0, 0], stD);
    n.castShadow = false;
    normals.push(n);
  }
  // A wide lamp that sends out parallel rays (its glowing face is along its own y axis).
  const lampD = new THREE.Group();
  kit.mesh(new THREE.BoxGeometry(0.22, 4.2, 0.5), kit.mat(0x5c677d), [-0.12, 0, 0], lampD);
  kit.mesh(new THREE.BoxGeometry(0.02, 4.1, 0.36), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }), [0.0, 0, 0], lampD);
  stD.add(lampD);

  // ---------- Station E: periscope ----------
  const stE = new THREE.Group();
  stE.position.x = E_X;
  scene.add(stE);
  const tubeMat = kit.mat(0x2a9d8f, { roughness: 0.7 });
  const PT = 4.4, PB = 0.6, PW = 0.45;    // tube top, bottom and half width
  kit.mesh(new THREE.BoxGeometry(PW * 2 + 0.1, PT - PB, 0.06), tubeMat, [0, (PT + PB) / 2, -0.4], stE);         // back
  kit.mesh(new THREE.BoxGeometry(0.06, PT - 0.95 - PB, 0.8), tubeMat, [-PW, (PT - 0.95 + PB) / 2, 0], stE);     // left wall (opening at the top)
  kit.mesh(new THREE.BoxGeometry(0.06, PT - (PB + 0.95), 0.8), tubeMat, [PW, (PT + PB + 0.95) / 2, 0], stE);    // right wall (opening at the bottom)
  kit.mesh(new THREE.BoxGeometry(PW * 2 + 0.1, 0.06, 0.8), tubeMat, [0, PT, 0], stE);
  kit.mesh(new THREE.BoxGeometry(PW * 2 + 0.1, 0.06, 0.8), tubeMat, [0, PB, 0], stE);
  kit.mesh(new THREE.CylinderGeometry(0.08, 0.1, PB, 8), kit.mat(0x5c6b77), [0, PB / 2, 0], stE);
  const front = new THREE.Mesh(new THREE.BoxGeometry(PW * 2 + 0.1, PT - PB, 0.03), new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.15, depthWrite: false }));
  front.position.set(0, (PT + PB) / 2, 0.4); front.renderOrder = 2;
  stE.add(front);
  const TOP_C = new THREE.Vector2(0, PT - 0.5), BOT_C = new THREE.Vector2(0, PB + 0.5), HALF_M = 0.55;
  const mirrors = [TOP_C, BOT_C].map(c => {
    const g = new THREE.Group();
    g.position.set(c.x, c.y, 0);
    kit.mesh(new THREE.BoxGeometry(HALF_M * 2, 0.05, 0.7), silver, [0, 0, 0], g);
    stE.add(g);
    return g;
  });
  const topTagAt = new THREE.Object3D(), botTagAt = new THREE.Object3D();
  topTagAt.position.set(0.9, 0.35, 0); botTagAt.position.set(-0.9, -0.2, 0);
  mirrors[0].add(topTagAt); mirrors[1].add(botTagAt);
  const topTag = label('Top mirror', topTagAt), botTag = label('Bottom mirror', botTagAt);
  // Wall that blocks the direct view, a flag beyond it and the eye.
  kit.mesh(new THREE.BoxGeometry(0.5, 3.2, 3), kit.mat(0xb5838d, { roughness: 1 }), [-2.2, 1.6, 0], stE);
  const wallTag = label('Wall', new THREE.Vector3(E_X - 2.2, 3.5, 1.2));
  const FLAG = new THREE.Vector2(-4.6, TOP_C.y);
  kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, FLAG.y + 0.5, 8), kit.mat(0x5c6b77), [FLAG.x - 0.05, (FLAG.y + 0.5) / 2, 0], stE);
  kit.mesh(new THREE.BoxGeometry(0.02, 0.4, 0.6), kit.mat(0xe63946), [FLAG.x, FLAG.y + 0.25, 0.3], stE);
  const flagTag = label('Flag', new THREE.Vector3(E_X + FLAG.x, FLAG.y + 0.75, 0));
  const EYE_E = new THREE.Vector2(2.0, BOT_C.y);
  const eyeE = eye(stE);
  eyeE.position.set(EYE_E.x, EYE_E.y, 0);
  eyeE.rotation.y = -Math.PI / 2;    // pupil towards -x
  const eyeETag = label('Eye', new THREE.Vector3(E_X + EYE_E.x, EYE_E.y + 0.45, 0));

  // ---------- State ----------
  const st = { step: 0, quiz: false, time: 0, plan: [], slider: null, off: 0.5, inc: 40, turnA: 0, dist: 2.0, roughOn: false, auto: false, peri: 45, key: '' };

  const allTags = [lampTag, screenTag, cardTag, normalTag, mirrorTag, inTag, outTag, objTag, imgTag, eyeTag, glassTag, surfTag, topTag, botTag, wallTag, flagTag, eyeETag];
  function hideAll() {
    allTags.forEach(l => l.show(false));
    hideRays(); dashes.forEach(d => { d.visible = false; });
    beam.visible = spot.visible = false;
    normals.forEach(n => { n.visible = false; });
  }

  // ---------- Station logic ----------
  function layoutA() {
    cards[1].position.z = st.off;
    const through = Math.abs(st.off) < HOLE / 2 - 0.02;
    const x0 = -4.15, x1 = through ? 3.56 : -0.43;
    beam.position.set((x0 + x1) / 2, 1.0, 0); beam.scale.y = x1 - x0;
    spot.position.set(x1 - 0.005, 1.0, 0);
    beam.visible = spot.visible = true;
    ui.readout(`Middle card moved: <b>${fmt(Math.abs(st.off) * 10, 1)} cm</b> · Holes in a straight line: <b>${through ? 'yes' : 'no'}</b><br>${through ? 'The light goes straight through all three holes to the screen.' : 'The light cannot bend around the card, so it is <b>blocked</b>.'}`);
  }

  // Station B, in its own frame: incident ray comes in at a fixed direction; the mirror may be turned.
  function layoutB() {
    const th = st.step === 2 ? st.turnA * DEG : 0;
    turn.rotation.y = th;
    const iFixed = st.step === 2 ? 30 : st.inc;
    const din = v1.set(Math.sin(iFixed * DEG), 0, -Math.cos(iFixed * DEG));     // travelling towards the mirror
    const n = v2.set(Math.sin(th), 0, Math.cos(th));
    const i = Math.acos(Math.min(1, -din.dot(n))) / DEG;
    const dout = v3.copy(din).addScaledVector(n, -2 * din.dot(n));
    const Y = 0.2, L = 2.25, O = v4.set(B_X, Y, 0);
    const start = v5.copy(O).addScaledVector(din, -L);
    rayColor(rays[0], YELLOW); rayColor(rays[1], ORANGE);
    rays[0].point(start.x, Y, start.z, din.x, 0, din.z, L - 0.02, 0.3);
    rays[1].point(O.x, Y, O.z, dout.x, 0, dout.z, L, 0.3);
    lampB.position.set(start.x - B_X - din.x * 0.02, Y, start.z);
    lampB.rotation.y = Math.atan2(-din.z, din.x);
    inTag.at.parent?.remove(inTag.at); rays[0].tip.add(inTag.at);
    outTag.at.parent?.remove(outTag.at); rays[1].tip.add(outTag.at);
    // Ghost of the reflected ray before the mirror was turned.
    if (st.step === 2) {
      const g0 = v4.set(Math.sin(30 * DEG), 0, Math.cos(30 * DEG));
      rayColor(rays[2], GREY);
      rays[2].point(B_X, Y - 0.05, 0, g0.x, 0, g0.z, L * 0.9, 0.3);
    } else rays[2].visible = false;
    dashes[2].set(v5.set(B_X, 0.13, 0), v6.set(B_X + n.x * PR, 0.13, n.z * PR));
    drawProtractor(i, i);
    if (st.step === 1 || st.quiz) ui.readout(st.quiz ? '' : `Angle of incidence i = <b>${Math.round(i)}°</b> · Angle of reflection r = <b>${Math.round(i)}°</b><br>Both measured from the normal: <b>i = r</b>`);
    else ui.readout(`Mirror turned <b>${Math.abs(st.turnA)}°</b> · i = r = <b>${Math.round(i)}°</b><br>The reflected ray turned <b>${Math.abs(2 * st.turnA)}°</b> (twice as much)`);
  }

  function layoutC() {
    const d = st.dist;
    obj.position.set(OBJ_X, 0.1, d);
    img.position.set(OBJ_X, 0.1, -d);
    const E = v4.set(C_X + EYE_C.x, EYE_C.y, EYE_C.z);
    [[1.05, 0, YELLOW], [0.2, 1, ORANGE]].forEach(([h, k, col]) => {
      const T = v1.set(C_X + OBJ_X, 0.1 + h, d), I = v2.set(C_X + OBJ_X, 0.1 + h, -d);
      const P = v3.copy(I).lerp(E, d / (E.z + d));                // where the line image → eye crosses the glass
      rayColor(rays[k * 2], col); rayColor(rays[k * 2 + 1], col);
      const a = v5.subVectors(P, T), b = v6.subVectors(E, P);
      rays[k * 2].point(T.x, T.y, T.z, a.x, a.y, a.z, a.length() - 0.02, 0.2);
      rays[k * 2 + 1].point(P.x, P.y, P.z, b.x, b.y, b.z, b.length() - 0.2, 0.2);
      dashes[k].set(P, I);
    });
    const cm = Math.round(d * 10);
    ui.readout(`Object distance: <b>${cm} cm</b> in front · Image distance: <b>${cm} cm</b> behind<br>Object height <b>10 cm</b> = image height <b>10 cm</b>`);
  }

  // Station D: six parallel rays at 40° to the vertical hit the surface and reflect.
  function layoutD() {
    const fn = st.roughOn ? rough : () => 0, fd = st.roughOn ? roughD : () => 0;
    smoothSurf.visible = !st.roughOn; roughSurf.visible = st.roughOn;
    surfTag.text = st.roughOn ? 'Rough surface' : 'Smooth surface';
    const a = 40 * DEG, dx = Math.sin(a), dy = -Math.cos(a);
    const qx = -dx * 3.0, qy = SURF_Y - dy * 3.0;    // centre of the lamp face (perpendicular to the rays)
    for (let k = 0; k < 6; k++) {
      const x = -2.5 + k, y = SURF_Y + fn(x);
      const nx = -fd(x), ny = 1, nl = Math.hypot(nx, ny);
      const ux = nx / nl, uy = ny / nl, dot = dx * ux + dy * uy;
      const rx = dx - 2 * dot * ux, ry = dy - 2 * dot * uy;
      rayColor(rays[k], YELLOW); rayColor(rays[6 + k], ORANGE);
      const L = (x - qx) * dx + (y - qy) * dy;
      rays[k].point(D_X + x - dx * L, y - dy * L, 0, dx, dy, 0, L - 0.02, 0.3);
      rays[6 + k].point(D_X + x, y, 0, rx, ry, 0, 2.2, 0.3);
      const nm = normals[k];
      nm.visible = true;
      nm.position.set(x + ux * 0.35, y + uy * 0.35, 0);
      nm.rotation.z = Math.atan2(-ux, uy);
    }
    lampD.position.set(qx, qy, 0);
    lampD.rotation.z = Math.atan2(dy, dx);
    ui.readout(st.roughOn
      ? '<b>Rough surface: diffuse reflection.</b> The rays scatter in many directions, so there is no clear image, but you can see the surface from anywhere.'
      : '<b>Smooth surface: regular reflection.</b> Parallel rays stay parallel, so the surface acts as a mirror and gives a clear image.');
  }

  // Station E: trace a ray through the periscope in its own x–y plane.
  function reflect2(dx, dy, nx, ny) { const d = dx * nx + dy * ny; return [dx - 2 * d * nx, dy - 2 * d * ny]; }
  function hitSeg(px, py, dx, dy, c, mx, my) {
    // Solve p + t d = c + s m.
    const det = dx * -my - dy * -mx;
    if (Math.abs(det) < 1e-9) return null;
    const ex = c.x - px, ey = c.y - py;
    const t = (ex * -my - ey * -mx) / det, s = (dx * ey - dy * ex) / det;
    return t > 1e-4 && Math.abs(s) <= HALF_M ? t : null;
  }
  function wallHit(px, py, dx, dy) {
    let t = Infinity;
    if (dx > 1e-6) t = Math.min(t, (PW - 0.03 - px) / dx);
    if (dx < -1e-6) t = Math.min(t, (-PW + 0.03 - px) / dx);
    if (dy < -1e-6) t = Math.min(t, (PB + 0.03 - py) / dy);
    if (dy > 1e-6) t = Math.min(t, (PT - 0.03 - py) / dy);
    return t;
  }
  function layoutE() {
    const b = st.peri * DEG, mx = Math.cos(b), my = -Math.sin(b);
    mirrors.forEach(m => { m.rotation.z = -b; });
    const nx = -Math.sin(b), ny = -Math.cos(b);
    hideRays();
    const seg = (k, x, y, dx, dy, len) => { rayColor(rays[k], k ? ORANGE : YELLOW); rays[k].point(E_X + x, y, 0, dx, dy, 0, len, 0.3); };
    // Flag to top mirror (always reaches the centre of the top mirror).
    const t0 = TOP_C.x - FLAG.x;
    seg(0, FLAG.x, FLAG.y, 1, 0, t0);
    let [dx, dy] = reflect2(1, 0, nx, ny);
    const turn1 = Math.acos(Math.max(-1, Math.min(1, dx))) / DEG;
    let px = TOP_C.x, py = TOP_C.y, msg;
    const tb = hitSeg(px, py, dx, dy, BOT_C, mx, my);
    const tw = wallHit(px, py, dx, dy);
    if (tb !== null && tb < tw) {
      seg(1, px, py, dx, dy, tb);
      px += dx * tb; py += dy * tb;
      [dx, dy] = reflect2(dx, dy, nx, ny);
      const len = (EYE_E.x - 0.22 - px) / Math.max(0.2, dx);
      seg(2, px, py, dx, dy, Math.min(3, Math.max(0.3, len)));
      const yAtEye = py + dy * ((EYE_E.x - px) / Math.max(1e-3, dx));
      const sees = dx > 0.2 && Math.abs(yAtEye - EYE_E.y) < 0.22;
      msg = sees ? 'The light comes out <b>level</b> and reaches the eye: you see the flag over the wall.' : 'The light comes out level but at the <b>wrong height</b>, so it misses the eye.';
    } else {
      const yw = py + dy * tw, out = dx > 0 && yw < PB + 0.95;   // leaves through the eye opening
      seg(1, px, py, dx, dy, Math.max(0.05, out ? Math.min(tw + 1.6, 4) : Math.min(tw, 4)));
      msg = out ? 'The light misses the bottom mirror and comes out <b>slanting down</b>, so it misses the eye.' : 'The light hits the <b>inside of the tube</b> and never reaches the eye.';
    }
    ui.readout(`Mirror angle: <b>${st.peri}°</b> · The top mirror turns the light through <b>${Math.round(turn1)}°</b><br>${msg}`);
  }

  // ---------- Steps ----------
  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? 6 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.slider = null; st.auto = false;
      hideAll();
      if (i === 0) {
        moveSun(A_X);
        view({ radius: 2.6, width: 4.4, yaw: 0.55, pitch: 0.3, target: [A_X - 0.2, 1.0, 0] });
        lampTag.show(true); screenTag.show(true); cardTag.show(true);
        st.off = 0.5;
        st.slider = ui.slider({ label: 'Move the middle card', min: -5, max: 5, step: 0.5, value: 5, unit: ' cm', format: v => fmt(v, 1), onInput: v => { st.plan = []; st.off = v / 10; layoutA(); } });
        for (let j = 1; j <= 10; j++) st.plan.push([0.4 + j * 0.12, () => { st.off = 0.5 - j * 0.05; st.slider?.set(+(st.off * 10).toFixed(1)); layoutA(); }]);
        layoutA();
      }
      if (i === 1 || i === 2) {
        moveSun(B_X);
        view({ radius: 2.6, width: 3.0, yaw: 0, pitch: 0.95, target: [B_X, 0.3, 1.0] });
        normalTag.show(true); mirrorTag.show(true); inTag.show(true); outTag.show(true);
        if (i === 1) {
          st.inc = 30;
          st.slider = ui.slider({ label: 'Angle of incidence', min: 0, max: 80, step: 1, value: 30, unit: '°', onInput: v => { st.plan = []; st.inc = v; layoutB(); } });
          st.plan = [10, 20, 30, 40].map((a, j) => [0.6 + j * 0.25, () => { st.inc = 30 + a / 2; st.slider?.set(st.inc); layoutB(); }]);
        } else {
          st.turnA = 0;
          st.slider = ui.slider({ label: 'Turn the mirror', min: -20, max: 20, step: 1, value: 0, unit: '°', onInput: v => { st.plan = []; st.turnA = v; layoutB(); } });
          st.plan = [2, 4, 6, 8, 10].map((a, j) => [0.6 + j * 0.2, () => { st.turnA = a; st.slider?.set(a); layoutB(); }]);
        }
        layoutB();
      }
      if (i === 3) {
        moveSun(C_X);
        view({ radius: 3.0, yaw: 0.85, pitch: 0.42, target: [C_X - 0.2, 0.9, 0.2] });
        objTag.show(true); imgTag.show(true); eyeTag.show(true); glassTag.show(true);
        st.dist = 2.0;
        st.slider = ui.slider({ label: 'Object distance', min: 5, max: 30, step: 1, value: 20, unit: ' cm', onInput: v => { st.plan = []; st.dist = v / 10; layoutC(); } });
        st.plan = [22, 24, 26].map((cm, j) => [0.7 + j * 0.3, () => { st.dist = cm / 10; st.slider?.set(cm); layoutC(); }]);
        layoutC();
      }
      if (i === 4) {
        moveSun(D_X);
        view({ radius: 3.3, width: 4.2, yaw: 0, pitch: 0.2, target: [D_X - 0.2, 1.9, 0] });
        surfTag.show(true);
        st.roughOn = false; st.auto = true;
        const row = ui.buttons([
          { label: 'Smooth (like a mirror)', on: true, onClick: () => { st.auto = false; st.roughOn = false; layoutD(); } },
          { label: 'Rough (like paper)', onClick: () => { st.auto = false; st.roughOn = true; layoutD(); } },
        ]);
        st.plan = [[2.0, () => { if (st.auto) { st.roughOn = true; row.select(1); layoutD(); } }]];
        layoutD();
      }
      if (i === 5) {
        moveSun(E_X);
        view({ radius: 3.0, width: 4.0, yaw: 0, pitch: 0.12, target: [E_X - 1.2, 2.4, 0] });
        topTag.show(true); botTag.show(true); wallTag.show(true); flagTag.show(true); eyeETag.show(true);
        st.peri = 35;
        st.slider = ui.slider({ label: 'Mirror angle', min: 30, max: 60, step: 1, value: 35, unit: '°', onInput: v => { st.plan = []; st.peri = v; layoutE(); } });
        st.plan = [37, 39, 41, 43, 45].map((a, j) => [0.6 + j * 0.25, () => { st.peri = a; st.slider?.set(a); layoutE(); }]);
        layoutE();
      }
      if (isQuiz) {
        moveSun(B_X);
        view({ radius: 2.8, width: 3.0, yaw: -0.35, pitch: 0.8, target: [B_X, 0.3, 0.9] });
        normalTag.show(true); mirrorTag.show(true);
        st.inc = 35; layoutB();
      }
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      const busy = st.plan.length > 0;
      // The beam in station A shimmers a little.
      if (beam.visible) { beamMat.opacity = 0.75 + 0.1 * Math.sin(st.time * 6); return true; }
      return busy;
    },
  };
}
