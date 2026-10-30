// Erosion: a sand-table landscape whose height map changes with "years passing". A river carves
// its valley and builds a delta, waves wear a cliff back, wind moves dunes, a landslide happens in a
// moment, and two test trays show how plant roots hold soil in the rain.

const W = 12, D = 8, NX = 96, NZ = 64;   // main sand table (x across, z front-back), grid cells
const Y0 = 0.75;                         // table group height: local y = 0 is sea level
const X_SPRING = -5.4;                   // where the river starts
const TRAY = { w: 2.0, d: 2.4, nx: 24, nz: 30, xs: [-10.7, -8.0] };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const coastX = z => 3.1 + 0.35 * Math.sin(0.9 * z + 0.5);
const zr = x => 0.35 + 0.85 * Math.sin(0.72 * x + 0.9);           // river centre line
const zrd = x => 0.85 * 0.72 * Math.cos(0.72 * x + 0.9);
const noise = (x, z) => 0.5 * Math.sin(1.3 * x + 0.7 * z) * Math.sin(0.9 * z - 0.4 * x + 1)
  + 0.3 * Math.sin(2.7 * x + 1.9 * z + 2) * Math.sin(1.7 * z + 0.3) + 0.15 * Math.sin(4.1 * x - 3.3 * z);

// Where the river meets the sea (found once).
const XM = (() => { let lo = 1, hi = 5; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (m - coastX(zr(m)) + 0.15 < 0) lo = m; else hi = m; } return lo; })();
const ZM = zr(XM);
const SLIDE = { x: -2.9, z: zr(-2.9) - 0.8, toe: zr(-2.9) - 0.2 };

// Shared state the height function reads: T river years, C cliff years, O dune shift, S landslide.
const P = { T: 0, C: 0, O: 0, S: 0 };
const info = { dep: 0, dune: 0, river: 0, slide: 0 };

function height(x, z) {
  const slope = zrd(x), dRiver = Math.abs(z - zr(x)) / Math.sqrt(1 + slope * slope);
  const up = ss(2.4, -5.6, x);
  const quiet = 0.35 + 0.65 * ss(0.1, 1.3, dRiver);
  const n = noise(x, z);
  let land = 0.22 + 2.0 * up + 0.3 * up * ss(-1.5, -4, z) + (0.06 + 0.32 * up) * n * quiet;
  const cl = ss(-1.4, -2.2, z);                                  // 1 on the cliff coast
  land = Math.max(land, cl * (0.95 + 0.05 * n) * ss(-4.5, -1.6, x));
  // Dunes: a sandy strip behind the beach with ridges that creep inland as O grows.
  const dm = ss(1.75, 2.2, z) * ss(4.2, 3.85, z) * ss(-0.9, -0.2, x) * ss(2.9, 2.4, x);
  info.dune = dm;
  if (dm > 0) {
    const ph = (x + P.O) * 1.15 + 0.3 * Math.sin(z * 1.9), s = ph - Math.floor(ph);
    const prof = s < 0.22 ? ss(0, 0.22, s) : 1 - ss(0.22, 1, s);  // steep side faces inland
    land = lerp(land, 0.14 + 0.3 * prof * (0.8 + 0.2 * Math.sin(z * 2.3 + 1)), dm);
  }
  // River valley: the bed sinks with time and the valley widens.
  info.river = 0;
  if (x > X_SPRING - 0.4) {
    const base = 0.22 + 2.0 * up;
    const bed = base * (0.86 - 0.44 * P.T) - 0.03;
    const w = 0.2 + P.T * (0.3 + 0.65 * up), rw = 0.08;
    let v = dRiver < rw ? 1 : dRiver > w ? 0 : Math.pow(1 - (dRiver - rw) / (w - rw), 1.5);
    v *= ss(X_SPRING - 0.4, X_SPRING + 0.4, x);
    info.river = v;
    land -= v * Math.max(0, land - bed);
  }
  // Landslide: a scar on the valley side and a heap of rock at its foot.
  info.slide = 0;
  if (P.S > 0) {
    const scar = Math.exp(-(((x - SLIDE.x) / 0.45) ** 2 + ((z - SLIDE.z + 0.1) / 0.4) ** 2));
    const toe = Math.exp(-(((x - SLIDE.x) / 0.6) ** 2 + ((z - SLIDE.toe) / 0.3) ** 2));
    land += P.S * (0.24 * toe - 0.5 * scar);
    info.slide = P.S * Math.max(scar, toe);
  }
  // Coast: a gentle beach, or a steep cliff that wears back as C grows.
  const xc0 = coastX(z);
  const xc = xc0 - cl * P.C * 0.95 * (0.75 + 0.45 * Math.sin(2.3 * z) ** 2);
  const dd = x - xc;
  const fall = lerp(ss(-1.2, 0.5, dd), ss(-0.05, 0.05, dd), cl);
  const sea = lerp(-0.35 - 0.25 * ss(0, 2, dd), -0.05 - 0.32 * ss(xc0, xc0 + 0.8, x), cl);
  let h = lerp(land, sea, fall);
  // Delta: a fan of sand that grows out into the sea at the river mouth.
  info.dep = 0;
  if (x > XM - 0.3) {
    const dx = x - XM, dz = z - ZM, r = Math.hypot(dx * 0.9, dz), ang = Math.atan2(dz, dx);
    const R = (0.2 + 1.5 * P.T) * (0.85 + 0.2 * Math.cos(5 * ang));
    const fan = lerp(0.07, -0.5, ss(0.55 * R, 1.15 * R, r)) - 0.04 * Math.exp(-((dz / 0.06) ** 2)) * ss(0.2 * R, 0.5 * R, r) * (r < R ? 1 : 0);
    if (fan > h) { info.dep = fan - h; h = fan; }
  }
  return h;
}

