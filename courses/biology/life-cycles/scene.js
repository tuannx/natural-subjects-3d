// Life cycles: the stages of a butterfly, a frog and a bean plant stand around a round track.
// A marker moves round the track with the slider; the big model in the middle changes from one
// stage into the next, and at the end of the track the cycle starts again.
import { butterflyStages } from '../_shared/butterfly.js';
import { frogStages } from '../_shared/frog.js';
import { beanStages } from '../_shared/bean.js';

const R = 2.1;        // track radius
const BIG = 1.7;      // size of the model in the middle
const SMALL = 0.85;   // size of the models on the stands
const KINDS = ['butterfly', 'frog', 'bean'];
const SPOTS = { butterfly: [-2.45, 1.3], frog: [2.45, 1.3], bean: [0, -2.6] }; // where each ring sits when all three are compared
const NAMES = { butterfly: 'Butterfly', frog: 'Frog', bean: 'Bean plant' };
const TRACK = { butterfly: 0xffd59a, frog: 0xa8dcf5, bean: 0xc9e8a0 };
const ABOUT = {
  butterfly: [
    'A butterfly lays tiny <b>eggs</b> on a leaf.',
    'A <b>caterpillar</b> hatches. It eats leaves and grows bigger and bigger.',
    'The caterpillar hangs up and makes a case called a <b>chrysalis</b>. Inside, its body changes completely.',
    'An adult <b>butterfly</b> comes out. It flies, finds a mate and lays eggs. The cycle starts again.',
  ],
  frog: [
    'A frog lays its eggs in water. A clump of eggs in jelly is called <b>frogspawn</b>.',
    'A <b>tadpole</b> hatches. It lives in water, swims with its tail and breathes with gills. Back legs grow first, then front legs.',
    'The <b>froglet</b> has four legs and a short tail. It starts to breathe air and can leave the water.',
    'The adult <b>frog</b> has no tail. It lives on land and in water, and lays eggs in water. The cycle starts again.',
  ],
  bean: [
    'With water and warmth, a bean <b>seed</b> swells and a little root comes out.',
    'A <b>seedling</b>: the root grows down, the shoot grows up and the first leaves open.',
    'The <b>young plant</b> grows taller and makes more leaves.',
    'The plant grows <b>flowers</b>.',
    'Each flower turns into a <b>pod</b> with new bean seeds inside. The old plant dies, but the seeds can grow into new plants.',
  ],
};

