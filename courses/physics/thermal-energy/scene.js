// Thermal energy (grade 8): temperature vs thermal energy (particle bubbles over a bath and a cup), conduction
// along copper, steel and wooden rods (wax drops fall off in order), a particle model of conduction, convection
// currents in a heated tank and in a room, radiation from a heat lamp to a black and a shiny can, a cut-away
// vacuum flask, and Q = m·c·ΔT on a hot plate. Each demo is its own group at the origin, shown only in its step.
// Heat flow numbers come from small time-compressed models; the readouts say "model" where that matters.
import { rand, panel, paint } from '../_shared/lab.js';
import { glassMat, liquidMat, liquidBox, liquidColumn, glassBox, glassTube } from '../_shared/fluids.js';

const C_WATER = 4200;   // J/(kg·°C), the rounded value used in KHTN 8
const ROOM = 20;        // °C
const comma = n => Math.round(n).toLocaleString('en-US');
const BATH_KG = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
const CUP_KG = 0.25;

// Conduction rods: copper, steel and wood. D = how fast heat spreads in the model (copper about 5 times steel,
// wood about 700 times slower). Wax melts at about 55 °C.
const N_ROD = 24, ROD_L = 6, ROD_X0 = -2.6, ROD_Y = 1.7, HOT = 250, WAX_MELT = 55, ROD_LOSS = 0.03;
const RODS = [
  { name: 'Copper', color: 0xc8773f, D: 15, z: -0.9, metal: 0.6 },
  { name: 'Steel', color: 0x9aa4ad, D: 3, z: 0, metal: 0.6 },
  { name: 'Wood', color: 0xa8763e, D: 0.02, z: 0.9, metal: 0 },
];
const DROP_CELLS = [4, 8, 12, 16, 20];
// Particle model of conduction: a slab of 14 × 4 particles.
const LX = 14, LY = 4, LS = 0.42;

