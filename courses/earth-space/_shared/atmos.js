// Shared weather pieces for the middle-school atmosphere lessons (water cycle, weather fronts, climate):
// puffy clouds, a tall storm cloud, rain and snow, dots that flow along a path (vapour, rivers, wind),
// a curved arrow and a thermometer. Everything is built once from low-poly geometry and is deterministic.
// Helpers return plain objects ({ obj, ... }) and keep their own data in closures or userData, so they never
// put custom properties on three.js objects.
import { rand } from './sky.js';

const geoCache = new WeakMap();
function puffGeo(THREE) {
  let g = geoCache.get(THREE);
  if (!g) { g = new THREE.IcosahedronGeometry(1, 2); geoCache.set(THREE, g); }
  return g;
}

// A puffy cumulus-like cloud about `size` * 2.4 wide. obj.userData.mat is its material
// (change .color or .opacity to make it grey or fade it).
export function makeCloud(THREE, { seed = 0, puffs = 7, size = 1, color = 0xffffff, flat = 1 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 1 });
  for (let i = 0; i < puffs; i++) {
    const u = puffs === 1 ? 0.5 : i / (puffs - 1), mid = Math.sin(u * Math.PI);
    const m = new THREE.Mesh(puffGeo(THREE), mat);
    const s = size * (0.38 + 0.34 * mid + 0.12 * rand(seed + i * 3.1));
    m.scale.set(s, s * 0.8 * flat, s * 0.85);
    m.position.set((u - 0.5) * 2.2 * size, (0.15 * mid + 0.12 * rand(seed + i * 7.3)) * size * flat, (rand(seed + i * 5.7) - 0.5) * 0.5 * size);
    g.add(m);
  }
  g.userData.mat = mat;
  return g;
}

// A tall storm cloud (cumulonimbus): a tower of puffs with a flat, spreading top (the "anvil").
// height is the tower height; the base sits at y = 0.
export function makeStormCloud(THREE, { seed = 0, height = 3, width = 1.4, color = 0xe9edf3 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 1 });
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const y = (r / (rows - 1)) * height * 0.82, w = width * (1 - 0.25 * Math.sin((r / (rows - 1)) * Math.PI));
    for (let j = 0; j < 3; j++) {
      const m = new THREE.Mesh(puffGeo(THREE), mat);
      const s = w * (0.55 + 0.15 * rand(seed + r * 11 + j));
      m.scale.set(s, s * 0.8, s * 0.8);
      m.position.set((j - 1) * w * 0.6 + (rand(seed + r * 3 + j * 7) - 0.5) * 0.2, y, (rand(seed + r * 5 + j) - 0.5) * 0.4);
      g.add(m);
    }
  }
  const anvil = new THREE.Mesh(puffGeo(THREE), mat);
  anvil.scale.set(width * 2.4, height * 0.08, width * 1.1);
  anvil.position.set(width * 0.5, height * 0.95, 0);
  g.add(anvil);
  g.userData.mat = mat;
  return g;
}

// Falling rain (short streaks) or snow (slow dots) inside a box: x in [-w, w], z in [-d, d], y from top to bottom.
// Move or scale `obj` to place it. setAmount(f) shows a fraction (0..1) of the drops. tick(dt) animates.
export function makeRain(THREE, { count = 150, w = 1, d = 1, top = 3, bottom = 0, color = 0x4f8fe8, len = 0.28, speed = 7, seed = 0, snow = false } = {}) {
  const per = snow ? 1 : 2;
  const pos = new Float32Array(count * per * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const obj = snow
    ? new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 0.95, depthWrite: false }))
    : new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
  obj.frustumCulled = false;
  const H = top - bottom;
  let t = 0, shown = count;
  const box = { w, d, top, bottom };
  function place() {
    const h = box.top - box.bottom;
    for (let i = 0; i < count; i++) {
      const sp = speed * (0.8 + 0.4 * rand(seed + i * 1.7));
      const y = box.top - ((rand(seed + i * 9.1) * h + t * sp) % h);
      let x = (rand(seed + i * 3.3) * 2 - 1) * box.w, z = (rand(seed + i * 4.9) * 2 - 1) * box.d;
      if (snow) x += Math.sin(t * 1.5 + i) * 0.08;
      const k = i * per * 3;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      if (!snow) { pos[k + 3] = x; pos[k + 4] = Math.min(box.top, y + len); pos[k + 5] = z; }
    }
    geo.attributes.position.needsUpdate = true;
  }
  place();
  return {
    obj, box,
    tick(dt) { t += dt; place(); },
    setAmount(f) { shown = Math.round(count * Math.max(0, Math.min(1, f))); geo.setDrawRange(0, shown * per); obj.visible = shown > 0; },
    get height() { return H; },
  };
}

