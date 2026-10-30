// Small helpers the primary lesson scenes share: materials, text labels, tweens, simple shapes.
import * as THREE from 'three';

export const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...opts });

export function mesh(geo, material, pos = [0, 0, 0], parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// Smoothly approach a target value each frame; returns true while still moving.
export function follow(obj, key, target, dt, speed = 6) {
  const v = obj[key], d = target - v;
  if (Math.abs(d) < 1e-4) { obj[key] = target; return false; }
  obj[key] = v + d * Math.min(1, dt * speed);
  return true;
}

// Ground disc and soft sky colour used by most lessons.
export function stage(scene, { ground = 0xcfe8c4, sky = 0xdff1ff, radius = 14 } = {}) {
  scene.background = new THREE.Color(sky);
  const g = mesh(new THREE.CircleGeometry(radius, 48), mat(ground), [0, 0, 0], scene);
  g.rotation.x = -Math.PI / 2;
  g.castShadow = false;
  return g;
}

export function lights(scene, { sun = [6, 10, 5], shadows = true } = {}) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa6b8, 1.6));
  const d = new THREE.DirectionalLight(0xffffff, 2.2);
  d.position.set(...sun);
  if (shadows) {
    d.castShadow = true;
    d.shadow.mapSize.set(1024, 1024);
    Object.assign(d.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.5, far: 40 });
  }
  scene.add(d);
  return d;
}
