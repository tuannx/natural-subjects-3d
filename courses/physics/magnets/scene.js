// Magnets: a bar magnet tests household objects, picks up paper clips at its poles, attracts and
// repels a second magnet, pulls a clip across a gap, works through card and water, and turns a compass.
const HALF = 1.0;           // half the length of the bar magnet
const OBJS = [
  { key: 'clip', name: 'Clip', mag: true, half: 0.12, y: 0.02, msg: 'The paper clip <b>sticks</b>! It is made of steel.' },
  { key: 'nail', name: 'Nail', mag: true, half: 0.07, y: 0.05, msg: 'The nail <b>sticks</b>! It is made of iron.' },
  { key: 'coin', name: 'Coin', mag: false, half: 0.16, y: 0.025, msg: 'The coin <b>does not stick</b>. Most coins are made of metals that magnets do not attract.' },
  { key: 'eraser', name: 'Eraser', mag: false, half: 0.16, y: 0.1, msg: 'The eraser <b>does not stick</b>. Rubber is not attracted.' },
  { key: 'foil', name: 'Foil', mag: false, half: 0.15, y: 0.15, msg: 'The foil <b>does not stick</b>. It is a metal, but aluminum is not attracted.' },
];
const ROW_Z = 0.8;
const homeX = i => -2 + i;
const TRAY = { yes: -1.5, no: 1.5 };
const SORT_TO = { clip: [-1.85, 0.3], nail: [-1.15, 0.3], coin: [0.9, 0.3], eraser: [1.5, 0.3], foil: [2.1, 0.3] };
const K_MAG = 1.2, MU = 0.8;  // magnet-on-magnet push/pull strength and sliding friction (step 4)

