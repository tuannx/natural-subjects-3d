// Seasons: Earth goes around the Sun with its axis tilted 23.4 degrees, always pointing the same way.
// A month slider moves Earth along its (very slightly oval) orbit; a latitude slider picks a place.
// Noon Sun height = 90 - |latitude - Sun's overhead latitude|; day length from cos H = -tan(lat) tan(decl).
// A small lab shows the same beam of light spreading over a bigger area when the Sun is low.
import { SPACE, starfield, makeSun, orbitRing } from '../_shared/sky.js';

const EPS = (23.44 * Math.PI) / 180; // tilt of Earth's axis
const A = 9;                          // orbit size in this model (Earth and Sun are drawn far too big)
const ECC = 0.0167;                   // Earth's real orbital eccentricity: the orbit is almost a circle
const YEAR = 365.25, EQUINOX = 79, PERIHELION = 3; // day numbers: 20 March, 3 January
const D2R = Math.PI / 180;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const dateOf = d => {
  let n = Math.round(d) - 1, m = 0;
  n = ((n % 365) + 365) % 365;
  while (m < 11 && n >= MDAYS[m]) { n -= MDAYS[m]; m++; }
  return `${n + 1} ${MONTHS[m]}`;
};
const sunLon = d => (2 * Math.PI * (d - EQUINOX)) / YEAR;          // Sun's direction seen from Earth
const distKm = d => 149.6 * (1 - ECC * Math.cos((2 * Math.PI * (d - PERIHELION)) / YEAR)); // million km
const declOf = d => Math.asin(Math.sin(EPS) * Math.sin(sunLon(d)));
const noonAlt = (lat, dec) => 90 - Math.abs(lat - dec / D2R);
function dayHours(lat, dec) {
  const c = -Math.tan(lat * D2R) * Math.tan(dec);
  if (c <= -1) return 24;
  if (c >= 1) return 0;
  return (24 * Math.acos(c)) / Math.PI;
}
const hm = h => { const t = Math.round(h * 60); return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')} min`; };
const latText = l => (l === 0 ? '0° (equator)' : `${Math.abs(l)}° ${l > 0 ? 'N' : 'S'}`);
function seasonNorth(d) {
  const L = (((sunLon(d) / D2R) % 360) + 360) % 360;
  return L < 90 ? 'spring' : L < 180 ? 'summer' : L < 270 ? 'autumn' : 'winter';
}
const opposite = { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' };

export default function setup({ THREE, scene, camera, kit, ui, label, view }) {
  scene.background = new THREE.Color(SPACE);
  const amb = new THREE.AmbientLight(0x6878a8, 0.6);
  scene.add(amb);
  starfield(THREE, scene, { count: 700, radius: 140, size: 0.6, seed: 7 });

  // world: Sun at its origin. Shifting it by -earthPos puts Earth at the centre for close-ups.
  const world = new THREE.Group();
  scene.add(world);
  const sun = makeSun(THREE, 1.5);
  world.add(sun);
  sun.add(new THREE.PointLight(0xffffff, 3.2, 0, 0));
  const sunTagAt = new THREE.Object3D(); sunTagAt.position.y = 1.7; world.add(sunTagAt);
  const sunTag = label('Sun', sunTagAt, { cls: 'big warm' });

  // Earth's orbit drawn with the real (tiny) eccentricity, using the same formulas that move Earth.
  const pos = new THREE.Vector3(), sunDir = new THREE.Vector3();
  function earthAt(d, out) {
    const L = sunLon(d), r = A * distKm(d) / 149.6;
    return out.set(-Math.cos(L) * r, 0, Math.sin(L) * r);
  }
  {
    const pts = [];
    for (let i = 0; i < 180; i++) { earthAt((i / 180) * YEAR, pos); pts.push(pos.x, 0, pos.z); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    world.add(new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.45 })));
  }
  const orbitPath = world.children[world.children.length - 1];

  // Earth: group at its orbit position > tilt (axis direction, never turns) > globe (spins).
  const axisDir = new THREE.Vector3(0, Math.cos(EPS), -Math.sin(EPS));
  const tiltQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axisDir);
  const invTilt = tiltQ.clone().invert();
  const earthMat = new THREE.MeshStandardMaterial({ map: paintEarth(THREE), roughness: 0.95 });
  function makeEarth(r, axisLen) {
    const g = new THREE.Group(), tilt = new THREE.Group();
    tilt.quaternion.copy(tiltQ);
    g.add(tilt);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), earthMat);
    tilt.add(globe);
    const axis = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.04, r * 0.04, axisLen, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tilt.add(axis);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.08, r * 0.2, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tip.position.y = axisLen / 2;
    tilt.add(tip);
    world.add(g);
    return { g, tilt, globe };
  }
  const earth = makeEarth(1, 3.1);
  const axisTop = new THREE.Object3D(); axisTop.position.y = 1.75; earth.tilt.add(axisTop);
  const axisTag = label('Axis', axisTop);
  const earthTagAt = new THREE.Object3D(); earthTagAt.position.set(0, 1.2, 0); earth.g.add(earthTagAt);
  const earthTag = label('Earth', earthTagAt, { cls: 'cool' });

  // Equator (thin line), in the tilted frame.
  {
    const pts = [];
    for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(Math.cos(a) * 1.006, 0, Math.sin(a) * 1.006); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    earth.tilt.add(new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })));
  }

  // Four small Earths at the solstices and equinoxes, to show the axis keeps pointing the same way.
  const ghosts = [[80, 'March'], [172, 'June'], [266, 'September'], [355, 'December']].map(([d, name]) => {
    const e = makeEarth(0.7, 2.1);
    earthAt(d, e.g.position);
    const at = new THREE.Object3D(); at.position.y = 1.35; e.g.add(at);
    return { ...e, tag: label(name, at) };
  });

  // Day/night ring at a chosen latitude: a thin tube whose colour shows daylight (yellow) or night (blue).
  const ring = latitudeRing(THREE);
  earth.tilt.add(ring.mesh);
  const ring2 = latitudeRing(THREE);
  earth.tilt.add(ring2.mesh);

  // A place at the chosen latitude on the noon meridian (facing the Sun): flat ground, a stick and the sunbeam.
  function makePin() {
    const p = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.62), new THREE.MeshStandardMaterial({ color: 0x6fbf5a, roughness: 1 }));
    p.add(plate);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), new THREE.MeshBasicMaterial({ color: 0xe63946 }));
    stick.position.y = 0.11;
    p.add(stick);
    earth.tilt.add(p);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
    earth.tilt.add(beam);
    const at = new THREE.Object3D(); p.add(at); at.position.y = 0.3;
    // Angle marker between the ground and the beam: a fan of 90 one-degree slices, drawn up to the Sun height.
    const arc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 90, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    earth.tilt.add(arc);
    const arcAt = new THREE.Object3D(); arc.add(arcAt);
    return { p, beam, at, arc, arcAt, n: new THREE.Vector3(), h: new THREE.Vector3(), m: new THREE.Matrix4() };
  }
  const pin = makePin(), pin2 = makePin();
  const pinTag = label('Your place', pin.at, { cls: 'warm' }), pin2Tag = label('40° S', pin2.at, { cls: 'cool' });
  const angleTag = label('', pin.arcAt, { cls: 'warm' });

  // A town dot that turns with the globe at the chosen latitude: it passes through day and night.
  const town = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe63946 }));
  earth.globe.add(town);

  // Overhead-Sun spot: where the Sun is straight overhead at noon.
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff3a0 }));
  earth.tilt.add(spot);
  const spotTag = label('Sun overhead', spot, { cls: 'warm' });

  // Closest and farthest points of the orbit.
  const peri = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb703 }));
  const aph = peri.clone();
  earthAt(PERIHELION, peri.position); earthAt(PERIHELION + YEAR / 2, aph.position);
  world.add(peri, aph);
  // Their labels sit just outside the orbit, so they do not cover Earth's own label.
  const periAt = new THREE.Object3D(), aphAt = new THREE.Object3D();
  periAt.position.copy(peri.position).multiplyScalar(1.22); aphAt.position.copy(aph.position).multiplyScalar(1.08);
  world.add(periAt, aphAt);
  const periTag = label('Closest: early Jan', periAt, { cls: 'warm' }), aphTag = label('Farthest: early Jul', aphAt, { cls: 'cool' });

  // Beam lab: the same square beam of light hits flat ground at different Sun heights.
  const lab = new THREE.Group();
  lab.visible = false;
  scene.add(lab);
  const labLight = new THREE.DirectionalLight(0xffffff, 2.2);
  labLight.position.set(-3, 6, 4);
  lab.add(labLight, new THREE.HemisphereLight(0xffffff, 0x556070, 1.2));
  const ground = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 5), new THREE.MeshStandardMaterial({ map: gridTexture(THREE), roughness: 1 }));
  ground.position.y = -0.06;
  lab.add(ground);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  const labBeam = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 1), beamMat);
  lab.add(labBeam);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }));
  lab.add(lamp);
  const patchMat = new THREE.MeshBasicMaterial({ color: 0xfff1a8 });
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), patchMat);
  patch.rotation.x = -Math.PI / 2; patch.position.y = 0.006;
  lab.add(patch);
  const square = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([a, b]) => new THREE.Vector3(a, 0.012, b))),
    new THREE.LineBasicMaterial({ color: 0xe63946 }));
  lab.add(square);
  const patchTag = label('Lit patch', new THREE.Vector3(0, 0.05, 1.2), { cls: 'warm' });
  const beamTag = label('Same beam', new THREE.Vector3(), { cls: 'warm' });

  const st = { step: 0, day: 172, lat: 40, play: 0, f: 0, fTo: 0, alt: 60, quiz: false, frame: null, dirty: true };
  const Y = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), sunLocal = new THREE.Vector3();

  function placePin(pn, lat) {
    // noon meridian: the longitude that faces the Sun (in the tilted, non-spinning frame)
    const lon = Math.atan2(sunLocal.x, sunLocal.z), c = Math.cos(lat * D2R);
    pn.n.set(c * Math.sin(lon), Math.sin(lat * D2R), c * Math.cos(lon));
    pn.p.position.copy(pn.n).multiplyScalar(1.0);
    pn.p.quaternion.setFromUnitVectors(Y, pn.n);
    const up = pn.n.dot(sunLocal) > 0.005;
    pn.beam.visible = up && pn.p.visible;
    pn.beam.quaternion.setFromUnitVectors(Y, sunLocal);
    pn.beam.position.copy(pn.n).addScaledVector(sunLocal, 0.72);
    // fan: x along the ground toward the Sun, y straight up
    pn.h.copy(sunLocal).addScaledVector(pn.n, -pn.n.dot(sunLocal));
    if (pn.h.lengthSq() < 1e-8) pn.h.set(1, 0, 0).addScaledVector(pn.n, -pn.n.x);
    pn.h.normalize();
    tmp2.crossVectors(pn.h, pn.n);
    pn.m.makeBasis(pn.h, pn.n, tmp2);
    pn.arc.quaternion.setFromRotationMatrix(pn.m);
    pn.arc.position.copy(pn.n).multiplyScalar(1.02);
    const alt = Math.asin(kit.clamp(pn.n.dot(sunLocal), -1, 1)) / D2R;
    pn.arc.geometry.setDrawRange(0, Math.max(0, Math.round(alt)) * 3);
    pn.arc.visible = up && pn.p.visible && pn.showArc;
    const mid = (alt / 2) * D2R;
    pn.arcAt.position.set(Math.cos(mid) * 0.5, Math.sin(mid) * 0.5 - 0.06, 0);
  }

  function refresh() {
    earthAt(st.day, earth.g.position);
    const L = sunLon(st.day);
    sunDir.set(Math.cos(L), 0, -Math.sin(L));
    sunLocal.copy(sunDir).applyQuaternion(invTilt);
    spot.position.copy(sunLocal).multiplyScalar(1.01);
    ring.set(st.lat, sunLocal);
    ring2.set(-40, sunLocal);
    placePin(pin, st.lat);
    placePin(pin2, -40);
    const alt = noonAlt(st.lat, declOf(st.day));
    angleTag.text = `${Math.round(alt)}°`;
    if (st.step === 2) angleTag.show(alt > 0);
    const c = Math.cos(st.lat * D2R);
    town.position.set(c * 1.02, Math.sin(st.lat * D2R) * 1.02, 0);
    st.dirty = false;
  }

  // Camera for close-ups: look at Earth from the side, at right angles to the sunlight.
  function sideView(instant, radius = 2.7, pitch = 0.3) {
    tmp.crossVectors(Y, sunDir).normalize();
    view({ radius, yaw: Math.atan2(tmp.x, tmp.z), pitch, target: [0, 0, 0] }, instant);
  }
  // Camera for the noon-height step: edge-on to the plane of the beam and the local ground.
  // The place sits on the noon meridian, which faces the Sun, so this side view shows the true angle.
  function pinView(instant) {
    tmp.crossVectors(Y, sunDir).normalize();
    const p = tmp2.copy(pin.p.position).applyQuaternion(tiltQ);
    view({ radius: 1.35, yaw: Math.atan2(tmp.x, tmp.z), pitch: 0.04, target: [p.x * 0.8 + sunDir.x * 0.5, p.y * 0.8, p.z * 0.8 + sunDir.z * 0.5] }, instant);
  }

  function setLab(alt) {
    st.alt = alt;
    const a = alt * D2R, dx = -Math.cos(a), dy = Math.sin(a);
    tmp.set(dx, dy, 0);
    labBeam.quaternion.setFromUnitVectors(Y, tmp);
    labBeam.position.set(dx * 3, dy * 3, 0);
    lamp.quaternion.copy(labBeam.quaternion);
    lamp.position.set(dx * 6.1, dy * 6.1, 0);
    patch.scale.set(1 / Math.sin(a), 1, 1);
    patchMat.color.setRGB(0.35 + 0.65 * Math.sin(a), 0.33 + 0.6 * Math.sin(a), 0.12 + 0.45 * Math.sin(a));
    beamTag.at.set(dx * 2.4, dy * 2.4 + 0.3, 0);
  }

  function readout() {
    if (st.quiz) return;
    const dec = declOf(st.day), decDeg = dec / D2R, dt = dateOf(st.day);
    const overhead = `${Math.abs(decDeg).toFixed(1)}° ${decDeg >= 0 ? 'N' : 'S'}`;
    if (st.step === 0) {
      ui.readout(`Date: <b>${dt}</b>. The axis still points the same way; it is tilted <b>23.4°</b>.`);
    } else if (st.step === 1) {
      const north = decDeg > 1 ? 'tilted <b>toward</b> the Sun' : decDeg < -1 ? 'tilted <b>away from</b> the Sun' : 'tilted neither toward nor away from the Sun';
      ui.readout(`Date: <b>${dt}</b>. The northern half is ${north}.<br>The Sun is straight overhead at noon at latitude <b>${overhead}</b>.`);
    } else if (st.step === 2) {
      const h = noonAlt(st.lat, dec);
      ui.readout(h > 0
        ? `${dt}, latitude ${latText(st.lat)}: Sun overhead at ${overhead}.<br>Noon Sun height = 90° − |${st.lat}° − (${decDeg.toFixed(1)}°)| = <b>${h.toFixed(1)}°</b>`
        : `${dt}, latitude ${latText(st.lat)}: the Sun stays <b>below the horizon</b> all day (polar night).`);
    } else if (st.step === 3) {
      const h = dayHours(st.lat, dec);
      ui.readout(`${dt}, latitude ${latText(st.lat)}:<br>Daylight <b>${h >= 24 ? '24 h (the Sun never sets)' : h <= 0 ? '0 h (the Sun never rises)' : 'about ' + hm(h)}</b> · night ${h >= 24 || h <= 0 ? (h >= 24 ? '0 h' : '24 h') : 'about ' + hm(24 - h)}`);
    } else if (st.step === 4) {
      const s = Math.sin(st.alt * D2R);
      ui.readout(`Sun height <b>${st.alt}°</b>: the beam covers about <b>${(1 / s).toFixed(1)}</b> squares,<br>so each square gets about <b>${Math.round(s * 100)}%</b> of the sunlight it gets with the Sun overhead.`);
    } else if (st.step === 5) {
      const n = seasonNorth(st.day);
      ui.readout(`Date: <b>${dt}</b>. Distance to the Sun: about <b>${distKm(st.day).toFixed(1)} million km</b>.<br>Season: <b>${n}</b> in the north, <b>${opposite[n]}</b> in the south.`);
    } else if (st.step === 6) {
      const row = l => `<b>${latText(l)}</b>: noon Sun ${Math.max(0, noonAlt(l, dec)).toFixed(0)}° high, daylight about ${hm(dayHours(l, dec))}`;
      ui.readout(`${dt}<br>${row(40)}<br>${row(-40)}`);
    }
  }

  const monthSlider = (onMove) => ui.slider({ label: 'Date', min: 1, max: 365, step: 1, value: Math.round(st.day), format: dateOf,
    onInput: v => { st.day = v; refresh(); readout(); onMove?.(); } });
  const latSlider = (onMove) => ui.slider({ label: 'Latitude', min: -80, max: 80, step: 1, value: st.lat, format: latText,
    onInput: v => { st.lat = v; refresh(); readout(); onMove?.(); } });

  function show(parts) {
    const on = k => parts.includes(k);
    orbitPath.visible = on('orbit');
    for (const gh of ghosts) { gh.g.visible = on('ghosts'); gh.tag.show(on('ghosts')); }
    axisTag.show(on('axis'));
    earthTag.show(on('earthTag'));
    sunTag.show(on('sunTag'));
    ring.mesh.visible = on('ring'); ring2.mesh.visible = on('ring2');
    pin.p.visible = on('pin'); pin2.p.visible = on('pin2');
    pinTag.show(on('pin')); pin2Tag.show(on('pin2'));
    pinTag.text = on('pin2') ? '40° N' : 'Your place';
    pin.showArc = on('arc'); pin2.showArc = false;
    angleTag.show(on('arc'));
    town.visible = on('town');
    spot.visible = on('spot'); spotTag.show(on('spot'));
    peri.visible = aph.visible = on('peri'); periTag.show(on('peri')); aphTag.show(on('peri'));
    lab.visible = on('lab'); world.visible = !on('lab');
    patchTag.show(on('lab')); beamTag.show(on('lab'));
  }

  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz; st.play = 0;
      if (i === 0) {
        st.fTo = 0; st.play = 40;
        show(['orbit', 'ghosts', 'sunTag']);
        view({ radius: 10.5, yaw: 0.35, pitch: 0.55, target: [0, 0, 0] }, instant);
        ui.buttons([{ label: 'Play', on: true, onClick: () => { st.play = 40; } }, { label: 'Pause', onClick: () => { st.play = 0; } }]);
      }
      if (i === 1) {
        st.fTo = 1; st.day = 172;
        show(['axis', 'spot']);
        refresh();
        sideView(instant, 2.0, 0.2);
        monthSlider(() => sideView(true, 2.0, 0.2));
      }
      if (i === 2) {
        st.fTo = 1; st.day = 172; st.lat = 40;
        show(['pin', 'arc']);
        refresh();
        pinView(instant);
        monthSlider(() => pinView(true));
        latSlider(() => pinView(true));
      }
      if (i === 3) {
        st.fTo = 1; st.day = 172; st.lat = 52;
        show(['ring', 'town', 'axis']);
        refresh();
        sideView(instant, 2.0, 0.35);
        monthSlider(() => sideView(true, 2.0, 0.35));
        latSlider();
      }
      if (i === 4) {
        show(['lab']);
        setLab(60);
        view({ radius: 3.4, yaw: 0.55, pitch: 0.5, target: [-0.6, 0.9, 0] }, instant);
        ui.slider({ label: 'Sun height', min: 10, max: 90, step: 1, value: 60, unit: '°', onInput: v => { setLab(v); readout(); } });
      }
      if (i === 5) {
        st.fTo = 0; st.day = 3;
        show(['orbit', 'peri', 'sunTag']);
        refresh();
        view({ radius: 10.5, yaw: 0.2, pitch: 1.0, target: [0, 0, 0] }, instant);
        monthSlider();
      }
      if (i === 6) {
        st.fTo = 1; st.day = 172; st.lat = 40;
        show(['ring', 'ring2', 'pin', 'pin2', 'axis']);
        refresh();
        sideView(instant, 2.3, 0.15);
        const pick = d => () => { st.day = d; refresh(); sideView(false, 2.3, 0.15); readout(); };
        ui.buttons([{ label: 'June solstice', on: true, onClick: pick(172) }, { label: 'March equinox', onClick: pick(79) }, { label: 'December solstice', onClick: pick(355) }]);
      }
      if (isQuiz) {
        st.fTo = 0; st.play = 25;
        show(['orbit', 'ghosts']);
        view({ radius: 10.5, yaw: -0.4, pitch: 0.6, target: [0, 0, 0] }, instant);
      }
      if (instant) st.f = st.fTo;
      refresh();
      readout();
    },
    update(dt) {
      if (st.play) {
        st.day = ((st.day - 1 + st.play * dt) % 365) + 1; refresh();
        if (st.step === 0 && Math.round(st.day) !== st.shown) { st.shown = Math.round(st.day); readout(); }
      }
      kit.follow(st, 'f', st.fTo, dt, 4);
      world.position.copy(earth.g.position).multiplyScalar(-st.f);
      earth.globe.rotation.y += dt * 0.8;
      return true;
    },
  };
}

