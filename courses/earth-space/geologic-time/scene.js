// Fossils and the history of Earth (middle school).
// Stations: a dinosaur skeleton buried and turned to stone (time slider); a rock column built layer by
// layer (law of superposition, depth slider); the same column cut by a magma dike and a fault
// (cross-cutting); two cliffs matched by index fossils; the 66-million-year-old boundary layer;
// the geologic time scale as a ribbon (4,600 million years, zoomable); and Earth's history as one day.
import { rand, rockTexture, fossilTexture } from '../_shared/geo.js';

const EARTH_MA = 4600;
const fmt = n => Math.round(n).toLocaleString('en-US');
const ageText = ma => (ma >= 1000 ? `${+(ma / 1000).toFixed(2)} billion years ago` : ma >= 1 ? `${fmt(ma)} million years ago` : ma > 0 ? `${fmt(ma * 1e6)} years ago` : 'today');

// Rock column, bottom (oldest) to top (youngest).
const COLUMN = [
  { rock: 'limestone', fossil: 'stromatolite', what: 'stromatolites: mounds built by mats of bacteria' },
  { rock: 'shale', fossil: 'trilobite', what: 'trilobites: sea animals with a hard shell and many legs' },
  { rock: 'sandstone', fossil: 'fish', what: 'early fish' },
  { rock: 'slate', fossil: 'fern', what: 'fern leaves: plants growing on land' },
  { rock: 'limestone', fossil: 'ammonite', what: 'ammonites: sea animals with coiled shells' },
  { rock: 'sandstone', fossil: 'footprint', what: 'dinosaur footprints' },
  { rock: 'mud', fossil: 'tooth', what: 'teeth of mammals' },
];
const LH = 0.45, LAYER_M = 10; // drawn layer thickness; each layer stands for about 10 m of rock

