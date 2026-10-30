// Moon phases: the Sun always lights one half of the Moon. As the Moon goes around the Earth we see
// more or less of that lit half. A small window (the whole view in the last step) shows the Moon from Earth.
const MONTH = 29.53; // days from one new moon to the next
const R = 5;         // Moon's distance from Earth in this model (the real Moon is much farther away)
const TILT = 0.3;    // tilt of the Moon's path: really about 5 degrees, made bigger here so it shows
const MOON_R = 0.34;
const PHASES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];

// Camera views (see k.view): one per step, so every step looks different.
const WIDE = { radius: 8.4, yaw: 0.35, pitch: 0.5, target: [-3.4, 0, 0] };
const CLOSE = { radius: 1, yaw: -0.6, pitch: 0.12, target: [0, 0, R] }; // the Moon at first quarter
const TOP = { radius: 6.8, yaw: 0, pitch: 1.25, target: [-0.9, 0, 0] };
const TILTED = { radius: 6, yaw: 0.5, pitch: 0.75, target: [0, 0, 0] };
const SIDE = { radius: 5.4, yaw: 0.6, pitch: 0.32, target: [2.4, 0.2, 0] };

export default function setup({ THREE, scene, camera, controls, kit, ui, label, view }) {
  scene.background = new THREE.Color(0x0b1430);
  const amb = new THREE.AmbientLight(0x6070a0, 0.12);
  const light = new THREE.DirectionalLight(0xffffff, 3.2); // sunlight: parallel rays from the left (-x)
  light.position.set(-11, 0, 0);
  scene.add(amb, light);
  const seen = o => o.traverse(c => c.layers.enable(1)); // layer 1 = what the "from Earth" camera sees
  seen(amb); seen(light);

  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
  sun.position.set(-11, 0, 0);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: paintGlow(THREE), blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(6);
  sun.add(glow);
  scene.add(sun); seen(sun);

  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.2, 48, 24), new THREE.MeshStandardMaterial({ map: paintEarth(THREE), roughness: 0.9 }));
  scene.add(earth);

  // The Moon's path: tilt group (tips the path) > pivot (turns with the days) > Moon.
  // Being a child of the pivot keeps the same face of the Moon toward the Earth, like the real Moon.
  const tilt = new THREE.Group();
  tilt.rotation.z = TILT;
  scene.add(tilt);
  const pivot = new THREE.Group();
  tilt.add(pivot);
  const moonMat = new THREE.MeshStandardMaterial({ map: paintMoon(THREE), roughness: 1 });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(MOON_R, 48, 24), moonMat);
  moon.position.x = R;
  pivot.add(moon); seen(moon);

  const ringPts = [];
  for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; ringPts.push(new THREE.Vector3(R * Math.cos(a), 0, R * Math.sin(a))); }
  tilt.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineBasicMaterial({ color: 0x5f78b0 })));

  // Eight dots on the path, one for each named phase (one draw call).
  const marks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a }), 8);
  const m4 = new THREE.Matrix4();
  for (let k = 0; k < 8; k++) { const a = angleOf((k / 8) * MONTH); marks.setMatrixAt(k, m4.makeTranslation(R * Math.cos(a), 0, -R * Math.sin(a))); }
  tilt.add(marks);

  // Flat yellow arrows for the sunlight, lying in the plane of the path.
  const rays = new THREE.Mesh(new THREE.ShapeGeometry([-2.6, 0, 2.6].map(z => arrowShape(THREE, -8.6, -6.3, z))),
    new THREE.MeshBasicMaterial({ color: 0xffd34d, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  rays.rotation.x = -Math.PI / 2;
  scene.add(rays);

  // Earth's shadow: a long dark cone pointing away from the Sun, with a light outline.
  const shadow = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.2, 6.5, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  cone.rotation.z = -Math.PI / 2;
  cone.position.x = 3.25;
  shadow.add(cone);
  const edge = [];
  for (let k = 0; k < 48; k++) { // ring at the far end of the shadow
    const a = (k / 48) * Math.PI * 2, b = ((k + 1) / 48) * Math.PI * 2;
    edge.push(6.5, 0.85 * Math.cos(a), 0.85 * Math.sin(a), 6.5, 0.85 * Math.cos(b), 0.85 * Math.sin(b));
  }
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.Float32BufferAttribute(edge, 3));
  shadow.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x8796c8 })));
  scene.add(shadow);

  // Stars.
  const pts = [];
  for (let i = 0; i < 500; i++) {
    const v = new THREE.Vector3(rand(i) - 0.5, rand(i + 71) - 0.5, rand(i + 293) - 0.5).normalize().multiplyScalar(70);
    pts.push(v.x, v.y, v.z);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18 }));
  scene.add(stars); seen(stars);

  const tags = {
    sun: label('Sun', sun, { cls: 'big warm' }),
    earth: label('Earth', new THREE.Vector3(0, 1.2, 0), { cls: 'cool' }),
    moon: label('Moon', moon),
    rays: label('Sunlight', new THREE.Vector3(-7.4, 0, -2.6), { cls: 'warm' }),
    lit: label('Sunlit half', new THREE.Vector3(-0.62, 0.15, R), { cls: 'warm' }),
    dark: label('Dark half', new THREE.Vector3(0.62, -0.6, R)),
    shadow: label("Earth's shadow", new THREE.Vector3(4.2, -0.9, 0)),
  };

  // "Seen from Earth": a second camera at the centre of the Earth looking at the Moon. It is drawn
  // into a corner of the canvas right after the main picture, so screenshots and videos include it.
  const eye = new THREE.PerspectiveCamera(11, 1, 0.1, 200);
  eye.layers.set(1);
  const cap = document.createElement('div');
  cap.className = 'lab cool';
  document.querySelector('.labels').append(cap);
  const els = { bar: document.querySelector('.bar'), nav: document.querySelector('.steps'), card: document.getElementById('card') };
  const mp = new THREE.Vector3(), clear = new THREE.Color();
  let inset = 'off'; // 'off' | 'corner' | 'full'

  // Same free area as the engine's framing (lib/primary/ui.js freeRect); hidden parts take no room.
  function insetRect() {
    const W = innerWidth, H = innerHeight, rect = el => { const r = el.getBoundingClientRect(); return r.height ? r : null; };
    const b = rect(els.bar), n = rect(els.nav), c = rect(els.card);
    const t = b ? b.bottom + 8 : 8, bottom = n ? n.top - 8 : H - 8;
    const f = !c ? { l: 8, r: W - 8, t, b: bottom } : W > 760 ? { l: c.right + 8, r: W - 8, t, b: bottom } : { l: 8, r: W - 8, t, b: Math.min(c.top - 8, bottom) };
    if (inset === 'full') return { x: f.l + 4, y: f.t + 4, w: f.r - f.l - 8, h: f.b - f.t - 8 };
    const s = Math.round(kit.clamp(Math.min(f.r - f.l, f.b - f.t) * 0.36, 100, 200));
    return { x: f.r - s - 4, y: f.t + 4, w: s, h: s };
  }

  scene.onAfterRender = (r, s, cam) => {
    if (cam !== camera || inset === 'off') return; // also stops the inner render from recursing
    const { x, y, w, h } = insetRect(), gy = innerHeight - y - h; // GL counts y from the bottom
    r.getClearColor(clear);
    const alpha = r.getClearAlpha();
    r.setScissorTest(true);
    r.setScissor(x - 3, gy - 3, w + 6, h + 6);
    r.setClearColor(0xcfe0ff, 1);
    r.clear(true, true, false); // light frame
    r.setClearColor(clear, alpha);
    r.setViewport(x, gy, w, h);
    r.setScissor(x, gy, w, h);
    eye.aspect = w / h;
    eye.fov = inset === 'full' ? 17 : 11;
    eye.updateProjectionMatrix();
    moon.getWorldPosition(mp);
    eye.position.set(0, 0, 0);
    eye.lookAt(mp); // up stays +y: north of the Moon's path is up, as seen from the northern half of the world
    r.render(s, eye);
    r.setScissorTest(false);
    r.setViewport(0, 0, innerWidth, innerHeight);
    cap.style.transform = inset === 'full' ? `translate(${x + w / 2}px,${y + h - 12}px) translate(-50%,-100%)` : `translate(${x + w / 2}px,${y + 6}px) translate(-50%,0)`;
  };

  const st = { day: 3, speed: 0, stopAt: null, eclipse: false, named: false, quiz: false, step: 0 };
  let slider = null, syncing = false, lastReadout = '';
  const white = new THREE.Color(0xffffff), red = new THREE.Color(0x8a3a22);

  function dayControls(playSpeed) {
    slider = ui.slider({
      label: 'Day', min: 0, max: 29.5, step: 0.5, value: Math.round(st.day * 2) / 2, format: v => `${v} of 29.5`,
      onInput: v => { if (!syncing) { st.day = v; st.speed = 0; st.stopAt = null; } },
    });
    ui.buttons([{ label: 'Play', onClick: () => { st.speed = playSpeed; st.stopAt = null; } }, { label: 'Pause', onClick: () => { st.speed = 0; } }]);
  }
  // Move the slider along while the Moon plays (input.set when the engine has it, else fire an input event).
  function syncSlider() {
    if (!slider) return;
    const v = String(Math.round(st.day * 2) / 2);
    if (slider.value === v) return;
    syncing = true;
    if (slider.set) slider.set(v); else { slider.value = v; slider.dispatchEvent(new Event('input')); }
    syncing = false;
  }

  function show(dark) {
    const p = st.day / MONTH, name = phaseName(p), lit = Math.round(((1 - Math.cos(p * Math.PI * 2)) / 2) * 100);
    tags.moon.text = st.named ? name : 'Moon';
    cap.textContent = inset === 'full' ? `From Earth: ${name.toLowerCase()}` : 'Seen from Earth';
    if (st.quiz) return;
    let html = '';
    if (st.step === 0) html = 'Sunlight shines from the <b>Sun</b> across to the Earth and the Moon.';
    else if (st.step === 1) html = 'The <b>sunlit half</b> always faces the Sun.';
    else {
      html = `<b>${name}</b>: we see ${lit}% of the Moon's face lit.`;
      if (dark > 0.5) html = '<b>Lunar eclipse!</b> The full moon is inside Earth\'s shadow.';
      else if (name === 'New moon') html += ' It is up in the daytime, next to the bright Sun, so we cannot see it.';
    }
    if (html !== lastReadout) { lastReadout = html; ui.readout(html); }
  }

  function showTags(list) { for (const [k, t] of Object.entries(tags)) t.show(list.includes(k)); }
  controls.addEventListener('start', () => { controls.autoRotate = false; }); // a drag stops the fly-around

  return {
    step(i, { isQuiz, instant }) {
      Object.assign(st, { speed: 0, stopAt: null, eclipse: false, named: !(i < 2), quiz: isQuiz, step: i });
      slider = null; lastReadout = '';
      controls.autoRotate = false;
      marks.visible = i === 3;
      shadow.visible = i === 4;
      rays.visible = !(i === 1 || i === 4 || i === 5);
      inset = isQuiz || i < 2 ? 'off' : i === 5 ? 'full' : 'corner';
      cap.style.display = inset === 'off' ? 'none' : '';
      if (isQuiz) {
        st.day = 3; st.speed = 1.2; st.named = false;
        rays.visible = true;
        showTags(['sun', 'earth', 'moon']);
        view(WIDE, instant);
      } else if (i === 0) {
        st.day = 4; st.speed = 1;
        showTags(['sun', 'earth', 'moon', 'rays']);
        view(WIDE, instant);
      } else if (i === 1) {
        st.day = MONTH / 4; // first quarter: the Moon sits at (0, 0, R)
        controls.autoRotate = true; controls.autoRotateSpeed = 2.5;
        showTags(['lit', 'dark']);
        view(CLOSE, instant);
      } else if (i === 2) {
        st.day = 3; st.speed = 2;
        showTags(['earth', 'moon', 'rays']);
        view(TOP, instant);
        dayControls(2);
      } else if (i === 3) {
        st.day = MONTH / 4; st.speed = 0;
        showTags(['earth', 'moon', 'rays']);
        view(TILTED, instant);
        dayControls(1.5);
      } else if (i === 4) {
        st.day = MONTH / 2; // full moon
        showTags(['earth', 'moon', 'shadow']);
        view(SIDE, instant);
        dayControls(1.5);
        ui.toggle({ label: 'Line up for an eclipse', value: false, onChange: v => {
          st.eclipse = v;
          if (v) { st.day = 11.5; st.speed = 1.2; st.stopAt = MONTH / 2; }
        } });
      } else if (i === 5) {
        st.day = 1.5; st.speed = 2.5;
        showTags([]);
        view(TILTED, instant);
        dayControls(2.5);
      }
      tilt.rotation.z = TILT;
      syncSlider();
    },
    update(dt) {
      if (st.speed) {
        st.day += st.speed * dt;
        if (st.stopAt != null && st.day >= st.stopAt) { st.day = st.stopAt; st.speed = 0; st.stopAt = null; }
        st.day = ((st.day % MONTH) + MONTH) % MONTH;
        syncSlider();
      }
      kit.follow(tilt.rotation, 'z', st.eclipse ? 0 : TILT, dt, 2.5);
      pivot.rotation.y = angleOf(st.day);
      earth.rotation.y += dt * 0.2;

      // Darken and redden the Moon when it is inside Earth's shadow (only happens in an eclipse).
      moon.getWorldPosition(mp);
      let dark = 0;
      if (mp.x > 0) {
        const r = Math.hypot(mp.y, mp.z), sr = 1.2 - (0.35 * mp.x) / 6.5;
        dark = kit.clamp((sr + MOON_R - r) / (2 * MOON_R), 0, 1);
      }
      moonMat.color.copy(white).lerp(red, dark);
      show(dark);
      return true;
    },
  };
}

