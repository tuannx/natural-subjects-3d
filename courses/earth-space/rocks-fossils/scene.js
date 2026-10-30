// Rocks and fossils: a cut-away block of rock. Layers settle one by one (sea layers, then land
// layers), a fish becomes a fossil, fossils are dug out, the land is pushed up above the sea and a
// river cuts a canyon that shows the layers in its walls.

const X0 = 3;          // half width of the block
const DZ = 2.4;        // depth of the block (front face at z = DZ / 2)
const BASE = 0.4;      // older dark rock at the bottom
const LIFT = 2.5;      // how far the land rises
const SLOPE = 0.62;    // canyon wall: sideways distance per unit of depth
// Layers from the bottom (oldest) up. sea: laid down under the sea (true) or on land (false).
const LAYERS = [
  { name: 'limestone', color: 0x9fb0bd, t: 0.45, sea: true },
  { name: 'sandstone', color: 0xd9b77a, t: 0.35, sea: true },
  { name: 'grey shale', color: 0x8e9c86, t: 0.3, sea: true },
  { name: 'pale limestone', color: 0xe8dfc4, t: 0.4, sea: true },
  { name: 'red sandstone', color: 0xc8734f, t: 0.35, sea: false },
  { name: 'mudstone', color: 0xa98466, t: 0.3, sea: false },
  { name: 'yellow sandstone', color: 0xe6c88f, t: 0.35, sea: false },
];
const N = LAYERS.length;
const BOTTOMS = []; { let y = BASE; for (const l of LAYERS) { BOTTOMS.push(y); y += l.t; } }
const TOP = BOTTOMS[N - 1] + LAYERS[N - 1].t;
const SEA_HIGH = BOTTOMS[4] + 0.75, SEA_LOW = BOTTOMS[4] - 0.12;
const FISH = { x: 1.2, y: BOTTOMS[2] + 0.12 };       // where the fish settles (on the mud, part way through layer 2)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  scene.background = new THREE.Color(0xdcefff);
  kit.lights(scene, { sun: [5, 9, 7] });
  const C = h => new THREE.Color(h);
  const seabed = kit.mesh(new THREE.CircleGeometry(16, 48), kit.mat(0xd8c9a0), [0, 0, 0], scene);
  seabed.rotation.x = -Math.PI / 2; seabed.castShadow = false;

  // Sea: a clear box from the sea floor up to sea level (tints what is under water).
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x3f8fd2, transparent: true, opacity: 0.22, roughness: 0.2, depthWrite: false });
  const sea = new THREE.Mesh(new THREE.BoxGeometry(11, 1, 6.5), seaMat);
  sea.renderOrder = 2;
  scene.add(sea);
  const seaTopMat = new THREE.MeshStandardMaterial({ color: 0x3f8fd2, transparent: true, opacity: 0.35, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide });
  const seaTop = new THREE.Mesh(new THREE.PlaneGeometry(11, 6.5), seaTopMat);
  seaTop.rotation.x = -Math.PI / 2; seaTop.renderOrder = 3;
  scene.add(seaTop);

  // The rock block. Each layer is two prism pieces (left and right of the canyon line, the right one
  // mirrored), so the canyon is just a V cut whose bottom moves down.
  const block = new THREE.Group();
  scene.add(block);
  const grain = grainTexture(THREE);
  const pieces = [];
  const makeLayer = (color) => {
    const geo = prismGeometry(THREE);
    const mat = kit.mat(color, { map: grain, roughness: 0.95 });
    const L = new THREE.Mesh(geo, mat), R = new THREE.Mesh(geo, mat);
    R.scale.x = -1;
    for (const m of [L, R]) { m.castShadow = m.receiveShadow = true; block.add(m); }
    return { geo, mat, base: C(color) };
  };
  const base = makeLayer(0x5e5a66);
  const layers = LAYERS.map(l => makeLayer(l.color));
  pieces.push(base, ...layers);

  // River at the bottom of the canyon (or on top before it cuts down).
  const river = kit.mesh(new THREE.BoxGeometry(0.16, 0.03, DZ + 0.02), new THREE.MeshStandardMaterial({ color: 0x3d8fd6, roughness: 0.2 }), [0, 0, 0], block);
  river.castShadow = false;
  const riverFlow = Array.from({ length: 6 }, () => { const m = kit.mesh(new THREE.BoxGeometry(0.05, 0.012, 0.18), new THREE.MeshBasicMaterial({ color: 0xdff2ff }), [0, 0, 0], block); m.castShadow = false; return m; });

  // Fossils: pictures on the cut face of their layer.
  const face = DZ / 2 + 0.004;
  const haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(THREE), transparent: true, opacity: 0.55, depthWrite: false });
  const decal = (tex, w, h, x, y, color) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, color, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(x, y, face);
    block.add(m);
    // A pale patch of freshly cleaned rock behind the fossil, so it stands out.
    const halo = new THREE.Mesh(m.geometry, haloMat);
    halo.scale.setScalar(1.3); halo.position.z = -0.002; halo.renderOrder = -1;
    m.add(halo);
    return m;
  };
  const stone = 0x2e2520, bone = 0xf3e7c9;
  const fossils = {
    shell: { mesh: decal(shellTexture(THREE), 0.4, 0.4, -1.75, BOTTOMS[0] + 0.22, stone), layer: 0, name: 'Shell' },
    fish: { mesh: decal(fishBonesTexture(THREE), 0.62, 0.27, FISH.x, FISH.y + 0.03, stone), layer: 2, name: 'Fish' },
    shell2: { mesh: decal(shellTexture(THREE), 0.26, 0.26, 2.0, BOTTOMS[3] + 0.2, stone), layer: 3, name: 'Shell' },
    fern: { mesh: decal(fernTexture(THREE), 0.32, 0.32, -2.05, BOTTOMS[4] + 0.17, stone), layer: 4, name: 'Fern' },
  };
  const fishSoft = decal(fishSoftTexture(THREE), 0.62, 0.27, FISH.x, FISH.y + 0.03, 0x7a6a58);
  // Covers for digging: lumps of rock over three fossils.
  const digOrder = ['shell', 'fish', 'fern'];
  const covers = digOrder.map(k => {
    const f = fossils[k], l = LAYERS[f.layer];
    const m = kit.mesh(new THREE.DodecahedronGeometry(0.2, 0), kit.mat(C(l.color).multiplyScalar(0.72), { map: grain, roughness: 1, flatShading: true }), [f.mesh.position.x, f.mesh.position.y, DZ / 2 + 0.01], block);
    m.scale.set(1.35, Math.min(0.75, (l.t - 0.05) / 0.4), 0.35);
    m.s0 = m.scale.clone();
    m.k = k;
    return m;
  });
  // Hammer for digging.
  const hammer = new THREE.Group();
  kit.mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), kit.mat(0xa0703c), [0, -0.21, 0], hammer);
  kit.mesh(new THREE.BoxGeometry(0.16, 0.06, 0.06), kit.mat(0x6c757d, { metalness: 0.6, roughness: 0.4 }), [0, -0.42, 0], hammer);
  hammer.visible = false;
  block.add(hammer);

  // The living fish for the fossil story.
  const fish = makeFish(THREE, kit);
  block.add(fish);

  // Particles: settling sand and mud, and rock dust when digging.
  const dot = dotTexture(THREE);
  const pts = (n, color, size) => {
    const arr = new Float32Array(n * 3), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: dot, transparent: true, depthWrite: false, alphaTest: 0.05 }));
    p.frustumCulled = false; p.arr = arr; p.n = n; p.visible = false;
    block.add(p);
    return p;
  };
  const silt = pts(220, 0xd9b77a, 0.05);
  const dust = pts(50, 0xcdb79a, 0.06);

  // Labels.
  const lab = (text, obj, cls) => { const l = label(text, obj, { cls }); l.show(false); return l; };
  const anchor = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); block.add(o); return o; };
  const tags = {
    oldest: lab('Oldest', anchor(-2.3, BOTTOMS[0] + 0.12, DZ / 2), 'cool'),
    youngest: lab('Youngest', anchor(-2.3, BOTTOMS[N - 1] + 0.12, DZ / 2), 'warm'),
    middle: lab('Middle', anchor(-2.3, BOTTOMS[3] + 0.12, DZ / 2)),
    fishF: lab('Fish fossil', anchor(FISH.x, FISH.y + 0.22, DZ / 2), 'warm'),
    river: lab('River', anchor(0, 0, DZ / 2)),
    sea: lab('Sea level', new THREE.Vector3(4.3, SEA_LOW + 0.02, 2.4), 'cool'),
    shell: lab('Shell: sea', anchor(-1.75, BOTTOMS[0] + 0.48, DZ / 2), 'cool'),
    fish: lab('Fish: sea', anchor(FISH.x, FISH.y + 0.25, DZ / 2), 'cool'),
    fern: lab('Fern: land', anchor(-2.05, BOTTOMS[4] + 0.42, DZ / 2), 'warm'),
  };

  // ---------- State ----------
  const st = {
    step: 0, time: 0, auto: false, quiz: false, D: N, U: 1, c: 1, sea: SEA_LOW, story: 1, hi: -1, hiT: 0,
    dug: 0, digT: -1, slider: null, dirty: true, msg: '',
  };
  const fmtTime = v => (v < 0.04 ? 'start' : v < 0.5 ? 'thousands of years' : 'millions of years');

  // Rebuild the layer shapes from D (layers laid down), c (canyon depth) and U (uplift).
  function rebuild() {
    block.position.y = st.U * LIFT;
    const yv = TOP - st.c * (TOP - BASE);           // bottom of the canyon (block coordinates)
    setPrism(base.geo, -st.U * LIFT, BASE, yv);
    let top = BASE;
    LAYERS.forEach((l, i) => {
      const t = l.t * clamp(st.D - i, 0, 1);
      const piece = layers[i];
      setPrism(piece.geo, BOTTOMS[i], BOTTOMS[i] + Math.max(t, 0.0005), yv);
      if (t > 0.001) top = BOTTOMS[i] + t;
    });
    layers.forEach((p, i) => { p.geo.drawRange.count = LAYERS[i].t * clamp(st.D - i, 0, 1) > 0.001 ? Infinity : 0; });
    st.top = top;
    // River: on top of the land, or at the bottom of the canyon.
    const ry = Math.min(top, yv) + 0.016;
    river.position.y = ry;
    river.visible = st.D >= N - 0.01 && st.U > 0.3;
    // Fossils show once their layer has buried them, unless the canyon has cut them away.
    for (const [k, f] of Object.entries(fossils)) {
      if (k === 'fish' && st.step === 3 && !st.quiz) continue;   // the fossil story controls it
      const y = f.mesh.position.y, hw = y > yv ? (y - yv) * SLOPE : 0;
      const buried = st.D > f.layer + 0.75;
      f.mesh.visible = buried && Math.abs(f.mesh.position.x) - 0.25 > hw;
    }
    covers.forEach(cv => { cv.visible = st.step === 4 && covers.indexOf(cv) >= st.dug; });
    st.dirty = false;
  }
  const seaLevelFor = D => lerp(SEA_HIGH, SEA_LOW, ss(N - 3.2, N - 2.9, D));

  function readout() {
    if (st.quiz) return;
    let msg = '';
    if (st.step === 0) msg = 'Seven layers of rock, from the oldest at the bottom to the youngest at the top.';
    if (st.step === 1) {
      const n = Math.min(N, Math.floor(st.D + 0.001)), cur = Math.min(N - 1, Math.floor(st.D));
      msg = `Layers so far: <b>${n} of ${N}</b>` + (st.D < N ? ` (now: ${LAYERS[cur].name}, laid down ${LAYERS[cur].sea ? 'under the sea' : 'on land'})` : '');
    }
    if (st.step === 2 && st.hi >= 0) {
      const which = st.hi === 0 ? 'the <b>oldest</b>: it formed first' : st.hi === N - 1 ? 'the <b>youngest</b>: it formed last' : 'in the <b>middle</b>: older than the layers above it, younger than the ones below';
      msg = `Layer ${st.hi + 1} from the bottom is ${which}.`;
    }
    if (st.step === 3) {
      const s = st.story;
      msg = s < 0.2 ? 'A fish swims in the sea.' : s < 0.4 ? 'The fish dies and sinks to the muddy sea floor.' : s < 0.6 ? 'Mud and sand cover it.' : s < 0.78 ? 'The soft parts rot away. Only the bones are left.' : 'Over millions of years the bones turn to stone: a <b>fossil</b>.';
    }
    if (st.step === 4) {
      const said = ['Dig to find a fossil.', 'A <b>sea shell</b> in the bottom layer: this place was under the sea.', 'A <b>fish</b>: still under the sea.', 'A <b>fern</b> higher up: later this place was dry land with plants.'];
      msg = said[st.dug];
    }
    if (st.step === 5) msg = st.U < 0.05 ? 'The rock layers are at sea level.' : st.U < 0.7 ? 'The land is <b>rising</b> out of the sea.' : 'The fish fossil is now <b>high above the sea</b>.';
    if (st.step === 6) msg = `Time: <b>${fmtTime(st.c)}</b>. The canyon is getting deeper.`;
    if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
  }

  function highlight(i) { st.hi = i; st.hiT = 0; tags.oldest.show(i === 0); tags.youngest.show(i === N - 1); tags.middle.show(i === 3); }
  function dig() {
    if (st.digT >= 0 || st.dug >= covers.length) return;
    st.digT = 0;
  }

  const views = {
    canyon: { radius: 3.6, yaw: 0.35, pitch: 0.22, target: [0, 3.3, 0] },
    build: { radius: 3.4, yaw: 0.25, pitch: 0.12, target: [0, 1.5, 0] },
    order: { radius: 3.3, yaw: 0.2, pitch: 0.1, target: [0, 1.55, 0.4] },
    story: { radius: 1.4, yaw: 0.15, pitch: 0.06, target: [FISH.x - 0.15, FISH.y + 0.3, 1.0] },
    dig: { radius: 3.2, yaw: 0.08, pitch: 0.06, target: [0, 1.45, 1.0] },
    rise: { radius: 4.4, yaw: 0.45, pitch: 0.16, target: [0, 2.5, 0] },
  };

  function set(D, U, c) { st.D = D; st.U = U; st.c = c; st.dirty = true; }

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.quiz = isQuiz; st.time = 0; st.auto = true; st.msg = ''; st.slider = null;
      st.hi = -1; st.dug = 0; st.digT = -1; hammer.visible = false; fish.visible = false; fishSoft.visible = false;
      silt.visible = dust.visible = false;
      Object.values(tags).forEach(t => t.show(false));
      layers.forEach(p => p.mat.emissive.setHex(0));
      fossils.fish.mesh.material.color.setHex(stone);
      if (i === 0) { set(N, 1, 1); go(views.canyon); }
      if (i === 1) {
        set(0, 0, 0); go(views.build);
        st.slider = ui.slider({ label: 'Time', min: 0, max: N, step: 0.01, value: 0, format: v => fmtTime(v / N), onInput: v => { st.auto = false; set(v, 0, 0); } });
      }
      if (i === 2) {
        set(N, 0, 0); go(views.order);
        const opts = [['Oldest layer', 0], ['Middle layer', 3], ['Youngest layer', N - 1]];
        st.row = ui.buttons(opts.map(([l, k], j) => ({ label: l, on: j === 0, onClick: () => { st.auto = false; highlight(k); } })));
        highlight(0);
      }
      if (i === 3) {
        set(2.4, 0, 0); go(views.story);
        st.story = 0; fossils.fish.mesh.visible = false;
        st.slider = ui.slider({ label: 'Time', min: 0, max: 1, step: 0.01, value: 0, format: s => (s < 0.2 ? 'alive' : s < 0.4 ? 'sinking' : s < 0.6 ? 'buried' : s < 0.78 ? 'bones left' : 'fossil'), onInput: v => { st.auto = false; st.story = v; } });
      }
      if (i === 4) {
        set(N, 0, 0); go(views.dig);
        ui.buttons([
          { label: 'Dig for a fossil', onClick: () => { st.auto = false; dig(); } },
          { label: 'Cover them up', onClick: () => { st.auto = false; st.dug = 0; st.digT = -1; hammer.visible = false; ['shell', 'fish', 'fern'].forEach(k => tags[k].show(false)); covers.forEach(cv => cv.scale.copy(cv.s0)); st.dirty = true; } },
        ]);
        covers.forEach(cv => cv.scale.copy(cv.s0));
      }
      if (i === 5) {
        set(N, 0, 0); go(views.rise);
        tags.sea.show(true); tags.fishF.show(true);
        st.slider = ui.slider({ label: 'Land rising', min: 0, max: 1, step: 0.01, value: 0, format: v => (v < 0.05 ? 'at sea level' : v < 0.7 ? 'rising' : 'high above the sea'), onInput: v => { st.auto = false; set(N, v, 0); } });
      }
      if (i === 6) {
        set(N, 1, 0); go(views.canyon);
        tags.river.show(true);
        st.slider = ui.slider({ label: 'Time', min: 0, max: 1, step: 0.01, value: 0, format: fmtTime, onInput: v => { st.auto = false; set(N, 1, v); } });
      }
      if (isQuiz) { st.auto = false; set(N, 1, 1); go({ ...views.canyon, yaw: -0.4, pitch: 0.28 }); }
      st.sea = seaLevelFor(st.D);
      rebuild();
      readout();
    },

    update(dt, t) {
      st.time += dt;
      let moving = false;
      if (st.auto && !st.quiz) {
        if (st.step === 1) { const v = clamp((st.time - 0.3) / 6 * N, 0, N); if (v !== st.D) { set(v, 0, 0); st.slider?.set(v); } }
        if (st.step === 2) { const order = [0, 3, N - 1], j = Math.floor(st.time / 2.5) % 3; if (order[j] !== st.hi) { highlight(order[j]); if (st.row) [...st.row.children].forEach((b, q) => b.classList.toggle('on', q === j)); } }
        if (st.step === 3) { const v = clamp((st.time - 0.3) / 6, 0, 1); if (v !== st.story) { st.story = v; st.slider?.set(v); } }
        if (st.step === 4) { const due = [0.4, 1.6, 2.8]; if (st.dug < 3 && st.time > due[st.dug] && st.digT < 0) dig(); }
        if (st.step === 5) { const v = ss(0.3, 4.3, st.time); if (v !== st.U) { set(N, v, 0); st.slider?.set(v); } }
        if (st.step === 6) { const v = clamp((st.time - 0.3) / 4.5, 0, 1); if (v !== st.c) { set(N, 1, v); st.slider?.set(v); } }
      }

      // The fossil story drives the layers too: buried, then more layers on top.
      if (st.step === 3 && !st.quiz) {
        const s = st.story;
        const D = s < 0.4 ? 2.4 : s < 0.6 ? lerp(2.4, 3, ss(0.4, 0.6, s)) : lerp(3, 4, ss(0.62, 1, s));
        if (Math.abs(D - st.D) > 1e-4) { st.D = D; st.dirty = true; }
        // Fish: swims, rolls over and sinks, then lies on the mud until it is covered.
        const swim = s < 0.2, sink = ss(0.2, 0.4, s);
        fish.visible = s < 0.52;
        const sx = FISH.x + (swim ? Math.sin(t * 1.4) * 0.35 : 0) * (1 - sink);
        fish.position.set(lerp(sx, FISH.x, sink), lerp(FISH.y + 0.55 + Math.sin(t * 2) * 0.03, FISH.y + 0.04, sink), DZ / 2 - 0.07);
        fish.rotation.set(sink * Math.PI * 0.95, 0, swim ? Math.cos(t * 1.4) * 0.15 : 0);
        fish.scale.x = swim && Math.cos(t * 1.4) > 0 ? -1 : 1;
        fish.tail.rotation.y = Math.sin(t * 9) * 0.5 * (1 - sink);
        // Under the mud: first the whole body, then only the bones, which slowly turn to stone.
        const soft = ss(0.48, 0.56, s) * (1 - ss(0.6, 0.72, s)), bones = ss(0.62, 0.74, s);
        fishSoft.visible = soft > 0.01; fishSoft.material.opacity = soft;
        fossils.fish.mesh.visible = bones > 0.01; fossils.fish.mesh.material.opacity = bones;
        fossils.fish.mesh.material.color.setHex(bone).lerp(C(stone), ss(0.78, 1, s));
        moving = true;
      } else fossils.fish.mesh.material.opacity = 1;

      // Settling sand and mud while layers build up (step 1 and the fossil story).
      const settling = (st.step === 1 || st.step === 3) && st.D < N && !st.quiz && (st.step !== 3 || st.story > 0.38);
      silt.visible = settling;
      if (settling) {
        const cur = Math.min(N - 1, Math.floor(st.D)), from = st.sea + 0.1;
        silt.material.color.setHex(LAYERS[cur].color);
        for (let k = 0; k < silt.n; k++) {
          const p = (t * 0.35 + rand(k)) % 1;
          const o = k * 3;
          silt.arr[o] = (rand(k + 100) * 2 - 1) * (X0 - 0.1);
          silt.arr[o + 1] = lerp(LAYERS[cur].sea ? from : st.top + 1.0, st.top + 0.02, p);
          silt.arr[o + 2] = (rand(k + 200) * 2 - 1) * (DZ / 2 - 0.05);
        }
        silt.geometry.attributes.position.needsUpdate = true;
        moving = true;
      }

      // Layer highlight pulses.
      if (st.step === 2 && st.hi >= 0) {
        st.hiT += dt;
        layers.forEach((p, i) => p.mat.emissive.setScalar(i === st.hi ? 0.22 + 0.12 * Math.sin(st.hiT * 5) : 0));
        moving = true;
      }

      // Digging: the hammer taps, dust flies, the cover crumbles away.
      if (st.digT >= 0) {
        st.digT += dt;
        const cv = covers[st.dug], k = Math.min(1, st.digT / 0.9);
        hammer.visible = k < 1;
        hammer.position.set(cv.position.x + 0.32, cv.position.y + 0.3, DZ / 2 + 0.15);
        hammer.rotation.z = 0.9 + Math.abs(Math.sin(st.digT * 14)) * 0.6;
        cv.scale.copy(cv.s0).multiplyScalar(Math.max(0.001, 1 - ss(0.3, 0.9, k)));
        dust.visible = k < 1;
        for (let j = 0; j < dust.n; j++) {
          const a = rand(j + 40) * Math.PI * 2, r = k * (0.15 + rand(j) * 0.35), o = j * 3;
          dust.arr[o] = cv.position.x + Math.cos(a) * r; dust.arr[o + 1] = cv.position.y + Math.sin(a) * r * 0.6 - k * k * 0.3; dust.arr[o + 2] = DZ / 2 + 0.05 + rand(j + 9) * 0.2;
        }
        dust.geometry.attributes.position.needsUpdate = true;
        if (k >= 1) { tags[cv.k].show(true); st.dug++; st.digT = -1; st.dirty = true; }
        moving = true;
      }

      // River ripples.
      if (river.visible) {
        riverFlow.forEach((m, k) => { m.visible = true; m.position.set(0, river.position.y + 0.012, -DZ / 2 + ((t * 0.4 + k / 6) % 1) * DZ); });
        tags.river.at.position.set(0, river.position.y + 0.1, DZ / 2);
        moving = moving || st.step === 6 || st.step === 0;
      } else riverFlow.forEach(m => { m.visible = false; });

      // Sea level: high while the sea layers form, lower once the land layers start.
      moving = kit.follow(st, 'sea', seaLevelFor(st.D), dt, 3) || moving;
      sea.scale.y = st.sea; sea.position.y = st.sea / 2; seaTop.position.y = st.sea;

      if (st.dirty) { rebuild(); moving = true; }
      readout();
      return moving;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// A prism whose cross-section (in x, y) is the left part of a layer [a, b], cut by a V-shaped
// canyon with its bottom at yv on the line x = 0. Five corners, always convex:
// (-X0, a), (g(a), a), (g(m), m), (g(b), b), (-X0, b) with g(y) = 0 below yv and -(y - yv) * SLOPE above.
function prismGeometry(THREE) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(30 * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(30 * 2), 2));
  const idx = [0, 1, 2, 0, 2, 3, 0, 3, 4, 5, 7, 6, 5, 8, 7, 5, 9, 8];
  for (let e = 0; e < 5; e++) { const o = 10 + e * 4; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
  g.setIndex(idx);
  return g;
}
const PX = new Float32Array(5), PY = new Float32Array(5);
function setPrism(geo, a, b, yv) {
  const gx = y => (y <= yv ? 0 : -(y - yv) * SLOPE);
  const m = clamp(yv, a, b);
  PX[0] = -X0; PY[0] = a; PX[1] = Math.max(-X0, gx(a)); PY[1] = a; PX[2] = Math.max(-X0, gx(m)); PY[2] = m;
  PX[3] = Math.max(-X0, gx(b)); PY[3] = b; PX[4] = -X0; PY[4] = b;
  const p = geo.attributes.position.array, n = geo.attributes.normal.array, uv = geo.attributes.uv.array, zf = DZ / 2;
  const put = (v, x, y, z, nx, ny, nz, u, w) => { p[v * 3] = x; p[v * 3 + 1] = y; p[v * 3 + 2] = z; n[v * 3] = nx; n[v * 3 + 1] = ny; n[v * 3 + 2] = nz; uv[v * 2] = u; uv[v * 2 + 1] = w; };
  for (let k = 0; k < 5; k++) {
    put(k, PX[k], PY[k], zf, 0, 0, 1, PX[k] * 0.35, PY[k] * 0.35);
    put(5 + k, PX[k], PY[k], -zf, 0, 0, -1, -PX[k] * 0.35, PY[k] * 0.35);
  }
  for (let e = 0; e < 5; e++) {
    const k0 = e, k1 = (e + 1) % 5, ex = PX[k1] - PX[k0], ey = PY[k1] - PY[k0], len = Math.hypot(ex, ey);
    const nx = len > 1e-6 ? ey / len : 0, ny = len > 1e-6 ? -ex / len : 1, o = 10 + e * 4;
    put(o, PX[k0], PY[k0], zf, nx, ny, 0, (PX[k0] + PY[k0]) * 0.35, zf * 0.35);
    put(o + 1, PX[k1], PY[k1], zf, nx, ny, 0, (PX[k1] + PY[k1]) * 0.35, zf * 0.35);
    put(o + 2, PX[k0], PY[k0], -zf, nx, ny, 0, (PX[k0] + PY[k0]) * 0.35, -zf * 0.35);
    put(o + 3, PX[k1], PY[k1], -zf, nx, ny, 0, (PX[k1] + PY[k1]) * 0.35, -zf * 0.35);
  }
  geo.attributes.position.needsUpdate = geo.attributes.normal.needsUpdate = geo.attributes.uv.needsUpdate = true;
  geo.computeBoundingSphere();
}

