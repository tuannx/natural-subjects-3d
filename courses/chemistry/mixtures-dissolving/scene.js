// Mix, dissolve, separate: a long lab bench with three stations.
// Left: a tray of pebbles, sand and iron filings, a bowl, a sieve and a magnet.
// Middle: glasses of water where sugar and salt dissolve, sand sinks and oil floats.
// Right: a filter funnel over a flask, and an evaporating dish on a heater.
const BT = 0.8;                                   // bench top
const A = { tray: -4.75, bowl: -3.55, dish: -4.45 };
const FX = 2.6, EX = 4.9;                         // filter and evaporating stations
const WTOP = 0.62;                                // water surface in a glass (local)
const NP = 140;                                   // dissolved-particle dots per glass
const NG = 40;                                    // grains per glass

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xd6e2d3, sky: 0xe8f3ff, radius: 16 });
  kit.lights(scene, { sun: [2, 10, 6] });

  // Bench and back wall.
  kit.mesh(new THREE.BoxGeometry(12.6, BT - 0.05, 1.7), kit.mat(0x6c8ead), [0.5, (BT - 0.05) / 2, 0], scene).castShadow = false;
  kit.mesh(new THREE.BoxGeometry(12.8, 0.05, 1.8), kit.mat(0xf4f6f8), [0.5, BT - 0.025, 0], scene);
  kit.mesh(new THREE.PlaneGeometry(12.8, 1.8), kit.mat(0xfdf3e1), [0.5, BT + 0.9, -0.9], scene).castShadow = false;

  const V = new THREE.Vector3(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(), M = new THREE.Matrix4();
  const glassMat = () => new THREE.MeshStandardMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const ceramic = kit.mat(0xffffff, { roughness: 0.4, side: THREE.DoubleSide });
  const icoGeo = new THREE.IcosahedronGeometry(1, 0);
  const anchor = (parent, x, y, z) => { const a = new THREE.Object3D(); a.position.set(x, y, z); parent.add(a); return a; };

  // ---------- Station A: pebbles, sand and iron filings ----------
  const stA = new THREE.Group();
  scene.add(stA);
  const tray = kit.mesh(new THREE.BoxGeometry(1.25, 0.03, 0.6), kit.mat(0xb08968), [A.tray, BT + 0.015, 0], stA);
  const bowl = kit.mesh(new THREE.SphereGeometry(0.32, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), kit.mat(0xf4a261, { side: THREE.DoubleSide }), [A.bowl, BT + 0.192, 0], stA);
  bowl.scale.y = 0.6;
  const sepGroup = new THREE.Group();
  stA.add(sepGroup);
  kit.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.012, 28), new THREE.MeshStandardMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.5, roughness: 0.1 }), [A.dish, BT + 0.006, 0], sepGroup);
  const dishRim = kit.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 28, 1, true), glassMat(), [A.dish, BT + 0.03, 0], sepGroup);
  dishRim.castShadow = false;
  const SY = BT + 0.85, SR = 0.28;
  const sieve = new THREE.Mesh(new THREE.SphereGeometry(SR, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6c757d, wireframe: true }));
  sieve.position.set(A.dish, SY, 0);
  sepGroup.add(sieve);
  const steel = kit.mat(0x9aa5b1, { metalness: 0.4, roughness: 0.4 });
  const sieveRim = kit.mesh(new THREE.TorusGeometry(SR, 0.015, 6, 32), steel, [A.dish, SY, 0], sepGroup);
  sieveRim.rotation.x = Math.PI / 2;
  // Stand behind the dish: a rod and an arm that holds the sieve rim.
  kit.mesh(new THREE.BoxGeometry(0.05, 0.025, 0.22), steel, [A.dish, SY, -0.37], sepGroup);
  kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), steel, [A.dish, BT + 0.425, -0.48], sepGroup);
  kit.mesh(new THREE.BoxGeometry(0.3, 0.03, 0.2), steel, [A.dish, BT + 0.015, -0.48], sepGroup);
  const magnet = new THREE.Group();
  const mm = kit.mat(0xd62828);
  const horse = kit.mesh(new THREE.TorusGeometry(0.09, 0.035, 8, 16, Math.PI), mm, [0, 0.1, 0], magnet);
  horse.rotation.z = 0;
  for (const sx of [-1, 1]) {
    kit.mesh(new THREE.BoxGeometry(0.07, 0.1, 0.07), mm, [sx * 0.09, 0.05, 0], magnet);
    kit.mesh(new THREE.BoxGeometry(0.072, 0.04, 0.072), kit.mat(0xdee2e6, { metalness: 0.6, roughness: 0.3 }), [sx * 0.09, -0.02, 0], magnet);
  }
  const MREST = [A.dish - 0.85, BT + 0.06, 0.15];
  magnet.position.set(...MREST);
  sepGroup.add(magnet);

  // Grains: one instanced mesh, each grain moves toward a target that depends on the phase.
  const KIND = [], SIZE = [], ROT = [], DLY = [];
  const counts = [20, 110, 70]; // pebbles, sand, iron
  for (let k = 0; k < 3; k++) for (let n = 0; n < counts[k]; n++) KIND.push(k);
  const NA = KIND.length;
  const grains = new THREE.InstancedMesh(icoGeo, kit.mat(0xffffff, { roughness: 0.9, flatShading: true }), NA);
  grains.frustumCulled = false;
  stA.add(grains);
  const P = { pile: new Float32Array(NA * 3), bowl: new Float32Array(NA * 3), sieve: new Float32Array(NA * 3), dish: new Float32Array(NA * 3), mag: new Float32Array(NA * 3) };
  const cur = new Float32Array(NA * 3);
  const col = new THREE.Color();
  const bowlY = r => BT + 0.192 * (1 - Math.sqrt(Math.max(0, 1 - (r / 0.32) ** 2)));
  for (let i = 0; i < NA; i++) {
    const k = KIND[i], u = rand(i), v = rand(i + 1000), a = rand(i + 2000) * Math.PI * 2, w = rand(i + 3000);
    const s = k === 0 ? 0.05 + 0.03 * w : k === 1 ? 0.026 : 0.02;
    SIZE.push(s);
    ROT.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(u * 6, v * 6, w * 6)));
    DLY.push(rand(i + 4000) * 0.6);
    const ca = Math.cos(a), sa = Math.sin(a);
    const set = (arr, x, y, z) => { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; };
    let r = 0.18 * Math.sqrt(u);
    set(P.pile, A.tray + (k - 1) * 0.42 + r * ca, BT + 0.03 + s * 0.8 + (0.18 - r) * 0.7 * v, r * sa);
    r = 0.22 * Math.sqrt(u);
    set(P.bowl, A.bowl + r * ca, bowlY(r) + s * 0.8 + (0.22 - r) * 0.4 * v, r * sa);
    r = 0.17 * Math.sqrt(u);
    set(P.sieve, A.dish + r * ca, SY - Math.sqrt(SR * SR - r * r) + s * 0.9 + 0.03 * v, r * sa);
    r = 0.25 * Math.sqrt(u);
    set(P.dish, A.dish + r * ca, BT + 0.012 + s * 0.8 + (0.25 - r) * 0.15 * v, r * sa);
    set(P.mag, (w < 0.5 ? -0.09 : 0.09) + (u - 0.5) * 0.08, -0.06 - v * 0.07, (rand(i + 5000) - 0.5) * 0.08);
    col.set(k === 0 ? [0x8d8f94, 0xa47551, 0x6c6f75, 0xc2a385][i % 4] : k === 1 ? (v < 0.5 ? 0xe9c46a : 0xd4a95a) : 0x2b2d33);
    grains.setColorAt(i, col);
  }
  const ga = { phase: 'piles', t: 0, mt: -1 };
  function grainTarget(i, out) {
    const k = KIND[i], t = ga.t, d = DLY[i], pick = (arr) => out.set(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]);
    if (ga.phase === 'piles') return pick(P.pile);
    if (ga.phase === 'mixed') return pick(t > d ? P.bowl : P.pile);
    // sieve and magnet phases
    if (ga.phase === 'sieve' && t < d) return pick(P.bowl);
    if (k === 0) return pick(P.sieve);
    if (ga.phase === 'sieve' && t < d + 0.45) return pick(P.sieve);
    if (k === 2 && ga.mt > 0.35 + d * 0.5) {
      out.set(P.mag[i * 3], P.mag[i * 3 + 1], P.mag[i * 3 + 2]).add(magnet.position);
      return out;
    }
    return pick(P.dish);
  }
  function placeGrains(dt, instant) {
    let moving = false;
    for (let i = 0; i < NA; i++) {
      grainTarget(i, V);
      const j = i * 3;
      if (instant) { cur[j] = V.x; cur[j + 1] = V.y; cur[j + 2] = V.z; }
      else {
        const f = Math.min(1, dt * 7);
        const dx = V.x - cur[j], dy = V.y - cur[j + 1], dz = V.z - cur[j + 2];
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 1e-3) moving = true;
        cur[j] += dx * f; cur[j + 1] += dy * f; cur[j + 2] += dz * f;
      }
      const s = SIZE[i];
      S3.set(s, KIND[i] === 2 ? s * 2 : s * 0.8, s);
      M.compose(V.set(cur[j], cur[j + 1], cur[j + 2]), ROT[i], S3);
      grains.setMatrixAt(i, M);
    }
    grains.instanceMatrix.needsUpdate = true;
    return moving;
  }
  const tagPebbles = label('Pebbles', anchor(stA, A.tray - 0.42, BT + 0.25, 0));
  const tagSand = label('Sand', anchor(stA, A.tray, BT + 0.42, 0));
  const tagIron = label('Iron filings', anchor(stA, A.tray + 0.42, BT + 0.25, 0));
  const tagMix = label('Mixture', anchor(stA, A.bowl, BT + 0.4, 0), { cls: 'warm' });
  const tagSievePeb = label('Pebbles', anchor(stA, A.dish - 0.1, SY + 0.12, 0));
  const tagDishSand = label('Sand', anchor(stA, A.dish + 0.15, BT + 0.08, 0.25));
  const tagMagIron = label('Iron filings', anchor(magnet, 0, 0.3, 0));

  // ---------- Glasses ----------
  const glasses = [0, 1, 2, 3].map(gi => {
    const g = new THREE.Group();
    scene.add(g);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.82, 28, 1, true), glassMat());
    shell.position.y = 0.41; shell.renderOrder = 3; g.add(shell);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 28), glassMat());
    base.position.y = 0.01; g.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.006, 4, 32), new THREE.MeshBasicMaterial({ color: 0xa9cfe6 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.82; g.add(rim);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x6cbcf5, transparent: true, opacity: 0.32, roughness: 0.1, depthWrite: false });
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, WTOP - 0.02, 28), wMat);
    water.position.y = (WTOP + 0.02) / 2; water.renderOrder = 1; g.add(water);
    const gMat = kit.mat(0xffffff, { roughness: 0.5, flatShading: true });
    const inst = new THREE.InstancedMesh(icoGeo, gMat, NG);
    inst.frustumCulled = false; g.add(inst);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
    const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.024, transparent: true, opacity: 0.95, depthWrite: false }));
    pts.renderOrder = 2; pts.frustumCulled = false; g.add(pts);
    const cube = kit.mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), kit.mat(0xffffff, { roughness: 0.8 }), [0, 0, 0], g);
    const oil = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.05, 28), new THREE.MeshStandardMaterial({ color: 0xf4c430, transparent: true, opacity: 0.85, roughness: 0.1 }));
    oil.position.y = WTOP + 0.025; g.add(oil);
    const spoon = new THREE.Group();
    const sh = kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 6), steel, [0, 0.42, 0], spoon);
    sh.castShadow = false;
    kit.mesh(new THREE.SphereGeometry(0.04, 10, 6), steel, [0, 0.02, 0], spoon).scale.set(1, 0.4, 1.4);
    const spoonArm = new THREE.Group();
    spoonArm.add(spoon); spoon.position.set(0.16, 0.06, 0); spoon.rotation.z = 0.18;
    g.add(spoonArm);
    const steam = [0, 1, 2].map(j => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      g.add(m); return m;
    });
    // Dissolved-particle homes (polar, so stirring can swirl them).
    const home = new Float32Array(NP * 3), prog = new Float32Array(NP);
    for (let j = 0; j < NP; j++) {
      home[j * 3] = 0.26 * Math.sqrt(rand(j + 7000 + gi * 300));
      home[j * 3 + 1] = rand(j + 8000 + gi * 300) * Math.PI * 2;
      home[j * 3 + 2] = 0.05 + rand(j + 9000 + gi * 300) * (WTOP - 0.09);
    }
    const tag = label('', anchor(g, 0, 1.0, 0));
    tag.show(false);
    return { g, inst, gMat, pts, pGeo, home, prog, cube, oil, spoon, spoonArm, steam, wMat, tag,
      type: 'sugar', mode: 'grains', t: -1, r: 1, temp: 0, stir: false, swirl: 0, dots: true, done: false };
  });

  const TYPES = {
    sugar: { color: 0xffffff, size: 0.024, dissolve: true },
    salt: { color: 0xf1f3f5, size: 0.019, dissolve: true },
    sand: { color: 0xd9b26f, size: 0.022, dissolve: false },
    oil: { color: 0xf4c430, size: 0.045, dissolve: false },
  };
  const g6 = 6, y0 = 1.05, tw = Math.sqrt((2 * (y0 - WTOP)) / g6);

  function resetGlass(G, type, mode) {
    G.type = type; G.mode = mode; G.t = -1; G.r = 1; G.prog.fill(0); G.done = false;
    G.gMat.color.set(TYPES[type].color);
    G.pts.material.color.set(type === 'salt' ? 0xffffff : 0xffffff);
    G.inst.visible = mode === 'grains'; G.cube.visible = false; G.oil.visible = false;
    G.oil.scale.set(1, 0.001, 1);
    G.spoonArm.visible = false; G.temp = 0; G.stir = false;
    G.pGeo.setDrawRange(0, 0);
    G.steam.forEach(s => { s.visible = false; });
    drawGlass(G, 0);
  }

  // Draw a glass at its own time G.t. Returns true while it is still changing.
  function drawGlass(G, dt) {
    const T = TYPES[G.type], t = G.t;
    let changing = false, dissolved = 0;
    if (G.mode === 'grains') {
      for (let i = 0; i < NG; i++) {
        const tt = t - 0.035 * i, u = rand(i + 11), v = rand(i + 23), a = rand(i + 37) * Math.PI * 2;
        const hr = 0.17 * Math.sqrt(u), hx = hr * Math.cos(a), hz = hr * Math.sin(a);
        const x0 = (u - 0.5) * 0.08, z0 = (v - 0.5) * 0.08, s = T.size;
        const bottom = 0.02 + s * 0.8 + (0.17 - hr) * 0.25 * v;
        let x = x0, y = y0, z = z0, sc = s;
        if (tt < 0) sc = 0;
        else if (tt < tw) { y = y0 - 0.5 * g6 * tt * tt; changing = true; }
        else if (G.type === 'oil') {
          const k = Math.min(1, (tt - tw) / 0.6);
          y = WTOP - 0.1 * Math.sin(Math.PI * k) + 0.01;
          const m = kit.clamp((tt - tw - 0.6) / 0.6, 0, 1);
          sc = s * (1 - m); x = x0 + (hx - x0) * k; z = z0 + (hz - z0) * k;
          if (m < 1) changing = true;
          dissolved += m;
        } else {
          const sink = Math.min(1, (tt - tw) * 0.45 / (WTOP - bottom));
          y = WTOP - (WTOP - bottom) * sink; x = x0 + (hx - x0) * sink; z = z0 + (hz - z0) * sink;
          const tl = tw + (WTOP - bottom) / 0.45;
          if (T.dissolve) {
            const m = kit.clamp((tt - tl - 0.1) * 0.9, 0, 1);
            sc = s * (1 - m); dissolved += m;
            if (m < 1) changing = true;
          } else if (sink < 1) changing = true;
        }
        S3.set(sc, sc, sc);
        M.compose(V.set(x, y, z), ROT[i], S3);
        G.inst.setMatrixAt(i, M);
      }
      G.inst.instanceMatrix.needsUpdate = true;
      dissolved /= NG;
      if (G.type === 'oil') {
        G.oil.visible = dissolved > 0.01;
        G.oil.scale.y = Math.max(0.001, dissolved);
      }
    } else {
      // A sugar cube: falls, lands, then shrinks at a rate set by temperature and stirring.
      const tt = t, size = 0.13;
      G.cube.visible = t >= 0 && G.r > 0.002;
      if (t >= 0) {
        let y = y0 - 0.5 * g6 * tt * tt;
        const bottomY = 0.02 + (size * Math.cbrt(G.r)) / 2;
        if (y > bottomY) changing = true;
        else {
          y = bottomY;
          if (G.r > 0) { G.r = Math.max(0, G.r - dt * rateOf(G)); changing = true; }
        }
        const sc = Math.cbrt(G.r);
        G.cube.scale.set(sc, sc, sc);
        G.cube.position.set(0, Math.max(y, 0.02 + (size * sc) / 2), 0);
      }
      dissolved = 1 - G.r;
    }
    // Dots for dissolved particles spread out from the bottom middle.
    const showDots = G.dots && TYPES[G.type].dissolve;
    G.pts.visible = showDots;
    if (showDots) {
      const pos = G.pGeo.attributes.position.array, n = Math.round(dissolved * NP);
      let drawn = 0;
      for (let j = 0; j < NP; j++) {
        const want = j < n ? 1 : 0;
        if (G.prog[j] !== want) {
          G.prog[j] = want ? Math.min(1, G.prog[j] + dt * 0.8) : 0;
          changing = true;
        }
        if (G.prog[j] > 0) drawn = j + 1;
        const e = kit.ease(G.prog[j]);
        const rr = G.home[j * 3] * e, ang = G.home[j * 3 + 1] + G.swirl * (0.6 + G.home[j * 3]), yy = 0.04 + (G.home[j * 3 + 2] - 0.04) * e;
        pos[j * 3] = rr * Math.cos(ang); pos[j * 3 + 1] = yy; pos[j * 3 + 2] = rr * Math.sin(ang);
      }
      G.pGeo.attributes.position.needsUpdate = true;
      G.pGeo.setDrawRange(0, drawn);
    }
    G.dissolved = dissolved;
    return changing;
  }
  const rateOf = G => 0.05 * (1 + 3 * G.temp) * (G.stir ? 2.5 : 1);

  // ---------- Filter station ----------
  const stF = new THREE.Group();
  scene.add(stF);
  const flaskBody = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.32, 0.5, 28, 1, true), glassMat());
  flaskBody.position.set(FX, BT + 0.27, 0); flaskBody.renderOrder = 3; stF.add(flaskBody);
  const flaskNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 20, 1, true), glassMat());
  flaskNeck.position.set(FX, BT + 0.63, 0); flaskNeck.renderOrder = 3; stF.add(flaskNeck);
  const flaskBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 28), glassMat());
  flaskBase.position.set(FX, BT + 0.01, 0); stF.add(flaskBase);
  const clearMat = new THREE.MeshStandardMaterial({ color: 0x6cbcf5, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false });
  const flaskGeo = new THREE.CylinderGeometry(0.22, 0.3, 1, 28);
  flaskGeo.translate(0, 0.5, 0);
  const flaskWater = new THREE.Mesh(flaskGeo, clearMat);
  flaskWater.position.set(FX, BT + 0.02, 0); flaskWater.renderOrder = 2; stF.add(flaskWater);
  // Funnel (cone pointing down) with filter paper inside.
  const coneAtTip = (r, h, mat) => {
    const geo = new THREE.ConeGeometry(r, h, 28, 1, true);
    geo.rotateX(Math.PI); geo.translate(0, h / 2, 0);
    return new THREE.Mesh(geo, mat);
  };
  const TIP = BT + 0.8;
  const funnel = coneAtTip(0.32, 0.36, glassMat());
  funnel.position.set(FX, TIP, 0); funnel.renderOrder = 4; stF.add(funnel);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.2, 10, 1, true), glassMat());
  stem.position.set(FX, TIP - 0.1, 0); stF.add(stem);
  const paper = coneAtTip(0.28, 0.32, kit.mat(0xffffff, { side: THREE.DoubleSide, roughness: 1, transparent: true, opacity: 0.92 }));
  paper.position.set(FX, TIP + 0.03, 0); paper.castShadow = false; stF.add(paper);
  const muddy = new THREE.MeshStandardMaterial({ color: 0x9c7a4f, transparent: true, opacity: 0.85, roughness: 0.3 });
  const funnelLiquid = coneAtTip(0.27, 0.3, muddy);
  funnelLiquid.position.set(FX, TIP + 0.035, 0); stF.add(funnelLiquid);
  const sandCone = coneAtTip(0.27, 0.3, kit.mat(0xc9a66b, { roughness: 1, side: THREE.DoubleSide }));
  sandCone.position.set(FX, TIP + 0.04, 0); stF.add(sandCone);
  const drips = [0, 1, 2].map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), clearMat); stF.add(d); return d; });
  // Beaker of muddy water that tips to pour.
  const beaker = new THREE.Group();
  stF.add(beaker);
  const bShell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 24, 1, true), glassMat());
  bShell.position.y = 0.2; bShell.renderOrder = 3; beaker.add(bShell);
  beaker.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.015, 24), glassMat()));
  const bGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 24);
  bGeo.translate(0, 0.5, 0);
  const beakerLiquid = new THREE.Mesh(bGeo, muddy);
  beakerLiquid.position.y = 0.01; beakerLiquid.renderOrder = 2; beaker.add(beakerLiquid);
  const lip = anchor(beaker, -0.16, 0.4, 0);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1, 8), muddy);
  stF.add(stream);
  const REST = new THREE.Vector3(FX + 0.75, BT, 0);
  const TILT = 1.75, lipTarget = new THREE.Vector3(FX + 0.05, TIP + 0.55, 0);
  const POUR = new THREE.Vector3(lipTarget.x - (-0.16 * Math.cos(TILT) - 0.4 * Math.sin(TILT)), lipTarget.y - (-0.16 * Math.sin(TILT) + 0.4 * Math.cos(TILT)), 0);
  const tagMuddy = label('Muddy water', anchor(beaker, 0, 0.55, 0));
  const tagPaper = label('Filter paper', anchor(stF, FX - 0.32, TIP + 0.3, 0));
  const tagClean = label('Clean water', anchor(stF, FX, BT + 0.25, 0.3), { cls: 'cool' });

  // ---------- Evaporating station ----------
  const stE = new THREE.Group();
  scene.add(stE);
  kit.mesh(new THREE.BoxGeometry(0.75, 0.1, 0.7), kit.mat(0x2b2d42), [EX, BT + 0.05, 0], stE);
  const hotMat = kit.mat(0x555b6e, { emissive: 0xff3b1f, emissiveIntensity: 0 });
  const hotRing = kit.mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 32), hotMat, [EX, BT + 0.105, 0], stE);
  hotRing.rotation.x = -Math.PI / 2;
  const R = 0.36, CAP = 0.95, DB = BT + 0.1;              // dish sphere radius, cap angle, dish bottom
  const dish = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 8, 0, Math.PI * 2, Math.PI - CAP, CAP), ceramic);
  dish.position.set(EX, DB + R, 0); dish.castShadow = true; stE.add(dish);
  const DEPTH = 0.1;
  const saltWater = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.004, 32), new THREE.MeshStandardMaterial({ color: 0x8fd0f7, transparent: true, opacity: 0.75, roughness: 0.05 }));
  stE.add(saltWater);
  const NC = 70;
  const crystals = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), kit.mat(0xffffff, { roughness: 0.4 }), NC);
  crystals.frustumCulled = false; stE.add(crystals);
  const cPos = [];
  for (let i = 0; i < NC; i++) {
    const r = 0.21 * Math.sqrt(rand(i + 600)), a = rand(i + 700) * Math.PI * 2;
    cPos.push([EX + r * Math.cos(a), DB + R - Math.sqrt(R * R - r * r) + 0.008, r * Math.sin(a), 0.012 + rand(i + 800) * 0.014]);
  }
  const vapour = [0, 1, 2, 3, 4].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); stE.add(m); return m; });
  const tagSaltWater = label('Salt water', anchor(stE, EX - 0.3, DB + 0.16, 0.2), { cls: 'cool' });
  const tagVapour = label('Water vapour', anchor(stE, EX + 0.15, BT + 0.95, 0));
  const tagSalt = label('Salt crystals', anchor(stE, EX - 0.3, DB + 0.16, 0.2));

  const allTags = [tagPebbles, tagSand, tagIron, tagMix, tagSievePeb, tagDishSand, tagMagIron, tagMuddy, tagPaper, tagClean, tagSaltWater, tagVapour, tagSalt];
  const st = { step: 0, quiz: false, t: 0, plan: [], pour: -1, evap: 0, heat: false, heatT: 0, msg: '', toggle: null };

  function hideAll() {
    allTags.forEach(l => l.show(false));
    glasses.forEach(G => { G.g.visible = false; G.tag.show(false); });
  }
  function setGlasses(list) {
    list.forEach(([gi, x, type, mode], k) => {
      const G = glasses[gi];
      G.g.visible = true; G.g.position.set(x, BT, 0);
      resetGlass(G, type, mode);
      G.tag.at.position.y = list.length > 2 && k % 2 ? 1.22 : 1.0;
    });
  }
  const tName = { sugar: 'Sugar', salt: 'Salt', sand: 'Sand', oil: 'Oil' };
  const tDone = { sugar: 'Sugar dissolves', salt: 'Salt dissolves', sand: 'Sand sinks', oil: 'Oil floats' };

  function pourAt(p) {
    // Pour timeline (s): tip 0–0.6, stream 0.6–3.6, back 3.7–4.3; the filter drains until about 5.
    const tilt = p < 0 ? 0 : p < 0.6 ? kit.ease(p / 0.6) : p < 3.7 ? 1 : p < 4.3 ? 1 - kit.ease((p - 3.7) / 0.6) : 0;
    beaker.position.lerpVectors(REST, POUR, tilt);
    beaker.rotation.z = TILT * tilt;
    const flow = p > 0.6 && p < 3.6;
    const out = kit.clamp((p - 0.6) / 3, 0, 1);
    beakerLiquid.scale.y = Math.max(0.001, 0.3 * (1 - 0.9 * out));
    beakerLiquid.visible = tilt < 0.5 || out < 0.95;
    stream.visible = flow;
    if (flow) {
      lip.getWorldPosition(V);
      const top = V.y, bot = TIP + 0.2;
      stream.position.set(V.x, (top + bot) / 2, V.z);
      stream.scale.y = Math.max(0.01, top - bot);
    }
    const inF = kit.clamp((p - 0.6) / 0.6, 0, 1) * (1 - kit.clamp((p - 3.6) / 1.4, 0, 1));
    funnelLiquid.visible = inF > 0.01;
    funnelLiquid.scale.setScalar(Math.max(0.01, 0.85 * inF));
    const sand = kit.clamp((p - 0.8) / 3, 0, 1);
    sandCone.visible = sand > 0.01;
    sandCone.scale.setScalar(Math.max(0.01, 0.38 * sand));
    const fl = kit.clamp((p - 0.9) / 4.1, 0, 1);
    flaskWater.scale.y = Math.max(0.001, 0.2 * fl);
    const dripping = p > 0.9 && p < 5;
    drips.forEach((d, i) => {
      d.visible = dripping;
      const k = (p * 2.2 + i / 3) % 1;
      d.position.set(FX, TIP - 0.2 - k * (TIP - 0.2 - (BT + 0.02 + 0.2 * fl)), 0);
    });
    tagClean.show(st.step === 5 && fl > 0.25);
  }

  function evapAt(dt, t) {
    const lv = 1 - st.evap, h = Math.max(0.001, DEPTH * lv);
    const r = Math.sqrt(R * R - (R - h) ** 2);
    saltWater.visible = lv > 0.01;
    saltWater.position.set(EX, DB + h, 0);
    saltWater.scale.set(r, 1, r);
    hotMat.emissiveIntensity = st.heatT * 1.5;
    for (let i = 0; i < NC; i++) {
      const [x, y, z, s] = cPos[i];
      const k = kit.clamp((st.evap - 0.35 - (i / NC) * 0.5) * 4, 0, 1) * s;
      S3.set(k, k, k);
      Q.copy(ROT[i]);
      M.compose(V.set(x, y + k / 2, z), Q, S3);
      crystals.setMatrixAt(i, M);
    }
    crystals.instanceMatrix.needsUpdate = true;
    const on = st.heatT > 0.3 && lv > 0.02;
    vapour.forEach((m, i) => {
      const k = (t * 0.5 + i / 5) % 1;
      m.visible = on;
      m.position.set(EX + Math.sin(i * 1.7 + t) * 0.08, DB + 0.1 + k * 0.7, Math.cos(i * 2.3) * 0.06);
      m.scale.setScalar(0.6 + k * 1.2);
      m.material.opacity = (1 - k) * 0.35 * st.heatT;
    });
    const here = st.step === 6;
    tagSaltWater.show(here && lv > 0.5);
    tagSalt.show(here && lv <= 0.5);
    tagVapour.show(here && on);
  }

  const glassesView = { radius: 1.55, yaw: 0, pitch: 0.3, target: [0, BT + 0.5, 0] };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.t = 0; st.plan = []; st.msg = ''; st.toggle = null;
      hideAll();
      tray.visible = i === 0 && !isQuiz; sepGroup.visible = i === 4;
      grains.visible = i === 0 || i === 4;
      magnet.position.set(...MREST); ga.mt = -1;
      st.pour = -1; pourAt(-1);
      st.heat = false; st.heatT = 0; st.evap = 0; evapAt(0, 0);
      if (isQuiz) {
        setGlasses([[0, -1.2, 'sugar', 'grains'], [1, -0.4, 'salt', 'grains'], [2, 0.4, 'sand', 'grains'], [3, 1.2, 'oil', 'grains']]);
        glasses.forEach(G => { G.dots = false; G.t = 20; drawGlass(G, 0); });
        view({ ...glassesView, yaw: 0.08, pitch: 0.36 });
        return;
      }
      if (i === 0) {
        ga.phase = 'piles'; ga.t = 0; placeGrains(0, true);
        [tagPebbles, tagSand, tagIron].forEach(l => l.show(true));
        view({ radius: 0.95, yaw: 0.1, pitch: 0.48, target: [-4.2, BT + 0.12, 0] });
        const mix = () => { ga.phase = 'mixed'; ga.t = 0; };
        ui.buttons([{ label: 'Mix', onClick: () => { st.plan = []; mix(); } }, { label: 'Start again', onClick: () => { st.plan = []; ga.phase = 'piles'; ga.t = 0; } }]);
        st.plan = [[1.4, mix]];
      }
      if (i === 1) {
        setGlasses([[0, 0, 'sugar', 'grains']]);
        glasses[0].dots = true;
        glasses[0].tag.text = 'Sugar'; glasses[0].tag.show(true);
        view({ radius: 0.75, yaw: 0.15, pitch: 0.2, target: [0, BT + 0.5, 0] });
        const add = () => { resetGlass(glasses[0], 'sugar', 'grains'); glasses[0].t = 0; };
        ui.buttons([{ label: 'Add sugar', onClick: () => { st.plan = []; add(); } }]);
        ui.toggle({ label: 'Show tiny particles', value: true, onChange: v => { glasses[0].dots = v; drawGlass(glasses[0], 0); } });
        st.plan = [[0.3, add]];
      }
      if (i === 2) {
        setGlasses([[0, -1.2, 'sugar', 'grains'], [1, -0.4, 'salt', 'grains'], [2, 0.4, 'sand', 'grains'], [3, 1.2, 'oil', 'grains']]);
        glasses.forEach(G => { G.dots = false; G.tag.text = tName[G.type]; G.tag.show(true); });
        view({ ...glassesView, yaw: 0.12 });
        const add = () => glasses.forEach(G => { resetGlass(G, G.type, 'grains'); G.t = 0; G.tag.text = tName[G.type]; });
        ui.buttons([{ label: 'Add to all glasses', onClick: () => { st.plan = []; add(); } }]);
        st.plan = [[0.3, add]];
      }
      if (i === 3) {
        setGlasses([[0, -0.45, 'sugar', 'cube'], [1, 0.45, 'sugar', 'cube']]);
        const [L, Rg] = glasses;
        L.dots = Rg.dots = true;
        Rg.temp = 0.85; Rg.stir = true; Rg.spoonArm.visible = true;
        L.tag.text = 'Cold, not stirred'; L.tag.show(true); Rg.tag.show(true);
        const name = () => { Rg.tag.text = `${Rg.temp < 0.25 ? 'Cold' : Rg.temp < 0.6 ? 'Warm' : 'Hot'}, ${Rg.stir ? 'stirred' : 'not stirred'}`; };
        name();
        view({ radius: 1.05, yaw: 0, pitch: 0.28, target: [0, BT + 0.5, 0] });
        ui.slider({ label: 'Water temperature (your glass)', min: 0, max: 100, step: 1, value: 85, format: v => (v < 25 ? 'Cold' : v < 60 ? 'Warm' : 'Hot'), onInput: v => { Rg.temp = v / 100; name(); } });
        ui.toggle({ label: 'Stir', value: true, onChange: v => { Rg.stir = v; Rg.spoonArm.visible = v; name(); } });
        const drop = () => [L, Rg].forEach(G => { const temp = G.temp, stir = G.stir; resetGlass(G, 'sugar', 'cube'); G.temp = temp; G.stir = stir; G.spoonArm.visible = stir; G.t = 0; });
        ui.buttons([{ label: 'Drop sugar cubes', onClick: () => { st.plan = []; drop(); } }]);
        st.plan = [[0.4, drop]];
      }
      if (i === 4) {
        ga.phase = 'mixed'; ga.t = 99; placeGrains(0, true);
        tagMix.show(false);
        view({ radius: 1.2, yaw: 0.15, pitch: 0.3, target: [-4.6, BT + 0.5, 0] });
        const sift = () => { ga.phase = 'sieve'; ga.t = 0; ga.mt = -1; magnet.position.set(...MREST); };
        const pull = () => { if (ga.phase !== 'sieve' || ga.t < 1.2) { ga.phase = 'sieve'; ga.t = 9; } ga.mt = 0; };
        ui.buttons([{ label: 'Use the sieve', onClick: () => { st.plan = []; sift(); } }, { label: 'Use the magnet', onClick: () => { st.plan = []; pull(); } }]);
        st.plan = [[0.3, sift], [1.6, pull]];
      }
      if (i === 5) {
        tagMuddy.show(true); tagPaper.show(true);
        view({ radius: 1.05, yaw: 0.2, pitch: 0.18, target: [FX + 0.3, BT + 0.65, 0] });
        ui.buttons([{ label: 'Pour', onClick: () => { st.plan = []; st.pour = 0; } }]);
        st.plan = [[0.3, () => { st.pour = 0; }]];
      }
      if (i === 6) {
        view({ radius: 0.75, yaw: 0.1, pitch: 0.42, target: [EX, BT + 0.35, 0] });
        st.toggle = ui.toggle({ label: 'Heat on', value: false, onChange: v => { st.plan = []; st.heat = v; if (v && st.evap >= 1) st.evap = 0; } });
        st.plan = [[0.3, () => { st.heat = true; if (st.toggle) st.toggle.checked = true; }]];
        evapAt(0, 0);
      }
    },

    update(dt, t) {
      st.t += dt;
      let busy = st.plan.length > 0;
      while (st.plan.length && st.t >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step;

      if (s === 0 || s === 4) {
        ga.t += dt;
        if (ga.mt >= 0) {
          ga.mt += dt;
          // Slide in over the dish, hold while the iron jumps up, then lift away to the left.
          const m = ga.mt, inn = kit.ease(kit.clamp(m / 0.6, 0, 1)), away = kit.ease(kit.clamp((m - 1.4) / 0.7, 0, 1));
          magnet.position.set(kit.lerp(MREST[0], A.dish, inn - away), BT + 0.06 + 0.11 * inn + 0.23 * away, kit.lerp(MREST[2], 0, inn - away));
          if (m < 2.2) busy = true;
        }
        busy = placeGrains(dt, false) || busy;
        if (s === 0) { const mixed = ga.phase === 'mixed' && ga.t > 0.9; tagMix.show(mixed); [tagPebbles, tagSand, tagIron].forEach(l => l.show(!mixed)); }
        if (s === 4) {
          tagSievePeb.show(ga.phase === 'sieve' && ga.t > 1.0);
          tagMagIron.show(ga.mt > 0.8);
          tagDishSand.show(ga.mt > 2.0);
        }
      }

      if (s === 1 || s === 2 || s === 3) {
        for (const G of glasses) {
          if (!G.g.visible || G.t < 0) continue;
          G.t += dt;
          if (G.stir) { G.swirl += dt * 3; G.spoonArm.rotation.y = -G.swirl; }
          const ch = drawGlass(G, dt);
          busy = busy || ch || G.stir;
          G.steam.forEach((m, j) => {
            m.visible = G.temp > 0.3;
            const k = (t * 0.4 + j / 3) % 1;
            m.position.set(Math.sin(j * 2.1 + t) * 0.1, 0.85 + k * 0.45, 0);
            m.scale.setScalar(0.7 + k);
            m.material.opacity = (1 - k) * 0.3 * G.temp;
          });
          if (G.temp > 0.3) busy = true;
          if (s === 1 && G.dissolved > 0.97) G.tag.text = 'Sugar solution';
          if (s === 2 && !G.done && (TYPES[G.type].dissolve ? G.dissolved > 0.9 : G.t > 2.6)) { G.done = true; G.tag.text = tDone[G.type]; }
        }
        if (s === 3) {
          const [L, Rg] = glasses, pct = G => Math.round((1 - G.r) * 100);
          const msg = `Cold glass: <b>${pct(L)}%</b> dissolved. Your glass: <b>${pct(Rg)}%</b> dissolved.`;
          if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
        }
      }

      if (s === 5 && st.pour >= 0) {
        st.pour += dt;
        pourAt(st.pour);
        if (st.pour < 5.2) busy = true;
      }

      if (s === 6) {
        busy = kit.follow(st, 'heatT', st.heat ? 1 : 0, dt, 3) || busy;
        if (st.heat && st.evap < 1) st.evap = Math.min(1, st.evap + dt / 3.5);
        if (st.heatT > 0.01 && st.evap < 1) busy = true;
        evapAt(dt, t);
        const msg = st.evap >= 1 ? 'All the water has evaporated. Only the <b>salt</b> is left.' : st.heat ? 'The water is <b>evaporating</b>. (Sped up: really it takes much longer.)' : 'Salt water: you cannot see the salt, but it is there.';
        if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
      }
      return busy;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
