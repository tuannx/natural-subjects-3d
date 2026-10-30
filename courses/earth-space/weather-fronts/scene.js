// Weather: air pressure, highs and lows, wind, air masses and fronts.
// A long strip of land is the stage for the side views: a climber on a mountain with a barometer (pressure
// halves about every 5.5 km), a town under rising or sinking air, a high-to-low wind loop, and cold and warm
// fronts as cross-sections that a time slider moves over the town. A flat map shows air masses and a
// weather map with isobars (marching squares on a simple pressure field), H and L, and front symbols.
import { rand, makeSun } from '../_shared/sky.js';
import { makeCloud, makeStormCloud, makeRain, makeFlow, makeArrowPath } from '../_shared/atmos.js';

const P0 = 1013, HALF = 5.5, KM = 0.66;          // sea-level pressure, km per halving, scene units per km
const pressureAt = h => P0 * Math.pow(0.5, h / HALF);
const MT = { x: -3, z: -0.2, r: 2.4, h: 8.8 * KM }; // mountain (as high as Everest, about 8.8 km)
const TOP = 7.2;                                    // top of the drawn air
const COLD_SPEED = 14 / 12, WARM_SPEED = 0.75;      // scene units per hour

// Weather-map pressure field (map units, before the system moves): a high in the west, a low in the middle.
const HI = { x: -6.5, z: 1.5, dp: 19, s: 9 }, LO = { x: 0, z: -1, dp: -25, s: 7.8 };
const field = (x, z) => P0 + HI.dp * Math.exp(-((x - HI.x) ** 2 + (z - HI.z) ** 2) / HI.s) + LO.dp * Math.exp(-((x - LO.x) ** 2 + (z - LO.z) ** 2) / LO.s);
const WARM_LINE = [[0, -1], [1.4, -0.6], [2.8, 0.2], [3.8, 1.3], [4.4, 2.6]];
const COLD_LINE = [[0, -1], [-0.2, 0.6], [-0.9, 2.1], [-2.0, 3.4], [-3.2, 4.6]];
const TOWN_MAP = [2.5, 1.3];
const mapShift = t => -5 + t * (11 / 48);
const lineXAt = (line, z) => {
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    if ((z - az) * (z - bz) <= 0) return ax + ((bx - ax) * (z - az)) / (bz - az || 1);
  }
  return line[line.length - 1][0];
};
const AIR_MASSES = [
  { key: 'cP', name: 'Cold, dry', long: 'continental polar', at: [-0.4, -3.1], size: [1.9, 0.9, 1.3], color: 0x3b82f6, moist: false, where: 'over cold land in the far north', brings: 'cold, dry, clear weather' },
  { key: 'mP', name: 'Cold, moist', long: 'maritime polar', at: [-6.9, -2.6], size: [1.05, 0.9, 1.6], color: 0x06b6d4, moist: true, where: 'over the cold northern ocean', brings: 'cool, cloudy, damp weather' },
  { key: 'cT', name: 'Warm, dry', long: 'continental tropical', at: [-3.0, 2.7], size: [1.4, 0.8, 1.1], color: 0xf59e0b, moist: false, where: 'over hot desert land in the south', brings: 'hot, dry weather' },
  { key: 'mT', name: 'Warm, moist', long: 'maritime tropical', at: [1.5, 3.9], size: [1.9, 0.9, 1.0], color: 0xef4444, moist: true, where: 'over the warm tropical ocean', brings: 'warm, humid weather with showers' },
];

