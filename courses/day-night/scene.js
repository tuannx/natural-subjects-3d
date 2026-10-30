// Day and night: the Sun lights one half of a spinning Earth; a little town turns into and out of the light.
const DAY = 24; // hours in one spin

export default function setup({ THREE, scene, camera, controls, kit, ui, label, view }) {
  scene.background = new THREE.Color(0x0b1430);
  scene.add(new THREE.AmbientLight(0x404a6a, 0.35));

  // Sun far to the left; one strong light from it.
  const sun = kit.mesh(new THREE.SphereGeometry(1.4, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffd34d }), [-9, 0, 0], scene);
  sun.castShadow = sun.receiveShadow = false;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.25 }));
  sun.add(glow);
  const light = new THREE.DirectionalLight(0xffffff, 3.2);
  light.position.set(-9, 0, 0);
  scene.add(light);

  // Earth with a simple painted map (deterministic, so videos look the same every time).
  const earth = new THREE.Group();
  scene.add(earth);
  const globe = kit.mesh(new THREE.SphereGeometry(2, 64, 32), new THREE.MeshStandardMaterial({ map: paintEarth(THREE), roughness: 0.9 }), [0, 0, 0], earth);
  globe.castShadow = globe.receiveShadow = false;

  // Our town: a red house on the equator, plus a viewpoint for "stand in our town".
  const town = new THREE.Group();
  town.position.set(0, 0, 2);
  earth.add(town);
  const house = kit.mesh(new THREE.BoxGeometry(0.28, 0.22, 0.22), kit.mat(0xffffff), [0, 0, 0.1], town);
  const roof = kit.mesh(new THREE.ConeGeometry(0.24, 0.18, 4), kit.mat(0xe63946), [0, 0, 0.3], town);
  roof.rotation.x = Math.PI / 2; roof.rotation.y = Math.PI / 4;
  house.rotation.x = 0;
  const townTag = label('Our town', town, { cls: 'warm' });
  label('Sun', sun, { cls: 'big warm' });

  // Stars for the background.
  const stars = new THREE.BufferGeometry();
  const pts = [];
  for (let i = 0; i < 600; i++) {
    const v = new THREE.Vector3(rand(i) - 0.5, rand(i + 99) - 0.5, rand(i + 333) - 0.5).normalize().multiplyScalar(60);
    pts.push(v.x, v.y, v.z);
  }
  stars.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 })));

  const st = { hours: 12, speed: 0, target: null, standing: false };
  const timeOfDay = h => {
    const x = ((h % 24) + 24) % 24;
    if (x >= 5.5 && x < 7) return 'Sunrise';
    if (x >= 7 && x < 17) return 'Day';
    if (x >= 17 && x < 18.5) return 'Sunset';
    return 'Night';
  };
  const show = () => {
    if (st.quiz) return;
    const tod = timeOfDay(st.hours);
    townTag.text = `Our town: ${tod.toLowerCase()}`;
    ui.readout(`In our town it is <b>${tod.toLowerCase()}</b>.`);
  };

  // "Stand in our town": put the camera just above the house, looking straight up at the sky
  // (north at the top of the screen), so the Sun is seen crossing from east to west.
  const space = new THREE.Color(0x0b1430), day = new THREE.Color(0x8ecdf5);
  const n = new THREE.Vector3(), toSun = new THREE.Vector3();
  function stand(on) {
    st.standing = on;
    controls.enabled = !on;
    if (on) { controls.minDistance = 0; controls.maxDistance = Infinity; }
    camera.fov = on ? 100 : 40;
    camera.updateProjectionMatrix();
    globe.visible = true;
    if (!on) scene.background = space;
  }
  function lookFromTown() {
    town.getWorldPosition(n); n.normalize();
    camera.position.copy(n).multiplyScalar(2.2);
    controls.target.copy(camera.position).add(n);
    toSun.copy(sun.position).sub(camera.position).normalize();
    scene.background = space.clone().lerp(day, kit.clamp(n.dot(toSun) * 4 + 0.3, 0, 1));
  }

  return {
    step(i, { isQuiz, instant }) {
      const go = o => view(o, instant);
      stand(false);
      st.quiz = isQuiz;
      if (i === 0) { st.speed = 0; st.target = 12; go({ radius: 7, yaw: 0.5, pitch: 0.25, target: [-3.5, 0, 0] }); }
      if (i === 1) {
        st.speed = 4; st.target = null;
        go({ radius: 4, yaw: 0.2, pitch: 0.35, target: [0, 0, 0] });
        ui.slider({ label: 'Spin speed', min: 0, max: 12, step: 1, value: 4, format: v => (v ? `${v} hours each second` : 'stopped'), onInput: v => { st.speed = v; } });
      }
      if (i === 2 || i === 3) {
        st.speed = 3; st.target = null;
        go({ radius: 4, yaw: 0.2, pitch: 0.35, target: [0, 0, 0] });
        ui.buttons([{ label: 'Spin', onClick: () => { st.speed = 3; } }, { label: 'Stop', onClick: () => { st.speed = 0; } }]);
      }
      if (i === 4) { st.speed = 2; st.target = null; go({ radius: 3.2, yaw: -0.3, pitch: 0.3, target: [0, 0, 0] }); }
      if (i === 5) {
        st.speed = 2; st.target = null;
        go({ radius: 7, yaw: 0.5, pitch: 0.25, target: [-3.5, 0, 0] });
        ui.toggle({ label: 'Stand in our town', value: false, onChange: v => { stand(v); if (!v) view({ radius: 7, yaw: 0.5, pitch: 0.25, target: [-3.5, 0, 0] }); } });
      }
      if (isQuiz) { st.speed = 1.5; go({ radius: 7, yaw: 0.5, pitch: 0.25, target: [-3.5, 0, 0] }); }
      show();
    },
    update(dt) {
      let moving = st.speed > 0;
      if (st.target != null) {
        const d = ((st.target - st.hours + 36) % 24) - 12;
        if (Math.abs(d) > 0.01) { st.hours += d * Math.min(1, dt * 3); moving = true; }
      } else st.hours = (st.hours + st.speed * dt) % 24;
      // Noon (12 h) is when the town faces the Sun (-x). The Earth spins toward the east (counter-clockwise from above).
      earth.rotation.y = -Math.PI / 2 + ((st.hours - 12) / DAY) * Math.PI * 2;
      if (st.standing) lookFromTown();
      if (moving) show();
      return true;
    },
  };
}

function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function paintEarth(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2f7fd6'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#5bb04d';
  for (let i = 0; i < 26; i++) {
    const x = rand(i) * 512, y = 50 + rand(i + 7) * 156, r = 14 + rand(i + 3) * 34;
    g.beginPath(); g.ellipse(x, y, r * 1.4, r, rand(i + 5) * 3, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 512, 18); g.fillRect(0, 238, 512, 18);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
