// Classifying living things: ten living things are sorted by a chosen feature, then into the five kingdoms
// (Monera, Protista, Fungi, Plants, Animals). Two dichotomous keys walk a mystery organism down yes/no
// questions; a stepped "cake" of ranks follows the domestic cat from kingdom to species; and a row of
// organisms shows two-part scientific names.
import { bird, fish } from '../_shared/critters.js';
import { makeMushroom, makeFrog, tuftGeometry } from '../_shared/habitat-kit.js';
import { butterflyStages } from '../_shared/butterfly.js';
import { leafGeometry } from '../_shared/leaf.js';
import { rand } from '../_shared/cells.js';

const KX = 15, CX = -13, NX = 28;      // key area, rank cake, names row
const TABLE = ['bacterium', 'paramecium', 'mushroom', 'fern', 'flower', 'cat', 'fish', 'bird', 'frog', 'butterfly'];
const KINGDOM_OF = { bacterium: 0, paramecium: 1, mushroom: 2, fern: 3, flower: 3, cat: 4, fish: 4, bird: 4, frog: 4, butterfly: 4 };
const FEATURES = [
  ['Has legs?', k => ['cat', 'bird', 'frog', 'butterfly'].includes(k)],
  ['Makes its own food?', k => ['fern', 'flower'].includes(k)],
  ['Just one cell?', k => ['bacterium', 'paramecium'].includes(k)],
];
const KINGDOMS = [
  ['Monera', 0x9ad0ec, [-2.5, -1.25], 'bacteria. One cell with <b>no nucleus</b>: the genetic material lies loose in the cytoplasm. Most are only a few micrometres long.'],
  ['Protista', 0xc6b5ea, [0, -1.25], 'protists. Mostly <b>single cells with a nucleus</b>, living in water or damp places: amoeba, paramecium, many algae.'],
  ['Fungi', 0xf0c48a, [2.5, -1.25], 'cells with a nucleus and cell walls but <b>no chlorophyll</b>, so they cannot make food. They absorb food from dead or living things: mushrooms, moulds, yeast.'],
  ['Plants', 0xa8dc8a, [-1.5, 1.1], 'many cells with cell walls and <b>chlorophyll</b>. They <b>make their own food</b> by photosynthesis: mosses, ferns, flowering plants.'],
  ['Animals', 0xf4a6a6, [1.65, 1.1], 'many cells with <b>no cell walls</b>. They <b>eat</b> other living things, and most can move about.'],
];
const KEYS = [
  { q: [['Nucleus?', 'Do its cells have a nucleus?', false], ['One cell?', 'Is it made of just one cell?', true], ['Makes food?', 'Does it make its own food using light?', true], ['Eats food?', 'Does it eat other living things and move about?', true]],
    leaves: ['Monera', 'Protista', 'Plants', 'Animals', 'Fungi'],
    mystery: [['mushroom', [true, false, false, false]], ['bacterium', [false]], ['flower', [true, false, true]], ['cat', [true, false, false, true]], ['paramecium', [true, true]]], next: 'Next organism' },
  { q: [['Backbone?', 'Does it have a backbone?', false], ['Feathers?', 'Does it have feathers?', true], ['Fur?', 'Does it have fur?', true], ['Fins?', 'Does it have fins?', true]],
    leaves: ['Butterfly', 'Bird', 'Cat', 'Fish', 'Frog'],
    groups: ['an insect', 'a bird', 'a mammal', 'a fish', 'an amphibian'],
    mystery: [['frog', [true, false, false, false]], ['butterfly', [false]], ['bird', [true, true]], ['cat', [true, false, true]], ['fish', [true, false, false, true]]], next: 'Next animal' },
];
const RANKS = [
  ['Kingdom', 'Animalia', 'animals: many cells, no cell walls, they eat other living things.'],
  ['Phylum', 'Chordata', 'chordates: a nerve cord and a stiff rod along the back. Most, like these, have a <b>backbone</b>.'],
  ['Class', 'Mammalia', 'mammals: <b>hair or fur</b>, and mothers feed their young on <b>milk</b>.'],
  ['Order', 'Carnivora', 'carnivorans: mostly meat-eaters, with sharp teeth for cutting meat.'],
  ['Family', 'Felidae', 'the <b>cat family</b>: big cats and small cats.'],
  ['Genus', 'Felis', 'a group of small wild cats, and the pet cat.'],
  ['Species', 'Felis catus', 'the <b>domestic cat</b>. Cats breed with cats and have kittens that can also breed.'],
];
const TIER_R = [3.3, 2.85, 2.4, 1.95, 1.5, 1.05, 0.55];
const TIER_C = [0xf6c9c9, 0xf7dcb4, 0xf3efb0, 0xc9ecb9, 0xb9e3ef, 0xc9cdf3, 0xe3c6ef];
// [kind, tier, angle from the front, scale]
const CAKE = [['butterfly', 0, -0.42, 0.9], ['frog', 1, -0.38, 1], ['fish', 1, 0.02, 1], ['bird', 1, 0.42, 1], ['human', 2, -0.55, 1],
  ['dog', 3, 0.5, 1], ['lion', 4, -0.4, 1], ['tiger', 4, 0.38, 1], ['wildcat', 5, 0.62, 1], ['cat', 6, 0, 1]];
