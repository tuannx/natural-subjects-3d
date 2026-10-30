// The rock cycle (middle school).
// Stations: three rock samples; a volcano cross-section (intrusive and extrusive igneous rock); a slab of
// crystals whose size depends on how fast magma cools; a landscape where rock is weathered, eroded and
// deposited; a pile of sediment squeezed into rock; a rock under heat and pressure (metamorphism,
// temperature = 15 + 25 x depth); and the whole cycle as arrows between five stages.
import { rand, canvasTex, rockTexture, fossilTexture, arrow } from '../_shared/geo.js';

const fmt = n => Math.round(n).toLocaleString('en-US');

// Metamorphism: temperature rises about 25 °C per km; pressure about 260 times air pressure per km of rock.
const tempAt = km => 15 + 25 * km;
const SHALE_SERIES = [[0, 'shale', 'Shale', 'sedimentary rock made of mud'], [6, 'slate', 'Slate', 'metamorphic: tiny new minerals line up in flat sheets'],
  [14, 'schist', 'Schist', 'metamorphic: bigger, shiny flakes of mica'], [22, 'gneiss', 'Gneiss', 'metamorphic: minerals sorted into light and dark bands'], [28, 'magma', 'Starts to melt', 'it is hot enough to melt into magma']];
const LIME_SERIES = [[0, 'limestone', 'Limestone', 'sedimentary rock made of shells (calcite)'], [7, 'marble', 'Marble', 'metamorphic: the calcite grows into new, interlocking crystals']];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  scene.background = new THREE.Color(0xdcecf8);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9bb0, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(4, 9, 6);
  scene.add(sun);

  const st = { step: 0, quiz: false, time: 0, sample: 0, focus: 'deep', cool: 20, magma: 'light', process: 'all', burial: 3, depthKm: 10, parent: 'shale', cyc: null, cycK: 0 };
  const stations = [];
  const station = () => { const g = new THREE.Group(); scene.add(g); stations.push(g); return g; };
  const allTags = [];
  const tag = (t, at, o) => { const l = label(t, at, o); allTags.push(l); return l; };
  const texMat = (kind, opts = {}) => new THREE.MeshStandardMaterial({ map: rockTexture(THREE, kind), roughness: 0.85, ...opts });
  const glow = new THREE.MeshBasicMaterial({ color: 0xff8c1a });
  const magmaMat = new THREE.MeshStandardMaterial({ map: rockTexture(THREE, 'magma'), emissive: 0xff5a00, emissiveIntensity: 0.6, roughness: 0.6 });

  // A rock lump: a box rounded toward an ellipsoid with a bumpy surface; keeps box UVs so textures look right.
  function lumpGeo(sx, sy, sz, seed) {
    const g = new THREE.BoxGeometry(1, 1, 1, 6, 6, 6), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = v.clone().normalize();
      const key = Math.round(v.x * 12) * 7 + Math.round(v.y * 12) * 13 + Math.round(v.z * 12) * 29 + seed;
      v.lerp(n.multiplyScalar(0.62), 0.7).multiplyScalar(0.92 + rand(key) * 0.16);
      p.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
    }
    g.computeVertexNormals();
    return g;
  }

  // ============================================================ A. Three samples
  const samples = station();
  const SAMPLES = [
    { kind: 'granite', name: 'Granite', fam: 'Igneous', text: '<b>Igneous rock</b> forms when melted rock cools and hardens. Granite is made of interlocking crystals of different minerals.' },
    { kind: 'sandstone', name: 'Sandstone', fam: 'Sedimentary', text: '<b>Sedimentary rock</b> forms from bits of other rocks, shells or mud that settle in layers and are pressed and glued together. Sandstone is made of sand grains.' },
    { kind: 'gneiss', name: 'Gneiss', fam: 'Metamorphic', text: '<b>Metamorphic rock</b> forms when heat and pressure deep underground change a rock without melting it. Gneiss has bands of light and dark minerals.' },
  ];
  const stands = SAMPLES.map((s, i) => {
    const g = new THREE.Group();
    g.position.x = (i - 1) * 2.1;
    samples.add(g);
    kit.mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.3, 24), kit.mat(0xf2efe8), [0, 0.15, 0], g);
    const rock = kit.mesh(lumpGeo(1.2, 0.8, 0.95, i * 50), texMat(s.kind), [0, 0.75, 0], g);
    g.rock = rock;
    const at = new THREE.Object3D(); at.position.set(0, i === 1 ? 1.55 : -0.15, i === 1 ? 0 : 0.75); g.add(at);
    g.tag = tag(`${s.fam}: ${s.name}`, at, { cls: i === 0 ? 'warm' : i === 1 ? '' : 'cool' });
    return g;
  });
  kit.mesh(new THREE.BoxGeometry(7, 0.2, 2), kit.mat(0xb08968), [0, -0.1, 0], samples);

  // ============================================================ B. Volcano cross-section
  const volc = station();
  const groundSide = texMat('sandstone'); groundSide.map = groundSide.map.clone(); groundSide.map.repeat.set(3, 1); groundSide.map.needsUpdate = true;
  kit.mesh(new THREE.BoxGeometry(8, 3, 3), [groundSide, groundSide, kit.mat(0x8fbf6a, { roughness: 1 }), groundSide, groundSide, groundSide], [0, -1.5, 0], volc);
  // Volcano: half cone cut open at the front.
  const VX = 0.6;
  kit.mesh(new THREE.ConeGeometry(1.6, 1.6, 32, 1, true, Math.PI / 2, Math.PI), kit.mat(0x6b5b53, { roughness: 1, side: THREE.DoubleSide }), [VX, 0.8, 1.5], volc);
  { const sh = new THREE.Shape(); sh.moveTo(-1.6, 0); sh.lineTo(1.6, 0); sh.lineTo(0.12, 1.6); sh.lineTo(-0.12, 1.6);
    kit.mesh(new THREE.ShapeGeometry(sh), kit.mat(0x7a6a60, { roughness: 1 }), [VX, 0, 1.505], volc); }
  // Magma chamber and pipe on the front face.
  const chamber = kit.mesh(new THREE.CircleGeometry(0.75, 32), magmaMat, [VX - 0.3, -1.9, 1.51], volc);
  chamber.scale.y = 0.5;
  kit.mesh(new THREE.PlaneGeometry(0.16, 3.3), glow, [VX, -0.05, 1.512], volc);
  // Cooled intrusion (granite) beside the chamber.
  const pluton = kit.mesh(new THREE.CircleGeometry(0.6, 28), texMat('granite'), [-2.4, -1.6, 1.51], volc);
  pluton.scale.y = 0.6;
  // Lava flow down the right slope (scrolling texture) that cools into dark basalt at its end.
  const lavaTex = rockTexture(THREE, 'magma').clone(); lavaTex.needsUpdate = true;
  const lavaMat = new THREE.MeshBasicMaterial({ map: lavaTex });
  const lava = kit.mesh(new THREE.BoxGeometry(2.1, 0.05, 0.34), lavaMat, [VX + 0.86, 0.82, 1.2], volc);
  lava.rotation.z = -0.78;
  const basaltFlow = kit.mesh(new THREE.BoxGeometry(1.6, 0.12, 1.2), texMat('basalt'), [VX + 2.4, 0.06, 0.9], volc);
  const smoke = Array.from({ length: 6 }, (_, i) => kit.mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, transparent: true, opacity: 0.6, depthWrite: false }), [VX, 1.7, 1.2], volc));
  const blobs = Array.from({ length: 8 }, () => kit.mesh(new THREE.SphereGeometry(0.07, 10, 8), glow, [0, 0, 0], volc));
  const deepTag = tag('Cools slowly: granite', new THREE.Vector3(-2.4, -1.25, 1.5), { cls: 'warm' });
  const chamberTag = tag('Magma chamber', new THREE.Vector3(VX - 0.3, -1.6, 1.5));
  const surfTag = tag('Cools fast: basalt', new THREE.Vector3(VX + 2.5, 0.2, 0.9), { cls: 'cool' });
  const lavaTag = tag('Lava', new THREE.Vector3(VX + 1.0, 1.0, 0.9), { cls: 'warm' });

  // ============================================================ C. Crystal slab
  const slab = station();
  kit.mesh(new THREE.BoxGeometry(4.4, 0.25, 3.2), kit.mat(0x5c5046), [0, -0.125, 0], slab);
  const MAXC = 1700;
  const crystalGeo = new THREE.BoxGeometry(1, 1, 1);
  const crystals = new THREE.InstancedMesh(crystalGeo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }), MAXC);
  crystals.frustumCulled = false;
  slab.add(crystals);
  const glass = kit.mesh(new THREE.BoxGeometry(4, 0.3, 2.8), new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 0.08, metalness: 0.2 }), [0, 0.15, 0], slab);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), SC = new THREE.Vector3(), E = new THREE.Euler(), CC = new THREE.Color();
  const PALETTE = {
    light: ['#f2eee6', '#f2eee6', '#e7a690', '#efc2b0', '#2b2a2a', '#b9b4ad'],   // quartz/feldspar (white, pink), mica (black)
    dark: ['#262626', '#3a3a3a', '#d9d6cf', '#bdbab3', '#5d7a3a', '#2f2f2f'],    // pyroxene (black), plagioclase (white), olivine (green)
  };
  const ROCKS = { light: ['Granite', 'Rhyolite', 'Obsidian (natural glass)'], dark: ['Gabbro', 'Basalt', 'Volcanic glass'] };
  function buildCrystals() {
    const v = st.cool;
    const isGlass = v >= 90;
    glass.visible = isGlass; crystals.visible = !isGlass;
    if (isGlass) return;
    // Cell size: 0.55 (very slow) down to 0.07 (fast).
    const size = 0.07 * Math.pow(0.55 / 0.07, 1 - v / 89);
    const nx = Math.max(1, Math.floor(4 / size)), nz = Math.max(1, Math.floor(2.8 / size));
    let n = 0;
    const cols = PALETTE[st.magma];
    for (let ix = 0; ix < nx && n < MAXC; ix++) for (let iz = 0; iz < nz && n < MAXC; iz++) {
      const h = ix * 977 + iz * 131 + (st.magma === 'dark' ? 5 : 0);
      const s = size * (0.75 + rand(h) * 0.5);
      P.set(-2 + (ix + 0.5) * (4 / nx) + (rand(h + 1) - 0.5) * size * 0.3, s * 0.3, -1.4 + (iz + 0.5) * (2.8 / nz) + (rand(h + 2) - 0.5) * size * 0.3);
      E.set((rand(h + 3) - 0.5) * 0.3, rand(h + 4) * Math.PI, (rand(h + 5) - 0.5) * 0.3); Q.setFromEuler(E);
      SC.set(s * (0.9 + rand(h + 6) * 0.5), s * 0.6, s * (0.7 + rand(h + 7) * 0.4));
      M4.compose(P, Q, SC);
      crystals.setMatrixAt(n, M4);
      crystals.setColorAt(n, CC.set(cols[Math.floor(rand(h + 8) * cols.length)]));
      n++;
    }
    crystals.count = n;
    crystals.instanceMatrix.needsUpdate = true;
    if (crystals.instanceColor) crystals.instanceColor.needsUpdate = true;
  }
  const slabTag = tag('', new THREE.Vector3(0, 0.45, 0), { cls: 'big' });
  function slabReadout() {
    const v = st.cool, names = ROCKS[st.magma];
    let how, size, rock;
    if (v < 40) { how = 'very slowly, deep underground (thousands to millions of years)'; size = 'large, a few millimetres or more: easy to see'; rock = names[0]; }
    else if (v < 90) { how = 'quickly, as lava at the surface (days to years)'; size = 'tiny, smaller than about 1 mm: too small to see without a magnifier'; rock = names[1]; }
    else { how = 'extremely fast, for example lava splashing into water (minutes)'; size = 'none at all: the atoms had no time to line up'; rock = names[2]; }
    slabTag.text = rock;
    ui.readout(`Cooling: <b>${how}</b><br>Crystals: <b>${size}</b><br>Rock: <b>${rock}</b> (${v < 40 ? 'intrusive' : 'extrusive'})`);
  }

  // ============================================================ D. Weathering, erosion, deposition
  const land = station();
  const SEA_X = 1.8;
  const hAt = (x, z) => {
    const m = Math.max(0, 1 - Math.hypot((x + 2.6) / 1.9, z / 1.6)) ** 1.3 * 2.2;      // mountain
    const valley = -0.25 * Math.exp(-(z * z) / 0.15) * (x > -1.6 ? 1 : 0);              // river valley
    const coast = x > SEA_X ? -(x - SEA_X) * 0.6 : 0;                                   // slope into the sea
    return Math.max(-1.1, 0.25 + m + valley + coast + 0.04 * Math.sin(x * 3 + z * 2));
  };
  {
    const geo = new THREE.PlaneGeometry(8, 3, 64, 24);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = hAt(x, z);
      p.setY(i, y);
      if (y < 0) c.set(0xd9c08a); else if (y > 1.3) c.set(0x8d8178).lerp(new THREE.Color(0xffffff), Math.min(1, (y - 1.7) * 2.2) * (y > 1.7 ? 1 : 0)); else c.set(0x7fae5c).lerp(new THREE.Color(0x8d8178), Math.max(0, (y - 0.6) / 0.7));
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    land.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
    // Front skirt so the block looks solid.
    const sh = new THREE.Shape(); sh.moveTo(-4, -1.6);
    for (let x = -4; x <= 4.001; x += 0.125) sh.lineTo(x, hAt(x, 1.5));
    sh.lineTo(4, -1.6);
    kit.mesh(new THREE.ShapeGeometry(sh), groundSide, [0, 0, 1.5], land);
  }
  const sea = new THREE.Mesh(new THREE.BoxGeometry(4 - SEA_X + 0.6, 1.2, 3), new THREE.MeshStandardMaterial({ color: 0x3d8fd6, transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false }));
  sea.position.set((SEA_X - 0.6 + 4) / 2, -0.45, 0); sea.renderOrder = 2;
  land.add(sea);
  // River: a blue ribbon from the mountain to the sea along z = 0.
  const riverPts = [];
  for (let x = -1.7; x <= SEA_X + 0.3; x += 0.1) riverPts.push(new THREE.Vector3(x, hAt(x, 0) + 0.03, Math.sin(x * 1.3) * 0.12));
  const riverCurve = new THREE.CatmullRomCurve3(riverPts);
  land.add(new THREE.Mesh(new THREE.TubeGeometry(riverCurve, 60, 0.07, 6), new THREE.MeshStandardMaterial({ color: 0x3d8fd6, roughness: 0.3 })));
  // Sediment grains travelling down the river and settling on the sea floor.
  const NG = 90, gPos = new Float32Array(NG * 3), gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  const grains = new THREE.Points(gGeo, new THREE.PointsMaterial({ color: 0x8a5a2b, size: 0.07 }));
  grains.frustumCulled = false;
  land.add(grains);
  const deposit = kit.mesh(new THREE.BoxGeometry(1.6, 1, 2.6), texMat('sand'), [3.0, -1.1, 0], land);
  // Boulders breaking off the mountain and tumbling down.
  const boulderGeo = lumpGeo(0.22, 0.18, 0.2, 7), boulderMat = kit.mat(0x8d8178, { flatShading: true, roughness: 1 });
  const boulders = Array.from({ length: 5 }, () => kit.mesh(boulderGeo, boulderMat, [0, 0, 0], land));
  const weathTag = tag('Weathering', new THREE.Vector3(-2.6, 2.5, 0), { cls: 'cool' });
  const erosTag = tag('Erosion', new THREE.Vector3(-0.2, 0.6, 0.4), { cls: 'cool' });
  const depoTag = tag('Deposition', new THREE.Vector3(3.0, -0.3, 1.4), { cls: 'warm' });
  const sunLand = kit.mesh(new THREE.SphereGeometry(0.35, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffd34d }), [2.6, 2.6, -1], land);
  const sunTag = tag('Sun', sunLand, { cls: 'warm' });

  // ============================================================ E. Compaction and cementation
  const pile = station();
  const LAYERS = [['sand', 'sandstone', 'Sand'], ['mud', 'shale', 'Mud'], ['sand', 'limestone', 'Shells'], ['sand', 'sandstone', 'Sand'], ['mud', 'shale', 'Mud'], ['sand', 'sandstone', 'Sand'], ['mud', 'shale', 'Mud']];
  const shellLoose = texMat('limestone'), shellLooseMat = shellLoose;
  const layerMeshes = LAYERS.map(([loose, rock], i) => {
    const looseMat = loose === 'mud' ? texMat('mud') : (i === 2 ? shellLooseMat : texMat('sand'));
    const rockMat = texMat(rock);
    const m = kit.mesh(new THREE.BoxGeometry(3, 1, 2), looseMat, [0, 0, 0], pile);
    m.looseMat = looseMat; m.rockMat = rockMat;
    return m;
  });
  const shellIcon = new THREE.MeshBasicMaterial({ map: fossilTexture(THREE, 'shell', '#fdf6e3'), transparent: true, depthWrite: false });
  const fossils = [-0.9, 0.1, 0.9].map(x => { const f = kit.mesh(new THREE.PlaneGeometry(0.4, 0.4), shellIcon, [x, 0, 1.005], layerMeshes[2]); f.castShadow = false; return f; });
  // Water drops squeezed out of the pile.
  const drops = Array.from({ length: 10 }, () => kit.mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0x4cc9f0, roughness: 0.2 }), [0, 0, 0], pile));
  kit.mesh(new THREE.BoxGeometry(3.4, 0.15, 2.4), kit.mat(0x6b5b53), [0, -0.075, 0], pile);
  const bottomTag = tag('', new THREE.Vector3(1.55, 0.3, 1.0));
  const topTag = tag('New layers on top', new THREE.Vector3(0, 3.2, 0), { cls: 'cool' });
  function placePile() {
    // Layer i (0 = bottom) is buried under (shown - 1 - i) layers. Buried layers get thinner and turn to rock.
    const shown = 1 + st.burial;
    let y = 0;
    layerMeshes.forEach((m, i) => {
      m.visible = i < shown;
      if (!m.visible) return;
      const above = shown - 1 - i;
      const t = Math.min(1, above / 4);
      const h = 0.62 * (1 - 0.35 * t);
      m.scale.y = h;
      m.position.y = y + h / 2;
      m.material = above >= 3 ? m.rockMat : m.looseMat;
      y += h;
    });
    st.pileTop = y;
    topTag.at.y = y + 0.25;
    const above = shown - 1;
    const porosity = Math.round(40 - 30 * Math.min(1, above / 4));
    const rock = above >= 3;
    bottomTag.text = rock ? 'Sandstone' : 'Loose sand';
    bottomTag.at.y = Math.max(0.15, layerMeshes[0].scale.y * 0.5);
    ui.readout(`Layers on top of the bottom sand: <b>${above}</b><br>Space between the grains: <b>about ${porosity}%</b> (it starts at about 40% in loose sand)<br>` +
      (rock ? 'The grains are pressed together and glued by minerals: the sand has become <b>sandstone</b>.' : 'The grains are still <b>loose</b>: you could dig them with your fingers.'));
  }

  // ============================================================ F. Heat and pressure
  const press = station();
  const sampleMat = new THREE.MeshStandardMaterial({ map: rockTexture(THREE, 'shale'), roughness: 0.8 });
  const sample = kit.mesh(new THREE.BoxGeometry(1.8, 1.2, 1.4), sampleMat, [0, 0.6, 0], press);
  const plateMat = kit.mat(0x8d99ae, { metalness: 0.5, roughness: 0.4 });
  const topPlate = kit.mesh(new THREE.BoxGeometry(2.6, 0.2, 2), plateMat, [0, 1.3, 0], press);
  kit.mesh(new THREE.BoxGeometry(2.6, 0.2, 2), plateMat, [0, -0.1, 0], press);
  const heat = kit.mesh(new THREE.BoxGeometry(2.8, 0.12, 2.2), new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.6 }), [0, -0.27, 0], press);
  const pArrows = [-0.7, 0.7].map(x => { const a = arrow(THREE, 0x1d3557, { radius: 0.06, head: 0.25 }); a.rotation.z = Math.PI; a.position.set(x, 2.4, 0); a.setLength(0.8); press.add(a); return a; });
  const sideArrows = [-1, 1].map(s => { const a = arrow(THREE, 0x1d3557, { radius: 0.05, head: 0.22 }); a.rotation.z = s > 0 ? Math.PI / 2 : -Math.PI / 2; a.position.set(s * 2.0, 0.6, 0); a.setLength(0.6); press.add(a); return a; });
  const flames = Array.from({ length: 7 }, (_, i) => kit.mesh(new THREE.ConeGeometry(0.12, 0.4, 8), glow, [-1.2 + i * 0.4, -0.55, 0.9], press));
  const pressTag = tag('', new THREE.Vector3(0, 1.6, 0.6), { cls: 'big' });
  const heatTag = tag('Heat from below', new THREE.Vector3(1.6, -0.6, 1.0), { cls: 'warm' });
  const squeezeTag = tag('Pressure', new THREE.Vector3(0, 3.05, 0), { cls: 'cool' });
  function rockAt() {
    const series = st.parent === 'shale' ? SHALE_SERIES : LIME_SERIES;
    let r = series[0];
    for (const s of series) if (st.depthKm >= s[0]) r = s;
    return r;
  }
  function placePress() {
    const [, kind, name, what] = rockAt();
    const melt = kind === 'magma';
    sampleMat.map = rockTexture(THREE, kind);
    sampleMat.emissive.set(melt ? 0xff4400 : 0x000000);
    sampleMat.emissiveIntensity = melt ? 0.5 : 0;
    sampleMat.needsUpdate = true;
    const k = st.depthKm / 30;
    sample.scale.set(1 + 0.12 * k, 1 - 0.22 * k, 1);
    sample.position.y = 0.6 * sample.scale.y;
    topPlate.position.y = 1.2 * sample.scale.y + 0.1;
    pArrows.forEach(a => { a.position.y = topPlate.position.y + 1.1; a.setLength(0.5 + 0.7 * k); });
    sideArrows.forEach(a => a.setLength(0.3 + 0.6 * k));
    heat.material.opacity = 0.25 + 0.7 * k;
    pressTag.text = name;
    squeezeTag.at.y = topPlate.position.y + 1.2;
    pressTag.at.y = topPlate.position.y + 0.25;
    const T = tempAt(st.depthKm), atm = 260 * st.depthKm;
    ui.readout(`Depth: <b>${st.depthKm} km</b> · temperature ≈ 15 + 25 × ${st.depthKm} = <b>${fmt(T)} °C</b><br>Pressure: about <b>${fmt(atm)} times</b> the air pressure at the surface<br>Rock: <b>${name}</b>, ${what}.`);
  }

  // ============================================================ G. The whole cycle
  const cyc = station();
  const NODES = {
    magma: { pos: [0, -1.55, 0], name: 'Magma' },
    igneous: { pos: [-2.3, -0.35, 0], name: 'Igneous rock' },
    sediment: { pos: [-1.35, 1.75, 0], name: 'Sediment' },
    sedimentary: { pos: [1.35, 1.75, 0], name: 'Sedimentary rock' },
    metamorphic: { pos: [2.3, -0.35, 0], name: 'Metamorphic rock' },
  };
  const nodeObj = {};
  for (const [k, n] of Object.entries(NODES)) {
    const g = new THREE.Group(); g.position.set(...n.pos); cyc.add(g); nodeObj[k] = g;
    if (k === 'magma') kit.mesh(new THREE.SphereGeometry(0.5, 24, 16), magmaMat, [0, 0, 0], g).scale.y = 0.75;
    else if (k === 'sediment') {
      for (let i = 0; i < 22; i++) kit.mesh(new THREE.SphereGeometry(0.09 + rand(i) * 0.07, 8, 6), kit.mat(['#d9b77f', '#b08a5a', '#8d8178', '#e6cf9f'][i % 4], { roughness: 1 }), [(rand(i + 3) - 0.5) * 0.8, -0.2 + rand(i + 5) * 0.35 * (1 - Math.abs(rand(i + 3) - 0.5)), (rand(i + 7) - 0.5) * 0.6], g);
    } else kit.mesh(lumpGeo(0.95, 0.65, 0.75, k.length * 9), texMat({ igneous: 'granite', sedimentary: 'sandstone', metamorphic: 'gneiss' }[k]), [0, 0, 0], g);
    const at = new THREE.Object3D(); at.position.set(0, k === 'magma' ? -0.6 : -0.55, 0.3); g.add(at);
    n.tag = tag(n.name, at, { cls: k === 'magma' ? 'warm' : '' });
  }
  // Arrows between stages: [from, to, process, bend].
  const LINKS = [
    ['magma', 'igneous', 'cool', 0.35], ['igneous', 'sediment', 'weather', 0.3], ['sediment', 'sedimentary', 'compact', 0.3],
    ['sedimentary', 'metamorphic', 'heat', 0.3], ['metamorphic', 'magma', 'melt', 0.35],
    ['igneous', 'metamorphic', 'heat', -0.15], ['metamorphic', 'sediment', 'weather', -0.25], ['sedimentary', 'sediment', 'weather', -0.35],
  ];
  const PROC = {
    melt: { label: 'Melting', energy: 'inside', text: '<b>Melting</b>: deep underground, where it is hot enough, any rock can melt into magma.' },
    cool: { label: 'Cooling', energy: 'inside', text: '<b>Cooling</b>: magma or lava cools and crystallises into igneous rock.' },
    weather: { label: 'Weathering and erosion', energy: 'sun', text: '<b>Weathering and erosion</b>: any rock that reaches the surface is broken into sediment and carried away by water, wind, ice and gravity. Rocks get to the surface when uplift pushes them up and the rock above wears away.' },
    compact: { label: 'Compaction and cementation', energy: 'sun', text: '<b>Deposition, compaction and cementation</b>: sediment settles in layers, is pressed down by more layers and glued into sedimentary rock.' },
    heat: { label: 'Heat and pressure', energy: 'inside', text: '<b>Heat and pressure</b>: buried rock, igneous or sedimentary, changes into metamorphic rock without melting.' },
  };
  const arrowMats = [], links = [];
  const V0 = new THREE.Vector3(), V1 = new THREE.Vector3(), VM = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  for (const [a, b, proc, bend] of LINKS) {
    V0.set(...NODES[a].pos); V1.set(...NODES[b].pos);
    const dir = V1.clone().sub(V0), len = dir.length();
    dir.normalize();
    const start = V0.clone().addScaledVector(dir, 0.65), end = V1.clone().addScaledVector(dir, -0.7);
    // Bend outward from the cycle's centre.
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const out = mid.clone().setZ(0).sub(new THREE.Vector3(0, 0.3, 0)).normalize();
    VM.copy(mid).addScaledVector(out, bend * len * 0.5);
    const curve = new THREE.QuadraticBezierCurve3(start, VM.clone(), end);
    const main = bend > 0;
    const m = new THREE.MeshStandardMaterial({ color: main ? 0x5c677d : 0x9aa5b8, roughness: 0.6 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, main ? 0.05 : 0.03, 6), m);
    const head = new THREE.Mesh(new THREE.ConeGeometry(main ? 0.13 : 0.09, 0.3, 12), m);
    head.position.copy(curve.getPoint(1));
    head.quaternion.setFromUnitVectors(UP, curve.getTangent(1));
    cyc.add(tube, head);
    arrowMats.push(m);
    links.push({ proc, curve, m, main });
  }
  const traveler = kit.mesh(new THREE.SphereGeometry(0.12, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffd60a }), [0, 0, 0], cyc);
  // Energy sources: the Sun (top) and Earth's hot interior (bottom).
  const sunC = kit.mesh(new THREE.SphereGeometry(0.32, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffd34d }), [0, 2.75, -0.5], cyc);
  const coreC = kit.mesh(new THREE.SphereGeometry(0.28, 20, 12), new THREE.MeshBasicMaterial({ color: 0xff5a1f }), [2.15, -2.3, -0.5], cyc);
  const sunCTag = tag('Energy from the Sun', sunC, { cls: 'warm' });
  const coreCTag = tag("Earth's inner heat", coreC, { cls: 'warm' });
  const procTag = tag('', traveler, { cls: 'cool' });
  function setProcess(p) {
    st.process = p; st.cycK = 0;
    links.forEach(l => l.m.color.set(p === 'all' ? (l.main ? 0x5c677d : 0x9aa5b8) : l.proc === p ? 0xe63946 : 0xc8ced8));
    const pr = PROC[p];
    sunC.scale.setScalar(p === 'all' || pr.energy === 'sun' ? 1 : 0.6);
    coreC.scale.setScalar(p === 'all' || pr.energy === 'inside' ? 1 : 0.6);
    if (p === 'all') { ui.readout('The yellow pebble shows one path a bit of rock might take. Press a process to see where it happens.'); procTag.text = ''; }
    else { ui.readout(`${pr.text}<br>Powered by: <b>${pr.energy === 'sun' ? 'the Sun (weather and the water cycle) and gravity' : "Earth's inner heat"}</b>`); procTag.text = pr.label; }
  }

  // ============================================================ Steps
  function only(g) { stations.forEach(s => { s.visible = s === g; }); allTags.forEach(t => t.show(false)); }
  function pickSample(i) {
    st.sample = i;
    ui.readout(SAMPLES[i].text);
  }
  function setFocus(f) {
    st.focus = f;
    deepTag.show(true); chamberTag.show(true); surfTag.show(true); lavaTag.show(true);
    ui.readout(f === 'deep'
      ? 'Magma that stays underground cools very slowly, because the rock around it keeps the heat in. Its crystals have a long time to grow, so they get <b>large</b>. Rock like this is called <b>intrusive</b>. Example: granite.'
      : 'Lava that pours out at the surface cools quickly in the air or water. Its crystals have little time to grow, so they stay <b>tiny</b>. Rock like this is called <b>extrusive</b>. Example: basalt, the most common rock of the ocean floor.');
    view(f === 'deep' ? { radius: 2.4, yaw: 0.25, pitch: 0.18, target: [-1.0, -1.1, 0.8] } : { radius: 2.6, yaw: 0.3, pitch: 0.35, target: [VX + 1.3, 0.6, 0.6] });
  }
  const weathText = {
    weather: '<b>Weathering</b> breaks rock into smaller pieces. Water freezes in cracks and pushes them apart, plant roots grow into cracks, and rainwater slowly dissolves some minerals.',
    erode: '<b>Erosion</b> carries the broken pieces (sediment) away. Rivers, waves, wind, glaciers and gravity all move sediment. Fast water carries big pieces; slow water carries only fine sand and mud.',
    deposit: '<b>Deposition</b>: when the water slows down, for example where a river reaches the sea, it drops its sediment. Layer by layer, sediment builds up on the sea floor.',
  };

  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz; st.time = 0;
      const go = o => view(o, instant);
      if (i === 0) {
        only(samples); stands.forEach(s => s.tag.show(true));
        go({ radius: 3.4, width: 3.4, yaw: 0, pitch: 0.38, target: [0, 0.5, 0] });
        ui.buttons(SAMPLES.map((s, j) => ({ label: s.fam, on: j === st.sample, onClick: () => pickSample(j) })));
        pickSample(st.sample);
      }
      if (i === 1) {
        only(volc);
        ui.buttons([{ label: 'Deep underground', on: st.focus === 'deep', onClick: () => setFocus('deep') }, { label: 'At the surface', on: st.focus === 'surf', onClick: () => setFocus('surf') }]);
        setFocus(st.focus);
        go({ radius: 3.4, width: 4.0, yaw: 0.2, pitch: 0.25, target: [0, -0.6, 0.5] });
      }
      if (i === 2) {
        only(slab); slabTag.show(true);
        go({ radius: 2.5, yaw: 0.25, pitch: 0.75, target: [0, 0, 0] });
        ui.buttons([{ label: 'Granite-type magma', on: st.magma === 'light', onClick: () => { st.magma = 'light'; buildCrystals(); slabReadout(); } },
          { label: 'Basalt-type magma', on: st.magma === 'dark', onClick: () => { st.magma = 'dark'; buildCrystals(); slabReadout(); } }]);
        ui.slider({ label: 'Cooling speed', min: 0, max: 100, step: 1, value: st.cool, format: v => (v < 40 ? 'slow' : v < 90 ? 'fast' : 'very fast'), onInput: v => { st.cool = v; buildCrystals(); slabReadout(); } });
        buildCrystals(); slabReadout();
      }
      if (i === 3) {
        only(land); weathTag.show(true); erosTag.show(true); depoTag.show(true); sunTag.show(true);
        go({ radius: 3.6, width: 4.1, yaw: 0.15, pitch: 0.42, target: [0, 0.3, 0] });
        ui.buttons([{ label: 'Weathering', onClick: () => ui.readout(weathText.weather) }, { label: 'Erosion', onClick: () => ui.readout(weathText.erode) }, { label: 'Deposition', onClick: () => ui.readout(weathText.deposit) }]);
        ui.readout('The Sun drives the weather and the water cycle: rain, rivers, wind and ice. Gravity pulls water and loose rock downhill. Press each process to read about it.');
      }
      if (i === 4) {
        only(pile); bottomTag.show(true); topTag.show(true);
        go({ radius: 2.6, yaw: 0.35, pitch: 0.25, target: [0, 1.4, 0] });
        ui.slider({ label: 'Layers on top', min: 0, max: 6, step: 1, value: st.burial, onInput: v => { st.burial = v; placePile(); } });
        placePile();
      }
      if (i === 5) {
        only(press); pressTag.show(true); heatTag.show(true); squeezeTag.show(true);
        go({ radius: 2.6, yaw: 0.35, pitch: 0.25, target: [0, 0.9, 0] });
        ui.buttons([{ label: 'Shale', on: st.parent === 'shale', onClick: () => { st.parent = 'shale'; placePress(); } }, { label: 'Limestone', on: st.parent === 'limestone', onClick: () => { st.parent = 'limestone'; placePress(); } }]);
        ui.slider({ label: 'Depth', min: 0, max: 30, step: 1, value: st.depthKm, unit: ' km', onInput: v => { st.depthKm = v; placePress(); } });
        placePress();
      }
      if (i === 6 || isQuiz) {
        only(cyc); Object.values(NODES).forEach(n => n.tag.show(true)); sunCTag.show(true); coreCTag.show(true); procTag.show(!isQuiz);
        go({ radius: 3.1, yaw: 0, pitch: 0.12, target: [0, 0.1, 0] });
        if (!isQuiz) ui.buttons(Object.entries(PROC).map(([k, p]) => ({ label: p.label, onClick: () => setProcess(k) })));
        setProcess('all');
        if (isQuiz) ui.readout('');
      }
    },

    update(dt) {
      st.time += dt;
      const t = st.time;
      if (samples.visible) {
        stands.forEach((s, j) => {
          const sel = j === st.sample;
          kit.follow(s.rock.position, 'y', sel ? 1.0 : 0.75, dt, 5);
          s.rock.rotation.y += dt * (sel ? 0.8 : 0.15);
        });
        return true;
      }
      if (volc.visible) {
        lavaTex.offset.x -= dt * 0.25;
        smoke.forEach((s, j) => { const k = (t * 0.25 + j / smoke.length) % 1; s.position.set(VX + Math.sin(k * 5 + j) * 0.2, 1.7 + k * 1.4, 1.3); s.scale.setScalar(0.5 + k * 1.4); s.material.opacity = 0.6 * (1 - k); });
        blobs.forEach((b, j) => { const k = (t * 0.3 + j / blobs.length) % 1; b.position.set(VX + Math.sin(k * 8 + j) * 0.03, -1.7 + k * 3.3, 1.53); });
        chamber.material.emissiveIntensity = 0.5 + 0.2 * Math.sin(t * 3);
        return true;
      }
      if (land.visible) {
        for (let j = 0; j < NG; j++) {
          const k = (t * 0.08 + j / NG) % 1;
          let x, y, z;
          if (k < 0.8) { riverCurve.getPoint(k / 0.8, VM); x = VM.x; y = VM.y + 0.04; z = VM.z + (rand(j) - 0.5) * 0.1; }
          else { const s = (k - 0.8) / 0.2; x = SEA_X + 0.3 + s * (0.4 + rand(j) * 1.3); y = hAt(SEA_X + 0.3, 0) - s * 0.9; z = (rand(j + 9) - 0.5) * 1.6 * s; }
          gPos[j * 3] = x; gPos[j * 3 + 1] = y; gPos[j * 3 + 2] = z;
        }
        gGeo.attributes.position.needsUpdate = true;
        boulders.forEach((b, j) => {
          const k = (t * 0.18 + j / boulders.length) % 1, x = -2.4 + k * 1.2 + j * 0.05, z = 0.35 + (j % 2) * 0.3 - k * 0.3;
          b.position.set(x, hAt(x, z) + 0.12, z); b.rotation.set(k * 9, k * 5, 0);
        });
        const grow = 0.25 + 0.2 * ((t * 0.05) % 1);
        deposit.scale.y = grow; deposit.position.y = -1.0 + grow / 2;
        return true;
      }
      if (pile.visible) {
        drops.forEach((d, j) => {
          const k = (t * 0.4 + j / drops.length) % 1;
          d.visible = st.burial > 0;
          d.position.set(-1.3 + (j / drops.length) * 2.6, k * (st.pileTop || 1), 1.05);
        });
        return st.burial > 0;
      }
      if (press.visible) {
        flames.forEach((f, j) => { f.scale.y = 0.7 + 0.4 * Math.sin(t * 6 + j * 1.7) + st.depthKm / 30; });
        return true;
      }
      if (cyc.visible) {
        // A pebble travels round the main cycle, or along the chosen process.
        const chosen = st.process === 'all' ? links.filter(l => l.main) : links.filter(l => l.proc === st.process);
        st.cycK += dt * 0.45;
        const idx = Math.floor(st.cycK) % chosen.length, l = chosen[Math.max(0, Math.min(chosen.length - 1, idx))];
        l.curve.getPoint(st.cycK % 1, traveler.position);
        traveler.position.z += 0.1;
        const pulse = 1 + 0.15 * Math.sin(t * 4);
        nodeObj.magma.scale.setScalar(pulse);
        return true;
      }
      return false;
    },
  };
}
