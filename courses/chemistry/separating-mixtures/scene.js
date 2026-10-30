// Separating mixtures on one lab bench: pure water, a solution and a suspension (with a particle view),
// a magnet for iron and sulfur, filtration, evaporation and crystallisation, distillation of salt water
// and of ethanol + water, and paper chromatography of ink.

const X = { beakers: -7, magnet: -3.5, filter: 0, evap: 3.5, still: 7.5, chroma: 12 };
const SALT = 10, SOL = 0.36, W0 = 40;       // grams of salt; grams that dissolve per mL of water; starting water (mL)
const CM = 0.079;                           // world units per cm on the chromatography paper (12 cm strip)
const DYES = {
  black: [{ name: 'yellow', c: '#f2c200', rf: 0.85 }, { name: 'red', c: '#e0245e', rf: 0.6 }, { name: 'blue', c: '#2a5bd7', rf: 0.35 }],
  green: [{ name: 'yellow', c: '#f2c200', rf: 0.85 }, { name: 'blue', c: '#2a5bd7', rf: 0.35 }],
};

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  kit.stage(scene, { ground: 0xcfd8dc, sky: 0xe8eef3, radius: 40 }).position.y = -0.95;
  kit.lights(scene, { sun: [4, 10, 7] });

  // Bench.
  const bench = kit.mesh(new THREE.BoxGeometry(23, 0.12, 3.2), kit.mat(0xe9e2d6, { roughness: 0.8 }), [2.5, -0.06, 0], scene);
  bench.castShadow = false;
  kit.mesh(new THREE.BoxGeometry(23, 0.85, 0.1), kit.mat(0x8d6e63), [2.5, -0.52, 1.5], scene).castShadow = false;

  const glass = new THREE.MeshStandardMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const edge = new THREE.LineBasicMaterial({ color: 0x8fb3cc });
  const steel = kit.mat(0x8d99ae, { metalness: 0.5, roughness: 0.4 });
  const dark = kit.mat(0x37474f);
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const dummy = new THREE.Object3D();
  const add = (parent, m) => { parent.add(m); return m; };

  // A beaker: open glass cylinder, base and a liquid cylinder whose height is set with level(h).
  function beaker(parent, x, r, h, color, opacity = 0.5) {
    const g = new THREE.Group(); g.position.set(x, 0, 0); parent.add(g);
    const side = new THREE.CylinderGeometry(r, r, h, 28, 1, true).translate(0, h / 2, 0);
    const wall = add(g, new THREE.Mesh(side, glass)); wall.renderOrder = 3;
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(side, 40), edge));
    add(g, new THREE.Mesh(new THREE.CircleGeometry(r, 28).rotateX(-Math.PI / 2).translate(0, 0.005, 0), glass));
    const liqMat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.2, depthWrite: false });
    const liq = add(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.96, 1, 28).translate(0, 0.5, 0), liqMat));
    liq.renderOrder = 2;
    g.liq = liq; g.liqMat = liqMat;
    g.level = v => { liq.visible = v > 0.002; liq.scale.y = Math.max(0.001, v); };
    return g;
  }
  // Blue Bunsen flame whose size follows the heat setting.
  function bunsen(parent, x, y) {
    const g = new THREE.Group(); g.position.set(x, y, 0); parent.add(g);
    kit.mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 20), dark, [0, 0.025, 0], g);
    kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 12), steel, [0, 0.27, 0], g);
    const fm = new THREE.MeshBasicMaterial({ color: 0x4f8cff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const f = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.06, 1, 14).translate(0, 0.5, 0), fm));
    f.position.y = 0.5;
    g.set = (heat, t) => { f.visible = heat > 0.01; const s = 0.08 + 0.22 * heat; f.scale.set(1 + heat * 0.4, s * (1 + 0.06 * Math.sin(t * 23)), 1 + heat * 0.4); };
    return g;
  }
  function tripod(parent, x, top) {
    const g = new THREE.Group(); g.position.set(x, 0, 0); parent.add(g);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2, leg = kit.mesh(new THREE.CylinderGeometry(0.018, 0.018, top + 0.03, 6), steel, [Math.cos(a) * 0.3, top / 2, Math.sin(a) * 0.3], g);
      leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    }
    const ring = kit.mesh(new THREE.TorusGeometry(0.3, 0.02, 6, 28), steel, [0, top, 0], g); ring.rotation.x = Math.PI / 2;
    kit.mesh(new THREE.BoxGeometry(0.75, 0.012, 0.75), kit.mat(0x9e9e9e, { metalness: 0.3 }), [0, top + 0.02, 0], g);
    return g;
  }
  const puffGeo = new THREE.SphereGeometry(1, 10, 7);
  const steamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });

  // ================= 1. Pure substance, solution, suspension =================
  const S1 = new THREE.Group(); S1.position.x = X.beakers; scene.add(S1);
  const BX = [-0.95, 0, 0.95];
  const pure = beaker(S1, BX[0], 0.3, 0.7, 0x8fd3ff, 0.4); pure.level(0.55);
  const salty = beaker(S1, BX[1], 0.3, 0.7, 0x8fd3ff, 0.4); salty.level(0.55);
  const muddy = beaker(S1, BX[2], 0.3, 0.7, 0x8a6a45, 0.92); muddy.level(0.55);
  const sediment = kit.mesh(new THREE.CylinderGeometry(0.285, 0.285, 1, 28).translate(0, 0.5, 0), kit.mat(0x6d4c2f, { roughness: 1 }), [0, 0.006, 0], muddy);
  const muddyClear = new THREE.Color(0xb7a58a), muddyCloud = new THREE.Color(0x8a6a45);
  // Particle "magnifier" bubbles above each beaker.
  const bubbleGeo = new THREE.SphereGeometry(0.36, 24, 16);
  const bubbles = BX.map(x => { const b = new THREE.Mesh(bubbleGeo, glass); b.position.set(x, 1.45, 0); S1.add(b); return b; });
  const PN = [44, 44, 44];
  const parts = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), kit.mat(0xffffff, { roughness: 0.35 }), 132);
  parts.frustumCulled = false; parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage); S1.add(parts);
  const PB = [];   // per particle: bubble, base position, radius, colour, kind
  const col = new THREE.Color();
  for (let b = 0; b < 3; b++) for (let i = 0; i < PN[b]; i++) {
    const n = b * 100 + i;
    let kind = 'w', r = 0.035, c = 0x3a8ee6;
    if (b === 1 && i < 8) { kind = i % 2 ? 'na' : 'cl'; r = i % 2 ? 0.03 : 0.045; c = i % 2 ? 0x9b5de5 : 0x2ecc71; }
    if (b === 2 && i < 16) { kind = 'mud'; r = 0.05; c = 0x7a5230; }
    // Even spread inside the bubble; mud bits make two clumps.
    let x, y, z;
    if (kind === 'mud') { const cl = i < 8 ? [-0.1, 0.08] : [0.1, -0.08], a = rand(n) * 6.28, d = rand(n + 7) * 0.06; x = cl[0] + Math.cos(a) * d; y = cl[1] + (rand(n + 9) - 0.5) * 0.08; z = Math.sin(a) * d; }
    else { let tr = 0; do { const q = n + tr++ * 1000; x = (rand(q + 11) * 2 - 1) * 0.28; y = (rand(q + 22) * 2 - 1) * 0.28; z = (rand(q + 33) * 2 - 1) * 0.28; } while (x * x + y * y + z * z > 0.08 && tr < 50); }
    PB.push({ b, x, y, z, r, kind, ph: rand(n + 44) * 6.28 });
    col.set(c); parts.setColorAt(PB.length - 1, col);
  }
  const s1Tags = [label('Pure water', v3(X.beakers + BX[0], 0.78, 0)), label('Salt water', v3(X.beakers + BX[1], 0.78, 0)), label('Muddy water', v3(X.beakers + BX[2], 0.78, 0))];
  const s1 = { settle: 0, show: true };
  function s1Tick(dt, t) {
    s1.settle = Math.min(1, s1.settle + dt / 7);
    const e = s1.settle;
    sediment.scale.y = 0.005 + 0.06 * e;
    muddy.liqMat.color.copy(muddyCloud).lerp(muddyClear, e); muddy.liqMat.opacity = 0.92 - 0.42 * e;
    let i = 0;
    for (const p of PB) {
      let y = p.y + Math.sin(t * 3 + p.ph) * 0.02;
      if (p.kind === 'mud') y = Math.max(-0.27, p.y - 0.25 * e) + Math.sin(t * 1.5 + p.ph) * 0.004;
      const j = p.kind === 'mud' ? 0.004 : 0.02;
      dummy.position.set(BX[p.b] + p.x + Math.sin(t * 2.3 + p.ph * 2) * j, 1.45 + y, p.z + Math.cos(t * 2.1 + p.ph) * j);
      dummy.scale.setScalar(s1.show ? p.r : 0.0001); dummy.updateMatrix();
      parts.setMatrixAt(i++, dummy.matrix);
    }
    parts.instanceMatrix.needsUpdate = true;
    bubbles.forEach(b => { b.visible = s1.show; });
  }

  // ================= 2. Magnet: iron and sulfur =================
  const S2 = new THREE.Group(); S2.position.x = X.magnet; scene.add(S2);
  const dishGeo = new THREE.CylinderGeometry(0.48, 0.44, 0.08, 28, 1, true).translate(0, 0.04, 0);
  [-0.35, 0.75].forEach(x => {
    add(S2, new THREE.Mesh(dishGeo, glass)).position.x = x;
    add(S2, new THREE.Mesh(new THREE.CircleGeometry(0.44, 28).rotateX(-Math.PI / 2), kit.mat(0xf2f6f8))).position.set(x, 0.004, 0);
  });
  const NB = 140;
  const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), kit.mat(0xffffff, { roughness: 0.6 }), NB);
  bits.frustumCulled = false; bits.instanceMatrix.setUsage(THREE.DynamicDrawUsage); S2.add(bits);
  const BITS = [];
  for (let i = 0; i < NB; i++) {
    const iron = i % 2 === 0, a = rand(i + 5) * 6.28, d = Math.sqrt(rand(i + 8)) * 0.38;
    BITS.push({ iron, s: v3(-0.35 + Math.cos(a) * d, 0.02 + rand(i + 3) * 0.02, Math.sin(a) * d), o: v3((rand(i + 12) - 0.5) * 0.14, -0.31 - rand(i + 15) * 0.05, (rand(i + 18) - 0.5) * 0.14), lag: rand(i + 21) * 0.5, size: iron ? 0.035 : 0.032, rot: rand(i + 24) * 3 });
    col.set(iron ? 0x4a4f55 : 0xf5d000); bits.setColorAt(i, col);
  }
  const magnet = new THREE.Group(); S2.add(magnet);
  kit.mesh(new THREE.BoxGeometry(0.16, 0.3, 0.16), kit.mat(0xd62828), [0, 0.15, 0], magnet);
  kit.mesh(new THREE.BoxGeometry(0.16, 0.3, 0.16), kit.mat(0xc0c7cf, { metalness: 0.4 }), [0, -0.15, 0], magnet);
  const s2Tags = { mix: label('Iron + sulfur', v3(X.magnet - 0.35, 0.35, 0.3)), magnet: label('Magnet', new THREE.Vector3()), iron: label('Iron', v3(X.magnet + 0.75, 0.35, 0.3)) };
  const mg = { t: 0, run: false };
  const magPos = (t, out) => {
    const down = kit.ease(kit.clamp(t / 0.8, 0, 1)), up = kit.ease(kit.clamp((t - 1.7) / 0.8, 0, 1)), over = kit.ease(kit.clamp((t - 2.5) / 1.0, 0, 1)), drop = kit.ease(kit.clamp((t - 3.6) / 0.6, 0, 1));
    return out.set(-0.35 + over * 1.1, 1.3 - down * 0.92 + up * 0.6 - drop * 0.25, 0);
  };
  const mp = new THREE.Vector3();
  function s2Tick(dt) {
    if (mg.run) mg.t += dt;
    const t = mg.run ? mg.t : 0;
    magPos(t, mp); magnet.position.copy(mp);
    s2Tags.magnet.at.set(X.magnet + mp.x + 0.35, mp.y + 0.15, 0);
    BITS.forEach((b, i) => {
      if (b.iron && t > 0.8) {
        const k2 = kit.ease(kit.clamp((t - 0.8 - b.lag) / 0.45, 0, 1)), wipe = kit.clamp((t - 4.2) / 0.5, 0, 1);
        dummy.position.lerpVectors(b.s, v3(mp.x + b.o.x, mp.y + b.o.y, mp.z + b.o.z), k2);
        if (wipe > 0) dummy.position.lerp(v3(0.75 + b.s.x + 0.35, 0.02 + b.s.y, b.s.z), kit.ease(wipe));
      } else dummy.position.copy(b.s);
      dummy.rotation.set(b.rot, b.rot * 2, 0);
      dummy.scale.set(b.size * (b.iron ? 2.2 : 1), b.size * (b.iron ? 0.5 : 1), b.size * (b.iron ? 0.5 : 1));
      dummy.updateMatrix(); bits.setMatrixAt(i, dummy.matrix);
    });
    bits.instanceMatrix.needsUpdate = true;
    dummy.rotation.set(0, 0, 0);
    const done = t > 4.7;
    s2Tags.mix.text = t > 1.6 ? 'Sulfur' : 'Iron + sulfur';
    s2Tags.iron.show(done && st.step === 1);
    return mg.run && !done;
  }

  // ================= 3. Filtration =================
  const S3 = new THREE.Group(); S3.position.x = X.filter; scene.add(S3);
  kit.mesh(new THREE.BoxGeometry(0.7, 0.04, 0.5), dark, [-0.4, 0.02, 0], S3);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.65, 8), steel, [-0.6, 0.825, 0], S3);
  const ringR = kit.mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 24), steel, [0, 1.4, 0], S3); ringR.rotation.x = Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), steel, [-0.4, 1.4, 0], S3).rotation.z = Math.PI / 2;
  const funnelGeo = new THREE.CylinderGeometry(0.34, 0.035, 0.42, 28, 1, true).translate(0, 0.21, 0);
  const funnel = add(S3, new THREE.Mesh(funnelGeo, glass)); funnel.position.y = 1.3; funnel.renderOrder = 3;
  add(S3, new THREE.LineSegments(new THREE.EdgesGeometry(funnelGeo, 40), edge)).position.y = 1.3;
  add(S3, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10, 1, true), glass)).position.y = 1.08;
  const paper = add(S3, new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.02, 0.37, 28, 1, true).translate(0, 0.185, 0), kit.mat(0xffffff, { side: THREE.DoubleSide, roughness: 1, emissive: 0x666666 })));
  paper.position.y = 1.35;
  const coneLiq = add(S3, new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.36, 28).rotateX(Math.PI).translate(0, 0.18, 0), new THREE.MeshStandardMaterial({ color: 0x8a6a45, transparent: true, opacity: 0.9 })));
  coneLiq.position.y = 1.36;
  const residue = add(S3, new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.36, 28).rotateX(Math.PI).translate(0, 0.18, 0), kit.mat(0xc2a06a, { roughness: 1 })));
  residue.position.y = 1.365;
  const catcher = beaker(S3, 0, 0.3, 0.62, 0x9ed8ff, 0.45);
  const source = new THREE.Group(); source.position.set(-0.62, 2.05, 0); source.rotation.z = -1.25; S3.add(source);
  const srcSide = new THREE.CylinderGeometry(0.18, 0.18, 0.4, 20, 1, true).translate(0, 0.2, 0);
  add(source, new THREE.Mesh(srcSide, glass)); source.add(new THREE.LineSegments(new THREE.EdgesGeometry(srcSide, 40), edge));
  // Stream from the tilted beaker's lip to the funnel, and the drip from the stem.
  const lip = v3(-0.25, 1.95, 0), into = v3(0.02, 1.62, 0);
  const stream = add(S3, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 1, 8).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: 0x8a6a45 })));
  stream.position.copy(lip); stream.scale.y = lip.distanceTo(into);
  stream.quaternion.setFromUnitVectors(v3(0, -1, 0), into.clone().sub(lip).normalize());
  const drip = add(S3, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: 0x9ed8ff, transparent: true, opacity: 0.8 })));
  drip.position.y = 0.86;
  const s3Tags = { paper: label('Filter paper', v3(X.filter + 0.55, 1.75, 0)), filtrate: label('Filtrate', v3(X.filter + 0.55, 0.35, 0), { cls: 'cool' }), residue: label('Residue', v3(X.filter + 0.05, 1.42, 0.2), { cls: 'warm' }) };
  const fl = { t: 0, run: false };
  function s3Tick(dt) {
    if (fl.run) fl.t += dt;
    const t = fl.t;
    const pouring = fl.run && t > 0.2 && t < 3.4;
    stream.visible = pouring;
    const inFunnel = kit.clamp((t - 0.3) / 1.4, 0, 1) * (1 - kit.clamp((t - 3.4) / 3.0, 0, 1));
    coneLiq.visible = inFunnel > 0.03;
    const s = Math.cbrt(Math.max(0.001, inFunnel)) * 0.95;
    coneLiq.scale.set(s, s, s);
    const res = kit.clamp((t - 0.6) / 4, 0, 1) * 0.42;
    residue.visible = res > 0.01; residue.scale.set(Math.max(0.01, res), Math.max(0.01, res), Math.max(0.01, res));
    const fil = kit.clamp((t - 0.9) / 5.2, 0, 1);
    catcher.level(fil * 0.4);
    drip.visible = fl.run && t > 0.9 && t < 6.1;
    drip.scale.y = Math.max(0.01, 0.86 - fil * 0.4 - 0.01);
    s3Tags.residue.show(st.step === 2 && res > 0.15);
    return fl.run && t < 6.3;
  }
  const readFilter = () => {
    const ml = Math.round(kit.clamp((fl.t - 0.9) / 5.2, 0, 1) * 50);
    return `Filtrate collected: <b>${ml} mL</b> of clear water${fl.t > 4 ? ' · Residue: <b>sand</b> left on the filter paper' : ''}`;
  };

  // ================= 4. Evaporation and crystallisation =================
  const S4 = new THREE.Group(); S4.position.x = X.evap; scene.add(S4);
  tripod(S4, 0, 0.82);
  const burner = bunsen(S4, 0, 0);
  const BOWL = { r: 0.38, d: 0.15 };
  const prof = []; for (let i = 0; i <= 10; i++) { const r = (i / 10) * BOWL.r; prof.push(new THREE.Vector2(r + 0.001, BOWL.d * (r / BOWL.r) ** 2)); }
  prof.push(new THREE.Vector2(BOWL.r + 0.03, BOWL.d + 0.01));
  const dish = kit.mesh(new THREE.LatheGeometry(prof, 32), kit.mat(0xf5f1e8, { side: THREE.DoubleSide, roughness: 0.5 }), [0, 0.85, 0], S4);
  const surf = add(S4, new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.75, roughness: 0.1 })));
  const NC = 70;
  const crystals = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), kit.mat(0xffffff, { roughness: 0.3 }), NC);
  crystals.frustumCulled = false; S4.add(crystals);
  for (let i = 0; i < NC; i++) {
    const a = rand(i + 50) * 6.28, r = Math.sqrt(rand(i + 60)) * 0.3, y = 0.85 + BOWL.d * (r / BOWL.r) ** 2 + 0.018;
    dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r); dummy.rotation.set(rand(i) * 0.5, rand(i + 1) * 3, 0); dummy.scale.setScalar(0.7 + rand(i + 2) * 0.8);
    dummy.updateMatrix(); crystals.setMatrixAt(i, dummy.matrix);
  }
  dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1);
  const steam4 = []; for (let i = 0; i < 5; i++) { const p = add(S4, new THREE.Mesh(puffGeo, steamMat)); p.visible = false; steam4.push(p); }
  const s4Tags = { dish: label('Evaporating dish', v3(X.evap - 0.55, 1.15, 0.2)), crystals: label('Salt crystals', v3(X.evap + 0.35, 1.08, 0.2), { cls: 'warm' }) };
  const ev = { water: W0, heat: 0.7 };
  function s4Tick(dt, t) {
    if (ev.water > 0) ev.water = Math.max(0, ev.water - dt * (0.05 + 8 * ev.heat));
    const L = 0.12 * Math.sqrt(ev.water / W0);
    surf.visible = ev.water > 0.05;
    const rs = BOWL.r * Math.sqrt(L / BOWL.d);
    surf.scale.set(Math.max(0.001, rs), 1, Math.max(0.001, rs)); surf.position.y = 0.85 + L;
    const cr = Math.max(0, SALT - SOL * ev.water);
    crystals.count = Math.round(NC * cr / SALT);
    burner.set(ev.heat, t);
    steam4.forEach((p, i) => {
      p.visible = ev.water > 0 && ev.heat > 0.05;
      const u = (t * (0.4 + ev.heat * 0.5) + i / steam4.length) % 1;
      p.position.set(Math.sin(i * 2.1 + u * 3) * 0.12, 1.05 + u * 0.8, Math.cos(i * 1.3) * 0.1);
      p.scale.setScalar((0.025 + u * 0.06) * (0.5 + ev.heat));
    });
    s4Tags.crystals.show(st.step === 3 && cr > 0.5);
  }
  const readEvap = () => {
    const w = ev.water, cr = Math.max(0, SALT - SOL * w), dis = SALT - cr;
    return `Water left: <b>${w.toFixed(0)} mL</b> · Salt dissolved: <b>${dis.toFixed(1)} g</b> · Crystals: <b>${cr.toFixed(1)} g</b><br>Most salt that can stay dissolved = 0.36 g × ${w.toFixed(0)} mL = ${(SOL * w).toFixed(1)} g${w <= 0 ? ' · The dish is dry.' : ''}`;
  };

  // ================= 5–6. Distillation =================
  const S5 = new THREE.Group(); S5.position.x = X.still; scene.add(S5);
  const FX = -1.4, FY = 0.68, FR = 0.38;
  const mantle = kit.mesh(new THREE.CylinderGeometry(0.46, 0.4, 0.42, 28), kit.mat(0x546e7a), [FX, 0.21, 0], S5);
  const mantleTop = new THREE.MeshStandardMaterial({ color: 0x263238, emissive: 0x000000 });
  kit.mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 28), mantleTop, [FX, 0.43, 0], S5);
  const flaskGeo = new THREE.SphereGeometry(FR, 28, 18);
  add(S5, new THREE.Mesh(flaskGeo, glass)).position.set(FX, FY, 0);
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.62, 16, 1, true);
  add(S5, new THREE.Mesh(neckGeo, glass)).position.set(FX, FY + FR + 0.26, 0);
  // Liquid in the flask: a sphere cut off at the liquid level by a clipping plane, with a disc on top.
  k.renderer.localClippingEnabled = true;
  const LR = FR * 0.94, clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), FY);
  const flaskLiqMat = new THREE.MeshStandardMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.6, depthWrite: false, clippingPlanes: [clip] });
  const flaskLiq = add(S5, new THREE.Mesh(new THREE.SphereGeometry(LR, 28, 16), flaskLiqMat));
  flaskLiq.position.set(FX, FY, 0);
  const topMat = new THREE.MeshStandardMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.6, depthWrite: false });
  const flaskTop = add(S5, new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), topMat));
  flaskTop.position.set(FX, FY, 0);
  // Height of liquid (from the bottom of the sphere) that holds fraction f of a half-full flask.
  const capH = f => { let lo = 0, hi = 2 * LR; const want = f * (2 / 3) * Math.PI * LR ** 3; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (Math.PI * m * m * (3 * LR - m) / 3 < want) lo = m; else hi = m; } return lo; };
  // Thermometer in the still head, bulb level with the side arm.
  const HEAD = v3(FX, 1.42, 0);
  kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }), [FX, 1.8, 0], S5);
  kit.mesh(new THREE.SphereGeometry(0.035, 10, 8), kit.mat(0xe23b2e), [FX, HEAD.y - 0.02, 0], S5);
  const thermCol = kit.mesh(new THREE.CylinderGeometry(0.011, 0.011, 1, 6).translate(0, 0.5, 0), kit.mat(0xe23b2e), [FX, HEAD.y, 0.012], S5);
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), kit.mat(0x455a64), [FX, 1.73, 0], S5);
  // Side arm and condenser.
  const tube = (a, b, r, mat, parent = S5) => {
    const m = add(parent, new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 16, 1, true), mat));
    m.position.lerpVectors(a, b, 0.5); m.scale.y = a.distanceTo(b);
    m.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  };
  const C0 = v3(-0.85, 1.3, 0), C1 = v3(0.95, 0.72, 0), OUTL = v3(1.2, 0.5, 0);
  tube(HEAD, C0, 0.045, glass);
  const ja = C0.clone().lerp(C1, 0.08), jb = C0.clone().lerp(C1, 0.92);
  tube(ja, jb, 0.045, glass);
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x7cc6ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  tube(ja, jb, 0.14, jacketMat).renderOrder = 4;
  tube(jb, C1, 0.045, glass); tube(C1, OUTL, 0.04, glass);
  const hoseMat = kit.mat(0x2b6cb0);
  const inPort = jb.clone().add(v3(-0.05, -0.12, 0)), outPort = ja.clone().add(v3(0.05, 0.12, 0));
  tube(inPort, inPort.clone().add(v3(0.05, -0.45, 0.2)), 0.03, hoseMat);
  tube(outPort, outPort.clone().add(v3(-0.05, 0.4, 0.2)), 0.03, hoseMat);
  // Two collecting flasks (conical): A under the outlet, B waiting to the right.
  function conical(x) {
    const g = new THREE.Group(); g.position.set(x, 0, 0); S5.add(g);
    const geo = new THREE.CylinderGeometry(0.07, 0.28, 0.48, 24, 1, true).translate(0, 0.24, 0);
    add(g, new THREE.Mesh(geo, glass)).renderOrder = 3; g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 40), edge));
    const m = new THREE.MeshStandardMaterial({ color: 0x9ed8ff, transparent: true, opacity: 0.6, depthWrite: false });
    const liq = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 1, 24).translate(0, 0.5, 0), m));
    g.liq = liq; g.mat = m;
    g.level = ml => { const h = Math.min(0.4, 0.4 * ml / 90); liq.visible = h > 0.003; liq.scale.set(1 - h * 1.2, Math.max(0.001, h), 1 - h * 1.2); };
    return g;
  }
  const recA = conical(1.25), recB = conical(2.05);
  // Vapour and droplets travelling through the apparatus; cooling water in the jacket.
  const NV = 26;
  const vap = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), kit.mat(0xffffff, { roughness: 0.3 }), NV);
  vap.frustumCulled = false; vap.instanceMatrix.setUsage(THREE.DynamicDrawUsage); S5.add(vap);
  const PATH = [v3(FX, FY + 0.05, 0), HEAD, C0, C1, OUTL];
  const seg = []; let plen = 0; for (let i = 0; i < PATH.length - 1; i++) { const l = PATH[i].distanceTo(PATH[i + 1]); seg.push(l); plen += l; }
  const condStart = (seg[0] + seg[1] + seg[2] * 0.25) / plen;
  const vapCol = new THREE.Color(0xf4f7fa), dropCol = new THREE.Color(0x3a8ee6);
  const pointAt = (u, out) => { let d = u * plen; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) return out.lerpVectors(PATH[i], PATH[i + 1], Math.min(1, d / seg[i])); d -= seg[i]; } return out; };
  const NW = 14;
  const cool = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: 0x1e6fd9 }), NW);
  cool.frustumCulled = false; cool.instanceMatrix.setUsage(THREE.DynamicDrawUsage); S5.add(cool);
  const NBUB = 10;
  const bubs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }), NBUB);
  bubs.frustumCulled = false; bubs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); S5.add(bubs);
  const s5Tags = {
    therm: label('', v3(X.still + FX, 2.3, 0), { cls: 'warm' }),
    cond: label('Condenser', v3(X.still + 0.05, 1.25, 0.15), { cls: 'cool' }),
    win: label('Water in', v3(X.still + inPort.x + 0.15, inPort.y - 0.45, 0.2), { cls: 'cool' }),
    wout: label('Water out', v3(X.still + outPort.x - 0.1, outPort.y + 0.45, 0.2), { cls: 'cool' }),
    recA: label('', v3(X.still + 1.25, 0.6, 0)),
    recB: label('', v3(X.still + 2.05, 0.6, 0)),
  };
  const di = { mode: 'salt', heat: 0.8, T: 20, Tth: 20, flask: 100, eth: 0, a: 0, b: 0, swap: 0, flow: 0 };
  function resetStill(mode) {
    Object.assign(di, { mode, T: 20, Tth: 20, flask: 100, eth: mode === 'eth' ? 50 : 0, a: 0, b: 0, swap: 0, flow: 0 });
    flaskLiqMat.color.set(mode === 'eth' ? 0xb9e4ff : 0x8fd3ff); topMat.color.copy(flaskLiqMat.color);
  }
  const vp = new THREE.Vector3();
  function s5Tick(dt, t) {
    const bp = di.mode === 'eth' && di.eth > 0.5 ? 78 : 100;
    const minLeft = 15, can = di.flask > minLeft;
    const heat = can ? di.heat : 0;
    if (di.T < bp) di.T = Math.min(bp, di.T + dt * 40 * heat);
    else if (di.T > bp) di.T = Math.max(bp, di.T - dt * 20);
    if (!can) di.T = Math.max(20, di.T - dt * 4);
    const boiling = can && heat > 0.02 && di.T >= bp - 0.01;
    kit.follow(di, 'Tth', boiling ? bp : 20 + (di.T - 20) * 0.3, dt, boiling ? 3 : 1);
    kit.follow(di, 'flow', boiling ? heat : 0, dt, 2);
    if (boiling) {
      const d = Math.min(di.flask - minLeft, dt * 6 * heat);
      di.flask -= d;
      if (di.mode === 'eth' && di.eth > 0.5) { di.eth = Math.max(0, di.eth - d); di.a += d; }
      else if (di.mode === 'eth') di.b += d; else di.a += d;
    }
    if (di.mode === 'eth' && di.eth <= 0.5) di.swap = Math.min(1, di.swap + dt / 1.2);
    // Receivers swap places once the ethanol has come over.
    const e = kit.ease(di.swap);
    recA.position.set(1.25 + e * 0.8, 0, -e * 0.7); recB.position.set(2.05 - e * 0.8, 0, 0);
    recB.visible = di.mode === 'eth';
    recA.level(di.a); recB.level(di.b);
    s5Tags.recA.at.set(X.still + recA.position.x, 0.62, recA.position.z);
    s5Tags.recA.text = di.mode === 'eth' ? 'Mostly ethanol' : 'Pure water';
    s5Tags.recB.text = 'Water';
    s5Tags.recB.show(st.step === 5 && di.swap > 0.99 && di.b > 1);
    // Flask liquid: the cap shrinks as the volume goes down.
    const lev = FY - LR + capH(di.flask / 100);
    clip.constant = lev + S5.position.y;
    flaskTop.position.y = lev; const rt = Math.sqrt(Math.max(0, LR * LR - (lev - FY) ** 2));
    flaskTop.scale.set(rt, 1, rt);
    mantleTop.emissive.setRGB(0.9 * heat, 0.25 * heat, 0.05 * heat);
    thermCol.scale.y = 0.03 + 0.6 * (di.Tth - 0) / 110;
    s5Tags.therm.text = `${Math.round(di.Tth)} °C`;
    // Moving bits.
    for (let i = 0; i < NV; i++) {
      const u = (t * 0.35 + i / NV) % 1, on = i < Math.round(NV * di.flow);
      pointAt(u, vp);
      dummy.position.copy(vp); dummy.scale.setScalar(on ? (u > condStart ? 0.028 : 0.04) : 0.0001); dummy.updateMatrix();
      vap.setMatrixAt(i, dummy.matrix); vap.setColorAt(i, u > condStart ? dropCol : vapCol);
    }
    vap.instanceMatrix.needsUpdate = true; vap.instanceColor.needsUpdate = true;
    for (let i = 0; i < NW; i++) {
      const u = (t * 0.25 + i / NW) % 1, ang = i * 2.4;
      dummy.position.lerpVectors(jb, ja, u).add(v3(0, Math.cos(ang) * 0.09, Math.sin(ang) * 0.09));
      dummy.scale.setScalar(1); dummy.updateMatrix(); cool.setMatrixAt(i, dummy.matrix);
    }
    cool.instanceMatrix.needsUpdate = true;
    const lvl = flaskTop.position.y;
    for (let i = 0; i < NBUB; i++) {
      const u = (t * 1.2 + i / NBUB) % 1, on = boiling;
      dummy.position.set(FX + Math.sin(i * 2.7) * 0.18, FY - FR * 0.85 + u * (lvl - (FY - FR * 0.85)), Math.cos(i * 1.9) * 0.15);
      dummy.scale.setScalar(on ? 0.02 + u * 0.015 : 0.0001); dummy.updateMatrix(); bubs.setMatrixAt(i, dummy.matrix);
    }
    bubs.instanceMatrix.needsUpdate = true;
  }
  const readStill = () => {
    const what = di.mode === 'eth' ? (di.eth > 0.5 ? (di.Tth > 70 ? 'ethanol boiling off' : 'heating') : (di.Tth > 95 ? 'water boiling off' : 'ethanol gone, temperature rising')) : (di.Tth > 95 ? 'water boiling off' : 'heating');
    const stop = di.flask <= 15.01 ? '<br>Heating stopped: never let the flask boil dry.' : '';
    if (di.mode === 'eth') return `Thermometer: <b>${Math.round(di.Tth)} °C</b> · ${what}<br>Flask 1 (mostly ethanol): <b>${di.a.toFixed(0)} mL</b> · Flask 2 (water): <b>${di.b.toFixed(0)} mL</b>${stop}`;
    return `Thermometer: <b>${Math.round(di.Tth)} °C</b> · ${what}<br>Pure water collected: <b>${di.a.toFixed(0)} mL</b> · Salt water left in the flask: <b>${di.flask.toFixed(0)} mL</b>${stop}`;
  };

  // ================= 7. Chromatography =================
  const S7 = new THREE.Group(); S7.position.x = X.chroma; scene.add(S7);
  const cb = beaker(S7, 0, 0.36, 1.05, 0xbfe6ff, 0.45); cb.level(0.1);
  const rod = kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.95, 8), new THREE.MeshStandardMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.8 }), [0, 1.09, 0], S7); rod.rotation.z = Math.PI / 2;
  const pc = document.createElement('canvas'); pc.width = 128; pc.height = 416;
  const pg = pc.getContext('2d');
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  const PH = 13 * CM;
  const strip = add(S7, new THREE.Mesh(new THREE.PlaneGeometry(0.34, PH), new THREE.MeshBasicMaterial({ map: ptex, side: THREE.DoubleSide })));
  strip.position.set(0, 0.04 + PH / 2, 0);
  const BASE = 1.5; // cm: pencil start line above the bottom of the strip
  const ch = { ink: 'black', t: 0, run: false, d: 0 };
  const yAt = cm => 0.04 + cm * CM;
  const s7Tags = { front: label('Solvent front', v3(X.chroma + 0.42, yAt(BASE) + 0.04, 0)), start: label('Start line', v3(X.chroma - 0.42, yAt(BASE) + 0.04, 0)) };
  function drawPaper() {
    const w = 128, h = 416, py = cm => h - cm * 32;
    pg.fillStyle = '#ffffff'; pg.fillRect(0, 0, w, h);
    const front = BASE + ch.d;
    pg.fillStyle = '#e4eef6'; pg.fillRect(0, py(front), w, h - py(front));
    pg.strokeStyle = '#9aa5ad'; pg.lineWidth = 2; pg.beginPath(); pg.moveTo(8, py(BASE)); pg.lineTo(w - 8, py(BASE)); pg.stroke();
    if (ch.d > 0.05) { pg.strokeStyle = '#b8cbd9'; pg.beginPath(); pg.moveTo(0, py(front)); pg.lineTo(w, py(front)); pg.stroke(); }
    const dyes = DYES[ch.ink];
    pg.globalCompositeOperation = 'multiply';
    for (const dye of dyes) {
      const y = py(BASE + dye.rf * ch.d), r = 9 + ch.d * 0.9;
      pg.fillStyle = dye.c; pg.globalAlpha = 0.85;
      pg.beginPath(); pg.ellipse(w / 2, y, r, r * (0.8 + ch.d * 0.05), 0, 0, Math.PI * 2); pg.fill();
    }
    pg.globalAlpha = 1; pg.globalCompositeOperation = 'source-over';
    ptex.needsUpdate = true;
  }
  function s7Tick(dt) {
    if (!ch.run) return false;
    ch.t += dt;
    ch.d = Math.min(9, 9 * Math.sqrt(ch.t / 20));
    drawPaper();
    s7Tags.front.at.set(X.chroma + 0.42, yAt(BASE + ch.d) + 0.04, 0);
    return ch.d < 9;
  }
  drawPaper();
  const readChroma = () => {
    const dyes = DYES[ch.ink];
    const list = dyes.map(d => `${d.name} ${(d.rf * ch.d).toFixed(1)} cm`).join(', ');
    return `Solvent moved: <b>${ch.d.toFixed(1)} cm</b> · Spots moved: ${list}<br>R<sub>f</sub> = spot distance ÷ solvent distance: ${dyes.map(d => `${d.name} <b>${d.rf.toFixed(2)}</b>`).join(', ')}`;
  };

  // ================= Steps =================
  const st = { step: 0, quiz: false, last: '' };
  const allTags = [...s1Tags, ...Object.values(s2Tags), ...Object.values(s3Tags), ...Object.values(s4Tags), ...Object.values(s5Tags), ...Object.values(s7Tags)];
  const out = html => { if (html !== st.last && !st.quiz) { st.last = html; ui.readout(html); } };
  const VIEW = {
    beakers: { radius: 1.35, width: 1.45, yaw: 0, pitch: 0.12, target: [X.beakers, 0.95, 0] },
    magnet: { radius: 1.0, width: 1.0, yaw: 0, pitch: 0.4, target: [X.magnet + 0.2, 0.5, 0] },
    filter: { radius: 1.25, yaw: 0.15, pitch: 0.38, target: [X.filter - 0.1, 1.0, 0] },
    evap: { radius: 1.05, yaw: 0.15, pitch: 0.2, target: [X.evap, 0.9, 0] },
    still: { radius: 1.35, width: 2.05, yaw: 0, pitch: 0.12, target: [X.still + 0.1, 1.05, 0] },
    chroma: { radius: 0.85, yaw: 0.25, pitch: 0.12, target: [X.chroma, 0.62, 0] },
  };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.quiz = isQuiz; st.last = '';
      allTags.forEach(t => t.show(false));
      if (i === 0) {
        go(VIEW.beakers); s1Tags.forEach(t => t.show(true));
        s1.settle = 0; s1.show = true;
        const info = [
          ['Pure water', 0, 'A <b>pure substance</b> has only one kind of particle. Pure water boils at exactly 100 °C at sea level.'],
          ['Salt water', 1, 'A <b>solution</b>: salt (the solute) has dissolved in water (the solvent). The particles are evenly mixed, so it looks the same all through: a <b>homogeneous</b> mixture.'],
          ['Muddy water', 2, 'A <b>suspension</b>: bits of soil float in the water but do not dissolve. Left to stand, they settle. It is not the same all through: a <b>heterogeneous</b> mixture.'],
        ];
        ui.buttons(info.map(([name, b, txt]) => ({ label: name, onClick: () => { ui.readout(txt); view({ radius: 0.85, yaw: 0, pitch: 0.12, target: [X.beakers + BX[b], 0.95, 0] }); } })));
        ui.buttons([{ label: 'Stir the muddy water', onClick: () => { s1.settle = 0; } }, { label: 'See all three', onClick: () => view(VIEW.beakers) }]);
        ui.toggle({ label: 'Show particles', value: true, onChange: v => { s1.show = v; } });
        ui.readout('Three beakers: a <b>pure substance</b> and two <b>mixtures</b>. The bubbles show the particles, hugely magnified.');
      }
      if (i === 1) {
        go(VIEW.magnet); s2Tags.mix.show(true); s2Tags.magnet.show(true);
        mg.t = 0; mg.run = false; st.magAt = 0.4;
        ui.buttons([{ label: 'Use the magnet', onClick: () => { st.magAt = 0; mg.t = 0; mg.run = true; } }, { label: 'Mix again', onClick: () => { st.magAt = 0; mg.t = 0; mg.run = false; } }]);
        ui.readout('Iron filings (grey) mixed with sulfur powder (yellow). <b>Iron is magnetic; sulfur is not.</b>');
      }
      if (i === 2) {
        go(VIEW.filter); s3Tags.paper.show(true); s3Tags.filtrate.show(true);
        fl.t = 0; fl.run = true;
        ui.buttons([{ label: 'Pour again', onClick: () => { fl.t = 0; fl.run = true; } }]);
      }
      if (i === 3) {
        go(VIEW.evap); s4Tags.dish.show(true);
        ev.water = W0; ev.heat = 0.7;
        ui.slider({ label: 'Heat', min: 0, max: 100, step: 5, value: 70, unit: '%', onInput: v => { ev.heat = v / 100; } });
        ui.buttons([{ label: 'Start again', onClick: () => { ev.water = W0; } }]);
      }
      if (i === 4 || i === 5) {
        go(i === 4 ? VIEW.still : { ...VIEW.still, width: 2.4, target: [X.still + 0.3, 1.05, 0] });
        ['therm', 'cond', 'win', 'wout', 'recA'].forEach(n => s5Tags[n].show(true));
        resetStill(i === 4 ? 'salt' : 'eth'); di.heat = 0.8;
        ui.slider({ label: 'Heat', min: 0, max: 100, step: 5, value: 80, unit: '%', onInput: v => { di.heat = v / 100; } });
        ui.buttons([{ label: 'Start again', onClick: () => resetStill(di.mode) }]);
      }
      if (i === 6) {
        go(VIEW.chroma); s7Tags.start.show(true); s7Tags.front.show(true);
        ch.ink = 'black'; ch.t = 0; ch.d = 0; ch.run = true; drawPaper();
        ui.buttons([{ label: 'Black ink', on: true, onClick: () => { ch.ink = 'black'; ch.t = 0; ch.run = true; } }, { label: 'Green ink', onClick: () => { ch.ink = 'green'; ch.t = 0; ch.run = true; } }]);
      }
      if (isQuiz) go({ radius: 2.2, width: 10.5, yaw: 0, pitch: 0.3, target: [X.still - 2.5, 0.8, 0] });
    },

    update(dt, t) {
      let busy = st.quiz || st.step === 0 || st.step === 3 || st.step === 4 || st.step === 5;
      const s = st.quiz ? -1 : st.step;
      if (s === 0 || st.quiz) s1Tick(dt, t);
      if (s === 1 && st.magAt > 0) { busy = true; st.magAt -= dt; if (st.magAt <= 0) { mg.t = 0; mg.run = true; } }
      busy = s2Tick(dt) || busy;
      busy = s3Tick(dt) || busy;
      if (s === 2) out(readFilter());
      if (s === 3 || st.quiz) { s4Tick(dt, t); out(readEvap()); }
      if (s === 4 || s === 5 || st.quiz) { s5Tick(dt, t); out(readStill()); }
      if (s === 6) { busy = s7Tick(dt) || busy; out(readChroma()); }
      return busy;
    },
  };
}
