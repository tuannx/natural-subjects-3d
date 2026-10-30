// Shared rock pieces for the middle-school geology lessons (plate tectonics, rock cycle, geologic time):
// a seeded random number, painted rock textures, small fossil pictures, a straight arrow and a
// thick bent slab whose texture can scroll along it (for sinking plates and moving rock).
// Everything is drawn in code on small canvases (no downloads) and is deterministic.

// Seeded pseudo-random number in [0, 1).
export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// A canvas texture (w x h px, keep it <= 512) drawn by draw(ctx, w, h). Repeats in both directions.
export function canvasTex(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Painted rock surfaces. kind: granite, basalt, obsidian, sandstone, shale, limestone, conglomerate,
// slate, schist, gneiss, marble, sand, mud, magma. Each is a 256 x 256 tile that repeats.
// Layered rocks have their layers running across (along u), so a box face shows horizontal beds.
const cache = {};
export function rockTexture(THREE, kind) {
  if (cache[kind]) return cache[kind];
  const S = 256;
  const seed = [...kind].reduce((a, ch) => a + ch.charCodeAt(0) * 7, 0);
  const r = i => rand(i * 1.37 + seed);
  const t = canvasTex(THREE, S, S, (g) => {
    const fill = c => { g.fillStyle = c; g.fillRect(0, 0, S, S); };
    const specks = (cols, n, rmin, rmax, i0 = 0) => {
      for (let i = 0; i < n; i++) {
        g.fillStyle = cols[Math.floor(r(i + i0) * cols.length)];
        const x = r(i + i0 + 1000) * S, y = r(i + i0 + 2000) * S, s = rmin + r(i + i0 + 3000) * (rmax - rmin);
        g.fillRect(x, y, s, s * (0.7 + r(i + i0 + 4000) * 0.6));
      }
    };
    // Blocky interlocking crystals (igneous rocks): random polygons, wrapped at the edges.
    const crystals = (cols, n, size) => {
      for (let i = 0; i < n; i++) {
        g.fillStyle = cols[Math.floor(r(i + 50) * cols.length)];
        const cx = r(i + 60) * S, cy = r(i + 70) * S, s = size * (0.6 + r(i + 80) * 0.8), k = 5 + Math.floor(r(i + 90) * 3);
        for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
          g.beginPath();
          for (let j = 0; j < k; j++) {
            const a = (j / k) * Math.PI * 2 + r(i + j * 13) * 0.6, d = s * (0.6 + r(i + j * 17 + 5) * 0.5);
            g.lineTo(cx + ox + Math.cos(a) * d, cy + oy + Math.sin(a) * d);
          }
          g.fill();
        }
      }
    };
    // Horizontal bands of varying thickness that wrap from top to bottom.
    const bands = (cols, n, wave = 0, phase = 0) => {
      let y = 0;
      for (let i = 0; y < S; i++) {
        const h = (S / n) * (0.5 + r(i + 500) * 1.0);
        g.fillStyle = cols[i % cols.length];
        g.beginPath();
        g.moveTo(0, y);
        for (let x = 0; x <= S; x += 8) g.lineTo(x, y + Math.sin((x / S) * Math.PI * 2 * 2 + i + phase) * wave);
        for (let x = S; x >= 0; x -= 8) g.lineTo(x, Math.min(S, y + h) + Math.sin((x / S) * Math.PI * 2 * 2 + i + 1 + phase) * wave);
        g.fill();
        y += h;
      }
    };
    switch (kind) {
      case 'granite': fill('#d8c3b2'); crystals(['#e9a995', '#f4f0e8', '#f4f0e8', '#2e2c2b', '#a9a39c', '#e3b6a3'], 140, 13); break;
      case 'basalt': fill('#3d4046'); specks(['#2b2d31', '#4d5157', '#33363b', '#5a5d62'], 2600, 1, 3); break;
      case 'obsidian': {
        const gr = g.createLinearGradient(0, 0, S, S);
        gr.addColorStop(0, '#16161c'); gr.addColorStop(0.5, '#2a2a33'); gr.addColorStop(1, '#101014');
        g.fillStyle = gr; g.fillRect(0, 0, S, S);
        g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2;
        for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(r(i) * S, r(i + 9) * S, 30 + r(i + 4) * 60, 0, 2); g.stroke(); }
        break;
      }
      case 'sandstone': bands(['#e2b97f', '#d9aa6c', '#e8c590', '#d4a265'], 7, 1.5); specks(['#c48f55', '#f2d7a8', '#b98450', '#fbe6bf'], 2400, 1, 2.5); break;
      case 'shale': bands(['#7e8087', '#71737a', '#878990', '#6a6c73'], 26, 0.6); specks(['#5f6168', '#8e9097'], 500, 1, 2); break;
      case 'limestone':
        fill('#d9d5c5'); specks(['#c9c4b2', '#e7e3d6', '#bfb9a5'], 1500, 1, 3);
        g.strokeStyle = '#f5f2e8'; g.lineWidth = 2;
        for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(r(i + 7) * S, r(i + 8) * S, 3 + r(i + 9) * 5, 0, Math.PI); g.stroke(); }
        break;
      case 'conglomerate':
        fill('#b89d76'); specks(['#a68a63', '#c9b08a'], 1200, 1, 2);
        for (let i = 0; i < 70; i++) {
          g.fillStyle = ['#8d8f94', '#c9b8a0', '#6f5f52', '#d9d2c4', '#a8705a'][Math.floor(r(i + 300) * 5)];
          const x = r(i + 310) * S, y = r(i + 320) * S, a = 5 + r(i + 330) * 11;
          g.beginPath(); g.ellipse(x, y, a, a * (0.6 + r(i + 340) * 0.3), r(i + 350) * 3, 0, Math.PI * 2); g.fill();
        }
        break;
      case 'slate': bands(['#4a5260', '#454c59', '#505867'], 40, 0.3); specks(['#5a6372', '#3e4552'], 300, 1, 2); break;
      case 'schist': bands(['#8b8e85', '#a6a99c', '#7a7d75', '#c2c4b6'], 22, 4); specks(['#e8e6da', '#d9dccd'], 700, 1, 2.5); break;
      case 'gneiss': bands(['#ece6da', '#3f3b39', '#d9cfc1', '#5a524d', '#f3ede2', '#2f2c2b'], 12, 7); break;
      case 'marble':
        fill('#f1eee8'); specks(['#e6e2da', '#faf8f3'], 900, 2, 5);
        g.strokeStyle = 'rgba(120,120,130,0.45)'; g.lineWidth = 1.5;
        for (let i = 0; i < 9; i++) {
          g.beginPath(); let x = r(i + 600) * S, y = 0; g.moveTo(x, y);
          while (y < S) { y += 12; x += (r(i * 31 + y) - 0.5) * 22; g.lineTo(x, y); }
          g.stroke();
        }
        break;
      case 'sand': fill('#e8cf9b'); specks(['#d6b67a', '#f5e3b9', '#c9a56a', '#fff1cf'], 3000, 1, 3); break;
      case 'mud': fill('#8a7560'); specks(['#7a6552', '#998470', '#6e5a48'], 2200, 1, 2.5); break;
      case 'magma': {
        fill('#d9480f');
        for (let i = 0; i < 60; i++) {
          const x = r(i + 700) * S, y = r(i + 710) * S, a = 8 + r(i + 720) * 26;
          const gr = g.createRadialGradient(x, y, 0, x, y, a);
          gr.addColorStop(0, 'rgba(255,214,90,0.9)'); gr.addColorStop(1, 'rgba(255,120,20,0)');
          g.fillStyle = gr; g.fillRect(x - a, y - a, a * 2, a * 2);
        }
        break;
      }
      default: fill('#999');
    }
  });
  cache[kind] = t;
  return t;
}

