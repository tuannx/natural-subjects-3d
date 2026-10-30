// Making sound: a drum with rice on top and a ruler on a table edge. Hitting or flicking makes
// them vibrate; rings spread out through the air to a child's ear. Bigger shakes = louder rings,
// faster shakes = rings closer together (higher sound).
const TOP = 1.0;                 // table top height
const EDGE = 2.6;                // right edge of the table (the ruler hangs over it)
const DRUM_X = -1.2, DRUM_R = 0.6, SKIN_R = 0.57, SKIN = TOP + 0.5;
const DRUM_F = 4;                // drum skin wobble (slowed down so eyes can follow), per second
const RULER_LEN = 2.4;
const RING_V = 1.4, RING_MAX = 3.2;  // sound ring speed and how far they go
const CM = 15;                   // ruler: scene units to centimetres
const rulerF = L => 1.6 / (L * L);   // a shorter overhang shakes faster (shown slowed down)

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xe3cfae, sky: 0xf4ecdf, radius: 16 });
  kit.lights(scene, { sun: [3, 9, 6] });

  // Table.
  const wood = kit.mat(0xb7814f, { roughness: 0.8 });
  kit.mesh(new THREE.BoxGeometry(EDGE * 2, 0.12, 2.4), wood, [0, TOP - 0.06, 0], scene);
  for (const [x, z] of [[-2.4, -1], [2.4, -1], [-2.4, 1], [2.4, 1]]) kit.mesh(new THREE.BoxGeometry(0.12, TOP - 0.12, 0.12), wood, [x, (TOP - 0.12) / 2, z], scene);

  // Drum: red body, gold rims and a skin that wobbles (vertices moved each frame, no new buffers).
  const drum = new THREE.Group();
  drum.position.set(DRUM_X, TOP, 0);
  scene.add(drum);
  kit.mesh(new THREE.CylinderGeometry(DRUM_R, DRUM_R * 0.95, 0.5, 32, 1, true), kit.mat(0xd62828, { roughness: 0.5, side: THREE.DoubleSide }), [0, 0.25, 0], drum);
  const gold = kit.mat(0xf2b134, { metalness: 0.6, roughness: 0.35 });
  for (const y of [0.03, 0.49]) { const r = kit.mesh(new THREE.TorusGeometry(DRUM_R + 0.01, 0.035, 8, 32), gold, [0, y, 0], drum); r.rotation.x = Math.PI / 2; }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 4), gold, [Math.cos(a) * (DRUM_R + 0.012), 0.26, Math.sin(a) * (DRUM_R + 0.012)], drum);
    s.rotation.z = i % 2 ? 0.25 : -0.25;
  }
  const skinGeo = new THREE.RingGeometry(0.001, SKIN_R, 32, 6);
  const skinPos = skinGeo.attributes.position;
  const skinR = new Float32Array(skinPos.count);
  for (let i = 0; i < skinPos.count; i++) skinR[i] = Math.hypot(skinPos.getX(i), skinPos.getY(i)) / SKIN_R;
  const skin = kit.mesh(skinGeo, kit.mat(0xf5ead0, { roughness: 0.9, side: THREE.DoubleSide }), [0, 0.505, 0], drum);
  skin.rotation.x = -Math.PI / 2;

  // Rice grains on the skin (one instanced mesh).
  const N_RICE = 50;
  const rice = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.017, 0.035, 2, 6), kit.mat(0xffffff, { roughness: 0.6 }), N_RICE);
  rice.castShadow = true;
  scene.add(rice);
  const grains = [];
  for (let i = 0; i < N_RICE; i++) {
    const r = 0.06 + Math.sqrt(rand(i)) * 0.42, a = rand(i + 50) * Math.PI * 2;
    grains.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, r: r / SKIN_R, h: 0, v: 0, rot: rand(i + 90) * Math.PI });
  }
  const dummy = new THREE.Object3D();

  // Drumstick: turns about its handle end to hit the skin.
  const stick = new THREE.Group();
  stick.position.set(DRUM_X + 1.09, SKIN + 0.2, 0.18);
  scene.add(stick);
  const stickMat = kit.mat(0xe9c46a, { roughness: 0.6 });
  const shaft = kit.mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.9, 8), stickMat, [-0.45, 0, 0], stick);
  shaft.rotation.z = Math.PI / 2;
  kit.mesh(new THREE.SphereGeometry(0.05, 12, 8), stickMat, [-0.9, 0, 0], stick);
  const STICK_REST = -0.45, STICK_HIT = 0.17;

  // A hand that comes down to touch the drum (step 2).
  const hand = new THREE.Group();
  scene.add(hand);
  const skinTone = kit.mat(0xf1c27d, { roughness: 0.8 });
  const palm = kit.mesh(new THREE.SphereGeometry(0.22, 16, 12), skinTone, [0, 0, 0], hand);
  palm.scale.set(1.2, 0.35, 1);
  for (let f = 0; f < 4; f++) {
    const fg = kit.mesh(new THREE.CapsuleGeometry(0.04, 0.18, 2, 8), skinTone, [-0.3, 0, -0.13 + f * 0.087], hand);
    fg.rotation.z = Math.PI / 2;
  }
  const thumb = kit.mesh(new THREE.CapsuleGeometry(0.045, 0.12, 2, 8), skinTone, [-0.08, 0, 0.24], hand);
  thumb.rotation.x = Math.PI / 2; thumb.rotation.z = 0.5;
  const arm = kit.mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 12), kit.mat(0x4361ee), [0.38, 0.45, 0], hand);
  arm.rotation.z = -0.75;
  const HAND_UP = SKIN + 2.2, HAND_DOWN = SKIN + 0.08;
  hand.position.set(DRUM_X + 0.05, HAND_UP, 0);

  // Ruler held on the table edge by two books. The part over the edge turns about the edge.
  const rulerTex = paintRuler(THREE);
  const texA = rulerTex.clone(), texB = rulerTex.clone();
  texA.needsUpdate = texB.needsUpdate = true;
  const rulerGeo = new THREE.BoxGeometry(1, 0.025, 0.32);
  const rulerFixed = kit.mesh(rulerGeo, kit.mat(0xffffff, { map: texA, roughness: 0.5 }), [0, TOP + 0.0125, 0], scene);
  const pivot = new THREE.Group();
  pivot.position.set(EDGE, TOP + 0.0125, 0);
  scene.add(pivot);
  const rulerFree = kit.mesh(rulerGeo, kit.mat(0xffffff, { map: texB, roughness: 0.5 }), [0, 0, 0], pivot);
  const tipAnchor = new THREE.Object3D();
  pivot.add(tipAnchor);
  kit.mesh(new THREE.BoxGeometry(0.62, 0.13, 0.5), kit.mat(0x2a9d8f), [EDGE - 0.4, TOP + 0.09, 0], scene);
  const book2 = kit.mesh(new THREE.BoxGeometry(0.55, 0.11, 0.44), kit.mat(0xe76f51), [EDGE - 0.42, TOP + 0.21, 0.01], scene);
  book2.rotation.y = 0.12;

  // The listener: a child with an ear facing the drum.
  const kid = new THREE.Group();
  kid.position.set(-4.3, 0, 0.1);
  scene.add(kid);
  const shirt = kit.mat(0x8338ec);
  kit.mesh(new THREE.CylinderGeometry(0.26, 0.36, 1.05, 16), shirt, [0, 0.9, 0], kid);
  for (const x of [-0.12, 0.12]) kit.mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), kit.mat(0x264653), [x, 0.2, 0], kid);
  kit.mesh(new THREE.SphereGeometry(0.32, 24, 16), skinTone, [0, 1.72, 0], kid);
  const hair = kit.mesh(new THREE.SphereGeometry(0.335, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), kit.mat(0x3d2b1f), [0, 1.73, -0.02], kid);
  hair.rotation.x = -0.25;
  const dark = kit.mat(0x222222);
  for (const x of [-0.11, 0.11]) kit.mesh(new THREE.SphereGeometry(0.035, 8, 6), dark, [x, 1.77, 0.29], kid);
  const smile = kit.mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12, Math.PI), kit.mat(0xc0392b), [0, 1.64, 0.29], kid);
  smile.rotation.z = Math.PI;
  const ear = new THREE.Group();
  ear.position.set(0.31, 1.72, 0);
  kid.add(ear);
  const earRing = kit.mesh(new THREE.TorusGeometry(0.075, 0.03, 8, 16), skinTone, [0, 0, 0], ear);
  earRing.rotation.y = Math.PI / 2; earRing.scale.set(1, 1.3, 1);
  kit.mesh(new THREE.SphereGeometry(0.05, 10, 8), kit.mat(0xd9a066), [0, 0, 0], ear);
  const EAR_X = kid.position.x + 0.31;

  // Air between the drum and the ear: dots that only wiggle back and forth.
  const AIR_ROWS = [SKIN - 0.12, SKIN + 0.12, SKIN + 0.36], AIR_N = 14;
  const air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1d6fd8 }), AIR_ROWS.length * AIR_N);
  scene.add(air);
  const airPts = [];
  AIR_ROWS.forEach(y => { for (let j = 0; j < AIR_N; j++) airPts.push({ x: EAR_X + 0.2 + (j + 0.5 * (y > SKIN ? 1 : 0)) * 0.13, y }); });

  // Sound rings: a pool of thin circles that grow outward and fade.
  const ringGeo = new THREE.TorusGeometry(1, 0.018, 4, 48);
  const rings = [];
  for (let i = 0; i < 32; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff8c42, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.r = 0; m.s = 0;
    scene.add(m); rings.push(m);
  }
  let ringNext = 0;
  const emit = (x, y, z, s, color) => {
    const m = rings[ringNext++ % rings.length];
    m.position.set(x, y, z); m.r = 0.05; m.s = s; m.visible = true; m.material.color.setHex(color);
  };

  // Labels (made once, shown per step).
  const tags = {
    drum: label('Drum', new THREE.Vector3(DRUM_X - 0.35, TOP + 0.12, DRUM_R)),
    rice: label('Rice', new THREE.Vector3(DRUM_X - 0.5, SKIN + 0.05, -0.3)),
    hand: label('Hand', new THREE.Vector3(DRUM_X + 0.6, SKIN + 0.9, 0)),
    ruler: label('Ruler', new THREE.Vector3(EDGE - 1.15, TOP + 0.05, 0.16)),
    tip: label('', tipAnchor, { cls: 'cool' }),
    air: label('Air', new THREE.Vector3(EAR_X + 0.95, SKIN + 0.48, 0)),
    ear: label('Ear', new THREE.Vector3(EAR_X + 0.02, 1.86, 0.1), { cls: 'warm' }),
  };

  const st = {
    step: 0, time: 0, quiz: false, auto: true, plan: null, loop: 1, soon: null, soonAt: 0,
    drumA: 0, drumPh: 0, drumClock: 99, drumS: 0, strength: 0.7, pending: 0, stickT: 9,
    touch: false, L: 0.9, rulerA: 0, rulerPh: 0, sound: false, shaking: null,
  };

  function setRuler(L) {
    st.L = L;
    const fixed = RULER_LEN - L;
    rulerFixed.scale.x = fixed; rulerFixed.position.x = EDGE - fixed / 2;
    texA.repeat.x = fixed / RULER_LEN; texA.offset.x = 0;
    rulerFree.scale.x = L; rulerFree.position.x = L / 2;
    texB.repeat.x = L / RULER_LEN; texB.offset.x = fixed / RULER_LEN;
    tipAnchor.position.set(L, 0.05, 0);
    tags.tip.text = L < 0.75 ? 'Short end' : L < 1.1 ? 'Middle' : 'Long end';
  }
  setRuler(0.9);

  // Optional real sound (Web Audio), only after the learner turns it on; never throws.
  let actx = null;
  function tone(kind, s, f) {
    if (!st.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === 'suspended' && actx.resume) actx.resume().catch(() => {});
      const t0 = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      if (kind === 'drum') {
        o.type = 'sine';
        o.frequency.setValueAtTime(130, t0); o.frequency.exponentialRampToValueAtTime(65, t0 + 0.4);
        g.gain.setValueAtTime(0.05 + 0.6 * s, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
      } else {
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0.35, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);
      }
      o.connect(g); g.connect(actx.destination);
      o.start(t0); o.stop(t0 + 1.3);
    } catch (e) { st.sound = false; }
  }
  const soundToggle = () => ui.toggle({ label: 'Play real sound', value: st.sound, onChange: v => { st.sound = v; } });

  function hit(s = st.strength) {
    st.touch = false; st.pending = s; st.stickT = 0;
    tone('drum', s);
  }
  function flick(L) {
    if (L != null) { setRuler(L); if (st.slider) st.slider.set(L); }
    st.rulerA = 0.28; st.rulerPh = 0;
    tone('ruler', 1, kit.clamp(220 * (0.9 / st.L) ** 2, 80, 900));
  }
  const manual = fn => () => { st.auto = false; fn(); };

  function showDrumState() {
    const shaking = st.drumA > 0.06;
    if (shaking === st.shaking) return;
    st.shaking = shaking;
    ui.readout(shaking ? 'The drum is <b>shaking</b>, so it makes a <b>sound</b>.' : 'The drum is <b>still</b>, so there is <b>no sound</b>.');
  }
  const strengthText = v => ['a gentle tap', 'a soft hit', 'a medium hit', 'a strong hit', 'a very hard hit'][v - 1];
  function showStrength(v) {
    ui.readout(v <= 2 ? `With ${strengthText(v)}, the drum shakes <b>a little</b>: a <b>soft</b> sound.` : v === 3 ? `With ${strengthText(v)}, the drum shakes <b>some</b>: a <b>medium</b> sound.` : `With ${strengthText(v)}, the drum shakes <b>a lot</b>: a <b>loud</b> sound.`);
  }
  function showRuler() {
    const L = st.L;
    ui.readout(L < 0.75 ? 'Short end: it shakes <b>fast</b>, so the sound is <b>high</b>.' : L < 1.1 ? 'Middle: it shakes at a <b>medium</b> speed, so the sound is in the <b>middle</b>.' : 'Long end: it shakes <b>slowly</b>, so the sound is <b>low</b>.');
  }

  const views = {
    drum: { radius: 1.25, yaw: 0.35, pitch: 0.42, target: [DRUM_X, SKIN, 0] },
    hand: { radius: 1.45, yaw: 0.2, pitch: 0.3, target: [DRUM_X + 0.1, SKIN + 0.35, 0] },
    ruler: { radius: 1.55, yaw: -0.25, pitch: 0.25, target: [EDGE + 0.1, TOP + 0.1, 0] },
    travel: { radius: 2.0, yaw: 0, pitch: 0.18, target: [-2.7, SKIN, 0] },
    wide: { radius: 4.1, yaw: 0.1, pitch: 0.28, target: [-0.6, 1.3, 0] },
  };

  const plan = (loop, items) => { st.loop = loop; st.plan = items.map(([t, fn]) => ({ t, fn, lap: -1 })); };
  const soon = fn => { st.soon = fn; st.soonAt = st.time + 0.3; };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, touch: false, slider: null, shaking: null, plan: null, soon: null });
      for (const t of Object.values(tags)) t.show(false);
      air.visible = i === 4;
      hand.visible = i === 1 && !isQuiz;
      if (i === 0) {
        go(views.drum);
        tags.drum.show(true); tags.rice.show(true);
        plan(2.6, [[2.2, () => hit(0.8)]]);
        ui.buttons([{ label: 'Hit the drum', onClick: () => hit(0.8) }]);
      }
      if (i === 1) {
        go(views.hand);
        tags.hand.show(true); tags.drum.show(true);
        plan(5, [[0.3, () => hit(0.7)], [2.0, () => { st.touch = true; }], [3.6, () => { st.touch = false; }]]);
        ui.buttons([{ label: 'Hit the drum', onClick: manual(() => hit(0.7)) }, { label: 'Touch the drum', onClick: manual(() => { st.touch = true; }) }]);
        showDrumState();
      }
      if (i === 2) {
        go(views.drum); st.strength = 0.79;
        tags.rice.show(true);
        plan(2.4, [[0.3, () => hit()]]);
        ui.slider({ label: 'How hard you hit', min: 1, max: 5, step: 1, value: 4, format: strengthText, onInput: v => { st.strength = 0.15 + (v - 1) * 0.2125; showStrength(v); soon(() => hit()); } });
        ui.buttons([{ label: 'Hit the drum', onClick: () => hit() }]);
        soundToggle();
        showStrength(4);
      }
      if (i === 3) {
        go(views.ruler); setRuler(0.55);
        tags.ruler.show(true); tags.tip.show(true);
        plan(3.2, [[1.8, () => flick()]]);
        st.slider = ui.slider({ label: 'Ruler over the edge', min: 0.45, max: 1.4, step: 0.05, value: 0.55, format: v => `${Math.round(v * CM)}`, unit: ' cm', onInput: v => { setRuler(v); st.rulerA = 0; showRuler(); soon(() => flick()); } });
        ui.buttons([{ label: 'Flick the ruler', onClick: () => flick() }]);
        soundToggle();
        showRuler();
      }
      if (i === 4) {
        go(views.travel);
        tags.air.show(true); tags.ear.show(true); tags.drum.show(true);
        plan(3.4, [[1.0, () => hit(0.85)]]);
        ui.buttons([{ label: 'Hit the drum', onClick: () => hit(0.85) }]);
        ui.readout('The shake is passed from air to air, all the way to the ear.');
      }
      if (i === 5) {
        go(views.wide);
        tags.drum.show(true); tags.ruler.show(true); tags.ear.show(true);
        plan(7, [[0.3, () => hit(0.95)], [1.6, () => flick(0.5)], [4.0, () => hit(0.25)], [5.2, () => flick(1.3)]]);
        const play = (fn, msg) => manual(() => { fn(); ui.readout(msg); });
        ui.buttons([
          { label: 'Soft drum', onClick: play(() => hit(0.25), 'A <b>soft</b> hit: small shakes, weak waves, a <b>quiet</b> sound.') },
          { label: 'Loud drum', onClick: play(() => hit(0.95), 'A <b>hard</b> hit: big shakes, strong waves, a <b>loud</b> sound.') },
          { label: 'Short ruler', onClick: play(() => flick(0.5), 'A <b>short</b> ruler shakes <b>fast</b>: waves close together, a <b>high</b> sound.') },
          { label: 'Long ruler', onClick: play(() => flick(1.3), 'A <b>long</b> ruler shakes <b>slowly</b>: waves far apart, a <b>low</b> sound.') },
        ]);
        soundToggle();
        ui.readout('Tap a button to play a sound.');
      }
      if (isQuiz) {
        go({ ...views.wide, yaw: -0.2, pitch: 0.32 });
        tags.drum.show(true); tags.ruler.show(true);
        plan(3.5, [[0.5, () => hit(0.6)]]);
      }
    },

    update(dt) {
      st.time += dt;
      const s = st.step;

      // Scripted demos repeat in a loop so each step plays by itself until the learner takes over.
      if (st.plan && st.auto) {
        const lap = Math.floor(st.time / st.loop), tt = st.time - lap * st.loop;
        for (const p of st.plan) if (tt >= p.t && p.lap !== lap) { p.lap = lap; p.fn(); }
      }
      if (st.soon && st.time >= st.soonAt) { const fn = st.soon; st.soon = null; fn(); }

      // Drumstick swing; the skin starts to shake when the stick touches it.
      st.stickT += dt;
      const k = st.stickT;
      stick.rotation.z = k < 0.08 ? kit.lerp(STICK_REST, STICK_HIT, k / 0.08) : k < 0.45 ? kit.lerp(STICK_HIT, STICK_REST, kit.ease((k - 0.08) / 0.37)) : STICK_REST;
      if (st.pending && k >= 0.08) {
        st.drumA = Math.max(st.drumA, st.pending); st.drumS = st.drumA; st.drumClock = 0;
        for (let i = 0; i < N_RICE; i++) { const g = grains[i]; g.v = Math.max(g.v, st.pending * (2.4 + rand(i + 7 + Math.floor(st.time)) * 1.1) * (1 - 0.5 * g.r)); }
        st.pending = 0;
      }

      // Drum skin: shakes and slowly calms down (very quickly when a hand touches it).
      kit.follow(hand.position, 'y', st.touch ? HAND_DOWN : HAND_UP, dt, st.touch ? 10 : 4);
      st.drumA *= Math.exp(-dt / (st.touch && hand.position.y < HAND_DOWN + 0.1 ? 0.05 : 0.8));
      if (st.drumA < 0.002) st.drumA = 0;
      st.drumClock += dt;
      const prevPh = st.drumPh;
      st.drumPh += dt * DRUM_F * Math.PI * 2;
      if (Math.floor(st.drumPh / (Math.PI * 2)) !== Math.floor(prevPh / (Math.PI * 2)) && st.drumA > 0.08) emit(DRUM_X, SKIN + 0.12, 0, st.drumA, 0xff8c42);
      const disp = st.drumA * 0.12 * Math.sin(st.drumPh);
      for (let i = 0; i < skinPos.count; i++) skinPos.setZ(i, disp * (1 - skinR[i] * skinR[i]));
      skinPos.needsUpdate = true;
      skinGeo.computeVertexNormals();

      // Rice: jumps up, falls back, and bounces again while the skin still shakes.
      const surf = r => SKIN + 0.005 + disp * (1 - r * r) + 0.017;
      for (let i = 0; i < N_RICE; i++) {
        const g = grains[i];
        if (g.h > 0 || g.v > 0) {
          g.v -= 9 * dt; g.h += g.v * dt;
          if (g.h <= 0) { g.h = 0; g.v = st.drumA > 0.12 ? st.drumA * (1.3 + rand(i + Math.floor(st.time * 7)) * 0.8) * (1 - 0.5 * g.r) : 0; }
        }
        dummy.position.set(DRUM_X + g.x, surf(g.r) + g.h, g.z);
        dummy.rotation.set(Math.PI / 2, g.rot + g.h * 6, g.h * 9);
        dummy.updateMatrix();
        rice.setMatrixAt(i, dummy.matrix);
      }
      rice.instanceMatrix.needsUpdate = true;
      if (s === 1 && !st.quiz) showDrumState();

      // Ruler: a quick swing that dies away; a shorter end swings faster.
      const f = rulerF(st.L), prevR = st.rulerPh;
      st.rulerPh += dt * f * Math.PI * 2;
      st.rulerA *= Math.exp(-dt / 1.3);
      if (st.rulerA < 0.002) st.rulerA = 0;
      pivot.rotation.z = -st.rulerA * Math.cos(st.rulerPh);
      if (Math.floor(prevR / (Math.PI * 2)) !== Math.floor(st.rulerPh / (Math.PI * 2)) && st.rulerA > 0.03) emit(EDGE + st.L * 0.5, TOP + 0.02, 0, Math.min(1, st.rulerA * 4), 0x3a86ff);

      // Air dots: each one wiggles a little when the wave passes it.
      if (air.visible) {
        let atEar = 0;
        for (let j = 0; j < airPts.length; j++) {
          const p = airPts[j], d = DRUM_X - p.x, tau = st.drumClock - d / RING_V;
          const env = tau > 0 ? st.drumS * Math.exp(-tau / 0.8) : 0;
          dummy.position.set(p.x - 0.07 * env * Math.sin(tau * DRUM_F * Math.PI * 2), p.y, 0.3);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          air.setMatrixAt(j, dummy.matrix);
        }
        air.instanceMatrix.needsUpdate = true;
        const tauE = st.drumClock - (DRUM_X - EAR_X) / RING_V;
        atEar = tauE > 0 ? st.drumS * Math.exp(-tauE / 0.8) : 0;
        ear.scale.setScalar(1 + 0.15 * atEar * Math.sin(tauE * DRUM_F * Math.PI * 2));
        const heard = atEar > 0.12;
        if (heard !== st.heard) { st.heard = heard; tags.ear.text = heard ? 'I hear it!' : 'Ear'; }
      } else if (st.heard) { st.heard = false; tags.ear.text = 'Ear'; ear.scale.setScalar(1); }

      for (const m of rings) {
        if (!m.visible) continue;
        m.r += RING_V * dt;
        if (m.r > RING_MAX) { m.visible = false; continue; }
        m.scale.setScalar(m.r);
        m.material.opacity = Math.min(1, m.s * 1.2) * (1 - m.r / RING_MAX) * 0.95;
      }
      return true;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Yellow ruler with centimetre marks (drawn once).
function paintRuler(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 512, 64);
  g.fillStyle = '#3d3d3d';
  const n = Math.round(RULER_LEN * CM);
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 510 + 1, long = i % 5 === 0;
    g.fillRect(x, 0, 2, long ? 22 : 12);
    if (i % 10 === 0 && i > 0 && i < n) { g.font = 'bold 15px sans-serif'; g.fillText(String(i), x - 8, 42); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
