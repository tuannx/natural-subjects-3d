// Shaking Earth: a cut-away block of rock with a fault and a little town on top (rocks stick, then slip;
// seismic rings spread out; weak and strong buildings in a shaking test), a cut-away volcano that erupts,
// a globe with the belts of earthquakes and volcanoes, and a room where a child drops, covers and holds on.

const BW = 4, BD = 2, BH = 2.4;        // quake block half-width, half-depth, height
const XB = 0.75, XT = 0.15;            // fault: x at the bottom and at the top of the block
const FY = 0.8;                         // depth of the slip point (height inside the block)
const FX = XB + (XT - XB) * (FY / BH);  // slip point x on the fault
const SLIP = 0.11;                      // how far the right block moves in one earthquake
const VX = 15;                          // volcano position
const VH = 1.6;                         // volcano plinth height (ground surface)
const GX = -12, GY = 2.45;              // globe
const RZ = 22;                         // room position (z)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Cone profile (radius, height above the plinth) and its radius at a height.
const CONE = [[2.5, 0], [1.75, 0.6], [1.05, 1.35], [0.52, 2.0], [0.38, 2.12], [0.22, 1.95], [0.0, 1.9]];
const coneR = y => { for (let i = 0; i < 4; i++) { const [r0, y0] = CONE[i], [r1, y1] = CONE[i + 1]; if (y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0)); } return 0.38; };

const WORLD = [
  [[-165, 68], [-140, 70], [-110, 72], [-85, 70], [-80, 63], [-94, 59], [-82, 52], [-65, 60], [-55, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 25], [-84, 30], [-90, 29], [-97, 26], [-97, 21], [-90, 21], [-87, 15], [-83, 9], [-78, 8], [-85, 11], [-92, 15], [-105, 20], [-110, 24], [-112, 31], [-117, 32], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60], [-160, 55]],
  [[-55, 60], [-43, 60], [-20, 70], [-20, 82], [-60, 82], [-70, 77], [-55, 70]],
  [[-78, 8], [-72, 12], [-62, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-65, -42], [-68, -55], [-74, -50], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [0, 50], [5, 53], [8, 57], [5, 62], [15, 69], [28, 71], [40, 67], [60, 69], [80, 73], [105, 78], [140, 72], [170, 70], [180, 66], [175, 62], [160, 60], [155, 52], [140, 55], [135, 44], [128, 35], [122, 40], [120, 30], [110, 20], [106, 10], [100, 13], [100, 3], [98, 8], [95, 16], [90, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [56, 27], [50, 30], [48, 29], [56, 24], [59, 22], [52, 16], [43, 13], [39, 21], [34, 28], [35, 32], [36, 36], [28, 37], [26, 40], [23, 36], [20, 40], [16, 38], [18, 40], [12, 44], [13, 45], [8, 44], [3, 43], [-1, 37], [-5, 36]],
  [[-17, 15], [-17, 21], [-10, 30], [-6, 36], [10, 37], [11, 33], [20, 31], [32, 31], [34, 28], [43, 12], [51, 12], [40, -2], [39, -10], [35, -22], [33, -28], [27, -34], [20, -35], [17, -29], [12, -17], [13, -6], [9, -1], [9, 4], [3, 6], [-8, 4], [-13, 8]],
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -25], [150, -37], [140, -38], [132, -32], [115, -34]],
  [[-5, 50], [1, 51], [-2, 56], [-5, 58], [-6, 55]], [[130, 31], [135, 34], [140, 36], [142, 40], [141, 45], [139, 40], [133, 35]],
  [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]], [[95, 5], [106, -6], [103, -5], [95, 3]],
  [[109, 1], [117, 7], [119, 1], [116, -4], [110, -3]], [[131, -1], [141, -3], [150, -10], [141, -9], [132, -4]],
  [[172, -34], [178, -38], [174, -41], [167, -46], [172, -41]], [[120, 18], [122, 18], [126, 7], [122, 7]], [[-24, 65], [-14, 66], [-14, 64], [-22, 63]],
];
// Rough places of many earthquakes and of active volcanoes (longitude, latitude).
const QUAKES = [[-71, -33], [-72, -38], [-70, -24], [-71, -18], [-77, -12], [-79, -3], [-77, 3], [-84, 9], [-88, 13], [-94, 16], [-99, 17], [-105, 19], [-116, 32], [-121, 36], [-125, 41], [-128, 49], [-150, 60], [-160, 55], [-170, 52], [178, 51], [163, 55], [152, 46], [143, 41], [141, 36], [134, 33], [128, 28], [122, 23], [124, 13], [126, 7], [123, -1], [118, -9], [107, -8], [99, -2], [94, 4], [96, 12], [130, -6], [145, -5], [152, -6], [161, -10], [168, -17], [-176, -20], [-177, -28], [178, -36], [175, -40], [167, -45],
  [14, 41], [21, 38], [27, 39], [37, 38], [44, 39], [51, 35], [57, 29], [69, 35], [77, 33], [85, 28], [92, 27], [100, 26], [-29, 38], [-18, 65], [-30, 10], [-14, -5], [-13, -30]];
const VOLCANOES = [[-70, -23], [-72, -40], [-73, -46], [-76, -10], [-78, -1], [-89, 14], [-98, 19], [-122, 46], [-122, 41], [-153, 60], [-165, 54], [175, 52], [160, 54], [146, 44], [138, 35], [131, 32], [121, 15], [124, 10], [110, -7], [101, -1], [123, -8], [148, -5], [168, -16], [-175, -19], [175, -39],
  [15, 38], [14, 41], [25, 36], [-19, 64], [37, -3], [40, 13], [-155, 19], [-17, 28]];