export default function setup({ THREE, scene, renderer, kit, ui, label, view }) {
  renderer.localClippingEnabled = true;
  const skyClear = new THREE.Color(0xbfe3ff), skyGrey = new THREE.Color(0x9aa6b2);
  scene.background = skyClear.clone();
  kit.lights(scene, { sun: [-5, 10, 6] });

  // ---------- the strip of land (side views) ----------
  const strip = new THREE.Group();
  scene.add(strip);
  {
    const g = kit.mesh(new THREE.BoxGeometry(20, 0.3, 5), [kit.mat(0x8b6a4a), kit.mat(0x8b6a4a), kit.mat(0x7dbb5c), kit.mat(0x8b6a4a), kit.mat(0x8b6a4a), kit.mat(0x8b6a4a)], [0, -0.15, 0], strip);
    g.castShadow = false;
  }
  const town = new THREE.Group();
  strip.add(town);
  const roofMat = kit.mat(0xc2410c), wallMats = [kit.mat(0xf1e4d0), kit.mat(0xdfe7ee), kit.mat(0xf6d9a8)];
  for (let i = 0; i < 5; i++) {
    const x = -0.75 + i * 0.38, z = 0.3 + (i % 2) * 0.55, s = 0.26 + rand(i + 3) * 0.08;
    kit.mesh(new THREE.BoxGeometry(s, s, s), wallMats[i % 3], [x, s / 2, z], town);
    const roof = kit.mesh(new THREE.ConeGeometry(s * 0.78, s * 0.55, 4), roofMat, [x, s + s * 0.27, z], town);
    roof.rotation.y = Math.PI / 4;
  }

  // Mountain, climber, the column of air above the climber, and dots of air (thinner higher up).
  const mountain = new THREE.Group();
  strip.add(mountain);
  {
    const geo = new THREE.ConeGeometry(MT.r, MT.h, 12, 6);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + MT.h / 2;
      c.set(y > MT.h * 0.62 ? 0xf4f7fb : y > MT.h * 0.3 ? 0x8d8579 : 0x6f9d55);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    kit.mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }), [MT.x, MT.h / 2, MT.z], mountain);
  }
  const climber = new THREE.Group();
  kit.mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.26, 8), kit.mat(0xe63946), [0, 0.13, 0], climber);
  kit.mesh(new THREE.SphereGeometry(0.07, 10, 8), kit.mat(0xf2c9a0), [0, 0.33, 0], climber);
  climber.scale.setScalar(1.5);
  mountain.add(climber);
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.6), new THREE.MeshStandardMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.32, depthWrite: false }));
  mountain.add(column);
  {
    const N = 650, pos = new Float32Array(N * 3), k = HALF * KM / Math.LN2; // density falls by half every 5.5 km
    for (let i = 0; i < N; i++) {
      const u = rand(i * 2.1);
      const y = -k * Math.log(1 - u * (1 - Math.exp(-TOP / k)));
      pos.set([-7 + rand(i * 3.7) * 9.5, y, -2.2 + rand(i * 5.3) * 4.4], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    mountain.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x1e3a8a, size: 0.08, transparent: true, opacity: 0.7, depthWrite: false })));
  }

  // Barometers on a post: one with a wide scale (for heights), one with the weather words.
  const altDial = makeDial(THREE, { min: 300, max: 1050, step: 50, every: 2, words: [] });
  const wxDial = makeDial(THREE, { min: 960, max: 1060, step: 5, every: 4, words: [[965, 'Stormy'], [985, 'Rain'], [1005, 'Change'], [1025, 'Fair'], [1045, 'Very dry']] });
  const dialPost = new THREE.Group();
  strip.add(dialPost);
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), kit.mat(0x64748b), [0, 0.6, 0], dialPost);
  dialPost.add(altDial.obj, wxDial.obj);
  dialPost.scale.setScalar(1.3);
  altDial.obj.position.y = wxDial.obj.position.y = 1.55;

  // Rising and sinking air over the town, clouds, rain and a Sun.
  const up = [], down = [];
  for (let i = 0; i < 5; i++) {
    const z = -0.9 + i * 0.45, x0 = i % 2 ? -1.6 : 1.6;
    up.push(makeFlow(THREE, [[x0, 0.15, z], [x0 * 0.35, 0.45, z], [x0 * 0.08, 1.4, z * 0.6], [0, 3.2, z * 0.4]], { count: 10, color: 0xf97316, size: 0.06, speed: 0.9, seed: i * 11 }));
    down.push(makeFlow(THREE, [[0, 3.2, z * 0.4], [x0 * 0.08, 1.4, z * 0.6], [x0 * 0.35, 0.45, z], [x0, 0.15, z]], { count: 10, color: 0x2563eb, size: 0.06, speed: 0.9, seed: 50 + i * 11 }));
  }
  const townClouds = [makeCloud(THREE, { seed: 2, size: 0.8 }), makeCloud(THREE, { seed: 7, size: 0.65 }), makeCloud(THREE, { seed: 12, size: 0.7 })];
  townClouds[0].position.set(-0.4, 3.5, -0.3); townClouds[1].position.set(1.0, 3.8, -0.8); townClouds[2].position.set(-1.6, 3.9, -0.9);
  const townRain = makeRain(THREE, { count: 140, w: 1.1, d: 0.6, top: 3.2, bottom: 0, speed: 7, seed: 5 });
  townRain.obj.position.set(-0.3, 0, -0.3);
  const sun = makeSun(THREE, 0.45);
  sun.position.set(-3, 4.6, -1.5);
  strip.add(...up.map(f => f.obj), ...down.map(f => f.obj), ...townClouds, townRain.obj, sun);

  // Wind loop: sinking over H, along the ground to L, rising over L, back high up.
  const loopH = -4, loopL = 4;
  const ground = [-0.9, 0, 0.9].map((z, i) => makeFlow(THREE, [[loopH + 0.6, 0.25, z], [0, 0.25, z], [loopL - 0.6, 0.25, z]], { count: 14, color: 0x0ea5e9, size: 0.07, speed: 2, seed: 200 + i * 9 }));
  const sinkH = makeFlow(THREE, [[loopH + 0.5, 3.8, 0], [loopH, 2.6, 0], [loopH, 1.0, 0], [loopH + 0.5, 0.3, 0]], { count: 10, color: 0x2563eb, size: 0.07, speed: 1, seed: 230 });
  const riseL = makeFlow(THREE, [[loopL - 0.5, 0.3, 0], [loopL, 1.0, 0], [loopL, 2.6, 0], [loopL - 0.5, 3.8, 0]], { count: 10, color: 0xf97316, size: 0.07, speed: 1, seed: 240 });
  const aloft = makeFlow(THREE, [[loopL - 0.6, 4.0, 0], [0, 4.15, 0], [loopH + 0.6, 4.0, 0]], { count: 12, color: 0x94a3b8, size: 0.07, speed: 1, seed: 250 });
  const loopFlows = [...ground, sinkH, riseL, aloft];
  strip.add(...loopFlows.map(f => f.obj));
  const lowCloud = makeCloud(THREE, { seed: 21, size: 0.9 });
  lowCloud.position.set(loopL, 4.6, -0.6);
  strip.add(lowCloud);
  const hSign = letterSprite(THREE, 'H', '#1d4ed8'), lSign = letterSprite(THREE, 'L', '#dc2626');
  hSign.position.set(loopH, 0.7, 1.6); lSign.position.set(loopL, 0.7, 1.6);
  strip.add(hSign, lSign);
  // Windsock: a striped cone on a pole that swings up as the wind grows.
  const sock = new THREE.Group();
  sock.position.set(0, 1.6, 1.5);
  sock.scale.setScalar(1.5);
  strip.add(sock);
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), kit.mat(0x475569), [0, -0.55, 0], sock);
  const sockArm = new THREE.Group();
  sock.add(sockArm);
  {
    const geo = new THREE.CylinderGeometry(0.06, 0.13, 0.7, 12, 1, true);
    geo.rotateZ(Math.PI / 2); geo.translate(0.35, 0, 0); // wide end at the pole, pointing +X
    kit.mesh(geo, new THREE.MeshStandardMaterial({ map: stripes(THREE), side: THREE.DoubleSide, roughness: 0.8 }), [0, 0, 0], sockArm);
  }

  // ---------- fronts (cross-sections) ----------
  const clipX = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 9.95), new THREE.Plane(new THREE.Vector3(-1, 0, 0), 9.95)];
  const slab = (pts, color, opacity) => {
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 2.6, bevelEnabled: false });
    geo.translate(0, 0, -1.3);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  };
  const line = (pts, color) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 1.31))), 40, 0.035, 5), new THREE.MeshBasicMaterial({ color }));
  const COLD = 0x4f8ff0, WARM = 0xffa040;
  // Cold front: a steep, blunt wedge of cold air (front edge at local x = 0).
  const coldB = u => 2.6 * (1 - Math.exp(u / 1.1)), warmB = u => 3.2 * (1 - Math.exp(-u / 16));
  const cf = new THREE.Group();
  {
    const b = [];
    for (let u = -24; u <= 0.001; u += 0.25) b.push([u, coldB(u)]);
    cf.add(slab([[-24, 0], ...b], COLD, 0.5));
    cf.add(slab([[24, 0], [24, 3.6], [-24, 3.6], ...b], WARM, 0.5));
    cf.add(line(b.filter(([u]) => u > -6), 0x1e3a8a));
    const storm = makeStormCloud(THREE, { seed: 5, height: 2.7, width: 0.8 });
    storm.position.set(0.1, 1.05, 0);
    const cu = makeCloud(THREE, { seed: 8, size: 0.5 }); cu.position.set(1.9, 1.95, -0.2);
    const fair = makeCloud(THREE, { seed: 15, size: 0.45 }); fair.position.set(-5.2, 3.0, -0.3);
    cf.add(storm, cu, fair);
    cf.add(makeArrowPath(THREE, [[3.4, 0.45, 1.36], [1.2, 0.62, 1.36], [0.35, 1.5, 1.36], [-0.15, 2.9, 1.36]], { color: 0xc2410c, radius: 0.045 }));
    cf.add(makeArrowPath(THREE, [[-5, 0.35, 1.36], [-1.7, 0.35, 1.36]], { color: 0x1e40af, radius: 0.045 }));
  }
  const cfRain = makeRain(THREE, { count: 170, w: 0.6, d: 1.0, top: 1.1, bottom: 0, speed: 8, seed: 31 });
  cfRain.obj.position.x = 0.1;
  cf.add(cfRain.obj);
  // Warm front: warm air gliding up a long gentle slope over the cold air ahead of it.
  const wf = new THREE.Group();
  {
    const b = [];
    for (let u = 0; u <= 24.001; u += 0.5) b.push([u, warmB(u)]);
    wf.add(slab([[0, 0], ...b, [24, 0]], COLD, 0.5));
    wf.add(slab([[-24, 0], [0, 0], ...b, [24, 3.6], [-24, 3.6]], WARM, 0.5));
    wf.add(line(b.filter(([u]) => u < 15), 0x9a3412));
    for (const [u, dy, size, flat, color, op] of [[0.9, 0.55, 0.9, 0.42, 0xb8c0ca, 1], [2.3, 0.55, 0.9, 0.42, 0xc3cad3, 1], [3.7, 0.55, 0.9, 0.42, 0xcdd3db, 1],
      [5.6, 0.5, 0.95, 0.3, 0xe2e7ed, 0.95], [7.6, 0.5, 0.95, 0.28, 0xeef1f5, 0.9], [10.6, 0, 0.9, 0.1, 0xffffff, 0.85], [12.8, 0, 0.8, 0.1, 0xffffff, 0.8]]) {
      const c = makeCloud(THREE, { seed: u * 10, size, flat, color });
      c.userData.mat.opacity = op;
      c.scale.x = 1.15;
      c.position.set(u, u > 10 ? 3.2 : warmB(u) + dy, (rand(u) - 0.5) * 0.4);
      wf.add(c);
    }
    wf.add(makeArrowPath(THREE, [[-4, 0.5, 1.36], [-0.5, 0.55, 1.36], [3, 1.08, 1.36], [7, 1.85, 1.36], [10, 2.35, 1.36]], { color: 0xc2410c, radius: 0.045 }));
    wf.add(makeArrowPath(THREE, [[5, 0.3, 1.36], [7.5, 0.3, 1.36]], { color: 0x1e40af, radius: 0.045 }));
  }
  const wfRain = makeRain(THREE, { count: 130, w: 1.6, d: 1.0, top: 0.62, bottom: 0, speed: 4, len: 0.14, seed: 41 });
  wfRain.obj.position.x = 2.3;
  wf.add(wfRain.obj);
  strip.add(cf, wf);
  for (const g of [cf, wf]) g.traverse(o => { if (o.material) o.material.clippingPlanes = clipX; });

  // ---------- the map ----------
  const map = new THREE.Group();
  scene.add(map);
  {
    const m = kit.mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshStandardMaterial({ map: paintMap(THREE), roughness: 1 }), [0, 0, 0], map);
    m.rotation.x = -Math.PI / 2; m.castShadow = false;
    const edge = kit.mesh(new THREE.BoxGeometry(16.3, 0.25, 10.3), kit.mat(0xe2e8f0), [0, -0.13, 0], map);
    edge.castShadow = false;
  }
  // Air masses: see-through domes; the moist ones are full of vapour dots.
  const domeGeo = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const masses = AIR_MASSES.map((a, i) => {
    const g = new THREE.Group();
    g.position.set(a.at[0], 0, a.at[1]);
    const mat = new THREE.MeshStandardMaterial({ color: a.color, transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.6 });
    const d = new THREE.Mesh(domeGeo, mat);
    d.scale.set(...a.size);
    g.add(d);
    const n = a.moist ? 46 : 5, pos = new Float32Array(n * 3);
    for (let j = 0; j < n; j++) {
      const r = Math.sqrt(rand(i * 100 + j)) * 0.85, th = rand(i * 100 + j + 50) * Math.PI * 2;
      pos.set([Math.cos(th) * r * a.size[0], 0.1 + rand(i * 100 + j + 70) * 0.55 * a.size[1] * (1 - r * 0.8), Math.sin(th) * r * a.size[2]], j * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x1e40af, size: 0.12, transparent: true, opacity: 0.85, depthWrite: false })));
    map.add(g);
    return { g, mat };
  });
  // Weather layer: isobars, H and L, fronts. It slides east with time; clipped to the map's edges.
  const clipMap = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 8), new THREE.Plane(new THREE.Vector3(-1, 0, 0), 8),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 5), new THREE.Plane(new THREE.Vector3(0, 0, -1), 5)];
  const wx = new THREE.Group();
  map.add(wx);
  {
    const seg = contours(field, -14, 14, -5.5, 5.5, 112, 44, [992, 996, 1000, 1004, 1008, 1012, 1016, 1020, 1024, 1028]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    wx.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1f2937, transparent: true, opacity: 0.75 })));
    const frontLine = (pts, color, sym) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0.06, z)));
      wx.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.06, 5), new THREE.MeshBasicMaterial({ color })));
      const L = curve.getLength(), n = Math.floor(L / 0.75), symMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const symGeo = sym === 'tri'
        ? new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.2, 0, 0), new THREE.Vector3(0.2, 0, 0), new THREE.Vector3(0, 0, -0.32)])
        : new THREE.CircleGeometry(0.19, 12, 0, Math.PI).rotateX(-Math.PI / 2);
      const Y = new THREE.Vector3(0, 1, 0), Zd = new THREE.Vector3(), m4 = new THREE.Matrix4();
      for (let i = 1; i <= n; i++) {
        const u = (i - 0.5) / n, p = curve.getPointAt(u), d = curve.getTangentAt(u);
        d.y = 0; d.normalize();
        Zd.set(-d.z, 0, d.x); // the symbols point along -Zd, the way the front moves (east / north-east)
        const s = new THREE.Mesh(symGeo, symMat);
        m4.makeBasis(d, Y, Zd); s.quaternion.setFromRotationMatrix(m4);
        s.position.copy(p); s.position.y = 0.065;
        wx.add(s);
      }
    };
    frontLine(WARM_LINE, 0xdc2626, 'semi');
    frontLine(COLD_LINE, 0x1d4ed8, 'tri');
  }
  const mapH = letterSprite(THREE, 'H', '#1d4ed8'), mapL = letterSprite(THREE, 'L', '#dc2626');
  mapH.position.set(HI.x, 0.55, HI.z); mapL.position.set(LO.x, 0.55, LO.z);
  mapH.scale.setScalar(1.1); mapL.scale.setScalar(1.1);
  wx.add(mapH, mapL);
  wx.traverse(o => { if (o.material) o.material.clippingPlanes = clipMap; });
  const mapTown = new THREE.Group();
  mapTown.position.set(TOWN_MAP[0], 0, TOWN_MAP[1]);
  map.add(mapTown);
  kit.mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16), kit.mat(0x111827), [0, 0.04, 0], mapTown);
  kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 16), kit.mat(0xfacc15), [0, 0.08, 0], mapTown);
  // anchor points on the moving layer for labels
  const anchor = (x, z, y = 0.1) => { const o = new THREE.Object3D(); o.position.set(x, y, z); wx.add(o); return o; };
  const coldAt = anchor(-2.0, 3.4), warmAt = anchor(2.3, -0.15);
  let isoZ = LO.z; while (field(LO.x, isoZ) < 1004 && isoZ > -5) isoZ -= 0.02;
  const isoAt = anchor(LO.x, isoZ);

  // ---------- labels ----------
  const at = (x, y, z) => new THREE.Vector3(x, y, z);
  const L = {
    climber: label('Climber', climber),
    column: label('Air above', at(0, 0, 0), { cls: 'cool' }),
    dial: label('Barometer', at(0, 0, 0)),
    town: label('Town', at(0.1, 0.75, 1.0)),
    wind: label('Wind', at(0, 0.35, 0.9), { cls: 'cool' }),
    sinking: label('Sinking air', at(loopH - 1.25, 2.4, 0)),
    rising: label('Rising air', at(loopL + 1.2, 2.4, 0)),
    coldAir: label('Cold air', at(0, 0, 0), { cls: 'cool' }),
    warmAir: label('Warm air', at(0, 0, 0), { cls: 'warm' }),
    front: label('', at(0, 0, 0)),
    cirrus: label('Cirrus', at(0, 0, 0)),
    masses: AIR_MASSES.map((a, i) => label(a.name, at(a.at[0], a.size[1] + 0.15, a.at[1]), { cls: i < 2 ? 'cool' : 'warm' })),
    mapTown: label('Town', at(TOWN_MAP[0], 0.15, TOWN_MAP[1])),
    mapCold: label('Cold front', coldAt, { cls: 'cool' }),
    mapWarm: label('Warm front', warmAt, { cls: 'warm' }),
    iso: label('Isobar: 1004 hPa', isoAt),
  };

  // ---------- state ----------
  const st = { step: 0, quiz: false, h: 0, hShown: 0, p: 1013, pShown: 1013, hiP: 1024, wind: 1, windShown: 1, mass: 0, t: 0, tShown: 0, demo: null };

  function placeClimber() {
    const y = Math.min(st.hShown * KM, MT.h - 0.05), r = MT.r * (1 - y / MT.h);
    climber.position.set(MT.x + (r + 0.1) * 0.55, y, MT.z + (r + 0.1) * 0.83);
    const top = TOP, bot = y + 0.42;
    column.scale.y = Math.max(0.01, top - bot);
    column.position.set(climber.position.x, (top + bot) / 2, climber.position.z);
    L.column.at.set(climber.position.x, top - 0.2, climber.position.z);
    altDial.setValue(pressureAt(st.hShown));
  }
  function applyPressure() {
    const p = st.pShown, cloud = kit.clamp((1020 - p) / 30, 0, 1), rainF = kit.clamp((1000 - p) / 15, 0, 1);
    townClouds.forEach((c, i) => { const f = kit.clamp(cloud * 1.6 - i * 0.3, 0, 1); c.visible = f > 0.02 && on.townSky; c.scale.setScalar(Math.max(0.01, 0.4 + 0.6 * f)); c.userData.mat.opacity = f; c.userData.mat.color.setScalar(1 - 0.35 * rainF); });
    townRain.setAmount(on.townSky ? rainF : 0);
    const upN = Math.round(10 * kit.clamp((1016 - p) / 20, 0, 1)), downN = Math.round(10 * kit.clamp((p - 1010) / 20, 0, 1));
    for (const f of up) f.setCount(on.townSky ? upN : 0);
    for (const f of down) f.setCount(on.townSky ? downN : 0);
    sun.visible = on.townSky && cloud < 0.7;
    scene.background.copy(skyClear).lerp(skyGrey, on.townSky ? cloud * 0.8 : 0);
    wxDial.setValue(p);
  }
  function applyWind() {
    const w = st.windShown; // 0..1
    for (const f of ground) f.st.speed = 0.4 + 3.2 * w;
    for (const f of [sinkH, riseL, aloft]) f.st.speed = 0.25 + 1.4 * w;
    sockArm.rotation.z = -Math.PI / 2 * (1 - Math.min(1, 0.15 + w)) * 0.95; // hangs down when calm, sticks out toward L in a strong wind
  }
  function placeFronts() {
    const t = st.tShown;
    if (on.cf) {
      const xf = -7 + t * COLD_SPEED;
      cf.position.x = xf;
      if (st.quiz) return;
      L.coldAir.show(xf - 3.2 > -6.3); L.coldAir.at.set(xf - 3.2, 1.2, 1.3);
      L.warmAir.show(true); L.warmAir.at.set(Math.min(5.5, xf + 3.6), 2.7, 1.3);
      L.front.text = 'Cold front'; L.front.at.set(xf + 0.2, 4.1, 0.6);
    } else if (on.wf) {
      const xf = -14 + t * WARM_SPEED;
      wf.position.x = xf;
      if (st.quiz) return;
      L.coldAir.show(true); L.coldAir.at.set(Math.min(5.5, Math.max(xf + 6, -5.5)), 0.5, 1.3);
      L.warmAir.show(xf - 3 > -6.3); L.warmAir.at.set(xf - 3, 1.5, 1.3);
      L.front.text = 'Warm front'; L.front.show(xf > -6); L.front.at.set(xf - 0.2, 0.25, 1.5);
      L.cirrus.show(xf + 11.5 < 6 && xf + 11.5 > -6); L.cirrus.at.set(xf + 11.6, 3.55, 0);
    }
  }
  function placeMap() {
    const s = mapShift(st.tShown);
    wx.position.x = s;
    mapH.visible = Math.abs(HI.x + s) < 7.4; mapL.visible = Math.abs(LO.x + s) < 7.4;
    if (st.step === 6) {
      const inMap = o => Math.abs(o.position.x + s) < 7.6;
      L.mapCold.show(inMap(coldAt)); L.mapWarm.show(inMap(warmAt)); L.iso.show(inMap(isoAt));
    }
  }
  function applyMass() {
    masses.forEach((m, i) => { const sel = st.step !== 3 || i === st.mass; m.mat.opacity = sel ? 0.62 : 0.14; });
    if (st.step === 3) L.masses.forEach((l, i) => l.show(true));
  }

  const on = {};
  function show(parts) {
    for (const k of ['strip', 'mountain', 'town', 'dial', 'alt', 'townSky', 'loop', 'cf', 'wf', 'map', 'masses', 'wx']) on[k] = parts.includes(k);
    strip.visible = on.strip; map.visible = on.map;
    mountain.visible = on.mountain; town.visible = on.town;
    dialPost.visible = on.dial; altDial.obj.visible = on.alt; wxDial.obj.visible = !on.alt;
    for (const f of loopFlows) f.setCount(on.loop ? 14 : 0);
    lowCloud.visible = hSign.visible = lSign.visible = sock.visible = on.loop;
    cf.visible = on.cf; wf.visible = on.wf;
    cfRain.setAmount(on.cf ? 1 : 0); wfRain.setAmount(on.wf ? 1 : 0);
    masses.forEach(m => { m.g.visible = on.masses; });
    wx.visible = on.wx; mapTown.visible = on.wx;
    const labs = parts.filter(p => p.startsWith('L:')).map(p => p.slice(2));
    for (const [k, l] of Object.entries(L)) (Array.isArray(l) ? l : [l]).forEach(x => x.show(labs.includes(k)));
    applyPressure();
  }

  function readout() {
    if (st.quiz) return;
    const i = st.step;
    if (i === 0) {
      const h = Math.round(st.h * 10) / 10;
      ui.readout(`Height <b>${h.toFixed(1)} km</b>: pressure = 1013 hPa × 0.5^(${h.toFixed(1)} ÷ 5.5) ≈ <b>${Math.round(pressureAt(h))} hPa</b><br>That is about <b>${Math.round((pressureAt(h) / P0) * 100)}%</b> of the average pressure at sea level.`);
    } else if (i === 1) {
      const p = st.p, kind = p < 1000 ? 'low pressure' : p < 1009 ? 'a bit low' : p <= 1017 ? 'about average' : p <= 1025 ? 'high pressure' : 'very high pressure';
      const wxT = p < 1000 ? 'air <b>rising</b>: thick clouds and rain' : p < 1009 ? 'air rising: clouds building' : p <= 1017 ? 'some clouds, some sun' : 'air <b>sinking</b>: clear, dry weather';
      ui.readout(`Pressure <b>${p} hPa</b> (${kind}, average about 1013 hPa)<br>${wxT}`);
    } else if (i === 2) {
      const d = st.hiP - 996, kind = d < 26 ? 'a gentle breeze' : d < 36 ? 'a fresh wind' : 'a strong wind';
      ui.readout(`High <b>${st.hiP} hPa</b> − low <b>996 hPa</b> = difference of <b>${d} hPa</b><br>Wind blows from H to L: <b>${kind}</b>`);
    } else if (i === 3) {
      const a = AIR_MASSES[st.mass];
      ui.readout(`<b>${a.name}</b> air mass (${a.long})<br>Forms ${a.where}. Brings ${a.brings}.`);
    } else if (i === 4) {
      const d = 0 - (-7 + st.t * COLD_SPEED);
      const s = d > 2.8 ? ['ahead of the front', 'warm and humid, clouds building in the west', 24, 'falling'] :
        d > 0.75 ? ['the front is very close', 'dark clouds, gusty wind', 24, 'falling fast'] :
          d > -0.8 ? ['under the front', '<b>heavy rain</b>, gusty wind, maybe thunder', 18, 'lowest, starting to rise'] :
            ['behind the front', 'cooler, drier air, clearing sky', 14, 'rising'];
      ui.readout(`Time <b>${st.t.toFixed(1)} h</b> · Town: ${s[0]}<br>${s[1]}<br>Example values: temperature <b>${s[2]} °C</b>, pressure <b>${s[3]}</b>`);
    } else if (i === 5) {
      const d = 0 - (-14 + st.t * WARM_SPEED);
      const s = d > 9 ? ['far ahead of the front', 'high, thin, wispy <b>cirrus</b> clouds', 8, 'starting to fall'] :
        d > 4.5 ? ['ahead of the front', 'grey cloud layers getting thicker and lower', 9, 'falling'] :
          d > 0 ? ['just ahead of the front', '<b>steady light rain</b> that lasts for hours', 10, 'falling'] :
            ['behind the front', 'warmer, humid air; the rain stops', 16, 'steady'];
      ui.readout(`Time <b>${st.t.toFixed(1)} h</b> · Town: ${s[0]}<br>${s[1]}<br>Example values: temperature <b>${s[2]} °C</b>, pressure <b>${s[3]}</b>`);
    } else if (i === 6) {
      const s = mapShift(st.t), lx = TOWN_MAP[0] - s, lz = TOWN_MAP[1];
      const p = field(lx, lz), p2 = field(TOWN_MAP[0] - mapShift(st.t + 1), lz), trend = p2 < p - 0.05 ? 'falling' : p2 > p + 0.05 ? 'rising' : 'steady';
      const where = lx > lineXAt(WARM_LINE, lz) ? 'ahead of the warm front: clouds thicken, rain may come'
        : lx > lineXAt(COLD_LINE, lz) ? 'between the fronts, in the warm air: mild and humid'
          : 'behind the cold front: cooler, clearer air';
      ui.readout(`Time <b>${Math.round(st.t)} h</b> · pressure at the town <b>${Math.round(p)} hPa</b> (${trend})<br>The town is ${where}.`);
    }
  }
  const demo = (key, to, rate, input, round, after) => { st.demo = { key, to, rate, input, round, after }; };

  return {
    step(i, { isQuiz, instant }) {
      st.step = i; st.quiz = isQuiz; st.demo = null;
      if (i === 0) {
        st.h = 0;
        show(['strip', 'mountain', 'dial', 'alt', 'L:climber', 'L:column', 'L:dial']);
        dialPost.position.set(1.3, 0, 0.9);
        view({ radius: 4.2, yaw: 0.15, pitch: 0.16, target: [-1.0, 3.0, 0] }, instant);
        const inp = ui.slider({ label: 'Height', min: 0, max: 8.8, step: 0.1, value: 0, unit: ' km', format: v => v.toFixed(1), onInput: v => { st.demo = null; st.h = v; readout(); } });
        demo('h', 4, 1.4, inp, v => Math.round(v * 10) / 10);
      }
      if (i === 1) {
        st.p = 995;
        show(['strip', 'town', 'dial', 'townSky', 'L:town', 'L:dial']);
        dialPost.position.set(2.2, 0, 0.9);
        view({ radius: 3.0, yaw: 0.1, pitch: 0.14, target: [0.4, 2.0, 0] }, instant);
        ui.slider({ label: 'Pressure', min: 980, max: 1040, step: 1, value: st.p, unit: ' hPa', onInput: v => { st.p = v; readout(); } });
      }
      if (i === 2) {
        st.hiP = 1024;
        show(['strip', 'loop', 'L:wind', 'L:sinking', 'L:rising']);
        view({ radius: 3.0, width: 5.6, yaw: 0.05, pitch: 0.16, target: [0, 2.0, 0] }, instant);
        ui.slider({ label: 'High pressure', min: 1012, max: 1040, step: 1, value: st.hiP, unit: ' hPa', onInput: v => { st.hiP = v; readout(); } });
      }
      if (i === 3) {
        st.mass = 0;
        show(['map', 'masses', 'L:masses']);
        view({ radius: 5.3, width: 8.4, yaw: 0, pitch: 0.95, target: [0, 0, 0.4] }, instant);
        ui.buttons(AIR_MASSES.map((a, k) => ({ label: a.name, on: k === 0, onClick: () => { st.mass = k; applyMass(); readout(); } })));
      }
      if (i === 4 || i === 5) {
        st.t = 0;
        show(['strip', 'town', i === 4 ? 'cf' : 'wf', 'L:town', 'L:coldAir', 'L:warmAir', 'L:front', ...(i === 5 ? ['L:cirrus'] : [])]);
        view({ radius: 2.6, width: 5.6, yaw: 0, pitch: 0.1, target: [0, 1.8, 0] }, instant);
        const max = i === 4 ? 12 : 24;
        const inp = ui.slider({ label: 'Time', min: 0, max, step: 0.1, value: 0, unit: ' h', format: v => v.toFixed(1), onInput: v => { st.demo = null; st.t = v; readout(); } });
        demo('t', max, i === 4 ? 1.6 : 3, inp, v => Math.round(v * 10) / 10);
      }
      if (i === 6) {
        st.t = 0;
        show(['map', 'wx', 'L:mapTown', 'L:mapCold', 'L:mapWarm', 'L:iso']);
        view({ radius: 5.3, width: 8.4, yaw: 0, pitch: 0.95, target: [0, 0, 0.4] }, instant);
        const inp = ui.slider({ label: 'Time', min: 0, max: 48, step: 1, value: 0, unit: ' h', onInput: v => { st.demo = null; st.t = v; readout(); } });
        demo('t', 24, 6, inp, v => Math.round(v));
      }
      if (isQuiz) {
        st.t = 4;
        show(['strip', 'town', 'cf']);
        view({ radius: 2.6, width: 7.6, yaw: 0.25, pitch: 0.25, target: [0, 1.8, 0] }, instant);
      }
      if (instant) { st.hShown = st.h; st.pShown = st.p; st.tShown = st.t; }
      st.wind = kit.clamp((st.hiP - 1012) / 28, 0, 1);
      if (instant) st.windShown = st.wind;
      placeClimber(); applyPressure(); applyWind(); applyMass(); placeFronts(); placeMap();
      L.dial.at.set(dialPost.position.x, 2.5, dialPost.position.z);
      readout();
    },
    update(dt, t) {
      if (st.demo) {
        const d = st.demo, v = Math.min(d.to, st[d.key] + d.rate * dt);
        if (d.round(v) !== d.round(st[d.key])) { st[d.key] = v; d.input.set(d.round(v)); readout(); } else st[d.key] = v;
        if (v >= d.to) st.demo = null;
      }
      st.wind = kit.clamp((st.hiP - 1012) / 28, 0, 1);
      if (kit.follow(st, 'hShown', st.h, dt, 5)) placeClimber();
      if (kit.follow(st, 'pShown', st.p, dt, 5)) applyPressure();
      if (kit.follow(st, 'windShown', st.wind, dt, 4)) applyWind();
      if (kit.follow(st, 'tShown', st.t, dt, 5)) { placeFronts(); placeMap(); }
      for (const f of [...up, ...down, ...loopFlows]) if (f.obj.visible) f.tick(dt);
      for (const r of [townRain, cfRain, wfRain]) if (r.obj.visible) r.tick(dt);
      sockArm.rotation.y = Math.sin(t * 6) * 0.06 * st.windShown;
      return true;
    },
  };
}

