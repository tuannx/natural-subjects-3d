// The nervous system and reflexes: a see-through body with the brain and spinal cord (central nervous system)
// and nerves (peripheral) carrying impulses; a neuron whose parts light up, with an impulse whose speed sets
// time = distance ÷ speed; a synapse where chemicals cross the gap; the chain stimulus → receptor → sensory
// neuron → CNS → motor neuron → effector → response (catching a ball); a reflex arc (hand on a hot plate);
// a ruler-drop reaction-time test (t = √(2d ÷ g)); and the sense organs as receptors.
import { partSet } from '../_shared/cells.js';
import { flow, rand, BODY } from '../_shared/body.js';

const NEU = [8, 1.3, 0];   // neuron
const SYN = [15, 1.4, 0];  // synapse
const REF = [22, 0, 0];    // reflex arc
const RUL = [29, 0, 0];    // ruler drop
const SEN = [35, 1.7, 0];  // sense organs
const NERVE = 0xf2c94c, CNS_C = 0xf0a6c0, PULSE = 0xfff3a0;
const G = 9.8;
const NPARTS = [
  ['dend', 'Dendrites', '<b>Dendrites</b> are short branches that pick up impulses from receptors or from other neurons.'],
  ['body', 'Cell body', 'The <b>cell body</b> holds the nucleus and keeps the neuron alive.'],
  ['axon', 'Axon', 'The <b>axon</b> is a long thin fibre that carries the impulse away from the cell body. Some axons are about 1 m long.'],
  ['myelin', 'Myelin sheath', 'The <b>myelin sheath</b> is a fatty layer wrapped round the axon. It insulates it and makes impulses travel much faster.'],
  ['term', 'Axon terminals', 'The <b>axon terminals</b> pass the impulse on to the next neuron, a muscle or a gland.'],
];
const STAGES = [
  ['Stimulus', 'A <b>stimulus</b>: a change you can detect, here a ball flying towards you.'],
  ['Receptor', 'A <b>receptor</b> detects it: light-sensitive cells in your eye.'],
  ['Sensory neuron', 'A <b>sensory neuron</b> carries the impulse to the central nervous system.'],
  ['CNS', 'The <b>CNS</b> (here the brain) takes in the information and decides what to do.'],
  ['Motor neuron', 'A <b>motor neuron</b> carries an impulse from the CNS to an effector.'],
  ['Effector', 'The <b>effector</b>, here the muscles of your arm, contracts.'],
  ['Response', 'The <b>response</b>: your hand moves up and you catch the ball.'],
];
const SENSES = [
  ['eye', 'Eye', '<b>Eye</b>: light is the stimulus. Light-sensitive cells in the retina (rods and cones) send impulses along the <b>optic nerve</b>.'],
  ['ear', 'Ear', '<b>Ear</b>: sound is the stimulus. Hair cells in the cochlea, deep inside the ear, send impulses along the <b>auditory nerve</b>. Other parts of the ear detect balance.'],
  ['nose', 'Nose', '<b>Nose</b>: chemicals in the air are the stimulus. Smell receptors high up inside the nose send impulses to the brain.'],
  ['tongue', 'Tongue', '<b>Tongue</b>: chemicals in food are the stimulus. Taste buds detect sweet, salty, sour, bitter and savoury tastes.'],
];

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xe3e6ee, sky: 0xeef2fa, radius: 45 });
  ground.position.x = 18;
  const sun = kit.lights(scene, { sun: [5, 10, 8] });
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const group = (p, parent = scene) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; };
  const anchor = (parent, pos) => { const o = new THREE.Object3D(); o.position.set(...pos); parent.add(o); return o; };
  const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => V(...p)));
  const P3 = new THREE.Vector3(), M4 = new THREE.Matrix4(), S3 = new THREE.Vector3(), Q = new THREE.Quaternion();
  const plain = (c, o) => kit.mat(c, o);
  const pulseMat = new THREE.MeshStandardMaterial({ color: PULSE, emissive: 0xffd23f, emissiveIntensity: 1.2, roughness: 0.3 });
  const pulseGeo = new THREE.SphereGeometry(0.05, 12, 8);
  const tube = (pts, r, mat, parent, segs = 24) => { const m = kit.mesh(new THREE.TubeGeometry(curve(pts), segs, r, 6), mat, [0, 0, 0], parent); m.castShadow = false; return m; };

  // A glowing dot that runs along a chain of curves, each in its own parent's space (so it can follow a moving arm).
  function runner(legs) {
    const m = new THREE.Mesh(pulseGeo, pulseMat); m.scale.setScalar(1.5); m.visible = false; scene.add(m);
    const cs = legs.map(([pts, parent]) => ({ c: curve(pts), parent }));
    return {
      m,
      // u from 0 to legs.length: leg floor(u), fraction u % 1.
      at(u) {
        if (u < 0 || u > cs.length) { m.visible = false; return; }
        const k = Math.min(cs.length - 1, Math.floor(u)), f = u - k;
        cs[k].c.getPointAt(Math.min(1, f), P3);
        cs[k].parent.localToWorld(P3);
        m.position.copy(P3); m.visible = true;
      },
    };
  }

  // ================= Body: brain, spinal cord and nerves =================
  const gB = group([0, 0, 0]);
  const skin = new THREE.MeshStandardMaterial({ color: BODY.skin, transparent: true, opacity: 0.17, roughness: 0.6, depthWrite: false });
  const part = (geo, pos, scale, parent = gB) => { const m = new THREE.Mesh(geo, skin); m.position.set(...pos); if (scale) m.scale.set(...scale); m.renderOrder = 3; parent.add(m); return m; };
  part(new THREE.SphereGeometry(0.3, 24, 16), [0, 3.12, 0], [0.9, 1.05, 0.95]);
  part(new THREE.CylinderGeometry(0.1, 0.11, 0.25, 12, 1, true), [0, 2.8, 0]);
  part(new THREE.CapsuleGeometry(0.33, 0.85, 6, 16), [0, 2.15, 0], [1.25, 1, 0.65]);
  for (const s of [-1, 1]) part(new THREE.CapsuleGeometry(0.12, 1.25, 4, 12), [s * 0.17, 0.75, 0]);
  const SHO = [0.47, 2.62, 0];
  part(new THREE.CapsuleGeometry(0.075, 0.95, 4, 10), [-0.6, 2.12, 0], [1, 1, 1]).rotation.z = -0.28;
  const armR = group(SHO, gB);
  armR.rotation.z = 0.28;
  part(new THREE.CapsuleGeometry(0.075, 0.95, 4, 10), [0, -0.5, 0], null, armR);
  const handR = anchor(armR, [0, -1.08, 0]);

  const NP = partSet(THREE, kit);
  const cnsMat = NP.mat('cns', CNS_C, { roughness: 0.6 });
  // Brain: a bumpy ellipsoid with a cerebellum; spinal cord down the back.
  const brainGeo = new THREE.IcosahedronGeometry(1, 3);
  const bp = brainGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    const k = 1 + 0.05 * Math.sin(x * 11 + z * 7) * Math.cos(y * 9 + x * 3) + 0.03 * Math.sin(z * 17);
    bp.setXYZ(i, x * k, y * k, z * k);
  }
  brainGeo.computeVertexNormals();
  const brain = kit.mesh(brainGeo, cnsMat, [0, 3.18, -0.01], gB); brain.scale.set(0.2, 0.15, 0.23); brain.castShadow = false;
  kit.mesh(new THREE.SphereGeometry(0.08, 12, 8), cnsMat, [0, 3.04, -0.14], gB).castShadow = false;
  const cordPts = [[0, 3.02, -0.1], [0, 2.75, -0.13], [0, 2.3, -0.15], [0, 1.85, -0.15], [0, 1.5, -0.13]];
  tube(cordPts, 0.035, cnsMat, gB, 30);
  const pnsMat = NP.mat('pns', NERVE, { roughness: 0.5 });
  const nerves = [];
  const nerve = (pts, parent = gB, r = 0.014, dir = 1) => { tube(pts, r, pnsMat, parent); nerves.push({ pts, parent, dir }); };
  // Arms: from the neck part of the cord, across the shoulder and down the arm (right arm in its own group).
  nerve([[0, 2.58, -0.13], [-0.22, 2.62, -0.05], [-0.45, 2.6, 0], [-0.6, 2.1, 0.02], [-0.74, 1.62, 0.02], [-0.78, 1.52, 0.04]], gB, 0.014, -1);
  nerve([[0, 2.58, -0.13], [0.22, 2.62, -0.05], [0.45, 2.62, 0]], gB, 0.014, 1);
  nerve([[0, 0, 0], [0, -0.5, 0.02], [0, -1.0, 0.02], [0.02, -1.1, 0.04]], armR, 0.014, 1);
  // Legs: from the bottom of the cord down to the feet.
  for (const s of [-1, 1]) nerve([[0, 1.5, -0.13], [s * 0.1, 1.3, -0.06], [s * 0.17, 0.9, 0], [s * 0.17, 0.4, 0.02], [s * 0.18, 0.06, 0.06]], gB, 0.016, s);
  // Nerves to the trunk.
  for (const y of [2.35, 2.05, 1.75]) for (const s of [-1, 1]) nerve([[0, y, -0.15], [s * 0.2, y - 0.03, -0.12], [s * 0.36, y - 0.08, 0.02]], gB, 0.009, -s);
  const opticPts = [[0.08, 3.16, 0.24], [0.06, 3.17, 0.1], [0.02, 3.2, -0.12]];
  tube(opticPts, 0.012, pnsMat, gB);
  const eyeMat = plain(0xffffff, { roughness: 0.3 });
  for (const s of [-1, 1]) {
    kit.mesh(new THREE.SphereGeometry(0.045, 12, 8), eyeMat, [s * 0.09, 3.16, 0.25], gB).castShadow = false;
    kit.mesh(new THREE.SphereGeometry(0.02, 8, 6), plain(0x3a6ea5), [s * 0.09, 3.16, 0.292], gB).castShadow = false;
  }
  const pulses = nerves.map(({ pts, parent, dir }, i) => {
    const f = flow(THREE, parent, { points: pts, count: 2, geo: pulseGeo, color: PULSE, speed: 0.45 + rand(i) * 0.2, emissive: 1.2, fade: 0.08 });
    f.rate = dir; f.phase = rand(i + 5);
    return f;
  });
  const bTags = {
    brain: label('Brain', anchor(gB, [-0.2, 3.35, 0])),
    cord: label('Spinal cord', anchor(gB, [-0.3, 1.9, -0.1])),
    nerve: label('Nerves', anchor(gB, [0.45, 0.8, 0.05]), { cls: 'warm' }),
  };
  const stageTag = label('', anchor(gB, [0, 0, 0]), { cls: 'warm' });
  // Ball and the impulse path for the catch: eye → brain → cord → right arm.
  const ball = kit.mesh(new THREE.SphereGeometry(0.09, 16, 12), plain(0xff7a3d, { roughness: 0.5 }), [0, 0, 0], scene);
  ball.visible = false;
  const catchAt = new THREE.Vector3(), ballFrom = new THREE.Vector3(0.75, 2.75, 3.2);
  armR.rotation.x = -1.25; gB.updateMatrixWorld(true); handR.getWorldPosition(catchAt); catchAt.z += 0.08; armR.rotation.x = 0;
  const sensoryRun = runner([[opticPts, gB]]);
  const motorRun = runner([[[[0.02, 3.12, -0.08], [0, 3.0, -0.1], [0, 2.75, -0.13], [0, 2.58, -0.13], [0.22, 2.62, -0.05], [0.45, 2.62, 0]], gB], [[[0, 0, 0], [0, -0.3, 0.02], [0, -0.5, 0.02]], armR]]);
  const muscle = kit.mesh(new THREE.SphereGeometry(0.07, 12, 8), plain(0xc8423c, { roughness: 0.5 }), [0, -0.3, 0.05], armR);
  muscle.scale.set(0.8, 2.6, 0.8); muscle.castShadow = false;
  const stageAt = [ball, anchor(gB, [0.09, 3.2, 0.3]), anchor(gB, [0.1, 3.27, 0.1]), anchor(gB, [-0.05, 3.42, -0.02]), anchor(gB, [0.25, 2.72, -0.05]), anchor(armR, [0.1, -0.3, 0.05]), handR];

  // ================= Neuron =================
  const gN = group(NEU);
  const NNP = partSet(THREE, kit);
  const cellMat = NNP.mat('body', 0x8f7fd6, { roughness: 0.55 });
  const dendMat = NNP.mat('dend', 0xa597e6, { roughness: 0.55 });
  const axonMat = NNP.mat('axon', 0xb2a6ee, { roughness: 0.5 });
  const myelinMat = NNP.mat('myelin', 0xf6efd8, { roughness: 0.6 });
  const termMat = NNP.mat('term', 0x8f7fd6, { roughness: 0.5 });
  const AX0 = -1.05, AX1 = 1.6, CB = -1.38;
  const cbGeo = new THREE.IcosahedronGeometry(0.27, 2);
  kit.mesh(cbGeo, cellMat, [CB, 0, 0], gN).scale.set(1.1, 0.95, 0.95);
  kit.mesh(new THREE.SphereGeometry(0.1, 14, 10), plain(0x4b3c9e), [CB - 0.02, 0.03, 0.2], gN);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3, dir = [-0.55 - 0.35 * Math.cos(a) ** 2, Math.sin(a) * 0.9, Math.cos(a) * 0.7];
    const p0 = [CB + dir[0] * 0.2, dir[1] * 0.22, dir[2] * 0.22], p1 = [CB + dir[0] * 0.6, dir[1] * 0.55, dir[2] * 0.5];
    tube([p0, p1], 0.03, dendMat, gN, 4);
    for (const b of [-1, 1]) tube([p1, [p1[0] - 0.22, p1[1] + b * 0.16 + dir[1] * 0.1, p1[2] + b * 0.1]], 0.016, dendMat, gN, 3);
  }
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, AX1 - AX0 + 0.3, 10), axonMat, [(AX0 + AX1) / 2 - 0.1, 0, 0], gN).rotation.z = Math.PI / 2;
  const myelin = [], ML = 0.36, MG = 0.07;
  for (let i = 0; i < 6; i++) {
    const x = AX0 + 0.05 + ML / 2 + i * (ML + MG);
    const m = kit.mesh(new THREE.CapsuleGeometry(0.085, ML - 0.12, 3, 14), myelinMat, [x, 0, 0], gN); m.rotation.z = Math.PI / 2; myelin.push(m);
  }
  const termEnds = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5 - 0.4) * 1.4, e = [AX1 + 0.35 + Math.cos(a) * 0.12, Math.sin(a) * 0.32, (rand(i) - 0.5) * 0.3];
    tube([[AX1 - 0.05, 0, 0], [AX1 + 0.15, e[1] * 0.4, e[2] * 0.4], e], 0.018, termMat, gN, 6);
    kit.mesh(new THREE.SphereGeometry(0.045, 10, 8), termMat, e, gN);
    termEnds.push(e);
  }
  const ring = kit.mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 20), pulseMat, [0, 0, 0], gN);
  ring.rotation.y = Math.PI / 2; ring.castShadow = false;
  const nTags = {
    dend: label('Dendrites', anchor(gN, [CB - 0.65, 0.5, 0.1])),
    body: label('Cell body', anchor(gN, [CB, -0.38, 0.2])),
    axon: label('Axon', anchor(gN, [AX0 + 0.25, 0.18, 0.1])),
    myelin: label('Myelin sheath', anchor(gN, [0.55, -0.2, 0.1])),
    term: label('Axon terminals', anchor(gN, [AX1 + 0.4, 0.42, 0])),
  };
  const dirTag = label('Impulse →', anchor(gN, [0.5, 0.32, 0]), { cls: 'warm' });

  // ================= Synapse =================
  const gS = group(SYN);
  const memA = new THREE.MeshStandardMaterial({ color: 0xa597e6, transparent: true, opacity: 0.45, roughness: 0.5, depthWrite: false, side: THREE.DoubleSide });
  memA.opacity = 0.3;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 18), memA); bulb.scale.set(1.15, 1, 0.9); bulb.position.set(-0.72, 0, 0); bulb.renderOrder = 3; gS.add(bulb);
  tube([[-2.4, 0.15, 0], [-1.8, 0.08, 0], [-1.3, 0, 0]], 0.12, memA, gS, 12).renderOrder = 3;
  const postMat = plain(0x7fc6a4, { roughness: 0.55 });
  const post = kit.mesh(new THREE.SphereGeometry(0.7, 28, 18), postMat, [0.98, 0, 0], gS); post.scale.set(0.8, 1, 0.9);
  tube([[1.3, 0.05, 0], [1.9, 0.1, 0], [2.5, 0.2, 0]], 0.14, postMat, gS, 12);
  const vesMat = plain(0xf2a516, { roughness: 0.4 });
  const ves = [];
  for (let i = 0; i < 8; i++) {
    const m = kit.mesh(new THREE.SphereGeometry(0.075, 12, 8), vesMat, [0, 0, 0], gS); m.castShadow = false;
    m.home = V(-0.95 + rand(i) * 0.4, (rand(i + 3) - 0.5) * 0.6, (rand(i + 6) - 0.5) * 0.5);
    m.dock = V(-0.12, (i / 7 - 0.5) * 0.5, (rand(i + 9) - 0.5) * 0.3);
    ves.push(m);
  }
  const recMat = new THREE.MeshStandardMaterial({ color: 0x2f8f6a, roughness: 0.5, emissive: 0x7dffb0, emissiveIntensity: 0 });
  const recs = [];
  for (let i = 0; i < 6; i++) {
    const y = (i / 5 - 0.5) * 0.7, z = (rand(i + 20) - 0.5) * 0.3;
    const x = 0.98 - 0.8 * 0.7 * Math.sqrt(Math.max(0, 1 - (y / 0.7) ** 2 - (z / 0.63) ** 2)) - 0.02;
    const m = kit.mesh(new THREE.BoxGeometry(0.05, 0.07, 0.07), recMat, [x, y, z], gS); m.castShadow = false; recs.push(V(x - 0.03, y, z));
  }
  const NT = 30;
  const nt = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshStandardMaterial({ color: 0xffb000, emissive: 0xffb000, emissiveIntensity: 0.4 }), NT);
  nt.frustumCulled = false; nt.castShadow = false; gS.add(nt);
  const synIn = runner([[[[-2.4, 0.15, 0], [-1.8, 0.08, 0], [-1.25, 0, 0]], gS]]);
  const synOut = runner([[[[1.3, 0.05, 0], [1.9, 0.1, 0], [2.5, 0.2, 0]], gS]]);
  const sTags = {
    gap: label('Synapse (gap)', anchor(gS, [0.08, 0.72, 0.1]), { cls: 'big' }),
    ves: label('Vesicles', anchor(gS, [-0.85, -0.6, 0.3])),
    nt: label('Neurotransmitter', anchor(gS, [0.08, -0.55, 0.3]), { cls: 'warm' }),
    rec: label('Receptors', anchor(gS, [0.75, -0.8, 0.3])),
    next: label('Next neuron', anchor(gS, [1.35, 0.85, 0])),
  };

  // ================= Reflex arc =================
  const gR = group(REF);
  kit.mesh(new THREE.BoxGeometry(1.1, 1.1, 0.9), plain(0xd8d2c4), [0.55, 0.55, 0], gR);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, emissive: 0xff4a1c, emissiveIntensity: 0.5, roughness: 0.5 });
  kit.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 28), plateMat, [0.55, 1.13, 0], gR);
  const heat = flow(THREE, gR, { points: [[0.55, 1.18, 0], [0.6, 1.5, 0.05], [0.5, 1.9, 0]], count: 6, radius: 0.035, color: 0xff7a3d, speed: 0.4, emissive: 0.8 });
  const armMat = plain(0xf1c7a8, { roughness: 0.6 });
  const RS = [-0.6, 2.15, 0], RE = [-0.6, 1.32, 0];
  kit.mesh(new THREE.CapsuleGeometry(0.1, 0.75, 4, 12), armMat, [RS[0], (RS[1] + RE[1]) / 2, -0.05], gR);
  const fore = group(RE, gR);
  const foreM = kit.mesh(new THREE.CapsuleGeometry(0.085, 0.75, 4, 12), armMat, [0.42, 0, -0.05], fore); foreM.rotation.z = Math.PI / 2;
  kit.mesh(new THREE.BoxGeometry(0.34, 0.07, 0.22), armMat, [1.0, -0.08, -0.05], fore);
  for (let f = 0; f < 4; f++) kit.mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), armMat, [1.24, -0.09, -0.13 + f * 0.055], fore);
  kit.mesh(new THREE.SphereGeometry(0.13, 14, 10), armMat, [RS[0], RS[1] + 0.05, -0.05], gR);
  const bicepsMat = plain(0xc8423c, { roughness: 0.5 });
  const biceps = kit.mesh(new THREE.SphereGeometry(0.1, 14, 10), bicepsMat, [-0.5, 1.75, 0.02], gR); biceps.castShadow = false;
  // Spinal cord, cut across and drawn larger than life: white matter round a butterfly of grey matter.
  const CC = [-1.32, 1.78, 0];
  const cs = group(CC, gR);
  kit.mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 32), plain(0xf3eee6), [0, 0, 0], cs).rotation.x = Math.PI / 2;
  const grey = plain(0xb9a2b2);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const m = kit.mesh(new THREE.SphereGeometry(0.09, 12, 8), grey, [sx * 0.11, sy * 0.1, 0.05], cs); m.scale.set(1, 1.3, 0.3); m.castShadow = false; }
  kit.mesh(new THREE.BoxGeometry(0.22, 0.08, 0.04), grey, [0, 0, 0.05], cs).castShadow = false;
  const C = (x, y) => [CC[0] + x, CC[1] + y, 0.08];
  const sensF = [[1.28, -0.08, 0.06], [1.1, -0.1, 0.07], [0.8, -0.02, 0.06], [0.3, -0.05, 0.06], [0, -0.06, 0.05]];
  const sensB = [[RE[0] - 0.08, RE[1] - 0.04, 0.05], [-0.7, 1.7, 0.05], [-0.7, 2.15, 0.05], [-1.0, 2.3, 0.05], C(0.2, 0.3), C(0.11, 0.1)];
  const relay = [C(0.11, 0.1), C(0.02, 0.0), C(0.11, -0.1)];
  const motor = [C(0.11, -0.1), C(0.3, -0.25), [-1.05, 1.62, 0.06], [-0.58, 1.72, 0.08]];
  const upPts = [C(-0.05, 0.12), C(-0.05, 0.35), C(-0.05, 0.6), C(-0.05, 0.95)];
  const sensMat = plain(0x3d8bfd, { roughness: 0.5 }), motMat = plain(0xe8594a, { roughness: 0.5 }), relMat = plain(0x9b5de5, { roughness: 0.5 });
  tube(sensF, 0.016, sensMat, fore, 12); tube(sensB, 0.016, sensMat, gR); tube(relay, 0.016, relMat, gR, 8); tube(motor, 0.016, motMat, gR); tube(upPts, 0.012, plain(0x8a8f99), gR, 8);
  const reflexRun = runner([[sensF, fore], [sensB, gR], [relay, gR], [motor, gR]]);
  const brainRun = runner([[upPts, gR]]);
  const rTags = {
    rec: label('Receptor', anchor(fore, [1.3, 0.12, 0])),
    sens: label('Sensory neuron', anchor(gR, [-0.62, 2.55, 0]), { cls: 'cool' }),
    relay: label('Relay neuron', anchor(gR, [CC[0] - 0.12, CC[1] - 0.48, 0.1])),
    motor: label('Motor neuron', anchor(gR, [-0.5, 1.43, 0.1]), { cls: 'warm' }),
    eff: label('Muscle (effector)', anchor(gR, [-0.05, 2.0, 0.1])),
    cord: label('Spinal cord', anchor(gR, [CC[0] - 0.45, CC[1] + 0.4, 0])),
    brain: label('To the brain', anchor(gR, [CC[0], CC[1] + 1.1, 0])),
    ouch: label('Ouch! Pain felt', anchor(gR, [CC[0] + 0.2, CC[1] + 1.38, 0]), { cls: 'warm' }),
  };

  // ================= Ruler drop =================
  const gU = group(RUL);
  const rulerTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#f7d774'; g.fillRect(0, 0, 64, 512);
    g.fillStyle = '#2b2b2b'; g.font = 'bold 15px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    for (let cm = 0; cm <= 30; cm++) {
      const y = 512 - 8 - cm * (496 / 30);
      const w = cm % 5 === 0 ? 24 : 12;
      g.fillRect(0, y - 1, w, 2);
      if (cm % 5 === 0) g.fillText(String(cm), 30, Math.min(500, Math.max(10, y)));
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const RL = 1.6, CM = (RL - 0.05) / 30, FY = 1.75; // ruler length, units per cm (approx), finger height
  const ruler = group([0, FY, 0], gU);
  const rulerM = kit.mesh(new THREE.BoxGeometry(0.16, RL, 0.02), [plain(0xe9c75e), plain(0xe9c75e), plain(0xe9c75e), plain(0xe9c75e), plain(0xffffff, { map: rulerTex }), plain(0xe9c75e)], [0, RL / 2 - 0.025, 0], ruler);
  rulerM.castShadow = true;
  const handMat = plain(0xf1c7a8, { roughness: 0.6 });
  kit.mesh(new THREE.BoxGeometry(0.55, 0.16, 0.26), handMat, [-0.42, FY - 0.04, 0], gU);
  kit.mesh(new THREE.CapsuleGeometry(0.07, 0.6, 4, 10), handMat, [-0.95, FY - 0.08, 0], gU).rotation.z = Math.PI / 2;
  const thumb = kit.mesh(new THREE.CapsuleGeometry(0.04, 0.2, 4, 8), handMat, [-0.1, FY, 0.1], gU); thumb.rotation.z = Math.PI / 2;
  const finger = kit.mesh(new THREE.CapsuleGeometry(0.04, 0.24, 4, 8), handMat, [-0.08, FY, -0.1], gU); finger.rotation.z = Math.PI / 2;
  const dropper = group([0, FY + RL + 0.02, 0], gU);
  const pinch = [-1, 1].map(s => kit.mesh(new THREE.SphereGeometry(0.05, 10, 8), handMat, [0, 0, s * 0.04], dropper));
  kit.mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 10), handMat, [0.3, 0.08, 0], dropper).rotation.z = Math.PI / 2;
  const uTags = {
    ruler: label('Ruler (cm)', anchor(ruler, [0.36, 1.2, 0])),
    fingers: label('Catcher\'s fingers', anchor(gU, [-0.55, FY - 0.32, 0.1]), { cls: 'cool' }),
    dist: label('', anchor(gU, [0.42, FY - 0.15, 0]), { cls: 'warm' }),
  };

  // ================= Sense organs =================
  const gE = group(SEN);
  const SP = partSet(THREE, kit);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 20), new THREE.MeshStandardMaterial({ color: BODY.skin, transparent: true, opacity: 0.2, roughness: 0.6, depthWrite: false }));
  head.scale.set(0.9, 1.05, 1); head.renderOrder = 3; gE.add(head);
  const brain2 = kit.mesh(brainGeo, plain(CNS_C, { roughness: 0.6 }), [0, 0.18, -0.06], gE); brain2.scale.set(0.42, 0.33, 0.48); brain2.castShadow = false;
  const eyeE = kit.mesh(new THREE.SphereGeometry(0.1, 16, 12), SP.mat('eye', 0xffffff, { roughness: 0.3 }), [0.2, 0.02, 0.48], gE);
  kit.mesh(new THREE.SphereGeometry(0.045, 10, 8), plain(0x3a6ea5), [0.2, 0.02, 0.575], gE);
  kit.mesh(new THREE.SphereGeometry(0.1, 16, 12), eyeMat, [-0.2, 0.02, 0.48], gE);
  const ear = kit.mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 16), SP.mat('ear', 0xe9a98a), [0.56, -0.02, -0.02], gE); ear.rotation.y = Math.PI / 2; ear.scale.set(1, 1.4, 1);
  const noseE = kit.mesh(new THREE.ConeGeometry(0.08, 0.2, 10), SP.mat('nose', 0xe9a98a), [0, -0.12, 0.62], gE); noseE.rotation.x = Math.PI / 2 - 0.4;
  const tongue = kit.mesh(new THREE.SphereGeometry(0.12, 14, 8), SP.mat('tongue', 0xe8667a), [0, -0.36, 0.38], gE); tongue.scale.set(1, 0.3, 1.3);
  const senseNerves = {
    eye: [[0.2, 0.02, 0.38], [0.15, 0.08, 0.1], [0.06, 0.15, -0.3]],
    ear: [[0.5, -0.02, -0.02], [0.35, 0.02, -0.04], [0.2, 0.08, -0.08]],
    nose: [[0, -0.05, 0.55], [0, 0.02, 0.4], [0, 0.08, 0.28]],
    tongue: [[0, -0.33, 0.3], [0.02, -0.25, 0.05], [0, -0.1, -0.12]],
  };
  const stimPaths = {
    eye: [[0.45, 0.15, 1.7], [0.3, 0.08, 1.0], [0.2, 0.02, 0.58]],
    ear: [[1.6, 0.2, 0.3], [1.0, 0.05, 0.1], [0.6, -0.02, -0.02]],
    nose: [[0.5, -0.5, 1.4], [0.15, -0.25, 0.95], [0, -0.13, 0.7]],
    tongue: [[0.3, -0.1, 1.3], [0.1, -0.3, 0.8], [0, -0.33, 0.46]],
  };
  const stimCol = { eye: 0xffe14d, ear: 0x5aa9ff, nose: 0x7cc96a, tongue: 0xff9a3d };
  const sense = {};
  for (const [k] of SENSES) {
    tube(senseNerves[k], 0.014, pnsMat, gE, 8);
    sense[k] = {
      stim: flow(THREE, gE, { points: stimPaths[k], count: 7, radius: 0.035, color: stimCol[k], speed: 0.35, emissive: 0.7 }),
      imp: flow(THREE, gE, { points: senseNerves[k], count: 2, geo: pulseGeo, color: PULSE, speed: 0.6, emissive: 1.2 }),
    };
  }
  const eTags = {
    brain: label('Brain', anchor(gE, [-0.1, 0.62, -0.1])),
    eye: label('Eye: light', anchor(gE, [0.38, 0.3, 0.75])),
    ear: label('Ear: sound', anchor(gE, [0.75, 0.2, -0.05])),
    nose: label('Nose: smell', anchor(gE, [0.32, -0.15, 0.7])),
    tongue: label('Tongue: taste', anchor(gE, [0.12, -0.55, 0.45])),
  };

  // ================= State, views and steps =================
  const allTags = [...Object.values(bTags), stageTag, ...Object.values(nTags), dirTag, ...Object.values(sTags), ...Object.values(rTags), ...Object.values(uTags), ...Object.values(eTags)];
  const F = {
    body: { radius: 1.85, yaw: 0.3, pitch: 0.12, target: [0, 1.75, 0] },
    neuron: { radius: 1.0, width: 2.4, yaw: 0.1, pitch: 0.25, target: [NEU[0] - 0.08, NEU[1], 0] },
    syn: { radius: 1.05, width: 1.75, yaw: 0.08, pitch: 0.18, target: [SYN[0] + 0.05, SYN[1], 0] },
    chain: { radius: 1.6, yaw: 0.75, pitch: 0.15, target: [0.2, 2.35, 0.5] },
    reflex: { radius: 1.4, width: 1.5, yaw: 0.1, pitch: 0.12, target: [REF[0] - 0.38, 1.85, 0] },
    ruler: { radius: 1.45, yaw: 0.45, pitch: 0.12, target: [RUL[0] - 0.3, 2.1, 0] },
    senses: { radius: 1.05, yaw: 0.75, pitch: 0.15, target: [SEN[0] + 0.2, SEN[1] - 0.05, 0.2] },
    quiz: { radius: 1.9, yaw: -0.4, pitch: 0.12, target: [0, 1.75, 0] },
  };
  const st = { step: 0, quiz: false, time: 0, auto: true, row: null, nsMode: 'both', part: -1, speed: 60, dist: 1, ix: 0, cyc: 0, stage: -1, d: 20, slow: true, sense: '' };

  function hideAll() {
    for (const tg of allTags) tg.show(false);
    for (const r of [sensoryRun, motorRun, reflexRun, brainRun, synIn, synOut]) r.m.visible = false;
    ball.visible = false; ring.visible = false; armR.rotation.x = 0; muscle.visible = false;
    NP.select([]); NNP.select([]); SP.select([]);
    stageTag.el.classList.add('warm');
  }
  function setNS(mode) {
    st.nsMode = mode;
    NP.select(mode === 'both' ? ['cns', 'pns'] : mode);
    bTags.brain.show(mode !== 'pns'); bTags.cord.show(mode !== 'pns'); bTags.nerve.show(mode !== 'cns');
    ui.readout(mode === 'cns' ? 'The <b>central nervous system (CNS)</b>: the brain and the spinal cord. It receives information, decides what to do and sends out instructions.'
      : mode === 'pns' ? 'The <b>peripheral nervous system</b>: all the nerves that link the CNS to every part of the body. Each nerve is a bundle of many neurons.'
        : 'Impulses travel <b>into</b> the CNS from the senses and <b>out</b> of it to the muscles, all the time.');
  }
  function pickPart(j) { st.part = j; NNP.select(NPARTS[j][0]); NPARTS.forEach(([k], q) => nTags[k].el.classList.toggle('warm', q === j)); ui.readout(NPARTS[j][2]); }
  function speedReadout() {
    const ms = st.dist / st.speed * 1000;
    ui.readout(`Time = distance ÷ speed = ${st.dist.toFixed(2)} m ÷ ${st.speed} m/s = <b>${ms >= 100 ? (ms / 1000).toFixed(2) + ' s' : ms.toFixed(1) + ' ms'}</b><br><small>1 ms = 1/1000 s. Impulses travel at about 1 m/s in thin axons without myelin, up to about 120 m/s in thick ones with myelin. The impulse in the model is slowed down.</small>`);
  }
  function chainReadout(k) {
    ui.readout(STAGES.map(([n], q) => (q === k ? `<b>${n}</b>` : n)).join(' → ') + '<br>' + STAGES[k][1]);
  }
  function setStage(k) {
    if (k === st.stage) return; st.stage = k;
    stageTag.text = STAGES[k][0]; stageTag.at = stageAt[k]; stageTag.show(true);
    chainReadout(k);
  }
  function rulerReadout() {
    const d = st.d / 100, t = Math.sqrt(2 * d / G);
    uTags.dist.text = `d = ${st.d} cm`;
    ui.readout(`d = ½ × g × t², so t = √(2d ÷ g)<br>t = √(2 × ${d.toFixed(2)} m ÷ 9.8 m/s²) = <b>${t.toFixed(2)} s</b>${st.slow ? '<br><small>Shown 5 times slower than real life.</small>' : ''}`);
  }
  function pickSense(k) {
    st.sense = k; SP.select(k);
    for (const [s] of SENSES) { eTags[s].show(s === k); eTags[s].el.classList.toggle('warm', s === k); }
    ui.readout(SENSES.find(s => s[0] === k)[2]);
  }

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.time = 0; st.auto = true; st.row = null; st.slider = null; st.stage = -1;
      hideAll();
      if (i === 0) {
        view(F.body);
        st.row = ui.buttons([{ label: 'Central (CNS)', onClick: () => { st.auto = false; setNS('cns'); } }, { label: 'Peripheral', onClick: () => { st.auto = false; setNS('pns'); } }, { label: 'Both', on: true, onClick: () => { st.auto = false; setNS('both'); } }]);
        setNS('both');
      }
      if (i === 1) {
        view(F.neuron);
        for (const t of Object.values(nTags)) t.show(true);
        st.row = ui.buttons(NPARTS.map(([, n], j) => ({ label: n, on: j === 0, onClick: () => { st.auto = false; pickPart(j); } })));
        pickPart(0);
      }
      if (i === 2) {
        view(F.neuron);
        ring.visible = true; dirTag.show(true); nTags.myelin.show(true); nTags.axon.show(true);
        st.speed = 60; st.dist = 1; st.ix = 0;
        st.slider = ui.slider({ label: 'Impulse speed', min: 1, max: 120, step: 1, value: 60, unit: ' m/s', onInput: v => { st.auto = false; st.speed = v; speedReadout(); } });
        st.slider2 = ui.slider({ label: 'Nerve length', min: 0.1, max: 1, step: 0.05, value: 1, unit: ' m', format: v => v.toFixed(2), onInput: v => { st.auto = false; st.dist = v; speedReadout(); } });
        speedReadout();
      }
      if (i === 3) {
        view(F.syn);
        for (const t of Object.values(sTags)) t.show(true);
        st.cyc = 0;
        ui.buttons([{ label: 'Send an impulse', onClick: () => { st.time = 0; } }]);
        ui.readout('An impulse reaches the end of the axon. Tiny bags called <b>vesicles</b> release a chemical, a <b>neurotransmitter</b>, into the gap. It diffuses across and fits <b>receptors</b> on the next neuron, which starts a new impulse.');
      }
      if (i === 4) {
        view(F.chain);
        ball.visible = true; muscle.visible = true;
        st.row = ui.buttons([{ label: 'Play the chain', onClick: () => { st.time = 0; st.auto = true; } }, ...STAGES.map(([n], k) => ({ label: n, onClick: () => { st.auto = false; st.time = [0.6, 1.25, 1.6, 2.15, 2.9, 3.9, 4.5][k]; } }))]);
      }
      if (i === 5) {
        view(F.reflex);
        for (const k of ['rec', 'sens', 'relay', 'motor', 'eff', 'cord', 'brain']) rTags[k].show(true);
        ui.buttons([{ label: 'Touch the hot plate', onClick: () => { st.time = 0; } }]);
      }
      if (i === 6) {
        view(F.ruler);
        uTags.ruler.show(true); uTags.fingers.show(true);
        st.d = 20; st.slow = true;
        st.slider = ui.slider({ label: 'Distance the ruler falls', min: 5, max: 30, step: 1, value: 20, unit: ' cm', onInput: v => { st.auto = false; st.d = v; st.time = 0; rulerReadout(); } });
        ui.toggle({ label: 'Slow motion (5× slower)', value: true, onChange: v => { st.slow = v; st.time = 0; rulerReadout(); } });
        rulerReadout();
      }
      if (i === 7) {
        view(F.senses);
        eTags.brain.show(true);
        st.row = ui.buttons(SENSES.map(([k, n], j) => ({ label: n, on: j === 0, onClick: () => { st.auto = false; pickSense(k); } })));
        pickSense('eye');
      }
      if (isQuiz) { view(F.quiz); NP.select(['cns', 'pns']); }
    },

    update(dt) {
      st.time += dt;
      const t = st.time, s = st.step;
      if (s === 0 || st.quiz) {
        if (s === 0 && !st.quiz && st.auto) { const k = Math.floor(t / 3.5) % 3, m = ['both', 'cns', 'pns'][k]; if (m !== st.nsMode) { setNS(m); st.row?.select([2, 0, 1][k]); } }
        NP.pulse(t);
        for (const p of pulses) p.update(dt);
      }
      if (s === 1 && !st.quiz) {
        if (st.auto) { const j = Math.floor(t / 2.6) % NPARTS.length; if (j !== st.part) { pickPart(j); st.row?.select(j); } }
        NNP.pulse(t);
      }
      if (s === 2 && !st.quiz) {
        if (st.auto) { const v = [60, 5, 110][Math.floor(t / 5) % 3]; if (v !== st.speed) { st.speed = v; st.slider?.set(v); speedReadout(); } }
        // On screen, the impulse crosses the model in 0.6 s (fast) to 3 s (slow).
        const cross = 0.6 + 2.4 * Math.sqrt((120 / st.speed - 1) / 119);
        st.ix += dt / cross;
        if (st.ix > 1.35) st.ix = 0;
        const x = kit.lerp(AX0, AX1 + 0.1, Math.min(1, st.ix));
        ring.position.set(x, 0, 0); ring.visible = st.ix <= 1;
      }
      if (s === 3 && !st.quiz) synapse(Math.max(0, (t % 5.3) - 0.8));
      if (s === 4 && !st.quiz) chain(st.auto ? t % 6.5 : Math.min(t, 6.4));
      if (s === 5 && !st.quiz) reflex(t % 7.5, dt);
      if (s === 6 && !st.quiz) rulerDrop(t);
      if (s === 7 && !st.quiz) {
        if (st.auto) { const j = Math.floor(t / 3.2) % 4; if (SENSES[j][0] !== st.sense) { pickSense(SENSES[j][0]); st.row?.select(j); } }
        SP.pulse(t);
        for (const [k] of SENSES) { const on = k === st.sense; sense[k].stim.mesh.visible = sense[k].imp.mesh.visible = on; if (on) { sense[k].stim.update(dt); sense[k].imp.update(dt); } }
      }
      return true;
    },
  };

  function synapse(c) {
    // 0–0.8 impulse arrives; 0.8–1.5 vesicles move to the membrane; 1.5–2.7 neurotransmitter crosses; 2.7–3.3 receptors fire; 3.3–4.2 impulse leaves.
    if (c < 0.8) synIn.at(c / 0.8); else synIn.m.visible = false;
    const vk = kit.ease(kit.clamp((c - 0.8) / 0.7, 0, 1));
    ves.forEach((m, i) => {
      m.position.lerpVectors(m.home, m.dock, vk);
      const fade = kit.clamp((c - 1.5) / 0.4, 0, 1);
      m.scale.setScalar(c > 1.5 ? Math.max(0.001, 1 - fade) : 1);
    });
    for (let i = 0; i < NT; i++) {
      const f = kit.clamp((c - 1.5 - rand(i) * 0.4) / 0.9, 0, 1);
      const a = ves[i % 8].dock, b = recs[i % 6];
      P3.lerpVectors(a, b, f);
      P3.y += Math.sin(f * Math.PI) * (rand(i + 4) - 0.5) * 0.3; P3.z += Math.sin(f * Math.PI) * (rand(i + 8) - 0.5) * 0.3;
      const on = c > 1.5 && c < 3.4;
      nt.setMatrixAt(i, M4.compose(P3, Q.identity(), S3.setScalar(on ? 1 : 0.001)));
    }
    nt.instanceMatrix.needsUpdate = true;
    recMat.emissiveIntensity = c > 2.6 && c < 3.6 ? 0.8 : 0;
    postMat.emissive.setHex(c > 2.8 && c < 3.6 ? 0x2a6b4c : 0x000000);
    if (c > 3.3 && c < 4.2) synOut.at((c - 3.3) / 0.9); else synOut.m.visible = false;
  }

  function chain(c) {
    // Ball flies in for 4.4 s; impulses: eye → brain (1.2–2.0), brain decides (2.0–2.4), brain → arm (2.4–3.6), arm lifts (3.6–4.4).
    const fly = kit.clamp(c / 4.4, 0, 1);
    ball.position.lerpVectors(ballFrom, catchAt, fly);
    ball.position.y += Math.sin(fly * Math.PI) * 0.35;
    const k = c < 1.2 ? 0 : c < 1.45 ? 1 : c < 2.0 ? 2 : c < 2.4 ? 3 : c < 3.6 ? 4 : c < 4.4 ? 5 : 6;
    setStage(k);
    NP.select(k === 3 ? 'cns' : []); NP.pulse(st.time);
    if (c >= 1.2 && c < 2.0) sensoryRun.at((c - 1.2) / 0.8); else sensoryRun.m.visible = false;
    if (c >= 2.4 && c < 3.6) motorRun.at(((c - 2.4) / 1.2) * 2); else motorRun.m.visible = false;
    eyeMat.emissive.setHex(k === 1 ? 0x996600 : 0x000000);
    const lift = kit.ease(kit.clamp((c - 3.6) / 0.8, 0, 1));
    armR.rotation.x = -1.25 * lift;
    muscle.scale.set(0.8 + 0.4 * lift, 2.6 - 0.6 * lift, 0.8 + 0.4 * lift);
  }

  function reflex(c, dt) {
    // 0–0.7 hand goes down onto the plate; 0.7–2.1 impulse along sensory → relay → motor; 2.1–2.5 hand jerks away;
    // meanwhile a second impulse goes up the spinal cord, and the brain feels the pain at 3.6 s.
    const down = kit.ease(kit.clamp(c / 0.7, 0, 1)), up = kit.ease(kit.clamp((c - 2.1) / 0.35, 0, 1));
    fore.rotation.z = 0.55 * (1 - down) + 0.75 * up;
    heat.update(dt);
    if (c >= 0.7 && c < 2.1) reflexRun.at(((c - 0.7) / 1.4) * 4); else reflexRun.m.visible = false;
    if (c >= 1.45 && c < 3.6) brainRun.at((c - 1.45) / 2.15); else brainRun.m.visible = false;
    biceps.scale.set(1 + 0.35 * up, 2.4 - 0.5 * up, 1 + 0.35 * up);
    rTags.ouch.show(c >= 3.6 && c < 6.5);
    const ph = c < 0.7 ? 0 : c < 2.1 ? 1 : c < 3.6 ? 2 : 3;
    if (ph !== st.rph) {
      st.rph = ph;
      ui.readout(['The hand moves towards the hot plate…',
        'Heat <b>receptors</b> in the skin send an impulse along a <b>sensory neuron</b> to the spinal cord. A <b>relay neuron</b> passes it straight to a <b>motor neuron</b>.',
        'The <b>biceps muscle</b> (the effector) contracts and the hand jerks away. The brain has not been involved yet!',
        'Only now does the impulse travelling up the spinal cord reach the brain, and you <b>feel the pain</b>. The reflex already protected you.'][ph]);
    }
  }

  function rulerDrop(c) {
    // Hold 0.8 s, fall, catch after the reaction time, hold the catch, then reset (cycle restarts with st.time).
    const d = st.d / 100, tr = Math.sqrt(2 * d / G), slow = st.slow ? 5 : 1;
    const fallT = tr * slow, cycle = 0.8 + fallT + 2.4;
    const k = c % cycle, ft = Math.max(0, k - 0.8);
    const real = Math.min(ft / slow, tr);
    ruler.position.y = FY - 0.5 * G * real * real * (CM * 100);
    const closed = ft >= fallT;
    const fz = closed ? 0.032 : 0.1;
    thumb.position.z = fz; finger.position.z = -fz;
    for (const [j, p] of pinch.entries()) p.position.z = (j ? 1 : -1) * (k < 0.8 ? 0.03 : 0.09);
    uTags.dist.show(closed);
  }
}
