// Lab helpers for the middle-school physics lessons: force arrows, canvas panels (signs, rulers,
// live graphs), a stretchable spring coil and a seeded random number. Build things once in setup and
// reuse them; nothing here allocates per frame.

// Seeded random number in [0, 1) (no Math.random, so videos render the same every time).
export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Canvas texture drawn once by `draw(ctx, w, h)`.
export function paint(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A flat board with a canvas texture that can be redrawn: panel.draw((ctx, W, H) => …).
// w, h are the board's size in world units; px is the canvas width (height follows the aspect).
export function panel(THREE, w, h, { px = 512, frame = 0x33414d, depth = 0.06 } = {}) {
  const W = px, H = Math.round(px * h / w);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  face.position.z = depth / 2 + 0.002;
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, depth), new THREE.MeshStandardMaterial({ color: frame, roughness: 0.6 }));
  back.castShadow = true;
  g.add(back, face);
  g.draw = fn => { ctx.clearRect(0, 0, W, H); fn(ctx, W, H); tex.needsUpdate = true; };
  g.ctx = ctx; g.W = W; g.H = H;
  return g;
}

// Draw a line graph on a 2D canvas. series: [{ color, pts: [[x, y], …], dots, width }].
// Axis ranges start at 0. Returns nothing; call inside panel.draw.
export function drawGraph(ctx, W, H, { xMax, yMax, xStep, yStep, xLabel, yLabel, title, series = [], bg = '#ffffff', fmtX = v => v, fmtY = v => v }) {
  const L = 70, R = 18, T = title ? 46 : 18, B = 58;
  const gx = x => L + (x / xMax) * (W - L - R), gy = y => H - B - (y / yMax) * (H - T - B);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.font = '600 18px system-ui, sans-serif'; ctx.textBaseline = 'middle';
  // Grid and numbers.
  ctx.strokeStyle = '#dde6ee'; ctx.lineWidth = 1.5; ctx.fillStyle = '#526472';
  ctx.textAlign = 'center';
  for (let x = 0; x <= xMax + 1e-9; x += xStep) {
    ctx.beginPath(); ctx.moveTo(gx(x), T); ctx.lineTo(gx(x), H - B); ctx.stroke();
    ctx.fillText(String(fmtX(+x.toFixed(4))), gx(x), H - B + 16);
  }
  ctx.textAlign = 'right';
  for (let y = 0; y <= yMax + 1e-9; y += yStep) {
    ctx.beginPath(); ctx.moveTo(L, gy(y)); ctx.lineTo(W - R, gy(y)); ctx.stroke();
    ctx.fillText(String(fmtY(+y.toFixed(4))), L - 8, gy(y));
  }
  // Axes.
  ctx.strokeStyle = '#1d2b36'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, H - B); ctx.lineTo(W - R, H - B); ctx.stroke();
  ctx.fillStyle = '#1d2b36'; ctx.font = '700 19px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(xLabel, (L + W - R) / 2, H - 16);
  ctx.save(); ctx.translate(20, (T + H - B) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();
  if (title) { ctx.font = '700 22px system-ui, sans-serif'; ctx.fillText(title, W / 2, 24); }
  // Lines and dots, clipped to the plot area.
  ctx.save();
  ctx.beginPath(); ctx.rect(L, T - 4, W - L - R + 4, H - T - B + 4); ctx.clip();
  for (const s of series) {
    if (!s.pts.length) continue;
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.width || 4; ctx.lineJoin = 'round';
    if (s.dash) ctx.setLineDash(s.dash);
    if (s.line !== false) {
      ctx.beginPath();
      s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(gx(x), gy(y)) : ctx.moveTo(gx(x), gy(y))));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (s.dots) for (const [x, y] of s.pts) { ctx.beginPath(); ctx.arc(gx(x), gy(y), s.dots, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

// A 3D arrow for forces. arrow.point(x, y, z, dx, dy, dz, len, side) puts its tail at (x, y, z) pointing along
// (dx, dy, dz) with total length len (world units). arrow.tip is an anchor at the arrow's middle for a label,
// moved `side` units: along world +x for an up/down arrow, along world +y (up) for any other arrow.
// Hidden when len is about 0.
export function makeArrow(THREE, color, { radius = 0.06, head = 0.28 } = {}) {
  const a = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 10), m);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.4, head, 14), m);
  a.add(shaft, cone);
  a.tip = new THREE.Object3D();
  a.add(a.tip);
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), off = new THREE.Vector3(), inv = new THREE.Quaternion();
  a.point = (x, y, z, dx, dy, dz, len, side = 0.32) => {
    a.position.set(x, y, z);
    dir.set(dx, dy, dz);
    if (dir.lengthSq() < 1e-9 || len < 0.02) { a.visible = false; return; }
    a.visible = true;
    dir.normalize();
    a.quaternion.setFromUnitVectors(up, dir);
    const h = Math.min(head, len * 0.6), s = Math.max(0.001, len - h);
    shaft.scale.y = s; shaft.position.y = s / 2;
    cone.scale.setScalar(h / head); cone.position.y = s + h / 2;
    // Label offset in world space, turned back into the arrow's own frame.
    if (Math.abs(dir.y) > 0.9) off.set(side, 0, 0); else off.set(0, side, 0);
    off.addScaledVector(dir, len / 2).applyQuaternion(inv.copy(a.quaternion).invert());
    a.tip.position.copy(off);
  };
  a.visible = false;
  return a;
}

