// The periodic table: the outline of all 118 places with the first 20 elements as coloured tiles;
// reading a tile; a slider through atomic numbers 1-20 with a Bohr atom; periods (rows = shells),
// groups (columns = outer electrons) and metals / non-metals / noble gases.
import { ELEMENTS, element, shellsOf, bohrAtom, textSprite } from '../_shared/atoms.js';

const P = 1.1;                                   // distance between tile centres
const tx = g => (g - 9.5) * P;
const ty = p => (4 - p) * P;
const KIND = { metal: { color: 0xffc078, css: '#ffc078', name: 'Metal' }, nonmetal: { color: 0x8ce99a, css: '#8ce99a', name: 'Non-metal' }, noble: { color: 0xb197fc, css: '#b197fc', name: 'Noble gas' } };
const PANEL = { x: -2.2, y: 0, w: 10.9, h: 7.7 };  // the middle block (groups 3-12), free for big atoms
const GROUPS = [1, 2, 13, 14, 15, 16, 17, 18];
const GROUP_INFO = {
  1: 'Hydrogen (a non-metal gas), then the alkali metals: soft metals that react strongly with water.',
  2: 'The alkaline earth metals: reactive metals, but less reactive than group 1.',
  13: 'Boron and aluminium: 3 outer electrons.',
  14: 'Carbon and silicon: 4 outer electrons.',
  15: 'Nitrogen and phosphorus: 5 outer electrons.',
  16: 'Oxygen and sulfur: 6 outer electrons.',
  17: 'The halogens: very reactive non-metals with 7 outer electrons.',
  18: 'The noble gases: full outer shells, so they hardly react.',
};
const KIND_INFO = {
  metal: '<b>Metals</b> (Li, Be, Na, Mg, Al, K, Ca): shiny, good conductors of electricity and heat, can be hammered into shape. Most are solids.',
  nonmetal: '<b>Non-metals</b> (H, B, C, N, O, F, Si, P, S, Cl): usually dull, poor conductors (graphite, a form of carbon, is an exception); many are gases.',
  noble: '<b>Noble gases</b> (He, Ne, Ar): colourless gases with full outer shells, so they hardly react with anything.',
};
const arr = z => shellsOf(z).join(', ');

