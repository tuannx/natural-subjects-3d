// The Sun, the stars and gravity: the Sun as a star (Earth to scale beside it), street lamps that look dimmer
// with distance, the Sun pushed away until it looks like any other star, a globe where dropped balls fall toward
// the centre, the northern sky turning around the Pole Star, and the Earth's orbit facing different
// constellations in each season.

const SUN_R = 3;
const NEAR = 270000;                 // the next nearest star is about 270,000 times farther than the Sun
const LOG_NEAR = Math.log10(NEAR);
const DEG = Math.PI / 180;
const SKY = { z: -16, y: 4, s: 0.1 };  // night sky: plane distance, Pole Star height (40 degrees up), units per degree
const LST0 = 10;                     // sidereal time (hours) at 8 pm on a spring evening

const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Northern stars: [right ascension in hours, declination in degrees] (J2000, rounded).
const POLARIS = [2.53, 89.26];
const UMA = [[11.06, 61.75], [11.03, 56.38], [11.9, 53.69], [12.26, 57.03], [12.9, 55.96], [13.4, 54.93], [13.79, 49.31]]; // Dubhe, Merak, Phecda, Megrez, Alioth, Mizar, Alkaid
const UMA_L = [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]];
const UMI = [POLARIS, [17.54, 86.59], [16.77, 82.04], [15.73, 77.79], [14.85, 74.16], [15.35, 71.83], [16.29, 75.76]]; // Polaris, Yildun, eps, zeta, Kochab, Pherkad, eta
const UMI_L = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]];
const CAS = [[0.15, 59.15], [0.68, 56.54], [0.95, 60.72], [1.43, 60.24], [1.91, 63.67]]; // Caph, Schedar, Navi, Ruchbah, Segin
const CAS_L = [[0, 1], [1, 2], [2, 3], [3, 4]];

// Seasonal constellations, drawn flat (x across, y up), for the orbit view.
const SEASONS = [
  { name: 'Winter', con: 'Orion', pts: [[-0.7, 1.3], [0.6, 1.2], [-0.28, 0.1], [0, 0], [0.28, -0.1], [-0.55, -1.2], [0.75, -1.1], [-0.05, 1.75]], lines: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [7, 0], [7, 1]] },
  { name: 'Spring', con: 'Leo', pts: [[0.9, -0.7], [0.8, -0.05], [0.65, 0.45], [0.85, 0.9], [0.5, 1.15], [-0.6, 0.35], [-0.55, -0.35], [-1.3, -0.1]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 7], [7, 6], [6, 0]] },
  { name: 'Summer', con: 'Scorpius', pts: [[1.3, 1.0], [1.25, 0.55], [1.15, 0.15], [0.6, 0.4], [0.2, 0.1], [0, -0.4], [-0.1, -0.9], [-0.5, -1.2], [-1.0, -1.1], [-1.3, -0.7], [-1.1, -0.45]], lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]] },
  { name: 'Autumn', con: 'Pegasus', pts: [[-0.8, 0.8], [0.8, 0.8], [0.8, -0.8], [-0.8, -0.8], [1.3, -0.4], [1.65, 0.1]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5]] },
];
const ORBIT_R = 3.2, CON_R = 6.6, ORBIT_PITCH = 0.75;

