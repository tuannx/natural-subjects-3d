// Simple circuit: battery, wires, switch and bulb on a table. Moving dots show the current when
// the loop is complete; the bulb glows brighter with two batteries.
const HX = 2.2, HZ = 1.2, R = 0.3;  // wire loop half-size and corner radius (top view)
const WY = 0.07;                    // wire height above the table

export default function setup({ THREE, scene, kit, ui, label, view }) {
  scene.background = new THREE.Color(0xe6f1fb);
  kit.lights(scene, { sun: [3, 9, 5] });
  kit.mesh(new THREE.BoxGeometry(6.4, 0.2, 5), kit.mat(0xd9b48a, { map: grainTexture(THREE) }), [0, -0.1, 0.35], scene).castShadow = false;

  // The loop as a polyline with rounded corners, walked by arc length s.
  const pts = [];
  [[HX - R, HZ - R, Math.PI / 2], [HX - R, -HZ + R, 0], [-HX + R, -HZ + R, -Math.PI / 2], [-HX + R, HZ - R, -Math.PI]].forEach(([cx, cz, a0]) => {
    for (let j = 0; j <= 8; j++) { const a = a0 - (j / 8) * (Math.PI / 2); pts.push([cx + R * Math.cos(a), cz + R * Math.sin(a)]); }
  });
  pts.push(pts[0]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1];
  function P(s, out = new THREE.Vector3()) {
    s = ((s % L) + L) % L;
    let i = 1;
    while (cum[i] < s) i++;
    const u = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
    return out.set(kit.lerp(pts[i - 1][0], pts[i][0], u), WY, kit.lerp(pts[i - 1][1], pts[i][1], u));
  }
  // Arc length of the loop point nearest to (x, z).
  function sAt(x, z) {
    let best = Infinity, bs = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], dx = pts[i][0] - ax, dz = pts[i][1] - az, len2 = dx * dx + dz * dz;
      const u = kit.clamp(((x - ax) * dx + (z - az) * dz) / len2, 0, 1);
      const d = Math.hypot(ax + dx * u - x, az + dz * u - z);
      if (d < best) { best = d; bs = cum[i - 1] + u * (cum[i] - cum[i - 1]); }
    }
    return bs;
  }
  const span = (x0, z0, x1, z1) => [sAt(x0, z0), sAt(x1, z1)];

  // Where each part sits on the loop (current flows toward larger s: out of the battery's + end).
  const parts = {
    bulb: span(HX, 0.3, HX, -0.3),
    loose: span(HX - R - 0.05, -HZ, 1.3, -HZ),
    bat1: span(1.3, -HZ, 0.3, -HZ),
    slot2: span(0, -HZ, -1, -HZ),
    sw: span(-HX, -0.4, -HX, 0.4),
    gap: span(-0.8, HZ, 0, HZ),
  };
  const solid = ['bulb', 'loose', 'bat1', 'slot2', 'sw', 'gap'];

  // Wires: tubes along the loop between the parts, plus filler pieces for the battery slot and gap.
  const insul = kit.mat(0xd62828, { roughness: 0.5 }), insulB = kit.mat(0x1d3557, { roughness: 0.5 });
  class Path extends THREE.Curve {
    constructor(a, b) { super(); this.a = a; this.b = b; }
    getPoint(u, out = new THREE.Vector3()) { return P(this.a + (this.b - this.a) * u, out); }
  }
  const tube = (a, b, mat, parent = scene) => {
    const m = kit.mesh(new THREE.TubeGeometry(new Path(a, b), Math.max(4, Math.ceil((b - a) * 6)), 0.045, 6), mat, [0, 0, 0], parent);
    m.castShadow = false;
    return m;
  };
  const order = [...solid].sort((a, b) => parts[a][0] - parts[b][0]);
  order.forEach((k, i) => {
    const p = parts[k], next = parts[order[(i + 1) % order.length]], end = i === order.length - 1 ? next[0] + L : next[0];
    // Red wire from the battery's + end round to the bulb, dark wire from the bulb back to the - end.
    if (end - p[1] > 0.01) tube(p[1], end, k === 'bulb' || k === 'loose' ? insulB : insul);
  });
  const slotWire = tube(...parts.slot2, insul);
  const gapWire = tube(...parts.gap, insul);
  // The loose wire end hinges at its far end so it can lift off the battery.
  const pivotAt = P(parts.loose[0]);
  const loose = new THREE.Group();
  loose.position.copy(pivotAt);
  scene.add(loose);
  const looseTube = tube(...parts.loose, insulB, loose);
  looseTube.position.copy(pivotAt).multiplyScalar(-1);
  const looseEnd = new THREE.Object3D();
  looseEnd.position.set(-(pivotAt.x - 1.3), 0.05, 0);
  loose.add(looseEnd);
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), kit.mat(0xd08c3c, { metalness: 0.5, roughness: 0.35 }), [0, -0.05, 0], looseEnd).rotation.z = Math.PI / 2;

  // Batteries: + end has the bump. Built along +x, then turned so + faces the flow.
  const makeBattery = (x) => {
    const g = new THREE.Group();
    kit.mesh(new THREE.BoxGeometry(1.0, 0.06, 0.46), kit.mat(0x343a40), [0, 0.03, 0], g);
    const body = kit.mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.66, 24), kit.mat(0x264653, { roughness: 0.4 }), [-0.08, 0.25, 0], g);
    const cap = kit.mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.16, 24), kit.mat(0xe9c46a, { metalness: 0.4, roughness: 0.35 }), [0.33, 0.25, 0], g);
    const nub = kit.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), kit.mat(0xadb5bd, { metalness: 0.5, roughness: 0.35 }), [0.44, 0.25, 0], g);
    for (const m of [body, cap, nub]) m.rotation.z = Math.PI / 2;
    const plate = kit.mat(0xadb5bd, { metalness: 0.5, roughness: 0.35 });
    kit.mesh(new THREE.BoxGeometry(0.03, 0.3, 0.2), plate, [0.485, 0.15, 0], g);
    kit.mesh(new THREE.BoxGeometry(0.03, 0.3, 0.2), plate, [-0.485, 0.15, 0], g);
    g.position.set(x, 0, -HZ);
    g.rotation.y = Math.PI;
    scene.add(g);
    return g;
  };
  const bat1 = makeBattery(0.8), bat2 = makeBattery(-0.5);
  bat2.visible = false;

  // Bulb in a holder: glass, filament, inner glow, halo sprite and a point light.
  const bulb = new THREE.Group();
  bulb.position.set(HX, 0, 0);
  scene.add(bulb);
  kit.mesh(new THREE.BoxGeometry(0.5, 0.12, 0.62), kit.mat(0x343a40), [0, 0.06, 0], bulb);
  kit.mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.22, 16), kit.mat(0xadb5bd, { metalness: 0.5, roughness: 0.35 }), [0, 0.23, 0], bulb);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, emissive: 0xffd166, emissiveIntensity: 0, depthWrite: false });
  const glass = kit.mesh(new THREE.SphereGeometry(0.26, 24, 16), glassMat, [0, 0.58, 0], bulb);
  glass.castShadow = false;
  const filMat = new THREE.MeshBasicMaterial({ color: 0x5c4033 });
  kit.mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), filMat, [0, 0.56, 0], bulb).castShadow = false;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(THREE), color: 0xffd166, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.set(0, 0.58, 0);
  bulb.add(halo);
  const lamp = new THREE.PointLight(0xffc857, 0, 5, 1.5);
  lamp.position.set(0, 0.6, 0);
  bulb.add(lamp);

  // Knife switch on the left side: the arm swings up to open a gap.
  const sw = new THREE.Group();
  sw.position.set(-HX, 0, 0);
  scene.add(sw);
  const metal = kit.mat(0xc0c7cf, { metalness: 0.5, roughness: 0.35 });
  kit.mesh(new THREE.BoxGeometry(0.46, 0.06, 0.96), kit.mat(0xf1e3c8), [0, 0.03, 0], sw);
  kit.mesh(new THREE.BoxGeometry(0.12, 0.2, 0.1), metal, [0, 0.13, -0.32], sw);
  kit.mesh(new THREE.BoxGeometry(0.12, 0.2, 0.1), metal, [0, 0.13, 0.32], sw);
  const arm = new THREE.Group();
  arm.position.set(0, 0.2, -0.32);
  sw.add(arm);
  kit.mesh(new THREE.BoxGeometry(0.05, 0.04, 0.74), metal, [0, 0, 0.36], arm);
  kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 12), kit.mat(0xe63946), [0, 0.1, 0.68], arm);

  // Test gap: two clips; materials are laid across them.
  const GX = (-0.8 + 0) / 2;
  const clipMats = [kit.mat(0xe63946), kit.mat(0x212529)];
  const clips = [-1, 1].map((side, j) => {
    const c = new THREE.Group();
    c.position.set(GX + side * 0.4, 0, HZ);
    kit.mesh(new THREE.BoxGeometry(0.2, 0.1, 0.16), clipMats[j], [0, 0.07, 0], c);
    kit.mesh(new THREE.BoxGeometry(0.14, 0.04, 0.12), metal, [-side * 0.12, 0.1, 0], c);
    scene.add(c);
    return c;
  });

  // Things to test. hh is half their thickness, so they lie on the clips or the table.
  const T = (geo, mat, pos, rot) => { const m = kit.mesh(geo, mat, pos); if (rot) m.rotation.set(...rot); return m; };
  const grp = (...ms) => { const g = new THREE.Group(); ms.forEach(m => g.add(m)); scene.add(g); return g; };
  const steel = kit.mat(0xd5dbe1, { metalness: 0.5, roughness: 0.3 });
  const items = [
    { id: 'spoon', name: 'Metal spoon', conducts: true, hh: 0.04, g: grp(T(new THREE.BoxGeometry(0.6, 0.03, 0.07), steel, [-0.15, 0, 0]), T(new THREE.SphereGeometry(0.14, 16, 8), steel, [0.28, 0, 0])) },
    { id: 'ruler', name: 'Plastic ruler', conducts: false, hh: 0.02, g: grp(T(new THREE.BoxGeometry(0.9, 0.03, 0.18), kit.mat(0xffffff, { map: rulerTexture(THREE), roughness: 0.4 }))) },
    { id: 'coin', name: 'Coin', conducts: true, hh: 0.03, g: grp(T(new THREE.CylinderGeometry(0.31, 0.31, 0.05, 28), kit.mat(0xd9b44a, { metalness: 0.5, roughness: 0.35 }))) },
    { id: 'eraser', name: 'Rubber eraser', conducts: false, hh: 0.07, g: grp(T(new THREE.BoxGeometry(0.64, 0.14, 0.26), kit.mat(0xf4a6b8))) },
    { id: 'clip', name: 'Paper clip', conducts: true, hh: 0.015, g: grp(T(new THREE.TorusGeometry(0.1, 0.012, 6, 28), steel, [0, 0, 0], [Math.PI / 2, 0, 0]), T(new THREE.TorusGeometry(0.07, 0.012, 6, 28), steel, [0.04, 0, 0], [Math.PI / 2, 0, 0])) },
    { id: 'stick', name: 'Wooden stick', conducts: false, hh: 0.02, g: grp(T(new THREE.BoxGeometry(0.85, 0.04, 0.12), kit.mat(0xe2b47c))) },
    { id: 'paper', name: 'Paper', conducts: false, hh: 0.01, g: grp(T(new THREE.BoxGeometry(0.8, 0.01, 0.4), kit.mat(0xfdfdfd, { roughness: 0.9 }))) },
  ];
  // Stretch the paper clip loops into the long clip shape.
  items[4].g.children.forEach(m => m.scale.set(4, 1, 1));
  items[0].g.children[1].scale.set(1.2, 0.3, 0.9);  // flatten the spoon's bowl
  for (const it of items) { it.pos = new THREE.Vector3(); it.from = new THREE.Vector3(); it.to = new THREE.Vector3(); it.k = 1; it.rot = 0; it.rot0 = 0; it.rot1 = 0; }
  const trayPos = (j, out) => out.set(-2.4 + j * 0.8, 0, HZ + 0.7);
  const groupPos = (it, out) => {
    const cond = items.filter(x => x.conducts), ins = items.filter(x => !x.conducts);
    return it.conducts ? out.set(-2.3 + cond.indexOf(it) * 0.6, 0, HZ + 0.75) : out.set(0.3 + ins.indexOf(it) * 0.6, 0, HZ + 0.75);
  };
  function moveItem(it, pos, rot, instant) {
    it.from.copy(it.g.position); it.rot0 = it.g.rotation.y;
    it.to.copy(pos); it.to.y = (pos.y || 0) + it.hh; it.rot1 = rot;
    it.k = instant ? 1 : 0;
    if (instant) { it.g.position.copy(it.to); it.g.rotation.y = rot; }
  }

  // Current dots: one instanced mesh that slides along the loop.
  const N = 48;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe14d }), N);
  dots.castShadow = false;
  scene.add(dots);
  const mtx = new THREE.Matrix4(), pv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), q = new THREE.Quaternion();

  // Labels.
  const L_ = (t, at, cls) => { const l = label(t, at, { cls }); l.show(false); return l; };
  const tags = {
    battery: L_('Battery', new THREE.Vector3(0.8, 0.55, -HZ), 'warm'),
    battery2: L_('Second battery', new THREE.Vector3(-0.5, 0.55, -HZ), 'warm'),
    bulb: L_('Bulb', new THREE.Vector3(HX, 1.0, 0), 'warm'),
    sw: L_('Switch', new THREE.Vector3(-HX, 0.45, 0.45), ''),
    wire: L_('Wire', P(sAt(1, HZ)), ''),
    loose: L_('Loose wire', looseEnd, 'cool'),
    gap: L_('Test gap', new THREE.Vector3(GX, 0.5, HZ), 'cool'),
    cond: L_('Conductors', new THREE.Vector3(-1.7, 0.45, HZ + 0.75), 'warm'),
    ins: L_('Insulators', new THREE.Vector3(1.2, 0.45, HZ + 0.75), 'cool'),
  };

  const st = { step: 0, time: 0, quiz: false, plan: [], auto: false, plugged: true, lift: 0, on: true, arm: 0, gapMode: false, item: null, two: false, bat2: 0, flow: 0, glow: 0, offset: 0, sorted: false, cycle: -1, msg: '' };
  const say = html => { if (html !== st.msg) { st.msg = html; ui.readout(html); } };

  function setGap(on) {
    st.gapMode = on; gapWire.visible = !on;
    clips.forEach(c => { c.visible = on; });
  }
  function putInGap(it) {
    if (st.item && st.item !== it) moveItem(st.item, trayPos(items.indexOf(st.item), pv), Math.PI / 2);
    st.item = it;
    moveItem(it, pv.set(GX, 0.14, HZ), 0);
  }
  function sortItems(on) {
    st.sorted = on;
    items.forEach((it, j) => moveItem(it, on ? groupPos(it, pv) : trayPos(j, pv), Math.PI / 2));
    tags.cond.show(false); tags.ins.show(false);
  }
  function setTwo(on) { st.two = on; if (on) { bat2.visible = true; st.bat2 = Math.min(st.bat2, 0); } slotWire.visible = !on; }

  return {
    step(i, { isQuiz }) {
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, plan: [], auto: false, plugged: true, on: true, item: null, cycle: -1, msg: '' });
      for (const t of Object.values(tags)) t.show(false);
      setGap(i === 3); setTwo(false); st.bat2 = 0; bat2.visible = false;
      items.forEach((it, j) => { it.g.visible = i === 3 || i === 4; moveItem(it, trayPos(j, pv), Math.PI / 2, true); });
      if (i === 0 || isQuiz) {
        view({ radius: 2.5, yaw: 0.3, pitch: 0.85, target: [0, 0.2, 0.1] });
        if (!isQuiz) {
          ['battery', 'bulb', 'sw', 'wire'].forEach(k => tags[k].show(true));
          ui.toggle({ label: 'Show the names', value: true, onChange: v => ['battery', 'bulb', 'sw', 'wire'].forEach(k => tags[k].show(v)) });
        }
      }
      if (i === 1) {
        st.plugged = false; st.lift = 1;
        view({ radius: 1.4, yaw: 0.15, pitch: 0.75, target: [1.45, 0.25, -0.6] });
        tags.loose.show(true); tags.bulb.show(true); tags.battery.show(true);
        st.plan = [[2.2, () => { st.plugged = true; }]];
        ui.buttons([{ label: 'Plug the wire in', onClick: () => { st.plan = []; st.plugged = true; } }, { label: 'Unplug it', onClick: () => { st.plan = []; st.plugged = false; } }]);
      }
      if (i === 2) {
        st.on = false; st.arm = 1; st.auto = true;
        view({ radius: 1.5, yaw: -1.25, pitch: 0.42, target: [-1.2, 0.45, 0] });
        tags.sw.show(true); tags.bulb.show(true);
        ui.buttons([{ label: 'Switch on', onClick: () => { st.auto = false; st.on = true; } }, { label: 'Switch off', onClick: () => { st.auto = false; st.on = false; } }]);
      }
      if (i === 3) {
        st.auto = true;
        view({ radius: 2.2, yaw: 0.15, pitch: 0.75, target: [0, 0.2, 1.1] });
        tags.gap.show(true);
        ui.buttons(items.map(it => ({ label: it.name, onClick: () => { st.auto = false; putInGap(it); } })));
        say('Put something across the test gap.');
      }
      if (i === 4) {
        view({ radius: 2.1, yaw: 0, pitch: 0.55, target: [0, 0.1, 1.6] });
        st.plan = [[1.2, () => sortItems(true)]];
        ui.buttons([{ label: 'Sort them', onClick: () => { st.plan = []; sortItems(true); } }, { label: 'Mix them up', onClick: () => { st.plan = []; sortItems(false); } }]);
        say('Which ones are made of metal?');
      }
      if (i === 5) {
        view({ radius: 2.4, yaw: 0.3, pitch: 0.65, target: [0.3, 0.2, -0.4] });
        tags.battery.show(true); tags.battery2.show(true); tags.bulb.show(true);
        st.plan = [[1.5, () => { setTwo(true); toggle.checked = true; }]];
        const toggle = ui.toggle({ label: 'Second battery', value: false, onChange: v => { st.plan = []; setTwo(v); } });
      }
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      if (st.step === 2 && st.auto) st.on = Math.floor((st.time + 0.8) / 2.6) % 2 === 1;
      if (st.step === 3 && st.auto) {
        const n = Math.floor((st.time - 0.6) / 2.6);
        if (n >= 0 && n !== st.cycle) { st.cycle = n; putInGap(items[[0, 3, 2, 1, 4, 6, 5][n % 7]]); }
      }

      // Moving parts: loose wire, switch arm, second battery dropping in, test items.
      kit.follow(st, 'lift', st.plugged ? 0 : 1, dt, 5);
      loose.rotation.z = -0.9 * st.lift;
      kit.follow(st, 'arm', st.on ? 0 : 1, dt, 6);
      arm.rotation.x = -0.9 * st.arm;
      if (st.two) { st.bat2 = Math.min(1, st.bat2 + dt * 1.6); bat2.position.y = 0.9 * (1 - kit.ease(st.bat2)); }
      else bat2.visible = false;
      for (const it of items) {
        if (it.k >= 1) continue;
        it.k = Math.min(1, it.k + dt / 0.7);
        const e = kit.ease(it.k);
        it.g.position.lerpVectors(it.from, it.to, e);
        it.g.position.y += Math.sin(Math.PI * e) * 0.5;
        it.g.rotation.y = kit.lerp(it.rot0, it.rot1, e);
      }
      if (st.step === 4 && st.sorted && items.every(it => it.k >= 1)) { tags.cond.show(true); tags.ins.show(true); }

      // Is the loop complete? Count the batteries pushing.
      const gapOK = !st.gapMode || (st.item && st.item.conducts && st.item.k >= 1);
      const closed = st.lift < 0.02 && st.arm < 0.02 && gapOK;
      const cells = st.two && st.bat2 >= 1 ? 2 : 1;
      kit.follow(st, 'flow', closed ? cells : 0, dt, 4);
      kit.follow(st, 'glow', closed ? (cells === 2 ? 1.9 : 1) : 0, dt, 8);

      // Bulb brightness.
      const b = st.glow;
      glassMat.emissiveIntensity = 1.4 * b;
      filMat.color.setRGB(0.36 + 0.64 * Math.min(1, b), 0.25 + 0.6 * Math.min(1, b), 0.2 + 0.2 * b);
      halo.material.opacity = Math.min(1, 0.7 * b);
      halo.scale.setScalar(0.9 + 0.7 * b);
      lamp.intensity = 2.2 * b;

      // Dots: slide along the loop; hidden inside the parts.
      st.offset = (st.offset + st.flow * 0.6 * dt) % L;
      const show = kit.clamp(st.flow * 3, 0, 1);
      for (let d = 0; d < N; d++) {
        const s = (st.offset + (d * L) / N) % L;
        const inside = solid.some(k => {
          if (k === 'loose') return false;
          const [a, c] = parts[k];
          if (k === 'slot2' && !st.two) return false;
          if (k === 'gap' && !st.gapMode) return false;
          return s > a - 0.02 && s < c + 0.02;
        });
        P(s, pv); pv.y = WY + 0.03;
        mtx.compose(pv, q, one.setScalar(inside ? 0 : show));
        dots.setMatrixAt(d, mtx);
      }
      dots.instanceMatrix.needsUpdate = true;

      if (!st.quiz) {
        if (st.step === 1) say(st.lift > 0.02 ? 'There is a <b>gap</b>: the bulb is off.' : 'The loop is <b>complete</b>: the bulb is on.');
        if (st.step === 2) say(st.on ? 'Switch <b>on</b>: the loop is complete.' : 'Switch <b>off</b>: there is a gap.');
        if (st.step === 3 && st.item && st.item.k < 1) say(`Testing: <b>${st.item.name}</b>...`);
        if (st.step === 3 && st.item && st.item.k >= 1) say(`<b>${st.item.name}</b>: ${st.item.conducts ? 'the bulb lights. It is a <b>conductor</b>.' : 'no light. It is an <b>insulator</b>.'}`);
        if (st.step === 5) say(cells === 2 ? '<b>Two</b> batteries: brighter bulb, faster flow.' : '<b>One</b> battery.');
      }
      return true;
    },
  };
}

// Textures painted in code.
function canvasTex(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function grainTexture(THREE) {
  return canvasTex(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,100,50,0.12)'; g.lineWidth = 3;
    for (let i = 0; i < 30; i++) { const y = rand(i) * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 8, (2 * w) / 3, y - 8, w, y + rand(i + 9) * 6); g.stroke(); }
  });
}
function rulerTexture(THREE) {
  return canvasTex(THREE, 256, 64, (g, w, h) => {
    g.fillStyle = '#5ec27a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b4332';
    for (let i = 0; i <= 25; i++) g.fillRect(4 + i * 9.6, 0, 2, i % 5 ? 14 : 26);
  });
}
function glowTexture(THREE) {
  return canvasTex(THREE, 128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,230,150,0.6)'); r.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}
