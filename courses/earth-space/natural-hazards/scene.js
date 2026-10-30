// Natural hazards (middle school): where hazards happen, measuring and locating earthquakes, how a typhoon
// forms, storm surge on a coast, floods and landslides on bare and forested slopes, and how hazards are watched.
// Seven stations sit far apart along x; each step shows one and frames it. All motion comes from dt / t.
import { rand } from '../_shared/sky.js';
import { makeStormCloud, makeRain, makeFlow, makeArrowPath, makeThermometer } from '../_shared/atmos.js';
import { canvasTex, arrow } from '../_shared/geo.js';

const SX = [0, 40, 80, 120, 160, 200, 240];           // station x positions
const VP = 6, VS = 24 / 7;                            // P and S wave speeds in km/s (model; gives 8 km per second of gap)
const KM = 0.011;                                      // scene units per km in the wave cross-section
const M = 0.4;                                         // scene units per metre on the coast
const WALL = 3, VILLAGE = 1;                           // sea wall top and village ground (m above normal high tide)
const energyRatio = m => Math.pow(10, 1.5 * (m - 5));  // energy compared with a magnitude 5 (each step ~ 31.6x)
const smooth = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

// Simplified continents and plate boundaries (longitude, latitude).
const POLY = [
  [[-168, 66], [-156, 71], [-130, 70], [-95, 72], [-80, 73], [-62, 60], [-56, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 25], [-83, 29], [-90, 30], [-97, 27], [-97, 20], [-88, 21], [-87, 15], [-83, 9], [-79, 8], [-86, 12], [-92, 15], [-105, 20], [-112, 30], [-117, 32], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
  [[-55, 60], [-43, 60], [-20, 70], [-20, 82], [-60, 82], [-73, 77], [-55, 68]],
  [[-80, 8], [-73, 12], [-62, 11], [-52, 5], [-35, -5], [-39, -14], [-48, -26], [-58, -35], [-65, -42], [-68, -55], [-74, -52], [-73, -40], [-71, -18], [-81, -6]],
  [[-17, 15], [-17, 21], [-10, 30], [-6, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -2], [40, -15], [35, -24], [32, -29], [20, -35], [18, -32], [12, -17], [13, -6], [9, 4], [-8, 4], [-13, 8]],
  [[-9, 37], [-9, 43], [-2, 44], [-5, 48], [5, 53], [8, 57], [5, 62], [15, 69], [30, 71], [60, 70], [80, 73], [110, 77], [140, 72], [180, 68], [180, 64], [160, 60], [155, 55], [140, 52], [130, 42], [122, 40], [121, 30], [110, 20], [109, 12], [105, 9], [100, 13], [98, 8], [97, 17], [92, 22], [89, 27], [80, 30], [73, 33], [70, 28], [68, 24], [62, 25], [57, 25], [59, 22], [52, 16], [44, 12], [38, 20], [34, 28], [35, 36], [27, 37], [26, 41], [23, 38], [20, 40], [15, 45], [12, 44], [16, 40], [12, 38], [8, 44], [3, 43], [-4, 37]],
  [[68, 24], [72, 21], [77, 8], [80, 13], [80, 16], [87, 21], [92, 22], [89, 27], [80, 30], [73, 33], [70, 28]],
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [135, -35], [129, -32], [115, -34]],
  [[95, 5], [105, -6], [115, -8], [120, -9], [110, -4], [100, 0]],
  [[130, 31], [136, 34], [141, 38], [142, 43], [140, 41], [136, 36], [131, 33]],
];
const EDGES = [
  [[-5, 72], [-18, 66], [-30, 55], [-35, 45], [-40, 35], [-45, 25], [-45, 15], [-35, 5], [-20, 0], [-13, -10], [-14, -25], [-13, -40], [-10, -52]],
  [[-180, 52], [-165, 53], [-150, 58], [-136, 58], [-125, 50], [-124, 40], [-117, 32], [-110, 23], [-105, 18], [-95, 14], [-85, 10], [-82, 5], [-80, 0], [-81, -5], [-76, -15], [-71, -25], [-74, -40], [-76, -50]],
  [[180, 52], [165, 55], [155, 50], [145, 42], [142, 35], [142, 25], [145, 15], [140, 5], [150, -5], [160, -10], [168, -15], [175, -20], [178, -30], [175, -40], [168, -48]],
  [[125, 20], [127, 10], [125, 0], [115, -9], [105, -7], [96, 2], [94, 12], [92, 20]],
  [[-10, 36], [10, 37], [20, 36], [28, 34], [36, 36], [45, 37], [55, 28], [62, 26], [68, 25], [72, 34], [80, 31], [90, 28], [95, 27], [97, 20], [92, 20]],
  [[44, 12], [57, 14], [60, 8], [68, 0], [70, -10], [70, -25], [55, -35], [40, -45]],
  [[36, 15], [38, 5], [36, -5], [35, -15]],
];
const VOLC_EDGES = [1, 2, 3];
const HOTSPOTS = [[-155, 19.5], [-19, 64], [37, -3], [15, 37.7], [-80, 1.5], [160, 55], [-120, 46]];
const TRACKS = [
  [[152, 11], [138, 14], [124, 16], [112, 17], [107, 17]],
  [[150, 14], [136, 18], [127, 25], [129, 33], [138, 39]],
  [[-32, 13], [-52, 16], [-68, 21], [-79, 27], [-74, 37]],
  [[-98, 12], [-108, 15], [-118, 19]],
  [[89, 10], [87, 15], [89, 21]],
  [[80, -11], [64, -15], [53, -20], [50, -28]],
  [[162, -12], [154, -17], [156, -26]],
];
const MAPX = lo => lo / 30, MAPZ = la => -la / 30;    // map units

// Monitoring sub-scenes (x offsets inside station 6)
const MON = { volcano: -9, quake: 0, storm: 9 };

