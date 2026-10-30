// Waves on a pond: a cut-away slice of a pond. The water surface is a plane whose vertices follow a
// travelling sine wave (buffers reused every frame). A rubber duck bobs in a small loop but stays put.
const HX = 6, HZ = 3;            // water half-size (x along the waves, z across)
const NX = 96, NZ = 12;          // surface segments
const DEPTH = 1.2;               // water depth shown in the cut
const BANK = 0.75;               // bank top height (above the highest crest)
const PAD_X = -5.8;              // wave maker board
const CM = 20;                   // scene units to centimetres
const speedFor = L => 1.6 * Math.sqrt(L);  // longer waves travel faster (slowed down for viewing)

export default function setup({ THREE, scene, kit, ui, label, view, invalidate }) {
  scene.background = new THREE.Color(0xcfeaff);
  kit.lights(scene, { sun: [4, 10, 7] });

  // Banks (soil with a grass top) on three sides, and the pond bed. The front is cut open.
  const soil = kit.mat(0x8d6e4f, { roughness: 1 }), grass = kit.mat(0x7cc35a, { roughness: 1 });
  const bank = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = BANK - 0.08 + DEPTH + 0.3;
    kit.mesh(new THREE.BoxGeometry(w, h, d), soil, [cx, -DEPTH - 0.3 + h / 2, cz], scene).castShadow = false;
    kit.mesh(new THREE.BoxGeometry(w, 0.08, d), grass, [cx, BANK - 0.04, cz], scene).castShadow = false;
  };
  bank(-10, -HX, -8, HZ); bank(HX, 10, -8, HZ); bank(-HX, HX, -8, -HZ);
  kit.mesh(new THREE.BoxGeometry(HX * 2, 0.3, HZ * 2), kit.mat(0x6f5640, { roughness: 1 }), [0, -DEPTH - 0.15, 0], scene).castShadow = false;
  // A few pebbles on the bed and reeds on the banks.
  for (let i = 0; i < 14; i++) {
    const p = kit.mesh(new THREE.DodecahedronGeometry(0.08 + rand(i) * 0.1, 0), kit.mat(0x9a9a9a, { flatShading: true }), [-5.5 + rand(i + 20) * 11, -DEPTH + 0.03, -2.5 + rand(i + 40) * 5], scene);
    p.castShadow = false;
  }
  const reedMat = kit.mat(0x4f8a3a);
  for (let i = 0; i < 18; i++) {
    const x = i < 9 ? -6.4 - rand(i) * 1.5 : 6.4 + rand(i) * 1.5, z = -2.6 + rand(i + 60) * 5, h = 0.6 + rand(i + 80) * 0.6;
    const r = kit.mesh(new THREE.CylinderGeometry(0.015, 0.025, h, 5), reedMat, [x, BANK + h / 2, z], scene);
    r.rotation.z = (rand(i + 9) - 0.5) * 0.3;
    if (i % 3 === 0) kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), kit.mat(0x6b4226), [x + r.rotation.z * -h * 0.45, BANK + h - 0.05, z], scene);
  }

  // Water surface: a plane with fixed x for each vertex; only y and the normal change.
  const surfGeo = new THREE.PlaneGeometry(HX * 2, HZ * 2, NX, NZ);
  surfGeo.rotateX(-Math.PI / 2);
  const sPos = surfGeo.attributes.position, sNor = surfGeo.attributes.normal;
  const waterMat = kit.mat(0x2f8fd8, { roughness: 0.25, metalness: 0.05 });
  const surface = kit.mesh(surfGeo, waterMat, [0, 0, 0], scene);
  surface.castShadow = false;
  surface.frustumCulled = false;  // vertices move every frame
  // Front cut face of the water (top edge follows the wave).
  const skirtGeo = new THREE.BufferGeometry();
  const kPos = new Float32Array((NX + 1) * 2 * 3), idx = [];
  for (let j = 0; j <= NX; j++) {
    const x = -HX + (j / NX) * HX * 2;
    kPos.set([x, 0, HZ, x, -DEPTH, HZ], j * 6);
    if (j < NX) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  skirtGeo.setAttribute('position', new THREE.BufferAttribute(kPos, 3));
  skirtGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((NX + 1) * 6).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  skirtGeo.setIndex(idx);
  const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshStandardMaterial({ color: 0x3d9be0, transparent: true, opacity: 0.82, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false }));
  skirt.renderOrder = 2;
  skirt.frustumCulled = false;
  scene.add(skirt);
  const colX = new Float32Array(NX + 1), colY = new Float32Array(NX + 1), colN = new Float32Array(NX + 1);
  for (let j = 0; j <= NX; j++) colX[j] = -HX + (j / NX) * HX * 2;

  // Calm water level: a white line on the front face.
  const calmLine = kit.mesh(new THREE.BoxGeometry(HX * 2, 0.025, 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0, 0, HZ + 0.02], scene);
  calmLine.castShadow = false;

  // Wave maker: a board pushed up and down at the left end.
  const board = kit.mesh(new THREE.BoxGeometry(0.12, 1.2, HZ * 2 - 0.1), kit.mat(0xd9a05b), [PAD_X, 0, 0], scene);

  // Rubber duck (faces left, toward the incoming waves).
  const duck = new THREE.Group();
  scene.add(duck);
  const yellow = kit.mat(0xffd23f, { roughness: 0.35 }), orange = kit.mat(0xff8c1a, { roughness: 0.4 }), black = kit.mat(0x1a1a1a);
  kit.mesh(new THREE.SphereGeometry(0.35, 24, 16), yellow, [0, 0.1, 0], duck).scale.set(1.3, 0.75, 1);
  kit.mesh(new THREE.SphereGeometry(0.21, 24, 16), yellow, [-0.3, 0.42, 0], duck);
  const beak = kit.mesh(new THREE.ConeGeometry(0.08, 0.2, 12), orange, [-0.53, 0.39, 0], duck);
  beak.rotation.z = Math.PI / 2; beak.scale.set(1, 1, 0.6);
  const tail = kit.mesh(new THREE.ConeGeometry(0.1, 0.22, 10), yellow, [0.44, 0.24, 0], duck);
  tail.rotation.z = -0.9;
  for (const z of [-0.15, 0.15]) kit.mesh(new THREE.SphereGeometry(0.035, 8, 6), black, [-0.38, 0.5, z], duck);
  const wing = kit.mesh(new THREE.SphereGeometry(0.17, 12, 8), kit.mat(0xffc300), [0.05, 0.15, 0.3], duck);
  wing.scale.set(1.3, 0.6, 0.4);
  const DUCK_Z = 0;

  // The duck's path: a loop drawn once, scaled each frame.
  const loopPts = [];
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; loopPts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0)); }
  const duckPath = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(loopPts), new THREE.LineBasicMaterial({ color: 0xe63946 }));
  scene.add(duckPath);
  const pathDot = kit.mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe63946 }), [0, 0, 0], scene);
  const homePost = kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 6), new THREE.MeshBasicMaterial({ color: 0x555555 }), [0, 0, 0.42], scene);

  // Leaves floating across the pond and a flag that rides one crest (step 3).
  const leafMat = kit.mat(0x3fa34d, { roughness: 0.8, side: THREE.DoubleSide });
  const leaves = [-4.5, -2.7, -0.9, 0.9, 2.7, 4.5].map((x, i) => {
    const m = kit.mesh(new THREE.SphereGeometry(0.32, 12, 6), leafMat, [x, 0, 1.6], scene);
    m.scale.set(1.3, 0.12, 0.8); m.rotation.y = rand(i) * 3;
    m.x0 = x;
    return m;
  });
  const flag = new THREE.Group();
  scene.add(flag);
  flag.scale.setScalar(1.8);
  kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), kit.mat(0x444444), [0, 0.4, 0], flag);
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0); flagShape.lineTo(0.35, -0.12); flagShape.lineTo(0, -0.25);
  const cloth = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), new THREE.MeshStandardMaterial({ color: 0xe63946, side: THREE.DoubleSide }));
  cloth.position.set(0.01, 0.8, 0);
  flag.add(cloth);
  kit.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), kit.mat(0xffffff), [0, 0.02, 0], flag);
  const FLAG_Z = 0.9;

  // Amplitude marker (step 4): a red bar from the calm level up to a crest, on the front face.
  const ampMat = new THREE.MeshBasicMaterial({ color: 0xe63946 });
  const ampBar = kit.mesh(new THREE.BoxGeometry(0.05, 1, 0.02), ampMat, [0, 0, HZ + 0.05], scene);
  const ampCap = kit.mesh(new THREE.BoxGeometry(0.3, 0.03, 0.02), ampMat, [0, 0, HZ + 0.05], scene);
  const ampBase = kit.mesh(new THREE.BoxGeometry(0.3, 0.03, 0.02), ampMat, [0, 0, HZ + 0.05], scene);
  [ampBar, ampCap, ampBase].forEach(m => { m.castShadow = false; });

  // Ruler (step 5): fixed length with centimetre marks; its 0 sits above a crest, pins mark two crests.
  const RULER_U = 6.6;
  const ruler = kit.mesh(new THREE.BoxGeometry(RULER_U, 0.22, 0.04), kit.mat(0xffffff, { map: paintRuler(THREE, RULER_U) }), [0, 0, HZ + 0.12], scene);
  ruler.castShadow = false;
  const pinMat = new THREE.MeshBasicMaterial({ color: 0xe63946 });
  const pins = [0, 1].map(() => kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), pinMat, [0, 0, HZ + 0.1], scene));
  const RULER_Y = BANK + 0.05, R0 = 0.1;  // ruler height; where 0 cm is from its left end

  // Labels.
  const anchors = { crest: new THREE.Vector3(), trough: new THREE.Vector3(), amp: new THREE.Vector3(), wl: new THREE.Vector3(), flag: new THREE.Vector3() };
  const tags = {
    maker: label('Wave maker', new THREE.Vector3(PAD_X + 0.3, 0.7, 0.5), { cls: 'warm' }),
    duck: label('Duck', new THREE.Vector3(0, 0.75, 0)),
    path: label("Duck's path", new THREE.Vector3(0.6, 0.9, 0.42), { cls: 'warm' }),
    flag: label('Wave top', anchors.flag, { cls: 'warm' }),
    leaves: label('Leaves', new THREE.Vector3(2.7, 0.35, 1.6)),
    crest: label('Crest', anchors.crest),
    trough: label('Trough', anchors.trough, { cls: 'cool' }),
    calm: label('Calm level', new THREE.Vector3(-4.9, 0.02, HZ), { cls: 'cool' }),
    amp: label('Amplitude', anchors.amp, { cls: 'warm' }),
    wl: label('Wavelength', anchors.wl, { cls: 'warm' }),
  };

  const st = {
    step: 0, time: 0, quiz: false, A: 0.3, Aset: 0.3, L: 4, Lset: 4, ph: 0, frozen: false,
    front: null, back: null, path: false, follow: false, sliders: {}, auto: true,
  };

  // Wave height at x (with the front and back edges of a wave train in step 1).
  const env = x => (st.front == null ? 1 : kit.clamp((st.front - x) / 0.8, 0, 1)) * (st.back == null ? 1 : kit.clamp((x - st.back) / 0.8, 0, 1));
  const k = () => (2 * Math.PI) / st.L;
  const eta = x => st.A * env(x) * Math.sin(k() * x - st.ph);
  // First crest at or right of x0 (crests are where k x - ph = pi/2).
  const crestFrom = x0 => { const c = (Math.PI / 2 + st.ph) / k(); return x0 + (((c - x0) % st.L) + st.L) % st.L; };

  function makeWaves() { st.front = PAD_X; st.back = null; st.Aset = 0.3; }
  function calm() { if (st.back == null) st.back = PAD_X; }
  function readout() {
    const a = Math.round(st.Aset * CM), l = Math.round(st.Lset * CM);
    if (st.step === 3) ui.readout(`Amplitude: <b>${a} cm</b> above the calm water. The troughs dip <b>${a} cm</b> below it.`);
    if (st.step === 4) ui.readout(`Wavelength: <b>${l} cm</b> from crest to crest.`);
    if (st.step === 5) ui.readout(`Amplitude <b>${a} cm</b>, wavelength <b>${l} cm</b>.`);
  }
  const ampSlider = () => { st.sliders.A = ui.slider({ label: 'Wave height', min: 2, max: 12, step: 1, value: Math.round(st.Aset * CM), unit: ' cm', onInput: v => { st.auto = false; st.Aset = v / CM; readout(); } }); };
  const lenSlider = () => { st.sliders.L = ui.slider({ label: 'Wavelength', min: 40, max: 120, step: 5, value: Math.round(st.Lset * CM), unit: ' cm', onInput: v => { st.auto = false; st.Lset = v / CM; readout(); } }); };
  const freeze = () => ui.toggle({ label: 'Freeze the water', value: false, onChange: v => { st.frozen = v; invalidate(); } });
  function preset(a, l) { st.Aset = a / CM; st.Lset = l / CM; st.sliders.A?.set(a); st.sliders.L?.set(l); readout(); }

  const views = {
    wide: { radius: 6.2, yaw: 0.3, pitch: 0.42, target: [0, -0.1, 0.3] },
    duck: { radius: 1.7, yaw: 0.2, pitch: 0.22, target: [0, 0.25, 0.3] },
    across: { radius: 4.6, yaw: 0.15, pitch: 0.45, target: [0, 0.1, 0.9] },
    front: { radius: 3.4, yaw: 0.05, pitch: 0.1, target: [-1.2, 0.1, HZ] },
    ruler: { radius: 4.4, yaw: 0, pitch: 0.12, target: [0, 0.3, HZ] },
  };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, frozen: false, path: false, follow: false, sliders: {}, auto: true, front: null, back: null });
      for (const t of Object.values(tags)) t.show(false);
      if (i <= 2 || isQuiz) { st.Aset = 0.3; st.Lset = 4; }
      if (i === 0) {
        go(views.wide);
        st.front = PAD_X; st.A = st.Aset = 0.3; st.L = 4;
        tags.maker.show(true); tags.duck.show(true);
        ui.buttons([{ label: 'Make waves', onClick: () => { st.auto = false; makeWaves(); invalidate(); } }, { label: 'Calm water', onClick: () => { st.auto = false; calm(); invalidate(); } }]);
      }
      if (i === 1) {
        go(views.duck); st.path = true;
        tags.path.show(true);
        ui.toggle({ label: "Show the duck's path", value: true, onChange: v => { st.path = v; tags.path.show(v); invalidate(); } });
        ui.readout('After each wave, the duck is back <b>where it started</b>.');
      }
      if (i === 2) {
        go(views.across); st.follow = true;
        tags.flag.show(true); tags.leaves.show(true);
        ui.toggle({ label: 'Follow one wave top', value: true, onChange: v => { st.follow = v; tags.flag.show(v); invalidate(); } });
        ui.readout('The wave top travels across the pond. The leaves stay in their places.');
      }
      if (i === 3) {
        go(views.front);
        tags.crest.show(true); tags.trough.show(true); tags.calm.show(true); tags.amp.show(true);
        ampSlider(); freeze(); readout();
      }
      if (i === 4) {
        go(views.ruler);
        tags.wl.show(true); tags.crest.show(true);
        lenSlider(); freeze(); readout();
      }
      if (i === 5) {
        go(views.wide);
        tags.duck.show(true);
        ui.buttons([
          { label: 'Ripples', onClick: () => { st.auto = false; preset(2, 40); invalidate(); } },
          { label: 'Breezy', onClick: () => { st.auto = false; preset(6, 80); invalidate(); } },
          { label: 'Windy', on: true, onClick: () => { st.auto = false; preset(12, 120); invalidate(); } },
        ]);
        ampSlider(); lenSlider();
        preset(12, 120);
      }
      if (isQuiz) go({ ...views.wide, yaw: -0.25, pitch: 0.45 });
    },

    update(dt) {
      st.time += dt;
      const s = st.step, t = st.time;
      // Small scripted demos until the learner takes over.
      if (st.auto && !st.quiz && s === 3) { const a = Math.round(kit.lerp(6, 11, kit.ease(kit.clamp((t - 0.5) / 1.5, 0, 1)))); if (a !== Math.round(st.Aset * CM)) { st.Aset = a / CM; st.sliders.A?.set(a); readout(); } }
      if (st.auto && !st.quiz && s === 4) { const l = 5 * Math.round(kit.lerp(80, 110, kit.ease(kit.clamp((t - 0.5) / 1.5, 0, 1))) / 5); if (l !== Math.round(st.Lset * CM)) { st.Lset = l / CM; st.sliders.L?.set(l); readout(); } }

      const moving = kit.follow(st, 'A', st.Aset, dt, 4) | kit.follow(st, 'L', st.Lset, dt, 4);
      const c = speedFor(st.L);
      if (!st.frozen) {
        st.ph += k() * c * dt;
        if (st.front != null) { st.front += c * dt; if (st.front > HX + 1 && st.back == null) st.front = null; }
        if (st.back != null) st.back += c * dt;
      }
      const kk = k();

      // Surface heights and slopes, column by column, then copied to every row.
      for (let j = 0; j <= NX; j++) {
        const x = colX[j], e = env(x), th = kk * x - st.ph;
        colY[j] = st.A * e * Math.sin(th);
        colN[j] = -st.A * e * kk * Math.cos(th);
      }
      for (let v = 0; v < sPos.count; v++) {
        const j = v % (NX + 1), n = 1 / Math.hypot(colN[j], 1);
        sPos.setY(v, colY[j]);
        sNor.setXYZ(v, colN[j] * n, n, 0);
      }
      sPos.needsUpdate = sNor.needsUpdate = true;
      for (let j = 0; j <= NX; j++) kPos[j * 6 + 1] = colY[j];
      skirtGeo.attributes.position.needsUpdate = true;

      // Board: moves up and down while it is making waves.
      board.position.y = 0.1 + (st.back == null ? st.A * Math.sin(kk * PAD_X - st.ph) : 0);

      // Duck: up and down plus a little forward and back (a small loop), never carried away.
      const th0 = -st.ph, e0 = env(0);
      const dx = 0.5 * st.A * e0 * Math.cos(th0), dy = st.A * e0 * Math.sin(th0);
      duck.position.set(dx, dy - 0.04, DUCK_Z);
      duck.rotation.z = Math.atan(st.A * e0 * kk * Math.cos(th0)) * 0.8;
      duckPath.visible = pathDot.visible = homePost.visible = st.path && !st.quiz;
      if (duckPath.visible) {
        duckPath.position.set(0, 0.12, 0.42);
        duckPath.scale.set(Math.max(0.001, 0.5 * st.A), Math.max(0.001, st.A), 1);
        pathDot.position.set(dx, dy + 0.12, 0.42);
        homePost.position.set(0, 0.12, 0.42);
      }

      // Leaves bob in place; the flag rides one crest across the pond.
      for (const m of leaves) {
        const th = kk * m.x0 - st.ph, e = env(m.x0);
        m.position.set(m.x0 + 0.5 * st.A * e * Math.cos(th), st.A * e * Math.sin(th) + 0.01, 1.6);
        m.rotation.z = Math.atan(st.A * e * kk * Math.cos(th));
      }
      flag.visible = st.follow && !st.quiz;
      if (flag.visible) { const xf = crestFrom(-4.5); flag.position.set(xf, eta(xf), FLAG_Z); anchors.flag.set(xf, eta(xf) + 1.5, FLAG_Z); }

      // Crest, trough and amplitude marker (step 4); ruler between two crests (step 5).
      const showAmp = s === 3 && !st.quiz, showRuler = s === 4 && !st.quiz;
      ampBar.visible = ampCap.visible = ampBase.visible = showAmp;
      ruler.visible = pins[0].visible = pins[1].visible = showRuler;
      if (showAmp) {
        const xc = crestFrom(-3.2 - st.L / 2), yc = eta(xc);
        ampBar.position.set(xc, yc / 2, HZ + 0.05); ampBar.scale.y = Math.max(0.001, yc);
        ampCap.position.set(xc, yc, HZ + 0.05); ampBase.position.set(xc, 0, HZ + 0.05);
        anchors.amp.set(xc + 0.55, yc * 0.5 - 0.12, HZ);
        anchors.crest.set(xc, yc + 0.08, HZ);
        const xt = xc + st.L / 2;
        anchors.trough.set(xt, eta(xt) - 0.3, HZ);
      }
      if (showRuler) {
        const x0 = crestFrom(-3.6), x1 = x0 + st.L;
        ruler.position.set(x0 - R0 + RULER_U / 2, RULER_Y, HZ + 0.12);
        [x0, x1].forEach((x, j) => { const y = eta(x); pins[j].position.set(x, (y + RULER_Y) / 2, HZ + 0.1); pins[j].scale.y = Math.max(0.001, RULER_Y - y); });
        anchors.wl.set((x0 + x1) / 2, RULER_Y + 0.15, HZ + 0.12);
        anchors.crest.set(x0, eta(x0) + 0.05, HZ);
        tags.wl.text = `Wavelength ${Math.round(st.L * CM)} cm`;
      }
      return !st.frozen || moving;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Wooden ruler with marks every 10 cm and numbers every 20 cm; 0 cm sits R0 from the left end.
function paintRuler(THREE, lenU) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#f4d58d'; g.fillRect(0, 0, 512, 32);
  g.fillStyle = '#333';
  const px = 512 / lenU, cmPx = px / 20;
  for (let cm = 0; cm <= 125; cm += 5) {
    const x = (0.1 * px) + cm * cmPx;
    g.fillRect(x - 1, 0, 2, cm % 10 ? 7 : 12);
    if (cm % 20 === 0) { g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText(String(cm), Math.max(8, x), 27); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