const NAMES = [
  ['cat', 'Cat', 'Felis catus', 'Genus <i>Felis</i>, species <i>catus</i>: the domestic cat.'],
  ['lion', 'Lion', 'Panthera leo', 'Genus <i>Panthera</i>, species <i>leo</i>. It shares its genus with the tiger: close relatives, different species.'],
  ['tiger', 'Tiger', 'Panthera tigris', 'Genus <i>Panthera</i>, species <i>tigris</i>. It shares its genus with the lion: close relatives, different species.'],
  ['human', 'Human', 'Homo sapiens', 'Genus <i>Homo</i>, species <i>sapiens</i>. We are the only living species in our genus.'],
  ['rice', 'Rice', 'Oryza sativa', 'Genus <i>Oryza</i>, species <i>sativa</i>: Asian rice, one of the world\'s most important food crops.'],
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xdcebd2, sky: 0xe3f0fb, radius: 40 });
  kit.lights(scene, { sun: [4, 10, 7] });
  const flat = (c, o) => kit.mat(c, { flatShading: true, ...o });
  const anims = [];

  // ---------- Organism builders (each stands on y = 0, about 0.5 tall, facing +z) ----------
  function make(kind) {
    const g = new THREE.Group();
    let anim = null;
    if (kind === 'bacterium') {
      const b = kit.mesh(new THREE.CapsuleGeometry(0.07, 0.24, 4, 12), kit.mat(0x6cc4a1, { roughness: 0.4 }), [0, 0.2, 0], g);
      b.rotation.z = Math.PI / 2 - 0.3;
      kit.mesh(new THREE.SphereGeometry(0.035, 8, 6), kit.mat(0x2f7d62), [0.02, 0.2, 0.05], g); // loose genetic material
      const pts = []; for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3(0.18 + i * 0.03, 0.27 + Math.sin(i * 1.2) * 0.03, 0));
      const fl = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.008, 4), kit.mat(0x4e9c7e));
      g.add(fl);
      anim = t => { fl.rotation.x = t * 6; g.children[0].position.y = 0.2 + Math.sin(t * 2) * 0.02; };
    } else if (kind === 'paramecium') {
      const m = new THREE.MeshStandardMaterial({ color: 0xb6dcc8, transparent: true, opacity: 0.78, roughness: 0.4 });
      const body = kit.mesh(new THREE.SphereGeometry(1, 20, 14), m, [0, 0.16, 0], g);
      body.scale.set(0.09, 0.07, 0.26);
      kit.mesh(new THREE.SphereGeometry(0.04, 10, 8), kit.mat(0x6b4aa8), [0, 0.17, 0.02], g);
      kit.mesh(new THREE.SphereGeometry(0.03, 8, 6), kit.mat(0x2f6a55), [0.05, 0.17, 0.08], g).scale.set(0.6, 0.6, 1.6);
      const cil = new THREE.CylinderGeometry(0.004, 0.004, 0.04, 3), cm = kit.mat(0x7fb79c);
      const up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3();
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        n.set(Math.cos(a) / 0.09, 0, Math.sin(a) / 0.26).normalize();
        const c = new THREE.Mesh(cil, cm);
        c.position.set(Math.cos(a) * 0.1, 0.16, Math.sin(a) * 0.27);
        c.quaternion.setFromUnitVectors(up, n);
        g.add(c);
      }
      anim = t => { g.children[0].position.y = 0.16 + Math.sin(t * 2.2) * 0.02; };
    } else if (kind === 'mushroom') {
      g.add(makeMushroom(THREE, kit, { s: 2.6 }));
    } else if (kind === 'fern') {
      const green = flat(0x3f8f3a), lf = flat(0x56a845, { side: THREE.DoubleSide }), lg = leafGeometry(THREE, 0.08, 0.035, 0.05);
      for (let f = 0; f < 5; f++) {
        const fr = new THREE.Group(); fr.rotation.y = f * 1.25; fr.rotation.z = -0.5 - (f % 2) * 0.2; g.add(fr);
        kit.mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.5, 4).translate(0, 0.25, 0), green, [0, 0, 0], fr);
        for (let i = 1; i < 8; i++) for (const s of [-1, 1]) {
          const l = kit.mesh(lg, lf, [0, i * 0.06, 0], fr); l.rotation.set(0, s > 0 ? 0 : Math.PI, 0.25); l.scale.setScalar(1.25 - i * 0.1);
        }
      }
    } else if (kind === 'flower') {
      kit.mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.45, 6), flat(0x4f9a3a), [0, 0.225, 0], g);
      const lf = flat(0x5bab42, { side: THREE.DoubleSide }), lg = leafGeometry(THREE, 0.16, 0.08, 0.1);
      for (const [y, r] of [[0.14, 0.4], [0.24, 3.4]]) { const p = new THREE.Group(); p.position.y = y; p.rotation.y = r; g.add(p); kit.mesh(lg, lf, [0, 0, 0], p).rotation.z = 0.4; }
      const head = new THREE.Group(); head.position.y = 0.47; head.rotation.x = 0.5; g.add(head);
      kit.mesh(new THREE.SphereGeometry(0.04, 10, 8), flat(0x8a5a1e), [0, 0, 0], head).scale.z = 0.5;
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const p = kit.mesh(new THREE.SphereGeometry(0.04, 8, 6), flat(0xf6c21c), [Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0], head); p.scale.set(1.4, 0.6, 0.25); p.rotation.z = a; }
    } else if (kind === 'fish') {
      const f = fish(THREE, kit, { scales: 0xf59a23 }); f.g.position.y = 0.2; f.g.scale.setScalar(1.3); g.add(f.g);
      anim = t => { f.tail.rotation.y = Math.sin(t * 6) * 0.4; };
    } else if (kind === 'bird') {
      const b = bird(THREE, kit); b.g.scale.setScalar(1.25); g.add(b.g);
      anim = t => { b.head.rotation.x = Math.max(0, Math.sin(t * 1.3)) * 0.3; };
    } else if (kind === 'frog') {
      const f = makeFrog(THREE, kit); f.rotation.y = -Math.PI / 2; f.scale.setScalar(2.1); g.add(f);
    } else if (kind === 'butterfly') {
      const b = butterflyStages(THREE, kit)[3].make(); b.g.scale.setScalar(0.9); g.add(b.g);
      anim = t => b.animate(t, 1);
    } else if (kind === 'human') {
      const skin = kit.mat(0xd9a27c), shirt = kit.mat(0x3d7dd8), pants = kit.mat(0x34495e);
      kit.mesh(new THREE.CapsuleGeometry(0.07, 0.15, 3, 10), shirt, [0, 0.42, 0], g).scale.z = 0.7;
      kit.mesh(new THREE.SphereGeometry(0.065, 14, 10), skin, [0, 0.62, 0], g);
      kit.mesh(new THREE.SphereGeometry(0.067, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0x2b1d14), [0, 0.635, -0.005], g);
      for (const s of [-1, 1]) {
        kit.mesh(new THREE.CapsuleGeometry(0.025, 0.2, 3, 6), skin, [s * 0.1, 0.4, 0], g).rotation.z = s * 0.12;
        kit.mesh(new THREE.CapsuleGeometry(0.032, 0.22, 3, 6), pants, [s * 0.04, 0.15, 0], g);
      }
    } else if (kind === 'rice') {
      const tg = tuftGeometry(THREE, { blades: 10, h: 0.5, w: 0.018 });
      kit.mesh(tg, flat(0x7cba4a), [0, 0, 0], g);
      const grain = flat(0xe0bf5a), gg = new THREE.SphereGeometry(0.014, 6, 4);
      for (let p = 0; p < 3; p++) {
        const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push(new THREE.Vector3(Math.cos(p * 2.1) * u * 0.18, 0.35 + u * 0.22 - u * u * 0.25, Math.sin(p * 2.1) * u * 0.18)); }
        const curve = new THREE.CatmullRomCurve3(pts);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.004, 3), flat(0x9bbf5a)));
        for (let i = 3; i <= 10; i++) { const q = curve.getPoint(i / 10); const s = kit.mesh(gg, grain, [q.x, q.y - 0.01, q.z], g); s.scale.set(1, 1.7, 1); s.castShadow = false; }
      }
    } else {
      const q = quad(kind); g.add(q.g); anim = q.anim;
    }
    if (anim) anims.push({ g, anim, phase: anims.length * 0.7 });
    return g;
  }

  // Four-legged animals of the order Carnivora, from the same parts: body, head, ears, legs, tail.
  function quad(kind) {
    const D = {
      cat: { c: 0xe39a4c, s: 1, stripes: '#b8662a', belly: 0xf6e3c8 },
      wildcat: { c: 0x9a8f7c, s: 1.08, stripes: '#4e4537', belly: 0xd8cfbd, bushy: true },
      dog: { c: 0x9b6a3c, s: 1.2, belly: 0xe8d2b0, dog: true },
      lion: { c: 0xd4a85e, s: 1.45, mane: 0x8a5420, belly: 0xe9cf9a, tuft: true },
      tiger: { c: 0xee8a2c, s: 1.45, stripes: '#1d1712', belly: 0xf7efe2 },
    }[kind];
    const s = D.s, g = new THREE.Group();
    const coat = D.stripes ? kit.mat(0xffffff, { map: stripeTex(D.c, D.stripes), roughness: 0.8 }) : kit.mat(D.c, { roughness: 0.8 });
    const plain = kit.mat(D.c, { roughness: 0.8 }), belly = kit.mat(D.belly), dark = kit.mat(0x1d1d24);
    const body = kit.mesh(new THREE.SphereGeometry(0.12, 16, 12), coat, [0, 0.22 * s, 0], g);
    body.scale.set(0.95 * s, 0.82 * s, 1.85 * s);
    const head = new THREE.Group(); head.position.set(0, 0.33 * s, 0.24 * s); g.add(head);
    if (D.mane) kit.mesh(new THREE.SphereGeometry(0.12 * s, 14, 10), kit.mat(D.mane, { roughness: 1 }), [0, -0.01 * s, -0.03 * s], head);
    kit.mesh(new THREE.SphereGeometry(0.085 * s, 14, 10), plain, [0, 0, 0.02 * s], head);
    const snout = kit.mesh(new THREE.SphereGeometry(0.042 * s, 10, 8), belly, [0, -0.025 * s, (D.dog ? 0.1 : 0.08) * s], head);
    snout.scale.set(1.1, 0.8, D.dog ? 1.5 : 1);
    kit.mesh(new THREE.SphereGeometry(0.014 * s, 6, 4), dark, [0, -0.01 * s, (D.dog ? 0.165 : 0.12) * s], head);
    for (const e of [-1, 1]) {
      kit.mesh(new THREE.SphereGeometry(0.012 * s, 6, 4), dark, [e * 0.035 * s, 0.022 * s, 0.085 * s], head);
      if (D.dog) { const ear = kit.mesh(new THREE.SphereGeometry(0.035 * s, 8, 6), kit.mat(0x6e4524), [e * 0.075 * s, 0.0, 0.0], head); ear.scale.set(0.5, 1.4, 0.9); }
      else { const ear = kit.mesh(new THREE.ConeGeometry(0.03 * s, 0.06 * s, 4), plain, [e * 0.05 * s, 0.075 * s, 0], head); ear.rotation.z = -e * 0.25; }
    }
    for (const x of [-1, 1]) for (const z of [-1, 1]) kit.mesh(new THREE.CylinderGeometry(0.025 * s, 0.022 * s, 0.17 * s, 6), plain, [x * 0.06 * s, 0.085 * s, z * 0.13 * s], g);
    const tail = new THREE.Group(); tail.position.set(0, 0.26 * s, -0.21 * s); g.add(tail);
    const tl = kit.mesh(new THREE.CylinderGeometry(D.bushy ? 0.028 * s : 0.014 * s, D.bushy ? 0.03 * s : 0.018 * s, 0.22 * s, 6), D.stripes ? coat : plain, [0, 0.1 * s, 0], tail);
    tail.rotation.x = -0.7;
    if (D.tuft) kit.mesh(new THREE.SphereGeometry(0.03 * s, 8, 6), kit.mat(D.mane), [0, 0.21 * s, 0], tail);
    if (D.bushy) kit.mesh(new THREE.SphereGeometry(0.03 * s, 8, 6), dark, [0, 0.21 * s, 0], tail);
    tl.castShadow = false;
    return { g, anim: t => { tail.rotation.z = Math.sin(t * 2) * 0.35; head.rotation.y = Math.sin(t * 0.7) * 0.25; } };
  }

  function stripeTex(base, stripe) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#' + base.toString(16).padStart(6, '0'); x.fillRect(0, 0, 128, 64);
    x.fillStyle = stripe;
    for (let i = 0; i < 14; i++) { const cx = i * 9.1 + rand(i) * 3; x.beginPath(); x.moveTo(cx, 6); x.quadraticCurveTo(cx + 4, 32, cx, 58); x.lineTo(cx + 3, 58); x.quadraticCurveTo(cx + 7, 32, cx + 3, 6); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // Text on a small panel (canvas texture), for the keys.
  function panel(text, bg, fg, w = 1.3, h = 0.48) {
    const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w);
    const x = c.getContext('2d');
    x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, c.width - 8, c.height - 8, 22); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 4; x.stroke();
    x.fillStyle = fg; let fs = Math.round(c.height * 0.5);
    x.font = `bold ${fs}px system-ui, sans-serif`;
    const tw = x.measureText(text).width, room = c.width - 36;
    if (tw > room) { fs = Math.floor(fs * room / tw); x.font = `bold ${fs}px system-ui, sans-serif`; } x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, c.width / 2, c.height / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  }

  // ---------- Area 1: sorting table ----------
  const matMesh = (w, d, color, x, z) => { const m = kit.mesh(new THREE.BoxGeometry(w, 0.05, d), kit.mat(color, { roughness: 0.8 }), [x, 0.025, z], scene); m.castShadow = false; return m; };
  const yesMat = matMesh(2.6, 2.3, 0xbfe6b0, -1.8, 0.1), noMat = matMesh(2.6, 2.3, 0xf3c3b8, 1.8, 0.1);
  const yesTag = label('Yes', new THREE.Vector3(-1.8, 0.1, -1.1), { cls: 'big' }), noTag = label('No', new THREE.Vector3(1.8, 0.1, -1.1), { cls: 'big' });
  const kMats = KINGDOMS.map(([, c, [x, z]], i) => matMesh(i === 4 ? 2.6 : 2.0, i === 4 ? 1.75 : 1.35, c, x, z));
  const kTags = KINGDOMS.map(([n, , [x, z]], i) => label(n, new THREE.Vector3(x, 0.1, z - (i === 4 ? 0.85 : 0.65)), { cls: 'big' }));
  const orgs = TABLE.map((k, i) => {
    const g = make(k); scene.add(g);
    const o = { kind: k, g, want: new THREE.Vector3(), i };
    return o;
  });
  const grid = (list, cx, cz, cols, dx, dz) => list.forEach((o, j) => {
    const r = Math.floor(j / cols), c = j % cols, inRow = Math.min(cols, list.length - r * cols);
    o.want.set(cx + (c - (inRow - 1) / 2) * dx, 0.05, cz + (r - (Math.ceil(list.length / cols) - 1) / 2) * dz);
  });
  function mixUp() { orgs.forEach((o, j) => o.want.set(-2.4 + (j % 5) * 1.2 + (rand(j) - 0.5) * 0.3, 0.05, (j < 5 ? -0.5 : 0.6) + (rand(j + 9) - 0.5) * 0.3)); }
  function sortBy(f) {
    const [name, test] = FEATURES[f];
    const yes = orgs.filter(o => test(o.kind)), no = orgs.filter(o => !test(o.kind));
    grid(yes, -1.8, 0.15, 3, 0.75, 0.75); grid(no, 1.8, 0.15, 3, 0.75, 0.75);
    ui.readout(`<b>${name}</b> Yes: <b>${yes.length}</b> · No: <b>${no.length}</b>. A different question gives different groups.`);
  }
  function toKingdoms() {
    KINGDOMS.forEach(([, , [x, z]], i) => grid(orgs.filter(o => KINGDOM_OF[o.kind] === i), x, z + 0.05, i === 4 ? 3 : 2, 0.72, 0.62));
  }

  // ---------- Area 2: dichotomous keys ----------
  const keyArea = new THREE.Group(); keyArea.position.set(KX, 4.6, 0); scene.add(keyArea);
  const QPOS = k => [1.15 * k, -0.95 * k], LPOS = k => (k < 4 ? [1.15 * k - 1.15, -0.95 * (k + 1)] : [1.15 * 4, -0.95 * 4]);
  const keys = KEYS.map((def, ki) => {
    const g = new THREE.Group(); keyArea.add(g);
    const qs = def.q.map(([t], k) => { const p = panel(t, '#ffffff', '#1d2433'); p.position.set(...QPOS(k), 0); g.add(p); return p; });
    const lv = def.leaves.map((t, k) => { const p = panel(t, ki ? '#ffe2a8' : ['#cfe8f7', '#e3dbf6', '#d6efc9', '#fbd5d5', '#f6e1c2'][k], '#1d2433', 1.3, 0.44); p.position.set(...LPOS(k), 0); g.add(p); return p; });
    const yesM = kit.mat(0x4caf50), noM = kit.mat(0xe76f51);
    const links = [];
    const link = (a, b, yes, small) => {
      const ax = a[0], ay = a[1] - 0.2, bx = b[0], by = b[1] + 0.2, len = Math.hypot(bx - ax, by - ay);
      const m = kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), yes ? yesM : noM, [(ax + bx) / 2, (ay + by) / 2, -0.02], g);
      m.rotation.z = -Math.atan2(bx - ax, by - ay);
      m.castShadow = false;
      const tag = panel(yes ? 'yes' : 'no', yes ? '#4caf50' : '#e76f51', '#ffffff', 0.46, 0.22);
      tag.position.set((ax + bx) / 2 + (bx < ax ? -0.24 : 0.24), (ay + by) / 2 + 0.06, 0.01); g.add(tag);
      links.push(m);
      return m;
    };
    def.q.forEach(([, , off], k) => {
      link(QPOS(k), LPOS(k), off);
      if (k < 3) link(QPOS(k), QPOS(k + 1), !off); else link(QPOS(k), LPOS(4), !off);
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.62), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    halo.position.z = -0.01; g.add(halo);
    const minis = def.mystery.map(([kind]) => { const m = make(kind); m.scale.setScalar(0.85); m.visible = false; g.add(m); return m; });
    return { def, g, qs, lv, halo, minis };
  });
  const startTag = label('Mystery organism', new THREE.Object3D());
  keyArea.add(startTag.at);

  // ---------- Area 3: rank "cake" ----------
  const cake = new THREE.Group(); cake.position.set(CX, 0, 0); scene.add(cake);
  const tierMats = TIER_R.map((r, i) => {
    const m = kit.mat(TIER_C[i], { transparent: true, opacity: 1, roughness: 0.8 });
    const d = kit.mesh(new THREE.CylinderGeometry(r, r, 0.1, 48), m, [0, 0.05 + 0.1 * i, 0], cake);
    d.castShadow = false;
    return m;
  });
  const cakeOrgs = CAKE.map(([kind, tier, a, sc]) => {
    const r = tier === 6 ? 0 : (TIER_R[tier] + TIER_R[tier + 1]) / 2, g = make(kind);
    g.position.set(Math.sin(a) * r, 0.1 * (tier + 1), Math.cos(a) * r);
    g.scale.setScalar(sc); cake.add(g);
    const tag = label(kind === 'wildcat' ? 'Wildcat' : kind[0].toUpperCase() + kind.slice(1), new THREE.Vector3(CX + g.position.x, g.position.y + 0.75, g.position.z));
    return { g, tier, sc, s: sc, tag };
  });
  const rankTag = label('', new THREE.Vector3(), { cls: 'warm' });

  // ---------- Area 4: scientific names ----------
  const nameOrgs = NAMES.map(([kind, , sci], i) => {
    const x = NX + (i - 2) * 1.05;
    kit.mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.12, 28), kit.mat(0xf4f1e8), [x, 0.06, 0], scene);
    const g = make(kind); g.position.set(x, 0.12, 0); scene.add(g);
    const tag = label(sci, new THREE.Vector3(x, { human: 0.95, rice: 0.85, lion: 1.22 }[kind] || 0.8, 0), { cls: 'big' });
    tag.el.style.fontStyle = 'italic';
    return { g, tag, x };
  });

  // ---------- State ----------
  const st = { step: 0, quiz: false, time: 0, auto: false, feat: -1, king: -1, key: 0, myst: 0, node: 0, leaf: -1, answers: [], wait: 0, rank: 0, name: 0, row: null, slider: null };

  function hideAll() {
    for (const t of [yesTag, noTag, ...kTags, startTag, rankTag, ...cakeOrgs.map(o => o.tag), ...nameOrgs.map(o => o.tag)]) t.show(false);
    yesMat.visible = noMat.visible = false; kMats.forEach(m => { m.visible = false; m.material.emissive.setRGB(0, 0, 0); });
    keys.forEach(k => { k.g.visible = false; });
  }
  function pickKingdom(i) {
    st.king = i;
    kMats.forEach((m, j) => m.position.y = j === i ? 0.05 : 0.025);
    const [n, , , txt] = KINGDOMS[i];
    ui.readout(`<b>${n}</b>: ${txt}`);
  }
  // Keys: put the mystery organism at the current question or at the leaf it reached.
  function keyStart(m) {
    const K = keys[st.key];
    st.myst = m; st.node = 0; st.leaf = -1; st.answers = []; st.wait = 0;
    K.minis.forEach((g, j) => { g.visible = j === m; });
    keyShow();
  }
  function keyShow() {
    const K = keys[st.key], [kind, truth] = K.def.mystery[st.myst];
    const at = st.leaf >= 0 ? LPOS(st.leaf) : QPOS(st.node);
    K.halo.position.set(at[0], at[1], -0.01);
    K.halo.scale.set(st.leaf >= 0 ? 0.96 : 1, st.leaf >= 0 ? 0.92 : 1, 1);
    K.mini = K.minis[st.myst];
    K.target = [at[0] + (st.leaf >= 0 ? 0 : -0.92), at[1] - (st.leaf >= 0 ? 0.62 : 0.26), 0.15];
    const path = st.answers.map(a => (a ? 'Yes' : 'No')).join(' → ');
    if (st.leaf < 0) {
      ui.readout(`Question ${st.node + 1}: <b>${K.def.q[st.node][1]}</b>${path ? `<br>Answers so far: ${path}` : ''}`);
    } else {
      const right = K.def.mystery[st.myst][1].every((a, j) => a === st.answers[j]) && st.answers.length === truth.length;
      const name = K.def.leaves[st.leaf];
      const extra = K.def.groups && right ? ` It is ${K.def.groups[st.leaf]}.` : '';
      ui.readout(right ? `The key says: <b>${name}</b>. Correct!${extra}<br>Answers: ${path}` : `The key says: <b>${name}</b>, but that is not right. Check each answer and try again.<br>Answers: ${path}`);
    }
    startTag.show(st.leaf < 0 && st.node === 0 && !st.quiz);
    startTag.at.position.set(-0.92, -0.1, 0.15);
    void kind;
  }
  function keyAnswer(a) {
    if (st.leaf >= 0) return;
    const K = keys[st.key], off = K.def.q[st.node][2];
    st.answers.push(a);
    if (a === off) st.leaf = st.node; else if (st.node === 3) st.leaf = 4; else st.node++;
    keyShow();
  }
  function setRank(k) {
    st.rank = k;
    const [rank, name, txt] = RANKS[k];
    const left = cakeOrgs.filter(o => o.tier >= k);
    const names = left.map(o => o.tag.el.textContent.toLowerCase()).join(', ');
    ui.readout(`<b>${rank}: <i>${name}</i></b>: ${txt}<br>In this group: ${names} (<b>${left.length}</b>)`);
    rankTag.text = `${rank}: ${name}`;
    rankTag.el.style.fontStyle = 'italic';
    const r = TIER_R[k];
    rankTag.at.set(CX - Math.sin(1.0) * r, 0.1 * (k + 1), Math.cos(1.0) * r);
    rankTag.show(true);
    cakeOrgs.forEach(o => o.tag.show(k >= 3 && o.tier >= k));
    view({ radius: Math.max(0.9, r * 0.8 + 0.25), yaw: 0.05, pitch: 0.62, target: [CX, 0.25 + 0.1 * k, r * 0.22] });
  }
  function pickName(i) {
    st.name = i;
    nameOrgs.forEach((o, j) => o.tag.show(j === i || (i === 1 && j === 2) || (i === 2 && j === 1)));
    ui.readout(`<i><b>${NAMES[i][2]}</b></i>: ${NAMES[i][3]}`);
  }

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, row: null, slider: null, feat: -1, king: -1 });
      hideAll();
      if (i === 0) {
        go({ radius: 1.9, width: 3.3, yaw: 0, pitch: 0.62, target: [0, 0.25, 0.25] });
        yesMat.visible = noMat.visible = true; yesTag.show(true); noTag.show(true);
        mixUp(); orgs.forEach(o => o.g.position.copy(o.want));
        st.row = ui.buttons(FEATURES.map(([n], j) => ({ label: n, onClick: () => { st.auto = false; st.feat = j; sortBy(j); } })));
        ui.readout('Ten living things, all mixed up. Pick a question to sort them.');
      }
      if (i === 1 || isQuiz) {
        go({ radius: 2.1, width: 3.55, yaw: 0, pitch: 0.68, target: [0, 0.2, 0.05] });
        kMats.forEach(m => { m.visible = true; m.position.y = 0.025; }); kTags.forEach(t => t.show(true));
        toKingdoms();
        if (isQuiz) orgs.forEach(o => o.g.position.copy(o.want));
        else st.row = ui.buttons(KINGDOMS.map(([n], j) => ({ label: n, onClick: () => { st.auto = false; pickKingdom(j); } })));
        if (!isQuiz) ui.readout('Watch each living thing move to its kingdom, then tap a kingdom.');
      }
      if (i === 2 || i === 3) {
        st.key = i - 2;
        go({ radius: 2.35, width: 3.65, yaw: 0, pitch: 0.06, target: [KX + 1.6, 4.6 - 2.0, 0] });
        keys[st.key].g.visible = true;
        ui.buttons([{ label: 'Yes', onClick: () => { st.auto = false; keyAnswer(true); } }, { label: 'No', onClick: () => { st.auto = false; keyAnswer(false); } },
          { label: KEYS[st.key].next, onClick: () => { st.auto = false; keyStart((st.myst + 1) % KEYS[st.key].mystery.length); } }]);
        keyStart(0);
        const K = keys[st.key]; K.mini.position.set(...K.target);
      }
      if (i === 4) {
        st.slider = ui.slider({ label: 'Rank', min: 0, max: 6, step: 1, value: 0, format: v => RANKS[v][0], onInput: v => { st.auto = false; setRank(v); } });
        setRank(0);
        if (instant) view({}, true);
      }
      if (i === 5) {
        go({ radius: 1.3, width: 2.85, yaw: 0, pitch: 0.2, target: [NX, 0.45, 0] });
        st.row = ui.buttons(NAMES.map(([, n], j) => ({ label: n, on: j === 0, onClick: () => { st.auto = false; pickName(j); } })));
        pickName(0);
      }
    },

    update(dt, t) {
      st.time += dt;
      const s = st.step, T = st.time;
      if (st.auto && !st.quiz) {
        if (s === 0 && T > 0.8) { const f = Math.floor((T - 0.8) / 3) % 3; if (f !== st.feat) { st.feat = f; sortBy(f); st.row?.select(f); } }
        if (s === 1 && T > 2.2) { const k = Math.floor((T - 2.2) / 2.5) % 5; if (k !== st.king) { pickKingdom(k); st.row?.select(k); } }
        if (s === 2 || s === 3) {
          const K = keys[st.key], truth = K.def.mystery[st.myst][1];
          st.wait += dt;
          if (st.leaf < 0 && st.wait > 1.3) { st.wait = 0; keyAnswer(truth[st.answers.length]); }
          else if (st.leaf >= 0 && st.wait > 2.6) keyStart((st.myst + 1) % K.def.mystery.length);
        }
        if (s === 4) { const k = Math.min(6, Math.floor(T / 2.6) % 8); if (k !== st.rank) { setRank(k); st.slider?.set(k); } }
        if (s === 5) { const j = Math.floor(T / 2.6) % 5; if (j !== st.name) { pickName(j); st.row?.select(j); } }
      }
      // Table organisms walk to their places.
      if (s <= 1 || st.quiz) for (const o of orgs) o.g.position.lerp(o.want, Math.min(1, dt * 3));
      // Key: the mystery organism hops to its spot; the halo pulses.
      if (s === 2 || s === 3) {
        const K = keys[st.key], m = K.mini;
        if (m && K.target) {
          const dx = K.target[0] - m.position.x, dy = K.target[1] - m.position.y;
          m.position.x += dx * Math.min(1, dt * 5); m.position.z = K.target[2];
          m.position.y += dy * Math.min(1, dt * 5);
          m.position.y += Math.min(0.25, Math.hypot(dx, dy)) * Math.sin(Math.min(1, Math.hypot(dx, dy)) * Math.PI) * dt * 4;
          m.rotation.y = Math.sin(t * 0.8) * 0.4;
        }
        K.halo.material.color.setHSL(0.13, 1, 0.55 + 0.1 * Math.sin(t * 5));
      }
      // Cake: tiers outside the chosen rank fade and their animals shrink away.
      if (s === 4) {
        tierMats.forEach((m, j) => kit.follow(m, 'opacity', j >= st.rank ? 1 : 0.3, dt, 4));
        for (const o of cakeOrgs) { kit.follow(o, 's', o.tier >= st.rank ? o.sc : 0.001, dt, 5); o.g.scale.setScalar(o.s); }
      }
      // Names: the chosen organism lifts and turns.
      if (s === 5) nameOrgs.forEach((o, j) => { kit.follow(o.g.position, 'y', j === st.name ? 0.3 : 0.12, dt, 4); o.g.rotation.y = j === st.name ? Math.sin(t) * 0.7 : o.g.rotation.y * 0.9; });
      // Kingdom mat glow.
      kMats.forEach((m, j) => { if (j === st.king && s === 1) m.material.emissive.copy(m.material.color).multiplyScalar(0.25 + 0.2 * Math.sin(t * 5)); else m.material.emissive.setRGB(0, 0, 0); });
      for (const a of anims) a.anim(t + a.phase);
      return true;
    },
  };
}