// Small fossil pictures on a transparent background (128 x 128), for decals on rock faces.
// kind: trilobite, ammonite, fern, leaf, fish, shell, reptile, bone, footprint, stromatolite, tooth.
export function fossilTexture(THREE, kind, color = '#f6efe0') {
  const key = 'fossil-' + kind + color;
  if (cache[key]) return cache[key];
  const t = canvasTex(THREE, 128, 128, (g) => {
    g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 5; g.lineCap = g.lineJoin = 'round';
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 4;
    const ell = (x, y, a, b, rot = 0) => { g.beginPath(); g.ellipse(x, y, a, b, rot, 0, Math.PI * 2); g.fill(); };
    const line = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    switch (kind) {
      case 'trilobite':
        g.beginPath(); g.ellipse(64, 34, 30, 18, 0, Math.PI, 0); g.fill();               // head shield
        for (let i = 0; i < 7; i++) { const w = 26 - i * 2.2; g.fillRect(64 - w, 38 + i * 9, w * 2, 6); } // body segments
        g.beginPath(); g.moveTo(48, 102); g.lineTo(80, 102); g.lineTo(64, 120); g.fill(); // tail
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.shadowBlur = 0; g.fillRect(60, 22, 8, 92); // middle lobe
        break;
      case 'ammonite': {
        g.lineWidth = 6; g.beginPath();
        for (let a = 0; a < Math.PI * 7; a += 0.1) { const rr = 3 + a * 2.6; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); }
        g.stroke(); g.lineWidth = 2.5;
        for (let a = 3; a < Math.PI * 7; a += 0.55) { const r1 = 3 + (a - 2 * Math.PI) * 2.6, r2 = 3 + a * 2.6; if (r1 > 2) line([[64 + Math.cos(a) * r1, 64 + Math.sin(a) * r1], [64 + Math.cos(a) * r2, 64 + Math.sin(a) * r2]]); }
        break;
      }
      case 'fern':
        line([[64, 120], [64, 10]]); g.lineWidth = 3;
        for (let i = 0; i < 9; i++) { const y = 20 + i * 11, w = 12 + i * 3; line([[64, y], [64 - w, y - 8]]); line([[64, y], [64 + w, y - 8]]); }
        break;
      case 'leaf': // tongue-shaped Glossopteris leaf with a midrib and net veins
        g.beginPath(); g.moveTo(64, 120); g.bezierCurveTo(20, 90, 34, 18, 64, 8); g.bezierCurveTo(94, 18, 108, 90, 64, 120); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.shadowBlur = 0; g.lineWidth = 3; line([[64, 116], [64, 14]]); g.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) { const y = 28 + i * 11; line([[64, y], [42, y - 12]]); line([[64, y], [86, y - 12]]); }
        break;
      case 'fish':
        line([[14, 64], [106, 64]]); g.lineWidth = 3;
        for (let i = 0; i < 10; i++) { const x = 26 + i * 8, h = 22 - Math.abs(i - 4) * 2.4; line([[x, 64 - h], [x + 4, 64]]); line([[x, 64 + h], [x + 4, 64]]); }
        ell(108, 64, 14, 12); g.beginPath(); g.moveTo(16, 64); g.lineTo(2, 46); g.lineTo(2, 82); g.fill();
        break;
      case 'shell':
        g.beginPath(); g.moveTo(64, 112); g.bezierCurveTo(4, 92, 14, 18, 64, 16); g.bezierCurveTo(114, 18, 124, 92, 64, 112); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.shadowBlur = 0; g.lineWidth = 2.5;
        for (let i = -3; i <= 3; i++) line([[64, 108], [64 + i * 14, 22 + Math.abs(i) * 5]]);
        break;
      case 'reptile': // small swimming reptile (like Mesosaurus): long snout, long tail
        ell(60, 64, 30, 9); ell(98, 62, 16, 5, -0.05);
        g.lineWidth = 6; line([[32, 66], [16, 72], [4, 70]]);
        g.lineWidth = 4; line([[44, 70], [36, 88]]); line([[72, 70], [80, 88]]); line([[44, 58], [34, 42]]); line([[72, 58], [82, 42]]);
        break;
      case 'bone':
        g.lineWidth = 12; line([[30, 98], [98, 30]]);
        ell(24, 96, 10, 10); ell(32, 106, 10, 10); ell(96, 22, 10, 10); ell(106, 32, 10, 10);
        break;
      case 'footprint': // three-toed dinosaur track
        ell(64, 92, 16, 20);
        g.lineWidth = 11; line([[64, 80], [64, 22]]); line([[58, 84], [28, 38]]); line([[70, 84], [100, 38]]);
        break;
      case 'stromatolite':
        g.lineWidth = 4;
        for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(64, 112, 52 - i * 7, 70 - i * 10, 0, Math.PI, 0); g.stroke(); }
        break;
      case 'tooth':
        g.beginPath(); g.moveTo(34, 50); g.quadraticCurveTo(64, 20, 94, 50); g.lineTo(88, 72); g.lineTo(80, 112); g.lineTo(70, 76);
        g.lineTo(58, 76); g.lineTo(48, 112); g.lineTo(40, 72); g.closePath(); g.fill();
        break;
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  cache[key] = t;
  return t;
}