export default function setup(k) {
  const { THREE, scene, kit, ui, label, view } = k;
  scene.background = new THREE.Color(0x14213d);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50607a, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(-4, 6, 10);
  scene.add(sun);

  // Board behind the table.
  kit.mesh(new THREE.BoxGeometry(21, 10.8, 0.1), kit.mat(0x22335a, { roughness: 0.9 }), [0, -1.3, -0.1], scene).castShadow = false;

  // The other 98 places (and the two markers for the 57-71 and 89-103 rows) as faint thin tiles.
  const cells = [];
  const addRow = (p, groups) => groups.forEach(g => { if (!ELEMENTS.some(e => e.period === p && e.group === g)) cells.push([tx(g), ty(p), g === 3 && p >= 6]); });
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  addRow(1, [1, 18]); addRow(2, [1, 2, ...range(13, 18)]); addRow(3, [1, 2, ...range(13, 18)]);
  addRow(4, range(1, 18)); addRow(5, range(1, 18)); addRow(6, range(1, 18)); addRow(7, range(1, 18));
  for (let r = 0; r < 2; r++) for (const g of range(3, 17)) cells.push([tx(g), ty(7) - 1.5 - r * P, false]);
  const faint = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.1), kit.mat(0xffffff, { roughness: 0.8 }), cells.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  cells.forEach(([x, y, marker], i) => { faint.setMatrixAt(i, m4.makeTranslation(x, y, 0.05)); faint.setColorAt(i, col.set(marker ? 0x55688f : 0x46597d)); });
  scene.add(faint);

  // The first 20 elements: thick tiles with a painted front.
  const tileGeo = new THREE.BoxGeometry(1, 1, 0.3);
  const tiles = ELEMENTS.map(el => {
    const front = new THREE.MeshStandardMaterial({ map: paintTile(THREE, el), roughness: 0.55 });
    const side = kit.mat(KIND[el.kind].color, { roughness: 0.6 });
    const m = new THREE.Mesh(tileGeo, [side, side, side, side, front, side]);
    const g = new THREE.Group();
    g.position.set(tx(el.group), ty(el.period), 0.15);
    g.add(m);
    scene.add(g);
    return { el, g, front, side, base: new THREE.Color(KIND[el.kind].color), pop: 0, popTo: 0, lit: 1, litTo: 1, sc: 1, scTo: 1 };
  });

  // Glow behind a highlighted row or column.
  const glow = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.55 }));
  glow.position.z = -0.03;
  glow.visible = false;
  scene.add(glow);

  // Dark panel over the middle block, where the big atoms are shown.
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), new THREE.MeshBasicMaterial({ color: 0x0b1424 }));
  panel.position.set(PANEL.x, PANEL.y, 0.36);
  scene.add(panel);

  const big = bohrAtom(k, { maxP: 20, maxN: 22, maxE: 20, pos: [PANEL.x, -0.25, 0.75], r0: 0.95, dr: 0.8, nR: 0.12, eR: 0.11, tube: 0.018, spin: 0.6 });
  big.outerGlow = true;
  const bigTop = new THREE.Object3D();
  big.group.add(bigTop);
  const nameTag = label('', bigTop, { cls: 'big' });

  // Up to 8 smaller atoms side by side (a period or a group). The nucleus is one ball with the symbol on it.
  const line = Array.from({ length: 8 }, () => {
    const a = bohrAtom(k, { ball: true, maxP: 20, maxN: 22, maxE: 20, spin: 0.6 });
    a.outerGlow = true;
    a.sym = textSprite(k, '', { size: 0.5, font: 'bold 64px sans-serif' });
    a.sym.material.depthTest = false; a.sym.renderOrder = 10;
    a.group.add(a.sym);
    a.top = new THREE.Object3D();
    a.group.add(a.top);
    a.tag = label('', a.top);
    return a;
  });

  // Labels for reading a tile and for rows and columns.
  const numAnchor = new THREE.Object3D(), massAnchor = new THREE.Object3D(), rowAnchor = new THREE.Object3D();
  scene.add(numAnchor, massAnchor, rowAnchor);
  const numTag = label('Atomic number', numAnchor, { cls: 'cool' });
  const massTag = label('Atomic mass', massAnchor, { cls: 'cool' });
  const rowTag = label('', rowAnchor, { cls: 'big warm' });

  const st = { step: 0, quiz: false, time: 0, auto: false, z: 1, row: null, slider: null, sel: 0, all: true };
  const overview = { radius: 5.6, width: 11, yaw: 0, pitch: 0.08, target: [0, -1.3, 0] };

  function reset() {
    for (const t of tiles) { t.popTo = 0; t.litTo = 1; t.scTo = 1; }
    glow.visible = false; panel.visible = false; big.group.visible = false;
    line.forEach(a => { a.group.visible = false; a.tag.show(false); });
    for (const t of [nameTag, numTag, massTag, rowTag]) t.show(false);
    faint.visible = true;
  }

  // Lay out n atoms in the panel, in one row or two rows of four, as large as they fit.
  function lineup(zs) {
    const n = zs.length, rows = n > 4 ? 2 : 1, perRow = Math.ceil(n / rows);
    const shells = Math.max(...zs.map(z => shellsOf(z).length));
    const R = Math.min(PANEL.w / perRow / 2 - 0.15, rows === 2 ? 1.3 : 2.4);
    const dr = R / (shells - 1 + 1.25), r0 = 1.25 * dr;
    line.forEach((a, i) => {
      a.group.visible = i < n;
      a.tag.show(i < n && !st.quiz);
      if (i >= n) return;
      const z = zs[i], el = element(z), r = Math.floor(i / perRow), c = i % perRow;
      a.group.position.set(PANEL.x + (c - (perRow - 1) / 2) * (PANEL.w / perRow), rows === 2 ? (r === 0 ? 1.85 : -1.85) : 0.1, 0.75);
      a.layout({ r0, dr, nR: Math.min(0.3, r0 * 0.55), eR: Math.min(0.1, 0.05 + R * 0.025), tube: 0.014 });
      a.set(z, el.n, z);
      a.angle = i * 0.9;
      a.sym.setText(el.sym);
      a.sym.scale.setScalar(Math.min(0.5, r0 * 0.9));
      a.top.position.set(0, a.outerRadius() + 0.18, 0);
      a.tag.text = el.sym;
    });
  }

  // ---- steps ----
  function readTile(z) {
    const t = tiles[z - 1], el = t.el;
    for (const o of tiles) { o.popTo = o === t ? 0.6 : 0; o.litTo = o === t ? 1 : 0.55; }
    const x = tx(el.group), y = ty(el.period), zf = 0.95;
    view({ radius: 1.05, yaw: 0.12, pitch: 0.08, target: [x, y - 0.03, zf] });
    numAnchor.position.set(x - 0.32, y + 0.62, zf);
    massAnchor.position.set(x, y - 0.68, zf);
    const latin = { Na: ' (from the Latin natrium)', K: ' (from the Latin kalium)' }[el.sym] || '';
    ui.readout(`Atomic number <b>${el.z}</b>: ${el.z} proton${el.z > 1 ? 's' : ''} in every atom<br>Symbol <b>${el.sym}</b>${latin} · name <b>${el.name}</b><br>Relative atomic mass about <b>${el.mass} amu</b>`);
  }

  function pickZ(z) {
    st.z = z;
    const el = element(z);
    for (const t of tiles) { t.popTo = t.el.z === z ? 0.55 : 0; t.litTo = t.el.z === z ? 1 : t.el.z < z ? 0.8 : 0.5; t.scTo = t.el.z === z ? 1.12 : 1; }
    big.set(z, el.n, z);
    bigTop.position.set(0, big.outerRadius() + 0.25, 0);
    nameTag.text = `${el.name} (${el.sym})`;
    const sh = shellsOf(z);
    ui.readout(`<b>${el.name} (${el.sym})</b>, atomic number ${z}<br>Group <b>${el.group}</b> · Period <b>${el.period}</b> · ${KIND[el.kind].name}<br>Electron arrangement: <b>${sh.join(', ')}</b> (${sh.length} shell${sh.length > 1 ? 's' : ''}, ${sh[sh.length - 1]} outer)`);
  }

  function pickPeriod(p) {
    st.sel = p;
    const els = ELEMENTS.filter(e => e.period === p);
    for (const t of tiles) { const on = t.el.period === p; t.popTo = on ? 0.4 : 0; t.litTo = on ? 1 : 0.4; t.scTo = 1; }
    glow.visible = true;
    glow.scale.set(20.6, 1.32, 1);
    glow.position.set(0, ty(p), -0.03);
    rowAnchor.position.set(tx(16), ty(p) + 0.62, 0.6);
    rowTag.text = `Period ${p}`;
    lineup(els.map(e => e.z));
    ui.readout(`<b>Period ${p}</b>: ${els.map(e => e.sym).join(', ')}<br>Every atom has <b>${p} shell${p > 1 ? 's' : ''}</b><br>${els.map(e => `${e.sym} ${arr(e.z)}`).join(' · ')}`);
  }

  function pickGroup(g) {
    st.sel = g;
    const els = ELEMENTS.filter(e => e.group === g);
    for (const t of tiles) { const on = t.el.group === g; t.popTo = on ? 0.4 : 0; t.litTo = on ? 1 : 0.4; t.scTo = 1; }
    glow.visible = true;
    glow.scale.set(1.32, 7 * P + 0.25, 1);
    glow.position.set(tx(g), (ty(1) + ty(7)) / 2, -0.03);
    rowAnchor.position.set(tx(g), ty(1) + 0.62, 0.6);
    rowTag.text = `Group ${g}`;
    lineup(els.map(e => e.z));
    const outs = els.map(e => { const s = shellsOf(e.z); return s[s.length - 1]; });
    const same = outs.every(o => o === outs[outs.length - 1]);
    ui.readout(`<b>Group ${g}</b>: ${els.map(e => `${e.sym} (${arr(e.z)})`).join(' · ')}<br>Outer electrons: <b>${same ? outs[0] : outs.join(', ')}</b>${g === 18 ? ' (full shells)' : ''}<br>${GROUP_INFO[g]}`);
  }

  function pickKind(kind) {
    st.sel = kind;
    for (const t of tiles) { const on = t.el.kind === kind; t.popTo = on ? 0.5 : 0; t.litTo = on ? 1 : 0.35; t.scTo = on ? 1.06 : 1; }
    ui.readout(KIND_INFO[kind]);
  }

  return {
    step(i, { isQuiz }) {
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: false, row: null, slider: null });
      reset();
      if (i === 0) {
        view(overview);
        st.auto = true;
        ui.buttons([{ label: 'Play 1 to 20', onClick: () => { st.auto = true; st.time = 0; } }]);
        ui.toggle({ label: 'Show all 118 places', value: true, onChange: v => { faint.visible = v; st.all = v; } });
        st.all = true;
        ui.readout('Elements known: <b>118</b> · coloured here: the first <b>20</b>');
      }
      if (i === 1) {
        numTag.show(true); massTag.show(true);
        const zs = [1, 6, 8, 11, 17, 20];
        st.auto = true; st.sel = 1;
        st.row = ui.buttons(zs.map((z, j) => ({ label: element(z).sym, on: j === 1, onClick: () => { st.auto = false; readTile(z); } })));
        readTile(6);
      }
      if (i === 2) {
        view(overview);
        panel.visible = true; big.group.visible = true; nameTag.show(true);
        st.auto = true;
        st.slider = ui.slider({ label: 'Atomic number', min: 1, max: 20, step: 1, value: 1, onInput: v => { st.auto = false; pickZ(v); } });
        pickZ(1);
      }
      if (i === 3) {
        view(overview);
        panel.visible = true; rowTag.show(true);
        st.auto = true;
        st.row = ui.buttons([1, 2, 3, 4].map(p => ({ label: `Period ${p}`, on: p === 3, onClick: () => { st.auto = false; pickPeriod(p); } })));
        pickPeriod(3);
      }
      if (i === 4) {
        view(overview);
        panel.visible = true; rowTag.show(true);
        st.auto = true;
        st.row = ui.buttons(GROUPS.map((g, j) => ({ label: `Group ${g}`, on: j === 0, onClick: () => { st.auto = false; pickGroup(g); } })));
        pickGroup(1);
      }
      if (i === 5) {
        view({ ...overview, yaw: -0.1 });
        st.auto = true;
        const kinds = ['metal', 'nonmetal', 'noble'];
        st.row = ui.buttons(kinds.map((kd, j) => ({ label: ['Metals', 'Non-metals', 'Noble gases'][j], on: j === 0, onClick: () => { st.auto = false; pickKind(kd); } })));
        pickKind('metal');
      }
      if (isQuiz) view({ ...overview, yaw: -0.15, pitch: 0.15 });
    },

    update(dt) {
      st.time += dt;
      const t = st.time;
      if (st.step === 0 && !st.quiz && st.auto) {
        // A wave runs through the tiles in order of atomic number.
        let front = 0;
        for (const o of tiles) {
          const d = (t - 0.4 - (o.el.z - 1) * 0.22) / 0.22;
          o.popTo = 0.45 * Math.exp(-d * d);
          if (d > -0.5) front = o.el.z;
        }
        if (front && front !== st.z) { st.z = front; const el = element(front); ui.readout(`Atomic number <b>${front}</b>: ${el.name} (${el.sym}) · group ${el.group}, period ${el.period}<br>Elements known: <b>118</b> · coloured here: the first <b>20</b>`); }
        if (t > 0.4 + 20 * 0.22 + 0.6) st.auto = false;
      }
      if (st.step === 1 && !st.quiz && st.auto) {
        const zs = [6, 8, 11, 17, 20, 1], n = Math.floor(t / 3) % zs.length;
        if (n !== st.sel && n >= 0) { st.sel = n; readTile(zs[n]); st.row?.select([1, 6, 8, 11, 17, 20].indexOf(zs[n])); }
      }
      if (st.step === 2 && !st.quiz && st.auto) {
        const z = kit.clamp(1 + Math.floor(t / 0.75), 1, 20);
        if (z !== st.z) { pickZ(z); st.slider?.set(z); }
        if (z === 20) st.auto = false;
      }
      if (st.step === 3 && !st.quiz && st.auto) {
        const order = [3, 4, 1, 2], p = order[Math.floor(t / 4) % 4];
        if (p !== st.sel) { pickPeriod(p); st.row?.select(p - 1); }
      }
      if (st.step === 4 && !st.quiz && st.auto) {
        const order = [1, 17, 18, 2, 13, 14, 15, 16], g = order[Math.floor(t / 4) % order.length];
        if (g !== st.sel) { pickGroup(g); st.row?.select(GROUPS.indexOf(g)); }
      }
      if (st.step === 5 && !st.quiz && st.auto) {
        const kinds = ['metal', 'nonmetal', 'noble'], n = Math.floor(t / 3.5) % 3;
        if (kinds[n] !== st.sel) { pickKind(kinds[n]); st.row?.select(n); }
      }

      for (const o of tiles) {
        kit.follow(o, 'pop', o.popTo, dt, 7);
        kit.follow(o, 'lit', o.litTo, dt, 6);
        kit.follow(o, 'sc', o.scTo, dt, 7);
        o.g.position.z = 0.15 + o.pop;
        o.g.scale.setScalar(o.sc);
        o.front.color.setScalar(o.lit);
        o.side.color.copy(o.base).multiplyScalar(o.lit);
      }
      if (glow.visible) glow.material.opacity = 0.4 + 0.15 * Math.sin(t * 3);
      big.update(dt);
      for (const a of line) a.update(dt);
      return true;
    },
  };
}

// Front of a tile: atomic number, symbol, name and relative atomic mass on the element's kind colour.
function paintTile(THREE, el) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = KIND[el.kind].css;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(20,33,61,0.35)';
  g.lineWidth = 8;
  g.strokeRect(4, 4, 248, 248);
  g.fillStyle = '#14213d';
  g.textAlign = 'left'; g.textBaseline = 'top';
  g.font = 'bold 44px sans-serif';
  g.fillText(String(el.z), 18, 14);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold ${el.sym.length > 1 ? 104 : 116}px sans-serif`;
  g.fillText(el.sym, 128, 118);
  g.font = `${el.name.length > 9 ? 30 : 34}px sans-serif`;
  g.fillText(el.name, 128, 190);
  g.font = 'bold 30px sans-serif';
  g.fillText(String(el.mass), 128, 230);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
