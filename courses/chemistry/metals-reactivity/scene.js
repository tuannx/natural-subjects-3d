// Metals and the reactivity series (KHTN 9). One lab bench with a station per step:
// physical properties (circuit, heated rod with wax beads, hammer, wire drawing); sodium, magnesium and
// copper in water on a hot plate; four metals racing in dilute acid with balloons; an iron nail and a
// silver wire in copper sulfate; a reactivity ladder K … Au with a metal arrow and a solution arrow;
// three ways of getting metals (native gold, blast furnace, aluminium electrolysis); the three-tube
// rusting test; and four bars in the rain (bare, painted, oiled, galvanised).
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { bench, beaker, testTube, stopper, bubbles, tube, sign, paint, rand, thermometer } from '../_shared/labware.js';

const X = { prop: 0, water: 8, acid: 16, disp: 24, ladder: 32, extract: 40, rust: 48, protect: 56 };

// KHTN 9 reactivity series, most reactive first; H is the marker between Pb and Cu.
const LAD = ['K', 'Na', 'Ca', 'Mg', 'Al', 'Zn', 'Fe', 'Pb', 'H', 'Cu', 'Ag', 'Au'];
const NAME = { K: 'potassium', Na: 'sodium', Ca: 'calcium', Mg: 'magnesium', Al: 'aluminium', Zn: 'zinc', Fe: 'iron', Pb: 'lead', H: 'hydrogen', Cu: 'copper', Ag: 'silver', Au: 'gold' };
const METALS = LAD.filter(s => s !== 'H');
// Salt solutions for the ladder: the metal, its salt's name, and the anion used for the product's name.
const SOLS = [
  { sym: 'Cu', label: 'Copper sulfate', salt: 'copper sulfate', anion: 'sulfate' },
  { sym: 'Fe', label: 'Iron(II) sulfate', salt: 'iron(II) sulfate', anion: 'sulfate' },
  { sym: 'Zn', label: 'Zinc sulfate', salt: 'zinc sulfate', anion: 'sulfate' },
  { sym: 'Ag', label: 'Silver nitrate', salt: 'silver nitrate', anion: 'nitrate' },
];
const saltOf = (sym, anion) => `${sym === 'Fe' ? 'iron(II)' : NAME[sym]} ${anion}`;
const cap = s => s[0].toUpperCase() + s.slice(1);

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  const ground = kit.stage(scene, { ground: 0xd8d2c8, sky: 0xe8f0f6, radius: 46 });
  ground.position.x = 28;
  const sun = kit.lights(scene, { sun: [4, 10, 7] });
  scene.add(sun.target);
  bench(k, { w: 64, d: 3.4, pos: [28, 0, 0] });

  // Metals get a small room reflection so they look shiny (lustre is one of the properties in step 1).
  const pmrem = new THREE.PMREMGenerator(k.renderer);
  const room = new RoomEnvironment();
  const envTex = pmrem.fromScene(room, 0.04).texture;
  room.dispose(); pmrem.dispose();
  const metal = (color, roughness = 0.3) => new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness, envMap: envTex, envMapIntensity: 1.1 });
  const M = {
    copper: metal(0xe08d62, 0.28), gold: metal(0xf5c542, 0.22), iron: metal(0x9aa1a8, 0.42), silver: metal(0xeef0f2, 0.18),
    zinc: metal(0xb9c3cc, 0.38), alu: metal(0xd9dee3, 0.3), steel: metal(0x6f7780, 0.45), mg: metal(0xd0d4d8, 0.3),
  };
  const C = { iron: new THREE.Color(0x9aa1a8), rust: new THREE.Color(0x7a3311), copper: new THREE.Color(0xc0714a), blue: new THREE.Color(0x3a86d6), green: new THREE.Color(0xcfe3b0), clear: new THREE.Color(0xd6ecfa), pink: new THREE.Color(0xff5fa8) };
  const plain = (c, o = {}) => kit.mat(c, o);
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const tag = (text, parent, x, y, z, cls) => { const l = label(text, anchor(parent, x, y, z), { cls }); l.show(false); return l; };
  const station = x => { const g = new THREE.Group(); g.position.x = x; scene.add(g); return g; };
  // Test-tube rack: a base board and a back panel, so the tubes stay in full view.
  const wood = plain(0xb07d4f, { roughness: 0.8 });
  const rack = parent => {
    kit.mesh(new THREE.BoxGeometry(2.3, 0.05, 0.5), wood, [0, 0.025, 0], parent);
    kit.mesh(new THREE.BoxGeometry(2.3, 0.75, 0.05), wood, [0, 0.4, -0.25], parent);
    for (const x of [-1.12, 1.12]) kit.mesh(new THREE.BoxGeometry(0.06, 0.75, 0.5), wood, [x, 0.4, 0], parent);
  };
  const smallSign = (parent, text, x, y, z, w = 0.7) => {
    const s = sign(k, { parent, w, h: w * 0.25, px: 256, py: 64, text, font: text.length < 4 ? 'bold 46px sans-serif' : 'bold 34px sans-serif' });
    s.position.set(x, y, z);
    return s;
  };

  // Flames: a lathe "teardrop", an outer and an inner layer.
  const flameGeo = new THREE.LatheGeometry([[0.001, 0], [0.62, 0.1], [1, 0.3], [0.88, 0.55], [0.5, 0.8], [0.001, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
  function flame(parent, { pos = [0, 0, 0], r = 0.06, h = 0.22, outer = 0xff9b2f, inner = 0xffe27a } = {}) {
    const g = new THREE.Group(); g.position.set(...pos); parent.add(g);
    const mo = new THREE.MeshBasicMaterial({ color: outer, transparent: true, opacity: 0.8, depthWrite: false });
    const mi = new THREE.MeshBasicMaterial({ color: inner, transparent: true, opacity: 0.95, depthWrite: false });
    const o = new THREE.Mesh(flameGeo, mo), i = new THREE.Mesh(flameGeo, mi);
    o.renderOrder = 5; i.renderOrder = 6;
    o.scale.set(r, h, r); i.scale.set(r * 0.55, h * 0.6, r * 0.55);
    g.add(o, i);
    return { group: g, flick(t, s) { const f = 1 + 0.08 * Math.sin(t * 17 + s) + 0.05 * Math.sin(t * 29 + s * 2); o.scale.y = h * f; i.scale.y = h * 0.6 * (2 - f); } };
  }

  // Nail: head, shaft and point along +y from its local origin (the point). Own material so it can rust.
  function nail(parent, { len = 0.6, r = 0.018, mat } = {}) {
    const g = new THREE.Group(); parent.add(g);
    const m = mat || metal(0x9aa1a8, 0.42);
    kit.mesh(new THREE.ConeGeometry(r, 0.05, 10).rotateX(Math.PI).translate(0, 0.025, 0), m, [0, 0, 0], g);
    kit.mesh(new THREE.CylinderGeometry(r, r, len - 0.07, 10).translate(0, (len - 0.07) / 2 + 0.05, 0), m, [0, 0, 0], g);
    kit.mesh(new THREE.CylinderGeometry(r * 2.3, r * 2.3, 0.02, 14), m, [0, len - 0.01, 0], g);
    g.userData.mat = m;
    return g;
  }

  // ======================= Step 0: properties of metals =======================
  const S0 = station(X.prop);
  // a) Electrical conductivity: battery, bulb, two clips; a copper strip closes the gap.
  const P0 = new THREE.Group(); P0.position.set(-0.95, 0, -0.45); S0.add(P0);
  kit.mesh(new THREE.BoxGeometry(0.5, 0.24, 0.22), plain(0x2b2d42), [-0.25, 0.12, -0.2], P0);
  kit.mesh(new THREE.BoxGeometry(0.14, 0.245, 0.225), plain(0xf0a202), [-0.08, 0.12, -0.2], P0);
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10).rotateZ(Math.PI / 2), M.steel, [0.015, 0.12, -0.2], P0);
  kit.mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.08, 16), plain(0x495057), [0.32, 0.04, -0.2], P0);
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.07, 14), M.steel, [0.32, 0.115, -0.2], P0);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff7d6, emissive: 0xffc940, emissiveIntensity: 0, transparent: true, opacity: 0.8, roughness: 0.1 });
  const bulb = kit.mesh(new THREE.SphereGeometry(0.11, 20, 14), bulbMat, [0.32, 0.25, -0.2], P0);
  bulb.castShadow = false;
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), haloMat);
  halo.position.copy(bulb.position); P0.add(halo);
  const clipMat = plain(0x343a40);
  kit.mesh(new THREE.BoxGeometry(0.1, 0.04, 0.09), clipMat, [-0.3, 0.02, 0.3], P0);
  kit.mesh(new THREE.BoxGeometry(0.1, 0.04, 0.09), clipMat, [0.3, 0.02, 0.3], P0);
  const redW = plain(0xd62828), blackW = plain(0x212529);
  tube(k, [[0.03, 0.12, -0.2], [0.14, 0.08, -0.2], [0.25, 0.04, -0.2]], { r: 0.014, parent: P0, mat: redW });
  tube(k, [[0.4, 0.03, -0.2], [0.45, 0.02, 0.05], [0.34, 0.03, 0.3]], { r: 0.014, parent: P0, mat: redW });
  tube(k, [[-0.5, 0.12, -0.2], [-0.56, 0.03, 0.05], [-0.34, 0.03, 0.3]], { r: 0.014, parent: P0, mat: blackW });
  const strip = kit.mesh(new THREE.BoxGeometry(0.72, 0.02, 0.08), M.copper, [0, 0.36, 0.3], P0);

  // b) Heat conduction: copper rod over a spirit lamp, wax beads underneath.
  const P1 = new THREE.Group(); P1.position.set(0.8, 0, -0.45); S0.add(P1);
  kit.mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3), plain(0x495057), [0.62, 0.015, 0], P1);
  kit.mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 8), M.steel, [0.68, 0.31, 0], P1);
  kit.mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), M.steel, [0.62, 0.5, 0], P1);
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 14).rotateZ(Math.PI / 2), M.copper, [0.05, 0.5, 0], P1);
  const heatTex = paint(THREE, 128, 8, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,90,20,0.95)'); gr.addColorStop(0.6, 'rgba(255,150,40,0.6)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const heatGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 12, 1, true).rotateZ(-Math.PI / 2).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, depthWrite: false }));
  // The canvas gradient runs along the cylinder's u (round the rod), so map it along the length instead.
  { const uv = heatGlow.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, 1 - v, u); } }
  heatGlow.position.set(-0.5, 0.5, 0); heatGlow.renderOrder = 4; heatGlow.scale.x = 0.001; P1.add(heatGlow);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xdcefff, transparent: true, opacity: 0.45, roughness: 0.1 });
  kit.mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.14, 18), lampMat, [-0.42, 0.07, 0], P1).castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.05, 10), M.steel, [-0.42, 0.165, 0], P1);
  const lampFlame = flame(P1, { pos: [-0.42, 0.19, 0], r: 0.045, h: 0.27 });
  const waxMat = plain(0xfff1c1, { roughness: 0.5 });
  const WAX_X = [-0.15, 0.15, 0.42];
  const wax = WAX_X.map(x => kit.mesh(new THREE.SphereGeometry(0.03, 12, 8), waxMat, [x, 0.45, 0], P1));

  // c) Malleable: a gold lump on an anvil, hammered flat.
  const P2 = new THREE.Group(); P2.position.set(-0.85, 0, 0.5); S0.add(P2);
  kit.mesh(new THREE.BoxGeometry(0.5, 0.18, 0.32), plain(0x3d434a, { roughness: 0.5 }), [0, 0.09, 0], P2);
  const lump = kit.mesh(new THREE.SphereGeometry(0.09, 20, 14), M.gold, [0, 0.27, 0], P2);
  const hammer = new THREE.Group(); hammer.position.set(0.5, 0.32, 0); P2.add(hammer);
  kit.mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.5, 8).rotateZ(Math.PI / 2), plain(0xa0522d), [-0.25, 0, 0], hammer);
  kit.mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), M.steel, [-0.5, 0, 0], hammer);
  const FLAT = [1, 0.55, 0.3, 0.16];

  // d) Ductile: a short thick copper rod pulled through a die into a long thin wire.
  const P3 = new THREE.Group(); P3.position.set(0.5, 0, 0.5); S0.add(P3);
  kit.mesh(new THREE.BoxGeometry(0.08, 0.3, 0.28), plain(0x3d434a), [-0.35, 0.15, 0], P3);
  kit.mesh(new THREE.CircleGeometry(0.03, 12), plain(0x111111), [-0.309, 0.24, 0], P3).rotation.y = Math.PI / 2;
  const stub = kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 14).rotateZ(Math.PI / 2), M.copper, [-0.47, 0.24, 0], P3);
  stub.castShadow = false;
  const wire = kit.mesh(new THREE.CylinderGeometry(1, 1, 1, 12).rotateZ(Math.PI / 2).translate(0.5, 0, 0), M.copper, [-0.31, 0.24, 0], P3);
  const grip = kit.mesh(new THREE.BoxGeometry(0.07, 0.09, 0.1), plain(0xc92a2a), [0, 0.24, 0], P3);
  const tags0 = [tag('Electricity', P0, 0, 0.55, -0.1), tag('Heat', P1, 0.05, 0.62, 0), tag('Malleable', P2, 0, 0.05, 0.42), tag('Ductile', P3, 0.2, 0.05, 0.3)];
  const pr = { strip: null, heat: null, hammer: null, wire: null, msg: '' };
  function tickProps(t) {
    const T = st.time;
    // circuit
    const s = pr.strip == null ? 0 : kit.ease(kit.clamp((T - pr.strip) / 0.7, 0, 1));
    strip.position.y = kit.lerp(0.36, 0.05, s);
    const on = s >= 1 ? 1 : 0;
    bulbMat.emissiveIntensity = on * (1.6 + 0.1 * Math.sin(t * 9));
    haloMat.opacity = on * 0.35;
    // heat
    const front = pr.heat == null ? 0 : kit.clamp((T - pr.heat) * 0.42, 0, 1.1);
    heatGlow.scale.x = Math.max(0.001, front);
    heatGlow.visible = front > 0.002;
    lampFlame.group.visible = pr.heat != null;
    lampFlame.flick(t, 1);
    wax.forEach((w, i) => {
      const reach = WAX_X[i] + 0.5, dt0 = pr.heat == null ? -1 : (T - pr.heat) - (reach / 0.42 + 0.15);
      if (dt0 <= 0) { w.position.y = 0.45; w.scale.set(1, 1, 1); return; }
      const y = 0.45 - 0.5 * 4 * dt0 * dt0;
      if (y > 0.025) { w.position.y = y; w.scale.set(1, 1.15, 1); } else { w.position.y = 0.012; w.scale.set(1.5, 0.4, 1.5); }
    });
    // hammer: three strikes, 0.7 s each
    let level = 0, ang = -0.75;
    if (pr.hammer != null) {
      const h = T - pr.hammer, n = Math.floor(h / 0.7), f = h / 0.7 - n;
      level = Math.min(3, n + (f > 0.4 ? 1 : 0));
      if (n < 3) {
        const top = 0.18 + 0.18 * FLAT[Math.min(3, n)], hit = Math.asin(kit.clamp((0.32 - 0.07 - top) / 0.5, -1, 1));
        ang = f < 0.4 ? kit.lerp(-0.75, hit, (f / 0.4) ** 2) : kit.lerp(hit, -0.75, kit.ease((f - 0.4) / 0.6));
      }
    }
    hammer.rotation.z = ang;
    const sy = FLAT[level], sx = 1 / Math.sqrt(sy);
    lump.scale.set(sx, sy, sx); lump.position.y = 0.18 + 0.09 * sy;
    // wire: stretch to 5x the length (same volume, so the radius shrinks)
    const w = pr.wire == null ? 1 : 1 + 4 * kit.ease(kit.clamp((T - pr.wire) / 1.6, 0, 1));
    const L = 0.18 * w, r = 0.06 / Math.sqrt(w);
    wire.scale.set(L, r, r);
    grip.position.x = -0.31 + L + 0.02;
    const parts = [];
    if (pr.strip != null) parts.push('the bulb lights: copper <b>conducts electricity</b>');
    if (pr.heat != null) parts.push('the wax drops off in turn: copper <b>conducts heat</b>');
    if (pr.hammer != null) parts.push('gold flattens without cracking: <b>malleable</b>');
    if (pr.wire != null) parts.push('copper stretches into wire: <b>ductile</b>');
    const msg = 'All these metals are <b>shiny</b> (they have lustre).' + (parts.length ? '<br>' + parts.map(cap).join('<br>') : '');
    if (msg !== pr.msg) { pr.msg = msg; ui.readout(msg); }
    return true;
  }

  // ======================= Step 1: metals and water =======================
  const S1 = station(X.water);
  const plate = kit.mesh(new THREE.BoxGeometry(3.4, 0.08, 1.05), plain(0x343a40), [0, 0.04, 0], S1);
  const plateTopMat = new THREE.MeshStandardMaterial({ color: 0x555b62, emissive: 0xff3b1f, emissiveIntensity: 0 });
  kit.mesh(new THREE.BoxGeometry(3.3, 0.01, 0.95), plateTopMat, [0, 0.085, 0], S1).castShadow = false;
  const WX = [-1.1, 0, 1.1], WH = 0.75, WF = 0.62, wSurf = WH * WF;
  const wb = WX.map(x => beaker(k, { parent: S1, r: 0.42, h: WH, pos: [x, 0.09, 0], fill: WF, color: 0xd6ecfa, opacity: 0.45 }));
  const na = kit.mesh(new THREE.SphereGeometry(0.065, 16, 10), M.mg, [0, wSurf, 0], wb[0].group);
  na.scale.y = 0.7;
  const naFizz = bubbles(k, { parent: wb[0].group, n: 24, r: 0.05, y0: wSurf - 0.04, y1: wSurf + 0.06, size: 0.016 });
  const ribbon = kit.mesh(new THREE.BoxGeometry(0.34, 0.012, 0.05), M.mg, [0, 0.02, 0.05], wb[1].group);
  ribbon.rotation.y = 0.4;
  const mgFizz = bubbles(k, { parent: wb[1].group, n: 30, r: 0.14, y0: 0.03, y1: wSurf, size: 0.018, z: 0.05 });
  for (let i = 0; i < 6; i++) {
    const c = kit.mesh(new THREE.TorusGeometry(0.035, 0.008, 4, 10, 4), M.copper, [(rand(i) - 0.5) * 0.3, 0.02, (rand(i + 9) - 0.5) * 0.3], wb[2].group);
    c.rotation.set(Math.PI / 2 + rand(i + 3), rand(i + 5) * 3, 0);
  }
  const therm = thermometer(k, { parent: wb[1].group, pos: [0.26, 0.06, -0.18], h: 0.95, min: 0, max: 100 });
  const tags1 = [tag('Sodium', S1, WX[0], 0.98, 0), tag('Magnesium', S1, WX[1], 1.18, 0), tag('Copper', S1, WX[2], 0.98, 0)];
  const wt = { temp: 20, na: null, slider: null, msg: '' };
  function tickWater(t) {
    const T = st.time;
    therm.set(wt.temp);
    plateTopMat.emissiveIntensity = ((wt.temp - 20) / 70) * 0.35;
    // sodium: drops in, skates round in a wobbly circle, shrinks, gone after about 7 s
    let alive = false, size = 0, pinkF = 0;
    if (wt.na != null) {
      const a = T - wt.na;
      pinkF = kit.clamp(a / 3, 0, 1);
      if (a < 0.3) { na.visible = true; na.position.set(0, kit.lerp(0.9, wSurf, a / 0.3), 0); size = 1; }
      else if (a < 7.3) {
        alive = true; size = 1 - (a - 0.3) / 7;
        const ang = a * 3.1, rr = 0.2 + 0.07 * Math.sin(a * 2.3);
        na.position.set(Math.cos(ang) * rr, wSurf + 0.012, Math.sin(ang) * rr * 0.8);
      }
      na.visible = a < 7.3;
      const s = Math.max(0.05, Math.sqrt(Math.max(0, size)));
      na.scale.set(s, s * 0.8, s);
    } else na.visible = false;
    naFizz.x = na.position.x; naFizz.z = na.position.z;
    naFizz.tick(t * 1.7, alive ? 1 : 0);
    wb[0].mat.color.lerpColors(C.clear, C.pink, pinkF);
    wb[0].mat.opacity = 0.45 + 0.25 * pinkF;
    const mgRate = 0.06 + 0.6 * ((wt.temp - 20) / 70) ** 1.4;
    mgFizz.tick(t, mgRate);
    const mgWord = wt.temp < 40 ? 'only a few tiny bubbles' : wt.temp < 70 ? 'more bubbles' : 'a steady stream of bubbles (still much slower than sodium)';
    const msg = `Water temperature: <b>${wt.temp} °C</b><br>Sodium: fizzes fast and skates around · 2Na + 2H₂O → 2NaOH + H₂<br>Magnesium: ${mgWord}<br>Copper: no reaction`;
    if (msg !== wt.msg) { wt.msg = msg; ui.readout(msg); }
    return true;
  }

  // ======================= Step 2: metals and dilute acid =======================
  const S2 = station(X.acid);
  rack(S2);
  const AX = [-0.81, -0.27, 0.27, 0.81];
  const ACID = [{ sym: 'Mg', rate: 1, mat: M.mg }, { sym: 'Zn', rate: 0.55, mat: M.zinc }, { sym: 'Fe', rate: 0.22, mat: M.iron }, { sym: 'Cu', rate: 0, mat: M.copper }];
  const BAL = [0xe63946, 0xf4a300, 0x2f9e44, 0x7048e8];
  const acid = AX.map((x, i) => {
    const tt = testTube(k, { parent: S2, r: 0.12, h: 1.0, pos: [x, 0.06, 0], fill: 0.45, color: 0xeaf6ff, opacity: 0.5 });
    for (let j = 0; j < 4; j++) kit.mesh(new THREE.DodecahedronGeometry(0.03, 0), ACID[i].mat, [(rand(i * 9 + j) - 0.5) * 0.1, 0.05 + j * 0.012, (rand(i * 5 + j) - 0.5) * 0.1], tt.group);
    const fizz = bubbles(k, { parent: tt.group, n: 30, r: 0.08, y0: 0.06, y1: 0.45, size: 0.02 });
    const bg = new THREE.Group(); bg.position.y = 1.0; tt.group.add(bg);
    const bm = plain(BAL[i], { roughness: 0.35 });
    kit.mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 16), bm, [0, 0.0, 0], bg);
    const ball = kit.mesh(new THREE.SphereGeometry(1, 20, 14), bm, [0, 0, 0], bg);
    smallSign(S2, ACID[i].sym, x, 0.8, 0.125, 0.4);
    return { tt, fizz, ball, gas: 0 };
  });
  const tags2 = [tag('Hydrogen', acid[0].ball, 0, 1.25, 0), tag('Same dilute acid', S2, 0, 0.02, 0.35, 'cool')];
  const ac = { t0: 0, msg: '' };
  function tickAcid(t) {
    const T = Math.max(0, st.time - ac.t0);
    acid.forEach((a, i) => {
      a.gas = ACID[i].rate * T;
      a.fizz.tick(t, ACID[i].rate);
      const R = 0.05 + 0.19 * Math.min(1, a.gas / 5);
      a.ball.scale.set(R, R * 1.15, R);
      a.ball.position.y = 0.02 + R * 1.05;
    });
    const msg = `Time: <b>${Math.min(99, T).toFixed(0)} s</b> (sped up)<br>Fastest to slowest: <b>Mg &gt; Zn &gt; Fe</b>; Cu: no bubbles<br>Zn + 2HCl → ZnCl₂ + H₂`;
    if (msg !== ac.msg) { ac.msg = msg; ui.readout(msg); }
    return true;
  }

  // ======================= Step 3: displacement =======================
  const S3 = station(X.disp);
  const DH = 0.85, DF = 0.7, dSurf = DH * DF;
  const db = [-0.75, 0.75].map(x => beaker(k, { parent: S3, r: 0.42, h: DH, pos: [x, 0, 0], fill: DF, color: 0x3a86d6, opacity: 0.62 }));
  const glassRod = metal(0xdfe9f0, 0.1);
  db.forEach(b => kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.05, 8).rotateZ(Math.PI / 2), glassRod, [0, DH + 0.02, 0], b.group));
  const threadMat = plain(0xf8f9fa);
  // Iron nail: the part in the solution has its own material so only that part turns copper-coloured.
  const wetMat = metal(0x9aa1a8, 0.42);
  const ng = new THREE.Group(); ng.position.y = 0.12; db[0].group.add(ng);
  kit.mesh(new THREE.ConeGeometry(0.018, 0.05, 10).rotateX(Math.PI).translate(0, 0.025, 0), wetMat, [0, 0, 0], ng);
  kit.mesh(new THREE.CylinderGeometry(0.018, 0.018, dSurf - 0.12 - 0.05, 10).translate(0, (dSurf - 0.17) / 2 + 0.05, 0), wetMat, [0, 0, 0], ng);
  kit.mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 10).translate(0, dSurf - 0.12 + 0.06, 0), M.iron, [0, 0, 0], ng);
  kit.mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 14), M.iron, [0, dSurf - 0.12 + 0.12, 0], ng);
  kit.mesh(new THREE.CylinderGeometry(0.004, 0.004, DH + 0.02 - (dSurf + 0.13), 4).translate(0, (DH + 0.02 - (dSurf + 0.13)) / 2, 0), threadMat, [0, dSurf + 0.13, 0], db[0].group);
  // Silver wire: a coil hanging from the rod.
  const coil = [];
  for (let i = 0; i <= 40; i++) { const a = i * 0.55; coil.push(new THREE.Vector3(Math.cos(a) * 0.05, 0.15 + i * 0.011, Math.sin(a) * 0.05)); }
  coil.push(new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(0, DH + 0.02, 0));
  kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 120, 0.009, 6), M.silver, [0, 0, 0], db[1].group);
  const bits = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.018, 0), M.copper, 24);
  bits.frustumCulled = false; bits.count = 0; db[0].group.add(bits);
  { const m4 = new THREE.Matrix4(); for (let i = 0; i < 24; i++) { const a = rand(i) * 6.28, r = 0.05 + rand(i + 40) * 0.28; m4.makeRotationY(rand(i + 7) * 3); m4.setPosition(Math.cos(a) * r, 0.012, Math.sin(a) * r); bits.setMatrixAt(i, m4); } }
  const tags3 = [tag('Iron nail', S3, -0.75, 1.05, 0), tag('Silver wire', S3, 0.75, 1.05, 0), tag('Copper sulfate solution', S3, 0, -0.02, 0.6, 'cool')];
  const ds = { p: 0, auto: true, slider: null, msg: '' };
  function setProgress(p) {
    ds.p = p;
    const coat = Math.min(1, Math.sqrt(p / 100) * 1.1);
    wetMat.color.lerpColors(C.iron, C.copper, coat);
    wetMat.roughness = 0.42 + 0.4 * coat;
    db[0].mat.color.lerpColors(C.blue, C.green, p / 100);
    bits.count = Math.round(24 * p / 100);
    bits.instanceMatrix.needsUpdate = true;
    const msg = `Time passing: <b>${Math.round(p)}%</b><br>Iron nail: ${p < 5 ? 'grey' : p < 40 ? 'turning pink-brown' : 'coated with copper'} · solution: ${p < 30 ? 'blue' : p < 75 ? 'paler blue-green' : 'pale green'}<br>Fe + CuSO₄ → FeSO₄ + Cu<br>Silver wire: no change (silver is below copper)`;
    if (msg !== ds.msg) { ds.msg = msg; ui.readout(msg); }
  }

  // ======================= Step 4: the reactivity ladder =======================
  const S4 = station(X.ladder);
  const ry = i => 0.55 + (LAD.length - 1 - i) * 0.34;
  const hot = new THREE.Color(0xff8f80), cool = new THREE.Color(0xffe29a);
  const rungMats = LAD.map((s, i) => new THREE.MeshStandardMaterial({ color: s === 'H' ? 0xffffff : hot.clone().lerp(cool, i / (LAD.length - 1)), roughness: 0.55, emissive: 0x000000 }));
  LAD.forEach((s, i) => {
    kit.mesh(new THREE.BoxGeometry(1.1, s === 'H' ? 0.2 : 0.28, 0.3), rungMats[i], [0, ry(i), 0], S4);
    const sg = sign(k, { parent: S4, w: 1.0, h: 0.25, px: 256, py: 64, bg: null, text: s === 'H' ? '(H)  hydrogen' : `${s}  ${cap(NAME[s])}`, font: 'bold 30px sans-serif' });
    sg.position.set(0, ry(i), 0.152);
  });
  for (const x of [-0.6, 0.6]) kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.3, 8), M.steel, [x, 2.25, -0.05], S4);
  const topSign = sign(k, { parent: S4, w: 1.6, h: 0.3, px: 512, py: 96, text: '▲ more reactive', bg: null, font: 'bold 52px sans-serif', color: '#c92a2a' });
  topSign.position.set(0, ry(0) + 0.33, 0);
  const botSign = sign(k, { parent: S4, w: 1.6, h: 0.3, px: 512, py: 96, text: '▼ less reactive', bg: null, font: 'bold 52px sans-serif', color: '#2b6cb0' });
  botSign.position.set(0, ry(LAD.length - 1) - 0.34, 0.15);
  const pointer = (color, dir) => {
    const g = new THREE.Group(); S4.add(g);
    const m = plain(color, { roughness: 0.4 });
    kit.mesh(new THREE.ConeGeometry(0.1, 0.22, 16).rotateZ(-dir * Math.PI / 2), m, [0, 0, 0], g);
    kit.mesh(new THREE.BoxGeometry(0.22, 0.07, 0.07), m, [-dir * 0.2, 0, 0], g);
    g.userData.mat = m;
    return g;
  };
  const tokM = pointer(0x1f6feb, 1), tokS = pointer(0x2f9e44, -1);
  tokM.position.set(-0.76, ry(9), 0.1); tokS.position.set(0.76, ry(9), 0.1);
  const tags4 = [tag('Metal', tokM, -0.42, 0.1, 0, 'cool'), tag('Solution', tokS, 0.5, 0.1, 0)];
  const ld = { m: 10, s: 0, auto: true, slider: null, row: null, msg: '' };
  function ladderReadout() {
    const ms = METALS[ld.m], sol = SOLS[ld.s], im = LAD.indexOf(ms), is = LAD.indexOf(sol.sym);
    rungMats.forEach((m, i) => m.emissive.setHex(i === im ? 0x1d3a6e : i === is ? 0x1e5a2c : 0x000000));
    let res, ok = false;
    if (ms === sol.sym) res = `Same metal as in the solution: nothing changes.`;
    else if (im < is && ['K', 'Na', 'Ca'].includes(ms)) res = `${cap(NAME[ms])} is above ${NAME[sol.sym]}, but it reacts with the <b>water</b> first, making hydrogen and ${NAME[ms]} hydroxide, so it does not simply swap places.`;
    else if (im < is) { ok = true; res = `${cap(NAME[ms])} is above ${NAME[sol.sym]}, so it <b>displaces</b> it:<br>${NAME[ms]} + ${sol.salt} → ${saltOf(ms, sol.anion)} + ${NAME[sol.sym]}`; }
    else res = `${cap(NAME[ms])} is below ${NAME[sol.sym]}: <b>no reaction</b>.`;
    tokS.userData.mat.color.setHex(ok ? 0x2f9e44 : 0x868e96);
    const acidLine = im < LAD.indexOf('H') ? `${cap(NAME[ms])} is above (H): it reacts with dilute acid to give hydrogen.` : `${cap(NAME[ms])} is below (H): no reaction with dilute acid.`;
    const msg = `Metal: <b>${cap(NAME[ms])}</b> · Solution: <b>${sol.salt}</b><br>${res}<br>${acidLine}`;
    if (msg !== ld.msg) { ld.msg = msg; ui.readout(msg); }
  }
  function tickLadder(dt) {
    if (ld.auto) { const m = Math.max(3, 10 - Math.floor(st.time / 0.45)); if (m !== ld.m) { ld.m = m; ld.slider?.set(m); ladderReadout(); } }
    let moving = kit.follow(tokM.position, 'y', ry(LAD.indexOf(METALS[ld.m])), dt, 7);
    moving = kit.follow(tokS.position, 'y', ry(LAD.indexOf(SOLS[ld.s].sym)), dt, 7) || moving;
    return moving || (ld.auto && st.time < 3.5);
  }

  // ======================= Step 5: extracting metals =======================
  const S5 = station(X.extract);
  const EX = [-1.85, 0, 1.75];
  // Gold: a quartz rock with gold in it, and a pan of river gravel with nuggets.
  const G0 = new THREE.Group(); G0.position.x = EX[0]; S5.add(G0);
  const rock = kit.mesh(new THREE.DodecahedronGeometry(0.33, 0), plain(0xe9ecef, { roughness: 0.6, flatShading: true }), [-0.25, 0.27, -0.05], G0);
  rock.scale.set(1.2, 0.85, 1);
  for (let i = 0; i < 5; i++) kit.mesh(new THREE.IcosahedronGeometry(0.05 + 0.03 * rand(i), 0), M.gold, [-0.25 + (rand(i + 1) - 0.5) * 0.45, 0.27 + (rand(i + 2) - 0.3) * 0.3, 0.2 + rand(i + 3) * 0.08], G0);
  const pan = new THREE.Group(); pan.position.set(0.4, 0.04, 0.15); G0.add(pan);
  kit.mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.08, 24, 1, true), plain(0x495057, { side: THREE.DoubleSide }), [0, 0.04, 0], pan);
  kit.mesh(new THREE.CircleGeometry(0.24, 24).rotateX(-Math.PI / 2), plain(0x8c7a5b), [0, 0.005, 0], pan);
  kit.mesh(new THREE.CircleGeometry(0.3, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x74c0fc, transparent: true, opacity: 0.45 }), [0, 0.05, 0], pan);
  for (let i = 0; i < 4; i++) kit.mesh(new THREE.IcosahedronGeometry(0.03, 0), M.gold, [(rand(i + 20) - 0.5) * 0.3, 0.025, (rand(i + 30) - 0.5) * 0.3], pan);
  // Iron: blast furnace with hot-air ring and a stream of molten iron into a ladle.
  const G1 = new THREE.Group(); G1.position.x = EX[1]; S5.add(G1);
  const prof = [[0.34, 0], [0.4, 0.25], [0.44, 0.55], [0.36, 1.25], [0.27, 1.65], [0.25, 1.65]].map(([x, y]) => new THREE.Vector2(x, y));
  kit.mesh(new THREE.LatheGeometry(prof, 24), plain(0x9c4a3a, { roughness: 0.85 }), [0, 0, 0], G1);
  kit.mesh(new THREE.CircleGeometry(0.26, 20).rotateX(-Math.PI / 2), plain(0x2b2b2b), [0, 1.64, 0], G1);
  kit.mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 32).rotateX(Math.PI / 2), plain(0x6c7a89), [0, 0.42, 0], G1);
  const moltenMat = new THREE.MeshBasicMaterial({ color: 0xff7b1a });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  kit.mesh(new THREE.CircleGeometry(0.07, 14), moltenMat, [0, 0.12, 0.395], G1).castShadow = false;
  const stream = tube(k, [[0, 0.12, 0.4], [0, 0.11, 0.55], [0, 0.04, 0.68], [0, -0.02, 0.72]], { r: 0.03, parent: G1, mat: moltenMat });
  stream.renderOrder = 0;
  kit.mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.18, 18, 1, true), plain(0x343a40, { side: THREE.DoubleSide }), [0, 0.09, 0.75], G1);
  kit.mesh(new THREE.CircleGeometry(0.16, 18).rotateX(-Math.PI / 2), moltenMat, [0, 0.15, 0.75], G1).castShadow = false;
  const furnGlow = kit.mesh(new THREE.SphereGeometry(0.22, 14, 10), glowMat, [0, 0.12, 0.6], G1);
  furnGlow.castShadow = false;
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xced4da, transparent: true, opacity: 0.35, depthWrite: false });
  const smoke = [0, 1, 2].map(i => kit.mesh(new THREE.SphereGeometry(0.12, 12, 8), smokeMat, [0, 1.75, 0], G1));
  smoke.forEach(s => { s.castShadow = false; });
  // Aluminium: electrolysis cell with an open front: molten aluminium, molten bath, carbon blocks, power.
  const G2 = new THREE.Group(); G2.position.x = EX[2]; S5.add(G2);
  const cellMat = plain(0x5c636a, { roughness: 0.6 });
  kit.mesh(new THREE.BoxGeometry(1.1, 0.06, 0.6), cellMat, [0, 0.03, 0], G2);
  kit.mesh(new THREE.BoxGeometry(1.1, 0.42, 0.06), cellMat, [0, 0.21, -0.27], G2);
  for (const x of [-0.52, 0.52]) kit.mesh(new THREE.BoxGeometry(0.06, 0.42, 0.6), cellMat, [x, 0.21, 0], G2);
  kit.mesh(new THREE.BoxGeometry(0.98, 0.07, 0.48), M.alu, [0, 0.095, 0], G2);
  const bathMat = new THREE.MeshBasicMaterial({ color: 0xff8c42, transparent: true, opacity: 0.75, depthWrite: false });
  const bath = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.2, 0.48), bathMat);
  bath.position.set(0, 0.23, 0); bath.renderOrder = 2; G2.add(bath);
  const carbon = plain(0x2b2d31, { roughness: 0.9 });
  const ANX = [-0.3, 0, 0.3];
  ANX.forEach(x => {
    kit.mesh(new THREE.BoxGeometry(0.22, 0.3, 0.3), carbon, [x, 0.4, 0], G2);
    kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), M.copper, [x, 0.62, 0], G2);
  });
  kit.mesh(new THREE.BoxGeometry(0.9, 0.06, 0.08), M.copper, [0, 0.72, 0], G2);
  kit.mesh(new THREE.BoxGeometry(0.28, 0.3, 0.22), plain(0x868e96), [0.9, 0.15, -0.1], G2);
  smallSign(G2, 'Power', 0.9, 0.2, 0.012, 0.26);
  tube(k, [[0.45, 0.72, 0], [0.7, 0.7, -0.05], [0.85, 0.32, -0.1]], { r: 0.018, parent: G2, mat: redW });
  const alFizz = ANX.map(x => bubbles(k, { parent: G2, n: 14, r: 0.09, y0: 0.15, y1: 0.33, size: 0.02, x, z: 0.12 }));
  const tags5 = [tag('Gold: native', G0, 0, 0.75, 0), tag('Iron: carbon', G1, 0, 1.95, 0), tag('Aluminium: electrolysis', G2, -0.1, 0.98, 0), tag('Molten aluminium', G2, -0.2, 0.08, 0.3, 'cool')];
  const EXT = [
    { name: 'Gold', view: { radius: 0.75, yaw: 0.15, pitch: 0.3, target: [X.extract + EX[0], 0.3, 0] }, text: '<b>Gold</b> is at the bottom of the series. It hardly reacts, so it is found as the pure metal (native gold) in rocks and river gravel. It only has to be separated from the rock, for example by panning.' },
    { name: 'Iron', view: { radius: 1.05, yaw: 0.25, pitch: 0.2, target: [X.extract + EX[1], 0.85, 0.2] }, text: '<b>Iron</b> is below carbon. In a blast furnace, hot air burns coke to carbon monoxide, which takes the oxygen from the iron ore:<br>Fe₂O₃ + 3CO → 2Fe + 3CO₂ · molten iron runs out at the bottom.' },
    { name: 'Aluminium', view: { radius: 0.8, yaw: -0.15, pitch: 0.3, target: [X.extract + EX[2] + 0.15, 0.35, 0] }, text: '<b>Aluminium</b> is above carbon, so carbon cannot take its oxygen. Electricity splits molten aluminium oxide: 2Al₂O₃ → 4Al + 3O₂. Aluminium collects at the bottom; the oxygen reacts with the carbon blocks, making the gas bubbles.' },
  ];
  const ex = { sel: -1 };
  function pickExtract(i) { ex.sel = i; tags5[3].show(i === 2); view(EXT[i].view); ui.readout(EXT[i].text + '<br>Higher in the series → harder to extract.'); }
  function tickExtract(t) {
    pan.rotation.y = Math.sin(t * 1.4) * 0.5;
    furnGlow.scale.setScalar(1 + 0.12 * Math.sin(t * 5));
    glowMat.opacity = 0.45 + 0.15 * Math.sin(t * 7);
    smoke.forEach((s, i) => { const p = ((t * 0.35 + i / 3) % 1 + 1) % 1; s.position.set(Math.sin(p * 4 + i) * 0.05, 1.7 + p * 0.6, 0); s.scale.setScalar(0.6 + p * 1.2); });
    smokeMat.opacity = 0.3;
    alFizz.forEach((b, i) => b.tick(t + i * 1.3, 0.7));
    return true;
  }

  // ======================= Step 6: what rusting needs =======================
  const S6 = station(X.rust);
  rack(S6);
  const RX = [-0.75, 0, 0.75], RH = 1.1;
  const rtA = testTube(k, { parent: S6, r: 0.16, h: RH, pos: [RX[0], 0.06, 0], fill: 0.42, color: 0xd6ecfa, opacity: 0.5 });
  const rtB = testTube(k, { parent: S6, r: 0.16, h: RH, pos: [RX[1], 0.06, 0], fill: 0.6, color: 0xd6ecfa, opacity: 0.5 });
  const rtC = testTube(k, { parent: S6, r: 0.16, h: RH, pos: [RX[2], 0.06, 0], fill: 0, color: 0xffffff });
  kit.mesh(new THREE.CylinderGeometry(0.143, 0.143, 0.07, 18), new THREE.MeshStandardMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.85, roughness: 0.2 }), [0, RH * 0.6 + 0.035, 0], rtB.group).castShadow = false;
  stopper(k, { nr: 0.16, y: RH, parent: rtB.group });
  stopper(k, { nr: 0.16, y: RH, parent: rtC.group });
  const caMat = plain(0xffffff, { roughness: 0.9 });
  for (let i = 0; i < 16; i++) kit.mesh(new THREE.DodecahedronGeometry(0.035, 0), caMat, [(rand(i) - 0.5) * 0.18, 0.05 + (i % 4) * 0.04, (rand(i + 5) - 0.5) * 0.18], rtC.group).castShadow = false;
  const cotton = kit.mesh(new THREE.SphereGeometry(0.14, 14, 10), plain(0xf8f9fa, { roughness: 1 }), [0, 0.3, 0], rtC.group);
  cotton.scale.set(1, 0.45, 1);
  const nailA = nail(rtA.group, { len: 0.72 }); nailA.position.set(0.02, 0.05, 0); nailA.rotation.z = -0.1;
  const nailB = nail(rtB.group, { len: 0.52 }); nailB.position.set(0, 0.05, 0);
  const nailC = nail(rtC.group, { len: 0.55 }); nailC.position.set(0, 0.36, 0);
  const flakes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.008, 0.02), plain(0x8a3b14, { roughness: 1 }), 28);
  flakes.frustumCulled = false; flakes.count = 0; rtA.group.add(flakes);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1); for (let i = 0; i < 28; i++) { e.set(rand(i) * 3, rand(i + 1) * 3, rand(i + 2) * 3); q.setFromEuler(e); p.set((rand(i + 3) - 0.5) * 0.18, 0.04 + rand(i + 4) * 0.03, (rand(i + 5) - 0.5) * 0.18); m4.compose(p, q, s); flakes.setMatrixAt(i, m4); } }
  smallSign(S6, 'Water + air', RX[0], RH + 0.36, 0, 0.66);
  smallSign(S6, 'No air', RX[1], RH + 0.36, 0, 0.66);
  smallSign(S6, 'No water', RX[2], RH + 0.36, 0, 0.66);
  const tags6 = [tag('Oil', rtB.group, 0.27, RH * 0.6 + 0.02, 0)];
  const waterA = new THREE.Color(0xd6ecfa), waterRust = new THREE.Color(0xd9a77a);
  const rs = { days: 0, auto: true, slider: null, msg: '' };
  function setDays(d) {
    rs.days = d;
    const f = kit.clamp(d / 5, 0, 1);
    nailA.userData.mat.color.lerpColors(C.iron, C.rust, f);
    nailA.userData.mat.metalness = 0.85 - 0.75 * f;
    nailA.userData.mat.roughness = 0.42 + 0.5 * f;
    rtA.mat.color.lerpColors(waterA, waterRust, f * 0.5);
    flakes.count = Math.round(28 * kit.clamp((d - 1) / 6, 0, 1));
    flakes.instanceMatrix.needsUpdate = true;
    const msg = `Days: <b>${d}</b><br>Water + air: ${d < 1 ? 'shiny grey' : d < 4 ? 'orange-brown spots appear' : '<b>rusty</b>, flakes fall off'}<br>No air (boiled water + oil): no rust · No water (dry air): no rust<br>iron + oxygen + water → rust (hydrated iron(III) oxide)`;
    if (msg !== rs.msg) { rs.msg = msg; ui.readout(msg); }
  }

  // ======================= Step 7: stopping rust =======================
  const S7 = station(X.protect);
  kit.mesh(new THREE.BoxGeometry(3.4, 0.05, 1.3), plain(0x5a6d7c), [0, 0.025, 0], S7);
  const film = kit.mesh(new THREE.BoxGeometry(3.3, 0.005, 1.2), new THREE.MeshStandardMaterial({ color: 0x74c0fc, transparent: true, opacity: 0.4, roughness: 0.05 }), [0, 0.053, 0], S7);
  film.castShadow = false;
  const zincTex = paint(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = '#b9c3cc'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const v = 175 + rand(i) * 70 | 0; g.fillStyle = `rgba(${v},${v + 4},${v + 8},0.8)`; g.beginPath(); const x = rand(i + 3) * w, y = rand(i + 4) * h; g.moveTo(x, y); for (let j = 0; j < 5; j++) g.lineTo(x + (rand(i * 7 + j) - 0.5) * 50, y + (rand(i * 11 + j) - 0.5) * 50); g.fill(); }
  });
  const BX = [-1.2, -0.4, 0.4, 1.2];
  const bareMat = metal(0x9aa1a8, 0.42), paintMat = plain(0x1c7ed6, { roughness: 0.45 }), oilMat = new THREE.MeshStandardMaterial({ color: 0x5c636a, metalness: 0.7, roughness: 0.08, envMap: envTex }), zincMat = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, map: zincTex, metalness: 0.6, roughness: 0.45, envMap: envTex });
  const bars = [bareMat, paintMat, oilMat, zincMat].map((m, i) => kit.mesh(new THREE.BoxGeometry(0.24, 0.14, 0.95), m, [BX[i], 0.125, -0.05], S7));
  const scratchP = new THREE.MeshStandardMaterial({ color: 0x8d939a, roughness: 0.5 });
  const scratchZ = new THREE.MeshStandardMaterial({ color: 0x8d939a, roughness: 0.5 });
  const scr = [[1, scratchP], [3, scratchZ]].map(([i, m]) => { const s = kit.mesh(new THREE.BoxGeometry(0.03, 0.006, 0.7), m, [BX[i], 0.197, -0.05], S7); s.rotation.y = 0.18; s.castShadow = false; return s; });
  const patchMat = new THREE.MeshStandardMaterial({ color: 0x9a4a1e, transparent: true, opacity: 0, roughness: 1, depthWrite: false });
  const patch = kit.mesh(new THREE.BoxGeometry(0.1, 0.004, 0.72), patchMat, [BX[1], 0.199, -0.05], S7);
  patch.rotation.y = 0.18; patch.castShadow = false;
  ['Bare iron', 'Painted', 'Oiled', 'Galvanised'].forEach((t, i) => { const s = smallSign(S7, t, BX[i], 0.09, 0.66, 0.68); s.rotation.x = -0.5; });
  // Rain: thin streaks falling over the tray (positions from t only).
  const RAIN = 70;
  const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.12, 0.008), new THREE.MeshBasicMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.7 }), RAIN);
  rain.frustumCulled = false; rain.castShadow = false; S7.add(rain);
  const rainA = rain.instanceMatrix.array;
  const rn = { days: 0, scratch: false, auto: true, slider: null, msg: '' };
  function setRain(d) {
    rn.days = d;
    const f = kit.clamp(d / 20, 0, 1);
    bareMat.color.lerpColors(C.iron, C.rust, f); bareMat.metalness = 0.85 - 0.75 * f; bareMat.roughness = 0.42 + 0.5 * f;
    scr.forEach(s => { s.visible = rn.scratch; });
    patch.visible = rn.scratch;
    patchMat.opacity = rn.scratch ? f * 0.95 : 0;
    patch.scale.x = 0.4 + 1.2 * f;
    scratchP.color.lerpColors(C.iron, C.rust, rn.scratch ? f : 0);
    const msg = `Days in the rain: <b>${d}</b><br>Bare iron: ${d < 3 ? 'grey' : d < 12 ? 'rust spots' : '<b>rusty</b>'} · Oiled: no rust<br>Painted: ${rn.scratch ? (d < 3 ? 'scratched' : '<b>rusts along the scratch</b>') : 'no rust'} · Galvanised: no rust${rn.scratch ? ', even where scratched: the zinc corrodes instead' : ''}`;
    if (msg !== rn.msg) { rn.msg = msg; ui.readout(msg); }
  }
  function tickRain(t) {
    for (let i = 0; i < RAIN; i++) {
      const ph = ((t * (1.6 + 0.4 * rand(i)) + rand(i + 50)) % 1 + 1) % 1, o = i * 16;
      rainA[o] = 1; rainA[o + 5] = 1; rainA[o + 10] = 1; rainA[o + 15] = 1;
      rainA[o + 12] = (rand(i + 100) - 0.5) * 3.2; rainA[o + 13] = 1.4 - ph * 1.3; rainA[o + 14] = (rand(i + 200) - 0.5) * 1.2;
    }
    rain.instanceMatrix.needsUpdate = true;
    return true;
  }

  // ======================= Steps =======================
  const stations = [S0, S1, S2, S3, S4, S5, S6, S7];
  const tagSets = [tags0, tags1, tags2, tags3, tags4, tags5, tags6, []];
  const st = { step: 0, time: 0, quiz: false, plan: [] };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.time = 0; st.plan = [];
      const si = isQuiz ? 4 : i;
      stations.forEach((g, j) => { g.visible = j === si; });
      tagSets.flat().forEach(t => t.show(false));
      if (!isQuiz) tagSets[i].forEach(t => t.show(true));
      sun.position.set(X[Object.keys(X)[si]] + 4, 10, 7);
      sun.target.position.set(X[Object.keys(X)[si]], 0, 0);
      sun.target.updateMatrixWorld();
      if (i === 0) {
        view({ radius: 1.15, width: 1.7, yaw: 0, pitch: 0.62, target: [X.prop, 0.25, 0] });
        Object.assign(pr, { strip: null, heat: null, hammer: null, wire: null, msg: '' });
        const row = ui.buttons([
          { label: 'Test conductivity', onClick: () => { st.plan = []; pr.strip = st.time; } },
          { label: 'Heat the rod', onClick: () => { st.plan = []; pr.heat = st.time; } },
          { label: 'Hammer it', onClick: () => { st.plan = []; pr.hammer = st.time; } },
          { label: 'Pull into a wire', onClick: () => { st.plan = []; pr.wire = st.time; } },
        ]);
        st.plan = [[0.2, () => { pr.strip = st.time; row.select(0); }], [0.5, () => { pr.heat = st.time; row.select(1); }], [0.8, () => { pr.hammer = st.time; row.select(2); }], [1.1, () => { pr.wire = st.time; row.select(3); }]];
      }
      if (i === 1) {
        view({ radius: 0.85, width: 1.75, yaw: 0, pitch: 0.32, target: [X.water, 0.5, 0] });
        wt.temp = 20; wt.na = null; wt.msg = '';
        wt.slider = ui.slider({ label: 'Water temperature', min: 20, max: 90, step: 5, value: 20, unit: ' °C', onInput: v => { st.plan = []; wt.temp = v; } });
        ui.buttons([{ label: 'Add sodium', onClick: () => { wt.na = st.time; } }]);
        st.plan = [[0.2, () => { wt.na = st.time; }], [1.4, () => { wt.temp = 40; wt.slider.set(40); }], [2.2, () => { wt.temp = 70; wt.slider.set(70); }]];
      }
      if (i === 2) {
        view({ radius: 0.85, width: 1.4, yaw: 0, pitch: 0.18, target: [X.acid, 0.7, 0] });
        ac.t0 = 0; ac.msg = '';
        ui.buttons([{ label: 'Start again', onClick: () => { ac.t0 = st.time; } }]);
      }
      if (i === 3) {
        view({ radius: 0.85, width: 1.3, yaw: 0, pitch: 0.25, target: [X.disp, 0.5, 0] });
        ds.auto = true; ds.msg = '';
        ds.slider = ui.slider({ label: 'Time passing', min: 0, max: 100, step: 1, value: 0, unit: '%', onInput: v => { ds.auto = false; setProgress(v); } });
        setProgress(0);
      }
      if (i === 4 || isQuiz) {
        view(isQuiz ? { radius: 2.2, yaw: -0.3, pitch: 0.15, target: [X.ladder, 2.3, 0] } : { radius: 2.25, yaw: 0, pitch: 0.08, target: [X.ladder, 2.3, 0] });
        tokM.visible = tokS.visible = !isQuiz;
        ld.msg = ''; ld.auto = !isQuiz; ld.m = 10; ld.s = 0;
        tokM.position.y = ry(LAD.indexOf(METALS[ld.m])); tokS.position.y = ry(LAD.indexOf('Cu'));
        if (!isQuiz) {
          ld.slider = ui.slider({ label: 'Metal', min: 0, max: METALS.length - 1, step: 1, value: ld.m, format: v => cap(NAME[METALS[v]]), onInput: v => { ld.auto = false; ld.m = v; ladderReadout(); } });
          ld.row = ui.buttons(SOLS.map((s, j) => ({ label: s.label, on: j === 0, onClick: () => { ld.auto = false; ld.s = j; ladderReadout(); } })));
          ladderReadout();
        } else rungMats.forEach(m => m.emissive.setHex(0));
      }
      if (i === 5) {
        view({ radius: 1.0, width: 2.7, yaw: 0, pitch: 0.25, target: [X.extract, 0.75, 0] });
        ex.sel = -1; tags5[3].show(false);
        ui.buttons(EXT.map((e, j) => ({ label: e.name, onClick: () => pickExtract(j) })));
        ui.readout('<b>Gold</b>: found pure · <b>Iron</b>: heated with carbon · <b>Aluminium</b>: electrolysis<br>The higher a metal is in the series, the harder it is to get out of its ore.');
      }
      if (i === 6) {
        view({ radius: 0.9, width: 1.25, yaw: 0, pitch: 0.15, target: [X.rust, 0.75, 0] });
        rs.auto = true; rs.msg = '';
        rs.slider = ui.slider({ label: 'Days', min: 0, max: 7, step: 1, value: 0, onInput: v => { rs.auto = false; setDays(v); } });
        setDays(0);
      }
      if (i === 7) {
        view({ radius: 0.75, width: 1.8, yaw: 0, pitch: 0.55, target: [X.protect, 0.2, 0] });
        rn.auto = true; rn.scratch = false; rn.msg = '';
        rn.slider = ui.slider({ label: 'Days in the rain', min: 0, max: 30, step: 1, value: 0, onInput: v => { rn.auto = false; setRain(v); } });
        ui.toggle({ label: 'Scratch the coatings', value: false, onChange: v => { rn.scratch = v; setRain(rn.days); } });
        setRain(0);
      }
    },

    update(dt, t) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step, T = st.time;
      if (s === 0) return tickProps(t);
      if (s === 1) return tickWater(t);
      if (s === 2) return tickAcid(t);
      if (s === 3) {
        if (ds.auto) { const p = Math.min(100, Math.round(Math.max(0, T - 0.4) * 25)); if (p !== ds.p) { setProgress(p); ds.slider.set(p); } }
        return ds.auto && T < 5;
      }
      if (s === 4) return tickLadder(dt);
      if (s === 5) return tickExtract(t);
      if (s === 6) {
        if (rs.auto) { const d = Math.min(7, Math.floor(Math.max(0, T - 0.3) * 2.6)); if (d !== rs.days) { setDays(d); rs.slider.set(d); } }
        return rs.auto && T < 3.5;
      }
      if (s === 7) {
        if (rn.auto) { const d = Math.min(30, Math.floor(Math.max(0, T - 0.3) * 12)); if (d !== rn.days) { setRain(d); rn.slider.set(d); } }
        return tickRain(t);
      }
      return false;
    },
  };
}