export default function setup({ THREE, scene, camera, kit, ui, label, view }) {
  const night = new THREE.Color(0x060b1c);
  scene.background = night;
  const amb = new THREE.AmbientLight(0x8090b0, 0.5);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 4, 8);
  scene.add(key);
  const sunLamp = new THREE.PointLight(0xfff2d6, 4, 0, 0);
  scene.add(sunLamp);

  // Small canvas textures: a soft round dot (stars) and a glow (Sun, lamps).
  const canvasTex = (size, draw) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const radial = stops => (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  };
  const dotTex = canvasTex(64, radial([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.9)'], [0.6, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]));
  const glowTex = canvasTex(128, radial([[0, 'rgba(255,255,255,1)'], [0.15, 'rgba(255,240,200,0.8)'], [0.45, 'rgba(255,190,90,0.25)'], [1, 'rgba(255,160,60,0)']]));
  const glowMat = (color, opacity = 1) => new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

  // Background stars all around (fixed pixel size).
  const starPts = [];
  for (let i = 0; i < 700; i++) {
    const v = new THREE.Vector3(rand(i) - 0.5, rand(i + 99) - 0.5, rand(i + 333) - 0.5).normalize().multiplyScalar(150);
    starPts.push(v.x, v.y, v.z);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPts, 3));
  const starfield = new THREE.Points(starGeo, new THREE.PointsMaterial({ map: dotTex, color: 0xdfe8ff, size: 3, sizeAttenuation: false, transparent: true, depthWrite: false }));
  scene.add(starfield);

  // ---------- The Sun (steps 1 and 3) ----------
  const sunTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#ffb000'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = ['#ffd24a', '#ff9800', '#ffe27a', '#ffa726'][i % 4];
      g.globalAlpha = 0.5;
      g.beginPath(); g.arc(rand(i + 10) * s, rand(i + 20) * s, 1.5 + rand(i + 30) * 3.5, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  });
  sunTex.wrapS = THREE.RepeatWrapping;
  const sunG = new THREE.Group();
  scene.add(sunG);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 32, 24), new THREE.MeshBasicMaterial({ map: sunTex }));
  sunG.add(sunBall);
  const sunGlow = new THREE.Sprite(glowMat(0xffd27a));
  sunGlow.scale.setScalar(SUN_R * 3.6);
  sunG.add(sunGlow);
  const sunDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xfff4d6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(sunDot);
  const tinyEarth = new THREE.Mesh(new THREE.SphereGeometry(SUN_R / 109, 16, 12), new THREE.MeshStandardMaterial({ color: 0x3d8de0, roughness: 0.7 }));
  tinyEarth.position.set(SUN_R + 1.6, 0, 0);
  scene.add(tinyEarth);
  const sunTop = new THREE.Object3D(); sunTop.position.set(0, SUN_R * 0.75, 0); sunG.add(sunTop);
  const sunTag = label('Sun', sunTop, { cls: 'big warm' });
  const earthTag = label('Earth', tinyEarth, { cls: 'cool' });

  // ---------- Street of lamps (step 2) ----------
  const street = new THREE.Group();
  scene.add(street);
  const flat = (w, l, color, x, z, y = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); street.add(m);
    return m;
  };
  flat(60, 140, 0x16251c, 0, -55, -0.01);
  flat(7, 140, 0x2b2f36, 0, -55, 0.0);
  flat(2, 140, 0x4a4d52, -4.5, -55, 0.02);
  flat(2, 140, 0x4a4d52, 4.5, -55, 0.02);
  const dashGeo = new THREE.PlaneGeometry(0.15, 2.2), dashMat = new THREE.MeshBasicMaterial({ color: 0xbfc4c9 });
  for (let i = 0; i < 20; i++) { const d = new THREE.Mesh(dashGeo, dashMat); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.015, 4 - i * 6.5); street.add(d); }
  const houseMat = new THREE.MeshStandardMaterial({ color: 0x1d2433, roughness: 1 });
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1, z = -4 - Math.floor(i / 2) * 13, h = 3 + rand(i + 50) * 3;
    const hs = new THREE.Mesh(new THREE.BoxGeometry(6, h, 8), houseMat);
    hs.position.set(side * 10, h / 2, z); street.add(hs);
    if (rand(i + 60) > 0.35) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), winMat); w.position.set(side * 6.99, h * 0.55, z + 1.5); w.rotation.y = -side * Math.PI / 2; street.add(w); }
  }
  const postMat = new THREE.MeshStandardMaterial({ color: 0x8a939e, roughness: 0.5, metalness: 0.4 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.5, metalness: 0.3 });
  const poolTex = canvasTex(128, radial([[0, 'rgba(255,214,140,0.55)'], [1, 'rgba(255,214,140,0)']]));
  const postGeo = new THREE.CylinderGeometry(0.07, 0.1, 4.2, 8), armGeo = new THREE.BoxGeometry(1.0, 0.08, 0.08), headGeo = new THREE.BoxGeometry(0.5, 0.15, 0.3);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8 });
  function lamp(side, mat) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(postGeo, mat); post.position.y = 2.1; g.add(post);
    const arm = new THREE.Mesh(armGeo, mat); arm.position.set(-side * 0.45, 4.15, 0); g.add(arm);
    const head = new THREE.Mesh(headGeo, headMat); head.position.set(-side * 0.9, 4.05, 0); g.add(head);
    const glow = new THREE.Sprite(glowMat(0xffe2a8)); glow.position.copy(head.position); glow.scale.setScalar(2.6); g.add(glow);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(-side * 0.9, 0.03, 0); g.add(pool);
    g.glow = glow; g.pool = pool; g.head = head;
    street.add(g);
    return g;
  }
  // Brightness of a lamp `d` metres away compared with one 5 m away: light spreads out, so it drops
  // as 1/d^2. The glow also shrinks on screen with distance; the extra fade keeps the far lamps readable.
  const shine = (lp, d) => {
    const b = Math.max(0.2, Math.pow(5 / d, 0.7));
    lp.glow.material.color.setRGB(b, b * 0.9, b * 0.7);
    lp.pool.material.opacity = Math.min(1, 25 / (d * d) + 0.15);
  };
  const row = [];
  for (let i = 0; i < 10; i++) { const lp = lamp(-1, postMat); lp.position.set(-3.6, 0, -5 - i * 10); shine(lp, 5 + i * 10); row.push(lp); }
  const farLamp = lamp(1, redMat);
  const nearTag = label('First lamp', new THREE.Vector3(-4.5, 4.6, -5));
  const farTag = label('Far lamp', new THREE.Object3D());
  farLamp.add(farTag.at); farTag.at.position.set(-0.9, 4.6, 0);
  const st = { step: 0, quiz: false, farD: 40, f: 1, fAuto: true, fSlider: null, drop: 0, pull: false, hour: 20, play: true, tSlider: null, trails: false, season: 0, ang: 0, angTo: 0 };
  function setFar(d) {
    st.farD = d;
    farLamp.position.set(3.6, 0, -d);
    shine(farLamp, d);
    const k = d / 5;
    ui.readout(k <= 1.01 ? 'The far lamp is right next to the first lamp, so they look the same.'
      : `The far lamp is <b>${d} m</b> away, ${fmtNum(k)} times as far as the first lamp. It looks about <b>${fmtNum(k * k)} times dimmer</b>.`);
  }

  // ---------- Globe with people and falling balls (step 4) ----------
  const globe = new THREE.Group();
  scene.add(globe);
  const R = 2;
  const earthMat = new THREE.MeshStandardMaterial({ map: paintEarth(THREE), roughness: 0.9 });
  const earthBall = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), earthMat);
  earthBall.rotation.y = -1.2;
  globe.add(earthBall);
  const PEOPLE = [90, 30, -30, -90, 150, 210];
  const shirt = [0xe63946, 0xf4a261, 0x2a9d8f, 0x8338ec, 0x3a86ff, 0xff006e];
  const skin = new THREE.MeshStandardMaterial({ color: 0xc68642 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x264653 });
  const up = new THREE.Vector3(0, 1, 0);
  const lineMat = new THREE.LineDashedMaterial({ color: 0xffd23f, dashSize: 0.12, gapSize: 0.08, depthTest: false, transparent: true });
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, depthTest: false, transparent: true });
  const people = PEOPLE.map((deg, i) => {
    const a = deg * DEG, n = new THREE.Vector3(Math.cos(a), Math.sin(a), 0), tng = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);
    const g = new THREE.Group();
    g.position.copy(n).multiplyScalar(R);
    g.quaternion.setFromUnitVectors(up, n);
    globe.add(g);
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 8), legMat); legs.position.y = 0.09; g.add(legs);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.2, 8), new THREE.MeshStandardMaterial({ color: shirt[i] })); body.position.y = 0.28; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), skin); head.position.y = 0.45; g.add(head);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.4 }));
    globe.add(ball);
    const dir = n.clone().multiplyScalar(R + 0.42).addScaledVector(tng, -0.2).normalize();
    // Dashed line from the ball's spot to the centre, and an arrow beside the ball pointing to the centre.
    const lg = new THREE.BufferGeometry().setFromPoints([dir.clone().multiplyScalar(R + 0.5), new THREE.Vector3()]);
    const line = new THREE.Line(lg, lineMat); line.computeLineDistances(); line.renderOrder = 9; globe.add(line);
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6), arrowMat); shaft.position.y = 0.11;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 10), arrowMat); tip.position.y = 0.26;
    arrow.add(shaft, tip); arrow.renderOrder = 10; shaft.renderOrder = tip.renderOrder = 10;
    arrow.quaternion.setFromUnitVectors(up, dir.clone().negate());
    arrow.position.copy(dir).multiplyScalar(R + 0.66);
    globe.add(arrow);
    return { g, ball, dir, line, arrow };
  });
  const centreDot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff4d4d, depthTest: false }));
  centreDot.renderOrder = 11; globe.add(centreDot);
  const centreTag = label('Centre of the Earth', new THREE.Vector3(0, -0.05, 0), { cls: 'warm' });
  const H0 = 0.48, G = 2.2;
  function placeBalls(t) {
    for (const p of people) {
      let h = H0;
      if (t > 0) {
        const tf = Math.sqrt(2 * (H0 - 0.055) / G);
        if (t < tf) h = H0 - 0.5 * G * t * t;
        else { const tb = t - tf, v = G * tf * 0.25, hb = v * tb - 0.5 * G * tb * tb; h = 0.055 + Math.max(0, hb); }
      }
      p.ball.position.copy(p.dir).multiplyScalar(R + h);
    }
  }
  function showPull(v) {
    st.pull = v;
    for (const p of people) { p.line.visible = v; p.arrow.visible = v; }
    centreDot.visible = v;
    centreTag.show(v && st.step === 3);
  }

  // ---------- The northern night sky (step 5) ----------
  const sky = new THREE.Group();
  scene.add(sky);
  const skyGround = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ color: 0x0f1d14, roughness: 1 }));
  skyGround.rotation.x = -Math.PI / 2; skyGround.position.set(0, 0, SKY.z + 20 - 0.2); sky.add(skyGround);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x08120c, roughness: 1 });
  for (let i = 0; i < 22; i++) {
    const h = 0.6 + rand(i + 70) * 0.9, x = -9 + i * 0.85 + rand(i + 71) * 0.4;
    const tr = new THREE.Mesh(new THREE.ConeGeometry(0.28 + rand(i + 72) * 0.15, h, 6), treeMat);
    tr.position.set(x, h / 2, SKY.z + 0.6 + rand(i + 73) * 0.6); sky.add(tr);
  }
  const roofG = new THREE.Group(); roofG.position.set(2.6, 0, SKY.z + 1.5); sky.add(roofG);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1), treeMat); hb.position.y = 0.4; roofG.add(hb);
  const hr = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.55, 4), treeMat); hr.position.y = 1.07; hr.rotation.y = Math.PI / 4; roofG.add(hr);
  const hw = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), winMat); hw.position.set(0.3, 0.45, 0.51); roofG.add(hw);
  // Turning sky: everything in `dome` rotates about the Pole Star. A star at angle `ang` (counter-clockwise
  // from straight up) and `r` degrees from the pole sits at (-sin ang, cos ang) * r.
  const dome = new THREE.Group();
  dome.position.set(0, SKY.y, SKY.z);
  sky.add(dome);
  const polar = ([ra, dec]) => { const a = -ra * 15 * DEG, r = (90 - dec) * SKY.s; return new THREE.Vector3(-Math.sin(a) * r, Math.cos(a) * r, 0); };
  const bgSky = [];
  for (let i = 0; i < 380; i++) { const r = 9.5 * Math.sqrt(rand(i + 2000)), a = rand(i + 2100) * Math.PI * 2; bgSky.push(Math.cos(a) * r, Math.sin(a) * r, -0.05); }
  const bgGeo = new THREE.BufferGeometry(); bgGeo.setAttribute('position', new THREE.Float32BufferAttribute(bgSky, 3));
  dome.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({ map: dotTex, color: 0xc9d6ff, size: 0.12, transparent: true, depthWrite: false })));
  const conStars = [], conLines = [];
  for (const [set, lines] of [[UMA, UMA_L], [UMI, UMI_L], [CAS, CAS_L]]) {
    const v = set.map(polar);
    v.forEach(p => conStars.push(p));
    lines.forEach(([a, b]) => conLines.push(v[a], v[b]));
  }
  dome.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(conLines), new THREE.LineBasicMaterial({ color: 0x7fa8ff, transparent: true, opacity: 0.55 })));
  dome.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(conStars), new THREE.PointsMaterial({ map: dotTex, color: 0xffffff, size: 0.42, transparent: true, depthWrite: false })));
  const pole = new THREE.Sprite(glowMat(0xdfe8ff)); pole.scale.setScalar(0.9); pole.position.copy(polar(POLARIS)); dome.add(pole);
  const anchor = p => { const o = new THREE.Object3D(); o.position.copy(p); dome.add(o); return o; };
  const mid = (set, a, b) => polar(set[a]).add(polar(set[b])).multiplyScalar(0.5);
  const poleTag = label('Pole Star', anchor(polar(POLARIS)), { cls: 'warm' });
  const dipperTag = label('Big Dipper', anchor(mid(UMA, 3, 5)), { cls: 'cool' });
  const casTag = label('Cassiopeia', anchor(polar(CAS[2])), { cls: 'cool' });
  const northTag = label('Looking north', new THREE.Vector3(-2.8, 0.2, SKY.z + 2.5));
  // Star trails: one circle per bright star, drawn from 8 pm up to the current time (in a frame that does not turn).
  const trailG = new THREE.Group(); trailG.position.copy(dome.position); sky.add(trailG);
  const TS = 96, trails = conStars.map(p => {
    const r = Math.hypot(p.x, p.y), a0 = Math.atan2(-p.x, p.y), pts = [];
    for (let k = 0; k <= TS; k++) { const a = a0 + (k / TS) * Math.PI * 2; pts.push(new THREE.Vector3(-Math.sin(a) * r, Math.cos(a) * r, -0.02)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.6 }));
    trailG.add(l);
    return l;
  });
  const rotAt = h => (LST0 + (h - 20)) * 15 * DEG;
  trailG.rotation.z = rotAt(20);
  const clock = h => { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60 + 1e-6); return `${(hh + 11) % 12 + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`; };
  function setHour(h) {
    st.hour = h;
    dome.rotation.z = rotAt(h);
    const n = Math.max(0, Math.min(TS, Math.round(((h - 20) * 15 / 360) * TS)));
    trails.forEach(l => { l.visible = st.trails && n > 0; l.geometry.setDrawRange(0, n + 1); });
  }

  // ---------- Earth's orbit and the seasons' constellations (step 6) ----------
  const orbit = new THREE.Group();
  scene.add(orbit);
  const miniSun = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 24), new THREE.MeshBasicMaterial({ map: sunTex }));
  orbit.add(miniSun);
  const miniGlow = new THREE.Sprite(glowMat(0xffd27a)); miniGlow.scale.setScalar(3); orbit.add(miniGlow);
  const ringPts = [];
  for (let k = 0; k <= 128; k++) { const a = (k / 128) * Math.PI * 2; ringPts.push(new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, -Math.sin(a) * ORBIT_R)); }
  orbit.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineDashedMaterial({ color: 0x6f86b8, dashSize: 0.3, gapSize: 0.2 })).computeLineDistances());
  const orbEarth = new THREE.Group(); orbit.add(orbEarth);
  const orbBall = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), new THREE.MeshStandardMaterial({ map: earthMat.map, roughness: 0.9 }));
  orbEarth.add(orbBall);
  // Arrow from Earth pointing away from the Sun: the way the night side looks.
  const nightArrow = new THREE.Group(); orbEarth.add(nightArrow);
  const naMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const naShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), naMat); naShaft.rotation.z = -Math.PI / 2; naShaft.position.x = 1.1; nightArrow.add(naShaft);
  const naTip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 12), naMat); naTip.rotation.z = -Math.PI / 2; naTip.position.x = 1.85; nightArrow.add(naTip);
  const cons = SEASONS.map((S, i) => {
    const a = i * Math.PI / 2, g = new THREE.Group();
    // Each pattern faces the camera's starting view, so all four read clearly.
    g.position.set(Math.cos(a) * CON_R, 0.6, -Math.sin(a) * CON_R);
    g.rotation.x = -ORBIT_PITCH; g.scale.setScalar(1.25);
    orbit.add(g);
    const v = S.pts.map(([x, y]) => new THREE.Vector3(x, y, 0));
    const lm = new THREE.LineBasicMaterial({ color: 0x9fbfff, transparent: true, opacity: 0.3 });
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(S.lines.flatMap(([p, q]) => [v[p], v[q]])), lm));
    const pm = new THREE.PointsMaterial({ map: dotTex, color: 0xffffff, size: 0.55, transparent: true, opacity: 0.4, depthWrite: false });
    g.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(v), pm));
    const top = new THREE.Object3D(); top.position.set(0, Math.max(...S.pts.map(q => q[1])) + 0.35, 0); g.add(top);
    const tag = label(S.con, top);
    return { g, lm, pm, tag };
  });
  const orbSunTag = label('Sun', new THREE.Vector3(0, 0.9, 0), { cls: 'warm' });
  const orbEarthTag = label('Earth', new THREE.Object3D(), { cls: 'cool' });
  orbEarth.add(orbEarthTag.at); orbEarthTag.at.position.y = 0.5;
  function setSeason(i) {
    st.season = i;
    let d = i * Math.PI / 2 - st.angTo; d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    st.angTo += d; // always travel forward (counter-clockwise), the way the Earth goes
    cons.forEach((c, j) => { c.lm.opacity = j === i ? 1 : 0.3; c.pm.opacity = j === i ? 1 : 0.4; c.tag.el.className = j === i ? 'lab big warm' : 'lab'; });
    ui.readout(`${SEASONS[i].name} nights: the dark side of the Earth faces <b>${SEASONS[i].con}</b>.`);
  }
  function placeEarth() {
    const a = st.ang;
    orbEarth.position.set(Math.cos(a) * ORBIT_R, 0, -Math.sin(a) * ORBIT_R);
    nightArrow.rotation.y = a;
  }

  // ---------- Steps ----------
  const allTags = [sunTag, earthTag, nearTag, farTag, centreTag, poleTag, dipperTag, casTag, northTag, orbSunTag, orbEarthTag, ...cons.map(c => c.tag)];
  function show(i, isQuiz) {
    const sunStep = i === 0 || i === 2 || isQuiz;
    sunG.visible = sunStep; sunDot.visible = i === 2;
    tinyEarth.visible = i === 0 && st.earthOn;
    street.visible = i === 1;
    globe.visible = i === 3;
    sky.visible = i === 4;
    orbit.visible = i === 5;
    starfield.visible = i !== 4;
    key.visible = i !== 5; sunLamp.visible = i === 5;
    amb.intensity = i === 5 ? 0.12 : 0.5;
    for (const tg of allTags) tg.show(false);
    if (i === 0) { sunTag.show(true); earthTag.show(st.earthOn); }
    if (i === 1) { nearTag.show(true); farTag.show(true); }
    if (i === 2) sunTag.show(st.f < 30);
    if (i === 3) centreTag.show(st.pull);
    if (i === 4) { poleTag.show(true); dipperTag.show(true); casTag.show(true); northTag.show(true); }
    if (i === 5) { orbSunTag.show(true); orbEarthTag.show(true); cons.forEach(c => c.tag.show(true)); }
  }
  function setSunDistance(f) {
    st.f = f;
    const s = 1 / f;
    sunG.scale.setScalar(Math.max(s, 1e-4));
    sunBall.visible = s > 0.004;
    // As the disc shrinks below a few pixels, a star-like dot takes over; it dims with distance like a star.
    const dot = ss(60, 400, f);
    sunDot.scale.setScalar(0.35 + 0.25 * (1 - ss(400, NEAR, f)));
    sunDot.material.opacity = dot * (1 - 0.45 * ss(400, NEAR, f));
    sunGlow.material.opacity = 1 - ss(20, 300, f);
    sunTag.show(st.step === 2 && f < 30);
    const desc = f < 3 ? 'It still looks like a huge glowing ball.' : f < 60 ? 'It looks like a small bright disc.' : f < 20000 ? 'It looks like a bright dot.' : 'It looks like one of the other stars!';
    ui.readout(f >= NEAR * 0.99 ? 'Now the Sun is as far away as the next nearest star: <b>270,000 times</b> farther. It looks like just another star!'
      : `The Sun is now <b>${fmtNum(f)} times</b> farther away than it really is. ${desc}`);
  }

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.quiz = isQuiz;
      if (i !== 2) { sunG.scale.setScalar(1); sunBall.visible = true; sunGlow.material.opacity = 1; }
      if (i === 0) {
        st.earthOn = true;
        go({ radius: 4.3, yaw: 0.25, pitch: 0.15, target: [0.9, 0, 0] });
        ui.toggle({ label: 'Show Earth', value: true, onChange: v => { st.earthOn = v; tinyEarth.visible = v; earthTag.show(v); } });
      }
      if (i === 1) {
        go({ radius: 4.6, yaw: 0, pitch: 0.04, target: [-0.4, 2.6, -8] });
        ui.slider({ label: 'Far lamp', min: 5, max: 100, step: 5, value: st.farD, unit: ' m', onInput: v => setFar(v) });
        setFar(st.farD);
      }
      if (i === 2) {
        st.fAuto = true;
        go({ radius: 4.0, yaw: 0, pitch: 0.06, target: [0, 0, 0] });
        st.fSlider = ui.slider({ label: 'Push the Sun away', min: 0, max: LOG_NEAR, step: 0.01, value: 0, format: v => `${fmtNum(Math.pow(10, v))}×`, onInput: v => { st.fAuto = false; st.fLog = v; setSunDistance(Math.pow(10, v)); } });
        st.fLog = 0; setSunDistance(1);
      }
      if (i === 3) {
        st.drop = -0.6;
        go({ radius: 2.95, yaw: 0, pitch: 0.04, target: [0, 0, 0] });
        ui.buttons([{ label: 'Drop the balls', onClick: () => { st.drop = -0.2; } }]);
        ui.toggle({ label: 'Show the pull', value: st.pull, onChange: v => showPull(v) });
        showPull(st.pull);
      }
      if (i === 4) {
        st.play = true;
        go({ radius: 4.4, yaw: 0, pitch: 0.03, target: [0, 3.9, SKY.z] });
        st.tSlider = ui.slider({ label: 'Time', min: 20, max: 28, step: 0.1, value: st.hour, format: clock, onInput: v => { st.play = false; setHour(v); } });
        ui.buttons([{ label: 'Play', onClick: () => { st.play = true; if (st.hour >= 27.95) setHour(20); } }, { label: 'Pause', onClick: () => { st.play = false; } }]).select(0);
        ui.toggle({ label: 'Star trails', value: st.trails, onChange: v => { st.trails = v; setHour(st.hour); } });
        if (st.hour >= 27.95) st.hour = 20;
        setHour(st.hour);
      }
      if (i === 5) {
        go({ radius: 7.2, yaw: 0, pitch: ORBIT_PITCH, target: [0, 0.5, 0] });
        const row = ui.buttons(SEASONS.map((S, k) => ({ label: S.name, onClick: () => setSeason(k) })));
        row.select(st.season); setSeason(st.season);
        placeEarth();
      }
      if (isQuiz) go({ radius: 4.3, yaw: -0.3, pitch: 0.2, target: [0, 0, 0] });
      show(i, isQuiz);
    },
    update(dt, t) {
      const i = st.step;
      let moving = false;
      if (i === 0 || i === 2 || st.quiz) { sunTex.offset.x = (t * 0.01) % 1; moving = true; }
      if (i === 2 && st.fAuto && st.fLog < LOG_NEAR) {
        st.fLog = Math.min(LOG_NEAR, st.fLog + dt * 0.45);
        st.fSlider?.set(st.fLog);
        setSunDistance(Math.pow(10, st.fLog));
      }
      if (i === 3) {
        st.drop += dt;
        placeBalls(st.drop);
        moving = st.drop < 3;
      }
      if (i === 4 && st.play) {
        const h = Math.min(28, st.hour + dt);
        setHour(h); st.tSlider?.set(h);
        if (h >= 28) st.play = false;
        moving = true;
      }
      if (i === 5) {
        const d = st.angTo - st.ang;
        if (Math.abs(d) > 1e-3) { st.ang += d * Math.min(1, dt * 2.5); moving = true; } else st.ang = st.angTo;
        placeEarth();
        orbBall.rotation.y += dt * 1.5; moving = true;
      }
      return moving;
    },
  };
}

function fmtNum(x) {
  if (x < 10) return String(Math.round(x * 10) / 10).replace(/\.0$/, '');
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1));
  return (Math.round(x / p) * p).toLocaleString('en-US');
}

function paintEarth(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2f7fd6'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#5bb04d';
  for (let i = 0; i < 26; i++) {
    const x = rand(i) * 512, y = 50 + rand(i + 7) * 156, r = 14 + rand(i + 3) * 34;
    g.beginPath(); g.ellipse(x, y, r * 1.4, r, rand(i + 5) * 3, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 512, 18); g.fillRect(0, 238, 512, 18);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