const EONS = [[4600, 4000, 'Hadean', 0x8e3b2f], [4000, 2500, 'Archean', 0xd9703c], [2500, 539, 'Proterozoic', 0xe3b341], [539, 0, 'Phanerozoic', 0x6bb36a]];
const ERAS = [[539, 252, 'Paleozoic', 0x5aa9e6], [252, 66, 'Mesozoic', 0x7bc67b], [66, 0, 'Cenozoic', 0xf2c94c]];
const EVENTS = [
  [4600, 'Earth forms'], [3500, 'First life: bacteria'], [2400, 'Oxygen builds up in the air'], [600, 'First animals'],
  [470, 'First land plants'], [230, 'First dinosaurs'], [66, 'Dinosaurs die out'], [0.3, 'First modern humans'],
];
const CLOCK = [[4600, 'Earth forms'], [3500, 'First life'], [2400, 'Oxygen'], [600, 'First animals'], [230, 'First dinosaurs'], [66, 'Dinosaurs die out'], [0.3, 'Humans']];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  scene.background = new THREE.Color(0xe3eef7);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9bb0, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(3, 8, 7);
  scene.add(sun);

  const st = { step: 0, quiz: false, time: 0, p: 0, play: false, pSlider: null, depthM: 35, ccDike: 0, ccFault: 0, ccRun: null, index: 'trilobite', bound: 1, ribAge: 3500, zoom: 0, zoomTo: 0, clock: 5, hand: 0, handTo: 0, mini: 0 };
  const stations = [], allTags = [];
  const station = () => { const g = new THREE.Group(); scene.add(g); stations.push(g); return g; };
  const tag = (t, at, o) => { const l = label(t, at, o); allTags.push(l); return l; };
  const rockMat = (kind, rx = 1, ry = 1) => {
    const t = rockTexture(THREE, kind).clone(); t.repeat.set(rx, ry); t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  };
  const iconGeo = new THREE.PlaneGeometry(1, 1);
  const iconMats = {};
  const icon = (kind, parent, x, y, z, s = 0.32, color) => {
    const key = kind + (color || '');
    iconMats[key] = iconMats[key] || new THREE.MeshBasicMaterial({ map: fossilTexture(THREE, kind, color), transparent: true, depthWrite: false });
    const m = new THREE.Mesh(iconGeo, iconMats[key]);
    m.position.set(x, y, z); m.scale.setScalar(s); m.renderOrder = 3;
    parent.add(m);
    return m;
  };

  // ============================================================ A. A fossil forms
  const fos = station();
  kit.mesh(new THREE.BoxGeometry(6.4, 1.4, 2.5), rockMat('shale', 3, 1), [0, -0.7, -0.25], fos);
  const groundTop = kit.mesh(new THREE.BoxGeometry(6.4, 0.02, 2.5), kit.mat(0xa58e6a), [0, 0.01, -0.25], fos);
  const river = kit.mesh(new THREE.BoxGeometry(6.4, 0.06, 0.8), new THREE.MeshStandardMaterial({ color: 0x3d8fd6, transparent: true, opacity: 0.7, roughness: 0.2 }), [0, 0.03, -1.05], fos);
  const SED = [['mud', 0.55], ['sand', 0.4], ['mud', 0.35], ['sandstone', 0.4]];
  const sedLayers = SED.map(([k]) => {
    const loose = rockMat(k === 'sandstone' ? 'sand' : k, 3, 0.5), hard = rockMat(k === 'mud' ? 'shale' : 'sandstone', 3, 0.5);
    const m = kit.mesh(new THREE.BoxGeometry(6.4, 1, 2.5), loose, [0, 0, -0.25], fos);
    m.loose = loose; m.hard = hard;
    return m;
  });
  // Skeleton of a small dinosaur, drawn in the plane of the front face (z = 1) so it shows in cross-section.
  const skel = new THREE.Group();
  skel.position.set(0.2, 0.06, 1.0);
  fos.add(skel);
  const boneMat = kit.mat(0xf3eee2, { roughness: 0.6 });
  const bone = (geo, x, y, rz = 0) => { const m = kit.mesh(geo, boneMat, [x, y, 0], skel); m.rotation.z = rz; return m; };
  const vert = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 26; i++) {
    const x = 1.15 - i * 0.12, y = 0.36 + (i < 5 ? (5 - i) * 0.035 : 0) - Math.max(0, i - 14) * 0.012;
    const r = i < 5 ? 0.05 : i < 14 ? 0.06 : 0.055 - (i - 14) * 0.0035;
    bone(vert, x, y, 0).scale.setScalar(r);
  }
  bone(new THREE.BoxGeometry(0.42, 0.17, 0.1), 1.42, 0.55, -0.15);                  // skull
  bone(new THREE.BoxGeometry(0.36, 0.05, 0.08), 1.44, 0.43, -0.25);                 // jaw
  const ribGeo = new THREE.CylinderGeometry(0.018, 0.012, 0.28, 6);
  for (let i = 0; i < 7; i++) bone(ribGeo, 0.72 - i * 0.12, 0.22, 0.25);
  const legGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.34, 8);
  bone(legGeo, 0.05, 0.22, 0.7); bone(legGeo, -0.12, 0.09, -0.9); bone(new THREE.BoxGeometry(0.18, 0.03, 0.06), -0.28, 0.03, 0);
  bone(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), 0.95, 0.24, 0.9);              // little arm
  const flesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: 0x6a994e, transparent: true, opacity: 0.55, roughness: 0.8, depthWrite: false }));
  flesh.scale.set(1.25, 0.24, 0.2); flesh.position.set(0.15, 0.33, 0);
  skel.add(flesh);
  const NM = 40, mPos = new Float32Array(NM * 3), mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  const minerals = new THREE.Points(mGeo, new THREE.PointsMaterial({ color: 0x1e88e5, size: 0.06 }));
  minerals.frustumCulled = false;
  fos.add(minerals);
  const BONE = new THREE.Color(0xf3eee2), STONE = new THREE.Color(0x6b5a4a);
  const fosTag = tag('', new THREE.Vector3(1.6, 0.8, 1.0), { cls: 'big' });
  const STAGES = [
    [0, 'Death', 'A small dinosaur dies on a riverbank. Its soft parts begin to rot or are eaten.', 'a few days'],
    [12, 'Buried', 'A flood covers the body with mud and sand. Buried quickly, it is safe from scavengers and air.', 'within a few years'],
    [30, 'Minerals seep in', 'More layers pile on. Only the bones are left. Groundwater carrying dissolved minerals soaks into the tiny spaces in the bones.', 'thousands of years'],
    [55, 'Bone to stone', 'Minerals slowly fill and replace the bone, and the layers harden into rock. The bone has become a fossil: a copy made of stone.', 'millions of years'],
    [78, 'Found!', 'Plate movements lift the rock up, and erosion wears away the layers above, until the fossil shows at the surface.', 'millions of years more'],
  ];
  function poseFossil() {
    const p = st.p;
    // Layers arrive between p = 12 and 50; erosion removes the top ones after p = 80.
    let y = 0;
    const erode = kit.clamp((p - 80) / 18, 0, 1);
    sedLayers.forEach((m, i) => {
      const grow = kit.clamp((p - 12 - i * 9) / 8, 0, 1);
      let h = SED[i][1] * grow;
      const keep = i === 0 ? 1 - 0.55 * erode : 1 - kit.clamp(erode * 4 - (3 - i), 0, 1);
      h *= keep;
      m.visible = h > 0.001;
      m.scale.y = Math.max(0.001, h);
      m.position.y = y + h / 2;
      m.material = p > 60 ? m.hard : m.loose;
      y += h;
    });
    river.visible = p < 12;
    flesh.material.opacity = 0.55 * kit.clamp(1 - p / 28, 0, 1);
    flesh.visible = p < 28;
    const rep = kit.clamp((p - 35) / 40, 0, 1);
    boneMat.color.copy(BONE).lerp(STONE, rep);
    minerals.visible = p > 30 && p < 78;
    const s = STAGES.filter(s => p >= s[0]).pop();
    fosTag.text = s[1];
    fosTag.at.y = Math.max(0.9, y + 0.2);
    ui.readout(`<b>${s[1]}</b> (${s[3]}): ${s[2]}<br>Bone replaced by minerals: <b>${Math.round(rep * 100)}%</b>`);
  }

  // ============================================================ B/C. Rock column (two halves for the fault)
  const col = station();
  const halves = [-1, 1].map(side => {
    const g = new THREE.Group(); col.add(g);
    g.rows = COLUMN.map((L, i) => {
      const m = kit.mesh(new THREE.BoxGeometry(1.2, LH, 1.6), rockMat(L.rock, 0.6, 0.3), [side * 0.6, LH * (i + 0.5), 0], g);
      icon(L.fossil, m, side * 0.25, 0, 0.805, 0.3);
      return m;
    });
    return g;
  });
  kit.mesh(new THREE.BoxGeometry(2.8, 0.1, 2), kit.mat(0x6b5b53), [0, -0.05, 0], col);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.46, LH, 1.66)), new THREE.LineBasicMaterial({ color: 0xffd60a }));
  col.add(frame);
  const depthLine = kit.mesh(new THREE.BoxGeometry(2.6, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: 0xe63946 }), [0, 0, 0.82], col);
  const depthTagAt = new THREE.Object3D(); col.add(depthTagAt);
  const depthTag = tag('', depthTagAt, { cls: 'cool' });
  const youngTag = tag('Youngest (top)', new THREE.Vector3(-1.2, LH * 7 + 0.05, 0.8));
  const oldTag = tag('Oldest (bottom)', new THREE.Vector3(1.2, 0.05, 0.8), { cls: 'warm' });
  // Dike: magma that pushed up through every layer but the top one, later cooled to dark rock.
  const dikeMat = new THREE.MeshStandardMaterial({ color: 0x2f2f33, emissive: 0xff5a00, emissiveIntensity: 0, roughness: 0.8 });
  const dike = kit.mesh(new THREE.BoxGeometry(0.22, 1, 1.62), dikeMat, [-0.65, 0, 0], halves[0]);
  const dikeTag = tag('Dike (cooled magma)', new THREE.Vector3(-0.65, LH * 3.5, 0.8), { cls: 'warm' });
  const faultTag = tag('Fault', new THREE.Vector3(0, LH * 7.4, 0.8), { cls: 'cool' });
  function poseColumn() {
    const h = LH * 6 * st.ccDike;
    dike.visible = st.ccDike > 0.001;
    dike.scale.y = Math.max(0.001, h);
    dike.position.y = h / 2;
    halves[1].position.y = -LH * 0.6 * st.ccFault;
    dikeTag.at.y = Math.max(h, LH) * 0.6;
  }
  function placeDepth() {
    const i = Math.min(6, Math.floor(st.depthM / LAYER_M)), idx = 6 - i;   // idx: 0 = bottom
    const y = LH * 7 - (st.depthM / LAYER_M) * LH;
    depthLine.position.y = y;
    frame.position.set(0, LH * (idx + 0.5), 0);
    depthTagAt.position.set(1.3, y, 0.8);
    depthTag.text = `${st.depthM} m down`;
    const above = i, below = 6 - i;
    const where = above === 0 ? 'the <b>youngest</b> layer' : below === 0 ? 'the <b>oldest</b> layer' : `older than the ${above} layer${above > 1 ? 's' : ''} above it and younger than the ${below} below it`;
    ui.readout(`Depth: <b>${st.depthM} m</b> → layer ${i + 1} from the top (of 7): ${where}.<br>Fossils here: <b>${COLUMN[idx].what}</b>.`);
  }

  // ============================================================ D. Two cliffs and index fossils
  const cliffs = station();
  const CLIFF_A = [['sandstone', null], ['shale', 'trilobite'], ['limestone', 'shell'], ['sandstone', 'ammonite'], ['mud', null]];
  const CLIFF_B = [['limestone', null], ['shale', 'trilobite'], ['sandstone', 'ammonite'], ['shale', 'leaf'], ['sandstone', null], ['mud', null]];
  const cliffLayer = {};
  const buildCliff = (layers, x, hs, name) => {
    let y = 0;
    layers.forEach(([rock, f], i) => {
      const h = hs[i];
      const m = kit.mesh(new THREE.BoxGeometry(1.8, h, 1.6), rockMat(rock, 0.9, h), [x, y + h / 2, 0], cliffs);
      if (f) { const ic = icon(f, cliffs, x + 0.2, y + h / 2, 0.81, 0.32); if (f === 'trilobite' || f === 'ammonite') cliffLayer[name + f] = { y: y + h / 2, h, ic }; }
      y += h;
    });
    return y;
  };
  const topA = buildCliff(CLIFF_A, -2.4, [0.5, 0.45, 0.4, 0.5, 0.45], 'A');
  const topB = buildCliff(CLIFF_B, 2.4, [0.35, 0.4, 0.45, 0.5, 0.4, 0.4], 'B');
  kit.mesh(new THREE.BoxGeometry(7, 0.1, 2), kit.mat(0x7a9a5a), [0, -0.05, 0], cliffs);
  kit.mesh(new THREE.BoxGeometry(2.8, 0.05, 1.4), new THREE.MeshStandardMaterial({ color: 0x3d8fd6, roughness: 0.2 }), [0, 0.03, 0], cliffs);
  const band = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffd60a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  band.renderOrder = 4;
  cliffs.add(band);
  const bandGeoPos = band.geometry.attributes.position;
  const cliffATag = tag('Cliff A', new THREE.Vector3(-2.4, topA + 0.1, 0));
  const cliffBTag = tag('Cliff B, far away', new THREE.Vector3(2.4, topB + 0.1, 0));
  const indexTag = tag('', new THREE.Vector3(0, 1, 0.8), { cls: 'warm' });
  function setIndex(f) {
    st.index = f;
    const a = cliffLayer['A' + f], b = cliffLayer['B' + f];
    // A band joining the two matching layers across the valley (front face).
    const pts = [[-1.5, a.y + a.h / 2], [1.5, b.y + b.h / 2], [-1.5, a.y - a.h / 2], [1.5, b.y - b.h / 2]];
    pts.forEach(([x, y], i) => bandGeoPos.setXYZ(i, x, y, 0.81));
    bandGeoPos.needsUpdate = true;
    band.geometry.computeBoundingSphere();
    indexTag.text = f === 'trilobite' ? 'Same trilobite' : 'Same ammonite';
    indexTag.at.set(0, (a.y + b.y) / 2 + 0.35, 0.8);
    for (const k of Object.keys(cliffLayer)) cliffLayer[k].ic.scale.setScalar(k.endsWith(f) ? 0.42 : 0.3);
    ui.readout(`Both cliffs have a layer with the same kind of ${f}. That kind lived only for a fairly short time, so both layers must be about the same age, even though the rocks around them differ and the layers are at different heights.`);
  }

  // ============================================================ E. The boundary layer
  const bnd = station();
  const below = kit.mesh(new THREE.BoxGeometry(3.2, 1.2, 1.6), rockMat('limestone', 1.6, 0.6), [0, 0.6, 0], bnd);
  const clay = kit.mesh(new THREE.BoxGeometry(3.2, 0.08, 1.6), new THREE.MeshStandardMaterial({ color: 0x3b3330, roughness: 1, emissive: 0x000000 }), [0, 1.24, 0], bnd);
  const above = kit.mesh(new THREE.BoxGeometry(3.2, 1.0, 1.6), rockMat('sandstone', 1.6, 0.5), [0, 1.78, 0], bnd);
  icon('bone', bnd, -0.9, 0.55, 0.81, 0.4); icon('ammonite', bnd, 0.6, 0.75, 0.81, 0.36); icon('footprint', bnd, -0.1, 0.3, 0.81, 0.3);
  icon('tooth', bnd, -0.6, 1.8, 0.81, 0.3); icon('leaf', bnd, 0.8, 1.65, 0.81, 0.34);
  const parts = [below, clay, above];
  const BTAG = [tag('Dinosaurs, ammonites', new THREE.Vector3(1.0, 0.2, 0.8)), tag('Clay layer', new THREE.Vector3(1.75, 1.2, 0.8), { cls: 'warm' }), tag('Mammals, no dinosaurs', new THREE.Vector3(-0.3, 2.3, 0.8), { cls: 'cool' })];
  const BTEXT = [
    'Below the line, the rocks hold fossils of dinosaurs and ammonites. Volcanic ash layers near the line can be dated with radioactive elements, which break down at a steady rate like a clock. They show the line formed about <b>66 million years ago</b>.',
    'A thin layer of clay is found at this level all over the world. It is rich in <b>iridium</b>, a metal that is rare in Earth\'s crust but common in asteroids. A buried crater about 180 km wide in Mexico, called Chicxulub, shows that a huge asteroid hit Earth at that time.',
    'Above the line there are no more fossils of dinosaurs (except birds, which are their living relatives) or ammonites. About <b>three-quarters</b> of all kinds of living things died out: a mass extinction. Afterwards, mammals spread and became much more varied.',
  ];
  function setBound(i) {
    st.bound = i;
    parts.forEach((m, j) => { m.material.emissive.set(j === i ? 0x6a4a00 : 0x000000); });
    BTAG.forEach((t, j) => t.show(j === i));
    ui.readout(BTEXT[i]);
  }

  // ============================================================ F. Time ribbon
  const rib = station();
  const RL = 12, xOf = (age, max) => RL / 2 - RL * age / max;
  const eonBoxes = EONS.map(([, , , c]) => kit.mesh(new THREE.BoxGeometry(1, 0.3, 0.6), kit.mat(c, { roughness: 0.7 }), [0, 0.15, 0], rib));
  const eraBoxes = ERAS.map(([, , , c]) => kit.mesh(new THREE.BoxGeometry(1, 0.16, 0.6), kit.mat(c, { roughness: 0.7 }), [0, 0.38, 0], rib));
  const eonTags = EONS.map(([, , n]) => { const o = new THREE.Object3D(); rib.add(o); return tag(n, o); });
  const eraTags = ERAS.map(([, , n]) => { const o = new THREE.Object3D(); rib.add(o); return tag(n, o, { cls: 'cool' }); });
  const pinMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const pins = EVENTS.map(([age], i) => {
    const g = new THREE.Group(); rib.add(g);
    const h = 0.55 + (i % 3) * 0.3;
    kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, h, 5), pinMat, [0, 0.46 + h / 2, 0], g);
    kit.mesh(new THREE.SphereGeometry(0.055, 12, 8), new THREE.MeshBasicMaterial({ color: 0x1d3557 }), [0, 0.46 + h, 0], g);
    g.top = new THREE.Object3D(); g.top.position.y = 0.5 + h; g.add(g.top);
    g.age = age;
    return g;
  });
  const cursor = new THREE.Group(); rib.add(cursor);
  kit.mesh(new THREE.BoxGeometry(0.04, 1.4, 0.7), new THREE.MeshBasicMaterial({ color: 0xe63946 }), [0, 0.05, 0], cursor);
  const cone = kit.mesh(new THREE.ConeGeometry(0.12, 0.25, 12), new THREE.MeshBasicMaterial({ color: 0xe63946 }), [0, -0.75, 0.35], cursor);
  cone.rotation.x = Math.PI;
  const curAt = new THREE.Object3D(); curAt.position.set(0, -1.25, 0.4); cursor.add(curAt);
  const curTag = tag('', curAt, { cls: 'warm' });
  const eventTag = tag('', new THREE.Object3D(), { cls: 'big' });
  const todayTag = tag('Today', new THREE.Vector3(RL / 2 + 0.55, 0.05, 0.3), { cls: 'cool' });
  let nearest = null;
  function poseRibbon() {
    const max = kit.lerp(EARTH_MA, 600, st.zoom);
    const seg = (boxes, list, tags, y) => list.forEach(([a, b], i) => {
      const a2 = Math.min(a, max), m = boxes[i];
      const x0 = xOf(a2, max), x1 = xOf(b, max), w = x1 - x0;
      m.visible = w > 0.005;
      m.scale.x = Math.max(0.001, w); m.position.x = (x0 + x1) / 2;
      tags[i].at.position.set((x0 + x1) / 2, y, 0.32);
      tags[i].show(st.step === 5 && !st.quiz && w > (tags === eonTags ? 1.6 : 1.3));
    });
    seg(eonBoxes, EONS, eonTags, -0.4);
    seg(eraBoxes, ERAS, eraTags, 0.5);
    for (const p of pins) { p.visible = p.age <= max + 1; p.position.x = xOf(Math.min(p.age, max), max); }
    cursor.visible = st.ribAge <= max;
    cursor.position.x = xOf(Math.min(st.ribAge, max), max);
    // Label the event nearest to the cursor.
    nearest = EVENTS.reduce((b, e) => (Math.abs(e[0] - st.ribAge) < Math.abs(b[0] - st.ribAge) ? e : b), EVENTS[0]);
    const pin = pins[EVENTS.indexOf(nearest)];
    eventTag.at = pin.top;
    eventTag.text = nearest[1];
    eventTag.show(st.step === 5 && !st.quiz && pin.visible);
    curTag.text = ageText(st.ribAge);
  }
  function ribReadout() {
    const a = st.ribAge;
    const eon = EONS.find(e => a <= e[0] && a >= e[1]) || EONS[3];
    const era = a <= 539 ? ERAS.find(e => a <= e[0] && a >= e[1]) : null;
    const pct = (100 * (EARTH_MA - a) / EARTH_MA).toFixed(1);
    ui.readout(`<b>${ageText(a)}</b> · eon: ${eon[2]}${era ? `, era: ${era[2]}` : ''}<br>Nearest event: <b>${nearest[1]}</b> (about ${ageText(nearest[0])})<br>That point is ${pct}% of the way from Earth's start to today.`);
  }

  // ============================================================ G. Earth's history as one day
  const clk = station();
  const dial = kit.mesh(new THREE.CircleGeometry(2, 64), new THREE.MeshStandardMaterial({ map: paintDial(THREE), roughness: 0.8 }), [0, 0, 0], clk);
  dial.castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(2.08, 2.08, 0.12, 64), kit.mat(0x3a506b), [0, 0, -0.07], clk).rotation.x = Math.PI / 2;
  const hand = new THREE.Group(); hand.position.z = 0.06; clk.add(hand);
  kit.mesh(new THREE.BoxGeometry(0.07, 1.75, 0.03), new THREE.MeshBasicMaterial({ color: 0x1d1d1d }), [0, 0.875, 0], hand);
  kit.mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ color: 0x1d1d1d }), [0, 0, 0.07], clk);
  const handTip = new THREE.Object3D(); handTip.position.y = 1.85; hand.add(handTip);
  const handTag = tag('', handTip, { cls: 'big warm' });
  // Small dial: the last hour before midnight (23:00 to 24:00), zoomed in.
  const mini = new THREE.Group(); mini.position.set(3.1, -1.1, 0); clk.add(mini);
  kit.mesh(new THREE.CircleGeometry(0.85, 48), new THREE.MeshStandardMaterial({ map: paintMini(THREE), roughness: 0.8 }), [0, 0, 0], mini).castShadow = false;
  kit.mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 48), kit.mat(0x3a506b), [0, 0, -0.06], mini).rotation.x = Math.PI / 2;
  const miniHand = new THREE.Group(); miniHand.position.z = 0.04; mini.add(miniHand);
  kit.mesh(new THREE.BoxGeometry(0.05, 0.75, 0.02), new THREE.MeshBasicMaterial({ color: 0xe63946 }), [0, 0.375, 0], miniHand);
  const miniTag = tag('Last hour, zoomed in', new THREE.Vector3(3.1, -2.05, 0), { cls: 'cool' });
  const midTag = tag('Top: midnight = today', new THREE.Vector3(-1.9, -2.15, 0));
  const clockSec = age => 86400 * (1 - age / EARTH_MA);
  const hms = s => { s = Math.round(s); return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  function setClock(i) {
    st.clock = i;
    const [age, name] = CLOCK[i];
    const s = clockSec(age), left = 86400 - s;
    st.handTo = (s / 86400) * Math.PI * 2;
    if (i === 0) st.handTo = 0;
    st.mini = left < 3600 ? ((3600 - left) / 3600) * Math.PI * 2 : 0;
    handTag.text = name;
    const lh = Math.floor(left / 3600), lm = Math.floor(left / 60) % 60, ls = Math.round(left % 60);
    const before = age === EARTH_MA ? 'the very start of the day' : `${lh ? `${lh} h ` : ''}${lh || lm ? `${lm} min ` : ''}${ls} s before midnight`;
    ui.readout(`clock time = 24 h × (1 − ${fmt(age < 1 ? age * 1e6 : age)}${age < 1 ? ' years' : ' million years'} ÷ 4,600 million years)<br><b>${name}</b> at <b>${age === EARTH_MA ? '00:00:00' : hms(s)}</b>: ${before}.`);
  }

  // ============================================================ Steps
  function only(g) { stations.forEach(s => { s.visible = s === g; }); allTags.forEach(t => t.show(false)); }
  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.play = false; st.ccRun = null;
      const go = o => view(o, instant);
      if (i === 0) {
        only(fos); fosTag.show(true);
        st.p = 0; st.play = true;
        go({ radius: 2.3, width: 3.3, yaw: 0.2, pitch: 0.2, target: [0, 0.35, 0.3] });
        ui.buttons([{ label: 'Play', onClick: () => { if (st.p >= 99.9) st.p = 0; st.play = true; } }, { label: 'Pause', onClick: () => { st.play = false; } }]);
        st.pSlider = ui.slider({ label: 'Time', min: 0, max: 100, step: 1, value: 0, format: v => (STAGES.filter(s => v >= s[0]).pop()[1]), onInput: v => { st.play = false; st.p = v; poseFossil(); } });
        poseFossil();
      }
      if (i === 1 || i === 2 || isQuiz) {
        only(col);
        go({ radius: 2.1, yaw: 0.35, pitch: 0.18, target: [0.15, LH * 3.5, 0] });
        if (i === 1) {
          st.ccDike = 0; st.ccFault = 0; poseColumn();
          frame.visible = depthLine.visible = true; depthTag.show(true); youngTag.show(true); oldTag.show(true);
          ui.slider({ label: 'Depth', min: 0, max: 69, step: 1, value: st.depthM, unit: ' m', onInput: v => { st.depthM = v; placeDepth(); } });
          placeDepth();
        } else {
          frame.visible = depthLine.visible = false;
          if (isQuiz) { st.ccDike = 1; st.ccFault = 1; poseColumn(); }
          else {
            st.ccDike = 0; st.ccFault = 0; st.ccRun = 'both';
            dikeTag.show(true); faultTag.show(true);
            const run = k => { st.ccRun = k; st.time = 0; if (k === 'dike') st.ccDike = 0; else st.ccFault = 0; };
            ui.buttons([{ label: 'Magma intrusion', onClick: () => { run('dike'); ui.readout(ccText.dike); } }, { label: 'Fault', onClick: () => { run('fault'); ui.readout(ccText.fault); } }]);
            ui.readout(ccText.both);
          }
        }
      }
      if (i === 3) {
        only(cliffs); cliffATag.show(true); cliffBTag.show(true); indexTag.show(true);
        go({ radius: 2.2, width: 3.6, yaw: 0.15, pitch: 0.2, target: [0, 1.15, 0] });
        ui.buttons([{ label: 'Trilobite', on: st.index === 'trilobite', onClick: () => setIndex('trilobite') }, { label: 'Ammonite', on: st.index === 'ammonite', onClick: () => setIndex('ammonite') }]);
        setIndex(st.index);
      }
      if (i === 4) {
        only(bnd);
        go({ radius: 1.9, yaw: 0.3, pitch: 0.2, target: [0, 1.15, 0] });
        ui.buttons(['Below the line', 'The boundary', 'Above the line'].map((l, j) => ({ label: l, on: j === st.bound, onClick: () => setBound(j) })));
        setBound(st.bound);
      }
      if (i === 5) {
        only(rib); todayTag.show(true); curTag.show(true);
        st.zoom = st.zoomTo = 0;
        go({ radius: 1.5, width: 7.2, yaw: 0, pitch: 0.3, target: [0.5, 0.55, 0] });
        ui.slider({ label: 'Time ago', min: 0, max: EARTH_MA, step: 1, value: st.ribAge, format: v => ageText(v === 0 ? 0.3 : v).replace(' ago', ''), onInput: v => { st.ribAge = v === 0 ? 0.3 : v; poseRibbon(); ribReadout(); } });
        ui.toggle({ label: 'Zoom in on the last 600 million years', value: false, onChange: v => { st.zoomTo = v ? 1 : 0; } });
        poseRibbon(); ribReadout();
      }
      if (i === 6) {
        only(clk); handTag.show(true); miniTag.show(true); midTag.show(true);
        go({ radius: 2.6, width: 4.1, yaw: 0, pitch: 0.08, target: [0.7, 0, 0] });
        ui.buttons(CLOCK.map(([, n], j) => ({ label: n, on: j === st.clock, onClick: () => setClock(j) })));
        setClock(st.clock);
      }
    },

    update(dt) {
      st.time += dt;
      if (fos.visible) {
        if (st.play) {
          st.p = Math.min(100, st.p + dt * 9);
          if (st.p >= 100) st.play = false;
          if (st.pSlider) st.pSlider.set(Math.round(st.p));
          poseFossil();
        }
        for (let j = 0; j < NM; j++) {
          const k = (st.time * 0.3 + rand(j)) % 1;
          mPos[j * 3] = 0.2 + (rand(j + 50) - 0.5) * 3; mPos[j * 3 + 1] = 1.5 - k * 1.2; mPos[j * 3 + 2] = 1.03;
        }
        mGeo.attributes.position.needsUpdate = true;
        return true;
      }
      if (col.visible) {
        let busy = false;
        if (st.step === 1 && !st.quiz) {
          // Layers settle one at a time, oldest first.
          halves.forEach(h => h.rows.forEach((m, i) => {
            const k = kit.clamp((st.time - i * 0.3) / 0.35, 0, 1);
            m.visible = k > 0;
            m.position.y = LH * (i + 0.5) + (1 - kit.ease(k)) * 1.2;
          }));
          busy = st.time < 3;
        } else halves.forEach(h => h.rows.forEach((m, i) => { m.visible = true; m.position.y = LH * (i + 0.5); }));
        if (st.ccRun) {
          const t = st.time;
          if (st.ccRun === 'both') { st.ccDike = kit.clamp(t / 1.4, 0, 1); st.ccFault = kit.ease(kit.clamp((t - 1.6) / 0.8, 0, 1)); if (t > 2.6) st.ccRun = null; }
          else if (st.ccRun === 'dike') { st.ccDike = kit.clamp(t / 1.4, 0, 1); if (t > 2.4) st.ccRun = null; }
          else { st.ccFault = kit.ease(kit.clamp(t / 0.8, 0, 1)); if (t > 0.9) st.ccRun = null; }
          dikeMat.emissiveIntensity = kit.clamp(1.6 - t, 0, 1) * 0.9;
          poseColumn();
          busy = true;
        }
        return busy;
      }
      if (rib.visible) {
        if (Math.abs(st.zoom - st.zoomTo) > 1e-4) { kit.follow(st, 'zoom', st.zoomTo, dt, 3); poseRibbon(); return true; }
        return false;
      }
      if (clk.visible) {
        const a = kit.follow(st, 'hand', st.handTo, dt, 4);
        hand.rotation.z = -st.hand;
        const b = kit.follow(miniHand.rotation, 'z', -st.mini, dt, 4);
        return a || b;
      }
      return false;
    },
  };
}

