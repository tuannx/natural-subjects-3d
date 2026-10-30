// Phases and eclipses: Earth at the centre, the Sun far away (its light comes from one direction), the Moon on
// a tilted orbit. Shadow cones: umbra (the whole Sun hidden) and penumbra (part of the Sun hidden). Sizes of Earth,
// Moon and shadows are in proportion; distances are squeezed so it fits. The shadow cones use the Sun's real
// angular size scaled the same way, so the umbra's tip reaches Earth exactly when the real Moon is close enough
// for a total eclipse (Moon nearer than about 379,700 km from Earth's centre).
import { SPACE, starfield, makeSun, orbitRing, frustum, planetTexture } from '../_shared/sky.js';

const RE = 1, RM = 0.3, D_MEAN = 6;          // Earth radius, Moon radius, mean Moon distance (model units)
const KM_E = 6371, KM_M = 1737.4, KM_MEAN = 384400;
const K = (D_MEAN - RE) / (KM_MEAN - KM_E);   // model units per km along the Earth–Moon line
const dOf = km => RE + (km - KM_E) * K;       // Moon distance in the model for a real distance in km
const UMBRA_KM = 373400;                      // length of the Moon's umbra (Moon radius / tan of the Sun's angular radius)
const TAN_A = RM / (UMBRA_KM * K);            // the model's "Sun angular radius" that gives that umbra length
const SUN_D = 30, SUN_R = SUN_D * TAN_A;
const SUN_ANG = 0.2666;                       // the Sun's real angular radius in degrees (about 0.53° wide)
const TILT = (25 * Math.PI) / 180;            // the Moon's orbit tilt drawn here (really about 5°)
const SYNODIC = 29.53, SIDEREAL = 27.32, YEAR = 365.25;
const D2R = Math.PI / 180;
const PHASES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];

// Direction in Earth's orbit plane (XZ) for an angle measured counter-clockwise seen from above.
const dirSet = (v, a) => v.set(Math.cos(a), 0, -Math.sin(a));

