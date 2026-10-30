// Shared space pieces for the middle-school sky lessons (solar system, seasons, eclipses):
// a seeded random number, a starfield, a glowing Sun, painted planet textures, orbit rings and an
// open cone (frustum) whose shape can change in place, for shadow cones.

// Seeded pseudo-random number in [0, 1) (scenes must not use Math.random, so videos repeat exactly).
export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export const SPACE = 0x060b1f;

// Stars on a big sphere around the scene. Seed changes the pattern.
export function starfield(THREE, parent, { count = 700, radius = 120, size = 0.5, seed = 0 } = {}) {
  const pts = new Float32Array(count * 3), v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.set(rand(i + seed) - 0.5, rand(i + seed + 999) - 0.5, rand(i + seed + 3333) - 0.5).normalize().multiplyScalar(radius);
    pts.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false }));
  parent.add(p);
  return p;
}

// A glowing Sun: a bright disc (a sprite, so its edge stays perfectly round at any size) and a soft
// additive glow. It does not take part in lighting or shadows. group.glow is the glow sprite
// (hide it when the Sun is drawn huge).
export function makeSun(THREE, radius = 1) {
  const g = new THREE.Group();
  const tex = (draw) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const disc = tex(x => {
    const gr = x.createRadialGradient(128, 128, 0, 128, 128, 126);
    gr.addColorStop(0, '#fff7d0'); gr.addColorStop(0.6, '#ffd84f'); gr.addColorStop(1, '#ffa62b');
    x.fillStyle = gr; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
  });
  const glow = tex(x => {
    const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,220,120,1)'); gr.addColorStop(0.3, 'rgba(255,180,60,0.5)'); gr.addColorStop(1, 'rgba(255,140,30,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  });
  g.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, transparent: true }));
  g.core.scale.setScalar(radius * 2);
  g.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  g.glow.scale.setScalar(radius * 4.2);
  g.add(g.glow, g.core);
  return g;
}

// A thin circle in the XZ plane (radius 1; scale it). Opacity can be changed on .material.
export function orbitRing(THREE, { color = 0xffffff, opacity = 0.35, segments = 128 } = {}) {
  const pts = [];
  for (let i = 0; i < segments; i++) { const a = (i / segments) * Math.PI * 2; pts.push(Math.cos(a), 0, Math.sin(a)); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
}

// An open cone or frustum along +X, starting at x = 0 with radius r0 and ending at x = len with radius r1.
// mesh.set(r0, r1, len) reshapes it in place (no new geometry).
export function frustum(THREE, { color = 0x000000, opacity = 0.4, segments = 32 } = {}) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, segments, 1, true);
  geo.rotateZ(-Math.PI / 2); // axis along +X: the top (y = +0.5) goes to x = +0.5
  const base = geo.attributes.position.array.slice();
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.set = (r0, r1, len) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const end = x > 0, r = end ? r1 : r0;
      p.setXYZ(i, end ? len : 0, y * r, z * r);
    }
    p.needsUpdate = true;
    geo.computeBoundingSphere();
  };
  return m;
}

// Canvas textures for the planets and the Moon (512 x 256 at most; deterministic).
export function planetTexture(THREE, kind) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d'), W = 256, H = 128;
  const bands = (cols, wobble = 0) => {
    const n = cols.length * 3;
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[(i + Math.floor(rand(i + 40) * 2)) % cols.length];
      const y = (i / n) * H, h = H / n + 1;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * wobble);
      g.lineTo(W, y + h); g.lineTo(0, y + h); g.fill();
    }
  };
  const blobs = (col, n, seed, rmin, rmax, ymin = 10, ymax = H - 10) => {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const x = rand(i + seed) * W, y = ymin + rand(i + seed + 7) * (ymax - ymin), r = rmin + rand(i + seed + 3) * (rmax - rmin);
      g.beginPath(); g.ellipse(x, y, r * 1.4, r, rand(i + seed + 5) * 3, 0, Math.PI * 2); g.fill();
    }
  };
  if (kind === 'earth') {
    g.fillStyle = '#2f7fd6'; g.fillRect(0, 0, W, H);
    blobs('#5bb04d', 22, 0, 7, 18, 25, H - 25);
    blobs('#c9b06b', 6, 50, 4, 9, 40, H - 40);
    g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, W, 9); g.fillRect(0, H - 9, W, 9);
  } else if (kind === 'moon') {
    g.fillStyle = '#b9b9b4'; g.fillRect(0, 0, W, H);
    blobs('#8f8f8a', 10, 200, 6, 16);
    blobs('#a5a5a0', 30, 300, 2, 5);
  } else if (kind === 'mercury') {
    g.fillStyle = '#9d948c'; g.fillRect(0, 0, W, H);
    blobs('#7d756e', 30, 400, 2, 6);
  } else if (kind === 'venus') {
    bands(['#e8cf95', '#dcbc78', '#f0dcae'], 3);
  } else if (kind === 'mars') {
    g.fillStyle = '#c1502e'; g.fillRect(0, 0, W, H);
    blobs('#8e3a22', 12, 500, 5, 12);
    g.fillStyle = '#f4ece6'; g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6);
  } else if (kind === 'jupiter') {
    bands(['#d9b38c', '#b07a52', '#efe0c8', '#c99a6c'], 2);
    g.fillStyle = '#b5523b'; g.beginPath(); g.ellipse(170, 82, 14, 7, 0, 0, Math.PI * 2); g.fill();
  } else if (kind === 'saturn') {
    bands(['#e6d3a3', '#cfb57f', '#f1e5c4'], 1);
  } else if (kind === 'uranus') {
    bands(['#9fdbe0', '#8fd0d8', '#aee3e6'], 0);
  } else if (kind === 'neptune') {
    bands(['#3f6fd8', '#355fc4', '#5683e6'], 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Saturn's rings: a flat ring (inner/outer radius in planet radii) with soft bands.
export function saturnRings(THREE, inner = 1.25, outer = 2.3) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 4;
  const g = c.getContext('2d');
  for (let x = 0; x < 128; x++) {
    const a = x > 70 && x < 78 ? 0.15 : 0.55 + 0.35 * rand(x + 900);
    g.fillStyle = `rgba(230,214,170,${a})`; g.fillRect(x, 0, 1, 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.RingGeometry(inner, outer, 48, 1);
  // Map the texture across the ring's width (u = 0 inner edge, 1 outer edge).
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  geo.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
}