const ccText = {
  both: 'Watch: first magma pushes up through the layers, then the rock breaks and one side slips down. A dike or fault is <b>younger</b> than every layer it cuts through.',
  dike: 'Magma forced its way up through the bottom six layers and cooled into a dike. It had to cut through them, so the dike is <b>younger</b> than those layers. The top layer is not cut, so it formed <b>after</b> the dike.',
  fault: 'The rock broke along a fault and the right side slipped down. All seven layers are broken, so the fault is <b>younger</b> than all of them.',
};

// 24-hour dial: eons as coloured sectors, hour ticks and numbers (0/24 at the top).
function paintDial(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d'), C = 256;
  g.fillStyle = '#fbf8f1'; g.beginPath(); g.arc(C, C, 256, 0, Math.PI * 2); g.fill();
  const sector = (a0, a1, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(C, C); g.arc(C, C, 250, a0, a1); g.closePath(); g.fill(); };
  const ang = ma => -Math.PI / 2 + (1 - ma / EARTH_MA) * Math.PI * 2;
  for (const [a, b, , col] of EONS) sector(ang(a), ang(b), '#' + col.toString(16).padStart(6, '0'));
  g.fillStyle = '#fbf8f1'; g.beginPath(); g.arc(C, C, 170, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#333'; g.fillStyle = '#222'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let h = 0; h < 24; h++) {
    const a = -Math.PI / 2 + (h / 24) * Math.PI * 2, big = h % 3 === 0;
    g.lineWidth = big ? 5 : 2;
    g.beginPath(); g.moveTo(C + Math.cos(a) * (big ? 200 : 215), C + Math.sin(a) * (big ? 200 : 215)); g.lineTo(C + Math.cos(a) * 250, C + Math.sin(a) * 250); g.stroke();
    if (big) { g.font = 'bold 34px sans-serif'; g.fillText(h === 0 ? '0/24' : String(h), C + Math.cos(a) * 140, C + Math.sin(a) * 140); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Last-hour dial: 23:00 at the top, minute ticks, labels every 15 minutes.
function paintMini(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d'), C = 128;
  g.fillStyle = '#eef4fb'; g.beginPath(); g.arc(C, C, 128, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#333'; g.fillStyle = '#222'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let m = 0; m < 60; m++) {
    const a = -Math.PI / 2 + (m / 60) * Math.PI * 2, big = m % 15 === 0;
    g.lineWidth = big ? 4 : 1.5;
    g.beginPath(); g.moveTo(C + Math.cos(a) * (big ? 100 : 112), C + Math.sin(a) * (big ? 100 : 112)); g.lineTo(C + Math.cos(a) * 124, C + Math.sin(a) * 124); g.stroke();
  }
  g.font = 'bold 22px sans-serif';
  [['23:00', 0], ['23:15', 15], ['23:30', 30], ['23:45', 45]].forEach(([s, m]) => { const a = -Math.PI / 2 + (m / 60) * Math.PI * 2; g.fillText(s, C + Math.cos(a) * 72, C + Math.sin(a) * 72); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
