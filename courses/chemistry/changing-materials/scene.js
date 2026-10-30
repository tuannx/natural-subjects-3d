// Heat it, cool it: a kitchen counter with a hot plate, a cold box (freezer) and a thermometer.
// The Heat slider warms the hot plate; Cool moves the pan into the freezer. Chocolate, ice and wax
// change back and forth; an egg, bread dough and paper change for good. The last step sorts them.
const CT = 0.9;                 // counter top
const BASE = CT + 0.12;         // top of the hot plate and of the freezer floor
const STOVE = -0.75, FREEZE = 0.95, THERMO = -1.75;
const MATS_X = { undo: -1.15, keep: 1.15 };

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xd9cbb5, sky: 0xeaf4ff });
  kit.lights(scene, { sun: [2, 9, 6] });
  const tex = textures(THREE);
  const C = c => new THREE.Color(c);

  // Counter and tiled wall.
  kit.mesh(new THREE.BoxGeometry(6.2, CT - 0.06, 1.7), kit.mat(0x8ecae6), [0, (CT - 0.06) / 2, 0], scene).castShadow = false;
  kit.mesh(new THREE.BoxGeometry(6.4, 0.06, 1.8), kit.mat(0xf1e3c8), [0, CT - 0.03, 0], scene);
  const wall = kit.mesh(new THREE.PlaneGeometry(6.4, 1.6), kit.mat(0xffffff, { map: tex.tiles }), [0, CT + 0.8, -0.9], scene);
  wall.castShadow = false;

  // Appliances: hot plate, freezer, thermometer (hidden while sorting).
  const appliances = new THREE.Group();
  scene.add(appliances);
  kit.mesh(new THREE.BoxGeometry(1.1, 0.12, 0.95), kit.mat(0x2b2d42), [STOVE, CT + 0.06, -0.1], appliances);
  const ringMat = kit.mat(0x555b6e, { emissive: 0xff3b1f, emissiveIntensity: 0 });
  const ring = kit.mesh(new THREE.TorusGeometry(0.47, 0.035, 6, 40), ringMat, [STOVE, BASE + 0.005, -0.1], appliances);
  ring.rotation.x = -Math.PI / 2;
  const knob = kit.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), kit.mat(0xd90429), [STOVE + 0.42, CT + 0.06, 0.38], appliances);
  knob.rotation.x = Math.PI / 2;

  const white = kit.mat(0xf8fbff), icy = kit.mat(0xbfe6ff, { roughness: 0.4 });
  const fz = new THREE.Group();
  fz.position.set(FREEZE, CT, -0.1);
  appliances.add(fz);
  kit.mesh(new THREE.BoxGeometry(1.3, 0.12, 1.0), white, [0, 0.06, 0], fz);
  kit.mesh(new THREE.BoxGeometry(1.2, 0.01, 0.9), icy, [0, 0.125, 0], fz);
  kit.mesh(new THREE.BoxGeometry(1.3, 0.62, 0.06), white, [0, 0.43, -0.47], fz);
  kit.mesh(new THREE.BoxGeometry(1.18, 0.5, 0.01), icy, [0, 0.4, -0.435], fz);
  for (const sx of [-1, 1]) {
    kit.mesh(new THREE.BoxGeometry(0.06, 0.62, 1.0), white, [sx * 0.62, 0.43, 0], fz);
    kit.mesh(new THREE.BoxGeometry(0.01, 0.5, 0.88), icy, [sx * 0.585, 0.4, 0], fz);
  }
  kit.mesh(new THREE.BoxGeometry(1.3, 0.12, 0.06), white, [0, 0.18, 0.47], fz);
  // Frost flakes on the inside walls.
  const flakeGeo = new THREE.OctahedronGeometry(0.025, 0), flakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 18; i++) {
    const f = new THREE.Mesh(flakeGeo, flakeMat);
    const side = i % 3;
    if (side === 0) f.position.set(-0.5 + rand(i) * 1.0, 0.25 + rand(i + 5) * 0.4, -0.425);
    else f.position.set((side === 1 ? -1 : 1) * 0.575, 0.25 + rand(i + 5) * 0.4, -0.38 + rand(i + 9) * 0.75);
    fz.add(f);
  }

  const thermo = new THREE.Group();
  thermo.position.set(THERMO, CT, -0.3);
  appliances.add(thermo);
  kit.mesh(new THREE.BoxGeometry(0.3, 1.1, 0.06), kit.mat(0xffffff), [0, 0.62, -0.05], thermo);
  const tube = kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 12), new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.45, roughness: 0.1 }), [0, 0.66, 0.02], thermo);
  tube.castShadow = false;
  kit.mesh(new THREE.SphereGeometry(0.08, 16, 10), kit.mat(0xe63946), [0, 0.17, 0.02], thermo);
  const colGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 8);
  colGeo.translate(0, 0.5, 0);
  const column = kit.mesh(colGeo, kit.mat(0xe63946), [0, 0.2, 0.02], thermo);
  // Tick marks; the blue one is 0 °C, where water freezes.
  for (let k = 0; k < 5; k++) kit.mesh(new THREE.BoxGeometry(k === 1 ? 0.16 : 0.1, 0.012, 0.01), kit.mat(k === 1 ? 0x1d6fd8 : 0x8d99ae), [0.07, 0.3 + k * 0.18, 0.0], thermo);

  // The carrier moves between the hot plate and the freezer. It holds a pan or a baking tray.
  const carrier = new THREE.Group();
  scene.add(carrier);
  const pan = new THREE.Group();
  kit.mesh(new THREE.CylinderGeometry(0.44, 0.4, 0.03, 28), kit.mat(0x3d405b, { metalness: 0.4, roughness: 0.4 }), [0, 0.015, 0], pan);
  const rim = kit.mesh(new THREE.CylinderGeometry(0.46, 0.44, 0.09, 28, 1, true), kit.mat(0x3d405b, { metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }), [0, 0.06, 0], pan);
  rim.castShadow = false;
  kit.mesh(new THREE.BoxGeometry(0.08, 0.04, 0.42), kit.mat(0x222222), [0, 0.13, 0.64], pan).rotation.x = -0.3;
  carrier.add(pan);
  const tray = kit.mesh(new THREE.BoxGeometry(1.0, 0.03, 0.6), kit.mat(0x8d99ae, { metalness: 0.5, roughness: 0.35 }), [0, 0.015, 0], carrier);

  // Items. Each is a group with its own state, an apply() that draws that state and a label.
  const items = {};
  const anchorAt = (g, y) => { const a = new THREE.Object3D(); a.position.y = y; g.add(a); return a; };

  { // Chocolate: a block that melts into a puddle; the puddle can set hard again.
    const g = new THREE.Group();
    const block = kit.mesh(new THREE.BoxGeometry(0.48, 0.1, 0.3), kit.mat(0xffffff, { map: tex.choc }), [0, 0.05, 0], g);
    const pm = kit.mat(0x6b3a1f);
    const puddle = kit.mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.03, 28), pm, [0, 0.015, 0], g);
    const solid = C(0x7a4526), liquid = C(0x4a2512);
    items.choc = { g, name: 'Chocolate', undo: true, m: 0, f: 0, anchor: anchorAt(g, 0.3),
      apply() {
        const s = 1 - 0.75 * this.f;
        block.visible = this.f < 0.97; block.scale.set(s, s, s); block.position.y = 0.05 * s + 0.02 * this.f;
        puddle.visible = this.f > 0.02; const r = 0.25 + 0.75 * this.f; puddle.scale.set(r, 1, r);
        pm.color.lerpColors(solid, liquid, this.m); pm.roughness = kit.lerp(0.8, 0.12, this.m);
      },
      state() { return this.m > 0.9 ? 'Chocolate: liquid' : this.m > 0.1 ? 'Chocolate: melting' : this.f > 0.5 ? 'Chocolate: solid again' : 'Chocolate: solid'; },
    };
  }
  { // Water in an ice-cube tray: freezes into cubes and melts back.
    const g = new THREE.Group();
    const trayMat = kit.mat(0x90e0ef);
    kit.mesh(new THREE.BoxGeometry(0.66, 0.025, 0.44), trayMat, [0, 0.012, 0], g);
    for (const [w, d, x, z] of [[0.66, 0.03, 0, 0.205], [0.66, 0.03, 0, -0.205], [0.03, 0.44, 0.315, 0], [0.03, 0.44, -0.315, 0], [0.03, 0.44, 0, 0], [0.66, 0.02, 0, 0]]) {
      kit.mesh(new THREE.BoxGeometry(w, 0.09, d), trayMat, [x, 0.045, z], g);
    }
    const wm = new THREE.MeshStandardMaterial({ color: 0x4aa3e8, transparent: true, opacity: 0.6, roughness: 0.05 });
    const cubes = [];
    for (const x of [-0.155, 0.155]) for (const z of [-0.1, 0.1]) {
      const c = kit.mesh(new THREE.BoxGeometry(0.27, 0.07, 0.17), wm, [x, 0.025, z], g);
      c.geometry.translate(0, 0.035, 0); c.castShadow = false; cubes.push(c);
    }
    const water = C(0x4aa3e8), ice = C(0xeaf7ff);
    items.ice = { g, name: 'Ice', undo: true, ice: 0, anchor: anchorAt(g, 0.3),
      apply() {
        wm.color.lerpColors(water, ice, this.ice); wm.opacity = kit.lerp(0.6, 0.95, this.ice); wm.roughness = kit.lerp(0.05, 0.35, this.ice);
        for (const c of cubes) c.scale.y = 1 + 0.09 * this.ice; // ice takes up a little more room than water
      },
      state() { return this.ice > 0.9 ? 'Ice: solid' : this.ice < 0.1 ? 'Water: liquid' : this.dir > 0 ? 'Freezing' : 'Melting'; },
    };
  }
  { // Wax candle: melts into a clear puddle, sets pale again.
    const g = new THREE.Group();
    const cm = kit.mat(0xfff1d0, { roughness: 0.6 });
    const candle = kit.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 20), cm, [0, 0.15, 0], g);
    const wick = kit.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), kit.mat(0x222222), [0, 0.33, 0], g);
    const pm = new THREE.MeshStandardMaterial({ color: 0xfff1d0, transparent: true, opacity: 1, roughness: 0.6 });
    const puddle = kit.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 28), pm, [0, 0.015, 0], g);
    const solid = C(0xfff1d0), liquid = C(0xf2dc9b);
    items.wax = { g, name: 'Wax', undo: true, m: 0, f: 0, anchor: anchorAt(g, 0.5),
      apply() {
        const s = 1 - this.f;
        candle.visible = this.f < 0.97; candle.scale.set(1 + 0.3 * this.f, Math.max(0.02, s), 1 + 0.3 * this.f); candle.position.y = 0.15 * s + 0.02;
        wick.position.y = Math.max(0.04, 0.33 * s + 0.02); wick.rotation.z = this.f * 1.4;
        puddle.visible = this.f > 0.02; const r = 0.2 + 0.8 * this.f; puddle.scale.set(r, 1, r);
        pm.color.lerpColors(solid, liquid, this.m); pm.opacity = kit.lerp(1, 0.5, this.m); pm.roughness = kit.lerp(0.6, 0.08, this.m);
      },
      state() { return this.m > 0.9 ? 'Wax: liquid' : this.m > 0.1 ? 'Wax: melting' : this.f > 0.5 ? 'Wax: solid again' : 'Wax: solid'; },
    };
  }
  { // Egg: clear runny white and glossy yolk turn firm and white for good.
    const g = new THREE.Group();
    const wm = new THREE.MeshStandardMaterial({ color: 0xf3efd0, transparent: true, opacity: 0.35, roughness: 0.15 });
    const whiteM = kit.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 28), wm, [0, 0.015, 0], g);
    whiteM.scale.set(1.15, 1, 0.95); whiteM.castShadow = false;
    const ym = kit.mat(0xffa600, { roughness: 0.1 });
    const yolk = kit.mesh(new THREE.SphereGeometry(0.11, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), ym, [0.04, 0.02, 0], g);
    yolk.scale.y = 0.75;
    const raw = C(0xf3efd0), done = C(0xffffff), yRaw = C(0xffa600), yDone = C(0xffcf56);
    items.egg = { g, name: 'Egg', undo: false, c: 0, anchor: anchorAt(g, 0.35),
      apply() {
        wm.color.lerpColors(raw, done, this.c); wm.opacity = kit.lerp(0.35, 1, this.c); wm.roughness = kit.lerp(0.15, 0.8, this.c);
        whiteM.scale.y = 1 + this.c; ym.color.lerpColors(yRaw, yDone, this.c); ym.roughness = kit.lerp(0.1, 0.8, this.c);
      },
      state() { return this.c > 0.95 ? 'Cooked egg' : this.c > 0.05 ? 'Cooking' : 'Raw egg'; },
    };
  }
  { // Bread dough: grows and turns golden brown.
    const g = new THREE.Group();
    const dm = kit.mat(0xf3e3c3, { roughness: 0.85 });
    const loaf = kit.mesh(new THREE.SphereGeometry(0.2, 24, 12), dm, [0, 0.08, 0], g);
    const dough = C(0xf3e3c3), baked = C(0xc07a2c);
    items.bread = { g, name: 'Bread', undo: false, b: 0, anchor: anchorAt(g, 0.42),
      apply() {
        const e = kit.ease(this.b);
        loaf.scale.set(kit.lerp(1.15, 1.5, e), kit.lerp(0.45, 0.85, e), kit.lerp(0.95, 1.15, e));
        loaf.position.y = 0.2 * loaf.scale.y * 0.75;
        dm.color.lerpColors(dough, baked, e);
      },
      state() { return this.b > 0.95 ? 'Bread' : this.b > 0.05 ? 'Baking' : 'Dough'; },
    };
  }
  { // Paper: burns with flames and smoke and leaves black ash.
    const g = new THREE.Group();
    const pm = kit.mat(0xffffff, { map: tex.paper });
    const sheet = kit.mesh(new THREE.BoxGeometry(0.4, 0.008, 0.3), pm, [0, 0.006, 0], g);
    const flames = new THREE.Group();
    g.add(flames);
    const fm = [0xff6b00, 0xffb703, 0xff3d00].map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }));
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 10), fm[i]);
      f.geometry.translate(0, 0.15, 0);
      f.position.set(-0.1 + i * 0.1, 0.01, (i - 1) * 0.04);
      flames.add(f);
    }
    const smokeGeo = new THREE.SphereGeometry(0.07, 12, 8);
    const smoke = [];
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: 0x8d8d8d, transparent: true, opacity: 0, depthWrite: false }));
      g.add(s); smoke.push(s);
    }
    const paper = C(0xffffff), brown = C(0x8a5a2b), ash = C(0x2f2f2f), tmp = C(0);
    items.paper = { g, name: 'Ash', undo: false, p: 0, smokeT: 9, anchor: anchorAt(g, 0.75),
      apply(t) {
        const p = this.p;
        if (p < 0.4) tmp.lerpColors(paper, brown, p / 0.4); else tmp.lerpColors(brown, ash, Math.min(1, (p - 0.4) / 0.5));
        pm.color.copy(tmp);
        const s = 1 - 0.45 * p;
        sheet.scale.set(s, 1 + 3 * p, s); sheet.rotation.set(0.25 * p, 0.6 * p, -0.2 * p);
        const burning = p > 0.02 && p < 0.97;
        flames.visible = burning;
        if (burning) flames.children.forEach((f, i) => { const a = (0.6 + 0.4 * Math.sin(t * 13 + i * 2.1)) * Math.min(1, (1 - p) * 3); f.scale.set(0.8 + p * 0.4, a, 0.8 + p * 0.4); });
        const on = p > 0.02 && this.smokeT < 3;
        smoke.forEach((m, i) => {
          const k = (t * 0.45 + i / 5) % 1;
          m.visible = on;
          m.position.set(Math.sin(i * 2 + t) * 0.06, 0.2 + k * 0.9, 0);
          m.scale.setScalar(0.6 + k * 1.4);
          m.material.opacity = (1 - k) * 0.45 * Math.max(0, 1 - this.smokeT / 3);
        });
      },
      state() { return this.p > 0.95 ? 'Ash' : this.p > 0.02 ? 'Burning!' : 'Paper'; },
    };
  }

  for (const it of Object.values(items)) {
    it.tag = label('', it.anchor);
    it.tag.show(false);
    it.apply(0);
  }

  // Sorting mats.
  const mats = {};
  for (const [key, text, col] of [['undo', 'Can undo', '#2a9d8f'], ['keep', 'Cannot undo', '#e76f51']]) {
    const m = kit.mesh(new THREE.BoxGeometry(1.95, 0.02, 1.1), kit.mat(0xffffff, { map: matTex(THREE, text, col) }), [MATS_X[key], CT + 0.01, 0.05], scene);
    m.castShadow = false;
    const a = new THREE.Object3D();
    a.position.set(MATS_X[key], CT + 0.55, -0.55);
    scene.add(a);
    const tag = label(text, a, { cls: key === 'undo' ? 'cool big' : 'warm big' });
    mats[key] = { m, tag };
  }
  const ORDER = ['choc', 'ice', 'wax', 'egg', 'bread', 'paper'];
  const slot = key => {
    const it = items[key], list = ORDER.filter(k => items[k].undo === it.undo), j = list.indexOf(key);
    return [MATS_X[it.undo ? 'undo' : 'keep'] + (j - 1) * 0.62, j === 1 ? -0.15 : 0.22];
  };

  const st = { step: 0, quiz: false, t: 0, heat: 0, T: 0, cold: false, u: 0, slider: null, auto: null, active: [], msg: '', sortPlan: [] };

  function setActive(keys, vessel) {
    for (const [k, it] of Object.entries(items)) {
      const on = keys.includes(k);
      it.g.visible = on;
      it.tag.show(on);
      if (on) carrier.add(it.g);
    }
    pan.visible = vessel === 'pan';
    tray.visible = vessel === 'tray';
    st.active = keys.map(k => items[k]);
    keys.forEach((k, j) => { items[k].g.position.set(keys.length > 1 ? (j ? 0.3 : -0.25) : 0, vessel === 'pan' ? 0.03 : 0.03, 0); items[k].g.scale.setScalar(1); items[k].g.rotation.set(0, 0, 0); });
  }

  function controls(startHeat) {
    st.slider = ui.slider({ label: 'Heat', min: 0, max: 100, step: 1, value: startHeat,
      format: v => (v === 0 ? 'Off' : v < 35 ? 'Low' : v < 70 ? 'Medium' : 'High'),
      onInput: v => { st.auto = null; st.heat = v / 100; if (v > 0) st.cold = false; } });
    ui.buttons([{ label: 'Cool', onClick: () => cool(true) }]);
  }
  function cool(byHand) {
    if (byHand) st.auto = null;
    st.cold = true; st.heat = 0; st.slider?.set(0);
  }
  function heatTo(v) { st.heat = v / 100; st.cold = false; st.slider?.set(v); }

  // One line under the controls that says what is happening and whether it can be undone.
  function message() {
    const s = st.step, T = st.T;
    if (s === 0) { const c = items.choc; return c.m > 0.9 ? 'The chocolate is now a <b>liquid</b>.' : c.m > 0.1 ? 'The chocolate is <b>melting</b>.' : 'The chocolate is a hard <b>solid</b>.'; }
    if (s === 1) { const c = items.choc; return c.m < 0.1 ? 'Solid again! Melting chocolate <b>can be undone</b>.' : T < 0 ? 'Cooling down…' : 'The chocolate is runny. Press <b>Cool</b>.'; }
    if (s === 2) { const w = items.ice; return w.ice > 0.9 ? 'The water froze into <b>ice</b>. Now heat it.' : w.ice < 0.1 ? 'Liquid <b>water</b>. Press Cool to freeze it.' : (w.dir > 0 ? 'Freezing…' : 'Melting…'); }
    if (s === 3) { const w = items.wax; return w.m > 0.9 ? 'The wax is a clear <b>liquid</b>. Press Cool.' : w.m > 0.1 ? 'The wax is <b>melting</b>.' : w.f > 0.5 ? 'Hard again! Melting wax <b>can be undone</b>.' : 'The candle wax is a hard <b>solid</b>.'; }
    if (s === 4) { const e = items.egg; return e.c > 0.95 ? (T < 0 ? 'Cold, but still cooked. This <b>cannot be undone</b>.' : 'The egg is <b>cooked</b>. Now try to cool it back.') : e.c > 0.05 ? 'The egg is <b>cooking</b>.' : 'A raw egg. Turn up the heat.'; }
    if (s === 5) {
      const b = items.bread, p = items.paper;
      if (b.b > 0.95 && p.p > 0.95) return T < 0 ? 'Cold, but still bread and ash. These <b>cannot be undone</b>.' : 'Bread and ash. Now press <b>Cool</b>.';
      return p.p > 0.02 ? 'The paper is <b>burning</b>!' : b.b > 0.05 ? 'The dough is <b>baking</b>.' : 'Turn the heat up high.';
    }
    if (s === 6) return 'Press an item to sort it.';
    return '';
  }

  function sortItem(key, quick) {
    const it = items[key], [x, z] = slot(key);
    it.from = it.g.position.clone(); it.to = new THREE.Vector3(x, CT + 0.02, z); it.k = quick ? 1 : 0;
    if (quick) it.g.position.copy(it.to);
    if (!quick && st.step === 6) {
      const why = { choc: 'Chocolate <b>can undo</b>: warm it and it melts, cool it and it sets.', ice: 'Ice <b>can undo</b>: it melts into water and freezes again.', wax: 'Wax <b>can undo</b>: it melts and sets again.',
        egg: 'The egg <b>cannot undo</b>: it never turns raw again.', bread: 'Bread <b>cannot undo</b>: it never turns back into dough.', paper: 'Ash <b>cannot undo</b>: it never turns back into paper.' };
      st.msg = why[key]; ui.readout(why[key]);
    }
  }

  function sortScene(isQuiz) {
    appliances.visible = false; carrier.visible = false;
    mats.undo.m.visible = mats.keep.m.visible = true;
    mats.undo.tag.show(true); mats.keep.tag.show(true);
    Object.assign(items.choc, { m: 0, f: 1 }); items.ice.ice = 1; Object.assign(items.wax, { m: 0, f: 1 });
    items.egg.c = 1; items.bread.b = 1; items.paper.p = 1; items.paper.smokeT = 9;
    ORDER.forEach((k, j) => {
      const it = items[k];
      scene.add(it.g);
      it.g.visible = true; it.tag.show(false); it.g.scale.setScalar(0.85); it.g.rotation.set(0, 0, 0);
      it.g.position.set(-2.2 + j * 0.88, CT + 0.02, -0.55);
      it.k = 2;
      it.apply(st.t);
      if (isQuiz) sortItem(k, true);
    });
  }

  const kitchen = { radius: 1.6, yaw: 0, pitch: 0.4, target: [-0.05, CT + 0.42, -0.1] };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.t = 0; st.auto = null; st.msg = ''; st.slider = null; st.sortPlan = [];
      appliances.visible = true; carrier.visible = true;
      mats.undo.m.visible = mats.keep.m.visible = false;
      mats.undo.tag.show(false); mats.keep.tag.show(false);
      for (const it of Object.values(items)) it.k = 2;
      if (isQuiz || i === 6) {
        sortScene(isQuiz);
        view({ radius: 1.95, yaw: isQuiz ? -0.2 : 0, pitch: 0.62, target: [0, CT + 0.2, -0.1] });
        if (!isQuiz) {
          ui.buttons(ORDER.map(k => ({ label: { choc: 'Chocolate', ice: 'Ice', wax: 'Wax', egg: 'Cooked egg', bread: 'Bread', paper: 'Ash' }[k], onClick: () => { st.sortPlan = []; sortItem(k); } })));
          st.sortPlan = ORDER.map((k, j) => [0.6 + j * 0.45, k]);
        }
        return;
      }
      // Starting states for each step.
      st.heat = 0; st.cold = false; st.u = 0; st.T = 0;
      if (i === 0) { Object.assign(items.choc, { m: 0, f: 0 }); setActive(['choc'], 'pan'); controls(0); st.auto = [[0.3, () => heatTo(80)]]; }
      if (i === 1) { Object.assign(items.choc, { m: 1, f: 1 }); st.heat = 0.5; st.T = 0.5; setActive(['choc'], 'pan'); controls(50); st.auto = [[0.6, () => cool(false)]]; }
      if (i === 2) { items.ice.ice = 0; setActive(['ice'], 'none'); controls(0); st.auto = [[0.4, () => cool(false)]]; }
      if (i === 3) { Object.assign(items.wax, { m: 0, f: 0 }); setActive(['wax'], 'pan'); controls(0); st.auto = [[0.3, () => heatTo(90)]]; }
      if (i === 4) { items.egg.c = 0; setActive(['egg'], 'pan'); controls(0); st.auto = [[0.3, () => heatTo(80)]]; }
      if (i === 5) { items.bread.b = 0; items.paper.p = 0; items.paper.smokeT = 0; setActive(['bread', 'paper'], 'tray'); controls(0); st.auto = [[0.3, () => heatTo(100)]]; }
      view({ ...kitchen, yaw: [0.15, -0.15, 0.2, 0.1, -0.1, 0.15][i] });
    },

    update(dt, t) {
      st.t += dt;
      let busy = false;
      if (st.auto) {
        while (st.auto.length && st.t >= st.auto[0][0]) st.auto.shift()[1]();
        if (!st.auto.length) st.auto = null;
        busy = true;
      }

      if (st.step === 6 || st.quiz) {
        while (st.sortPlan.length && st.t >= st.sortPlan[0][0]) sortItem(st.sortPlan.shift()[1]);
        for (const k of ORDER) {
          const it = items[k];
          if (it.k >= 1) continue;
          it.k = Math.min(1, it.k + dt / 0.8);
          const e = kit.ease(it.k);
          it.g.position.lerpVectors(it.from, it.to, e);
          it.g.position.y += Math.sin(Math.PI * e) * 0.35;
          busy = true;
        }
        busy = busy || st.sortPlan.length > 0;
        return busy;
      }

      // Pan temperature: -1 freezer, 0 room, 1 hottest.
      busy = kit.follow(st, 'T', st.cold ? -1 : st.heat, dt, 1.6) || busy;
      busy = kit.follow(st, 'u', st.cold ? 1 : 0, dt, 2.2) || busy;
      const T = st.T, u = st.u;
      carrier.position.set(kit.lerp(STOVE, FREEZE, u), BASE + Math.sin(Math.PI * u) * 0.8, -0.1);
      ringMat.emissiveIntensity = st.cold ? 0 : st.heat * 1.6;
      column.scale.y = 0.06 + 0.84 * (T + 1) / 2;

      const c = items.choc, w = items.ice, x = items.wax, e = items.egg, b = items.bread, p = items.paper;
      const melt = (it, thr) => {
        const m0 = it.m;
        if (T > thr) it.m = Math.min(1, it.m + dt * (T - thr) * 3);
        else if (T < 0.15) it.m = Math.max(0, it.m - dt * (0.2 - T) * 1.2);
        it.f = Math.max(it.f, it.m);
        return it.m !== m0;
      };
      let changed = false;
      if (c.g.visible) changed = melt(c, 0.3) || changed;
      if (x.g.visible) changed = melt(x, 0.5) || changed;
      if (w.g.visible) {
        const i0 = w.ice;
        if (T < -0.4) w.ice = Math.min(1, w.ice + dt * 0.9);
        else if (T > 0.1) w.ice = Math.max(0, w.ice - dt * T * 1.2);
        if (w.ice !== i0) { w.dir = Math.sign(w.ice - i0); changed = true; }
      }
      if (e.g.visible && T > 0.45 && e.c < 1) { e.c = Math.min(1, e.c + dt * (T - 0.4) * 1.6); changed = true; }
      if (b.g.visible && T > 0.55 && b.b < 1) { b.b = Math.min(1, b.b + dt * (T - 0.5) * 1.4); changed = true; }
      if (p.g.visible) {
        if (p.p === 0 && T > 0.8) p.p = 0.03;
        if (p.p > 0 && p.p < 1) { p.p = Math.min(1, p.p + dt * 0.6); changed = true; }
        if (p.p >= 1) p.smokeT += dt;
        if (p.p > 0 && p.smokeT < 3) busy = true;
      }
      for (const it of st.active) { it.apply(t); const s = it.state(); if (s !== it.shown) { it.shown = s; it.tag.text = s; } }
      if (changed) busy = true;

      const msg = message();
      if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
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

function matTex(THREE, text, col) {
  return paint(THREE, 256, 144, (g, w, h) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(8, 8, w - 16, h - 16);
  });
}

function textures(THREE) {
  const tiles = paint(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = '#fdfdfd'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#cfe3ee'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
  }, [8, 2]);
  const choc = paint(THREE, 128, 80, (g, w, h) => {
    g.fillStyle = '#5a3018'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6f3d20';
    for (let x = 0; x < 4; x++) for (let y = 0; y < 2; y++) g.fillRect(4 + x * 31, 4 + y * 38, 26, 33);
  });
  const paper = paint(THREE, 64, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#9cc6f2'; g.lineWidth = 2;
    for (let y = 10; y < h; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
  return { tiles, choc, paper };
}