export default function setup({ THREE, scene, renderer, kit, ui, label, view }) {
  renderer.localClippingEnabled = true;
  scene.background = new THREE.Color(0xdff1ff);
  kit.lights(scene, { sun: [-4, 10, 7], shadows: false });
  const stations = SX.map(x => { const g = new THREE.Group(); g.position.x = x; scene.add(g); return g; });
  const L = {};                                          // labels by name
  const lab = (name, text, at, cls) => { L[name] = label(text, at, { cls }); L[name].show(false); return L[name]; };
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const std = (c, o = {}) => kit.mat(c, o);
  const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const box = (w, h, d, m, pos, parent) => { const b = kit.mesh(new THREE.BoxGeometry(w, h, d), m, pos, parent); b.castShadow = b.receiveShadow = false; return b; };
  const st = { step: 0, demo: null };

  // A flat band (ring of fixed width) whose radius can change in place: for wave fronts.
  // flat = true lies in the XZ plane, otherwise it stands in the XY plane.
  function band(mat, flat, segs = 96) {
    const pos = new Float32Array((segs + 1) * 6), idx = [];
    for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    return {
      obj: m,
      set(r, w) {
        const r0 = Math.max(0, r - w / 2), r1 = r + w / 2;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), k = i * 6;
          if (flat) { pos[k] = c * r0; pos[k + 1] = 0; pos[k + 2] = s * r0; pos[k + 3] = c * r1; pos[k + 4] = 0; pos[k + 5] = s * r1; }
          else { pos[k] = c * r0; pos[k + 1] = s * r0; pos[k + 2] = 0; pos[k + 3] = c * r1; pos[k + 4] = s * r1; pos[k + 5] = 0; }
        }
        geo.attributes.position.needsUpdate = true;
        m.visible = r > 0.001;
      },
    };
  }
  const house = (parent, x, z, s = 0.3, wall = 0xf1e4d0, roof = 0xc2410c) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    box(s, s * 0.8, s, std(wall), [0, s * 0.4, 0], g);
    const r = kit.mesh(new THREE.ConeGeometry(s * 0.78, s * 0.5, 4), std(roof), [0, s * 0.8 + s * 0.25, 0], g);
    r.rotation.y = Math.PI / 4;
    parent.add(g);
    return g;
  };

  // =========================================================== 0. Hazard map
  const S0 = stations[0];
  const texQuake = paintMap(THREE, 'quake'), texStorm = paintMap(THREE, 'storm');
  box(12.3, 0.25, 5.3, std(0x5b6b7a), [0, -0.13, 0], S0);
  const mapMat = new THREE.MeshStandardMaterial({ map: texQuake, roughness: 0.9 });
  const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), mapMat);
  mapPlane.rotation.x = -Math.PI / 2;
  mapPlane.position.y = 0.005;
  S0.add(mapPlane);
  const quakePts = [], volcPts = [];
  EDGES.forEach((line, li) => {
    for (let i = 0; i < line.length - 1; i++) {
      const [a0, b0] = line[i], [a1, b1] = line[i + 1], n = Math.max(1, Math.round(Math.hypot(a1 - a0, b1 - b0) / 4));
      for (let j = 0; j < n; j++) {
        const u = j / n, sd = li * 100 + i * 10 + j;
        const lo = a0 + (a1 - a0) * u + (rand(sd) - 0.5) * 3, la = b0 + (b1 - b0) * u + (rand(sd + 50) - 0.5) * 3;
        quakePts.push([lo, la]);
        if (VOLC_EDGES.includes(li) && j % 2 === 0 && rand(sd + 7) > 0.35) volcPts.push([lo + (li === 1 ? 3 : -3) * (rand(sd + 9) * 0.5 + 0.5), la]);
      }
    }
  });
  volcPts.push(...HOTSPOTS);
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v0 = new THREE.Vector3(), s0 = new THREE.Vector3(1, 1, 1);
  const quakes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), basic(0xff3b30), quakePts.length);
  quakePts.forEach(([lo, la], i) => { m4.compose(v0.set(MAPX(lo), 0.04, MAPZ(la)), q0, s0); quakes.setMatrixAt(i, m4); });
  const volcs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.17, 8), std(0x5a2a1a), volcPts.length);
  volcPts.forEach(([lo, la], i) => { m4.compose(v0.set(MAPX(lo), 0.085, MAPZ(la)), q0, s0); volcs.setMatrixAt(i, m4); });
  const quakeLayer = new THREE.Group(), stormLayer = new THREE.Group();
  quakeLayer.add(quakes, volcs);
  S0.add(quakeLayer, stormLayer);
  const trackFlows = TRACKS.map((tr, i) => {
    const pts = tr.map(([lo, la]) => [MAPX(lo), 0.07, MAPZ(la)]);
    stormLayer.add(makeArrowPath(THREE, pts, { color: 0xffffff, radius: 0.025, head: 0.16 }));
    const f = makeFlow(THREE, pts, { count: 3, color: 0x7c3aed, size: 0.07, speed: 0.6, seed: i * 13 });
    stormLayer.add(f.obj);
    return f;
  });
  lab('ring', 'Ring of Fire', anchor(quakeLayer, MAPX(-150), 0.1, MAPZ(54)), 'warm');
  lab('boundary', 'Plate boundary', anchor(quakeLayer, MAPX(-30), 0.1, MAPZ(40)));
  lab('warm', 'Warm sea', anchor(stormLayer, MAPX(-150), 0.1, MAPZ(12)), 'warm');
  lab('sea', 'Southeast Asia', anchor(S0, MAPX(106), 0.1, MAPZ(14)), 'cool');
  function mapMode(m) {
    st.map = m;
    quakeLayer.visible = m !== 'storm';
    stormLayer.visible = m !== 'quake';
    mapMat.map = m === 'storm' ? texStorm : texQuake;
    mapMat.needsUpdate = true;
    if (st.step !== 0) return;
    L.ring.show(m === 'quake'); L.boundary.show(m === 'quake');
    L.warm.show(m === 'storm'); L.sea.show(m === 'storm');
    ui.readout(m === 'quake'
      ? 'Each <b>red dot</b> is a place with many earthquakes, and each <b>cone</b> is a volcano. They follow the <b>plate boundaries</b> (red lines). A few volcanoes, like Hawaii, sit over hot spots in the middle of a plate.'
      : 'Tropical storms start over sea water warmer than about <b>26–27 °C</b> (orange) and move toward coasts. They almost never form right on the Equator, because there Earth\'s spin cannot make them turn.');
  }

  // =========================================================== 1. Magnitude and energy
  const S1 = stations[1];
  box(11, 0.4, 4, std(0x7a5a3c), [0.5, -0.2, 0], S1);
  box(11, 0.02, 4, std(0x7dbb5c), [0.5, 0.01, 0], S1);
  const town1 = [];
  [[-4, -0.9], [-3.2, 0.4], [-2.4, -0.6], [-1.7, 0.9], [-3.9, 1.2], [-1.4, -1.2], [-2.6, 1.5]].forEach(([x, z], i) => {
    const h = house(S1, x, z, 0.42 + rand(i + 4) * 0.2, [0xf1e4d0, 0xdfe7ee, 0xf6d9a8][i % 3]);
    town1.push(h);
  });
  const ghost = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true, transparent: true, opacity: 0.9 }));
  ghost.position.set(2.6, 0.3, 0);
  S1.add(ghost);
  const eBall = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshStandardMaterial({ color: 0xff8c1a, emissive: 0xff5a00, emissiveIntensity: 0.35, transparent: true, opacity: 0.72, roughness: 0.4 }));
  eBall.position.set(2.6, 0.3, 0);
  S1.add(eBall);
  lab('ghost', 'Magnitude 6', anchor(S1, 3.2, 0.62, 0));
  lab('eBall', 'Magnitude 6.0', anchor(eBall, 0, 1.05, 0), 'warm');
  st.mag = 6; st.magShown = 6;
  const sizeWord = m => m < 2.5 ? 'usually not felt' : m < 5.5 ? 'often felt, usually little or no damage' : m < 6.1 ? 'can damage weak buildings' : m < 7 ? 'strong: can cause a lot of damage where many people live' : m < 8 ? 'major: serious damage over a wide area' : 'great: can destroy towns near the epicentre';
  const fmtRatio = f => {
    const sig = v => { const p = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / p) * p; };
    return f >= 1 ? '× ' + sig(f).toLocaleString('en-US') : 'about 1/' + sig(1 / f).toLocaleString('en-US');
  };
  function applyMag() {
    const r = 0.3 * Math.cbrt(energyRatio(st.magShown) / energyRatio(6));
    eBall.scale.setScalar(Math.max(0.004, r));
    eBall.position.y = r;
    L.eBall.text = `Magnitude ${st.mag.toFixed(1)}`;
  }
  function magReadout() {
    if (st.step !== 1) return;
    const m = st.mag, f = energyRatio(m);
    L.ghost.show(Math.abs(m - 6) > 0.6);
    ui.readout(`Magnitude <b>${m.toFixed(1)}</b>: ${sizeWord(m)}.<br>Energy compared with a magnitude 5: <b>${fmtRatio(f)}</b><br>Rule: each step of 1 → about <b>32 ×</b> the energy (10<sup>1.5</sup> ≈ 31.6).`);
  }

  // =========================================================== 2. P and S waves, distance from the gap
  const S2 = stations[2];
  const X2 = SX[2], FX = -4.6, FD = 30 * KM;             // focus position (x) and depth (30 km)
  const crust = new THREE.Group();
  S2.add(crust);
  box(10, 2.6, 2, std(0x9a7b5b), [0, -1.3, 0], crust);
  box(10, 0.04, 2, std(0x7dbb5c), [0, 0.02, 0], crust);
  {
    // rock layers painted on the front face
    const tex = canvasTex(THREE, 512, 128, (g, W, H) => {
      const cols = ['#b08a63', '#9a7b5b', '#8a6c50', '#7a5f47', '#6b5240'];
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i / cols.length) * H, W, H / cols.length + 1); });
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(40,25,10,${0.1 + rand(i) * 0.15})`; g.fillRect(rand(i * 3.1) * W, rand(i * 5.7) * H, 2, 2); }
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.6), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(0, -1.3, 1.001);
    crust.add(face);
  }
  const clip = [
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 2.6),
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -(X2 - 5)),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), X2 + 5),
  ];
  const pBand = band(basic(0x2563eb, { clippingPlanes: clip, side: THREE.DoubleSide }), false);
  const sBand = band(basic(0xdc2626, { clippingPlanes: clip, side: THREE.DoubleSide }), false);
  pBand.obj.position.set(FX, -FD, 1.02); sBand.obj.position.set(FX, -FD, 1.025);
  S2.add(pBand.obj, sBand.obj);
  const focus = kit.mesh(new THREE.SphereGeometry(0.09, 12, 8), basic(0xffd60a), [FX, -FD, 1.04], S2);
  const epi = kit.mesh(new THREE.ConeGeometry(0.12, 0.3, 10), basic(0xffd60a), [FX, 0.17, 0.6], S2);
  epi.rotation.x = Math.PI;
  lab('focus', 'Focus', focus);
  lab('epi', 'Epicentre', anchor(S2, FX, 0.5, 0.6), 'warm');
  const station2 = new THREE.Group();
  S2.add(station2);
  box(0.5, 0.36, 0.5, std(0xe2e8f0), [0, 0.18, 0.4], station2);
  const roof2 = kit.mesh(new THREE.ConeGeometry(0.42, 0.26, 4), std(0x1d4ed8), [0, 0.49, 0.4], station2);
  roof2.rotation.y = Math.PI / 4;
  lab('station', 'Seismometer', anchor(station2, 0, 0.7, 0.4), 'cool');
  const pTag = anchor(S2, 0, 0, 1), sTag = anchor(S2, 0, 0, 1);
  lab('p', 'P wave', pTag, 'cool');
  lab('s', 'S wave', sTag, 'warm');
  // the seismogram: a paper strip above the ground with a trace drawn as time passes
  const paper = new THREE.Group();
  paper.position.set(0.3, 2.0, 0);
  S2.add(paper);
  const PW = 6.4, PH = 1.1, NTR = 400;
  box(PW + 0.2, PH + 0.2, 0.06, std(0x334155), [0, 0, -0.04], paper);
  box(PW, PH, 0.02, basic(0xfbf8f1), [0, 0, 0], paper);
  {
    const g = new THREE.BufferGeometry(), pts = [];
    for (let i = 0; i <= 8; i++) pts.push(-PW / 2 + (i / 8) * PW, -PH / 2, 0.02, -PW / 2 + (i / 8) * PW, PH / 2, 0.02);
    pts.push(-PW / 2, 0, 0.02, PW / 2, 0, 0.02);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    paper.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcbd5e1 })));
  }
  const trPos = new Float32Array(NTR * 3), trGeo = new THREE.BufferGeometry();
  trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3));
  const trace = new THREE.Line(trGeo, new THREE.LineBasicMaterial({ color: 0x111827 }));
  trace.frustumCulled = false;
  paper.add(trace);
  const pMark = box(0.03, PH, 0.01, basic(0x2563eb), [0, 0, 0.03], paper), sMark = box(0.03, PH, 0.01, basic(0xdc2626), [0, 0, 0.03], paper);
  lab('pm', 'P', anchor(pMark, 0, PH / 2 + 0.05, 0), 'cool');
  lab('sm', 'S', anchor(sMark, 0, PH / 2 + 0.05, 0), 'warm');
  st.dist = 400; st.wt = 0;
  const waveTimes = () => { const tP = st.dist / VP, tS = st.dist / VS; return { tP, tS, L: tS * 1.2 + 25 }; };
  // the record: wiggles are drawn relative to the strip length, so they look the same at any distance
  function wiggle(time, tP, tS, len) {
    const per = len / 70, w = 2 * Math.PI / per;
    let y = Math.sin(time * w * 1.3) * 0.008;
    if (time > tP) { const a = time - tP; y += Math.sin(a * w) * 0.16 * Math.exp(-a / (0.12 * len)) * Math.min(1, a / per); }
    if (time > tS) { const a = time - tS; y += Math.sin(a * w * 0.7 + 0.5) * 0.42 * Math.exp(-a / (0.15 * len)) * Math.min(1, a / per); }
    return y;
  }
  function placeStation() {
    station2.position.x = FX + st.dist * KM;
    const { tP, tS, L: len } = waveTimes();
    pMark.position.x = -PW / 2 + (tP / len) * PW;
    sMark.position.x = -PW / 2 + (tS / len) * PW;
  }
  function drawWaves() {
    const { tP, tS, L: len } = waveTimes(), t = st.wt;
    const rP = t * VP * KM, rS = t * VS * KM;
    pBand.set(rP, 0.07); sBand.set(rS, 0.07);
    const xP = Math.sqrt(Math.max(0, rP * rP - FD * FD)), xS = Math.sqrt(Math.max(0, rS * rS - FD * FD));
    pTag.position.set(FX + xP, 0.05, 1); sTag.position.set(FX + xS, 0.05, 1);
    const live = st.step === 2;
    L.p.show(live && xP > 0.4 && FX + xP < 5);
    L.s.show(live && xS > 0.4 && FX + xS < 5 && (xP - xS > 1.1 || FX + xP >= 5));
    const n = Math.max(2, Math.min(NTR, Math.floor((t / len) * (NTR - 1)) + 1));
    for (let i = 0; i < n; i++) {
      const ti = (i / (NTR - 1)) * len;
      trPos[i * 3] = -PW / 2 + (i / (NTR - 1)) * PW; trPos[i * 3 + 1] = wiggle(ti, tP, tS, len); trPos[i * 3 + 2] = 0.025;
    }
    trGeo.attributes.position.needsUpdate = true;
    trGeo.setDrawRange(0, n);
    // the station shakes a little when the waves arrive
    station2.position.y = t > tP ? wiggle(t, tP, tS, len) * 0.12 : 0;
  }
  function waveReadout() {
    if (st.step !== 2) return;
    const { tP, tS } = waveTimes(), gap = tS - tP;
    ui.readout(`P wave arrives after <b>${Math.round(tP)} s</b>, S wave after <b>${Math.round(tS)} s</b>.<br>Gap = <b>${Math.round(gap)} s</b> → distance ≈ 8 km × ${Math.round(gap)} = <b>${Math.round(8 * Math.round(gap))} km</b> (model)`);
  }

  // =========================================================== 3. Typhoon
  const S3 = stations[3];
  const seaMat = std(0x2b6cb0, { roughness: 0.35 });
  const sea3 = kit.mesh(new THREE.CircleGeometry(7, 48), seaMat, [0, 0, 0], S3);
  sea3.rotation.x = -Math.PI / 2;
  const therm = makeThermometer(THREE, { height: 2.2, min: 20, max: 32, step: 4 });
  therm.obj.position.set(-5.2, 0, 1.6);
  S3.add(therm.obj);
  const storm = new THREE.Group(), spin = new THREE.Group();
  storm.position.y = 0.05;
  storm.add(spin);
  S3.add(storm);
  const NP = 230, NE = 60;
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), cloudMat, NP);
  puffs.frustumCulled = false;
  spin.add(puffs);
  const spiral = [], scatter = [];
  for (let i = 0; i < NP; i++) {
    let x, y, z, s;
    if (i < NE) {          // eyewall: a tall ring of clouds
      const a = (i / NE) * Math.PI * 2 + rand(i) * 0.2, r = 0.85 + rand(i + 3) * 0.25;
      x = Math.cos(a) * r; z = Math.sin(a) * r; y = 0.7 + (i % 4) * 0.55 + rand(i + 5) * 0.2; s = 0.36 + rand(i + 9) * 0.12;
    } else {               // three spiral rain bands
      const k = i - NE, arm = k % 3, u = rand(k * 1.7 + 11);
      const r = 1.3 + u * 4.2, a = arm * (Math.PI * 2 / 3) + u * 2.8 + (rand(k + 77) - 0.5) * 0.25;
      x = Math.cos(a) * r; z = Math.sin(a) * r; y = 0.9 + rand(k + 31) * 0.5 - u * 0.3; s = (0.45 - u * 0.2) * (0.8 + rand(k + 41) * 0.4);
    }
    spiral.push([x, y, z, s]);
    const a2 = rand(i * 2.9) * Math.PI * 2, r2 = 0.5 + Math.sqrt(rand(i * 4.3)) * 5;
    scatter.push([Math.cos(a2) * r2, 0.9 + rand(i * 6.1) * 0.4, Math.sin(a2) * r2, 0.2 + rand(i * 7.7) * 0.2]);
  }
  const order = spiral.map((_, i) => i).sort((a, b) => rand(a * 9.3) - rand(b * 9.3));
  const rank = new Array(NP);
  order.forEach((idx, r) => { rank[idx] = r; });
  const inflow = [0, 1, 2].map(i => {
    const pts = [];
    for (let j = 0; j <= 8; j++) {
      const u = j / 8, r = 5.6 - u * 4.6, a = i * (Math.PI * 2 / 3) + 0.6 - u * 3.2 + 1;
      pts.push([Math.cos(a) * r, 0.18, Math.sin(a) * r]);
    }
    const a = i * (Math.PI * 2 / 3) - 1.6 - 0.6;
    pts.push([Math.cos(a) * 0.95, 1.2, Math.sin(a) * 0.95], [Math.cos(a - 0.3) * 1.0, 2.7, Math.sin(a - 0.3) * 1.0]);
    const f = makeFlow(THREE, pts, { count: 18, color: 0xf97316, size: 0.07, speed: 1.4, seed: 300 + i * 17 });
    storm.add(f.obj);
    return f;
  });
  lab('eye', 'Eye', anchor(storm, 0, 0.25, 0), 'cool');
  lab('eyewall', 'Eyewall', anchor(storm, -0.3, 3.2, -0.6));
  lab('band', 'Rain band', anchor(storm, 3.1, 1.6, 1.8));
  lab('therm', 'Sea temperature', anchor(therm.obj, 0, 2.4, 0));
  st.sst = 24; st.sstShown = 24;
  const org = c => smooth(26, 27.5, c);                                 // how organised the storm is
  const power = c => c < 26.5 ? 0.25 * smooth(22, 26.5, c) : 0.35 + 0.65 * smooth(26.5, 30, c);
  const cCold = new THREE.Color(0x2b5fa8), cMid = new THREE.Color(0x1c8fa8), cWarm = new THREE.Color(0x2bb39a), cTmp = new THREE.Color();
  function applyStorm() {
    const c = st.sstShown, o = org(c), p = power(c), show = Math.floor(NP * (0.3 + 0.7 * p));
    for (let i = 0; i < NP; i++) {
      const a = scatter[i], b = spiral[i], s = rank[i] < show ? kit.lerp(a[3], b[3], o) * (0.7 + 0.3 * p) : 0.0001;
      v0.set(kit.lerp(a[0], b[0], o), kit.lerp(a[1], b[1], o) * (0.75 + 0.25 * p), kit.lerp(a[2], b[2], o));
      s0.set(s, s * 0.75, s);
      m4.compose(v0, q0, s0);
      puffs.setMatrixAt(i, m4);
    }
    s0.set(1, 1, 1);
    puffs.instanceMatrix.needsUpdate = true;
    if (c < 26) cTmp.copy(cCold).lerp(cMid, smooth(22, 26, c)); else cTmp.copy(cMid).lerp(cWarm, smooth(26, 31, c));
    seaMat.color.copy(cTmp);
    therm.setTemp(c);
    inflow.forEach(f => { f.setCount(Math.round(18 * smooth(26, 28, c))); f.st.speed = 0.6 + 2 * p; });
    const lit = st.step === 3 && o > 0.7;
    L.eye.show(lit); L.eyewall.show(lit); L.band.show(lit);
  }
  function stormReadout() {
    if (st.step !== 3) return;
    const c = st.sst;
    const what = c < 26 ? 'Too cool: only scattered clouds, no tropical cyclone.'
      : c < 27 ? 'Just warm enough: the clouds start to gather and spin.'
        : c < 28.5 ? 'Warm: a tropical storm forms with an eye and rain bands.'
          : 'Very warm: plenty of energy, so the storm can grow into a strong <b>typhoon</b>.';
    ui.readout(`Sea temperature: <b>${c.toFixed(1)} °C</b><br>${what}`);
  }

  // =========================================================== 4. Storm surge on a coast
  const S4 = stations[4];
  const WX = 1.2;                                        // x of the sea wall (sea is at x < WX)
  {
    const sh = new THREE.Shape();
    sh.moveTo(-7, -1.6); sh.lineTo(-7, -1.2); sh.lineTo(-1.6, -0.55); sh.lineTo(0, 0); sh.lineTo(WX, VILLAGE * M); sh.lineTo(6, VILLAGE * M); sh.lineTo(6, -1.6); sh.lineTo(-7, -1.6);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 4, bevelEnabled: false });
    g.translate(0, 0, -2);
    kit.mesh(g, std(0xe0c58e), [0, 0, 0], S4);
    box(6 - WX, 0.04, 4, std(0x7dbb5c), [(6 + WX) / 2, VILLAGE * M + 0.02, 0], S4);
  }
  const wall = box(0.28, (WALL - VILLAGE) * M + 0.3, 4, std(0x9ca3af), [WX + 0.14, VILLAGE * M + ((WALL - VILLAGE) * M + 0.3) / 2 - 0.3, 0], S4);
  const village = new THREE.Group();
  S4.add(village);
  village.position.y = VILLAGE * M;
  [[2.3, -0.9], [3.2, 0.5], [4.1, -0.6], [5.0, 0.8], [2.6, 1.3], [4.6, -1.5]].forEach(([x, z], i) => house(village, x, z, 0.4, [0xf1e4d0, 0xfde68a, 0xdfe7ee][i % 3], [0xc2410c, 0x2563eb][i % 2]));
  const NSX = 36, NSZ = 6;
  const seaGeo = new THREE.BoxGeometry(7 + WX + 0.1, 1, 3.98, NSX, 1, NSZ);   // a body of water whose top moves
  const seaBase = seaGeo.attributes.position.array.slice();
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f6f9f, roughness: 0.3, transparent: true, opacity: 0.82 });
  const sea4 = new THREE.Mesh(seaGeo, waterMat);
  sea4.position.set((-7 + WX + 0.1) / 2, 0, 0);
  sea4.frustumCulled = false;
  S4.add(sea4);
  const flood = new THREE.Mesh(new THREE.BoxGeometry(6 - WX, 1, 4), new THREE.MeshStandardMaterial({ color: 0x6b7f5a, roughness: 0.4, transparent: true, opacity: 0.78 }));
  S4.add(flood);
  flood.position.x = (6 + WX) / 2;
  // measuring pole with a metre scale (0 m = normal high tide)
  {
    const tex = canvasTex(THREE, 64, 512, (g, W, H) => {
      g.fillStyle = '#fefce8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#111827'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let m = 0; m <= 5; m++) {
        const y = H - 30 - m * ((H - 60) / 5);
        g.fillRect(0, y - 3, W, 6);
        if (m > 0) g.fillText(String(m), W / 2, y + 26);
      }
      for (let m = 0; m < 5; m++) g.fillRect(W - 24, H - 30 - (m + 0.5) * ((H - 60) / 5) - 2, 24, 4);
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const hTot = 5 * M * 512 / (512 - 60);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, hTot, 0.06), [std(0xfefce8), std(0xfefce8), std(0xfefce8), std(0xfefce8), new THREE.MeshBasicMaterial({ map: tex }), std(0xfefce8)]);
    pole.position.set(-0.5, -30 / 512 * hTot + hTot / 2, 1.75);
    S4.add(pole);
    box(0.05, 0.9, 0.05, std(0x475569), [-0.5, -0.45 - 30 / 512 * hTot, 1.72], S4);
    lab('pole', 'Metres', anchor(pole, 0, hTot / 2 + 0.05, 0));
  }
  const cloud4 = makeStormCloud(THREE, { seed: 4, height: 1.6, width: 1.1, color: 0x9aa3ad });
  cloud4.position.set(-4.2, 2.3, -1.2);
  const rain4 = makeRain(THREE, { count: 160, w: 2.6, d: 1.6, top: 2.6, bottom: -0.2, speed: 8, seed: 21, color: 0x9cc3e6 });
  rain4.obj.position.set(-3.8, 0, -0.4);
  S4.add(cloud4, rain4.obj);
  const winds = [0, 1, 2].map(i => { const a = arrow(THREE, 0xffffff, { radius: 0.035, head: 0.2 }); a.rotation.z = -Math.PI / 2; a.position.set(-5.8 + i * 0.4, 1.4 + i * 0.35, 0.8 - i * 0.9); S4.add(a); return a; });
  const mangroves = new THREE.Group();
  S4.add(mangroves);
  {
    const n = 26, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.05, 1, 6), std(0x6b4f2a), n), crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.28, 0), std(0x2f7d32, { flatShading: true }), n);
    for (let i = 0; i < n; i++) {
      const x = -3 + rand(i * 3.3) * 2.6, z = -1.8 + rand(i * 5.1) * 3.4, y0 = x < -1.6 ? -0.55 - (-1.6 - x) * 0.12 : (x + 1.6) / 1.6 * 0.55 - 0.55;
      const h = 1.3 + rand(i * 7.9) * 0.4;
      m4.compose(v0.set(x, y0 + h / 2, z), q0, s0.set(1, h, 1)); trunk.setMatrixAt(i, m4);
      m4.compose(v0.set(x, y0 + h + 0.05, z), q0, s0.set(1, 0.7, 1)); crown.setMatrixAt(i, m4);
    }
    s0.set(1, 1, 1);
    mangroves.add(trunk, crown);
  }
  const surgeTag = anchor(S4, -3.6, 0, 1.6);
  lab('surge', 'Storm surge', surgeTag, 'cool');
  lab('wall', 'Sea wall', anchor(wall, 0, ((WALL - VILLAGE) * M + 0.3) / 2 + 0.05, 1.2));
  lab('village', 'Village', anchor(village, 4.4, 0.75, 0.2), 'warm');
  st.surge = 2; st.surgeShown = 2; st.wallOn = false; st.mangrove = false; st.floodShown = 1;
  const floodDepth = () => (st.surge > VILLAGE && (!st.wallOn || st.surge > WALL)) ? st.surge - VILLAGE : 0;
  function applySurge() {
    flood.visible = st.floodShown > 0.01;
    flood.scale.y = Math.max(0.001, st.floodShown * M);
    flood.position.y = VILLAGE * M + st.floodShown * M / 2;
    wall.visible = st.wallOn;
    L.wall.show(st.step === 4 && st.wallOn);
    mangroves.visible = st.mangrove;
    surgeTag.position.y = st.surgeShown * M + 0.1;
    winds.forEach(a => a.setLength(0.6 + st.surgeShown * 0.25));
  }
  function surgeReadout() {
    if (st.step !== 4) return;
    const d = floodDepth();
    const res = d > 0 ? (st.wallOn ? `The wall is overtopped: water <b>${d.toFixed(1)} m</b> deep in the village.` : `The village floods: water <b>${d.toFixed(1)} m</b> deep.`)
      : st.surge > VILLAGE ? 'The sea wall holds the water back: the village stays <b>dry</b>.' : 'The water stays below the village: <b>dry</b>.';
    ui.readout(`Storm surge: <b>${st.surge.toFixed(1)} m</b> above normal high tide.<br>${res}${st.mangrove ? '<br>Mangroves make the waves smaller.' : ''}`);
  }

  // =========================================================== 5. Floods and landslides
  const S5 = stations[5];
  const hgt = (x, z) => 2.1 * Math.pow(Math.max(0, (2 - z) / 4), 1.25) + 0.08 * Math.sin(x * 2.1 + z * 1.3);
  function hill(cx, color, gully) {
    const g = new THREE.PlaneGeometry(4, 4, 16, 16);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let y = hgt(x, z);
      if (gully) y -= 0.12 * Math.exp(-((x - 0.5) ** 2) * 6) + 0.1 * Math.exp(-((x + 1.1) ** 2) * 8);
      p.setY(i, y);
      c.set(color).offsetHSL(0, 0, (rand(i * 1.3) - 0.5) * 0.06);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = kit.mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), [cx, 0, 0], S5);
    box(4, 0.6, 0.6, std(0x6e5a44), [cx, -0.3, 2.3], S5);    // bank in front of the hill
    return m;
  }
  hill(-2.3, 0x9a6b42, true);
  hill(2.3, 0x4f8a3c, false);
  {
    const n = 34, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), std(0x6b4f2a), n), crown = new THREE.InstancedMesh(new THREE.ConeGeometry(0.26, 0.62, 7), std(0x2e7d32, { flatShading: true }), n);
    for (let i = 0; i < n; i++) {
      const x = -1.7 + rand(i * 2.7) * 3.4, z = -1.7 + rand(i * 4.3) * 3.2, y = hgt(x, z), s = 0.8 + rand(i * 6.1) * 0.5;
      m4.compose(v0.set(2.3 + x, y + 0.15 * s, z), q0, s0.set(s, s, s)); trunk.setMatrixAt(i, m4);
      m4.compose(v0.set(2.3 + x, y + 0.55 * s, z), q0, s0); crown.setMatrixAt(i, m4);
    }
    s0.set(1, 1, 1);
    S5.add(trunk, crown);
  }
  // rivers in front of each hill, and flood water that spreads when a river overflows
  box(9.2, 0.3, 0.8, std(0x5b4a38), [0, -0.75, 3.0], S5);   // river bed
  box(9.2, 0.6, 1.0, std(0x6e5a44), [0, -0.3, 3.9], S5);    // far bank
  box(9.2, 0.02, 1.0, std(0x7dbb5c), [0, 0.01, 3.9], S5);
  const riverMat = [std(0xc08a4a, { roughness: 0.3 }), std(0x3b82c4, { roughness: 0.3 })];
  const rivers = [-2.3, 2.3].map((x, i) => { const r = box(4, 1, 0.8, riverMat[i], [x, 0, 3.0], S5); return r; });
  const floods5 = [-2.3, 2.3].map((x, i) => { const f = box(4, 0.04, 1.0, std(i ? 0x3b82c4 : 0xc08a4a, { transparent: true, opacity: 0.85 }), [x, 0.04, 3.9], S5); f.visible = false; return f; });
  const runoff = [[], []];
  for (let side = 0; side < 2; side++) {
    for (let j = 0; j < 4; j++) {
      const x0 = -1.4 + j * 0.95 + (side ? 0 : (j === 2 ? -0.45 : 0)), pts = [];
      for (let k = 0; k <= 6; k++) { const z = -1.6 + (k / 6) * 4.4; pts.push([(side ? 2.3 : -2.3) + x0 + Math.sin(k + j) * 0.08, z > 2.5 ? -0.15 : z > 2 ? 0.06 : hgt(x0, z) + 0.06, z]); }
      const f = makeFlow(THREE, pts, { count: 14, color: side ? 0x60a5fa : 0x9a5b26, size: 0.06, speed: side ? 0.7 : 1.4, seed: 500 + side * 40 + j * 7 });
      S5.add(f.obj);
      runoff[side].push(f);
    }
  }
  const rain5 = makeRain(THREE, { count: 260, w: 4.8, d: 2.2, top: 4.6, bottom: 0, speed: 8, seed: 33, color: 0x9cc3e6 });
  S5.add(rain5.obj);
  const slideStart = new THREE.Vector3(-2.3 + 0.5, hgt(0.5, -0.4) - 0.05, -0.4), slideEnd = new THREE.Vector3(-2.3 + 0.5, 0.24, 2.25);
  const chunk = kit.mesh(new THREE.IcosahedronGeometry(0.5, 1), std(0x7a4f2a, { flatShading: true }), [0, 0, 0], S5);
  chunk.scale.set(1.1, 0.45, 0.9);
  const scar = kit.mesh(new THREE.CircleGeometry(0.5, 14), std(0x5c3a1e), [slideStart.x, slideStart.y + 0.06, slideStart.z], S5);
  scar.rotation.x = -Math.PI / 2 - 0.45;
  lab('bare', 'Bare slope', anchor(S5, -2.3, 2.6, -1.8), 'warm');
  lab('forest', 'Forest', anchor(S5, 2.3, 2.9, -1.8));
  lab('slide', 'Landslide', anchor(chunk, 0, 0.6, 0), 'warm');
  st.rain = 60; st.rainShown = 60; st.slide = 0;
  const RIV0 = -0.4;
  function applyRain() {
    const r = st.rainShown / 300;
    rain5.setAmount(0.1 + 0.9 * r);
    runoff[0].forEach(f => f.setCount(Math.round(14 * Math.min(1, r * 1.6))));
    runoff[1].forEach(f => f.setCount(Math.round(14 * Math.min(1, r * 0.45))));
    const lv = [0.15 + r * 0.75, 0.15 + r * 0.28];
    rivers.forEach((rv, i) => { const top = Math.min(0.05, RIV0 + lv[i]); rv.scale.y = top - (RIV0 - 0.2); rv.position.y = (top + RIV0 - 0.2) / 2; floods5[i].visible = RIV0 + lv[i] > 0.04; });
  }
  function placeChunk() {
    const u = kit.ease(st.slide);
    chunk.position.lerpVectors(slideStart, slideEnd, u);
    chunk.position.y += Math.sin(u * Math.PI) * 0.15;
    chunk.rotation.x = u * 2.2;
    scar.visible = st.slide > 0.02;
    L.slide.show(st.step === 5 && st.slide > 0.3);
  }
  function rainReadout() {
    if (st.step !== 5) return;
    const r = Math.round(st.rain / 10) * 10;
    const bare = r < 60 ? 'some runoff' : r < 150 ? 'lots of muddy runoff, the river rises fast' : 'river overflows, the soaked soil slides: <b>landslide!</b>';
    const forest = r < 150 ? 'most water soaks in' : r < 250 ? 'more water soaks in than runs off' : 'the river is high but the soil holds';
    ui.readout(`Rain: <b>${r} mm</b> in a day.<br>Bare slope: ${bare}.<br>Forest: ${forest}. (model)`);
  }

  // =========================================================== 6. Watching and warning
  const S6 = stations[6];
  // --- volcano
  const vol = new THREE.Group();
  vol.position.x = MON.volcano;
  S6.add(vol);
  box(6.4, 1.4, 4, new THREE.MeshStandardMaterial({ color: 0x8a6c50, transparent: true, opacity: 0.5, depthWrite: false }), [0, -0.7, 0], vol);
  box(6.4, 0.03, 4, std(0x93b56b), [0, 0.0, 0], vol);
  const cone = new THREE.Group();
  vol.add(cone);
  {
    const g = new THREE.CylinderGeometry(0.4, 2.3, 2.1, 22, 5);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 1.05; c.set(y > 1.5 ? 0x6b5d55 : y > 0.6 ? 0x7d6a58 : 0x6f8f4f).offsetHSL(0, 0, (rand(i) - 0.5) * 0.05); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    kit.mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }), [0, 1.05, 0], cone);
    const crater = kit.mesh(new THREE.CircleGeometry(0.38, 16), basic(0xff7a1a), [0, 2.105, 0], cone);
    crater.rotation.x = -Math.PI / 2;
  }
  const chamber = kit.mesh(new THREE.SphereGeometry(0.6, 20, 14), new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff3d00, emissiveIntensity: 0.8 }), [0, -0.75, 1.45], vol);
  chamber.scale.set(1.4, 0.6, 1);
  const flashes = [];
  for (let i = 0; i < 6; i++) {
    const f = kit.mesh(new THREE.OctahedronGeometry(0.1, 0), basic(0xfde047), [(rand(i * 3) - 0.5) * 1.6, -0.25 - rand(i * 5) * 0.5, (rand(i * 7) - 0.5) * 0.8 + 1.5], vol);
    flashes.push(f);
  }
  const seis = new THREE.Group();
  seis.position.set(-2.4, 0, 1.3);
  vol.add(seis);
  box(0.36, 0.22, 0.3, std(0x1f2937), [0, 0.11, 0], seis);
  box(0.06, 0.4, 0.06, std(0x94a3b8), [0.12, 0.4, 0], seis);
  const tilt = new THREE.Group();
  const tiltR = 2.3 - (2.3 - 0.4) * (0.75 / 2.1);       // cone radius at height 0.75
  tilt.position.set(Math.cos(0.5) * tiltR, 0.75, Math.sin(0.5) * tiltR);
  cone.add(tilt);
  box(0.28, 0.12, 0.28, std(0x334155), [0, 0.06, 0], tilt);
  const tiltRod = new THREE.Group();
  tiltRod.position.y = 0.12;
  tilt.add(tiltRod);
  box(0.05, 0.55, 0.05, basic(0xef4444), [0, 0.27, 0], tiltRod);
  const gasBox = new THREE.Group();
  const gasR = 2.3 - (2.3 - 0.4) * (1.75 / 2.1);
  gasBox.position.set(Math.cos(2.4) * gasR, 1.75, Math.sin(2.4) * gasR);
  cone.add(gasBox);
  box(0.26, 0.2, 0.22, std(0xfacc15), [0, 0.1, 0], gasBox);
  box(0.04, 0.3, 0.04, std(0x94a3b8), [0, 0.35, 0], gasBox);
  const NG = 12, gas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.75, roughness: 1 }), NG);
  gas.frustumCulled = false;
  cone.add(gas);
  lab('seis', 'Seismometer', anchor(seis, 0, 0.6, 0), 'cool');
  lab('tilt', 'Tilt meter', anchor(tilt, 0.1, 0.75, 0), 'cool');
  lab('gas', 'Gas sensor', anchor(gasBox, -0.2, 0.6, 0), 'cool');
  lab('magma', 'Magma', anchor(chamber, 0.6, -0.4, 0.6), 'warm');
  // --- earthquake early warning
  const eq = new THREE.Group();
  eq.position.x = MON.quake;
  S6.add(eq);
  box(7.2, 0.4, 4.4, std(0x8a6c50), [0, -0.2, 0], eq);
  box(7.2, 0.02, 4.4, std(0x9cc77a), [0, 0.01, 0], eq);
  box(0.08, 0.03, 4.4, std(0x3f2a1a), [-2.6, 0.03, 0], eq);
  const EQ0 = new THREE.Vector3(-2.6, 0.04, -0.6), SENS = new THREE.Vector3(-1.9, 0, 0.3), CITY = new THREE.Vector3(2.3, 0, 0.3);
  const epi6 = kit.mesh(new THREE.ConeGeometry(0.12, 0.3, 10), basic(0xffd60a), [EQ0.x, 0.2, EQ0.z], eq);
  epi6.rotation.x = Math.PI;
  const sens = new THREE.Group();
  sens.position.copy(SENS);
  eq.add(sens);
  box(0.3, 0.2, 0.3, std(0x1f2937), [0, 0.1, 0], sens);
  box(0.04, 0.6, 0.04, std(0x94a3b8), [0, 0.5, 0], sens);
  const city = new THREE.Group();
  city.position.copy(CITY);
  eq.add(city);
  const cityHouses = [[-0.6, -0.5], [0, 0.2], [0.6, -0.4], [-0.4, 0.7], [0.5, 0.8], [0.1, -1.0]].map(([x, z], i) => house(city, x, z, 0.38 + rand(i) * 0.15));
  box(0.08, 1.1, 0.08, std(0x64748b), [-1.1, 0.55, 0], city);
  const alertMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0x000000 });
  kit.mesh(new THREE.SphereGeometry(0.14, 14, 10), alertMat, [-1.1, 1.18, 0], city);
  const X6 = SX[6] + MON.quake, clip6 = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -(X6 - 3.6)), new THREE.Plane(new THREE.Vector3(-1, 0, 0), X6 + 3.6),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 2.2), new THREE.Plane(new THREE.Vector3(0, 0, -1), 2.2),
  ];
  const pRing = band(basic(0x2563eb, { transparent: true, opacity: 0.85, side: THREE.DoubleSide, clippingPlanes: clip6 }), true);
  const sRing = band(basic(0xdc2626, { transparent: true, opacity: 0.85, side: THREE.DoubleSide, clippingPlanes: clip6 }), true);
  pRing.obj.position.copy(EQ0); sRing.obj.position.set(EQ0.x, EQ0.y + 0.005, EQ0.z);
  eq.add(pRing.obj, sRing.obj);
  lab('sens', 'Sensor', anchor(sens, 0, 0.9, 0), 'cool');
  lab('alert', 'Alert!', anchor(city, -1.1, 1.4, 0), 'warm');
  lab('city', 'City', anchor(city, 0.5, 0.9, 0));
  const EQV = { p: 1.5, s: 0.85, loop: 6.5 };
  // --- typhoon watched from space
  const ty = new THREE.Group();
  ty.position.x = MON.storm;
  S6.add(ty);
  box(7.4, 0.2, 4.6, std(0x2c6fa8, { roughness: 0.35 }), [0, -0.1, 0], ty);
  box(1.6, 0.3, 4.6, std(0x7dbb5c), [3.0, 0.05, 0], ty);
  [[2.7, -1.2], [3.1, -0.3], [2.8, 0.7], [3.3, 1.5]].forEach(([x, z]) => house(ty, x, z, 0.3));
  const cyc = new THREE.Group();
  ty.add(cyc);
  const cycDisc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), new THREE.MeshBasicMaterial({ map: paintSpiral(THREE), transparent: true, depthWrite: false }));
  cycDisc.rotation.x = -Math.PI / 2;
  cycDisc.position.y = 0.45;
  cyc.add(cycDisc);
  const TR0 = new THREE.Vector3(-2.8, 0, 1.0), TR1 = new THREE.Vector3(1.6, 0, -0.3);
  {
    const d = TR1.clone().sub(TR0), len = d.length(), nx = -d.z / len, nz = d.x / len;
    const sh = new THREE.Shape();
    sh.moveTo(TR0.x + nx * 0.15, -(TR0.z + nz * 0.15));
    sh.lineTo(TR1.x + nx * 1.2, -(TR1.z + nz * 1.2));
    sh.lineTo(TR1.x - nx * 1.2, -(TR1.z - nz * 1.2));
    sh.lineTo(TR0.x - nx * 0.15, -(TR0.z - nz * 0.15));
    const cg = new THREE.ShapeGeometry(sh);
    cg.rotateX(-Math.PI / 2);
    const coneM = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }));
    coneM.position.y = 0.02;
    ty.add(coneM);
    ty.add(makeArrowPath(THREE, [[TR0.x, 0.05, TR0.z], [(TR0.x + TR1.x) / 2, 0.05, (TR0.z + TR1.z) / 2], [TR1.x + 0.6, 0.05, TR1.z - 0.18]], { color: 0xfde047, radius: 0.03, head: 0.2 }));
  }
  const sat = new THREE.Group();
  sat.position.set(-0.6, 3.4, -0.5);
  ty.add(sat);
  box(0.36, 0.36, 0.5, std(0xd4d4d8, { metalness: 0.6, roughness: 0.35 }), [0, 0, 0], sat);
  const panelMat = std(0x1e3a8a, { metalness: 0.3, roughness: 0.4 });
  box(1.0, 0.03, 0.4, panelMat, [-0.72, 0, 0], sat);
  box(1.0, 0.03, 0.4, panelMat, [0.72, 0, 0], sat);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(0, -1.65, 0);
  sat.add(beam);
  lab('sat', 'Weather satellite', anchor(sat, 0, 0.35, 0), 'cool');
  lab('track', 'Forecast path', anchor(ty, 0.2, 0.2, 1.2));
  lab('coast', 'Coast warned', anchor(ty, 3.0, 0.7, 0), 'warm');
  st.mon = 'volcano';
  const MON_TEXT = {
    volcano: 'Signs of rising magma: many <b>small earthquakes</b> (seismometers), the ground <b>swelling</b> by millimetres to centimetres (tilt meters, GPS, satellites) and <b>more gas</b> such as sulfur dioxide.<br>Warning: often <b>days to weeks</b>, but not always.',
    quake: 'Nobody can predict the day of an earthquake. But sensors near a fault detect the fast <b>P wave</b> and send an alert faster than the slow, strong <b>S wave</b> travels.<br>Warning: <b>seconds to tens of seconds</b>: enough to Drop, Cover and Hold On and to stop trains.',
    storm: 'Weather satellites about 36,000 km above the Equator stay over the same spot and photograph storms every few minutes. Radar, weather buoys and aircraft add measurements.<br>Warning: typhoon paths are forecast <b>several days</b> ahead, so people can move to shelters in time.',
  };
  function monMode(m) {
    st.mon = m;
    st.monT = 0;
    vol.visible = m === 'volcano'; eq.visible = m === 'quake'; ty.visible = m === 'storm';
    if (st.step !== 6) return;
    for (const k of ['seis', 'tilt', 'gas', 'magma']) L[k].show(m === 'volcano');
    for (const k of ['sens', 'city']) L[k].show(m === 'quake');
    for (const k of ['sat', 'track', 'coast']) L[k].show(m === 'storm');
    L.alert.show(false);
    view({ radius: m === 'storm' ? 3.4 : 3.1, width: 3.7, yaw: m === 'storm' ? 0.15 : 0.3, pitch: m === 'storm' ? 0.55 : 0.35, target: [SX[6] + MON[m], m === 'volcano' ? 0.8 : m === 'storm' ? 0.9 : 0.4, 0.2] });
    ui.readout(MON_TEXT[m]);
  }

  // =========================================================== steps
  const SKY = [0xdff1ff, 0xdff1ff, 0xdff1ff, 0xa9c2d8, 0x8d99a6, 0x9fabb7, 0xdff1ff];
  function showOnly(i) {
    stations.forEach((g, j) => { g.visible = j === i; });
    for (const k in L) L[k].show(false);
    scene.background.set(SKY[i]);
  }
  function demo(key, to, rate, input, round, after) { st.demo = { key, to, rate, input, round, after }; }

  return {
    step(i, { isQuiz, instant }) {
      st.step = isQuiz ? -1 : i;
      st.demo = null;
      const go = o => view(o, instant);
      if (isQuiz) {
        showOnly(3);
        st.sst = 29.5; st.sstShown = 29.5; applyStorm();
        L.eye.show(false); L.eyewall.show(false); L.band.show(false);
        go({ radius: 6.2, yaw: 0.4, pitch: 0.75, target: [SX[3], 0.9, 0.2] });
        return;
      }
      showOnly(i);
      if (i === 0) {
        go({ radius: 3, width: 6.2, yaw: 0, pitch: 1.05, target: [SX[0], 0, 0.15] });
        const row = ui.buttons([{ label: 'Earthquakes and volcanoes', on: true, onClick: () => mapMode('quake') }, { label: 'Tropical storms', onClick: () => mapMode('storm') }]);
        row.select(0);
        mapMode('quake');
      }
      if (i === 1) {
        go({ radius: 5.1, width: 5, yaw: 0.25, pitch: 0.28, target: [SX[1] + 0.3, 2.1, 0] });
        st.mag = 4; if (instant) st.magShown = 4;
        const inp = ui.slider({ label: 'Magnitude', min: 4, max: 8, step: 0.1, value: 4, format: v => v.toFixed(1), onInput: v => { st.demo = null; st.mag = v; magReadout(); } });
        demo('mag', 8, 0.5, inp, v => Math.round(v * 10) / 10, magReadout);
        L.eBall.show(true);
        applyMag(); magReadout();
      }
      if (i === 2) {
        go({ radius: 3.4, width: 5.4, yaw: 0.12, pitch: 0.2, target: [SX[2], 0.4, 0] });
        st.wt = 0;
        ui.slider({ label: 'Distance', min: 100, max: 800, step: 10, value: st.dist, unit: ' km', onInput: v => { st.dist = v; st.wt = 0; placeStation(); waveReadout(); } });
        for (const k of ['focus', 'epi', 'station', 'pm', 'sm']) L[k].show(true);
        placeStation(); drawWaves(); waveReadout();
      }
      if (i === 3) {
        go({ radius: 5.9, yaw: 0.35, pitch: 0.7, target: [SX[3] - 0.5, 0.9, 0.3] });
        st.sst = 24; if (instant) st.sstShown = 24;
        const inp = ui.slider({ label: 'Sea temperature', min: 22, max: 31, step: 0.5, value: 24, unit: ' °C', format: v => v.toFixed(1), onInput: v => { st.demo = null; st.sst = v; stormReadout(); } });
        demo('sst', 29.5, 1.8, inp, v => Math.round(v * 2) / 2, stormReadout);
        L.therm.show(true);
        applyStorm(); stormReadout();
      }
      if (i === 4) {
        go({ radius: 3.2, width: 6.4, yaw: 0.28, pitch: 0.28, target: [SX[4] - 0.4, 0.7, 0] });
        st.surge = 2; st.wallOn = false; st.mangrove = false;
        if (instant) { st.surgeShown = 2; st.floodShown = floodDepth(); }
        ui.slider({ label: 'Storm surge', min: 0, max: 5, step: 0.5, value: 2, unit: ' m', format: v => v.toFixed(1), onInput: v => { st.surge = v; surgeReadout(); } });
        ui.toggle({ label: 'Sea wall', value: false, onChange: v => { st.wallOn = v; applySurge(); surgeReadout(); } });
        ui.toggle({ label: 'Mangrove forest', value: false, onChange: v => { st.mangrove = v; applySurge(); surgeReadout(); } });
        for (const k of ['surge', 'village', 'pole']) L[k].show(true);
        applySurge(); surgeReadout();
      }
      if (i === 5) {
        go({ radius: 3.2, width: 5.2, yaw: 0, pitch: 0.42, target: [SX[5], 1.1, 0.8] });
        st.rain = 60; if (instant) { st.rainShown = 60; st.slide = 0; }
        const inp = ui.slider({ label: 'Rain', min: 0, max: 300, step: 10, value: 60, unit: ' mm in a day', onInput: v => { st.demo = null; st.rain = v; rainReadout(); } });
        demo('rain', 260, 45, inp, v => Math.round(v / 10) * 10, rainReadout);
        L.bare.show(true); L.forest.show(true);
        applyRain(); placeChunk(); rainReadout();
      }
      if (i === 6) {
        const row = ui.buttons([{ label: 'Volcano', on: true, onClick: () => monMode('volcano') }, { label: 'Earthquake', onClick: () => monMode('quake') }, { label: 'Typhoon', onClick: () => monMode('storm') }]);
        row.select(0);
        st.mon = 'volcano';
        monMode('volcano');
        if (instant) view({ radius: 3.1, width: 3.7, yaw: 0.3, pitch: 0.35, target: [SX[6] + MON.volcano, 0.8, 0.2] }, true);
      }
    },
    update(dt, t) {
      const s = st.step;
      if (st.demo) {
        const d = st.demo, v = Math.min(d.to, st[d.key] + d.rate * dt);
        if (d.round(v) !== d.round(st[d.key])) { st[d.key] = v; d.input.set(d.round(v)); d.after(); } else st[d.key] = v;
        if (v >= d.to) { st[d.key] = d.round(d.to); st.demo = null; }
      }
      if (s === 0) { if (stormLayer.visible) trackFlows.forEach(f => f.tick(dt)); return stormLayer.visible; }
      if (s === 1) {
        if (kit.follow(st, 'magShown', st.mag, dt, 4)) applyMag();
        const a = Math.min(0.22, 0.006 * Math.pow(10, 0.5 * (st.magShown - 4)));
        town1.forEach((h, i) => { h.rotation.z = Math.sin(t * 13 + i * 1.7) * a; h.rotation.x = Math.cos(t * 11 + i) * a * 0.5; });
        return true;
      }
      if (s === 2) {
        const { L: len } = waveTimes();
        st.wt += dt * len / 6;
        if (st.wt > len) st.wt = 0;
        drawWaves();
        return true;
      }
      if (s === 3 || s === -1) {
        if (kit.follow(st, 'sstShown', st.sst, dt, 3)) applyStorm();
        const p = power(st.sstShown), o = org(st.sstShown);
        spin.rotation.y += dt * (0.08 + 0.7 * p * o);
        inflow.forEach(f => { if (f.obj.visible) f.tick(dt); });
        return true;
      }
      if (s === 4) {
        kit.follow(st, 'surgeShown', st.surge, dt, 3);
        kit.follow(st, 'floodShown', floodDepth(), dt, 2.5);
        applySurge();
        const p = seaGeo.attributes.position, amp = (0.05 + st.surgeShown * 0.02) * (st.mangrove ? 0.35 : 1), lvl = st.surgeShown * M;
        for (let i = 0; i < p.count; i++) {
          const x = seaBase[i * 3], z = seaBase[i * 3 + 2];
          p.setY(i, seaBase[i * 3 + 1] < 0 ? -1.58 : lvl + Math.sin(x * 2.4 - t * 3.2 + z * 0.4) * amp + Math.sin(x * 4.1 + t * 2.1) * amp * 0.3);
        }
        p.needsUpdate = true;
        seaGeo.computeVertexNormals();
        rain4.tick(dt);
        return true;
      }
      if (s === 5) {
        if (kit.follow(st, 'rainShown', st.rain, dt, 3)) applyRain();
        const want = st.rain >= 160 ? 1 : 0;
        if (st.slide !== want) { st.slide = want ? Math.min(1, st.slide + dt / 2.2) : Math.max(0, st.slide - dt * 2); placeChunk(); }
        runoff.forEach(side => side.forEach(f => { if (f.obj.visible) f.tick(dt); }));
        rain5.tick(dt);
        return true;
      }
      if (s === 6) {
        st.monT = (st.monT || 0) + dt;
        // volcano unrest: swelling, small quakes, gas
        const sw = 0.5 - 0.5 * Math.cos(t * 0.9);
        cone.scale.set(1 + sw * 0.04, 1 + sw * 0.06, 1 + sw * 0.04);
        chamber.scale.set(1.4 + sw * 0.25, 0.6 + sw * 0.15, 1 + sw * 0.2);
        tiltRod.rotation.z = -sw * 0.45;
        flashes.forEach((f, i) => { const ph = (t * 1.3 + rand(i * 9) * 5) % 1; f.visible = ph < 0.18 && sw > 0.25; f.scale.setScalar(0.6 + ph * 4); });
        for (let i = 0; i < NG; i++) {
          const u = ((t * 0.22 + i / NG) % 1 + 1) % 1, sc = (0.5 + u * 1.4) * (0.5 + sw * 0.6);
          m4.compose(v0.set(Math.sin(i * 2.3) * 0.15 + u * 0.5, 2.2 + u * 2.2, Math.cos(i * 1.7) * 0.15), q0, s0.set(sc, sc * 0.8, sc));
          gas.setMatrixAt(i, m4);
        }
        s0.set(1, 1, 1);
        gas.instanceMatrix.needsUpdate = true;
        // early warning: rings spread, alert when the P wave reaches the sensor
        const tq = st.monT % EQV.loop, rP = tq * EQV.p, rS = tq * EQV.s;
        pRing.set(rP, 0.06); sRing.set(rS, 0.08);
        pRing.obj.visible = rP < 6; sRing.obj.visible = rS < 6;
        const dS = Math.hypot(SENS.x - EQ0.x, SENS.z - EQ0.z), dC = Math.hypot(CITY.x - EQ0.x, CITY.z - EQ0.z);
        const alertOn = tq > dS / EQV.p + 0.3, shaking = tq > dC / EQV.s;
        alertMat.emissive.setHex(alertOn && Math.floor(tq * 4) % 2 === 0 ? 0xff2020 : 0x000000);
        alertMat.color.setHex(alertOn ? 0xef4444 : 0x7f1d1d);
        L.alert.show(st.mon === 'quake' && alertOn);
        cityHouses.forEach((h, i) => { h.rotation.z = shaking ? Math.sin(tq * 14 + i) * 0.12 * Math.exp(-(tq - dC / EQV.s) * 0.8) : 0; });
        // typhoon moving along its path, watched from space
        const u = (t * 0.12) % 1;
        cyc.position.lerpVectors(TR0, TR1, u);
        cycDisc.rotation.z += dt * 1.2;
        return true;
      }
      return false;
    },
  };
}

// World map (12 x 5 units, latitudes 75 N to 75 S) with plate boundaries or with the warm tropical sea.
function paintMap(THREE, mode) {
  return canvasTex(THREE, 512, 214, (g, W, H) => {
    const X = lo => (lo + 180) / 360 * W, Y = la => (75 - la) / 150 * H;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#3a76b8'); gr.addColorStop(0.5, '#3f86cc'); gr.addColorStop(1, '#3a76b8');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (mode === 'storm') {
      const w = g.createLinearGradient(0, Y(30), 0, Y(-28));
      w.addColorStop(0, 'rgba(255,150,60,0)'); w.addColorStop(0.25, 'rgba(255,150,60,0.7)'); w.addColorStop(0.5, 'rgba(255,120,40,0.55)');
      w.addColorStop(0.62, 'rgba(255,120,40,0.35)'); w.addColorStop(0.8, 'rgba(255,150,60,0.6)'); w.addColorStop(1, 'rgba(255,150,60,0)');
      g.fillStyle = w; g.fillRect(0, Y(30), W, Y(-28) - Y(30));
      // the eastern Pacific and eastern Atlantic are cooler (cold currents)
      for (const [lo, la, r] of [[-95, -12, 26], [-10, -14, 18]]) {
        const c = g.createRadialGradient(X(lo), Y(la), 2, X(lo), Y(la), r * W / 360 * 1.6);
        c.addColorStop(0, 'rgba(58,118,184,0.95)'); c.addColorStop(1, 'rgba(58,118,184,0)');
        g.fillStyle = c; g.fillRect(0, 0, W, H);
      }
    }
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
    for (let la = -60; la <= 60; la += 30) { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(W, Y(la)); g.stroke(); }
    g.setLineDash([6, 5]); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.stroke(); g.setLineDash([]);
    g.fillStyle = mode === 'storm' ? '#86b86a' : '#9cc47e';
    for (const poly of POLY) { g.beginPath(); poly.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.closePath(); g.fill(); }
    g.fillStyle = '#eef3f6'; g.fillRect(0, Y(-66), W, H - Y(-66));
    if (mode === 'quake') {
      g.strokeStyle = '#e11d48'; g.lineWidth = 2.5; g.lineJoin = 'round';
      for (const l of EDGES) { g.beginPath(); l.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.stroke(); }
    }
  });
}

// A spiral storm seen from above (white cloud bands with a clear eye), on a transparent background.
function paintSpiral(THREE) {
  const t = canvasTex(THREE, 256, 256, (g, W) => {
    const c = W / 2;
    g.translate(c, c);
    for (let arm = 0; arm < 3; arm++) {
      for (let k = 0; k < 60; k++) {
        const u = k / 60, r = 18 + u * 100, a = arm * (Math.PI * 2 / 3) + u * 3.2;
        g.fillStyle = `rgba(255,255,255,${0.85 - u * 0.6})`;
        g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 16 - u * 9, 0, Math.PI * 2); g.fill();
      }
    }
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath(); g.arc(0, 0, 34, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fill();
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
