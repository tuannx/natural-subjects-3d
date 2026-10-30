// Circuit helpers for the middle-school electricity lessons. Parts are laid out on a flat board in the x–z
// plane: each part's two terminals sit on its local x axis at wire height (y = 0 in the part's group), so a
// part is placed by moving its group onto a wire and turning it with rotation.y. Wires are drawn first as
// closed loops; parts sit on top and hide the wire underneath. Charge dots run along a path through the
// wires (they pass hidden through the parts). Build everything once in setup; nothing here allocates per
// frame, and a meter display or schematic only redraws when its text changes.
import { paint } from './lab.js';

// A wire along a polyline of [x, y, z] points (closed: back to the first point). Thin cylinders + round joints.
export function wire(THREE, pts, { radius = 0.035, color = 0xd1453b, closed = false } = {}) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const cyl = new THREE.CylinderGeometry(radius, radius, 1, 8), ball = new THREE.SphereGeometry(radius, 8, 6);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    a.set(...pts[i]); b.set(...pts[(i + 1) % pts.length]);
    d.subVectors(b, a);
    const len = d.length();
    if (len < 1e-6) continue;
    const c = new THREE.Mesh(cyl, m);
    c.scale.y = len;
    c.position.addVectors(a, b).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(up, d.normalize());
    c.castShadow = true;
    g.add(c);
    const j = new THREE.Mesh(ball, m); j.position.copy(a); g.add(j);
  }
  if (!closed) { const j = new THREE.Mesh(ball, m); j.position.set(...pts[pts.length - 1]); g.add(j); }
  g.material = m;
  return g;
}

// A path along a polyline of [x, y, z] points, measured by distance; closed paths wrap around.
// path.at(s, out) writes the point at distance s into the Vector3 `out`.
export function polyPath(pts, closed = true) {
  const P = pts.map(p => p.slice()), n = closed ? P.length : P.length - 1, cum = [0];
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  const length = cum[n];
  return {
    length,
    at(s, out) {
      s = closed ? ((s % length) + length) % length : Math.max(0, Math.min(length, s));
      let i = 0;
      while (i < n - 1 && cum[i + 1] < s) i++;
      const a = P[i], b = P[(i + 1) % P.length], f = (s - cum[i]) / Math.max(1e-9, cum[i + 1] - cum[i]);
      return out.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    },
  };
}

// Dots that move along a closed path (moving charges). dots.advance(ds) moves them all by ds along the path
// (negative = backwards). Equal spacing, so the count is fixed by the path length.
export function chargeDots(THREE, path, { spacing = 0.32, radius = 0.06, color = 0x2f80ed } = {}) {
  const n = Math.max(1, Math.round(path.length / spacing)), gap = path.length / n;
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 10, 8), new THREE.MeshBasicMaterial({ color }), n);
  mesh.frustumCulled = false;
  const v = new THREE.Vector3(), m4 = new THREE.Matrix4();
  let off = 0;
  mesh.advance = ds => {
    off += ds;
    for (let i = 0; i < n; i++) { path.at(off + i * gap, v); mesh.setMatrixAt(i, m4.makeTranslation(v.x, v.y, v.z)); }
    mesh.instanceMatrix.needsUpdate = true;
  };
  mesh.advance(0);
  return mesh;
}

