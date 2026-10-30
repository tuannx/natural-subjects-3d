/* natural-subjects-3d: friendly message instead of a blank page when the browser has no WebGL. */
(() => {
  let gl = null;
  try { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) { /* treated as no WebGL */ }
  if (gl) { gl.getExtension('WEBGL_lose_context')?.loseContext(); return; }
  addEventListener('DOMContentLoaded', () => {
    const d = document.createElement('div');
    d.id = 'ns-nogl';
    d.setAttribute('role', 'alert');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#f4f7fa;color:#14212b;font:16px/1.5 system-ui,sans-serif;text-align:center';
    d.innerHTML = '<div style="max-width:520px"><h1 style="font-size:22px">This lesson needs 3D graphics (WebGL)</h1>' +
      '<p>WebGL is turned off or not available in this browser. Try Chrome, Edge, Safari or Firefox, turn on hardware acceleration in the browser settings, or update the graphics driver.</p>' +
      '<p><a href="/" style="color:#1f6fd1">Back to all lessons</a></p></div>';
    document.body.append(d);
  });
})();
