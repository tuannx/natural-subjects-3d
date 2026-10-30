// Traits: a cat family (mother, father and four kittens) shows traits passed on from parents and how
// brothers and sisters differ. Red and yellow flowering plants pass on their flower colour. Two young
// plants from the same parent grow in sun and in shade, with a height chart. Last, a trained dog jumps
// through a hoop but its puppy cannot: a learned trick is not inherited.
import { rand, leafGeometry } from '../_shared/leaf.js';
import { smooth } from '../_shared/habitat-kit.js';

const GREY = 0x8e929e, BLACK = 0x2c2c33, WHITE = 0xf4f1ea;
const MOM = { fur: GREY, white: true, fluffy: false };
const DAD = { fur: BLACK, white: false, fluffy: true };
const LITTER = [
  { fur: BLACK, white: true, fluffy: false },
  { fur: GREY, white: false, fluffy: true },
  { fur: GREY, white: true, fluffy: false },
  { fur: BLACK, white: false, fluffy: true },
];
const KX = [-1.35, -0.45, 0.45, 1.35], KZ = 0.5, KIT = 0.55;
const TRAITS = [
  { label: 'Grey fur', has: c => c.fur === GREY },
  { label: 'Black fur', has: c => c.fur === BLACK },
  { label: 'White paws', has: c => c.white },
  { label: 'Fluffy fur', has: c => c.fluffy },
  { label: 'Cat shape', has: () => true, note: 'pointed ears, whiskers and a long tail' },
];
const PLANTS = [-0.2, 4.4];        // centre of the flower families (x, z)
const SUNNY = [-4.7, 0, -0.9], SHADY = [-3.7, 0, -0.9];
const DOG = [3.4, 0, -1.0], HOOP = [4.55, 0.55, -1.0], PUP = [3.9, 0, -0.2];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xbfe0a5, sky: 0xe2f2ff });
  kit.lights(scene, { sun: [4, 10, 6] });
  const { clamp, lerp } = kit;
  const flat = (c, o) => kit.mat(c, { flatShading: true, ...o });
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const st = { step: 0, time: 0, quiz: false, auto: true, msg: '', trait: -1 };
  const say = html => { if (html !== st.msg) { st.msg = html; ui.readout(html); } };

  // ---------- cats ----------
  const whiteMat = kit.mat(WHITE, { roughness: 0.85 }), pink = flat(0xf29bb0), eyeMat = kit.mat(0xc6d34a, { roughness: 0.3 }), dark = flat(0x16161a);
  const ball = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
  const thinTail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, 0.05, -0.18), V(0, 0.24, -0.27), V(0, 0.4, -0.2)]), 12, 0.032, 6);
  const thickTail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, 0.05, -0.18), V(0, 0.24, -0.27), V(0, 0.4, -0.2)]), 12, 0.075, 8);
  const whiskerGeo = new THREE.BufferGeometry().setFromPoints([-1, 1].flatMap(s => [0, 1, 2].flatMap(k => [V(s * 0.04, 0, 0), V(s * 0.17, 0.03 - k * 0.03, -0.02)])));
  const whiskerMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  function makeCat(tr, x, z, s) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    const fur = kit.mat(tr.fur, { roughness: 0.85 }), paw = kit.mat(WHITE, { roughness: 0.85 });
    kit.mesh(ball(0.22), fur, [0, 0.33, -0.02], g).scale.set(0.85, 0.8, 1.55);
    const chest = kit.mesh(ball(0.12), whiteMat, [0, 0.32, 0.22], g); chest.scale.set(1, 1.1, 0.8);
    const legs = [];
    for (const [lx, lz] of [[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.22], [0.1, -0.22]]) {
      kit.mesh(new THREE.CylinderGeometry(0.042, 0.04, 0.24, 8), fur, [lx, 0.14, lz], g);
      legs.push(kit.mesh(ball(0.05, 10, 6), paw, [lx, 0.03, lz + 0.015], g));
    }
    const ruff = kit.mesh(new THREE.IcosahedronGeometry(0.2, 1), kit.mat(tr.fur, { flatShading: true, roughness: 0.9 }), [0, 0.47, 0.25], g);
    ruff.scale.set(1.05, 0.85, 0.8);
    const head = new THREE.Group(); head.position.set(0, 0.55, 0.32); g.add(head);
    if (s < 1) head.scale.setScalar(1.25);   // kittens have big heads for their size
    kit.mesh(ball(0.16, 16, 12), fur, [0, 0, 0], head).scale.set(1.08, 0.95, 1);
    const muzzle = kit.mesh(ball(0.07, 10, 8), whiteMat, [0, -0.05, 0.12], head); muzzle.scale.set(1.3, 0.8, 0.8);
    kit.mesh(ball(0.02, 8, 6), pink, [0, -0.02, 0.18], head);
    for (const sx of [-1, 1]) {
      kit.mesh(ball(0.034, 10, 8), eyeMat, [sx * 0.065, 0.035, 0.13], head);
      kit.mesh(ball(0.02, 8, 6), dark, [sx * 0.067, 0.035, 0.155], head).scale.set(0.45, 1.2, 0.6);
      const ear = kit.mesh(new THREE.ConeGeometry(0.065, 0.13, 4), fur, [sx * 0.09, 0.15, -0.01], head); ear.rotation.set(0, Math.PI / 4, -sx * 0.32);
      const inner = kit.mesh(new THREE.ConeGeometry(0.035, 0.08, 4), pink, [sx * 0.088, 0.14, 0.02], head); inner.rotation.set(0, Math.PI / 4, -sx * 0.32);
    }
    const wh = new THREE.LineSegments(whiskerGeo, whiskerMat); wh.position.set(0, -0.04, 0.17); head.add(wh);
    const tail = new THREE.Group(); tail.position.set(0, 0.36, -0.33); g.add(tail);
    const tThin = kit.mesh(thinTail, fur, [0, 0, 0], tail), tThick = kit.mesh(thickTail, fur, [0, 0, 0], tail);
    const ring = kit.mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 32), kit.mat(0xffc93c, { emissive: 0x6a4a00 }), [0, 0.02, 0], g);
    ring.rotation.x = Math.PI / 2; ring.castShadow = false; ring.visible = false;
    const cat = { g, head, tail, ring, tr, s, base: z,
      set(t) {
        cat.tr = t;
        fur.color.setHex(t.fur); ruff.material.color.setHex(t.fur);
        paw.color.setHex(t.white ? WHITE : t.fur);
        chest.visible = t.white; muzzle.material = t.white ? whiteMat : fur;
        tThin.visible = !t.fluffy; tThick.visible = ruff.visible = t.fluffy;
      } };
    cat.set(tr);
    return cat;
  }
  const mom = makeCat(MOM, -0.8, -0.55, 1), dad = makeCat(DAD, 0.8, -0.55, 1);
  const kittens = LITTER.map((t, j) => makeCat(t, KX[j], KZ, KIT));
  const cats = [mom, dad, ...kittens];
  const names = ['Mom', 'Dad', 'Kitten 1', 'Kitten 2', 'Kitten 3', 'Kitten 4'];
  const catTags = cats.map((c, j) => label(j < 2 ? names[j] : String(j - 1), new THREE.Vector3(c.g.position.x, j < 2 ? 0.95 : 0.6, c.g.position.z), { cls: j < 2 ? 'warm' : '' }));
  let litter = 0;
  function newLitter() {
    litter++;
    kittens.forEach((k, j) => {
      const r = n => rand(litter * 31 + j * 7 + n) < 0.5;
      k.set({ fur: r(1) ? GREY : BLACK, white: r(2), fluffy: r(3) });
    });
    showTrait(st.trait);
  }
  function showTrait(n) {
    st.trait = n;
    const T = TRAITS[n];
    cats.forEach(c => { c.ring.visible = !!T && T.has(c.tr); });
    if (!T) return;
    const who = cats.map((c, j) => (T.has(c.tr) ? names[j] : null)).filter(Boolean);
    const list = who.length > 2 ? `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]}` : who.join(' and ');
    say(T.note ? `<b>All</b> of them have the cat shape: ${T.note}.` : `${T.label}: <b>${list}</b>`);
  }
  function animateCats(t) {
    cats.forEach((c, j) => {
      c.tail.rotation.y = Math.sin(t * (j < 2 ? 1.6 : 3) + j) * 0.35;
      c.head.rotation.y = Math.sin(t * 0.7 + j * 1.3) * 0.25;
      if (j >= 2) {
        const hop = (t * 0.6 + rand(j) * 3) % 3;  // a little pounce now and then
        c.g.position.y = hop < 0.4 ? Math.sin((hop / 0.4) * Math.PI) * 0.08 : 0;
      }
    });
  }

  // ---------- plant builder: a stem with leaves along it and an optional flower ----------
  const leafGeo = leafGeometry(THREE, 0.2, 0.11, 0.1);
  function makePlant(x, z, { leafColor = 0x4f9a3a, stemColor = 0x4f9a3a, flower = null, maxLeaves = 8 } = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const lean = new THREE.Group(); g.add(lean);
    const leafMat = flat(leafColor, { side: THREE.DoubleSide }), stemMat = flat(stemColor);
    const stem = kit.mesh(new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0), stemMat, [0, 0, 0], lean);
    const leaves = [];
    for (let k = 0; k < maxLeaves; k++) {
      const p = new THREE.Group(); p.rotation.y = k * 2.4; lean.add(p);
      const m = kit.mesh(leafGeo, leafMat, [0, 0, 0], p); m.rotation.z = 0.35;
      leaves.push(p);
    }
    let head = null;
    if (flower != null) {
      head = new THREE.Group(); lean.add(head);
      const pm = flat(flower);
      for (let k = 0; k < 5; k++) { const piv = new THREE.Group(); piv.rotation.y = k * 1.2566; head.add(piv); const m = kit.mesh(new THREE.SphereGeometry(0.05, 10, 6).scale(1.5, 0.35, 0.8).translate(0.065, 0, 0), pm, [0, 0, 0], piv); m.rotation.z = 0.45; }
      kit.mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0xffd23f), [0, 0.01, 0], head);
    }
    const plant = { g, lean, stem, leaves, head, leafMat, stemMat, h: 0,
      // h: height, n: how many leaves, size: leaf size, r: stem radius, tilt: lean
      set(h, n, size = 1, r = 0.018, tilt = 0, bloom = 1) {
        plant.h = h;
        stem.scale.set(r, Math.max(0.001, h), r);
        lean.rotation.z = tilt;
        leaves.forEach((p, k) => {
          const on = clamp(n - k, 0, 1);
          p.visible = on > 0.01;
          p.position.y = h * (0.25 + 0.65 * (k / Math.max(1, leaves.length - 1)));
          p.scale.setScalar(Math.max(0.001, on * size));
        });
        if (head) { head.position.y = h; head.scale.setScalar(Math.max(0.001, bloom)); head.visible = bloom > 0.01; }
      } };
    return plant;
  }

  // ---------- flower families: parents and the young plants their seeds grow into ----------
  const fam = [[0xe63946, -0.9], [0xffc300, 0.9]].map(([c, dx], f) => {
    const px = PLANTS[0] + dx, pz = PLANTS[1];
    const parent = makePlant(px, pz, { flower: c });
    parent.set(0.75, 8, 1.1, 0.022);
    const kids = [-0.45, 0.45].map((ox, j) => {
      const kp = makePlant(px + ox, pz + 0.8 + j * 0.1, { flower: c });
      kp.grow = 0.62 + 0.12 * (j ? 1 : -0.4) + f * 0.04;   // a bit taller or shorter than the parent
      kp.set(0.001, 0, 1, 0.018, 0, 0);
      return kp;
    });
    const seeds = kids.map(() => kit.mesh(new THREE.SphereGeometry(0.025, 8, 6).scale(1, 0.7, 1.4), flat(0x5a3a1e), [0, 0, 0], scene));
    return { parent, kids, seeds, px, pz };
  });
  const famTags = fam.map((F, f) => label(f ? 'Yellow parent' : 'Red parent', new THREE.Vector3(F.px, 1.05, F.pz), { cls: 'warm' }));
  const kidTag = label('Young plants', new THREE.Vector3(PLANTS[0], 0.75, PLANTS[1] + 0.9));
  function setFamilies(p) {
    for (const F of fam) F.kids.forEach((kp, j) => {
      const fall = smooth(0, 0.25, p), grow = smooth(0.3, 1, p);
      const s = F.seeds[j];
      s.visible = fall > 0 && grow < 0.1;
      s.position.set(lerp(F.px, kp.g.position.x, fall), lerp(0.75, 0.02, fall) + Math.sin(fall * Math.PI) * 0.25, lerp(F.pz, kp.g.position.z, fall));
      kp.set(kp.grow * grow, 8 * smooth(0.35, 0.9, p), 0.95 + j * 0.15, 0.018, 0, smooth(0.8, 1, p));
    });
  }

  // ---------- sun and shade ----------
  const sunny = makePlant(SUNNY[0], SUNNY[2], { maxLeaves: 9 });
  const shady = makePlant(SHADY[0], SHADY[2], { maxLeaves: 9 });
  for (const [x, z] of [[SUNNY[0], SUNNY[2]], [SHADY[0], SHADY[2]]]) {
    const pot = kit.mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.18, 14), flat(0xc8693a), [x, 0.09, z], scene);
    pot.receiveShadow = true;
    kit.mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.01, 14), flat(0x5e4026), [x, 0.175, z], scene);
  }
  sunny.g.position.y = shady.g.position.y = 0.18;
  // A wooden awning throws its shadow over the second pot. The sun shines from up and to the front right,
  // so the roof sits up and to the front right of the pot, on two posts at its right edge (out of the way of the view).
  const ROOF_H = 1.25, roof = new THREE.Group(); roof.position.set(SHADY[0] + 0.5, 0, SHADY[2] + 0.75); scene.add(roof);
  const wood = flat(0x9a7046);
  kit.mesh(new THREE.BoxGeometry(1.0, 0.05, 1.0), wood, [0, ROOF_H, 0], roof);
  for (const z of [-0.46, 0.46]) kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, ROOF_H, 6), wood, [0.46, ROOF_H / 2, z], roof);
  // Height chart on a board behind the pots.
  const chart = new THREE.Group(); chart.position.set((SUNNY[0] + SHADY[0]) / 2 - 1.15, 0, SUNNY[2] - 0.1); scene.add(chart);
  kit.mesh(new THREE.BoxGeometry(0.75, 1.15, 0.04), kit.mat(0xffffff), [0, 0.6, 0], chart);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xc9d3dd });
  for (let k = 1; k <= 4; k++) kit.mesh(new THREE.BoxGeometry(0.66, 0.008, 0.01), lineMat, [0, 0.08 + k * 0.24, 0.025], chart).castShadow = false;
  const barSun = kit.mesh(new THREE.BoxGeometry(0.2, 1, 0.03).translate(0, 0.5, 0), flat(0x3f9a35), [-0.16, 0.08, 0.035], chart);
  const barShade = kit.mesh(new THREE.BoxGeometry(0.2, 1, 0.03).translate(0, 0.5, 0), flat(0xc9d77a), [0.16, 0.08, 0.035], chart);
  const chartTag = label('Height chart', new THREE.Vector3(chart.position.x, 1.32, chart.position.z));
  const sunTag = label('Sun', new THREE.Vector3(SUNNY[0], 1.3, SUNNY[2]), { cls: 'warm' });
  const shadeTag = label('Shade', new THREE.Vector3(SHADY[0], 1.12, SHADY[2]), { cls: 'cool' });
  const GREEN = new THREE.Color(0x3f8f35), PALE = new THREE.Color(0xd6dc84), STEM = new THREE.Color(0x4f9a3a), PALESTEM = new THREE.Color(0xc9d77a);
  function setLight(p) {
    // Both start the same. In sun: sturdy, green, many leaves. In shade: thin, pale, few small leaves, stretched and leaning.
    sunny.set(lerp(0.12, 0.72, p), lerp(2, 9, p), 1, lerp(0.012, 0.024, p));
    shady.set(lerp(0.12, 0.86, p), lerp(2, 3.4, p), lerp(1, 0.6, p), lerp(0.012, 0.008, p), 0.22 * p);
    sunny.leafMat.color.copy(GREEN); sunny.stemMat.color.copy(STEM);
    shady.leafMat.color.copy(GREEN).lerp(PALE, p); shady.stemMat.color.copy(STEM).lerp(PALESTEM, p);
    barSun.scale.y = sunny.h; barShade.scale.y = shady.h * Math.cos(0.22 * p);
  }

  // ---------- dog and puppy ----------
  function makeDog(x, z, s) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    const coat = kit.mat(0xc08a52, { roughness: 0.85 }), spot = flat(0x6b4426), cream = whiteMat;
    const body = new THREE.Group(); g.add(body);
    kit.mesh(ball(0.22), coat, [0, 0.36, 0], body).scale.set(0.9, 0.82, 1.5);
    kit.mesh(ball(0.1, 10, 8), spot, [0.12, 0.45, -0.08], body).scale.set(0.5, 0.9, 1.3);
    kit.mesh(ball(0.08, 10, 8), spot, [-0.13, 0.4, 0.06], body).scale.set(0.5, 0.9, 1.2);
    kit.mesh(ball(0.11), cream, [0, 0.33, 0.24], body).scale.set(0.9, 1, 0.7);
    const legs = [];
    for (const [lx, lz] of [[-0.11, 0.2], [0.11, 0.2], [-0.11, -0.2], [0.11, -0.2]]) {
      const leg = new THREE.Group(); leg.position.set(lx, 0.27, lz); body.add(leg);
      kit.mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), coat, [0, -0.13, 0], leg);
      kit.mesh(ball(0.05, 8, 6), cream, [0, -0.25, 0.02], leg);
      legs.push(leg);
    }
    const head = new THREE.Group(); head.position.set(0, 0.58, 0.3); body.add(head);
    kit.mesh(ball(0.15, 16, 12), coat, [0, 0, 0], head);
    kit.mesh(ball(0.08, 10, 8), cream, [0, -0.04, 0.13], head).scale.set(1, 0.8, 1.3);
    kit.mesh(ball(0.035, 8, 6), dark, [0, 0, 0.23], head);
    for (const sx of [-1, 1]) {
      kit.mesh(ball(0.025, 8, 6), dark, [sx * 0.06, 0.05, 0.13], head);
      const ear = kit.mesh(ball(0.07, 10, 8), spot, [sx * 0.14, -0.02, -0.01], head); ear.scale.set(0.4, 1.3, 0.8); ear.rotation.z = sx * 0.2;
    }
    const tail = new THREE.Group(); tail.position.set(0, 0.45, -0.3); body.add(tail);
    const tm = kit.mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.25, 6).translate(0, 0.12, 0), coat, [0, 0, 0], tail); tm.rotation.x = -0.6;
    return { g, body, head, tail, legs };
  }
  const dog = makeDog(DOG[0], DOG[2], 1), pup = makeDog(PUP[0], PUP[2], 0.55);
  dog.g.rotation.y = Math.PI / 2; pup.g.rotation.y = 0.5;
  const hoop = kit.mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 32), flat(0xff5d8f), [HOOP[0], HOOP[1] + 0.12, HOOP[2]], scene);
  hoop.rotation.y = Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.27, 6), flat(0x8d99ae), [HOOP[0], 0.13, HOOP[2]], scene);
  kit.mesh(new THREE.BoxGeometry(0.3, 0.03, 0.18), flat(0x8d99ae), [HOOP[0], 0.015, HOOP[2]], scene);
  const dogTag = label('Trained dog', new THREE.Vector3(DOG[0], 1.0, DOG[2]), { cls: 'warm' });
  const pupTag = label('Puppy', new THREE.Vector3(PUP[0], 0.62, PUP[2]));
  const D = { dog: -1, pup: -1 };
  const DOG_END = HOOP[0] + 1.15;
  function animateDogs(dt, t) {
    let busy = false;
    dog.tail.rotation.z = Math.sin(t * 9) * 0.5; pup.tail.rotation.z = Math.sin(t * 12) * 0.6;
    if (D.dog >= 0) {
      const u = (D.dog += dt); busy = u < 4.2;
      // Run up, leap through the hoop, land, then trot back.
      if (u < 1.6) {
        const k = kit.ease(u / 1.6), x = lerp(DOG[0], DOG_END, k);
        const jx = (x - (HOOP[0] - 0.75)) / 1.5;      // 0..1 across the jump
        dog.g.position.x = x;
        dog.g.position.y = jx > 0 && jx < 1 ? Math.sin(jx * Math.PI) * 0.55 : 0;
        dog.body.rotation.x = jx > 0 && jx < 1 ? -Math.cos(jx * Math.PI) * 0.35 : 0;
        dog.legs.forEach((l, j) => { l.rotation.x = jx > 0 && jx < 1 ? (j < 2 ? -0.8 : 0.8) : Math.sin(u * 18 + j * 1.6) * 0.5; });
        dog.g.rotation.y = Math.PI / 2;
      } else if (u < 2.2) { dog.g.position.y = 0; dog.body.rotation.x = 0; dog.legs.forEach(l => { l.rotation.x = 0; }); dog.g.rotation.y = Math.PI / 2 - Math.PI * smooth(1.7, 2.2, u); }
      else if (u < 4.2) {
        // Trot back round the hoop's side.
        const k = smooth(2.2, 4.2, u);
        dog.g.position.set(lerp(DOG_END, DOG[0], k), 0, DOG[2] + Math.sin(k * Math.PI) * 0.6);
        dog.g.rotation.y = -Math.PI / 2 + Math.cos(k * Math.PI) * -0.5;
        dog.legs.forEach((l, j) => { l.rotation.x = Math.sin(u * 14 + j * 1.6) * 0.4; });
      } else { dog.g.position.set(DOG[0], 0, DOG[2]); dog.g.rotation.y = Math.PI / 2; dog.legs.forEach(l => { l.rotation.x = 0; }); }
    }
    if (D.pup >= 0) {
      const u = (D.pup += dt); busy = busy || u < 3;
      // The puppy tilts its head, hops on the spot and sits: it does not know the trick.
      pup.head.rotation.z = Math.sin(smooth(0, 0.5, u) * Math.PI / 2) * 0.45 * (1 - smooth(2.2, 3, u));
      const hop = u > 0.8 && u < 1.6 ? Math.sin(((u - 0.8) / 0.4) * Math.PI) : 0;
      pup.g.position.y = Math.abs(hop) * 0.08;
      pup.body.rotation.x = -0.25 * smooth(1.8, 2.2, u) * (1 - smooth(2.6, 3, u));
    }
    return busy;
  }

  const allTags = [...catTags, ...famTags, kidTag, chartTag, sunTag, shadeTag, dogTag, pupTag];
  let famP = 0, lightP = 0;

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.time = 0; st.quiz = isQuiz; st.auto = true; st.msg = '';
      allTags.forEach(t => t.show(false));
      litter = 0; kittens.forEach((k, j) => k.set(LITTER[j])); showTrait(-1);
      famP = i > 3 || isQuiz ? 1 : 0; lightP = isQuiz || i > 4 ? 1 : 0.0;
      D.dog = D.pup = -1; dog.g.position.set(DOG[0], 0, DOG[2]); dog.g.rotation.y = Math.PI / 2; pup.head.rotation.z = 0;
      const catView = { radius: 1.25, width: 1.8, yaw: 0.4, pitch: 0.35, target: [0, 0.35, 0] };

      if (i === 0) {
        go(catView);
        catTags.slice(0, 2).forEach(t => t.show(true));
        ui.buttons([
          { label: 'Mom', onClick: () => view({ radius: 0.55, yaw: 0.4, pitch: 0.3, target: [mom.g.position.x, 0.45, mom.g.position.z] }) },
          { label: 'Dad', onClick: () => view({ radius: 0.55, yaw: 0.4, pitch: 0.3, target: [dad.g.position.x, 0.45, dad.g.position.z] }) },
          { label: 'Kittens', onClick: () => view({ radius: 0.8, width: 1.6, yaw: 0.3, pitch: 0.35, target: [0, 0.2, KZ] }) },
          { label: 'Whole family', onClick: () => view(catView) },
        ]);
        say('A mother, a father and their <b>four kittens</b>.');
      }
      if (i === 1) {
        go(catView);
        catTags.forEach(t => t.show(true));
        st.row = ui.buttons(TRAITS.map((T, n) => ({ label: T.label, onClick: () => { st.auto = false; showTrait(n); } })));
        showTrait(0); st.row.select(0);
      }
      if (i === 2) {
        go(catView);
        catTags.forEach(t => t.show(true));
        ui.buttons([{ label: 'New litter', onClick: () => { st.auto = false; newLitter(); } }]);
        say('Same parents, but each kitten has its <b>own mix</b> of traits.');
      }
      if (i === 3) {
        go({ radius: 1.2, width: 1.9, yaw: 0.1, pitch: 0.3, target: [PLANTS[0], 0.45, PLANTS[1] + 0.4] });
        famTags.forEach(t => t.show(true));
        ui.buttons([{ label: 'Plant the seeds', onClick: () => { st.auto = false; famP = 0; st.grow = true; } }]);
        st.grow = false;
      }
      if (i === 4) {
        go({ radius: 1.2, width: 1.7, yaw: 0.2, pitch: 0.08, target: [-4.5, 0.6, -0.9] });
        sunTag.show(true); shadeTag.show(true); chartTag.show(true);
        st.slider = ui.slider({ label: 'Growing time', min: 0, max: 4, step: 0.05, value: 0, format: v => (v < 0.05 ? 'start' : `${Math.ceil(v - 0.001)} week${Math.ceil(v - 0.001) > 1 ? 's' : ''}`), onInput: v => { st.auto = false; lightP = v / 4; } });
      }
      if (i === 5) {
        go({ radius: 1.2, width: 1.8, yaw: -0.2, pitch: 0.3, target: [4.3, 0.45, -0.7] });
        dogTag.show(true); pupTag.show(true);
        D.dog = 0; st.pupAt = 4.4;
        ui.buttons([{ label: 'Ask the dog', onClick: () => { D.dog = 0; } }, { label: 'Ask the puppy', onClick: () => { st.pupAt = null; D.pup = 0; } }]);
        say('The puppy has its parent\'s <b>floppy ears</b> and <b>brown spots</b>.');
      }
      if (isQuiz) go({ radius: 3, width: 5.4, yaw: 0.2, pitch: 0.6, target: [-0.3, 0.3, 1.2] });
      setFamilies(famP); setLight(lightP); animateCats(0);
    },

    update(dt, t) {
      st.time += dt;
      const i = st.step;
      if (st.quiz) { animateCats(t); return true; }
      let busy = false;
      if (i <= 2) {
        animateCats(t); busy = true;
        if (i === 1 && st.auto) { const n = clamp(Math.floor(st.time / 2.2), 0, 99) % TRAITS.length; if (n !== st.trait) { showTrait(n); st.row.select(n); } }
        if (i === 2 && st.auto) { const n = Math.floor((st.time + 1.2) / 2.5); if (n > litter) newLitter(); }
      }
      if (i === 3) {
        if (st.auto && st.time > 0.4) st.grow = true;
        if (st.grow && famP < 1) { famP = Math.min(1, famP + dt / 2.6); setFamilies(famP); busy = true; }
        kidTag.show(famP > 0.6);
        say(famP < 0.3 ? 'Each parent drops its seeds.' : 'Red parents → red young plants. Yellow parents → yellow young plants.');
      }
      if (i === 4) {
        if (st.auto && lightP < 1) { lightP = Math.min(1, Math.max(0, (st.time - 0.3) / 3)); st.slider.set(lightP * 4); busy = true; }
        setLight(lightP);
        say(lightP < 0.05 ? 'Two young plants from the <b>same parent</b>. They start the same.'
          : `Sun: <b>${Math.round(lerp(2, 9, lightP))} leaves</b>, strong and green. Shade: <b>${Math.round(lerp(2, 3.4, lightP))} leaves</b>, thin and pale.`);
      }
      if (i === 5) {
        if (st.pupAt != null && st.time > st.pupAt) { st.pupAt = null; D.pup = 0; }
        busy = animateDogs(dt, t) || true;
        if (D.pup > 0.5) say('The puppy does not know the trick. A trick must be <b>learned</b>.');
      }
      return busy;
    },
  };
}