function paintWorld(THREE, { dots, tris }) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const px = (lon, lat) => [(lon + 180) / 360 * 512, (90 - lat) / 180 * 256];
  g.fillStyle = '#3b86cf'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#7fbf64';
  for (const poly of WORLD) {
    g.beginPath();
    poly.forEach(([lo, la], i) => { const [x, y] = px(lo, la); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.closePath(); g.fill();
  }
  g.fillStyle = '#f2f6fa'; g.fillRect(0, 256 * (155 / 180), 512, 256);
  if (dots) {
    g.fillStyle = '#e0242c'; g.strokeStyle = '#ffffff'; g.lineWidth = 1;
    for (const [lo, la] of QUAKES) { const [x, y] = px(lo, la); g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill(); g.stroke(); }
  }
  if (tris) {
    g.fillStyle = '#ff9a1a'; g.strokeStyle = '#5a2a00'; g.lineWidth = 1;
    for (const [lo, la] of VOLCANOES) { const [x, y] = px(lo, la); g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 4.5, y + 3); g.lineTo(x - 4.5, y + 3); g.closePath(); g.fill(); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Rock layers seen on a cut face, from the top (grass and soil) down.
function paintLayers(THREE) {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 256;
  const g = c.getContext('2d');
  const bands = [['#5b3d22', 10], ['#c9a46a', 34], ['#8c7f73', 30], ['#b5683f', 26], ['#d8c49a', 30], ['#6f6a66', 36], ['#a2553a', 28], ['#8a8178', 62]];
  let y = 0;
  for (const [col, h] of bands) { g.fillStyle = col; g.fillRect(0, y, 32, h); y += h; }
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < 40; i++) g.fillRect(rand(i) * 32, rand(i + 50) * 256, 2 + rand(i + 9) * 4, 1.5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function setup({ THREE, scene, kit, ui, label, view, renderer }) {
  kit.stage(scene, { ground: 0xcfe3b5, sky: 0xdcefff, radius: 40 });
  kit.lights(scene, { sun: [5, 12, 8] });
  renderer.localClippingEnabled = true;

  // ---------- The quake block: two blocks of rock meeting at a fault ----------
  const layersTex = paintLayers(THREE);
  const faceMat = () => { const t = layersTex.clone(); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); };
  const blockFace = faceMat();
  const rockSide = kit.mat(0x8a7f74, { roughness: 0.95 });
  const grass = kit.mat(0x7dbb55);
  function prism(pts) {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: BD * 2, bevelEnabled: false });
    g.translate(0, 0, -BD);
    // Caps: map v to height so the layer stripes line up across the fault.
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 8, p.getY(i) / BH);
    return g;
  }
  const left = new THREE.Group(), right = new THREE.Group();
  scene.add(left, right);
  kit.mesh(prism([[-BW, 0], [XB, 0], [XT, BH], [-BW, BH]]), [blockFace, rockSide], [0, 0, 0], left);
  kit.mesh(prism([[XB, 0], [BW, 0], [BW, BH], [XT, BH]]), [blockFace, rockSide], [0, 0, 0], right);
  kit.mesh(new THREE.BoxGeometry(BW + XT, 0.08, BD * 2), grass, [(-BW + XT) / 2, BH + 0.04, 0], left);
  kit.mesh(new THREE.BoxGeometry(BW - XT, 0.08, BD * 2), grass, [(BW + XT) / 2, BH + 0.04, 0], right);
  // Fault highlight: a glowing strip on the front face.
  const faultGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(XB, 0, BD + 0.02), new THREE.Vector3(XT, BH + 0.09, BD + 0.02)]);
  const faultLine = new THREE.Line(faultGeo, new THREE.LineBasicMaterial({ color: 0xff3b30 }));
  const faultPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  { const len = Math.hypot(XB - XT, BH); faultPlane.scale.set(BD * 2, len, 1); faultPlane.position.set((XB + XT) / 2, BH / 2, 0); faultPlane.rotation.set(0, Math.PI / 2, 0); faultPlane.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), Math.atan2(XB - XT, BH)); }
  scene.add(faultLine, faultPlane);
  // Push arrows: the left block is pushed up, the right block down.
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffb703, emissive: 0x553300 });
  function arrow(parent, x, dir) {
    const a = new THREE.Group();
    kit.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 10), arrowMat, [0, 0, 0], a);
    const head = kit.mesh(new THREE.ConeGeometry(0.17, 0.3, 12), arrowMat, [0, 0.45, 0], a);
    head.castShadow = false;
    a.position.set(x, BH / 2, BD + 0.3); a.rotation.z = dir > 0 ? 0 : Math.PI;
    parent.add(a); return a;
  }
  const arrows = [arrow(left, -1.2, 1), arrow(right, 1.8, -1)];

  // Houses on top of the block.
  const roofMat = kit.mat(0xd64545), wallMat = kit.mat(0xfff4e0), wall2 = kit.mat(0xcfe6ff);
  const houses = [];
  for (const [x, z, s] of [[-3.3, 0.6, 1], [-2.3, -0.7, 0.9], [-1.25, 0.8, 1.1], [-0.5, -0.6, 0.85], [1.1, 0.7, 1], [2.1, -0.6, 1.05], [3.25, 0.5, 0.9]]) {
    const h = new THREE.Group();
    kit.mesh(new THREE.BoxGeometry(0.42 * s, 0.32 * s, 0.38 * s), houses.length % 2 ? wall2 : wallMat, [0, 0.16 * s, 0], h);
    const r = kit.mesh(new THREE.ConeGeometry(0.34 * s, 0.24 * s, 4), roofMat, [0, 0.44 * s, 0], h);
    r.rotation.y = Math.PI / 4;
    h.position.set(x, BH + 0.08, z);
    (x < XT ? left : right).add(h);
    houses.push({ g: h, x, z, d: Math.hypot(x - FX, BH - FY, z) });
  }

  // The test buildings (step 4): a weak brick building and a strong braced one, both on the left block.
  const brickTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#b8583a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#e6d3bd';
    for (let r = 0; r < 8; r++) { g.fillRect(0, r * 8, 64, 1.5); for (let k = 0; k < 4; k++) g.fillRect(((k * 16 + (r % 2) * 8) % 64), r * 8, 1.5, 8); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const brick = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.9 });
  const weak = new THREE.Group(); weak.position.set(-2.4, BH + 0.08, 0.1); left.add(weak);
  const floors = [];
  for (let i = 0; i < 3; i++) floors.push(kit.mesh(new THREE.BoxGeometry(0.9, 0.42, 0.8), brick, [0, 0.21 + i * 0.42, 0], weak));
  floors.push(kit.mesh(new THREE.BoxGeometry(1.0, 0.08, 0.9), kit.mat(0x6d4c41), [0, 1.3, 0], weak));
  const PILE = [[0.05, 0.21, 0.12], [0.45, 0.32, 0.5], [-0.35, 0.28, -0.6], [0.25, 0.5, 0.3]]; // x, y, tilt after falling
  const strong = new THREE.Group(); strong.position.set(-0.9, BH + 0.08, 0.1); left.add(strong);
  const steel = kit.mat(0x5c6b7a, { metalness: 0.4, roughness: 0.5 }), slab = kit.mat(0xd9d9d9);
  const SH = 0.38, NF = 4;
  for (const [cx, cz] of [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.35], [0.4, 0.35]]) kit.mesh(new THREE.BoxGeometry(0.07, SH * NF, 0.07), steel, [cx, SH * NF / 2, cz], strong);
  for (let i = 1; i <= NF; i++) kit.mesh(new THREE.BoxGeometry(0.9, 0.06, 0.8), slab, [0, i * SH, 0], strong);
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd3f5, roughness: 0.2, transparent: true, opacity: 0.55 });
  kit.mesh(new THREE.BoxGeometry(0.74, SH * NF - 0.05, 0.64), glass, [0, SH * NF / 2, 0], strong).castShadow = false;
  const braceLen = Math.hypot(0.8, SH);
  for (let i = 0; i < NF; i++) for (const s of [-1, 1]) for (const z of [-0.36, 0.36]) {
    const b = kit.mesh(new THREE.BoxGeometry(braceLen, 0.04, 0.04), steel, [0, SH * i + SH / 2, z], strong);
    b.rotation.z = s * Math.atan2(SH, 0.8);
  }

  // Seismic rings: on the cut face (centred on the slip point) and on the ground above it.
  const clip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), BW), new THREE.Plane(new THREE.Vector3(-1, 0, 0), BW), new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Plane(new THREE.Vector3(0, -1, 0), BH + 0.2), new THREE.Plane(new THREE.Vector3(0, 0, 1), BD + 0.1), new THREE.Plane(new THREE.Vector3(0, 0, -1), BD + 0.1)];
  const ringGeo = new THREE.RingGeometry(0.93, 1, 48);
  const rings = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: clip });
    const r = new THREE.Mesh(ringGeo, m);
    if (i < 3) r.position.set(FX, FY, BD + 0.03); else { r.rotation.x = -Math.PI / 2; r.position.set(FX, BH + 0.13, 0); }
    r.visible = false; scene.add(r); rings.push(r);
  }
  const focus = kit.mesh(new THREE.SphereGeometry(0.11, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffd60a }), [FX, FY, BD + 0.04], scene);
  focus.castShadow = false;

  // ---------- The volcano ----------
  const volc = new THREE.Group(); volc.position.set(VX, 0, 0); scene.add(volc);
  const plinthFace = faceMat();
  const box = (z0, z1) => { const g = new THREE.BoxGeometry(7, VH, z1 - z0); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 8, (p.getY(i) + VH / 2) / VH); return g; };
  kit.mesh(box(-2.6, 0), [rockSide, rockSide, rockSide, rockSide, plinthFace, rockSide], [0, VH / 2, -1.3], volc);
  const frontBox = kit.mesh(box(0, 2.6), [rockSide, rockSide, rockSide, rockSide, plinthFace, rockSide], [0, VH / 2, 1.3], volc);
  kit.mesh(new THREE.BoxGeometry(7, 0.06, 2.6), grass, [0, VH + 0.03, -1.3], volc);
  const frontTop = kit.mesh(new THREE.BoxGeometry(7, 0.06, 2.6), grass, [0, VH + 0.03, 1.3], volc);
  const prof = CONE.map(([r, y]) => new THREE.Vector2(r, y));
  const coneMat = kit.mat(0x7a6355, { side: THREE.DoubleSide, flatShading: true });
  const backCone = kit.mesh(new THREE.LatheGeometry(prof, 24, Math.PI / 2, Math.PI), coneMat, [0, VH + 0.05, 0], volc);
  const frontCone = kit.mesh(new THREE.LatheGeometry(prof, 24, -Math.PI / 2, Math.PI), coneMat, [0, VH + 0.05, 0], volc);
  // Cut face of the cone: layers of old lava and ash.
  const cut = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    const img = g.createImageData(256, 128);
    for (let py = 0; py < 128; py++) for (let px2 = 0; px2 < 256; px2++) {
      const x = (px2 / 256 - 0.5) * 5, y = (1 - py / 128) * 2.2, k = Math.floor((y + Math.abs(x) * 0.8) * 5) % 2;
      const o = (py * 256 + px2) * 4, base = k ? [118, 98, 86] : [84, 72, 66];
      img.data.set([base[0], base[1], base[2], 255], o);
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const cutShape = new THREE.Shape([...CONE].map(([r, y]) => new THREE.Vector2(-r, y)).concat([...CONE].reverse().map(([r, y]) => new THREE.Vector2(r, y))));
  const cutGeo = new THREE.ShapeGeometry(cutShape);
  { const uv = cutGeo.attributes.uv, p = cutGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 5 + 0.5, p.getY(i) / 2.2); }
  const cutFace = kit.mesh(cutGeo, new THREE.MeshStandardMaterial({ map: cut, roughness: 0.95 }), [0, VH + 0.05, 0.005], volc);
  // Magma: a chamber in the rock and a pipe up to the crater, drawn on the cut face.
  const magmaMat = new THREE.MeshBasicMaterial({ color: 0xff5a1f });
  const chamber = new THREE.Mesh(new THREE.CircleGeometry(1, 32), magmaMat);
  chamber.scale.set(1.15, 0.42, 1); chamber.position.set(0, 0.75, 0.02); volc.add(chamber);
  const pipeLen = VH + 1.95 - 0.95;
  const pipeGeo = new THREE.PlaneGeometry(0.22, 1); pipeGeo.translate(0, 0.5, 0);
  const pipe = new THREE.Mesh(pipeGeo, magmaMat); pipe.position.set(0, 0.95, 0.025); volc.add(pipe);
  const pipeDark = new THREE.Mesh(pipeGeo, new THREE.MeshBasicMaterial({ color: 0x3a2a24 }));
  pipeDark.position.set(0, 0.95, 0.022); pipeDark.scale.y = pipeLen; volc.add(pipeDark);
  const insideParts = [chamber, pipe, pipeDark, cutFace];
  // Lava flows: strips down the cone that grow during an eruption.
  const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff3c00, emissiveIntensity: 1, roughness: 0.6 });
  const flows = [];
  const SEG = 22;
  for (const [phi, front] of [[0.62 * Math.PI, false], [1.38 * Math.PI, false], [1.05 * Math.PI, false], [0.15 * Math.PI, true], [-0.3 * Math.PI, true]]) {
    const posA = new Float32Array((SEG + 1) * 6), idx = [];
    for (let i = 0; i <= SEG; i++) {
      const s = i / SEG, y = lerp(2.08, 0.05, s), r = coneR(y) + 0.035, w = lerp(0.07, 0.16, s);
      const a = phi + 0.12 * Math.sin(s * 7 + phi * 3), dr = w / Math.max(r, 0.3);
      posA.set([r * Math.sin(a - dr), y, r * Math.cos(a - dr), r * Math.sin(a + dr), y, r * Math.cos(a + dr)], i * 6);
      if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(posA, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, lavaMat); m.position.y = VH + 0.05; m.material.side = THREE.DoubleSide; volc.add(m);
    flows.push({ m, front });
  }
  // Lava fountain and ash.
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const NFP = 70, fPos = new Float32Array(NFP * 3), fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const fountain = new THREE.Points(fGeo, new THREE.PointsMaterial({ color: 0xffa31a, size: 0.22, map: dotTex, transparent: true, depthWrite: false }));
  fountain.position.set(0, VH + 0.05 + 2.0, 0); fountain.visible = false; volc.add(fountain);
  const ashGeo = new THREE.SphereGeometry(1, 12, 8), ash = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(ashGeo, new THREE.MeshStandardMaterial({ color: 0x6b6b6b, transparent: true, opacity: 0, roughness: 1, depthWrite: false }));
    m.visible = false; volc.add(m); ash.push(m);
  }
  const lavaHot = new THREE.Color(0xff6a1a), lavaCold = new THREE.Color(0x2e2a28), emHot = new THREE.Color(0xff3c00), black = new THREE.Color(0x000000);

  // ---------- Globe with the belts ----------
  const stand = new THREE.Group(); stand.position.set(GX, 0, 0); scene.add(stand);
  const brass = kit.mat(0xc9a24a, { metalness: 0.4, roughness: 0.4 });
  kit.mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.18, 24), kit.mat(0x6b4426), [0, 0.09, 0], stand);
  kit.mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.25, 10), brass, [0, 0.8, 0], stand);
  const tilt = new THREE.Group(); tilt.position.y = GY; tilt.rotation.z = -0.41; stand.add(tilt);
  kit.mesh(new THREE.TorusGeometry(1.22, 0.035, 6, 32, Math.PI), brass, [0, 0, 0], tilt).rotation.z = -Math.PI / 2;
  const tex = { quakes: paintWorld(THREE, { dots: true }), volcanoes: paintWorld(THREE, { tris: true }), both: paintWorld(THREE, { dots: true, tris: true }) };
  const globeMat = new THREE.MeshStandardMaterial({ map: tex.both, roughness: 0.8 });
  const globe = kit.mesh(new THREE.SphereGeometry(1.15, 32, 24), globeMat, [0, 0, 0], tilt);
  const PAC = -165 * Math.PI / 180;
  globe.rotation.y = -Math.PI / 2 - PAC + 0.15;

  // ---------- A classroom corner for "drop, cover, hold on" ----------
  const room = new THREE.Group(); room.position.set(0, 0, RZ); scene.add(room);
  const shakeRoom = new THREE.Group(); room.add(shakeRoom);
  kit.mesh(new THREE.BoxGeometry(5, 0.1, 4), kit.mat(0xc49a6c), [0, 0.05, 0], shakeRoom);
  kit.mesh(new THREE.BoxGeometry(5, 2.6, 0.12), kit.mat(0xf3ead8), [0, 1.3, -2], shakeRoom);
  kit.mesh(new THREE.BoxGeometry(0.12, 2.6, 4), kit.mat(0xe8dcc4), [-2.5, 1.3, 0], shakeRoom);
  kit.mesh(new THREE.BoxGeometry(1.3, 0.9, 0.04), kit.mat(0xbfe3ff, { roughness: 0.1 }), [1.2, 1.6, -1.93], shakeRoom);
  kit.mesh(new THREE.BoxGeometry(1.42, 1.02, 0.03), kit.mat(0xffffff), [1.2, 1.6, -1.95], shakeRoom);
  const shelf = new THREE.Group(); shelf.position.set(-2.3, 1.55, -0.6); shakeRoom.add(shelf);
  kit.mesh(new THREE.BoxGeometry(0.3, 0.05, 1.4), kit.mat(0x8d6e63), [0, 0, 0], shelf);
  const books = [];
  for (let i = 0; i < 6; i++) books.push(kit.mesh(new THREE.BoxGeometry(0.2, 0.3 + rand(i) * 0.1, 0.12), kit.mat([0xe63946, 0x457b9d, 0xf4a261, 0x2a9d8f, 0x8338ec, 0xffbe0b][i]), [0, 0.18, -0.55 + i * 0.2], shelf));
  const table = new THREE.Group(); table.position.set(0, 0.1, 0); shakeRoom.add(table);
  const tableMat = kit.mat(0xa1887f);
  kit.mesh(new THREE.BoxGeometry(1.7, 0.08, 1.0), tableMat, [0, 0.74, 0], table);
  for (const [x, z] of [[-0.75, -0.42], [0.75, -0.42], [-0.75, 0.42], [0.75, 0.42]]) kit.mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), tableMat, [x, 0.36, z], table);
  // The child: legs and a body that bends at the hips, arms at the shoulders.
  const kid = new THREE.Group(); room.add(kid);
  const shirt = kit.mat(0x2a9df4), skin = kit.mat(0xe0a878), pants = kit.mat(0x34495e);
  const hips = new THREE.Group(); kid.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  kit.mesh(new THREE.CapsuleGeometry(0.15, 0.3, 4, 10), shirt, [0, 0.25, 0], torso);
  kit.mesh(new THREE.SphereGeometry(0.15, 16, 12), skin, [0, 0.62, 0], torso);
  const arm = x => { const a = new THREE.Group(); a.position.set(x, 0.42, 0); kit.mesh(new THREE.CapsuleGeometry(0.05, 0.3, 3, 8), skin, [0, -0.18, 0], a); torso.add(a); return a; };
  const armL = arm(-0.2), armR = arm(0.2);
  const leg = x => {
    const l = new THREE.Group(); l.position.set(x, 0, 0); kit.mesh(new THREE.CapsuleGeometry(0.07, 0.14, 3, 8), pants, [0, -0.14, 0], l); hips.add(l);
    const k = new THREE.Group(); k.position.y = -0.28; kit.mesh(new THREE.CapsuleGeometry(0.06, 0.14, 3, 8), pants, [0, -0.13, 0], k); l.add(k); l.knee = k;
    return l;
  };
  const legL = leg(-0.08), legR = leg(0.08);
  // Poses: [x, z, hips y, body bend, left arm (x, z), right arm (x, z), thighs, knees, turn]
  const POSES = {
    stand: [1.45, 0.75, 0.6, 0, 0, 0.1, 0, -0.1, 0, 0, -0.5],
    drop: [1.45, 0.75, 0.33, 1.2, -1.2, 0, -1.2, 0, 0, 1.57, -0.5],
    cover: [0.0, 0.1, 0.33, 1.25, -1.25, 0, -1.25, 0, 0, 1.57, -1.45],
    hold: [0.0, 0.1, 0.33, 1.25, -2.7, -0.4, -1.9, 0.75, 0, 1.57, -1.45],
  };
  const pose = [...POSES.stand], poseFrom = [...POSES.stand], poseTo = [...POSES.stand];
  function applyPose(p) {
    kid.position.set(p[0], 0.1, p[1]); kid.rotation.y = p[10];
    hips.position.y = p[2]; torso.rotation.x = p[3];
    armL.rotation.set(p[4], 0, p[5]); armR.rotation.set(p[6], 0, p[7]);
    legL.rotation.x = legR.rotation.x = p[8]; legL.knee.rotation.x = legR.knee.rotation.x = p[9];
  }
  applyPose(pose);

  // ---------- Labels ----------
  const L = {
    fault: label('Fault', new THREE.Vector3(XT + 0.05, BH + 0.5, BD)),
    slip: label('Rocks slip here', focus, { cls: 'warm' }),
    weak: label('Brick building', new THREE.Vector3(-2.5, BH + 1.5, 0.1)),
    strong: label('Braced building', new THREE.Vector3(-0.9, BH + 1.85, 0.1)),
    magma: label('Magma', new THREE.Vector3(VX - 0.9, 0.75, 0.1), { cls: 'warm' }),
    lava: label('Lava', new THREE.Vector3(VX + 1.25, VH + 1.0, 0.4), { cls: 'warm' }),
    ash: label('Ash', new THREE.Vector3(VX + 0.2, VH + 4.4, 0)),
    pacific: label('Pacific Ocean', new THREE.Vector3(GX, GY - 0.1, 1.2), { cls: 'cool' }),
    ring: label('Ring of Fire', new THREE.Vector3(GX - 0.3, GY + 1.1, 0.6), { cls: 'warm' }),
  };
  const showLabels = keys => { for (const [k, l] of Object.entries(L)) l.show(keys.includes(k)); };

  // ---------- State ----------
  const st = {
    mode: '', slip: 0, slipTo: 0, stress: 0, pushing: false, quake: -1, amp: 0.6, strength: 7, fallen: 0, collapse: false,
    erupt: -1, cool: 0, inside: true, kidT: 1, shakeRoom: -1, auto: -1, meter: -1, msg: '',
  };
  function setFault(on) { faultLine.visible = on; faultPlane.visible = on; }
  function setInside(on) {
    st.inside = on; frontCone.visible = !on; frontBox.visible = !on; frontTop.visible = !on;
    for (const p of insideParts) p.visible = on;
    for (const f of flows) if (f.front) f.m.visible = !on && st.erupt >= 0;
    L.magma.show(on && st.mode === 'volcano');
  }
  function quake(amp) { st.quake = 0; st.amp = amp; for (const r of rings) { r.visible = true; r.life = -1; } }
  function rebuild() { st.fallen = 0; st.collapse = false; for (let i = 0; i < floors.length; i++) { floors[i].position.set(0, i < 3 ? 0.21 + i * 0.42 : 1.3, 0); floors[i].rotation.set(0, 0, 0); } weak.rotation.set(0, 0, 0); }
  function erupt() {
    st.erupt = 0; st.cool = 0; pipe.scale.y = 0.001;
    lavaMat.color.copy(lavaHot); lavaMat.emissive.copy(emHot);
    for (const f of flows) { f.m.geometry.setDrawRange(0, 0); f.m.visible = !f.front || !st.inside; }
  }
  function setKid(name, instant) {
    poseFrom.splice(0, 11, ...pose); poseTo.splice(0, 11, ...POSES[name]); st.kidT = instant ? 1 : 0;
    if (instant) { pose.splice(0, 11, ...POSES[name]); applyPose(pose); }
  }
  const meterHtml = s => `Push: <span style="color:#e85d04;letter-spacing:1px">${'■'.repeat(Math.round(s * 10))}</span><span style="color:#cfd8dc;letter-spacing:1px">${'■'.repeat(10 - Math.round(s * 10))}</span>`;
  const say = m => { if (m !== st.msg) { st.msg = m; ui.readout(m); } };
  const strengthWord = v => (v <= 3 ? 'gentle' : v <= 5 ? 'strong' : 'very strong');

  const blockView = { radius: 3.6, width: 4.6, yaw: 0.35, pitch: 0.32, target: [0, 1.4, 0] };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.mode = ''; st.pushing = false; st.stress = 0; st.quake = -1; st.auto = -1; st.msg = ''; st.shakeRoom = -1;
      setFault(false); focus.visible = false; arrows.forEach(a => { a.visible = false; });
      for (const r of rings) r.visible = false;
      for (const h of houses) h.g.visible = true;
      weak.visible = strong.visible = false;
      fountain.visible = false; ash.forEach(a => { a.visible = false; });
      if (i !== 1 && i !== 2) { st.slip = st.slipTo = 0; }
      if (i === 0) {
        go(blockView); showLabels([]);
        st.tog = ui.toggle({ label: 'Show the fault', value: false, onChange: v => { st.auto = -1; setFault(v); L.fault.show(v); } });
        st.auto = 0.8;
      }
      if (i === 1) {
        st.mode = 'push'; setFault(true); arrows.forEach(a => { a.visible = true; }); showLabels(['fault']);
        go(blockView);
        ui.buttons([{ label: 'Push the rocks', onClick: () => { if (st.slipTo >= SLIP * 3.5) st.slip = st.slipTo = 0; st.pushing = true; st.stress = 0; } }]);
        say(meterHtml(0)); st.auto = 0.2;
      }
      if (i === 2) {
        st.mode = 'waves'; setFault(true); focus.visible = true; showLabels(['slip']);
        go({ ...blockView, yaw: 0.15, pitch: 0.38 });
        ui.buttons([{ label: 'Make an earthquake', onClick: () => quake(1) }]);
        st.auto = 0.3;
      }
      if (i === 3) {
        st.mode = 'test'; for (const h of houses) h.g.visible = false; weak.visible = strong.visible = true; rebuild(); showLabels(['weak', 'strong']);
        go({ radius: 2.3, yaw: -0.08, pitch: 0.22, target: [-1.65, BH + 0.8, 0.1] });
        st.strength = 8;
        ui.slider({ label: 'Shaking strength', min: 1, max: 10, step: 1, value: 8, format: v => `${v} (${strengthWord(v)})`, onInput: v => { st.strength = v; } });
        ui.buttons([{ label: 'Shake', onClick: () => { if (st.collapse) rebuild(); quake(st.strength / 10); } }, { label: 'Build again', onClick: () => { rebuild(); st.quake = -1; } }]);
        st.auto = 0.3;
      }
      if (i === 4) {
        st.mode = 'volcano'; setInside(true); showLabels(['magma']);
        go({ radius: 3.7, yaw: 0.25, pitch: 0.18, target: [VX, 2.7, 0] });
        ui.buttons([{ label: 'Erupt', onClick: () => erupt() }]);
        ui.toggle({ label: 'Look inside', value: true, onChange: v => setInside(v) });
        erupt();
      } else { setInside(false); st.erupt = -1; for (const f of flows) f.m.visible = false; pipe.scale.y = 0.001; }
      if (i === 5) {
        st.mode = 'globe'; showLabels(['pacific', 'ring']); globeMat.map = tex.both; globeMat.needsUpdate = true;
        ui.buttons([{ label: 'Earthquakes', onClick: () => { globeMat.map = tex.quakes; globeMat.needsUpdate = true; } }, { label: 'Volcanoes', onClick: () => { globeMat.map = tex.volcanoes; globeMat.needsUpdate = true; } }, { label: 'Both', on: true, onClick: () => { globeMat.map = tex.both; globeMat.needsUpdate = true; } }]);
        ui.readout('<span style="color:#e0242c">●</span> earthquakes &nbsp; <span style="color:#ff9a1a">▲</span> volcanoes');
        go({ radius: 1.95, yaw: 0, pitch: 0.12, target: [GX, GY, 0] });
      }
      for (const o of [left, right, volc, stand, faultLine, faultPlane]) o.visible = i !== 6 && (o !== faultLine && o !== faultPlane || o.visible);
      if (i === 6) {
        st.mode = 'room'; showLabels([]); setKid('stand', true);
        go({ radius: 2.1, yaw: 0.35, pitch: 0.22, target: [0.35, 0.55, RZ] });
        const row = ui.buttons([{ label: 'Drop', onClick: () => { st.auto = -1; if (st.shakeRoom > 6) st.shakeRoom = 0; setKid('drop'); say('<b>Drop</b> down onto your hands and knees.'); } },
          { label: 'Cover', onClick: () => { st.auto = -1; setKid('cover'); say('<b>Cover</b>: crawl under a sturdy table or desk.'); } },
          { label: 'Hold on', onClick: () => { st.auto = -1; setKid('hold'); say('<b>Hold on</b> to a table leg and cover your head and neck with your other arm.'); } }]);
        st.row = row; st.auto = 0; st.shakeRoom = 0;
      }
      if (isQuiz) { showLabels(['fault']); setFault(true); go({ ...blockView, yaw: -0.3, pitch: 0.36 }); }
    },
    update(dt) {
      let busy = false;
      // Auto demos so each step shows its idea without a tap.
      if (st.auto >= 0) {
        st.auto += dt; busy = true;
        if (st.mode === '' && st.auto > 1.2) { setFault(true); L.fault.show(true); if (st.tog) st.tog.checked = true; st.auto = -1; }
        else if (st.mode === 'push' && st.auto > 0.6) { st.pushing = true; st.stress = 0; st.auto = -1; }
        else if (st.mode === 'waves' && st.auto > 1.3) { quake(1); st.auto = -1; }
        else if (st.mode === 'test' && st.auto > 0.4) { quake(st.strength / 10); st.auto = -1; }
        else if (st.mode === 'room') {
          const a = st.auto;
          if (a > 0.3 && st.kidStep !== 1 && a < 1.1) { st.kidStep = 1; setKid('drop'); st.row?.select(0); say('<b>Drop</b> down onto your hands and knees.'); }
          if (a > 1.1 && st.kidStep === 1) { st.kidStep = 2; setKid('cover'); st.row?.select(1); say('<b>Cover</b>: crawl under a sturdy table or desk.'); }
          if (a > 2.0 && st.kidStep === 2) { st.kidStep = 3; setKid('hold'); st.row?.select(2); say('<b>Hold on</b> to a table leg and cover your head and neck with your other arm.'); st.auto = -1; }
        }
      } else st.kidStep = 0;
      // Push builds up, then the rocks slip.
      if (st.pushing) {
        st.stress = Math.min(1, st.stress + dt / 1.6);
        arrows.forEach((a, j) => { a.scale.setScalar(1 + 0.4 * st.stress); a.position.y = BH / 2 + (j ? -1 : 1) * 0.03 * Math.sin(st.stress * 40); });
        say(meterHtml(st.stress));
        if (st.stress >= 1) { st.pushing = false; st.slipTo += SLIP; quake(0.8); st.stress = 0; }
        busy = true;
      } else if (st.mode === 'push' && st.quake < 0) say(meterHtml(0));
      if (Math.abs(st.slip - st.slipTo) > 1e-4) { st.slip += (st.slipTo - st.slip) * Math.min(1, dt * 14); busy = true; } else st.slip = st.slipTo;
      // Right block slides down along the fault.
      const fdx = XB - XT, fl = Math.hypot(fdx, BH);
      right.position.set(st.slip * fdx / fl, -st.slip * BH / fl, 0);
      // Earthquake shaking and rings.
      let shake = 0;
      if (st.quake >= 0) {
        st.quake += dt; busy = true;
        const T = 2.6, q = st.quake;
        const env = q < T ? Math.sin(Math.PI * Math.min(1, q / T)) : 0;
        shake = env * st.amp;
        rings.forEach((r, j) => {
          const age = q - (j % 3) * 0.5;
          if (age < 0 || age > 2.4) { r.material.opacity = 0; return; }
          const rad = 0.2 + age * 2.2; r.scale.set(rad, rad, rad);
          r.material.opacity = 1 - age / 2.4;
        });
        if (q > 3.5) { st.quake = -1; for (const r of rings) r.material.opacity = 0; }
      }
      const w = st.quake >= 0 ? st.quake * 28 : 0;
      left.position.x = 0.025 * shake * Math.sin(w);
      right.position.x += 0.025 * shake * Math.sin(w + 0.4);
      for (const h of houses) {
        const near = st.mode === 'waves' ? clamp(1.6 / (0.6 + h.d), 0.15, 1) : 1;
        h.g.rotation.z = 0.22 * shake * near * Math.sin(w * 1.1 + h.x);
        h.g.position.y = BH + 0.08 + 0.04 * shake * near * Math.abs(Math.sin(w * 0.9 + h.z));
      }
      // Building test: weak building falls in strong shaking; braced building sways.
      if (st.mode === 'test') {
        strong.rotation.z = 0.06 * shake * Math.sin(w * 0.8);
        if (!st.collapse) weak.rotation.z = 0.05 * shake * Math.sin(w * 1.2);
        if (st.quake > 0.7 && st.amp >= 0.6 && !st.collapse) st.collapse = true;
        if (st.collapse && st.fallen < 1) {
          st.fallen = Math.min(1, st.fallen + dt / 1.1); busy = true;
          const e = ease(st.fallen);
          floors.forEach((f, j) => {
            const [px, py, rt] = PILE[j], y0 = j < 3 ? 0.21 + j * 0.42 : 1.3;
            f.position.set(px * e, lerp(y0, py, e), 0.1 * j * e - 0.1); f.rotation.z = rt * e; f.rotation.x = 0.15 * j * e;
          });
          weak.rotation.z = 0;
        }
      }
      // Volcano eruption: magma rises, then lava, fountain and ash; afterwards the lava cools.
      if (st.erupt >= 0 && st.erupt < 10.6) {
        st.erupt += dt; const te = st.erupt; busy = true;
        pipe.scale.y = Math.max(0.001, pipeLen * clamp(te / 1.0, 0, 1));
        const on = te > 0.9 && te < 7.5;
        fountain.visible = on;
        const grow = clamp((te - 0.9) / 3.2, 0, 1);
        for (const f of flows) f.m.geometry.setDrawRange(0, Math.floor(grow * SEG) * 6);
        if (on) for (let j = 0; j < NFP; j++) {
          const ph = (te * 0.9 + rand(j)) % 1, a = rand(j + 7) * Math.PI * 2, sp = 0.35 + rand(j + 3) * 0.55, up = 2.2 + rand(j + 11) * 1.6, tt = ph * 1.1;
          fPos[j * 3] = Math.cos(a) * sp * tt; fPos[j * 3 + 1] = up * tt - 3.4 * tt * tt; fPos[j * 3 + 2] = Math.sin(a) * sp * tt;
        }
        fGeo.attributes.position.needsUpdate = true;
        ash.forEach((m, j) => {
          const ph = ((te - 1) * 0.28 + j / ash.length) % 1;
          m.visible = te > 1 && te < 9;
          const s = 0.3 + ph * 1.1; m.scale.setScalar(s);
          m.position.set(0.25 * Math.sin(j * 2.1) + ph * 0.8, VH + 2.3 + ph * 3.2, 0.2 * Math.cos(j * 1.7) - 0.3);
          m.material.opacity = (te < 7.5 ? 0.75 : Math.max(0, 0.75 * (9 - te) / 1.5)) * (1 - ph * 0.7);
        });
        L.ash.show(st.mode === 'volcano' && te > 1.5 && te < 9);
        L.lava.show(st.mode === 'volcano' && te > 2);
        if (te > 7.5) {
          st.cool = clamp((te - 7.5) / 3, 0, 1);
          lavaMat.color.copy(lavaHot).lerp(lavaCold, st.cool); lavaMat.emissive.copy(emHot).lerp(black, st.cool);
          pipe.scale.y = Math.max(0.001, pipeLen * (1 - st.cool * 0.6));
        }
      }
      // Classroom shaking and the child's poses.
      if (st.mode === 'room') {
        if (st.shakeRoom >= 0) st.shakeRoom += dt;
        const s = st.shakeRoom >= 0 && st.shakeRoom < 6 ? Math.min(1, (6 - st.shakeRoom) / 1.5) : 0, wr = st.shakeRoom * 26;
        shakeRoom.position.x = 0.03 * s * Math.sin(wr);
        books.forEach((b, j) => { b.rotation.x = 0.18 * s * Math.sin(wr * 0.7 + j); });
        busy = busy || s > 0;
      }
      if (st.kidT < 1) {
        st.kidT = Math.min(1, st.kidT + dt / 0.6); const e = ease(st.kidT);
        for (let j = 0; j < 11; j++) pose[j] = lerp(poseFrom[j], poseTo[j], e);
        applyPose(pose); busy = true;
      }
      return busy;
    },
  };
}
