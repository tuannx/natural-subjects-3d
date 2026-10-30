// Mechanical energy (grades 6–9): kinetic energy of a cart (Ek = ½mv²), gravitational potential energy of a lifted
// ball (Ep = m·g·h, with g = 10 N/kg), a pendulum trading Ep and Ek, a skate ramp with a friction toggle (thermal
// energy grows, the total stays the same), a roller coaster whose second hill must be lower than the start, and
// a spring launcher (elastic energy). World units are metres. Every moving thing is driven by a small physics
// model; live bar charts on a board show the energies, and their total.
import { panel, paint, makeCoil } from '../_shared/lab.js';

const G = 10;                      // N/kg (VN textbooks: P = 10·m); 9.8 N/kg more exactly
const PEND = { m: 2, L: 3, py: 4.4 };
const SK = { m: 50, c: 0.25, X: 4.2, mu: 0.06 };          // half-pipe y = c·x², friction coefficient (model)
const CO = { m: 500, start: 5, x0: -5.85, v0: 0, brake: 10 }; // roller coaster: starts from rest just below the top
const SP = { k: 400, m: 0.2, L0: 0.8, base: 0.35 };        // spring launcher
const COLORS = { Ep: '#1f7ae0', Ek: '#e8590c', Eth: '#c2255c', Ee: '#7048e8', Total: '#2b8a3e' };
const NAMES = { Ep: 'Ep', Ek: 'Ek', Eth: 'Thermal', Ee: 'Elastic', Total: 'Total' };
const num = v => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));
const comma = n => Math.round(n).toLocaleString('en-US');