// Test trays: the same slope, bare or planted; E is how much rain has fallen on it.
function trayHeight(x, z, E) {
  const base = 0.5 + 0.85 * ss(1.1, -1.2, z);
  let g = 0;
  for (let k = 0; k < 3; k++) { const gx = -0.55 + k * 0.58 + 0.06 * Math.sin(3 * z + k); g += Math.exp(-(((x - gx) / 0.1) ** 2)); }
  const m = ss(-1.1, 0.3, z) * (1 - ss(0.7, 1.15, z));
  return base - E * (0.05 + 0.42 * g * m) + E * 0.18 * ss(0.75, 1.15, z);
}

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xbfe0a8, sky: 0xdcefff, radius: 22 });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa6b8, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-4, 10, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -13, right: 8, top: 8, bottom: -8, near: 0.5, far: 40 });
  scene.add(sun);
  const C = h => new THREE.Color(h);

  // ---------- Main sand table ----------
  const table = new THREE.Group();
  table.position.y = Y0;
  scene.add(table);
  const field = makeField(THREE, { w: W, d: D, nx: NX, nz: NZ, bottom: -Y0, water: true });
  table.add(field.mesh, field.skirt, field.waterSkirt);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x3f8fd2, transparent: true, opacity: 0.62, roughness: 0.15, depthWrite: false }));
  sea.rotation.x = -Math.PI / 2;
  sea.renderOrder = 1;
  table.add(sea);
  kit.mesh(new THREE.BoxGeometry(W + 0.3, 0.12, D + 0.3), kit.mat(0x8b5e3c), [0, -Y0 + 0.06, 0], table).receiveShadow = true;

  const cols = {
    seabed: C(0xd2bf8c), deep: C(0x7f9e98), sand: C(0xead69c), grass: C(0x8cc964), forest: C(0x5f9e48),
    high: C(0x8f9370), peak: C(0xb3a993), rockA: C(0xb88a60), rockB: C(0x9a6c4a), mud: C(0xa98a62), duneDark: C(0xc9a35e), scar: C(0x8b5a33),
  };
  const tmp = C(0xffffff);
  function colorMain(h, slope, dep, dune, river, slide) {
    if (h < -0.02) return tmp.copy(cols.seabed).lerp(cols.deep, ss(-0.05, -0.5, h));
    if (dune > 0.5) return tmp.copy(cols.sand).lerp(cols.duneDark, ss(0.25, 0.7, slope));
    if (dep > 0.005 || h < 0.11) return tmp.copy(cols.sand);
    if (slide > 0.25) return tmp.copy(cols.scar);
    tmp.copy(cols.grass).lerp(cols.forest, ss(0.5, 1.0, h)).lerp(cols.high, ss(1.3, 1.8, h)).lerp(cols.peak, ss(1.9, 2.3, h));
    if (river > 0.85) tmp.lerp(cols.mud, 0.35);
    const steep = ss(0.9, 1.6, slope);
    if (steep > 0) tmp.lerp(Math.floor((h + 2) * 7) % 2 ? cols.rockA : cols.rockB, steep);
    return tmp;
  }
  field.fill(height, colorMain);

  // River water: a ribbon along the centre line that sits on the bed.
  const SEG = 90;
  const ribPos = new Float32Array((SEG + 1) * 2 * 3), riverY = new Float32Array(SEG + 1), riverX = new Float32Array(SEG + 1);
  const ribGeo = new THREE.BufferGeometry();
  ribGeo.setAttribute('position', new THREE.BufferAttribute(ribPos, 3));
  const ribIdx = [];
  for (let i = 0; i < SEG; i++) { const a = i * 2; ribIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  ribGeo.setIndex(ribIdx);
  const ribNorm = new Float32Array((SEG + 1) * 2 * 3);
  for (let i = 0; i < ribNorm.length; i += 3) ribNorm[i + 1] = 1;
  ribGeo.setAttribute('normal', new THREE.BufferAttribute(ribNorm, 3));
  const riverMat = new THREE.MeshStandardMaterial({ color: 0x3d8fd6, roughness: 0.2, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const ribbon = new THREE.Mesh(ribGeo, riverMat);
  ribbon.frustumCulled = false;
  ribbon.renderOrder = 2;
  table.add(ribbon);
  function updateRiver() {
    const xEnd = XM + 0.55 * (0.2 + 1.5 * P.T);
    for (let i = 0; i <= SEG; i++) {
      const x = lerp(X_SPRING, xEnd, i / SEG), z = zr(x), s = zrd(x), len = Math.sqrt(1 + s * s);
      const y = Math.max(0.005, height(x, z)) + 0.025;
      const w = (0.05 + 0.07 * (i / SEG) + 0.03 * P.T) * (i === 0 ? 0.3 : 1);
      const nx = -s / len * w, nz = 1 / len * w;
      riverY[i] = y; riverX[i] = x;
      const o = i * 6;
      ribPos[o] = x - nx; ribPos[o + 1] = y; ribPos[o + 2] = z - nz;
      ribPos[o + 3] = x + nx; ribPos[o + 4] = y; ribPos[o + 5] = z + nz;
    }
    ribGeo.attributes.position.needsUpdate = true;
  }

  // ---------- Particles: rain, runoff, river flow, blown sand, sea spray ----------
  const dot = dotTexture(THREE);
  const points = (n, color, size) => {
    const arr = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: dot, transparent: true, depthWrite: false, alphaTest: 0.05 }));
    p.frustumCulled = false; p.arr = arr; p.n = n;
    return p;
  };
  const RAIN_N = 500;
  const rainArr = new Float32Array(RAIN_N * 6), rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainArr, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x5a86b0, transparent: true, opacity: 0.7 }));
  rain.frustumCulled = false;
  scene.add(rain);
  const runoff = points(160, 0x8a5a2b, 0.07); table.add(runoff);
  const flow = points(110, 0xdff2ff, 0.06); table.add(flow);
  const sand = points(160, 0xd8b56c, 0.07); table.add(sand);
  const spray = points(60, 0xffffff, 0.08); table.add(spray);

  // Waves rolling toward the cliff.
  const waveMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, roughness: 0.3 });
  const waveGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.3, 8, 1, false, 0, Math.PI);
  waveGeo.rotateX(Math.PI / 2);
  waveGeo.scale(1, 0.45, 1);
  const waves = [0, 1, 2].map(() => { const m = new THREE.Mesh(waveGeo, waveMat.clone()); table.add(m); return m; });
  // Fallen rocks at the foot of the cliff.
  const rockGeo = new THREE.DodecahedronGeometry(0.07, 0);
  const rockMat = kit.mat(0x9a7b5f, { flatShading: true });
  const boulders = Array.from({ length: 14 }, (_, i) => {
    const z = -3.8 + rand(i) * 2.2, f = 0.08 + rand(i + 20) * 0.85;
    const m = kit.mesh(rockGeo, rockMat, [0, 0, 0], table);
    m.scale.setScalar(0.7 + rand(i + 40) * 0.8);
    m.rotation.set(rand(i + 1) * 3, rand(i + 2) * 3, 0);
    m.z0 = z; m.f = f; m.r = rand(i + 80);
    return m;
  });
  function placeBoulders() {
    for (const b of boulders) {
      const k = 0.75 + 0.45 * Math.sin(2.3 * b.z0) ** 2, xc0 = coastX(b.z0);
      b.visible = P.C > b.f + 0.03;
      b.position.set(xc0 - b.f * 0.95 * k + 0.08 + b.r * 0.1, -0.02, b.z0);
    }
  }
  // Landslide rocks tumbling down.
  const slideRocks = Array.from({ length: 10 }, (_, i) => { const m = kit.mesh(rockGeo, rockMat, [0, 0, 0], table); m.scale.setScalar(1.6 + rand(i + 60) * 1.4); m.visible = false; return m; });

  // ---------- Test trays: bare slope and planted slope ----------
  const trays = TRAY.xs.map((tx, k) => {
    const planted = k === 1;
    const g = new THREE.Group();
    g.position.set(tx, 0, 0);
    scene.add(g);
    const f = makeField(THREE, { w: TRAY.w, d: TRAY.d, nx: TRAY.nx, nz: TRAY.nz, bottom: 0 });
    g.add(f.mesh, f.skirt);
    const wood = kit.mat(0xa47148);
    kit.mesh(new THREE.BoxGeometry(0.08, 1.55, TRAY.d + 0.08), wood, [-TRAY.w / 2 - 0.04, 0.775, 0], g);
    kit.mesh(new THREE.BoxGeometry(0.08, 1.55, TRAY.d + 0.08), wood, [TRAY.w / 2 + 0.04, 0.775, 0], g);
    kit.mesh(new THREE.BoxGeometry(TRAY.w + 0.16, 1.55, 0.08), wood, [0, 0.775, -TRAY.d / 2 - 0.04], g);
    // Catch basin in front collects the water that runs off.
    const basin = new THREE.Group();
    basin.position.set(0, 0, TRAY.d / 2 + 0.25);
    g.add(basin);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(TRAY.w, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.3, depthWrite: false }));
    glass.position.y = 0.2;
    basin.add(glass);
    const water = kit.mesh(new THREE.BoxGeometry(TRAY.w - 0.04, 1, 0.36), new THREE.MeshStandardMaterial({ color: 0x6f9fc4, roughness: 0.3 }), [0, 0, 0], basin);
    water.castShadow = false;
    const soil = C(0x8a6440), soilTop = C(0x9b7448), green = C(0x6fb24f);
    const color = (h, slope) => (planted ? tmp.copy(green).lerp(soil, ss(0.6, 1.4, slope) * 0.5) : tmp.copy(soilTop).lerp(soil, ss(0.4, 1.2, slope)));
    const t = { g, f, planted, E: 0, level: 0, water, color, tufts: null };
    t.hfn = (x, z) => trayHeight(x, z, t.E);
    if (planted) {
      const tuftGeo = new THREE.ConeGeometry(0.035, 0.13, 4);
      const tufts = new THREE.InstancedMesh(tuftGeo, kit.mat(0x3f8f35, { flatShading: true }), 240);
      tufts.spots = Array.from({ length: 240 }, (_, i) => [(rand(i + 300) - 0.5) * (TRAY.w - 0.1), (rand(i + 700) - 0.5) * (TRAY.d - 0.1)]);
      g.add(tufts);
      t.tufts = tufts;
      for (let i = 0; i < 4; i++) {
        const b = kit.mesh(new THREE.IcosahedronGeometry(0.16, 0), kit.mat(0x4c9a3e, { flatShading: true }), [-0.6 + i * 0.42, 0, -0.75 + (i % 2) * 0.7], g);
        b.spot = [b.position.x, b.position.z];
        (t.bushes ||= []).push(b);
      }
      // Roots seen through the cut face at the front.
      const rootMat = kit.mat(0x5b3a1f);
      for (let i = 0; i < 7; i++) {
        const x = -0.85 + i * 0.28, top = trayHeight(x, TRAY.d / 2, 0);
        const r = kit.mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.3, 5), rootMat, [x, top - 0.16, TRAY.d / 2 + 0.006], g);
        r.rotation.z = (rand(i + 90) - 0.5) * 0.5;
        const r2 = kit.mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.18, 5), rootMat, [x + 0.05, top - 0.25, TRAY.d / 2 + 0.007], g);
        r2.rotation.z = -0.8;
      }
    }
    return t;
  });
  const m4 = new THREE.Matrix4();
  function fillTray(t) {
    t.f.fill(t.hfn, t.color);
    if (t.tufts) {
      const m = m4;
      t.tufts.spots.forEach(([x, z], i) => { m.makeTranslation(x, trayHeight(x, z, t.E) + 0.05, z); t.tufts.setMatrixAt(i, m); });
      t.tufts.instanceMatrix.needsUpdate = true;
      t.bushes.forEach(b => { b.position.y = trayHeight(b.spot[0], b.spot[1], t.E) + 0.1; });
    }
  }
  trays.forEach(fillTray);
  const trayMud = points(90, 0x7a4d24, 0.06), trayClear = points(30, 0xbfe2ff, 0.05);
  trays[0].g.add(trayMud); trays[1].g.add(trayClear);

  // ---------- Labels ----------
  const L = (text, x, y, z, cls) => { const l = label(text, new THREE.Vector3(x, y, z), { cls }); l.show(false); return l; };
  const tags = {
    river: L('River', -1.2, Y0 + 0.75, zr(-1.2)),
    valley: L('Valley', -3.6, Y0 + 1.9, zr(-3.6)),
    delta: L('Delta', XM + 0.9, Y0 + 0.35, ZM, 'warm'),
    sea: L('Sea', 5, Y0 + 0.2, 0.5, 'cool'),
    cliff: L('Cliff', 2.4, Y0 + 1.35, -2.6, 'warm'),
    dunes: L('Dunes', 1.1, Y0 + 0.75, 3.1, 'warm'),
    bare: L('Bare soil', TRAY.xs[0], 1.75, -0.6),
    planted: L('Grass and bushes', TRAY.xs[1], 1.75, -0.6),
    slide: L('Landslide', SLIDE.x, Y0 + 1.75, SLIDE.z - 0.2),
  };

  // ---------- State and update helpers ----------
  const st = { lastO: 0, step: 0, time: 0, auto: false, quiz: false, raining: 0, rainOn: false, wind: false, windAmt: 0, slideT: -1, slow: 0, slider: null, dirty: true, trayRain: false, msg: '' };
  let rainBox = { x: -3, z: 0, y: Y0, hx: 3.2, hz: 4, top: 3.6 };
  const fmtYears = v => (v < 0.04 ? 'start' : v < 0.3 ? 'hundreds of years' : v < 0.7 ? 'thousands of years' : 'many thousands of years');
  const muddy = C(0x9a6a3a), clear = C(0x3d8fd6), foam = C(0xdff2ff);

  function rebuild() {
    field.fill(height, colorMain);
    updateRiver();
    placeBoulders();
    st.dirty = false;
  }
  function setYears(key, v) { P[key] = v; st.dirty = true; }

  function readout() {
    if (st.quiz) return;
    let msg = '';
    if (st.step === 0) msg = st.rainOn ? 'Rain is falling. Muddy water runs into the river.' : 'No rain. The river water is clear.';
    if (st.step === 1 || st.step === 2) msg = `Years passing: <b>${fmtYears(P.T)}</b>`;
    if (st.step === 3) msg = `Years passing: <b>${fmtYears(P.C)}</b>`;
    if (st.step === 4) msg = st.wind ? 'The wind blows from the sea. Sand is moving.' : 'The wind has stopped. The sand stays still.';
    if (st.step === 5) {
      const bar = (v, c) => `<span style="display:inline-block;vertical-align:middle;height:10px;border-radius:5px;background:${c};width:${Math.round(4 + v * 120)}px"></span>`;
      msg = `Soil washed off<br>Bare: ${bar(trays[0].E, '#8a5a2b')}<br>Planted: ${bar(trays[1].E, '#5a9a3e')}`;
    }
    if (st.step === 6) msg = st.slideT >= 0 && st.slideT < 2 ? 'Landslide! The hillside changes in seconds.' : st.slow > 0 ? `Years passing: <b>${fmtYears(P.T)}</b>` : 'Fast or slow? Try both buttons.';
    if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
  }

  const views = {
    all: { radius: 6.6, yaw: 0.12, pitch: 0.6, target: [-0.3, Y0 + 0.3, 0] },
    hills: { radius: 4.4, yaw: 0.3, pitch: 0.55, target: [-2.6, Y0 + 0.8, 0] },
    valley: { radius: 3.6, yaw: 0.75, pitch: 0.5, target: [-2.8, Y0 + 0.9, 0] },
    delta: { radius: 2.3, yaw: 0.35, pitch: 0.75, target: [3.6, Y0 + 0.05, 0.5] },
    cliff: { radius: 2.2, yaw: 1.2, pitch: 0.28, target: [2.6, Y0 + 0.35, -2.6] },
    dunes: { radius: 1.6, yaw: 0.5, pitch: 0.38, target: [1.1, Y0 + 0.2, 3.0] },
    trays: { radius: 2.7, yaw: 0, pitch: 0.55, target: [(TRAY.xs[0] + TRAY.xs[1]) / 2, 0.55, 0.2] },
    slide: { radius: 2.6, yaw: 0.2, pitch: 0.42, target: [-2.9, Y0 + 1.0, -0.8] },
  };

  function resetWorld(T = 0.25) {
    P.T = T; P.C = 0.15; P.O = 0; P.S = 0;
    st.slideT = -1; st.slow = 0; st.wind = false; st.rainOn = false; st.trayRain = false;
    slideRocks.forEach(r => { r.visible = false; });
    st.dirty = true;
  }
  const startRain = (box) => { rainBox = box; st.rainOn = true; };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.quiz = isQuiz; st.time = 0; st.auto = true; st.msg = ''; st.slider = null;
      Object.values(tags).forEach(t => t.show(false));
      resetWorld(i === 1 || i === 2 ? 0 : i === 6 ? 0.35 : 0.3);
      if (i === 0) {
        go(views.hills);
        tags.river.show(true);
        ui.buttons([
          { label: 'Make it rain', onClick: () => { st.auto = false; startRain({ x: -3, z: 0, y: Y0, hx: 3.2, hz: 4, top: 3.6 }); } },
          { label: 'Stop the rain', onClick: () => { st.auto = false; st.rainOn = false; } },
        ]);
      }
      if (i === 1 || i === 2) {
        go(i === 1 ? views.valley : views.delta);
        if (i === 1) { tags.valley.show(true); tags.river.show(true); } else { tags.delta.show(true); tags.sea.show(true); }
        st.slider = ui.slider({ label: 'Years passing', min: 0, max: 1, step: 0.01, value: 0, format: fmtYears, onInput: v => { st.auto = false; setYears('T', v); } });
      }
      if (i === 3) {
        go(views.cliff);
        tags.cliff.show(true);
        P.C = 0;
        st.slider = ui.slider({ label: 'Years passing', min: 0, max: 1, step: 0.01, value: 0, format: fmtYears, onInput: v => { st.auto = false; setYears('C', v); } });
      }
      if (i === 4) {
        go(views.dunes);
        tags.dunes.show(true);
        ui.buttons([
          { label: 'Blow the wind', onClick: () => { st.auto = false; st.wind = true; } },
          { label: 'Stop the wind', onClick: () => { st.auto = false; st.wind = false; } },
        ]);
      }
      if (i === 5) {
        go(views.trays);
        tags.bare.show(true); tags.planted.show(true);
        trays.forEach(t => { t.E = 0; t.level = 0; fillTray(t); });
        const trayBox = { x: (TRAY.xs[0] + TRAY.xs[1]) / 2, z: 0, y: 0, hx: 2.4, hz: 1.3, top: 2.6 };
        ui.buttons([
          { label: 'Make it rain', onClick: () => { st.auto = false; st.trayRain = true; startRain(trayBox); } },
          { label: 'Start again', onClick: () => { st.auto = false; st.trayRain = false; st.rainOn = false; trays.forEach(t => { t.E = 0; t.level = 0; fillTray(t); }); } },
        ]);
        st.trayBox = trayBox;
      }
      if (i === 6) {
        go(views.slide);
        tags.slide.show(true);
        const fire = () => { if (st.slideT < 0 || st.slideT > 2) { P.S = 0; st.slideT = 0; st.dirty = true; } };
        ui.buttons([
          { label: 'Landslide', onClick: () => { st.auto = false; fire(); } },
          { label: 'Many years', onClick: () => { st.auto = false; st.slow = 1; } },
        ]);
        st.fire = fire;
      }
      if (isQuiz) {
        st.auto = false;
        resetWorld(0.6);
        P.C = 0.6;
        go({ ...views.all, yaw: -0.15 });
        tags.river.show(true); tags.sea.show(true);
      }
      readout();
    },

    update(dt, t) {
      st.time += dt;
      let moving = false;
      // Scripted demos until the learner takes over.
      if (st.auto && !st.quiz) {
        if (st.step === 0 && st.time > 0.3 && !st.rainOn) startRain({ x: -3, z: 0, y: Y0, hx: 3.2, hz: 4, top: 3.6 });
        if (st.step >= 1 && st.step <= 3) {
          const v = kit.clamp((st.time - 0.4) / 5, 0, 1), key = st.step === 3 ? 'C' : 'T';
          if (v !== P[key]) { setYears(key, v); st.slider?.set(v); }
        }
        if (st.step === 4 && st.time > 0.3) st.wind = true;
        if (st.step === 5 && st.time > 0.3 && !st.trayRain) { st.trayRain = true; startRain(st.trayBox); }
        if (st.step === 6 && st.time > 0.6 && st.slideT < 0) st.fire();
      }

      // Rain fades in and out; the river turns muddy while it rains.
      moving = kit.follow(st, 'raining', st.rainOn ? 1 : 0, dt, 2) || moving;
      riverMat.color.copy(clear).lerp(muddy, st.step === 5 ? 0 : st.raining * 0.85);
      const nR = Math.floor(st.raining * RAIN_N);
      rain.visible = nR > 0;
      if (nR) {
        moving = true;
        for (let k = 0; k < nR; k++) {
          const y = rainBox.y + rainBox.top - ((t * 6 + rand(k) * rainBox.top) % rainBox.top);
          const x = rainBox.x + (rand(k + 900) * 2 - 1) * rainBox.hx, z = rainBox.z + (rand(k + 1900) * 2 - 1) * rainBox.hz;
          const o = k * 6;
          rainArr[o] = x; rainArr[o + 1] = y; rainArr[o + 2] = z; rainArr[o + 3] = x; rainArr[o + 4] = y + 0.22; rainArr[o + 5] = z;
        }
        rainGeo.setDrawRange(0, nR * 2);
        rainGeo.attributes.position.needsUpdate = true;
      }

      // Runoff: muddy water trickles down the hillsides toward the river.
      runoff.visible = st.step === 0 && st.raining > 0.05;
      if (runoff.visible) {
        runoff.material.opacity = st.raining;
        for (let k = 0; k < runoff.n; k++) {
          const p = (t * 0.3 + rand(k + 50)) % 1, x0 = -5.3 + rand(k + 150) * 4.6, side = rand(k + 250) > 0.5 ? 1 : -1;
          const x = x0 + p * 0.5, z0 = zr(x0) + side * (0.7 + rand(k + 350) * 2.4);
          const z = lerp(z0, zr(x), p * p);
          runoff.arr.set(sampleXYZ(x, z, 0.04), k * 3);
        }
        runoff.geometry.attributes.position.needsUpdate = true;
      }
      // Flow along the river.
      flow.material.color.copy(st.raining > 0.3 && st.step !== 5 ? muddy : foam);
      for (let k = 0; k < flow.n; k++) {
        const u = (t * (0.05 + 0.03 * rand(k)) + rand(k + 500)) % 1, f = u * SEG, i0 = Math.floor(f), a = f - i0;
        const x = lerp(riverX[i0], riverX[Math.min(SEG, i0 + 1)], a), y = lerp(riverY[i0], riverY[Math.min(SEG, i0 + 1)], a) + 0.01;
        const o = k * 3;
        flow.arr[o] = x; flow.arr[o + 1] = y; flow.arr[o + 2] = zr(x) + (rand(k + 800) - 0.5) * 0.06;
      }
      flow.geometry.attributes.position.needsUpdate = true;

      // Wind and dunes.
      moving = kit.follow(st, 'windAmt', st.wind ? 1 : 0, dt, 2.5) || moving;
      sand.visible = st.windAmt > 0.05;
      if (st.windAmt > 0.01) {
        P.O += dt * 0.16 * st.windAmt;
        if (Math.abs(P.O - st.lastO) > 0.015) { st.lastO = P.O; st.dirty = true; }  // dunes creep slowly: ~10 rebuilds a second is plenty
        sand.material.opacity = st.windAmt;
        for (let k = 0; k < sand.n; k++) {
          const p = (t * (0.35 + 0.2 * rand(k)) + rand(k + 60)) % 1;
          const x = lerp(3.1, -0.3, p), z = 2.2 + rand(k + 160) * 1.8;
          sand.arr.set(sampleXYZ(x, z, 0.04 + Math.abs(Math.sin(p * 25 + k)) * 0.12), k * 3);
        }
        sand.geometry.attributes.position.needsUpdate = true;
      }

      // Waves always roll in at the cliff; spray when they hit.
      const showWaves = st.step === 3 || st.step === 4 || st.quiz || st.step === 2;
      waves.forEach((w, k) => {
        w.visible = showWaves;
        if (!showWaves) return;
        const ph = (t * 0.32 + k / 3) % 1, xc = coastX(-2.7) - P.C * 0.95 * 0.9;
        w.position.set(lerp(5.8, xc + 0.25, ph), -0.012, -2.7);
        w.material.opacity = 0.6 * ss(0, 0.15, ph) * (1 - ss(0.88, 1, ph));
        w.scale.y = 0.8 + 0.6 * ph;
      });
      spray.visible = showWaves;
      if (showWaves) {
        moving = true;
        for (let k = 0; k < spray.n; k++) {
          const wk = k % 3, ph = (t * 0.32 + wk / 3) % 1, a = ss(0.86, 1, ph);
          const z = -3.8 + rand(k + 70) * 2.3, xc = coastX(z) - (z < -1.5 ? P.C * 0.95 * (0.75 + 0.45 * Math.sin(2.3 * z) ** 2) : 0);
          const o = k * 3;
          spray.arr[o] = xc + 0.1 + rand(k + 170) * 0.15 * a; spray.arr[o + 1] = a > 0 ? 0.05 + Math.sin(a * Math.PI) * (0.25 + rand(k) * 0.3) : -5; spray.arr[o + 2] = z;
        }
        spray.geometry.attributes.position.needsUpdate = true;
      }

      // Landslide: fast. "Many years": slow river work.
      if (st.slideT >= 0 && st.slideT < 2.5) {
        st.slideT += dt;
        const s = ss(0, 1.3, st.slideT);
        if (s !== P.S) { P.S = s; st.dirty = true; }
        slideRocks.forEach((r, k) => {
          const p = kit.clamp((st.slideT - k * 0.06) / 1.2, 0, 1);
          r.visible = p > 0 && p < 1 || st.slideT < 2.5;
          const x = SLIDE.x + (rand(k + 10) - 0.5) * 0.7, z = lerp(SLIDE.z - 0.2, SLIDE.toe + (rand(k + 30) - 0.5) * 0.3, p);
          r.position.copy(sampleVec(x, z, 0.06 + Math.abs(Math.sin(p * 9 + k)) * 0.12 * (1 - p)));
          r.rotation.x += dt * 8 * (1 - p);
        });
        moving = true;
      }
      if (st.slow > 0 && P.T < 1) { setYears('T', Math.min(1, P.T + dt * 0.12)); moving = true; }

      // Test trays: the bare slope washes away about ten times faster than the planted one.
      if (st.step === 5) {
        trayMud.visible = trayClear.visible = st.raining > 0.05;
        if (st.trayRain && st.raining > 0.3) {
          for (const tr of trays) { tr.E = Math.min(1, tr.E + dt * 0.22 * (tr.planted ? 0.1 : 1)); tr.level = Math.min(1, tr.level + dt * (tr.planted ? 0.06 : 0.1)); fillTray(tr); }
          moving = true;
        }
        for (const tr of trays) {
          const lv = 0.02 + tr.level * 0.3;
          tr.water.scale.y = lv; tr.water.position.y = lv / 2 + 0.02;
          tr.water.material.color.copy(clear).lerp(muddy, tr.planted ? 0.15 : 0.15 + 0.75 * Math.min(1, tr.E * 2));
        }
        if (trayMud.visible) {
          for (let k = 0; k < trayMud.n; k++) {
            const p = (t * 0.45 + rand(k + 11)) % 1, gx = -0.55 + (k % 3) * 0.58, z = lerp(-1.0, 1.15, p), x = gx + 0.06 * Math.sin(3 * z + (k % 3)) + (rand(k) - 0.5) * 0.06;
            const o = k * 3;
            trayMud.arr[o] = x; trayMud.arr[o + 1] = trayHeight(x, z, trays[0].E) + 0.03; trayMud.arr[o + 2] = z;
          }
          trayMud.geometry.attributes.position.needsUpdate = true;
          for (let k = 0; k < trayClear.n; k++) {
            const p = (t * 0.3 + rand(k + 21)) % 1, x = (rand(k + 31) - 0.5) * 1.8, z = lerp(0.2, 1.15, p), o = k * 3;
            trayClear.arr[o] = x; trayClear.arr[o + 1] = trayHeight(x, z, trays[1].E) + 0.04; trayClear.arr[o + 2] = z;
          }
          trayClear.geometry.attributes.position.needsUpdate = true;
        }
      } else trayMud.visible = trayClear.visible = false;

      if (st.dirty) { rebuild(); moving = true; }
      readout();
      return moving || st.raining > 0;
    },
  };

  function sampleXYZ(x, z, lift) { const a = sampleXYZ.a || (sampleXYZ.a = [0, 0, 0]); a[0] = x; a[1] = Math.max(0, field.sample(x, z)) + lift; a[2] = z; return a; }
  function sampleVec(x, z, lift) { const v = sampleVec.v || (sampleVec.v = new THREE.Vector3()); return v.set(x, field.sample(x, z) + lift, z); }
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function dotTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.6, 'rgba(255,255,255,0.85)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

