// Genetics helpers shared by the middle school heredity lessons (dna-genes, inheritance):
// a chromosome model (one chromatid, or the X shape of a copied chromosome) with optional coloured bands
// for gene positions, letter textures for 3D tiles, and a seeded random number.
// Everything is made from three.js geometry and small canvas textures.

// Seeded "random" number in [0, 1), so videos render the same every time.
export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// A chromosome standing along y with its centromere at the origin.
// len: total length; r: chromatid radius; cen: fraction of the length above the centromere (short arm "p").
// doubled: true = two sister chromatids joined at the centromere (the X shape seen before a cell divides).
// bands: [{ y, h, color }] rings round each chromatid at height y (from the centromere), e.g. a gene's position;
//   each band has one material, so recolour it with bands[i].material.color.set(...).
// Returns { g, mat, bands, top, bottom, chromatids } (top/bottom are Object3D anchors at the arm ends).
export function chromosome(THREE, kit, { len = 1, r = 0.07, cen = 0.4, color = 0x5b8def, doubled = true, radial = 8, bands = [], mat = null, spread = 0.1 } = {}) {
  const g = new THREE.Group();
  const m = mat || kit.mat(color, { roughness: 0.55 });
  const pL = Math.max(len * cen, r * 2.2), qL = Math.max(len - pL, r * 2.2);
  const capGeo = L => new THREE.CapsuleGeometry(r, Math.max(0.001, L - 2 * r), 3, radial);
  const pGeo = capGeo(pL), qGeo = capGeo(qL);
  const bandOut = bands.map(b => ({ ...b, material: kit.mat(b.color, { roughness: 0.5 }), meshes: [] }));
  const bandGeo = bandOut.map(b => new THREE.CylinderGeometry(r * 1.12, r * 1.12, b.h, radial));
  const chromatids = [];
  const n = doubled ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group();
    const side = doubled ? (i ? 1 : -1) : 0;
    c.position.x = side * r * 0.92;
    c.rotation.z = -side * spread; // splay the arms a little so a copied chromosome looks like an X
    g.add(c);
    const p = kit.mesh(pGeo, m, [0, pL / 2 - r * 0.15, 0], c);
    const q = kit.mesh(qGeo, m, [0, -qL / 2 + r * 0.15, 0], c);
    p.castShadow = q.castShadow = false;
    bandOut.forEach((b, j) => { const bm = kit.mesh(bandGeo[j], b.material, [0, b.y, 0], c); bm.castShadow = false; b.meshes.push(bm); });
    chromatids.push(c);
  }
  const top = new THREE.Object3D(), bottom = new THREE.Object3D();
  top.position.y = pL; bottom.position.y = -qL;
  g.add(top, bottom);
  return { g, mat: m, bands: bandOut, top, bottom, chromatids, pL, qL };
}

// A square canvas texture with centred text (a letter on a tile, a base name, a genotype).
export function letterTexture(THREE, text, { fg = '#1d2b36', bg = null, size = 128, weight = 800, scale = 0.62, round = 0.18 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (bg) {
    const rr = size * round;
    g.fillStyle = bg;
    g.beginPath();
    g.moveTo(rr, 0); g.arcTo(size, 0, size, size, rr); g.arcTo(size, size, 0, size, rr); g.arcTo(0, size, 0, 0, rr); g.arcTo(0, 0, size, 0, rr);
    g.fill();
  }
  g.fillStyle = fg;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = size * scale;
  g.font = `${weight} ${fs}px system-ui, sans-serif`;
  const w = g.measureText(text).width;
  if (w > size * 0.9) { fs *= (size * 0.9) / w; g.font = `${weight} ${fs}px system-ui, sans-serif`; }
  g.fillText(text, size / 2, size / 2 + fs * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
