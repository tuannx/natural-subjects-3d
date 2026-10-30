// Atoms: zoom from a pencil tip down to one carbon atom; the nucleus and shells of the Bohr model;
// the masses and charges of protons, neutrons and electrons; build-an-atom with live readouts;
// shells filling 2, 8, 8; isotopes of carbon.
import { element, shellsOf, bohrAtom, textSprite, chargeSup, COLORS } from '../_shared/atoms.js';

// Width of view (log10 of metres) along the zoom slider: pencil (6 cm) -> tip (1 mm) -> graphite sheets (about 1.5 nm) -> one atom.
const ZK = [[0, Math.log10(0.06)], [0.36, -3], [0.5, Math.log10(1.5e-9)], [0.65, Math.log10(1.5e-9)], [1, Math.log10(4e-10)]];
function zoomWidth(s) {
  for (let i = 1; i < ZK.length; i++) if (s <= ZK[i][0]) { const [a, la] = ZK[i - 1], [b, lb] = ZK[i]; return 10 ** (la + (lb - la) * (s - a) / (b - a)); }
  return 10 ** ZK[ZK.length - 1][1];
}
const nice = v => (v >= 10 ? String(Math.round(v)) : v.toFixed(1));
function fmtLen(m) {
  if (m >= 0.01) return nice(m * 100) + ' cm';
  if (m >= 1e-3) return nice(m * 1e3) + ' mm';
  if (m >= 1e-6) return nice(m * 1e6) + ' µm';
  return (m * 1e9 >= 1 ? nice(m * 1e9) : (m * 1e9).toFixed(2)) + ' nm';
}
function fmtTimes(x) {
  if (x < 1.5) return '1';
  if (x < 1000) return String(Math.round(x));
  if (x < 1e6) return `${Math.round(x / 1e3)} thousand`;
  return `${Math.round(x / 1e6)} million`;
}
const name = z => (element(z) ? `${element(z).name} (${element(z).sym})` : 'no element');
// Neutrons in the most common isotope, used when the slider builds neutral atoms.
const commonN = z => (element(z) ? element(z).n : 0);
// Auto-build in step 4: hydrogen to carbon, one element at a time.
const BUILD = [[1, 0, 1], [2, 2, 2], [3, 4, 3], [4, 5, 4], [5, 6, 5], [6, 6, 6]];

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  scene.background = new THREE.Color(0x0f1d3a);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4a6a, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 5, 6);
  scene.add(sun);

  // Faint starry dust so the dark space does not look empty.
  const dust = new THREE.BufferGeometry(), dp = [];
  for (let i = 0; i < 300; i++) {
    const v = new THREE.Vector3(rand(i) - 0.5, rand(i + 50) - 0.5, rand(i + 99) - 0.5).normalize().multiplyScalar(25 + rand(i + 7) * 10);
    dp.push(v.x, v.y, v.z);
  }
  dust.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  scene.add(new THREE.Points(dust, new THREE.PointsMaterial({ color: 0x8fb3ff, size: 0.12, transparent: true, opacity: 0.6 })));

  // ---- Step 1: pencil -> graphite sheets -> atom ----
  const fadeMat = (color, o = {}) => kit.mat(color, { transparent: true, ...o });
  const pencil = new THREE.Group();
  scene.add(pencil);
  const pm = { lead: fadeMat(0x4a4f5a, { metalness: 0.5, roughness: 0.35 }), wood: fadeMat(0xe9c08a), body: fadeMat(0xf7c331, { roughness: 0.5 }), metal: fadeMat(0xb8c0c8, { metalness: 0.7, roughness: 0.3 }), rubber: fadeMat(0xf28b9b) };
  const along = (geo, mat, x) => { const m = kit.mesh(geo, mat, [x, 0, 0], pencil); m.rotation.z = -Math.PI / 2; return m; };
  along(new THREE.ConeGeometry(0.09, 0.3, 20), pm.lead, -0.15);
  along(new THREE.CylinderGeometry(0.088, 0.32, 0.8, 6), pm.wood, -0.7);
  along(new THREE.CylinderGeometry(0.32, 0.32, 3.2, 6), pm.body, -2.7);
  along(new THREE.CylinderGeometry(0.33, 0.33, 0.3, 20), pm.metal, -4.45);
  along(new THREE.CylinderGeometry(0.31, 0.31, 0.35, 20), pm.rubber, -4.77);
  const tipAnchor = new THREE.Object3D();
  scene.add(tipAnchor);

  // Graphite: two hexagon sheets (AB stacking), C–C distance 0.142 nm drawn as 0.5 units.
  const A = 0.5, sheets = new THREE.Group();
  scene.add(sheets);
  const cPos = [];
  for (const [layer, ox, oy] of [[0, 0, 0], [1, Math.sqrt(3) * A / 2, A / 2]]) {
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) for (const b of [0, A]) {
      const x = ox + i * Math.sqrt(3) * A + j * Math.sqrt(3) * A / 2, y = oy + j * 1.5 * A + b;
      if (x * x + y * y < 2.7 * 2.7) cPos.push([x, y, -layer * 1.18]);
    }
  }
  const cMat = fadeMat(0x6c7a89, { roughness: 0.4 });
  const cMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 8), cMat, cPos.length);
  const m4 = new THREE.Matrix4();
  cPos.forEach((p, i) => cMesh.setMatrixAt(i, m4.makeTranslation(p[0], p[1], p[2])));
  sheets.add(cMesh);
  const bondPts = [];
  for (let i = 0; i < cPos.length; i++) for (let j = i + 1; j < cPos.length; j++) {
    const a = cPos[i], b = cPos[j];
    if (a[2] === b[2] && (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 < (A * 1.05) ** 2) bondPts.push(...a, ...b);
  }
  const bondGeo = new THREE.BufferGeometry();
  bondGeo.setAttribute('position', new THREE.Float32BufferAttribute(bondPts, 3));
  const bondMat = new THREE.LineBasicMaterial({ color: 0x9fb3c8, transparent: true });
  sheets.add(new THREE.LineSegments(bondGeo, bondMat));

  // ---- The main atom (carbon to start) ----
  const atom = bohrAtom(k, { maxP: 20, maxN: 24, maxE: 20 });
  atom.set(6, 6, 6);
  const top = new THREE.Object3D();
  atom.group.add(top);
  const elecAnchor = new THREE.Object3D(), shellAnchor = new THREE.Object3D(), nucAnchor = new THREE.Object3D();
  atom.group.add(elecAnchor, shellAnchor, nucAnchor);

  // Shell filling (step 5): electrons on fixed places, empty places shown faintly.
  const slotAtom = bohrAtom(k, { maxP: 20, maxN: 22, maxE: 20, slots: true, r0: 0.7, dr: 0.55, spin: 0.5 });
  slotAtom.outerGlow = true;
  const slotTop = new THREE.Object3D();
  slotAtom.group.add(slotTop);

  // Isotopes (step 6): three carbon atoms with bigger nucleons.
  const isos = [6, 7, 8].map((n, i) => {
    const a = bohrAtom(k, { maxP: 6, maxN: 8, maxE: 6, pos: [(i - 1) * 2.7, 0, 0], r0: 0.72, dr: 0.45, nR: 0.13, eR: 0.08 });
    a.set(6, n, 6);
    a.angle = i * 1.3;
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 1.35, 0);
    a.group.add(anchor);
    a.tag = label(`C-${6 + n}`, anchor, { cls: 'big' });
    return a;
  });

  // ---- Step 3: proton, neutron, electron on mass columns ----
  const trio = new THREE.Group();
  scene.add(trio);
  const base = kit.mesh(new THREE.BoxGeometry(6.2, 0.12, 1.4), kit.mat(0x2b3a5c), [0, -0.06, 0], trio);
  base.castShadow = false;
  const COLH = 1.8; // column height for 1 amu
  const parts = [
    { key: 'proton', label: 'Proton', color: COLORS.proton, r: 0.42, mass: 1.007, sign: '+', x: -2.1 },
    { key: 'neutron', label: 'Neutron', color: COLORS.neutron, r: 0.42, mass: 1.009, sign: '', x: 0 },
    { key: 'electron', label: 'Electron', color: COLORS.electron, r: 0.17, mass: 1 / 1836, sign: '−', x: 2.1 },
  ].map(p => {
    const h = Math.max(0.004, p.mass * COLH);
    const col = kit.mesh(new THREE.BoxGeometry(0.7, h, 0.7), new THREE.MeshStandardMaterial({ color: p.color, transparent: true, opacity: 0.45, roughness: 0.6 }), [p.x, h / 2, 0], trio);
    const ball = kit.mesh(new THREE.SphereGeometry(p.r, 28, 18), kit.mat(p.color, { roughness: 0.35, emissive: p.key === 'electron' ? 0x0b2a66 : 0x000000 }), [p.x, h + p.r, 0], trio);
    if (p.sign) { const s = textSprite(k, p.sign, { size: p.r * 1.5, font: 'bold 110px sans-serif' }); s.material.depthTest = false; s.renderOrder = 10; ball.add(s); }
    const anchor = new THREE.Object3D();
    anchor.position.set(p.x, h + p.r * 2 + 0.15, 0);
    trio.add(anchor);
    return { ...p, h, col, ball, tag: label(p.label, anchor, { cls: p.key === 'electron' ? 'cool' : p.key === 'proton' ? 'warm' : '' }) };
  });
  const amuTag = label('1 amu', new THREE.Vector3(-3.25, COLH, 0));
  const ruler = kit.mesh(new THREE.BoxGeometry(6.2, 0.015, 0.015), new THREE.MeshBasicMaterial({ color: 0xffd166 }), [0, COLH, -0.36], trio);
  ruler.castShadow = false;

  // ---- Labels ----
  const pencilTag = label('Pencil lead (graphite)', tipAnchor, { cls: 'warm' });
  const sheetTag = label('Carbon atoms', new THREE.Vector3(0, 2.2, 0), { cls: 'cool' });
  const oneTag = label('One carbon atom', top, { cls: 'big' });
  const nucTag = label('Nucleus', nucAnchor, { cls: 'warm' });
  const elecTag = label('Electron', elecAnchor, { cls: 'cool' });
  const shellTag = label('Electron shell', shellAnchor);
  const nameTag = label('', top, { cls: 'big' });
  const slotTag = label('', slotTop, { cls: 'big' });

  const st = { step: 0, quiz: false, time: 0, auto: false, zoom: 0, slider: null, real: false, nScale: 1, sel: 0, row: null, build: 0, eSlider: 1, iso: 0 };

  function hideAll() {
    pencil.visible = sheets.visible = trio.visible = false;
    atom.group.visible = slotAtom.group.visible = false;
    isos.forEach(a => { a.group.visible = false; a.tag.show(false); });
    for (const t of [pencilTag, sheetTag, oneTag, nucTag, elecTag, shellTag, nameTag, slotTag, amuTag]) t.show(false);
    parts.forEach(p => p.tag.show(false));
    atom.group.scale.setScalar(1);
    atom.nucleus.scale.setScalar(1);
    atom.spin = 0.7;
  }

  // ---- Step 1 ----
  function applyZoom(s) {
    st.zoom = s;
    const u = kit.clamp(s / 0.36, 0, 1), e = kit.ease(u);
    pencil.visible = s < 0.42;
    pencil.scale.setScalar(Math.pow(9, e));
    pencil.position.x = 2.4 * (1 - e);
    const po = 1 - kit.clamp((s - 0.3) / 0.1, 0, 1);
    for (const m of Object.values(pm)) { m.opacity = po; m.depthWrite = po > 0.98; }
    tipAnchor.position.set(pencil.position.x, 0.12 * pencil.scale.x + 0.2, 0);

    sheets.visible = s > 0.42 && s < 0.82;
    const ls = s < 0.5 ? 0.4 * Math.pow(2.5, (s - 0.42) / 0.08) : s < 0.65 ? 1 : Math.pow(4, (s - 0.65) / 0.15);
    sheets.scale.setScalar(ls);
    const lo = kit.clamp((s - 0.42) / 0.07, 0, 1) * (1 - kit.clamp((s - 0.68) / 0.12, 0, 1));
    cMat.opacity = lo; bondMat.opacity = lo * 0.9; cMat.depthWrite = lo > 0.98;

    atom.group.visible = s > 0.7;
    atom.group.scale.setScalar(Math.max(0.001, 1.7 * kit.ease(kit.clamp((s - 0.7) / 0.3, 0, 1))));
    top.position.set(0, atom.outerRadius() + 0.25, 0);

    pencilTag.show(!st.quiz && s < 0.28);
    sheetTag.show(!st.quiz && s > 0.47 && s < 0.68);
    oneTag.show(!st.quiz && s > 0.88);
    const w = zoomWidth(s);
    const stage = s < 0.33 ? 'the pencil tip' : s < 0.68 ? 'sheets of carbon atoms (graphite)' : 'one carbon atom';
    ui.readout(`Width of view: about <b>${fmtLen(w)}</b><br>Zoomed in about <b>${fmtTimes(0.06 / w)}</b> times · you see ${stage}`);
  }

  // ---- Step 4 ----
  function setBuild(p, n, e) {
    atom.set(p, n, e);
    const q = atom.p - atom.e, el = element(atom.p);
    const what = !el ? 'no element yet' : q === 0 ? 'neutral atom' : q > 0 ? 'positive ion' : 'negative ion';
    nameTag.text = el ? `${el.name} ${el.sym}${chargeSup(q)}` : 'Add a proton';
    top.position.set(0, atom.outerRadius() + 0.25, 0);
    if (atom.shells.length !== st.frameShells) {
      st.frameShells = atom.shells.length;
      view({ radius: Math.max(1.3, atom.outerRadius() + 0.5), yaw: 0.2, pitch: 0.15, target: [0, 0.12, 0] });
    }
    const shells = atom.shells.length ? atom.shells.join(', ') : '–';
    ui.readout(`Protons <b>${atom.p}</b> → element: <b>${el ? name(atom.p) : '–'}</b><br>`
      + `Mass number = p + n = ${atom.p} + ${atom.n} = <b>${atom.p + atom.n}</b><br>`
      + `Charge = p − e = ${atom.p} − ${atom.e} = <b>${q > 0 ? '+' : ''}${q}</b> → ${what}<br>`
      + `Electron shells: <b>${shells}</b>`);
  }
  const bump = (dp, dn, de) => { st.auto = false; setBuild(atom.p + dp, atom.n + dn, atom.e + de); };

  // ---- Step 5 ----
  function setElectrons(z) {
    st.eSlider = z;
    slotAtom.set(z, commonN(z), z);
    const el = element(z), sh = shellsOf(z), caps = [2, 8, 8, 2];
    slotTag.text = `${el.name} (${el.sym})`;
    slotTop.position.set(0, slotAtom.shellRadius(Math.max(2, sh.length - 1)) + 0.25, 0);
    const parts2 = sh.map((c, i) => `shell ${i + 1}: ${c}${i < 3 ? ` of ${caps[i]}` : ''}${c === caps[i] && i < 3 ? ' (full)' : ''}`);
    ui.readout(`<b>${el.name}</b>: ${z} protons and ${z} electrons<br>Arrangement: <b>${sh.join(', ')}</b><br>${parts2.join(' · ')}<br>Outer electrons: <b>${sh[sh.length - 1]}</b>`);
  }

  // ---- Step 3 ----
  function pick(i) {
    st.sel = i;
    const p = parts[i];
    const txt = [
      'Charge <b>+1</b> (positive) · mass about <b>1 amu</b> · found in the nucleus',
      'Charge <b>0</b> (neutral) · mass about <b>1 amu</b> · found in the nucleus',
      'Charge <b>−1</b> (negative) · mass about <b>1/1840 amu</b> · moves in the shells around the nucleus',
    ][i];
    ui.readout(`<b>${p.label}</b>: ${txt}`);
  }

  // ---- Step 6 ----
  function pickIso(i) {
    st.iso = i;
    const n = 6 + i;
    ui.readout(`<b>Carbon-${6 + n}</b>: 6 protons, <b>${n} neutrons</b>, 6 electrons<br>Mass number = 6 + ${n} = <b>${6 + n}</b>${i === 0 ? ' · about 99% of carbon' : i === 1 ? ' · about 1% of carbon' : ' · a tiny trace, radioactive'}`);
  }

  return {
    step(i, { isQuiz }) {
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: false, slider: null, row: null });
      hideAll();
      if (i === 0) {
        view({ radius: 2.6, yaw: 0.3, pitch: 0.18, target: [0, 0, 0] });
        atom.set(6, 6, 6);
        st.auto = true;
        st.slider = ui.slider({ label: 'Zoom', min: 0, max: 1, step: 0.01, value: 0, format: v => `${Math.round(v * 100)}%`, onInput: v => { st.auto = false; applyZoom(v); } });
        applyZoom(0);
      }
      if (i === 1) {
        view({ radius: 1.6, yaw: 0.35, pitch: 0.2, target: [0, 0, 0] });
        atom.group.visible = true;
        atom.set(6, 6, 6);
        st.real = false; st.nScale = 1;
        nucTag.show(true); elecTag.show(true); shellTag.show(true);
        const a = -Math.PI / 4;
        shellAnchor.position.set(Math.cos(a) * atom.shellRadius(1), Math.sin(a) * atom.shellRadius(1), 0);
        ui.toggle({ label: 'Real size of the nucleus', value: false, onChange: v => { st.real = v; info(); } });
        const info = () => ui.readout(st.real
          ? 'Now the nucleus is a tiny speck, and a true-scale nucleus would be <b>tens of thousands of times</b> smaller than the atom: too small to draw. Yet it holds <b>more than 99.9%</b> of the atom\'s mass.'
          : 'Carbon atom: <b>6 protons</b> and <b>6 neutrons</b> in the nucleus, <b>6 electrons</b> in two shells (2 and 4). The nucleus is drawn far bigger than it really is.');
        info();
      }
      if (i === 2) {
        view({ radius: 2.3, width: 3.4, yaw: 0.25, pitch: 0.22, target: [0, 1.0, 0] });
        trio.visible = true;
        parts.forEach(p => p.tag.show(true));
        amuTag.show(true);
        st.auto = true;
        st.row = ui.buttons(parts.map((p, j) => ({ label: p.label, on: j === 0, onClick: () => { st.auto = false; pick(j); } })));
        pick(0);
      }
      if (i === 3) {
        atom.group.visible = true;
        nameTag.show(true);
        st.auto = true; st.build = 0; st.frameShells = -1;
        ui.buttons([{ label: '+ Proton', onClick: () => bump(1, 0, 0) }, { label: '+ Neutron', onClick: () => bump(0, 1, 0) }, { label: '+ Electron', onClick: () => bump(0, 0, 1) },
          { label: '− Proton', onClick: () => bump(-1, 0, 0) }, { label: '− Neutron', onClick: () => bump(0, -1, 0) }, { label: '− Electron', onClick: () => bump(0, 0, -1) }]);
        setBuild(...BUILD[0]);
      }
      if (i === 4) {
        view({ radius: 2.55, yaw: 0.2, pitch: 0.15, target: [0, 0.15, 0] });
        slotAtom.group.visible = true;
        slotTag.show(true);
        st.auto = true;
        st.slider = ui.slider({ label: 'Electrons', min: 1, max: 20, step: 1, value: 1, onInput: v => { st.auto = false; setElectrons(v); } });
        setElectrons(1);
      }
      if (i === 5) {
        view({ radius: 1.6, width: 3.9, yaw: 0, pitch: 0.12, target: [0, 0.2, 0] });
        isos.forEach(a => { a.group.visible = true; a.tag.show(true); });
        st.auto = true;
        st.row = ui.buttons(['C-12', 'C-13', 'C-14'].map((t, j) => ({ label: t, on: j === 0, onClick: () => { st.auto = false; pickIso(j); } })));
        pickIso(0);
      }
      if (isQuiz) {
        view({ radius: 1.9, yaw: -0.3, pitch: 0.25, target: [0, 0, 0] });
        atom.group.visible = true;
        atom.set(6, 6, 6);
        atom.spin = 0.4;
      }
    },

    update(dt) {
      st.time += dt;
      const t = st.time;
      if (st.step === 0 && !st.quiz && st.auto) {
        const s = kit.clamp((t - 0.4) / 8, 0, 1);
        if (Math.abs(s - st.zoom) > 0.002 || s === 1) { applyZoom(s); st.slider?.set(s); }
        if (s === 1) st.auto = false;
      }
      if (st.step === 1 && !st.quiz) {
        kit.follow(st, 'nScale', st.real ? 0.06 : 1, dt, 4);
        atom.nucleus.scale.setScalar(st.nScale);
        nucAnchor.position.set(0, atom.nucleusRadius() * st.nScale + 0.08, 0);
        atom.electronLocal(5, elecAnchor.position);
      }
      if (st.step === 2 && !st.quiz) {
        if (st.auto) { const n = Math.floor(t / 2.6) % 3; if (n !== st.sel && n >= 0) { pick(n); st.row?.select(n); } }
        parts.forEach((p, j) => {
          const on = j === st.sel;
          p.ball.position.y = p.h + p.r + (on ? 0.12 + Math.sin(t * 3) * 0.06 : 0);
          p.ball.rotation.y += dt * (on ? 1.5 : 0.2);
          p.col.material.opacity = on ? 0.75 : 0.35;
        });
      }
      if (st.step === 3 && !st.quiz && st.auto) {
        const n = Math.min(BUILD.length - 1, Math.floor(t / 1.1));
        if (n !== st.build && n >= 0) { st.build = n; setBuild(...BUILD[n]); }
      }
      if (st.step === 4 && !st.quiz && st.auto) {
        const z = kit.clamp(1 + Math.floor(t / 0.8), 1, 20);
        if (z !== st.eSlider) { setElectrons(z); st.slider?.set(z); }
        if (z === 20) st.auto = false;
      }
      if (st.step === 5 && !st.quiz) {
        if (st.auto) { const n = Math.floor(t / 2.6) % 3; if (n !== st.iso && n >= 0) { pickIso(n); st.row?.select(n); } }
        isos.forEach((a, j) => { kit.follow(a.group.scale, 'x', j === st.iso ? 1.18 : 0.92, dt, 5); a.group.scale.y = a.group.scale.z = a.group.scale.x; a.update(dt); });
      }
      atom.update(dt);
      slotAtom.update(dt);
      return true;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