// A round barometer face (canvas) with a needle. Values from min to max cover 270° of the dial.
function makeDial(THREE, { min, max, step, every, words }) {
  const g = new THREE.Group(), S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d'), ang = v => ((-135 + (270 * (v - min)) / (max - min)) * Math.PI) / 180;
  x.fillStyle = '#fbf8f1'; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#1f2937'; x.fillStyle = '#1f2937'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let k = 0;
  for (let v = min; v <= max + 1e-6; v += step, k++) {
    const a = ang(v), major = k % every === 0, r0 = major ? 98 : 106;
    x.lineWidth = major ? 4 : 2;
    x.beginPath(); x.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); x.lineTo(128 + Math.sin(a) * 118, 128 - Math.cos(a) * 118); x.stroke();
    if (major) { x.font = 'bold 19px sans-serif'; x.fillText(String(v), 128 + Math.sin(a) * 80, 128 - Math.cos(a) * 80); }
  }
  x.font = 'italic bold 15px serif';
  for (const [v, w] of words) { const a = ang(v); x.fillStyle = v < 1000 ? '#1d4ed8' : v > 1015 ? '#b45309' : '#374151'; x.fillText(w, 128 + Math.sin(a) * 56, 128 - Math.cos(a) * 56); }
  x.fillStyle = '#475569'; x.font = 'bold 18px sans-serif'; x.fillText('hPa', 128, 186);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.6, 40), new THREE.MeshBasicMaterial({ map: tex }));
  face.position.z = 0.062; // just in front of the body's cap (at 0.05)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 0.4, roughness: 0.4 }));
  body.rotation.x = Math.PI / 2;
  const pivot = new THREE.Group();
  pivot.position.z = 0.08;
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.015), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
  needle.position.y = 0.2;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), new THREE.MeshBasicMaterial({ color: 0x111827 }));
  cap.rotation.x = Math.PI / 2;
  pivot.add(needle, cap);
  g.add(body, face, pivot);
  return { obj: g, setValue(v) { pivot.rotation.z = -ang(Math.max(min, Math.min(max, v))); } };
}

