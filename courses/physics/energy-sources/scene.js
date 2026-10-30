// Energy sources: a little island town powered by solar panels, a wind turbine, a water wheel under a
// lake, and a power station that burns fuel. Glowing dots carry energy along the wires; a house lights
// up for each share of energy that arrives. Burning fuel shrinks the fuel pile and makes the sky smoky.
const HOUSES = 8;
const MAX = { sun: 3, wind: 3, water: 3, fuel: 4 };       // houses each source can power at full output
const P = { town: [0, 0, 0.9], hub: [0, 0, -0.5], sun: [-3.6, 0, 2.2], wind: [-3.2, 0, -2.4], water: [3.2, 0, -3.3], plant: [3.6, 0, 1.6] };
const SKY = { clear: 0x9fd6ff, night: 0x253354, smoke: 0x8b8f95 };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  scene.background = new THREE.Color(SKY.clear);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa6b8, 1.4));
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
  sunLight.position.set(-6, 10, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunLight.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 40 });
  scene.add(sunLight);

  // ---- Sea, beach and island.
  const sea = kit.mesh(new THREE.CircleGeometry(40, 48), kit.mat(0x2f8fd8, { roughness: 0.35 }), [0, -0.28, 0], scene);
  sea.rotation.x = -Math.PI / 2; sea.castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(6.4, 6.8, 0.5, 48), kit.mat(0xf1dca7), [0, -0.33, 0], scene).castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(6, 6.3, 0.5, 48), kit.mat(0x8fcf6a), [0, -0.25, 0], scene).castShadow = false;
  const treeMat = kit.mat(0x3f8f3a), trunkMat = kit.mat(0x7a5230);
  [[-1.6, -2.6], [-0.6, -3.4], [0.8, -2.9], [1.6, -4.4], [-4.8, 0.4], [-1.9, 3.8], [1.4, 3.9], [5.0, -0.6], [-5.1, -1.2], [0.2, -4.6]].forEach(([x, z], i) => {
    const s = 0.8 + rand(i) * 0.5;
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3 * s, 6), trunkMat, [x, 0.15 * s, z], scene);
    kit.mesh(new THREE.ConeGeometry(0.3 * s, 0.8 * s, 8), treeMat, [x, 0.6 * s, z], scene);
  });

  // ---- Town: houses with windows that light up.
  const houses = [];
  const roofCols = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x8e7dbe];
  for (let i = 0; i < HOUSES; i++) {
    const row = Math.floor(i / 4), col = i % 4;
    const x = P.town[0] - 1.35 + col * 0.9 + (row ? 0.3 : 0), z = P.town[2] - 0.45 + row * 1.0;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = (rand(i + 3) - 0.5) * 0.3;
    scene.add(g);
    kit.mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), kit.mat(0xfaf3e3), [0, 0.225, 0], g);
    const roof = kit.mesh(new THREE.ConeGeometry(0.45, 0.32, 4), kit.mat(roofCols[i % 4]), [0, 0.61, 0], g);
    roof.rotation.y = Math.PI / 4;
    const win = new THREE.MeshStandardMaterial({ color: 0x3b4252, emissive: 0xffd34d, emissiveIntensity: 0, roughness: 0.4 });
    for (const wx of [-0.13, 0.13]) kit.mesh(new THREE.PlaneGeometry(0.14, 0.14), win, [wx, 0.25, 0.251], g).castShadow = false;
    houses.push({ g, win, on: 0 });
  }
  const hub = kit.mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), kit.mat(0x6c757d), [P.hub[0], 0.2, P.hub[2]], scene);
  const townAt = new THREE.Object3D(); townAt.position.set(P.town[0], 1.0, P.town[2] + 0.4); scene.add(townAt);
  const townTag = label('Our town', townAt, { cls: 'big' });

  // ---- Solar panels and the Sun.
  const panelTex = paint(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = '#1d3a6e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8fb3e8'; g.lineWidth = 3;
    for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo((k * w) / 4, 0); g.lineTo((k * w) / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, (k * h) / 4); g.lineTo(w, (k * h) / 4); g.stroke(); }
  });
  const panelMat = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.3, metalness: 0.2, emissive: 0x4f8cff, emissiveIntensity: 0 });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const g = new THREE.Group();
    g.position.set(P.sun[0] - 0.75 + c * 0.75, 0, P.sun[2] - 0.4 + r * 0.8);
    scene.add(g);
    kit.mesh(new THREE.BoxGeometry(0.05, 0.35, 0.05), kit.mat(0x888888), [0, 0.17, 0], g);
    const p = kit.mesh(new THREE.BoxGeometry(0.66, 0.03, 0.5), panelMat, [0, 0.38, 0], g);
    p.rotation.x = 0.55;
    g.rotation.y = -0.3;   // tilted up toward the Sun
  }
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
  sunBall.position.set(-5.4, 3.4, 0.6);
  scene.add(sunBall);
  const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.3, depthWrite: false }));
  sunBall.add(sunHalo);
  const solarAt = new THREE.Object3D(); solarAt.position.set(P.sun[0], 0.9, P.sun[2] + 0.4); scene.add(solarAt);
  const solarTag = label('Solar panels', solarAt);

  // ---- Wind turbine on a hill, with wind streaks.
  const hill = kit.mesh(new THREE.ConeGeometry(1.7, 1.1, 24), kit.mat(0x7cc35a), [P.wind[0], 0.55, P.wind[2]], scene);
  hill.castShadow = false;
  const TOWER = 2.4, TOP = 1.1 + TOWER;
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.11, TOWER, 12), kit.mat(0xf4f4f4), [P.wind[0], 1.0 + TOWER / 2, P.wind[2]], scene);
  kit.mesh(new THREE.BoxGeometry(0.22, 0.2, 0.42), kit.mat(0xf4f4f4), [P.wind[0], TOP, P.wind[2] - 0.05], scene);
  const rotor = new THREE.Group();
  rotor.position.set(P.wind[0], TOP, P.wind[2] + 0.2);
  scene.add(rotor);
  kit.mesh(new THREE.SphereGeometry(0.09, 12, 8), kit.mat(0xe0e0e0), [0, 0, 0], rotor);
  for (let k = 0; k < 3; k++) {
    const b = new THREE.Group(); b.rotation.z = (k * Math.PI * 2) / 3; rotor.add(b);
    kit.mesh(new THREE.BoxGeometry(0.11, 1.1, 0.03), kit.mat(0xffffff), [0, 0.6, 0], b);
  }
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false });
  const streaks = [];
  for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.02), streakMat); scene.add(s); streaks.push(s); }
  const windAt = new THREE.Object3D(); windAt.position.set(P.wind[0] + 0.9, TOP - 0.3, P.wind[2] + 0.2); scene.add(windAt);
  const windTag = label('Wind turbine', windAt);

  // ---- Lake on a raised rock, a gate, a waterfall and a water wheel.
  const rock = kit.mesh(new THREE.BoxGeometry(2.4, 1.5, 1.6), kit.mat(0x9a8f80, { roughness: 1 }), [P.water[0], 0.75, P.water[2]], scene);
  rock.castShadow = false;
  const lake = kit.mesh(new THREE.BoxGeometry(2.1, 0.06, 1.3), kit.mat(0x3d9be0, { roughness: 0.2 }), [P.water[0], 1.52, P.water[2]], scene);
  lake.castShadow = false;
  const gateBox = kit.mesh(new THREE.BoxGeometry(0.5, 0.3, 0.08), kit.mat(0x6b4f3a), [P.water[0], 1.6, P.water[2] + 0.82], scene);
  const WHEEL = { x: P.water[0], y: 0.62, z: P.water[2] + 1.45, r: 0.55 };
  const wheel = new THREE.Group();
  wheel.position.set(WHEEL.x, WHEEL.y, WHEEL.z);
  scene.add(wheel);
  const wheelMat = kit.mat(0x8a5a33);
  const rim = kit.mesh(new THREE.TorusGeometry(WHEEL.r, 0.04, 6, 24), wheelMat, [0, 0, 0], wheel);
  rim.rotation.y = Math.PI / 2;
  for (let k = 0; k < 8; k++) {
    const p = new THREE.Group(); p.rotation.x = (k * Math.PI) / 4; wheel.add(p);
    kit.mesh(new THREE.BoxGeometry(0.34, 0.04, WHEEL.r * 0.9), wheelMat, [0, 0, WHEEL.r * 0.55], p);
  }
  const axle = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), kit.mat(0x555555), [WHEEL.x - 0.25, WHEEL.y, WHEEL.z], scene);
  axle.rotation.z = Math.PI / 2;
  kit.mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), kit.mat(0x6c757d), [WHEEL.x - 0.75, WHEEL.y - 0.1, WHEEL.z], scene);   // generator
  const river = kit.mesh(new THREE.BoxGeometry(0.6, 0.03, 4.2), kit.mat(0x3d9be0, { roughness: 0.2 }), [P.water[0] + 0.3, 0.015, P.water[2] + 3.4], scene);
  river.rotation.y = -0.35; river.castShadow = false;
  const dropMat = new THREE.MeshBasicMaterial({ color: 0x5bb8ff });
  const drops = [];
  for (let k = 0; k < 28; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), dropMat); scene.add(d); drops.push(d); }
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 1), new THREE.MeshBasicMaterial({ color: 0x7cc8ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  scene.add(fall);
  const waterAt = new THREE.Object3D(); waterAt.position.set(WHEEL.x + 0.85, WHEEL.y + 0.35, WHEEL.z + 0.2); scene.add(waterAt);
  const waterTag = label('Water wheel', waterAt);

  // ---- Power station with a chimney, fire window and fuel pile.
  const plant = new THREE.Group();
  plant.position.set(...P.plant);
  scene.add(plant);
  kit.mesh(new THREE.BoxGeometry(1.2, 0.8, 0.9), kit.mat(0xb5b9be), [0, 0.4, 0], plant);
  kit.mesh(new THREE.BoxGeometry(1.25, 0.08, 0.95), kit.mat(0x7d8288), [0, 0.82, 0], plant);
  const chim = kit.mesh(new THREE.CylinderGeometry(0.13, 0.17, 1.5, 12), kit.mat(0xffffff, { map: paint(THREE, 32, 128, stripes) }), [0.35, 1.5, -0.2], plant);
  chim.castShadow = true;
  const fireMat = new THREE.MeshStandardMaterial({ color: 0x331100, emissive: 0xff5a00, emissiveIntensity: 0 });
  kit.mesh(new THREE.PlaneGeometry(0.4, 0.25), fireMat, [-0.25, 0.35, 0.451], plant).castShadow = false;
  const pile = kit.mesh(new THREE.ConeGeometry(0.5, 0.5, 10), kit.mat(0x2b2b2b, { roughness: 1, flatShading: true }), [-1.05, 0.25, 0.25], plant);
  const smokeMats = [], smoke = [];
  for (let k = 0; k < 12; k++) {
    const m = new THREE.MeshStandardMaterial({ color: 0x6f6f6f, transparent: true, opacity: 0, depthWrite: false, roughness: 1 });
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), m);
    plant.add(s); smoke.push(s); smokeMats.push(m);
  }
  const plantAt = new THREE.Object3D(); plantAt.position.set(0.1, 1.15, 0.4); plant.add(plantAt);
  const plantTag = label('Power station', plantAt);
  const pileAt = new THREE.Object3D(); pileAt.position.set(-1.05, 0.7, 0.35); plant.add(pileAt);
  const pileTag = label('Fuel pile', pileAt, { cls: 'warm' });

  // ---- Power lines (curved wires) with glowing energy dots.
  const SRC = {
    sun: new THREE.Vector3(P.sun[0] + 0.9, 0.4, P.sun[2] - 0.3),
    wind: new THREE.Vector3(P.wind[0] + 0.3, 1.05, P.wind[2] + 0.3),
    water: new THREE.Vector3(WHEEL.x - 0.75, 0.4, WHEEL.z),
    fuel: new THREE.Vector3(P.plant[0] - 0.6, 0.6, P.plant[2] - 0.3),
  };
  const hubPt = new THREE.Vector3(P.hub[0], 0.4, P.hub[2]);
  const lines = {};
  for (const [key, from] of Object.entries(SRC)) {
    const mid = from.clone().lerp(hubPt, 0.5); mid.y += 1.1;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, hubPt);
    const mat = new THREE.MeshBasicMaterial({ color: 0x555555 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.025, 5), mat);
    scene.add(tube);
    lines[key] = { curve, mat, out: 0 };
  }
  const DOTS = 12;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe14d }), DOTS * 4);
  dots.frustumCulled = false; dots.castShadow = false;
  scene.add(dots);
  const dummy = new THREE.Object3D(), dim = new THREE.Color(0x555555), bright = new THREE.Color(0xffd23f);

  // ======== State.
  const st = { step: 0, time: 0, quiz: false, auto: true, msg: '', power: true, sun: 1, wind: 1, water: 1, burn: 0, fuel: 1, smog: 0, mode: 'clean', gateOpen: true, flow: 1, spin: 0, slider: null, phase: 0 };
  const say = html => { if (html !== st.msg) { st.msg = html; ui.readout(html); } };
  const skyCol = new THREE.Color(), cNight = new THREE.Color(SKY.night), cClear = new THREE.Color(SKY.clear), cSmoke = new THREE.Color(SKY.smoke);
  const allTags = [townTag, solarTag, windTag, waterTag, plantTag, pileTag];

  function setSources({ sun = 0, wind = 0, water = 0, burn = 0 }) {
    st.sun = sun; st.wind = wind; st.flow = water; st.gateOpen = water > 0; st.burn = burn;
  }

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.time = 0; st.auto = true; st.msg = ''; st.slider = null;
      allTags.forEach(t => t.show(false));
      st.fuel = 1; st.smog = 0;
      const go = o => view(o);

      if (i === 0) {
        go({ radius: 4.6, width: 6.2, yaw: 0, pitch: 0.55, target: [0, 0.7, -0.2] });
        allTags.forEach(t => t.show(t !== pileTag));
        setSources({ sun: 0.8, wind: 0.7, water: 0.8, burn: 0.6 });
        const row = ui.buttons([{ label: 'Power on', onClick: () => { st.auto = false; st.power = true; }, on: true }, { label: 'Power off', onClick: () => { st.auto = false; st.power = false; } }]);
        st.row = row; st.power = true;
      }
      if (i === 1) {
        go({ radius: 2.5, yaw: 0.35, pitch: 0.3, target: [-2.9, 1.3, 1.2] });
        solarTag.show(true); townTag.show(true);
        setSources({ sun: 0 });
        st.slider = ui.slider({ label: 'Sunshine', min: 0, max: 100, step: 1, value: 0, format: v => (v < 5 ? 'night' : v < 45 ? 'cloudy' : v < 80 ? 'sunny' : 'very sunny'), onInput: v => { st.auto = false; st.sun = v / 100; } });
      }
      if (i === 2) {
        go({ radius: 2.5, yaw: 0.25, pitch: 0.25, target: [-2.4, 1.7, -1.4] });
        windTag.show(true); townTag.show(true);
        setSources({ wind: 0 });
        st.slider = ui.slider({ label: 'Wind', min: 0, max: 100, step: 1, value: 0, format: v => (v < 5 ? 'calm' : v < 45 ? 'breeze' : v < 80 ? 'windy' : 'very windy'), onInput: v => { st.auto = false; st.wind = v / 100; } });
      }
      if (i === 3) {
        go({ radius: 2.1, yaw: -0.2, pitch: 0.4, target: [3.0, 0.9, -2.1] });
        waterTag.show(true); townTag.show(true);
        setSources({ water: 0 }); st.gateOpen = false;
        st.row = ui.buttons([{ label: 'Open the gate', onClick: () => { st.auto = false; st.gateOpen = true; } }, { label: 'Close the gate', onClick: () => { st.auto = false; st.gateOpen = false; } }]);
      }
      if (i === 4) {
        go({ radius: 2.4, yaw: -0.35, pitch: 0.22, target: [2.5, 1.2, 1.0] });
        plantTag.show(true); pileTag.show(true); townTag.show(true);
        setSources({ burn: 0 });
        st.row = ui.buttons([{ label: 'Burn fuel', onClick: () => { st.auto = false; st.burn = 1; } }, { label: 'Stop', onClick: () => { st.auto = false; st.burn = 0; } }, { label: 'Add more fuel', onClick: () => { st.auto = false; st.fuel = 1; } }]);
      }
      if (i === 5) {
        go({ radius: 4.4, width: 6.2, yaw: 0, pitch: 0.28, target: [0, 1.1, -0.4] });
        pileTag.show(true);
        st.mode = 'clean';
        const pick = m => () => { st.auto = false; st.mode = m; };
        st.row = ui.buttons([{ label: 'Sun, wind and water', onClick: pick('clean'), on: true }, { label: 'Fuel only', onClick: pick('fuel') }]);
      }
      if (isQuiz) {
        go({ radius: 4.6, width: 6.2, yaw: 0.2, pitch: 0.45, target: [0, 0.7, -0.2] });
        setSources({ sun: 0.9, wind: 0.6, water: 0.8 });
        st.power = true;
      }
    },

    update(dt) {
      st.time += dt;
      const t = st.time, i = st.step;

      // Scripted demos until the learner takes over.
      if (st.auto) {
        if (i === 0) { const off = t > 4 && t < 6; if (off === st.power) { st.power = !off; st.row.select(off ? 1 : 0); } }
        if (i === 1) { st.sun = kit.clamp((t - 0.3) / 2.5, 0, 1); st.slider.set(Math.round(st.sun * 100)); }
        if (i === 2) { st.wind = kit.clamp((t - 0.3) / 2.5, 0, 1); st.slider.set(Math.round(st.wind * 100)); }
        if (i === 3 && t > 0.4 && !st.gateOpen) { st.gateOpen = true; st.row.select(0); }
        if (i === 4 && t > 0.4 && t < 1 && !st.burn) { st.burn = 1; st.row.select(0); }
        if (i === 5) { const m = Math.floor(t / 6) % 2 ? 'fuel' : 'clean'; if (m !== st.mode) { st.mode = m; st.row.select(m === 'fuel' ? 1 : 0); } }
      }
      if (i === 5) {
        if (st.mode === 'clean') setSources({ sun: 0.9, wind: 0.8, water: 0.9 });
        else setSources({ burn: 1 });
      }

      // Water flow follows the gate; fuel burns down; smoke builds up while burning.
      kit.follow(st, 'flow', st.gateOpen ? (i === 0 ? 0.8 : i === 5 && st.mode === 'clean' ? 0.9 : 1) : 0, dt, 2.5);
      gateBox.position.y = 1.6 + st.flow * 0.35;
      const burning = st.burn > 0 && st.fuel > 0 ? st.burn : 0;
      if (burning && i !== 0 && !st.quiz) st.fuel = Math.max(0, st.fuel - dt / (i === 5 ? 9 : 7));
      st.smog = kit.clamp(st.smog + (burning ? dt * 0.35 : -dt * 0.25), 0, i === 0 ? 0.25 : 1);
      pile.scale.setScalar(Math.max(0.001, Math.cbrt(st.fuel)));
      pile.position.y = 0.25 * Math.cbrt(st.fuel);
      pile.visible = st.fuel > 0.005;
      fireMat.emissiveIntensity = burning ? 0.8 + 0.2 * Math.sin(t * 11) : 0;

      // Outputs (in houses) and energy along each wire.
      const on = i === 0 ? st.power : true;
      lines.sun.out = on ? MAX.sun * st.sun : 0;
      lines.wind.out = on ? MAX.wind * st.wind : 0;
      lines.water.out = on ? MAX.water * st.flow : 0;
      lines.fuel.out = on ? MAX.fuel * burning : 0;
      let total = 0, k = 0;
      for (const key of ['sun', 'wind', 'water', 'fuel']) {
        const L = lines[key], f = L.out / MAX[key];
        total += L.out;
        L.mat.color.copy(dim).lerp(bright, kit.clamp(f, 0, 1) * 0.8);
        for (let j = 0; j < DOTS; j++, k++) {
          const u = (t * 0.35 + j / DOTS) % 1;
          L.curve.getPoint(u, dummy.position);
          dummy.scale.setScalar(j < Math.round(DOTS * f) ? 1 : 0);
          dummy.updateMatrix();
          dots.setMatrixAt(k, dummy.matrix);
        }
      }
      dots.instanceMatrix.needsUpdate = true;
      const lit = Math.min(HOUSES, Math.floor(total + 0.05));
      houses.forEach((h, n) => { kit.follow(h, 'on', n < lit ? 1 : 0, dt, 5); h.win.emissiveIntensity = h.on * 1.4; h.win.color.setHex(h.on > 0.5 ? 0xfff1b0 : 0x3b4252); });

      // Sun, wind, wheel and smoke.
      const sunNow = i === 1 ? st.sun : 0.6 + 0.4 * st.sun;
      sunBall.visible = i === 1 || i === -1 || i === 0 || i === 5;
      sunBall.scale.setScalar(0.5 + 0.5 * sunNow);
      sunBall.position.y = 1.4 + 2.0 * (i === 1 ? st.sun : 1);
      sunHalo.material.opacity = 0.35 * sunNow;
      sunLight.intensity = 0.5 + 1.7 * sunNow;
      panelMat.emissiveIntensity = (lines.sun.out / MAX.sun) * 0.35;
      st.spin += dt * st.wind * 7;
      rotor.rotation.z = -st.spin;
      streaks.forEach((s, n) => {
        const u = (t * (0.4 + st.wind * 1.2) + rand(n)) % 1;
        s.visible = st.wind > 0.05 && (i === 2 || i === 0 || i === 5 || i === -1);
        s.position.set(P.wind[0] - 2.2 + u * 3.6, TOP - 0.9 + rand(n + 10) * 1.6, P.wind[2] + 0.6 + rand(n + 20) * 0.6);
        s.scale.x = 0.4 + st.wind;
      });
      streakMat.opacity = 0.6 * Math.min(1, st.wind * 2);
      wheel.rotation.x -= dt * st.flow * 3;
      drops.forEach((d, n) => {
        const u = (t * 1.3 + n / drops.length) % 1;
        d.visible = st.flow > 0.05 && n < drops.length * st.flow;
        d.position.set(WHEEL.x + (rand(n) - 0.5) * 0.3, 1.55 - u * 0.95, P.water[2] + 0.88 + u * 0.35);
      });
      fall.visible = st.flow > 0.05;
      fall.scale.set(0.3 + 0.7 * st.flow, 0.95, 1);
      fall.position.set(WHEEL.x, 1.55 - 0.47, P.water[2] + 0.88 + 0.17);
      fall.rotation.x = -0.35;
      smoke.forEach((s, n) => {
        const u = (t * 0.25 + n / smoke.length) % 1;
        s.position.set(0.35 + u * 0.9 + Math.sin(n * 2 + t) * 0.1, 2.3 + u * 2.2, -0.2 - u * 0.4);
        s.scale.setScalar(0.6 + u * 2.6);
        smokeMats[n].opacity = burning * 0.6 * Math.sin(Math.PI * u);
        smokeMats[n].color.setHex(0x5f5f5f);
      });

      // Sky: darker at night (sunshine step), grey with smoke.
      skyCol.copy(cNight).lerp(cClear, i === 1 ? st.sun : 1).lerp(cSmoke, st.smog * 0.85);
      scene.background.copy(skyCol);

      // Readout.
      const housesTxt = `Houses with power: <b>${lit} of ${HOUSES}</b>`;
      if (i === 0) say(st.power ? `${housesTxt}. Energy flows from all four sources.` : `${housesTxt}. No energy is flowing, so the town is dark.`);
      if (i === 1) say(`${housesTxt}. ${st.sun < 0.05 ? 'At night the panels make no electricity.' : st.sun < 0.45 ? 'Clouds block some sunlight.' : 'Bright sunshine: the panels make lots of electricity.'}`);
      if (i === 2) say(`${housesTxt}. ${st.wind < 0.05 ? 'No wind: the blades stand still.' : st.wind < 0.45 ? 'A gentle breeze turns the blades slowly.' : 'A strong wind spins the blades fast.'}`);
      if (i === 3) say(`${housesTxt}. ${st.gateOpen ? 'Falling water spins the wheel.' : 'The gate is closed, so the wheel stops.'}`);
      if (i === 4) say(`${housesTxt}. Fuel left: <b>${Math.round(st.fuel * 100)}%</b>. ${st.fuel <= 0 ? 'The fuel is all used up, so the lights went out!' : burning ? 'Burning fuel makes smoke.' : 'The fire is out.'}`);
      if (i === 5) say(st.mode === 'clean' ? `${housesTxt}. Sun, wind and water keep coming back, and the sky stays clear.` : `${housesTxt}. Fuel left: <b>${Math.round(st.fuel * 100)}%</b>. The sky is getting smoky.${st.fuel <= 0 ? ' The fuel ran out!' : ''}`);
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
function stripes(g, w, h) {
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#d62828' : '#f4f4f4'; g.fillRect(0, (k * h) / 8, w, h / 8); }
}
