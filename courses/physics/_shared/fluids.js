// Fluid-lab helpers for the middle-school physics lessons (density, pressure, buoyancy): glass and liquid
// materials, liquid columns whose level can change, open glass containers, a digital scale with a small
// display, a measuring cylinder with mL marks and a lumpy stone. Build everything once in setup and reuse
// it; nothing here allocates per frame (a display only redraws when its text changes).
import { paint, panel, rand } from './lab.js';

// See-through glass. Transparent parts do not write depth, so things inside stay visible.
export function glassMat(THREE, opacity = 0.18) {
  return new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
}

// A liquid: tinted and partly see-through, drawn after solid things (renderOrder on the mesh).
export function liquidMat(THREE, color, opacity = 0.42) {
  return new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.15, depthWrite: false });
}

// A box of liquid w × d with its bottom at y = 0. box.setLevel(h) sets the liquid height (world units).
export function liquidBox(THREE, mat, w, d) {
  const geo = new THREE.BoxGeometry(w, 1, d);
  geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 1;
  m.setLevel = h => { m.visible = h > 1e-4; m.scale.y = Math.max(h, 1e-4); };
  m.setLevel(0.5);
  return m;
}

// A round column of liquid of radius r with its bottom at y = 0; col.setLevel(h).
export function liquidColumn(THREE, mat, r, seg = 32) {
  const geo = new THREE.CylinderGeometry(r, r, 1, seg);
  geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 1;
  m.setLevel = h => { m.visible = h > 1e-4; m.scale.y = Math.max(h, 1e-4); };
  m.setLevel(0.5);
  return m;
}

// An open-topped glass box w × h × d standing on y = 0, with outlined edges and a tinted base.
export function glassBox(THREE, kit, w, h, d, { edge = 0x7fb2cc, base = 0x9cc3d4, thick = 0.06 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, h, d);
  const glass = new THREE.Mesh(geo, glassMat(THREE));
  glass.position.y = h / 2;
  glass.renderOrder = 2;
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: edge }));
  lines.position.y = h / 2;
  const b = kit.mesh(new THREE.BoxGeometry(w, thick, d), kit.mat(base), [0, thick / 2, 0], g);
  b.castShadow = false;
  g.add(glass, lines);
  g.inner = thick;    // height of the inside floor
  return g;
}

// An open glass cylinder of radius r and height h standing on y = 0 (with a thin glass floor).
export function glassTube(THREE, kit, r, h, { edge = 0x7fb2cc, seg = 32, thick = 0.03, foot = 0 } = {}) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg, 1, true), glassMat(THREE, 0.2));
  wall.position.y = h / 2;
  wall.renderOrder = 2;
  const rimGeo = new THREE.TorusGeometry(r, 0.012, 4, seg);
  const lineMat = new THREE.MeshBasicMaterial({ color: edge });
  const rim = new THREE.Mesh(rimGeo, lineMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = h;
  const bottom = new THREE.Mesh(rimGeo, lineMat);
  bottom.rotation.x = Math.PI / 2; bottom.position.y = thick;
  const floor = kit.mesh(new THREE.CylinderGeometry(r, r, thick, seg), glassMat(THREE, 0.35), [0, thick / 2, 0], g);
  floor.castShadow = false;
  g.add(wall, rim, bottom);
  if (foot) {
    const f = kit.mesh(new THREE.CylinderGeometry(foot, foot * 1.05, 0.04, 6), glassMat(THREE, 0.4), [0, 0.02, 0], g);
    f.castShadow = false;
  }
  g.inner = thick;
  return g;
}

