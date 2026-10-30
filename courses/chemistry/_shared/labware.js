// Lab glassware and instruments for the middle-school chemistry lessons (chemical-reactions,
// reaction-rate, acids-bases). Everything is built once from three.js shapes; the set...() calls
// only move, scale or recolour what is already there, so they are cheap to call every frame.
//
//   import { bench, beaker, testTube, flask, balance, syringe, thermometer, bubbles, tube, paint } from '../_shared/labware.js';
//   bench(k, { w: 12, d: 3 });                         // lab bench, top surface at y = 0
//   const b = beaker(k, { r: 0.5, h: 1, pos: [0, 0, 0], fill: 0.6, color: 0xff5544 });
//   b.setFill(0.8); b.setColor(0x44aa66);              // liquid height (0..1 of the beaker) and colour
//   const bal = balance(k, { pos: [3, 0, 0] });       // digital balance; put things at y = bal.top
//   bal.set(152.4);                                    // shows "152.40 g"
//   const fizz = bubbles(k, { parent: b.group, r: 0.4, y0: 0.05, y1: 0.55 });
//   fizz.tick(t, 0.7);                                 // in update(): 0 = no bubbles, 1 = full fizz

export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Canvas texture drawn in code (≤ 512 px).
export function paint(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.redraw = fn => { (fn || draw)(g, w, h); tex.needsUpdate = true; };
  tex.redraw(draw);
  return tex;
}

let M = null; // materials shared by every piece of glassware on the page
export function labMats(k) {
  if (M) return M;
  const { THREE } = k;
  M = {
    glass: new THREE.MeshStandardMaterial({ color: 0xdcefff, transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }),
    rim: new THREE.MeshStandardMaterial({ color: 0xb9d7ec, transparent: true, opacity: 0.6, roughness: 0.1 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa5b1, metalness: 0.55, roughness: 0.35 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x343a40, roughness: 0.6 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x8c5a3c, roughness: 0.9 }),
    tube: new THREE.MeshStandardMaterial({ color: 0xe9f4fb, transparent: true, opacity: 0.55, roughness: 0.2, depthWrite: false }),
  };
  return M;
}

const liquidMat = (THREE, color, opacity = 0.72) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.2, depthWrite: false });

// Lab bench: a wide top (surface at y = 0) on a dark cabinet.
export function bench(k, { w = 12, d = 3, pos = [0, 0, 0], color = 0xf2efe8 } = {}) {
  const { THREE, kit } = k;
  const g = new THREE.Group();
  g.position.set(...pos);
  k.scene.add(g);
  const top = kit.mesh(new THREE.BoxGeometry(w, 0.12, d), kit.mat(color, { roughness: 0.6 }), [0, -0.06, 0], g);
  top.castShadow = false;
  const body = kit.mesh(new THREE.BoxGeometry(w - 0.3, 1.1, d - 0.3), kit.mat(0x51606f), [0, -0.67, 0], g);
  body.castShadow = false;
  return g;
}

// Beaker: open glass cylinder with a rim; liquid is a cylinder scaled in height.
export function beaker(k, { r = 0.5, h = 1, pos = [0, 0, 0], parent, fill = 0.5, color = 0x8ecae6, opacity } = {}) {
  const { THREE } = k, m = labMats(k);
  const g = new THREE.Group();
  g.position.set(...pos);
  (parent ?? k.scene).add(g);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, true).translate(0, h / 2, 0), m.glass);
  wall.renderOrder = 3;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(r, 32).rotateX(-Math.PI / 2).translate(0, 0.005, 0), m.glass);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 6, 40).rotateX(Math.PI / 2).translate(0, h, 0), m.rim);
  const foot = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 6, 40).rotateX(Math.PI / 2).translate(0, 0.01, 0), m.rim);
  g.add(wall, bottom, rim, foot);
  const mat = liquidMat(THREE, color, opacity);
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.96, 1, 32).translate(0, 0.5, 0), mat);
  liquid.renderOrder = 2;
  g.add(liquid);
  const b = {
    group: g, liquid, mat, r, h, fill,
    setFill(f) { b.fill = f; liquid.visible = f > 0.002; liquid.scale.y = Math.max(0.001, f * h); },
    setColor(c) { mat.color.set(c); },
    surface() { return b.fill * h; },
  };
  b.setFill(fill);
  return b;
}

