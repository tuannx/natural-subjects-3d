// Earth's layers and plate tectonics (middle school).
// Stations, shown one or two at a time: a cut-away Earth (layers, depth readout, mantle convection),
// a flat world map whose simplified continents slide from Pangaea (200 million years ago) to today,
// three cross-section blocks for the kinds of plate boundary, and a "plate speed" strip where
// distance = speed x time. Continents are simplified outlines; Pangaea is fitted from a few coast points.
import { rand, canvasTex, rockTexture, fossilTexture, arrow, slabGeometry } from '../_shared/geo.js';

const R = 2;                 // radius of the cut-away Earth
const EARTH_KM = 6371;
const S = 0.05;              // map units per degree of longitude / latitude
const PANGAEA_MA = 200;

// ---- Layers: depth (km) -> drawn radius fraction. The crust is drawn about 4x too thick to be seen.
const LAYERS = [
  { name: 'Crust', top: 0, bot: 35, r0: 1, r1: 0.97, state: 'solid rock (only about 7 km thick under oceans)' },
  { name: 'Mantle', top: 35, bot: 2900, r0: 0.97, r1: 0.546, state: 'solid rock, but so hot it can flow very slowly' },
  { name: 'Outer core', top: 2900, bot: 5150, r0: 0.546, r1: 0.191, state: 'liquid (melted) iron and nickel' },
  { name: 'Inner core', top: 5150, bot: EARTH_KM, r0: 0.191, r1: 0, state: 'solid iron and nickel, squeezed solid by huge pressure' },
];
const layerAt = d => LAYERS.find(l => d < l.bot) || LAYERS[3];
const radiusAt = d => { const l = layerAt(d); return l.r0 + (l.r1 - l.r0) * (d - l.top) / (l.bot - l.top); };
// Textbook temperatures (rounded; real values are uncertain by a few hundred degrees).
const TEMP = [[0, 15], [35, 500], [100, 1300], [2900, 3700], [2901, 4000], [5150, 5000], [EARTH_KM, 5200]];
function tempAt(d) {
  for (let i = 1; i < TEMP.length; i++) if (d <= TEMP[i][0]) {
    const [d0, t0] = TEMP[i - 1], [d1, t1] = TEMP[i];
    return t0 + (t1 - t0) * (d - d0) / (d1 - d0);
  }
  return 5200;
}
const fmt = n => Math.round(n).toLocaleString('en-US');