const PARTS = [
  { key: 'stopper', name: 'Stopper', text: 'The <b>plastic stopper</b> is a poor conductor. It stops warm air rising out (convection) and steam escaping.' },
  { key: 'vacuum', name: 'Vacuum', text: 'The <b>vacuum</b> between the two glass walls has no particles at all, so heat cannot cross it by <b>conduction</b> or <b>convection</b>.' },
  { key: 'silver', name: 'Silvered walls', text: 'The <b>shiny silvered walls</b> reflect infrared back towards the drink, so very little heat escapes by <b>radiation</b>.' },
  { key: 'case', name: 'Case', text: 'The <b>plastic case</b> protects the thin glass. Plastic is a poor conductor, and an air gap and soft pads hold the bottle.' },
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xe6dccb, sky: 0xe4f1fb, radius: 30 });
  const sun = kit.lights(scene, { sun: [5, 10, 6] });
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  const clamp = kit.clamp, lerp = kit.lerp;
  const waterMat = liquidMat(THREE, 0x3b9be0, 0.4);
  const red = new THREE.MeshBasicMaterial({ color: 0xe0303a });
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), c2 = new THREE.Color();
  const COLD = new THREE.Color(0x2f6fd6), WARM = new THREE.Color(0xffb020), HOTC = new THREE.Color(0xe8301c);
  // Temperature colour: blue at 20 °C, orange around 60 °C, red from about 150 °C.
  const tempColor = (T, out, lo = ROOM, mid = 60, hi = 150) => {
    if (T <= mid) return out.copy(COLD).lerp(WARM, clamp((T - lo) / (mid - lo), 0, 1));
    return out.copy(WARM).lerp(HOTC, clamp((T - mid) / (hi - mid), 0, 1));
  };

  // ---------- shared little builders ----------
  function thermometer(len = 1.6, r = 0.05) {
    const g = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), glassMat(THREE, 0.35));
    tube.position.y = len / 2 + r; tube.renderOrder = 3;
    kit.mesh(new THREE.SphereGeometry(r * 1.9, 16, 12), red, [0, 0, 0], g).castShadow = false;
    const cg = new THREE.CylinderGeometry(r * 0.5, r * 0.5, 1, 8); cg.translate(0, 0.5, 0);
    const column = new THREE.Mesh(cg, red); column.position.y = r;
    g.add(tube, column);
    g.top = new THREE.Object3D(); g.top.position.y = len + 2 * r + 0.1; g.add(g.top);
    g.set = f => { column.scale.y = Math.max(0.01, clamp(f, 0, 1) * len); };
    g.set(0.2);
    return g;
  }
  function flame(s = 1) {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.2 * s, 0.75 * s, 16), new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.85, depthWrite: false }));
    outer.position.y = 0.375 * s;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.1 * s, 0.4 * s, 12), new THREE.MeshBasicMaterial({ color: 0x5aa8ff }));
    inner.position.y = 0.2 * s;
    g.add(outer, inner);
    g.flick = (t, p = 1) => { g.visible = p > 0.02; g.scale.set(p, p * (0.92 + 0.1 * Math.sin(t * 17) + 0.05 * Math.sin(t * 29)), p); };
    return g;
  }
  function burner(parent, x, y, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const metal = kit.mat(0x5d6873, { metalness: 0.5, roughness: 0.4 });
    kit.mesh(new THREE.CylinderGeometry(0.3 * s, 0.34 * s, 0.08 * s, 20), metal, [0, 0.04 * s, 0], g);
    kit.mesh(new THREE.CylinderGeometry(0.07 * s, 0.08 * s, 0.6 * s, 12), metal, [0, 0.38 * s, 0], g);
    const f = flame(s); f.position.y = 0.68 * s; g.add(f);
    g.flame = f;
    return g;
  }
  // A group of particles bouncing around inside a ball (a "magnifying bubble").
  function swarm(n, R, pr, color, seed) {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(pr, 10, 8), kit.mat(color, { roughness: 0.4 }), n);
    m.frustumCulled = false; m.castShadow = false;
    const p = new Float32Array(n * 3), v = new Float32Array(n * 3), lim = R - pr;
    for (let i = 0, k = 0; i < n; k++) {
      const x = rand(seed + k * 3) * 2 - 1, y = rand(seed + k * 3 + 1) * 2 - 1, z = rand(seed + k * 3 + 2) * 2 - 1;
      if (x * x + y * y + z * z > 0.8) continue;
      p.set([x * lim, y * lim, z * lim], i * 3);
      const a = rand(seed + 500 + i) * Math.PI * 2, b = Math.acos(rand(seed + 900 + i) * 2 - 1);
      v.set([Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)], i * 3);
      i++;
    }
    m.tick = (dt, speed) => {
      for (let i = 0; i < n; i++) {
        const j = i * 3;
        let x = p[j] + v[j] * speed * dt, y = p[j + 1] + v[j + 1] * speed * dt, z = p[j + 2] + v[j + 2] * speed * dt;
        const d = Math.hypot(x, y, z);
        if (d > lim) {
          const nx = x / d, ny = y / d, nz = z / d, vn = v[j] * nx + v[j + 1] * ny + v[j + 2] * nz;
          if (vn > 0) { v[j] -= 2 * vn * nx; v[j + 1] -= 2 * vn * ny; v[j + 2] -= 2 * vn * nz; }
          x = nx * lim; y = ny * lim; z = nz * lim;
        }
        p[j] = x; p[j + 1] = y; p[j + 2] = z;
        m.setMatrixAt(i, m4.makeTranslation(x, y, z));
      }
      m.instanceMatrix.needsUpdate = true;
    };
    m.tick(0, 0);
    return m;
  }
  const table = (parent, w, d, y = 0.3, color = 0xb98a5a) => kit.mesh(new THREE.BoxGeometry(w, 0.12, d), kit.mat(color, { roughness: 0.8 }), [0, y - 0.06, 0], parent);

  const demos = [];
  const demo = () => { const g = new THREE.Group(); g.visible = false; scene.add(g); demos.push(g); return g; };
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

  // ======================= 0. Temperature vs thermal energy =======================
  const eG = demo();
  const enamel = kit.mat(0xf4f6f8, { roughness: 0.35 });
  const BX = -2.3, BW = 3.6, BD = 2.2, BH = 1.35;
  for (const [x, y, z, w, h, d] of [[0, 0.06, 0, BW, 0.12, BD], [-BW / 2 + 0.06, BH / 2, 0, 0.12, BH, BD], [BW / 2 - 0.06, BH / 2, 0, 0.12, BH, BD],
    [0, BH / 2, -BD / 2 + 0.06, BW - 0.24, BH, 0.12], [0, BH / 2, BD / 2 - 0.06, BW - 0.24, BH, 0.12]]) kit.mesh(new THREE.BoxGeometry(w, h, d), enamel, [BX + x, y, z], eG);
  const bathWater = liquidBox(THREE, waterMat, BW - 0.24, BD - 0.24);
  bathWater.position.set(BX, 0.12, 0); eG.add(bathWater);
  const CX = 2.7;
  const cupMat = kit.mat(0xe85d75, { roughness: 0.5, side: THREE.DoubleSide });
  kit.mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.8, 24, 1, true), cupMat, [CX, 0.4, 0], eG);
  kit.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24), cupMat, [CX, 0.02, 0], eG);
  const handle = kit.mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 16, Math.PI), cupMat, [CX + 0.36, 0.42, 0], eG);
  handle.rotation.z = -Math.PI / 2;
  const tea = liquidColumn(THREE, liquidMat(THREE, 0x3b9be0, 0.55), 0.33, 24);
  tea.position.set(CX, 0.04, 0); tea.setLevel(0.66); eG.add(tea);
  // Steam puffs over the hot cup.
  const steam = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), 6);
  steam.frustumCulled = false; eG.add(steam);
  // Bubbles that "zoom in" on the water.
  const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.22, roughness: 0.1, depthWrite: false });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x6a8aa5 });
  const zoomLines = [];
  const bubble = (x, from) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 16), bubbleMat);
    b.position.set(x, 3.15, 0); b.renderOrder = 3; eG.add(b);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.02, 6, 48), ringMat);
    ring.position.copy(b.position); eG.add(ring);
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(from[0], from[1], 0), new THREE.Vector3(x - 0.7, 2.5, 0), new THREE.Vector3(from[0], from[1], 0), new THREE.Vector3(x + 0.7, 2.5, 0)]);
    const l = new THREE.LineSegments(geo, new THREE.LineDashedMaterial({ color: 0x6a8aa5, dashSize: 0.08, gapSize: 0.06 }));
    l.computeLineDistances(); eG.add(l); zoomLines.push(l);
    return b;
  };
  bubble(BX, [BX, 1.0]); bubble(CX, [CX, 0.7]);
  const bathSwarm = swarm(26, 0.95, 0.1, 0xf2a93b, 11), cupSwarm = swarm(26, 0.95, 0.1, 0xe5482f, 77);
  bathSwarm.position.set(BX, 3.15, 0); cupSwarm.position.set(CX, 3.15, 0);
  eG.add(bathSwarm, cupSwarm);
  const bathTag = label('Bath: 40 °C', anchor(eG, BX, 4.25, 0), { cls: 'warm' });
  const cupTag = label('Cup: 80 °C', anchor(eG, CX, 4.25, 0), { cls: 'warm' });
  const modelTag = label('Particles (model)', anchor(eG, 0.2, 3.2, 0));

  // ======================= 1. Conduction along rods =======================
  const rG = demo();
  table(rG, 8.6, 3.6, 0.3);
  const steelDark = kit.mat(0x4f5a64, { metalness: 0.6, roughness: 0.35 });
  const block = kit.mesh(new THREE.BoxGeometry(0.6, 0.5, 2.5), kit.mat(0x6c7781, { metalness: 0.6, roughness: 0.4 }), [ROD_X0 - 0.3, ROD_Y, 0], rG);
  for (const z of [-1.05, 1.05]) kit.mesh(new THREE.BoxGeometry(0.12, ROD_Y - 0.55, 0.12), steelDark, [ROD_X0 - 0.3, 0.3 + (ROD_Y - 0.55) / 2, z], rG);
  const rodBurner = burner(rG, ROD_X0 - 0.3, 0.3, 0, 1.1);
  kit.mesh(new THREE.BoxGeometry(0.16, 0.12, 2.4), kit.mat(0x8a6b4a), [ROD_X0 + ROD_L - 0.15, ROD_Y - 0.15, 0], rG);
  for (const z of [-1.1, 1.1]) kit.mesh(new THREE.BoxGeometry(0.1, ROD_Y - 0.5, 0.1), kit.mat(0x8a6b4a), [ROD_X0 + ROD_L - 0.15, 0.3 + (ROD_Y - 0.5) / 2, z], rG);
  const rods = RODS.map((def, ri) => {
    const geo = new THREE.CylinderGeometry(0.09, 0.09, ROD_L, 10, N_ROD * 2, false);
    geo.rotateZ(-Math.PI / 2); geo.translate(ROD_X0 + ROD_L / 2, 0, 0);
    const pos = geo.attributes.position, cell = new Uint8Array(pos.count);
    for (let i = 0; i < pos.count; i++) cell[i] = clamp(Math.floor((pos.getX(i) - ROD_X0) / ROD_L * N_ROD), 0, N_ROD - 1);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.count * 3), 3));
    const m = kit.mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: def.metal * 0.5, roughness: def.metal ? 0.35 : 0.8 }), [0, ROD_Y, def.z], rG);
    const base = new THREE.Color(def.color);
    const drops = DROP_CELLS.map(c => {
      const g = new THREE.Group();
      const x = ROD_X0 + (c + 0.5) * ROD_L / N_ROD;
      kit.mesh(new THREE.SphereGeometry(0.085, 12, 8), kit.mat(0xfff0b0, { roughness: 0.6 }), [0, 0, 0], g);
      kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), kit.mat(0xb8c2cc, { metalness: 0.7, roughness: 0.3 }), [0, -0.2, 0], g);
      kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), kit.mat(0xd62828), [0, -0.36, 0], g);
      rG.add(g);
      return { g, x, c, y: 0, v: 0, fallen: false, landed: false, rest: 0.3 + 0.05 + rand(ri * 10 + c) * 0.02 };
    });
    const tag = label(def.name, anchor(rG, 2.3 - ri * 1.25, ROD_Y + 0.2, def.z), { cls: ri === 2 ? '' : 'warm' });
    return { def, m, cell, base, drops, tag, T: new Float32Array(N_ROD).fill(ROOM), tmp: new Float32Array(N_ROD) };
  });
  const rodsTag = label('Flame', anchor(rG, ROD_X0 - 0.3, 0.75, 1.0), { cls: 'warm' });

  // ======================= 2. Particle model of conduction =======================
  const pG = demo();
  table(pG, 8, 3, 0.3);
  const LX0 = -(LX - 1) * LS / 2, LY0 = 1.5;
  const latBurner = burner(pG, LX0 - 0.1, 0.3, 0, 0.9);
  const lattice = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 14, 10), kit.mat(0xffffff, { roughness: 0.4 }), LX * LY);
  lattice.frustumCulled = false; lattice.castShadow = false;
  for (let i = 0; i < LX * LY; i++) lattice.setColorAt(i, COLD);
  pG.add(lattice);
  const bondPos = new Float32Array(((LX - 1) * LY + LX * (LY - 1)) * 6);
  const bondGeo = new THREE.BufferGeometry();
  bondGeo.setAttribute('position', new THREE.BufferAttribute(bondPos, 3));
  const bonds = new THREE.LineSegments(bondGeo, new THREE.LineBasicMaterial({ color: 0x8796a5 }));
  bonds.frustumCulled = false; pG.add(bonds);
  const latPos = new Float32Array(LX * LY * 3);
  const latPhase = Float32Array.from({ length: LX * LY * 2 }, (_, i) => rand(i + 300) * Math.PI * 2);
  const NE = 18;
  const electrons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd60a }), NE);
  electrons.frustumCulled = false; pG.add(electrons);
  const eP = Float32Array.from({ length: NE * 2 }, (_, i) => (i % 2 ? LY0 + (rand(i + 40) - 0.5) * (LY - 1) * LS : LX0 + rand(i + 40) * (LX - 1) * LS));
  const eV = Float32Array.from({ length: NE * 2 }, (_, i) => (i % 2 ? Math.sin(rand((i >> 1) + 70) * 6.28) : Math.cos(rand((i >> 1) + 70) * 6.28)));
  const latT = new Float32Array(LX).fill(ROOM), latTmp = new Float32Array(LX);
  const hotEndTag = label('Hot end', anchor(pG, LX0, LY0 + 1.05, 0), { cls: 'warm' });
  const coldEndTag = label('Cold end', anchor(pG, -LX0, LY0 + 1.05, 0), { cls: 'cool' });
  const eTag = label('Free electrons', anchor(pG, 0.2, LY0 - 1.0, 0.3));

  // ======================= 3. Convection in water =======================
  const wG = demo();
  table(wG, 7, 3, 0.3);
  const TW = 4.4, TH = 3.2, TD = 1.3, TY = 1.55;
  const tank = glassBox(THREE, kit, TW, TH, TD); tank.position.y = TY; wG.add(tank);
  const tankWater = liquidBox(THREE, liquidMat(THREE, 0x6fb6ee, 0.25), TW - 0.04, TD - 0.04);
  tankWater.position.y = TY + 0.06; tankWater.setLevel(2.9); wG.add(tankWater);
  // Tripod under the tank.
  for (const [x, z] of [[-1.9, -0.45], [-1.9, 0.45], [1.9, -0.45], [1.9, 0.45]]) kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, TY - 0.3, 8), steelDark, [x, 0.3 + (TY - 0.3) / 2, z], wG);
  const gauze = kit.mesh(new THREE.BoxGeometry(TW + 0.1, 0.04, TD + 0.1), kit.mat(0x6b7580, { metalness: 0.5 }), [0, TY - 0.02, 0], wG);
  gauze.castShadow = false;
  const tankBurner = burner(wG, -1.35, 0.3, 0, 0.95);
  const NW = 170, W_IN = TW - 0.3, H_IN = 2.7;
  const wp = makeFlow(NW, W_IN, H_IN, TD - 0.3, 0.05, -W_IN / 2, TY + 0.12, 21);
  wG.add(wp.mesh);
  wG.add(loopArrow(0, TY + 0.12 + H_IN / 2, W_IN * 0.37, H_IN * 0.36, TD / 2 + 0.06, 0.035));
  const riseTag = label('Warm water rises', anchor(wG, -1.6, TY + 3.35, 0), { cls: 'warm' });
  const sinkTag = label('Cool water sinks', anchor(wG, 1.7, TY + 3.35, 0), { cls: 'cool' });

  // ======================= 4. Convection in a room =======================
  const hG = demo();
  const RW = 8.4, RD = 4.4, RH = 4.6;
  kit.mesh(new THREE.BoxGeometry(RW, 0.15, RD), kit.mat(0xc49a6c, { roughness: 0.8 }), [0, 0.075, 0], hG).castShadow = false;
  const wallMat = kit.mat(0xf3eee4, { roughness: 0.9 });
  kit.mesh(new THREE.BoxGeometry(RW, RH, 0.15), wallMat, [0, RH / 2, -RD / 2], hG);
  kit.mesh(new THREE.BoxGeometry(0.15, RH, RD), wallMat, [-RW / 2, RH / 2, 0], hG);
  // Right wall with a window.
  for (const [y, h, z, d] of [[0.6, 1.2, 0, RD], [RH - 0.5, 1.0, 0, RD], [2.6, 2.8, -1.65, 1.1], [2.6, 2.8, 1.65, 1.1]]) kit.mesh(new THREE.BoxGeometry(0.15, h, d), wallMat, [RW / 2, y, z], hG);
  const pane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.9, 2.2), new THREE.MeshStandardMaterial({ color: 0x9fd0f0, transparent: true, opacity: 0.45, roughness: 0.1 }));
  pane.position.set(RW / 2, 2.65, 0); hG.add(pane);
  kit.mesh(new THREE.BoxGeometry(0.1, 0.08, 2.2), kit.mat(0xffffff), [RW / 2, 2.65, 0], hG);
  const ceiling = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(RW, 0.02, RD)), new THREE.LineBasicMaterial({ color: 0xb0a490 }));
  ceiling.position.y = RH; hG.add(ceiling);
  // Heater (radiator) on the left wall.
  const heaterMat = kit.mat(0xf6f6f6, { roughness: 0.4, emissive: 0xff3300, emissiveIntensity: 0 });
  for (let i = 0; i < 7; i++) kit.mesh(new THREE.BoxGeometry(0.22, 1.1, 0.18), heaterMat, [-RW / 2 + 0.3, 0.9, -0.9 + i * 0.3], hG);
  const NA = 170;
  const ap = makeFlow(NA, RW - 0.6, RH - 0.5, RD - 0.6, 0.07, -RW / 2 + 0.3, 0.3, 61);
  hG.add(ap.mesh);
  hG.add(loopArrow(0, 0.3 + (RH - 0.5) / 2, (RW - 0.6) * 0.38, (RH - 0.5) * 0.37, RD / 2 - 0.2, 0.05));
  const thTop = thermometer(0.7, 0.035), thLow = thermometer(0.7, 0.035);
  thTop.position.set(0.6, RH - 1.2, -RD / 2 + 0.12); thLow.position.set(0.6, 0.35, -RD / 2 + 0.12);
  hG.add(thTop, thLow);
  const topTag = label('', thTop.top), lowTag = label('', thLow.top, { cls: 'cool' });
  const heaterTag = label('Heater', anchor(hG, -RW / 2 + 0.3, 1.75, 0.1), { cls: 'warm' });
  const windowTag = label('Cold window', anchor(hG, RW / 2, 4.3, 0), { cls: 'cool' });

  // ======================= 5. Radiation =======================
  const xG = demo();
  table(xG, 7.6, 3.4, 0.3);
  const lampMetal = kit.mat(0x3d4650, { metalness: 0.5, roughness: 0.4 });
  kit.mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.1, 24), lampMetal, [0, 0.35, -0.6], xG);
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 10), lampMetal, [0, 1.6, -0.6], xG);
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10), lampMetal, [0, 2.9, -0.27], xG).rotation.x = Math.PI / 2;
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x6b2a1a, emissive: 0xff4a1a, emissiveIntensity: 1 });
  const bulb = kit.mesh(new THREE.SphereGeometry(0.36, 24, 16), lampMat, [0, 2.55, 0], xG);
  bulb.castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 16), lampMetal, [0, 2.9, 0], xG);
  const chrome = paint(THREE, 256, 32, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    [['#6f7a84', 0], ['#f7fbff', 0.12], ['#a9b4bd', 0.25], ['#eef3f7', 0.4], ['#7d8892', 0.55], ['#ffffff', 0.7], ['#9aa6b0', 0.85], ['#e4eaef', 1]].forEach(([c, s]) => gr.addColorStop(s, c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const CANS = [
    { name: 'Black', x: -2.2, mat: kit.mat(0x1d1f22, { roughness: 0.95 }), absorb: 0.95 },
    { name: 'Shiny', x: 2.2, mat: kit.mat(0xffffff, { map: chrome, metalness: 0.35, roughness: 0.2 }), absorb: 0.1 },
  ];
  const cans = CANS.map(c => {
    kit.mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.4, 32), c.mat, [c.x, 1.0, 0], xG);
    const th = thermometer(1.8, 0.045); th.position.set(c.x + 0.15, 1.0, 0.1); xG.add(th);
    const tag = label('', th.top, { cls: c.name === 'Black' ? 'warm' : 'cool' });
    return { ...c, th, tag, T: ROOM };
  });
  // Wavy infrared rays: lines whose points are moved each frame (no new geometry).
  const RAY_PTS = 48;
  const rays = [];
  for (let i = 0; i < 10; i++) {
    const pos = new Float32Array(RAY_PTS * 3), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.8 }));
    line.frustumCulled = false; xG.add(line);
    rays.push({ line, pos, a: new THREE.Vector3(), b: new THREE.Vector3(), on: false });
  }
  const irTag = label('Infrared radiation', anchor(xG, -1.1, 2.45, 0.2), { cls: 'warm' });
  const lampTag = label('Heat lamp', anchor(xG, 0, 3.3, 0));

  // ======================= 6. Vacuum flask =======================
  const fG = demo();
  table(fG, 7, 3.4, 0.3);
  const FY = 0.3, YAW_F = 0.35, PHI0 = YAW_F + Math.PI / 4, PHI_L = Math.PI * 1.5;
  const silver = kit.mat(0xffffff, { map: chrome, metalness: 0.4, roughness: 0.2, side: THREE.DoubleSide });
  const caseMat = kit.mat(0x2a9d8f, { roughness: 0.55, side: THREE.DoubleSide });
  const flaskParts = {
    case: cutLathe([[1.0, 0], [1.05, 0.15], [1.05, 3.5], [0.78, 3.95], [0.72, 3.95], [0.98, 3.5], [0.98, 0.12], [0.0, 0.12], [0.0, 0.0]], caseMat),
    silver: twoWalls(
      cutLathe([[0.0, 0.42], [0.5, 0.45], [0.88, 0.78], [0.88, 3.42], [0.71, 3.56], [0.71, 3.5], [0.85, 3.39], [0.85, 0.82], [0.5, 0.49], [0.0, 0.46]], silver),
      cutLathe([[0.0, 0.55], [0.5, 0.58], [0.71, 0.86], [0.71, 3.5], [0.68, 3.5], [0.68, 0.88], [0.5, 0.61], [0.0, 0.58]], silver)),
    stopper: cutLathe([[0.0, 3.25], [0.6, 3.25], [0.64, 3.9], [0.0, 3.9]], kit.mat(0xd9d2c3, { roughness: 0.8, side: THREE.DoubleSide })),
    vacuum: cutLathe([[0.0, 0.47], [0.5, 0.5], [0.84, 0.83], [0.84, 3.39], [0.72, 3.48], [0.72, 0.87], [0.5, 0.57], [0.0, 0.54]], new THREE.MeshBasicMaterial({ color: 0x1b2633, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })),
  };
  const lid = cutLathe([[0.0, 3.98], [0.82, 3.98], [0.86, 4.7], [0.0, 4.7]], kit.mat(0x264653, { roughness: 0.5, side: THREE.DoubleSide }));
  const drink = cutLathe([[0.0, 0.62], [0.5, 0.64], [0.665, 0.9], [0.665, 3.05], [0.0, 3.05]], kit.mat(0xb5652d, { roughness: 0.3, side: THREE.DoubleSide }));
  const flask = new THREE.Group(); flask.position.set(-0.9, FY, 0); fG.add(flask);
  for (const p of [...Object.values(flaskParts), lid, drink]) flask.add(p);
  flaskParts.vacuum.children.forEach(m => { m.renderOrder = 2; m.castShadow = false; });
  const partAnchors = { stopper: [-0.55, 3.7, 0.4], vacuum: [-0.78, 2.4, 0.3], silver: [-0.85, 1.4, 0.4], case: [-1.0, 0.6, 0.5] };
  const partTag = label('', anchor(flask, 0, 0, 0));
  const drinkTag = label('Hot drink', anchor(flask, 0.2, 2.0, 0.55), { cls: 'warm' });
  // An open mug to compare.
  const MX = 2.2;
  const mugMat = kit.mat(0xf2e8cf, { roughness: 0.5, side: THREE.DoubleSide });
  kit.mesh(new THREE.CylinderGeometry(0.5, 0.45, 1.1, 24, 1, true), mugMat, [MX, FY + 0.55, 0], fG);
  kit.mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24), mugMat, [MX, FY + 0.025, 0], fG);
  const mh = kit.mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 16, Math.PI), mugMat, [MX + 0.5, FY + 0.58, 0], fG);
  mh.rotation.z = -Math.PI / 2;
  const mugDrink = liquidColumn(THREE, kit.mat(0xb5652d, { roughness: 0.3 }), 0.47, 24);
  mugDrink.position.set(MX, FY + 0.05, 0); mugDrink.setLevel(0.9); fG.add(mugDrink);
  const mugSteam = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }), 6);
  mugSteam.frustumCulled = false; fG.add(mugSteam);
  const flaskTempTag = label('', anchor(fG, -0.9, FY + 4.95, 0), { cls: 'warm' });
  const mugTempTag = label('', anchor(fG, MX, FY + 2.0, 0), { cls: 'warm' });

  // ======================= 7. Q = m·c·ΔT =======================
  const qG = demo();
  table(qG, 7, 3.4, 0.3);
  const plateMat = kit.mat(0x2f3740, { roughness: 0.5 });
  kit.mesh(new THREE.BoxGeometry(2.8, 0.4, 2.4), kit.mat(0xe9edf1, { roughness: 0.5 }), [-1, 0.5, 0], qG);
  const coil = kit.mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.06, 32), kit.mat(0x40464d, { emissive: 0xff3300, emissiveIntensity: 0 }), [-1, 0.73, 0], qG);
  coil.castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), plateMat, [-1.9, 0.5, 1.22], qG).rotation.x = Math.PI / 2;
  const beaker = glassTube(THREE, kit, 1.0, 2.8, { thick: 0.04 });
  beaker.position.set(-1, 0.76, 0); qG.add(beaker);
  const qWater = liquidColumn(THREE, waterMat, 0.97, 32);
  qWater.position.set(-1, 0.8, 0); qG.add(qWater);
  const qTh = thermometer(2.6, 0.05);
  qTh.position.set(-0.7, 0.95, 0.3); qTh.rotation.z = -0.12; qG.add(qTh);
  const qTag = label('', qTh.top, { cls: 'warm' });
  const meter = panel(THREE, 2.6, 1.7, { px: 512 });
  meter.position.set(2.1, 1.6, 0); meter.rotation.y = -0.25; qG.add(meter);
  kit.mesh(new THREE.BoxGeometry(0.15, 0.85, 0.15), steelDark, [2.1, 0.6, -0.05], qG);

  // ======================= state =======================
  const st = { step: 0, quiz: false, t: 0, bathKg: 100, rodT: 0, heat: true, latMetal: true, flameW: 2, heaterOn: true, roomTop: 17, roomLow: 17,
    radMode: 'absorb', radMin: 0, part: 0, partAuto: true, hours: 0, hoursAuto: true, hoursSlider: null, qM: 1, qDT: 50, qP: 1 };

  function showOnly(g) { for (const d of demos) d.visible = d === g; }
  const allLabels = [bathTag, cupTag, modelTag, ...rods.map(r => r.tag), rodsTag, hotEndTag, coldEndTag, eTag, riseTag, sinkTag, topTag, lowTag, heaterTag, windowTag,
    ...cans.map(c => c.tag), irTag, lampTag, partTag, drinkTag, flaskTempTag, mugTempTag, qTag];

  // ---------- step 0 ----------
  function setBath(i) {
    const m = BATH_KG[i];
    st.bathKg = m;
    bathWater.setLevel(0.12 + 1.0 * Math.log(m / 0.125) / Math.log(800));
    const qb = m * C_WATER * (40 - ROOM), qc = CUP_KG * C_WATER * (80 - ROOM);
    bathTag.text = `Bath: 40 °C, ${m} kg`;
    ui.readout(`Energy each gives out cooling to 20 °C:<br>Cup (0.25 kg, 80 °C): about <b>${comma(qc)} J</b><br>Bath (${m} kg, 40 °C): about <b>${comma(qb)} J</b><br>`
      + (qb > qc ? `The cooler bath holds <b>${fmtX(qb / qc)}</b> as much thermal energy.` : 'With this little water, the hot cup holds more.'));
  }
  const fmtX = r => (r >= 10 ? `${comma(r)} times` : `${r.toFixed(1)} times`);

  // ---------- step 1 ----------
  function resetRods() {
    st.rodT = 0;
    for (const r of rods) {
      r.T.fill(ROOM);
      for (const d of r.drops) { d.fallen = d.landed = false; d.y = ROD_Y - 0.1; d.v = 0; d.g.position.set(d.x, d.y, r.def.z); d.g.rotation.set(0, 0, 0); }
      paintRod(r);
    }
  }
  function paintRod(r) {
    const c = r.m.geometry.attributes.color;
    for (let i = 0; i < c.count; i++) {
      const T = r.T[r.cell[i]], f = clamp((T - 35) / 130, 0, 1);
      col.copy(r.base).lerp(HOTC, f);
      c.setXYZ(i, col.r, col.g, col.b);
    }
    c.needsUpdate = true;
  }
  function rodReadout() {
    const n = r => r.drops.filter(d => d.fallen).length;
    ui.readout(`Wax drops fallen off:<br>Copper <b>${n(rods[0])} of 5</b> · Steel <b>${n(rods[1])} of 5</b> · Wood <b>${n(rods[2])} of 5</b><br>Heating time: ${Math.floor(st.rodT * 10)} s (model, sped up)`);
  }
  function diffuse(T, tmp, D, loss, hot, dt, hotOn) {
    const n = Math.max(1, Math.ceil(dt * D * 4.5)), h = dt / n, N = T.length;
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < N; i++) {
        const l = i === 0 ? (hotOn ? hot : T[0]) : T[i - 1], r = i === N - 1 ? T[i] : T[i + 1];
        tmp[i] = T[i] + h * (D * (l - 2 * T[i] + r) - loss * (T[i] - ROOM));
      }
      T.set(tmp);
    }
  }

  // ---------- step 2 ----------
  function resetLattice() { latT.fill(ROOM); }
  function latReadout() {
    ui.readout(`${st.latMetal ? 'Metal' : 'Wood'}: hot end <b>${Math.round(latT[0])} °C</b> · middle <b>${Math.round(latT[7])} °C</b> · cold end <b>${Math.round(latT[LX - 1])} °C</b> (model)`);
  }

  // ---------- step 3 / 4: flow of particles round a convection loop ----------
  // Particles follow the stream function ψ = −A sin(πx/W) sin(πy/H) (one loop, rising on the left).
  // Each particle warms up near the heater (bottom left) and cools near the top and the right side.
  function makeFlow(n, W, H, D, pr, x0, y0, seed) {
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(pr, 8, 6), kit.mat(0xffffff, { roughness: 0.5 }), n);
    mesh.frustumCulled = false; mesh.castShadow = false;
    const p = new Float32Array(n * 3), T = new Float32Array(n);
    for (let i = 0, k = 0; i < n; k++) {
      const u = 0.04 + 0.92 * rand(seed + k), v = 0.04 + 0.92 * rand(seed + k + 1000);
      if (Math.sin(Math.PI * u) * Math.sin(Math.PI * v) > 0.8) continue;   // the middle of the loop hardly moves
      p[i * 3] = u * W; p[i * 3 + 1] = v * H; p[i * 3 + 2] = (rand(seed + k + 2000) - 0.5) * D;
      T[i] = 0.3;
      mesh.setColorAt(i, COLD);
      i++;
    }
    const vel = (x, y, A, out) => {
      out[0] = -A * (Math.PI / H) * Math.sin(Math.PI * x / W) * Math.cos(Math.PI * y / H);
      out[1] = A * (Math.PI / W) * Math.cos(Math.PI * x / W) * Math.sin(Math.PI * y / H);
    };
    const k1 = [0, 0], k2 = [0, 0];
    const flow = {
      mesh,
      tick(dt, A, heat) {
        for (let i = 0; i < n; i++) {
          const j = i * 3;
          let x = p[j], y = p[j + 1];
          if (A > 0.001) {
            vel(x, y, A, k1); vel(x + k1[0] * dt / 2, y + k1[1] * dt / 2, A, k2);
            x = clamp(x + k2[0] * dt, 0.02 * W, 0.98 * W); y = clamp(y + k2[1] * dt, 0.02 * H, 0.98 * H);
            p[j] = x; p[j + 1] = y;
          }
          const u = x / W, v = y / H;
          const warm = heat * Math.max(0, 1 - u * 2.4) * Math.max(0, 1 - v * 1.8), cool = (u > 0.6 ? 0.9 : v > 0.8 ? 0.35 : 0.08) + (heat < 0.05 ? 0.4 : 0);
          T[i] = clamp(T[i] + dt * (warm * 6 - cool * T[i]), 0, 1);
          col.copy(COLD).lerp(c2.copy(HOTC), T[i]);
          mesh.setColorAt(i, col);
          mesh.setMatrixAt(i, m4.makeTranslation(x0 + x, y0 + y, p[j + 2]));
        }
        mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      },
    };
    flow.tick(0, 0, 0);
    return flow;
  }

  // ---------- step 5 ----------
  function setRad(mode) {
    st.radMode = mode; st.radMin = 0;
    for (const c of cans) c.T = mode === 'absorb' ? ROOM : 80;
    radReadout();
  }
  function radReadout() {
    const [b, s] = cans;
    for (const c of cans) { c.th.set((c.T - 0) / 100); c.tag.text = `${c.name}: ${c.T.toFixed(1)} °C`; }
    ui.readout(`${st.radMode === 'absorb' ? 'Lamp on, cans start at 20 °C' : 'Lamp off, cans start with 80 °C water'} · time <b>${Math.floor(st.radMin)} min</b><br>`
      + `Black can <b>${b.T.toFixed(1)} °C</b> · Shiny can <b>${s.T.toFixed(1)} °C</b> (model)`);
  }
  function setRay(r, ax, ay, az, bx, by, bz, on) { r.a.set(ax, ay, az); r.b.set(bx, by, bz); r.on = on; r.line.visible = on; }
  const dirV = new THREE.Vector3(), sideV = new THREE.Vector3(), upV = new THREE.Vector3(0, 0, 1);
  function waveRay(r, t, amp, opacity) {
    if (!r.on) return;
    dirV.subVectors(r.b, r.a); const len = dirV.length(); dirV.divideScalar(len);
    sideV.crossVectors(dirV, upV).normalize();
    for (let i = 0; i < RAY_PTS; i++) {
      const s = i / (RAY_PTS - 1), d = s * len, w = Math.sin(d * 9 - t * 10) * amp * Math.sin(Math.PI * s);
      r.pos[i * 3] = r.a.x + dirV.x * d + sideV.x * w; r.pos[i * 3 + 1] = r.a.y + dirV.y * d + sideV.y * w; r.pos[i * 3 + 2] = r.a.z + dirV.z * d + sideV.z * w;
    }
    r.line.geometry.attributes.position.needsUpdate = true;
    r.line.material.opacity = opacity;
  }

  // ---------- step 6 ----------
  const flaskT = h => ROOM + 70 * Math.exp(-0.056 * h), mugT = h => ROOM + 70 * Math.exp(-1.54 * h);
  function setPart(i) {
    st.part = i;
    const p = PARTS[i];
    for (const [k, g] of Object.entries(flaskParts)) g.traverse(m => { if (m.isMesh && m.material.emissive) { m.material.emissive.setHex(k === p.key ? 0xffb703 : 0); m.material.emissiveIntensity = k === p.key ? 0.45 : 0; } });
    flaskParts.vacuum.children.forEach(m => { m.material.opacity = p.key === 'vacuum' ? 0.75 : 0.35; m.material.color.setHex(p.key === 'vacuum' ? 0x7a3cff : 0x1b2633); });
    partTag.at.position.set(...partAnchors[p.key]);
    partTag.text = p.name;
    flaskReadout();
  }
  function setHours(h) {
    st.hours = h;
    flaskTempTag.text = `Flask: ${Math.round(flaskT(h))} °C`;
    mugTempTag.text = `Mug: ${Math.round(mugT(h))} °C`;
    flaskReadout();
  }
  function flaskReadout() {
    ui.readout(`${PARTS[st.part].text}<br>After <b>${st.hours} h</b>: flask <b>${Math.round(flaskT(st.hours))} °C</b> · open mug <b>${Math.round(mugT(st.hours))} °C</b> (model)`);
  }

  // ---------- step 7 ----------
  function qSet() {
    st.qP = 0;
    qWater.setLevel(0.75 * st.qM);
    const Q = st.qM * C_WATER * st.qDT;
    ui.readout(`Q = m · c · ΔT<br>= ${st.qM} kg × 4200 J/(kg·°C) × ${st.qDT} °C<br>= <b>${comma(Q)} J</b> (about ${comma(Q / 1000)} kJ)`);
    drawMeter();
  }
  function drawMeter() {
    const Q = st.qM * C_WATER * st.qDT * st.qP, Qmax = 3 * C_WATER * 80;
    meter.draw((g, W, H) => {
      g.fillStyle = '#16212b'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#9fb3c4'; g.font = '700 30px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Energy given to the water', W / 2, 44);
      g.fillStyle = '#ffd166'; g.font = '800 64px system-ui, sans-serif';
      g.fillText(`${comma(Q)} J`, W / 2, 130);
      g.fillStyle = '#2a3a48'; g.fillRect(40, 220, W - 80, 60);
      g.fillStyle = '#ff7a3d'; g.fillRect(40, 220, (W - 80) * clamp(Q / Qmax, 0, 1), 60);
      g.strokeStyle = '#9fb3c4'; g.lineWidth = 3; g.strokeRect(40, 220, W - 80, 60);
      g.fillStyle = '#9fb3c4'; g.font = '600 26px system-ui, sans-serif';
      g.fillText(`Water: ${(ROOM + st.qDT * st.qP).toFixed(0)} °C`, W / 2, 312);
    });
  }

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.t = 0;
      for (const l of allLabels) l.show(false);
      if (i === 0) {
        showOnly(eG);
        view({ radius: 3.4, width: 4.6, yaw: 0.25, pitch: 0.28, target: [0.2, 2.0, 0] });
        bathTag.show(true); cupTag.show(true); modelTag.show(true);
        const s = ui.slider({ label: 'Water in the bath', min: 0, max: BATH_KG.length - 1, step: 1, value: BATH_KG.length - 1, format: v => `${BATH_KG[v]}`, unit: ' kg', onInput: v => setBath(v) });
        s.set(BATH_KG.length - 1);
        setBath(BATH_KG.length - 1);
      }
      if (i === 1) {
        showOnly(rG);
        view({ radius: 3.4, width: 4.6, yaw: 0.38, pitch: 0.42, target: [0.5, 1.2, 0] });
        rods.forEach(r => r.tag.show(true)); rodsTag.show(true);
        st.heat = true; resetRods();
        ui.buttons([{ label: 'Heat the rods', on: true, onClick: () => { st.heat = true; } }, { label: 'Turn off the flame', onClick: () => { st.heat = false; } }, { label: 'Start again', onClick: () => { resetRods(); st.heat = true; } }]);
        rodReadout();
      }
      if (i === 2) {
        showOnly(pG);
        view({ radius: 2.6, width: 3.6, yaw: 0.2, pitch: 0.25, target: [0, 1.3, 0] });
        hotEndTag.show(true); coldEndTag.show(true); eTag.show(st.latMetal);
        st.latMetal = true; resetLattice(); eTag.show(true);
        ui.buttons([{ label: 'Metal', on: true, onClick: () => { st.latMetal = true; resetLattice(); eTag.show(true); } },
          { label: 'Wood', onClick: () => { st.latMetal = false; resetLattice(); eTag.show(false); } }]);
        latReadout();
      }
      if (i === 3) {
        showOnly(wG);
        view({ radius: 3.0, width: 3.0, yaw: 0.2, pitch: 0.2, target: [0, 2.6, 0] });
        riseTag.show(true); sinkTag.show(true);
        st.flameW = 2;
        const names = ['off', 'low', 'medium', 'high'];
        const fw = () => ui.readout(`Flame: <b>${names[st.flameW]}</b>.${st.flameW ? ' Warm water expands, so it is less dense and rises. Cool water is denser and sinks.' : ' No heating, so the water slows down and stops.'}`);
        ui.slider({ label: 'Flame', min: 0, max: 3, step: 1, value: 2, format: v => names[v], onInput: v => { st.flameW = v; fw(); } });
        fw();
      }
      if (i === 4) {
        showOnly(hG);
        view({ radius: 4.0, width: 5.0, yaw: 0.12, pitch: 0.22, target: [0, 2.3, 0] });
        topTag.show(true); lowTag.show(true); heaterTag.show(true); windowTag.show(true);
        st.heaterOn = true; st.roomTop = st.roomLow = 17;
        ui.toggle({ label: 'Heater on', value: true, onChange: v => { st.heaterOn = v; } });
      }
      if (i === 5) {
        showOnly(xG);
        view({ radius: 3.0, width: 3.6, yaw: 0.0, pitch: 0.18, target: [0, 1.6, 0] });
        cans.forEach(c => c.tag.show(true)); irTag.show(true); lampTag.show(true);
        ui.buttons([{ label: 'Lamp on: absorbing', on: true, onClick: () => setRad('absorb') }, { label: 'Hot water: emitting', onClick: () => setRad('emit') }]);
        setRad('absorb');
      }
      if (i === 6) {
        showOnly(fG);
        view({ radius: 3.2, width: 2.6, yaw: YAW_F, pitch: 0.18, target: [0.5, 2.4, 0] });
        partTag.show(true); drinkTag.show(true); flaskTempTag.show(true); mugTempTag.show(true);
        st.partAuto = true; st.hoursAuto = true;
        st.partButtons = ui.buttons(PARTS.map((p, j) => ({ label: p.name, on: j === 0, onClick: () => { st.partAuto = false; setPart(j); } })));
        st.hoursSlider = ui.slider({ label: 'Time', min: 0, max: 8, step: 0.5, value: 0, unit: ' h', onInput: v => { st.hoursAuto = false; setHours(v); } });
        st.hours = 0; setPart(0); setHours(0);
      }
      if (i === 7) {
        showOnly(qG);
        view({ radius: 2.8, width: 3.6, yaw: 0.15, pitch: 0.2, target: [0.5, 1.9, 0] });
        qTag.show(true);
        ui.slider({ label: 'Mass of water m', min: 0.5, max: 3, step: 0.5, value: st.qM, unit: ' kg', onInput: v => { st.qM = v; qSet(); } });
        ui.slider({ label: 'Temperature rise ΔT', min: 10, max: 80, step: 5, value: st.qDT, unit: ' °C', onInput: v => { st.qDT = v; qSet(); } });
        qSet();
      }
      if (isQuiz) {
        showOnly(rG);
        resetRods(); st.heat = true;
        view({ radius: 3.6, width: 4.8, yaw: -0.35, pitch: 0.4, target: [0.4, 1.2, 0] });
        rods.forEach(r => r.tag.show(true));
      }
    },

    update(dt, t) {
      st.t += dt;
      const s = st.step;
      if (s === 0 && !st.quiz) {
        bathSwarm.tick(dt, 0.75); cupSwarm.tick(dt, 1.6);
        for (let i = 0; i < 6; i++) {
          const ph = (t * 0.5 + i / 6) % 1;
          steam.setMatrixAt(i, m4.makeScale(0.6 + ph, 0.6 + ph, 0.6 + ph).setPosition(CX + Math.sin(i * 2.1 + t) * 0.12, 0.85 + ph * 1.1, Math.cos(i * 1.7) * 0.1));
        }
        steam.instanceMatrix.needsUpdate = true;
        return true;
      }
      if (s === 1 || st.quiz) {
        rodBurner.flame.flick(t, st.heat ? 1 : 0);
        st.rodT += dt;
        let changed = false;
        for (const r of rods) {
          diffuse(r.T, r.tmp, r.def.D, ROD_LOSS, HOT, dt, st.heat);
          paintRod(r);
          for (const d of r.drops) {
            if (!d.fallen && r.T[d.c] > WAX_MELT) { d.fallen = true; changed = true; }
            if (d.fallen && !d.landed) {
              d.v -= 9 * dt; d.y += d.v * dt;
              if (d.y < d.rest + 0.36) { d.y = d.rest + 0.36; d.landed = true; d.g.rotation.z = 1.4 + rand(d.c) * 0.3; d.g.position.y = d.rest + 0.05; continue; }
              d.g.position.y = d.y;
            }
          }
        }
        if (s === 1 && !st.quiz && (changed || Math.floor((st.rodT - dt) * 10) !== Math.floor(st.rodT * 10))) rodReadout();
        return true;
      }
      if (s === 2) {
        latBurner.flame.flick(t, 1);
        diffuse(latT, latTmp, st.latMetal ? 5 : 0.3, 0.02, HOT, dt, true);
        let bi = 0;
        for (let iy = 0; iy < LY; iy++) for (let ix = 0; ix < LX; ix++) {
          const i = iy * LX + ix, T = latT[ix], amp = 0.02 + 0.11 * clamp((T - ROOM) / (HOT - ROOM), 0, 1), w = 14 + T * 0.05;
          const x = LX0 + ix * LS + amp * Math.sin(t * w + latPhase[i * 2]), y = LY0 + (iy - (LY - 1) / 2) * LS + amp * Math.sin(t * w * 1.13 + latPhase[i * 2 + 1]);
          latPos[i * 3] = x; latPos[i * 3 + 1] = y; latPos[i * 3 + 2] = 0;
          lattice.setMatrixAt(i, m4.makeTranslation(x, y, 0));
          lattice.setColorAt(i, tempColor(T, col, ROOM, 80, 200));
        }
        for (let iy = 0; iy < LY; iy++) for (let ix = 0; ix < LX; ix++) {
          const i = iy * LX + ix;
          if (ix < LX - 1) { bondPos.set([latPos[i * 3], latPos[i * 3 + 1], 0, latPos[i * 3 + 3], latPos[i * 3 + 4], 0], bi); bi += 6; }
          if (iy < LY - 1) { const j = i + LX; bondPos.set([latPos[i * 3], latPos[i * 3 + 1], 0, latPos[j * 3], latPos[j * 3 + 1], 0], bi); bi += 6; }
        }
        bondGeo.attributes.position.needsUpdate = true;
        lattice.instanceMatrix.needsUpdate = true; lattice.instanceColor.needsUpdate = true;
        electrons.visible = st.latMetal;
        if (st.latMetal) {
          const xa = LX0, xb = LX0 + (LX - 1) * LS, ya = LY0 - (LY - 1) * LS / 2, yb = LY0 + (LY - 1) * LS / 2;
          for (let i = 0; i < NE; i++) {
            const ix = clamp(Math.round((eP[i * 2] - LX0) / LS), 0, LX - 1), sp = 0.6 + 2.2 * clamp((latT[ix] - ROOM) / 150, 0, 1);
            let x = eP[i * 2] + eV[i * 2] * sp * dt, y = eP[i * 2 + 1] + eV[i * 2 + 1] * sp * dt;
            if (x < xa || x > xb) { eV[i * 2] *= -1; x = clamp(x, xa, xb); }
            if (y < ya || y > yb) { eV[i * 2 + 1] *= -1; y = clamp(y, ya, yb); }
            eP[i * 2] = x; eP[i * 2 + 1] = y;
            electrons.setMatrixAt(i, m4.makeTranslation(x, y, 0.16));
          }
          electrons.instanceMatrix.needsUpdate = true;
        }
        if (Math.floor((st.t - dt) * 4) !== Math.floor(st.t * 4)) latReadout();
        return true;
      }
      if (s === 3) {
        tankBurner.flame.flick(t, st.flameW / 3 + (st.flameW ? 0.25 : 0));
        st.flowA = kit.lerp(st.flowA ?? 0, st.flameW * 0.55, Math.min(1, dt * 1.5));
        wp.tick(dt, st.flowA, st.flameW / 3);
        return true;
      }
      if (s === 4) {
        heaterMat.emissiveIntensity = lerp(heaterMat.emissiveIntensity, st.heaterOn ? 0.35 : 0, Math.min(1, dt * 2));
        st.roomA = kit.lerp(st.roomA ?? 0, st.heaterOn ? 1.6 : 0.0, Math.min(1, dt * 1.2));
        ap.tick(dt, st.roomA, st.heaterOn ? 1 : 0);
        st.roomTop = lerp(st.roomTop, st.heaterOn ? 23 : 17, Math.min(1, dt * 0.6));
        st.roomLow = lerp(st.roomLow, st.heaterOn ? 19 : 17, Math.min(1, dt * 0.6));
        thTop.set((st.roomTop - 10) / 20); thLow.set((st.roomLow - 10) / 20);
        topTag.text = `Near ceiling: ${st.roomTop.toFixed(1)} °C`; lowTag.text = `Near floor: ${st.roomLow.toFixed(1)} °C`;
        if (Math.floor((st.t - dt) * 4) !== Math.floor(st.t * 4)) ui.readout(st.heaterOn
          ? `Heater on. Near the ceiling <b>${st.roomTop.toFixed(1)} °C</b>, near the floor <b>${st.roomLow.toFixed(1)} °C</b> (model). The warm air rises and spreads out; cool air sinks and flows back to the heater.`
          : `Heater off. The air slows down and the room cools: ceiling <b>${st.roomTop.toFixed(1)} °C</b>, floor <b>${st.roomLow.toFixed(1)} °C</b> (model).`);
        return true;
      }
      if (s === 5) {
        const absorb = st.radMode === 'absorb';
        lampMat.emissiveIntensity = lerp(lampMat.emissiveIntensity, absorb ? 1.2 : 0, Math.min(1, dt * 3));
        if (st.radMin < 15) {
          const dm = dt * 2; st.radMin += dm;      // 1 s ≈ 2 model minutes
          for (const c of cans) {
            if (absorb) c.T += dm * (2.5 * c.absorb - 0.08 * (c.T - ROOM));
            else c.T -= dm * (0.02 + 0.05 * c.absorb) * (c.T - ROOM);
          }
          radReadout();
        }
        // Rays: from the lamp to each can (absorbing), or out of each can (emitting, more from the black can).
        let ri = 0;
        for (const c of cans) for (let k = 0; k < 5; k++) {
          const r = rays[ri++], dy = (k - 2) * 0.22;
          if (absorb) setRay(r, Math.sign(c.x) * 0.45, 2.45 + dy * 0.4, 0, c.x - Math.sign(c.x) * 0.6, 1.2 + dy, 0.0, k < 4);
          else setRay(r, c.x + Math.sign(c.x) * 0.6, 1.0 + dy, 0, c.x + Math.sign(c.x) * 2.1, 1.0 + dy * 2.2, 0.3, c.absorb > 0.5 ? k < 5 : k === 2);
          waveRay(r, t, 0.07, absorb ? 0.85 : clamp((c.T - ROOM) / 60, 0.1, 1) * (c.absorb > 0.5 ? 0.9 : 0.35));
        }
        irTag.at.position.set(absorb ? -1.1 : -3.4, absorb ? 2.45 : 1.75, 0.2);
        return true;
      }
      if (s === 6) {
        if (st.partAuto) {
          const n = clamp(Math.floor(st.t / 2.5) % PARTS.length, 0, PARTS.length - 1);
          if (n !== st.part) { setPart(n); st.partButtons?.select(n); }
        }
        if (st.hoursAuto) {
          const h = Math.min(6, Math.floor(st.t * 2) * 0.5);
          if (h !== st.hours) { setHours(h); st.hoursSlider?.set(h); }
        }
        const hot = (mugT(st.hours) - ROOM) / 70;
        mugSteam.visible = hot > 0.15;
        for (let i = 0; i < 6; i++) {
          const ph = (t * 0.45 + i / 6) % 1;
          mugSteam.setMatrixAt(i, m4.makeScale(0.6 + ph, 0.6 + ph, 0.6 + ph).setPosition(MX + Math.sin(i * 2.1 + t) * 0.15, FY + 1.15 + ph * 1.0, Math.cos(i * 1.7) * 0.12));
        }
        mugSteam.instanceMatrix.needsUpdate = true;
        return true;
      }
      if (s === 7) {
        if (st.qP < 1) {
          st.qP = Math.min(1, st.qP + dt / 2.5);
          qTh.set((ROOM + st.qDT * st.qP) / 105);
          qTag.text = `${Math.round(ROOM + st.qDT * st.qP)} °C`;
          coil.material.emissiveIntensity = 0.8;
          drawMeter();
          return true;
        }
        coil.material.emissiveIntensity = 0;
        return false;
      }
      return false;
    },
  };

  // A see-through loop with two arrow heads showing which way a convection current turns (up on the left).
  function loopArrow(cx, cy, rx, ry, z, r) {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xff8c42, transparent: true, opacity: 0.55, depthWrite: false });
    class Loop extends THREE.Curve { getPoint(a, out = new THREE.Vector3()) { a *= Math.PI * 2; return out.set(cx - rx * Math.cos(a), cy + ry * Math.sin(a), z); } }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new Loop(), 80, r, 6, true), m));
    for (const a of [Math.PI / 2, Math.PI * 1.5, 0, Math.PI]) {
      const head = new THREE.Mesh(new THREE.ConeGeometry(r * 3, r * 8, 12), m);
      head.position.set(cx - rx * Math.cos(a), cy + ry * Math.sin(a), z);
      head.rotation.z = Math.atan2(ry * Math.cos(a), rx * Math.sin(a)) - Math.PI / 2;
      g.add(head);
    }
    g.children.forEach(c => { c.renderOrder = 4; });
    return g;
  }

  function twoWalls(a, b) { const g = new THREE.Group(); g.add(a, b); return g; }

  // A lathe shape with a quarter cut away (towards the camera), with flat caps on the two cut faces.
  function cutLathe(profile, material) {
    const g = new THREE.Group();
    const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
    const lathe = new THREE.Mesh(new THREE.LatheGeometry(pts, 32, PHI0, PHI_L), material);
    lathe.castShadow = true;
    g.add(lathe);
    const shape = new THREE.Shape(pts);
    const capGeo = new THREE.ShapeGeometry(shape);
    for (const phi of [PHI0, PHI0 + PHI_L]) {
      const cap = new THREE.Mesh(capGeo, material);
      cap.rotation.y = phi - Math.PI / 2;
      g.add(cap);
    }
    return g;
  }
}
