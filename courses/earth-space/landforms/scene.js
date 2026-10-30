// Landforms: a classroom relief model of an island (mountains, hills, a valley, a plain, a plateau,
// a small island, a river, a lake and a pond). Each step lights up one landform; a toggle squashes
// the model into a flat coloured map with symbols; a globe on a stand shows how much of Earth is water.

const S = 10, N = 120;             // model size and grid cells
const Y0 = 0.95;                  // sea level of the model above the floor
const WATER = 0.11;               // lake and pond surface (model units)
const MAPY = 0.03;                // height scale of the flat map

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const noise = (x, z) => Math.sin(1.7 * x + 0.6 * z) * Math.sin(1.3 * z - 0.8 * x + 1) + 0.5 * Math.sin(3.1 * x + 2.3 * z + 2) * Math.sin(2.7 * z + 0.4);

const PEAKS = [[-2.6, -1.55, 1.75, 1.55], [-2.85, 0.75, 1.4, 1.35], [-1.55, -2.7, 1.15, 1.15]];
const HILLS = [[0.35, -2.35], [1.3, -1.95], [-0.35, -1.6]];
const PLAT = { x: -0.7, z: 2.05, r: 0.95, h: 0.78 };
const LAKE = { x: -1.0, z: -0.35, r: 0.55 }, POND = { x: 1.9, z: 1.55, r: 0.25 };
const ISLE = { x: 3.95, z: -3.35, r: 0.6 };
const RIVER = [[-2.45, -0.42], [-1.8, -0.4], [-1.0, -0.35], [-0.3, -0.15], [0.5, 0.15], [1.3, 0.05], [2.2, 0.35], [3.1, 0.45], [4.3, 0.5]];
const zValley = -0.42;

function segDist(x, z, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}

// Height of the model and how much each point belongs to each landform.
const F = { mountain: 0, hill: 0, valley: 0, plain: 0, plateau: 0, island: 0, lake: 0, pond: 0 };
function height(x, z) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  const R = 3.75 + 0.3 * Math.sin(3 * th + 1) + 0.18 * Math.sin(5 * th + 2);
  const m = ss(R + 0.35, R - 0.45, r);
  let h = -0.5 + 0.64 * m + 0.03 * noise(x, z) * m;
  // Plain: wide, flat and low.
  const pm = ss(0.2, 0.9, x) * ss(3.7, 3.0, x) * ss(-1.6, -1.0, z) * ss(2.7, 2.1, z);
  h = lerp(h, 0.13, pm * ss(0.6, 1, m));
  F.plain = pm * ss(0.8, 1, m);
  // Mountains: pointed peaks with rough sides; they may run straight into the sea.
  let mt = 0;
  for (const [px, pz, ph, pr] of PEAKS) {
    const f = Math.max(0, 1 - Math.hypot(x - px, z - pz) / pr);
    mt += ph * Math.pow(f, 1.5) * (0.88 + 0.12 * noise(3 * x, 3 * z));
  }
  h += mt * ss(R + 0.7, R - 0.2, r);
  F.mountain = ss(0.45, 0.8, mt);
  // Valley: a low V between the two western mountains, sloping down to the lake.
  const vm = ss(-1.25, -1.7, x) * ss(-4.2, -3.6, x);
  const floor = 0.17 + 0.3 * ss(-1.6, -3.4, x) + 0.85 * Math.abs(z - zValley);
  h = lerp(h, Math.min(h, floor), vm);
  F.valley = vm * ss(0.75, 0.35, Math.abs(z - zValley)) * ss(-4.0, -3.4, x);
  // Hills: low and round.
  let hl = 0;
  for (const [hx, hz] of HILLS) hl += Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / 0.3);
  h += 0.42 * hl * m;
  F.hill = ss(0.2, 0.5, hl);
  // Plateau: high, flat top, steep sides.
  const dp = Math.hypot(x - PLAT.x, z - PLAT.z), pf = ss(PLAT.r + 0.22, PLAT.r - 0.05, dp);
  h = Math.max(h, lerp(h, 0.14 + PLAT.h, pf));
  F.plateau = ss(0.3, 0.7, pf);
  // River channel.
  const dr = segDist(x, z, RIVER);
  h -= 0.06 * ss(0.17, 0.05, dr) * ss(0.4, 0.9, m);
  // Lake and pond basins.
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z), dq = Math.hypot(x - POND.x, z - POND.z);
  if (dl < LAKE.r) h = Math.min(h, 0.15 - 0.3 * ss(LAKE.r, LAKE.r * 0.45, dl));
  if (dq < POND.r) h = Math.min(h, 0.15 - 0.16 * ss(POND.r, POND.r * 0.4, dq));
  F.lake = dl < LAKE.r ? 1 : 0; F.pond = dq < POND.r ? 1 : 0;
  // Small island off the coast.
  const di = Math.hypot(x - ISLE.x, z - ISLE.z), isl = di < ISLE.r ? -0.5 + 0.95 * ss(ISLE.r, ISLE.r * 0.2, di) + 0.04 * noise(4 * x, 4 * z) * ss(ISLE.r, 0, di) : -1;
  if (isl > h) h = isl;
  F.island = di < ISLE.r ? ss(-0.05, 0.05, h) : 0;
  return h;
}

