// Everything is made of tiny particles: a bench with six stations, left to right.
// A glass of water you can zoom into, a sugar cube dissolving into dots, a dish of sugar water drying in the sun,
// two balances (sugar dissolving, ice melting and freezing in a closed jar) and a model room where perfume spreads.
const BT = 0.8;
const X = { zoom: -6.2, sugar: -3.4, dish: -0.8, bal1: 2.0, bal2: 4.9, room: 8.2 };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xdfe6d2, sky: 0xe9f2ff, radius: 18 });
  kit.lights(scene, { sun: [1, 11, 7] });
  kit.mesh(new THREE.BoxGeometry(17.4, BT - 0.05, 1.8), kit.mat(0x7b6d8d), [1.0, (BT - 0.05) / 2, 0], scene).castShadow = false;
  kit.mesh(new THREE.BoxGeometry(17.6, 0.05, 1.9), kit.mat(0xf6f4f0), [1.0, BT - 0.025, 0], scene);
  kit.mesh(new THREE.PlaneGeometry(17.6, 2.6), kit.mat(0xf3eefa), [1.0, BT + 1.3, -0.95], scene).castShadow = false;

  const glassMat = (o = 0.2) => new THREE.MeshStandardMaterial({ color: 0xe6f6ff, transparent: true, opacity: o, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const waterMat = (color = 0x4aa3df, opacity = 0.4) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.15, depthWrite: false });
  const M4 = new THREE.Matrix4(), QI = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3();
  const setInst = (im, i, x, y, z, s) => { V.set(x, y, z); S.set(s, s, s); M4.compose(V, QI, S); im.setMatrixAt(i, M4); };
  const anchor = (x, y, z, parent = scene) => { const a = new THREE.Object3D(); a.position.set(x, y, z); parent.add(a); return a; };
  const ballGeo = new THREE.SphereGeometry(1, 12, 8), cylGeo = new THREE.CylinderGeometry(1, 1, 1, 28), boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const inst = (geo, material, n, parent = scene) => { const im = new THREE.InstancedMesh(geo, material, n); im.frustumCulled = false; im.castShadow = false; parent.add(im); return im; };
  const sugarMat = kit.mat(0xffffff, { roughness: 0.6 });
  const st = { step: 0, time: 0, quiz: false, plan: [], said: '' };
  const say = html => { if (html !== st.said) { st.said = html; ui.readout(html); } };

  function glass(parent, x, y, z, r, h, level) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28, 1, true), glassMat());
    wall.position.y = h / 2; wall.renderOrder = 3;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.025, 28), glassMat(0.35));
    base.position.y = 0.0125; base.renderOrder = 3;
    const wm = waterMat();
    const water = new THREE.Mesh(cylGeo, wm);
    water.renderOrder = 1;
    g.add(wall, base, water);
    const o = { g, r, h, wm, water };
    o.set = lv => { water.visible = lv > 0.003; water.scale.set(r - 0.01, Math.max(0.001, lv), r - 0.01); water.position.y = 0.025 + lv / 2; };
    o.set(level);
    return o;
  }

  // ---------- A: a glass of water to zoom into ----------
  const gZoom = glass(scene, X.zoom, BT, 0, 0.3, 0.72, 0.56);
  const ZC = [X.zoom, BT + 0.33, 0.06], NZ = 170, ZR = 0.115;
  const zoomDots = inst(ballGeo, kit.mat(0x2f80d1, { roughness: 0.35 }), NZ);
  const zoomShell = new THREE.Mesh(new THREE.SphereGeometry(ZR + 0.018, 24, 16), new THREE.MeshBasicMaterial({ color: 0xbfe2f7, transparent: true, opacity: 0.18, depthWrite: false }));
  zoomShell.position.set(...ZC);
  scene.add(zoomShell);
  const zoomBase = [];
  for (let i = 0; i < NZ; i++) {
    // Spread the dots evenly through a ball (a spiral of points at growing radius).
    const f = (i + 0.5) / NZ, r = ZR * Math.cbrt(f), th = i * 2.39996, ph = Math.acos(1 - 2 * rand(i + 40));
    zoomBase.push([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th), rand(i) * 6.28, 3 + rand(i + 7) * 3]);
  }
  const zoomTag = label('Water', anchor(X.zoom, BT + 0.82, 0));
  const zS = { z: 0, slider: null };
  function zoomFrame() {
    const k = kit.clamp((zS.z - 0.35) / 0.4, 0, 1);
    gZoom.wm.opacity = 0.4 - 0.32 * k;
    zoomDots.visible = zoomShell.visible = k > 0;
    const t = st.time;
    for (let i = 0; i < NZ; i++) {
      const b = zoomBase[i], j = 0.006;
      setInst(zoomDots, i, ZC[0] + b[0] + j * Math.sin(t * b[4] + b[3]), ZC[1] + b[1] + j * Math.sin(t * b[4] * 1.3 + b[3] * 2), ZC[2] + b[2] + j * Math.cos(t * b[4] * 0.9 + b[3]), 0.0135 * k);
    }
    zoomDots.instanceMatrix.needsUpdate = true;
    zoomTag.text = k > 0.5 ? 'Water particles' : 'Water';
    zoomTag.at.position.set(X.zoom, k > 0.5 ? ZC[1] + ZR + 0.04 : BT + 0.82, k > 0.5 ? ZC[2] : 0);
    return k > 0;
  }
  const zoomView = z => ({
    radius: Math.exp(kit.lerp(Math.log(0.72), Math.log(0.2), z)), yaw: 0.2, pitch: kit.lerp(0.25, 0.12, z),
    target: [X.zoom, kit.lerp(BT + 0.42, ZC[1], z), kit.lerp(0, ZC[2], z)],
  });

  // ---------- B: a sugar cube dissolving ----------
  const gSugar = glass(scene, X.sugar, BT, 0, 0.3, 0.72, 0.56);
  const cube = kit.mesh(boxGeo, kit.mat(0xffffff, { roughness: 0.9 }), [X.sugar, BT + 1.0, 0], scene);
  const NSG = 110;
  const sugarDots = inst(ballGeo, sugarMat, NSG);
  const sugarTarget = [];
  for (let i = 0; i < NSG; i++) {
    const a = rand(i + 100) * 6.28, r = Math.sqrt(rand(i + 130)) * 0.26;
    sugarTarget.push([X.sugar + r * Math.cos(a), BT + 0.05 + rand(i + 160) * 0.5, r * Math.sin(a), rand(i + 190), 2 + rand(i + 220) * 3]);
  }
  const cubeTag = label('Sugar cube', anchor(X.sugar, BT + 0.82, 0));
  const sgS = { t: -1, show: true };
  const CUBE_Y = BT + 0.12;
  function sugarFrame(dt) {
    let busy = false;
    if (sgS.t >= 0) { sgS.t += dt; busy = true; }
    const t = sgS.t;
    const fall = t < 0 ? 0 : Math.min(1, t / 0.5);
    const left = t < 0.5 ? 1 : kit.clamp(1 - (t - 0.5) / 2.0, 0, 1);  // share of the cube not dissolved yet
    const side = 0.13 * Math.cbrt(left);
    cube.visible = left > 0.01;
    cube.scale.setScalar(Math.max(0.001, side));
    cube.position.set(X.sugar, kit.lerp(BT + 0.95, CUBE_Y - (0.13 - side) / 2, fall * fall), 0);
    sugarDots.visible = sgS.show && t > 0.5;
    for (let i = 0; i < NSG; i++) {
      const g = sugarTarget[i];
      // Each particle leaves the cube at its own moment, then wanders out to its place in the glass.
      const leave = 0.5 + g[3] * 2.0, k = kit.clamp((t - leave) / 1.6, 0, 1), e = 1 - (1 - k) * (1 - k);
      const j = 0.008 * k;
      setInst(sugarDots, i,
        kit.lerp(X.sugar, g[0], e) + j * Math.sin(st.time * g[4] + i),
        kit.lerp(CUBE_Y, g[1], e) + j * Math.cos(st.time * g[4] * 1.2 + i),
        kit.lerp(0, g[2], e) + j * Math.sin(st.time * g[4] * 0.8 + i * 2),
        t > leave ? 0.011 : 0);
    }
    sugarDots.instanceMatrix.needsUpdate = true;
    cubeTag.text = t > 2.4 ? 'Sugar particles' : 'Sugar cube';
    cubeTag.at.position.y = t > 2.4 ? BT + 0.66 : cube.position.y + 0.15;
    return busy;
  }

  // ---------- C: a dish of sugar water drying in the sun ----------
  const DX = X.dish, DR = 0.42, DY = BT + 0.02;
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(DR, DR - 0.04, 0.1, 32, 1, true), glassMat(0.3));
  dish.position.set(DX, DY + 0.05, 0); dish.renderOrder = 3;
  scene.add(dish);
  kit.mesh(new THREE.CylinderGeometry(DR - 0.04, DR - 0.04, 0.02, 32), glassMat(0.4), [DX, DY + 0.01, 0], scene).renderOrder = 3;
  const dishWater = new THREE.Mesh(cylGeo, waterMat(0x58aee6, 0.55));
  dishWater.renderOrder = 1;
  scene.add(dishWater);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
  sun.position.set(DX - 0.75, BT + 1.45, -0.45);
  scene.add(sun);
  const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.25, depthWrite: false }));
  sun.add(sunGlow);
  const NDS = 40, NCR = 34, NVP = 10;
  const dishDots = inst(ballGeo, sugarMat, NDS);
  const crystals = inst(boxGeo, kit.mat(0xffffff, { roughness: 0.3, emissive: 0x333333 }), NCR);
  const vapour = inst(ballGeo, new THREE.MeshBasicMaterial({ color: 0xb9dcf2, transparent: true, opacity: 0.6, depthWrite: false }), NVP);
  const spoon = new THREE.Group();
  scene.add(spoon);
  const spoonMat = kit.mat(0xced4da, { metalness: 0.7, roughness: 0.25 });
  kit.mesh(new THREE.BoxGeometry(0.035, 0.012, 0.42), spoonMat, [0, 0, 0.27], spoon);
  const bowl = kit.mesh(new THREE.SphereGeometry(0.07, 14, 8), spoonMat, [0, 0, 0], spoon);
  bowl.scale.set(1, 0.35, 1.3);
  const dishTag = label('Sugar water', anchor(DX, DY + 0.25, 0.25));
  const sweetTag = label('Sweet!', anchor(0, 0.1, 0, spoon), { cls: 'warm' });
  const SPOON_REST = [DX + 0.62, DY + 0.03, 0.25], SPOON_DIP = [DX + 0.15, DY + 0.07, 0.1], SPOON_UP = [DX + 0.45, DY + 0.55, 0.5];
  const dS = { e: 0, sun: false, taste: -1 };
  function dishFrame(dt) {
    let busy = false;
    if (dS.sun && dS.e < 1) { dS.e = Math.min(1, dS.e + dt / 2.6); busy = true; }
    const e = dS.e, h = 0.06 * (1 - e);
    dishWater.visible = h > 0.002;
    dishWater.scale.set(DR - 0.05, Math.max(0.001, h), DR - 0.05); dishWater.position.set(DX, DY + 0.02 + h / 2, 0);
    for (let i = 0; i < NDS; i++) {
      const a = rand(i + 300) * 6.28, r = Math.sqrt(rand(i + 330)) * (DR - 0.09), y = DY + 0.03 + rand(i + 360) * Math.max(0.005, h - 0.012);
      setInst(dishDots, i, DX + r * Math.cos(a) + 0.004 * Math.sin(st.time * 4 + i), y, r * Math.sin(a), e > 0.8 ? 0 : 0.009);
    }
    for (let i = 0; i < NCR; i++) {
      const a = rand(i + 400) * 6.28, r = Math.sqrt(rand(i + 430)) * (DR - 0.08), s = (0.015 + rand(i + 460) * 0.02) * kit.clamp((e - 0.7) / 0.3, 0, 1);
      setInst(crystals, i, DX + r * Math.cos(a), DY + 0.02 + s / 2, r * Math.sin(a), s);
    }
    // Water vapour rises from the dish while it dries.
    vapour.visible = dS.sun && e < 1;
    for (let i = 0; i < NVP; i++) {
      const p = (st.time * 0.6 + i / NVP) % 1, a = rand(i + 500) * 6.28, r = rand(i + 530) * 0.3;
      setInst(vapour, i, DX + r * Math.cos(a), DY + 0.08 + p * 0.6, r * Math.sin(a), 0.012 * (1 - p));
    }
    dishDots.instanceMatrix.needsUpdate = crystals.instanceMatrix.needsUpdate = vapour.instanceMatrix.needsUpdate = true;
    // Taste test: the spoon dips in and comes up.
    let pos = SPOON_REST;
    if (dS.taste >= 0) {
      dS.taste += dt; busy = true;
      const t = dS.taste;
      const a = kit.ease(kit.clamp(t / 0.6, 0, 1)), b = kit.ease(kit.clamp((t - 0.8) / 0.6, 0, 1));
      V.set(...SPOON_REST).lerp(S.set(...SPOON_DIP), a).lerp(S.set(...SPOON_UP), b);
      spoon.position.copy(V);
      spoon.rotation.x = -0.25 * b;
      sweetTag.show(st.step === 2 && t > 1.3 && t < 4.5);
      if (t > 4.5) busy = false;
    } else { spoon.position.set(...pos); spoon.rotation.x = 0; sweetTag.show(false); }
    dishTag.text = e > 0.9 ? 'Sugar is left' : e > 0.05 ? 'Drying...' : 'Sugar water';
    return busy || vapour.visible;
  }

  // ---------- Balances (D and E) ----------
  const steel = kit.mat(0x8d99ae, { metalness: 0.5, roughness: 0.4 });
  const brass = kit.mat(0xd4a017, { metalness: 0.6, roughness: 0.35 });
  function balance(x) {
    const g = new THREE.Group();
    g.position.set(x, BT, 0);
    scene.add(g);
    kit.mesh(new THREE.BoxGeometry(1.0, 0.06, 0.45), kit.mat(0x6d597a), [0, 0.03, -0.1], g);
    kit.mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.0, 12), steel, [0, 0.53, -0.1], g);
    // A dial behind the needle shows when the beam is level.
    const dial = kit.mesh(new THREE.CircleGeometry(0.16, 24, 0, Math.PI), kit.mat(0xffffff), [0, 1.06, -0.13], g);
    dial.castShadow = false;
    kit.mesh(new THREE.BoxGeometry(0.008, 0.06, 0.004), kit.mat(0x2b9348), [0, 1.19, -0.125], g);
    const beam = new THREE.Group();
    beam.position.set(0, 1.04, -0.1);
    g.add(beam);
    kit.mesh(new THREE.BoxGeometry(1.4, 0.05, 0.07), steel, [0, 0, 0], beam);
    kit.mesh(new THREE.BoxGeometry(0.012, 0.17, 0.01), kit.mat(0xd62828), [0, 0.09, -0.02], beam);
    const pans = [-1, 1].map(side => {
      const p = new THREE.Group();
      g.add(p);
      for (const dz of [-0.3, 0.3]) kit.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.6, 4), steel, [0, -0.3, dz], p);
      kit.mesh(new THREE.BoxGeometry(0.03, 0.03, 0.62), steel, [0, 0, 0], p);
      kit.mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.035, 28), steel, [0, -0.6, 0], p);
      const load = new THREE.Group();
      load.position.y = -0.58;
      p.add(load);
      return { p, load, side };
    });
    const o = { g, beam, pans, tilt: 0, wob: 99 };
    o.frame = dt => {
      o.wob += dt;
      o.tilt = 0.018 * Math.exp(-3 * o.wob) * Math.sin(o.wob * 9);
      beam.rotation.z = o.tilt;
      for (const p of pans) p.p.position.set(p.side * 0.66 * Math.cos(o.tilt), 1.04 + p.side * 0.66 * Math.sin(o.tilt), -0.1);
      return o.wob < 2;
    };
    o.frame(0);
    return o;
  }
  function weights(load, n) {
    const sizes = [[0.13, 0.09], [0.09, 0.065], [0.05, 0.035]].slice(0, n);
    let y = 0;
    for (const [r, h] of sizes) { kit.mesh(new THREE.CylinderGeometry(r, r, h, 20), brass, [0, y + h / 2, 0], load); y += h; }
    return y;
  }

  // D: a glass of water and a sugar cube on the left pan.
  const b1 = balance(X.bal1);
  const gB1 = glass(b1.pans[0].load, -0.07, 0, 0, 0.17, 0.36, 0.27);
  const cube1 = kit.mesh(boxGeo, kit.mat(0xffffff, { roughness: 0.9 }), [0.22, 0.04, 0], b1.pans[0].load);
  cube1.scale.setScalar(0.08);
  const dots1 = inst(ballGeo, sugarMat, 40, b1.pans[0].load);
  const w1 = weights(b1.pans[1].load, 3);
  const b1L = label('Glass of water + sugar', anchor(-0.05, 0.6, 0, b1.pans[0].load));
  const b1R = label('Weights: 254 g', anchor(0, w1 + 0.12, 0, b1.pans[1].load));
  const s1 = { t: -1, wobbled: false };
  function bal1Frame(dt) {
    let busy = b1.frame(dt);
    if (s1.t >= 0) { s1.t += dt; busy = busy || s1.t < 4; }
    const t = s1.t;
    // The cube hops over into the glass, sinks and dissolves; its particles spread through the water.
    const hop = t < 0 ? 0 : kit.clamp(t / 0.7, 0, 1), left = kit.clamp(1 - (t - 0.8) / 1.6, 0, 1);
    const cx = kit.lerp(0.22, -0.07, hop), cy = 0.04 + Math.sin(hop * Math.PI) * 0.45 - (hop >= 1 ? 0 : 0);
    cube1.visible = left > 0.01;
    cube1.scale.setScalar(Math.max(0.001, 0.08 * Math.cbrt(left)));
    cube1.position.set(cx, hop >= 1 ? 0.06 : cy, 0);
    if (t >= 0.7 && !s1.wobbled) { s1.wobbled = true; b1.wob = 0.5; }
    dots1.visible = t > 0.8;
    for (let i = 0; i < 40; i++) {
      const a = rand(i + 600) * 6.28, r = Math.sqrt(rand(i + 630)) * 0.14, k = kit.clamp((t - 0.8 - rand(i + 660) * 1.4) / 1.2, 0, 1);
      setInst(dots1, i, -0.07 + kit.lerp(0, r * Math.cos(a), k), kit.lerp(0.06, 0.04 + rand(i + 690) * 0.24, k), kit.lerp(0, r * Math.sin(a), k), k > 0 ? 0.008 : 0);
    }
    dots1.instanceMatrix.needsUpdate = true;
    b1L.text = left < 0.01 ? 'Sugar water' : 'Glass of water + sugar';
    if (st.step === 3 && !st.quiz) say(`Left pan: <b>254 g</b> &nbsp; Right pan: <b>254 g</b> &nbsp; ${left < 0.01 ? 'The sugar has dissolved. ' : ''}The balance is <b>level</b>.`);
    return busy;
  }
  const dissolve1 = () => { if (s1.t < 0) s1.t = 0; };

  // E: a closed jar of ice on the left pan.
  const b2 = balance(X.bal2);
  const JR = 0.17, JH = 0.42, HW = 0.2;
  const jarG = new THREE.Group();
  b2.pans[0].load.add(jarG);
  const jarWall = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, JH, 28, 1, true), glassMat(0.25));
  jarWall.position.y = JH / 2; jarWall.renderOrder = 3;
  const jarBase = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, 0.02, 28), glassMat(0.35));
  jarBase.position.y = 0.01;
  jarG.add(jarWall, jarBase);
  kit.mesh(new THREE.CylinderGeometry(JR + 0.015, JR + 0.015, 0.05, 28), kit.mat(0xe63946), [0, JH + 0.02, 0], jarG);
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xe3f4ff, transparent: true, opacity: 0.85, roughness: 0.25, flatShading: true });
  const jarWater = new THREE.Mesh(cylGeo, waterMat(0x4aa3df, 0.55));
  jarWater.renderOrder = 1;
  jarG.add(jarWater);
  const block = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14), iceMat);
  jarG.add(block);
  const iceCubes = [[-0.06, 0.06, -0.04], [0.06, 0.06, 0.03], [-0.02, 0.06, 0.08], [0.01, 0.17, -0.01]].map(p => { const m = kit.mesh(boxGeo, iceMat, p, jarG); m.rotation.y = p[0] * 8; return m; });
  const w2 = weights(b2.pans[1].load, 2);
  const b2L = label('Ice', anchor(0, JH + 0.16, 0, jarG));
  const b2R = label('Weights: 320 g', anchor(0, w2 + 0.12, 0, b2.pans[1].load));
  const s2 = { a: 1, to: 1, form: 'cubes' };
  function bal2Frame(dt) {
    let busy = b2.frame(dt);
    const d = s2.to - s2.a;
    if (Math.abs(d) > 1e-4) { s2.a += Math.sign(d) * Math.min(Math.abs(d), dt / 2); busy = true; }
    const a = s2.a, wH = HW * (1 - a);
    let floor = 0.02;
    const isBlock = s2.form === 'block';
    block.visible = isBlock && a > 0.005;
    if (isBlock) {
      const bh = 1.09 * HW * a;  // ice takes up about 9% more space than the same water
      block.scale.set(JR - 0.008, Math.max(0.001, bh), JR - 0.008); block.position.y = floor + bh / 2; floor += bh;
    }
    for (const c of iceCubes) { c.visible = !isBlock && a > 0.01; c.scale.setScalar(Math.max(0.001, 0.105 * Math.cbrt(a))); }
    jarWater.visible = wH > 0.002;
    jarWater.scale.set(JR - 0.01, Math.max(0.001, wH), JR - 0.01); jarWater.position.y = floor + wH / 2;
    b2L.text = a > 0.95 ? 'Ice' : a < 0.05 ? 'Water' : s2.to < s2.a ? 'Melting' : 'Freezing';
    if (st.step === 4 && !st.quiz) say(`Left pan: <b>320 g</b> &nbsp; Right pan: <b>320 g</b> &nbsp; The balance is <b>level</b>.`);
    return busy;
  }
  const melt = () => { if (s2.to !== 0) { s2.to = 0; b2.wob = 0.6; } };
  const freeze = () => { if (s2.to !== 1) { if (s2.a < 0.05) s2.form = 'block'; s2.to = 1; b2.wob = 0.6; } };

  // ---------- F: a model room where perfume spreads ----------
  const RX0 = X.room - 1.2, RX1 = X.room + 1.2, RY0 = BT + 0.06, RY1 = BT + 1.25, RZ0 = -0.62, RZ1 = 0.62;
  kit.mesh(new THREE.BoxGeometry(2.5, 0.05, 1.35), kit.mat(0xc9a27e), [X.room, BT + 0.025, 0], scene);
  kit.mesh(new THREE.BoxGeometry(2.5, 1.25, 0.04), kit.mat(0xd8f3dc), [X.room, BT + 0.65, -0.67], scene);
  kit.mesh(new THREE.BoxGeometry(0.04, 1.25, 1.35), kit.mat(0xcde8d2), [RX0 - 0.03, BT + 0.65, 0], scene);
  // A stool with the perfume bottle on the left, a child on the right.
  kit.mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 20), kit.mat(0x8d5524), [RX0 + 0.35, BT + 0.35, 0], scene);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8), kit.mat(0x8d5524), [RX0 + 0.35, BT + 0.18, 0], scene);
  const BX = RX0 + 0.35, BY = BT + 0.37;
  kit.mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0xff8fab, transparent: true, opacity: 0.75, roughness: 0.1 }), [BX, BY + 0.08, 0], scene);
  kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), kit.mat(0xd4a017, { metalness: 0.6 }), [BX, BY + 0.18, 0], scene);
  const cap = kit.mesh(new THREE.SphereGeometry(0.04, 12, 8), kit.mat(0xd4a017, { metalness: 0.6 }), [BX, BY + 0.22, 0], scene);
  const kid = new THREE.Group();
  kid.position.set(RX1 - 0.35, BT + 0.03, 0);
  kid.rotation.y = -Math.PI / 2;
  scene.add(kid);
  const shirt = kit.mat(0x4361ee), skin = kit.mat(0xe0ac69), pants = kit.mat(0x343a40);
  for (const s of [-1, 1]) kit.mesh(new THREE.CapsuleGeometry(0.035, 0.28, 4, 8), pants, [s * 0.05, 0.18, 0], kid);
  kit.mesh(new THREE.CapsuleGeometry(0.085, 0.22, 4, 12), shirt, [0, 0.5, 0], kid);
  for (const s of [-1, 1]) kit.mesh(new THREE.CapsuleGeometry(0.025, 0.22, 4, 8), shirt, [s * 0.11, 0.48, 0], kid).rotation.z = s * 0.15;
  kit.mesh(new THREE.SphereGeometry(0.1, 20, 14), skin, [0, 0.78, 0], kid);
  const hair = kit.mesh(new THREE.SphereGeometry(0.105, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0x3d2817), [0, 0.8, -0.01], kid);
  hair.rotation.x = -0.3;
  kit.mesh(new THREE.SphereGeometry(0.018, 8, 6), skin, [0, 0.77, 0.1], kid);
  for (const s of [-1, 1]) kit.mesh(new THREE.SphereGeometry(0.012, 8, 6), kit.mat(0x222222), [s * 0.035, 0.81, 0.09], kid);
  const NOSE = [RX1 - 0.35 - 0.1, BT + 0.8, 0];
  const NAIR = 70, NPF = 60;
  const airDots = inst(ballGeo, kit.mat(0x9bb8cc, { roughness: 0.5 }), NAIR);
  const pfDots = inst(ballGeo, kit.mat(0xff4d8d, { roughness: 0.4 }), NPF);
  const air = [], pf = [];
  for (let i = 0; i < NAIR; i++) {
    const a = rand(i + 900) * 6.28, b = rand(i + 930) * 2 - 1;
    air.push({ x: kit.lerp(RX0, RX1, rand(i + 960)), y: kit.lerp(RY0, RY1, rand(i + 990)), z: kit.lerp(RZ0, RZ1, rand(i + 1020)), dx: Math.cos(a) * Math.sqrt(1 - b * b), dy: b, dz: Math.sin(a) * Math.sqrt(1 - b * b) });
  }
  for (let i = 0; i < NPF; i++) pf.push({ x: BX, y: BY + 0.22, z: 0, dx: 0, dy: 1, dz: 0, on: false, timer: 0, n: 0 });
  const kidTag = label('I can smell it!', anchor(RX1 - 0.4, BT + 1.05, 0), { cls: 'warm' });
  const bottleTag = label('Perfume', anchor(BX, BY + 0.34, 0));
  const rS = { open: false, t: 0, warm: false, smelled: false };
  function roomReset() {
    rS.open = false; rS.t = 0; rS.smelled = false; cap.visible = true;
    pf.forEach(p => { p.on = false; p.x = BX; p.y = BY + 0.22; p.z = 0; p.n = 0; p.timer = 0; });
  }
  const bounce = p => {
    if ((p.x < RX0 + 0.03 && p.dx < 0) || (p.x > RX1 - 0.03 && p.dx > 0)) p.dx = -p.dx;
    if ((p.y < RY0 && p.dy < 0) || (p.y > RY1 && p.dy > 0)) p.dy = -p.dy;
    if ((p.z < RZ0 && p.dz < 0) || (p.z > RZ1 && p.dz > 0)) p.dz = -p.dz;
  };
  function roomFrame(dt) {
    const sp = rS.warm ? 1.7 : 1.0;
    for (let i = 0; i < NAIR; i++) {
      const p = air[i];
      p.x += p.dx * sp * 0.6 * dt; p.y += p.dy * sp * 0.6 * dt; p.z += p.dz * sp * 0.6 * dt;
      bounce(p);
      setInst(airDots, i, p.x, p.y, p.z, 0.024);
    }
    if (rS.open) rS.t += dt;
    cap.visible = !rS.open;
    for (let i = 0; i < NPF; i++) {
      const p = pf[i];
      if (!p.on && rS.open && rS.t > (i / NPF) * 1.2) { p.on = true; p.timer = 0; }
      if (p.on) {
        // A random walk: every quarter second the particle bumps into air and heads off in a new direction.
        p.timer -= dt * sp;
        if (p.timer <= 0) {
          p.timer += 0.25; p.n++;
          const a = rand(i * 131 + p.n * 7.3) * 6.28, b = p.n === 1 ? 0.3 + 0.7 * rand(i + p.n) : rand(i * 17 + p.n * 3.1) * 2 - 1;
          p.dx = Math.cos(a) * Math.sqrt(1 - b * b); p.dy = b; p.dz = Math.sin(a) * Math.sqrt(1 - b * b);
        }
        p.x += p.dx * sp * dt; p.y += p.dy * sp * dt; p.z += p.dz * sp * dt;
        bounce(p);
        if (!rS.smelled && Math.hypot(p.x - NOSE[0], p.y - NOSE[1], p.z - NOSE[2]) < 0.32) rS.smelled = true;
      }
      setInst(pfDots, i, p.x, p.y, p.z, p.on ? 0.028 : 0);
    }
    airDots.instanceMatrix.needsUpdate = pfDots.instanceMatrix.needsUpdate = true;
    kidTag.show(st.step === 5 && !st.quiz && rS.smelled);
    if (st.step === 5 && !st.quiz) say(!rS.open ? 'The bottle is <b>closed</b>.' : rS.smelled ? `The smell has reached the child${rS.warm ? ' in the <b>warm</b> room' : ''}!` : 'The perfume particles are spreading out...');
    return true;
  }

  const tags = [zoomTag, cubeTag, dishTag, sweetTag, b1L, b1R, b2L, b2R, kidTag, bottleTag];
  const views = [
    zoomView(0),
    { radius: 0.75, yaw: 0.2, pitch: 0.25, target: [X.sugar, BT + 0.45, 0] },
    { radius: 0.95, yaw: 0.2, pitch: 0.3, target: [X.dish - 0.1, BT + 0.72, 0] },
    { radius: 0.95, yaw: 0.15, pitch: 0.18, target: [X.bal1, BT + 0.7, 0] },
    { radius: 0.95, yaw: -0.15, pitch: 0.18, target: [X.bal2, BT + 0.7, 0] },
    { radius: 1.45, yaw: 0.1, pitch: 0.3, target: [X.room, BT + 0.6, 0] },
  ];

  zoomFrame(); sugarFrame(0); dishFrame(0); bal1Frame(0); bal2Frame(0); roomFrame(0);

  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.said = '';
      for (const t of tags) t.show(false);
      zS.z = 0;
      if (i === 0) {
        zoomTag.show(true);
        zS.slider = ui.slider({ label: 'Zoom', min: 0, max: 100, step: 1, value: 0, format: v => `${v}%`, onInput: v => { st.plan = []; zS.z = v / 100; view(zoomView(zS.z)); } });
        st.plan = [[0.4, () => { zS.z = 1; zS.slider.set(100); view(zoomView(1)); }]];
      }
      if (i === 1) {
        cubeTag.show(true);
        sgS.t = -1; sgS.show = true;
        ui.buttons([{ label: 'Drop the sugar cube', onClick: () => { st.plan = []; if (sgS.t < 0 || sgS.t > 4.5) sgS.t = 0; } }]);
        ui.toggle({ label: 'Show sugar particles', value: true, onChange: v => { sgS.show = v; } });
        st.plan = [[0.2, () => { sgS.t = 0; }]];
      }
      if (i === 2) {
        dishTag.show(true);
        Object.assign(dS, { e: 0, sun: false, taste: -1 });
        const row = ui.buttons([{ label: 'Taste it', onClick: () => { st.plan = []; dS.taste = 0; } }, { label: 'Leave it in the sun', onClick: () => { st.plan = []; dS.sun = true; } }, { label: 'Start again', onClick: () => { st.plan = []; Object.assign(dS, { e: 0, sun: false, taste: -1 }); } }]);
        st.plan = [[0.1, () => { dS.taste = 0; row.select(0); }]];
      }
      if (i === 3) {
        b1L.show(true); b1R.show(true);
        s1.t = -1; s1.wobbled = false;
        const row = ui.buttons([{ label: 'Dissolve the sugar', onClick: () => { st.plan = []; dissolve1(); } }, { label: 'Start again', onClick: () => { st.plan = []; s1.t = -1; s1.wobbled = false; } }]);
        st.plan = [[0.3, () => { dissolve1(); row.select(0); }]];
      }
      if (i === 4) {
        b2L.show(true); b2R.show(true);
        Object.assign(s2, { a: 1, to: 1, form: 'cubes' });
        const row = ui.buttons([{ label: 'Melt it', onClick: () => { st.plan = []; melt(); } }, { label: 'Freeze it', onClick: () => { st.plan = []; freeze(); } }]);
        st.plan = [[0.3, () => { melt(); row.select(0); }]];
      }
      if (i === 5) {
        bottleTag.show(true);
        roomReset();
        rS.warm = false;
        const row = ui.buttons([{ label: 'Open the bottle', onClick: () => { st.plan = []; rS.open = true; } }, { label: 'Start again', onClick: () => { st.plan = []; roomReset(); } }]);
        ui.toggle({ label: 'Warm room', value: false, onChange: v => { rS.warm = v; } });
        st.plan = [[0.2, () => { rS.open = true; row.select(0); }]];
      }
      if (isQuiz) view({ radius: 2, width: 8.6, yaw: 0, pitch: 0.28, target: [1.0, BT + 0.75, 0] }, instant);
      else view(views[i], instant);
      zoomFrame(); sugarFrame(0); dishFrame(0); bal1Frame(0); bal2Frame(0); roomFrame(0);
    },
    update(dt) {
      st.time += dt;
      let busy = false;
      st.plan = st.plan.filter(([at, fn]) => { if (st.time < at) return true; busy = true; return fn(dt) === true; });
      busy = busy || st.plan.length > 0;
      const s = st.quiz ? 9 : st.step;
      if (s === 0) busy = zoomFrame() || busy;
      if (s === 1) busy = sugarFrame(dt) || busy;
      if (s === 2) busy = dishFrame(dt) || busy;
      if (s === 3) busy = bal1Frame(dt) || busy;
      if (s === 4) busy = bal2Frame(dt) || busy;
      if (s === 5 || s === 9) busy = roomFrame(dt) || busy;
      return busy;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
