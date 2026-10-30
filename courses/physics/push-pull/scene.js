// Pushes and pulls: a toy cart and a ball on a numbered play mat. A push or pull (big arrow) starts,
// stops or turns them; rolling friction slows them down so a bigger push rolls farther.
const FR_CART = 1.0;  // speed lost each second by the rolling cart (gentle, so children can follow)
const FR_BALL = 0.5;  // a ball rolls more easily
const G = 6;          // gentle gravity for the ramp
const RAMP_L = 2.8, RAMP_START = 0.45;
const RAMPS = { low: 12, high: 26 }; // ramp angles in degrees
const BALL_R = 0.25, WALL_X = 7.05;
const START = -0.5;   // centre of the start square

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const ground = kit.stage(scene, { ground: 0xcfe8c4, sky: 0xe3f2ff, radius: 18 });
  // Push the big ground disc back in depth so flat things lying on it (mats, lanes) never flicker through.
  Object.assign(ground.material, { polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 });
  kit.lights(scene, { sun: [3, 10, 6] });

  // Play mat with a start square and numbered squares (1 square = 1 unit).
  const matMesh = kit.mesh(new THREE.PlaneGeometry(10, 1.4), new THREE.MeshStandardMaterial({ map: paintMat(THREE), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [4, 0.02, 0], scene);
  matMesh.rotation.x = -Math.PI / 2;
  matMesh.castShadow = false;

  // The toy cart: red body, four wheels with a spoke so you can see them turn.
  const cart = new THREE.Group();
  scene.add(cart);
  kit.mesh(new THREE.BoxGeometry(0.8, 0.3, 0.55), kit.mat(0xe63946, { roughness: 0.45 }), [0, 0.3, 0], cart);
  kit.mesh(new THREE.BoxGeometry(0.84, 0.05, 0.59), kit.mat(0xffbe0b), [0, 0.47, 0], cart);
  const wheels = [];
  const tyre = kit.mat(0x2b2d42), spoke = kit.mat(0xffd166);
  for (const [x, z] of [[-0.26, 0.3], [0.26, 0.3], [-0.26, -0.3], [0.26, -0.3]]) {
    const w = kit.mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), tyre, [x, 0.13, z], cart);
    w.rotation.x = Math.PI / 2;
    kit.mesh(new THREE.BoxGeometry(0.22, 0.09, 0.05), spoke, [0, 0, 0], w);
    wheels.push(w);
  }
  const cartTag = label('Cart', new THREE.Vector3());
  cart.add(cartTag.at = new THREE.Object3D());
  cartTag.at.position.y = 0.75;

  // "You": a simple toy figure standing at the start of the mat.
  const you = new THREE.Group();
  you.position.set(-1.9, 0, 0);
  scene.add(you);
  kit.mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.7, 16), kit.mat(0x3a86ff), [0, 0.35, 0], you);
  kit.mesh(new THREE.SphereGeometry(0.17, 20, 14), kit.mat(0xf1c27d), [0, 0.88, 0], you);
  const arm = kit.mesh(new THREE.BoxGeometry(0.4, 0.07, 0.07), kit.mat(0x3a86ff), [0.28, 0.5, 0], you);
  arm.rotation.z = -0.15;
  const youTag = label('You', new THREE.Vector3(-1.9, 1.15, 0), { cls: 'warm' });

  // String for pulling (from the figure's hand to the back of the cart).
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), new THREE.MeshBasicMaterial({ color: 0x6b4226 }));
  scene.add(string);

  // Ball with painted stripes so you can see it roll.
  const ball = kit.mesh(new THREE.SphereGeometry(BALL_R, 24, 16), kit.mat(0xffffff, { map: paintBall(THREE), roughness: 0.4 }), [0, BALL_R, 0], scene);
  const ballTag = label('Ball', new THREE.Vector3());
  const ballAnchor = new THREE.Object3D();
  scene.add(ballAnchor);
  ballTag.at = ballAnchor;

  // Wall for the bounce step.
  const wall = kit.mesh(new THREE.BoxGeometry(0.3, 0.8, 1.8), kit.mat(0xb5838d), [WALL_X + 0.15, 0.4, 0], scene);
  const wallTag = label('Wall', new THREE.Vector3(WALL_X + 0.15, 1.0, 0));

  // Ramp: a wooden plank on a block. The plank's low end touches the mat at x = 0.
  const ramp = new THREE.Group();
  scene.add(ramp);
  const plankPivot = new THREE.Group();
  ramp.add(plankPivot);
  kit.mesh(new THREE.BoxGeometry(RAMP_L, 0.08, 0.8), kit.mat(0xc98f55), [-RAMP_L / 2, 0.04, 0], plankPivot);
  const block = kit.mesh(new THREE.BoxGeometry(0.4, 1, 0.8), kit.mat(0x8ecae6), [0, 0.5, 0], ramp);
  const rampTag = label('Ramp', new THREE.Vector3());
  const rampAnchor = new THREE.Object3D();
  ramp.add(rampAnchor);
  rampTag.at = rampAnchor;

  // Flags that mark where the cart stopped.
  const flags = [0xff006e, 0x3a86ff].map(color => {
    const f = new THREE.Group();
    kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), kit.mat(0x555555), [0, 0.45, 0], f);
    kit.mesh(new THREE.BoxGeometry(0.32, 0.2, 0.02), kit.mat(color), [0.17, 0.78, 0], f);
    scene.add(f);
    const a = new THREE.Object3D();
    a.position.y = 0.95;
    f.add(a);
    f.tag = label('', a);
    return f;
  });

  // Dots that trace the ball's path (one shared geometry and material, made once).
  const dotGeo = new THREE.CircleGeometry(0.045, 10), dotMat = new THREE.MeshBasicMaterial({ color: 0x6a4c93 });
  const dots = [];
  for (let i = 0; i < 60; i++) {
    const d = new THREE.Mesh(dotGeo, dotMat);
    d.rotation.x = -Math.PI / 2;
    d.visible = false;
    scene.add(d);
    dots.push(d);
  }

  // Big force arrows, drawn flat and level. set(x, y, z, dx, dz, len): tail at (x, y, z), pointing along (dx, dz).
  function makeArrow(color) {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color, transparent: true });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 10), m);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 14), m);
    shaft.rotation.z = head.rotation.z = -Math.PI / 2;
    g.add(shaft, head);
    const tip = new THREE.Object3D();
    g.add(tip);
    g.visible = false;
    scene.add(g);
    g.tag = label('', tip, { cls: 'warm' });
    g.tag.show(false);
    g.life = 0;
    g.set = (x, y, z, dx, dz, len) => {
      g.position.set(x, y, z);
      g.rotation.set(0, Math.atan2(-dz, dx), 0);
      shaft.scale.y = len; shaft.position.x = len / 2;
      head.position.x = len + 0.15;
      tip.position.set(len / 2, 0.22, 0);
    };
    g.fire = (text, life) => { g.tag.text = text; g.life = life; g.visible = true; m.opacity = 1; g.tag.show(true); };
    g.tick = dt => {
      if (g.life <= 0) return false;
      g.life -= dt;
      m.opacity = kit.clamp(g.life / 0.4, 0, 1);
      if (g.life <= 0) { g.visible = false; g.tag.show(false); }
      return true;
    };
    g.hide = () => { g.life = 0; g.visible = false; g.tag.show(false); };
    return g;
  }
  const pushArrow = makeArrow(0xff7b00), otherArrow = makeArrow(0x7b2cbf);

  const st = { step: 0, time: 0, plan: [], quiz: false, results: {}, rampKind: 'low' };
  // Cart motion along the mat: x, speed v, and an applied push (acc for `left` seconds).
  const c = { x: START, v: 0, acc: 0, left: 0, brake: false, onRamp: false, s: 0, theta: 0, tag: null, rolled: false };
  // Ball motion on the ground: position, velocity.
  const b = { x: 3, z: 0, vx: 0, vz: 0, lastDot: 0, dotN: 0, trace: false };

  function placeCart() {
    if (c.onRamp) {
      const r = RAMP_L - c.s;
      cart.position.set(-r * Math.cos(c.theta) + 0.08 * Math.sin(c.theta), r * Math.sin(c.theta) + 0.08 * Math.cos(c.theta), 0);
      cart.rotation.z = -c.theta;
    } else {
      cart.position.set(c.x, 0, 0);
      cart.rotation.z = 0;
    }
    const roll = c.onRamp ? c.s : c.x;
    for (const w of wheels) w.rotation.y = -roll / 0.13;
    string.visible = st.pulling > 0;
    if (string.visible) {
      const x1 = -1.62, y1 = 0.46, x2 = c.x - 0.4, y2 = 0.3, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      string.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
      string.rotation.z = Math.atan2(-dx, dy);
      string.scale.y = len;
    }
  }
  function resetCart(x = START) { Object.assign(c, { x, v: 0, acc: 0, left: 0, brake: false, onRamp: false, rolled: false, held: false }); st.pulling = 0; placeCart(); }

  // A push or pull that gives the cart speed `speed` (+ right, - left) over 0.3 s.
  function shove(speed, text, len) {
    c.acc = speed / 0.3; c.left = 0.3; c.brake = false; c.rolled = true;
    const dir = Math.sign(speed);
    if (text === 'Pull') {
      st.pulling = 0.9;
      otherArrow.set(c.x + 0.35, 0.8, 0, -1, 0, len);
      otherArrow.fire('Pull', 1.3);
    } else {
      pushArrow.set(dir > 0 ? c.x - 0.45 - len - 0.34 : c.x + 0.45 + len + 0.34, 0.3, 0, dir, 0, len);
      pushArrow.fire(text, 1.3);
    }
  }
  function stopPush() {
    if (Math.abs(c.v) < 0.05) return;
    const dir = -Math.sign(c.v), len = 0.9;
    c.acc = dir * 9; c.left = 0.5; c.brake = true;
    pushArrow.set(dir < 0 ? c.x + 0.45 + len + 0.34 : c.x - 0.45 - len - 0.34, 0.3, 0, dir, 0, len);
    pushArrow.fire('Stop push', 1.4);
  }
  function setRamp(kind) {
    st.rampKind = kind;
    c.theta = (RAMPS[kind] * Math.PI) / 180;
    plankPivot.rotation.z = -c.theta;
    const top = RAMP_L * Math.sin(c.theta);
    block.scale.y = top;
    block.position.set(-RAMP_L * Math.cos(c.theta) + 0.25, top / 2, 0);
    rampAnchor.position.set(-RAMP_L * Math.cos(c.theta) * 0.5, top * 0.5 + 0.35, 0.5);
    Object.assign(c, { onRamp: true, s: RAMP_START, v: 0, acc: 0, left: 0, brake: false, rolled: true, held: true });
    placeCart();
  }
  function letGo() { c.held = false; }

  function resetBall(x, z) {
    Object.assign(b, { x, z, vx: 0, vz: 0, lastDot: 0, dotN: 0 });
    for (const d of dots) d.visible = false;
    placeBall(0, 0);
  }
  const axis = new THREE.Vector3();
  function placeBall(dx, dz) {
    ball.position.set(b.x, BALL_R, b.z);
    ballAnchor.position.set(b.x, BALL_R * 2 + 0.25, b.z);
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) { axis.set(dz / d, 0, -dx / d); ball.rotateOnWorldAxis(axis, d / BALL_R); }
  }
  function rollBall(speed) {
    resetBall(st.step === 3 ? 3 : 0, st.step === 3 ? 0 : 0.6);
    b.vx = speed;
    pushArrow.set(b.x - BALL_R - 0.8 - 0.34, BALL_R, b.z, 1, 0, 0.8);
    pushArrow.fire('Push', 1.0);
  }
  function sidePush() {
    if (Math.hypot(b.vx, b.vz) < 0.1) return;
    b.vz -= 1.8;
    otherArrow.set(b.x, BALL_R, b.z + BALL_R + 0.9 + 0.34, 0, -1, 0.9);
    otherArrow.fire('Side push', 1.4);
  }

  // Record where the cart stopped: flag + readout.
  function cartStopped() {
    c.rolled = false;
    const key = st.step === 1 ? st.pushKind : st.step === 5 ? st.rampKind : null;
    if (!key) return;
    const from = st.step === 1 ? START : 0, d = Math.max(0, c.x - from);
    const n = Math.max(1, Math.round(d));
    st.results[key] = n;
    const f = flags[key === 'small' || key === 'low' ? 0 : 1];
    f.visible = true; f.position.set(c.x, 0, -0.55);
    f.tag.text = { small: 'Small push', big: 'Big push', low: 'Low ramp', high: 'High ramp' }[key];
    f.tag.show(true);
    const r = st.results, lines = [];
    if (st.step === 1) {
      if (r.small) lines.push(`Small push: about <b>${r.small} square${r.small > 1 ? 's' : ''}</b>`);
      if (r.big) lines.push(`Big push: about <b>${r.big} squares</b>`);
    } else {
      if (r.low) lines.push(`Low ramp: about <b>${r.low} square${r.low > 1 ? 's' : ''}</b> on the mat`);
      if (r.high) lines.push(`High ramp: about <b>${r.high} squares</b> on the mat`);
    }
    ui.readout(lines.join('<br>'));
  }

  function hideAll() {
    cart.visible = ball.visible = wall.visible = ramp.visible = you.visible = false;
    for (const f of flags) { f.visible = false; f.tag.show(false); }
    for (const d of dots) d.visible = false;
    pushArrow.hide(); otherArrow.hide();
    for (const t of [cartTag, youTag, ballTag, wallTag, rampTag]) t.show(false);
    st.pulling = 0; string.visible = false; b.trace = false;
  }

  return {
    step(i, { isQuiz }) {
      st.step = isQuiz ? -1 : i; st.quiz = isQuiz; st.time = 0; st.plan = []; st.results = {};
      hideAll();
      if (i === 0) {
        view({ radius: 3.1, yaw: 0.25, pitch: 0.3, target: [1.2, 0.45, 0] });
        cart.visible = you.visible = true; youTag.show(true);
        resetCart(2.9);
        st.plan = [[0.4, () => shove(1.6, 'Push', 0.9)], [2.2, () => shove(-1.5, 'Pull', 0.9)]];
        ui.buttons([{ label: 'Push', onClick: () => { st.plan = []; shove(1.6, 'Push', 0.9); } },
          { label: 'Pull', onClick: () => { st.plan = []; shove(-1.5, 'Pull', 0.9); } }]);
      }
      if (i === 1) {
        view({ radius: 4.6, yaw: 0.12, pitch: 0.55, target: [3.6, 0.3, 0] });
        cart.visible = true;
        resetCart();
        const push = (kind) => { st.pushKind = kind; resetCart(); shove(kind === 'small' ? 1.4 : 2.8, kind === 'small' ? 'Small push' : 'Big push', kind === 'small' ? 0.6 : 1.3); };
        st.plan = [[0.3, () => push('small')], [3.2, () => push('big')]];
        ui.buttons([{ label: 'Small push', onClick: () => { st.plan = []; push('small'); } }, { label: 'Big push', onClick: () => { st.plan = []; push('big'); } }]);
        ui.readout('Count the squares the cart rolls.');
      }
      if (i === 2) {
        view({ radius: 3.6, yaw: 0.15, pitch: 0.45, target: [2.3, 0.3, 0] });
        cart.visible = true; cartTag.show(true);
        resetCart();
        const f = flags[1];
        f.visible = true; f.position.set(START + (3.2 * 3.2) / (2 * FR_CART), 0, -0.55);
        f.tag.text = 'Stops by itself'; f.tag.show(true);
        const roll = () => { resetCart(); shove(3.2, 'Push', 1.1); };
        st.plan = [[0.2, roll], [1.2, stopPush]];
        ui.buttons([{ label: 'Roll it', onClick: () => { st.plan = []; roll(); } }, { label: 'Push to stop', onClick: () => { st.plan = []; stopPush(); } }]);
        ui.readout('With no stop push, the cart rolls on to the blue flag.');
      }
      if (i === 3) {
        view({ radius: 2.9, yaw: 0.2, pitch: 0.4, target: [5.1, 0.35, 0] });
        ball.visible = wall.visible = true; ballTag.show(true); wallTag.show(true);
        resetBall(3, 0);
        st.plan = [[0.2, () => rollBall(3.6)]];
        ui.buttons([{ label: 'Roll it gently', onClick: () => { st.plan = []; rollBall(2.5); } },
          { label: 'Roll it hard', onClick: () => { st.plan = []; rollBall(3.6); } }]);
      }
      if (i === 4) {
        view({ radius: 3.4, yaw: 0.05, pitch: 0.85, target: [2.8, 0, -0.6] });
        ball.visible = true; ballTag.show(true);
        resetBall(0, 0.6);
        b.trace = true;
        st.plan = [[0.2, () => rollBall(2.6)], [1.0, sidePush]];
        ui.buttons([{ label: 'Roll the ball', onClick: () => { st.plan = []; rollBall(2.6); } },
          { label: 'Side push', onClick: () => { st.plan = []; sidePush(); } }]);
      }
      if (i === 5) {
        view({ radius: 3.9, yaw: 0.35, pitch: 0.32, target: [1.3, 0.55, 0] });
        cart.visible = ramp.visible = true; rampTag.show(true);
        setRamp('low');
        const go = kind => { st.plan = []; setRamp(kind); st.plan = [[st.time + 0.5, letGo]]; };
        st.plan = [[0.2, letGo]];
        ui.buttons([{ label: 'Low ramp', onClick: () => go('low') }, { label: 'High ramp', onClick: () => go('high') }]);
        ui.readout('The cart lets go at the top of the ramp.');
      }
      if (isQuiz) {
        view({ radius: 4.6, yaw: -0.35, pitch: 0.4, target: [2.4, 0.3, 0] });
        cart.visible = you.visible = ball.visible = wall.visible = true;
        resetCart(1.5); resetBall(5.6, 0.35);
      }
    },

    update(dt) {
      st.time += dt;
      while (st.plan.length && st.time >= st.plan[0][0]) st.plan.shift()[1]();
      let busy = st.plan.length > 0;

      // Cart.
      if (cart.visible) {
        if (c.onRamp) {
          if (!c.held) {
            c.v += (G * Math.sin(c.theta) - 0.3) * dt;
            c.s += c.v * dt;
            if (c.s >= RAMP_L) { c.onRamp = false; c.x = 0; }
            busy = true;
          }
        } else if (c.left > 0) {
          const h = Math.min(dt, c.left);
          c.left -= h;
          const before = c.v;
          c.v += c.acc * h;
          if (c.brake && Math.sign(c.v) !== Math.sign(before)) { c.v = 0; c.left = 0; }
          busy = true;
        } else if (c.v !== 0) {
          const s = Math.sign(c.v);
          c.v -= s * FR_CART * dt;
          if (Math.sign(c.v) !== s) c.v = 0;
          busy = true;
        }
        if (!c.onRamp) {
          c.x += c.v * dt;
          if (c.x < -0.2 && c.v < 0 && st.step === 0) { c.x = -0.2; c.v = 0; c.left = 0; }
          if (c.x > 8.6) { c.x = 8.6; c.v = 0; c.left = 0; }
          if (c.rolled && c.v === 0 && c.left <= 0) cartStopped();
        }
        if (st.pulling > 0) { st.pulling -= dt; busy = true; }
        placeCart();
      }

      // Ball.
      if (ball.visible) {
        const sp = Math.hypot(b.vx, b.vz);
        if (sp > 0) {
          const ns = Math.max(0, sp - FR_BALL * dt), k = ns / sp;
          b.vx *= k; b.vz *= k;
          const dx = b.vx * dt, dz = b.vz * dt;
          b.x += dx; b.z += dz;
          if (wall.visible && b.x > WALL_X - BALL_R && b.vx > 0) {
            b.x = WALL_X - BALL_R; b.vx = -0.7 * b.vx;
            otherArrow.set(WALL_X, BALL_R + 0.05, 0.35, -1, 0, 0.8);
            otherArrow.fire('Wall pushes back', 1.6);
          }
          if (b.trace && Math.hypot(b.x - b.lx, b.z - b.lz) > 0.18 || b.trace && b.dotN === 0) {
            const d = dots[b.dotN % dots.length];
            d.position.set(b.x, 0.07, b.z); d.visible = true;
            b.dotN++; b.lx = b.x; b.lz = b.z;
          }
          placeBall(dx, dz);
          busy = true;
        }
      }

      if (pushArrow.tick(dt)) busy = true;
      if (otherArrow.tick(dt)) busy = true;
      return busy;
    },
  };
}

function canvasTex(THREE, w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Ten squares: "Start" then 1 to 9, in soft alternating colours.
function paintMat(THREE) {
  return canvasTex(THREE, 512, 72, (g, w, h) => {
    const cw = w / 10;
    for (let i = 0; i < 10; i++) {
      g.fillStyle = i === 0 ? '#8ac926' : i % 2 ? '#ffe8a3' : '#bde0fe';
      g.fillRect(i * cw, 0, cw, h);
      g.strokeStyle = '#ffffff'; g.lineWidth = 3;
      g.strokeRect(i * cw + 1.5, 1.5, cw - 3, h - 3);
      g.fillStyle = '#334155';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = i === 0 ? 'bold 15px sans-serif' : 'bold 30px sans-serif';
      g.fillText(i === 0 ? 'START' : String(i), i * cw + cw / 2, h / 2);
    }
  });
}

function paintBall(THREE) {
  return canvasTex(THREE, 256, 64, (g, w, h) => {
    const cols = ['#ff5d8f', '#ffffff', '#3a86ff', '#ffffff', '#ffbe0b', '#ffffff'];
    cols.forEach((col, i) => { g.fillStyle = col; g.fillRect((i * w) / 6, 0, w / 6 + 1, h); });
  });
}
