// A glass box (or cylinder) of particles for the middle-school chemistry lessons.
// Each particle is a solid (held to its own lattice spot, it can only vibrate), a liquid (pulled
// down by gravity, slides past its neighbours) or a gas (fast, free, fills the whole container).
// One InstancedMesh draws them all. Motion: soft-sphere pushes between touching particles plus
// seeded random "thermal" kicks (Langevin), so a run is the same every time for the video exporter.
//
//   const box = particleBox(k, { n: 125, lattice: [5, 5, 5], pos: [0, 0, 0] });
//   box.agitation = 1;            // how hard particles jiggle (scene maps temperature to this)
//   box.setCounts(nSolid, nGas);  // the rest are liquid
//   box.step(dt);                 // in update()
export const SOLID = 0, LIQUID = 1, GAS = 2;

export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export function particleBox(k, o = {}) {
  const { THREE, kit } = k;
  const N = o.n ?? 125, R = o.radius ?? 0.11, D = 2 * R;
  const HX = o.half ?? 0.75, HZ = o.halfZ ?? HX, H = o.height ?? 2.4;
  const round = o.shape === 'cylinder';
  const base = o.speeds ?? [0.55, 0.75, 2.6];       // thermal speed per state at agitation 1
  const fric = [14, 3, 0.6];                         // friction per state (solids are damped hard)
  const KS = 900, KT = 260, G = 5;                   // push stiffness, lattice spring, liquid gravity

  const group = new THREE.Group();
  group.position.set(...(o.pos ?? [0, 0, 0]));
  k.scene.add(group);

  // Container: faint glass skin and its edges, a base plate under it.
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.13, depthWrite: false, roughness: 0.1, side: THREE.DoubleSide });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x7fa6c4 });
  let glassGeo;
  if (round) glassGeo = new THREE.CylinderGeometry(HX + 0.03, HX + 0.03, H + 0.03, 32, 1, true);
  else glassGeo = new THREE.BoxGeometry(2 * HX + 0.04, H + 0.04, 2 * HZ + 0.04);
  glassGeo.translate(0, H / 2, 0);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.renderOrder = 3;
  group.add(glass);
  if (round) {
    const ring = new THREE.EdgesGeometry(new THREE.CylinderGeometry(HX + 0.03, HX + 0.03, H + 0.03, 32, 1, true).translate(0, H / 2, 0), 30);
    group.add(new THREE.LineSegments(ring, edgeMat));
  } else group.add(new THREE.LineSegments(new THREE.EdgesGeometry(glassGeo), edgeMat));
  const plateGeo = round ? new THREE.CylinderGeometry(HX + 0.12, HX + 0.12, 0.1, 32) : new THREE.BoxGeometry(2 * HX + 0.24, 0.1, 2 * HZ + 0.24);
  const plateMat = kit.mat(o.plateColor ?? 0x6d7782, { emissive: 0x000000 });
  const plate = kit.mesh(plateGeo, plateMat, [0, -0.05, 0], group);
  plate.castShadow = false;

  // Optional piston (lid) that can move down to squash what is inside.
  let lid = null;
  if (o.lid) {
    lid = new THREE.Group();
    const lidMat = kit.mat(0x8d99ae, { metalness: 0.4, roughness: 0.4 });
    const disc = round ? new THREE.CylinderGeometry(HX, HX, 0.08, 32) : new THREE.BoxGeometry(2 * HX, 0.08, 2 * HZ);
    kit.mesh(disc, lidMat, [0, 0.04, 0], lid);
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 10), lidMat, [0, 0.75, 0], lid);
    kit.mesh(new THREE.BoxGeometry(0.7, 0.08, 0.2), kit.mat(0x343a40), [0, 1.45, 0], lid);
    group.add(lid);
  }

  // Optional divider across the middle (x = 0), for diffusion.
  const divider = kit.mesh(new THREE.BoxGeometry(0.03, H, 2 * HZ), new THREE.MeshStandardMaterial({ color: 0x9fb4c7, transparent: true, opacity: 0.55, depthWrite: false }), [0, H / 2, 0], group);
  divider.castShadow = false;
  divider.visible = false;

  // Particles.
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(R, o.segs ?? 12, o.rings ?? 8), kit.mat(0xffffff, { roughness: 0.35 }), N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  group.add(mesh);
  const M = mesh.instanceMatrix.array;
  for (let i = 0; i < N; i++) { M[i * 16] = M[i * 16 + 5] = M[i * 16 + 10] = M[i * 16 + 15] = 1; }

  const P = new Float32Array(N * 3), V = new Float32Array(N * 3), F = new Float32Array(N * 3), S = new Float32Array(N * 3);
  const state = new Uint8Array(N);
  const stateColors = o.stateColors ? o.stateColors.map(c => new THREE.Color(c)) : null;
  const col = new THREE.Color();

  // Lattice spots for the solid: top layer first, so melting starts at the top.
  const [lx, ly, lz] = o.lattice ?? [Math.ceil(Math.cbrt(N)), Math.ceil(Math.cbrt(N)), Math.ceil(Math.cbrt(N))];
  const sp = o.spacing ?? D * 1.12;
  for (let i = 0; i < N; i++) {
    const layer = Math.floor(i / (lx * lz)), a = i % lx, c = Math.floor(i / lx) % lz;
    S[i * 3] = (a - (lx - 1) / 2) * sp;
    S[i * 3 + 1] = R + 0.01 + (ly - 1 - layer) * sp;
    S[i * 3 + 2] = (c - (lz - 1) / 2) * sp;
  }

  let seed = o.seed ?? 11;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.732;

  const box = {
    group, mesh, glass, plate, plateMat, lid, divider, P, V, state, N, R,
    count: N,           // how many particles are in use
    agitation: 1,       // thermal kick strength (1 = room temperature look)
    top: H,             // lid height (particles bounce off it)
    wall: false,        // divider at x = 0
    hits: 0,            // smoothed hits on the lid per second
    paused: false,
    height: H,
    setColor(i, c) { col.set(c); mesh.setColorAt(i, col); mesh.instanceColor.needsUpdate = true; },
    setState(i, s) {
      if (state[i] === s) return;
      if (s === GAS) { for (let q = 0; q < 3; q++) V[i * 3 + q] += gauss() * base[GAS] * 0.6; }
      state[i] = s;
      if (stateColors) box.setColor(i, stateColors[s]);
    },
    // Put every particle in state s and arrange it so it already looks settled.
    reset(s, { seed: sd = 11, settle = 1.2 } = {}) {
      seed = sd; V.fill(0); box.wall = divider.visible;
      const n = box.count;
      for (let i = 0; i < N; i++) { state[i] = 255; box.setState(i, s); }
      if (s === SOLID) for (let i = 0; i < n * 3; i++) P[i] = S[i];
      else if (s === LIQUID) box.pile(0, n);
      else box.scatter(0, n);
      box.settle(settle);
    },
    // Loose packed layers on the floor.
    pile(from, to) {
      const step = D * 1.02, nx = Math.max(1, Math.floor((2 * HX - D) / step) + 1), nz = Math.max(1, Math.floor((2 * HZ - D) / step) + 1);
      let slot = 0;
      for (let i = from; i < to; i++) {
        let x, z, y;
        do {
          const a = slot % nx, c = Math.floor(slot / nx) % nz, L = Math.floor(slot / (nx * nz));
          x = -HX + R + a * step + (L % 2) * step * 0.5; z = -HZ + R + c * step + (L % 2) * step * 0.5; y = R + 0.01 + L * D * 0.9;
          slot++;
        } while (round ? x * x + z * z > (HX - R) ** 2 : (x > HX - R || z > HZ - R));
        P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
      }
    },
    // Spread out through the whole container (or one half when the divider is in).
    scatter(from, to, side = 0) {
      const lo = side > 0 ? R + 0.02 : -HX + R, hi = side < 0 ? -R - 0.02 : HX - R;
      for (let i = from; i < to; i++) {
        for (let tries = 0; tries < 30; tries++) {
          const x = lo + rnd() * (hi - lo), z = (rnd() * 2 - 1) * (HZ - R), y = R + rnd() * (Math.min(box.top, H) - 2 * R);
          if (round && x * x + z * z > (HX - R) ** 2) continue;
          let ok = true;
          for (let j = 0; j < i && ok; j++) ok = (P[j * 3] - x) ** 2 + (P[j * 3 + 1] - y) ** 2 + (P[j * 3 + 2] - z) ** 2 > D * D * 1.3;
          P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
          if (ok) break;
        }
        for (let q = 0; q < 3; q++) V[i * 3 + q] = gauss() * base[GAS] * box.agitation * 0.6;
      }
    },
    settle(sec) { const p = box.paused; box.paused = false; for (let t = 0; t < sec; t += 1 / 60) sim(1 / 60); box.paused = p; box.render(); },
    // nSolid particles are solid (the last ones: bottom of the block), nGas are gas (the highest liquid ones).
    setCounts(nSolid, nGas) {
      const n = box.count;
      let gas = 0;
      for (let i = 0; i < n; i++) {
        const wantSolid = i >= n - nSolid;
        if (wantSolid && state[i] !== SOLID) box.setState(i, SOLID);
        if (!wantSolid && state[i] === SOLID) box.setState(i, LIQUID);
        if (state[i] === GAS) gas++;
      }
      while (gas !== nGas) {
        const up = gas < nGas;
        let best = -1;
        for (let i = 0; i < n; i++) {
          if (state[i] !== (up ? LIQUID : GAS)) continue;
          if (best < 0 || (up ? P[i * 3 + 1] > P[best * 3 + 1] : P[i * 3 + 1] < P[best * 3 + 1])) best = i;
        }
        if (best < 0) break;
        box.setState(best, up ? GAS : LIQUID);
        gas += up ? 1 : -1;
      }
    },
    // Height of the liquid surface (average height of the top fifth of liquid particles, plus one radius).
    surface() {
      const ys = [];
      for (let i = 0; i < box.count; i++) if (state[i] === LIQUID) ys.push(P[i * 3 + 1]);
      if (!ys.length) return 0;
      ys.sort((a, b) => b - a);
      const m = Math.max(1, Math.floor(ys.length / 5));
      let s = 0; for (let i = 0; i < m; i++) s += ys[i];
      return s / m + R;
    },
    step(dt) {
      if (box.paused) return;
      const n = Math.max(1, Math.ceil(dt * 180)), h = dt / n;
      for (let s = 0; s < n; s++) sim(h);
      box.render();
    },
    render() {
      for (let i = 0; i < box.count; i++) { M[i * 16 + 12] = P[i * 3]; M[i * 16 + 13] = P[i * 3 + 1]; M[i * 16 + 14] = P[i * 3 + 2]; }
      mesh.count = box.count;
      mesh.instanceMatrix.needsUpdate = true;
      if (lid) lid.position.y = box.top;
      divider.visible = box.wall;
    },
    show(v) { group.visible = v; },
  };

  let hitCount = 0, hitTime = 0;
  function sim(h) {
    const n = box.count, ag = box.agitation, D2 = D * D;
    F.fill(0, 0, n * 3);
    for (let i = 0; i < n; i++) {
      const xi = P[i * 3], yi = P[i * 3 + 1], zi = P[i * 3 + 2];
      for (let j = i + 1; j < n; j++) {
        const dx = P[j * 3] - xi; if (dx > D || dx < -D) continue;
        const dy = P[j * 3 + 1] - yi; if (dy > D || dy < -D) continue;
        const dz = P[j * 3 + 2] - zi;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= D2 || d2 < 1e-10) continue;
        const d = Math.sqrt(d2), f = KS * (D - d) / d;
        F[i * 3] -= f * dx; F[i * 3 + 1] -= f * dy; F[i * 3 + 2] -= f * dz;
        F[j * 3] += f * dx; F[j * 3 + 1] += f * dy; F[j * 3 + 2] += f * dz;
      }
    }
    const top = Math.min(box.top, H), sq = Math.sqrt(h);
    for (let i = 0; i < n; i++) {
      const o3 = i * 3, s = state[i], g = fric[s], kick = base[s] * ag * Math.sqrt(2 * g) * sq;
      if (s === SOLID) for (let q = 0; q < 3; q++) F[o3 + q] += KT * (S[o3 + q] - P[o3 + q]);
      if (s === LIQUID) F[o3 + 1] -= G;
      for (let q = 0; q < 3; q++) {
        V[o3 + q] += (F[o3 + q] - g * V[o3 + q]) * h + gauss() * kick;
        P[o3 + q] += V[o3 + q] * h;
      }
      // Walls.
      if (round) {
        const x = P[o3], z = P[o3 + 2], r2 = x * x + z * z, lim = HX - R;
        if (r2 > lim * lim) {
          const r = Math.sqrt(r2), nx = x / r, nz = z / r, vn = V[o3] * nx + V[o3 + 2] * nz;
          P[o3] = nx * lim; P[o3 + 2] = nz * lim;
          if (vn > 0) { V[o3] -= 2 * vn * nx; V[o3 + 2] -= 2 * vn * nz; }
        }
      } else {
        if (P[o3] < -HX + R) { P[o3] = -HX + R; V[o3] = Math.abs(V[o3]); }
        if (P[o3] > HX - R) { P[o3] = HX - R; V[o3] = -Math.abs(V[o3]); }
        if (P[o3 + 2] < -HZ + R) { P[o3 + 2] = -HZ + R; V[o3 + 2] = Math.abs(V[o3 + 2]); }
        if (P[o3 + 2] > HZ - R) { P[o3 + 2] = HZ - R; V[o3 + 2] = -Math.abs(V[o3 + 2]); }
      }
      if (P[o3 + 1] < R) { P[o3 + 1] = R; V[o3 + 1] = Math.abs(V[o3 + 1]); }
      if (P[o3 + 1] > top - R) { P[o3 + 1] = top - R; if (V[o3 + 1] > 0) { V[o3 + 1] = -V[o3 + 1]; hitCount++; } }
      if (box.wall && P[o3] > -R && P[o3] < R) {
        if (V[o3] > 0) { P[o3] = -R; V[o3] = -Math.abs(V[o3]); } else { P[o3] = R; V[o3] = Math.abs(V[o3]); }
      }
    }
    hitTime += h;
    if (hitTime >= 0.25) { box.hits += (hitCount / hitTime - box.hits) * 0.35; hitCount = 0; hitTime = 0; }
  }

  return box;
}

// A simple line chart drawn on a canvas, shown on a flat board in the scene.
// draw(g, w, h) paints it; call board.redraw() after the data changes.
export function chartBoard(k, { w = 2.6, h = 1.6, px = 512, py = 320, draw }) {
  const { THREE } = k;
  const c = document.createElement('canvas');
  c.width = px; c.height = py;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.06), k.kit.mat(0x37474f));
  back.position.z = -0.035;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  group.add(back, face);
  k.scene.add(group);
  const board = { group, canvas: c, redraw() { draw(g, px, py); tex.needsUpdate = true; } };
  board.redraw();
  return board;
}
