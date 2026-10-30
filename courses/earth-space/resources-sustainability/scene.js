// Natural resources and sustainability (grade 9): renewable and non-renewable resources, why fuels and ores
// are found only in some places (a cross-section that a time slider runs from 300 million years ago to today),
// a model town's electricity (coal and gas CO2, then a solar/wind/hydro mix with a gas backup, day and night),
// world population growth, aluminium recycling, and protecting soil and water on a farm.
// Six stations sit far apart along x (the town is used twice); each step shows one. All motion comes from dt / t.
import { rand, makeSun, planetTexture } from '../_shared/sky.js';
import { makeCloud, makeRain, makeFlow } from '../_shared/atmos.js';
import { canvasTex } from '../_shared/geo.js';

const SX = [0, 40, 80, 120, 160, 200];
const DEMAND = 40;                           // MW, all day and night
const CO2 = { coal: 1.0, gas: 0.45 };        // tonnes of CO2 per MWh (about 1 kg and 0.45 kg per kWh)
const POP = [[1800, 1.0], [1850, 1.26], [1900, 1.65], [1927, 2.0], [1950, 2.5], [1960, 3.0], [1974, 4.0], [1987, 5.0], [1999, 6.0], [2011, 7.0], [2022, 8.0], [2037, 9.0], [2050, 9.7]];
const popAt = y => { for (let i = 1; i < POP.length; i++) if (y <= POP[i][0]) { const [y0, p0] = POP[i - 1], [y1, p1] = POP[i]; return p0 + (p1 - p0) * (y - y0) / (y1 - y0); } return 9.7; };
const smooth = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  scene.background = new THREE.Color(0xdff1ff);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8fa6b8, 1.6), sunL = new THREE.DirectionalLight(0xffffff, 2.2);
  sunL.position.set(-5, 10, 6);
  scene.add(hemi, sunL);
  const stations = SX.map(x => { const g = new THREE.Group(); g.position.x = x; scene.add(g); return g; });
  const L = {};
  const lab = (name, text, at, cls) => { L[name] = label(text, at, { cls }); L[name].show(false); return L[name]; };
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const std = (c, o = {}) => kit.mat(c, o);
  const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const box = (w, h, d, m, pos, parent) => { const b = kit.mesh(new THREE.BoxGeometry(w, h, d), m, pos, parent); b.castShadow = b.receiveShadow = false; return b; };
  const cyl = (rt, rb, h, m, pos, parent, seg = 12) => kit.mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, pos, parent);
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v0 = new THREE.Vector3(), s0 = new THREE.Vector3(1, 1, 1);
  const st = { step: 0, demo: null };
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0x000000 });
  const house = (parent, x, z, s = 0.34, wall = 0xf1e4d0, roof = 0xc2410c) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    box(s, s * 0.8, s, std(wall), [0, s * 0.4, 0], g);
    box(s * 0.3, s * 0.25, 0.01, windowMat, [0, s * 0.42, s / 2 + 0.006], g);
    const r = kit.mesh(new THREE.ConeGeometry(s * 0.78, s * 0.5, 4), std(roof), [0, s * 0.8 + s * 0.25, 0], g);
    r.rotation.y = Math.PI / 4;
    parent.add(g);
    return g;
  };
  function turbine(parent, x, z, h = 1.6) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    cyl(0.03, 0.06, h, std(0xf1f5f9), [0, h / 2, 0], g, 8);
    box(0.1, 0.1, 0.22, std(0xe2e8f0), [0, h, 0], g);
    const rotor = new THREE.Group();
    rotor.position.set(0, h, 0.13);
    g.add(rotor);
    for (let i = 0; i < 3; i++) { const b = box(0.06, h * 0.42, 0.02, std(0xffffff), [0, h * 0.21, 0], new THREE.Group()); const arm = b.parent; arm.rotation.z = (i * Math.PI * 2) / 3; rotor.add(arm); }
    parent.add(g);
    return { obj: g, rotor };
  }
  function solarPanel(parent, x, z, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    box(0.04, 0.18 * s, 0.04, std(0x64748b), [0, 0.09 * s, 0], g);
    const p = box(0.5 * s, 0.03, 0.34 * s, std(0x1e40af, { metalness: 0.4, roughness: 0.3 }), [0, 0.2 * s, 0], g);
    p.rotation.x = 0.55;                                  // tilted up toward the sunny side (and the viewer)
    parent.add(g);
    return g;
  }
  // smoke puffs rising from a chimney top; setAmount(0..1) scales them
  function smoke(parent, x, y, z, color, n = 12, seed = 0) {
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 0.85 }), n);
    mesh.frustumCulled = false;
    mesh.position.set(x, y, z);
    parent.add(mesh);
    const o = { amount: 1 };
    o.tick = t => {
      for (let i = 0; i < n; i++) {
        const u = ((t * 0.25 + i / n + rand(seed + i) * 0.05) % 1 + 1) % 1, sc = o.amount < 0.02 ? 0.0001 : (0.4 + u * 1.6) * (0.35 + 0.65 * o.amount);
        m4.compose(v0.set(u * 0.9 + Math.sin(i * 1.9) * 0.08, u * 2.2, Math.cos(i * 2.3) * 0.08), q0, s0.set(sc, sc * 0.85, sc));
        mesh.setMatrixAt(i, m4);
      }
      s0.set(1, 1, 1);
      mesh.instanceMatrix.needsUpdate = true;
    };
    o.mesh = mesh;
    return o;
  }

  // =========================================================== 0. Resources landscape
  const S0 = stations[0];
  box(12.4, 0.3, 7.4, std(0x7a5a3c), [0, -0.15, 0], S0);
  box(12.4, 0.02, 7.4, std(0x9ccf7c), [0, 0.01, 0], S0);
  const sun0 = makeSun(THREE, 0.55);
  sun0.position.set(-4.6, 3.6, -2.4);
  S0.add(sun0);
  const items = [];
  const item = (key, group, text, x, z, r) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.12, 40), basic({ ren: 0x22c55e, non: 0xf97316, care: 0x06b6d4 }[group], { transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.035, z);
    S0.add(ring);
    lab('i_' + key, text, anchor(S0, x, 1.25, z), group === 'non' ? 'warm' : 'cool');
    items.push({ key, group, ring });
  };
  // renewable
  const panels0 = [];
  for (let i = 0; i < 6; i++) panels0.push(solarPanel(S0, -5.0 + (i % 3) * 0.55, 1.1 + Math.floor(i / 3) * 0.5));
  item('sun', 'ren', 'Sunlight', -4.45, 1.35, 1.0);
  const turbines0 = [turbine(S0, -4.9, -1.6), turbine(S0, -3.9, -1.2, 1.4)];
  item('wind', 'ren', 'Wind', -4.4, -1.4, 0.95);
  // river flowing across the middle back
  const riverPts = [[-2.8, 0.04, -3.6], [-2.2, 0.04, -2.4], [-1.4, 0.04, -1.6], [-1.6, 0.04, -0.4], [-1.2, 0.04, 0.6]];
  {
    const curve = new THREE.CatmullRomCurve3(riverPts.map(p => new THREE.Vector3(...p)));
    const r = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.22, 6, false), std(0x3b82c4, { roughness: 0.3 }));
    r.scale.y = 0.15;
    S0.add(r);
  }
  const riverFlow = makeFlow(THREE, riverPts.map(p => [p[0], 0.09, p[2]]), { count: 16, color: 0xe0f2fe, size: 0.05, speed: 0.6, seed: 3 });
  S0.add(riverFlow.obj);
  item('river', 'ren', 'Flowing water', -1.9, -2.0, 0.7);
  // renewable if used carefully
  const lake = kit.mesh(new THREE.CircleGeometry(0.85, 32), std(0x2f80d0, { roughness: 0.25 }), [-1.0, 0.03, 1.4], S0);
  lake.rotation.x = -Math.PI / 2;
  item('lake', 'care', 'Fresh water', -1.0, 1.4, 1.0);
  {
    const n = 18, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), std(0x6b4f2a), n), crown = new THREE.InstancedMesh(new THREE.ConeGeometry(0.24, 0.6, 7), std(0x2e7d32, { flatShading: true }), n);
    for (let i = 0; i < n; i++) {
      const a = rand(i * 2.1) * Math.PI * 2, r = Math.sqrt(rand(i * 3.7)) * 0.8, x = 1.2 + Math.cos(a) * r, z = -1.9 + Math.sin(a) * r, s = 0.8 + rand(i * 5.3) * 0.5;
      m4.compose(v0.set(x, 0.15 * s, z), q0, s0.set(s, s, s)); trunk.setMatrixAt(i, m4);
      m4.compose(v0.set(x, 0.55 * s, z), q0, s0); crown.setMatrixAt(i, m4);
    }
    s0.set(1, 1, 1);
    S0.add(trunk, crown);
  }
  item('forest', 'care', 'Forests', 1.2, -1.9, 1.05);
  {
    const field = new THREE.Group();
    field.position.set(1.3, 0, 1.6);
    S0.add(field);
    box(1.6, 0.06, 1.2, std(0x7a5232), [0, 0.03, 0], field);
    for (let i = 0; i < 5; i++) box(1.5, 0.08, 0.08, std(0x65a83a), [0, 0.08, -0.48 + i * 0.24], field);
  }
  item('soil', 'care', 'Soil', 1.3, 1.6, 1.05);
  // non-renewable
  {
    const mine = new THREE.Group();
    mine.position.set(4.5, 0, -1.8);
    S0.add(mine);
    box(0.08, 1.1, 0.08, std(0x475569), [-0.25, 0.55, 0], mine);
    box(0.08, 1.1, 0.08, std(0x475569), [0.25, 0.55, 0], mine);
    const wheel = kit.mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 16), std(0x1f2937), [0, 1.15, 0], mine);
    wheel.rotation.y = Math.PI / 2;
    const pile = kit.mesh(new THREE.ConeGeometry(0.45, 0.35, 10), std(0x1c1917, { flatShading: true }), [0.75, 0.17, 0.3], mine);
    pile.rotation.y = 0.3;
  }
  item('coal', 'non', 'Coal', 4.6, -1.7, 0.95);
  const jack = new THREE.Group();
  jack.position.set(4.3, 0, 0.7);
  S0.add(jack);
  box(0.9, 0.08, 0.3, std(0x52525b), [0, 0.04, 0], jack);
  box(0.08, 0.5, 0.08, std(0x52525b), [0, 0.3, 0], jack);
  const beam = new THREE.Group();
  beam.position.set(0, 0.56, 0);
  jack.add(beam);
  box(1.0, 0.07, 0.07, std(0xf59e0b), [0, 0, 0], beam);
  box(0.12, 0.22, 0.09, std(0xf59e0b), [0.52, -0.06, 0], beam);
  box(0.02, 0.5, 0.02, std(0x1f2937), [0.58, -0.3, 0], beam);
  item('oil', 'non', 'Oil and gas', 4.3, 0.7, 0.85);
  {
    const ore = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.16, 0), std(0x9a7b5b, { flatShading: true, metalness: 0.3 }), 14);
    const gold = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.05, 0), std(0xfacc15, { metalness: 0.8, roughness: 0.3, emissive: 0x6b4f00 }), 10);
    for (let i = 0; i < 14; i++) { const a = rand(i * 1.9) * 6.28, r = rand(i * 2.9) * 0.45; m4.compose(v0.set(4.1 + Math.cos(a) * r, 0.1 + (0.45 - r) * 0.5, 2.6 + Math.sin(a) * r), q0, s0); ore.setMatrixAt(i, m4); }
    for (let i = 0; i < 10; i++) { const a = rand(i * 4.9) * 6.28, r = rand(i * 6.9) * 0.4; m4.compose(v0.set(4.1 + Math.cos(a) * r, 0.2 + (0.45 - r) * 0.5, 2.6 + Math.sin(a) * r), q0, s0); gold.setMatrixAt(i, m4); }
    S0.add(ore, gold);
  }
  item('ore', 'non', 'Metal ore', 4.1, 2.6, 0.75);
  const GROUP_TEXT = {
    ren: '<b>Renewable</b>: sunlight, wind and flowing water are renewed all the time, however much we use.',
    non: '<b>Non-renewable</b>: coal, oil, natural gas and metal ores took millions of years to form. Metals can be recycled, but fuels are gone once burned.',
    care: '<b>Renewable if used carefully</b>: forests, fresh water and soil are renewed by nature, but only if we use them more slowly than they are replaced.',
  };
  function group0(g) {
    st.group = g;
    items.forEach(it => { it.ring.visible = it.group === g; if (st.step === 0) L['i_' + it.key].show(it.group === g); });
    if (st.step === 0) ui.readout(GROUP_TEXT[g]);
  }

  // =========================================================== 1. Cross-section through time
  const S1 = stations[1];
  const XW = 10, YH = 3, CW = 512, CH = 154;           // block size and its painted face (px)
  const geoCanvas = document.createElement('canvas');
  geoCanvas.width = CW; geoCanvas.height = CH;
  const geoTex = new THREE.CanvasTexture(geoCanvas);
  geoTex.colorSpace = THREE.SRGBColorSpace;
  box(XW, YH, 2.4, std(0x7c6a58), [0, -YH / 2, 0], S1);
  const topMat = std(0x8fbf6a);
  box(XW, 0.04, 2.4, topMat, [0, 0.02, 0], S1);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(XW, YH), new THREE.MeshBasicMaterial({ map: geoTex }));
  face.position.set(0, -YH / 2, 1.201);
  S1.add(face);
  const pxX = px => (px / CW) * XW - XW / 2, pxY = py => -(py / CH) * YH;
  const swamp = new THREE.Group();
  S1.add(swamp);
  for (let i = 0; i < 9; i++) {
    const x = -4.6 + i * 0.42 + rand(i) * 0.2, z = -0.8 + rand(i * 3) * 1.6, h = 0.6 + rand(i * 5) * 0.4;
    cyl(0.04, 0.06, h, std(0x5b4a2a), [x, h / 2, z], swamp, 6);
    kit.mesh(new THREE.IcosahedronGeometry(0.22, 0), std(0x3f7d2a, { flatShading: true }), [x, h, z], swamp);
  }
  const seaTop = box(XW * 0.55, 0.06, 2.4, std(0x3b82c4, { transparent: true, opacity: 0.85 }), [XW * 0.225, 0.07, 0], S1);
  const today = new THREE.Group();
  S1.add(today);
  {
    const coalX = pxX(110), oilX = pxX(300), oreX = pxX(440);
    box(0.06, 0.9, 0.06, std(0x475569), [coalX - 0.2, 0.45, 0.3], today);
    box(0.06, 0.9, 0.06, std(0x475569), [coalX + 0.2, 0.45, 0.3], today);
    const w = kit.mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 16), std(0x1f2937), [coalX, 0.95, 0.3], today); w.rotation.y = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const leg = box(0.04, 1.3, 0.04, std(0xb91c1c), [oilX + (i % 2 ? 0.18 : -0.18), 0.6, 0.3 + (i < 2 ? 0.18 : -0.18)], today); leg.rotation.z = i % 2 ? 0.13 : -0.13; }
    box(0.03, 1.4, 0.03, std(0x1f2937), [oilX, 0.7, 0.3], today);
    const pit = kit.mesh(new THREE.ConeGeometry(0.5, 0.3, 10, 1, true), std(0xa16207, { side: THREE.DoubleSide }), [oreX, 0.12, 0.3], today);
    pit.rotation.x = Math.PI;
    box(0.4, 0.2, 0.25, std(0xfacc15), [oreX + 0.6, 0.1, 0.5], today);
  }
  const aCoal = anchor(S1, 0, 0, 1.2), aOil = anchor(S1, 0, 0, 1.2), aCap = anchor(S1, 0, 0, 1.2), aOre = anchor(S1, 0, 0, 1.2);
  lab('coal', 'Coal seam', aCoal, 'warm');
  lab('oil', 'Oil and gas', aOil, 'warm');
  lab('cap', 'Cap rock', aCap);
  lab('ore', 'Ore veins', aOre, 'warm');
  lab('swamp', 'Swamp forest', anchor(swamp, -3, 1.2, 0), 'cool');
  st.ma = 300; st.maShown = 300;
  function paintGeo() {
    const g = geoCanvas.getContext('2d'), p = 1 - st.maShown / 300, W = CW, H = CH;
    const y0 = 6, cover = p * 62, A = 26 * smooth(0.3, 0.55, p), cx = 300;
    const bell = x => Math.exp(-(((x - cx) / 62) ** 2));
    const fold = (x, y) => A * bell(x) * Math.min(1, Math.max(0, (y - y0 - cover * 0.6) / 30));
    const band = (yTop, yBot, fill, x0 = 0, x1 = W) => {
      g.fillStyle = fill; g.beginPath();
      for (let x = x0; x <= x1; x += 8) g.lineTo(x, yTop - fold(x, yTop));
      for (let x = x1; x >= x0; x -= 8) g.lineTo(x, yBot - fold(x, yBot));
      g.closePath(); g.fill();
    };
    g.fillStyle = '#6b6259'; g.fillRect(0, 0, W, H);          // basement rock
    // younger layers piled on top as time passes
    const covers = ['#d9b67c', '#b59a7a', '#e2c38d', '#a8927a'];
    for (let i = 0; i < 4; i++) band(y0 + (cover * i) / 4, y0 + (cover * (i + 1)) / 4 + 0.5, covers[i]);
    let y = y0 + cover;
    const swampT = 16 - 9 * smooth(0.05, 0.4, p);
    const sc = [Math.round(90 - 70 * smooth(0.05, 0.4, p)), Math.round(110 - 92 * smooth(0.05, 0.4, p)), Math.round(50 - 32 * smooth(0.05, 0.4, p))];
    band(y, y + swampT, `rgb(${sc[0]},${sc[1]},${sc[2]})`, 0, 205);
    band(y, y + swampT, '#8e9a90', 205, W);                     // sea mud at the same time
    y += swampT;
    band(y, y + 16, '#7a7f87'); const capTop = y; y += 16;    // cap rock (shale that oil cannot pass)
    band(y, y + 18, '#e0b96f'); const resTop = y; y += 18;    // porous sandstone
    band(y, y + 14, '#3f4a3c'); const srcTop = y; y += 14;    // source rock (dark mud with plankton)
    // plankton specks in the source rock, turning into oil drops that rise into the fold
    const rise = smooth(0.45, 0.8, p);
    for (let i = 0; i < 70; i++) {
      const x0 = 150 + rand(i * 2.7) * 300, yS = srcTop + 3 + rand(i * 3.1) * 8;
      const xT = cx + (rand(i * 5.3) - 0.5) * 70 * (1 - rise * 0.3), yT = resTop + 4 + rand(i * 7.1) * 11;
      const x = x0 + (xT - x0) * rise, yy = yS + (yT - yS) * rise;
      g.fillStyle = p < 0.4 ? 'rgba(170,220,140,0.9)' : (i % 5 === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(25,20,15,0.95)');
      g.beginPath(); g.arc(x, yy - fold(x, yy), p < 0.4 ? 1.6 : 2.6, 0, Math.PI * 2); g.fill();
    }
    // magma rising on the right, cooling into granite, with ore veins
    const up = smooth(0.55, 0.75, p), cool = smooth(0.78, 0.9, p);
    if (up > 0) {
      const by = H + 10 - up * 70;
      g.fillStyle = cool > 0.5 ? '#d9a3a0' : `rgb(255,${Math.round(110 + 60 * cool)},${Math.round(40 + 100 * cool)})`;
      g.beginPath(); g.ellipse(445, by, 48, 40, 0, 0, Math.PI * 2); g.fill();
      const vein = smooth(0.72, 0.92, p);
      if (vein > 0) {
        g.strokeStyle = '#facc15'; g.lineWidth = 3; g.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const ax = 410 + i * 14, ay = by - 30, len = vein * (28 + rand(i * 9) * 26);
          g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + (rand(i * 3) - 0.5) * 30 * vein, ay - len); g.stroke();
        }
      }
    }
    geoTex.needsUpdate = true;
    // labels follow the layers
    aCoal.position.set(pxX(100), pxY(y0 + cover + swampT / 2 - fold(100, 0)), 1.2);
    aCap.position.set(pxX(cx + 80), pxY(capTop + 8 - fold(cx + 80, capTop)), 1.2);
    aOil.position.set(pxX(cx), pxY(resTop + 9 - A), 1.2);
    aOre.position.set(pxX(445), pxY(H + 10 - up * 70 - 62), 1.2);
    const live = st.step === 1;
    L.coal.show(live && p > 0.35); L.cap.show(live && p > 0.3 && p < 0.75); L.oil.show(live && p > 0.7); L.ore.show(live && p > 0.85);
    swamp.visible = p < 0.08; seaTop.visible = p < 0.3;
    L.swamp.show(live && swamp.visible);
    topMat.color.setHex(p < 0.08 ? 0x6f9a4a : 0x9ccf7c);
    today.visible = p > 0.985;
  }
  function geoReadout() {
    if (st.step !== 1) return;
    const ma = Math.round(st.ma / 10) * 10, p = 1 - ma / 300;
    const what = p < 0.08 ? 'Swamp forests grow by a shallow sea. Plankton lives in the sea and sinks into the mud.'
      : p < 0.4 ? 'Sand and mud bury the swamp. Under the weight, the dead plants become peat, then coal.'
        : p < 0.55 ? 'The rock layers are pushed into an upward fold (an anticline). The buried plankton is heated.'
          : p < 0.75 ? 'Heat and pressure turn the plankton into oil and gas, which rise through the sandstone until the cap rock stops them.'
            : p < 0.98 ? 'Magma rises and cools into granite. Hot fluids leave metal minerals in cracks: ore veins.'
              : 'Today: people mine the coal, drill the oil and dig the ore, but only where these deposits formed.';
    ui.readout(`Time: <b>${ma === 0 ? 'today' : ma + ' million years ago'}</b><br>${what}`);
  }

  // =========================================================== 2 & 3. The town's electricity
  const S2 = stations[2];
  box(16, 0.3, 8, std(0x7a5a3c), [0, -0.15, 0], S2);
  box(16, 0.02, 8, std(0x9ccf7c), [0, 0.01, 0], S2);
  const town = new THREE.Group();
  S2.add(town);
  [[-0.9, -0.6], [-0.3, 0.2], [0.4, -0.5], [1.0, 0.3], [-0.6, 1.0], [0.3, 1.1], [1.1, -1.2], [-1.1, -1.5], [0.0, -1.4]].forEach(([x, z], i) => house(town, x, z, 0.36 + rand(i) * 0.12, [0xf1e4d0, 0xdfe7ee, 0xf6d9a8][i % 3]));
  lab('town', 'Town: needs 40 MW', anchor(town, 0, 1.0, 0), 'warm');
  // coal power station
  const coalP = new THREE.Group();
  coalP.position.set(-5.4, 0, -1.2);
  S2.add(coalP);
  box(1.3, 0.8, 0.9, std(0x94a3b8), [0, 0.4, 0], coalP);
  cyl(0.12, 0.16, 2.2, std(0x7f1d1d), [0.45, 1.1, -0.2], coalP);
  const tower = kit.mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.2, 16, 1, true), std(0xd6d3d1, { side: THREE.DoubleSide }), [-1.1, 0.6, 0.1], coalP);
  tower.scale.x = 1;
  kit.mesh(new THREE.ConeGeometry(0.6, 0.45, 10), std(0x1c1917, { flatShading: true }), [0.2, 0.22, 0.95], coalP);
  const coalSmoke = smoke(coalP, 0.45, 2.25, -0.2, 0x57534e, 12, 1);
  lab('coalP', 'Coal', anchor(coalP, 0, 2.6, 0), 'warm');
  // gas power station
  const gasP = new THREE.Group();
  gasP.position.set(-3.0, 0, 1.4);
  S2.add(gasP);
  box(1.0, 0.6, 0.7, std(0xcbd5e1), [0, 0.3, 0], gasP);
  cyl(0.08, 0.1, 1.4, std(0x64748b), [0.32, 0.7, 0], gasP);
  cyl(0.25, 0.25, 0.5, std(0xe2e8f0), [-0.75, 0.25, 0.1], gasP, 14);
  const gasSmoke = smoke(gasP, 0.32, 1.42, 0, 0xcbd5e1, 12, 30);
  lab('gasP', 'Gas', anchor(gasP, 0, 1.8, 0), 'warm');
  // CO2 stack: each block = 100 tonnes per day
  const co2Blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.22, 0.42), std(0x52525b, { transparent: true, opacity: 0.85 }), 10);
  co2Blocks.frustumCulled = false;
  for (let i = 0; i < 10; i++) { m4.compose(v0.set(-6.9 + (i % 2) * 0.48, 0.12 + Math.floor(i / 2) * 0.25, 1.1), q0, s0); co2Blocks.setMatrixAt(i, m4); }
  S2.add(co2Blocks);
  const co2Top = anchor(S2, -6.65, 0.4, 1.1);
  lab('co2', 'CO₂ per day', co2Top);
  // renewables
  const NPAN = 48, panels = [];
  for (let i = 0; i < NPAN; i++) panels.push(solarPanel(S2, 2.6 + (i % 8) * 0.55, 1.0 + Math.floor(i / 8) * 0.42, 0.9));
  lab('solar', 'Solar', anchor(S2, 4.5, 0.9, 2.2), 'cool');
  const TPOS = [[3.0, -1.4], [3.9, -2.2], [4.8, -1.3], [5.7, -2.3], [6.5, -1.2], [3.3, -3.2], [5.0, -3.3], [6.6, -3.0]];
  const turbines = TPOS.map(([x, z], i) => turbine(S2, x, z, 1.5 + rand(i) * 0.3));
  lab('wind', 'Wind', anchor(S2, 4.8, 2.3, -2.2), 'cool');
  // hydro: a dam across a valley with a reservoir and water rushing out
  const hydro = new THREE.Group();
  hydro.position.set(-0.6, 0, -3.0);
  S2.add(hydro);
  box(2.2, 0.5, 1.0, std(0x6b8e4e), [-1.4, 0.25, 0], hydro);
  box(2.2, 0.5, 1.0, std(0x6b8e4e), [1.4, 0.25, 0], hydro);
  box(0.6, 0.6, 0.18, std(0xa8a29e), [0, 0.3, 0.1], hydro);
  box(0.6, 0.02, 0.9, std(0x2f80d0), [0, 0.45, -0.45], hydro);
  const hydroFlow = makeFlow(THREE, [[0, 0.2, 0.25], [0.05, 0.06, 0.8], [0.3, 0.05, 1.5], [0.9, 0.05, 2.2]], { count: 20, color: 0x7dd3fc, size: 0.07, speed: 1.2, seed: 9 });
  hydro.add(hydroFlow.obj);
  lab('hydro', 'Hydro dam', anchor(hydro, 0, 1.3, -0.2), 'cool');
  const sun2 = makeSun(THREE, 0.5);
  sun2.position.set(1.5, 4.2, -4);
  S2.add(sun2);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf1f5f9 }));
  moon.position.set(1.5, 4.2, -4);
  S2.add(moon);
  st.coal = 0.75; st.solar = 20; st.wind = 10; st.hydro = 5; st.night = false; st.windy = true;
  const SKY_DAY = new THREE.Color(0xdff1ff), SKY_NIGHT = new THREE.Color(0x1b2847);
  function setNight(n) {
    st.night = n;
    scene.background.copy(n ? SKY_NIGHT : SKY_DAY);
    hemi.intensity = n ? 0.55 : 1.6; sunL.intensity = n ? 0.35 : 2.2;
    sun2.visible = !n; moon.visible = n;
    windowMat.emissive.setHex(n ? 0xfbbf24 : 0x000000);
  }
  const mix = () => {
    const w = st.windy ? st.wind : 0;
    const day = st.solar + w + st.hydro, night = w + st.hydro;
    const gapD = Math.max(0, DEMAND - day), gapN = Math.max(0, DEMAND - night);
    return { w, now: st.night ? night : day, gapNow: st.night ? gapN : gapD, co2: 12 * (gapD + gapN) * CO2.gas };
  };
  function applyPower() {
    const s = st.step;
    if (s === 2) {
      coalSmoke.amount = st.coal; gasSmoke.amount = 1 - st.coal;
      const t = DEMAND * 24 * (st.coal * CO2.coal + (1 - st.coal) * CO2.gas);
      co2Blocks.count = Math.round(t / 100);
      co2Top.position.y = 0.3 + Math.ceil(co2Blocks.count / 2) * 0.25;
      panels.forEach(p => { p.visible = false; }); turbines.forEach(tb => { tb.obj.visible = false; }); hydro.visible = false;
    } else {
      const m = mix();
      coalSmoke.amount = 0;
      gasSmoke.amount = m.gapNow / DEMAND;
      co2Blocks.count = 0;
      const np = Math.round(st.solar / 5) * 4;
      panels.forEach((p, i) => { p.visible = i < np; });
      turbines.forEach((tb, i) => { tb.obj.visible = i < Math.round(st.wind / 5); });
      hydro.visible = st.hydro > 0;
      hydroFlow.setCount(Math.round(st.hydro));
    }
  }
  function coalReadout() {
    if (st.step !== 2) return;
    const c = st.coal, cm = DEMAND * 24 * c, gm = DEMAND * 24 * (1 - c), t = cm * CO2.coal + gm * CO2.gas;
    ui.readout(`Coal <b>${Math.round(c * 100)}%</b> (${Math.round(cm)} MWh), gas <b>${Math.round((1 - c) * 100)}%</b> (${Math.round(gm)} MWh) of 960 MWh a day.<br>CO₂: <b>about ${Math.round(t / 10) * 10} tonnes per day</b> (model: coal 1 t, gas 0.45 t per MWh). Each grey block = 100 t.`);
  }
  function mixReadout() {
    if (st.step !== 3) return;
    const m = mix();
    const now = `${st.night ? 'Night' : 'Day'}${st.windy ? ', windy' : ', no wind'}: solar ${st.night ? 0 : st.solar} + wind ${m.w} + hydro ${st.hydro} = <b>${st.night ? m.w + st.hydro : st.solar + m.w + st.hydro} MW</b> of 40 MW.`;
    const gap = m.gapNow > 0 ? `Without the gas station the town would be <b>${m.gapNow} MW short</b>, so gas makes ${m.gapNow} MW.` : (m.now > DEMAND ? `Enough, with <b>${m.now - DEMAND} MW spare</b> (it could charge batteries). Gas is off.` : 'Exactly enough. Gas is off.');
    ui.readout(`${now}<br>${gap}<br>CO₂ on a day like this: <b>about ${Math.round(m.co2)} t</b> (model)`);
  }

  // =========================================================== 4. Population
  const S4 = stations[3];
  kit.mesh(new THREE.CylinderGeometry(3.4, 3.5, 0.3, 48), std(0x9ccf7c), [0, -0.15, 0], S4);
  const globe = kit.mesh(new THREE.SphereGeometry(0.75, 32, 20), new THREE.MeshStandardMaterial({ map: planetTexture(THREE, 'earth'), roughness: 0.9 }), [0, 0.95, 0], S4);
  kit.mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.2, 16), std(0x64748b), [0, 0.1, 0], S4);
  const NF = 98, spots = [];
  for (let i = 0; i < NF; i++) { const r = 1.05 + Math.sqrt(i / NF) * 2.15, a = i * 2.39996; spots.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const fig = (opacity) => {
    const mat = o => new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, roughness: 0.7, ...o });
    const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 0.3, 8), mat({}), NF);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), mat({}), NF);
    body.frustumCulled = head.frustumCulled = false;
    S4.add(body, head);
    const c = new THREE.Color(), skin = [0xf2c9a0, 0xc68642, 0x8d5524, 0xe0ac69];
    for (let i = 0; i < NF; i++) { body.setColorAt(i, c.setHSL(rand(i * 3.3), 0.6, 0.55)); head.setColorAt(i, c.setHex(skin[i % 4])); }
    return { body, head };
  };
  const solid = fig(1), ghostF = fig(0.35);
  st.year = 1800; st.figShown = 10;
  function placeFigs() {
    const n = st.figShown, solidN = st.year > 2022 ? Math.min(n, 80) : n;
    for (const [set, from, to] of [[solid, 0, solidN], [ghostF, solidN, n]]) {
      let k = 0;
      for (let i = Math.floor(from); i < Math.ceil(to) && i < NF; i++, k++) {
        const sc = Math.max(0.001, Math.min(1, to - i)), [x, z] = spots[i];
        m4.compose(v0.set(x, 0.15 * sc, z), q0, s0.set(sc, sc, sc)); set.body.setMatrixAt(k, m4);
        m4.compose(v0.set(x, 0.38 * sc, z), q0, s0); set.head.setMatrixAt(k, m4);
      }
      set.body.count = set.head.count = k;
      set.body.instanceMatrix.needsUpdate = set.head.instanceMatrix.needsUpdate = true;
    }
    s0.set(1, 1, 1);
  }
  lab('earth', 'Each figure = 100 million people', anchor(S4, 0, 2.0, 0), 'warm');
  function popReadout() {
    if (st.step !== 4) return;
    const y = Math.round(st.year), p = popAt(y);
    ui.readout(`Year <b>${y}</b>: about <b>${p.toFixed(1)} billion</b> people${y > 2022 ? ' (UN projection)' : ''}.<br>${Math.round(p * 10)} figures × 100 million.`);
  }

  // =========================================================== 5. Recycling aluminium cans
  const S5 = stations[4];
  box(11, 0.3, 6.6, std(0x7a5a3c), [0, -0.15, 0], S5);
  box(11, 0.02, 6.6, std(0xb5d39a), [0, 0.01, 0], S5);
  const P5 = { factory: [-3.4, -1.3], shop: [0.4, -1.8], bin: [3.2, -0.2], plant: [0.2, 1.9], landfill: [3.9, 2.2], mine: [-4.3, 1.9] };
  {
    const f = new THREE.Group(); f.position.set(P5.factory[0], 0, P5.factory[1]); S5.add(f);
    box(1.5, 0.8, 1.0, std(0xcbd5e1), [0, 0.4, 0], f);
    cyl(0.1, 0.13, 1.4, std(0x64748b), [0.5, 0.9, -0.3], f);
    for (let i = 0; i < 3; i++) { const r = box(0.5, 0.25, 1.0, std(0x94a3b8), [-0.5 + i * 0.5, 0.9, 0], f); r.rotation.z = 0.35; }
    const s = new THREE.Group(); s.position.set(P5.shop[0], 0, P5.shop[1]); S5.add(s);
    box(0.9, 0.55, 0.6, std(0xfde68a), [0, 0.28, 0], s);
    box(1.0, 0.06, 0.75, std(0xdc2626), [0, 0.58, 0.05], s);
    const b = new THREE.Group(); b.position.set(P5.bin[0], 0, P5.bin[1]); S5.add(b);
    cyl(0.28, 0.24, 0.6, std(0x16a34a), [0, 0.3, 0], b, 14);
    house(S5, P5.bin[0] + 0.9, P5.bin[1] - 0.6, 0.55);
    const pl = new THREE.Group(); pl.position.set(P5.plant[0], 0, P5.plant[1]); S5.add(pl);
    box(1.2, 0.6, 0.8, std(0x86efac), [0, 0.3, 0], pl);
    box(0.5, 0.35, 0.5, std(0x22c55e), [0.4, 0.75, 0], pl);
  }
  const landfill = kit.mesh(new THREE.SphereGeometry(0.9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x8b7355, { flatShading: true }), [P5.landfill[0], 0, P5.landfill[1]], S5);
  const orePile = kit.mesh(new THREE.ConeGeometry(0.8, 0.8, 12), std(0xb45309, { flatShading: true }), [P5.mine[0], 0.4, P5.mine[1]], S5);
  const energyBar = box(0.36, 1, 0.36, std(0xfacc15, { emissive: 0x6b4f00 }), [-4.9, 0.5, -1.3], S5);
  box(0.42, 0.02, 0.42, std(0x334155), [-4.9, 0.02, -1.3], S5);
  const eTop = anchor(S5, -4.9, 2.1, -1.3);
  lab('energy', 'Energy', eTop, 'warm');
  lab('factory', 'Can factory', anchor(S5, P5.factory[0], 1.7, P5.factory[1]));
  lab('bin', 'Recycling bin', anchor(S5, P5.bin[0], 0.9, P5.bin[1]), 'cool');
  lab('plant', 'Recycling plant', anchor(S5, P5.plant[0], 1.2, P5.plant[1]), 'cool');
  lab('landfill', 'Landfill', anchor(landfill, 0, 1.0, 0));
  lab('mine', 'Bauxite ore', anchor(S5, P5.mine[0], 1.0, P5.mine[1]), 'warm');
  const canGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.26, 10);
  const canFlow = (pts, n, color, seed) => {
    const f = makeFlow(THREE, pts, { count: n, color, size: 0.08, speed: 1.1, seed });
    f.obj.geometry.dispose();
    f.obj.geometry = canGeo;
    S5.add(f.obj);
    return f;
  };
  const Y5 = 0.18;
  const fMain = canFlow([[P5.factory[0] + 0.8, Y5, P5.factory[1]], [P5.shop[0], Y5, P5.shop[1] + 0.4], [2.2, Y5, -1.0], [P5.bin[0] - 0.3, Y5, P5.bin[1]]], 16, 0xd1d5db, 1);
  const fRec = canFlow([[P5.bin[0], Y5, P5.bin[1] + 0.3], [1.8, Y5, 1.2], [P5.plant[0] + 0.6, Y5, P5.plant[1]], [-1.4, Y5, 1.4], [-2.6, Y5, 0.2], [P5.factory[0] + 0.2, Y5, P5.factory[1] + 0.6]], 22, 0x4ade80, 2);
  const fLand = canFlow([[P5.bin[0] + 0.2, Y5, P5.bin[1] + 0.3], [3.6, Y5, 1.0], [P5.landfill[0], 0.6, P5.landfill[1]]], 10, 0x9ca3af, 3);
  const fOre = makeFlow(THREE, [[P5.mine[0] + 0.3, 0.12, P5.mine[1] - 0.5], [-4.0, 0.12, 0.4], [P5.factory[0] - 0.4, 0.12, P5.factory[1] + 0.6]], { count: 12, color: 0xb45309, size: 0.09, speed: 0.8, seed: 4 });
  S5.add(fOre.obj);
  st.rec = 0.3; st.recShown = 0.3;
  function applyRec() {
    const r = st.recShown, e = 1 - 0.95 * r;
    fRec.setCount(Math.round(22 * r)); fLand.setCount(Math.round(10 * (1 - r))); fOre.setCount(Math.round(12 * (1 - r)));
    landfill.scale.set(0.3 + 0.7 * (1 - r), 0.15 + 0.85 * (1 - r), 0.3 + 0.7 * (1 - r));
    landfill.visible = r < 0.995;
    orePile.scale.setScalar(Math.max(0.05, 0.25 + 0.75 * (1 - r)));
    orePile.position.y = 0.4 * Math.max(0.05, 0.25 + 0.75 * (1 - r));
    energyBar.scale.y = 1.8 * e; energyBar.position.y = 0.9 * e;
    eTop.position.y = 1.8 * e + 0.15;
  }
  function recReadout() {
    if (st.step !== 5) return;
    const r = st.rec, e = 100 - 95 * r;
    ui.readout(`Recycling rate: <b>${Math.round(r * 100)}%</b><br>Energy to make the cans: <b>about ${Math.round(e)}%</b> of making them all from new aluminium.<br>New bauxite ore needed: <b>${Math.round((1 - r) * 100)}%</b>. (model)`);
  }

  // =========================================================== 6. Farm, soil and river
  const S6 = stations[5];
  const fh = (x, z) => 1.4 * Math.max(0, (1.6 - z) / 3.6) + 0.05 * Math.sin(x * 1.7);   // slope down to the river at z = 1.6
  {
    const g = new THREE.PlaneGeometry(7, 3.6, 20, 12);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -0.2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, fh(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    var fieldBare = kit.mesh(g, new THREE.MeshStandardMaterial({ color: 0x8b5e34, roughness: 1, flatShading: true }), [0, 0, 0], S6);
    // terraced version with green cover-crop strips
    const tg = new THREE.Group();
    const steps = 6;
    for (let k = 0; k < steps; k++) {
      const z0 = -2 + (k * 3.6) / steps, z1 = z0 + 3.6 / steps, y = fh(0, z1) + 0.02;
      box(7, Math.max(0.05, y + 0.05), z1 - z0, std(0x8b5e34), [0, (y - 0.05) / 2, (z0 + z1) / 2], tg);
      box(7, 0.05, (z1 - z0) * 0.8, std(k % 2 ? 0x4d9a3a : 0x65b347), [0, y + 0.025, (z0 + z1) / 2 + 0.03], tg);
    }
    var fieldTerr = tg;
    S6.add(tg);
  }
  box(7, 0.4, 2.2, std(0x6e5a44), [0, -0.3, 2.8], S6);          // valley floor
  const riverMat6 = std(0x3b82c4, { roughness: 0.25 });
  const river6 = box(7, 0.1, 0.9, riverMat6, [0, -0.04, 2.2], S6);
  box(7, 0.02, 1.0, std(0x9ccf7c), [0, -0.09, 3.4], S6);
  const buffer = new THREE.Group();
  S6.add(buffer);
  {
    const n = 16, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), std(0x6b4f2a), n), crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.26, 0), std(0x2e7d32, { flatShading: true }), n);
    for (let i = 0; i < n; i++) {
      const x = -3.2 + i * 0.43, z = 1.55 + (i % 2) * 0.12, y = fh(x, 1.55);
      m4.compose(v0.set(x, y + 0.15, z), q0, s0); trunk.setMatrixAt(i, m4);
      m4.compose(v0.set(x, y + 0.45, z), q0, s0); crown.setMatrixAt(i, m4);
    }
    buffer.add(trunk, crown);
  }
  const rain6 = makeRain(THREE, { count: 160, w: 3.4, d: 1.8, top: 3.4, bottom: 0, speed: 7, seed: 12, color: 0x7fb2e5 });
  rain6.obj.position.set(0, 0, -0.4);
  S6.add(rain6.obj);
  const cl6 = [makeCloud(THREE, { seed: 3, size: 0.9, color: 0xcbd5e1 }), makeCloud(THREE, { seed: 8, size: 0.8, color: 0xcbd5e1 })];
  cl6[0].position.set(-1.6, 3.5, -0.8); cl6[1].position.set(1.6, 3.6, -0.4);
  S6.add(...cl6);
  const mud = [], fert = [];
  for (let j = 0; j < 5; j++) {
    const x0 = -2.8 + j * 1.4, pts = [];
    for (let k = 0; k <= 5; k++) { const z = -1.6 + (k / 5) * 3.6; pts.push([x0 + Math.sin(k * 1.3 + j) * 0.1, z > 1.6 ? 0.04 : fh(x0, z) + 0.06, Math.min(z, 2.1)]); }
    const m = makeFlow(THREE, pts, { count: 10, color: 0x7c4a1e, size: 0.065, speed: 0.9, seed: 700 + j * 5 });
    const f = makeFlow(THREE, pts.map(p => [p[0] + 0.25, p[1] + 0.02, p[2]]), { count: 8, color: 0x84cc16, size: 0.06, speed: 0.8, seed: 760 + j * 5 });
    S6.add(m.obj, f.obj);
    mud.push(m); fert.push(f);
  }
  lab('field', 'Farm field', anchor(S6, -2.2, 1.9, -1.6), 'warm');
  lab('river6', 'River', anchor(S6, 2.8, 0.3, 2.3), 'cool');
  lab('buffer', 'Tree strip', anchor(buffer, 2.6, 1.0, 1.6));
  st.terr = false; st.trees = false; st.lessF = false; st.mudShown = 1; st.algShown = 1;
  const cRiver = new THREE.Color(0x3b82c4), cMud = new THREE.Color(0xa0662a), cAlg = new THREE.Color(0x5fa02a);
  const levels = () => {
    const mudL = (st.terr ? 0.2 : 1) * (st.trees ? 0.4 : 1);
    const algL = (st.lessF ? 0.3 : 1) * (st.trees ? 0.5 : 1) * (st.terr ? 0.8 : 1);
    return { mudL, algL };
  };
  function applyFarm() {
    fieldBare.visible = !st.terr; fieldTerr.visible = st.terr;
    buffer.visible = st.trees;
    L.buffer.show(st.step === 6 && st.trees);
    mud.forEach(f => f.setCount(Math.round(10 * st.mudShown)));
    fert.forEach(f => f.setCount(Math.round(8 * st.algShown)));
    riverMat6.color.copy(cRiver).lerp(cAlg, 0.7 * st.algShown).lerp(cMud, 0.6 * st.mudShown);
  }
  function farmReadout() {
    if (st.step !== 6) return;
    const { mudL, algL } = levels();
    const soil = mudL > 0.7 ? 'a lot of soil washes away' : mudL > 0.3 ? 'some soil washes away' : 'very little soil is lost';
    const riv = mudL > 0.3 && algL > 0.4 ? 'muddy and green with algae' : mudL > 0.3 ? 'muddy' : algL > 0.4 ? 'green with algae: fish may run short of oxygen' : 'clear';
    ui.readout(`Field: <b>${soil}</b>.<br>River: <b>${riv}</b>.`);
  }

  // =========================================================== steps
  const SKY = [0xdff1ff, 0xdff1ff, 0xdff1ff, 0xdff1ff, 0xe8f4ff, 0xdff1ff, 0xb9c6d2];
  function showOnly(si, i) {
    stations.forEach((g, j) => { g.visible = j === si; });
    for (const k in L) L[k].show(false);
    setNight(false);
    scene.background.set(SKY[i] ?? 0xdff1ff);
    coalP.visible = true; sun2.visible = true;
  }
  function demo(key, to, rate, input, round, after) { st.demo = { key, to, rate, input, round, after }; }

  return {
    step(i, { isQuiz, instant }) {
      st.step = isQuiz ? -1 : i;
      st.demo = null;
      const go = o => view(o, instant);
      if (isQuiz) {
        showOnly(2, 3);
        st.step = 3; st.solar = 30; st.wind = 25; st.hydro = 5; st.windy = true;
        applyPower(); st.step = -1;
        go({ radius: 4.4, width: 6, yaw: 0.2, pitch: 0.5, target: [SX[2] + 1.6, 0.6, -0.6] });
        coalP.visible = false;
        return;
      }
      if (i === 0) {
        showOnly(0, 0);
        go({ radius: 3.4, width: 6.2, yaw: 0, pitch: 0.75, target: [SX[0], 0.4, 0.1] });
        const row = ui.buttons([{ label: 'Renewable', on: true, onClick: () => group0('ren') }, { label: 'Non-renewable', onClick: () => group0('non') }, { label: 'Renewable if used carefully', onClick: () => group0('care') }]);
        row.select(0);
        group0('ren');
      }
      if (i === 1) {
        showOnly(1, 1);
        go({ radius: 3.0, width: 5.4, yaw: 0.15, pitch: 0.18, target: [SX[1], -0.7, 0] });
        st.ma = 300; if (instant) st.maShown = 300;
        const inp = ui.slider({ label: 'Time', min: 0, max: 300, step: 10, value: 300, format: v => (v ? `${v} million years ago` : 'today'), onInput: v => { st.demo = null; st.ma = v; geoReadout(); } });
        st.demo = { key: 'ma', to: 0, rate: -45, input: inp, round: v => Math.round(v / 10) * 10, after: geoReadout };
        paintGeo(); geoReadout();
      }
      if (i === 2) {
        showOnly(2, 2);
        go({ radius: 3.3, width: 4.6, yaw: 0.25, pitch: 0.38, target: [SX[2] - 3.6, 1.0, 0] });
        st.coal = 0.8;
        ui.slider({ label: 'Coal', min: 0, max: 100, step: 10, value: 80, unit: '%', onInput: v => { st.coal = v / 100; applyPower(); coalReadout(); } });
        for (const k of ['town', 'coalP', 'gasP', 'co2']) L[k].show(true);
        sun2.visible = false;
        applyPower(); coalReadout();
      }
      if (i === 3) {
        showOnly(2, 3);
        go({ radius: 4.2, width: 5.8, yaw: 0.15, pitch: 0.5, target: [SX[2] + 1.7, 0.6, -0.7] });
        coalP.visible = false;           // the coal station is closed in this plan
        st.solar = 20; st.wind = 10; st.hydro = 5; st.windy = true;
        ui.slider({ label: 'Solar', min: 0, max: 60, step: 5, value: 20, unit: ' MW', onInput: v => { st.solar = v; applyPower(); mixReadout(); } });
        ui.slider({ label: 'Wind', min: 0, max: 40, step: 5, value: 10, unit: ' MW', onInput: v => { st.wind = v; applyPower(); mixReadout(); } });
        ui.slider({ label: 'Hydro', min: 0, max: 20, step: 5, value: 5, unit: ' MW', onInput: v => { st.hydro = v; applyPower(); mixReadout(); } });
        const row = ui.buttons([{ label: 'Day', on: true, onClick: () => { setNight(false); applyPower(); mixReadout(); } }, { label: 'Night', onClick: () => { setNight(true); applyPower(); mixReadout(); } }]);
        row.select(0);
        ui.toggle({ label: 'Windy', value: true, onChange: v => { st.windy = v; applyPower(); mixReadout(); } });
        for (const k of ['gasP', 'solar', 'wind', 'hydro']) L[k].show(true);
        applyPower(); mixReadout();
      }
      if (i === 4) {
        showOnly(3, 4);
        go({ radius: 3.6, yaw: 0.2, pitch: 0.55, target: [SX[3], 0.4, 0] });
        st.year = 1800; if (instant) st.figShown = 10;
        const inp = ui.slider({ label: 'Year', min: 1800, max: 2050, step: 1, value: 1800, onInput: v => { st.demo = null; st.year = v; popReadout(); } });
        demo('year', 2050, 70, inp, v => Math.round(v), popReadout);
        L.earth.show(true);
        placeFigs(); popReadout();
      }
      if (i === 5) {
        showOnly(4, 5);
        go({ radius: 3.4, width: 5.8, yaw: 0.1, pitch: 0.7, target: [SX[4], 0.3, 0.2] });
        st.rec = 0; st.recPct = 0; if (instant) st.recShown = 0;
        const inp = ui.slider({ label: 'Recycling rate', min: 0, max: 100, step: 5, value: 0, unit: '%', onInput: v => { st.demo = null; st.recPct = v; st.rec = v / 100; recReadout(); } });
        demo('recPct', 75, 25, inp, v => Math.round(v / 5) * 5, () => { st.rec = Math.round(st.recPct / 5) * 5 / 100; recReadout(); });
        for (const k of ['energy', 'factory', 'bin', 'plant', 'landfill', 'mine']) L[k].show(true);
        applyRec(); recReadout();
      }
      if (i === 6) {
        showOnly(5, 6);
        go({ radius: 3.0, width: 4.0, yaw: 0.25, pitch: 0.45, target: [SX[5], 0.6, 0.6] });
        st.terr = false; st.trees = false; st.lessF = false;
        if (instant) { st.mudShown = 1; st.algShown = 1; }
        const ch = () => { applyFarm(); farmReadout(); };
        ui.toggle({ label: 'Terraces and cover crops', value: false, onChange: v => { st.terr = v; ch(); } });
        ui.toggle({ label: 'Trees along the river', value: false, onChange: v => { st.trees = v; ch(); } });
        ui.toggle({ label: 'Less fertiliser', value: false, onChange: v => { st.lessF = v; ch(); } });
        L.field.show(true); L.river6.show(true);
        applyFarm(); farmReadout();
      }
    },
    update(dt, t) {
      const s = st.step;
      if (st.demo) {
        const d = st.demo, v0_ = st[d.key] + d.rate * dt, v = d.rate > 0 ? Math.min(d.to, v0_) : Math.max(d.to, v0_);
        const changed = d.round(v) !== d.round(st[d.key]);
        st[d.key] = v;
        if (changed) { d.input.set(d.round(v)); d.after(); }
        if ((d.rate > 0 && v >= d.to) || (d.rate < 0 && v <= d.to)) { st[d.key] = d.round(d.to); st.demo = null; }
      }
      if (s === 0) {
        turbines0.forEach((tb, i) => { tb.rotor.rotation.z -= dt * (2 + i * 0.4); });
        beam.rotation.z = Math.sin(t * 1.6) * 0.28;
        riverFlow.tick(dt);
        return true;
      }
      if (s === 1) {
        if (kit.follow(st, 'maShown', st.ma, dt, 4)) paintGeo();
        return Math.abs(st.maShown - st.ma) > 0.01 || !!st.demo;
      }
      if (s === 2 || s === 3 || s === -1) {
        coalSmoke.tick(t); gasSmoke.tick(t);
        const spinOn = st.windy && s !== 2;
        turbines.forEach((tb, i) => { if (spinOn) tb.rotor.rotation.z -= dt * (2.2 + rand(i) * 0.6); });
        if (hydro.visible) hydroFlow.tick(dt);
        return true;
      }
      if (s === 4) {
        const want = Math.round(popAt(st.year) * 10);
        if (kit.follow(st, 'figShown', want, dt, 5)) placeFigs();
        globe.rotation.y += dt * 0.3;
        return true;
      }
      if (s === 5) {
        kit.follow(st, 'recShown', st.rec, dt, 4);
        applyRec();
        for (const f of [fMain, fRec, fLand, fOre]) if (f.obj.visible) f.tick(dt);
        return true;
      }
      if (s === 6) {
        const { mudL, algL } = levels();
        const a = kit.follow(st, 'mudShown', mudL, dt, 3), b = kit.follow(st, 'algShown', algL, dt, 3);
        if (a || b) applyFarm();
        for (const f of [...mud, ...fert]) if (f.obj.visible) f.tick(dt);
        rain6.tick(dt);
        return true;
      }
      return false;
    },
  };
}