// Dots that flow along a smooth path through `pts` ([[x, y, z], ...]): vapour rising, a river, wind.
// speed is in world units per second. setCount(n) shows the first n dots (at most `count`).
// Dots grow in at the start and shrink out at the end of the path.
export function makeFlow(THREE, pts, { count = 20, color = 0x5aa9ff, size = 0.09, speed = 1, spread = 0, seed = 0, opacity = 1 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const N = 120, table = curve.getSpacedPoints(N), length = curve.getLength();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 8, 6), mat, count);
  mesh.frustumCulled = false;
  const m4 = new THREE.Matrix4(), off = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const st = { phase: 0, speed, shown: count };
  function place() {
    for (let i = 0; i < count; i++) {
      const u = (((st.phase + i / count + rand(seed + i) * 0.5 / count) % 1) + 1) % 1;
      const f = u * N, a = Math.floor(f), b = Math.min(N, a + 1), k = f - a;
      p.lerpVectors(table[a], table[b], k);
      if (spread) p.add(off.set(rand(seed + i * 2.3) - 0.5, rand(seed + i * 4.1) - 0.5, rand(seed + i * 6.7) - 0.5).multiplyScalar(spread));
      const sc = Math.min(1, u * 8, (1 - u) * 8);
      s.setScalar(Math.max(0.001, sc));
      m4.compose(p, q, s);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  place();
  return {
    obj: mesh, curve, length, st,
    tick(dt) { st.phase = (st.phase + (dt * st.speed) / length) % 1; place(); },
    setCount(n) { st.shown = Math.max(0, Math.min(count, Math.round(n))); mesh.count = st.shown; mesh.visible = st.shown > 0; },
    setColor(c) { mat.color.set(c); },
  };
}

// A curved arrow along a smooth path through `pts`, with a cone head at the end.
// obj.userData.mat is the shared material.
export function makeArrowPath(THREE, pts, { color = 0xffffff, radius = 0.05, head = 0.28, opacity = 1 } = {}) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const mat = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  // stop the tube where the head starts
  const L = curve.getLength(), uEnd = Math.max(0.05, 1 - head / L);
  const sub = new THREE.CatmullRomCurve3(curve.getSpacedPoints(24).filter((_, i) => i / 24 <= uEnd + 1e-6));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(sub, 24, radius, 6, false), mat));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.6, head, 10), mat);
  const end = curve.getPointAt(1), dir = curve.getTangentAt(1);
  tip.position.copy(end).addScaledVector(dir, -head / 2);
  tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.add(tip);
  g.userData.mat = mat;
  return g;
}

// A thermometer `height` tall (base of the bulb at y = 0) with a scale from min to max °C painted on a
// back plate. setTemp(c) moves the red liquid.
export function makeThermometer(THREE, { height = 2, min = -30, max = 40, step = 10 } = {}) {
  const g = new THREE.Group();
  const r = height * 0.045, bulbR = r * 2.1, y0 = bulbR * 2.4, y1 = height; // the scale starts above the bulb
  const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.35, depthWrite: false });
  const red = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0 + r, 12), glass);
  tube.position.y = (y0 + y1) / 2;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(bulbR, 16, 12), red);
  bulb.position.y = bulbR;
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, 1, 10), red);
  g.add(tube, bulb, fill);
  // painted scale
  const c = document.createElement('canvas');
  c.width = 128; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#f8fafc'; x.fillRect(0, 0, 128, 512);
  x.strokeStyle = '#334155'; x.fillStyle = '#1e293b'; x.font = 'bold 30px sans-serif'; x.textAlign = 'right'; x.textBaseline = 'middle';
  const yPx = v => 512 - (((y0 + ((v - min) / (max - min)) * (y1 - y0 - r)) / height) * 512);
  for (let v = min; v <= max + 1e-6; v += step / 2) {
    const yy = yPx(v), major = Math.abs(((v - min) / step) % 1) < 1e-6;
    x.lineWidth = major ? 4 : 2;
    x.beginPath(); x.moveTo(major ? 82 : 96, yy); x.lineTo(124, yy); x.stroke();
    if (major) x.fillText(String(v), 76, yy);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(height * 0.25, height), new THREE.MeshBasicMaterial({ map: tex }));
  plate.position.set(-height * 0.1, height / 2, -bulbR * 1.05);
  g.add(plate);
  function setTemp(v) {
    const f = Math.max(0, Math.min(1, (v - min) / (max - min)));
    const top = y0 + f * (y1 - y0 - r), h = Math.max(0.001, top - bulbR);
    fill.scale.y = h; fill.position.y = bulbR + h / 2;
  }
  setTemp(min);
  return { obj: g, setTemp };
}
