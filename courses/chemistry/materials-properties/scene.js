// What is it made of? A test bench with six material samples. Buttons run a press test, a bend test,
// a water-drop test and a torch (light) test; the last step builds an umbrella, a window or a spoon
// from the material the learner picks.
const TOP = 0.62;              // bench top height
const L = 0.74, W = 0.5;       // sample length (x) and width (z)
const SUPPORT = 0.16;          // height of the blocks used in the bend test
const X = i => -2.6 + i * 1.04;
const SX = 5.4;                // build station

// soft: squashes in the press. bend: how far the middle sags when pushed. droop: sag with no push.
// soak: 0 waterproof, 0.5 soaks in a little, 1 soaks it up. clear: lets light through.
const MATS = [
  { key: 'wood', name: 'Wood', thick: 0.14, soft: false, bend: 0, droop: 0, soak: 0.5, clear: false,
    about: 'Wood comes from trees. Tables, pencils and toy blocks are made of wood.' },
  { key: 'metal', name: 'Metal', thick: 0.09, soft: false, bend: 0, droop: 0, soak: 0, clear: false,
    about: 'Metal comes from rocks dug out of the ground. Keys, coins and pans are made of metal.' },
  { key: 'plastic', name: 'Plastic', thick: 0.05, soft: false, bend: 0.14, droop: 0, soak: 0, clear: false,
    about: 'Plastic is made in factories, mostly from oil. Toys, bottles and buckets are made of plastic.' },
  { key: 'glass', name: 'Glass', thick: 0.07, soft: false, bend: 0, droop: 0, soak: 0, clear: true,
    about: 'Glass is made by melting sand. Windows, jars and drinking glasses are made of glass.' },
  { key: 'rubber', name: 'Rubber', thick: 0.13, soft: true, bend: 0.22, droop: 0, soak: 0, clear: false,
    about: 'Rubber comes from the sap of rubber trees or is made in factories. Tyres, balls and boots are made of rubber.' },
  { key: 'fabric', name: 'Fabric', thick: 0.1, soft: true, bend: 0.24, droop: 0.1, soak: 1, clear: false,
    about: 'Fabric is made from threads such as cotton or wool. Clothes, towels and bags are made of fabric.' },
];

// How well each material does each job: [verdict, reason]. y = good, m = could work, n = not good.
const JOBS = {
  umbrella: {
    wood: ['n', 'Wood is heavy, and it soaks up rain.'],
    metal: ['n', 'Metal keeps the rain out, but it is too heavy to hold up.'],
    plastic: ['y', 'Plastic is waterproof, light and a little bendy. The rain runs off!'],
    glass: ['n', 'Glass keeps the rain out, but it is heavy and could break.'],
    rubber: ['m', 'Rubber is waterproof, but it is heavy for an umbrella.'],
    fabric: ['n', 'This fabric soaks up rain. Real umbrellas use special waterproof fabric.'],
  },
  window: {
    wood: ['n', 'You cannot see through wood. The room would be dark.'],
    metal: ['n', 'You cannot see through metal. The room would be dark.'],
    plastic: ['n', 'This plastic blocks light. Only clear plastic would work.'],
    glass: ['y', 'Glass is see-through and waterproof. Light comes in and rain stays out.'],
    rubber: ['n', 'Rubber blocks light, so the room would be dark.'],
    fabric: ['n', 'Fabric lets wind and rain in. It makes good curtains, not windows.'],
  },
  spoon: {
    wood: ['y', 'Wood is hard and stiff. Wooden spoons are great for cooking.'],
    metal: ['y', 'Metal is hard, stiff and waterproof, and it is easy to wash.'],
    plastic: ['m', 'Thin plastic bends easily. A thick plastic spoon works.'],
    glass: ['n', 'Glass is hard and waterproof, but a glass spoon could break.'],
    rubber: ['n', 'Rubber is too bendy. The spoon would flop.'],
    fabric: ['n', 'Fabric is floppy, and it soaks up the soup!'],
  },
};
const VERDICT = { y: 'Good choice!', m: 'Could work', n: 'Not a good choice' };

