// Bohr-model atoms for the middle-school chemistry lessons (atoms, periodic-table, molecules-bonds).
// KHTN 7 (and most middle-school books) draw the first 20 elements this way: a tiny nucleus of protons
// and neutrons, and electrons on circular shells that fill 2, 8, 8, then start a 4th shell.
//
//   import { ELEMENTS, element, shellsOf, bohrAtom, molecule, textSprite } from '../_shared/atoms.js';
//   const atom = bohrAtom(k, { pos: [0, 1, 0] });   // rings lie in the XY plane, facing +z
//   atom.set(6, 6, 6);                               // protons, neutrons, electrons (carbon-12)
//   atom.update(dt);                                 // in update(): electrons go round
//
// Everything is built once; set() only moves and shows instances, so it is cheap to call often.

// Hydrogen to calcium. mass = relative atomic mass as rounded in school tables (amu);
// n = neutrons in the most common isotope; kind = 'metal' | 'nonmetal' | 'noble'.
export const ELEMENTS = [
  { z: 1, sym: 'H', name: 'Hydrogen', mass: 1, n: 0, group: 1, period: 1, kind: 'nonmetal' },
  { z: 2, sym: 'He', name: 'Helium', mass: 4, n: 2, group: 18, period: 1, kind: 'noble' },
  { z: 3, sym: 'Li', name: 'Lithium', mass: 7, n: 4, group: 1, period: 2, kind: 'metal' },
  { z: 4, sym: 'Be', name: 'Beryllium', mass: 9, n: 5, group: 2, period: 2, kind: 'metal' },
  { z: 5, sym: 'B', name: 'Boron', mass: 11, n: 6, group: 13, period: 2, kind: 'nonmetal' },
  { z: 6, sym: 'C', name: 'Carbon', mass: 12, n: 6, group: 14, period: 2, kind: 'nonmetal' },
  { z: 7, sym: 'N', name: 'Nitrogen', mass: 14, n: 7, group: 15, period: 2, kind: 'nonmetal' },
  { z: 8, sym: 'O', name: 'Oxygen', mass: 16, n: 8, group: 16, period: 2, kind: 'nonmetal' },
  { z: 9, sym: 'F', name: 'Fluorine', mass: 19, n: 10, group: 17, period: 2, kind: 'nonmetal' },
  { z: 10, sym: 'Ne', name: 'Neon', mass: 20, n: 10, group: 18, period: 2, kind: 'noble' },
  { z: 11, sym: 'Na', name: 'Sodium', mass: 23, n: 12, group: 1, period: 3, kind: 'metal' },
  { z: 12, sym: 'Mg', name: 'Magnesium', mass: 24, n: 12, group: 2, period: 3, kind: 'metal' },
  { z: 13, sym: 'Al', name: 'Aluminium', mass: 27, n: 14, group: 13, period: 3, kind: 'metal' },
  { z: 14, sym: 'Si', name: 'Silicon', mass: 28, n: 14, group: 14, period: 3, kind: 'nonmetal' },
  { z: 15, sym: 'P', name: 'Phosphorus', mass: 31, n: 16, group: 15, period: 3, kind: 'nonmetal' },
  { z: 16, sym: 'S', name: 'Sulfur', mass: 32, n: 16, group: 16, period: 3, kind: 'nonmetal' },
  { z: 17, sym: 'Cl', name: 'Chlorine', mass: 35.5, n: 18, group: 17, period: 3, kind: 'nonmetal' },
  { z: 18, sym: 'Ar', name: 'Argon', mass: 40, n: 22, group: 18, period: 3, kind: 'noble' },
  { z: 19, sym: 'K', name: 'Potassium', mass: 39, n: 20, group: 1, period: 4, kind: 'metal' },
  { z: 20, sym: 'Ca', name: 'Calcium', mass: 40, n: 20, group: 2, period: 4, kind: 'metal' },
];
export const element = z => ELEMENTS[z - 1] || null;

// Shell capacities used for the first 20 elements: 2, 8, 8, then 2 in the 4th shell (K, Ca).
export const SHELL_CAPS = [2, 8, 8, 2];
export function shellsOf(e) {
  const out = [];
  let left = Math.max(0, Math.min(20, e));
  for (const cap of SHELL_CAPS) { if (left <= 0) break; const c = Math.min(cap, left); out.push(c); left -= c; }
  return out;
}

