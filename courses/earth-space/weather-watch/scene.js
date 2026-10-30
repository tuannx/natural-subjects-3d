// Weather watch: a small town square with a weather station (thermometer, rain gauge, wind vane and
// windsock). Buttons and sliders change the weather; the instruments respond; a chart shows a week
// and a year of weather.

// Each kind of weather as targets for the scene: sunshine, cloud cover, rain, snow, wind (0..1)
// and temperature in °C. The temperatures are typical for such a day, not exact values.
const WEATHER = {
  sunny:  { name: 'Sunny',  sun: 1,    cloud: 0.15, rain: 0, snow: 0, wind: 0.15, temp: 28 },
  cloudy: { name: 'Cloudy', sun: 0.1,  cloud: 1,    rain: 0, snow: 0, wind: 0.25, temp: 19 },
  rainy:  { name: 'Rainy',  sun: 0,    cloud: 1,    rain: 1, snow: 0, wind: 0.35, temp: 15 },
  windy:  { name: 'Windy',  sun: 0.7,  cloud: 0.5,  rain: 0, snow: 0, wind: 1,    temp: 14 },
  snowy:  { name: 'Snowy',  sun: 0,    cloud: 1,    rain: 0, snow: 1, wind: 0.2,  temp: -3 },
};
const ORDER = ['sunny', 'cloudy', 'rainy', 'windy', 'snowy'];

// One spring week in our town (°C).
const WEEK = [
  ['Monday', 'sunny', 22], ['Tuesday', 'sunny', 24], ['Wednesday', 'cloudy', 20], ['Thursday', 'rainy', 15],
  ['Friday', 'rainy', 14], ['Saturday', 'windy', 17], ['Sunday', 'sunny', 21],
];
// Average temperature of each month (°C) for a town with cold winters and hot summers.
const YEAR = [-6, -3, 3, 10, 16, 22, 24, 23, 18, 11, 4, -3];
const SEASONS = {
  winter: { name: 'Winter', months: [11, 0, 1], w: 'snowy', temp: -4, leaf: null, color: 0x7fb6e8 },
  spring: { name: 'Spring', months: [2, 3, 4], w: 'cloudy', rain: 0.45, temp: 10, leaf: 0x8fd16a, color: 0x7ccf6b },
  summer: { name: 'Summer', months: [5, 6, 7], w: 'sunny', temp: 23, leaf: 0x3f9e3f, color: 0xf2a33a },
  autumn: { name: 'Autumn', months: [8, 9, 10], w: 'windy', temp: 11, leaf: 0xe0892c, color: 0xd9733b },
};
const SEASON_ORDER = ['winter', 'spring', 'summer', 'autumn'];

