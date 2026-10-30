// The solar system: the Sun and eight planets in three pictures (squeezed "orbit" view, sizes to scale,
// distances to scale), orbits at the right pace (period from textbook values), gravity on/off, and a
// zoom out to the Milky Way.
import { rand, SPACE, starfield, makeSun, orbitRing, planetTexture, saturnRings } from '../_shared/sky.js';

const EARTH_KM = 12756, SUN_KM = 1392700;
// Textbook values: mean distance (AU), orbital period (Earth years), equatorial diameter (km).
// R and r: orbit radius and size in the squeezed picture (not to scale). a0: starting angle there.
const PL = [
  { name: 'Mercury', au: 0.39, yr: 0.241, days: 88, km: 4879, R: 2.2, r: 0.16, a0: 5.0, kind: 'rocky' },
  { name: 'Venus', au: 0.72, yr: 0.615, days: 225, km: 12104, R: 3.0, r: 0.26, a0: 2.6, kind: 'rocky' },
  { name: 'Earth', au: 1.0, yr: 1.0, days: 365, km: 12756, R: 3.9, r: 0.28, a0: 4.4, kind: 'rocky' },
  { name: 'Mars', au: 1.52, yr: 1.88, days: 687, km: 6792, R: 4.8, r: 0.2, a0: 1.2, kind: 'rocky' },
  { name: 'Jupiter', au: 5.2, yr: 11.86, km: 142984, R: 6.8, r: 0.7, a0: 3.4, kind: 'giant' },
  { name: 'Saturn', au: 9.58, yr: 29.46, km: 120536, R: 8.8, r: 0.6, a0: 5.6, kind: 'giant' },
  { name: 'Uranus', au: 19.2, yr: 84.0, km: 51118, R: 10.8, r: 0.42, a0: 0.3, kind: 'giant' },
  { name: 'Neptune', au: 30.1, yr: 164.8, km: 49528, R: 12.4, r: 0.4, a0: 1.9, kind: 'giant' },
];
const RE_S = 0.12;                       // Earth's radius in the "sizes to scale" picture
const SUN_BIG = (SUN_KM / EARTH_KM) * RE_S; // the Sun's radius in that picture (about 13.1)
const DOT = [0.13, 0.16, 0.16, 0.13, 0.42, 0.36, 0.28, 0.28]; // marker sizes in the "distances to scale" picture
const GAL_R = 14, SUN_FROM_CENTRE = 0.52 * GAL_R;    // about 26,000 of 50,000 light-years

