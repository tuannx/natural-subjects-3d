// Cell models and microscope views for the middle school cell lessons.
// animalCell / plantCell build cut-away cells whose parts can be highlighted by name;
// microscopeView paints what onion skin or cheek cells look like at 40x, 100x or 400x.
// Everything is made from three.js geometry and small canvas textures.

// Seeded "random" number in [0, 1), so videos render the same every time.
export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Named parts with their own materials. select(names) makes those parts glow; call pulse(t) every frame.
export function partSet(THREE, kit) {
  const parts = {}, sel = new Set(), tmp = new THREE.Color();
  return {
    parts,
    mat(name, color, opts) {
      const m = kit.mat(color, opts);
      (parts[name] ||= { mats: [], anchor: null }).mats.push(m);
      return m;
    },
    anchor(name, parent, pos) { const a = new THREE.Object3D(); a.position.set(...pos); parent.add(a); (parts[name] ||= { mats: [] }).anchor = a; return a; },
    select(names) { sel.clear(); for (const n of [].concat(names || [])) sel.add(n); },
    get selected() { return [...sel]; },
    pulse(t) {
      const k = 0.32 + 0.22 * Math.sin(t * 5);
      for (const [n, p] of Object.entries(parts)) for (const m of p.mats) {
        if (sel.has(n)) m.emissive.copy(tmp.copy(m.color)).multiplyScalar(k); else m.emissive.setRGB(0, 0, 0);
      }
    },
  };
}

// A sphere with a quarter wedge cut out (removed between the -x and -z directions), plus the two flat cut faces.
function cutSphere(THREE, kit, r, shellMat, faceMat, parent, seg = 32) {
  const open = Math.PI / 2;
  kit.mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7), 0, Math.PI * 2 - open), shellMat, [0, 0, 0], parent);
  const half = new THREE.CircleGeometry(r * 0.995, seg, Math.PI / 2, Math.PI);
  const a = kit.mesh(half, faceMat, [0, 0, 0], parent);
  const b = kit.mesh(half, faceMat, [0, 0, 0], parent);
  b.rotation.y = -Math.PI / 2;
  a.castShadow = b.castShadow = false;
}

