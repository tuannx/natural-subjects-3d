// Refraction and lenses. All rays are drawn in vertical planes facing the camera.
// Station A: a semicircular glass (or water) block on a protractor board: refraction at the flat face (step 0)
// and total internal reflection beyond the critical angle (step 2). Station B: a pool in cross-section with a
// coin and a stick: rays to an eye bend at the surface, so the coin looks shallower and the stick looks bent.
// Station C: an optical fibre whose bend can be tightened until light leaks out. Station D: a prism splits
// white light into colours. Station E: an optical bench with converging and diverging lenses, real images
// and a magnifying glass. Angles are worked out with Snell's law (n₁ sin i = n₂ sin r) and image distances
// with the lens formula (1/f = 1/d + 1/d′).
import { fmt } from '../_shared/lab.js';

const A_X = 0, B_X = 14, C_X = 28, D_X = 42, E_X = 58;
const DEG = Math.PI / 180;
const N_GLASS = 1.5, N_WATER = 1.33;
const YELLOW = 0xffb703, PALE = 0xffe08a;
const SPECTRUM = [
  // colour, refractive index of ordinary (crown) glass, about
  { c: 0xe63946, n: 1.514, name: 'red' }, { c: 0xf77f00, n: 1.516, name: 'orange' }, { c: 0xfcbf49, n: 1.517, name: 'yellow' },
  { c: 0x52b788, n: 1.519, name: 'green' }, { c: 0x3a86ff, n: 1.522, name: 'blue' }, { c: 0x5a4fcf, n: 1.527, name: 'indigo' }, { c: 0x9d4edd, n: 1.530, name: 'violet' },
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xd6d2c8, sky: 0xdfe9f2, radius: 48 });
  ground.position.x = 29;
  const sun = kit.lights(scene, { sun: [4, 10, 8] });
  scene.add(sun.target);
  const moveSun = x => { sun.position.set(x + 4, 10, 8); sun.target.position.set(x, 0, 0); };
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

  // ---------- Ray drawing: a pool of thin cylinders and dashed lines, handed out each redraw ----------
  const segGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  const mats = new Map();
  const matFor = (c, o) => {
    const key = `${c}-${Math.round(o * 10)}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o >= 1 }));
    return mats.get(key);
  };
  const segs = [];
  for (let i = 0; i < 220; i++) { const m = new THREE.Mesh(segGeo, matFor(YELLOW, 1)); m.visible = false; m.frustumCulled = false; scene.add(m); segs.push(m); }
  const dashMat = new THREE.LineDashedMaterial({ color: 0x33414d, dashSize: 0.12, gapSize: 0.09 });
  const dashMatLight = new THREE.LineDashedMaterial({ color: 0x8d99ae, dashSize: 0.1, gapSize: 0.08 });
  const dashes = [];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, dashMat);
    l.frustumCulled = false; l.visible = false;
    scene.add(l); dashes.push(l);
  }
  let nSeg = 0, nDash = 0;
  const up = V(0, 1, 0), va = V(0, 0), vb = V(0, 0), vd = V(0, 0);
  function beginRays() { nSeg = 0; nDash = 0; }
  function endRays() {
    for (let i = nSeg; i < segs.length; i++) segs[i].visible = false;
    for (let i = nDash; i < dashes.length; i++) dashes[i].visible = false;
  }
  function seg(x1, y1, x2, y2, z = 0, color = YELLOW, o = 1, r = 0.028) {
    if (nSeg >= segs.length) return;
    va.set(x1, y1, z); vb.set(x2, y2, z); vd.subVectors(vb, va);
    const len = vd.length();
    if (len < 1e-4) return;
    const m = segs[nSeg++];
    m.material = matFor(color, o);
    m.scale.set(r, len, r);
    m.position.addVectors(va, vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, vd.divideScalar(len));
    m.visible = true;
  }
  function dash(x1, y1, x2, y2, z = 0, light = false) {
    if (nDash >= dashes.length) return;
    const l = dashes[nDash++], p = l.geometry.attributes.position.array;
    p[0] = x1; p[1] = y1; p[2] = z; p[3] = x2; p[4] = y2; p[5] = z;
    l.geometry.attributes.position.needsUpdate = true;
    l.material = light ? dashMatLight : dashMat;
    l.computeLineDistances();
    l.visible = true;
  }
  // Refract direction (dx, dy) at a surface with unit normal (nx, ny) facing the incoming ray; n1 → n2.
  // Returns [tx, ty] or null for total internal reflection.
  function refract(dx, dy, nx, ny, n1, n2) {
    const eta = n1 / n2, cosi = -(nx * dx + ny * dy), k = 1 - eta * eta * (1 - cosi * cosi);
    if (k < 0) return null;
    const a = eta * cosi - Math.sqrt(k);
    return [eta * dx + a * nx, eta * dy + a * ny];
  }
  const reflect = (dx, dy, nx, ny) => { const d = dx * nx + dy * ny; return [dx - 2 * d * nx, dy - 2 * d * ny]; };
  const glassMat = (color = 0xbfe6ff, o = 0.35) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity: o, roughness: 0.08, metalness: 0, depthWrite: false, side: THREE.DoubleSide });

  // A small ray box: a dark box with a glowing slit at its local +x end.
  function rayBox() {
    const g = new THREE.Group();
    kit.mesh(new THREE.BoxGeometry(0.7, 0.36, 0.4), kit.mat(0x2b2d42), [-0.36, 0, 0], g);
    kit.mesh(new THREE.BoxGeometry(0.03, 0.08, 0.26), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }), [0.0, 0, 0], g);
    scene.add(g);
    return g;
  }
  const aimBox = (box, x, y, dx, dy) => { box.position.set(x, y, 0); box.rotation.set(0, 0, Math.atan2(dy, dx)); };
  function stand(x, w, h, color = 0x4a4e69) {
    kit.mesh(new THREE.BoxGeometry(w, 0.1, 1.2), kit.mat(color), [x, 0.05, 0], scene);
    return kit.mesh(new THREE.BoxGeometry(0.12, h, 0.12), kit.mat(color), [x, h / 2, -0.5], scene);
  }

  // ---------- Station A: semicircular block on a protractor board ----------
  const AY = 3.0, BR = 2.0, BOARD = 6;
  stand(A_X, 3, AY - BOARD / 2 + 0.1);
  const boardCanvas = { W: 512 };
  const boardTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    boardCanvas.ctx = c.getContext('2d');
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  })();
  const boardA = new THREE.Mesh(new THREE.PlaneGeometry(BOARD, BOARD), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false }));
  boardA.position.set(A_X, AY, -0.42);
  scene.add(boardA);
  kit.mesh(new THREE.BoxGeometry(BOARD + 0.12, BOARD + 0.12, 0.08), kit.mat(0x33414d), [A_X, AY, -0.48], scene);
  const half = new THREE.Shape();
  half.moveTo(-BR, 0); half.absarc(0, 0, BR, Math.PI, 2 * Math.PI, false); half.lineTo(-BR, 0);
  const halfGeo = new THREE.ExtrudeGeometry(half, { depth: 0.6, bevelEnabled: false, curveSegments: 40 });
  halfGeo.translate(0, 0, -0.3);
  const blockMat = glassMat();
  const block = new THREE.Mesh(halfGeo, blockMat);
  block.position.set(A_X, AY, 0); block.renderOrder = 2;
  scene.add(block);
  const blockEdges = new THREE.LineSegments(new THREE.EdgesGeometry(halfGeo, 30), new THREE.LineBasicMaterial({ color: 0x5e8fb0 }));
  blockEdges.position.copy(block.position);
  scene.add(blockEdges);
  const boxA = rayBox();
  const airTag = label('Air', V(A_X - 2.2, AY + 2.3), { cls: 'cool' });
  const glassTag = label('Glass', V(A_X + 1.6, AY - 1.7), { cls: 'cool' });
  const normalTag = label('Normal', V(A_X + 0.05, AY + 2.75));
  // The protractor drawing, with the angle wedges, is redrawn when the angle changes.
  function drawBoard(wedges) {
    const g = boardCanvas.ctx, W = 512, cx = W / 2, cy = W / 2, pr = BR / BOARD * W;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, W);
    g.strokeStyle = '#c7d0d8'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, pr * 1.25, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#7d8b97'; g.font = '600 15px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let a = 0; a < 360; a += 10) {
      const t = a * DEG - Math.PI / 2, r1 = pr * (a % 30 ? 1.19 : 1.14);
      g.beginPath(); g.moveTo(cx + Math.cos(t) * r1, cy + Math.sin(t) * r1); g.lineTo(cx + Math.cos(t) * pr * 1.25, cy + Math.sin(t) * pr * 1.25); g.stroke();
      if (a % 30 === 0) { const d = a <= 180 ? (a <= 90 ? a : 180 - a) : (a <= 270 ? a - 180 : 360 - a); g.fillText(`${d}°`, cx + Math.cos(t) * pr * 1.36, cy + Math.sin(t) * pr * 1.36); }
    }
    for (const w of wedges) {
      g.fillStyle = w.color; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, w.r || 64, w.a0 * DEG, w.a1 * DEG); g.closePath(); g.fill();
      const m = (w.a0 + w.a1) / 2 * DEG;
      g.fillStyle = '#1d2b36'; g.font = '800 26px system-ui, sans-serif';
      g.fillText(w.text, cx + Math.cos(m) * ((w.r || 64) + 20), cy + Math.sin(m) * ((w.r || 64) + 20));
    }
    // The normal: dashed, at right angles to the flat face.
    g.strokeStyle = '#1d2b36'; g.lineWidth = 3; g.setLineDash([12, 9]);
    g.beginPath(); g.moveTo(cx, 18); g.lineTo(cx, W - 18); g.stroke(); g.setLineDash([]);
    boardTex.needsUpdate = true;
  }
  const st = { step: 0, time: 0, auto: true, slider: null, quiz: false, angle: 40, medium: 'glass' };
  function drawRefraction() {
    const n = st.medium === 'glass' ? N_GLASS : N_WATER, i = st.angle * DEG;
    const r = Math.asin(Math.sin(i) / n);
    beginRays();
    const ox = A_X, oy = AY, sx = ox - Math.sin(i) * 3.3, sy = oy + Math.cos(i) * 3.3;
    aimBox(boxA, sx, sy, Math.sin(i), -Math.cos(i));
    seg(sx, sy, ox, oy, 0);
    seg(ox, oy, ox + Math.sin(i) * 2.6, oy + Math.cos(i) * 2.6, 0, YELLOW, 0.3, 0.02);     // weak reflection
    const ex = ox + Math.sin(r) * BR, ey = oy - Math.cos(r) * BR;
    seg(ox, oy, ex, ey, 0);
    seg(ex, ey, ox + Math.sin(r) * (BR + 1.1), oy - Math.cos(r) * (BR + 1.1), 0);           // leaves along a radius: no bend
    endRays();
    drawBoard([{ a0: -90 - st.angle, a1: -90, color: 'rgba(255,183,3,0.45)', text: 'i' }, { a0: 90 - r / DEG, a1: 90, color: 'rgba(58,134,255,0.35)', text: 'r', r: 80 }]);
    const rd = r / DEG, name = st.medium === 'glass' ? 'glass' : 'water';
    ui.readout(`i = <b>${Math.round(st.angle)}°</b> · r = <b>${Math.round(rd)}°</b><br>How the angle is worked out (Snell's law): n₁ × sin i = n₂ × sin r<br>1.00 × sin ${Math.round(st.angle)}° = ${n.toFixed(2)} × sin r → r ≈ ${Math.round(rd)}° (${name}: n ≈ ${n})`);
  }
  function drawTIR() {
    const n = N_GLASS, th = st.angle * DEG, c = Math.asin(1 / n);
    beginRays();
    const ox = A_X, oy = AY;
    const sx = ox + Math.sin(th) * 3.4, sy = oy - Math.cos(th) * 3.4;
    aimBox(boxA, sx, sy, -Math.sin(th), Math.cos(th));
    seg(sx, sy, ox, oy, 0);                                                                  // enters along a radius: no bend
    const total = th > c;
    const refl = total ? 1 : 0.25 + 0.6 * Math.pow(th / c, 6);
    const rx = ox - Math.sin(th) * BR, ry = oy - Math.cos(th) * BR;
    seg(ox, oy, rx, ry, 0, YELLOW, Math.min(1, refl), 0.028);
    seg(rx, ry, ox - Math.sin(th) * (BR + 1.1), oy - Math.cos(th) * (BR + 1.1), 0, YELLOW, Math.min(1, refl), 0.028);
    const wedges = [{ a0: 90 - st.angle, a1: 90, color: 'rgba(255,183,3,0.45)', text: 'i' }];
    let out = '';
    if (!total) {
      const r = Math.asin(n * Math.sin(th));
      seg(ox, oy, ox - Math.sin(r) * 2.7, oy + Math.cos(r) * 2.7, 0);
      wedges.push({ a0: -90 - r / DEG, a1: -90, color: 'rgba(58,134,255,0.35)', text: 'r', r: 80 });
      out = `Light gets out into the air, bent away from the normal: r ≈ <b>${Math.round(r / DEG)}°</b>.`;
    } else out = '<b>Total internal reflection</b>: no light gets out, it all reflects back into the glass.';
    endRays();
    drawBoard(wedges);
    ui.readout(`Angle in the glass: i = <b>${Math.round(st.angle)}°</b> · critical angle c ≈ <b>${Math.round(c / DEG)}°</b><br>${out}<br>The critical angle comes from sin c = 1 ÷ n = 1 ÷ 1.5.`);
  }

  // ---------- Station B: a pool, a coin and a stick ----------
  const SURF = 3.2, PW = 5.2;                 // water surface height; pool width (1 unit = 1 m here)
  const poolGroup = new THREE.Group(); poolGroup.position.x = B_X; scene.add(poolGroup);
  const tile = kit.mat(0xe9eef2, { roughness: 0.6 });
  const wallL = kit.mesh(new THREE.BoxGeometry(0.3, 1, 1.6), tile, [-PW / 2 - 0.15, 0, 0], poolGroup);
  const wallR = kit.mesh(new THREE.BoxGeometry(0.3, 1, 1.6), tile, [PW / 2 + 0.15, 0, 0], poolGroup);
  const floor = kit.mesh(new THREE.BoxGeometry(PW + 0.6, 0.3, 1.6), tile, [0, 0, 0], poolGroup);
  const back = kit.mesh(new THREE.BoxGeometry(PW, 1, 0.1), kit.mat(0x9fd3ea, { roughness: 0.5 }), [0, 0, -0.75], poolGroup);
  const soil = kit.mesh(new THREE.BoxGeometry(PW + 0.6, 1, 1.6), kit.mat(0xa98467, { roughness: 0.95 }), [0, 0, 0], poolGroup);
  for (const sx of [-1, 1]) kit.mesh(new THREE.BoxGeometry(1.0, SURF, 1.6), kit.mat(0xa98467, { roughness: 0.95 }), [sx * (PW / 2 + 0.8), SURF / 2, 0], poolGroup);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3b9be0, transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false });
  const water = new THREE.Mesh(new THREE.BoxGeometry(PW, 1, 1.5), waterMat);
  water.renderOrder = 2; poolGroup.add(water);
  const surfLine = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.02, 1.5), new THREE.MeshBasicMaterial({ color: 0x1d6fb8 }));
  surfLine.position.y = SURF; poolGroup.add(surfLine);
  const coin = kit.mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20), kit.mat(0xd9b44a, { metalness: 0.8, roughness: 0.3 }), [0, 0, 0.3], poolGroup);
  const ghostCoin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20), new THREE.MeshBasicMaterial({ color: 0xd9b44a, transparent: true, opacity: 0.55, depthWrite: false }));
  poolGroup.add(ghostCoin);
  const eye = new THREE.Group(); poolGroup.add(eye);
  kit.mesh(new THREE.SphereGeometry(0.2, 20, 14), kit.mat(0xffffff, { roughness: 0.3 }), [0, 0, 0], eye);
  kit.mesh(new THREE.SphereGeometry(0.09, 14, 10), kit.mat(0x2b2d42), [-0.14, -0.08, 0.05], eye);
  const EYE = { x: 2.1, y: SURF + 1.7 };
  eye.position.set(EYE.x, EYE.y, 0.3);
  const stickMat = kit.mat(0xb5651d, { roughness: 0.7 }), stickGhostMat = new THREE.MeshBasicMaterial({ color: 0xb5651d, transparent: true, opacity: 0.3, depthWrite: false });
  const stickParts = [];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(segGeo, i < 9 ? stickMat : stickMat); m.frustumCulled = false; poolGroup.add(m); stickParts.push(m); }
  const ghostParts = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(segGeo, stickGhostMat); m.frustumCulled = false; poolGroup.add(m); ghostParts.push(m); }
  const coinTag = label('Coin', new THREE.Object3D()); coin.add(coinTag.at); coinTag.at.position.y = 0.05;
  const imgTag = label('Where it seems to be', new THREE.Object3D(), { cls: 'warm' }); ghostCoin.add(imgTag.at); imgTag.at.position.y = 0.08;
  const eyeTag = label('Eye', new THREE.Object3D()); eye.add(eyeTag.at); eyeTag.at.position.y = 0.25;
  const poolWaterTag = label('Water', V(B_X - 2.0, SURF - 0.25), { cls: 'cool' });
  const setPart = (m, x1, y1, x2, y2, z, r) => {
    va.set(x1, y1, z); vb.set(x2, y2, z); vd.subVectors(vb, va);
    const len = Math.max(1e-4, vd.length());
    m.scale.set(r, len, r); m.position.addVectors(va, vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, vd.divideScalar(len));
  };
  // Where on the surface a ray from (px, py) under water must cross to reach (ex, ey) in the air.
  function surfaceX(px, py, ex, ey) {
    let lo = Math.min(px, ex), hi = Math.max(px, ex);
    for (let k = 0; k < 50; k++) {
      const m = (lo + hi) / 2;
      const sw = (m - px) / Math.hypot(m - px, SURF - py), sa = (ex - m) / Math.hypot(ex - m, ey - SURF);
      if (N_WATER * sw < sa) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }
  // Where a point under water seems to be from the eye: follow two rays (to the eye, a little apart) back
  // in straight lines and see where they cross. Writes [x, y] into out.
  function apparent(px, py, sep, out) {
    const e1 = EYE.x - sep, e2 = EYE.x + sep;
    const s1 = surfaceX(px, py, e1, EYE.y), s2 = surfaceX(px, py, e2, EYE.y);
    // Lines (e, EYE.y) → (s, SURF), extended down; intersect.
    const d1x = s1 - e1, d1y = SURF - EYE.y, d2x = s2 - e2, d2y = SURF - EYE.y;
    const den = d1x * d2y - d1y * d2x;
    const t = Math.abs(den) < 1e-9 ? 1 : ((e2 - e1) * d2y - 0 * d2x) / den;
    out[0] = e1 + d1x * t; out[1] = EYE.y + d1y * t; out[2] = s1; out[3] = s2;
    return out;
  }
  const tmp4 = [0, 0, 0, 0];
  st.depth = 2;
  function drawPool() {
    const d = st.depth, bottom = SURF - d;
    water.scale.y = d; water.position.y = SURF - d / 2;
    floor.position.y = bottom - 0.15;
    soil.scale.y = Math.max(0.01, bottom - 0.3); soil.position.y = (bottom - 0.3) / 2;
    for (const w of [wallL, wallR]) { w.scale.y = d + 0.5; w.position.y = SURF + 0.25 - (d + 0.5) / 2; }
    back.scale.y = d; back.position.y = SURF - d / 2;
    const cx = -1.0, cy = bottom + 0.02;
    coin.position.set(cx, cy, 0.3);
    beginRays();
    // Two rays from the coin to the two sides of the eye, and where they seem to come from.
    apparent(cx, cy, 0.14, tmp4);
    ghostCoin.position.set(tmp4[0], tmp4[1], 0.3);
    for (const [e, s] of [[EYE.x - 0.14, tmp4[2]], [EYE.x + 0.14, tmp4[3]]]) {
      seg(B_X + cx, cy, B_X + s, SURF, 0.3, YELLOW, 1, 0.022);
      seg(B_X + s, SURF, B_X + e, EYE.y, 0.3, YELLOW, 1, 0.022);
      dash(B_X + s, SURF, B_X + tmp4[0], tmp4[1], 0.3);
    }
    dash(B_X + 0.6, SURF + 1.1, B_X + 0.6, bottom + 0.05, 0.3, true);   // a normal to the surface
    endRays();
    // The stick: above water as it is; under water each point drawn where the eye sees it.
    const x0 = -2.4, y0 = SURF + 1.2, x1 = 0.2, y1 = bottom + 0.15;
    const sx = x0 + (x1 - x0) * (SURF - y0) / (y1 - y0);
    setPart(stickParts[0], x0, y0, sx, SURF, 0.1, 0.05);
    let px = sx, py = SURF;
    for (let k = 1; k <= 8; k++) {
      const f = k / 8, rx = sx + (x1 - sx) * f, ry = SURF + (y1 - SURF) * f;
      apparent(rx, ry, 0.03, tmp4);
      setPart(stickParts[k], px, py, tmp4[0], tmp4[1], 0.1, 0.05);
      setPart(ghostParts[k - 1], sx + (x1 - sx) * (k - 1) / 8, SURF + (y1 - SURF) * (k - 1) / 8, rx, ry, 0.1, 0.05);
      px = tmp4[0]; py = tmp4[1];
    }
    stickParts[9].visible = false;
    const seemsAbove = d / N_WATER;
    apparent(cx, cy, 0.14, tmp4);
    ui.readout(`Real depth: <b>${d.toFixed(1)} m</b> · From straight above it looks about <b>${seemsAbove.toFixed(1)} m</b> deep (real depth ÷ 1.33).<br>From this eye, at a slant, the coin seems only <b>${(SURF - tmp4[1]).toFixed(1)} m</b> down.`);
  }

  // ---------- Station C: an optical fibre ----------
  const CY = 2.4, FW = 0.5, CRIT = Math.asin(1 / N_GLASS);
  const fibreMat = glassMat(0x9be7ff, 0.32);
  let fibre = null;
  const fibreWalls = [[], []];
  kit.mesh(new THREE.BoxGeometry(9, 0.1, 1.4), kit.mat(0x4a4e69), [C_X, 0.05, 0], scene);
  for (const x of [-3.0, -1.8]) kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, CY - 0.25, 8), kit.mat(0x4a4e69), [C_X + x, (CY - 0.25) / 2, 0], scene);
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  scene.add(pulse);
  const fPts = [], fLen = [];
  const laser = rayBox();
  laser.scale.setScalar(0.8);
  const exitGlow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.9 }));
  scene.add(exitGlow);
  const leakAt = new THREE.Object3D(); scene.add(leakAt);
  const leakTag = label('Light escapes!', leakAt, { cls: 'warm' });
  const fibreTag = label('Glass fibre', V(C_X - 2.6, CY + 0.45), { cls: 'cool' });
  st.bend = 2.0;
  function buildFibre(rb) {
    // Centre line: straight, a quarter circle of radius rb, straight again. Walls are offset by ±FW/2.
    const pts = [], nrm = [];
    const x0 = C_X - 3.8, xa = C_X - 1.4;
    for (let k = 0; k <= 16; k++) { pts.push([x0 + (xa - x0) * k / 16, CY]); nrm.push([0, 1]); }
    for (let k = 1; k <= 40; k++) {
      const a = -Math.PI / 2 + (Math.PI / 2) * k / 40;
      pts.push([xa + rb * Math.cos(a), CY + rb + rb * Math.sin(a)]); nrm.push([-Math.cos(a), -Math.sin(a)]);
    }
    const xe = xa + rb, ya = CY + rb;
    for (let k = 1; k <= 12; k++) { pts.push([xe, ya + 1.6 * k / 12]); nrm.push([-1, 0]); }
    fibreWalls[0] = pts.map(([x, y], k) => [x + nrm[k][0] * FW / 2, y + nrm[k][1] * FW / 2]);
    fibreWalls[1] = pts.map(([x, y], k) => [x - nrm[k][0] * FW / 2, y - nrm[k][1] * FW / 2]);
    if (fibre) { scene.remove(fibre); fibre.geometry.dispose(); }
    st.fibreR = rb;
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => V(x, y, 0)));
    fibre = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, FW / 2, 16, false), fibreMat);
    fibre.renderOrder = 2;
    scene.add(fibre);
    st.fibreEnd = pts[pts.length - 1];
  }
  function traceFibre() {
    // Light enters the left end slightly off-centre, at 16° to the fibre.
    let x = C_X - 3.75, y = CY - 0.12, dx = Math.cos(16 * DEG), dy = Math.sin(16 * DEG), o = 1, minAng = 90, leaks = 0, leakX = 0, leakY = 0;
    aimBox(laser, C_X - 4.15, y - 0.4 * dy / dx, dx, dy);
    beginRays();
    seg(C_X - 4.15, y - 0.4 * dy / dx, x, y, 0, 0xff4d6d, 1, 0.026);
    fPts.length = 0; fLen.length = 0; fPts.push([x, y]); fLen.push(0);
    const addPt = (px, py) => { const [qx, qy] = fPts[fPts.length - 1]; fPts.push([px, py]); fLen.push(fLen[fLen.length - 1] + Math.hypot(px - qx, py - qy)); };
    for (let b = 0; b < 90; b++) {
      let best = Infinity, nx = 0, ny = 0;
      for (const wall of fibreWalls) for (let k = 0; k < wall.length - 1; k++) {
        const ax = wall[k][0], ay = wall[k][1], ex = wall[k + 1][0] - ax, ey = wall[k + 1][1] - ay;
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((ax - x) * ey - (ay - y) * ex) / den, s = ((ax - x) * dy - (ay - y) * dx) / den;
        if (t > 1e-5 && s >= 0 && s <= 1 && t < best) { best = t; const l = Math.hypot(ex, ey); nx = -ey / l; ny = ex / l; }
      }
      // Top end of the fibre: light leaves there.
      const [fx, fy] = st.fibreEnd;
      const tEnd = dy > 1e-6 ? (fy - y) / dy : Infinity;
      if (tEnd > 1e-5 && tEnd < best && Math.abs(x + dx * tEnd - fx) < FW / 2 + 0.01) {
        seg(x, y, x + dx * tEnd, fy, 0, 0xff4d6d, o, 0.026);
        addPt(x + dx * tEnd, fy);
        exitGlow.position.set(x + dx * tEnd, fy + 0.05, 0); exitGlow.material.opacity = 0.25 + 0.7 * o; exitGlow.visible = true;
        break;
      }
      if (best === Infinity) break;
      const hx = x + dx * best, hy = y + dy * best;
      seg(x, y, hx, hy, 0, 0xff4d6d, o, 0.026);
      if (o > 0.3) addPt(hx, hy);
      if (nx * dx + ny * dy > 0) { nx = -nx; ny = -ny; }
      const ang = Math.acos(Math.min(1, -(nx * dx + ny * dy))) / DEG;
      minAng = Math.min(minAng, ang);
      if (ang < CRIT / DEG) {
        const t = refract(dx, dy, nx, ny, N_GLASS, 1);
        if (t) seg(hx, hy, hx + t[0] * 1.1, hy + t[1] * 1.1, 0, 0xff4d6d, Math.max(0.3, o * 0.8), 0.022);
        if (!leaks) { leakX = hx + t[0] * 0.9; leakY = hy + t[1] * 0.9; }
        leaks++; o *= 0.35;
      }
      [dx, dy] = reflect(dx, dy, nx, ny);
      x = hx; y = hy;
      if (o < 0.08) { exitGlow.visible = false; break; }
    }
    endRays();
    leakAt.position.set(leakX, leakY, 0);
    leakTag.show(st.step === 3 && leaks > 0);
    ui.readout(`Bend radius: <b>${(st.bend * 2).toFixed(1)} cm</b> · smallest angle where the light hits the wall: <b>${Math.round(minAng)}°</b><br>${leaks ? `That is less than the critical angle (about 42°), so <b>light leaks out</b> of the fibre.` : 'Every hit is above the critical angle (about 42°), so the light is <b>totally internally reflected</b> all the way.'}`);
  }

  // ---------- Station D: a prism ----------
  const DY = 2.4, PS = 2.6;
  const tri = new THREE.Shape();
  const ph = PS * Math.sqrt(3) / 2;
  tri.moveTo(-PS / 2, 0); tri.lineTo(PS / 2, 0); tri.lineTo(0, ph); tri.closePath();
  const triGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.9, bevelEnabled: false });
  triGeo.translate(0, 0, -0.45);
  const prism = new THREE.Mesh(triGeo, glassMat(0xd6f1ff, 0.38));
  prism.position.set(D_X - 0.6, DY - ph / 2, 0); prism.renderOrder = 2;
  scene.add(prism);
  const prismEdges = new THREE.LineSegments(new THREE.EdgesGeometry(triGeo), new THREE.LineBasicMaterial({ color: 0x5e8fb0 }));
  prismEdges.position.copy(prism.position); scene.add(prismEdges);
  kit.mesh(new THREE.BoxGeometry(2.8, 0.1, 1.2), kit.mat(0x4a4e69), [D_X - 0.6, 0.05, 0], scene);
  kit.mesh(new THREE.CylinderGeometry(0.08, 0.08, DY - ph / 2 - 0.1, 10), kit.mat(0x4a4e69), [D_X - 0.6, (DY - ph / 2) / 2, 0], scene);
  const scrX = D_X + 3.6;
  kit.mesh(new THREE.BoxGeometry(0.08, 3.4, 1.6), kit.mat(0xffffff, { roughness: 0.9 }), [scrX + 0.05, DY, 0], scene);
  kit.mesh(new THREE.BoxGeometry(0.6, 0.1, 1.2), kit.mat(0x4a4e69), [scrX, 0.05, 0], scene);
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, DY - 1.7, 8), kit.mat(0x4a4e69), [scrX, (DY - 1.7) / 2, 0], scene);
  const spots = SPECTRUM.map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.9), new THREE.MeshBasicMaterial({ color: s.c })); scene.add(m); return m; });
  const prismBox = rayBox();
  const redAt = new THREE.Object3D(), violetAt = new THREE.Object3D(); scene.add(redAt, violetAt);
  const redTag = label('Red', redAt, { cls: 'warm' }), violetTag = label('Violet', violetAt, { cls: 'cool' });
  const whiteTag = label('White light', new THREE.Object3D());
  prismBox.add(whiteTag.at); whiteTag.at.position.set(-0.3, 0.35, 0);
  const P = { ax: D_X - 0.6, ay: DY - ph / 2 };     // prism base centre
  const PA = [P.ax, P.ay + ph], PB = [P.ax - PS / 2, P.ay], PC = [P.ax + PS / 2, P.ay];
  st.inc = 50;
  function drawPrism() {
    // Left face AB: outward normal. The white ray hits its middle at angle st.inc to the normal.
    const fx = PB[0] - PA[0], fy = PB[1] - PA[1], fl = Math.hypot(fx, fy);
    let nLx = fy / fl, nLy = -fx / fl;                        // pick the outward one (pointing left)
    if (nLx > 0) { nLx = -nLx; nLy = -nLy; }
    const hx = (PA[0] + PB[0]) / 2 - 0.08 * fx / fl, hy = (PA[1] + PB[1]) / 2 - 0.08 * fy / fl;
    const a = st.inc * DEG, base = Math.atan2(-nLy, -nLx);     // direction straight into the face
    const dx = Math.cos(base + a), dy = Math.sin(base + a);   // tilted so the ray comes up from lower left
    const sx = hx - dx * 3.2, sy = hy - dy * 3.2;
    aimBox(prismBox, sx, sy, dx, dy);
    beginRays();
    seg(sx, sy, hx, hy, 0, 0xffffff, 1, 0.05);
    // Right face AC.
    const gx = PC[0] - PA[0], gy = PC[1] - PA[1], gl = Math.hypot(gx, gy);
    let nRx = gy / gl, nRy = -gx / gl;
    if (nRx < 0) { nRx = -nRx; nRy = -nRy; }
    let redY = 0, violetY = 0;
    const dev = [];
    SPECTRUM.forEach((s, k) => {
      // Drawn with the colours spread about five times more than real glass, so they are easy to see.
      const nVis = 1.517 + (s.n - 1.517) * 5;
      const t1 = refract(dx, dy, nLx, nLy, 1, nVis);
      // Hit the right face: solve for the crossing with line A–C.
      const den = t1[0] * gy - t1[1] * gx, tt = ((PA[0] - hx) * gy - (PA[1] - hy) * gx) / den;
      const qx = hx + t1[0] * tt, qy = hy + t1[1] * tt;
      seg(hx, hy, qx, qy, 0.02 * (k - 3), s.c, 1, 0.022);
      const t2 = refract(t1[0], t1[1], -nRx, -nRy, nVis, 1);
      if (!t2) { spots[k].visible = false; return; }
      const ts = (scrX - qx) / t2[0], yy = qy + t2[1] * ts;
      seg(qx, qy, scrX, yy, 0.02 * (k - 3), s.c, 1, 0.022);
      spots[k].position.set(scrX, yy, 0); spots[k].visible = true;
      if (k === 0) redY = yy; if (k === 6) violetY = yy;
      // Real glass: deviation = angle in + angle out − 60°.
      const r1 = Math.asin(Math.sin(a) / s.n), r2 = 60 * DEG - r1;
      dev[k] = Math.sin(r2) * s.n < 1 ? (a + Math.asin(s.n * Math.sin(r2))) / DEG - 60 : NaN;
    });
    endRays();
    redAt.position.set(scrX + 0.15, redY + 0.1, 0.5); violetAt.position.set(scrX + 0.15, violetY - 0.45, 0.5);
    if (!st.quiz) ui.readout(`Angle of incidence: <b>${Math.round(st.inc)}°</b><br>In ordinary glass, red (n ≈ 1.514) is turned through about <b>${fmt(dev[0], 1)}°</b> and violet (n ≈ 1.530) through about <b>${fmt(dev[6], 1)}°</b>. Violet bends most.`);
  }

  // ---------- Station E: optical bench with lenses ----------
  const EY = 2.4, LR = 1.8, U = 0.2;           // optical axis height, lens radius, world units per cm
  kit.mesh(new THREE.BoxGeometry(16, 0.14, 0.5), kit.mat(0x6c757d, { metalness: 0.4, roughness: 0.4 }), [E_X - 1, 0.9, 0], scene);
  for (const x of [-8.5, 6.5]) kit.mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), kit.mat(0x4a4e69), [E_X + x, 0.45, 0], scene);
  const axisLine = kit.mesh(new THREE.CylinderGeometry(0.01, 0.01, 17, 6), new THREE.MeshBasicMaterial({ color: 0x5c677d }), [E_X - 1, EY, 0], scene);
  axisLine.rotation.z = Math.PI / 2; axisLine.castShadow = false;
  const lensProfile = (convex) => {
    const pts = [], t = 0.42, n = 16;
    for (let k = 0; k <= n; k++) { const r = LR * k / n, h = convex ? 0.03 + t / 2 * (1 - (r / LR) ** 2) : 0.04 + t / 2 * (r / LR) ** 2; pts.push(new THREE.Vector2(r, -h)); }
    for (let k = n; k >= 0; k--) { const r = LR * k / n, h = convex ? 0.03 + t / 2 * (1 - (r / LR) ** 2) : 0.04 + t / 2 * (r / LR) ** 2; pts.push(new THREE.Vector2(r, h)); }
    const g = new THREE.LatheGeometry(pts, 32);
    g.rotateZ(-Math.PI / 2);
    return g;
  };
  const lensMat = glassMat(0xbfe6ff, 0.42);
  const convexLens = new THREE.Mesh(lensProfile(true), lensMat), concaveLens = new THREE.Mesh(lensProfile(false), lensMat);
  for (const l of [convexLens, concaveLens]) { l.position.set(E_X, EY, 0); l.renderOrder = 2; scene.add(l); }
  kit.mesh(new THREE.BoxGeometry(0.12, EY - LR - 0.95, 0.12), kit.mat(0x4a4e69), [E_X, (EY - LR + 0.95) / 2, 0], scene);
  const fDots = [0, 1].map(() => kit.mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0x1d2b36 }), [0, EY, 0.05], scene));
  const fTags = fDots.map(d => { const a = new THREE.Object3D(); d.add(a); a.position.set(0, -0.12, 0); return label('F', a); });
  // Object and image arrows: a shaft and a head, 1 unit tall before scaling.
  const arrowGroup = (color, transparent) => {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, roughness: 0.5, transparent, opacity: transparent ? 0.5 : 1, depthWrite: !transparent });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.78, 10), m); shaft.position.y = 0.39; g.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 14), m); head.position.y = 0.89; g.add(head);
    g.tip = new THREE.Object3D(); g.tip.position.y = 1.0; g.add(g.tip);
    g.mat = m;
    scene.add(g);
    return g;
  };
  const objArrow = arrowGroup(0xf77f00, false), imgArrow = arrowGroup(0xd62828, false);
  const objBase = new THREE.Object3D(); objArrow.add(objBase); objBase.position.y = -0.55;   // object's tag sits under its foot
  const objTag = label('Object', objBase, { cls: 'warm' }), imgTag2 = label('Image', imgArrow.tip, { cls: 'warm' });
  const lensTag = label('Lens', V(E_X, EY + LR + 0.15));
  const screenE = kit.mesh(new THREE.BoxGeometry(0.06, 3.2, 1.6), kit.mat(0xffffff, { roughness: 0.9 }), [0, EY, -0.2], scene);
  const eyeE = new THREE.Group(); scene.add(eyeE);
  kit.mesh(new THREE.SphereGeometry(0.2, 20, 14), kit.mat(0xffffff, { roughness: 0.3 }), [0, 0, 0], eyeE);
  kit.mesh(new THREE.SphereGeometry(0.09, 14, 10), kit.mat(0x2b2d42), [-0.15, 0, 0.05], eyeE);
  const OH = 0.6;                              // object height (3 cm)
  st.lens = 'convex'; st.f = 10; st.d = 25;
  const R1 = 0xe63946, R2 = 0x2a9d8f, R3 = 0x3a6ea5;
  function setFocus(fcm) {
    const f = fcm * U;
    fDots[0].position.set(E_X - f, EY, 0.05); fDots[1].position.set(E_X + f, EY, 0.05);
  }
  function drawParallel() {
    const f = st.f * U, convex = st.lens === 'convex';
    convexLens.visible = convex; concaveLens.visible = !convex;
    setFocus(st.f);
    beginRays();
    for (const h of [-1.2, -0.6, 0, 0.6, 1.2]) {
      seg(E_X - 6, EY + h, E_X, EY + h, 0, YELLOW, 1, 0.024);
      if (convex) {
        // Through F′ and on beyond it.
        const dx = f, dy = -h, l = Math.hypot(dx, dy), L = 7;
        seg(E_X, EY + h, E_X + dx / l * L, EY + h + dy / l * L, 0, YELLOW, 1, 0.024);
      } else {
        // Spreads out as if it came from F on the left; dashed back to F.
        const dx = f, dy = h, l = Math.hypot(dx, dy), L = 5;
        seg(E_X, EY + h, E_X + dx / l * L, EY + h + dy / l * L, 0, YELLOW, 1, 0.024);
        if (h !== 0) dash(E_X, EY + h, E_X - f, EY, 0.02);
      }
    }
    endRays();
    const P = 100 / st.f;
    ui.readout(`${convex ? 'Converging' : 'Diverging'} lens · focal length f = <b>${Math.round(st.f)} cm</b><br>${convex ? 'Parallel rays meet at the principal focus F.' : 'Parallel rays spread out as if they came from F (dashed lines).'} Power = 1 ÷ f (in metres) = <b>${convex ? '+' : '−'}${fmt(P, 1)} D</b> (dioptres)`);
  }
  function drawImage(magnifier) {
    const f = st.f * U, d = st.d * U, dp = 1 / (1 / f - 1 / d), m = -dp / d;   // m < 0: inverted
    convexLens.visible = true; concaveLens.visible = false;
    setFocus(st.f);
    const ox = E_X - d, tipY = EY + OH;
    objArrow.position.set(ox, EY, 0); objArrow.scale.set(1, OH, 1); objArrow.visible = true;
    const ix = E_X + dp, ih = m * OH;
    imgArrow.position.set(ix, EY, 0.02); imgArrow.scale.set(1, ih, 1); imgArrow.visible = true;
    imgArrow.mat.transparent = magnifier; imgArrow.mat.opacity = magnifier ? 0.5 : 1; imgArrow.mat.depthWrite = !magnifier;
    beginRays();
    // Ray 1: parallel to the axis, then through F′.
    seg(ox, tipY, E_X, tipY, 0, R1, 1, 0.024);
    const k1 = magnifier ? 4.2 : Math.max(dp + 1.2, f + 1);
    seg(E_X, tipY, E_X + k1, tipY - OH * k1 / f, 0, R1, 1, 0.024);
    // Ray 2: straight through the centre of the lens.
    const k2 = magnifier ? 4.2 : dp + 1.2;
    seg(ox, tipY, E_X + k2, EY - OH * k2 / d, 0, R2, 1, 0.024);
    if (!magnifier) {
      // Ray 3: through F, then parallel to the axis.
      const y3 = EY - OH * f / (d - f);
      seg(ox, tipY, E_X, y3, 0, R3, 1, 0.024);
      seg(E_X, y3, E_X + dp + 1.2, y3, 0, R3, 1, 0.024);
      screenE.position.set(ix + 0.08, EY, -0.2); screenE.visible = true; eyeE.visible = false;
    } else {
      // The rays spread out after the lens; traced back (dashed) they meet at the image.
      dash(E_X, tipY, ix, EY + ih, 0.02);
      dash(E_X, EY, ix, EY + ih, 0.02);
      screenE.visible = false; eyeE.visible = true; eyeE.position.set(E_X + 4.4, EY + 0.1, 0);
    }
    endRays();
    const dcm = st.d, dpcm = 1 / (1 / st.f - 1 / dcm), mag = Math.abs(dpcm / dcm);
    const kind = magnifier ? 'virtual, upright and magnified' : `real, inverted and ${mag > 1.05 ? 'magnified' : mag < 0.95 ? 'diminished (smaller)' : 'the same size'}`;
    ui.readout(`d = <b>${Math.round(dcm)} cm</b> · f = ${st.f} cm · 1/d′ = 1/f − 1/d → d′ = <b>${fmt(dpcm, 1)} cm</b>${magnifier ? ' (minus: on the same side as the object)' : ''}<br>Image is <b>${kind}</b>, ${fmt(mag, 1)} times the object's height.`);
  }

  const allTags = [airTag, glassTag, normalTag, coinTag, imgTag, eyeTag, poolWaterTag, leakTag, fibreTag, redTag, violetTag, whiteTag, ...fTags, objTag, imgTag2, lensTag];
  function hideAll() {
    allTags.forEach(t => t.show(false));
    beginRays(); endRays();
    exitGlow.visible = false; pulse.visible = false; spots.forEach(s => { s.visible = false; });
    objArrow.visible = imgArrow.visible = false; screenE.visible = false; eyeE.visible = false;
  }
  function setMedium(m) {
    st.medium = m;
    blockMat.color.setHex(m === 'glass' ? 0xbfe6ff : 0x4ea8de);
    blockMat.opacity = m === 'glass' ? 0.35 : 0.3;
    glassTag.text = m === 'glass' ? 'Glass' : 'Water';
    drawRefraction();
  }
  buildFibre(st.bend);

  return {
    step(i, { isQuiz }) {
      st.step = i; st.time = 0; st.auto = true; st.quiz = isQuiz; st.slider = null;
      hideAll();
      if (i === 0) {
        moveSun(A_X);
        view({ radius: 3.4, yaw: 0, pitch: 0.12, target: [A_X, AY, 0] });
        airTag.show(true); glassTag.show(true); normalTag.show(true);
        st.angle = 30;
        ui.buttons([{ label: 'Glass', on: true, onClick: () => setMedium('glass') }, { label: 'Water', onClick: () => setMedium('water') }]);
        st.slider = ui.slider({ label: 'Angle of incidence (i)', min: 0, max: 80, step: 1, value: 30, unit: '°', format: v => Math.round(v), onInput: v => { st.auto = false; st.angle = v; drawRefraction(); } });
        setMedium('glass');
      }
      if (i === 1) {
        moveSun(B_X);
        view({ radius: 2.8, width: 3.2, yaw: 0, pitch: 0.1, target: [B_X, SURF - 0.4, 0] });
        coinTag.show(true); imgTag.show(true); eyeTag.show(true); poolWaterTag.show(true);
        st.depth = 2;
        st.slider = ui.slider({ label: 'Pool depth', min: 1, max: 3, step: 0.1, value: 2, unit: ' m', format: v => v.toFixed(1), onInput: v => { st.auto = false; st.depth = v; drawPool(); } });
        ui.toggle({ label: 'Show the real stick', value: false, onChange: v => ghostParts.forEach(p => { p.visible = v; }) });
        ghostParts.forEach(p => { p.visible = false; });
        drawPool();
      }
      if (i === 2) {
        moveSun(A_X);
        view({ radius: 3.4, yaw: 0, pitch: 0.12, target: [A_X, AY, 0] });
        airTag.show(true); glassTag.show(true); normalTag.show(true);
        st.medium = 'glass'; blockMat.color.setHex(0xbfe6ff); blockMat.opacity = 0.35; glassTag.text = 'Glass';
        st.angle = 20;
        st.slider = ui.slider({ label: 'Angle in the glass (i)', min: 0, max: 80, step: 1, value: 20, unit: '°', format: v => Math.round(v), onInput: v => { st.auto = false; st.angle = v; drawTIR(); } });
        drawTIR();
      }
      if (i === 3) {
        moveSun(C_X);
        view({ radius: 2.6, width: 3.4, yaw: 0, pitch: 0.12, target: [C_X - 0.4, CY + 1.0, 0] });
        fibreTag.show(true);
        st.slider = ui.slider({ label: 'Bend radius', min: 1.8, max: 6, step: 0.2, value: st.bend * 2, unit: ' cm', format: v => v.toFixed(1), onInput: v => { st.auto = false; st.bend = v / 2; buildFibre(st.bend); traceFibre(); } });
        buildFibre(st.bend);
        traceFibre();
      }
      if (i === 4) {
        moveSun(D_X);
        view({ radius: 2.4, width: 4.4, yaw: 0, pitch: 0.12, target: [D_X - 0.4, DY, 0] });
        redTag.show(true); violetTag.show(true); whiteTag.show(true);
        st.inc = 50;
        st.slider = ui.slider({ label: 'Angle of incidence', min: 40, max: 70, step: 1, value: 50, unit: '°', format: v => Math.round(v), onInput: v => { st.auto = false; st.inc = v; drawPrism(); } });
        drawPrism();
      }
      if (i === 5) {
        moveSun(E_X);
        view({ radius: 2.6, width: 4.6, yaw: 0, pitch: 0.12, target: [E_X, EY, 0] });
        fTags.forEach(t => t.show(true)); lensTag.show(true);
        st.lens = 'convex'; st.f = 10;
        st.row = ui.buttons([{ label: 'Converging (convex)', on: true, onClick: () => { st.auto = false; st.lens = 'convex'; drawParallel(); } }, { label: 'Diverging (concave)', onClick: () => { st.auto = false; st.lens = 'concave'; drawParallel(); } }]);
        st.slider = ui.slider({ label: 'Focal length f', min: 5, max: 15, step: 1, value: 10, unit: ' cm', format: v => Math.round(v), onInput: v => { st.auto = false; st.f = v; drawParallel(); } });
        drawParallel();
      }
      if (i === 6) {
        moveSun(E_X);
        view({ radius: 2.4, width: 6.6, yaw: 0, pitch: 0.1, target: [E_X - 1.6, EY, 0] });
        fTags.forEach(t => t.show(true)); objTag.show(true); imgTag2.show(true);
        st.f = 10; st.d = 30;
        st.slider = ui.slider({ label: 'Object distance d', min: 15, max: 40, step: 1, value: 30, unit: ' cm', format: v => Math.round(v), onInput: v => { st.auto = false; st.d = v; drawImage(false); } });
        drawImage(false);
      }
      if (i === 7) {
        moveSun(E_X);
        view({ radius: 2.6, width: 5.0, yaw: 0, pitch: 0.1, target: [E_X - 0.6, EY + 0.4, 0] });
        fTags.forEach(t => t.show(true)); objTag.show(true); imgTag2.show(true);
        st.f = 10; st.d = 6;
        st.slider = ui.slider({ label: 'Object distance d', min: 3, max: 7, step: 0.5, value: 6, unit: ' cm', format: v => v.toFixed(1), onInput: v => { st.auto = false; st.d = v; drawImage(true); } });
        drawImage(true);
      }
      if (isQuiz) {
        moveSun(D_X);
        view({ radius: 2.6, width: 3.8, yaw: 0.25, pitch: 0.2, target: [D_X + 0.2, DY, 0] });
        st.inc = 50; drawPrism();
      }
      if (i !== 5 && i !== 6 && i !== 7) { convexLens.visible = true; concaveLens.visible = false; setFocus(10); }
    },

    update(dt) {
      st.time += dt;
      const t = st.time;
      if (st.step === 3 && !st.quiz && fPts.length > 1) {
        // A pulse of light runs along the path the light takes inside the fibre.
        const L = fLen[fLen.length - 1], s = (t * 3) % (L + 1);
        let k = 0;
        while (k < fLen.length - 2 && fLen[k + 1] < s) k++;
        const f = Math.min(1, Math.max(0, (s - fLen[k]) / Math.max(1e-6, fLen[k + 1] - fLen[k])));
        pulse.position.set(fPts[k][0] + (fPts[k + 1][0] - fPts[k][0]) * f, fPts[k][1] + (fPts[k + 1][1] - fPts[k][1]) * f, 0.03);
        pulse.visible = s <= L;
      }
      if (st.quiz || !st.auto) return st.step === 3 && !st.quiz;
      // Gentle demos that run until the learner takes over a control.
      if (st.step === 0 || st.step === 2) {
        const a = st.step === 0 ? Math.round(30 + 25 * Math.sin(t * 0.7)) : Math.round(36 + 24 * Math.sin(t * 0.5 - 0.3));
        if (a !== st.angle) { st.angle = a; st.slider.set(a); st.step === 0 ? drawRefraction() : drawTIR(); }
        return true;
      }
      if (st.step === 1) {
        const d = Math.round((2 + 0.8 * Math.sin(t * 0.6)) * 10) / 10;
        if (d !== st.depth) { st.depth = d; st.slider.set(d); drawPool(); }
        return true;
      }
      if (st.step === 3) return true;
      if (st.step === 4) {
        const a = Math.round(52 + 12 * Math.sin(t * 0.6));
        if (a !== st.inc) { st.inc = a; st.slider.set(a); drawPrism(); }
        return true;
      }
      if (st.step === 5) {
        const conv = Math.floor(t / 4) % 2 === 0, lens = conv ? 'convex' : 'concave';
        if (lens !== st.lens) { st.lens = lens; st.row.select(conv ? 0 : 1); drawParallel(); }
        return true;
      }
      if (st.step === 6) {
        const d = Math.round(30 - 12 * Math.sin(t * 0.5));
        if (d !== st.d) { st.d = d; st.slider.set(d); drawImage(false); }
        return true;
      }
      if (st.step === 7) {
        const d = Math.round((5.5 - 1.5 * Math.sin(t * 0.6)) * 2) / 2;
        if (d !== st.d) { st.d = d; st.slider.set(d); drawImage(true); }
        return true;
      }
      return false;
    },
  };
}