export default function setup({ THREE, scene, kit, ui, label, view }) {
  kit.stage(scene, { ground: 0xcfe3c0, sky: 0xdcefff, radius: 40 });
  const sun = kit.lights(scene, { sun: [5, 12, 8] });
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, far: 50 });
  const clamp = kit.clamp;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), sc = new THREE.Vector3(), upY = new THREE.Vector3(0, 1, 0);
  const demos = [];
  const demo = () => { const g = new THREE.Group(); g.visible = false; scene.add(g); demos.push(g); return g; };
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const labels = [];
  const tag = (text, at, cls) => { const l = label(text, at, { cls }); labels.push(l); return l; };
  const steel = kit.mat(0x5d6873, { metalness: 0.5, roughness: 0.4 });
  const woodMat = kit.mat(0xc8955c, { roughness: 0.8 });

  // A board with a live bar chart. bars.set([{ key, value }], max, unit) redraws only when the numbers change.
  function barBoard(parent, w, h, x, y, z, ry = 0) {
    const p = panel(THREE, w, h, { px: 512 });
    p.position.set(x, y, z); p.rotation.y = ry; parent.add(p);
    p.children[1].position.z += 0.03;   // keep the face clear of the frame when seen from far away (no depth flicker)
    let last = '';
    p.set = (items, max, unit = 'J', scale = 1, title = 'Energy') => {
      const key = items.map(it => (it.value / scale).toFixed(1)).join('|') + unit;
      if (key === last) return;
      last = key;
      p.draw((g, W, H) => {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#526472'; g.font = '700 28px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(title, W / 2, 26);
        const top = 96, bot = H - 58, n = items.length, bw = Math.min(140, (W - 40) / n - 18);
        g.strokeStyle = '#1d2b36'; g.lineWidth = 3; g.beginPath(); g.moveTo(24, bot); g.lineTo(W - 24, bot); g.stroke();
        items.forEach((it, i) => {
          const cx = 20 + (W - 40) * (i + 0.5) / n, hh = clamp(it.value / max, 0, 1.05) * (bot - top);
          g.fillStyle = COLORS[it.key]; g.fillRect(cx - bw / 2, bot - hh, bw, hh);
          const val = it.value / scale;
          g.fillStyle = '#1d2b36'; g.font = `800 ${n > 3 ? 30 : 36}px system-ui, sans-serif`;
          g.fillText(`${val >= 100 ? comma(val) : num(val)} ${unit}`, cx, bot - hh - 22);
          g.fillStyle = COLORS[it.key]; g.font = `800 ${n > 3 ? 30 : 36}px system-ui, sans-serif`;
          g.fillText(it.name || NAMES[it.key], cx, bot + 30);
        });
      });
    };
    return p;
  }
  // A vertical metre ruler, 0 at the bottom.
  function ruler(parent, max, x, z, step = 1) {
    const tex = paint(THREE, 96, 512, (g, w, h) => {
      g.fillStyle = '#f6e7b4'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1d2b36'; g.strokeStyle = '#1d2b36'; g.font = '700 24px system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
      const pad = 12;
      for (let v = 0; v <= max * 10 + 1e-6; v++) {
        const y = h - pad - (v / (max * 10)) * (h - 2 * pad), major = v % (step * 10) === 0, half = v % 5 === 0;
        g.lineWidth = major ? 3 : 1.5;
        g.beginPath(); g.moveTo(0, y); g.lineTo(major ? 36 : half ? 26 : 14, y); g.stroke();
        if (major) g.fillText(`${v / 10} m`, 40, Math.min(h - 14, Math.max(14, y)));
      }
    });
    const pad = 12 / 512 * max * 1.0 / (1 - 24 / 512);
    const H = max / (1 - 24 / 512);
    const r = kit.mesh(new THREE.BoxGeometry(0.32, H, 0.05), kit.mat(0xffffff, { map: tex, roughness: 0.7 }), [x, H / 2 - pad, z], parent);
    r.castShadow = false;
    r.y0 = H / 2 - pad;
    return r;
  }

  // ======================= 0. Kinetic energy: a cart =======================
  const kG = demo();
  const TRACK = 4.6;
  kit.mesh(new THREE.BoxGeometry(TRACK * 2 + 0.6, 0.12, 1.0), kit.mat(0x8d99ae, { roughness: 0.5 }), [0, 0.06, 0], kG).castShadow = false;
  for (const z of [-0.3, 0.3]) kit.mesh(new THREE.BoxGeometry(TRACK * 2 + 0.6, 0.06, 0.06), steel, [0, 0.15, z], kG);
  const cart = new THREE.Group(); kG.add(cart);
  kit.mesh(new THREE.BoxGeometry(0.9, 0.22, 0.6), kit.mat(0xe63946, { roughness: 0.5 }), [0, 0.34, 0], cart);
  const wheels = [];
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    const w = kit.mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), kit.mat(0x1d2b36), [x, 0.22, z], cart);
    w.rotation.x = Math.PI / 2; wheels.push(w);
  }
  const blocks = [0, 1, 2, 3].map(i => kit.mesh(new THREE.BoxGeometry(0.34, 0.16, 0.34), kit.mat(0x495057, { metalness: 0.4, roughness: 0.4 }), [i % 2 ? 0.19 : -0.19, 0.53 + Math.floor(i / 2) * 0.17, 0], cart));
  const kBars = barBoard(kG, 3.0, 2.4, 0, 2.2, -1.2);
  const cartTag = tag('', anchor(cart, 0, 1.05, 0), 'warm');

  // ======================= 1. Gravitational potential energy: a lifted ball =======================
  const pG = demo();
  const sand = kit.mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.12, 32), kit.mat(0xe9cf94, { roughness: 1 }), [0, 0.06, 0], pG);
  sand.castShadow = false;
  ruler(pG, 5, -1.0, 0);
  kit.mesh(new THREE.BoxGeometry(0.16, 6.1, 0.16), steel, [1.3, 3.05, -0.3], pG);
  kit.mesh(new THREE.BoxGeometry(1.6, 0.14, 0.14), steel, [0.55, 6.05, -0.3], pG);
  kit.mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5), steel, [0, 6.0, -0.1], pG);
  const rope = kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), kit.mat(0x6b4f3a), [0, 0, 0], pG);
  const BALL_R = 0.22;
  const ball = kit.mesh(new THREE.SphereGeometry(BALL_R, 24, 16), kit.mat(0x1f7ae0, { roughness: 0.35 }), [0, 3, 0], pG);
  const hLine = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x1f7ae0 }));
  pG.add(hLine);
  const pBars = barBoard(pG, 3.0, 2.6, 3.3, 2.5, -0.4, -0.25);
  const ballTag = tag('', anchor(pG, 0, 0, 0), 'cool');

  // ======================= 2. Pendulum =======================
  const wG = demo();
  for (const x of [-3.3, 3.3]) kit.mesh(new THREE.BoxGeometry(0.14, PEND.py + 0.2, 0.14), woodMat, [x, (PEND.py + 0.2) / 2, -0.4], wG);
  kit.mesh(new THREE.BoxGeometry(6.8, 0.16, 0.16), woodMat, [0, PEND.py + 0.2, -0.4], wG);
  kit.mesh(new THREE.BoxGeometry(0.14, 0.14, 0.5), steel, [0, PEND.py + 0.1, -0.2], wG);
  const pendulum = new THREE.Group(); pendulum.position.set(0, PEND.py, 0); wG.add(pendulum);
  kit.mesh(new THREE.CylinderGeometry(0.012, 0.012, PEND.L, 6), kit.mat(0x343a40), [0, -PEND.L / 2, 0], pendulum);
  const bob = kit.mesh(new THREE.SphereGeometry(0.28, 24, 16), kit.mat(0xf59f00, { metalness: 0.3, roughness: 0.35 }), [0, -PEND.L, 0], pendulum);
  const lowY = PEND.py - PEND.L;
  const dash = (len, color) => {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-len / 2, 0, 0), new THREE.Vector3(len / 2, 0, 0)]);
    const l = new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: 0.15, gapSize: 0.1 }));
    l.computeLineDistances(); return l;
  };
  const topLine = dash(6.2, 0x1f7ae0); wG.add(topLine);
  const lowLine = dash(6.2, 0x868e96); lowLine.position.set(0, lowY, 0); wG.add(lowLine);
  const wBars = barBoard(wG, 3.0, 2.6, 5.5, 2.5, -0.2, -0.35);
  const sameTag = tag('Same height both sides', anchor(wG, -2.0, 0, 0.2), 'cool');
  const bobTag = tag('', anchor(bob, 0, 0.35, 0), 'warm');

  // ======================= 3. Skate ramp (half-pipe) =======================
  const sG = demo();
  const skY = x => SK.c * x * x, skD = x => 2 * SK.c * x;
  {
    const nx = 64, geo = new THREE.PlaneGeometry(1, 1, nx, 1), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) + 0.5, side = pos.getY(i) > 0 ? -1 : 1, x = -SK.X + u * 2 * SK.X;
      pos.setXYZ(i, x, skY(x), side * 1.0);
    }
    geo.computeVertexNormals();
    const rampTex = paint(THREE, 256, 64, (g, w, h) => {
      g.fillStyle = '#d9a86c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#b8864d'; g.lineWidth = 2;
      for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke(); }
    });
    kit.mesh(geo, kit.mat(0xffffff, { map: rampTex, side: THREE.DoubleSide, roughness: 0.7 }), [0, 0.02, 0], sG);
    const shape = new THREE.Shape();
    shape.moveTo(-SK.X, 0);
    for (let i = 0; i <= 40; i++) { const x = -SK.X + i / 40 * 2 * SK.X; shape.lineTo(x, skY(x)); }
    shape.lineTo(SK.X, 0); shape.lineTo(-SK.X, 0);
    const side = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false, curveSegments: 4 });
    for (const z of [1.0, -1.08]) kit.mesh(side, kit.mat(0x8d6e4c, { roughness: 0.8 }), [0, 0, z], sG);
  }
  // Arc length table for the half-pipe: s ↔ x.
  const SKN = 600, skX = new Float32Array(SKN + 1), skS = new Float32Array(SKN + 1);
  for (let i = 0; i <= SKN; i++) {
    skX[i] = -SK.X + i / SKN * 2 * SK.X;
    if (i) skS[i] = skS[i - 1] + Math.hypot(skX[i] - skX[i - 1], skY(skX[i]) - skY(skX[i - 1]));
  }
  const skater = new THREE.Group(); sG.add(skater);
  kit.mesh(new THREE.BoxGeometry(0.7, 0.05, 0.22), kit.mat(0x2b2f36), [0, 0.08, 0], skater);
  for (const x of [-0.24, 0.24]) kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 10), kit.mat(0xffd43b), [x, 0.04, 0], skater).rotation.x = Math.PI / 2;
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 8), kit.mat(0x364fc7), [-0.08, 0.36, 0], skater);
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 8), kit.mat(0x364fc7), [0.08, 0.36, 0], skater);
  kit.mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.55, 12), kit.mat(0xe03131), [0, 0.86, 0], skater);
  kit.mesh(new THREE.SphereGeometry(0.13, 16, 12), kit.mat(0xf1c27d), [0, 1.27, 0], skater);
  kit.mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(0x2f9e44), [0, 1.3, 0], skater);
  const sBars = barBoard(sG, 3.8, 2.7, 0, 3.0, -1.9);
  const heatGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xff6b3d, transparent: true, opacity: 0, depthWrite: false }));
  heatGlow.visible = false; sG.add(heatGlow);
  const skTag = tag('', anchor(skater, 0, 1.75, 0), 'warm');

  // ======================= 4. Roller coaster =======================
  const cG = demo();
  const CX0 = -7.2, CX1 = 8.5, CN = 1000, BRAKE_X = 5.2;
  const coX = new Float32Array(CN + 1), coYa = new Float32Array(CN + 1), coS = new Float32Array(CN + 1);
  let coKeys = [];
  function coY(x) {
    const k = coKeys;
    if (x <= k[0][0]) return k[0][1];
    for (let i = 0; i < k.length - 1; i++) if (x <= k[i + 1][0]) {
      const t = (x - k[i][0]) / (k[i + 1][0] - k[i][0]);
      return k[i][1] + (k[i + 1][1] - k[i][1]) * (1 - Math.cos(Math.PI * t)) / 2;
    }
    return k[k.length - 1][1];
  }
  const NSEG = 160, NSUP = 18;
  const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 6);
  const rails = new THREE.InstancedMesh(railGeo, kit.mat(0xd6336c, { roughness: 0.4, metalness: 0.2 }), NSEG * 2);
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.05, 0.8), kit.mat(0x5c3d2e), NSEG / 2);
  const supports = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), kit.mat(0xadb5bd, { metalness: 0.3 }), NSUP * 2);
  for (const im of [rails, ties, supports]) { im.frustumCulled = false; im.castShadow = true; cG.add(im); }
  function buildCoaster(h2) {
    coKeys = [[CX0, CO.start], [-6, CO.start], [-3, 0.5], [0, h2], [3, 0.5], [5.0, 2.0], [CX1, 2.0]];
    for (let i = 0; i <= CN; i++) {
      coX[i] = CX0 + i / CN * (CX1 - CX0); coYa[i] = coY(coX[i]);
      if (i) coS[i] = coS[i - 1] + Math.hypot(coX[i] - coX[i - 1], coYa[i] - coYa[i - 1]);
    }
    const seg = (idx, x0, x1, z) => {
      v1.set(x0, coY(x0), z); v2.set(x1, coY(x1), z);
      sc.subVectors(v2, v1); const len = sc.length(); sc.divideScalar(len);
      q.setFromUnitVectors(upY, sc);
      v1.add(v2).multiplyScalar(0.5);
      m4.compose(v1, q, sc.set(1, len + 0.02, 1));
      rails.setMatrixAt(idx, m4);
    };
    for (let i = 0; i < NSEG; i++) {
      const x0 = CX0 + i / NSEG * (CX1 - CX0), x1 = CX0 + (i + 1) / NSEG * (CX1 - CX0);
      seg(i * 2, x0, x1, -0.32); seg(i * 2 + 1, x0, x1, 0.32);
    }
    for (let i = 0; i < NSEG / 2; i++) {
      const x = CX0 + (i * 2 + 1) / NSEG * (CX1 - CX0), y = coY(x), sl = (coY(x + 0.01) - coY(x - 0.01)) / 0.02;
      q.setFromAxisAngle(v2.set(0, 0, 1), Math.atan(sl));
      m4.compose(v1.set(x, y - 0.04, 0), q, sc.set(1, 1, 1));
      ties.setMatrixAt(i, m4);
    }
    for (let i = 0; i < NSUP; i++) {
      const x = CX0 + 0.3 + i / (NSUP - 1) * (CX1 - CX0 - 0.6), h = coY(x) - 0.06;
      for (const [j, z] of [[0, -0.32], [1, 0.32]]) {
        m4.compose(v1.set(x, h / 2, z), q.identity(), sc.set(1, Math.max(0.01, h), 1));
        supports.setMatrixAt(i * 2 + j, m4);
      }
    }
    rails.instanceMatrix.needsUpdate = ties.instanceMatrix.needsUpdate = supports.instanceMatrix.needsUpdate = true;
  }
  const coCar = new THREE.Group(); cG.add(coCar);
  kit.mesh(new THREE.BoxGeometry(0.9, 0.35, 0.7), kit.mat(0x1c7ed6, { roughness: 0.4 }), [0, 0.28, 0], coCar);
  kit.mesh(new THREE.BoxGeometry(0.15, 0.3, 0.7), kit.mat(0xffd43b), [0.38, 0.52, 0], coCar);
  for (const x of [-0.12, 0.2]) kit.mesh(new THREE.SphereGeometry(0.12, 12, 8), kit.mat(0xf1c27d), [x, 0.6, 0], coCar);
  for (const [x, z] of [[-0.3, -0.32], [0.3, -0.32], [-0.3, 0.32], [0.3, 0.32]]) kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), kit.mat(0x343a40), [x, 0.08, z], coCar).rotation.x = Math.PI / 2;
  const brakeZone = kit.mesh(new THREE.BoxGeometry(CX1 - BRAKE_X, 0.04, 0.5), kit.mat(0xf08c00, { emissive: 0xff4400, emissiveIntensity: 0 }), [(CX1 + BRAKE_X) / 2, 2.0 - 0.02, 0], cG);
  brakeZone.castShadow = false;
  const startLine = dash(16, 0x1f7ae0); startLine.position.set(0.65, CO.start, -0.5); cG.add(startLine);
  const cBars = barBoard(cG, 4.4, 3.0, 3.4, 4.6, -2.6);
  const startTag = tag('Start height 5 m', anchor(cG, -5.0, CO.start + 0.45, 0), 'cool');
  const hillTag = tag('', anchor(cG, 0, 0, 0));
  const brakeTag = tag('Brakes', anchor(cG, 7.0, 2.35, 0.3), 'warm');

  // ======================= 5. Spring launcher =======================
  const eG = demo();
  kit.mesh(new THREE.CylinderGeometry(0.4, 0.45, SP.base, 24), kit.mat(0x495057, { roughness: 0.5 }), [0, SP.base / 2, 0], eG);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  tube.position.y = SP.base + 0.5; tube.renderOrder = 2; eG.add(tube);
  const coil = makeCoil(THREE, kit.mat(0xadb5bd, { metalness: 0.7, roughness: 0.3 }), { turns: 9, radius: 0.18, wire: 0.03 });
  coil.rotation.x = Math.PI; coil.position.y = SP.base; eG.add(coil);
  const plate = kit.mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 20), kit.mat(0xe03131), [0, 0, 0], eG);
  const SB_R = 0.13;
  const sBall = kit.mesh(new THREE.SphereGeometry(SB_R, 20, 14), kit.mat(0x37b24d, { roughness: 0.35 }), [0, 0, 0], eG);
  const eRuler = ruler(eG, 4.5, -0.7, 0, 0.5);
  const peakLine = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x7048e8 }));
  eG.add(peakLine);
  const eBars = barBoard(eG, 3.0, 2.6, 2.4, 2.4, -0.4, -0.25);
  const eTag = tag('', anchor(eG, 0, 0, 0), 'cool');

  // ======================= state =======================
  const st = {
    step: 0, quiz: false, t: 0, plan: [],
    km: 2, kv: 4, kx: -TRACK,
    pm: 2, ph: 3, drop: false, dy: 3, dv: 0, landT: 0,
    th0: 45, th: 0, om: 0,
    skH: 4, fric: false, s: 0, v: 0, Eth: 0, E0: 0,
    h2: 4, cs: 0, cv: 0, cEth: 0, cE0: 0,
    sx: 0.15, sxNow: 0, phase: 'hold', y: 0, yv: 0, auto: true, holdT: 0,
  };
  const showOnly = g => demos.forEach(d => { d.visible = d === g; });

  // ---------- 0 ----------
  function setCart() {
    const Ek = 0.5 * st.km * st.kv * st.kv;
    blocks.forEach((b, i) => { b.visible = i < st.km; });
    kBars.set([{ key: 'Ek', value: Ek }], 128);
    cartTag.text = `${st.km} kg · ${st.kv} m/s`;
    ui.readout(`Ek = ½ · m · v² = ½ × ${st.km} kg × (${st.kv} m/s)² = <b>${num(Ek)} J</b>`
      + `<br>At ${st.kv * 2 <= 8 ? st.kv * 2 : st.kv / 2} m/s it would be <b>${num(0.5 * st.km * (st.kv * 2 <= 8 ? st.kv * 2 : st.kv / 2) ** 2)} J</b> (${st.kv * 2 <= 8 ? '4 times as much' : 'a quarter'}).`);
  }
  // ---------- 1 ----------
  function setLift() {
    st.drop = false; st.dy = st.ph; st.dv = 0;
    placeBall();
    const Ep = st.pm * G * st.ph;
    ui.readout(`Ep = m · g · h = ${st.pm} kg × 10 N/kg × ${num(st.ph)} m = <b>${num(Ep)} J</b>`);
  }
  function placeBall() {
    const y = st.dy + BALL_R;
    ball.position.y = y;
    const top = st.drop ? st.ph + 2 * BALL_R : y + BALL_R;
    rope.scale.y = Math.max(0.01, 5.9 - top); rope.position.y = (5.9 + top) / 2;
    hLine.position.set(-0.35, st.ph, 0);
    ballTag.at.position.set(0.55, st.ph + 0.25, 0);
    const Ep = st.pm * G * st.dy, Ek = st.pm * G * (st.ph - st.dy);
    ballTag.text = `h = ${num(st.ph)} m`;
    pBars.set([{ key: 'Ep', value: Ep }, { key: 'Ek', value: Ek }, { key: 'Total', value: Ep + Ek }], 250);
  }
  // ---------- 2 ----------
  function setPend(a) {
    st.th0 = a; st.th = a * Math.PI / 180; st.om = 0;
    topLine.position.set(0, PEND.py - PEND.L * Math.cos(st.th), 0);
    sameTag.at.position.set(-2.0, topLine.position.y + 0.25, 0.2);
  }
  function pendEnergies() {
    const E = PEND.m * G * PEND.L * (1 - Math.cos(st.th0 * Math.PI / 180)), Ep = PEND.m * G * PEND.L * (1 - Math.cos(st.th));
    return { E, Ep, Ek: Math.max(0, E - Ep) };
  }
  // ---------- 3 ----------
  const skAt = s => {    // x at arc length s
    s = clamp(s, 0, skS[SKN]);
    let lo = 0, hi = SKN;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (skS[mid] < s) lo = mid; else hi = mid; }
    return skX[lo] + (skX[hi] - skX[lo]) * (s - skS[lo]) / Math.max(1e-9, skS[hi] - skS[lo]);
  };
  const sOfX = (xs, ss, n, x) => { let i = 0; while (i < n && xs[i + 1] < x) i++; return ss[i] + (ss[i + 1] - ss[i]) * (x - xs[i]) / (xs[i + 1] - xs[i]); };
  function startSkate() {
    const x0 = -Math.sqrt(st.skH / SK.c);
    st.s = sOfX(skX, skS, SKN, x0); st.v = 0; st.Eth = 0; st.E0 = SK.m * G * st.skH;
  }
  // ---------- 4 ----------
  const coAt = s => {
    s = clamp(s, 0, coS[CN]);
    let lo = 0, hi = CN;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (coS[mid] < s) lo = mid; else hi = mid; }
    return coX[lo] + (coX[hi] - coX[lo]) * (s - coS[lo]) / Math.max(1e-9, coS[hi] - coS[lo]);
  };
  function startCoaster() {
    st.cs = sOfX(coX, coS, CN, CO.x0); st.cv = CO.v0; st.cEth = 0;
    st.cE0 = CO.m * G * CO.start + 0.5 * CO.m * CO.v0 * CO.v0;
  }
  function coReadout() {
    const ok = st.h2 < CO.start;
    ui.readout(`Start: <b>5 m</b> · second hill: <b>${num(st.h2)} m</b><br>`
      + (ok ? 'Lower than the start, so the car has enough energy to get over.' : '<b>Not lower</b> than the start: the car cannot get over and rolls back.'));
  }
  // ---------- 5 ----------
  const springTop = x => SP.base + SP.L0 - x;
  function springEnergy(x) { return 0.5 * SP.k * x * x; }
  function eReadout() {
    const Ee = springEnergy(st.sx), h = Ee / (SP.m * G);
    ui.readout(`Ee = ½ · k · x² = ½ × 400 N/m × (${st.sx.toFixed(2)} m)² = <b>${num(Ee)} J</b><br>`
      + `Height gained: h = Ee / (m · g) = ${num(Ee)} J ÷ (0.2 kg × 10 N/kg) = <b>${(h).toFixed(2)} m</b>`);
    eRuler.position.y = eRuler.y0 + springTop(st.sx) + SB_R + 0.025;
    peakLine.position.set(0.2, springTop(st.sx) + SB_R + 0.025 + h, 0);
    eTag.at.position.set(0.95, peakLine.position.y + 0.15, 0);
    eTag.text = `+${h.toFixed(2)} m`;
  }

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.t = 0; st.plan = [];
      for (const l of labels) l.show(false);
      if (i === 0) {
        showOnly(kG);
        view({ radius: 3.0, width: 4.9, yaw: 0.1, pitch: 0.25, target: [0, 1.5, 0] });
        cartTag.show(true);
        ui.slider({ label: 'Mass m', min: 1, max: 4, step: 1, value: st.km, unit: ' kg', onInput: v => { st.km = v; setCart(); } });
        ui.slider({ label: 'Speed v', min: 1, max: 8, step: 1, value: st.kv, unit: ' m/s', onInput: v => { st.kv = v; setCart(); } });
        setCart();
      }
      if (i === 1) {
        showOnly(pG);
        view({ radius: 3.6, width: 3.2, yaw: 0.2, pitch: 0.15, target: [1.1, 3.0, 0] });
        ballTag.show(true);
        ui.slider({ label: 'Mass m', min: 1, max: 5, step: 1, value: st.pm, unit: ' kg', onInput: v => { st.pm = v; setLift(); } });
        ui.slider({ label: 'Height h', min: 0, max: 5, step: 0.5, value: st.ph, unit: ' m', format: num, onInput: v => { st.ph = v; setLift(); } });
        ui.buttons([{ label: 'Drop it', onClick: () => { st.plan = []; if (!st.drop) { setLift(); st.drop = true; } } }]);
        setLift();
        st.plan = [[1.2, () => { st.drop = true; }]];
      }
      if (i === 2) {
        showOnly(wG);
        view({ radius: 3.4, width: 5.4, yaw: 0.1, pitch: 0.12, target: [1.0, 2.6, 0] });
        sameTag.show(true); bobTag.show(true);
        ui.slider({ label: 'Release angle', min: 10, max: 70, step: 5, value: st.th0, unit: '°', onInput: v => setPend(v) });
        setPend(st.th0);
      }
      if (i === 3) {
        showOnly(sG);
        view({ radius: 3.6, width: 4.6, yaw: 0.0, pitch: 0.2, target: [0, 2.2, 0] });
        skTag.show(true);
        st.fric = false;
        ui.toggle({ label: 'Friction', value: false, onChange: v => { st.fric = v; } });
        ui.slider({ label: 'Start height', min: 1, max: 4, step: 0.5, value: st.skH, unit: ' m', format: num, onInput: v => { st.skH = v; startSkate(); } });
        ui.buttons([{ label: 'Start again', onClick: () => startSkate() }]);
        startSkate();
      }
      if (i === 4) {
        showOnly(cG);
        view({ radius: 4.2, width: 8.2, yaw: 0.0, pitch: 0.18, target: [0.65, 2.8, 0] });
        startTag.show(true); hillTag.show(true); brakeTag.show(true);
        const setH = v => { st.h2 = v; buildCoaster(v); hillTag.at.position.set(0, v + 0.85, 0); hillTag.text = `Hill ${num(v)} m`; startCoaster(); coReadout(); };
        ui.slider({ label: 'Second hill height', min: 2, max: 6, step: 0.5, value: st.h2, unit: ' m', format: num, onInput: setH });
        ui.buttons([{ label: 'Start again', onClick: () => startCoaster() }]);
        setH(st.h2);
      }
      if (i === 5) {
        showOnly(eG);
        view({ radius: 3.3, width: 2.6, yaw: 0.15, pitch: 0.12, target: [0.9, 3.0, 0] });
        eTag.show(true);
        st.auto = true; st.phase = 'squash'; st.sxNow = 0; st.holdT = 0;
        ui.slider({ label: 'Squash the spring x', min: 0.02, max: 0.2, step: 0.01, value: st.sx, unit: ' m', format: v => v.toFixed(2), onInput: v => { st.auto = false; st.sx = v; st.phase = 'squash'; eReadout(); } });
        ui.buttons([{ label: 'Release', onClick: () => { st.auto = false; if (st.phase === 'hold' || st.phase === 'squash') { st.sxNow = st.sx; st.phase = 'launch'; st.y = 0; } } }]);
        eReadout();
      }
      if (isQuiz) {
        showOnly(sG);
        view({ radius: 3.8, width: 4.8, yaw: -0.3, pitch: 0.28, target: [0, 2.0, 0] });
        st.fric = false; st.skH = 4; startSkate();
      }
    },

    update(dt, t) {
      st.t += dt;
      while (st.plan.length && st.t >= st.plan[0][0]) st.plan.shift()[1]();
      const s = st.step;
      if (s === 0) {
        st.kx += st.kv * 0.55 * dt;
        if (st.kx > TRACK) st.kx = -TRACK;
        cart.position.x = st.kx;
        wheels.forEach(w => { w.rotation.y -= st.kv * 0.55 * dt / 0.11; });
        return true;
      }
      if (s === 1) {
        if (st.drop) {
          if (st.dy > 0) {
            st.dv -= G * dt; st.dy = Math.max(0, st.dy + st.dv * dt);
            if (st.dy === 0) st.landT = st.t;
            placeBall();
            if (st.dy === 0) ui.readout(`Just before it lands: Ek = ${num(st.pm * G * st.ph)} J, speed v = <b>${Math.sqrt(2 * G * st.ph).toFixed(1)} m/s</b>. All the Ep has become Ek.`);
          } else if (st.t - st.landT > 1.6) setLift();
        }
        return true;
      }
      if (s === 2) {
        const n = Math.ceil(dt * 240), h = dt / n;
        for (let k = 0; k < n; k++) { st.om -= (G / PEND.L) * Math.sin(st.th) * h; st.th += st.om * h; }
        pendulum.rotation.z = st.th;
        const { E, Ep, Ek } = pendEnergies();
        wBars.set([{ key: 'Ep', value: Ep }, { key: 'Ek', value: Ek }, { key: 'Total', value: Ep + Ek }], 50);
        bobTag.text = `v = ${Math.sqrt(2 * Ek / PEND.m).toFixed(1)} m/s`;
        if (Math.floor((st.t - dt) * 5) !== Math.floor(st.t * 5)) ui.readout(`Ep = m · g · h, with h measured from the lowest point.<br>Ep <b>${num(Ep)} J</b> + Ek <b>${num(Ek)} J</b> = <b>${num(E)} J</b> (never changes)`);
        return true;
      }
      if (s === 3 || st.quiz) {
        const n = Math.ceil(dt * 240), h = dt / n, sMax = skS[SKN];
        for (let k = 0; k < n; k++) {
          const x = skAt(st.s), d = skD(x), sin = d / Math.sqrt(1 + d * d);
          let a = -G * sin;
          if (st.fric) {
            const f = SK.mu * G;
            if (Math.abs(st.v) < 0.03 && Math.abs(G * sin) < f) { st.v = 0; a = 0; } else a -= Math.sign(st.v || -sin) * f;
          }
          st.v += a * h;
          const ds = st.v * h;
          st.s = clamp(st.s + ds, 0, sMax);
          if (st.fric) st.Eth += SK.mu * SK.m * G * Math.abs(ds);
          // Keep the total exact: the speed always matches the energy that is left as kinetic energy.
          const Ek = st.E0 - SK.m * G * skY(skAt(st.s)) - st.Eth;
          st.v = Math.sign(st.v) * Math.sqrt(Math.max(0, 2 * Ek / SK.m));
        }
        const x = skAt(st.s), y = skY(x), ang = Math.atan(skD(x));
        skater.position.set(x, y + 0.02, 0); skater.rotation.z = ang;
        const Ep = SK.m * G * y, Ek = Math.max(0, st.E0 - Ep - st.Eth);
        sBars.set([{ key: 'Ep', value: Ep }, { key: 'Ek', value: Ek }, { key: 'Eth', value: st.Eth }, { key: 'Total', value: Ep + Ek + st.Eth }], 2000);
        skTag.text = `${Math.abs(st.v).toFixed(1)} m/s`;
        if (s === 3 && !st.quiz && Math.floor((st.t - dt) * 5) !== Math.floor(st.t * 5)) {
          ui.readout(`Skater: 50 kg · Ep + Ek${st.fric ? ' + thermal' : ''} = ${comma(Ep)} + ${comma(Ek)}${st.fric ? ` + ${comma(st.Eth)}` : ''} = <b>${comma(st.E0)} J</b>`
            + (st.fric ? '<br>Friction turns some energy into <b>thermal energy</b> (wheels and ramp warm up), so the skater goes less high each time.' : '<br>No friction: the skater comes back up to the start height every time.'));
        }
        return true;
      }
      if (s === 4) {
        const n = Math.ceil(dt * 240), h = dt / n, sMax = coS[CN];
        for (let k = 0; k < n; k++) {
          const x = coAt(st.cs), d = (coY(x + 0.005) - coY(x - 0.005)) / 0.01, sin = d / Math.sqrt(1 + d * d);
          let a = -G * sin;
          const braking = x > BRAKE_X;
          if (braking) { if (Math.abs(st.cv) < 0.05) { st.cv = 0; a = 0; } else a -= Math.sign(st.cv) * CO.brake; }
          st.cv += a * h;
          const ds = st.cv * h;
          st.cs += ds;
          if (braking) st.cEth += CO.m * CO.brake * Math.abs(ds);
          if (st.cs <= 0) { st.cs = 0; st.cv = Math.abs(st.cv); }
          if (st.cs >= sMax) { st.cs = sMax; st.cv = 0; st.cEth = st.cE0 - CO.m * G * coY(coAt(sMax)); }   // the end buffer takes the rest
          const Ek = st.cE0 - CO.m * G * coY(coAt(st.cs)) - st.cEth;
          st.cv = Math.sign(st.cv) * Math.sqrt(Math.max(0, 2 * Ek / CO.m));
        }
        const x = coAt(st.cs), y = coY(x), ang = Math.atan((coY(x + 0.01) - coY(x - 0.01)) / 0.02);
        coCar.position.set(x, y, 0); coCar.rotation.z = ang;
        const Ep = CO.m * G * y, Ek = Math.max(0, st.cE0 - Ep - st.cEth);
        brakeZone.material.emissiveIntensity = x > BRAKE_X && Math.abs(st.cv) > 0.05 ? 0.8 : 0;
        cBars.set([{ key: 'Ep', value: Ep }, { key: 'Ek', value: Ek }, { key: 'Eth', value: st.cEth }, { key: 'Total', value: Ep + Ek + st.cEth }], 26000, 'kJ', 1000);
        return true;
      }
      if (s === 5) {
        let Ee = 0, Ep = 0, Ek = 0;
        const base = springTop(0) + SB_R + 0.025;          // ball height when the spring is relaxed
        if (st.phase === 'squash') {
          kit.follow(st, 'sxNow', st.sx, dt, 4);
          Ee = springEnergy(st.sxNow);
          sBall.position.y = springTop(st.sxNow) + SB_R + 0.025;
          if (Math.abs(st.sxNow - st.sx) < 0.002) { st.phase = 'hold'; st.holdT = st.t; }
        } else if (st.phase === 'hold') {
          Ee = springEnergy(st.sx);
          if (st.auto && st.t - st.holdT > 1.0) { st.sxNow = st.sx; st.phase = 'launch'; st.y = 0; }
        } else if (st.phase === 'launch') {
          // The spring springs back in a moment; its elastic energy becomes the ball's energy.
          st.sxNow = Math.max(0, st.sxNow - dt * 3);
          const E0 = springEnergy(st.sx), rise = st.sx - st.sxNow;
          Ee = springEnergy(st.sxNow); Ep = SP.m * G * rise; Ek = Math.max(0, E0 - Ee - Ep);
          sBall.position.y = springTop(st.sxNow) + SB_R + 0.025;
          if (st.sxNow === 0) { st.phase = 'fly'; st.y = sBall.position.y; st.yv = Math.sqrt(2 * Ek / SP.m); }
        } else if (st.phase === 'fly') {
          const E0 = springEnergy(st.sx), y0 = springTop(st.sx) + SB_R + 0.025;
          st.yv -= G * dt; st.y += st.yv * dt;
          sBall.position.y = st.y;
          Ep = SP.m * G * (st.y - y0); Ek = Math.max(0, E0 - Ep);
          if (st.y <= base && st.yv < 0) { st.phase = 'squash'; st.sxNow = 0; sBall.position.y = base; Ep = SP.m * G * (base - y0); Ek = 0; }
        }
        coil.setLength(SP.L0 - st.sxNow);
        plate.position.y = springTop(st.sxNow);
        if (st.phase === 'squash' || st.phase === 'hold') sBall.position.y = springTop(st.sxNow) + SB_R + 0.025;
        eBars.set([{ key: 'Ee', value: Ee }, { key: 'Ek', value: Ek }, { key: 'Ep', value: Ep }, { key: 'Total', value: Ee + Ek + Ep }], 8);
        return true;
      }
      return false;
    },
  };
}