export default function setup({ THREE, scene, kit, ui, label, view, freeRect }) {
  kit.stage(scene, { ground: 0xe6d9c3, sky: 0xe6f3ff });
  kit.lights(scene, { sun: [3, 9, 6] });
  const tex = textures(THREE);

  // Bench and back wall.
  const body = kit.mesh(new THREE.BoxGeometry(7.0, TOP - 0.05, 1.9), kit.mat(0x6d8fb3), [0, (TOP - 0.05) / 2, 0], scene);
  body.castShadow = false;
  kit.mesh(new THREE.BoxGeometry(7.2, 0.05, 2.0), kit.mat(0xf3f5f7), [0, TOP - 0.025, 0], scene);
  const wall = kit.mesh(new THREE.PlaneGeometry(7.2, 1.7), kit.mat(0xfff6e0), [0, TOP + 0.85, -0.99], scene);
  wall.castShadow = false;

  const mats = {
    wood: kit.mat(0xffffff, { map: tex.wood }),
    metal: kit.mat(0xc6ced6, { metalness: 0.55, roughness: 0.3 }),
    plastic: kit.mat(0xef476f, { roughness: 0.35 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false }),
    rubber: kit.mat(0x3d4148, { roughness: 0.95 }),
    fabric: kit.mat(0xffffff, { map: tex.fabric, roughness: 1 }),
  };

  // Samples: each sits in a holder group (moved and turned per step). The box has many segments
  // along its length so it can bend.
  const steel = kit.mat(0x9aa5b1, { metalness: 0.4, roughness: 0.4 });
  const dropGeo = new THREE.SphereGeometry(0.065, 16, 10);
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x3b9be0, transparent: true, opacity: 0.85, roughness: 0.1 });
  const patchGeo = new THREE.CircleGeometry(1, 24);
  const patchMat = new THREE.MeshBasicMaterial({ color: 0x1d3557, transparent: true, opacity: 0.35, depthWrite: false });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0 });
  const beamGeo = new THREE.CylinderGeometry(0.07, 0.13, 1, 16, 1, true);

  const S = MATS.map((m, i) => {
    const geo = new THREE.BoxGeometry(L, m.thick, W, 14, 1, 1);
    geo.translate(0, m.thick / 2, 0);
    const base = Float32Array.from(geo.attributes.position.array);
    const holder = new THREE.Group();
    holder.position.set(X(i), TOP, 0);
    scene.add(holder);
    const mesh = kit.mesh(geo, mats[m.key], [0, 0, 0], holder);
    if (m.clear) {
      mesh.castShadow = false; mesh.renderOrder = 2;
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x5b9bc4 })));
    }

    // Name plate on the bench front.
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.25), new THREE.MeshBasicMaterial({ map: nameTex(THREE, m.name) }));
    plate.position.set(X(i), TOP - 0.28, 0.952);
    scene.add(plate);

    // Bend-test blocks.
    const blocks = new THREE.Group();
    blocks.position.set(X(i), TOP, 0);
    for (const sx of [-1, 1]) kit.mesh(new THREE.BoxGeometry(0.1, SUPPORT, 0.44), kit.mat(0xf4a261), [sx * 0.31, SUPPORT / 2, 0], blocks);
    blocks.visible = false;
    scene.add(blocks);

    // Press / push rod.
    const pusher = new THREE.Group();
    pusher.position.set(X(i), 2, 0);
    const head = kit.mesh(new THREE.BoxGeometry(0.34, 0.08, 0.3), kit.mat(0xe63946), [0, 0.04, 0], pusher);
    kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 8), steel, [0, 0.73, 0], pusher);
    pusher.visible = false;
    scene.add(pusher);

    // Dropper, water drop and wet patch.
    const dropper = new THREE.Group();
    dropper.position.set(X(i), TOP + 1.0, 0);
    const tube = kit.mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.36, 10), new THREE.MeshStandardMaterial({ color: 0xe0f4ff, transparent: true, opacity: 0.5, roughness: 0.1 }), [0, 0.18, 0], dropper);
    tube.castShadow = false;
    kit.mesh(new THREE.SphereGeometry(0.075, 12, 8), kit.mat(0xd62828), [0, 0.4, 0], dropper);
    dropper.visible = false;
    scene.add(dropper);
    const drop = kit.mesh(dropGeo, dropMat, [X(i), 0, 0], scene);
    drop.visible = false;
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(X(i), TOP + m.thick + 0.003, 0);
    patch.visible = false;
    scene.add(patch);

    // Torch, beam to the sample, beam behind it and spot on the wall.
    const torch = new THREE.Group();
    torch.position.set(X(i), TOP + 0.25, 0.8);
    const tb = kit.mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 12), kit.mat(0x2a9d8f), [0, 0, 0], torch);
    tb.rotation.x = Math.PI / 2;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
    lens.position.z = -0.151; lens.rotation.y = Math.PI;
    torch.add(lens);
    const beam1 = new THREE.Mesh(beamGeo, beamMat);
    beam1.rotation.x = Math.PI / 2;
    beam1.scale.y = 0.62; beam1.position.set(0, 0, -0.46);
    torch.add(beam1);
    torch.visible = false;
    scene.add(torch);
    const beam2 = new THREE.Mesh(beamGeo, beamMat);
    beam2.rotation.x = Math.PI / 2;
    beam2.scale.set(1.2, 0.9, 1.2);
    beam2.position.set(X(i), TOP + 0.25, -0.53);
    beam2.visible = false;
    scene.add(beam2);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), spotMat);
    spot.position.set(X(i), TOP + 0.25, -0.98);
    spot.visible = false;
    scene.add(spot);

    const anchor = new THREE.Object3D();
    scene.add(anchor);
    const tag = label('', anchor);
    tag.show(false);
    return { m, i, geo, base, holder, mesh, blocks, pusher, head, dropper, drop, patch, torch, beam2, spot, anchor, tag,
      lift: 0, sag: 0, sagShown: 0, squash: 1, soak: 0 };
  });

  // Gantry that holds the press rods.
  const gantry = new THREE.Group();
  kit.mesh(new THREE.BoxGeometry(6.8, 0.1, 0.16), steel, [0, TOP + 1.5, 0], gantry);
  for (const sx of [-1, 1]) kit.mesh(new THREE.BoxGeometry(0.1, 1.5, 0.16), steel, [sx * 3.35, TOP + 0.75, 0], gantry);
  gantry.visible = false;
  scene.add(gantry);

  // Build station: a round stand with an umbrella, a window or a spoon made of the chosen material.
  kit.mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.3, 32), kit.mat(0xffd6a5), [SX, 0.15, 0], scene);
  const two = {};
  for (const [k, m] of Object.entries(mats)) { two[k] = m.clone(); two[k].side = THREE.DoubleSide; }
  const build = new THREE.Group();
  build.position.set(SX, 0.3, 0);
  scene.add(build);

  const umbrella = new THREE.Group();
  const canopy = kit.mesh(new THREE.ConeGeometry(0.8, 0.38, 16, 1, true), two.plastic, [0, 1.45, 0], umbrella);
  kit.mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.45, 8), steel, [0, 0.9, 0], umbrella);
  const hook = kit.mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 12, Math.PI), kit.mat(0x6b4226), [0.09, 0.18, 0], umbrella);
  hook.rotation.z = Math.PI;
  build.add(umbrella);

  const win = new THREE.Group();
  const frameMat = kit.mat(0x8d5a3b);
  kit.mesh(new THREE.BoxGeometry(1.3, 0.1, 0.12), frameMat, [0, 1.6, 0], win);
  kit.mesh(new THREE.BoxGeometry(1.3, 0.1, 0.12), frameMat, [0, 0.4, 0], win);
  kit.mesh(new THREE.BoxGeometry(0.1, 1.1, 0.12), frameMat, [-0.6, 1.0, 0], win);
  kit.mesh(new THREE.BoxGeometry(0.1, 1.1, 0.12), frameMat, [0.6, 1.0, 0], win);
  kit.mesh(new THREE.BoxGeometry(0.4, 0.4, 0.2), frameMat, [0, 0.2, 0], win);
  const pane = kit.mesh(new THREE.BoxGeometry(1.1, 1.1, 0.04), two.glass, [0, 1.0, 0], win);
  // A little sunny view behind the window.
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffc300 }));
  sunBall.position.set(0.22, 1.25, -0.7);
  win.add(sunBall);
  kit.mesh(new THREE.ConeGeometry(0.2, 0.5, 8), kit.mat(0x52b788), [-0.2, 0.95, -0.7], win);
  build.add(win);

  const spoon = new THREE.Group();
  spoon.position.set(-0.15, 0.62, 0);
  spoon.rotation.z = 0.3;
  const bowl = kit.mesh(new THREE.SphereGeometry(0.24, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), two.metal, [0, 0, 0], spoon);
  bowl.scale.set(1.4, 0.5, 1);
  const pivot = new THREE.Group();
  pivot.position.set(0.3, 0.02, 0);
  spoon.add(pivot);
  const handle = kit.mesh(new THREE.BoxGeometry(0.85, 0.04, 0.1), two.metal, [0.42, 0, 0], pivot);
  build.add(spoon);
  const post = kit.mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.6, 10), steel, [-0.15, 0.3, 0], build);
  const buildAnchor = new THREE.Object3D();
  scene.add(buildAnchor);
  const verdictTag = label('', buildAnchor, { cls: 'big' });
  verdictTag.show(false);

  const st = { step: 0, quiz: false, t: 0, auto: false, sel: -1, press: -1, done: false, water: -1, lightOn: false, light: 0,
    stand: 0, support: 0, job: 'umbrella', mat: 'plastic', pop: 1 };

  function results(text) {
    S.forEach((s, i) => {
      s.tag.text = text(s.m);
      s.anchor.position.set(X(i), TOP + (i % 2 ? 1.22 : 0.6) + (st.step === 4 ? 0.3 : 0) + (st.step === 2 ? 0.14 : 0), 0);
    });
  }
  const showTags = v => S.forEach(s => s.tag.show(v && !st.quiz));

  function pick(i) {
    st.sel = i;
    ui.readout(`<b>${MATS[i].name}</b>: ${MATS[i].about}`);
  }

  function choose() {
    const [v, why] = JOBS[st.job][st.mat];
    umbrella.visible = st.job === 'umbrella'; win.visible = st.job === 'window'; spoon.visible = post.visible = st.job === 'spoon';
    canopy.material = two[st.mat]; pane.material = two[st.mat];
    bowl.material = handle.material = two[st.mat];
    pivot.rotation.z = st.mat === 'fabric' ? -1.0 : st.mat === 'rubber' ? -0.6 : st.mat === 'plastic' ? -0.12 : 0;
    canopy.scale.y = st.mat === 'fabric' ? 0.75 : 1;
    buildAnchor.position.set(SX, st.job === 'umbrella' ? 2.3 : st.job === 'window' ? 2.15 : 1.45, 0);
    verdictTag.text = VERDICT[v];
    verdictTag.el.className = 'lab big ' + (v === 'y' ? 'cool' : 'warm');
    verdictTag.show(true);
    const name = MATS.find(m => m.key === st.mat).name.toLowerCase();
    ui.readout(`A ${name} ${st.job}? ${why}`);
    st.pop = 0;
  }

  // Press timeline (seconds): down 0–1, hold 1–2.4, up 2.4–3.2.
  const depth = p => (p < 0 ? 0 : p < 1 ? kit.ease(p) : p < 2.4 ? 1 : p < 3.2 ? 1 - kit.ease((p - 2.4) / 0.8) : 0);

  function deform(s) {
    const pos = s.geo.attributes.position, b = s.base;
    for (let k = 0; k < pos.count; k++) {
      const x = b[k * 3], u = (2 * x) / L;
      pos.setY(k, b[k * 3 + 1] - s.sag * (1 - u * u));
    }
    pos.needsUpdate = true;
    s.geo.computeVertexNormals();
    s.sagShown = s.sag;
  }

  // The bench is long and low: pick a radius that also fits its width (with labels) in narrow screens.
  const fit = (r, half) => { const f = freeRect(), w = f.r - f.l, h = f.b - f.t; return Math.max(r, (half * Math.min(w, h)) / w); };
  const bench = { radius: 2.45, yaw: 0, pitch: 0.42, target: [0, TOP + 0.35, 0] };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.t = 0; st.auto = false; st.sel = -1;
      st.press = -1; st.done = false; st.water = -1; st.lightOn = false;
      gantry.visible = false;
      verdictTag.show(false);
      showTags(false);
      for (const s of S) {
        s.blocks.visible = i === 2 && !isQuiz;
        s.pusher.visible = (i === 1 || i === 2) && !isQuiz;
        s.head.scale.x = i === 2 ? 0.3 : 1;
        s.dropper.visible = i === 3 && !isQuiz;
        s.drop.visible = false; s.patch.visible = false; s.soak = 0;
        s.torch.visible = i === 4 && !isQuiz;
        s.beam2.visible = s.spot.visible = i === 4 && !isQuiz && s.m.clear;
        s.squash = 1;
      }
      if (isQuiz) { view({ ...bench, radius: fit(2.45, 3.4), yaw: -0.25, pitch: 0.5 }); return; }
      if (i === 0) {
        view({ ...bench, radius: fit(2.45, 3.4) });
        st.auto = true;
        ui.buttons(MATS.map((m, j) => ({ label: m.name, onClick: () => { st.auto = false; pick(j); } })));
        ui.readout('Press a material to pick it up.');
      }
      if (i === 1 || i === 2) {
        gantry.visible = true;
        view({ radius: fit(2.65, 3.6), yaw: i === 1 ? 0.12 : -0.12, pitch: 0.28, target: [0, TOP + 0.62, 0] });
        st.auto = true;
        results(m => (i === 1 ? (m.soft ? 'Soft' : 'Hard') : (m.bend ? 'Bendy' : 'Stiff')));
        ui.buttons([{ label: i === 1 ? 'Press' : 'Push', onClick: () => { st.auto = false; if (st.press < 0) st.press = 0; } }]);
      }
      if (i === 3) {
        view({ radius: fit(2.55, 3.8), yaw: 0.06, pitch: 0.45, target: [0, TOP + 0.45, 0] });
        st.auto = true;
        results(m => (m.soak === 1 ? 'Soaks it up' : m.soak ? 'Soaks a little' : 'Waterproof'));
        ui.buttons([{ label: 'Drop water', onClick: () => {
          st.auto = false; st.water = 0;
          for (const s of S) { s.soak = 0; s.patch.visible = false; s.tag.show(false); }
        } }]);
      }
      if (i === 4) {
        view({ radius: fit(2.65, 3.8), yaw: 0.12, pitch: 0.36, target: [0, TOP + 0.4, -0.1] });
        st.auto = true;
        results(m => (m.clear ? 'See-through' : 'Blocks light'));
        st.toggle = ui.toggle({ label: 'Torches on', value: false, onChange: v => { st.auto = false; st.lightOn = v; } });
      }
      if (i === 5) {
        view({ radius: 1.45, yaw: -0.3, pitch: 0.18, target: [SX, 1.25, 0] });
        ui.buttons(Object.keys(JOBS).map(j => ({ label: j[0].toUpperCase() + j.slice(1), on: j === st.job, onClick: () => { st.job = j; choose(); } })));
        ui.buttons(MATS.map(m => ({ label: m.name, on: m.key === st.mat, onClick: () => { st.mat = m.key; choose(); } })));
        choose();
      }
    },

    update(dt) {
      st.t += dt;
      let busy = false;
      const step = st.step;

      // Step 1: pick up each sample in turn until the learner presses a button.
      if (step === 0 && st.auto) {
        const n = Math.floor((st.t - 0.3) / 2);
        if (st.t > 0.3 && n < MATS.length && n !== st.sel) pick(n);
        if (n >= MATS.length) { st.auto = false; st.sel = -1; }
        busy = true;
      }
      if ((step === 1 || step === 2 || step === 3) && st.auto && st.t > 0.3) {
        st.auto = false;
        if (step === 3) st.water = 0; else st.press = 0;
      }
      if (step === 4 && st.auto && st.t > 0.6) { st.auto = false; st.lightOn = true; if (st.toggle) st.toggle.checked = true; }

      busy = kit.follow(st, 'stand', step === 4 ? 1 : 0, dt, 4) || busy;
      busy = kit.follow(st, 'support', step === 2 ? 1 : 0, dt, 5) || busy;
      busy = kit.follow(st, 'light', st.lightOn ? 1 : 0, dt, 5) || busy;

      let D = 0;
      if (st.press >= 0) {
        st.press += dt;
        D = depth(st.press);
        if (st.press >= 1 && !st.done) { st.done = true; showTags(true); }
        if (st.press > 3.2) st.press = -1;
        busy = true;
      }
      const g = 9.8, fall = 0.95;
      if (st.water >= 0) { st.water += dt; busy = busy || st.water < 4.5; }

      for (const s of S) {
        const m = s.m;
        busy = kit.follow(s, 'lift', step === 0 && st.sel === s.i ? 0.32 : 0, dt, 6) || busy;
        const y0 = TOP + s.lift + SUPPORT * st.support + 0.25 * st.stand;
        s.holder.position.y = y0;
        s.holder.rotation.x = (-Math.PI / 2) * st.stand;
        s.holder.rotation.z = s.lift * 0.7;
        s.blocks.position.y = TOP + SUPPORT * (st.support - 1);

        // Press (step 2) and bend (step 3) tests: the rod comes down; soft samples squash, bendy ones sag.
        const top0 = y0 + m.thick;
        let sagTarget = 0;
        if (step === 1) {
          const maxIn = m.soft ? m.thick * 0.55 : 0;
          const hy = top0 + 0.7 - (0.7 + maxIn) * D;
          s.squash = kit.clamp((hy - y0) / m.thick, 0.4, 1);
          s.pusher.position.y = hy;
        } else s.squash = 1;
        if (step === 2) {
          const hy = top0 + 0.7 - (0.7 + m.bend) * D;
          sagTarget = Math.min(m.bend, Math.max(m.droop * st.support, top0 - hy));
          s.pusher.position.y = Math.max(hy, top0 - sagTarget);
          s.sag = sagTarget;
        } else busy = kit.follow(s, 'sag', 0, dt, 6) || busy;
        if (Math.abs(s.sag - s.sagShown) > 1e-4) deform(s);
        s.mesh.scale.y = s.squash;

        // Water drop test (step 4).
        if (st.water >= 0) {
          const tHit = Math.sqrt((2 * fall) / g), tt = st.water - 0.2 * (s.i % 2);
          const surface = TOP + m.thick;
          if (tt < 0) s.drop.visible = false;
          else if (tt < tHit) {
            s.drop.visible = true;
            s.drop.position.y = surface + fall - 0.5 * g * tt * tt + 0.06;
            s.drop.scale.set(1, 1.2, 1);
          } else {
            const k = m.soak ? kit.clamp((tt - tHit) / (m.soak === 1 ? 1.0 : 2.5), 0, 1) : 0;
            s.soak = k * m.soak;
            const bead = 1 - (m.soak === 1 ? k : k * 0.45);
            s.drop.visible = bead > 0.02;
            s.drop.scale.set(bead * 1.25, bead * 0.6, bead * 1.25);
            s.drop.position.y = surface + 0.035 * bead;
            s.patch.visible = s.soak > 0;
            const r = (m.soak === 1 ? 0.21 : 0.13) * k + 0.01;
            s.patch.scale.set(r, r, r);
            if (tt > tHit + 0.5) s.tag.show(true);
          }
        }

        // Torch test (step 5).
        if (s.torch.visible && st.light > 0.5 && !s.tag.visible) s.tag.show(true);
      }
      beamMat.opacity = 0.4 * st.light;
      spotMat.opacity = st.light;

      if (step === 5) {
        busy = kit.follow(st, 'pop', 1, dt, 5) || busy;
        const sc = 0.85 + 0.15 * st.pop;
        build.scale.set(sc, sc, sc);
      }
      return busy;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function paint(THREE, w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

function nameTex(THREE, name) {
  return paint(THREE, 128, 40, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d2b36'; g.font = 'bold 24px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, w / 2, h / 2 + 1);
  });
}

function textures(THREE) {
  const wood = paint(THREE, 128, 64, (g, w, h) => {
    g.fillStyle = '#c98f55'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a8703d'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const y = 4 + i * 7 + rand(i) * 3;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 2);
      g.stroke();
    }
  });
  const fabric = paint(THREE, 64, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(58,134,255,0.55)';
    g.fillRect(0, 0, w / 2, h); g.fillRect(0, 0, w, h / 2);
    g.fillStyle = 'rgba(58,134,255,0.5)'; g.fillRect(0, 0, w / 2, h / 2);
  }, [4, 3]);
  return { wood, fabric };
}