// A big letter (H or L) drawn on a canvas, as a sprite that always faces the camera.
function letterSprite(THREE, ch, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.fill();
  x.fillStyle = color; x.font = 'bold 92px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.setScalar(0.9);
  return s;
}

function stripes(THREE) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 16;
  const x = c.getContext('2d');
  for (let i = 0; i < 5; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#f97316'; x.fillRect(0, (i * 16) / 5, 64, 16 / 5 + 1); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Simple map, 16 x 10 units (32 px per unit): ocean, a continent with a southern gulf, a desert and a cold north.
function paintMap(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 320;
  const g = c.getContext('2d'), px = ([x, z]) => [(x + 8) * 32, (z + 5) * 32];
  g.fillStyle = '#86bce8'; g.fillRect(0, 0, 512, 320);
  const land = [[-5.4, -5.2], [5.2, -5.2], [5.6, -3], [5.9, -1], [5.4, 1], [4.8, 2.6], [4.9, 4.4], [4.3, 4.6], [3.8, 2.9], [2, 2.6], [0, 2.7], [-1.2, 3.4], [-1.6, 5.2], [-4.2, 5.2], [-4.6, 3], [-5.6, 1], [-5.2, -1.5], [-5.8, -3.5]];
  g.fillStyle = '#9fc98a';
  g.beginPath(); land.forEach((p, i) => { const [a, b] = px(p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill();
  g.strokeStyle = '#5f8f55'; g.lineWidth = 2; g.stroke();
  g.save(); g.clip();
  g.fillStyle = '#dde8e2'; g.fillRect(0, 0, 512, 40);                       // cold north
  const d = g.createRadialGradient(...px([-3, 2.7]), 4, ...px([-3, 2.7]), 70);
  d.addColorStop(0, '#e2c58c'); d.addColorStop(1, 'rgba(226,197,140,0)');
  g.fillStyle = d; g.fillRect(0, 0, 512, 320);                                // desert
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,110,50,${0.08 + rand(i) * 0.1})`; g.fillRect(rand(i * 2.3) * 512, rand(i * 4.1) * 320, 3, 3); }
  g.restore();
  g.fillStyle = 'rgba(30,64,120,0.55)'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center';
  g.fillText('N ↑', 486, 22);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Marching squares: line segments ([x, y, z] pairs flattened) where f(x, z) crosses each level.
function contours(f, x0, x1, z0, z1, n, m, levels) {
  const dx = (x1 - x0) / n, dz = (z1 - z0) / m, v = new Float32Array((n + 1) * (m + 1)), out = [];
  for (let j = 0; j <= m; j++) for (let i = 0; i <= n; i++) v[j * (n + 1) + i] = f(x0 + i * dx, z0 + j * dz);
  const Y = 0.03;
  for (const lv of levels) for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const a = v[j * (n + 1) + i], b = v[j * (n + 1) + i + 1], c = v[(j + 1) * (n + 1) + i + 1], d = v[(j + 1) * (n + 1) + i];
    const idx = (a > lv) | ((b > lv) << 1) | ((c > lv) << 2) | ((d > lv) << 3);
    if (idx === 0 || idx === 15) continue;
    const X = x0 + i * dx, Z = z0 + j * dz, t = (p, q) => (lv - p) / (q - p);
    const E = [
      () => [X + t(a, b) * dx, Y, Z], () => [X + dx, Y, Z + t(b, c) * dz],
      () => [X + t(d, c) * dx, Y, Z + dz], () => [X, Y, Z + t(a, d) * dz],
    ];
    const pairs = { 1: [3, 0], 2: [0, 1], 3: [3, 1], 4: [1, 2], 5: [3, 0, 1, 2], 6: [0, 2], 7: [3, 2], 8: [2, 3], 9: [0, 2], 10: [0, 1, 2, 3], 11: [1, 2], 12: [1, 3], 13: [0, 1], 14: [0, 3] }[idx];
    for (const e of pairs) out.push(...E[e]());
  }
  return out;
}