const T_MIN = -20, T_MAX = 40;      // thermometer scale
const GAUGE_MAX = 30;               // rain gauge scale in mm
const RAIN_N = 700, SNOW_N = 700, LEAF_N = 60;
const F = c => Math.round((c * 9) / 5 + 32);

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const C = hex => new THREE.Color(hex);
  const ground = kit.stage(scene, { ground: 0x8fcb6a, sky: 0x8fd0ff, radius: 14 });
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8fa6b8, 1.2);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
  sunLight.position.set(-5, 9, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunLight.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 30 });
  scene.add(sunLight);

  // ---------- Town square ----------
  const paveMat = kit.mat(0xd9cdb5);
  const square = kit.mesh(new THREE.BoxGeometry(8, 0.04, 4.6), paveMat, [0, 0.02, 0.4], scene);
  square.castShadow = false;
  const snowable = [[ground.material, ground.material.color.clone()], [paveMat, paveMat.color.clone()]];

  const houseCols = [[0xf4d6a0, 0xc0392b], [0xbfe0f5, 0x4a6fa5], [0xf7c8c8, 0x8e5a3c], [0xd5ecc2, 0xb5651d]];
  houseCols.forEach(([wall, roof], i) => {
    const g = new THREE.Group();
    g.position.set(-3.6 + i * 2.4, 0, -3.2 + (i % 2) * 0.3);
    scene.add(g);
    kit.mesh(new THREE.BoxGeometry(1.4, 1.1, 1.1), kit.mat(wall), [0, 0.55, 0], g);
    const rm = kit.mat(roof);
    snowable.push([rm, rm.color.clone()]);
    const r = kit.mesh(new THREE.ConeGeometry(1.1, 0.7, 4), rm, [0, 1.45, 0], g);
    r.rotation.y = Math.PI / 4;
    r.scale.z = 0.85;
    kit.mesh(new THREE.BoxGeometry(0.3, 0.5, 0.04), kit.mat(0x6b4226), [0, 0.25, 0.56], g);
    kit.mesh(new THREE.BoxGeometry(0.28, 0.24, 0.04), kit.mat(0xfff6c9), [-0.4, 0.7, 0.56], g);
    kit.mesh(new THREE.BoxGeometry(0.28, 0.24, 0.04), kit.mat(0xfff6c9), [0.4, 0.7, 0.56], g);
  });

  // Trees bend from their base in the wind. One leaf material for all, so seasons can recolour it.
  const leafMat = kit.mat(0x3f9e3f, { flatShading: true });
  const barkMat = kit.mat(0x7a5232);
  const trees = [[-2.8, 0.9, 1], [-4.6, -1.4, 1.15], [0.2, -1.9, 0.9], [4.6, -1.4, 1.05], [-5.6, 1.8, 0.85]].map(([x, z, s], i) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    scene.add(g);
    kit.mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.3, 8), barkMat, [0, 0.65, 0], g);
    const b1 = kit.mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.6, 6), barkMat, [0.18, 1.25, 0], g);
    b1.rotation.z = -0.7;
    const b2 = kit.mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.55, 6), barkMat, [-0.16, 1.35, 0.05], g);
    b2.rotation.z = 0.6;
    const crown = kit.mesh(new THREE.IcosahedronGeometry(0.75, 1), leafMat, [0, 1.75, 0], g);
    crown.scale.set(1, 0.9, 1);
    g.crown = crown; g.phase = i * 1.7;
    return g;
  });

  // Puddles grow while it rains and dry up slowly.
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x6f9fc4, roughness: 0.1, transparent: true, opacity: 0.75 });
  const puddles = [[-1.2, 1.4, 0.5], [0.6, -0.4, 0.4], [-2.6, -0.6, 0.35]].map(([x, z, r]) => {
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 20), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.045, z);
    p.scale.setScalar(0.001);
    scene.add(p);
    return p;
  });

  // ---------- Weather station ----------
  const white = kit.mat(0xf4f6f8), metal = kit.mat(0x9aa5b1, { metalness: 0.5, roughness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });

  // Thermometer on a board with a °C scale.
  const thermo = new THREE.Group();
  thermo.position.set(1.0, 0, 1.5);
  scene.add(thermo);
  kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), metal, [0, 0.2, -0.05], thermo);
  const TB = { w: 0.42, h: 1.7, y: 1.2 };
  kit.mesh(new THREE.BoxGeometry(TB.w, TB.h, 0.06), kit.mat(0xffffff, { map: thermoScale(THREE) }), [0, TB.y, 0], thermo);
  const tubeLo = TB.y - 0.62, tubeHi = TB.y + 0.72;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, tubeHi - tubeLo, 12), glassMat);
  tube.position.set(0.07, (tubeLo + tubeHi) / 2, 0.06);
  thermo.add(tube);
  const red = kit.mat(0xe03131, { roughness: 0.4 });
  kit.mesh(new THREE.SphereGeometry(0.07, 16, 12), red, [0.07, TB.y - 0.7, 0.06], thermo);
  const column = kit.mesh(new THREE.CylinderGeometry(0.028, 0.028, 1, 8), red, [0.07, 0, 0.06], thermo);
  const tempToY = c => tubeLo + 0.08 + ((c - T_MIN) / (T_MAX - T_MIN)) * (tubeHi - tubeLo - 0.12);
  const thermoTag = label('Thermometer', new THREE.Vector3(1.0, TB.y + 0.98, 1.5));

  // Rain gauge: a clear tube with a mm scale.
  const gauge = new THREE.Group();
  gauge.position.set(1.9, 0, 1.7);
  scene.add(gauge);
  kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), metal, [0, 0.3, 0], gauge);
  kit.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20), metal, [0, 0.6, 0], gauge);
  const GH = 0.7, gy = 0.62;
  const gGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, GH, 24, 1, true), glassMat);
  gGlass.position.y = gy + GH / 2;
  gauge.add(gGlass);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 24), metal);
  rim.rotation.x = Math.PI / 2; rim.position.y = gy + GH;
  gauge.add(rim);
  const gWater = kit.mesh(new THREE.CylinderGeometry(0.15, 0.15, 1, 24), new THREE.MeshStandardMaterial({ color: 0x2f86d6, transparent: true, opacity: 0.8, roughness: 0.2 }), [0, gy, 0], gauge);
  gWater.castShadow = false;
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.11, GH - 0.04), new THREE.MeshBasicMaterial({ map: gaugeScale(THREE), transparent: true }));
  strip.position.set(0, gy + GH / 2, 0.168);
  gauge.add(strip);
  const gaugeTag = label('Rain gauge', new THREE.Vector3(1.9, gy + GH + 0.25, 1.7));

  // Wind vane: the arrow points to where the wind comes from (wind blows from -x to +x here).
  const vane = new THREE.Group();
  vane.position.set(2.7, 0, 0.7);
  scene.add(vane);
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.9, 8), metal, [0, 0.95, 0], vane);
  const arrow = new THREE.Group();
  arrow.position.y = 1.95;
  vane.add(arrow);
  const black = kit.mat(0x2b2d42, { metalness: 0.4, roughness: 0.5 });
  kit.mesh(new THREE.BoxGeometry(0.8, 0.035, 0.035), black, [0, 0, 0], arrow);
  const head = kit.mesh(new THREE.ConeGeometry(0.08, 0.2, 10), black, [-0.48, 0, 0], arrow);
  head.rotation.z = Math.PI / 2;
  kit.mesh(new THREE.BoxGeometry(0.22, 0.2, 0.015), black, [0.36, 0, 0], arrow);
  const vaneTag = label('Wind vane', new THREE.Vector3(2.7, 2.3, 0.7));

  // Windsock on a tall pole: hangs down when calm, sticks out in strong wind.
  const sockPole = new THREE.Group();
  sockPole.position.set(3.7, 0, -0.1);
  scene.add(sockPole);
  kit.mesh(new THREE.CylinderGeometry(0.04, 0.06, 2.7, 8), metal, [0, 1.35, 0], sockPole);
  const sock = new THREE.Group();
  sock.position.y = 2.62;
  sockPole.add(sock);
  const sockGeo = new THREE.CylinderGeometry(0.06, 0.15, 0.95, 16, 1, true);
  sockGeo.rotateZ(-Math.PI / 2);
  sockGeo.translate(0.5, 0, 0);
  const sockMesh = kit.mesh(sockGeo, kit.mat(0xffffff, { map: stripes(THREE), side: THREE.DoubleSide }), [0, 0, 0], sock);
  sockMesh.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 20), metal);
  ring.rotation.y = Math.PI / 2; ring.position.x = 0.03;
  sock.add(ring);
  const sockTag = label('Windsock', new THREE.Vector3(3.7, 3.0, -0.1));

  // ---------- Sky: Sun, clouds, rain, snow, blowing leaves ----------
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true });
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 16), sunMat);
  sunBall.position.set(-5, 7.6, -7);
  scene.add(sunBall);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.3, depthWrite: false });
  sunBall.add(new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16), glowMat));

  const cloudMat = kit.mat(0xffffff, { flatShading: true, roughness: 1 });
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const cloudSpots = [[-1.5, 5.6, -2.5], [2.2, 5.9, -3.2], [-4.6, 5.4, -3.6], [4.8, 5.7, -1.6], [0.4, 6.3, 0.6], [-3.4, 6.1, 0.9], [3.2, 6.5, 1.8], [-6.2, 6.2, -1]];
  const clouds = cloudSpots.map(([x, y, z], i) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.base = x;
    scene.add(g);
    const n = 4 + (i % 2);
    for (let j = 0; j < n; j++) {
      const p = new THREE.Mesh(puff, cloudMat);
      const s = 0.55 + rand(i * 9 + j) * 0.35;
      p.position.set((j - (n - 1) / 2) * 0.62, rand(i * 5 + j) * 0.3 - (j === 0 || j === n - 1 ? 0.15 : 0), (rand(i * 3 + j) - 0.5) * 0.5);
      p.scale.set(s, s * 0.8, s);
      g.add(p);
    }
    g.scale.setScalar(0.001);
    return g;
  });

  const AREA = { x: 6.5, z: 4.5, h: 6.2 };
  const rainPos = new Float32Array(RAIN_N * 6);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x4a7fb0, transparent: true, opacity: 0.75 }));
  rain.frustumCulled = false;
  scene.add(rain);
  const snowPos = new Float32Array(SNOW_N * 3);
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, map: dot(THREE), transparent: true, depthWrite: false, alphaTest: 0.1 }));
  snow.frustumCulled = false;
  scene.add(snow);
  const leafPos = new Float32Array(LEAF_N * 3), leafCol = new Float32Array(LEAF_N * 3);
  for (let i = 0; i < LEAF_N; i++) { const c = C(i % 3 ? 0x5aa84a : 0xe8a33a); leafCol.set([c.r, c.g, c.b], i * 3); }
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
  leafGeo.setAttribute('color', new THREE.BufferAttribute(leafCol, 3));
  const leafMatP = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, map: dot(THREE), transparent: true, depthWrite: false, alphaTest: 0.1 });
  const leaves = new THREE.Points(leafGeo, leafMatP);
  leaves.frustumCulled = false;
  scene.add(leaves);

  // ---------- Weather chart board (week and year) ----------
  const board = new THREE.Group();
  board.position.set(-1.5, 0, 2.0);
  scene.add(board);
  const BW = 3.4, BH = 1.9, BY = 1.45;
  kit.mesh(new THREE.BoxGeometry(0.07, BY, 0.07), barkMat, [-BW / 2 + 0.2, BY / 2, -0.05], board);
  kit.mesh(new THREE.BoxGeometry(0.07, BY, 0.07), barkMat, [BW / 2 - 0.2, BY / 2, -0.05], board);
  const boardMat = kit.mat(0xffffff, { roughness: 0.9 });
  kit.mesh(new THREE.BoxGeometry(BW + 0.1, BH + 0.1, 0.05), kit.mat(0x8b5e3c), [0, BY, -0.03], board);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), boardMat);
  face.position.set(0, BY, 0.001);
  board.add(face);
  const chartX0 = -1.25, chartX1 = 1.55;
  const tY = c => BY - 0.62 + ((c + 10) / 40) * 1.2; // -10..30 °C on the board
  const weekTex = chartTexture(THREE, 'Our weather week', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], { BW, BH, BY, chartX0, chartX1, tY });
  const yearTex = chartTexture(THREE, 'Our year: average temperature', ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], { BW, BH, BY, chartX0, chartX1, tY });
  const barGeo = new THREE.BoxGeometry(1, 1, 1);
  barGeo.translate(0, 0.5, 0);
  const wCol = { sunny: 0xf2b134, cloudy: 0x9aa7b4, rainy: 0x3d7fc4, windy: 0x5cc0b5, snowy: 0xbcd8f0 };
  const makeBars = (vals, colorOf, w) => {
    const g = new THREE.Group();
    board.add(g);
    const n = vals.length, dx = (chartX1 - chartX0) / n;
    g.bars = vals.map((v, i) => {
      const m = kit.mat(colorOf(i), { roughness: 0.6 });
      m.base = m.color.clone();
      const b = new THREE.Mesh(barGeo, m);
      const y0 = tY(0);
      b.position.set(chartX0 + dx * (i + 0.5), v >= 0 ? y0 : tY(v), 0.05);
      b.scale.set(dx * w, Math.max(0.02, Math.abs(tY(v) - y0)), 0.06);
      g.add(b);
      return b;
    });
    return g;
  };
  const weekBars = makeBars(WEEK.map(d => d[2]), i => wCol[WEEK[i][1]], 0.62);
  const monthSeason = m => SEASON_ORDER.find(s => SEASONS[s].months.includes(m));
  const yearBars = makeBars(YEAR, i => SEASONS[monthSeason(i)].color, 0.66);
  // Little weather pictures above the week bars.
  const icons = makeIcons(THREE, kit, weekBars, WEEK.map(d => d[1]));
  const boardTag = label('Weather chart', new THREE.Vector3(-1.5, BY + BH / 2 + 0.2, 2.0));

  const highlight = (bars, which) => bars.bars.forEach((b, i) => {
    const on = which.includes(i);
    b.material.color.copy(b.material.base);
    if (!on && which.length) b.material.color.lerp(C(0xffffff), 0.55);
    b.material.emissive.setHex(on ? 0x222222 : 0);
  });

  // ---------- State ----------
  const cur = { sun: 1, cloud: 0.15, rain: 0, snow: 0, wind: 0.15, temp: 22 };
  const want = { ...cur };
  const st = {
    step: 0, time: 0, auto: false, quiz: false, preset: 'sunny', level: 0, cover: 0, wet: 0, drift: 0, leafPhase: 0,
    freeTemp: null, leafTarget: C(0x3f9e3f), leavesOn: true, cycle: -1, msg: '', windSlider: null, tempSlider: null,
  };
  const skyBlue = C(0x8fd0ff), skyGrey = C(0xb7c2cc), skyStorm = C(0x7f8d99), skySnow = C(0xd5dde5), sky = C(0x8fd0ff);
  const cloudWhite = C(0xffffff), cloudDark = C(0x8d97a1), snowWhite = C(0xf7fbff), tmpC = C(0xffffff);

  function setWeather(key, extra = {}) {
    st.preset = key;
    Object.assign(want, WEATHER[key], extra);
  }
  // The rain/snow step: clouds and precipitation stay on; temperature decides which one falls.
  function precipFromTemp() {
    const cold = st.freeTemp <= 1;
    Object.assign(want, { sun: 0, cloud: 1, rain: cold ? 0 : 1, snow: cold ? 1 : 0, wind: 0.2, temp: st.freeTemp });
  }

  function readout() {
    if (st.quiz) return;
    const t = Math.round(cur.temp), tTxt = `${t} °C (${F(t)} °F)`;
    let msg = '';
    if (st.step === 0) msg = `Weather now: <b>${WEATHER[st.preset].name}</b>, ${tTxt}`;
    if (st.step === 1) msg = `The thermometer reads <b>${tTxt}</b>.`;
    if (st.step === 2) msg = `Rain in the gauge: <b>${Math.round(st.level)} mm</b>${cur.rain > 0.3 ? ' and rising' : ''}.`;
    if (st.step === 3) {
      const w = want.wind;
      const word = w < 0.12 ? 'calm' : w < 0.4 ? 'a light breeze' : w < 0.75 ? 'windy' : 'very windy';
      msg = `It is <b>${word}</b>. The wind blows from left to right.`;
    }
    if (st.step === 4) msg = want.snow > 0.5 ? `<b>${tTxt}</b>: cold enough for snow.` : `<b>${tTxt}</b>: too warm for snow, so rain falls.`;
    if (st.step === 5 && st.day != null) { const [d, w, c] = WEEK[st.day]; msg = `<b>${d}</b>: ${WEATHER[w].name.toLowerCase()}, ${c} °C (${F(c)} °F)`; }
    if (st.step === 6 && st.season) { const s = SEASONS[st.season]; msg = `<b>${s.name}</b> in our town: about ${s.temp} °C (${F(s.temp)} °F)`; }
    if (msg !== st.msg) { st.msg = msg; ui.readout(msg); }
  }

  function showDay(i) {
    st.day = i;
    const [, w, c] = WEEK[i];
    setWeather(w, { temp: c });
    highlight(weekBars, [i]);
    icons.forEach((ic, j) => ic.scale.setScalar(j === i ? 1.35 : 1));
  }
  function showSeason(key) {
    st.season = key;
    const s = SEASONS[key];
    setWeather(s.w, { temp: s.temp, ...(s.rain ? { rain: s.rain } : {}) });
    st.leavesOn = !!s.leaf;
    if (s.leaf) st.leafTarget.setHex(s.leaf);
    highlight(yearBars, s.months);
  }

  const views = {
    town: { radius: 5.3, yaw: 0.22, pitch: 0.26, target: [0.3, 1.6, 0] },
    thermo: { radius: 1.25, yaw: 0.2, pitch: 0.12, target: [1.0, 1.2, 1.5] },
    gauge: { radius: 1.7, yaw: -0.15, pitch: 0.16, target: [1.8, 1.25, 1.6] },
    wind: { radius: 2.9, yaw: 0.15, pitch: 0.12, target: [3.4, 1.7, 0.1] },
    snow: { radius: 5.4, yaw: -0.2, pitch: 0.3, target: [0, 1.8, 0] },
    chart: { radius: 2.15, yaw: 0.08, pitch: 0.12, target: [-1.4, 1.55, 2.0] },
  };

  const tags = [thermoTag, gaugeTag, vaneTag, sockTag, boardTag];

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.quiz = isQuiz; st.time = 0; st.auto = true; st.cycle = -1; st.row = null; st.msg = ''; st.day = null; st.season = null;
      st.freeTemp = null; st.leavesOn = true; st.leafTarget.setHex(0x3f9e3f);
      tags.forEach(t => t.show(false));
      board.visible = i === 5 || i === 6;
      weekBars.visible = icons.visible = i === 5;
      icons.forEach(ic => { ic.visible = i === 5; ic.scale.setScalar(1); });
      yearBars.visible = i === 6;
      boardMat.map = i === 6 ? yearTex : weekTex; boardMat.needsUpdate = true;
      if (!isQuiz && i !== 4) st.cover = Math.min(st.cover, 0.0);

      if (i === 0) {
        go(views.town);
        setWeather('sunny');
        st.row = ui.buttons(ORDER.map(k => ({ label: WEATHER[k].name, on: k === 'sunny', onClick: () => { st.auto = false; setWeather(k); } })));
      }
      if (i === 1) {
        go(views.thermo);
        thermoTag.show(true);
        setWeather('sunny');
        const opts = [['Hot sunny day', 'sunny'], ['Cool cloudy day', 'cloudy'], ['Cold snowy day', 'snowy']];
        st.row = ui.buttons(opts.map(([l, k], j) => ({ label: l, on: j === 0, onClick: () => { st.auto = false; setWeather(k); } })));
      }
      if (i === 2) {
        go(views.gauge);
        gaugeTag.show(true);
        st.level = 0;
        setWeather('cloudy');
        ui.buttons([
          { label: 'Make it rain', onClick: () => { st.auto = false; setWeather('rainy'); } },
          { label: 'Stop the rain', onClick: () => { st.auto = false; setWeather('cloudy'); } },
          { label: 'Empty the gauge', onClick: () => { st.auto = false; st.level = 0; } },
        ]);
      }
      if (i === 3) {
        go(views.wind);
        vaneTag.show(true); sockTag.show(true);
        setWeather('sunny', { wind: 0, temp: 18 });
        const word = v => (v < 0.12 ? 'calm' : v < 0.4 ? 'light breeze' : v < 0.75 ? 'windy' : 'very windy');
        st.windSlider = ui.slider({ label: 'Wind', min: 0, max: 1, step: 0.01, value: 0, format: word, onInput: v => { st.auto = false; want.wind = v; } });
      }
      if (i === 4) {
        go(views.snow);
        st.freeTemp = 6; st.cover = 0;
        precipFromTemp();
        st.tempSlider = ui.slider({ label: 'Temperature', min: -8, max: 8, step: 1, value: 6, format: v => `${v} °C (${F(v)} °F)`, onInput: v => { st.auto = false; st.freeTemp = v; precipFromTemp(); } });
      }
      if (i === 5) {
        go(views.chart);
        boardTag.show(true);
        st.leafTarget.setHex(0x8fd16a);
        st.row = ui.buttons(WEEK.map(([d], j) => ({ label: d.slice(0, 3), on: j === 0, onClick: () => { st.auto = false; showDay(j); } })));
        showDay(0);
      }
      if (i === 6) {
        go(views.chart);
        boardTag.show(true);
        st.row = ui.buttons(SEASON_ORDER.map((k, j) => ({ label: SEASONS[k].name, on: j === 0, onClick: () => { st.auto = false; showSeason(k); } })));
        showSeason('winter');
      }
      if (isQuiz) {
        st.auto = false;
        go({ ...views.town, yaw: -0.25, pitch: 0.3 });
        setWeather('windy', { temp: 18, cloud: 0.6 });
      }
      readout();
    },

    update(dt, t) {
      st.time += dt;
      // Scripted demo until the learner takes over.
      if (st.auto && !st.quiz) {
        if (st.step === 0 || st.step === 1) {
          const list = st.step === 0 ? ORDER : ['sunny', 'cloudy', 'snowy'];
          const n = Math.floor(st.time / 3.5) % list.length;
          if (n !== st.cycle) { st.cycle = n; setWeather(list[n]); mark(st.row, n); }
        }
        if (st.step === 2 && st.time > 0.4 && st.preset !== 'rainy') setWeather('rainy');
        if (st.step === 3) {
          const v = kit.clamp((st.time - 0.3) / 2.6, 0, 0.85);
          want.wind = v; st.windSlider?.set(v);
        }
        if (st.step === 4) {
          const v = Math.round(kit.clamp(6 - (st.time - 0.3) * 4, -4, 6));
          if (v !== st.freeTemp) { st.freeTemp = v; precipFromTemp(); st.tempSlider?.set(v); }
        }
        if (st.step === 5) { const n = Math.floor(st.time / 1.6) % 7; if (n !== st.day) { showDay(n); mark(st.row, n); } }
        if (st.step === 6) { const n = Math.floor(st.time / 3) % 4; if (SEASON_ORDER[n] !== st.season) { showSeason(SEASON_ORDER[n]); mark(st.row, n); } }
      }

      let moving = false;
      for (const k of ['sun', 'cloud', 'rain', 'snow', 'wind']) moving = kit.follow(cur, k, want[k], dt, 1.8) || moving;
      moving = kit.follow(cur, 'temp', want.temp, dt, st.step === 1 ? 1.2 : 2) || moving;

      // Light and sky.
      sunMat.opacity = cur.sun; glowMat.opacity = 0.3 * cur.sun; sunBall.visible = cur.sun > 0.02;
      sunLight.intensity = 0.7 + 2.0 * cur.sun;
      hemi.intensity = 1.0 + 0.4 * (1 - cur.sun);
      sky.copy(skyBlue).lerp(skyGrey, kit.clamp(cur.cloud * (1 - cur.sun * 0.7), 0, 1)).lerp(skyStorm, cur.rain * 0.7).lerp(skySnow, cur.snow * 0.75);
      scene.background.copy(sky);

      // Clouds grow in one by one and drift with the wind.
      st.drift += dt * (0.05 + cur.wind * 0.7);
      tmpC.copy(cloudWhite).lerp(cloudDark, Math.max(cur.rain * 0.85, cur.snow * 0.35));
      cloudMat.color.copy(tmpC);
      clouds.forEach((c, i) => {
        const s = kit.clamp(cur.cloud * clouds.length - i * 0.85, 0, 1);
        c.scale.setScalar(Math.max(0.001, s * (0.9 + 0.2 * rand(i + 40))));
        c.visible = s > 0.01;
        c.position.x = wrap(c.base + st.drift, -8, 8);
      });

      // Rain: slanted streaks; snow: drifting flakes. Only some of them are drawn when it is light.
      const nR = Math.floor(cur.rain * RAIN_N), nS = Math.floor(cur.snow * SNOW_N);
      rain.visible = nR > 0; snow.visible = nS > 0;
      const slant = cur.wind * 0.6;
      for (let i = 0; i < nR; i++) {
        const y = AREA.h - ((t * 7 + rand(i) * AREA.h) % AREA.h);
        const x = wrap(-AREA.x + rand(i + 1000) * 2 * AREA.x + slant * (AREA.h - y), -AREA.x, AREA.x);
        const z = -AREA.z + rand(i + 2000) * 2 * AREA.z;
        const o = i * 6;
        rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z;
        rainPos[o + 3] = x - slant * 0.28; rainPos[o + 4] = y + 0.28; rainPos[o + 5] = z;
      }
      rainGeo.setDrawRange(0, nR * 2);
      rainGeo.attributes.position.needsUpdate = nR > 0;
      for (let i = 0; i < nS; i++) {
        const y = AREA.h - ((t * 0.7 + rand(i + 3000) * AREA.h) % AREA.h);
        const x = wrap(-AREA.x + rand(i + 4000) * 2 * AREA.x + Math.sin(t * 0.9 + i) * 0.25 + cur.wind * (AREA.h - y), -AREA.x, AREA.x);
        const z = -AREA.z + rand(i + 5000) * 2 * AREA.z + Math.cos(t * 0.7 + i * 1.3) * 0.2;
        snowPos[i * 3] = x; snowPos[i * 3 + 1] = y; snowPos[i * 3 + 2] = z;
      }
      snowGeo.setDrawRange(0, nS);
      snowGeo.attributes.position.needsUpdate = nS > 0;

      // Ground: snow builds up when it snows and melts when warm; puddles when it rains.
      if (cur.snow > 0.3) st.cover = Math.min(1, st.cover + dt * 0.3 * cur.snow);
      else if (cur.temp > 2) st.cover = Math.max(0, st.cover - dt * 0.35);
      for (const [m, base] of snowable) m.color.copy(base).lerp(snowWhite, st.cover * 0.92);
      if (cur.rain > 0.3) st.wet = Math.min(1, st.wet + dt * 0.35 * cur.rain);
      else st.wet = Math.max(0, st.wet - dt * (cur.temp > 20 ? 0.25 : 0.06));
      puddles.forEach((p, i) => p.scale.setScalar(Math.max(0.001, kit.clamp(st.wet * 1.4 - i * 0.2, 0, 1) * (1 - st.cover))));

      // Rain gauge fills while it rains.
      if (cur.rain > 0.3) st.level = Math.min(GAUGE_MAX, st.level + dt * 4 * cur.rain);
      const wl = Math.max(0.002, (st.level / GAUGE_MAX) * (GH - 0.04));
      gWater.scale.y = wl; gWater.position.y = gy + wl / 2;
      gWater.visible = st.level > 0.05;

      // Thermometer column.
      const top = tempToY(cur.temp), bot = TB.y - 0.7;
      column.scale.y = top - bot; column.position.y = (top + bot) / 2;

      // Wind: trees bend, the windsock lifts and flutters, the vane wobbles a little.
      const w = cur.wind;
      trees.forEach(g => { g.rotation.z = -(w * 0.16 + Math.sin(t * (1.5 + w * 2) + g.phase) * (0.012 + 0.05 * w)); });
      const droop = Math.pow(1 - w, 1.6) * 1.42;
      sock.rotation.z = -droop + Math.sin(t * 9) * 0.05 * w;
      sock.rotation.y = Math.sin(t * 3.1) * 0.12 * w;
      sockMesh.scale.set(1, 0.75 + 0.25 * Math.min(1, w * 2), 0.75 + 0.25 * Math.min(1, w * 2));
      arrow.rotation.y = Math.sin(t * 1.7) * 0.1 * w;
      st.leafPhase += dt * (0.4 + 3.2 * w);
      leaves.visible = w > 0.45 && st.leavesOn !== false;
      leafMatP.opacity = kit.clamp((w - 0.45) * 3, 0, 1);
      if (leaves.visible) {
        for (let i = 0; i < LEAF_N; i++) {
          const x = wrap(-6.5 + rand(i + 6000) * 13 + st.leafPhase * (0.8 + rand(i) * 0.6), -6.5, 6.5);
          leafPos[i * 3] = x;
          leafPos[i * 3 + 1] = 0.3 + rand(i + 7000) * 2.2 + Math.sin(st.leafPhase * 2 + i) * 0.3;
          leafPos[i * 3 + 2] = -3 + rand(i + 8000) * 6;
        }
        leafGeo.attributes.position.needsUpdate = true;
      }

      // Leaves change with the seasons (and fall off in winter).
      for (const tr of trees) {
        const s = kit.lerp(tr.crown.scale.x, st.leavesOn ? 1 : 0.001, Math.min(1, dt * 3));
        tr.crown.scale.set(s, s * 0.9, s);
        tr.crown.visible = s > 0.01;
      }
      leafMat.color.lerp(st.leafTarget, Math.min(1, dt * 3));

      if (moving || st.step === 2) readout();
      return true;
    },
  };
}