// ---- Simplified continents (longitude, latitude).
const POLY = {
  na: [[[-168, 66], [-156, 71], [-130, 70], [-95, 72], [-80, 73], [-62, 60], [-56, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 25], [-83, 29], [-90, 30], [-97, 27], [-97, 20], [-88, 21], [-87, 15], [-83, 9], [-79, 8], [-86, 12], [-92, 15], [-105, 20], [-112, 30], [-117, 32], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
    [[-55, 60], [-43, 60], [-20, 70], [-20, 82], [-60, 82], [-73, 77], [-55, 68]]],
  sa: [[[-80, 8], [-73, 12], [-62, 11], [-52, 5], [-35, -5], [-39, -14], [-48, -26], [-58, -35], [-65, -42], [-68, -55], [-74, -52], [-73, -40], [-71, -18], [-81, -6]]],
  af: [[[-17, 15], [-17, 21], [-10, 30], [-6, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -2], [40, -15], [35, -24], [32, -29], [20, -35], [18, -32], [12, -17], [13, -6], [9, 4], [-8, 4], [-13, 8]]],
  eu: [[[-9, 37], [-9, 43], [-2, 44], [-5, 48], [5, 53], [8, 57], [5, 62], [15, 69], [30, 71], [60, 70], [80, 73], [110, 77], [140, 72], [180, 68], [180, 64], [160, 60], [155, 55], [140, 52], [130, 42], [122, 40], [121, 30], [110, 20], [105, 10], [100, 13], [98, 8], [97, 17], [92, 22], [89, 27], [80, 30], [73, 33], [70, 28], [68, 24], [62, 25], [57, 25], [59, 22], [52, 16], [44, 12], [38, 20], [34, 28], [35, 36], [27, 37], [26, 41], [23, 38], [20, 40], [15, 45], [12, 44], [16, 40], [12, 38], [8, 44], [3, 43], [-4, 37]]],
  in: [[[68, 24], [72, 21], [77, 8], [80, 13], [80, 16], [87, 21], [92, 22], [89, 27], [80, 30], [73, 33], [70, 28]]],
  au: [[[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [135, -35], [129, -32], [115, -34]]],
  an: [[[-25, -68], [5, -66], [35, -66], [60, -68], [68, -76], [40, -86], [-10, -86], [-30, -77]]],
};
const COLORS = { na: 0x8cbf6e, sa: 0x6fb36a, af: 0xc9b26b, eu: 0x9ccf7c, in: 0xe0a25a, au: 0xd9925b, an: 0xeef3f6 };
const centroid = polys => { let x = 0, y = 0; polys[0].forEach(p => { x += p[0]; y += p[1]; }); return [x / polys[0].length, y / polys[0].length]; };

// Pangaea: Africa moves 10 degrees south; the others are fitted to coast points next to Africa.
const AF = [0, -10];
const FITS = {
  sa: [[[-35, -6], [9, 3.5]], [[-48.5, -28], [14.5, -23]]],
};
const MANUAL = { na: [[-42, 20], 22], af: [[18, -10], 0], eu: [[80, 40], 0], in: [[56, -32], -40], an: [[34, -52], 18], au: [[86, -55], 35] };

// Evidence patches, at real places (today's longitude/latitude) on each continent.
const EVIDENCE = {
  meso: { color: 0x2a9d8f, icon: 'reptile', at: [['sa', -50, -27, 6, 4, 0], ['af', 17, -24, 5, 5, 0]] },
  glosso: { color: 0x386641, icon: 'leaf', at: [['sa', -58, -32, 7, 5, 0], ['af', 25, -28, 7, 5, 0], ['in', 78, 18, 6, 6, 0], ['an', 22, -76, 14, 6, 0], ['au', 138, -28, 8, 5, 0]] },
  rocks: { color: 0x8d5a3b, icon: null, at: [['na', -75, 40, 10, 2.5, 40], ['na', -30, 72, 7, 2.5, 70], ['eu', 3, 60, 9, 2.5, 50], ['af', -11, 24, 7, 2.5, 70]] },
};

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const NAVY = new THREE.Color(0x0d1b2a), SKY = new THREE.Color(0xdcecf8);
  scene.background = NAVY;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7f99, 1.7));
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.9);
  sunLight.position.set(5, 8, 7);
  scene.add(sunLight);

  const st = { step: 0, quiz: false, time: 0, depth: 1200, ma: 0, maTo: 0, play: false, evidence: 'meso',
    spread: true, ccMode: 'oc', slide: false, slip: 0, quakes: 0, phase: 0, speedMa: 100, speedCm: 2.5, markKm: 1500, maSlider: null, currents: true, edges: true };

  // =========================================================== Cut-away Earth
  const globe = new THREE.Group();
  scene.add(globe);
  const mapTex = paintGlobe(THREE, false), edgeTex = paintGlobe(THREE, true);
  for (const t of [mapTex, edgeTex]) t.offset.x = -0.25;   // puts the cut wedge in the Pacific
  const shellGeo = new THREE.SphereGeometry(R, 48, 24, Math.PI, Math.PI * 1.5);
  { const uv = shellGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 0.5 + 0.75 * uv.getX(i)); }
  const shellMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.9 });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  globe.add(shell);
  const faceTex = paintLayers(THREE);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x331100, emissiveIntensity: 0.25 });
  const faceB = new THREE.Mesh(new THREE.CircleGeometry(R, 64, -Math.PI / 2, Math.PI), faceMat);  // plane z = 0, x >= 0
  const faceA = new THREE.Mesh(new THREE.CircleGeometry(R, 64, -Math.PI / 2, Math.PI), faceMat);  // plane x = 0, z >= 0
  faceA.rotation.y = -Math.PI / 2;
  globe.add(faceA, faceB);
  // Layer names on face A (the left cut face), spread out at different heights.
  const onA = (r, deg) => new THREE.Vector3(0, R * r * Math.sin(deg * Math.PI / 180), R * r * Math.cos(deg * Math.PI / 180));
  const layerTags = [
    label('Crust', onA(1.02, 62)),
    label('Mantle', onA(0.76, 42)),
    label('Outer core', new THREE.Vector3(R * 0.42 * Math.cos(-0.75), R * 0.42 * Math.sin(-0.75), 0.02), { cls: 'warm' }),
    label('Inner core', onA(0.17, -50), { cls: 'warm' }),
  ];
  // Depth marker on face B.
  const MARK_A = 22 * Math.PI / 180;
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
  globe.add(marker);
  const markLine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
  globe.add(markLine);
  const markTag = label('', marker, { cls: 'cool' });
  function placeMarker() {
    const r = R * radiusAt(st.depth);
    marker.position.set(r * Math.cos(MARK_A), r * Math.sin(MARK_A), 0.03);
    const len = R - r;
    markLine.scale.y = Math.max(0.001, len);
    markLine.rotation.z = MARK_A - Math.PI / 2;
    markLine.position.set((r + len / 2) * Math.cos(MARK_A), (r + len / 2) * Math.sin(MARK_A), 0.02);
    markTag.text = `${fmt(st.depth)} km down`;
  }

  // Convection: particles going round in loops in the mantle on face B (z = 0 plane).
  const CELLS = [[-62, 1], [-8, -1], [46, 1]], PER = 60, NPART = CELLS.length * PER;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(NPART * 3), pCol = new Float32Array(NPART * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const parts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.075, vertexColors: true, sizeAttenuation: true }));
  parts.frustumCulled = false;
  globe.add(parts);
  const hot = new THREE.Color(0xffe066), cool = new THREE.Color(0x4cc9f0), cTmp = new THREE.Color();
  function moveParticles(t) {
    for (let c = 0; c < CELLS.length; c++) {
      const [mid, dir] = CELLS[c];
      for (let j = 0; j < PER; j++) {
        const s = (j / PER + t * 0.05 * dir) * Math.PI * 2;
        const lane = 0.55 + 0.45 * rand(c * 100 + j);           // inner and outer loops
        const ang = (mid + 24 * lane * Math.cos(s)) * Math.PI / 180;
        const r = R * (0.76 + 0.17 * lane * Math.sin(s));
        const i = (c * PER + j) * 3;
        pPos[i] = r * Math.cos(ang); pPos[i + 1] = r * Math.sin(ang); pPos[i + 2] = 0.03;
        // Rising rock (moving outward) is hot, sinking rock is cooler.
        cTmp.copy(cool).lerp(hot, 0.5 + 0.5 * Math.cos(s) * dir);
        pCol[i] = cTmp.r; pCol[i + 1] = cTmp.g; pCol[i + 2] = cTmp.b;
      }
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }
  const plateTag = label('Plate (lithosphere)', new THREE.Vector3(R * Math.cos(1.25), R * Math.sin(1.25) + 0.1, 0.05));
  const riseTag = label('Hot rock rises', new THREE.Vector3(R * 0.95 * Math.cos(0.33), R * 0.95 * Math.sin(0.33), 0.05), { cls: 'warm' });
  const sinkTag = label('Cooler rock sinks', new THREE.Vector3(R * 0.66 * Math.cos(-0.6), R * 0.66 * Math.sin(-0.6), 0.05), { cls: 'cool' });

  // =========================================================== World map (Pangaea)
  const map = new THREE.Group();
  map.rotation.x = -Math.PI / 2;
  scene.add(map);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), new THREE.MeshStandardMaterial({ map: paintOcean(THREE), roughness: 0.8 }));
  map.add(ocean);
  const conts = {};
  const sideMat = kit.mat(0x8a6a4a);
  for (const key of Object.keys(POLY)) {
    const c = centroid(POLY[key]);
    const shapes = POLY[key].map(poly => new THREE.Shape(poly.map(([lo, la]) => new THREE.Vector2((lo - c[0]) * S, (la - c[1]) * S))));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 0.12, bevelEnabled: false });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, [kit.mat(COLORS[key], { roughness: 0.9 }), sideMat]));
    map.add(g);
    conts[key] = { g, c, today: { x: c[0] * S, y: c[1] * S, rot: 0 }, patches: [] };
  }
  // Pangaea poses.
  for (const [key, [cen, deg]] of Object.entries(MANUAL)) {
    conts[key].pan = { x: (cen[0] + AF[0]) * S, y: (cen[1] + AF[1]) * S, rot: deg * Math.PI / 180 };
  }
  for (const [key, pairs] of Object.entries(FITS)) {
    const c = conts[key].c;
    const P = pairs.map(p => p[0]), Q = pairs.map(p => [p[1][0] + AF[0], p[1][1] + AF[1]]);
    const rot = Math.atan2(Q[1][1] - Q[0][1], Q[1][0] - Q[0][0]) - Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0]);
    const lx = ((P[0][0] + P[1][0]) / 2 - c[0]) * S, ly = ((P[0][1] + P[1][1]) / 2 - c[1]) * S;
    const qx = (Q[0][0] + Q[1][0]) / 2 * S, qy = (Q[0][1] + Q[1][1]) / 2 * S;
    conts[key].pan = { x: qx - (lx * Math.cos(rot) - ly * Math.sin(rot)), y: qy - (lx * Math.sin(rot) + ly * Math.cos(rot)), rot };
  }
  // Africa's MANUAL entry above is its own centre moved south (no turn).
  conts.af.pan = { x: (conts.af.c[0] + AF[0]) * S, y: (conts.af.c[1] + AF[1]) * S, rot: 0 };
  conts.eu.pan = { x: (conts.eu.c[0] + AF[0]) * S, y: (conts.eu.c[1] + AF[1]) * S, rot: 0 };
  function poseMap() {
    const u = 1 - st.ma / PANGAEA_MA;
    for (const k of Object.values(conts)) {
      k.g.position.set(kit.lerp(k.pan.x, k.today.x, u), kit.lerp(k.pan.y, k.today.y, u), 0.01);
      k.g.rotation.z = kit.lerp(k.pan.rot, k.today.rot, u);
    }
  }
  const tagAt = (key, dx = 0, dy = 0) => { const o = new THREE.Object3D(); o.position.set(dx, dy, 0.2); conts[key].g.add(o); return o; };
  const contTags = [
    label('Africa', tagAt('af', 0.1, 0.1)), label('South America', tagAt('sa', 0.2, 0.2)),
    label('North America', tagAt('na', 0.6, -0.2)), label('India', tagAt('in')),
  ];
  const pangaeaTag = label('Pangaea', new THREE.Vector3(-0.4, 0.4, 0.6), { cls: 'big warm' });
  // Evidence patches (children of the continents, so they move with them).
  const patchGeo = new THREE.CircleGeometry(1, 28), iconGeo = new THREE.PlaneGeometry(0.62, 0.62);
  for (const [key, ev] of Object.entries(EVIDENCE)) {
    const m = new THREE.MeshBasicMaterial({ color: ev.color, transparent: true, opacity: 0.85, depthWrite: false });
    const im = ev.icon && new THREE.MeshBasicMaterial({ map: fossilTexture(THREE, ev.icon, '#fffaf0'), transparent: true, depthWrite: false });
    ev.meshes = [];
    for (const [ck, lo, la, rx, ry, rot] of ev.at) {
      const k = conts[ck];
      const p = new THREE.Mesh(patchGeo, m);
      p.position.set((lo - k.c[0]) * S, (la - k.c[1]) * S, 0.125);
      p.scale.set(rx * S, ry * S, 1);
      p.rotation.z = rot * Math.PI / 180;
      p.renderOrder = 3;
      k.g.add(p); ev.meshes.push(p);
      if (im) {
        const ic = new THREE.Mesh(iconGeo, im);
        ic.position.set(p.position.x, p.position.y, 0.13);
        ic.rotation.z = -k.pan.rot;  // upright when the continents are joined
        ic.renderOrder = 4;
        k.g.add(ic); ev.meshes.push(ic);
      }
    }
  }
  const showEvidence = which => { for (const [key, ev] of Object.entries(EVIDENCE)) ev.meshes.forEach(m => { m.visible = key === which; }); };

  // =========================================================== Shared pieces for the blocks
  const mantleMat = new THREE.MeshStandardMaterial({ map: rockTexture(THREE, 'magma').clone(), roughness: 0.9, color: 0xffb08a });
  mantleMat.map.repeat.set(2, 0.6); mantleMat.map.needsUpdate = true;
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff8c1a });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3d8fd6, transparent: true, opacity: 0.32, roughness: 0.2, depthWrite: false });
  const blobGeo = new THREE.SphereGeometry(0.07, 10, 8);
  const blobs = (parent, n) => Array.from({ length: n }, () => { const b = new THREE.Mesh(blobGeo, glowMat); parent.add(b); return b; });
  const mkArrow = (parent, color, x, y, z, dir, len = 1.1) => {
    const a = arrow(THREE, color, { radius: 0.06, head: 0.28 });
    a.setLength(len); a.position.set(x, y, z); a.rotation.z = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    parent.add(a); return a;
  };
  // Moving stripes on basalt: the texture scrolls so the sea floor looks as if it moves.
  const stripeTex = canvasTex(THREE, 256, 16, (g, w, h) => {
    let x = 0, i = 0;
    while (x < w) { const bw = 10 + rand(i + 40) * 26; g.fillStyle = i % 2 ? '#7b7f86' : '#f4f1ea'; g.fillRect(x, 0, bw + 1, h); x += bw; i++; }
  });

  // =========================================================== Divergent boundary (mid-ocean ridge)
  const div = new THREE.Group();
  scene.add(div);
  kit.mesh(new THREE.BoxGeometry(8, 1.6, 2.98), mantleMat, [0, -1.45, 0], div);
  const ridgeH = x => 0.4 * Math.exp(-Math.abs(x) / 1.1);
  const ridgePath = [];
  for (let x = 0.1; x <= 4.001; x += 0.1) ridgePath.push([x, ridgeH(x)]);
  const ridgeGeo = slabGeometry(THREE, ridgePath, 0.75, 3, 4);
  // Colour by age: red at the ridge (young) through yellow and green to blue (old).
  const AGE_COLS = [new THREE.Color(0xe63946), new THREE.Color(0xf4a261), new THREE.Color(0xe9c46a), new THREE.Color(0x8ac926), new THREE.Color(0x4895ef)];
  const ageColor = (f, out) => { const x = kit.clamp(f, 0, 1) * (AGE_COLS.length - 1), i = Math.min(AGE_COLS.length - 2, Math.floor(x)); return out.copy(AGE_COLS[i]).lerp(AGE_COLS[i + 1], x - i); };
  {
    const p = ridgeGeo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { ageColor((p.getX(i) - 0.1) / 3.9, c); col.set([c.r, c.g, c.b], i * 3); }
    ridgeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const ridgeMat = new THREE.MeshStandardMaterial({ map: stripeTex, vertexColors: true, roughness: 0.85 });
  const halfR = new THREE.Mesh(ridgeGeo, ridgeMat), halfL = new THREE.Mesh(ridgeGeo, ridgeMat);
  halfL.rotation.y = Math.PI;
  div.add(halfR, halfL);
  kit.mesh(new THREE.BoxGeometry(0.2, 1.2, 3.0), glowMat, [0, -0.25, 0], div);          // magma in the crack
  const water = new THREE.Mesh(new THREE.BoxGeometry(8, 0.55, 3), waterMat);
  water.position.y = 0.5 + 0.275 - 0.2; water.renderOrder = 2;
  div.add(water);
  const divBlobs = blobs(div, 8);
  const divArrows = [mkArrow(div, 0x1d3557, 0.9, 1.15, 0, 1), mkArrow(div, 0x1d3557, -0.9, 1.15, 0, -1)];
  const pin = new THREE.Group();
  div.add(pin);
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }), [0, 0.55, 0], pin);
  kit.mesh(new THREE.ConeGeometry(0.08, 0.2, 10), new THREE.MeshBasicMaterial({ color: 0x111111 }), [0, -0.05, 0], pin).rotation.x = Math.PI;
  const pinTop = new THREE.Object3D(); pinTop.position.y = 1.15; pin.add(pinTop);
  const pinTag = label('', pinTop);
  const ridgeTag = label('Mid-ocean ridge', new THREE.Vector3(-0.9, 0.15, 1.5), { cls: 'warm' });
  const divMagmaTag = label('Magma rises', new THREE.Vector3(0, -1.5, 1.5), { cls: 'warm' });
  const SPREAD_KM_PER_MY = 12.5; // 1.25 cm per year on each side = 12.5 km per million years
  function placePin() {
    const x = 0.1 + (st.markKm / 2500) * 3.85;
    pin.position.set(x, ridgeH(x), 0.6);
    const age = st.markKm / SPREAD_KM_PER_MY;
    pinTag.text = st.markKm < 1 ? 'Brand-new rock' : `About ${fmt(age)} million years old`;
  }

  // =========================================================== Convergent: ocean meets continent
  const oc = new THREE.Group();
  scene.add(oc);
  kit.mesh(new THREE.BoxGeometry(8, 2.6, 2.96), mantleMat, [0, -1.9, 0], oc);
  const slabPath = [];
  { let x = -4, y = 0, a = 0; slabPath.push([x, y]);
    for (let s = 0; s < 12 && x < 3.9 && y > -3.1; s += 0.1) { if (x > -0.6) a = Math.min(0.62, a + 0.035); x += Math.cos(a) * 0.1; y -= Math.sin(a) * 0.1; slabPath.push([x, y]); } }
  const slabTop = x => { for (let i = 1; i < slabPath.length; i++) if (slabPath[i][0] >= x) { const [x0, y0] = slabPath[i - 1], [x1, y1] = slabPath[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return slabPath[slabPath.length - 1][1]; };
  const slabTex = stripeTex.clone(); slabTex.needsUpdate = true;
  const slabMat = new THREE.MeshStandardMaterial({ map: slabTex, color: 0x6c7480, roughness: 0.85 });
  oc.add(new THREE.Mesh(slabGeometry(THREE, slabPath, 0.45, 3.04, 3), slabMat));
  // Continental crust sitting on the sinking slab.
  const crustTex = rockTexture(THREE, 'granite');
  const crustMat = new THREE.MeshStandardMaterial({ map: crustTex, color: 0xe8d2b0, roughness: 0.9 });
  {
    const sh = new THREE.Shape();
    sh.moveTo(-0.35, 0.08); sh.lineTo(0.6, 0.38); sh.lineTo(4, 0.38); sh.lineTo(4, -0.95);
    let x = 4; while (x > -0.35 && slabTop(x) < -0.95) x -= 0.05;
    sh.lineTo(x, -0.95);
    for (; x > -0.35; x -= 0.1) sh.lineTo(x, slabTop(x) + 0.005);
    sh.lineTo(-0.35, slabTop(-0.35) + 0.005);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false });
    geo.translate(0, 0, -1.5);
    const m = new THREE.Mesh(geo, crustMat);
    oc.add(m);
  }
  const ocWater = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.25, 3), waterMat);
  ocWater.position.set(-2.175, 0.125, 0); ocWater.renderOrder = 2;
  oc.add(ocWater);
  const VX = 1.9;
  // Half a volcano, cut open at the front face so the magma's path shows.
  const volcMat = kit.mat(0x6b5b53, { roughness: 1, side: THREE.DoubleSide });
  kit.mesh(new THREE.ConeGeometry(0.75, 0.95, 24, 1, true, Math.PI / 2, Math.PI), volcMat, [VX, 0.38 + 0.47, 1.5], oc);
  {
    const sh = new THREE.Shape(); sh.moveTo(-0.75, 0); sh.lineTo(0.75, 0); sh.lineTo(0.06, 0.95); sh.lineTo(-0.06, 0.95);
    kit.mesh(new THREE.ShapeGeometry(sh), kit.mat(0x8a776b, { roughness: 1 }), [VX, 0.38, 1.505], oc);
    kit.mesh(new THREE.PlaneGeometry(0.08, 1.7), glowMat, [VX, -0.05, 1.51], oc);
  }
  // Magma path drawn on the front cut face.
  const chamber = kit.mesh(new THREE.CircleGeometry(0.28, 20), glowMat, [VX, -0.35, 1.535], oc);
  chamber.scale.y = 0.55;
  const ocBlobs = blobs(oc, 9);
  const ocArrows = [mkArrow(oc, 0x1d3557, -3.2, 0.75, 0, 1), mkArrow(oc, 0x1d3557, 3.4, 1.0, 0, -1, 0.9)];
  const trenchTag = label('Trench', new THREE.Vector3(-0.45, 0.25, -0.6), { cls: 'cool' });
  const oPlateTag = label('Ocean plate sinks', new THREE.Vector3(1.1, -1.2, 1.5), { cls: 'cool' });
  const volcTag = label('Volcano', new THREE.Vector3(VX, 1.45, 1.5), { cls: 'warm' });
  const contTag = label('Continent', new THREE.Vector3(3.2, 0.5, 1.5));

  // =========================================================== Convergent: continent meets continent
  const cc = new THREE.Group();
  scene.add(cc);
  kit.mesh(new THREE.BoxGeometry(8, 2.2, 2.96), mantleMat, [0, -1.85, 0], cc);
  const indTex = rockTexture(THREE, 'sandstone').clone(); indTex.repeat.set(2, 1); indTex.needsUpdate = true;
  const indMat = new THREE.MeshStandardMaterial({ map: indTex, color: 0xf2d29a, roughness: 0.9 });
  const asiaMat = new THREE.MeshStandardMaterial({ map: rockTexture(THREE, 'sandstone'), color: 0xc9a27c, roughness: 0.9 });
  kit.mesh(new THREE.BoxGeometry(4, 0.9, 3), indMat, [-2, -0.3, 0], cc);
  kit.mesh(new THREE.BoxGeometry(4, 0.9, 3), asiaMat, [2, -0.3, 0], cc);
  const range = new THREE.Group();
  range.position.y = 0.15;
  cc.add(range);
  const hgt = (x, z) => { const k = Math.max(0, 1 - Math.abs(x) / 1.3); return Math.pow(k, 1.2) * (0.75 + 0.25 * Math.sin(z * 3.1 + x * 5) * Math.cos(z * 1.7 - x * 2.3)); };
  {
    const geo = new THREE.PlaneGeometry(2.6, 3, 26, 15);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    const rock = new THREE.Color(0x8a7a6a), grass = new THREE.Color(0x7aa35a), snow = new THREE.Color(0xffffff);
    for (let i = 0; i < p.count; i++) {
      const h = hgt(p.getX(i), p.getZ(i)) * 1.5;
      p.setY(i, h);
      if (h < 0.35) c.copy(grass).lerp(rock, h / 0.35); else if (h < 0.95) c.copy(rock); else c.copy(rock).lerp(snow, Math.min(1, (h - 0.95) * 3));
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    range.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true })));
    // Front and back profiles, and the thick "root" of crust pushed down below the mountains.
    for (const z of [1.5, -1.5]) {
      const sh = new THREE.Shape();
      sh.moveTo(-1.3, 0);
      for (let x = -1.3; x <= 1.301; x += 0.1) sh.lineTo(x, hgt(x, z) * 1.5);
      sh.lineTo(1.3, 0);
      for (let x = 1.3; x >= -1.301; x -= 0.1) sh.lineTo(x, -0.45 - hgt(x, 0) * 0.9);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: 0xd9b48a, roughness: 0.9, side: THREE.DoubleSide }));
      m.position.z = z + (z > 0 ? 0.005 : -0.005);
      range.add(m);
    }
  }
  const ccArrows = [mkArrow(cc, 0x1d3557, -3.2, 0.6, 0, 1), mkArrow(cc, 0x1d3557, 3.2, 0.6, 0, -1, 0.6)];
  const himTag = label('Himalaya', new THREE.Vector3(0, 1.75, 0), { cls: 'big' });
  const indiaTag = label('India', new THREE.Vector3(-2.6, 0.25, 1.4));
  const asiaTag = label('Asia', new THREE.Vector3(2.6, 0.25, 1.4));
  const rootTag = label('Thick crust', new THREE.Vector3(0, -1.0, 1.5), { cls: 'warm' });

  // =========================================================== Transform boundary
  const tf = new THREE.Group();
  scene.add(tf);
  const sideTex = rockTexture(THREE, 'sandstone').clone(); sideTex.repeat.set(4, 0.6); sideTex.needsUpdate = true;
  const tfSide = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.9 });
  const tfTop = kit.mat(0x9cc46d, { roughness: 1 });
  const blockMats = [tfSide, tfSide, tfTop, tfSide, tfSide, tfSide];
  const roadMat = kit.mat(0x3a3a3a), lineMat = new THREE.MeshBasicMaterial({ color: 0xffd60a }), streamMat = kit.mat(0x3d8fd6, { roughness: 0.3 });
  const mkHalf = (zc) => {
    const g = new THREE.Group();
    tf.add(g);
    kit.mesh(new THREE.BoxGeometry(8, 1.4, 1.5), blockMats, [0, -0.7, zc], g);
    kit.mesh(new THREE.BoxGeometry(0.55, 0.02, 1.5), roadMat, [-0.8, 0.011, zc], g);
    for (let i = 0; i < 3; i++) kit.mesh(new THREE.BoxGeometry(0.05, 0.022, 0.25), lineMat, [-0.8, 0.012, zc - 0.5 + i * 0.5], g);
    kit.mesh(new THREE.BoxGeometry(0.3, 0.02, 1.5), streamMat, [1.9, 0.011, zc], g);
    return g;
  };
  const tfNear = mkHalf(0.75), tfFar = mkHalf(-0.75);
  kit.mesh(new THREE.BoxGeometry(8.6, 0.03, 0.035), new THREE.MeshBasicMaterial({ color: 0x5a1e0e }), [0, 0.012, 0], tf);
  const tfArrows = [mkArrow(tfNear, 0x1d3557, -2.6, 0.45, 0.75, -1, 1.0), mkArrow(tfFar, 0xb5179e, 2.6, 0.45, -0.75, 1, 1.0)];
  const pacTag = label('Pacific Plate', new THREE.Vector3(-2.6, 0.2, 1.3), { cls: 'cool' });
  const naTag = label('North American Plate', new THREE.Vector3(2.4, 0.2, -1.2));
  const faultTag = label('Fault', new THREE.Vector3(3.6, 0.1, 0), { cls: 'warm' });
  const SLIP_M = 5, UNIT_PER_M = 0.07;

  // =========================================================== Plate speed strip
  const sp = new THREE.Group();
  scene.add(sp);
  const floorTex = stripeTex.clone(); floorTex.repeat.set(3, 1); floorTex.needsUpdate = true;
  kit.mesh(new THREE.BoxGeometry(22, 0.5, 3), new THREE.MeshStandardMaterial({ map: floorTex, color: 0x6c7480, roughness: 0.9 }), [0, -0.25, 0], sp);
  const spWater = new THREE.Mesh(new THREE.BoxGeometry(22, 0.45, 3), waterMat);
  spWater.position.y = 0.225; spWater.renderOrder = 2; sp.add(spWater);
  kit.mesh(new THREE.BoxGeometry(0.12, 0.05, 3), glowMat, [0, 0.02, 0], sp);
  const landTop = (c) => [tfSide, tfSide, kit.mat(c, { roughness: 1 }), tfSide, tfSide, tfSide];
  const amer = kit.mesh(new THREE.BoxGeometry(3, 1.0, 2.6), landTop(0x6fb36a), [0, 0.1, 0], sp);
  const afr = kit.mesh(new THREE.BoxGeometry(3, 1.0, 2.6), landTop(0xc9b26b), [0, 0.1, 0], sp);
  const ruler = kit.mesh(new THREE.BoxGeometry(1, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: 0xffd60a }), [0, 0.5, 1.2], sp);
  const ticks = Array.from({ length: 24 }, () => kit.mesh(new THREE.BoxGeometry(0.03, 0.2, 0.08), new THREE.MeshBasicMaterial({ color: 0xffd60a }), [0, 0.55, 1.2], sp));
  const rulerTagAt = new THREE.Object3D(); rulerTagAt.position.set(0, 0.62, 1.2); sp.add(rulerTagAt);
  const rulerTag = label('', rulerTagAt, { cls: 'big warm' });
  const amerTagAt = new THREE.Object3D(); amerTagAt.position.set(0, -0.6, 1.3); amer.add(amerTagAt);
  const afrTagAt = new THREE.Object3D(); afrTagAt.position.set(0, -0.6, 1.3); afr.add(afrTagAt);
  const amerTag = label('South America', amerTagAt), afrTag = label('Africa', afrTagAt);
  function placeSpeed() {
    const km = st.speedCm * st.speedMa * 10;     // cm/yr x million years: 1 cm/yr = 10 km per million years
    const g = Math.min(km / 1000, 14);           // 1 unit = 1,000 km
    amer.position.x = -g / 2 - 1.5; afr.position.x = g / 2 + 1.5;
    ruler.scale.x = Math.max(0.001, g); ruler.visible = g > 0.02;
    ticks.forEach((t, i) => { t.visible = i * 1 <= g + 1e-6 && g > 0.02; t.position.x = -g / 2 + i; });
    rulerTag.text = `${fmt(km)} km`;
    rulerTag.show(st.step === 7 && !st.quiz);
    const cm = st.speedCm * st.speedMa * 1e6;
    ui.readout(`distance = speed × time = ${st.speedCm} cm/year × ${fmt(st.speedMa * 1e6)} years = ${fmt(cm)} cm = <b>${fmt(km)} km</b><br>` +
      `(1 km = 100,000 cm.) In just one year: ${st.speedCm} cm, about as fast as fingernails grow.`);
  }

  // =========================================================== Step logic
  const allTags = [...layerTags, markTag, plateTag, riseTag, sinkTag, ...contTags, pangaeaTag, pinTag, ridgeTag, divMagmaTag,
    trenchTag, oPlateTag, volcTag, contTag, himTag, indiaTag, asiaTag, rootTag, pacTag, naTag, faultTag, rulerTag, amerTag, afrTag];
  function only(...groups) {
    for (const g of [globe, map, div, oc, cc, tf, sp]) g.visible = groups.includes(g);
    allTags.forEach(t => t.show(false));
  }
  function maReadout() {
    const ma = Math.round(st.ma);
    const what = ma >= 180 ? 'The continents are joined in one supercontinent, <b>Pangaea</b>.'
      : ma >= 120 ? 'Pangaea is <b>breaking apart</b>. A new ocean, the Atlantic, is opening.'
        : ma >= 40 ? 'The Atlantic keeps getting wider. India is moving north toward Asia.'
          : ma > 0 ? 'India has crashed into Asia. The continents are almost where they are today.' : 'This is the map <b>today</b>.';
    ui.readout(`<b>${ma === 0 ? 'Today' : `${ma} million years ago`}</b>: ${what}`);
  }
  function depthReadout() {
    const l = layerAt(st.depth), t = tempAt(st.depth);
    const tt = st.depth < 1 ? 'about 15 °C' : `about ${fmt(Math.round(t / 100) * 100)} °C`;
    ui.readout(`Depth: <b>${fmt(st.depth)} km</b> · Layer: <b>${l.name.toLowerCase()}</b><br>It is ${l.state}.<br>Temperature: <b>${tt}</b>`);
    placeMarker();
  }
  const evText = {
    meso: '<b>Mesosaurus</b> was a small reptile that lived in fresh water about 280 million years ago. Its fossils are found only in southern South America and southern Africa. It could not have swum across a whole ocean.',
    glosso: '<b>Glossopteris</b> was a seed fern with tongue-shaped leaves. Its fossils are found in South America, Africa, India, Antarctica and Australia. Its seeds were too big to be blown across an ocean.',
    rocks: 'The old <b>Appalachian Mountains</b> in North America are made of the same kinds and ages of rock as mountains in Greenland, Scotland, Norway and north-west Africa. Put together, they make one long mountain belt.',
  };
  const ccText = {
    oc: 'The heavier <b>ocean plate</b> slides under the continent and sinks into the mantle (<b>subduction</b>). A deep trench forms where it bends down. Deeper down, water from the sinking plate helps the rock above it melt, and the magma rises to make volcanoes.',
    cc: 'Neither continent sinks, so the crust crumples, folds and piles up into high mountains. India is still pushing into Asia by about 4 to 5 cm a year, so the Himalaya are still rising a little.',
  };
  function setCC(mode) {
    st.ccMode = mode;
    oc.visible = mode === 'oc'; cc.visible = mode === 'cc';
    for (const t of [trenchTag, oPlateTag, volcTag, contTag]) t.show(mode === 'oc');
    for (const t of [himTag, indiaTag, asiaTag, rootTag]) t.show(mode === 'cc');
    ui.readout(ccText[mode]);
    st.phase = 0;
    view(mode === 'oc' ? { radius: 4.3, width: 4.4, yaw: 0.32, pitch: 0.3, target: [0.1, -0.7, 0] } : { radius: 4.1, width: 4.2, yaw: 0.3, pitch: 0.28, target: [0, -0.4, 0] });
  }
  function tfReadout() {
    const m = st.quakes * SLIP_M;
    ui.readout(`Earthquakes so far: <b>${st.quakes}</b>. The road and the stream are now <b>${m} m</b> out of line.<br>` +
      `The plates slide about 3.5 cm a year, so it takes about ${fmt(SLIP_M / 0.035)} years to build up each ${SLIP_M} m jump.`);
  }

  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.play = false;
      globe.rotation.y = 0;
      const go = o => view(o, instant);
      scene.background = (i <= 3 || isQuiz) ? NAVY : SKY;
      if (i === 0) {
        only(globe); shell.material.map = mapTex; parts.visible = false; marker.visible = markLine.visible = true;
        layerTags.forEach(t => t.show(true)); markTag.show(true);
        go({ radius: 2.6, yaw: 0.85, pitch: 0.3, target: [0.25, 0, 0.3] });
        const sl = ui.slider({ label: 'Depth', min: 0, max: EARTH_KM, step: 1, value: st.depth, unit: ' km', format: fmt, onInput: v => { st.depth = v; depthReadout(); } });
        ui.buttons(LAYERS.map(l => ({ label: l.name, onClick: () => { st.depth = Math.round((l.top + l.bot) / 2); sl.set(st.depth); depthReadout(); } })));
        depthReadout();
      }
      if (i === 1) {
        only(globe); shell.material.map = edgeTex; parts.visible = true; marker.visible = markLine.visible = false;
        st.currents = st.edges = true;
        plateTag.show(true); riseTag.show(true); sinkTag.show(true);
        go({ radius: 2.5, yaw: 0.35, pitch: 0.25, target: [0.5, 0, 0] });
        ui.toggle({ label: 'Show convection currents', value: true, onChange: v => { st.currents = v; parts.visible = v; riseTag.show(v); sinkTag.show(v); } });
        ui.toggle({ label: 'Show plate edges', value: true, onChange: v => { shell.material.map = v ? edgeTex : mapTex; } });
        ui.readout('Red lines on the globe: edges between plates. Moving dots: mantle rock flowing in slow loops.');
      }
      if (i === 2 || i === 3) {
        only(map);
        st.maTo = i === 2 ? 0 : PANGAEA_MA;
        if (i === 2) { st.ma = PANGAEA_MA; st.play = true; }
        showEvidence(i === 3 ? st.evidence : null);
        contTags.forEach(t => t.show(true));
        if (i === 2) go({ radius: 4.6, width: 8.6, yaw: 0, pitch: 1.05, target: [0, 0, 0.2] });
        else go({ radius: 3.9, width: 5.4, yaw: 0, pitch: 1.15, target: [0.6, 0, 0.5] });
        if (i === 2) ui.buttons([{ label: 'Play', onClick: () => { if (st.ma <= 0.5) st.ma = PANGAEA_MA; st.maTo = 0; st.play = true; } }, { label: 'Pause', onClick: () => { st.play = false; st.maTo = st.ma; } }]);
        if (i === 3) ui.buttons(Object.keys(EVIDENCE).map(k => ({ label: { meso: 'Mesosaurus', glosso: 'Glossopteris', rocks: 'Mountain rocks' }[k], on: k === st.evidence, onClick: () => { st.evidence = k; showEvidence(k); ui.readout(evText[k]); } })));
        st.maSlider = ui.slider({ label: 'Time', min: 0, max: PANGAEA_MA, step: 1, value: Math.round(st.ma), format: v => (v ? `${v} million years ago` : 'today'), onInput: v => { st.play = false; st.ma = st.maTo = v; poseMap(); if (i === 2) maReadout(); } });
        if (i === 2) maReadout(); else ui.readout(evText[st.evidence]);
        poseMap();
      }
      if (i === 4) {
        only(div); st.spread = true;
        pinTag.show(true); ridgeTag.show(true); divMagmaTag.show(true);
        go({ radius: 4.2, width: 4.3, yaw: 0.3, pitch: 0.32, target: [0, -0.5, 0] });
        ui.buttons([{ label: 'Spread', on: true, onClick: () => { st.spread = true; } }, { label: 'Pause', onClick: () => { st.spread = false; } }]);
        const show = () => {
          placePin();
          const age = st.markKm / SPREAD_KM_PER_MY;
          ui.readout(`age = distance ÷ speed = ${fmt(st.markKm)} km ÷ 12.5 km per million years ≈ <b>${fmt(age)} million years</b><br>(1.25 cm a year × 1,000,000 years = 1,250,000 cm = 12.5 km)`);
        };
        ui.slider({ label: 'Distance from the ridge', min: 0, max: 2500, step: 50, value: st.markKm, unit: ' km', format: fmt, onInput: v => { st.markKm = v; show(); } });
        show();
      }
      if (i === 5) {
        only(); st.phase = 0;
        const row = ui.buttons([{ label: 'Ocean meets continent', onClick: () => setCC('oc') }, { label: 'Continent meets continent', onClick: () => setCC('cc') }]);
        row.select(st.ccMode === 'oc' ? 0 : 1);
        setCC(st.ccMode);
        if (instant) view({}, true);
      }
      if (i === 6) {
        only(tf); st.slide = true; st.slip = 0; st.quakes = 0; st.phase = 0;
        pacTag.show(true); naTag.show(true); faultTag.show(true);
        go({ radius: 3.6, width: 4.2, yaw: 0.25, pitch: 0.6, target: [0, -0.3, 0] });
        ui.buttons([{ label: 'Slide', on: true, onClick: () => { st.slide = true; if (st.quakes >= 6) { st.quakes = 0; st.slip = 0; st.phase = 0; } } }, { label: 'Stop', onClick: () => { st.slide = false; } },
          { label: 'Reset', onClick: () => { st.slide = false; st.quakes = 0; st.slip = 0; st.phase = 0; tfReadout(); } }]);
        tfReadout();
      }
      if (i === 7) {
        only(sp);
        amerTag.show(true); afrTag.show(true);
        go({ radius: 3.2, width: 6.2, yaw: 0, pitch: 0.62, target: [0, 0, 0.3] });
        ui.slider({ label: 'Time', min: 0, max: 200, step: 1, value: st.speedMa, format: v => `${v} million years`, onInput: v => { st.speedMa = v; placeSpeed(); } });
        ui.slider({ label: 'Speed apart', min: 0.5, max: 10, step: 0.5, value: st.speedCm, unit: ' cm/year', onInput: v => { st.speedCm = v; placeSpeed(); } });
        placeSpeed();
      }
      if (isQuiz) {
        only(globe); shell.material.map = edgeTex; parts.visible = true; marker.visible = markLine.visible = false;
        go({ radius: 2.6, yaw: 0.7, pitch: 0.3, target: [0.3, 0, 0.3] });
      }
    },

    update(dt) {
      st.time += dt;
      let busy = false;
      if (globe.visible && parts.visible) { moveParticles(st.time); busy = true; }
      if (st.quiz) { globe.rotation.y = Math.sin(st.time * 0.3) * 0.25; busy = true; }
      if (map.visible) {
        if (st.play || Math.abs(st.ma - st.maTo) > 0.01) {
          const d = st.maTo - st.ma, stepMa = 40 * dt;
          st.ma = Math.abs(d) <= stepMa ? st.maTo : st.ma + Math.sign(d) * stepMa;
          if (st.ma === st.maTo) st.play = false;
          poseMap();
          if (st.maSlider) st.maSlider.set(Math.round(st.ma));
          if (st.step === 2) maReadout();
          busy = true;
        }
        pangaeaTag.show(st.ma > 150 && st.step === 2);
      }
      if (div.visible) {
        if (st.spread) {
          stripeTex.offset.x -= dt * 0.06;
          divBlobs.forEach((b, j) => { const k = (st.time * 0.35 + j / divBlobs.length) % 1; b.position.set((rand(j) - 0.5) * 0.12, -2.0 + k * 2.3, 1.53); b.scale.setScalar(1 - k * 0.5); });
          divArrows.forEach((a, j) => { a.position.x = (j ? -1 : 1) * (0.9 + (st.time * 0.4 % 0.5)); });
          busy = true;
        }
      }
      if (oc.visible) {
        slabTex.offset.x -= dt * 0.08;
        ocBlobs.forEach((b, j) => {
          const k = (st.time * 0.25 + j / ocBlobs.length) % 1, y0 = slabTop(VX) + 0.05, y1 = 1.3;
          b.position.set(VX + Math.sin(k * 9 + j) * 0.05, y0 + (y1 - y0) * k, 1.54); b.scale.setScalar(0.8 + 0.4 * Math.sin(k * Math.PI));
        });
        busy = true;
      }
      if (cc.visible) {
        st.phase = (st.phase + dt / 7) % 1;
        const grow = kit.ease(kit.clamp(st.phase / 0.75, 0, 1));
        range.scale.y = 0.15 + 0.85 * grow;
        indTex.offset.x -= dt * 0.05;
        himTag.at.y = 0.15 + 1.6 * range.scale.y;
        busy = true;
      }
      if (tf.visible) {
        if (st.slide && st.quakes < 6) {
          // Stuck for 2.2 s while strain builds, then a sudden slip of one jump.
          st.phase += dt;
          if (st.phase > 2.2) {
            const k = kit.clamp((st.phase - 2.2) / 0.35, 0, 1);
            st.slip = (st.quakes + kit.ease(k)) * SLIP_M;
            if (k >= 1) { st.quakes++; st.phase = 0; tfReadout(); }
          }
          busy = true;
        }
        const off = st.slip * UNIT_PER_M;
        tfNear.position.x = -off / 2; tfFar.position.x = off / 2;
        const shake = st.phase > 2.2 && st.phase < 2.55 ? Math.sin(st.time * 90) * 0.02 : 0;
        tf.position.y = shake;
      }
      return busy;
    },
  };
}

