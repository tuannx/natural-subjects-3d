// Our senses: a head with the five sense organs, then a big cut-away eye (light from a tree enters
// the pupil, the lens makes an upside-down picture on the retina, the optic nerve carries it to the
// brain) and a cut-away ear (sound rings from a drum shake the eardrum, tiny bones and the cochlea
// pass it on, the hearing nerve carries it to the brain). Everything sits in one row:
// head · tree → eye → brain ← ear ← drum.
const E = [0, 2.2, 0];        // eye centre (the eye looks toward -x)
const R = 1.4;                // eye radius
const HOLE = 0.45;            // half-angle of the opening at the front of the white of the eye
const B = [5, 3.4, 0];        // brain centre
const TREE = [-8.5, 0, 0];    // tree on the ground
const HEAD = [-15, 0, 0];     // the head for the five senses
const AY = 2.2;               // height of the ear canal
const DRUM = [14, 1.1, 0];    // the drum that makes the sound
const EAR_MOUTH = 11.2;       // x of the outer ear opening
const DRUM_X = 9.1;           // x of the eardrum

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const { clamp, lerp, follow } = kit;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const sky = new THREE.Color(0xdcefff), night = new THREE.Color(0x1a2233), bg = new THREE.Color();
  scene.background = sky.clone();
  const ground = kit.stage(scene, { ground: 0xcfe5bf, sky: 0xdcefff, radius: 24 });
  ground.receiveShadow = true;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8fa6b8, 1.6);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
  sunLight.position.set(-6, 12, 8);
  sunLight.target.position.set(0, 0, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunLight.shadow.camera, { left: -18, right: 18, top: 10, bottom: -10, near: 0.5, far: 40 });
  scene.add(sunLight, sunLight.target);

  const stand = (x, top, z = 0) => {
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, top, 8), kit.mat(0x8d99ae), [x, top / 2, z], scene);
    kit.mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.08, 20), kit.mat(0x6d597a), [x, 0.04, z], scene);
  };
  // Thin rod from a to b (made once; used for light rays).
  const UP = V(0, 1, 0), tmp = V(0, 0, 0);
  const rodGeo = new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0);
  function rod(a, b, r, material) {
    const m = new THREE.Mesh(rodGeo, material);
    m.position.copy(a);
    tmp.subVectors(b, a);
    m.scale.set(r, tmp.length(), r);
    m.quaternion.setFromUnitVectors(UP, tmp.normalize());
    scene.add(m);
    return m;
  }

  // ---------- The head: five senses ----------
  const head = new THREE.Group();
  head.position.set(...HEAD);
  scene.add(head);
  const skin = kit.mat(0xf1c27d), shirt = kit.mat(0x3a86ff), hair = kit.mat(0x4a3424), dark = kit.mat(0x1d1d1d);
  kit.mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.95, 20), shirt, [0, 0.48, 0], head);
  kit.mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.25, 12), skin, [0, 1.02, 0], head);
  kit.mesh(new THREE.SphereGeometry(0.5, 24, 18), skin, [0, 1.55, 0], head);
  const hairCap = kit.mesh(new THREE.SphereGeometry(0.52, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), hair, [0, 1.57, -0.02], head);
  hairCap.rotation.x = -0.25;
  const eyes = [], pupils = [];
  for (const x of [-0.17, 0.17]) {
    eyes.push(kit.mesh(new THREE.SphereGeometry(0.09, 14, 10), kit.mat(0xffffff), [x, 1.62, 0.42], head));
    pupils.push(kit.mesh(new THREE.SphereGeometry(0.045, 10, 8), dark, [x, 1.62, 0.5], head));
  }
  const nose = kit.mesh(new THREE.SphereGeometry(0.075, 12, 8), kit.mat(0xe8ac6a), [0, 1.5, 0.5], head);
  nose.scale.set(0.9, 1.1, 1);
  const mouth = kit.mesh(new THREE.SphereGeometry(0.11, 14, 8), kit.mat(0x7a1f2b), [0, 1.33, 0.43], head);
  mouth.scale.set(1.2, 0.5, 0.5);
  const tongue = kit.mesh(new THREE.SphereGeometry(0.06, 12, 8), kit.mat(0xff7a8a), [0, 1.31, 0.49], head);
  tongue.scale.set(1.2, 0.5, 0.9);
  const earsH = [-1, 1].map(s => { const m = kit.mesh(new THREE.SphereGeometry(0.12, 12, 8), skin, [s * 0.5, 1.55, 0], head); m.scale.set(0.45, 1, 0.8); return m; });
  // Raised right hand (touch).
  const hand = new THREE.Group();
  hand.position.set(0.78, 1.15, 0.3);
  head.add(hand);
  const arm = kit.mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.55, 10), shirt, [0.62, 0.86, 0.12], head);
  arm.rotation.z = 0.5; arm.rotation.x = -0.3;
  kit.mesh(new THREE.BoxGeometry(0.2, 0.22, 0.07), skin, [0, 0, 0], hand);
  const fingers = [];
  for (let i = 0; i < 4; i++) fingers.push(kit.mesh(new THREE.CapsuleGeometry(0.022, 0.09, 2, 6), skin, [-0.075 + i * 0.05, 0.17, 0], hand));
  kit.mesh(new THREE.CapsuleGeometry(0.024, 0.07, 2, 6), skin, [-0.13, 0.03, 0], hand).rotation.z = 0.9;
  const at = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const SENSES = [
    { btn: 'Sight', tag: label('Eyes: sight', at(head, 0, 1.75, 0.5)), parts: eyes },
    { btn: 'Hearing', tag: label('Ears: hearing', at(head, -0.55, 1.7, 0)), parts: earsH },
    { btn: 'Smell', tag: label('Nose: smell', at(head, 0.25, 1.48, 0.5)), parts: [nose] },
    { btn: 'Taste', tag: label('Tongue: taste', at(head, 0, 1.22, 0.5)), parts: [tongue] },
    { btn: 'Touch', tag: label('Skin: touch', at(hand, 0.05, 0.3, 0)), parts: [hand] },
  ];
  for (const s of SENSES) for (const p of s.parts) p.userData.s0 = p.scale.clone();
  // Small floating bits that drift toward the sense organ being shown (smells, sounds, light).
  const bitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  const bits = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), bitMat); m.visible = false; head.add(m); bits.push(m); }

  // ---------- Sun and tree ----------
  const sunPos = V(-6.5, 6.6, -2.5);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  const sun = kit.mesh(new THREE.SphereGeometry(0.55, 24, 12), sunMat, sunPos.toArray(), scene);
  sun.castShadow = false;
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.3, depthWrite: false });
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 12), glowMat));
  const tree = buildTree(THREE, kit, 1);
  tree.position.set(...TREE);
  scene.add(tree);
  const treeTop = V(TREE[0], 3.9, 0), treeBase = V(TREE[0], 0.35, 0);

  // ---------- The big eye (cut open on the side facing us) ----------
  const eye = new THREE.Group();
  eye.position.set(...E);
  eye.rotation.z = Math.PI / 2;  // inside the group the front of the eye is +y; in the world it faces -x
  scene.add(eye);
  stand(E[0], E[1] - R + 0.05);
  kit.mesh(new THREE.SphereGeometry(R, 32, 20, Math.PI, Math.PI, HOLE, Math.PI - HOLE), kit.mat(0xfbfbf6), [0, 0, 0], eye);
  const retinaMat = kit.mat(0xd9596c, { side: THREE.BackSide, emissive: 0x000000 });
  kit.mesh(new THREE.SphereGeometry(R * 0.95, 32, 20, Math.PI, Math.PI, HOLE + 0.02, Math.PI - HOLE - 0.02), retinaMat, [0, 0, 0], eye).castShadow = false;
  const rim = kit.mesh(new THREE.RingGeometry(R * 0.95, R, 40, 1, Math.PI / 2 + HOLE, Math.PI * 2 - 2 * HOLE), kit.mat(0xf1e3d3, { side: THREE.DoubleSide }), [0, 0, 0.002], eye);
  rim.castShadow = false;
  const yHole = R * Math.cos(HOLE);
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 10, 0, Math.PI * 2, 0, 0.95), new THREE.MeshStandardMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }));
  cornea.position.y = yHole - 0.75 * Math.cos(0.95);
  cornea.renderOrder = 3;
  eye.add(cornea);
  // Iris: a ring whose inner edge (the pupil) we move by editing the vertices.
  const IRIS_R = 0.58, SEG = 32;
  const irisTex = paintTex(THREE, 256, 256, (g, w) => {
    g.fillStyle = '#3f7fbf'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      g.strokeStyle = i % 2 ? '#2a5f99' : '#6aa8de'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w / 2 + Math.cos(a) * w, w / 2 + Math.sin(a) * w); g.stroke();
    }
  });
  const irisGeo = new THREE.RingGeometry(0.2, IRIS_R, SEG, 1);
  const iris = kit.mesh(irisGeo, kit.mat(0xffffff, { map: irisTex, side: THREE.DoubleSide }), [0, yHole - 0.06, 0], eye);
  iris.rotation.x = -Math.PI / 2;
  iris.castShadow = false;
  const pupilDisc = kit.mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }), [0, yHole - 0.09, 0], eye);
  pupilDisc.rotation.x = -Math.PI / 2;
  pupilDisc.castShadow = false;
  function setPupil(r) {
    const p = irisGeo.attributes.position, uv = irisGeo.attributes.uv;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2, x = Math.cos(a) * r, y = Math.sin(a) * r;
      p.setXY(i, x, y); uv.setXY(i, (x / IRIS_R + 1) / 2, (y / IRIS_R + 1) / 2);
    }
    p.needsUpdate = true; uv.needsUpdate = true;
    pupilDisc.scale.setScalar(r);
  }
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 12), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.75, roughness: 0.1 }));
  lens.scale.set(1, 0.45, 1);
  lens.position.y = yHole - 0.28;
  eye.add(lens);
  const L = V(E[0] - lens.position.y, E[1], 0);   // lens centre in the world

  // Optic nerve and hearing nerve: tubes to the brain, with glowing signal dots.
  const nerveMat = kit.mat(0xf2c94c, { emissive: 0x000000 });
  const opticCurve = new THREE.QuadraticBezierCurve3(V(E[0] + R * 0.92, E[1] - 0.15, -0.05), V(2.9, 2.3, -0.05), V(B[0] - 0.75, B[1] - 0.15, 0));
  const hearCurve = new THREE.QuadraticBezierCurve3(V(8.2, 2.05, -0.05), V(7.1, 2.4, -0.05), V(B[0] + 0.75, B[1] - 0.15, 0));
  kit.mesh(new THREE.TubeGeometry(opticCurve, 24, 0.09, 8), nerveMat, [0, 0, 0], scene);
  const hearMat = kit.mat(0xf2c94c, { emissive: 0x000000 });
  kit.mesh(new THREE.TubeGeometry(hearCurve, 24, 0.07, 8), hearMat, [0, 0, 0], scene);
  const sigMat = new THREE.MeshBasicMaterial({ color: 0xfff27a });
  const sigGeo = new THREE.SphereGeometry(0.12, 12, 8);
  const signals = [];
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(sigGeo, sigMat); m.visible = false; scene.add(m); signals.push(m); }

  // ---------- Brain ----------
  const brain = new THREE.Group();
  brain.position.set(...B);
  scene.add(brain);
  stand(B[0], B[1] - 0.55);
  const gyri = paintTex(THREE, 256, 128, (g, w, h) => {
    g.fillStyle = '#f4a6b6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d27088'; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      let x = rnd(i) * w, y = rnd(i + 40) * h;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (rnd(i * 7 + k) - 0.5) * 40; y += (rnd(i * 11 + k) - 0.5) * 30; g.lineTo(x, y); }
      g.stroke();
    }
  });
  const brainMat = kit.mat(0xffffff, { map: gyri, emissive: 0x000000 });
  kit.mesh(new THREE.SphereGeometry(0.62, 24, 16), brainMat, [0, 0, 0], brain).scale.set(1.3, 0.85, 0.9);
  kit.mesh(new THREE.SphereGeometry(0.27, 16, 10), kit.mat(0xe98ea2), [0.55, -0.42, 0], brain).scale.set(1.3, 0.75, 1);
  kit.mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.4, 10), kit.mat(0xe98ea2), [0.25, -0.6, 0], brain);
  // Thought bubble above the brain: what the brain "sees" or "hears".
  const bubble = new THREE.Group();
  bubble.position.set(B[0] - 0.2, B[1] + 1.55, 0.2);
  scene.add(bubble);
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
  bubble.add(new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), bubbleMat));
  [[0.1, -0.78, 0.12], [0.2, -0.98, 0.08]].forEach(([x, y, r]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), bubbleMat); m.position.set(x, y, 0); bubble.add(m); });
  const thinkTree = buildTree(THREE, kit, 0.24);
  thinkTree.position.set(0, -0.45, 0.05);
  bubble.add(thinkTree);
  const note = new THREE.Group();
  note.position.set(0, -0.05, 0.05);
  bubble.add(note);
  const noteMat = new THREE.MeshBasicMaterial({ color: 0x3a3a8a });
  const noteHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), noteMat); noteHead.scale.set(1.3, 0.9, 0.5); noteHead.position.set(-0.1, -0.22, 0); note.add(noteHead);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.03), noteMat); stem.position.set(0.05, 0.02, 0); note.add(stem);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.03), noteMat); flag.position.set(0.13, 0.22, 0); flag.rotation.z = -0.6; note.add(flag);
  bubble.visible = false;

  // ---------- Light rays from the tree into the eye ----------
  const rayTop = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9 });
  const rayLow = new THREE.MeshBasicMaterial({ color: 0xff8c42, transparent: true, opacity: 0.9 });
  const retinaHit = s => { // where the straight line from s through the lens centre meets the retina
    const d = V(0, 0, 0).subVectors(L, s).normalize(), oc = V(0, 0, 0).subVectors(L, V(...E));
    const b = oc.dot(d), c = oc.lengthSq() - (R * 0.93) ** 2;
    return L.clone().addScaledVector(d, -b + Math.sqrt(b * b - c));
  };
  const imgTop = retinaHit(treeTop), imgBase = retinaHit(treeBase);
  const lensFront = L.x - 0.12;
  const paths = [];
  for (const [s, img, mtl] of [[treeTop, imgTop, rayTop], [treeBase, imgBase, rayLow]]) {
    for (const dy of [0.16, -0.16]) {
      const a = V(lensFront, L.y + dy, 0);
      paths.push({ s, a, img, out: rod(s, a, 0.02, mtl), inn: rod(a, img, 0.016, mtl), len1: s.distanceTo(a), len2: a.distanceTo(img) });
    }
  }
  // The upside-down picture on the retina: a tiny tree between the two image points.
  const imgTree = new THREE.Group();
  const imgInner = buildTree(THREE, kit, imgTop.distanceTo(imgBase) / 3.9);
  imgInner.rotation.z = Math.PI;
  imgTree.add(imgInner);
  imgTree.position.copy(imgBase).add(V(-0.12, 0, 0.05));
  imgTree.scale.set(0.3, 1, 0.6);   // flattened against the back of the eye
  scene.add(imgTree);
  // Sunlight hitting the tree.
  const sunRayEnds = [V(-8.9, 3.3, 0.3), V(-8.0, 2.9, 0.4), V(-8.6, 2.4, 0.5)];
  const sunRays = sunRayEnds.map(p => rod(sunPos, p, 0.03, rayTop));
  // Light dots travelling along the rays.
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xfffbe0 });
  const dots = [];
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), dotMat); m.visible = false; scene.add(m); dots.push(m); }
  // Parallel rays toward the pupil (step 2): the ones inside the pupil get in, the rest stop at the iris.
  const beams = [];
  for (let i = 0; i < 14; i++) {
    const r = 0.06 + (i % 7) * 0.075, a = i * 2.4;
    const y = E[1] + Math.cos(a) * r, z = Math.sin(a) * r;
    beams.push({ r, out: rod(V(-4.5, y, z), V(E[0] - yHole + 0.06, y, z), 0.012, rayTop), inn: rod(V(E[0] - yHole + 0.06, y, z), V(-0.4, y, z), 0.012, rayTop) });
  }

  // ---------- The ear (cut open so we can see inside) ----------
  const skinMat = kit.mat(0xe8a990, { side: THREE.DoubleSide });
  stand(9.85, AY - 0.17);
  const canal = kit.mesh(new THREE.CylinderGeometry(0.17, 0.17, EAR_MOUTH - 0.6 - DRUM_X, 16, 1, true, Math.PI / 2, Math.PI), skinMat, [(EAR_MOUTH - 0.6 + DRUM_X) / 2, AY, 0], scene);
  canal.rotation.z = Math.PI / 2;
  const funnel = kit.mesh(new THREE.CylinderGeometry(0.17, 0.6, 0.6, 20, 1, true, Math.PI / 2, Math.PI), skinMat, [EAR_MOUTH - 0.3, AY, 0], scene);
  funnel.rotation.z = Math.PI / 2;
  const rimEar = kit.mesh(new THREE.TorusGeometry(0.6, 0.1, 8, 28), kit.mat(0xe8a990), [EAR_MOUTH, AY + 0.15, 0], scene);
  rimEar.rotation.y = Math.PI / 2; rimEar.scale.set(1, 1.4, 1);
  const lobe = kit.mesh(new THREE.SphereGeometry(0.16, 12, 8), kit.mat(0xe8a990), [EAR_MOUTH, AY - 0.62, 0], scene);
  lobe.scale.set(0.5, 1, 1);
  const drumMat = new THREE.MeshStandardMaterial({ color: 0xf5b7b1, emissive: 0x000000, side: THREE.DoubleSide, roughness: 0.4 });
  const eardrum = kit.mesh(new THREE.CircleGeometry(0.19, 20), drumMat, [DRUM_X, AY, 0], scene);
  eardrum.rotation.y = Math.PI / 2;
  const boneMat = kit.mat(0xf3e9d2, { emissive: 0x000000 });
  const bones = new THREE.Group();
  scene.add(bones);
  const boneA = rodInto(bones, V(9.06, 2.28, 0), V(8.92, 2.5, 0), 0.04, boneMat);
  const boneB = rodInto(bones, V(8.92, 2.5, 0), V(8.77, 2.36, 0), 0.035, boneMat);
  const stirrup = kit.mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12, Math.PI), boneMat, [8.7, 2.3, 0], bones);
  stirrup.rotation.z = Math.PI / 2;
  const cochMat = kit.mat(0xf0a0c0, { emissive: 0x000000 });
  const spiral = [];
  const turns = 2.6, amax = turns * Math.PI * 2;
  for (let i = 0; i <= 50; i++) {
    const a = (i / 50) * amax, r = 0.36 * (1 - 0.78 * (a / amax));
    spiral.push(V(8.2 + Math.cos(a) * r, 2.05 + Math.sin(a) * r, -0.05 + 0.12 * (a / amax)));
  }
  kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral), 80, 0.07, 8), cochMat, [0, 0, 0], scene);
  kit.mesh(new THREE.SphereGeometry(0.1, 12, 8), cochMat, [8.6, 2.2, -0.02], scene);
  // Drum and stick; sound rings spread out from the drum.
  const drum = new THREE.Group();
  drum.position.set(...DRUM);
  scene.add(drum);
  kit.mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.55, 24, 1, true), kit.mat(0xe63946, { side: THREE.DoubleSide }), [0, 0, 0], drum);
  const drumSkin = kit.mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.03, 24), kit.mat(0xf8f1e5), [0, 0.28, 0], drum);
  kit.mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.03, 24), kit.mat(0xf8f1e5), [0, -0.28, 0], drum);
  for (let i = 0; i < 3; i++) kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, DRUM[1] - 0.28, 6), kit.mat(0x6b4226), [Math.cos(i * 2.1) * 0.4, -(DRUM[1] - 0.28) / 2 - 0.28, Math.sin(i * 2.1) * 0.4], drum);
  const stick = new THREE.Group();
  stick.position.set(0.9, 0.55, 0);
  drum.add(stick);
  const stickRod = kit.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), kit.mat(0xc98f55), [-0.45, 0, 0], stick);
  stickRod.rotation.z = Math.PI / 2;
  kit.mesh(new THREE.SphereGeometry(0.07, 10, 8), kit.mat(0xf8f1e5), [-0.9, 0, 0], stick);
  const ringMat = [];
  const rings = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.MeshBasicMaterial({ color: 0x5b4bd6, transparent: true, opacity: 0, depthWrite: false });
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 4, 28, 1.7), m);
    r.rotation.z = Math.PI - 0.85;
    r.position.set(DRUM[0], DRUM[1] + 0.3, 0);
    r.visible = false; r.age = -1;
    scene.add(r); rings.push(r); ringMat.push(m);
  }
  let ringNext = 0;
  const spawnRing = () => { const r = rings[ringNext++ % rings.length]; r.age = 0; r.visible = true; };

  // ---------- Labels ----------
  const tags = {
    sun: label('Sun', sun, { cls: 'warm' }),
    tree: label('Tree', V(TREE[0] + 0.9, 3.4, 0)),
    eye: label('Eye', V(E[0], E[1] + R + 0.1, 0)),
    iris: label('Iris', at(eye, 0.5, yHole, 0)),
    pupil: label('Pupil', at(eye, 0, yHole, 0)),
    cornea: label('Cornea', at(eye, -0.42, yHole + 0.18, 0.35)),
    lens: label('Lens', V(L.x, L.y + 0.42, 0)),
    retina: label('Retina', V(E[0] + 0.95, E[1] + 0.9, 0)),
    image: label('Upside-down picture', V(imgTop.x - 0.05, imgTop.y - 0.18, 0), { cls: 'warm' }),
    optic: label('Optic nerve', opticCurve.getPoint(0.5)),
    brain: label('Brain', V(B[0] - 0.55, B[1] - 0.55, 0.4)),
    outer: label('Outer ear', V(EAR_MOUTH + 0.1, AY + 1.05, 0)),
    canal: label('Ear canal', V(10.2, AY - 0.5, 0)),
    eardrum: label('Eardrum', V(DRUM_X, AY + 0.25, 0), { cls: 'warm' }),
    drum: label('Drum', V(DRUM[0], DRUM[1] + 0.45, 0)),
    bones: label('Tiny bones', V(9.25, 2.6, 0)),
    cochlea: label('Cochlea', V(8.2, 1.45, 0)),
    hearing: label('Hearing nerve', hearCurve.getPoint(0.45).add(V(0, 0.25, 0))),
  };
  const showTags = names => { for (const [n, l] of Object.entries(tags)) l.show(names.includes(n)); for (const s of SENSES) s.tag.show(false); };

  const st = { step: 0, quiz: false, time: 0, light: 1, lightTo: 1, pupil: 0.2, sense: -1, auto: false, rays: false, beams: false, sunRays: false, dotsOn: false, sig: -1, sigKind: '', beat: -9, beatEvery: 0, loud: 0.6, drumA: 0, plan: [] };

  function pickSense(j) {
    st.sense = j;
    SENSES.forEach((s, k) => { s.tag.show(k === j); for (const p of s.parts) p.scale.copy(p.userData.s0); });
  }
  function setLight(v) {
    st.lightTo = v;
    const msg = v > 0.6 ? 'Lots of light bounces off the tree into the eye. You see the tree clearly.'
      : v > 0.15 ? 'Only a little light reaches the eye. The tree is hard to see.'
        : 'No light comes from the tree, so nothing reaches the eye. You cannot see the tree.';
    if (st.step === 1) ui.readout(msg);
    if (st.step === 2) ui.readout(v > 0.6 ? 'Bright light: the iris makes the pupil <b>small</b>, so not too much light gets in.' : v > 0.25 ? 'The pupil is <b>medium</b> sized.' : 'Dim light: the iris opens the pupil <b>wide</b> to let in as much light as it can.');
  }
  const sendSignal = kind => { st.sig = 0; st.sigKind = kind; };

  const views = {
    head: { radius: 1.25, yaw: 0.25, pitch: 0.12, target: [HEAD[0] + 0.15, 1.35, 0] },
    seeing: { radius: 5.6, yaw: 0, pitch: 0.12, target: [-4.3, 2.8, 0] },
    front: { radius: 0.95, yaw: -1.15, pitch: 0.12, target: [E[0] - 1.35, E[1], 0] },
    inside: { radius: 1.75, yaw: 0, pitch: 0.06, target: [E[0] - 0.25, E[1], 0] },
    toBrain: { radius: 3.3, yaw: 0, pitch: 0.1, target: [2.6, 3.2, 0] },
    ear: { radius: 3.3, yaw: 0.1, pitch: 0.12, target: [11.4, 2.2, 0] },
    earBrain: { radius: 3.8, yaw: 0, pitch: 0.1, target: [8.0, 2.9, 0] },
    all: { radius: 11, yaw: 0, pitch: 0.18, target: [1.5, 2.6, 0] },
  };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, chain: -1, auto: false, rays: false, beams: false, sunRays: false, dotsOn: false, sig: -1, beatEvery: 0, beat: -9, plan: [] });
      st.light = st.lightTo = 1;
      pickSense(-1);
      bubble.visible = false;
      pupilDisc.visible = i <= 2 || isQuiz;
      imgTree.visible = i === 3 || i === 4;
      if (i === 0) {
        go(views.head); showTags([]);
        st.auto = true; pickSense(0);
        ui.buttons(SENSES.map((s, j) => ({ label: s.btn, on: j === 0, onClick: () => { st.auto = false; pickSense(j); } })));
      }
      if (i === 1) {
        go(views.seeing); showTags(['sun', 'tree', 'eye']);
        st.rays = st.sunRays = st.dotsOn = true;
        ui.slider({ label: 'Light', min: 0, max: 100, step: 1, value: 100, unit: '%', onInput: v => setLight(v / 100) });
        setLight(1);
      }
      if (i === 2) {
        go(views.front); showTags(['iris', 'pupil', 'cornea']);
        st.beams = true;
        st.lightTo = st.light = 0.15; st.auto = true; st.plan = [];
        const sl = ui.slider({ label: 'Brightness', min: 0, max: 100, step: 1, value: 15, unit: '%', onInput: v => { st.auto = false; setLight(v / 100); } });
        st.slider = sl;
        setLight(0.15);
      }
      if (i === 3) {
        go(views.inside); showTags(['lens', 'retina', 'image']);
        st.rays = st.dotsOn = true; st.lightTo = st.light = 0.75;
        ui.toggle({ label: 'Show the light rays', value: true, onChange: v => { st.rays = st.dotsOn = v; } });
      }
      if (i === 4) {
        go(views.toBrain); showTags(['optic', 'brain']);
        st.auto = true; st.plan = [[0.3, () => sendSignal('see')]];
        ui.buttons([{ label: 'Send to the brain', onClick: () => { st.auto = false; sendSignal('see'); } }]);
      }
      if (i === 5) {
        go(views.ear); showTags(['outer', 'canal', 'eardrum', 'drum']);
        st.beatEvery = 1.1; st.beat = -0.9;
        ui.slider({ label: 'Loudness', min: 0, max: 100, step: 1, value: 60, format: v => (v < 25 ? 'quiet' : v < 70 ? 'medium' : 'loud'), onInput: v => { st.loud = v / 100; } });
        st.loud = 0.6;
      }
      if (i === 6) {
        go(views.earBrain); showTags(['bones', 'cochlea', 'hearing', 'brain']);
        st.loud = 0.8; st.auto = true; st.plan = [[0.15, () => beat()]];
        ui.buttons([{ label: 'Beat the drum', onClick: () => { st.auto = false; beat(); } }]);
      }
      if (isQuiz) { go(views.all); showTags(['eye', 'brain', 'outer']); st.beatEvery = 2; st.loud = 0.5; }
    },

    update(dt, t) {
      dt = Math.max(0, dt); // the first frame after loading can report a tiny negative step
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      // Head: the chosen sense organ pulses; bits drift toward it.
      if (st.step === 0 && !st.quiz && SENSES[st.sense]) {
        if (st.auto) { const j = Math.floor(Math.max(0, st.time) / 3) % SENSES.length; if (j !== st.sense) pickSense(j); }
        const s = SENSES[st.sense];
        const k = 1 + 0.15 * Math.sin(st.time * 6);
        for (const p of s.parts) p.scale.copy(p.userData.s0).multiplyScalar(k);
        const target = s.parts[0].position;
        bits.forEach((b, j) => {
          const u = (st.time * 0.6 + j / bits.length) % 1;
          b.visible = st.sense === 1 || st.sense === 2;
          b.position.set(target.x + (st.sense === 1 ? -0.9 : 0.4) * (1 - u) + Math.sin(j * 2) * 0.05 * (1 - u), target.y + 0.15 * (1 - u) * Math.cos(j * 3), target.z + (st.sense === 2 ? 0.8 : 0.1) * (1 - u));
        });
        bitMat.color.setHex(st.sense === 1 ? 0x5b4bd6 : 0x9ad57a);
        pupils.forEach((p, j) => { p.position.x = (j ? 0.17 : -0.17) + (st.sense === 0 ? Math.sin(st.time * 1.5) * 0.03 : 0); });
        fingers.forEach((f, j) => { f.rotation.x = st.sense === 4 ? Math.max(0, Math.sin(st.time * 5 + j)) * 0.5 : 0; });
      } else bits.forEach(b => { b.visible = false; });

      // Light level: sky, sun and lamps follow it.
      if (st.step === 2 && st.auto) {
        // Brightness swings slowly between dim and bright until the learner moves the slider.
        const v = 0.5 - 0.5 * Math.cos(Math.max(0, st.time - 1) * 0.6);
        const val = Math.round(15 + v * 85);
        if (Math.abs(val / 100 - st.lightTo) > 0.04) { setLight(val / 100); st.slider?.set(val); }
      }
      follow(st, 'light', st.lightTo, dt, 4);
      const Lv = st.light;
      const dim = st.step === 2 ? 0.55 + 0.45 * Lv : Lv;
      hemi.intensity = 0.25 + 1.35 * dim;
      sunLight.intensity = 2.2 * dim;
      scene.background = bg.copy(night).lerp(sky, dim);
      ground.material.color.setHex(0xcfe5bf).multiplyScalar(0.35 + 0.65 * dim);
      sunMat.color.setHex(0xffd34d).multiplyScalar(0.25 + 0.75 * Lv);
      glowMat.opacity = 0.3 * Lv;
      follow(st, 'pupil', lerp(0.36, 0.11, Lv), dt, 3);
      setPupil(st.pupil);

      // Rays from the tree (and the Sun) to the eye, with light dots moving along them.
      const rayOn = st.rays && Lv > 0.02;
      rayTop.opacity = rayLow.opacity = 0.85 * Math.min(1, Lv * 1.3);
      for (const p of paths) { p.out.visible = rayOn; p.inn.visible = rayOn && st.step === 3; }
      sunRays.forEach(r => { r.visible = st.sunRays && Lv > 0.02; });
      dots.forEach((d, j) => {
        d.visible = st.dotsOn && Lv > 0.02;
        if (!d.visible) return;
        const u = (st.time * 0.35 + j / dots.length) % 1;
        if (st.step === 1 && j < 3) { d.position.lerpVectors(sunPos, sunRayEnds[j], u); return; }
        const p = paths[j % 4], total = p.len1 + p.len2, s = u * total;
        if (s < p.len1) d.position.lerpVectors(p.s, p.a, s / p.len1);
        else if (st.step === 3) d.position.lerpVectors(p.a, p.img, (s - p.len1) / p.len2);
        else d.position.copy(p.a);
      });
      for (const b of beams) {
        b.out.visible = st.beams; b.inn.visible = st.beams && b.r < st.pupil - 0.01;
      }
      rayTop.opacity = st.beams ? 0.25 + 0.65 * Lv : rayTop.opacity;

      // Signals along a nerve to the brain, then the thought bubble.
      signals.forEach(s => { s.visible = false; });
      brainMat.emissive.setRGB(0, 0, 0); nerveMat.emissive.setRGB(0, 0, 0); hearMat.emissive.setRGB(0, 0, 0);
      if (st.sig >= 0) {
        st.sig += dt;
        const curve = st.sigKind === 'see' ? opticCurve : hearCurve, nm = st.sigKind === 'see' ? nerveMat : hearMat;
        for (let j = 0; j < signals.length; j++) {
          const u = (st.sig - j * 0.15) / 1.1;
          if (u > 0 && u < 1) { signals[j].visible = true; curve.getPointAt(u, signals[j].position); }
        }
        if (st.sig < 1.6) nm.emissive.setRGB(0.35, 0.25, 0);
        const glow = clamp((st.sig - 1.1) * 3, 0, 1) * clamp((3.4 - st.sig) * 2, 0, 1);
        brainMat.emissive.setRGB(0.45 * glow, 0.2 * glow, 0.25 * glow);
        bubble.visible = st.sig > 1.3 && st.sig < 4.2;
        thinkTree.visible = st.sigKind === 'see'; note.visible = st.sigKind === 'hear';
        if (st.sig > 4.4) {
          st.sig = -1;
          if (st.auto && st.step === 4) st.plan.push([st.time + 0.6, () => sendSignal('see')]);
        }
      }

      // Drum: hits make sound rings; when they reach the ear the eardrum shakes.
      if (st.beatEvery && st.time - st.beat >= st.beatEvery) beat();
      if (st.step === 6 && st.auto && st.time - st.beat > 5.2) beat();
      const sinceBeat = st.time - st.beat;
      stick.rotation.z = 0.3 - 0.7 * Math.min(1, Math.max(0, sinceBeat) / 0.3); // down on the hit, then back up
      drumSkin.position.y = 0.28 + (sinceBeat < 0.3 ? Math.sin(sinceBeat * 60) * 0.02 * (1 - sinceBeat / 0.3) * st.loud : 0);
      for (let j = 0; j < rings.length; j++) {
        const r = rings[j];
        if (r.age < 0) continue;
        r.age += dt;
        const rad = 0.5 + r.age * 2.6;
        if (rad > DRUM[0] - EAR_MOUTH + 0.2 && !r.hit) { r.hit = true; st.drumA = Math.max(st.drumA, st.loud); if (st.step === 6 || st.quiz) st.chain = 0; }
        if (rad > 5.2) { r.age = -1; r.visible = false; r.hit = false; continue; }
        r.scale.set(rad, rad, 1);
        ringMat[j].opacity = (0.25 + 0.75 * st.loud) * clamp(1.2 - rad / 5.2, 0, 1);
      }
      st.drumA = Math.max(0, st.drumA - dt * 1.4);
      const shake = Math.sin(t * 38) * st.drumA;
      eardrum.position.x = DRUM_X + shake * 0.05;
      drumMat.emissive.setRGB(st.drumA * 0.4, st.drumA * 0.1, 0);
      bones.position.x = shake * 0.035;
      boneMat.emissive.setRGB(st.drumA * 0.35, st.drumA * 0.25, 0);
      // Inner ear chain (step 6): cochlea glows, then signals run to the brain.
      cochMat.emissive.setRGB(0, 0, 0);
      if (st.chain != null && st.chain >= 0) {
        st.chain += dt;
        const g = clamp(st.chain * 3, 0, 1) * clamp((1.4 - st.chain) * 2, 0, 1);
        cochMat.emissive.setRGB(0.5 * g, 0.15 * g, 0.3 * g);
        if (st.chain > 0.5 && st.sig < 0 && st.step === 6) sendSignal('hear');
        if (st.chain > 1.5) st.chain = -1;
      }
      boneA.rotation.z = boneA.userData.rz + shake * 0.1; boneB.rotation.z = boneB.userData.rz - shake * 0.1;
      return true;
    },
  };

  function beat() { st.beat = st.time; spawnRing(); st.plan.push([st.time + 0.18, spawnRing]); }

  function rodInto(parent, a, b, r, material) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, a.distanceTo(b), 2, 6), material);
    m.position.addVectors(a, b).multiplyScalar(0.5);
    m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
    m.userData.rz = m.rotation.z;
    m.castShadow = true;
    parent.add(m);
    return m;
  }
}

function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function paintTex(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A simple tree about 3.9 * s tall, base at y = 0.
function buildTree(THREE, kit, s) {
  const g = new THREE.Group();
  kit.mesh(new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 1.6 * s, 8), kit.mat(0x8b5a2b), [0, 0.8 * s, 0], g);
  const leaf = kit.mat(0x4caf50, { flatShading: true });
  kit.mesh(new THREE.IcosahedronGeometry(1.15 * s, 1), leaf, [0, 2.6 * s, 0], g);
  kit.mesh(new THREE.IcosahedronGeometry(0.75 * s, 1), leaf, [0.75 * s, 2.25 * s, 0.1 * s], g);
  kit.mesh(new THREE.IcosahedronGeometry(0.7 * s, 1), leaf, [-0.72 * s, 2.3 * s, -0.1 * s], g);
  const apple = kit.mat(0xe63946);
  [[0.5, 2.9, 0.9], [-0.4, 2.3, 0.85], [0.2, 2.0, 1.0]].forEach(([x, y, z]) => kit.mesh(new THREE.SphereGeometry(0.11 * s, 8, 6), apple, [x * s, y * s, z * s], g));
  return g;
}