// Show which button the demo picked (the engine marks only buttons that were tapped).
function mark(row, i) { if (row) [...row.children].forEach((b, j) => b.classList.toggle('on', j === i)); }

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function wrap(v, a, b) { const r = b - a; return a + ((((v - a) % r) + r) % r); }

function canvasTex(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Thermometer board: °C scale from -20 to 40 (matches tempToY in setup).
function thermoScale(THREE) {
  return canvasTex(THREE, 128, 512, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const pxPerUnit = h / 1.7, tubeLo = 0.85 - 0.62 + 0.08, span = 1.34 - 0.12;
    const yOf = c => h - (tubeLo + ((c + 20) / 60) * span) * pxPerUnit;
    g.fillStyle = '#1d2b36'; g.strokeStyle = '#1d2b36';
    g.font = 'bold 26px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let c = -20; c <= 40; c += 5) {
      const y = yOf(c), big = c % 10 === 0;
      g.lineWidth = big ? 4 : 2;
      g.beginPath(); g.moveTo(84 - (big ? 18 : 10), y); g.lineTo(84, y); g.stroke();
      if (big) g.fillText(String(c), 60, y);
    }
    g.fillStyle = '#e03131'; g.font = 'bold 30px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('°C', 64, 26);
  });
}

function gaugeScale(THREE) {
  return canvasTex(THREE, 64, 512, (g, w, h) => {
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1d2b36'; g.fillStyle = '#1d2b36';
    g.font = 'bold 22px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    for (let mm = 0; mm <= 30; mm += 5) {
      const y = h - 6 - (mm / 30) * (h - 12), big = mm % 10 === 0;
      g.lineWidth = big ? 4 : 2;
      g.beginPath(); g.moveTo(0, y); g.lineTo(big ? 26 : 16, y); g.stroke();
      if (big && mm) g.fillText(String(mm), 30, y);
    }
    g.fillText('mm', 18, 18);
  });
}

