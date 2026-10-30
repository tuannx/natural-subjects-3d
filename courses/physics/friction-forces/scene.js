// Balanced forces and friction: a tug of war (balanced / unbalanced pulls), boxes sliding on ice,
// wood and carpet (friction), and a ball rolling down a ramp and off a table (a repeatable pattern).
const TUG = -12, LANES = 0, TABLE = 12;     // x positions of the three play areas

// Sliding boxes: same starting speed, different friction (slowing in units per second each second).
const V0 = 2.4;
const SURF = [
  { key: 'ice', name: 'Ice', z: -1.5, slow: 0.32 },
  { key: 'wood', name: 'Wood', z: 0, slow: 1.2 },
  { key: 'carpet', name: 'Carpet', z: 1.5, slow: 2.6 },
];
const BOX_X0 = -4;  // start of every box; marks are 1 unit apart from here

// Ramp on a table (metres, real gravity, shown in slow motion).
const g = 9.8, H = 1.0, TH = (25 * Math.PI) / 180, R = 0.08, FOOT = -0.7, EDGE = 0, SLOW = 0.6;
const STARTS = { low: { s: 0.45, name: 'Low', color: 0x2a9d8f }, mid: { s: 0.9, name: 'Middle', color: 0xf4a261 }, high: { s: 1.4, name: 'High', color: 0xe63946 } };
const speedAtFoot = s => Math.sqrt((10 / 7) * g * s * Math.sin(TH)); // rolling ball: 5/7 of g sin(angle)
const landX = key => EDGE + speedAtFoot(STARTS[key].s) * Math.sqrt((2 * H) / g);
const SAND_TOP = 0.06;

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xd8e9c9, sky: 0xe4f1ff, radius: 26 });
  // Push the big ground disc back in depth so flat things lying on it (mats, lanes) never flicker through.
  Object.assign(ground.material, { polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 });
  const sun = kit.lights(scene, { sun: [4, 11, 7] });
  scene.add(sun.target);

  // Shared flat arrow. set(x, y, z, dir, len): horizontal, pointing +x (dir 1) or -x (dir -1).
  function makeArrow(color, text, cls) {
    const a = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), m);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 14), m);
    shaft.rotation.z = head.rotation.z = -Math.PI / 2;
    a.add(shaft, head);
    const tip = new THREE.Object3D();
    a.add(tip);
    a.visible = false;
    scene.add(a);
    a.tag = text ? label(text, tip, { cls }) : null;
    a.tag?.show(false);
    a.set = (x, y, z, dir, len) => {
      a.position.set(x, y, z);
      a.rotation.y = dir > 0 ? 0 : Math.PI;
      shaft.scale.y = Math.max(0.001, len); shaft.position.x = len / 2;
      head.position.x = len + 0.12;
      tip.position.set(len / 2, 0.15, 0);
    };
    a.on = v => { a.visible = v; a.tag?.show(v); };
    return a;
  }

  // ---------- Tug of war ----------
  const tug = new THREE.Group();
  tug.position.x = TUG;
  scene.add(tug);
  const line = kit.mesh(new THREE.PlaneGeometry(0.1, 2.4), new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [0, 0.03, 0], tug);
  line.rotation.x = -Math.PI / 2;
  const middleTag = label('Middle line', new THREE.Vector3(TUG, 0.05, 1.25));
  const ropeG = new THREE.Group();
  tug.add(ropeG);
  const rope = kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 7, 8), kit.mat(0xd4a373), [0, 0.6, 0], ropeG);
  rope.rotation.z = Math.PI / 2;
  kit.mesh(new THREE.BoxGeometry(0.08, 0.3, 0.12), kit.mat(0xe63946), [0, 0.5, 0], ropeG);
  const kids = [];
  const skin = [0xf1c27d, 0xc68642, 0x8d5524, 0xffdbac];
  for (const side of [-1, 1]) {
    const shirt = kit.mat(side < 0 ? 0x3a86ff : 0xfb8500);
    for (let j = 0; j < 4; j++) {
      const k = new THREE.Group();
      kit.mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.62, 12), shirt, [0, 0.31, 0], k);
      kit.mesh(new THREE.SphereGeometry(0.13, 16, 12), kit.mat(skin[(j + (side > 0 ? 2 : 0)) % 4]), [0, 0.76, 0], k);
      kit.mesh(new THREE.BoxGeometry(0.36, 0.06, 0.06), shirt, [-side * 0.15, 0.55, j % 2 ? 0.15 : -0.15], k);
      k.side = side; k.j = j;
      ropeG.add(k);
      kids.push(k);
    }
  }
  const blueTag = label('Blue team', new THREE.Object3D(), { cls: 'cool' });
  const orangeTag = label('Orange team', new THREE.Object3D(), { cls: 'warm' });
  ropeG.add(blueTag.at, orangeTag.at);
  blueTag.at.position.set(-2.7, 1.15, 0); orangeTag.at.position.set(2.7, 1.15, 0);
  const blueArrow = makeArrow(0x1d4ed8), orangeArrow = makeArrow(0xea580c);
  const tugSt = { off: 0, blue: 2, orange: 2, power: 1 };

  function layoutKids() {
    for (const k of kids) {
      const n = k.side < 0 ? tugSt.blue : tugSt.orange;
      k.visible = k.j < n;
      k.position.set(k.side * (1.0 + k.j * 0.62), 0, k.j % 2 ? -0.18 : 0.18);
      k.rotation.z = -k.side * (tugSt.power > 1 ? 0.42 : 0.24);
    }
    blueArrow.set(TUG + tugSt.off - 0.1, 1.4, 0, -1, tugSt.blue * 0.35 * tugSt.power);
    orangeArrow.set(TUG + tugSt.off + 0.1, 1.4, 0, 1, tugSt.orange * 0.35 * tugSt.power);
  }
  function tugReadout() {
    const d = tugSt.orange - tugSt.blue;
    ui.readout(d === 0
      ? 'The pulls are <b>balanced</b>. The rope does not move.'
      : `The pulls are <b>unbalanced</b>. The rope moves toward the <b>${d > 0 ? 'orange' : 'blue'} team</b>.`);
  }

  // ---------- Sliding boxes ----------
  const lanes = new THREE.Group();
  lanes.position.x = LANES;
  scene.add(lanes);
  const texes = { ice: paintIce(THREE), wood: paintWood(THREE), carpet: paintCarpet(THREE) };
  const boxMat = kit.mat(0xc8a26b), tape = kit.mat(0x9c6644);
  const boxGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6), tapeGeo = new THREE.BoxGeometry(0.62, 0.02, 0.14);
  for (const s of SURF) {
    const p = kit.mesh(new THREE.PlaneGeometry(10.5, 1.2), kit.mat(0xffffff, { map: texes[s.key], roughness: s.key === 'ice' ? 0.15 : 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [0.75, 0.05, s.z], lanes);
    p.rotation.x = -Math.PI / 2; p.castShadow = false;
    const box = new THREE.Group();
    kit.mesh(boxGeo, boxMat, [0, 0.25, 0], box);
    kit.mesh(tapeGeo, tape, [0, 0.505, 0], box);
    lanes.add(box);
    s.box = box; s.x = BOX_X0; s.v = 0; s.moving = false;
    s.tag = label(s.name, new THREE.Vector3(LANES + BOX_X0 - 0.55, 0.15, s.z), { cls: s.key === 'ice' ? 'cool' : s.key === 'carpet' ? 'warm' : '' });
    s.push = makeArrow(0xf77f00, 'Push', 'warm');
  }
  const frictionArrow = makeArrow(0x2a9d8f, 'Friction');

  function placeBoxes() {
    for (const s of SURF) {
      s.box.position.set(s.x, 0, s.z);
      if (s.push.visible) s.push.set(LANES + s.x - 0.32 - 0.9 - 0.25, 0.28, s.z, 1, 0.9);
    }
    const w = SURF[1];
    if (frictionArrow.visible) frictionArrow.set(LANES + w.x - 0.05, 0.08, w.z - 0.45, -1, 0.85);
  }
  function pushBoxes(which) {
    for (const s of SURF) {
      if (!which.includes(s.key)) continue;
      s.x = BOX_X0; s.v = V0; s.moving = true; s.pushT = 0.7;
      s.push.on(true);
      s.push.tag?.show(st.step === 2);
    }
    if (st.step === 2) { frictionArrow.on(true); ui.readout('The box is sliding. Friction pushes <b>backward</b> and slows it down.'); }
    if (st.step === 3) ui.readout('Same push for all three boxes…');
    placeBoxes();
  }
  const marks = x => Math.round(x - BOX_X0);
  function boxesStopped() {
    if (st.step === 2) { ui.readout(`Friction stopped the box after about <b>${marks(SURF[1].x)} marks</b>.`); frictionArrow.on(false); }
    if (st.step === 3) ui.readout(SURF.map(s => `${s.name}: about <b>${marks(s.x)} mark${marks(s.x) === 1 ? '' : 's'}</b>`).join('<br>'));
  }

  // ---------- Ramp, table and sand tray ----------
  const lab = new THREE.Group();
  lab.position.x = TABLE;
  scene.add(lab);
  const tableMat = kit.mat(0x8d6e63);
  kit.mesh(new THREE.BoxGeometry(2.4, 0.08, 1.0), tableMat, [-1.2, H - 0.04, 0], lab);
  for (const [x, z] of [[-2.3, -0.42], [-0.1, -0.42], [-2.3, 0.42], [-0.1, 0.42]]) kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, H - 0.08, 8), tableMat, [x, (H - 0.08) / 2, z], lab);
  const rampG = new THREE.Group();
  rampG.position.set(FOOT, H, 0);
  rampG.rotation.z = -TH;
  lab.add(rampG);
  kit.mesh(new THREE.BoxGeometry(1.7, 0.03, 0.26), kit.mat(0xe9c46a), [-0.85, -0.015, 0], rampG);
  for (const z of [-0.12, 0.12]) kit.mesh(new THREE.BoxGeometry(1.7, 0.05, 0.02), kit.mat(0xbc8a3c), [-0.85, 0.025, z], rampG);
  kit.mesh(new THREE.BoxGeometry(0.06, 1.7 * Math.sin(TH), 0.26), kit.mat(0xbc8a3c), [FOOT - 1.7 * Math.cos(TH) + 0.03, H + (1.7 * Math.sin(TH)) / 2, 0], lab);
  for (const st0 of Object.values(STARTS)) {
    kit.mesh(new THREE.BoxGeometry(0.04, 0.06, 0.08), kit.mat(st0.color), [-st0.s, 0.03, 0.17], rampG);
  }
  const tray = kit.mesh(new THREE.BoxGeometry(1.9, SAND_TOP, 1.0), kit.mat(0xffffff, { map: paintSand(THREE), roughness: 1 }), [1.2, SAND_TOP / 2, 0], lab);
  tray.castShadow = false;
  const ballMesh = kit.mesh(new THREE.SphereGeometry(R, 20, 14), kit.mat(0xff006e, { roughness: 0.35 }), [0, 0, 0], lab);
  const ballTag = label('Ball', new THREE.Object3D());
  ballMesh.add(ballTag.at);
  ballTag.at.position.y = 0.12;
  const markGeo = new THREE.CircleGeometry(0.05, 14);
  const markMats = Object.fromEntries(Object.entries(STARTS).map(([k, v]) => [k, new THREE.MeshBasicMaterial({ color: v.color })]));
  const markPool = [];
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(markGeo, markMats.mid);
    m.rotation.x = -Math.PI / 2; m.visible = false;
    lab.add(m); markPool.push(m);
  }
  const cup = new THREE.Group();
  const cupMat = kit.mat(0x4361ee, { side: THREE.DoubleSide });
  kit.mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.18, 20, 1, true), cupMat, [0, 0.09, 0], cup);
  kit.mesh(new THREE.CircleGeometry(0.12, 20), cupMat, [0, 0.005, 0], cup).rotation.x = -Math.PI / 2;
  cup.position.set(landX('high'), SAND_TOP, 0);
  lab.add(cup);
  const cupTag = label('Cup', new THREE.Object3D(), { cls: 'cool' });
  cup.add(cupTag.at);
  cupTag.at.position.y = 0.3;
  const tableTag = label('Table', new THREE.Vector3(TABLE - 1.6, H + 0.05, 0.5));
  const sandTag = label('Sand tray', new THREE.Vector3(TABLE + 1.9, SAND_TOP, 0.55), { cls: 'warm' });

  const ball = { phase: 'idle', key: 'mid', s: 0, x: 0, y: 0, vx: 0, vy: 0, v: 0, roll: 0 };
  const counts = {};
  let markN = 0;
  function placeBall() {
    if (ball.phase === 'ramp' || ball.phase === 'ready') {
      ballMesh.position.set(FOOT - ball.s * Math.cos(TH) + R * Math.sin(TH), H + ball.s * Math.sin(TH) + R * Math.cos(TH), 0);
    } else ballMesh.position.set(ball.x, ball.y, 0);
    ballMesh.rotation.z = -ball.roll / R;
  }
  function readyBall(key) {
    Object.assign(ball, { phase: 'ready', key, s: STARTS[key].s, v: 0, roll: 0 });
    placeBall();
  }
  function rollFrom(key) { readyBall(key); ball.phase = 'ramp'; }
  function landed() {
    ball.phase = 'landed';
    const k = ball.key, m = markPool[markN++ % markPool.length];
    m.material = markMats[k]; m.position.set(ball.x, SAND_TOP + 0.003 + (markN % 3) * 0.0005, 0); m.visible = true;
    counts[k] = (counts[k] || 0) + 1;
    if (st.step === 4) {
      ui.readout(Object.keys(STARTS).filter(key => counts[key]).map(key =>
        `${STARTS[key].name} start: landed in the same spot <b>${counts[key]} time${counts[key] > 1 ? 's' : ''}</b>`).join('<br>'));
    } else if (st.step === 5) {
      const d = ball.x - cup.position.x;
      ui.readout(Math.abs(d) < 0.12 ? `${STARTS[k].name} start: <b>in the cup!</b>` : `${STARTS[k].name} start: <b>${d < 0 ? 'too short' : 'too far'}</b>. Try again.`);
    }
  }
  function clearMarks() { for (const m of markPool) m.visible = false; markN = 0; for (const k in counts) delete counts[k]; }

  const st = { step: 0, time: 0, plan: [] };
  const allTags = () => [middleTag, blueTag, orangeTag, ballTag, cupTag, tableTag, sandTag, ...SURF.map(s => s.tag)];
  const tugView = { radius: 3.2, yaw: 0.15, pitch: 0.28, target: [TUG, 0.75, 0] };
  const labView = { radius: 1.75, yaw: 0.3, pitch: 0.22, target: [TABLE - 0.1, 0.75, 0] };

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.time = 0; st.plan = [];
      for (const t of allTags()) t.show(false);
      for (const s of SURF) { s.push.on(false); s.moving = false; s.x = BOX_X0; s.box.visible = true; }
      frictionArrow.on(false);
      blueArrow.on(false); orangeArrow.on(false);
      cup.visible = false;
      tugSt.off = 0; tugSt.blue = tugSt.orange = 2; tugSt.power = 1;
      // Keep the one shadow-casting light over the area this step shows.
      const ax = i <= 1 ? TUG : i <= 3 || isQuiz ? LANES : TABLE;
      sun.target.position.set(ax, 0, 0); sun.position.set(ax + 4, 11, 7);

      if (i === 0 || i === 1) {
        view(tugView);
        blueArrow.on(true); orangeArrow.on(true);
        blueTag.show(true); orangeTag.show(true); middleTag.show(true);
        if (i === 0) {
          st.plan = [[1.2, () => { tugSt.power = 2; layoutKids(); }]];
          ui.buttons([{ label: 'Both pull gently', onClick: () => { st.plan = []; tugSt.power = 1; layoutKids(); } },
            { label: 'Both pull hard', onClick: () => { st.plan = []; tugSt.power = 2; layoutKids(); } }]);
          ui.readout('Both teams pull <b>equally hard</b>. The forces are <b>balanced</b>.');
        } else {
          const blue = ui.slider({ label: 'Blue team', min: 1, max: 4, step: 1, value: 2, format: v => `${v} ${v > 1 ? 'children' : 'child'}`, onInput: v => { st.plan = []; tugSt.blue = v; layoutKids(); tugReadout(); } });
          const orange = ui.slider({ label: 'Orange team', min: 1, max: 4, step: 1, value: 2, format: v => `${v} ${v > 1 ? 'children' : 'child'}`, onInput: v => { st.plan = []; tugSt.orange = v; layoutKids(); tugReadout(); } });
          ui.buttons([{ label: 'Start again', onClick: () => { tugSt.off = 0; layoutKids(); } }]);
          st.plan = [[0.8, () => { tugSt.orange = 3; orange.set(3); layoutKids(); tugReadout(); }]];
          void blue;
          tugReadout();
        }
        layoutKids();
      }
      if (i === 2) {
        view({ radius: 2.7, yaw: 0.2, pitch: 0.45, target: [LANES - 1.9, 0.3, 0] });
        SURF[0].box.visible = SURF[2].box.visible = false;
        SURF[1].tag.show(true);
        st.plan = [[1.3, () => pushBoxes(['wood'])]];
        ui.buttons([{ label: 'Push the box', onClick: () => { st.plan = []; pushBoxes(['wood']); } }]);
        ui.readout('Press the button to give the box a push.');
      }
      if (i === 3) {
        view({ radius: 4.4, yaw: 0.25, pitch: 0.62, target: [LANES + 0.6, 0.2, 0] });
        for (const s of SURF) s.tag.show(true);
        st.plan = [[0.4, () => pushBoxes(['ice', 'wood', 'carpet'])]];
        ui.buttons([{ label: 'Push all three', onClick: () => { st.plan = []; pushBoxes(['ice', 'wood', 'carpet']); } }]);
        ui.readout('All three boxes will get <b>the same push</b>.');
      }
      if (i === 4 || i === 5) {
        view(labView);
        clearMarks();
        ballTag.show(true); tableTag.show(i === 4); sandTag.show(i === 4);
        readyBall('mid');
        if (i === 4) {
          st.plan = [[0.2, () => rollFrom('mid')], [1.7, () => rollFrom('mid')]];
          ui.readout('Watch where the ball lands.');
        } else {
          cup.visible = true; cupTag.show(true);
          st.plan = [[0.3, () => rollFrom('low')]];
          ui.readout('Which start will land the ball in the cup?');
        }
        ui.buttons(Object.entries(STARTS).map(([k, v]) => ({ label: `${v.name} start`, onClick: () => { st.plan = []; rollFrom(k); } })));
      }
      if (isQuiz) {
        view({ radius: 4.8, yaw: -0.3, pitch: 0.5, target: [LANES + 0.6, 0.2, 0] });
        SURF[0].x = 3.2; SURF[1].x = -1.6; SURF[2].x = -2.9;
        for (const s of SURF) s.tag.show(true);
      }
      placeBoxes();
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      let busy = st.plan.length > 0;

      // Tug of war: unbalanced pulls move the rope toward the stronger team.
      if (st.step === 0 || st.step === 1) {
        const net = tugSt.orange - tugSt.blue;
        if (net !== 0 && Math.abs(tugSt.off) < 1.4) {
          tugSt.off = kit.clamp(tugSt.off + net * 0.5 * dt, -1.4, 1.4);
          if (Math.abs(tugSt.off) >= 1.4) ui.readout(`The <b>${net > 0 ? 'orange' : 'blue'} team</b> pulled the ribbon over to their side. Press Start again.`);
          busy = true;
        }
        ropeG.position.x = tugSt.off;
        layoutKids();
        // Gentle bob of the children while they pull.
        for (const k of kids) k.position.y = Math.abs(Math.sin(st.time * 6 + k.j * 1.7 + k.side)) * 0.02;
        busy = true;
      }

      // Boxes: friction takes away speed each second until they stop.
      let anyMoving = false, stoppedNow = false;
      for (const s of SURF) {
        if (s.pushT > 0) { s.pushT -= dt; if (s.pushT <= 0) s.push.on(false); busy = true; }
        if (!s.moving) continue;
        s.v -= s.slow * dt;
        if (s.v <= 0) { s.v = 0; s.moving = false; stoppedNow = true; }
        s.x += s.v * dt;
        anyMoving = anyMoving || s.moving;
      }
      if (stoppedNow && !anyMoving) boxesStopped();
      if (anyMoving || stoppedNow) { placeBoxes(); busy = true; }

      // Ball on the ramp, across the table, then flying off the edge.
      if (ball.phase === 'ramp' || ball.phase === 'flat' || ball.phase === 'fly') {
        let h = dt * SLOW;
        while (h > 0) {
          const k = Math.min(h, 1 / 240); h -= k;
          if (ball.phase === 'ramp') {
            ball.v += (5 / 7) * g * Math.sin(TH) * k;
            ball.s -= ball.v * k; ball.roll += ball.v * k;
            if (ball.s <= 0) { ball.phase = 'flat'; ball.x = FOOT + R * Math.sin(TH); ball.y = H + R; ball.v = speedAtFoot(STARTS[ball.key].s); }
          } else if (ball.phase === 'flat') {
            ball.x += ball.v * k; ball.roll += ball.v * k;
            if (ball.x >= EDGE) { ball.phase = 'fly'; ball.vx = ball.v; ball.vy = 0; }
          } else if (ball.phase === 'fly') {
            ball.vy -= g * k; ball.x += ball.vx * k; ball.y += ball.vy * k; ball.roll += ball.vx * k;
            if (ball.y <= SAND_TOP + R) {
              ball.y = SAND_TOP + R;
              // Sand stops the ball where it lands (land at the true landing spot, not a sub-step late).
              ball.x = landX(ball.key);
              landed();
              break;
            }
          }
        }
        placeBall();
        busy = true;
      }
      return busy;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function canvasTex(THREE, w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// Distance marks every unit from the box start (lane runs from x = -4.5 to 6 over the texture's width).
function laneMarks(g, w, h, color) {
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2;
  g.font = 'bold 13px sans-serif'; g.textAlign = 'center';
  for (let k = 1; k <= 9; k++) {
    const u = ((BOX_X0 + k + 4.5) / 10.5) * w;
    g.beginPath(); g.moveTo(u, h - 16); g.lineTo(u, h); g.stroke();
    g.fillText(String(k), u, h - 20);
  }
}
function paintIce(THREE) {
  return canvasTex(THREE, 512, 64, (g, w, h) => {
    g.fillStyle = '#cfefff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const x = rand(i) * w, y = rand(i + 40) * h, l = 20 + rand(i + 80) * 50;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (rand(i + 9) - 0.5) * 12); g.stroke();
    }
    laneMarks(g, w, h, '#3a6f95');
  });
}
function paintWood(THREE) {
  return canvasTex(THREE, 512, 64, (g, w, h) => {
    g.fillStyle = '#d9a066'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a86b3c'; g.lineWidth = 2;
    for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let i = 0; i < 16; i++) { const x = rand(i) * w, y = Math.floor(rand(i + 3) * 4) * 16; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); }
    laneMarks(g, w, h, '#5a3416');
  });
}
function paintCarpet(THREE) {
  return canvasTex(THREE, 512, 64, (g, w, h) => {
    g.fillStyle = '#b5485d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = rand(i + 500) > 0.5 ? '#c95a70' : '#9c3a4f';
      g.fillRect(rand(i) * w, rand(i + 2000) * h, 2, 2);
    }
    laneMarks(g, w, h, '#ffe5ec');
  });
}
function paintSand(THREE) {
  return canvasTex(THREE, 256, 128, (g, w, h) => {
    g.fillStyle = '#ecd9a8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.fillStyle = rand(i + 7) > 0.5 ? '#dcc58c' : '#f6e8c3'; g.fillRect(rand(i) * w, rand(i + 900) * h, 2, 2); }
  });
}