// Animal cell, radius r. The cut-away wedge faces +x/+z, so view it from a yaw of about 0.8.
// Parts: membrane, cytoplasm, nucleus, mitochondria.
export function animalCell(THREE, kit, { r = 1.2 } = {}) {
  const P = partSet(THREE, kit), g = new THREE.Group(), body = new THREE.Group();
  body.rotation.y = Math.PI; // turn the open wedge from (-x,-z) to (+x,+z)
  g.add(body);
  const DS = THREE.DoubleSide;
  // Membrane outside; cytoplasm colour on the inside and on the cut faces.
  const mem = P.mat('membrane', 0xef8fa6, { roughness: 0.5 });
  kit.mesh(new THREE.SphereGeometry(r, 32, 22, 0, Math.PI * 1.5), mem, [0, 0, 0], body);
  const cytoIn = P.mat('cytoplasm', 0xfde7cf, { side: THREE.BackSide });
  const cytoFace = P.mat('cytoplasm', 0xfde2c4, { side: DS, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
  cutSphere(THREE, kit, r * 0.965, cytoIn, cytoFace, body);
  // Nucleus, cut the same way, with a darker nucleolus inside.
  const nuc = new THREE.Group();
  nuc.position.set(-0.012, 0, -0.012); // a hair into the open wedge, so its cut faces sit in front of the cytoplasm's
  body.add(nuc);
  cutSphere(THREE, kit, r * 0.34, P.mat('nucleus', 0x8e5cc4, { roughness: 0.5 }), P.mat('nucleus', 0xb48ae0, { side: DS }), nuc, 24);
  kit.mesh(new THREE.SphereGeometry(r * 0.11, 12, 8), P.mat('nucleus', 0x4b2a7a), [0, 0, 0], nuc);
  // Mitochondria: little capsules, half sunk into the cut faces so they show.
  const mito = P.mat('mitochondria', 0xf08a2e, { roughness: 0.55 });
  const capGeo = new THREE.CapsuleGeometry(r * 0.06, r * 0.18, 3, 8);
  const spots = [[-0.62, 0.35, 0.0, 0.3], [-0.55, -0.45, 0.02, 1.2], [0.0, 0.5, -0.62, 2.1], [0.02, -0.35, -0.7, 0.7], [-0.4, 0.05, 0.45, 1.6], [0.35, 0.1, -0.5, 2.6], [-0.75, -0.05, -0.2, 0.9]];
  let first = null;
  for (const [x, y, z, a] of spots) {
    const m = kit.mesh(capGeo, mito, [x * r, y * r, z * r], body);
    m.rotation.set(a, a * 0.7, Math.PI / 2 + a);
    first ||= m;
  }
  // Label anchors (in the turned body's space, so they follow the wedge).
  P.anchor('membrane', body, [0.3 * r, 0.75 * r, -0.62 * r]);
  P.anchor('cytoplasm', body, [-0.7 * r, -0.62 * r, 0]);
  P.anchor('nucleus', body, [-0.1 * r, 0.36 * r, -0.1 * r]);
  P.anchor('mitochondria', body, [spots[0][0] * r, spots[0][1] * r + 0.08, 0]);
  return { g, body, parts: P.parts, select: P.select, pulse: P.pulse, anchor: n => P.parts[n].anchor };
}

// Plant cell: a box W x H x D with its front (+z) wall cut away. View it from the front.
// Parts: wall, membrane, cytoplasm, vacuole, nucleus, chloroplasts, mitochondria.
export function plantCell(THREE, kit, { W = 2.4, H = 1.6, D = 1.5 } = {}) {
  const P = partSet(THREE, kit), g = new THREE.Group();
  const t = 0.09, m = 0.03;
  const box = (w, h, d, mat, x, y, z) => kit.mesh(new THREE.BoxGeometry(w, h, d), mat, [x, y, z], g);
  // Five wall panels (no front), then five thin membrane panels just inside them.
  const shell = (w, h, d, th, mat) => {
    box(w, h, th, mat, 0, 0, -d / 2 + th / 2);
    box(th, h, d, mat, -w / 2 + th / 2, 0, 0); box(th, h, d, mat, w / 2 - th / 2, 0, 0);
    box(w, th, d, mat, 0, h / 2 - th / 2, 0); box(w, th, d, mat, 0, -h / 2 + th / 2, 0);
  };
  shell(W, H, D, t, P.mat('wall', 0x7fbf4d, { roughness: 0.8 }));
  const iw = W - 2 * t, ih = H - 2 * t, id = D - t;
  const memG = new THREE.Group();
  memG.position.z = t / 2;
  g.add(memG);
  const memMat = P.mat('membrane', 0xf2cf55, { roughness: 0.5 });
  for (const [w, h, d, x, y, z] of [[iw, ih, m, 0, 0, -id / 2 + m / 2], [m, ih, id, -iw / 2 + m / 2, 0, 0], [m, ih, id, iw / 2 - m / 2, 0, 0], [iw, m, id, 0, ih / 2 - m / 2, 0], [iw, m, id, 0, -ih / 2 + m / 2, 0]])
    kit.mesh(new THREE.BoxGeometry(w, h, d), memMat, [x, y, z], memG);
  // Cytoplasm: a see-through jelly filling the cell; its front face is the cut surface.
  const cyto = kit.mesh(new THREE.BoxGeometry(iw - 2 * m, ih - 2 * m, id - m), P.mat('cytoplasm', 0xeaf6c8, { transparent: true, opacity: 0.32, depthWrite: false }), [0, 0, t / 2 + m / 2], g);
  cyto.castShadow = false; cyto.renderOrder = 3;
  // Large central vacuole full of cell sap.
  const vac = kit.mesh(new THREE.SphereGeometry(1, 28, 18), P.mat('vacuole', 0x8fcbf0, { transparent: true, opacity: 0.75, roughness: 0.2 }), [0.18, -0.04, -0.08], g);
  vac.scale.set(W * 0.31, H * 0.29, D * 0.28);
  vac.castShadow = false; vac.renderOrder = 2;
  // Nucleus pushed to one side by the vacuole.
  const nx = -W * 0.33, ny = H * 0.2;
  kit.mesh(new THREE.SphereGeometry(H * 0.14, 20, 14), P.mat('nucleus', 0x8e5cc4, { roughness: 0.5 }), [nx, ny, 0.05], g);
  kit.mesh(new THREE.SphereGeometry(H * 0.055, 10, 8), P.mat('nucleus', 0x4b2a7a), [nx + 0.03, ny + 0.02, 0.05 + H * 0.11], g);
  // Chloroplasts round the edges, mitochondria in between.
  const chl = P.mat('chloroplasts', 0x2f9e3c, { roughness: 0.5 }), chlGeo = new THREE.SphereGeometry(0.1, 14, 8);
  const cs = [[-0.95, -0.55, -0.35], [-0.6, -0.6, 0.15], [-0.15, -0.6, -0.45], [0.35, -0.6, 0.2], [0.85, -0.58, -0.3], [1.0, -0.15, 0.25], [1.0, 0.35, -0.2], [0.65, 0.6, 0.1], [0.15, 0.6, -0.4], [-0.35, 0.6, 0.25], [-1.0, -0.1, 0.2], [-0.2, 0.1, -0.6], [0.6, -0.2, -0.6]];
  cs.forEach(([x, y, z], i) => {
    const c = kit.mesh(chlGeo, chl, [x * W / 2.4, y * H / 1.6, z * D / 1.5], g);
    c.scale.set(1.55, 0.6, 0.95); c.rotation.set(rand(i) * 2, rand(i + 9) * 3, rand(i + 4));
  });
  const mito = P.mat('mitochondria', 0xf08a2e, { roughness: 0.55 }), capGeo = new THREE.CapsuleGeometry(0.06, 0.15, 3, 8);
  [[-0.55, -0.3, 0.3], [0.7, 0.35, 0.35], [-0.85, 0.45, -0.4]].forEach(([x, y, z], i) => {
    const c = kit.mesh(capGeo, mito, [x * W / 2.4, y * H / 1.6, z * D / 1.5], g);
    c.rotation.set(0.4 + i, i * 0.8, Math.PI / 2 + i * 0.6);
  });
  P.anchor('wall', g, [-W / 2 + 0.05, H / 2 + 0.02, D / 2]);
  P.anchor('membrane', g, [W / 2 - t - 0.02, -H * 0.15, D / 2]);
  P.anchor('cytoplasm', g, [-W * 0.22, -H * 0.3, D / 2]);
  P.anchor('vacuole', g, [0.2, 0.05, 0.4]);
  P.anchor('nucleus', g, [nx, ny + H * 0.12, 0.1]);
  P.anchor('chloroplasts', g, [cs[3][0] * W / 2.4, cs[3][1] * H / 1.6 + 0.08, cs[3][2] * D / 1.5]);
  P.anchor('mitochondria', g, [0.7 * W / 2.4, 0.35 * H / 1.6 + 0.08, 0.35 * D / 1.5]);
  return { g, parts: P.parts, select: P.select, pulse: P.pulse, anchor: n => P.parts[n].anchor };
}

// ---------- What you see down the microscope ----------
// Field of view of a school microscope with a 10x eyepiece (field number 18): about 4.5 mm at 40x,
// 1.8 mm at 100x and 0.45 mm at 400x. Cell sizes: onion skin cells about 250 x 60 um, cheek cells about 60 um.
const FIELD_UM = { 40: 4500, 100: 1800, 400: 450 };
const BAR = { 40: [1000, '1 mm'], 100: [500, '0.5 mm'], 400: [100, '100 µm'] };

const LOOKS = {
  onion: {
    none: { bg: '#f3f6ee', fill: 'rgba(236,241,230,0.9)', wall: '#c3ccbb', nuc: 'rgba(200,205,190,0.8)' },
    stain: { bg: '#fbf1d6', fill: 'rgba(240,220,160,0.85)', wall: '#9c7230', nuc: '#6e4a17' },
  },
  cheek: {
    none: { bg: '#f4f5f2', fill: 'rgba(228,230,226,0.75)', wall: '#c4c8c4', nuc: 'rgba(190,194,192,0.9)' },
    stain: { bg: '#eef5fb', fill: 'rgba(160,196,236,0.55)', wall: '#5f8fc8', nuc: '#1d3e8f' },
  },
};

export function microscopeView(THREE, { kind = 'onion', mag = 100, stain = true, size = 512 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d'), look = LOOKS[kind][stain ? 'stain' : 'none'];
  const s = size / FIELD_UM[mag], cx = size / 2; // pixels per micrometre
  g.fillStyle = look.bg; g.fillRect(0, 0, size, size);
  g.save();
  g.beginPath(); g.arc(cx, cx, cx, 0, Math.PI * 2); g.clip();
  const um = v => cx + v * s;
  if (kind === 'onion') {
    // Rows of long brick-shaped cells; each row is shifted, and every wall is a little uneven.
    const L = 250, Wd = 60, half = FIELD_UM[mag] / 2 + L;
    const rows = Math.ceil(half / Wd);
    g.lineWidth = Math.max(1, 3.5 * s);
    for (let r = -rows; r <= rows; r++) {
      const y0 = r * Wd, shift = rand(r * 7 + 3) * L;
      for (let x0 = -half - shift; x0 < half; x0 += L) {
        const id = r * 101 + Math.round(x0);
        const len = L * (0.8 + rand(id) * 0.4);
        const yj = (rand(id + 5) - 0.5) * 6;
        g.fillStyle = look.fill; g.strokeStyle = look.wall;
        g.beginPath(); g.rect(um(x0), um(y0 + yj), len * s, Wd * s); g.fill(); g.stroke();
        if (len * s > 6) {
          const nxp = x0 + len * (0.25 + rand(id + 2) * 0.5), nyp = y0 + yj + Wd * (0.35 + rand(id + 8) * 0.3);
          g.fillStyle = look.nuc;
          g.beginPath(); g.ellipse(um(nxp), um(nyp), Math.max(1, 11 * s), Math.max(1, 8 * s), 0, 0, Math.PI * 2); g.fill();
        }
      }
    }
  } else {
    // Cheek cells: flat, irregular, often folded, scattered in a thin layer of saliva.
    const n = { 40: 260, 100: 120, 400: 14 }[mag], spread = FIELD_UM[mag] * 0.55;
    g.lineWidth = Math.max(1, 1.5 * s);
    for (let i = 0; i < n; i++) {
      const x = (rand(i * 3 + 1) - 0.5) * 2 * spread, y = (rand(i * 3 + 2) - 0.5) * 2 * spread;
      const R = 30 * (0.8 + rand(i + 50) * 0.45);
      g.fillStyle = look.fill; g.strokeStyle = look.wall;
      g.beginPath();
      for (let k = 0; k <= 9; k++) {
        const a = (k % 9) / 9 * Math.PI * 2 + rand(i) * 6, rr = R * (0.8 + rand(i * 13 + (k % 9)) * 0.35);
        const px = um(x + Math.cos(a) * rr), py = um(y + Math.sin(a) * rr);
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fill(); g.stroke();
      if (R * s > 4 && rand(i + 77) > 0.4) { // a fold line on some cells
        g.beginPath(); g.moveTo(um(x - R * 0.5), um(y + R * 0.2)); g.quadraticCurveTo(um(x), um(y - R * 0.3), um(x + R * 0.5), um(y + R * 0.3)); g.stroke();
      }
      g.fillStyle = look.nuc;
      g.beginPath(); g.ellipse(um(x + R * 0.1), um(y - R * 0.05), Math.max(1, 5 * s), Math.max(1, 4.2 * s), 0.4, 0, Math.PI * 2); g.fill();
    }
  }
  // Scale bar in the lower part of the circle.
  const [barUm, barText] = BAR[mag], bw = barUm * s;
  g.fillStyle = '#1d2433';
  g.fillRect(cx - bw / 2, size * 0.86, bw, Math.max(4, size * 0.012));
  g.font = `bold ${Math.round(size * 0.045)}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.fillText(barText, cx, size * 0.84);
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