function canvasTex(THREE, w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function grainTexture(THREE) {
  const t = canvasTex(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const v = 200 + Math.floor(rand(i) * 55);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(rand(i + 1000) * w, rand(i + 2000) * h, 1 + rand(i + 3000) * 2, 1 + rand(i + 4000) * 1.5);
    }
    g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 1;
    for (let y = 6; y < h; y += 11 + Math.floor(rand(y) * 8)) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + rand(y + 5) * 3 - 1.5); g.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function dotTexture(THREE) {
  return canvasTex(THREE, 32, 32, (g) => {
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.6, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  }, false);
}
// Fossil pictures are drawn in white so the material colour can tint them (bone or stone).
function shellTexture(THREE) {
  return canvasTex(THREE, 128, 128, (g) => {
    g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.1) { const r = 4 + a * 3.0; const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.lineWidth = 3.5;
    for (let a = 1.5; a < Math.PI * 6; a += 0.45) { const r = 4 + a * 3.0, r2 = 4 + (a + Math.PI * 2) * 3.0; if (r2 > 62) continue; g.beginPath(); g.moveTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); g.lineTo(64 + Math.cos(a) * r2, 64 + Math.sin(a) * r2); g.stroke(); }
  });
}
function haloTexture(THREE) {
  return canvasTex(THREE, 64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,250,235,1)'); r.addColorStop(0.65, 'rgba(255,250,235,0.7)'); r.addColorStop(1, 'rgba(255,250,235,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
}
function fishBonesTexture(THREE) {
  return canvasTex(THREE, 256, 110, (g) => {
    g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineCap = 'round';
    g.lineWidth = 7; g.beginPath(); g.moveTo(40, 55); g.quadraticCurveTo(120, 48, 196, 56); g.stroke();      // spine
    g.lineWidth = 4;
    for (let i = 0; i < 12; i++) { const x = 62 + i * 11, y = 52 + (i - 6) * 0.3, len = 30 - Math.abs(i - 4) * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y - len * 0.8); g.moveTo(x, y + 2); g.lineTo(x + 6, y + len * 0.8); g.stroke(); }
    g.lineWidth = 4; g.beginPath(); g.ellipse(32, 55, 20, 17, 0, 0, Math.PI * 2); g.stroke();            // skull
    g.beginPath(); g.arc(26, 50, 4, 0, Math.PI * 2); g.fill();                                           // eye socket
    g.lineWidth = 3;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(196, 56); g.lineTo(240, 56 + i * 11); g.stroke(); }  // tail
  });
}
function fishSoftTexture(THREE) {
  return canvasTex(THREE, 256, 110, (g) => {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(110, 55, 98, 34, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(190, 55); g.lineTo(246, 22); g.lineTo(238, 55); g.lineTo(246, 88); g.closePath(); g.fill();
  });
}
function fernTexture(THREE) {
  return canvasTex(THREE, 128, 128, (g) => {
    g.strokeStyle = '#ffffff'; g.lineCap = 'round'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(20, 118); g.quadraticCurveTo(60, 70, 108, 12); g.stroke();
    g.lineWidth = 3;
    for (let i = 1; i < 11; i++) {
      const t = i / 11, x = lerp(20, 108, t) - Math.sin(t * Math.PI) * 10, y = lerp(118, 12, t), len = 24 * (1 - t * 0.7);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - len, y - len * 0.35); g.moveTo(x, y); g.lineTo(x + len * 0.4, y + len * 0.2 - len); g.stroke();
    }
  });
}
function makeFish(THREE, kit) {
  const f = new THREE.Group();
  const body = kit.mesh(new THREE.SphereGeometry(1, 16, 12), kit.mat(0x7fa7c9, { roughness: 0.4, metalness: 0.2 }), [0, 0, 0], f);
  body.scale.set(0.22, 0.085, 0.05);
  const tail = new THREE.Group();
  tail.position.x = 0.2;
  f.add(tail);
  const fin = kit.mesh(new THREE.ConeGeometry(0.08, 0.14, 3), kit.mat(0x5f8db5), [0.07, 0, 0], tail);
  fin.rotation.z = Math.PI / 2; fin.scale.z = 0.3;
  const eye = kit.mesh(new THREE.SphereGeometry(0.016, 8, 6), kit.mat(0x1d2b36), [-0.15, 0.02, 0.045], f);
  eye.castShadow = false;
  f.tail = tail;
  f.visible = false;
  return f;
}
