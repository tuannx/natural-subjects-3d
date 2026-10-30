// Sound waves: a loudspeaker pushes a block of air particles into compressions and rarefactions (a
// longitudinal wave). An oscilloscope shows the microphone signal; frequency sets pitch, amplitude sets
// loudness. A bell in a jar goes quiet as the air is pumped out, pulses race through air, water and steel,
// a chart shows the range of human hearing and a shout echoes off a cliff.
// Everything is shown in slow motion; the readouts use real values (v ≈ 343 m/s in air at 20 °C).
import { panel, rand, fmt } from '../_shared/lab.js';

const V_AIR = 343, V_WATER = 1500, V_STEEL = 5000;
const UNIT = 0.25;              // particle block: 1 world unit stands for 0.25 m of air
const X0 = -4.4, X1 = 4.4;      // particle block from x0 to x1
const SRC = -4.75;              // speaker cone face
const SLOW = 400;               // 400 Hz is shown as 1 vibration per second
const BELL_X = 16, RACE_X = 32, ECHO_X = 46;
const ECHO_SCALE = 1 / 40;      // echo station: 1 world unit = 40 m
const ECHO_SLOW = 3;            // echo animation runs 3 times slower than real time
const TRACK = 9;                // race track length (world units)

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xd9e4cf, sky: 0xe4f1fb, radius: 40 });
  ground.position.x = 22;
  const sun = kit.lights(scene, { sun: [4, 10, 6] });
  scene.add(sun.target);
  const moveSun = x => { sun.position.set(x + 4, 10, 6); sun.target.position.set(x, 0, 0); };

  // ---------- Station A: speaker, air particles, microphone, oscilloscope ----------
  const dark = kit.mat(0x2b2d42, { roughness: 0.6 });
  const box = kit.mesh(new THREE.BoxGeometry(0.9, 2.4, 1.8), dark, [SRC - 0.6, 1.3, 0], scene);
  kit.mesh(new THREE.BoxGeometry(0.12, 2.2, 1.6), kit.mat(0x3d405b), [SRC - 0.12, 1.3, 0], scene);
  const cone = new THREE.Group();
  cone.position.set(SRC - 0.06, 1.3, 0);
  scene.add(cone);
  const coneMesh = kit.mesh(new THREE.CylinderGeometry(0.7, 0.18, 0.35, 28, 1, true), kit.mat(0x8d99ae, { side: THREE.DoubleSide, roughness: 0.8 }), [0.12, 0, 0], cone);
  coneMesh.rotation.z = -Math.PI / 2;
  kit.mesh(new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0x4a4e69), [0.02, 0, 0], cone).rotation.z = -Math.PI / 2;
  const speakerTag = label('Speaker', new THREE.Vector3(SRC - 0.55, 2.75, 0));
  box.castShadow = true;

  // Microphone on a stand at the far end, wired to the oscilloscope.
  const mic = new THREE.Group();
  mic.position.set(X1 + 0.55, 0, 0);
  scene.add(mic);
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8), kit.mat(0x5c677d), [0, 0.65, 0], mic);
  kit.mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16), kit.mat(0x5c677d), [0, 0.025, 0], mic);
  const micHead = kit.mesh(new THREE.CapsuleGeometry(0.1, 0.22, 4, 10), kit.mat(0x22223b), [-0.05, 1.32, 0], mic);
  micHead.rotation.z = Math.PI / 2;
  const micTag = label('Microphone', new THREE.Vector3(X1 + 0.55, 1.75, 0));

  // Air particles: a block of small balls that move back and forth along x.
  const NX = 50, NY = 7, NZ = 3, N = NX * NY * NZ;
  const parts = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), N);
  parts.frustumCulled = false;
  parts.castShadow = false;
  scene.add(parts);
  const base = new Float32Array(N * 3);
  for (let i = 0, ix = 0; ix < NX; ix++) for (let iy = 0; iy < NY; iy++) for (let iz = 0; iz < NZ; iz++, i++) {
    base[i * 3] = X0 + (ix + 0.5) * (X1 - X0) / NX + (rand(i) - 0.5) * 0.08;
    base[i * 3 + 1] = 0.55 + iy * 0.25 + (rand(i + 999) - 0.5) * 0.1;
    base[i * 3 + 2] = -0.45 + iz * 0.45 + (rand(i + 1999) - 0.5) * 0.12;
  }
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), cSqueeze = new THREE.Color(0x1b3a8a), cSpread = new THREE.Color(0xa8d8ff);
  // One marked particle (front row, middle of the block).
  const MARK = (24 * NY + 3) * NZ + 2;
  const marked = kit.mesh(new THREE.SphereGeometry(0.1, 16, 10), new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.4 }), [0, 0, 0], scene);
  const restPin = kit.mesh(new THREE.BoxGeometry(0.02, 0.5, 0.02), new THREE.MeshBasicMaterial({ color: 0xe63946 }), [base[MARK * 3], base[MARK * 3 + 1] - 0.4, base[MARK * 3 + 2]], scene);
  const markTag = label('One air particle', new THREE.Object3D(), { cls: 'warm' });
  markTag.at.position.y = 0.2;
  marked.add(markTag.at);

  // Moving anchors for the compression / rarefaction labels and a wavelength bracket.
  const squeezeAt = new THREE.Object3D(), spreadAt = new THREE.Object3D();
  scene.add(squeezeAt, spreadAt);
  const squeezeTag = label('Compression', squeezeAt, { cls: 'cool' });
  const spreadTag = label('Rarefaction', spreadAt);
  const bracket = new THREE.Group();
  scene.add(bracket);
  const brMat = new THREE.MeshBasicMaterial({ color: 0xe85d04 });
  const brBar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.04), brMat);
  brBar.position.x = 0.5;
  const brL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), brMat), brR = brL.clone();
  brR.position.x = 1;
  const brInner = new THREE.Group();   // scaled along x to one wavelength
  brInner.add(brBar);
  bracket.add(brInner, brL, brR);
  const lambdaAt = new THREE.Object3D();
  lambdaAt.position.y = 0.12;
  bracket.add(lambdaAt);
  const lambdaTag = label('Wavelength λ', lambdaAt, { cls: 'warm' });

  // Oscilloscope: the microphone signal (air pressure) against time, 1 ms per square.
  const scope = panel(THREE, 4.8, 2.2, { px: 512, frame: 0x22333b });
  scope.position.set(0.6, 4.0, -1.2);
  scene.add(scope);
  const scopePost = kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), kit.mat(0x5c6b77), [0.6, 1.45, -1.3], scene);
  // Hearing-range chart (same place as the scope, used in its own step).
  const chart = panel(THREE, 5.2, 2.9, { px: 512 });
  chart.position.set(-0.6, 3.25, -1.1);
  scene.add(chart);
  const chartPost = kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 8), kit.mat(0x5c6b77), [-0.6, 0.95, -1.2], scene);

  // ---------- Station B: bell in a jar with a vacuum pump ----------
  const jar = new THREE.Group();
  jar.position.x = BELL_X;
  scene.add(jar);
  const steel = kit.mat(0x8d99ae, { metalness: 0.6, roughness: 0.35 });
  kit.mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.22, 32), kit.mat(0x6d597a), [0, 0.11, 0], jar);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 1.4, 32, 1, true), glassM);
  wall.position.y = 0.92; wall.renderOrder = 2;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassM);
  dome.position.y = 1.62; dome.renderOrder = 2;
  jar.add(wall, dome);
  kit.mesh(new THREE.SphereGeometry(0.1, 12, 8), kit.mat(0x8d99ae), [0, 2.98, 0], jar);
  // Electric bell: a metal gong on a post and a hammer that keeps striking it.
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), steel, [-0.25, 0.7, 0], jar);
  const gong = kit.mesh(new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0xd4a017, { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }), [-0.25, 1.2, 0], jar);
  const hammer = new THREE.Group();
  hammer.position.set(0.55, 0.45, 0);
  jar.add(hammer);
  kit.mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), kit.mat(0x3d405b), [0, -0.1, 0], jar).position.set(0.55, 0.32, 0);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6), steel, [0, 0.52, 0], hammer);
  kit.mesh(new THREE.SphereGeometry(0.09, 12, 8), kit.mat(0x3d405b), [0, 1.05, 0], hammer);
  const bellTag = label('Bell', new THREE.Vector3(BELL_X - 0.25, 1.95, 0));
  // Air inside the jar.
  const JN = 150;
  const jarAir = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: 0x5aa9e6, roughness: 0.5 }), JN);
  jarAir.frustumCulled = false; jarAir.castShadow = false;
  jar.add(jarAir);
  const jarBase = new Float32Array(JN * 3);
  for (let i = 0; i < JN; i++) {
    const a = rand(i + 50) * Math.PI * 2, r = Math.sqrt(rand(i + 150)) * 1.2;
    let y = 0.3 + rand(i + 250) * 2.4;
    const maxY = 1.62 + Math.sqrt(Math.max(0, 1.3 * 1.3 - r * r));
    if (y > maxY - 0.08) y = 0.3 + (y - 0.3) * (maxY - 0.4) / 2.4;
    jarBase[i * 3] = r * Math.cos(a); jarBase[i * 3 + 1] = y; jarBase[i * 3 + 2] = r * Math.sin(a);
  }
  // Pump and hose.
  const pump = kit.mesh(new THREE.BoxGeometry(0.9, 0.8, 0.7), kit.mat(0x2a9d8f), [2.9, 0.4, 0.2], jar);
  kit.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12), dark, [2.9, 0.95, 0.2], jar);
  const hose = kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), kit.mat(0x22223b), [2.15, 0.15, 0.1], jar);
  hose.rotation.z = Math.PI / 2;
  const pumpTag = label('Vacuum pump', new THREE.Vector3(BELL_X + 2.9, 1.3, 0.2));
  // Sound spreading out of the jar: flat rings that grow and fade.
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 4, 48), new THREE.MeshBasicMaterial({ color: 0xe85d04, transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = Math.PI / 2; r.position.set(BELL_X, 1.2, 0);
    scene.add(r); rings.push(r);
  }
  // Sound level meter beside the jar.
  const meter = panel(THREE, 2.0, 1.3, { px: 256 });
  meter.position.set(BELL_X - 3.2, 1.85, -0.3);
  scene.add(meter);
  const meterPost = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 8), kit.mat(0x5c6b77), [BELL_X - 3.2, 0.62, -0.35], scene);

  // ---------- Station C: race through air, water and steel ----------
  const race = new THREE.Group();
  race.position.x = RACE_X;
  scene.add(race);
  const TX0 = -TRACK / 2;
  const tracks = [
    { name: 'Air', v: V_AIR, z: 1.7 },
    { name: 'Water', v: V_WATER, z: 0 },
    { name: 'Steel', v: V_STEEL, z: -1.7 },
  ];
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffd60a });
  for (const tr of tracks) {
    kit.mesh(new THREE.BoxGeometry(TRACK + 0.4, 0.3, 0.8), kit.mat(0xb7b7a4), [0, 0.15, tr.z], race);
    if (tr.name === 'Steel') kit.mesh(new THREE.BoxGeometry(TRACK, 0.3, 0.3), kit.mat(0xadb5bd, { metalness: 0.8, roughness: 0.3 }), [0, 0.55, tr.z], race);
    else {
      const m = new THREE.Mesh(new THREE.BoxGeometry(TRACK, 0.5, 0.5), tr.name === 'Water'
        ? new THREE.MeshStandardMaterial({ color: 0x3b9be0, transparent: true, opacity: 0.55, roughness: 0.15, depthWrite: false })
        : new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false }));
      m.position.set(0, 0.55, tr.z); m.renderOrder = 1;
      race.add(m);
    }
    tr.pulse = new THREE.Mesh(new THREE.BoxGeometry(0.14, tr.name === 'Steel' ? 0.36 : 0.56, tr.name === 'Steel' ? 0.36 : 0.56), pulseMat);
    tr.pulse.position.set(TX0, 0.55, tr.z);
    race.add(tr.pulse);
    tr.flag = kit.mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), kit.mat(0x333333), [TRACK / 2 + 0.1, 0.85, tr.z + 0.35], race);
    tr.cloth = kit.mesh(new THREE.BoxGeometry(0.5, 0.32, 0.02), kit.mat(0xe63946), [TRACK / 2 + 0.35, 1.24, tr.z + 0.35], race);
    tr.cloth.material = kit.mat(0xe63946);
    tr.tag = label(tr.name, new THREE.Vector3(RACE_X + TX0 + 0.6, 0.95, tr.z), { cls: tr.name === 'Water' ? 'cool' : '' });
  }
  // Starting hammer that taps all three at once.
  const tap = new THREE.Group();
  tap.position.set(TX0 - 0.45, 0.3, 0);
  race.add(tap);
  kit.mesh(new THREE.BoxGeometry(0.25, 0.25, 3.4), kit.mat(0x8d5524), [0, 0.25, 0], tap);
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), kit.mat(0x8d5524), [-0.6, 0.25, 0], tap).rotation.z = Math.PI / 2;

  // ---------- Station D: echo from a cliff ----------
  const person = new THREE.Group();
  person.position.set(ECHO_X - 4, 0, 0);
  scene.add(person);
  const shirt = kit.mat(0x3a86ff), skin = kit.mat(0xf1c27d);
  kit.mesh(new THREE.CapsuleGeometry(0.12, 0.6, 4, 8), kit.mat(0x2b2d42), [0, 0.45, 0.12], person);
  kit.mesh(new THREE.CapsuleGeometry(0.12, 0.6, 4, 8), kit.mat(0x2b2d42), [0, 0.45, -0.12], person);
  kit.mesh(new THREE.CapsuleGeometry(0.28, 0.55, 4, 12), shirt, [0, 1.25, 0], person);
  kit.mesh(new THREE.SphereGeometry(0.24, 20, 14), skin, [0.02, 1.88, 0], person);
  const handL = kit.mesh(new THREE.CapsuleGeometry(0.07, 0.4, 4, 8), shirt, [0.28, 1.8, 0.18], person);
  handL.rotation.z = -1.2;
  const handR = handL.clone(); handR.position.z = -0.18; person.add(handR);
  const mouth = new THREE.Vector3(ECHO_X - 3.7, 1.85, 0);
  const shoutAt = new THREE.Object3D();
  shoutAt.position.set(0, 2.35, 0);
  person.add(shoutAt);
  const shoutTag = label('Shout!', shoutAt, { cls: 'warm' });
  const cliff = new THREE.Group();
  scene.add(cliff);
  const rockGeo = new THREE.BoxGeometry(1.6, 4.2, 5, 2, 6, 6);
  const rp = rockGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const key = Math.round(rp.getX(i) * 20) * 7 + Math.round(rp.getY(i) * 20) * 13 + Math.round(rp.getZ(i) * 20) * 29;
    if (rp.getX(i) > 0.7) continue;    // keep the front face flat
    rp.setX(i, rp.getX(i) + (rand(key) - 0.5) * 0.25);
  }
  rockGeo.computeVertexNormals();
  kit.mesh(rockGeo, kit.mat(0x9c8b7a, { flatShading: true, roughness: 1 }), [0.8, 2.1, 0], cliff);
  // The cliff faces the person: rotate so the flat face (+x side was kept flat) faces -x.
  cliff.children[0].rotation.y = Math.PI;
  const cliffTagAt = new THREE.Object3D();
  cliffTagAt.position.set(0.3, 4.5, 0);
  cliff.add(cliffTagAt);
  const cliffTag = label('Cliff', cliffTagAt);
  // Wave fronts: flat ribbons of constant width whose vertices are moved each frame (no new geometry).
  const ASEG = 24, AHALF = 0.6, AW = 0.07;
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xe85d04, side: THREE.DoubleSide });
  const arcs = [0, 1, 2].map(() => {
    const g = new THREE.BufferGeometry(), pos = new Float32Array((ASEG + 1) * 2 * 3), idx = [];
    for (let i = 0; i < ASEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.Mesh(g, arcMat);
    m.frustumCulled = false; m.visible = false;
    scene.add(m);
    // Arc of radius r around (cx, cy) opening towards dir (+1 right, -1 left), at z = 0.
    m.set = (cx, cy, r, dir) => {
      const half = Math.min(AHALF, Math.asin(Math.min(1, 2.3 / r)));   // keep big fronts on screen
      for (let i = 0; i <= ASEG; i++) {
        const th = -half + (2 * half * i) / ASEG, c = Math.cos(th), sn = Math.sin(th);
        for (let j = 0; j < 2; j++) {
          const rr = r + (j ? AW / 2 : -AW / 2), o = (i * 2 + j) * 3;
          pos[o] = cx + dir * rr * c; pos[o + 1] = Math.max(0.02, cy + rr * sn); pos[o + 2] = 0;
        }
      }
      g.attributes.position.needsUpdate = true;
      m.visible = true;
    };
    return m;
  });

  // ---------- State ----------
  const st = {
    step: 0, quiz: false, time: 0, plan: [], phase: 0, f: 400, amp: 1, on: true, speed: 1,
    air: 1, raceT: 0, dist: 1000, echoD: 170, echoT: 0, hearF: 1000, scopeKey: '', chartKey: '', meterKey: '',
    slider: null, ringT: 0, showMark: false, showBracket: false, showLabels: false,
  };
  const lambdaVis = () => (V_AIR / st.f) / UNIT;

  // ---------- Drawing ----------
  function drawScope() {
    const key = `${st.f}|${st.amp}|${st.on}`;
    if (key === st.scopeKey) return;
    st.scopeKey = key;
    scope.draw((c, W, H) => {
      c.fillStyle = '#0d2b22'; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#1f5a47'; c.lineWidth = 1;
      const top = 34, bot = H - 8, gx = 10, gy = 4, sx = W / gx, sy = (bot - top) / gy;
      for (let i = 0; i <= gx; i++) { c.beginPath(); c.moveTo(i * sx, top); c.lineTo(i * sx, bot); c.stroke(); }
      for (let j = 0; j <= gy; j++) { c.beginPath(); c.moveTo(0, top + j * sy); c.lineTo(W, top + j * sy); c.stroke(); }
      c.fillStyle = '#7dffb3'; c.font = '700 22px system-ui, sans-serif'; c.textBaseline = 'middle';
      c.textAlign = 'left'; c.fillText('Microphone signal', 10, 17);
      c.textAlign = 'right'; c.fillText('1 ms per square', W - 10, 17);
      // 10 squares = 10 ms; the trace is the air pressure at the microphone.
      const mid = top + (bot - top) / 2, A = st.on ? Math.min(1, st.amp / 1.6) * (bot - top) * 0.45 : 0;
      c.strokeStyle = '#7dffb3'; c.lineWidth = 3; c.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const tms = (x / W) * 10, y = mid - A * Math.sin(2 * Math.PI * st.f * tms / 1000);
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    });
  }
  const logX = (f, L, R) => L + (Math.log10(f) - 1) / 4 * (R - L);  // 10 Hz .. 100 kHz
  function drawChart() {
    const key = String(st.hearF);
    if (key === st.chartKey) return;
    st.chartKey = key;
    chart.draw((c, W, H) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
      const L = 128, R = W - 22, axisY = H - 62;
      c.textBaseline = 'middle';
      // Zones outside human hearing.
      c.fillStyle = '#ede7f6'; c.fillRect(L, 8, logX(20, L, R) - L, axisY - 8);
      c.fillStyle = '#e3f2fd'; c.fillRect(logX(20000, L, R), 8, R - logX(20000, L, R), axisY - 8);
      c.font = '700 20px system-ui, sans-serif';
      c.fillStyle = '#5e35b1'; c.textAlign = 'left'; c.fillText('Infrasound', L + 4, 26);
      c.fillStyle = '#1565c0'; c.textAlign = 'right'; c.fillText('Ultrasound', R - 4, 26);
      // Hearing ranges (approximate, for healthy young ears).
      const bars = [
        { name: 'Humans', lo: 20, hi: 20000, col: '#2a9d8f' },
        { name: 'Dogs', lo: 67, hi: 45000, col: '#e9a23b' },
        { name: 'Elephants', lo: 16, hi: 12000, col: '#8d99ae' },
      ];
      bars.forEach((b, i) => {
        const y = 72 + i * 50;
        c.fillStyle = '#1d2b36'; c.textAlign = 'right'; c.font = '700 22px system-ui, sans-serif';
        c.fillText(b.name, L - 10, y);
        c.fillStyle = b.col;
        c.fillRect(logX(b.lo, L, R), y - 15, logX(b.hi, L, R) - logX(b.lo, L, R), 30);
      });
      // Axis.
      c.strokeStyle = '#1d2b36'; c.lineWidth = 2; c.beginPath(); c.moveTo(L, axisY); c.lineTo(R, axisY); c.stroke();
      c.fillStyle = '#526472'; c.font = '600 18px system-ui, sans-serif'; c.textAlign = 'center';
      [[10, '10'], [100, '100'], [1000, '1000'], [10000, '10 000'], [100000, '']].forEach(([f, t]) => {
        const x = logX(f, L, R);
        c.beginPath(); c.moveTo(x, axisY); c.lineTo(x, axisY + 7); c.stroke();
        c.fillText(t, Math.min(R - 30, Math.max(L + 10, x)), axisY + 20);
      });
      c.fillStyle = '#1d2b36'; c.font = '700 20px system-ui, sans-serif';
      c.fillText('Frequency (Hz)', (L + R) / 2, H - 14);
      // Marker for the current frequency.
      const mx = logX(st.hearF, L, R);
      c.strokeStyle = '#e63946'; c.lineWidth = 5; c.beginPath(); c.moveTo(mx, 42); c.lineTo(mx, axisY); c.stroke();
    });
  }
  function drawMeter() {
    const key = st.air.toFixed(2);
    if (key === st.meterKey) return;
    st.meterKey = key;
    meter.draw((c, W, H) => {
      c.fillStyle = '#fffdf5'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#1d2b36'; c.font = '700 26px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('Sound heard', W / 2, 26);
      c.fillStyle = '#e9ecef'; c.fillRect(20, 60, W - 40, 50);
      c.fillStyle = st.air > 0.5 ? '#2a9d8f' : st.air > 0.15 ? '#e9a23b' : '#e63946';
      c.fillRect(20, 60, (W - 40) * st.air, 50);
      c.strokeStyle = '#1d2b36'; c.lineWidth = 3; c.strokeRect(20, 60, W - 40, 50);
      c.fillStyle = '#1d2b36'; c.font = '700 24px system-ui, sans-serif';
      c.fillText(st.air < 0.02 ? 'silence' : st.air > 0.6 ? 'loud' : 'quiet', W / 2, 140);
    });
  }

  // ---------- Readouts ----------
  const hz = f => (f >= 1000 ? `${(f).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : f >= 100 ? f.toFixed(0) : f.toFixed(1));
  function readout() {
    const s = st.step;
    if (s === 0) ui.readout(st.on ? `Speaker: <b>on</b>, vibrating ${st.f} times a second · Sound travels through air at about <b>343 m/s</b>` : 'Speaker: <b>off</b> · No vibration, so the air particles stay evenly spread: <b>no sound</b>');
    if (s === 1) ui.readout(`Shown at <b>${Math.round(st.speed * 100)}%</b> of the slow-motion speed · The red particle moves back and forth by about the same small amount every time`);
    if (s === 2) {
      const T = 1000 / st.f, lam = V_AIR / st.f;
      ui.readout(`Frequency f = <b>${st.f} Hz</b> · Period T = 1 ÷ f = <b>${fmt(T, 2)} ms</b><br>Wavelength λ = v ÷ f = 343 ÷ ${st.f} = <b>${fmt(lam, 2)} m</b>`);
    }
    if (s === 3) {
      const dB = 60 + 20 * Math.log10(st.amp);
      ui.readout(`Amplitude: <b>${fmt(st.amp, 2)}×</b> normal talking · Loudness: about <b>${Math.round(dB)} dB</b><br>Frequency stays <b>${st.f} Hz</b>, so the pitch does not change`);
    }
    if (s === 4) ui.readout(`Air left in the jar: <b>${Math.round(st.air * 100)}%</b> · ${st.air < 0.02 ? 'No air, so <b>no sound</b> gets out, though the hammer still hits the bell' : st.air < 0.3 ? 'Very little air: the sound is <b>faint</b>' : 'Plenty of air: you hear the bell <b>clearly</b>'}`);
    if (s === 5) {
      const t = tr => fmt(st.dist / tr.v, 2);
      ui.readout(`Time = distance ÷ speed, for <b>${st.dist} m</b>:<br>Air (343 m/s): <b>${t(tracks[0])} s</b> · Water (about 1500 m/s): <b>${t(tracks[1])} s</b> · Steel (about 5000 m/s): <b>${t(tracks[2])} s</b>`);
    }
    if (s === 6) {
      const f = st.hearF, zone = f < 20 ? '<b>infrasound</b>: too low for humans to hear' : f > 20000 ? '<b>ultrasound</b>: too high for humans to hear' : 'humans <b>can hear</b> this';
      ui.readout(`Frequency: <b>${hz(f)} Hz</b> · ${zone}`);
    }
    if (s === 7) {
      const t = 2 * st.echoD / V_AIR;
      ui.readout(`Cliff: <b>${st.echoD} m</b> away · Echo time t = 2 × ${st.echoD} ÷ 343 = <b>${fmt(t, 2)} s</b><br>So distance = speed × time ÷ 2 (the animation runs 3× slower)`);
    }
  }

  // ---------- Helpers ----------
  function hideAll() {
    for (const l of [speakerTag, micTag, markTag, squeezeTag, spreadTag, lambdaTag, bellTag, pumpTag, shoutTag, cliffTag, ...tracks.map(t => t.tag)]) l.show(false);
    parts.visible = true; marked.visible = restPin.visible = false; bracket.visible = false;
    scope.visible = scopePost.visible = false; chart.visible = chartPost.visible = false;
    rings.forEach(r => { r.material.opacity = 0; });
    arcs.forEach(a => { a.visible = false; });
  }
  const setEcho = d => {
    st.echoD = d;
    cliff.position.set(mouth.x + d * ECHO_SCALE, 0, 0);
    st.echoT = 0;
  };

  function placeParticles() {
    const lam = lambdaVis(), k = 2 * Math.PI / lam, A = st.on ? 0.13 * st.amp : 0;
    for (let i = 0; i < N; i++) {
      const x0 = base[i * 3], ph = st.phase - k * (x0 - SRC);
      const u = A * Math.sin(ph);
      m4.makeTranslation(x0 + u, base[i * 3 + 1], base[i * 3 + 2]);
      parts.setMatrixAt(i, m4);
      // Colour by squeeze: dark blue where particles crowd together, pale where they spread out.
      col.lerpColors(cSpread, cSqueeze, st.on ? 0.5 + 0.5 * Math.cos(ph) * Math.min(1, st.amp) : 0.35);
      parts.setColorAt(i, col);
      if (i === MARK) marked.position.set(x0 + u, base[i * 3 + 1], base[i * 3 + 2] + 0.05);
    }
    parts.instanceMatrix.needsUpdate = true;
    parts.instanceColor.needsUpdate = true;
    // Compression centres sit where phase = 2πn: x = SRC + (phase − 2πn) / k.
    const first = SRC + ((st.phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / k;
    let xc = first;
    while (xc - lam >= X0 + 0.2) xc -= lam;
    while (xc < X0 + 0.2) xc += lam;
    // Pick a compression near the middle for the labels.
    let xm = xc;
    while (xm + lam < 0.6) xm += lam;
    squeezeAt.position.set(xm, 2.25, 0);
    spreadAt.position.set(xm + lam / 2 <= X1 ? xm + lam / 2 : xm - lam / 2, 0.42, 0.5);
    bracket.position.set(xc, 2.3, 0.5);
    brInner.scale.x = lam; brR.position.x = lam; lambdaAt.position.x = lam / 2;
    bracket.visible = st.showBracket && xc + lam <= X1 + 0.05;
    if (lambdaTag.visible !== bracket.visible) lambdaTag.show(bracket.visible);
  }

  setEcho(170);

  // ---------- Steps ----------
  const station = { radius: 3.4, width: 5.6, yaw: 0.22, pitch: 0.2, target: [0, 2.0, 0] };
  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? 8 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.slider = null;
      hideAll();
      st.f = 400; st.amp = 1; st.on = true; st.speed = 1; st.showMark = false; st.showBracket = false;
      moveSun(0);
      if (i === 0) {
        view(station);
        st.amp = 1.3;
        speakerTag.show(true); squeezeTag.show(true); spreadTag.show(true);
        ui.buttons([
          { label: 'Speaker on', on: true, onClick: () => { st.on = true; readout(); } },
          { label: 'Speaker off', onClick: () => { st.on = false; readout(); } },
        ]);
      }
      if (i === 1) {
        view({ radius: 2.9, yaw: 0.15, pitch: 0.16, target: [0.2, 1.4, 0] });
        st.amp = 1.3; st.showMark = true; marked.visible = restPin.visible = true; markTag.show(true);
        squeezeTag.show(true);
        st.slider = ui.slider({ label: 'Slow motion', min: 0.1, max: 1, step: 0.05, value: 1, format: v => `${Math.round(v * 100)}%`, onInput: v => { st.speed = v; readout(); } });
      }
      if (i === 2) {
        view({ ...station, pitch: 0.16, target: [0.3, 2.6, 0], radius: 3.8 });
        scope.visible = scopePost.visible = true; st.showBracket = true; micTag.show(true); speakerTag.show(true);
        st.slider = ui.slider({ label: 'Frequency', min: 200, max: 1000, step: 10, value: st.f, unit: ' Hz', onInput: v => { st.plan = []; st.f = v; readout(); } });
        st.plan = [[0.6, () => demoF(500)], [1.2, () => demoF(600)], [1.8, () => demoF(700)]];
      }
      if (i === 3) {
        view({ ...station, pitch: 0.16, target: [0.3, 2.6, 0], radius: 3.8, yaw: -0.15 });
        scope.visible = scopePost.visible = true; micTag.show(true); speakerTag.show(true);
        st.amp = 0.5;
        st.slider = ui.slider({ label: 'Amplitude', min: 0.25, max: 1.5, step: 0.05, value: st.amp, format: v => `${v.toFixed(2)}×`, onInput: v => { st.plan = []; st.amp = v; readout(); } });
        st.plan = [[0.7, () => demoA(0.8)], [1.4, () => demoA(1.1)], [2.1, () => demoA(1.5)]];
      }
      if (i === 4) {
        moveSun(BELL_X);
        view({ radius: 3.2, width: 4.9, yaw: 0.2, pitch: 0.28, target: [BELL_X - 0.2, 1.4, 0] });
        parts.visible = false;
        bellTag.show(true); pumpTag.show(true);
        st.air = 1;
        st.slider = ui.slider({ label: 'Air left in the jar', min: 0, max: 100, step: 1, value: 100, unit: '%', onInput: v => { st.plan = []; st.air = v / 100; readout(); } });
        st.plan = [];
        for (let j = 1; j <= 14; j++) st.plan.push([0.4 + j * 0.16, () => { st.air = Math.max(0.1, 1 - j * 0.065); st.slider?.set(Math.round(st.air * 100)); readout(); }]);
      }
      if (i === 5) {
        moveSun(RACE_X);
        view({ radius: 3.4, width: 6.0, yaw: 0.0, pitch: 0.75, target: [RACE_X - 0.2, 0.6, 0] });
        parts.visible = false;
        tracks.forEach(t => t.tag.show(true));
        st.raceT = -0.3;
        st.slider = ui.slider({ label: 'Distance', min: 100, max: 2000, step: 100, value: st.dist, unit: ' m', onInput: v => { st.dist = v; readout(); } });
        ui.buttons([{ label: 'Race again', onClick: () => { st.raceT = -0.2; } }]);
      }
      if (i === 6) {
        view({ radius: 3.0, width: 3.6, yaw: 0.15, pitch: 0.1, target: [-1.6, 2.7, 0] });
        parts.visible = false; chart.visible = chartPost.visible = true; speakerTag.show(true);
        st.hearF = 1000;
        const toF = s => { const f = 10 * Math.pow(10, s / 25); return f >= 1000 ? Math.round(f / 100) * 100 : f >= 100 ? Math.round(f / 10) * 10 : Math.round(f); };
        const toS = f => 25 * Math.log10(f / 10);
        st.slider = ui.slider({ label: 'Frequency', min: 0, max: 100, step: 0.5, value: toS(1000), format: s => `${hz(toF(s))} Hz`, onInput: s => { st.plan = []; st.hearF = toF(s); readout(); } });
        const demo = f => { const sv = Math.round(toS(f) * 2) / 2; st.hearF = toF(sv); st.slider?.set(sv); readout(); };
        st.plan = [[0.8, () => demo(15)], [1.8, () => demo(30000)], [3.0, () => demo(440)]];
      }
      if (i === 7) {
        moveSun(ECHO_X);
        view({ radius: 3.2, width: 6, yaw: 0.0, pitch: 0.18, target: [ECHO_X + 0.4, 2.0, 0] });
        parts.visible = false; shoutTag.show(true); cliffTag.show(true);
        setEcho(170);
        st.slider = ui.slider({ label: 'Distance to the cliff', min: 50, max: 340, step: 10, value: st.echoD, unit: ' m', onInput: v => { setEcho(v); readout(); } });
      }
      if (isQuiz) {
        view({ ...station, yaw: -0.3, pitch: 0.28, radius: 3.8 });
        st.amp = 1.2; speakerTag.show(true); scope.visible = scopePost.visible = true;
      }
      readout();
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step;
      // Station A: wave in the air block and the speaker cone.
      const fVis = s === 6 ? kit.clamp(st.hearF / SLOW, 0.3, 5) : st.f / SLOW;
      st.phase += 2 * Math.PI * fVis * dt * (s === 1 ? st.speed : 1);
      if (st.phase > 2000 * Math.PI) st.phase -= 2000 * Math.PI;
      const coneAmp = s === 6 ? 0.05 : (st.on ? 0.13 * st.amp : 0);
      cone.position.x = SRC - 0.06 + coneAmp * Math.sin(st.phase);
      if (parts.visible) placeParticles();
      if (scope.visible) drawScope();
      if (chart.visible) drawChart();

      // Station B: bell, hammer, air in the jar and fading rings.
      if (s === 4) {
        const hit = Math.abs(Math.sin(st.time * 9));
        hammer.rotation.z = 0.32 + 0.12 * hit;
        gong.scale.setScalar(1 + 0.02 * Math.sin(st.time * 70) * hit);
        const n = Math.round(JN * st.air);
        jarAir.count = n;
        for (let i = 0; i < n; i++) {
          const j = i * 3, w = st.time * (1.5 + rand(i) * 2);
          m4.makeTranslation(jarBase[j] + 0.07 * Math.sin(w + i), jarBase[j + 1] + 0.07 * Math.sin(w * 1.3 + i * 2), jarBase[j + 2] + 0.07 * Math.cos(w * 0.9 + i));
          jarAir.setMatrixAt(i, m4);
        }
        jarAir.instanceMatrix.needsUpdate = true;
        st.ringT += dt;
        rings.forEach((r, k) => {
          const p = ((st.ringT * 0.55 + k / 3) % 1);
          r.scale.setScalar(1.5 + p * 2.6);
          r.material.opacity = st.air * (1 - p) * 0.9;
        });
        drawMeter();
      }
      meter.visible = meterPost.visible = s === 4;

      // Station C: three pulses race along their tracks (air takes 4.5 s to cross).
      if (s === 5) {
        st.raceT += dt;
        const tapA = kit.clamp(-st.raceT / 0.3, 0, 1);
        tap.rotation.z = -0.5 * tapA;
        for (const tr of tracks) {
          const vVis = (TRACK / 4.5) * tr.v / V_AIR, x = TX0 + Math.max(0, st.raceT) * vVis;
          const there = x >= TRACK / 2;
          tr.pulse.position.x = Math.min(TRACK / 2, x);
          tr.pulse.visible = st.raceT >= 0 && !there;
          tr.cloth.material.color.setHex(there ? 0x2a9d8f : 0xe63946);
        }
        if (st.raceT > 6.5) st.raceT = -0.3;
      } else tracks.forEach(t => { t.pulse.visible = false; });

      // Station D: the shout spreads to the cliff and the echo comes back.
      if (s === 7) {
        const D = st.echoD * ECHO_SCALE, vVis = V_AIR * ECHO_SCALE / ECHO_SLOW;
        const total = 2 * D / vVis, cycle = Math.max(total + 1.4, 3);
        st.echoT += dt;
        if (st.echoT > cycle) st.echoT -= cycle;
        arcs.forEach((a, k) => {
          const sDist = (st.echoT - 0.25) * vVis - k * 0.22;
          if (sDist <= 0.05 || sDist >= 2 * D) { a.visible = false; return; }
          if (sDist < D) a.set(mouth.x, mouth.y, sDist, 1);
          else a.set(mouth.x + 2 * D, mouth.y, sDist, -1);
        });
        const back = st.echoT * vVis >= 2 * D + 0.25 * vVis;
        const txt = st.echoT < 0.6 ? 'Shout!' : back ? 'Echo!' : 'Listening…';
        if (shoutTag.el.textContent !== txt) shoutTag.text = txt;
      }
      return true;
    },
  };

  function demoF(f) { st.f = f; st.slider?.set(f); readout(); }
  function demoA(a) { st.amp = a; st.slider?.set(a); readout(); }
}