// A coil spring hanging down from its top (y = 0) to y = -length. spring.setLength(L) stretches it
// by moving the existing vertices (no new geometry).
export function makeCoil(THREE, material, { turns = 14, radius = 0.22, wire = 0.035, perTurn = 16, radial = 6 } = {}) {
  const tubular = turns * perTurn;
  class Helix extends THREE.Curve {
    getPoint(s, out = new THREE.Vector3()) {
      const a = s * turns * Math.PI * 2;
      return out.set(radius * Math.cos(a), -s, radius * Math.sin(a));
    }
  }
  const geo = new THREE.TubeGeometry(new Helix(), tubular, wire, radial, false);
  const pos = geo.attributes.position, n = pos.count;
  const base = Float32Array.from(pos.array);             // vertex positions for length 1
  const ring = new Float32Array(n);                        // centre height of each vertex's ring
  for (let i = 0; i <= tubular; i++) for (let j = 0; j <= radial; j++) ring[i * (radial + 1) + j] = -i / tubular;
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.frustumCulled = false;
  let cur = 1;
  m.setLength = L => {
    if (Math.abs(L - cur) < 1e-5) return;
    cur = L;
    const a = pos.array;
    for (let v = 0; v < n; v++) a[v * 3 + 1] = base[v * 3 + 1] - ring[v] + ring[v] * L;
    pos.needsUpdate = true;
  };
  m.setLength(1.0001);
  return m;
}

// Share of a ruler texture's length taken by the margin at each end (ticks start and end this far in).
export const RULER_PAD = 14 / 512;

// A ruler strip texture: ticks every `minor`, numbers every `major`, from 0 to `max`.
// vertical: true draws 0 at the top, numbers increasing downward (for measuring a spring's extension).
export function rulerTexture(THREE, { max, minor, major, vertical = false, color = '#f6e7b4', unit = '' }) {
  const long = 512, short = 96;
  const [w, h] = vertical ? [short, long] : [long, short];
  return paint(THREE, w, h, (g) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d2b36'; g.strokeStyle = '#1d2b36';
    g.font = '700 22px system-ui, sans-serif'; g.textBaseline = 'middle';
    const pad = 14, span = long - 2 * pad;
    for (let v = 0, i = 0; v <= max + 1e-9; v = +(v + minor).toFixed(6), i++) {
      const p = pad + (v / max) * span, isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6;
      const len = isMajor ? 34 : 18;
      g.lineWidth = isMajor ? 3 : 2;
      g.beginPath();
      if (vertical) { g.moveTo(0, p); g.lineTo(len, p); } else { g.moveTo(p, 0); g.lineTo(p, len); }
      g.stroke();
      if (isMajor) {
        const txt = `${v}${unit}`;
        if (vertical) { g.textAlign = 'left'; g.fillText(txt, 40, Math.min(long - 12, Math.max(12, p))); }
        else { g.textAlign = 'center'; g.fillText(txt, Math.min(long - 20, Math.max(20, p)), 58); }
      }
    }
  });
}

// Number with a fixed count of decimals, using a normal minus sign.
export const fmt = (v, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('-', '−');