function stripes(THREE) {
  return canvasTex(THREE, 16, 128, (g, w, h) => {
    for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff6b1a'; g.fillRect(0, (i * h) / 5, w, h / 5 + 1); }
  });
}

function dot(THREE) {
  const t = canvasTex(THREE, 32, 32, (g) => {
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.6, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  });
  return t;
}

// Chart board: title, grid lines every 10 °C from -10 to 30, and a name under each bar.
function chartTexture(THREE, title, names, { BW, BH, BY, chartX0, chartX1, tY }) {
  return canvasTex(THREE, 512, 288, (g, w, h) => {
    const sx = x => ((x + BW / 2) / BW) * w, sy = y => ((BY + BH / 2 - y) / BH) * h;
    g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d2b36'; g.font = 'bold 24px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(title, w / 2, 20);
    g.font = '15px system-ui, sans-serif'; g.textAlign = 'right';
    for (let c = -10; c <= 30; c += 10) {
      const y = sy(tY(c));
      g.strokeStyle = c === 0 ? '#526472' : '#d5dde3'; g.lineWidth = c === 0 ? 2 : 1;
      g.beginPath(); g.moveTo(sx(chartX0), y); g.lineTo(sx(chartX1), y); g.stroke();
      g.fillStyle = '#526472'; g.fillText(`${c}°C`, sx(chartX0) - 4, y);
    }
    g.fillStyle = '#1d2b36'; g.font = 'bold 17px system-ui, sans-serif'; g.textAlign = 'center';
    const dx = (chartX1 - chartX0) / names.length;
    names.forEach((n, i) => g.fillText(n, sx(chartX0 + dx * (i + 0.5)), sy(tY(-10)) + 14));
  });
}

