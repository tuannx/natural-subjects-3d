// Small shared shapes for the primary biology lessons: a seeded random number and a curved leaf blade.

// Seeded pseudo-random number in [0, 1) (scenes must not use Math.random, so videos repeat exactly).
export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// A leaf blade lying flat (normal +Y), base at the origin, tip at +X. It arches up a little and droops
// at the tip, with a shallow fold along the middle vein. Use a DoubleSide material.
export function leafGeometry(THREE, len = 1, wid = 0.45, droop = 0.15) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(len * 0.25, wid * 0.6, len * 0.75, wid * 0.5, len, 0);
  s.bezierCurveTo(len * 0.75, -wid * 0.5, len * 0.25, -wid * 0.6, 0, 0);
  const g = new THREE.ShapeGeometry(s, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / len, y = p.getY(i);
    p.setZ(i, len * (0.3 * x - (0.3 + droop) * x * x) - 0.25 * Math.abs(y));
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}