// World map texture for the globe: ocean, simplified continents and (optionally) plate edges.
function paintGlobe(THREE, edges) {
  return canvasTex(THREE, 512, 256, (g, W, H) => {
    const X = lo => (lo + 180) / 360 * W, Y = la => (90 - la) / 180 * H;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2a6fb8'); gr.addColorStop(0.5, '#2f80d0'); gr.addColorStop(1, '#2a6fb8');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (const key of ['na', 'sa', 'af', 'eu', 'in', 'au']) {
      g.fillStyle = { na: '#78b35a', sa: '#5fa957', af: '#c4ad62', eu: '#8cc26c', in: '#cf9a52', au: '#cc8a50' }[key];
      for (const poly of POLY[key]) { g.beginPath(); poly.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.fill(); }
    }
    g.fillStyle = '#eef3f6'; g.fillRect(0, Y(-68), W, H - Y(-68));
    if (!edges) return;
    g.strokeStyle = '#ff3b30'; g.lineWidth = 2.5; g.lineJoin = 'round';
    const lines = [
      [[-5, 72], [-18, 66], [-30, 55], [-35, 45], [-40, 35], [-45, 25], [-45, 15], [-35, 5], [-20, 0], [-13, -10], [-14, -25], [-13, -40], [-10, -52]],
      [[-180, 52], [-165, 53], [-150, 58], [-136, 58], [-125, 50], [-124, 40], [-117, 32], [-110, 23], [-105, 18], [-95, 14], [-85, 10], [-82, 5], [-80, 0], [-81, -5], [-76, -15], [-71, -25], [-74, -40], [-76, -50], [-60, -58], [-30, -58], [-10, -52], [20, -52], [40, -45]],
      [[180, 52], [165, 55], [155, 50], [145, 42], [142, 35], [142, 25], [145, 15], [140, 5], [150, -5], [160, -10], [168, -15], [175, -20], [178, -30], [175, -40], [168, -48], [160, -60], [140, -55], [110, -50], [90, -40], [70, -25]],
      [[125, 20], [127, 10], [125, 0], [115, -9], [105, -7], [96, 2], [94, 12], [92, 20]],
      [[-10, 36], [10, 37], [20, 36], [28, 34], [36, 36], [45, 37], [55, 28], [62, 26], [68, 25], [72, 34], [80, 31], [90, 28], [95, 27], [97, 20], [92, 20]],
      [[-110, 23], [-108, 10], [-104, 0], [-110, -20], [-112, -35], [-115, -50], [-120, -60], [-76, -50]],
      [[44, 12], [57, 14], [60, 8], [68, 0], [70, -10], [70, -25], [55, -35], [40, -45]],
      [[36, 15], [38, 5], [36, -5], [35, -15]],
    ];
    for (const l of lines) { g.beginPath(); l.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.stroke(); }
  });
}