// Small 3D weather pictures that sit above each bar of the week chart.
function makeIcons(THREE, kit, bars, kinds) {
  const sunM = new THREE.MeshBasicMaterial({ color: 0xffc934 });
  const cloudM = kit.mat(0xffffff, { roughness: 1 }), greyM = kit.mat(0x9aa7b4, { roughness: 1 });
  const dropM = kit.mat(0x2f86d6), windM = kit.mat(0x2a9d8f);
  const ball = new THREE.SphereGeometry(1, 12, 8);
  const list = kinds.map((kind, i) => {
    const g = new THREE.Group();
    const b = bars.bars[i];
    g.position.set(b.position.x, b.position.y + b.scale.y + 0.12, 0.1);
    const add = (geo, m, x, y, s) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, 0); o.scale.setScalar(s); g.add(o); return o; };
    if (kind === 'sunny') add(ball, sunM, 0, 0, 0.08);
    if (kind === 'cloudy' || kind === 'rainy') {
      const m = kind === 'rainy' ? greyM : cloudM;
      add(ball, m, -0.05, 0, 0.055); add(ball, m, 0.03, 0.02, 0.07); add(ball, m, 0.09, -0.01, 0.045);
      if (kind === 'rainy') { const d = add(new THREE.ConeGeometry(1, 2.2, 8), dropM, 0.02, -0.11, 0.025); d.rotation.z = Math.PI; }
    }
    if (kind === 'windy') {
      for (let j = 0; j < 3; j++) { const o = add(new THREE.CylinderGeometry(1, 1, 1, 6), windM, 0.02 * j - 0.02, 0.05 - j * 0.05, 1); o.scale.set(0.012, 0.18 - j * 0.04, 0.012); o.rotation.z = Math.PI / 2; }
    }
    bars.parent.add(g);
    return g;
  });
  list.visible = true;
  return list;
}