// Test tube with a round bottom. Liquid fill is 0..1 of the tube height.
export function testTube(k, { r = 0.14, h = 1.1, pos = [0, 0, 0], parent, fill = 0.4, color = 0x8ecae6, opacity } = {}) {
  const { THREE } = k, m = labMats(k);
  const g = new THREE.Group();
  g.position.set(...pos);
  (parent ?? k.scene).add(g);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h - r, 20, 1, true).translate(0, r + (h - r) / 2, 0), m.glass);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, r, 0), m.glass);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 6, 24).rotateX(Math.PI / 2).translate(0, h, 0), m.rim);
  wall.renderOrder = cap.renderOrder = 3;
  g.add(wall, cap, rim);
  const mat = liquidMat(THREE, color, opacity);
  const ri = r * 0.9;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(ri, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, r, 0), mat);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, 1, 20).translate(0, 0.5, 0), mat);
  col.position.y = r;
  bowl.renderOrder = col.renderOrder = 2;
  g.add(bowl, col);
  const t = {
    group: g, mat, r, h, fill,
    setFill(f) { t.fill = f; const y = f * h; bowl.visible = y > 0.01; col.visible = y > r; col.scale.y = Math.max(0.001, y - r); },
    setColor(c) { mat.color.set(c); },
    surface() { return Math.max(r, t.fill * h); },
  };
  t.setFill(fill);
  return t;
}

// Conical (Erlenmeyer) flask from a lathe profile. The liquid is a matching lathe up to `fill` of the cone height.
export function flask(k, { r = 0.55, h = 0.9, neckR = 0.15, neckH = 0.45, pos = [0, 0, 0], parent, fill = 0.35, color = 0x8ecae6, opacity } = {}) {
  const { THREE } = k, m = labMats(k);
  const g = new THREE.Group();
  g.position.set(...pos);
  (parent ?? k.scene).add(g);
  const prof = [new THREE.Vector2(0.001, 0), new THREE.Vector2(r, 0), new THREE.Vector2(r, 0.04), new THREE.Vector2(neckR, h), new THREE.Vector2(neckR, h + neckH)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), m.glass);
  body.renderOrder = 3;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(neckR, 0.02, 6, 24).rotateX(Math.PI / 2).translate(0, h + neckH, 0), m.rim);
  g.add(body, rim);
  const mat = liquidMat(THREE, color, opacity);
  const ly = Math.max(0.05, fill * h), rr = y => r * 0.95 + (neckR * 0.9 - r * 0.95) * (y / h);
  const lprof = [new THREE.Vector2(0.001, 0.01), new THREE.Vector2(r * 0.95, 0.01), new THREE.Vector2(r * 0.95, 0.04), new THREE.Vector2(rr(ly), ly), new THREE.Vector2(0.001, ly)];
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(lprof, 32), mat);
  liquid.renderOrder = 2;
  g.add(liquid);
  return { group: g, liquid, mat, r, h, neckR, neckH, top: h + neckH, surface: ly, surfaceR: rr(ly), setColor(c) { mat.color.set(c); } };
}

// Rubber stopper (bung) for a neck of radius nr, sitting with its bottom at y.
export function stopper(k, { nr = 0.15, y = 1.35, parent, hole = false } = {}) {
  const { THREE } = k, m = labMats(k);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(nr * 1.25, nr * 0.95, 0.2, 20).translate(0, 0.1, 0), m.rubber);
  s.position.y = y - 0.06;
  s.castShadow = true;
  (parent ?? k.scene).add(s);
  return s;
}