// A digital kitchen scale. scale.set(text) shows text on its display (only redraws when it changes).
// scale.top is the height of the weighing pan's surface.
export function digitalScale(THREE, kit, { w = 0.9, d = 0.8, body = 0xe9edf1, accent = 0x33414d } = {}) {
  const g = new THREE.Group();
  kit.mesh(new THREE.BoxGeometry(w, 0.14, d), kit.mat(body, { roughness: 0.5 }), [0, 0.07, 0], g);
  kit.mesh(new THREE.BoxGeometry(w * 0.86, 0.03, d * 0.62), kit.mat(0xc4ccd4, { metalness: 0.6, roughness: 0.35 }), [0, 0.155, -d * 0.08], g);
  const disp = panel(THREE, w * 0.62, 0.13, { px: 256, frame: accent, depth: 0.02 });
  disp.position.set(0, 0.075, d / 2 + 0.012);
  g.add(disp);
  g.top = 0.17;
  g.panZ = -d * 0.08;
  let last = null;
  g.set = text => {
    if (text === last) return;
    last = text;
    disp.draw((c, W, H) => {
      c.fillStyle = '#cdeccb'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#10301c'; c.textAlign = 'right'; c.textBaseline = 'middle';
      c.font = `800 ${Math.round(H * 0.72)}px ui-monospace, Menlo, Consolas, monospace`;
      c.fillText(text, W - 12, H / 2 + 2);
    });
  };
  g.set('0 g');
  return g;
}

// A measuring cylinder: glass tube of inner radius r with mL marks from 0 to maxML. upm = world units of
// height per mL. cyl.setML(v) sets the water level; cyl.levelY(v) is the height (above the cylinder's own
// base) of the water surface for v mL. cyl.floorY is the inside floor.
export function measuringCylinder(THREE, kit, { r, upm, maxML, major = 50, minor = 10, waterMat, extra = 0.25 } = {}) {
  const g = new THREE.Group();
  const floorY = 0.04;
  const scaleH = maxML * upm, h = floorY + scaleH + extra;
  const tube = glassTube(THREE, kit, r, h, { foot: r * 1.7, thick: floorY });
  g.add(tube);
  const water = liquidColumn(THREE, waterMat, r * 0.97);
  water.position.y = floorY;
  g.add(water);
  // Marks and numbers on a see-through strip in front of the glass.
  const W = 128, H = 512, pad = 12;
  const tex = paint(THREE, W, H, (c) => {
    c.clearRect(0, 0, W, H);
    c.strokeStyle = '#1d2b36'; c.fillStyle = '#1d2b36';
    c.font = '700 26px system-ui, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left';
    for (let v = minor; v <= maxML + 1e-9; v += minor) {
      const y = H - pad - (v / maxML) * (H - 2 * pad), big = Math.abs(v / major - Math.round(v / major)) < 1e-6;
      c.lineWidth = big ? 4 : 2.5;
      c.beginPath(); c.moveTo(0, y); c.lineTo(big ? 42 : 24, y); c.stroke();
      if (big) c.fillText(String(v), 48, Math.max(14, y));
    }
  });
  const stripH = scaleH * H / (H - 2 * pad), stripW = stripH * W / H;
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(stripW, stripH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  strip.position.set(stripW / 2 - r * 0.25, floorY + scaleH / 2, r + 0.006);
  strip.renderOrder = 3;
  g.add(strip);
  g.water = water;
  g.floorY = floorY;
  g.height = h;
  g.levelY = v => floorY + v * upm;
  g.setML = v => water.setLevel(Math.max(0, v) * upm);
  return g;
}

// A lumpy stone geometry about 2·rx × 2·ry × 2·rz (flat shading looks like rock).
export function stoneGeometry(THREE, rx, ry, rz, seed = 1) {
  const geo = new THREE.DodecahedronGeometry(1, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    // Same bump for vertices at the same spot, so the faces stay joined.
    const key = Math.round(p.getX(i) * 50) * 7 + Math.round(p.getY(i) * 50) * 13 + Math.round(p.getZ(i) * 50) * 29 + seed * 101;
    const s = 0.86 + rand(key) * 0.24;
    p.setXYZ(i, p.getX(i) * s * rx, p.getY(i) * s * ry, p.getZ(i) * s * rz);
  }
  geo.computeVertexNormals();
  return geo;
}
