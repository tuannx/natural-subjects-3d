// Soil: a cut-away soil block (topsoil, subsoil, bedrock) full of worms and roots, a shake jar whose bits
// settle into layers, a glass of dry soil that bubbles when watered, a rock that crumbles into soil over a
// time slider, three pots (sand, clay, loam) that drain differently, and the block again in the rain.

const W = 4, D = 2.4, ZF = D / 2;            // soil block size; front (cut) face at z = ZF
const BED = 1.1, SUB = 2.2, TOP = 3.0;       // tops of bedrock, subsoil and topsoil
const JX = 7, BX = 10.6, RX = -8;            // shake jar, air glass, rock-to-soil stations
const POTS = [{ name: 'Sand', x: 14.3 }, { name: 'Clay', x: 16.1 }, { name: 'Loam', x: 17.9 }];
const PCX = 16.1;                            // pot station centre
const SHELF = 1.3, SOIL_TOP = SHELF + 0.78;  // pot shelf height, soil surface in the pots

const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0x9cc987, sky: 0xdcefff, radius: 34 });
  const sunLight = kit.lights(scene, { sun: [6, 12, 8] });
  Object.assign(sunLight.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, far: 60 });
  sunLight.target.position.set(4, 0, 0); scene.add(sunLight.target);
  sunLight.position.set(10, 12, 8);

  const dummy = new THREE.Object3D();
  const tex = (draw, size = 256, rep = [1, 1]) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep);
    return t;
  };
  const speckle = (base, spots, n, seed, rmax = 3) => (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    for (let i = 0; i < n; i++) {
      g.fillStyle = spots[i % spots.length];
      g.beginPath(); g.ellipse(rand(seed + i) * s, rand(seed + i + 500) * s, 0.6 + rand(seed + i + 900) * rmax, 0.5 + rand(seed + i + 1300) * rmax * 0.7, rand(i) * 3, 0, Math.PI * 2); g.fill();
    }
  };
  const topTex = tex(speckle('#4a3020', ['#2e1c11', '#6a4630', '#3a2416', '#8a6a4a'], 900, 1), 256, [2, 0.6]);
  const subTex = tex((g, s) => {
    speckle('#a8723f', ['#8a5a30', '#c08a52', '#966236'], 700, 2)(g, s);
    for (let i = 0; i < 26; i++) { g.fillStyle = ['#9a9590', '#b5aea6', '#7f7a75'][i % 3]; g.beginPath(); g.ellipse(rand(i + 40) * s, rand(i + 80) * s, 4 + rand(i + 9) * 9, 3 + rand(i + 19) * 6, rand(i + 3) * 3, 0, Math.PI * 2); g.fill(); }
  }, 256, [2, 0.8]);
  const bedTex = tex((g, s) => {
    speckle('#8d9094', ['#7a7d82', '#a2a5a9', '#6e7176'], 500, 3, 4)(g, s);
    g.strokeStyle = '#55585d'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) { let x = rand(i + 60) * s, y = rand(i + 70) * s; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rand(i * 9 + j) - 0.5) * 60; y += 10 + rand(i * 7 + j) * 30; g.lineTo(x, y); } g.stroke(); }
  }, 256, [2, 0.8]);
  const sandTex = tex(speckle('#dcc28c', ['#c8a96e', '#efdcaa', '#b8955a'], 900, 4, 2.5));
  const siltTex = tex(speckle('#b48a5c', ['#a07a4e', '#c79c6c'], 900, 5, 1.6));
  const clayTex = tex(speckle('#9b6a5a', ['#8d5e50', '#a8786a'], 600, 6, 1.2));
  const loamTex = tex(speckle('#4f3524', ['#3a2516', '#6d4a32', '#8a6a4a', '#c8a96e'], 900, 7, 2.5));

  // ---------- The soil block ----------
  const block = new THREE.Group();
  scene.add(block);
  const layerMat = t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, emissive: 0x000000 });
  const bedMat = layerMat(bedTex), subMat = layerMat(subTex), topMat = layerMat(topTex);
  const bedrock = kit.mesh(new THREE.BoxGeometry(W, BED, D), bedMat, [0, BED / 2, 0], block);
  const subsoil = kit.mesh(new THREE.BoxGeometry(W, SUB - BED, D), subMat, [0, (BED + SUB) / 2, 0], block);
  const topsoil = kit.mesh(new THREE.BoxGeometry(W, TOP - SUB, D), topMat, [0, (SUB + TOP) / 2, 0], block);
  const layers = [topsoil, subsoil, bedrock];
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffd23f }));
  outline.visible = false; block.add(outline);
  const setTop = y => { topsoil.scale.y = (y - SUB) / (TOP - SUB); topsoil.position.y = (SUB + y) / 2; turf.position.y = y; };
  // Loose broken rock at the bottom of the subsoil, and stones sticking out of the cut face.
  const stoneGeo = new THREE.DodecahedronGeometry(0.12, 0);
  const stoneMat = kit.mat(0x8f8b86);
  for (let i = 0; i < 14; i++) {
    const s = kit.mesh(stoneGeo, stoneMat, [-1.8 + rand(i + 200) * 3.6, BED + 0.08 + rand(i + 210) * (i < 9 ? 0.25 : 0.8), ZF - 0.04], block);
    s.scale.setScalar(0.6 + rand(i + 220) * 0.9); s.rotation.set(rand(i) * 3, rand(i + 1) * 3, 0);
  }

  // Turf: grass and two plants. It moves with the top of the topsoil.
  const turf = new THREE.Group();
  turf.position.y = TOP;
  block.add(turf);
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.24, 3), kit.mat(0x4f9a3a), 240);
  for (let i = 0; i < 240; i++) {
    dummy.position.set(-W / 2 + 0.05 + rand(i + 300) * (W - 0.1), 0.1, -D / 2 + 0.05 + rand(i + 400) * (D - 0.1));
    dummy.rotation.set((rand(i + 500) - 0.5) * 0.5, 0, (rand(i + 600) - 0.5) * 0.5);
    dummy.scale.setScalar(0.7 + rand(i + 700) * 0.7);
    dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
  }
  grass.castShadow = true;
  turf.add(grass);
  const leafMat = kit.mat(0x3f8f2f), stemMat = kit.mat(0x5a8a2a);
  const plant = (x, z, h, parent, mat = leafMat, size = 1) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    kit.mesh(new THREE.CylinderGeometry(0.02 * size, 0.03 * size, h, 6), stemMat, [0, h / 2, 0], g);
    for (let j = 0; j < 5; j++) {
      const a = j * 2.4, y = h * (0.35 + 0.15 * j);
      const leaf = kit.mesh(new THREE.SphereGeometry(0.11 * size, 8, 6), mat, [Math.cos(a) * 0.1 * size, y, Math.sin(a) * 0.1 * size], g);
      leaf.scale.set(1.5, 0.3, 0.75); leaf.rotation.set(0, -a, 0.55, 'YXZ');
    }
    return g;
  };
  plant(-1.1, ZF - 0.18, 0.55, turf);
  plant(0.85, ZF - 0.2, 0.45, turf);

  // Roots on the cut face, worms and a beetle.
  const life = new THREE.Group();
  block.add(life);
  const rootMat = kit.mat(0xe6d2a8);
  const root = (pts, r = 0.018) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, ZF + 0.004)));
    const m = kit.mesh(new THREE.TubeGeometry(curve, 16, r, 4, false), rootMat, [0, 0, 0], life);
    m.castShadow = false;
    return m;
  };
  root([[-1.1, TOP], [-1.15, 2.75], [-1.05, 2.5], [-1.2, 2.2], [-1.12, 1.85], [-1.25, 1.6]], 0.022);
  root([[-1.12, 2.8], [-1.35, 2.62], [-1.5, 2.4]], 0.012);
  root([[-1.07, 2.6], [-0.85, 2.45], [-0.7, 2.25]], 0.012);
  root([[0.85, TOP], [0.8, 2.75], [0.92, 2.5], [0.86, 2.3]], 0.018);
  root([[0.82, 2.78], [0.6, 2.62], [0.55, 2.45]], 0.011);
  root([[0.9, 2.6], [1.1, 2.48], [1.2, 2.3]], 0.011);
  const wormMat = kit.mat(0xd9777a, { roughness: 0.5 }), segGeo = new THREE.SphereGeometry(0.045, 8, 6);
  const worms = [
    { x: -0.3, y: 2.45, len: 0.55, ang: 0.15, ph: 0 },
    { x: 1.35, y: 2.55, len: 0.45, ang: -0.3, ph: 2 },
    { x: -1.75, y: 2.3, len: 0.42, ang: 0.4, ph: 4 },
    { x: 0.2, y: 2.05, len: 0.4, ang: -0.1, ph: 1 },
  ].map(w => {
    w.segs = []; w.s = 1;
    for (let j = 0; j < 9; j++) { const m = kit.mesh(segGeo, wormMat, [0, 0, 0], life); m.castShadow = false; w.segs.push(m); }
    return w;
  });
  const placeWorms = t => {
    for (const w of worms) {
      const drift = 0.08 * Math.sin(t * 0.7 + w.ph);
      w.segs.forEach((m, j) => {
        const u = j / 8, a = w.ang, along = u * w.len + drift;
        const wave = 0.035 * Math.sin(u * 9 - t * 4 + w.ph);
        m.position.set(w.x + along * Math.cos(a) - wave * Math.sin(a), w.y + along * Math.sin(a) + wave * Math.cos(a), ZF + 0.012);
        m.scale.setScalar(w.s * (j === 8 ? 1.1 : 0.85 + 0.15 * Math.sin(u * Math.PI)));
      });
    }
  };
  placeWorms(0);
  const beetle = new THREE.Group();
  beetle.position.set(-0.75, 2.78, ZF + 0.03);
  life.add(beetle);
  const shell = kit.mesh(new THREE.SphereGeometry(0.07, 10, 8), kit.mat(0x23314a, { roughness: 0.3 }), [0, 0, 0], beetle);
  shell.scale.set(1.4, 0.9, 0.6);
  kit.mesh(new THREE.SphereGeometry(0.035, 8, 6), kit.mat(0x111111), [0.1, 0, 0], beetle);
  const legMat = kit.mat(0x111111);
  for (let j = 0; j < 6; j++) {
    const leg = kit.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 3), legMat, [-0.05 + (j % 3) * 0.05, j < 3 ? 0.06 : -0.06, 0], beetle);
    leg.rotation.z = Math.PI / 2 + (j < 3 ? 0.6 : -0.6);
  }

  // Magnifying glass over the topsoil, with bacteria inside.
  const lens = new THREE.Group();
  lens.position.set(0.95, 2.45, ZF + 0.14);
  block.add(lens);
  const zoomTex = tex((g, s) => {
    g.fillStyle = '#e9d8b8'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 22; i++) { g.fillStyle = ['#c9a878', '#b48e5e', '#d8bf92', '#8a6a4a'][i % 4]; g.beginPath(); g.ellipse(rand(i + 30) * s, rand(i + 31) * s, 14 + rand(i + 32) * 22, 10 + rand(i + 33) * 16, rand(i + 34) * 3, 0, Math.PI * 2); g.fill(); }
  });
  const lensDisc = new THREE.Mesh(new THREE.CircleGeometry(0.36, 32), new THREE.MeshBasicMaterial({ map: zoomTex }));
  lens.add(lensDisc);
  const rim = kit.mesh(new THREE.TorusGeometry(0.37, 0.035, 6, 32), kit.mat(0x2b2b2b, { roughness: 0.4 }), [0, 0, 0.01], lens);
  rim.castShadow = false;
  const handle = kit.mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 8), kit.mat(0x7a3b1d), [0.42, -0.42, 0.01], lens);
  handle.rotation.z = Math.PI / 4;
  const NB = 26;
  const bact = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial(), NB);
  const bcol = new THREE.Color();
  for (let i = 0; i < NB; i++) bact.setColorAt(i, bcol.set([0x2f9e44, 0x7b4fc9, 0x2b8a9e][i % 3]));
  bact.position.z = 0.01;
  lens.add(bact);
  const placeBacteria = t => {
    for (let i = 0; i < NB; i++) {
      const r = 0.29 * Math.sqrt(rand(i + 800)), a = rand(i + 810) * 6.28 + 0.25 * Math.sin(t * 0.8 + i);
      dummy.position.set(r * Math.cos(a), r * Math.sin(a), 0);
      dummy.rotation.set(0, 0, rand(i + 820) * 3 + t * (0.5 + rand(i) * 0.5));
      dummy.scale.set(i % 3 === 1 ? 1 : 2.4, 1, 1);
      dummy.updateMatrix(); bact.setMatrixAt(i, dummy.matrix);
    }
    bact.instanceMatrix.needsUpdate = true;
  };
  placeBacteria(0);

  // Rain, muddy runoff, mud puddle, oil and trash (step 7).
  const NR = 150, rainPos = new Float32Array(NR * 6);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x6aa8e8 }));
  rain.frustumCulled = false;
  scene.add(rain);
  const placeRain = (t, top) => {
    for (let i = 0; i < NR; i++) {
      const x = -W / 2 - 0.2 + rand(i + 1000) * (W + 0.4), z = -D / 2 + rand(i + 1100) * D;
      const H = 4, y = top + H * (1 - ((rand(i + 1200) + t * 1.6) % 1));
      rainPos.set([x, y, z, x, y + 0.22, z], i * 6);
    }
    rainGeo.attributes.position.needsUpdate = true;
  };
  const NM = 70;
  const mud = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), kit.mat(0x7a5434), NM);
  mud.castShadow = false;
  scene.add(mud);
  const puddle = kit.mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -1 }), [0, 0.012, ZF + 0.55], scene);
  puddle.rotation.x = -Math.PI / 2; puddle.castShadow = false;
  const placeMud = (t, top) => {
    for (let i = 0; i < NM; i++) {
      const p = (rand(i + 1300) + t * 0.4) % 1, x = -1.8 + rand(i + 1400) * 3.6;
      const z0 = -D / 2 + 0.1 + rand(i + 1500) * D * 0.8;
      if (p < 0.75) dummy.position.set(x, top + 0.03, z0 + (ZF - z0) * (p / 0.75));
      else dummy.position.set(x, top + 0.03, ZF);
      dummy.scale.setScalar(p < 0.75 ? 0.8 + rand(i + 1700) * 0.6 : 0.001); dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix(); mud.setMatrixAt(i, dummy.matrix);
    }
    mud.instanceMatrix.needsUpdate = true;
  };
  const streamTex = tex((g, sz) => {
    g.clearRect(0, 0, sz, sz);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${110 + (i % 3) * 15},${75 + (i % 3) * 10},45,${0.5 + rand(i + 1800) * 0.4})`; g.fillRect(rand(i + 1810) * sz, rand(i + 1820) * sz, 6 + rand(i + 1830) * 18, 30 + rand(i + 1840) * 80); }
  }, 128);
  const streams = [-0.9, 0.95].map(x => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1), new THREE.MeshBasicMaterial({ map: streamTex, transparent: true, depthWrite: false, color: 0xc89a6a }));
    m.position.set(x, 0, ZF + 0.03); scene.add(m);
    return m;
  });
  const oil = kit.mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshStandardMaterial({ color: 0x111014, roughness: 0.15, metalness: 0.3 }), [0.2, 0, 0.45], turf);
  oil.rotation.x = -Math.PI / 2; oil.position.y = 0.005; oil.castShadow = false;
  const stainTex = tex((g, sz) => {
    g.clearRect(0, 0, sz, sz); g.fillStyle = 'rgba(12,10,8,0.85)';
    g.fillRect(0, 0, sz, sz * 0.25);
    for (let i = 0; i < 16; i++) { const x = (i + 0.5) / 16 * sz, w = 8 + rand(i + 1900) * 14, h = sz * (0.35 + rand(i + 1910) * 0.6); g.fillRect(x - w / 2, 0, w, h); g.beginPath(); g.arc(x, h, w / 2, 0, Math.PI * 2); g.fill(); }
  }, 128);
  stainTex.wrapS = stainTex.wrapT = THREE.ClampToEdgeWrapping;
  const stain = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshBasicMaterial({ map: stainTex, transparent: true, depthWrite: false }));
  scene.add(stain);
  const trash = new THREE.Group();
  turf.add(trash);
  const bottle = kit.mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.55, 12), new THREE.MeshStandardMaterial({ color: 0x7cc6e8, transparent: true, opacity: 0.8, roughness: 0.2 }), [-1.0, 0.11, -0.2], trash);
  bottle.rotation.z = Math.PI / 2; bottle.rotation.y = 0.5;
  kit.mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 12), kit.mat(0xd62828, { metalness: 0.4, roughness: 0.4 }), [1.3, 0.11, 0.6], trash);
  const bag = kit.mesh(new THREE.SphereGeometry(0.18, 10, 8), kit.mat(0xf2f2f2, { roughness: 0.5 }), [-1.4, 0.08, 0.7], trash);
  bag.scale.set(1.4, 0.45, 1);

  const blockTags = {
    Topsoil: label('Topsoil', new THREE.Vector3(-W / 2, (SUB + TOP) / 2, ZF), { cls: 'warm' }),
    Subsoil: label('Subsoil', new THREE.Vector3(-W / 2, (BED + SUB) / 2, ZF), { cls: 'warm' }),
    Bedrock: label('Bedrock', new THREE.Vector3(-W / 2, BED / 2, ZF), { cls: 'warm' }),
  };
  const wormTag = label('Earthworm', worms[0].segs[8]);
  const rootTag = label('Roots', new THREE.Vector3(-1.13, 2.0, ZF));
  const beetleTag = label('Beetle', beetle);
  const bactTag = label('Bacteria', new THREE.Vector3(0.95, 2.82, ZF + 0.14), { cls: 'cool' });
  const muddyTag = label('Muddy water', new THREE.Vector3(0, 0.1, ZF + 0.9), { cls: 'warm' });
  const oilTag = label('Oil', new THREE.Vector3(0.2, TOP + 0.05, 0.3));

  // ---------- Shake jar ----------
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xe6f4ff, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const jar = new THREE.Group();
  jar.position.set(JX, 0, 0);
  scene.add(jar);
  const JR = 0.85, JH = 3.0, IR = 0.81;
  const jarGlass = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, JH, 32, 1, true), glassMat);
  jarGlass.position.y = JH / 2; jarGlass.renderOrder = 3; jar.add(jarGlass);
  kit.mesh(new THREE.CylinderGeometry(JR + 0.04, JR + 0.04, 0.18, 32), kit.mat(0xd64545), [0, JH + 0.09, 0], jar);
  kit.mesh(new THREE.CylinderGeometry(JR, JR, 0.04, 32), glassMat, [0, 0.02, 0], jar).castShadow = false;
  const JL = [{ name: 'Sand', h: 0.7, map: sandTex }, { name: 'Silt', h: 0.5, map: siltTex }, { name: 'Clay', h: 0.35, map: clayTex }];
  const WATER_TOP = 2.65;
  const cylGeo = new THREE.CylinderGeometry(IR, IR, 1, 32);
  for (const L of JL) { L.mesh = kit.mesh(cylGeo, new THREE.MeshStandardMaterial({ map: L.map, roughness: 0.95 }), [0, 0, 0], jar); L.mesh.castShadow = false; }
  const jarWaterMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, transparent: true, opacity: 0.9, roughness: 0.2, depthWrite: false });
  const jarWater = new THREE.Mesh(cylGeo, jarWaterMat);
  jarWater.renderOrder = 2; jar.add(jarWater);
  const muddy = new THREE.Color(0x8a6a48), clear = new THREE.Color(0x9cc8e6);
  const GR = [{ n: 40, r: 0.055, c: 0xd8bd86 }, { n: 50, r: 0.032, c: 0xb08658 }, { n: 60, r: 0.02, c: 0x9b6a5a }];
  const grains = GR.map((G, k) => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(G.r, 6, 4), kit.mat(G.c), G.n);
    m.castShadow = false; jar.add(m); m.k = k;
    return m;
  });
  const humus = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.03, 0.06), kit.mat(0x2a1a10), 16);
  humus.castShadow = false; jar.add(humus);
  const jarTags = [
    label('Sand', new THREE.Vector3(JX + 1.15, 0.35, 0), { cls: 'warm' }),
    label('Silt', new THREE.Vector3(JX - 1.15, 0.95, 0), { cls: 'warm' }),
    label('Clay', new THREE.Vector3(JX + 1.15, 1.38, 0), { cls: 'warm' }),
    label('Water', new THREE.Vector3(JX - 1.2, 2.1, 0), { cls: 'cool' }),
    label('Humus', new THREE.Vector3(JX + 1.2, 2.7, 0), { cls: 'warm' }),
  ];
  // Settling windows (seconds after shaking stops): bigger grains sink faster.
  const WIN = [[0, 1.2], [0.6, 3.2], [2.2, 6.5]];
  function placeJar(tau, swirl) {
    let base = 0;
    JL.forEach((L, k) => {
      const h = Math.max(0.001, L.h * ss(WIN[k][0], WIN[k][1], tau));
      L.mesh.scale.y = h; L.mesh.position.y = 0.04 + base + h / 2; base += h;
    });
    const wb = 0.04 + base, wh = WATER_TOP - wb;
    jarWater.scale.y = wh; jarWater.position.y = wb + wh / 2;
    const m = 1 - ss(2.5, 7.5, tau);
    jarWaterMat.color.copy(clear).lerp(muddy, m); jarWaterMat.opacity = 0.3 + 0.6 * m;
    // Grains: swirl around while mixed, then fall into their layer.
    let lb = 0.04;
    grains.forEach((g, k) => {
      const L = JL[k];
      for (let i = 0; i < GR[k].n; i++) {
        const sd = k * 100 + i, r = 0.15 + 0.6 * rand(sd + 3000), a = rand(sd + 3100) * 6.28 + swirl * (0.6 + rand(sd + 3200));
        const ys = 0.2 + 2.3 * rand(sd + 3300) + 0.15 * Math.sin(swirl * 2 + i);
        const end = WIN[k][0] + (WIN[k][1] - WIN[k][0]) * (0.3 + 0.7 * rand(sd + 3400));
        const f = ss(-0.2, end, tau) * (tau > 0 ? 1 : 0);
        const yt = lb + L.h * (0.15 + 0.7 * rand(sd + 3500));
        dummy.position.set(r * Math.cos(a), ys + (yt - ys) * f, r * Math.sin(a));
        dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); g.setMatrixAt(i, dummy.matrix);
      }
      g.instanceMatrix.needsUpdate = true;
      lb += L.h;
    });
    for (let i = 0; i < 16; i++) {
      const r = 0.1 + 0.6 * rand(i + 3600), a = rand(i + 3700) * 6.28 + swirl * 0.5;
      const ys = 0.4 + 2 * rand(i + 3800), f = ss(0, 2.2, tau) * (tau > 0 ? 1 : 0);
      dummy.position.set(r * Math.cos(a), ys + (WATER_TOP - 0.01 - ys) * f, r * Math.sin(a));
      dummy.rotation.set(0, rand(i) * 3 + swirl, 0); dummy.updateMatrix(); humus.setMatrixAt(i, dummy.matrix);
    }
    humus.instanceMatrix.needsUpdate = true;
  }

  // ---------- Air in soil: a glass of dry soil ----------
  const cup = new THREE.Group();
  cup.position.set(BX, 0, 0);
  scene.add(cup);
  const CR = 0.7, CH = 2.0, SH = 1.1, SR = 0.68;
  const cupGlass = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, CH, 32, 1, true), glassMat);
  cupGlass.position.y = CH / 2; cupGlass.renderOrder = 3; cup.add(cupGlass);
  const drySoil = kit.mesh(new THREE.CylinderGeometry(SR, SR, 1, 32), new THREE.MeshStandardMaterial({ map: tex(speckle('#b08a62', ['#9a7650', '#c4a07a', '#8a6646'], 900, 8, 2.5)), roughness: 1 }), [0, SH / 2, 0], cup);
  drySoil.scale.y = SH; drySoil.castShadow = false;
  const wetSoil = kit.mesh(new THREE.CylinderGeometry(SR + 0.004, SR + 0.004, 1, 32), new THREE.MeshStandardMaterial({ map: tex(speckle('#4a3020', ['#2e1c11', '#5f3e28'], 900, 9, 2.5)), roughness: 0.6 }), [0, 0, 0], cup);
  wetSoil.castShadow = false;
  const cupWaterMat = new THREE.MeshStandardMaterial({ color: 0x7fb6e0, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false });
  const cupWater = new THREE.Mesh(new THREE.CylinderGeometry(SR, SR, 1, 32), cupWaterMat);
  cupWater.renderOrder = 2; cup.add(cupWater);
  const jug = new THREE.Group();
  jug.position.set(-0.68, 2.3, 0);
  cup.add(jug);
  kit.mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.7, 20), new THREE.MeshStandardMaterial({ color: 0xbfe3f5, transparent: true, opacity: 0.55, roughness: 0.1 }), [0, 0, 0], jug);
  kit.mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 16, Math.PI), kit.mat(0x8ab8d0), [-0.3, 0, 0], jug).rotation.z = Math.PI / 2;
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1, 8), new THREE.MeshStandardMaterial({ color: 0x6fb1e6, transparent: true, opacity: 0.7 }));
  cup.add(stream);
  const NBUB = 34;
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, roughness: 0.1 }), NBUB);
  bubbles.castShadow = false; bubbles.renderOrder = 4; cup.add(bubbles);
  const bubbleTag = label('Air bubbles', new THREE.Vector3(BX + 0.95, 1.35, 0), { cls: 'cool' });
  const wetTag = label('Wet soil', new THREE.Vector3(BX - 1.0, 0.95, 0), { cls: 'warm' });
  const dryTag = label('Dry soil', new THREE.Vector3(BX - 1.0, 0.25, 0), { cls: 'warm' });
  function placeCup(tau) {
    const pour = tau >= 0 && tau < 2.8;
    const wet = SH * ss(0.4, 5.5, tau);
    wetSoil.visible = wet > 0.01;
    wetSoil.scale.y = Math.max(0.001, wet); wetSoil.position.y = SH - wet / 2 + 0.002;
    const wl = 0.45 * ss(0, 2.6, tau) - 0.3 * ss(2.8, 6, tau);
    cupWater.visible = wl > 0.005;
    cupWater.scale.y = Math.max(0.001, wl); cupWater.position.y = SH + wl / 2;
    stream.visible = pour;
    const sy0 = 2.42, sy1 = SH + Math.max(0, wl);
    stream.scale.y = sy0 - sy1; stream.position.set(-0.36, (sy0 + sy1) / 2, 0);
    jug.rotation.z = -0.35 - 0.8 * ss(-0.3, 0.1, tau) * (1 - ss(2.7, 3.3, tau));
    let n = 0;
    for (let i = 0; i < NBUB; i++) {
      const e = 0.5 + rand(i + 4000) * 4.2, age = tau - e;
      const wetFront = SH - wet;
      const y0 = Math.max(wetFront, 0.1) + rand(i + 4100) * 0.25 * (SH - wetFront);
      const y = y0 + age * 0.55, top = SH + Math.max(0.03, wl);
      if (age < 0 || y > top) { dummy.scale.setScalar(0); }
      else { n++; dummy.scale.setScalar(0.7 + rand(i + 4200) * 0.8); }
      const a = rand(i + 4300) * 6.28, rr = y < SH ? SR + 0.012 : 0.2 + 0.4 * rand(i + 4400);
      dummy.position.set(rr * Math.cos(a), Math.min(y, top), rr * Math.sin(a));
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    return n;
  }

  // ---------- Rock slowly turns into soil ----------
  const rock = new THREE.Group();
  rock.position.set(RX, 0, 0);
  scene.add(rock);
  kit.mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.12, 32), kit.mat(0x8c8478), [0, 0.06, 0], rock);
  const rockMat = kit.mat(0x9a9a98, { flatShading: true });
  const chunkGeo = new THREE.DodecahedronGeometry(0.42, 1);
  const CH6 = [[0, 0.55, 0], [0.42, 0.42, 0.15], [-0.42, 0.45, 0.1], [0.1, 0.4, -0.4], [-0.15, 0.95, -0.05], [0.25, 0.9, 0.2], [-0.2, 0.42, 0.45]];
  const chunks = CH6.map((p, i) => {
    const m = kit.mesh(chunkGeo, rockMat, p, rock);
    m.base = new THREE.Vector3(...p); m.dir = new THREE.Vector3(p[0], 0.15, p[2]).normalize(); m.rot = rand(i + 4500) * 3;
    return m;
  });
  const boulder = kit.mesh(new THREE.DodecahedronGeometry(0.85, 1), rockMat, [0, 0.72, 0], rock);
  boulder.scale.set(1.15, 0.85, 1);
  const crackMat = new THREE.MeshBasicMaterial({ color: 0x2b2b2b });
  // Cracks sit on the boulder's (roughly ellipsoid) surface, facing outward.
  const cracks = [[-0.05, 0.3, 0.9, 0.15], [0.45, -0.2, 0.8, -0.5], [-0.5, -0.15, 0.8, 0.7], [0.1, 0.8, 0.5, 1.4]].map(([dx, dy, dz, r]) => {
    const n = new THREE.Vector3(dx, dy, dz).normalize(), k = 0.97 / Math.hypot(n.x / 0.98, n.y / 0.72, n.z / 0.85);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.45, 0.08), crackMat);
    c.position.set(n.x * k, 0.72 + n.y * k, n.z * k);
    c.lookAt(c.position.x + n.x, c.position.y + n.y, c.position.z + n.z); c.rotateZ(r); rock.add(c);
    return c;
  });
  const mossMat = kit.mat(0x6aa84f);
  const moss = chunks.map((c, i) => {
    const m = kit.mesh(new THREE.SphereGeometry(0.16, 8, 6), mossMat, [0, 0.33, 0.12], c);
    m.scale.set(1, 0.35, 1); m.rotation.x = 0.3 * (rand(i) - 0.5);
    return m;
  });
  const NPB = 70;
  const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.07, 0), rockMat, NPB);
  for (let i = 0; i < NPB; i++) {
    const r = 0.5 + rand(i + 4600) * 1.25, a = rand(i + 4700) * 6.28;
    dummy.position.set(r * Math.cos(a), 0.14, r * Math.sin(a)); dummy.rotation.set(rand(i) * 3, rand(i + 1) * 3, 0);
    dummy.scale.setScalar(0.6 + rand(i + 4800) * 1.2); dummy.updateMatrix(); pebbles.setMatrixAt(i, dummy.matrix);
  }
  rock.add(pebbles);
  const newSoil = kit.mesh(new THREE.CylinderGeometry(1.85, 1.9, 1, 32), new THREE.MeshStandardMaterial({ map: loamTex, roughness: 1 }), [0, 0, 0], rock);
  const rockTurf = new THREE.Group();
  rock.add(rockTurf);
  const rgrass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.24, 3), kit.mat(0x4f9a3a), 120);
  for (let i = 0; i < 120; i++) {
    const r = 0.75 + rand(i + 4900) * 1.0, a = rand(i + 5000) * 6.28;
    dummy.position.set(r * Math.cos(a), 0.1, r * Math.sin(a)); dummy.rotation.set((rand(i + 1) - 0.5) * 0.5, 0, (rand(i + 2) - 0.5) * 0.5);
    dummy.scale.setScalar(0.7 + rand(i + 5100) * 0.7); dummy.updateMatrix(); rgrass.setMatrixAt(i, dummy.matrix);
  }
  rockTurf.add(rgrass);
  plant(1.1, 0.95, 0.5, rockTurf);
  plant(-1.2, 0.6, 0.4, rockTurf);
  const flower = kit.mesh(new THREE.SphereGeometry(0.08, 8, 6), kit.mat(0xffc93c), [1.1, 0.58, 0.95], rockTurf);
  flower.castShadow = false;
  const cloud = new THREE.Group();
  cloud.position.set(0.2, 3.0, 0); cloud.scale.setScalar(0.7);
  rock.add(cloud);
  const cloudMat = kit.mat(0xf4f7fb);
  [[0, 0, 0, 0.45], [0.45, -0.05, 0, 0.35], [-0.45, -0.05, 0.05, 0.38], [0.15, 0.2, -0.1, 0.35]].forEach(([x, y, z, r]) => { kit.mesh(new THREE.SphereGeometry(r, 12, 8), cloudMat, [x, y, z], cloud).castShadow = false; });
  const NRR = 40, rrPos = new Float32Array(NRR * 6), rrGeo = new THREE.BufferGeometry();
  rrGeo.setAttribute('position', new THREE.BufferAttribute(rrPos, 3));
  const rockRain = new THREE.LineSegments(rrGeo, new THREE.LineBasicMaterial({ color: 0x6aa8e8 }));
  rockRain.frustumCulled = false; rock.add(rockRain);
  const stageName = s => (s < 0.5 ? 'Bare rock' : s < 1.5 ? 'Cracks' : s < 2.5 ? 'Small bits' : s < 3.4 ? 'First plants' : 'Soil');
  function placeRock(s, t) {
    const whole = s < 0.6;
    boulder.visible = whole; chunks.forEach(c => { c.visible = !whole; });
    cracks.forEach((c, i) => { c.visible = whole && s > 0.15 + i * 0.08; c.scale.y = Math.max(0.01, ss(0.15 + i * 0.08, 0.55, s)); });
    const sep = 0.28 * ss(0.4, 1.6, s), shrink = 1 - 0.45 * ss(1.4, 2.6, s), sink = 0.35 * ss(2.4, 4, s);
    chunks.forEach((c, i) => {
      c.position.copy(c.base).addScaledVector(c.dir, sep);
      c.position.y = c.base.y * (0.6 + 0.4 * shrink) - sink;
      c.rotation.set(0.25 * ss(0.4, 1.6, s) * Math.sin(c.rot), c.rot, 0.2 * ss(0.4, 1.6, s) * Math.cos(c.rot));
      c.scale.setScalar(shrink);
      moss[i].scale.set(1, 0.35, 1).multiplyScalar(Math.max(0.001, ss(2.0 + i * 0.08, 3.0 + i * 0.08, s)));
    });
    pebbles.count = Math.round(NPB * ss(1.3, 2.6, s));
    const sh = 0.02 + 0.5 * ss(2.4, 4, s);
    newSoil.scale.y = sh; newSoil.position.y = 0.12 + sh / 2;
    newSoil.visible = s > 2.3;
    rockTurf.position.y = 0.12 + sh;
    const g = Math.max(0.001, ss(3.0, 4, s));
    rockTurf.scale.set(1, g, 1); rockTurf.visible = s > 3.0;
    const rainy = s > 0.2 && s < 2.8;
    cloud.visible = rockRain.visible = rainy;
    if (rainy) {
      for (let i = 0; i < NRR; i++) {
        const x = -0.6 + rand(i + 5200) * 1.5, z = -0.4 + rand(i + 5300) * 0.8, y = 0.3 + 2.4 * (1 - ((rand(i + 5400) + t * 1.4) % 1));
        rrPos.set([x, y, z, x, y + 0.18, z], i * 6);
      }
      rrGeo.attributes.position.needsUpdate = true;
    }
  }
  const rockTag = label('', new THREE.Vector3(RX + 1.5, 1.2, 0.8), { cls: 'warm' });

  // ---------- Three pots: sand, clay, loam ----------
  const pots = new THREE.Group();
  scene.add(pots);
  const wood = kit.mat(0xa0703f);
  kit.mesh(new THREE.BoxGeometry(5.6, 0.08, 1.0), wood, [PCX, SHELF - 0.04, 0], pots);
  for (const x of [PCX - 2.7, PCX + 2.7]) for (const z of [-0.4, 0.4]) kit.mesh(new THREE.BoxGeometry(0.08, SHELF - 0.08, 0.08), wood, [x, (SHELF - 0.08) / 2, z], pots);
  const potMat = kit.mat(0xc8673a, { side: THREE.DoubleSide });
  const potGeo = new THREE.CylinderGeometry(0.6, 0.42, 0.9, 24, 1, true);
  const potFill = { Sand: sandTex, Clay: clayTex, Loam: loamTex };
  // Water model: puddle P soaks in at rate kin; the soil holds up to C; extra drains at rate kd into the cup.
  const MODEL = { Sand: { kin: 3, C: 0.15, kd: 4 }, Clay: { kin: 0.12, C: 0.8, kd: 0.5 }, Loam: { kin: 0.8, C: 0.5, kd: 1.5 } };
  const cupGeo = new THREE.CylinderGeometry(0.36, 0.33, 0.75, 24, 1, true);
  const potWaterMat = new THREE.MeshStandardMaterial({ color: 0x5aa6e6, transparent: true, opacity: 0.6, roughness: 0.1 });
  for (const p of POTS) {
    const g = new THREE.Group(); g.position.set(p.x, 0, 0); pots.add(g); p.g = g;
    const pot = kit.mesh(potGeo, potMat, [0, SHELF + 0.45, 0], g);
    pot.material = potMat;
    kit.mesh(new THREE.TorusGeometry(0.6, 0.04, 6, 24), potMat, [0, SHELF + 0.9, 0], g).rotation.x = Math.PI / 2;
    const soilMat = new THREE.MeshStandardMaterial({ map: potFill[p.name], roughness: 1, color: 0xffffff });
    const soilTop = kit.mesh(new THREE.CircleGeometry(0.565, 24), soilMat, [0, SOIL_TOP, 0], g);
    soilTop.rotation.x = -Math.PI / 2; soilTop.castShadow = false; p.soilMat = soilMat;
    const pud = kit.mesh(new THREE.CircleGeometry(0.565, 24), new THREE.MeshStandardMaterial({ color: 0x5aa6e6, transparent: true, opacity: 0.7, roughness: 0.05 }), [0, SOIL_TOP + 0.01, 0], g);
    pud.rotation.x = -Math.PI / 2; pud.castShadow = false; p.pud = pud;
    const cupG = new THREE.Mesh(cupGeo, glassMat); cupG.position.y = 0.375; cupG.renderOrder = 3; g.add(cupG);
    kit.mesh(new THREE.CircleGeometry(0.33, 24), glassMat, [0, 0.01, 0], g).rotation.x = -Math.PI / 2;
    const cw = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.32, 1, 24), potWaterMat); cw.renderOrder = 2; g.add(cw); p.cw = cw;
    const pourS = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1, 8), potWaterMat);
    pourS.scale.y = 3.3 - SOIL_TOP; pourS.position.set(-0.15, (3.3 + SOIL_TOP) / 2, 0); pourS.visible = false; g.add(pourS); p.pourS = pourS;
    p.drops = [];
    for (let j = 0; j < 6; j++) { const d = kit.mesh(new THREE.SphereGeometry(0.035, 6, 4), potWaterMat, [0, 0, 0], g); d.castShadow = false; p.drops.push(d); }
    p.tag = label(p.name, new THREE.Vector3(p.x, SOIL_TOP + 0.95, 0), { cls: 'big warm' });
    p.m = MODEL[p.name];
  }
  plant(0, 0.4, 0.3, POTS[0].g, kit.mat(0x8fae4a), 0.7).position.set(0.1, SOIL_TOP, 0.1);
  plant(0, 0.4, 0.35, POTS[1].g, kit.mat(0xb7b04a), 0.8).position.set(0.1, SOIL_TOP, 0.1);
  plant(0, 0.4, 0.62, POTS[2].g, leafMat, 1.25).position.set(0.05, SOIL_TOP, 0.05);
  const dryCol = new THREE.Color(0xffffff), wetCol = new THREE.Color(0x77706a);
  function resetPots() { for (const p of POTS) { p.P = 0; p.S = 0; p.out = 0; p.rate = 0; } }
  resetPots();
  function stepPots(dt, tau) {
    for (const p of POTS) {
      const pour = tau >= 0 && tau < 1.5 ? 1 / 1.5 : 0;
      p.P += pour * dt;
      const inf = Math.min(p.P, p.m.kin * dt); p.P -= inf; p.S += inf;
      const drain = Math.max(0, p.S - p.m.C) * p.m.kd * dt; p.S -= drain; p.out += drain;
      p.rate = drain / Math.max(dt, 1e-6);
    }
  }
  function drawPots(t) {
    for (const p of POTS) {
      p.pourS.visible = st.step === 5 && st.potT >= 0 && st.potT < 1.5;
      p.pud.visible = p.P > 0.01;
      p.pud.material.opacity = Math.min(0.75, 0.25 + p.P);
      p.pud.position.y = SOIL_TOP + 0.01 + 0.06 * p.P;
      p.soilMat.color.copy(dryCol).lerp(wetCol, Math.min(1, p.S / 0.8));
      const h = Math.max(0.001, 0.6 * p.out); p.cw.scale.y = h; p.cw.position.y = 0.02 + h / 2; p.cw.visible = p.out > 0.003;
      const y0 = SHELF - 0.1, y1 = 0.03 + h;
      p.drops.forEach((d, j) => {
        d.visible = p.rate > 0.015 * (j + 1) * (j + 1);
        d.position.set(0, y0 - ((t * 1.8 + j / 6) % 1) * (y0 - y1), 0);
      });
    }
  }

  // ---------- State and steps ----------
  const st = { step: 0, quiz: false, sel: -1, pulse: 0, jarT: -1.6, cupT: 0, rockS: 0, rockAuto: true, rockSlider: null, potT: 0, mode: 'bare', top: TOP, oilT: 0, worms: 1, wormsTo: 1, grassTo: 1 };
  placeJar(10, 0); placeCup(10); placeRock(4, 0); drawPots(0);
  const allTags = [...Object.values(blockTags), wormTag, rootTag, beetleTag, bactTag, muddyTag, oilTag, ...jarTags, bubbleTag, wetTag, dryTag, rockTag, ...POTS.map(p => p.tag)];

  const LAYER_INFO = [
    'Topsoil is dark and soft. It is full of <b>humus</b>, roots and tiny living things. Most plants grow here.',
    'Subsoil has more clay and stones and less humus, so it is <b>lighter</b> in colour. Long roots reach down here.',
    'Bedrock is <b>solid rock</b>. Over a very long time, its top slowly breaks up into the bits that make soil.',
  ];
  function pick(i) {
    st.sel = i; st.pulse = 0; ui.readout(LAYER_INFO[i]);
    const m = layers[i];
    outline.visible = true;
    outline.position.copy(m.position);
    outline.scale.set(W + 0.03, (m.geometry.parameters.height * m.scale.y) + 0.03, D + 0.03);
    Object.entries(blockTags).forEach(([n, tg], k) => { tg.el.style.outline = k === i ? '3px solid #ffd23f' : ''; });
  }
  function setMode(m) {
    st.mode = m; st.oilT = 0; st.top = TOP;
    ui.readout(m === 'bare' ? 'Rain hits the <b>bare soil</b> and carries the topsoil away.' : m === 'plants' ? 'Roots and leaves <b>hold the soil</b>. The rain soaks in instead of washing it away.' : 'Oil soaks down into the soil. Worms and other living things <b>cannot live</b> in poisoned soil.');
  }
  function setPotsReadout() {
    const f = p => `${Math.round(p.out * 100)}%`;
    ui.readout(`Water that ran out the bottom: Sand <b>${f(POTS[0])}</b>, Clay <b>${f(POTS[1])}</b>, Loam <b>${f(POTS[2])}</b>`);
  }

  function visibility(i, isQuiz) {
    const onBlock = isQuiz || i === 0 || i === 1 || i === 6;
    block.visible = onBlock;
    jar.visible = i === 2; cup.visible = i === 3; rock.visible = i === 4; pots.visible = i === 5;
    beetle.visible = i !== 6;
    rain.visible = i === 6 && st.mode !== 'oil';
    mud.visible = i === 6 && st.mode === 'bare';
    streams.forEach(m => { m.visible = mud.visible; });
    puddle.visible = i === 6 && st.mode === 'bare';
    stain.visible = oil.visible = trash.visible = i === 6 && st.mode === 'oil';
    lens.visible = i === 1 && st.lens;
    grass.visible = !(i === 6 && st.mode !== 'plants');
    turf.children.forEach(c => { if (c !== grass && c !== oil && c !== trash) c.visible = grass.visible; });
    life.children.forEach(c => { if (c.geometry && c.geometry.type === 'TubeGeometry') c.visible = grass.visible; });
    for (const tg of allTags) tg.show(false);
    if (i === 0) Object.values(blockTags).forEach(tg => tg.show(true));
    if (i === 1) { wormTag.show(true); rootTag.show(true); beetleTag.show(true); bactTag.show(!!st.lens); }
    if (i === 6) { blockTags.Topsoil.show(true); muddyTag.show(st.mode === 'bare'); oilTag.show(st.mode === 'oil'); }
    if (i === 3) { bubbleTag.show(true); wetTag.show(true); dryTag.show(true); }
    if (i === 4) rockTag.show(true);
    if (i === 5) POTS.forEach(p => p.tag.show(true));
    return onBlock;
  }

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.quiz = isQuiz;
      layers.forEach(m => m.material.emissive.setRGB(0, 0, 0));
      st.sel = -1; outline.visible = false;
      Object.values(blockTags).forEach(tg => { tg.el.style.outline = ''; });
      st.wormsTo = 1;
      if (i !== 6) { st.top = TOP; setTop(TOP); }
      if (i === 0) {
        go({ radius: 2.75, yaw: 0.45, pitch: 0.2, target: [0.1, 1.65, 0] });
        const row = ui.buttons(['Topsoil', 'Subsoil', 'Bedrock'].map((n, k) => ({ label: n, onClick: () => pick(k) })));
        row.select(0); pick(0);
      }
      if (i === 1) {
        st.lens = true;
        go({ radius: 1.3, yaw: 0.2, pitch: 0.12, target: [0.15, 2.5, ZF] });
        ui.toggle({ label: 'Magnifying glass', value: true, onChange: v => { st.lens = v; lens.visible = v; bactTag.show(v); } });
      }
      if (i === 2) {
        st.jarT = -1.6;
        go({ radius: 1.85, yaw: 0, pitch: 0.12, target: [JX, 1.45, 0] });
        ui.buttons([{ label: 'Shake the jar', onClick: () => { st.jarT = -1.6; } }]);
      }
      if (i === 3) {
        st.cupT = -0.3;
        go({ radius: 1.7, yaw: 0, pitch: 0.14, target: [BX, 1.4, 0] });
        ui.buttons([{ label: 'Pour water', onClick: () => { st.cupT = -0.3; } }]);
      }
      if (i === 4) {
        st.rockAuto = true; st.rockS = 0;
        go({ radius: 2.2, yaw: 0.25, pitch: 0.3, target: [RX, 1.3, 0] });
        st.rockSlider = ui.slider({ label: 'Time', min: 0, max: 4, step: 0.05, value: 0, format: stageName, onInput: v => { st.rockAuto = false; st.rockS = v; } });
        ui.readout('From one end of the slider to the other is <b>thousands of years</b>.');
      }
      if (i === 5) {
        st.potT = -0.3; resetPots();
        go({ radius: 1.8, width: 2.55, yaw: 0, pitch: 0.32, target: [PCX, 1.6, 0] });
        ui.buttons([{ label: 'Pour water', onClick: () => { st.potT = -0.3; resetPots(); } }]);
        setPotsReadout();
      }
      if (i === 6) {
        go({ radius: 2.9, yaw: 0.5, pitch: 0.22, target: [0, 2.0, 0.4] });
        const modes = ['bare', 'plants', 'oil'];
        const row = ui.buttons([{ label: 'Bare soil', onClick: () => { setMode('bare'); visibility(6, false); } }, { label: 'With plants', onClick: () => { setMode('plants'); visibility(6, false); } }, { label: 'Trash and oil', onClick: () => { setMode('oil'); visibility(6, false); } }]);
        setMode('bare'); row.select(modes.indexOf('bare'));
      }
      if (isQuiz) go({ radius: 2.9, yaw: -0.5, pitch: 0.25, target: [0, 1.7, 0] });
      visibility(i, isQuiz);
    },
    update(dt, t) {
      const i = st.step;
      let moving = false;
      if (i === 0 && st.sel >= 0) {
        st.pulse += dt;
        const k = st.pulse < 2.4 ? 0.06 + 0.06 * Math.sin(st.pulse * 5) : 0.06;
        layers.forEach((m, j) => m.material.emissive.setRGB(j === st.sel ? k : 0, j === st.sel ? k * 0.85 : 0, j === st.sel ? k * 0.4 : 0));
        outline.material.color.setHSL(0.13, 1, 0.55 + 0.15 * Math.sin(st.pulse * 5));
        moving = st.pulse < 2.5;
      }
      if (i === 1 || i === 6 || st.quiz) {
        // Worms hide when the soil is poisoned.
        st.wormsTo = i === 6 && st.mode === 'oil' ? 0 : 1;
        st.worms += (st.wormsTo - st.worms) * Math.min(1, dt * 1.5);
        worms.forEach(w => { w.s = Math.max(0.001, st.worms); });
        placeWorms(t);
        moving = true;
      }
      if (i === 1) {
        beetle.position.x = -0.75 + 0.15 * Math.sin(t * 0.5);
        if (st.lens) placeBacteria(t);
      }
      if (i === 2) {
        st.jarT += dt;
        const mix = st.jarT < 0;
        st.swirl = (st.swirl || 0) + dt * (mix ? 3 : 3 * Math.max(0, 1 - st.jarT / 1.5));
        jar.rotation.z = mix ? 0.12 * Math.sin(st.jarT * 22) : 0;
        jar.position.y = mix ? 0.06 * Math.abs(Math.sin(st.jarT * 11)) : 0;
        placeJar(st.jarT, st.swirl);
        jarTags.forEach((tg, k) => tg.show(k < 3 ? st.jarT > WIN[k][1] * 0.75 : k === 3 ? st.jarT > 5 : st.jarT > 1.5));
        moving = st.jarT < 8;
      }
      if (i === 3) {
        st.cupT += dt;
        placeCup(st.cupT);
        moving = st.cupT < 7;
      }
      if (i === 4) {
        if (st.rockAuto && st.rockS < 4) { st.rockS = Math.min(4, st.rockS + dt * 0.8); st.rockSlider?.set(st.rockS); }
        placeRock(st.rockS, t);
        rockTag.text = stageName(st.rockS);
        moving = (st.rockAuto && st.rockS < 4) || (st.rockS > 0.2 && st.rockS < 2.8);
      }
      if (i === 5) {
        st.potT += dt;
        if (st.potT < 14) { stepPots(dt, st.potT); moving = true; setPotsReadout(); }
        drawPots(t);
      }
      if (i === 6) {
        if (st.mode === 'bare') {
          st.top = Math.max(TOP - 0.35, st.top - dt * 0.1);
          setTop(st.top);
          placeRain(t, st.top);
          placeMud(t, st.top);
          const e = (TOP - st.top) / 0.35;
          puddle.scale.setScalar(0.25 + 0.9 * e);
          streamTex.offset.y = (t * 0.8) % 1;
          streams.forEach(m => { m.scale.y = st.top; m.position.y = st.top / 2; });
        }
        if (st.mode === 'plants') { st.top = TOP; setTop(TOP); placeRain(t, TOP + 0.3); }
        if (st.mode === 'oil') {
          st.oilT += dt;
          const sp = ss(0, 3, st.oilT);
          oil.scale.setScalar(0.3 + 0.7 * sp);
          const h = 0.1 + 0.9 * ss(0.3, 5, st.oilT);
          stain.scale.set(0.5 + 0.7 * sp, h, 1); stain.position.set(0.2, TOP - h / 2, ZF + 0.006);
        }
        moving = true;
      }
      return moving;
    },
  };
}
