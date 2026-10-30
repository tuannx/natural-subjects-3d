// Runs one engine lesson (primary and middle school): renderer, camera, controls, labels, render loop and step changes.
// The scene module (courses/<subject>/<slug>/scene.js) builds the 3D world and reacts to steps.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as kit from './kit.js';
import { createUI } from './ui.js';
import { createFramer } from './view.js';

export function runLesson(meta, setup) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.id = 'gl';
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.49;

  let dirty = true, camTween = null;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), qTmp = new THREE.Quaternion(), qId = new THREE.Quaternion();
  const invalidate = () => { dirty = true; };
  controls.addEventListener('change', invalidate);

  // HTML labels pinned to 3D points.
  const labels = [];
  const ui = createUI(meta, { onStep: (i, isQuiz, opts) => { lesson.step?.(i, { isQuiz, instant: !!opts.instant }); invalidate(); } });
  // A slider, toggle or button in the card usually changes the scene: redraw even when nothing is animating.
  for (const type of ['input', 'change', 'click']) ui.card.addEventListener(type, invalidate);
  const label = (text, at, { cls = '' } = {}) => {
    const el = document.createElement('div');
    el.className = 'lab ' + cls;
    el.textContent = text;
    ui.labels.append(el);
    const l = { el, at, visible: true, set text(t) { el.textContent = t; }, show(v) { this.visible = v; invalidate(); } };
    labels.push(l);
    return l;
  };
  const v = new THREE.Vector3();
  function placeLabels() {
    for (const l of labels) {
      if (l.at.isObject3D) l.at.getWorldPosition(v); else v.copy(l.at);
      v.project(camera);
      const on = l.visible && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      l.el.style.display = on ? '' : 'none';
      if (on) l.el.style.transform = `translate(${(v.x + 1) / 2 * innerWidth}px,${(1 - v.y) / 2 * innerHeight}px) translate(-50%,-120%)`;
    }
  }

  const framer = createFramer(camera, controls, ui.freeRect);
  const view = (opts, instant = false) => {
    const t = framer.frame(opts, instant);
    if (instant) { camera.position.copy(t.to); controls.target.copy(t.toT); controls.update(); camTween = null; }
    else camTween = { ...t, k: 0 };
    invalidate();
  };

  const k = { THREE, scene, camera, controls, renderer, kit, ui: ui.widget, label, view, invalidate, freeRect: ui.freeRect };
  const lesson = setup(k) || {};

  // Clock: real time normally; frame-exact when a video capture drives it (window.__lesson.renderAt).
  let last = performance.now(), t = 0, manual = false;
  function frame(dt, draw = true) {
    t += dt;
    let busy = lesson.update ? lesson.update(dt, t) : false;
    if (camTween) {
      camTween.k = Math.min(1, camTween.k + dt / 0.9);
      const e = kit.ease(camTween.k);
      // Swing around the target (direction and distance separately) rather than cutting through the scene.
      controls.target.lerpVectors(camTween.fromT, camTween.toT, e);
      const a = tmpA.subVectors(camTween.from, camTween.fromT), b = tmpB.subVectors(camTween.to, camTween.toT);
      const d = kit.lerp(a.length(), b.length(), e);
      qTmp.setFromUnitVectors(a.normalize(), b.normalize());
      a.applyQuaternion(qId.slerp(qTmp, e)).multiplyScalar(d);
      qId.identity();
      camera.position.copy(controls.target).add(a);
      if (camTween.k >= 1) camTween = null;
      busy = true;
    }
    busy = controls.update() || busy;
    if (draw && (busy || dirty)) { renderer.render(scene, camera); placeLabels(); dirty = false; }
  }
  function loop(now) {
    requestAnimationFrame(loop);
    if (manual) return;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); // the first rAF time can be before setup's performance.now()
    last = now;
    frame(dt);
  }

  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); view({}, true); });
  let cardH = 0;
  new ResizeObserver(([e]) => {
    const hgt = Math.round(e.contentRect.height);
    if (Math.abs(hgt - cardH) > 24) { cardH = hgt; view({}); }
  }).observe(ui.card);
  ui.go(0, { instant: true });
  requestAnimationFrame(loop);

  // Hooks for the video exporter and tests.
  window.__lesson = {
    meta, renderer, scene, camera,
    steps: ui.total,
    goto: i => { ui.go(i, { instant: true }); },
    get step() { return ui.step; },
    // Switch to frame-exact time and render the scene at absolute time `at` (seconds since manual start).
    renderAt(at) {
      if (!manual) { manual = true; this.t0 = t; }
      const target = this.t0 + at;
      while (t < target - 1e-6) frame(Math.min(1 / 60, target - t), false); // advance only; draw once below
      renderer.render(scene, camera); placeLabels(); dirty = false;
    },
    resume() { manual = false; last = performance.now(); },
  };
}