// A thin tube around the globe at one latitude. set(lat, sunLocal) moves it and colours the part
// in daylight yellow and the part in night blue (sunLocal = direction to the Sun in the globe's tilted frame).
function latitudeRing(THREE) {
  const N = 120, M = 6, R = 1.015, T = 0.03;
  const pos = new Float32Array(N * M * 3), col = new Float32Array(N * M * 3), idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = i * M + j, b = ((i + 1) % N) * M + j, c = ((i + 1) % N) * M + ((j + 1) % M), d = i * M + ((j + 1) % M);
    idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true }));
  mesh.frustumCulled = false;
  const day = [1, 0.82, 0.2], night = [0.15, 0.3, 0.85];
  return {
    mesh,
    set(lat, s) {
      const p = (lat * Math.PI) / 180, cp = Math.cos(p), sp = Math.sin(p);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const nx = cp * sa, ny = sp, nz = cp * ca;              // outward direction at this point
        const lit = nx * s.x + ny * s.y + nz * s.z > 0;
        for (let j = 0; j < M; j++) {
          const v = (j / M) * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
          // tube cross-section in the plane of the outward direction and the local north direction
          const ex = -sp * sa, ey = cp, ez = -sp * ca;
          const k = (i * M + j) * 3;
          pos[k] = nx * R + (nx * cv + ex * sv) * T;
          pos[k + 1] = ny * R + (ny * cv + ey * sv) * T;
          pos[k + 2] = nz * R + (nz * cv + ez * sv) * T;
          const c = lit ? day : night;
          col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
        }
      }
      g.attributes.position.needsUpdate = true;
      g.attributes.color.needsUpdate = true;
    },
  };
}

// Earth map with clear continents-like patches (deterministic).
function paintEarth(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2f7fd6'; g.fillRect(0, 0, 512, 256);
  const r = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  g.fillStyle = '#5bb04d';
  for (let i = 0; i < 30; i++) {
    const x = r(i) * 512, y = 45 + r(i + 7) * 166, rr = 12 + r(i + 3) * 30;
    g.beginPath(); g.ellipse(x, y, rr * 1.4, rr, r(i + 5) * 3, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 512, 16); g.fillRect(0, 240, 512, 16);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Light ground with a grid of squares the size of the beam (1 x 1).
function gridTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 448; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#d9c9a3'; g.fillRect(0, 0, 448, 320);
  g.strokeStyle = 'rgba(80,60,30,0.45)'; g.lineWidth = 2;
  // 7 x 5 squares on the 7 x 5 ground, so one square lines up with the beam's straight-down patch
  for (let x = 0; x <= 7; x++) { g.beginPath(); g.moveTo(x * 64, 0); g.lineTo(x * 64, 320); g.stroke(); }
  for (let y = 0; y <= 5; y++) { g.beginPath(); g.moveTo(0, y * 64); g.lineTo(448, y * 64); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
