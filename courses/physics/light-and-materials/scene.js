// How we see: a torch in a dark room. Its beam is drawn as a straight ray; it lights a teddy, bounces
// into a child's eyes, passes (or not) through holes, glass, tracing paper and wood, and off mirrors.
const BY = 0.8;                 // beam height
const WALL_X = 3.6, BACK_Z = -3; // right wall (screen) and back wall
const HOLE = 0.09;              // hole radius in the cards
const TEDDY0 = [1.2, 0, 0];     // teddy for steps 1-2
const MIRROR4 = [1.2, BY, 0];   // mirror for step 5
const STAR = [1.2, BY, BACK_Z + 0.02];

export default function setup({ THREE, scene, kit, ui, label, view, invalidate }) {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  scene.background = new THREE.Color(0x0e1220);
  const hemi = new THREE.HemisphereLight(0xb8c8ef, 0x3a3028, 0.5);
  scene.add(hemi);

  // Room: floor, back wall and right wall.
  const floor = kit.mesh(new THREE.PlaneGeometry(12, 9), kit.mat(0x8a7560), [-0.5, 0, 0], scene);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallMat = kit.mat(0xe6e1d6, { roughness: 0.95 });
  const back = kit.mesh(new THREE.PlaneGeometry(9, 2.8), wallMat, [-0.9, 1.4, BACK_Z], scene);
  back.castShadow = false;
  const right = kit.mesh(new THREE.PlaneGeometry(6, 2.8), wallMat, [WALL_X, 1.4, 0], scene);
  right.rotation.y = -Math.PI / 2; right.castShadow = false;

  // Torch on a little stand. Its local +x is the way it points.
  const torch = new THREE.Group();
  scene.add(torch);
  const torchMat = kit.mat(0x2b59c3, { roughness: 0.4 });
  const body = kit.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 16), torchMat, [-0.05, 0, 0], torch);
  body.rotation.z = -Math.PI / 2;
  const head = kit.mesh(new THREE.CylinderGeometry(0.11, 0.075, 0.14, 16), torchMat, [0.24, 0, 0], torch);
  head.rotation.z = -Math.PI / 2;
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2a8, emissiveIntensity: 0 });
  const lens = kit.mesh(new THREE.CircleGeometry(0.1, 20), lensMat, [0.312, 0, 0], torch);
  lens.rotation.y = Math.PI / 2;
  kit.mesh(new THREE.BoxGeometry(0.08, 0.03, 0.05), kit.mat(0xe63946), [-0.05, 0.075, 0], torch);
  kit.mesh(new THREE.CylinderGeometry(0.05, 0.12, BY - 0.07, 12), kit.mat(0x555b6e), [-0.05, -(BY - 0.07) / 2 - 0.07, 0], torch);
  const spot = new THREE.SpotLight(0xfff4d6, 0, 0, 0.3, 0.45, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.camera.near = 0.1; spot.shadow.camera.far = 14;
  spot.shadow.bias = -0.0005;
  scene.add(spot, spot.target);
  const lensPos = V();
  function aimTorch(x, z, dx, dz) {
    torch.position.set(x, BY, z);
    torch.rotation.y = Math.atan2(-dz, dx);
    lensPos.set(x + 0.32 * dx, BY, z + 0.32 * dz);
    spot.position.copy(lensPos);
    spot.target.position.set(x + dx * 5, BY, z + dz * 5);
  }
  function torchOn(on) {
    st.on = on;
    spot.intensity = on ? 9 : 0;
    lensMat.emissiveIntensity = on ? 1.5 : 0;
    hemi.intensity = on ? 0.55 : 0.35;
  }

  // Teddy bear.
  const teddy = new THREE.Group();
  scene.add(teddy);
  const fur = kit.mat(0xb5743a, { roughness: 1 }), pale = kit.mat(0xe8c39e, { roughness: 1 }), dark = kit.mat(0x1e1e1e);
  kit.mesh(new THREE.SphereGeometry(0.3, 24, 16), fur, [0, 0.33, 0], teddy).scale.set(1, 1.1, 0.9);
  kit.mesh(new THREE.SphereGeometry(0.22, 24, 16), fur, [0, 0.78, 0], teddy);
  for (const s of [-1, 1]) {
    kit.mesh(new THREE.SphereGeometry(0.08, 12, 8), fur, [s * 0.16, 0.96, 0], teddy);
    kit.mesh(new THREE.SphereGeometry(0.1, 12, 8), fur, [s * 0.3, 0.42, 0.05], teddy);
    kit.mesh(new THREE.SphereGeometry(0.11, 12, 8), fur, [s * 0.16, 0.08, 0.12], teddy);
    kit.mesh(new THREE.SphereGeometry(0.03, 8, 6), dark, [s * 0.08, 0.83, 0.19], teddy);
  }
  kit.mesh(new THREE.SphereGeometry(0.09, 12, 8), pale, [0, 0.74, 0.17], teddy);
  kit.mesh(new THREE.SphereGeometry(0.03, 8, 6), dark, [0, 0.77, 0.26], teddy);
  kit.mesh(new THREE.SphereGeometry(0.17, 16, 12), pale, [0, 0.33, 0.16], teddy).scale.set(1, 1.1, 0.5);

  // Child: turns to look at a point; eyelids close the eyes.
  const kid = new THREE.Group();
  scene.add(kid);
  const skinTone = kit.mat(0xf1c27d, { roughness: 0.8 });
  kit.mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.0, 16), kit.mat(0xf4a261), [0, 0.85, 0], kid);
  for (const x of [-0.11, 0.11]) kit.mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.36, 8), kit.mat(0x264653), [x, 0.18, 0], kid);
  kit.mesh(new THREE.SphereGeometry(0.3, 24, 16), skinTone, [0, 1.62, 0], kid);
  const hair = kit.mesh(new THREE.SphereGeometry(0.315, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), kit.mat(0x2b2118), [0, 1.63, -0.02], kid);
  hair.rotation.x = -0.25;
  const lids = [];
  for (const x of [-0.1, 0.1]) {
    kit.mesh(new THREE.SphereGeometry(0.045, 10, 8), kit.mat(0xffffff), [x, 1.67, 0.26], kid);
    kit.mesh(new THREE.SphereGeometry(0.025, 8, 6), dark, [x, 1.67, 0.3], kid);
    lids.push(kit.mesh(new THREE.SphereGeometry(0.05, 10, 8), skinTone, [x, 1.67, 0.265], kid));
  }
  const eyeAnchor = new THREE.Object3D();
  eyeAnchor.position.set(0, 1.67, 0.3);
  kid.add(eyeAnchor);
  const eyePos = V();
  function placeKid(x, z, lookX, lookZ) {
    kid.position.set(x, 0, z);
    kid.lookAt(lookX, 0, lookZ);
    kid.updateMatrixWorld(true);
    eyeAnchor.getWorldPosition(eyePos);
  }
  const eyes = open => { st.eyes = open; lids.forEach(l => { l.visible = !open; }); };

  // Three cards with holes (step 3). Shape in the card's own plane, then stood up facing the torch.
  const shape = new THREE.Shape();
  shape.moveTo(-0.6, 0); shape.lineTo(0.6, 0); shape.lineTo(0.6, 1.4); shape.lineTo(-0.6, 1.4); shape.lineTo(-0.6, 0);
  const hole = new THREE.Path();
  hole.absarc(0, BY, HOLE, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const cardGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false, curveSegments: 20 });
  cardGeo.rotateY(Math.PI / 2);
  const cards = [-1.6, 0, 1.6].map((x, i) => {
    const g = new THREE.Group();
    g.position.set(x - 0.02, 0, 0);
    scene.add(g);
    kit.mesh(cardGeo, kit.mat([0xe76f51, 0x2a9d8f, 0xe9c46a][i], { roughness: 0.9 }), [0, 0, 0], g);
    kit.mesh(new THREE.BoxGeometry(0.3, 0.06, 0.5), kit.mat(0x555b6e), [0.02, 0.03, 0], g);
    return g;
  });

  // A sheet in a stand (step 4): glass, tracing paper or wood.
  const sheet = new THREE.Group();
  sheet.position.set(0, 0, 0);
  scene.add(sheet);
  kit.mesh(new THREE.BoxGeometry(0.3, 0.12, 1.3), kit.mat(0x555b6e), [0, 0.06, 0], sheet);
  const sheetGeo = new THREE.BoxGeometry(0.03, 1.25, 1.2);
  const mats = {
    glass: new THREE.MeshStandardMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }),
    paper: new THREE.MeshStandardMaterial({ color: 0xfbf7ea, transparent: true, opacity: 0.88, roughness: 1, emissive: 0xfff0c0, emissiveIntensity: 0.35 }),
    wood: kit.mat(0xffffff, { map: woodTexture(THREE) }),
  };
  const pane = kit.mesh(sheetGeo, mats.glass, [0, 0.12 + 0.625, 0], sheet);

  // Mirror on a stand. Its face (local +z) is turned with rotation.y.
  const mirror = new THREE.Group();
  scene.add(mirror);
  const glassFace = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0xd6ecff, metalness: 0.9, roughness: 0.05, emissive: 0x4a6a8a, emissiveIntensity: 0.6 }));
  glassFace.position.z = 0.026;
  mirror.add(glassFace);
  kit.mesh(new THREE.BoxGeometry(1.0, 1.0, 0.05), kit.mat(0x6d4c41), [0, 0, 0], mirror);
  const mirrorLeg = kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), kit.mat(0x555b6e), [0, -0.5, -0.04], mirror);

  // Star target on the back wall.
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.13 : 0.3;
    i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffc300, emissive: 0xffb000, emissiveIntensity: 0.1 });
  const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape), starMat);
  star.position.set(...STAR);
  scene.add(star);

  // Wall between the child and the teddy (step 6).
  const partition = kit.mesh(new THREE.BoxGeometry(0.15, 1.9, 2.5), kit.mat(0x6c7a99), [0, 0.95, 1.85], scene);

  // Light drawn as rays: a few reusable beam pieces, a glowing spot and moving dots.
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
  beamGeo.translate(0, 0.5, 0);
  const segs = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; m.renderOrder = 3;
    scene.add(m); segs.push(m);
  }
  const UP = V(0, 1, 0), tmp = V();
  let nSeg = 0;
  function seg(a, b, w = 0.05, op = 0.5, color = 0xfff1a8) {
    const m = segs[nSeg++];
    tmp.subVectors(b, a);
    const len = tmp.length();
    m.position.copy(a);
    m.quaternion.setFromUnitVectors(UP, tmp.multiplyScalar(1 / len));
    m.scale.set(w, len, w);
    m.material.opacity = op; m.material.color.setHex(color);
    m.visible = true;
  }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.renderOrder = 4;
  scene.add(glow);
  function glowAt(p, onBack, r, op) {
    glow.visible = true;
    glow.position.copy(p);
    if (onBack) { glow.position.z = BACK_Z + 0.015; glow.rotation.set(0, 0, 0); }
    else { glow.position.x = WALL_X - 0.015; glow.rotation.set(0, -Math.PI / 2, 0); }
    glow.scale.setScalar(r); glow.material.opacity = op;
  }
  const DOTS = 12;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe066 }), DOTS);
  dots.renderOrder = 5;
  scene.add(dots);
  const path = [V(), V(), V(), V()], pathCut = [0, 0, 0];
  let pathN = 0, pathLen = 0;
  const dummy = new THREE.Object3D();
  function setPath(...pts) {
    pathN = pts.length; pathLen = 0;
    pts.forEach((p, i) => { path[i].copy(p); if (i) { pathCut[i - 1] = path[i].distanceTo(path[i - 1]); pathLen += pathCut[i - 1]; } });
  }
  function moveDots(t) {
    for (let j = 0; j < DOTS; j++) {
      let d = ((t * 1.3 + (j * pathLen) / DOTS) % pathLen), i = 0;
      while (i < pathN - 2 && d > pathCut[i]) { d -= pathCut[i]; i++; }
      dummy.position.lerpVectors(path[i], path[i + 1], Math.min(1, d / pathCut[i]));
      dummy.updateMatrix();
      dots.setMatrixAt(j, dummy.matrix);
    }
    dots.instanceMatrix.needsUpdate = true;
  }

  // Labels.
  const tags = {
    torch: label('Torch', V(-3.3, BY + 0.15, 0), { cls: 'warm' }),
    teddy: label('Teddy', V(TEDDY0[0], 1.08, 0)),
    kid: label('', eyeAnchor, { cls: 'warm' }),
    spot: label('', V(WALL_X - 0.05, BY + 0.45, 0), { cls: 'warm' }),
    sheet: label('', V(0, 1.45, 0), { cls: 'cool' }),
    mirror: label('Mirror', V(MIRROR4[0] + 0.3, BY + 0.55, MIRROR4[2] + 0.2), { cls: 'cool' }),
    star: label('Star', V(STAR[0] - 0.55, BY + 0.2, STAR[2])),
    wall: label('Wall', V(0, 1.95, 2.6)),
  };

  const st = { step: 0, time: 0, quiz: false, on: false, eyes: true, auto: true, card: 0.35, mat: 'glass', angle: 30, mirrorOn: false, input: null };
  const p0 = V(), p1 = V(), p2 = V(), p3 = V(), T5 = V(1.8, BY + 0.05, 1.5);
  let said = '';
  const say = html => { if (html !== said) { said = html; ui.readout(html); } };

  function setMat(m) {
    st.mat = m;
    pane.material = mats[m];
    pane.castShadow = m !== 'glass';
    tags.sheet.text = { glass: 'Glass', paper: 'Tracing paper', wood: 'Wood' }[m];
    tags.spot.text = { glass: 'Bright spot', paper: 'Dim glow', wood: 'Shadow' }[m];
    ui.readout({
      glass: 'Glass is <b>transparent</b>: almost all the light goes straight through.',
      paper: 'Tracing paper is <b>translucent</b>: some light gets through, but it is spread out and dim.',
      wood: 'Wood is <b>opaque</b>: no light gets through, so there is a <b>shadow</b> behind it.',
    }[m]);
  }

  // Where the light goes in each step. Called whenever something changes.
  function lightRays() {
    nSeg = 0; glow.visible = false; dots.visible = false;
    for (const t of [tags.kid]) t.show(false);
    const s = st.step;
    if (st.on) {
      if (s === 0 || s === 1 || st.quiz) {
        p1.set(TEDDY0[0] - 0.2, BY, 0);
        seg(lensPos, p1, 0.06, 0.45);
        if (s === 1 && !st.quiz) {
          tags.kid.show(true);
          tags.kid.text = st.eyes ? 'I see the teddy!' : "Can't see it";
          p2.set(TEDDY0[0] - 0.1, BY + 0.05, 0.12);
          seg(p2, eyePos, 0.035, st.eyes ? 0.4 : 0.25, 0xffd27a);
          setPath(lensPos, p1, p2, eyePos);
          dots.visible = true;
        }
      }
      if (s === 2) {
        const through = Math.abs(st.card) < HOLE - 0.03;
        p1.set(through ? WALL_X : -0.02, BY, 0);
        seg(lensPos, p1, 0.04, 0.6);
        if (through) glowAt(p1, false, 0.2, 0.9);
        tags.spot.show(through);
        tags.spot.text = 'Light spot';
        say(through ? 'All three holes are in a <b>straight line</b>, so the light reaches the wall.' : 'The middle hole is <b>out of line</b>, so the card stops the light.');
      }
      if (s === 3) {
        p1.set(-0.02, BY, 0);
        seg(lensPos, p1, 0.06, 0.5);
        p2.set(0.02, BY, 0); p3.set(WALL_X, BY, 0);
        if (st.mat === 'glass') { seg(p2, p3, 0.06, 0.45); glowAt(p3, false, 0.3, 0.85); }
        if (st.mat === 'paper') { seg(p2, p3, 0.28, 0.08); glowAt(p3, false, 0.65, 0.22); }
        tags.spot.show(true);
      }
      if (s === 4) {
        p1.set(...MIRROR4);
        seg(lensPos, p1, 0.05, 0.55);
        const a = (st.angle * Math.PI) / 180, rx = -Math.cos(2 * a), rz = -Math.sin(2 * a);
        let t = (MIRROR4[2] - BACK_Z) / -rz, onBack = true;
        if (rx > 0 && MIRROR4[0] + rx * t > WALL_X) { t = (WALL_X - MIRROR4[0]) / rx; onBack = false; }
        p2.set(MIRROR4[0] + rx * t, BY, MIRROR4[2] + rz * t);
        seg(p1, p2, 0.05, 0.55);
        glowAt(p2, onBack, 0.18, 0.9);
        const hit = onBack && Math.abs(p2.x - STAR[0]) < 0.22;
        starMat.emissiveIntensity = hit ? 1.4 : 0.1;
        tags.star.text = hit ? 'Hit the star!' : 'Star';
        say(hit ? 'The mirror bounces the light <b>straight onto the star</b>!' : `The light bounces off the mirror and lands to the <b>${p2.x < STAR[0] ? 'left' : 'right'}</b> of the star.`);
      }
    }
    if (s === 5 && !st.quiz) {
      // Light from the lit teddy toward the child: blocked by the wall, or bounced by the mirror.
      const T = T5;
      tags.kid.show(true);
      seg(lensPos, p0.set(2.05, BY, 1.5), 0.05, 0.45);
      if (st.mirrorOn) {
        // Bounce point: where the line to the eye's mirror image crosses the mirror (z = -1.2).
        const mz = -1.2, img = p3.set(eyePos.x, eyePos.y, 2 * mz - eyePos.z), u = (T.z - mz) / (T.z - img.z);
        p1.lerpVectors(T, img, u);
        seg(T, p1, 0.035, 0.45, 0xffd27a);
        seg(p1, eyePos, 0.035, 0.45, 0xffd27a);
        setPath(T, p1, eyePos);
        dots.visible = true;
        tags.kid.text = 'I see the teddy!';
        say('The teddy\'s light bounces off the <b>mirror</b> and into the child\'s eyes.');
      } else {
        p1.set(0.09, kit.lerp(T.y, eyePos.y, (T.x - 0.09) / (T.x - eyePos.x)), kit.lerp(T.z, eyePos.z, (T.x - 0.09) / (T.x - eyePos.x)));
        seg(T, p1, 0.035, 0.45, 0xffd27a);
        setPath(T, p1);
        dots.visible = true;
        tags.kid.text = "Can't see the teddy";
        say('The <b>wall</b> stops the teddy\'s light, so it cannot reach the child\'s eyes.');
      }
    }
    for (let i = nSeg; i < segs.length; i++) segs[i].visible = false;
  }

  function setMirror5(on) {
    st.mirrorOn = on;
    mirror.visible = on;
    placeKid(-2, 1.5, on ? 0 : 1.8, on ? -1.2 : 1.5);
    lightRays();
  }

  const views = {
    room: { radius: 2.6, yaw: 0.12, pitch: 0.32, target: [-0.9, 0.8, -0.5] },
    cards: { radius: 2.7, yaw: -0.55, pitch: 0.22, target: [0.2, 0.8, 0] },
    sheet: { radius: 2.6, yaw: -0.6, pitch: 0.2, target: [0.6, 0.8, 0] },
    mirror: { radius: 2.5, yaw: -0.25, pitch: 0.4, target: [0.1, 0.8, -1.1] },
    corner: { radius: 2.9, yaw: 0.05, pitch: 0.62, target: [0, 0.8, 0.3] },
  };

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      Object.assign(st, { step: i, quiz: isQuiz, time: 0, auto: true, input: null });
      said = '';
      for (const t of Object.values(tags)) t.show(false);
      teddy.visible = i <= 1 || i === 5 || isQuiz;
      kid.visible = i <= 1 || i === 5 || isQuiz;
      cards.forEach(c => { c.visible = i === 2; });
      sheet.visible = i === 3;
      mirror.visible = i === 4;
      star.visible = i === 4;
      partition.visible = i === 5;
      starMat.emissiveIntensity = 0.1;
      eyes(true);
      aimTorch(-3.3, 0, 1, 0);
      teddy.position.set(...TEDDY0); teddy.rotation.y = -0.9;
      placeKid(-1.0, -1.7, TEDDY0[0], TEDDY0[2]);
      spot.angle = i === 4 ? 0.1 : 0.3;
      mirror.position.set(...MIRROR4); mirrorLeg.visible = true;
      if (i === 0) {
        go(views.room); torchOn(false);
        tags.torch.show(true); tags.teddy.show(true);
        st.input = ui.toggle({ label: 'Torch on', value: false, onChange: v => { invalidate(); st.auto = false; torchOn(v); lightRays(); ui.readout(v ? 'Torch <b>on</b>: light shines on the teddy, so we can see it.' : 'Torch <b>off</b>: it is dark, so the teddy is hard to see.'); } });
        ui.readout('Torch <b>off</b>: it is dark, so the teddy is hard to see.');
      }
      if (i === 1) {
        go(views.room); torchOn(true);
        tags.teddy.show(true);
        ui.toggle({ label: 'Eyes open', value: true, onChange: v => { invalidate(); eyes(v); lightRays(); ui.readout(v ? 'Eyes <b>open</b>: light from the teddy gets in, so the child sees it.' : 'Eyes <b>shut</b>: the light cannot get in, so the child sees nothing.'); } });
        ui.readout('Eyes <b>open</b>: light from the teddy gets in, so the child sees it.');
      }
      if (i === 2) {
        go(views.cards); torchOn(true); st.card = 0.35;
        st.input = ui.slider({ label: 'Slide the middle card', min: -0.5, max: 0.5, step: 0.01, value: 0.35, format: v => (Math.abs(v) < HOLE - 0.03 ? 'in line' : 'out of line'), onInput: v => { invalidate(); st.auto = false; st.card = v; } });
      }
      if (i === 3) {
        go(views.sheet); torchOn(true);
        tags.sheet.show(true);
        ui.buttons([
          { label: 'Glass', on: true, onClick: () => { invalidate(); st.auto = false; setMat('glass'); lightRays(); } },
          { label: 'Tracing paper', onClick: () => { invalidate(); st.auto = false; setMat('paper'); lightRays(); } },
          { label: 'Wood', onClick: () => { invalidate(); st.auto = false; setMat('wood'); lightRays(); } },
        ]);
        setMat('glass');
      }
      if (i === 4) {
        go(views.mirror); torchOn(true); st.angle = 30;
        tags.mirror.show(true); tags.star.show(true);
        st.input = ui.slider({ label: 'Turn the mirror', min: 25, max: 65, step: 1, value: 30, format: v => `${v}°`, onInput: v => { invalidate(); st.auto = false; st.angle = v; } });
      }
      if (i === 5) {
        go(views.corner); torchOn(true);
        aimTorch(3.3, 1.5, -1, 0);
        teddy.position.set(1.8, 0, 1.5); teddy.rotation.y = -Math.PI / 2;
        mirror.position.set(0, 1.2, -1.2); mirror.rotation.y = 0; mirrorLeg.visible = false;
        tags.wall.show(true);
        st.input = ui.toggle({ label: 'Add a mirror', value: false, onChange: v => { invalidate(); st.auto = false; setMirror5(v); } });
        setMirror5(false);
      }
      if (isQuiz) {
        go({ radius: 3, yaw: 0.3, pitch: 0.38, target: [-0.9, 0.7, -0.5] }); torchOn(true);
        tags.torch.show(true); tags.teddy.show(true);
      }
      lightRays();
    },

    update(dt) {
      st.time += dt;
      const s = st.step, t = st.time;
      let busy = dots.visible;
      if (!st.quiz && st.auto) {
        // Each step shows its idea by itself until the learner takes over.
        if (s === 0 && !st.on && t > 1.0) { torchOn(true); if (st.input) st.input.checked = true; ui.readout('Torch <b>on</b>: light shines on the teddy, so we can see it.'); lightRays(); }
        if (s === 2) { st.card = 0.35 * (1 - kit.ease(kit.clamp((t - 0.6) / 1.4, 0, 1))); if (st.input) st.input.set(st.card); busy = busy || t < 2.1; }
        if (s === 3 && t > 1.4 && t < 4.4) { const m = t < 2.9 ? 'paper' : 'wood'; if (m !== st.mat) setMat(m); }
        if (s === 4) { st.angle = Math.round(30 + 15 * kit.ease(kit.clamp((t - 0.6) / 1.4, 0, 1))); if (st.input) st.input.set(st.angle); busy = busy || t < 2.1; }
        if (s === 5 && !st.mirrorOn && t > 1.6) { setMirror5(true); if (st.input) st.input.checked = true; }
      }
      if (s === 2) cards[1].position.z = st.card;
      if (s === 4) { const a = (st.angle * Math.PI) / 180; mirror.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); }
      if (s === 2 || s === 3 || s === 4) lightRays();
      if (dots.visible) moveDots(t);
      return busy || (st.auto && t < 5);
    },
  };
}

function woodTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#b07a45'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#8c5a2b'; g.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    g.beginPath();
    for (let y = 0; y <= 128; y += 8) g.lineTo(6 + i * 10.5 + Math.sin(y * 0.06 + i) * 3, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