// The cut face: concentric layers drawn on a square (the half-disc's UVs map onto it).
function paintLayers(THREE) {
  const t = canvasTex(THREE, 512, 512, (g, W) => {
    const c = W / 2, rr = f => f * c;
    const ring = (f, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(c, c, rr(f), 0, Math.PI * 2); g.fill(); };
    ring(1, '#8b6b4a');                                   // crust
    const m = g.createRadialGradient(c, c, rr(0.546), c, c, rr(0.97));
    m.addColorStop(0, '#b3261e'); m.addColorStop(0.6, '#d9541e'); m.addColorStop(1, '#ee8a3c');
    ring(0.97, '#9c4a2a');                                // stiff top of the mantle (part of the plates)
    ring(0.95, m);
    const oc = g.createRadialGradient(c, c, rr(0.19), c, c, rr(0.546));
    oc.addColorStop(0, '#ffd166'); oc.addColorStop(1, '#f48c06');
    ring(0.546, oc);
    const ic = g.createRadialGradient(c, c, 0, c, c, rr(0.191));
    ic.addColorStop(0, '#fffbe6'); ic.addColorStop(1, '#ffe08a');
    ring(0.191, ic);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
    for (const f of [0.97, 0.546, 0.191]) { g.beginPath(); g.arc(c, c, rr(f), 0, Math.PI * 2); g.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function paintOcean(THREE) {
  return canvasTex(THREE, 512, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#1f5f9e'); gr.addColorStop(0.5, '#2a77c0'); gr.addColorStop(1, '#1f5f9e');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1;
    for (let lo = 0; lo <= 360; lo += 30) { const x = lo / 360 * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let la = 0; la <= 180; la += 30) { const y = la / 180 * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  });
}