// Relief colours (like a painted model) and flat map colours.
const C = {};
function relief(c, h, snowy) {
  if (h < -0.02) return c.copy(C.deep).lerp(C.sand, ss(-0.5, -0.02, h));
  if (h < 0.06) return c.copy(C.sand);
  if (h < 0.35) return c.copy(C.grass).lerp(C.forest, ss(0.12, 0.35, h));
  if (h < 0.85) return c.copy(C.forest).lerp(C.rock, ss(0.45, 0.85, h));
  c.copy(C.rock).lerp(C.grey, ss(0.85, 1.25, h));
  if (snowy) c.lerp(C.snow, ss(1.22, 1.32, h));
  return c;
}
function mapColour(c, h, wet) {
  if (h < 0 || wet) return c.copy(C.mWater);
  if (h < 0.3) return c.copy(C.mGreen);
  if (h < 0.6) return c.copy(C.mYellow);
  if (h < 1.0) return c.copy(C.mOrange);
  return c.copy(C.mBrown);
}

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
function paintWorld(THREE, { ocean, land, ice }) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const px = (lon, lat) => [(lon + 180) / 360 * 512, (90 - lat) / 180 * 256];
  g.fillStyle = ocean; g.fillRect(0, 0, 512, 256);
  g.fillStyle = land;
  for (const poly of WORLD) {
    g.beginPath();
    poly.forEach(([lo, la], i) => { const [x, y] = px(lo, la); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.closePath(); g.fill();
  }
  g.fillStyle = ice; g.fillRect(0, 256 * (155 / 180), 512, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xe9dcc3, sky: 0xdcefff, radius: 30 });
  const sunLight = kit.lights(scene, { sun: [5, 11, 7] });
  sunLight.shadow.bias = -0.0008; sunLight.shadow.normalBias = 0.02;
  Object.assign(C, {
    deep: new THREE.Color(0x2a6fb0), sand: new THREE.Color(0xe8d49a), grass: new THREE.Color(0x86c45a), forest: new THREE.Color(0x4f9440),
    rock: new THREE.Color(0x9a7a58), grey: new THREE.Color(0x8d8a86), snow: new THREE.Color(0xffffff),
    mWater: new THREE.Color(0x6cb8ec), mGreen: new THREE.Color(0x9ccf6e), mYellow: new THREE.Color(0xf0dc78), mOrange: new THREE.Color(0xe0a253), mBrown: new THREE.Color(0xa86a3c),
    glow: new THREE.Color(0xffe066),
  });

  // The model tray: a wooden frame around the sea, sitting on the floor.
  const model = new THREE.Group();
  model.position.y = Y0;
  scene.add(model);
  const wood = kit.mat(0x9c6b3f);
  kit.mesh(new THREE.BoxGeometry(S + 0.3, Y0 - 0.5, S + 0.3), kit.mat(0x7b5230), [0, -(Y0 + 0.5) / 2, 0], model);
  for (const [w, d, x, z] of [[S + 0.3, 0.15, 0, S / 2 + 0.075], [S + 0.3, 0.15, 0, -S / 2 - 0.075], [0.15, S, S / 2 + 0.075, 0], [0.15, S, -S / 2 - 0.075, 0]])
    kit.mesh(new THREE.BoxGeometry(w, 0.62, d), wood, [x, -0.24, z], model);

  // Land: everything that squashes flat in map view.
  const land = new THREE.Group();
  model.add(land);
  const geo = new THREE.PlaneGeometry(S, S, N, N);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, nv = pos.count;
  const hts = new Float32Array(nv), wet = new Uint8Array(nv);
  const masks = {}; for (const k of Object.keys(F)) masks[k] = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    const h = height(pos.getX(i), pos.getZ(i));
    pos.setY(i, h); hts[i] = h;
    for (const k of Object.keys(F)) masks[k][i] = F[k];
    wet[i] = (F.lake || F.pond) && h < WATER ? 1 : 0;
  }
  geo.computeVertexNormals();
  const col = new Float32Array(nv * 3), baseR = new Float32Array(nv * 3), baseM = new Float32Array(nv * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const tc = new THREE.Color();
  for (let i = 0; i < nv; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    relief(tc, hts[i], true); if (Math.hypot(x - ISLE.x, z - ISLE.z) < ISLE.r && hts[i] > 0.06) tc.copy(C.grass);
    tc.toArray(baseR, i * 3);
    mapColour(tc, hts[i], wet[i]); tc.toArray(baseM, i * 3);
  }
  const terrain = kit.mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }), [0, 0, 0], land);

  // River ribbon with flowing stripes.
  const stripes = document.createElement('canvas'); stripes.width = 64; stripes.height = 16;
  { const g = stripes.getContext('2d'); g.fillStyle = '#3d8fe0'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#7cc0ff'; for (let i = 0; i < 4; i++) g.fillRect(i * 16 + 2, 3 + (i % 2) * 6, 7, 3); }
  const flowTex = new THREE.CanvasTexture(stripes); flowTex.wrapS = flowTex.wrapT = THREE.RepeatWrapping; flowTex.colorSpace = THREE.SRGBColorSpace;
  const pts = [];
  for (let i = 0; i < RIVER.length - 1; i++) for (let k = 0; k < 8; k++) {
    const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], t = k / 8;
    pts.push([lerp(ax, bx, t), lerp(az, bz, t)]);
  }
  pts.push(RIVER[RIVER.length - 1]);
  const rPos = new Float32Array(pts.length * 6), rUv = new Float32Array(pts.length * 4), rIdx = [];
  let along = 0;
  pts.forEach(([x, z], i) => {
    const [nx, nz] = pts[Math.min(i + 1, pts.length - 1)], [px, pz] = pts[Math.max(i - 1, 0)];
    const dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz) || 1, w = 0.05 + 0.05 * (i / pts.length);
    const y = Math.max(height(x, z) + 0.035, 0.01);
    if (i) along += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
    rPos.set([x - dz / l * w, y, z + dx / l * w, x + dz / l * w, y, z - dx / l * w], i * 6);
    rUv.set([along * 2, 0, along * 2, 1], i * 4);
    if (i) { const a = (i - 1) * 2; rIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const rGeo = new THREE.BufferGeometry();
  rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  rGeo.setAttribute('uv', new THREE.BufferAttribute(rUv, 2));
  rGeo.setIndex(rIdx); rGeo.computeVertexNormals();
  const riverMat = new THREE.MeshStandardMaterial({ map: flowTex, roughness: 0.3, side: THREE.DoubleSide, emissive: 0x000000 });
  const river = new THREE.Mesh(rGeo, riverMat); land.add(river);

  // Lake and pond surfaces.
  const lakeMat = new THREE.MeshStandardMaterial({ color: 0x4a9be3, roughness: 0.2 });
  const pondMat = lakeMat.clone();
  const disc = (o, m) => { const d = new THREE.Mesh(new THREE.CircleGeometry(o.r, 32), m); d.rotation.x = -Math.PI / 2; d.position.set(o.x, WATER, o.z); land.add(d); return d; };
  const lake = disc(LAKE, lakeMat), pond = disc(POND, pondMat);

  // Sea: a see-through layer over the painted sea floor.
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x3f93dc, transparent: true, opacity: 0.72, roughness: 0.2, depthWrite: false, emissive: 0x000000 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(S, S), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.y = 0.0; sea.renderOrder = 2;
  model.add(sea);

  // Map symbols (shown only in map view), just above the flat map.
  const symbols = new THREE.Group(); symbols.visible = false; model.add(symbols);
  const symMat = new THREE.MeshBasicMaterial({ color: 0x5a3415, side: THREE.DoubleSide });
  const tri = new THREE.Shape([new THREE.Vector2(-0.2, -0.16), new THREE.Vector2(0.2, -0.16), new THREE.Vector2(0, 0.2)]);
  const triGeo = new THREE.ShapeGeometry(tri);
  for (const [px, pz] of PEAKS) { const s = new THREE.Mesh(triGeo, symMat); s.rotation.x = -Math.PI / 2; s.position.set(px, 0.09, pz); symbols.add(s); }
  const arcGeo = new THREE.RingGeometry(0.13, 0.19, 12, 1, 0, Math.PI);
  for (const [hx, hz] of HILLS) { const s = new THREE.Mesh(arcGeo, symMat); s.rotation.x = -Math.PI / 2; s.position.set(hx, 0.09, hz + 0.05); symbols.add(s); }

  // Globe on a stand next to the model.
  const GL = new THREE.Vector3(8.2, 2.45, -6.2);
  const stand = new THREE.Group(); stand.position.set(GL.x, 0, GL.z); scene.add(stand);
  const brass = kit.mat(0xc9a24a, { metalness: 0.4, roughness: 0.4 });
  kit.mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.18, 24), kit.mat(0x6b4426), [0, 0.09, 0], stand);
  kit.mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.25, 10), brass, [0, 0.8, 0], stand);
  const tilt = new THREE.Group(); tilt.position.y = GL.y; tilt.rotation.z = -0.41; stand.add(tilt);
  const ring = kit.mesh(new THREE.TorusGeometry(1.22, 0.035, 6, 32, Math.PI), brass, [0, 0, 0], tilt); ring.rotation.z = -Math.PI / 2;
  const texAll = paintWorld(THREE, { ocean: '#2f7fd6', land: '#62b04f', ice: '#f2f6fa' });
  const texLand = paintWorld(THREE, { ocean: '#9fb4c6', land: '#7cd35e', ice: '#f7fafc' });
  const texWater = paintWorld(THREE, { ocean: '#1f8bff', land: '#c9c4b8', ice: '#e4e2dc' });
  const globeMat = new THREE.MeshStandardMaterial({ map: texAll, roughness: 0.8 });
  const globe = kit.mesh(new THREE.SphereGeometry(1.15, 32, 24), globeMat, [0, 0, 0], tilt);
  globe.rotation.y = -0.6;

  // Labels (created once, shown per step).
  const at = (x, y, z) => new THREE.Vector3(x, Y0 + y, z);
  const L = {
    mountain: label('Mountain', at(PEAKS[0][0], height(PEAKS[0][0], PEAKS[0][1]) + 0.12, PEAKS[0][1])),
    hill: label('Hill', at(HILLS[1][0], 0.7, HILLS[1][1])),
    valley: label('Valley', at(-2.35, 0.55, zValley)),
    plain: label('Plain', at(2.7, 0.25, -0.55)),
    plateau: label('Plateau', at(PLAT.x, 1.05, PLAT.z)),
    island: label('Island', at(ISLE.x, 0.6, ISLE.z)),
    ocean: label('Ocean', at(3.4, 0.05, 3.6), { cls: 'cool' }),
    river: label('River', at(0.9, 0.2, 0.1), { cls: 'cool' }),
    lake: label('Lake', at(LAKE.x, 0.2, LAKE.z), { cls: 'cool' }),
    pond: label('Pond', at(POND.x, 0.2, POND.z), { cls: 'cool' }),
    globe: label('Globe', new THREE.Vector3(GL.x, GL.y + 1.45, GL.z), { cls: 'big' }),
  };
  const showLabels = keys => { for (const [k, l] of Object.entries(L)) l.show(keys.includes(k)); };

  const st = { hl: null, hlT: 0, hlTo: 0, map: 0, mapTo: 0, flow: false, spin: 0, quiz: false, dirtyCol: true, water: null };
  const LANDS = ['mountain', 'hill', 'valley', 'plain', 'plateau', 'island'];
  const WATERS = { ocean: seaMat, river: riverMat, lake: lakeMat, pond: pondMat };
  function pick(key) {
    st.hl = key; st.hlT = LANDS.includes(key) ? 0 : 1; st.hlTo = 1; st.dirtyCol = true;
    for (const [k, m] of Object.entries(WATERS)) m.emissive.setHex(k === key ? 0x2a6a8a : 0x000000);
    if (!LANDS.includes(key)) st.hlTo = 0;
  }
  function paint() {
    const k = st.hl && LANDS.includes(st.hl) ? masks[st.hl] : null, e = kit.ease(st.hlT), mt = kit.ease(st.map);
    for (let i = 0; i < nv; i++) {
      const j = i * 3;
      let r = lerp(baseR[j], baseM[j], mt), g = lerp(baseR[j + 1], baseM[j + 1], mt), b = lerp(baseR[j + 2], baseM[j + 2], mt);
      if (k) {
        const w = k[i] * e, dim = 1 - 0.35 * e * (1 - k[i]);
        r = lerp(r * dim, C.glow.r, w * 0.55); g = lerp(g * dim, C.glow.g, w * 0.55); b = lerp(b * dim, C.glow.b, w * 0.55);
      }
      col[j] = r; col[j + 1] = g; col[j + 2] = b;
    }
    geo.attributes.color.needsUpdate = true;
  }
  function setMap(on, instant) {
    st.mapTo = on ? 1 : 0;
    if (instant) { st.map = st.mapTo; applyMap(); }
    st.dirtyCol = true;
  }
  function applyMap() {
    const e = kit.ease(st.map);
    land.scale.y = lerp(1, MAPY, e);
    land.position.y = e * 0.02;
    symbols.visible = st.map > 0.85;
    sea.visible = st.map < 0.5;
    terrain.material.roughness = 0.95;
  }
  function globeMode(m) { globeMat.map = m === 'land' ? texLand : m === 'water' ? texWater : texAll; globeMat.needsUpdate = true; }
  const bar = () => `<span style="color:#2f7fd6;letter-spacing:1px">■■■■■■■</span><span style="color:#5aa83f;letter-spacing:1px">■■■</span><br>About <b>7 out of 10</b> parts of Earth's surface are water.`;
  const legend = () => ['#6cb8ec water', '#9ccf6e low land', '#f0dc78 higher land', '#e0a253 high land', '#a86a3c highest land']
    .map(s => { const [c, ...w] = s.split(' '); return `<span style="color:${c}">■</span> ${w.join(' ')}`; }).join(' &nbsp; ') + ' &nbsp; <b style="color:#5a3415">▲</b> mountain top';

  const wide = { radius: 5.2, width: 5.6, yaw: 0.1, pitch: 0.62, target: [0, Y0 + 0.3, 0.2] };
  const close = (x, z, r, y = 0.4, yaw = 0.15, pitch = 0.55) => ({ radius: r, yaw, pitch, target: [x, Y0 + y, z] });

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.quiz = isQuiz; st.flow = false; st.spin = 0;
      stand.visible = i === 6 || isQuiz;
      setMap(false, true); globeMode('all'); pick(null);
      if (i === 0) {
        go(wide); showLabels([]);
        ui.toggle({ label: 'Show the names', value: false, onChange: v => showLabels(v ? ['mountain', 'hill', 'valley', 'plain', 'plateau', 'island', 'ocean', 'river', 'lake', 'pond'] : []) });
      }
      if (i === 1) {
        const sel = k => { pick(k); showLabels([k]); view(k === 'mountain' ? close(-2.4, -1.0, 3.1, 0.7, -0.35, 0.45) : close(0.5, -2.0, 2.0, 0.3, 0.1, 0.55)); };
        ui.buttons([{ label: 'Mountains', on: true, onClick: () => sel('mountain') }, { label: 'Hills', onClick: () => sel('hill') }]);
        pick('mountain'); showLabels(['mountain']); go(close(-2.4, -1.0, 3.1, 0.7, -0.35, 0.45));
      }
      if (i === 2) {
        const sel = k => { pick(k); showLabels(k === 'valley' ? ['valley', 'river'] : ['plain']); view(k === 'valley' ? close(-2.3, -0.4, 2.2, 0.5, -0.9, 0.5) : close(2.0, 0.5, 2.3, 0.1, 0.25, 0.6)); };
        ui.buttons([{ label: 'Valley', on: true, onClick: () => sel('valley') }, { label: 'Plain', onClick: () => sel('plain') }]);
        pick('valley'); showLabels(['valley', 'river']); go(close(-2.3, -0.4, 2.2, 0.5, -0.9, 0.5));
      }
      if (i === 3) {
        const sel = k => { pick(k); showLabels([k]); view(k === 'plateau' ? close(PLAT.x, PLAT.z, 2.0, 0.5, 0.3, 0.45) : close(3.4, -2.8, 2.2, 0.1, 0.5, 0.55)); };
        ui.buttons([{ label: 'Plateau', on: true, onClick: () => sel('plateau') }, { label: 'Island', onClick: () => sel('island') }]);
        pick('plateau'); showLabels(['plateau']); go(close(PLAT.x, PLAT.z, 2.0, 0.5, 0.3, 0.45));
      }
      if (i === 4) {
        st.flow = true;
        const keys = ['ocean', 'river', 'lake', 'pond'];
        const row = ui.buttons(keys.map((k, j) => ({ label: k[0].toUpperCase() + k.slice(1), on: j === 1, onClick: () => { pick(k); showLabels([k]); } })));
        row.select(1); pick('river'); showLabels(['river', 'ocean']);
        go({ ...wide, radius: 4.8, pitch: 0.75 });
      }
      if (i === 5) {
        setMap(true, false); showLabels(['mountain', 'hill', 'river', 'lake', 'plateau', 'ocean']);
        ui.toggle({ label: 'Map view', value: true, onChange: v => { setMap(v); view(v ? { radius: 5.2, width: 5.4, yaw: 0, pitch: 1.35, target: [0, Y0, 0] } : wide); } });
        ui.readout(legend());
        go({ radius: 5.2, width: 5.4, yaw: 0, pitch: 1.35, target: [0, Y0, 0] });
      }
      if (i === 6) {
        st.spin = 0.25; showLabels(['globe']);
        ui.buttons([{ label: 'Land', onClick: () => globeMode('land') }, { label: 'Water', onClick: () => globeMode('water') }, { label: 'Both', on: true, onClick: () => globeMode('all') }]);
        ui.readout(bar());
        go({ radius: 1.6, yaw: -0.25, pitch: 0.2, target: [GL.x, GL.y, GL.z] });
      }
      if (isQuiz) { showLabels(['mountain', 'plateau', 'ocean']); go({ ...wide, yaw: -0.25 }); }
    },
    update(dt) {
      let busy = false;
      if (st.map !== st.mapTo) { st.map = st.mapTo > st.map ? Math.min(st.mapTo, st.map + dt / 1.2) : Math.max(st.mapTo, st.map - dt / 1.2); applyMap(); st.dirtyCol = true; busy = true; }
      if (st.hlT !== st.hlTo) { st.hlT = st.hlTo > st.hlT ? Math.min(st.hlTo, st.hlT + dt / 0.6) : Math.max(st.hlTo, st.hlT - dt / 0.6); st.dirtyCol = true; busy = true; }
      if (st.dirtyCol) { paint(); st.dirtyCol = false; busy = true; }
      if (st.flow) { flowTex.offset.x -= dt * 0.6; busy = true; }
      if (st.spin) { globe.rotation.y += dt * st.spin; busy = true; }
      return busy;
    },
  };
}
