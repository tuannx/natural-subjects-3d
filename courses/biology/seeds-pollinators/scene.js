// Flowers, bees and seeds. A bee carries pollen between four flowers; the flowers that got pollen
// turn into fruits with seeds inside. Then seeds travel: dandelion parachutes in the wind, a berry
// eaten by a bird, burrs on a rabbit's fur, a coconut on the sea and a pod that pops. Last, a seed
// in a glass box of soil sprouts once it has both water and warmth.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand, leafGeometry } from '../_shared/leaf.js';
import { bird, rabbit } from '../_shared/critters.js';
import { paint, smooth, tuftGeometry } from '../_shared/habitat-kit.js';

const FX = [-1.2, -0.4, 0.4, 1.2];                 // x of the four flowers in the bed
const HEAD_Y = 0.95;                              // height of a flower head
const DAND = [-4.6, 0, 1.2];                      // dandelion
const BUSH = [3.6, 0, -0.6], POST = [7.2, 0, 0.3], BURDOCK = [4.7, 0, 2.25];
const SEA_Z = -6.8, ISLE = 2.1, POD = [-1.9, 0, -3.2];
const BOX = [-3.3, 0, -2.4];                      // glass box of soil with one seed
const N_SEEDS = 36;
const WIND = ['calm', 'a little wind', 'windy', 'very windy'];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xa9d68c, sky: 0xdcf0ff });
  kit.lights(scene, { sun: [4, 10, 6] });
  const { clamp, lerp } = kit;
  const flat = (c, o) => kit.mat(c, { flatShading: true, ...o });
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const qUp = new THREE.Quaternion();
  const st = { step: 0, time: 0, quiz: false, auto: true, wind: 2, msg: '' };
  const say = html => { if (html !== st.msg) { st.msg = html; ui.readout(html); } };

  // ---------- grass tufts (kept out of the sea and the busy spots) ----------
  const tuftGeo = tuftGeometry(THREE, { blades: 5, h: 0.22, w: 0.03 }), tuftMat = flat(0x6fb455);
  for (let i = 0, n = 0; i < 200 && n < 45; i++) {
    const a = rand(i) * Math.PI * 2, r = 1.8 + rand(i + 300) * 10, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z - SEA_Z) < 3.8 || (Math.abs(x) < 1.9 && Math.abs(z) < 1.1) || Math.hypot(x - BOX[0], z - BOX[2]) < 1.1 ||
      Math.hypot(x - BUSH[0], z - BUSH[2]) < 0.9 || Math.hypot(x - POD[0], z - POD[2]) < 0.6) continue;
    const t = kit.mesh(tuftGeo, tuftMat, [x, 0, z], scene);
    t.rotation.y = a * 3; t.castShadow = false; n++;
  }

  // ---------- a small sprout, used wherever a travelling seed lands ----------
  const sproutLeaf = leafGeometry(THREE, 0.12, 0.07, 0.05), sproutStem = new THREE.CylinderGeometry(0.008, 0.012, 0.2, 5).translate(0, 0.1, 0);
  const green = flat(0x4f9a3a), leafMat = flat(0x5bab42, { side: THREE.DoubleSide });
  function makeSprout(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    kit.mesh(sproutStem, green, [0, 0, 0], g);
    for (const s of [0, Math.PI]) { const p = new THREE.Group(); p.position.y = 0.19; p.rotation.y = s; g.add(p); kit.mesh(sproutLeaf, leafMat, [0, 0, 0], p).rotation.z = 0.4; }
    g.scale.setScalar(0.001); g.visible = false;
    return g;
  }
  const growSprout = (g, p) => { g.visible = p > 0; g.scale.setScalar(Math.max(0.001, p)); };

  // ---------- flower bed ----------
  const PETAL = new THREE.Color(0xff7eb6), WILT = new THREE.Color(0xa98060), UNRIPE = new THREE.Color(0x8cc63f), RIPE = new THREE.Color(0xe63946);
  const leafGeo = leafGeometry(THREE, 0.32, 0.15, 0.12);
  const petalGeo = new THREE.SphereGeometry(0.1, 12, 8).scale(1.5, 0.22, 0.75).translate(0.14, 0, 0);
  const dotGeo = new THREE.SphereGeometry(0.017, 6, 4), pollenMat = flat(0xffd23f);
  const flowers = FX.map((x, i) => {
    const g = new THREE.Group(); g.position.set(x, 0, 0); g.rotation.y = (rand(i) - 0.5) * 0.5; scene.add(g);
    kit.mesh(new THREE.CylinderGeometry(0.018, 0.026, HEAD_Y, 6).translate(0, HEAD_Y / 2, 0), green, [0, 0, 0], g);
    for (const [y, a] of [[0.3, 0.5], [0.5, 3.7]]) {
      const p = new THREE.Group(); p.position.y = y; p.rotation.y = a; g.add(p);
      kit.mesh(leafGeo, leafMat, [0, 0, 0], p).rotation.z = 0.35;
    }
    const head = new THREE.Group(); head.position.y = HEAD_Y; head.rotation.x = 0.55; g.add(head);
    const petalMat = kit.mat(PETAL.getHex(), { roughness: 0.6 }); // its own, so one flower can wilt alone
    const hinges = [];
    for (let k = 0; k < 6; k++) {
      const piv = new THREE.Group(); piv.rotation.y = k * Math.PI / 3; head.add(piv);
      const hg = new THREE.Group(); piv.add(hg); hinges.push(hg);
      kit.mesh(petalGeo, petalMat, [0, 0, 0], hg).castShadow = false;
    }
    const centre = kit.mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.04, 14), flat(0xffb703), [0, 0.01, 0], head);
    const pollen = new THREE.Group(); head.add(pollen);
    for (let k = 0; k < 8; k++) {
      const a = k * 0.785 + rand(i * 10 + k), r = 0.045 + 0.015 * rand(k + i * 3);
      kit.mesh(dotGeo, pollenMat, [Math.cos(a) * r, 0.04, Math.sin(a) * r], pollen).castShadow = false;
    }
    // The sticky tip in the middle catches pollen brought from another flower.
    const stigma = kit.mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.07, 8), flat(0x9ccf4a), [0, 0.055, 0], head);
    const got = new THREE.Group(); head.add(got); got.visible = false;
    for (let k = 0; k < 4; k++) kit.mesh(dotGeo, pollenMat, [Math.cos(k * 1.57) * 0.02, 0.095, Math.sin(k * 1.57) * 0.02], got).castShadow = false;
    const fruit = kit.mesh(new THREE.SphereGeometry(1, 16, 12), kit.mat(UNRIPE.getHex(), { roughness: 0.35 }), [0, 0, 0], head);
    fruit.visible = false;
    const tag = new THREE.Object3D(); tag.position.set(0, 0.28, 0); head.add(tag);
    g.updateMatrixWorld(true);
    const top = head.localToWorld(V(0, 0.15, 0));
    return { g, head, hinges, petalMat, centre, pollen, stigma, got, fruit, tag, top, open: 1, pollinated: false };
  });
  // open: 0 bud .. 1 open. p: 0 flower .. 1 ripe fruit (only flowers with pollen make fruit).
  function shapeFlower(f, p) {
    const drop = smooth(0.12, 0.5, p), o = kit.ease(clamp(f.open, 0, 1));
    for (const h of f.hinges) {
      h.rotation.z = lerp(lerp(1.3, 0.12, o), -1.4, drop);
      h.scale.setScalar(Math.max(0.001, 1 - drop));
    }
    f.petalMat.color.copy(PETAL).lerp(WILT, smooth(0.05, 0.35, p));
    f.got.visible = f.pollinated && p < 0.4;
    f.pollen.visible = p < 0.3;
    if (f.pollinated) {
      const s = lerp(0.03, 0.12, smooth(0.25, 0.9, p));
      f.fruit.visible = p > 0.25; f.fruit.scale.setScalar(s); f.fruit.position.y = s * 0.6;
      f.fruit.material.color.copy(UNRIPE).lerp(RIPE, smooth(0.6, 1, p));
      f.centre.scale.setScalar(Math.max(0.001, 1 - smooth(0.3, 0.6, p)));
      f.stigma.visible = p < 0.45;
      f.head.rotation.x = 0.55;
    } else {
      f.fruit.visible = false;
      f.centre.scale.setScalar(1 - 0.4 * smooth(0.2, 0.8, p));
      f.stigma.visible = true;
      f.head.rotation.x = 0.55 + 1.5 * smooth(0.2, 0.9, p); // droops and dries up
    }
  }
  const petalsTag = label('Petals', new THREE.Object3D()); flowers[3].head.add(petalsTag.at); petalsTag.at.position.set(0.32, 0.03, 0);
  const pollenTag = label('Pollen', new THREE.Object3D()); flowers[1].head.add(pollenTag.at); pollenTag.at.position.set(0, 0.1, 0);
  const noFruitTag = label('No pollen: no fruit', flowers[0].tag);
  const fruitTag = label('Fruit', flowers[3].tag, { cls: 'warm' });

  // A fruit cut in half, to show the seeds inside.
  const half = new THREE.Group(); half.position.set(0, 0.13, 0.75); half.rotation.x = -Math.PI / 2 - 0.5; scene.add(half);
  kit.mesh(new THREE.SphereGeometry(0.13, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0xe63946, { roughness: 0.35 }), [0, 0, 0], half);
  const face = kit.mesh(new THREE.CircleGeometry(0.13, 20), kit.mat(0xffc2b8), [0, -0.001, 0], half); face.rotation.x = Math.PI / 2;
  const pip = new THREE.SphereGeometry(0.02, 8, 6).scale(1, 0.4, 1.6), pipMat = flat(0x5a3a1e);
  for (let k = 0; k < 6; k++) { const a = k * 1.047 + 0.3; kit.mesh(pip, pipMat, [Math.cos(a) * 0.065, -0.006, Math.sin(a) * 0.065], half).rotation.y = -a; }
  const halfTag = label('Seeds inside', half, { cls: 'warm' });

  // ---------- the bee ----------
  const bee = new THREE.Group(); scene.add(bee);
  const stripes = paint(THREE, 16, 128, (g, w, h) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#2b2118' : '#ffc61a'; g.fillRect(0, (k * h) / 8, w, h / 8 + 1); } });
  kit.mesh(new THREE.SphereGeometry(0.09, 16, 12).rotateX(Math.PI / 2).scale(0.85, 0.8, 1.3), kit.mat(0xffffff, { map: stripes }), [0, 0, 0], bee);
  const black = flat(0x2b2118);
  kit.mesh(new THREE.SphereGeometry(0.055, 12, 8), black, [0, 0.01, 0.12], bee);
  for (const s of [-1, 1]) { const an = kit.mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 3), black, [s * 0.025, 0.07, 0.15], bee); an.rotation.set(0.5, 0, -s * 0.4); }
  kit.mesh(new THREE.ConeGeometry(0.014, 0.04, 6).rotateX(-Math.PI / 2), black, [0, 0, -0.135], bee);
  const wingGeo = new THREE.CircleGeometry(0.07, 12).translate(0.07, 0, 0).scale(1, 0.55, 1).rotateX(-Math.PI / 2);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  const wings = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.03, 0.07, -0.01); p.scale.x = s; bee.add(p); kit.mesh(wingGeo, wingMat, [0, 0, 0], p).castShadow = false; p.side = s; return p; });
  const load = new THREE.Group(); bee.add(load);
  for (const [x, z] of [[-0.055, 0.02], [0.055, 0.02], [-0.05, -0.035], [0.05, -0.035]]) kit.mesh(new THREE.SphereGeometry(0.026, 8, 6), pollenMat, [x, -0.06, z], load);
  const beeTag = label('Bee', bee);
  const B = { from: V(), to: V(), ctrl: V(), k: 1, dur: 1, target: 0, hover: 0, carry: -1 };
  function flyTo(i) {
    B.from.copy(bee.position); B.to.copy(flowers[i].top);
    B.ctrl.lerpVectors(B.from, B.to, 0.5); B.ctrl.y += 0.45;
    B.k = 0; B.dur = 0.5 + B.from.distanceTo(B.to) * 0.6; B.target = i; B.hover = 0;
  }
  function land(i) {
    const f = flowers[i];
    if (B.carry >= 0 && B.carry !== i && !f.pollinated) f.pollinated = true;
    B.carry = i; B.hover = 0.7;
    shapeFlower(f, 0);
  }
  const pollinatedCount = () => flowers.filter(f => f.pollinated).length;

  // ---------- dandelion and the wind ----------
  const dand = new THREE.Group(); dand.position.set(...DAND); scene.add(dand);
  kit.mesh(new THREE.CylinderGeometry(0.014, 0.02, 1.1, 6).translate(0, 0.55, 0), flat(0x6aa84f), [0, 0, 0], dand);
  const dLeaf = leafGeometry(THREE, 0.42, 0.13, 0.2);
  for (let k = 0; k < 5; k++) { const p = new THREE.Group(); p.rotation.y = k * 1.26; dand.add(p); kit.mesh(dLeaf, leafMat, [0, 0.02, 0], p).rotation.z = 0.25; }
  kit.mesh(new THREE.SphereGeometry(0.04, 10, 8), flat(0xd9c9a3), [0, 1.12, 0], dand);
  const headPos = V(DAND[0], 1.12, DAND[2]);
  const stalkGeo = mergeGeometries([new THREE.CylinderGeometry(0.0035, 0.0035, 0.13, 3).translate(0, 0.08, 0), new THREE.SphereGeometry(0.012, 6, 4).scale(0.7, 1.8, 0.7)]);
  const pappusGeo = new THREE.ConeGeometry(0.05, 0.03, 10, 1, true).rotateX(Math.PI).translate(0, 0.16, 0);
  const tan = flat(0xcdb98f), fluff = kit.mat(0xffffff, { side: THREE.DoubleSide, roughness: 0.9 });
  const dSeeds = [];
  for (let i = 0; i < N_SEEDS; i++) {
    const y = 1 - ((i + 0.5) / N_SEEDS) * 1.6, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    const dir = V(Math.cos(a) * r, y, Math.sin(a) * r);
    const g = new THREE.Group(); scene.add(g);
    kit.mesh(stalkGeo, tan, [0, 0, 0], g).castShadow = false;
    kit.mesh(pappusGeo, fluff, [0, 0, 0], g).castShadow = false;
    dSeeds.push({ g, home: headPos.clone().addScaledVector(dir, 0.03), q0: new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir),
      v: V(), pull: 0, th: 1 + 3 * rand(i + 7), r1: rand(i + 21), r2: rand(i + 40), state: 0 });
  }
  function resetDandelion() { for (const s of dSeeds) { s.g.position.copy(s.home); s.g.quaternion.copy(s.q0); s.state = 0; s.pull = 0; } }
  const streaks = [];
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.012, 0.012), streakMat);
    m.position.set(-3 - rand(i + 70) * 7, 0.3 + rand(i + 80) * 1.6, DAND[2] - 1 + rand(i + 90) * 2);
    scene.add(m); streaks.push(m);
  }
  const dandTag = label('Dandelion seeds', new THREE.Vector3(DAND[0], 1.38, DAND[2]));

  // ---------- berry bush, bird, burdock and rabbit ----------
  const bush = new THREE.Group(); bush.position.set(...BUSH); scene.add(bush);
  kit.mesh(new THREE.IcosahedronGeometry(0.42, 1), flat(0x3f8f3a), [0, 0.42, 0], bush).scale.set(1.2, 0.9, 1);
  const berryGeo = new THREE.SphereGeometry(0.045, 10, 8), berryMat = kit.mat(0xd62839, { roughness: 0.35 });
  const berries = [[0.33, 0.7, 0], [-0.25, 0.68, 0.22], [0.1, 0.55, 0.36], [-0.4, 0.45, 0.1], [0.42, 0.42, 0.18], [-0.1, 0.78, -0.12], [0.2, 0.32, -0.36]]
    .map(p => kit.mesh(berryGeo, berryMat, p, bush));
  const post = kit.mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 8), flat(0x8b5a2b), [POST[0], 0.35, POST[2]], scene);
  const bd = bird(THREE, kit, { feathers: 0x3a6fd0 }); bd.g.scale.setScalar(1.3); scene.add(bd.g);
  const BIRD_A = V(BUSH[0], 0.78, BUSH[2]), BIRD_B = V(POST[0], 0.7, POST[2]), birdCtl = V((BUSH[0] + POST[0]) / 2, 2.0, 0);
  const birdSeed = kit.mesh(new THREE.SphereGeometry(0.03, 8, 6).scale(1, 0.7, 1.4), pipMat, [0, 0, 0], scene);
  const birdSprout = makeSprout(POST[0] - 0.32, POST[2] + 0.15);
  const bushTag = label('Berries', new THREE.Vector3(BUSH[0], 1.15, BUSH[2]), { cls: 'warm' });

  const burdock = new THREE.Group(); burdock.position.set(...BURDOCK); scene.add(burdock);
  kit.mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.6, 6).translate(0, 0.3, 0), green, [0, 0, 0], burdock);
  const bigLeaf = leafGeometry(THREE, 0.38, 0.26, 0.2);
  for (let k = 0; k < 3; k++) { const p = new THREE.Group(); p.position.y = 0.05; p.rotation.y = k * 2.1 + 0.6; burdock.add(p); kit.mesh(bigLeaf, leafMat, [0, 0, 0], p).rotation.z = 0.3; }
  const spikes = [new THREE.SphereGeometry(0.045, 8, 6)];
  for (let k = 0; k < 14; k++) {
    const yy = 1 - ((k + 0.5) / 14) * 2, rr = Math.sqrt(1 - yy * yy), a = k * 2.4, d = V(Math.cos(a) * rr, yy, Math.sin(a) * rr);
    const c = new THREE.ConeGeometry(0.008, 0.04, 3).translate(0, 0.055, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d));
    spikes.push(c);
  }
  const burrGeo = mergeGeometries(spikes);
  const burrMat = flat(0x8a6a3a);
  const BURR_HOME = [[0.06, 0.5, -0.12], [-0.08, 0.42, -0.1], [0.12, 0.36, -0.08]];
  const BURR_ON = [[-0.04, 0.4, 0.17], [0.12, 0.46, 0.14], [-0.17, 0.33, 0.15]];   // on the rabbit's near side
  const burrs = BURR_HOME.map((p, j) => ({ m: kit.mesh(burrGeo, burrMat, [0, 0, 0], scene), home: V(BURDOCK[0] + p[0], p[1], BURDOCK[2] + p[2]), on: V(...BURR_ON[j]), state: 0, y0: 0, fall: 0 }));
  const rb = rabbit(THREE, kit); scene.add(rb.g); rb.g.rotation.y = Math.PI / 2;
  const RAB_Z = 1.85, RAB_X0 = 2.6, RAB_X1 = 6.3;
  const burrSprout = makeSprout(0, 0);
  const burrTag = label('Burrs', new THREE.Vector3(BURDOCK[0], 0.85, BURDOCK[2]));
  const A = { bird: -1, rab: -1 };   // time since each animal's trip started (-1: not started)
  function resetAnimals() {
    A.bird = -1; A.rab = -1;
    bd.g.position.copy(BIRD_A); bd.g.rotation.set(0, 1.2, 0); bd.head.rotation.x = 0;
    berries[0].scale.setScalar(1); birdSeed.visible = false; growSprout(birdSprout, 0);
    rb.g.position.set(RAB_X0, 0, RAB_Z); rb.g.rotation.z = 0;
    burrs.forEach(b => { b.m.position.copy(b.home); b.state = 0; });
    growSprout(burrSprout, 0);
  }
  function animals(dt) {
    let busy = false;
    if (A.bird >= 0) {
      const t = (A.bird += dt); busy = t < 6;
      const w = bd.wings;
      if (t < 0.9) { bd.head.rotation.x = Math.sin((Math.PI * t) / 0.9) * 0.7; berries[0].scale.setScalar(t > 0.5 ? 0.001 : 1); }
      else if (t < 3.1) {
        const u = kit.ease((t - 0.9) / 2.2), a = 1 - u;
        bd.head.rotation.x = 0;
        bd.g.position.set(a * a * BIRD_A.x + 2 * a * u * birdCtl.x + u * u * BIRD_B.x, a * a * BIRD_A.y + 2 * a * u * birdCtl.y + u * u * BIRD_B.y, a * a * BIRD_A.z + 2 * a * u * birdCtl.z + u * u * BIRD_B.z);
        bd.g.rotation.y = 1.45;
        for (const wg of w) wg.rotation.z = wg.side * (0.3 + Math.sin(t * 28) * 0.9);
      } else {
        bd.g.position.copy(BIRD_B);
        for (const wg of w) wg.rotation.z = 0;
        bd.g.rotation.y = 1.45 + 0.6 * smooth(3.1, 3.6, t);
        if (t > 3.6) {
          const u = smooth(3.6, 4.3, t);
          birdSeed.visible = u < 1;
          birdSeed.position.set(lerp(POST[0] - 0.2, birdSprout.position.x, u), lerp(0.7, 0.03, u * u), lerp(POST[2] - 0.05, birdSprout.position.z, u));
          growSprout(birdSprout, smooth(4.3, 5.6, t));
        }
      }
    }
    if (A.rab >= 0) {
      const t = (A.rab += dt); busy = busy || t < 6;
      const u = clamp(t / 3.2, 0, 1);
      rb.g.position.x = lerp(RAB_X0, RAB_X1, u);
      rb.g.position.y = u < 1 ? Math.abs(Math.sin(u * 5 * Math.PI)) * 0.14 : 0;
      rb.g.rotation.z = t > 3.5 && t < 4.1 ? Math.sin(t * 40) * 0.08 : 0;  // a little shake
      for (const [j, b] of burrs.entries()) {
        if (b.state === 0 && rb.g.position.x > BURDOCK[0] - 0.15 + j * 0.05) b.state = 1;
        if (b.state === 1) {
          b.m.position.copy(rb.g.position).add(b.on);
          if (t > 4 + j * 0.1) { b.state = 2; b.fall = 0; b.y0 = b.m.position.y; }
        }
        if (b.state === 2) { b.fall += dt; b.m.position.y = Math.max(0.045, b.y0 - 4.9 * b.fall * b.fall); }
      }
      if (burrs[0].state === 2) burrSprout.position.set(burrs[0].m.position.x, 0, burrs[0].m.position.z + 0.02);
      growSprout(burrSprout, smooth(4.6, 5.8, t));
    }
    return busy;
  }

  // ---------- sea, islands, coconut and a popping pod ----------
  const sea = kit.mesh(new THREE.CircleGeometry(3.3, 40), kit.mat(0x3c9ee0, { roughness: 0.25 }), [0, 0.012, SEA_Z], scene);
  sea.rotation.x = -Math.PI / 2; sea.castShadow = false;
  const sand = flat(0xe9d29a);
  for (const s of [-1, 1]) kit.mesh(new THREE.SphereGeometry(0.95, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2), sand, [s * ISLE, 0, SEA_Z], scene).scale.y = 0.24;
  const palm = new THREE.Group(); palm.position.set(-ISLE - 0.25, 0.2, SEA_Z - 0.2); scene.add(palm);
  const bark = flat(0x9a7046);
  for (let k = 0; k < 5; k++) { const seg = kit.mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.34, 7), bark, [k * 0.035, 0.17 + k * 0.32, 0], palm); seg.rotation.z = -0.12; }
  const frond = leafGeometry(THREE, 0.8, 0.22, 0.6), frondMat = flat(0x3d8b37, { side: THREE.DoubleSide });
  const crown = new THREE.Group(); crown.position.set(0.17, 1.62, 0); palm.add(crown);
  for (let k = 0; k < 7; k++) { const p = new THREE.Group(); p.rotation.y = k * 0.9; crown.add(p); kit.mesh(frond, frondMat, [0, 0, 0], p).rotation.z = 0.25; }
  const nutMat = flat(0x7a5230), nutGeo = new THREE.SphereGeometry(0.1, 12, 8);
  for (let k = 0; k < 3; k++) kit.mesh(nutGeo, nutMat, [Math.cos(k * 2.1) * 0.09, -0.08, Math.sin(k * 2.1) * 0.09], crown).scale.setScalar(0.75);
  const nut = kit.mesh(nutGeo, nutMat, [0, 0, 0], scene); nut.scale.setScalar(1.3);
  const ripple = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 4, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
  ripple.rotation.x = Math.PI / 2; scene.add(ripple);
  const nutSprout = new THREE.Group(); scene.add(nutSprout);
  const shoot = leafGeometry(THREE, 0.32, 0.09, 0.25);
  for (let k = 0; k < 3; k++) { const p = new THREE.Group(); p.rotation.y = k * 2.1; nutSprout.add(p); kit.mesh(shoot, leafMat, [0, 0, 0], p).rotation.z = 1.0; }
  const NUT_START = V(-ISLE + 0.35, 0.3, SEA_Z + 0.25), NUT_END = V(ISLE - 0.38, 0.3, SEA_Z + 0.15);
  const nutTag = label('Coconut', nut);

  const podPlant = new THREE.Group(); podPlant.position.set(...POD); podPlant.scale.setScalar(1.6); scene.add(podPlant);
  kit.mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.6, 6).translate(0, 0.3, 0), flat(0x8fbf5a), [0, 0, 0], podPlant);
  const narrow = leafGeometry(THREE, 0.26, 0.08, 0.15);
  for (let k = 0; k < 5; k++) { const p = new THREE.Group(); p.position.y = 0.2 + k * 0.08; p.rotation.y = k * 2.4; podPlant.add(p); kit.mesh(narrow, leafMat, [0, 0, 0], p).rotation.z = 0.3; }
  const pinkMat = flat(0xff5fa2);
  for (const [x, y, z] of [[-0.09, 0.5, 0.05], [0.07, 0.6, -0.06]]) kit.mesh(new THREE.SphereGeometry(0.04, 8, 6), pinkMat, [x, y, z], podPlant).scale.set(1.2, 0.8, 1.2);
  const pod = new THREE.Group(); pod.position.set(0.13, 0.42, 0.08); podPlant.add(pod);
  const podMat = flat(0x8cc63f, { side: THREE.DoubleSide });
  const halfGeo = new THREE.SphereGeometry(0.05, 10, 8, 0, Math.PI).scale(1, 2, 1).translate(0, 0.1, 0);
  const valves = [0, Math.PI].map(r => { const h = new THREE.Group(); h.rotation.y = r; pod.add(h); kit.mesh(halfGeo, podMat, [0, 0, 0], h); return h; });
  const podSeedGeo = new THREE.SphereGeometry(0.022, 8, 6), podSeedMat = flat(0x4a3220);
  const podSeeds = [0, 1, 2, 3, 4].map(k => ({ m: kit.mesh(podSeedGeo, podSeedMat, [0, 0, 0], scene), a: k * 1.256 + 0.4, v: V(), state: 0 }));
  podPlant.updateMatrixWorld(true);
  const podCentre = pod.localToWorld(V(0, 0.1, 0));
  const podTag = label('Pod', podCentre.clone().setY(podCentre.y + 0.3));
  const W = { nut: -1, pod: -1 };
  function resetSea() {
    W.nut = -1; W.pod = -1;
    nut.position.copy(NUT_START); nut.rotation.set(0, 0, 0); ripple.visible = false;
    nutSprout.visible = false;
    for (const v of valves) v.rotation.z = 0;
    for (const s of podSeeds) { s.state = 0; s.m.position.copy(podCentre); s.m.visible = false; }
  }
  function seaMotion(dt, t) {
    let busy = false;
    if (W.nut >= 0) {
      const u = (W.nut += dt); busy = u < 6.6;
      const x0 = NUT_START.x, x1 = -ISLE + 1.05, x2 = ISLE - 1.05, x3 = NUT_END.x;
      if (u < 0.7) { const s = kit.ease(u / 0.7); nut.position.set(lerp(x0, x1, s), lerp(0.3, 0.06, s), NUT_START.z); nut.rotation.z = -s * 3; }
      else if (u < 4.7) {
        const s = (u - 0.7) / 4;
        nut.position.set(lerp(x1, x2, s), 0.06 + Math.sin(u * 4) * 0.025, lerp(NUT_START.z, NUT_END.z, s) + Math.sin(u * 1.7) * 0.08);
        nut.rotation.z = -3 + Math.sin(u * 3) * 0.3;
      } else { const s = kit.ease(clamp((u - 4.7) / 0.6, 0, 1)); nut.position.set(lerp(x2, x3, s), lerp(0.06, 0.3, s), NUT_END.z); }
      ripple.visible = u > 0.6 && u < 4.8;
      ripple.position.set(nut.position.x, 0.02, nut.position.z);
      ripple.scale.setScalar(1 + (t * 0.8) % 0.5);
      nutSprout.visible = u > 5.3;
      nutSprout.position.set(nut.position.x, nut.position.y + 0.06, nut.position.z);
      nutSprout.scale.setScalar(Math.max(0.001, smooth(5.3, 6.6, u)));
    }
    if (W.pod >= 0) {
      const u = (W.pod += dt); busy = busy || u < 2;
      const open = smooth(0, 0.12, u);
      valves[0].rotation.z = -open * 2.2; valves[1].rotation.z = -open * 2.2;
      for (const s of podSeeds) {
        if (s.state === 0 && u > 0.04) { s.state = 1; s.m.visible = true; s.m.position.copy(podCentre); s.v.set(Math.cos(s.a) * 1.3, 1.5, Math.sin(s.a) * 1.3); }
        if (s.state === 1) {
          s.v.y -= 7 * dt; s.m.position.addScaledVector(s.v, dt);
          if (s.m.position.y <= 0.025) { s.m.position.y = 0.025; s.state = 2; }
        }
      }
    }
    return busy;
  }

  // ---------- glass box of soil with one seed, a thermometer and a rain cloud ----------
  const box = new THREE.Group(); box.position.set(...BOX); scene.add(box);
  const DRY = new THREE.Color(0xb88f5c), WET = new THREE.Color(0x5e4026);
  const soilMat = flat(DRY.getHex());
  kit.mesh(new THREE.BoxGeometry(1.0, 0.7, 0.5), soilMat, [0, 0.35, 0], box);
  const glassGeo = new THREE.BoxGeometry(1.06, 0.95, 0.56);
  const glass = new THREE.Mesh(glassGeo, new THREE.MeshStandardMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.15, roughness: 0.1, depthWrite: false }));
  glass.position.y = 0.475; box.add(glass);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glassGeo), new THREE.LineBasicMaterial({ color: 0x8fb8cc })); edges.position.y = 0.475; box.add(edges);
  const FZ = 0.255;   // the front face of the soil, where the seed sits
  const seed = kit.mesh(new THREE.SphereGeometry(0.06, 12, 8), flat(0xc98f5a), [0, 0.4, FZ], box); seed.scale.set(1.5, 0.85, 0.6);
  const rootMat = flat(0xf1ddb0);
  const root = kit.mesh(new THREE.CylinderGeometry(0.006, 0.014, 1, 6).translate(0, -0.5, 0), rootMat, [0.02, 0.37, FZ + 0.005], box);
  const hairs = [-1, 1].map(s => { const h = kit.mesh(new THREE.CylinderGeometry(0.004, 0.007, 1, 4).translate(0, -0.5, 0), rootMat, [0.02, 0.28, FZ + 0.005], box); h.rotation.z = s * 0.9; return h; });
  const stem = kit.mesh(new THREE.CylinderGeometry(0.012, 0.016, 1, 6).translate(0, 0.5, 0), flat(0x7fbf4a), [-0.01, 0.43, FZ + 0.005], box);
  const seedLeaves = [-1, 1].map(s => { const p = new THREE.Group(); box.add(p); p.rotation.y = s > 0 ? 0 : Math.PI; kit.mesh(sproutLeaf, leafMat, [0, 0, 0], p).scale.setScalar(1.3); return p; });
  const thermo = new THREE.Group(); thermo.position.set(BOX[0] + 0.85, 0, BOX[2] + 0.15); scene.add(thermo);
  kit.mesh(new THREE.CapsuleGeometry(0.035, 0.55, 4, 8), kit.mat(0xffffff, { transparent: true, opacity: 0.85 }), [0, 0.4, 0], thermo);
  const bulbMat = flat(0x5aa9e6);
  kit.mesh(new THREE.SphereGeometry(0.06, 12, 8), bulbMat, [0, 0.1, 0], thermo);
  const bar = kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8).translate(0, 0.5, 0), bulbMat, [0, 0.12, 0.002], thermo);
  const COLD = new THREE.Color(0x5aa9e6), HOT = new THREE.Color(0xe63946);
  const cloud = new THREE.Group(); cloud.position.set(BOX[0], 1.55, BOX[2]); scene.add(cloud);
  const cloudMat = flat(0xffffff);
  for (const [x, y, r] of [[-0.18, 0, 0.17], [0.05, 0.06, 0.21], [0.25, -0.01, 0.15]]) kit.mesh(new THREE.IcosahedronGeometry(r, 1), cloudMat, [x, y, 0], cloud).castShadow = false;
  const dropGeo = new THREE.SphereGeometry(0.022, 6, 4).scale(1, 1.8, 1), dropMat = kit.mat(0x4aa3ff);
  const drops = Array.from({ length: 8 }, (_, k) => { const m = kit.mesh(dropGeo, dropMat, [BOX[0] - 0.3 + (k % 4) * 0.2, 1.3, BOX[2] - 0.1 + (k > 3 ? 0.2 : 0)], scene); m.castShadow = false; m.ph = rand(k + 500); return m; });
  const thermoTag = label('Cold', new THREE.Vector3(BOX[0] + 0.85, 0.85, BOX[2] + 0.15), { cls: 'cool' });
  const seedTag = label('Seed', new THREE.Vector3(BOX[0] - 0.35, 0.47, BOX[2] + FZ));
  const S = { water: false, warm: false, p: 0, wet: 0, heat: 0 };
  function shapeSeedling() {
    const p = S.p;
    seed.scale.set(1.5, 0.85, 0.6).multiplyScalar(1 + 0.3 * smooth(0, 0.15, p));
    const r = smooth(0.12, 0.55, p) * 0.3;
    root.visible = r > 0.005; root.scale.set(1, Math.max(0.001, r), 1);
    for (const h of hairs) { const hr = smooth(0.35, 0.6, p) * 0.08; h.visible = hr > 0.003; h.scale.set(1, Math.max(0.001, hr), 1); }
    const s = smooth(0.4, 0.85, p) * 0.5;
    stem.visible = s > 0.005; stem.scale.set(1, Math.max(0.001, s), 1);
    const o = smooth(0.78, 1, p);
    for (const [j, l] of seedLeaves.entries()) {
      l.visible = o > 0; l.position.set(-0.01, 0.43 + s, FZ + 0.005);
      l.children[0].rotation.z = lerp(1.4, 0.35, o); l.scale.setScalar(Math.max(0.001, o));
      l.rotation.y = j ? Math.PI : 0;
    }
  }
  function setBox() {
    soilMat.color.copy(DRY).lerp(WET, S.wet);
    bulbMat.color.copy(COLD).lerp(HOT, S.heat);
    bar.scale.y = lerp(0.1, 0.5, S.heat);
    thermoTag.text = S.warm ? 'Warm' : 'Cold';
    thermoTag.el.className = 'lab ' + (S.warm ? 'warm' : 'cool');
  }
  function boxMsg() {
    if (S.p >= 1) return 'The seed has <b>sprouted</b>: a root grows down and a shoot grows up.';
    if (S.water && S.warm) return 'Water and warmth: the seed is <b>waking up</b>!';
    if (!S.water && !S.warm) return 'Dry and cold: the seed <b>waits</b>.';
    return S.water ? 'It has water, but it is too <b>cold</b>. The seed waits.' : 'It is warm, but the soil is <b>dry</b>. The seed waits.';
  }

  // ---------- all labels off; each step turns on its own ----------
  const allTags = [petalsTag, pollenTag, noFruitTag, fruitTag, halfTag, beeTag, dandTag, bushTag, burrTag, nutTag, podTag, thermoTag, seedTag];
  let fruitP = 0, toggles = {};

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.time = 0; st.quiz = isQuiz; st.auto = true; st.msg = ''; st.wind = 2;
      allTags.forEach(t => t.show(false));
      bee.visible = false;
      // The world at each step: flowers fresh before step 2, fruits from step 2 on.
      flowers.forEach((f, j) => { f.open = 1; f.pollinated = j > 0; });
      fruitP = i >= 3 || isQuiz ? 1 : 0;
      half.visible = fruitP > 0;
      resetDandelion(); resetAnimals(); resetSea();
      S.water = S.warm = false; S.p = 0; S.wet = 0; S.heat = 0;
      drops.forEach(d => { d.visible = false; });

      if (i === 0) {
        go({ radius: 0.9, width: 1.5, yaw: 0, pitch: 0.3, target: [0, 0.75, 0] });
        flowers.forEach(f => { f.open = 0; f.pollinated = false; });
        st.openStart = 0.3; st.openDir = 1;
        petalsTag.show(true); pollenTag.show(true);
        ui.buttons([{ label: 'Open the flowers', onClick: () => { st.openStart = st.time; st.openDir = 1; } },
          { label: 'Close the buds', onClick: () => { st.openStart = st.time; st.openDir = -1; } }]);
      }
      if (i === 1) {
        go({ radius: 1.0, width: 1.6, yaw: 0, pitch: 0.35, target: [0, 0.85, 0] });
        flowers.forEach(f => { f.pollinated = false; });
        bee.visible = true; beeTag.show(true);
        bee.position.copy(flowers[0].top); bee.rotation.y = 1.2; B.k = 1; B.target = 0; B.carry = 0; B.hover = 0.4;
        ui.buttons(FX.map((_, j) => ({ label: `Flower ${j + 1}`, onClick: () => { st.auto = false; flyTo(j); } })));
      }
      if (i === 2) {
        go({ radius: 1.0, width: 1.6, yaw: 0, pitch: 0.4, target: [0, 0.6, 0.25] });
        half.visible = true;
        st.slider = ui.slider({ label: 'Time', min: 0, max: 1, step: 0.01, value: 0, format: v => (v < 0.15 ? 'flowers' : v < 0.5 ? 'petals fall off' : v < 0.95 ? 'fruits grow' : 'ripe fruits'), onInput: v => { st.auto = false; fruitP = v; } });
      }
      if (i === 3) {
        go({ radius: 1.2, width: 2.0, yaw: 0, pitch: 0.2, target: [-5.7, 0.75, 1.2] });
        dandTag.show(true);
        ui.slider({ label: 'Wind', min: 0, max: 3, step: 1, value: 2, format: v => WIND[v] || '', onInput: v => { st.wind = v; } });
        ui.buttons([{ label: 'New dandelion', onClick: () => resetDandelion() }]);
      }
      if (i === 4) {
        go({ radius: 1.6, width: 2.7, yaw: -0.15, pitch: 0.35, target: [5.0, 0.5, 0.8] });
        bushTag.show(true); burrTag.show(true);
        A.bird = 0; A.rab = 0;
        ui.buttons([{ label: 'Bird eats a berry', onClick: () => { resetBird(); A.bird = 0; } },
          { label: 'Rabbit hops past', onClick: () => { resetRabbit(); A.rab = 0; } }]);
      }
      if (i === 5) {
        go({ radius: 1.8, width: 3.4, yaw: 0, pitch: 0.45, target: [0, 0.4, -5.4] });
        nutTag.show(true); podTag.show(true);
        W.nut = 0; st.podAt = 1.2;
        ui.buttons([{ label: 'Float the coconut', onClick: () => { resetNut(); W.nut = 0; } },
          { label: 'Pop the pod', onClick: () => { resetPod(); st.podAt = st.time + 0.3; } }]);
      }
      if (i === 6) {
        go({ radius: 1.0, width: 1.0, yaw: 0.15, pitch: 0.2, target: [BOX[0] + 0.2, 0.75, BOX[2]] });
        thermoTag.show(true); seedTag.show(true);
        toggles.water = ui.toggle({ label: 'Water', value: false, onChange: v => { st.auto = false; S.water = v; } });
        toggles.warm = ui.toggle({ label: 'Warmth', value: false, onChange: v => { st.auto = false; S.warm = v; } });
      }
      if (isQuiz) go({ radius: 4, width: 7.5, yaw: 0.1, pitch: 0.6, target: [0, 0.3, -2] });
      if (isQuiz) finishAll();
      flowers.forEach(f => shapeFlower(f, fruitP));
      shapeSeedling(); setBox();
      if (i === 1) say(`Flowers that got pollen from another flower: <b>${pollinatedCount()} of 4</b>`);
      if (i === 3) say(`Seeds blown away: <b>0 of ${N_SEEDS}</b>`);
      if (i === 6) say(boxMsg());
    },

    update(dt, t) {
      if (st.quiz) return false;
      st.time += dt;
      let busy = false;
      const i = st.step;

      if (i === 0) {
        busy = st.time < st.openStart + 2.2;
        flowers.forEach((f, j) => {
          const u = smooth(st.openStart + j * 0.25, st.openStart + j * 0.25 + 1.2, st.time);
          f.open = st.openDir > 0 ? Math.max(f.open, u) : Math.min(f.open, 1 - u);
          shapeFlower(f, 0);
        });
      }

      if (i === 1) {
        busy = true;
        if (B.k < 1) {
          B.k = Math.min(1, B.k + dt / B.dur);
          const u = kit.ease(B.k), a = 1 - u;
          bee.position.set(a * a * B.from.x + 2 * a * u * B.ctrl.x + u * u * B.to.x, a * a * B.from.y + 2 * a * u * B.ctrl.y + u * u * B.to.y, a * a * B.from.z + 2 * a * u * B.ctrl.z + u * u * B.to.z);
          const dx = 2 * a * (B.ctrl.x - B.from.x) + 2 * u * (B.to.x - B.ctrl.x), dz = 2 * a * (B.ctrl.z - B.from.z) + 2 * u * (B.to.z - B.ctrl.z);
          if (Math.abs(dx) + Math.abs(dz) > 1e-3) bee.rotation.y = Math.atan2(dx, dz);
          if (B.k >= 1) { land(B.target); say(`Flowers that got pollen from another flower: <b>${pollinatedCount()} of 4</b>`); }
        } else {
          bee.position.y = flowers[B.target].top.y + Math.sin(t * 6) * 0.015;
          if (B.hover > 0) { B.hover -= dt; if (B.hover <= 0 && st.auto) flyTo((B.target + 1) % 4); }
        }
        load.visible = B.carry >= 0;
        for (const w of wings) w.rotation.z = w.side * (0.3 + Math.sin(t * 40) * 0.5);
        flowers.forEach(f => { f.got.visible = f.pollinated; });
      }

      if (i === 2) {
        if (st.auto && fruitP < 1) { fruitP = Math.min(1, Math.max(0, (st.time - 0.3) / 3)); st.slider.set(fruitP); busy = true; }
        flowers.forEach(f => shapeFlower(f, fruitP));
        noFruitTag.show(fruitP > 0.6); fruitTag.show(fruitP > 0.8); halfTag.show(fruitP > 0.8);
        say(fruitP < 0.15 ? 'Three flowers got pollen. One did not.' : fruitP < 0.5 ? 'The petals dry up and fall off.' : 'Each flower with pollen grows into a <b>fruit</b> with <b>seeds</b> inside.');
      }

      if (i === 3) {
        const w = st.wind; let n = 0;
        for (const [j, s] of dSeeds.entries()) {
          if (s.state === 0 && w > 0.5) {
            s.pull += dt * (w - 0.5) * (0.25 + 0.5 * s.r1);
            if (s.pull > s.th) { s.state = 1; s.v.set(-w * 0.25, 0.2 + 0.25 * s.r2, (s.r2 - 0.5) * 0.3); }
          }
          if (s.state === 1) {
            busy = true;
            s.v.x += (-w * 0.25 * (0.6 + 0.4 * s.r1) - s.v.x) * Math.min(1, dt * 1.5);
            s.v.y += (-0.22 + Math.sin(st.time * 3 + j) * 0.05 - s.v.y) * Math.min(1, dt * 1.2);
            s.v.z += (Math.sin(st.time * 1.7 + j * 2) * 0.15 - s.v.z) * Math.min(1, dt);
            s.g.position.addScaledVector(s.v, dt);
            s.g.quaternion.slerp(qUp, Math.min(1, dt * 2));
            if (s.g.position.y <= 0.02) { s.g.position.y = 0.02; s.state = 2; }
          }
          if (s.state) n++;
        }
        streakMat.opacity = 0.35 * Math.min(1, w / 2);
        if (w > 0) {
          busy = true;
          for (const m of streaks) { m.position.x -= w * 1.6 * dt; if (m.position.x < -10.5) m.position.x += 7.5; }
        }
        say(`Seeds blown away: <b>${n} of ${N_SEEDS}</b>`);
      }

      if (i === 4) busy = animals(dt);

      if (i === 5) {
        if (st.podAt != null && st.time >= st.podAt) { W.pod = 0; st.podAt = null; }
        busy = seaMotion(dt, t) || st.podAt != null;
      }

      if (i === 6) {
        if (st.auto) {
          if (!S.water && st.time > 0.4) { S.water = true; toggles.water.checked = true; }
          if (!S.warm && st.time > 0.9) { S.warm = true; toggles.warm.checked = true; }
        }
        busy = kit.follow(S, 'wet', S.water ? 1 : 0, dt, 2) | kit.follow(S, 'heat', S.warm ? 1 : 0, dt, 2);
        if (S.water && S.warm && S.p < 1) { S.p = Math.min(1, S.p + dt / 4); busy = true; }
        const raining = S.water && S.p < 1;
        for (const d of drops) {
          d.visible = raining;
          if (raining) { busy = true; d.position.y = 1.35 - ((st.time * 0.9 + d.ph) % 1) * 0.6; }
        }
        shapeSeedling(); setBox();
        say(boxMsg());
      }
      return busy;
    },
  };

  // The quiz shows every trip finished: animals at the end, seeds landed, sprouts grown.
  function finishAll() {
    A.bird = 99; A.rab = 99; animals(10);
    W.nut = 99; seaMotion(10, 0);
    for (const v of valves) v.rotation.z = -2.2;
    for (const s of podSeeds) { s.state = 2; s.m.visible = true; s.m.position.set(podCentre.x + Math.cos(s.a) * 0.6, 0.025, podCentre.z + Math.sin(s.a) * 0.6); }
    for (const [j, s] of dSeeds.entries()) if (j % 3 === 0) { s.state = 2; s.g.quaternion.identity(); s.g.position.set(DAND[0] - 1.5 - rand(j + 600) * 3.5, 0.02, DAND[2] - 1 + rand(j + 700) * 2); }
    S.p = 1; S.water = S.warm = true; S.wet = S.heat = 1;
  }
  function resetBird() { A.bird = -1; bd.g.position.copy(BIRD_A); bd.g.rotation.set(0, 1.2, 0); berries[0].scale.setScalar(1); birdSeed.visible = false; growSprout(birdSprout, 0); }
  function resetRabbit() { A.rab = -1; rb.g.position.set(RAB_X0, 0, RAB_Z); burrs.forEach(b => { b.m.position.copy(b.home); b.state = 0; }); growSprout(burrSprout, 0); }
  function resetNut() { W.nut = -1; nut.position.copy(NUT_START); ripple.visible = false; nutSprout.visible = false; }
  function resetPod() { W.pod = -1; for (const v of valves) v.rotation.z = 0; for (const s of podSeeds) { s.state = 0; s.m.visible = false; } }
}