// A small flat sign texture with one or two characters (for + and − on cells, A and V on meters).
function signTex(THREE, text, bg, fg, size = 64) {
  return paint(THREE, size, size, (g, w, h) => {
    g.fillStyle = bg; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = fg; g.font = `800 ${Math.round(w * 0.62)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

// A battery holder with `slots` cells end to end along x; the + terminal is at +x. setCells(n) shows n cells
// (the others are bridged by a copper strip). length = holder length; plus / minus = terminal anchors.
export function battery(THREE, kit, { slots = 4, cell = 0.62, r = 0.15 } = {}) {
  const g = new THREE.Group(), L = slots * cell;
  kit.mesh(new THREE.BoxGeometry(L + 0.16, 0.12, r * 2 + 0.12), kit.mat(0x2b2f36, { roughness: 0.6 }), [0, -r + 0.02, 0], g);
  const body = kit.mat(0x2a6fdb, { roughness: 0.4, metalness: 0.2 }), cap = kit.mat(0xd8a93a, { roughness: 0.3, metalness: 0.6 });
  const plusTex = signTex(THREE, '+', '#e63946', '#ffffff'), minusTex = signTex(THREE, '−', '#1d2b36', '#ffffff');
  const cells = [], strips = [];
  for (let i = 0; i < slots; i++) {
    const x = -L / 2 + cell * (i + 0.5);
    const c = new THREE.Group(); c.position.x = x; g.add(c);
    kit.mesh(new THREE.CylinderGeometry(r, r, cell * 0.86, 20), body, [0, 0, 0], c).rotation.z = Math.PI / 2;
    kit.mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, cell * 0.1, 12), cap, [cell * 0.47, 0, 0], c).rotation.z = Math.PI / 2;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.3, r * 1.3), new THREE.MeshBasicMaterial({ map: plusTex, transparent: true }));
    s.rotation.x = -Math.PI / 2; s.position.set(cell * 0.25, r + 0.003, 0); c.add(s);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.1, r * 1.1), new THREE.MeshBasicMaterial({ map: minusTex, transparent: true }));
    s2.rotation.x = -Math.PI / 2; s2.position.set(-cell * 0.25, r + 0.003, 0); c.add(s2);
    cells.push(c);
    strips.push(kit.mesh(new THREE.BoxGeometry(cell * 0.9, 0.03, 0.08), cap, [x, -r + 0.1, 0], g));
  }
  g.length = L;
  g.plus = new THREE.Object3D(); g.plus.position.set(L / 2 + 0.1, 0.2, 0); g.add(g.plus);
  g.minus = new THREE.Object3D(); g.minus.position.set(-L / 2 - 0.1, 0.2, 0); g.add(g.minus);
  g.mid = new THREE.Object3D(); g.mid.position.set(0, r + 0.25, 0); g.add(g.mid);
  g.setCells = n => cells.forEach((c, i) => { const on = i >= slots - n; c.visible = on; strips[i].visible = !on; });
  g.setCells(slots);
  return g;
}

// A bulb in a holder; terminals at x = ±0.22. bulb.set(b) glows from 0 (off) to about 1 (full), more is
// brighter still. bulb.out(true) lifts the glass bulb out of its holder (the circuit is broken there).
export function bulb(THREE, kit, { color = 0xffd36b } = {}) {
  const g = new THREE.Group();
  kit.mesh(new THREE.BoxGeometry(0.5, 0.12, 0.38), kit.mat(0x6b4f3a, { roughness: 0.7 }), [0, -0.06, 0], g);
  kit.mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 16), kit.mat(0x9aa4ad, { metalness: 0.6, roughness: 0.3 }), [0, 0.08, 0], g);
  const top = new THREE.Group(); top.position.y = 0.16; g.add(top);
  kit.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16), kit.mat(0xc9ced3, { metalness: 0.7, roughness: 0.3 }), [0, 0.06, 0], top);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xfffbe8, transparent: true, opacity: 0.45, roughness: 0.1, emissive: color, emissiveIntensity: 0, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), glassMat);
  glass.position.y = 0.34; glass.renderOrder = 2; top.add(glass);
  const filMat = new THREE.MeshBasicMaterial({ color: 0x5b4636 });
  const fil = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), filMat);
  fil.position.y = 0.32; top.add(fil);
  for (const x of [-0.06, 0.06]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4), filMat); w.position.set(x, 0.22, 0); top.add(w); }
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.y = 0.34; halo.renderOrder = 3; top.add(halo);
  const dark = new THREE.Color(0x5b4636), hot = new THREE.Color(0xfff3b0);
  g.anchor = new THREE.Object3D(); g.anchor.position.y = 0.75; top.add(g.anchor);
  g.top = top;
  g.level = 0;
  g.set = b => {
    b = Math.max(0, b); g.level = b;
    glassMat.emissiveIntensity = Math.min(1.6, b * 1.3);
    filMat.color.copy(dark).lerp(hot, Math.min(1, b * 2));
    halo.visible = b > 0.01;
    halo.material.opacity = Math.min(0.45, b * 0.35);
    halo.scale.setScalar(0.6 + Math.min(1.2, b) * 0.4);
  };
  g.out = (o, k = 1) => { top.position.set(o ? 0.25 * k : 0, 0.16 + (o ? 0.55 * k : 0), 0); top.rotation.z = o ? -0.5 * k : 0; };
  g.set(0);
  return g;
}

// A meter (ammeter 'A' or voltmeter 'V'): a box with a sloping display; terminals at x = ±0.38.
// meter.set(text) shows text on the display. meter.anchor sits above it for a label.
export function meter(THREE, kit, letter, { color = letter === 'A' ? '#1f7ae0' : '#d9480f' } = {}) {
  const g = new THREE.Group();
  kit.mesh(new THREE.BoxGeometry(0.76, 0.3, 0.6), kit.mat(0xf2f4f6, { roughness: 0.5 }), [0, 0.05, 0], g);
  const W = 256, H = 160, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.425), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  face.rotation.x = -Math.PI / 2 + 0.35; face.position.set(0, 0.215, 0.02); g.add(face);
  for (const x of [-0.3, 0.3]) kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), kit.mat(x < 0 ? 0x1d2b36 : 0xe63946), [x, 0.22, -0.22], g);
  let last = null;
  g.set = text => {
    if (text === last) return;
    last = text;
    ctx.fillStyle = '#1d2b36'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(52, H / 2, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 54px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(letter, 52, H / 2 + 3);
    ctx.fillStyle = '#9ff0b4'; ctx.font = '700 46px ui-monospace, monospace'; ctx.textAlign = 'right';
    ctx.fillText(text, W - 14, H / 2 + 3);
    tex.needsUpdate = true;
  };
  g.set('0.00');
  g.anchor = new THREE.Object3D(); g.anchor.position.set(0, 0.55, 0); g.add(g.anchor);
  g.face = face;
  return g;
}

// A knife switch; terminals at x = ±0.3. sw.set(closed) (instant) or sw.angle for an in-between position.
export function knifeSwitch(THREE, kit) {
  const g = new THREE.Group();
  kit.mesh(new THREE.BoxGeometry(0.7, 0.06, 0.3), kit.mat(0x3b4048), [0, -0.05, 0], g);
  const brass = kit.mat(0xd8a93a, { metalness: 0.6, roughness: 0.3 });
  kit.mesh(new THREE.BoxGeometry(0.06, 0.12, 0.12), brass, [-0.25, 0.03, 0], g);
  kit.mesh(new THREE.BoxGeometry(0.06, 0.12, 0.12), brass, [0.25, 0.03, 0], g);
  const lever = new THREE.Group(); lever.position.set(-0.25, 0.08, 0); g.add(lever);
  kit.mesh(new THREE.BoxGeometry(0.56, 0.03, 0.06), brass, [0.28, 0, 0], lever);
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 10), kit.mat(0x1d2b36), [0.56, 0.06, 0], lever);
  g.set = closed => { lever.rotation.z = closed ? 0 : 0.75; };
  g.lever = lever;
  g.anchor = new THREE.Object3D(); g.anchor.position.set(0, 0.5, 0); g.add(g.anchor);
  g.set(false);
  return g;
}

// A resistor with colour bands; terminals at x = ±0.35.
export function resistor(THREE, kit, bands = ['#a5562b', '#1d1d1d', '#d62828', '#d4af37']) {
  const g = new THREE.Group();
  const body = kit.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.46, 16), kit.mat(0xffffff, { map: paint(THREE, 32, 128, (c, w, h) => {
    c.fillStyle = '#e8d3a9'; c.fillRect(0, 0, w, h);
    bands.forEach((b, i) => { c.fillStyle = b; c.fillRect(0, 22 + i * 22 + (i === 3 ? 14 : 0), w, 11); });
  }), roughness: 0.6 }), [0, 0.06, 0], g);
  body.rotation.z = Math.PI / 2;
  g.anchor = new THREE.Object3D(); g.anchor.position.set(0, 0.45, 0); g.add(g.anchor);
  return g;
}

// A glass fuse with a thin wire; terminals at x = ±0.38. fuse.set(heat 0..1, blown).
export function fuse(THREE, kit) {
  const g = new THREE.Group();
  const capM = kit.mat(0xc9ced3, { metalness: 0.7, roughness: 0.3 });
  kit.mesh(new THREE.BoxGeometry(0.8, 0.06, 0.26), kit.mat(0x3b4048), [0, -0.06, 0], g);
  for (const x of [-0.3, 0.3]) kit.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16), capM, [x, 0.08, 0], g).rotation.z = Math.PI / 2;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.5, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  glass.rotation.z = Math.PI / 2; glass.position.y = 0.08; glass.renderOrder = 2; g.add(glass);
  const wm = new THREE.MeshBasicMaterial({ color: 0x9aa4ad });
  const halves = [-1, 1].map(s => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), wm);
    w.rotation.z = Math.PI / 2; w.position.set(s * 0.12, 0.08, 0); g.add(w); return w;
  });
  const soot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2b2b2b, transparent: true, opacity: 0.5 }));
  soot.position.y = 0.08; g.add(soot);
  const cool = new THREE.Color(0x9aa4ad), hot = new THREE.Color(0xff5a1f), white = new THREE.Color(0xfff2c0);
  g.set = (heat, blown) => {
    wm.color.copy(cool).lerp(hot, Math.min(1, heat * 1.5));
    if (heat > 0.66) wm.color.lerp(white, (heat - 0.66) * 2.5);
    halves.forEach((w, i) => { w.scale.y = blown ? 0.55 : 1; w.position.x = (i ? 1 : -1) * (blown ? 0.18 : 0.12); });
    soot.visible = blown;
  };
  g.anchor = new THREE.Object3D(); g.anchor.position.set(0, 0.45, 0); g.add(g.anchor);
  g.set(0, false);
  return g;
}

// A circuit diagram drawn on a canvas. parts: [{ type: 'cell'|'battery'|'switch'|'lamp'|'ammeter'|'voltmeter'|'resistor'|'fuse',
// x, y, rot (0 = along x, 1 = along y), open, n, on, hl }], lines: [[x1, y1, x2, y2], …], all in canvas pixels.
// The parts' gaps are cleared, so draw lines straight through them. lineInk colours the wires (lines) only.
export function drawSchematic(ctx, W, H, { parts = [], lines = [], dots = [], bg = '#ffffff', ink = '#1d2b36', hl = '#e8590c', lineInk = null, title }) {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = lineInk || ink; ctx.lineWidth = lineInk ? 7 : 5;
  for (const [a, b, c, d] of lines) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  ctx.fillStyle = lineInk || ink;
  for (const [x, y] of dots) { ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); }
  for (const p of parts) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.rot) ctx.rotate(Math.PI / 2);
    const col = p.hl ? hl : ink;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = p.hl ? 7 : 5;
    const clear = (w, h) => { ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore(); };
    const ring = (txt) => {
      clear(76, 76);
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.save(); ctx.fillStyle = bg; ctx.fill(); ctx.restore(); ctx.stroke();
      if (txt) { ctx.save(); if (p.rot) ctx.rotate(-Math.PI / 2); ctx.font = '800 34px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, 2); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(-38, 0); ctx.lineTo(-30, 0); ctx.moveTo(30, 0); ctx.lineTo(38, 0); ctx.stroke();
    };
    if (p.type === 'cell' || p.type === 'battery') {
      const n = p.type === 'battery' ? (p.n || 2) : 1, w = n * 26;
      clear(w + 18, 90);
      for (let i = 0; i < n; i++) {
        const x0 = -w / 2 + i * 26 + 4;
        ctx.lineWidth = p.hl ? 7 : 5;
        ctx.beginPath(); ctx.moveTo(x0, -16); ctx.lineTo(x0, 16); ctx.stroke();             // short = −
        ctx.beginPath(); ctx.moveTo(x0 + 14, -34); ctx.lineTo(x0 + 14, 34); ctx.stroke();   // long = +
      }
      ctx.beginPath(); ctx.moveTo(-w / 2 - 9, 0); ctx.lineTo(-w / 2 + 4, 0); ctx.moveTo(w / 2 - 8, 0); ctx.lineTo(w / 2 + 9, 0); ctx.stroke();
      ctx.save(); if (p.rot) ctx.rotate(-Math.PI / 2); ctx.font = '800 26px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', w / 2 + 14, -36);
      ctx.restore();
    }
    if (p.type === 'switch') {
      clear(90, 60);
      ctx.beginPath(); ctx.arc(-30, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(30, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-45, 0); ctx.lineTo(-30, 0); ctx.moveTo(30, 0); ctx.lineTo(45, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-30, 0);
      if (p.open) ctx.lineTo(24, -26); else ctx.lineTo(30, 0);
      ctx.stroke();
    }
    if (p.type === 'lamp') {
      clear(76, 76);
      if (p.on) { ctx.save(); ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-21, -21); ctx.lineTo(21, 21); ctx.moveTo(21, -21); ctx.lineTo(-21, 21); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-38, 0); ctx.lineTo(-30, 0); ctx.moveTo(30, 0); ctx.lineTo(38, 0); ctx.stroke();
    }
    if (p.type === 'ammeter') ring('A');
    if (p.type === 'voltmeter') ring('V');
    if (p.type === 'resistor') { clear(90, 40); ctx.strokeRect(-32, -13, 64, 26); ctx.beginPath(); ctx.moveTo(-45, 0); ctx.lineTo(-32, 0); ctx.moveTo(32, 0); ctx.lineTo(45, 0); ctx.stroke(); }
    if (p.type === 'fuse') { clear(90, 40); ctx.strokeRect(-32, -11, 64, 22); ctx.beginPath(); ctx.moveTo(-45, 0); ctx.lineTo(45, 0); ctx.stroke(); }
    ctx.restore();
  }
  if (title) { ctx.fillStyle = ink; ctx.font = '700 26px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, 16, 12); }
}