export default function setup({ THREE, scene, kit, ui, label, view, invalidate }) {
  const ground = kit.stage(scene, { ground: 0xe9d6b5, sky: 0xe8f1ff, radius: 16 });
  // Push the big ground disc back in depth so flat things lying on it (mats, lanes) never flicker through.
  Object.assign(ground.material, { polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 });
  kit.lights(scene, { sun: [3, 10, 6] });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- Bar magnet: blue S half, red N half (N at local +x) ----------
  function makeMagnet() {
    const m = new THREE.Group();
    const geo = new THREE.BoxGeometry(HALF, 0.35, 0.5);
    kit.mesh(geo, kit.mat(0xffffff, { map: letterTex(THREE, 'S', '#2f6fdf') }), [-HALF / 2, 0.175, 0], m);
    kit.mesh(geo, kit.mat(0xffffff, { map: letterTex(THREE, 'N', '#e63946') }), [HALF / 2, 0.175, 0], m);
    return m;
  }
  const magnet = makeMagnet();
  scene.add(magnet);
  const magTag = label('Magnet', new THREE.Object3D());
  magnet.add(magTag.at); magTag.at.position.set(0, 0.55, 0);
  const nTag = label('N pole', new THREE.Object3D(), { cls: 'warm' });
  const sTag = label('S pole', new THREE.Object3D(), { cls: 'cool' });
  magnet.add(nTag.at, sTag.at);
  nTag.at.position.set(HALF - 0.45, 0.5, 0); sTag.at.position.set(-HALF + 0.45, 0.5, 0);
  const magnet2 = makeMagnet();
  scene.add(magnet2);

  // ---------- Household objects ----------
  const steel = kit.mat(0xc0c7d0, { metalness: 0.8, roughness: 0.3 });
  const clipGeo = new THREE.TorusGeometry(0.1, 0.016, 6, 20);
  clipGeo.scale(1.7, 1, 1);
  const makeClip = () => { const c = new THREE.Mesh(clipGeo, steel); c.castShadow = true; c.rotation.x = Math.PI / 2; return c; };
  const builders = {
    clip: () => { const g = new THREE.Group(); const c = makeClip(); c.position.y = 0.02; g.add(c); return g; },
    nail: () => {
      const g = new THREE.Group(), iron = kit.mat(0x8a8f99, { metalness: 0.7, roughness: 0.45 });
      kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), iron, [0, 0.05, 0], g).rotation.z = Math.PI / 2;
      kit.mesh(new THREE.ConeGeometry(0.025, 0.08, 8), iron, [0.29, 0.05, 0], g).rotation.z = -Math.PI / 2;
      kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), iron, [-0.26, 0.05, 0], g).rotation.z = Math.PI / 2;
      return g;
    },
    coin: () => { const g = new THREE.Group(); kit.mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 24), kit.mat(0xc8763c, { metalness: 0.8, roughness: 0.35 }), [0, 0.02, 0], g); return g; },
    eraser: () => { const g = new THREE.Group(); kit.mesh(new THREE.BoxGeometry(0.45, 0.16, 0.28), kit.mat(0xff8fab), [0, 0.08, 0], g); return g; },
    foil: () => {
      const geo = new THREE.IcosahedronGeometry(0.15, 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const key = Math.round(p.getX(i) * 60) * 7 + Math.round(p.getY(i) * 60) * 13 + Math.round(p.getZ(i) * 60) * 29;
        const s = 0.8 + rand(key) * 0.3;
        p.setXYZ(i, p.getX(i) * s, p.getY(i) * s, p.getZ(i) * s);
      }
      geo.computeVertexNormals();
      const g = new THREE.Group();
      kit.mesh(geo, kit.mat(0xdfe3e8, { metalness: 0.9, roughness: 0.25, flatShading: true }), [0, 0.15, 0], g);
      return g;
    },
  };
  const things = OBJS.map((d, i) => {
    const g = builders[d.key]();
    scene.add(g);
    const a = new THREE.Object3D();
    a.position.set(0, 0.25, i % 2 ? 0.3 : 0);  // every other label sits a little lower on screen
    g.add(a);
    return { ...d, g, tag: label(d.name, a), i };
  });

  // Sorting trays.
  const trayMat = { yes: kit.mat(0xffd6a5), no: kit.mat(0xbde0fe) };
  const trays = {};
  for (const k of ['yes', 'no']) {
    const t = new THREE.Group();
    kit.mesh(new THREE.BoxGeometry(1.9, 0.04, 1.1), trayMat[k], [0, 0.02, 0], t);
    for (const [x, z, w, d] of [[0, -0.53, 1.9, 0.04], [0, 0.53, 1.9, 0.04], [-0.93, 0, 0.04, 1.1], [0.93, 0, 0.04, 1.1]])
      kit.mesh(new THREE.BoxGeometry(w, 0.12, d), trayMat[k], [x, 0.06, z], t);
    t.position.set(TRAY[k], 0, 0.3);
    scene.add(t);
    trays[k] = t;
  }
  const yesTag = label('Sticks', V(TRAY.yes, 0.25, -0.25), { cls: 'warm' });
  const noTag = label('Does not stick', V(TRAY.no, 0.25, -0.25), { cls: 'cool' });

  // Pile of paper clips for the poles step: some near each end, some under the middle.
  const pile = [];
  for (let i = 0; i < 18; i++) {
    const c = makeClip();
    const group = i % 3; // 0: under N end, 1: under S end, 2: under the middle
    const x = group === 0 ? 0.75 + rand(i) * 0.4 : group === 1 ? -1.15 + rand(i) * 0.4 : -0.5 + rand(i) * 1.0;
    c.home = V(x, 0.02 + (i % 4) * 0.012, -0.35 + rand(i + 50) * 0.7);
    c.homeRot = rand(i + 9) * Math.PI;
    c.group = group;
    scene.add(c);
    pile.push(c);
  }

  // Card on four posts, and a glass tank of water (step 6).
  const CARD_Y = 1.12;
  const stand = new THREE.Group();
  scene.add(stand);
  for (const [x, z] of [[-1.15, -0.75], [1.15, -0.75], [-1.15, 0.75], [1.15, 0.75]]) kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, CARD_Y, 8), kit.mat(0x8d6e63), [x, CARD_Y / 2, z], stand);
  const card = kit.mesh(new THREE.BoxGeometry(2.5, 0.03, 1.7), kit.mat(0xfdfcf7), [0, CARD_Y + 0.015, 0], stand);
  const tank = new THREE.Group();
  stand.add(tank);
  const glassGeo = new THREE.BoxGeometry(2.4, 0.8, 1.6);
  const glass = new THREE.Mesh(glassGeo, new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.y = CARD_Y + 0.4; glass.renderOrder = 2;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glassGeo), new THREE.LineBasicMaterial({ color: 0x7fb2cc }));
  edges.position.copy(glass.position);
  const water = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.6, 1.56), new THREE.MeshStandardMaterial({ color: 0x3b9be0, transparent: true, opacity: 0.35, depthWrite: false }));
  water.position.y = CARD_Y + 0.33; water.renderOrder = 1;
  tank.add(glass, edges, water);
  const glassBase = kit.mesh(new THREE.BoxGeometry(2.4, 0.03, 1.6), kit.mat(0xcfe8f5, { transparent: true, opacity: 0.8 }), [0, CARD_Y + 0.015, 0], tank);
  glassBase.castShadow = false;
  const floatClip = makeClip();
  scene.add(floatClip);
  const cardTag = label('Card', V(-0.9, CARD_Y + 0.05, 0.85));
  const waterTag = label('Water', V(-0.9, CARD_Y + 0.5, 0.8), { cls: 'cool' });
  const underTag = label('Magnet under', new THREE.Object3D(), { cls: 'warm' });
  scene.add(underTag.at);

  // Compass and fridge (step 7).
  const compass = new THREE.Group();
  compass.position.set(-1, 0, 0.2);
  scene.add(compass);
  const caseG = new THREE.Group();
  compass.add(caseG);
  kit.mesh(new THREE.CylinderGeometry(0.72, 0.75, 0.14, 32), kit.mat(0x6c757d, { metalness: 0.4, roughness: 0.5 }), [0, 0.07, 0], caseG);
  const face = kit.mesh(new THREE.CircleGeometry(0.64, 32), kit.mat(0xffffff, { map: compassTex(THREE) }), [0, 0.142, 0], caseG);
  face.rotation.x = -Math.PI / 2;
  const needle = new THREE.Group();
  needle.position.y = 0.19;
  compass.add(needle);
  const redCone = kit.mesh(new THREE.ConeGeometry(0.08, 0.55, 4), kit.mat(0xe63946), [0, 0, -0.275], needle);
  redCone.rotation.x = -Math.PI / 2; redCone.scale.set(1, 1, 0.3);
  const whiteCone = kit.mesh(new THREE.ConeGeometry(0.08, 0.55, 4), kit.mat(0xf1f1f1), [0, 0, 0.275], needle);
  whiteCone.rotation.x = Math.PI / 2; whiteCone.scale.set(1, 1, 0.3);
  kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), kit.mat(0x333333), [0, 0.01, 0], needle);
  const compassTag = label('Compass', V(-1, 0.05, 1.2));
  const fridge = new THREE.Group();
  fridge.position.set(1.9, 0, -1.7);
  scene.add(fridge);
  kit.mesh(new THREE.BoxGeometry(1.5, 2.6, 0.3), kit.mat(0xf8f9fa, { roughness: 0.4 }), [0, 1.3, 0], fridge);
  kit.mesh(new THREE.BoxGeometry(0.06, 0.8, 0.08), kit.mat(0xadb5bd), [-0.6, 1.6, 0.19], fridge);
  const note = kit.mesh(new THREE.PlaneGeometry(0.55, 0.7), kit.mat(0xffffff, { map: noteTex(THREE) }), [0.15, 1.65, 0.152], fridge);
  note.castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20), kit.mat(0xff006e), [0.15, 1.92, 0.18], fridge).rotation.x = Math.PI / 2;
  const fridgeTag = label('Fridge door', V(1.9, 2.75, -1.55));
  const northArrow = makeArrow(0x264653);
  northArrow.set(-2.3, 0.03, 0.9, 0, -1, 1.4);
  const northTag = label('North', V(-2.3, 0.05, -0.75), { cls: 'big' });

  // Flat arrow helper. set(x, y, z, dx, dz, len): tail at (x, y, z), pointing along (dx, dz).
  function makeArrow(color) {
    const a = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), m);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 14), m);
    shaft.rotation.z = head.rotation.z = -Math.PI / 2;
    a.add(shaft, head);
    a.tip = new THREE.Object3D();
    a.add(a.tip);
    a.visible = false;
    scene.add(a);
    a.set = (x, y, z, dx, dz, len) => {
      a.position.set(x, y, z);
      a.rotation.y = Math.atan2(-dz, dx);
      shaft.scale.y = Math.max(0.001, len); shaft.position.x = len / 2;
      head.position.x = len + 0.12;
      a.tip.position.set(len / 2, 0.15, 0);
    };
    return a;
  }
  const forceArrow = makeArrow(0x7b2cbf);
  const forceTag = label('', forceArrow.tip);

  // ---------- Tweens (made only on a button press, never per frame) ----------
  let tweens = [];
  function tween(obj, to, dur, { arc = 0, delay = 0, done } = {}) {
    tweens = tweens.filter(t => t.obj !== obj);
    tweens.push({ obj, from: obj.position.clone(), to: to.clone ? to.clone() : V(...to), dur, arc, t: -delay, done });
  }

  const st = { step: 0, time: 0, plan: [], testing: null, gap: 2, stuck: false, slider: null, flipped: false, x2: 1.3, v2: 0, mode: 'card', near: false, turn: 0, needle: 0, dipT: -1 };

  // Step 1: test one object.
  function homeAll() { things.forEach(o => { o.g.position.set(homeX(o.i), 0, ROW_Z); o.g.rotation.set(0, 0, 0); }); }
  function test(o) {
    things.forEach(t => { if (t !== o) tween(t.g, V(homeX(t.i), 0, ROW_Z), 0.4); });
    const mz = ROW_Z - o.half - 0.45 - HALF;
    tween(magnet, V(homeX(o.i), 0, mz), 0.8, {
      done: () => {
        if (o.mag) tween(o.g, V(homeX(o.i), 0, mz + HALF + o.half + 0.01), 0.18);
        ui.readout(o.msg);
      },
    });
  }
  // Step 2: sort into trays.
  function sortAll() {
    things.forEach((o, j) => tween(o.g, V(SORT_TO[o.key][0], 0.04, SORT_TO[o.key][1]), 0.6, { arc: 0.7, delay: j * 0.35 }));
    st.plan.push([st.time + 2.3, () => ui.readout('<b>Sticks:</b> paper clip, nail<br><b>Does not stick:</b> coin, eraser, foil')]);
  }
  // Step 3: dip the magnet into the clip pile; clips near the poles cling.
  function resetPile() {
    for (const c of pile) { scene.attach(c); c.position.copy(c.home); c.rotation.set(Math.PI / 2, 0, c.homeRot); }
  }
  function dip() {
    resetPile();
    magnet.position.set(0, 1.2, 0);
    tween(magnet, V(0, 0.06, 0), 0.8, {
      done: () => {
        let n = [0, 0];
        for (const c of pile) {
          if (c.group === 2) continue;
          const side = c.group === 0 ? 1 : -1, k = n[c.group]++;
          magnet.attach(c);
          c.rotation.set(0, 0, rand(k + c.group * 7) - 0.5);
          tween(c, V(side * (0.78 + (k % 3) * 0.1), -0.08 - Math.floor(k / 3) * 0.17, (k % 2 ? 0.12 : -0.12)), 0.25);
        }
        tween(magnet, V(0, 1.2, 0), 0.9, { delay: 0.3, done: () => ui.readout('The clips hang from the <b>two poles</b>. Almost none stick to the middle.') });
      },
    });
  }
  // Step 4: two magnets.
  function placeMagnet2() {
    magnet2.position.set(st.x2, 0, 0);
  }
  function flip() {
    st.flipped = !st.flipped;
    st.flipT = 0.35;
    ui.readout(st.flipped ? '<b>N faces N</b>: like poles <b>repel</b>.' : '<b>N faces S</b>: opposite poles <b>attract</b>.');
  }
  // Step 5: magnet slider.
  const CLIP_X = 1.0;
  function setGap(g) {
    st.gap = g;
    magnet.position.set(CLIP_X - 0.12 - g - HALF, 0, 0);
    if (st.stuck) things[0].g.position.x = magnet.position.x + HALF + 0.12;
    else if (g < 0.45) { st.stuck = true; tween(things[0].g, V(magnet.position.x + HALF + 0.12, 0, 0), 0.15); }
    const pull = st.stuck ? 'The pull is strong enough. The clip <b>jumps</b> to the magnet!' : g > 1.4 ? 'The magnet is far away. The pull is <b>too weak</b> to move the clip.' : 'The pull is <b>getting stronger</b>, but it still cannot move the clip.';
    if (pull !== st.msg) { st.msg = pull; ui.readout(pull); }
  }
  function clipBack() {
    st.stuck = false; st.msg = '';
    things[0].g.position.set(CLIP_X, 0, 0);
    setGap(Math.max(st.gap, 0.6));
    st.slider?.set(st.gap);
  }

  function hideAll() {
    magnet.visible = magnet2.visible = stand.visible = card.visible = tank.visible = floatClip.visible = false;
    compass.visible = fridge.visible = northArrow.visible = forceArrow.visible = false;
    trays.yes.visible = trays.no.visible = false;
    things.forEach(o => { o.g.visible = false; o.tag.show(false); });
    pile.forEach(c => { c.visible = false; });
    for (const t of [magTag, nTag, sTag, yesTag, noTag, cardTag, waterTag, underTag, compassTag, fridgeTag, northTag, forceTag]) t.show(false);
    resetPile();
    magnet.scale.setScalar(1); magnet.rotation.set(0, 0, 0); magnet.position.set(0, 0, 0);
    tweens = [];
  }

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.time = 0; st.plan = []; st.msg = '';
      hideAll();
      if (i === 0 || isQuiz) {
        view(isQuiz ? { radius: 2.4, yaw: -0.35, pitch: 0.55, target: [0, 0.15, 0.1] } : { radius: 2.2, yaw: 0.15, pitch: 0.6, target: [0, 0.15, 0.1] });
        magnet.visible = true;
        magnet.rotation.y = -Math.PI / 2;
        magnet.position.set(0, 0, -0.9);
        things.forEach(o => { o.g.visible = true; o.tag.show(true); });
        homeAll();
        if (!isQuiz) {
          st.plan = [[0.3, () => test(things[0])]];
          ui.buttons(things.map(o => ({ label: o.name, onClick: () => { st.plan = []; test(o); } })));
          ui.readout('Pick an object to test.');
        }
      }
      if (i === 1) {
        view({ radius: 2.6, yaw: 0, pitch: 0.75, target: [0, 0.1, 0.2] });
        trays.yes.visible = trays.no.visible = true; yesTag.show(true); noTag.show(true);
        things.forEach(o => { o.g.visible = true; });
        homeAll();
        things.forEach(o => { o.g.position.z = 1.3; });
        st.plan = [[0.3, sortAll]];
        ui.buttons([{ label: 'Sort them all', onClick: () => { st.plan = []; things.forEach(o => { o.g.position.set(homeX(o.i), 0, 1.3); }); sortAll(); } }]);
      }
      if (i === 2) {
        view({ radius: 1.9, yaw: 0.25, pitch: 0.3, target: [0, 0.6, 0] });
        magnet.visible = true; nTag.show(true); sTag.show(true);
        pile.forEach(c => { c.visible = true; });
        magnet.position.set(0, 1.2, 0);
        st.plan = [[0.2, dip]];
        ui.buttons([{ label: 'Dip in paper clips', onClick: () => { st.plan = []; dip(); } }]);
        ui.readout('Where will the clips stick?');
      }
      if (i === 3) {
        view({ radius: 2.7, yaw: 0.15, pitch: 0.45, target: [0.4, 0.2, 0] });
        magnet.visible = magnet2.visible = true; nTag.show(true);
        magnet.position.set(-1.3, 0, 0);
        st.flipped = false; st.x2 = 1.3; st.v2 = 0; st.flipT = 0;
        magnet2.rotation.set(0, 0, 0);
        placeMagnet2();
        forceArrow.visible = true; forceTag.show(true);
        st.plan = [[1.6, flip]];
        ui.buttons([{ label: 'Flip the right magnet', onClick: () => { st.plan = []; flip(); } },
          { label: 'Start again', onClick: () => { st.plan = []; st.x2 = 1.3; st.v2 = 0; invalidate(); } }]);
        ui.readout('<b>N faces S</b>: opposite poles <b>attract</b>.');
      }
      if (i === 4) {
        view({ radius: 2.5, yaw: 0.15, pitch: 0.5, target: [-0.6, 0.2, 0] });
        magnet.visible = true; magTag.show(true);
        const clip = things[0];
        clip.g.visible = true; clip.tag.show(true);
        st.stuck = false;
        clip.g.position.set(CLIP_X, 0, 0);
        setGap(2.2);
        forceArrow.visible = true; forceTag.show(true);
        st.slider = ui.slider({ label: 'Move the magnet closer', min: 0.3, max: 2.2, step: 0.05, value: 2.2, format: v => (v > 1.4 ? 'far' : v > 0.6 ? 'closer' : 'very close'),
          onInput: v => { st.auto = false; setGap(v); invalidate(); } });
        ui.buttons([{ label: 'Put the clip back', onClick: () => { st.auto = false; clipBack(); invalidate(); } }]);
        st.auto = true;
      }
      if (i === 5) {
        view({ radius: 2.1, yaw: 0.3, pitch: 0.42, target: [0, 0.8, 0] });
        magnet.visible = stand.visible = floatClip.visible = true; underTag.show(true);
        magnet.scale.setScalar(0.5); magnet.rotation.set(0, 0, Math.PI / 2);
        const setMode = mode => {
          st.mode = mode;
          card.visible = mode === 'card'; tank.visible = mode === 'water';
          cardTag.show(mode === 'card'); waterTag.show(mode === 'water');
          ui.readout(mode === 'card' ? 'The magnet pulls the clip <b>through the card</b>.' : 'The magnet pulls the clip <b>through the glass and the water</b>.');
        };
        setMode('card');
        floatClip.position.set(0.5, CARD_Y + 0.045, 0); floatClip.rotation.set(Math.PI / 2, 0, 0);
        ui.buttons([{ label: 'Through card', on: true, onClick: () => setMode('card') }, { label: 'Through water', onClick: () => setMode('water') }]);
      }
      if (i === 6) {
        view({ radius: 2.4, yaw: 0.2, pitch: 0.55, target: [-0.2, 0.5, -0.4] });
        compass.visible = fridge.visible = northArrow.visible = magnet.visible = true;
        compassTag.show(true); fridgeTag.show(true); northTag.show(true);
        st.turn = 0; st.near = false; st.needle = 0;
        magnet.position.set(5, 0, 0.2);
        const turn = ui.slider({ label: 'Turn the compass', min: 0, max: 360, step: 5, value: 0, unit: '°', onInput: v => { st.turn = (v * Math.PI) / 180; invalidate(); } });
        ui.toggle({ label: 'Bring a magnet near', value: false, onChange: v => {
          st.near = v;
          tween(magnet, V(v ? 1.15 : 5, 0, 0.2), 0.8);
          ui.readout(v ? 'The red end points at the <b>magnet</b>.' : 'The red end points <b>north</b>.');
        } });
        st.plan = [[0.2, () => { st.turn = (70 * Math.PI) / 180; turn.set(70); }]];
        ui.readout('The red end points <b>north</b>.');
      }
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      let busy = st.plan.length > 0 || tweens.length > 0;

      for (const tw of tweens) {
        tw.t += dt;
        if (tw.t < 0) continue;
        const p = Math.min(1, tw.t / tw.dur), e = kit.ease(p);
        tw.obj.position.lerpVectors(tw.from, tw.to, e);
        tw.obj.position.y += tw.arc * 4 * p * (1 - p);
        if (p >= 1) { tw.fin = true; }
      }
      if (tweens.some(t => t.fin)) {
        const fin = tweens.filter(t => t.fin);
        tweens = tweens.filter(t => !t.fin);
        fin.forEach(t => t.done?.());
      }

      // Step 4: magnet on magnet. Force grows quickly as the gap shrinks; friction stops slow slides.
      if (st.step === 3) {
        if (st.flipT > 0) {
          st.flipT -= dt;
          const p = 1 - Math.max(0, st.flipT) / 0.35;
          magnet2.rotation.y = (st.flipped ? p : 1 - p) * Math.PI;
          magnet2.position.y = Math.sin(p * Math.PI) * 0.3;
          busy = true;
        } else magnet2.rotation.y = st.flipped ? Math.PI : 0;
        const gap = st.x2 - HALF - (magnet.position.x + HALF);
        const sign = st.flipped ? 1 : -1, a = (sign * K_MAG) / (gap + 0.3) ** 2;
        const resting = sign < 0 && st.x2 <= magnet.position.x + 2 * HALF + 1e-6;
        if (!resting && (st.v2 !== 0 || Math.abs(a) > MU)) {
          const fr = st.v2 !== 0 ? -Math.sign(st.v2) * MU : -Math.sign(a) * MU;
          const before = st.v2;
          st.v2 += (a + fr) * dt;
          if (before !== 0 && Math.sign(st.v2) !== Math.sign(before) && Math.abs(a) <= MU) st.v2 = 0;
          st.x2 += st.v2 * dt;
          const minX = magnet.position.x + 2 * HALF;
          if (st.x2 <= minX) { st.x2 = minX; st.v2 = 0; }
          if (st.x2 > 2.7) { st.x2 = 2.7; st.v2 = 0; }
          busy = true;
        }
        placeMagnet2();
        const len = 0.25 + Math.min(1.0, Math.abs(a) * 0.12);
        forceArrow.set(st.x2 - HALF + (sign > 0 ? 0.3 : 0.2 + len + 0.26), 0.55, 0.45, sign, 0, len);
        forceTag.text = sign > 0 ? 'Push apart' : 'Pull together';
      }
      if (st.step === 4) {
        if (st.auto && !st.stuck) {
          const g = Math.max(0.4, 2.2 - Math.max(0, st.time - 0.3) * 0.9);
          setGap(g); st.slider?.set(g);
          busy = true;
        }
        const clip = things[0].g;
        forceArrow.visible = !st.stuck; forceTag.show(!st.stuck);
        if (!st.stuck) {
          const len = Math.min(1.1, 0.12 + 0.12 / (st.gap * st.gap));
          forceArrow.set(clip.position.x + 0.15, 0.06, 0.32, -1, 0, len);
          forceTag.text = 'Pull';
        }
      }
      if (st.step === 5) {
        const w = st.time * 1.4;
        magnet.position.set(0.55 * Math.cos(w), 0.52, 0.38 * Math.sin(w));
        underTag.at.position.set(magnet.position.x, 0.3, magnet.position.z + 0.3);
        kit.follow(floatClip.position, 'x', magnet.position.x, dt, 5);
        kit.follow(floatClip.position, 'z', magnet.position.z, dt, 5);
        floatClip.rotation.z = -w;
        busy = true;
      }
      if (st.step === 6) {
        caseG.rotation.y = st.turn;
        // Red end (local -z) points north (-z) on its own, or toward the magnet's S pole (+x) when it is near.
        const want = st.near ? -Math.PI / 2 : 0;
        if (kit.follow(st, 'needle', want, dt, 3)) busy = true;
        needle.rotation.y = st.needle;
      }
      return busy;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function canvasTex(THREE, w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function letterTex(THREE, letter, color) {
  return canvasTex(THREE, 128, 64, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(letter, w / 2, h / 2 + 2);
  });
}
function compassTex(THREE) {
  return canvasTex(THREE, 256, 256, (g, w) => {
    g.fillStyle = '#fffdf5'; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#adb5bd'; g.lineWidth = 2;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2, r1 = i % 9 === 0 ? 92 : 104;
      g.beginPath(); g.moveTo(128 + Math.sin(a) * r1, 128 - Math.cos(a) * r1); g.lineTo(128 + Math.sin(a) * 118, 128 - Math.cos(a) * 118); g.stroke();
    }
    g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [['N', 0, '#e63946'], ['E', 1, '#333'], ['S', 2, '#333'], ['W', 3, '#333']].forEach(([t, i, c]) => {
      const a = (i * Math.PI) / 2; g.fillStyle = c; g.fillText(t, 128 + Math.sin(a) * 72, 128 - Math.cos(a) * 72);
    });
  });
}
function noteTex(THREE) {
  return canvasTex(THREE, 128, 160, (g, w, h) => {
    g.fillStyle = '#fff7ae'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8ecae6'; g.lineWidth = 3;
    for (let y = 50; y < h - 10; y += 22) { g.beginPath(); g.moveTo(12, y); g.lineTo(w - 12, y); g.stroke(); }
    g.fillStyle = '#333'; g.font = 'bold 20px sans-serif'; g.fillText('Shopping', 14, 30);
  });
}