// Digital top-pan balance. Objects stand on the pan at y = bal.top (in the parent's space). set(grams) updates the screen.
export function balance(k, { pos = [0, 0, 0], parent, w = 1.5, d = 1.2, decimals = 2 } = {}) {
  const { THREE, kit } = k, m = labMats(k);
  const g = new THREE.Group();
  g.position.set(...pos);
  (parent ?? k.scene).add(g);
  kit.mesh(new THREE.BoxGeometry(w, 0.22, d), kit.mat(0xf1f3f5, { roughness: 0.5 }), [0, 0.11, 0], g);
  // Display panel on the front edge, tilted up towards the viewer.
  const slope = kit.mesh(new THREE.BoxGeometry(w * 0.86, 0.1, 0.3), kit.mat(0xdee2e6), [0, 0.2, d / 2 - 0.12], g);
  slope.rotation.x = 0.5;
  kit.mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.06, 12), m.steel, [0, 0.25, -0.05], g);
  kit.mesh(new THREE.CylinderGeometry(Math.min(w, d) * 0.36, Math.min(w, d) * 0.36, 0.035, 32), m.steel, [0, 0.29, -0.05], g);
  let text = '';
  const tex = paint(THREE, 256, 64, () => {});
  const draw = (gg, W, H) => {
    gg.fillStyle = '#1d3b2a'; gg.fillRect(0, 0, W, H);
    gg.fillStyle = '#7dffb2'; gg.font = 'bold 46px monospace'; gg.textAlign = 'right'; gg.textBaseline = 'middle';
    gg.fillText(text, W - 14, H / 2 + 2);
  };
  const sh = Math.min(0.26, w * 0.155);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sh * 4, sh), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.copy(slope.position).addScaledVector(new THREE.Vector3(0, Math.cos(0.5), Math.sin(0.5)), 0.052);
  screen.rotation.x = -(Math.PI / 2 - 0.5);
  g.add(screen);
  const bal = {
    group: g, top: 0.31, screen, value: null,
    set(grams) {
      const t = `${grams.toFixed(decimals)} g`;
      if (t === text) return;
      text = t; bal.value = grams; tex.redraw(draw);
    },
  };
  bal.set(0);
  return bal;
}

// Gas syringe lying along +x from pos (the nozzle end). set(volume) moves the plunger out; the
// barrel shows a scale from 0 to maxVol (cm³).
export function syringe(k, { len = 2.2, r = 0.17, pos = [0, 0, 0], parent, maxVol = 100, feet = 0.5 } = {}) {
  const { THREE, kit } = k, m = labMats(k);
  const g = new THREE.Group();
  g.position.set(...pos);
  (parent ?? k.scene).add(g);
  const barrelTex = paint(THREE, 512, 64, (gg, W, H) => {
    gg.clearRect(0, 0, W, H);
    gg.fillStyle = 'rgba(30,50,70,0.9)'; gg.font = 'bold 20px sans-serif'; gg.textAlign = 'center';
    for (let v = 0; v <= maxVol; v += 10) {
      const x = 16 + (v / maxVol) * (W - 32);
      gg.fillRect(x - 1.5, 0, 3, v % 50 === 0 ? 30 : 18);
      if (v % 20 === 0) gg.fillText(String(v), x, 52);
    }
  });
  const barrelGeo = new THREE.CylinderGeometry(r, r, len, 24, 1, true).rotateZ(-Math.PI / 2).translate(len / 2, 0, 0);
  const barrel = new THREE.Mesh(barrelGeo, m.glass);
  barrel.renderOrder = 3;
  // The scale is a thin strip on the front (+z) side of the barrel.
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.92, r * 0.9), new THREE.MeshBasicMaterial({ map: barrelTex, transparent: true, depthWrite: false }));
  strip.position.set(len * 0.04 + len * 0.46, 0, r + 0.004);
  strip.renderOrder = 4;
  const nozzle = kit.mesh(new THREE.CylinderGeometry(0.05, r * 0.9, 0.16, 16).rotateZ(Math.PI / 2).translate(-0.06, 0, 0), m.rim, [0, 0, 0], g);
  nozzle.castShadow = false;
  const endRing = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 6, 24).rotateY(Math.PI / 2).translate(len, 0, 0), m.rim);
  g.add(barrel, strip, endRing);
  const plunger = new THREE.Group();
  g.add(plunger);
  kit.mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, 0.06, 24).rotateZ(Math.PI / 2), kit.mat(0x495057), [0, 0, 0], plunger);
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8).rotateZ(Math.PI / 2).translate(len / 2, 0, 0), m.rim, [0, 0, 0], plunger);
  kit.mesh(new THREE.CylinderGeometry(r * 1.1, r * 1.1, 0.05, 20).rotateZ(Math.PI / 2), m.rim, [len, 0, 0], plunger);
  // Gas inside: a faint cylinder from the nozzle to the plunger.
  const gasMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false });
  const gas = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 1, 20).rotateZ(Math.PI / 2).translate(0.5, 0, 0), gasMat);
  gas.renderOrder = 2;
  g.add(gas);
  // Stand: two feet under the barrel, `feet` tall (set it to the barrel's height above the bench minus r).
  for (const x of [len * 0.2, len * 0.8]) kit.mesh(new THREE.BoxGeometry(0.08, feet, 0.3), m.steel, [x, -r - feet / 2, 0], g).castShadow = false;
  const x0 = len * 0.04, x1 = len * 0.96;
  const s = {
    group: g, plunger, gas, gasMat, len, r, maxVol, volume: 0,
    set(v) {
      s.volume = v;
      const x = x0 + (x1 - x0) * Math.max(0, Math.min(1, v / maxVol));
      plunger.position.x = x;
      gas.visible = x > x0 + 0.01; gas.scale.x = Math.max(0.001, x);
    },
  };
  s.set(0);
  return s;
}