export default function setup({ THREE, scene, kit, ui, label, view }) {
  scene.background = new THREE.Color(SPACE);
  scene.add(new THREE.AmbientLight(0x6070a0, 0.32));
  starfield(THREE, scene, { count: 700, radius: 140, size: 0.6, seed: 21 });
  const sunLight = new THREE.DirectionalLight(0xffffff, 3);
  scene.add(sunLight);

  const sun = makeSun(THREE, SUN_R);
  scene.add(sun);
  const sunTag = label('Sun', sun, { cls: 'big warm' });

  const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 32, 24), new THREE.MeshStandardMaterial({ map: planetTexture(THREE, 'earth'), roughness: 0.95 }));
  scene.add(earth);
  const earthAt = new THREE.Object3D(); earthAt.position.y = 1.15; scene.add(earthAt);
  const earthTag = label('Earth', earthAt, { cls: 'cool' });

  const moonMat = new THREE.MeshStandardMaterial({ map: planetTexture(THREE, 'moon'), roughness: 1, emissive: 0x000000 });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(RM, 32, 16), moonMat);
  scene.add(moon);
  const moonAt = new THREE.Object3D(); scene.add(moonAt);
  const moonTag = label('Moon', moonAt);

  // The Moon's orbit (tilted) and Earth's orbit plane (a faint disc), plus the line where they cross.
  const moonOrbit = orbitRing(THREE, { color: 0xb8c4e0, opacity: 0.45 });
  scene.add(moonOrbit);
  const plane = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshBasicMaterial({ color: 0x7aa2ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
  const nodeLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-7, 0, 0), new THREE.Vector3(7, 0, 0)]),
    new THREE.LineDashedMaterial({ color: 0xffd166, dashSize: 0.3, gapSize: 0.2 }));
  nodeLine.computeLineDistances();
  scene.add(nodeLine);
  const planeAt = new THREE.Object3D(); scene.add(planeAt);
  const planeTag = label("Earth's orbit plane", planeAt, { cls: 'cool' });
  const orbitAt = new THREE.Object3D(); scene.add(orbitAt);
  const orbitTag = label("Moon's orbit", orbitAt);

  // Shadow cones (open frustums along +X, turned to point away from the Sun).
  const mUmbra = frustum(THREE, { color: 0x000000, opacity: 0.6 });
  const mPen = frustum(THREE, { color: 0x1a2340, opacity: 0.32 });
  const mAnt = frustum(THREE, { color: 0x3a2a55, opacity: 0.4 });
  const eUmbra = frustum(THREE, { color: 0x000000, opacity: 0.5 });
  const ePen = frustum(THREE, { color: 0x1a2340, opacity: 0.28 });
  for (const m of [mUmbra, mPen, mAnt, eUmbra, ePen]) { m.renderOrder = 3; scene.add(m); }
  const umbraAt = new THREE.Object3D(), penAt = new THREE.Object3D(), antAt = new THREE.Object3D();
  scene.add(umbraAt, penAt, antAt);
  const umbraTag = label('Umbra', umbraAt), penTag = label('Penumbra', penAt, { cls: 'cool' }), antTag = label('Antumbra', antAt, { cls: 'cool' });
  const eUmbraAt = new THREE.Object3D(), ePenAt = new THREE.Object3D();
  scene.add(eUmbraAt, ePenAt);
  const eUmbraTag = label('Umbra', eUmbraAt), ePenTag = label('Penumbra', ePenAt, { cls: 'cool' });

  // Sunlight arrows coming in from the Sun's side.
  const rays = new THREE.Group();
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.85 });
  for (const z of [-2.6, 0, 2.6]) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 8), rayMat);
    shaft.rotation.z = Math.PI / 2; shaft.position.set(-0.95, 0, z);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 12), rayMat);
    head.rotation.z = -Math.PI / 2; head.position.set(0.19, 0, z);
    rays.add(shaft, head);
  }
  scene.add(rays);
  const raysAt = new THREE.Object3D(); rays.add(raysAt); raysAt.position.set(-1, 0.25, 2.6);
  const raysTag = label('Sunlight', raysAt, { cls: 'warm' });

  // Caps on Earth: the spot under the Moon's shadow, and the night half (step "Who can see it?").
  const penSpot = cap(THREE, 0x0b1020, 0.55), umbSpot = cap(THREE, 0x000000, 0.9), nightCap = cap(THREE, 0x7fb8ff, 0.5);
  for (const c of [penSpot, umbSpot, nightCap]) scene.add(c.mesh);
  const seeAt = new THREE.Object3D(); scene.add(seeAt);
  const seeTag = label('Can see it', seeAt, { cls: 'warm' });

  // "You": a person on Earth's sunlit side, for the total / annular / partial step.
  const you = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff4d6d }));
  scene.add(you);
  const youTag = label('You', you, { cls: 'warm' });

  const st = {
    step: 0, quiz: false, sigma: Math.PI, node: Math.PI, u: 0, D: D_MEAN, tilt: TILT, tiltTo: TILT,
    point: 0, pointTo: 0, elong: 0, uOff: 0, km: 360000, obsKm: 0, day: 0, dayTo: 0, mode: 'solar', dirty: true, lastSyz: null,
  };
  const sunDir = new THREE.Vector3(), nDir = new THREE.Vector3(), pDir = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), away = new THREE.Vector3(), q = new THREE.Quaternion();

  // Moon position for argument u (angle from the ascending node) on the tilted orbit.
  function moonPos(u, out) {
    dirSet(nDir, st.node); dirSet(pDir, st.node + Math.PI / 2);
    return out.copy(nDir).multiplyScalar(Math.cos(u))
      .addScaledVector(pDir, Math.sin(u) * Math.cos(st.tilt)).addScaledVector(Y, Math.sin(u) * Math.sin(st.tilt)).multiplyScalar(st.D);
  }

  function layout() {
    dirSet(sunDir, st.sigma);
    away.copy(sunDir).negate();
    sun.position.copy(sunDir).multiplyScalar(SUN_D);
    sun.scale.setScalar(1 - 0.92 * st.point);
    sunLight.position.copy(sunDir).multiplyScalar(20);
    rays.quaternion.setFromUnitVectors(X, away);
    rays.position.copy(sunDir).multiplyScalar(7.6);
    moonPos(st.u, moon.position);
    moon.lookAt(0, 0, 0);
    moonAt.position.copy(moon.position); moonAt.position.y += RM + 0.12;
    dirSet(nDir, st.node);
    moonOrbit.scale.setScalar(st.D);
    moonOrbit.quaternion.setFromAxisAngle(nDir, st.tilt);
    nodeLine.quaternion.setFromUnitVectors(X, nDir);
    dirSet(pDir, st.node + Math.PI / 2);
    planeAt.position.copy(nDir).multiplyScalar(-6.6);
    orbitAt.position.copy(pDir).multiplyScalar(-st.D * Math.cos(st.tilt)).addScaledVector(Y, -st.D * Math.sin(st.tilt) + 0.1);

    // Shadows. tanA shrinks to 0 when the Sun is a point: then the umbra is a straight tube and there is no penumbra.
    const tanA = TAN_A * (1 - st.point);
    const along = moon.position.dot(sunDir);                    // Moon's distance toward the Sun
    const reach = Math.max(0.5, along + 0.2);                    // length from the Moon to just past Earth's centre plane
    const lu = tanA > 1e-6 ? RM / tanA : 1e9;
    q.setFromUnitVectors(X, away);
    for (const m of [mUmbra, mPen, mAnt]) { m.position.copy(moon.position); m.quaternion.copy(q); }
    mUmbra.set(RM, lu < reach ? 0 : RM - reach * tanA, Math.min(lu, reach));
    mPen.set(RM, RM + reach * tanA, reach);
    mPen.visible = st.mShadow && st.point < 0.98;
    const antOn = lu < reach - 0.02 && lu < along - RE + 0.02 && st.point < 0.5;
    mAnt.position.addScaledVector(away, Math.min(lu, reach));
    mAnt.set(0, Math.max(0, reach - lu) * tanA, Math.max(0.01, reach - lu));
    mAnt.userData.on = antOn;
    umbraAt.position.copy(moon.position).addScaledVector(away, Math.min(lu, reach) * 0.55).addScaledVector(Y, RM * 0.5 + 0.08);
    penAt.position.copy(moon.position).addScaledVector(away, reach * 0.5).addScaledVector(Y, -(RM + reach * 0.5 * tanA) - 0.05);
    antAt.position.copy(moon.position).addScaledVector(away, lu - 0.1).addScaledVector(Y, -0.42);
    const el = 9;
    eUmbra.quaternion.copy(q); ePen.quaternion.copy(q);
    eUmbra.set(RE, RE - el * tanA, el);
    ePen.set(RE, RE + el * tanA, el);
    ePen.visible = st.eShadow && st.point < 0.98;
    eUmbraAt.position.copy(away).multiplyScalar(4.2).addScaledVector(Y, 0.12);
    ePenAt.position.copy(away).multiplyScalar(3.4).addScaledVector(Y, -(RE + 3.4 * tanA) - 0.05);

    // Where the Moon's shadow axis meets Earth (for the dark spot).
    const b = moon.position.dot(away), c = moon.position.lengthSq() - RE * RE, disc = b * b - c;
    if (disc > 0 && -b > 0) {
      const t = -b - Math.sqrt(disc);
      tmp.copy(moon.position).addScaledVector(away, t).normalize();
      const rp = RM + t * tanA, ru = Math.max(0, RM - t * tanA);
      penSpot.set(Math.asin(Math.min(1, rp / RE)), tmp);
      umbSpot.set(Math.asin(Math.min(1, Math.max(ru, 0.012) / RE)), tmp);
      st.spotHit = true; st.spotUmbra = ru > 0;
    } else st.spotHit = false;
    penSpot.mesh.visible = st.showSpot && st.spotHit;
    umbSpot.mesh.visible = st.showSpot && st.spotHit && st.spotUmbra;

    // Moon colour in Earth's shadow: dimmer in the penumbra, coppery red in the umbra.
    const back = -moon.position.dot(sunDir);
    let fu = 0, fp = 0;
    if (back > 0) {
      const s = tmp2.copy(moon.position).addScaledVector(sunDir, back).length();
      const ru = RE - back * tanA, rp = RE + back * tanA;
      fu = kit.clamp((ru + RM - s) / (2 * RM), 0, 1);
      fp = kit.clamp((rp + RM - s) / (2 * RM), 0, 1);
    }
    st.fu = fu; st.fp = fp;
    const dim = 1 - 0.35 * fp;
    moonMat.color.setRGB(kit.lerp(dim, 0.75, fu), kit.lerp(dim, 0.3, fu), kit.lerp(dim, 0.18, fu));
    moonMat.emissive.setRGB(0.32 * fu, 0.08 * fu, 0.03 * fu);
    st.dirty = false;
    antiumbra();
    penTag.show(st.penTags && st.point < 0.5);
  }

  // What someone at the middle of Earth's sunlit side sees (model geometry): Sun and Moon discs.
  function skyFromEarth() {
    const P = tmp.copy(sunDir).multiplyScalar(RE);
    const toM = tmp2.copy(moon.position).sub(P);
    const dist = toM.length();
    toM.normalize();
    const aS = Math.atan(TAN_A), aM = Math.atan(RM / dist);
    const sep = Math.acos(kit.clamp(toM.dot(sunDir), -1, 1));
    const up = toM.y - sunDir.y * toM.dot(sunDir);
    const side = Math.sign(toM.x * sunDir.z - toM.z * sunDir.x) * Math.sqrt(Math.max(0, sep * sep - up * up));
    return { mR: aM / aS, dx: side / aS, dy: up / aS, ...classify(aS, aM, sep) };
  }

  function readout() {
    if (st.quiz) return;
    if (st.step === 0) {
      const E = ((st.elong % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const i = Math.round(E / (Math.PI / 4)) % 8, lit = Math.round(((1 - Math.cos(E)) / 2) * 100);
      ui.readout(row(phaseSVG(E), `Day ${((E / (2 * Math.PI)) * SYNODIC).toFixed(1)}: <b>${PHASES[i]}</b><br>We see about <b>${lit}%</b> of the Moon's face lit.`));
    } else if (st.step === 1) {
      ui.readout(st.pointTo > 0.5 ? 'A tiny point of light makes one sharp shadow: <b>no penumbra</b>.'
        : 'Inside the <b>umbra</b> all of the Sun is hidden. Inside the <b>penumbra</b> only part of it is.');
    } else if (st.step === 2) {
      const s = skyFromEarth();
      ui.readout(row(solarSVG(s), `Seen from the middle of Earth's day side:<br><b>${s.name}</b>${s.cover > 0 && s.cover < 0.999 ? `, about ${Math.round(s.cover * 100)}% of the Sun covered` : ''}.`));
    } else if (st.step === 3) {
      const t = st.fu > 0.98 ? 'Total lunar eclipse: the Moon is all inside the umbra and looks <b>red</b>.'
        : st.fu > 0 ? 'Partial lunar eclipse: part of the Moon is in the <b>umbra</b>.'
          : st.fp > 0 ? 'The Moon is only in the <b>penumbra</b>: it looks just a little dimmer.' : 'Full moon, outside Earth\'s shadow: <b>no eclipse</b>.';
      ui.readout(row(lunarSVG(st.fu, st.fp), t));
    } else if (st.step === 4) {
      ui.readout(st.lastSyz || `Day ${Math.round(st.day)}. Press a button to jump to the next new moon or full moon.`);
    } else if (st.step === 5) {
      const aS = SUN_ANG * D2R, dist = st.km - KM_E, aM = Math.atan(KM_M / dist), sep = st.obsKm / dist;
      const s = { mR: aM / aS, dx: sep / aS, dy: 0, ...classify(aS, aM, sep) };
      ui.readout(row(solarSVG(s), `Moon ${(2 * aM / D2R).toFixed(3)}° wide, Sun ${(2 * SUN_ANG).toFixed(3)}° wide.<br><b>${s.name}</b>${s.cover > 0 && s.cover < 0.999 ? `: about ${Math.round(s.cover * 100)}% of the Sun covered` : ''}.`));
    } else if (st.step === 6) {
      ui.readout(st.mode === 'solar' ? 'Solar eclipse: only places inside the Moon\'s small shadow see it. <b>Never look at the Sun without eclipse glasses.</b>'
        : 'Lunar eclipse: everyone on Earth\'s <b>night side</b> can see it, and it is safe to watch with your eyes.');
    }
  }

  // Step 4: time runs through a year. The Sun's direction turns once a year; the Moon goes around every 27.3 days.
  const SIG0 = Math.PI, NODE4 = Math.PI - (60 * Math.PI) / 180, LAM0 = Math.PI + 1.2;
  function setDay(d) {
    st.day = d;
    st.sigma = SIG0 + (2 * Math.PI * d) / YEAR;
    const lam = LAM0 + (2 * Math.PI * d) / SIDEREAL;
    st.u = lam - st.node;
  }
  function nextSyzygy(full) {
    const elong = (LAM0 + (2 * Math.PI * st.day) / SIDEREAL) - (SIG0 + (2 * Math.PI * st.day) / YEAR);
    const target = full ? Math.PI : 0;
    let need = (((target - elong) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (need < 0.05) need += 2 * Math.PI;
    st.dayTo = st.day + (need / (2 * Math.PI)) * SYNODIC;
    st.pendingFull = full;
    st.lastSyz = null;
  }
  function judgeSyzygy() {
    layout();
    const full = st.pendingFull, d = Math.round(st.day);
    const s = tmp.copy(moon.position).addScaledVector(sunDir, -moon.position.dot(sunDir)).length(); // Moon's distance from the Sun–Earth line
    const above = moon.position.y > 0 ? 'above' : 'below';
    if (!full) {
      const hit = s < RE + RM + st.D * TAN_A;
      st.lastSyz = `Day ${d}: <b>new moon</b>. ` + (hit ? 'The Moon\'s shadow falls on Earth: <b>solar eclipse!</b>' : `The Moon passes ${above} the Sun–Earth line. Its shadow misses Earth: <b>no eclipse</b>.`);
    } else {
      const ru = RE - st.D * TAN_A, rp = RE + st.D * TAN_A;
      st.lastSyz = `Day ${d}: <b>full moon</b>. ` + (s < ru + RM ? 'The Moon goes into Earth\'s umbra: <b>lunar eclipse!</b>'
        : s < rp + RM ? 'The Moon only grazes Earth\'s penumbra: a faint eclipse that is hard to notice.'
          : `The Moon passes ${above} Earth's shadow: <b>no eclipse</b>.`);
    }
    readout();
  }

  function show(parts) {
    const on = k => parts.includes(k);
    moonOrbit.visible = on('orbit'); plane.visible = on('plane'); nodeLine.visible = on('plane'); planeTag.show(false); orbitTag.show(on('plane'));
    mUmbra.visible = mPen.visible = st.mShadow = on('mshadow'); eUmbra.visible = ePen.visible = st.eShadow = on('eshadow');
    eUmbraTag.show(on('etags')); ePenTag.show(on('etags'));
    umbraTag.show(on('tags')); st.penTags = on('tags'); antTag.show(false); st.antTags = on('ant');
    rays.visible = on('rays'); raysTag.show(on('rays'));
    sunTag.show(on('sunTag')); earthTag.show(on('earthTag')); moonTag.show(on('moonTag'));
    st.showSpot = on('spot');
    nightCap.mesh.visible = false; seeTag.show(false);
    you.visible = on('you'); youTag.show(on('you'));
  }
  // "You" on Earth's sunlit side, at the chosen distance from the centre of the Moon's shadow.
  function placeYou() {
    dirSet(sunDir, st.sigma);
    const y = Math.min(0.95, st.obsKm / 5790);
    you.position.copy(sunDir).multiplyScalar(Math.sqrt(1 - y * y) * (RE + 0.02)).addScaledVector(Y, y * (RE + 0.02));
  }
  function antiumbra() {
    const vis = st.antTags && mAnt.userData.on;
    mAnt.visible = vis; antTag.show(vis);
    if (st.antTags) umbraTag.show(true);
  }

  function whoCanSee(mode, instant) {
    st.mode = mode;
    if (mode === 'solar') {
      st.u = 0; st.D = dOf(362000);
      show(['mshadow', 'spot', 'earthTag', 'moonTag', 'rays', 'orbit']);
      layout();
      seeAt.position.copy(sunDir).multiplyScalar(RE + 0.02).addScaledVector(Y, 0.62);
      view({ radius: 3.4, yaw: -0.75, pitch: 0.3, target: [-2.6, 0, 0] }, instant);
    } else {
      st.u = Math.PI; st.D = D_MEAN;
      show(['eshadow', 'earthTag', 'moonTag', 'rays', 'orbit']);
      layout();
      nightCap.set(Math.PI / 2, away);
      nightCap.mesh.visible = true;
      seeAt.position.copy(away).multiplyScalar(RE + 0.1).addScaledVector(Y, 0.3);
      view({ radius: 3.6, yaw: 1.0, pitch: 0.3, target: [2.4, 0, 0] }, instant);
    }
    seeTag.show(true);
    readout();
  }

  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz;
      st.sigma = SIG0; st.node = SIG0; st.tiltTo = TILT; st.tilt = TILT; st.pointTo = 0; st.point = 0; st.D = D_MEAN; st.uOff = 0;
      st.dayTo = st.day = 0; st.lastSyz = null;
      if (i === 0) {
        st.tilt = st.tiltTo = 0;
        st.elong = (7.4 / SYNODIC) * 2 * Math.PI; st.u = st.elong;
        show(['orbit', 'rays', 'earthTag', 'moonTag']);
        view({ radius: 6.9, yaw: 0, pitch: 1.25, target: [-0.6, 0, 0] }, instant);
        ui.slider({ label: 'Day of the Moon\'s trip', min: 0, max: 29.5, step: 0.25, value: 7.4, format: v => `day ${v.toFixed(1)}`,
          onInput: v => { st.elong = (v / SYNODIC) * 2 * Math.PI; st.u = st.elong; layout(); readout(); } });
      }
      if (i === 1) {
        st.u = 0; st.D = dOf(365000);
        show(['mshadow', 'tags', 'rays', 'earthTag', 'moonTag']);
        view({ radius: 3.2, yaw: 0, pitch: 0.12, target: [-3.0, 0, 0] }, instant);
        ui.toggle({ label: 'Shrink the Sun to a tiny point', value: false, onChange: v => { st.pointTo = v ? 1 : 0; readout(); } });
      }
      if (i === 2) {
        st.u = 0; st.D = dOf(362000);
        show(['mshadow', 'spot', 'rays', 'earthTag', 'moonTag', 'orbit']);
        view({ radius: 3.1, yaw: 0.35, pitch: 0.16, target: [-2.9, 0, 0] }, instant);
        ui.slider({ label: "Moon's position", min: -8, max: 8, step: 0.1, value: 0, format: v => (v === 0 ? 'lined up' : `${v > 0 ? '+' : ''}${v.toFixed(1)}°`),
          onInput: v => { st.uOff = v; st.u = v * D2R; layout(); readout(); } });
      }
      if (i === 3) {
        st.u = Math.PI; st.D = D_MEAN;
        show(['eshadow', 'etags', 'rays', 'earthTag', 'moonTag', 'orbit']);
        view({ radius: 3.4, yaw: -0.25, pitch: 0.16, target: [3.2, 0, 0] }, instant);
        ui.slider({ label: "Moon's position", min: -16, max: 16, step: 0.2, value: 0, format: v => (v === 0 ? 'lined up' : `${v > 0 ? '+' : ''}${v.toFixed(1)}°`),
          onInput: v => { st.u = Math.PI + v * D2R; layout(); readout(); } });
      }
      if (i === 4) {
        st.node = NODE4; setDay(0);
        show(['orbit', 'plane', 'eshadow', 'mshadow', 'rays', 'moonTag']);
        dirSet(tmp, NODE4 + 0.75);   // look nearly along the crossing line, so the tilt shows clearly
        view({ radius: 7, yaw: Math.atan2(tmp.x, tmp.z), pitch: 0.22, target: [0, 0.4, 0] }, instant);
        ui.buttons([{ label: 'Next new moon', onClick: () => { nextSyzygy(false); readout(); } }, { label: 'Next full moon', onClick: () => { nextSyzygy(true); readout(); } }]);
        ui.toggle({ label: "Flatten the Moon's orbit (no tilt)", value: false, onChange: v => { st.tiltTo = v ? 0 : TILT; st.lastSyz = null; readout(); } });
      }
      if (i === 5) {
        st.u = 0; st.km = 362000; st.obsKm = 0; st.D = dOf(st.km);
        show(['mshadow', 'ant', 'you', 'moonTag']);
        view({ radius: 3.1, yaw: 0.25, pitch: 0.1, target: [-3.3, 0, 0] }, instant);
        ui.slider({ label: 'Moon distance', min: 356500, max: 406700, step: 100, value: st.km, unit: ' km', format: v => v.toLocaleString('en-US'),
          onInput: v => { st.km = v; st.D = dOf(v); layout(); readout(); } });
        ui.slider({ label: 'Your distance from the shadow centre', min: 0, max: 4000, step: 10, value: 0, unit: ' km', format: v => v.toLocaleString('en-US'),
          onInput: v => { st.obsKm = v; placeYou(); readout(); } });
        placeYou();
      }
      if (i === 6) {
        const row = ui.buttons([{ label: 'Solar eclipse', on: true, onClick: () => whoCanSee('solar') }, { label: 'Lunar eclipse', onClick: () => whoCanSee('lunar') }]);
        row.select(0);
        whoCanSee('solar', instant);
      }
      if (isQuiz) {
        st.u = 2.2;
        show(['orbit', 'rays', 'eshadow', 'sunTag', 'earthTag', 'moonTag']);
        view({ radius: 7.6, yaw: 0.5, pitch: 0.55, target: [-0.5, 0, 0] }, instant);
      }
      layout(); antiumbra();
      readout();
    },
    update(dt) {
      let moving = false;
      if (kit.follow(st, 'point', st.pointTo, dt, 4)) { moving = true; st.dirty = true; }
      if (kit.follow(st, 'tilt', st.tiltTo, dt, 4)) { moving = true; st.dirty = true; }
      if (st.step === 4 && Math.abs(st.dayTo - st.day) > 1e-3) {
        const d = Math.min(st.dayTo, st.day + dt * 14);
        setDay(d);
        st.dirty = true; moving = true;
        if (d >= st.dayTo) judgeSyzygy();
      }
      if (st.dirty) { layout(); antiumbra(); }
      return moving;
    },
  };
}

// Overlap of the Sun disc (radius a) and the Moon disc (radius b) whose centres are d apart (any units).
function classify(a, b, d) {
  if (d >= a + b) return { name: 'No eclipse here', cover: 0 };
  if (d <= b - a) return { name: 'Total eclipse: the Moon hides the whole Sun', cover: 1 };
  if (d <= a - b) return { name: 'Annular eclipse: a ring of Sun shows around the Moon', cover: (b * b) / (a * a) };
  const a2 = a * a, b2 = b * b;
  const area = a2 * Math.acos((d * d + a2 - b2) / (2 * d * a)) + b2 * Math.acos((d * d + b2 - a2) / (2 * d * b))
    - 0.5 * Math.sqrt(Math.max(0, (-d + a + b) * (d + a - b) * (d - a + b) * (d + a + b)));
  return { name: 'Partial eclipse', cover: area / (Math.PI * a2) };
}

const row = (svg, text) => `<div style="display:flex;gap:12px;align-items:center">${svg}<div>${text}</div></div>`;

// The Moon's face as seen from Earth (northern half of the world): lit on the right while waxing.
function phaseSVG(E) {
  const r = 30, c = 36, rx = Math.abs(Math.cos(E)) * r;
  const waxing = E < Math.PI, crescent = Math.cos(E) > 0;
  let d;
  if (waxing) d = `M${c},${c - r} A${r},${r} 0 0 1 ${c},${c + r} A${rx},${r} 0 0 ${crescent ? 0 : 1} ${c},${c - r}Z`;
  else d = `M${c},${c - r} A${r},${r} 0 0 0 ${c},${c + r} A${rx},${r} 0 0 ${crescent ? 1 : 0} ${c},${c - r}Z`;
  return `<svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><rect width="72" height="72" rx="10" fill="#0b1430"/><circle cx="${c}" cy="${c}" r="${r}" fill="#2b3142"/><path d="${d}" fill="#ecebe3"/></svg>`;
}

// Sun with the Moon in front of it; the sky darkens as more of the Sun is covered.
function solarSVG(s) {
  const R = 22, c = 36, sky = s.cover > 0.999 ? '#0b1430' : s.cover > 0.9 ? '#33507a' : '#8ecdf5';
  const corona = s.cover > 0.999 ? `<circle cx="${c}" cy="${c}" r="${R * 1.35}" fill="none" stroke="#fff6d8" stroke-opacity="0.55" stroke-width="5"/>` : '';
  const mx = c + s.dx * R, my = c - s.dy * R;
  return `<svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><defs><clipPath id="sk"><rect width="72" height="72" rx="10"/></clipPath></defs><g clip-path="url(#sk)"><rect width="72" height="72" fill="${sky}"/>${corona}<circle cx="${c}" cy="${c}" r="${R}" fill="#ffd34d"/><circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${(R * s.mR).toFixed(1)}" fill="#262b38"/></g></svg>`;
}

// The full moon as seen during a lunar eclipse: dimmer in the penumbra, red in the umbra.
function lunarSVG(fu, fp) {
  const dim = 1 - 0.35 * fp, mix = (a, b) => Math.round(a + (b - a) * fu);
  const col = `rgb(${mix(236 * dim, 170)},${mix(235 * dim, 64)},${mix(227 * dim, 40)})`;
  return `<svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><rect width="72" height="72" rx="10" fill="#0b1430"/><circle cx="36" cy="36" r="26" fill="${col}"/></svg>`;
}

// A cap on a sphere of radius 1.012 around direction dir, from the pole out to angle theta. set() reshapes it in place.
function cap(THREE, color, opacity) {
  const S = 40, Rr = 8, R = 1.012;
  const pos = new Float32Array((Rr + 1) * (S + 1) * 3), idx = [];
  for (let i = 0; i < Rr; i++) for (let j = 0; j < S; j++) {
    const a = i * (S + 1) + j, b = a + S + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  const Y = new THREE.Vector3(0, 1, 0);
  return {
    mesh,
    set(theta, dir) {
      for (let i = 0; i <= Rr; i++) {
        const t = (i / Rr) * theta, st = Math.sin(t), ct = Math.cos(t);
        for (let j = 0; j <= S; j++) {
          const p = (j / S) * Math.PI * 2, k = (i * (S + 1) + j) * 3;
          pos[k] = R * st * Math.cos(p); pos[k + 1] = R * ct; pos[k + 2] = R * st * Math.sin(p);
        }
      }
      g.attributes.position.needsUpdate = true;
      mesh.quaternion.setFromUnitVectors(Y, dir);
    },
  };
}