export default function setup({ THREE, scene, kit, ui, label, view }) {
  const { clamp, lerp } = kit;
  kit.stage(scene, { ground: 0xd6ecc4, sky: 0xe4f3ff, radius: 16 });
  kit.lights(scene, { sun: [4, 10, 6] });

  // One set per living thing: track, arrows, stands with small models, a big model per stage in the middle.
  const sets = {};
  for (const kind of KINDS) {
    const stages = (kind === 'butterfly' ? butterflyStages : kind === 'frog' ? frogStages : beanStages)(THREE, kit);
    const n = stages.length, g = new THREE.Group();
    scene.add(g);
    const track = kit.mesh(new THREE.RingGeometry(R - 0.2, R + 0.2, 64).rotateX(-Math.PI / 2), kit.mat(TRACK[kind]), [0, 0.02, 0], g);
    track.castShadow = false;
    const arrowMat = kit.mat(0x7a8a99);
    const pos = k => { const a = (k / n) * Math.PI * 2; return [Math.sin(a) * R, 0, -Math.cos(a) * R]; };
    for (let k = 0; k < n; k++) {
      // Arrow halfway to the next stand, pointing along the track (clockwise seen from above).
      const a = ((k + 0.5) / n) * Math.PI * 2;
      const arrow = kit.mesh(new THREE.ConeGeometry(0.11, 0.26, 3), arrowMat, [Math.sin(a) * R, 0.05, -Math.cos(a) * R], g);
      arrow.rotation.set(Math.PI / 2, 0, 0);
      arrow.rotation.order = 'YXZ';
      arrow.rotation.y = Math.PI / 2 - a;
      arrow.castShadow = false;
    }
    const stands = [], small = [], big = [], tags = [];
    for (let k = 0; k < n; k++) {
      const p = pos(k);
      const stand = new THREE.Group(); stand.position.set(...p); g.add(stand);
      const mat = kit.mat(0xffffff);
      kit.mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.12, 24), mat, [0, 0.06, 0], stand);
      const m = stages[k].make();
      m.g.scale.setScalar(SMALL); m.g.position.y = 0.12;
      stand.add(m.g);
      stands.push({ stand, mat }); small.push(m);
      const anchor = new THREE.Object3D(); anchor.position.set(p[0] * 1.08, 0.95, p[2] * 1.08); g.add(anchor);
      tags.push(label(stages[k].name, anchor));
      const b = stages[k].make();
      b.g.position.y = 0.14; b.g.visible = false;
      g.add(b.g); big.push(b);
    }
    kit.mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.14, 32), kit.mat(0xf7f2e6), [0, 0.07, 0], g);
    const marker = new THREE.Group(); g.add(marker);
    kit.mesh(new THREE.SphereGeometry(0.13, 16, 10), new THREE.MeshBasicMaterial({ color: 0xff6b3d }), [0, 0.15, 0], marker);
    const halo = kit.mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 20), new THREE.MeshBasicMaterial({ color: 0xff6b3d }), [0, 0.04, 0], marker);
    halo.rotation.x = Math.PI / 2;
    const titleAt = new THREE.Object3D(); titleAt.position.y = 2.4; g.add(titleAt);
    const title = label(NAMES[kind], titleAt, { cls: 'big warm' });
    sets[kind] = { kind, n, stages, g, stands, small, big, tags, marker, title, v: 0, x: 0, z: 0, s: 1, xTo: 0, zTo: 0, sTo: 1, show: false };
  }

  const st = { step: 0, quiz: false, time: 0, kind: 'butterfly', auto: false, from: 0, to: 4, speed: 0.4, loop: true, slider: null, compare: false, frac: 0 };
  const gold = new THREE.Color(0xffd34d), white = new THREE.Color(0xffffff);
  const wrap = (v, n) => ((v % n) + n) % n;
  const current = (set, v) => Math.round(wrap(v, set.n)) % set.n;

  function useSet(kind, { compare = false } = {}) {
    st.kind = kind; st.compare = compare;
    KINDS.forEach(k => {
      const s = sets[k];
      s.show = compare || k === kind;
      s.xTo = compare ? SPOTS[k][0] : 0;
      s.zTo = compare ? SPOTS[k][1] : 0;
      s.sTo = compare ? 0.62 : 1;
      s.tags.forEach(t => t.show(!compare && k === kind));
      s.title.show(compare);
    });
  }
  function say() {
    if (st.compare) {
      ui.readout(KINDS.map(k => `${NAMES[k]}: <b>${sets[k].stages[current(sets[k], sets[k].v)].name.toLowerCase()}</b>`).join(' · '));
      return;
    }
    const s = sets[st.kind];
    ui.readout(ABOUT[st.kind][current(s, s.v)]);
  }
  function slider(kind) {
    const s = sets[kind];
    st.slider = ui.slider({
      label: 'Move through the life cycle', min: 0, max: s.n, step: 0.01, value: s.v,
      format: v => s.stages[current(s, v)].name,
      onInput: v => { st.auto = false; s.v = v; say(); },
    });
  }
  function play(kind, from, to, speed, loop) {
    useSet(kind);
    Object.assign(st, { auto: true, from, to, speed, loop });
    sets[kind].v = from;
    if (st.slider?.parentElement?.isConnected) st.slider.parentElement.remove(); // swap the slider when the living thing changes
    slider(kind);
    say();
  }
  const kindButtons = () => ui.buttons(KINDS.map(k => ({ label: NAMES[k], on: k === st.kind, onClick: () => play(k, 0, sets[k].n, 0.4, true) })));

  const WHOLE = { radius: 2.8, yaw: 0, pitch: 0.78, target: [0, 0.35, 0.1] };

  return {
    step(i, { isQuiz }) {
      st.step = i; st.quiz = isQuiz; st.time = 0;
      for (const s of Object.values(sets)) s.v = 0;
      if (i === 0) {
        view(WHOLE);
        st.kind = 'butterfly';
        kindButtons();
        play('butterfly', 0, 4, 0.4, true);
      }
      if (i === 1) {
        view({ radius: 2.3, yaw: 0.35, pitch: 0.62, target: [0.8, 0.4, -0.55] });
        play('butterfly', 0, 1.3, 0.35, false);
      }
      if (i === 2) {
        view({ radius: 2.4, yaw: -0.5, pitch: 0.6, target: [-0.75, 0.4, 0.55] });
        play('butterfly', 1.6, 4.0, 0.4, false);
      }
      if (i === 3) {
        view(WHOLE);
        play('frog', 0, 4, 0.45, true);
      }
      if (i === 4) {
        view({ ...WHOLE, radius: 3.1 });
        play('bean', 0, 5, 0.5, true);
      }
      if (i === 5 || isQuiz) {
        view({ radius: 4.2, yaw: 0, pitch: 0.92, target: [0, 0.3, 0.1] });
        useSet('butterfly', { compare: true });
        st.frac = 0; st.auto = !isQuiz; st.speed = 0.08;
        if (!isQuiz) {
          st.slider = ui.slider({ label: 'Move all three', min: 0, max: 100, step: 1, value: 0, unit: '%', onInput: v => { st.auto = false; st.frac = v / 100; for (const s of Object.values(sets)) s.v = st.frac * s.n; say(); } });
          say();
        } else { st.frac = 0.6; for (const s of Object.values(sets)) s.v = st.frac * s.n; }
      }
    },

    update(dt, time) {
      st.time += dt;
      // Auto play until the slider is moved.
      if (st.auto) {
        if (st.compare) {
          st.frac = (st.frac + dt * st.speed) % 1;
          for (const s of Object.values(sets)) s.v = st.frac * s.n;
          st.slider?.set(Math.round(st.frac * 100));
        } else {
          const s = sets[st.kind];
          let v = s.v + dt * st.speed;
          if (v >= st.to) v = st.loop ? st.from + (v - st.to) : st.to;
          if (v === st.to && !st.loop) st.auto = false;
          const before = current(s, s.v);
          s.v = v;
          st.slider?.set(v);
          if (current(s, v) !== before) say();
        }
        if (st.compare && Math.floor(st.time * 2) !== Math.floor((st.time - dt) * 2)) say();
      }

      for (const s of Object.values(sets)) {
        kit.follow(s, 'x', s.xTo, dt, 4);
        kit.follow(s, 'z', s.zTo, dt, 4);
        kit.follow(s, 's', s.show ? s.sTo : 0, dt, 5);
        s.g.visible = s.s > 0.02;
        if (!s.g.visible) continue;
        s.g.position.set(s.x, 0, s.z);
        s.g.scale.setScalar(s.s);
        const v = wrap(s.v, s.n), cur = current(s, s.v);
        const a = (v / s.n) * Math.PI * 2;
        s.marker.position.set(Math.sin(a) * R, 0, -Math.cos(a) * R);
        s.marker.children[1].scale.setScalar(1 + 0.15 * Math.sin(time * 5));
        // Big model: the stage nearest the marker, changing into the next one around halfway between stands.
        for (let k = 0; k < s.n; k++) {
          let d = v - k;
          if (d > s.n / 2) d -= s.n;
          if (d < -s.n / 2) d += s.n;
          const show = clamp((0.6 - Math.abs(d)) / 0.2, 0, 1);
          const b = s.big[k];
          b.g.visible = show > 0.01;
          if (b.g.visible) {
            const e = show * show * (3 - 2 * show);
            b.g.scale.setScalar(BIG * Math.max(0.001, e));
            b.g.rotation.y = Math.sin(time * 0.4) * 0.3;
            b.animate(time, clamp((d + 0.4) / 0.8, 0, 1));
          }
          const here = k === cur;
          s.stands[k].mat.color.copy(here ? gold : white);
          s.stands[k].stand.position.y = lerp(s.stands[k].stand.position.y, here ? 0.1 : 0, Math.min(1, dt * 6));
          s.small[k].animate(time, 0.5);
        }
      }
      return true;
    },
  };
}
