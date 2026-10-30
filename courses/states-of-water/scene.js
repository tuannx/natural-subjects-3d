// Ice, water and steam: a closed glass box of water particles. Temperature decides how they move:
// solid = wiggle in neat rows, liquid = slide around at the bottom, gas = fly fast and fill the box.
const N = 216;                         // 6 x 6 x 6 particles
const PR = 0.15;                       // particle radius
const BX = 1.2, BY = 3.4, BZ = 1.2;    // inside of the box: x and z from -B to B, y from 0 to BY
const D0 = 0.3;                        // liquid particles rest touching each other
const LAT = 0.33;                      // spacing in ice: a little wider, so ice takes more room than water
const TMIN = -20, TMAX = 120;
const COLORS = { solid: 0xd8f1ff, liquid: 0x2f86e6, gas: 0xa8d5ff };
const NAMES = { solid: 'Ice (solid)', liquid: 'Water (liquid)', gas: 'Steam (gas)' };
const EXAMPLES = {
  solid: 'like ice cubes in a freezer, or snow in winter.',
  liquid: 'like rain, rivers and the water you drink.',
  gas: 'like the invisible water vapour in the air.',
};

const WIDE = { radius: 2.6, yaw: 0.35, pitch: 0.25, target: [0.3, 1.75, 0] };
const CLOSE = { radius: 2.3, yaw: -0.45, pitch: 0.45, target: [0.3, 1.5, 0] };
const LOW = { radius: 2.4, yaw: 0.75, pitch: 0.14, target: [0.3, 1.6, 0] };
const TALL = { radius: 2.5, yaw: -0.25, pitch: 0.3, target: [0.3, 1.8, 0] };
const SIDE = { radius: 2.6, yaw: 0.95, pitch: 0.35, target: [0.3, 1.75, 0] };
const OTHER = { radius: 2.7, yaw: -0.75, pitch: 0.2, target: [0.3, 1.75, 0] };