// Superscript charge for an ion, e.g. 1 -> '⁺', -2 -> '²⁻'.
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export function chargeSup(q) {
  if (!q) return '';
  const a = Math.abs(q), digits = a === 1 ? '' : String(a).split('').map(d => SUP[d]).join('');
  return digits + (q > 0 ? '⁺' : '⁻');
}

export const COLORS = { proton: 0xe63946, neutron: 0xadb5bd, electron: 0x3a86ff, outer: 0xffd166, ring: 0x9fb3c8 };

let S = null; // geometries shared by every atom on the page
function shared(THREE) {
  if (S) return S;
  S = {
    unit: new THREE.SphereGeometry(1, 14, 10),
    small: new THREE.SphereGeometry(1, 10, 8),
    ball: new THREE.SphereGeometry(1, 20, 14),
  };
  return S;
}

// A Bohr atom. Options: pos, parent, r0 (first shell radius), dr (gap between shells), nR (nucleon radius),
// eR (electron radius), tube (ring thickness), maxP/maxN/maxE (pool sizes), ball (draw the nucleus as one
// sphere, for small atoms), slots (electrons sit on fixed places 2, 8, 8, 2 with faint empty slots shown),
// spin (radians per second; 0 stops the electrons).
export function bohrAtom(k, o = {}) {
  const { THREE } = k;
  const G = shared(THREE);
  const maxP = o.maxP ?? 20, maxN = o.maxN ?? 24, maxE = o.maxE ?? 20;
  const group = new THREE.Group();
  group.position.set(...(o.pos ?? [0, 0, 0]));
  (o.parent ?? k.scene).add(group);
  const nucleus = new THREE.Group();
  group.add(nucleus);

  const mats = {
    p: new THREE.MeshStandardMaterial({ color: COLORS.proton, roughness: 0.45 }),
    n: new THREE.MeshStandardMaterial({ color: COLORS.neutron, roughness: 0.5 }),
    e: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, emissive: 0x0b2a66, emissiveIntensity: 0.6 }),
    ring: new THREE.MeshBasicMaterial({ color: o.ringColor ?? COLORS.ring, transparent: true, opacity: 0.75 }),
    ghost: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }),
    ball: new THREE.MeshStandardMaterial({ color: 0xf07167, roughness: 0.45 }),
  };
  const inst = (geo, mat, n) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    m.count = 0; m.frustumCulled = false; m.castShadow = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return m;
  };
  let protons = null, neutrons = null, ball = null;
  if (o.ball) { ball = new THREE.Mesh(G.ball, mats.ball); nucleus.add(ball); }
  else { protons = inst(G.unit, mats.p, maxP); neutrons = inst(G.unit, mats.n, maxN); nucleus.add(protons, neutrons); }
  const electrons = inst(G.small, mats.e, maxE);
  electrons.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, maxE) * 3), 3);
  group.add(electrons);
  const ghosts = o.slots ? inst(G.small, mats.ghost, 18) : null;
  if (ghosts) group.add(ghosts);

  const rings = [];
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const cBlue = new THREE.Color(COLORS.electron), cOuter = new THREE.Color(COLORS.outer), cTmp = new THREE.Color();

  const atom = {
    group, nucleus, electrons, rings, mats,
    p: 0, n: 0, e: 0, shells: [],
    spin: o.spin ?? 0.7, angle: 0,
    r0: 0, dr: 0, nR: 0, eR: 0,
    outerGlow: false,            // colour the outer-shell electrons yellow
    tint: null,                  // optional per-electron colour: (i) => hex or null
    place: null,                 // optional override: (i, shell, j, count, angle, out Vector3) => true if placed
    shellRadius: s => atom.r0 + atom.dr * s,
    outerRadius: () => atom.shellRadius(Math.max(0, atom.shells.length - 1)),
    nucleusRadius: () => (ball ? atom.nR : atom.nR * 1.25 * Math.cbrt(Math.max(1, atom.p + atom.n))),

    // Shell sizes. Rebuilds the ring geometries, so call it only when a step starts, not every frame.
    layout({ r0 = 0.8, dr = 0.55, nR = 0.1, eR = 0.085, tube = 0.012 } = {}) {
      Object.assign(atom, { r0, dr, nR, eR });
      for (const r of rings) { r.geometry.dispose(); group.remove(r); }
      rings.length = 0;
      for (let s = 0; s < 4; s++) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(r0 + dr * s, tube, 6, 72), mats.ring);
        r.visible = false;
        group.add(r);
        rings.push(r);
      }
      if (ball) ball.scale.setScalar(nR);
      atom.set(atom.p, atom.n, atom.e);
    },

    set(p, n, e) {
      atom.p = p = Math.max(0, Math.min(maxP, p));
      atom.n = n = Math.max(0, Math.min(maxN, n));
      atom.e = e = Math.max(0, Math.min(maxE, e));
      atom.shells = shellsOf(e);
      for (let s = 0; s < rings.length; s++) rings[s].visible = s < atom.shells.length || (!!ghosts && s < 3);
      if (!ball) packNucleus(p, n);
      else ball.visible = p + n > 0;
      if (ghosts) {
        let gi = 0;
        for (let s = 0; s < 3; s++) for (let j = 0; j < SHELL_CAPS[s]; j++) {
          const a = slotAngle(s, j, SHELL_CAPS[s]);
          v.set(Math.cos(a) * atom.shellRadius(s), Math.sin(a) * atom.shellRadius(s), 0);
          m4.compose(v, q.identity(), sc.setScalar(atom.eR * 0.9));
          ghosts.setMatrixAt(gi++, m4);
        }
        ghosts.count = gi; ghosts.instanceMatrix.needsUpdate = true;
      }
      atom.recolor();
      atom.placeElectrons();
    },

    recolor() {
      const outer = atom.shells.length - 1;
      let i = 0;
      for (let s = 0; s < atom.shells.length; s++) for (let j = 0; j < atom.shells[s]; j++, i++) {
        const t = atom.tint && atom.tint(i);
        cTmp.copy(t != null ? cTmp.set(t) : atom.outerGlow && s === outer ? cOuter : cBlue);
        electrons.setColorAt(i, cTmp);
      }
      if (electrons.instanceColor) electrons.instanceColor.needsUpdate = true;
    },

    // Position of electron i (in the atom's own space) written into out.
    electronLocal(i, out) {
      let s = 0, j = i;
      while (s < atom.shells.length && j >= atom.shells[s]) { j -= atom.shells[s]; s++; }
      const c = atom.shells[s] || 1;
      const a = o.slots ? slotAngle(s, j, SHELL_CAPS[s]) + atom.angle * 0.4 : atom.angle * (1.25 - s * 0.18) + (2 * Math.PI * j) / c + s * 0.7;
      if (atom.place && atom.place(i, s, j, c, a, out)) return out;
      const r = atom.shellRadius(s);
      return out.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    },
    electronWorld(i, out) { atom.electronLocal(i, out); return group.localToWorld(out); },

    placeElectrons() {
      for (let i = 0; i < atom.e; i++) {
        atom.electronLocal(i, v);
        m4.compose(v, q.identity(), sc.setScalar(atom.eR));
        electrons.setMatrixAt(i, m4);
      }
      electrons.count = atom.e;
      electrons.instanceMatrix.needsUpdate = true;
      if (ghosts) ghosts.rotation.z = atom.angle * 0.4;
    },

    update(dt) {
      if (!group.visible) return false;
      atom.angle += dt * atom.spin;
      atom.placeElectrons();
      return atom.spin !== 0 || !!atom.place;
    },
  };

  function slotAngle(s, j, cap) { return Math.PI / 2 + (2 * Math.PI * j) / cap + (s === 1 ? Math.PI / 8 : 0); }

  // Nucleons packed in a small ball (golden-angle spiral), protons spread evenly among neutrons.
  function packNucleus(p, n) {
    const N = p + n, R = atom.nR * 1.25 * Math.cbrt(Math.max(1, N));
    let ip = 0, iN = 0;
    for (let i = 0; i < N; i++) {
      const f = (i + 0.5) / N, y = 1 - 2 * f, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.39996;
      const r = N === 1 ? 0 : R * Math.cbrt(f) * 0.92;
      v.set(Math.cos(th) * rr * r, y * r, Math.sin(th) * rr * r + (N > 1 ? R * 0.15 : 0));
      m4.compose(v, q.identity(), sc.setScalar(atom.nR));
      const isP = Math.floor(((i + 1) * p) / N) > Math.floor((i * p) / N);
      if (isP) protons.setMatrixAt(ip++, m4); else neutrons.setMatrixAt(iN++, m4);
    }
    protons.count = ip; neutrons.count = iN;
    protons.instanceMatrix.needsUpdate = neutrons.instanceMatrix.needsUpdate = true;
  }

  atom.layout(o);
  return atom;
}

