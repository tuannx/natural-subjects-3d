// Habitats: four habitat tiles on a turntable (pond, desert, polar ice, forest). Each tile has living
// things whose features fit it. In the last step a fish, camel, polar bear or cactus can be moved to
// another tile, where it struggles (too hot, too cold, no water...), and back home again.
import { rand, makeTree, makeMushroom, makeFrog, tuftGeometry } from '../_shared/habitat-kit.js';

const R = 4.2;      // turntable radius
const TOP = 0.42;   // height of the tile tops
const MID = 2.35;   // distance from the centre to the middle of each tile
const HAB = ['pond', 'desert', 'polar', 'forest'];
const NAME = { pond: 'Pond', desert: 'Desert', polar: 'Polar ice', forest: 'Forest' };
const TH = i => (i * Math.PI) / 2;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const POND_C = [-0.25, -0.1];   // pond centre on its tile
const WATER_Y = 0.22;           // pond water surface above the tile
const VISIT = [0.8, 0.85];      // free spot on each tile where a visitor stands

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const { clamp, lerp, follow } = kit;
  kit.stage(scene, { ground: 0xe9dcc4, sky: 0xdcefff, radius: 18 });
  kit.lights(scene, { sun: [5, 11, 7] });
  const Y = new THREE.Vector3(0, 1, 0);

  // Turntable with four wedge-shaped tiles.
  const table = new THREE.Group();
  scene.add(table);
  kit.mesh(new THREE.CylinderGeometry(R + 0.15, R + 0.25, 0.3, 48), kit.mat(0xa47148), [0, 0.15, 0], table);
  const TILE = { pond: 0x7cc46a, desert: 0xf0cf8a, polar: 0xf4f8fc, forest: 0x4f8f45 };
  HAB.forEach((h, i) => kit.mesh(new THREE.CylinderGeometry(R, R, 0.12, 12, 1, false, TH(i) - Math.PI / 4 + 0.015, Math.PI / 2 - 0.03), kit.mat(TILE[h]), [0, 0.36, 0], table));
  const hab = HAB.map((h, i) => {
    const g = new THREE.Group();
    g.position.set(Math.sin(TH(i)) * MID, TOP, Math.cos(TH(i)) * MID);
    g.rotation.y = TH(i);
    table.add(g);
    return g;
  });
  // Turntable-local position of a point given in a tile's own coordinates.
  const local = (i, x, y, z, out) => out.set(x, y, z).applyAxisAngle(Y, TH(i)).add(hab[i].position);
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const nameTags = HAB.map((h, i) => label(NAME[h], anchor(hab[i], 0, 0.35, 0.45), { cls: 'big' }));

  // ---------- Pond ----------
  const P = hab[0], [pcx, pcz] = POND_C;
  const rockMat = kit.mat(0x8f939a, { flatShading: true });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, s = 0.09 + rand(i) * 0.05;
    const r = kit.mesh(new THREE.DodecahedronGeometry(s, 0), rockMat, [pcx + Math.cos(a) * 0.95, s * 0.7, pcz + Math.sin(a) * 0.95], P);
    r.rotation.set(rand(i + 4) * 3, rand(i + 9) * 3, 0);
  }
  kit.mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.02, 28), kit.mat(0x3d5c4a), [pcx, 0.01, pcz], P).castShadow = false;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.93, WATER_Y, 28), new THREE.MeshStandardMaterial({ color: 0x4aa3df, transparent: true, opacity: 0.45, roughness: 0.15, depthWrite: false }));
  water.position.set(pcx, WATER_Y / 2 + 0.01, pcz);
  water.renderOrder = 2;
  P.add(water);
  const padMat = kit.mat(0x3f9b46, { side: THREE.DoubleSide });
  const pad = (x, z, s) => { const m = kit.mesh(new THREE.CircleGeometry(0.14 * s, 14, 0.35, Math.PI * 2 - 0.7), padMat, [x, WATER_Y + 0.012, z], P); m.rotation.x = -Math.PI / 2; m.castShadow = false; return m; };
  pad(pcx - 0.45, pcz - 0.38, 1.1); pad(pcx + 0.45, pcz - 0.5, 0.8);
  kit.mesh(new THREE.SphereGeometry(0.05, 8, 6), kit.mat(0xff8fc0), [pcx + 0.45, WATER_Y + 0.05, pcz - 0.5], P);
  const reedMat = kit.mat(0x6a9a3a), cattail = kit.mat(0x6b4226);
  for (let i = 0; i < 7; i++) {
    const x = pcx - 0.7 + i * 0.12, z = pcz - 1.02 - rand(i) * 0.12, h = 0.55 + rand(i + 2) * 0.3;
    kit.mesh(new THREE.CylinderGeometry(0.012, 0.016, h, 5), reedMat, [x, h / 2, z], P);
    if (i % 2 === 0) kit.mesh(new THREE.CapsuleGeometry(0.03, 0.1, 2, 6), cattail, [x, h - 0.05, z], P);
  }
  const grassGeo = tuftGeometry(THREE, { h: 0.22 });
  const grassMat = kit.mat(0x4f9d3a);
  [[0.9, -0.6], [1.1, 0.2], [-1.15, 0.7], [0.2, 1.1], [-0.6, 1.0]].forEach(([x, z]) => kit.mesh(grassGeo, grassMat, [x, 0, z], P));
  const frog = makeFrog(THREE, kit);
  frog.position.set(pcx - 0.45, WATER_Y + 0.015, pcz - 0.38);
  frog.rotation.y = -0.5;
  P.add(frog);

  // Fish (a mover): orange body, tail, fins and gills; light-blue "water" bits show water flowing over the gills.
  const fish = new THREE.Group(), fishBody = new THREE.Group();
  fish.add(fishBody);
  const orange = kit.mat(0xf08a24);
  kit.mesh(new THREE.SphereGeometry(0.15, 16, 10), orange, [0, 0, 0], fishBody).scale.set(1.4, 0.8, 0.55);
  const tail = new THREE.Group();
  tail.position.x = -0.19;
  fishBody.add(tail);
  const tailFin = kit.mesh(new THREE.ConeGeometry(0.11, 0.18, 4), orange, [-0.07, 0, 0], tail);
  tailFin.rotation.z = Math.PI / 2; tailFin.scale.z = 0.25;
  const finMat = kit.mat(0xffb05a, { side: THREE.DoubleSide });
  const dorsal = kit.mesh(new THREE.CircleGeometry(0.08, 6, 0, Math.PI), finMat, [-0.02, 0.1, 0], fishBody);
  const fins = [dorsal];
  for (const z of [-1, 1]) {
    const f = kit.mesh(new THREE.CircleGeometry(0.05, 5, Math.PI, Math.PI * 0.6), finMat, [0.05, -0.05, z * 0.08], fishBody);
    f.rotation.y = z * 0.4;
    fins.push(f);
    kit.mesh(new THREE.SphereGeometry(0.022, 8, 6), kit.mat(0xffffff), [0.13, 0.03, z * 0.06], fishBody);
    kit.mesh(new THREE.SphereGeometry(0.012, 6, 4), kit.mat(0x111111), [0.145, 0.032, z * 0.075], fishBody);
  }
  const gillMat = kit.mat(0xb3262e, { emissive: 0x000000 });
  const gills = [-1, 1].map(z => {
    const m = kit.mesh(new THREE.TorusGeometry(0.06, 0.009, 4, 10, Math.PI * 0.8), gillMat, [0.06, 0, z * 0.072], fishBody);
    m.rotation.z = -Math.PI * 0.4;
    return m;
  });
  const flowMat = new THREE.MeshBasicMaterial({ color: 0x9fe3ff, transparent: true, opacity: 0.85 });
  const flow = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), flowMat); m.scale.x = 2.2; fishBody.add(m); flow.push(m); }
  const gillTag = label('Gills', anchor(fishBody, 0.06, 0.1, 0.08), { cls: 'warm' });
  const finTag = label('Fins and tail', anchor(tail, -0.05, 0.12, 0));
  const feetTag = label('Webbed feet', anchor(frog, -0.02, 0.05, 0.12));
  table.add(fish);

  // ---------- Desert ----------
  const D = hab[1];
  const sandDark = kit.mat(0xe2b86b);
  const dune = (x, z, sx, sy, sz) => { const m = kit.mesh(new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), sandDark, [x, 0, z], D); m.scale.set(sx, sy, sz); };
  dune(-0.5, -0.95, 1.0, 0.32, 0.5); dune(0.6, -1.05, 0.7, 0.22, 0.4);
  const sun = kit.mesh(new THREE.SphereGeometry(0.2, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffcf3a }), [1.05, 2.1, -1.0], D);
  sun.castShadow = false;
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.3, depthWrite: false })));
  const cactusColor = 0x3f8f4a;
  const smallCactus = (x, z, s) => { const c = makeCactus(THREE, kit, kit.mat(cactusColor), s); c.group.position.set(x, 0, z); D.add(c.group); };
  smallCactus(0.25, -0.75, 0.6); smallCactus(-1.05, 0.55, 0.5);
  const barrel = kit.mesh(new THREE.SphereGeometry(0.13, 12, 8), kit.mat(0x4c9a50), [-1.05, 0.1, -0.2], D);
  barrel.scale.y = 0.8;

  // Camel (a mover).
  const camel = new THREE.Group(), camelBody = new THREE.Group();
  camel.add(camelBody);
  const tan = kit.mat(0xc9a066), tanDark = kit.mat(0xa77d45);
  kit.mesh(new THREE.SphereGeometry(0.3, 16, 12), tan, [0, 0.72, 0], camelBody).scale.set(1.45, 0.75, 0.75);
  const hump = kit.mesh(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), tan, [-0.05, 0.86, 0], camelBody);
  hump.scale.set(1.25, 1.1, 0.95);
  const neck = kit.mesh(new THREE.CylinderGeometry(0.065, 0.1, 0.5, 8), tan, [0.47, 0.92, 0], camelBody);
  neck.rotation.z = -0.75;
  const head = kit.mesh(new THREE.SphereGeometry(0.1, 12, 8), tan, [0.68, 1.12, 0], camelBody);
  head.scale.set(1.7, 0.75, 0.75);
  for (const z of [-1, 1]) {
    kit.mesh(new THREE.SphereGeometry(0.018, 6, 4), kit.mat(0x111111), [0.72, 1.16, z * 0.065], camelBody);
    kit.mesh(new THREE.ConeGeometry(0.025, 0.06, 5), tanDark, [0.62, 1.21, z * 0.05], camelBody);
  }
  const camelFeet = [];
  for (const x of [-0.27, 0.27]) for (const z of [-0.12, 0.12]) {
    kit.mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.56, 6), tan, [x, 0.3, z], camelBody);
    camelFeet.push(kit.mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.04, 10), tanDark, [x + 0.02, 0.02, z], camelBody));
  }
  const camelTail = kit.mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.25, 5), tanDark, [-0.45, 0.62, 0], camelBody);
  camelTail.rotation.z = -0.3;
  const humpTag = label('Hump stores fat', anchor(hump, 0, 0.28, 0), { cls: 'warm' });
  const camelFeetTag = label('Wide feet', anchor(camelBody, 0.3, 0.12, 0.2));
  table.add(camel);

  // Cactus (a mover): see-through skin shows the water stored inside its thick stem.
  const cactusMat = kit.mat(cactusColor, { transparent: true, opacity: 1 });
  const cactusBase = new THREE.Color(cactusColor);
  const cactusObj = makeCactus(THREE, kit, cactusMat, 1);
  const cactus = new THREE.Group(), cactusBody = cactusObj.group;
  cactus.add(cactusBody);
  const cWater = kit.mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0x2f8fe8, transparent: true, opacity: 0.85 }), [0, 0.42, 0], cactusBody);
  cWater.visible = false; cWater.castShadow = false;
  const spineMat = new THREE.PointsMaterial({ color: 0xfffbe6, size: 0.035 });
  const spinePts = [];
  for (let i = 0; i < 140; i++) {
    const a = rand(i) * Math.PI * 2, y = 0.05 + rand(i + 50) * 0.82;
    spinePts.push(Math.cos(a) * 0.155, y, Math.sin(a) * 0.155);
  }
  const spineGeo = new THREE.BufferGeometry();
  spineGeo.setAttribute('position', new THREE.Float32BufferAttribute(spinePts, 3));
  cactusBody.add(new THREE.Points(spineGeo, spineMat));
  const spineTag = label('Spines', anchor(cactusBody, 0.16, 0.7, 0.05));
  const cWaterTag = label('Water inside', anchor(cactusBody, 0, 0.45, 0.12), { cls: 'cool' });
  table.add(cactus);

  // ---------- Polar ice ----------
  const I = hab[2];
  const hole = kit.mesh(new THREE.CircleGeometry(0.42, 22), kit.mat(0x1f5f8f, { roughness: 0.2 }), [-0.65, 0.008, -0.45], I);
  hole.rotation.x = -Math.PI / 2; hole.castShadow = false;
  const snowMat = kit.mat(0xffffff), iceMat = kit.mat(0xbfe6f5, { roughness: 0.25 });
  const mound = (x, z, s) => { const m = kit.mesh(new THREE.SphereGeometry(s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), snowMat, [x, 0, z], I); m.scale.y = 0.45; };
  mound(0.6, -0.9, 0.5); mound(-1.0, 0.55, 0.32);
  [[0.95, -0.25, 0.3], [-0.2, -1.0, 0.25]].forEach(([x, z, s], j) => { const b = kit.mesh(new THREE.BoxGeometry(s, s * 0.7, s * 0.8), iceMat, [x, s * 0.3, z], I); b.rotation.set(0.15, j * 0.8, 0.2); });
  // Seal resting by the hole.
  const seal = new THREE.Group();
  seal.position.set(-0.05, 0, -0.62); seal.rotation.y = 2.6;
  I.add(seal);
  const grey = kit.mat(0x8a8f99);
  kit.mesh(new THREE.SphereGeometry(0.14, 12, 8), grey, [0, 0.09, 0], seal).scale.set(1.8, 0.65, 0.8);
  kit.mesh(new THREE.SphereGeometry(0.075, 10, 8), grey, [0.24, 0.13, 0], seal);
  for (const z of [-1, 1]) kit.mesh(new THREE.SphereGeometry(0.015, 6, 4), kit.mat(0x111111), [0.3, 0.15, z * 0.035], seal);
  // Falling snow over the polar tile.
  const SNOW = 120, snowPos = new Float32Array(SNOW * 3);
  for (let i = 0; i < SNOW; i++) { snowPos[i * 3] = (rand(i) - 0.5) * 2.6; snowPos[i * 3 + 1] = rand(i + 200) * 2.4; snowPos[i * 3 + 2] = -1 + rand(i + 400) * 2.2; }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  I.add(new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04 })));

  // Polar bear (a mover): white fur over a thick fat layer, big paws.
  const bear = new THREE.Group(), bearBody = new THREE.Group();
  bear.add(bearBody);
  const furMat = kit.mat(0xf6f2e6, { transparent: true, opacity: 1 });
  const fur = kit.mesh(new THREE.SphereGeometry(0.3, 18, 12), furMat, [0, 0.43, 0], bearBody);
  fur.scale.set(1.5, 0.88, 0.85);
  const fat = kit.mesh(new THREE.SphereGeometry(0.255, 16, 10), kit.mat(0xf2cf6b), [0, 0.43, 0], bearBody);
  fat.scale.set(1.5, 0.88, 0.85); fat.visible = false;
  const inner = kit.mesh(new THREE.SphereGeometry(0.2, 14, 10), kit.mat(0xb06a5a), [0, 0.43, 0], bearBody);
  inner.scale.set(1.5, 0.88, 0.85); inner.visible = false;
  const furHead = kit.mat(0xf6f2e6);
  const bHead = kit.mesh(new THREE.SphereGeometry(0.15, 14, 10), furHead, [0.5, 0.55, 0], bearBody);
  bHead.scale.set(1.25, 0.95, 0.9);
  kit.mesh(new THREE.SphereGeometry(0.08, 10, 8), furHead, [0.66, 0.5, 0], bearBody).scale.set(1.2, 0.8, 0.9);
  kit.mesh(new THREE.SphereGeometry(0.03, 8, 6), kit.mat(0x111111), [0.755, 0.52, 0], bearBody);
  for (const z of [-1, 1]) {
    kit.mesh(new THREE.SphereGeometry(0.045, 8, 6), furHead, [0.45, 0.68, z * 0.09], bearBody);
    kit.mesh(new THREE.SphereGeometry(0.017, 6, 4), kit.mat(0x111111), [0.63, 0.6, z * 0.06], bearBody);
  }
  const paws = [];
  for (const x of [-0.27, 0.27]) for (const z of [-0.13, 0.13]) {
    kit.mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.3, 8), furHead, [x, 0.17, z], bearBody);
    const p = kit.mesh(new THREE.SphereGeometry(0.095, 10, 6), furHead, [x + 0.03, 0.035, z], bearBody);
    p.scale.set(1.35, 0.45, 1.1);
    paws.push(p);
  }
  const furTag = label('Thick fur', anchor(bearBody, -0.15, 0.72, 0));
  const fatTag = label('Fat layer', anchor(bearBody, -0.1, 0.45, 0.24), { cls: 'warm' });
  const pawTag = label('Big paws', anchor(bearBody, 0.3, 0.06, 0.2));
  table.add(bear);

  // ---------- Forest ----------
  const F = hab[3];
  const treeA = makeTree(THREE, kit, { h: 1.85, r: 0.5 });
  treeA.position.set(-0.1, 0, -0.3); F.add(treeA);
  [[0.85, -0.7, 1.4], [-1.05, -0.6, 1.25]].forEach(([x, z, h]) => { const t = makeTree(THREE, kit, { kind: 'pine', h, r: 0.38, leaves: 0x2f7a46 }); t.position.set(x, 0, z); F.add(t); });
  const treeD = makeTree(THREE, kit, { h: 0.95, r: 0.32, leaves: 0x5fae4e }); treeD.position.set(-1.15, 0, 0.55); F.add(treeD);
  const holeMesh = kit.mesh(new THREE.CircleGeometry(0.055, 12), new THREE.MeshBasicMaterial({ color: 0x2a1a0e }), [-0.1, 0.42, -0.3 + 0.115], F);
  holeMesh.scale.y = 1.3; holeMesh.castShadow = false;
  [[0.35, 0.35, 1], [0.5, 0.22, 0.7], [-0.6, 0.15, 0.8]].forEach(([x, z, s]) => { const m = makeMushroom(THREE, kit, { s }); m.position.set(x, 0, z); F.add(m); });
  const acorns = [];
  [[0.05, 0.5], [0.15, 0.6], [-0.05, 0.62]].forEach(([x, z], j) => {
    const a = new THREE.Group(); a.position.set(x, 0.03, z); F.add(a);
    kit.mesh(new THREE.SphereGeometry(0.03, 8, 6), kit.mat(0xb07a3a), [0, 0, 0], a).scale.y = 1.25;
    kit.mesh(new THREE.SphereGeometry(0.032, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0x6b4a2a), [0, 0.012, 0], a);
    a.rotation.z = j * 0.8;
    acorns.push(a);
  });
  const forestGrass = kit.mat(0x3e7f34);
  [[0.9, 0.5], [0.4, 1.1], [-0.4, 1.0], [1.15, -0.1]].forEach(([x, z]) => kit.mesh(grassGeo, forestGrass, [x, 0, z], F));

  // Squirrel: climbs tree A on the side facing left, so we see it from the side.
  const squirrel = new THREE.Group(), sqBody = new THREE.Group();
  squirrel.add(sqBody);
  F.add(squirrel);
  const fox = kit.mat(0xb5652a), foxLight = kit.mat(0xe8c39a);
  kit.mesh(new THREE.SphereGeometry(0.07, 12, 8), fox, [0, 0.07, 0], sqBody).scale.set(1.5, 0.9, 0.85);
  kit.mesh(new THREE.SphereGeometry(0.05, 10, 8), fox, [0.1, 0.11, 0], sqBody);
  kit.mesh(new THREE.SphereGeometry(0.035, 8, 6), foxLight, [0.04, 0.05, 0], sqBody).scale.set(1.5, 1, 1);
  for (const z of [-1, 1]) {
    kit.mesh(new THREE.ConeGeometry(0.014, 0.04, 5), fox, [0.09, 0.17, z * 0.022], sqBody);
    kit.mesh(new THREE.SphereGeometry(0.01, 6, 4), kit.mat(0x111111), [0.14, 0.125, z * 0.025], sqBody);
  }
  const claws = [];
  for (const z of [-1, 1]) {
    const c = kit.mesh(new THREE.ConeGeometry(0.012, 0.04, 4), kit.mat(0x222222), [0.1, 0.012, z * 0.03], sqBody);
    c.rotation.z = -Math.PI / 2;
    claws.push(c);
  }
  const sqTail = new THREE.Group();
  sqTail.position.set(-0.09, 0.07, 0);
  sqBody.add(sqTail);
  [[-0.04, 0.03, 0.045], [-0.07, 0.1, 0.055], [-0.05, 0.18, 0.055], [-0.01, 0.23, 0.045]].forEach(([x, y, r]) => kit.mesh(new THREE.SphereGeometry(r, 10, 8), fox, [x, y, 0], sqTail));
  const clawTag = label('Sharp claws', anchor(sqBody, 0.12, -0.02, 0.05));
  const tailTag = label('Bushy tail', anchor(sqTail, -0.08, 0.24, 0));
  const nutTag = label('Nuts to eat', anchor(F, 0.05, 0.1, 0.58));
  const homeTag = label('A home in a tree', anchor(F, -0.1, 0.5, -0.18));

  // ---------- Movers (things that can be moved to another habitat) ----------
  const movers = {
    fish: { obj: fish, body: fishBody, home: 0, pos: [pcx, 0.1, pcz + 0.4], h: 0.32 },
    camel: { obj: camel, body: camelBody, home: 1, pos: [-0.3, 0, 0.15], h: 1.4 },
    cactus: { obj: cactus, body: cactusBody, home: 1, pos: [0.75, 0, -0.15], h: 1.1 },
    bear: { obj: bear, body: bearBody, home: 2, pos: [0.15, 0, 0.25], h: 0.95 },
  };
  for (const [key, m] of Object.entries(movers)) {
    m.key = key; m.tile = m.home; m.hop = 1; m.from = new THREE.Vector3(); m.to = new THREE.Vector3(); m.yaw0 = 0; m.yaw1 = 0;
    spot(m, m.home, m.obj.position);
    m.obj.rotation.y = TH(m.home);
  }
  function spot(m, tile, out) {
    if (tile === m.home) return local(tile, m.pos[0], m.pos[1], m.pos[2], out);
    if (m.key === 'cactus' && tile === 0) return local(tile, pcx + 0.35, 0.02, pcz + 0.25, out);
    return local(tile, VISIT[0], m.key === 'fish' ? 0.08 : 0, VISIT[1], out);
  }
  // What happens in each wrong habitat: [tag, kind of struggle, why].
  const FIT = {
    fish: {
      desert: ['No water!', 'flop', 'A fish needs water. Its gills only work in water, so on dry land it cannot breathe.'],
      polar: ['No water!', 'flop', 'On top of the ice there is no water around it. Its gills only work in water.'],
      forest: ['No water!', 'flop', 'A fish needs water. Its gills only work in water, so on dry land it cannot breathe.'],
    },
    camel: {
      pond: ['Wrong home', 'sad', 'A camel is made for hot, dry sand. Its wide feet are made for sand, not for mud and water.'],
      polar: ['Too cold!', 'shiver', 'A camel is made for the hot desert. On the ice it is far too cold, and there are no desert plants to eat.'],
      forest: ['Wrong home', 'sad', 'A camel is made for open, hot, sandy land. The shady forest is not the home its body fits.'],
    },
    bear: {
      pond: ['Too warm!', 'sweat', 'A polar bear needs cold ice and seals to hunt. A warm pond has neither.'],
      desert: ['Too hot!', 'sweat', 'Thick fur and fat keep a polar bear warm on the ice. In the hot desert they make it far too hot, and there are no seals to catch.'],
      forest: ['Too warm!', 'sweat', 'A polar bear needs cold ice and seals to hunt. A warm forest has neither.'],
    },
    cactus: {
      pond: ['Too wet!', 'rot', 'A cactus needs dry ground. Standing in water, its roots rot and the plant dies.'],
      polar: ['Too cold!', 'freeze', 'A cactus needs warm sun. On the ice it freezes, and its roots find no liquid water.'],
      forest: ['Too shady!', 'pale', 'A cactus needs lots of sun and dry soil. Under the trees it is shady and damp.'],
    },
  };
  const statusAt = new THREE.Object3D();
  table.add(statusAt);
  const status = label('', statusAt);
  const sweat = [0, 1, 2].map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0x3aa0ff })); d.visible = false; table.add(d); return d; });
  const tint = { rot: new THREE.Color(0x8a7a3a), freeze: new THREE.Color(0xc6dde8), pale: new THREE.Color(0x9fb86a) };

  const st = { step: 0, quiz: false, time: 0, rot: 0, rotTo: 0, spin: 0, auto: false, feat: -1, feats: [], sel: null, cond: null, plan: [], climb: 0, focusT: 0 };

  function spinTo(tile) { st.spin = 0; st.rotTo = st.rot + wrap(-TH(tile) - st.rot); }
  function hopTo(m, tile) {
    m.from.copy(m.obj.position); spot(m, tile, m.to);
    m.yaw0 = m.obj.rotation.y; m.yaw1 = m.yaw0 + wrap(TH(tile) - m.yaw0);
    m.hop = 0; m.tile = tile;
  }
  function move(key, tile) {
    for (const m of Object.values(movers)) if (m.key !== key && m.tile !== m.home) hopTo(m, m.home);
    const m = movers[key];
    st.sel = m; st.cond = null; status.show(false);
    ui.readout(`Moving the <b>${key === 'bear' ? 'polar bear' : key}</b> to the <b>${NAME[HAB[tile]].toLowerCase()}</b>...`);
    if (m.tile !== tile || m.hop < 1) hopTo(m, tile); else landed(m);
    spinTo(tile);
  }
  function landed(m) {
    const home = m.tile === m.home, f = home ? null : FIT[m.key][HAB[m.tile]];
    st.cond = home ? 'home' : f[1];
    st.condT = 0;
    status.text = home ? 'Home sweet home' : f[0];
    status.el.className = 'lab ' + (home ? '' : st.cond === 'shiver' || st.cond === 'freeze' ? 'cool' : 'warm');
    status.show(true);
    const name = m.key === 'bear' ? 'polar bear' : m.key;
    ui.readout(home ? `The ${name} is back in the <b>${NAME[HAB[m.tile]].toLowerCase()}</b>, its own habitat. Its body fits this place.` : `<b>${f[0]}</b> ${f[2]}`);
  }
  function resetMovers() {
    for (const m of Object.values(movers)) { m.tile = m.home; m.hop = 1; spot(m, m.home, m.obj.position); m.obj.rotation.y = TH(m.home); m.body.position.set(0, 0, 0); m.body.rotation.set(0, 0, 0); }
    cactusMat.color.copy(cactusBase);
    st.sel = null; st.cond = null; status.show(false);
    sweat.forEach(d => { d.visible = false; });
  }

  // Features: [button, labels, pulsing parts, point to zoom to (tile coordinates)].
  const FEATS = {
    0: [['Gills', [gillTag], gills, [pcx, 0.15, pcz + 0.4]], ['Fins and tail', [finTag], [tail, ...fins], [pcx, 0.15, pcz + 0.4]], ['Webbed feet', [feetTag], frog.userData.feet, [pcx - 0.45, 0.25, pcz - 0.35]]],
    1: [['Hump', [humpTag], [hump], [-0.3, 0.9, 0.15]], ['Wide feet', [camelFeetTag], camelFeet, [-0.3, 0.25, 0.15]], ['Spines', [spineTag], [], [0.75, 0.6, -0.15]], ['Water inside', [cWaterTag], [cWater], [0.75, 0.5, -0.15]]],
    2: [['Thick fur', [furTag], [fur], [0.15, 0.5, 0.25]], ['Fat layer', [fatTag], [fat], [0.15, 0.45, 0.25]], ['Big paws', [pawTag], paws, [0.2, 0.15, 0.25]]],
    3: [['Sharp claws', [clawTag], claws, [-0.35, 0.55, -0.2]], ['Bushy tail', [tailTag], [sqTail], [-0.5, 0.25, -0.1]], ['Food and homes', [nutTag, homeTag], [...acorns, holeMesh], [0, 0.45, 0.1]]],
  };
  const allFeatTags = [gillTag, finTag, feetTag, humpTag, camelFeetTag, spineTag, cWaterTag, furTag, fatTag, pawTag, clawTag, tailTag, nutTag, homeTag];
  const pulsing = new Set();
  for (const list of Object.values(FEATS)) for (const f of list) for (const o of f[2]) o.userData.s0 = o.scale.clone();
  function focus(j, zoom) {
    st.feat = j; st.focusT = 0;
    for (const o of pulsing) o.scale.copy(o.userData.s0);
    pulsing.clear();
    allFeatTags.forEach(t => t.show(false));
    const f = st.feats[j];
    if (!f) return;
    f[1].forEach(t => t.show(true));
    f[2].forEach(o => pulsing.add(o));
    if (zoom) { const [x, y, z] = f[3]; view({ radius: 1.05, yaw: 0, pitch: 0.3, target: [x, TOP + y, MID + z] }); }
  }
  const front = { radius: 2.0, yaw: 0, pitch: 0.42, target: [0, TOP + 0.5, MID + 0.1] };
  const overview = { radius: 4.7, yaw: 0, pitch: 0.62, target: [0, 0.6, 0] };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.quiz = isQuiz; st.time = 0; st.auto = false; st.feats = []; st.plan = []; st.climb = 0;
      resetMovers(); focus(-1);
      nameTags.forEach(t => t.show(false));
      if (i === 0 || isQuiz) {
        go(isQuiz ? { ...overview, pitch: 0.7 } : overview);
        st.spin = isQuiz ? 0.12 : 0.25;
        nameTags.forEach(t => t.show(true));
        if (!isQuiz) ui.buttons(HAB.map((h, j) => ({ label: NAME[h], onClick: () => spinTo(j) })));
      }
      if (i >= 1 && i <= 4) {
        const tile = i - 1;
        spinTo(tile); st.rot = st.rotTo;
        go(front);
        st.feats = FEATS[tile]; st.auto = true;
        focus(0, false);
        ui.buttons(st.feats.map((f, j) => ({ label: f[0], onClick: () => { st.auto = false; focus(j, true); } })));
        ui.buttons([{ label: 'See the whole habitat', onClick: () => { st.auto = false; focus(-1); view(front); } }]);
      }
      if (i === 5) {
        spinTo(2); st.rot = st.rotTo;
        go({ ...front, radius: 2.1, target: [0, TOP + 0.45, MID + 0.2] });
        st.auto = true;
        st.plan = [[0.3, () => move('bear', 1)], [6, () => move('bear', 2)], [9.5, () => move('camel', 2)], [15, () => move('camel', 1)], [18.5, () => move('fish', 3)], [24, () => move('fish', 0)]];
        let pick = 'bear';
        const keys = ['fish', 'camel', 'bear', 'cactus'], names = ['Fish', 'Camel', 'Polar bear', 'Cactus'];
        ui.buttons(keys.map((k, j) => ({ label: names[j], on: k === 'bear', onClick: () => { st.auto = false; pick = k; move(k, movers[k].tile); } })));
        ui.buttons(HAB.map((h, j) => ({ label: `To the ${NAME[h].toLowerCase()}`, onClick: () => { st.auto = false; move(pick, j); } })));
        ui.readout('Pick a living thing, then choose where to move it.');
      }
    },

    update(dt, t) {
      dt = Math.max(0, dt); // the first frame after loading can report a tiny negative step
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) { const [, fn] = st.plan.shift(); if (st.auto) fn(); }
      // Turntable: slow spin on the overview, otherwise turn to the chosen tile.
      if (st.spin) { st.rot += st.spin * dt; st.rotTo = st.rot; } else follow(st, 'rot', st.rotTo, dt, 3);
      table.rotation.y = st.rot;
      // Features: cycle through them by themselves until the learner taps one.
      if (st.auto && st.feats.length) { const j = Math.floor(Math.max(0, st.time) / 3.4) % st.feats.length; if (j !== st.feat) focus(j, false); }
      st.focusT += dt;
      const pulse = 1 + 0.14 * Math.sin(st.focusT * 6);
      for (const o of pulsing) o.scale.copy(o.userData.s0).multiplyScalar(pulse);
      const key = st.feats[st.feat]?.[0];
      gillMat.emissive.setRGB(key === 'Gills' ? 0.5 + 0.3 * Math.sin(t * 6) : 0, 0, 0);
      flow.forEach(m => { m.visible = key === 'Gills'; });
      spineMat.size = key === 'Spines' ? 0.05 + 0.02 * Math.sin(t * 6) : 0.035;
      spineMat.color.setHex(key === 'Spines' ? 0xffe066 : 0xfffbe6);
      const xray = key === 'Water inside';
      cWater.visible = xray; cactusMat.opacity = xray ? 0.35 : 1; cactusMat.depthWrite = !xray;
      const cut = key === 'Fat layer';
      fat.visible = inner.visible = cut; furMat.opacity = cut ? 0.3 : 1; furMat.depthWrite = !cut;

      // Fish swims back and forth along the front of the pond, showing its side.
      const fm = movers.fish;
      const tailAmp = key === 'Fins and tail' ? 0.7 : 0.35;
      if (fm.tile === fm.home && fm.hop >= 1) {
        const s = t * 0.45, c = Math.cos(s);
        local(0, pcx + 0.42 * Math.sin(s), 0.1 + 0.02 * Math.sin(t * 2), pcz + 0.4, fish.position);
        const u = clamp((c + 0.25) / 0.5, 0, 1);
        fish.rotation.y = TH(0) + (1 - u * u * (3 - 2 * u)) * Math.PI; // faces the way it swims, turning at each end
        fishBody.rotation.set(0, 0, 0);
      }
      tail.rotation.y = Math.sin(t * 7) * tailAmp;
      for (let j = 0; j < flow.length; j++) {
        // Water goes in at the mouth, then out past the gills on each side.
        const p = (t * 0.9 + j / flow.length) % 1, side = j % 2 ? 1 : -1;
        if (p < 0.4) flow[j].position.set(0.32 - p * 0.4, 0, 0);
        else flow[j].position.set(0.06 - (p - 0.4) * 0.35, 0, side * (0.075 + (p - 0.4) * 0.12));
      }
      // Frog: small hops while its webbed feet are shown.
      frog.position.y = WATER_Y + 0.015 + (key === 'Webbed feet' ? Math.max(0, Math.sin(st.focusT * 4)) * 0.08 : 0);
      // Snow falls on the polar tile.
      for (let j = 0; j < SNOW; j++) {
        let y = snowPos[j * 3 + 1] - dt * (0.35 + rand(j) * 0.2);
        if (y < 0) y += 2.4;
        snowPos[j * 3 + 1] = y;
        snowPos[j * 3] += Math.sin(t + j) * dt * 0.05;
      }
      snowGeo.attributes.position.needsUpdate = true;
      // Squirrel: climbs tree A while claws are shown, sits on the ground otherwise.
      const climbing = key === 'Sharp claws';
      st.climb = climbing ? st.focusT % 6 : 0;
      squirrelPose(st.climb);
      sqTail.rotation.z = Math.sin(t * (key === 'Bushy tail' ? 5 : 1.5)) * (key === 'Bushy tail' ? 0.3 : 0.08);

      // Movers hop from tile to tile; then show how they cope where they landed.
      for (const m of Object.values(movers)) {
        if (m.hop >= 1) continue;
        m.hop = Math.min(1, m.hop + dt / 1.3);
        const e = kit.ease(m.hop);
        m.obj.position.lerpVectors(m.from, m.to, e);
        m.obj.position.y += Math.sin(Math.PI * m.hop) * 1.1;
        m.obj.rotation.y = lerp(m.yaw0, m.yaw1, e);
        m.body.position.set(0, 0, 0); m.body.rotation.set(0, 0, 0);
        if (m.hop >= 1 && m === st.sel) landed(m);
      }
      const m = st.sel;
      sweat.forEach(d => { d.visible = false; });
      if (m && st.cond && m.hop >= 1) {
        st.condT += dt;
        const b = m.body;
        b.position.set(0, 0, 0); b.rotation.set(0, 0, 0);
        if (st.cond === 'flop') { b.rotation.x = Math.PI / 2 + Math.sin(t * 9) * 0.5; b.position.y = Math.abs(Math.sin(t * 4.5)) * 0.08; }
        if (st.cond === 'shiver') b.position.z = Math.sin(t * 45) * 0.02;
        if (st.cond === 'sad') { b.rotation.z = -0.06 + Math.sin(t * 1.5) * 0.03; b.position.y = -0.02; }
        if (st.cond === 'home') b.position.y = st.condT < 1.6 ? Math.abs(Math.sin(st.condT * 6)) * 0.06 : 0;
        if (st.cond === 'sweat') {
          b.rotation.z = Math.sin(t * 2) * 0.04;
          sweat.forEach((d, j) => {
            const p = (t * 0.8 + j / 3) % 1;
            d.visible = true;
            d.position.copy(m.obj.position);
            d.position.y += m.h - 0.15 - p * 0.5;
            d.position.x += Math.cos(m.obj.rotation.y) * (0.35 + j * 0.05);
            d.position.z -= Math.sin(m.obj.rotation.y) * (0.35 + j * 0.05) - (j - 1) * 0.08;
          });
        }
        if (m.key === 'cactus') {
          const target = st.cond === 'home' ? cactusBase : tint[st.cond];
          cactusMat.color.lerp(target, Math.min(1, dt * 1.5));
          if (st.cond === 'rot' || st.cond === 'pale') b.rotation.z = -clamp(st.condT * 0.2, 0, 0.35);
        }
        if (m.key === 'fish' && st.cond === 'home') { b.position.y = 0; }
      }
      if (m) { statusAt.position.copy(m.obj.position); statusAt.position.y += m.h; }
      return true;
    },
  };

  // Squirrel path: ground → foot of tree A → up the trunk → back down. c in seconds (0..6).
  function squirrelPose(c) {
    const trunkX = -0.2, z = -0.3;
    const groundX = -0.7;
    if (c < 1) { const u = kit.ease(c); squirrel.position.set(lerp(groundX, trunkX - 0.06, u), 0, z); squirrel.rotation.set(0, 0, 0); }
    else if (c < 2.8) { const u = kit.ease((c - 1) / 1.8); squirrel.position.set(trunkX, 0.08 + u * 0.55, z); squirrel.rotation.set(0, 0, Math.PI / 2); }
    else if (c < 3.6) { squirrel.position.set(trunkX, 0.63, z); squirrel.rotation.set(0, 0, Math.PI / 2); }
    else if (c < 5.2) { const u = kit.ease((c - 3.6) / 1.6); squirrel.position.set(trunkX, 0.63 - u * 0.55, z); squirrel.rotation.set(0, 0, Math.PI / 2); }
    else { const u = kit.ease((c - 5.2) / 0.8); squirrel.position.set(lerp(trunkX - 0.06, groundX, u), 0, z); squirrel.rotation.set(0, Math.PI * u, 0); }
    if (c === 0) { squirrel.position.set(groundX, 0, z); squirrel.rotation.set(0, 0, 0); }
    // Little hops while running on the ground.
    if (c > 0 && (c < 1 || c > 5.2)) squirrel.position.y = Math.abs(Math.sin(c * 14)) * 0.03;
  }
}

// A saguaro-style cactus on y = 0: thick stem with two arms. Height about 0.95 * s.
function makeCactus(THREE, kit, material, s) {
  const group = new THREE.Group();
  const add = (geo, x, y, z, rz = 0) => { const m = kit.mesh(geo, material, [x * s, y * s, z * s], group); m.rotation.z = rz; m.scale.setScalar(s); return m; };
  add(new THREE.CylinderGeometry(0.14, 0.15, 0.85, 12), 0, 0.425, 0);
  add(new THREE.SphereGeometry(0.14, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.85, 0);
  add(new THREE.CylinderGeometry(0.075, 0.075, 0.18, 8), 0.2, 0.38, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.075, 0.075, 0.3, 8), 0.28, 0.52, 0);
  add(new THREE.SphereGeometry(0.075, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0.28, 0.67, 0);
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8), -0.19, 0.5, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 8), -0.26, 0.6, 0);
  add(new THREE.SphereGeometry(0.07, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), -0.26, 0.71, 0);
  return { group };
}