// A height-map block: top surface with vertex colours, side walls down to `bottom`, and (optionally)
// clear water walls where the surface dips below sea level (y = 0). fill(heightFn, colorFn) rebuilds it.
function makeField(THREE, { w, d, nx, nz, bottom, water = false }) {
  const geo = new THREE.PlaneGeometry(w, d, nx, nz);
  geo.rotateX(-Math.PI / 2);
  const n = (nx + 1) * (nz + 1), pos = geo.attributes.position;
  const H = new Float32Array(n), col = new Float32Array(n * 3);
  const DEP = new Float32Array(n), DUNE = new Float32Array(n), RIV = new Float32Array(n), SLD = new Float32Array(n); // extra info for colours
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.castShadow = mesh.receiveShadow = true;
  const id = (iz, ix) => iz * (nx + 1) + ix;
  // Edge rings: front, right, back, left, each with an outward normal.
  const edges = [
    { list: Array.from({ length: nx + 1 }, (_, i) => id(nz, i)), nrm: [0, 0, 1] },
    { list: Array.from({ length: nz + 1 }, (_, i) => id(nz - i, nx)), nrm: [1, 0, 0] },
    { list: Array.from({ length: nx + 1 }, (_, i) => id(0, nx - i)), nrm: [0, 0, -1] },
    { list: Array.from({ length: nz + 1 }, (_, i) => id(i, 0)), nrm: [-1, 0, 0] },
  ];
  const wall = (color, opts = {}) => {
    const count = edges.reduce((s, e) => s + e.list.length * 2, 0);
    const p = new Float32Array(count * 3), nm = new Float32Array(count * 3), idx = [];
    let v = 0;
    for (const e of edges) {
      for (let k = 0; k < e.list.length; k++) {
        const j = e.list[k];
        for (let s = 0; s < 2; s++) { p[(v + s) * 3] = pos.getX(j); p[(v + s) * 3 + 2] = pos.getZ(j); nm.set(e.nrm, (v + s) * 3); }
        if (k < e.list.length - 1) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
        v += 2;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nm, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide, ...opts }));
    m.frustumCulled = false;
    return m;
  };
  const skirt = wall(0x8d6a48);
  skirt.receiveShadow = true;
  const waterSkirt = water ? wall(0x3f8fd2, { transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.2 }) : null;
  const dx = w / nx, dz = d / nz;

  function fill(heightFn, colorFn) {
    for (let j = 0; j < n; j++) {
      const h = heightFn(pos.getX(j), pos.getZ(j));
      H[j] = h; pos.setY(j, h); DEP[j] = info.dep; DUNE[j] = info.dune; RIV[j] = info.river; SLD[j] = info.slide;
    }
    // Colours need the slope (from neighbours), so heights come first, then colours.
    for (let iz = 0; iz <= nz; iz++) {
      for (let ix = 0; ix <= nx; ix++) {
        const j = id(iz, ix);
        const hx = (H[id(iz, Math.min(nx, ix + 1))] - H[id(iz, Math.max(0, ix - 1))]) / (dx * 2);
        const hz = (H[id(Math.min(nz, iz + 1), ix)] - H[id(Math.max(0, iz - 1), ix)]) / (dz * 2);
        const c = colorFn(H[j], Math.hypot(hx, hz), DEP[j], DUNE[j], RIV[j], SLD[j]);
        col[j * 3] = c.r; col[j * 3 + 1] = c.g; col[j * 3 + 2] = c.b;
      }
    }
    pos.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
    // Walls follow the edge heights.
    let v = 0;
    const sp = skirt.geometry.attributes.position, wp = waterSkirt?.geometry.attributes.position;
    for (const e of edges) {
      for (const j of e.list) {
        sp.setY(v, H[j]); sp.setY(v + 1, bottom);
        if (wp) { wp.setY(v, 0); wp.setY(v + 1, Math.min(0, H[j])); }
        v += 2;
      }
    }
    sp.needsUpdate = true;
    if (wp) wp.needsUpdate = true;
  }
  // Height at any point, from the grid (bilinear).
  function sample(x, z) {
    const fx = clamp((x + w / 2) / dx, 0, nx - 1e-6), fz = clamp((z + d / 2) / dz, 0, nz - 1e-6);
    const ix = Math.floor(fx), iz = Math.floor(fz), ax = fx - ix, az = fz - iz;
    const a = H[id(iz, ix)], b = H[id(iz, ix + 1)], c = H[id(iz + 1, ix)], e = H[id(iz + 1, ix + 1)];
    return lerp(lerp(a, b, ax), lerp(c, e, ax), az);
  }
  return { mesh, skirt, waterSkirt: waterSkirt || new THREE.Group(), fill, sample };
}