// A camera-facing text sprite drawn on a small canvas (charge signs, symbols).
export function textSprite(k, text, { color = '#ffffff', bg = null, size = 0.4, font = 'bold 84px sans-serif', px = 128 } = {}) {
  const { THREE } = k;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
  sp.scale.setScalar(size);
  sp.setText = t => {
    g.clearRect(0, 0, px, px);
    if (bg) { g.fillStyle = bg; g.beginPath(); g.arc(px / 2, px / 2, px * 0.46, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t, px / 2, px / 2 + px * 0.04);
    tex.needsUpdate = true;
  };
  sp.setText(text);
  return sp;
}

// Ball-and-stick molecules. Lengths in units of 100 pm (real bond lengths), angles from real molecules.
export const CPK = { H: 0xf1f3f5, C: 0x3d4148, O: 0xe63946, N: 0x3a86ff, Cl: 0x52b788, Na: 0x9d4edd, He: 0x63e6be };
const RAD = { H: 0.24, C: 0.34, O: 0.33, N: 0.33, Cl: 0.4, Na: 0.38, He: 0.3 };
const tet = 1 / Math.sqrt(3), half = (104.5 / 2) * Math.PI / 180;
export const MOLECULES = {
  He: { atoms: [['He', 0, 0, 0]], bonds: [] },
  H2: { atoms: [['H', -0.37, 0, 0], ['H', 0.37, 0, 0]], bonds: [[0, 1, 1]] },
  O2: { atoms: [['O', -0.605, 0, 0], ['O', 0.605, 0, 0]], bonds: [[0, 1, 2]] },
  H2O: { atoms: [['O', 0, 0.2, 0], ['H', -0.96 * Math.sin(half), 0.2 - 0.96 * Math.cos(half), 0], ['H', 0.96 * Math.sin(half), 0.2 - 0.96 * Math.cos(half), 0]], bonds: [[0, 1, 1], [0, 2, 1]] },
  CO2: { atoms: [['O', -1.16, 0, 0], ['C', 0, 0, 0], ['O', 1.16, 0, 0]], bonds: [[0, 1, 2], [1, 2, 2]] },
  CH4: { atoms: [['C', 0, 0, 0], ['H', 1.09 * tet, 1.09 * tet, 1.09 * tet], ['H', 1.09 * tet, -1.09 * tet, -1.09 * tet], ['H', -1.09 * tet, 1.09 * tet, -1.09 * tet], ['H', -1.09 * tet, -1.09 * tet, 1.09 * tet]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
};
let MS = null;
export function molecule(k, name, { scale = 1, parent } = {}) {
  const { THREE } = k;
  const G = shared(THREE);
  if (!MS) {
    MS = { stick: new THREE.CylinderGeometry(1, 1, 1, 10), stickMat: new THREE.MeshStandardMaterial({ color: 0xc9d1d9, roughness: 0.5 }), mats: {} };
    for (const [el, c] of Object.entries(CPK)) MS.mats[el] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 });
  }
  const def = MOLECULES[name];
  const g = new THREE.Group();
  (parent ?? k.scene).add(g);
  const pos = def.atoms.map(([, x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(scale));
  g.atoms = def.atoms.map(([el], i) => {
    const m = new THREE.Mesh(G.ball, MS.mats[el]);
    m.scale.setScalar(RAD[el] * scale);
    m.position.copy(pos[i]);
    g.add(m);
    return m;
  });
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), side = new THREE.Vector3(), mid = new THREE.Vector3();
  for (const [a, b, order] of def.bonds) {
    d.subVectors(pos[b], pos[a]);
    const len = d.length();
    d.normalize();
    side.set(0, 0, 1).cross(d);
    if (side.lengthSq() < 1e-6) side.set(0, 1, 0);
    side.normalize();
    for (let s = 0; s < order; s++) {
      const off = order === 1 ? 0 : (s - (order - 1) / 2) * 0.17 * scale;
      const c = new THREE.Mesh(MS.stick, MS.stickMat);
      mid.addVectors(pos[a], pos[b]).multiplyScalar(0.5).addScaledVector(side, off);
      c.position.copy(mid);
      c.quaternion.setFromUnitVectors(up, d);
      c.scale.set((order === 1 ? 0.075 : 0.055) * scale, len, (order === 1 ? 0.075 : 0.055) * scale);
      g.add(c);
    }
  }
  return g;
}