// Liquid-in-glass thermometer standing upright, bulb at its local origin. set(°C) moves the red column.
export function thermometer(k, { h = 1.6, pos = [0, 0, 0], parent, min = 0, max = 50 } = {}) {
  const { THREE, kit } = k, m = labMats(k);
  const g = new THREE.Group();
  g.position.set(...pos);
  (parent ?? k.scene).add(g);
  const red = kit.mat(0xe03131, { roughness: 0.3, emissive: 0x400000 });
  const glassTube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 12, 1, true).translate(0, h / 2 + 0.05, 0), m.glass);
  glassTube.renderOrder = 3;
  g.add(glassTube);
  kit.mesh(new THREE.SphereGeometry(0.075, 14, 10), red, [0, 0, 0], g).castShadow = false;
  const col = kit.mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 8).translate(0, 0.5, 0), red, [0, 0.05, 0], g);
  col.castShadow = false;
  // Tick marks every 10 °C on a white card behind the tube.
  const cardTex = paint(THREE, 64, 256, (gg, W, H) => {
    gg.fillStyle = '#ffffff'; gg.fillRect(0, 0, W, H);
    gg.fillStyle = '#334'; gg.font = 'bold 15px sans-serif'; gg.textAlign = 'left'; gg.textBaseline = 'middle';
    for (let v = min; v <= max; v += 10) {
      const y = H - 8 - ((v - min) / (max - min)) * (H - 16);
      gg.fillRect(0, y - 1, 18, 2);
      gg.fillText(String(v), 22, y);
    }
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.2, h * 0.9), new THREE.MeshBasicMaterial({ map: cardTex }));
  card.position.set(0.12, 0.05 + h * 0.05 + h * 0.45, -0.02);
  g.add(card);
  const span = h * 0.9, base = h * 0.05;
  const th = {
    group: g, value: min,
    set(T) {
      th.value = T;
      const f = Math.max(0, Math.min(1, (T - min) / (max - min)));
      col.scale.y = base + span * (8 + 240 * f) / 256; // matches the tick marks on the card
    },
  };
  th.set(20);
  return th;
}