const stateOf = T => (T < 0 ? 'solid' : T < 100 ? 'liquid' : 'gas');

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xe9dcc6, sky: 0xdff1ff, radius: 10 }).position.y = -0.13; // table top under the hot plate
  kit.lights(scene, { sun: [4, 8, 6], shadows: false });

  // Glass box with a lid, drawn as a faint glass skin plus its edges.
  const boxGeo = new THREE.BoxGeometry(BX * 2 + 0.04, BY + 0.04, BZ * 2 + 0.04);
  boxGeo.translate(0, BY / 2, 0);
  const glass = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.14, depthWrite: false, roughness: 0.1 }));
  scene.add(glass);
  scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({ color: 0x7fa6c4 })));

  // Hot or cold plate under the box: glows orange when heating, blue when cooling.
  const plateMat = kit.mat(0x6d7782, { emissive: 0x000000 });
  const plate = kit.mesh(new THREE.BoxGeometry(BX * 2 + 0.3, 0.12, BZ * 2 + 0.3), plateMat, [0, -0.06, 0], scene);
  plate.castShadow = false;

  // Thermometer beside the box: glass tube, red liquid, bulb, marks at 0 °C and 100 °C.
  const TX = BX + 0.55, T0 = 0.45, TH = 3.0;
  const tY = T => T0 + ((kit.clamp(T, TMIN, TMAX) - TMIN) / (TMAX - TMIN)) * TH;
  const thermo = new THREE.Group();
  thermo.position.set(TX, 0, 0);
  scene.add(thermo);
  thermo.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, TH + 0.35, 20, 1, true).translate(0, T0 + TH / 2, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })));
  const red = kit.mat(0xe23b2e);
  kit.mesh(new THREE.SphereGeometry(0.17, 20, 12), red, [0, T0 - 0.1, 0], thermo);
  const column = kit.mesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 12).translate(0, 0.5, 0), red, [0, T0 - 0.1, 0], thermo);
  for (const T of [0, 100]) kit.mesh(new THREE.BoxGeometry(0.34, 0.025, 0.025), kit.mat(0x1d2b36), [0, tY(T), 0], thermo);

  // Particles: one instanced mesh (one draw call) plus one orange particle to follow.
  const ballGeo = new THREE.SphereGeometry(PR, 12, 8);
  // Each particle is coloured by what it is doing: ice, liquid water, or vapour that has escaped.
  const balls = new THREE.InstancedMesh(ballGeo, kit.mat(0xffffff, { roughness: 0.35 }), N - 1);
  balls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  balls.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array((N - 1) * 3), 3);
  balls.instanceColor.setUsage(THREE.DynamicDrawUsage);
  scene.add(balls);
  const tint = Object.fromEntries(Object.entries(COLORS).map(([k, c]) => [k, new THREE.Color(c)]));
  const orange = new THREE.Color(0xff8a2a);
  const starMat = kit.mat(0xffffff, { roughness: 0.35 });
  const star = kit.mesh(ballGeo, starMat, [0, 0, 0], scene);
  star.castShadow = false;
  star.renderOrder = 2;
  const STAR = N - 1;

  const tags = {
    state: label('', new THREE.Vector3(-0.5, BY + 0.3, 0), { cls: 'big cool' }),
    temp: label('', new THREE.Vector3(TX, T0 + TH + 0.25, 0), { cls: 'warm' }),
    zero: label('0 °C', new THREE.Vector3(TX + 0.55, tY(0) - 0.05, 0)),
    hundred: label('100 °C', new THREE.Vector3(TX + 0.6, tY(100) - 0.05, 0)),
    star: label('One particle', star),
  };

  // Simulation state. Positions and velocities live in flat arrays.
  const P = new Float32Array(N * 3), V = new Float32Array(N * 3), A = new Float32Array(N * 3), H = new Float32Array(N * 3);
  let seed = 1, phase = 'liquid', freeCount = 0;
  const free = new Uint8Array(N); // 1 = this particle has evaporated out of the liquid
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.732; // about a bell curve with spread 1

  const st = { T: 20, target: 20, rate: 0, auto: false, autoT: 0, quiz: false, step: 0 };
  let slider = null, autoBox = null, syncing = false, lastReadout = '', lastTag = '';

  // Put particle i at lattice spot (a, b, c) of the ice block.
  const setHome = (i, a, b, c) => { H[i * 3] = (a - 2.5) * LAT; H[i * 3 + 1] = PR + 0.01 + b * LAT; H[i * 3 + 2] = (c - 2.5) * LAT; };

  // When water freezes, give each particle the nearest-ish lattice spot: sort by height into layers,
  // each layer by x into rows, each row by z.
  function assignHomes() {
    const idx = [...Array(N).keys()].sort((a, b) => P[a * 3 + 1] - P[b * 3 + 1]);
    for (let b = 0; b < 6; b++) {
      const layer = idx.slice(b * 36, b * 36 + 36).sort((p, q) => P[p * 3] - P[q * 3]);
      for (let a = 0; a < 6; a++) {
        const row = layer.slice(a * 6, a * 6 + 6).sort((p, q) => P[p * 3 + 2] - P[q * 3 + 2]);
        row.forEach((i, c) => setHome(i, a, b, c));
      }
    }
  }

  // Start fresh in the state that belongs to temperature T, the same way every time (for videos).
  function reset(T) {
    seed = 7;
    st.T = st.target = T; st.rate = 0;
    phase = stateOf(T);
    V.fill(0); free.fill(0); freeCount = 0;
    for (let i = 0; i < N; i++) {
      const a = i % 6, c = Math.floor(i / 6) % 6, b = Math.floor(i / 36);
      setHome(i, a, b, c);
      if (phase === 'solid') { P[i * 3] = H[i * 3]; P[i * 3 + 1] = H[i * 3 + 1]; P[i * 3 + 2] = H[i * 3 + 2]; }
      else if (phase === 'liquid') { // loose layers of 8 x 8 on the floor
        const k = i % 64, L = Math.floor(i / 64);
        P[i * 3] = -BX + PR + 0.02 + (k % 8) * 0.3 + rnd() * 0.02;
        P[i * 3 + 1] = PR + 0.01 + L * 0.27;
        P[i * 3 + 2] = -BZ + PR + 0.02 + Math.floor(k / 8) * 0.3 + rnd() * 0.02;
      } else {
        P[i * 3] = (rnd() * 2 - 1) * (BX - PR);
        P[i * 3 + 1] = PR + rnd() * (BY - 2 * PR);
        P[i * 3 + 2] = (rnd() * 2 - 1) * (BZ - PR);
        for (let k = 0; k < 3; k++) V[i * 3 + k] = gauss() * 2;
      }
    }
    // A few warm-up steps so the starting picture already looks natural.
    for (let k = 0; k < 40; k++) simulate(1 / 60);
    writeMatrices();
  }

  // How many particles have escaped from warm liquid water as vapour (evaporation).
  const vapourCount = T => (T <= 0 ? 0 : Math.round(N * (0.005 + 0.06 * (T / 100) ** 2)));

  // Evaporation takes the highest particles; condensation brings back the lowest vapour particles.
  function updateFree(want) {
    while (freeCount !== want) {
      const up = freeCount < want;
      let best = -1;
      for (let i = 0; i < N; i++) {
        if (free[i] === (up ? 1 : 0)) continue;
        if (best < 0 || (up ? P[i * 3 + 1] > P[best * 3 + 1] : P[i * 3 + 1] < P[best * 3 + 1])) best = i;
      }
      free[best] = up ? 1 : 0;
      freeCount += up ? 1 : -1;
    }
  }

  function simulate(h) {
    const T = st.T, now = stateOf(T);
    if (now !== phase) {
      if (now === 'solid') assignHomes();
      phase = now;
      free.fill(0); freeCount = 0;
    }
    const s = Math.sqrt((T + 273) / 293); // particle speed grows with the square root of absolute temperature
    if (phase === 'liquid') updateFree(vapourCount(T));
    const gas = i => phase === 'gas' || free[i] === 1;
    A.fill(0);

    if (phase !== 'solid') {
      // Neighbours push apart when they overlap; liquid neighbours also pull together a little.
      for (let i = 0; i < N; i++) {
        const xi = P[i * 3], yi = P[i * 3 + 1], zi = P[i * 3 + 2], gi = gas(i);
        for (let j = i + 1; j < N; j++) {
          const dx = P[j * 3] - xi, dy = P[j * 3 + 1] - yi, dz = P[j * 3 + 2] - zi;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > 0.1764 || d2 < 1e-8) continue; // 0.42 squared
          const d = Math.sqrt(d2);
          let f = d < D0 ? -600 * (D0 - d) : (gi || gas(j) ? 0 : 25 * (d - D0));
          if (!f) continue;
          f /= d;
          A[i * 3] += f * dx; A[i * 3 + 1] += f * dy; A[i * 3 + 2] += f * dz;
          A[j * 3] -= f * dx; A[j * 3 + 1] -= f * dy; A[j * 3 + 2] -= f * dz;
        }
      }
    }

    for (let i = 0; i < N; i++) {
      const o = i * 3;
      if (phase === 'solid') {
        // Held in place by springs to its lattice spot; it can only wiggle.
        const g = 9, kick = 0.6 * s * Math.sqrt(2 * g * h);
        for (let k = 0; k < 3; k++) V[o + k] += (-150 * (P[o + k] - H[o + k]) - g * V[o + k]) * h + gauss() * kick;
      } else if (gas(i)) {
        // Fast and free: keep the speed near the gas speed for this temperature.
        for (let k = 0; k < 3; k++) V[o + k] += A[o + k] * h + gauss() * 0.4 * Math.sqrt(h);
        const sp = Math.hypot(V[o], V[o + 1], V[o + 2]) || 1, want = 2.6 * s;
        const f = 1 + (want / sp - 1) * Math.min(1, 3 * h);
        V[o] *= f; V[o + 1] *= f; V[o + 2] *= f;
      } else {
        // Liquid: gravity, neighbours, a little friction and random thermal kicks.
        const g = 4, kick = 0.9 * s * Math.sqrt(2 * g * h);
        V[o] += (A[o] - g * V[o]) * h + gauss() * kick;
        V[o + 1] += (A[o + 1] - 9 - g * V[o + 1]) * h + gauss() * kick;
        V[o + 2] += (A[o + 2] - g * V[o + 2]) * h + gauss() * kick;
      }
      for (let k = 0; k < 3; k++) P[o + k] += V[o + k] * h;
      // Bounce off the walls, floor and lid.
      const bounce = (k, lo, hi) => {
        if (P[o + k] < lo) { P[o + k] = lo; V[o + k] = Math.abs(V[o + k]); }
        else if (P[o + k] > hi) { P[o + k] = hi; V[o + k] = -Math.abs(V[o + k]); }
      };
      bounce(0, -BX + PR, BX - PR); bounce(1, PR, BY - PR); bounce(2, -BZ + PR, BZ - PR);
    }
  }

  const arr = balls.instanceMatrix.array;
  for (let i = 0; i < N - 1; i++) arr[i * 16] = arr[i * 16 + 5] = arr[i * 16 + 10] = arr[i * 16 + 15] = 1;
  const col = balls.instanceColor.array;
  const kindOf = i => (phase === 'solid' ? 'solid' : phase === 'gas' || free[i] ? 'gas' : 'liquid');
  function writeMatrices() {
    let m = 0;
    for (let i = 0; i < N; i++) {
      const c = tint[kindOf(i)];
      if (i === STAR) {
        star.position.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
        starMat.color.copy(st.follow ? orange : c);
        continue;
      }
      arr[m * 16 + 12] = P[i * 3]; arr[m * 16 + 13] = P[i * 3 + 1]; arr[m * 16 + 14] = P[i * 3 + 2];
      col[m * 3] = c.r; col[m * 3 + 1] = c.g; col[m * 3 + 2] = c.b;
      m++;
    }
    balls.instanceMatrix.needsUpdate = true;
    balls.instanceColor.needsUpdate = true;
  }

  // Temperature widgets. The slider follows the temperature when it changes by itself.
  function tempSlider(min = TMIN, max = TMAX) {
    slider = ui.slider({ label: 'Temperature', min, max, step: 1, value: Math.round(st.T), unit: ' °C',
      onInput: v => {
        if (syncing) return;
        st.T = st.target = v; st.rate = 0; st.auto = false;
        if (autoBox) autoBox.checked = false;
      } });
  }
  function syncSlider() {
    if (!slider) return;
    const v = String(kit.clamp(Math.round(st.T), +slider.min, +slider.max));
    if (slider.value === v) return;
    syncing = true;
    if (slider.set) slider.set(v); else { slider.value = v; slider.dispatchEvent(new Event('input')); }
    syncing = false;
  }
  const rampTo = (T, rate) => { st.target = T; st.rate = rate; st.auto = false; };

  function show() {
    const T = Math.round(st.T), now = stateOf(st.T);
    const tag = `${NAMES[now]}|${T}`;
    if (tag !== lastTag) {
      lastTag = tag;
      tags.state.text = NAMES[now];
      tags.temp.text = `${T} °C`;
    }
    column.scale.y = Math.max(0.01, tY(st.T) - (T0 - 0.1));
    const heat = kit.clamp((st.T - 25) / 95, 0, 1), cold = kit.clamp(-st.T / 20, 0, 1);
    plateMat.emissive.setRGB(heat * 0.95 + cold * 0.05, heat * 0.3 + cold * 0.35, cold * 0.9);
    if (st.quiz) return;
    let html = `<b>${T} °C</b>: ${NAMES[now].toLowerCase()}, ${EXAMPLES[now]}`;
    if (T === 0) html = '<b>0 °C</b>: the melting point. Here ice melts and water freezes.';
    else if (T === 100) html = '<b>100 °C</b>: the boiling point. Here water boils into steam.';
    else if (st.step === 3 && now === 'liquid') html = `<b>${T} °C</b>: ${vapourCount(st.T)} particles have evaporated from the warm water.`;
    if (html !== lastReadout) { lastReadout = html; ui.readout(html); }
  }

  function showTags(list) { for (const [k, t] of Object.entries(tags)) t.show(list.includes(k)); }

  return {
    step(i, { isQuiz, instant }) {
      Object.assign(st, { quiz: isQuiz, step: i, auto: false, follow: i === 1 && !isQuiz });
      starMat.depthTest = !st.follow; // the particle to follow shows through the others
      slider = autoBox = null; lastReadout = ''; lastTag = '';
      const all = ['state', 'temp', 'zero', 'hundred'];
      if (isQuiz) {
        reset(-10); rampTo(110, 6);
        showTags(['state', 'temp']);
        view(WIDE, instant);
      } else if (i === 0) {
        reset(20);
        showTags(all);
        view(WIDE, instant);
        ui.buttons([
          { label: 'Ice', onClick: () => rampTo(-10, 80) },
          { label: 'Water', onClick: () => rampTo(20, 80) },
          { label: 'Steam', onClick: () => rampTo(110, 80) },
        ]);
      } else if (i === 1) {
        reset(20);
        showTags([...all, 'star']);
        view(CLOSE, instant);
        tempSlider();
      } else if (i === 2) {
        reset(-15); rampTo(15, 4); // starts melting by itself, so the step shows it happening
        showTags(['state', 'temp', 'zero']);
        view(LOW, instant);
        ui.buttons([{ label: 'Warm it up', onClick: () => rampTo(15, 4) }, { label: 'Cool it down', onClick: () => rampTo(-15, 4) }]);
      } else if (i === 3) {
        reset(70);
        showTags(['state', 'temp', 'hundred']);
        view(TALL, instant);
        tempSlider(0, TMAX);
      } else if (i === 4) {
        reset(110); rampTo(-15, 10);
        showTags(all);
        view(SIDE, instant);
        ui.buttons([{ label: 'Start again', onClick: () => { reset(110); rampTo(-15, 10); } }]);
      } else if (i === 5) {
        reset(-15); st.auto = true; st.autoT = 0;
        showTags(all);
        view(OTHER, instant);
        autoBox = ui.toggle({ label: 'Change by itself', value: true, onChange: v => { st.auto = v; if (v) st.autoT = 0; } });
        tempSlider();
      }
      show();
    },
    update(dt) {
      if (st.auto) {
        // Slowly up from -15 °C to 115 °C and back down again, over and over (26 seconds a round).
        st.autoT += dt;
        const u = (st.autoT % 26) / 26;
        st.T = -15 + 130 * (u < 0.5 ? u * 2 : 2 - u * 2);
        st.target = st.T;
      } else if (st.rate && st.T !== st.target) {
        const d = st.target - st.T, stepT = st.rate * dt;
        st.T = Math.abs(d) <= stepT ? st.target : st.T + Math.sign(d) * stepT;
      }
      const n = Math.max(1, Math.ceil(dt * 60 - 1e-6)), h = dt / n;
      for (let k = 0; k < n; k++) simulate(h);
      writeMatrices();
      syncSlider();
      show();
      return true;
    },
  };
}
