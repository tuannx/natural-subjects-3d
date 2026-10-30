// Where does heat go: a kitchen counter with four stations. Orange dots show heat moving from warmer
// things to colder things. Temperatures follow simple cooling curves toward room temperature (20 °C).
const ROOM = 20;
const HOT = 70;                  // hot cocoa / hot water at the start
const ICE_DROP = 14;             // one ice cube (about 25 g) in a mug (about 250 ml) of 70 °C cocoa ends near 56 °C
const TAU = { cocoa: 20, juice: 15, bare: 20, wool: 45 };   // cooling time scales of the model, in minutes
const MELT = { bare: 45, wool: 110 };                       // minutes for the model ice cubes to melt
const A = [-5.0, 0, 0.3], B = [-0.8, 0, 0], C = [3.0, 0, 0], D = [7.25, 0, 0.2];   // station centres

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const floor = kit.stage(scene, { ground: 0xd9c7ae, sky: 0xfbefe0, radius: 20 });
  floor.position.y = -2.5;
  kit.lights(scene, { sun: [2, 11, 7] });

  // Kitchen counter: cabinet body and a wooden top whose surface is at y = 0.
  const counter = kit.mesh(new THREE.BoxGeometry(18, 2.4, 4.4), kit.mat(0xf4ece0), [1.2, -1.3, 0], scene);
  counter.castShadow = false;
  const top = kit.mesh(new THREE.BoxGeometry(18.4, 0.12, 4.7), kit.mat(0xffffff, { map: paint(THREE, 256, 64, grain) }), [1.2, -0.06, 0], scene);
  top.castShadow = false;

  const glassMat = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.85, roughness: 0.15 });
  const red = new THREE.MeshBasicMaterial({ color: 0xe02d2d });
  const tickTex = paint(THREE, 64, 512, ticks);
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false });

  // ---- Thermometer: red column whose height follows the temperature (−10 °C to 100 °C).
  function thermometer(pos, name, h = 1.5, cls = '') {
    const g = new THREE.Group();
    g.position.set(...pos);
    scene.add(g);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 12), tubeMat);
    tube.position.y = h / 2; tube.renderOrder = 3; g.add(tube);
    kit.mesh(new THREE.SphereGeometry(0.08, 16, 10), red, [0, 0, 0], g).castShadow = false;
    const col = kit.mesh(new THREE.CylinderGeometry(0.028, 0.028, 1, 8), red, [0, 0, 0], g);
    col.castShadow = false;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.2, h), new THREE.MeshBasicMaterial({ map: tickTex, transparent: true }));
    plate.position.set(0, h / 2, -0.06);
    g.add(plate);
    const at = new THREE.Object3D();
    at.position.y = h + 0.08;
    g.add(at);
    const tag = label('', at, { cls });
    const lo = h / 15, span = h * 13 / 15;   // same proportions as the tick texture
    return {
      g, tag, name, shown: null,
      set(T) {
        const y = lo + ((T + 10) / 110) * span;
        col.scale.y = y; col.position.y = y / 2;
        const r = Math.round(T), txt = `${this.name}: ${r} °C`;
        if (txt !== this.shown) { this.shown = txt; tag.text = txt; }
      },
      show(v) { g.visible = v; tag.show(v); },
    };
  }

  // ---- Heat dots: one instanced mesh; each step lists the flows (from → to) and how strong each is.
  const MAXD = 170;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6a1a }), MAXD);
  dots.frustumCulled = false; dots.castShadow = false;
  scene.add(dots);
  const dummy = new THREE.Object3D(), va = new THREE.Vector3(), vb = new THREE.Vector3();
  let flows = [];
  function setFlows(list) {
    flows = list;
    dummy.scale.setScalar(0); dummy.updateMatrix();
    for (let k = 0; k < MAXD; k++) dots.setMatrixAt(k, dummy.matrix);
    dots.instanceMatrix.needsUpdate = true;
  }
  function runDots(t) {
    let k = 0;
    for (const f of flows) {
      const lvl = kit.clamp(f.level(), 0, 1);
      for (let j = 0; j < f.n && k < MAXD; j++, k++) {
        const s = rand(j * 7.13 + f.seed), u = (t * f.speed + s) % 1;
        f.from(s, va); f.to(s, vb);
        va.lerp(vb, u);
        va.y += (f.arc || 0) * Math.sin(Math.PI * u);
        dummy.position.copy(va);
        dummy.scale.setScalar(j < f.n * lvl ? Math.max(0.001, Math.sin(Math.PI * u)) : 0);
        dummy.updateMatrix();
        dots.setMatrixAt(k, dummy.matrix);
      }
    }
    dots.instanceMatrix.needsUpdate = true;
  }

  // ---- Steam puffs over a hot thing; strength 0..1.
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
  function steam(parent, y, r) {
    const puffs = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), steamMat.clone());
      parent.add(p); puffs.push(p);
    }
    return {
      run(t, strength) {
        puffs.forEach((p, i) => {
          const u = (t * 0.35 + i / puffs.length) % 1;
          p.position.set(Math.sin(i * 2.4 + t) * r * 0.5, y + u * 0.9, Math.cos(i * 1.7) * r * 0.4);
          p.scale.setScalar(0.6 + u * 1.6);
          p.material.opacity = strength * 0.45 * Math.sin(Math.PI * u);
          p.visible = strength > 0.02;
        });
      },
    };
  }

  // ======== Station A: hot cocoa, a glass, and the air thermometer.
  const mug = new THREE.Group();
  mug.position.set(A[0] - 0.75, 0, A[2]);
  scene.add(mug);
  const mugMat = kit.mat(0xd94848, { roughness: 0.5, side: THREE.DoubleSide });
  kit.mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.9, 24, 1, true), mugMat, [0, 0.45, 0], mug);
  kit.mesh(new THREE.CircleGeometry(0.38, 24), mugMat, [0, 0.02, 0], mug).rotation.x = -Math.PI / 2;
  const handle = kit.mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 16, Math.PI), mugMat, [0.4, 0.45, 0], mug);
  handle.rotation.z = -Math.PI / 2;
  const cocoa = kit.mesh(new THREE.CircleGeometry(0.4, 24), kit.mat(0x6b3a1f, { roughness: 0.4 }), [0, 0.78, 0], mug);
  cocoa.rotation.x = -Math.PI / 2; cocoa.castShadow = false;
  const mugSteam = steam(mug, 0.85, 0.4);
  const tCocoa = thermometer([A[0] - 0.92, 0.2, A[2] - 0.05], 'Cocoa', 1.5, 'warm');

  const glass = new THREE.Group();
  glass.position.set(A[0] + 0.75, 0, A[2]);
  scene.add(glass);
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.29, 0.9, 24, 1, true), glassMat);
  gl.position.y = 0.45; gl.renderOrder = 2; glass.add(gl);
  const liquidMat = new THREE.MeshStandardMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.7, roughness: 0.2, depthWrite: false });
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.285, 0.66, 24), liquidMat);
  liquid.position.y = 0.34; liquid.renderOrder = 1; glass.add(liquid);
  const floaters = [[-0.1, 0.06, 0.3], [0.12, -0.08, 1.1], [0.02, 0.14, 2]].map(([x, z, r]) => {
    const c = kit.mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), iceMat, [x, 0.64, z], glass);
    c.rotation.y = r; c.castShadow = false;
    return c;
  });
  const tGlass = thermometer([A[0] + 0.62, 0.2, A[2] + 0.02], 'Water', 1.5, 'cool');

  const airBase = kit.mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), kit.mat(0x5c6b7a), [A[0], 0.04, A[2] - 0.8], scene);
  const tAir = thermometer([A[0], 0.2, A[2] - 0.8], 'Air', 1.5);
  airBase.castShadow = false;

  // The ice cube dropped into the cocoa (step 2).
  const cube = kit.mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), iceMat, [0, 0, 0], scene);
  cube.visible = false;

  // ======== Station B: a bowl of hot water with three spoons.
  const bowlPts = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * (Math.PI / 2) * 0.82; bowlPts.push(new THREE.Vector2(Math.sin(a) * 0.95, 0.62 - Math.cos(a) * 0.62 + 0.02)); }
  const bowl = kit.mesh(new THREE.LatheGeometry(bowlPts, 28), kit.mat(0x7fb7e6, { side: THREE.DoubleSide, roughness: 0.45 }), [B[0], 0.03, B[2]], scene);
  bowl.scale.y = 0.9;
  const bowlWater = new THREE.Mesh(new THREE.CircleGeometry(0.84, 28), new THREE.MeshStandardMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false }));
  bowlWater.rotation.x = -Math.PI / 2; bowlWater.position.set(B[0], 0.4, B[2]); bowlWater.renderOrder = 2;
  scene.add(bowlWater);
  const bowlSteamHolder = new THREE.Group();
  bowlSteamHolder.position.set(B[0], 0, B[2]);
  scene.add(bowlSteamHolder);
  const bowlSteam = steam(bowlSteamHolder, 0.45, 0.8);

  const HOTC = new THREE.Color(0xff3b1f), tmpC = new THREE.Color();
  // A rod is a chain of parts; heat spreads along it by diffusion (D = how good a conductor it is).
  function rod(meshes, base, D) {
    return { meshes, base: new THREE.Color(base), D, h: new Float32Array(meshes.length), n: new Float32Array(meshes.length) };
  }
  function paintRod(r) {
    r.meshes.forEach((m, i) => {
      const x = r.h[i];
      m.material.color.copy(r.base).lerp(tmpC.copy(HOTC), Math.min(1, x * 1.1));
      m.material.emissive.setRGB(x * 0.45, x * 0.08, 0);
    });
  }
  function diffuse(r, dt, src) {
    const steps = Math.max(1, Math.ceil((r.D * dt) / 0.3)), h = dt / steps, N = r.h.length;
    for (let s = 0; s < steps; s++) {
      if (src != null) r.h[0] = src;
      for (let i = 0; i < N; i++) {
        const l = i > 0 ? r.h[i - 1] : r.h[i], rr = i < N - 1 ? r.h[i + 1] : r.h[i];
        r.n[i] = r.h[i] + r.D * h * (l - 2 * r.h[i] + rr) - 0.12 * h * r.h[i];
      }
      r.h.set(r.n);
      if (src != null) r.h[0] = src;
    }
  }

  const SPOONS = [
    { key: 'metal', name: 'Metal', color: 0xb8c2cc, D: 22, metal: 0.8, lean: 0.42, x: -0.32 },
    { key: 'wood', name: 'Wood', color: 0xb07a45, D: 0.35, metal: 0, lean: 0, x: 0 },
    { key: 'plastic', name: 'Plastic', color: 0x3fb56b, D: 0.5, metal: 0, lean: -0.42, x: 0.32 },
  ];
  const SEG = 9, SEG_L = 0.15;
  const spoons = SPOONS.map(sp => {
    const g = new THREE.Group();
    g.position.set(B[0] + sp.x, 0.28, B[2]);
    g.rotation.set(-0.25, 0, sp.lean);
    scene.add(g);
    const parts = [];
    const head = kit.mesh(new THREE.SphereGeometry(0.15, 16, 10), kit.mat(sp.color, { metalness: sp.metal, roughness: 0.4 }), [0, 0, 0], g);
    head.scale.set(0.8, 1.3, 0.35);
    parts.push(head);
    for (let i = 0; i < SEG; i++) parts.push(kit.mesh(new THREE.BoxGeometry(0.07, SEG_L, 0.035), kit.mat(sp.color, { metalness: sp.metal, roughness: 0.4 }), [0, 0.2 + SEG_L * (i + 0.5), 0], g));
    const tip = new THREE.Object3D();
    tip.position.y = 0.2 + SEG_L * SEG + 0.08;
    g.add(tip);
    const tag = label(sp.name, tip);
    return { ...sp, g, tip, tag, r: rod(parts, sp.color, sp.D), lift: 1, liftTo: 1 };
  });

  // ======== Station C: a pan on a stove; the handle can be metal, wood or plastic.
  const stove = kit.mesh(new THREE.BoxGeometry(1.9, 0.18, 1.6), kit.mat(0x2e3138, { roughness: 0.6 }), [C[0], 0.09, C[2]], scene);
  stove.castShadow = false;
  const flameMat = new THREE.MeshStandardMaterial({ color: 0x551100, emissive: 0xff4a00, emissiveIntensity: 1 });
  const ring = kit.mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 28), flameMat, [C[0], 0.2, C[2]], scene);
  ring.rotation.x = Math.PI / 2; ring.castShadow = false;
  const panMat = kit.mat(0x4a4f57, { metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide });
  const pan = new THREE.Group();
  pan.position.set(C[0], 0.26, C[2]);
  scene.add(pan);
  kit.mesh(new THREE.CylinderGeometry(0.75, 0.62, 0.24, 28, 1, true), panMat, [0, 0.12, 0], pan);
  const panBottom = kit.mesh(new THREE.CircleGeometry(0.62, 28), panMat, [0, 0.01, 0], pan);
  panBottom.rotation.x = -Math.PI / 2;
  const HSEG = 7;
  const handleParts = [panBottom];
  for (let i = 0; i < HSEG; i++) {
    const m = kit.mesh(new THREE.BoxGeometry(0.17, 0.07, 0.12), kit.mat(0x888888, { roughness: 0.45 }), [0.76 + 0.17 * (i + 0.5), 0.2 + i * 0.012, 0], pan);
    m.rotation.z = 0.07;
    handleParts.push(m);
  }
  const handleEnd = new THREE.Object3D();
  handleEnd.position.set(0.76 + 0.17 * HSEG - 0.05, 0.32, 0);
  pan.add(handleEnd);
  const handleTag = label('', handleEnd);
  const HANDLES = {
    metal: { color: 0x9aa3ad, D: 22, metal: 0.8, name: 'metal' },
    wood: { color: 0x9c6b3e, D: 0.35, metal: 0, name: 'wooden' },
    plastic: { color: 0x2f2f33, D: 0.5, metal: 0, name: 'plastic' },
  };
  const panRod = rod(handleParts, 0x4a4f57, 22);
  function setHandle(key) {
    const hd = HANDLES[key];
    st.handle = key;
    for (let i = 1; i < handleParts.length; i++) { handleParts[i].material.metalness = hd.metal; }
    panRod.base.set(hd.color);
    panRod.D = hd.D;
    panRod.h.fill(0);
    panTime = 0;
    panBottom.material.color.set(0x4a4f57);
  }
  // The pan body is always metal: its own colour is handled apart from the handle.
  function paintPan() {
    const x = panRod.h[0];
    panMat.color.set(0x4a4f57).lerp(tmpC.copy(HOTC), x * 0.3);
    panMat.emissive.setRGB(x * 0.2, x * 0.03, 0);
    for (let i = 1; i < handleParts.length; i++) {
      const m = handleParts[i], y = panRod.h[i];
      m.material.color.copy(panRod.base).lerp(tmpC.copy(HOTC), Math.min(1, y * 1.1));
      m.material.emissive.setRGB(y * 0.45, y * 0.08, 0);
    }
  }
  let panTime = 0;

  // ======== Station D: two glass cups (one in a wool sleeve) and a chart on an easel.
  const woolTex = paint(THREE, 128, 128, knit);
  woolTex.wrapS = woolTex.wrapT = THREE.RepeatWrapping;
  woolTex.repeat.set(4, 2);
  const cups = ['bare', 'wool'].map((kind, i) => {
    const g = new THREE.Group();
    g.position.set(D[0] + (i ? 0.75 : -0.75), 0, D[2]);
    scene.add(g);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.31, 0.9, 24, 1, true), glassMat);
    c.position.y = 0.45; c.renderOrder = 2; g.add(c);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.29, 1, 24), new THREE.MeshStandardMaterial({ color: 0xa9dcff, transparent: true, opacity: 0.6, roughness: 0.15, depthWrite: false }));
    w.renderOrder = 1; g.add(w);
    const ice = kit.mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), iceMat, [0, 0.2, 0], g);
    ice.rotation.y = 0.5;
    if (kind === 'wool') kit.mesh(new THREE.CylinderGeometry(0.41, 0.36, 0.78, 24, 1, true), kit.mat(0xffffff, { map: woolTex, roughness: 1, side: THREE.DoubleSide }), [0, 0.43, 0], g);
    const th = thermometer([g.position.x - 0.12, 0.18, D[2] + 0.04], kind === 'wool' ? 'Wool' : 'Bare', 1.25, kind === 'wool' ? 'warm' : '');
    const st0 = steam(g, 0.8, 0.32);
    return { kind, g, water: w, ice, th, steam: st0 };
  });
  function setWater(cup, level) {
    cup.water.visible = level > 0.01;
    cup.water.scale.y = Math.max(0.01, level);
    cup.water.position.y = 0.02 + level / 2;
  }
  // Chart board on an easel.
  const chartCanvas = document.createElement('canvas');
  chartCanvas.width = 320; chartCanvas.height = 220;
  const chartTex = new THREE.CanvasTexture(chartCanvas);
  chartTex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Group();
  board.position.set(D[0], 0, D[2] - 1.15);
  scene.add(board);
  const leg = kit.mat(0x8a5a33);
  [-0.8, 0.8].forEach(x => kit.mesh(new THREE.BoxGeometry(0.06, 2.6, 0.06), leg, [x, 1.3, -0.1], board));
  kit.mesh(new THREE.BoxGeometry(1.9, 1.32, 0.05), kit.mat(0x8a5a33), [0, 1.98, -0.04], board);
  const chart = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.24), new THREE.MeshBasicMaterial({ map: chartTex }));
  chart.position.set(0, 1.98, 0.02);
  board.add(chart);

  // ======== State.
  const st = { step: 0, time: 0, quiz: false, auto: false, cocoa: HOT, drop: -1, melt: 0, minutes: 0, running: false, mode: 'temp', handle: 'metal', spoonsIn: false, spoonTime: 0, slider: null, msg: '' };
  const say = html => { if (html !== st.msg) { st.msg = html; ui.readout(html); } };
  const history = { bare: [], wool: [] };

  function drawChart() {
    const g = chartCanvas.getContext('2d'), W = 320, H = 220;
    g.fillStyle = '#fbfbf6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#333'; g.font = 'bold 17px sans-serif';
    const x0 = 44, y0 = 186, w = 260, h = 140;
    if (st.mode === 'temp') {
      g.fillText('Temperature (°C)', 12, 24);
      g.font = '13px sans-serif';
      g.fillText('minutes', W - 66, H - 8);
      g.strokeStyle = '#bbb'; g.lineWidth = 1;
      for (const T of [20, 40, 60]) { const y = y0 - ((T - 10) / 65) * h; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke(); g.fillText(String(T), 14, y + 4); }
      g.strokeStyle = '#333'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x0, y0 - h - 6); g.lineTo(x0, y0); g.lineTo(x0 + w, y0); g.stroke();
      for (const [key, col] of [['bare', '#ff7a1a'], ['wool', '#7b3fe4']]) {
        g.strokeStyle = col; g.lineWidth = 4; g.beginPath();
        history[key].forEach(([m, T], i) => { const x = x0 + (m / 60) * w, y = y0 - ((T - 10) / 65) * h; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
        g.stroke();
      }
      g.font = 'bold 13px sans-serif';
      g.fillStyle = '#ff7a1a'; g.fillText('Bare cup', 200, 48);
      g.fillStyle = '#7b3fe4'; g.fillText('Wool cup', 200, 66);
    } else {
      g.fillText('Ice left', 12, 24);
      [['bare', 'Bare cup', '#ff7a1a'], ['wool', 'Wool cup', '#7b3fe4']].forEach(([key, name, col], i) => {
        const left = iceLeft(key), x = 70 + i * 120;
        g.fillStyle = '#e6eef5'; g.fillRect(x, y0 - h, 70, h);
        g.fillStyle = col; g.fillRect(x, y0 - h * left, 70, h * left);
        g.fillStyle = '#333'; g.font = 'bold 14px sans-serif';
        g.fillText(name, x - 2, y0 + 20);
        g.fillText(`${Math.round(left * 100)}%`, x + 18, y0 - h * left - 6 < 40 ? 56 : y0 - h * left - 6);
      });
    }
    chartTex.needsUpdate = true;
  }
  const cupTemp = key => ROOM + (HOT - ROOM) * Math.exp(-st.minutes / TAU[key]);
  const iceLeft = key => Math.max(0, 1 - st.minutes / MELT[key]);

  function hideAll() {
    for (const t of [tCocoa, tGlass, tAir]) t.tag.show(false);
    spoons.forEach(s => s.tag.show(false));
    handleTag.show(false);
    cups.forEach(c => c.th.tag.show(false));
    cube.visible = false;
  }

  // Camera framings.
  const VA = { radius: 1.75, yaw: 0.12, pitch: 0.28, target: [A[0], 0.85, A[2] - 0.2] };
  const VB = { radius: 1.55, yaw: 0.1, pitch: 0.32, target: [B[0], 0.85, B[2]] };
  const VC = { radius: 1.6, yaw: -0.15, pitch: 0.55, target: [C[0] + 0.55, 0.35, C[2]] };
  const VD = { radius: 1.95, yaw: 0, pitch: 0.2, target: [D[0], 1.25, D[2] - 0.4] };

  function startCups(kind) {
    st.mode = kind; st.minutes = 0; st.running = false;
    history.bare = [[0, HOT]]; history.wool = [[0, HOT]];
    cups.forEach(c => {
      c.ice.visible = kind === 'ice';
      c.th.g.visible = kind === 'temp';
      c.th.tag.show(kind === 'temp');
      setWater(c, kind === 'temp' ? 0.72 : 0);
      if (kind === 'temp') c.th.set(HOT);
      c.ice.scale.setScalar(1);
      c.ice.position.y = 0.19;
    });
    drawChart();
  }

  function heatFlowsCups() {
    const P = cups.map(c => c.g.position);
    if (st.mode === 'temp') {
      return [
        { n: 30, speed: 0.45, seed: 1, arc: 0.1, level: () => (cupTemp('bare') - ROOM) / (HOT - ROOM), from: (s, v) => v.set(P[0].x + Math.cos(s * 40) * 0.2, 0.3 + s * 0.4, P[0].z + Math.sin(s * 40) * 0.2), to: (s, v) => v.set(P[0].x + Math.cos(s * 40) * 0.95, 0.6 + s * 0.9, P[0].z + Math.sin(s * 40) * 0.8) },
        { n: 30, speed: 0.45, seed: 2, arc: 0.1, level: () => 0.25 * (cupTemp('wool') - ROOM) / (HOT - ROOM), from: (s, v) => v.set(P[1].x + Math.cos(s * 40) * 0.2, 0.3 + s * 0.4, P[1].z + Math.sin(s * 40) * 0.2), to: (s, v) => v.set(P[1].x + Math.cos(s * 40) * 0.95, 0.6 + s * 0.9, P[1].z + Math.sin(s * 40) * 0.8) },
      ];
    }
    return [
      { n: 30, speed: 0.45, seed: 3, level: () => (iceLeft('bare') > 0 ? 1 : 0), from: (s, v) => v.set(P[0].x + Math.cos(s * 40) * 0.95, 0.15 + s * 0.8, P[0].z + Math.sin(s * 40) * 0.8), to: (s, v) => v.set(P[0].x + Math.cos(s * 40) * 0.1, 0.2 + s * 0.15, P[0].z + Math.sin(s * 40) * 0.1) },
      { n: 30, speed: 0.45, seed: 4, level: () => (iceLeft('wool') > 0 ? 0.25 : 0), from: (s, v) => v.set(P[1].x + Math.cos(s * 40) * 0.95, 0.15 + s * 0.8, P[1].z + Math.sin(s * 40) * 0.8), to: (s, v) => v.set(P[1].x + Math.cos(s * 40) * 0.1, 0.2 + s * 0.15, P[1].z + Math.sin(s * 40) * 0.1) },
    ];
  }

  function setSpoons(on) {
    st.spoonsIn = on;
    spoons.forEach(s => { s.liftTo = on ? 0 : 1; if (!on) { s.r.h.fill(0); paintRod(s.r); } });
    st.spoonTime = 0;
  }

  startCups('temp');

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.auto = true; st.msg = ''; st.slider = null;
      hideAll();
      setFlows([]);
      st.cocoa = HOT; st.drop = -1; st.melt = 0;
      liquidMat.color.set(0xbfe4ff); floaters.forEach(f => { f.visible = true; });
      tGlass.name = 'Water'; tGlass.set(0); tAir.set(ROOM); tCocoa.set(HOT);

      if (i === 0) {
        view(VA);
        for (const t of [tCocoa, tGlass, tAir]) t.tag.show(true);
        const look = (target, text) => () => { st.auto = false; view({ radius: 0.95, yaw: 0.12, pitch: 0.25, target }); say(text); };
        ui.buttons([
          { label: 'Hot cocoa', onClick: look([tCocoa.g.position.x + 0.2, 1.0, A[2]], 'The hot cocoa is about <b>70 °C</b>.') },
          { label: 'Ice water', onClick: look([tGlass.g.position.x + 0.1, 1.0, A[2]], 'The water with ice in it is about <b>0 °C</b>.') },
          { label: 'Air', onClick: look([A[0], 1.1, A[2] - 0.8], 'The air in the room is about <b>20 °C</b>.') },
          { label: 'See all', onClick: () => { view(VA); say('Hottest: cocoa. Coldest: ice water. The air is in between.'); } },
        ]);
        say('Hottest: cocoa. Coldest: ice water. The air is in between.');
      }
      if (i === 1) {
        view({ radius: 1.05, yaw: 0.05, pitch: 0.62, target: [mug.position.x, 0.75, mug.position.z] });
        tCocoa.tag.show(true);
        const drop = () => { st.auto = false; st.drop = 0; st.melt = 0; st.cocoa = HOT; };
        ui.buttons([{ label: 'Drop in an ice cube', onClick: drop }, { label: 'Start again', onClick: () => { st.auto = false; st.drop = -1; st.melt = 0; st.cocoa = HOT; cube.visible = false; } }]);
        const M = mug.position;
        setFlows([{ n: 40, speed: 0.7, seed: 5, arc: 0.05, level: () => (st.drop >= 0 && cube.visible && cube.position.y < 0.9 ? 1 - st.melt : 0),
          from: (s, v) => v.set(M.x + Math.cos(s * 50) * 0.36, 0.79, M.z + Math.sin(s * 50) * 0.36), to: (s, v) => v.set(M.x + 0.06, 0.8, M.z + 0.04) }]);
        say('The cocoa is hot. The ice cube is very cold.');
      }
      if (i === 2) {
        view(VA);
        liquidMat.color.set(0xffa733); floaters.forEach(f => { f.visible = false; });
        tGlass.name = 'Juice';
        for (const t of [tCocoa, tGlass, tAir]) t.tag.show(true);
        st.minutes = 0;
        st.slider = ui.slider({ label: 'Time', min: 0, max: 90, step: 1, value: 0, unit: ' minutes', onInput: v => { st.auto = false; st.minutes = v; } });
        const M = mug.position, G = glass.position;
        const juice = () => ROOM - 15 * Math.exp(-st.minutes / TAU.juice), hot = () => ROOM + (HOT - ROOM) * Math.exp(-st.minutes / TAU.cocoa);
        st.juiceT = juice; st.cocoaT = hot;
        setFlows([
          { n: 40, speed: 0.45, seed: 6, arc: 0.1, level: () => (hot() - ROOM) / (HOT - ROOM) * 1.4, from: (s, v) => v.set(M.x + Math.cos(s * 40) * 0.25, 0.4 + s * 0.4, M.z + Math.sin(s * 40) * 0.25), to: (s, v) => v.set(M.x + Math.cos(s * 40) * 1.0, 0.7 + s * 0.9, M.z + Math.sin(s * 40) * 0.8) },
          { n: 30, speed: 0.45, seed: 7, level: () => (ROOM - juice()) / 15 * 1.4, from: (s, v) => v.set(G.x + Math.cos(s * 40) * 0.95, 0.2 + s * 0.9, G.z + Math.sin(s * 40) * 0.8), to: (s, v) => v.set(G.x + Math.cos(s * 40) * 0.12, 0.3 + s * 0.3, G.z + Math.sin(s * 40) * 0.12) },
        ]);
      }
      if (i === 3) {
        view(VB);
        spoons.forEach(s => s.tag.show(true));
        setSpoons(false);
        spoons.forEach(s => { s.lift = 1; });
        ui.buttons([{ label: 'Put the spoons in', onClick: () => { st.auto = false; setSpoons(true); } }, { label: 'Take them out', onClick: () => { st.auto = false; setSpoons(false); } }]);
        const metal = spoons[0];
        setFlows([{ n: 14, speed: 0.6, seed: 8, level: () => (st.spoonsIn && metal.lift < 0.05 ? 1 : 0),
          from: (s, v) => { v.set(0.03, 0.1, 0.03); return metal.g.localToWorld(v); }, to: (s, v) => { v.set(0.03, 0.2 + SEG_L * SEG, 0.03); return metal.g.localToWorld(v); } }]);
      }
      if (i === 4) {
        view(VC);
        handleTag.show(true);
        const row = ui.buttons([
          { label: 'Metal handle', onClick: () => { st.auto = false; setHandle('metal'); }, on: true },
          { label: 'Wooden handle', onClick: () => { st.auto = false; setHandle('wood'); } },
          { label: 'Plastic handle', onClick: () => { st.auto = false; setHandle('plastic'); } },
        ]);
        st.row = row;
        setHandle('metal');
        const P = pan.position;
        setFlows([
          { n: 24, speed: 0.8, seed: 9, level: () => 1, from: (s, v) => v.set(P.x + Math.cos(s * 40) * 0.42, 0.2, P.z + Math.sin(s * 40) * 0.42), to: (s, v) => v.set(P.x + Math.cos(s * 40) * 0.3, 0.3, P.z + Math.sin(s * 40) * 0.3) },
          { n: 12, speed: 0.5, seed: 10, level: () => (panRod.D > 5 ? 1 : 0.1), from: (s, v) => v.set(P.x + 0.62, P.y + 0.3, P.z), to: (s, v) => v.set(P.x + 0.76 + 0.17 * HSEG, P.y + 0.36, P.z) },
        ]);
      }
      if (i === 5 || i === 6) {
        view(VD);
        startCups(i === 5 ? 'temp' : 'ice');
        ui.buttons([{ label: 'Start the timer', onClick: () => { st.auto = false; startCups(st.mode); st.running = true; } }, { label: 'Reset', onClick: () => { st.auto = false; startCups(st.mode); } }]);
        setFlows(heatFlowsCups());
      }
      if (isQuiz) {
        view({ radius: 3, width: 7.2, yaw: 0, pitch: 0.3, target: [1.2, 0.7, 0] });
        setHandle('wood');
        setSpoons(true); spoons.forEach(s => { s.lift = 0; });
        startCups('temp');
        cups.forEach(c => c.th.tag.show(false));
      }
    },

    update(dt) {
      st.time += dt;
      const t = st.time, i = st.quiz ? -1 : st.step;

      // Steam strength follows how hot each thing is.
      const cocoaNow = i === 2 ? st.cocoaT() : st.cocoa;
      mugSteam.run(t, kit.clamp((cocoaNow - 35) / 35, 0, 1));
      bowlSteam.run(t, i === 3 || st.quiz ? 1 : 0.6);
      cups.forEach(c => c.steam.run(t, st.mode === 'temp' && (i === 5 || st.quiz) ? kit.clamp((cupTemp(c.kind) - 35) / 35, 0, 1) * (c.kind === 'wool' ? 0.6 : 1) : 0));

      if (i === 1) {
        if (st.auto && st.drop < 0 && t > 0.6) st.drop = 0;
        if (st.drop >= 0) {
          st.drop += dt;
          const M = mug.position, fall = Math.min(1, st.drop / 0.5);
          cube.visible = st.melt < 1;
          const y = kit.lerp(1.6, 0.8, fall * fall);
          const s = Math.max(0.001, 1 - st.melt);
          cube.position.set(M.x + 0.06, y, M.z + 0.04);
          cube.scale.setScalar(s);
          cube.rotation.set(0.3, st.drop * 0.4, 0.2);
          if (fall >= 1 && st.melt < 1) st.melt = Math.min(1, st.melt + dt / 5);
          st.cocoa = HOT - ICE_DROP * st.melt;
          say(st.melt <= 0 ? 'Here comes the ice cube!' : st.melt < 1 ? 'Heat moves from the <b>hot cocoa</b> into the <b>cold ice</b>. The ice melts.' : 'The ice has melted. The cocoa gave away some heat, so it is <b>a little cooler</b>.');
        }
        tCocoa.set(st.cocoa);
      }

      if (i === 2) {
        if (st.auto) { st.minutes = Math.min(90, t * 14); st.slider.set(Math.round(st.minutes)); }
        const c = st.cocoaT(), j = st.juiceT();
        tCocoa.set(c); tGlass.set(j);
        const m = Math.round(st.minutes);
        say(m >= 85 ? `After ${m} minutes both drinks are at about <b>20 °C</b>, the same as the air. The heat has stopped moving.` : `After ${m} minutes: cocoa about <b>${Math.round(c)} °C</b>, juice about <b>${Math.round(j)} °C</b>, air <b>20 °C</b>.`);
      }

      if (i === 3 || st.quiz) {
        if (i === 3 && st.auto && !st.spoonsIn && t > 0.5 && t < 1) setSpoons(true);
        if (st.spoonsIn) st.spoonTime += dt;
        spoons.forEach(s => {
          kit.follow(s, 'lift', s.liftTo, dt, 4);
          s.g.position.y = 0.28 + s.lift * 0.75;
          const inWater = st.spoonsIn && s.lift < 0.05;
          diffuse(s.r, dt, inWater ? 1 : null);
          paintRod(s.r);
        });
        if (i === 3) {
          const word = x => (x > 0.35 ? '<b>hot!</b>' : x > 0.12 ? 'warm' : 'cool');
          const end = s => s.r.h[SEG];
          say(st.spoonsIn ? `Handle ends: metal ${word(end(spoons[0]))}, wood ${word(end(spoons[1]))}, plastic ${word(end(spoons[2]))}.` : 'Which handle will get hot first? Guess, then put the spoons in.');
        }
      }

      if (i === 4 || st.quiz) {
        panTime += dt;
        flameMat.emissiveIntensity = 0.85 + 0.15 * Math.sin(t * 9);
        // The pan body heats up over the first seconds, then heat spreads along the handle.
        diffuse(panRod, dt, Math.min(1, 0.25 + panTime * 0.5));
        paintPan();
        const x = panRod.h[HSEG], name = HANDLES[st.handle].name;
        const txt = x > 0.3 ? 'Ouch! Hot' : x > 0.12 ? 'Getting warm' : 'Cool to hold';
        if (handleTag.el.textContent !== txt) handleTag.text = txt;
        if (i === 4) {
          if (st.auto) {
            const k = Math.floor(t / 5) % 3, key = ['metal', 'wood', 'plastic'][Math.max(0, k)];
            if (key !== st.handle) { setHandle(key); st.row.select(Math.max(0, k)); }
          }
          say(`A <b>${name}</b> handle: ${x > 0.3 ? 'heat spreads all the way to the end. It would burn your hand!' : x > 0.12 ? 'it is getting warm.' : 'it stays cool, so you can hold it.'}`);
        }
      }

      if (i === 5 || i === 6) {
        if (st.auto && !st.running && t > 0.6) st.running = true;
        if (st.running) {
          st.minutes = Math.min(60, st.minutes + dt * 12);
          if (st.mode === 'temp') { history.bare.push([st.minutes, cupTemp('bare')]); history.wool.push([st.minutes, cupTemp('wool')]); }
          drawChart();
          if (st.minutes >= 60) st.running = false;
        }
        const m = Math.round(st.minutes);
        if (st.mode === 'temp') {
          cups.forEach(c => c.th.set(cupTemp(c.kind)));
          say(m === 0 ? 'Both cups start at about <b>70 °C</b>.' : `After ${m} minutes: bare cup about <b>${Math.round(cupTemp('bare'))} °C</b>, wool cup about <b>${Math.round(cupTemp('wool'))} °C</b>.`);
        } else {
          cups.forEach(c => {
            const left = iceLeft(c.kind);
            c.ice.visible = left > 0.01;
            c.ice.scale.setScalar(Math.max(0.01, Math.cbrt(left)));
            setWater(c, 0.3 * (1 - left));
            c.ice.position.y = 0.02 + Math.max(0.17 * Math.cbrt(left), 0.3 * (1 - left) * 0.8);
          });
          say(m === 0 ? 'Two ice cubes the same size. Which will melt first?' : `After ${m} minutes, ice left: bare cup <b>${Math.round(iceLeft('bare') * 100)}%</b>, wool cup <b>${Math.round(iceLeft('wool') * 100)}%</b>.`);
        }
      }

      runDots(t);
      return true;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function paint(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function grain(g, w, h) {
  g.fillStyle = '#d7aa78'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#bf8f5c'; g.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const y = 4 + i * 8 + rand(i) * 3;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.04 + i) * 2);
    g.stroke();
  }
}
// Thermometer scale: a tick every 10 °C from −10 to 100 (matches the column in thermometer()).
function ticks(g, w, h) {
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#333';
  const H = 15, lo = 1, span = 13;
  for (let T = -10; T <= 100; T += 10) {
    const y = (1 - (lo + ((T + 10) / 110) * span) / H) * h;
    g.lineWidth = T % 50 === 0 ? 5 : 3;
    g.beginPath(); g.moveTo(0, y); g.lineTo(T % 50 === 0 ? w : w * 0.6, y); g.stroke();
  }
}
// Knitted wool: rows of little V stitches in purple and cream.
function knit(g, w, h) {
  g.fillStyle = '#8a55e6'; g.fillRect(0, 0, w, h);
  for (let row = 0; row < 8; row++) {
    g.strokeStyle = row % 4 === 3 ? '#f4ead8' : '#6a35c6';
    g.lineWidth = 4;
    for (let col = 0; col < 8; col++) {
      const x = col * 16, y = row * 16;
      g.beginPath(); g.moveTo(x + 2, y + 3); g.lineTo(x + 8, y + 13); g.lineTo(x + 14, y + 3); g.stroke();
    }
  }
}