const fmt = n => n.toLocaleString('en-US');
const ord = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export default function setup({ THREE, scene, camera, kit, ui, label, view }) {
  scene.background = new THREE.Color(SPACE);
  scene.add(new THREE.AmbientLight(0x8090b0, 1.1));
  starfield(THREE, scene, { count: 800, radius: 150, size: 0.7 });

  const solar = new THREE.Group();
  scene.add(solar);
  const sun = makeSun(THREE, 1);
  solar.add(sun);
  const light = new THREE.PointLight(0xffffff, 3, 0, 0);
  sun.add(light);
  const sunTag = label('Sun', new THREE.Vector3(), { cls: 'big warm' });
  const sunAnchor = new THREE.Object3D();
  solar.add(sunAnchor);
  sunTag.at = sunAnchor;

  // Planets: group (position + scale) > body (tilt) > sphere (+ Saturn's rings).
  const sphere = new THREE.SphereGeometry(1, 32, 16);
  const planets = PL.map((p, i) => {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const m = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: planetTexture(THREE, p.name.toLowerCase()), roughness: 0.85 }));
    body.add(m);
    if (p.name === 'Saturn') { body.add(saturnRings(THREE, 1.25, 2.3)); body.rotation.x = 0.47; } // tilted about 27 degrees
    if (p.name === 'Uranus') body.rotation.z = 1.71;  // Uranus spins on its side (about 98 degrees)
    solar.add(g);
    const ring = orbitRing(THREE, { color: 0x9fb4ff, opacity: 0.3 });
    solar.add(ring);
    const anchor = new THREE.Object3D();
    solar.add(anchor);
    const tag = label(p.name, anchor);
    const reach = p.name === 'Saturn' ? 2.3 : 1;
    return { p, i, g, ring, anchor, tag, reach, from: new THREE.Vector3(), fromS: 0, vel: new THREE.Vector3(), free: false };
  });

  // "Sizes to scale": planets in a row to the right of the Sun's edge (the Sun's edge is at x = 0).
  let x = 0.45;
  const rowX = PL.map((p, i) => {
    const r = (p.km / EARTH_KM) * RE_S, w = r * planets[i].reach;
    const at = x + w;
    x = at + w + 0.32;
    return at;
  });
  const ROW_END = x;

  // Marker ring around the chosen planet (faces the camera).
  const marker = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 40), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9, depthWrite: false }));
  solar.add(marker);

  // Arrows for the gravity step: motion (tangent) and the Sun's pull.
  const makeArrow = (color, len) => {
    const a = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len - 0.4, 8), m);
    shaft.position.y = (len - 0.4) / 2;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 12), m);
    head.position.y = len - 0.2;
    a.add(shaft, head);
    a.tip = new THREE.Object3D(); a.tip.position.y = len + 0.1; a.add(a.tip);
    solar.add(a);
    return a;
  };
  const moveArrow = makeArrow(0x6ee7a0, 2.6), pullArrow = makeArrow(0xff9b54, 2.0);
  const moveTag = label('Motion', moveArrow.tip, { cls: 'cool' }), pullTag = label('Gravity', pullArrow.tip, { cls: 'warm' });

  // The Milky Way: a flat spiral of points around a bright bar, centre at (-SUN_FROM_CENTRE, 0, 0).
  const galaxy = new THREE.Group();
  galaxy.position.set(-SUN_FROM_CENTRE, 0, 0);
  scene.add(galaxy);
  {
    const N = 9000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      let px, py, pz;
      const k = i / N;
      if (k < 0.14) { // central bulge and bar, yellowish
        const r = 0.22 * Math.pow(rand(i), 1.5), a = rand(i + 50000) * Math.PI * 2;
        px = r * Math.cos(a) * 1.6; pz = r * Math.sin(a) * 0.75; py = (rand(i + 70000) - 0.5) * 0.1 * (1 - r * 3);
        c.setHSL(0.1 + 0.03 * rand(i + 8), 0.9, 0.55 + 0.25 * rand(i + 9));
      } else if (k < 0.4) { // faint disc between the arms
        const r = 0.15 + 0.85 * Math.sqrt(rand(i)), a = rand(i + 50000) * Math.PI * 2;
        px = r * Math.cos(a); pz = -r * Math.sin(a); py = (rand(i + 33000) - 0.5) * 0.025;
        c.setHSL(0.62, 0.45, 0.35 + 0.2 * rand(i + 6));
      } else { // four logarithmic spiral arms (the last few per cent make the small arm the Sun is in)
        const spur = k > 0.95, arm = i % 4, t = rand(i);
        let r, a;
        if (spur) { r = 0.4 + 0.24 * t; a = -0.45 + (r - 0.4) * 2.4; }
        else { r = 0.18 + 0.82 * Math.pow(t, 0.85); a = (arm * Math.PI) / 2 + Math.log(r / 0.18) * 3.2; }
        const sp = (spur ? 0.02 : 0.03) + 0.06 * r;
        px = r * Math.cos(a) + (rand(i + 11000) - 0.5) * sp * 2;
        pz = -r * Math.sin(a) + (rand(i + 22000) - 0.5) * sp * 2;
        py = (rand(i + 33000) - 0.5) * 0.03;
        c.setHSL(0.58 + 0.06 * rand(i + 5), 0.75, 0.55 + 0.3 * rand(i + 6));
      }
      pos.set([px * GAL_R, py * GAL_R, pz * GAL_R], i * 3);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    galaxy.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.17, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
  }
  const galMat = galaxy.children[0].material;
  galaxy.visible = false;
  const hereRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 40), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  hereRing.rotation.x = -Math.PI / 2;
  scene.add(hereRing);
  const hereTag = label('Sun is here', new THREE.Vector3(0, 0.4, 0), { cls: 'warm' });
  const centreTag = label('Galaxy centre', new THREE.Vector3(-SUN_FROM_CENTRE, 0.6, 0), { cls: 'cool' });

  const st = {
    step: 0, mode: 'orbit', blend: 1, years: 0, speed: 0.06, sel: 2, gravity: true, zoom: 0, zoomTo: 0,
    highlight: false, arrows: false, labelsAll: true, shownYears: -1, quiz: false,
  };

  // Where planet i should be in the current picture (writes into out) and how big (returned).
  function layout(mode, pl, out) {
    const p = pl.p, i = pl.i;
    if (mode === 'size') { out.set(rowX[i], 0, 0); return (p.km / EARTH_KM) * RE_S; }
    if (mode === 'dist') { out.set(p.au, 0, 0); return DOT[i]; }
    const a = p.a0 + (st.years / p.yr) * Math.PI * 2;
    out.set(p.R * Math.cos(a), 0, -p.R * Math.sin(a));
    return p.r;
  }
  const sunLayout = (mode, out) => {
    if (mode === 'size') { out.set(-SUN_BIG, 0, 0); return SUN_BIG; }
    out.set(0, 0, 0);
    return mode === 'dist' ? 0.4 : 1.2;
  };
  const sunFrom = new THREE.Vector3(); let sunFromS = 1.2;
  const ringScale = (mode, pl) => (mode === 'dist' ? pl.p.au : pl.p.R);

  function setMode(mode, instant) {
    for (const pl of planets) { pl.from.copy(pl.g.position); pl.fromS = pl.g.scale.x; pl.fromRing = pl.ring.scale.x; }
    sunFrom.copy(sun.position); sunFromS = sun.scale.x;
    st.mode = mode;
    st.blend = instant ? 1 : 0;
  }
  function freeAll(on) {
    st.gravity = !on;
    if (on) {
      // Velocity along the orbit at this moment (tangent), in the squeezed picture.
      for (const pl of planets) {
        const w = (st.speed / pl.p.yr) * Math.PI * 2, R = pl.p.R, a = Math.atan2(-pl.g.position.z, pl.g.position.x);
        pl.vel.set(-Math.sin(a), 0, -Math.cos(a)).multiplyScalar(w * R);
        pl.free = true;
      }
    } else {
      for (const pl of planets) pl.free = false;
      setMode('orbit');
      st.mode = 'orbit'; st.blend = 0;
      for (const pl of planets) { pl.from.copy(pl.g.position); pl.fromS = pl.g.scale.x; pl.fromRing = pl.ring.scale.x; }
    }
  }

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  function place(dt) {
    const e = kit.ease(Math.min(1, st.blend));
    for (const pl of planets) {
      if (pl.free) {
        if (pl.g.position.lengthSq() < 2500) pl.g.position.addScaledVector(pl.vel, dt);
      } else {
        const s = layout(st.mode, pl, tmp);
        if (st.blend < 1) { pl.g.position.lerpVectors(pl.from, tmp, e); pl.g.scale.setScalar(kit.lerp(pl.fromS, s, e)); }
        else { pl.g.position.copy(tmp); pl.g.scale.setScalar(s); }
      }
      const rs = st.blend < 1 ? kit.lerp(pl.fromRing ?? ringScale(st.mode, pl), ringScale(st.mode, pl), e) : ringScale(st.mode, pl);
      pl.ring.scale.setScalar(rs);
      const want = st.mode === 'size' ? 0 : st.highlight ? (pl.i === st.sel ? 0.95 : 0.12) : 0.3;
      pl.ring.material.opacity = st.blend < 1 ? kit.lerp(pl.ring.material.opacity, want, e) : want;
      pl.ring.material.color.setHex(st.highlight && pl.i === st.sel ? 0xffd166 : 0x9fb4ff);
      pl.ring.visible = pl.ring.material.opacity > 0.01;
      pl.anchor.position.copy(pl.g.position);
      pl.anchor.position.y += pl.g.scale.x * (pl.p.name === 'Saturn' ? 1.3 : 1) + 0.12;
    }
    const ss = sunLayout(st.mode, tmp);
    if (st.blend < 1) { sun.position.lerpVectors(sunFrom, tmp, e); sun.scale.setScalar(kit.lerp(sunFromS, ss, e)); }
    else { sun.position.copy(tmp); sun.scale.setScalar(ss); }
    sun.glow.visible = sun.scale.x < 3;
    sunAnchor.position.copy(sun.position);
    sunAnchor.position.y += st.mode === 'size' ? 4.5 : sun.scale.x + 0.25;
    if (st.mode === 'size') sunAnchor.position.x = -1.2;

    // Marker on the chosen planet.
    const sel = planets[st.sel];
    marker.visible = st.step <= 4 && !st.quiz;
    marker.position.copy(sel.g.position);
    marker.scale.setScalar(Math.max(sel.g.scale.x * sel.reach * 1.35, st.mode === 'size' ? 0.16 : st.mode === 'dist' ? 0.3 : 0.4));
    marker.quaternion.copy(camera.quaternion);

    // Gravity arrows on the chosen planet (Earth).
    moveArrow.visible = pullArrow.visible = st.arrows;
    if (st.arrows) {
      const pl = planets[st.sel];
      moveArrow.position.copy(pl.g.position); pullArrow.position.copy(pl.g.position);
      if (pl.free) tmp.copy(pl.vel).normalize();
      else { const a = Math.atan2(-pl.g.position.z, pl.g.position.x); tmp.set(-Math.sin(a), 0, -Math.cos(a)); }
      moveArrow.quaternion.setFromUnitVectors(Y, tmp);
      tmp2.copy(pl.g.position).negate().normalize();
      pullArrow.quaternion.setFromUnitVectors(Y, tmp2);
      pullArrow.visible = st.gravity;
    }
    moveTag.show(st.arrows); pullTag.show(st.arrows && st.gravity);
  }

  function labels() {
    const z = st.zoom;
    for (const pl of planets) {
      const on = !st.quiz && z < 0.2 && !st.arrows && ((st.labelsAll && pl.i > 3) || pl.i === st.sel);
      pl.tag.show(on);
      pl.tag.el.classList.toggle('warm', pl.i === st.sel && st.step <= 4);
    }
    sunTag.show(z < 0.2 && st.step <= 2 && !st.quiz);
    hereTag.show(z > 0.7); centreTag.show(z > 0.7);
  }

  function readout() {
    if (st.quiz) return;
    const p = PL[st.sel];
    const yearsText = p.days ? `${p.yr.toFixed(2)} Earth years (${p.days} days)` : `${p.yr.toFixed(1)} Earth years`;
    if (st.step === 0) {
      ui.readout(`<b>${p.name}</b>: the ${ord[st.sel]} planet from the Sun, ${p.kind === 'rocky' ? 'a small <b>rocky</b> inner planet' : 'a <b>giant</b> outer planet'}.`);
    } else if (st.step === 1 || (st.step === 2 && st.mode === 'size')) {
      const ratio = p.km / EARTH_KM;
      const rel = st.sel === 2 ? 'our home planet' : ratio < 1 ? `about ${ratio.toFixed(2)} of Earth's width` : `about ${ratio < 5 ? ratio.toFixed(1) : Math.round(ratio)} times as wide as Earth`;
      ui.readout(`<b>${p.name}</b>: diameter about ${fmt(Math.round(p.km / 100) * 100)} km, ${rel}.<br>The Sun: diameter about 1.4 million km, about <b>109</b> times Earth's.`);
    } else if (st.step === 2) {
      const mkm = Number((p.au * 149.6).toPrecision(p.au < 1 ? 2 : 3)), min = Math.round(p.au * 8.32);
      const light = min < 60 ? `${min} minutes` : `${Math.floor(min / 60)} h ${min % 60} min`;
      ui.readout(`<b>${p.name}</b>: about <b>${p.au < 10 ? p.au.toFixed(2) : p.au.toFixed(1)} AU</b> from the Sun = about ${fmt(mkm)} million km.<br>Sunlight takes about ${light} to get there.`);
    } else if (st.step === 3) {
      ui.readout(`<b>${p.name}</b>: distance about <b>${p.au < 10 ? p.au.toFixed(2) : p.au.toFixed(1)} AU</b> · orbital period about <b>${yearsText}</b>.<br>Time passed: ${st.years.toFixed(1)} Earth years.`);
    } else if (st.step === 4) {
      const a3 = p.au ** 3, t2 = p.yr ** 2, f = v => (v < 10 ? v.toFixed(2) : fmt(Math.round(v)));
      ui.readout(`<b>${p.name}</b>: a = ${p.au < 10 ? p.au.toFixed(2) : p.au.toFixed(1)} AU, T = ${p.yr < 10 ? p.yr.toFixed(2) : p.yr.toFixed(1)} years<br>a³ = ${f(a3)} &nbsp; T² = ${f(t2)} &nbsp; (almost equal!)`);
    } else if (st.step === 5) {
      ui.readout(st.gravity ? `Sun's gravity: <b>on</b>. Gravity pulls each planet toward the Sun, so its path keeps curving into an orbit.`
        : `Sun's gravity: <b>off</b>. Nothing bends the paths: each planet moves in a <b>straight line</b> along its tangent.`);
    } else if (st.step === 6) {
      ui.readout(st.zoomTo > 0.5 ? `The Milky Way: about <b>100,000 light-years</b> across. The Sun is about <b>26,000 light-years</b> from the centre.`
        : `Neptune's orbit is about <b>60 AU</b> across. That is less than one thousandth of a light-year.`);
    }
  }

  const planetSlider = (value) => ui.slider({ label: 'Planet', min: 0, max: 7, step: 1, value, format: v => PL[v].name, onInput: v => { st.sel = v; readout(); labels(); } });

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.quiz = isQuiz;
      st.highlight = false; st.arrows = false; st.labelsAll = false; st.zoomTo = 0;
      if (!st.gravity) freeAll(false);
      for (const pl of planets) { pl.free = false; }
      st.gravity = true;
      const OVER = { radius: 13, yaw: 0.25, pitch: 0.8, target: [0, 0, 0] };
      if (i === 0) {
        setMode('orbit', instant); st.speed = 0; st.years = 0; st.labelsAll = true; st.sel = 2;
        go(OVER);
        planetSlider(st.sel);
      }
      if (i === 1) {
        setMode('size', instant); st.sel = 4;
        go({ radius: 1.6, width: (ROW_END + 1.2) / 2, yaw: 0, pitch: 0.12, target: [(ROW_END - 1.2) / 2, 0.3, 0] });
        planetSlider(st.sel);
      }
      if (i === 2) {
        setMode('dist', instant); st.sel = 7;
        const toDist = () => { setMode('dist'); view({ radius: 3, width: 16.5, yaw: 0, pitch: 1.2, target: [15, 0, 0] }); readout(); };
        const toSize = () => { setMode('size'); view({ radius: 1.6, width: (ROW_END + 1.2) / 2, yaw: 0, pitch: 0.12, target: [(ROW_END - 1.2) / 2, 0.3, 0] }); readout(); };
        go({ radius: 3, width: 16.5, yaw: 0, pitch: 1.2, target: [15, 0, 0] });
        ui.buttons([{ label: 'Sizes to scale', onClick: toSize }, { label: 'Distances to scale', onClick: toDist, on: true }]);
        planetSlider(st.sel);
      }
      if (i === 3) {
        setMode('orbit', instant); st.speed = 0.1; st.sel = 0;
        go(OVER);
        ui.slider({ label: 'Time speed', min: 0, max: 0.5, step: 0.05, value: 0.1, format: v => (v ? `${v.toFixed(2)} Earth years each second` : 'stopped'), onInput: v => { st.speed = v; } });
        planetSlider(st.sel);
      }
      if (i === 4) {
        setMode('orbit', instant); st.speed = 0.25; st.sel = 4; st.highlight = true;
        go({ radius: 13, yaw: 0.25, pitch: 1.0, target: [0, 0, 0] });
        planetSlider(st.sel);
      }
      if (i === 5) {
        setMode('orbit', instant); st.speed = 0.12; st.sel = 2; st.arrows = true;
        go({ radius: 6.5, yaw: 0.25, pitch: 1.05, target: [0, 0, 0] });
        ui.toggle({ label: "Sun's gravity", value: true, onChange: v => { freeAll(!v); readout(); } });
      }
      if (i === 6) {
        setMode('orbit', instant); st.speed = 0.1; st.zoomTo = 1;
        go({ radius: 15.5, yaw: 1.3, pitch: 0.95, target: [-SUN_FROM_CENTRE, 0, 0] });
        ui.buttons([{ label: 'Zoom out', on: true, onClick: () => { st.zoomTo = 1; readout(); } }, { label: 'Zoom in', onClick: () => { st.zoomTo = 0; readout(); } }]);
      }
      if (isQuiz) {
        setMode('orbit', instant); st.speed = 0.05;
        go({ radius: 13, yaw: -0.4, pitch: 0.6, target: [0, 0, 0] });
      }
      if (st.step !== 6) st.zoomTo = 0;
      if (instant) st.zoom = st.zoomTo;
      st.shownYears = -1;
      readout(); labels();
    },
    update(dt) {
      let moving = st.blend < 1 || st.speed > 0 || planets.some(p => p.free);
      if (st.blend < 1) st.blend = Math.min(1, st.blend + dt / 1.3);
      if (st.gravity) st.years += st.speed * dt;
      // Zoom to the galaxy: the solar system shrinks to a dot and the Milky Way fades in.
      if (Math.abs(st.zoom - st.zoomTo) > 1e-3) {
        st.zoom += Math.sign(st.zoomTo - st.zoom) * Math.min(Math.abs(st.zoomTo - st.zoom), dt / 2.2);
        moving = true;
        labels();
      } else st.zoom = st.zoomTo;
      const z = kit.ease(st.zoom);
      solar.scale.setScalar(Math.exp(Math.log(0.012) * z));
      galaxy.visible = z > 0.01;
      galMat.opacity = kit.clamp((z - 0.25) / 0.6, 0, 1);
      hereRing.material.opacity = kit.clamp((z - 0.6) / 0.4, 0, 1) * 0.9;
      hereRing.visible = z > 0.6;
      place(dt);
      if (st.step === 3 && Math.floor(st.years * 10) !== st.shownYears) { st.shownYears = Math.floor(st.years * 10); readout(); }
      return moving;
    },
  };
}
