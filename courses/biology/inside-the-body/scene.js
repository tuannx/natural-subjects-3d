// Inside the body: a friendly see-through child. Buttons show one body system at a time: bones,
// muscles, heart and blood vessels, lungs, the digestive tract, brain and nerves. The arm bends with
// the biceps bulging, the heart beats faster when the child exercises, the lungs fill and empty, an
// apple travels through the gut, and a message runs from the eyes to the brain and down to the hand.
const SKIN = 0xffc9a8, BONE = 0xf3ead8, BONE_HI = 0xffc93c, MUSCLE = 0xe8736c;
const SYS = ['bones', 'muscles', 'heart', 'lungs', 'gut', 'brain'];
const SYS_NAME = { bones: 'Bones', muscles: 'Muscles', heart: 'Heart and blood', lungs: 'Lungs', gut: 'Stomach and gut', brain: 'Brain and nerves' };
const SYS_BTN = { bones: 'Bones', muscles: 'Muscles', heart: 'Heart', lungs: 'Lungs', gut: 'Stomach', brain: 'Brain' };
const SYS_JOB = {
  bones: 'Your <b>bones</b> hold you up and protect soft parts inside.',
  muscles: 'Your <b>muscles</b> pull on bones to move you.',
  heart: 'Your <b>heart</b> pumps blood all around your body.',
  lungs: 'Your <b>lungs</b> take in air with the oxygen your body needs.',
  gut: 'Your <b>stomach and intestines</b> break food down.',
  brain: 'Your <b>brain</b> controls everything, through your <b>nerves</b>.',
};
const BEAT_REST = 85, BEAT_RUN = 140;   // beats a minute in the animation (a child at rest: about 70 to 100)
const BREATH_REST = 20, BREATH_RUN = 40; // breaths a minute in the animation
const GUT = [
  { name: 'Food pipe', dur: 1.2, msg: 'You chew and swallow. The <b>food pipe</b> squeezes the food down to the stomach.' },
  { name: 'Stomach', dur: 2.2, msg: 'The <b>stomach</b> squeezes and mixes the food with juices, until it is a soft mush.' },
  { name: 'Small intestine', dur: 3.2, msg: 'In the long, coiled <b>small intestine</b>, the useful parts of food (nutrients) pass into the blood.' },
  { name: 'Large intestine', dur: 2.2, msg: 'The <b>large intestine</b> takes back water. What is left leaves the body as waste when you go to the toilet.' },
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xeedfc2, sky: 0xe6f4ff, radius: 10 });
  kit.lights(scene, { sun: [3, 8, 6], shadows: false });
  const { clamp, lerp } = kit;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const tmp = V(), tmp2 = V();
  const st = { step: 0, time: 0, quiz: false, auto: true, msg: '', ex: 0, exOn: false, beat: 0, breath: 0, bend: 0 };
  const say = html => { if (html !== st.msg) { st.msg = html; ui.readout(html); } };
  const parts = Object.fromEntries(SYS.map(s => [s, []]));   // every object of a system, to show or hide it together
  const add = (sys, o) => { parts[sys].push(o); return o; };
  const solid = (c, o) => kit.mat(c, { roughness: 0.55, ...o });
  const put = (sys, geo, mat, pos, parent) => { const m = kit.mesh(geo, mat, pos, parent); m.castShadow = m.receiveShadow = false; return add(sys, m); };

  // ---------- the child: a root that can bob, with jointed arms and legs ----------
  const kid = new THREE.Group(); scene.add(kid);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ color: 0x8a7a60, transparent: true, opacity: 0.22, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.005; scene.add(blob);
  const skin = new THREE.MeshStandardMaterial({ color: SKIN, transparent: true, opacity: 0.26, roughness: 0.5, depthWrite: false });
  const shells = [];
  const shell = (geo, pos, parent, scale) => { const m = new THREE.Mesh(geo, skin); m.position.set(...pos); if (scale) m.scale.set(...scale); m.renderOrder = 2; parent.add(m); shells.push(m); return m; };
  shell(new THREE.SphereGeometry(0.32, 32, 20), [0, 2.62, 0], kid);
  shell(new THREE.CylinderGeometry(0.1, 0.11, 0.2, 16), [0, 2.27, 0], kid);
  shell(new THREE.CapsuleGeometry(0.36, 0.55, 8, 24), [0, 1.72, 0], kid, [1.08, 1, 0.62]);
  // A friendly face and hair, drawn on the outside.
  const faceMat = solid(0x3b2a20);
  for (const s of [-1, 1]) { kit.mesh(new THREE.SphereGeometry(0.035, 12, 8), faceMat, [s * 0.11, 2.68, 0.29], kid).castShadow = false; kit.mesh(new THREE.SphereGeometry(0.045, 10, 6), solid(0xff9e9e, { transparent: true, opacity: 0.7 }), [s * 0.19, 2.56, 0.25], kid).scale.set(1, 0.6, 0.4); }
  const smile = kit.mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16, Math.PI), faceMat, [0, 2.55, 0.29], kid); smile.rotation.z = Math.PI; smile.castShadow = false;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.335, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: 0x5a3a22, transparent: true, opacity: 0.55, depthWrite: false }));
  hair.position.set(0, 2.63, -0.02); hair.rotation.x = -0.25; hair.renderOrder = 3; kid.add(hair);

  const limbs = {};
  for (const s of [-1, 1]) {   // s = -1: the child's right side (screen left), +1: left side
    const shoulder = new THREE.Group(); shoulder.position.set(s * 0.47, 2.15, 0); kid.add(shoulder);
    const elbow = new THREE.Group(); elbow.position.y = -0.55; shoulder.add(elbow);
    shell(new THREE.CapsuleGeometry(0.09, 0.45, 6, 14), [0, -0.275, 0], shoulder);
    shell(new THREE.CapsuleGeometry(0.08, 0.4, 6, 14), [0, -0.25, 0], elbow);
    shell(new THREE.SphereGeometry(0.085, 14, 10), [0, -0.56, 0], elbow, [0.8, 1, 0.55]);
    const hip = new THREE.Group(); hip.position.set(s * 0.17, 1.12, 0); kid.add(hip);
    const knee = new THREE.Group(); knee.position.y = -0.58; hip.add(knee);
    shell(new THREE.CapsuleGeometry(0.13, 0.4, 6, 14), [0, -0.29, 0], hip);
    shell(new THREE.CapsuleGeometry(0.1, 0.38, 6, 14), [0, -0.26, 0], knee);
    shell(new THREE.BoxGeometry(0.17, 0.08, 0.3), [0, -0.5, 0.06], knee);
    limbs[s] = { shoulder, elbow, hip, knee };
  }
  const R = limbs[-1], L = limbs[1];

  // ---------- bones ----------
  const boneMat = solid(BONE), boneHi = solid(BONE_HI, { emissive: 0x5a3c00 }), socket = solid(0xcfc2a8);
  const groups = { skull: [], ribs: [], spine: [], legs: [] };
  const bone = (geo, pos, parent, grp, scale) => { const m = put('bones', geo, boneMat, pos, parent); if (scale) m.scale.set(...scale); if (grp) groups[grp].push(m); return m; };
  bone(new THREE.SphereGeometry(0.25, 24, 16), [0, 2.67, -0.02], kid, 'skull', [0.95, 0.95, 1.05]);
  bone(new THREE.SphereGeometry(0.17, 18, 12), [0, 2.55, 0.08], kid, 'skull', [1, 1, 0.9]);
  bone(new THREE.SphereGeometry(0.11, 14, 10), [0, 2.42, 0.1], kid, 'skull', [1.1, 0.55, 0.9]);
  for (const s of [-1, 1]) put('bones', new THREE.SphereGeometry(0.045, 10, 8), socket, [s * 0.08, 2.6, 0.21], kid);
  for (let k = 0; k < 16; k++) bone(new THREE.CylinderGeometry(0.035, 0.035, 0.055, 10), [0, 1.13 + k * 0.077, -0.13 + Math.sin(k * 0.4) * 0.02], kid, 'spine');
  [0.27, 0.3, 0.32, 0.32, 0.3, 0.27].forEach((r, k) => {
    const rib = bone(new THREE.TorusGeometry(r, 0.016, 5, 20, Math.PI), [0, 2.1 - k * 0.085, -0.11], kid, 'ribs', [1, 0.95, 1]);
    rib.rotation.x = Math.PI / 2 + 0.25;
  });
  bone(new THREE.BoxGeometry(0.05, 0.36, 0.03), [0, 1.93, 0.18], kid, 'ribs');
  for (const s of [-1, 1]) { const c = bone(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6), [s * 0.22, 2.2, 0.05], kid); c.rotation.z = s * 1.45; }
  const pelvis = bone(new THREE.TorusGeometry(0.17, 0.05, 8, 20), [0, 1.13, -0.02], kid, null, [1.2, 1, 0.8]); pelvis.rotation.x = Math.PI / 2 - 0.3;
  for (const s of [-1, 1]) {
    const { shoulder, elbow, hip, knee } = limbs[s];
    bone(new THREE.SphereGeometry(0.045, 10, 8), [0, 0, 0], shoulder);
    bone(new THREE.CylinderGeometry(0.028, 0.03, 0.5, 8), [0, -0.27, 0], shoulder);
    bone(new THREE.SphereGeometry(0.035, 10, 8), [0, 0, 0], elbow);
    for (const x of [-0.022, 0.022]) bone(new THREE.CylinderGeometry(0.016, 0.018, 0.46, 6), [x, -0.25, 0], elbow);
    bone(new THREE.BoxGeometry(0.08, 0.1, 0.03), [0, -0.55, 0], elbow);
    bone(new THREE.SphereGeometry(0.05, 10, 8), [0, 0, 0], hip, 'legs');
    bone(new THREE.CylinderGeometry(0.038, 0.04, 0.55, 8), [0, -0.29, 0], hip, 'legs');
    bone(new THREE.SphereGeometry(0.04, 10, 8), [0, 0, 0.04], knee, 'legs');
    bone(new THREE.CylinderGeometry(0.03, 0.034, 0.46, 8), [0, -0.26, 0], knee, 'legs');
    bone(new THREE.BoxGeometry(0.1, 0.04, 0.22), [0, -0.51, 0.06], knee, 'legs');
  }

  // ---------- muscles ----------
  const muscleMat = solid(MUSCLE, { roughness: 0.6 });
  const muscle = (geo, pos, parent, scale) => { const m = put('muscles', geo, muscleMat, pos, parent); m.scale.set(...scale); return m; };
  const blobGeo = new THREE.SphereGeometry(1, 16, 12);
  const biceps = {}, triceps = {};
  for (const s of [-1, 1]) {
    const { shoulder, elbow, hip, knee } = limbs[s];
    muscle(blobGeo, [0, -0.04, 0], shoulder, [0.085, 0.1, 0.085]);
    biceps[s] = muscle(blobGeo, [0, -0.27, 0.035], shoulder, [0.055, 0.17, 0.055]);
    triceps[s] = muscle(blobGeo, [0, -0.27, -0.035], shoulder, [0.05, 0.19, 0.05]);
    muscle(blobGeo, [0, -0.17, 0], elbow, [0.05, 0.15, 0.05]);
    muscle(blobGeo, [0, -0.3, 0.035], hip, [0.095, 0.24, 0.09]);
    muscle(blobGeo, [0, -0.32, -0.04], hip, [0.08, 0.22, 0.07]);
    muscle(blobGeo, [0, -0.2, -0.035], knee, [0.065, 0.17, 0.06]);
    muscle(blobGeo, [s * 0.15, 2.0, 0.12], kid, [0.13, 0.09, 0.05]);
    muscle(blobGeo, [s * 0.1, 1.5, 0.15], kid, [0.08, 0.2, 0.04]);
  }
  const bicepsTag = label('Biceps', new THREE.Object3D(), { cls: 'warm' }); R.shoulder.add(bicepsTag.at); bicepsTag.at.position.set(0, -0.2, 0.12);
  const tricepsTag = label('Triceps', new THREE.Object3D()); R.shoulder.add(tricepsTag.at); tricepsTag.at.position.set(0, -0.32, -0.13);

  // ---------- paths: a chain of curves, each in the space of the body part it moves with ----------
  function path(segs) {
    const p = segs.map(([parent, pts]) => { const curve = new THREE.CatmullRomCurve3(pts.map(q => V(...q))); return { parent, curve, len: curve.getLength() }; });
    const total = p.reduce((a, q) => a + q.len, 0);
    return {
      p, total,
      at(u, out) {
        let d = clamp(u, 0, 1) * total;
        for (let k = 0; k < p.length; k++) {
          const q = p[k];
          if (d <= q.len || k === p.length - 1) { q.curve.getPointAt(clamp(d / q.len, 0, 1), out); return q.parent.localToWorld(out); }
          d -= q.len;
        }
        return out;
      },
    };
  }
  function tubes(sys, pa, r, mat) { for (const q of pa.p) put(sys, new THREE.TubeGeometry(q.curve, Math.max(6, Math.ceil(q.len * 30)), r, 6), mat, [0, 0, 0], q.parent); }
  const armSegs = (s, z) => [[limbs[s].shoulder, [[0, 0, z], [0, -0.3, z], [0, -0.55, z]]], [limbs[s].elbow, [[0, 0, z], [0, -0.3, z], [0, -0.56, z]]]];
  const legSegs = (s, z) => [[limbs[s].hip, [[0, 0, z], [0, -0.3, z], [0, -0.58, z]]], [limbs[s].knee, [[0, 0, z], [0, -0.3, z], [0, -0.48, z + 0.06]]]];

  // ---------- heart and blood vessels ----------
  const H = [0.07, 1.88, 0.07];
  const heart = new THREE.Group(); heart.position.set(...H); heart.rotation.z = -0.35; kid.add(heart);
  const heartMat = solid(0xd62839, { roughness: 0.4 });
  for (const s of [-1, 1]) put('heart', new THREE.SphereGeometry(0.06, 16, 12), heartMat, [s * 0.045, 0.03, 0], heart);
  const tip = put('heart', new THREE.ConeGeometry(0.095, 0.15, 16), heartMat, [0, -0.06, 0], heart); tip.rotation.z = Math.PI;
  const bloodPaths = [
    path([[kid, [H, [0.04, 2.1, 0.03], [0.06, 2.32, 0.0], [0.05, 2.55, 0.06], [0, 2.72, 0.05]]]]),
    ...[-1, 1].flatMap(s => [
      path([[kid, [H, [s * 0.2, 2.05, 0.03], [s * 0.46, 2.14, 0.02]]], ...armSegs(s, 0.03)]),
      path([[kid, [H, [0.02, 1.6, -0.06], [0.0, 1.28, -0.06], [s * 0.16, 1.13, 0.02]]], ...legSegs(s, 0.035)]),
    ]),
  ];
  const vesselMat = solid(0xc81d3a, { roughness: 0.45 });
  bloodPaths.forEach(pa => tubes('heart', pa, 0.014, vesselMat));
  const dotGeo = new THREE.SphereGeometry(0.022, 8, 6), bloodDot = new THREE.MeshBasicMaterial({ color: 0xff6b7a });
  const bloodDots = bloodPaths.flatMap(pa => {
    const n = Math.max(3, Math.round(pa.total * 5));
    return Array.from({ length: n }, (_, k) => { const m = new THREE.Mesh(dotGeo, bloodDot); scene.add(m); add('heart', m); return { m, pa, u: k / n }; });
  });
  const heartTag = label('Heart', new THREE.Object3D(), { cls: 'warm' }); heart.add(heartTag.at); heartTag.at.position.set(0.05, 0.12, 0.05);

  // ---------- lungs ----------
  const lungMat = solid(0xf4a3b4, { roughness: 0.7 });
  const lungs = [-1, 1].map(s => { const m = put('lungs', new THREE.SphereGeometry(0.15, 20, 14), lungMat, [s * 0.165, 1.88, -0.03], kid); m.base = [s > 0 ? 0.72 : 0.8, 1.4, 0.85]; m.scale.set(...m.base); return m; });
  const airwayMat = solid(0xe8dfe9);
  put('lungs', new THREE.CylinderGeometry(0.028, 0.028, 0.32, 10), airwayMat, [0, 2.2, 0.02], kid);
  for (const s of [-1, 1]) { const b = put('lungs', new THREE.CylinderGeometry(0.02, 0.022, 0.16, 8), airwayMat, [s * 0.06, 2.02, 0.0], kid); b.rotation.z = s * 0.8; }
  const diaphragm = put('lungs', new THREE.SphereGeometry(0.33, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), solid(0xe39a7a, { side: THREE.DoubleSide }), [0, 1.48, -0.02], kid);
  diaphragm.scale.set(1.05, 0.5, 0.62);
  const airPath = path([[kid, [[0, 2.42, 0.2], [0, 2.3, 0.05], [0, 2.1, 0.02], [0.13, 1.92, -0.02]]]]);
  const airPath2 = path([[kid, [[0, 2.42, 0.2], [0, 2.3, 0.05], [0, 2.1, 0.02], [-0.13, 1.92, -0.02]]]]);
  const airDot = new THREE.MeshBasicMaterial({ color: 0x4fb3ff });
  const airDots = Array.from({ length: 10 }, (_, k) => { const m = new THREE.Mesh(dotGeo, airDot); scene.add(m); add('lungs', m); return { m, pa: k % 2 ? airPath : airPath2, off: Math.floor(k / 2) / 5 }; });
  const lungTag = label('Lungs', new THREE.Object3D(), { cls: 'warm' }); lungs[0].add(lungTag.at); lungTag.at.position.set(-0.12, 0.1, 0);
  const pipeTag = label('Windpipe', new THREE.Vector3(0.1, 2.14, 0.05));

  // ---------- stomach and intestines ----------
  const gutPaths = [
    path([[kid, [[0, 2.45, 0.2], [0, 2.32, 0.02], [0.0, 2.05, -0.06], [0.04, 1.78, -0.03], [0.1, 1.62, 0.02]]]]),
    path([[kid, [[0.1, 1.62, 0.02], [0.16, 1.57, 0.05], [0.18, 1.5, 0.06], [0.06, 1.46, 0.07]]]]),
  ];
  const coil = [[0.06, 1.46, 0.07]];
  for (let row = 0; row < 6; row++) {
    const y = 1.42 - row * 0.045, dir = row % 2 ? 1 : -1;
    for (let k = 0; k <= 6; k++) { const x = dir * (-0.16 + (k / 6) * 0.32); coil.push([x, y - Math.sin(k * 1.2) * 0.012, 0.07 + Math.sin(k * 1.7 + row) * 0.03]); }
  }
  gutPaths.push(path([[kid, coil]]));
  gutPaths.push(path([[kid, [[0.16, 1.19, 0.06], [-0.24, 1.17, 0.03], [-0.27, 1.32, 0.02], [-0.25, 1.47, 0.02], [0, 1.5, 0.0], [0.25, 1.47, 0.0], [0.27, 1.3, 0.02], [0.22, 1.15, 0.03], [0.05, 1.08, 0.0]]]]));
  tubes('gut', gutPaths[0], 0.024, solid(0xe58fa0));
  const stomach = put('gut', new THREE.SphereGeometry(0.12, 20, 14), solid(0xef8a8a, { roughness: 0.6 }), [0.13, 1.55, 0.05], kid);
  stomach.rotation.z = -0.5; const STOMACH = [1.25, 0.8, 0.7]; stomach.scale.set(...STOMACH);
  tubes('gut', gutPaths[2], 0.028, solid(0xf2b38a));
  tubes('gut', gutPaths[3], 0.042, solid(0xd98a6a));
  const food = put('gut', new THREE.SphereGeometry(0.04, 12, 8), solid(0xe63946), [0, 0, 0], scene);
  const APPLE = new THREE.Color(0xe63946), MUSH = new THREE.Color(0xc9a24a);
  const foodTag = label('Food pipe', food, { cls: 'warm' });
  const F = { t: -1 };

  // ---------- brain, spinal cord and nerves ----------
  const brainGeo = new THREE.IcosahedronGeometry(0.22, 3);
  { const p = brainGeo.attributes.position; for (let k = 0; k < p.count; k++) { tmp.fromBufferAttribute(p, k); const n = Math.sin(tmp.x * 47) + Math.sin(tmp.y * 41 + 1) + Math.sin(tmp.z * 53 + 2); tmp.multiplyScalar(1 + 0.035 * n); p.setXYZ(k, tmp.x, tmp.y, tmp.z); } brainGeo.computeVertexNormals(); }
  const brainMat = solid(0xf3a6bb, { roughness: 0.65 });
  const brain = put('brain', brainGeo, brainMat, [0, 2.69, -0.02], kid); brain.scale.set(0.95, 0.78, 1.05);
  put('brain', new THREE.SphereGeometry(0.08, 14, 10), solid(0xe88fa8), [0, 2.55, -0.17], kid).scale.set(1.3, 0.8, 0.9);
  const nerveMat = solid(0xffcf4a, { roughness: 0.5 });
  const B0 = [0, 2.55, -0.12], SC = [0, 2.15, -0.15];
  const spine = path([[kid, [B0, [0, 2.35, -0.15], SC, [0, 1.7, -0.16], [0, 1.18, -0.13]]]]);
  tubes('brain', spine, 0.02, nerveMat);
  const armNerve = s => path([[kid, [SC, [s * 0.25, 2.16, -0.07], [s * 0.46, 2.15, -0.03]]], ...armSegs(s, -0.03)]);
  const legNerve = s => path([[kid, [[0, 1.22, -0.13], [s * 0.1, 1.15, -0.08], [s * 0.17, 1.12, -0.04]]], ...legSegs(s, -0.04)]);
  [-1, 1].forEach(s => { tubes('brain', armNerve(s), 0.009, nerveMat); tubes('brain', legNerve(s), 0.01, nerveMat); });
  const eyePath = path([[kid, [[-0.11, 2.67, 0.26], [-0.06, 2.67, 0.12], [0, 2.66, 0.0]]]]);
  tubes('brain', eyePath, 0.008, nerveMat); tubes('brain', path([[kid, [[0.11, 2.67, 0.26], [0.06, 2.67, 0.12], [0, 2.66, 0.0]]]]), 0.008, nerveMat);
  const toHand = path([[kid, [[0, 2.66, 0.0], [0, 2.5, -0.1], B0, [0, 2.35, -0.15], SC]], ...armNerve(-1).p.map(q => [q.parent, q.curve.points.map(v => v.toArray())])]);
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xfff27a });
  const pulses = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), pulseMat); m.visible = false; scene.add(m); return m; });
  const ballMesh = kit.mesh(new THREE.SphereGeometry(0.09, 18, 12), solid(0x3a86ff), [0, 0, 0], scene); ballMesh.castShadow = false;
  const brainTag = label('Brain', new THREE.Vector3(0.05, 2.98, 0), { cls: 'warm' });
  const cordTag = label('Spinal cord', new THREE.Vector3(0.0, 1.62, -0.16));
  const nerveTag = label('Nerves', new THREE.Object3D()); L.elbow.add(nerveTag.at); nerveTag.at.position.set(0.05, -0.2, 0);
  const C = { t: -1, from: V(-1.1, 2.5, 1.7), to: V(), ctl: V() };

  // ---------- labels for the bones step and the overview ----------
  const boneTags = { skull: label('Skull', new THREE.Vector3(0, 3.0, 0)), ribs: label('Ribs', new THREE.Vector3(0.3, 2.0, 0.2)), spine: label('Spine', new THREE.Vector3(-0.05, 1.45, -0.15)), legs: label('Leg bones', new THREE.Vector3(0.32, 0.75, 0)) };
  const sysTag = label('', new THREE.Vector3(0, 3.02, 0), { cls: 'big warm' });

  // ---------- helpers ----------
  function showSystems(list) { for (const s of SYS) for (const o of parts[s]) o.visible = list.includes(s); }
  function hiBones(g) { for (const [k, arr] of Object.entries(groups)) for (const m of arr) m.material = k === g ? boneHi : boneMat; Object.entries(boneTags).forEach(([k, t]) => t.show(k === g)); }
  function pose(t, run) {
    // Jogging on the spot while exercising; arms and legs swing in opposite pairs.
    const a = run * Math.sin(t * 9);
    for (const s of [-1, 1]) {
      const { shoulder, elbow, hip, knee } = limbs[s];
      if (st.step !== 2 && C.t < 0) { shoulder.rotation.set(-a * s * 0.6, 0, s * 0.1); elbow.rotation.x = -run * 1.0; }
      hip.rotation.x = a * s * 0.55; knee.rotation.x = run * Math.max(0, -a * s) * 1.3;
    }
    kid.position.y = run * Math.abs(Math.sin(t * 9)) * 0.05;
  }
  function placeDots(dt) {
    const rate = lerp(BEAT_REST, BEAT_RUN, st.ex) / 60;
    for (const d of bloodDots) { d.u = (d.u + dt * rate * 0.16 * (1.8 / d.pa.total)) % 1; d.pa.at(d.u, d.m.position); }
  }
  function bendArm(b) {
    R.elbow.rotation.x = -2.2 * b; R.shoulder.rotation.set(-0.15 * b, 0, -0.1);
    biceps[-1].scale.set(0.055 * (1 + 0.6 * b), 0.17 * (1 - 0.3 * b), 0.055 * (1 + 0.7 * b)); biceps[-1].position.set(0, -0.27 + 0.03 * b, 0.035 + 0.02 * b);
    triceps[-1].scale.set(0.05 * (1 - 0.15 * b), 0.19 * (1 + 0.08 * b), 0.05 * (1 - 0.15 * b));
  }
  function catchPose(k) {
    R.shoulder.rotation.set(-1.25 * k, 0, -0.1 - 0.3 * k); R.elbow.rotation.x = -0.45 * k;
  }
  // Where the right hand ends up when the arm is raised to catch.
  catchPose(1); kid.updateMatrixWorld(true); R.elbow.localToWorld(C.to.set(0, -0.62, 0.05)); catchPose(0);

  const allTags = [bicepsTag, tricepsTag, heartTag, lungTag, pipeTag, foodTag, brainTag, cordTag, nerveTag, sysTag, ...Object.values(boneTags)];
  const fullView = { radius: 1.75, yaw: 0.25, pitch: 0.15, target: [0, 1.5, 0] };
  let toggle = null;

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      st.step = i; st.time = 0; st.quiz = isQuiz; st.auto = true; st.msg = ''; st.exOn = false; st.ex = 0; st.sys = -1; st.cycle = -1; st.lastBone = -1;
      allTags.forEach(t => t.show(false));
      hiBones(null); F.t = -1; C.t = -1; ballMesh.visible = false; pulses.forEach(p => { p.visible = false; });
      bendArm(0); R.shoulder.rotation.set(0, 0, -0.1); L.shoulder.rotation.set(0, 0, 0.1); L.elbow.rotation.x = 0; pose(0, 0);
      skin.opacity = 0.26;

      if (i === 0) {
        go(fullView);
        showSystems(SYS); sysTag.show(true); sysTag.text = 'All together';
        st.row = ui.buttons([...SYS.map((s, n) => ({ label: SYS_BTN[s], onClick: () => { st.auto = false; pick(n); } })), { label: 'All', onClick: () => { st.auto = false; pick(-1); } }]);
        say('Tap a button to see one part of the body at a time.');
      }
      if (i === 1) {
        go({ ...fullView, yaw: 0.35 });
        showSystems(['bones']);
        st.row = ui.buttons(Object.keys(groups).map((g, n) => ({ label: BONE_BTN[g], onClick: () => { st.auto = false; hiBones(g); say(BONE_MSG[g]); } })));
        say('A grown-up has <b>206 bones</b>. They hold the body up.');
      }
      if (i === 2) {
        go({ radius: 0.88, yaw: -1.4, pitch: 0.08, target: [-0.47, 1.75, 0.12] });
        showSystems(['bones', 'muscles']);
        for (const m of parts.muscles) m.visible = m.parent === R.shoulder || m.parent === R.elbow; // only the right arm's muscles
        bicepsTag.show(true); tricepsTag.show(true);
        st.slider = ui.slider({ label: 'Bend the arm', min: 0, max: 1, step: 0.01, value: 0, format: v => `${Math.round(v * 100)}%`, onInput: v => { st.auto = false; st.bend = v; } });
      }
      if (i === 3) {
        go({ radius: 1.35, yaw: 0.2, pitch: 0.15, target: [0, 1.55, 0] });
        showSystems(['heart']); heartTag.show(true);
        toggle = ui.toggle({ label: 'Exercise', value: false, onChange: v => { st.auto = false; st.exOn = v; } });
      }
      if (i === 4) {
        go({ radius: 0.75, yaw: 0.2, pitch: 0.1, target: [0, 1.95, 0] });
        showSystems(['lungs']); lungTag.show(true); pipeTag.show(true);
        toggle = ui.toggle({ label: 'Exercise', value: false, onChange: v => { st.auto = false; st.exOn = v; } });
      }
      if (i === 5) {
        go({ radius: 0.8, yaw: 0.15, pitch: 0.1, target: [0, 1.75, 0] });
        showSystems(['gut']); F.t = 0; foodTag.show(true);
        ui.buttons([{ label: 'Eat an apple', onClick: () => { F.t = 0; } }]);
      }
      if (i === 6) {
        go({ radius: 1.55, yaw: -0.3, pitch: 0.12, target: [-0.2, 1.65, 0.2] });
        showSystems(['brain']); brainTag.show(true); cordTag.show(true); nerveTag.show(true);
        st.throwAt = 1.0;
        ui.buttons([{ label: 'Throw the ball', onClick: () => { C.t = 0; st.throwAt = null; } }]);
        say('Messages travel along <b>nerves</b> to and from the brain, very fast.');
      }
      if (isQuiz) { go({ ...fullView, yaw: 0.45 }); showSystems(['bones', 'heart', 'lungs', 'gut', 'brain']); skin.opacity = 0.3; }
      placeDots(0); placeFood(); kid.updateMatrixWorld(true);
    },

    update(dt, t) {
      st.time += dt;
      const i = st.step;
      kid.updateMatrixWorld(true);
      if (st.quiz) { st.beat += dt * BEAT_REST / 60; beatHeart(); placeDots(dt); return true; }
      let busy = false;

      if (i === 0) {
        busy = true;
        if (st.auto && st.time > 1.2) { const n = Math.floor((st.time - 1.2) / 2) % (SYS.length + 1); if (n !== st.cycle) { st.cycle = n; pick(n === SYS.length ? -1 : n, true); } }
        st.beat += dt * BEAT_REST / 60; st.breath += dt * BREATH_REST / 60; beatHeart(); breathe(); placeDots(dt);
      }
      if (i === 1 && st.auto) {
        const keys = Object.keys(groups), n = Math.floor(st.time / 2.2) % keys.length;
        if (st.lastBone !== n) { st.lastBone = n; hiBones(keys[n]); st.row.select(n); say(BONE_MSG[keys[n]]); }
        busy = true;
      }
      if (i === 2) {
        if (st.auto) { st.bend = (1 - Math.cos(Math.max(0, st.time - 0.3) * 1.6)) / 2; st.slider.set(st.bend); busy = true; }
        bendArm(st.bend);
        say(st.bend > 0.5 ? 'The <b>biceps</b> gets shorter and fatter. It pulls the lower arm up.' : 'To straighten the arm, the <b>triceps</b> on the back pulls instead.');
      }
      if (i === 3 || i === 4) {
        busy = true;
        if (st.auto && st.time > 1.0 && !st.exOn) { st.exOn = true; toggle.checked = true; }
        kit.follow(st, 'ex', st.exOn ? 1 : 0, dt, 1.5);
        st.beat += dt * lerp(BEAT_REST, BEAT_RUN, st.ex) / 60; st.breath += dt * lerp(BREATH_REST, BREATH_RUN, st.ex) / 60;
        pose(t, st.ex); beatHeart(); breathe();
        if (i === 3) {
          placeDots(dt);
          say(st.exOn ? `Running! The heart beats <b>faster</b>: about <b>${Math.round(lerp(BEAT_REST, BEAT_RUN, st.ex))}</b> beats a minute, to send more blood to the muscles.`
            : `Resting: the heart beats about <b>${BEAT_REST}</b> times a minute.`);
        } else {
          const b = Math.sin(st.breath * Math.PI * 2);
          for (const [k, d] of airDots.entries()) { const u = ((st.breath * 2 + d.off) % 1); d.m.visible = true; d.pa.at(b > 0 ? u : 1 - u, d.m.position); if (k > 5 && st.ex < 0.3) d.m.visible = false; }
          say(`${b > 0 ? '<b>Breathe in</b>: the lungs fill with air.' : '<b>Breathe out</b>: used air goes out.'}${st.ex > 0.5 ? ' Exercising: faster and deeper breaths.' : ''}`);
        }
      }
      if (i === 5) {
        if (F.t >= 0) { F.t += dt; busy = true; }
        placeFood();
      }
      if (i === 6) {
        if (st.throwAt != null && st.time > st.throwAt) { st.throwAt = null; C.t = 0; }
        busy = catchBall(dt) || busy;
      }
      return busy;
    },
  };

  function pick(n, auto) {
    st.sys = n;
    if (!auto) { st.auto = false; }
    st.row.select(n < 0 ? SYS.length : n);
    if (n < 0) { showSystems(SYS); sysTag.text = 'All together'; say('All the parts work <b>together</b> to keep you alive and moving.'); return; }
    const s = SYS[n]; showSystems([s]); sysTag.text = SYS_NAME[s]; say(SYS_JOB[s]);
  }
  function beatHeart() {
    const p = Math.pow(Math.max(0, Math.sin(st.beat * Math.PI * 2)), 3);
    heart.scale.setScalar(1 + 0.14 * p);
  }
  function breathe() {
    const b = (1 - Math.cos(st.breath * Math.PI * 2)) / 2, deep = lerp(0.13, 0.22, st.ex);
    for (const l of lungs) l.scale.set(l.base[0] * (1 + deep * b), l.base[1] * (1 + deep * 0.6 * b), l.base[2] * (1 + deep * b));
    diaphragm.position.y = 1.48 - 0.06 * b;
  }
  function placeFood() {
    if (F.t < 0) { food.visible = false; return; }
    let t = F.t, k = 0;
    while (k < GUT.length - 1 && t > GUT[k].dur) { t -= GUT[k].dur; k++; }
    const u = clamp(t / GUT[k].dur, 0, 1), done = k === GUT.length - 1 && u >= 1;
    food.visible = parts.gut[0].visible && !done;
    const pa = k === 1 ? gutPaths[1] : gutPaths[k === 0 ? 0 : k];
    pa.at(k === 1 ? Math.min(1, u * 1.6) * 0.45 + (u > 0.75 ? (u - 0.75) * 2.2 : 0) : u, food.position);
    const mush = smooth01(k === 0 ? 0 : k === 1 ? u : 1);
    food.material.color.copy(APPLE).lerp(MUSH, mush);
    food.scale.setScalar(k >= 2 ? lerp(0.8, 0.55, u) : lerp(1, 0.8, mush));
    const churn = k === 1 ? Math.sin(F.t * 12) * 0.06 : 0;
    stomach.scale.set(STOMACH[0] * (1 + churn), STOMACH[1] * (1 - churn), STOMACH[2]);
    foodTag.text = done ? 'Done!' : GUT[k].name;
    say(done ? 'The journey is over. Fruit, vegetables and water help your gut work well.' : GUT[k].msg);
  }
  function catchBall(dt) {
    if (C.t < 0) { ballMesh.visible = false; catchPose(0); return false; }
    const t = (C.t += dt);
    // Eyes see the ball -> message to the brain -> message down the spinal cord and arm nerves -> arm muscles move.
    const e = clamp((t - 0.15) / 0.45, 0, 1), h = clamp((t - 0.6) / 0.7, 0, 1);
    pulses[0].visible = t > 0.15 && t < 0.6; if (pulses[0].visible) eyePath.at(e, pulses[0].position);
    pulses[1].visible = t > 0.6 && t < 1.3; if (pulses[1].visible) toHand.at(h, pulses[1].position);
    catchPose(smooth01(clamp((t - 1.1) / 0.6, 0, 1)));
    ballMesh.visible = true;
    if (t < 1.9) {
      const u = t / 1.9, a = 1 - u;
      C.ctl.set((C.from.x + C.to.x) / 2, Math.max(C.from.y, C.to.y) + 0.6, (C.from.z + C.to.z) / 2);
      ballMesh.position.set(a * a * C.from.x + 2 * a * u * C.ctl.x + u * u * C.to.x, a * a * C.from.y + 2 * a * u * C.ctl.y + u * u * C.to.y, a * a * C.from.z + 2 * a * u * C.ctl.z + u * u * C.to.z);
    } else R.elbow.localToWorld(ballMesh.position.set(0, -0.62, 0.05));
    say(t < 0.6 ? 'The <b>eyes</b> see the ball and send a message to the brain.' : t < 1.3 ? 'The <b>brain</b> sends a message down the spinal cord and nerves to the arm.' : t < 1.9 ? 'The arm <b>muscles</b> move the hand into place.' : 'Caught! Sleep gives your brain the rest it needs to do all this.');
    return t < 2.2;
  }
}

const BONE_BTN = { skull: 'Skull', ribs: 'Ribs', spine: 'Spine', legs: 'Leg bones' };
const BONE_MSG = {
  skull: 'The <b>skull</b> is a hard case that protects the brain.',
  ribs: 'The <b>ribs</b> make a cage that protects the heart and lungs.',
  spine: 'The <b>spine</b> (backbone) holds you up and lets you bend and twist.',
  legs: 'Strong <b>leg bones</b> carry your weight when you stand, walk and run.',
};
function smooth01(x) { return x * x * (3 - 2 * x); }