// Rising bubbles inside a cylinder of radius r from y0 to y1 (in the parent's space). Deterministic:
// bubble i's height comes only from t, so the video exporter sees the same frames. rate 0..1 sets
// how many bubbles show and how fast they rise.
export function bubbles(k, { parent, n = 40, r = 0.4, y0 = 0.05, y1 = 0.6, size = 0.03, color = 0xffffff, x = 0, z = 0, spread = 1 } = {}) {
  const { THREE } = k;
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8, roughness: 0.1 }), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.count = 0;
  mesh.renderOrder = 4;
  (parent ?? k.scene).add(mesh);
  const A = mesh.instanceMatrix.array;
  const b = {
    mesh, r, y0, y1, x, z, spread,
    tick(t, rate) {
      let c = 0;
      if (rate > 0.001) {
        const speed = 0.25 + 0.55 * Math.min(1, rate);
        for (let i = 0; i < n; i++) {
          if (rand(i * 3 + 1) > rate) continue;
          const life = (b.y1 - b.y0) / (speed * (0.7 + 0.6 * rand(i * 7 + 2)));
          const ph = ((t / life + rand(i * 11 + 5)) % 1 + 1) % 1;
          const a = rand(i * 13 + 3) * Math.PI * 2, rr = Math.sqrt(rand(i * 17 + 4)) * b.r * b.spread;
          const s = size * (0.6 + 0.8 * rand(i * 19 + 6)) * (0.7 + 0.5 * ph);
          const o = c * 16;
          A[o] = s; A[o + 1] = 0; A[o + 2] = 0; A[o + 3] = 0;
          A[o + 4] = 0; A[o + 5] = s; A[o + 6] = 0; A[o + 7] = 0;
          A[o + 8] = 0; A[o + 9] = 0; A[o + 10] = s; A[o + 11] = 0;
          A[o + 12] = b.x + Math.cos(a) * rr + Math.sin(t * 3 + i) * 0.01; A[o + 13] = b.y0 + ph * (b.y1 - b.y0); A[o + 14] = b.z + Math.sin(a) * rr; A[o + 15] = 1;
          c++;
        }
      }
      mesh.count = c;
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
  return b;
}

// Glass or rubber delivery tube through a list of points.
export function tube(k, pts, { r = 0.035, parent, mat } = {}) {
  const { THREE } = k, m = labMats(k);
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.1);
  const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r, 8, false), mat ?? m.tube);
  t.renderOrder = 3;
  (parent ?? k.scene).add(t);
  return t;
}

// Simple arrow (shaft + cone) along +y in its own space, for heat in/out pictures.
export function arrow(k, { color = 0xe8590c, len = 0.6, r = 0.04, parent } = {}) {
  const { THREE } = k;
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8).translate(0, len / 2, 0), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, r * 5, 12).translate(0, len + r * 2.5, 0), mat);
  g.add(shaft, head);
  g.mat = mat;
  (parent ?? k.scene).add(g);
  return g;
}

// A flat sign with text drawn on a canvas, e.g. a formula over a station. setText redraws it.
export function sign(k, { w = 2, h = 0.5, px = 512, py = 128, text = '', bg = '#ffffff', color = '#1d2b36', font = 'bold 54px sans-serif', parent } = {}) {
  const { THREE } = k;
  let cur = text;
  const tex = paint(THREE, px, py, () => {});
  const draw = (g, W, H) => {
    g.clearRect(0, 0, W, H);
    if (bg) { g.fillStyle = bg; const r = H * 0.22; g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, r); g.fill(); }
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(cur, W / 2, H / 2 + 3);
  };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  (parent ?? k.scene).add(m);
  // setText(text, { bg, color }) redraws only when something changed.
  m.setText = (t, o = {}) => {
    const nb = o.bg ?? bg, nc = o.color ?? color;
    if (t === cur && nb === bg && nc === color && m.drawn) return;
    cur = t; bg = nb; color = nc; m.drawn = true; tex.redraw(draw);
  };
  m.setText(text);
  return m;
}
