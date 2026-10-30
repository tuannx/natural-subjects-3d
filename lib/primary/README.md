# Primary lesson engine

Shared code for the primary-school lessons (ages 6–11). A lesson is a folder `courses/<slug>/` with:

| File | What it holds |
|---|---|
| `lesson.json` | Catalog entry and all lesson text: steps and quiz |
| `scene.js` | The 3D world: `export default function setup(k)` |
| `cover.webp`, `cover-480.webp` | Cover images (`npm run covers` in `tools/media` makes them from the lesson) |

`npm run build` bundles every `scene.js` with this engine and three.js. Shared code (three.js, engine) lands in one content-hashed chunk under `/assets/`, so it downloads once for all primary lessons and is cached for a year.

## lesson.json

```json
{
  "slug": "day-night", "order": 1, "level": "primary", "ages": "6-9", "subject": "space",
  "title": "…", "type": "Earth & Space", "question": "One guiding question a child would ask",
  "steps": ["Step 1 title", "…"],
  "content": {
    "steps": [{ "title": "…", "text": "…", "try": "Try it: …", "see": "What did you notice: …" }],
    "quiz": [{ "q": "…", "options": ["…", "…", "…"], "answer": 1, "why": "…" }]
  },
  "source": "original"
}
```

`subject` is one of `space`, `phys`, `chem`, `bio`, `geo`. `steps` repeats the step titles for the catalog. The quiz becomes the last step automatically.

## scene.js

```js
export default function setup(k) {
  // k.THREE, k.scene, k.camera, k.controls (OrbitControls), k.renderer
  // k.kit: mesh(), mat(), stage(), lights(), ease(), clamp(), lerp(), follow()
  // k.label(text, object3DOrVector3, { cls: 'big' | 'warm' | 'cool' }) -> { text, show(bool) }
  // k.view({ radius, yaw, pitch, target: [x, y, z] }, instant?) frames a sphere of `radius`
  //   around `target` in the part of the screen the lesson card does not cover
  // k.ui.slider({ label, min, max, step, value, unit, format, onInput })
  // k.ui.toggle({ label, value, onChange }), k.ui.buttons([{ label, onClick }]), k.ui.readout(html)
  // k.invalidate() asks for a redraw when nothing is animating
  return {
    step(i, { isQuiz, instant }) { /* set up step i: camera view, widgets, state */ },
    update(dt, t) { /* advance animation; return true while something moves */ },
  };
}
```

Widgets are cleared on every step change, so `step()` adds the ones that step needs. Use only `dt`/`t` for animation (never `Date.now()` or `performance.now()`), and seeded randomness, so the video exporter renders the same frames every time.

`window.__lesson` (`goto(i)`, `renderAt(seconds)`, `steps`) lets the video exporter and tests drive a lesson frame by frame.