// A straight arrow pointing along +Y from its origin. arrow.setLength(len) changes it in place.
export function arrow(THREE, color, { radius = 0.05, head = 0.22 } = {}) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 8), m);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.4, head, 12), m);
  g.add(shaft, tip);
  g.setLength = len => {
    const s = Math.max(0.001, len - head);
    shaft.scale.y = s; shaft.position.y = s / 2; tip.position.y = s + head / 2;
  };
  g.setLength(1);
  g.material = m;
  return g;
}

// A thick slab that follows a 2D path in the XY plane and is `depth` deep along Z (centred on z = 0).
// path: array of [x, y] points along the slab's top edge; the slab hangs `thick` below it (along the
// path's normal). Texture u runs along the path in units of `uScale` world units, so a texture with
// RepeatWrapping can be scrolled (texture.offset.x) to make the rock look as if it moves along the path.
export function slabGeometry(THREE, path, thick, depth, uScale = 1) {
  const n = path.length, top = [], bot = [], us = [];
  let len = 0;
  for (let i = 0; i < n; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    if (i > 0) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    top.push(path[i]); bot.push([path[i][0] + ty * thick, path[i][1] - tx * thick]); us.push(len / uScale);
  }
  const pos = [], uv = [], idx = [];
  const z0 = depth / 2;
  // Faces: front (z+), back (z-), top, bottom. Each face is a strip of quads along the path.
  const face = (A, B, za, zb, vA, vB) => {
    const base = pos.length / 3;
    for (let i = 0; i < n; i++) {
      pos.push(A[i][0], A[i][1], za, B[i][0], B[i][1], zb);
      uv.push(us[i], vA, us[i], vB);
    }
    for (let i = 0; i < n - 1; i++) {
      const p = base + i * 2;
      idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
    }
  };
  face(top, bot, z0, z0, 1, 0);      // front
  face(bot, top, -z0, -z0, 0, 1);    // back
  face(top, top, -z0, z0, 0, 1);     // top
  face(bot, bot, z0, -z0, 0, 1);     // bottom
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
