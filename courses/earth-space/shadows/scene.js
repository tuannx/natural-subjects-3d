// Shadows during the day: the Sun crosses the sky over a playground (east = +x, south = +z),
// and real shadow maps show long morning shadows, short midday shadows and long evening shadows.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const LAT = 35 * Math.PI / 180; // a mid-latitude town; the Sun's path is drawn for a spring or autumn day
const DOME = 7.5;               // how far away the Sun is drawn (the light itself is directional)
const STICK = 1.5;              // stick height in metres

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const { clamp } = kit;
  const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

  // Sky, grass and lights.
  const skyDay = new THREE.Color(0x9fd3ff), skyLow = new THREE.Color(0xffc79a), skyCloud = new THREE.Color(0xc4ccd4);
  const ground = kit.stage(scene, { ground: 0x9bd07f, sky: 0x9fd3ff, radius: 8.5 });
  ground.receiveShadow = true;
  const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x6f8a5a, 1.1);
  scene.add(hemi);
  const light = new THREE.DirectionalLight(0xffffff, 3.2);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, { left: -8.5, right: 8.5, top: 8.5, bottom: -8.5, near: 1, far: 45 });
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
  scene.add(light, light.target);

  // The Sun in the sky, its path across the sky, and a cloud that can cover it.
  const sun = new THREE.Group();
  scene.add(sun);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 12), sunMat));
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 12), new THREE.MeshBasicMaterial({ color: 0xffc53d, transparent: true, opacity: 0.3, depthWrite: false })));
  label('Sun', sun, { cls: 'big warm' });
  const arcPts = [];
  for (let h = 6; h <= 18.001; h += 0.25) arcPts.push(sunDir(h, new THREE.Vector3()).multiplyScalar(DOME));
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.8 }));
  arc.computeLineDistances();
  scene.add(arc);
  const cloud = new THREE.Group();
  scene.add(cloud);
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x8c949c, transparent: true, opacity: 0 });
  const puffs = [[0, 0, 0, 1.1], [1.0, -0.2, 0.2, 0.8], [-1.0, -0.25, 0.1, 0.75], [0.4, 0.45, 0, 0.7]];
  cloud.add(new THREE.Mesh(mergeGeometries(puffs.map(([x, y, z, r]) => new THREE.SphereGeometry(r, 16, 10).translate(x, y, z))), cloudMat));

  // Playground: a stick with a red ball on top, a child, a tree, a wooden board and a glass window.
  const stick = new THREE.Group();
  scene.add(stick);
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.07, STICK, 10).translate(0, STICK / 2, 0), kit.mat(0x8a5a2b), [0, 0, 0], stick);
  kit.mesh(new THREE.SphereGeometry(0.11, 16, 8), kit.mat(0xe63946), [0, STICK, 0], stick);
  const stickTop = new THREE.Vector3(0, STICK, 0);

  const child = new THREE.Group();
  child.position.set(-1.9, 0, 0.9);
  child.rotation.y = 0.5;
  child.scale.setScalar(1.1);
  scene.add(child);
  const C = (r, h, x, y) => new THREE.CylinderGeometry(r, r, h, 10).translate(x, y, 0);
  kit.mesh(mergeGeometries([C(0.07, 0.6, -0.1, 0.3), C(0.07, 0.6, 0.1, 0.3)]), kit.mat(0x2b4c7e), [0, 0, 0], child);
  const arms = [C(0.05, 0.5, -0.28, 0.85), C(0.05, 0.5, 0.28, 0.85)];
  kit.mesh(mergeGeometries([new THREE.CapsuleGeometry(0.2, 0.32, 4, 12).translate(0, 0.85, 0), ...arms]), kit.mat(0xf4a261), [0, 0, 0], child);
  kit.mesh(new THREE.SphereGeometry(0.17, 20, 12), kit.mat(0xc68863), [0, 1.27, 0], child);
  kit.mesh(new THREE.SphereGeometry(0.18, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0x3b2a20), [0, 1.3, 0], child);

  const tree = new THREE.Group();
  tree.position.set(-2.5, 0, -2.1);
  scene.add(tree);
  kit.mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.8, 10).translate(0, 0.9, 0), kit.mat(0x7a5232), [0, 0, 0], tree);
  const blobs = [[0, 2.3, 0, 0.95], [0.6, 2.0, 0.2, 0.7], [-0.55, 2.05, -0.1, 0.72], [0.1, 2.9, -0.1, 0.65]];
  kit.mesh(mergeGeometries(blobs.map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 1).translate(x, y, z))), kit.mat(0x3f9b3a, { flatShading: true }), [0, 0, 0], tree);

  // Board and window face south, side by side.
  const wood = kit.mat(0xb07a45);
  const board = kit.mesh(new THREE.BoxGeometry(1.0, 1.3, 0.06).translate(0, 0.65, 0), wood, [1.6, 0, 2.3], scene);
  const frameParts = [[0, 1.27, 1.06, 0.06], [0, 0.03, 1.06, 0.06], [-0.5, 0.65, 0.06, 1.3], [0.5, 0.65, 0.06, 1.3]];
  const win = new THREE.Group();
  win.position.set(3.0, 0, 2.3);
  scene.add(win);
  kit.mesh(mergeGeometries(frameParts.map(([x, y, w, h]) => new THREE.BoxGeometry(w, h, 0.08).translate(x, y, 0))), wood, [0, 0, 0], win);
  const glass = kit.mesh(new THREE.BoxGeometry(0.94, 1.18, 0.02).translate(0, 0.65, 0), new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }), [0, 0, 0], win);
  glass.castShadow = false; // clear glass lets almost all the light through
  const panels = [board, win];

  // The ray of light past the top of the stick, the shadow's tip, and hourly tip dots.
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffb703 }));
  scene.add(ray);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xe63946 });
  const tipGeo = new THREE.CircleGeometry(0.1, 20).rotateX(-Math.PI / 2);
  const tipDot = new THREE.Mesh(tipGeo, tipMat);
  scene.add(tipDot);
  const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const dots = new THREE.InstancedMesh(tipGeo, tipMat, HOURS.length);
  scene.add(dots);
  const dir = new THREE.Vector3(), tip = new THREE.Vector3(), m4 = new THREE.Matrix4();
  HOURS.forEach((h, i) => { shadowTip(sunDir(h, dir), tip); m4.makeTranslation(tip.x, 0.012 + i * 0.001, tip.z); dots.setMatrixAt(i, m4); });

  // Labels.
  const tags = {
    stick: label('Stick', stickTop),
    shadow: label('Shadow', new THREE.Vector3()),
    child: label('Child', new THREE.Vector3(-1.9, 1.75, 0.9)),
    tree: label('Tree', new THREE.Vector3(-2.5, 3.5, -2.1)),
    wood: label('Wood', new THREE.Vector3(1.6, 1.4, 2.3)),
    glass: label('Glass', new THREE.Vector3(3.0, 1.4, 2.3), { cls: 'cool' }),
    east: label('East', new THREE.Vector3(6.3, 0.2, 0), { cls: 'big' }),
    west: label('West', new THREE.Vector3(-6.3, 0.2, 0), { cls: 'big' }),
  };
  const showTags = names => { for (const [n, l] of Object.entries(tags)) l.show(names.includes(n)); };

  const st = { step: 0, hour: 10, sunny: true, cloud: 0, play: false, auto: null, slider: null, quiz: false, tipShadow: false };

  // Where the stick's shadow ends for a Sun direction (light comes in straight lines past the top).
  function shadowTip(d, out) {
    const up = Math.max(d.y, 0.03);
    return out.set(-d.x * STICK / up, 0, -d.z * STICK / up);
  }

  const fmt = h => {
    const hh = Math.floor(h + 1e-6), mm = Math.round((h - hh) * 60 / 15) * 15;
    const H = hh + (mm === 60 ? 1 : 0), M = mm === 60 ? 0 : mm;
    const ap = H < 12 ? 'am' : 'pm', h12 = ((H + 11) % 12) + 1;
    return `${h12}:${String(M).padStart(2, '0')} ${ap}`;
  };
  const part = h => (h < 6.5 ? 'sunrise' : h < 11 ? 'morning' : h <= 13 ? 'midday' : h < 17.5 ? 'afternoon' : 'sunset');

  function report() {
    if (st.quiz) return;
    sunDir(st.hour, dir);
    shadowTip(dir, tip);
    const len = tip.length();
    const where = dir.x > 0.15 ? 'west, away from the Sun in the east' : dir.x < -0.15 ? 'east, away from the Sun in the west' : 'away from the Sun';
    const size = dir.y < 0.06 ? 'super long' : len > STICK * 2 ? 'long' : len > STICK * 1.1 ? 'medium' : 'short';
    let html = `<b>${fmt(st.hour)}</b> (${part(st.hour)}). `;
    if (!st.sunny) html += 'A cloud covers the Sun: <b>hardly any shadows</b>.';
    else if (dir.y < 0.06) html += 'The Sun is on the horizon: shadows are <b>super long</b>.';
    else html += `The stick is 1.5 m tall. Its shadow is <b>${len.toFixed(1)} m</b> (${size}), pointing ${where}.`;
    ui.readout(html);
  }

  function setSlider(v) {
    if (!st.slider) return;
    st.slider.value = v;
    st.slider.parentElement.querySelector('output').textContent = fmt(v);
  }
  const timeSlider = () => {
    st.slider = ui.slider({ label: 'Time of day', min: 6, max: 18, step: 0.25, value: st.hour, format: fmt,
      onInput: v => { st.hour = v; st.auto = null; st.play = false; report(); } });
  };

  // Put the Sun, light, ray and tip marker where the time of day says.
  const yAxis = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  function place() {
    sunDir(st.hour, dir);
    sun.position.copy(dir).multiplyScalar(DOME);
    light.position.copy(dir).multiplyScalar(20);
    const up = dir.y, day = smooth(0, 0.18, up);
    light.intensity = 3.2 * day * (1 - 0.92 * st.cloud);
    light.color.setHSL(0.1, 1, 0.5 + 0.5 * smooth(0, 0.35, up));
    hemi.intensity = 0.5 + 0.4 * day + 0.7 * st.cloud;
    c.copy(skyLow).lerp(skyDay, smooth(0.02, 0.3, up)).lerp(skyCloud, st.cloud);
    scene.background.copy(c);
    sunMat.color.setHSL(0.11, 1, 0.55 + 0.1 * day);

    cloud.position.copy(dir).multiplyScalar(DOME - 1.6);
    cloud.lookAt(0, 0, 0);
    cloudMat.opacity = st.cloud;
    cloud.visible = st.cloud > 0.01;

    shadowTip(dir, tip);
    tipDot.position.set(tip.x, 0.015, tip.z);
    tags.shadow.at.set(tip.x * 0.45, 0.05, tip.z * 0.45);
    // The ray runs from the tip of the shadow, past the top of the stick, back toward the Sun.
    ray.position.copy(tip);
    const toTop = stickTop.clone().sub(tip);
    ray.quaternion.setFromUnitVectors(yAxis, toTop.clone().normalize());
    ray.scale.y = toTop.length() + 4;
  }

  return {
    step(i, { isQuiz, instant }) {
      Object.assign(st, { step: i, quiz: isQuiz, sunny: true, play: false, auto: null, slider: null });
      const show = (o, v) => { o.visible = v; };
      panels.forEach(p => show(p, i === 2));
      show(ray, i === 1); show(tipDot, i === 1 || i === 3 || i === 4); show(dots, i === 5); show(arc, i >= 3);
      st.dotsShown = 0;
      if (i === 0) {
        st.hour = 9;
        view({ radius: 3.9, yaw: 0.5, pitch: 0.55, target: [0, 0.9, -0.4] }, instant);
        showTags(['stick', 'child', 'tree', 'shadow']);
        ui.toggle({ label: 'Sunny day', value: true, onChange: v => { st.sunny = v; report(); } });
      }
      if (i === 1) {
        st.hour = 15;
        view({ radius: 2.6, yaw: -0.35, pitch: 0.3, target: [0.5, 1.0, -0.4] }, instant);
        showTags(['stick', 'shadow']);
        timeSlider();
      }
      if (i === 2) {
        st.hour = 12.5;
        view({ radius: 1.9, yaw: Math.PI - 0.5, pitch: 0.6, target: [2.3, 0.4, 1.8] }, instant);
        showTags(['wood', 'glass']);
        timeSlider();
      }
      if (i === 3) {
        st.hour = 6.25; st.auto = { to: 10, rate: 0.45 };
        view({ radius: 5.6, yaw: 0.3, pitch: 0.42, target: [0.8, 1.3, 0] }, instant);
        showTags(['east', 'west', 'stick', 'child']);
        timeSlider();
      }
      if (i === 4) {
        st.hour = 12;
        view({ radius: 5.0, yaw: Math.PI - 0.35, pitch: 0.2, target: [0, 2.6, 1.6] }, instant);
        showTags(['stick', 'shadow']);
        timeSlider();
      }
      if (i === 5) {
        st.hour = 6.5; st.play = true;
        view({ radius: 5.6, yaw: 0.0, pitch: 0.95, target: [0, 0.6, -0.4] }, instant);
        showTags(['east', 'west', 'stick']);
        ui.buttons([{ label: 'Play the day', onClick: () => { st.play = true; st.hour = 6.5; } }, { label: 'Pause', onClick: () => { st.play = false; } }]);
        timeSlider();
      }
      if (isQuiz) {
        st.hour = 16;
        view({ radius: 5.2, yaw: 0.6, pitch: 0.45, target: [0, 0.9, -0.3] }, instant);
        showTags([]);
      }
      if (instant) st.cloud = st.sunny ? 0 : 1;
      place();
      report();
    },
    update(dt) {
      let busy = kit.follow(st, 'cloud', st.sunny ? 0 : 1, dt, 3);
      if (st.auto) {
        st.hour = Math.min(st.auto.to, st.hour + st.auto.rate * dt);
        if (st.hour >= st.auto.to) st.auto = null;
        busy = true;
      }
      if (st.play) {
        st.hour += 1.1 * dt;
        if (st.hour > 17.75) st.hour = 6.5;
        busy = true;
      }
      if (st.step === 5) dots.count = HOURS.filter(h => h <= st.hour + 1e-6).length;
      if (busy) {
        place();
        if (st.auto || st.play) { setSlider(st.hour); report(); }
      }
      return busy;
    },
  };
}

// Direction toward the Sun at hour h (sun time) on a spring or autumn day: up = +y, east = +x, south = +z.
// Rises due east at 6, highest in the south at 12, sets due west at 18.
function sunDir(h, out) {
  const H = (h - 12) * 15 * Math.PI / 180;
  return out.set(-Math.sin(H), Math.cos(H) * Math.cos(LAT), Math.cos(H) * Math.sin(LAT)).normalize();
}