// Day 0 = new moon: the Moon sits between the Earth and the Sun (-x). It goes around anticlockwise seen from above.
function angleOf(day) { return Math.PI + (day / MONTH) * Math.PI * 2; }

// Name of the phase for p = fraction of the cycle (0 = new moon). The four main phases get about a day each side.
function phaseName(p) {
  p = ((p % 1) + 1) % 1;
  const day = 1 / MONTH;
  for (let k = 0; k < 4; k++) {
    const d = Math.abs(((p - k / 4 + 1.5) % 1) - 0.5);
    if (d < day) return PHASES[k * 2];
  }
  return PHASES[Math.floor(p * 4) * 2 + 1];
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function arrowShape(THREE, x0, x1, y) {
  const s = new THREE.Shape(), w = 0.13, hw = 0.36, hl = 0.6;
  s.moveTo(x0, y - w); s.lineTo(x1 - hl, y - w); s.lineTo(x1 - hl, y - hw); s.lineTo(x1, y);
  s.lineTo(x1 - hl, y + hw); s.lineTo(x1 - hl, y + w); s.lineTo(x0, y + w);
  return s;
}

function canvasTexture(THREE, paint) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  paint(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function paintMoon(THREE) {
  return canvasTexture(THREE, g => {
    g.fillStyle = '#cdcbc4'; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#9e9c96'; // dark plains
    for (let i = 0; i < 12; i++) {
      const x = rand(i + 500) * 512, y = 50 + rand(i + 520) * 150, r = 18 + rand(i + 540) * 34;
      g.beginPath(); g.ellipse(x, y, r * 1.3, r, rand(i + 560) * 3, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 90; i++) { // craters: a shaded bowl with a bright rim
      const x = rand(i + 600) * 512, y = 10 + rand(i + 700) * 236, r = 2 + rand(i + 800) ** 2 * 14;
      g.fillStyle = '#aeaba4'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e4e1da'; g.lineWidth = Math.max(1, r * 0.25); g.stroke();
    }
  });
}

function paintGlow(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,220,120,1)'); grad.addColorStop(0.3, 'rgba(255,180,60,0.6)'); grad.addColorStop(1, 'rgba(255,150,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function paintEarth(THREE) {
  return canvasTexture(THREE, g => {
    g.fillStyle = '#2f7fd6'; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#5bb04d';
    for (let i = 0; i < 26; i++) {
      const x = rand(i + 40) * 512, y = 50 + rand(i + 47) * 156, r = 14 + rand(i + 43) * 34;
      g.beginPath(); g.ellipse(x, y, r * 1.4, r, rand(i + 45) * 3, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 512, 18); g.fillRect(0, 238, 512, 18);
  });
}
